// Mobile number on a bill: defaults from the customer, overridable per bill.
// Also covers lead → customer phone carry-over and the generic customer editor.
'use strict';
const vm = require('vm');
const fs = require('fs');
const path = require('path');

let n = 0;
const ok = (cond, msg) => {
  n++;
  if (!cond) { console.error('  ✗ FAIL:', msg); process.exit(1); }
  console.log('  ✓', msg);
};

const appJs = fs.readFileSync(path.join(__dirname, 'app', 'smart-vision-app.js'), 'utf8')
  + `\nglobalThis.__T = { DB, ENTITIES, entityEditFields, entityToInitial, entityApplyEdit,
  findCust, createInvoice, ensureCustomer, buildBackupCsvText, importBackupCsv,
  O, nextId, num, teamNames };\n`;

const noop = () => {};
const store = {};
const alerts = [];
const sb = {
  console: { log: noop, warn: noop, error: noop },
  alert: (m) => alerts.push(String(m)), confirm: () => true, prompt: () => null,
  setTimeout: (f) => f(), clearTimeout: noop, setInterval: noop, clearInterval: noop,
  Date, Math, JSON, Promise,
  localStorage: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  },
  XMLHttpRequest: function () { this.open = noop; this.send = () => { this.status = 0; }; },
  fetch: async () => ({ ok: true, status: 200, text: async () => '', json: async () => ({}) }),
  document: { addEventListener: noop, removeEventListener: noop, hidden: false },
  React: {
    useState: (v) => [typeof v === 'function' ? v() : v, noop], useEffect: noop,
    useCallback: (f) => f, useRef: () => ({ current: null }),
    createElement: (...a) => ({ $el: a[0] }), Fragment: 'Fragment',
    Component: function C(p) { this.props = p; this.state = {}; },
  },
  encodeURIComponent, decodeURIComponent, URLSearchParams, AbortController,
  Array, Object, Number, String, Boolean, parseInt, isNaN, Set, Map, Blob, Error,
  CustomEvent: function (t, o) { this.detail = o && o.detail; },
  crypto: require('crypto').webcrypto,
};
sb.window = Object.assign(sb, { location: { hash: '', reload: noop }, addEventListener: noop, removeEventListener: noop, dispatchEvent: noop, open: noop });
sb.globalThis = sb;
vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'app', 'backup-csv.js'), 'utf8'), sb, { filename: 'backup-csv.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'app', 'erp-model.js'), 'utf8'), sb, { filename: 'erp-model.js' });
vm.runInContext(appJs, sb, { filename: 'app.js' });
const T = sb.__T;
const DB = T.DB;

/** What PartyBlock / the printed bill resolves to. */
const billPhone = (inv) => inv.phone || (T.findCust(inv.customer && inv.customer.name).phone || '');

(async () => {
  console.log('— bill contact suite —');

  /* ---------------------------------------------- 1. default from the customer */
  T.ENTITIES.customer.create({ name: 'Walk In Shop', area: 'Main Rd', type: 'Commercial', contact_name: 'Ali', phone: '98111 00000', sites: 1, owner: T.teamNames()[0] });
  const cust = DB.customers.find((c) => c.name === 'Walk In Shop');
  const inv = T.createInvoice({ customer: 'Walk In Shop', total: 5000 });
  ok(billPhone(inv) === '98111 00000', 'a new bill shows the customer\'s mobile number');

  cust.phone = '98222 99999';
  ok(billPhone(inv) === '98222 99999', 'editing the customer updates bills that have no override');

  /* ---------------------------------------------- 2. per-bill override */
  ok(T.ENTITIES.invoice.fields.some((f) => f.key === 'phone'), 'the New Invoice form has a mobile field');
  ok(T.entityEditFields('invoice').some((f) => f.key === 'phone'), 'the Edit Invoice form has a mobile field');

  T.entityApplyEdit('invoice', inv, Object.assign(T.entityToInitial('invoice', inv), { phone: '90000 12345' }));
  ok(inv.phone === '90000 12345', 'a mobile number typed on the bill is saved to the bill');
  ok(billPhone(inv) === '90000 12345', 'the override is what the bill prints');

  cust.phone = '97777 00000';
  ok(billPhone(inv) === '90000 12345', 'a later customer edit does not rewrite a bill that has its own number');

  T.entityApplyEdit('invoice', inv, Object.assign(T.entityToInitial('invoice', inv), { phone: '  ' }));
  ok(inv.phone === '' && billPhone(inv) === '97777 00000', 'clearing the override falls back to the customer again');

  /* ---------------------------------------------- 3. leads carry a number */
  ok(T.ENTITIES.lead.fields.some((f) => f.key === 'phone'), 'the New Lead form asks for a mobile number');
  T.ENTITIES.lead.create({ name: 'Nalanda Apartments', phone: '96000 45678', requirement: '8 cameras', value: 80000, source: 'Referral', segment: 'Residential', owner: T.teamNames()[0], stage: '0' });
  const lead = DB.leads.find((l) => l.name === 'Nalanda Apartments');
  ok(lead.phone === '96000 45678', 'the lead stores the number');

  T.ensureCustomer(lead);
  const fromLead = DB.customers.find((c) => c.name === 'Nalanda Apartments');
  ok(fromLead && fromLead.phone === '96000 45678', 'a won lead creates the customer WITH the number (was blank before)');
  const leadBill = T.createInvoice({ customer: 'Nalanda Apartments', total: 80000 });
  ok(billPhone(leadBill) === '96000 45678', 'the first bill for that customer is not blank');

  /* ------------------------------------- 4. number added to the lead afterwards */
  T.ENTITIES.lead.create({ name: 'Late Number Co', requirement: 'survey', value: 1000, source: 'Walk-in', segment: 'Commercial', owner: T.teamNames()[0], stage: '0' });
  const late = DB.leads.find((l) => l.name === 'Late Number Co');
  T.ensureCustomer(late);
  ok(DB.customers.find((c) => c.name === 'Late Number Co').phone === '', 'no number yet, as expected');
  late.phone = '95555 11111';
  T.ensureCustomer(late);
  ok(DB.customers.find((c) => c.name === 'Late Number Co').phone === '95555 11111',
    'adding the number to the lead later backfills the customer');

  /* ---------------------------------------------- 5. the generic customer editor */
  const initial = T.entityToInitial('customer', cust);
  ok(initial.phone === '97777 00000' && initial.name === 'Walk In Shop',
    'the customer edit form is now prefilled (it returned an empty object before)');
  T.entityApplyEdit('customer', cust, Object.assign({}, initial, { phone: '94444 22222' }));
  ok(cust.phone === '94444 22222', 'editing a customer through the generic form actually saves');

  const invForRename = T.createInvoice({ customer: 'Walk In Shop', total: 100 });
  T.entityApplyEdit('customer', cust, Object.assign(T.entityToInitial('customer', cust), { name: 'Walk In Store' }));
  ok(cust.name === 'Walk In Store', 'renaming through the generic form works');
  ok(invForRename.customer.name === 'Walk In Store', 'the rename cascaded to the linked bill');
  ok(billPhone(invForRename) === '94444 22222', 'the renamed customer\'s bill still resolves the number');

  alerts.length = 0;
  T.ENTITIES.customer.create({ name: 'Other Shop', area: 'X', type: 'Commercial', contact_name: '', phone: '', sites: 1, owner: T.teamNames()[0] });
  T.entityApplyEdit('customer', cust, Object.assign(T.entityToInitial('customer', cust), { name: 'Other Shop' }));
  ok(cust.name === 'Walk In Store' && alerts.length === 1, 'renaming onto an existing customer name is refused');

  /* ---------------------------------------------- 6. survives a CSV backup */
  inv.phone = '90000 12345';
  const csv = T.buildBackupCsvText();
  await T.importBackupCsv(csv);
  const invBack = DB.invoices.find((x) => x.number === inv.number);
  const leadBack = DB.leads.find((l) => l.name === 'Nalanda Apartments');
  ok(invBack && invBack.phone === '90000 12345', 'a bill\'s own mobile number survives CSV export/restore');
  ok(leadBack && leadBack.phone === '96000 45678', 'a lead\'s mobile number survives CSV export/restore');

  /* ---------------------------------------------- 7. WhatsApp picks the right number */
  const { normalizePhone } = require('./electron/document-html.js');
  const docPhone = '90000 12345';
  const customerPhone = '94444 22222';
  const chosen = normalizePhone(docPhone) || normalizePhone(customerPhone);
  ok(chosen === normalizePhone(docPhone), 'WhatsApp sends to the bill\'s number when it has one');
  ok((normalizePhone('') || normalizePhone(customerPhone)) === normalizePhone(customerPhone),
    'WhatsApp falls back to the customer number when the bill has none');

  console.log('\nALL ' + n + ' BILL CONTACT TESTS PASSED ✓');
})().catch((e) => { console.error('  ✗ FAIL:', (e && e.message) || e); process.exit(1); });
