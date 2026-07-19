import { createHash } from 'node:crypto';

import {
  VOCABULARY_BACKUP_FORMAT,
  VOCABULARY_BACKUP_SCHEMA_VERSION,
  type VocabularyBackupFileV1,
} from '../../src/models/vocabularyBackup';
import { type DeviceVocabularyRecord } from '../../src/models/vocabulary';
import { canAutofillReading, isKanaReading, normalizeVocabularyComparison } from '../../src/services/vocabularyText';
import type { AnkiCollectionSnapshot, AnkiNoteRow } from './ankiPackage';

const EXPECTED_FIELDS = ['ID', 'Word', 'Reading', 'Romaji', 'Meaning', 'Category', 'Picture'] as const;
const SOURCE_ID = /^L(?<lesson>\d{2})-(?<number>\d+)$/;
const LESSON_TAG = /^lesson(?<lesson>\d{2})$/;
const LESSONISH_TAG = /^lesson/i;

const stableRecordId = (lessonId: string, sourceNumber: number) =>
  `personal-deck:${lessonId}:${sourceNumber}`;
const stableSortKey = (sourceNumber: number) =>
  `personal-deck:${String(sourceNumber).padStart(8, '0')}`;

interface AuthoredLesson {
  id: string;
  vocabulary: readonly { japanese: string }[];
}

export type ReadingOverrides = ReadonlyMap<string, string>;

interface Candidate {
  note: AnkiNoteRow;
  sourceId: string;
  lessonNumber: number;
  sourceNumber: number;
  lessonId: string;
  taggedLesson: string;
  fields: string[];
}

const cleanField = (value: string): string => value
  .replace(/\[sound:[^\]]*\]/giu, '')
  .replace(/<img\b[^>]*>/giu, '')
  .replace(/<[^>]*>/gu, '')
  .replace(/[\p{Cc}\p{Cf}]/gu, '')
  .trim();

const diagnostic = (candidate: Partial<Candidate>, reason: string, cardIds: readonly number[] = []) =>
  `${reason}; sourceId=${candidate.sourceId ?? '<unavailable>'}; noteId=${candidate.note?.id ?? '<unavailable>'}; taggedLesson=${candidate.taggedLesson ?? '<unavailable>'}; cardIds=${cardIds.join(',') || '<none>'}`;

const deckLeaf = (name: string): string => name.split('\u001f').at(-1)?.split('::').at(-1) ?? name;

const isExpectedNoteType = (fieldNames: readonly string[]) =>
  fieldNames.length === EXPECTED_FIELDS.length
  && fieldNames.every((field, index) => field === EXPECTED_FIELDS[index]);

const candidateFromNote = (note: AnkiNoteRow): Candidate => {
  const fields = note.fields.split('\u001f');
  const sourceId = fields[0] ?? '<unavailable>';
  if (fields.length !== EXPECTED_FIELDS.length) {
    throw new Error(diagnostic({ note, sourceId }, `Expected exactly seven fields, got ${fields.length}`));
  }
  const match = SOURCE_ID.exec(sourceId);
  if (!match?.groups?.lesson || !match.groups.number) {
    throw new Error(diagnostic({ note, sourceId }, 'Malformed source ID'));
  }
  const lessonishTags = note.tags.filter((tag) => LESSONISH_TAG.test(tag));
  if (lessonishTags.length !== 1) {
    throw new Error(diagnostic({ note, sourceId }, 'Expected exactly one lessonNN tag'));
  }
  const taggedLesson = lessonishTags[0]!;
  const tagMatch = LESSON_TAG.exec(taggedLesson);
  const lessonNumber = Number(match.groups.lesson);
  const taggedLessonNumber = tagMatch?.groups?.lesson ? Number(tagMatch.groups.lesson) : Number.NaN;
  if (!tagMatch || taggedLessonNumber < 1 || taggedLessonNumber > 25) {
    throw new Error(diagnostic({ note, sourceId, taggedLesson }, 'malformed lesson tag'));
  }
  if (lessonNumber !== taggedLessonNumber) {
    throw new Error(diagnostic({ note, sourceId, taggedLesson }, 'Source ID lesson does not match lesson tag'));
  }
  return {
    note,
    sourceId,
    lessonNumber,
    sourceNumber: Number(match.groups.number),
    lessonId: `lesson-${match.groups.lesson}`,
    taggedLesson,
    fields,
  };
};

