import { PersistedAppStateV2 } from '../models/appState';
import { JapaneseExample, Lesson, VocabularyItem } from '../models/content';
import { ReviewCard } from '../models/review';
import {
  HiddenVocabularyEntry,
  MAX_VOCABULARY_BACKUP_BYTES,
  PersonalGenerationSummary,
  VOCABULARY_BACKUP_FORMAT,
  VOCABULARY_BACKUP_SCHEMA_VERSION,
  VocabularyBackupFileV1,
} from '../models/vocabularyBackup';
import { DeviceVocabularyRecord, VocabularyOverrides } from '../models/vocabulary';
import { validatePersistedAppStateV2 } from './appStateValidation';
import { reconcileReviewCards, vocabularyIdFromReviewCardId } from './reconcileReviewCards';
import { isKanaReading } from './vocabularyText';

export interface VocabularyImportPreview {
  file: VocabularyBackupFileV1;
  baselineWarning: string | null;
  incomingRecordCount: number;
  incomingHiddenCount: number;
  incomingReviewCount: number;
  affectedVocabularyIds: string[];
  affectedReviewCardIds: string[];
}

export type VocabularyBackupValidationResult =
  | { ok: true; preview: VocabularyImportPreview }
  | { ok: false; issues: string[] };

interface VocabularyPreviewPreparation {
  fileJson: string;
  stateFingerprint: string;
  affectedReviewCardIds: string[];
  startedLessonIds: string[];
}

const previewPreparations = new WeakMap<VocabularyImportPreview, VocabularyPreviewPreparation>();

type JsonObject = Record<string, unknown>;

const REVIEW_PREFIX = 'review-';
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const LOWERCASE_SHA256 = /^[a-f0-9]{64}$/;
const MAX_FOUR_DIGIT_ISO_TIMESTAMP = '9999-12-31T23:59:59.999Z';
const MAX_FOUR_DIGIT_ISO_MILLISECONDS = Date.parse(MAX_FOUR_DIGIT_ISO_TIMESTAMP);

const compareText = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

const cloneVocabularyItem = (item: VocabularyItem): VocabularyItem => ({
  ...item,
  ...(item.example ? { example: { ...item.example } } : {}),
});

const cloneDeviceRecord = (record: DeviceVocabularyRecord): DeviceVocabularyRecord => ({
  ...record,
  item: {
    ...cloneVocabularyItem(record.item),
    source: record.item.source,
  },
});

const cloneReviewCard = (card: ReviewCard): ReviewCard => ({ ...card });

const cloneVocabularyOverrides = (vocabulary: VocabularyOverrides): VocabularyOverrides => ({
  recordsByLesson: Object.fromEntries(
    Object.entries(vocabulary.recordsByLesson).map(([lessonId, records]) => [
      lessonId,
      records.map(cloneDeviceRecord),
    ]),
  ),
  hiddenIdsByLesson: Object.fromEntries(
    Object.entries(vocabulary.hiddenIdsByLesson).map(([lessonId, ids]) => [lessonId, [...ids]]),
  ),
  updatedAt: vocabulary.updatedAt,
});

const at = (path: string, key: string | number): string =>
  typeof key === 'number' ? `${path}[${key}]` : path ? `${path}.${key}` : key;

const isObject = (input: unknown): input is JsonObject => {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) return false;
  const prototype = Object.getPrototypeOf(input);
  return prototype === Object.prototype || prototype === null;
};

const hasToJsonHook = (input: object): boolean => {
  let current: object | null = input;
  while (current !== null) {
    const descriptor = Object.getOwnPropertyDescriptor(current, 'toJSON');
    if (descriptor) return !('value' in descriptor) || typeof descriptor.value === 'function';
    current = Object.getPrototypeOf(current) as object | null;
  }
  return false;
};

const validateJsonData = (
  input: unknown,
  path: string,
  ancestors = new Set<object>(),
): string | undefined => {
  if (input === null || typeof input === 'string' || typeof input === 'boolean') return undefined;
  if (typeof input === 'number') {
    return Number.isFinite(input) && !Object.is(input, -0)
      ? undefined
      : `${path || 'file'} must contain losslessly serializable JSON numbers`;
  }
  if (typeof input !== 'object') return `${path || 'file'} must be JSON-compatible`;
  if (ancestors.has(input)) return `${path || 'file'} must not contain circular references`;
  if (hasToJsonHook(input)) return `${at(path, 'toJSON')} is not allowed`;
  if (Array.isArray(input)) {
    if (Object.getPrototypeOf(input) !== Array.prototype) return `${path || 'file'} must use ordinary arrays`;
  } else if (!isObject(input)) {
    return `${path || 'file'} must use ordinary JSON objects`;
  }

  ancestors.add(input);
  if (Array.isArray(input)) {
    for (let index = 0; index < input.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(input, index);
      if (!descriptor || !('value' in descriptor)) {
        ancestors.delete(input);
        return `${at(path, index)} must be a stored array value`;
      }
      const issue = validateJsonData(descriptor.value, at(path, index), ancestors);
      if (issue) {
        ancestors.delete(input);
        return issue;
      }
    }
    for (const key of Reflect.ownKeys(input)) {
      if (key === 'length') continue;
      const numeric = typeof key === 'string' && /^(0|[1-9]\d*)$/.test(key) ? Number(key) : -1;
      if (Number.isSafeInteger(numeric) && numeric >= 0 && numeric < input.length) continue;
      ancestors.delete(input);
      return `${at(path, String(key))} is not an array element`;
    }
  } else {
    for (const key of Reflect.ownKeys(input)) {
      if (typeof key === 'symbol') {
        ancestors.delete(input);
        return `${at(path, String(key))} is not allowed`;
      }
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (!descriptor?.enumerable || !('value' in descriptor)) {
        ancestors.delete(input);
        return `${at(path, key)} must be an enumerable stored property`;
      }
      const issue = validateJsonData(descriptor.value, at(path, key), ancestors);
      if (issue) {
        ancestors.delete(input);
        return issue;
      }
    }
  }
  ancestors.delete(input);
  return undefined;
};

