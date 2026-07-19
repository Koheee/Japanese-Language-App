import { describe, expect, it } from 'vitest';

import { AUTHORED_BASELINE_VERSION } from '../data/authoredBaseline';
import { lessons } from '../data/lessons';
import { PersistedAppStateV2 } from '../models/appState';
import { ReviewCard } from '../models/review';
import { emptyVocabularyOverrides } from '../models/vocabulary';
import v1Fixture from '../test/fixtures/study-state-v1.json';
import {
  hydrateAppStateV2,
  KeyValueStorage,
  V1_STUDY_STORAGE_KEY,
  V2_APP_STATE_STORAGE_KEY,
  writeAppStateV2,
} from './appStateStorage';

const now = new Date('2026-07-19T04:00:00.000Z');

interface MemoryStorageOptions {
  failWrite?: boolean;
  failGetCalls?: readonly number[];
  afterSetReadback?: string | null;
}

interface MemoryStorage extends KeyValueStorage {
  values: Record<string, string>;
  getCalls: string[];
  setCalls: Array<[string, string]>;
  calls: Array<['get' | 'set', string]>;
}

const memoryStorage = (
  initial: Record<string, string> = {},
  options: MemoryStorageOptions = {},
): MemoryStorage => {
  const values = { ...initial };
  const getCalls: string[] = [];
  const setCalls: Array<[string, string]> = [];
  const calls: Array<['get' | 'set', string]> = [];
  let didSetV2 = false;

  return {
    values,
    getCalls,
    setCalls,
    calls,
    async getItem(key) {
      const callNumber = getCalls.length + 1;
      getCalls.push(key);
      calls.push(['get', key]);
      if (options.failGetCalls?.includes(callNumber)) throw new Error(`get ${callNumber} failed`);
      if (key === V2_APP_STATE_STORAGE_KEY && didSetV2 && 'afterSetReadback' in options) {
        return options.afterSetReadback ?? null;
      }
      return values[key] ?? null;
    },
    async setItem(key, value) {
      setCalls.push([key, value]);
      calls.push(['set', key]);
      if (options.failWrite) throw new Error('write failed');
      values[key] = value;
      if (key === V2_APP_STATE_STORAGE_KEY) didSetV2 = true;
    },
  };
};

const withPrototypeProperty = async <T>(
  prototype: object,
  key: PropertyKey,
  value: unknown,
  run: () => Promise<T>,
): Promise<T> => {
  const previous = Object.getOwnPropertyDescriptor(prototype, key);
  Object.defineProperty(prototype, key, { configurable: true, value });
  try {
    return await run();
  } finally {
    if (previous) Object.defineProperty(prototype, key, previous);
    else delete (prototype as Record<PropertyKey, unknown>)[key];
  }
};

const validV2 = (overrides: Partial<PersistedAppStateV2> = {}): PersistedAppStateV2 => ({
  schemaVersion: 2,
  authoredBaselineVersion: AUTHORED_BASELINE_VERSION,
  progress: {},
  reviewCards: {},
  vocabulary: emptyVocabularyOverrides(),
  ...overrides,
});

const pickSchedule = (card: {
  dueAt: string;
  intervalDays: number;
  repetitions: number;
  ease: number;
  lastReviewedAt?: string;
}) => ({
  dueAt: card.dueAt,
  intervalDays: card.intervalDays,
  repetitions: card.repetitions,
  ease: card.ease,
  lastReviewedAt: card.lastReviewedAt,
});

const hydrateFrozenV1 = (storage = memoryStorage({
  [V1_STUDY_STORAGE_KEY]: JSON.stringify(v1Fixture),
})) => hydrateAppStateV2({ storage, lessons, now });

describe('writeAppStateV2', () => {
  it('writes the exact serialized envelope to the V2 key only', async () => {
    const storage = memoryStorage();
    const state = validV2();

    await writeAppStateV2(storage, state);

    expect(storage.setCalls).toEqual([[V2_APP_STATE_STORAGE_KEY, JSON.stringify(state)]]);
  });
});

