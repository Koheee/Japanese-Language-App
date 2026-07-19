export type VocabularyTransferResult = 'shared' | 'downloaded' | 'cancelled' | 'unavailable';

export const vocabularyBackupFilename = (exportedAt: string) =>
  `nihongo-path-vocabulary-${exportedAt.slice(0, 10)}.json`;

export const isUserCancellation = (error: unknown) =>
  error instanceof Error && (error.name === 'AbortError' || error.name === 'NotAllowedError');
