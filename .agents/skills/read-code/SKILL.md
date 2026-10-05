---
name: read-code
description: How to find and read code fast in Smart Vision ERP — where each feature lives, grep anchors for the 5,500-line smart-vision-app.jsx, server endpoints, and which test covers what. Use before changing code, or to answer "where/how does X work".
---

# Reading this codebase

## Rules

- `app/smart-vision-app.jsx` is ~5,500 lines. Never read it whole: `grep` an
  anchor, then `read_file` about 150 lines around the hit.
- Don't read `app/smart-vision-app.js` (generated), `app/vendor/`,
  `node_modules/`, `apk/www/` or `package-lock.json` to understand behavior.
- Find every caller before changing a function: grep `name\(`.

## Map

| What | File | Grep for |
|---|---|---|
| Demo data and table shapes | app/smart-vision-app.jsx | `^const DB = \{` |
| In-app router and data API | app/smart-vision-app.jsx | `^function route\(`, `^const api = \{` |
| Create / edit forms per entity | app/smart-vision-app.jsx | `^const ENTITIES = \{`, `^function entityApplyEdit` |
| Business rules | app/smart-vision-app.jsx | `createInvoice`, `convertQuote`, `refreshDerived`, `normalizeQuoteItems`, `ensureCustomer` |
| Save, load, offline copy | app/smart-vision-app.jsx | `persistStateNow`, `applyState`, `snapshotState`, `writeOfflineSnapshot` |
| Talking to the shop PC | app/smart-vision-app.jsx | `lanFetch`, `dataApiHeaders`, `ShopAutoSync`, `ShopStatePoll` |
| Pages (React) | app/smart-vision-app.jsx | `^function (Dashboard\|Leads\|Quotes\|Invoices\|Customers\|Inventory\|Serials\|Settings)\(` |
| Search bar | app/smart-vision-app.jsx | `searchPayload` |
| Merge engine (phone sync) | app/erp-model.js | `rebaseLocal`, `SV_ERP`, `applySyncPayload`, `addTombstone` |
| CSV backup schemas | app/backup-csv.js | `cols: \[` |
| Printed bill / quotation, GST per line | app/bill-format.js | `sheetHtml`, `lineRows`, `gstSummary` |
| Camera scanning | app/scanner.js | `makeZxingDecoder`, `SvScan` |
| Login | app/auth-shared.js, app/login.js | `SV_AUTH` |
| LAN server and endpoints | electron/server.js | `urlPath` |
| SQLite storage | electron/db.js | `saveState`, `loadState` |
| PIN pairing, LAN auth | electron/pairing.js | `requireDataAuth`, `pair\(` |
| Window, menus, IPC, PDF export | electron/main.js | `ipcMain.handle\(` |
| Android wrapper | apk/ | AndroidManifest.xml, capacitor.config.json, apk-bridge.js |

## Which test covers what

| Area | Test file |
|---|---|
| Entities, invoices, quotes, accounts, search | test-wiring.js |
| Bill mobile number, leads → customers | test-bill-contact.js |
| Bill / quotation layout, WhatsApp PDF | test-bill-pdf.js |
| Item-wise GST, HSN, IGST, composition; backups keep every field | test-gst-bill.js |
| Accounts by month, customer statement, their print-outs | test-accounts-statement.js |
| Camera barcode / QR scanning and its wiring (APK, manifest) | test-scanner.js |
| Phone sync merge | test-sync-merge.js |
| Inventory from the phone: new, stock, edits, deletes, two devices | test-inventory-sync.js |
| Send bill: phone makes the PDF + share sheet; PC via the shop server | test-send-bill.js |
| Accounts / statement time windows (month, custom From–To) and their print | test-period-range.js |
| Customer full history print (equipment, jobs, tickets, repairs, AMC, quotes, bills) | test-customer-history.js |
| Scan stock: barcode / SKU → stock + save, unknown code → new item, undo | test-stock-scan.js |
| Windows app start: installer guard (native module per platform), plain startup errors + log | test-windows-start.js |
| Wi-Fi pairing, CSV over LAN | test-wifi-sync.js, test-lan-access.js |
| Data loss: restore, conflicts, storage quota | test-resilience.js |
| Crash and save probes | test-reliability.js |
| This agent kit (AGENTS.md, skills, Zed config) | test-agent-kit.js |

Tests reach app internals through `globalThis.__T = { … }`, appended near the
top of each test file. That list tells you what a suite can call.

## Tracing a feature end to end

UI page → `ENTITIES[...]` (form) → `route()` / `api` → business function →
`persistStateNow()` → CSV schema in `app/backup-csv.js` → `electron/server.js`
endpoint → `electron/db.js`.

## Before you write, have

- the exact function(s) to change and all their callers;
- the test file you will run (or will add to);
- the one-line check that proves it works.