const validateShape = (
  input: unknown,
  path: string,
  required: readonly string[],
  allowed: readonly string[],
  issues: string[],
): input is JsonObject => {
  if (!isObject(input)) {
    issues.push(`${path || 'file'} must be an object`);
    return false;
  }
  for (const key of required) {
    if (!Object.hasOwn(input, key)) issues.push(`${at(path, key)} is required`);
  }
  const allowedKeys = new Set(allowed);
  for (const key of Object.keys(input)) {
    if (!allowedKeys.has(key)) issues.push(`${at(path, key)} is not a recognized property`);
  }
  return true;
};

const isNonEmptyString = (input: unknown): input is string =>
  typeof input === 'string' && input.trim().length > 0;

const isIsoTimestamp = (input: unknown): input is string => {
  if (typeof input !== 'string' || !ISO_TIMESTAMP.test(input)) return false;
  const milliseconds = Date.parse(input);
  return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString() === input;
};

const expectString = (
  input: unknown,
  path: string,
  issues: string[],
  { nonEmpty = false }: { nonEmpty?: boolean } = {},
): input is string => {
  if (typeof input !== 'string' || (nonEmpty && input.trim().length === 0)) {
    issues.push(`${path} must be ${nonEmpty ? 'a non-empty string' : 'a string'}`);
    return false;
  }
  return true;
};

const expectTimestamp = (input: unknown, path: string, issues: string[]): input is string => {
  if (!isIsoTimestamp(input)) {
    issues.push(`${path} must be a valid four-digit ISO timestamp`);
    return false;
  }
  return true;
};

const expectFiniteNumber = (
  input: unknown,
  path: string,
  issues: string[],
  { integer = false, nonNegative = false }: { integer?: boolean; nonNegative?: boolean } = {},
): input is number => {
  if (
    typeof input !== 'number'
    || !Number.isFinite(input)
    || Object.is(input, -0)
    || (integer && !Number.isSafeInteger(input))
    || (nonNegative && input < 0)
  ) {
    issues.push(`${path} must be ${nonNegative ? 'a non-negative ' : 'a '}${integer ? 'integer' : 'finite number'}`);
    return false;
  }
  return true;
};

const validateExample = (input: unknown, path: string, issues: string[]): void => {
  if (!validateShape(input, path, ['japanese', 'english'], ['japanese', 'reading', 'english'], issues)) return;
  expectString(input.japanese, at(path, 'japanese'), issues);
  expectString(input.english, at(path, 'english'), issues);
  if (Object.hasOwn(input, 'reading')) expectString(input.reading, at(path, 'reading'), issues);
};

const validateItem = (input: unknown, path: string, issues: string[]): input is VocabularyItem => {
  if (!validateShape(
    input,
    path,
    ['id', 'japanese', 'reading', 'english', 'partOfSpeech', 'source'],
    ['id', 'japanese', 'reading', 'english', 'partOfSpeech', 'note', 'example', 'category', 'source', 'sourceId'],
    issues,
  )) return false;
  expectString(input.id, at(path, 'id'), issues, { nonEmpty: true });
  expectString(input.japanese, at(path, 'japanese'), issues, { nonEmpty: true });
  const reading = input.reading;
  const readingIsString = expectString(reading, at(path, 'reading'), issues, { nonEmpty: true });
  if (readingIsString && !isKanaReading(reading)) issues.push(`${at(path, 'reading')} must use kana`);
  expectString(input.english, at(path, 'english'), issues, { nonEmpty: true });
  expectString(input.partOfSpeech, at(path, 'partOfSpeech'), issues, { nonEmpty: true });
  if (input.source !== 'personal-deck' && input.source !== 'custom') {
    issues.push(`${at(path, 'source')} must identify personal-deck or custom vocabulary`);
  }
  for (const key of ['note', 'category', 'sourceId'] as const) {
    if (Object.hasOwn(input, key)) expectString(input[key], at(path, key), issues);
  }
  if (Object.hasOwn(input, 'example')) validateExample(input.example, at(path, 'example'), issues);
  return true;
};

interface AuthoredOwner {
  lessonId: string;
  kind: 'vocabulary' | 'grammar';
}

const buildAuthoredOwnership = (lessons: readonly Lesson[]): Map<string, AuthoredOwner[]> => {
  const ownership = new Map<string, AuthoredOwner[]>();
  const add = (id: string, owner: AuthoredOwner) => ownership.set(id, [...(ownership.get(id) ?? []), owner]);
  for (const lesson of lessons) {
    for (const item of lesson.vocabulary) add(item.id, { lessonId: lesson.id, kind: 'vocabulary' });
    for (const item of lesson.grammar) add(item.id, { lessonId: lesson.id, kind: 'grammar' });
  }
  return ownership;
};

