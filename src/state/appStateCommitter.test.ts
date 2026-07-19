import { describe, expect, it } from 'vitest';

import { PersistedAppStateV2 } from '../models/appState';
import { emptyVocabularyOverrides } from '../models/vocabulary';
import {
  createActionLock,
  createAppStateCommitter,
  createSingleFlight,
} from './appStateCommitter';

const initialState = (): PersistedAppStateV2 => ({
  schemaVersion: 2,
  authoredBaselineVersion: 'baseline',
  progress: {
    'lesson-01': {
      lessonId: 'lesson-01',
      started: true,
      completedExerciseIds: [],
      correctAnswers: 0,
      attempts: 0,
    },
  },
  reviewCards: {},
  vocabulary: emptyVocabularyOverrides(),
});

const deferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const readAttempts = (state: PersistedAppStateV2) =>
  state.progress['lesson-01']?.attempts ?? 0;

const incrementAttempts = (current: PersistedAppStateV2): PersistedAppStateV2 => ({
  ...current,
  progress: {
    ...current.progress,
    'lesson-01': {
      ...current.progress['lesson-01']!,
      attempts: readAttempts(current) + 1,
    },
  },
});

const createHarness = ({
  events = [],
  firstWrite,
  failure,
  failFirstWriteOnly = false,
}: {
  events?: string[];
  firstWrite?: ReturnType<typeof deferred<void>>;
  failure?: 'validation' | 'write';
  failFirstWriteOnly?: boolean;
} = {}) => {
  let published = initialState();
  let rawStored = JSON.stringify(published);
  let writeCount = 0;
  const persisted: PersistedAppStateV2[] = [];

  const committer = createAppStateCommitter({
    getCurrent: () => published,
    validate: (candidate) => {
      const state = candidate as PersistedAppStateV2;
      events.push(`validate:${state.authoredBaselineVersion}`);
      if (failure === 'validation') throw new Error('validation failed');
      return state;
    },
    persist: async (candidate) => {
      writeCount += 1;
      events.push(`persist:${candidate.authoredBaselineVersion}`);
      persisted.push(candidate);
      if (failure === 'write' || (failFirstWriteOnly && writeCount === 1)) {
        throw new Error('write failed');
      }
      if (writeCount === 1 && firstWrite) await firstWrite.promise;
      rawStored = JSON.stringify(candidate);
    },
    publish: (candidate) => {
      events.push(`publish:${candidate.authoredBaselineVersion}`);
      published = candidate;
    },
  });

  return {
    commit: committer.commit,
    current: () => published,
    events,
    persisted,
    get rawStored() {
      return rawStored;
    },
  };
};

describe('createAppStateCommitter', () => {
  it('validates and persists before publishing', async () => {
    const events: string[] = [];
    const committer = createHarness({ events });
    const result = await committer.commit((current) => ({
      ...current,
      authoredBaselineVersion: 'next',
    }));
    expect(result.ok).toBe(true);
    expect(events).toEqual(['validate:next', 'persist:next', 'publish:next']);
  });

  it('serializes concurrent transitions so the second sees the first published state', async () => {
    const firstWrite = deferred<void>();
    const harness = createHarness({ firstWrite });
    const first = harness.commit(incrementAttempts);
    const second = harness.commit(incrementAttempts);
    await Promise.resolve();
    expect(harness.persisted).toHaveLength(1);
    firstWrite.resolve();
    await expect(first).resolves.toMatchObject({ ok: true });
    await expect(second).resolves.toMatchObject({ ok: true });
    expect(harness.persisted.map(readAttempts)).toEqual([1, 2]);
    expect(readAttempts(harness.current())).toBe(2);
  });

  it.each(['validation', 'write'] as const)(
    'leaves persisted and published state unchanged on %s failure',
    async (failure) => {
      const harness = createHarness({ failure });
      const beforePersisted = harness.rawStored;
      const beforePublished = harness.current();
      await expect(harness.commit(incrementAttempts)).resolves.toMatchObject({ ok: false });
      expect(harness.rawStored).toBe(beforePersisted);
      expect(harness.current()).toBe(beforePublished);
    },
  );

  it('continues the queue after a failed transition', async () => {
    const harness = createHarness({ failFirstWriteOnly: true });
    await harness.commit(incrementAttempts);
    await harness.commit(incrementAttempts);
    expect(readAttempts(harness.current())).toBe(1);
  });
});

describe('createSingleFlight', () => {
  it('shares one in-flight operation across concurrent callers', async () => {
    const release = deferred<void>();
    let calls = 0;
    const run = createSingleFlight(async () => {
      calls += 1;
      await release.promise;
      return calls;
    });

    const first = run();
    const second = run();

    expect(second).toBe(first);
    await Promise.resolve();
    expect(calls).toBe(1);
    release.resolve();
    await expect(first).resolves.toBe(1);
  });

  it.each(['success', 'failure'] as const)(
    'allows a new operation after prior %s',
    async (outcome) => {
      let calls = 0;
      const run = createSingleFlight(async () => {
        calls += 1;
        if (outcome === 'failure' && calls === 1) throw new Error('first failed');
        return calls;
      });

      if (outcome === 'failure') await expect(run()).rejects.toThrow('first failed');
      else await expect(run()).resolves.toBe(1);

      await expect(run()).resolves.toBe(2);
    },
  );
});

describe('createActionLock', () => {
  it('rejects a same-tick duplicate without invoking a second commit or advance', async () => {
    const save = deferred<boolean>();
    const lock = createActionLock();
    let commits = 0;
    let advances = 0;
    const invoke = () => lock.tryRun(async () => {
      commits += 1;
      if (await save.promise) advances += 1;
    });

    const first = invoke();
    const duplicate = invoke();

    expect(first).not.toBeNull();
    expect(duplicate).toBeNull();
    expect(commits).toBe(1);
    save.resolve(true);
    await first;
    expect(commits).toBe(1);
    expect(advances).toBe(1);
  });

  it.each(['success', 'failed commit result', 'throw'] as const)(
    'releases after action %s',
    async (outcome) => {
      const lock = createActionLock();
      const first = lock.tryRun(async () => {
        if (outcome === 'throw') throw new Error('action failed');
        return outcome === 'success' ? { ok: true } : { ok: false };
      });

      expect(first).not.toBeNull();
      if (outcome === 'throw') await expect(first).rejects.toThrow('action failed');
      else await expect(first).resolves.toEqual({ ok: outcome === 'success' });

      const next = lock.tryRun(async () => 'retried');
      await expect(next).resolves.toBe('retried');
    },
  );
});
