# Lesson Quick-Switcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an accessible lesson dropdown to every lesson-detail section so the learner can jump among Lessons 1–25 while remaining on Overview, Grammar, Words, or Dialogue.

**Architecture:** A pure presentation model projects ordered lesson summaries and selection decisions. A self-contained `LessonQuickSwitcher` owns modal presentation and open/close state, while `LessonDetailScreen` remains the owner of the active section and changes only its existing `lessonId` route parameter.

**Tech Stack:** React Native 0.81, React Native Web 0.21, Expo 54, TypeScript 5.9, React Navigation 7, Vitest 3.

## Global Constraints

- The selector appears only on `LessonDetailScreen`, not Exercise, Review, Progress, Vocabulary Manager, or Word Editor.
- The dropdown lists exactly Lessons 1–25 in numeric order.
- Lesson labels contain lesson number, Japanese title, and English title; no romaji is introduced.
- Selecting a different lesson preserves the active Overview, Grammar, Words, or Dialogue section.
- Selecting the current lesson only closes the dropdown.
- A lesson switch clears the Words draft and committed search queries.
- The Back control still returns directly to the lesson list; switching must not add navigation history.
- Trigger and lesson rows are at least 52 pixels high; every other interactive control remains at least 44 pixels high.
- The implementation adds no dependency and changes no persistence, review schedule, progress, or vocabulary data.
- React Native accessibility props and explicit React Native Web ARIA state must both be present where expanded or selected state is required.

---

## File structure

- Create `src/components/lessonQuickSwitcherModel.ts`: pure option projection and selection decisions.
- Create `src/components/lessonQuickSwitcherModel.test.ts`: model ordering, label, selected-state, and decision tests.
- Create `src/components/LessonQuickSwitcher.tsx`: cross-platform trigger, modal, lesson list, focus restoration, and styles.
- Create `src/components/lessonQuickSwitcherAccessibility.test.ts`: source-level accessibility and modal lifecycle contracts.
- Modify `src/screens/LessonDetailScreen.tsx`: render the component, clear Words queries, update `lessonId` in place, and reset section scroll position.
- Create `src/screens/lessonQuickSwitcherIntegration.test.ts`: source-level navigation, section-preservation, and query-reset contracts.

---

### Task 1: Lesson quick-switcher presentation model

**Files:**
- Create: `src/components/lessonQuickSwitcherModel.ts`
- Create: `src/components/lessonQuickSwitcherModel.test.ts`

**Interfaces:**
- Consumes: `Pick<Lesson, 'id' | 'number' | 'title' | 'japaneseTitle'>` from `src/models/content.ts`.
- Produces: `LessonQuickSwitchLesson`, `LessonQuickSwitchOption`, `LessonQuickSwitchDecision`, `createLessonQuickSwitchOptions(lessons, currentLessonId)`, and `resolveLessonQuickSwitchSelection(options, currentLessonId, selectedLessonId)`.

- [ ] **Step 1: Write the failing model tests**

Create `src/components/lessonQuickSwitcherModel.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { lessons } from '../data/lessons';
import {
  createLessonQuickSwitchOptions,
  resolveLessonQuickSwitchSelection,
  type LessonQuickSwitchLesson,
} from './lessonQuickSwitcherModel';

const unorderedLessons: LessonQuickSwitchLesson[] = [
  { id: 'lesson-10', number: 10, japaneseTitle: 'あります・います', title: 'What is around us' },
  { id: 'lesson-02', number: 2, japaneseTitle: 'これは なんですか', title: 'Things around us' },
  { id: 'lesson-01', number: 1, japaneseTitle: 'はじめまして', title: 'A first introduction' },
];

describe('lesson quick-switcher model', () => {
  it('projects the complete authored curriculum as Lessons 01 through 25', () => {
    const options = createLessonQuickSwitchOptions(lessons, 'lesson-01');

    expect(options).toHaveLength(25);
    expect(options.map((option) => option.number)).toEqual(
      Array.from({ length: 25 }, (_, index) => index + 1),
    );
    expect(options.every((option) => !('romaji' in option))).toBe(true);
  });

  it('projects lessons in numeric order with complete labels', () => {
    const options = createLessonQuickSwitchOptions(unorderedLessons, 'lesson-02');

    expect(options.map((option) => option.id)).toEqual(['lesson-01', 'lesson-02', 'lesson-10']);
    expect(options[1]).toEqual({
      id: 'lesson-02',
      number: 2,
      numberLabel: '02',
      japaneseTitle: 'これは なんですか',
      title: 'Things around us',
      accessibilityLabel: 'Lesson 02, これは なんですか, Things around us',
      selected: true,
    });
  });

  it('does not mutate the lesson array while sorting', () => {
    createLessonQuickSwitchOptions(unorderedLessons, 'lesson-02');
    expect(unorderedLessons.map((lesson) => lesson.id)).toEqual(['lesson-10', 'lesson-02', 'lesson-01']);
  });

  it('returns close when the current lesson is selected', () => {
    const options = createLessonQuickSwitchOptions(unorderedLessons, 'lesson-02');
    expect(resolveLessonQuickSwitchSelection(options, 'lesson-02', 'lesson-02')).toEqual({ type: 'close' });
  });

  it('returns the selected valid lesson ID for a real switch', () => {
    const options = createLessonQuickSwitchOptions(unorderedLessons, 'lesson-02');
    expect(resolveLessonQuickSwitchSelection(options, 'lesson-02', 'lesson-10')).toEqual({
      type: 'select',
      lessonId: 'lesson-10',
    });
  });

  it('ignores a lesson ID that is not in the projected options', () => {
    const options = createLessonQuickSwitchOptions(unorderedLessons, 'lesson-02');
    expect(resolveLessonQuickSwitchSelection(options, 'lesson-02', 'lesson-99')).toEqual({ type: 'ignore' });
  });
});
```

