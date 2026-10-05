// Covers the paths the September build shipped broken:
//   - a phone / tablet BROWSER working on the shop PC's live data (/api.php)
//   - a product reached through a serial number surviving the search cut-off
//   - the APK's LAN transport (native HTTP instead of blocked mixed content)
//   - the Android resources the APK build needs to exist
'use strict';
const vm = require('vm');
const fs = require('fs');
const os = require('os');
const path = require('path');

let n = 0;
const ok = (cond, msg) => {
  n++;
  if (!cond) { console.error('  ✗ FAIL:', msg); process.exit(1); }
  console.log('  ✓', msg);
};

/* ------------------------------------------------------------------ app sandbox */
const appJs = path.join(__dirname, 'app', 'smart-vision-app.js');
let code = fs.readFileSync(appJs, 'utf8');
code += `\nglobalThis.__T = { DB, ENTITIES, searchPayload, productSerialRows, findProductByRef,
  lanFetch, dataApiHeaders, getLanPin, setLanPin, flagLanAuth, nativeHttp, O, nextId };\n`;

const noop = () => {};
const store = {};
const calls = { fetch: [], native: [] };
const sandbox = {
  console, alert: noop, confirm: () => true, prompt: () => null,
  setTimeout: (f) => f(), clearTimeout: noop, setInterval: noop, clearInterval: noop,
  Date, Math, JSON, Promise,
  localStorage: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  },
  XMLHttpRequest: function () { this.open = noop; this.send = () => { this.status = 0; }; },
  fetch: async (url, opts) => { calls.fetch.push({ url, opts }); return { ok: true, status: 200, text: async () => '', json: async () => ({}) }; },
  document: { addEventListener: noop, removeEventListener: noop, hidden: false, createElement: () => ({ style: {}, click: noop, remove: noop, appendChild: noop }), body: { appendChild: noop } },
  React: {
    useState: (v) => [typeof v === 'function' ? v() : v, noop], useEffect: noop,
    useCallback: (f) => f, useRef: () => ({ current: null }),
    createElement: (...a) => ({ $el: a[0] }), Fragment: 'Fragment',
    Component: function Component(props) { this.props = props; this.state = {}; },
  },
  encodeURIComponent, decodeURIComponent, URLSearchParams, AbortController,
  Array, Object, Number, String, Boolean, parseInt, isNaN, Set, Map, Blob, Error, CustomEvent: function (t, o) { this.type = t; this.detail = o && o.detail; },
};
sandbox.window = Object.assign(sandbox, { location: { hash: '', reload: noop }, addEventListener: noop, removeEventListener: noop, dispatchEvent: noop, open: noop });
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'app', 'backup-csv.js'), 'utf8'), sandbox, { filename: 'backup-csv.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'app', 'erp-model.js'), 'utf8'), sandbox, { filename: 'erp-model.js' });
vm.runInContext(code, sandbox, { filename: 'app.js' });
const T = sandbox.__T;
const DB = T.DB;

async function main() {
console.log('— LAN access / serial search suite —');

/* --------------------------------------------- 1. serial beats a crowd of SKU matches */
for (let i = 1; i <= 26; i++) {
  T.ENTITIES.product.create({
    sku: 'CAM-0099-' + String(i).padStart(3, '0'), name: 'Bullet Camera ' + i,
    specs: 'batch 0099', category: 'Cameras', purchase_price: 1000, sale_price: 1500,
    stock: 5, reorder_level: 1, track_serials: 'Yes',
  });
}
T.ENTITIES.product.create({
  sku: 'NVR-PRO-8', name: 'NVR Pro 8 Channel', specs: '8ch POE', category: 'Recorders',
  purchase_price: 8000, sale_price: 11000, stock: 3, reorder_level: 1, track_serials: 'Yes',
});
T.ENTITIES.serial.create({ serial_no: 'SN-A7-0099', product: 'NVR Pro 8 Channel', status: 'in_stock' });

const crowded = T.searchPayload('0099').results;
ok(crowded.products.some((p) => p.sku === 'NVR-PRO-8'),
  'partial serial still returns its product when 26 SKUs also match');
ok(crowded.products[0].sku === 'NVR-PRO-8',
  'the serial-matched product is first, not buried under text matches');
ok((crowded.products[0].matched_serials || []).indexOf('SN-A7-0099') >= 0,
  'the matched serial is shown on the product row');

const exact = T.searchPayload('SN-A7-0099').results;
ok(exact.products.length && exact.products[0].sku === 'NVR-PRO-8', 'exact serial resolves to the product');
ok(exact.serials.some((s) => s.serial_no === 'SN-A7-0099'), 'the serial itself is still listed');

/* --------------------------------------------- 2. serial referenced by SKU resolves */
const nvr = DB.products.find((p) => p.sku === 'NVR-PRO-8');
DB.serials.push({ id: T.nextId(DB.serials), serial_no: 'SKUREF-001', product: T.O(nvr.sku), customer: null, status: 'in_stock' });
ok(T.findProductByRef(T.O(nvr.sku)) === nvr, 'findProductByRef resolves a SKU reference to the product');
ok(T.searchPayload('SKUREF-001').results.products.some((p) => p.sku === 'NVR-PRO-8'),
  'a serial stored against a SKU still finds its product');
ok(T.productSerialRows(nvr).some((s) => s.serial_no === 'SKUREF-001'),
  'the product drawer lists a SKU-referenced serial');

/* --------------------------------------------- 3. shop PIN travels with the data API */
T.setLanPin('');
ok(T.dataApiHeaders()['X-SV-PIN'] === undefined, 'no PIN header before a PIN is entered');
T.setLanPin('424242');
ok(T.dataApiHeaders()['X-SV-PIN'] === '424242', 'the shop PIN is sent to /api.php once entered');
ok(T.dataApiHeaders({ 'Content-Type': 'application/json' })['Content-Type'] === 'application/json',
  'other headers survive alongside the PIN');
T.setLanPin('');

/* --------------------------------------------- 4. LAN transport */
calls.fetch.length = 0;
ok(T.nativeHttp() === null, 'outside the APK there is no native HTTP plugin');
await (T.lanFetch('http://192.168.1.10:51732/api/status'));
ok(calls.fetch.length === 1, 'without Capacitor the LAN call uses plain fetch');

sandbox.window.Capacitor = {
  Plugins: {
    CapacitorHttp: {
      request: async (o) => { calls.native.push(o); return { status: 200, data: '{"ok":true,"enabled":true}' }; },
    },
  },
};
calls.fetch.length = 0;
const nativeRes = await T.lanFetch('http://192.168.1.10:51732/api/status');
const lanViaFetch = () => calls.fetch.filter((c) => /^https?:/i.test(String(c.url))).length;
ok(calls.native.length === 1 && lanViaFetch() === 0,
  'inside the APK the LAN call goes native, bypassing the mixed-content block');
ok(calls.native[0].url === 'http://192.168.1.10:51732/api/status', 'the native call keeps the plain-http shop URL');
ok(nativeRes.ok === true && nativeRes.status === 200, 'a native response looks like a fetch response');

calls.native.length = 0;
calls.fetch.length = 0;
await (T.lanFetch('./api.php?t=1'));
ok(calls.fetch.length >= 1 && calls.native.length === 0,
  'same-origin calls are never routed through native HTTP');
delete sandbox.window.Capacitor;

/* --------------------------------------------- 5. server-side LAN data auth */
const pairing = require('./electron/pairing.js');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sv-lan-'));
pairing.init(tmp);
pairing.setEnabled(true);
const PIN = pairing.status().pin;
const lan = (headers, method) => ({ url: '/api.php', method: method || 'GET', headers: headers || {}, socket: { remoteAddress: '192.168.1.55' } });
const loop = (method) => ({ url: '/api.php', method: method || 'GET', headers: {}, socket: { remoteAddress: '127.0.0.1' } });
const paired = pairing.pair(PIN, 'tablet-test');

ok(pairing.requireDataAuth(loop()).write === true, 'the shop PC itself keeps full access');
ok(pairing.requireDataAuth(lan()).status === 401, 'a LAN browser with no PIN is refused');
ok(pairing.requireDataAuth(lan({ 'x-sv-pin': PIN })).ok === true,
  'a LAN browser with the right PIN can read the live data');
ok(pairing.requireDataAuth(lan({ 'x-sv-pin': PIN }, 'POST')).write === true,
  'a LAN browser with the right PIN can save back to the shop PC');
ok(pairing.requireDataAuth(lan({ 'x-sv-pin': '000000' })).status === 401, 'a wrong PIN is refused');
ok(pairing.requireDataAuth(lan({ authorization: 'Bearer ' + paired.device.token })).ok === true,
  'a paired APK may read the snapshot');
ok(pairing.requireDataAuth(lan({ authorization: 'Bearer ' + paired.device.token })).write === false,
  'a paired APK may NOT overwrite the shop snapshot (it must merge via /api/sync)');
pairing.setEnabled(false);
ok(pairing.requireDataAuth(lan({ 'x-sv-pin': PIN })).status === 403,
  'everything is refused while Wi-Fi sharing is off');

/* --------------------------------------------- 6. Android resources the build needs */
const resXml = path.join(__dirname, 'apk', 'android', 'app', 'src', 'main', 'res', 'xml');
const manifest = fs.readFileSync(path.join(__dirname, 'apk', 'android', 'app', 'src', 'main', 'AndroidManifest.xml'), 'utf8');
const refs = (manifest.match(/@xml\/([a-z_]+)/g) || []).map((s) => s.replace('@xml/', ''));
ok(refs.length > 0, 'the manifest references @xml resources');
refs.forEach((r) => ok(fs.existsSync(path.join(resXml, r + '.xml')), 'res/xml/' + r + '.xml exists (APK build would fail without it)'));
ok(/usesCleartextTraffic="true"/.test(manifest), 'cleartext HTTP to the shop PC is permitted');

console.log('\nALL ' + n + ' LAN ACCESS TESTS PASSED ✓');
}

main().catch((e) => { console.error('  ✗ FAIL:', e && e.message ? e.message : e); process.exit(1); });
