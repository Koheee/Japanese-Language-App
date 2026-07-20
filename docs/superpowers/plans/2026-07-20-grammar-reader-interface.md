# Grammar Reader Interface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the visible study workflow with a responsive, accessible grammar reader containing only the lesson list and Overview, Grammar, and Dialogue sections.

**Architecture:** Keep the `StudyProvider` and dormant study implementation intact, but register only the two-screen lesson stack. Simplify list/detail screens, then render the enriched grammar and dialogue data through focused presentation components with one optional lesson-level reference section.

**Tech Stack:** React Native 0.81, React Native Web 0.21, Expo 54, TypeScript 5.9, React Navigation 7, Vitest 3.

## Global Constraints

- This plan begins only after the grammar-content plan passes its content review gate.
- The visible app contains only the lesson list and Lesson Detail.
- Lesson Detail contains exactly Overview, Grammar, and Dialogue.
- Review, Progress, Exercise, Words, Vocabulary Manager, Word Editor, and Import Preview are not registered or linked.
- Dormant source files, lesson vocabulary/exercises, `StudyProvider`, persistence keys, backups, and stored user data remain intact.
- The lesson quick-switcher remains on every lesson page and preserves the active one of three sections.
- Back returns directly to the lesson list after any number of quick switches.
- No progress percentage, review count, word count, drill count, practice action, or vocabulary-management action is rendered.
- Core grammar and dialogue explanations require no external link.
- External references appear once, collapsed, after the Grammar cards.
- Japanese, kana reading, and English are shown; no romaji is introduced.
- Every interactive target is at least 44 points high, with explicit native and web accessibility state.
- The layout must fit 390×844 and 430×932 iPhone viewports without horizontal overflow.
- No dependency or lockfile change is allowed.

---

## File structure

- Create `src/navigation/readerNavigation.test.ts`: registered-route and dormant-data boundary contract.
- Modify `src/navigation/AppNavigator.tsx`: direct two-screen stack.
- Retain `src/navigation/types.ts`: dormant screen types remain compilable; visible routes are a subset.
- Create `src/screens/readerLessonList.test.ts`: static curriculum/list-card source contract.
- Modify `src/screens/LessonListScreen.tsx`: remove study-state consumption and activity metrics.
- Modify `src/components/LessonCard.tsx`: remove progress props and rendering.
- Create `src/screens/readerLessonDetail.test.ts`: three-section and removed-feature contract.
- Modify `src/screens/LessonDetailScreen.tsx`: focused shell, Overview, Grammar, Dialogue.
- Modify `src/screens/lessonQuickSwitcherIntegration.test.ts`: preserve only the three supported sections and simplify switching state.
- Create `src/components/GrammarFormationList.tsx`: narrow-screen formation equations.
- Modify `src/components/GrammarCard.tsx`: complete internal teaching sequence, no per-card links.
- Modify `src/components/grammarCardPresentation.ts`: pure insight/deeper expansion model.
- Modify `src/components/grammarCardPresentation.test.ts`: new projection and accessibility contract.
- Create `src/components/lessonReferencePresentation.ts`: reference deduplication, collapsed state, and opener result.
- Create `src/components/lessonReferencePresentation.test.ts`: pure model tests.
- Create `src/components/LessonReferenceSection.tsx`: one collapsed optional reference area.
- Create `src/components/lessonReferenceAccessibility.test.ts`: source accessibility contract.
- Create `src/components/dialogueGrammarNotesModel.ts`: resolve same-lesson notes to labels.
- Create `src/components/dialogueGrammarNotesModel.test.ts`: resolution and selection tests.
- Create `src/components/DialogueGrammarNotes.tsx`: expandable contextual notes.
- Create `src/components/dialogueGrammarNotesAccessibility.test.ts`: source accessibility contract.
- Modify `src/components/DialogueBubble.tsx`: render contextual annotations.
- Modify `src/screens/accessibilityContracts.test.ts`: freeze three-tab semantics and removed route behavior.

---

### Task 1: Register only the grammar-reader stack

