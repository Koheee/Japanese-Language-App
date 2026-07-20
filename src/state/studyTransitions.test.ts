import { describe, expect, it } from 'vitest';

import { PersistedAppStateV2 } from '../models/appState';
import { Lesson } from '../models/content';
import { ReviewCard } from '../models/review';
import { VocabularyOverrides } from '../models/vocabulary';
import { scheduleReview } from '../services/srs';
import {
  buildRateReviewState,
  buildRecordExerciseState,
  buildStartLessonState,
} from './studyTransitions';

const now = new Date('2026-07-19T04:00:00.000Z');
const reviewedAt = new Date('2026-07-20T05:30:00.000Z');

const lesson: Lesson = {
  id: 'lesson-01',
  number: 1,
  title: 'Test lesson',
  japaneseTitle: 'ãƒ†ã‚¹ãƒˆ',
  description: 'Transition fixture',
  durationMinutes: 10,
  theme: 'Fixtures',
  availability: 'ready',
  goals: [],
  vocabulary: [
    {
      id: 'course-visible',
      japanese: 'ä»Š',
      reading: 'ã„ã¾',
      english: 'now',
      partOfSpeech: 'noun',
    },
    {
      id: 'course-hidden',
      japanese: 'æœ¬',
      reading: 'ã»ã‚“',
      english: 'book',
      partOfSpeech: 'noun',
    },
  ],
  grammar: [
    {
      id: 'grammar-topic',
      title: 'Topic marker',
      pattern: 'A ã¯ B',
      plainEnglish: 'As for A, B',
      explanation: 'Marks the topic.',
      whyItWorks: 'Introduces shared context.',
      usageBoundary: 'A topic frame guides the listener; it does not always name the sentence subject.',
      formation: [{
        label: 'Topic marker',
        formula: 'topic + は + comment',
        explanation: 'Introduce the shared topic with は before giving the comment about it.',
      }],
      contrast: {
        with: 'は compared with が',
        explanation: 'The fixture frames known context with は rather than identifying a subject with が.',
      },
      examples: [],
    },
  ],
  dialogue: [],
  exercises: [],
};

const vocabulary: VocabularyOverrides = {
  recordsByLesson: {
    'lesson-01': [
      {
        lessonId: 'lesson-01',
        createdAt: '2026-07-18T01:00:00.000Z',
        updatedAt: '2026-07-18T01:00:00.000Z',
        sortKey: 'custom:2026-07-18T01:00:00.000Z:fixture',
        item: {
          id: 'custom:lesson-01:fixture',
          japanese: 'æ˜Žæ—¥',
          reading: 'ã‚ã—ãŸ',
          english: 'tomorrow',
          partOfSpeech: 'noun',
          source: 'custom',
        },
      },
    ],
  },
  hiddenIdsByLesson: { 'lesson-01': ['course-hidden'] },
  updatedAt: '2026-07-18T01:00:00.000Z',
};

const reviewCard = (id: string): ReviewCard => ({
  id,
  lessonId: 'lesson-01',
  kind: 'vocabulary',
  prompt: id,
  answer: `${id}-answer`,
  dueAt: '2026-07-19T00:00:00.000Z',
  intervalDays: 1,
  repetitions: 1,
  ease: 2.5,
});

const affectedCard = reviewCard('review-affected');
const unrelatedCard = reviewCard('review-unrelated');

const recovery = {
  previousVocabulary: vocabulary,
  previousAffectedReviewCards: {
    [affectedCard.id]: affectedCard,
  },
  affectedReviewCardIds: [affectedCard.id],
  authoredBaselineVersion: 'baseline-before-import',
  importedAt: '2026-07-18T03:00:00.000Z',
};

const state = (): PersistedAppStateV2 => ({
  schemaVersion: 2,
  authoredBaselineVersion: 'baseline-current',
  progress: {
    'lesson-02': {
      lessonId: 'lesson-02',
      started: true,
      completedExerciseIds: ['exercise-existing'],
      correctAnswers: 1,
      attempts: 2,
    },
  },
  reviewCards: {
    [affectedCard.id]: affectedCard,
    [unrelatedCard.id]: unrelatedCard,
  },
  vocabulary,
  lastImportRecovery: recovery,
});

