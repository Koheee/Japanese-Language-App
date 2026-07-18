# Personal Vocabulary Import and Management Design

**Status:** Approved direction, revised after technical and redistribution review on 2026-07-18
**Scope:** Text-only personal vocabulary import for Lessons 1–25, device-local vocabulary management, spaced-repetition reconciliation, kana readings, and JSON backup/restore.

## Context

The supplied Anki package contains 1,372 notes arranged into 25 lesson subdecks. Each note has seven fields: source ID, Japanese word, kana reading, romaji, English meaning, category, and picture. The package also contains 1,372 audio files and 1,328 images.

The app currently bundles 428 authored vocabulary items. Normalized, same-lesson comparison finds 82 source-to-authored matches. The source also contains one same-lesson normalized-headword duplicate in Lesson 10. Applying the approved same-lesson rule keeps the lower numeric source ID and skips the later duplicate, leaving exactly 1,289 text entries to import. The user chose to preserve the deck's lesson placement, so a word found in another lesson does not suppress its occurrence in the source lesson. The real source IDs and headword remain private and are represented only by invented values in public tests.

The app and GitHub Pages site are public, while redistribution rights for the supplied deck's glosses, categories, and lesson arrangement have not been documented. Personal use does not make a public repository private. The safe default is therefore to generate a local, ignored JSON file that the user imports into browser storage on Windows and iPhone. The `.apkg`, generated personal file, romaji, audio, pictures, and Anki markup are never committed or included in the public web bundle. Promoting deck-derived text into the public baseline requires a separate review with documented redistribution permission.

Existing authored readings that are currently romanized are converted to kana as part of this work. Their IDs, Japanese headwords, meanings, and lesson order remain stable.

## Goals

- Generate exactly 1,289 valid personal records and load them into the user's chosen device while preserving Lessons 1–25.
- Reach 1,717 effective vocabulary records on a clean device with no hidden or custom records after the personal import.
- Keep the 428-item public authored baseline stable apart from converting readings to kana.
- Let the user search, add, edit, hide, restore, export, and import vocabulary on Windows and an installed iPhone PWA.
- Store personal changes locally on each device without a backend.
- Preserve spaced-repetition history when a word is hidden, restored, edited, imported, or refreshed by an app update.
- Keep future GitHub deployments compatible with existing personal changes.

## Non-goals

- Parsing `.apkg` files in the shipped app.
- Committing or publishing deck-derived text without documented redistribution rights.
- Importing the deck's romaji, audio, pictures, card templates, or Anki scheduling data.
- Cloud accounts or automatic synchronization between devices.
- Permanently deleting review history through the normal vocabulary UI.
- Editing the authored public baseline in place on a device.

## Local Import Pipeline

The source package is a local preparation input only. A deterministic development script reads the real Zstandard-compressed `collection.anki21b` database, not the compatibility `collection.anki2` placeholder, and writes a versioned personal-import JSON file to a gitignored local-output directory.

The importer selects the unique note type whose ordered field names are exactly `ID`, `Word`, `Reading`, `Romaji`, `Meaning`, `Category`, and `Picture`; zero or multiple matches fail. For every note using that type, it must:

1. Split `notes.flds` on Anki's U+001F separator.
2. Require exactly one `lessonNN` tag; zero, malformed, or multiple lesson tags fail.
3. Resolve each card's effective deck as `odid` when nonzero and `did` otherwise, and require every associated card to match the tagged lesson deck leaf `LNN 第N課`.
4. Strip `[sound:...]`, image markup, HTML, control characters, and surrounding whitespace.
5. Ignore the romaji and picture fields completely.
6. Normalize comparison text with Unicode NFKC and removal of Unicode whitespace.
7. Skip a note only when the normalized Japanese headword already exists in the same authored lesson or earlier accepted personal record.
8. Auto-fill a missing reading only when the headword contains at least one hiragana or katakana character and otherwise contains only kana, Japanese punctuation, whitespace, numerals, iteration marks, or the prolonged sound mark. Kanji, Latin abbreviations, and mixed-script headwords require an explicit kana reading.
9. Require every stored reading to contain no Latin letters and to consist only of kana plus the permitted punctuation, whitespace, numerals, iteration marks, and prolonged sound mark.
10. Clean the category by taking the English portion after `/` when present; otherwise keep the cleaned source category.
11. Produce a stable ID containing the lesson and numeric source ID, and sort numerically by source ID rather than lexically.

