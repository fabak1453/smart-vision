// Item-wise GST on the bill, and backups that keep every field (9.7.0).
// node test-gst-bill.js
'use strict';
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const Bill = require('./app/bill-format.js');
const C = require('./app/backup-csv.js');

let n = 0;
const ok = (cond, msg) => { n++; if (!cond) { console.error('  ✗ FAIL:', msg); process.exit(1); } console.log('  ✓', msg); };
console.log('— GST bill suite —');

const co = { name: 'Smart Vision Enterprise', gstin: '24ABCDE1234F1Z5', address: 'Borsad', invoiceFallback: 'CCTV Supply, Installation & Commissioning', quoteFallback: 'CCTV solution' };
const doc = (items, extra) => Object.assign({ number: 'INV-1', customer: { name: 'Zenith Logistics' }, issue_date: '2026-10-01', due_date: '2026-10-15',
  total: items.reduce((a, i) => a + i.amount, 0), paid: 0, items }, extra || {});
const mixed = [
  { description: 'Hikvision 2MP Dome', qty: 4, amount: 6600, gst_rate: 18, hsn: '8525', unit: 'Nos' },
  { description: 'CCTV cable', qty: 90, amount: 2700, gst_rate: 18, hsn: '8544', unit: 'Mtr' },
  { description: 'Solar panel 100W', qty: 1, amount: 5250, gst_rate: 5, hsn: '8541', unit: 'Nos' },
];

/* ---- rates per line, HSN summary */
const hIn = Bill.sheetHtml('invoice', doc(mixed), co, { name: 'Zenith Logistics', gstin: '24AAACZ1234A1Z1' });
// v9.8.0: no extra table after "Balance due" (owner's request). HSN prints under each item.
ok(!/svb-hsn"|<table class="svb-hsn/.test(hIn) && hIn.indexOf('Balance due') > -1
  && hIn.slice(hIn.indexOf('Balance due')).indexOf('<table') === -1,
  'nothing but totals, terms and signature after "Balance due" (no HSN tax table)');
ok(['8525', '8544', '8541'].every((h) => hIn.includes('<div class="svb-hsn-note">HSN ' + h + '</div>')),
  'each item shows its HSN code under the description');
ok(/CGST<\/td><td>₹/.test(hIn) && /SGST<\/td><td>₹/.test(hIn) && !/IGST/.test(hIn), 'same-state customer (24 = 24) → CGST + SGST');
ok(hIn.includes('4 Nos') && hIn.includes('90 Mtr'), 'quantities print with their unit');
ok(hIn.includes('GSTIN</span> 24AAACZ1234A1Z1'), "the customer's GSTIN is printed on the bill");
const g = Bill.gstSummary(Bill.lineRows(mixed), false);
ok(Math.round((g.taxable + g.cgst + g.sgst) * 100) === 1455000 && g.cgst === g.sgst, 'taxable + CGST + SGST = bill total exactly; CGST = SGST');
ok(g.groups.find((x) => x.rate === 5).tax === 250, '5% line: ₹5,250 incl. GST → ₹250 tax');

/* ---- inter-state, composition, old bills */
const hOut = Bill.sheetHtml('invoice', doc(mixed), co, { name: 'Pune Co', gstin: '27AAACP1234A1Z1' });
ok(/IGST<\/td><td>₹/.test(hOut) && !/CGST/.test(hOut), 'customer GSTIN from another state (27 ≠ 24) → IGST');
const hComp = Bill.sheetHtml('invoice', doc(mixed), Object.assign({}, co, { gst_scheme: 'composition' }), {});
ok(hComp.includes('Bill of Supply') && !/Tax Invoice|CGST|IGST|svb-hsn"/.test(hComp) && hComp.includes('not eligible to collect tax'),
  'composition scheme → "Bill of Supply", no tax lines, the declaration');
const old = Bill.sheetHtml('invoice', doc([{ description: 'Old line', qty: 1, amount: 1180 }]), co, {});
ok(old.includes('CGST @ 9%') && old.includes('₹1,000'), 'an old bill line with no rate of its own is billed at 18% (₹1,180 → ₹1,000 + GST)');
const legacy = Bill.sheetHtml('invoice', doc([{ description: 'Pre-reform item', qty: 1, amount: 1120, gst_rate: 12 }]), co, {});
ok(legacy.includes('CGST @ 6%'), 'a line billed at a pre-2025 rate (12%) keeps that rate when reprinted');
const fb = Bill.sheetHtml('invoice', { number: 'INV-2', customer: { name: 'X' }, total: 5000, paid: 0, items: [] }, co, {});
ok(fb.includes('CCTV Supply, Installation &amp; Commissioning'), 'a bill without lines still prints the CCTV supply line');

