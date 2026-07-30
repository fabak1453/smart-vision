# Smart Vision ERP v9.0

Windows desktop CCTV ERP — SQLite storage, offline license, Excel CSV backup, Google Drive sync.

## Ship this

| | |
|---|---|
| **Installer** | `dist\Smart Vision ERP Setup 9.0.0.exe` |
| **Owner login** | `smart` / `1234` |
| **Team login** | Set username + password under **Team & Owners** |
| **Remember me** | Login — save username and/or auto-sign-in next launch |

Do **not** share the `keygen/` folder (private signing key). The installer already omits it.

## What’s in v9

- Portable license serials — paste in **Menu → License**; works on any PC (no Machine ID)
- Master login `smart` / `1234`
- Remember me + auto-login (credentials stored via Electron `safeStorage`)
- Excel-friendly CSV backup / restore (Settings)
- Google Drive backup / restore (Settings)
- Customer cascade delete + restore brings linked quotes/jobs/etc. back
- Edit / delete across Operations, Catalog, tickets, AMC, repairs, quotes, invoices
- WhatsApp send: opens WhatsApp Web + saves PDF to Downloads

## License (owner)

1. Open `keygen/keygen.html` (or `cd keygen && npm install && node keygen.js …`)
2. Generate a serial:

```text
node keygen.js --days 365 --name "Customer"
node keygen.js --until 2027-03-31
node keygen.js --lifetime
node keygen.js --master
```

3. Customer pastes the serial in the app **License** window and clicks Activate.

- **14-day trial** on first run (`TRIAL_DAYS` in `electron/license.js`)
- Serial format: `SVE1.<payload>.<signature>` (offline Ed25519)

## Data on the PC

- Database: `%AppData%\Smart Vision ERP\data\erp.sqlite`
- Local rotating backups: `data\backups\` (last 10)
- Menu → **File → Open Data Folder**
- Settings → CSV export / restore, Google Drive connect / backup / restore

## Dev & build

```bash
npm install
npm start          # local run
npm run dist       # Windows NSIS installer → dist/
```

On Mac, `npm run dist` rebuilds SQLite for Windows. Run `npm install` again before `npm start` locally.

## Layout

```text
app/          ERP UI (index.html = login, erp.html = app)
electron/     Main process, SQLite, license, Drive, saved login
scripts/      prepare-app (offline React + compile JSX)
keygen/       Owner only — serial generator (never ship)
dist/         Built installer
```
