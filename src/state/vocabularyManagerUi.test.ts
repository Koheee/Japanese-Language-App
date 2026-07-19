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
    });
  });

  it('replaces the previous token on the next hide/restore success', () => {
    const next = reduceVocabularyManagerUi(withUndo(), {
      type: 'reversible-mutation-succeeded',
      token: restoreToken,
    });
    expect(next.undoToken).toBe(restoreToken);
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
      'undoToken',
      'view',
    ]);
  });
});
