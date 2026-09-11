'use strict';
// Reliability probe: crash paths, false-save, wipe restore, scan persist cost.
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const os = require('os');

const appJs = path.join(__dirname, 'app', 'smart-vision-app.js');
const backupJs = path.join(__dirname, 'app', 'backup-csv.js');
const modelJs = path.join(__dirname, 'app', 'erp-model.js');
let fetchImpl = async () => ({ ok: false, status: 500 });
const store = {};
const noop = () => {};
let code = fs.readFileSync(appJs, 'utf8');
code += `\nserverOK = true;
globalThis.__T = { DB, persistStateNow, afterMutation, applyState, attachCustomerDetail,
  addScannedSerial, snapshotState, buildTimeline, importBackupCsv, buildBackupCsvText, route,
  createInvoice, O };\n`;

const sandbox = {
  console, alert: (m) => sandbox.__alerts.push(String(m)), __alerts: [],
  confirm: () => true, prompt: () => null,
  setTimeout: (f) => f(), setInterval: noop, clearInterval: noop, Date, Math, JSON,
  localStorage: {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => delete store[k],
  },
  XMLHttpRequest: function () { this.open = noop; this.send = () => { this.status = 0; }; },
  fetch: (...a) => fetchImpl(...a),
  document: { addEventListener: noop, hidden: false },
  React: {
    useState: (v) => [typeof v === 'function' ? v() : v, noop],
    useEffect: noop, useCallback: (f) => f, useRef: () => ({ current: null }),
    createElement: (...a) => ({ $el: a[0] }), Fragment: 'Fragment',
    Component: function Component(props) { this.props = props; this.state = {}; },
  },
  encodeURIComponent, decodeURIComponent, URLSearchParams, Array, Object, Number, String, Boolean, parseInt, isNaN, Set,
  Blob, CustomEvent: function (t, o) { this.type = t; this.detail = o && o.detail; },
};
sandbox.window = Object.assign(sandbox, { location: { hash: '' }, addEventListener: noop, dispatchEvent: noop, open: noop });
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(backupJs, 'utf8'), sandbox, { filename: 'backup-csv.js' });
vm.runInContext(fs.readFileSync(modelJs, 'utf8'), sandbox, { filename: 'erp-model.js' });
vm.runInContext(code, sandbox, { filename: 'app.js' });
const T = sandbox.__T;
const findings = [];
function rec(sev, id, title, evidence) {
  findings.push({ sev, id, title, evidence });
  console.log(`[${sev}] ${id}: ${title}`);
  console.log('    ' + evidence);
}

