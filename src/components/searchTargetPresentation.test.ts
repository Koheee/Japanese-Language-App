import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..');
const read = (relativePath: string) => readFileSync(join(root, relativePath), 'utf8');

describe('search target landing presentation', () => {
  it('wires measured anchors, one-time scrolling, and fallback into Lesson Detail', () => {
    const source = read('screens/LessonDetailScreen.tsx');

    expect(source).toContain('calculateSearchTargetY');
    expect(source).toContain('shouldRunSearchLanding');
    expect(source).toContain('scrollTo({ y: targetY, animated: true })');
    expect(source).toContain("scrollIntoView?.({ behavior: 'smooth', block: 'start' })");
    expect(source).toContain('scrollTo({ y: 0, animated: true })');
    expect(source).toContain('SearchTargetAnchor');
    expect(source).toContain('AccessibilityInfo.setAccessibilityFocus');
    expect(source).toContain("Platform.OS === 'web'");
    expect(source).toContain('focus?.()');
    expect(source).toContain('}, 2_000);');
    expect(source).toContain('2_500');

    const anchor = read('components/SearchTargetAnchor.tsx');
    expect(anchor).toContain('tabIndex={highlighted ? -1 : undefined}');
  });

  it('passes subsection landing intent into grammar and dialogue content', () => {
    const detail = read('screens/LessonDetailScreen.tsx');
    const grammar = read('components/GrammarCard.tsx');
    const dialogue = read('components/DialogueBubble.tsx');

    expect(detail).toContain('searchLanding=');
    expect(grammar).toContain('applyGrammarSearchLanding');
    expect(grammar).toContain('highlightSearchText');
    expect(dialogue).toContain('highlightSearchText');
    expect(dialogue).toContain('initialGrammarId');
  });
});
