---
name: debug
description: Systematic debugging for Smart Vision ERP when verify fails, a test breaks, or a bug is reported — reproduce, read the whole error, isolate, test hypotheses, fix the root cause, add a regression test. Use whenever anything fails or behaves wrongly.
---

# Debugging

## Procedure

1. **Reproduce.** Run the single failing suite: `node scripts/verify.js <suite>`.
   For a bug the user reports with no failing test, write a test that shows it
   first. A bug you cannot reproduce cannot be called fixed.
2. **Read the whole error**, top to bottom: the message, the `file:line`, and
   the test name. Fix the first failure only; later ones are often caused by it.
3. **Locate.** Open the code at the reported line (`read_file` with a range)
   and grep the function's callers.
4. **Hypothesize.** Write 2–3 possible causes. Pick the cheapest experiment
   that tells them apart. Don't change code before you have a hypothesis.
5. **Instrument if needed.** Add a temporary `console.log` in the test, or run
   a one-off `node -e "…"` that requires `./app/bill-format.js` or
   `./electron/…`. Remove all instrumentation before finishing.
6. **Fix the root cause**, not the symptom. Re-run the single suite, then the
   full verify.
7. **Lock it in.** The regression test must fail without the fix.

## Known failure patterns in this repo

| Symptom | Usual cause | Fix |
|---|---|---|
| `✗ compile` "Unexpected token (L:C)" | JSX syntax in the `.jsx` | Go to the line shown |
| `✗ compile` "edited by hand" | Change made in the generated `.js` | Port it into the `.jsx` (copy path is printed) |
| `✗ compile` "JSX compiler not installed" | `node_modules` missing | `npm install` |
| Test: `X is not defined` / `T.X is not a function` | Not in that suite's `globalThis.__T` list, or a shared script not loaded into the vm sandbox | Add it to `__T`, or add `vm.runInContext(...)` for the script |
| Passes in tests, broken in the app | New shared script missing from `app/erp.html`, or a browser-only API | Add the `<script>` before `erp-model.js` |
| Field disappears after CSV restore or Drive sync | Not in the table's `cols` in `app/backup-csv.js` | Add it, plus a round-trip test |
| Phone/tablet gets 401 from the PC | PIN or pairing token | `electron/pairing.js` `requireDataAuth` |
| Deleted record comes back after a sync | Removed without a tombstone | Use `entityDelete()`; see test-inventory-sync.js |
| Record from the phone missing or wrong on the PC | Merge rules in `applySyncPayload` | Reproduce in test-inventory-sync.js part 1 |
| test-reliability shows P2 "better-sqlite3 … MODULE_NOT_FOUND" | Expected outside Electron | Not a failure (only P0/P1 fail) |
| `npm install` fails rebuilding better-sqlite3 | Native module build | Tests don't need it: `npm install --ignore-scripts` is enough for verify |

## Rules

- Never change a test to match buggy behavior. If the test itself is wrong,
  fix it and explain why in the report.
- Never hide an error with try/catch or by deleting the check.
- Undo a failed attempt before trying the next one.
- After 3 attempts with the same error, your hypothesis is wrong: go back to
  step 4. After 5, stop and report what you tried, what you saw, and your best
  remaining guess.
