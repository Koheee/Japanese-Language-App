import { describe, expect, it } from 'vitest';

import type { Lesson } from '../models/content';
import { buildSearchCorpus, searchLessons } from './searchLessons';

const requireFirst = <T,>(items: readonly T[]): T => {
  const first = items[0];
  if (!first) throw new Error('Expected at least one search result.');
  return first;
};

const makeLesson = (): Lesson => ({
  id: 'lesson-test',
  number: 99,
  title: 'Search test',
  japaneseTitle: 'けんさく',
  description: 'Fixture',
  durationMinutes: 1,
  theme: 'Fixture',
  availability: 'ready',
  goals: [],
  vocabulary: [],
  exercises: [],
  grammar: [{
    id: 'g-test',
    title: 'Unique title needle',
    pattern: 'カタカナ pattern needle',
    plainEnglish: 'Plain meaning needle',
    explanation: 'Basics explanation needle',
    whyItWorks: 'Insight explanation needle',
    usageBoundary: 'Boundary explanation needle',
    formation: [{
      label: 'Formation label needle',
      formula: 'Formation formula needle',
      explanation: 'Formation explanation needle',
    }],
    contrast: {
      with: 'Contrast target needle',
      explanation: 'Contrast explanation needle',
    },
    notes: ['Deeper note needle'],
    beyondBasics: ['Beyond basics needle'],
    examples: [{
      japanese: '例文の針',
      reading: 'れいぶんのはり',
      english: 'Example translation needle',
    }],
    commonMistake: {
      avoid: 'Avoid needle',
      prefer: 'Prefer needle',
      reason: 'Mistake reason needle',
    },
  }],
  dialogue: [{
    id: 'd-test',
    speaker: 'Speaker needle',
    japanese: '会話の針',
    reading: 'かいわのはり',
    english: 'Dialogue translation needle',
    grammarIds: ['g-test'],
    grammarNotes: [{ grammarId: 'g-test', explanation: 'Dialogue grammar note needle' }],
  }],
});

describe('global lesson search', () => {
  it('returns no results for empty or whitespace-only queries', () => {
    expect(searchLessons('')).toEqual([]);
    expect(searchLessons('   ')).toEqual([]);
  });

  it('ranks the direct Lesson 12 より pattern ahead of other mentions', () => {
    const results = searchLessons('より');

    expect(results.length).toBeGreaterThan(1);
    expect(results[0]).toMatchObject({
      lessonNumber: 12,
      kind: 'grammar',
      contentId: 'l12-yori-comparison',
      subsection: 'header',
    });
    expect(requireFirst(results).excerpt).toContain('より');
    expect(requireFirst(results).segments.some((segment) => segment.highlighted && segment.text.includes('より'))).toBe(true);
  });

  it('finds English explanations case-insensitively', () => {
    const results = searchLessons('PERMISSION');

    expect(results.some((result) => result.lessonNumber === 15 && result.contentId === 'l15-permission')).toBe(true);
  });

  it('matches equivalent hiragana and katakana without adding romaji', () => {
    const fixture = makeLesson();

    expect(searchLessons('かたかな', [fixture])[0]).toMatchObject({ contentId: 'g-test' });
    expect(searchLessons('カイワノハリ', [fixture])[0]).toMatchObject({ contentId: 'd-test' });
    expect(searchLessons('yori').some((result) => result.contentId === 'l12-yori-comparison')).toBe(false);
  });

  it('treats punctuation and repeated whitespace as separators', () => {
    const fixture = makeLesson();
    fixture.grammar[0]!.explanation = 'Alpha—beta   gamma';

    expect(searchLessons('alpha beta gamma', [fixture])[0]).toMatchObject({ contentId: 'g-test' });
  });

  it('projects every authored grammar and dialogue field while excluding references', () => {
    const fixture = makeLesson();
    fixture.grammar[0]!.furtherReading = [{ title: 'External-only needle', url: 'https://example.com/private-needle' }];
    const corpus = buildSearchCorpus([fixture]);
    const searchableText = corpus.flatMap((document) => document.fields.map((field) => field.text)).join('\n');

    for (const needle of [
      'Unique title needle', 'カタカナ pattern needle', 'Plain meaning needle',
      'Basics explanation needle', 'Insight explanation needle', 'Boundary explanation needle',
      'Formation label needle', 'Formation formula needle', 'Formation explanation needle',
      'Contrast target needle', 'Contrast explanation needle', 'Deeper note needle',
      'Beyond basics needle', '例文の針', 'れいぶんのはり', 'Example translation needle',
      'Avoid needle', 'Prefer needle', 'Mistake reason needle', 'Speaker needle',
      '会話の針', 'かいわのはり', 'Dialogue translation needle', 'Dialogue grammar note needle',
    ]) {
      expect(searchableText).toContain(needle);
    }
    expect(searchableText).not.toContain('External-only needle');
    expect(searchableText).not.toContain('private-needle');
  });

  it('deduplicates logical records, counts matching fields, and carries subsection metadata', () => {
    const fixture = makeLesson();

    const grammar = searchLessons('needle', [fixture]).find((result) => result.kind === 'grammar');
    const dialogue = searchLessons('needle', [fixture]).find((result) => result.kind === 'dialogue');

    expect(searchLessons('needle', [fixture]).filter((result) => result.contentId === 'g-test')).toHaveLength(1);
    expect(grammar?.matchCount).toBeGreaterThan(10);
    expect(dialogue?.matchCount).toBeGreaterThan(2);
    expect(requireFirst(searchLessons('insight explanation', [fixture])).subsection).toBe('insight');
    expect(requireFirst(searchLessons('deeper note', [fixture])).subsection).toBe('deeper');
    expect(searchLessons('dialogue grammar note', [fixture])[0]).toMatchObject({
      subsection: 'grammar-note',
      grammarId: 'g-test',
    });
  });

  it('uses deterministic ranking and preserves authored Unicode in highlight segments', () => {
    const fixture = makeLesson();
    const first = searchLessons('れいぶん', [fixture]);
    const second = searchLessons('れいぶん', [fixture]);

    expect(second).toEqual(first);
    expect(requireFirst(first).excerpt).toContain('れいぶんのはり');
    expect(requireFirst(first).segments.map((segment) => segment.text).join('')).toBe(requireFirst(first).excerpt);
    expect(requireFirst(first).segments.some((segment) => segment.highlighted && segment.text === 'れいぶん')).toBe(true);
  });
});
