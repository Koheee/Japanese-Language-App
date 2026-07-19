import type { AnkiNoteTypeRow } from '../ankiPackage';

export interface SyntheticCollectionOverrides {
  noteTypes?: AnkiNoteTypeRow[];
  addSecondMatchingNoteType?: boolean;
  fieldNames?: string[];
  firstNoteTags?: string[];
  firstCardDidLesson?: number;
  firstCardOdidLesson?: number;
  decorateFirstFields?: boolean;
  blankReadingWord?: string;
  addInventedInternalDuplicate?: boolean;
  addNumericSourceIdAlias?: boolean;
  includeSameLessonAuthoredDuplicate?: boolean;
  includeSameLessonAuthoredBlankReading?: boolean;
  includeCrossLessonOccurrence?: boolean;
}

const separator = '\u001f';

const noteTypes = [{
  id: 101,
  name: 'Synthetic vocabulary note',
  fieldNames: ['ID', 'Word', 'Reading', 'Romaji', 'Meaning', 'Category', 'Picture'],
}];

const decks = [
  { id: 1, name: 'Synthetic::L01 第1課' },
  { id: 2, name: 'Synthetic::L02 第2課' },
];

export const syntheticLessons = [
  { id: 'lesson-01', vocabulary: [{ japanese: '既存語' }] },
  { id: 'lesson-02', vocabulary: [] },
] as const;

export const buildSyntheticCollection = (overrides: SyntheticCollectionOverrides = {}) => {
  const fields = overrides.decorateFirstFields
    ? ['L01-2', '  [sound:clip.mp3] あさ <b> ', ' <img src="x">あさ ', 'asa-romaji', ' <b>morning</b> ', 'Synthetic / Time', 'fixture.png']
    : ['L01-2', 'あさ', 'あさ', 'asa', 'morning', 'Synthetic / Time', 'fixture.png'];
  if (overrides.blankReadingWord !== undefined) fields[1] = overrides.blankReadingWord;
  if (overrides.blankReadingWord !== undefined) fields[2] = '';

  const notes = [
    { id: 4002, noteTypeId: 101, tags: overrides.firstNoteTags ?? ['lesson01'], fields: fields.join(separator) },
    { id: 4010, noteTypeId: 101, tags: ['lesson01'], fields: ['L01-10', 'ねこ', 'ねこ', 'neko', 'cat', 'Synthetic / Animal', 'cat.png'].join(separator) },
    { id: 5001, noteTypeId: 101, tags: ['lesson02'], fields: ['L02-1', 'いぬ', 'いぬ', 'inu', 'dog', 'Synthetic / Animal', 'dog.png'].join(separator) },
    { id: 5003, noteTypeId: 101, tags: ['lesson02'], fields: ['L02-3', 'やま', 'やま', 'yama', 'mountain', 'Synthetic / Place', 'mountain.png'].join(separator) },
  ];
  const cards = [
    { id: 6002, noteId: 4002, did: overrides.firstCardDidLesson ?? 1, odid: overrides.firstCardOdidLesson ?? 0 },
    { id: 6010, noteId: 4010, did: 1, odid: 0 },
    { id: 7001, noteId: 5001, did: 2, odid: 0 },
    { id: 7003, noteId: 5003, did: 2, odid: 0 },
  ];
  if (overrides.addInventedInternalDuplicate) {
    notes.push({ id: 3999, noteTypeId: 101, tags: ['lesson01'], fields: ['L01-1', 'ねこ', 'ねこ', 'neko-two', 'cat-two', 'Synthetic / Animal', 'cat-two.png'].join(separator) });
    cards.push({ id: 5999, noteId: 3999, did: 1, odid: 0 });
  }
  if (overrides.addNumericSourceIdAlias) {
    notes.push({ id: 4006, noteTypeId: 101, tags: ['lesson01'], fields: ['L01-02', 'いす', 'いす', 'isu', 'chair', 'Synthetic / Object', 'chair.png'].join(separator) });
    cards.push({ id: 6006, noteId: 4006, did: 1, odid: 0 });
  }
  if (overrides.includeSameLessonAuthoredDuplicate) {
    notes.push({ id: 4004, noteTypeId: 101, tags: ['lesson01'], fields: ['L01-4', '既存語', 'きぞんご', 'existing', 'existing', 'Synthetic / Other', 'existing.png'].join(separator) });
    cards.push({ id: 6004, noteId: 4004, did: 1, odid: 0 });
  }
  if (overrides.includeSameLessonAuthoredBlankReading) {
    notes.push({ id: 4005, noteTypeId: 101, tags: ['lesson01'], fields: ['L01-5', '既存語', '', 'existing', 'existing', 'Synthetic / Other', 'existing-empty.png'].join(separator) });
    cards.push({ id: 6005, noteId: 4005, did: 1, odid: 0 });
  }
  if (overrides.includeCrossLessonOccurrence) {
    notes.push({ id: 5004, noteTypeId: 101, tags: ['lesson02'], fields: ['L02-4', '既存語', 'きぞんご', 'existing', 'existing', 'Synthetic / Other', 'cross.png'].join(separator) });
    cards.push({ id: 7004, noteId: 5004, did: 2, odid: 0 });
  }
  return {
    noteTypes: overrides.noteTypes ?? (overrides.addSecondMatchingNoteType ? [...noteTypes, { ...noteTypes[0]!, id: 102 }] : [{ ...noteTypes[0]!, fieldNames: overrides.fieldNames ?? noteTypes[0]!.fieldNames }]),
    decks,
    notes,
    cards,
  };
};
