import { describe, expect, it } from 'vitest';

import { buildSyntheticCollection, syntheticLessons } from './fixtures/syntheticCollection';
import { buildNoteTypeRows } from './ankiPackage';
import { buildPersonalImport } from './buildPersonalImport';
import { parseReadingOverridesJson } from './importVocabulary';

const generatedAt = '2026-07-18T00:00:00.000Z';
const build = (overrides = {}, readingOverrides?: ReadonlyMap<string, string>) => buildPersonalImport({
  collection: buildSyntheticCollection(overrides),
  authoredLessons: syntheticLessons,
  authoredBaselineVersion: 'course-test-abc',
  generatedAt,
  readingOverrides,
});

describe('personal vocabulary importer', () => {
  it('sources ordered field names from normalized synthetic rows', () => {
    expect(buildNoteTypeRows(
      [{ id: 901, name: 'Synthetic note type' }],
      [{ ntid: 901, ord: 2, name: 'Third' }, { ntid: 901, ord: 0, name: 'First' }, { ntid: 901, ord: 1, name: 'Second' }],
    )).toEqual([{ id: 901, name: 'Synthetic note type', fieldNames: ['First', 'Second', 'Third'] }]);
  });

  it('requires one note type with the exact ordered seven fields', () => {
    expect(() => build({ noteTypes: [] })).toThrow(/Expected exactly one note type/);
    expect(() => build({ addSecondMatchingNoteType: true })).toThrow(/Expected exactly one note type/);
    expect(() => build({ fieldNames: ['Word', 'ID', 'Reading', 'Romaji', 'Meaning', 'Category', 'Picture'] })).toThrow(/Expected exactly one note type/);
  });

  it.each([
    [['minna'], 'exactly one lessonNN tag'],
    [['lesson1'], 'malformed lesson tag'],
    [['lesson01', 'lesson02'], 'exactly one lessonNN tag'],
  ])('rejects invalid lesson tags %j', (tags, message) => {
    expect(() => build({ firstNoteTags: tags })).toThrow(message);
  });

  it('uses odid when nonzero and diagnoses every mismatched card', () => {
    expect(() => build({ firstCardDidLesson: 2, firstCardOdidLesson: 0 })).toThrow(/card .* expected .*L01/);
    expect(build({ firstCardDidLesson: 2, firstCardOdidLesson: 1 }).records).toHaveLength(4);
  });

  it('strips sound, image, HTML, controls, and whitespace while ignoring romaji and picture', () => {
    const record = build({ decorateFirstFields: true }).records[0];
    expect(record?.item).toMatchObject({ japanese: 'あさ', reading: 'あさ', english: 'morning', category: 'Time' });
    expect(JSON.stringify(record)).not.toMatch(/sound:|<img|<b>|asa-romaji|fixture\.png/);
  });

  it('autofills only kana-safe blanks and rejects Han, Latin, and mixed-script blank readings', () => {
    expect(build({ blankReadingWord: 'カーナ２' }).records[0]?.item.reading).toBe('カーナ２');
    expect(() => build({ blankReadingWord: '朝' })).toThrow(/explicit kana reading/);
    expect(() => build({ blankReadingWord: 'CD' })).toThrow(/explicit kana reading/);
    expect(() => build({ blankReadingWord: 'かな朝' })).toThrow(/explicit kana reading/);
  });

  it('uses an explicit synthetic override only for an unsafe blank reading', () => {
    const overrides = new Map([['L01-2', 'かくうご']]);
    expect(build({ blankReadingWord: '架空語' }, overrides).records[0]?.item.reading).toBe('かくうご');
  });

  it('rejects invalid, stale, duplicate, and inapplicable synthetic overrides', () => {
    expect(() => build({ blankReadingWord: '架空語' }, new Map([['L01-2', 'not-kana']]))).toThrow(/valid kana reading/);
    expect(() => build({ blankReadingWord: '架空語' }, new Map([['L99-9', 'かくうご']]))).toThrow(/unknown/);
    expect(() => build({}, new Map([['L01-2', 'かくうご']]))).toThrow(/unused or inapplicable/);
    expect(() => parseReadingOverridesJson('{"L01-2":"かくうご","L01-2":"かくご"}')).toThrow(/duplicate/);
  });

  it('sorts numeric source IDs before duplicate filtering and keeps the lower invented ID', () => {
    const file = build({ addInventedInternalDuplicate: true });
    expect(file.records.filter(({ item }) => item.japanese === 'ねこ').map(({ item }) => item.sourceId)).toEqual(['L01-1']);
    expect(file.generation?.skippedEarlierPersonalCount).toBe(1);
  });

  it('skips normalized same-lesson authored and earlier personal words but permits cross-lesson words', () => {
    const file = build({ includeSameLessonAuthoredDuplicate: true, includeCrossLessonOccurrence: true });
    expect(file.generation).toMatchObject({ skippedAuthoredCount: 1, skippedEarlierPersonalCount: 0 });
    expect(file.records.some(({ lessonId, item }) => lessonId === 'lesson-02' && item.japanese === syntheticLessons[0]?.vocabulary[0]?.japanese)).toBe(true);
  });

  it('skips an authored duplicate before validating an unneeded blank reading', () => {
    expect(build({ includeSameLessonAuthoredBlankReading: true }).generation?.skippedAuthoredCount).toBe(1);
  });

  it('cleans the English category portion and emits stable IDs, numeric sort keys, counts, and checksum', () => {
    const file = build();
    expect(file).toMatchObject({
      format: 'nihongo-path-vocabulary-backup', schemaVersion: 1, exportedAt: generatedAt,
      authoredBaselineVersion: 'course-test-abc', hidden: [], reviewCards: [],
    });
    expect(file.records.map(({ item, sortKey }) => [item.id, item.sourceId, sortKey])).toEqual([
      ['personal-deck:lesson-01:2', 'L01-2', 'personal-deck:00000002'],
      ['personal-deck:lesson-01:10', 'L01-10', 'personal-deck:00000010'],
      ['personal-deck:lesson-02:1', 'L02-1', 'personal-deck:00000001'],
      ['personal-deck:lesson-02:3', 'L02-3', 'personal-deck:00000003'],
    ]);
    expect(file.generation?.acceptedByLesson).toEqual({ 'lesson-01': 2, 'lesson-02': 2 });
    expect(file.generation?.sourceByLesson).toEqual({ 'lesson-01': 2, 'lesson-02': 2 });
    expect(file.generation?.checksumSha256).toMatch(/^[a-f0-9]{64}$/);
  });
});
