# Smart Vision ERP 9.8.0

Android: versionCode 3 / versionName 9.8.0, so it installs over 9.7.0 when signed with the
same key. **Sync every phone before installing.** Before building the APK run
`npm --prefix apk install` once (two new plugins), then `npm run apk:sync`.
`npm test` → 20 checks.

## 1. The bill
- **No table after "Balance due".** The HSN-wise tax table is gone; each item shows its HSN
  code in small print under its name, so the bill stays GST-correct without the extra table.
- **Send bill**, on the PC and on the phone:
  - right after a new bill is saved: **Bill saved → Send bill · Print · Done**;
  - on any bill: **Send bill** (next to Print). **Remind** still sends the payment reminder.
  - **Windows app:** the shop PC makes the PDF, WhatsApp opens for the customer's number,
    and the Downloads folder opens with the PDF selected: drag it into the chat.
  - **Phone (APK):** the phone makes the PDF itself (works offline, no shop PC needed) and
    opens Android's share sheet: WhatsApp, Gmail, Drive…
- **Fixed:** every WhatsApp button in the APK (bills, quotations, reminders, repairs) failed
  with "WhatsApp send failed": it called the shop-PC server, which doesn't exist inside the
  phone app.

## 2. Accounts: any time window
- **This month · Last month · any month · All time · Custom dates** (From – To, both days
  included). **Print** follows the window. The customer **Statement** has the same picker,
  with the opening balance worked out up to the From date.

## 3. Customer: print the full history
- **Print full history** on every customer: details and all-time totals, then equipment
  installed (with serials and warranty), installation jobs, service tickets, repairs, AMC,
  quotations, bills with every payment, and the complete timeline. Empty sections are left out.

## 4. Scan stock with the phone camera
- **Inventory → Scan stock.** On the phone the camera opens straight away; on the PC use a USB
  scanner or the webcam. Each scanned **barcode** (or SKU) adds the quantity per scan
  (default 1) to that item and is **saved at once**; it syncs to the shop PC like any stock
  change. The same label held in view counts once; take it away and show the next box.
- A code no item has → **add it on the spot** (name, price, stock; barcode filled in), then the
  camera carries on. **Undo last** takes the last scan back off.

## How it was checked
- New suites: test-send-bill.js (18), test-period-range.js (15), test-customer-history.js (16),
  test-stock-scan.js (12); test-gst-bill.js updated for the bill without the table.
- Browser, phone-sized, as the APK: new bill → Bill saved → Send bill → a real A4 PDF made on
  the phone and handed to the share sheet; Send bill on an existing bill; the PC path through
  the real shop-PC server (8/8).
- Camera: a fake camera playing barcode labels → Scan stock: opens on the camera, one scan per
  label (stock 240 → 242), an unknown EAN opens quick add, everything still there after
  reopening the app (8/8).
- Accounts custom window + print, customer full-history print (7/7).
- Phone ↔ shop PC ↔ SQLite sync (28/28).
- **Not checked here:** a physical Android phone (share sheet, camera permission, real labels)
  and the Windows installer build.
