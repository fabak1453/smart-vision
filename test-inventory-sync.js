// Inventory added / changed / deleted on a phone (APK) reaches the shop PC's
// database correctly — including the awkward cases: two devices adding at once,
// the same item entered twice, a second phone syncing first, and deletes.
// Part 1 tests the merge engine the shop PC runs (/api/sync). Part 2 runs the real
// app's syncWithShop() against a stand-in shop PC that answers like electron/server.js.
// node test-inventory-sync.js
'use strict';
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const Erp = require('./app/erp-model.js');

let n = 0;
const ok = (cond, msg) => { n++; if (!cond) { console.error('  ✗ FAIL:', msg); process.exit(1); } console.log('  ✓', msg); };
const clone = (x) => JSON.parse(JSON.stringify(x));
// Fixed timestamps well in the past, so "now" (an edit made during the test) is always later.
const T = (s) => new Date(Date.UTC(2025, 0, 1, 10, 0, s)).toISOString();
const live = (state, sku) => (state.DB.products || []).filter((p) => String(p.sku).toLowerCase() === String(sku).toLowerCase());

function shop() {
  return Erp.ensureSyncMeta({ revision: 1, DB: {
    products: [1, 2, 3].map((i) => ({ id: i, sku: 'SKU-' + i, name: 'Prod ' + i, stock: 10, sale_price: 100 * i, uuid: 'p' + i, updated_at: T(0) })),
    customers: [], leads: [], quotes: [], invoices: [], jobs: [], tickets: [], amc: [], serials: [], equipment: [],
    credentials: [], purchaseOrders: [], repairs: [], ledger: [], stock_moves: [], tombstones: [],
  }, TEAM: [], CATALOG: [] }, { deviceId: 'shop' });
}

console.log('— inventory sync suite —');
console.log('  part 1: the merge the shop PC runs');

/* ---- a new product from the phone */
{
  const pc = shop(); const ph = clone(pc);
  ph.DB.products.push(Erp.stampRow({ id: 4, sku: 'CAM-NEW', name: 'New cam', stock: 5 }, 'phone'));
  const m = Erp.applySyncPayload(pc, Erp.collectPending(ph, 1));
  const p = live(m, 'CAM-NEW');
  ok(p.length === 1 && p[0].stock === 5 && p[0].uuid && p[0].updated_at, 'a new phone product is added with its stock and identity');
  ok(m.DB.products.length === 4 && live(m, 'SKU-1')[0].stock === 10, 'existing products are untouched');
}

/* ---- A. both sides add a product before syncing → same id; lines follow the renumbering */
{
  const pc = shop(); const ph = clone(pc);
  pc.DB.products.push({ id: 4, sku: 'PC-NEW', name: 'PC new', stock: 2, uuid: 'pc-new', updated_at: T(5) });
  ph.DB.products.push({ id: 4, sku: 'PH-NEW', name: 'Phone new', stock: 6, uuid: 'ph-new', updated_at: T(6) });
  ph.DB.products.push({ id: 5, sku: 'PH-NEW2', name: 'Phone new 2', stock: 1, uuid: 'ph-new2', updated_at: T(6) });
  ph.DB.quotes.push({ id: 1, number: 'QT-P1-1001', uuid: 'q1', updated_at: T(7), total: 700,
    items: [{ description: 'Phone new', qty: 1, amount: 600, product_id: 4, uuid: 'qi1' },
      { description: 'Phone new 2', qty: 1, amount: 100, product_id: 5, uuid: 'qi2' },
      { description: 'Prod 1', qty: 1, amount: 0, product_id: 1, uuid: 'qi3' }] });
  ph.DB.invoices.push({ id: 1, number: 'INV-P1-2001', uuid: 'i1', updated_at: T(7), total: 600, paid: 0, balance: 600,
    items: [{ description: 'Phone new', qty: 1, amount: 600, product_id: 4, uuid: 'ii1' }] });
  Erp.ensureSyncMeta(pc); Erp.ensureSyncMeta(ph);
  const m = Erp.applySyncPayload(pc, Erp.collectPending(ph, 1));
  const byId = (id) => m.DB.products.find((p) => p.id === id);
  const ids = m.DB.products.map((p) => p.id);
  ok(ids.length === new Set(ids).size && m.DB.products.length === 6, 'both new products kept, every product id unique');
  ok(byId(4).uuid === 'pc-new', "the shop's product keeps its id");
  const q = m.DB.quotes[0].items;
  ok(byId(q[0].product_id).uuid === 'ph-new' && byId(q[1].product_id).uuid === 'ph-new2',
    "the phone's quote lines still point at the phone's products after renumbering (4→5, 5→6)");
  ok(q[2].product_id === 1, 'a line pointing at an existing product is left alone');
  ok(byId(m.DB.invoices[0].items[0].product_id).uuid === 'ph-new', "the phone's invoice line follows too");
}

