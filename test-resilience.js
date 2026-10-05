// The failure modes that used to lose data silently:
//   idle saves rewriting the whole snapshot, the offline copy dying at the
//   localStorage quota, one device overwriting another, a CSV restore being
//   undone on the next start, and an unthrottled PIN.
'use strict';
const vm = require('vm');
const fs = require('fs');
const os = require('os');
const path = require('path');

let n = 0;
const ok = (cond, msg) => {
  n++;
  if (!cond) { console.error('  ✗ FAIL:', msg); process.exit(1); }
  console.log('  ✓', msg);
};

const appSrc = fs.readFileSync(path.join(__dirname, 'app', 'smart-vision-app.js'), 'utf8')
  + `\nglobalThis.__T = { DB, ENTITIES, snapshotState, persistStateNow, pullServerChanges,
  writeOfflineSnapshot, readOfflineSnapshot, offlineStorageMode, entityDelete, productLinkCount,
  bootPromise, importBackupCsv, buildBackupCsvText, O, nextId, teamNames };\n`;
const backupSrc = fs.readFileSync(path.join(__dirname, 'app', 'backup-csv.js'), 'utf8');
const modelSrc = fs.readFileSync(path.join(__dirname, 'app', 'erp-model.js'), 'utf8');

/* ------------------------------------------------- a shop PC with a real-ish API */
function makeServer() {
  const srv = { json: '{}', seq: 0, posts: 0, conflicts: 0 };
  srv.save = (body, baseSeq) => {
    const parsed = JSON.parse(body);
    if (baseSeq != null && Number(baseSeq) !== srv.seq) {
      srv.conflicts++;
      return { status: 409, body: { error: 'stale snapshot', snapshot: JSON.parse(srv.json), seq: srv.seq } };
    }
    if (!Number(parsed.savedAt)) parsed.savedAt = Date.now();
    srv.seq += 1;
    srv.json = JSON.stringify(parsed);
    return { status: 200, body: { ok: true, seq: srv.seq, savedAt: parsed.savedAt } };
  };
  return srv;
}

/* ------------------------------------------------- a browser, optionally a cramped one */
function makeDevice(srv, { quotaBytes = Infinity, store = {}, confirmAnswer = true } = {}) {
  const noop = () => {};
  const idb = {};                       // stands in for IndexedDB
  const sb = {
    console: { log: noop, warn: noop, error: noop },
    alert: noop, confirm: () => confirmAnswer, prompt: () => null,
    setTimeout: (f) => f(), clearTimeout: noop, setInterval: noop, clearInterval: noop,
    Date, Math, JSON, Promise,
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => {
        const s = String(v);
        if (s.length > quotaBytes) { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; }
        store[k] = s;
      },
      removeItem: (k) => { delete store[k]; },
    },
    indexedDB: {
      open: () => {
        const req = {};
        setImmediate(() => {
          req.result = {
            transaction: (_n, mode) => {
              const tx = {};
              tx.objectStore = () => ({
                put: (val, key) => { idb[key] = String(val); setImmediate(() => tx.oncomplete && tx.oncomplete()); return {}; },
                get: (key) => { const rq = {}; setImmediate(() => { rq.result = idb[key]; rq.onsuccess && rq.onsuccess(); }); return rq; },
              });
              return tx;
            },
          };
          req.onsuccess && req.onsuccess();
        });
        return req;
      },
    },
    XMLHttpRequest: function () { this.open = noop; this.send = () => { this.status = 0; }; },
    fetch: async (url, opts) => {
      const u = String(url);
      if (u.includes('/api/revision')) return { ok: true, status: 200, json: async () => ({ seq: srv.seq }) };
      if (opts && opts.method === 'POST') {
        srv.posts++;
        const base = (opts.headers && opts.headers['X-SV-Base-Seq']) || null;
        const r = srv.save(String(opts.body), base);
        return { ok: r.status === 200, status: r.status, json: async () => r.body };
      }
      const body = srv.json;
      return { ok: true, status: 200, text: async () => body, json: async () => JSON.parse(body) };
    },
    document: { addEventListener: noop, removeEventListener: noop, hidden: false },
    React: {
      useState: (v) => [typeof v === 'function' ? v() : v, noop], useEffect: noop,
      useCallback: (f) => f, useRef: () => ({ current: null }),
      createElement: (...a) => ({ $el: a[0] }), Fragment: 'F',
      Component: function C(p) { this.props = p; },
    },
    encodeURIComponent, decodeURIComponent, URLSearchParams, AbortController,
    Array, Object, Number, String, Boolean, parseInt, isNaN, Set, Map, Blob, Error,
    CustomEvent: function (t, o) { this.detail = o && o.detail; },
    crypto: require('crypto').webcrypto,
  };
  sb.window = Object.assign(sb, { location: { hash: '', reload: noop }, addEventListener: noop, removeEventListener: noop, dispatchEvent: noop, open: noop });
  sb.globalThis = sb;
  vm.createContext(sb);
  vm.runInContext(backupSrc, sb, { filename: 'backup-csv.js' });
  vm.runInContext(modelSrc, sb, { filename: 'erp-model.js' });
  vm.runInContext(appSrc, sb, { filename: 'app.js' });
  return { T: sb.__T, store, idb };
}

