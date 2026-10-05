---
name: loop
description: Cursor-style autonomous coding loop for Smart Vision ERP — read, write, verify, debug, repeated until `node scripts/verify.js` prints RESULT PASS. Use for any bug fix, feature, refactor or "make it work" request that changes code.
---

# The loop

Run this without pausing for permission between steps. Pause only for the
"stop and ask" cases in AGENTS.md.

## 0. Frame the task (once)

- Restate the goal in one line.
- Define **done** as something observable: a test name, a function's output,
  a value on the printed bill. If you cannot name it, you do not understand
  the task yet; go back to reading.
- If the request is ambiguous in a way that changes what you would build, ask
  ONE question with your recommendation. Otherwise state your assumption and
  continue.
- Big task? Split it into steps that can each pass verify on their own, and
  loop per step.

## 1. Read (detail: `/read-code`)

Find the code, every caller, and the test that covers it. Write down the
check that will prove the change works.

## 2. Write (detail: `/write-code`)

Smallest change that does it. For a bug: write the failing test first when
practical, watch it fail, then fix.

## 3. Verify (detail: `/verify`)

- While iterating: `node scripts/verify.js <suite>` (e.g. `bill-pdf`).
- Before finishing: `node scripts/verify.js` (everything).
- Read the `RESULT:` line, not just the exit code.

## 4. Debug (detail: `/debug`)

Any ✗: fix the **first** failure only, then go back to 3.

## Budgets and stop rules

- One failure: at most 5 fix attempts. After 3 attempts with the same error,
  change your hypothesis, not just the code.
- Whole task: if verify has run ~15 times without converging, stop and report
  what you know.
- Never do any of these to get green: delete, skip or loosen a test; wrap code
  in try/catch to hide an error; edit generated files
  (`app/smart-vision-app.js`, `app/vendor/`, `apk/www/`).
- Undo a failed attempt before trying the next one; don't stack guesses.

## Keep a short running log in your replies

```
Step 1/2 — unit price column on the bill
✓ read   lineRows() in app/bill-format.js; covered by test-bill-pdf.js
✓ write  unitPrice = amount ÷ qty
✗ verify test-bill-pdf: "fractional unit prices show exactly two decimals"
→ debug  money() rounds to 3 places; fixing money()
✓ verify node scripts/verify.js → RESULT: PASS — 11 checks
```

## Done means

1. `node scripts/verify.js` (full, not partial) → `RESULT: PASS`.
2. A test exercises the change (point to it).
3. Report: files changed and why · the RESULT line · what is not verified
   (e.g. needs the Windows app, a printer or a phone) and the risk.
