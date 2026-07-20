import type { Lesson } from '../models/content';
import { normalizeSearchText } from './normalizeSearchText';
import type { SearchDocument, SearchField, SearchFieldRole, SearchSubsection } from './types';

const addField = (
  fields: SearchField[],
  text: string | undefined,
  role: SearchFieldRole,
  subsection: SearchSubsection,
  grammarId?: string,
) => {
  if (!text?.trim()) return;
  fields.push({
    text,
    normalizedText: normalizeSearchText(text),
    role,
    subsection,
    grammarId,
    order: fields.length,
  });
};

export function buildSearchCorpus(inputLessons: readonly Lesson[]): SearchDocument[] {
  const documents: SearchDocument[] = [];
  let sourceOrder = 0;

  for (const lesson of inputLessons) {
    for (const point of lesson.grammar) {
      const fields: SearchField[] = [];
      addField(fields, point.title, 'primary', 'header');
      addField(fields, point.pattern, 'primary', 'header');
      addField(fields, point.plainEnglish, 'explanation', 'header');
      addField(fields, point.explanation, 'explanation', 'basics');
      addField(fields, point.whyItWorks, 'explanation', 'insight');
      addField(fields, point.usageBoundary, 'explanation', 'boundary');
      point.formation.forEach((item) => {
        addField(fields, item.label, 'explanation', 'formation');
        addField(fields, item.formula, 'explanation', 'formation');
        addField(fields, item.explanation, 'explanation', 'formation');
      });
      addField(fields, point.contrast.with, 'explanation', 'contrast');
      addField(fields, point.contrast.explanation, 'explanation', 'contrast');
      point.notes?.forEach((note) => addField(fields, note, 'explanation', 'deeper'));
      point.beyondBasics?.forEach((note) => addField(fields, note, 'explanation', 'deeper'));
      point.examples.forEach((example) => {
        addField(fields, example.japanese, 'japanese', 'examples');
        addField(fields, example.reading, 'japanese', 'examples');
        addField(fields, example.english, 'explanation', 'examples');
      });
      if (point.commonMistake) {
        addField(fields, point.commonMistake.avoid, 'explanation', 'mistake');
        addField(fields, point.commonMistake.prefer, 'explanation', 'mistake');
        addField(fields, point.commonMistake.reason, 'explanation', 'mistake');
      }
      documents.push({
        id: `grammar:${lesson.id}:${point.id}`,
        lessonId: lesson.id,
        lessonNumber: lesson.number,
        lessonTitle: lesson.title,
        kind: 'grammar',
        contentId: point.id,
        title: point.title,
        subtitle: point.pattern,
        order: sourceOrder,
        fields,
      });
      sourceOrder += 1;
    }

    for (const turn of lesson.dialogue) {
      const fields: SearchField[] = [];
      addField(fields, turn.speaker, 'speaker', 'dialogue-line');
      addField(fields, turn.japanese, 'japanese', 'dialogue-line');
      addField(fields, turn.reading, 'japanese', 'dialogue-line');
      addField(fields, turn.english, 'explanation', 'dialogue-line');
      turn.grammarNotes?.forEach((note) => {
        addField(fields, note.explanation, 'explanation', 'grammar-note', note.grammarId);
      });
      documents.push({
        id: `dialogue:${lesson.id}:${turn.id}`,
        lessonId: lesson.id,
        lessonNumber: lesson.number,
        lessonTitle: lesson.title,
        kind: 'dialogue',
        contentId: turn.id,
        title: turn.speaker,
        subtitle: turn.japanese,
        order: sourceOrder,
        fields,
      });
      sourceOrder += 1;
    }
  }

  return documents;
}
