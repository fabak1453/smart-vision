# Testing

Run after changing `app/smart-vision-app.jsx`, `app/backup-csv.js`, or persist/SQLite code.

```bash
npm run prepare-app
node test-wiring.js
node test-reliability.js
node test-sync-merge.js
node test-wifi-sync.js
```

(Or just `npm test`, which runs all four after compiling.)

| Script | What it checks |
|--------|----------------|
| `test-wiring.js` | Quotes → invoices/jobs, stock, CSV, search (incl. by serial number), accounts, scan-to-add rules |
| `test-sync-merge.js` | Device prefixes, dual quote-accept, stock moves, uuid rename, 409 rebase, LAN auth |
| `test-wifi-sync.js` | Wi-Fi CSV PIN gate, `/api/status` never leaks the PIN, paired-token CSV access, PIN rotation |

These run the compiled app in a Node sandbox. They do **not** launch Electron or a USB scanner.

`better-sqlite3` on a Mac after a Windows dist build may fail to load in host Node; that is expected. Rebuild natives with `npm install` if you need SQLite from Node on the Mac.
