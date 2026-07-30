# Smart Vision ERP — Windows Desktop App

Your CCTV ERP as a real Windows application:
SQLite database on disk, free trial + machine-locked license keys, master key, keygen tool.

**App login:** username `smart` · password `SV@7866` (session stays until you sign out)

---

## 1) Build the Windows installer (.exe)

On any Windows PC with Node.js LTS installed (https://nodejs.org):

```
cd smart-vision-desktop
npm install
npm run dist
```

If you build the Windows `.exe` on a Mac, `npm run dist` rebuilds SQLite for Windows automatically.
After that, run `npm install` again before `npm start` on the Mac (local dev needs the Mac SQLite binary).

The installer appears in `dist\Smart Vision ERP Setup 5.1.0.exe`.
Give that one file to customers — it installs like any normal Windows program
(Start-menu + desktop shortcut).

To test without building the installer: `npm start`

> ⚠ Before sharing the installer, DELETE the `keygen` folder from anything you
> distribute. It contains your PRIVATE signing key. `npm run dist` already
> excludes it from the installer, but never send the source folder to customers.

---

## 2) Database (SQLite)

All ERP data is stored in a real SQLite database:

```
C:\Users\<name>\AppData\Roaming\Smart Vision ERP\data\erp.sqlite
```

- The app's full state lives in the `state` table; every entity is also
  mirrored into its own SQL table (`erp_customers`, `erp_leads`, `erp_quotes`,
  `erp_invoices`, `erp_jobs`, `erp_tickets`, `erp_amc`, `erp_products`, …)
  so you can open the file with **DB Browser for SQLite** and run real queries.
- Automatic backups: the last 10 sessions are kept in `data\backups\`.
- Menu → **File → Open Data Folder** jumps straight there.

---

## 3) Licensing — how it works

| Thing | Behaviour |
|---|---|
| Free trial | **14 days** from first run (change `TRIAL_DAYS` in `electron/license.js`) |
| Machine lock | Keys are tied to the PC's **Machine ID** (from Windows' MachineGuid) |
| Validation | 100% offline — keys are Ed25519-signed; the app holds only the public key, so keys **cannot be forged** even if someone opens the exe |
| Trial reset protection | Trial record kept in 2 places + system clock roll-back detection |
| Master key | Your personal key — unlocks **any PC, forever** |

When the trial ends, the app shows only the **activation window** with the
customer's Machine ID (e.g. `3F9A-1C77-B02D`) and a Copy button. The flow is:

1. Customer sends you their Machine ID (WhatsApp/phone).
2. You generate a key with the keygen (below) and send it back.
3. Customer pastes it → **Activate** → app opens instantly.

While in trial, the window title shows days remaining, and
**Menu → License → License / Activation…** lets them activate early.

---

## 4) Generating keys (OWNER ONLY)

Two tools in the `keygen` folder — both contain your private key, keep them safe:

### A. Double-click tool: `keygen/keygen.html`
Open it in any browser (works fully offline). Enter the customer's Machine ID,
choose duration (days / until date / lifetime / master), click Generate, copy, send.

### B. Command line: `keygen/keygen.js`
```
cd keygen
node keygen.js --machine 3F9A-1C77-B02D --days 365 --name "Trimurti Jewellers"
node keygen.js --machine 3F9A-1C77-B02D --until 2027-03-31
node keygen.js --machine 3F9A-1C77-B02D --lifetime
node keygen.js --master
```

### Renewals
When a customer's key expires the app blocks and shows the expiry message.
Just generate a new key with a later date for the same Machine ID — they paste
it and continue with all their data intact.

### Your MASTER key (works on every PC, never expires) — keep it private:

```
SVE1.eyJtIjoiKiIsImUiOiIqIiwidCI6Ik1BU1RFUiIsIm4iOiJBc2xhbSAtIFNtYXJ0IFZpc2lvbiJ9.5oNBuPa2h1OLiRDrMu3QgSbEHC2RAH6XdTf4h5yuIiKXiEopQVZ57FG2OJdLZbwrj90eLuBO-rEBC7D1jCfuDw
```

---

## 5) Changing the signing keys (optional, recommended before going big)

Run once, then put the new `seed` into both keygen files and the new `pub`
into `electron/license.js`:

```
node -e "const n=require('tweetnacl');const k=n.sign.keyPair();console.log('seed',Buffer.from(k.secretKey.slice(0,32)).toString('hex'));console.log('pub ',Buffer.from(k.publicKey).toString('hex'))"
```

(Old keys stop working after this — rebuild + regenerate your master key.)

---

## Folder map

```
smart-vision-desktop/
├─ app/                      ← your ERP, unchanged
├─ electron/
│  ├─ main.js                ← app window + license gate + menu
│  ├─ server.js              ← embedded 127.0.0.1 server (api.php → SQLite)
│  ├─ db.js                  ← SQLite storage + mirror tables + backups
│  ├─ license.js             ← trial / machine lock / key verification
│  └─ license.html           ← activation window
├─ keygen/                   ← 🔒 OWNER ONLY (private key inside)
│  ├─ keygen.html            ← double-click key generator
│  └─ keygen.js              ← command-line key generator
├─ build/icon.ico
└─ package.json              ← `npm install` then `npm run dist`
```
