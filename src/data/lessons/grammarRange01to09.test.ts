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

  it('requires formation, contrast, and one contextual note per tagged dialogue use', () => {
    const point = lessons[0]!.grammar[0]!;
    const turn = lessons[0]!.dialogue.find(({ grammarIds }) => grammarIds?.includes(point.id))!;
    const formation = point.formation;
    const contrast = point.contrast;
    const grammarNotes = turn.grammarNotes;

    try {
      point.formation = [];
      point.contrast = undefined;
      turn.grammarNotes = [];
      const errors = collectGrammarRangeErrors(rangeExpectation);
      expect(errors).toContain(`${point.id}: formation is missing`);
      expect(errors).toContain(`${point.id}: contrast is missing`);
      expect(errors).toContain(`${turn.id}: needs one note for ${point.id}`);
    } finally {
      point.formation = formation;
      point.contrast = contrast;
      turn.grammarNotes = grammarNotes;
    }
  });

  it('rejects a same-lesson grammar note that is not tagged on its dialogue turn', () => {
    const point = lessons[0]!.grammar[0]!;
    const otherPoint = lessons[0]!.grammar.find(({ id }) => id !== point.id)!;
    const turn = lessons[0]!.dialogue.find(({ grammarIds }) => grammarIds?.includes(point.id))!;
    const grammarNotes = turn.grammarNotes;

    try {
      turn.grammarNotes = [{ grammarId: otherPoint.id, explanation: 'This note is deliberately extra.' }];
      expect(collectGrammarRangeErrors(rangeExpectation)).toContain(
        `${turn.id}: untagged note ID ${otherPoint.id}`,
      );
    } finally {
      turn.grammarNotes = grammarNotes;
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

  it('teaches early particles with distinct, progression-safe mental models', () => {
    const points = new Map(lessons.slice(0, 9).flatMap(({ grammar }) =>
      grammar.map((point) => [point.id, point] as const)));

    expect(points.get('l1-topic-copula')?.formation).toContainEqual({
      label: 'Polite noun sentence',
      formula: 'topic + は + identity/category + です',
      explanation: 'Choose what the conversation is about, then finish with the noun that identifies or classifies it.',
    });
    expect(points.get('l1-topic-copula')?.contrast).toEqual({
      with: 'は compared with が',
      explanation: 'Use は to choose or contrast a topic as the message frame; が can single out which person or thing fits an identity, a role only previewed here.',
    });
    expect(points.get('l5-destination')?.contrast?.with).toBe('へ compared with に');
    expect(points.get('l6-object')?.contrast?.with).toBe('を compared with は');
    expect(points.get('l9-preference')?.contrast?.with).toBe('好きです compared with an English action verb');
  });

  it('separates polite direction statements from questions in the formation', () => {
    const point = lessons
      .find(({ number }) => number === 3)
      ?.grammar.find(({ id }) => id === 'l3-polite-direction');

    expect(point?.formation).toEqual([
      {
        label: 'Polite direction statement',
        formula: 'こちら／そちら／あちら + です',
        explanation: 'Choose the polite direction matching the speaker, listener, or distant zone, then add です to guide or identify courteously.',
      },
      {
        label: 'Polite direction question',
        formula: 'どちら + ですか',
        explanation: 'Use どちら in the unknown direction slot and add ですか to ask courteously where or which way.',
      },
    ]);
  });

  it('keeps an unstated comparison partner unstated in the Lesson 1 inclusion note', () => {
    const note = lessons[0]?.dialogue
      .find(({ id }) => id === 'l1-d07')
      ?.grammarNotes?.find(({ grammarId }) => grammarId === 'l1-also');

    expect(note?.explanation).toBe(
      'Emma uses も to compare Noah with an unstated Canadian person supplied by the wider context, not by the visible exchange.',
    );
  });

  it('translates the Lesson 4 work-schedule question naturally', () => {
    const question = lessons
      .find(({ number }) => number === 4)
      ?.dialogue.find(({ id }) => id === 'l4-d03');

    expect(question?.english).toBe('What time does your radio job start?');
  });
});
