export type ReviewKind = 'vocabulary' | 'grammar';
export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

export interface ReviewCard {
  id: string;
  lessonId: string;
  kind: ReviewKind;
  prompt: string;
  answer: string;
  supportingText?: string;
  dueAt: string;
  intervalDays: number;
  repetitions: number;
  ease: number;
  lastReviewedAt?: string;
}

export interface LessonProgress {
  lessonId: string;
  started: boolean;
  completedExerciseIds: string[];
  correctAnswers: number;
  attempts: number;
}

export interface StudyState {
  hydrated: boolean;
  progress: Record<string, LessonProgress>;
  reviewCards: Record<string, ReviewCard>;
}
