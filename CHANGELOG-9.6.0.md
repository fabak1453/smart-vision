# Smart Vision ERP 9.6.0

Everything below is covered by a test, so none of it can quietly come back.
`npm test` runs 181 of them.

---

## 1. Search a product by its serial number

### What was wrong

**a. The product was pushed off the list.** `searchPayload()` built plain SKU/name
matches first, appended the products reached through a serial, then cut the list at
20 rows. A partial serial almost always also matches SKUs and specs, so the product
you were looking for fell off the end. Reproduced with 26 SKUs containing `0099` and
a serial `SN-A7-0099` on a 27th product: searching `0099` returned 20 products and
the right one was not among them. The code comment already claimed "serial-first
ordering"; the `concat` order did the opposite.

**b. "Open product" was missing on serials.** The Serial Tracking page matched the
product with `DB.products.find(x => x.name === name)` — exact name only — while
`findProductByRef()` (uuid / name / SKU / id) sat unused in the same file. Any serial
stored against a SKU showed no product link and no way through to Edit.

### What changed

- Products found through a serial are hoisted to the top of the results and can no
  longer be truncated away. The serial that matched is still printed on the row
  (`SN …`), so you can see why the product is there.
- Serial Tracking now resolves the product with `findProductByRef()`, so the
  **Open product** button appears for serials stored by uuid, name, SKU or id. It
  opens the Inventory drawer, which already carries **Edit** and **Delete**.

### How to check it

Search any serial (whole or the last few characters) in the top search bar. The
product is the first result. Click it → product drawer → **Edit**.

---

## 2. CSV and data sync over Wi-Fi (phone APK, tablet, PC)

Four separate blockers, in the order they bite.

### a. The APK could not be built at all

`AndroidManifest.xml` declares a FileProvider pointing at `@xml/file_paths`, but
`res/xml/` contained only `network_security_config.xml`. Gradle fails at resource
linking: `resource xml/file_paths not found`. `npx cap sync` does not recreate this
file — it is created once by `cap add android` and must live in source.

**Fixed:** added `apk/android/app/src/main/res/xml/file_paths.xml`. A test now walks
every `@xml/...` reference in the manifest and asserts the file exists.

### b. Android silently refused every call to the shop PC

The cleartext permission added in 9.5.0 was necessary but not sufficient. Capacitor
serves the app from `https://localhost`. A page on a secure origin may not call
`http://192.168.x.x` — that is the WebView's mixed-content rule, and no cleartext
setting overrides it. Requests failed with no error the user could see.

**Fixed:** a new `lanFetch()` sends every shop-PC call through Capacitor's native
`CapacitorHttp` plugin when running inside the APK. Native requests are made by Java,
outside the page's origin, so the rule does not apply. On Windows and in a tablet
browser it falls through to ordinary `fetch`. Same-origin calls are never routed
through it.

`androidScheme` was deliberately **not** changed from `https` to `http`. That would
also fix mixed content, but it changes the storage origin and every phone already
carrying real data would lose it.

### c. The tablet was never actually on the shop PC's data

This was the quiet one. `http://<ip>:<port>/erp.html` loaded and looked fine, but
`/api.php` refused every LAN request — **including requests with the correct PIN**;
the PIN only ever unlocked the CSV endpoints. The tablet fell back to its own
`localStorage`, showed no error, and drifted away from the PC from that moment on.

**Fixed:**

- New `pairing.requireDataAuth()` on the server:

  | Caller | Read | Write |
  |---|---|---|
  | Shop PC itself (loopback) | yes | yes |
  | Browser with the correct PIN | yes | yes |
  | Paired APK (bearer token) | yes | **no** — must merge via `/api/sync` |
  | Anything else | 401, or 403 while sharing is off | |

- The app sends the PIN as `X-SV-PIN` on `/api.php`, and shows a **Not connected to
  the shop PC** bar when the PC answers 401, with a field to enter the PIN. The
  login page does the same, so team logins work over Wi-Fi too.
- On connect the **PC always wins**. A PIN-connected device is a terminal, not a
  peer, so its older local copy can never be pushed back over the shop's data.

### d. Windows Firewall

The LAN server binds `0.0.0.0` correctly, but Windows drops inbound connections
until the app is allowed through, which is the usual reason a phone "cannot reach"
the PC. Settings → Wi-Fi CSV now has **Allow through Windows Firewall**. It adds a
rule for the application rather than a port, so it keeps working when the LAN port
changes. The port stays automatic, and the PC still remembers the last one it used.

### e. Auto-sync only started after a restart

`ShopAutoSync` returned early when the device was not yet paired, so nothing was
scheduled and auto-sync stayed dead until the app was relaunched. Listeners are now
always attached and the pairing check happens per run. The interval is 2 minutes
(was 5), it also fires when the device regains network (`online`), and it runs once
immediately on mount.

---

## 3. Mobile number on a bill

### What was wrong

The bill had no mobile number field. The number printed on it was read live from
the customer record (`findCust(name).phone`), so the only place to change it was
Customers → Edit, and there was no way to send one bill to a different number.

Two things left it blank:

- **Leads had no phone field at all.** When a lead was marked Won,
  `ensureCustomer()` created the customer with `phone: ''`. Every customer born
  from a lead started with no number, so their bills printed a blank line and the
  WhatsApp button refused with "No phone number on file".
- **The generic customer editor was a no-op.** `entityToInitial('customer')`
  returned `{}` and `entityApplyEdit` had no `customer` branch, so that form
  opened empty and saved nothing. The Customers page has its own editor, so it
  was not hit yet — but it was a trap for the next screen to use it.

