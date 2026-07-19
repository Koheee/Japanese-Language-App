import { describe, expect, it } from 'vitest';

import { lessons } from '../data/lessons';
import { Lesson } from '../models/content';
import { LessonProgress, ReviewCard } from '../models/review';
import { emptyVocabularyOverrides, VocabularyOverrides } from '../models/vocabulary';
import { reconcileReviewCards, vocabularyIdFromReviewCardId } from './reconcileReviewCards';

const now = new Date('2026-07-19T04:00:00.000Z');

const startedLesson: Lesson = {
  id: 'lesson-01',
  number: 1,
  title: 'Started lesson',
  japaneseTitle: '始めたレッスン',
  description: 'Started lesson fixture',
  durationMinutes: 10,
  theme: 'Time',
  availability: 'ready',
  goals: [],
  vocabulary: [
    {
      id: 'course-word',
      japanese: '今',
      reading: 'いま',
      english: 'now',
      partOfSpeech: 'noun',
      category: 'Time',
    },
  ],
  grammar: [
    {
      id: 'grammar-point',
      title: 'Topic statement',
      pattern: 'A は B',
      plainEnglish: 'A is B',
      explanation: 'Marks A as the topic.',
      whyItWorks: 'は introduces the topic.',
      usageBoundary: 'A topic frame sets context; it does not automatically identify the grammatical subject.',
      examples: [],
    },
  ],
  dialogue: [],
  exercises: [],
};

const unstartedLesson: Lesson = {
  id: 'lesson-02',
  number: 2,
  title: 'Unstarted lesson',
  japaneseTitle: '次のレッスン',
  description: 'Unstarted lesson fixture',
  durationMinutes: 10,
  theme: 'Objects',
  availability: 'ready',
  goals: [],
  vocabulary: [],
  grammar: [],
  dialogue: [],
  exercises: [],
};

const fixtureLessons = [startedLesson, unstartedLesson];

const progressFor = (lessonId: string, started: boolean): LessonProgress => ({
  lessonId,
  started,
  completedExerciseIds: [],
  correctAnswers: 0,
  attempts: 0,
});

const startedProgress: Record<string, LessonProgress> = {
  'lesson-01': progressFor('lesson-01', true),
  'lesson-02': progressFor('lesson-02', false),
};

const vocabulary: VocabularyOverrides = {
  recordsByLesson: {
    'lesson-01': [
      {
        lessonId: 'lesson-01',
        createdAt: '2026-07-18T01:00:00.000Z',
        updatedAt: '2026-07-18T01:00:00.000Z',
        sortKey: 'custom:2026-07-18T01:00:00.000Z:uuid-with-hyphens',
        item: {
          id: 'custom:lesson-01:uuid-with-hyphens',
          japanese: '明日',
          reading: 'あした',
          english: 'tomorrow',
          partOfSpeech: 'noun',
          category: 'Time',
          source: 'custom',
        },
      },
    ],
    'lesson-02': [
      {
        lessonId: 'lesson-02',
        createdAt: '2026-07-18T02:00:00.000Z',
        updatedAt: '2026-07-18T02:00:00.000Z',
        sortKey: 'personal-deck:00000001',
        item: {
          id: 'personal-deck:lesson-02:1',
          japanese: '本',
          reading: 'ほん',
          english: 'book',
          partOfSpeech: 'noun',
          source: 'personal-deck',
          sourceId: 'L02-01',
        },
      },
    ],
  },
  hiddenIdsByLesson: {},
  updatedAt: '2026-07-18T02:00:00.000Z',
};

const hiddenVocabulary: VocabularyOverrides = {
  ...vocabulary,
  hiddenIdsByLesson: { 'lesson-01': ['course-word'] },
};

