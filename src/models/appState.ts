import { LessonProgress, ReviewCard } from './review';
import { VocabularyOverrides } from './vocabulary';

export interface LastImportRecoverySnapshot {
  previousVocabulary: VocabularyOverrides;
  previousAffectedReviewCards: Record<string, ReviewCard | null>;
  affectedReviewCardIds: string[];
  authoredBaselineVersion: string;
  importedAt: string;
}

export interface PersistedAppStateV2 {
  schemaVersion: 2;
  authoredBaselineVersion: string;
  progress: Record<string, LessonProgress>;
  reviewCards: Record<string, ReviewCard>;
  vocabulary: VocabularyOverrides;
  lastImportRecovery?: LastImportRecoverySnapshot;
}
