import { describe, expect, it } from 'vitest';

import {
  canAutofillReading,
  containsHan,
  containsLatinLetters,
  isKanaReading,
  normalizeVocabularyComparison,
  normalizeVocabularySearch,
} from './vocabularyText';

describe('vocabulary text rules', () => {
  it('normalizes comparison with NFKC and all Unicode whitespace removed', () => {
    expect(normalizeVocabularyComparison(' Ａ　B\nＣ ')).toBe('ABC');
    expect(normalizeVocabularyComparison('カ フェ')).toBe('カフェ');
  });

  it('normalizes search case as well as compatibility and whitespace', () => {
    expect(normalizeVocabularySearch(' Café\u00a0Ａ ')).toBe('caféa');
  });

  it.each([
    ['かな', true], ['カーナ', true], ['ぶん／ぷん', true], ['ことば・２', true],
    ['romaji', false], ['かなA', false], ['漢字', false], ['', false], ['   ', false],
  ])('validates reading %j as %s', (reading, expected) => {
    expect(isKanaReading(reading)).toBe(expected);
  });

  it('distinguishes Han and Latin scripts', () => {
    expect(containsHan('休けい室')).toBe(true);
    expect(containsHan('カフェ')).toBe(false);
    expect(containsHan('々〆〇')).toBe(false);
    expect(containsLatinLetters('CDプレーヤー')).toBe(true);
    expect(containsLatinLetters('シーディー')).toBe(false);
  });

  it.each([
    ['カフェー２', true], ['ぶん／ぷん', true], ['漢字', false],
    ['CD', false], ['かな漢字', false], ['', false],
  ])('autofills %j only for kana-safe headwords', (headword, expected) => {
    expect(canAutofillReading(headword)).toBe(expected);
  });
});
