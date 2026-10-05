// The printed bill / quotation and the WhatsApp PDF (v9.6.1).
// No Electron, browser or network needed: node test-bill-pdf.js
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = __dirname;
const Bill = require('./app/bill-format.js');
const { buildDocumentHtml, resolveLogoSrc } = require('./electron/document-html.js');

let n = 0;
const ok = (cond, msg) => { n++; if (!cond) { console.error('  ✗ FAIL:', msg); process.exit(1); } console.log('  ✓', msg); };
const count = (hay, needle) => hay.split(needle).length - 1;

const company = {
  name: 'Smart Vision Enterprise', phone: '94261 77057', email: 'smartvisionenterprise20@gmail.com',
  web: 'www.smartvision.ink', address: 'G-9, City Point, Bus Station Road, Borsad - 388540',
  gstin: '24ABCDE1234F1Z5', logo: './assets/sv-logo.png',
  extras: 'Extra: cabling ₹65/Mtr', quoteTerms: 'Valid 15 days.', invoiceTerms: 'Thank you for your business.',
};
const customer = { name: 'Sunrise Heights CHS', area: 'Anand Road', contact_name: 'Mr. Patel', phone: '98250 11223' };
const invoice = {
  number: 'INV-2099', customer: { name: 'Sunrise Heights CHS' }, issue_date: '2026-10-01', due_date: '2026-10-15',
  total: 60450, paid: 20000, balance: 40450,
  items: [
    { description: 'IP Camera Solution', qty: 1, amount: 27690 },
    { description: '2MP IP Bullet Camera', qty: 4, amount: 13800 },
    { description: 'CCTV cabling', qty: 120, amount: 7800 },
    { description: 'Camera fitting', qty: 8, amount: 2000 },
    { description: '1 TB HDD', qty: 1, amount: 0 },
    { description: 'WD Purple 4TB', qty: 2, amount: 9160 },
  ],
};

console.log('— bill PDF suite —');

/* ---------------------------------------------------------- 1. the logo */
const logoCss = Bill.css.match(/\.svb-logo\{[^}]*\}/)[0];
ok(/height:auto/.test(logoCss) && /width:auto/.test(logoCss), 'logo sizes from its own shape (width/height auto)');
ok(/max-height:/.test(logoCss) && /max-width:/.test(logoCss) && /object-fit:contain/.test(logoCss),
  'logo is bounded by max-width/max-height with object-fit: contain, never cropped or stretched');
ok(/flex:none/.test(logoCss), 'a long company address cannot squeeze the logo');
ok(resolveLogoSrc('./assets/sv-logo.png') === '/assets/sv-logo.png', 'WhatsApp PDF resolves the default logo path from its /api/… page');
ok(resolveLogoSrc('data:image/png;base64,AAA') === 'data:image/png;base64,AAA', 'an uploaded (data:) logo is used as-is');

/** Minimal PNG reader: RGBA, 8-bit, non-interlaced (what the shipped logo is). */
function readPng(file) {
  const buf = fs.readFileSync(file);
  let p = 8; let w = 0; let h = 0; let type = 0; let depth = 0; let inter = 0; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p); const t = buf.toString('ascii', p + 4, p + 8); const d = buf.slice(p + 8, p + 8 + len);
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); depth = d[8]; type = d[9]; inter = d[12]; }
    if (t === 'IDAT') idat.push(d);
    p += 12 + len;
  }
  if (type !== 6 || depth !== 8 || inter) return null;
  const raw = zlib.inflateSync(Buffer.concat(idat)); const bpp = 4; const stride = w * bpp;
  const px = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)]; const src = raw.slice(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[y * stride + x - bpp] : 0; const b = y ? px[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y ? px[(y - 1) * stride + x - bpp] : 0;
      let v = src[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pp = a + b - c; const pa = Math.abs(pp - a); const pb = Math.abs(pp - b); const pc = Math.abs(pp - c); v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); }
      px[y * stride + x] = v & 255;
    }
  }
  return { w, h, alpha: (x, y) => px[y * stride + x * bpp + 3] };
}
const png = readPng(path.join(root, 'app', 'assets', 'sv-logo.png'));
ok(png, 'sv-logo.png is a readable RGBA PNG');
let edge = 0;
for (let x = 0; x < png.w; x++) edge += (png.alpha(x, 0) > 40) + (png.alpha(x, png.h - 1) > 40);
for (let y = 0; y < png.h; y++) edge += (png.alpha(0, y) > 40) + (png.alpha(png.w - 1, y) > 40);
ok(edge === 0, 'logo artwork has clear space on every edge (the old file was cut through the S, T, N and y)');

