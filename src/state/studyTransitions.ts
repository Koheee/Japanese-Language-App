import { PersistedAppStateV2 } from '../models/appState';
import { Lesson } from '../models/content';
import { LessonProgress, ReviewRating } from '../models/review';
import { reconcileReviewCards } from '../services/reconcileReviewCards';
import { scheduleReview } from '../services/srs';

const createProgress = (lessonId: string): LessonProgress => ({
  lessonId,
  started: true,
  completedExerciseIds: [],
  correctAnswers: 0,
  attempts: 0,
});

export const buildStartLessonState = (
  current: PersistedAppStateV2,
  lessonId: string,
  lessons: readonly Lesson[],
  now = new Date(),
): PersistedAppStateV2 => {
  if (!lessons.some((lesson) => lesson.id === lessonId)) return current;

  const existing = current.progress[lessonId];
  const lessonProgress = existing
    ? { ...existing, started: true }
    : createProgress(lessonId);
  const progress = existing?.started === true
    ? current.progress
    : { ...current.progress, [lessonId]: lessonProgress };

  return {
    ...current,
    progress,
    reviewCards: reconcileReviewCards({
      lessons,
      progress,
      reviewCards: current.reviewCards,
      vocabulary: current.vocabulary,
      now,
    }),
  };
};

export const buildRecordExerciseState = (
  current: PersistedAppStateV2,
  lessonId: string,
  exerciseId: string,
  correct: boolean,
): PersistedAppStateV2 => {
  const progress = current.progress[lessonId] ?? createProgress(lessonId);
  const firstCompletion = !progress.completedExerciseIds.includes(exerciseId);

  return {
    ...current,
    progress: {
      ...current.progress,
      [lessonId]: {
        ...progress,
        completedExerciseIds: firstCompletion
          ? [...progress.completedExerciseIds, exerciseId]
          : progress.completedExerciseIds,
        correctAnswers: progress.correctAnswers + (correct ? 1 : 0),
        attempts: progress.attempts + 1,
      },
    },
  };
};

export const buildRateReviewState = (
  current: PersistedAppStateV2,
  cardId: string,
  rating: ReviewRating,
  reviewedAt = new Date(),
): PersistedAppStateV2 => {
  const card = current.reviewCards[cardId];
  if (!card) return current;

  const reviewCards = {
    ...current.reviewCards,
    [cardId]: scheduleReview(card, rating, reviewedAt),
  };

  if (current.lastImportRecovery?.affectedReviewCardIds.includes(cardId)) {
    const { lastImportRecovery: _lastImportRecovery, ...withoutRecovery } = current;
    return { ...withoutRecovery, reviewCards };
  }

  return { ...current, reviewCards };
};
