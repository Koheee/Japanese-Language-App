import { describe, expect, it } from 'vitest';

import { lessons } from '.';
import { collectGrammarRangeErrors } from './grammarEnrichmentTestUtils';

const rangeExpectation = {
  firstLesson: 1,
  lastLesson: 9,
  grammarPoints: 37,
  examples: 74,
  dialogueTurns: 72,
  dialogueByLesson: { 1: 8, 2: 8, 3: 8, 4: 8, 5: 8, 6: 8, 7: 8, 8: 8, 9: 8 },
} as const;

describe('grammar enrichment for Lessons 1-9', () => {
  it('meets the frozen content and kana contract', () => {
    expect(collectGrammarRangeErrors(rangeExpectation)).toEqual([]);
  });

  it('requires a reading for a kana-only example', () => {
    const example = lessons[0]?.grammar[0]?.examples[0];
    if (!example?.reading) throw new Error('Missing kana-only example fixture');
    const originalReading = example.reading;

    try {
      delete example.reading;
      expect(collectGrammarRangeErrors(rangeExpectation)).toContain(
        'l1-topic-copula: example 1 needs a reading',
      );
    } finally {
      example.reading = originalReading;
    }
  });
});