/* ---------------------------------------------------------- 2. one address each */
const html = buildDocumentHtml('invoice', invoice, company, customer);
ok(count(html, company.address) === 1, 'company address printed once');
ok(count(html, company.email) === 1 && count(html, company.web) === 1, 'company email and website printed once');
ok(count(html, 'GSTIN 24ABCDE1234F1Z5') === 1, 'company GSTIN printed once');
const partyHtml = html.slice(html.indexOf('<section class="svb-box svb-party">'), html.indexOf('<section class="svb-box svb-docmeta">'));
ok(partyHtml.includes('Bill to') && partyHtml.includes('Sunrise Heights CHS') && partyHtml.includes('Anand Road')
  && partyHtml.includes('Mr. Patel') && partyHtml.includes('98250 11223'), 'customer name, contact, area and mobile sit in their own Bill to box');
ok(!partyHtml.includes(company.address), 'the company address is not in the customer box');
const jsx = fs.readFileSync(path.join(root, 'app', 'smart-vision-app.jsx'), 'utf8');
ok(!/function Letterhead\(/.test(jsx) && /SvBill\.sheetHtml\(/.test(jsx),
  'in-app print uses the shared builder (the old Letterhead that doubled the address is gone)');

/* ---------------------------------------------------------- 3. qty + unit price */
ok(/<th class="num qty">Qty<\/th><th class="num rate">Unit price<\/th><th class="num amt">Amount<\/th>/.test(html),
  'items table has Qty, Unit price and Amount columns');
const rows = Bill.lineRows(invoice.items);
ok(rows[1].qty === '4' && rows[1].unitPrice === '₹3,450' && rows[1].amount === '₹13,800', 'unit price = line amount ÷ qty');
ok(rows[2].qty === '120' && rows[2].unitPrice === '₹65', 'large quantities print as-is');
ok(rows[4].unitPrice === '' && rows[4].amount === 'incl.' && rows[4].included, 'a ₹0 package line shows "incl." and no unit price');
const note = Bill.lineRows([{ description: 'Reported issue: no power', amount: 0 }])[0];
ok(note.qty === '' && note.unitPrice === '', 'a note line (repair bill) gets no qty or price');
const legacy = Bill.lineRows([{ description: 'Old bill line', amount: 5000 }])[0];
ok(legacy.qty === '1' && legacy.unitPrice === '₹5,000', 'old lines saved without qty print as qty 1');
const frac = Bill.lineRows([{ description: 'x', qty: 3, amount: 1000 }])[0];
ok(frac.unitPrice === '₹333.33', 'fractional unit prices show exactly two decimals');
const fb = Bill.lineRows([], 'CCTV Supply, Installation & Commissioning', 28900)[0];
ok(fb.description.startsWith('CCTV Supply') && fb.qty === '1' && fb.amount === '₹28,900', 'a bill with no lines prints one line for the total');
ok(Bill.money(186400) === '₹1,86,400' && Bill.money(1999.5) === '₹1,999.50', 'rupees use Indian grouping; paise only when present');

/* ---------------------------------------------------------- 4. computer-generated note */
ok(html.includes('This is a computer-generated invoice.'), 'invoice footer says it is computer-generated');
ok(buildDocumentHtml('quote', Object.assign({}, invoice, { number: 'QT-1' }), company, customer)
  .includes('This is a computer-generated quotation.'), 'quotation footer says the same, as a quotation');

/* ---------------------------------------------------------- 5. formatting */
ok(Bill.amountInWords(60450) === 'Rupees Sixty Thousand Four Hundred Fifty Only', 'amount in words');
ok(Bill.amountInWords(186400) === 'Rupees One Lakh Eighty Six Thousand Four Hundred Only', 'lakh in words');
ok(Bill.amountInWords(12345678) === 'Rupees One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight Only', 'crore in words');
ok(Bill.amountInWords(999.5) === 'Rupees Nine Hundred Ninety Nine and Fifty Paise Only', 'paise in words');
ok(Bill.amountInWords(0) === 'Rupees Zero Only' && Bill.amountInWords(100000) === 'Rupees One Lakh Only', 'zero and round lakh');
ok(html.includes('Rupees Sixty Thousand Four Hundred Fifty Only'), 'grand total is printed in words on the bill');
// Since 9.7.0 GST is worked out per line, to the paisa (was: whole rupees on the total).
const rupees = (re) => Number(((html.match(re) || [])[1] || 'NaN').replace(/,/g, ''));
const tv = rupees(/Taxable value<\/td><td>₹([\d,.]+)/), cg = rupees(/CGST @ 9%<\/td><td>₹([\d,.]+)/), sg = rupees(/SGST @ 9%<\/td><td>₹([\d,.]+)/);
ok(Math.abs(tv - 60450 / 1.18) < 0.1, 'taxable value is exact to the paisa, worked out per line: ₹' + tv);
ok(cg === sg && cg > 0, 'in-state customer: CGST 9% and SGST 9%, equal halves (₹' + cg + ' each)');
ok(Math.round((tv + cg + sg) * 100) === 6045000 && html.includes('₹60,450') && html.includes('₹40,450'),
  'taxable + CGST + SGST adds up exactly to the grand total; balance unchanged');
ok(/print-color-adjust:exact/.test(Bill.css), 'navy table header still prints with "Background graphics" off');
ok(/\.svb-items thead\{display:table-header-group\}/.test(Bill.css) && /\.svb-items tr\{break-inside:avoid/.test(Bill.css),
  'long bills repeat the header on page 2 and never split a row');
ok(/@page\{size:A4;margin:14mm\}/.test(html), 'WhatsApp PDF page is A4 with 14 mm margins');
const evil = buildDocumentHtml('invoice', Object.assign({}, invoice, { customer: { name: '<script>x</script>' } }), company, {});
ok(!evil.includes('<script>x') && evil.includes('&lt;script&gt;x'), 'names are escaped');
const own = buildDocumentHtml('invoice', Object.assign({}, invoice, { phone: '90000 12345' }), company, customer);
ok(own.includes('90000 12345') && !own.includes('98250 11223'), 'a bill\'s own mobile number still wins over the customer\'s');

/* ---------------------------------------------------------- 6. wiring */
const erpHtml = fs.readFileSync(path.join(root, 'app', 'erp.html'), 'utf8');
ok(erpHtml.indexOf('bill-format.js') > 0 && erpHtml.indexOf('bill-format.js') < erpHtml.indexOf('smart-vision-app.js'),
  'erp.html loads bill-format.js before the app');
ok(erpHtml.includes('<script src="./erp-model.js"></script>'), 'APK sync can still inject its bridge after erp-model.js');
const compiled = fs.readFileSync(path.join(root, 'app', 'smart-vision-app.js'), 'utf8');
ok(/function BillSheet\(/.test(compiled) && !/function Letterhead\(/.test(compiled), 'compiled app is in sync with the .jsx');
const main = fs.readFileSync(path.join(root, 'electron', 'main.js'), 'utf8');
const pdfBlock = main.slice(main.indexOf("ipcMain.handle('whatsapp:open'"), main.indexOf('function showFatalError'));
ok(/pageSize: 'A4'/.test(pdfBlock) && /preferCSSPageSize: true/.test(pdfBlock) && !/marginsType:/.test(pdfBlock),
  'WhatsApp PDF is printed A4 (was US Letter: marginsType is not an Electron option)');
ok(!/once\('did-finish-load'/.test(pdfBlock), 'no second wait for a load event that already fired (it timed out after 15 s)');

console.log('\nALL ' + n + ' BILL PDF TESTS PASSED ✓');
