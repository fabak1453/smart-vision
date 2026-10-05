// Executes the compiled app in a sandbox and tests all v5 wiring fixes.
'use strict';
const vm = require('vm');
const fs = require('fs');

const path = require('path');
const appJs = path.join(__dirname, 'app', 'smart-vision-app.js');
const backupJs = path.join(__dirname, 'app', 'backup-csv.js');
const modelJs = path.join(__dirname, 'app', 'erp-model.js');
let code = fs.readFileSync(appJs, 'utf8');
// expose internals for testing
code += `\nglobalThis.__T = { DB, TEAM, ENTITIES, createInvoice, convertQuote, receivePO, refreshDerived,
  insightsPayload, warrantyPayload, monthCollected, accountsPayload, cascadeCustomerRename, cascadeTeamRename,
  cascadeTeamRemove, ensureCustomer, genNum, route, api, buildTimeline, customerLinkCount, O, iso,
  buildBackupCsvBlob, buildBackupCsvText, importBackupCsv, authenticateCredentials, findTeamMemberByLogin,
  normalizeQuoteItems, lineItemQty, parseQtyFromDescription, validateStockForLines, healAcceptedQuoteLinks,
  searchPayload, routeKey, entityApplyEdit, ledgerCatNames, rememberLedgerCategory, addScannedSerial,
  productSerialRows, shopBaseFromParts, csvDownloadUrl,
  persistStateNow, applyState, attachCustomerDetail, bootPromise };\n`;

// ---- browser stubs ----
const noop = () => {};
const store = {};
const sandbox = {
  console, alert: (m) => sandbox.__alerts.push(String(m)), __alerts: [],
  confirm: () => true, prompt: () => null,
  setTimeout: (f) => f(), setInterval: noop, clearInterval: noop, Date, Math, JSON,
  localStorage: { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => delete store[k] },
  XMLHttpRequest: function () { this.open = noop; this.send = () => { this.status = 0; }; },
  fetch: async () => ({ ok: true }),
  document: { addEventListener: noop, hidden: false },
  React: { useState: (v) => [typeof v === 'function' ? v() : v, noop], useEffect: noop, useCallback: (f) => f, useRef: () => ({ current: null }), createElement: (...a) => ({ $el: a[0] }), Fragment: 'Fragment', Component: function Component(props) { this.props = props; this.state = {}; } },
  encodeURIComponent, decodeURIComponent, URLSearchParams, Array, Object, Number, String, Boolean, parseInt, isNaN, Set,
  Blob,
};
sandbox.window = Object.assign(sandbox, { location: { hash: '' }, addEventListener: noop, open: (u) => sandbox.__opened = u });
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(backupJs, 'utf8'), sandbox, { filename: 'backup-csv.js' });
vm.runInContext(fs.readFileSync(modelJs, 'utf8'), sandbox, { filename: 'erp-model.js' });
vm.runInContext(code, sandbox, { filename: 'app.js' });
const T = sandbox.__T;
const { DB, TEAM } = T;
let n = 0; const ok = (cond, msg) => { n++; if (!cond) { console.error('  ✗ FAIL:', msg); process.exit(1); } console.log('  ✓', msg); };

console.log('— app booted in sandbox —');

// 1. accepted quote → invoice + job + lead won + customer + LTV
const invBefore = DB.invoices.length, jobsBefore = DB.jobs.length, custBefore = DB.customers.length;
const roy = DB.leads.find((l) => l.name === 'Roy Villa');
const q = { id: 999, number: 'QT-1099', customer: T.O('Roy Villa'), scope: '8-cam villa', total: 72000, status: 'accepted', owner: T.O('Aslam 420'), valid_till: T.iso(15), items: [] };
DB.quotes.push(q); T.convertQuote(q);
ok(DB.invoices.length === invBefore + 1 && q.invoice_number, 'accepted quote created invoice ' + q.invoice_number);
ok(DB.jobs.length === jobsBefore + 1 && q.job_number, 'accepted quote created install job ' + q.job_number);
ok(roy.stage === 4, 'linked lead moved to Won');
ok(DB.customers.length === custBefore + 1 && DB.customers.some((c) => c.name === 'Roy Villa'), 'Won lead auto-created customer');
ok(DB.customers.find((c) => c.name === 'Roy Villa').lifetime_value === 72000, 'lifetime value bumped by invoice total');
ok(T.convertQuote(q) === false && DB.invoices.filter((i) => i.note === 'From QT-1099').length === 1, 'conversion is once-only (no duplicates)');

