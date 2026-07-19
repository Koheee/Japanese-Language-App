import { describe, expect, it } from 'vitest';

import { Lesson, VocabularyItem } from '../models/content';
import { VocabularyOverrides } from '../models/vocabulary';
import { buildLessonWordsView } from './lessonWordsModel';

const lesson = {
  id: 'lesson-11',
  vocabulary: [
    {
      id: 'course-now',
      japanese: '今',
      reading: 'いま',
      english: 'time now',
      partOfSpeech: 'noun',
      category: 'Time',
    },
    {
      id: 'course-day',
      japanese: '日',
      reading: 'ひ',
      english: 'day',
      partOfSpeech: 'noun',
    },
    {
      id: 'course-hidden',
      japanese: '週',
      reading: 'しゅう',
      english: 'week',
      partOfSpeech: 'noun',
    },
  ],
} as Lesson;

const vocabulary: VocabularyOverrides = {
  recordsByLesson: {
    'lesson-11': [
      {
        lessonId: 'lesson-11',
        createdAt: '2026-07-19T01:00:00.000Z',
        updatedAt: '2026-07-19T01:00:00.000Z',
        sortKey: 'personal-deck:00000001',
        item: {
          id: 'personal-hour',
          japanese: '時',
          reading: 'じ',
          english: 'hour',
          partOfSpeech: 'noun',
          source: 'personal-deck',
        },
      },
      {
        lessonId: 'lesson-11',
        createdAt: '2026-07-19T02:00:00.000Z',
        updatedAt: '2026-07-19T02:00:00.000Z',
        sortKey: 'custom:2026-07-19T02:00:00.000Z:later',
        item: {
          id: 'custom-later',
          japanese: '後で',
          reading: 'あとで',
          english: 'later time',
          partOfSpeech: 'adverb',
          source: 'custom',
        },
      },
    ],
  },
  hiddenIdsByLesson: { 'lesson-11': ['course-hidden'] },
  updatedAt: '2026-07-19T02:00:00.000Z',
};

const emptyLesson = { ...lesson, id: 'lesson-empty', vocabulary: [] };

const buildLargeLesson = (size: number) => {
  const words: VocabularyItem[] = [];
  const expectedIds: string[] = [];

  for (let index = 0; index < size; index += 1) {
    const id = `large-${String(index).padStart(4, '0')}`;
    const isTarget = index % 137 === 0;
    words.push({
      id,
      japanese: `単語${index}`,
      reading: `たんご${index}`,
      english: isTarget ? `target ${index}` : `word ${index}`,
      partOfSpeech: 'noun',
    });
    if (isTarget) expectedIds.push(id);
  }

  return {
    lesson: { ...lesson, id: 'lesson-large', vocabulary: words },
    vocabulary: {
      recordsByLesson: {},
      hiddenIdsByLesson: {},
      updatedAt: null,
    } satisfies VocabularyOverrides,
    expectedIds,
  };
};

describe('buildLessonWordsView', () => {
  it('returns the effective visible count and normalized filtered order', () => {
    const view = buildLessonWordsView({ lesson, vocabulary, query: ' time ' });
    expect(view.visibleCount).toBe(4);
    expect(view.filtered.map(({ item }) => item.id)).toEqual(['course-now', 'custom-later']);
  });

  it('distinguishes an empty lesson from no search matches', () => {
    expect(buildLessonWordsView({ lesson: emptyLesson, vocabulary, query: '' }).emptyState).toBe('no-words');
    expect(buildLessonWordsView({ lesson, vocabulary, query: 'not-present' }).emptyState).toBe('no-matches');
  });

  it('filters 2,000 memoized search records without changing order', () => {
    const large = buildLargeLesson(2_000);
    const result = buildLessonWordsView({ lesson: large.lesson, vocabulary: large.vocabulary, query: 'target' });
    expect(result.filtered.map(({ item }) => item.id)).toEqual(large.expectedIds);
  });
});
