import { PersistedAppStateV2 } from '../models/appState';
import { JapaneseExample } from '../models/content';
import { LessonProgress, ReviewCard } from '../models/review';
import { DeviceVocabularyRecord, VocabularyOverrides } from '../models/vocabulary';

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; path: string; message: string };

export interface StudyStateV1 {
  progress: Record<string, LessonProgress>;
  reviewCards: Record<string, ReviewCard>;
}

export type ValidateStudyStateV1 = (input: unknown) => ValidationResult<StudyStateV1>;
export type ValidatePersistedAppStateV2 = (input: unknown) => ValidationResult<PersistedAppStateV2>;

type JsonObject = Record<string, unknown>;
type Failure = Extract<ValidationResult<never>, { ok: false }>;

const failure = (path: string, message: string): Failure => ({ ok: false, path, message });

const childPath = (path: string, key: PropertyKey) =>
  path ? `${path}.${String(key)}` : String(key);

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

const validateJsonValue = (
  input: unknown,
  path = '',
  ancestors = new Set<object>(),
): Failure | undefined => {
  if (input === null || typeof input === 'string' || typeof input === 'boolean') return undefined;
  if (typeof input === 'number') {
    return Number.isFinite(input) && !Object.is(input, -0)
      ? undefined
      : failure(path, 'must be a losslessly serializable JSON number');
  }
  if (typeof input !== 'object') return failure(path, 'must be JSON-compatible');
  if (ancestors.has(input)) return failure(path, 'must not contain a circular reference');

  if (hasToJsonHook(input)) return failure(childPath(path, 'toJSON'), 'must not define or inherit a toJSON hook');
  if (Array.isArray(input)) {
    if (Object.getPrototypeOf(input) !== Array.prototype) return failure(path, 'must be an ordinary array');
  } else if (!isObject(input)) {
    return failure(path, 'must be a JSON object or array');
  }

  ancestors.add(input);
  if (Array.isArray(input)) {
    for (let index = 0; index < input.length; index += 1) {
      const itemPath = childPath(path, index);
      const descriptor = Object.getOwnPropertyDescriptor(input, index);
      if (!descriptor) {
        ancestors.delete(input);
        return failure(itemPath, 'must not be a sparse array element');
      }
      if (!('value' in descriptor)) {
        ancestors.delete(input);
        return failure(itemPath, 'must be a JSON data property');
      }
      const result = validateJsonValue(descriptor.value, itemPath, ancestors);
      if (result) {
        ancestors.delete(input);
        return result;
      }
    }
    for (const key of Reflect.ownKeys(input)) {
      if (key === 'length') continue;
      const numericKey = typeof key === 'string' && /^(0|[1-9]\d*)$/.test(key)
        ? Number(key)
        : Number.NaN;
      if (Number.isSafeInteger(numericKey) && numericKey >= 0 && numericKey < input.length) continue;
      ancestors.delete(input);
      return failure(childPath(path, key), 'must not be a non-index array property');
    }
  } else {
    for (const key of Reflect.ownKeys(input)) {
      const propertyPath = childPath(path, key);
      if (typeof key === 'symbol') {
        ancestors.delete(input);
        return failure(propertyPath, 'must not be a symbol-keyed property');
      }
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (!descriptor?.enumerable || !('value' in descriptor)) {
        ancestors.delete(input);
        return failure(propertyPath, 'must be an enumerable JSON data property');
      }
      const result = validateJsonValue(descriptor.value, propertyPath, ancestors);
      if (result) {
        ancestors.delete(input);
        return result;
      }
    }
  }
  ancestors.delete(input);
  return undefined;
};

const expectObject = (input: unknown, path: string): Failure | undefined =>
  isObject(input) ? undefined : failure(path, 'must be an object');

const expectString = (input: unknown, path: string): Failure | undefined =>
  typeof input === 'string' ? undefined : failure(path, 'must be a string');

const expectBoolean = (input: unknown, path: string): Failure | undefined =>
  typeof input === 'boolean' ? undefined : failure(path, 'must be a boolean');

const expectFiniteNumber = (input: unknown, path: string): Failure | undefined =>
  typeof input === 'number' && Number.isFinite(input)
    ? undefined
    : failure(path, 'must be a finite number');

