# Personal Vocabulary Import and Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a rights-safe, device-local vocabulary layer that deterministically prepares 1,289 private deck records, manages authored/personal/custom words, and preserves review history through one validated V2 state envelope and complete backup replacement.

**Architecture:** Keep the 428 authored words in the public lesson modules and resolve a non-mutating effective list from authored, personal-deck, custom, and hidden layers. A development-only importer reads `collection.anki21b`, while the shipped app validates the resulting JSON and commits every progress, review, vocabulary, import, and recovery transition through one serialized save-before-publish path under the V2 AsyncStorage key. A root stack and hydration barrier wrap the existing tabs; pure services own text predicates, list resolution, SRS reconciliation, backup validation, replacement, and browser file transfer so the current Vitest setup can exercise them without a React Native renderer.

**Tech Stack:** Expo 54.0.32, Expo Crypto at Expo SDK 54's compatible version, React 19.1.0, React Native 0.81.5, TypeScript 5.9 strict mode, Vitest 3.2.x (`^3.2.4`), React Navigation 7, AsyncStorage 2.2.0, Node 22 with `@types/node` 22.15.29, `tsx` 4.20.5, `yauzl` 3.4.0 with `@types/yauzl` 3.4.0, `fzstd` 0.1.1, `sql.js` 1.13.0, `@types/sql.js` 1.4.9, and `wanakana` 5.3.1.

## Global Constraints

- The public authored baseline remains exactly 25 lessons and 428 vocabulary items. Preserve every authored vocabulary ID, Japanese headword, English meaning, lesson placement, and order; change only `VocabularyItem.reading` in this plan.
- The baseline identifier is exactly `course-v1-25859789e2a3679f09b1ebe6a5f3e981c3c164bf0b8dec7537cd26a0bf933f03`. Its SHA-256 input is each lesson sorted by `lesson.id`, represented as `lessonId`, then ordered `(vocabularyId, NFKC-and-Unicode-whitespace-stripped Japanese headword)` values joined by U+001F, with lesson lines joined by LF.
- The source has 1,372 notes. Generation accepts exactly 1,289, skips exactly 82 authored same-lesson matches and one earlier-source match, and produces 1,717 effective words with the 428 authored words.
- Local verification has established one Lesson 10 source-internal normalized-headword duplicate. Numeric-source ordering must retain the lower source ID, skip the later record, and report one `earlier-personal-record` skip without committing either real source ID or headword.
- Exact accepted import counts are: L01 45, L02 42, L03 40, L04 55, L05 84, L06 89, L07 47, L08 89, L09 87, L10 68, L11 54, L12 63, L13 58, L14 70, L15 50, L16 85, L17 34, L18 30, L19 29, L20 22, L21 50, L22 37, L23 23, L24 20, L25 18.
- Exact raw source counts are: L01 47, L02 48, L03 50, L04 56, L05 90, L06 98, L07 54, L08 93, L09 95, L10 69, L11 58, L12 71, L13 63, L14 72, L15 52, L16 88, L17 35, L18 30, L19 30, L20 22, L21 53, L22 37, L23 23, L24 20, L25 18.
- The `.apkg`, `collection.anki2`, `collection.anki21b`, generated `.local/vocabulary/personal-vocabulary-v1.json`, romaji, audio, pictures, card templates, Anki scheduling data, and all 1,289 generated records remain private, ignored, untracked, and absent from `dist`.
- Importer libraries are dev dependencies and must not be imported by `App.tsx` or any file under `src/`. The only new runtime package is Expo-compatible `expo-crypto`, installed through `expo install` for `Crypto.randomUUID()` custom IDs.
- The importer reads only the real Zstandard-compressed `collection.anki21b`; finding only `collection.anki2` is a hard error.
- The exact storage keys are V1 `@nihongo-path/study-state/v1` and V2 `@nihongo-path/app-state/v2`. V1 is read-only after migration and is never removed or overwritten.
- Every successful mutation—start lesson, record exercise, rate review, add, edit, hide, restore, temporary undo, import, and persistent import undo—builds and validates a complete `PersistedAppStateV2`, performs one V2 `setItem`, then publishes React state. Concurrent mutations are serialized.
- A successful add, edit, hide, restore, import, temporary undo, or persistent import undo invalidates the prior import recovery. Rating a card invalidates recovery only when its ID is in `lastImportRecovery.affectedReviewCardIds`; unrelated ratings and lesson/exercise progress do not.
- Missing `ReviewCard.suspended` means `false`. Due queues, review counts, and Progress statistics exclude suspended cards. Parse vocabulary IDs by removing the exact leading `review-` string, never by splitting on hyphens.
- Import is replacement, not merge. Validate all bytes and records before committing; the file-size limit is exactly `5 * 1024 * 1024` bytes.
- Manager Active/Hidden results use `FlatList` or `SectionList`, stable keys, and memoized normalized search fields. Do not put a large mapped word list inside a scrolling `Screen`.
- Visible Edit, Hide, Restore, Add, save, cancel, import, export, and undo controls are at least 44 by 44 pixels, have roles/labels/hints, visible keyboard focus, and never depend on swipe, hover, or `Alert.alert`.
- During IME composition, draft text may render but cannot submit, apply search, or show duplicate validation. Commit search/editor validation only on composition end (web) or end-editing (native), and verify Japanese IME manually on Windows and iPhone.
- Vocabulary backup copy states that data is device-local and clearing site data or removing the PWA can remove it. Cloud accounts and automatic sync remain out of scope.
- Grammar/example/dialogue kana migration belongs to the separate grammar plan. Intermediate vocabulary commits may retain Latin in those non-vocabulary reading fields, but the combined public release may not.
- Use `pnpm.cmd` in PowerShell commands. Let pnpm update `pnpm-lock.yaml`; never hand-edit it. Make one local commit per task. Complete every automated and locally reproducible acceptance check before the combined push; the installed-iPhone update/share/offline checks necessarily run immediately after that deployment and are recorded in a follow-up evidence commit.

## File and Responsibility Map

- `.gitignore`: blocks source packages, extracted Anki databases, media, and private generated output.
- `package.json`, `pnpm-lock.yaml`: development-only importer/migration dependencies and verification commands.
- `src/data/authoredBaseline.ts`: canonical fingerprint input and exact baseline version.
- `src/test/fixtures/authored-vocabulary-v1.json`: frozen authored IDs, Japanese, readings, meanings, lessons, and order before kana migration.
- `src/test/fixtures/study-state-v1.json`: frozen current V1 save with all 25 lessons started and the original 428 vocabulary review cards.
- `scripts/freeze-vocabulary-v1.ts`: one-time, refusal-to-overwrite fixture generator.
- `scripts/migrate-vocabulary-readings-to-kana.ts`: AST-targeted migration of vocabulary readings only.
- `src/services/vocabularyText.ts`: shared NFKC comparison/search, Han/Latin detection, reading, and autofill predicates.
- `src/models/content.ts`, `src/models/review.ts`, `src/models/vocabulary.ts`, `src/models/appState.ts`: shared content, review, vocabulary-layer, backup-recovery, and V2 envelope contracts.
- `src/services/vocabularyResolver.ts`: effective/hidden lists, duplicate detection, stable sorting, and memoizable search records.
- `scripts/vocabulary/ankiPackage.ts`: APKG extraction, Zstd decompression, normalized SQLite row access, and diagnostics.
- `scripts/vocabulary/buildPersonalImport.ts`: deterministic deck-to-backup transformation and checksum summary.
- `scripts/vocabulary/importVocabulary.ts`, `scripts/vocabulary/verifyPersonalImport.ts`: local CLI generation and exact source verification.
- `scripts/vocabulary/fixtures/syntheticCollection.ts`, `scripts/vocabulary/importVocabulary.test.ts`: public, rights-safe synthetic importer coverage.
- `src/services/reconcileReviewCards.ts`: shared vocabulary and grammar presentation reconciliation with schedule preservation.
- `src/services/appStateValidation.ts`: strict V1/V2 runtime validation without coercion or partial defaults.
- `src/services/appStateStorage.ts`: V1/V2 hydration, one-time migration, verified write, and read-only V1 fallback.
- `src/state/appStateCommitter.ts`: queued, validated, one-write save-before-publish transitions.
- `src/services/vocabularyMutations.ts`: pure add/edit/hide/restore/temporary-undo V2 transitions.
- `src/services/vocabularyBackup.ts`: export, full validation, preview, exact replacement, recovery, and recovery invalidation.
- `src/state/StudyContext.tsx`: hydration state plus all asynchronous committed actions; no persistence effect.
- `src/components/HydrationGate.tsx`, `src/components/StorageErrorBanner.tsx`, `src/screens/StorageRecoveryScreen.tsx`: loading, invalid-data, and persistent-write-error surfaces above navigation.
- `src/navigation/types.ts`, `src/navigation/AppNavigator.tsx`: root stack above existing tabs and lesson-scoped vocabulary routes.
- `src/components/CompositionAwareTextInput.web.tsx`, `src/components/CompositionAwareTextInput.native.tsx`, `src/components/VocabularyFilePicker.web.tsx`, `src/components/VocabularyFilePicker.native.tsx`, `src/components/UndoSnackbar.tsx`: platform-safe IME, file-picking, and transient undo primitives.
- `src/screens/LessonDetailScreen.tsx`: effective count, virtualized word results, search, and Manage words route.
- `src/screens/VocabularyManagerScreen.tsx`, `src/screens/WordEditorScreen.tsx`, `src/screens/ImportPreviewScreen.tsx`: Active/Hidden management, add/edit, and replacement confirmation.
- `src/screens/ProgressScreen.tsx`: device-local backup card and active-review statistics.
- `src/screens/ReviewScreen.tsx`, `src/services/srs.ts`: suspended-card exclusion.
- `src/services/webFileTransferCore.ts`, `src/services/webFileTransfer.web.ts`, `src/services/webFileTransfer.native.ts`: pure transfer decisions and platform-safe browser/native adapters.
- `scripts/assert-public-artifact-safe.ts`: CI-safe tracked-path checks plus an explicitly optional local private-canary-versus-`dist` scan.
- `README.md`, `GITHUB_PAGES.md`, `docs/superpowers/reviews/2026-07-18-vocabulary-import-acceptance.md`: user copy and clean-export/manual evidence.

---

## Pre-execution characterization gate — run before Task 1, make no changes

Run:

```powershell
pnpm.cmd typecheck
pnpm.cmd test
pnpm.cmd export:web
git status --short
```

Expected: TypeScript exits `0`, all existing Vitest tests pass, Expo exports successfully to `dist`, and `git status --short` shows only changes already understood by the implementer. Task 1's generated frozen fixture and semantic fingerprint perform the exact 428-word check without relying on source-file syntax. Do not reset or overwrite unrelated work.

### Task 1: Fence private inputs and freeze the authored/V1 baseline

**Files:**
- Modify: `.gitignore`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml` (pnpm-generated only)
- Create: `src/data/authoredBaseline.ts`
- Create: `src/data/authoredBaseline.test.ts`
- Create: `scripts/freeze-vocabulary-v1.ts`
- Create: `src/test/fixtures/authored-vocabulary-v1.json` (generated once)
- Create: `src/test/fixtures/study-state-v1.json` (generated once)

**Interfaces:**
- Produces: `AUTHORED_BASELINE_FINGERPRINT`, `AUTHORED_BASELINE_VERSION`, `canonicalizeAuthoredVocabulary(lessons: readonly Lesson[]): string`.
- Produces: frozen JSON fixtures containing only the already-public 428 authored words and their V1 review cards; no deck-derived value enters either fixture.

- [ ] **Step 1: Install the exact development-only tools**

Run:

```powershell
pnpm.cmd add -D @types/node@22.15.29 tsx@4.20.5 yauzl@3.4.0 @types/yauzl@3.4.0 fzstd@0.1.1 sql.js@1.13.0 @types/sql.js@1.4.9 wanakana@5.3.1
pnpm.cmd exec expo install expo-crypto
```

Expected: pnpm and Expo update only `package.json` and `pnpm-lock.yaml`; both commands exit `0`, and Expo selects its SDK 54-compatible `expo-crypto` version.

- [ ] **Step 2: Write the failing baseline tests**

Create `src/data/authoredBaseline.test.ts`:

```ts
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { lessons } from './lessons';
import {
  AUTHORED_BASELINE_FINGERPRINT,
  AUTHORED_BASELINE_VERSION,
  canonicalizeAuthoredVocabulary,
} from './authoredBaseline';

const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

