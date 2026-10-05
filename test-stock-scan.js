// Scan stock (9.8.0): a scanned barcode / SKU adds stock to that item and is saved;
// an unknown code becomes a new item with that barcode; undo takes it back off.
// node test-stock-scan.js
'use strict';
const vm = require('vm');
const fs = require('fs');
const path = require('path');
let n = 0;
const ok = (cond, msg) => { n++; if (!cond) { console.error('  ✗ FAIL:', msg); process.exit(1); } console.log('  ✓', msg); };
const read = (p) => fs.readFileSync(path.join(__dirname, p), 'utf8');
const noop = () => {};
const store = {};
const sb = {
  console: { log: noop, warn: noop, error: noop }, alert: noop, confirm: () => true, prompt: () => null,
  setTimeout: (f) => f(), clearTimeout: noop, setInterval: noop, clearInterval: noop, Date, Math, JSON, Promise,
  localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } },
  XMLHttpRequest: function () { this.open = noop; this.send = () => { this.status = 0; }; },
  fetch: async () => ({ ok: true, status: 200, json: async () => ({}), text: async () => '' }),
  document: { addEventListener: noop, removeEventListener: noop, hidden: false },
  React: { useState: (v) => [typeof v === 'function' ? v() : v, noop], useEffect: noop, useCallback: (f) => f, useRef: () => ({ current: null }),
    createElement: (...a) => ({ $el: a[0] }), Fragment: 'Fragment', Component: function C(p) { this.props = p; this.state = {}; } },
  encodeURIComponent, decodeURIComponent, URLSearchParams, AbortController,
  Array, Object, Number, String, Boolean, parseInt, isNaN, Set, Map, Blob, Error,
  CustomEvent: function (t, o) { this.detail = o && o.detail; }, crypto: require('crypto').webcrypto,
};
sb.window = Object.assign(sb, { location: { hash: '', reload: noop, origin: 'http://x' }, addEventListener: noop, removeEventListener: noop, dispatchEvent: noop, open: noop });
sb.globalThis = sb;
vm.createContext(sb);
for (const f of ['backup-csv.js', 'erp-model.js', 'bill-format.js']) vm.runInContext(read('app/' + f), sb, { filename: f });
vm.runInContext(read('app/smart-vision-app.js') + '\nglobalThis.__T = { DB, ENTITIES, stockScan, findProductByCode, recordStockMove, snapshotState };\n', sb, { filename: 'app.js' });
const T = sb.__T; const Erp = require('./app/erp-model.js');
console.log('— scan stock suite —');

const p = T.DB.products[0];
p.barcode = '8901234567890';
const before = p.stock;
let r = T.stockScan('8901234567890', 1);
ok(r.ok && r.product === p && p.stock === before + 1, 'scanning an item\'s barcode adds 1 to its stock (' + before + ' → ' + p.stock + ')');
const move = T.DB.stock_moves[T.DB.stock_moves.length - 1];
ok(move && move.product_uuid === p.uuid && move.qty === 1 && move.reason === 'scan-in' && move.ref === '8901234567890' && move.uuid,
  'it is recorded as a stock move (so it syncs to the shop PC like every other stock change)');
r = T.stockScan('  8901234567890\r\n', 3);
ok(r.ok && p.stock === before + 4, 'quantity per scan (3), scanner line-endings ignored');
r = T.stockScan(String(p.sku).toLowerCase(), 1);
ok(r.ok && r.product === p, 'the SKU works too, in any case (' + p.sku + ')');
r = T.stockScan('2000000000999', 1);
ok(!r.ok && r.unknown && r.code === '2000000000999', 'an unknown code is reported as new, nothing changes');
ok(!T.stockScan('   ', 1).ok, 'an empty scan is refused');
T.ENTITIES.product.create({ name: 'Scanned new camera', sale_price: 2100, stock: 2, barcode: '2000000000999', sku: '' });
const made = T.findProductByCode('2000000000999');
ok(made && made.name === 'Scanned new camera' && made.stock === 2 && made.uuid, 'quick add makes the item with that barcode and stock');
r = T.stockScan('2000000000999', 1);
ok(r.ok && made.stock === 3, 'the next scan of that code adds to the new item');
T.recordStockMove(made, -1, 'scan-undo', '2000000000999');
ok(made.stock === 2, 'undo takes the last scan back off');
const pending = Erp.collectPending(JSON.parse(JSON.stringify(T.snapshotState())), 1);
ok(pending.upserts.products.some((x) => x.barcode === '2000000000999') && pending.stock_moves.filter((m) => /scan-/.test(m.reason)).length >= 4,
  'new item and every scan move go out with the next phone sync');
const jsx = read('app/smart-vision-app.jsx');
ok(/const \[camera, setCamera\] = useState\(isApkShell\(\)\); \/\/ the phone opens straight into the camera/.test(jsx), 'on the phone, Scan stock opens straight into the camera');
ok(/setStockScanOpen\(true\)\}><Ic n="camera" s=\{14\}\/>Scan stock/.test(jsx), 'Inventory has a "Scan stock" button');
console.log('\nALL ' + n + ' SCAN STOCK TESTS PASSED ✓');
