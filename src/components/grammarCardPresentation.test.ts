import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { GrammarPoint } from '../models/content';
import {
  createGrammarReferenceAttemptCoordinator,
  createGrammarInsightState,
  openGrammarReference,
  projectGrammarInsight,
  setGrammarInsightFocused,
  toggleGrammarInsight,
} from './grammarCardPresentation';

const deferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
};

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
    const receiverDependentOpener = {
      opened: [] as string[],
      async openURL(url: string) {
        if (this !== receiverDependentOpener) {
          throw new Error('openURL receiver was detached');
        }
        this.opened.push(url);
      },
    };
    const result = await openGrammarReference(
      'https://example.com/grammar',
      (url) => receiverDependentOpener.openURL(url),
    );

    expect(receiverDependentOpener.opened).toEqual(['https://example.com/grammar']);
    expect(result).toBeNull();
  });

  it('turns a rejected further-reading opener into a user-facing error', async () => {
    const result = await openGrammarReference(
      'https://example.com/grammar',
      async () => { throw new Error('browser unavailable'); },
    );

    expect(result).toBe('Could not open this further-reading link. Please try again.');
  });

  it('keeps a newer success when an older failure settles last', async () => {
    const coordinator = createGrammarReferenceAttemptCoordinator();
    const olderFailure = deferred<void>();
    const newerSuccess = deferred<void>();
    const applied: Array<string | null> = [];

    const older = coordinator.open('https://example.com/older', () => olderFailure.promise, (value) => applied.push(value));
    const newer = coordinator.open('https://example.com/newer', () => newerSuccess.promise, (value) => applied.push(value));
    newerSuccess.resolve();
    await newer;
    olderFailure.reject(new Error('older failure'));
    await older;

    expect(applied).toEqual([null]);
  });

  it('keeps a newer failure when an older success settles first', async () => {
    const coordinator = createGrammarReferenceAttemptCoordinator();
    const olderSuccess = deferred<void>();
    const newerFailure = deferred<void>();
    const applied: Array<string | null> = [];

    const older = coordinator.open('https://example.com/older', () => olderSuccess.promise, (value) => applied.push(value));
    const newer = coordinator.open('https://example.com/newer', () => newerFailure.promise, (value) => applied.push(value));
    olderSuccess.resolve();
    await older;
    newerFailure.reject(new Error('newer failure'));
    await newer;

    expect(applied).toEqual(['Could not open this further-reading link. Please try again.']);
  });

  it('drops a further-reading result after the card unmounts', async () => {
    const coordinator = createGrammarReferenceAttemptCoordinator();
    const pending = deferred<void>();
    const applied: Array<string | null> = [];
    const attempt = coordinator.open(
      'https://example.com/reference',
      () => pending.promise,
      (value) => applied.push(value),
    );

    coordinator.deactivate();
    pending.reject(new Error('late failure'));
    await attempt;

    expect(applied).toEqual([]);
  });
});

describe('GrammarCard source contract', () => {
  const source = readFileSync(join(import.meta.dirname, 'GrammarCard.tsx'), 'utf8');

  it('forwards the expansion state through the explicit web ARIA alias', () => {
    const toggleTag = source.match(/<Pressable[\s\S]*?style=\{\[[\s\S]*?styles\.insightToggle[\s\S]*?\}\s*>/)?.[0] ?? '';

    expect(toggleTag).toContain('accessibilityState={insight.toggle.accessibilityState}');
    expect(toggleTag).toContain('aria-expanded={insight.toggle.accessibilityState.expanded}');
  });

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
    expect(source).toContain('createGrammarReferenceAttemptCoordinator()');
    expect(source).toContain('referenceAttemptCoordinator.open(');
    expect(source).toContain('(url) => Linking.openURL(url)');
    expect(source).toContain('referenceAttemptCoordinator.deactivate()');
    expect(expandedContent).toContain('accessibilityRole="alert"');
    expect(expandedContent).toContain('accessibilityLiveRegion="polite"');
    expect(expandedContent).toContain('{referenceError}');
  });
});