**Files:**
- Create: `src/navigation/readerNavigation.test.ts`
- Modify: `src/navigation/AppNavigator.tsx`
- Verify: `src/navigation/types.ts`

**Interfaces:**
- Preserves `LearnStackParamList` so dormant screens compile.
- Produces `AppNavigator` with only `Lessons` and `LessonDetail` registered.

- [ ] **Step 1: Write the failing route contract**

Create `src/navigation/readerNavigation.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const navigator = readFileSync(join(import.meta.dirname, 'AppNavigator.tsx'), 'utf8');
const app = readFileSync(join(import.meta.dirname, '..', '..', 'App.tsx'), 'utf8');

describe('grammar reader navigation', () => {
  it('registers only Lessons and LessonDetail', () => {
    expect(navigator).not.toContain('createBottomTabNavigator');
    expect(navigator).not.toContain('MainTabsNavigator');
    expect(navigator.match(/<LearnStack\.Screen/g)).toHaveLength(2);
    expect(navigator).toContain('name="Lessons"');
    expect(navigator).toContain('name="LessonDetail"');
  });

  it.each(['ExerciseScreen', 'ReviewScreen', 'ProgressScreen', 'VocabularyManagerScreen', 'WordEditorScreen', 'ImportPreviewScreen'])(
    'does not import or register %s',
    (screen) => expect(navigator).not.toContain(screen),
  );

  it('keeps study hydration mounted so stored data is not migrated or erased', () => {
    expect(app).toContain('<StudyProvider>');
    expect(app).toContain('<HydrationGate>');
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

```powershell
pnpm.cmd test -- src/navigation/readerNavigation.test.ts
```

Expected: FAIL because bottom tabs and dormant routes are still registered.

- [ ] **Step 3: Simplify `AppNavigator`**

Remove bottom-tab, safe-area-tab-bar, dormant-screen, and root-stack imports. Keep one `LearnStack` and render it directly inside `NavigationContainer`:

```tsx
export function AppNavigator() {
  return (
    <NavigationContainer theme={navigationTheme}>
      <LearnStack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: colors.paper },
        }}
      >
        <LearnStack.Screen name="Lessons" component={LessonListScreen} />
        <LearnStack.Screen name="LessonDetail" component={LessonDetailScreen} />
      </LearnStack.Navigator>
    </NavigationContainer>
  );
}
```

Do not remove old route types or dormant screens; they must still typecheck as unreachable source.

- [ ] **Step 4: Verify focused tests and TypeScript**

```powershell
pnpm.cmd test -- src/navigation/readerNavigation.test.ts
pnpm.cmd typecheck
```

Expected: PASS and TypeScript exit `0`.

- [ ] **Step 5: Commit Task 1**

```powershell
git add -- src/navigation/AppNavigator.tsx src/navigation/readerNavigation.test.ts
git commit -m "feat: focus navigation on lesson reading"
```

---

### Task 2: Remove activity state from the lesson list

**Files:**
- Create: `src/screens/readerLessonList.test.ts`
- Modify: `src/screens/LessonListScreen.tsx`
- Modify: `src/components/LessonCard.tsx`

**Interfaces:**
- `LessonCard` changes to `{ lesson: LessonOutline; onPress: () => void }`.
- `LessonListScreen` consumes static curriculum and grammar totals only.

- [ ] **Step 1: Write the failing static-list contract**

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const screen = readFileSync(join(import.meta.dirname, 'LessonListScreen.tsx'), 'utf8');
const card = readFileSync(join(import.meta.dirname, '..', 'components', 'LessonCard.tsx'), 'utf8');

describe('grammar reader lesson list', () => {
  it('shows curriculum totals rather than study activity', () => {
    expect(screen).toContain('101');
    expect(screen).toContain('grammar points');
    expect(screen).not.toContain('useStudy');
    expect(screen).not.toContain('reviews due');
    expect(screen).not.toContain('getProgress');
  });

  it('renders cards without progress state', () => {
    expect(card).not.toContain('ProgressBar');
    expect(card).not.toContain('progress: number');
    expect(card).not.toContain('Ready to begin');
    expect(screen).not.toContain('progress={');
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

```powershell
pnpm.cmd test -- src/screens/readerLessonList.test.ts
```

Expected: FAIL on current review and progress UI.

- [ ] **Step 3: Make list data static**

Remove `useStudy`, `getLesson`, progress calculations, and the `progress` prop. Change the summary card to:

```tsx
<View style={styles.summaryItem}>
  <Text style={styles.summaryValue}>25</Text>
  <Text style={styles.summaryLabel}>lessons</Text>
