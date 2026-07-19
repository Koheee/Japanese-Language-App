export interface CompositionCommitCallbacks {
  onDraftChange(value: string): void;
  onCommittedChange(value: string): void;
  onCompositionChange?(isComposing: boolean): void;
}

export interface CompositionCommitController {
  syncDraft(value: string): void;
  change(value: string): void;
  compositionStart(): void;
  compositionEnd(value: string): void;
  blur(value: string): void;
}

interface CompositionHost {
  value: string;
  addEventListener(type: 'compositionstart' | 'compositionend', listener: EventListener): void;
  removeEventListener(type: 'compositionstart' | 'compositionend', listener: EventListener): void;
}

export const createCompositionCommitController = (
  initialDraft: string,
  getCallbacks: () => CompositionCommitCallbacks,
): CompositionCommitController => {
  let isComposing = false;
  let lastDraft = initialDraft;
  let hasCommitted = false;
  let lastCommitted = '';

  const publishDraft = (value: string) => {
    if (value === lastDraft) return;
    lastDraft = value;
    getCallbacks().onDraftChange(value);
  };

  const publishCommit = (value: string) => {
    if (hasCommitted && value === lastCommitted) return;
    hasCommitted = true;
    lastCommitted = value;
    getCallbacks().onCommittedChange(value);
  };

  return {
    syncDraft(value) {
      lastDraft = value;
    },
    change(value) {
      publishDraft(value);
      if (!isComposing) publishCommit(value);
    },
    compositionStart() {
      if (isComposing) return;
      isComposing = true;
      getCallbacks().onCompositionChange?.(true);
    },
    compositionEnd(value) {
      publishDraft(value);
      if (isComposing) {
        isComposing = false;
        getCallbacks().onCompositionChange?.(false);
      }
      publishCommit(value);
    },
    blur(value) {
      if (!isComposing) publishCommit(value);
    },
  };
};

export const attachCompositionListeners = (
  host: CompositionHost,
  controller: CompositionCommitController,
) => {
  const handleCompositionStart: EventListener = () => controller.compositionStart();
  const handleCompositionEnd: EventListener = () => controller.compositionEnd(host.value);

  host.addEventListener('compositionstart', handleCompositionStart);
  host.addEventListener('compositionend', handleCompositionEnd);

  return () => {
    host.removeEventListener('compositionstart', handleCompositionStart);
    host.removeEventListener('compositionend', handleCompositionEnd);
  };
};

export const isCompositionHost = (value: unknown): value is CompositionHost => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<CompositionHost>;
  return typeof candidate.value === 'string'
    && typeof candidate.addEventListener === 'function'
    && typeof candidate.removeEventListener === 'function';
};