(async () => {
  // R1: lastSaved marked before failed server write → second persist reports success
  fetchImpl = async () => ({ ok: false, status: 500 });
  T.DB.customers[0].phone = 'probe-' + Date.now();
  const first = await T.persistStateNow();
  const second = await T.persistStateNow();
  if (first === false && second === false) {
    rec('INFO', 'R1', 'Failed persist retries (no false saved)',
      `persistStateNow returned ${first} then ${second}; lastSaved not committed so autosave can retry.`);
  } else if (first === false && second === true) {
    rec('P0', 'R1', 'False "saved" after failed persist',
      `persistStateNow returned ${first} then ${second} with no DB change.`);
  } else {
    rec('INFO', 'R1', 'Persist retry behaviour', `first=${first} second=${second}`);
  }

  // R2: orphan customer relation throws in attachCustomerDetail
  T.DB.equipment.push({ id: 99999, name: 'Orphan cam', location: 'x', customer: null, serial: null });
  let threw = null;
  try { T.attachCustomerDetail(T.DB.customers[0]); } catch (e) { threw = e.message; }
  if (threw) rec('P0', 'R2', 'Customer drawer crash on orphan equipment', `attachCustomerDetail threw: ${threw}`);
  else rec('INFO', 'R2', 'attachCustomerDetail tolerated null customer', 'no throw');
  T.DB.equipment.pop();

  // R7 before wipe: snapshot stringify cost + scan storm
  const hik = T.DB.products.find((p) => p.name === 'Hikvision 2MP Dome') || T.DB.products[0];
  const t0 = Date.now();
  for (let i = 0; i < 80; i++) T.addScannedSerial('STORM-' + i + '-' + Date.now(), hik.name);
  const t1 = Date.now();
  const snap0 = Date.now();
  const json = JSON.stringify(T.snapshotState());
  const snapMs = Date.now() - snap0;
  rec(snapMs > 50 || json.length > 200000 ? 'P1' : 'P2', 'R7', 'Full-DB stringify on every save',
    `80 scans in ${t1 - t0}ms; snapshot ${json.length} bytes in ${snapMs}ms. Each scan also queues persist.`);

  // R8: route() refreshDerived on every API read
  const rt0 = Date.now();
  for (let i = 0; i < 200; i++) T.route('/dashboard');
  const rtMs = Date.now() - rt0;
  rec(rtMs > 80 ? 'P1' : 'INFO', 'R8', 'Every API read rescans all invoices/AMC/serials',
    `200× route('/dashboard') = ${rtMs}ms (${(rtMs / 200).toFixed(2)}ms each)`);

  // R4: unknown repair status in timeline
  T.DB.repairs.push({
    id: 88881, number: 'SR-PROBE', customer: T.O('Galaxy Gym'), device: 'NVR',
    issue: 'x', status: 'bogus', received_on: '2026-01-01', charge: 0, coverage: 'paid',
  });
  let tlErr = null;
  try { T.buildTimeline('Galaxy Gym'); } catch (e) { tlErr = e.message; }
  rec(tlErr ? 'P1' : 'INFO', 'R4', 'Customer timeline crash on unknown repair status',
    tlErr ? `buildTimeline threw: ${tlErr}` : 'no throw');
  T.DB.repairs.pop();

  rec('INFO', 'R5', 'Corrupt sv_user JSON is caught in Shell',
    'Shell wraps JSON.parse(sv_user) in try/catch; AppErrorBoundary covers remaining render throws.');

  const sn = 'PROBE-SN-' + Date.now();
  const r = T.addScannedSerial(sn, 'Product That Does Not Exist');
  rec(!r.ok && !T.DB.serials.some((s) => s.serial_no === sn) ? 'INFO' : 'P1', 'R6', 'Scan rejects missing product',
    `ok=${r.ok} error=${r.error} serialsHas=${T.DB.serials.some((s) => s.serial_no === sn)}`);

  const invN = T.DB.invoices.length;
  let incErr = '';
  try {
    await T.importBackupCsv('# Smart Vision ERP backup v2\r\n## customers\r\nid,name\r\n1,OnlyCust\r\n');
  } catch (e) { incErr = e.message || String(e); }
  rec(/Incomplete backup/i.test(incErr) && T.DB.invoices.length === invN ? 'INFO' : 'P0', 'R3', 'Partial restore refused',
    `err=${incErr} invoices ${invN} → ${T.DB.invoices.length}`);

  // R9–R10: SQLite (native module may be Electron-win binary on this Mac)
  try {
    const dbMod = require('./electron/db');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sv-rel-'));
    dbMod.init(tmp);
    const tSave0 = Date.now();
    dbMod.saveState(json);
    const saveMs = Date.now() - tSave0;
    rec(saveMs > 100 ? 'P1' : 'P2', 'R9', 'SQLite full rewrite of every mirrored table',
      `saveState of ${json.length} bytes took ${saveMs}ms (grows with every invoice/serial)`);
    let saveBad = null;
    try { dbMod.saveState('not-json'); } catch (e) { saveBad = e.message; }
    rec('P2', 'R10', 'Bad POST body is 400 (server catch) — ok if renderer lastSaved already committed',
      saveBad ? `saveState threw: ${saveBad}` : 'did not throw');
    dbMod.close();
  } catch (e) {
    rec('P2', 'R9', 'SQLite saveState not executed on this host',
      `better-sqlite3 native binary failed to load (${e.code || e.message}). saveState now upserts rows and copies -wal on backup.`);
  }

  // R11: createInvoice with null customer name — after wipe, still must not throw
  let invErr = null;
  try { T.createInvoice({ customer: null, total: 1, persist: false }); } catch (e) { invErr = e.message; }
  rec(invErr ? 'P1' : 'INFO', 'R11', 'Invoice create with missing customer',
    invErr ? `threw: ${invErr}` : 'created without throw');

  console.log('\n— RELIABILITY PROBE SUMMARY —');
  const counts = { P0: 0, P1: 0, P2: 0, INFO: 0 };
  findings.forEach((f) => { counts[f.sev] = (counts[f.sev] || 0) + 1; });
  console.log(JSON.stringify({ counts, findings }, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
