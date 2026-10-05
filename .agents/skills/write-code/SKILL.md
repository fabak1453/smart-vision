---
name: write-code
description: Rules for editing Smart Vision ERP safely — edit the .jsx never the generated .js, smallest diff, shared globals, data and CSV schema changes, UI conventions, and how to add a regression test. Use whenever you are about to edit or create files.
---

# Writing code here

## Hard rules

- Edit `app/smart-vision-app.jsx`. Never `app/smart-vision-app.js`,
  `app/vendor/`, `apk/www/` (all generated). Verify rebuilds the `.js`.
- `read_file` before `edit_file`. Change only what the task needs; do not
  reformat or rename unrelated code.
- No new npm dependencies without asking. The app runs offline with no bundler:
  plain scripts and globals only, no `import` / `export`.
- Match the surrounding style: 2-space indent, single quotes, semicolons,
  `const`/`let`, comments that explain *why*.
- Never touch `keygen/`, `build/certs/`, or `androidScheme`.

## Shared code (used by app/ and electron/)

Follow `app/bill-format.js` or `app/backup-csv.js`:

```js
(function (g) {
  'use strict';
  function thing() { /* … */ }
  const api = { thing };
  g.SvThing = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
```

- App side: add `<script src="./thing.js"></script>` to `app/erp.html`
  **before** the `erp-model.js` line, and read it in the `.jsx` as
  `const SvThing = (typeof globalThis !== 'undefined' && globalThis.SvThing) || null;`
- Electron side: `require('../app/thing.js')`.
- Test side: the vm sandboxes load scripts explicitly; add
  `vm.runInContext(fs.readFileSync(...thing.js...), sandbox)` in any suite
  that runs app code calling it.

## Data changes (records, fields, tables)

1. Add the field where the record is created/edited (`ENTITIES`, builders).
2. Add it to that table's `cols` in `app/backup-csv.js`, or a CSV backup or
   Google Drive restore will drop it.
3. Old data will not have it: always read it with a fallback.
4. Test that it survives `buildBackupCsvText()` → `importBackupCsv()`
   (see test-bill-contact.js, section 6).
5. Deleting: go through `entityDelete()` (it records a tombstone). Records are
   matched across devices by `uuid`, then by business key (product SKU,
   document number, customer name): see `BUSINESS_KEY` in app/erp-model.js.

## UI conventions

Buttons `btn-p` (primary) / `btn-o` (outline), inputs `inp`, labels
`field-l`, icons `<Ic n="name" s={14}/>`, forms `FormModal`, list pages
`TablePage`, money `inr()`, dates `date()`. Copy a nearby component rather
than inventing a new pattern.

## Adding a test

- Prefer the existing suite for the area (see `/read-code`, "Which test
  covers what").
- To call an internal function, add its name to that file's
  `globalThis.__T = { … }` list.
- New area: create `test-<area>.js` modeled on `test-bill-pdf.js` (plain
  `ok(cond, msg)` checks, exit 1 on failure, last line
  `ALL n … TESTS PASSED ✓`). `scripts/verify.js` picks up every `test-*.js`
  automatically.
- A bug-fix test must fail without the fix. Check that once.

Then go to `/verify`.