const settle = async (times) => { for (let i = 0; i < (times || 8); i++) await new Promise((r) => setImmediate(r)); };
const custNames = (T) => T.DB.customers.map((c) => c.name);

(async () => {
  console.log('— resilience suite —');

  /* ============================================ 1. an idle shop stops rewriting itself */
  {
    const srv = makeServer();
    const d = makeDevice(srv);
    await d.T.bootPromise;
    await d.T.persistStateNow();
    const after = srv.posts;
    await d.T.persistStateNow();
    await d.T.persistStateNow();
    await d.T.persistStateNow();
    ok(srv.posts === after, 'saving with nothing changed uploads nothing (it used to re-send the whole snapshot every 1.5s)');

    d.T.ENTITIES.customer.create({ name: 'Real Change', area: 'x', type: 'Commercial', contact_name: '', phone: '', sites: 1, owner: d.T.teamNames()[0] });
    await d.T.persistStateNow();
    ok(srv.posts === after + 1, 'a real change still uploads');
  }

  /* ============================================ 2. the offline copy outlives the quota */
  {
    const srv = makeServer();
    const d = makeDevice(srv, { quotaBytes: 2000 });   // far too small for any snapshot
    await d.T.bootPromise;
    const saved = await d.T.writeOfflineSnapshot(JSON.stringify(d.T.snapshotState()));
    ok(saved === true, 'a snapshot too big for localStorage is still stored');
    ok(d.T.offlineStorageMode() === 'idb', 'the device switched to IndexedDB instead of giving up');
    await settle();
    const back = await d.T.readOfflineSnapshot();
    ok(back && JSON.parse(back).DB.customers.length > 0, 'and it can be read back after a restart');
  }

  /* ============================================ 3. two devices cannot overwrite each other */
  {
    const srv = makeServer();
    const pc = makeDevice(srv);
    await pc.T.bootPromise;
    await pc.T.persistStateNow();
    const tablet = makeDevice(srv, { store: {} });
    await tablet.T.bootPromise;

    tablet.T.ENTITIES.customer.create({ name: 'Tablet Walk-in', area: 'Market Rd', type: 'Commercial', contact_name: '', phone: '', sites: 1, owner: tablet.T.teamNames()[0] });
    await tablet.T.persistStateNow();
    await settle();

    pc.T.ENTITIES.customer.create({ name: 'PC Counter Sale', area: 'Bazaar', type: 'Commercial', contact_name: '', phone: '', sites: 1, owner: pc.T.teamNames()[0] });
    await pc.T.persistStateNow();
    await settle();

    const onServer = JSON.parse(srv.json).DB.customers.map((c) => c.name);
    ok(srv.conflicts > 0, 'the shop PC was told its copy was stale instead of being allowed to overwrite');
    ok(onServer.includes('PC Counter Sale'), 'the PC\'s customer was saved');
    ok(onServer.includes('Tablet Walk-in'), 'the tablet\'s customer SURVIVED the PC\'s save');
  }

  /* ============================================ 4. a device notices someone else's write */
  {
    const srv = makeServer();
    const pc = makeDevice(srv);
    await pc.T.bootPromise;
    await pc.T.persistStateNow();
    ok(!custNames(pc.T).includes('Added By Phone'), 'the PC has not seen it yet');

    const snap = JSON.parse(srv.json);
    snap.DB.customers.push({ id: 9901, name: 'Added By Phone', area: '', type: 'Commercial', contact_name: '', phone: '', sites: 1, lifetime_value: 0, uuid: 'phone-1', updated_at: new Date().toISOString() });
    srv.save(JSON.stringify(snap), null);

    const pulled = await pc.T.pullServerChanges();
    ok(pulled === true, 'the PC noticed the database changed underneath it');
    ok(custNames(pc.T).includes('Added By Phone'), 'and pulled in the record the phone added');
  }

  /* ============================================ 5. a CSV restore is not undone */
  {
    // a backup taken elsewhere
    const other = makeDevice(makeServer());
    await other.T.bootPromise;
    other.T.DB.customers.length = 0;
    other.T.ENTITIES.customer.create({ name: 'Al Noor Electronics', area: 'Station Rd', type: 'Commercial', contact_name: '', phone: '98100 11111', sites: 1, owner: other.T.teamNames()[0] });
    const csv = other.T.buildBackupCsvText();
    ok(/^#\s*savedAt=\d+/m.test(csv), 'the backup file records when it was taken');

    const srv = makeServer();
    const pcStore = {};
    const pc = makeDevice(srv, { store: pcStore });
    await pc.T.bootPromise;
    await pc.T.persistStateNow();           // demo data is now the PC's local copy
    await settle();

    // the phone pushes the CSV: exactly what electron/server.js does
    const box = { module: { exports: {} }, console, Date, Math, JSON, Array, Object, Number, String, Boolean, parseInt, isNaN, Set, Map, Error };
    box.globalThis = box;
    vm.createContext(box);
    vm.runInContext(backupSrc, box, { filename: 'backup-csv.js' });
    const SvCsv = box.SvBackupCsv || box.module.exports;
    const parsed = SvCsv.csvToState(csv);
    srv.save(JSON.stringify(Object.assign({}, parsed.state, { savedAt: Date.now() })), null);

    // restart the ERP on the shop PC — same localStorage as before
    const pc2 = makeDevice(srv, { store: pcStore });
    await pc2.T.bootPromise;
    await settle();
    ok(custNames(pc2.T).includes('Al Noor Electronics'), 'after restarting, the shop PC shows the RESTORED data');
    ok(!custNames(pc2.T).includes('Sunrise Heights CHS'), 'and not the demo data it had before');
  }

  /* ============================================ 6. deleting a linked product warns */
  {
    const srv = makeServer();
    const keep = makeDevice(srv, { confirmAnswer: false });
    await keep.T.bootPromise;
    keep.T.ENTITIES.product.create({ sku: 'DEL-1', name: 'Doomed Camera', specs: 'x', category: 'Cameras', purchase_price: 1, sale_price: 2, stock: 5, reorder_level: 1, track_serials: 'Yes' });
    const p = keep.T.DB.products.find((x) => x.sku === 'DEL-1');
    keep.T.ENTITIES.serial.create({ serial_no: 'ORPH-0001', product: 'Doomed Camera', status: 'in_stock' });
    ok(keep.T.productLinkCount(p) === 1, 'the app can see the product still has a serial against it');
    ok(keep.T.entityDelete('product', p.id) === false, 'deleting it is stopped when the user declines the warning');
    ok(keep.T.DB.products.some((x) => x.sku === 'DEL-1'), 'the product is still there');

    const go = makeDevice(srv, { confirmAnswer: true });
    await go.T.bootPromise;
    go.T.ENTITIES.product.create({ sku: 'DEL-2', name: 'Also Doomed', specs: 'x', category: 'Cameras', purchase_price: 1, sale_price: 2, stock: 5, reorder_level: 1, track_serials: 'Yes' });
    const p2 = go.T.DB.products.find((x) => x.sku === 'DEL-2');
    ok(go.T.entityDelete('product', p2.id) === true, 'a product with nothing linked still deletes without fuss');
  }

  /* ============================================ 7. the PIN cannot be brute-forced */
  {
    const pairing = require('./electron/pairing.js');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sv-pin-'));
    pairing.init(tmp);
    pairing.setEnabled(true);
    const PIN = pairing.status().pin;
    ok(/^\d{6}$/.test(PIN), 'the PIN is six digits');
    for (let i = 0; i < 8; i++) pairing.pinMatches('000000');
    ok(pairing.pinLockedFor() > 0, 'repeated wrong PINs lock further guesses out');
    ok(pairing.pinMatches(PIN) === false, 'even the right PIN is refused while locked');
    const req = { url: '/backup/import', method: 'POST', headers: { 'x-sv-pin': '000000' }, socket: { remoteAddress: '192.168.1.9' } };
    ok(pairing.requireCsvPin(req).status === 429, 'the caller is told to wait rather than "wrong PIN"');
    pairing.newPin();
    ok(pairing.pinLockedFor() === 0 && pairing.pinMatches(pairing.status().pin) === true, 'a new PIN clears the lockout');
  }

  /* ============================================ 8. a backup keeps merge identity */
  {
    const srv = makeServer();
    const d = makeDevice(srv);
    await d.T.bootPromise;
    d.T.snapshotState();            // stamps sync metadata onto the seeded rows
    const inv = d.T.DB.invoices[0];
    const uuid = inv.uuid;
    ok(!!uuid, 'invoices carry a uuid in memory');
    const csv = d.T.buildBackupCsvText();
    await d.T.importBackupCsv(csv);
    const back = d.T.DB.invoices.find((x) => x.number === inv.number);
    ok(back && back.uuid === uuid, 'the uuid survives CSV export/restore (it used to be dropped, breaking phone merge)');
    ok(back && !!back.updated_at, 'so does updated_at, which decides who wins a merge');
  }

  console.log('\nALL ' + n + ' RESILIENCE TESTS PASSED ✓');
})().catch((e) => { console.error('  ✗ FAIL:', (e && e.stack) || e); process.exit(1); });
