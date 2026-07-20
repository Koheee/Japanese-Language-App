# Global Keyword Search Implementation Plan

**Design:** `docs/superpowers/specs/2026-07-20-global-keyword-search-design.md`
**Branch:** `feature/global-keyword-search`
**Starting implementation commit:** `da5459d72b0cc8361f64db413f7d0da38d568119`

## Global constraints

- Keep the visible product limited to Lessons, Lesson Detail, and the new Search route.
- Search authored grammar and dialogue content only; never read dormant vocabulary, exercise, review, progress, import, editor, or device-local data.
- Support Japanese, kana readings, and English without generating or indexing romaji.
- Add no package dependency, persistence key, schema migration, network request, analytics, or search history.
- Preserve existing lesson navigation, quick-switch tab retention, offline PWA behavior, GitHub Pages repository base path, and device-local dormant data.
- Every implementation task follows a failing-test-first cycle. Do not weaken existing tests to make a change pass.
- Preserve the protected untracked file `docs/superpowers/reviews/2026-07-18-vocabulary-import-acceptance.md` without staging or editing it.

## Task 1: Build the pure search domain

**Create:**

- `src/search/types.ts`
- `src/search/normalizeSearchText.ts`
- `src/search/searchCorpus.ts`
- `src/search/searchLessons.ts`
- `src/search/searchLessons.test.ts`
- `scripts/benchmark-grammar-search.ts`
- `scripts/benchmark-grammar-search.test.ts`

### Test-first requirements

1. Add failing tests proving:
   - a trimmed empty query returns no results;
   - `より` ranks the direct Lesson 12 comparison grammar pattern first;
   - `permission` finds the relevant English grammar explanation;
   - hiragana and katakana equivalents match in both directions;
   - English matching ignores case;
   - Unicode punctuation and repeated whitespace are separators;
   - no romaji conversion or romaji-only match is introduced;
   - all design-specified grammar and dialogue fields participate in search;
   - each grammar point or dialogue turn appears at most once with an accurate match count;
   - tie-breaking is deterministic by score, match position, lesson, kind, and source order;
   - highlight segments map back to authored Unicode text after normalization;
   - collapsed-subsection metadata identifies insight, deeper, and dialogue grammar-note matches.
2. Run the focused test and confirm the expected failures.
3. Implement typed corpus projection, normalization with source offsets, scoring, sorting, snippet construction, and subsection metadata.
4. Add the explicit 274-record benchmark with the design thresholds: index creation below 50 ms and slowest of at least 100 warm searches below 20 ms on the bundled Windows runtime.
5. Run focused tests, benchmark test, typecheck, and the full suite.

### Commit

`feat: add offline grammar search domain`

## Task 2: Add the dedicated Search screen

**Create:**

- `src/components/SearchButton.tsx`
- `src/components/HighlightedText.tsx`
- `src/components/SearchResultCard.tsx`
- `src/screens/SearchScreen.tsx`
- `src/screens/searchPresentation.test.ts`
- `src/screens/searchAccessibility.test.ts`

### Test-first requirements

1. Add failing presentation and accessibility contracts for:
   - a full-screen safe-area-aware reader search;
   - auto-focused labeled input and accessible hint;
   - clear control only for non-empty input;
   - introductory examples for an empty query;
   - no-results guidance without romaji;
   - virtualized results and accessible result count announcement;
   - result cards containing lesson, kind, title/speaker, excerpt, and match count;
   - explicit highlighted/unhighlighted text segments with a non-color-only highlight;
   - 44-point minimum Search, Back, Clear, and result touch targets;
   - keyboard focus styling and wrapping-friendly mobile styles.
2. Run focused tests and confirm expected failures.
3. Implement the shared components and Search screen using only the pure Task 1 API.
4. Keep the query in Search screen state so pushing a result and pressing Back preserves query, result order, and scroll state.
5. Run focused tests, typecheck, and full suite.

### Commit

`feat: add dedicated keyword search screen`

## Task 3: Register Search and add both entry points

**Modify:**

- `src/navigation/types.ts`
- `src/navigation/AppNavigator.tsx`
- `src/navigation/readerNavigation.test.ts`
- `src/screens/LessonListScreen.tsx`
- `src/screens/LessonDetailScreen.tsx`
- `src/screens/readerLessonList.test.ts`
- `src/screens/readerLessonDetail.test.ts`

**Create:**

- `src/screens/searchNavigation.test.ts`

### Test-first requirements

