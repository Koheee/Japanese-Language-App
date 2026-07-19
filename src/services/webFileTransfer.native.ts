import type { VocabularyBackupFileV1 as VocabularyBackupPayload } from '../models/vocabularyBackup';
import type { VocabularyTransferResult } from './webFileTransferCore';

export const exportVocabularyBackupFile = async (
  _backup: VocabularyBackupPayload,
): Promise<VocabularyTransferResult> => 'unavailable';