- [ ] **Step 2: Run the model tests and verify RED**

Run:

```powershell
pnpm.cmd test -- src/components/lessonQuickSwitcherModel.test.ts
```

Expected: FAIL because `./lessonQuickSwitcherModel` does not exist.

- [ ] **Step 3: Implement the pure model**

Create `src/components/lessonQuickSwitcherModel.ts`:

```ts
import type { Lesson } from '../models/content';

export type LessonQuickSwitchLesson = Pick<
  Lesson,
  'id' | 'number' | 'title' | 'japaneseTitle'
>;

export interface LessonQuickSwitchOption extends LessonQuickSwitchLesson {
  numberLabel: string;
  accessibilityLabel: string;
  selected: boolean;
}

export type LessonQuickSwitchDecision =
  | { type: 'close' }
  | { type: 'ignore' }
  | { type: 'select'; lessonId: string };

export const createLessonQuickSwitchOptions = (
  lessons: LessonQuickSwitchLesson[],
  currentLessonId: string,
): LessonQuickSwitchOption[] => [...lessons]
  .sort((a, b) => a.number - b.number)
  .map((lesson) => {
    const numberLabel = String(lesson.number).padStart(2, '0');
    return {
      ...lesson,
      numberLabel,
      accessibilityLabel: `Lesson ${numberLabel}, ${lesson.japaneseTitle}, ${lesson.title}`,
      selected: lesson.id === currentLessonId,
    };
  });

export const resolveLessonQuickSwitchSelection = (
  options: LessonQuickSwitchOption[],
  currentLessonId: string,
  selectedLessonId: string,
): LessonQuickSwitchDecision => {
  if (!options.some((option) => option.id === selectedLessonId)) return { type: 'ignore' };
  if (selectedLessonId === currentLessonId) return { type: 'close' };
  return { type: 'select', lessonId: selectedLessonId };
};
```

- [ ] **Step 4: Run the model tests and verify GREEN**

Run:

```powershell
pnpm.cmd test -- src/components/lessonQuickSwitcherModel.test.ts
pnpm.cmd typecheck
```

Expected: six model tests PASS and TypeScript exits `0`.

- [ ] **Step 5: Commit Task 1**

```powershell
git add -- src/components/lessonQuickSwitcherModel.ts src/components/lessonQuickSwitcherModel.test.ts
git commit -m "feat: model lesson quick switching"
```

---

### Task 2: Accessible cross-platform lesson dropdown

**Files:**
- Create: `src/components/LessonQuickSwitcher.tsx`
- Create: `src/components/lessonQuickSwitcherAccessibility.test.ts`

**Interfaces:**
- Consumes: `LessonQuickSwitchLesson`, `createLessonQuickSwitchOptions`, and `resolveLessonQuickSwitchSelection` from Task 1.
- Produces: `LessonQuickSwitcher({ currentLessonId, disabled, lessons, onSelect })`.

- [ ] **Step 1: Write the failing accessibility contract tests**