describe('authored vocabulary baseline', () => {
  it('freezes 428 words with the reviewed semantic fingerprint', () => {
    expect(lessons.flatMap((lesson) => lesson.vocabulary)).toHaveLength(428);
    expect(sha256(canonicalizeAuthoredVocabulary(lessons))).toBe(AUTHORED_BASELINE_FINGERPRINT);
    expect(AUTHORED_BASELINE_VERSION).toBe(
      'course-v1-25859789e2a3679f09b1ebe6a5f3e981c3c164bf0b8dec7537cd26a0bf933f03',
    );
  });

  it('changes the fingerprint when a headword changes without an ID change', () => {
    const changed = lessons.map((lesson, lessonIndex) => ({
      ...lesson,
      vocabulary: lesson.vocabulary.map((word, wordIndex) =>
        lessonIndex === 0 && wordIndex === 0 ? { ...word, japanese: `${word.japanese}別` } : word,
      ),
    }));
    expect(sha256(canonicalizeAuthoredVocabulary(changed))).not.toBe(AUTHORED_BASELINE_FINGERPRINT);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run:

```powershell
pnpm.cmd exec vitest run src/data/authoredBaseline.test.ts
```

Expected: FAIL because `src/data/authoredBaseline.ts` does not exist.

- [ ] **Step 4: Implement the exact canonicalization and safety ignores**

Create `src/data/authoredBaseline.ts`:

```ts
import { Lesson } from '../models/content';

export const AUTHORED_BASELINE_FINGERPRINT =
  '25859789e2a3679f09b1ebe6a5f3e981c3c164bf0b8dec7537cd26a0bf933f03' as const;
export const AUTHORED_BASELINE_VERSION =
  `course-v1-${AUTHORED_BASELINE_FINGERPRINT}` as const;

const normalizeHeadword = (value: string) =>
  value.normalize('NFKC').replace(/\p{White_Space}/gu, '');

export const canonicalizeAuthoredVocabulary = (sourceLessons: readonly Lesson[]): string =>
  [...sourceLessons]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((lesson) =>
      [
        lesson.id,
        ...lesson.vocabulary.flatMap((word) => [word.id, normalizeHeadword(word.japanese)]),
      ].join('\u001f'),
    )
    .join('\n');
```

Append these exact rules to `.gitignore`:

```gitignore
# Private Anki preparation inputs and generated personal vocabulary
*.apkg
*.anki2
*.anki21b
local-source/
.local/
*.personal-vocabulary.json
```

- [ ] **Step 5: Add and run the refusal-to-overwrite V1 fixture freezer**

Create `scripts/freeze-vocabulary-v1.ts`:

```ts
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { lessons } from '../src/data/lessons';

const authoredPath = resolve('src/test/fixtures/authored-vocabulary-v1.json');
const studyPath = resolve('src/test/fixtures/study-state-v1.json');
if (existsSync(authoredPath) || existsSync(studyPath)) {
  throw new Error('V1 fixtures already exist; refusing to overwrite frozen migration evidence.');
}

const frozenAt = '2026-07-18T00:00:00.000Z';
const authored = lessons.flatMap((lesson) =>
  lesson.vocabulary.map((word, index) => ({
    lessonId: lesson.id,
    authoredIndex: index,
    id: word.id,
    japanese: word.japanese,
    reading: word.reading,
    english: word.english,
    partOfSpeech: word.partOfSpeech,
  })),
);
const progress = Object.fromEntries(
  lessons.map((lesson) => [
    lesson.id,
    {
      lessonId: lesson.id,
      started: true,
      completedExerciseIds: [],
      correctAnswers: 0,
      attempts: 0,
    },
  ]),
);
const reviewCards = Object.fromEntries(
  authored.map((word, index) => [
    `review-${word.id}`,
    {
      id: `review-${word.id}`,
      lessonId: word.lessonId,
      kind: 'vocabulary',
      prompt: word.japanese,
      answer: word.english,
      supportingText: `${word.reading} · ${word.partOfSpeech}`,
      dueAt: frozenAt,
      intervalDays: index % 7,
      repetitions: index % 4,
      ease: 2.5,
      ...(index % 3 === 0 ? { lastReviewedAt: frozenAt } : {}),
    },
  ]),
);
reviewCards['review-l1-topic-copula'] = {
  id: 'review-l1-topic-copula',
  lessonId: 'lesson-01',
  kind: 'grammar',
  prompt: 'STALE V1 GRAMMAR PROMPT',
  answer: 'STALE V1 GRAMMAR ANSWER',
  supportingText: 'STALE V1 GRAMMAR SUPPORT',
  dueAt: '2026-07-25T00:00:00.000Z',
  intervalDays: 7,
  repetitions: 3,
  ease: 2.35,
  lastReviewedAt: frozenAt,
};

await mkdir(dirname(authoredPath), { recursive: true });
await writeFile(authoredPath, `${JSON.stringify(authored, null, 2)}\n`, 'utf8');
await writeFile(studyPath, `${JSON.stringify({ progress, reviewCards }, null, 2)}\n`, 'utf8');
console.log(`Frozen ${authored.length} authored words, ${authored.length} vocabulary cards, and one stale grammar card.`);
```

Run:

```powershell
pnpm.cmd exec tsx scripts/freeze-vocabulary-v1.ts
$authored = Get-Content -Raw -Encoding utf8 'src/test/fixtures/authored-vocabulary-v1.json' | ConvertFrom-Json
$v1 = Get-Content -Raw -Encoding utf8 'src/test/fixtures/study-state-v1.json' | ConvertFrom-Json
if ($authored.Count -ne 428) { throw 'Authored fixture must contain 428 rows.' }
if ($v1.reviewCards.PSObject.Properties.Count -ne 429) { throw 'V1 fixture must contain 428 vocabulary cards and one stale grammar card.' }
```

Expected: `Frozen 428 authored words, 428 vocabulary cards, and one stale grammar card.` and both PowerShell assertions return silently. Running the freezer a second time must fail with its refusal message.

- [ ] **Step 6: Run the baseline test and verify ignores**

Run:

```powershell
pnpm.cmd exec vitest run src/data/authoredBaseline.test.ts
git check-ignore -v '.local/vocabulary/personal-vocabulary-v1.json'
pnpm.cmd typecheck
```

Expected: two tests PASS; `git check-ignore` cites the new `.local/` rule; TypeScript exits `0`.

- [ ] **Step 7: Commit**

```powershell
git add -- .gitignore package.json pnpm-lock.yaml src/data/authoredBaseline.ts src/data/authoredBaseline.test.ts scripts/freeze-vocabulary-v1.ts src/test/fixtures/authored-vocabulary-v1.json src/test/fixtures/study-state-v1.json
git commit -m "chore: freeze vocabulary v1 baseline"
```

Expected: one commit containing only the listed safety, dependency, baseline, script, and public authored fixture files.

### Task 2: Share the text predicates and migrate authored vocabulary readings only

**Files:**
- Create: `src/services/vocabularyText.ts`
- Create: `src/services/vocabularyText.test.ts`
- Create: `scripts/migrate-vocabulary-readings-to-kana.ts`
- Modify: `src/data/lessons/lesson01.ts` (vocabulary `reading` values only)
- Modify: `src/data/lessons/lessons02to09.ts` (vocabulary tuple reading values only)
- Modify: `src/data/lessons/lessons10to17.ts` (vocabulary `reading` values only)
- Modify: `src/data/lessons/lessons18to25.ts` (vocabulary tuple reading values only)
- Modify: `src/data/lessons/contentIntegrity.test.ts`

**Interfaces:**
- Produces: `normalizeVocabularyComparison(value: string): string`, `normalizeVocabularySearch(value: string): string`, `containsHan(value: string): boolean`, `containsLatinLetters(value: string): boolean`, `isKanaReading(value: string): boolean`, and `canAutofillReading(headword: string): boolean`.
- The importer, editor, resolver, grammar plan, and integrity tests consume these exact predicates.

- [ ] **Step 1: Write the failing predicate and migration tests**

Create `src/services/vocabularyText.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import {
  canAutofillReading,
  containsHan,
  containsLatinLetters,
  isKanaReading,
  normalizeVocabularyComparison,
  normalizeVocabularySearch,
} from './vocabularyText';

describe('vocabulary text rules', () => {
  it('normalizes comparison with NFKC and all Unicode whitespace removed', () => {
    expect(normalizeVocabularyComparison(' Ａ\u3000B\nＣ ')).toBe('ABC');
    expect(normalizeVocabularyComparison('カ フェ')).toBe('カフェ');
  });

  it('normalizes search case as well as compatibility and whitespace', () => {
    expect(normalizeVocabularySearch(' Café\u00a0Ａ ')).toBe('caféa');
  });

  it.each([
    ['かな', true], ['カーナ', true], ['〜ふん／ぷん', true], ['ことば・２', true],
    ['romaji', false], ['かなA', false], ['漢字', false], ['', false], ['   ', false],
  ])('validates reading %j as %s', (reading, expected) => {
    expect(isKanaReading(reading)).toBe(expected);
  });

  it('distinguishes Han and Latin scripts', () => {
    expect(containsHan('休けい室')).toBe(true);
    expect(containsHan('カフェ')).toBe(false);
    expect(containsHan('々〆〇')).toBe(false);
    expect(containsLatinLetters('CDプレーヤー')).toBe(true);
    expect(containsLatinLetters('シーディー')).toBe(false);
  });

  it.each([
    ['カフェー２', true], ['〜ふん／ぷん', true], ['漢字', false],
    ['CD', false], ['かな漢字', false], ['', false],
  ])('autofills %j only for kana-safe headwords', (headword, expected) => {
    expect(canAutofillReading(headword)).toBe(expected);
  });
});
```

Add to `src/data/lessons/contentIntegrity.test.ts`:

```ts
import authoredV1 from '../../test/fixtures/authored-vocabulary-v1.json';
import { AUTHORED_BASELINE_FINGERPRINT, canonicalizeAuthoredVocabulary } from '../authoredBaseline';
import { isKanaReading } from '../../services/vocabularyText';
import { createHash } from 'node:crypto';

it('migrates all and only the 428 authored vocabulary readings to kana', () => {
  const words = lessons.flatMap((lesson) =>
    lesson.vocabulary.map((word, authoredIndex) => ({
      lessonId: lesson.id,
      authoredIndex,
      id: word.id,
      japanese: word.japanese,
      english: word.english,
      partOfSpeech: word.partOfSpeech,
      reading: word.reading,
    })),
  );
  expect(words).toHaveLength(428);
  expect(words.every(({ reading }) => isKanaReading(reading))).toBe(true);
  expect(words.map(({ reading: _reading, ...word }) => word)).toEqual(
    authoredV1.map(({ reading: _reading, ...word }) => word),
  );
  const hash = createHash('sha256').update(canonicalizeAuthoredVocabulary(lessons), 'utf8').digest('hex');
  expect(hash).toBe(AUTHORED_BASELINE_FINGERPRINT);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```powershell
pnpm.cmd exec vitest run src/services/vocabularyText.test.ts src/data/lessons/contentIntegrity.test.ts -t "vocabulary text rules|migrates all and only"
```

Expected: FAIL because `vocabularyText.ts` does not exist and the current authored vocabulary readings contain Latin letters.

- [ ] **Step 3: Implement the shared predicates**

Create `src/services/vocabularyText.ts`:

```ts
const HAN = /\p{Unified_Ideograph}/u;
const LATIN = /\p{Script=Latin}/u;
const KANA = /[\p{Script=Hiragana}\p{Script=Katakana}]/u;
// NFKC turns full-width tilde, slash, brackets, and sentence punctuation into
// their ASCII compatibility forms, so both spellings are allowed here.
const ALLOWED_READING = /^[\p{Script=Hiragana}\p{Script=Katakana}\p{Number}\p{White_Space}々〆〇ヶヽヾゝゞー・、。，．！？「」『』（）［］｛｝〈〉《》【】〔〕〜～…‥／~\/()[\]{}!?.,]+$/u;

export const normalizeVocabularyComparison = (value: string): string =>
  value.normalize('NFKC').replace(/\p{White_Space}/gu, '');

export const normalizeVocabularySearch = (value: string): string =>
  normalizeVocabularyComparison(value).toLocaleLowerCase();

export const containsHan = (value: string): boolean => HAN.test(value.normalize('NFKC'));
export const containsLatinLetters = (value: string): boolean => LATIN.test(value.normalize('NFKC'));

export const isKanaReading = (value: string): boolean => {
  const normalized = value.normalize('NFKC');
  return normalized.trim().length > 0
    && !containsLatinLetters(normalized)
    && !containsHan(normalized)
    && KANA.test(normalized)
    && ALLOWED_READING.test(normalized);
};

export const canAutofillReading = (headword: string): boolean => isKanaReading(headword);
```

- [ ] **Step 4: Add the AST-targeted one-time migration**

Create `scripts/migrate-vocabulary-readings-to-kana.ts`. It must parse each file with TypeScript, collect only these literal positions, and apply replacements from the end of the file: (a) object literals whose `id` matches `^l\d+-v\d+$`, and (b) tuple arrays passed as the second argument to `vocabulary(...)` or `makeVocabulary(...)`. For a no-Han Japanese literal, use that literal as the reading; for a Han headword, use `toHiragana(oldReading)`. Normalize `~` to `〜` and `/` to `／`; reject any result that fails `isKanaReading`.

Use these exact core functions in the script:

```ts
import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';
import { toHiragana } from 'wanakana';

import { containsHan, isKanaReading } from '../src/services/vocabularyText';

const files = [
  'src/data/lessons/lesson01.ts',
  'src/data/lessons/lessons02to09.ts',
  'src/data/lessons/lessons10to17.ts',
  'src/data/lessons/lessons18to25.ts',
] as const;
const write = process.argv.includes('--write');
const quote = (value: string) => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
const migrate = (japanese: string, oldReading: string) => {
  const next = (containsHan(japanese) ? toHiragana(oldReading) : japanese)
    .normalize('NFKC')
    .replace(/~/g, '〜')
    .replace(/\//g, '／');
  if (!isKanaReading(next)) throw new Error(`Unsafe migrated reading: ${japanese} -> ${next}`);
  return next;
};
```

The visitor must throw when a recognized vocabulary node has non-literal Japanese/reading fields, must report exactly 428 recognized records, and in check mode must fail if any old reading differs from the computed reading. This keeps dialogue/example/grammar readings byte-for-byte untouched for the separate grammar plan.

- [ ] **Step 5: Run the migration once and inspect its scope**

Run:

```powershell
pnpm.cmd exec tsx scripts/migrate-vocabulary-readings-to-kana.ts --write
pnpm.cmd exec tsx scripts/migrate-vocabulary-readings-to-kana.ts
git diff --stat -- src/data/lessons
git diff --word-diff=porcelain -- src/data/lessons | Select-String -Pattern '^[-+]\s*reading:|^[-+]\s*\['
```

Expected: write mode reports `Migrated 428 vocabulary readings.`; check mode reports `Verified 428 vocabulary readings.`; the diff touches only the four lesson files and only vocabulary reading literals. No grammar example or dialogue reading changes in this task.

- [ ] **Step 6: Run the focused and full content tests**

Run:

```powershell
pnpm.cmd exec vitest run src/services/vocabularyText.test.ts src/data/authoredBaseline.test.ts src/data/lessons/contentIntegrity.test.ts
pnpm.cmd typecheck
```

Expected: all focused tests PASS, the baseline remains exactly `course-v1-25859789e2a3679f09b1ebe6a5f3e981c3c164bf0b8dec7537cd26a0bf933f03`, all 428 exported vocabulary readings pass `isKanaReading`, and TypeScript exits `0`.

- [ ] **Step 7: Commit**

```powershell
git add -- src/services/vocabularyText.ts src/services/vocabularyText.test.ts scripts/migrate-vocabulary-readings-to-kana.ts src/data/lessons/lesson01.ts src/data/lessons/lessons02to09.ts src/data/lessons/lessons10to17.ts src/data/lessons/lessons18to25.ts src/data/lessons/contentIntegrity.test.ts
git commit -m "feat: migrate vocabulary readings to kana"
```

Expected: one commit containing only the shared predicate, migration script, vocabulary reading edits, and integrity coverage.

### Task 3: Define the vocabulary/V2 contracts and effective-list resolver

**Files:**
- Modify: `src/models/content.ts`
- Modify: `src/models/review.ts`
- Create: `src/models/vocabulary.ts`
- Create: `src/models/appState.ts`
- Create: `src/services/vocabularyResolver.ts`
- Create: `src/services/vocabularyResolver.test.ts`

**Interfaces:**
- Consumes: `VocabularyItem`, `Lesson`, `LessonProgress`, `ReviewCard`, and the shared text normalization.
- Produces: `VocabularySource`, `DeviceVocabularyRecord`, `VocabularyOverrides`, `ResolvedVocabularyItem`, `LastImportRecoverySnapshot`, and `PersistedAppStateV2` with property `authoredBaselineVersion`.
- Produces: `emptyVocabularyOverrides()`, `resolveVocabularyLists({ lesson, vocabulary })`, `filterResolvedVocabulary(items, query)`, and `findLessonDuplicate({ lesson, vocabulary, japanese, excludeVocabularyId? })`.

- [ ] **Step 1: Write the failing effective-list tests**

Create `src/services/vocabularyResolver.test.ts` with these complete cases:

```ts
import { describe, expect, it } from 'vitest';

import { Lesson } from '../models/content';
import { VocabularyOverrides } from '../models/vocabulary';
import {
  filterResolvedVocabulary,
  findLessonDuplicate,
  resolveVocabularyLists,
} from './vocabularyResolver';

const lesson = {
  id: 'lesson-01',
  vocabulary: [
    { id: 'course-a', japanese: ' 学生 ', reading: 'がくせい', english: 'Student', partOfSpeech: 'noun', category: 'People' },
    { id: 'course-b', japanese: '先生', reading: 'せんせい', english: 'teacher', partOfSpeech: 'noun' },
  ],
} as Lesson;
const vocabulary: VocabularyOverrides = {
  recordsByLesson: {
    'lesson-01': [
      {
        lessonId: 'lesson-01', createdAt: '2026-07-18T02:00:00.000Z', updatedAt: '2026-07-18T02:00:00.000Z',
        sortKey: 'custom:2026-07-18T02:00:00.000Z:b',
        item: { id: 'custom:lesson-01:b', japanese: '会社員', reading: 'かいしゃいん', english: 'office worker', partOfSpeech: 'vocabulary', source: 'custom' },
      },
      {
        lessonId: 'lesson-01', createdAt: '2026-07-18T01:00:00.000Z', updatedAt: '2026-07-18T01:00:00.000Z',
        sortKey: 'personal-deck:00000010',
        item: { id: 'personal-deck:lesson-01:10', japanese: 'カフェ', reading: 'カフェ', english: 'Café', partOfSpeech: 'vocabulary', category: 'Places', source: 'personal-deck', sourceId: 'L01-10' },
      },
      {
        lessonId: 'lesson-01', createdAt: '2026-07-18T01:00:00.000Z', updatedAt: '2026-07-18T01:00:00.000Z',
        sortKey: 'personal-deck:00000002',
        item: { id: 'personal-deck:lesson-01:2', japanese: '本', reading: 'ほん', english: 'book', partOfSpeech: 'vocabulary', source: 'personal-deck', sourceId: 'L01-02' },
      },
    ],
  },
  hiddenIdsByLesson: { 'lesson-01': ['course-b', 'personal-deck:lesson-01:2'] },
  updatedAt: '2026-07-18T02:00:00.000Z',
};

describe('vocabularyResolver', () => {
  it('keeps authored order, numeric personal order, custom creation order, then removes hidden items', () => {
    const result = resolveVocabularyLists({ lesson, vocabulary });
    expect(result.active.map(({ item }) => item.id)).toEqual([
      'course-a', 'personal-deck:lesson-01:10', 'custom:lesson-01:b',
    ]);
    expect(result.hidden.map(({ item }) => item.id)).toEqual([
      'course-b', 'personal-deck:lesson-01:2',
    ]);
    expect(result.all.find(({ item }) => item.id === 'course-a')?.editable).toBe(false);
    expect(result.all.find(({ item }) => item.id === 'custom:lesson-01:b')?.editable).toBe(true);
  });

  it('searches Japanese, reading, English, and category without reordering', () => {
    const all = resolveVocabularyLists({ lesson, vocabulary }).all;
    expect(filterResolvedVocabulary(all, ' ＣＡＦÉ ').map(({ item }) => item.id)).toEqual(['personal-deck:lesson-01:10']);
    expect(filterResolvedVocabulary(all, 'people').map(({ item }) => item.id)).toEqual(['course-a']);
    expect(filterResolvedVocabulary(all, 'せん せい').map(({ item }) => item.id)).toEqual(['course-b']);
  });

  it('finds normalized duplicates across active and hidden records in one lesson', () => {
    expect(findLessonDuplicate({ lesson, vocabulary, japanese: '学 生' })?.item.id).toBe('course-a');
    expect(findLessonDuplicate({ lesson, vocabulary, japanese: '先生' })?.item.id).toBe('course-b');
    expect(findLessonDuplicate({ lesson, vocabulary, japanese: '本' })?.item.id).toBe('personal-deck:lesson-01:2');
    expect(findLessonDuplicate({ lesson, vocabulary, japanese: '会社員', excludeVocabularyId: 'custom:lesson-01:b' })).toBeUndefined();
  });

  it('allows the same normalized headword in a different lesson', () => {
    const otherLesson = { ...lesson, id: 'lesson-02', vocabulary: [] };
    expect(findLessonDuplicate({ lesson: otherLesson, vocabulary, japanese: '学生' })).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```powershell
pnpm.cmd exec vitest run src/services/vocabularyResolver.test.ts
```

Expected: FAIL because the vocabulary model and resolver do not exist.

- [ ] **Step 3: Extend the content/review models and add V2 vocabulary contracts**

Add to `VocabularyItem` in `src/models/content.ts`:

```ts
export type VocabularySource = 'course' | 'personal-deck' | 'custom';

export interface VocabularyItem {
  id: string;
  japanese: string;
  reading: string;
  english: string;
  partOfSpeech: string;
  note?: string;
  example?: JapaneseExample;
  category?: string;
  source?: VocabularySource;
  sourceId?: string;
}
```

Add to `ReviewCard` in `src/models/review.ts`:

```ts
suspended?: boolean;
```

Create `src/models/vocabulary.ts`:

```ts
import { VocabularyItem, VocabularySource } from './content';

export { VocabularySource };

export interface DeviceVocabularyRecord {
  lessonId: string;
  item: VocabularyItem & { source: Exclude<VocabularySource, 'course'> };
  createdAt: string;
  updatedAt: string;
  sortKey: string;
}

export interface VocabularyOverrides {
  recordsByLesson: Record<string, DeviceVocabularyRecord[]>;
  hiddenIdsByLesson: Record<string, string[]>;
  updatedAt: string | null;
}

export interface ResolvedVocabularyItem {
  lessonId: string;
  item: VocabularyItem;
  source: VocabularySource;
  editable: boolean;
  hidden: boolean;
  authoredIndex?: number;
  sortKey: string;
  normalizedJapanese: string;
  normalizedSearch: string;
}

export const emptyVocabularyOverrides = (): VocabularyOverrides => ({
  recordsByLesson: {},
  hiddenIdsByLesson: {},
  updatedAt: null,
});
```

Create `src/models/appState.ts`:

```ts
import { LessonProgress, ReviewCard } from './review';
import { VocabularyOverrides } from './vocabulary';

export interface LastImportRecoverySnapshot {
  previousVocabulary: VocabularyOverrides;
  previousAffectedReviewCards: Record<string, ReviewCard | null>;
  affectedReviewCardIds: string[];
  authoredBaselineVersion: string;
  importedAt: string;
}

export interface PersistedAppStateV2 {
  schemaVersion: 2;
  authoredBaselineVersion: string;
  progress: Record<string, LessonProgress>;
  reviewCards: Record<string, ReviewCard>;
  vocabulary: VocabularyOverrides;
  lastImportRecovery?: LastImportRecoverySnapshot;
}
```

- [ ] **Step 4: Implement ordered resolution, memoizable search fields, and duplicate lookup**

Create `src/services/vocabularyResolver.ts` with these exported functions and ordering rules:

```ts
import { Lesson } from '../models/content';
import { ResolvedVocabularyItem, VocabularyOverrides } from '../models/vocabulary';
import { normalizeVocabularyComparison, normalizeVocabularySearch } from './vocabularyText';

const toResolved = (
  lessonId: string,
  item: ResolvedVocabularyItem['item'],
  hidden: boolean,
  sortKey: string,
  authoredIndex?: number,
): ResolvedVocabularyItem => ({
  lessonId,
  item,
  source: item.source ?? 'course',
  editable: (item.source ?? 'course') !== 'course',
  hidden,
  sortKey,
  ...(authoredIndex === undefined ? {} : { authoredIndex }),
  normalizedJapanese: normalizeVocabularyComparison(item.japanese),
  normalizedSearch: [item.japanese, item.reading, item.english, item.category ?? '']
    .map(normalizeVocabularySearch)
    .join('\u001f'),
});

export const resolveVocabularyLists = ({
  lesson,
  vocabulary,
}: {
  lesson: Lesson;
  vocabulary: VocabularyOverrides;
}) => {
  const hiddenIds = new Set(vocabulary.hiddenIdsByLesson[lesson.id] ?? []);
  const authored = lesson.vocabulary.map((item, index) =>
    toResolved(lesson.id, item, hiddenIds.has(item.id), `course:${String(index).padStart(6, '0')}`, index),
  );
  const local = [...(vocabulary.recordsByLesson[lesson.id] ?? [])]
    .sort((left, right) => {
      const sourceOrder = (left.item.source === 'personal-deck' ? 0 : 1)
        - (right.item.source === 'personal-deck' ? 0 : 1);
      return sourceOrder || left.sortKey.localeCompare(right.sortKey) || left.item.id.localeCompare(right.item.id);
    })
    .map((record) => toResolved(lesson.id, record.item, hiddenIds.has(record.item.id), record.sortKey));
  const all = [...authored, ...local];
  return {
    all,
    active: all.filter((word) => !word.hidden),
    hidden: all.filter((word) => word.hidden),
  };
};

export const filterResolvedVocabulary = (items: readonly ResolvedVocabularyItem[], query: string) => {
  const normalized = normalizeVocabularySearch(query);
  return normalized ? items.filter((item) => item.normalizedSearch.includes(normalized)) : [...items];
};

export const findLessonDuplicate = ({
  lesson,
  vocabulary,
  japanese,
  excludeVocabularyId,
}: {
  lesson: Lesson;
  vocabulary: VocabularyOverrides;
  japanese: string;
  excludeVocabularyId?: string;
}) => {
  const normalized = normalizeVocabularyComparison(japanese);
  return resolveVocabularyLists({ lesson, vocabulary }).all.find(
    (word) => word.item.id !== excludeVocabularyId && word.normalizedJapanese === normalized,
  );
};
```

- [ ] **Step 5: Run the resolver and type checks**

Run:

```powershell
pnpm.cmd exec vitest run src/services/vocabularyResolver.test.ts
pnpm.cmd typecheck
```

Expected: four resolver tests PASS and TypeScript exits `0`.

- [ ] **Step 6: Commit**

```powershell
git add -- src/models/content.ts src/models/review.ts src/models/vocabulary.ts src/models/appState.ts src/services/vocabularyResolver.ts src/services/vocabularyResolver.test.ts
git commit -m "feat: add vocabulary layer contracts"
```

Expected: one commit containing only the shared contracts and pure resolver.

### Task 4: Build the private, deterministic Anki import pipeline

**Files:**
- Modify: `package.json`
- Create: `src/models/vocabularyBackup.ts`
- Create: `scripts/vocabulary/ankiPackage.ts`
- Create: `scripts/vocabulary/buildPersonalImport.ts`
- Create: `scripts/vocabulary/fixtures/syntheticCollection.ts`
- Create: `scripts/vocabulary/importVocabulary.test.ts`
- Create: `scripts/vocabulary/importVocabulary.ts`
- Create: `scripts/vocabulary/verifyPersonalImport.ts`

**Interfaces:**
- Produces: `VocabularyBackupFileV1`, `VocabularyBackupRecord`, `HiddenVocabularyEntry`, and optional `PersonalGenerationSummary` in a shipped, importer-library-free model.
- Produces: `readAnkiPackage(sourcePath: string): Promise<AnkiCollectionSnapshot>` and `buildPersonalImport({ collection, authoredLessons, generatedAt }): VocabularyBackupFileV1`.
- Produces local commands that take the private source from `$privateApkg = Read-Host 'Absolute path to the private APKG'`; no private path is hardcoded.

- [ ] **Step 1: Write rights-safe synthetic fixture tests**

Create `scripts/vocabulary/importVocabulary.test.ts`. Use only invented fixture records from `scripts/vocabulary/fixtures/syntheticCollection.ts`; do not paste any real source ID, word, reading, meaning, category, tag set, or deck text. Cover these named cases:

```ts
import { describe, expect, it } from 'vitest';

import { buildSyntheticCollection, syntheticLessons } from './fixtures/syntheticCollection';
import { buildPersonalImport } from './buildPersonalImport';

const generatedAt = '2026-07-18T00:00:00.000Z';
const build = (overrides = {}) => buildPersonalImport({
  collection: buildSyntheticCollection(overrides),
  authoredLessons: syntheticLessons,
  authoredBaselineVersion: 'course-test-abc',
  generatedAt,
});

describe('personal vocabulary importer', () => {
  it('requires one note type with the exact ordered seven fields', () => {
    expect(() => build({ noteTypes: [] })).toThrow(/Expected exactly one note type/);
    expect(() => build({ addSecondMatchingNoteType: true })).toThrow(/Expected exactly one note type/);
    expect(() => build({ fieldNames: ['Word', 'ID', 'Reading', 'Romaji', 'Meaning', 'Category', 'Picture'] })).toThrow(/Expected exactly one note type/);
  });

  it.each([
    [['minna'], 'exactly one lessonNN tag'],
    [['lesson1'], 'malformed lesson tag'],
    [['lesson01', 'lesson02'], 'exactly one lessonNN tag'],
  ])('rejects invalid lesson tags %j', (tags, message) => {
    expect(() => build({ firstNoteTags: tags })).toThrow(message);
  });

  it('uses odid when nonzero and diagnoses every mismatched card', () => {
    expect(() => build({ firstCardDidLesson: 2, firstCardOdidLesson: 0 })).toThrow(/card .* expected .*L01/);
    expect(build({ firstCardDidLesson: 2, firstCardOdidLesson: 1 }).records).toHaveLength(4);
  });

  it('strips sound, image, HTML, controls, and whitespace while ignoring romaji and picture', () => {
    const record = build({ decorateFirstFields: true }).records[0];
    expect(record.item).toMatchObject({ japanese: 'あさ', reading: 'あさ', english: 'morning', category: 'Time' });
    expect(JSON.stringify(record)).not.toMatch(/sound:|<img|<b>|asa-romaji|fixture\.png/);
  });

  it('autofills only kana-safe blanks and rejects Han, Latin, and mixed-script blank readings', () => {
    expect(build({ blankReadingWord: 'カーナ２' }).records[0]?.item.reading).toBe('カーナ２');
    expect(() => build({ blankReadingWord: '朝' })).toThrow(/explicit kana reading/);
    expect(() => build({ blankReadingWord: 'CD' })).toThrow(/explicit kana reading/);
    expect(() => build({ blankReadingWord: 'かな朝' })).toThrow(/explicit kana reading/);
  });

  it('sorts numeric source IDs before duplicate filtering and keeps the lower invented ID', () => {
    const file = build({ addInventedInternalDuplicate: true });
    expect(file.records.filter(({ item }) => item.japanese === 'ねこ').map(({ item }) => item.sourceId)).toEqual(['L01-2']);
    expect(file.generation?.skippedEarlierPersonalCount).toBe(1);
  });

  it('skips normalized same-lesson authored and earlier personal words but permits cross-lesson words', () => {
    const file = build({ includeSameLessonAuthoredDuplicate: true, includeCrossLessonOccurrence: true });
    expect(file.generation).toMatchObject({ skippedAuthoredCount: 1, skippedEarlierPersonalCount: 0 });
    expect(file.records.some(({ lessonId, item }) => lessonId === 'lesson-02' && item.japanese === syntheticLessons[0]?.vocabulary[0]?.japanese)).toBe(true);
  });

  it('cleans the English category portion and emits stable IDs, numeric sort keys, counts, and checksum', () => {
    const file = build();
    expect(file).toMatchObject({
      format: 'nihongo-path-vocabulary-backup', schemaVersion: 1, exportedAt: generatedAt,
      authoredBaselineVersion: 'course-test-abc', hidden: [], reviewCards: [],
    });
    expect(file.records.map(({ item, sortKey }) => [item.id, item.sourceId, sortKey])).toEqual([
      ['personal-deck:lesson-01:2', 'L01-2', 'personal-deck:00000002'],
      ['personal-deck:lesson-01:10', 'L01-10', 'personal-deck:00000010'],
      ['personal-deck:lesson-02:1', 'L02-1', 'personal-deck:00000001'],
      ['personal-deck:lesson-02:3', 'L02-3', 'personal-deck:00000003'],
    ]);
    expect(file.generation?.checksumSha256).toMatch(/^[a-f0-9]{64}$/);
  });
});
```

The two authored synthetic lessons and collection use deck leaves `L01 第1課` and `L02 第2課`, invented IDs `L01-2`, `L01-10`, `L02-1`, and `L02-3`, and invented words such as `あさ` and `ねこ`. They contain no copied private gloss/category arrangement.

- [ ] **Step 2: Run the importer test to verify it fails**

Run:

```powershell
pnpm.cmd exec vitest run scripts/vocabulary/importVocabulary.test.ts
```

Expected: FAIL because the fixture, backup model, and importer modules do not exist.

- [ ] **Step 3: Define the shared backup/import file contract**

Create `src/models/vocabularyBackup.ts`:

```ts
import { ReviewCard } from './review';
import { DeviceVocabularyRecord } from './vocabulary';

export const VOCABULARY_BACKUP_FORMAT = 'nihongo-path-vocabulary-backup' as const;
export const VOCABULARY_BACKUP_SCHEMA_VERSION = 1 as const;
export const MAX_VOCABULARY_BACKUP_BYTES = 5 * 1024 * 1024;

export interface HiddenVocabularyEntry {
  lessonId: string;
  vocabularyId: string;
  owner: 'course' | 'device';
}

export interface PersonalGenerationSummary {
  sourceNoteCount: number;
  acceptedCount: number;
  skippedAuthoredCount: number;
  skippedEarlierPersonalCount: number;
  acceptedByLesson: Record<string, number>;
  sourceByLesson: Record<string, number>;
  checksumSha256: string;
}

export interface VocabularyBackupFileV1 {
  format: typeof VOCABULARY_BACKUP_FORMAT;
  schemaVersion: typeof VOCABULARY_BACKUP_SCHEMA_VERSION;
  exportedAt: string;
  authoredBaselineVersion: string;
  records: DeviceVocabularyRecord[];
  hidden: HiddenVocabularyEntry[];
  reviewCards: ReviewCard[];
  generation?: PersonalGenerationSummary;
}
```

- [ ] **Step 4: Implement APKG/Zstd/SQLite reading with diagnostics**

Create `scripts/vocabulary/ankiPackage.ts`. Keep all `yauzl`, `fzstd`, `sql.js`, `node:fs`, and `node:module` imports in this file or sibling scripts—never under `src/`.

```ts
export interface AnkiNoteTypeRow { id: number; name: string; fieldNames: string[] }
export interface AnkiDeckRow { id: number; name: string }
export interface AnkiNoteRow { id: number; noteTypeId: number; tags: string[]; fields: string }
export interface AnkiCardRow { id: number; noteId: number; did: number; odid: number }
export interface AnkiCollectionSnapshot {
  noteTypes: AnkiNoteTypeRow[];
  decks: AnkiDeckRow[];
  notes: AnkiNoteRow[];
  cards: AnkiCardRow[];
}
export async function readAnkiPackage(sourcePath: string): Promise<AnkiCollectionSnapshot>;
```

Implementation sequence:

1. Open `sourcePath` with `yauzl.open(..., { lazyEntries: true })`; inspect entry names without opening their streams.
2. Open and buffer only the exact `collection.anki21b` entry stream, close the ZIP immediately afterward, and hard-fail if it is absent; never open an audio, image, `media`, or `collection.anki2` stream.
3. `decompress` the Zstandard bytes and open them with `sql.js` using `createRequire(import.meta.url).resolve('sql.js/dist/sql-wasm.wasm')` in `locateFile`.
4. Query `notetypes`, ordered `fields`, `decks`, `notes`, and `cards`; convert SQL.js row values to the exact snapshot interfaces and always `database.close()` in `finally`.
5. Preserve note/card integer IDs in every thrown diagnostic. Do not read `revlog`, media, templates, or Anki scheduling columns.

- [ ] **Step 5: Implement deterministic record building**

Create `scripts/vocabulary/buildPersonalImport.ts`. Use these exact constants and helpers:

```ts
const EXPECTED_FIELDS = ['ID', 'Word', 'Reading', 'Romaji', 'Meaning', 'Category', 'Picture'] as const;
const SOURCE_ID = /^L(?<lesson>\d{2})-(?<number>\d+)$/;
const LESSON_TAG = /^lesson(?<lesson>\d{2})$/;
const LESSONISH_TAG = /^lesson/i;

const stableRecordId = (lessonId: string, sourceNumber: number) =>
  `personal-deck:${lessonId}:${sourceNumber}`;
const stableSortKey = (sourceNumber: number) =>
  `personal-deck:${String(sourceNumber).padStart(8, '0')}`;
```

The implementation must:

- select exactly one note type whose ordered `fieldNames` deep-equal `EXPECTED_FIELDS`;
- sort selected notes by lesson number then parsed numeric source number before any duplicate test;
- split each selected note's raw `fields` on U+001F and require exactly seven fields;
- find all tags beginning with `lesson` case-insensitively, require exactly one, then require exact `lessonNN` with `01 <= NN <= 25`;
- require at least one associated card, resolve each card's effective deck as `odid !== 0 ? odid : did`, and compare the final U+001F-separated deck leaf with `LNN 第N課`;
- clean Word, Reading, Meaning, and Category by removing `[sound:...]`, `<img ...>`, all remaining HTML, Unicode control characters, and surrounding whitespace; never retain or inspect Romaji/Picture beyond discarding their tuple positions;
- apply `canAutofillReading` only when cleaned Reading is blank, then require `isKanaReading`;
- split cleaned Category on `/`, take and trim the final segment when a slash exists, otherwise retain the cleaned category; omit `category` when empty;
- detect duplicates with `normalizeVocabularyComparison` against the same lesson's authored words and already accepted records, permit cross-lesson occurrences, and count authored and earlier-personal skips separately;
- emit `partOfSpeech: 'vocabulary'`, `source: 'personal-deck'`, original cleaned `sourceId`, fixed `createdAt`/`updatedAt` equal to `generatedAt`, stable ID/sort key, empty `hidden` and `reviewCards`, and a SHA-256 checksum of `JSON.stringify(records)` in final deterministic order.

Every thrown source inconsistency must include the available source ID, note ID, card IDs, tagged lesson, and expected/actual deck leaves. The public test asserts message fragments; the local command retains full private diagnostics only in the terminal.

- [ ] **Step 6: Add the CLI and exact local verifier**

Add to `package.json`:

```json
"vocabulary:generate": "tsx scripts/vocabulary/importVocabulary.ts",
"vocabulary:verify": "tsx scripts/vocabulary/verifyPersonalImport.ts"
```

`scripts/vocabulary/importVocabulary.ts` parses required `--source`, optional `--output` (default `.local/vocabulary/personal-vocabulary-v1.json`), and optional `--generated-at` (default current ISO time), calls `readAnkiPackage` and `buildPersonalImport` with `lessons` and `AUTHORED_BASELINE_VERSION`, creates only the output parent directory, and writes formatted UTF-8 JSON plus LF.

`scripts/vocabulary/verifyPersonalImport.ts` requires `--source` and `--output`, rereads both, rebuilds using the output's `exportedAt`, deep-compares the generated file, and asserts these exact private-source facts without embedding a source ID or headword:

```ts
const EXPECTED_ACCEPTED = {
  'lesson-01': 45, 'lesson-02': 42, 'lesson-03': 40, 'lesson-04': 55, 'lesson-05': 84,
  'lesson-06': 89, 'lesson-07': 47, 'lesson-08': 89, 'lesson-09': 87, 'lesson-10': 68,
  'lesson-11': 54, 'lesson-12': 63, 'lesson-13': 58, 'lesson-14': 70, 'lesson-15': 50,
  'lesson-16': 85, 'lesson-17': 34, 'lesson-18': 30, 'lesson-19': 29, 'lesson-20': 22,
  'lesson-21': 50, 'lesson-22': 37, 'lesson-23': 23, 'lesson-24': 20, 'lesson-25': 18,
} as const;
const EXPECTED_SOURCE = {
  'lesson-01': 47, 'lesson-02': 48, 'lesson-03': 50, 'lesson-04': 56, 'lesson-05': 90,
  'lesson-06': 98, 'lesson-07': 54, 'lesson-08': 93, 'lesson-09': 95, 'lesson-10': 69,
  'lesson-11': 58, 'lesson-12': 71, 'lesson-13': 63, 'lesson-14': 72, 'lesson-15': 52,
  'lesson-16': 88, 'lesson-17': 35, 'lesson-18': 30, 'lesson-19': 30, 'lesson-20': 22,
  'lesson-21': 53, 'lesson-22': 37, 'lesson-23': 23, 'lesson-24': 20, 'lesson-25': 18,
} as const;
```

Also assert 1,372 source notes, 1,289 accepted, 82 authored skips, one earlier-personal skip in Lesson 10, 1,289 unique record IDs, exact lesson mapping, valid readings, no Latin reading, and no `[sound:`, `<img`, HTML tag, Romaji field, or media filename in serialized output.

- [ ] **Step 7: Run the synthetic public tests**

Run:

```powershell
pnpm.cmd exec vitest run scripts/vocabulary/importVocabulary.test.ts
pnpm.cmd typecheck
```

Expected: all eight synthetic importer cases PASS and TypeScript exits `0`; no private source is needed.

- [ ] **Step 8: Generate and verify the ignored private file locally**

Set the private source path only in the current shell; never commit it:

```powershell
$privateApkg = Read-Host 'Absolute path to the private APKG'
pnpm.cmd vocabulary:generate -- --source $privateApkg --output '.local/vocabulary/personal-vocabulary-v1.json'
pnpm.cmd vocabulary:verify -- --source $privateApkg --output '.local/vocabulary/personal-vocabulary-v1.json'
git check-ignore -v '.local/vocabulary/personal-vocabulary-v1.json'
git status --short
```

Expected: generation reports `accepted=1289 authored-skips=82 earlier-personal-skips=1`; verification prints all 25 accepted counts and `PASS 1289 records, checksum <64 lowercase hex>`; `git check-ignore` cites `.local/`; `git status --short` does not list the generated file.

- [ ] **Step 9: Commit public pipeline code only**

```powershell
git add -- package.json src/models/vocabularyBackup.ts scripts/vocabulary/ankiPackage.ts scripts/vocabulary/buildPersonalImport.ts scripts/vocabulary/fixtures/syntheticCollection.ts scripts/vocabulary/importVocabulary.test.ts scripts/vocabulary/importVocabulary.ts scripts/vocabulary/verifyPersonalImport.ts
git diff --cached --name-only
git commit -m "feat: add private vocabulary import pipeline"
```

Expected: the staged list contains only the eight public code/model files and `package.json`; it contains no `.local`, `.apkg`, Anki database, generated JSON, real source ID, or private text.

### Task 5: Reconcile effective vocabulary and review cards without schedule loss

**Files:**
- Create: `src/services/reconcileReviewCards.ts`
- Create: `src/services/reconcileReviewCards.test.ts`
- Modify: `src/services/srs.ts`
- Modify: `src/services/srs.test.ts`

**Interfaces:**
- Consumes: authored `Lesson[]`, `LessonProgress`, existing `ReviewCard` records, `VocabularyOverrides`, and optional deterministic `now`.
- Produces exactly: `reconcileReviewCards(input: { lessons: readonly Lesson[]; progress: Readonly<Record<string, LessonProgress>>; reviewCards: Readonly<Record<string, ReviewCard>>; vocabulary: VocabularyOverrides; now?: Date }): Record<string, ReviewCard>`.
- Produces: `vocabularyIdFromReviewCardId(card: ReviewCard): string | undefined`, which removes only the exact `review-` prefix.

- [ ] **Step 1: Write failing reconciliation and suspended-queue tests**

Create `src/services/reconcileReviewCards.test.ts` using one started and one unstarted fixture lesson. The complete assertions must cover:

```ts
import { describe, expect, it } from 'vitest';

import { reconcileReviewCards, vocabularyIdFromReviewCardId } from './reconcileReviewCards';

const schedule = (card: { dueAt: string; intervalDays: number; repetitions: number; ease: number; lastReviewedAt?: string }) => ({
  dueAt: card.dueAt, intervalDays: card.intervalDays, repetitions: card.repetitions,
  ease: card.ease, lastReviewedAt: card.lastReviewedAt,
});

describe('reconcileReviewCards', () => {
  it('seeds every visible word and grammar point in a started lesson due now', () => {
    const result = reconcileReviewCards({ lessons, progress: startedProgress, reviewCards: {}, vocabulary, now });
    expect(result['review-course-word']).toMatchObject({ kind: 'vocabulary', dueAt: now.toISOString(), suspended: false });
    expect(result['review-custom:lesson-01:uuid-with-hyphens']).toMatchObject({ kind: 'vocabulary', dueAt: now.toISOString(), suspended: false });
    expect(result['review-grammar-point']).toMatchObject({ kind: 'grammar', dueAt: now.toISOString() });
  });

  it('does not seed an incoming word in an unstarted lesson', () => {
    const result = reconcileReviewCards({ lessons, progress: startedProgress, reviewCards: {}, vocabulary, now });
    expect(result['review-personal-deck:lesson-02:1']).toBeUndefined();
  });

  it('refreshes stale vocabulary and grammar presentation while preserving every schedule field', () => {
    const result = reconcileReviewCards({ lessons, progress: startedProgress, reviewCards: staleCards, vocabulary, now });
    expect(result['review-course-word']).toMatchObject({ prompt: '今', answer: 'now', supportingText: 'いま · Time' });
    expect(result['review-grammar-point']).toMatchObject({ prompt: 'A は B', answer: 'A is B', supportingText: 'Topic statement' });
    expect(schedule(result['review-course-word']!)).toEqual(schedule(staleCards['review-course-word']!));
    expect(schedule(result['review-grammar-point']!)).toEqual(schedule(staleCards['review-grammar-point']!));
  });

  it('suspends hidden and orphaned cards, then restores a hidden card with its schedule', () => {
    const hidden = reconcileReviewCards({ lessons, progress: startedProgress, reviewCards: staleCards, vocabulary: hiddenVocabulary, now });
    expect(hidden['review-course-word']?.suspended).toBe(true);
    expect(hidden['review-removed-baseline-word']?.suspended).toBe(true);
    const restored = reconcileReviewCards({ lessons, progress: startedProgress, reviewCards: hidden, vocabulary, now });
    expect(restored['review-course-word']?.suspended).toBe(false);
    expect(schedule(restored['review-course-word']!)).toEqual(schedule(staleCards['review-course-word']!));
  });

  it('removes only the exact review- prefix from hyphenated vocabulary IDs', () => {
    expect(vocabularyIdFromReviewCardId({ ...staleCards['review-course-word']!, id: 'review-custom:lesson-01:uuid-with-hyphens' })).toBe('custom:lesson-01:uuid-with-hyphens');
    expect(vocabularyIdFromReviewCardId({ ...staleCards['review-course-word']!, id: 'custom:lesson-01:uuid-with-hyphens' })).toBeUndefined();
  });
});
```

Extend `src/services/srs.test.ts`:

```ts
it('excludes suspended cards from the due queue', () => {
  const due = { ...card, dueAt: '2026-01-01T00:00:00.000Z' };
  const suspended = { ...due, id: 'review-suspended', suspended: true };
  expect(getDueCards({ [due.id]: due, [suspended.id]: suspended }, new Date('2026-01-02T00:00:00.000Z')))
    .toEqual([due]);
});
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run:

```powershell
pnpm.cmd exec vitest run src/services/reconcileReviewCards.test.ts src/services/srs.test.ts
```

Expected: FAIL because the reconciler does not exist and `getDueCards` currently includes suspended cards.

- [ ] **Step 3: Implement schedule-preserving reconciliation**

Create `src/services/reconcileReviewCards.ts` around these exact helpers:

```ts
import { Lesson, VocabularyItem } from '../models/content';
import { LessonProgress, ReviewCard } from '../models/review';
import { VocabularyOverrides } from '../models/vocabulary';
import { resolveVocabularyLists } from './vocabularyResolver';

const REVIEW_PREFIX = 'review-';

export const vocabularyIdFromReviewCardId = (card: ReviewCard): string | undefined =>
  card.kind === 'vocabulary' && card.id.startsWith(REVIEW_PREFIX)
    ? card.id.slice(REVIEW_PREFIX.length)
    : undefined;

const newCard = (
  id: string,
  lessonId: string,
  kind: ReviewCard['kind'],
  prompt: string,
  answer: string,
  supportingText: string | undefined,
  now: Date,
): ReviewCard => ({
  id: `${REVIEW_PREFIX}${id}`,
  lessonId,
  kind,
  prompt,
  answer,
  ...(supportingText ? { supportingText } : {}),
  dueAt: now.toISOString(),
  intervalDays: 0,
  repetitions: 0,
  ease: 2.5,
  suspended: false,
});

const vocabularyPresentation = (item: VocabularyItem) => ({
  prompt: item.japanese,
  answer: item.english,
  supportingText: [item.reading, item.category ?? item.partOfSpeech].filter(Boolean).join(' · '),
});
```

`reconcileReviewCards` must shallow-clone the input record, process only started lessons, and:

1. Resolve active and hidden vocabulary without mutating the lesson.
2. Create missing active vocabulary and grammar cards due at `now`.
3. For existing current cards, spread the existing card first and overwrite only `lessonId`, `kind`, `prompt`, `answer`, `supportingText`, and `suspended`; never recompute `dueAt`, interval, repetitions, ease, or last review.
4. Set hidden cards to `suspended: true`; set restored active cards to `suspended: false`.
5. Retain and suspend any vocabulary/grammar card in a started lesson whose exact content ID no longer exists, so later ID restoration can recover its schedule.
6. Leave cards for unstarted lessons byte-for-byte unchanged.
7. Reuse the existing object when no field changes, so unrelated-card byte equality can be asserted during backup replacement.

- [ ] **Step 4: Exclude suspended cards from SRS queues**

Change `getDueCards` in `src/services/srs.ts` to filter before the date comparison:

```ts
return Object.values(cards)
  .filter((card) => card.suspended !== true)
  .filter((card) => new Date(card.dueAt).getTime() <= now.getTime())
  .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
```

Keep `scheduleReview` schedule math unchanged. A missing `suspended` field continues to mean active.

- [ ] **Step 5: Run focused and full SRS tests**

Run:

```powershell
pnpm.cmd exec vitest run src/services/reconcileReviewCards.test.ts src/services/srs.test.ts
pnpm.cmd typecheck
```

Expected: all reconciliation and SRS tests PASS; TypeScript exits `0`.

- [ ] **Step 6: Commit**

```powershell
git add -- src/services/reconcileReviewCards.ts src/services/reconcileReviewCards.test.ts src/services/srs.ts src/services/srs.test.ts
git commit -m "feat: reconcile vocabulary review cards"
```

Expected: one commit containing only shared review reconciliation and suspended-queue behavior.

### Task 6: Validate, migrate, verify, and hydrate the atomic V2 envelope

**Files:**
- Create: `src/services/appStateValidation.ts`
- Create: `src/services/appStateValidation.test.ts`
- Create: `src/services/appStateStorage.ts`
- Create: `src/services/appStateStorage.test.ts`
- Test: `src/test/fixtures/study-state-v1.json`

**Interfaces:**
- Consumes: the exact frozen V1 shape, `PersistedAppStateV2`, authored lessons/version, and `reconcileReviewCards`.
- Produces: `V1_STUDY_STORAGE_KEY = '@nihongo-path/study-state/v1'`, `V2_APP_STATE_STORAGE_KEY = '@nihongo-path/app-state/v2'`, `KeyValueStorage`, `validateStudyStateV1`, `validatePersistedAppStateV2`, `writeAppStateV2(storage, state)`, and `hydrateAppStateV2({ storage, lessons, now? }): Promise<HydrationResult>`.

- [ ] **Step 1: Write failing validation and hydration tests**

Create `src/services/appStateStorage.test.ts` with an in-memory storage double that records exact `getItem`/`setItem` calls and can reject writes or return a mismatched read-back. Load `src/test/fixtures/study-state-v1.json` as the real migration fixture. Cover these cases:

```ts
describe('hydrateAppStateV2', () => {
  it('migrates the frozen V1 once, verifies V2, and never writes V1', async () => {
    const storage = memoryStorage({ [V1_STUDY_STORAGE_KEY]: JSON.stringify(v1Fixture) });
    const result = await hydrateAppStateV2({ storage, lessons, now });
    expect(result).toMatchObject({ status: 'ready', source: 'v1' });
    expect(storage.setCalls).toHaveLength(1);
    expect(storage.setCalls[0]?.[0]).toBe(V2_APP_STATE_STORAGE_KEY);
    expect(storage.values[V1_STUDY_STORAGE_KEY]).toBe(JSON.stringify(v1Fixture));
    expect(result.status === 'ready' && result.state.vocabulary).toEqual(emptyVocabularyOverrides());
  });

  it('refreshes stale frozen vocabulary and grammar presentation but preserves their schedules', async () => {
    const result = await hydrateFrozenV1();
    if (result.status !== 'ready') throw new Error('expected ready');
    const vocabulary = result.state.reviewCards['review-l1-v01']!;
    const grammar = result.state.reviewCards['review-l1-topic-copula']!;
    expect(vocabulary.prompt).toBe(lessons[0]?.vocabulary[0]?.japanese);
    expect(vocabulary.supportingText).toContain(lessons[0]?.vocabulary[0]?.reading);
    expect(grammar.prompt).toBe(lessons[0]?.grammar[0]?.pattern);
    expect(grammar.prompt).not.toContain('STALE V1');
    expect(pickSchedule(vocabulary)).toEqual(pickSchedule(v1Fixture.reviewCards['review-l1-v01']));
    expect(pickSchedule(grammar)).toEqual(pickSchedule(v1Fixture.reviewCards['review-l1-topic-copula']));
  });

  it('creates and verifies one empty V2 when neither key exists', async () => {
    const storage = memoryStorage();
    const result = await hydrateAppStateV2({ storage, lessons, now });
    expect(result).toMatchObject({ status: 'ready', source: 'empty' });
    expect(storage.setCalls).toHaveLength(1);
  });

  it('loads valid V2, reconciles content, and never reads V1', async () => {
    const storage = memoryStorage({ [V2_APP_STATE_STORAGE_KEY]: JSON.stringify(validV2) });
    const result = await hydrateAppStateV2({ storage, lessons, now });
    expect(result.status).toBe('ready');
    expect(storage.getCalls).not.toContain(V1_STUDY_STORAGE_KEY);
  });

  it.each(['invalid-v2', 'invalid-v1'] as const)('returns recovery for %s without a write', async (kind) => {
    const storage = storageWithInvalid(kind);
    const result = await hydrateAppStateV2({ storage, lessons, now });
    expect(result).toMatchObject({ status: 'recovery', reason: kind });
    expect(storage.setCalls).toEqual([]);
  });

  it.each(['write-failed', 'verification-failed'] as const)('does not publish a state when %s', async (failure) => {
    const storage = failingStorage(failure);
    const result = await hydrateAppStateV2({ storage, lessons, now });
    expect(result).toMatchObject({ status: 'recovery', reason: failure });
  });
});
```

Create `src/services/appStateValidation.test.ts` to reject: wrong schema/version, non-object maps, malformed lesson progress, malformed review cards, unknown `kind`, non-boolean `suspended`, authored records inside device records, record/lesson mismatch, duplicate device IDs, duplicate hidden IDs, invalid ISO timestamps, malformed recovery records, and recovery card IDs not listed in `affectedReviewCardIds`. Also assert a missing V1/V2 `suspended` field validates and means active.

- [ ] **Step 2: Run storage tests to verify they fail**

Run:

```powershell
pnpm.cmd exec vitest run src/services/appStateValidation.test.ts src/services/appStateStorage.test.ts
```

Expected: FAIL because validation/storage modules do not exist.

- [ ] **Step 3: Implement strict validators without partial coercion**

Create `src/services/appStateValidation.ts` with discriminated return values:

```ts
export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; path: string; message: string };

export interface StudyStateV1 {
  progress: Record<string, LessonProgress>;
  reviewCards: Record<string, ReviewCard>;
}

export type ValidateStudyStateV1 = (input: unknown) => ValidationResult<StudyStateV1>;
export type ValidatePersistedAppStateV2 = (input: unknown) => ValidationResult<PersistedAppStateV2>;
```

Export concrete values `validateStudyStateV1: ValidateStudyStateV1` and `validatePersistedAppStateV2: ValidatePersistedAppStateV2`. Their strict walk must accept only JSON-compatible objects/arrays/primitives, validate every required property and every present optional property, and return the first exact path (for example `reviewCards.review-x.kind`). It may ignore unknown top-level properties for forward-compatible diagnostics, but it must never fill a malformed required value with an empty default. Validate `VocabularyOverrides.updatedAt` in the nested vocabulary object so import recovery automatically captures/restores it.

- [ ] **Step 4: Implement V1/V2 storage and verified hydration**

Create `src/services/appStateStorage.ts`:

```ts
export const V1_STUDY_STORAGE_KEY = '@nihongo-path/study-state/v1' as const;
export const V2_APP_STATE_STORAGE_KEY = '@nihongo-path/app-state/v2' as const;

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export type HydrationResult =
  | { status: 'ready'; source: 'v2' | 'v1' | 'empty'; state: PersistedAppStateV2 }
  | { status: 'recovery'; reason: 'invalid-v2' | 'invalid-v1' | 'read-failed' | 'write-failed' | 'verification-failed'; message: string };

export const writeAppStateV2 = (storage: KeyValueStorage, state: PersistedAppStateV2) =>
  storage.setItem(V2_APP_STATE_STORAGE_KEY, JSON.stringify(state));

export async function hydrateAppStateV2({
  storage,
  lessons,
  now = new Date(),
}: {
  storage: KeyValueStorage;
  lessons: readonly Lesson[];
  now?: Date;
}): Promise<HydrationResult>;
```

Use this exact decision order:

1. Catch the V2 read separately; a read error returns `read-failed`.
2. If V2 text exists, JSON-parse and validate it. Invalid returns `invalid-v2` without any write or V1 read.
3. Reconcile a valid V2 against current lessons, replace `authoredBaselineVersion` with `AUTHORED_BASELINE_VERSION`, and write/read-verify only if the serialized state changed. Return ready only after any required write verifies.
4. Only when V2 is absent, read V1. Invalid JSON/shape returns `invalid-v1` without a write.
5. Build a complete V2 from valid V1 or empty maps, `emptyVocabularyOverrides()`, no recovery, current version, and reconciled cards.
6. Perform exactly one V2 `setItem`, immediately `getItem` V2, parse/validate/deep-compare the read-back, and only then return ready.
7. Never call `setItem` with the V1 key. Never remove either key. Never return in-memory defaults after invalid data or a failed/ unverifiable write.

- [ ] **Step 5: Run all migration/validation tests**

Run:

```powershell
pnpm.cmd exec vitest run src/services/appStateValidation.test.ts src/services/appStateStorage.test.ts src/services/reconcileReviewCards.test.ts
pnpm.cmd typecheck
```

Expected: all validators, frozen V1 migration, stale vocabulary/grammar refresh, schedule-preservation, failure, and read-back tests PASS; TypeScript exits `0`.

- [ ] **Step 6: Commit**

```powershell
git add -- src/services/appStateValidation.ts src/services/appStateValidation.test.ts src/services/appStateStorage.ts src/services/appStateStorage.test.ts
git commit -m "feat: migrate study state atomically to v2"
```

Expected: one commit containing only validation and V1/V2 storage migration; the frozen fixtures remain unchanged from Task 1.

### Task 7: Serialize save-before-publish transitions and replace StudyContext autosave

**Files:**
- Create: `src/state/appStateCommitter.ts`
- Create: `src/state/appStateCommitter.test.ts`
- Create: `src/state/studyTransitions.ts`
- Create: `src/state/studyTransitions.test.ts`
- Rewrite: `src/state/StudyContext.tsx`
- Create: `src/components/HydrationGate.tsx`
- Create: `src/screens/StorageRecoveryScreen.tsx`
- Modify: `App.tsx`
- Modify: `src/screens/LessonDetailScreen.tsx`
- Modify: `src/screens/ExerciseScreen.tsx`
- Modify: `src/screens/ReviewScreen.tsx`

**Interfaces:**
- Produces: `AppStateCommitter.commit(transition: (current: PersistedAppStateV2) => PersistedAppStateV2): Promise<CommitResult>`.
- Produces: pure `buildStartLessonState`, `buildRecordExerciseState`, and `buildRateReviewState` transitions.
- Produces context fields `hydrationStatus`, `hydrationMessage`, `state`, `storageError`, `retryHydration`, `commitAppState`, and the existing study actions as `Promise<CommitResult>` methods.

- [ ] **Step 1: Write failing serialized-commit tests**

Create `src/state/appStateCommitter.test.ts`:

```ts
describe('createAppStateCommitter', () => {
  it('validates and persists before publishing', async () => {
    const events: string[] = [];
    const committer = createHarness({ events });
    const result = await committer.commit((current) => ({ ...current, authoredBaselineVersion: 'next' }));
    expect(result.ok).toBe(true);
    expect(events).toEqual(['validate:next', 'persist:next', 'publish:next']);
  });

  it('serializes concurrent transitions so the second sees the first published state', async () => {
    const firstWrite = deferred<void>();
    const harness = createHarness({ firstWrite });
    const first = harness.commit(incrementAttempts);
    const second = harness.commit(incrementAttempts);
    expect(harness.persisted).toHaveLength(1);
    firstWrite.resolve();
    await expect(first).resolves.toMatchObject({ ok: true });
    await expect(second).resolves.toMatchObject({ ok: true });
    expect(harness.persisted.map(readAttempts)).toEqual([1, 2]);
    expect(readAttempts(harness.current())).toBe(2);
  });

  it.each(['validation', 'write'] as const)('leaves persisted and published state unchanged on %s failure', async (failure) => {
    const harness = createHarness({ failure });
    const beforePersisted = harness.rawStored;
    const beforePublished = harness.current();
    await expect(harness.commit(incrementAttempts)).resolves.toMatchObject({ ok: false });
    expect(harness.rawStored).toBe(beforePersisted);
    expect(harness.current()).toBe(beforePublished);
  });

  it('continues the queue after a failed transition', async () => {
    const harness = createHarness({ failFirstWriteOnly: true });
    await harness.commit(incrementAttempts);
    await harness.commit(incrementAttempts);
    expect(readAttempts(harness.current())).toBe(1);
  });
});
```

Create `src/state/studyTransitions.test.ts` to prove: starting a lesson seeds its effective active vocabulary and grammar; exercise completion preserves recovery; rating an unrelated review card preserves recovery; rating a card listed in `affectedReviewCardIds` clears recovery; rating preserves all other cards/progress/vocabulary byte-for-byte.

- [ ] **Step 2: Run the state tests to verify they fail**

Run:

```powershell
pnpm.cmd exec vitest run src/state/appStateCommitter.test.ts src/state/studyTransitions.test.ts
```

Expected: FAIL because the committer and transition modules do not exist.

- [ ] **Step 3: Implement the queued committer**

Create `src/state/appStateCommitter.ts`:

```ts
import { PersistedAppStateV2 } from '../models/appState';

export type AppStateTransition = (current: PersistedAppStateV2) => PersistedAppStateV2;
export type CommitResult =
  | { ok: true; state: PersistedAppStateV2 }
  | { ok: false; error: Error };

export interface AppStateCommitter {
  commit(transition: AppStateTransition): Promise<CommitResult>;
}

export const createAppStateCommitter = ({
  getCurrent,
  validate,
  persist,
  publish,
}: {
  getCurrent: () => PersistedAppStateV2;
  validate: (candidate: unknown) => PersistedAppStateV2;
  persist: (candidate: PersistedAppStateV2) => Promise<void>;
  publish: (candidate: PersistedAppStateV2) => void;
}): AppStateCommitter => {
  let tail: Promise<void> = Promise.resolve();
  return {
    commit(transition) {
      const work = tail.then(async (): Promise<CommitResult> => {
        try {
          const candidate = validate(transition(getCurrent()));
          await persist(candidate);
          publish(candidate);
          return { ok: true, state: candidate };
        } catch (cause) {
          return { ok: false, error: cause instanceof Error ? cause : new Error(String(cause)) };
        }
      });
      tail = work.then(() => undefined, () => undefined);
      return work;
    },
  };
};
```

Validation adapts `validatePersistedAppStateV2`: throw `new Error(`${path}: ${message}`)` on an invalid candidate. Persistence calls `writeAppStateV2` exactly once. The queue catches failures into results so a rejection never poisons later transitions.

- [ ] **Step 4: Implement pure study transitions**

Create `src/state/studyTransitions.ts` with exact signatures:

```ts
export const buildStartLessonState = (
  current: PersistedAppStateV2,
  lessonId: string,
  lessons: readonly Lesson[],
  now = new Date(),
): PersistedAppStateV2;

export const buildRecordExerciseState = (
  current: PersistedAppStateV2,
  lessonId: string,
  exerciseId: string,
  correct: boolean,
): PersistedAppStateV2;

export const buildRateReviewState = (
  current: PersistedAppStateV2,
  cardId: string,
  rating: ReviewRating,
  reviewedAt = new Date(),
): PersistedAppStateV2;
```

`buildStartLessonState` preserves existing progress, creates progress only when absent, and calls `reconcileReviewCards` after progress becomes started. `buildRecordExerciseState` carries forward the current recovery unchanged. `buildRateReviewState` schedules only the named card; it clears `lastImportRecovery` if and only if `affectedReviewCardIds.includes(cardId)`.

- [ ] **Step 5: Replace reducer/effect persistence with hydration plus the committer**

Rewrite `src/state/StudyContext.tsx` so it has no persistence `useEffect`, no `Action` union, and no reducer. Keep a `stateRef` synchronized only inside `publish`, construct one committer after successful hydration, and expose all actions through `committer.commit(...)`.

Use this context shape:

```ts
interface StudyContextValue {
  hydrationStatus: 'loading' | 'ready' | 'recovery';
  hydrationMessage: string | null;
  state: PersistedAppStateV2;
  storageError: string | null;
  dueCards: ReviewCard[];
  retryHydration: () => Promise<void>;
  commitAppState: AppStateCommitter['commit'];
  startLesson: (lessonId: string) => Promise<CommitResult>;
  recordExercise: (lessonId: string, exerciseId: string, correct: boolean) => Promise<CommitResult>;
  rateReview: (cardId: string, rating: ReviewRating) => Promise<CommitResult>;
  getProgress: (lessonId: string) => LessonProgress | undefined;
}
```

The initial context `state` may be an unpersisted empty V2 only to keep hook types total; `HydrationGate` prevents any navigator/screen from observing it. On hydration recovery, keep that object unchanged, expose the recovery result, and perform no save. On a commit failure, retain the prior `stateRef`/React state and set a persistent `storageError`; on a later successful commit, clear the error.

- [ ] **Step 6: Put the hydration barrier above the navigator**

Create `src/components/HydrationGate.tsx` and `src/screens/StorageRecoveryScreen.tsx`. Loading copy is `Preparing your saved study state…`. Recovery copy states that saved data was not changed and offers a visible `Try again` button calling `retryHydration`; it does not offer destructive reset or use `Alert.alert`.

Change the provider area in `App.tsx` to:

```tsx
<StudyProvider>
  <HydrationGate>
    <StatusBar style="dark" />
    <AppNavigator />
  </HydrationGate>
</StudyProvider>
```

Remove the old `state.hydrated` branch from `ReviewScreen`; the navigator can only render after ready hydration.

- [ ] **Step 7: Adapt existing calls to await committed results**

In `LessonDetailScreen.tsx`, `ExerciseScreen.tsx`, and `ReviewScreen.tsx`, make mutation-driven handlers asynchronous and await their `CommitResult`. Any navigation or advance to another exercise/review card happens only after `{ ok: true }`; on failure, keep the current screen/card visible and let the persistent banner added in Task 11 explain that the prior saved state is intact. For example:

```ts
const beginPractice = async () => {
  const result = await startLesson(lesson.id);
  if (result.ok) navigation.navigate('Exercise', { lessonId: lesson.id });
};
```

Apply the same success gate to `recordExercise` and `rateReview`. Do not add a second optimistic local study state and do not discard these promises with `void` before reading the result.

- [ ] **Step 8: Run state, migration, SRS, and type checks**

Run:

```powershell
pnpm.cmd exec vitest run src/state/appStateCommitter.test.ts src/state/studyTransitions.test.ts src/services/appStateStorage.test.ts src/services/reconcileReviewCards.test.ts src/services/srs.test.ts
pnpm.cmd typecheck
```

Expected: serialization, failure-no-publish, recovery invalidation, V1 migration, reconciliation, and SRS tests PASS; TypeScript exits `0`.

- [ ] **Step 9: Commit**

```powershell
git add -- src/state/appStateCommitter.ts src/state/appStateCommitter.test.ts src/state/studyTransitions.ts src/state/studyTransitions.test.ts src/state/StudyContext.tsx src/components/HydrationGate.tsx src/screens/StorageRecoveryScreen.tsx App.tsx src/screens/LessonDetailScreen.tsx src/screens/ExerciseScreen.tsx src/screens/ReviewScreen.tsx
git commit -m "feat: serialize atomic app state commits"
```

Expected: one commit removes the V1 autosave effect and makes the hydration barrier plus serialized V2 commit path mandatory.

### Task 8: Add, edit, hide, restore, and temporarily undo through V2

**Files:**
- Create: `src/services/vocabularyMutations.ts`
- Create: `src/services/vocabularyMutations.test.ts`
- Create: `src/state/vocabularyManagerUi.ts`
- Create: `src/state/vocabularyManagerUi.test.ts`
- Modify: `src/state/StudyContext.tsx`

**Interfaces:**
- Produces: `VocabularyDraft`, `VocabularyUndoToken`, `buildAddVocabularyState`, `buildEditVocabularyState`, `buildHideVocabularyState`, `buildRestoreVocabularyState`, and `buildTemporaryVocabularyUndoState`.
- Produces `addVocabulary`, `editVocabulary`, and `undoVocabularyMutation` returning `Promise<CommitResult>`; `hideVocabulary` and `restoreVocabulary` return `Promise<ReversibleCommitResult>`, whose success is `{ ok: true; state: PersistedAppStateV2; undoToken: VocabularyUndoToken }` and failure is `{ ok: false; error: Error }`.
- Consumes `Crypto.randomUUID()` from the Expo-installed `expo-crypto`; custom IDs are exactly `custom:<lesson-id>:<uuid>`.

- [ ] **Step 1: Write failing mutation and transient-undo tests**

Create `src/services/vocabularyMutations.test.ts` with these cases:

```ts
describe('vocabulary mutations', () => {
  it('adds a valid custom item with stable namespace/order and reconciles a started lesson', () => {
    const next = buildAddVocabularyState(current, 'lesson-01', draft, { lessons, now, uuid: '11111111-1111-4111-8111-111111111111' });
    const record = next.vocabulary.recordsByLesson['lesson-01']?.[0];
    expect(record).toMatchObject({
      lessonId: 'lesson-01', createdAt: now.toISOString(), updatedAt: now.toISOString(),
      item: { id: 'custom:lesson-01:11111111-1111-4111-8111-111111111111', source: 'custom', partOfSpeech: 'vocabulary' },
    });
    expect(record?.sortKey).toBe('custom:2026-07-18T00:00:00.000Z:11111111-1111-4111-8111-111111111111');
    expect(next.reviewCards[`review-${record?.item.id}`]).toBeDefined();
    expect(next.lastImportRecovery).toBeUndefined();
  });

  it.each([
    [{ japanese: '', reading: 'かな', english: 'x' }, 'Japanese is required'],
    [{ japanese: 'かな', reading: 'かな', english: '' }, 'English is required'],
    [{ japanese: '漢字', reading: '', english: 'kanji' }, 'Kana reading is required'],
    [{ japanese: 'かな', reading: 'romaji', english: 'kana' }, 'Reading must use kana'],
  ])('rejects invalid draft %j', (invalid, message) => {
    expect(() => buildAddVocabularyState(current, 'lesson-01', invalid, options)).toThrow(message);
  });

  it('uses the shared active-and-hidden duplicate predicate but allows another lesson', () => {
    expect(() => buildAddVocabularyState(current, 'lesson-01', { ...draft, japanese: '学 生' }, options)).toThrow(/already exists in Lesson 1/);
    expect(() => buildAddVocabularyState(current, 'lesson-01', { ...draft, japanese: hiddenWord }, options)).toThrow(/already exists in Lesson 1/);
    expect(() => buildAddVocabularyState(current, 'lesson-02', { ...draft, japanese: '学生' }, options)).not.toThrow();
  });

  it('edits personal/custom presentation while preserving identity, order, source, and schedule', () => {
    const beforeRecord = localRecord(current);
    const beforeSchedule = pickSchedule(current.reviewCards[`review-${beforeRecord.item.id}`]!);
    const next = buildEditVocabularyState(current, beforeRecord.lessonId, beforeRecord.item.id, editedDraft, { lessons, now });
    const afterRecord = localRecord(next);
    expect(afterRecord).toMatchObject({
      lessonId: beforeRecord.lessonId, createdAt: beforeRecord.createdAt,
      sortKey: beforeRecord.sortKey, item: { id: beforeRecord.item.id, source: beforeRecord.item.source, sourceId: beforeRecord.item.sourceId },
    });
    expect(pickSchedule(next.reviewCards[`review-${afterRecord.item.id}`]!)).toEqual(beforeSchedule);
    expect(next.reviewCards[`review-${afterRecord.item.id}`]).toMatchObject({ prompt: editedDraft.japanese, answer: editedDraft.english });
  });

  it('never edits an authored item', () => {
    expect(() => buildEditVocabularyState(current, 'lesson-01', 'course-word', editedDraft, { lessons, now })).toThrow('Authored vocabulary cannot be edited.');
  });

  it('hides/restores authored or local items with the same schedule', () => {
    const { state: hidden, undoToken } = buildHideVocabularyState(current, 'lesson-01', 'course-word', { lessons, now });
    expect(resolve(hidden).active.some(({ item }) => item.id === 'course-word')).toBe(false);
    expect(hidden.reviewCards['review-course-word']?.suspended).toBe(true);
    const restored = buildRestoreVocabularyState(hidden, 'lesson-01', 'course-word', { lessons, now: later });
    expect(restored.state.reviewCards['review-course-word']?.suspended).toBe(false);
    expect(pickSchedule(restored.state.reviewCards['review-course-word']!)).toEqual(pickSchedule(current.reviewCards['review-course-word']!));
    expect(undoToken.kind).toBe('restore');
  });

  it('applies only the immediately matching temporary undo token', () => {
    const hidden = buildHideVocabularyState(current, 'lesson-01', 'course-word', { lessons, now });
    const undone = buildTemporaryVocabularyUndoState(hidden.state, hidden.undoToken, { lessons, now: later });
    expect(undone.vocabulary.hiddenIdsByLesson['lesson-01']).not.toContain('course-word');
    const changed = buildAddVocabularyState(hidden.state, 'lesson-01', draft, optionsAfterHide);
    expect(() => buildTemporaryVocabularyUndoState(changed, hidden.undoToken, { lessons, now: latest })).toThrow('This undo has expired.');
  });
});
```

Create `src/state/vocabularyManagerUi.test.ts` to prove `reduceVocabularyManagerUi` stores a hide/restore token only after success and clears it on the next add/edit/hide/restore success, route blur/navigation, or undo success; query/view changes alone retain it.

- [ ] **Step 2: Run focused tests to verify they fail**

Run:

```powershell
pnpm.cmd exec vitest run src/services/vocabularyMutations.test.ts src/state/vocabularyManagerUi.test.ts
```

Expected: FAIL because the mutation service and UI reducer do not exist.

- [ ] **Step 3: Implement validated vocabulary drafts and transitions**

Create `src/services/vocabularyMutations.ts` with these public contracts:

```ts
export interface VocabularyDraft {
  japanese: string;
  reading: string;
  english: string;
  category?: string;
}

export interface VocabularyUndoToken {
  kind: 'hide' | 'restore';
  lessonId: string;
  vocabularyId: string;
  expectedVocabularyUpdatedAt: string;
}
```

All builders receive current V2, exact lesson ID, `lessons`, and deterministic `now`. Add also receives a UUID; edit receives a local ID. Use a `nextVocabularyTimestamp(current, now)` helper that returns `now` unless it is not later than `current.vocabulary.updatedAt`, in which case it returns exactly one millisecond after the stored value. This guarantees each successful vocabulary mutation changes the transient undo revision even when two actions occur in the same clock millisecond.

Draft normalization is exact: trim Japanese/English/category; autofill a blank reading only with `canAutofillReading(trimmedJapanese)`; otherwise require `isKanaReading`; preserve internal whitespace; set empty category to `undefined`; use `findLessonDuplicate`, including hidden items and excluding the current ID for edit.

Every builder must:

1. clone only affected maps/arrays;
2. update `vocabulary.updatedAt` to the monotonic timestamp;
3. clear `lastImportRecovery`;
4. call `reconcileReviewCards` on the complete result;
5. never delete a review card;
6. throw before returning if the lesson/record/permission/duplicate/reading precondition fails.

Hide and restore return `{ state, undoToken }`; the token's `kind` is the inverse action and its expected revision is the returned state's `vocabulary.updatedAt`. Temporary undo first requires exact revision equality and then delegates to the matching hide/restore transition.

- [ ] **Step 4: Implement the local manager UI reducer**

Create `src/state/vocabularyManagerUi.ts`:

```ts
export interface VocabularyManagerUiState {
  view: 'active' | 'hidden';
  draftQuery: string;
  appliedQuery: string;
  undoToken: VocabularyUndoToken | null;
}

export type VocabularyManagerUiAction =
  | { type: 'set-view'; view: VocabularyManagerUiState['view'] }
  | { type: 'set-draft-query'; query: string }
  | { type: 'commit-query'; query: string }
  | { type: 'reversible-mutation-succeeded'; token: VocabularyUndoToken }
  | { type: 'non-reversible-mutation-succeeded' }
  | { type: 'undo-succeeded' }
  | { type: 'route-blurred' };
```

The reducer only changes these volatile fields and is never serialized into V2.

- [ ] **Step 5: Route all vocabulary actions through StudyContext's committer**

Import `* as Crypto from 'expo-crypto'`. `addVocabulary` captures `Crypto.randomUUID()` and then calls `commitAppState(current => buildAddVocabularyState(...))`. Edit and temporary undo call their pure builders. Hide/restore need to return the committed inverse token only when `CommitResult.ok`; implement a small context helper that captures the pure builder's token inside the serialized transition and discards it on commit failure.

Do not call AsyncStorage from `vocabularyMutations.ts`, a screen, or any new hook.

- [ ] **Step 6: Run mutation, committer, resolver, and reconciliation tests**

Run:

```powershell
pnpm.cmd exec vitest run src/services/vocabularyMutations.test.ts src/state/vocabularyManagerUi.test.ts src/state/appStateCommitter.test.ts src/services/vocabularyResolver.test.ts src/services/reconcileReviewCards.test.ts
pnpm.cmd typecheck
```

Expected: add/edit/hide/restore/temporary-undo, duplicate, schedule, recovery invalidation, serialized commit, resolver, and reconciliation tests PASS; TypeScript exits `0`.

- [ ] **Step 7: Commit**

```powershell
git add -- src/services/vocabularyMutations.ts src/services/vocabularyMutations.test.ts src/state/vocabularyManagerUi.ts src/state/vocabularyManagerUi.test.ts src/state/StudyContext.tsx
git commit -m "feat: add atomic vocabulary mutations"
```

Expected: one commit adds no delete path and no storage write outside `appStateCommitter`/`appStateStorage`.

### Task 9: Validate backup replacement and persistent import recovery

**Files:**
- Create: `src/services/vocabularyBackup.ts`
- Create: `src/services/vocabularyBackup.test.ts`
- Modify: `src/services/appStateValidation.ts`
- Modify: `src/services/appStateValidation.test.ts`
- Modify: `src/state/StudyContext.tsx`

**Interfaces:**
- Produces: `buildVocabularyBackup(state, lessons, exportedAt): VocabularyBackupFileV1`, `validateVocabularyBackupBytes({ bytes, lessons, current }): VocabularyBackupValidationResult`, `replaceVocabularyFromPreview(current, preview, { lessons, now }): PersistedAppStateV2`, and `undoLastVocabularyImport(current, { lessons, now }): PersistedAppStateV2`.
- Produces volatile `VocabularyImportPreview` with counts, exact affected IDs, a baseline warning, and a validated file; preview data is never persisted before confirmation.
- Produces context methods `prepareVocabularyImport`, `confirmVocabularyImport`, `clearVocabularyImportPreview`, and `undoLastVocabularyImport`.

- [ ] **Step 1: Write the failing validator/replacement/recovery tests**

Create `src/services/vocabularyBackup.test.ts`. Use small invented course/device fixtures and cover all of these exact cases:

```ts
describe('vocabulary backup', () => {
  it('exports only device records, lesson-scoped hidden entries, and associated vocabulary cards', () => {
    const file = buildVocabularyBackup(current, lessons, now.toISOString());
    expect(file.records.map(({ item }) => item.source)).toEqual(['personal-deck', 'custom']);
    expect(file.reviewCards.every(({ kind }) => kind === 'vocabulary')).toBe(true);
    expect(file.reviewCards.map(({ id }) => id)).not.toContain('review-grammar-point');
    expect(file.hidden).toContainEqual({ lessonId: 'lesson-01', vocabularyId: 'course-word', owner: 'course' });
  });

  it.each([
    ['oversize', 'File exceeds 5 MB'], ['non-json', 'File is not valid JSON'],
    ['wrong-format', 'Unsupported vocabulary backup format'], ['wrong-version', 'Unsupported vocabulary backup schema'],
    ['malformed-record', 'records[0]'], ['duplicate-id', 'Duplicate vocabulary ID'],
    ['unknown-lesson', 'Unknown lesson ID'], ['conflicting-id', 'Conflicting vocabulary ID'],
    ['bad-review-kind', 'Review kind must be vocabulary'], ['bad-review-id', 'Review ID must equal review-<vocabulary-id>'],
    ['review-owner-missing', 'Review vocabulary ID is not represented'], ['review-lesson-mismatch', 'Review lesson does not match vocabulary owner'],
    ['malformed-generation', 'generation'],
  ])('rejects %s completely', (fixture, message) => {
    expect(validateFixture(fixture)).toMatchObject({ ok: false });
    expect(firstIssue(validateFixture(fixture))).toContain(message);
  });

  it('warns rather than fails for a different authored baseline', () => {
    const result = validateFixture('different-baseline');
    expect(result).toMatchObject({ ok: true, preview: { baselineWarning: expect.stringContaining('different course baseline') } });
  });

  it('keeps a well-formed unknown course tombstone but rejects a known ID in another lesson or grammar', () => {
    expect(validateFixture('unknown-course-tombstone')).toMatchObject({ ok: true });
    expect(validateFixture('known-other-lesson')).toMatchObject({ ok: false });
    expect(validateFixture('known-grammar-id')).toMatchObject({ ok: false });
  });

  it('replaces rather than merges and leaves unrelated progress/grammar/vocabulary schedules byte-for-byte unchanged', () => {
    const preview = validPreview(replacementFile);
    const next = replaceVocabularyFromPreview(current, preview, { lessons, now });
    expect(deviceIds(next)).toEqual(replacementFile.records.map(({ item }) => item.id));
    expect(next.reviewCards['review-old-local']).toBeUndefined();
    expect(JSON.stringify(next.progress)).toBe(JSON.stringify(current.progress));
    expect(JSON.stringify(next.reviewCards['review-grammar-point'])).toBe(JSON.stringify(current.reviewCards['review-grammar-point']));
    expect(JSON.stringify(next.reviewCards['review-unaffected-course-word'])).toBe(JSON.stringify(current.reviewCards['review-unaffected-course-word']));
  });

  it('creates missing incoming cards only for started lessons', () => {
    const next = replaceVocabularyFromPreview(current, validPreview(startedAndUnstartedFile), { lessons, now });
    expect(next.reviewCards['review-custom:lesson-01:new']).toBeDefined();
    expect(next.reviewCards['review-custom:lesson-02:new']).toBeUndefined();
  });

  it('stores a reload-safe recovery snapshot and undo restores the prior layer/cards', () => {
    const imported = replaceVocabularyFromPreview(current, validPreview(replacementFile), { lessons, now });
    const reloaded = validateOrThrow(JSON.parse(JSON.stringify(imported)));
    const undone = undoLastVocabularyImport(reloaded, { lessons, now: later });
    expect(stripUpdatedAt(undone.vocabulary)).toEqual(stripUpdatedAt(current.vocabulary));
    for (const cardId of imported.lastImportRecovery!.affectedReviewCardIds) {
      expect(undone.reviewCards[cardId]).toEqual(current.reviewCards[cardId]);
    }
    expect(undone.lastImportRecovery).toBeUndefined();
    expect(undone.vocabulary.updatedAt).toBe(later.toISOString());
  });

  it('leaves the current validated state untouched when recovery cannot validate', () => {
    const corruptRecovery = withCorruptRecovery(imported);
    expect(() => undoLastVocabularyImport(corruptRecovery, { lessons, now: later })).toThrow();
    expect(corruptRecovery).toEqual(beforeAttempt);
  });
});
```

- [ ] **Step 2: Run the backup tests to verify they fail**

Run:

```powershell
pnpm.cmd exec vitest run src/services/vocabularyBackup.test.ts
```

Expected: FAIL because `vocabularyBackup.ts` does not exist.

- [ ] **Step 3: Implement deterministic export and complete byte validation**

Create `src/services/vocabularyBackup.ts` with:

```ts
export interface VocabularyImportPreview {
  file: VocabularyBackupFileV1;
  baselineWarning: string | null;
  incomingRecordCount: number;
  incomingHiddenCount: number;
  incomingReviewCount: number;
  affectedVocabularyIds: string[];
  affectedReviewCardIds: string[];
}

export type VocabularyBackupValidationResult =
  | { ok: true; preview: VocabularyImportPreview }
  | { ok: false; issues: string[] };
```

`buildVocabularyBackup` sorts records by lesson ID/source/sort key, hidden entries by lesson/vocabulary ID, and review cards by ID. Include a review card only when its exact vocabulary ID belongs to an exported device record or hidden entry. Use `vocabularyIdFromReviewCardId`; never split card IDs on `-`.

`validateVocabularyBackupBytes` must check `bytes.byteLength <= MAX_VOCABULARY_BACKUP_BYTES` before UTF-8 decoding, use `new TextDecoder('utf-8', { fatal: true })`, parse once, then validate the entire object without mutating current state. Build an ownership index over current authored vocabulary and grammar IDs. Apply all model/ID/lesson/duplicate/reading/sort/timestamp rules before returning a preview. When the development importer's optional `generation` summary is present, strictly validate every count map, total, and lowercase SHA-256 field; it is informational preview input and is not copied into V2. A differing `authoredBaselineVersion` sets one warning string. Unknown `owner: 'course'` hidden IDs remain tombstones only when the ID is unknown everywhere; any ID currently owned by another lesson or grammar is a hard issue. An `owner: 'device'` hidden ID must be represented by an incoming record in the same lesson.

Every incoming review card must be `kind: 'vocabulary'`, have `id === 'review-' + representedVocabularyId`, match the represented lesson, and reference an incoming record or hidden entry. This makes a crafted grammar replacement impossible.

- [ ] **Step 4: Implement exact replacement and recovery**

`replaceVocabularyFromPreview` computes the affected vocabulary set as the union of old/new device-record IDs and old/new hidden IDs. It must:

1. capture `previousVocabulary` and each affected review card (or `null`) before changes;
2. replace records/hidden entries exactly with the validated file and set a monotonic `vocabulary.updatedAt`;
3. remove review cards for old local records absent from the file;
4. retain existing baseline cards so hidden-state reconciliation preserves schedules;
5. accept incoming associated cards only for started lessons, then reconcile missing started-lesson cards and suspension;
6. leave all review cards outside the affected set unchanged by value;
7. write a new `lastImportRecovery` containing previous vocabulary, prior affected cards, sorted exact `affectedReviewCardIds`, current baseline version, and import time.

`undoLastVocabularyImport` requires a validated recovery, restores its record/hidden layer, gives the restored layer a new monotonic `updatedAt`, restores/deletes exactly the captured affected review cards, reconciles current content, and clears recovery. It returns a candidate only; the committer makes failure non-mutating.

- [ ] **Step 5: Add volatile preview and committed import actions to StudyContext**

`prepareVocabularyImport(bytes)` validates and stores only a `VocabularyImportPreview` in ordinary React state. `confirmVocabularyImport()` commits `replaceVocabularyFromPreview` and clears preview only on success. `undoLastVocabularyImport()` commits the recovery transition. Add/edit/hide/restore already clear recovery in Task 8; Task 7's affected-card rating rule remains intact.

- [ ] **Step 6: Run backup, validation, transition, and committer tests**

Run:

```powershell
pnpm.cmd exec vitest run src/services/vocabularyBackup.test.ts src/services/appStateValidation.test.ts src/state/studyTransitions.test.ts src/state/appStateCommitter.test.ts
pnpm.cmd typecheck
```

Expected: malformed/malicious input, baseline warning, tombstone, replacement scope, unstarted lesson, reload-safe undo, affected-rating invalidation, and failure-no-publish tests PASS; TypeScript exits `0`.

- [ ] **Step 7: Commit**

```powershell
git add -- src/services/vocabularyBackup.ts src/services/vocabularyBackup.test.ts src/services/appStateValidation.ts src/services/appStateValidation.test.ts src/state/StudyContext.tsx
git commit -m "feat: add vocabulary backup replacement"
```

Expected: one commit adds complete replacement/recovery without a merge mode or grammar-card mutation path.

### Task 10: Add platform-safe share/download transfer adapters

**Files:**
- Create: `src/services/webFileTransferCore.ts`
- Create: `src/services/webFileTransferCore.test.ts`
- Create: `src/services/webFileTransfer.web.ts`
- Create: `src/services/webFileTransfer.native.ts`

**Interfaces:**
- Produces: `VocabularyTransferResult = 'shared' | 'downloaded' | 'cancelled' | 'unavailable'`, `vocabularyBackupFilename(exportedAt)`, `isUserCancellation(error)`, and platform `exportVocabularyBackupFile(file): Promise<VocabularyTransferResult>`.
- The web adapter receives an injectable environment in tests; the native adapter imports no DOM type/value and returns `unavailable`.

- [ ] **Step 1: Write failing transfer-decision tests**

Create `src/services/webFileTransferCore.test.ts`:

```ts
describe('web vocabulary file transfer', () => {
  it('uses Web Share only when share and canShare(files) both accept the file', async () => {
    const env = webEnvironment({ share: true, canShare: true });
    await expect(exportWithEnvironment(backup, env)).resolves.toBe('shared');
    expect(env.navigator.canShare).toHaveBeenCalledWith({ files: [expect.any(File)] });
    expect(env.navigator.share).toHaveBeenCalledTimes(1);
    expect(env.anchor.click).not.toHaveBeenCalled();
  });

  it.each([
    ['missing share', { share: false, canShare: true }],
    ['missing canShare', { share: true, canShare: false }],
    ['canShare rejects files', { share: true, canShare: true, canShareResult: false }],
  ])('downloads when %s', async (_label, options) => {
    const env = webEnvironment(options);
    await expect(exportWithEnvironment(backup, env)).resolves.toBe('downloaded');
    expect(env.anchor.download).toBe('nihongo-path-vocabulary-2026-07-18.json');
    expect(env.anchor.click).toHaveBeenCalledTimes(1);
    expect(env.url.revokeObjectURL).toHaveBeenCalledWith(env.createdUrl);
  });

  it('treats a user-cancelled share as cancellation, not an error or download', async () => {
    const env = webEnvironment({ share: true, canShare: true, shareError: domAbortError() });
    await expect(exportWithEnvironment(backup, env)).resolves.toBe('cancelled');
    expect(env.anchor.click).not.toHaveBeenCalled();
  });

  it('rethrows a non-cancellation share error', async () => {
    await expect(exportWithEnvironment(backup, webEnvironment({ shareError: new Error('denied') }))).rejects.toThrow('denied');
  });

  it('revokes the download URL even when anchor click throws', async () => {
    const env = webEnvironment({ clickError: new Error('click failed') });
    await expect(exportWithEnvironment(backup, env)).rejects.toThrow('click failed');
    expect(env.url.revokeObjectURL).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the transfer test to verify it fails**

Run:

```powershell
pnpm.cmd exec vitest run src/services/webFileTransferCore.test.ts
```

Expected: FAIL because the core and adapters do not exist.

- [ ] **Step 3: Implement pure decisions and platform adapters**

Create `src/services/webFileTransferCore.ts` with no global access:

```ts
export type VocabularyTransferResult = 'shared' | 'downloaded' | 'cancelled' | 'unavailable';

export const vocabularyBackupFilename = (exportedAt: string) =>
  `nihongo-path-vocabulary-${exportedAt.slice(0, 10)}.json`;

export const isUserCancellation = (error: unknown) =>
  error instanceof Error && (error.name === 'AbortError' || error.name === 'NotAllowedError');
```

The `.web.ts` adapter JSON-stringifies the validated file, creates `new File([json], filename, { type: 'application/json' })`, and calls `navigator.share` only when both functions exist and `navigator.canShare({ files: [file] })` is true. Otherwise create a Blob URL, set a temporary anchor's `href`/`download`, append/click/remove it, and revoke the exact URL in `finally`. Treat only `AbortError`/`NotAllowedError` from the picker/share interaction as `cancelled`; rethrow other failures.

The `.native.ts` adapter exports the same function signature and immediately resolves `unavailable`; it must not mention `window`, `document`, `navigator`, `File`, `Blob`, or `URL`.

- [ ] **Step 4: Run transfer and native-compilation checks**

Run:

```powershell
pnpm.cmd exec vitest run src/services/webFileTransferCore.test.ts
pnpm.cmd typecheck
```

Expected: all five transfer behaviors PASS and TypeScript compiles both platform adapters without DOM leakage into native code.

- [ ] **Step 5: Commit**

```powershell
git add -- src/services/webFileTransferCore.ts src/services/webFileTransferCore.test.ts src/services/webFileTransfer.web.ts src/services/webFileTransfer.native.ts
git commit -m "feat: add vocabulary file transfer adapters"
```

Expected: one commit contains only pure/platform transfer code.

### Task 11: Put the root stack and accessible hydration/error/search shell in place

**Files:**
- Modify: `App.tsx`
- Modify: `src/navigation/types.ts`
- Modify: `src/navigation/AppNavigator.tsx`
- Create: `src/components/StorageErrorBanner.tsx`
- Create: `src/components/CompositionAwareTextInput.web.tsx`
- Create: `src/components/CompositionAwareTextInput.native.tsx`
- Create: `src/screens/lessonWordsModel.ts`
- Create: `src/screens/lessonWordsModel.test.ts`
- Modify: `src/screens/LessonDetailScreen.tsx`
- Create: `src/screens/VocabularyManagerScreen.tsx` (routed shell; Task 12 completes it)
- Create: `src/screens/WordEditorScreen.tsx` (routed shell; Task 12 completes it)
- Create: `src/screens/ImportPreviewScreen.tsx` (routed shell; Task 13 completes it)

**Interfaces:**
- Produces `RootStackParamList` with `MainTabs`, lesson-scoped `VocabularyManager`, `WordEditor`, and `ImportPreview` routes above `RootTabParamList`.
- Produces composition-aware props `value`, `onDraftChange`, and `onCommittedChange`; web commits on non-composing changes/composition-end, native commits on end-editing.
- Produces `buildLessonWordsView({ lesson, vocabulary, query })` for count/search without lesson mutation.

- [ ] **Step 1: Write the failing lesson words model tests**

Create `src/screens/lessonWordsModel.test.ts`:

```ts
describe('buildLessonWordsView', () => {
  it('returns the effective visible count and normalized filtered order', () => {
    const view = buildLessonWordsView({ lesson, vocabulary, query: ' time ' });
    expect(view.visibleCount).toBe(4);
    expect(view.filtered.map(({ item }) => item.id)).toEqual(['course-now', 'custom-later']);
  });

  it('distinguishes an empty lesson from no search matches', () => {
    expect(buildLessonWordsView({ lesson: emptyLesson, vocabulary, query: '' }).emptyState).toBe('no-words');
    expect(buildLessonWordsView({ lesson, vocabulary, query: 'not-present' }).emptyState).toBe('no-matches');
  });

  it('filters 2,000 memoized search records without changing order', () => {
    const large = buildLargeLesson(2_000);
    const result = buildLessonWordsView({ lesson: large.lesson, vocabulary: large.vocabulary, query: 'target' });
    expect(result.filtered.map(({ item }) => item.id)).toEqual(large.expectedIds);
  });
});
```

- [ ] **Step 2: Run the model test to verify it fails**

Run:

```powershell
pnpm.cmd exec vitest run src/screens/lessonWordsModel.test.ts
```

Expected: FAIL because `lessonWordsModel.ts` does not exist.

- [ ] **Step 3: Implement the model and platform IME adapters**

`buildLessonWordsView` calls `resolveVocabularyLists`, filters only `active`, returns `{ visibleCount, filtered, emptyState: 'none' | 'no-words' | 'no-matches' }`, and never mutates `lesson.vocabulary`.

Both `CompositionAwareTextInput` platform files export this exact component contract in addition to ordinary `TextInputProps` not owned by the adapter:

```ts
interface CompositionAwareTextInputProps extends Omit<TextInputProps, 'value' | 'onChange' | 'onChangeText' | 'onEndEditing'> {
  value: string;
  onDraftChange(value: string): void;
  onCommittedChange(value: string): void;
  onCompositionChange?(isComposing: boolean): void;
}
```

The web file uses typed `onCompositionStart`/`onCompositionEnd` props on a narrowed React Native Web `TextInput`, tracks composition in a ref, reports composition state, calls `onDraftChange` for rendered input, and calls `onCommittedChange` only for a non-composing change, composition end, or non-composing blur. The native file calls `onDraftChange` on change and `onCommittedChange(event.nativeEvent.text)` only on `onEndEditing`; it reports `false` after end editing because the native text service commits before that event. Neither adapter submits a form.

- [ ] **Step 4: Add the root navigator and route shells**

Replace navigation contracts with:

```ts
export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<RootTabParamList> | undefined;
  VocabularyManager: { lessonId: string };
  WordEditor: { lessonId: string; vocabularyId?: string };
  ImportPreview: undefined;
};
```

Keep the existing Learn stack and tabs as `MainTabsNavigator`, then render them inside a native root stack under the one `NavigationContainer`:

```tsx
<RootStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}>
  <RootStack.Screen name="MainTabs" component={MainTabsNavigator} />
  <RootStack.Screen name="VocabularyManager" component={VocabularyManagerScreen} options={{ animation: 'slide_from_right' }} />
  <RootStack.Screen name="WordEditor" component={WordEditorScreen} options={{ presentation: 'modal' }} />
  <RootStack.Screen name="ImportPreview" component={ImportPreviewScreen} options={{ presentation: 'modal' }} />
</RootStack.Navigator>
```

The three temporary route shells render a full-safe-area screen, exact route title, and 44-pixel Back/Cancel control; they do not implement a second store. Tasks 12/13 replace their bodies without changing route names/params.

- [ ] **Step 5: Show persistent write failures above navigation**

Create `StorageErrorBanner.tsx` with `accessibilityRole="alert"`, exact copy `Changes could not be saved. Your previous saved state is still intact.`, and no dismiss button. In `App.tsx`, inside ready `HydrationGate`, render the banner immediately before `AppNavigator`; it remains until StudyContext clears `storageError` after a successful committed write.

- [ ] **Step 6: Add lesson search/count/manage UI**

In the Words tab, memoize `buildLessonWordsView` from current `state.vocabulary` and the composition-committed query. A virtualized list must never be nested inside the current `<Screen scroll>`/`ScrollView`: when `activeTab === 'words'`, render a non-scrolling safe-area container and make the `FlatList` the sole vertical scroller. Put the shared back/hero/tab controls plus the Words heading/search/count/manage controls in `ListHeaderComponent`, and put the practice footer in `ListFooterComponent`. Other tabs may retain the existing scrolling `Screen`. Show:

- `CompositionAwareTextInput` with label `Search Lesson NN words`, hint `Matches Japanese, kana reading, English, or category`;
- visible count text `${visibleCount} visible words`;
- a 44-pixel `Manage words` button navigating the root stack to `{ name: 'VocabularyManager', params: { lessonId: lesson.id } }`;
- a `FlatList` with stable `item.id` keys and the existing word row visual content, category when present, and exact `No words match this search.` state.

The draft query updates visually during IME composition, but only `onCommittedChange` changes results. Use `ResolvedVocabularyItem.normalizedSearch`; do not normalize every field inside `renderItem`.

- [ ] **Step 7: Run model, navigation, and project checks**

Run:

```powershell
pnpm.cmd exec vitest run src/screens/lessonWordsModel.test.ts src/services/vocabularyResolver.test.ts
pnpm.cmd typecheck
pnpm.cmd export:web
```

Expected: lesson model and resolver tests PASS, TypeScript proves all root/nested route params, and Expo web export succeeds.

- [ ] **Step 8: Commit**

```powershell
git add -- App.tsx src/navigation/types.ts src/navigation/AppNavigator.tsx src/components/StorageErrorBanner.tsx src/components/CompositionAwareTextInput.web.tsx src/components/CompositionAwareTextInput.native.tsx src/screens/lessonWordsModel.ts src/screens/lessonWordsModel.test.ts src/screens/LessonDetailScreen.tsx src/screens/VocabularyManagerScreen.tsx src/screens/WordEditorScreen.tsx src/screens/ImportPreviewScreen.tsx
git commit -m "feat: add vocabulary root navigation shell"
```

Expected: one commit makes hydration/write errors and lesson vocabulary entry points reachable without completing manager/backup bodies early.

### Task 12: Complete the lesson-scoped manager and explicit word editor

**Files:**
- Modify: `src/components/PrimaryButton.tsx`
- Create: `src/components/UndoSnackbar.tsx`
- Create: `src/screens/wordEditorModel.ts`
- Create: `src/screens/wordEditorModel.test.ts`
- Rewrite: `src/screens/VocabularyManagerScreen.tsx`
- Rewrite: `src/screens/WordEditorScreen.tsx`

**Interfaces:**
- Consumes: `ResolvedVocabularyItem.editable`, effective Active/Hidden lists, manager UI reducer, composition adapters, and committed StudyContext mutations.
- Produces: `buildWordEditorValidation({ draft, committedJapanese, lesson, vocabulary, editingId, composing }): WordEditorValidation` so duplicate messages and Save eligibility are composition-safe.

- [ ] **Step 1: Write failing editor-state tests**

Create `src/screens/wordEditorModel.test.ts`:

```ts
describe('buildWordEditorValidation', () => {
  it('shows required and kana errors only for committed values', () => {
    expect(validate({ japanese: '', reading: '', english: '' })).toMatchObject({ canSave: false, japaneseError: 'Japanese is required.', englishError: 'English is required.' });
    expect(validate({ japanese: '漢字', reading: 'kanji', english: 'kanji' })).toMatchObject({ canSave: false, readingError: 'Use kana for the reading.' });
  });

  it('autofills a blank reading only for a kana-safe headword', () => {
    expect(validate({ japanese: 'カフェ', reading: '', english: 'cafe' }).normalizedDraft.reading).toBe('カフェ');
    expect(validate({ japanese: '漢字', reading: '', english: 'kanji' }).readingError).toBe('Kana reading is required.');
  });

  it('does not calculate or display duplicate validation during composition', () => {
    const result = buildWordEditorValidation({ ...fixture, draft: duplicateDraft, committedJapanese: 'old', composing: true });
    expect(result.duplicateError).toBeNull();
    expect(result.canSave).toBe(false);
  });

  it('finds active/hidden duplicates after composition and excludes the edited ID', () => {
    expect(validationForDuplicate().duplicateError).toBe('This word already exists in Lesson 1.');
    expect(validationForEditedWord().duplicateError).toBeNull();
  });
});
```

- [ ] **Step 2: Run editor tests to verify they fail**

Run:

```powershell
pnpm.cmd exec vitest run src/screens/wordEditorModel.test.ts src/state/vocabularyManagerUi.test.ts src/services/vocabularyMutations.test.ts
```

Expected: editor tests FAIL because the model does not exist; mutation/reducer tests remain PASS.

- [ ] **Step 3: Implement composition-safe editor validation**

Create `wordEditorModel.ts` as a pure adapter over Task 8's exported `validateVocabularyDraft` and `findLessonDuplicate`. While `composing` is true, return `canSave: false` and `duplicateError: null`; otherwise validate the last committed Japanese value, normalize blank safe readings, and exclude `editingId`. Return field-specific strings and the normalized draft used by the eventual mutation.

- [ ] **Step 4: Add visible focus and accessibility props to PrimaryButton**

Extend `PrimaryButtonProps` with `accessibilityLabel?: string` and `accessibilityHint?: string`, pass them to `Pressable`, track `onFocus`/`onBlur`, and add a visible 2-pixel `colors.gold` focus outline/border without reducing the existing 52-pixel minimum height. Preserve every existing call site.

Create `UndoSnackbar.tsx` with `accessibilityRole="alert"`, message `Word hidden.` or `Word restored.`, a 44-pixel `Undo` button, and no persisted timer state. The manager clears it on its next successful mutation or route blur; it may auto-hide visually after 6 seconds but the reducer must clear the token when it hides.

- [ ] **Step 5: Complete the virtualized manager**

`VocabularyManagerScreen` must:

- require the routed lesson ID and render its number/title;
- memoize `resolveVocabularyLists`, select Active or Hidden, then call `filterResolvedVocabulary` with the composition-committed query;
- use one `FlatList`, `keyExtractor={({ item }) => item.id}`, `keyboardShouldPersistTaps="handled"`, and no parent scrolling `Screen`;
- show Active/Hidden 44-pixel tabs, counts, a prominent `Add word`, and search across both views;
- show Edit only when `resolved.editable` is true, Hide only in Active, Restore only in Hidden;
- label/hint every action with the Japanese headword, for example `Hide 学生` / `Removes this word from lesson and due review without deleting its schedule`;
- await hide/restore; dispatch the inverse token only on commit success; show `UndoSnackbar`; await undo and clear only on success;
- dispatch `route-blurred` from a navigation blur listener and clear the token after 6 seconds;
- distinguish `No words match this search.` from `No hidden words in this lesson.`;
- navigate Add/Edit to root `WordEditor` with the exact lesson and optional vocabulary ID.

- [ ] **Step 6: Complete the keyboard-aware editor**

`WordEditorScreen` uses `KeyboardAvoidingView`, a safe-area `ScrollView`, `keyboardShouldPersistTaps="handled"`, and four labeled inputs: Japanese, Kana reading, English meaning, Optional category. Japanese/kana fields use `CompositionAwareTextInput`; no input submits on Enter/composition. Save remains disabled while either field reports composing or validation fails.

For edit, resolve the routed item and require `editable`; an authored or missing ID shows `This word cannot be edited.` with Cancel only. Save explicitly awaits `addVocabulary` or `editVocabulary`; navigate back only on success. Cancel always returns without mutation. Show field/duplicate/write errors inline with `accessibilityRole="alert"`; never use `Alert.alert`.

- [ ] **Step 7: Run manager/editor core and project checks**

Run:

```powershell
pnpm.cmd exec vitest run src/screens/wordEditorModel.test.ts src/state/vocabularyManagerUi.test.ts src/services/vocabularyMutations.test.ts src/services/vocabularyResolver.test.ts
pnpm.cmd typecheck
pnpm.cmd export:web
```

Expected: editor composition/duplicate and all mutation/undo/resolver tests PASS; TypeScript and Expo export succeed.

- [ ] **Step 8: Commit**

```powershell
git add -- src/components/PrimaryButton.tsx src/components/UndoSnackbar.tsx src/screens/wordEditorModel.ts src/screens/wordEditorModel.test.ts src/screens/VocabularyManagerScreen.tsx src/screens/WordEditorScreen.tsx
git commit -m "feat: add vocabulary manager and editor"
```

Expected: one commit completes lesson-scoped Active/Hidden management with no permanent delete or authored edit control.

### Task 13: Add Progress backup/import/undo and complete preview/file picking

**Files:**
- Create: `src/components/VocabularyFilePicker.web.tsx`
- Create: `src/components/VocabularyFilePicker.native.tsx`
- Modify: `src/services/webFileTransferCore.ts`
- Modify: `src/services/webFileTransferCore.test.ts`
- Modify: `src/services/srs.ts`
- Modify: `src/services/srs.test.ts`
- Modify: `src/screens/ProgressScreen.tsx`
- Modify: `src/screens/ReviewScreen.tsx`
- Rewrite: `src/screens/ImportPreviewScreen.tsx`

**Interfaces:**
- Produces `readPickedVocabularyFile(file: { size: number; arrayBuffer(): Promise<ArrayBuffer> } | null)` for cancellation/size/read decisions.
- Produces web/native `VocabularyFilePicker` with `onPick(bytes, fileName)`, `onError(message)`, and same-file reset behavior.
- Produces `getReviewStats(cards): { activeTotal: number; reviewedActive: number }`, excluding suspended cards.

- [ ] **Step 1: Add failing picker and active-stat tests**

Extend `webFileTransferCore.test.ts`:

```ts
it('treats a cancelled picker as cancellation', async () => {
  await expect(readPickedVocabularyFile(null)).resolves.toEqual({ status: 'cancelled' });
});

it('rejects an oversized picker file before reading it', async () => {
  const file = fakePickedFile(MAX_VOCABULARY_BACKUP_BYTES + 1);
  await expect(readPickedVocabularyFile(file)).resolves.toEqual({ status: 'error', message: 'File exceeds 5 MB.' });
  expect(file.arrayBuffer).not.toHaveBeenCalled();
});

it('returns exact selected bytes', async () => {
  await expect(readPickedVocabularyFile(fakePickedFile(3, new Uint8Array([1, 2, 3])))).resolves.toEqual({ status: 'picked', bytes: new Uint8Array([1, 2, 3]) });
});
```

Extend `srs.test.ts`:

```ts
it('excludes suspended cards from deck and reviewed statistics', () => {
  expect(getReviewStats({
    active: { ...card, id: 'active', lastReviewedAt: '2026-01-01T00:00:00.000Z' },
    suspended: { ...card, id: 'suspended', suspended: true, lastReviewedAt: '2026-01-01T00:00:00.000Z' },
  })).toEqual({ activeTotal: 1, reviewedActive: 1 });
});
```

- [ ] **Step 2: Run focused tests to verify they fail**

Run:

```powershell
pnpm.cmd exec vitest run src/services/webFileTransferCore.test.ts src/services/srs.test.ts
```

Expected: FAIL because picker reading and active statistics do not exist.

- [ ] **Step 3: Implement picker core and platform components**

`readPickedVocabularyFile` returns cancellation for null, checks the exact 5 MB limit before `arrayBuffer`, and returns a new `Uint8Array` on success. It catches user cancellation as cancellation and other read failures as `{ status: 'error', message }`.

`VocabularyFilePicker.web.tsx` renders a visible 44-pixel Import button associated with a visually hidden `<input type="file" accept="application/json,.json">`. On every `change`, capture `const input = event.currentTarget` before the first `await`, await the pure reader, call the appropriate callback, and execute `input.value = ''` in `finally`, including cancellation/error, so selecting the same file again triggers `change`. The `.native.tsx` renders a disabled 44-pixel button with hint `Import is available in the installed web app.` and imports no DOM API.

- [ ] **Step 4: Implement active review statistics**

Add to `srs.ts`:

```ts
export const getReviewStats = (cards: Record<string, ReviewCard>) => {
  const active = Object.values(cards).filter((card) => card.suspended !== true);
  return {
    activeTotal: active.length,
    reviewedActive: active.filter((card) => Boolean(card.lastReviewedAt)).length,
  };
};
```

Use it in both Progress and Review for deck/reviewed counts and empty-state choice; do not use `Object.keys(state.reviewCards).length` for user-visible statistics.

- [ ] **Step 5: Add the Progress vocabulary backup card and manager links**

In `ProgressScreen`, obtain root navigation and render the backup card before Lesson activity with exact copy:

`Vocabulary changes are stored only on this device. Clearing site data or removing the PWA can remove them. Export a backup to transfer them manually.`

Add accessible 44-pixel Export, Import, and `Undo last import` controls. Export builds a current backup then calls the platform export adapter; show downloaded/shared status, ignore cancellation, and show non-cancellation errors inline. Import validates picked bytes through `prepareVocabularyImport`; navigate to root `ImportPreview` only when valid and otherwise show every issue without changing state. Enable persistent undo only when recovery exists and await it.

Add a `Manage words` control to each rendered lesson activity card, navigating to that lesson's manager. When no lesson is started, the empty state includes `Manage Lesson 1 words`, ensuring the manager is reachable from Progress without first starting study.

- [ ] **Step 6: Complete the explicit replacement preview**

`ImportPreviewScreen` reads only the volatile context preview. Missing preview shows `No import is ready to preview.` and Cancel. A valid preview shows incoming record/hidden/review counts, affected-ID count, exact replacement warning `This replaces all device vocabulary and hidden-word choices; it does not merge them.`, and the baseline warning when present.

Cancel clears preview and goes back. `Replace device vocabulary` awaits `confirmVocabularyImport`; on success navigate to MainTabs → Progress, on failure stay and rely on the persistent banner. Do not use `Alert.alert`. State that `Undo last import` remains available after reload until the next successful vocabulary mutation or affected-card review.

- [ ] **Step 7: Run transfer, backup, SRS, and project checks**

Run:

```powershell
pnpm.cmd exec vitest run src/services/webFileTransferCore.test.ts src/services/vocabularyBackup.test.ts src/services/srs.test.ts
pnpm.cmd typecheck
pnpm.cmd export:web
```

Expected: picker cancellation/size/bytes, backup, replacement/recovery, due/stat suspension tests PASS; TypeScript and Expo export succeed.

- [ ] **Step 8: Commit**

```powershell
git add -- src/components/VocabularyFilePicker.web.tsx src/components/VocabularyFilePicker.native.tsx src/services/webFileTransferCore.ts src/services/webFileTransferCore.test.ts src/services/srs.ts src/services/srs.test.ts src/screens/ProgressScreen.tsx src/screens/ReviewScreen.tsx src/screens/ImportPreviewScreen.tsx
git commit -m "feat: add vocabulary backup interface"
```

Expected: one commit completes share/download/pick/replace/undo UI with same-file reselection and active-only review counts.

### Task 14: Prove the public boundary, clean export, transfer, IME, and device behavior

**Files:**
- Create: `scripts/assert-public-artifact-safe.ts`
- Create: `scripts/benchmark-vocabulary-search.ts`
- Modify: `package.json`
- Modify: `.github/workflows/deploy-pages.yml`
- Modify: `README.md`
- Modify: `GITHUB_PAGES.md`
- Create: `docs/superpowers/reviews/2026-07-18-vocabulary-import-acceptance.md`

**Interfaces:**
- Produces CI command `pnpm.cmd audit:public -- --tracked --dist dist`, which has no private input and checks tracked paths/export structure.
- Produces local-only command `pnpm.cmd audit:public:local`, which additionally reads the ignored private file in memory and checks private ID plus text-value canaries against `dist` without logging any ID/text.
- Produces `pnpm.cmd benchmark:vocabulary-search`, a target-Windows 2,000-record p95 benchmark with a 100 ms gate.

- [ ] **Step 1: Write the failing public-boundary self-tests**

Implement `scripts/assert-public-artifact-safe.ts` with an exported pure `findForbiddenTrackedPaths(paths)` and `findPrivateCanaryLeaks(privateFile, publicContent, distFiles)`. Add a `--self-test` mode using invented paths, IDs, a headword, and a gloss that must reject `source.apkg`, `collection.anki21b`, `.local/vocabulary/personal-vocabulary-v1.json`, and every invented private canary embedded in a fake bundle while accepting normal app assets.

Run:

```powershell
pnpm.cmd exec tsx scripts/assert-public-artifact-safe.ts --self-test
```

Expected before implementation: FAIL because the script does not exist.

- [ ] **Step 2: Implement distinct CI and local privacy modes**

The script must:

1. In `--tracked` mode, execute `git ls-files -z`, split NUL paths, and reject tracked `.apkg`, `.anki2`, `.anki21b`, `collection.anki*`, `.local/`, personal-vocabulary JSON, or known Anki media-manifest paths. This mode never looks for a private file and is safe in public CI.
2. In `--dist <dir>` mode, recursively inspect exported file paths for the same forbidden extensions/names and scan text bundles for accidental literal local paths such as `.local/vocabulary/personal-vocabulary-v1.json`.
3. Only when `--private <ignored-json>` is explicitly present, parse it and collect in memory: all 1,289 stable record IDs and source IDs, plus JSON-escaped Japanese/reading/English/category values of at least four characters that do not already occur anywhere in the exported public lesson content. Scan text files under `dist` for those exact canaries and report only `Private canary leak count: N`; never print an ID, word, reading, meaning, category, or source path. This catches accidental text-only projections as well as complete-record imports without treating legitimate authored overlap as a leak.
4. Exit nonzero on any leak and print `Public artifact safety PASS` otherwise.

Add package scripts:

```json
"audit:public": "tsx scripts/assert-public-artifact-safe.ts",
"audit:public:local": "tsx scripts/assert-public-artifact-safe.ts --tracked --dist dist --private .local/vocabulary/personal-vocabulary-v1.json",
"benchmark:vocabulary-search": "tsx scripts/benchmark-vocabulary-search.ts"
```

The benchmark builds 2,000 invented `ResolvedVocabularyItem` search records, warms up 20 times, times 100 `filterResolvedVocabulary` calls with `performance.now()`, sorts durations, and fails unless p95 is `< 100`. It prints only `2,000 records; p95=<N>ms; limit=100ms`.

- [ ] **Step 3: Run self-test, dependency-boundary, and local privacy scans**

Run:

```powershell
pnpm.cmd exec tsx scripts/assert-public-artifact-safe.ts --self-test
if (rg -n "from ['\"](yauzl|fzstd|sql\.js|wanakana)['\"]" src) { throw 'Development importer dependency leaked under src/.' }
pnpm.cmd benchmark:vocabulary-search
pnpm.cmd export:web
pnpm.cmd audit:public:local
git status --short --ignored '.local'
```

Expected: invented ID and text self-tests PASS; `rg` prints nothing; target Windows benchmark p95 is below 100 ms; export succeeds; local private-value canary count is zero; git shows `.local/` only with `!!`, never tracked.

- [ ] **Step 4: Add the CI-safe boundary check after export**

In `.github/workflows/deploy-pages.yml`, add immediately after `Export installable web app`:

```yaml
      - name: Verify public artifact boundary
        run: pnpm audit:public -- --tracked --dist dist
```

Do not invoke `audit:public:local`, generation, verification, or any private path in CI.

- [ ] **Step 5: Document rights-safe generation and device-local behavior**

Update `README.md` and `GITHUB_PAGES.md` with:

- `.apkg` parsing is a local development operation, never shipped;
- generated output is exactly `.local/vocabulary/personal-vocabulary-v1.json` and remains gitignored;
- the public app contains manager/schema/kana baseline but no private deck record/media;
- generation/verification examples first set `$privateApkg = Read-Host 'Absolute path to the private APKG'`, then pass `--source $privateApkg`, so no source path is written into public documentation;
- import is explicit replacement, backup transfer is manual, Undo last import is persistent but invalidated by later vocabulary changes/affected review;
- Windows download and iPhone Web Share/file-pick instructions;
- clearing browser data/removing the PWA can remove local changes;
- redistribution requires separately documented permission/license covering text, glosses, categories, and arrangement.

- [ ] **Step 6: Verify from a clean public archive with no private source/output**

Run this non-destructive PowerShell sequence:

```powershell
$cleanRoot = Join-Path ([IO.Path]::GetTempPath()) ("nihongo-path-clean-" + [guid]::NewGuid().ToString('N'))
$cleanSource = Join-Path $cleanRoot 'source'
New-Item -ItemType Directory -Path $cleanSource | Out-Null
git add -- scripts/assert-public-artifact-safe.ts scripts/benchmark-vocabulary-search.ts package.json .github/workflows/deploy-pages.yml README.md GITHUB_PAGES.md
$cleanTree = git write-tree
git archive --format=zip --output=(Join-Path $cleanRoot 'source.zip') $cleanTree
Expand-Archive -LiteralPath (Join-Path $cleanRoot 'source.zip') -DestinationPath $cleanSource
Push-Location $cleanSource
$privateFiles = Get-ChildItem -Recurse -File | Where-Object { $_.Name -match '\.(apkg|anki2|anki21b)$' -or $_.FullName -match '[\\/]\.local[\\/]' }
if ($privateFiles) { throw 'Clean archive contains private preparation files.' }
pnpm.cmd install --frozen-lockfile
pnpm.cmd typecheck
pnpm.cmd test
pnpm.cmd export:web
pnpm.cmd audit:public -- --dist dist
Pop-Location
Write-Output "Clean export retained at $cleanRoot"
```

Expected: private-file assertion is silent; install/typecheck/all Vitest/export/audit exit `0`; output prints the unique retained temporary directory for inspection. Do not delete another workspace or reuse a broad temp path.

- [ ] **Step 7: Execute every pre-deployment manual acceptance check**

Create `docs/superpowers/reviews/2026-07-18-vocabulary-import-acceptance.md` and record PASS plus date/device/browser for every locally reproducible item below. Do not claim an installed-iPhone production result in this task: Web Share, service-worker update, and true GitHub Pages offline behavior require the combined deployment and are run by the grammar plan's live gate. Do not commit an unrun or blank pre-deployment result.

1. Windows clean install hydrates before tabs appear; reload preserves progress and a new custom word.
2. Importing the locally generated file previews 1,289 records and replacement copy; confirmation yields 1,717 effective words across Lessons 1–25 with the exact per-lesson accepted counts in Global Constraints.
3. Active/Hidden manager lists scroll virtually; every action remains at least 44 pixels, keyboard reachable, visibly focused, and screen-reader labeled.
4. Windows Japanese IME composition in lesson search/editor does not filter, submit, or show a duplicate until composition ends.
5. Add/edit requires explicit Save, Cancel makes no change, authored Edit is absent, hidden duplicates remain blocked, and the same headword in another lesson is allowed.
6. Hide removes a started word from lesson/due/stat views; Restore and temporary Undo return the exact prior due date, interval, repetitions, ease, and last-review time.
7. Import replacement leaves unrelated vocabulary, grammar schedules, and lesson progress unchanged; incoming unstarted-lesson records receive no card until that lesson starts.
8. Reload preserves Undo last import; rating an affected card removes it, while rating an unrelated card does not; any successful vocabulary mutation removes it.
9. Windows export downloads successfully, cancelled picking shows no error, fallback download revokes its URL, and selecting the same JSON file twice fires both picker events.
10. Non-JSON, oversized, wrong-version, duplicate-ID, unknown-lesson, and invented grammar-card payloads each report issues and change neither visible nor reloaded state.
11. In Windows DevTools, temporarily replace `Storage.prototype.setItem` with a function that throws `QuotaExceededError`, attempt a mutation, and verify the persistent banner plus unchanged UI/reload state; reload to restore the browser prototype.
12. After one online localhost load, set DevTools Network to Offline and reopen the installed Windows PWA; existing lessons, personal vocabulary, and manager open offline.
13. Inspect the two target responsive widths and Windows keyboard layouts; no control is clipped by the keyboard, bottom tabs, or modal safe area.
14. Run `pnpm.cmd benchmark:vocabulary-search` on the target Windows PC and record p95 below 100 ms for 2,000 records.
15. Inspect `dist`, the clean archive, `git status --short`, and the local private-value canary scan; no private record/media/source package is tracked or exported.

- [ ] **Step 8: Run the final vocabulary gate**

Run:

```powershell
pnpm.cmd typecheck
pnpm.cmd test
pnpm.cmd export:web
pnpm.cmd audit:public -- --tracked --dist dist
pnpm.cmd audit:public:local
git status --short
```

Expected: all commands exit `0`, local private-value canary count is zero, every pre-deployment result in the review is PASS, and `git status --short` shows only the Task 14 public files ready to commit. The ignored private file does not appear.

- [ ] **Step 9: Commit public verification and acceptance evidence**

```powershell
git add -- scripts/assert-public-artifact-safe.ts scripts/benchmark-vocabulary-search.ts package.json .github/workflows/deploy-pages.yml README.md GITHUB_PAGES.md docs/superpowers/reviews/2026-07-18-vocabulary-import-acceptance.md
git diff --cached --name-only
git commit -m "test: verify vocabulary privacy and local behavior"
```

Expected: one commit contains exactly the seven listed public code/config/docs paths; no private source/output or generated record is staged, and the review makes no untested production-iPhone claim.

---

## Combined release gate

Do not push after Task 14 by itself. Execute the separate grammar enrichment plan, then from the combined clean tree run:

```powershell
pnpm.cmd typecheck
pnpm.cmd test
pnpm.cmd export:web
pnpm.cmd audit:public -- --tracked --dist dist
git status --short
```

Expected: TypeScript, every Vitest file, Expo export, and public audit pass; the tree is clean; all vocabulary, grammar example, and dialogue readings satisfy the final kana rules; no private deck content/media is present. Only then follow the grammar plan's reviewed `main` push/deployment handoff. Immediately after that deployment, its live gate must verify iPhone update-without-reinstall, Japanese keyboard composition, portrait/landscape/notch safe areas, VoiceOver labels, Web Share and cancellation, same-file picking, Windows-to-iPhone backup transfer, schedule preservation, and airplane-mode reopening; it then appends and commits those live results.

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-18-vocabulary-import-management.md`. Two execution options:

1. **Subagent-Driven (recommended)** — use `superpowers:subagent-driven-development`, dispatch one fresh implementation subagent per task, and perform requirements then quality review before the next task.
2. **Inline Execution** — use `superpowers:executing-plans` in a separate implementation session, execute task batches, and stop at review checkpoints.
