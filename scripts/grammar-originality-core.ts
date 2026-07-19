import type { GrammarPoint, Lesson } from '../src/models/content';

export const ORIGINALITY_MIN_TOKENS = 12;

export interface OriginalityTextUnit {
  id: string;
  text: string;
}

export interface GrammarProseRecord {
  id: string;
  fields: string[];
}

export interface OriginalityOverlap {
  phrase: string;
  appIds: string[];
  sourceIds: string[];
}

const TOKEN_PATTERN = /[\p{Script=Latin}\p{N}]+(?:['\u2019][\p{Script=Latin}\p{N}]+)*|[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu;

export const tokenizeOriginalityText = (text: string): string[] =>
  text
    .normalize('NFKC')
    .toLowerCase()
    .replaceAll('\u2019', "'")
    .match(TOKEN_PATTERN) ?? [];

const ngramsFor = (text: string, minimumTokens: number): string[] => {
  const tokens = tokenizeOriginalityText(text);
  const phrases: string[] = [];
  for (let index = 0; index <= tokens.length - minimumTokens; index += 1) {
    phrases.push(tokens.slice(index, index + minimumTokens).join(' '));
  }
  return phrases;
};

const grammarProseFields = (point: GrammarPoint): string[] => [
  point.title,
  point.plainEnglish,
  point.explanation,
  point.whyItWorks,
  point.usageBoundary,
  ...(point.notes ?? []),
  ...(point.commonMistake
    ? [point.commonMistake.avoid, point.commonMistake.prefer, point.commonMistake.reason]
    : []),
];

export const collectGrammarProseRecords = (
  lessons: readonly Lesson[],
): GrammarProseRecord[] => lessons.flatMap((lesson) =>
  lesson.grammar.map((point) => ({ id: point.id, fields: grammarProseFields(point) })));

export const findCrossRecordOverlaps = (
  records: readonly GrammarProseRecord[],
  minimumTokens = ORIGINALITY_MIN_TOKENS,
): Array<{ phrase: string; recordIds: string[] }> => {
  const owners = new Map<string, Set<string>>();
  for (const record of records) {
    const recordPhrases = new Set(record.fields.flatMap((field) => ngramsFor(field, minimumTokens)));
    for (const phrase of recordPhrases) {
      const recordIds = owners.get(phrase) ?? new Set<string>();
      recordIds.add(record.id);
      owners.set(phrase, recordIds);
    }
  }
  return [...owners.entries()]
    .filter(([, recordIds]) => recordIds.size > 1)
    .map(([phrase, recordIds]) => ({ phrase, recordIds: [...recordIds].sort() }))
    .sort((left, right) => left.phrase.localeCompare(right.phrase, 'en'));
};

const ownersByPhrase = (
  units: readonly OriginalityTextUnit[],
  minimumTokens: number,
): Map<string, Set<string>> => {
  const owners = new Map<string, Set<string>>();
  for (const unit of units) {
    for (const phrase of new Set(ngramsFor(unit.text, minimumTokens))) {
      const ids = owners.get(phrase) ?? new Set<string>();
      ids.add(unit.id);
      owners.set(phrase, ids);
    }
  }
  return owners;
};

export const findCrossCorpusOverlaps = (
  appFields: readonly OriginalityTextUnit[],
  sourceFiles: readonly OriginalityTextUnit[],
  minimumTokens = ORIGINALITY_MIN_TOKENS,
): OriginalityOverlap[] => {
  const appOwners = ownersByPhrase(appFields, minimumTokens);
  const sourceOwners = ownersByPhrase(sourceFiles, minimumTokens);
  return [...appOwners.entries()]
    .filter(([phrase]) => sourceOwners.has(phrase))
    .map(([phrase, appIds]) => ({
      phrase,
      appIds: [...appIds].sort(),
      sourceIds: [...sourceOwners.get(phrase)!].sort(),
    }))
    .sort((left, right) => left.phrase.localeCompare(right.phrase, 'en'));
};

const addField = (
  fields: OriginalityTextUnit[],
  id: string,
  text: string | undefined,
) => {
  if (text?.trim()) fields.push({ id, text });
};

export const collectAppOriginalityFields = (
  lessons: readonly Lesson[],
): OriginalityTextUnit[] => {
  const fields: OriginalityTextUnit[] = [];
  for (const lesson of lessons) {
    for (const point of lesson.grammar) {
      addField(fields, `${point.id}.title`, point.title);
      addField(fields, `${point.id}.pattern`, point.pattern);
      addField(fields, `${point.id}.plainEnglish`, point.plainEnglish);
      addField(fields, `${point.id}.explanation`, point.explanation);
      addField(fields, `${point.id}.whyItWorks`, point.whyItWorks);
      addField(fields, `${point.id}.usageBoundary`, point.usageBoundary);
      point.notes?.forEach((text, index) => addField(fields, `${point.id}.notes[${index}]`, text));
      if (point.commonMistake) {
        addField(fields, `${point.id}.commonMistake.avoid`, point.commonMistake.avoid);
        addField(fields, `${point.id}.commonMistake.prefer`, point.commonMistake.prefer);
        addField(fields, `${point.id}.commonMistake.reason`, point.commonMistake.reason);
      }
      point.examples.forEach((example, index) => {
        addField(fields, `${point.id}.examples[${index}].japanese`, example.japanese);
        addField(fields, `${point.id}.examples[${index}].reading`, example.reading);
        addField(fields, `${point.id}.examples[${index}].english`, example.english);
      });
    }
    for (const turn of lesson.dialogue) {
      addField(fields, `${turn.id}.japanese`, turn.japanese);
      addField(fields, `${turn.id}.reading`, turn.reading);
      addField(fields, `${turn.id}.english`, turn.english);
    }
    for (const exercise of lesson.exercises) {
      addField(fields, `${exercise.id}.prompt`, exercise.prompt);
      addField(fields, `${exercise.id}.explanation`, exercise.explanation);
      if (exercise.type === 'fill-blank') {
        addField(fields, `${exercise.id}.sentence`, exercise.sentence);
        addField(fields, `${exercise.id}.hint`, exercise.hint);
        exercise.acceptedAnswers.forEach((text, index) =>
          addField(fields, `${exercise.id}.acceptedAnswers[${index}]`, text));
      } else if (exercise.type === 'translation') {
        exercise.acceptedAnswers.forEach((text, index) =>
          addField(fields, `${exercise.id}.acceptedAnswers[${index}]`, text));
        exercise.wordBank?.forEach((text, index) =>
          addField(fields, `${exercise.id}.wordBank[${index}]`, text));
      } else {
        exercise.options.forEach((option, index) =>
          addField(fields, `${exercise.id}.options[${index}]`, option.label));
        if (exercise.type === 'listening') {
          addField(fields, `${exercise.id}.transcript`, exercise.transcript);
        }
      }
    }
  }
  return fields;
};
