import { Lesson } from '../models/content';
import { VocabularyOverrides } from '../models/vocabulary';
import {
  VocabularyDraft,
  validateVocabularyDraft,
} from '../services/vocabularyMutations';
import { findLessonDuplicate } from '../services/vocabularyResolver';

export interface WordEditorValidation {
  normalizedDraft: VocabularyDraft;
  japaneseError: string | null;
  readingError: string | null;
  englishError: string | null;
  duplicateError: string | null;
  canSave: boolean;
}

interface WordEditorValidationInput {
  draft: VocabularyDraft;
  committedJapanese: string;
  lesson: Lesson;
  vocabulary: VocabularyOverrides;
  editingId?: string;
  composing: boolean;
}

const readingMessageFor = (cause: unknown): string | null => {
  if (!(cause instanceof Error)) return 'Use kana for the reading.';
  if (cause.message === 'Kana reading is required') return 'Kana reading is required.';
  if (cause.message === 'Reading must use kana') return 'Use kana for the reading.';
  return null;
};

export const buildWordEditorValidation = ({
  draft,
  committedJapanese,
  lesson,
  vocabulary,
  editingId,
  composing,
}: WordEditorValidationInput): WordEditorValidation => {
  const candidate: VocabularyDraft = { ...draft, japanese: committedJapanese };
  const japanese = committedJapanese.trim();
  const english = draft.english.trim();
  const category = draft.category?.trim() ?? '';
  let normalizedDraft: VocabularyDraft = {
    japanese,
    reading: draft.reading.trim(),
    english,
    ...(category ? { category } : {}),
  };
  const japaneseError = japanese ? null : 'Japanese is required.';
  const englishError = english ? null : 'English is required.';
  let readingError: string | null = null;

  if (japanese) {
    try {
      const readingValidated = validateVocabularyDraft({
        ...candidate,
        english: english || 'validation placeholder',
      });
      normalizedDraft = { ...readingValidated, english };
    } catch (cause) {
      readingError = readingMessageFor(cause);
    }
  }

  if (!japaneseError && !readingError && !englishError) {
    normalizedDraft = validateVocabularyDraft(candidate);
  }

  const duplicate = !composing && japanese
    ? findLessonDuplicate({
      lesson,
      vocabulary,
      japanese,
      excludeVocabularyId: editingId,
    })
    : undefined;
  const duplicateError = duplicate
    ? `This word already exists in Lesson ${lesson.number}.`
    : null;

  return {
    normalizedDraft,
    japaneseError,
    readingError,
    englishError,
    duplicateError,
    canSave: !composing
      && !japaneseError
      && !readingError
      && !englishError
      && !duplicateError,
  };
};
