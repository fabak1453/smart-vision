# License (owner)

First run is a **14-day trial** (`TRIAL_DAYS` in `electron/license.js`). After that, activate a serial in **Menu → License**.

Serials are portable (not tied to a Machine ID). Format: `SVE1.<payload>.<signature>`.

## Generate a serial (do not ship this folder)

`keygen/` is **not** inside the Windows installer. Keep it off shop PCs.

```bash
cd keygen
npm install
node keygen.js --days 365 --name "Customer"
node keygen.js --until 2027-03-31
node keygen.js --lifetime
node keygen.js --master
```

Or open `keygen/keygen.html` in a browser after `npm install` in `keygen/`.

Customer pastes the serial and clicks Activate.

Clock rollback can mark the trial as tampered; that is intentional.