const staleCards: Record<string, ReviewCard> = {
  'review-course-word': {
    id: 'review-course-word',
    lessonId: 'lesson-01',
    kind: 'vocabulary',
    prompt: 'old word',
    answer: 'old answer',
    supportingText: 'old supporting text',
    dueAt: '2026-08-01T10:00:00.000Z',
    intervalDays: 12,
    repetitions: 4,
    ease: 2.35,
    lastReviewedAt: '2026-07-17T10:00:00.000Z',
  },
  'review-custom:lesson-01:uuid-with-hyphens': {
    id: 'review-custom:lesson-01:uuid-with-hyphens',
    lessonId: 'lesson-01',
    kind: 'vocabulary',
    prompt: '明日',
    answer: 'tomorrow',
    supportingText: 'あした · Time',
    dueAt: '2026-07-20T10:00:00.000Z',
    intervalDays: 1,
    repetitions: 1,
    ease: 2.5,
    suspended: false,
  },
  'review-grammar-point': {
    id: 'review-grammar-point',
    lessonId: 'lesson-01',
    kind: 'grammar',
    prompt: 'old pattern',
    answer: 'old explanation',
    supportingText: 'old title',
    dueAt: '2026-08-05T10:00:00.000Z',
    intervalDays: 18,
    repetitions: 5,
    ease: 2.7,
    lastReviewedAt: '2026-07-18T10:00:00.000Z',
    suspended: false,
  },
  'review-removed-baseline-word': {
    id: 'review-removed-baseline-word',
    lessonId: 'lesson-01',
    kind: 'vocabulary',
    prompt: 'removed',
    answer: 'removed word',
    dueAt: '2026-08-10T10:00:00.000Z',
    intervalDays: 24,
    repetitions: 6,
    ease: 2.8,
  },
  'review-already-orphaned': {
    id: 'review-already-orphaned',
    lessonId: 'lesson-01',
    kind: 'grammar',
    prompt: 'already removed',
    answer: 'already removed grammar',
    dueAt: '2026-08-12T10:00:00.000Z',
    intervalDays: 30,
    repetitions: 7,
    ease: 2.9,
    suspended: true,
  },
  'review-personal-deck:lesson-02:1': {
    id: 'review-personal-deck:lesson-02:1',
    lessonId: 'lesson-02',
    kind: 'vocabulary',
    prompt: 'unstarted legacy prompt',
    answer: 'unstarted legacy answer',
    dueAt: '2026-09-01T10:00:00.000Z',
    intervalDays: 40,
    repetitions: 8,
    ease: 3,
    suspended: true,
  },
};

const schedule = (card: {
  dueAt: string;
  intervalDays: number;
  repetitions: number;
  ease: number;
  lastReviewedAt?: string;
}) => ({
  dueAt: card.dueAt,
  intervalDays: card.intervalDays,
  repetitions: card.repetitions,
  ease: card.ease,
  lastReviewedAt: card.lastReviewedAt,
});

