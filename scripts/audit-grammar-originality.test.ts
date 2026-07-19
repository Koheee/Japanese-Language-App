import { describe, expect, it } from 'vitest';

import {
  ORIGINALITY_MIN_TOKENS,
  findCrossCorpusOverlaps,
  tokenizeOriginalityText,
} from './grammar-originality-core';
import { parseGrammarOriginalityArguments } from './audit-grammar-originality';

describe('grammar originality audit core', () => {
  it('accepts the package-manager argument separator before the explicit source directory', () => {
    expect(parseGrammarOriginalityArguments(['--', '--source', './checked-out-source']))
      .toMatch(/[\\/]checked-out-source$/u);
  });

  it('normalizes NFKC, case, apostrophes, punctuation, and Japanese into deterministic tokens', () => {
    expect(tokenizeOriginalityText("\uFF37\uFF45\u2019\uFF32\uFF25 checking \u306A\u3044\u3002")).toEqual([
      "we're",
      'checking',
      '\u306A',
      '\u3044',
    ]);
  });

  it('finds a threshold-length cross-corpus phrase in synthetic app and source strings', () => {
    const phrase = 'one two three four five six seven eight nine ten eleven twelve';
    const overlaps = findCrossCorpusOverlaps(
      [{ id: 'app:explanation', text: `App introduction. ${phrase}. Original close.` }],
      [{ id: 'source/page.md', text: `Source preface \u2014 ${phrase.toUpperCase()}! Source close.` }],
    );

    expect(ORIGINALITY_MIN_TOKENS).toBe(12);
    expect(overlaps).toEqual([{
      phrase,
      appIds: ['app:explanation'],
      sourceIds: ['source/page.md'],
    }]);
  });

  it('does not report shorter, reordered, or within-app-only synthetic similarities', () => {
    const elevenTokens = 'one two three four five six seven eight nine ten eleven';
    expect(findCrossCorpusOverlaps(
      [
        { id: 'app:a', text: `${elevenTokens} twelve` },
        { id: 'app:b', text: `${elevenTokens} twelve` },
      ],
      [{ id: 'source/page.md', text: `${elevenTokens} changed twelve` }],
    )).toEqual([]);
  });
});
