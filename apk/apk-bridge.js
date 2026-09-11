'use strict';
/**
 * Android / Capacitor bridge: barcode scan + pairing QR.
 * Copied into apk/www by scripts/sync-web.js — not loaded by the Windows app.
 */
(function () {
  window.SV_APK = window.SV_APK || {};
  window.SV_APK.scanBarcode = async function () {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.BarcodeScanner) {
      const r = await window.Capacitor.Plugins.BarcodeScanner.scan();
      return (r && (r.content || r.rawValue || r.text)) || '';
    }
    const v = typeof prompt === 'function' ? prompt('Serial / barcode') : '';
    return v || '';
  };
  window.SV_APK.scanPairingQr = async function () {
    const raw = await window.SV_APK.scanBarcode();
    if (!raw) return null;
    try {
      const o = JSON.parse(raw);
      if (o && o.url) return o;
    } catch (e) { /* not JSON — treat as URL */ }
    if (/^https?:\/\//i.test(raw)) return { url: raw, pairingPin: '' };
    return null;
  };
})();
