# Grammar-Focused Reader Design

**Date:** 2026-07-20
**Status:** Approved for planning
**Scope:** Refocus the 25-lesson app on self-contained grammar reading and contextual dialogue

## Context

The app currently combines lesson reading with vocabulary management, exercises, spaced review, and progress tracking. The learner now wants to use it primarily as a grammar reference and guided reader. The visible product should therefore become simpler: a lesson list followed by only Overview, Grammar, and Dialogue sections.

The learner finds Tofugu's conceptual teaching approach intuitive and also wants the existing Tae Kim research to deepen the explanations. The Minna-like lesson sequence must remain unchanged, but the public app must use original prose, examples, dialogue, analogies, and organization rather than reproducing any source.

The app already contains 25 complete lessons, 101 grammar points, original dialogues, device-local vocabulary edits, and study history. The redesign must preserve that stored data even though vocabulary, exercises, review, and progress are removed from the visible interface.

## Goals

- Make the app a focused grammar reader with no bottom navigation.
- Keep the existing 25-lesson order and lesson quick-switcher.
- Show only Overview, Grammar, and Dialogue on every lesson-detail page.
- Remove visible exercise, review, progress, Words, and vocabulary-management entry points.
- Give every grammar point a self-contained explanation that does not require opening an external link.
- Teach with friendly plain English, an original mental model, formation equations, clear boundaries, contrasts, examples, and common mistakes.
- Annotate dialogue lines so the learner can see why a form fits that conversational moment.
- Use Japanese, kana readings, and English only; never add romaji.
- Preserve all existing device-local vocabulary and study state without migration or deletion.
- Remain responsive, accessible, installable, and offline-capable on iPhone and GitHub Pages.

## Non-goals

- Recreating Tofugu's visual design, wording, examples, illustrations, or distinctive article structure.
- Copying Tae Kim, Minna no Nihongo, or Tofugu prose.
- Changing the 25-lesson curriculum order or expanding beyond the current beginner scope.
- Adding exercises, quizzes, progress indicators, spaced review, vocabulary search, or vocabulary editing to the new interface.
- Deleting the dormant screens, exercise data, vocabulary data, review schedules, or saved device state.
- Adding cloud synchronization, authentication, analytics, or a content-management system.
- Adding romaji or replacing kana readings with furigana rendering.
- Requiring external reading to understand a lesson.

## Approaches considered

### 1. Focused reader interface with preserved dormant data — selected

Unregister exercise, review, progress, and vocabulary-management routes; remove their entry points; and simplify lesson screens while leaving the underlying source data and persistence schema intact. This provides the requested experience without risking destructive storage changes or making a future rollback difficult.

### 2. Full deletion

Delete the unused screens, models, services, exercises, vocabulary, review cards, and persistence fields. This would reduce source size, but it creates substantial migration risk, makes old backups harder to restore, and provides little user-visible benefit. It is rejected.

### 3. Reading-mode toggle

Add a setting that switches between the old study interface and the new grammar reader. This preserves both experiences visibly, but introduces configuration and navigation complexity the learner did not request. It is rejected.

## Information architecture

### App navigation

The app opens directly into a single native stack:

1. `Lessons`
2. `LessonDetail`

There is no bottom tab bar. Review, Progress, Exercise, Vocabulary Manager, Word Editor, and Import Preview are not registered navigation destinations. Their implementation files and stored data remain in the repository.

The existing lesson quick-switcher stays between the lesson hero and the section tabs. Selecting another lesson updates the existing route parameter, preserves the active Overview, Grammar, or Dialogue section, and keeps Back pointed directly to the lesson list.

### Lesson list

The lesson-list header reports the curriculum rather than study activity:

- 25 lessons;
- 101 grammar points;
- beginner A1–A2 path.

Lesson cards contain the lesson number, Japanese title, English title, summary, and a navigation chevron. They contain no progress bar, completion percentage, review count, exercise count, or “ready to begin” state.

The iPhone installation guidance remains visible in the web browser when the app is not running in standalone mode.

### Lesson detail shell

The hero contains the lesson number, Japanese and English titles, scenario description, and estimated reading time. It contains no completion progress or practice state.

Exactly three section tabs appear:

- Overview
- Grammar
- Dialogue

All three fit on an iPhone-width row without horizontal scrolling. Each control remains at least 44 points high, exposes correct tab semantics, and has a visible focus state on web.

## Overview section

Overview is the orientation page for the lesson. It contains:

1. the learner outcomes;
2. the lesson's central mental shift, drawn from the first grammar point's original mental model;
3. a lesson map listing every grammar point with its pattern and plain-English purpose;
4. an at-a-glance summary containing only grammar-pattern count, dialogue-line count, and one contextual scenario.