</View>
<View style={styles.divider} />
<View style={styles.summaryItem}>
  <Text style={styles.summaryValue}>101</Text>
  <Text style={styles.summaryLabel}>grammar points</Text>
</View>
<View style={styles.divider} />
<View style={styles.summaryItem}>
  <Text style={styles.summaryValue}>A1–A2</Text>
  <Text style={styles.summaryLabel}>reading path</Text>
</View>
```

Render each card as:

```tsx
<LessonCard
  lesson={item}
  onPress={() => navigation.navigate('LessonDetail', { lessonId: item.id })}
/>
```

- [ ] **Step 4: Simplify `LessonCard`**

Remove the `ProgressBar` import and all progress/preview branches. Keep number, titles, summary, and chevron. Change the signature to:

```ts
export function LessonCard({ lesson, onPress }: {
  lesson: LessonOutline;
  onPress: () => void;
})
```

The card remains a large Pressable and keeps its ready/outline number color only as curriculum metadata.

- [ ] **Step 5: Verify focused tests and TypeScript**

```powershell
pnpm.cmd test -- src/screens/readerLessonList.test.ts
pnpm.cmd typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit Task 2**

```powershell
git add -- src/screens/LessonListScreen.tsx src/components/LessonCard.tsx src/screens/readerLessonList.test.ts
git commit -m "feat: present lessons as a grammar reading path"
```

---

### Task 3: Reduce Lesson Detail to Overview, Grammar, and Dialogue

**Files:**
- Create: `src/screens/readerLessonDetail.test.ts`
- Modify: `src/screens/LessonDetailScreen.tsx`
- Modify: `src/screens/lessonQuickSwitcherIntegration.test.ts`
- Modify: `src/screens/accessibilityContracts.test.ts`

**Interfaces:**
- `Tab` becomes `'overview' | 'grammar' | 'dialogue'`.
- `handleLessonSelect(lessonId)` preserves `activeTab`, updates route params, and hands focus to the new quick-switch trigger.
- Produces a static Overview model derived from lesson goals, grammar, and dialogue.

- [ ] **Step 1: Write the failing three-section contract**

Create tests that assert:

```ts
expect(source).toContain("type Tab = 'overview' | 'grammar' | 'dialogue';");
expect(source).toContain("{ id: 'overview', label: 'Overview' }");
expect(source).toContain("{ id: 'grammar', label: 'Grammar' }");
expect(source).toContain("{ id: 'dialogue', label: 'Dialogue' }");
expect(source).not.toContain("id: 'words'");

for (const removed of [
  'CompositionAwareTextInput', 'PrimaryButton', 'ProgressBar', 'useStudy',
  'beginPractice', 'practiceFooter', 'VocabularyManager', "navigate('Exercise'",
  'lesson.exercises.length', 'lesson.vocabulary.length',
]) expect(source).not.toContain(removed);

expect(source).toContain('label="patterns"');
expect(source).toContain('label="dialogue lines"');
expect(source).not.toContain('label="words"');
expect(source).not.toContain('label="drills"');
```

- [ ] **Step 2: Run detail and quick-switch tests; verify RED**

```powershell
pnpm.cmd test -- src/screens/readerLessonDetail.test.ts src/screens/lessonQuickSwitcherIntegration.test.ts src/screens/accessibilityContracts.test.ts
```

Expected: FAIL on Words, practice state, composite navigation, and four-section assumptions.

