# Global Keyword Search Design

**Date:** 2026-07-20
**Status:** Design approved; written specification pending user review
**Product:** Nihongo Path grammar-focused reader

## Purpose

Add a fast, offline keyword search that lets a learner enter Japanese or English text such as `より` and find every relevant grammar point or dialogue turn across Lessons 1–25. A selected result must open the correct lesson and section, scroll to the matching content, reveal a collapsed matching subsection when necessary, and briefly highlight the match.

The feature supports the reader-first product. It does not restore exercises, review, progress, vocabulary management, or any other dormant study UI.

## Goals

- Make search available from the lesson list and every lesson page.
- Search the complete internal grammar and dialogue corpus, including Japanese, kana readings, and English explanations.
- Work entirely offline after the app has loaded; no server or external search API is involved.
- Rank direct grammar-pattern and title matches ahead of incidental prose matches.
- Show the learner why each result matched with an original-text excerpt and highlighted match.
- Open the exact lesson tab and content target while preserving intuitive Back navigation.
- Remain accessible and comfortable at iPhone widths and safe-area insets.
- Add no romaji, search history, dependency, persistence key, or storage migration.

## Non-goals

- Searching dormant vocabulary, exercise, review, progress, import, or editor data.
- Searching optional external reference pages, URLs, or their remote contents.
- Fuzzy spelling correction, semantic/AI search, translation, or romaji transliteration.
- Persisting recent searches, analytics, or search selections.
- Editing lesson content from search results.

## User Experience

### Entry points

A reusable Search button appears:

1. Near the top of the lesson list, after the introductory summary and before the lesson map.
2. On every lesson detail page, in the shared header area above the Overview/Grammar/Dialogue tabs.

The button has a visible `Search` label, a minimum 44-by-44-point target, an accessibility role of button, and an accessibility label that makes clear that all lessons will be searched.

### Search screen

Search is a dedicated full-screen stack route with:

- a Back button;
- an auto-focused search field;
- a clear-text button when the query is non-empty;
- a result count announced accessibly;
- a virtualized result list;
- safe-area-aware top, bottom, left, and right spacing.

Before the learner types, the screen explains that Japanese, kana readings, and English are supported and shows examples such as `より`, `てから`, and `permission`. A trimmed empty query performs no search.

Search runs live from the first non-whitespace character. The corpus contains only 101 grammar points and 173 dialogue turns, so the complete ranked result set can be shown without pagination. The list remains virtualized for smooth mobile scrolling.

### Result presentation

Each result card shows:

- lesson number and lesson title;
- result kind: `Grammar` or `Dialogue`;
- grammar title and pattern, or dialogue speaker;
- the best matching original-text excerpt;
- the matching text highlighted without replacing the original Japanese or English;
- the number of matching searchable fields when the same grammar point or dialogue turn matches more than once.

Grammar and dialogue are logical result units. A grammar point appears at most once per query, and a dialogue turn appears at most once per query. The result uses its highest-ranked matching field as the excerpt and landing subsection, preventing a long list of near-duplicate hits from one note.

If there are no results, the screen says that nothing matched and suggests trying a shorter Japanese pattern or an English meaning. It does not suggest romaji.

### Opening a result

Selecting a result pushes a Lesson Detail screen above Search so Back returns to the same query and result list. The navigation payload contains:

- lesson ID;
- destination tab (`grammar` or `dialogue`);
- target content ID;
- target subsection when the match is inside collapsible content;
- original query;
- a unique request token so selecting the same result twice still triggers navigation and highlighting.

Lesson Detail switches to the destination tab, waits for the target to lay out, then scrolls it to a position 16 points below the viewport top. The target receives a temporary highlight for 2.5 seconds.

When a grammar match is in `A JAPANESE-FIRST PICTURE` or `GO DEEPER`, that subsection opens automatically. When a dialogue match is in a grammar note, the matching note opens automatically. Existing manual expansion behavior continues normally after the initial landing.

If the lesson exists but the content target cannot be resolved, Lesson Detail opens the requested tab at the top. If the lesson itself cannot be resolved, the existing safe missing-lesson behavior is retained and Search remains reachable through Back navigation.

## Search Corpus

### Grammar fields

Each `GrammarPoint` contributes the following searchable text:

