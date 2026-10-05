# Smart Vision ERP 9.6.1 — the bill PDF

Covered by `test-bill-pdf.js` (41 tests). `npm test` now runs all eight suites.

## One builder for every bill

The in-app A4 print and the WhatsApp PDF were two hand-kept copies of the same
document, and they had drifted. Both now come from **`app/bill-format.js`**
(`SvBill.sheetHtml` + `SvBill.css`). The app loads it as a plain script from
`erp.html`; `electron/document-html.js` `require()`s it. Change the bill there,
once.

## What was wrong, and what changed

**Logo cut off.** The CSS was not the cause: `app/assets/sv-logo.png` itself was
cropped through the S of SMART, the T of "The", the N and the tail of the y.
The logo has been rebuilt with the same emblem and the wordmark re-set (Montserrat,
the closest open font to the original) with clear space on every side. The logo now
sizes from its own shape (`width/height: auto`, bounded by `max-width: 62mm` /
`max-height: 24mm`, `object-fit: contain`) so an uploaded logo of any shape fits
without being cropped, stretched or squeezed by a long address.
*If your designer has the original uncropped logo file, upload it under
Settings → Company → Replace logo; that beats the rebuild.* A logo that was
already uploaded there is stored with the company record and is not replaced
by this update.

**Address printed twice.** The in-app letterhead rendered address, phone/email and
website twice. The company now appears once in the letterhead; the customer sits in
its own **Bill to** box (name, contact, area, mobile, GSTIN when the record has
one), with invoice no./dates in a separate box beside it.

**Qty and Unit price columns.** `# | Description | Qty | Unit price | Amount`.
Lines store the line total and qty, so unit price = amount ÷ qty (two decimals
when not whole). ₹0 package lines show *incl.* with no price; note lines (e.g.
"Reported issue" on a repair bill) show no qty or price; old lines saved without
a qty print as 1.

**Computer-generated note.** Footer: "This is a computer-generated invoice." (or
quotation).

**Layout.** Amount in words (Indian system, lakh/crore, paise), "All prices include
GST @ 18%" note beside the totals, Terms & conditions heading, signature block,
tabular figures. Long bills repeat the table header on the next page and never
split a row. The navy header now prints even when *Background graphics* is
unticked in the print dialog (it used to print white-on-white). Tax math is
unchanged.

## WhatsApp PDF was never being saved

In `electron/main.js`, `loadURL()` already waits for `did-finish-load`; the code then
waited for that event a second time, which never fires. Every export hit the 15 s
timeout, logged `pdf export failed`, and WhatsApp opened with no PDF. Reproduced in
Electron 33, fixed, and the fixed path re-run in Electron 33 (ready in ~0.4 s, logo
loaded). It also passed `marginsType`, which is not an Electron 33 option, so the PDF
would have been US Letter; it is now A4 using the page's own 14 mm margins.

## Files

`app/bill-format.js` (new) · `app/smart-vision-app.jsx` (+ regenerated `.js`) ·
`app/erp.html` · `app/assets/sv-logo.png` · `electron/document-html.js` ·
`electron/main.js` · `test-bill-pdf.js` (new) · `package.json` (version, test script)

## Inventory from the phone (APK) reaches the shop PC's database correctly

Checked end to end against the real shop-PC server and SQLite file, with the
APK's web bundle on a phone-sized screen. **Already working:** pairing; adding a product on the
phone; it survives an app restart; auto-sync writes it to SQLite (`state` and
`erp_products`); Set stock; PC restart. **Broken, now fixed** (each reproduced
first; covered by `test-inventory-sync.js`, 36 tests):

- **Phone and PC both added a product before syncing** → same id. The shop
  renumbered the phone's product but its quote/invoice/PO lines kept the old
  id, so they pointed at the *shop's* product (wrong item, wrong stock). Lines
  are now renumbered with the product.
- **The same new item entered on both devices** (same SKU) → the phone's copy
  took over the record's identity, so the shop's earlier sales stopped counting
  (stock 10 instead of 9). The shop's identity is kept; the phone's stock moves
  are pointed at it.
- **A second phone synced first** → the shop answers 409 and the phone retried
  with *new records only*: its edits to existing records (a price, a payment)
  were silently dropped. The retry now sends everything and the merge keeps
  whichever side changed each record last. The PC window's own conflict path
  (`rebaseLocal`) had the same gap and is fixed the same way.
- **Deleted on the PC** → the next sync from a phone that still had it created
  it again. **Deleted on the phone** → it stayed listed on both. Deletes now
  leave a tombstone in `DB.tombstones` (saved with the data, mirrored to
  SQLite as `erp_tombstones`, included in the CSV backup); the record leaves
  its table everywhere and a stale copy can't bring it back. An edit made
  *after* a delete still wins. Snapshots from 9.6.0 (deleted rows left in
  place) are converted on load; backups without the new section still restore.

Sync decides "last change" by each device's clock: a phone set to the wrong
date can make its old copies look new.

## Developer tooling (not part of the installer)

- **`npm test` is now `node scripts/verify.js`**: rebuilds the `.js` from the
  `.jsx`, syntax-checks every script, parses the JSON configs and runs every
  `test-*.js` it finds, so a new suite can't be forgotten in a hand-kept list.
  It ends with one `RESULT: PASS/FAIL` line. `node scripts/verify.js bill-pdf`
  runs a single suite. A hand edit to the generated `app/smart-vision-app.js`
  fails verify, and keeps failing until the change is made in the `.jsx`; the
  edited copy is saved rather than lost.
- **Zed agent kit**: `AGENTS.md`, `.agents/skills/` (loop, read-code,
  write-code, verify, debug), `.zed/tasks.json`, `docs/zed-user-settings.jsonc`,
  `docs/zed-agent.md`. Kept honest by `test-agent-kit.js`.
