// "Send bill": the Android app makes the PDF itself and opens the share sheet; the
// Windows app keeps using the shop PC. (Before 9.8.0 every WhatsApp button on the
// phone called /api/whatsapp/send, which doesn't exist inside the phone app.)
// node test-send-bill.js
'use strict';
const vm = require('vm');
const fs = require('fs');
const path = require('path');

let n = 0;
const ok = (cond, msg) => { n++; if (!cond) { console.error('  ✗ FAIL:', msg); process.exit(1); } console.log('  ✓', msg); };
const read = (p) => fs.readFileSync(path.join(__dirname, p), 'utf8');
console.log('— send bill suite —');

/* ---------------------------------------------------------------- the share module */
const S = require('./app/bill-share.js');
ok(S.phoneDigits('98250 11223') === '919825011223' && S.phoneDigits('+91 98250-11223') === '919825011223' && S.phoneDigits('') === '',
  'mobile numbers become 91XXXXXXXXXX');
ok(S.safeFileName('invoice-INV/2001 (copy).pdf') === 'invoice-INV_2001_copy_.pdf', 'file names are made safe');

function sandbox(apk) {
  const noop = () => {};
  const store = {}; const fetches = []; const opened = []; const alerts = [];
  const writes = []; const shares = [];
  const sb = {
    console: { log: noop, warn: noop, error: noop }, alert: (m) => alerts.push(String(m)), confirm: () => true, prompt: () => null,
    setTimeout: (f) => f(), clearTimeout: noop, setInterval: noop, clearInterval: noop, Date, Math, JSON, Promise,
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } },
    XMLHttpRequest: function () { this.open = noop; this.send = () => { this.status = 0; }; },
    fetch: async (url, o) => { fetches.push({ url: String(url), body: o && o.body }); return { ok: true, status: 200, json: async () => ({ ok: true, phone: '919825011223', whatsappWebUrl: 'https://web.whatsapp.com/send?phone=919825011223&text=x', pdfUrl: '/api/whatsapp/document/abc.html', filename: 'invoice-INV-2001.pdf' }), text: async () => '' }; },
    document: { addEventListener: noop, removeEventListener: noop, hidden: false, createElement: () => ({ click: noop, remove: noop }), body: { appendChild: noop } },
    React: { useState: (v) => [typeof v === 'function' ? v() : v, noop], useEffect: noop, useCallback: (f) => f, useRef: () => ({ current: null }),
      createElement: (...a) => ({ $el: a[0] }), Fragment: 'Fragment', Component: function C(p) { this.props = p; this.state = {}; } },
    encodeURIComponent, decodeURIComponent, URLSearchParams, AbortController,
    Array, Object, Number, String, Boolean, parseInt, isNaN, Set, Map, Blob, Error,
    CustomEvent: function (t, o) { this.detail = o && o.detail; }, crypto: require('crypto').webcrypto,
  };
  sb.window = Object.assign(sb, { location: { hash: '', reload: noop, origin: 'http://127.0.0.1:5000' }, addEventListener: noop, removeEventListener: noop, dispatchEvent: noop,
    open: (u) => opened.push(String(u)) });
  if (apk) {
    sb.Capacitor = { Plugins: {
      Filesystem: { writeFile: async (o) => { writes.push(o); return { uri: 'file:///data/user/0/com.smartvision.erp/cache/' + o.path }; } },
      Share: { share: async (o) => { shares.push(o); return {}; } },
    } };
  }
  sb.globalThis = sb;
  vm.createContext(sb);
  for (const f of ['backup-csv.js', 'erp-model.js', 'bill-format.js', 'bill-share.js']) vm.runInContext(read('app/' + f), sb, { filename: f });
  // No canvas in Node: the PDF itself is made in the browser test; here it's a stub.
  sb.SvShare.pdfBase64 = async (html) => { sb.__lastHtml = html; return 'JVBERi0xLjQK'; };
  vm.runInContext(read('app/smart-vision-app.js') + '\nglobalThis.__T = { DB, sendBill, waSend, findCust };\n', sb, { filename: 'app.js' });
  return { sb, T: sb.__T, fetches, opened, alerts, writes, shares };
}