const expectNonNegativeInteger = (input: unknown, path: string): Failure | undefined =>
  typeof input === 'number' && Number.isSafeInteger(input) && input >= 0
    ? undefined
    : failure(path, 'must be a non-negative integer');

const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const expectIsoTimestamp = (input: unknown, path: string): Failure | undefined => {
  if (typeof input !== 'string' || !ISO_TIMESTAMP.test(input)) {
    return failure(path, 'must be an ISO timestamp');
  }
  const milliseconds = Date.parse(input);
  return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString() === input
    ? undefined
    : failure(path, 'must be a valid ISO timestamp');
};

const validateKnownKeys = (
  input: JsonObject,
  path: string,
  keys: readonly string[],
): Failure | undefined => {
  const allowed = new Set(keys);
  const unknown = Object.keys(input).find((key) => !allowed.has(key));
  return unknown === undefined
    ? undefined
    : failure(childPath(path, unknown), 'is not a recognized property');
};

const requireOwnKeys = (
  input: JsonObject,
  path: string,
  keys: readonly string[],
): Failure | undefined => {
  const missing = keys.find((key) => !Object.hasOwn(input, key));
  return missing === undefined
    ? undefined
    : failure(childPath(path, missing), 'must be an own stored property');
};

const validateStringArray = (
  input: unknown,
  path: string,
  { rejectDuplicates = false }: { rejectDuplicates?: boolean } = {},
): Failure | undefined => {
  if (!Array.isArray(input)) return failure(path, 'must be an array');
  const seen = new Set<string>();
  for (const [index, value] of input.entries()) {
    const valuePath = childPath(path, index);
    const stringFailure = expectString(value, valuePath);
    if (stringFailure) return stringFailure;
    if (rejectDuplicates && seen.has(value as string)) return failure(valuePath, 'must not be duplicated');
    seen.add(value as string);
  }
  return undefined;
};

const validateLessonProgress = (
  input: unknown,
  path: string,
  expectedLessonId: string,
): Failure | undefined => {
  const objectFailure = expectObject(input, path);
  if (objectFailure) return objectFailure;
  const value = input as JsonObject;

  const knownFailure = validateKnownKeys(
    value,
    path,
    ['lessonId', 'started', 'completedExerciseIds', 'correctAnswers', 'attempts'],
  );
  if (knownFailure) return knownFailure;

  const missingFailure = requireOwnKeys(
    value,
    path,
    ['lessonId', 'started', 'completedExerciseIds', 'correctAnswers', 'attempts'],
  );
  if (missingFailure) return missingFailure;

  const lessonPath = childPath(path, 'lessonId');
  const lessonFailure = expectString(value.lessonId, lessonPath);
  if (lessonFailure) return lessonFailure;
  if (value.lessonId !== expectedLessonId) return failure(lessonPath, 'must match its progress map key');

  return expectBoolean(value.started, childPath(path, 'started'))
    ?? validateStringArray(value.completedExerciseIds, childPath(path, 'completedExerciseIds'))
    ?? expectNonNegativeInteger(value.correctAnswers, childPath(path, 'correctAnswers'))
    ?? expectNonNegativeInteger(value.attempts, childPath(path, 'attempts'));
};

const validateProgressMap = (input: unknown, path: string): Failure | undefined => {
  const objectFailure = expectObject(input, path);
  if (objectFailure) return objectFailure;
  for (const [lessonId, progress] of Object.entries(input as JsonObject)) {
    const progressFailure = validateLessonProgress(progress, childPath(path, lessonId), lessonId);
    if (progressFailure) return progressFailure;
  }
  return undefined;
};

