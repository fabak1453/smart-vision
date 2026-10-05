# Smart Vision ERP v9.8.1

Windows desktop CCTV ERP — SQLite, offline license, Excel CSV backup, Google Drive sync. Android APK lives in **[apk/](apk/README.md)** and is not part of the Windows installer.

Full docs: **[docs/README.md](docs/README.md)** · What changed: **[CHANGELOG-9.8.1.md](CHANGELOG-9.8.1.md)** · [CHANGELOG-9.6.1.md](CHANGELOG-9.6.1.md) · [CHANGELOG-9.6.0.md](CHANGELOG-9.6.0.md)

## Ship this

| | |
|---|---|
| **Installer** | `dist/Smart Vision ERP Setup 9.8.1.exe` |
| **Portable** | `dist/Smart Vision ERP 9.8.1 Portable.exe` |
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
npm test                     # = node scripts/verify.js: rebuild + syntax + every test-*.js
node test-wiring.js
node test-reliability.js
node test-sync-merge.js
node test-wifi-sync.js
node test-lan-access.js
node test-bill-contact.js
node test-resilience.js
node test-bill-pdf.js
```

## AI agent in Zed

A read → write → verify → debug agent for this repo: **[docs/zed-agent.md](docs/zed-agent.md)**.

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
