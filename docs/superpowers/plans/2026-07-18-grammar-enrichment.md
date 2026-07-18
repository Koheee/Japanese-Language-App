# Grammar Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich the existing 25-lesson, 101-point grammar course with original Japanese-first explanations, kana readings, stable supplementary references, accessible mobile presentation, and schedule-preserving V2 hydration.

**Architecture:** Keep the existing lesson files and exported numeric lesson order, add one exhaustive grammar-reference manifest keyed by the frozen grammar IDs, and inject manifest entries into exported lesson data without introducing a second content source. Build on the vocabulary work's single `PersistedAppStateV2` envelope, hydration barrier, kana predicate, and shared `reconcileReviewCards` service; grammar content, presentation, and attribution remain separate local commits until the complete vocabulary-plus-grammar acceptance gate passes.

**Tech Stack:** Expo 54, React 19.1, React Native 0.81, TypeScript 5.9 strict mode, Vitest 3.2, AsyncStorage-backed `PersistedAppStateV2`, React Navigation, GitHub Pages, Node 22.

## Global Constraints

- Implement the approved vocabulary plan first. Grammar must consume `PersistedAppStateV2`; it must not add another storage key, migration, hydration path, state committer, review reconciler, or reading predicate.
- The prerequisite authored baseline is exactly `course-v1-25859789e2a3679f09b1ebe6a5f3e981c3c164bf0b8dec7537cd26a0bf933f03`, and the property name is exactly `authoredBaselineVersion`.
- Preserve exactly 25 lessons and the approved 101 grammar IDs in their frozen lesson and point order. Do not add, remove, rename, or reorder a lesson or grammar point.
- Preserve the existing lesson themes, dialogue IDs, exercise IDs, Japanese dialogue text, English dialogue meanings, and review schedule fields.
- Preserve exactly 202 grammar examples and 173 dialogue turns: Lessons 1–9 contain 37 points, 74 examples, and 72 turns; Lessons 10–17 contain 32, 64, and 53; Lessons 18–25 contain 32, 64, and 48.
- Every grammar point ends with required, non-empty `usageBoundary: string`, at least two original examples, and a non-empty Japanese-first `whyItWorks`; every point in this release retains exactly two examples.
- `JapaneseExample.reading` stays optional only when `japanese` has no Han characters. A kanji-containing example requires a reading, and every present example reading must satisfy the vocabulary plan's shared `isKanaReading` predicate.
- Every `DialogueTurn.reading` remains required and must satisfy `isKanaReading`; no reading field may contain Latin letters.
- Learner links use only exact HTTPS pages under `https://guidetojapanese.org/learn/grammar/`. Source links are supplementary and all core explanations remain available offline.
- The Saeris port is a structured review aid and attribution target only. Do not copy or closely paraphrase source prose, examples, tables, analogies, headings, paragraph structure, media, or website code.
- State that the guide identifies its content as CC BY-NC-SA 3.0 US, this app's explanations and examples are independently written, and neither Tae Kim nor the Saeris project endorses this app.
- Keep advanced material deferred exactly as stated in the approved lesson mapping; do not reorder the polite-first curriculum to match the external guide.
- All intermediate commits remain local. Push to `main` only after the vocabulary plan, every automated gate, and every locally reproducible manual check in this plan pass together. Installed-iPhone update/share/offline checks necessarily run against that combined deployment immediately afterward; record them in a follow-up evidence commit and fix forward on V2 if any fail.
- Use `pnpm.cmd` in PowerShell commands. This plan adds no dependency; do not change `package.json` except for the Task 2 script and do not change `pnpm-lock.yaml`.

## File and Responsibility Map

- `src/models/content.ts`: shared `FurtherReading` and transitional/final `GrammarPoint` contract.
- `src/data/lessons/grammarInventory.ts`: the frozen 25 ordered grammar-ID tuples and flat 101-ID export.
- `src/data/grammarReferences.json`: the sole exhaustive 101-key reference data manifest.
- `src/data/grammarReferences.ts`: typed wrapper and strict lookup for the JSON manifest.
- `src/data/lessons/index.ts`: attaches manifest references to exported lesson grammar points after numeric lesson sorting.
- `scripts/verify-grammar-links.mjs`: explicit one-time online preflight; never runs in Vitest or CI.
- `src/data/lessons/grammarEnrichmentTestUtils.ts`: offline range-integrity assertions shared by three content tests.
- `src/data/lessons/grammarRange01to09.test.ts`: exact range gate for Lessons 1–9.
- `src/data/lessons/grammarRange10to17.test.ts`: exact range gate for Lessons 10–17.
- `src/data/lessons/grammarRange18to25.test.ts`: exact range gate for Lessons 18–25.
- `src/data/lessons/lesson01.ts`: Lesson 1 content and kana readings.
- `src/data/lessons/lessons02to09.ts`: Lessons 2–9 content and kana readings.
- `src/data/lessons/lessons10to17.ts`: Lessons 10–17 content and kana readings.
- `src/data/lessons/lessons18to25.ts`: Lessons 18–25 content and kana readings; retain its current source-object order and rely on `src/data/lessons/index.ts` for numeric export order.
- `src/data/lessons/contentIntegrity.test.ts`: final 25/101/202/173 inventory, reference, reading, dialogue-link, and field-completeness contract.
- `src/services/reconcileReviewCards.ts`: the vocabulary plan's one shared presentation reconciler; extend only its existing grammar branch if the new regression test exposes a gap.
- `src/services/reconcileReviewCards.test.ts`: stale grammar text refresh with byte-stable schedule assertions.
- `src/services/appStateStorage.test.ts` and its existing frozen V1 fixture: hydration assertion for stale grammar presentation on the vocabulary plan's atomic V1-to-V2 path.
- `src/components/GrammarCard.tsx`: independent collapsed insight state, accessible toggle, usage boundary, notes, and external references.
- `src/components/grammarCardPresentation.ts`: pure insight state/presentation contract consumed by the card.
- `src/components/grammarCardPresentation.test.ts`: default/independent state and accessibility-label/link projection tests without a UI-render dependency.
- `src/content/referenceInfluences.ts`: exact attribution copy and URLs shared by the Progress card and tests.
- `src/content/referenceInfluences.test.ts`: exact attribution and approved-link contract.
- `src/screens/ProgressScreen.tsx`: reference-influences card added after the vocabulary backup card exists.
- `README.md`: matching attribution and originality section.
- `docs/superpowers/reviews/2026-07-18-grammar-enrichment-review.md`: one-time link result, per-range editorial evidence, originality audit, and cross-range sign-off.
- `GITHUB_PAGES.md`: production, iPhone, offline, and non-destructive rollback runbook.

---

## Pre-execution prerequisite gate — run before Task 1, make no changes

The grammar branch starts from the completed vocabulary implementation commit. Stop if any command fails; repair or finish the vocabulary plan rather than creating grammar-owned substitutes.

Run:

```powershell
$requiredExports = @(
  @{ Path = 'src/models/appState.ts'; Pattern = 'export interface PersistedAppStateV2' },
  @{ Path = 'src/services/vocabularyText.ts'; Pattern = 'export const containsHan' },
  @{ Path = 'src/services/vocabularyText.ts'; Pattern = 'export const containsLatinLetters' },
  @{ Path = 'src/services/vocabularyText.ts'; Pattern = 'export const isKanaReading' },
  @{ Path = 'src/services/reconcileReviewCards.ts'; Pattern = 'export const reconcileReviewCards' },
  @{ Path = 'src/services/appStateStorage.ts'; Pattern = 'PersistedAppStateV2' },
  @{ Path = 'src/state/appStateCommitter.ts'; Pattern = 'PersistedAppStateV2' }
)
foreach ($requirement in $requiredExports) {
  if (-not (Test-Path -LiteralPath $requirement.Path)) { throw "Missing vocabulary prerequisite: $($requirement.Path)" }
  if (-not (Select-String -LiteralPath $requirement.Path -Pattern $requirement.Pattern -Quiet)) {
    throw "Missing vocabulary prerequisite export '$($requirement.Pattern)' in $($requirement.Path)"
  }
}
if (-not (Select-String -LiteralPath 'src/models/appState.ts' -Pattern 'authoredBaselineVersion' -Quiet)) {
  throw 'PersistedAppStateV2 must use authoredBaselineVersion.'
}
if (Select-String -LiteralPath 'src/models/appState.ts' -Pattern 'courseBaselineVersion' -Quiet) {
  throw 'The obsolete courseBaselineVersion name is present.'
}
rg --fixed-strings 'course-v1-25859789e2a3679f09b1ebe6a5f3e981c3c164bf0b8dec7537cd26a0bf933f03' src
if ($LASTEXITCODE -ne 0) { throw 'The approved authored baseline version is missing.' }
pnpm.cmd typecheck
pnpm.cmd test
pnpm.cmd export:web
git status --short
```

Expected:

- The script prints no prerequisite error.
- TypeScript exits `0` with no diagnostics.
- Vitest exits `0` with the entire vocabulary-plan suite passing.
- Expo reports a successful web export to `dist`.
- `git status --short` prints nothing. A dirty tree must be reviewed and committed by the vocabulary plan before grammar work begins.

Record the foundation commit for rollback without changing it:

```powershell
git tag grammar-enrichment-base-2026-07-18 HEAD
git rev-parse grammar-enrichment-base-2026-07-18
```

Expected: one 40-character commit ID. Do not push the tag until the final rollout gate authorizes production rollout.

---

### Task 1: Freeze the grammar inventory and add the sole reference manifest

**Files:**
- Create: `src/data/lessons/grammarInventory.ts`
- Create: `src/data/grammarReferences.json`
- Create: `src/data/grammarReferences.ts`
- Create: `src/data/grammarReferences.test.ts`
- Modify: `src/models/content.ts` (`FurtherReading`, transitional `GrammarPoint` fields)
- Modify: `tsconfig.json` (`resolveJsonModule`)
- Modify: `src/data/lessons/index.ts` (manifest attachment after numeric sort)
- Modify: `src/data/lessons/contentIntegrity.test.ts` (frozen dialogue-presentation and exercise-ID characterization snapshot)
- Create: `src/data/lessons/__snapshots__/contentIntegrity.test.ts.snap` (generated by Vitest from the unchanged dialogue/exercise baseline)

**Interfaces:**
- Consumes: the existing `Lesson`, `GrammarPoint`, and `JapaneseExample` contracts.
- Produces: `FurtherReading { title: string; url: string }`, `GRAMMAR_IDS_BY_LESSON`, `FROZEN_GRAMMAR_IDS: readonly GrammarId[]`, `GrammarId`, `grammarReferences: Readonly<Record<GrammarId, readonly FurtherReading[]>>`, and `getGrammarReferences(grammarId: string): readonly FurtherReading[]`.
- Produces temporarily: `GrammarPoint.usageBoundary?: string` and `GrammarPoint.furtherReading?: FurtherReading[]`. Task 6 makes `usageBoundary` required before any push.

- [ ] **Step 1: Write the failing manifest and characterization tests**

Create `src/data/grammarReferences.test.ts` with these behaviors:

```ts
import { describe, expect, it } from 'vitest';

import { lessons } from './lessons';
import {
  getGrammarReferences,
  grammarReferences,
} from './grammarReferences';
import { FROZEN_GRAMMAR_IDS } from './lessons/grammarInventory';

describe('grammarReferences', () => {
  it('matches the frozen 101 grammar IDs in exported lesson order', () => {
    const actualIds = lessons.flatMap((lesson) => lesson.grammar.map((point) => point.id));
    expect(actualIds).toHaveLength(101);
    expect(actualIds).toEqual(FROZEN_GRAMMAR_IDS);
    expect(Object.keys(grammarReferences)).toEqual(FROZEN_GRAMMAR_IDS);
  });

  it('uses only explicit official learner pages and has no within-point duplicate', () => {
    for (const grammarId of FROZEN_GRAMMAR_IDS) {
      const references = getGrammarReferences(grammarId);
      expect(new Set(references.map(({ url }) => url)).size).toBe(references.length);
      for (const reference of references) {
        const url = new URL(reference.url);
        expect(url.protocol).toBe('https:');
        expect(url.hostname).toBe('guidetojapanese.org');
        expect(url.pathname).toMatch(/^\/learn\/grammar\/[a-z_]+$/);
        expect(reference.title).toMatch(/^Tae Kim's Guide: /);
      }
    }
  });

  it('attaches an independent manifest copy to every exported point', () => {
    for (const point of lessons.flatMap((lesson) => lesson.grammar)) {
      const references = getGrammarReferences(point.id);
      if (references.length) {
        expect(point.furtherReading).toEqual(references);
        expect(point.furtherReading).not.toBe(references);
      } else {
        expect(point).not.toHaveProperty('furtherReading');
      }
    }
  });

  it('throws rather than silently accepting an unregistered grammar ID', () => {
    expect(() => getGrammarReferences('l99-not-real')).toThrowError(
      'Missing grammar reference manifest entry: l99-not-real',
    );
  });
});
```

