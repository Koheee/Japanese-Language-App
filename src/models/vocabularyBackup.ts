import { ReviewCard } from './review';
import { DeviceVocabularyRecord } from './vocabulary';

export const VOCABULARY_BACKUP_FORMAT = 'nihongo-path-vocabulary-backup' as const;
export const VOCABULARY_BACKUP_SCHEMA_VERSION = 1 as const;
export const MAX_VOCABULARY_BACKUP_BYTES = 5 * 1024 * 1024;

export interface HiddenVocabularyEntry {
  lessonId: string;
  vocabularyId: string;
  owner: 'course' | 'device';
}

export interface PersonalGenerationSummary {
  sourceNoteCount: number;
  acceptedCount: number;
  skippedAuthoredCount: number;
  skippedEarlierPersonalCount: number;
  acceptedByLesson: Record<string, number>;
  sourceByLesson: Record<string, number>;
  checksumSha256: string;
}

export interface VocabularyBackupFileV1 {
  format: typeof VOCABULARY_BACKUP_FORMAT;
  schemaVersion: typeof VOCABULARY_BACKUP_SCHEMA_VERSION;
  exportedAt: string;
  authoredBaselineVersion: string;
  records: DeviceVocabularyRecord[];
  hidden: HiddenVocabularyEntry[];
  reviewCards: ReviewCard[];
  generation?: PersonalGenerationSummary;
}
