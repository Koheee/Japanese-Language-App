import { Lesson } from '../models/content';
import { ReviewCard, ReviewRating } from '../models/review';

const MINIMUM_EASE = 1.3;
const MINUTES_PER_DAY = 24 * 60;

const addDays = (date: Date, days: number) =>
  new Date(date.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

export const scheduleReview = (
  card: ReviewCard,
  rating: ReviewRating,
  reviewedAt = new Date(),
): ReviewCard => {
  let intervalDays = card.intervalDays;
  let repetitions = card.repetitions;
  let ease = card.ease;

  if (rating === 'again') {
    intervalDays = 10 / MINUTES_PER_DAY;
    repetitions = 0;
    ease = Math.max(MINIMUM_EASE, ease - 0.2);
  } else if (rating === 'hard') {
    intervalDays = Math.max(1, Math.round(Math.max(card.intervalDays, 1) * 1.2));
    repetitions += 1;
    ease = Math.max(MINIMUM_EASE, ease - 0.15);
  } else if (rating === 'good') {
    intervalDays = repetitions === 0 ? 1 : repetitions === 1 ? 3 : Math.max(4, Math.round(card.intervalDays * ease));
    repetitions += 1;
  } else {
    intervalDays = repetitions === 0 ? 4 : Math.max(6, Math.round(card.intervalDays * ease * 1.3));
    repetitions += 1;
    ease += 0.15;
  }

  return {
    ...card,
    dueAt: addDays(reviewedAt, intervalDays),
    intervalDays,
    repetitions,
    ease,
    lastReviewedAt: reviewedAt.toISOString(),
  };
};

export const buildReviewCards = (
  lesson: Lesson,
  createdAt = new Date(),
): ReviewCard[] => {
  const dueAt = createdAt.toISOString();
  const vocabularyCards: ReviewCard[] = lesson.vocabulary.map((item) => ({
    id: `review-${item.id}`,
    lessonId: lesson.id,
    kind: 'vocabulary',
    prompt: item.japanese,
    answer: item.english,
    supportingText: `${item.reading} · ${item.partOfSpeech}`,
    dueAt,
    intervalDays: 0,
    repetitions: 0,
    ease: 2.5,
  }));

  const grammarCards: ReviewCard[] = lesson.grammar.map((item) => ({
    id: `review-${item.id}`,
    lessonId: lesson.id,
    kind: 'grammar',
    prompt: item.pattern,
    answer: item.plainEnglish,
    supportingText: item.title,
    dueAt,
    intervalDays: 0,
    repetitions: 0,
    ease: 2.5,
  }));

  return [...vocabularyCards, ...grammarCards];
};

export const getDueCards = (
  cards: Record<string, ReviewCard>,
  now = new Date(),
) =>
  Object.values(cards)
    .filter((card) => card.suspended !== true)
    .filter((card) => new Date(card.dueAt).getTime() <= now.getTime())
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));

export const getReviewStats = (cards: Record<string, ReviewCard>) => {
  const active = Object.values(cards).filter((card) => card.suspended !== true);
  return {
    activeTotal: active.length,
    reviewedActive: active.filter((card) => Boolean(card.lastReviewedAt)).length,
  };
};

export const formatInterval = (rating: ReviewRating, card: ReviewCard) => {
  const scheduled = scheduleReview(card, rating, new Date(0));
  if (scheduled.intervalDays < 1) return '10m';
  return `${Math.round(scheduled.intervalDays)}d`;
};