- title;
- pattern;
- plain-English meaning;
- basics explanation;
- Japanese-first explanation;
- usage boundary;
- every formation label, formula, and explanation;
- contrast target and explanation;
- deeper notes and beyond-basics notes;
- Japanese examples, kana readings, and English translations;
- common-mistake avoid/prefer/reason text.

Further-reading titles and URLs are excluded because external references are secondary and do not constitute the internal lesson notes.

### Dialogue fields

Each `DialogueTurn` contributes:

- speaker;
- Japanese line;
- kana reading;
- English translation;
- contextual grammar-note explanations.

Grammar IDs are identifiers and are not searchable display text.

### Excluded corpus

Lesson vocabulary, exercises, review cards, progress records, custom words, imported deck data, and other dormant storage are not read by the search index. Search cannot expose device-local private data in the public bundle.

## Matching and Ranking

### Normalization

Search normalization is deterministic and implemented locally:

1. Apply Unicode NFKC normalization so full-width and half-width variants compare consistently.
2. Trim outer whitespace and collapse internal whitespace runs to one space.
3. Lowercase Latin text for case-insensitive English matching.
4. Normalize katakana to the equivalent hiragana code points for matching only.
5. Replace every Unicode punctuation or symbol code point (`\p{P}` or `\p{S}`) with a separator and collapse the resulting whitespace.

Displayed excerpts always retain their authored script and punctuation. Katakana is never rewritten as hiragana in the interface. No romaji is generated or indexed.

The normalizer also produces an offset map back to the original string. Highlight ranges therefore point to authored text even when NFKC, kana normalization, case folding, or punctuation handling changed the comparison form. Matches are literal normalized substrings; user input is never interpreted as a regular expression.

### Ranking

Every logical result receives a deterministic score from its best matching field:

1. Exact normalized grammar pattern or grammar title: highest priority.
2. Pattern/title begins with the query.
3. Pattern/title contains the query.
4. Primary Japanese or kana example/dialogue text contains the query.
5. Plain-English meaning, explanation, formation, contrast, note, or translation contains the query.
6. Speaker-name-only matches: lowest priority.

Within the same priority, an earlier match position ranks first. Remaining ties sort by lesson number, Grammar before Dialogue, and original content order. The ranking function is pure and does not depend on prior searches.

### Snippets

The highest-ranked matching field supplies the result excerpt. Short fields are shown in full. Long fields show a bounded window around the first match with leading or trailing ellipses when text was omitted. The excerpt builder preserves whole Unicode code points and returns explicit highlighted and unhighlighted segments; it does not inject HTML.

The selected field also identifies the landing subsection: header, basics, formation, insight, boundary, contrast, examples, mistake, deeper note, dialogue line, dialogue translation, or dialogue grammar note.

## Architecture

### Search domain module

Create a focused `src/search/` module containing pure, independently testable units:

- corpus projection from the frozen lesson array;
- normalization with original-offset mapping;
- result scoring and deterministic sorting;
- snippet and highlight-segment construction;
- public search result and target types.

The static index is constructed once at module initialization from `lessons`. No React state, navigation object, storage service, or network API is referenced by the domain module.

### UI components

- `SearchButton`: shared accessible entry point used by Lesson List and Lesson Detail.
- `SearchScreen`: owns query state and renders introductory, no-result, or result-list states.
- `SearchResultCard`: renders metadata, excerpt, match count, and activation behavior.
- `HighlightedText`: renders typed text segments with a non-color-only highlight treatment.
- `SearchTargetAnchor`: reports target layout and presents the temporary landing highlight.

Components consume typed search-domain results and do not duplicate ranking or normalization logic.

### Navigation

The live reader stack becomes exactly three registered routes:

1. `Lessons`
2. `LessonDetail`
3. `Search`

No dormant route is registered. `LessonDetail` keeps `lessonId` required and adds optional search-landing parameters. Normal lesson-card and quick-switch navigation continue to pass only `lessonId`, so their current Overview and active-tab behavior is unchanged.

Search result activation uses `navigation.push('LessonDetail', ...)` rather than replacing Search. Opening Search from an existing lesson and selecting a result may create a second Lesson Detail entry above Search; this is intentional because Back must return first to the search results and then to the lesson from which Search was opened.

### Landing controller

Lesson Detail owns a small landing controller separate from normal tab state:

