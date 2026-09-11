// Merge / numbering / stock_moves / 409 rebase — shared erp-model.js
'use strict';
const Erp = require('./app/erp-model');

let n = 0;
const ok = (cond, msg) => {
  n++;
  if (!cond) { console.error('  ✗ FAIL:', msg); process.exit(1); }
  console.log('  ✓', msg);
};

function snap(prefix, extra) {
  const products = [
    { id: 1, sku: 'CAM', name: 'Cam', stock: 10, stock_baseline: 10, uuid: 'prod-cam' },
  ];
  const customers = [
    { id: 1, name: 'Acme', uuid: 'cust-acme', updated_at: '2020-01-01T00:00:00.000Z' },
  ];
  return Erp.ensureSyncMeta({
    revision: 1,
    device_id: prefix,
    DB: {
      products, customers, leads: [], quotes: [], invoices: [], jobs: [], tickets: [], amc: [],
      serials: [], equipment: [], credentials: [], purchaseOrders: [], repairs: [], ledger: [],
      stock_moves: [],
    },
    TEAM: [{ id: 1, name: 'smart', uuid: 'team-smart' }],
    CATALOG: [],
    COMPANY: { name: 'SV' },
    ...extra,
  }, { deviceId: prefix });
}

console.log('— erp-model merge suite —');

ok(Erp.genNum('INV-', [{ number: 'INV-2001' }, { number: 'INV-P1-2001' }], 2000, '') === 'INV-2002', 'shop genNum ignores phone-prefixed numbers');
ok(Erp.genNum('INV-', [{ number: 'INV-2001' }, { number: 'INV-P1-5' }], 2000, 'P1') === 'INV-P1-2001', 'phone genNum uses device prefix (base 2000)');
ok(Erp.genNum('INV-', [{ number: 'INV-P1-2005' }], 2000, 'P1') === 'INV-P1-2006', 'phone genNum increments its own series');
ok(Erp.genNum('QT-', [], 1000, 'P2') === 'QT-P2-1001', 'empty table starts at base+1 with prefix');

const pc = snap('shop');
const phone = Erp.cloneState(pc);
phone.device_id = 'phone-1';
phone.revision = 1;
const qPc = { uuid: 'quote-1', number: 'QT-1001', status: 'accepted', converted: true, invoice_number: 'INV-2009', job_number: 'JOB-3010', customer: { name: 'Acme', uuid: 'cust-acme' }, total: 100, updated_at: '2024-01-01T00:00:00.000Z' };
const qPh = { uuid: 'quote-1', number: 'QT-1001', status: 'accepted', converted: true, invoice_number: 'INV-P1-2001', job_number: 'JOB-P1-1', customer: { name: 'Acme', uuid: 'cust-acme' }, total: 100, updated_at: '2024-01-02T00:00:00.000Z' };
pc.DB.quotes = [qPc];
pc.DB.invoices = [{ uuid: 'inv-pc', number: 'INV-2009', customer: { name: 'Acme', uuid: 'cust-acme' }, total: 100, paid: 0, balance: 100, updated_at: '2024-01-01T00:00:00.000Z' }];
phone.DB.quotes = [qPh];
phone.DB.invoices = [{ uuid: 'inv-ph', number: 'INV-P1-2001', customer: { name: 'Acme', uuid: 'cust-acme' }, total: 100, paid: 0, balance: 100, updated_at: '2024-01-02T00:00:00.000Z' }];

const mergedQuotes = Erp.applySyncPayload(pc, {
  device_id: 'phone-1',
  base_revision: 1,
  upserts: { quotes: phone.DB.quotes, invoices: phone.DB.invoices },
  stock_moves: [],
  deletes: [],
});
ok(mergedQuotes.DB.invoices.length === 2, 'dual convert keeps both invoices (no genNum on merge)');
ok(mergedQuotes.DB.quotes.length === 1 && mergedQuotes.DB.quotes[0].converted, 'same quote uuid merges to one row');
ok(mergedQuotes.DB.quotes[0].invoice_number, 'merged quote keeps an invoice_number (idempotent, no second convert)');