Append this characterization test to `src/data/lessons/contentIntegrity.test.ts` before any dialogue-reading edit:

```ts
it('freezes dialogue presentation and exercise IDs before kana migration', () => {
  expect(
    lessons.map((lesson) => ({
      lessonId: lesson.id,
      dialogue: lesson.dialogue.map(({ id, speaker, japanese, english, grammarIds }) => ({
        id,
        speaker,
        japanese,
        english,
        grammarIds: grammarIds ?? [],
      })),
      exerciseIds: lesson.exercises.map(({ id }) => id),
    })),
  ).toMatchSnapshot();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```powershell
pnpm.cmd test -- src/data/grammarReferences.test.ts src/data/lessons/contentIntegrity.test.ts --update
```

Expected: FAIL because `src/data/grammarReferences.ts` does not exist. Vitest may write the characterization snapshot before the unresolved import aborts; retain it only after inspecting that it contains 25 lesson entries, 173 dialogue entries, and 200 exercise IDs.

- [ ] **Step 3: Add the model fields and exhaustive manifest**

Add to `src/models/content.ts`:

```ts
export interface FurtherReading {
  title: string;
  url: string;
}

export interface GrammarPoint {
  id: string;
  title: string;
  pattern: string;
  plainEnglish: string;
  explanation: string;
  whyItWorks: string;
  // Optional only across the three local range commits; Task 6 makes it required.
  usageBoundary?: string;
  notes?: string[];
  examples: JapaneseExample[];
  furtherReading?: FurtherReading[];
  commonMistake?: {
    avoid: string;
    prefer: string;
    reason: string;
  };
}
```

Set `"resolveJsonModule": true` in `tsconfig.json`'s `compilerOptions`, then create `src/data/lessons/grammarInventory.ts`:

```ts
export const GRAMMAR_IDS_BY_LESSON = [
  ['l1-topic-copula', 'l1-negative', 'l1-question', 'l1-also', 'l1-connection'],
  ['l2-things', 'l2-noun-pointing', 'l2-owner', 'l2-confirm'],
  ['l3-places', 'l3-where', 'l3-location', 'l3-polite-direction'],
  ['l4-nonpast', 'l4-past', 'l4-time-ni', 'l4-bounds'],
  ['l5-destination', 'l5-transport', 'l5-companion', 'l5-when'],
  ['l6-object', 'l6-action-place', 'l6-invite', 'l6-suggest'],
  ['l7-means', 'l7-give', 'l7-receive', 'l7-status'],
  ['l8-i-adjectives', 'l8-na-adjectives', 'l8-degree', 'l8-what-kind'],
  ['l9-preference', 'l9-skill', 'l9-understand', 'l9-reason'],
  ['l10-existence-verbs', 'l10-place-new-entity', 'l10-known-location', 'l10-position-words'],
  ['l11-counters', 'l11-duration', 'l11-frequency', 'l11-quantity-questions'],
  ['l12-i-adjective-past', 'l12-na-noun-past', 'l12-yori-comparison', 'l12-choice-best'],
  ['l13-hoshii', 'l13-tai', 'l13-purpose-movement', 'l13-indefinites'],
  ['l14-te-form', 'l14-request', 'l14-action-progress', 'l14-offer'],
  ['l15-permission', 'l15-prohibition', 'l15-continuing-state', 'l15-knowing'],
  ['l16-action-sequence', 'l16-after-action', 'l16-description-linking', 'l16-how-to'],
  ['l17-nai-form', 'l17-negative-request', 'l17-obligation', 'l17-not-necessary'],
  ['l18-dictionary-form', 'l18-ability', 'l18-hobby', 'l18-before'],
  ['l19-ta-form', 'l19-experience', 'l19-representative-actions', 'l19-change'],
  ['l20-plain-verbs', 'l20-plain-descriptions', 'l20-casual-questions', 'l20-final-particles'],
  ['l21-think', 'l21-say', 'l21-probability', 'l21-topic-about'],
  ['l22-relative-clause', 'l22-inner-subject', 'l22-tense-negative', 'l22-time-for-action'],
  ['l23-when-forms', 'l23-timing-viewpoint', 'l23-automatic-to', 'l23-path-particle'],
  ['l24-te-ageru', 'l24-te-morau', 'l24-te-kureru', 'l24-viewpoint'],
  ['l25-tara-condition', 'l25-after-tara', 'l25-even-if', 'l25-moshi'],
] as const;