describe('buildStartLessonState', () => {
  it('starts a new lesson and seeds its effective active vocabulary and grammar', () => {
    const current = state();

    const result = buildStartLessonState(current, lesson.id, [lesson], now);

    expect(result.progress[lesson.id]).toEqual({
      lessonId: lesson.id,
      started: true,
      completedExerciseIds: [],
      correctAnswers: 0,
      attempts: 0,
    });
    expect(result.reviewCards['review-course-visible']).toMatchObject({
      kind: 'vocabulary',
      dueAt: now.toISOString(),
    });
    expect(result.reviewCards['review-custom:lesson-01:fixture']).toMatchObject({
      kind: 'vocabulary',
      dueAt: now.toISOString(),
    });
    expect(result.reviewCards['review-course-hidden']).toBeUndefined();
    expect(result.reviewCards['review-grammar-topic']).toMatchObject({
      kind: 'grammar',
      dueAt: now.toISOString(),
    });
    expect(result.progress['lesson-02']).toBe(current.progress['lesson-02']);
  });

  it('starts existing unstarted progress without losing activity and seeds review cards', () => {
    const current = state();
    current.progress[lesson.id] = {
      lessonId: lesson.id,
      started: false,
      completedExerciseIds: ['exercise-existing'],
      correctAnswers: 2,
      attempts: 3,
    };

    const result = buildStartLessonState(current, lesson.id, [lesson], now);

    expect(result.progress[lesson.id]).toEqual({
      lessonId: lesson.id,
      started: true,
      completedExerciseIds: ['exercise-existing'],
      correctAnswers: 2,
      attempts: 3,
    });
    expect(result.reviewCards['review-course-visible']).toBeDefined();
    expect(result.reviewCards['review-grammar-topic']).toBeDefined();
    expect(result.progress['lesson-02']).toBe(current.progress['lesson-02']);
    expect(result.vocabulary).toBe(current.vocabulary);
    expect(result.lastImportRecovery).toBe(current.lastImportRecovery);
  });
});

describe('buildRecordExerciseState', () => {
  it('records completion while carrying the current import recovery forward unchanged', () => {
    const current = state();

    const result = buildRecordExerciseState(current, lesson.id, 'exercise-01', true);

    expect(result.progress[lesson.id]).toMatchObject({
      completedExerciseIds: ['exercise-01'],
      correctAnswers: 1,
      attempts: 1,
    });
    expect(result.lastImportRecovery).toBe(current.lastImportRecovery);
    expect(result.reviewCards).toBe(current.reviewCards);
    expect(result.vocabulary).toBe(current.vocabulary);
  });
});

describe('buildRateReviewState', () => {
  it('preserves recovery when rating an unrelated review card', () => {
    const current = state();

    const result = buildRateReviewState(current, unrelatedCard.id, 'good', reviewedAt);

    expect(result.lastImportRecovery).toBe(current.lastImportRecovery);
  });

  it('clears recovery when rating a card listed in affectedReviewCardIds', () => {
    const current = state();

    const result = buildRateReviewState(current, affectedCard.id, 'good', reviewedAt);

    expect(result.lastImportRecovery).toBeUndefined();
  });

  it('schedules only the named card and preserves all other state byte-for-byte', () => {
    const current = state();
    const progressBefore = JSON.stringify(current.progress);
    const vocabularyBefore = JSON.stringify(current.vocabulary);
    const unrelatedBefore = JSON.stringify(current.reviewCards[unrelatedCard.id]);

    const result = buildRateReviewState(current, affectedCard.id, 'hard', reviewedAt);

    expect(result.reviewCards[affectedCard.id]).toEqual(
      scheduleReview(affectedCard, 'hard', reviewedAt),
    );
    expect(JSON.stringify(result.reviewCards[unrelatedCard.id])).toBe(unrelatedBefore);
    expect(JSON.stringify(result.progress)).toBe(progressBefore);
    expect(JSON.stringify(result.vocabulary)).toBe(vocabularyBefore);
    expect(result.reviewCards[unrelatedCard.id]).toBe(current.reviewCards[unrelatedCard.id]);
    expect(result.progress).toBe(current.progress);
    expect(result.vocabulary).toBe(current.vocabulary);
  });
});