const validateReviewCard = (
  input: unknown,
  path: string,
  expectedId: string,
): Failure | undefined => {
  const objectFailure = expectObject(input, path);
  if (objectFailure) return objectFailure;
  const value = input as JsonObject;

  const knownFailure = validateKnownKeys(value, path, [
    'id',
    'lessonId',
    'kind',
    'prompt',
    'answer',
    'supportingText',
    'dueAt',
    'intervalDays',
    'repetitions',
    'ease',
    'lastReviewedAt',
    'suspended',
  ]);
  if (knownFailure) return knownFailure;

  const missingFailure = requireOwnKeys(value, path, [
    'id',
    'lessonId',
    'kind',
    'prompt',
    'answer',
    'dueAt',
    'intervalDays',
    'repetitions',
    'ease',
  ]);
  if (missingFailure) return missingFailure;

  const idPath = childPath(path, 'id');
  const idFailure = expectString(value.id, idPath);
  if (idFailure) return idFailure;
  if (value.id !== expectedId) return failure(idPath, 'must match its review-card map key');

  const requiredFailure = expectString(value.lessonId, childPath(path, 'lessonId'))
    ?? expectString(value.kind, childPath(path, 'kind'));
  if (requiredFailure) return requiredFailure;
  if (value.kind !== 'vocabulary' && value.kind !== 'grammar') {
    return failure(childPath(path, 'kind'), 'must be vocabulary or grammar');
  }

  const presentationFailure = expectString(value.prompt, childPath(path, 'prompt'))
    ?? expectString(value.answer, childPath(path, 'answer'));
  if (presentationFailure) return presentationFailure;
  if (Object.hasOwn(value, 'supportingText')) {
    const supportingFailure = expectString(value.supportingText, childPath(path, 'supportingText'));
    if (supportingFailure) return supportingFailure;
  }

  const scheduleFailure = expectIsoTimestamp(value.dueAt, childPath(path, 'dueAt'))
    ?? expectFiniteNumber(value.intervalDays, childPath(path, 'intervalDays'))
    ?? expectNonNegativeInteger(value.repetitions, childPath(path, 'repetitions'))
    ?? expectFiniteNumber(value.ease, childPath(path, 'ease'));
  if (scheduleFailure) return scheduleFailure;
  if ((value.intervalDays as number) < 0) {
    return failure(childPath(path, 'intervalDays'), 'must be non-negative');
  }
  if (Object.hasOwn(value, 'lastReviewedAt')) {
    const reviewedFailure = expectIsoTimestamp(value.lastReviewedAt, childPath(path, 'lastReviewedAt'));
    if (reviewedFailure) return reviewedFailure;
  }
  if (Object.hasOwn(value, 'suspended')) {
    const suspendedFailure = expectBoolean(value.suspended, childPath(path, 'suspended'));
    if (suspendedFailure) return suspendedFailure;
  }
  return undefined;
};

const validateReviewCardMap = (
  input: unknown,
  path: string,
  { allowNull = false }: { allowNull?: boolean } = {},
): Failure | undefined => {
  const objectFailure = expectObject(input, path);
  if (objectFailure) return objectFailure;
  for (const [cardId, card] of Object.entries(input as JsonObject)) {
    if (allowNull && card === null) continue;
    const cardFailure = validateReviewCard(card, childPath(path, cardId), cardId);
    if (cardFailure) return cardFailure;
  }
  return undefined;
};

const validateJapaneseExample = (input: unknown, path: string): Failure | undefined => {
  const objectFailure = expectObject(input, path);
  if (objectFailure) return objectFailure;
  const value = input as JsonObject;
  const knownFailure = validateKnownKeys(value, path, ['japanese', 'reading', 'english']);
  if (knownFailure) return knownFailure;
  const missingFailure = requireOwnKeys(value, path, ['japanese', 'english']);
  if (missingFailure) return missingFailure;
  const requiredFailure = expectString(value.japanese, childPath(path, 'japanese'))
    ?? expectString(value.english, childPath(path, 'english'));
  if (requiredFailure) return requiredFailure;
  return Object.hasOwn(value, 'reading')
    ? expectString(value.reading, childPath(path, 'reading'))
    : undefined;
};

