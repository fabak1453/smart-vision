# Development

## One-time setup

```bash
cd "/path/to/smart-vision-desktop"
npm install
```

## Run on this computer (Electron)

```bash
npm start
```

That runs `npm run prepare-app` then `electron .`.

## Compile the UI only (no window)

Edit **`app/smart-vision-app.jsx`** (source of truth). Compile:

```bash
npm run prepare-app
```

Output: `app/smart-vision-app.js` plus vendor copies under `app/vendor/`. The packaged exe uses the compiled `.js`, not live JSX.

## Layout

```text
app/          Login + ERP UI (erp.html loads smart-vision-app.js)
electron/     Main process, SQLite, local HTTP API, license, Drive
scripts/      prepare-app.js
keygen/       Owner serial tool — not shipped
dist/         Installers (gitignored)
```

## Rebuild Windows installer

See [windows-installer.md](windows-installer.md):

```bash
npm run dist
```
