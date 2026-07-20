# Lesson quick-switcher design

**Date:** 2026-07-20  
**Status:** Approved for planning  
**Scope:** Faster navigation between the 25 lesson-detail pages on desktop and iPhone

## Context

The Learn screen currently presents all 25 lessons as a vertical card list. Once a learner opens a lesson, returning to that list is the only way to jump to a different lesson. This is slow when comparing the same kind of material across lessons, such as Grammar in Lessons 4 and 12.

The user wants a lesson dropdown on every lesson-detail page. When a different lesson is selected, the app must retain the current section: Overview stays Overview, Grammar stays Grammar, Words stays Words, and Dialogue stays Dialogue.

## Goals

- Put one compact `Jump to lesson` control on every lesson-detail page.
- List Lessons 1–25 in numeric order with lesson number, Japanese title, and English title.
- Keep the current lesson visible and clearly selected.
- Switch lessons without adding another entry to the navigation history.
- Preserve the active Overview, Grammar, Words, or Dialogue section.
- Work consistently in the GitHub Pages PWA and native Expo exports.
- Meet the existing mobile accessibility and 44-pixel touch-target standards.

## Non-goals

- Adding search, favorites, recent lessons, or lesson reordering.
- Placing the switcher on Exercise, Review, Progress, Vocabulary Manager, or Word Editor screens.
- Changing lesson progression, completion, review schedules, or vocabulary storage.
- Adding a third-party picker dependency.

## Approaches considered

### 1. Accessible modal dropdown — selected

Build the selector from existing React Native primitives: `Modal`, `FlatList`, `Pressable`, `Text`, and `View`. The trigger remains compact, while the open state supplies a safe, scrollable list with large rows on both desktop and iPhone.

This approach gives the app consistent styling, explicit accessibility semantics, safe-area control, and no new dependency.

### 2. Platform-native picker

A native picker would require another dependency and would render differently across web, iPhone PWA, and native Expo targets. It would be shorter to implement but harder to style and verify consistently.

### 3. Always-visible inline menu

An inline 25-item menu would avoid a modal, but it would consume too much vertical space on lesson pages and make mobile scanning worse.

## User interface

The closed trigger appears after the lesson hero and before the Overview/Grammar/Words/Dialogue tabs. It shows:

- eyebrow: `JUMP TO LESSON`;
- current lesson number;
- Japanese title;
- English title;
- a decorative downward chevron.

The trigger is at least 52 pixels high and spans the available content width.

Pressing the trigger opens a modal dropdown containing a header, a Close control, and a scrollable list of 25 lesson rows. Each row shows a zero-padded lesson number plus the Japanese and English titles. The current lesson uses the existing selected-state colors and is announced as selected. Rows are at least 52 pixels high. The list initially positions the current lesson within view.

The menu closes when the user:

- selects a lesson;
- presses the Close control;
- presses the backdrop;
- uses the platform back action or Escape key.

Selecting the current lesson only closes the dropdown. Selecting another lesson updates the page in place.

## Navigation and state

`LessonDetailScreen` keeps `activeTab` as local state. A lesson selection uses `navigation.setParams({ lessonId })` on the existing `LessonDetail` route instead of navigating to or replacing it. This changes the displayed lesson while preserving `activeTab` and the original Back destination.

Before applying a new lesson ID, the screen clears the Words draft and committed search queries so a filter from the previous lesson cannot make the new lesson appear empty. A lesson switch is disabled while the screen is committing the Start/Continue-practice action.

Grammar cards naturally remount because their grammar-point keys change, so every newly selected lesson starts with its insight cards collapsed. Lesson progress and vocabulary continue to resolve from the selected `lessonId` through the existing study context.

## Component boundaries

### `LessonQuickSwitcher`

A new reusable component owns only dropdown presentation and open/close state.

Inputs:

- current lesson ID;
- the ordered lesson summaries;
- disabled state;
- `onSelect(lessonId)` callback.

It does not know about React Navigation, lesson progress, vocabulary, or active lesson tabs.

### Quick-switcher presentation model

A small pure helper creates the ordered row labels and selection state. Keeping this logic separate makes ordering, labels, and current-selection behavior easy to test without rendering a modal.

### `LessonDetailScreen`

The screen supplies lesson summaries, handles the selection callback, clears Words search state, and changes the route parameter. It remains the owner of `activeTab`.

## Accessibility

- The trigger exposes button role, `Choose another lesson; current lesson <number>, <title>`, and true/false expanded state.
- The decorative chevron is excluded from the accessibility tree.
- The modal exposes an accessible `Choose a lesson` label and modal semantics where supported.
- Every row exposes button role and a complete lesson label without romaji.
- The current row exposes selected state explicitly for native and React Native Web.
- The Close control has a clear label and a minimum 44-pixel target.
- Keyboard users can open the dropdown, move through focusable rows, select with Enter/Space, close with Escape, and see focus styling.
- Closing returns focus to the trigger where the platform supports programmatic focus.

## Edge cases and errors

- If the current lesson ID is not found, the list still renders all 25 lessons and no row is selected.
- If a selected lesson ID is missing from the frozen lesson data, the callback is not invoked.
- Repeated presses while the practice-start action is busy are ignored because the switcher is disabled.
- Selecting the current lesson does not reset the section or create navigation work.
- Static lesson data means no loading or network-error UI is required.

## Testing

Automated tests will cover:

- exactly 25 options in numeric order;
- zero-padded lesson labels with Japanese and English titles and no romaji field;
- current-row selected state;
- current-lesson selection as a close-only operation;
- another-lesson selection producing the selected lesson ID;
- trigger, modal, row, Close, expanded, and selected accessibility contracts;
- `LessonDetailScreen` using `setParams` rather than adding a new route;
- active-section preservation and Words-query clearing;
- TypeScript, the full Vitest suite, GitHub Pages base-path export, iOS export, and public/private artifact audits.

Manual acceptance at 390×844 and 430×932 will verify:

- the trigger and menu fit without horizontal clipping;
- the current lesson is visible and highlighted;
- switching Overview, Grammar, Words, and Dialogue preserves the section;
- opening and closing by touch and keyboard works;
- focus is visible and touch targets meet the minimum size;
- the installed iPhone PWA receives the deployed update without losing device-local data.

## Acceptance criteria

1. Every LessonDetail section displays the quick-switcher.
2. The dropdown lists all 25 lessons in numeric order.
3. Choosing another lesson updates the lesson while preserving the active section.
4. The Back control still returns directly to the lesson list.
5. Words search state does not carry into the newly selected lesson.
6. Selecting the current lesson only closes the dropdown.
7. The current row and expanded/selected states are accessible on web and native targets.
8. No new dependency, romaji, persistence mutation, or private vocabulary content is introduced.