The output includes the 1,289 records, source lesson, stable source ID, format version, authored-baseline version, generation timestamp, and a count/checksum summary. The authored-baseline version is a committed identifier containing a SHA-256 fingerprint of each lesson ID plus the ordered `(vocabulary ID, normalized Japanese headword)` pairs. Headwords use Unicode NFKC with Unicode whitespace removed before hashing, so moved IDs and semantic reuse of a positional ID are both detectable. The frozen current value is `course-v1-25859789e2a3679f09b1ebe6a5f3e981c3c164bf0b8dec7537cd26a0bf933f03`. The local verification command must report exactly 1,289 accepted and 83 skipped same-lesson duplicates: 82 against the authored baseline and one against an earlier accepted source record. Lesson 10 must retain the lower numeric source ID, skip the later duplicate, and contain 68 accepted records without recording either real ID in a tracked file. Public CI tests the importer against wholly invented synthetic fixtures; the source package and generated personal output are not available to CI.

## Vocabulary and Persistence Models

`VocabularyItem` keeps its existing required fields and gains optional metadata:

- `category?: string`
- `source?: 'course' | 'personal-deck' | 'custom'`
- `sourceId?: string`

Undefined `source` on the existing 428 records resolves as `course`; they are not mechanically backfilled. Personal-import records use `source: 'personal-deck'` and the neutral `partOfSpeech: 'vocabulary'` because the source category is thematic rather than grammatical. User-created items use `source: 'custom'` and a stable ID in the `custom:<lesson-id>:<uuid>` namespace.

Device-owned records wrap the shared item with `lessonId`, `createdAt`, `updatedAt`, and a stable sort key. Authored items retain authored order, personal-deck items follow numeric source ID order, and custom items follow creation time. Filtering preserves this order.

The effective vocabulary for a lesson is resolved without mutating its static lesson object:

1. Authored lesson vocabulary.
2. Device-local personal-deck vocabulary.
3. Device-local custom vocabulary.
4. Removal of records whose IDs are locally hidden.

Duplicate checks use the same normalized Japanese comparison as the importer and include active and hidden authored, personal-deck, and custom records in that lesson. Cross-lesson occurrences remain allowed.

## Atomic Device State and Migration

Vocabulary overrides and review schedules must change atomically. Instead of persisting them under independent keys, implementation introduces one `PersistedAppStateV2` envelope under a new AsyncStorage key. It contains:

- Schema version and authored-baseline version.
- Existing lesson progress and review cards.
- Device records grouped by lesson.
- Hidden IDs grouped by lesson.
- Vocabulary last-updated timestamp.
- Optional last-import recovery snapshot.

At startup, a hydration barrier loads V2 before rendering study-dependent navigation or enabling persistence. If V2 is absent, the app reads the current V1 study key, initializes empty vocabulary overrides, reconciles content, writes V2 once, verifies it can be read, and leaves V1 untouched as a migration fallback. Invalid stored data shows a recovery screen and never overwrites either saved state or in-memory defaults.

Vocabulary mutations and backup import build and validate a complete next envelope, persist it with one `setItem`, and update React state only after the write succeeds. A failed write therefore cannot leave review schedules and vocabulary overrides out of sync.

Authored records can be hidden and restored but not rewritten locally. Personal-deck and custom records can be edited while keeping their IDs. All hiding is reversible.

## Spaced-repetition Reconciliation