const validateRecord = (
  input: unknown,
  index: number,
  lessonIds: ReadonlySet<string>,
  authoredOwnership: ReadonlyMap<string, AuthoredOwner[]>,
  seenIds: Set<string>,
  issues: string[],
): DeviceVocabularyRecord | undefined => {
  const path = `records[${index}]`;
  if (!validateShape(
    input,
    path,
    ['lessonId', 'item', 'createdAt', 'updatedAt', 'sortKey'],
    ['lessonId', 'item', 'createdAt', 'updatedAt', 'sortKey'],
    issues,
  )) return undefined;
  const lessonId = input.lessonId;
  const lessonOk = expectString(lessonId, at(path, 'lessonId'), issues, { nonEmpty: true });
  if (lessonOk && !lessonIds.has(lessonId)) issues.push(`Unknown lesson ID at ${at(path, 'lessonId')}`);
  const rawItem = input.item;
  const itemOk = validateItem(rawItem, at(path, 'item'), issues);
  const item = itemOk ? rawItem : undefined;
  if (item && authoredOwnership.has(item.id)) {
    issues.push(`Conflicting vocabulary ID at ${at(path, 'item.id')}: ${item.id}`);
  }
  if (item) {
    if (seenIds.has(item.id)) issues.push(`Duplicate vocabulary ID at ${at(path, 'item.id')}: ${item.id}`);
    else seenIds.add(item.id);
  }
  if (lessonOk && item && (item.source === 'personal-deck' || item.source === 'custom')) {
    const expectedPrefix = `${item.source}:${lessonId}:`;
    if (!item.id.startsWith(expectedPrefix) || item.id.length === expectedPrefix.length) {
      issues.push(`${at(path, 'item.id')} must begin with ${expectedPrefix} and include a stable suffix`);
    }
  }
  const createdAt = input.createdAt;
  const updatedAt = input.updatedAt;
  const createdOk = expectTimestamp(createdAt, at(path, 'createdAt'), issues);
  const updatedOk = expectTimestamp(updatedAt, at(path, 'updatedAt'), issues);
  if (createdOk && updatedOk && updatedAt < createdAt) {
    issues.push(`${at(path, 'updatedAt')} must not be earlier than createdAt`);
  }
  const sortKey = input.sortKey;
  const sortOk = expectString(sortKey, at(path, 'sortKey'), issues, { nonEmpty: true });
  if (
    sortOk
    && item
    && (item.source === 'personal-deck' || item.source === 'custom')
    && !sortKey.startsWith(`${item.source}:`)
  ) {
    issues.push(`${at(path, 'sortKey')} must match the vocabulary source`);
  }
  return input as unknown as DeviceVocabularyRecord;
};

const validateHiddenEntry = (
  input: unknown,
  index: number,
  lessonIds: ReadonlySet<string>,
  authoredOwnership: ReadonlyMap<string, AuthoredOwner[]>,
  incomingRecords: ReadonlyMap<string, string>,
  seenHiddenIds: Set<string>,
  issues: string[],
): HiddenVocabularyEntry | undefined => {
  const path = `hidden[${index}]`;
  if (!validateShape(
    input,
    path,
    ['lessonId', 'vocabularyId', 'owner'],
    ['lessonId', 'vocabularyId', 'owner'],
    issues,
  )) return undefined;
  const lessonId = input.lessonId;
  const vocabularyId = input.vocabularyId;
  const lessonOk = expectString(lessonId, at(path, 'lessonId'), issues, { nonEmpty: true });
  if (lessonOk && !lessonIds.has(lessonId)) issues.push(`Unknown lesson ID at ${at(path, 'lessonId')}`);
  const idOk = expectString(vocabularyId, at(path, 'vocabularyId'), issues, { nonEmpty: true });
  if (idOk) {
    if (seenHiddenIds.has(vocabularyId)) {
      issues.push(`Duplicate hidden vocabulary ID at ${at(path, 'vocabularyId')}: ${vocabularyId}`);
    } else {
      seenHiddenIds.add(vocabularyId);
    }
  }
  if (input.owner !== 'course' && input.owner !== 'device') {
    issues.push(`${at(path, 'owner')} must be course or device`);
  }
  if (lessonOk && idOk && input.owner === 'device') {
    if (incomingRecords.get(vocabularyId) !== lessonId) {
      issues.push(`Device hidden vocabulary ID is not represented in the same lesson at ${path}`);
    }
  }
  if (lessonOk && idOk && input.owner === 'course') {
    const owners = authoredOwnership.get(vocabularyId) ?? [];
    const hasConflictingOwner = owners.some(
      (owner) => owner.kind !== 'vocabulary' || owner.lessonId !== lessonId,
    );
    if (hasConflictingOwner) {
      issues.push(`Conflicting vocabulary ID at ${at(path, 'vocabularyId')}: ${vocabularyId}`);
    }
    if (incomingRecords.has(vocabularyId)) {
      issues.push(`Conflicting vocabulary ID at ${at(path, 'vocabularyId')}: course owner overlaps an incoming device record`);
    }
  }
  return input as unknown as HiddenVocabularyEntry;
};

