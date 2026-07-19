import { describe, expect, it } from 'vitest';

import { collectGrammarRangeErrors } from './grammarEnrichmentTestUtils';

describe('grammar enrichment for Lessons 10-17', () => {
  it('meets the frozen content and kana contract', () => {
    expect(collectGrammarRangeErrors({
      firstLesson: 10,
      lastLesson: 17,
      grammarPoints: 32,
      examples: 64,
      dialogueTurns: 53,
      dialogueByLesson: { 10: 6, 11: 6, 12: 6, 13: 6, 14: 7, 15: 7, 16: 7, 17: 8 },
    })).toEqual([]);
  });
});
