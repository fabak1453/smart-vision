# Data and backup

## Where data lives (installed Windows app)

| Item | Path |
|------|------|
| Database | `%AppData%\Smart Vision ERP\data\erp.sqlite` |
| Rotating copies | `%AppData%\Smart Vision ERP\data\backups\` (last 10; includes `-wal` / `-shm` when present) |

In the app: **File → Open Data Folder**.

## CSV (Settings)

- **Export** writes a v2 Excel-friendly CSV (`##` section per table).
- **Restore** is a full snapshot: tables present in the file replace live tables.
- If Excel dropped a `##` section and that table still has live rows, restore is **cancelled** so invoices/stock are not wiped. Export a fresh full backup and restore that instead.

## Phone / Samsung tablet (same Wi-Fi)

On the shop PC: Settings → **Phone & Samsung tablet — CSV on Wi-Fi** → **Turn on Wi-Fi CSV**. Keep the ERP window open.
The panel shows the **IP address**, **port** and **PIN** to type on the device (copy buttons included).

### Option A — phone / tablet browser (no install)

Open Chrome on the device and go to `http://<shop-pc-ip>:<port>/wifi-csv.html`, or type the **IP, port and PIN** into the “Phone & Samsung tablet — CSV on Wi-Fi” panel that the app now shows on the device itself.

- **Download CSV** saves a full backup on the device (clear error messages if the PIN is wrong or Wi-Fi CSV is off).
- **Send CSV to shop PC** restores that file on the PC (replaces live data). Requires the PIN.

To work on the **same live data** from the tablet (no CSV, no pairing), open `http://<shop-pc-ip>:<port>/erp.html` in the tablet's Chrome, **enter the shop PIN when asked**, and sign in — the tablet then reads and writes the same SQLite on the shop PC. Keep the ERP window open on the PC.

The PIN is what authorises the tablet on `/api.php`. Until it is entered the tablet
shows a **Not connected to the shop PC** bar and works on its own local copy, so a
disconnected tablet can never be mistaken for a synced one. The shop PC is always
the source of truth on connect: the tablet's older local copy is never pushed back.

Two people editing the same record from two tablets at once is last-write-wins.
For independent offline work use the APK (Option B), which merges instead.

### Option B — Android APK (offline + merge sync)

Settings → **Mobile / Android sync (APK)** on the device: type the **shop PC IP, port and PIN**, tap **Test connection**, then **Pair with shop PC** (or **Scan QR**).

- **Sync now** merges both ways against the shop PC (the PC stays the source of truth).
- **Auto-sync while on the shop Wi-Fi** syncs silently when the device returns to the shop network (on app focus and every few minutes).
- The same screen offers **CSV on Wi-Fi**: download the shop PC’s CSV or send a device CSV back — a paired device does not need to re-type the PIN.

Requirements: both devices on the same Wi-Fi, and the shop PC’s firewall must allow the ERP app (first run asks once). Turn Wi-Fi CSV / LAN pairing off when you are done. The Windows installer does not include the Android APK.

## Google Drive

Settings → connect / backup / restore. Uses the same CSV snapshot as local export. Last successful restore wins.

## Saves

Edits persist to SQLite through the local `api.php` POST. The header **Saved** only means the last write succeeded. Failed writes retry on the 1.5s autosave until the snapshot is on disk.
