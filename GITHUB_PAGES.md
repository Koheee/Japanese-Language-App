# Publish Nihongo Path as an iPhone home-screen app

The GitHub Actions workflow tests the project, exports the Expo web app, and publishes it to GitHub Pages. The deployed reader includes iPhone home-screen metadata, an app icon, safe-area-aware layouts, and an offline fallback.

The visible product flow is **Lesson list â†’ Lesson Detail**. Lesson Detail contains only **Overview, Grammar, and Dialogue**; no exercise, review, progress, Words, vocabulary-management, import, or editor route is visible.

## 1. Create or connect the repository

Create a GitHub repository, then push this project to its `main` branch. GitHub Desktop is convenient on Windows; command-line Git also works:

```powershell
git init
git add .
git commit -m "Publish Nihongo Path reader"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/Japanese-Language-App.git
git push -u origin main
```

Replace the account and repository names with your own. Never commit a password, access token, private deck, or generated personal-vocabulary file.

## 2. Enable GitHub Pages

In the repository on GitHub:

1. Open **Settings**.
2. Choose **Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Open **Actions** and wait for **Test and deploy Nihongo Path** to succeed.

The workflow handles both a project path such as `/Japanese-Language-App/` and a root `username.github.io` repository. A project URL normally looks like:

```text
https://YOUR-USERNAME.github.io/Japanese-Language-App/
```

## 3. Install on iPhone

1. Open the published URL in **Safari**.
2. Tap **Share**.
3. Choose **Add to Home Screen**.
4. Keep the name **Nihongo Path** and tap **Add**.

Launch the reader from its icon to use standalone mode.

## Updating the installed reader

Pushing a commit to `main` triggers validation and republishing. After the workflow succeeds, update the existing iPhone installation without destroying its browser storage:

1. Do not uninstall the home-screen app and do not clear Safari website data.
2. Open the installed app online and wait for the deployment to load; close it fully and reopen it.
3. Test Overview, Grammar, and Dialogue and use the lesson quick-switcher from all three sections.
4. Check portrait and landscape safe areas. With VoiceOver, confirm the selected tab, expanded grammar areas, optional references, and dialogue-note labels are announced clearly.
5. After the successful online load, enable airplane mode and reopen the app once. Core lesson reading should remain available offline.

The old device-local study, review, and vocabulary data remains preserved in dormant storage with **no visible management UI**. It **does not sync** between Windows and iPhone. Do not treat the absence of the old controls as data deletion.

## Visible reader and dormant source

The deployed interface is the two-screen reader only. Exercise, review, progress, vocabulary manager, word editor, import, backup, scheduling, and persistence source modules remain dormant in the repository for compatibility. They are not reachable from the app's navigation.

There is no visible backup import/export workflow in this reader release. Clearing site data or removing the PWA may remove device-local state, which is why the update procedure explicitly avoids both actions.

### Development-only private-vocabulary boundary

Local `.apkg` parsing and privacy auditing are dormant developer tools, not public app features. Keep the package outside the repository and provide its path only at the PowerShell prompt:

```powershell
$privateApkg = Read-Host 'Absolute path to the private APKG'
pnpm.cmd vocabulary:generate -- --source $privateApkg --output '.local/vocabulary/personal-vocabulary-v1.json'
pnpm.cmd vocabulary:verify -- --source $privateApkg --output '.local/vocabulary/personal-vocabulary-v1.json'
```

The generated file remains gitignored. Never publish it unless you hold a license covering its content and arrangement.

## Local production check

```powershell
pnpm.cmd typecheck
pnpm.cmd test
$env:EXPO_BASE_URL = '/Japanese-Language-App'
pnpm.cmd export:web
pnpm.cmd audit:public -- --tracked --dist dist
```

The exported site is written to `dist/`. Verify that the reader opens at the repository base path before pushing to `main`.
