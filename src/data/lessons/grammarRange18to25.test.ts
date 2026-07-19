import { describe, expect, it } from 'vitest';

import { collectGrammarRangeErrors } from './grammarEnrichmentTestUtils';

describe('grammar enrichment for Lessons 18-25', () => {
  it('meets the frozen content and kana contract', () => {
    expect(collectGrammarRangeErrors({
      firstLesson: 18,
      lastLesson: 25,
      grammarPoints: 32,
      examples: 64,
      dialogueTurns: 48,
      dialogueByLesson: { 18: 6, 19: 6, 20: 6, 21: 6, 22: 6, 23: 6, 24: 6, 25: 6 },
    })).toEqual([]);
  });
});