const validateDeviceVocabularyItem = (input: unknown, path: string): Failure | undefined => {
  const objectFailure = expectObject(input, path);
  if (objectFailure) return objectFailure;
  const value = input as JsonObject;
  const knownFailure = validateKnownKeys(value, path, [
    'id',
    'japanese',
    'reading',
    'english',
    'partOfSpeech',
    'note',
    'example',
    'category',
    'source',
    'sourceId',
  ]);
  if (knownFailure) return knownFailure;

  const missingFailure = requireOwnKeys(
    value,
    path,
    ['id', 'japanese', 'reading', 'english', 'partOfSpeech', 'source'],
  );
  if (missingFailure) return missingFailure;

  const requiredFailure = expectString(value.id, childPath(path, 'id'))
    ?? expectString(value.japanese, childPath(path, 'japanese'))
    ?? expectString(value.reading, childPath(path, 'reading'))
    ?? expectString(value.english, childPath(path, 'english'))
    ?? expectString(value.partOfSpeech, childPath(path, 'partOfSpeech'))
    ?? expectString(value.source, childPath(path, 'source'));
  if (requiredFailure) return requiredFailure;
  if (value.source !== 'personal-deck' && value.source !== 'custom') {
    return failure(childPath(path, 'source'), 'must identify a device-owned vocabulary source');
  }

  for (const key of ['note', 'category', 'sourceId'] as const) {
    if (!Object.hasOwn(value, key)) continue;
    const optionalFailure = expectString(value[key], childPath(path, key));
    if (optionalFailure) return optionalFailure;
  }
  return Object.hasOwn(value, 'example')
    ? validateJapaneseExample(value.example, childPath(path, 'example'))
    : undefined;
};

const validateDeviceRecord = (
  input: unknown,
  path: string,
  expectedLessonId: string,
): Failure | undefined => {
  const objectFailure = expectObject(input, path);
  if (objectFailure) return objectFailure;
  const value = input as JsonObject;
  const knownFailure = validateKnownKeys(value, path, ['lessonId', 'item', 'createdAt', 'updatedAt', 'sortKey']);
  if (knownFailure) return knownFailure;

  const missingFailure = requireOwnKeys(value, path, ['lessonId', 'item', 'createdAt', 'updatedAt', 'sortKey']);
  if (missingFailure) return missingFailure;

  const lessonPath = childPath(path, 'lessonId');
  const lessonFailure = expectString(value.lessonId, lessonPath);
  if (lessonFailure) return lessonFailure;
  if (value.lessonId !== expectedLessonId) return failure(lessonPath, 'must match its recordsByLesson map key');

  return validateDeviceVocabularyItem(value.item, childPath(path, 'item'))
    ?? expectIsoTimestamp(value.createdAt, childPath(path, 'createdAt'))
    ?? expectIsoTimestamp(value.updatedAt, childPath(path, 'updatedAt'))
    ?? expectString(value.sortKey, childPath(path, 'sortKey'));
};

const validateVocabularyOverrides = (input: unknown, path: string): Failure | undefined => {
  const objectFailure = expectObject(input, path);
  if (objectFailure) return objectFailure;
  const value = input as JsonObject;
  const knownFailure = validateKnownKeys(value, path, ['recordsByLesson', 'hiddenIdsByLesson', 'updatedAt']);
  if (knownFailure) return knownFailure;

  const missingFailure = requireOwnKeys(value, path, ['recordsByLesson', 'hiddenIdsByLesson', 'updatedAt']);
  if (missingFailure) return missingFailure;

  const recordsPath = childPath(path, 'recordsByLesson');
  const recordsFailure = expectObject(value.recordsByLesson, recordsPath);
  if (recordsFailure) return recordsFailure;
  const deviceIds = new Set<string>();
  for (const [lessonId, records] of Object.entries(value.recordsByLesson as JsonObject)) {
    const lessonRecordsPath = childPath(recordsPath, lessonId);
    if (!Array.isArray(records)) return failure(lessonRecordsPath, 'must be an array');
    for (const [index, record] of records.entries()) {
      const recordPath = childPath(lessonRecordsPath, index);
      const recordFailure = validateDeviceRecord(record, recordPath, lessonId);
      if (recordFailure) return recordFailure;
      const deviceId = (record as DeviceVocabularyRecord).item.id;
      const idPath = childPath(childPath(recordPath, 'item'), 'id');
      if (deviceIds.has(deviceId)) return failure(idPath, 'must not duplicate another device vocabulary ID');
      deviceIds.add(deviceId);
    }
  }

  const hiddenPath = childPath(path, 'hiddenIdsByLesson');
  const hiddenFailure = expectObject(value.hiddenIdsByLesson, hiddenPath);
  if (hiddenFailure) return hiddenFailure;
  const hiddenIds = new Set<string>();
  for (const [lessonId, ids] of Object.entries(value.hiddenIdsByLesson as JsonObject)) {
    const lessonHiddenPath = childPath(hiddenPath, lessonId);
    if (!Array.isArray(ids)) return failure(lessonHiddenPath, 'must be an array');
    for (const [index, id] of ids.entries()) {
      const idPath = childPath(lessonHiddenPath, index);
      const idFailure = expectString(id, idPath);
      if (idFailure) return idFailure;
      if (hiddenIds.has(id)) return failure(idPath, 'must not duplicate another hidden vocabulary ID');
      hiddenIds.add(id);
    }
  }

  const updatedAtPath = childPath(path, 'updatedAt');
  return value.updatedAt === null
    ? undefined
    : expectIsoTimestamp(value.updatedAt, updatedAtPath);
};

