export interface LatestAttemptCoordinator<T> {
  run: (operation: () => Promise<T>, applyResult: (result: T) => void) => Promise<void>;
  deactivate: () => void;
}

export const createLatestAttemptCoordinator = <T>(): LatestAttemptCoordinator<T> => {
  let active = true;
  let latestAttemptId = 0;
  return {
    run: async (operation, applyResult) => {
      const attemptId = ++latestAttemptId;
      const result = await operation();
      if (active && attemptId === latestAttemptId) applyResult(result);
    },
    deactivate: () => {
      active = false;
      latestAttemptId += 1;
    },
  };
};
