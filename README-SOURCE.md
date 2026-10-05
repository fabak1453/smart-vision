# Smart Vision ERP — source code (September)

Source-only copy of the Smart Vision ERP project. **No build output, no `node_modules`,
no installers** — just the code, so it can be read and edited anywhere.

- **Size:** ~1.6 MB · 73 files · largest file 352 KB (safe for chat uploads)
- **Extracted from:** `smart-vision-desktop/`
- **Left out on purpose:** `node_modules/`, `dist/` (the `.exe` installers),
  `.gradlehome/`, APK build output, `keygen/` (license serials), `build/certs/` (signing certs)

---

## Read this first — what this code actually is

| Half | Folder | What it is |
|---|---|---|
| **UI / business logic** | `app/` | A React app written as plain JSX, no bundler |
| **Desktop shell** | `electron/` | Electron main process: SQLite storage, LAN server, license, Google Drive |
| **Android shell** | `apk/` | Capacitor project that wraps the *same* `app/` UI for phones/tablets |

### The one thing you must know before editing

`app/smart-vision-app.jsx` (~4,700 lines) is **the real source code**.

`app/smart-vision-app.js` (~10,800 lines) is **generated** from it by Babel
(`scripts/prepare-app.js`) and is what the app actually loads at runtime.

> **Edit the `.jsx`. Never hand-edit the `.js`** — it gets overwritten the next
> time anything builds. After changing the `.jsx`, regenerate:

```bash
npm install
npm run prepare-app      # recompiles .jsx -> .js and copies React into app/vendor/
```

Same for the APK: after `prepare-app`, run `npm run apk:sync` to copy the
compiled UI into `apk/www/`.

---

## What is NOT in this copy (and how to restore it)

Two things were left out to keep the upload small. Neither is source code —
both are recreated automatically:

| Missing | Restored by | Notes |
|---|---|---|
| `app/vendor/` (React + Babel, 3.3 MB) | `npm install && npm run prepare-app` | Copied out of `node_modules` by `prepare-app`. `babel.min.js` (3 MB of it) is only used to *compile* the JSX — the running app never loads it. |
| `app/assets/login-bg.jpg` (1 MB) | Copy from the original project | Only the login screen's background photo. The app runs without it; the login page just loses its photo. |

Also absent because they are generated at build time: `dist/`, `apk/www/`
(regenerate with `npm run apk:sync`), and everything under `apk/android/app/build/`.

---

## How to work on it

```bash
npm install                # Electron + React + better-sqlite3
npm run prepare-app        # compile JSX (REQUIRED after editing the .jsx)
npm start                  # launch the desktop app
npm test                   # 62 wiring + 18 sync-merge + 22 wifi-sync tests
```

Run the tests after editing `app/smart-vision-app.jsx`, `app/backup-csv.js`,
`app/erp-model.js`, or anything in `electron/`.

### Rebuilding the shippable apps (needs the toolchains)

```bash
npm run dist               # Windows .exe (NSIS installer + portable)
npm run apk:sync           # sync UI -> apk/www, then Gradle:
cd apk/android && ./gradlew assembleDebug
```

`npm run dist` needs Wine when cross-building from macOS. The APK needs
**JDK 21+** (Capacitor targets Java 21 — JDK 17 fails with
`invalid source release: 21`) plus the Android SDK.

---

## What changed in September (the two fixes in this version)

**1. Search a product by its serial number**
- `searchPayload()` resolves the product behind a matched serial and tags it with
  `matched_serials`, so the global search dropdown shows the product *and* the
  serial, and clicking it opens the product drawer (which has **Edit**).
- `productSerialRows()` / `findProductByRef()` match a serial's product by
  **uuid, name, SKU or id** — serials stored with a SKU reference still resolve.
- Inventory drawer lists a product's serials; Serial Tracking gained a search box
  and an **Open product** action; Equipment Register is searchable by serial.
- Search dropdown UX: picks on click, survives blur, and re-picking the same
  result re-opens it (`useNavigate` appends a nonce).

**2. CSV + data sync between the shop PC and phone / tablet over Wi-Fi**
- **Root cause fixed:** `apk/android/app/src/main/AndroidManifest.xml` had no
  cleartext-HTTP permission, so Android 9+ silently blocked `http://192.168.x.x`
  — sync and CSV could never work from the phone at all. Added
  `res/xml/network_security_config.xml`, `usesCleartextTraffic="true"` and
  `ACCESS_NETWORK_STATE`.
- The shop PC remembers its LAN port (`electron/pairing.js`, `electron/server.js`)
  so the address you type on the phone keeps working after restarts.
- New `/api/status` and `/api/ping` LAN endpoints that never leak the PIN
  (`/api/pair` returns redacted status to LAN clients instead of 403).
- Settings shows **IP**, **port** and **PIN** as separate copyable cards, plus a
  **Test connection** button and the `/erp.html` link for a tablet that wants the
  same live data with no sync at all.
- The APK can pair (IP/port/PIN or QR), **Sync now**, and auto-sync when it
  rejoins the shop Wi-Fi. A paired device no longer re-types the PIN for CSV.

---

## Layout

```text
app/                 ERP UI (React/JSX) - smart-vision-app.jsx is the source
  vendor/            (not included) React runtime, restored by prepare-app
electron/            Desktop shell: SQLite (db.js), LAN server (server.js),
                     pairing (pairing.js), license, Google Drive
apk/                 Capacitor Android project (wraps the same app/ UI)
  android/           Manifest + network policy + Gradle config
  scripts/sync-web.js  copies ../app into apk/www
scripts/             prepare-app (JSX->JS), build wrapper
docs/                Manuals: features, backup, license, installer, testing
test-*.js            Executable test suites (run with node)
build/               App icons
```

## Do not redistribute

`keygen/` and `build/certs/` were deliberately excluded — license serials and
signing certificates must never leave the build machine.