Review card IDs remain derived from stable vocabulary IDs. Reconciliation runs during migration/hydration, after app content changes, and after each successful vocabulary mutation.

For every started lesson:

- Every current effective vocabulary item has a review card; missing cards are created due immediately.
- Current Japanese prompt, English answer, reading, and category refresh stale display text without changing `dueAt`, interval, repetitions, ease, or last-review time.
- Hidden cards are retained with `suspended: true` and excluded from due queues and review statistics.
- Restored cards are unsuspended with their prior schedule; if no prior card exists, one is created due immediately.
- Orphaned baseline vocabulary cards are retained but suspended, so a later ID restoration can recover their schedule.

Editing a personal or custom item uses the same presentation-only refresh. Starting an unstarted lesson seeds cards from its effective non-hidden vocabulary. `ReviewCard` gains an optional persisted `suspended` field; missing values from existing saves mean `false`.

## Mobile Navigation and UI

The root navigator becomes a stack above the existing tabs. Vocabulary Manager, Word Editor, and Import Preview are full-screen/modal routes reachable from lesson and Progress surfaces. The hydration barrier sits above this navigator.

The lesson Words tab gains:

- A search field matching Japanese, reading, English, and category with NFKC, whitespace, and case normalization.
- An effective visible-word count.
- A `Manage words` action.

The full-screen manager provides Active and Hidden views, search across both, a prominent Add word action, and visible 44-pixel-or-larger Edit, Hide, and Restore controls. Authored items do not show Edit. Hide and Restore show a temporary Undo snackbar that reverses only that mutation; it expires on the next mutation or navigation and is not persisted. Add and Edit use explicit save/cancel rather than a generic undo. `Undo last import` is a separate persistent recovery action.

The editor contains Japanese, kana reading, English meaning, and optional category. Japanese and English are required. The importer/editor share the exact reading and duplicate predicates. During IME composition, input updates neither submit nor display duplicate validation until composition ends.

Keyboard-aware scrolling must support Japanese IME composition on iPhone and Windows. Actions never depend on swipe, hover, or `Alert.alert`. All controls receive accessibility roles, labels, hints, and visible focus treatment.

## Backup, Restore, and Compatibility

The Progress screen gains a Vocabulary backup card with Export, Import, and Undo last import actions. The JSON format contains:

- Format identifier, schema version, export timestamp, and authored-baseline version.
- Personal-deck and custom records.
- Hidden IDs with their lesson IDs, including compatible tombstones.
- Vocabulary review cards associated with included device records or hidden baseline records.

Import validates the entire file before mutation. It rejects unsupported versions, malformed records, duplicate/conflicting IDs, unknown lesson IDs, files larger than 5 MB, and non-JSON input. Every included review record must have `kind: 'vocabulary'`, ID `review-<vocabulary-id>`, a vocabulary ID represented by an included device record or hidden entry, and the matching lesson ID. A crafted backup cannot replace grammar cards.

A differing authored-baseline version produces a preview warning, not silent failure. Known IDs are resolved against the current baseline. A well-formed unknown hidden baseline ID remains as a lesson-scoped tombstone; an ID that now belongs to another lesson or record type is a hard conflict. Local records are self-contained.

Import is an explicit replacement, not a merge. Its affected ID set is the union of old/new device-record IDs and old/new hidden IDs. The next state removes review cards owned by old local records not present in the backup, restores valid incoming associated cards, changes suspension for baseline IDs whose hidden state changed, and reconciles missing cards only for started lessons. Incoming records in unstarted lessons receive no card until that lesson starts. Vocabulary and grammar schedules outside the affected set remain byte-for-byte unchanged.

The same atomic write stores a recovery snapshot containing the previous vocabulary layer, affected review cards, baseline version, and import time. Undo last import survives reload. It is invalidated by the next successful add, edit, hide, restore, import, or undo. A successful review rating also invalidates it when the rated card belongs to the recovery snapshot's affected ID set; unrelated review ratings and lesson progress do not. This prevents Undo from overwriting vocabulary or scheduling work completed after the import.

