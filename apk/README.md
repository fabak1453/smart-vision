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
2. Settings → **Enable LAN pairing** (and/or **Turn on Wi-Fi CSV**). Note the **IP**, **port** and **PIN**.
3. Phone (same Wi-Fi): Settings → **Mobile / Android sync (APK)** → type IP + port + PIN → **Test connection** → **Pair with shop PC**.
4. After field work: **Sync now** (or leave **Auto-sync while on the shop Wi-Fi** on).
5. The same panel has **CSV on Wi-Fi**: download the shop PC's CSV or send one back.

The phone never POSTs a full snapshot to `api.php`.

## Reaching the shop PC over plain HTTP

Two separate things block this, and both are handled:

**1. Android's cleartext policy.** `res/xml/network_security_config.xml` permits
cleartext and `AndroidManifest.xml` sets `android:usesCleartextTraffic="true"`.

**2. The WebView's mixed-content rule.** Capacitor serves the app from
`https://localhost` (`androidScheme: "https"`). A page on a secure origin may not
call `http://192.168.x.x`, and no cleartext setting changes that. So every shop-PC
call goes through `lanFetch()` in `app/smart-vision-app.jsx`, which uses Capacitor's
native `CapacitorHttp` plugin when running inside the APK. Native requests are made
by Java, outside the page's origin, so the rule does not apply. Same-origin calls
are never routed through it.

`androidScheme` is deliberately left as `https`: switching it to `http` would also
work, but it changes the storage origin and every phone would lose its local data.

Keep all three — the two XML files and `lanFetch()` — or LAN sync and CSV go silent
on the phone again.

## Files the build needs

`res/xml/file_paths.xml` must exist: `AndroidManifest.xml` points its FileProvider at
`@xml/file_paths`, and without it Gradle fails at resource linking with
`resource xml/file_paths not found`. `npx cap sync` does **not** recreate it.
