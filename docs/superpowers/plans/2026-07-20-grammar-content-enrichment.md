# Grammar Content Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich all 101 grammar points and every grammar-tagged dialogue line with original, self-contained teaching content informed by Tae Kim and Tofugu while preserving the 25-lesson sequence and all dormant study data.

**Architecture:** Extend the content model additively, populate the three existing lesson-range files independently, then tighten the fields from optional to required once every range is complete. Keep references in the existing manifest and core teaching prose in lesson data so no network connection is needed to learn.

**Tech Stack:** TypeScript 5.9, React Native content models, Vitest 3, existing grammar originality audit, JSON reference manifest.

## Global Constraints

- The curriculum remains exactly 25 ready lessons and 101 frozen grammar IDs in the existing order.
- Lessons 1–25 retain their present Minna-like sequence; no grammar target moves between lessons.
- Every explanation, formation note, contrast, deeper note, and dialogue annotation is newly written for Nihongo Path.
- Japanese examples and dialogue remain original; no source example is copied or lightly paraphrased.
- Core content contains Japanese, kana reading, and English only; no `romaji` field or Latin transliteration is added.
- Every grammar point ends with at least one formation equation and exactly one primary contrast.
- Every existing dialogue `grammarIds` entry receives exactly one same-lesson contextual note.
- Tofugu and Tae Kim are research inputs only; their links remain optional and separate from core teaching content.
- Do not expand a lesson into productive grammar intentionally deferred by `usageBoundary` or existing range tests.
- Vocabulary, exercises, review cards, progress, persistence keys, backup shape, and custom-word data are unchanged.
- No dependency or lockfile change is allowed.

---

## File structure

- Modify `src/models/content.ts`: additive teaching types, then final required fields.
- Modify `src/data/lessons/grammarEnrichmentTestUtils.ts`: reusable teaching and dialogue-note validation.
- Modify `src/data/lessons/grammarRange01to09.test.ts`: focused RED/GREEN contract for Lessons 1–9.
- Modify `src/data/lessons/grammarRange10to17.test.ts`: focused RED/GREEN contract for Lessons 10–17.
- Modify `src/data/lessons/grammarRange18to25.test.ts`: focused RED/GREEN contract for Lessons 18–25.
- Modify `src/data/lessons/lesson01.ts`: Lesson 1 teaching fields and dialogue notes.
- Modify `src/data/lessons/lessons02to09.ts`: Lessons 2–9 teaching fields and dialogue notes.
- Modify `src/data/lessons/lessons10to17.ts`: Lessons 10–17 teaching fields and dialogue notes.
- Modify `src/data/lessons/lessons18to25.ts`: Lessons 18–25 teaching fields and dialogue notes.
- Modify `src/data/grammarReferences.json`: add exact official Tofugu pages only where directly relevant.
- Modify `src/data/grammarReferences.test.ts`: allow and validate both research sources.
- Modify `src/content/referenceInfluences.ts`: name Tofugu as an editorial influence and preserve non-endorsement language.
- Modify `src/content/referenceInfluences.test.ts`: freeze the revised source/originality statement.
- Modify `scripts/grammar-originality-core.ts`: include all new authored fields in local and cross-corpus overlap checks.
- Modify `src/data/lessons/contentIntegrity.test.ts`: final required-field, annotation, kana, URL-separation, and count contracts.
- Modify `src/components/grammarCardPresentation.test.ts`: keep its `GrammarPoint` fixture type-correct after fields become required.

---

### Task 1: Add the staged teaching-content model and validation helpers

**Files:**
- Modify: `src/models/content.ts`
- Modify: `src/data/lessons/grammarEnrichmentTestUtils.ts`
- Test: `src/data/lessons/grammarRange01to09.test.ts`

**Interfaces:**
- Produces: `GrammarFormation`, `GrammarContrast`, `DialogueGrammarNote`.
- Produces staged optional `GrammarPoint.formation`, `GrammarPoint.contrast`, `GrammarPoint.beyondBasics`, and `DialogueTurn.grammarNotes` so ranges can be authored independently before Task 6 makes the first two fields required.
- Produces `collectGrammarTeachingErrors(expectation): string[]`, incorporated by `collectGrammarRangeErrors`.

- [ ] **Step 1: Add a failing model and validator contract**

Extend the Lesson 1 range test with a mutation test that expects these exact diagnostics:

```ts
it('requires formation, contrast, and one contextual note per tagged dialogue use', () => {
  const point = lessons[0]!.grammar[0]!;
  const turn = lessons[0]!.dialogue.find(({ grammarIds }) => grammarIds?.includes(point.id))!;
  const formation = point.formation;
  const contrast = point.contrast;
  const grammarNotes = turn.grammarNotes;

  try {
    point.formation = [];
    point.contrast = undefined;
    turn.grammarNotes = [];
    const errors = collectGrammarRangeErrors(rangeExpectation);
    expect(errors).toContain(`${point.id}: formation is missing`);
    expect(errors).toContain(`${point.id}: contrast is missing`);
    expect(errors).toContain(`${turn.id}: needs one note for ${point.id}`);
  } finally {
    point.formation = formation;
    point.contrast = contrast;
    turn.grammarNotes = grammarNotes;
  }
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
pnpm.cmd test -- src/data/lessons/grammarRange01to09.test.ts
```

Expected: FAIL because the new fields and validation do not exist.

- [ ] **Step 3: Add staged model types**

Add before `GrammarPoint` in `src/models/content.ts`:

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
```

Add these staged fields to `GrammarPoint`:

```ts
  formation?: GrammarFormation[];
  contrast?: GrammarContrast;
  beyondBasics?: string[];
```

Add before `DialogueTurn` and then to `DialogueTurn`:

```ts
export interface DialogueGrammarNote {
  grammarId: string;
  explanation: string;
}

// inside DialogueTurn
  grammarNotes?: DialogueGrammarNote[];
