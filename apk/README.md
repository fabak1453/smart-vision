# Android APK (separate from Windows)

This folder is the **only** place Capacitor/Gradle live. The Windows app stays in `app/` + `electron/` and is not modified by APK builds.

| Keep safe (Windows) | APK-only |
|---------------------|----------|
| `app/`, `electron/`, `build/`, `dist/` | `apk/` |

`scripts/sync-web.js` **copies** compiled UI from `../app` into `apk/www`. It does not write into `app/`.

## Build a debug APK

From the **repo root**:

```bash
npm install
npm run prepare-app
cd apk
npm install
npm run sync
cd android && ./gradlew assembleDebug
```

Or from root: `npm run apk:sync`

APK: `apk/android/app/build/outputs/apk/debug/app-debug.apk`

Needs JDK + Android SDK. Do **not** run `npx cap` from the repo root (that would target the Windows tree).

## On the shop PC

1. Open the Windows ERP (licensed or trial).
2. Settings → **Enable LAN pairing**. Note PIN and `http://<lan-ip>:<port>`.
3. Phone (same Wi-Fi): Settings → URL + PIN → **Pair with shop PC**.
4. After field work: **Sync now**.

The phone never POSTs a full snapshot to `api.php`.