(async () => {
  /* ---------------------------------------------------------------- phone (APK) */
  const P = sandbox(true);
  const inv = P.T.DB.invoices[0];
  P.T.findCust(inv.customer.name).phone = '98250 11223';
  await P.T.sendBill('invoice', inv);
  ok(!P.fetches.some((f) => /api\/whatsapp/.test(f.url)), 'phone: does NOT call the shop-PC server (it is not inside the phone app)');
  ok(P.writes.length === 1 && P.writes[0].directory === 'CACHE' && P.writes[0].path === 'shared/invoice-' + inv.number + '.pdf' && P.writes[0].data === 'JVBERi0xLjQK',
    'phone: the PDF is saved in the app cache as invoice-' + inv.number + '.pdf');
  const sh = P.shares[0] || {};
  ok(P.shares.length === 1 && Array.isArray(sh.files) && /cache\/shared\/invoice-/.test(sh.files[0]), 'phone: the share sheet opens with that PDF attached');
  ok(/Please find your bill/.test(sh.text) && sh.text.includes(inv.number) && /Balance due/.test(sh.text), 'phone: with a ready message (bill number, total, balance)');
  ok(/Tax Invoice/.test(P.sb.__lastHtml) && P.sb.__lastHtml.includes(inv.number), 'phone: the PDF is made from the same bill layout as the print');
  await P.T.sendBill('quote', P.T.DB.quotes[0]);
  ok(P.shares.length === 2 && /quote-/.test(P.shares[1].files[0]) && /quotation/.test(P.shares[1].text), 'phone: quotations go the same way');
  await P.T.waSend({ customerName: inv.customer.name, message: 'Gentle reminder' });
  ok(P.opened.some((u) => u.startsWith('https://wa.me/919825011223?text=Gentle%20reminder')), 'phone: a reminder without a document opens WhatsApp for that number');
  const noPhone = sandbox(true);
  const inv2 = noPhone.T.DB.invoices[1];
  noPhone.T.findCust(inv2.customer.name).phone = '';
  await noPhone.T.waSend({ customerName: inv2.customer.name, message: 'x' });
  ok(noPhone.alerts.some((a) => /No mobile number/.test(a)) && !noPhone.opened.length, 'phone: no mobile number → a clear message instead of a broken link');
  const old = sandbox(true);
  delete old.sb.Capacitor.Plugins.Share;
  await old.T.sendBill('invoice', old.T.DB.invoices[0]);
  ok(old.opened.some((u) => u.startsWith('https://wa.me/')) && !old.shares.length, 'phone without the share plugin (old APK): falls back to WhatsApp with the text');

  /* ---------------------------------------------------------------- Windows app / browser */
  const D = sandbox(false);
  await D.T.sendBill('invoice', D.T.DB.invoices[0]);
  const f = D.fetches.find((x) => /api\/whatsapp\/send/.test(x.url));
  ok(f && JSON.parse(f.body).kind === 'invoice' && JSON.parse(f.body).doc.number === D.T.DB.invoices[0].number && /Please find your bill/.test(JSON.parse(f.body).message),
    'PC: sends through the shop PC, which makes the PDF (unchanged path)');

  /* ---------------------------------------------------------------- wiring */
  const jsx = read('app/smart-vision-app.jsx');
  ok(/onClick=\{\(\) => sendBill\('invoice', r\)\}>.*Send bill/.test(jsx), 'the bill drawer has a "Send bill" button');
  ok(/setMade\(justMade\)/.test(jsx) && /function BillSaved\(/.test(jsx), 'right after a bill is created: Send / Print / Done');
  const main = read('electron/main.js');
  ok(/shell\.showItemInFolder\(savedPath\)/.test(main), 'PC: the saved PDF is shown selected in its folder, ready to drag into WhatsApp');
  const html = read('app/erp.html');
  ok(html.indexOf('bill-share.js') > 0 && html.indexOf('bill-share.js') < html.indexOf('erp-model.js'), 'erp.html loads bill-share.js (before erp-model.js)');
  const apk = JSON.parse(read('apk/package.json'));
  ok(apk.dependencies['@capacitor/share'] && apk.dependencies['@capacitor/filesystem'], 'APK: Share + Filesystem plugins are dependencies (registered by npm run apk:sync)');
  ok(/jspdf\.umd\.min\.js/.test(read('scripts/prepare-app.js')) && /html2canvas\.min\.js/.test(read('scripts/prepare-app.js')), 'the PDF libraries are bundled offline');

  console.log('\nALL ' + n + ' SEND BILL TESTS PASSED ✓');
})().catch((e) => { console.error('  ✗ FAIL:', (e && e.stack) || e); process.exit(1); });