export type GrammarId = (typeof GRAMMAR_IDS_BY_LESSON)[number][number];
export const FROZEN_GRAMMAR_IDS: readonly GrammarId[] = GRAMMAR_IDS_BY_LESSON.flat();
```

Create `src/data/grammarReferences.json` with the following exhaustive content. Empty arrays are intentional direct-treatment decisions. Do not add category pages, legacy `/complete/` pages, generated slugs, or Saeris URLs to learner-facing records.

```json
{
  "l1-topic-copula": [{ "title": "Tae Kim's Guide: Introduction to Particles", "url": "https://guidetojapanese.org/learn/grammar/particlesintro" }],
  "l1-negative": [{ "title": "Tae Kim's Guide: Expressing state-of-being", "url": "https://guidetojapanese.org/learn/grammar/stateofbeing" }],
  "l1-question": [{ "title": "Tae Kim's Guide: The Question Marker", "url": "https://guidetojapanese.org/learn/grammar/question" }],
  "l1-also": [{ "title": "Tae Kim's Guide: Introduction to Particles", "url": "https://guidetojapanese.org/learn/grammar/particlesintro" }],
  "l1-connection": [{ "title": "Tae Kim's Guide: Noun-related Particles", "url": "https://guidetojapanese.org/learn/grammar/nounparticles" }],
  "l2-things": [],
  "l2-noun-pointing": [],
  "l2-owner": [{ "title": "Tae Kim's Guide: Noun-related Particles", "url": "https://guidetojapanese.org/learn/grammar/nounparticles" }],
  "l2-confirm": [],
  "l3-places": [],
  "l3-where": [{ "title": "Tae Kim's Guide: The Question Marker", "url": "https://guidetojapanese.org/learn/grammar/question" }],
  "l3-location": [{ "title": "Tae Kim's Guide: Particles used with verbs", "url": "https://guidetojapanese.org/learn/grammar/verbparticles" }],
  "l3-polite-direction": [],
  "l4-nonpast": [{ "title": "Tae Kim's Guide: Polite Form and Verb Stems", "url": "https://guidetojapanese.org/learn/grammar/polite" }],
  "l4-past": [{ "title": "Tae Kim's Guide: Polite Form and Verb Stems", "url": "https://guidetojapanese.org/learn/grammar/polite" }, { "title": "Tae Kim's Guide: Past Tense", "url": "https://guidetojapanese.org/learn/grammar/past_tense" }],
  "l4-time-ni": [{ "title": "Tae Kim's Guide: Particles used with verbs", "url": "https://guidetojapanese.org/learn/grammar/verbparticles" }],
  "l4-bounds": [{ "title": "Tae Kim's Guide: Noun-related Particles", "url": "https://guidetojapanese.org/learn/grammar/nounparticles" }],
  "l5-destination": [{ "title": "Tae Kim's Guide: Particles used with verbs", "url": "https://guidetojapanese.org/learn/grammar/verbparticles" }],
  "l5-transport": [{ "title": "Tae Kim's Guide: Particles used with verbs", "url": "https://guidetojapanese.org/learn/grammar/verbparticles" }],
  "l5-companion": [{ "title": "Tae Kim's Guide: Noun-related Particles", "url": "https://guidetojapanese.org/learn/grammar/nounparticles" }],
  "l5-when": [{ "title": "Tae Kim's Guide: The Question Marker", "url": "https://guidetojapanese.org/learn/grammar/question" }],
  "l6-object": [{ "title": "Tae Kim's Guide: Particles used with verbs", "url": "https://guidetojapanese.org/learn/grammar/verbparticles" }],
  "l6-action-place": [{ "title": "Tae Kim's Guide: Particles used with verbs", "url": "https://guidetojapanese.org/learn/grammar/verbparticles" }],
  "l6-invite": [{ "title": "Tae Kim's Guide: Desire and Suggestions", "url": "https://guidetojapanese.org/learn/grammar/desire" }],
  "l6-suggest": [{ "title": "Tae Kim's Guide: Desire and Suggestions", "url": "https://guidetojapanese.org/learn/grammar/desire" }],
  "l7-means": [{ "title": "Tae Kim's Guide: Particles used with verbs", "url": "https://guidetojapanese.org/learn/grammar/verbparticles" }],
  "l7-give": [{ "title": "Tae Kim's Guide: Giving and Receiving", "url": "https://guidetojapanese.org/learn/grammar/favors" }],
  "l7-receive": [{ "title": "Tae Kim's Guide: Giving and Receiving", "url": "https://guidetojapanese.org/learn/grammar/favors" }],
  "l7-status": [],
  "l8-i-adjectives": [{ "title": "Tae Kim's Guide: Adjectives", "url": "https://guidetojapanese.org/learn/grammar/adjectives" }],
  "l8-na-adjectives": [{ "title": "Tae Kim's Guide: Adjectives", "url": "https://guidetojapanese.org/learn/grammar/adjectives" }],
  "l8-degree": [{ "title": "Tae Kim's Guide: Adverbs and Sentence-ending particles", "url": "https://guidetojapanese.org/learn/grammar/adverbs" }],
  "l8-what-kind": [],
  "l9-preference": [{ "title": "Tae Kim's Guide: Adjectives", "url": "https://guidetojapanese.org/learn/grammar/adjectives" }],
  "l9-skill": [{ "title": "Tae Kim's Guide: Adjectives", "url": "https://guidetojapanese.org/learn/grammar/adjectives" }],
  "l9-understand": [{ "title": "Tae Kim's Guide: Particles used with verbs", "url": "https://guidetojapanese.org/learn/grammar/verbparticles" }],
  "l9-reason": [{ "title": "Tae Kim's Guide: Compound Sentences", "url": "https://guidetojapanese.org/learn/grammar/compound" }],
  "l10-existence-verbs": [{ "title": "Tae Kim's Guide: Verb Basics", "url": "https://guidetojapanese.org/learn/grammar/verbs" }],
  "l10-place-new-entity": [{ "title": "Tae Kim's Guide: Particles used with verbs", "url": "https://guidetojapanese.org/learn/grammar/verbparticles" }],
  "l10-known-location": [{ "title": "Tae Kim's Guide: Particles used with verbs", "url": "https://guidetojapanese.org/learn/grammar/verbparticles" }],
  "l10-position-words": [{ "title": "Tae Kim's Guide: Noun-related Particles", "url": "https://guidetojapanese.org/learn/grammar/nounparticles" }],
  "l11-counters": [{ "title": "Tae Kim's Guide: Numbers and Counting", "url": "https://guidetojapanese.org/learn/grammar/numbers" }],
  "l11-duration": [{ "title": "Tae Kim's Guide: Numbers and Counting", "url": "https://guidetojapanese.org/learn/grammar/numbers" }],
  "l11-frequency": [{ "title": "Tae Kim's Guide: Numbers and Counting", "url": "https://guidetojapanese.org/learn/grammar/numbers" }],
  "l11-quantity-questions": [{ "title": "Tae Kim's Guide: Numbers and Counting", "url": "https://guidetojapanese.org/learn/grammar/numbers" }],
  "l12-i-adjective-past": [{ "title": "Tae Kim's Guide: Adjectives", "url": "https://guidetojapanese.org/learn/grammar/adjectives" }],
  "l12-na-noun-past": [{ "title": "Tae Kim's Guide: Expressing state-of-being", "url": "https://guidetojapanese.org/learn/grammar/stateofbeing" }, { "title": "Tae Kim's Guide: Adjectives", "url": "https://guidetojapanese.org/learn/grammar/adjectives" }],
  "l12-yori-comparison": [{ "title": "Tae Kim's Guide: Using 方 and より", "url": "https://guidetojapanese.org/learn/grammar/comparison" }],
  "l12-choice-best": [{ "title": "Tae Kim's Guide: Using 方 and より", "url": "https://guidetojapanese.org/learn/grammar/comparison" }],
  "l13-hoshii": [{ "title": "Tae Kim's Guide: Desire and Suggestions", "url": "https://guidetojapanese.org/learn/grammar/desire" }],
  "l13-tai": [{ "title": "Tae Kim's Guide: Desire and Suggestions", "url": "https://guidetojapanese.org/learn/grammar/desire" }],
  "l13-purpose-movement": [{ "title": "Tae Kim's Guide: Polite Form and Verb Stems", "url": "https://guidetojapanese.org/learn/grammar/polite" }],
  "l13-indefinites": [{ "title": "Tae Kim's Guide: The Question Marker", "url": "https://guidetojapanese.org/learn/grammar/question" }],
  "l14-te-form": [{ "title": "Tae Kim's Guide: Compound Sentences", "url": "https://guidetojapanese.org/learn/grammar/compound" }],
  "l14-request": [{ "title": "Tae Kim's Guide: Making Requests", "url": "https://guidetojapanese.org/learn/grammar/requests" }],
  "l14-action-progress": [{ "title": "Tae Kim's Guide: Other uses of the te-form", "url": "https://guidetojapanese.org/learn/grammar/teform" }],
  "l14-offer": [{ "title": "Tae Kim's Guide: Desire and Suggestions", "url": "https://guidetojapanese.org/learn/grammar/desire" }],
  "l15-permission": [{ "title": "Tae Kim's Guide: Other uses of the te-form", "url": "https://guidetojapanese.org/learn/grammar/teform" }],
  "l15-prohibition": [{ "title": "Tae Kim's Guide: Other uses of the te-form", "url": "https://guidetojapanese.org/learn/grammar/teform" }],
  "l15-continuing-state": [{ "title": "Tae Kim's Guide: Other uses of the te-form", "url": "https://guidetojapanese.org/learn/grammar/teform" }],
  "l15-knowing": [{ "title": "Tae Kim's Guide: Other uses of the te-form", "url": "https://guidetojapanese.org/learn/grammar/teform" }],
  "l16-action-sequence": [{ "title": "Tae Kim's Guide: Compound Sentences", "url": "https://guidetojapanese.org/learn/grammar/compound" }],
  "l16-after-action": [{ "title": "Tae Kim's Guide: Compound Sentences", "url": "https://guidetojapanese.org/learn/grammar/compound" }],
  "l16-description-linking": [{ "title": "Tae Kim's Guide: Compound Sentences", "url": "https://guidetojapanese.org/learn/grammar/compound" }],
  "l16-how-to": [{ "title": "Tae Kim's Guide: Using 方 and より", "url": "https://guidetojapanese.org/learn/grammar/comparison" }],
  "l17-nai-form": [{ "title": "Tae Kim's Guide: Negative Verbs", "url": "https://guidetojapanese.org/learn/grammar/negativeverbs" }],
  "l17-negative-request": [{ "title": "Tae Kim's Guide: Making Requests", "url": "https://guidetojapanese.org/learn/grammar/requests" }],
  "l17-obligation": [{ "title": "Tae Kim's Guide: Expressing must or have to", "url": "https://guidetojapanese.org/learn/grammar/must" }],
  "l17-not-necessary": [{ "title": "Tae Kim's Guide: Expressing must or have to", "url": "https://guidetojapanese.org/learn/grammar/must" }],
  "l18-dictionary-form": [{ "title": "Tae Kim's Guide: Verb Basics", "url": "https://guidetojapanese.org/learn/grammar/verbs" }],
  "l18-ability": [{ "title": "Tae Kim's Guide: Potential Form", "url": "https://guidetojapanese.org/learn/grammar/potential" }],
  "l18-hobby": [{ "title": "Tae Kim's Guide: Acting on relative clauses", "url": "https://guidetojapanese.org/learn/grammar/actionclause" }],
  "l18-before": [{ "title": "Tae Kim's Guide: Relative Clauses and Sentence Order", "url": "https://guidetojapanese.org/learn/grammar/clause" }],
  "l19-ta-form": [{ "title": "Tae Kim's Guide: Past Tense", "url": "https://guidetojapanese.org/learn/grammar/past_tense" }],
  "l19-experience": [{ "title": "Tae Kim's Guide: Acting on relative clauses", "url": "https://guidetojapanese.org/learn/grammar/actionclause" }],
  "l19-representative-actions": [{ "title": "Tae Kim's Guide: Compound Sentences", "url": "https://guidetojapanese.org/learn/grammar/compound" }],
  "l19-change": [{ "title": "Tae Kim's Guide: Using する and なる with に", "url": "https://guidetojapanese.org/learn/grammar/surunaru" }],
  "l20-plain-verbs": [{ "title": "Tae Kim's Guide: Verb Basics", "url": "https://guidetojapanese.org/learn/grammar/verbs" }, { "title": "Tae Kim's Guide: Negative Verbs", "url": "https://guidetojapanese.org/learn/grammar/negativeverbs" }, { "title": "Tae Kim's Guide: Past Tense", "url": "https://guidetojapanese.org/learn/grammar/past_tense" }],
  "l20-plain-descriptions": [{ "title": "Tae Kim's Guide: Expressing state-of-being", "url": "https://guidetojapanese.org/learn/grammar/stateofbeing" }, { "title": "Tae Kim's Guide: Adjectives", "url": "https://guidetojapanese.org/learn/grammar/adjectives" }],
  "l20-casual-questions": [{ "title": "Tae Kim's Guide: The Question Marker", "url": "https://guidetojapanese.org/learn/grammar/question" }],
  "l20-final-particles": [{ "title": "Tae Kim's Guide: Adverbs and Sentence-ending particles", "url": "https://guidetojapanese.org/learn/grammar/adverbs" }],
  "l21-think": [{ "title": "Tae Kim's Guide: Acting on relative clauses", "url": "https://guidetojapanese.org/learn/grammar/actionclause" }],
  "l21-say": [{ "title": "Tae Kim's Guide: Acting on relative clauses", "url": "https://guidetojapanese.org/learn/grammar/actionclause" }],
  "l21-probability": [{ "title": "Tae Kim's Guide: Various degrees of certainty", "url": "https://guidetojapanese.org/learn/grammar/certainty" }],
  "l21-topic-about": [{ "title": "Tae Kim's Guide: Noun-related Particles", "url": "https://guidetojapanese.org/learn/grammar/nounparticles" }],
  "l22-relative-clause": [{ "title": "Tae Kim's Guide: Relative Clauses and Sentence Order", "url": "https://guidetojapanese.org/learn/grammar/clause" }],
  "l22-inner-subject": [{ "title": "Tae Kim's Guide: Relative Clauses and Sentence Order", "url": "https://guidetojapanese.org/learn/grammar/clause" }, { "title": "Tae Kim's Guide: Introduction to Particles", "url": "https://guidetojapanese.org/learn/grammar/particlesintro" }],
  "l22-tense-negative": [{ "title": "Tae Kim's Guide: Relative Clauses and Sentence Order", "url": "https://guidetojapanese.org/learn/grammar/clause" }],
  "l22-time-for-action": [{ "title": "Tae Kim's Guide: Relative Clauses and Sentence Order", "url": "https://guidetojapanese.org/learn/grammar/clause" }],
  "l23-when-forms": [{ "title": "Tae Kim's Guide: Relative Clauses and Sentence Order", "url": "https://guidetojapanese.org/learn/grammar/clause" }],
  "l23-timing-viewpoint": [{ "title": "Tae Kim's Guide: Relative Clauses and Sentence Order", "url": "https://guidetojapanese.org/learn/grammar/clause" }],
  "l23-automatic-to": [{ "title": "Tae Kim's Guide: Conditionals", "url": "https://guidetojapanese.org/learn/grammar/conditionals" }],
  "l23-path-particle": [{ "title": "Tae Kim's Guide: Particles used with verbs", "url": "https://guidetojapanese.org/learn/grammar/verbparticles" }],
  "l24-te-ageru": [{ "title": "Tae Kim's Guide: Giving and Receiving", "url": "https://guidetojapanese.org/learn/grammar/favors" }],
  "l24-te-morau": [{ "title": "Tae Kim's Guide: Giving and Receiving", "url": "https://guidetojapanese.org/learn/grammar/favors" }],
  "l24-te-kureru": [{ "title": "Tae Kim's Guide: Giving and Receiving", "url": "https://guidetojapanese.org/learn/grammar/favors" }],
  "l24-viewpoint": [{ "title": "Tae Kim's Guide: Giving and Receiving", "url": "https://guidetojapanese.org/learn/grammar/favors" }],
  "l25-tara-condition": [{ "title": "Tae Kim's Guide: Conditionals", "url": "https://guidetojapanese.org/learn/grammar/conditionals" }],
  "l25-after-tara": [{ "title": "Tae Kim's Guide: Conditionals", "url": "https://guidetojapanese.org/learn/grammar/conditionals" }],
  "l25-even-if": [{ "title": "Tae Kim's Guide: Conditionals", "url": "https://guidetojapanese.org/learn/grammar/conditionals" }],
  "l25-moshi": [{ "title": "Tae Kim's Guide: Conditionals", "url": "https://guidetojapanese.org/learn/grammar/conditionals" }]
}
```

Create the typed wrapper `src/data/grammarReferences.ts`:

```ts
import manifest from './grammarReferences.json';
import type { FurtherReading } from '../models/content';
import { FROZEN_GRAMMAR_IDS } from './lessons/grammarInventory';
import type { GrammarId } from './lessons/grammarInventory';

export const grammarReferences = manifest as Readonly<Record<GrammarId, readonly FurtherReading[]>>;

if (Object.keys(grammarReferences).join('\n') !== FROZEN_GRAMMAR_IDS.join('\n')) {
  throw new Error('Grammar reference manifest keys do not match the frozen grammar inventory.');
}

export const getGrammarReferences = (grammarId: string): readonly FurtherReading[] => {
  const references = grammarReferences[grammarId as GrammarId];
  if (!references) throw new Error(`Missing grammar reference manifest entry: ${grammarId}`);
  return references;
};
```

- [ ] **Step 4: Attach manifest records after the existing numeric lesson sort**

In `src/data/lessons/index.ts`, preserve the four existing inputs and replace the direct exported array with:

```ts
import { getGrammarReferences } from '../grammarReferences';

const authoredLessons: Lesson[] = [
  lesson01,
  ...lessons02to09,
  ...lessons10to17,
  ...lessons18to25,
].sort((a, b) => a.number - b.number);

export const lessons: Lesson[] = authoredLessons.map((lesson) => ({
  ...lesson,
  grammar: lesson.grammar.map((point) => {
    const references = getGrammarReferences(point.id);
    return references.length ? { ...point, furtherReading: [...references] } : point;
  }),
}));
```

Keep the existing `getLesson` export unchanged beneath this code.

- [ ] **Step 5: Run offline tests and inspect the frozen snapshot**

Run:

```powershell
pnpm.cmd test -- src/data/grammarReferences.test.ts src/data/lessons/contentIntegrity.test.ts --update
$snapshot = Get-Content -Raw -Encoding utf8 'src/data/lessons/__snapshots__/contentIntegrity.test.ts.snap'
if (([regex]::Matches($snapshot, '"id": "l\d+-d\d+"')).Count -ne 173) { throw 'Dialogue snapshot must contain 173 IDs.' }
if (([regex]::Matches($snapshot, '"l\d+-e\d{2}"')).Count -ne 200) { throw 'Characterization snapshot must contain 200 exercise IDs.' }
pnpm.cmd typecheck
```

Expected: both test files PASS, Vitest reports one snapshot written or updated, the PowerShell assertion returns silently, and TypeScript exits `0`.

- [ ] **Step 6: Commit**

```powershell
git add -- tsconfig.json src/models/content.ts src/data/lessons/grammarInventory.ts src/data/grammarReferences.json src/data/grammarReferences.ts src/data/grammarReferences.test.ts src/data/lessons/index.ts src/data/lessons/contentIntegrity.test.ts src/data/lessons/__snapshots__/contentIntegrity.test.ts.snap
git commit -m "feat: add frozen grammar reference manifest"
```

Expected: one commit containing only the listed files.

---

### Task 2: Run and record the one-time reference-link preflight

**Files:**
- Create: `scripts/verify-grammar-links.mjs`
- Modify: `package.json` (`verify:grammar-links` script only)
- Create: `docs/superpowers/reviews/2026-07-18-grammar-enrichment-review.md`

**Interfaces:**
- Consumes: `src/data/grammarReferences.json` directly; no duplicate URL list.
- Produces: command `pnpm.cmd verify:grammar-links`, which exits `0` only when every unique manifest URL follows redirects and returns HTTP 2xx.
- Does not produce a Vitest test and is never added to the GitHub Actions workflow.

- [ ] **Step 1: Add the package command and verify the missing script fails**

Add this one entry to `package.json`'s `scripts` object:

```json
"verify:grammar-links": "node scripts/verify-grammar-links.mjs"
```

Run:

```powershell
pnpm.cmd verify:grammar-links
```

Expected: FAIL with `MODULE_NOT_FOUND` for `scripts/verify-grammar-links.mjs`.

- [ ] **Step 2: Implement the one-time preflight**

Create `scripts/verify-grammar-links.mjs`:

```js
import { readFile } from 'node:fs/promises';

