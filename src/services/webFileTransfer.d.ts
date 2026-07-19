import type { VocabularyBackupFileV1 } from '../models/vocabularyBackup';
import type { VocabularyTransferResult } from './webFileTransferCore';

export declare const exportVocabularyBackupFile: (
  backup: VocabularyBackupFileV1,
) => Promise<VocabularyTransferResult>;
