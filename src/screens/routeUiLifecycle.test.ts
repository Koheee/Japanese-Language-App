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
  it('can initialize again after a development effect cleanup probe', async () => {
    const coordinator = createRouteUiLifecycleCoordinator();
    const applied: string[] = [];
    coordinator.remove();
    coordinator.mount();
    coordinator.activate();

    await runRouteUiAction(
      coordinator,
      async () => 'current',
      (outcome) => {
        if (outcome.status === 'fulfilled') applied.push(outcome.value);
      },
    );

    expect(applied).toEqual(['current']);
  });

  it.each([
    ['lesson start', 'unmount'],
    ['word update', 'route removal'],
    ['exercise result setters', 'unmount'],
  ])('drops result and cleanup effects for a slow %s after %s', async () => {
    const coordinator = createRouteUiLifecycleCoordinator();
    const persistence = deferred<{ ok: true }>();
    const applied: string[] = [];
    const cleanups: string[] = [];
    coordinator.activate();

    const action = runRouteUiAction(
      coordinator,
      () => persistence.promise,
      () => applied.push('navigation-or-state'),
      () => cleanups.push('busy-cleared'),
    );
    coordinator.remove();
    persistence.resolve({ ok: true });
    await action;

    expect(applied).toEqual([]);
    expect(cleanups).toEqual([]);
  });

  it.each([
    'lesson start',
    'exercise save',
    'word create',
    'word update',
  ])('clears busy state but drops stale %s results after blur, settle, and refocus', async () => {
    const coordinator = createRouteUiLifecycleCoordinator();
    const persistence = deferred<{ ok: true }>();
    const effects: string[] = [];
    coordinator.activate();

    const action = runRouteUiAction(
      coordinator,
      () => persistence.promise,
      () => effects.push('result-or-navigation'),
      () => effects.push('busy-cleared'),
    );
    coordinator.blur();
    persistence.resolve({ ok: true });
    await action;
    coordinator.activate();

    expect(effects).toEqual(['busy-cleared']);
  });

  it('applies the latest fulfilled or rejected result while the route remains active', async () => {
    const coordinator = createRouteUiLifecycleCoordinator();
    const outcomes: string[] = [];
    let cleanupCount = 0;
    coordinator.activate();

    await runRouteUiAction(
      coordinator,
      async () => 'saved',
      (outcome) => outcomes.push(outcome.status === 'fulfilled' ? outcome.value : 'error'),
      () => { cleanupCount += 1; },
    );
    await runRouteUiAction(
      coordinator,
      async () => { throw new Error('storage failed'); },
      (outcome) => outcomes.push(outcome.status === 'rejected' ? 'error' : outcome.value),
      () => { cleanupCount += 1; },
    );

    expect(outcomes).toEqual(['saved', 'error']);
    expect(cleanupCount).toBe(2);
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
    ['WordEditorScreen.tsx', '() => setIsSaving(false)'],
    ['ExerciseScreen.tsx', '() => setIsSaving(false)'],
  ])('splits mounted cleanup from route-current results in %s', (file, cleanup) => {
    const source = readFileSync(join(import.meta.dirname, file), 'utf8');
    expect(source).toContain('useRouteUiLifecycle(navigation)');
    expect(source).toContain('runRouteUiAction(');
    expect(source).toContain(cleanup);
    expect(source).toContain('createActionLock');
  });

  it('maps blur separately from terminal removal in the navigation hook', () => {
    const source = readFileSync(join(import.meta.dirname, 'useRouteUiLifecycle.ts'), 'utf8');
    expect(source).toContain('coordinator.mount()');
    expect(source).toContain('coordinator.blur');
    expect(source).toContain("navigation.addListener('beforeRemove', coordinator.remove)");
    expect(source).toContain('coordinator.remove()');
  });
});
