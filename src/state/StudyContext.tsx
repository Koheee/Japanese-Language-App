import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { AUTHORED_BASELINE_VERSION } from '../data/authoredBaseline';
import { lessons } from '../data/lessons';
import { PersistedAppStateV2 } from '../models/appState';
import { LessonProgress, ReviewCard, ReviewRating } from '../models/review';
import { emptyVocabularyOverrides } from '../models/vocabulary';
import { hydrateAppStateV2, writeAppStateV2 } from '../services/appStateStorage';
import { validatePersistedAppStateV2 } from '../services/appStateValidation';
import { getDueCards } from '../services/srs';
import {
  AppStateCommitter,
  CommitResult,
  createAppStateCommitter,
  createSingleFlight,
} from './appStateCommitter';
import {
  buildRateReviewState,
  buildRecordExerciseState,
  buildStartLessonState,
} from './studyTransitions';

type HydrationStatus = 'loading' | 'ready' | 'recovery';

interface StudyContextValue {
  hydrationStatus: HydrationStatus;
  hydrationMessage: string | null;
  state: PersistedAppStateV2;
  storageError: string | null;
  dueCards: ReviewCard[];
  retryHydration: () => Promise<void>;
  commitAppState: AppStateCommitter['commit'];
  startLesson: (lessonId: string) => Promise<CommitResult>;
  recordExercise: (
    lessonId: string,
    exerciseId: string,
    correct: boolean,
  ) => Promise<CommitResult>;
  rateReview: (cardId: string, rating: ReviewRating) => Promise<CommitResult>;
  getProgress: (lessonId: string) => LessonProgress | undefined;
}

const emptyState = (): PersistedAppStateV2 => ({
  schemaVersion: 2,
  authoredBaselineVersion: AUTHORED_BASELINE_VERSION,
  progress: {},
  reviewCards: {},
  vocabulary: emptyVocabularyOverrides(),
});

const StudyContext = createContext<StudyContextValue | null>(null);

export function StudyProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<PersistedAppStateV2>(emptyState);
  const [hydrationStatus, setHydrationStatus] = useState<HydrationStatus>('loading');
  const [hydrationMessage, setHydrationMessage] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const stateRef = useRef(state);
  const committerRef = useRef<AppStateCommitter | null>(null);
  const mountedRef = useRef(false);

  const publish = useCallback((candidate: PersistedAppStateV2) => {
    stateRef.current = candidate;
    if (!mountedRef.current) return;
    setState(candidate);
    setStorageError(null);
  }, []);

  const createCommitter = useCallback(() => createAppStateCommitter({
    getCurrent: () => stateRef.current,
    validate: (candidate) => {
      const validation = validatePersistedAppStateV2(candidate);
      if (!validation.ok) throw new Error(`${validation.path}: ${validation.message}`);
      return validation.value;
    },
    persist: (candidate) => writeAppStateV2(AsyncStorage, candidate),
    publish,
  }), [publish]);

  const performHydration = useCallback(async () => {
    committerRef.current = null;
    if (mountedRef.current) {
      setHydrationStatus('loading');
      setHydrationMessage(null);
    }

    let result: Awaited<ReturnType<typeof hydrateAppStateV2>>;
    try {
      result = await hydrateAppStateV2({ storage: AsyncStorage, lessons });
    } catch (cause) {
      if (!mountedRef.current) return;
      setHydrationMessage(cause instanceof Error ? cause.message : String(cause));
      setHydrationStatus('recovery');
      return;
    }
    if (!mountedRef.current) return;

    if (result.status === 'recovery') {
      committerRef.current = null;
      setHydrationMessage(result.message);
      setHydrationStatus('recovery');
      return;
    }

    committerRef.current = createCommitter();
    publish(result.state);
    setHydrationMessage(null);
    setHydrationStatus('ready');
  }, [createCommitter, publish]);

  const runHydration = useMemo(
    () => createSingleFlight(performHydration),
    [performHydration],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      committerRef.current = null;
    };
  }, []);

  useEffect(() => {
    runHydration().catch((cause: unknown) => {
      if (!mountedRef.current) return;
      const message = cause instanceof Error ? cause.message : String(cause);
      setHydrationMessage(message);
      setHydrationStatus('recovery');
    });
  }, [runHydration]);

  const commitAppState = useCallback<AppStateCommitter['commit']>(async (transition) => {
    const committer = committerRef.current;
    if (!committer) {
      return { ok: false, error: new Error('Saved study state is not ready.') };
    }

    const result = await committer.commit(transition);
    if (!result.ok && mountedRef.current) setStorageError(result.error.message);
    return result;
  }, []);

  const retryHydration = useCallback(
    () => committerRef.current ? Promise.resolve() : runHydration(),
    [runHydration],
  );

  const startLesson = useCallback(
    (lessonId: string) => commitAppState(
      (current) => buildStartLessonState(current, lessonId, lessons),
    ),
    [commitAppState],
  );

  const recordExercise = useCallback(
    (lessonId: string, exerciseId: string, correct: boolean) => commitAppState(
      (current) => buildRecordExerciseState(current, lessonId, exerciseId, correct),
    ),
    [commitAppState],
  );

  const rateReview = useCallback(
    (cardId: string, rating: ReviewRating) => commitAppState(
      (current) => buildRateReviewState(current, cardId, rating),
    ),
    [commitAppState],
  );

  const dueCards = useMemo(() => getDueCards(state.reviewCards), [state.reviewCards]);
  const getProgress = useCallback(
    (lessonId: string) => state.progress[lessonId],
    [state.progress],
  );

  const value = useMemo<StudyContextValue>(
    () => ({
      hydrationStatus,
      hydrationMessage,
      state,
      storageError,
      dueCards,
      retryHydration,
      commitAppState,
      startLesson,
      recordExercise,
      rateReview,
      getProgress,
    }),
    [
      commitAppState,
      dueCards,
      getProgress,
      hydrationMessage,
      hydrationStatus,
      rateReview,
      recordExercise,
      retryHydration,
      startLesson,
      state,
      storageError,
    ],
  );

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
}

export const useStudy = () => {
  const context = useContext(StudyContext);
  if (!context) throw new Error('useStudy must be used inside StudyProvider');
  return context;
};
