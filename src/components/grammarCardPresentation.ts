import type { GrammarPoint } from '../models/content';

export type GrammarCardSection = 'insight' | 'deeper';

export interface GrammarCardState {
  insightExpanded: boolean;
  deeperExpanded: boolean;
  focusedToggle: GrammarCardSection | null;
}

export interface GrammarCardTogglePresentation {
  accessibilityRole: 'button';
  accessibilityLabel: string;
  accessibilityHint: string;
  accessibilityState: { expanded: boolean };
  minimumTouchTarget: 44;
}

export const createGrammarCardState = (): GrammarCardState => ({
  insightExpanded: false,
  deeperExpanded: false,
  focusedToggle: null,
});

export const toggleGrammarCardSection = (
  state: GrammarCardState,
  section: GrammarCardSection,
): GrammarCardState => section === 'insight'
  ? { ...state, insightExpanded: !state.insightExpanded }
  : { ...state, deeperExpanded: !state.deeperExpanded };

export const setGrammarCardToggleFocused = (
  state: GrammarCardState,
  section: GrammarCardSection,
  focused: boolean,
): GrammarCardState => ({
  ...state,
  focusedToggle: focused
    ? section
    : state.focusedToggle === section
      ? null
      : state.focusedToggle,
});

const createTogglePresentation = (
  title: string,
  sectionLabel: string,
  expanded: boolean,
): GrammarCardTogglePresentation => ({
  accessibilityRole: 'button',
  accessibilityLabel: `${sectionLabel}: ${title}`,
  accessibilityHint: expanded
    ? `Collapses ${sectionLabel.toLowerCase()}.`
    : `Expands ${sectionLabel.toLowerCase()}.`,
  accessibilityState: { expanded },
  minimumTouchTarget: 44,
});

export const projectGrammarCard = (point: GrammarPoint, state: GrammarCardState) => {
  const hasDeeperContent = Boolean(point.notes?.length || point.beyondBasics?.length);

  return {
    insightToggle: createTogglePresentation(
      point.title,
      'A Japanese-first picture',
      state.insightExpanded,
    ),
    deeperToggle: hasDeeperContent
      ? createTogglePresentation(point.title, 'Go deeper', state.deeperExpanded)
      : null,
    insight: state.insightExpanded
      ? {
          whyItWorks: point.whyItWorks,
          usageBoundary: point.usageBoundary,
        }
      : null,
    deeper: state.deeperExpanded && hasDeeperContent
      ? {
          notes: point.notes,
          beyondBasics: point.beyondBasics,
        }
      : null,
  };
};