const validateReviewCard = (
  input: unknown,
  index: number,
  representedVocabulary: ReadonlyMap<string, string>,
  seenReviewIds: Set<string>,
  issues: string[],
): ReviewCard | undefined => {
  const path = `reviewCards[${index}]`;
  if (!validateShape(
    input,
    path,
    ['id', 'lessonId', 'kind', 'prompt', 'answer', 'dueAt', 'intervalDays', 'repetitions', 'ease'],
    ['id', 'lessonId', 'kind', 'prompt', 'answer', 'supportingText', 'dueAt', 'intervalDays', 'repetitions', 'ease', 'lastReviewedAt', 'suspended'],
    issues,
  )) return undefined;
  const cardId = input.id;
  const lessonId = input.lessonId;
  const idOk = expectString(cardId, at(path, 'id'), issues, { nonEmpty: true });
  const lessonOk = expectString(lessonId, at(path, 'lessonId'), issues, { nonEmpty: true });
  if (input.kind !== 'vocabulary') issues.push(`Review kind must be vocabulary at ${at(path, 'kind')}`);
  expectString(input.prompt, at(path, 'prompt'), issues);
  expectString(input.answer, at(path, 'answer'), issues);
  if (Object.hasOwn(input, 'supportingText')) expectString(input.supportingText, at(path, 'supportingText'), issues);
  expectTimestamp(input.dueAt, at(path, 'dueAt'), issues);
  expectFiniteNumber(input.intervalDays, at(path, 'intervalDays'), issues, { nonNegative: true });
  expectFiniteNumber(input.repetitions, at(path, 'repetitions'), issues, { integer: true, nonNegative: true });
  expectFiniteNumber(input.ease, at(path, 'ease'), issues);
  if (Object.hasOwn(input, 'lastReviewedAt')) expectTimestamp(input.lastReviewedAt, at(path, 'lastReviewedAt'), issues);
  if (Object.hasOwn(input, 'suspended') && typeof input.suspended !== 'boolean') {
    issues.push(`${at(path, 'suspended')} must be a boolean`);
  }

  if (idOk) {
    if (seenReviewIds.has(cardId)) issues.push(`Duplicate review ID at ${at(path, 'id')}: ${cardId}`);
    else seenReviewIds.add(cardId);
    if (!cardId.startsWith(REVIEW_PREFIX) || cardId.length === REVIEW_PREFIX.length) {
      issues.push(`Review ID must equal review-<vocabulary-id> at ${at(path, 'id')}`);
    } else {
      const vocabularyId = cardId.slice(REVIEW_PREFIX.length);
      const ownerLessonId = representedVocabulary.get(vocabularyId);
      if (!ownerLessonId) {
        issues.push(`Review vocabulary ID is not represented at ${at(path, 'id')}: ${vocabularyId}`);
      } else if (lessonOk && ownerLessonId !== lessonId) {
        issues.push(`Review lesson does not match vocabulary owner at ${at(path, 'lessonId')}`);
      }
      if (cardId !== `${REVIEW_PREFIX}${vocabularyId}`) {
        issues.push(`Review ID must equal review-<vocabulary-id> at ${at(path, 'id')}`);
      }
    }
  }
  return input as unknown as ReviewCard;
};

const SHA256_CONSTANTS = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const rotateRight = (value: number, places: number): number =>
  (value >>> places) | (value << (32 - places));

const sha256 = (value: string): string => {
  const source = new TextEncoder().encode(value);
  const paddedLength = Math.ceil((source.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(source);
  padded[source.length] = 0x80;
  const view = new DataView(padded.buffer);
  const bitLength = source.length * 8;
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x1_0000_0000), false);
  view.setUint32(paddedLength - 4, bitLength >>> 0, false);

  const hash = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const words = new Uint32Array(64);
  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let index = 0; index < 16; index += 1) words[index] = view.getUint32(offset + index * 4, false);
    for (let index = 16; index < 64; index += 1) {
      const word15 = words[index - 15]!;
      const word2 = words[index - 2]!;
      const sigma0 = rotateRight(word15, 7) ^ rotateRight(word15, 18) ^ (word15 >>> 3);
      const sigma1 = rotateRight(word2, 17) ^ rotateRight(word2, 19) ^ (word2 >>> 10);
      words[index] = (words[index - 16]! + sigma0 + words[index - 7]! + sigma1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = hash;
    for (let index = 0; index < 64; index += 1) {
      const sum1 = rotateRight(e!, 6) ^ rotateRight(e!, 11) ^ rotateRight(e!, 25);
      const choose = (e! & f!) ^ (~e! & g!);
      const temporary1 = (h! + sum1 + choose + SHA256_CONSTANTS[index]! + words[index]!) >>> 0;
      const sum0 = rotateRight(a!, 2) ^ rotateRight(a!, 13) ^ rotateRight(a!, 22);
      const majority = (a! & b!) ^ (a! & c!) ^ (b! & c!);
      const temporary2 = (sum0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d! + temporary1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temporary1 + temporary2) >>> 0;
    }
    hash[0] = (hash[0]! + a!) >>> 0;
    hash[1] = (hash[1]! + b!) >>> 0;
    hash[2] = (hash[2]! + c!) >>> 0;
    hash[3] = (hash[3]! + d!) >>> 0;
    hash[4] = (hash[4]! + e!) >>> 0;
    hash[5] = (hash[5]! + f!) >>> 0;
    hash[6] = (hash[6]! + g!) >>> 0;
    hash[7] = (hash[7]! + h!) >>> 0;
  }
  return [...hash].map((word) => word.toString(16).padStart(8, '0')).join('');
};

