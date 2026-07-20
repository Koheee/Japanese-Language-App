import { describe, expect, it } from 'vitest';

import { lessons } from '../data/lessons';
import {
  createLessonQuickSwitchOptions,
  resolveLessonQuickSwitchSelection,
  type LessonQuickSwitchLesson,
} from './lessonQuickSwitcherModel';

const unorderedLessons: LessonQuickSwitchLesson[] = [
  { id: 'lesson-10', number: 10, japaneseTitle: 'あります・います', title: 'What is around us' },
  { id: 'lesson-02', number: 2, japaneseTitle: 'これは なんですか', title: 'Things around us' },
  { id: 'lesson-01', number: 1, japaneseTitle: 'はじめまして', title: 'A first introduction' },
];

describe('lesson quick-switcher model', () => {
  it('projects the complete authored curriculum as Lessons 01 through 25', () => {
    const options = createLessonQuickSwitchOptions(lessons, 'lesson-01');

    expect(options).toHaveLength(25);
    expect(options.map((option) => option.number)).toEqual(
      Array.from({ length: 25 }, (_, index) => index + 1),
    );
    expect(options.every((option) => !('romaji' in option))).toBe(true);
  });

  it('projects lessons in numeric order with complete labels', () => {
    const options = createLessonQuickSwitchOptions(unorderedLessons, 'lesson-02');

    expect(options.map((option) => option.id)).toEqual(['lesson-01', 'lesson-02', 'lesson-10']);
    expect(options[1]).toEqual({
      id: 'lesson-02',
      number: 2,
      numberLabel: '02',
      japaneseTitle: 'これは なんですか',
      title: 'Things around us',
      accessibilityLabel: 'Lesson 02, これは なんですか, Things around us',
      selected: true,
    });
  });

  it('does not mutate the lesson array while sorting', () => {
    createLessonQuickSwitchOptions(unorderedLessons, 'lesson-02');
    expect(unorderedLessons.map((lesson) => lesson.id)).toEqual(['lesson-10', 'lesson-02', 'lesson-01']);
  });

  it('returns close when the current lesson is selected', () => {
    const options = createLessonQuickSwitchOptions(unorderedLessons, 'lesson-02');
    expect(resolveLessonQuickSwitchSelection(options, 'lesson-02', 'lesson-02')).toEqual({ type: 'close' });
  });

  it('returns the selected valid lesson ID for a real switch', () => {
    const options = createLessonQuickSwitchOptions(unorderedLessons, 'lesson-02');
    expect(resolveLessonQuickSwitchSelection(options, 'lesson-02', 'lesson-10')).toEqual({
      type: 'select',
      lessonId: 'lesson-10',
    });
  });

  it('ignores a lesson ID that is not in the projected options', () => {
    const options = createLessonQuickSwitchOptions(unorderedLessons, 'lesson-02');
    expect(resolveLessonQuickSwitchSelection(options, 'lesson-02', 'lesson-99')).toEqual({ type: 'ignore' });
  });
});
