import { describe, expect, it } from 'vitest';

import { Lesson } from '../models/content';
import { VocabularyOverrides } from '../models/vocabulary';
import { VocabularyDraft } from '../services/vocabularyMutations';
import { buildWordEditorValidation } from './wordEditorModel';

const hiddenVocabularyId = 'custom:lesson-01:11111111-1111-4111-8111-111111111111';

const lesson: Lesson = {
  id: 'lesson-01',
  number: 1,
  title: 'Foundations',
  japaneseTitle: '基礎',
  description: 'Test lesson',
  durationMinutes: 10,
  theme: 'Introductions',
  availability: 'ready',
  goals: [],
  grammar: [],
  vocabulary: [
    {
      id: 'course-student',
      japanese: '学生',
      reading: 'がくせい',
      english: 'student',
      partOfSpeech: 'vocabulary',
    },
  ],
  dialogue: [],
  exercises: [],
};

const vocabulary: VocabularyOverrides = {
  recordsByLesson: {
    'lesson-01': [
      {
        lessonId: 'lesson-01',
        createdAt: '2026-07-18T00:00:00.000Z',
        updatedAt: '2026-07-18T00:00:00.000Z',
        sortKey: 'custom:2026-07-18T00:00:00.000Z:11111111-1111-4111-8111-111111111111',
        item: {
          id: hiddenVocabularyId,
          japanese: '図書館',
          reading: 'としょかん',
          english: 'library',
          partOfSpeech: 'vocabulary',
          source: 'custom',
        },
      },
    ],
  },
  hiddenIdsByLesson: { 'lesson-01': [hiddenVocabularyId] },
  updatedAt: '2026-07-18T00:00:00.000Z',
};

const validate = (
  draft: VocabularyDraft,
  overrides: Partial<Parameters<typeof buildWordEditorValidation>[0]> = {},
) => buildWordEditorValidation({
  draft,
  committedJapanese: draft.japanese,
  lesson,
  vocabulary,
  composing: false,
  ...overrides,
});

describe('buildWordEditorValidation', () => {
  it('shows required and kana errors only for committed values', () => {
    expect(validate({ japanese: '', reading: '', english: '' })).toMatchObject({
      canSave: false,
      japaneseError: 'Japanese is required.',
      englishError: 'English is required.',
    });
    expect(validate({ japanese: '漢字', reading: 'kanji', english: 'kanji' })).toMatchObject({
      canSave: false,
      readingError: 'Use kana for the reading.',
    });
  });

  it('autofills a blank reading only for a kana-safe headword', () => {
    expect(validate({ japanese: 'カフェ', reading: '', english: 'cafe' }).normalizedDraft.reading)
      .toBe('カフェ');
    expect(validate({ japanese: '漢字', reading: '', english: 'kanji' }).readingError)
      .toBe('Kana reading is required.');
  });

  it('does not calculate or display duplicate validation during composition', () => {
    const result = validate(
      { japanese: '学生', reading: 'がくせい', english: 'student' },
      { committedJapanese: '新語', composing: true },
    );

    expect(result.normalizedDraft.japanese).toBe('新語');
    expect(result.duplicateError).toBeNull();
    expect(result.canSave).toBe(false);
  });

  it('finds active and hidden duplicates after composition', () => {
    expect(validate({ japanese: '学 生', reading: 'がくせい', english: 'student' }).duplicateError)
      .toBe('This word already exists in Lesson 1.');
    expect(validate({ japanese: '図書館', reading: 'としょかん', english: 'library' }).duplicateError)
      .toBe('This word already exists in Lesson 1.');
  });

  it('excludes the edited vocabulary ID from duplicate validation', () => {
    expect(validate(
      { japanese: '図書館', reading: 'としょかん', english: 'library' },
      { editingId: hiddenVocabularyId },
    ).duplicateError).toBeNull();
  });
});
