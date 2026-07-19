import { describe, expect, it } from 'vitest';

import { collectGrammarRangeErrors } from './grammarEnrichmentTestUtils';

describe('grammar enrichment for Lessons 1-9', () => {
  it('meets the frozen content and kana contract', () => {
    expect(collectGrammarRangeErrors({
      firstLesson: 1,
      lastLesson: 9,
      grammarPoints: 37,
      examples: 74,
      dialogueTurns: 72,
      dialogueByLesson: { 1: 8, 2: 8, 3: 8, 4: 8, 5: 8, 6: 8, 7: 8, 8: 8, 9: 8 },
    })).toEqual([]);
  });
});