const validateCountMap = (
  input: unknown,
  path: string,
  lessonIds: readonly string[],
  issues: string[],
): Record<string, number> | undefined => {
  if (!isObject(input)) {
    issues.push(`${path} must be an object`);
    return undefined;
  }
  const expected = new Set(lessonIds);
  for (const lessonId of lessonIds) {
    if (!Object.hasOwn(input, lessonId)) issues.push(`${path}.${lessonId} is required`);
  }
  for (const [lessonId, count] of Object.entries(input)) {
    if (!expected.has(lessonId)) issues.push(`${path}.${lessonId} is not a known lesson count`);
    expectFiniteNumber(count, `${path}.${lessonId}`, issues, { integer: true, nonNegative: true });
  }
  return input as Record<string, number>;
};

const validateGeneration = (
  input: unknown,
  records: readonly DeviceVocabularyRecord[],
  lessons: readonly Lesson[],
  issues: string[],
): void => {
  const path = 'generation';
  const keys = [
    'sourceNoteCount',
    'acceptedCount',
    'skippedAuthoredCount',
    'skippedEarlierPersonalCount',
    'acceptedByLesson',
    'sourceByLesson',
    'checksumSha256',
  ] as const;
  if (!validateShape(input, path, keys, keys, issues)) return;
  for (const key of keys.slice(0, 4)) {
    expectFiniteNumber(input[key], `${path}.${key}`, issues, { integer: true, nonNegative: true });
  }
  const lessonIds = lessons.map(({ id }) => id);
  const acceptedByLesson = validateCountMap(input.acceptedByLesson, `${path}.acceptedByLesson`, lessonIds, issues);
  const sourceByLesson = validateCountMap(input.sourceByLesson, `${path}.sourceByLesson`, lessonIds, issues);
  if (typeof input.checksumSha256 !== 'string' || !LOWERCASE_SHA256.test(input.checksumSha256)) {
    issues.push(`${path}.checksumSha256 must be a lowercase SHA-256 value`);
  }
  const summary = input as unknown as PersonalGenerationSummary;
  if (Number.isSafeInteger(summary.acceptedCount) && summary.acceptedCount !== records.length) {
    issues.push(`${path}.acceptedCount must equal records.length`);
  }
  if (
    [summary.sourceNoteCount, summary.acceptedCount, summary.skippedAuthoredCount, summary.skippedEarlierPersonalCount]
      .every((count) => Number.isSafeInteger(count) && count >= 0)
    && summary.sourceNoteCount !== summary.acceptedCount + summary.skippedAuthoredCount + summary.skippedEarlierPersonalCount
  ) {
    issues.push(`${path}.sourceNoteCount must equal accepted and skipped totals`);
  }
  if (acceptedByLesson) {
    const acceptedTotal = lessonIds.reduce((total, lessonId) => total + (acceptedByLesson[lessonId] ?? 0), 0);
    if (acceptedTotal !== summary.acceptedCount) issues.push(`${path}.acceptedByLesson must sum to acceptedCount`);
    for (const lessonId of lessonIds) {
      const actual = records.filter((record) => record.lessonId === lessonId).length;
      if (acceptedByLesson[lessonId] !== actual) issues.push(`${path}.acceptedByLesson.${lessonId} must match records`);
    }
  }
  if (sourceByLesson) {
    const sourceTotal = lessonIds.reduce((total, lessonId) => total + (sourceByLesson[lessonId] ?? 0), 0);
    if (sourceTotal !== summary.sourceNoteCount) issues.push(`${path}.sourceByLesson must sum to sourceNoteCount`);
    if (acceptedByLesson) {
      for (const lessonId of lessonIds) {
        if ((acceptedByLesson[lessonId] ?? 0) > (sourceByLesson[lessonId] ?? 0)) {
          issues.push(`${path}.acceptedByLesson.${lessonId} must not exceed sourceByLesson`);
        }
      }
    }
  }
  if (typeof input.checksumSha256 === 'string' && LOWERCASE_SHA256.test(input.checksumSha256)) {
    if (input.checksumSha256 !== sha256(JSON.stringify(records))) {
      issues.push(`${path}.checksumSha256 does not match records`);
    }
  }
};

const vocabularyIdsIn = (vocabulary: VocabularyOverrides): Set<string> => new Set([
  ...Object.values(vocabulary.recordsByLesson).flat().map(({ item }) => item.id),
  ...Object.values(vocabulary.hiddenIdsByLesson).flat(),
]);

const affectedIdsFor = (
  current: PersistedAppStateV2,
  records: readonly DeviceVocabularyRecord[],
  hidden: readonly HiddenVocabularyEntry[],
): string[] => [...new Set([
  ...vocabularyIdsIn(current.vocabulary),
  ...records.map(({ item }) => item.id),
  ...hidden.map(({ vocabularyId }) => vocabularyId),
])].sort(compareText);

const previewStateFingerprint = (
  current: PersistedAppStateV2,
  affectedReviewCardIds: readonly string[],
  startedLessonIds: readonly string[],
): string => JSON.stringify({
  authoredBaselineVersion: current.authoredBaselineVersion,
  vocabulary: current.vocabulary,
  startedLessons: startedLessonIds.map((lessonId) => [
    lessonId,
    current.progress[lessonId]?.started === true,
  ]),
  affectedReviewCards: affectedReviewCardIds.map((cardId) => [
    cardId,
    current.reviewCards[cardId] ?? null,
  ]),
});

