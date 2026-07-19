import { VocabularyItem, VocabularySource } from './content';

export { VocabularySource };

export interface DeviceVocabularyRecord {
  lessonId: string;
  item: VocabularyItem & { source: Exclude<VocabularySource, 'course'> };
  createdAt: string;
  updatedAt: string;
  sortKey: string;
}

export interface VocabularyOverrides {
  recordsByLesson: Record<string, DeviceVocabularyRecord[]>;
  hiddenIdsByLesson: Record<string, string[]>;
  updatedAt: string | null;
}

export interface ResolvedVocabularyItem {
  lessonId: string;
  item: VocabularyItem;
  source: VocabularySource;
  editable: boolean;
  hidden: boolean;
  authoredIndex?: number;
  sortKey: string;
  normalizedJapanese: string;
  normalizedSearch: string;
}

export const emptyVocabularyOverrides = (): VocabularyOverrides => ({
  recordsByLesson: {},
  hiddenIdsByLesson: {},
  updatedAt: null,
});