/* ---- B. the same new item entered on both devices (same SKU, different case) */
{
  const pc = shop(); const ph = clone(pc);
  pc.DB.products.push({ id: 4, sku: 'NEW-1', name: 'New camera', stock: 10, uuid: 'pc-x', updated_at: T(5) });
  Erp.ensureSyncMeta(pc);
  Erp.appendStockMove(pc, { product: pc.DB.products[3], qty: -1, reason: 'invoice', deviceId: 'shop' }); Erp.recomputeStock(pc);
  ph.DB.products.push({ id: 4, sku: 'new-1', name: 'New camera (phone)', stock: 10, uuid: 'ph-y', updated_at: T(9) });
  Erp.ensureSyncMeta(ph);
  Erp.appendStockMove(ph, { product: ph.DB.products[3], qty: 2, reason: 'scan', deviceId: 'phone' }); Erp.recomputeStock(ph);
  const m = Erp.applySyncPayload(pc, Erp.collectPending(ph, 1));
  const rows = live(m, 'NEW-1');
  ok(rows.length === 1, 'one product, not two');
  ok(rows[0].uuid === 'pc-x' && rows[0].id === 4, "it keeps the shop's identity, so what already points at it still does");
  ok(rows[0].name === 'New camera (phone)', 'the later edit of the details wins');
  ok(rows[0].stock === 11, "the shop's sale (-1) and the phone's scan (+2) both count: 10 - 1 + 2 = 11 (was: sale lost)");
}

/* ---- C. a second phone synced first: this phone's edits must survive the retry */
{
  let pc = shop();
  const B = clone(pc);
  pc = Erp.applySyncPayload(pc, { device_id: 'A', upserts: {}, deletes: [], stock_moves: [] });
  const p2 = B.DB.products.find((p) => p.uuid === 'p2'); p2.sale_price = 999; Erp.stampRow(p2, 'B');
  B.DB.products.push(Erp.stampRow({ id: 4, sku: 'B-NEW', name: 'B new', stock: 1 }, 'B'));
  ok(1 < pc.revision, '(setup) the shop has moved on: this phone would get a 409');
  const m = Erp.applySyncPayload(pc, Erp.collectPending(B, pc.revision));
  ok(m.DB.products.find((p) => p.uuid === 'p2').sale_price === 999, "the phone's price edit survives (was: silently dropped)");
  ok(live(m, 'B-NEW').length === 1, 'its new product too');
  const reb = Erp.rebaseLocal(pc, B);
  ok(reb.DB.products.find((p) => p.uuid === 'p2').sale_price === 999, 'rebasing onto newer shop data keeps local edits as well');
}

/* ---- D. stock changed on both sides */
{
  const pc = shop(); const ph = clone(pc);
  Erp.appendStockMove(pc, { product: pc.DB.products[0], qty: -1, reason: 'invoice', deviceId: 'shop' }); Erp.recomputeStock(pc);
  Erp.appendStockMove(ph, { product: ph.DB.products[0], qty: 2, reason: 'adjust', deviceId: 'phone' }); Erp.recomputeStock(ph);
  const m = Erp.applySyncPayload(pc, Erp.collectPending(ph, 1));
  ok(m.DB.products[0].stock === 11, 'a shop sale and a phone adjustment both count (10 - 1 + 2)');
}

/* ---- E. deleted on the PC; a phone that still has it syncs */
{
  const pc = shop(); const ph = clone(pc);
  const p3 = pc.DB.products.find((p) => p.uuid === 'p3');
  Erp.tombstone(p3, 'shop'); Erp.addTombstone(pc, 'products', p3, 'shop', p3.deleted_at);
  pc.DB.products = pc.DB.products.filter((p) => p !== p3);
  const m = Erp.applySyncPayload(pc, Erp.collectPending(ph, 1));
  ok(!m.DB.products.some((p) => p.uuid === 'p3'), 'a product deleted on the PC stays deleted (was: re-created by the phone)');
  ok(m.DB.tombstones.some((t) => t.table === 'products' && t.uuid === 'p3'), 'the delete is remembered');
  const ph2 = clone(pc.DB.products.length ? shop() : shop());
  const edited = ph2.DB.products.find((p) => p.uuid === 'p3'); edited.sale_price = 777; edited.updated_at = new Date(Date.now() + 60000).toISOString();
  const m2 = Erp.applySyncPayload(m, Erp.collectPending(ph2, m.revision));
  ok(m2.DB.products.some((p) => p.uuid === 'p3' && p.sale_price === 777), 'an edit made after the delete brings it back (last change wins)');
}

