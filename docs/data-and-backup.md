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

Settings → **Phone & Samsung tablet — CSV on Wi-Fi** → **Turn on Wi-Fi CSV**. Keep the ERP window open.

On the phone or tablet (same Wi-Fi), open the link shown in Settings (`/wifi-csv.html`) in Chrome. Enter the PIN.

- **Download CSV** saves a full backup on the device.
- **Send CSV to shop PC** restores that file on the PC (replaces live data). Requires the PIN.

Turn it off when you are done. The Windows installer does not include the Android APK; this page works in the tablet browser.

## Google Drive

Settings → connect / backup / restore. Uses the same CSV snapshot as local export. Last successful restore wins.

## Saves

Edits persist to SQLite through the local `api.php` POST. The header **Saved** only means the last write succeeded. Failed writes retry on the 1.5s autosave until the snapshot is on disk.
