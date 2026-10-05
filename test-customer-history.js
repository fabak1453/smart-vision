// "Print full history" for one customer: everything — equipment installed,
// installations, service tickets, repairs, AMC, quotations, bills and payments,
// timeline — on one A4 printout (9.8.0).
// node test-customer-history.js
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
vm.runInContext(read('app/smart-vision-app.js') + '\nglobalThis.__T = { DB, COMPANY, customerHistory };\n', sb, { filename: 'app.js' });
const T = sb.__T; const Bill = sb.SvBill;
console.log('— customer history suite —');

// The demo customer with the most going on.
const score = (c) => ['invoices', 'jobs', 'tickets', 'repairs', 'amc', 'equipment', 'quotes'].filter((k) => T.DB[k].some((x) => x.customer?.name === c.name)).length;
const cust = T.DB.customers.slice().sort((a, b) => score(b) - score(a))[0];
const h = T.customerHistory(cust.name);
const count = (k) => T.DB[k].filter((x) => x.customer?.name === cust.name).length;
ok(h.customer.name === cust.name && score(cust) >= 4, 'customer with installs, service and bills: ' + cust.name);
ok(h.summary.invoices === count('invoices') && h.summary.jobs === count('jobs') && h.summary.tickets === count('tickets')
  && h.summary.repairs === count('repairs') && h.summary.amc === count('amc') && h.summary.equipment === count('equipment') && h.summary.quotes === count('quotes'),
  'every kind of record is collected (bills, jobs, tickets, repairs, AMC, equipment, quotes)');
const inv = T.DB.invoices.filter((i) => i.customer?.name === cust.name);
const billed = inv.reduce((a, i) => a + Number(i.total), 0); const paid = inv.reduce((a, i) => a + Number(i.paid), 0);
ok(h.summary.billed === billed && h.summary.received === paid && h.summary.balance === billed - paid, 'all-time billed, received and balance add up');
ok(!T.DB.invoices.some((i) => i.customer?.name !== cust.name && h.sections.invoices.some((x) => x.number === i.number)), 'nothing from other customers');

const html = Bill.customerHistoryHtml(h, T.COMPANY);
ok(/Customer history/.test(html) && html.includes(cust.name) && html.includes(T.COMPANY.name), 'A4 sheet: letterhead, title, customer');
const want = [['Equipment installed', 'equipment'], ['Installation &amp; site jobs', 'jobs'], ['Service tickets', 'tickets'], ['Repairs', 'repairs'],
  ['AMC contracts', 'amc'], ['Quotations', 'quotes'], ['Bills &amp; payments', 'invoices']];
want.forEach(([title, k]) => {
  const has = count(k) > 0;
  ok(has ? html.includes(title + ' · ' + count(k)) : !html.includes(title + ' · '), (has ? 'prints ' : 'skips empty ') + title.replace('&amp;', '&') + (has ? ' (' + count(k) + ')' : ''));
});
T.DB.equipment.filter((e) => e.customer?.name === cust.name).forEach((e) => ok(html.includes(e.serial.serial_no), 'equipment serial on paper: ' + e.serial.serial_no));
inv.forEach((i) => ok(html.includes(i.number), 'bill on paper: ' + i.number));
ok(/Timeline · \d+/.test(html), 'and the full timeline');
const empty = Bill.customerHistoryHtml(T.customerHistory('Nobody Here'), T.COMPANY);
ok(/No records for this customer yet/.test(empty), 'a customer with nothing yet gets a clear line, not empty tables');
ok(/Print full history/.test(read('app/smart-vision-app.jsx')), 'the customer screen has a "Print full history" button');
console.log('\nALL ' + n + ' CUSTOMER HISTORY TESTS PASSED ✓');