const grammarReferences = JSON.parse(
  await readFile(new URL('../src/data/grammarReferences.json', import.meta.url), 'utf8'),
);
const urls = [...new Set(Object.values(grammarReferences).flat().map(({ url }) => url))].sort();

if (urls.length !== 25) {
  throw new Error(`Expected 25 unique approved learner URLs, received ${urls.length}.`);
}

for (const url of urls) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'guidetojapanese.org' || !parsed.pathname.startsWith('/learn/grammar/')) {
    throw new Error(`Disallowed learner URL: ${url}`);
  }
  const response = await fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': 'nihongo-path-grammar-reference-preflight/1.0' },
  });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  console.log(`PASS ${url} ${response.status}`);
}

console.log(`Grammar reference preflight passed: ${urls.length}/${urls.length} unique URLs.`);
```

- [ ] **Step 3: Run the one-time network preflight before editing any lesson content**

Run:

```powershell
pnpm.cmd verify:grammar-links
```

Expected: 25 `PASS https://guidetojapanese.org/learn/grammar/... 200` lines followed by `Grammar reference preflight passed: 25/25 unique URLs.` Redirects are allowed, but the final response must be 2xx. Stop if any URL fails; do not replace it with a search result, category page, legacy guide URL, or unverified slug.

- [ ] **Step 4: Record source boundaries and the successful preflight**

Create `docs/superpowers/reviews/2026-07-18-grammar-enrichment-review.md` with exactly these opening sections:

```markdown
# Grammar Enrichment Implementation Review

## Reference preflight

- Result: PASS — all 25 unique learner URLs in `src/data/grammarReferences.json` returned HTTP 2xx before lesson editing began.
- Command: `pnpm.cmd verify:grammar-links`
- Ordinary Vitest and CI runs remain offline; URL tests validate only manifest membership, host, path shape, and per-point uniqueness.
- Learner destination: `https://guidetojapanese.org/learn/grammar/`
- Structured review aid: `https://github.com/Saeris/guide-to-japanese`

## Source-use boundary

- Grammar facts and topic coverage informed the independent review.
- No source sentence, exercise, table, analogy, paragraph structure, heading sequence, media, or website code is reused.
- Direct quotation is absent.
- Every in-app explanation, example, dialogue, and exercise remains independently written for Nihongo Path.
- Neither Tae Kim nor the Saeris project endorses Nihongo Path.
```

- [ ] **Step 5: Confirm ordinary tests stay offline and pass**

Run:

```powershell
pnpm.cmd test -- src/data/grammarReferences.test.ts
pnpm.cmd typecheck
```

Expected: PASS without a network request and no TypeScript diagnostics.

- [ ] **Step 6: Commit**

```powershell
git add -- package.json scripts/verify-grammar-links.mjs docs/superpowers/reviews/2026-07-18-grammar-enrichment-review.md
git commit -m "chore: verify grammar reference links"
```

Expected: one commit containing the command, one-time preflight script, and implementation-review record.

---

### Task 3: Enrich Lessons 1–9 and migrate their grammar/dialogue readings to kana

**Files:**
- Create: `src/data/lessons/grammarEnrichmentTestUtils.ts`
- Create: `src/data/lessons/grammarRange01to09.test.ts`
- Modify: `src/data/lessons/lesson01.ts` (5 points, 10 examples, 8 dialogue readings)
- Modify: `src/data/lessons/lessons02to09.ts` (32 points, 64 examples, 64 dialogue readings)
- Modify: `src/services/reconcileReviewCards.test.ts` (enriched grammar presentation and schedule regression)
- Modify: `src/services/appStateStorage.test.ts` (frozen V1 hydration regression)

**Interfaces:**
- Consumes: `containsHan(value: string)`, `containsLatinLetters(value: string)`, and `isKanaReading(value: string)` from `src/services/vocabularyText.ts`; `lessons` from `src/data/lessons/index.ts`.
- Consumes unchanged vocabulary-plan APIs: `emptyVocabularyOverrides()`, `reconcileReviewCards(input): Record<string, ReviewCard>`, `hydrateAppStateV2({ storage, lessons, now? }): Promise<HydrationResult>`, `V1_STUDY_STORAGE_KEY`, and `src/test/fixtures/study-state-v1.json`.
- Produces: `collectGrammarRangeErrors(expectation: GrammarRangeExpectation): string[]`, where the expectation fixes the lesson interval, point/example/dialogue totals, and per-lesson dialogue counts.
- Produces content: 37 populated `usageBoundary` values, exactly 74 original examples, and 146 kana readings (74 example readings plus 72 required dialogue readings).

- [ ] **Step 1: Write the shared offline range validator and failing range test**

Create `src/data/lessons/grammarEnrichmentTestUtils.ts`:

```ts
import { getGrammarReferences } from '../grammarReferences';
import { containsHan, containsLatinLetters, isKanaReading } from '../../services/vocabularyText';
import { lessons } from '.';

export interface GrammarRangeExpectation {
  firstLesson: number;
  lastLesson: number;
  grammarPoints: number;
  examples: number;
  dialogueTurns: number;
  dialogueByLesson: Readonly<Record<number, number>>;
}

const nonEmpty = (value: string | undefined) => Boolean(value?.trim());

export const collectGrammarRangeErrors = (expectation: GrammarRangeExpectation): string[] => {
  const errors: string[] = [];
  const range = lessons.filter(
    ({ number }) => number >= expectation.firstLesson && number <= expectation.lastLesson,
  );
  const expectedLessonNumbers = Array.from(
    { length: expectation.lastLesson - expectation.firstLesson + 1 },
    (_, index) => expectation.firstLesson + index,
  );
  if (range.map(({ number }) => number).join(',') !== expectedLessonNumbers.join(',')) {
    errors.push(`lesson order: expected ${expectedLessonNumbers.join(',')}`);
  }

  const points = range.flatMap(({ grammar }) => grammar);
  const examples = points.flatMap(({ examples: pointExamples }) => pointExamples);
  const dialogue = range.flatMap(({ dialogue: lessonDialogue }) => lessonDialogue);
  if (points.length !== expectation.grammarPoints) errors.push(`grammar count: ${points.length}`);
  if (examples.length !== expectation.examples) errors.push(`example count: ${examples.length}`);
  if (dialogue.length !== expectation.dialogueTurns) errors.push(`dialogue count: ${dialogue.length}`);

  for (const lesson of range) {
    const expectedDialogueCount = expectation.dialogueByLesson[lesson.number];
    if (expectedDialogueCount === undefined) {
      errors.push(`lesson ${lesson.number}: dialogue expectation is missing`);
    } else {
      if (lesson.dialogue.length !== expectedDialogueCount) {
        errors.push(`lesson ${lesson.number}: dialogue count ${lesson.dialogue.length}`);
      }
      const expectedDialogueIds = Array.from(
        { length: expectedDialogueCount },
        (_, index) => `l${lesson.number}-d${String(index + 1).padStart(2, '0')}`,
      );
      if (lesson.dialogue.map(({ id }) => id).join(',') !== expectedDialogueIds.join(',')) {
        errors.push(`lesson ${lesson.number}: dialogue IDs changed`);
      }
    }
    const grammarIds = new Set(lesson.grammar.map(({ id }) => id));
    for (const turn of lesson.dialogue) {
      if (!isKanaReading(turn.reading) || containsLatinLetters(turn.reading)) {
        errors.push(`${turn.id}: dialogue reading is not kana`);
      }
      for (const grammarId of turn.grammarIds ?? []) {
        if (!grammarIds.has(grammarId)) errors.push(`${turn.id}: unresolved grammar ID ${grammarId}`);
      }
    }
  }

  for (const point of points) {
    if (!nonEmpty(point.explanation) || point.explanation.trim().length <= 40) {
      errors.push(`${point.id}: explanation is not substantive`);
    }
    if (!nonEmpty(point.whyItWorks) || point.whyItWorks.trim().length <= 40) {
      errors.push(`${point.id}: Japanese-first insight is not substantive`);
    }
    if (!nonEmpty(point.usageBoundary) || (point.usageBoundary?.trim().length ?? 0) <= 20) {
      errors.push(`${point.id}: usageBoundary is missing or vague`);
    }
    if (point.examples.length !== 2) errors.push(`${point.id}: expected exactly two examples`);
    const manifestReferences = getGrammarReferences(point.id);
    if (JSON.stringify(point.furtherReading ?? []) !== JSON.stringify(manifestReferences)) {
      errors.push(`${point.id}: furtherReading differs from manifest`);
    }
    if (point.commonMistake && ![
      point.commonMistake.avoid,
      point.commonMistake.prefer,
      point.commonMistake.reason,
    ].every(nonEmpty)) {
      errors.push(`${point.id}: commonMistake is incomplete`);
    }
    for (const [index, example] of point.examples.entries()) {
      if (!nonEmpty(example.japanese) || !nonEmpty(example.english)) {
        errors.push(`${point.id}: example ${index + 1} is incomplete`);
      }
      if (containsHan(example.japanese) && !nonEmpty(example.reading)) {
        errors.push(`${point.id}: example ${index + 1} needs a kanji reading`);
      }
      if (example.reading && (!isKanaReading(example.reading) || containsLatinLetters(example.reading))) {
        errors.push(`${point.id}: example ${index + 1} reading is not kana`);
      }
    }
  }

  return errors;
};
```

Create `src/data/lessons/grammarRange01to09.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { collectGrammarRangeErrors } from './grammarEnrichmentTestUtils';

