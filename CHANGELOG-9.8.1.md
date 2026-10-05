# Smart Vision ERP 9.8.1 — Windows app "could not start"

## What was wrong
The installer installed, then the app said **"Smart Vision ERP could not start"** with a very long
error. The database module (better-sqlite3) is native code; when the installer is built on a
Mac, the Windows copy has to be *downloaded*. If that download failed, `npm run dist` carried on
silently and packed the **Mac module** into the Windows installer. Windows cannot load it, so the
app failed on its first database open. Reproduced: with the download blocked, the old steps
reported success and left the wrong module in place.

## Fixed
- **`npm run dist` = `scripts/dist-win.js`**: checks the module file itself (Windows x64) after
  preparing it **and inside the finished app**; re-downloads once; otherwise **stops** with a
  plain message, so no broken installer is made. A half-made installer from a failed build is
  renamed `*.BROKEN-do-not-ship.exe`. Runs on Windows too (no Mac-only command syntax), and
  restores the build machine's own module afterwards, so `npm start` keeps working there.
- **If startup still fails:** one short message in plain words (installer problem, damaged
  data file, no permission, disk full, already running, or the first line of anything else),
  "your data is safe", and the full details in `%APPDATA%\Smart Vision ERP\logs\` with an
  **Open log folder** button. No more wall of stack trace.

## To fix your PC
Build again with `npm run dist` (internet on), install the new Setup over the old one.
Your data stays (it lives in `%APPDATA%\Smart Vision ERP\data`, not in the program folder).

## How it was checked
- The packaged app starts in real Electron and opens its database.
- Your situation reproduced in real Electron: a packaged app with a wrong-platform module →
  log written ("Kind: native-module"), plain "installer problem" message.
- Guarded build: Windows module verified in `dist/win-unpacked`; with the download blocked it
  refuses and makes no installer; without Wine (Linux) it stops and quarantines the partial exe.
- test-windows-start.js (20 tests). Not run here: the NSIS installer on a real Windows PC.
