import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  createRouteUiLifecycleCoordinator,
  runRouteUiAction,
} from './routeUiLifecycle';

const deferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
};

describe('route UI lifecycle coordinator', () => {
  it.each([
    ['lesson start', 'unmount'],
    ['word create', 'blur'],
    ['word update', 'route removal'],
    ['exercise result setters', 'unmount'],
  ])('drops post-await UI effects for a slow %s after %s', async () => {
    const coordinator = createRouteUiLifecycleCoordinator();
    const persistence = deferred<{ ok: true }>();
    const applied: string[] = [];
    coordinator.activate();

    const action = runRouteUiAction(
      coordinator,
      () => persistence.promise,
      () => applied.push('navigation-or-state'),
    );
    coordinator.deactivate();
    persistence.resolve({ ok: true });
    await action;

    expect(applied).toEqual([]);
  });

  it('applies the latest fulfilled or rejected result while the route remains active', async () => {
    const coordinator = createRouteUiLifecycleCoordinator();
    const outcomes: string[] = [];
    coordinator.activate();

    await runRouteUiAction(
      coordinator,
      async () => 'saved',
      (outcome) => outcomes.push(outcome.status === 'fulfilled' ? outcome.value : 'error'),
    );
    await runRouteUiAction(
      coordinator,
      async () => { throw new Error('storage failed'); },
      (outcome) => outcomes.push(outcome.status === 'rejected' ? 'error' : outcome.value),
    );

    expect(outcomes).toEqual(['saved', 'error']);
  });

  it('does not revive an action that began while the route was inactive', async () => {
    const coordinator = createRouteUiLifecycleCoordinator();
    const persistence = deferred<string>();
    const applied: string[] = [];
    const action = runRouteUiAction(
      coordinator,
      () => persistence.promise,
      (outcome) => {
        if (outcome.status === 'fulfilled') applied.push(outcome.value);
      },
    );

    coordinator.activate();
    persistence.resolve('stale');
    await action;

    expect(applied).toEqual([]);
  });
});

describe('async persistence screen contracts', () => {
  it.each([
    'LessonDetailScreen.tsx',
    'WordEditorScreen.tsx',
    'ExerciseScreen.tsx',
  ])('routes post-await effects in %s through the lifecycle coordinator', (file) => {
    const source = readFileSync(join(import.meta.dirname, file), 'utf8');
    expect(source).toContain('useRouteUiLifecycle(navigation)');
    expect(source).toContain('runRouteUiAction(');
  });
});