const previewFor = (
  file: VocabularyBackupFileV1,
  current: PersistedAppStateV2,
  lessons: readonly Lesson[],
): VocabularyImportPreview => {
  const affectedVocabularyIds = affectedIdsFor(current, file.records, file.hidden);
  const preview: VocabularyImportPreview = {
    file,
    baselineWarning: file.authoredBaselineVersion === current.authoredBaselineVersion
      ? null
      : 'This backup was created against a different course baseline; review the replacement before continuing.',
    incomingRecordCount: file.records.length,
    incomingHiddenCount: file.hidden.length,
    incomingReviewCount: file.reviewCards.length,
    affectedVocabularyIds,
    affectedReviewCardIds: affectedVocabularyIds.map((id) => `${REVIEW_PREFIX}${id}`),
  };
  const startedLessonIds = lessons.map(({ id }) => id).sort(compareText);
  previewPreparations.set(preview, {
    fileJson: JSON.stringify(file),
    stateFingerprint: previewStateFingerprint(
      current,
      preview.affectedReviewCardIds,
      startedLessonIds,
    ),
    affectedReviewCardIds: [...preview.affectedReviewCardIds],
    startedLessonIds,
  });
  return preview;
};

const validateBackupObject = ({
  input,
  lessons,
  current,
}: {
  input: unknown;
  lessons: readonly Lesson[];
  current: PersistedAppStateV2;
}): VocabularyBackupValidationResult => {
  const issues: string[] = [];
  const jsonIssue = validateJsonData(input, '');
  if (jsonIssue) return { ok: false, issues: [jsonIssue] };
  const topKeys = ['format', 'schemaVersion', 'exportedAt', 'authoredBaselineVersion', 'records', 'hidden', 'reviewCards', 'generation'] as const;
  if (!validateShape(
    input,
    '',
    ['format', 'schemaVersion', 'exportedAt', 'authoredBaselineVersion', 'records', 'hidden', 'reviewCards'],
    topKeys,
    issues,
  )) return { ok: false, issues };

  if (input.format !== VOCABULARY_BACKUP_FORMAT) issues.push('Unsupported vocabulary backup format');
  if (input.schemaVersion !== VOCABULARY_BACKUP_SCHEMA_VERSION) issues.push('Unsupported vocabulary backup schema');
  expectTimestamp(input.exportedAt, 'exportedAt', issues);
  expectString(input.authoredBaselineVersion, 'authoredBaselineVersion', issues, { nonEmpty: true });

  const lessonIds = new Set(lessons.map(({ id }) => id));
  const authoredOwnership = buildAuthoredOwnership(lessons);
  const records: DeviceVocabularyRecord[] = [];
  const seenRecordIds = new Set<string>();
  if (!Array.isArray(input.records)) {
    issues.push('records must be an array');
  } else {
    for (const [index, record] of input.records.entries()) {
      const validated = validateRecord(record, index, lessonIds, authoredOwnership, seenRecordIds, issues);
      if (validated) records.push(validated);
    }
  }
  const incomingRecords = new Map<string, string>();
  for (const record of records) {
    if (typeof record.item?.id === 'string' && typeof record.lessonId === 'string') {
      incomingRecords.set(record.item.id, record.lessonId);
    }
  }

  const hidden: HiddenVocabularyEntry[] = [];
  const seenHiddenIds = new Set<string>();
  if (!Array.isArray(input.hidden)) {
    issues.push('hidden must be an array');
  } else {
    for (const [index, entry] of input.hidden.entries()) {
      const validated = validateHiddenEntry(
        entry,
        index,
        lessonIds,
        authoredOwnership,
        incomingRecords,
        seenHiddenIds,
        issues,
      );
      if (validated) hidden.push(validated);
    }
  }

  const representedVocabulary = new Map(incomingRecords);
  for (const entry of hidden) {
    if (typeof entry.vocabularyId !== 'string' || typeof entry.lessonId !== 'string') continue;
    const existingLesson = representedVocabulary.get(entry.vocabularyId);
    if (existingLesson && existingLesson !== entry.lessonId) {
      issues.push(`Conflicting vocabulary ID at hidden: ${entry.vocabularyId}`);
    } else {
      representedVocabulary.set(entry.vocabularyId, entry.lessonId);
    }
  }

  const reviewCards: ReviewCard[] = [];
  const seenReviewIds = new Set<string>();
  if (!Array.isArray(input.reviewCards)) {
    issues.push('reviewCards must be an array');
  } else {
    for (const [index, card] of input.reviewCards.entries()) {
      const validated = validateReviewCard(card, index, representedVocabulary, seenReviewIds, issues);
      if (validated) reviewCards.push(validated);
    }
  }

  if (Object.hasOwn(input, 'generation')) validateGeneration(input.generation, records, lessons, issues);
  if (issues.length > 0) return { ok: false, issues };
  const file = input as unknown as VocabularyBackupFileV1;
  return { ok: true, preview: previewFor(file, current, lessons) };
};

const ownerForHidden = (
  lessonId: string,
  vocabularyId: string,
  deviceOwners: ReadonlyMap<string, string>,
): HiddenVocabularyEntry['owner'] =>
  deviceOwners.get(vocabularyId) === lessonId ? 'device' : 'course';

