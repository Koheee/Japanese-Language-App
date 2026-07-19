import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const readScreen = (file: string) => readFileSync(join(import.meta.dirname, file), 'utf8');

describe('review screen accessibility contracts', () => {
  const source = readScreen('ReviewScreen.tsx');

  it('exposes the review reveal card as a state-aware button', () => {
    const revealTag = source.match(
      /<Pressable[\s\S]*?style=\{\[styles\.card,[\s\S]*?\}\s*>/,
    )?.[0] ?? '';

    expect(revealTag).toContain('accessibilityRole="button"');
    expect(revealTag).toContain('accessibilityLabel={revealed');
    expect(revealTag).toContain('accessibilityHint={revealed');
    expect(revealTag).toContain('accessibilityState={{ expanded: revealed }}');
    expect(revealTag).toContain('aria-expanded={revealed}');
  });

  it('gives every grading action a button role and names its resulting interval', () => {
    const ratingTag = source.match(
      /\{ratings\.map\([\s\S]*?<Pressable[\s\S]*?style=\{\[styles\.ratingButton,[\s\S]*?\}\s*>/,
    )?.[0] ?? '';

    expect(ratingTag).toContain('accessibilityRole="button"');
    expect(ratingTag).toContain(
      'accessibilityLabel={`${rating.label}, next review ${formatInterval(rating.id, card)}`}',
    );
    expect(ratingTag).toContain('accessibilityHint="Schedules this card using the selected recall rating"');
  });
});

describe('route-local tab accessibility contracts', () => {
  it('forwards selected state for every lesson detail tab on web and native', () => {
    const source = readScreen('LessonDetailScreen.tsx');
    const tabTag = source.match(
      /\{tabs\.map\([\s\S]*?<Pressable[\s\S]*?style=\{\[styles\.tab,[\s\S]*?\}\s*>/,
    )?.[0] ?? '';

    expect(tabTag).toContain('accessibilityState={{ selected: activeTab === tab.id }}');
    expect(tabTag).toContain('aria-selected={activeTab === tab.id}');
  });

  it('forwards selected state for both vocabulary manager tabs on web and native', () => {
    const source = readScreen('VocabularyManagerScreen.tsx');

    expect(source).toContain("accessibilityState={{ selected: ui.view === 'active' }}");
    expect(source).toContain("aria-selected={ui.view === 'active'}");
    expect(source).toContain("accessibilityState={{ selected: ui.view === 'hidden' }}");
    expect(source).toContain("aria-selected={ui.view === 'hidden'}");
  });
});
