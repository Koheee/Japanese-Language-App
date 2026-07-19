import { Lesson } from '../../models/content';
import { lesson01 } from './lesson01';
import { lessons02to09 } from './lessons02to09';
import { lessons10to17 } from './lessons10to17';
import { lessons18to25 } from './lessons18to25';
import { getGrammarReferences } from '../grammarReferences';

const authoredLessons: Lesson[] = [
  lesson01,
  ...lessons02to09,
  ...lessons10to17,
  ...lessons18to25,
].sort((a, b) => a.number - b.number);

export const lessons: Lesson[] = authoredLessons.map((lesson) => ({
  ...lesson,
  grammar: lesson.grammar.map((point) => {
    const references = getGrammarReferences(point.id);
    return references.length
      ? { ...point, furtherReading: references.map((reference) => ({ ...reference })) }
      : point;
  }),
}));

export const getLesson = (lessonId: string) =>
  lessons.find((lesson) => lesson.id === lessonId);