export const buildVocabularyBackup = (
  state: PersistedAppStateV2,
  lessons: readonly Lesson[],
  exportedAt: string,
): VocabularyBackupFileV1 => {
  if (!isIsoTimestamp(exportedAt)) throw new Error('Backup export time must be a valid four-digit ISO timestamp.');
  void lessons;
  const records = Object.values(state.vocabulary.recordsByLesson)
    .flat()
    .sort((left, right) =>
      compareText(left.lessonId, right.lessonId)
      || (left.item.source === 'personal-deck' ? 0 : 1) - (right.item.source === 'personal-deck' ? 0 : 1)
      || compareText(left.sortKey, right.sortKey)
      || compareText(left.item.id, right.item.id))
    .map(cloneDeviceRecord);
  const deviceOwners = new Map(records.map((record) => [record.item.id, record.lessonId]));
  const hidden = Object.entries(state.vocabulary.hiddenIdsByLesson)
    .flatMap(([lessonId, ids]) => ids.map((vocabularyId): HiddenVocabularyEntry => ({
      lessonId,
      vocabularyId,
      owner: ownerForHidden(lessonId, vocabularyId, deviceOwners),
    })))
    .sort((left, right) =>
      compareText(left.lessonId, right.lessonId)
      || compareText(left.vocabularyId, right.vocabularyId));
  const represented = new Map(records.map((record) => [record.item.id, record.lessonId]));
  for (const entry of hidden) represented.set(entry.vocabularyId, entry.lessonId);
  const reviewCards = Object.values(state.reviewCards)
    .filter((card) => {
      const vocabularyId = vocabularyIdFromReviewCardId(card);
      return vocabularyId !== undefined && represented.get(vocabularyId) === card.lessonId;
    })
    .sort((left, right) => compareText(left.id, right.id))
    .map(cloneReviewCard);

  return {
    format: VOCABULARY_BACKUP_FORMAT,
    schemaVersion: VOCABULARY_BACKUP_SCHEMA_VERSION,
    exportedAt,
    authoredBaselineVersion: state.authoredBaselineVersion,
    records,
    hidden,
    reviewCards,
  };
};

export const validateVocabularyBackupBytes = ({
  bytes,
  lessons,
  current,
}: {
  bytes: Uint8Array;
  lessons: readonly Lesson[];
  current: PersistedAppStateV2;
}): VocabularyBackupValidationResult => {
  if (bytes.byteLength > MAX_VOCABULARY_BACKUP_BYTES) {
    return { ok: false, issues: ['File exceeds 5 MB'] };
  }
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return { ok: false, issues: ['File is not valid UTF-8'] };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return { ok: false, issues: ['File is not valid JSON'] };
  }
  return validateBackupObject({ input: parsed, lessons, current });
};

const timestampFor = (now: Date): string => {
  const milliseconds = now.getTime();
  if (!Number.isFinite(milliseconds)) throw new Error('Vocabulary import time must be a valid four-digit ISO timestamp.');
  const timestamp = now.toISOString();
  if (!ISO_TIMESTAMP.test(timestamp)) throw new Error('Vocabulary import time must be a valid four-digit ISO timestamp.');
  return timestamp;
};

const nextVocabularyTimestamp = (current: PersistedAppStateV2, now: Date): string => {
  const requested = timestampFor(now);
  const requestedMilliseconds = Date.parse(requested);
  const previousMilliseconds = current.vocabulary.updatedAt === null
    ? Number.NEGATIVE_INFINITY
    : Date.parse(current.vocabulary.updatedAt);
  const nextMilliseconds = requestedMilliseconds > previousMilliseconds
    ? requestedMilliseconds
    : previousMilliseconds + 1;
  if (nextMilliseconds > MAX_FOUR_DIGIT_ISO_MILLISECONDS) {
    throw new Error(`Vocabulary revision cannot advance beyond ${MAX_FOUR_DIGIT_ISO_TIMESTAMP}.`);
  }
  return new Date(nextMilliseconds).toISOString();
};

const vocabularyFromFile = (
  file: VocabularyBackupFileV1,
  updatedAt: string,
): VocabularyOverrides => {
  const recordsByLesson: Record<string, DeviceVocabularyRecord[]> = {};
  for (const record of file.records) {
    (recordsByLesson[record.lessonId] ??= []).push(cloneDeviceRecord(record));
  }
  const hiddenIdsByLesson: Record<string, string[]> = {};
  for (const entry of file.hidden) {
    (hiddenIdsByLesson[entry.lessonId] ??= []).push(entry.vocabularyId);
  }
  return { recordsByLesson, hiddenIdsByLesson, updatedAt };
};

const scopedReconciliation = ({
  current,
  reviewCards,
  vocabulary,
  affectedReviewCardIds,
  lessons,
  now,
}: {
  current: PersistedAppStateV2;
  reviewCards: Record<string, ReviewCard>;
  vocabulary: VocabularyOverrides;
  affectedReviewCardIds: readonly string[];
  lessons: readonly Lesson[];
  now: Date;
}): Record<string, ReviewCard> => {
  const reconciled = reconcileReviewCards({
    lessons,
    progress: current.progress,
    reviewCards,
    vocabulary,
    now,
  });
  const scoped = { ...reviewCards };
  for (const cardId of affectedReviewCardIds) {
    const card = reconciled[cardId];
    if (card) scoped[cardId] = card;
    else delete scoped[cardId];
  }
  return scoped;
};

