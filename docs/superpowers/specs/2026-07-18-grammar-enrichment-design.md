# Grammar Enrichment Design

**Status:** Approved direction, revised after content and migration review on 2026-07-18
**Scope:** Enrich all 25 lessons with Japanese-first grammar insight informed by Tae Kim's Guide while preserving the existing Minna-inspired sequence and fully original course expression.

## Context

The app already has a complete 25-lesson beginner sequence containing 101 stable grammar points. Each point includes a pattern, plain-English summary, explanation, Japanese-first rationale, examples, optional notes, and an optional common mistake.

The user values Tae Kim's Japanese-first mental models but wants to keep the current Minna-style order. The referenced guide content identifies itself as CC BY-NC-SA 3.0 US. Because this app and repository are public, the guide is used as a conceptual coverage reference and further-reading destination, not as text to copy or closely paraphrase.

## Goals

- Review and enrich every existing grammar point in Lessons 1–25.
- Preserve the current lesson numbers, lesson themes, and grammar-point order.
- Explain Japanese structure from a Japanese-first perspective while explicitly addressing English-speaker assumptions.
- Add literal frames, usage boundaries, contrasts, common mistakes, and original examples where they improve understanding.
- Provide relevant further-reading links without requiring the external guide to use the app.
- Keep all Japanese examples free of romaji and provide kana readings for kanji.

## Non-goals

- Reordering the curriculum to follow Tae Kim's chapter sequence.
- Copying, translating, or closely paraphrasing guide prose, analogies, tables, or examples.
- Importing the guide's website code or visual design.
- Adding advanced grammar before its prerequisites.
- Replacing the current original dialogues and exercises with source-guide material.
- Claiming endorsement by Tae Kim or the Saeris project.

## Content Strategy

Every current grammar point is checked against relevant guide topics and independent grammatical knowledge. Existing fields are improved in place so the lesson remains familiar:

- `explanation` states the form and meaning.
- `whyItWorks` supplies the Japanese-first mental model.
- `usageBoundary` states one concrete limit, contrast, or English-speaker trap.
- `notes` hold literal frames, register notes, exceptions, and contrasts.
- `commonMistake` targets a specific English-driven error.
- `examples` remain fully original, lesson-appropriate, and accompanied by kana readings and natural English.

`GrammarPoint` gains a required `usageBoundary: string` and optional `furtherReading?: Array<{ title: string; url: string }>` entries. Existing grammar points are migrated in the same change, so no partially populated state is shipped. The source links are supplementary; the in-app explanation must stand alone.

The GrammarCard reuses `whyItWorks` as the content of a collapsed `Japanese-first insight` region. Supporting `notes` and `usageBoundary` appear when that region is expanded, while the pattern, plain-English summary, explanation, and examples stay visible. This avoids adding a second overlapping rationale field and keeps the default card scannable on iPhone. A `Further reading: Tae Kim's Guide` link appears only where a relevant source page exists.

On hydration, existing grammar review cards are reconciled by stable grammar ID. Current pattern, plain-English answer, and title replace stale display text while due date, interval, repetitions, ease, and last-review time remain unchanged. This reconciliation shares the atomic V2 migration and hydration barrier defined in the vocabulary specification.

## Lesson Mapping and Ordering Guardrails