describe('reconcileReviewCards', () => {
  it('seeds every visible word and grammar point in a started lesson due now', () => {
    const result = reconcileReviewCards({ lessons: fixtureLessons, progress: startedProgress, reviewCards: {}, vocabulary, now });
    expect(result['review-course-word']).toMatchObject({ kind: 'vocabulary', dueAt: now.toISOString(), suspended: false });
    expect(result['review-custom:lesson-01:uuid-with-hyphens']).toMatchObject({ kind: 'vocabulary', dueAt: now.toISOString(), suspended: false });
    expect(result['review-grammar-point']).toMatchObject({ kind: 'grammar', dueAt: now.toISOString() });
  });

  it('does not seed an incoming word in an unstarted lesson', () => {
    const result = reconcileReviewCards({ lessons: fixtureLessons, progress: startedProgress, reviewCards: {}, vocabulary, now });
    expect(result['review-personal-deck:lesson-02:1']).toBeUndefined();
  });

  it('refreshes stale vocabulary and grammar presentation while preserving every schedule field', () => {
    const result = reconcileReviewCards({ lessons: fixtureLessons, progress: startedProgress, reviewCards: staleCards, vocabulary, now });
    expect(result['review-course-word']).toMatchObject({ prompt: '今', answer: 'now', supportingText: 'いま · Time' });
    expect(result['review-grammar-point']).toMatchObject({ prompt: 'A は B', answer: 'A is B', supportingText: 'Topic statement' });
    expect(schedule(result['review-course-word']!)).toEqual(schedule(staleCards['review-course-word']!));
    expect(schedule(result['review-grammar-point']!)).toEqual(schedule(staleCards['review-grammar-point']!));
  });

  it('suspends hidden and orphaned cards, then restores a hidden card with its schedule', () => {
    const hidden = reconcileReviewCards({ lessons: fixtureLessons, progress: startedProgress, reviewCards: staleCards, vocabulary: hiddenVocabulary, now });
    expect(hidden['review-course-word']?.suspended).toBe(true);
    expect(hidden['review-removed-baseline-word']?.suspended).toBe(true);
    const restored = reconcileReviewCards({ lessons: fixtureLessons, progress: startedProgress, reviewCards: hidden, vocabulary, now });
    expect(restored['review-course-word']?.suspended).toBe(false);
    expect(schedule(restored['review-course-word']!)).toEqual(schedule(staleCards['review-course-word']!));
  });

  it('leaves unstarted cards untouched and reuses entries whose fields do not change', () => {
    const result = reconcileReviewCards({ lessons: fixtureLessons, progress: startedProgress, reviewCards: staleCards, vocabulary, now });

    expect(result).not.toBe(staleCards);
    expect(result['review-personal-deck:lesson-02:1']).toBe(staleCards['review-personal-deck:lesson-02:1']);
    expect(result['review-custom:lesson-01:uuid-with-hyphens']).toBe(staleCards['review-custom:lesson-01:uuid-with-hyphens']);
    expect(result['review-already-orphaned']).toBe(staleCards['review-already-orphaned']);
  });

  it('removes only the exact review- prefix from hyphenated vocabulary IDs', () => {
    expect(vocabularyIdFromReviewCardId({ ...staleCards['review-course-word']!, id: 'review-custom:lesson-01:uuid-with-hyphens' })).toBe('custom:lesson-01:uuid-with-hyphens');
    expect(vocabularyIdFromReviewCardId({ ...staleCards['review-course-word']!, id: 'custom:lesson-01:uuid-with-hyphens' })).toBeUndefined();
  });

  it('refreshes enriched grammar presentation and preserves every schedule field', () => {
    const lesson = lessons.find(({ id }) => id === 'lesson-01');
    const point = lesson?.grammar.find(({ id }) => id === 'l1-topic-copula');
    expect(point?.title).toBe('Make a noun the topic, then identify it');
    if (!point) throw new Error('Missing l1-topic-copula');

    const stale: ReviewCard = {
      id: 'review-l1-topic-copula',
      lessonId: 'lesson-01',
      kind: 'grammar',
      prompt: 'A は old text',
      answer: 'stale answer',
      supportingText: 'Frame a topic, then describe it',
      dueAt: '2026-09-12T03:04:05.000Z',
      intervalDays: 17,
      repetitions: 6,
      ease: 2.35,
      lastReviewedAt: '2026-08-26T03:04:05.000Z',
    };
    const result = reconcileReviewCards({
      lessons,
      progress: {
        'lesson-01': {
          lessonId: 'lesson-01',
          started: true,
          completedExerciseIds: ['l1-e01'],
          correctAnswers: 1,
          attempts: 1,
        },
      },
      reviewCards: { [stale.id]: stale },
      vocabulary: emptyVocabularyOverrides(),
      now: new Date('2026-07-19T00:00:00.000Z'),
    });
    expect(result[stale.id]).toMatchObject({
      prompt: point.pattern,
      answer: point.plainEnglish,
      supportingText: point.title,
    });
    expect(result[stale.id]).toMatchObject({
      dueAt: stale.dueAt,
      intervalDays: stale.intervalDays,
      repetitions: stale.repetitions,
      ease: stale.ease,
      lastReviewedAt: stale.lastReviewedAt,
    });
  });
});
