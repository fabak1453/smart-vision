# Windows installer (make it again)

Shop PCs should run **Setup 9.5.0** (or newer). Do **not** give customers **Setup 9.4.0** — that build was signed on a Mac and many Windows 10 PCs refuse to start it.

## Command (from this repo)

On the Mac (or any machine with Node.js) that already has this project:

```bash
cd "/path/to/smart-vision-desktop"
npm install
npm run dist
```

`npm run dist` is the same as `npm run dist:win`. It packs **only** `electron/`, `app/`, and `build/icon.png`. The `apk/` Android project is **not** inside the Windows Setup exe.

It:

1. Compiles `app/smart-vision-app.jsx` → `app/smart-vision-app.js` (`prepare-app`)
2. Rebuilds `better-sqlite3` for **Windows x64**
3. Builds an **unsigned** NSIS installer and a portable exe (`CSC_IDENTITY_AUTO_DISCOVERY=false`)

When it finishes, copy these files from `dist/`:

| File | Use |
|------|-----|
| `Smart Vision ERP Setup 9.5.0.exe` | **Final installer** — choose folder, desktop shortcut |
| `Smart Vision ERP 9.5.0 Portable.exe` | Optional, no install |

Version in the filename comes from `"version"` in [package.json](../package.json). Bump that number **before** `npm run dist` if you want Setup 9.4.3, etc.

## After a Mac build: run the app locally again

Cross-building Windows replaces the native SQLite binary. Restore Mac/Electron natives:

```bash
npm install
```

Then `npm start` works on the Mac again.

## Windows SmartScreen

Unsigned builds often show **Windows protected your PC**. Customer: **More info** → **Run anyway**. Do not re-enable Mac self-signing; Windows will reject those binaries again.

## What is not in the installer

`keygen/` is excluded from the package. Never copy `keygen/` or `build/certs/` onto a shop PC.

## Uninstall / upgrade

Uninstall the old Smart Vision ERP from Windows Settings if the new Setup does not replace it cleanly. Shop data stays under `%AppData%\Smart Vision ERP\` unless they delete that folder.
