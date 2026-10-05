/* ============================================================================
   Smart Vision ERP — camera barcode / QR scanning (SvScan)
   ----------------------------------------------------------------------------
   Works in the Android APK (WebView camera), a tablet browser and a PC webcam.
   No native plugin: the camera comes from getUserMedia and frames are decoded
   by the browser's BarcodeDetector where it exists, otherwise by ZXing
   (app/vendor/zxing.min.js, loaded only when a scanner opens).
   Serial labels on CCTV gear are mostly Code 128; QR, Data Matrix, Code 39,
   EAN/UPC and ITF are read too.
   ========================================================================== */
(function (g) {
  'use strict';

  const FORMATS = ['CODE_128', 'CODE_39', 'CODE_93', 'QR_CODE', 'DATA_MATRIX', 'EAN_13', 'EAN_8', 'UPC_A', 'UPC_E', 'ITF'];
  const DETECTOR_FORMATS = ['code_128', 'code_39', 'code_93', 'qr_code', 'data_matrix', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'itf'];

  /** Clean what a scanner returns: no control characters, no surrounding space. */
  function normalize(text) {
    return String(text == null ? '' : text).replace(/[\u0000-\u001f\u007f]/g, '').trim();
  }

  /**
   * Ignore the same code seen again within `windowMs` — a camera sees a label
   * many times a second; it must count once.
   */
  function makeDedupe(windowMs) {
    const seen = new Map();
    const win = windowMs == null ? 2500 : windowMs;
    return function accept(code, now) {
      const t = now == null ? Date.now() : now;
      const last = seen.get(code);
      seen.set(code, t);
      return last == null || t - last > win;
    };
  }

  /**
   * ZXing decoder for a grayscale frame (Uint8ClampedArray, one byte per pixel).
   * Uses only the readers this app needs — 1D barcodes first (serial labels), then
   * QR, then Data Matrix. (The all-format reader also tried Aztec / PDF417 /
   * MaxiCode and logged an error for each, on every frame.) A second binarizer
   * pass rescues blurry or unevenly lit frames.
   */
  function makeZxingDecoder(Z) {
    const hints = new Map();
    const oneD = ['CODE_128', 'CODE_39', 'CODE_93', 'EAN_13', 'EAN_8', 'UPC_A', 'UPC_E', 'ITF'].map((f) => Z.BarcodeFormat[f]).filter((x) => x != null);
    hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, oneD);
    hints.set(Z.DecodeHintType.TRY_HARDER, true);
    const readers = [new Z.MultiFormatOneDReader(hints), new Z.QRCodeReader(), new Z.DataMatrixReader()];
    const binarizers = [(src) => new Z.HybridBinarizer(src), (src) => new Z.GlobalHistogramBinarizer(src)];
    return function decodeGray(gray, width, height) {
      const src = new Z.RGBLuminanceSource(gray, width, height);
      for (const bin of binarizers) {
        const bitmap = new Z.BinaryBitmap(bin(src));
        for (const r of readers) {
          try {
            const res = r.decode(bitmap, r instanceof Z.MultiFormatOneDReader ? hints : undefined);
            if (res && res.getText()) return normalize(res.getText());
          } catch (e) { /* not in this frame */ } finally { try { r.reset(); } catch (e2) { /* ignore */ } }
        }
      }
      return null;
    };
  }

  /** RGBA pixels → one gray byte per pixel. */
  function toGray(rgba, width, height) {
    const out = new Uint8ClampedArray(width * height);
    for (let i = 0, j = 0; j < out.length; i += 4, j++) {
      out[j] = (rgba[i] * 77 + rgba[i + 1] * 150 + rgba[i + 2] * 29) >> 8;
    }
    return out;
  }

  let zxingPromise = null;
  /** Load ZXing once, on demand (it is ~360 KB). */
  function loadZxing(src) {
    if (g.ZXing) return Promise.resolve(g.ZXing);
    if (zxingPromise) return zxingPromise;
    zxingPromise = new Promise((resolve, reject) => {
      if (typeof document === 'undefined') { reject(new Error('No document')); return; }
      const s = document.createElement('script');
      s.src = src || './vendor/zxing.min.js';
      s.onload = () => (g.ZXing ? resolve(g.ZXing) : reject(new Error('Barcode reader failed to load')));
      s.onerror = () => { zxingPromise = null; reject(new Error('Barcode reader failed to load')); };
      document.head.appendChild(s);
    });
    return zxingPromise;
  }

  /** A user-facing message for a camera error. */
  function cameraErrorMessage(err) {
    const name = err && err.name;
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      return 'Camera permission is off. Allow the camera for this app (Android: Settings → Apps → Smart Vision ERP → Permissions → Camera), then try again.';
    }
    if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No camera found on this device. Type the serial or use a USB scanner instead.';
    if (name === 'NotReadableError') return 'The camera is in use by another app. Close it and try again.';
    if (typeof navigator !== 'undefined' && !(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
      return 'This screen has no camera access. Use the Android app, or open the app over https / on this PC.';
    }
    return 'Could not start the camera: ' + ((err && err.message) || 'unknown error');
  }

  /**
   * Start scanning a <video>. onCode(text) is called for every new code
   * (duplicates within 2.5 s ignored). Returns { stop, torch(on), hasTorch }.
   */
  async function start(video, onCode, opts) {
    const o = opts || {};
    if (!(typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
      throw Object.assign(new Error('No camera access'), { name: 'NoMediaDevices' });
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
    });
    video.srcObject = stream;
    video.setAttribute('playsinline', '');
    video.muted = true;
    await video.play().catch(() => {});
    const track = stream.getVideoTracks()[0];
    const caps = track && track.getCapabilities ? track.getCapabilities() : {};
    let stopped = false;
    let detector = null;
    if (!o.forceZxing && typeof g.BarcodeDetector === 'function') {
      try {
        const supported = await g.BarcodeDetector.getSupportedFormats();
        const want = DETECTOR_FORMATS.filter((f) => supported.includes(f));
        if (want.length) detector = new g.BarcodeDetector({ formats: want });
      } catch (e) { detector = null; }
    }
    const decodeGray = detector ? null : makeZxingDecoder(await loadZxing(o.zxingSrc));
    const accept = makeDedupe(o.dedupeMs);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const tick = async () => {
      if (stopped) return;
      try {
        if (video.readyState >= 2 && video.videoWidth) {
          let text = null;
          if (detector) {
            const found = await detector.detect(video);
            text = found && found[0] ? normalize(found[0].rawValue) : null;
          } else {
            // Decode the middle of the frame, scaled down: faster, and it is where the label is aimed.
            const vw = video.videoWidth; const vh = video.videoHeight;
            const cw = Math.round(vw * 0.9); const ch = Math.round(vh * 0.6);
            const scale = Math.min(1, 960 / cw);
            canvas.width = Math.round(cw * scale); canvas.height = Math.round(ch * scale);
            ctx.drawImage(video, (vw - cw) / 2, (vh - ch) / 2, cw, ch, 0, 0, canvas.width, canvas.height);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            text = decodeGray(toGray(img.data, canvas.width, canvas.height), canvas.width, canvas.height);
          }
          if (text && accept(text)) onCode(text);
        }
      } catch (e) { /* a bad frame — keep going */ }
      if (!stopped) setTimeout(tick, o.intervalMs || 120);
    };
    setTimeout(tick, 200);

    return {
      engine: detector ? 'BarcodeDetector' : 'ZXing',
      hasTorch: !!(caps && caps.torch),
      torch(on) { try { return track.applyConstraints({ advanced: [{ torch: !!on }] }); } catch (e) { return Promise.resolve(); } },
      stop() {
        stopped = true;
        try { stream.getTracks().forEach((t) => t.stop()); } catch (e) { /* ignore */ }
        try { video.srcObject = null; } catch (e) { /* ignore */ }
      },
    };
  }

  /** Short beep + vibration so the user knows a code was read without looking. */
  function feedback(ok) {
    try { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(ok === false ? [40, 60, 40] : 60); } catch (e) { /* ignore */ }
    try {
      const AC = g.AudioContext || g.webkitAudioContext;
      if (!AC) return;
      const ac = feedback.ac || (feedback.ac = new AC());
      const o = ac.createOscillator(); const gn = ac.createGain();
      o.frequency.value = ok === false ? 320 : 1250; gn.gain.value = 0.08;
      o.connect(gn); gn.connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.09);
    } catch (e) { /* ignore */ }
  }

  const api = { FORMATS, normalize, makeDedupe, makeZxingDecoder, toGray, loadZxing, cameraErrorMessage, start, feedback };
  g.SvScan = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
