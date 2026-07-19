import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { PersistedAppStateV2 } from '../models/appState';
import { Lesson } from '../models/content';
import { ReviewCard } from '../models/review';
import {
  MAX_VOCABULARY_BACKUP_BYTES,
  VOCABULARY_BACKUP_FORMAT,
  VOCABULARY_BACKUP_SCHEMA_VERSION,
  VocabularyBackupFileV1,
} from '../models/vocabularyBackup';
import { DeviceVocabularyRecord } from '../models/vocabulary';
import { validatePersistedAppStateV2 } from './appStateValidation';
import { createAppStateCommitter } from '../state/appStateCommitter';
import {
  buildVocabularyBackup,
  replaceVocabularyFromPreview,
  undoLastVocabularyImport,
  validateVocabularyBackupBytes,
  VocabularyImportPreview,
} from './vocabularyBackup';

const before = '2026-07-18T01:00:00.000Z';
const exportedAt = '2026-07-19T01:00:00.000Z';
const now = new Date('2026-07-19T02:00:00.000Z');
const later = new Date('2026-07-19T03:00:00.000Z');

const lesson = (
  id: string,
  number: number,
  vocabulary: Lesson['vocabulary'],
  grammar: Lesson['grammar'] = [],
): Lesson => ({
  id,
  number,
  title: `Lesson ${number}`,
  japaneseTitle: `Lesson ${number}`,
  description: 'Invented fixture lesson',
  durationMinutes: 10,
  theme: 'Fixtures',
  availability: 'ready',
  goals: [],
  grammar,
  vocabulary,
  dialogue: [],
  exercises: [],
});

const lessons: readonly Lesson[] = [
  lesson(
    'lesson-01',
    1,
    [
      {
        id: 'course-word',
        japanese: 'そら',
        reading: 'そら',
        english: 'sky',
        partOfSpeech: 'noun',
        source: 'course',
      },
      {
        id: 'unaffected-course-word',
        japanese: 'やま',
        reading: 'やま',
        english: 'mountain',
        partOfSpeech: 'noun',
        source: 'course',
      },
    ],
    [{
      id: 'grammar-point',
      title: 'Invented grammar',
      pattern: 'A は B',
      plainEnglish: 'A is B',
      explanation: 'Fixture explanation',
      whyItWorks: 'Fixture reason',
      examples: [],
    }],
  ),
  lesson('lesson-02', 2, [{
    id: 'other-course-word',
    japanese: 'かわ',
    reading: 'かわ',
    english: 'river',
    partOfSpeech: 'noun',
    source: 'course',
  }]),
];

const deviceRecord = ({
  id,
  lessonId,
  source,
  japanese = 'ねこ',
  reading = 'ねこ',
  english = 'cat',
  sortKey = `${source}:00000001`,
}: {
  id: string;
  lessonId: string;
  source: 'personal-deck' | 'custom';
  japanese?: string;
  reading?: string;
  english?: string;
  sortKey?: string;
}): DeviceVocabularyRecord => ({
  lessonId,
  item: {
    id,
    japanese,
    reading,
    english,
    partOfSpeech: 'vocabulary',
    source,
    ...(source === 'personal-deck' ? { sourceId: 'L01-1' } : {}),
  },
  createdAt: before,
  updatedAt: before,
  sortKey,
});

const reviewCard = ({
  id,
  lessonId = 'lesson-01',
  kind = 'vocabulary',
  prompt = 'ねこ',
  answer = 'cat',
  supportingText,
  suspended,
}: {
  id: string;
  lessonId?: string;
  kind?: ReviewCard['kind'];
  prompt?: string;
  answer?: string;
  supportingText?: string;
  suspended?: boolean;
}): ReviewCard => ({
  id,
  lessonId,
  kind,
  prompt,
  answer,
  supportingText: supportingText ?? (kind === 'vocabulary' ? 'ねこ · vocabulary' : 'Invented grammar'),
  dueAt: before,
  intervalDays: 4,
  repetitions: 2,
  ease: 2.4,
  lastReviewedAt: before,
  suspended: suspended ?? false,
});