1. Validate the optional target against the current lesson.
2. Select the requested tab.
3. Pass subsection-expansion intent only to the targeted GrammarCard or DialogueBubble.
4. Capture the target anchor position relative to the ScrollView content.
5. Scroll once after both tab content and target layout are ready.
6. Clear the landing highlight after 2.5 seconds without clearing the learner's manually expanded state.
7. Mark the request token consumed so unrelated re-renders cannot repeat the scroll.

Coordinate calculation must include the tab-content and any dialogue-list parent offsets. A production test must verify the calculation rather than accepting a fixed guessed offset. If measurement is unavailable on a platform, the controller uses the allowed tab-top fallback.

## Accessibility and Mobile Layout

- Search, Back, Clear, and result controls have at least 44-by-44-point touch targets.
- The input has an explicit accessibility label and hint.
- Result cards are buttons with labels that include lesson number, result kind, title/speaker, and excerpt.
- Result count changes are exposed through an appropriate live-region announcement on web and accessible text on native.
- Highlighting uses background plus font weight and never color alone.
- Keyboard focus is visible on web. Search results can be activated with standard button semantics.
- The search field, cards, snippets, long Japanese formulas, and English explanations wrap without horizontal overflow at 390x844 and 430x932.
- Four-side safe-area insets are additive to the existing base spacing.
- After scrolling, web focuses the target wrapper and native attempts `AccessibilityInfo.setAccessibilityFocus` with the target node handle. If a focusable handle is unavailable, visual scrolling remains the fallback.

## Privacy, Offline, and Performance

- Search reads only authored lesson data already shipped in the app bundle.
- No query, result, or history is persisted or transmitted.
- No dependency or lockfile change is required.
- The service worker requires no special endpoint or cache change because the search code and corpus are part of the normal application bundle.
- Search must work after the first successful online load when the installed PWA is reopened offline.
- A dedicated benchmark runs index construction once and at least 100 warm representative queries across the current 274 logical records. On the project's bundled Windows runtime, index construction must remain below 50 ms and the slowest warm query below 20 ms. This ceiling belongs in the explicit benchmark, not a timing-sensitive unit test.

## Testing

### Domain tests

- `より` returns the Lesson 12 comparison grammar point and ranks its direct pattern match first.
- An English query such as `permission` finds the relevant explanation.
- Hiragana input matches equivalent katakana and katakana input matches equivalent hiragana.
- Latin matching is case-insensitive; punctuation and repeated whitespace do not block expected matches.
- Romaji is neither generated nor required.
- Every specified grammar and dialogue field is indexed.
- One logical result is returned per matching grammar point or dialogue turn, with an accurate match count.
- Ranking and tie-breaking are deterministic.
- Snippets and highlight offsets preserve authored Unicode text.
- Empty and whitespace-only queries return no results.

### Navigation and landing tests

- Search is the only new live route and dormant screens remain unregistered.
- Both live reader screens render the shared Search button.
- A grammar result opens the correct lesson and Grammar tab.
- A dialogue result opens the correct lesson and Dialogue tab.
- Matching insight/deeper/dialogue-note sections auto-expand.
- The target scroll occurs exactly once per request token.
- Missing targets fall back to the correct tab top.
- Back returns to Search with its query and results intact.
- Ordinary lesson navigation and quick switching retain their existing tab behavior.

### Presentation and release tests

- Search input, clear control, result cards, live result count, focus styling, and touch targets meet accessibility contracts.
- Responsive production-build browser checks pass at 390x844 and 430x932 with no horizontal overflow.
- A hosted production check confirms that `より` finds and opens the Lesson 12 comparison note.
- Full TypeScript, Vitest, originality, public/private artifact, GitHub Pages base-path, web export, and iOS/Hermes export gates remain green.
- Physical-iPhone follow-up checks cover portrait, landscape, VoiceOver labels/focus, Home Screen launch, and one offline reopen after an online load.

## Acceptance Criteria

The feature is ready to release when:

1. Search is reachable from the lesson list and every lesson page.
2. Typing `より` displays a high-ranked Lesson 12 grammar result with a highlighted excerpt.
3. Activating that result opens Lesson 12 Grammar, scrolls to the comparison card, and highlights the match.
4. Matches inside collapsed grammar or dialogue notes are revealed automatically.
5. Japanese, kana readings, and English text search correctly without romaji.
6. Search remains internal, private, dependency-free, and offline-capable.
7. Removed study UI remains absent and dormant device data remains untouched.
8. Automated, responsive-browser, deployment, and hosted acceptance gates pass for the exact released commit.
