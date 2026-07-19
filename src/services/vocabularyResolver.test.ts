import { describe, expect, it } from 'vitest';

import { Lesson } from '../models/content';
import { VocabularyOverrides } from '../models/vocabulary';
import {
  filterResolvedVocabulary,
  findLessonDuplicate,
  resolveVocabularyLists,
} from './vocabularyResolver';

const lesson = {
  id: 'lesson-01',
  vocabulary: [
    { id: 'course-a', japanese: ' 学生 ', reading: 'がくせい', english: 'Student', partOfSpeech: 'noun', category: 'People' },
    { id: 'course-b', japanese: '先生', reading: 'せんせい', english: 'teacher', partOfSpeech: 'noun' },
  ],
} as Lesson;
const vocabulary: VocabularyOverrides = {
  recordsByLesson: {
    'lesson-01': [
      {
        lessonId: 'lesson-01', createdAt: '2026-07-18T02:00:00.000Z', updatedAt: '2026-07-18T02:00:00.000Z',
        sortKey: 'custom:2026-07-18T02:00:00.000Z:b',
        item: { id: 'custom:lesson-01:b', japanese: '会社員', reading: 'かいしゃいん', english: 'office worker', partOfSpeech: 'vocabulary', source: 'custom' },
      },
      {
        lessonId: 'lesson-01', createdAt: '2026-07-18T01:00:00.000Z', updatedAt: '2026-07-18T01:00:00.000Z',
        sortKey: 'personal-deck:00000010',
        item: { id: 'personal-deck:lesson-01:10', japanese: 'カフェ', reading: 'カフェ', english: 'Café', partOfSpeech: 'vocabulary', category: 'Places', source: 'personal-deck', sourceId: 'L01-10' },
      },
      {
        lessonId: 'lesson-01', createdAt: '2026-07-18T01:00:00.000Z', updatedAt: '2026-07-18T01:00:00.000Z',
        sortKey: 'personal-deck:00000002',
        item: { id: 'personal-deck:lesson-01:2', japanese: '本', reading: 'ほん', english: 'book', partOfSpeech: 'vocabulary', source: 'personal-deck', sourceId: 'L01-02' },
      },
    ],
  },
  hiddenIdsByLesson: { 'lesson-01': ['course-b', 'personal-deck:lesson-01:2'] },
  updatedAt: '2026-07-18T02:00:00.000Z',
};

describe('vocabularyResolver', () => {
  it('keeps authored order, numeric personal order, custom creation order, then removes hidden items', () => {
    const result = resolveVocabularyLists({ lesson, vocabulary });
    expect(result.active.map(({ item }) => item.id)).toEqual([
      'course-a', 'personal-deck:lesson-01:10', 'custom:lesson-01:b',
    ]);
    expect(result.hidden.map(({ item }) => item.id)).toEqual([
      'course-b', 'personal-deck:lesson-01:2',
    ]);
    expect(result.all.find(({ item }) => item.id === 'course-a')?.editable).toBe(false);
    expect(result.all.find(({ item }) => item.id === 'custom:lesson-01:b')?.editable).toBe(true);
  });

  it('searches Japanese, reading, English, and category without reordering', () => {
    const all = resolveVocabularyLists({ lesson, vocabulary }).all;
    expect(filterResolvedVocabulary(all, ' ＣＡＦÉ ').map(({ item }) => item.id)).toEqual(['personal-deck:lesson-01:10']);
    expect(filterResolvedVocabulary(all, 'people').map(({ item }) => item.id)).toEqual(['course-a']);
    expect(filterResolvedVocabulary(all, 'せん せい').map(({ item }) => item.id)).toEqual(['course-b']);
  });

  it('finds normalized duplicates across active and hidden records in one lesson', () => {
    expect(findLessonDuplicate({ lesson, vocabulary, japanese: '学 生' })?.item.id).toBe('course-a');
    expect(findLessonDuplicate({ lesson, vocabulary, japanese: '先生' })?.item.id).toBe('course-b');
    expect(findLessonDuplicate({ lesson, vocabulary, japanese: '本' })?.item.id).toBe('personal-deck:lesson-01:2');
    expect(findLessonDuplicate({ lesson, vocabulary, japanese: '会社員', excludeVocabularyId: 'custom:lesson-01:b' })).toBeUndefined();
  });

  it('allows the same normalized headword in a different lesson', () => {
    const otherLesson = { ...lesson, id: 'lesson-02', vocabulary: [] };
    expect(findLessonDuplicate({ lesson: otherLesson, vocabulary, japanese: '学生' })).toBeUndefined();
  });
});
