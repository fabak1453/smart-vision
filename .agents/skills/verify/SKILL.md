---
name: verify
description: Verify a change in Smart Vision ERP — run scripts/verify.js, read its result, confirm a test actually exercises the change, and get an independent review of the diff. Use after every edit and always before saying a task is done.
---

# Verifying

## Commands

| When | Command |
|---|---|
| Iterating on one area | `node scripts/verify.js bill-pdf` (any part of a test file name) |
| Several areas | `node scripts/verify.js wiring resilience` |
| Before finishing (required) | `node scripts/verify.js` (same as `npm test`) |

It rebuilds the `.js` from the `.jsx`, syntax-checks every script, parses the
JSON configs, and runs every `test-*.js`. Needs `npm install` once. No
Electron, SQLite or phone.

## Reading the output

- The last line is `RESULT: PASS — n checks` or
  `RESULT: FAIL — … Fix the first one (X), then re-run: <command>`.
- `✗ compile … does not compile` shows the `.jsx` line and column.
- `✗ compile … edited by hand` means a change was made in the generated `.js`.
  The message says where the copy was saved. Port the change into the `.jsx`;
  the failure stays until you do.
- `(partial run)` is not done: run the full command before finishing.
- Also run the `diagnostics` tool on files you edited.

## Verified means all three

1. Full `node scripts/verify.js` → `RESULT: PASS` in this session.
2. A test exercises the changed code. If none does, add one (`/write-code`).
   To prove it matters, temporarily undo the fix: the test must fail.
3. The diff contains only what the task needs. With git: `git diff --stat`,
   then read `git diff`. Without git (no `.git` folder): re-read each file you
   edited around the change. Look for debug logs, stray edits and generated
   files.

## Independent review (anything bigger than a one-liner)

If the `spawn_agent` tool is available, spawn a reviewer with fresh context:

> Review the changes made for this task (`git diff` if the repo uses git;
> otherwise these files: <list the files you edited>). Task:
> <task>. Read each changed file around the edits. Report concrete problems
> only: bugs, callers that were not updated, missing or weak tests, edits to
> generated files (app/smart-vision-app.js, app/vendor/, apk/www/), data or
> CSV format risks, Windows/Android differences. Do not edit anything.

Fix what it finds, then re-run verify. Without `spawn_agent`, do the same
review yourself by re-reading the diff as if someone else wrote it.

## What tests cannot see

Printing, the Electron window, real Wi-Fi between devices, the Android build.
For those, say so in the report and give the user a short manual check, e.g.
"`npm start` → Invoices → open INV-2001 → Print: logo whole, address once".