const oldLocal = deviceRecord({
  id: 'personal-deck:lesson-01:old-with-hyphens',
  lessonId: 'lesson-01',
  source: 'personal-deck',
});
const oldUnstartedLocal = deviceRecord({
  id: 'custom:lesson-02:old',
  lessonId: 'lesson-02',
  source: 'custom',
  japanese: 'いぬ',
  reading: 'いぬ',
  english: 'dog',
  sortKey: 'custom:2026-07-18T01:00:00.000Z:old',
});

const currentState = (): PersistedAppStateV2 => ({
  schemaVersion: 2,
  authoredBaselineVersion: 'course-v1-current',
  progress: {
    'lesson-01': {
      lessonId: 'lesson-01',
      started: true,
      completedExerciseIds: ['exercise-01'],
      correctAnswers: 1,
      attempts: 2,
    },
    'lesson-02': {
      lessonId: 'lesson-02',
      started: false,
      completedExerciseIds: [],
      correctAnswers: 0,
      attempts: 0,
    },
  },
  reviewCards: {
    [`review-${oldLocal.item.id}`]: reviewCard({ id: `review-${oldLocal.item.id}` }),
    [`review-${oldUnstartedLocal.item.id}`]: reviewCard({
      id: `review-${oldUnstartedLocal.item.id}`,
      lessonId: 'lesson-02',
      prompt: 'いぬ',
      answer: 'dog',
    }),
    'review-course-word': reviewCard({
      id: 'review-course-word',
      prompt: 'そら',
      answer: 'sky',
      supportingText: 'そら · noun',
      suspended: true,
    }),
    'review-unaffected-course-word': reviewCard({
      id: 'review-unaffected-course-word',
      prompt: 'やま',
      answer: 'mountain',
      supportingText: 'やま · noun',
    }),
    'review-grammar-point': reviewCard({
      id: 'review-grammar-point',
      kind: 'grammar',
      prompt: 'A は B',
      answer: 'A is B',
    }),
  },
  vocabulary: {
    recordsByLesson: {
      'lesson-01': [structuredClone(oldLocal)],
      'lesson-02': [structuredClone(oldUnstartedLocal)],
    },
    hiddenIdsByLesson: { 'lesson-01': ['course-word'] },
    updatedAt: before,
  },
});

const newStarted = deviceRecord({
  id: 'custom:lesson-01:new-with-hyphens',
  lessonId: 'lesson-01',
  source: 'custom',
  japanese: 'とり',
  reading: 'とり',
  english: 'bird',
  sortKey: 'custom:2026-07-19T01:00:00.000Z:new-with-hyphens',
});
const newUnstarted = deviceRecord({
  id: 'custom:lesson-02:new',
  lessonId: 'lesson-02',
  source: 'custom',
  japanese: 'うま',
  reading: 'うま',
  english: 'horse',
  sortKey: 'custom:2026-07-19T01:00:00.000Z:new',
});

const backup = (overrides: Partial<VocabularyBackupFileV1> = {}): VocabularyBackupFileV1 => ({
  format: VOCABULARY_BACKUP_FORMAT,
  schemaVersion: VOCABULARY_BACKUP_SCHEMA_VERSION,
  exportedAt,
  authoredBaselineVersion: 'course-v1-current',
  records: [structuredClone(newStarted)],
  hidden: [{ lessonId: 'lesson-01', vocabularyId: 'course-word', owner: 'course' }],
  reviewCards: [
    reviewCard({
      id: `review-${newStarted.item.id}`,
      prompt: newStarted.item.japanese,
      answer: newStarted.item.english,
    }),
    reviewCard({
      id: 'review-course-word',
      prompt: 'そら',
      answer: 'sky',
      suspended: true,
    }),
  ],
  ...overrides,
});

const replacementFile = backup();
const startedAndUnstartedFile = backup({
  records: [structuredClone(newStarted), structuredClone(newUnstarted)],
  hidden: [],
  reviewCards: [],
});

const bytesFor = (value: unknown): Uint8Array => new TextEncoder().encode(JSON.stringify(value));

const validate = (
  fileOrBytes: VocabularyBackupFileV1 | Uint8Array,
  current = currentState(),
  sourceLessons: readonly Lesson[] = lessons,
) => validateVocabularyBackupBytes({
  bytes: fileOrBytes instanceof Uint8Array ? fileOrBytes : bytesFor(fileOrBytes),
  lessons: sourceLessons,
  current,
});

const firstIssue = (result: ReturnType<typeof validate>): string =>
  result.ok ? '' : result.issues[0] ?? '';