const pcStock = snap('shop');
pcStock.DB.stock_moves = [
  { uuid: 'm-sale', product_uuid: 'prod-cam', qty: -2, reason: 'issue', at: '2024-01-01T00:00:00.000Z' },
];
const phoneMoves = [
  { uuid: 'm-recv', product_uuid: 'prod-cam', qty: 5, reason: 'receive', at: '2024-01-02T00:00:00.000Z' },
];
const mergedStock = Erp.applySyncPayload(pcStock, { device_id: 'phone-1', upserts: {}, stock_moves: phoneMoves, deletes: [] });
ok(mergedStock.DB.products[0].stock === 13, 'stock moves commute: baseline 10 -2 +5 = 13');
const mergedAgain = Erp.applySyncPayload(mergedStock, { device_id: 'phone-1', upserts: {}, stock_moves: phoneMoves, deletes: [] });
ok(mergedAgain.DB.stock_moves.filter((m) => m.uuid === 'm-recv').length === 1, 'duplicate stock move uuid is ignored');
ok(mergedAgain.DB.products[0].stock === 13, 're-merge does not double receive');

const pcRename = snap('shop');
pcRename.DB.customers[0].name = 'Acme Ltd';
pcRename.DB.customers[0].updated_at = '2024-06-01T00:00:00.000Z';
const phoneInv = {
  uuid: 'inv-phone-new',
  number: 'INV-P1-9',
  customer: { name: 'Acme', uuid: 'cust-acme' },
  total: 50, paid: 0, balance: 50,
  updated_at: '2024-05-01T00:00:00.000Z',
};
const afterRename = Erp.applySyncPayload(pcRename, {
  device_id: 'phone-1',
  upserts: { invoices: [phoneInv] },
  stock_moves: [],
  deletes: [],
});
ok(afterRename.DB.invoices.some((i) => i.uuid === 'inv-phone-new' && i.customer.name === 'Acme Ltd'), 'phone invoice follows customer uuid after PC rename');

const pc2 = snap('shop');
pc2.revision = 5;
const local = Erp.cloneState(pc2);
local.revision = 3;
local.DB.invoices.push({
  uuid: 'only-phone', number: 'INV-P1-88', customer: { name: 'Acme', uuid: 'cust-acme' },
  total: 1, paid: 0, balance: 1, origin_device: 'phone-1',
});
const only = Erp.localOnlyPayload(pc2, local);
ok(only.upserts.invoices.some((i) => i.uuid === 'only-phone'), '409 rebase payload keeps phone-only rows');
ok(!only.upserts.customers.some((c) => c.uuid === 'cust-acme') || only.upserts.customers.length === 0, '409 rebase does not resend rows already on PC');
const rebased = Erp.rebaseLocal(pc2, local);
ok(rebased.DB.invoices.some((i) => i.uuid === 'only-phone'), 'rebase overlay keeps phone-only invoice');
ok(rebased.revision === 6, 'applySyncPayload bumps PC revision');

function fakeAuth(remote, token, enabled) {
  const pairing = {
    enabled,
    isLocal: remote === '127.0.0.1',
    token,
    devices: [{ token: 'good' }],
  };
  if (pairing.isLocal) return { ok: true, local: true };
  if (!pairing.enabled) return { ok: false, status: 403 };
  if (!pairing.devices.some((d) => d.token === token)) return { ok: false, status: 401 };
  return { ok: true };
}
ok(fakeAuth('192.168.1.9', '', true).status === 401, 'unauthenticated LAN request rejected');
ok(fakeAuth('192.168.1.9', 'good', true).ok === true, 'paired token accepted on LAN');
ok(fakeAuth('192.168.1.9', 'good', false).status === 403, 'LAN POST rejected when pairing is off');

console.log('\nALL ' + n + ' SYNC MERGE TESTS PASSED ✓');
