import { describe, expect, it, vi } from 'vitest';

import {
  MAX_VOCABULARY_BACKUP_BYTES,
  VOCABULARY_BACKUP_FORMAT,
  VOCABULARY_BACKUP_SCHEMA_VERSION,
  VocabularyBackupFileV1,
} from '../models/vocabularyBackup';
import {
  isUserCancellation,
  readPickedVocabularyFile,
  runPickedVocabularyFileRead,
  type VocabularyTransferResult,
  vocabularyBackupFilename,
} from './webFileTransferCore';
import type { exportVocabularyBackupFile as platformExportVocabularyBackupFile } from './webFileTransfer';
import { exportVocabularyBackupFile as exportNativeVocabularyBackupFile } from './webFileTransfer.native';
import {
  exportVocabularyBackupFileWithEnvironment,
  WebFileTransferEnvironment,
} from './webFileTransfer.web';

const backup: VocabularyBackupFileV1 = {
  format: VOCABULARY_BACKUP_FORMAT,
  schemaVersion: VOCABULARY_BACKUP_SCHEMA_VERSION,
  exportedAt: '2026-07-18T12:34:56.789Z',
  authoredBaselineVersion: 'course-v1-fixture',
  records: [],
  hidden: [],
  reviewCards: [],
};

type ExpectedPlatformExport = (
  backup: VocabularyBackupFileV1,
) => Promise<VocabularyTransferResult>;
type PlatformExport = typeof platformExportVocabularyBackupFile;
type PlatformExportSignatureIsExact = PlatformExport extends ExpectedPlatformExport
  ? ExpectedPlatformExport extends PlatformExport
    ? true
    : false
  : false;
const platformExportSignatureIsExact: PlatformExportSignatureIsExact = true;

const namedError = (name: string, message = name) => {
  const error = new Error(message);
  error.name = name;
  return error;
};

const fakePickedFile = (size: number, bytes = new Uint8Array()) => ({
  size,
  arrayBuffer: vi.fn(async () => bytes.slice().buffer),
});

interface WebEnvironmentOptions {
  share?: boolean;
  canShare?: boolean;
  canShareResult?: boolean;
  canShareError?: Error;
  shareError?: Error;
  appendError?: Error;
  clickError?: Error;
  removeError?: Error;
  file?: boolean;
  blob?: boolean;
}

const webEnvironment = (options: WebEnvironmentOptions = {}) => {
  const anchor = {
    href: '',
    download: '',
    click: vi.fn(() => {
      if (options.clickError) throw options.clickError;
    }),
    remove: vi.fn(() => {
      if (options.removeError) throw options.removeError;
    }),
  };
  const createdUrl = 'blob:nihongo-path-vocabulary-fixture';
  const url = {
    createObjectURL: vi.fn(() => createdUrl),
    revokeObjectURL: vi.fn(),
  };
  const appendAnchor = vi.fn(() => {
    if (options.appendError) throw options.appendError;
  });
  const share = vi.fn(async (_data: { files: File[] }) => {
    if (options.shareError) throw options.shareError;
  });
  const canShare = vi.fn((_data: { files: File[] }) => {
    if (options.canShareError) throw options.canShareError;
    return options.canShareResult ?? true;
  });

  const environment: WebFileTransferEnvironment = {
    navigator: {
      share: options.share === false ? undefined : share,
      canShare: options.canShare === false ? undefined : canShare,
    },
    File: options.file === false ? undefined : File,
    Blob: options.blob === false ? undefined : Blob,
    url,
    createAnchor: () => anchor,
    appendAnchor,
  };

  return {
    ...environment,
    anchor,
    appendAnchor,
    canShare,
    createdUrl,
    share,
    url,
  };
};

const exportWithEnvironment = (
  file: VocabularyBackupFileV1,
  environment: WebFileTransferEnvironment,
) => exportVocabularyBackupFileWithEnvironment(file, environment);