const validPreview = (
  file: VocabularyBackupFileV1,
  current = currentState(),
): VocabularyImportPreview => {
  const result = validate(file, current);
  if (!result.ok) throw new Error(result.issues.join('\n'));
  return result.preview;
};

const deviceIds = (state: PersistedAppStateV2): string[] =>
  Object.values(state.vocabulary.recordsByLesson).flat().map(({ item }) => item.id);

const stripUpdatedAt = (vocabulary: PersistedAppStateV2['vocabulary']) => ({
  ...vocabulary,
  updatedAt: null,
});

const validateOrThrow = (input: unknown): PersistedAppStateV2 => {
  const result = validatePersistedAppStateV2(input);
  if (!result.ok) throw new Error(`${result.path}: ${result.message}`);
  return result.value;
};

const generationFor = (records: DeviceVocabularyRecord[]) => ({
  sourceNoteCount: records.length,
  acceptedCount: records.length,
  skippedAuthoredCount: 0,
  skippedEarlierPersonalCount: 0,
  acceptedByLesson: { 'lesson-01': records.filter(({ lessonId }) => lessonId === 'lesson-01').length, 'lesson-02': records.filter(({ lessonId }) => lessonId === 'lesson-02').length },
  sourceByLesson: { 'lesson-01': records.filter(({ lessonId }) => lessonId === 'lesson-01').length, 'lesson-02': records.filter(({ lessonId }) => lessonId === 'lesson-02').length },
  checksumSha256: createHash('sha256').update(JSON.stringify(records)).digest('hex'),
});

