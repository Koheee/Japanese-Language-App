import { MAX_VOCABULARY_BACKUP_BYTES } from '../models/vocabularyBackup';

export type VocabularyTransferResult = 'shared' | 'downloaded' | 'cancelled' | 'unavailable';

export type PickedVocabularyFileResult =
  | { status: 'picked'; bytes: Uint8Array }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

interface PickedVocabularyFile {
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export const vocabularyBackupFilename = (exportedAt: string) =>
  `nihongo-path-vocabulary-${exportedAt.slice(0, 10)}.json`;

export const isUserCancellation = (error: unknown) =>
  error instanceof Error && (error.name === 'AbortError' || error.name === 'NotAllowedError');

export const readPickedVocabularyFile = async (
  file: PickedVocabularyFile | null,
): Promise<PickedVocabularyFileResult> => {
  if (!file) return { status: 'cancelled' };
  if (file.size > MAX_VOCABULARY_BACKUP_BYTES) {
    return { status: 'error', message: 'File exceeds 5 MB.' };
  }

  try {
    return { status: 'picked', bytes: new Uint8Array(await file.arrayBuffer()) };
  } catch (cause) {
    if (isUserCancellation(cause)) return { status: 'cancelled' };
    return {
      status: 'error',
      message: cause instanceof Error && cause.message
        ? cause.message
        : 'Could not read the selected file.',
    };
  }
};