- [ ] **Step 3: Simplify imports, props, state, and switching**

Use only:

```ts
type Props = NativeStackScreenProps<LearnStackParamList, 'LessonDetail'>;
type Tab = 'overview' | 'grammar' | 'dialogue';
```

Remove Words queries, practice locks, study context, completion calculations, and exercise navigation. Keep the focus-handoff ref and use:

```ts
const handleLessonSelect = (lessonId: string) => {
  lessonSwitcherFocusTargetRef.current = lessonId;
  navigation.setParams({ lessonId });
};
```

Remove the outline-only fallback, `getLessonOutline`, Vocabulary theme, and preview-practice copy because the frozen curriculum guarantees all 25 lessons are ready. Return `null` only for an unknown lesson ID. Render one keyed scrolling `Screen` for all three sections. Keep the quick-switcher without a practice-derived disabled prop.

- [ ] **Step 4: Rebuild Overview**

Keep learner goals and central mental shift. Add a lesson map from `lesson.grammar`:

```tsx
{lesson.grammar.map((point, index) => (
  <Pressable
    accessibilityLabel={`Open grammar ${index + 1}: ${point.title}`}
    accessibilityRole="button"
    key={point.id}
    onPress={() => setActiveTab('grammar')}
    style={styles.grammarMapRow}
  >
    <Text style={styles.grammarMapPattern}>{point.pattern}</Text>
    <Text style={styles.grammarMapMeaning}>{point.plainEnglish}</Text>
  </Pressable>
))}
```

The At a glance area contains `lesson.grammar.length`, `lesson.dialogue.length`, and the lesson theme/scenario only.

- [ ] **Step 5: Update quick-switch and accessibility contracts**

Change the integration test to expect one keyed Screen, no query clearing, no `disabled={isStarting}`, and the same focus handoff. Add assertions that `activeTab` is not changed by the selector and each of the three tabs forwards `selected` through `accessibilityState` and `aria-selected`.

- [ ] **Step 6: Verify focused tests and TypeScript**

```powershell
pnpm.cmd test -- src/screens/readerLessonDetail.test.ts src/screens/lessonQuickSwitcherIntegration.test.ts src/screens/accessibilityContracts.test.ts
pnpm.cmd typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit Task 3**

```powershell
git add -- src/screens/LessonDetailScreen.tsx src/screens/readerLessonDetail.test.ts src/screens/lessonQuickSwitcherIntegration.test.ts src/screens/accessibilityContracts.test.ts
git commit -m "feat: focus lessons on overview grammar and dialogue"
```

---

### Task 4: Render the complete internal grammar teaching sequence

**Files:**
- Create: `src/components/GrammarFormationList.tsx`
- Modify: `src/components/GrammarCard.tsx`
- Modify: `src/components/grammarCardPresentation.ts`
- Modify: `src/components/grammarCardPresentation.test.ts`

**Interfaces:**
- Consumes required `GrammarPoint.formation`, `contrast`, and optional `beyondBasics` from the content plan.
- Produces independent `insightExpanded`, `deeperExpanded`, and focus state through a pure presentation model.
- `GrammarCard` no longer opens external links.

- [ ] **Step 1: Replace old projection tests with the new teaching contract**

Test that the collapsed projection contains two accessible toggles:

```ts
expect(projectGrammarCard(point, createGrammarCardState())).toMatchObject({
  insightToggle: {
    accessibilityRole: 'button',
    accessibilityState: { expanded: false },
    minimumTouchTarget: 44,
  },
  deeperToggle: {
    accessibilityRole: 'button',
    accessibilityState: { expanded: false },
    minimumTouchTarget: 44,
  },
  insight: null,
  deeper: null,
});
```

Add source assertions that the card renders `THE BASICS`, `BUILD THE FORM`, `WHEN IT FITS`, `COMPARE IT`, `EXAMPLES`, and `COMMON TURN`, and does not import `Linking` or render `furtherReading`.

- [ ] **Step 2: Run the component tests and verify RED**

```powershell
pnpm.cmd test -- src/components/grammarCardPresentation.test.ts
```

Expected: FAIL because the old insight model includes references and lacks formation/contrast/deeper sections.

- [ ] **Step 3: Implement the pure card state**

Use:

```ts
export interface GrammarCardState {
  insightExpanded: boolean;
  deeperExpanded: boolean;
  focusedToggle: 'insight' | 'deeper' | null;
}