/* ---- F. deleted on the phone */
{
  const pc = shop(); const ph = clone(pc);
  const p2 = ph.DB.products.find((p) => p.uuid === 'p2');
  Erp.tombstone(p2, 'phone'); Erp.addTombstone(ph, 'products', p2, 'phone', p2.deleted_at);
  ph.DB.products = ph.DB.products.filter((p) => p !== p2);
  const m = Erp.applySyncPayload(pc, Erp.collectPending(ph, 1));
  ok(!m.DB.products.some((p) => p.uuid === 'p2'), 'a product deleted on the phone leaves the shop\'s product list (was: still listed)');
  ok(!m.DB.products.some((p) => p.deleted_at), 'no half-deleted rows are left in the table for screens to show');
  const unseen = clone(pc);
  unseen.DB.products.push({ id: 9, sku: 'SKU-1', uuid: 'never-synced', updated_at: T(1) });
  Erp.addTombstone(unseen, 'products', { uuid: 'never-synced' }, 'phone', T(2));
  unseen.DB.products.pop();
  const m2 = Erp.applySyncPayload(pc, Erp.collectPending(unseen, 1));
  ok(live(m2, 'SKU-1').length === 1, "deleting a phone-only duplicate never deletes the shop's product with the same SKU");
}

/* ---- data written by 9.6.0 (rows kept in place with deleted_at) */
{
  const old = shop(); old.DB.products[0].deleted_at = T(3); old.DB.products[0].updated_at = T(3);
  delete old.DB.tombstones;
  Erp.ensureSyncMeta(old);
  ok(old.DB.products.length === 2 && old.DB.tombstones.length === 1 && old.DB.tombstones[0].uuid === 'p1',
    'old snapshots: deleted rows move out of the table into the deletion log on load');
}

/* ================================================================== part 2 */
console.log('  part 2: the real app on the phone, syncing with a stand-in shop PC');
const appJs = fs.readFileSync(path.join(__dirname, 'app', 'smart-vision-app.js'), 'utf8')
  + '\nglobalThis.__T = { DB, ENTITIES, entityDelete, syncWithShop, applyState, snapshotState, recordStockMove, touch,'
  + ' buildBackupCsvText, importBackupCsv };\n';
const noop = () => {};
const store = {};
let pcState = null; const posts = [];
const reply = (status, body) => ({ ok: status >= 200 && status < 400, status, text: async () => JSON.stringify(body), json: async () => clone(body) });
const sb = {
  console: { log: noop, warn: noop, error: noop }, alert: noop, confirm: () => true, prompt: () => null,
  setTimeout: (f) => f(), clearTimeout: noop, setInterval: noop, clearInterval: noop, Date, Math, JSON, Promise,
  localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } },
  XMLHttpRequest: function () { this.open = noop; this.send = () => { this.status = 0; }; },
  // The shop PC's /api/sync, answering exactly like electron/server.js.
  fetch: async (url, opts) => {
    if (/\/api\/sync$/.test(String(url))) {
      const payload = JSON.parse(opts.body); posts.push(payload);
      let pc = clone(pcState); Erp.ensureSyncMeta(pc, { deviceId: 'shop' });
      const base = Number(payload.base_revision); const liveRev = Number(pc.revision) || 0;
      if (Number.isFinite(base) && liveRev > 0 && base < liveRev) return reply(409, { error: 'stale revision', snapshot: pc, revision: liveRev });
      pc = Erp.applySyncPayload(pc, payload); pc.savedAt = Date.now(); pcState = pc;
      return reply(200, { ok: true, snapshot: pc, revision: pc.revision });
    }
    return reply(200, {});
  },
  document: { addEventListener: noop, removeEventListener: noop, hidden: false },
  React: { useState: (v) => [typeof v === 'function' ? v() : v, noop], useEffect: noop, useCallback: (f) => f, useRef: () => ({ current: null }),
    createElement: (...a) => ({ $el: a[0] }), Fragment: 'Fragment', Component: function C(p) { this.props = p; this.state = {}; } },
  encodeURIComponent, decodeURIComponent, URLSearchParams, AbortController,
  Array, Object, Number, String, Boolean, parseInt, isNaN, Set, Map, Blob, Error,
  CustomEvent: function (t, o) { this.detail = o && o.detail; }, crypto: require('crypto').webcrypto,
};
sb.window = Object.assign(sb, { location: { hash: '', reload: noop, origin: 'https://localhost' }, addEventListener: noop, removeEventListener: noop, dispatchEvent: noop, open: noop,
  SV_APK: {} }); // the APK shell
