import { PersistedAppStateV2 } from '../models/appState';
import { Lesson } from '../models/content';
import { VocabularyOverrides } from '../models/vocabulary';
import { reconcileReviewCards } from './reconcileReviewCards';
import { findLessonDuplicate, resolveVocabularyLists } from './vocabularyResolver';
import { canAutofillReading, isKanaReading } from './vocabularyText';

export interface VocabularyDraft {
  japanese: string;
  reading: string;
  english: string;
  category?: string;
}

export interface VocabularyUndoToken {
  kind: 'hide' | 'restore';
  lessonId: string;
  vocabularyId: string;
  expectedVocabularyUpdatedAt: string;
}

interface VocabularyMutationOptions {
  lessons: readonly Lesson[];
  now: Date;
}

interface AddVocabularyOptions extends VocabularyMutationOptions {
  uuid: string;
}

interface ReversibleVocabularyState {
  state: PersistedAppStateV2;
  undoToken: VocabularyUndoToken;
}

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FOUR_DIGIT_ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const MAX_FOUR_DIGIT_ISO_TIMESTAMP = '9999-12-31T23:59:59.999Z';
const MAX_FOUR_DIGIT_ISO_MILLISECONDS = Date.parse(MAX_FOUR_DIGIT_ISO_TIMESTAMP);

const lessonFor = (lessons: readonly Lesson[], lessonId: string): Lesson => {
  const lesson = lessons.find(({ id }) => id === lessonId);
  if (!lesson) throw new Error(`Lesson ${lessonId} was not found.`);
  return lesson;
};

const mutationTimestampFor = (now: Date): string => {
  const requestedMilliseconds = now.getTime();
  if (!Number.isFinite(requestedMilliseconds)) {
    throw new Error('Vocabulary mutation time must use a valid four-digit ISO timestamp.');
  }
  const timestamp = now.toISOString();
  if (!FOUR_DIGIT_ISO_TIMESTAMP.test(timestamp)) {
    throw new Error('Vocabulary mutation time must use a valid four-digit ISO timestamp.');
  }
  return timestamp;
};

const nextVocabularyTimestamp = (
  current: PersistedAppStateV2,
  now: Date,
  recordFloors: readonly string[] = [],
): string => {
  const requestedTimestamp = mutationTimestampFor(now);
  const requestedMilliseconds = Date.parse(requestedTimestamp);

  const previousMilliseconds = Math.max(
    current.vocabulary.updatedAt === null
      ? Number.NEGATIVE_INFINITY
      : Date.parse(current.vocabulary.updatedAt),
    ...recordFloors.map(Date.parse),
  );
  const nextMilliseconds = requestedMilliseconds > previousMilliseconds
    ? requestedMilliseconds
    : previousMilliseconds + 1;
  if (nextMilliseconds > MAX_FOUR_DIGIT_ISO_MILLISECONDS) {
    throw new Error(`Vocabulary revision cannot advance beyond ${MAX_FOUR_DIGIT_ISO_TIMESTAMP}.`);
  }
  return new Date(nextMilliseconds).toISOString();
};

export const validateVocabularyDraft = (draft: VocabularyDraft): VocabularyDraft => {
  const japanese = draft.japanese.trim();
  const suppliedReading = draft.reading.trim();
  const english = draft.english.trim();
  const category = draft.category?.trim() ?? '';

  if (!japanese) throw new Error('Japanese is required');
  if (!english) throw new Error('English is required');

  let reading = suppliedReading;
  if (!reading) {
    if (!canAutofillReading(japanese)) throw new Error('Kana reading is required');
    reading = japanese;
  }
  if (!isKanaReading(reading)) throw new Error('Reading must use kana');

  return {
    japanese,
    reading,
    english,
    ...(category ? { category } : {}),
  };
};

