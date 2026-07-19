# Publish Nihongo Path as an iPhone home-screen app

The project includes a GitHub Actions workflow that tests the code, exports the Expo web app, and publishes it to GitHub Pages. The deployed site includes iPhone home-screen metadata, an app icon, and a conservative offline cache.

## 1. Create the repository

Create a new repository on GitHub, for example `nihongo-path`. A public repository works with GitHub Pages on a free GitHub account.

Push this project to the repository's `main` branch. GitHub Desktop is the simplest option on Windows, but command-line Git works too:

```powershell
git init
git add .
git commit -m "Build complete Nihongo Path course"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/nihongo-path.git
git push -u origin main
```

Replace `YOUR-USERNAME` and the repository name with your own values. Never commit account passwords or access tokens.

## 2. Enable GitHub Pages

In the repository on GitHub:

1. Open **Settings**.
2. Choose **Pages** in the left sidebar.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Open the repository's **Actions** tab and wait for “Test and deploy Nihongo Path” to finish.

The workflow automatically handles the `/repository-name` base path required by project Pages sites. It also handles a special `username.github.io` repository, which is served from `/`.

Your URL will normally be:

```text
https://YOUR-USERNAME.github.io/nihongo-path/
```

## 3. Install it on iPhone

1. Open the published URL in **Safari** on the iPhone.
2. Tap Safari's **Share** button.
3. Scroll and choose **Add to Home Screen**.
4. Keep the name “Nihongo Path” and tap **Add**.

Launch it from the new icon. In standalone mode it opens without Safari's usual address bar.

## Updating the app

Commit and push changes to `main`. The workflow validates and republishes the app automatically. The service worker retrieves a fresh page when online while keeping previously loaded assets available as a fallback.

## Where progress is stored

Study progress and review schedules remain in that browser installation's local storage. They are not committed to GitHub and do not automatically sync between Windows and iPhone. Clearing Safari website data or removing the installed web app may remove local progress.

## Private vocabulary and manual backup transfer

The public site ships the vocabulary manager, backup schema, and kana-authored course baseline, but no private deck record, source identifier, source package, or deck media. `.apkg` parsing is a local development operation and is never performed by the deployed app. The only generated local file is `.local/vocabulary/personal-vocabulary-v1.json`, which remains gitignored.

Enter the private package location only in an interactive PowerShell prompt:

```powershell
$privateApkg = Read-Host 'Absolute path to the private APKG'
pnpm.cmd vocabulary:generate -- --source $privateApkg --output '.local/vocabulary/personal-vocabulary-v1.json'
pnpm.cmd vocabulary:verify -- --source $privateApkg --output '.local/vocabulary/personal-vocabulary-v1.json'
```

Import is an explicit replacement with a preview and confirmation step. Backups do not sync automatically: export from Progress on Windows to download JSON, transfer it manually, then select it with the iPhone file picker. On iPhone, export uses Web Share when available so you can save the backup to Files or another chosen destination. **Undo last import** persists across reloads, but a later vocabulary change or review of an affected card invalidates it.

Keep a current exported backup because clearing site data or removing the PWA can remove device-local changes. Redistributing generated vocabulary requires separately documented permission or a license covering the text, glosses, categories, and arrangement.

## Local production check

```powershell
pnpm typecheck
pnpm test
pnpm export:web
pnpm audit:public -- --tracked --dist dist
```

The exported site is written to `dist/`.
