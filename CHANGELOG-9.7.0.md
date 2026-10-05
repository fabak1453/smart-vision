# Smart Vision ERP 9.7.0

Android: versionCode 2 / versionName 9.7.0, so it installs over 9.6.x when signed with the
same key. **Sync every phone before installing.** `npm test` → 16 checks.

## 1. Bills: item-wise GST
- Products have a **GST rate** (0 / 5 / 18 / 40 %, the slabs since 22 Sep 2025), **HSN**,
  **unit**, **barcode** and **MRP** (the new ones under "More details" in the product form).
- Each bill line keeps the rate it was billed at, so an old bill reprints the same even if a
  product's rate changes later. Lines without a rate (older bills) are billed at 18 %.
- GST worked out per line to the paisa, CGST = SGST (equal halves). Customers now have a
  **GSTIN** field: it prints on the bill, and a GSTIN from another state gives **IGST**.
- **HSN-wise tax summary** under the totals; quantities print with their unit (180 Mtr).
- Composition dealers: `gst_scheme: 'composition'` prints a **Bill of Supply** without tax.

## 2. Accounts by month; customer statement
- Accounts: **This month · Last month · any of the last 24 months · All time**, and **Print**
  (A4: summary, by category, every entry; follows the In / Out filter).
- Customers → **Statement** tab: opening balance, every invoice and payment with a running
  balance, closing balance, for any month or all time; **Print statement** (A4, with amount
  due in words and the other activity in that period).
- An undated payment now shows on the invoice date everywhere (the timeline used to invent
  a date two days later).

## 3. Camera scanning on the phone
- **Why it never worked:** "Use camera" called a barcode plugin that was never installed in
  the APK, so it fell back to a typing prompt; the app also had no camera permission.
- Now a built-in scanner (`app/scanner.js` + ZXing 0.23.0, bundled offline) uses the camera
  in the APK, a tablet browser or a PC webcam. Code 128 (serial labels), QR, Data Matrix,
  Code 39/93, EAN/UPC, ITF.
- **Scan to add serial**: pick the product, tap **Use camera**, then point at label after
  label; each new serial is added in stock (+1) with a beep and vibration; a label already
  registered gives an error beep; the same label in view counts once. Torch button where
  the phone supports it.
- **Settings → Scan QR** pairs with the shop PC through the camera.
- AndroidManifest: `CAMERA` permission (camera not *required*, so phones without one still install).

## 4. Everything else working
- Smoke test of every page on desktop and phone, every "New …" form, opening a record on
  every list, and every print-out: 116 checks, no errors.
- Fixed: the **Accounts** menu icon was blank (the "wallet" icon did not exist).
- Fixed (data loss): a **product saved without a SKU was dropped by a CSV restore**.
- Fixed: after a restore, **bill lines lost their identity**, so the next phone sync could
  duplicate them. New fields and line identity are in the CSV backup; older backups still restore.

## How it was checked
- New suites: test-gst-bill.js (19), test-accounts-statement.js (24), test-scanner.js (17).
- Camera: a simulated phone camera showing serial labels → Scan to add → 3 serials, stock
  +3, duplicate refused; the camera reading the PC's QR → paired with the real shop-PC server.
- Phone ↔ shop PC ↔ SQLite: 28/28 (incl. the GST rate reaching SQLite).
- Decoder on 108 camera-like frames: 92 % (serial) / 83 % (QR) per frame in realistic
  conditions, 0 wrong reads.
- **Not checked here:** a physical Android phone (camera permission prompt, focus, real
  labels) and the Windows installer build.
