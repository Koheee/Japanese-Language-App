export type SearchResultKind = 'grammar' | 'dialogue';

export type SearchSubsection =
  | 'header'
  | 'basics'
  | 'formation'
  | 'insight'
  | 'boundary'
  | 'contrast'
  | 'examples'
  | 'mistake'
  | 'deeper'
  | 'dialogue-line'
  | 'grammar-note';

export type SearchFieldRole = 'primary' | 'japanese' | 'explanation' | 'speaker';

export interface SearchField {
  text: string;
  normalizedText: string;
  role: SearchFieldRole;
  subsection: SearchSubsection;
  grammarId?: string;
  order: number;
}

export interface SearchDocument {
  id: string;
  lessonId: string;
  lessonNumber: number;
  lessonTitle: string;
  kind: SearchResultKind;
  contentId: string;
  title: string;
  subtitle?: string;
  order: number;
  fields: SearchField[];
}

export interface HighlightSegment {
  text: string;
  highlighted: boolean;
}

export interface SearchResult {
  id: string;
  lessonId: string;
  lessonNumber: number;
  lessonTitle: string;
  kind: SearchResultKind;
  contentId: string;
  title: string;
  subtitle?: string;
  subsection: SearchSubsection;
  grammarId?: string;
  excerpt: string;
  segments: HighlightSegment[];
  matchCount: number;
  score: number;
  matchPosition: number;
  sourceOrder: number;
}
