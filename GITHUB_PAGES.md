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

## Local production check

```powershell
pnpm typecheck
pnpm test
pnpm export:web
```

The exported site is written to `dist/`.
