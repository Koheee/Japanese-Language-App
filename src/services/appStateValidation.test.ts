import { describe, expect, it } from 'vitest';

import { PersistedAppStateV2 } from '../models/appState';
import { emptyVocabularyOverrides } from '../models/vocabulary';
import {
  validatePersistedAppStateV2,
  validateStudyStateV1,
  ValidationResult,
} from './appStateValidation';

const timestamp = '2026-07-19T04:00:00.000Z';

const progress = {
  lessonId: 'lesson-01',
  started: true,
  completedExerciseIds: ['exercise-01'],
  correctAnswers: 1,
  attempts: 2,
};

const reviewCard = {
  id: 'review-word-01',
  lessonId: 'lesson-01',
  kind: 'vocabulary' as const,
  prompt: '今',
  answer: 'now',
  supportingText: 'いま · noun',
  dueAt: timestamp,
  intervalDays: 3,
  repetitions: 2,
  ease: 2.5,
  lastReviewedAt: timestamp,
};

const deviceRecord = {
  lessonId: 'lesson-01',
  item: {
    id: 'custom:lesson-01:word-01',
    japanese: '明日',
    reading: 'あした',
    english: 'tomorrow',
    partOfSpeech: 'noun',
    note: 'A note',
    example: { japanese: 'また明日。', reading: 'またあした。', english: 'See you tomorrow.' },
    category: 'Time',
    source: 'custom' as const,
    sourceId: 'device-source-01',
  },
  createdAt: timestamp,
  updatedAt: timestamp,
  sortKey: `custom:${timestamp}:word-01`,
};

const validV2 = (): PersistedAppStateV2 => ({
  schemaVersion: 2,
  authoredBaselineVersion: 'course-v1-test',
  progress: { 'lesson-01': { ...progress } },
  reviewCards: { 'review-word-01': { ...reviewCard } },
  vocabulary: {
    recordsByLesson: { 'lesson-01': [structuredClone(deviceRecord)] },
    hiddenIdsByLesson: { 'lesson-01': ['authored-word-01'] },
    updatedAt: timestamp,
  },
});

const expectInvalid = <T>(
  validator: (input: unknown) => ValidationResult<T>,
  input: unknown,
  path: string,
) => {
  const result = validator(input);
  expect(result).toMatchObject({ ok: false, path });
  if (result.ok) throw new Error(`expected ${path} to be invalid`);
  expect(result.message.length).toBeGreaterThan(0);
};

