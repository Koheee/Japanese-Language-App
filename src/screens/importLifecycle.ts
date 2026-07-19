import type { RootStackParamList } from '../navigation/types';

type ConfirmationPhase = 'idle' | 'confirming' | 'committed';

export interface ImportConfirmationController {
  begin(): boolean;
  finishFailure(): boolean;
  allowRemovalAfterCommit(): boolean;
  isConfirming(): boolean;
  shouldPreventRemoval(): boolean;
}

export const createImportConfirmationController = (): ImportConfirmationController => {
  let phase: ConfirmationPhase = 'idle';

  return {
    begin() {
      if (phase !== 'idle') return false;
      phase = 'confirming';
      return true;
    },
    finishFailure() {
      if (phase !== 'confirming') return false;
      phase = 'idle';
      return true;
    },
    allowRemovalAfterCommit() {
      if (phase !== 'confirming') return false;
      phase = 'committed';
      return true;
    },
    isConfirming: () => phase === 'confirming',
    shouldPreventRemoval: () => phase === 'confirming',
  };
};

export const handleImportPreviewBeforeRemove = (
  controller: ImportConfirmationController,
  event: { preventDefault(): void },
  onRemovalAllowed: () => void,
): boolean => {
  if (controller.shouldPreventRemoval()) {
    event.preventDefault();
    return false;
  }
  onRemovalAllowed();
  return true;
};

export interface ExclusiveActionCoordinator<Action extends string> {
  claim(action: Action): boolean;
  owns(action: Action): boolean;
  release(action: Action): boolean;
}

export const createExclusiveActionCoordinator = <
  Action extends string,
>(): ExclusiveActionCoordinator<Action> => {
  let owner: Action | null = null;

  return {
    claim(action) {
      if (owner !== null) return false;
      owner = action;
      return true;
    },
    owns: (action) => owner === action,
    release(action) {
      if (owner !== action) return false;
      owner = null;
      return true;
    },
  };
};

const progressTabParams = {
  screen: 'Progress',
} satisfies NonNullable<RootStackParamList['MainTabs']>;

export const buildImportSuccessNavigationAction = () => ({
  type: 'NAVIGATE' as const,
  payload: {
    name: 'MainTabs',
    params: progressTabParams,
    pop: true,
  },
});