| Lesson | Enrichment focus | Material intentionally deferred |
|---|---|---|
| 1 | Topic-comment framing, `は`, polite `です`, negative identity, questions, `も`, and noun-head relationships with `の` | Casual `だ`, full `は`/`が` theory, plain past |
| 2 | Standalone demonstratives versus noun modifiers, contextual noun omission with `の`, and proposition confirmation with `そうです` | Explanatory `の` and relative-clause nominalization |
| 3 | Speaker/listener distance zones, question words staying in place, location identification, and polite direction words | Existence verbs and location `に` |
| 4 | One four-form polite-verb grid, nonpast routine/future meaning, time-point `に`, and boundary `から`/`まで` | Dictionary-form classification and plain conjugation |
| 5 | Destination `に` versus directional `へ`, unified means/context `で`, companion `と`, and particle-free `いつ` | Purpose `V-stem に行く` and particle stacking |
| 6 | Direct-object `を`, destination versus action-location particles, low-pressure `ませんか`, and shared proposal `ましょう` | `たい`, casual volitional, and conditionals |
| 7 | Unified tool/means `で`, giving and receiving camera direction, and completion with `もう`/`まだ` | `くれる` as active content and favor constructions |
| 8 | Structural difference between い- and な-adjectives, deceptive adjective forms, degree adverbs, and modifier-slot `どんな` | Adjective past, productive adverb formation, relative clauses |
| 9 | `好き`/`嫌い` and `上手`/`下手` as descriptive states, `が` with understanding, and reason-clause `から` | `ので`, explanatory `の`, and extended discourse theory |
| 10 | Location-target `に`, introducing existence with `が`, known-topic location with `は`, and animate/inanimate existence | General plain-form presentation beyond brief comparison |
| 11 | Counters as classifiers, sound changes, duration versus counted objects, frequency inside a time frame, and choosing a counter-shaped quantity question | Exhaustive counter/date systems |
| 12 | Past marking on adjective classes, `より` as baseline, `どちら` for choosing a side, and `いちばん` within a stated group | Advanced comparison and advice constructions |
| 13 | Adjectival behavior of `ほしい`/`たい`, private desire perspective, destination versus purpose `に`, and indefinite question-word combinations | `欲しがる`, embedded questions, advanced volitional uses |
| 14 | て-form as a non-final connector, with following expressions supplying request/current-action meaning, plus `ましょうか` as an offer of the speaker's action | Commands and later て-form branches |
| 15 | Acceptability logic of `てもいい`, prohibition with `てはいけない`, continuing-result `ています`, and the asymmetric pair `知っています`／`知りません` | `てある`, `ておく`, `ていく`, `てくる`, contractions |
| 16 | Final predicate carrying tense in sequences, noun/な-adjective `で`, い-adjective `くて`, completion-before-next with `てから`, and condition versus method questions | Reasons, `のに`, `し`, and `たり` |
| 17 | ない-form rules, negative requests with `ないでください`, obligation as a double-negative chunk, and acceptability of `なくてもいい` | Casual obligation contractions and full conditional analysis |
| 18 | Dictionary form as a connector-ready base, ability with `Vことができます`, action nominalization for hobbies, and nonpast viewpoint before `まえに` | Productive potential conjugation, potential-particle alternation, and `見える`／`聞こえる` |
| 19 | た-form as form and connector, life experience with `Vたことがあります`, representative `たり` actions, and change into a state with `なります` | Deliberate change with `する` and acquired ability with `ようになる` |
| 20 | Four-way plain verb/description grids, casual questions through intonation, sentence-ending `よ`／`ね`, and contextual omission | Question-ending `の` and broad slang inventory |
| 21 | Direct versus interpreted quotation with `と思います`／`と言いました`, a register-aware `でしょう`, and information topics with `について` | Casual quotation `って` and formal reporting outside beginner scope |
| 22 | Head-noun detection, inner subjects with `が`, tense/negative inside modifier clauses, the copular `だ` trap, and action-before-time noun order | Advanced nominalization and additional nested-clause production |
| 23 | `とき` as a modified time noun, `Vる` versus `Vた` timing viewpoint, automatic-result `と`, intention restrictions after `と`, and route `を` | `たら` until Lesson 25, plus `なら` and `ば` production |
| 24 | Benefactor viewpoint, `に` versus `から` with `てもらう`, request perspective, and risks of self-benefiting `てあげる` | Low-register `やる` as required output |
| 25 | Conditional and after-event `たら`, discovery after completion, uncertainty marker `もし`, and concessive `ても`; Lesson 23's `と` appears only as a brief non-productive contrast | Productive `なら`／`ば` and a full four-conditional grid |

These guardrails prevent plain-form-first source explanations from disrupting the app's polite-first progression.

## Frozen Grammar ID Inventory

The following ordered inventory is the migration and integrity-test baseline. Enrichment edits these records in place; it does not add, remove, rename, or reorder targets:

- Lesson 1: `l1-topic-copula`, `l1-negative`, `l1-question`, `l1-also`, `l1-connection`
- Lesson 2: `l2-things`, `l2-noun-pointing`, `l2-owner`, `l2-confirm`
- Lesson 3: `l3-places`, `l3-where`, `l3-location`, `l3-polite-direction`
- Lesson 4: `l4-nonpast`, `l4-past`, `l4-time-ni`, `l4-bounds`
- Lesson 5: `l5-destination`, `l5-transport`, `l5-companion`, `l5-when`
- Lesson 6: `l6-object`, `l6-action-place`, `l6-invite`, `l6-suggest`
- Lesson 7: `l7-means`, `l7-give`, `l7-receive`, `l7-status`
- Lesson 8: `l8-i-adjectives`, `l8-na-adjectives`, `l8-degree`, `l8-what-kind`
- Lesson 9: `l9-preference`, `l9-skill`, `l9-understand`, `l9-reason`
- Lesson 10: `l10-existence-verbs`, `l10-place-new-entity`, `l10-known-location`, `l10-position-words`
- Lesson 11: `l11-counters`, `l11-duration`, `l11-frequency`, `l11-quantity-questions`
- Lesson 12: `l12-i-adjective-past`, `l12-na-noun-past`, `l12-yori-comparison`, `l12-choice-best`
- Lesson 13: `l13-hoshii`, `l13-tai`, `l13-purpose-movement`, `l13-indefinites`
- Lesson 14: `l14-te-form`, `l14-request`, `l14-action-progress`, `l14-offer`
- Lesson 15: `l15-permission`, `l15-prohibition`, `l15-continuing-state`, `l15-knowing`
- Lesson 16: `l16-action-sequence`, `l16-after-action`, `l16-description-linking`, `l16-how-to`
- Lesson 17: `l17-nai-form`, `l17-negative-request`, `l17-obligation`, `l17-not-necessary`
- Lesson 18: `l18-dictionary-form`, `l18-ability`, `l18-hobby`, `l18-before`
- Lesson 19: `l19-ta-form`, `l19-experience`, `l19-representative-actions`, `l19-change`
- Lesson 20: `l20-plain-verbs`, `l20-plain-descriptions`, `l20-casual-questions`, `l20-final-particles`
- Lesson 21: `l21-think`, `l21-say`, `l21-probability`, `l21-topic-about`
- Lesson 22: `l22-relative-clause`, `l22-inner-subject`, `l22-tense-negative`, `l22-time-for-action`
- Lesson 23: `l23-when-forms`, `l23-timing-viewpoint`, `l23-automatic-to`, `l23-path-particle`
- Lesson 24: `l24-te-ageru`, `l24-te-morau`, `l24-te-kureru`, `l24-viewpoint`
- Lesson 25: `l25-tara-condition`, `l25-after-tara`, `l25-even-if`, `l25-moshi`

## Source Mapping

Implementation adds one explicit `grammarReferences` manifest keyed by the frozen grammar IDs. Each value is zero or more `{ title, url }` records; no URL is constructed from a title at runtime. The manifest is reviewed alongside the content and becomes the sole source for `furtherReading`.

Learner-facing links use exact HTTPS pages on the official Tae Kim guide at `https://guidetojapanese.org/learn/grammar/`. The referenced `Saeris/guide-to-japanese` port is used during content review because it exposes the guide as structured Markdown. Its verified source shape is `https://github.com/Saeris/guide-to-japanese/blob/main/public/learn/grammar/<section>/<page>.md`. Relevant topics include:

- Basic particles, state of being, verb basics, negative verbs, adjectives, relative clauses, and sentence-ending particles.
- Polite forms and verb stems, numbers and counting, question markers, desire and suggestions, compound sentences, requests, て-form, permission/obligation, potential form, conditionals, and giving/receiving.
- Comparisons, generic nouns, and degrees of certainty where those concepts fit later lessons.

Before content editing begins, every manifest URL is opened in a one-time network preflight and recorded in the implementation review. Ordinary Vitest runs remain offline and only validate the allowlisted host, exact manifest membership, and URL structure. Multiple grammar points may legitimately share a page; duplicate URLs are prohibited only within one grammar point. A source link is omitted when the guide has no direct treatment.

## Originality and Attribution Rules