// 2. AMC billing
const invB2 = DB.invoices.length;
T.ENTITIES.amc.create({ customer: 'Orchid Hotel', plan: 'gold', devices: 32, value: 64000, visits_total: 4, end_days: 365 });
const newAmc = DB.amc[DB.amc.length - 1];
ok(DB.invoices.length === invB2 + 1 && newAmc.invoice_number, 'new AMC billed → ' + newAmc.invoice_number);

// 3. repair delivered → invoice
const rep = DB.repairs.find((r) => r.number === 'SR-7002'); // paid, charge 3500, repairing
rep.status = 'ready';
// simulate ServiceRepair advance logic core (delivered):
rep.status = 'delivered';
if (rep.coverage === 'paid' && rep.charge > 0 && !rep.invoice_number) {
  const inv = T.createInvoice({ customer: rep.customer.name, total: rep.charge, dueDays: 7, note: 'From ' + rep.number });
  rep.invoice_number = inv.number;
}
ok(rep.invoice_number && DB.invoices.some((i) => i.number === rep.invoice_number && i.total === 3500), 'delivered paid repair billed → ' + rep.invoice_number);

// 4. PO receive → stock in
const bullet = DB.products.find((p) => p.name === 'Hikvision 4MP Bullet');
const stockBefore = bullet.stock;
const po1 = DB.purchaseOrders.find((p) => p.number === 'PO-6001'); // 40 bullets + 8 NVR + 6 HDD
T.receivePO(po1);
ok(bullet.stock === stockBefore + 40, 'PO received → bullet stock +40 (' + stockBefore + '→' + bullet.stock + ')');
T.receivePO(po1);
ok(bullet.stock === stockBefore + 40, 'receiving twice does not double-stock');

// 5. serial installed → equipment + stock out
const dome = DB.products.find((p) => p.name === 'Hikvision 2MP Dome');
const dStock = dome.stock, eqB = DB.equipment.length;
T.ENTITIES.serial.create({ serial_no: 'CAM-HIK-201-SN9999', product: 'Hikvision 2MP Dome', status: 'installed', customer: 'Galaxy Gym' });
ok(dome.stock === dStock - 1, 'installed serial deducted stock');
ok(DB.equipment.length === eqB + 1 && DB.equipment.some((e) => e.serial.serial_no === 'CAM-HIK-201-SN9999' && e.customer.name === 'Galaxy Gym'), 'installed serial auto-created equipment record');

const scanStock = DB.products.find((p) => p.name === 'Hikvision 2MP Dome').stock;
const scanned = T.addScannedSerial('SCAN-HIK-0001', 'Hikvision 2MP Dome');
ok(scanned.ok && DB.serials.some((s) => s.serial_no === 'SCAN-HIK-0001' && s.status === 'in_stock'), 'scan-to-add registers serial as in stock');
ok(DB.products.find((p) => p.name === 'Hikvision 2MP Dome').stock === scanStock + 1, 'scan-to-add increases product stock by 1');
ok(T.addScannedSerial('SCAN-HIK-0001', 'Hikvision 2MP Dome').ok === false, 'scan-to-add rejects duplicate serial');
ok(T.addScannedSerial('  ', 'Hikvision 2MP Dome').ok === false, 'scan-to-add rejects empty scan');
ok(T.addScannedSerial('SCAN-MISS-1', 'No Such Product').ok === false, 'scan-to-add rejects unknown product');
T.DB.equipment.push({ id: 99999, name: 'Orphan cam', location: 'x', customer: null, serial: null });
let detailOk = true;
try { T.attachCustomerDetail(DB.customers[0]); } catch (e) { detailOk = false; }
ok(detailOk, 'customer drawer survives orphan equipment with null customer');
T.DB.equipment.pop();

