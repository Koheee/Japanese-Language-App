import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { GrammarPoint } from '../models/content';
import {
  createGrammarInsightState,
  openGrammarReference,
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

  it('opens a further-reading link and reports no error', async () => {
    const opened: string[] = [];
    const result = await openGrammarReference(
      'https://example.com/grammar',
      async (url) => { opened.push(url); },
    );

    expect(opened).toEqual(['https://example.com/grammar']);
    expect(result).toBeNull();
  });

  it('turns a rejected further-reading opener into a user-facing error', async () => {
    const result = await openGrammarReference(
      'https://example.com/grammar',
      async () => { throw new Error('browser unavailable'); },
    );

    expect(result).toBe('Could not open this further-reading link. Please try again.');
  });
});

describe('GrammarCard source contract', () => {
  const source = readFileSync(join(import.meta.dirname, 'GrammarCard.tsx'), 'utf8');

  it('hides the decorative chevron from native and web accessibility trees', () => {
    const chevronTag = source.match(/<Text[^>]*style=\{styles\.insightChevron\}[^>]*>/)?.[0];

    expect(chevronTag).toContain('accessibilityElementsHidden');
    expect(chevronTag).toContain('importantForAccessibility="no"');
    expect(chevronTag).toContain('aria-hidden={true}');
  });

  it('keeps focus geometry fixed and uses the high-contrast forest token', () => {
    const baseStyle = source.match(/insightToggle:\s*\{[\s\S]*?\n\s*\},\n\s*insightToggleFocused:/)?.[0];
    const focusedStyle = source.match(/insightToggleFocused:\s*\{[^}]*\}/)?.[0];

    expect(baseStyle).toContain('borderWidth: 1');
    expect(focusedStyle).toContain('borderColor: colors.forest');
    expect(focusedStyle).not.toContain('borderWidth');
  });

  it('reports external-link failures from inside the expanded insight', () => {
    const expandedContent = source.match(/\{insight\.content \? \([\s\S]*?\n\s*\) : null\}/)?.[0];

    expect(source).toContain('setReferenceError(null)');
    expect(source).toContain('openGrammarReference(reference.url, Linking.openURL)');
    expect(source).toContain('.then(setReferenceError)');
    expect(expandedContent).toContain('accessibilityRole="alert"');
    expect(expandedContent).toContain('accessibilityLiveRegion="polite"');
    expect(expandedContent).toContain('{referenceError}');
  });
});
