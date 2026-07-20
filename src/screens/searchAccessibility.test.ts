import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(join(import.meta.dirname, '..', relativePath), 'utf8');

describe('global search presentation contracts', () => {
  it('provides labelled, focused input and accessible result announcements', () => {
    const source = read('screens/SearchScreen.tsx');

    expect(source).toContain('autoFocus');
    expect(source).toContain('accessibilityLabel="Search all lessons"');
    expect(source).toContain('accessibilityHint="Search Japanese, kana readings, and English explanations."');
    expect(source).toContain('accessibilityLiveRegion="polite"');
    expect(source).toContain('keyboardShouldPersistTaps="handled"');
  });

  it('uses four-side safe areas and virtualized results', () => {
    const source = read('screens/SearchScreen.tsx');

    expect(source).toContain('useSafeAreaInsets');
    expect(source).toContain('FlatList');
    expect(source).toContain('paddingTop: spacing.md + insets.top');
    expect(source).toContain('paddingBottom: spacing.xl + insets.bottom');
    expect(source).toContain('paddingLeft: spacing.lg + insets.left');
    expect(source).toContain('paddingRight: spacing.lg + insets.right');
  });

  it('keeps every interactive search control at least 44 points tall', () => {
    for (const path of ['components/SearchButton.tsx', 'components/SearchResultCard.tsx', 'screens/SearchScreen.tsx']) {
      expect(read(path)).toContain('minHeight: 44');
    }
  });

  it('renders authored highlight segments with a non-color-only treatment', () => {
    const source = read('components/HighlightedText.tsx');

    expect(source).toContain('segment.highlighted');
    expect(source).toContain('backgroundColor: colors.goldSoft');
    expect(source).toContain("fontWeight: '900'");
  });
});

