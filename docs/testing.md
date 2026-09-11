# Testing

Run after changing `app/smart-vision-app.jsx`, `app/backup-csv.js`, or persist/SQLite code.

```bash
npm run prepare-app
node test-wiring.js
node test-reliability.js
node test-sync-merge.js
```

| Script | What it checks |
|--------|----------------|
| `test-wiring.js` | Quotes → invoices/jobs, stock, CSV, search, accounts, scan-to-add rules |
| `test-sync-merge.js` | Device prefixes, dual quote-accept, stock moves, uuid rename, 409 rebase, LAN auth |

These run the compiled app in a Node sandbox. They do **not** launch Electron or a USB scanner.

`better-sqlite3` on a Mac after a Windows dist build may fail to load in host Node; that is expected. Rebuild natives with `npm install` if you need SQLite from Node on the Mac.