describe('web vocabulary file transfer', () => {
  it('uses Web Share only when share and canShare(files) both accept the file', async () => {
    const env = webEnvironment({ share: true, canShare: true });

    await expect(exportWithEnvironment(backup, env)).resolves.toBe('shared');

    expect(env.canShare).toHaveBeenCalledWith({ files: [expect.any(File)] });
    expect(env.share).toHaveBeenCalledTimes(1);
    expect(env.anchor.click).not.toHaveBeenCalled();
  });

  it('creates deterministic JSON file content, name, and media type for sharing', async () => {
    const env = webEnvironment();

    await exportWithEnvironment(backup, env);

    const shareData = env.share.mock.calls[0]?.[0] as { files: File[] };
    const file = shareData.files[0]!;
    expect(file.name).toBe('nihongo-path-vocabulary-2026-07-18.json');
    expect(file.type).toBe('application/json');
    await expect(file.text()).resolves.toBe(JSON.stringify(backup));
  });

  it.each([
    ['missing share', { share: false, canShare: true }],
    ['missing canShare', { share: true, canShare: false }],
    ['canShare rejects files', { share: true, canShare: true, canShareResult: false }],
  ] as const)('downloads when %s', async (_label, options) => {
    const env = webEnvironment(options);

    await expect(exportWithEnvironment(backup, env)).resolves.toBe('downloaded');

    expect(env.anchor.download).toBe('nihongo-path-vocabulary-2026-07-18.json');
    expect(env.appendAnchor).toHaveBeenCalledWith(env.anchor);
    expect(env.anchor.click).toHaveBeenCalledTimes(1);
    expect(env.anchor.remove).toHaveBeenCalledTimes(1);
    expect(env.url.revokeObjectURL).toHaveBeenCalledWith(env.createdUrl);
  });

  it('downloads when canShare throws instead of classifying capability detection as cancellation', async () => {
    const env = webEnvironment({ canShareError: namedError('NotAllowedError') });

    await expect(exportWithEnvironment(backup, env)).resolves.toBe('downloaded');

    expect(env.share).not.toHaveBeenCalled();
    expect(env.anchor.click).toHaveBeenCalledTimes(1);
  });

  it.each(['AbortError', 'NotAllowedError'])('treats a %s share failure as cancellation', async (name) => {
    const env = webEnvironment({ shareError: namedError(name) });

    await expect(exportWithEnvironment(backup, env)).resolves.toBe('cancelled');

    expect(env.anchor.click).not.toHaveBeenCalled();
  });

  it('rethrows a non-cancellation share error', async () => {
    const error = new Error('denied');

    await expect(exportWithEnvironment(backup, webEnvironment({ shareError: error }))).rejects.toBe(error);
  });

  it.each([
    ['append', { appendError: new Error('append failed') }],
    ['click', { clickError: new Error('click failed') }],
    ['remove', { removeError: new Error('remove failed') }],
  ] as const)('revokes the exact download URL when anchor %s throws', async (_label, options) => {
    const env = webEnvironment({ share: false, ...options });
    const expectedError = 'appendError' in options
      ? options.appendError
      : 'clickError' in options
        ? options.clickError
        : options.removeError;

    await expect(exportWithEnvironment(backup, env)).rejects.toBe(expectedError);

    expect(env.anchor.remove).toHaveBeenCalledTimes(1);
    expect(env.url.revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(env.url.revokeObjectURL).toHaveBeenCalledWith(env.createdUrl);
  });

  it('downloads with Blob when File is unavailable', async () => {
    const env = webEnvironment({ file: false });

    await expect(exportWithEnvironment(backup, env)).resolves.toBe('downloaded');

    expect(env.canShare).not.toHaveBeenCalled();
    expect(env.url.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
  });

  it('reports unavailable when neither File nor Blob exists', async () => {
    const env = webEnvironment({ file: false, blob: false });

    await expect(exportWithEnvironment(backup, env)).resolves.toBe('unavailable');

    expect(env.share).not.toHaveBeenCalled();
    expect(env.anchor.click).not.toHaveBeenCalled();
  });
});

describe('vocabulary transfer helpers', () => {
  it('does not read when the parent picker lock is unavailable', async () => {
    const file = fakePickedFile(3, new Uint8Array([1, 2, 3]));
    const onReadFinish = vi.fn();
    const onPick = vi.fn();

    await runPickedVocabularyFileRead(file, {
      onReadStart: () => false,
      onReadFinish,
      onPick,
      onError: vi.fn(),
    });

    expect(file.arrayBuffer).not.toHaveBeenCalled();
    expect(onPick).not.toHaveBeenCalled();
    expect(onReadFinish).not.toHaveBeenCalled();
  });

  it('holds the parent picker lock through the picked callback', async () => {
    const order: string[] = [];
    let resolveRead!: (bytes: ArrayBuffer) => void;
    const file = {
      size: 3,
      arrayBuffer: vi.fn(() => new Promise<ArrayBuffer>((resolve) => {
        resolveRead = resolve;
      })),
    };
    const work = runPickedVocabularyFileRead(file, {
      onReadStart: () => {
        order.push('start');
        return true;
      },
      onReadFinish: () => order.push('finish'),
      onPick: (bytes) => order.push(`pick:${[...bytes].join(',')}`),
      onError: (message) => order.push(`error:${message}`),
    });

    expect(order).toEqual(['start']);
    expect(file.arrayBuffer).toHaveBeenCalledTimes(1);
    resolveRead(new Uint8Array([1, 2, 3]).buffer);
    await work;
    expect(order).toEqual(['start', 'pick:1,2,3', 'finish']);
  });

  it('releases the parent picker lock after cancellation and read error', async () => {
    const cancelledOrder: string[] = [];
    await runPickedVocabularyFileRead(null, {
      onReadStart: () => {
        cancelledOrder.push('start');
        return true;
      },
      onReadFinish: () => cancelledOrder.push('finish'),
      onPick: () => cancelledOrder.push('pick'),
      onError: () => cancelledOrder.push('error'),
    });
    expect(cancelledOrder).toEqual(['start', 'finish']);

    const errorOrder: string[] = [];
    await runPickedVocabularyFileRead({
      size: 1,
      arrayBuffer: vi.fn(async () => { throw new Error('read failed'); }),
    }, {
      onReadStart: () => {
        errorOrder.push('start');
        return true;
      },
      onReadFinish: () => errorOrder.push('finish'),
      onPick: () => errorOrder.push('pick'),
      onError: (message) => errorOrder.push(`error:${message}`),
    });
    expect(errorOrder).toEqual(['start', 'error:read failed', 'finish']);
  });

  it('treats a cancelled picker as cancellation', async () => {
    await expect(readPickedVocabularyFile(null)).resolves.toEqual({ status: 'cancelled' });
  });

  it('rejects an oversized picker file before reading it', async () => {
    const file = fakePickedFile(MAX_VOCABULARY_BACKUP_BYTES + 1);
    await expect(readPickedVocabularyFile(file)).resolves.toEqual({
      status: 'error',
      message: 'File exceeds 5 MB.',
    });
    expect(file.arrayBuffer).not.toHaveBeenCalled();
  });

  it('returns exact selected bytes', async () => {
    await expect(
      readPickedVocabularyFile(fakePickedFile(3, new Uint8Array([1, 2, 3]))),
    ).resolves.toEqual({ status: 'picked', bytes: new Uint8Array([1, 2, 3]) });
  });

  it.each(['AbortError', 'NotAllowedError'])('treats a %s picker read failure as cancellation', async (name) => {
    const file = {
      size: 1,
      arrayBuffer: vi.fn(async () => { throw namedError(name); }),
    };

    await expect(readPickedVocabularyFile(file)).resolves.toEqual({ status: 'cancelled' });
  });

  it('reports non-cancellation picker read failures', async () => {
    const file = {
      size: 1,
      arrayBuffer: vi.fn(async () => { throw new Error('read failed'); }),
    };

    await expect(readPickedVocabularyFile(file)).resolves.toEqual({
      status: 'error',
      message: 'read failed',
    });
  });

  it('exposes the exact platform-neutral export signature to TypeScript consumers', () => {
    expect(platformExportSignatureIsExact).toBe(true);
  });

  it('derives the backup filename from the validated timestamp date prefix', () => {
    expect(vocabularyBackupFilename(backup.exportedAt)).toBe('nihongo-path-vocabulary-2026-07-18.json');
  });

  it('uses a literal prefix slice for invalid timestamps without consulting globals', () => {
    expect(vocabularyBackupFilename('not-a-date-value')).toBe('nihongo-path-vocabulary-not-a-date.json');
  });

  it.each(['AbortError', 'NotAllowedError'])('recognizes %s Error instances as cancellation', (name) => {
    expect(isUserCancellation(namedError(name))).toBe(true);
  });

  it('does not classify other thrown values as cancellation', () => {
    expect(isUserCancellation(namedError('SecurityError'))).toBe(false);
    expect(isUserCancellation({ name: 'AbortError' })).toBe(false);
    expect(isUserCancellation('AbortError')).toBe(false);
  });

  it('returns unavailable from the native adapter', async () => {
    await expect(exportNativeVocabularyBackupFile(backup)).resolves.toBe('unavailable');
  });
});