/* ---- the app: product GST fields, lines keep them, backups keep everything */
const appJs = fs.readFileSync(path.join(__dirname, 'app', 'smart-vision-app.js'), 'utf8')
  + '\nglobalThis.__T = { DB, ENTITIES, normalizeQuoteItems, entityApplyEdit, entityToInitial, buildBackupCsvText, importBackupCsv, GST_RATES };\n';
const noop = () => {}; const store = {};
const sb = { console: { log: noop, warn: noop, error: noop }, alert: noop, confirm: () => true, prompt: () => null,
  setTimeout: (f) => f(), clearTimeout: noop, setInterval: noop, clearInterval: noop, Date, Math, JSON, Promise,
  localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } },
  XMLHttpRequest: function () { this.open = noop; this.send = () => { this.status = 0; }; },
  fetch: async () => ({ ok: true, status: 200, text: async () => '', json: async () => ({}) }),
  document: { addEventListener: noop, removeEventListener: noop, hidden: false },
  React: { useState: (v) => [typeof v === 'function' ? v() : v, noop], useEffect: noop, useCallback: (f) => f, useRef: () => ({ current: null }),
    createElement: (...a) => ({ $el: a[0] }), Fragment: 'Fragment', Component: function Cm(p) { this.props = p; this.state = {}; } },
  encodeURIComponent, decodeURIComponent, URLSearchParams, AbortController, Array, Object, Number, String, Boolean, parseInt, isNaN, Set, Map, Blob, Error,
  CustomEvent: function (t, o) { this.detail = o && o.detail; }, crypto: require('crypto').webcrypto };
sb.window = Object.assign(sb, { location: { hash: '', reload: noop }, addEventListener: noop, removeEventListener: noop, dispatchEvent: noop, open: noop });
sb.globalThis = sb; vm.createContext(sb);
for (const f of ['backup-csv.js', 'erp-model.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, 'app', f), 'utf8'), sb);
vm.runInContext(appJs, sb);
const A = sb.__T;
(async () => {
  ok(JSON.stringify(A.GST_RATES) === '[0,5,18,40]', 'GST rates offered are the current slabs (0, 5, 18, 40%)');
  A.ENTITIES.product.create({ name: 'Solar panel 100W', sale_price: 5250, stock: 3, gst_rate: '5', hsn: '8541', unit: 'Nos', barcode: '2000000000123' });
  const p = A.DB.products[A.DB.products.length - 1];
  ok(p.gst_rate === 5 && p.hsn === '8541' && p.unit === 'Nos' && p.barcode === '2000000000123' && p.sku === '', 'a product keeps GST rate, HSN, unit and barcode (no SKU needed)');
  const lines = A.normalizeQuoteItems([{ description: p.name, qty: 1, amount: 5250, product_id: p.id, uuid: 'L1' }]);
  ok(lines[0].gst_rate === 5 && lines[0].hsn === '8541' && lines[0].unit === 'Nos' && lines[0].uuid === 'L1', "a bill line takes the product's rate, HSN and unit");
  const cust = A.DB.customers[0];
  A.entityApplyEdit('customer', cust, Object.assign(A.entityToInitial('customer', cust), { gstin: ' 24aaacs1234a1z1 ' }));
  ok(cust.gstin === '24AAACS1234A1Z1', 'a customer GSTIN is saved cleaned up');
  A.DB.invoices[0].items = lines; A.DB.invoices[0].total = 5250;
  await A.importBackupCsv(A.buildBackupCsvText());
  const p2 = A.DB.products.find((x) => x.name === 'Solar panel 100W');
  ok(p2 && p2.gst_rate === 5 && p2.hsn === '8541' && p2.barcode === '2000000000123', 'backup + restore: the product without a SKU survives, with its GST fields (was: dropped)');
  const l2 = A.DB.invoices[0].items[0];
  ok(l2.gst_rate === 5 && l2.uuid === 'L1', 'backup + restore: bill lines keep their rate and identity (was: new identity → duplicate lines on next phone sync)');
  ok(A.DB.customers[0].gstin === '24AAACS1234A1Z1', 'backup + restore: customer GSTIN survives');
  const st = { DB: { invoices: [{ id: 1, number: 'INV-9', customer: { name: 'X' }, total: 590, paid: 0, items: [{ description: 'a', amount: 590, qty: 1, product_id: 2, gst_rate: 18, hsn: '8544', unit: 'Mtr', uuid: 'u' }] }] } };
  const oldStyle = C.stateToCsv(st).replace(/\|18\|8544\|Mtr\|u/, '');
  ok(C.csvToState(oldStyle).state.DB.invoices[0].items[0].amount === 590, 'backups made before 9.7.0 still restore');
  console.log('\nALL ' + n + ' GST BILL TESTS PASSED ✓');
})().catch((e) => { console.error('  ✗ FAIL:', (e && e.stack) || e); process.exit(1); });
