# Smart Vision ERP — agent instructions

You are working in the Smart Vision ERP repo (Windows Electron app + Android
Capacitor wrapper, one shared React UI). Work like an autonomous coding agent:
keep going through the loop below until the task is done **and verified**. Do
not stop to ask between steps unless a "stop and ask" rule applies.

## The loop

1. **READ** — understand before touching anything. Find the code (`grep`,
   `find_path`), read the relevant ranges, and read the test that covers it.
   Then state in 1–3 lines: what you will change, and the check that will
   prove it worked.
2. **WRITE** — make the smallest change that does it. Read a file before
   editing it. One concern at a time. Bug fix → add a test that fails without
   the fix.
3. **VERIFY** — run `node scripts/verify.js` (everything) or
   `node scripts/verify.js <suite>` (one test file, while iterating). Read the
   `RESULT:` line. Also run `diagnostics` on files you edited.
4. **DEBUG** — if anything failed: read the whole error, reproduce it, fix the
   root cause (never weaken or delete a test to get green), go back to 3.
   Same failure three times → change approach. Five attempts on one failure →
   stop and report what you tried and what you saw.

Repeat 2–4 until `node scripts/verify.js` (same as `npm test`) ends with
`RESULT: PASS`. For bigger
tasks, split into steps and run the loop per step. Detailed procedures are in
the skills: `/loop`, `/read-code`, `/write-code`, `/verify`, `/debug`.

A change is **verified** only when the full run passes **and** a test (old or
new) actually exercises the changed code. Never say "done" or "fixed" without
`RESULT: PASS` from this session.

## Stop and ask first

- Deleting files or data you did not create; any `git commit`, `push`,
  `reset`, `checkout`, `restore`, `clean` or `stash`.
- Building or shipping: `npm run dist`, Gradle, version bumps, releases.
- Incompatible data changes: CSV columns, SQLite tables, the sync/LAN
  protocol, `androidScheme` in `apk/capacitor.config.json` (changing it wipes
  phones' data).
- Anything in `keygen/` or `build/certs/` (license serials, signing certs).
- A product decision the request does not settle: ask one question and give
  your recommendation.

## Finish with a short report

What changed (files) and why · the verify command and its `RESULT:` line ·
anything not verified (e.g. needs the Windows app or a phone) and the risk.

## Project facts

- **Edit `app/smart-vision-app.jsx`. Never edit `app/smart-vision-app.js`** —
  it is generated from the `.jsx` (`npm run prepare-app`; `verify.js` runs it
  for you). Never edit `app/vendor/` or `apk/www/` either (both generated).
- The UI is plain React 18 JSX with no bundler and no `import`. Shared code is
  plain scripts that set a global: `SV_ERP` (app/erp-model.js), `SvBackupCsv`
  (app/backup-csv.js), `SvBill` (app/bill-format.js), `SV_AUTH`
  (app/auth-shared.js). A new shared file needs a `<script>` in `app/erp.html`
  **before** the `erp-model.js` line (APK sync hooks that exact line).
- `electron/` is the Windows shell: `main.js`, `server.js` (LAN API),
  `db.js` (SQLite), `pairing.js`, `license.js`, `google-drive.js`.
  `electron/backup-csv.js` only re-exports `app/backup-csv.js`.
- Bills and quotations: `app/bill-format.js` is the one template for both the
  in-app print and the WhatsApp PDF.
- Data is one state snapshot. A new field on a record must also be added to its
  CSV schema in `app/backup-csv.js`, with a test that it survives export/import.
- Delete records only through `entityDelete()`: it writes a tombstone to
  `DB.tombstones` so sync can't bring the record back. Never splice `DB` arrays.
- Tests are plain Node (no Electron, SQLite or phone): `test-*.js` in the repo
  root. They run the compiled app in a `vm` sandbox and reach internals through
  the `globalThis.__T = { … }` list appended in each test file — add a function
  there to test it.
- Money is GST-inclusive, formatted `en-IN` (₹1,86,400); dates `en-IN`.
