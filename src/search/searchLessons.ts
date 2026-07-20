import { lessons } from '../data/lessons';
import type { Lesson } from '../models/content';
import { findOriginalMatchRange, normalizeSearchText } from './normalizeSearchText';
import { buildSearchCorpus } from './searchCorpus';
import type { HighlightSegment, SearchDocument, SearchField, SearchResult } from './types';

export { buildSearchCorpus } from './searchCorpus';
export type { HighlightSegment, SearchResult, SearchSubsection } from './types';

const defaultCorpus = buildSearchCorpus(lessons);
const maximumExcerptLength = 180;

interface RankedField {
  field: SearchField;
  rank: number;
  matchPosition: number;
}

const rankField = (field: SearchField, query: string): RankedField | null => {
  const normalized = field.normalizedText;
  const matchPosition = normalized.indexOf(query);
  if (matchPosition < 0) return null;
  let rank: number;
  if (field.role === 'primary') {
    rank = normalized === query ? 0 : normalized.startsWith(query) ? 1 : 2;
  } else if (field.role === 'japanese') {
    rank = 3;
  } else if (field.role === 'explanation') {
    rank = 4;
  } else {
    rank = 5;
  }
  return { field, rank, matchPosition };
};

const compareRankedFields = (left: RankedField, right: RankedField) =>
  left.rank - right.rank
  || left.matchPosition - right.matchPosition
  || left.field.order - right.field.order;

const createExcerpt = (source: string, query: string): { excerpt: string; segments: HighlightSegment[] } => {
  const match = findOriginalMatchRange(source, query);
  if (!match) return { excerpt: source, segments: [{ text: source, highlighted: false }] };

  const desiredContext = Math.max(0, maximumExcerptLength - (match.end - match.start));
  let start = Math.max(0, match.start - Math.floor(desiredContext / 2));
  let end = Math.min(source.length, match.end + Math.ceil(desiredContext / 2));
  if (end - start < maximumExcerptLength) {
    start = Math.max(0, end - maximumExcerptLength);
    end = Math.min(source.length, start + maximumExcerptLength);
  }
  const leadingEllipsis = start > 0;
  const trailingEllipsis = end < source.length;
  const excerptSource = source.slice(start, end);
  const highlightStart = match.start - start;
  const highlightEnd = match.end - start;
  const segments: HighlightSegment[] = [];
  if (leadingEllipsis) segments.push({ text: '…', highlighted: false });
  if (highlightStart > 0) segments.push({ text: excerptSource.slice(0, highlightStart), highlighted: false });
  segments.push({ text: excerptSource.slice(highlightStart, highlightEnd), highlighted: true });
  if (highlightEnd < excerptSource.length) segments.push({ text: excerptSource.slice(highlightEnd), highlighted: false });
  if (trailingEllipsis) segments.push({ text: '…', highlighted: false });
  return { excerpt: segments.map((segment) => segment.text).join(''), segments };
};

export function highlightSearchText(source: string, query: string): HighlightSegment[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [{ text: source, highlighted: false }];
  const match = findOriginalMatchRange(source, normalizedQuery);
  if (!match) return [{ text: source, highlighted: false }];
  const segments: HighlightSegment[] = [];
  if (match.start > 0) segments.push({ text: source.slice(0, match.start), highlighted: false });
  segments.push({ text: source.slice(match.start, match.end), highlighted: true });
  if (match.end < source.length) segments.push({ text: source.slice(match.end), highlighted: false });
  return segments;
}

const searchCorpus = (query: string, corpus: readonly SearchDocument[]): SearchResult[] => {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  const results: SearchResult[] = [];
  for (const document of corpus) {
    const matchingFields = document.fields
      .map((field) => rankField(field, normalizedQuery))
      .filter((match): match is RankedField => match !== null)
      .sort(compareRankedFields);
    const best = matchingFields[0];
    if (!best) continue;
    const { excerpt, segments } = createExcerpt(best.field.text, normalizedQuery);
    results.push({
      id: document.id,
      lessonId: document.lessonId,
      lessonNumber: document.lessonNumber,
      lessonTitle: document.lessonTitle,
      kind: document.kind,
      contentId: document.contentId,
      title: document.title,
      subtitle: document.subtitle,
      subsection: best.field.subsection,
      grammarId: best.field.grammarId,
      excerpt,
      segments,
      matchCount: matchingFields.length,
      score: 600 - (best.rank * 100) - Math.min(best.matchPosition, 99),
      matchPosition: best.matchPosition,
      sourceOrder: document.order,
    });
  }

  return results.sort((left, right) =>
    right.score - left.score
    || left.matchPosition - right.matchPosition
    || left.lessonNumber - right.lessonNumber
    || (left.kind === right.kind ? 0 : left.kind === 'grammar' ? -1 : 1)
    || left.sourceOrder - right.sourceOrder);
};

export function searchLessons(query: string, inputLessons: readonly Lesson[] = lessons): SearchResult[] {
  return searchCorpus(query, inputLessons === lessons ? defaultCorpus : buildSearchCorpus(inputLessons));
}
