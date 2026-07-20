import { getGrammarReferences } from '../grammarReferences';
import { containsLatinLetters, isKanaReading } from '../../services/vocabularyText';
import { lessons } from '.';

export interface GrammarRangeExpectation {
  firstLesson: number;
  lastLesson: number;
  grammarPoints: number;
  examples: number;
  dialogueTurns: number;
  dialogueByLesson: Readonly<Record<number, number>>;
}

const nonEmpty = (value: string | undefined): value is string => Boolean(value?.trim());

export const collectGrammarRangeErrors = (expectation: GrammarRangeExpectation): string[] => {
  const errors: string[] = [];
  const range = lessons.filter(
    ({ number }) => number >= expectation.firstLesson && number <= expectation.lastLesson,
  );
  const expectedLessonNumbers = Array.from(
    { length: expectation.lastLesson - expectation.firstLesson + 1 },
    (_, index) => expectation.firstLesson + index,
  );
  if (range.map(({ number }) => number).join(',') !== expectedLessonNumbers.join(',')) {
    errors.push(`lesson order: expected ${expectedLessonNumbers.join(',')}`);
  }

  const points = range.flatMap(({ grammar }) => grammar);
  const examples = points.flatMap(({ examples: pointExamples }) => pointExamples);
  const dialogue = range.flatMap(({ dialogue: lessonDialogue }) => lessonDialogue);
  if (points.length !== expectation.grammarPoints) errors.push(`grammar count: ${points.length}`);
  if (examples.length !== expectation.examples) errors.push(`example count: ${examples.length}`);
  if (dialogue.length !== expectation.dialogueTurns) errors.push(`dialogue count: ${dialogue.length}`);

  for (const lesson of range) {
    const expectedDialogueCount = expectation.dialogueByLesson[lesson.number];
    if (expectedDialogueCount === undefined) {
      errors.push(`lesson ${lesson.number}: dialogue expectation is missing`);
    } else {
      if (lesson.dialogue.length !== expectedDialogueCount) {
        errors.push(`lesson ${lesson.number}: dialogue count ${lesson.dialogue.length}`);
      }
      const expectedDialogueIds = Array.from(
        { length: expectedDialogueCount },
        (_, index) => `l${lesson.number}-d${String(index + 1).padStart(2, '0')}`,
      );
      if (lesson.dialogue.map(({ id }) => id).join(',') !== expectedDialogueIds.join(',')) {
        errors.push(`lesson ${lesson.number}: dialogue IDs changed`);
      }
    }
    const grammarIds = new Set(lesson.grammar.map(({ id }) => id));
    for (const turn of lesson.dialogue) {
      if (!isKanaReading(turn.reading) || containsLatinLetters(turn.reading)) {
        errors.push(`${turn.id}: dialogue reading is not kana`);
      }
      for (const grammarId of turn.grammarIds ?? []) {
        if (!grammarIds.has(grammarId)) errors.push(`${turn.id}: unresolved grammar ID ${grammarId}`);
      }
      const notes = turn.grammarNotes ?? [];
      const turnGrammarIds = new Set(turn.grammarIds ?? []);
      for (const grammarId of turn.grammarIds ?? []) {
        if (notes.filter((note) => note.grammarId === grammarId).length !== 1) {
          errors.push(`${turn.id}: needs one note for ${grammarId}`);
        }
      }
      for (const note of notes) {
        if (!grammarIds.has(note.grammarId)) errors.push(`${turn.id}: unresolved note ID ${note.grammarId}`);
        if (grammarIds.has(note.grammarId) && !turnGrammarIds.has(note.grammarId)) {
          errors.push(`${turn.id}: untagged note ID ${note.grammarId}`);
        }
        if (!nonEmpty(note.explanation)) errors.push(`${turn.id}: empty note for ${note.grammarId}`);
        if (/https?:\/\//i.test(note.explanation)) errors.push(`${turn.id}: note contains a URL`);
      }
    }
  }

  for (const point of points) {
    if (!nonEmpty(point.explanation) || point.explanation.trim().length <= 40) {
      errors.push(`${point.id}: explanation is not substantive`);
    }
    if (!nonEmpty(point.whyItWorks) || point.whyItWorks.trim().length <= 40) {
      errors.push(`${point.id}: Japanese-first insight is not substantive`);
    }
    if (!nonEmpty(point.usageBoundary) || (point.usageBoundary?.trim().length ?? 0) <= 20) {
      errors.push(`${point.id}: usageBoundary is missing or vague`);
    }
    if (!point.formation?.length) {
      errors.push(`${point.id}: formation is missing`);
    } else {
      point.formation.forEach((step, index) => {
        if (![step.label, step.formula, step.explanation].every(nonEmpty)) {
          errors.push(`${point.id}: formation ${index + 1} is incomplete`);
        }
      });
    }
    if (!point.contrast || ![point.contrast.with, point.contrast.explanation].every(nonEmpty)) {
      errors.push(`${point.id}: contrast is missing`);
    }
    if (point.beyondBasics?.some((note) => !nonEmpty(note))) {
      errors.push(`${point.id}: beyondBasics contains an empty note`);
    }
    if (point.examples.length !== 2) errors.push(`${point.id}: expected exactly two examples`);
    const manifestReferences = getGrammarReferences(point.id);
    if (JSON.stringify(point.furtherReading ?? []) !== JSON.stringify(manifestReferences)) {
      errors.push(`${point.id}: furtherReading differs from manifest`);
    }
    if (point.commonMistake && ![
      point.commonMistake.avoid,
      point.commonMistake.prefer,
      point.commonMistake.reason,
    ].every(nonEmpty)) {
      errors.push(`${point.id}: commonMistake is incomplete`);
    }
    for (const [index, example] of point.examples.entries()) {
      if (!nonEmpty(example.japanese) || !nonEmpty(example.english)) {
        errors.push(`${point.id}: example ${index + 1} is incomplete`);
      }
      const reading = example.reading;
      if (!nonEmpty(reading)) {
        errors.push(`${point.id}: example ${index + 1} needs a reading`);
      } else if (!isKanaReading(reading) || containsLatinLetters(reading)) {
        errors.push(`${point.id}: example ${index + 1} reading is not kana`);
      }
    }
  }

  return errors;
};