const vocabularyIdsIn = (vocabulary: VocabularyOverrides): Set<string> => new Set([
  ...Object.values(vocabulary.recordsByLesson).flat().map(({ item }) => item.id),
  ...Object.values(vocabulary.hiddenIdsByLesson).flat(),
]);

const vocabularyLessonsIn = (vocabulary: VocabularyOverrides): Map<string, string> => {
  const owners = new Map<string, string>();
  for (const [lessonId, records] of Object.entries(vocabulary.recordsByLesson)) {
    for (const { item } of records) owners.set(item.id, lessonId);
  }
  for (const [lessonId, ids] of Object.entries(vocabulary.hiddenIdsByLesson)) {
    for (const id of ids) if (!owners.has(id)) owners.set(id, lessonId);
  }
  return owners;
};

const validateRecovery = (
  input: unknown,
  path: string,
  currentVocabulary: VocabularyOverrides,
  currentReviewCards: Record<string, ReviewCard>,
): Failure | undefined => {
  const objectFailure = expectObject(input, path);
  if (objectFailure) return objectFailure;
  const value = input as JsonObject;
  const knownFailure = validateKnownKeys(value, path, [
    'previousVocabulary',
    'previousAffectedReviewCards',
    'affectedReviewCardIds',
    'authoredBaselineVersion',
    'importedAt',
  ]);
  if (knownFailure) return knownFailure;

  const missingFailure = requireOwnKeys(value, path, [
    'previousVocabulary',
    'previousAffectedReviewCards',
    'affectedReviewCardIds',
    'authoredBaselineVersion',
    'importedAt',
  ]);
  if (missingFailure) return missingFailure;

  const previousCardsPath = childPath(path, 'previousAffectedReviewCards');
  const structuralFailure = validateVocabularyOverrides(value.previousVocabulary, childPath(path, 'previousVocabulary'))
    ?? validateReviewCardMap(value.previousAffectedReviewCards, previousCardsPath, { allowNull: true })
    ?? validateStringArray(value.affectedReviewCardIds, childPath(path, 'affectedReviewCardIds'), { rejectDuplicates: true })
    ?? expectString(value.authoredBaselineVersion, childPath(path, 'authoredBaselineVersion'))
    ?? expectIsoTimestamp(value.importedAt, childPath(path, 'importedAt'));
  if (structuralFailure) return structuralFailure;

  const previousCards = value.previousAffectedReviewCards as JsonObject;
  const affectedIds = value.affectedReviewCardIds as string[];
  const affected = new Set(affectedIds);
  for (const cardId of Object.keys(previousCards)) {
    if (!affected.has(cardId)) {
      return failure(childPath(previousCardsPath, cardId), 'must be listed in affectedReviewCardIds');
    }
  }
  for (const [index, cardId] of affectedIds.entries()) {
    if (!Object.hasOwn(previousCards, cardId)) {
      return failure(
        childPath(childPath(path, 'affectedReviewCardIds'), index),
        'must have a previousAffectedReviewCards entry',
      );
    }
  }

  const expectedAffectedIds = [...new Set([
    ...vocabularyIdsIn(currentVocabulary),
    ...vocabularyIdsIn(value.previousVocabulary as VocabularyOverrides),
  ])]
    .map((vocabularyId) => `review-${vocabularyId}`)
    .sort();
  const affectedPath = childPath(path, 'affectedReviewCardIds');
  const sortedAffectedIds = [...affectedIds].sort();
  const unsortedIndex = affectedIds.findIndex((cardId, index) => cardId !== sortedAffectedIds[index]);
  if (unsortedIndex >= 0) {
    return failure(childPath(affectedPath, unsortedIndex), 'must use deterministic sorted order');
  }

  const expectedAffected = new Set(expectedAffectedIds);
  for (const [index, cardId] of affectedIds.entries()) {
    if (!expectedAffected.has(cardId)) {
      return failure(childPath(affectedPath, index), 'must identify vocabulary in the current or previous layer');
    }
  }
  if (affectedIds.length !== expectedAffectedIds.length) {
    return failure(affectedPath, 'must exactly cover vocabulary in the current and previous layers');
  }

  const previousVocabularyLessons = vocabularyLessonsIn(value.previousVocabulary as VocabularyOverrides);
  const currentVocabularyLessons = vocabularyLessonsIn(currentVocabulary);
  for (const cardId of affectedIds) {
    const previousCard = previousCards[cardId] as ReviewCard | null;
    if (previousCard?.kind !== undefined && previousCard.kind !== 'vocabulary') {
      return failure(childPath(childPath(previousCardsPath, cardId), 'kind'), 'must be vocabulary');
    }
    const vocabularyId = cardId.slice('review-'.length);
    const previousLessonId = previousVocabularyLessons.get(vocabularyId)
      ?? currentVocabularyLessons.get(vocabularyId);
    if (previousCard && previousLessonId && previousCard.lessonId !== previousLessonId) {
      return failure(
        childPath(childPath(previousCardsPath, cardId), 'lessonId'),
        'must match its vocabulary lesson owner',
      );
    }
    const currentCard = currentReviewCards[cardId];
    if (currentCard && currentCard.kind !== 'vocabulary') {
      return failure(childPath(childPath('reviewCards', cardId), 'kind'), 'must be vocabulary while recovery can affect it');
    }
  }
  return undefined;
};

