import { describe, expect, it } from 'vitest';

import type { GrammarPoint } from '../models/content';
import {
  createGrammarInsightState,
  projectGrammarInsight,
  setGrammarInsightFocused,
  toggleGrammarInsight,
} from './grammarCardPresentation';

const point: GrammarPoint = {
  id: 'l1-topic-copula',
  title: 'Make a noun the topic, then identify it',
  pattern: 'A は B です',
  plainEnglish: '“As for A, it is B.”',
  explanation: 'Put the shared topic before は and the identifying noun before です to close the noun sentence politely.',
  whyItWorks: 'Japanese establishes a conversational frame before supplying the comment, so understood material can remain unspoken.',
  usageBoundary: 'Do not replace every English subject with は; this particle marks the chosen conversational topic.',
  notes: ['Literal frame: “As for A, B.”'],
  examples: [
    { japanese: 'わたしは がくせいです。', reading: 'わたしは がくせいです。', english: 'I am a student.' },
    { japanese: 'エマさんは けんきゅうしゃです。', reading: 'エマさんは けんきゅうしゃです。', english: 'Emma is a researcher.' },
  ],
  furtherReading: [{
    title: "Tae Kim's Guide: Introduction to Particles",
    url: 'https://guidetojapanese.org/learn/grammar/particlesintro',
  }],
};

describe('grammar card presentation', () => {
  it('starts collapsed with an explicit 44-pixel accessible toggle contract', () => {
    const projection = projectGrammarInsight(point, createGrammarInsightState());
    expect(projection.toggle).toEqual({
      accessibilityRole: 'button',
      accessibilityLabel: 'Japanese-first insight: Make a noun the topic, then identify it',
      accessibilityHint: 'Expands the Japanese-first insight, usage boundary, notes, and further reading.',
      accessibilityState: { expanded: false },
      minimumTouchTarget: 44,
    });
    expect(projection.content).toBeNull();
  });

  it('toggles one immutable state without changing another card state', () => {
    const first = createGrammarInsightState();
    const second = createGrammarInsightState();
    const expandedFirst = toggleGrammarInsight(first);
    expect(expandedFirst.expanded).toBe(true);
    expect(first.expanded).toBe(false);
    expect(second.expanded).toBe(false);
    expect(projectGrammarInsight(point, expandedFirst).content).toEqual({
      whyItWorks: point.whyItWorks,
      usageBoundary: point.usageBoundary,
      notes: point.notes,
      furtherReading: point.furtherReading,
    });
  });

  it('projects focus and the collapsed hint without losing expansion', () => {
    const focused = setGrammarInsightFocused(toggleGrammarInsight(createGrammarInsightState()), true);
    expect(focused).toEqual({ expanded: true, focused: true });
    expect(projectGrammarInsight(point, focused).toggle.accessibilityHint).toBe(
      'Collapses the Japanese-first insight, usage boundary, notes, and further reading.',
    );
  });
});
