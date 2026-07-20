# Nihongo Path

Nihongo Path is an original, mobile-first Japanese grammar reader. It follows a 25-lesson beginner sequence while using independently written explanations, examples, and dialogues.

## Shipped reader experience

The visible flow is **Lesson list â†’ Lesson Detail**. The lesson list covers all 25 lessons and 101 grammar points. Each Lesson Detail page contains only **Overview, Grammar, and Dialogue**:

- **Overview** introduces the lesson goals, central mental shift, and grammar map.
- **Grammar** teaches the basics, form-building, Japanese-first reasoning, contrasts, examples, common mistakes, and optional deeper notes.
- **Dialogue** shows the grammar in original conversations with line-specific internal explanations.

The lesson quick-switcher is available on every lesson page and preserves the current section while moving between lessons. Optional Tae Kim and Tofugu links are grouped after the grammar cards; the lessons do not require those links.

There is no visible exercise, review, progress, Words, vocabulary-management, import, or editing route in the shipped reader.

## Device-local data and dormant modules

Older study progress, review schedules, custom vocabulary, and hidden-word state remain preserved in the existing device-local storage. That dormant data has **no visible management UI** in this reader release and **does not sync** between Windows and iPhone.

The repository still contains dormant exercise, review, progress, vocabulary, import, editor, persistence, and scheduling modules. They remain compilable for storage compatibility and possible future work, but they are not registered in the visible navigation. Do not uninstall the PWA or clear site data to update the reader; either action can remove device-owned browser storage.

## Grammar sources and originality

[Tae Kim's Guide to Japanese Grammar](https://guidetojapanese.org/learn/grammar/), the [Saeris guide-to-japanese port](https://github.com/Saeris/guide-to-japanese), and selected [Tofugu grammar articles](https://www.tofugu.com/japanese-grammar/) were used only as editorial cross-checks. Nihongo Path's teaching prose, mental models, examples, and dialogues are independently written. These resources do not endorse or sponsor the app.

## Project structure

```text
App.tsx
src/
  components/       Reader UI and dormant reusable components
  data/              Curriculum and all 25 authored lessons
  models/            Content plus preserved study-data types
  navigation/        Visible two-screen reader stack
  screens/           Visible reader screens plus dormant study screens
  services/          Preserved answer and scheduling services
  state/             Preserved device-local persistence
  theme/             Shared visual tokens
```

The visible navigation is intentionally smaller than the source tree. Vocabulary and exercise arrays also remain in lesson data so existing storage and backup shapes are not destructively rewritten.

## Run locally

```powershell
pnpm.cmd install
pnpm.cmd web
```

Open `http://localhost:8081`. Production checks are:

```powershell
pnpm.cmd typecheck
pnpm.cmd test
$env:EXPO_BASE_URL = '/Japanese-Language-App'
pnpm.cmd export:web
pnpm.cmd audit:public -- --tracked --dist dist
```

## Publish and update on iPhone

The workflow in `.github/workflows/deploy-pages.yml` validates and publishes `main` to GitHub Pages. See [GITHUB_PAGES.md](./GITHUB_PAGES.md) for repository setup and installation.

For a non-destructive installed-app update:

1. Do not uninstall the home-screen app and do not clear Safari website data.
2. Open the installed app online, allow the new deployment to load, then close it fully and reopen it.
3. Test Overview, Grammar, and Dialogue, then use the lesson quick-switcher from each section.
4. Check portrait and landscape safe areas and the tab, expanded-state, and dialogue-note labels with VoiceOver.
5. After that successful online load, enable airplane mode and reopen the app once to confirm the offline fallback.

This checklist verifies the reader UI. Old device-local study and vocabulary data remains preserved in dormant storage, has no visible management UI, and does not sync to another device.

## Dormant development-only vocabulary tooling

The commands below are for a developer auditing a private local `.apkg`; they are not a feature of the public reader. Keep the source package outside the repository. The generated `.local/vocabulary/personal-vocabulary-v1.json` file is gitignored and must never be published.

```powershell
$privateApkg = Read-Host 'Absolute path to the private APKG'
pnpm.cmd vocabulary:generate -- --source $privateApkg --output '.local/vocabulary/personal-vocabulary-v1.json'
pnpm.cmd vocabulary:verify -- --source $privateApkg --output '.local/vocabulary/personal-vocabulary-v1.json'
pnpm.cmd audit:public:local
```

There is no visible import/export workflow in the current reader. Personal use does not grant redistribution rights for a third-party deck.