export const createGrammarCardState = (): GrammarCardState => ({
  insightExpanded: false,
  deeperExpanded: false,
  focusedToggle: null,
});
```

Provide immutable `toggleGrammarCardSection`, `setGrammarCardToggleFocused`, and `projectGrammarCard`. The insight projection contains only `whyItWorks` and `usageBoundary`. The deeper projection contains `notes` plus `beyondBasics`. Do not project `furtherReading`.

- [ ] **Step 4: Create `GrammarFormationList`**

Render every formation row as a label, a wrap-safe formula panel, and an explanation. The formula uses selectable text on web where React Native permits it, never uses a fixed width, and has `flexShrink: 1`/`width: '100%'` so long conjugation equations wrap at 390 pixels.

- [ ] **Step 5: Rebuild `GrammarCard` in teaching order**

Render:

1. heading and plain-English pill;
2. `THE BASICS` plus `point.explanation`;
3. `GrammarFormationList`;
4. accessible `A JAPANESE-FIRST PICTURE` toggle and content;
5. visible `WHEN IT FITS` boundary;
6. visible `COMPARE IT` with `point.contrast.with` and explanation;
7. original examples;
8. existing common mistake when present;
9. accessible `GO DEEPER` toggle only when notes or `beyondBasics` exist.

Keep decorative plus/minus glyphs hidden from native and web accessibility trees, use fixed border geometry for focus, and remove all per-card external-link state.

- [ ] **Step 6: Verify tests and TypeScript**

```powershell
pnpm.cmd test -- src/components/grammarCardPresentation.test.ts
pnpm.cmd typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit Task 4**

```powershell
git add -- src/components/GrammarFormationList.tsx src/components/GrammarCard.tsx src/components/grammarCardPresentation.ts src/components/grammarCardPresentation.test.ts
git commit -m "feat: teach grammar entirely inside each lesson"
```

---

### Task 5: Move references into one optional lesson section

**Files:**
- Create: `src/components/lessonReferencePresentation.ts`
- Create: `src/components/lessonReferencePresentation.test.ts`
- Create: `src/components/LessonReferenceSection.tsx`
- Create: `src/components/lessonReferenceAccessibility.test.ts`
- Modify: `src/screens/LessonDetailScreen.tsx`

**Interfaces:**
- Produces `createLessonReferenceItems(points): LessonReferenceItem[]`, deduplicated by URL in first-occurrence order.
- Produces `openLessonReference(url, openUrl): Promise<string | null>`.
- `LessonReferenceSection` consumes `points: readonly GrammarPoint[]`.

- [ ] **Step 1: Write failing pure-model tests**

Cover deduplication, empty lessons, original order, no mutation, and link failure:

```ts
expect(createLessonReferenceItems([firstPoint, secondPoint])).toEqual([
  {
    title: "Tae Kim's Guide: Introduction to Particles",
    url: 'https://guidetojapanese.org/learn/grammar/particlesintro',
    accessibilityLabel: "Tae Kim's Guide: Introduction to Particles; opens an external site",
  },
  {
    title: 'Tofugu: Particle は',
    url: 'https://www.tofugu.com/japanese-grammar/particle-wa/',
    accessibilityLabel: 'Tofugu: Particle は; opens an external site',
  },
]);
```

- [ ] **Step 2: Run model tests and verify RED**

```powershell
pnpm.cmd test -- src/components/lessonReferencePresentation.test.ts
```

Expected: FAIL because the model does not exist.

- [ ] **Step 3: Implement the model and collapsed component**

