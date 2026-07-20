import { searchLessons } from '../search/searchLessons';
import type { SearchResult } from '../search/types';

export type SearchScreenMode = 'intro' | 'results' | 'empty';

export interface SearchScreenPresentation {
  mode: SearchScreenMode;
  query: string;
  results: SearchResult[];
  resultAnnouncement: string;
  examples: string[];
}

const examples = ['より', 'てから', 'permission'];

export function createSearchScreenPresentation(input: string): SearchScreenPresentation {
  const query = input.trim();
  if (!query) {
    return {
      mode: 'intro',
      query,
      results: [],
      resultAnnouncement: 'Enter a keyword to search all lessons.',
      examples,
    };
  }
  const results = searchLessons(query);
  return {
    mode: results.length > 0 ? 'results' : 'empty',
    query,
    results,
    resultAnnouncement: results.length > 0
      ? `${results.length} search results for ${query}.`
      : `No search results for ${query}.`,
    examples,
  };
}