```

- [ ] **Step 4: Extend `collectGrammarRangeErrors` with exact teaching checks**

For every grammar point, report:

```ts
if (!point.formation?.length) {
  errors.push(`${point.id}: formation is missing`);
} else {
  point.formation.forEach((step, index) => {
    if (![step.label, step.formula, step.explanation].every(nonEmpty)) {
      errors.push(`${point.id}: formation ${index + 1} is incomplete`);
    }
  });
}
if (!point.contrast || ![point.contrast.with, point.contrast.explanation].every(nonEmpty)) {
  errors.push(`${point.id}: contrast is missing`);
}
if (point.beyondBasics?.some((note) => !nonEmpty(note))) {
  errors.push(`${point.id}: beyondBasics contains an empty note`);
}
```

For every dialogue turn, compare the exact multiplicity of `grammarIds` and `grammarNotes`, reject foreign IDs, empty explanations, and URL-shaped text:

```ts
const notes = turn.grammarNotes ?? [];
for (const grammarId of turn.grammarIds ?? []) {
  if (notes.filter((note) => note.grammarId === grammarId).length !== 1) {
    errors.push(`${turn.id}: needs one note for ${grammarId}`);
  }
}
for (const note of notes) {
  if (!grammarIds.has(note.grammarId)) errors.push(`${turn.id}: unresolved note ID ${note.grammarId}`);
  if (!nonEmpty(note.explanation)) errors.push(`${turn.id}: empty note for ${note.grammarId}`);
  if (/https?:\/\//i.test(note.explanation)) errors.push(`${turn.id}: note contains a URL`);
}
```

- [ ] **Step 5: Verify the validator is RED against the current un-enriched range**

Run the focused test again. Expected: the mutation contract passes, while the frozen range contract fails with missing formation, contrast, and dialogue-note diagnostics. This intentional RED is the input to Task 2.

- [ ] **Step 6: Commit Task 1**

```powershell
git add -- src/models/content.ts src/data/lessons/grammarEnrichmentTestUtils.ts src/data/lessons/grammarRange01to09.test.ts
git commit -m "test: define grammar teaching content contract"
```

---

### Task 2: Enrich Lessons 1–9

**Files:**
- Modify: `src/data/lessons/lesson01.ts`
- Modify: `src/data/lessons/lessons02to09.ts`
- Test: `src/data/lessons/grammarRange01to09.test.ts`

**Interfaces:**
- Consumes the staged fields and validator from Task 1.
- Produces complete formation, contrast, optional deeper notes, and contextual dialogue notes for 37 grammar points and 72 dialogue turns.

- [ ] **Step 1: Freeze representative early-course teaching expectations**

Add assertions for these anchors so the range cannot pass with generic filler:

```ts
it('teaches early particles with distinct, progression-safe mental models', () => {
  const points = new Map(lessons.slice(0, 9).flatMap(({ grammar }) =>
    grammar.map((point) => [point.id, point] as const)));

  expect(points.get('l1-topic-copula')?.formation).toContainEqual({
    label: 'Polite noun sentence',
    formula: 'topic + は + identity/category + です',
    explanation: 'Choose what the conversation is about, then finish with the noun that identifies or classifies it.',
  });
  expect(points.get('l5-destination')?.contrast?.with).toBe('へ compared with に');
  expect(points.get('l6-object')?.contrast?.with).toBe('を compared with は');
  expect(points.get('l9-preference')?.contrast?.with).toBe('好きです compared with an English action verb');
});
```

- [ ] **Step 2: Run the range test and verify RED**

```powershell
pnpm.cmd test -- src/data/lessons/grammarRange01to09.test.ts
```

Expected: FAIL on missing teaching fields and the representative anchors.

- [ ] **Step 3: Author the 37 grammar enrichments**

Before editing each point, review its exact existing Tae Kim manifest entry and any directly corresponding official Tofugu grammar page. Extract only concepts to verify—formation, usage boundary, and likely confusion—then close the source and write from the app's lesson goal in new language. Do not adapt a source sentence, section sequence, or distinctive analogy.

For every grammar object in Lessons 1–9, add:

```ts
formation: [
  {
    label: 'A short learner-facing name',
    formula: 'Japanese attachment or transformation equation',
    explanation: 'One original sentence explaining how to construct the form.',
  },
],
contrast: {
  with: 'The closest taught or English-misleading alternative',
  explanation: 'An original, lesson-bounded distinction that tells the learner which form fits which intention.',
},
beyondBasics: [
  'Optional original nuance that deepens the current point without teaching a deferred productive form.',
],
```

Use multiple formation rows for conjugation grids or different word classes. Keep formulae compact, preserve every existing `whyItWorks` and `usageBoundary` progression limit, and omit `beyondBasics` when no safe nuance is useful.

- [ ] **Step 4: Author the Lessons 1–9 contextual dialogue notes**

For every tagged line, add exactly one entry per `grammarIds` item:

```ts
grammarNotes: [
  {
    grammarId: 'l1-topic-copula',
    explanation: 'Aki uses です to identify themself politely while the understood first-person topic stays unspoken.',
  },
]
```

Each note must mention something observable in that line—speaker intent, omitted context, contrast, viewpoint, politeness, or sequencing. Do not restate only the grammar title.

- [ ] **Step 5: Run the Lessons 1–9 range and originality tests**

```powershell
pnpm.cmd test -- src/data/lessons/grammarRange01to09.test.ts src/data/lessons/contentIntegrity.test.ts
```

Expected: the Lessons 1–9 range passes. The global integrity suite may still report missing staged fields in later ranges only if Task 6 checks have already landed; no Lessons 1–9 teaching error remains.

- [ ] **Step 6: Commit Task 2**

```powershell
git add -- src/data/lessons/lesson01.ts src/data/lessons/lessons02to09.ts src/data/lessons/grammarRange01to09.test.ts
git commit -m "content: deepen grammar lessons 1 through 9"
```

---

### Task 3: Enrich Lessons 10–17

**Files:**
- Modify: `src/data/lessons/lessons10to17.ts`
- Modify: `src/data/lessons/grammarRange10to17.test.ts`

**Interfaces:**
- Consumes the Task 1 staged schema.
- Produces complete teaching fields for 32 grammar points and contextual notes for 53 dialogue turns.

- [ ] **Step 1: Add representative middle-course assertions**

```ts
it('makes conjugation and state contrasts explicit', () => {
  const points = new Map(lessons.slice(9, 17).flatMap(({ grammar }) =>
    grammar.map((point) => [point.id, point] as const)));

  expect(points.get('l14-te-form')?.formation?.length).toBeGreaterThanOrEqual(4);
  expect(points.get('l15-continuing-state')?.contrast?.with).toBe('action in progress compared with a continuing state');
  expect(points.get('l17-obligation')?.formation?.some(({ formula }) => formula.includes('なければ'))).toBe(true);
});
```

- [ ] **Step 2: Run the range test and verify RED**

```powershell
pnpm.cmd test -- src/data/lessons/grammarRange10to17.test.ts
```

Expected: FAIL on missing teaching fields and the new anchors.

- [ ] **Step 3: Author all 32 grammar enrichments**

Before editing each point, review its exact existing Tae Kim manifest entry and any directly corresponding official Tofugu grammar page. Record only the concepts that need coverage, then write the app content independently without retaining source sentence structure or examples.

Add complete formation and contrast content to every grammar object. For て-form and ない-form algorithms, use separate rows for godan endings, ichidan verbs, and irregular verbs as already bounded by the lesson. For permission, prohibition, continuing states, obligation, and sequence patterns, explicitly contrast communicative intent rather than merely changing English translations.

Use the same exact object shape established in Task 2 and retain all existing examples, IDs, and lesson ordering.

- [ ] **Step 4: Author every tagged contextual dialogue note**

Add `grammarNotes` to each turn that already has `grammarIds`. Notes must explain the line's actual rule, state, request, permission, sequence, or viewpoint. A turn with two grammar IDs receives two separately useful explanations.

- [ ] **Step 5: Run the focused range tests**

```powershell
pnpm.cmd test -- src/data/lessons/grammarRange10to17.test.ts
```

Expected: PASS with 32 grammar points, 64 examples, and 53 unchanged dialogue turns.

- [ ] **Step 6: Commit Task 3**

```powershell
git add -- src/data/lessons/lessons10to17.ts src/data/lessons/grammarRange10to17.test.ts
git commit -m "content: deepen grammar lessons 10 through 17"
```

---

### Task 4: Enrich Lessons 18–25

**Files:**
- Modify: `src/data/lessons/lessons18to25.ts`
- Modify: `src/data/lessons/grammarRange18to25.test.ts`

**Interfaces:**
- Consumes the Task 1 staged schema.
- Produces complete teaching fields for 32 grammar points and contextual notes for 48 dialogue turns.

- [ ] **Step 1: Add representative late-course assertions**

```ts
it('distinguishes plain forms, clause modification, and conditional viewpoint', () => {
  const points = new Map(lessons.slice(17).flatMap(({ grammar }) =>
    grammar.map((point) => [point.id, point] as const)));

  expect(points.get('l20-plain-verbs')?.contrast?.with).toBe('plain form compared with polite ます form');
  expect(points.get('l22-relative-clause')?.formation?.some(({ formula }) => formula.endsWith('+ noun'))).toBe(true);
  expect(points.get('l23-automatic-to')?.contrast?.with).toBe('と compared with たら');
  expect(points.get('l25-tara-condition')?.contrast?.with).toBe('たら compared with automatic-result と');
});
```

- [ ] **Step 2: Run the range test and verify RED**

```powershell
pnpm.cmd test -- src/data/lessons/grammarRange18to25.test.ts
```

Expected: FAIL on missing teaching fields and new anchors.

- [ ] **Step 3: Author all 32 late-course enrichments**

Before editing each point, review its exact existing Tae Kim manifest entry and any directly corresponding official Tofugu grammar page. Use those pages to check coverage and edge cases only; compose every equation explanation, contrast, and deeper note from scratch for the existing lesson boundary.

Add formation equations and contrasts to every point. Keep the current receptive/productive boundaries around explanatory の, relative clauses, plain speech, quotation, と, たら, and ても. Contrasts may mention a later form only receptively when the existing `usageBoundary` already allows that comparison.

- [ ] **Step 4: Author every tagged contextual dialogue note**

Add one note per grammar ID, tied to the exact line's casual register, quotation scope, modifier relationship, viewpoint of giving/receiving, automatic consequence, condition, or unchanged result.

- [ ] **Step 5: Run the focused range tests**

```powershell
pnpm.cmd test -- src/data/lessons/grammarRange18to25.test.ts
```

Expected: PASS with 32 grammar points, 64 examples, and 48 unchanged dialogue turns.

- [ ] **Step 6: Commit Task 4**

```powershell
git add -- src/data/lessons/lessons18to25.ts src/data/lessons/grammarRange18to25.test.ts
git commit -m "content: deepen grammar lessons 18 through 25"
```

---

### Task 5: Add verified Tofugu reference coverage and attribution

**Files:**
- Modify: `src/data/grammarReferences.json`
- Modify: `src/data/grammarReferences.test.ts`
- Modify: `src/content/referenceInfluences.ts`
- Modify: `src/content/referenceInfluences.test.ts`

**Interfaces:**
- Consumes the frozen 101 grammar IDs and existing `FurtherReading` shape.
- Produces mixed Tae Kim and official Tofugu references without changing how references attach to grammar points.

- [ ] **Step 1: Write failing mixed-source reference tests**

Change the hostname/title validation to accept only these two exact combinations:

```ts
const allowedReference = (title: string, url: URL) =>
  (url.hostname === 'guidetojapanese.org' && title.startsWith("Tae Kim's Guide: "))
  || (url.hostname === 'www.tofugu.com' && title.startsWith('Tofugu: '));
```

Add anchor assertions:

```ts
expect(getGrammarReferences('l1-topic-copula').some(({ url }) =>
  url === 'https://www.tofugu.com/japanese-grammar/particle-wa/')).toBe(true);
expect(getGrammarReferences('l5-destination').some(({ url }) =>
  url === 'https://www.tofugu.com/japanese-grammar/particle-ni/')).toBe(true);
expect(getGrammarReferences('l14-te-form').some(({ url }) =>
  url === 'https://www.tofugu.com/japanese-grammar/te-form/')).toBe(true);
```

- [ ] **Step 2: Run the reference tests and verify RED**

```powershell
pnpm.cmd test -- src/data/grammarReferences.test.ts src/content/referenceInfluences.test.ts
```

Expected: FAIL because the manifest and attribution do not yet include Tofugu.

- [ ] **Step 3: Audit and add exact official Tofugu pages**

For each grammar ID with a direct Tofugu match, append a reference in this exact shape:

```json
{
  "title": "Tofugu: Particle は",
  "url": "https://www.tofugu.com/japanese-grammar/particle-wa/"
}
```

Use only `https://www.tofugu.com/japanese-grammar/<slug>/` pages verified to cover the point. Do not use search pages, paginated index URLs, learning-resource reviews, mirrors, or a vaguely adjacent article. Leave an ID with only Tae Kim when no exact Tofugu entry exists.

- [ ] **Step 4: Update the influence statement**

Set the copy to identify Tae Kim and Tofugu as coverage and teaching-approach references, state that all app content is independently written, and state non-endorsement by Tae Kim, Saeris, and Tofugu. Add the official Tofugu grammar-index link:

```ts
{
  title: 'Tofugu Japanese Grammar',
  url: 'https://www.tofugu.com/japanese-grammar/',
}
```

Do not claim that Tofugu content has been relicensed into the app.

- [ ] **Step 5: Verify links and tests**

```powershell
pnpm.cmd test -- src/data/grammarReferences.test.ts src/content/referenceInfluences.test.ts
pnpm.cmd verify:grammar-links
```

Expected: tests PASS; link verification reports no invalid or unreachable manifest URL. If the network verifier is unavailable, record that limitation and still require every static URL-shape test to pass.

- [ ] **Step 6: Commit Task 5**

```powershell
git add -- src/data/grammarReferences.json src/data/grammarReferences.test.ts src/content/referenceInfluences.ts src/content/referenceInfluences.test.ts
git commit -m "content: add optional Tofugu grammar references"
```

---

### Task 6: Make the enriched contract mandatory and extend originality checks

**Files:**
- Modify: `src/models/content.ts`
- Modify: `src/data/lessons/contentIntegrity.test.ts`
- Modify: `scripts/grammar-originality-core.ts`
- Modify: `src/components/grammarCardPresentation.test.ts`

**Interfaces:**
- Converts `GrammarPoint.formation` and `GrammarPoint.contrast` from optional to required.
- Produces final corpus-wide integrity and originality coverage for new prose and dialogue notes.

- [ ] **Step 1: Add final failing integrity assertions**

Add type and runtime contracts:

```ts
expectTypeOf<GrammarPoint>().toMatchTypeOf<{
  formation: GrammarFormation[];
  contrast: GrammarContrast;
}>();

expect(points).toHaveLength(101);
expect(points.every(({ formation }) => formation.length > 0)).toBe(true);
expect(points.every(({ contrast }) => contrast.with.trim() && contrast.explanation.trim())).toBe(true);
```

For each turn, assert exact one-to-one annotation coverage:

```ts
const ids = turn.grammarIds ?? [];
const notes = turn.grammarNotes ?? [];
expect(notes.map(({ grammarId }) => grammarId).sort()).toEqual([...ids].sort());
expect(notes.every(({ explanation }) => explanation.trim().length > 30)).toBe(true);
expect(notes.every(({ explanation }) => !/https?:\/\//i.test(explanation))).toBe(true);
```

- [ ] **Step 2: Extend originality field collection**

Include these fields in both `grammarProseFields` and `collectAppOriginalityFields`:

```ts
point.formation.flatMap(({ label, formula, explanation }) => [label, formula, explanation]);
[point.contrast.with, point.contrast.explanation];
point.beyondBasics ?? [];
turn.grammarNotes?.map(({ explanation }) => explanation) ?? [];
```

Assign stable field IDs such as `${point.id}.formation[0].explanation`, `${point.id}.contrast.explanation`, and `${turn.id}.grammarNotes[0].explanation`.

- [ ] **Step 3: Tighten the TypeScript model**

Change:

```ts
formation?: GrammarFormation[];
contrast?: GrammarContrast;
```

to:

```ts
formation: GrammarFormation[];
contrast: GrammarContrast;
```

Update the `GrammarPoint` fixture in `grammarCardPresentation.test.ts` with one complete formation row and one contrast. No production data may use a cast to bypass the required fields.

- [ ] **Step 4: Run all content, type, and local originality checks**

```powershell
pnpm.cmd typecheck
pnpm.cmd test -- src/data/lessons/grammarRange01to09.test.ts src/data/lessons/grammarRange10to17.test.ts src/data/lessons/grammarRange18to25.test.ts src/data/lessons/contentIntegrity.test.ts src/data/grammarReferences.test.ts
pnpm.cmd test
```

Expected: TypeScript and the complete Vitest suite PASS; counts remain 25 lessons, 101 grammar points, 202 grammar examples, 173 dialogue turns, 428 authored vocabulary records, and 8 exercises per lesson.

- [ ] **Step 5: Run the pinned Saeris originality audit**

Create or reuse the ignored, worktree-local checkout at `.local/reference-sources/guide-to-japanese`, then pin it to revision `7aa1ac10`:

```powershell
$saerisSource = Join-Path (Get-Location) '.local/reference-sources/guide-to-japanese'
if (-not (Test-Path -LiteralPath $saerisSource)) {
  git clone https://github.com/Saeris/guide-to-japanese.git $saerisSource
}
git -C $saerisSource fetch origin
git -C $saerisSource checkout --detach 7aa1ac10
pnpm.cmd audit:grammar-originality -- --source $saerisSource
```

Expected: `Cross-corpus overlap count: 0` and `Grammar originality audit PASS`. If the checkout cannot be found, locate it read-only or create a temporary pinned checkout with explicit network approval; do not skip or weaken the overlap threshold.

- [ ] **Step 6: Commit Task 6**

```powershell
git add -- src/models/content.ts src/data/lessons/contentIntegrity.test.ts scripts/grammar-originality-core.ts src/components/grammarCardPresentation.test.ts
git commit -m "test: require complete original grammar teaching content"
```

---

### Task 7: Content review gate

**Files:**
- Verify only; source changes occur only when a reviewer identifies a specific defect.

**Interfaces:**
- Consumes the complete Tasks 1–6 content diff.
- Produces a reviewed content baseline for the reader-interface plan.

- [ ] **Step 1: Check repository and dependency boundaries**

```powershell
git diff --check
git diff --exit-code -- package.json pnpm-lock.yaml
git status --short
```

Expected: no whitespace errors, no package changes, and only the pre-existing untracked `docs/superpowers/reviews/2026-07-18-vocabulary-import-acceptance.md` remains outside committed work.

- [ ] **Step 2: Request content and code review**

Use `superpowers:requesting-code-review` over the content-plan base through current HEAD. Reviewers must check Japanese accuracy, English clarity, lesson boundaries, source originality, one-to-one dialogue notes, and type/test design.

- [ ] **Step 3: Address every Critical or Important finding with RED/GREEN evidence**

For each accepted finding, first add or strengthen the focused range/integrity test, reproduce the failure, correct only the owning range, and rerun the focused plus full suite.

- [ ] **Step 4: Record the content gate**

Expected final evidence: TypeScript PASS, complete Vitest PASS, originality audit PASS, reference tests PASS, no dependency diff, and reviewer assessment `Ready to proceed: Yes`. Do not deploy yet; continue into the reader-interface plan.
