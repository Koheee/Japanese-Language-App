import type { GrammarPoint } from '../models/content';
import { createLatestAttemptCoordinator } from './latestAttemptCoordinator';

export interface GrammarInsightState {
  expanded: boolean;
  focused: boolean;
}

export const createGrammarInsightState = (): GrammarInsightState => ({
  expanded: false,
  focused: false,
});

export const toggleGrammarInsight = (state: GrammarInsightState): GrammarInsightState => ({
  ...state,
  expanded: !state.expanded,
});

export const setGrammarInsightFocused = (
  state: GrammarInsightState,
  focused: boolean,
): GrammarInsightState => ({ ...state, focused });

export const openGrammarReference = async (
  url: string,
  openUrl: (url: string) => Promise<unknown>,
): Promise<string | null> => {
  try {
    await openUrl(url);
    return null;
  } catch {
    return 'Could not open this further-reading link. Please try again.';
  }
};

export const createGrammarReferenceAttemptCoordinator = () => {
  const coordinator = createLatestAttemptCoordinator<string | null>();
  return {
    open: (
      url: string,
      openUrl: (url: string) => Promise<unknown>,
      applyResult: (result: string | null) => void,
    ) => coordinator.run(() => openGrammarReference(url, openUrl), applyResult),
    deactivate: coordinator.deactivate,
  };
};

export const projectGrammarInsight = (point: GrammarPoint, state: GrammarInsightState) => ({
  toggle: {
    accessibilityRole: 'button' as const,
    accessibilityLabel: `Japanese-first insight: ${point.title}`,
    accessibilityHint: state.expanded
      ? 'Collapses the Japanese-first insight, usage boundary, notes, and further reading.'
      : 'Expands the Japanese-first insight, usage boundary, notes, and further reading.',
    accessibilityState: { expanded: state.expanded },
    minimumTouchTarget: 44 as const,
  },
  content: state.expanded ? {
    whyItWorks: point.whyItWorks,
    usageBoundary: point.usageBoundary,
    notes: point.notes,
    furtherReading: point.furtherReading,
  } : null,
});
