import { AUTHORED_BASELINE_VERSION } from '../data/authoredBaseline';
import { PersistedAppStateV2 } from '../models/appState';
import { Lesson } from '../models/content';
import { emptyVocabularyOverrides } from '../models/vocabulary';
import { validatePersistedAppStateV2, validateStudyStateV1 } from './appStateValidation';
import { reconcileReviewCards } from './reconcileReviewCards';

export const V1_STUDY_STORAGE_KEY = '@nihongo-path/study-state/v1' as const;
export const V2_APP_STATE_STORAGE_KEY = '@nihongo-path/app-state/v2' as const;

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export type HydrationResult =
  | { status: 'ready'; source: 'v2' | 'v1' | 'empty'; state: PersistedAppStateV2 }
  | {
    status: 'recovery';
    reason: 'invalid-v2' | 'invalid-v1' | 'read-failed' | 'write-failed' | 'verification-failed';
    message: string;
  };

export const writeAppStateV2 = (storage: KeyValueStorage, state: PersistedAppStateV2) =>
  storage.setItem(V2_APP_STATE_STORAGE_KEY, JSON.stringify(state));

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const invalidMessage = (label: string, path: string, message: string) =>
  `${label}${path ? ` at ${path}` : ''}: ${message}`;

const deepEqualJson = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left)
      && Array.isArray(right)
      && left.length === right.length
      && left.every((value, index) => deepEqualJson(value, right[index]));
  }
  if (left === null || right === null || typeof left !== 'object' || typeof right !== 'object') {
    return false;
  }
  const leftObject = left as Record<string, unknown>;
  const rightObject = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftObject);
  const rightKeys = Object.keys(rightObject);
  return leftKeys.length === rightKeys.length
    && leftKeys.every(
      (key) => Object.hasOwn(rightObject, key) && deepEqualJson(leftObject[key], rightObject[key]),
    );
};

const writeAndVerify = async (
  storage: KeyValueStorage,
  state: PersistedAppStateV2,
): Promise<Extract<HydrationResult, { status: 'recovery' }> | undefined> => {
  try {
    await writeAppStateV2(storage, state);
  } catch (error) {
    return { status: 'recovery', reason: 'write-failed', message: `V2 write failed: ${errorMessage(error)}` };
  }

  let readbackText: string | null;
  try {
    readbackText = await storage.getItem(V2_APP_STATE_STORAGE_KEY);
  } catch (error) {
    return {
      status: 'recovery',
      reason: 'verification-failed',
      message: `V2 read-back failed: ${errorMessage(error)}`,
    };
  }
  if (readbackText === null) {
    return { status: 'recovery', reason: 'verification-failed', message: 'V2 read-back was missing' };
  }

  let readback: unknown;
  try {
    readback = JSON.parse(readbackText) as unknown;
  } catch (error) {
    return {
      status: 'recovery',
      reason: 'verification-failed',
      message: `V2 read-back was not JSON: ${errorMessage(error)}`,
    };
  }
  const validation = validatePersistedAppStateV2(readback);
  if (!validation.ok) {
    return {
      status: 'recovery',
      reason: 'verification-failed',
      message: invalidMessage('V2 read-back was invalid', validation.path, validation.message),
    };
  }
  if (!deepEqualJson(validation.value, state)) {
    return { status: 'recovery', reason: 'verification-failed', message: 'V2 read-back did not match the written state' };
  }
  return undefined;
};

export async function hydrateAppStateV2({
  storage,
  lessons,
  now = new Date(),
}: {
  storage: KeyValueStorage;
  lessons: readonly Lesson[];
  now?: Date;
}): Promise<HydrationResult> {
  let v2Text: string | null;
  try {
    v2Text = await storage.getItem(V2_APP_STATE_STORAGE_KEY);
  } catch (error) {
    return { status: 'recovery', reason: 'read-failed', message: `V2 read failed: ${errorMessage(error)}` };
  }

  if (v2Text !== null) {
    let parsedV2: unknown;
    try {
      parsedV2 = JSON.parse(v2Text) as unknown;
    } catch (error) {
      return { status: 'recovery', reason: 'invalid-v2', message: `V2 JSON was invalid: ${errorMessage(error)}` };
    }
    const validation = validatePersistedAppStateV2(parsedV2);
    if (!validation.ok) {
      return {
        status: 'recovery',
        reason: 'invalid-v2',
        message: invalidMessage('V2 state was invalid', validation.path, validation.message),
      };
    }

    const reconciled: PersistedAppStateV2 = {
      ...validation.value,
      authoredBaselineVersion: AUTHORED_BASELINE_VERSION,
      reviewCards: reconcileReviewCards({
        lessons,
        progress: validation.value.progress,
        reviewCards: validation.value.reviewCards,
        vocabulary: validation.value.vocabulary,
        now,
      }),
    };
    if (JSON.stringify(reconciled) !== JSON.stringify(validation.value)) {
      const writeFailure = await writeAndVerify(storage, reconciled);
      if (writeFailure) return writeFailure;
      return { status: 'ready', source: 'v2', state: reconciled };
    }
    return { status: 'ready', source: 'v2', state: validation.value };
  }

  let v1Text: string | null;
  try {
    v1Text = await storage.getItem(V1_STUDY_STORAGE_KEY);
  } catch (error) {
    return { status: 'recovery', reason: 'read-failed', message: `V1 read failed: ${errorMessage(error)}` };
  }

  let progress: PersistedAppStateV2['progress'] = {};
  let reviewCards: PersistedAppStateV2['reviewCards'] = {};
  let source: 'v1' | 'empty' = 'empty';
  if (v1Text !== null) {
    let parsedV1: unknown;
    try {
      parsedV1 = JSON.parse(v1Text) as unknown;
    } catch (error) {
      return { status: 'recovery', reason: 'invalid-v1', message: `V1 JSON was invalid: ${errorMessage(error)}` };
    }
    const validation = validateStudyStateV1(parsedV1);
    if (!validation.ok) {
      return {
        status: 'recovery',
        reason: 'invalid-v1',
        message: invalidMessage('V1 state was invalid', validation.path, validation.message),
      };
    }
    progress = validation.value.progress;
    reviewCards = validation.value.reviewCards;
    source = 'v1';
  }

  const vocabulary = emptyVocabularyOverrides();
  const state: PersistedAppStateV2 = {
    schemaVersion: 2,
    authoredBaselineVersion: AUTHORED_BASELINE_VERSION,
    progress,
    reviewCards: reconcileReviewCards({ lessons, progress, reviewCards, vocabulary, now }),
    vocabulary,
  };
  const writeFailure = await writeAndVerify(storage, state);
  if (writeFailure) return writeFailure;
  return { status: 'ready', source, state };
}
