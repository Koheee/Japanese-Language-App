import type { GrammarPoint } from '../models/content';

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