describe('validateStudyStateV1', () => {
  it('accepts the exact V1 maps and treats a missing suspended field as active', () => {
    const result = validateStudyStateV1({
      progress: { 'lesson-01': progress },
      reviewCards: { 'review-word-01': reviewCard },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.reviewCards['review-word-01']?.suspended).not.toBe(true);
  });

  it.each([
    ['progress', { progress: [], reviewCards: {} }],
    ['reviewCards', { progress: {}, reviewCards: null }],
  ])('rejects a non-object %s map at its exact path', (path, candidate) => {
    expectInvalid(validateStudyStateV1, candidate, path);
  });

  it.each([
    ['progress.lesson-01.lessonId', { ...progress, lessonId: 1 }],
    ['progress.lesson-01.started', { ...progress, started: 'true' }],
    ['progress.lesson-01.completedExerciseIds', { ...progress, completedExerciseIds: {} }],
    ['progress.lesson-01.completedExerciseIds.0', { ...progress, completedExerciseIds: [1] }],
    ['progress.lesson-01.correctAnswers', { ...progress, correctAnswers: '1' }],
    ['progress.lesson-01.attempts', { ...progress, attempts: -1 }],
  ])('rejects malformed lesson progress at %s', (path, malformedProgress) => {
    expectInvalid(
      validateStudyStateV1,
      { progress: { 'lesson-01': malformedProgress }, reviewCards: {} },
      path,
    );
  });

  it('rejects a progress record whose embedded lesson ID disagrees with its map key', () => {
    expectInvalid(
      validateStudyStateV1,
      { progress: { 'lesson-02': progress }, reviewCards: {} },
      'progress.lesson-02.lessonId',
    );
  });

  it('returns an exact validation failure for a sparse array instead of throwing', () => {
    const completedExerciseIds = new Array<string>(1);

    expectInvalid(
      validateStudyStateV1,
      {
        progress: { 'lesson-01': { ...progress, completedExerciseIds } },
        reviewCards: {},
      },
      'progress.lesson-01.completedExerciseIds.0',
    );
  });

  it.each([
    ['reviewCards.review-word-01.id', { ...reviewCard, id: 1 }],
    ['reviewCards.review-word-01.lessonId', { ...reviewCard, lessonId: null }],
    ['reviewCards.review-word-01.kind', { ...reviewCard, kind: 'kanji' }],
    ['reviewCards.review-word-01.prompt', { ...reviewCard, prompt: false }],
    ['reviewCards.review-word-01.answer', { ...reviewCard, answer: [] }],
    ['reviewCards.review-word-01.supportingText', { ...reviewCard, supportingText: 1 }],
    ['reviewCards.review-word-01.dueAt', { ...reviewCard, dueAt: 'not-an-iso-date' }],
    ['reviewCards.review-word-01.intervalDays', { ...reviewCard, intervalDays: Number.NaN }],
    ['reviewCards.review-word-01.repetitions', { ...reviewCard, repetitions: 1.5 }],
    ['reviewCards.review-word-01.ease', { ...reviewCard, ease: '2.5' }],
    ['reviewCards.review-word-01.lastReviewedAt', { ...reviewCard, lastReviewedAt: '2026-02-30T00:00:00.000Z' }],
    ['reviewCards.review-word-01.suspended', { ...reviewCard, suspended: 'false' }],
  ])('rejects malformed review cards at %s', (path, malformedCard) => {
    expectInvalid(
      validateStudyStateV1,
      { progress: {}, reviewCards: { 'review-word-01': malformedCard } },
      path,
    );
  });

  it('rejects a review card whose embedded ID disagrees with its map key', () => {
    expectInvalid(
      validateStudyStateV1,
      { progress: {}, reviewCards: { 'review-other': reviewCard } },
      'reviewCards.review-other.id',
    );
  });
});

describe('validatePersistedAppStateV2', () => {
  it('accepts a complete V2 and treats a missing suspended field as active', () => {
    const result = validatePersistedAppStateV2(validV2());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.reviewCards['review-word-01']?.suspended).not.toBe(true);
  });

  it.each([
    ['schemaVersion', { ...validV2(), schemaVersion: 1 }],
    ['schemaVersion', { ...validV2(), schemaVersion: '2' }],
    ['authoredBaselineVersion', { ...validV2(), authoredBaselineVersion: 1 }],
  ])('rejects the wrong schema or version type at %s', (path, candidate) => {
    expectInvalid(validatePersistedAppStateV2, candidate, path);
  });

  it.each([
    ['progress', { ...validV2(), progress: [] }],
    ['reviewCards', { ...validV2(), reviewCards: 'cards' }],
    ['vocabulary', { ...validV2(), vocabulary: null }],
    ['vocabulary.recordsByLesson', { ...validV2(), vocabulary: { ...emptyVocabularyOverrides(), recordsByLesson: [] } }],
    ['vocabulary.hiddenIdsByLesson', { ...validV2(), vocabulary: { ...emptyVocabularyOverrides(), hiddenIdsByLesson: [] } }],
  ])('rejects non-object V2 maps at %s', (path, candidate) => {
    expectInvalid(validatePersistedAppStateV2, candidate, path);
  });

  it('does not replace a malformed required map with an empty default', () => {
    const candidate = { ...validV2(), progress: 'malformed' };
    const result = validatePersistedAppStateV2(candidate);

    expect(result).toMatchObject({ ok: false, path: 'progress' });
  });

  it('rejects authored course records inside the device-record collection', () => {
    const candidate = validV2();
    candidate.vocabulary.recordsByLesson['lesson-01']![0]!.item.source = 'course' as 'custom';

    expectInvalid(
      validatePersistedAppStateV2,
      candidate,
      'vocabulary.recordsByLesson.lesson-01.0.item.source',
    );
  });

  it('requires an explicit device source instead of coercing a missing source to course', () => {
    const candidate = structuredClone(validV2()) as unknown as {
      vocabulary: { recordsByLesson: Record<string, Array<{ item: Record<string, unknown> }>> };
    };
    delete candidate.vocabulary.recordsByLesson['lesson-01']![0]!.item.source;

    expectInvalid(
      validatePersistedAppStateV2,
      candidate,
      'vocabulary.recordsByLesson.lesson-01.0.item.source',
    );
  });

  it('rejects a device record whose lesson ID disagrees with its containing map', () => {
    const candidate = validV2();
    candidate.vocabulary.recordsByLesson['lesson-01']![0]!.lessonId = 'lesson-02';

    expectInvalid(
      validatePersistedAppStateV2,
      candidate,
      'vocabulary.recordsByLesson.lesson-01.0.lessonId',
    );
  });

  it('rejects duplicate device vocabulary IDs across lesson collections', () => {
    const candidate = validV2();
    candidate.vocabulary.recordsByLesson['lesson-02'] = [{
      ...structuredClone(deviceRecord),
      lessonId: 'lesson-02',
    }];

    expectInvalid(
      validatePersistedAppStateV2,
      candidate,
      'vocabulary.recordsByLesson.lesson-02.0.item.id',
    );
  });

  it('rejects duplicate hidden IDs, including duplicates across lesson collections', () => {
    const candidate = validV2();
    candidate.vocabulary.hiddenIdsByLesson['lesson-02'] = ['authored-word-01'];

    expectInvalid(
      validatePersistedAppStateV2,
      candidate,
      'vocabulary.hiddenIdsByLesson.lesson-02.0',
    );
  });

  it.each([
    ['vocabulary.recordsByLesson.lesson-01.0.item.japanese', 'japanese', 1],
    ['vocabulary.recordsByLesson.lesson-01.0.item.example.english', 'example', { japanese: '今', english: 1 }],
    ['vocabulary.recordsByLesson.lesson-01.0.createdAt', 'createdAt', 'yesterday'],
    ['vocabulary.recordsByLesson.lesson-01.0.updatedAt', 'updatedAt', '2026-13-19T04:00:00.000Z'],
    ['vocabulary.recordsByLesson.lesson-01.0.sortKey', 'sortKey', false],
  ])('rejects malformed device records at %s', (path, field, value) => {
    const candidate = structuredClone(validV2()) as unknown as {
      vocabulary: { recordsByLesson: Record<string, Array<Record<string, unknown>>> };
    };
    const record = candidate.vocabulary.recordsByLesson['lesson-01']![0]!;
    if (field === 'japanese') {
      (record.item as Record<string, unknown>).japanese = value;
    } else if (field === 'example') {
      (record.item as Record<string, unknown>).example = value;
    } else {
      record[field] = value;
    }

    expectInvalid(validatePersistedAppStateV2, candidate, path);
  });

  it.each([
    ['vocabulary.updatedAt', { ...emptyVocabularyOverrides(), updatedAt: 'today' }],
    ['vocabulary.updatedAt', { ...emptyVocabularyOverrides(), updatedAt: 0 }],
  ])('validates the nested vocabulary timestamp at %s', (path, vocabulary) => {
    expectInvalid(validatePersistedAppStateV2, { ...validV2(), vocabulary }, path);
  });

  it('accepts null for VocabularyOverrides.updatedAt', () => {
    expect(validatePersistedAppStateV2({ ...validV2(), vocabulary: emptyVocabularyOverrides() }).ok).toBe(true);
  });

  it('validates a complete import recovery snapshot, including null prior cards', () => {
    const candidate = validV2();
    candidate.lastImportRecovery = {
      previousVocabulary: emptyVocabularyOverrides(),
      previousAffectedReviewCards: {
        'review-word-01': { ...reviewCard },
        'review-new-word': null,
      },
      affectedReviewCardIds: ['review-word-01', 'review-new-word'],
      authoredBaselineVersion: 'course-v1-before-import',
      importedAt: timestamp,
    };

    expect(validatePersistedAppStateV2(candidate).ok).toBe(true);
  });

  it.each([
    ['lastImportRecovery', null],
    ['lastImportRecovery.previousVocabulary', { previousVocabulary: null }],
    ['lastImportRecovery.previousAffectedReviewCards', { previousAffectedReviewCards: [] }],
    ['lastImportRecovery.affectedReviewCardIds', { affectedReviewCardIds: {} }],
    ['lastImportRecovery.affectedReviewCardIds.0', { affectedReviewCardIds: [1] }],
    ['lastImportRecovery.authoredBaselineVersion', { authoredBaselineVersion: 2 }],
    ['lastImportRecovery.importedAt', { importedAt: 'not-a-date' }],
  ])('rejects malformed recovery records at %s', (path, replacement) => {
    const recovery = {
      previousVocabulary: emptyVocabularyOverrides(),
      previousAffectedReviewCards: {},
      affectedReviewCardIds: [],
      authoredBaselineVersion: 'course-v1-before-import',
      importedAt: timestamp,
      ...(replacement && typeof replacement === 'object' ? replacement : {}),
    };
    const candidate = { ...validV2(), lastImportRecovery: replacement === null ? null : recovery };

    expectInvalid(validatePersistedAppStateV2, candidate, path);
  });

  it('rejects duplicate affected recovery IDs', () => {
    const candidate = validV2();
    candidate.lastImportRecovery = {
      previousVocabulary: emptyVocabularyOverrides(),
      previousAffectedReviewCards: {},
      affectedReviewCardIds: ['review-word-01', 'review-word-01'],
      authoredBaselineVersion: 'course-v1-before-import',
      importedAt: timestamp,
    };

    expectInvalid(
      validatePersistedAppStateV2,
      candidate,
      'lastImportRecovery.affectedReviewCardIds.1',
    );
  });

  it('rejects a previous recovery card not listed in affectedReviewCardIds', () => {
    const candidate = validV2();
    candidate.lastImportRecovery = {
      previousVocabulary: emptyVocabularyOverrides(),
      previousAffectedReviewCards: { 'review-word-01': { ...reviewCard } },
      affectedReviewCardIds: [],
      authoredBaselineVersion: 'course-v1-before-import',
      importedAt: timestamp,
    };

    expectInvalid(
      validatePersistedAppStateV2,
      candidate,
      'lastImportRecovery.previousAffectedReviewCards.review-word-01',
    );
  });

  it('rejects malformed prior recovery cards with their full nested path', () => {
    const candidate = validV2();
    candidate.lastImportRecovery = {
      previousVocabulary: emptyVocabularyOverrides(),
      previousAffectedReviewCards: {
        'review-word-01': { ...reviewCard, suspended: 'false' as unknown as boolean },
      },
      affectedReviewCardIds: ['review-word-01'],
      authoredBaselineVersion: 'course-v1-before-import',
      importedAt: timestamp,
    };

    expectInvalid(
      validatePersistedAppStateV2,
      candidate,
      'lastImportRecovery.previousAffectedReviewCards.review-word-01.suspended',
    );
  });

  it('rejects unknown nested properties but accepts JSON-compatible unknown top-level properties', () => {
    const nested = validV2() as PersistedAppStateV2 & { vocabulary: PersistedAppStateV2['vocabulary'] & { future: boolean } };
    nested.vocabulary.future = true;
    expectInvalid(validatePersistedAppStateV2, nested, 'vocabulary.future');

    const topLevel = { ...validV2(), futureEnvelopeField: { enabled: true, generations: [1, 2] } };
    const result = validatePersistedAppStateV2(topLevel);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toHaveProperty('futureEnvelopeField');
  });

  it.each([
    ['futureEnvelopeField.value', { value: undefined }],
    ['futureEnvelopeField', new Date(timestamp)],
    ['futureEnvelopeField.0', [Number.POSITIVE_INFINITY]],
  ])('rejects non-JSON values even under ignored top-level fields at %s', (path, futureEnvelopeField) => {
    expectInvalid(
      validatePersistedAppStateV2,
      { ...validV2(), futureEnvelopeField },
      path,
    );
  });

  it('rejects array expando properties that JSON serialization would discard', () => {
    const futureEnvelopeField = [1] as number[] & { metadata?: string };
    futureEnvelopeField.metadata = 'discarded';

    expectInvalid(
      validatePersistedAppStateV2,
      { ...validV2(), futureEnvelopeField },
      'futureEnvelopeField.metadata',
    );
  });

  it('rejects symbol-keyed properties that JSON serialization would discard', () => {
    const metadata = Symbol('metadata');
    const futureEnvelopeField = { enabled: true, [metadata]: 'discarded' };

    expectInvalid(
      validatePersistedAppStateV2,
      { ...validV2(), futureEnvelopeField },
      'futureEnvelopeField.Symbol(metadata)',
    );
  });
});