describe('grammar enrichment for Lessons 1-9', () => {
  it('meets the frozen content and kana contract', () => {
    expect(collectGrammarRangeErrors({
      firstLesson: 1,
      lastLesson: 9,
      grammarPoints: 37,
      examples: 74,
      dialogueTurns: 72,
      dialogueByLesson: { 1: 8, 2: 8, 3: 8, 4: 8, 5: 8, 6: 8, 7: 8, 8: 8, 9: 8 },
    })).toEqual([]);
  });
});
```

Append this regression to `src/services/reconcileReviewCards.test.ts`, merging its imports with the vocabulary-plan test file:

```ts
it('refreshes enriched grammar presentation and preserves every schedule field', () => {
  const lesson = lessons.find(({ id }) => id === 'lesson-01');
  const point = lesson?.grammar.find(({ id }) => id === 'l1-topic-copula');
  expect(point?.title).toBe('Make a noun the topic, then identify it');
  if (!point) throw new Error('Missing l1-topic-copula');

  const stale: ReviewCard = {
    id: 'review-l1-topic-copula',
    lessonId: 'lesson-01',
    kind: 'grammar',
    prompt: 'A は old text',
    answer: 'stale answer',
    supportingText: 'Frame a topic, then describe it',
    dueAt: '2026-09-12T03:04:05.000Z',
    intervalDays: 17,
    repetitions: 6,
    ease: 2.35,
    lastReviewedAt: '2026-08-26T03:04:05.000Z',
  };
  const result = reconcileReviewCards({
    lessons,
    progress: {
      'lesson-01': {
        lessonId: 'lesson-01',
        started: true,
        completedExerciseIds: ['l1-e01'],
        correctAnswers: 1,
        attempts: 1,
      },
    },
    reviewCards: { [stale.id]: stale },
    vocabulary: emptyVocabularyOverrides(),
    now: new Date('2026-07-19T00:00:00.000Z'),
  });
  expect(result[stale.id]).toMatchObject({
    prompt: point.pattern,
    answer: point.plainEnglish,
    supportingText: point.title,
  });
  expect(result[stale.id]).toMatchObject({
    dueAt: stale.dueAt,
    intervalDays: stale.intervalDays,
    repetitions: stale.repetitions,
    ease: stale.ease,
    lastReviewedAt: stale.lastReviewedAt,
  });
});
```

Append this frozen-V1 assertion to `src/services/appStateStorage.test.ts`, using that file's existing JSON-fixture import and storage adapter type:

```ts
it('hydrates stale V1 grammar presentation into V2 without changing its schedule', async () => {
  const v1 = structuredClone(v1Fixture);
  const stale = {
    id: 'review-l1-topic-copula',
    lessonId: 'lesson-01',
    kind: 'grammar' as const,
    prompt: 'A は old text',
    answer: 'stale answer',
    supportingText: 'Frame a topic, then describe it',
    dueAt: '2026-09-12T03:04:05.000Z',
    intervalDays: 17,
    repetitions: 6,
    ease: 2.35,
    lastReviewedAt: '2026-08-26T03:04:05.000Z',
  };
  v1.progress['lesson-01'] = {
    lessonId: 'lesson-01', started: true, completedExerciseIds: [], correctAnswers: 0, attempts: 0,
  };
  v1.reviewCards[stale.id] = stale;
  const originalV1 = JSON.stringify(v1);
  const values = new Map<string, string>([[V1_STUDY_STORAGE_KEY, originalV1]]);
  const storage = {
    getItem: async (key: string) => values.get(key) ?? null,
    setItem: async (key: string, value: string) => { values.set(key, value); },
  };

  const result = await hydrateAppStateV2({
    storage,
    lessons,
    now: new Date('2026-07-19T00:00:00.000Z'),
  });
  expect(result.status).toBe('ready');
  if (result.status !== 'ready') throw new Error(result.message);
  expect(result.source).toBe('v1');
  expect(result.state.reviewCards[stale.id]).toMatchObject({
    prompt: 'A は B です',
    answer: '“As for A, it is B.”',
    supportingText: 'Make a noun the topic, then identify it',
    dueAt: stale.dueAt,
    intervalDays: stale.intervalDays,
    repetitions: stale.repetitions,
    ease: stale.ease,
    lastReviewedAt: stale.lastReviewedAt,
  });
  expect(values.get(V1_STUDY_STORAGE_KEY)).toBe(originalV1);
});
```

- [ ] **Step 2: Run the range test to verify it fails for the intended reasons**

Run:

```powershell
pnpm.cmd test -- src/data/lessons/grammarRange01to09.test.ts src/services/reconcileReviewCards.test.ts src/services/appStateStorage.test.ts
```

Expected: FAIL. The range errors include `l1-topic-copula: usageBoundary is missing or vague` and a romanized-reading diagnostic, and the reconciliation tests still see the old title `Frame a topic, then describe it` instead of the required enriched title. Counts remain 37/74/72.

- [ ] **Step 3: Enrich every point and convert every reading in Lessons 1–9**

Edit existing records in place. Keep every ID and array position. For each record, `explanation` states form and meaning, `whyItWorks` supplies the required Japanese-first frame, `usageBoundary` states the listed contrast/trap in a complete sentence, `notes` may hold literal frames/register detail, and the two examples remain original and lesson-safe. Use this concrete shape; do not add a second rationale field:

```ts
{
  id: 'l1-topic-copula',
  title: 'Make a noun the topic, then identify it',
  pattern: 'A は B です',
  plainEnglish: '“As for A, it is B.”',
  explanation: 'Put the shared topic before は and the identifying noun before です. The topic frames what the comment is about; です closes the noun sentence politely.',
  whyItWorks: 'Japanese first establishes a conversational frame and then supplies the comment. It does not need an English-style subject plus “am/is/are” in every clause, so information already clear from context can stay unspoken.',
  usageBoundary: 'Do not replace every English subject with は: は marks the chosen topic, while が has a different identifying role that this lesson only previews.',
  notes: ['Literal frame: “As for A, B.”', 'Keep the polite ending at the end of the complete sentence.'],
  examples: [
    { japanese: 'わたしは がくせいです。', reading: 'わたしは がくせいです。', english: 'I am a student.' },
    { japanese: 'エマさんは けんきゅうしゃです。', reading: 'エマさんは けんきゅうしゃです。', english: 'Emma is a researcher.' },
  ],
}
```

The range brief is mandatory content coverage, not optional editorial advice:

| Lesson | Point-specific Japanese-first insight and boundary that must appear | Material that must remain deferred |
|---|---|---|
| 1 | `l1-topic-copula`: topic/comment, not automatic English subject; `l1-negative`: negative identity is a copular form, not an action verb; `l1-question`: sentence-final polite `か`; `l1-also`: `も` replaces the topic marker and must match the inclusion; `l1-connection`: the noun after `の` is the head and `の` is broader than possession. | Casual `だ`, full `は`/`が` theory, plain past. |
| 2 | `l2-things` vs `l2-noun-pointing`: standalone `これ・それ・あれ` cannot directly take a noun, while `この・その・あの` must; `l2-owner`: contextual noun omission with `の` is licensed only when the missing head is recoverable; `l2-confirm`: `そうです` confirms the prior proposition rather than describing appearance. | Explanatory `の`; relative-clause nominalization. |
| 3 | `l3-places`: speaker/listener/neither distance zones; `l3-where`: `どこ` stays in the ordinary slot rather than moving to the front; `l3-location`: noun-location identification, not existence; `l3-polite-direction`: `こちら` can indicate a polite direction/person, not only a coordinate. | Existence verbs and existence-location `に`. |
| 4 | `l4-nonpast` and `l4-past`: one four-form `ます・ません・ました・ませんでした` grid, with nonpast covering routine and future; `l4-time-ni`: `に` marks a specific time point, not every time expression; `l4-bounds`: `から` and `まで` mark independent start/end boundaries. | Dictionary-form classification and all productive plain conjugation. |
| 5 | `l5-destination`: contrast goal `に` with directional `へ`; `l5-transport`: `で` marks means/context; `l5-companion`: `と` marks a co-participant; `l5-when`: `いつ` takes no `に` in the taught question. | Purpose `V-stem に行く`; particle stacking. |
| 6 | `l6-object`: `を` marks the directly affected object; `l6-action-place`: action-location `で` contrasts with destination `に`; `l6-invite`: negative question `ませんか` lowers pressure and is not literal refusal; `l6-suggest`: `ましょう` proposes shared action rather than merely predicting it. | `たい`, casual volitional, conditionals. |
| 7 | `l7-means`: unify tool/language/means under context `で`; `l7-give` and `l7-receive`: camera direction runs giver → receiver for `あげる` and receiver ← source for `もらう`; `l7-status`: `もう` presents completion and `まだ` presents non-completion in the taught replies. | Active `くれる` and favor constructions. |
| 8 | `l8-i-adjectives`: the final kana `い` is the conjugating part; `l8-na-adjectives`: `な` appears only in the noun-modifier slot and deceptive forms such as `きれい` are not い-adjectives; `l8-degree`: `あまり` pairs with negative predicates; `l8-what-kind`: `どんな` occupies the modifier slot before a noun. | Adjective past, productive adverb formation, relative clauses. |
| 9 | `l9-preference` and `l9-skill`: `好き・嫌い・上手・下手` describe states rather than English transitive actions; `l9-understand`: what is understood is marked with `が`; `l9-reason`: a reason clause plus `から` supports the following conclusion. | `ので`, explanatory `の`, extended discourse theory. |

For all 74 examples and 72 dialogue turns, replace romanized `reading` text with kana while keeping dialogue `japanese`, `english`, `id`, `speaker`, and `grammarIds` byte-for-byte equal to the Task 1 snapshot. No source-guide example may enter these files.

- [ ] **Step 4: Run exact range and characterization verification**

Run:

```powershell
pnpm.cmd test -- src/data/lessons/grammarRange01to09.test.ts src/data/lessons/contentIntegrity.test.ts src/data/grammarReferences.test.ts src/services/reconcileReviewCards.test.ts src/services/appStateStorage.test.ts
pnpm.cmd typecheck
```

Expected: all five test files PASS, the dialogue snapshot remains unchanged without `--update`, and TypeScript exits `0`.

- [ ] **Step 5: Commit**

```powershell
git add -- src/data/lessons/grammarEnrichmentTestUtils.ts src/data/lessons/grammarRange01to09.test.ts src/data/lessons/lesson01.ts src/data/lessons/lessons02to09.ts src/services/reconcileReviewCards.test.ts src/services/appStateStorage.test.ts
git commit -m "content: enrich grammar lessons 1 through 9"
```

Expected: one range-scoped commit with no snapshot update.

---

### Task 4: Enrich Lessons 10–17 and migrate their grammar/dialogue readings to kana

**Files:**
- Create: `src/data/lessons/grammarRange10to17.test.ts`
- Modify: `src/data/lessons/lessons10to17.ts` (32 points, 64 examples, 53 dialogue readings)

**Interfaces:**
- Consumes: `collectGrammarRangeErrors` from Task 3.
- Produces content: 32 populated `usageBoundary` values, exactly 64 original examples, and 117 kana readings (64 example readings plus 53 required dialogue readings).

- [ ] **Step 1: Write the failing exact-range test**

Create `src/data/lessons/grammarRange10to17.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { collectGrammarRangeErrors } from './grammarEnrichmentTestUtils';

