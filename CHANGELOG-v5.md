# Smart Vision ERP — Version 5 Changelog

**Release: module wiring update.** Every module was scanned and re-wired so that a change
in one place is now visible everywhere it is linked. All 19 issues found in the audit are
fixed and verified by an automated 26-test wiring suite (all passing).

---

## 💰 Money flow — now connected end to end

| # | Fix |
|---|-----|
| 1 | **Lifetime Value is live.** Every invoice (manual, from a quote, from an AMC, from a repair) adds to the customer's lifetime value. New customers no longer stay at ₹0. |
| 2 | **Repairs get billed.** When a chargeable (paid-coverage) repair is advanced to *Delivered*, an invoice is created automatically and linked — repair revenue now appears in Invoices, Outstanding, Reports and the Dashboard. The repair drawer shows its invoice number. |
| 3 | **AMC contracts get billed.** Creating an AMC with a value automatically raises an invoice for the annual charge (complimentary/free AMCs are not billed). |
| 4 | **Accepted quotes convert.** Marking a quote *accepted* (in the builder or on creation) automatically creates the invoice **and** an installation job — once only, with the linked INV/JOB numbers shown in the quote drawer. |
| 5 | **Won leads become customers.** Advancing a lead to *Won* (or accepting its quote) creates the customer record if it doesn't exist, carrying over segment and owner. |
| 6 | **Purchasing updates stock.** Purchase orders now take a product + quantity, can be advanced through stages, and **Mark Received** adds the quantities into Inventory stock (protected against double-stocking). |

## ⏱ Statuses are now computed live (nothing stays frozen)

| # | Fix |
|---|-----|
| 7 | Invoices automatically show **overdue** once the due date passes and a balance remains — table pills, filters, stats and notifications all agree now. |
| 8 | AMC status (**active / expiring / expired**) is recomputed from the end date on every screen load — the ⏰ expiring notifications are now always correct. |
| 9 | Warranty flags on equipment and serials are recomputed from the warranty end date — no more "in warranty" devices with expired dates. |

## 📊 Reporting & intelligence

| # | Fix |
|---|-----|
| 10 | **Insights are real.** Dashboard insights and the Insights page are now generated from your actual data: SLA breaches, expiring AMCs (with value at risk), biggest outstanding receivable, pipeline size & hottest lead, low-stock products (noting items already on order), and repairs past their promised date. The old hardcoded demo sentences are gone. |
| 11 | **"Revenue this month" is truly monthly.** Payments are now recorded with dates (payments log) and the Dashboard/Reports figure sums only the current month. |
| 12 | **Warranty report completed.** It now lists in-warranty *and* out-of-warranty equipment plus serials, deduplicated by serial number. |
| 13 | **Overdue-invoice notifications** added to the 🔔 popover (alongside SLA, AMC and low-stock alerts, all reading live statuses). |

## 🔗 Cross-module links

| # | Fix |
|---|-----|
| 14 | **Serial ↔ Equipment ↔ Stock wired.** Adding a serial as *installed* creates the equipment record and deducts one from stock; adding equipment registers its serial (and deducts stock). Equipment now picks its product from the inventory list — no more broken links from typos. |
| 15 | **Tickets ↔ AMC wired.** Resolving an AMC-coverage ticket consumes an AMC visit and logs it in the ticket's activity. Every status change writes an activity line, and tickets now have **Start / Hold / Resume / Resolve** buttons (the *in progress* and *on hold* filters are finally reachable). |
| 16 | **Customer editing with full cascade.** Customers can now be **edited** (and safely **deleted**). Renaming a customer updates the name across all 9 linked modules: leads, quotes, invoices, jobs, tickets, AMC, equipment, credentials, serials and repairs. Deleting is blocked while linked records exist; duplicate customer names are blocked on create and rename. |
| 17 | **Team changes cascade.** Renaming a team member updates every owner / technician / assignee reference; removing a member unassigns their jobs/tickets/repairs and moves their accounts to another owner. Duplicate team names are blocked. |
| 18 | **WhatsApp buttons are guarded.** Quote-send, invoice reminder, AMC renewal and repair updates all check the customer's phone number first (clear message instead of a broken wa.me link), and the invoice reminder / AMC renewal now send real, detailed messages with amounts and dates. |

## 🛡 Data safety

| # | Fix |
|---|-----|
| 19 | **Collision-proof document numbers.** QT / INV / JOB / TKT / AMC / PO / SR numbers are generated from the highest existing number, not the row count — no duplicates even after deletions. |
| 20 | **Login identity fixed.** Signing in now consistently identifies you as **Aslam 420 (Owner)** in the header, mock API and owner dropdowns. |
| 21 | **Payment recording hardened.** Payments can never exceed the invoice total, and each payment is stored with its date (also shown accurately in the customer timeline). |

## ✔ Verification

Automated wiring test suite (26 tests) executed against the real application code —
quote conversion, AMC/repair billing, PO receiving, stock deduction, serial↔equipment
sync, live overdue/expired statuses, generated insights, rename/remove cascades,
numbering safety, monthly revenue, login identity, duplicate guards, and all 20 API
routes. **26 / 26 passed.**

---
*Smart Vision ERP v5 · Smart Vision Enterprise, Borsad · Login unchanged (Aslam 420 / 420)*
