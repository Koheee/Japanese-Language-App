import { PersistedAppStateV2 } from '../models/appState';

export type AppStateTransition = (current: PersistedAppStateV2) => PersistedAppStateV2;
export type CommitResult =
  | { ok: true; state: PersistedAppStateV2 }
  | { ok: false; error: Error };

export interface AppStateCommitter {
  commit(transition: AppStateTransition): Promise<CommitResult>;
}

export interface ActionLock {
  tryRun<T>(action: () => Promise<T>): Promise<T> | null;
}

export const createActionLock = (): ActionLock => {
  let locked = false;

  return {
    tryRun<T>(action: () => Promise<T>) {
      if (locked) return null;
      locked = true;
      return (async () => {
        try {
          return await action();
        } finally {
          locked = false;
        }
      })();
    },
  };
};

export const createSingleFlight = <T,>(operation: () => Promise<T>) => {
  let inFlight: Promise<T> | null = null;

  return (): Promise<T> => {
    if (inFlight) return inFlight;

    const work = Promise.resolve().then(operation);
    inFlight = work;
    work.then(
      () => {
        if (inFlight === work) inFlight = null;
      },
      () => {
        if (inFlight === work) inFlight = null;
      },
    );
    return work;
  };
};

export const createAppStateCommitter = ({
  getCurrent,
  validate,
  persist,
  publish,
}: {
  getCurrent: () => PersistedAppStateV2;
  validate: (candidate: unknown) => PersistedAppStateV2;
  persist: (candidate: PersistedAppStateV2) => Promise<void>;
  publish: (candidate: PersistedAppStateV2) => void;
}): AppStateCommitter => {
  let tail: Promise<void> = Promise.resolve();

  return {
    commit(transition) {
      const work = tail.then(async (): Promise<CommitResult> => {
        try {
          const candidate = validate(transition(getCurrent()));
          await persist(candidate);
          publish(candidate);
          return { ok: true, state: candidate };
        } catch (cause) {
          return {
            ok: false,
            error: cause instanceof Error ? cause : new Error(String(cause)),
          };
        }
      });
      tail = work.then(() => undefined, () => undefined);
      return work;
    },
  };
};