- Do not reuse source sentences, tables, distinctive analogies, paragraph structure, or close paraphrases.
- Grammar facts and topic coverage may inform independently structured explanations.
- All Japanese examples, English translations, dialogues, and exercises remain original to this app.
- Add a `Reference influences` card on the Progress screen and a matching README section linking to the official Tae Kim guide and the Saeris port.
- State that the source guide identifies its content as CC BY-NC-SA 3.0 US, that this app's explanations and examples are independently written, and that the external projects do not endorse this app.
- Direct quotation is out of scope.

## Kana Reading Migration

The user's no-romaji preference applies across lesson study content, not only new paragraphs:

- `JapaneseExample.reading` remains optional when `japanese` has no Han characters; it is required when the example contains kanji.
- Every present example reading must use kana and the shared allowed punctuation/spacing predicate from the vocabulary design, with no Latin letters.
- `DialogueTurn.reading` remains required and is converted to kana for all lesson dialogues.
- Vocabulary readings are handled by the vocabulary specification.

This migration changes display readings only. Japanese sentences, English meanings, grammar IDs, dialogue IDs, exercise IDs, and review schedules remain stable.

## Mobile Presentation

- Keep existing grammar card headings and core explanation visible.
- Make the existing `whyItWorks` rationale collapsible under `Japanese-first insight`, with `usageBoundary`, supporting notes, and every further-reading entry in the same expanded region.
- Default every card to collapsed and keep expansion state independent per card; pattern, explanation, and examples remain visible in both states.
- Give the toggle a button role, accessible label, `accessibilityState.expanded`, keyboard focus treatment, and a 44-pixel-or-larger touch target.
- Preserve large touch targets, safe-area behavior, and readable line lengths on iPhone.
- Open external further-reading links with an explicit accessible label.
- Do not require network access for any core explanation; only the external link needs connectivity.

## Content Quality Rules

Every grammar point must:

- Remain appropriate for the lesson's prerequisites.
- Explain one primary structural idea without introducing an unbounded advanced branch.
- Include at least two original Japanese examples with English meanings; a kana reading is required whenever an example contains kanji.
- Populate the required `usageBoundary` with a concrete limit, contrast, or English-speaker trap.
- Avoid Latin letters in all reading fields.
- Use consistent terminology across lessons.

Cross-lesson terminology must intentionally build: topic/comment, head noun, particle roles, polite/nonpast, adjective classes, verb stems, て-form connector, plain forms, relative clauses, and conditionals.

## Testing and Review

Automated integrity tests verify:

- All 25 lessons and the frozen 101-ID inventory remain present and ordered.
- Required explanation, rationale, usage-boundary, and example fields are non-empty; optional common-mistake blocks are complete when present.
- Examples have Japanese and English; kanji examples have kana readings, and every present reading contains no Latin letters.
- Every dialogue reading contains kana rather than romaji.
- Further-reading arrays come from the central manifest, use the approved HTTPS host, and contain no duplicate URL within one grammar point.
- Every dialogue `grammarIds` value resolves to a grammar point in the same lesson.
- A frozen current V1 study-state fixture hydrates into V2 with grammar review text refreshed and all schedule fields unchanged.

Content QA is performed in three ranges, Lessons 1–9, 10–17, and 18–25, followed by a cross-range consistency review. Review checks grammatical accuracy, naturalness, prerequisite safety, originality, and English-speaker usefulness.

Project verification includes TypeScript, the complete Vitest suite, and production web export. Manual acceptance verifies default-collapsed and independent card state, accessible expansion controls, readable iPhone layout, offline access to all in-app explanations, and every external link when online.

## Deployment

Grammar enrichment follows the vocabulary foundation so new review-state behavior is stable before course content expands. Work is kept in separate local commits but pushed to `main` only after both specifications' acceptance criteria pass. GitHub Actions redeploys the existing Pages URL.

## Acceptance Criteria

- The 25-lesson sequence and existing grammar-point IDs remain unchanged.
- Every grammar point has been reviewed and materially strengthened where appropriate.
- Each lesson contains at least one explicit Japanese-first insight.
- Advanced concepts remain deferred to the mapped lesson.
- Existing grammar review cards show current content without losing scheduling history.
- Grammar examples and dialogues show kana readings rather than romaji.
- No source prose, examples, media, or website code is copied.
- The Progress reference card and README contain accurate guide attribution; further-reading links are optional for study.
- All core grammar content works offline after the PWA's first online load.
