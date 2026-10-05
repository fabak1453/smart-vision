// Accounts and statements over any time window: this month, last month, any month,
// all time, or custom From–To dates (9.8.0). The printout follows the window.
// node test-period-range.js
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
vm.runInContext(read('app/smart-vision-app.js') + '\nglobalThis.__T = { DB, TODAY, iso, dayKey, periodRange, periodLabel, inPeriod, accountsPayload, customerStatement, route, monthKey };\n', sb, { filename: 'app.js' });
const T = sb.__T; const Bill = sb.SvBill;
console.log('— time window suite —');

ok(JSON.stringify(T.periodRange('2026-08-01~2026-09-15')) === '{"from":"2026-08-01","to":"2026-09-15"}', 'a custom window is "From~To"');
ok(JSON.stringify(T.periodRange('2026-09-15~2026-08-01')) === '{"from":"2026-08-01","to":"2026-09-15"}', 'From and To typed the wrong way round are swapped');
ok(T.periodRange('month') === null && T.periodRange('2026-09') === null, 'months are not ranges');
ok(/01 Aug 2026 – 15 Sept? 2026/.test(T.periodLabel('2026-08-01~2026-09-15')), 'label: ' + T.periodLabel('2026-08-01~2026-09-15'));
ok(T.inPeriod('2026-08-01T00:00:00', '2026-08-01~2026-08-31') && T.inPeriod('2026-08-31T23:59:00', '2026-08-01~2026-08-31')
  && !T.inPeriod('2026-09-01T00:30:00', '2026-08-01~2026-08-31'), 'both end days are included, the next day is not');

// Ledger entries on known days, so the windows can be checked exactly.
const d = (k) => k + 'T10:00:00';
T.DB.ledger.push({ id: 901, number: 'CB-T1', direction: 'out', category: 'Rent', amount: 1000, on: d('2026-07-31'), party: '', note: '' });
T.DB.ledger.push({ id: 902, number: 'CB-T2', direction: 'out', category: 'Tools', amount: 200, on: d('2026-08-05'), party: '', note: '' });
T.DB.ledger.push({ id: 903, number: 'CB-T3', direction: 'in', category: 'Other income', amount: 50, on: d('2026-08-20'), party: '', note: '' });
const win = T.accountsPayload('2026-08-01~2026-08-15');
const nums = (a) => a.rows.map((r) => r.number).filter((x) => /^CB-T/.test(x)).sort().join(',');
ok(nums(win) === 'CB-T2', 'a window shows only its entries (1–15 Aug → CB-T2)');
ok(win.label === T.periodLabel('2026-08-01~2026-08-15') && win.period === '2026-08-01~2026-08-15', 'and says which window it is');
const wide = T.accountsPayload('2026-07-01~2026-08-31');
ok(nums(wide) === 'CB-T1,CB-T2,CB-T3', 'a window can span months (Jul–Aug → all three)');
const month = T.accountsPayload('2026-08');
const asRange = T.accountsPayload('2026-08-01~2026-08-31');
ok(month.money_in === asRange.money_in && month.money_out === asRange.money_out && month.rows.length === asRange.rows.length,
  'a window covering a whole month gives exactly that month\'s figures');
const viaRoute = T.route('/accounts?period=2026-08-01~2026-08-15');
ok(viaRoute && nums(viaRoute) === 'CB-T2', 'the Accounts page asks for the window through its route');
const sheet = Bill.accountsHtml(win, { name: 'Smart Vision Enterprise' }, {});
ok(sheet.includes(win.label) && sheet.includes('CB-T2') && !sheet.includes('CB-T1'), 'Print: the A4 sheet shows the window and only its entries');

// Customer statement over a window: opening balance = everything before From.
const c = T.DB.customers[0].name;
T.DB.invoices.push({ id: 991, number: 'INV-T1', customer: { name: c }, total: 1000, paid: 400, balance: 600, status: 'partial',
  issue_date: d('2026-06-10'), due_date: d('2026-06-25'), payments: [{ amount: 400, on: d('2026-07-02') }], items: [] });
T.DB.invoices.push({ id: 992, number: 'INV-T2', customer: { name: c }, total: 500, paid: 0, balance: 500, status: 'sent',
  issue_date: d('2026-07-15'), due_date: d('2026-07-30'), payments: [], items: [] });
const all = T.customerStatement(c, 'all');
const st = T.customerStatement(c, '2026-07-01~2026-07-31');
const before = all.rows.filter((r) => T.dayKey(r.on) < '2026-07-01').reduce((a, r) => a + r.debit - r.credit, 0);
ok(Math.abs(st.opening - before) < 0.01, 'statement window: opening balance = everything before From (₹' + st.opening + ')');
ok(st.rows.map((r) => r.ref + ':' + r.kind).join(',') === 'INV-T1:payment,INV-T2:invoice', 'only July\'s payment and invoice are listed');
ok(Math.abs(st.closing - (st.opening + st.debit - st.credit)) < 0.01, 'closing = opening + billed − received');
ok(st.label === T.periodLabel('2026-07-01~2026-07-31') && Bill.statementHtml(st, { name: 'SV' }, { name: c }).includes(st.label), 'the printed statement names the window');
console.log('\nALL ' + n + ' TIME WINDOW TESTS PASSED ✓');