describe('hydrateAppStateV2', () => {
  it('hydrates stale V1 grammar presentation into V2 without changing its schedule', async () => {
    const v1 = structuredClone(v1Fixture);
    const stale = {
      id: 'review-l1-topic-copula',
      lessonId: 'lesson-01',
      kind: 'grammar' as const,
      prompt: 'A は old text',
      answer: 'stale answer',
      supportingText: 'Frame a topic, then describe it',
      dueAt: '2026-09-12T03:04:05.000Z',
      intervalDays: 17,
      repetitions: 6,
      ease: 2.35,
      lastReviewedAt: '2026-08-26T03:04:05.000Z',
    };
    v1.progress['lesson-01'] = {
      lessonId: 'lesson-01', started: true, completedExerciseIds: [], correctAnswers: 0, attempts: 0,
    };
    v1.reviewCards['review-l1-topic-copula'] = stale;
    const originalV1 = JSON.stringify(v1);
    const values = new Map<string, string>([[V1_STUDY_STORAGE_KEY, originalV1]]);
    const storage = {
      getItem: async (key: string) => values.get(key) ?? null,
      setItem: async (key: string, value: string) => { values.set(key, value); },
    };

    const result = await hydrateAppStateV2({
      storage,
      lessons,
      now: new Date('2026-07-19T00:00:00.000Z'),
    });
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') throw new Error(result.message);
    expect(result.source).toBe('v1');
    expect(result.state.reviewCards[stale.id]).toMatchObject({
      prompt: 'A は B です',
      answer: '“As for A, it is B.”',
      supportingText: 'Make a noun the topic, then identify it',
      dueAt: stale.dueAt,
      intervalDays: stale.intervalDays,
      repetitions: stale.repetitions,
      ease: stale.ease,
      lastReviewedAt: stale.lastReviewedAt,
    });
    expect(values.get(V1_STUDY_STORAGE_KEY)).toBe(originalV1);
  });

  it('migrates the frozen V1 once, verifies V2, and never writes or removes V1', async () => {
    const originalV1 = JSON.stringify(v1Fixture);
    const storage = memoryStorage({ [V1_STUDY_STORAGE_KEY]: originalV1 });

    const result = await hydrateAppStateV2({ storage, lessons, now });

    expect(result).toMatchObject({ status: 'ready', source: 'v1' });
    expect(storage.calls).toEqual([
      ['get', V2_APP_STATE_STORAGE_KEY],
      ['get', V1_STUDY_STORAGE_KEY],
      ['set', V2_APP_STATE_STORAGE_KEY],
      ['get', V2_APP_STATE_STORAGE_KEY],
    ]);
    expect(storage.setCalls).toHaveLength(1);
    expect(storage.setCalls[0]?.[0]).toBe(V2_APP_STATE_STORAGE_KEY);
    expect(storage.values[V1_STUDY_STORAGE_KEY]).toBe(originalV1);
    if (result.status !== 'ready') throw new Error('expected ready');
    expect(result.state).toMatchObject({ schemaVersion: 2, authoredBaselineVersion: AUTHORED_BASELINE_VERSION });
    expect(result.state.vocabulary).toEqual(emptyVocabularyOverrides());
    expect(result.state.lastImportRecovery).toBeUndefined();
  });

  it('refreshes stale frozen vocabulary and grammar presentation but preserves their schedules', async () => {
    const result = await hydrateFrozenV1();
    if (result.status !== 'ready') throw new Error('expected ready');

    const vocabulary = result.state.reviewCards['review-l1-v01']!;
    const grammar = result.state.reviewCards['review-l1-topic-copula']!;
    expect(vocabulary.prompt).toBe(lessons[0]?.vocabulary[0]?.japanese);
    expect(vocabulary.supportingText).toContain(lessons[0]?.vocabulary[0]?.reading);
    expect(grammar.prompt).toBe(lessons[0]?.grammar[0]?.pattern);
    expect(grammar.prompt).not.toContain('STALE V1');
    expect(pickSchedule(vocabulary)).toEqual(pickSchedule(v1Fixture.reviewCards['review-l1-v01']));
    expect(pickSchedule(grammar)).toEqual(pickSchedule(v1Fixture.reviewCards['review-l1-topic-copula']));
  });

  it('creates and verifies one empty V2 when neither key exists', async () => {
    const storage = memoryStorage();

    const result = await hydrateAppStateV2({ storage, lessons, now });

    expect(result).toEqual({ status: 'ready', source: 'empty', state: validV2() });
    expect(storage.calls).toEqual([
      ['get', V2_APP_STATE_STORAGE_KEY],
      ['get', V1_STUDY_STORAGE_KEY],
      ['set', V2_APP_STATE_STORAGE_KEY],
      ['get', V2_APP_STATE_STORAGE_KEY],
    ]);
    expect(storage.setCalls).toHaveLength(1);
  });

  it('loads unchanged valid V2 without a write and never reads V1', async () => {
    const state = validV2();
    const storage = memoryStorage({
      [V2_APP_STATE_STORAGE_KEY]: JSON.stringify(state),
      [V1_STUDY_STORAGE_KEY]: JSON.stringify(v1Fixture),
    });

    const result = await hydrateAppStateV2({ storage, lessons, now });

    expect(result).toEqual({ status: 'ready', source: 'v2', state });
    expect(storage.calls).toEqual([['get', V2_APP_STATE_STORAGE_KEY]]);
    expect(storage.getCalls).not.toContain(V1_STUDY_STORAGE_KEY);
    expect(storage.setCalls).toEqual([]);
  });

  it('reconciles stale V2 content and baseline version, then writes and verifies exactly once', async () => {
    const authoredWord = lessons[0]!.vocabulary[0]!;
    const staleCard: ReviewCard = {
      id: `review-${authoredWord.id}`,
      lessonId: lessons[0]!.id,
      kind: 'vocabulary',
      prompt: 'STALE V2 PROMPT',
      answer: 'STALE V2 ANSWER',
      dueAt: '2026-08-01T00:00:00.000Z',
      intervalDays: 8,
      repetitions: 4,
      ease: 2.3,
    };
    const state = validV2({
      authoredBaselineVersion: 'course-v1-stale',
      progress: {
        [lessons[0]!.id]: {
          lessonId: lessons[0]!.id,
          started: true,
          completedExerciseIds: [],
          correctAnswers: 0,
          attempts: 0,
        },
      },
      reviewCards: { [staleCard.id]: staleCard },
    });
    const storage = memoryStorage({ [V2_APP_STATE_STORAGE_KEY]: JSON.stringify(state) });

    const result = await hydrateAppStateV2({ storage, lessons, now });

    expect(result).toMatchObject({ status: 'ready', source: 'v2' });
    expect(storage.calls).toEqual([
      ['get', V2_APP_STATE_STORAGE_KEY],
      ['set', V2_APP_STATE_STORAGE_KEY],
      ['get', V2_APP_STATE_STORAGE_KEY],
    ]);
    if (result.status !== 'ready') throw new Error('expected ready');
    expect(result.state.authoredBaselineVersion).toBe(AUTHORED_BASELINE_VERSION);
    expect(result.state.reviewCards[staleCard.id]).toMatchObject({
      prompt: authoredWord.japanese,
      answer: authoredWord.english,
    });
    expect(pickSchedule(result.state.reviewCards[staleCard.id]!)).toEqual(pickSchedule(staleCard));
  });

  it('preserves JSON-compatible unknown top-level V2 fields without causing a write', async () => {
    const stored = { ...validV2(), futureEnvelopeField: { enabled: true } };
    const storage = memoryStorage({ [V2_APP_STATE_STORAGE_KEY]: JSON.stringify(stored) });

    const result = await hydrateAppStateV2({ storage, lessons, now });

    expect(result).toMatchObject({ status: 'ready', source: 'v2', state: { futureEnvelopeField: { enabled: true } } });
    expect(storage.setCalls).toEqual([]);
  });

  it('rejects V2 whose missing top-level field is supplied by Object.prototype', async () => {
    const { schemaVersion: _missing, ...missingSchemaVersion } = validV2();
    const storage = memoryStorage({
      [V2_APP_STATE_STORAGE_KEY]: JSON.stringify(missingSchemaVersion),
    });

    await withPrototypeProperty(Object.prototype, 'schemaVersion', 2, async () => {
      const result = await hydrateAppStateV2({ storage, lessons, now });

      expect(result).toMatchObject({ status: 'recovery', reason: 'invalid-v2' });
      expect(storage.calls).toEqual([['get', V2_APP_STATE_STORAGE_KEY]]);
      expect(storage.setCalls).toEqual([]);
    });
  });

  it('rejects V1 whose missing nested field is supplied by Object.prototype', async () => {
    const { started: _missing, ...missingStarted } = {
      lessonId: 'lesson-01',
      started: true,
      completedExerciseIds: [],
      correctAnswers: 0,
      attempts: 0,
    };
    const storage = memoryStorage({
      [V1_STUDY_STORAGE_KEY]: JSON.stringify({
        progress: { 'lesson-01': missingStarted },
        reviewCards: {},
      }),
    });

    await withPrototypeProperty(Object.prototype, 'started', true, async () => {
      const result = await hydrateAppStateV2({ storage, lessons, now });

      expect(result).toMatchObject({ status: 'recovery', reason: 'invalid-v1' });
      expect(storage.calls).toEqual([
        ['get', V2_APP_STATE_STORAGE_KEY],
        ['get', V1_STUDY_STORAGE_KEY],
      ]);
      expect(storage.setCalls).toEqual([]);
    });
  });

  it.each(['v2', 'v1'] as const)('rejects %s negative zero before any normalizing write', async (version) => {
    const progressWithZero = {
      'lesson-01': {
        lessonId: 'lesson-01',
        started: false,
        completedExerciseIds: [],
        correctAnswers: 0,
        attempts: 0,
      },
    };
    const text = version === 'v2'
      ? JSON.stringify(validV2({ authoredBaselineVersion: 'course-v1-stale', progress: progressWithZero }))
      : JSON.stringify({ progress: progressWithZero, reviewCards: {} });
    const negativeZeroText = text.replace('"attempts":0', '"attempts":-0');
    const storage = memoryStorage({
      [version === 'v2' ? V2_APP_STATE_STORAGE_KEY : V1_STUDY_STORAGE_KEY]: negativeZeroText,
    });

    const result = await hydrateAppStateV2({ storage, lessons, now });

    expect(result).toMatchObject({
      status: 'recovery',
      reason: version === 'v2' ? 'invalid-v2' : 'invalid-v1',
    });
    expect(storage.setCalls).toEqual([]);
  });

  it('rejects parsed arrays when Array.prototype has a toJSON hook', async () => {
    const storage = memoryStorage({
      [V2_APP_STATE_STORAGE_KEY]: JSON.stringify(validV2({
        progress: {
          'lesson-01': {
            lessonId: 'lesson-01',
            started: false,
            completedExerciseIds: [],
            correctAnswers: 0,
            attempts: 0,
          },
        },
      })),
    });

    await withPrototypeProperty(Array.prototype, 'toJSON', () => ['replaced'], async () => {
      const result = await hydrateAppStateV2({ storage, lessons, now });

      expect(result).toMatchObject({ status: 'recovery', reason: 'invalid-v2' });
      expect(storage.setCalls).toEqual([]);
    });
  });

  it.each([
    ['invalid-v2' as const, { [V2_APP_STATE_STORAGE_KEY]: '{not json' }],
    ['invalid-v2' as const, { [V2_APP_STATE_STORAGE_KEY]: JSON.stringify({ ...validV2(), schemaVersion: 1 }) }],
    ['invalid-v1' as const, { [V1_STUDY_STORAGE_KEY]: '{not json' }],
    ['invalid-v1' as const, { [V1_STUDY_STORAGE_KEY]: JSON.stringify({ progress: [], reviewCards: {} }) }],
  ])('returns recovery for %s data without a write', async (reason, initial) => {
    const storage = memoryStorage(initial);

    const result = await hydrateAppStateV2({ storage, lessons, now });

    expect(result).toMatchObject({ status: 'recovery', reason });
    expect(result.status === 'recovery' && result.message.length).toBeGreaterThan(0);
    expect(storage.setCalls).toEqual([]);
    if (reason === 'invalid-v2') {
      expect(storage.calls).toEqual([['get', V2_APP_STATE_STORAGE_KEY]]);
      expect(storage.getCalls).not.toContain(V1_STUDY_STORAGE_KEY);
    }
  });

  it('returns read-failed immediately when the V2 read rejects', async () => {
    const storage = memoryStorage({}, { failGetCalls: [1] });

    const result = await hydrateAppStateV2({ storage, lessons, now });

    expect(result).toMatchObject({ status: 'recovery', reason: 'read-failed' });
    expect(storage.calls).toEqual([['get', V2_APP_STATE_STORAGE_KEY]]);
    expect(storage.setCalls).toEqual([]);
  });

  it('returns read-failed when the V1 read rejects after an absent V2', async () => {
    const storage = memoryStorage({}, { failGetCalls: [2] });

    const result = await hydrateAppStateV2({ storage, lessons, now });

    expect(result).toMatchObject({ status: 'recovery', reason: 'read-failed' });
    expect(storage.calls).toEqual([
      ['get', V2_APP_STATE_STORAGE_KEY],
      ['get', V1_STUDY_STORAGE_KEY],
    ]);
    expect(storage.setCalls).toEqual([]);
  });

  it('returns write-failed without publishing defaults or attempting verification', async () => {
    const storage = memoryStorage({}, { failWrite: true });

    const result = await hydrateAppStateV2({ storage, lessons, now });

    expect(result).toMatchObject({ status: 'recovery', reason: 'write-failed' });
    expect(storage.calls).toEqual([
      ['get', V2_APP_STATE_STORAGE_KEY],
      ['get', V1_STUDY_STORAGE_KEY],
      ['set', V2_APP_STATE_STORAGE_KEY],
    ]);
  });

  it.each([
    ['missing', null],
    ['invalid-json', '{not json'],
    ['invalid-v2', JSON.stringify({ ...validV2(), schemaVersion: 1 })],
    ['valid-but-deeply-different', JSON.stringify(validV2({ authoredBaselineVersion: 'course-v1-other' }))],
  ])('returns verification-failed for a %s read-back without publishing state', async (_kind, readback) => {
    const storage = memoryStorage({}, { afterSetReadback: readback });

    const result = await hydrateAppStateV2({ storage, lessons, now });

    expect(result).toMatchObject({ status: 'recovery', reason: 'verification-failed' });
    expect(storage.calls).toEqual([
      ['get', V2_APP_STATE_STORAGE_KEY],
      ['get', V1_STUDY_STORAGE_KEY],
      ['set', V2_APP_STATE_STORAGE_KEY],
      ['get', V2_APP_STATE_STORAGE_KEY],
    ]);
  });

  it('returns verification-failed when the immediate read-back rejects', async () => {
    const storage = memoryStorage({}, { failGetCalls: [3] });

    const result = await hydrateAppStateV2({ storage, lessons, now });

    expect(result).toMatchObject({ status: 'recovery', reason: 'verification-failed' });
    expect(storage.calls).toEqual([
      ['get', V2_APP_STATE_STORAGE_KEY],
      ['get', V1_STUDY_STORAGE_KEY],
      ['set', V2_APP_STATE_STORAGE_KEY],
      ['get', V2_APP_STATE_STORAGE_KEY],
    ]);
  });

  it('deep-verifies an equivalent read-back even when object key order differs', async () => {
    const equivalentWithDifferentOrder = JSON.stringify({
      vocabulary: emptyVocabularyOverrides(),
      reviewCards: {},
      progress: {},
      authoredBaselineVersion: AUTHORED_BASELINE_VERSION,
      schemaVersion: 2,
    });
    const storage = memoryStorage({}, { afterSetReadback: equivalentWithDifferentOrder });

    const result = await hydrateAppStateV2({ storage, lessons, now });

    expect(result).toEqual({ status: 'ready', source: 'empty', state: validV2() });
  });

  it('does not publish reconciled V2 when its required verification fails', async () => {
    const stale = validV2({ authoredBaselineVersion: 'course-v1-stale' });
    const storage = memoryStorage(
      { [V2_APP_STATE_STORAGE_KEY]: JSON.stringify(stale) },
      { afterSetReadback: JSON.stringify(stale) },
    );

    const result = await hydrateAppStateV2({ storage, lessons, now });

    expect(result).toMatchObject({ status: 'recovery', reason: 'verification-failed' });
    expect(storage.calls).toEqual([
      ['get', V2_APP_STATE_STORAGE_KEY],
      ['set', V2_APP_STATE_STORAGE_KEY],
      ['get', V2_APP_STATE_STORAGE_KEY],
    ]);
  });
});