The closed button label is `Optional references for this lesson`, role `button`, and expanded state is forwarded through both `accessibilityState` and `aria-expanded`. Expanded copy says the lesson is complete without these links and that references were used only for editorial cross-checking. Each link has role `link`, a 44-point target, visible focus, and inline failure text with alert/live-region semantics.

Use the existing latest-attempt coordinator pattern so an older opener result cannot overwrite a newer one and unmount drops late results.

- [ ] **Step 4: Render the section once after all Grammar cards**

In the Grammar branch of `LessonDetailScreen`, add:

```tsx
<LessonReferenceSection points={lesson.grammar} />
```

Do not render it in Overview, Dialogue, or inside `GrammarCard`.

- [ ] **Step 5: Verify model, accessibility, and integration tests**

```powershell
pnpm.cmd test -- src/components/lessonReferencePresentation.test.ts src/components/lessonReferenceAccessibility.test.ts src/screens/readerLessonDetail.test.ts
pnpm.cmd typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit Task 5**

```powershell
git add -- src/components/lessonReferencePresentation.ts src/components/lessonReferencePresentation.test.ts src/components/LessonReferenceSection.tsx src/components/lessonReferenceAccessibility.test.ts src/screens/LessonDetailScreen.tsx
git commit -m "feat: make lesson references optional and secondary"
```

---

### Task 6: Explain grammar in dialogue context

**Files:**
- Create: `src/components/dialogueGrammarNotesModel.ts`
- Create: `src/components/dialogueGrammarNotesModel.test.ts`
- Create: `src/components/DialogueGrammarNotes.tsx`
- Create: `src/components/dialogueGrammarNotesAccessibility.test.ts`
- Modify: `src/components/DialogueBubble.tsx`
- Modify: `src/screens/LessonDetailScreen.tsx`

**Interfaces:**
- Produces `createDialogueGrammarNoteItems(turn, points): DialogueGrammarNoteItem[]`.
- Each item contains `grammarId`, `title`, `pattern`, `explanation`, and complete accessibility text.
- `DialogueBubble` changes to `{ turn; grammar; alignRight }`.

- [ ] **Step 1: Write failing resolution tests**

Test exact order, same-lesson resolution, missing IDs, and no mutation:

```ts
expect(createDialogueGrammarNoteItems(turn, points)).toEqual([
  {
    grammarId: 'l1-topic-copula',
    title: 'Make a noun the topic, then identify it',
    pattern: 'A は B です',
    explanation: turn.grammarNotes![0]!.explanation,
    accessibilityLabel: 'Grammar in this line: Make a noun the topic, then identify it; A は B です',
  },
]);
```

Unknown or mismatched note IDs must be omitted defensively; content integrity remains responsible for rejecting them in authored data.

- [ ] **Step 2: Run model tests and verify RED**

```powershell
pnpm.cmd test -- src/components/dialogueGrammarNotesModel.test.ts
```

Expected: FAIL because the model does not exist.

- [ ] **Step 3: Implement the model and component**

Render compact buttons beneath the translated line. Each has at least 44 points, button role, selected/expanded state through native and ARIA props, visible focus, and the pattern as its visible label. Selecting one reveals its title and contextual explanation inside the bubble. Selecting it again collapses it; selecting another note shows only the newer note.

- [ ] **Step 4: Integrate with dialogue bubbles**

Pass `lesson.grammar` into every bubble:

```tsx
<DialogueBubble
  alignRight={index % 2 === 1}
  grammar={lesson.grammar}
  key={turn.id}
  turn={turn}
/>
```

Inside `DialogueBubble`, render `<DialogueGrammarNotes grammar={grammar} turn={turn} />` after the English line. Lines without notes render no empty container.

- [ ] **Step 5: Verify focused tests and TypeScript**

```powershell
pnpm.cmd test -- src/components/dialogueGrammarNotesModel.test.ts src/components/dialogueGrammarNotesAccessibility.test.ts src/screens/readerLessonDetail.test.ts
pnpm.cmd typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit Task 6**

