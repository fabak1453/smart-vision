# Windows installer (make it again)

```bash
npm install
npm run dist        # → dist/Smart Vision ERP Setup <version>.exe  (+ Portable)
```

Works on **Windows** (simplest) or on a **Mac** (needs Wine: `brew install --cask wine-stable`)
and **needs internet** during the build.

## What `npm run dist` does (scripts/dist-win.js, since 9.8.1)
1. Compiles the app (`prepare-app`).
2. Gets the **Windows x64** database module (better-sqlite3) for Electron, and **checks the
   file itself**. On a Mac this module has to be downloaded; if that fails the build **stops**
   with a plain message. (Before 9.8.1 it silently packed the Mac module: the installer
   installed fine and then said "Smart Vision ERP could not start" with a wall of errors.)
3. Builds the unsigned NSIS installer and the portable exe.
4. Checks the module **inside the finished app** again. Any installer from a failed build is
   renamed `*.BROKEN-do-not-ship.exe`.
5. On a Mac / Linux, puts that computer's own module back, so `npm start` keeps working.

`node scripts/dist-win.js --dir` builds only `dist/win-unpacked` (no installer, no Wine), for testing.

## If an installed app says "could not start"
9.8.1 shows a short reason and saves the details in
`%APPDATA%\Smart Vision ERP\logs\startup-error-<time>.txt` (button **Open log folder**).
"Installer problem" = the old broken build: install the new installer over it. The data in
`%APPDATA%\Smart Vision ERP\data` is kept; nothing is deleted.

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