1. Add failing tests proving:
   - the live stack registers exactly Lessons, Lesson Detail, and Search;
   - dormant screens and bottom tabs remain unimported and unregistered;
   - Search parameters are optional and Lesson Detail keeps `lessonId` required;
   - the shared Search button appears on Lesson List and every Lesson Detail tab;
   - both entry points navigate to Search;
   - result activation pushes Lesson Detail with lesson, tab, target, subsection, query, and a unique request token;
   - normal lesson-card and quick-switch navigation still pass only `lessonId` and retain existing behavior.
2. Confirm the focused tests fail for missing wiring.
3. Register Search and wire the reusable Search button into both screens without adding a bottom tab or persistent overlay.
4. Run focused navigation/reader tests, typecheck, and full suite.

### Commit

`feat: connect global search navigation`

## Task 4: Implement precise lesson landing and highlighting

**Create:**

- `src/search/searchLandingController.ts`
- `src/search/searchLandingController.test.ts`
- `src/components/SearchTargetAnchor.tsx`
- `src/components/searchTargetPresentation.test.ts`

**Modify:**

- `src/components/Screen.tsx`
- `src/components/GrammarCard.tsx`
- `src/components/grammarCardPresentation.ts`
- `src/components/grammarCardPresentation.test.ts`
- `src/components/DialogueBubble.tsx`
- `src/components/DialogueGrammarNotes.tsx`
- `src/components/dialogueGrammarNotesModel.ts`
- `src/components/dialogueGrammarNotesModel.test.ts`
- `src/screens/LessonDetailScreen.tsx`
- `src/screens/readerLessonDetail.test.ts`
- `src/screens/accessibilityContracts.test.ts`

### Test-first requirements

1. Add failing controller and component tests for:
   - target validation within the selected lesson;
   - Grammar or Dialogue tab selection;
   - one scroll per unique request token;
   - coordinate calculation including tab-content and dialogue-list parent offsets;
   - a 16-point viewport-top margin;
   - correct-tab top fallback when measurement fails;
   - 2.5-second visual landing highlight;
   - accessible target focus attempt after scroll;
   - automatic insight/deeper expansion for grammar matches;
   - automatic contextual-note expansion for dialogue-note matches;
   - authored-text keyword highlighting in the visible matching field;
   - no repeated scroll or forced re-expansion during unrelated renders;
   - ordinary manual toggles continue to work after landing.
2. Confirm focused tests fail before production edits.
3. Implement a pure landing controller plus small platform presentation adapters. Keep measurement/scroll orchestration in Lesson Detail and subsection state in the existing components.
4. Prefer measured anchors; use tab-top fallback only when a target cannot be measured.
5. Run focused landing, accessibility, reader, quick-switch, grammar-card, and dialogue-note tests, then typecheck and full suite.

### Commit

`feat: jump search results to exact lesson notes`

## Task 5: Complete documentation and release verification

**Modify:**

- `README.md`
- `GITHUB_PAGES.md`
- `src/documentation/readerOnlyDocs.test.ts`

### Test-first requirements

1. Add failing documentation assertions for the new internal Search route, offline behavior, supported Japanese/kana/English inputs, no romaji, and exact-result navigation.
2. Update the reader documentation without reintroducing dormant study workflows.
3. Run fresh final gates on the exact head:
   - frozen dependency install;
   - TypeScript;
   - complete Vitest suite;
   - `git diff --check`;
   - dependency/lockfile no-change check;
   - pinned Saeris originality audit;
   - GitHub Pages web export under `/Japanese-Language-App`;
   - public and local-private artifact audits;
   - iOS/Hermes export with exactly one bundle;
   - search benchmark.
4. Run production-build browser acceptance at 390x844 and 430x932:
   - no horizontal overflow;
   - both search entry points present;
   - `より` returns the expected Lesson 12 grammar result;
   - result activation selects Grammar, reveals the match, scrolls to it, and highlights it;
   - English and kana-equivalent searches work;
   - Back preserves search state;
   - removed study UI remains absent.
5. Request an independent whole-branch review and fix all Critical or Important findings with focused regression tests.
6. Fetch `origin/main`, verify it is an ancestor of the reviewed head, push the exact head to `main`, and monitor the exact GitHub Actions deployment to success.
7. Verify the hosted URL returns HTTP 200 and repeat the hosted `より` acceptance path.
8. Leave physical iPhone portrait/landscape, VoiceOver, Home Screen update, and offline reopen as explicit learner-observed follow-up checks.

### Commit

`docs: document global keyword search`

## Completion definition

Implementation is complete only when all five tasks are committed, all automated and production-browser gates pass on the final head, an independent whole-branch review has no remaining Critical or Important findings, the exact commit is deployed successfully to GitHub Pages, and the hosted `より` path is verified. Physical-iPhone observations must not be reported as passed until the learner confirms them.