It contains no word count, drill count, progress state, review cue, or practice button. Selecting a grammar item in the lesson map switches to Grammar and places that point in view where reliable cross-platform scrolling permits it; otherwise it switches to Grammar at the top.

## Grammar teaching format

The teaching approach uses the general qualities the learner values in Tofugu—conceptual explanations, formation patterns, friendly language, and basics before nuance—without copying its prose, examples, metaphors, or page design.

Every grammar point is self-contained and follows this order:

1. **At a glance** — title, Japanese pattern, and natural English meaning.
2. **The basics** — the core explanation needed to use the form in this lesson.
3. **Build the form** — one or more equations showing what attaches or changes, each followed by a short explanation.
4. **A Japanese-first picture** — an original mental model explaining how Japanese organizes the meaning and where English intuition can mislead.
5. **When it fits** — communicative context, politeness/register, usage boundary, and what the pattern does not mean.
6. **Compare it** — the nearest easily confused form or particle and a concise distinction.
7. **Examples** — at least two original examples with Japanese, a kana reading when kanji occurs, and natural English.
8. **Common turn** — an incorrect or misleading construction, the preferred construction, and a reason, when a useful learner error exists.
9. **Go deeper** — optional nuance that is useful now but not required for the lesson's main target.

Core explanations are visible without leaving the page. “A Japanese-first picture” and “Go deeper” may be collapsible to keep long lessons scannable, but their labels and expanded states must be accessible.

### Grammar data additions

The existing `GrammarPoint` fields remain authoritative:

- `plainEnglish`
- `explanation`
- `whyItWorks`
- `usageBoundary`
- `notes`
- `examples`
- `commonMistake`
- `furtherReading`

The content model gains these required teaching fields:

```ts
export interface GrammarFormation {
  label: string;
  formula: string;
  explanation: string;
}

export interface GrammarContrast {
  with: string;
  explanation: string;
}

export interface GrammarPoint {
  // existing fields remain
  formation: GrammarFormation[];
  contrast: GrammarContrast;
  beyondBasics?: string[];
}
```

`formation` must contain at least one non-empty equation. `contrast` is required for all 101 points so every lesson explicitly resolves a likely ambiguity. `beyondBasics` is optional and must not introduce grammar that the lesson sequence has intentionally deferred.

## Dialogue teaching format

The Dialogue section preserves the original conversations and displays:

- speaker;
- Japanese line;
- kana reading;
- English meaning;
- compact labels for the grammar used in that line.

Selecting a grammar label reveals a short, original explanation of why that form suits the speaker's intent in this exact line. The explanation is internal; it never sends the learner to another site.

Dialogue annotations extend the existing data rather than duplicating grammar cards:

```ts
export interface DialogueGrammarNote {
  grammarId: string;
  explanation: string;
}

export interface DialogueTurn {
  // existing fields remain
  grammarNotes?: DialogueGrammarNote[];
}
```

For every existing `grammarIds` entry on a dialogue turn, there must be exactly one matching `grammarNotes` entry. Notes may refer to only grammar IDs in the same lesson. A line without a tagged grammar point needs no annotation.

## Reference policy

Tae Kim and Tofugu are research inputs, not required lesson steps. Their coverage is used to audit:

- conceptual accuracy;
- formation behavior;
- common learner confusions;
- usage boundaries;
- appropriate basic-versus-advanced scope.

All app prose, analogies, examples, and dialogue annotations remain original. Existing Tae Kim references are retained, and directly relevant Tofugu pages may be added to the reference manifest after verifying the exact official URL.

External links are removed from individual grammar cards. A single collapsed **Optional references** section appears after the lesson's grammar cards and deduplicates references for that lesson. It is visually secondary, clearly announces that links open external sites, and is never needed to understand the content.

The public app may name the resources as editorial influences. It must not claim affiliation with or endorsement by Minna no Nihongo, Tae Kim, Saeris, or Tofugu.

## Component boundaries

### `AppNavigator`

Owns the two-screen reader stack. It does not import or register removed study destinations.

### `LessonListScreen` and `LessonCard`

Render static curriculum metadata only. They do not consume study context or calculate exercise completion.

### `LessonDetailScreen`

Owns the active Overview/Grammar/Dialogue section and route-based lesson selection. It does not consume study context, render vocabulary controls, or start exercises.

### `GrammarCard`

Renders one complete teaching sequence from a `GrammarPoint`. It owns only local expansion state. External-reference behavior moves to the lesson-level reference component.

### `GrammarFormationList`

A focused component renders formation equations and explanations with readable wrapping on narrow screens.

### `LessonReferenceSection`

