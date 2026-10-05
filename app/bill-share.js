/* ============================================================================
   Smart Vision ERP — send a bill / quotation as a PDF
   ----------------------------------------------------------------------------
   • Android app (APK): the phone makes the PDF itself (no shop PC needed, works
     offline) and opens Android's share sheet (WhatsApp, Gmail, …) through the
     Capacitor Filesystem + Share plugins.
   • Windows app / browsers: unchanged, the shop PC makes the PDF
     (/api/whatsapp/send → Electron printToPDF).
   Before 9.8.0 the APK also called /api/whatsapp/send, which does not exist
   inside the phone app, so every WhatsApp button on the phone failed.
   Loaded as a plain script (window.SvShare); jsPDF and html2canvas load on demand.
   ========================================================================== */
(function (g) {
  'use strict';

  const loading = {};
  function loadScript(src, globalName) {
    if (g[globalName]) return Promise.resolve(g[globalName]);
    if (loading[src]) return loading[src];
    loading[src] = new Promise((resolve, reject) => {
      if (typeof document === 'undefined') { reject(new Error('No document')); return; }
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => (g[globalName] ? resolve(g[globalName]) : reject(new Error(globalName + ' failed to load')));
      s.onerror = () => { delete loading[src]; reject(new Error('Could not load ' + src)); };
      document.head.appendChild(s);
    });
    return loading[src];
  }

  /** Indian mobile number → 91XXXXXXXXXX (the same rule the shop PC uses). */
  function phoneDigits(phone) {
    const d = String(phone || '').replace(/\D/g, '');
    if (!d) return '';
    return d.startsWith('91') && d.length >= 12 ? d : '91' + d.replace(/^0+/, '').slice(-10);
  }
  function safeFileName(s) { return String(s || 'document').replace(/[^\w.-]+/g, '_'); }

  /**
   * Render a print sheet (bill-format.js HTML + CSS) to an A4 PDF.
   * Resolves to the PDF as base64 (no "data:" prefix).
   */
  async function pdfBase64(html, css, opts) {
    const o = opts || {};
    const html2canvas = await loadScript(o.html2canvasSrc || './vendor/html2canvas.min.js', 'html2canvas');
    const jspdf = await loadScript(o.jspdfSrc || './vendor/jspdf.umd.min.js', 'jspdf');
    const host = document.createElement('div');
    host.setAttribute('aria-hidden', 'true');
    // 794 px is A4's width at 96 dpi; 53 px ≈ the 14 mm margin of the printed page.
    host.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;padding:53px;box-sizing:border-box;background:#fff;color:#1d2733;z-index:-1';
    host.innerHTML = '<style>' + css + '</style>' + html;
    document.body.appendChild(host);
    try {
      await Promise.all(Array.from(host.querySelectorAll('img')).map((img) => (img.complete ? null
        : new Promise((r) => { img.onload = r; img.onerror = r; }))));
      const canvas = await html2canvas(host, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
      const pdf = new jspdf.jsPDF({ unit: 'mm', format: 'a4', compress: true });
      const pageW = 210;
      const pageH = 297;
      const sliceH = Math.floor(canvas.width * pageH / pageW); // canvas pixels per A4 page
      for (let y = 0, page = 0; y < canvas.height; y += sliceH, page++) {
        const h = Math.min(sliceH, canvas.height - y);
        const part = document.createElement('canvas');
        part.width = canvas.width;
        part.height = h;
        part.getContext('2d').drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
        if (page) pdf.addPage();
        pdf.addImage(part.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pageW, h * pageW / canvas.width);
      }
      return pdf.output('datauristring').split(',')[1];
    } finally {
      host.remove();
    }
  }

  function plugins() {
    const c = g.Capacitor;
    return (c && c.Plugins) || {};
  }
  /** True when the Android app has the plugins needed to share a PDF. */
  function canSharePdf() {
    const p = plugins();
    return !!(p.Filesystem && p.Share);
  }

  /**
   * Android app: save the PDF in the app's cache and open the share sheet.
   * Without the plugins (an APK built before 9.8.0) WhatsApp opens with the text only.
   */
  async function sharePdf({ base64, filename, title, text, phone }) {
    const p = plugins();
    if (p.Filesystem && p.Share) {
      const written = await p.Filesystem.writeFile({
        path: 'shared/' + safeFileName(filename), data: base64, directory: 'CACHE', recursive: true,
      });
      await p.Share.share({ title: title || filename, text: text || '', files: [written.uri], dialogTitle: title || 'Send' });
      return { ok: true, how: 'share' };
    }
    const d = phoneDigits(phone);
    g.open('https://wa.me/' + d + '?text=' + encodeURIComponent(text || ''), '_blank');
    return { ok: true, how: 'whatsapp-text' };
  }

  const api = { loadScript, phoneDigits, safeFileName, pdfBase64, canSharePdf, sharePdf };
  g.SvShare = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
