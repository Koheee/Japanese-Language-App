# Nihongo Path

An original, mobile-first Japanese course with a 25-lesson beginner path. The progression is informed by common classroom sequencing, while all explanations, scenarios, examples, vocabulary curation, and exercises are newly written.

## What is implemented

- Twenty-five fully authored sequential lessons
- At least four grammar modules, 15 themed words, and six original dialogue turns per lesson
- Exactly eight exercises per lesson: two fill-in-the-blank, two translation, two multiple-choice, and two listening placeholders
- Fill-in-the-blank, translation, multiple-choice, and listening-placeholder exercise renderers
- Lenient answer normalization for spacing, punctuation, and accepted translations
- Persistent lesson progress and accuracy
- An offline spaced-repetition deck for vocabulary and grammar
- Learn, Review, and Progress navigation tabs
- Responsive, accessible React Native components with a shared visual-token system
- An installable iPhone web app manifest, home-screen icon, safe-area layout, and offline fallback
- Automated GitHub Pages testing and deployment

Every explanation, scenario, example, dialogue, and exercise is original. The course follows a familiar beginner progression without copying textbook prose or page design.

## Learning flow

Each complete lesson follows one predictable loop:

1. **Orient** — see communicative goals and the real-world situation.
2. **Understand** — learn each grammar pattern, its use, and why it differs from English.
3. **Notice** — meet the pattern in curated vocabulary and an original dialogue.
4. **Retrieve** — answer mixed exercise types with immediate explanatory feedback.
5. **Revisit** — rate grammar and vocabulary cards in spaced review.

## Lesson path

| # | Lesson | Main language target | Vocabulary field |
|---|---|---|---|
| 1 | A first introduction | Topic + noun sentences, negatives, questions, も, の | People, roles, countries |
| 2 | Whose is this? | Demonstratives and ownership | Objects and belongings |
| 3 | Finding your way | Place words and location questions | Buildings and facilities |
| 4 | A day in motion | Polite verbs, tense, time, ranges | Schedules and routines |
| 5 | Going places | Destinations, transport, companions | Travel and dates |
| 6 | Plans after work | Objects, action locations, invitations | Food and leisure |
| 7 | Gifts and helpful tools | Means, giving, receiving | Tools, languages, gifts |
| 8 | What is it like? | い- and な-adjectives | Appearance and places |
| 9 | Things I enjoy | Likes, strengths, understanding, reasons | Hobbies and skills |
| 10 | What is where? | Existence and position | Rooms and furniture |
| 11 | How many, how often? | Counters, duration, frequency | Quantities and postage |
| 12 | Looking back, comparing | Past descriptions and comparison | Trips and seasons |
| 13 | What do you want? | Wants and purpose of movement | Shopping and outings |
| 14 | Requests in the moment | て-form, requests, actions in progress | Immediate actions |
| 15 | Rules and ongoing states | Permission, prohibition, states | Public rules and work |
| 16 | First this, then that | Sequencing and linked descriptions | Procedures and directions |
| 17 | What must be done | ない-form, warnings, obligation | Health and responsibilities |
| 18 | Skills and hobbies | Dictionary form, ability, “before” | Hobbies and preparation |
| 19 | Experiences and changes | た-form, experience, representative lists | Experience and change |
| 20 | Talking with friends | Plain forms and casual interaction | Friendship and opinions |
| 21 | Thoughts and reports | Thoughts, reported speech, agreement | News and society |
| 22 | The person who… | Relative clauses before nouns | People, clothes, homes |
| 23 | When this happens | Time clauses and automatic results | Machines and roads |
| 24 | Kind things people do | Giving and receiving helpful actions | Favors and assistance |
| 25 | If plans change | Conditions and concessive results | Decisions and uncertainty |

## Architecture

```text
App.tsx
src/
  components/       Reusable presentation components
  data/
    curriculum.ts   Course metadata for all 25 lessons
    lessons/        Fully authored Lesson 1 plus three lesson batches
  models/           Content and review domain types
  navigation/       Typed stack and tab navigation
  screens/          Lesson list/detail, exercises, review, progress
  services/         Pure answer-checking and SRS scheduling logic
  state/            Persistent study state and actions
  theme/            Color, spacing, radius, and type tokens
```

Content is plain typed data rather than JSX, so it can later come from bundled JSON or a CMS. Exercise checking and scheduling are pure services and can be tested without rendering React Native. `StudyContext` owns the small offline application state; a larger release could replace it with Zustand/Redux without changing content models.

## Data contracts

`Lesson` composes `GrammarPoint[]`, `VocabularyItem[]`, `DialogueTurn[]`, and a discriminated `Exercise[]`. Exercise variants carry only the fields their renderer needs. `ReviewCard` stores due time, interval, repetitions, and ease so the queue remains durable across launches.

The source definitions live in:

- `src/models/content.ts`
- `src/models/review.ts`
- `src/data/lessons/lesson01.ts`
- `src/data/lessons/lessons02to09.ts`
- `src/data/lessons/lessons10to17.ts`
- `src/data/lessons/lessons18to25.ts`

## Spaced review

Beginning practice adds one card per vocabulary item and grammar point. Ratings schedule the next appearance as follows:

- **Again:** 10 minutes and reset the repetition count
- **Hard:** at least 1 day, with a small ease reduction
- **Good:** 1 day, then 3 days, then the current interval × ease
- **Easy:** 4 days initially, then a larger ease-based jump

This is a compact SM-2-inspired scheduler, not a claim of optimal memory prediction. The service is isolated so FSRS or a server-synced scheduler can replace it later.

## Run locally

```bash
pnpm install
pnpm web
```

The browser build opens at `http://localhost:8081`. The React Native targets remain available as well:

```bash
pnpm typecheck
pnpm test
pnpm android
pnpm ios
pnpm export:web
```

## Host on GitHub Pages and install on iPhone

The workflow in `.github/workflows/deploy-pages.yml` validates and publishes the app whenever `main` is pushed. Follow [GITHUB_PAGES.md](./GITHUB_PAGES.md) to create the repository, enable Pages, and add the deployed app to an iPhone home screen from Safari.

Progress is stored locally in each browser installation. GitHub hosts only the static app code; study history is not uploaded to the repository.

The listening exercises currently point to placeholder paths such as `assets/audio/lesson-01/emma-job.mp3`. Add licensed or self-recorded audio at those paths and connect the play control to `expo-audio` when moving beyond the content prototype.

## Production continuation

Before a store release, add real audio and playback, error reporting, analytics with consent, font assets, end-to-end tests, content accessibility review, and cloud sync only if multi-device study is needed. Keep textbook brand names, copied explanations, example sentences, exercise prompts, and page layouts out of the content pipeline.