Projects, deduplicates, collapses, and safely opens optional lesson references. It is rendered once at the end of Grammar.

### `DialogueGrammarNotes`

Resolves a turn's annotation IDs against the lesson's grammar inventory and renders expandable contextual notes. It owns only local expansion state.

## State and data safety

- The persistence schema and storage keys do not change.
- The `StudyProvider` remains mounted so existing initialization behavior is unchanged.
- No migration clears or rewrites vocabulary, review cards, lesson progress, import recovery, or custom words.
- Dormant study screens and services remain compilable and tested even though they are not navigable.
- Vocabulary and exercise arrays remain in lesson data to preserve backups and avoid a destructive content rewrite.
- An installed PWA update must not require uninstalling the app or clearing site data.

## Accessibility and responsive behavior

- All interactive controls have a minimum 44-point target; lesson-switcher rows retain their larger target.
- Overview/Grammar/Dialogue use tab and selected-state semantics on native and web.
- Expandable grammar insight, deeper notes, optional references, and dialogue annotations expose button roles and expanded state.
- Decorative glyphs are hidden from assistive technology.
- Focus is visible on web and returns to the activating control after modal dismissal where supported.
- Japanese text can wrap without clipping at 390×844 and 430×932 viewports.
- Reading content has a comfortable maximum width on desktop and uses safe-area-aware spacing on iPhone.
- No content requires hover, landscape orientation, or an external keyboard.

## Content integrity

Automated content tests must verify:

- exactly 25 ready lessons in numeric order;
- exactly 101 frozen grammar IDs;
- every grammar point has a non-empty formation list and required contrast;
- every grammar example has Japanese and English, and every example containing kanji has a kana reading;
- no content object or rendered teaching model introduces a `romaji` field;
- every dialogue annotation references a grammar ID in the same lesson;
- every tagged dialogue grammar ID has exactly one contextual note;
- no dialogue note contains a URL or substitutes an external reading instruction;
- optional references use allowed HTTPS domains and remain separate from core teaching fields;
- the private-vocabulary public-artifact canary remains clean.

## Testing and verification

Implementation follows test-driven development with independent review gates for the reader interface and grammar-content audit.

Automated verification covers:

- simplified route and tab contracts;
- absence of visible Review, Progress, Exercise, Words, and vocabulary-management entry points;
- lesson quick-switching while preserving Overview, Grammar, or Dialogue;
- grammar-card projection, formation, contrast, expansion, and accessibility semantics;
- dialogue note resolution and accessibility semantics;
- lesson-level reference deduplication and safe link failures;
- 25-lesson and 101-point content integrity;
- TypeScript and the complete Vitest suite;
- GitHub Pages base-path export;
- service-worker and private-content audits;
- iOS/Hermes export.

Manual browser acceptance at 390×844 and 430×932 verifies:

- lesson-list readability without progress UI;
- all three tabs fit and switch correctly;
- quick-switching preserves each of the three sections;
- long formation equations, Japanese examples, and dialogue notes wrap without overflow;
- all expandable areas work by touch and keyboard;
- Back returns directly to the lesson list;
- no removed study destination is visible or reachable through the UI;
- optional references remain secondary and the lesson is complete without opening them.

Physical iPhone acceptance occurs after deployment and verifies safe areas, VoiceOver labels, installed-PWA update behavior, device-local data preservation, and one offline reopen after an online refresh.

## Rollout

1. Complete and review the reader-interface workstream.
2. Complete and review the 101-point grammar and dialogue content audit.
3. Run one combined production verification against the final feature HEAD.
4. Fast-forward the verified commit to `main`.
5. Wait for the GitHub Pages workflow to succeed for that exact commit.
6. Confirm the hosted app, then guide the learner through the physical iPhone update and offline check.

## Acceptance criteria

1. The app visibly contains only the lesson list and Overview, Grammar, and Dialogue lesson sections.
2. Review, Progress, Exercise, Words, and vocabulary-management controls are absent from navigation and lesson UI.
3. All 25 lessons remain available in their existing order, and the quick-switcher preserves the active one of three sections.
4. All 101 grammar points contain original basics, formation, Japanese-first explanation, usage boundary, contrast, examples, and optional deeper nuance where appropriate.
5. Every tagged dialogue use has an internal contextual explanation.
6. A learner can understand every lesson without opening an external link.
7. Optional Tae Kim and Tofugu references appear only in one collapsed lesson-level section.
8. No romaji, copied source prose, new dependency, persistence migration, or private vocabulary enters the public app.
9. Existing device-local vocabulary and study history remain intact after the deployed PWA update.
10. Automated, responsive-browser, export, privacy, accessibility, and deployment checks pass before completion is claimed.