### What changed

- **New Invoice** and **Edit Invoice** now have *Mobile on this bill*. Leave it
  blank and the bill follows the customer record, exactly as before, so editing a
  customer still updates all their open bills. Type a number and that bill keeps
  it, even if the customer's number changes later. Clearing it returns to the
  customer's number.
- The printed document, the PDF the server builds, and the WhatsApp send all use
  the bill's number when it has one and fall back to the customer otherwise.
- **Leads now have a Mobile field**, carried into the customer when the lead is
  won. If the number is added to the lead after the customer already exists, it
  is backfilled rather than ignored.
- `entityToInitial` / `entityApplyEdit` gained their missing `customer` branches,
  including the rename cascade and the duplicate-name guard.
- `phone` was added to the `leads` and `invoices` CSV schemas, so none of this is
  lost on a CSV or Google Drive backup.

Covered by `test-bill-contact.js` (24 tests).

---

## 4. Data that no longer disappears

Four separate ways the app could lose work without saying anything. All reproduced
first, then fixed, then pinned down by `test-resilience.js` (26 tests).

### a. A CSV restore was undone on the next start

`csvToState()` returned the tables and nothing else — no `savedAt`. The Wi-Fi
restore wrote that straight into SQLite, so the restored snapshot looked infinitely
old. On the next start `shouldPreferLocalSnapshot()` compared it against the PC's
own localStorage copy, decided the PC's stale copy was newer, re-applied the demo
data and saved it back. The restore was gone, every time.

`stateToCsv()` had been writing `# savedAt=` and `# revision=` into the backup file
all along; `parseV2()` skipped them with the other comments. They are read back now,
the server stamps a restore as "now", and `db.js` gives any snapshot that arrives
without a time one of its own.

### b. Two devices overwrote each other

Every device kept its own copy from start-up and POSTed the whole snapshot when it
saved. Nothing polled, nothing was pushed, so whoever saved last won outright — the
PC could wipe a tablet's customer, a phone's completed sync, or a fresh restore,
with no error anywhere.

- `db.js` keeps a `seq` counter that moves on **every** write, whoever made it.
- Saves carry `X-SV-Base-Seq`. If the database moved since the client loaded, the
  server answers 409 with its current snapshot instead of taking the write.
- The client replays its own edits on top of the newer data and saves once more,
  using the same merge engine the phone sync already relied on.
- `ShopStatePoll` checks the counter every few seconds and pulls in anything this
  window did not do, so a phone sync or a CSV restore now appears on the PC by
  itself. With nothing unsaved locally the server copy is taken whole, so deletions
  in a restore really land.

### c. The offline copy stopped being written as the shop grew

A snapshot passes the browser's ~5 MB localStorage quota somewhere around a few
thousand invoices. `setItem` threw, `localOk` went false, the header said "Save
failed" — and on a phone or a disconnected tablet there was then no saved copy at
all. Storage now falls through to IndexedDB, which has no such ceiling, and stays
there once it has moved.

### d. The whole snapshot was re-uploaded every 1.5 seconds

`snapshotState()` stamped `savedAt: Date.now()`, so the "has anything changed?"
check in `persistStateNow()` was never true. An idle shop rewrote and re-uploaded
its entire database every autosave tick. `savedAt` is now excluded from that
comparison and added back only when the save actually happens.

## 5. Smaller things

- **Deleting a product with serials against it** now warns and names how many
  records would be left pointing at nothing. Customers had this guard; products
  did not, and the orphans were exactly the "can't find it by serial" symptom.
- **Backups keep merge identity.** `uuid` and `updated_at` were only in four of the
  CSV schemas, so a restore stripped them from invoices, quotes, jobs, tickets, AMC,
  serials, equipment, credentials, POs and repairs — and phone merge silently
  started guessing. Every table carries them now.
- **The pairing PIN** comes from the crypto RNG rather than `Math.random()`, and
  eight wrong guesses lock further attempts for a minute. A six-digit PIN with no
  throttle is a few minutes' work for anything on the same Wi-Fi, and it is the
  only thing guarding a full data restore.
- **Searching is about twice as fast.** `searchTop()` built the haystack twice per
  row and ranked rows that did not match. On 15,000 serials a search went from
  ~130 ms to ~70 ms.
- **A page can no longer hang on "Loading…".** `route()` runs inside a timer, so an
  exception in it escaped the promise entirely and the spinner stayed forever. It
  is caught and surfaced now, and `refreshDerived()` is guarded so one malformed
  row cannot take down every screen.

---

## Three ways a device can hold data, and when to use each

| | Setup | Data | Offline |
|---|---|---|---|
| **Tablet as a terminal** | Chrome → `http://<ip>:<port>/erp.html` + PIN | the PC's live SQLite | no |
| **Phone / tablet APK** | Pair with IP + port + PIN, then **Sync now** / auto-sync | own copy, merged both ways | yes |
| **CSV over Wi-Fi** | `wifi-csv.html` or Settings, PIN | full snapshot, replaces one side | yes |

CSV is a whole-snapshot replace in both directions and always was. It is the backup
and rescue path. For two devices that should agree continuously, use the terminal
(shared live data) or the APK (merge sync) — not CSV on a timer.

---

## Running the tests

```bash
npm test     # 62 wiring + reliability + 18 merge + 22 LAN
             # + 29 LAN access + 24 bill contact + 26 resilience
```

Each file can be run on its own with `node test-<name>.js`. None of them need
Electron, SQLite or the Android toolchain.
