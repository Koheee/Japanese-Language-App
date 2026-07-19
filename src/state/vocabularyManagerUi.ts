import { VocabularyUndoToken } from '../services/vocabularyMutations';

export interface VocabularyManagerUiState {
  view: 'active' | 'hidden';
  draftQuery: string;
  appliedQuery: string;
  undoToken: VocabularyUndoToken | null;
}

export type VocabularyManagerUiAction =
  | { type: 'set-view'; view: VocabularyManagerUiState['view'] }
  | { type: 'set-draft-query'; query: string }
  | { type: 'commit-query'; query: string }
  | { type: 'reversible-mutation-succeeded'; token: VocabularyUndoToken }
  | { type: 'non-reversible-mutation-succeeded' }
  | { type: 'undo-succeeded' }
  | { type: 'route-blurred' };

export const initialVocabularyManagerUiState: VocabularyManagerUiState = {
  view: 'active',
  draftQuery: '',
  appliedQuery: '',
  undoToken: null,
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
      return { ...state, undoToken: action.token };
    case 'non-reversible-mutation-succeeded':
    case 'undo-succeeded':
    case 'route-blurred':
      return state.undoToken === null ? state : { ...state, undoToken: null };
    default:
      return state;
  }
};
