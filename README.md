# Smart Vision ERP v9.5.0

Windows desktop CCTV ERP — SQLite, offline license, Excel CSV backup, Google Drive sync. Android APK lives in **[apk/](apk/README.md)** and is not part of the Windows installer.

Full docs: **[docs/README.md](docs/README.md)**

## Ship this

| | |
|---|---|
| **Installer** | `dist/Smart Vision ERP Setup 9.5.0.exe` |
| **Portable** | `dist/Smart Vision ERP 9.5.0 Portable.exe` |
| **Owner login** | `smart` / `1234` |
| **Team login** | Username + password under **Team & Owners** |

Do **not** share `keygen/` or `build/certs/`. Do **not** ship Setup **9.4.0**.

## Make the Windows installer again

```bash
npm install
npm run dist
```

Output: `dist/Smart Vision ERP Setup <version>.exe`. Details: [docs/windows-installer.md](docs/windows-installer.md).

After a Mac→Windows dist, run `npm install` again before `npm start` on the Mac.

## Dev

```bash
npm install
npm start
npm run prepare-app          # compile JSX only
node test-wiring.js
node test-reliability.js
node test-sync-merge.js
```

## Data on the PC

`%AppData%\Smart Vision ERP\data\erp.sqlite` — **File → Open Data Folder**. CSV and Drive backup live in Settings.

## Layout

```text
app/          ERP UI (Windows + copied into APK www)
electron/     SQLite, license, Drive (Windows only)
apk/          Android Capacitor project (never shipped in the .exe)
docs/         Manuals
scripts/      prepare-app
keygen/       Owner serials (never ship)
dist/         Built Windows installers (gitignored)
```