describe('vocabulary backup', () => {
  it('exports only device records, lesson-scoped hidden entries, and associated vocabulary cards deterministically', () => {
    const current = currentState();
    const file = buildVocabularyBackup(current, lessons, now.toISOString());

    expect(file.records.map(({ item }) => item.source)).toEqual(['personal-deck', 'custom']);
    expect(file.records.map(({ item }) => item.id)).toEqual([
      oldLocal.item.id,
      oldUnstartedLocal.item.id,
    ]);
    expect(file.reviewCards.every(({ kind }) => kind === 'vocabulary')).toBe(true);
    expect(file.reviewCards.map(({ id }) => id).sort()).not.toContain('review-grammar-point');
    expect(file.hidden).toContainEqual({
      lessonId: 'lesson-01',
      vocabularyId: 'course-word',
      owner: 'course',
    });
    expect(file.reviewCards.map(({ id }) => id)).toEqual([
      'review-course-word',
      `review-${oldUnstartedLocal.item.id}`,
      `review-${oldLocal.item.id}`,
    ]);
    expect(file).not.toHaveProperty('generation');
    expect(buildVocabularyBackup(current, lessons, now.toISOString())).toEqual(file);
  });

  it('returns a detached export that cannot mutate the live state through aliases', () => {
    const current = currentState();
    const file = buildVocabularyBackup(current, lessons, now.toISOString());

    file.records[0]!.item.japanese = 'かいざん';
    file.reviewCards[0]!.dueAt = exportedAt;

    expect(current.vocabulary.recordsByLesson['lesson-01']![0]!.item.japanese).toBe('ねこ');
    expect(current.reviewCards['review-course-word']!.dueAt).toBe(before);
  });

  it.each([
    ['non-json', new TextEncoder().encode('{broken'), 'File is not valid JSON'],
    ['invalid-utf8', new Uint8Array([0xc3, 0x28]), 'File is not valid UTF-8'],
    ['wrong-format', backup({ format: 'other-format' as typeof VOCABULARY_BACKUP_FORMAT }), 'Unsupported vocabulary backup format'],
    ['wrong-version', backup({ schemaVersion: 2 as typeof VOCABULARY_BACKUP_SCHEMA_VERSION }), 'Unsupported vocabulary backup schema'],
    ['malformed-record', { ...backup(), records: [{ ...newStarted, lessonId: 4 }] }, 'records[0]'],
    ['duplicate-id', { ...backup(), records: [newStarted, { ...newStarted, lessonId: 'lesson-02' }] }, 'Duplicate vocabulary ID'],
    ['unknown-lesson', { ...backup(), records: [{ ...newStarted, lessonId: 'lesson-99' }] }, 'Unknown lesson ID'],
    ['conflicting-id', { ...backup(), records: [{ ...newStarted, item: { ...newStarted.item, id: 'course-word' } }] }, 'Conflicting vocabulary ID'],
    ['bad-review-kind', { ...backup(), reviewCards: [{ ...backup().reviewCards[0]!, kind: 'grammar' }] }, 'Review kind must be vocabulary'],
    ['bad-review-id', { ...backup(), reviewCards: [{ ...backup().reviewCards[0]!, id: newStarted.item.id }] }, 'Review ID must equal review-<vocabulary-id>'],
    ['review-owner-missing', { ...backup(), reviewCards: [{ ...backup().reviewCards[0]!, id: 'review-missing-vocabulary' }] }, 'Review vocabulary ID is not represented'],
    ['review-lesson-mismatch', { ...backup(), reviewCards: [{ ...backup().reviewCards[0]!, lessonId: 'lesson-02' }] }, 'Review lesson does not match vocabulary owner'],
    ['malformed-generation', backup({ generation: { ...generationFor([newStarted]), acceptedCount: -1 } }), 'generation'],
  ])('rejects %s completely', (_fixture, input, message) => {
    const result = validate(input instanceof Uint8Array ? input : input as VocabularyBackupFileV1);
    expect(result).toMatchObject({ ok: false });
    expect(firstIssue(result)).toContain(message);
  });

  it('checks the five-megabyte limit before decoding and accepts the exact byte boundary', () => {
    const validBytes = bytesFor(backup());
    const exact = new Uint8Array(MAX_VOCABULARY_BACKUP_BYTES).fill(0x20);
    exact.set(validBytes);
    expect(validate(exact)).toMatchObject({ ok: true });

    const over = new Uint8Array(MAX_VOCABULARY_BACKUP_BYTES + 1).fill(0xff);
    const result = validate(over);
    expect(result).toMatchObject({ ok: false });
    expect(firstIssue(result)).toContain('File exceeds 5 MB');
  });

  it('rejects excessively nested JSON data without overflowing the validator stack', () => {
    const depth = 20_000;
    const bytes = new TextEncoder().encode(`${'['.repeat(depth)}null${']'.repeat(depth)}`);
    expect(bytes.byteLength).toBeLessThanOrEqual(MAX_VOCABULARY_BACKUP_BYTES);

    let result: ReturnType<typeof validate> | undefined;
    expect(() => {
      result = validate(bytes);
    }).not.toThrow();

    expect(result).toMatchObject({ ok: false });
    expect(result && firstIssue(result)).toMatch(/JSON data nesting/i);
  });

  it('returns a safe validation failure when a semantic dependency throws unexpectedly', () => {
    const explosiveCurrent = new Proxy(currentState(), {
      get() {
        throw new Error('unexpected validation dependency failure');
      },
    });

    let result: ReturnType<typeof validate> | undefined;
    expect(() => {
      result = validate(backup(), explosiveCurrent);
    }).not.toThrow();

    expect(result).toEqual({
      ok: false,
      issues: ['Vocabulary backup validation failed unexpectedly'],
    });
  });

  it('rejects inherited serialization hooks instead of validating bytes that persist differently', () => {
    const bytes = bytesFor(backup());
    const previous = Object.getOwnPropertyDescriptor(Object.prototype, 'toJSON');
    Object.defineProperty(Object.prototype, 'toJSON', {
      configurable: true,
      value: () => ({ replaced: true }),
    });
    try {
      const result = validate(bytes);
      expect(result).toMatchObject({ ok: false });
      expect(firstIssue(result)).toContain('toJSON');
    } finally {
      if (previous) Object.defineProperty(Object.prototype, 'toJSON', previous);
      else delete (Object.prototype as { toJSON?: unknown }).toJSON;
    }
  });

  it.each([
    ['accepted total', (summary: ReturnType<typeof generationFor>) => { summary.acceptedCount += 1; }],
    ['source arithmetic', (summary: ReturnType<typeof generationFor>) => { summary.sourceNoteCount += 1; }],
    ['accepted map', (summary: ReturnType<typeof generationFor>) => { summary.acceptedByLesson['lesson-01'] = 0; }],
    ['source map', (summary: ReturnType<typeof generationFor>) => { summary.sourceByLesson['lesson-02'] = 2; }],
    ['unknown map lesson', (summary: ReturnType<typeof generationFor>) => {
      (summary.sourceByLesson as Record<string, number>)['lesson-99'] = 0;
    }],
    ['checksum case', (summary: ReturnType<typeof generationFor>) => { summary.checksumSha256 = summary.checksumSha256.toUpperCase(); }],
    ['checksum content', (summary: ReturnType<typeof generationFor>) => { summary.checksumSha256 = '0'.repeat(64); }],
  ])('strictly rejects a generation summary with invalid %s', (_case, mutate) => {
    const summary = generationFor([newStarted]);
    mutate(summary);
    const result = validate(backup({ generation: summary }));

    expect(result).toMatchObject({ ok: false });
    expect(firstIssue(result)).toContain('generation');
  });

  it('accepts a generation summary only when all counts, maps, arithmetic, and checksum agree', () => {
    const records = [structuredClone(newStarted)];
    expect(validate(backup({ records, generation: generationFor(records) }))).toMatchObject({ ok: true });
  });

  it('warns rather than fails for a different authored baseline', () => {
    const result = validate(backup({ authoredBaselineVersion: 'course-v1-other' }));
    expect(result).toMatchObject({
      ok: true,
      preview: { baselineWarning: expect.stringContaining('different course baseline') },
    });
  });

  it('keeps a well-formed unknown course tombstone but rejects a known ID in another lesson or grammar', () => {
    expect(validate(backup({
      records: [],
      hidden: [{ lessonId: 'lesson-01', vocabularyId: 'retired-course-word', owner: 'course' }],
      reviewCards: [],
    }))).toMatchObject({ ok: true });

    for (const vocabularyId of ['other-course-word', 'grammar-point']) {
      const result = validate(backup({
        records: [],
        hidden: [{ lessonId: 'lesson-01', vocabularyId, owner: 'course' }],
        reviewCards: [],
      }));
      expect(result).toMatchObject({ ok: false });
      expect(firstIssue(result)).toContain('Conflicting vocabulary ID');
    }
  });

  it('rejects a course tombstone when the authored ID has any additional grammar or other-lesson owner', () => {
    const sameLessonGrammar = structuredClone(lessons);
    sameLessonGrammar[0]!.grammar[0]!.id = 'course-word';
    const otherLessonVocabulary = structuredClone(lessons);
    otherLessonVocabulary[1]!.vocabulary[0]!.id = 'course-word';
    const file = backup({
      records: [],
      hidden: [{ lessonId: 'lesson-01', vocabularyId: 'course-word', owner: 'course' }],
      reviewCards: [],
    });

    for (const collidedLessons of [sameLessonGrammar, otherLessonVocabulary]) {
      const result = validate(file, currentState(), collidedLessons);
      expect(result).toMatchObject({ ok: false });
      expect(firstIssue(result)).toContain('Conflicting vocabulary ID');
    }
  });

  it('requires device-owned hidden IDs to be represented by an incoming same-lesson record', () => {
    expect(validate(backup({
      hidden: [{ lessonId: 'lesson-01', vocabularyId: newStarted.item.id, owner: 'device' }],
      reviewCards: [backup().reviewCards[0]!],
    }))).toMatchObject({ ok: true });

    for (const hidden of [
      [{ lessonId: 'lesson-01', vocabularyId: 'custom:lesson-01:missing', owner: 'device' as const }],
      [{ lessonId: 'lesson-02', vocabularyId: newStarted.item.id, owner: 'device' as const }],
    ]) {
      const result = validate(backup({ hidden }));
      expect(result).toMatchObject({ ok: false });
      expect(firstIssue(result)).toContain('Device hidden vocabulary ID is not represented in the same lesson');
    }
  });

  it('rejects duplicate hidden and review IDs without partially returning a preview', () => {
    const duplicateHidden = backup({ hidden: [backup().hidden[0]!, backup().hidden[0]!] });
    const duplicateReview = backup({ reviewCards: [backup().reviewCards[0]!, backup().reviewCards[0]!] });

    expect(firstIssue(validate(duplicateHidden))).toContain('Duplicate hidden vocabulary ID');
    expect(firstIssue(validate(duplicateReview))).toContain('Duplicate review ID');
  });

  it('rejects malformed device IDs, readings, sort keys, timestamp ordering, and unknown properties', () => {
    const cases: VocabularyBackupFileV1[] = [
      backup({ records: [{ ...newStarted, item: { ...newStarted.item, id: 'custom:lesson-02:new' } }] }),
      backup({ records: [{ ...newStarted, item: { ...newStarted.item, reading: 'neko' } }] }),
      backup({ records: [{ ...newStarted, sortKey: 'personal-deck:00000001' }] }),
      backup({ records: [{ ...newStarted, createdAt: exportedAt, updatedAt: before }] }),
      { ...backup(), future: true } as VocabularyBackupFileV1,
    ];

    for (const file of cases) expect(validate(file)).toMatchObject({ ok: false });
  });

  it('computes exact sorted affected vocabulary and review IDs using whole hyphenated IDs', () => {
    const preview = validPreview(replacementFile);

    expect(preview.affectedVocabularyIds).toEqual([
      'course-word',
      'custom:lesson-01:new-with-hyphens',
      'custom:lesson-02:old',
      'personal-deck:lesson-01:old-with-hyphens',
    ]);
    expect(preview.affectedReviewCardIds).toEqual(preview.affectedVocabularyIds.map((id) => `review-${id}`));
  });

  it('replaces rather than merges and leaves unrelated progress/grammar/vocabulary schedules byte-for-byte unchanged', () => {
    const current = currentState();
    const preview = validPreview(replacementFile, current);
    const next = replaceVocabularyFromPreview(current, preview, { lessons, now });

    expect(deviceIds(next)).toEqual(replacementFile.records.map(({ item }) => item.id));
    expect(next.reviewCards[`review-${oldLocal.item.id}`]).toBeUndefined();
    expect(JSON.stringify(next.progress)).toBe(JSON.stringify(current.progress));
    expect(JSON.stringify(next.reviewCards['review-grammar-point'])).toBe(JSON.stringify(current.reviewCards['review-grammar-point']));
    expect(JSON.stringify(next.reviewCards['review-unaffected-course-word'])).toBe(JSON.stringify(current.reviewCards['review-unaffected-course-word']));
    expect(next.reviewCards['review-grammar-point']).toBe(current.reviewCards['review-grammar-point']);
    expect(next.reviewCards['review-unaffected-course-word']).toBe(current.reviewCards['review-unaffected-course-word']);
  });

  it('rejects a preview when replacement-relevant state changed after preparation', () => {
    const current = currentState();
    const preview = validPreview(replacementFile, current);
    const changedVocabulary = structuredClone(current);
    changedVocabulary.vocabulary.recordsByLesson['lesson-01']!.push(deviceRecord({
      id: 'custom:lesson-01:added-after-preview',
      lessonId: 'lesson-01',
      source: 'custom',
      sortKey: 'custom:2026-07-19T01:30:00.000Z:added-after-preview',
    }));
    changedVocabulary.vocabulary.updatedAt = '2026-07-19T01:30:00.000Z';

    const changedAffectedSchedule = structuredClone(current);
    changedAffectedSchedule.reviewCards['review-course-word']!.dueAt = exportedAt;

    for (const candidate of [changedVocabulary, changedAffectedSchedule]) {
      expect(() => replaceVocabularyFromPreview(candidate, preview, { lessons, now })).toThrow('stale');
    }

    const startedPreview = validPreview(startedAndUnstartedFile, current);
    const changedStartedLessons = structuredClone(current);
    changedStartedLessons.progress['lesson-02']!.started = true;
    expect(() => replaceVocabularyFromPreview(
      changedStartedLessons,
      startedPreview,
      { lessons, now },
    )).toThrow('stale');

    const currentWithRemovedHidden = currentState();
    currentWithRemovedHidden.vocabulary.hiddenIdsByLesson['lesson-02'] = ['other-course-word'];
    const removalPreview = validPreview(replacementFile, currentWithRemovedHidden);
    const startedRemovedHiddenLesson = structuredClone(currentWithRemovedHidden);
    startedRemovedHiddenLesson.progress['lesson-02']!.started = true;
    expect(() => replaceVocabularyFromPreview(
      startedRemovedHiddenLesson,
      removalPreview,
      { lessons, now },
    )).toThrow('stale');
  });

  it('allows unrelated progress and grammar schedule changes after preparation and preserves them', () => {
    const current = currentState();
    const preview = validPreview(replacementFile, current);
    const changed = structuredClone(current);
    changed.progress['lesson-01']!.attempts += 1;
    changed.reviewCards['review-grammar-point']!.dueAt = exportedAt;

    const next = replaceVocabularyFromPreview(changed, preview, { lessons, now });

    expect(next.progress).toEqual(changed.progress);
    expect(next.reviewCards['review-grammar-point']).toEqual(changed.reviewCards['review-grammar-point']);
  });

  it('detaches imported and recovery payloads from retained preview and prior-state objects', () => {
    const current = currentState();
    const preview = validPreview(replacementFile, current);
    const next = replaceVocabularyFromPreview(current, preview, { lessons, now });
    const importedJapanese = next.vocabulary.recordsByLesson['lesson-01']![0]!.item.japanese;
    const importedDueAt = next.reviewCards[`review-${newStarted.item.id}`]!.dueAt;
    const priorJapanese = next.lastImportRecovery!.previousVocabulary
      .recordsByLesson['lesson-01']![0]!.item.japanese;
    const priorDueAt = next.lastImportRecovery!.previousAffectedReviewCards
      [`review-${oldLocal.item.id}`]!.dueAt;

    preview.file.records[0]!.item.japanese = 'かいざん';
    preview.file.reviewCards[0]!.dueAt = exportedAt;
    current.vocabulary.recordsByLesson['lesson-01']![0]!.item.japanese = 'へんこう';
    current.reviewCards[`review-${oldLocal.item.id}`]!.dueAt = exportedAt;

    expect(next.vocabulary.recordsByLesson['lesson-01']![0]!.item.japanese).toBe(importedJapanese);
    expect(next.reviewCards[`review-${newStarted.item.id}`]!.dueAt).toBe(importedDueAt);
    expect(next.lastImportRecovery!.previousVocabulary.recordsByLesson['lesson-01']![0]!.item.japanese).toBe(priorJapanese);
    expect(next.lastImportRecovery!.previousAffectedReviewCards[`review-${oldLocal.item.id}`]!.dueAt).toBe(priorDueAt);
  });

  it('rejects a stale confirmation queued behind a vocabulary commit without losing the newer word', async () => {
    let published = currentState();
    const preview = validPreview(replacementFile, published);
    const committer = createAppStateCommitter({
      getCurrent: () => published,
      validate: validateOrThrow,
      persist: async () => undefined,
      publish: (candidate) => { published = candidate; },
    });
    const added = deviceRecord({
      id: 'custom:lesson-01:queued-newer-word',
      lessonId: 'lesson-01',
      source: 'custom',
      sortKey: 'custom:2026-07-19T01:45:00.000Z:queued-newer-word',
    });

    const first = committer.commit((current) => ({
      ...current,
      vocabulary: {
        ...current.vocabulary,
        recordsByLesson: {
          ...current.vocabulary.recordsByLesson,
          'lesson-01': [...current.vocabulary.recordsByLesson['lesson-01']!, added],
        },
        updatedAt: '2026-07-19T01:45:00.000Z',
      },
    }));
    const confirmation = committer.commit(
      (current) => replaceVocabularyFromPreview(current, preview, { lessons, now }),
    );

    await expect(first).resolves.toMatchObject({ ok: true });
    await expect(confirmation).resolves.toMatchObject({
      ok: false,
      error: expect.objectContaining({ message: expect.stringContaining('stale') }),
    });
    expect(deviceIds(published)).toContain(added.item.id);
  });

  it('creates missing incoming cards only for started lessons', () => {
    const current = currentState();
    const next = replaceVocabularyFromPreview(
      current,
      validPreview(startedAndUnstartedFile, current),
      { lessons, now },
    );

    expect(next.reviewCards['review-custom:lesson-01:new-with-hyphens']).toBeDefined();
    expect(next.reviewCards['review-custom:lesson-02:new']).toBeUndefined();
  });

  it('stores a reload-safe recovery snapshot and undo restores the prior layer/cards', () => {
    const current = currentState();
    const imported = replaceVocabularyFromPreview(
      current,
      validPreview(replacementFile, current),
      { lessons, now },
    );
    const reloaded = validateOrThrow(JSON.parse(JSON.stringify(imported)));
    const undone = undoLastVocabularyImport(reloaded, { lessons, now: later });

    expect(stripUpdatedAt(undone.vocabulary)).toEqual(stripUpdatedAt(current.vocabulary));
    for (const cardId of imported.lastImportRecovery!.affectedReviewCardIds) {
      expect(undone.reviewCards[cardId]).toEqual(current.reviewCards[cardId]);
    }
    expect(undone.lastImportRecovery).toBeUndefined();
    expect(undone.vocabulary.updatedAt).toBe(later.toISOString());
    expect(undone.reviewCards['review-grammar-point']).toBe(reloaded.reviewCards['review-grammar-point']);
    expect(undone.reviewCards['review-unaffected-course-word']).toBe(reloaded.reviewCards['review-unaffected-course-word']);

    reloaded.lastImportRecovery!.previousVocabulary.recordsByLesson['lesson-01']![0]!.item.japanese = 'かいざん';
    reloaded.lastImportRecovery!.previousAffectedReviewCards[`review-${oldLocal.item.id}`]!.dueAt = exportedAt;
    expect(undone.vocabulary.recordsByLesson['lesson-01']![0]!.item.japanese).toBe(oldLocal.item.japanese);
    expect(undone.reviewCards[`review-${oldLocal.item.id}`]!.dueAt).toBe(before);
  });

  it('leaves the current validated state untouched when recovery cannot validate', () => {
    const current = currentState();
    const imported = replaceVocabularyFromPreview(
      current,
      validPreview(replacementFile, current),
      { lessons, now },
    );
    const corruptRecovery = structuredClone(imported);
    corruptRecovery.lastImportRecovery!.affectedReviewCardIds.push('review-grammar-point');
    corruptRecovery.lastImportRecovery!.previousAffectedReviewCards['review-grammar-point'] =
      structuredClone(current.reviewCards['review-grammar-point']!);
    const beforeAttempt = structuredClone(corruptRecovery);

    expect(() => undoLastVocabularyImport(corruptRecovery, { lessons, now: later })).toThrow();
    expect(corruptRecovery).toEqual(beforeAttempt);
  });

  it('rejects recovery of a prior vocabulary layer that no longer maps to a known lesson', () => {
    const current = currentState();
    const imported = replaceVocabularyFromPreview(
      current,
      validPreview(replacementFile, current),
      { lessons, now },
    );
    const corruptRecovery = structuredClone(imported);
    const unknownRecord = deviceRecord({
      id: 'custom:lesson-99:corrupt',
      lessonId: 'lesson-99',
      source: 'custom',
      sortKey: 'custom:2026-07-18T01:00:00.000Z:corrupt',
    });
    corruptRecovery.lastImportRecovery!.previousVocabulary.recordsByLesson['lesson-99'] = [unknownRecord];
    corruptRecovery.lastImportRecovery!.affectedReviewCardIds.splice(
      3,
      0,
      'review-custom:lesson-99:corrupt',
    );
    corruptRecovery.lastImportRecovery!.previousAffectedReviewCards['review-custom:lesson-99:corrupt'] = null;
    const beforeAttempt = structuredClone(corruptRecovery);

    expect(() => undoLastVocabularyImport(corruptRecovery, { lessons, now: later })).toThrow('Unknown lesson ID');
    expect(corruptRecovery).toEqual(beforeAttempt);
  });

  it('rejects a forged preview that attempts to replace a grammar card', () => {
    const current = currentState();
    const forged = structuredClone(validPreview(replacementFile, current));
    forged.file.reviewCards = [structuredClone(current.reviewCards['review-grammar-point']!)];

    expect(() => replaceVocabularyFromPreview(current, forged, { lessons, now })).toThrow('Review kind must be vocabulary');
    expect(current.reviewCards['review-grammar-point']?.kind).toBe('grammar');
  });

  it('uses a monotonic vocabulary timestamp and rejects advancement beyond the four-digit ISO ceiling', () => {
    const current = currentState();
    current.vocabulary.updatedAt = '2026-07-19T04:00:00.000Z';
    const next = replaceVocabularyFromPreview(
      current,
      validPreview(replacementFile, current),
      { lessons, now },
    );
    expect(next.vocabulary.updatedAt).toBe('2026-07-19T04:00:00.001Z');

    const ceiling = currentState();
    ceiling.vocabulary.updatedAt = '9999-12-31T23:59:59.999Z';
    expect(() => replaceVocabularyFromPreview(
      ceiling,
      validPreview(replacementFile, ceiling),
      { lessons, now },
    )).toThrow('cannot advance beyond');
  });
});
