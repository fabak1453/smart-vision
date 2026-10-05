// Camera barcode / QR scanning (app/scanner.js) and its wiring in the app and the APK.
// Real decodes: a Code 128 serial label (fixture) and a pairing QR, clean and with noise.
// node test-scanner.js
'use strict';
const fs = require('fs');
const path = require('path');
const Z = require('@zxing/library');
const S = require('./app/scanner.js');

let n = 0;
const ok = (cond, msg) => { n++; if (!cond) { console.error('  ✗ FAIL:', msg); process.exit(1); } console.log('  ✓', msg); };
const read = (p) => fs.readFileSync(path.join(__dirname, p), 'utf8');
console.log('— scanner suite —');

/* deterministic noise, so a failure is reproducible */
let seed = 42;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
function frame(w, h, paint, noise) {
  const g = new Uint8ClampedArray(w * h).fill(205);
  paint(g, w, h);
  if (noise) for (let i = 0; i < g.length; i++) g[i] = Math.max(0, Math.min(255, g[i] + (rnd() - 0.5) * noise));
  return g;
}
const fx = JSON.parse(read('test-fixtures/code128-serial.json'));
const barcodeWidth = fx.runs.reduce((a, b) => a + b, 0);
const paintCode128 = (g, w, h) => {
  const x0 = Math.floor((w - barcodeWidth) / 2); const y0 = Math.floor(h * 0.3); const y1 = Math.floor(h * 0.7);
  let x = x0; let dark = fx.startsDark;
  for (const r of fx.runs) { for (let i = 0; i < r; i++, x++) for (let y = y0; y < y1; y++) g[y * w + x] = dark ? 25 : 245; dark = !dark; }
};
const qrText = JSON.stringify({ url: 'http://192.168.1.10:51732', pairingPin: '123456', revision: 0 });
const qr = new Z.QRCodeWriter().encode(qrText, Z.BarcodeFormat.QR_CODE, 0, 0, new Map());
const paintQr = (g, w, h) => {
  const m = qr.getWidth(); const s = Math.floor(Math.min(w, h) * 0.6 / m); const ox = Math.floor((w - m * s) / 2); const oy = Math.floor((h - m * s) / 2);
  for (let y = 0; y < m * s + 8 * s; y++) for (let x = 0; x < m * s + 8 * s; x++) {
    const X = ox - 4 * s + x; const Y = oy - 4 * s + y; if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
    const mx = Math.floor((x - 4 * s) / s); const my = Math.floor((y - 4 * s) / s);
    g[Y * w + X] = mx >= 0 && my >= 0 && mx < m && my < m && qr.get(mx, my) ? 20 : 245;
  }
};

const logged = []; const ce = console.error; console.error = (...a) => logged.push(a.join(' '));
const decode = S.makeZxingDecoder(Z);
const W = 960; const H = 540;
const r1 = decode(frame(W, H, paintCode128, 0), W, H);
const r2 = decode(frame(W, H, paintCode128, 60), W, H);
const r3 = decode(frame(W, H, paintQr, 0), W, H);
const r4 = decode(frame(W, H, paintQr, 60), W, H);
const r5 = decode(frame(W, H, () => {}, 40), W, H);
console.error = ce;
ok(r1 === fx.text, 'reads a Code 128 serial label: ' + r1);
ok(r2 === fx.text, 'still reads it with camera noise');
ok(r3 === qrText, 'reads the shop PC pairing QR');
ok(r4 === qrText, 'still reads the QR with camera noise');
ok(r5 === null, 'an empty frame reads as nothing (never a wrong code)');
ok(logged.length === 0, 'decoding is silent: no console errors per frame (the all-format reader logged one per format)');

/* behaviour */
const acc = S.makeDedupe(2500);
ok(acc('SN1', 0) && !acc('SN1', 1000) && acc('SN2', 1100) && acc('SN1', 4000), 'the same code within 2.5 s counts once; a different code counts at once');
ok(S.normalize('  SN-0099\r\n') === 'SN-0099' && S.normalize('\u0002AB\u0003') === 'AB', 'scanner control characters and spaces are stripped');
ok(/Permissions → Camera/.test(S.cameraErrorMessage({ name: 'NotAllowedError' })) && /No camera/.test(S.cameraErrorMessage({ name: 'NotFoundError' })),
  'camera errors explain what to do (permission off, no camera)');
const gray = S.toGray(new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255]), 2, 1);
ok(gray[0] >= 254 && gray[1] === 0, 'RGBA → gray conversion');

/* wiring */
const js = read('app/smart-vision-app.js');
ok(/function CameraScanner\(/.test(js) && /onCameraCode/.test(js) && /addScannedSerial\(sn, product\)/.test(js), "'Scan to add serial' adds every camera read as an in-stock serial");
ok(/function ScanOnceHost\(/.test(js) && /window\.SV_SCAN_ONCE = /.test(js) && /\(0, _jsx\)|React\.createElement\(ScanOnceHost/.test(js), 'one-shot scanner (pairing QR) is mounted in the app');
ok(/SV_SCAN_ONCE/.test(read('apk/apk-bridge.js')) && !/^\s*const v = typeof prompt === 'function' \? prompt\('Serial \/ barcode'\) : '';\s*return v \|\| '';\s*\};/m.test(read('apk/apk-bridge.js').split('SV_SCAN_ONCE')[0]),
  'APK: "Use camera" / "Scan QR" open the camera instead of a typing prompt (no native plugin installed)');
const manifest = read('apk/android/app/src/main/AndroidManifest.xml');
ok(/android\.permission\.CAMERA/.test(manifest) && /android\.hardware\.camera" android:required="false"/.test(manifest), 'Android: camera permission declared; phones without a camera can still install');
const html = read('app/erp.html');
ok(html.indexOf('scanner.js') > 0 && html.indexOf('scanner.js') < html.indexOf('erp-model.js') && html.includes('<script src="./erp-model.js"></script>'), 'erp.html loads scanner.js (before erp-model.js, where APK sync hooks in)');
ok(read('scripts/prepare-app.js').includes("'zxing.min.js'") && fs.existsSync(path.join(__dirname, 'node_modules/@zxing/library/umd/index.min.js')), 'ZXing is bundled for offline use by prepare-app');
ok(JSON.parse(read('package.json')).dependencies['@zxing/library'] === '0.23.0', 'ZXing version is pinned (0.23.0)');
console.log('\nALL ' + n + ' SCANNER TESTS PASSED ✓');