Create `src/components/lessonQuickSwitcherAccessibility.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the accessibility tests and verify RED**

Run:

```powershell
pnpm.cmd test -- src/components/lessonQuickSwitcherAccessibility.test.ts
```

Expected: FAIL because `LessonQuickSwitcher.tsx` does not exist.

- [ ] **Step 3: Implement the dropdown component**

Create `src/components/LessonQuickSwitcher.tsx`:

```tsx
import { useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, shadows, spacing, typography } from '../theme/tokens';
import {
  createLessonQuickSwitchOptions,
  resolveLessonQuickSwitchSelection,
  type LessonQuickSwitchLesson,
} from './lessonQuickSwitcherModel';

const ROW_HEIGHT = 72;

interface LessonQuickSwitcherProps {
  currentLessonId: string;
  disabled?: boolean;
  lessons: LessonQuickSwitchLesson[];
  onSelect: (lessonId: string) => void;
}

export function LessonQuickSwitcher({
  currentLessonId,
  disabled = false,
  lessons,
  onSelect,
}: LessonQuickSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [triggerFocused, setTriggerFocused] = useState(false);
  const [focusedLessonId, setFocusedLessonId] = useState<string | null>(null);
  const triggerRef = useRef<View>(null);
  const insets = useSafeAreaInsets();
  const options = useMemo(
    () => createLessonQuickSwitchOptions(lessons, currentLessonId),
    [currentLessonId, lessons],
  );
  const currentOption = options.find((option) => option.selected);
  const currentIndex = options.findIndex((option) => option.selected);
  const triggerAccessibilityLabel = currentOption
    ? `Choose another lesson; current ${currentOption.accessibilityLabel}`
    : 'Choose a lesson';

  const restoreTriggerFocus = () => {
    requestAnimationFrame(() => {
      if (Platform.OS === 'web') {
        (triggerRef.current as unknown as { focus?: () => void } | null)?.focus?.();
        return;
      }
      const handle = findNodeHandle(triggerRef.current);
      if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
    });
  };

  const close = () => {
    setOpen(false);
    setFocusedLessonId(null);
    restoreTriggerFocus();
  };

  const choose = (selectedLessonId: string) => {
    const decision = resolveLessonQuickSwitchSelection(
      options,
      currentLessonId,
      selectedLessonId,
    );
    close();
    if (decision.type === 'select') onSelect(decision.lessonId);
  };

  return (
    <>
      <Pressable
        accessibilityHint="Opens a list of Lessons 1 through 25"
        accessibilityLabel={triggerAccessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        aria-expanded={open}
        disabled={disabled}
        onBlur={() => setTriggerFocused(false)}
        onFocus={() => setTriggerFocused(true)}
        onPress={() => setOpen(true)}
        ref={triggerRef}
        style={({ pressed }) => [
          styles.trigger,
          triggerFocused && styles.focused,
          disabled && styles.disabled,
          pressed && !disabled && styles.pressed,
        ]}
      >
        <View style={styles.triggerCopy}>
          <Text style={styles.eyebrow}>JUMP TO LESSON</Text>
          <Text numberOfLines={1} style={styles.triggerJapanese}>
            {currentOption
              ? `${currentOption.numberLabel} · ${currentOption.japaneseTitle}`
              : 'Choose a lesson'}
          </Text>
          {currentOption ? (
            <Text numberOfLines={1} style={styles.triggerEnglish}>{currentOption.title}</Text>
          ) : null}
        </View>
        <Text
          accessibilityElementsHidden
          aria-hidden={true}
          importantForAccessibility="no"
          style={styles.chevron}
        >
          ▾
        </Text>
      </Pressable>

      <Modal
        animationType="fade"
        onRequestClose={close}
        statusBarTranslucent
        transparent
        visible={open}
      >
        <View
          accessibilityLabel="Choose a lesson"
          accessibilityViewIsModal
          aria-modal={true}
          onAccessibilityEscape={close}
          role="dialog"
          style={[
            styles.overlay,
            {
              paddingTop: Math.max(insets.top, spacing.lg),
              paddingBottom: Math.max(insets.bottom, spacing.lg),
            },
          ]}
        >
          <Pressable
            accessibilityLabel="Close lesson chooser"
            accessibilityRole="button"
            onPress={close}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleCopy}>
                <Text style={styles.sheetEyebrow}>LESSONS 01–25</Text>
                <Text style={styles.sheetTitle}>Choose a lesson</Text>
              </View>
              <Pressable
                accessibilityLabel="Close choose-a-lesson menu"
                accessibilityRole="button"
                onPress={close}
                style={({ pressed }) => [styles.close, pressed && styles.pressed]}
              >
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>

            <FlatList
              data={options}
              getItemLayout={(_, index) => ({
                index,
                length: ROW_HEIGHT,
                offset: ROW_HEIGHT * index,
              })}
              initialScrollIndex={Math.max(currentIndex, 0)}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  accessibilityHint={item.selected
                    ? 'Closes the lesson chooser'
                    : 'Opens this lesson in the current section'}
                  accessibilityLabel={item.accessibilityLabel}
                  accessibilityRole="button"
                  accessibilityState={{ selected: item.selected }}
                  aria-selected={item.selected}
                  onBlur={() => setFocusedLessonId((value) => value === item.id ? null : value)}
                  onFocus={() => setFocusedLessonId(item.id)}
                  onPress={() => choose(item.id)}
                  style={({ pressed }) => [
                    styles.row,
                    item.selected && styles.rowSelected,
                    focusedLessonId === item.id && styles.focused,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={[styles.number, item.selected && styles.numberSelected]}>
                    <Text style={[styles.numberText, item.selected && styles.numberTextSelected]}>
                      {item.numberLabel}
                    </Text>
                  </View>
                  <View style={styles.rowCopy}>
                    <Text numberOfLines={1} style={styles.rowJapanese}>{item.japaneseTitle}</Text>
                    <Text numberOfLines={1} style={styles.rowEnglish}>{item.title}</Text>
                  </View>
                  {item.selected ? (
                    <Text
                      accessibilityElementsHidden
                      aria-hidden={true}
                      importantForAccessibility="no"
                      style={styles.check}
                    >
                      ✓
                    </Text>
                  ) : null}
                </Pressable>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: 72,
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.line,
  },
  triggerCopy: { flex: 1, gap: 2 },
  eyebrow: { color: colors.coral, fontSize: typography.micro, fontWeight: '900', letterSpacing: 1.2 },
  triggerJapanese: { color: colors.ink, fontSize: typography.body, fontWeight: '800' },
  triggerEnglish: { color: colors.inkMuted, fontSize: typography.small },
  chevron: { color: colors.forest, fontSize: typography.heading, fontWeight: '900' },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(36, 48, 42, 0.52)',
  },
  sheet: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '82%',
    alignSelf: 'center',
    overflow: 'hidden',
    backgroundColor: colors.paper,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.card,
  },
  sheetHeader: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  sheetTitleCopy: { flex: 1, gap: 2 },
  sheetEyebrow: { color: colors.coral, fontSize: typography.micro, fontWeight: '900', letterSpacing: 1.2 },
  sheetTitle: { color: colors.ink, fontSize: typography.title, fontWeight: '900' },
  close: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceStrong,
  },
  closeText: { color: colors.forest, fontSize: typography.title, lineHeight: 27, fontWeight: '700' },
  row: { height: ROW_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.line, borderWidth: 2, borderColor: 'transparent' },
  rowSelected: { backgroundColor: colors.forestSoft },
  number: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.surfaceStrong },
  numberSelected: { backgroundColor: colors.forest },
  numberText: { color: colors.ink, fontSize: typography.small, fontWeight: '900' },
  numberTextSelected: { color: colors.white },
  rowCopy: { flex: 1, gap: 2 },
  rowJapanese: { color: colors.ink, fontSize: typography.body, fontWeight: '800' },
  rowEnglish: { color: colors.inkMuted, fontSize: typography.small },
  check: { color: colors.forest, fontSize: typography.heading, fontWeight: '900' },
  focused: { borderColor: colors.gold },
  disabled: { opacity: 0.38 },
  pressed: { opacity: 0.78 },
});
```

- [ ] **Step 4: Run focused tests and TypeScript; verify GREEN**

Run:

```powershell
pnpm.cmd test -- src/components/lessonQuickSwitcherModel.test.ts src/components/lessonQuickSwitcherAccessibility.test.ts
pnpm.cmd typecheck
```

Expected: all focused tests PASS and TypeScript exits `0`.

- [ ] **Step 5: Commit Task 2**

```powershell
git add -- src/components/LessonQuickSwitcher.tsx src/components/lessonQuickSwitcherAccessibility.test.ts
git commit -m "feat: add accessible lesson chooser"
```

---

### Task 3: Preserve the active section while switching lessons

**Files:**
- Modify: `src/screens/LessonDetailScreen.tsx`
- Create: `src/screens/lessonQuickSwitcherIntegration.test.ts`

**Interfaces:**
- Consumes: `LessonQuickSwitcher` from Task 2 and the ordered `lessons` export from `src/data/lessons/index.ts`.
- Produces: `handleLessonSelect(lessonId: string): void`, which clears Words queries and calls `navigation.setParams({ lessonId })` without changing `activeTab`.

- [ ] **Step 1: Write the failing screen-integration tests**

Create `src/screens/lessonQuickSwitcherIntegration.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const source = readFileSync(join(import.meta.dirname, 'LessonDetailScreen.tsx'), 'utf8');

