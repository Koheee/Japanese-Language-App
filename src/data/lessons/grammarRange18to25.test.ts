import { describe, expect, it } from 'vitest';

import { lessons } from '.';
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

  it('treats どうしたの？ receptively without teaching productive explanatory の', () => {
    const point = lessons
      .find(({ number }) => number === 20)
      ?.grammar.find(({ id }) => id === 'l20-casual-questions');
    if (!point) throw new Error('Missing l20-casual-questions');

    const guidance = [point.usageBoundary, ...(point.notes ?? [])].join(' ');
    expect(guidance).toContain('どうしたの？');
    expect(guidance).toContain('fixed receptive expression');
    expect(guidance).toContain('What’s up?');
    expect(guidance).toContain('What happened?');
    expect(guidance).toMatch(/productive explanatory question-final の remains deferred/i);
  });

  it('includes a completed-たら discovery rather than only intended next actions', () => {
    const point = lessons
      .find(({ number }) => number === 25)
      ?.grammar.find(({ id }) => id === 'l25-after-tara');
    if (!point) throw new Error('Missing l25-after-tara');

    expect(point.examples).toEqual(expect.arrayContaining([
      expect.objectContaining({
        japanese: expect.stringMatching(/たら/),
        reading: expect.stringMatching(/たら/),
        english: expect.stringMatching(/\b(?:found|discovered|realized|noticed)\b/i),
      }),
    ]));
  });
});