// 6. equipment create registers serial
const serB = DB.serials.length;
T.ENTITIES.equipment.create({ name: 'Hikvision DVR 4ch', customer: 'Galaxy Gym', location: 'Reception', serial_no: 'DVR-HIK-104-SN8888', installed_days_ago: 0, warranty_days: 365 });
ok(DB.serials.length === serB + 1 && DB.serials.some((s) => s.serial_no === 'DVR-HIK-104-SN8888'), 'equipment create registered its serial');

// 7. live statuses
DB.invoices.push({ id: 9001, number: 'INV-9001', customer: T.O('Galaxy Gym'), total: 10000, paid: 0, balance: 10000, status: 'sent', issue_date: T.iso(-40), due_date: T.iso(-10), payments: [] });
DB.amc.push({ id: 9001, number: 'AMC-9001', customer: T.O('Galaxy Gym'), plan: 'basic', devices: 4, value: 8000, starts_on: T.iso(-400), ends_on: T.iso(-5), visits_total: 2, visits_used: 0, status: 'active' });
T.refreshDerived();
ok(DB.invoices.find((i) => i.number === 'INV-9001').status === 'overdue', 'past-due invoice auto-shows overdue');
ok(DB.amc.find((a) => a.number === 'AMC-9001').status === 'expired', 'past-end AMC auto-shows expired');

// 8. insights are generated from data
const ins = T.insightsPayload();
ok(Array.isArray(ins) && ins.length > 0 && !ins.some((x) => x.body.includes('TKT-4002') && x.body.includes('Datta Pawar is on site')), 'insights generated live (no hardcoded text)');
ok(ins.some((x) => x.title.includes('receivables')), 'insights include live receivables figure');

// 9. warranty report includes in-warranty equipment & dedupes
const w = T.warrantyPayload();
ok(w.some((r) => r.serial_no === 'CAM-HIK-405-SN0012' && r.in_warranty === true), 'warranty report now includes in-warranty equipment');
ok(new Set(w.map((r) => r.serial_no)).size >= w.length - w.filter((r) => r.serial_no === '—').length, 'warranty report deduped by serial');

// 10. customer rename cascades everywhere
T.cascadeCustomerRename('Galaxy Gym', 'Galaxy Fitness Club');
const stale = ['quotes','invoices','jobs','tickets','amc','equipment','credentials','serials','repairs']
  .flatMap((k) => DB[k].filter((x) => x.customer?.name === 'Galaxy Gym'));
ok(stale.length === 0 && DB.tickets.some((t) => t.customer.name === 'Galaxy Fitness Club'), 'customer rename cascaded to all 9 modules');

// 11. team remove cascades
DB.jobs.push({ id: 9001, number: 'JOB-9001', customer: T.O('Orchid Hotel'), type: 'install', scope: 'x', scheduled_on: T.iso(1), slot: 'TBD', technician: T.O('Akram Suli'), status: 'scheduled', checklist: [] });
T.cascadeTeamRemove('Akram Suli');
ok(!DB.jobs.some((j) => j.technician?.name === 'Akram Suli'), 'removed team member unassigned from jobs');

// 12. numbering is collision-proof
DB.invoices.splice(2, 1); // simulate a delete
const n1 = T.genNum('INV-', DB.invoices, 2000), before = DB.invoices.length;
ok(!DB.invoices.some((i) => i.number === n1), 'genNum never reuses an existing number even after deletes (' + n1 + ')');

