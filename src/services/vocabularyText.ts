const HAN = /\p{Unified_Ideograph}/u;
const LATIN = /\p{Script=Latin}/u;
const KANA = /[\p{Script=Hiragana}\p{Script=Katakana}]/u;
// NFKC turns full-width tilde, slash, brackets, and sentence punctuation into
// their ASCII compatibility forms, so both spellings are allowed here.
const ALLOWED_READING = /^[\p{Script=Hiragana}\p{Script=Katakana}\p{Number}\p{White_Space}々〆〇ヽヾゝゞー・、。，．！？「」『』（）［］｛｝〈〉《》【】〔〕〜～…‥／~\/()[\]{}!?.,]+$/u;

export const normalizeVocabularyComparison = (value: string): string =>
  value.normalize('NFKC').replace(/\p{White_Space}/gu, '');

export const normalizeVocabularySearch = (value: string): string =>
  normalizeVocabularyComparison(value).toLocaleLowerCase();

export const containsHan = (value: string): boolean => HAN.test(value.normalize('NFKC'));
export const containsLatinLetters = (value: string): boolean => LATIN.test(value.normalize('NFKC'));

export const isKanaReading = (value: string): boolean => {
  const normalized = value.normalize('NFKC');
  return normalized.trim().length > 0
    && !containsLatinLetters(normalized)
    && !containsHan(normalized)
    && KANA.test(normalized)
    && ALLOWED_READING.test(normalized);
};

export const canAutofillReading = (headword: string): boolean => isKanaReading(headword);
