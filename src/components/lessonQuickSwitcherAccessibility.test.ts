import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const source = readFileSync(join(import.meta.dirname, 'LessonQuickSwitcher.tsx'), 'utf8');

describe('LessonQuickSwitcher accessibility contract', () => {
  it('exposes a labelled state-aware trigger and hides its decorative chevron', () => {
    const trigger = source.match(/<Pressable[\s\S]*?ref=\{triggerRef\}[\s\S]*?>/)?.[0] ?? '';
    const chevron = source.match(/<Text[\s\S]*?style=\{styles\.chevron\}[\s\S]*?>/)?.[0] ?? '';

    expect(trigger).toContain('accessibilityRole="button"');
    expect(trigger).toContain('accessibilityState={{ expanded: open }}');
    expect(trigger).toContain('aria-expanded={open}');
    expect(trigger).toContain('accessibilityLabel={triggerAccessibilityLabel}');
    expect(chevron).toContain('accessibilityElementsHidden');
    expect(chevron).toContain('importantForAccessibility="no"');
    expect(chevron).toContain('aria-hidden={true}');
  });

  it('supports modal dismissal through backdrop, Close, platform back, and accessibility escape', () => {
    expect(source).toContain('onRequestClose={close}');
    expect(source).toContain('onAccessibilityEscape={close}');
    expect(source).toContain('accessibilityLabel="Close lesson chooser"');
    expect(source).toContain('accessibilityLabel="Close choose-a-lesson menu"');
    expect(source).toContain('accessibilityViewIsModal');
    expect(source).toContain('aria-modal={true}');
    expect(source).toContain('role="dialog"');
  });

  it('exposes every option as a large labelled control with explicit selected state', () => {
    const row = source.match(/<Pressable[\s\S]*?accessibilityLabel=\{item\.accessibilityLabel\}[\s\S]*?>/)?.[0] ?? '';

    expect(row).toContain('accessibilityRole="button"');
    expect(row).toContain('accessibilityState={{ selected: item.selected }}');
    expect(row).toContain('aria-selected={item.selected}');
    expect(source).toContain('row: { height: ROW_HEIGHT');
    expect(source).toContain('const ROW_HEIGHT = 72;');
  });

  it('restores focus to the trigger after closing', () => {
    expect(source).toContain('const restoreTriggerFocus = () =>');
    expect(source).toContain('AccessibilityInfo.setAccessibilityFocus(handle)');
    expect(source).toContain("Platform.OS === 'web'");
    expect(source).toContain('focus?.()');
  });
});
