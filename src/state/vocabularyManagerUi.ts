import { VocabularyUndoToken } from '../services/vocabularyMutations';

export interface VocabularyManagerUiState {
  view: 'active' | 'hidden';
  draftQuery: string;
  appliedQuery: string;
  undoToken: VocabularyUndoToken | null;
  routeGeneration: number;
}

export type VocabularyManagerUiAction =
  | { type: 'set-view'; view: VocabularyManagerUiState['view'] }
  | { type: 'set-draft-query'; query: string }
  | { type: 'commit-query'; query: string }
  | {
    type: 'reversible-mutation-succeeded';
    token: VocabularyUndoToken;
    startedAtGeneration: number;
  }
  | { type: 'non-reversible-mutation-succeeded' }
  | { type: 'undo-succeeded' }
  | { type: 'undo-expired'; expectedVocabularyUpdatedAt: string }
  | { type: 'route-blurred' };

export const initialVocabularyManagerUiState: VocabularyManagerUiState = {
  view: 'active',
  draftQuery: '',
  appliedQuery: '',
  undoToken: null,
  routeGeneration: 0,
};

export const reduceVocabularyManagerUi = (
  state: VocabularyManagerUiState,
  action: VocabularyManagerUiAction,
): VocabularyManagerUiState => {
  switch (action.type) {
    case 'set-view':
      return state.view === action.view ? state : { ...state, view: action.view };
    case 'set-draft-query':
      return state.draftQuery === action.query ? state : { ...state, draftQuery: action.query };
    case 'commit-query':
      return state.appliedQuery === action.query ? state : { ...state, appliedQuery: action.query };
    case 'reversible-mutation-succeeded':
      if (action.startedAtGeneration !== state.routeGeneration) return state;
      return { ...state, undoToken: action.token };
    case 'non-reversible-mutation-succeeded':
    case 'undo-succeeded':
      return state.undoToken === null ? state : { ...state, undoToken: null };
    case 'undo-expired':
      return state.undoToken?.expectedVocabularyUpdatedAt === action.expectedVocabularyUpdatedAt
        ? { ...state, undoToken: null }
        : state;
    case 'route-blurred':
      return {
        ...state,
        undoToken: null,
        routeGeneration: state.routeGeneration + 1,
      };
    default:
      return state;
  }
};