const assertValidState = (input: unknown): PersistedAppStateV2 => {
  const validation = validatePersistedAppStateV2(input);
  if (!validation.ok) throw new Error(`${validation.path}: ${validation.message}`);
  return validation.value;
};

export const replaceVocabularyFromPreview = (
  current: PersistedAppStateV2,
  preview: VocabularyImportPreview,
  { lessons, now }: { lessons: readonly Lesson[]; now: Date },
): PersistedAppStateV2 => {
  assertValidState(current);
  const revalidated = validateBackupObject({ input: preview.file, lessons, current });
  if (!revalidated.ok) throw new Error(revalidated.issues.join('\n'));
  const preparation = previewPreparations.get(preview);
  if (
    !preparation
    || preparation.fileJson !== JSON.stringify(preview.file)
    || preparation.stateFingerprint !== previewStateFingerprint(
      current,
      preparation.affectedReviewCardIds,
      preparation.startedLessonIds,
    )
  ) {
    throw new Error('Vocabulary import preview is stale; prepare the backup again.');
  }
  const { file, affectedReviewCardIds } = revalidated.preview;
  const importedAt = timestampFor(now);
  const vocabulary = vocabularyFromFile(file, nextVocabularyTimestamp(current, now));
  const previousAffectedReviewCards: Record<string, ReviewCard | null> = {};
  for (const cardId of affectedReviewCardIds) {
    const card = current.reviewCards[cardId];
    previousAffectedReviewCards[cardId] = card ? cloneReviewCard(card) : null;
  }

  const incomingRecordIds = new Set(file.records.map(({ item }) => item.id));
  const oldRecordIds = new Set(
    Object.values(current.vocabulary.recordsByLesson).flat().map(({ item }) => item.id),
  );
  const workingCards = { ...current.reviewCards };
  for (const oldId of oldRecordIds) {
    if (!incomingRecordIds.has(oldId)) delete workingCards[`${REVIEW_PREFIX}${oldId}`];
  }
  for (const record of file.records) {
    if (current.progress[record.lessonId]?.started !== true) {
      delete workingCards[`${REVIEW_PREFIX}${record.item.id}`];
    }
  }
  for (const card of file.reviewCards) {
    if (current.progress[card.lessonId]?.started === true) {
      workingCards[card.id] = cloneReviewCard(card);
    }
  }
  const reviewCards = scopedReconciliation({
    current,
    reviewCards: workingCards,
    vocabulary,
    affectedReviewCardIds,
    lessons,
    now,
  });
  const candidate: PersistedAppStateV2 = {
    ...current,
    vocabulary,
    reviewCards,
    lastImportRecovery: {
      previousVocabulary: cloneVocabularyOverrides(current.vocabulary),
      previousAffectedReviewCards,
      affectedReviewCardIds: [...affectedReviewCardIds],
      authoredBaselineVersion: current.authoredBaselineVersion,
      importedAt,
    },
  };
  return assertValidState(candidate);
};

const recoveryBackup = (
  current: PersistedAppStateV2,
  exportedAt: string,
  lessons: readonly Lesson[],
): VocabularyBackupFileV1 => {
  const recovery = current.lastImportRecovery!;
  const priorCards: Record<string, ReviewCard> = {};
  for (const [cardId, card] of Object.entries(recovery.previousAffectedReviewCards)) {
    if (card) priorCards[cardId] = card;
  }
  return buildVocabularyBackup(
    { ...current, vocabulary: recovery.previousVocabulary, reviewCards: priorCards },
    lessons,
    exportedAt,
  );
};

export const undoLastVocabularyImport = (
  current: PersistedAppStateV2,
  { lessons, now }: { lessons: readonly Lesson[]; now: Date },
): PersistedAppStateV2 => {
  const validated = assertValidState(current);
  const recovery = validated.lastImportRecovery;
  if (!recovery) throw new Error('No vocabulary import is available to undo.');
  if (recovery.authoredBaselineVersion !== validated.authoredBaselineVersion) {
    throw new Error('The course baseline changed after this vocabulary import.');
  }
  const undoAt = timestampFor(now);
  const priorFile = recoveryBackup(validated, undoAt, lessons);
  const priorValidation = validateBackupObject({ input: priorFile, lessons, current: validated });
  if (!priorValidation.ok) throw new Error(priorValidation.issues.join('\n'));

  const vocabulary: VocabularyOverrides = {
    ...cloneVocabularyOverrides(recovery.previousVocabulary),
    updatedAt: nextVocabularyTimestamp(validated, now),
  };
  const workingCards = { ...validated.reviewCards };
  for (const cardId of recovery.affectedReviewCardIds) {
    const previous = recovery.previousAffectedReviewCards[cardId];
    if (previous) workingCards[cardId] = cloneReviewCard(previous);
    else delete workingCards[cardId];
  }
  const reviewCards = scopedReconciliation({
    current: validated,
    reviewCards: workingCards,
    vocabulary,
    affectedReviewCardIds: recovery.affectedReviewCardIds,
    lessons,
    now,
  });
  const { lastImportRecovery: discardedRecovery, ...withoutRecovery } = validated;
  void discardedRecovery;
  return assertValidState({ ...withoutRecovery, vocabulary, reviewCards });
};
