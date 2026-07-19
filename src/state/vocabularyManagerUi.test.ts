import { describe, expect, it } from 'vitest';

import { VocabularyUndoToken } from '../services/vocabularyMutations';
import {
  VocabularyManagerUiState,
  initialVocabularyManagerUiState,
  reduceVocabularyManagerUi,
} from './vocabularyManagerUi';

const hideToken: VocabularyUndoToken = {
  kind: 'restore',
  lessonId: 'lesson-01',
  vocabularyId: 'course-word',
  expectedVocabularyUpdatedAt: '2026-07-18T00:00:00.001Z',
};

const restoreToken: VocabularyUndoToken = {
  ...hideToken,
  kind: 'hide',
  expectedVocabularyUpdatedAt: '2026-07-18T00:00:00.002Z',
};

const withUndo = (): VocabularyManagerUiState => ({
  ...initialVocabularyManagerUiState,
  undoToken: hideToken,
});

describe('reduceVocabularyManagerUi', () => {
  it('starts without a reversible token and stores one only for a committed reversible success', () => {
    const queried = reduceVocabularyManagerUi(initialVocabularyManagerUiState, {
      type: 'set-draft-query',
      query: '学生',
    });
    expect(queried.undoToken).toBeNull();

    const succeeded = reduceVocabularyManagerUi(queried, {
      type: 'reversible-mutation-succeeded',
      token: hideToken,
      startedAtGeneration: 0,
    });
    expect(succeeded.undoToken).toBe(hideToken);
  });

  it('retains the current token across draft/applied query and view-only changes', () => {
    const drafted = reduceVocabularyManagerUi(withUndo(), {
      type: 'set-draft-query',
      query: 'teacher',
    });
    const committed = reduceVocabularyManagerUi(drafted, {
      type: 'commit-query',
      query: 'teacher',
    });
    const viewed = reduceVocabularyManagerUi(committed, { type: 'set-view', view: 'hidden' });

    expect(viewed).toEqual({
      view: 'hidden',
      draftQuery: 'teacher',
      appliedQuery: 'teacher',
      undoToken: hideToken,
      routeGeneration: 0,
    });
  });

  it('replaces the previous token on the next hide/restore success', () => {
    const next = reduceVocabularyManagerUi(withUndo(), {
      type: 'reversible-mutation-succeeded',
      token: restoreToken,
      startedAtGeneration: 0,
    });
    expect(next.undoToken).toBe(restoreToken);
  });

  it('publishes only a reversible success started in the current route generation', () => {
    const currentSuccess = reduceVocabularyManagerUi(initialVocabularyManagerUiState, {
      type: 'reversible-mutation-succeeded',
      token: hideToken,
      startedAtGeneration: 0,
    });
    expect(currentSuccess.undoToken).toBe(hideToken);

    const blurred = reduceVocabularyManagerUi(currentSuccess, { type: 'route-blurred' });
    const staleSuccess = reduceVocabularyManagerUi(blurred, {
      type: 'reversible-mutation-succeeded',
      token: restoreToken,
      startedAtGeneration: 0,
    });

    expect(blurred.routeGeneration).toBe(1);
    expect(staleSuccess.undoToken).toBeNull();
  });

  it('advances the route generation on every blur even without a current token', () => {
    const firstBlur = reduceVocabularyManagerUi(
      initialVocabularyManagerUiState,
      { type: 'route-blurred' },
    );
    const secondBlur = reduceVocabularyManagerUi(firstBlur, { type: 'route-blurred' });

    expect(firstBlur.routeGeneration).toBe(1);
    expect(secondBlur.routeGeneration).toBe(2);
    expect(secondBlur.undoToken).toBeNull();
  });

  it('expires the current token without invalidating an in-flight mutation on the same route', () => {
    const expired = reduceVocabularyManagerUi(withUndo(), {
      type: 'undo-expired',
      expectedVocabularyUpdatedAt: hideToken.expectedVocabularyUpdatedAt,
    });
    const laterSuccess = reduceVocabularyManagerUi(expired, {
      type: 'reversible-mutation-succeeded',
      token: restoreToken,
      startedAtGeneration: 0,
    });

    expect(expired).toMatchObject({ routeGeneration: 0, undoToken: null });
    expect(laterSuccess.undoToken).toBe(restoreToken);
  });

  it('does not let an older timer expire a replacement undo token', () => {
    const replaced = reduceVocabularyManagerUi(withUndo(), {
      type: 'reversible-mutation-succeeded',
      token: restoreToken,
      startedAtGeneration: 0,
    });
    const oldTimer = reduceVocabularyManagerUi(replaced, {
      type: 'undo-expired',
      expectedVocabularyUpdatedAt: hideToken.expectedVocabularyUpdatedAt,
    });
    const currentTimer = reduceVocabularyManagerUi(oldTimer, {
      type: 'undo-expired',
      expectedVocabularyUpdatedAt: restoreToken.expectedVocabularyUpdatedAt,
    });

    expect(oldTimer.undoToken).toBe(restoreToken);
    expect(currentTimer.undoToken).toBeNull();
  });

  it.each([
    { type: 'non-reversible-mutation-succeeded' } as const,
    { type: 'undo-succeeded' } as const,
    { type: 'route-blurred' } as const,
  ])('clears the token for $type', (action) => {
    expect(reduceVocabularyManagerUi(withUndo(), action).undoToken).toBeNull();
  });

  it('does not serialize or mutate any persisted study-state fields', () => {
    const next = reduceVocabularyManagerUi(withUndo(), { type: 'route-blurred' });
    expect(Object.keys(next).sort()).toEqual([
      'appliedQuery',
      'draftQuery',
      'routeGeneration',
      'undoToken',
      'view',
    ]);
  });
});