describe('LessonDetail lesson quick-switch integration', () => {
  it('renders the switcher from the lesson header for every detail section', () => {
    const header = source.match(/const lessonHeader = \([\s\S]*?\n  \);/)?.[0] ?? '';

    expect(source).toContain("import { LessonQuickSwitcher } from '../components/LessonQuickSwitcher';");
    expect(source).toContain("import { getLesson, lessons } from '../data/lessons';");
    expect(header).toContain('<LessonQuickSwitcher');
    expect(header).toContain('currentLessonId={lesson.id}');
    expect(header).toContain('disabled={isStarting}');
    expect(header).toContain('lessons={lessons}');
    expect(header).toContain('onSelect={handleLessonSelect}');
  });

  it('changes the current route parameter without stacking another lesson route', () => {
    const handler = source.match(/const handleLessonSelect = \(lessonId: string\) => \{[\s\S]*?\n  \};/)?.[0] ?? '';

    expect(handler).toContain("setDraftQuery('');");
    expect(handler).toContain("setCommittedQuery('');");
    expect(handler).toContain('navigation.setParams({ lessonId });');
    expect(handler).not.toContain('setActiveTab');
    expect(handler).not.toContain("navigate('LessonDetail'");
  });

  it('keys both scroll containers by lesson so the selected section starts at the top', () => {
    expect(source.match(/<Screen\s+key=\{lesson\.id\}/g)).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run the screen-integration tests and verify RED**

Run:

```powershell
pnpm.cmd test -- src/screens/lessonQuickSwitcherIntegration.test.ts
```

Expected: three tests FAIL because the component and handler are not wired into `LessonDetailScreen`.

- [ ] **Step 3: Wire the switcher into `LessonDetailScreen`**

In `src/screens/LessonDetailScreen.tsx`, add the component import beside the existing component imports:

```ts
import { LessonQuickSwitcher } from '../components/LessonQuickSwitcher';
```

Replace the lesson data import:

```ts
import { getLesson, lessons } from '../data/lessons';
```

Add this handler after `beginPractice` and before `lessonHeader`:

```ts
  const handleLessonSelect = (lessonId: string) => {
    setDraftQuery('');
    setCommittedQuery('');
    navigation.setParams({ lessonId });
  };
```

Inside `lessonHeader`, place this component immediately after the closing `</View>` of `styles.readyHero` and immediately before the tablist:

```tsx
      <LessonQuickSwitcher
        currentLessonId={lesson.id}
        disabled={isStarting}
        lessons={lessons}
        onSelect={handleLessonSelect}
      />
```

Change the Words branch root from:

```tsx
      <Screen contentStyle={styles.wordsScreen}>
```

to:

```tsx
      <Screen key={lesson.id} contentStyle={styles.wordsScreen}>
```

Change the non-Words branch root from:

```tsx
    <Screen scroll contentStyle={styles.page}>
```

to:

```tsx
    <Screen key={lesson.id} scroll contentStyle={styles.page}>
```

Do not modify `activeTab`, the four tab IDs, route types, Back navigation, study-state mutations, or lesson data.

- [ ] **Step 4: Run integration, focused, and full automated tests**

Run:

```powershell
pnpm.cmd test -- src/screens/lessonQuickSwitcherIntegration.test.ts src/components/lessonQuickSwitcherModel.test.ts src/components/lessonQuickSwitcherAccessibility.test.ts
pnpm.cmd typecheck
pnpm.cmd test
```

Expected: all focused tests PASS, TypeScript exits `0`, and the complete Vitest suite PASSes with no regression.

- [ ] **Step 5: Commit Task 3**

```powershell
git add -- src/screens/LessonDetailScreen.tsx src/screens/lessonQuickSwitcherIntegration.test.ts
git commit -m "feat: switch lessons within the active section"
```

---

### Task 4: Production verification, responsive acceptance, and deployment

**Files:**
- Verify only; no source file is expected to change.

**Interfaces:**
- Consumes: the completed quick-switcher branch from Tasks 1–3.
- Produces: a reviewed, exportable, fast-forward-safe GitHub Pages release.

- [ ] **Step 1: Verify clean dependency and repository state**

Run:

```powershell
git status --short
pnpm.cmd install --frozen-lockfile
git diff --exit-code -- package.json pnpm-lock.yaml
git diff --check
```

Expected: dependency installation exits `0`, the package files remain unchanged, and the only pre-existing untracked path is `docs/superpowers/reviews/2026-07-18-vocabulary-import-acceptance.md` when it is not temporarily hidden.

- [ ] **Step 2: Run complete web, privacy, and iOS verification**

Run:

```powershell
pnpm.cmd typecheck
pnpm.cmd test
$env:EXPO_BASE_URL = '/Japanese-Language-App'
try {
  pnpm.cmd export:web
} finally {
  Remove-Item Env:EXPO_BASE_URL -ErrorAction SilentlyContinue
}
pnpm.cmd audit:public -- --tracked --dist dist
if (Test-Path -LiteralPath '.local/vocabulary/personal-vocabulary-v1.json') {
  pnpm.cmd audit:public:local
}
pnpm.cmd exec expo export --platform ios --output-dir dist-ios
```

Expected: TypeScript, every Vitest test, GitHub Pages base-path export, public audit, optional local private-canary audit, and iOS/Hermes export all exit `0`. Verify the generated `dist/sw.js` contains exactly one hashed Metro bundle and no `.local`, `.apkg`, Anki database, or private-vocabulary reference. Remove only the verified worktree-local `dist-ios` directory after inspection.

- [ ] **Step 3: Perform responsive and accessibility acceptance locally**

Export once without `EXPO_BASE_URL`, serve ignored `dist`, and inspect 390×844 and 430×932 viewports.

Verify all of the following:

- every LessonDetail section shows the trigger after the hero and before the four tabs;
- the trigger, Close, and all 25 rows expose the required labels and states;
- the current lesson is initially in view and selected;
- selecting Lesson 12 from Lesson 4 Grammar opens Lesson 12 Grammar;
- selecting Lesson 8 from Lesson 4 Words opens Lesson 8 Words with an empty search query;
- selecting a lesson from Overview and Dialogue preserves those sections;
- selecting the current lesson only closes the modal;
- backdrop, Close, Escape/platform back, Enter/Space, visible focus, and focus return work;
- Back returns directly to the lesson list after several switches;
- no control is under 44 pixels and no horizontal overflow occurs;
- existing device-local vocabulary, progress, and review counts remain unchanged.

Expected: every observation passes at both iPhone viewport sizes. If any result fails, return to the owning task, add a failing regression test, fix it, and repeat Steps 1–3.

- [ ] **Step 4: Request final code review and address findings**

Use `superpowers:requesting-code-review` against the full diff from `d05c7ad77b987dd44327c9f74f13a3ee5f5efbb6` through the feature HEAD. Any Important or Critical finding requires a focused RED/GREEN fix and a fresh run of Steps 1–3.

Expected: reviewer assessment is `Ready to merge? Yes` with no unresolved Critical or Important findings.

- [ ] **Step 5: Deploy the fast-forward release**

Fetch GitHub state, verify `origin/main` is an ancestor of feature HEAD, push feature HEAD to `main`, and watch `Test and deploy Nihongo Path` through success:

```powershell
git fetch origin main --tags
git merge-base --is-ancestor origin/main HEAD
if ($LASTEXITCODE -ne 0) { throw 'Release is not a fast-forward of origin/main.' }
git push origin HEAD:main
```

Expected: the push is a fast-forward, the Pages workflow completes successfully for the exact feature HEAD, the production URL returns HTTP 200, and the deployed bundle contains `JUMP TO LESSON`, `Choose another lesson`, and the final accessibility labels.

- [ ] **Step 6: Perform the installed-iPhone update check**

Without uninstalling the PWA or clearing site data, open the installed app online, wait for the update, close it fully, and reopen it. Verify lesson switching on Overview, Grammar, Words, and Dialogue; portrait/landscape safe areas; VoiceOver expanded/selected labels; Japanese keyboard behavior in Words search; device-local vocabulary and schedules; and one airplane-mode reopen after the online load.

Expected: the deployed switcher works and all device-local data remains intact. Record only observed results; do not claim an iPhone PASS without running it on the device.