Export uses Web Share only when both `navigator.share` and `navigator.canShare({ files })` accept the generated file; otherwise it creates a download and revokes the object URL. User-cancelled sharing or picking is not an error. Import resets the file input so the same file can be selected again.

The UI states explicitly that data is device-local and that clearing site data or removing the PWA can remove it.

## Error Handling

- Importer inconsistencies fail generation with source IDs, note IDs, card IDs, and lesson diagnostics.
- AsyncStorage write failures surface a persistent banner and leave both persisted and React state unchanged.
- Malformed backups never partially apply.
- A failed recovery leaves the current validated state untouched.
- Search and empty states distinguish no matches, no hidden words, and unavailable storage.

## Testing and Review

Public Vitest coverage verifies:

- Synthetic importer fixtures for note-type selection, tags, `did`/`odid`, duplicate rules, numeric ordering, category cleaning, and markup removal.
- The shared reading predicate for kana, prolonged sound marks, numerals, Latin abbreviations, mixed kana/kanji, punctuation, and blank readings.
- All 428 authored vocabulary readings contain no Latin letters after the kana migration.
- Effective-list resolution, search normalization, lesson isolation, and stable sorting.
- Add, edit, hide, restore, temporary Undo, and duplicate behavior.
- Started-lesson reconciliation, display refresh, suspension, restoration, orphan handling, and schedule preservation.
- Migration from a frozen current V1 save containing only the original 428-word state.
- Backup validation, baseline-version warnings, exact replacement scope, tombstones, recovery invalidation, and malicious/malformed inputs.
- Failed persistence leaves the prior complete state unchanged after reload.

Local source verification additionally asserts exactly 1,289 generated records, 83 same-lesson skips (82 authored matches plus one source-internal duplicate), expected per-lesson counts, unique IDs, valid lesson mapping, required readings, and absence of romaji, sound tags, image markup, and HTML. The generated file is inspected by `git status` and must remain ignored.

Project-wide verification includes TypeScript, all Vitest tests, and production Expo web export from a clean checkout with no `.apkg` or personal JSON present. Manual acceptance covers Windows and iPhone layout, IME composition, safe areas, persistence, offline reopening after one online load, a 2,000-record search returning within 100 ms on the target Windows PC, backup transfer, repeat file selection, share/download fallbacks, and storage-error messaging.

## Deployment and Redistribution Gate

The public deployment contains the manager, backup system, importer-compatible schema, kana-authored readings, and grammar work, but no supplied-deck records. The personal JSON is generated and imported locally after deployment. A later change may bundle deck-derived records only after the user supplies documented permission or compatible license terms covering redistribution of the text, glosses, categories, and arrangement; that change requires a separate explicit review.

After vocabulary and grammar acceptance criteria pass, public code changes are pushed to `main`. The existing GitHub Actions workflow tests, exports, and deploys the same Pages URL.

## Acceptance Criteria

- Local generation accepts exactly 1,289 records and a clean device with no hidden or custom records shows 1,717 effective words after import.
- A clean public checkout exports successfully without the `.apkg` and contains none of the personal deck text or media.
- All app reading fields use kana rather than romaji; Latin text may remain only in Japanese surface forms such as genuine abbreviations, never as a reading.
- Search remains responsive in the largest effective lesson and does not misfire during IME composition.
- A personal/custom word survives reload and enters review when its lesson is started.
- Hide removes a word from lesson and due-review views; Restore returns it with the same schedule.
- A valid backup transfers personal vocabulary, hidden state, and associated schedules to another device.
- Invalid backups and failed writes do not change saved or in-memory data.
- Unrelated vocabulary schedules, grammar schedules, and lesson progress survive import unchanged.
- No deck-derived text is published unless the redistribution gate is explicitly satisfied.