const assertDecks = (candidate: Candidate, collection: AnkiCollectionSnapshot): void => {
  const cards = collection.cards.filter((card) => card.noteId === candidate.note.id);
  if (!cards.length) {
    throw new Error(diagnostic(candidate, 'Expected at least one associated card'));
  }
  const expected = `L${String(candidate.lessonNumber).padStart(2, '0')} 第${candidate.lessonNumber}課`;
  const decksById = new Map(collection.decks.map((deck) => [deck.id, deck]));
  const mismatches = cards.flatMap((card) => {
    const deckId = card.odid !== 0 ? card.odid : card.did;
    const actual = decksById.get(deckId) ? deckLeaf(decksById.get(deckId)!.name) : `<missing deck ${deckId}>`;
    return actual === expected ? [] : [{ card, actual }];
  });
  if (mismatches.length) {
    const details = mismatches.map(({ card, actual }) => `card ${card.id} expected ${expected} actual ${actual}`).join('; ');
    throw new Error(diagnostic(candidate, details, cards.map((card) => card.id)));
  }
};

export const buildPersonalImport = ({
  collection,
  authoredLessons,
  authoredBaselineVersion,
  generatedAt,
  readingOverrides = new Map(),
}: {
  collection: AnkiCollectionSnapshot;
  authoredLessons: readonly AuthoredLesson[];
  authoredBaselineVersion: string;
  generatedAt: string;
  readingOverrides?: ReadingOverrides;
}): VocabularyBackupFileV1 => {
  const matchingNoteTypes = collection.noteTypes.filter((noteType) => isExpectedNoteType(noteType.fieldNames));
  if (matchingNoteTypes.length !== 1) {
    throw new Error(`Expected exactly one note type with ordered fields ${EXPECTED_FIELDS.join(', ')}, found ${matchingNoteTypes.length}`);
  }
  const selected = collection.notes
    .filter((note) => note.noteTypeId === matchingNoteTypes[0]!.id)
    .map(candidateFromNote)
    .sort((left, right) => left.lessonNumber - right.lessonNumber || left.sourceNumber - right.sourceNumber || left.note.id - right.note.id);
  const candidatesByStableIdentity = new Map<string, Candidate>();
  for (const candidate of selected) {
    const identity = stableRecordId(candidate.lessonId, candidate.sourceNumber);
    const previous = candidatesByStableIdentity.get(identity);
    if (previous) {
      const cardIds = collection.cards.filter((card) => card.noteId === candidate.note.id).map((card) => card.id);
      throw new Error(diagnostic(
        candidate,
        `Duplicate stable record identity ${identity}; conflictsWithSourceId=${previous.sourceId}; conflictsWithNoteId=${previous.note.id}`,
        cardIds,
      ));
    }
    candidatesByStableIdentity.set(identity, candidate);
  }
  const selectedSourceIds = new Set(selected.map(({ sourceId }) => sourceId));
  for (const sourceId of readingOverrides.keys()) {
    if (!selectedSourceIds.has(sourceId)) {
      throw new Error(`Reading override has unknown source ID ${sourceId}`);
    }
  }
  const sourceByLesson: Record<string, number> = Object.fromEntries(authoredLessons.map(({ id }) => [id, 0]));
  const acceptedByLesson: Record<string, number> = Object.fromEntries(authoredLessons.map(({ id }) => [id, 0]));
  const authoredByLesson = new Map(authoredLessons.map((lesson) => [
    lesson.id,
    new Set(lesson.vocabulary.map((item) => normalizeVocabularyComparison(item.japanese))),
  ]));
  const acceptedByLessonNormalized = new Map<string, Set<string>>();
  const records: DeviceVocabularyRecord[] = [];
  let skippedAuthoredCount = 0;
  let skippedEarlierPersonalCount = 0;
  const consumedReadingOverrides = new Set<string>();

  for (const candidate of selected) {
    assertDecks(candidate, collection);
    sourceByLesson[candidate.lessonId] = (sourceByLesson[candidate.lessonId] ?? 0) + 1;
    const [sourceId, rawWord, rawReading, , rawMeaning, rawCategory] = candidate.fields;
    const japanese = cleanField(rawWord!);
    let reading = cleanField(rawReading!);
    const english = cleanField(rawMeaning!);
    const categoryRaw = cleanField(rawCategory!);
    if (!japanese || !english) {
      throw new Error(diagnostic(candidate, 'Word and Meaning must be non-empty', collection.cards.filter((card) => card.noteId === candidate.note.id).map((card) => card.id)));
    }
    const normalized = normalizeVocabularyComparison(japanese);
    if (authoredByLesson.get(candidate.lessonId)?.has(normalized)) {
      skippedAuthoredCount += 1;
      continue;
    }
    const accepted = acceptedByLessonNormalized.get(candidate.lessonId) ?? new Set<string>();
    acceptedByLessonNormalized.set(candidate.lessonId, accepted);
    if (accepted.has(normalized)) {
      skippedEarlierPersonalCount += 1;
      continue;
    }
    if (!reading) {
      if (canAutofillReading(japanese)) {
        reading = japanese;
      } else {
        const override = readingOverrides.get(sourceId!);
        if (override === undefined) {
          throw new Error(diagnostic(candidate, 'Blank reading requires explicit kana reading', collection.cards.filter((card) => card.noteId === candidate.note.id).map((card) => card.id)));
        }
        if (!isKanaReading(override)) {
          throw new Error(diagnostic(candidate, 'Reading override must be a valid kana reading', collection.cards.filter((card) => card.noteId === candidate.note.id).map((card) => card.id)));
        }
        reading = override;
        consumedReadingOverrides.add(sourceId!);
      }
    }
    if (!isKanaReading(reading)) {
      throw new Error(diagnostic(candidate, 'Reading must be an explicit kana reading', collection.cards.filter((card) => card.noteId === candidate.note.id).map((card) => card.id)));
    }
    accepted.add(normalized);
    const categoryParts = categoryRaw.split('/');
    const category = categoryParts.length > 1 ? categoryParts.at(-1)!.trim() : categoryRaw;
    const item = {
      id: stableRecordId(candidate.lessonId, candidate.sourceNumber),
      japanese,
      reading,
      english,
      partOfSpeech: 'vocabulary',
      source: 'personal-deck' as const,
      sourceId: sourceId!,
      ...(category ? { category } : {}),
    };
    records.push({
      lessonId: candidate.lessonId,
      item,
      createdAt: generatedAt,
      updatedAt: generatedAt,
      sortKey: stableSortKey(candidate.sourceNumber),
    });
    acceptedByLesson[candidate.lessonId] = (acceptedByLesson[candidate.lessonId] ?? 0) + 1;
  }

  for (const sourceId of readingOverrides.keys()) {
    if (!consumedReadingOverrides.has(sourceId)) {
      throw new Error(`Reading override for source ID ${sourceId} is unused or inapplicable`);
    }
  }

  return {
    format: VOCABULARY_BACKUP_FORMAT,
    schemaVersion: VOCABULARY_BACKUP_SCHEMA_VERSION,
    exportedAt: generatedAt,
    authoredBaselineVersion,
    records,
    hidden: [],
    reviewCards: [],
    generation: {
      sourceNoteCount: selected.length,
      acceptedCount: records.length,
      skippedAuthoredCount,
      skippedEarlierPersonalCount,
      acceptedByLesson,
      sourceByLesson,
      checksumSha256: createHash('sha256').update(JSON.stringify(records)).digest('hex'),
    },
  };
};
