import { Lesson, VocabularyItem } from '../models/content';
import { LessonProgress, ReviewCard } from '../models/review';
import { VocabularyOverrides } from '../models/vocabulary';
import { resolveVocabularyLists } from './vocabularyResolver';

const REVIEW_PREFIX = 'review-';

export const vocabularyIdFromReviewCardId = (card: ReviewCard): string | undefined =>
  card.kind === 'vocabulary' && card.id.startsWith(REVIEW_PREFIX)
    ? card.id.slice(REVIEW_PREFIX.length)
    : undefined;

const newCard = (
  id: string,
  lessonId: string,
  kind: ReviewCard['kind'],
  prompt: string,
  answer: string,
  supportingText: string | undefined,
  now: Date,
): ReviewCard => ({
  id: `${REVIEW_PREFIX}${id}`,
  lessonId,
  kind,
  prompt,
  answer,
  ...(supportingText ? { supportingText } : {}),
  dueAt: now.toISOString(),
  intervalDays: 0,
  repetitions: 0,
  ease: 2.5,
  suspended: false,
});

const vocabularyPresentation = (item: VocabularyItem) => ({
  prompt: item.japanese,
  answer: item.english,
  supportingText: [item.reading, item.category ?? item.partOfSpeech].filter(Boolean).join(' · '),
});

const refreshCard = (
  card: ReviewCard,
  lessonId: string,
  kind: ReviewCard['kind'],
  prompt: string,
  answer: string,
  supportingText: string | undefined,
  suspended: boolean,
): ReviewCard => {
  if (
    card.lessonId === lessonId
    && card.kind === kind
    && card.prompt === prompt
    && card.answer === answer
    && card.supportingText === supportingText
    && card.suspended === suspended
  ) {
    return card;
  }

  return {
    ...card,
    lessonId,
    kind,
    prompt,
    answer,
    supportingText,
    suspended,
  };
};

export const reconcileReviewCards = ({
  lessons,
  progress,
  reviewCards,
  vocabulary,
  now = new Date(),
}: {
  lessons: readonly Lesson[];
  progress: Readonly<Record<string, LessonProgress>>;
  reviewCards: Readonly<Record<string, ReviewCard>>;
  vocabulary: VocabularyOverrides;
  now?: Date;
}): Record<string, ReviewCard> => {
  const reconciled = { ...reviewCards };

  for (const lesson of lessons) {
    if (progress[lesson.id]?.started !== true) continue;

    const currentCardIds = new Set<string>();
    const resolved = resolveVocabularyLists({ lesson, vocabulary });

    for (const { item } of resolved.active) {
      const cardId = `${REVIEW_PREFIX}${item.id}`;
      currentCardIds.add(cardId);
      const presentation = vocabularyPresentation(item);
      const existing = reconciled[cardId];
      reconciled[cardId] = existing
        ? refreshCard(existing, lesson.id, 'vocabulary', presentation.prompt, presentation.answer, presentation.supportingText, false)
        : newCard(item.id, lesson.id, 'vocabulary', presentation.prompt, presentation.answer, presentation.supportingText, now);
    }

    for (const { item } of resolved.hidden) {
      const cardId = `${REVIEW_PREFIX}${item.id}`;
      currentCardIds.add(cardId);
      const existing = reconciled[cardId];
      if (!existing) continue;

      const presentation = vocabularyPresentation(item);
      reconciled[cardId] = refreshCard(
        existing,
        lesson.id,
        'vocabulary',
        presentation.prompt,
        presentation.answer,
        presentation.supportingText,
        true,
      );
    }

    for (const item of lesson.grammar) {
      const cardId = `${REVIEW_PREFIX}${item.id}`;
      currentCardIds.add(cardId);
      const existing = reconciled[cardId];
      reconciled[cardId] = existing
        ? refreshCard(existing, lesson.id, 'grammar', item.pattern, item.plainEnglish, item.title, false)
        : newCard(item.id, lesson.id, 'grammar', item.pattern, item.plainEnglish, item.title, now);
    }

    for (const card of Object.values(reviewCards)) {
      if (card.lessonId !== lesson.id || currentCardIds.has(card.id) || card.suspended === true) continue;
      reconciled[card.id] = { ...card, suspended: true };
    }
  }

  return reconciled;
};
