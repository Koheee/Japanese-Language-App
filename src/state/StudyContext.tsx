import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react';

import { getLesson } from '../data/lessons';
import { LessonProgress, ReviewRating, StudyState } from '../models/review';
import { buildReviewCards, getDueCards, scheduleReview } from '../services/srs';

const STORAGE_KEY = '@nihongo-path/study-state/v1';

const initialState: StudyState = {
  hydrated: false,
  progress: {},
  reviewCards: {},
};

type Action =
  | { type: 'hydrate'; payload: Omit<StudyState, 'hydrated'> }
  | { type: 'start-lesson'; lessonId: string }
  | { type: 'record-exercise'; lessonId: string; exerciseId: string; correct: boolean }
  | { type: 'rate-review'; cardId: string; rating: ReviewRating };

const createProgress = (lessonId: string): LessonProgress => ({
  lessonId,
  started: true,
  completedExerciseIds: [],
  correctAnswers: 0,
  attempts: 0,
});

const reducer = (state: StudyState, action: Action): StudyState => {
  if (action.type === 'hydrate') {
    return { ...action.payload, hydrated: true };
  }

  if (action.type === 'start-lesson') {
    const lesson = getLesson(action.lessonId);
    if (!lesson) return state;

    const nextCards = { ...state.reviewCards };
    buildReviewCards(lesson).forEach((card) => {
      if (!nextCards[card.id]) nextCards[card.id] = card;
    });

    return {
      ...state,
      progress: {
        ...state.progress,
        [action.lessonId]: state.progress[action.lessonId] ?? createProgress(action.lessonId),
      },
      reviewCards: nextCards,
    };
  }

  if (action.type === 'record-exercise') {
    const current = state.progress[action.lessonId] ?? createProgress(action.lessonId);
    const firstCompletion = !current.completedExerciseIds.includes(action.exerciseId);
    return {
      ...state,
      progress: {
        ...state.progress,
        [action.lessonId]: {
          ...current,
          completedExerciseIds: firstCompletion
            ? [...current.completedExerciseIds, action.exerciseId]
            : current.completedExerciseIds,
          correctAnswers: current.correctAnswers + (action.correct ? 1 : 0),
          attempts: current.attempts + 1,
        },
      },
    };
  }

  const card = state.reviewCards[action.cardId];
  if (!card) return state;
  return {
    ...state,
    reviewCards: {
      ...state.reviewCards,
      [card.id]: scheduleReview(card, action.rating),
    },
  };
};

interface StudyContextValue {
  state: StudyState;
  dueCards: ReturnType<typeof getDueCards>;
  startLesson: (lessonId: string) => void;
  recordExercise: (lessonId: string, exerciseId: string, correct: boolean) => void;
  rateReview: (cardId: string, rating: ReviewRating) => void;
  getProgress: (lessonId: string) => LessonProgress | undefined;
}

const StudyContext = createContext<StudyContextValue | null>(null);

export function StudyProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        const parsed = saved ? (JSON.parse(saved) as Omit<StudyState, 'hydrated'>) : null;
        dispatch({
          type: 'hydrate',
          payload: parsed ?? { progress: {}, reviewCards: {} },
        });
      })
      .catch(() => dispatch({ type: 'hydrate', payload: { progress: {}, reviewCards: {} } }));
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    const { hydrated: _hydrated, ...persisted } = state;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persisted)).catch(() => {
      // Progress remains usable in memory if device storage is unavailable.
    });
  }, [state]);

  const startLesson = useCallback((lessonId: string) => {
    dispatch({ type: 'start-lesson', lessonId });
  }, []);

  const recordExercise = useCallback(
    (lessonId: string, exerciseId: string, correct: boolean) => {
      dispatch({ type: 'record-exercise', lessonId, exerciseId, correct });
    },
    [],
  );

  const rateReview = useCallback((cardId: string, rating: ReviewRating) => {
    dispatch({ type: 'rate-review', cardId, rating });
  }, []);

  const value = useMemo<StudyContextValue>(
    () => ({
      state,
      dueCards: getDueCards(state.reviewCards),
      startLesson,
      recordExercise,
      rateReview,
      getProgress: (lessonId) => state.progress[lessonId],
    }),
    [rateReview, recordExercise, startLesson, state],
  );

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
}

export const useStudy = () => {
  const context = useContext(StudyContext);
  if (!context) throw new Error('useStudy must be used inside StudyProvider');
  return context;
};
