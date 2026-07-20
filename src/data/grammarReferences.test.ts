import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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
    const allowedReference = (title: string, url: URL) =>
      (url.hostname === 'guidetojapanese.org' && title.startsWith("Tae Kim's Guide: "))
      || (url.hostname === 'www.tofugu.com' && title.startsWith('Tofugu: '));

    for (const grammarId of FROZEN_GRAMMAR_IDS) {
      const references = getGrammarReferences(grammarId);
      expect(new Set(references.map(({ url }) => url)).size).toBe(references.length);
      for (const reference of references) {
        const url = new URL(reference.url);
        expect(url.protocol).toBe('https:');
        expect(allowedReference(reference.title, url)).toBe(true);
        if (url.hostname === 'guidetojapanese.org') {
          expect(url.pathname).toMatch(/^\/learn\/grammar\/[a-z_]+$/);
        } else {
          expect(url.pathname).toMatch(/^\/japanese-grammar\/[a-z0-9-]+\/$/);
        }
      }
    }
  });

  it('maps the topic, destination, and te-form anchors to exact Tofugu pages', () => {
    expect(getGrammarReferences('l1-topic-copula').some(({ url }) =>
      url === 'https://www.tofugu.com/japanese-grammar/particle-wa/')).toBe(true);
    expect(getGrammarReferences('l5-destination').some(({ url }) =>
      url === 'https://www.tofugu.com/japanese-grammar/particle-ni/')).toBe(true);
    expect(getGrammarReferences('l14-te-form').some(({ url }) =>
      url === 'https://www.tofugu.com/japanese-grammar/te-form/')).toBe(true);
  });

  it('freezes the approved Tofugu coverage in the mixed-source manifest', () => {
    const tofuguByGrammarId = FROZEN_GRAMMAR_IDS.map((grammarId) => ({
      grammarId,
      references: getGrammarReferences(grammarId).filter(({ url }) =>
        new URL(url).hostname === 'www.tofugu.com'),
    }));
    const tofuguReferences = tofuguByGrammarId.flatMap(({ references }) => references);

    expect(tofuguReferences).toHaveLength(93);
    expect(tofuguByGrammarId.filter(({ references }) => references.length > 0)).toHaveLength(82);
    expect(new Set(tofuguReferences.map(({ url }) => url)).size).toBe(53);
  });

  it('keeps the live verifier aligned with the complete mixed-source manifest', () => {
    const verifierSource = readFileSync(
      join(import.meta.dirname, '../../scripts/verify-grammar-links.mjs'),
      'utf8',
    );

    expect(verifierSource).toContain(
      "parsed.hostname === 'guidetojapanese.org' && /^\\/learn\\/grammar\\/[a-z_]+$/.test(parsed.pathname)",
    );
    expect(verifierSource).toContain(
      "parsed.hostname === 'www.tofugu.com' && /^\\/japanese-grammar\\/[a-z0-9-]+\\/$/.test(parsed.pathname)",
    );
    expect(verifierSource).toContain('urls.length < 25');
    expect(verifierSource).not.toContain('urls.length !== 25');
    expect(verifierSource).toContain('for (const url of urls)');
  });

  it('attaches an independent manifest copy to every exported point', () => {
    for (const point of lessons.flatMap((lesson) => lesson.grammar)) {
      const references = getGrammarReferences(point.id);
      if (references.length) {
        const attachedReferences = point.furtherReading;
        expect(attachedReferences).toEqual(references);
        expect(attachedReferences).not.toBe(references);
        expect(attachedReferences).toBeDefined();
        if (!attachedReferences) continue;
        attachedReferences.forEach((reference, index) => {
          expect(reference).toEqual(references[index]);
          expect(reference).not.toBe(references[index]);
        });
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

  it('maps boundaries and invitations to official pages that cover those patterns', () => {
    expect(getGrammarReferences('l4-bounds')).toEqual([
      {
        title: "Tae Kim's Guide: Particles used with verbs",
        url: 'https://guidetojapanese.org/learn/grammar/verbparticles',
      },
      {
        title: 'Tofugu: Particle から',
        url: 'https://www.tofugu.com/japanese-grammar/particle-kara/',
      },
      {
        title: 'Tofugu: Particle まで',
        url: 'https://www.tofugu.com/japanese-grammar/particle-made/',
      },
    ]);
    expect(getGrammarReferences('l6-invite')).toEqual([
      {
        title: "Tae Kim's Guide: The Question Marker",
        url: 'https://guidetojapanese.org/learn/grammar/question',
      },
      {
        title: 'Tofugu: 〜ます',
        url: 'https://www.tofugu.com/japanese-grammar/masu/',
      },
    ]);
  });
});