describe('grammar enrichment for Lessons 10-17', () => {
  it('meets the frozen content and kana contract', () => {
    expect(collectGrammarRangeErrors({
      firstLesson: 10,
      lastLesson: 17,
      grammarPoints: 32,
      examples: 64,
      dialogueTurns: 53,
      dialogueByLesson: { 10: 6, 11: 6, 12: 6, 13: 6, 14: 7, 15: 7, 16: 7, 17: 8 },
    })).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
pnpm.cmd test -- src/data/lessons/grammarRange10to17.test.ts
```

Expected: FAIL with the first Lesson 10 missing-boundary and romanized-reading diagnostics; counts remain 32/64/53.

- [ ] **Step 3: Enrich every point and convert every reading in Lessons 10–17**

Keep IDs, positions, exactly two examples per point, and the characterized dialogue presentation unchanged. Apply this mandatory brief:

| Lesson | Point-specific Japanese-first insight and boundary that must appear | Material that must remain deferred |
|---|---|---|
| 10 | `l10-existence-verbs`: `あります` for inanimate conventional entities and `います` for animate movers; `l10-place-new-entity`: location `に` plus newly introduced `が`; `l10-known-location`: known topic `は` plus its existence location; `l10-position-words`: spatial expressions are nouns in `reference の position に`. | General plain-form presentation beyond a brief contrast. |
| 11 | `l11-counters`: classifier choice and required sound changes; `l11-duration`: bare duration differs from counted objects; `l11-frequency`: event count sits inside a stated time frame; `l11-quantity-questions`: choose a question word shaped for the counter/quantity. | Exhaustive counter and date systems. |
| 12 | `l12-i-adjective-past`: replace final `い` with `かった`; `l12-na-noun-past`: noun/な-adjective copular past is a different grid; `l12-yori-comparison`: `より` supplies the baseline, not the winner; `l12-choice-best`: `どちら` chooses a side and `いちばん` requires a stated comparison set. | Advanced comparison and advice constructions. |
| 13 | `l13-hoshii` and `l13-tai`: desire behaves adjectivally and directly reports the speaker's accessible perspective; `l13-purpose-movement`: destination particle and purpose `V-stem に` have separate jobs; `l13-indefinites`: question word + `か` creates an indefinite without making a whole question. | `欲しがる`, embedded questions, advanced volitional uses. |
| 14 | `l14-te-form`: a non-final connector whose following expression supplies force; `l14-request`: `てください` is a request, not a neutral conjunction; `l14-action-progress`: `ています` supplies current-action meaning; `l14-offer`: `ましょうか` offers the speaker's action rather than requesting the listener's. | Commands and later て-form branches. |
| 15 | `l15-permission`: `てもいい` evaluates acceptability; `l15-prohibition`: `てはいけない` rejects acceptability rather than forming a command verb; `l15-continuing-state`: `ています` may describe a continuing result; `l15-knowing`: use asymmetric `知っています` / `知りません`. | `てある`, `ておく`, `ていく`, `てくる`, contractions. |
| 16 | `l16-action-sequence`: only the final predicate carries tense; `l16-after-action`: `てから` marks completion before the next action; `l16-description-linking`: noun/な-adjective `で` contrasts with い-adjective `くて`; `l16-how-to`: distinguish condition `どう` from method `どうやって`. | Reasons, `のに`, `し`, `たり`. |
| 17 | `l17-nai-form`: exact Group 1/2/irregular formation; `l17-negative-request`: `ないでください` asks the listener not to act; `l17-obligation`: teach the double-negative expression as one compositional chunk; `l17-not-necessary`: `なくてもいい` grants acceptability without the action. | Casual obligation contractions and full conditional analysis. |

Convert all 64 example readings and 53 dialogue readings with the shared predicate. Keep each point lesson-safe and independently worded; no Lesson 18 dictionary-form analysis may leak backward except the minimum form label needed for Lesson 17 conjugation.

- [ ] **Step 4: Run exact range and characterization verification**

```powershell
pnpm.cmd test -- src/data/lessons/grammarRange10to17.test.ts src/data/lessons/contentIntegrity.test.ts src/data/grammarReferences.test.ts
pnpm.cmd typecheck
```

Expected: PASS with the dialogue snapshot unchanged and no TypeScript diagnostics.

- [ ] **Step 5: Commit**

```powershell
git add -- src/data/lessons/grammarRange10to17.test.ts src/data/lessons/lessons10to17.ts
git commit -m "content: enrich grammar lessons 10 through 17"
```

Expected: one range-scoped commit with no snapshot update.

---

### Task 5: Enrich Lessons 18–25 and migrate their grammar/dialogue readings to kana

**Files:**
- Create: `src/data/lessons/grammarRange18to25.test.ts`
- Modify: `src/data/lessons/lessons18to25.ts` (32 points, 64 examples, 48 dialogue readings)

**Interfaces:**
- Consumes: `collectGrammarRangeErrors` from Task 3.
- Produces content: 32 populated `usageBoundary` values, exactly 64 original examples, and 112 kana readings (64 example readings plus 48 required dialogue readings).

- [ ] **Step 1: Write the failing exact-range test**

Create `src/data/lessons/grammarRange18to25.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { collectGrammarRangeErrors } from './grammarEnrichmentTestUtils';

describe('grammar enrichment for Lessons 18-25', () => {
  it('meets the frozen content and kana contract', () => {
    expect(collectGrammarRangeErrors({
      firstLesson: 18,
      lastLesson: 25,
      grammarPoints: 32,
      examples: 64,
      dialogueTurns: 48,
      dialogueByLesson: { 18: 6, 19: 6, 20: 6, 21: 6, 22: 6, 23: 6, 24: 6, 25: 6 },
    })).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```powershell
pnpm.cmd test -- src/data/lessons/grammarRange18to25.test.ts
```

Expected: FAIL with Lesson 18 missing-boundary and romanized-reading diagnostics; exported counts remain 32/64/48.

- [ ] **Step 3: Enrich every point and convert every reading in Lessons 18–25**

Do not reorder the source objects in `lessons18to25.ts`; the file currently declares 18, 22, 23, 19, 20, 21, 24, 25 and the exported `lessons` array supplies the required numeric order. Apply this mandatory brief:

| Lesson | Point-specific Japanese-first insight and boundary that must appear | Material that must remain deferred |
|---|---|---|
| 18 | `l18-dictionary-form`: connector-ready nonpast base, not inherently rude; `l18-ability`: package the action with `こと` before stating possibility; `l18-hobby`: `こと` nominalizes the activity rather than behaving like English “-ing”; `l18-before`: the nonpast viewpoint before `まえに` does not copy the final sentence tense. | Productive potential conjugation, particle alternation with potential, `見える`/`聞こえる`. |
| 19 | `l19-ta-form`: distinguish the conjugated form from the connectors that use it; `l19-experience`: `Vたこと` presents a past event as an experience whose existence is asserted; `l19-representative-actions`: `たり` gives non-exhaustive representatives and tense stays on final `します`; `l19-change`: `なります` reports movement into a state. | Deliberate change with `する`; acquired ability with `ようになる`. |
| 20 | `l20-plain-verbs` and `l20-plain-descriptions`: exact four-way positive/negative × nonpast/past grids; `l20-casual-questions`: context and intonation can form a question without polite `か`; `l20-final-particles`: `よ` presents information and `ね` seeks shared alignment, while context permits omission. | Question-ending explanatory `の`; broad slang inventory. |
| 21 | `l21-think`: interpreted quotation requires the plain clause before `と思います`; `l21-say`: distinguish direct quoted wording from interpreted content; `l21-probability`: `でしょう` conveys calibrated probability/confirmation with register awareness; `l21-topic-about`: `について` marks an information topic, not a physical location. | Casual quotation `って`; formal reporting outside beginner scope. |
| 22 | `l22-relative-clause`: find the head noun after the clause; `l22-inner-subject`: use `が` for the inner participant; `l22-tense-negative`: tense and polarity live inside the modifier, and copular `だ` cannot remain directly before the head noun; `l22-time-for-action`: the action precedes the time noun it modifies. | Advanced nominalization and nested-clause production. |
| 23 | `l23-when-forms`: treat `とき` as a modified time noun; `l23-timing-viewpoint`: `Vる` views the action as not complete at the reference time while `Vた` views it as complete; `l23-automatic-to`: `と` presents an automatic/regular result and does not take the taught intentional request/command result; `l23-path-particle`: route `を` marks space traversed, not a direct object. | Productive `たら` until Lesson 25; `なら` and `ば`. |
| 24 | `l24-te-ageru`: giver-oriented favor with caution around self-benefiting tone; `l24-te-morau`: recipient arranges/receives a favor and source may be `に` or `から`; `l24-te-kureru`: benefactor performs an action toward the speaker's in-group; `l24-viewpoint`: choose the construction from the beneficiary camera, especially in requests. | Low-register `やる` as required output. |
| 25 | `l25-tara-condition`: completed form + `ら` supplies a condition and can license intentional results; `l25-after-tara`: discovery/next event follows completed viewpoint; `l25-even-if`: `ても` keeps the result true despite the condition; `l25-moshi`: marks uncertainty but does not create the conditional by itself. Mention Lesson 23 `と` only as a brief non-productive contrast. | Productive `なら`/`ば`; a full four-conditional grid. |

Convert all 64 example readings and 48 dialogue readings to kana. Retain exactly four points and six turns in each lesson and the existing numeric order at the exported API boundary.

- [ ] **Step 4: Run all three range gates together**

```powershell
pnpm.cmd test -- src/data/lessons/grammarRange01to09.test.ts src/data/lessons/grammarRange10to17.test.ts src/data/lessons/grammarRange18to25.test.ts src/data/lessons/contentIntegrity.test.ts src/data/grammarReferences.test.ts
pnpm.cmd typecheck
```

Expected: all five test files PASS, totals are 101 points/202 examples/173 turns, the dialogue snapshot remains unchanged, and TypeScript exits `0`.

- [ ] **Step 5: Commit**

```powershell
git add -- src/data/lessons/grammarRange18to25.test.ts src/data/lessons/lessons18to25.ts
git commit -m "content: enrich grammar lessons 18 through 25"
```

Expected: one range-scoped commit with no snapshot update.

---

### Task 6: Make `usageBoundary` required and lock the complete 25/101/202/173 contract

**Files:**
- Modify: `src/models/content.ts` (`GrammarPoint.usageBoundary` becomes required)
- Modify: `src/data/lessons/contentIntegrity.test.ts` (final type and runtime contract)

**Interfaces:**
- Consumes: all three populated content ranges, `GRAMMAR_IDS_BY_LESSON`, `FROZEN_GRAMMAR_IDS`, the JSON manifest wrapper, and shared kana predicates.
- Produces: final `GrammarPoint.usageBoundary: string`; no optional or fallback form remains.

- [ ] **Step 1: Add the failing type-level assertion and final runtime assertions**

Add `expectTypeOf` to the existing Vitest import and import `GrammarPoint`, the inventory constants, manifest lookup, and shared predicates. Append these tests to `src/data/lessons/contentIntegrity.test.ts`:

```ts
import { describe, expect, expectTypeOf, it } from 'vitest';

import type { GrammarPoint } from '../../models/content';
import { containsHan, containsLatinLetters, isKanaReading } from '../../services/vocabularyText';
import { getGrammarReferences } from '../grammarReferences';
import { GRAMMAR_IDS_BY_LESSON, FROZEN_GRAMMAR_IDS } from './grammarInventory';

it('requires usageBoundary in the GrammarPoint type', () => {
  expectTypeOf<GrammarPoint>().toMatchTypeOf<{ usageBoundary: string }>();
});

it('locks the complete enriched grammar inventory and readings', () => {
  expect(lessons).toHaveLength(25);
  expect(lessons.map(({ number }) => number)).toEqual(
    Array.from({ length: 25 }, (_, index) => index + 1),
  );
  expect(lessons.map((lesson) => lesson.grammar.map(({ id }) => id))).toEqual(
    GRAMMAR_IDS_BY_LESSON,
  );

  const points = lessons.flatMap(({ grammar }) => grammar);
  const examples = points.flatMap(({ examples: pointExamples }) => pointExamples);
  const dialogue = lessons.flatMap(({ dialogue: turns }) => turns);
  expect(points.map(({ id }) => id)).toEqual(FROZEN_GRAMMAR_IDS);
  expect(points).toHaveLength(101);
  expect(examples).toHaveLength(202);
  expect(dialogue).toHaveLength(173);

  for (const point of points) {
    expect(point.explanation.trim().length).toBeGreaterThan(40);
    expect(point.whyItWorks.trim().length).toBeGreaterThan(40);
    expect(point.usageBoundary.trim().length).toBeGreaterThan(20);
    expect(point.examples).toHaveLength(2);
    const references = getGrammarReferences(point.id);
    if (references.length) expect(point.furtherReading).toEqual(references);
    else expect(point).not.toHaveProperty('furtherReading');
    if (point.commonMistake) {
      expect(point.commonMistake.avoid.trim()).not.toBe('');
      expect(point.commonMistake.prefer.trim()).not.toBe('');
      expect(point.commonMistake.reason.trim()).not.toBe('');
    }
    for (const example of point.examples) {
      expect(example.japanese.trim()).not.toBe('');
      expect(example.english.trim()).not.toBe('');
      if (containsHan(example.japanese)) expect(example.reading?.trim()).toBeTruthy();
      if (example.reading) {
        expect(isKanaReading(example.reading)).toBe(true);
        expect(containsLatinLetters(example.reading)).toBe(false);
      }
    }
  }

  for (const lesson of lessons) {
    expect(lesson.grammar.some(({ whyItWorks }) => whyItWorks.trim().length > 40)).toBe(true);
    const sameLessonGrammarIds = new Set(lesson.grammar.map(({ id }) => id));
    for (const turn of lesson.dialogue) {
      expect(isKanaReading(turn.reading)).toBe(true);
      expect(containsLatinLetters(turn.reading)).toBe(false);
      for (const grammarId of turn.grammarIds ?? []) {
        expect(sameLessonGrammarIds.has(grammarId)).toBe(true);
      }
    }
  }
});
```

Merge imports rather than leaving duplicate import declarations.

- [ ] **Step 2: Run TypeScript to verify the contract fails while the field is optional**

```powershell
pnpm.cmd typecheck
```

Expected: FAIL on the `expectTypeOf<GrammarPoint>().toMatchTypeOf<{ usageBoundary: string }>()` assertion because `usageBoundary` is still optional.

- [ ] **Step 3: Make the final model contract required**

In `src/models/content.ts`, replace only the transitional line and remove its transition comment:

```ts
export interface GrammarPoint {
  id: string;
  title: string;
  pattern: string;
  plainEnglish: string;
  explanation: string;
  whyItWorks: string;
  usageBoundary: string;
  notes?: string[];
  examples: JapaneseExample[];
  furtherReading?: FurtherReading[];
  commonMistake?: {
    avoid: string;
    prefer: string;
    reason: string;
  };
}
```

- [ ] **Step 4: Run the final content contract and all range gates**

```powershell
pnpm.cmd typecheck
pnpm.cmd test -- src/data/grammarReferences.test.ts src/data/lessons/contentIntegrity.test.ts src/data/lessons/grammarRange01to09.test.ts src/data/lessons/grammarRange10to17.test.ts src/data/lessons/grammarRange18to25.test.ts
```

Expected: TypeScript exits `0`; all five test files PASS; totals remain exactly 25/101/202/173; no snapshot changes.

- [ ] **Step 5: Commit**

```powershell
git add -- src/models/content.ts src/data/lessons/contentIntegrity.test.ts
git commit -m "feat: require grammar usage boundaries"
```

Expected: one contract-only commit.

---

### Task 7: Make GrammarCard insight content collapsible, independent, and accessible

**Files:**
- Create: `src/components/grammarCardPresentation.ts`
- Create: `src/components/grammarCardPresentation.test.ts`
- Modify: `src/components/GrammarCard.tsx`

**Interfaces:**
- Consumes: final `GrammarPoint`, including required `usageBoundary` and optional `furtherReading`.
- Produces: `GrammarInsightState { expanded: boolean; focused: boolean }`, `createGrammarInsightState()`, `toggleGrammarInsight(state)`, `setGrammarInsightFocused(state, focused)`, and `projectGrammarInsight(point, state)`.
- UI contract: core title/pattern/plain-English/explanation/examples always visible; `whyItWorks`, `usageBoundary`, `notes`, and all links visible only when that card is expanded.

- [ ] **Step 1: Write the failing pure presentation-state tests**

Create `src/components/grammarCardPresentation.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import type { GrammarPoint } from '../models/content';
import {
  createGrammarInsightState,
  projectGrammarInsight,
  setGrammarInsightFocused,
  toggleGrammarInsight,
} from './grammarCardPresentation';

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
});
```

- [ ] **Step 2: Run the pure test to verify it fails**

```powershell
pnpm.cmd test -- src/components/grammarCardPresentation.test.ts
```

Expected: FAIL because `src/components/grammarCardPresentation.ts` does not exist.

- [ ] **Step 3: Implement the pure state and projection**

Create `src/components/grammarCardPresentation.ts`:

```ts
import type { GrammarPoint } from '../models/content';

export interface GrammarInsightState {
  expanded: boolean;
  focused: boolean;
}

export const createGrammarInsightState = (): GrammarInsightState => ({
  expanded: false,
  focused: false,
});

export const toggleGrammarInsight = (state: GrammarInsightState): GrammarInsightState => ({
  ...state,
  expanded: !state.expanded,
});

export const setGrammarInsightFocused = (
  state: GrammarInsightState,
  focused: boolean,
): GrammarInsightState => ({ ...state, focused });

export const projectGrammarInsight = (point: GrammarPoint, state: GrammarInsightState) => ({
  toggle: {
    accessibilityRole: 'button' as const,
    accessibilityLabel: `Japanese-first insight: ${point.title}`,
    accessibilityHint: state.expanded
      ? 'Collapses the Japanese-first insight, usage boundary, notes, and further reading.'
      : 'Expands the Japanese-first insight, usage boundary, notes, and further reading.',
    accessibilityState: { expanded: state.expanded },
    minimumTouchTarget: 44 as const,
  },
  content: state.expanded ? {
    whyItWorks: point.whyItWorks,
    usageBoundary: point.usageBoundary,
    notes: point.notes,
    furtherReading: point.furtherReading,
  } : null,
});
```

- [ ] **Step 4: Replace the always-open rationale in GrammarCard**

In `src/components/GrammarCard.tsx`, import `useState`, `Linking`, and `Pressable`, initialize one state per component instance, and replace the current `whyBox` plus the separately rendered notes with this structure. Keep the existing heading, plain-English badge, explanation, examples, and common-mistake region outside it:

```tsx
const [insightState, setInsightState] = useState(createGrammarInsightState);
const insight = projectGrammarInsight(point, insightState);

<Pressable
  accessibilityRole={insight.toggle.accessibilityRole}
  accessibilityLabel={insight.toggle.accessibilityLabel}
  accessibilityHint={insight.toggle.accessibilityHint}
  accessibilityState={insight.toggle.accessibilityState}
  onPress={() => setInsightState((current) => toggleGrammarInsight(current))}
  onFocus={() => setInsightState((current) => setGrammarInsightFocused(current, true))}
  onBlur={() => setInsightState((current) => setGrammarInsightFocused(current, false))}
  style={[
    styles.insightToggle,
    { minHeight: insight.toggle.minimumTouchTarget },
    insightState.focused && styles.insightToggleFocused,
  ]}
>
  <Text style={styles.insightToggleLabel}>Japanese-first insight</Text>
  <Text accessibilityElementsHidden importantForAccessibility="no" style={styles.insightChevron}>
    {insightState.expanded ? '−' : '+'}
  </Text>
</Pressable>

{insight.content ? (
  <View style={styles.whyBox}>
    <Text style={styles.whyText}>{insight.content.whyItWorks}</Text>
    <Text style={styles.boundaryLabel}>USAGE BOUNDARY</Text>
    <Text style={styles.whyText}>{insight.content.usageBoundary}</Text>
    {insight.content.notes?.map((note) => (
      <Text key={note} style={styles.note}>•  {note}</Text>
    ))}
    {insight.content.furtherReading?.map((reference) => (
      <Pressable
        key={reference.url}
        accessibilityRole="link"
        accessibilityLabel={`Further reading: ${reference.title}; opens an external site`}
        onPress={() => { void Linking.openURL(reference.url); }}
        style={styles.referenceLink}
      >
        <Text style={styles.referenceLinkText}>Further reading: {reference.title}</Text>
      </Pressable>
    ))}
  </View>
) : null}
```

Add these entries to the existing `StyleSheet.create` call, and remove the obsolete `whyLabel` entry together with the old always-visible label and notes loop:

```ts
insightToggle: {
  minHeight: 44,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.sm,
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: colors.line,
  backgroundColor: colors.surfaceStrong,
},
insightToggleFocused: { borderWidth: 2, borderColor: colors.coral },
insightToggleLabel: { color: colors.ink, fontSize: typography.small, fontWeight: '800' },
insightChevron: { color: colors.coral, fontSize: typography.heading, fontWeight: '800' },
boundaryLabel: { color: colors.inkMuted, fontSize: typography.micro, fontWeight: '900', letterSpacing: 1 },
referenceLink: { minHeight: 44, justifyContent: 'center', paddingVertical: spacing.sm },
referenceLinkText: {
  color: colors.forest,
  fontSize: typography.small,
  fontWeight: '700',
  textDecorationLine: 'underline',
},
```

- [ ] **Step 5: Run tests and TypeScript**

```powershell
pnpm.cmd test -- src/components/grammarCardPresentation.test.ts src/data/lessons/contentIntegrity.test.ts
pnpm.cmd typecheck
```

Expected: both test files PASS and TypeScript exits `0` without adding a renderer dependency.

- [ ] **Step 6: Commit**

```powershell
git add -- src/components/grammarCardPresentation.ts src/components/grammarCardPresentation.test.ts src/components/GrammarCard.tsx
git commit -m "feat: add collapsible grammar insights"
```

Expected: one presentation commit and no package or lockfile change.

---

### Task 8: Add exact reference attribution to Progress and README

**Files:**
- Create: `src/content/referenceInfluences.ts`
- Create: `src/content/referenceInfluences.test.ts`
- Modify: `src/screens/ProgressScreen.tsx` (reference card after the vocabulary backup card)
- Modify: `README.md` (`Reference influences` section)

**Interfaces:**
- Produces: `referenceInfluences` with immutable `heading`, `body`, `license`, `originality`, `nonEndorsement`, and two explicit links.
- UI links: official guide introduction and Saeris repository; neither link is used as a learner-point manifest entry.

- [ ] **Step 1: Write the failing exact-copy test**

Create `src/content/referenceInfluences.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { referenceInfluences } from './referenceInfluences';

describe('reference influences copy', () => {
  it('states source, license, independent authorship, and non-endorsement exactly', () => {
    expect(referenceInfluences).toEqual({
      heading: 'Reference influences',
      body: "Tae Kim's Guide to Japanese Grammar informed this course's Japanese-first coverage review.",
      license: 'The guide identifies its content as CC BY-NC-SA 3.0 US.',
      originality: "Nihongo Path's explanations, examples, dialogues, and exercises are independently written.",
      nonEndorsement: 'Neither Tae Kim nor the Saeris project endorses Nihongo Path.',
      links: [
        { title: "Tae Kim's Guide to Japanese Grammar", url: 'https://guidetojapanese.org/learn/grammar/' },
        { title: 'Saeris guide-to-japanese port', url: 'https://github.com/Saeris/guide-to-japanese' },
      ],
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```powershell
pnpm.cmd test -- src/content/referenceInfluences.test.ts
```

Expected: FAIL because `src/content/referenceInfluences.ts` does not exist.

- [ ] **Step 3: Implement the immutable attribution data**

Create `src/content/referenceInfluences.ts` with the exact object asserted above and end it with `as const`.

- [ ] **Step 4: Render the Progress reference card after Vocabulary backup**

In the vocabulary-enriched `src/screens/ProgressScreen.tsx`, import `Linking`, `Pressable`, and `referenceInfluences`. Add a card after the vocabulary backup card and before the study-principle card:

```tsx
<View style={styles.referenceCard}>
  <Text style={styles.referenceTitle}>{referenceInfluences.heading}</Text>
  <Text style={styles.referenceBody}>{referenceInfluences.body}</Text>
  <Text style={styles.referenceBody}>{referenceInfluences.license}</Text>
  <Text style={styles.referenceBody}>{referenceInfluences.originality}</Text>
  <Text style={styles.referenceBody}>{referenceInfluences.nonEndorsement}</Text>
  {referenceInfluences.links.map((link) => (
    <Pressable
      key={link.url}
      accessibilityRole="link"
      accessibilityLabel={`${link.title}; opens an external site`}
      onPress={() => { void Linking.openURL(link.url); }}
      style={styles.referenceAction}
    >
      <Text style={styles.referenceActionText}>{link.title}</Text>
    </Pressable>
  ))}
</View>
```

Give `referenceAction` `minHeight: 44`, visible focus/press styling consistent with the vocabulary backup actions, and wrapping text at iPhone width.

- [ ] **Step 5: Add the matching README section**

Insert after the existing originality paragraph in `README.md`:

```markdown
## Reference influences

[Tae Kim's Guide to Japanese Grammar](https://guidetojapanese.org/learn/grammar/) informed this course's Japanese-first coverage review. The guide identifies its content as CC BY-NC-SA 3.0 US.

The [Saeris guide-to-japanese port](https://github.com/Saeris/guide-to-japanese) was used as a structured review aid. Nihongo Path's explanations, examples, dialogues, and exercises are independently written. Neither Tae Kim nor the Saeris project endorses Nihongo Path. No source prose, examples, media, or website code is included.
```

- [ ] **Step 6: Verify exact copy, links, and build types**

```powershell
pnpm.cmd test -- src/content/referenceInfluences.test.ts
pnpm.cmd typecheck
rg -n --fixed-strings "CC BY-NC-SA 3.0 US" README.md src/content/referenceInfluences.ts
rg -n --fixed-strings "https://github.com/Saeris/guide-to-japanese" README.md src/content/referenceInfluences.ts
rg -n --fixed-strings "Neither Tae Kim nor the Saeris project endorses Nihongo Path." README.md src/content/referenceInfluences.ts
```

Expected: the test PASSes, TypeScript exits `0`, and each `rg` command reports both the README and the shared copy module.

- [ ] **Step 7: Commit**

```powershell
git add -- src/content/referenceInfluences.ts src/content/referenceInfluences.test.ts src/screens/ProgressScreen.tsx README.md
git commit -m "docs: add grammar reference attribution"
```

Expected: one attribution commit after the vocabulary Progress UI commit.

---

### Task 9: Complete originality, accuracy, and cross-range editorial review

**Files:**
- Modify: `docs/superpowers/reviews/2026-07-18-grammar-enrichment-review.md`

**Interfaces:**
- Consumes: all 101 final points, 202 examples, 173 unchanged dialogues, the approved lesson guardrails, the official guide pages, and the Saeris structured Markdown review aid.
- Produces: a checked implementation record; it does not alter content during review. Any discovered content defect is fixed and re-verified in its owning range commit before this review commit is made.

- [ ] **Step 1: Verify the final review sections are not yet present**

```powershell
if (Select-String -LiteralPath 'docs/superpowers/reviews/2026-07-18-grammar-enrichment-review.md' -Pattern '## Final editorial results' -Quiet) {
  throw 'Final editorial results were recorded before the review ran.'
}
```

Expected: the command returns silently.

- [ ] **Step 2: Review Lessons 1–9 point by point**

For each of the 37 IDs in `GRAMMAR_IDS_BY_LESSON.slice(0, 9)`, compare the final app record with the Task 3 brief, independent grammatical knowledge, and only its explicit manifest page(s). Confirm all 74 examples are natural, original, lesson-safe, and accurately translated; confirm all 72 dialogue readings are kana while the characterized non-reading dialogue snapshot is unchanged. Reject the range if a point imports a deferred topic, mirrors source organization, or uses an English-first shortcut that contradicts its `whyItWorks`.

- [ ] **Step 3: Review Lessons 10–17 point by point**

Apply the same five gates—accuracy, naturalness, prerequisite safety, originality, and English-speaker usefulness—to all 32 IDs, 64 examples, and 53 dialogues in Task 4. Pay special attention to counter readings, adjective-class past forms, desire perspective, て-form branches, `知っています`/`知りません`, final-predicate tense, and double-negative obligation.

- [ ] **Step 4: Review Lessons 18–25 point by point**

Apply the five gates to all 32 IDs, 64 examples, and 48 dialogues in Task 5. Pay special attention to form-versus-function distinctions, plain-form grids, quotation boundaries, relative-clause head nouns, `Vる`/`Vた とき`, automatic `と`, beneficiary viewpoint, and the narrow Lesson 25 conditional scope.

- [ ] **Step 5: Perform the cross-range terminology and originality pass**

Read the 101 `explanation`, `whyItWorks`, `usageBoundary`, `notes`, and `commonMistake` records in exported order. Confirm these terms build consistently and are not silently redefined: `topic/comment`, `head noun`, `particle role`, `polite`, `nonpast`, `い-adjective`, `な-adjective`, `verb stem`, `て-form connector`, `plain form`, `relative clause`, and `conditional`. Compare prose and examples against the relevant official/Saeris source sections and reject repeated distinctive wording, example scenarios, analogy sequence, table sequence, or paragraph sequence even when individual words differ.

- [ ] **Step 6: Record only completed PASS results**

Append this exact evidence after the reviewer has completed Steps 2–5 and corrected every defect:

```markdown
## Final editorial results

| Range | Grammar points | Examples | Dialogue turns | Accuracy | Naturalness | Prerequisite safety | Originality | English-speaker usefulness |
|---|---:|---:|---:|---|---|---|---|---|
| Lessons 1–9 | 37 | 74 | 72 | PASS | PASS | PASS | PASS | PASS |
| Lessons 10–17 | 32 | 64 | 53 | PASS | PASS | PASS | PASS | PASS |
| Lessons 18–25 | 32 | 64 | 48 | PASS | PASS | PASS | PASS | PASS |
| Total | 101 | 202 | 173 | PASS | PASS | PASS | PASS | PASS |

## Cross-range sign-off

- PASS: topic/comment, head noun, particle role, polite/nonpast, adjective classes, verb stems, て-form connector, plain forms, relative clauses, and conditionals build consistently.
- PASS: all lesson-specific deferrals in the approved mapping remain deferred.
- PASS: every explanation stands alone without network access.
- PASS: no source sentence, example, table, analogy, paragraph structure, heading sequence, media, or website code is reused or closely paraphrased.
- PASS: direct quotation is absent.
- PASS: the 101 grammar IDs, 202 examples, 173 dialogue turns, dialogue presentation snapshot, exercise IDs, and review schedules remain stable where required.
```

- [ ] **Step 7: Re-run content verification and commit the review record**

```powershell
pnpm.cmd test -- src/data/grammarReferences.test.ts src/data/lessons/contentIntegrity.test.ts src/data/lessons/grammarRange01to09.test.ts src/data/lessons/grammarRange10to17.test.ts src/data/lessons/grammarRange18to25.test.ts
pnpm.cmd typecheck
git add -- docs/superpowers/reviews/2026-07-18-grammar-enrichment-review.md
git commit -m "docs: record grammar editorial review"
```

Expected: all tests PASS, TypeScript exits `0`, and one review-only commit is created.

---

### Task 10: Document production, iPhone, offline, and V2-safe rollback operations

**Files:**
- Modify: `GITHUB_PAGES.md`

**Interfaces:**
- Produces: an operational runbook that preserves the vocabulary V2 foundation and device-local data.
- Rollback boundary: `grammar-enrichment-base-2026-07-18` is the completed V2 vocabulary commit. Never deploy any commit before that tag after production has written V2 state.

- [ ] **Step 1: Verify the V2-safe rollback section is absent**

```powershell
if (Select-String -LiteralPath 'GITHUB_PAGES.md' -Pattern 'Never roll production back to a pre-V2 build' -Quiet) {
  throw 'The rollout runbook was already edited.'
}
```

Expected: the command returns silently.

- [ ] **Step 2: Add the production and iPhone runbook**

Append this section to `GITHUB_PAGES.md`:

```markdown
## Grammar enrichment rollout and rollback

Before deployment, export a vocabulary backup from Progress on each device with device-local personal data. Do not remove the iPhone PWA or clear site data during an update; either action can remove device-local progress, vocabulary, and schedules.

Tag the completed vocabulary V2 foundation as `grammar-enrichment-base-2026-07-18`. Run the complete clean verification gate, push the tag, then push the reviewed vocabulary-plus-grammar commits to `main`. Wait for the GitHub Pages workflow to finish successfully before opening the production URL.

On Windows, open the production URL online and verify Lesson 1 and Lesson 25 grammar cards, independent collapsed insight toggles, current review-card text, Progress attribution, and external links. Export a vocabulary backup, cancel and repeat the picker once, and confirm device-local words and hidden state survived the update. Then disable network access, reload the already-loaded PWA, and verify every in-app explanation, expanded insight, personal word, and vocabulary manager remains available; external links may be unavailable offline.

On iPhone, launch the installed PWA online without uninstalling it, leave it open long enough to receive the new deployment, close it fully, and reopen it. Verify portrait/landscape/notch safe areas, readable line lengths, 44-pixel controls, VoiceOver labels and expanded state, keyboard focus when a hardware keyboard is available, and independent grammar-card expansion. Use the Japanese keyboard in lesson search and the word editor; composition must not filter, submit, or show a duplicate before it ends. Transfer the Windows JSON through Files, select that same file twice, import it, and confirm personal/custom/hidden words plus their schedules. Verify Web Share when `canShare({ files })` succeeds, and confirm cancelling share/pick is not reported as an error. Review one existing grammar card and one affected vocabulary card, confirming history is preserved and import-recovery invalidation follows the documented affected-card rule. Reopen once in airplane mode and verify core grammar content, imported vocabulary, and the manager remain available.

Never roll production back to a pre-V2 build after production has written V2 state. A pre-V2 deployment can diverge from the V2 envelope and device-owned vocabulary. For a grammar content or presentation defect, revert only commits after `grammar-enrichment-base-2026-07-18` and redeploy the still-V2-compatible result. For any persistence or hydration defect, stop rollout and fix forward on the V2 foundation. A rollback must never delete the V2 key, rewrite the untouched V1 fallback, clear browser storage, uninstall the PWA, or discard a user's backup.
```

- [ ] **Step 3: Verify the safety language and commit**

```powershell
rg -n --fixed-strings 'Never roll production back to a pre-V2 build' GITHUB_PAGES.md
rg -n --fixed-strings 'grammar-enrichment-base-2026-07-18' GITHUB_PAGES.md
rg -n --fixed-strings 'Do not remove the iPhone PWA or clear site data' GITHUB_PAGES.md
git add -- GITHUB_PAGES.md
git commit -m "docs: add V2-safe grammar rollout runbook"
```

Expected: all three searches match and one runbook-only commit is created.

---

## Final clean verification, live acceptance, rollout, and rollback gate

This is an execution gate, not another implementation task. Make no source change and create no commit unless a failing check requires a fix in its owning task.

- [ ] **Clean working tree and dependency integrity**

```powershell
git status --short
pnpm.cmd install --frozen-lockfile
git diff --exit-code -- package.json pnpm-lock.yaml
```

Expected: `git status --short` prints nothing before install; installation exits `0`; package and lockfile diff is empty.

- [ ] **Complete automated verification**

```powershell
pnpm.cmd typecheck
pnpm.cmd test
$env:EXPO_BASE_URL = '/Japanese-Language-App'
try {
  pnpm.cmd export:web
} finally {
  Remove-Item Env:EXPO_BASE_URL -ErrorAction SilentlyContinue
}
if (-not (Test-Path -LiteralPath 'dist/index.html')) { throw 'Production export did not create dist/index.html.' }
pnpm.cmd audit:public -- --tracked --dist dist
if (Test-Path -LiteralPath '.local/vocabulary/personal-vocabulary-v1.json') {
  pnpm.cmd audit:public:local
}
git status --short
```

Expected: TypeScript exits `0`; the complete Vitest suite PASSes; Expo exports successfully; the vocabulary plan's public audit passes; the local private-canary audit also passes when its ignored input exists; `git status --short` remains empty because `dist` is ignored.

- [ ] **Manual responsive and accessibility acceptance before push**

Run the web app and test 390×844 and 430×932 responsive viewports plus keyboard navigation:

```powershell
pnpm.cmd web
```

Expected manual results:

- Every GrammarCard begins collapsed; opening card 1 does not open card 2.
- Title, pattern, plain-English summary, explanation, and both examples remain visible while collapsed and expanded.
- The toggle announces button role, `Japanese-first insight: <title>`, and correct expanded state; focus is visible and target height is at least 44 pixels.
- Expanded content contains the rationale, required usage boundary, notes, and every manifest link; points with empty manifest arrays render no further-reading link.
- External links announce that they open an external site. Core content remains usable after network is disabled.
- Progress shows the vocabulary backup card first, then Reference influences with both links and the exact license/originality/non-endorsement copy.
- Existing grammar review cards show current pattern, answer, and title while due date, interval, repetitions, ease, and last-review time remain unchanged.
- No horizontal clipping, unsafe-area collision, or unreadably long line appears at either iPhone viewport.

Stop the dev server with `Ctrl+C` after acceptance.

- [ ] **Push the V2 foundation tag and deploy the reviewed commits**

```powershell
git rev-parse grammar-enrichment-base-2026-07-18
git merge-base --is-ancestor grammar-enrichment-base-2026-07-18 HEAD
if ($LASTEXITCODE -ne 0) { throw 'Grammar HEAD does not descend from the V2 vocabulary foundation.' }
git push origin grammar-enrichment-base-2026-07-18
git push origin HEAD:main
$runId = gh run list --workflow deploy-pages.yml --limit 1 --json databaseId --jq '.[0].databaseId'
if (-not $runId) { throw 'No Pages workflow run was found.' }
gh run watch $runId --exit-status
```

Expected: the tag resolves, the ancestor check passes, pushes succeed, and the latest `Test and deploy Nihongo Path` run completes successfully.

- [ ] **Perform and record live Windows and iPhone acceptance**

Follow the exact Windows/iPhone sequence committed in `GITHUB_PAGES.md`. Confirm the installed iPhone PWA updates without uninstalling it; Japanese keyboard composition and safe areas work; the Windows backup imports twice from the same selected file; Web Share/cancellation behaves as specified; personal/custom/hidden words and schedules transfer; existing scheduled vocabulary and grammar cards retain history; online external links open; and already-loaded core explanations, vocabulary, and manager work in airplane mode. If any persistence result differs, stop and fix forward; do not deploy a pre-V2 commit.

After every live check passes, append dated device/browser results under `## Live production acceptance` in both `docs/superpowers/reviews/2026-07-18-vocabulary-import-acceptance.md` and `docs/superpowers/reviews/2026-07-18-grammar-enrichment-review.md`. Record only observed PASS results—no blank or prospective entries—then publish the evidence:

```powershell
git add -- docs/superpowers/reviews/2026-07-18-vocabulary-import-acceptance.md docs/superpowers/reviews/2026-07-18-grammar-enrichment-review.md
git commit -m "docs: record live PWA acceptance"
git push origin HEAD:main
$evidenceRunId = gh run list --workflow deploy-pages.yml --limit 1 --json databaseId --jq '.[0].databaseId'
if (-not $evidenceRunId) { throw 'No Pages workflow run was found for the evidence commit.' }
gh run watch $evidenceRunId --exit-status
```

Expected: both review files contain dated live PASS evidence, the docs-only commit is on `main`, and its Pages verification/deployment also succeeds.

- [ ] **Use only the V2-safe rollback path if a content/UI defect blocks production**

Identify only post-foundation commits and create a forward revert commit:

```powershell
$grammarBase = git rev-parse grammar-enrichment-base-2026-07-18
git log --oneline "$grammarBase..HEAD"
git revert --no-commit "$grammarBase..HEAD"
git commit -m "revert: roll back grammar enrichment"
pnpm.cmd typecheck
pnpm.cmd test
pnpm.cmd export:web
git push origin HEAD:main
$runId = gh run list --workflow deploy-pages.yml --limit 1 --json databaseId --jq '.[0].databaseId'
if (-not $runId) { throw 'No Pages workflow run was found.' }
gh run watch $runId --exit-status
```

Expected: vocabulary V2 files and storage keys remain present, grammar-only/UI/docs commits are reverted by a new commit, all verification passes, and Pages redeploys. Do not run this path for a persistence defect; fix that defect forward on V2.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-18-grammar-enrichment.md`. Two execution options:

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, with review between tasks and strict sequencing after the vocabulary plan.
2. **Inline Execution** — use `superpowers:executing-plans` in this session, executing in batches with review checkpoints.

Which approach?
