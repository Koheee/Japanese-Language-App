import type { Lesson } from '../models/content';

export type LessonQuickSwitchLesson = Pick<
  Lesson,
  'id' | 'number' | 'title' | 'japaneseTitle'
>;

export interface LessonQuickSwitchOption extends LessonQuickSwitchLesson {
  numberLabel: string;
  accessibilityLabel: string;
  selected: boolean;
}

export type LessonQuickSwitchDecision =
  | { type: 'close' }
  | { type: 'ignore' }
  | { type: 'select'; lessonId: string };

export const createLessonQuickSwitchOptions = (
  lessons: LessonQuickSwitchLesson[],
  currentLessonId: string,
): LessonQuickSwitchOption[] => [...lessons]
  .sort((a, b) => a.number - b.number)
  .map((lesson) => {
    const numberLabel = String(lesson.number).padStart(2, '0');
    return {
      ...lesson,
      numberLabel,
      accessibilityLabel: `Lesson ${numberLabel}, ${lesson.japaneseTitle}, ${lesson.title}`,
      selected: lesson.id === currentLessonId,
    };
  });

export const resolveLessonQuickSwitchSelection = (
  options: LessonQuickSwitchOption[],
  currentLessonId: string,
  selectedLessonId: string,
): LessonQuickSwitchDecision => {
  if (!options.some((option) => option.id === selectedLessonId)) return { type: 'ignore' };
  if (selectedLessonId === currentLessonId) return { type: 'close' };
  return { type: 'select', lessonId: selectedLessonId };
};
