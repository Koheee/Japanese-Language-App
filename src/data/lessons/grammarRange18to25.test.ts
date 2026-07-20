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

  it('distinguishes plain forms, clause modification, and conditional viewpoint', () => {
    const points = new Map(lessons.slice(17).flatMap(({ grammar }) =>
      grammar.map((point) => [point.id, point] as const)));

    expect(points.get('l20-plain-verbs')?.contrast?.with).toBe('plain form compared with polite ます form');
    expect(points.get('l22-relative-clause')?.formation?.some(({ formula }) => formula.endsWith('+ noun'))).toBe(true);
    expect(points.get('l23-automatic-to')?.contrast?.with).toBe('と compared with たら');
    expect(points.get('l25-tara-condition')?.contrast?.with).toBe('たら compared with automatic-result と');
  });

  it('keeps Lesson 18 dictionary-form examples inside connector-ready constructions', () => {
    const point = lessons
      .find(({ number }) => number === 18)
      ?.grammar.find(({ id }) => id === 'l18-dictionary-form');
    if (!point) throw new Error('Missing l18-dictionary-form');

    expect(point.usageBoundary).toBe(
      'Use this connector-ready nonpast base before こと and まえに. The form itself is not inherently rude; relationship and sentence ending determine register. Productive potential conjugation, potential-particle changes, and 見える／聞こえる remain outside this lesson.',
    );
    expect(point.examples).toEqual([
      {
        japanese: 'こうりゅうかいで おりがみを おしえることが できます。',
        reading: 'こうりゅうかいで おりがみを おしえることが できます。',
        english: 'I can teach origami at the exchange event.',
      },
      {
        japanese: 'うちを でるまえに、かさを かばんに いれます。',
        reading: 'うちを でるまえに、かさを かばんに いれます。',
        english: 'Before leaving home, I put an umbrella in my bag.',
      },
    ]);
  });

  it('names Japanese direct-quotation punctuation precisely', () => {
    const note = lessons
      .find(({ number }) => number === 21)
      ?.dialogue.find(({ id }) => id === 'l21-d05')
      ?.grammarNotes?.find(({ grammarId }) => grammarId === 'l21-say');

    expect(note?.explanation).toBe(
      'The quotation marks present the staff’s request as quoted wording, and the following と marks exactly where that quotation ends.',
    );
  });

  it('spells out every negative ても connection', () => {
    const point = lessons
      .find(({ number }) => number === 25)
      ?.grammar.find(({ id }) => id === 'l25-even-if');
    if (!point) throw new Error('Missing l25-even-if');

    expect(point.formation.find(({ label }) => label === 'Negative concession')).toEqual({
      label: 'Negative concession',
      formula: 'Vない → Vなくても ／ いAくない → いAくなくても ／ なAじゃない・Nじゃない → なA・Nじゃなくても',
      explanation: 'In every negative pattern, change the final ない to なくても. That produces Vなくても and いAくなくても; after a な-adjective or noun, じゃない becomes じゃなくても before the result that still holds.',
    });
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

  it('keeps the Lesson 25 opening within the approved conditional scope', () => {
    const opening = lessons
      .find(({ number }) => number === 25)
      ?.dialogue.find(({ id }) => id === 'l25-d01');

    expect(opening).toMatchObject({
      id: 'l25-d01',
      speaker: 'Aya',
      japanese: 'らいげつ、おおさかへ てんきんします。',
      reading: 'らいげつ、おおさかへ てんきんします。',
      english: 'I’m transferring to Osaka next month.',
    });
  });
});