const assertNoLessonDuplicate = (
  lesson: Lesson,
  vocabulary: VocabularyOverrides,
  japanese: string,
  excludeVocabularyId?: string,
) => {
  if (findLessonDuplicate({ lesson, vocabulary, japanese, excludeVocabularyId })) {
    throw new Error(`This word already exists in Lesson ${lesson.number}.`);
  }
};

const completeMutation = (
  current: PersistedAppStateV2,
  vocabulary: VocabularyOverrides,
  { lessons, now }: VocabularyMutationOptions,
): PersistedAppStateV2 => {
  const { lastImportRecovery: discardedRecovery, ...withoutRecovery } = current;
  void discardedRecovery;
  const staged: PersistedAppStateV2 = { ...withoutRecovery, vocabulary };
  const reviewCards = reconcileReviewCards({
    lessons,
    progress: staged.progress,
    reviewCards: staged.reviewCards,
    vocabulary: staged.vocabulary,
    now,
  });
  return { ...staged, reviewCards };
};

const assertUnusedCustomId = (vocabulary: VocabularyOverrides, vocabularyId: string) => {
  const recordExists = Object.values(vocabulary.recordsByLesson)
    .some((records) => records.some(({ item }) => item.id === vocabularyId));
  const hiddenIdExists = Object.values(vocabulary.hiddenIdsByLesson)
    .some((ids) => ids.includes(vocabularyId));
  if (recordExists || hiddenIdExists) throw new Error('Generated vocabulary ID already exists.');
};

export const buildAddVocabularyState = (
  current: PersistedAppStateV2,
  lessonId: string,
  draft: VocabularyDraft,
  options: AddVocabularyOptions,
): PersistedAppStateV2 => {
  const lesson = lessonFor(options.lessons, lessonId);
  if (!UUID_V4.test(options.uuid)) {
    throw new Error('Custom vocabulary UUID must be an RFC 4122 version 4 UUID.');
  }
  const normalized = validateVocabularyDraft(draft);
  assertNoLessonDuplicate(lesson, current.vocabulary, normalized.japanese);

  const vocabularyId = `custom:${lessonId}:${options.uuid}`;
  assertUnusedCustomId(current.vocabulary, vocabularyId);
  const mutationTimestamp = nextVocabularyTimestamp(current, options.now);
  const records = current.vocabulary.recordsByLesson[lessonId] ?? [];
  const vocabulary: VocabularyOverrides = {
    ...current.vocabulary,
    recordsByLesson: {
      ...current.vocabulary.recordsByLesson,
      [lessonId]: [
        ...records,
        {
          lessonId,
          createdAt: mutationTimestamp,
          updatedAt: mutationTimestamp,
          sortKey: `custom:${mutationTimestamp}:${options.uuid}`,
          item: {
            id: vocabularyId,
            ...normalized,
            partOfSpeech: 'vocabulary',
            source: 'custom',
          },
        },
      ],
    },
    updatedAt: mutationTimestamp,
  };
  return completeMutation(current, vocabulary, options);
};

export const buildEditVocabularyState = (
  current: PersistedAppStateV2,
  lessonId: string,
  vocabularyId: string,
  draft: VocabularyDraft,
  options: VocabularyMutationOptions,
): PersistedAppStateV2 => {
  const lesson = lessonFor(options.lessons, lessonId);
  if (lesson.vocabulary.some(({ id }) => id === vocabularyId)) {
    throw new Error('Authored vocabulary cannot be edited.');
  }

  const records = current.vocabulary.recordsByLesson[lessonId] ?? [];
  const recordIndex = records.findIndex(({ item }) => item.id === vocabularyId);
  if (recordIndex < 0) throw new Error(`Vocabulary ${vocabularyId} was not found in Lesson ${lesson.number}.`);

  const normalized = validateVocabularyDraft(draft);
  assertNoLessonDuplicate(lesson, current.vocabulary, normalized.japanese, vocabularyId);
  const existing = records[recordIndex]!;
  const mutationTimestamp = nextVocabularyTimestamp(current, options.now, [
    existing.createdAt,
    existing.updatedAt,
  ]);
  const { category: discardedCategory, ...itemWithoutCategory } = existing.item;
  void discardedCategory;
  const nextRecords = [...records];
  nextRecords[recordIndex] = {
    ...existing,
    updatedAt: mutationTimestamp,
    item: {
      ...itemWithoutCategory,
      ...normalized,
    },
  };

  const vocabulary: VocabularyOverrides = {
    ...current.vocabulary,
    recordsByLesson: {
      ...current.vocabulary.recordsByLesson,
      [lessonId]: nextRecords,
    },
    updatedAt: mutationTimestamp,
  };
  return completeMutation(current, vocabulary, options);
};

