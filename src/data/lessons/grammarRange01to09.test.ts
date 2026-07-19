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

  it('keeps the Lesson 6 invitation reply within the taught progression', () => {
    const reply = lessons
      .find(({ number }) => number === 6)
      ?.dialogue.find(({ id }) => id === 'l6-d04');

    expect(reply).toMatchObject({
      id: 'l6-d04',
      speaker: 'Mei',
      japanese: 'いいですね。ぜひ 見ましょう。',
      reading: 'いいですね。ぜひ みましょう。',
      english: 'That sounds good. Let’s definitely watch it.',
    });
  });

  it('uses a supported skill focus in the Lesson 9 dialogue', () => {
    const question = lessons
      .find(({ number }) => number === 9)
      ?.dialogue.find(({ id }) => id === 'l9-d03');

    expect(question).toMatchObject({
      id: 'l9-d03',
      speaker: 'Hana',
      japanese: 'ギターが じょうずですか。',
      reading: 'ギターが じょうずですか。',
      english: 'Are you good at guitar?',
    });
  });

  it('keeps early prose and headings aligned with the taught progression', () => {
    const points = new Map(
      lessons
        .filter(({ number }) => number === 4 || number === 9)
        .flatMap(({ grammar }) => grammar.map((point) => [point.id, point] as const)),
    );

    expect(points.get('l4-past')?.whyItWorks).toBe(
      'Japanese places tense and polarity together in the polite ending. Across the four-form grid, the final shape tells the listener both that the time is past and whether the event happened.',
    );
    expect(points.get('l4-time-ni')?.examples[1]).toEqual({
      japanese: 'あした やすみます。',
      reading: 'あした やすみます。',
      english: 'I will rest tomorrow.',
    });
    expect(points.get('l9-reason')?.title).toBe('State a reason before its conclusion');
  });

  it('translates the Lesson 4 work-schedule question naturally', () => {
    const question = lessons
      .find(({ number }) => number === 4)
      ?.dialogue.find(({ id }) => id === 'l4-d03');

    expect(question?.english).toBe('What time does your radio job start?');
  });
});
