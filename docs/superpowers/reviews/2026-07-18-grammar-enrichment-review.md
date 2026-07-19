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

## Reproducible originality audit

- Pinned source revision: Saeris `guide-to-japanese` commit `7aa1ac10`.
- Source scope: every Markdown file under `public/learn/grammar/**/*.md` in that explicitly checked-out, clean source tree; source content is read locally and is neither vendored nor emitted.
- App scope: authored grammar prose and examples plus the dialogue and exercise fields covered by the originality statement. The command reports the exact app-field and source-file counts for the pinned corpus.
- Normalization/tokenization: Unicode NFKC, lowercase, curly-apostrophe normalization, punctuation removal, Latin word tokens, and individual Han/hiragana/katakana tokens.
- Threshold/result: exact sequences of 12 consecutive normalized tokens are distinctive overlap; the audit succeeds only with zero cross-corpus overlaps. The ordinary test suite separately requires zero unexplained 12-token overlap across all 101 grammar prose records.
- Reproduction command: `pnpm.cmd audit:grammar-originality -- --source C:\path\to\guide-to-japanese`
- Recorded pinned-corpus result: 3,099 app authored fields, 61 source Markdown files, and 0 cross-corpus overlaps at the 12-token threshold.

The command is deterministic and offline after the pinned source checkout is prepared. Ordinary tests and CI do not clone or access the source repository.

## Editorial correction note

Before these PASS results were recorded, Task 9 deliberately corrected the pre-existing `l6-d04` dialogue snapshot row for prerequisite safety and re-froze it. Three additional dialogue rows (`l4-d03`, `l9-d03`, and `l25-d01`) were corrected for English naturalness, contextual accuracy, or prerequisite scope and re-frozen at the same time. Dialogue IDs, speakers, grammar-ID annotations, exercise IDs, grammar point IDs, and review schedules remain unchanged; “stable where required” below refers to this corrected approved snapshot.

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