export const validateStudyStateV1: ValidateStudyStateV1 = (input) => {
  const jsonFailure = validateJsonValue(input);
  if (jsonFailure) return jsonFailure;
  const objectFailure = expectObject(input, '');
  if (objectFailure) return objectFailure;
  const value = input as JsonObject;
  const missingFailure = requireOwnKeys(value, '', ['progress', 'reviewCards']);
  if (missingFailure) return missingFailure;
  const structuralFailure = validateProgressMap(value.progress, 'progress')
    ?? validateReviewCardMap(value.reviewCards, 'reviewCards');
  return structuralFailure
    ?? { ok: true, value: input as StudyStateV1 };
};

export const validatePersistedAppStateV2: ValidatePersistedAppStateV2 = (input) => {
  const jsonFailure = validateJsonValue(input);
  if (jsonFailure) return jsonFailure;
  const objectFailure = expectObject(input, '');
  if (objectFailure) return objectFailure;
  const value = input as JsonObject;

  const missingFailure = requireOwnKeys(
    value,
    '',
    ['schemaVersion', 'authoredBaselineVersion', 'progress', 'reviewCards', 'vocabulary'],
  );
  if (missingFailure) return missingFailure;

  if (value.schemaVersion !== 2) return failure('schemaVersion', 'must equal 2');
  const structuralFailure = expectString(value.authoredBaselineVersion, 'authoredBaselineVersion')
    ?? validateProgressMap(value.progress, 'progress')
    ?? validateReviewCardMap(value.reviewCards, 'reviewCards')
    ?? validateVocabularyOverrides(value.vocabulary, 'vocabulary');
  if (structuralFailure) return structuralFailure;

  if (Object.hasOwn(value, 'lastImportRecovery')) {
    const recoveryFailure = validateRecovery(
      value.lastImportRecovery,
      'lastImportRecovery',
      value.vocabulary as VocabularyOverrides,
      value.reviewCards as Record<string, ReviewCard>,
    );
    if (recoveryFailure) return recoveryFailure;
  }

  return { ok: true, value: input as PersistedAppStateV2 };
};