```powershell
git add -- src/components/dialogueGrammarNotesModel.ts src/components/dialogueGrammarNotesModel.test.ts src/components/DialogueGrammarNotes.tsx src/components/dialogueGrammarNotesAccessibility.test.ts src/components/DialogueBubble.tsx src/screens/LessonDetailScreen.tsx
git commit -m "feat: explain grammar inside lesson dialogues"
```

---

### Task 7: Combined production verification and deployment

**Files:**
- Verify only unless a failing check produces a focused RED/GREEN correction.

**Interfaces:**
- Consumes both completed plans and all quick-switcher commits.
- Produces one reviewed GitHub Pages release and an explicit physical-iPhone handoff.

- [ ] **Step 1: Verify repository and dependency scope**

```powershell
git status --short
pnpm.cmd install --frozen-lockfile
git diff --check
git diff --exit-code -- package.json pnpm-lock.yaml
```

Expected: installation exits `0`; no dependency files changed; only the protected pre-existing untracked acceptance note remains outside committed work.

- [ ] **Step 2: Run complete automated verification**

```powershell
pnpm.cmd typecheck
pnpm.cmd test
$saerisSource = Join-Path (Get-Location) '.local/reference-sources/guide-to-japanese'
if (-not (Test-Path -LiteralPath $saerisSource)) {
  git clone https://github.com/Saeris/guide-to-japanese.git $saerisSource
}
git -C $saerisSource fetch origin
git -C $saerisSource checkout --detach 7aa1ac10
pnpm.cmd audit:grammar-originality -- --source $saerisSource
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

Expected: every command exits `0`; the service worker contains one hashed bundle and no private or local path; the iOS export contains one inspected Hermes bytecode bundle. Remove only verified worktree-local `dist-ios` after inspection.

- [ ] **Step 3: Run responsive browser acceptance at both iPhone sizes**

Serve the normal-base export and inspect 390×844 and 430×932. Verify:

- the app opens to the 25-lesson list with no bottom bar, review count, or progress bar;
- every lesson has only Overview, Grammar, and Dialogue;
- quick-switching preserves each of those three sections and Back remains direct;
- all 101 grammar cards expose the teaching headings and no per-card external link;
- representative short and long formation equations wrap without clipping;
- Japanese-first and Go deeper sections support touch, Enter/Space, Escape where applicable, visible focus, and correct expanded state;
- Dialogue labels reveal the correct line-specific note and do not overflow either bubble alignment;
- Optional references are collapsed initially, deduplicated, secondary, and failure-safe;
- no removed study destination or management control is visible;
- no horizontal scrolling, hidden text, or sub-44-point control appears.

- [ ] **Step 4: Request final code and content review**

Use `superpowers:requesting-code-review` against `origin/main..HEAD`. Any Critical or Important finding requires a focused failing regression test, minimal correction, and a repeat of Steps 1–3. Final reviewer assessment must be `Ready to merge? Yes`.

- [ ] **Step 5: Fast-forward deploy the exact verified HEAD**

```powershell
git fetch origin main --tags
git merge-base --is-ancestor origin/main HEAD
if ($LASTEXITCODE -ne 0) { throw 'Release is not a fast-forward of origin/main.' }
git push origin HEAD:main
```

Watch `Test and deploy Nihongo Path` to success for the exact pushed commit. Confirm the production URL returns HTTP 200 and its deployed bundle contains `Overview`, `Grammar`, `Dialogue`, `BUILD THE FORM`, and `Optional references for this lesson`, while removed navigation labels are absent from reachable UI.

- [ ] **Step 6: Guide and record the physical iPhone check**

Without uninstalling the PWA or clearing site data, have the learner:

1. open the installed app online;
2. wait for the update, close it fully, and reopen it;
3. verify portrait and landscape safe areas;
4. verify VoiceOver tab, expanded, selected, and dialogue-note labels;
5. verify several lesson switches on all three sections;
6. confirm the old device-local vocabulary and study data were not cleared;
7. enable airplane mode and reopen once after the successful online load.

Record observed results only. Do not claim physical-iPhone PASS before the learner performs these checks.
