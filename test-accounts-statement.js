// Accounts for any month (this, last, picked) and one customer's statement — on
// screen and printed. Checks the accounting identities, not just that it renders.
// node test-accounts-statement.js
'use strict';
const vm = require('vm');
const fs = require('fs');
const path = require('path');

let n = 0;
const ok = (cond, msg) => { n++; if (!cond) { console.error('  ✗ FAIL:', msg); process.exit(1); } console.log('  ✓', msg); };
const appJs = fs.readFileSync(path.join(__dirname, 'app', 'smart-vision-app.js'), 'utf8')
  + '\nglobalThis.__T = { DB, COMPANY, buildTimeline, accountsPayload, customerStatement, periodLabel, periodMonthKey, monthKey, recentMonths, invoiceStatsPayload };\n';
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
for (const f of ['backup-csv.js', 'erp-model.js', 'bill-format.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, 'app', f), 'utf8'), sb);
vm.runInContext(appJs, sb);
const A = sb.__T; const Bill = sb.SvBill;
const r2 = (x) => Math.round(x * 100) / 100;
const local = (y, m, d, h = 12) => new Date(y, m - 1, d, h).toISOString();

console.log('— accounts & statement suite —');
const now = new Date(); const Y = now.getFullYear(); const M = now.getMonth() + 1;
const prev = new Date(Y, M - 2, 1); const PY = prev.getFullYear(); const PM = prev.getMonth() + 1;
const key = (y, m) => y + '-' + String(m).padStart(2, '0');

/* ---- a known month of cashbook entries, including the month's edges */
A.DB.ledger.push(
  { id: 901, number: 'CB-T1', direction: 'out', category: 'Rent', amount: 15000, on: local(PY, PM, 1, 0), party: 'Landlord' },
  { id: 902, number: 'CB-T2', direction: 'in', category: 'Other income', amount: 4000, on: local(PY, PM, new Date(PY, PM, 0).getDate(), 23), party: 'Scrap' },
  { id: 903, number: 'CB-T3', direction: 'out', category: 'Salary', amount: 9000, on: local(Y, M, 1, 0), party: 'Staff' },
);
const last = A.accountsPayload('prev');
ok(A.periodMonthKey('prev') === key(PY, PM) && last.period === key(PY, PM), 'last month resolves to ' + key(PY, PM));
ok(last.rows.some((r) => r.number === 'CB-T1') && last.rows.some((r) => r.number === 'CB-T2') && !last.rows.some((r) => r.number === 'CB-T3'),
  "last month's view has its 1st-of-month and last-day entries, and not this month's 1st");
ok(last.rows.every((r) => A.monthKey(r.on) === key(PY, PM)), 'every entry in the month view is from that month');
const picked = A.accountsPayload(key(PY, PM));
ok(JSON.stringify(picked.rows.map((r) => r.id)) === JSON.stringify(last.rows.map((r) => r.id)) && picked.money_out === last.money_out, 'picking the same month by name gives the same figures');
ok(/^[A-Z][a-z]+ \d{4}$/.test(last.label) && A.periodLabel('all') === 'All time', 'periods are labelled like "' + last.label + '"');
const allTime = A.accountsPayload('all');
ok(allTime.rows.length >= last.rows.length + A.accountsPayload('month').rows.length, 'all time contains every month');
for (const a of [last, A.accountsPayload('month'), allTime]) {
  const cin = a.by_category.reduce((s, c) => s + c.in, 0); const cout = a.by_category.reduce((s, c) => s + c.out, 0);
  ok(r2(cin) === r2(a.money_in) && r2(cout) === r2(a.money_out) && r2(a.profit) === r2(a.money_in - a.money_out),
    a.label + ': categories add up to money in / out; cash profit = in − out');
}
ok(A.recentMonths(24).length === 24 && A.recentMonths(24)[0] === key(Y, M) && A.recentMonths(24)[1] === key(PY, PM), 'month picker offers the last 24 months, newest first');
ok(A.accountsPayload('garbage').period === key(Y, M), 'an unknown period falls back to this month');

/* ---- one customer's statement */
const name = 'Test Statement Co';
A.DB.customers.push({ id: 900, name, area: 'Anand', phone: '90000 00000', gstin: '24AAACT1234A1Z1' });
A.DB.invoices.push(
  { id: 901, number: 'INV-T901', customer: { name }, total: 10000, paid: 10000, balance: 0, issue_date: local(PY, PM, 5), due_date: local(PY, PM, 20),
    payments: [{ amount: 6000, on: local(PY, PM, 10) }, { amount: 4000, on: local(Y, M, 2) }] },
  { id: 902, number: 'INV-T902', customer: { name }, total: 5900, paid: 2000, balance: 3900, issue_date: local(Y, M, 3), due_date: local(Y, M, 18) },
  { id: 903, number: 'INV-T903', customer: { name }, total: 1180, paid: 0, balance: 1180, issue_date: local(PY - 1, PM, 9), due_date: local(PY - 1, PM, 20) },
);
const sAll = A.customerStatement(name, 'all');
const owed = A.DB.invoices.filter((i) => i.customer.name === name).reduce((s, i) => s + i.total - i.paid, 0);
ok(sAll.opening === 0 && sAll.closing === owed, 'all time: closing balance = what the customer actually owes (₹' + owed + ')');
ok(sAll.rows.some((e) => /date not recorded/.test(e.particulars) && e.credit === 2000), 'money marked paid without a dated payment still shows (on the invoice date)');
const sPrev = A.customerStatement(name, 'prev');
ok(sPrev.opening === 1180 && sPrev.debit === 10000 && sPrev.credit === 6000 && sPrev.closing === 5180,
  'last month: opening 1,180 (older bill) + billed 10,000 − received 6,000 = closing 5,180');
const sNow = A.customerStatement(name, 'month');
ok(sNow.opening === sPrev.closing, "this month opens with last month's closing balance");
ok(r2(sNow.opening + sNow.debit - sNow.credit) === sNow.closing && sNow.closing === owed, "and closes at today's balance");
ok(sNow.rows.every((e) => A.monthKey(e.on) === key(Y, M)), 'a month statement lists only that month');
ok(sNow.rows.length && sNow.rows[sNow.rows.length - 1].balance === sNow.closing, 'running balance ends at the closing balance');

ok(!sAll.activity.some((e) => /^(Invoice|Payment)/.test(e.title)), "'Other activity' does not repeat invoices or payments (they are in the account table)");
const tl = A.buildTimeline(name).find((e) => /date not recorded/.test(e.detail || ''));
ok(tl && A.monthKey(tl.t) === A.monthKey(A.DB.invoices.find((i) => i.number === 'INV-T902').issue_date) && new Date(tl.t).getDate() === 3,
  'timeline, statement and accounts put an undated payment on the same day (the invoice date)');

/* ---- printed */
const ah = Bill.accountsHtml(last, A.COMPANY, {});
ok(ah.includes('Accounts statement') && ah.includes(last.label) && ah.includes('CB-T1') && ah.includes(A.COMPANY.name) && !ah.includes('CB-T3'),
  'printed accounts: letterhead, the month, its entries only');
ok(Bill.accountsHtml(last, A.COMPANY, { dir: 'out' }).includes('money out only') && !Bill.accountsHtml(last, A.COMPANY, { dir: 'out' }).includes('CB-T2'), 'print follows the In / Out filter on screen');
const sh = Bill.statementHtml(sPrev, A.COMPANY, A.DB.customers.find((c) => c.name === name));
ok(sh.includes('Customer statement') && sh.includes('Opening balance') && sh.includes('₹5,180') && sh.includes('24AAACT1234A1Z1') && sh.includes('INV-T901'),
  'printed statement: customer, GSTIN, opening, entries, balance due');
ok(sh.includes('Rupees Five Thousand One Hundred Eighty Only'), 'printed statement: amount due in words');
console.log('\nALL ' + n + ' ACCOUNTS & STATEMENT TESTS PASSED ✓');