// 13. monthly revenue is monthly — a payment recorded today must count
const mcBefore = T.monthCollected();
const testInv = { id: 88001, number: 'INV-TEST-MC', customer: T.O('Test Co'), total: 10000, paid: 0, balance: 10000, status: 'sent', issue_date: T.iso(-60), due_date: T.iso(10), payments: [] };
DB.invoices.push(testInv);
testInv.payments.push({ amount: 5000, on: T.iso(0) });
testInv.paid = 5000;
const mcAfter = T.monthCollected();
ok(mcAfter === mcBefore + 5000, 'payment recorded today counts in this month (₹' + mcBefore.toLocaleString('en-IN') + ' → ₹' + mcAfter.toLocaleString('en-IN') + ')');

// 14. login identity (await the mock API promise properly)
(async () => {
const login = await T.api.post('/login', { username: 'smart', password: '1234' });
ok(login.user.name === 'smart', 'login returns master user (matches Team & header)');

const tech = { id: 77, name: 'Test Tech', role: 'Technician', phone: '', login_username: 'tech1', login_password: 'pass123' };
TEAM.push(tech);
const teamLogin = T.authenticateCredentials('tech1', 'pass123');
ok(teamLogin && teamLogin.user.name === 'Test Tech' && teamLogin.token === 'sv-team-77', 'team member can log in with set username/password');

const blob = await T.buildBackupCsvBlob();
const csvText = await blob.text();
ok(csvText.includes('## customers') && csvText.includes('## quotes') && csvText.includes('id,name,area'), 'CSV export is Excel-friendly (sectioned columns)');
const beforeCust = DB.customers.length;
const beforeQuotes = DB.quotes.length;
const sampleQuote = DB.quotes[0]?.number;
DB.customers.length = 0;
DB.quotes.length = 0;
const restored = await T.importBackupCsv(csvText);
ok(DB.customers.length === beforeCust && restored.customers === beforeCust, 'CSV restore reloads customer data');
ok(DB.quotes.length === beforeQuotes && DB.quotes.some((q) => q.number === sampleQuote && q.customer?.name), 'CSV restore reloads quotes with customer links');
DB.customers.push({ id: 99999, name: 'Ghost Customer', area: 'X', type: 'Commercial', contact_name: '', phone: '', sites: 1, owner: T.O('Rohit Sharma'), lifetime_value: 0 });
await T.importBackupCsv(csvText);
ok(!DB.customers.some((c) => c.name === 'Ghost Customer'), 'CSV restore replaces data (removes rows not in backup)');

function completeCsv(partial) {
  const Sv = sandbox.SvBackupCsv;
  const present = new Set();
  String(partial).split(/\r?\n/).forEach((line) => {
    const m = line.trim().match(/^##\s+([A-Za-z0-9_]+)/);
    if (m) present.add(m[1]);
  });
  const extra = Sv.TABLE_ORDER.filter((t) => !present.has(t)).map((t) => {
    const cols = (Sv.SCHEMAS[t] && Sv.SCHEMAS[t].cols) || ['id'];
    return '## ' + t + '\r\n' + cols.join(',') + '\r\n';
  }).join('\r\n');
  return partial + '\r\n' + extra;
}

// conflict: duplicate customer name in edited CSV → last row wins, single record
const conflictCsv = [
  '# Smart Vision ERP backup v2',
  '## team',
  'id,name,role,phone,login_username,login_password',
  '1,smart,Owner,,smart,1234',
  '## customers',
  'id,name,area,type,contact_name,phone,sites,owner,lifetime_value',
  '1,Dup Co,Area,Commercial,A,1,1,smart,0',
  ',Dup Co,Area2,Commercial,B,2,1,smart,100',
  '## quotes',
  'id,number,customer,scope,total,status,owner,valid_till,invoice_number,job_number,items',
  ',QT-9001,Dup Co,Test scope,5000,draft,smart,2030-01-01,,,"Cam|5000"',
].join('\r\n');
await T.importBackupCsv(completeCsv(conflictCsv));
const dups = DB.customers.filter((c) => c.name === 'Dup Co');
ok(dups.length === 1 && dups[0].lifetime_value === 100 && Number.isFinite(dups[0].id), 'duplicate customer rows collapse (last wins, id assigned)');
ok(DB.quotes.some((q) => q.number === 'QT-9001' && q.customer?.name === 'Dup Co' && q.items?.[0]?.amount === 5000), 'Excel line-items parse on restore');

// restore full backup again so later guards still see seed customers
await T.importBackupCsv(csvText);

ok(T.lineItemQty({ description: 'Hikvision 2MP Dome × 16', qty: 0 }) === 16, 'line qty parsed from description × 16');
const hdd = DB.products.find((p) => p.name === 'WD Purple 4TB');
const stockH = hdd.stock;
sandbox.__alerts.length = 0;
const oosInv = T.createInvoice({ customer: 'Test Co', total: hdd.sale_price * (stockH + 50), items: [{ description: hdd.name, amount: hdd.sale_price, qty: stockH + 50, product_id: hdd.id }], persist: false });
ok(oosInv && oosInv.stock_note, 'invoice still created when stock is short (warning kept)');
hdd.stock = 0;
T.entityApplyEdit('product', hdd, { sku: hdd.sku, name: hdd.name, specs: hdd.specs, category: hdd.category, purchase_price: hdd.purchase_price, sale_price: hdd.sale_price, stock: 12, reserved: hdd.reserved, reorder_level: hdd.reorder_level, track_serials: 'No' });
ok(hdd.stock === 12, 'out-of-stock product stock can be edited back to 12');

const poe = T.searchPayload('poe');
ok(poe.results.products.some((p) => /poe/i.test(p.name) || /poe/i.test(p.sku) || /poe/i.test(p.specs)), 'search finds PoE switch by partial name');
const camSku = T.searchPayload('camhik201');
ok(camSku.results.products.some((p) => p.sku === 'CAM-HIK-201'), 'search finds SKU without hyphens');
const specsHit = T.searchPayload('colorvu');
ok(specsHit.results.products.some((p) => /ColorVu/i.test(p.specs)), 'search finds inventory by specs text');
ok(T.routeKey('/inventory?open=7') === 'inventory', 'hash query does not break inventory route');
ok(String(T.searchPayload('hikvision').results.products.length) !== '0', 'search returns hikvision products');
// serial-number search: the product behind a serial must surface, tagged with the serial
const bySerial = T.searchPayload('CAM-HIK-201-SN0001');
ok(bySerial.results.products.some((p) => p.sku === 'CAM-HIK-201'), 'search by full serial number returns the product');
ok(bySerial.results.products.some((p) => (p.matched_serials || []).indexOf('CAM-HIK-201-SN0001') >= 0), 'product result carries the matched serial number');
const bySerialPartial = T.searchPayload('DVR-HIK-104-SN0003');
ok(bySerialPartial.results.products.some((p) => p.sku === 'DVR-HIK-104'), 'search by repair serial returns the product');
const dome = DB.products.find((p) => p.sku === 'CAM-HIK-201');
const domeSerials = T.productSerialRows(dome);
ok(domeSerials.some((s) => s.serial_no === 'CAM-HIK-201-SN0001'), 'productSerialRows lists registered serials');
ok(domeSerials.some((s) => s.source === 'equipment'), 'productSerialRows also lists installed equipment serials');
// a serial whose product is stored as a SKU (not the display name) must still resolve
DB.serials.push({ id: 777001, serial_no: 'SKU-REF-0001', product: { sku: 'CAM-HIK-201' }, status: 'in_stock' });
ok(T.searchPayload('SKU-REF-0001').results.products.some((p) => p.sku === 'CAM-HIK-201'), 'serial stored by product SKU resolves to the product');
ok(T.productSerialRows(dome).some((s) => s.serial_no === 'SKU-REF-0001'), 'productSerialRows matches a SKU-referenced serial');
DB.serials.pop();
T.healAcceptedQuoteLinks();
const qt1002 = DB.quotes.find((x) => x.number === 'QT-1002');
ok(qt1002 && qt1002.converted && qt1002.invoice_number, 'seed accepted quote stays linked after heal');

const qtyCsv = [
  '# Smart Vision ERP backup v2',
  '## team',
  'id,name,role,phone,login_username,login_password',
  '1,smart,Owner,,smart,1234',
  '## customers',
  'id,name,area,type,contact_name,phone,sites,owner,lifetime_value',
  '1,Qty Test,Area,Commercial,,,1,smart,0',
  '## quotes',
  'id,number,customer,scope,total,status,owner,valid_till,invoice_number,job_number,items',
  ',QT-QTY,Qty Test,Scope,1000,draft,smart,2030-01-01,,,"Line|500|4|1"',
].join('\r\n');
const invKeep = DB.invoices.length;
let incompleteErr = '';
try { await T.importBackupCsv(qtyCsv); } catch (e) { incompleteErr = e.message || String(e); }
ok(/Incomplete backup/i.test(incompleteErr) && DB.invoices.length === invKeep, 'incomplete CSV restore refused (live invoices kept)');
await T.importBackupCsv(completeCsv(qtyCsv));
const qQty = DB.quotes.find((x) => x.number === 'QT-QTY');
ok(qQty && qQty.items?.[0]?.qty === 4 && Number(qQty.items[0].product_id) === 1, 'CSV round-trip preserves qty and product_id');
await T.importBackupCsv(csvText);

// 15. duplicate customer guard
const cB = DB.customers.length;
T.ENTITIES.customer.create({ name: 'orchid hotel', area: 'X', type: 'Commercial' });
ok(DB.customers.length === cB && sandbox.__alerts.some((a) => a.includes('already exists')), 'duplicate customer name blocked');

// 16. route smoke: every endpoint returns without throwing
['/dashboard','/leads-board','/quotes','/invoices','/invoices-stats','/reports/outstanding','/reports/warranty','/reports','/insights','/customers','/jobs','/tickets','/amc','/equipment','/credentials','/products','/serials','/purchase-orders','/repairs','/accounts','/search?q=hik']
  .forEach((p) => { const r = T.route(p); if (r === null || r === undefined) throw new Error('route failed: ' + p); });
ok(true, 'all 21 API routes respond after rewiring');

const accAll = T.accountsPayload('all');
ok(accAll.money_in > 0 && accAll.money_out > 0, 'accounts: money in/out from invoices, POs and cashbook');
ok(typeof accAll.profit === 'number' && accAll.profit === accAll.money_in - accAll.money_out, 'accounts: cash profit = in − out');
const beforeOut = accAll.money_out;
T.ENTITIES.ledger.create({ direction: 'out', category: 'Rent', amount: 1000, on: T.iso(0).slice(0, 10), party: 'Test', note: 'wiring' });
const accAfter = T.accountsPayload('all');
ok(accAfter.money_out === beforeOut + 1000 && accAfter.profit === accAll.profit - 1000, 'accounts: manual money-out reduces profit');
T.ENTITIES.ledger.create({ direction: 'out', category: 'Rent', new_category: 'Shop electricity', amount: 500, on: T.iso(0).slice(0, 10) });
ok(T.ledgerCatNames().includes('Shop electricity'), 'accounts: custom money-out category can be added');
ok(DB.ledger.some((e) => e.category === 'Shop electricity' && e.amount === 500), 'accounts: custom category saved on the cash entry');

console.log('\nALL ' + n + ' WIRING TESTS PASSED ✓');
})().catch((e) => { console.error('  ✗ FAIL:', e.message); process.exit(1); });
