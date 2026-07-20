import { describe, expect, it } from 'vitest';

import { createSearchScreenPresentation } from './searchScreenModel';

describe('search screen presentation model', () => {
  it('shows examples before a query is entered', () => {
    expect(createSearchScreenPresentation('   ')).toEqual({
      mode: 'intro',
      query: '',
      results: [],
      resultAnnouncement: 'Enter a keyword to search all lessons.',
      examples: ['より', 'てから', 'permission'],
    });
  });

  it('shows ranked results and an accessible count', () => {
    const presentation = createSearchScreenPresentation(' より ');

    expect(presentation.mode).toBe('results');
    expect(presentation.query).toBe('より');
    expect(presentation.results[0]).toMatchObject({ lessonNumber: 12, contentId: 'l12-yori-comparison' });
    expect(presentation.resultAnnouncement).toBe(`${presentation.results.length} search results for より.`);
  });

  it('shows useful no-result guidance without suggesting romaji', () => {
    const presentation = createSearchScreenPresentation('zzzz-no-match');

    expect(presentation.mode).toBe('empty');
    expect(presentation.resultAnnouncement).toBe('No search results for zzzz-no-match.');
    expect(JSON.stringify(presentation).toLowerCase()).not.toContain('romaji');
  });
});

