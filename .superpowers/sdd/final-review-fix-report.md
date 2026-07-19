# Final Whole-Branch Review Fix Report

## Status

`DONE_WITH_CONCERNS`

All four Important and three Minor findings are fixed and covered by focused tests. The complete automated verification matrix passes. The remaining concern is the explicitly deferred manual Windows/iPhone execution gate; no manual PASS is claimed here.

## Scoped implementation commits

- `009d94a926bd950600eb8d76a44c63ecbcb14bb9` — `fix: guard persisted mutations and async UI effects`
- `ebffdbd9270acd0d4b702e53481182ee9acb751e` — `build: harden offline export and originality audits`

## Finding-by-finding RED/GREEN evidence

### Important 1 — production offline bootstrap

- RED: the synthetic export test failed because no build-time service-worker generator existed; the later explicit `private/operator-notes.txt` exclusion regression also failed by appearing in the precache.
- GREEN: `scripts/generate-service-worker.test.ts` passes 1/1. It proves deterministic content-versioned cache names, root shell/manifest/icons, hashed Metro JS and generated assets, cache-version changes on content changes, and exclusion of source maps, `.local`, known personal-vocabulary formats, and explicit private directories.
- Production integration: `export:web` now runs Expo export and then generates `dist/sw.js`; registration begins immediately under the existing HTTPS/loopback guard and all paths resolve relative to the service-worker scope for GitHub Pages base paths.

### Important 2 — clock rollback and backups

- RED: the backward-clock mutation regression received raw `2026-07-15T00:00:00.000Z` record time instead of the monotonic `2026-07-17T00:00:00.001Z` boundary.
- GREEN: `src/services/vocabularyMutations.test.ts` passes 23/23. Add/edit timestamps are floored by vocabulary revision and record creation/update times; hide/restore preserve record timestamps; review schedule identity is preserved; a strict V2 backup validates successfully without relaxing validation.

### Important 3 — Metro private-text canaries

- RED: the safety self-test missed single-quoted English and lowercase/uppercase Unicode-escaped Japanese JavaScript literals. A real local audit then exposed three false positives from common single-word runtime literals (lengths 9, 8, and 5; no private values were printed).
- GREEN: the public-artifact safety self-test passes. Exact single/double-quoted raw and `\\uXXXX` lower/uppercase encodings are enumerated, prefix/suffix controls remain negative, identity canaries are unchanged, and field-specific distinctiveness thresholds retain Japanese/reading values of at least 4 code points and English/category values of at least 12 code points to avoid common-runtime collisions. The real ignored 1,289-record fixture audit passes with 0 leaks.

### Important 4 — async route UI lifecycle

- RED: lifecycle/source contract tests failed before the coordinator existed; a later regression showed an action started inactive could revive after activation.
- GREEN: `src/screens/routeUiLifecycle.test.ts` passes 9/9. Slow lesson start, word create/update, and exercise persistence results are dropped after blur/removal/unmount; inactive-start work cannot revive; active success/failure results still apply. The three screens retain action locks and route all post-await state/navigation through the mounted/focused/removal-aware coordinator.

### Minor 1 — GrammarCard latest-attempt safety

- RED: four deferred-promise/source-contract assertions failed before GrammarCard used a latest-attempt mounted coordinator.
- GREEN: GrammarCard and reference-influence focused suites pass 19/19. Both settlement orders retain only the newest attempt, post-unmount resolution is dropped, `Linking.openURL` is invoked receiver-safely, and per-card state remains independent.

### Minor 2 — cross-point grammar originality

- RED: the corpus integrity test failed before the normalized cross-record implementation existed.
- GREEN: the complete content-integrity suite passes 32/32. All 101 grammar prose records have zero cross-point exact overlap at the explicit 12-token threshold, using NFKC/lowercase/apostrophe normalization, Latin word tokens, and individual Han/kana tokens. No exception list is used.

### Minor 3 — reproducible source-originality evidence

- RED: focused tests initially failed because the offline audit/parser/core modules did not exist.
- GREEN: `scripts/audit-grammar-originality.test.ts` passes 4/4 for argument forwarding, normalization/tokenization, threshold detection, and shorter/reordered/within-app negatives. The real audit verified pinned full revision `7aa1ac106726adf4e3d9814bc0d680bedbd00d1b`, clean scope `public/learn/grammar/**/*.md`, 3,099 app-authored fields, 61 source Markdown files, and 0 12-token overlaps. Source content was neither vendored nor emitted.

## Complete verification

- `pnpm.cmd typecheck` — PASS.
- `pnpm.cmd test` — PASS: 30 test files, 390 tests.
- `$env:EXPO_BASE_URL='/Japanese-Language-App'; pnpm.cmd export:web` — PASS: web bundle `_expo/static/js/web/index-30615fc38c5c8dc1bb81a6616b16e49e.js` and generated cache `nihongo-path-precache-b639cfd51925ff1f`.
- Generated service-worker inspection — PASS: 20 precache entries, including 1 hashed Metro JS bundle and 11 generated asset files plus the public shell; no private/local artifacts.
- iOS/Hermes export — PASS: `_expo/static/js/ios/index-8475cfa081fa498c390d618d0d456cb9.hbc`, 2.84 MB. The first sandboxed attempt was denied permission to execute the bundled `hermesc.exe`; the exact approved rerun passed, and a second committed-state rerun also passed.
- `pnpm.cmd audit:public -- --tracked --dist dist` — PASS.
- `pnpm.cmd audit:public:local` — PASS: 0 private canary leaks and the fixture count remains 1,289.
- `pnpm.cmd audit:grammar-originality -- --source <pinned-checkout>` — PASS: pinned revision/scope/counts above and 0 overlaps.
- `git diff --check` — PASS.
- Commit/path-scope audit — PASS; only the pre-existing untracked vocabulary acceptance draft remains outside the commits.

## Changed-path audit

Commit `009d94a9`:

- `src/components/GrammarCard.tsx`
- `src/components/ReferenceInfluencesCard.tsx`
- `src/components/grammarCardPresentation.test.ts`
- `src/components/grammarCardPresentation.ts`
- `src/components/latestAttemptCoordinator.ts`
- `src/content/referenceInfluences.ts`
- `src/screens/ExerciseScreen.tsx`
- `src/screens/LessonDetailScreen.tsx`
- `src/screens/WordEditorScreen.tsx`
- `src/screens/routeUiLifecycle.test.ts`
- `src/screens/routeUiLifecycle.ts`
- `src/screens/useRouteUiLifecycle.ts`
- `src/services/vocabularyMutations.test.ts`
- `src/services/vocabularyMutations.ts`

Commit `ebffdbd9`:

- `docs/superpowers/reviews/2026-07-18-grammar-enrichment-review.md`
- `package.json`
- `public/index.html`
- `scripts/assert-public-artifact-safe.ts`
- `scripts/audit-grammar-originality.test.ts`
- `scripts/audit-grammar-originality.ts`
- `scripts/generate-service-worker.test.ts`
- `scripts/generate-service-worker.ts`
- `scripts/grammar-originality-core.ts`
- `src/data/lessons/contentIntegrity.test.ts`

This report is the only additional path in its own reporting commit. `docs/superpowers/reviews/2026-07-18-vocabulary-import-acceptance.md` was neither read for implementation, modified, staged, nor committed.

## Remaining execution gate

- Manual Windows and physical-iPhone verification was intentionally not recorded as PASS and remains a real post-fix gate.
- No changes were pushed.
