import { describe, expect, it } from 'vitest';

import { lessons } from './lessons';
import {
  getGrammarReferences,
  grammarReferences,
} from './grammarReferences';
import { FROZEN_GRAMMAR_IDS } from './lessons/grammarInventory';

describe('grammarReferences', () => {
  it('matches the frozen 101 grammar IDs in exported lesson order', () => {
    const actualIds = lessons.flatMap((lesson) => lesson.grammar.map((point) => point.id));
    expect(actualIds).toHaveLength(101);
    expect(actualIds).toEqual(FROZEN_GRAMMAR_IDS);
    expect(Object.keys(grammarReferences)).toEqual(FROZEN_GRAMMAR_IDS);
  });

  it('uses only explicit official learner pages and has no within-point duplicate', () => {
    for (const grammarId of FROZEN_GRAMMAR_IDS) {
      const references = getGrammarReferences(grammarId);
      expect(new Set(references.map(({ url }) => url)).size).toBe(references.length);
      for (const reference of references) {
        const url = new URL(reference.url);
        expect(url.protocol).toBe('https:');
        expect(url.hostname).toBe('guidetojapanese.org');
        expect(url.pathname).toMatch(/^\/learn\/grammar\/[a-z_]+$/);
        expect(reference.title).toMatch(/^Tae Kim's Guide: /);
      }
    }
  });

  it('attaches an independent manifest copy to every exported point', () => {
    for (const point of lessons.flatMap((lesson) => lesson.grammar)) {
      const references = getGrammarReferences(point.id);
      if (references.length) {
        expect(point.furtherReading).toEqual(references);
        expect(point.furtherReading).not.toBe(references);
      } else {
        expect(point).not.toHaveProperty('furtherReading');
      }
    }
  });

  it('throws rather than silently accepting an unregistered grammar ID', () => {
    expect(() => getGrammarReferences('l99-not-real')).toThrowError(
      'Missing grammar reference manifest entry: l99-not-real',
    );
  });
});