const resolvedVocabularyFor = (
  current: PersistedAppStateV2,
  lesson: Lesson,
  vocabularyId: string,
) => {
  const resolved = resolveVocabularyLists({ lesson, vocabulary: current.vocabulary })
    .all.find(({ item }) => item.id === vocabularyId);
  if (!resolved) {
    throw new Error(`Vocabulary ${vocabularyId} was not found in Lesson ${lesson.number}.`);
  }
  return resolved;
};

export const buildHideVocabularyState = (
  current: PersistedAppStateV2,
  lessonId: string,
  vocabularyId: string,
  options: VocabularyMutationOptions,
): ReversibleVocabularyState => {
  const lesson = lessonFor(options.lessons, lessonId);
  const resolved = resolvedVocabularyFor(current, lesson, vocabularyId);
  if (resolved.hidden) throw new Error('Vocabulary is already hidden.');

  const hiddenIds = current.vocabulary.hiddenIdsByLesson[lessonId] ?? [];
  const updatedAt = nextVocabularyTimestamp(current, options.now);
  const vocabulary: VocabularyOverrides = {
    ...current.vocabulary,
    hiddenIdsByLesson: {
      ...current.vocabulary.hiddenIdsByLesson,
      [lessonId]: [...hiddenIds, vocabularyId],
    },
    updatedAt,
  };
  return {
    state: completeMutation(current, vocabulary, options),
    undoToken: {
      kind: 'restore',
      lessonId,
      vocabularyId,
      expectedVocabularyUpdatedAt: updatedAt,
    },
  };
};

export const buildRestoreVocabularyState = (
  current: PersistedAppStateV2,
  lessonId: string,
  vocabularyId: string,
  options: VocabularyMutationOptions,
): ReversibleVocabularyState => {
  const lesson = lessonFor(options.lessons, lessonId);
  const resolved = resolvedVocabularyFor(current, lesson, vocabularyId);
  if (!resolved.hidden) throw new Error('Vocabulary is not hidden.');

  const hiddenIds = current.vocabulary.hiddenIdsByLesson[lessonId] ?? [];
  const updatedAt = nextVocabularyTimestamp(current, options.now);
  const vocabulary: VocabularyOverrides = {
    ...current.vocabulary,
    hiddenIdsByLesson: {
      ...current.vocabulary.hiddenIdsByLesson,
      [lessonId]: hiddenIds.filter((id) => id !== vocabularyId),
    },
    updatedAt,
  };
  return {
    state: completeMutation(current, vocabulary, options),
    undoToken: {
      kind: 'hide',
      lessonId,
      vocabularyId,
      expectedVocabularyUpdatedAt: updatedAt,
    },
  };
};

export const buildTemporaryVocabularyUndoState = (
  current: PersistedAppStateV2,
  token: VocabularyUndoToken,
  options: VocabularyMutationOptions,
): PersistedAppStateV2 => {
  if (current.vocabulary.updatedAt !== token.expectedVocabularyUpdatedAt) {
    throw new Error('This undo has expired.');
  }

  return token.kind === 'hide'
    ? buildHideVocabularyState(current, token.lessonId, token.vocabularyId, options).state
    : buildRestoreVocabularyState(current, token.lessonId, token.vocabularyId, options).state;
};