sb.globalThis = sb;
vm.createContext(sb);
for (const f of ['backup-csv.js', 'erp-model.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, 'app', f), 'utf8'), sb, { filename: f });
vm.runInContext(appJs, sb, { filename: 'app.js' });
const A = sb.__T;

(async () => {
  // Pairing: the phone pulled the shop's data at revision 5.
  pcState = clone(A.snapshotState()); pcState.revision = 5; Erp.ensureSyncMeta(pcState, { deviceId: 'shop' });
  A.applyState(clone(pcState));
  store.sv_pairing = JSON.stringify({ url: 'http://192.168.1.10:51732', token: 'tok', prefix: 'P1' });

  // On the phone, offline: a new product, a stock change, a price edit, and a delete.
  A.ENTITIES.product.create({ sku: 'APK-NEW-1', name: 'Phone added turret', specs: '4MP', category: 'Cameras', purchase_price: 2100, sale_price: 2950, stock: 5 });
  const added = A.DB.products.find((p) => p.sku === 'APK-NEW-1');
  ok(added && added.uuid && added.updated_at && added.origin_device, 'phone: a new product is stamped with uuid, time and device');
  A.recordStockMove(added, 3, 'adjust', added.sku);
  ok(added.stock === 8, 'phone: Set stock 5 → 8 is recorded as a stock move');
  const priced = A.DB.products[0]; const pricedUuid = priced.uuid; priced.sale_price = 12345; A.touch(priced);
  const doomed = A.DB.products[1]; const doomedUuid = doomed.uuid;
  ok(A.entityDelete('product', doomed.id) && A.DB.tombstones.some((t) => t.uuid === doomedUuid), 'phone: deleting a product records it in the saved deletion log');
  ok(!A.DB.products.some((p) => p.uuid === doomedUuid), 'phone: the deleted product leaves the list');

  // Meanwhile another phone synced, so the shop is at a newer revision → 409 first.
  pcState = Erp.applySyncPayload(pcState, { device_id: 'other-phone', upserts: {}, deletes: [], stock_moves: [] });
  await A.syncWithShop();
  ok(posts.length === 2, '(the shop answered 409 first, the phone retried once)');
  const db = pcState.DB;
  const got = db.products.filter((p) => p.sku === 'APK-NEW-1');
  ok(got.length === 1 && got[0].stock === 8, "shop database: the phone's new product is there with stock 8");
  ok(db.products.find((p) => p.uuid === pricedUuid).sale_price === 12345, "shop database: the phone's price edit survived the 409 (was: dropped)");
  ok(!db.products.some((p) => p.uuid === doomedUuid) && db.tombstones.some((t) => t.uuid === doomedUuid), 'shop database: the phone\'s delete landed');
  ok(A.DB.products.length === db.products.length && A.DB.products.some((p) => p.sku === 'APK-NEW-1'), 'phone and shop now hold the same product list');

  // A later sync from a phone that never saw the delete can't bring it back.
  const stale = clone(A.snapshotState()); stale.DB.tombstones = [];
  stale.DB.products.push(clone(Object.assign({}, got[0], { uuid: doomedUuid, sku: 'SKU-OLD', id: 99, updated_at: T(1) })));
  pcState = Erp.applySyncPayload(pcState, Erp.collectPending(stale, pcState.revision));
  ok(!pcState.DB.products.some((p) => p.uuid === doomedUuid), 'a stale device cannot resurrect the deleted product');

  // The deletion log is in the CSV backup, and old backups without it still restore.
  const csv = A.buildBackupCsvText();
  ok(/## tombstones/.test(csv) && csv.includes(doomedUuid), 'CSV backup carries the deletion log');
  await A.importBackupCsv(csv);
  ok(A.DB.tombstones.some((t) => t.uuid === doomedUuid) && A.DB.products.some((p) => p.sku === 'APK-NEW-1'), 'and a restore brings it back with the products');
  const oldCsv = csv.replace(/## tombstones[\s\S]*?(?=\n## |\s*$)/, '');
  let restored = true; try { await A.importBackupCsv(oldCsv); } catch (e) { restored = false; }
  ok(!/## tombstones/.test(oldCsv) && restored, 'a backup made before this version (no deletion log) still restores');

  console.log('\nALL ' + n + ' INVENTORY SYNC TESTS PASSED ✓');
})().catch((e) => { console.error('  ✗ FAIL:', (e && e.stack) || e); process.exit(1); });
