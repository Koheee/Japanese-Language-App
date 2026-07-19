import { VocabularyBackupFileV1 } from '../models/vocabularyBackup';
import {
  isUserCancellation,
  vocabularyBackupFilename,
  VocabularyTransferResult,
} from './webFileTransferCore';

const JSON_MEDIA_TYPE = 'application/json';

interface WebShareData {
  files: File[];
}

interface WebDownloadAnchor {
  href: string;
  download: string;
  click: () => void;
  remove: () => void;
}

export interface WebFileTransferEnvironment {
  navigator: {
    share?: (data: WebShareData) => Promise<void>;
    canShare?: (data: WebShareData) => boolean;
  };
  File?: typeof File;
  Blob?: typeof Blob;
  url: {
    createObjectURL: (value: Blob) => string;
    revokeObjectURL: (url: string) => void;
  };
  createAnchor: () => WebDownloadAnchor;
  appendAnchor: (anchor: WebDownloadAnchor) => void;
}

export const exportVocabularyBackupFileWithEnvironment = async (
  backup: VocabularyBackupFileV1,
  environment: WebFileTransferEnvironment,
): Promise<VocabularyTransferResult> => {
  const json = JSON.stringify(backup);
  if (typeof json !== 'string') throw new Error('Vocabulary backup could not be serialized.');

  const filename = vocabularyBackupFilename(backup.exportedAt);
  const FileConstructor = environment.File;
  const share = environment.navigator.share;
  const canShare = environment.navigator.canShare;

  if (FileConstructor && share && canShare) {
    const file = new FileConstructor([json], filename, { type: JSON_MEDIA_TYPE });
    let acceptsFile = false;
    try {
      acceptsFile = canShare.call(environment.navigator, { files: [file] });
    } catch {
      acceptsFile = false;
    }

    if (acceptsFile) {
      try {
        await share.call(environment.navigator, { files: [file] });
        return 'shared';
      } catch (error) {
        if (isUserCancellation(error)) return 'cancelled';
        throw error;
      }
    }
  }

  const BlobConstructor = environment.Blob;
  if (!BlobConstructor) return 'unavailable';

  const blob = new BlobConstructor([json], { type: JSON_MEDIA_TYPE });
  const objectUrl = environment.url.createObjectURL(blob);
  let anchor: WebDownloadAnchor | undefined;

  try {
    anchor = environment.createAnchor();
    anchor.href = objectUrl;
    anchor.download = filename;
    environment.appendAnchor(anchor);
    anchor.click();
    return 'downloaded';
  } finally {
    try {
      anchor?.remove();
    } finally {
      environment.url.revokeObjectURL(objectUrl);
    }
  }
};

const browserEnvironment = (): WebFileTransferEnvironment | undefined => {
  if (
    typeof navigator === 'undefined'
    || typeof document === 'undefined'
    || typeof URL === 'undefined'
    || typeof URL.createObjectURL !== 'function'
    || typeof URL.revokeObjectURL !== 'function'
  ) {
    return undefined;
  }

  return {
    navigator,
    File: typeof File === 'undefined' ? undefined : File,
    Blob: typeof Blob === 'undefined' ? undefined : Blob,
    url: URL,
    createAnchor: () => document.createElement('a'),
    appendAnchor: (anchor) => {
      document.body.appendChild(anchor as HTMLAnchorElement);
    },
  };
};

export const exportVocabularyBackupFile = async (
  backup: VocabularyBackupFileV1,
): Promise<VocabularyTransferResult> => {
  const environment = browserEnvironment();
  return environment ? exportVocabularyBackupFileWithEnvironment(backup, environment) : 'unavailable';
};
