/* ============================================================================
   Smart Vision ERP — the printed bill and quotation, item-wise GST
   ----------------------------------------------------------------------------
   ONE builder for both places a bill is produced:
     • the in-app A4 print (Print / Bill A4 → window.print → Save as PDF)
     • the PDF the shop PC builds for WhatsApp (electron/document-html.js)
   They used to be two hand-kept copies, which is how the in-app letterhead
   ended up printing the company address twice while the WhatsApp copy did not.

   Loaded as a plain <script> in erp.html (window.SvBill) and require()d by
   electron/document-html.js. No dependencies, no DOM access.
   ========================================================================== */
(function (g) {
  'use strict';

  const DEFAULT_GST_RATE = 18; // % — used for lines that carry no rate of their own
  const r2 = (x) => Math.round((Number(x) || 0) * 100) / 100;

  function n(v) {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /** Escaped text with line breaks kept (terms are typed in a textarea). */
  function escLines(s) {
    return esc(String(s == null ? '' : s).trim()).replace(/\r?\n/g, '<br/>');
  }

  /** ₹1,86,400 — paise only when there are any, and then always two digits. */
  function money(v) {
    const x = Math.round(n(v) * 100) / 100;
    const frac = Math.abs(x % 1) > 0.0001;
    return '\u20B9' + x.toLocaleString('en-IN', {
      minimumFractionDigits: frac ? 2 : 0,
      maximumFractionDigits: 2,
    });
  }

  function qtyText(v) {
    return n(v).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }

  function fmtDate(d) {
    if (!d) return '\u2014';
    const t = new Date(d);
    if (Number.isNaN(t.getTime())) return '\u2014';
    return t.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
  }

  /* ---------------- amount in words (Indian system: thousand, lakh, crore) */
  const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function twoDigits(x) {
    if (x < 20) return ONES[x];
    return TENS[Math.floor(x / 10)] + (x % 10 ? ' ' + ONES[x % 10] : '');
  }

  function indianWords(x) {
    if (x === 0) return 'Zero';
    const parts = [];
    const crore = Math.floor(x / 10000000);
    const lakh = Math.floor(x / 100000) % 100;
    const thousand = Math.floor(x / 1000) % 100;
    const hundred = Math.floor(x / 100) % 10;
    const rest = x % 100;
    if (crore) parts.push(indianWords(crore) + ' Crore');
    if (lakh) parts.push(twoDigits(lakh) + ' Lakh');
    if (thousand) parts.push(twoDigits(thousand) + ' Thousand');
    if (hundred) parts.push(ONES[hundred] + ' Hundred');
    if (rest) parts.push(twoDigits(rest));
    return parts.join(' ');
  }

  /** "Rupees Sixty Thousand Four Hundred Fifty Only" */
  function amountInWords(v) {
    const paiseTotal = Math.round(Math.abs(n(v)) * 100);
    const rupees = Math.floor(paiseTotal / 100);
    const paise = paiseTotal % 100;
    if (!rupees && paise) return twoDigits(paise) + ' Paise Only';
    return 'Rupees ' + indianWords(rupees) + (paise ? ' and ' + twoDigits(paise) + ' Paise' : '') + ' Only';
  }

  /* ---------------- line items */

  /**
   * Rows exactly as printed. Stored lines carry `amount` = the LINE total
   * (qty × unit price) and `qty`; the unit price is not stored, so it is
   * derived here. A line with no amount is part of a package ("incl.") or a
   * note (e.g. "Reported issue: …" on a repair bill) and gets no price.
   */
  function lineRows(items, fallbackDescription, total, defaultRate) {
    const dRate = defaultRate == null ? DEFAULT_GST_RATE : n(defaultRate);
    const list = Array.isArray(items) && items.length
      ? items
      : [{ description: fallbackDescription, amount: total, qty: 1 }];
    return list.map((it, i) => {
      const amount = n(it && it.amount);
      const q = n(it && it.qty);
      const priced = amount > 0;
      const unit = String((it && it.unit) || '').trim();
      const rate = it && it.gst_rate != null && it.gst_rate !== '' ? n(it.gst_rate) : dRate;
      // Prices include GST. Tax is worked out per line, to the paisa.
      const taxable = priced ? r2(amount / (1 + rate / 100)) : 0;
      return {
        no: i + 1,
        description: String((it && it.description) || ''),
        qty: q > 0 ? qtyText(q) + (unit ? ' ' + unit : '') : (priced ? '1' + (unit ? ' ' + unit : '') : ''),
        unitPrice: priced ? money(amount / (q > 0 ? q : 1)) : '',
        amount: priced ? money(amount) : 'incl.',
        included: !priced,
        hsn: String((it && it.hsn) || ''),
        rate,
        value: priced ? amount : 0,
        taxable,
        tax: priced ? r2(amount - taxable) : 0,
      };
    });
  }

  /**
   * GST on the bill. inter = customer in another state (IGST); otherwise CGST + SGST,
   * each half of the tax, split per line. Groups are per HSN + rate (the summary table).
   */
  function gstSummary(rows, inter) {
    const groups = new Map();
    const tot = { taxable: 0, tax: 0, cgst: 0, sgst: 0, igst: 0 };
    rows.forEach((r) => {
      if (!r.value) return;
      // Per line: the tax inside a GST-inclusive price, CGST and SGST as two EQUAL
      // halves, and the taxable value takes up the last paisa so the line still adds
      // up exactly to its amount.
      const exact = r.value - r.value / (1 + r.rate / 100);
      const cg = inter ? 0 : r2(exact / 2);
      const sg = cg;
      const ig = inter ? r2(exact) : 0;
      const tax = r2(cg + sg + ig);
      const taxable = r2(r.value - tax);
      r.taxable = taxable; r.tax = tax;
      const k = r.hsn + '|' + r.rate;
      const g = groups.get(k) || { hsn: r.hsn, rate: r.rate, taxable: 0, tax: 0, cgst: 0, sgst: 0, igst: 0 };
      g.taxable = r2(g.taxable + taxable); g.tax = r2(g.tax + tax);
      g.cgst = r2(g.cgst + cg); g.sgst = r2(g.sgst + sg); g.igst = r2(g.igst + ig);
      groups.set(k, g);
      tot.taxable = r2(tot.taxable + taxable); tot.tax = r2(tot.tax + tax);
      tot.cgst = r2(tot.cgst + cg); tot.sgst = r2(tot.sgst + sg); tot.igst = r2(tot.igst + ig);
    });
    const rates = [...new Set(rows.filter((r) => r.value).map((r) => r.rate))];
    return Object.assign(tot, { groups: [...groups.values()], rates, inter: !!inter });
  }

  /** First two digits of a GSTIN are the state code. */
  function stateOf(gstin, explicit) {
    const e = String(explicit || '').trim();
    if (/^\d{2}$/.test(e)) return e;
    const m = String(gstin || '').trim().match(/^(\d{2})[A-Z0-9]{13}$/i);
    return m ? m[1] : '';
  }

  /** Kept for callers that only know a bill total (single default rate). */
  function taxSplit(total, rate) {
    const t = n(total);
    const taxable = r2(t / (1 + (rate == null ? DEFAULT_GST_RATE : n(rate)) / 100));
    return { taxable, gst: r2(t - taxable), total: t };
  }

  function generatedNote(kind, composition) {
    return 'This is a computer-generated ' + (kind === 'quote' ? 'quotation' : (composition ? 'bill' : 'invoice')) + '.';
  }

  /* ---------------- the sheet */

  const CSS = `
.svb{font-family:"Segoe UI",system-ui,-apple-system,Roboto,"Helvetica Neue",Arial,sans-serif;color:#1d2733;font-size:11px;line-height:1.45;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.svb *{box-sizing:border-box}
.svb p{margin:0}
.svb-head{display:flex;justify-content:space-between;align-items:center;gap:8mm;padding-bottom:4mm;border-bottom:2px solid var(--svb-doc,#102a43)}
.svb-logo{display:block;flex:none;width:auto;height:auto;max-width:62mm;max-height:24mm;object-fit:contain;object-position:left center}
.svb-co{flex:1 1 auto;min-width:0;text-align:right;color:#46505c;font-size:10.5px;line-height:1.55;overflow-wrap:anywhere}
.svb-co-name{font-size:15px;font-weight:700;color:var(--svb-doc,#102a43);line-height:1.3;margin-bottom:1mm}
.svb-co-gst{color:#1d2733;font-weight:600}
.svb-title{margin:5mm 0 3mm;font-size:20px;font-weight:700;color:var(--svb-doc,#102a43);line-height:1.2}
.svb-parties{display:flex;gap:5mm;margin-bottom:5mm;align-items:stretch}
.svb-box{border:1px solid #d9dee4;border-radius:2px;padding:3mm 4mm}
.svb-party{flex:1 1 auto;min-width:0;overflow-wrap:anywhere}
.svb-docmeta{flex:none;width:64mm}
.svb-label{font-size:9.5px;font-weight:700;color:#6b7480;margin-bottom:1mm}
.svb-party-name{font-size:13px;font-weight:700;color:var(--svb-doc,#102a43);line-height:1.3;margin-bottom:.5mm}
.svb-party p{color:#46505c}
.svb-k{color:#6b7480}
.svb-meta{width:100%;border-collapse:collapse}
.svb-meta td{padding:.8mm 0;vertical-align:top}
.svb-meta td+td{text-align:right;font-weight:600;color:#1d2733;white-space:nowrap}
.svb-items{width:100%;border-collapse:collapse;font-size:10.5px}
.svb-items thead{display:table-header-group}
.svb-items th{background:var(--svb-doc,#102a43);color:#fff;font-weight:600;text-align:left;padding:2.2mm 2.5mm}
.svb-items td{padding:2.2mm 2.5mm;border-bottom:1px solid #e3e7eb;vertical-align:top}
.svb-items tr{break-inside:avoid;page-break-inside:avoid}
.svb-items .sr{width:9mm;color:#6b7480}
.svb-items th.sr{color:#fff}
.svb-items .num{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
.svb-items .qty{width:15mm}
.svb-items .rate{width:27mm}
.svb-items .amt{width:29mm}
.svb-items .incl{color:#6b7480;font-style:italic}
.svb-sum{display:flex;justify-content:space-between;align-items:flex-start;gap:8mm;margin-top:4mm;break-inside:avoid;page-break-inside:avoid}
.svb-words{flex:1 1 auto;min-width:0;padding-top:1mm}
.svb-words-text{font-weight:600;color:#1d2733;margin-bottom:2mm}
.svb-tax-note{color:#6b7480;font-size:10px}
.svb-totals{flex:none;width:74mm;border-collapse:collapse;font-variant-numeric:tabular-nums}
.svb-totals td{padding:1.1mm 0}
.svb-totals td+td{text-align:right;white-space:nowrap}
.svb-totals .grand td{border-top:1.5px solid var(--svb-doc,#102a43);padding-top:2mm;font-size:13px;font-weight:700;color:var(--svb-doc,#102a43)}
.svb-totals .paid td{color:#1a7f4b}
.svb-totals .due td{font-weight:700;border-top:1px solid #e3e7eb}
.svb-totals .due.open td+td{color:#c0392b}
.svb-terms{margin-top:6mm;padding-top:3mm;border-top:1px solid #e3e7eb;color:#46505c;font-size:10px;line-height:1.55;break-inside:avoid;page-break-inside:avoid}
.svb-terms .svb-label{margin-bottom:1.2mm}
.svb-terms p+p{margin-top:1.2mm}
.svb-sign{display:flex;justify-content:space-between;align-items:flex-end;gap:10mm;margin-top:12mm;break-inside:avoid;page-break-inside:avoid}
.svb-sign-for{text-align:right;margin-left:auto}
.svb-sign-line{margin-top:12mm;border-top:1px solid #9aa3ad;padding-top:1mm;min-width:52mm;text-align:center;color:#46505c}
.svb-hsn-note{color:#6b7480;font-size:9px;margin-top:.6mm}
.svb-scheme{color:#6b7480;font-size:9.5px;margin-top:1.5mm}
.svb-items tfoot td{border-top:1.5px solid var(--svb-doc,#102a43);padding-top:2mm}
.svb-open td{background:#f7f8fa}
.svb-hist-sec{margin:6mm 0 1.5mm}
.svb-hist td,.svb-hist th{padding:1.6mm 2mm;font-size:9.5px}
.svb-hist-counts{display:flex;flex-wrap:wrap;gap:2mm 5mm;margin:-1mm 0 2mm;font-size:10px;color:#46505c}
.svb-hist-counts b{color:#1d2733}
.svb-foot{margin-top:8mm;padding-top:2mm;border-top:1px solid #e3e7eb;text-align:center;color:#6b7480;font-size:9.5px}
`;

  function letterheadHtml(co) {
    const coLines = [
      co.address && esc(co.address),
      [co.phone && `<span class="svb-k">Ph</span> ${esc(co.phone)}`, co.email && esc(co.email)].filter(Boolean).join(' &nbsp;|&nbsp; '),
      co.web && esc(co.web),
      co.gstin && `<span class="svb-co-gst">GSTIN ${esc(co.gstin)}</span>`,
    ].filter(Boolean).map((l) => `<p>${l}</p>`).join('');
    const logo = co.logo ? `<img class="svb-logo" src="${esc(co.logo)}" alt="${esc(co.name || 'Logo')}"/>` : '<span></span>';
    return `<header class="svb-head">${logo}<div class="svb-co"><div class="svb-co-name">${esc(co.name)}</div>${coLines}</div></header>`;
  }
  const docStyle = (co) => (co.docColor && /^#[0-9a-f]{6}$/i.test(co.docColor) ? ` style="--svb-doc:${co.docColor}"` : '');
  const today = () => fmtDate(new Date());
  const amt = (v) => (v ? money(v) : '');

  /**
   * Accounts for a period (from accountsPayload): summary, categories, every entry.
   * opts.dir: 'in' | 'out' to print only one side, as filtered on screen.
   */
  function accountsHtml(a, company, opts) {
    const co = company || {}; const o = opts || {};
    const rows = (a.rows || []).filter((r) => !o.dir || r.direction === o.dir)
      .slice().sort((x, y) => new Date(x.on) - new Date(y.on));
    const tin = rows.reduce((s, r) => s + (r.direction === 'in' ? r.amount : 0), 0);
    const tout = rows.reduce((s, r) => s + (r.direction === 'out' ? r.amount : 0), 0);
    const sumRows = [
      ['Customer collections', a.collections], ['Other income', a.other_in], ['Money in', a.money_in, 'b'],
      ['Purchases (received POs)', a.purchases], ['Operating expenses', a.expenses], ['Money out', a.money_out, 'b'],
      ['Cash profit (money in − money out)', a.profit, 'g'], ['Billed (invoices issued)', a.billed], ['Book profit (billed − purchases − expenses + other income)', a.book_profit, 'b'],
    ].map(([k, v, c]) => `<tr class="${c === 'g' ? 'grand' : ''}"><td class="${c ? '' : 'svb-k'}">${esc(k)}</td><td>${money(v)}</td></tr>`).join('');
    const cats = (a.by_category || []).map((c) => `<tr><td>${esc(c.category)}</td><td class="num">${amt(c.in)}</td><td class="num">${amt(c.out)}</td></tr>`).join('');
    const body = rows.map((r) => `<tr><td>${esc(fmtDate(r.on))}</td><td>${r.direction === 'in' ? 'In' : 'Out'}</td>
        <td>${esc(r.category)}</td><td>${esc(r.party || '')}</td><td>${esc(r.number || r.note || '')}</td>
        <td class="num">${r.direction === 'in' ? money(r.amount) : ''}</td><td class="num">${r.direction === 'out' ? money(r.amount) : ''}</td></tr>`).join('');
    return `<div class="svb"${docStyle(co)}>${letterheadHtml(co)}
      <div class="svb-title">Accounts statement</div>
      <div class="svb-parties"><section class="svb-box svb-party"><div class="svb-label">Period</div><div class="svb-party-name">${esc(a.label || '')}</div>
        <p>${rows.length} entr${rows.length === 1 ? 'y' : 'ies'}${o.dir ? ' · money ' + (o.dir === 'in' ? 'in' : 'out') + ' only' : ''}</p></section>
        <section class="svb-box svb-docmeta"><table class="svb-meta"><tbody><tr><td class="svb-k">Printed on</td><td>${esc(today())}</td></tr></tbody></table></section></div>
      <div class="svb-sum"><div class="svb-words"><div class="svb-label">By category</div>
        <table class="svb-items"><thead><tr><th>Category</th><th class="num">In</th><th class="num">Out</th></tr></thead><tbody>${cats || '<tr><td colspan="3">No entries</td></tr>'}</tbody></table></div>
        <table class="svb-totals"><tbody>${sumRows}</tbody></table></div>
      <div class="svb-label" style="margin-top:6mm">Entries</div>
      <table class="svb-items"><thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Party</th><th>Ref</th><th class="num">In</th><th class="num">Out</th></tr></thead>
        <tbody>${body || '<tr><td colspan="7">No money movements in this period</td></tr>'}</tbody>
        <tfoot><tr><td colspan="5"><b>Total</b></td><td class="num"><b>${money(tin)}</b></td><td class="num"><b>${money(tout)}</b></td></tr></tfoot></table>
      <footer class="svb-foot">This is a computer-generated statement.</footer></div>`;
  }

  /** One customer's account (from customerStatement) with running balance, plus other activity. */
  function statementHtml(st, company, customer) {
    const co = company || {}; const c = customer || {};
    const lines = [`<tr class="svb-open"><td></td><td><b>Opening balance</b></td><td></td><td class="num"></td><td class="num"></td><td class="num"><b>${money(st.opening)}</b></td></tr>`]
      .concat((st.rows || []).map((e) => `<tr><td>${esc(fmtDate(e.on))}</td><td>${esc(e.particulars)}</td><td>${esc(e.ref || '')}</td>
        <td class="num">${amt(e.debit)}</td><td class="num">${amt(e.credit)}</td><td class="num">${money(e.balance)}</td></tr>`)).join('');
    const act = (st.activity || []).map((e) => `<tr><td>${esc(fmtDate(e.on))}</td><td>${esc(e.title || '')}</td><td>${esc(e.detail || '')}</td>
        <td class="num">${e.amount ? money(e.amount) : ''}</td></tr>`).join('');
    const party = `<section class="svb-box svb-party"><div class="svb-label">Customer</div><div class="svb-party-name">${esc(c.name || st.name)}</div>
      ${c.contact_name ? `<p>${esc(c.contact_name)}</p>` : ''}${c.area ? `<p>${esc(c.area)}</p>` : ''}
      ${c.phone ? `<p><span class="svb-k">Mobile</span> ${esc(c.phone)}</p>` : ''}${c.gstin ? `<p><span class="svb-k">GSTIN</span> ${esc(c.gstin)}</p>` : ''}</section>`;
    const meta = `<section class="svb-box svb-docmeta"><table class="svb-meta"><tbody>
      <tr><td class="svb-k">Period</td><td>${esc(st.label)}</td></tr><tr><td class="svb-k">Printed on</td><td>${esc(today())}</td></tr>
      <tr><td class="svb-k">Balance due</td><td>${money(st.closing)}</td></tr></tbody></table></section>`;
    return `<div class="svb"${docStyle(co)}>${letterheadHtml(co)}
      <div class="svb-title">Customer statement</div>
      <div class="svb-parties">${party}${meta}</div>
      <table class="svb-items"><thead><tr><th>Date</th><th>Particulars</th><th>Ref</th><th class="num">Billed</th><th class="num">Received</th><th class="num">Balance</th></tr></thead>
        <tbody>${lines}</tbody>
        <tfoot><tr><td colspan="3"><b>Closing balance</b></td><td class="num"><b>${money(st.debit)}</b></td><td class="num"><b>${money(st.credit)}</b></td><td class="num"><b>${money(st.closing)}</b></td></tr></tfoot></table>
      <div class="svb-sum"><div class="svb-words"><div class="svb-label">Amount due in words</div>
        <p class="svb-words-text">${esc(amountInWords(Math.max(0, st.closing)))}</p></div>
        <table class="svb-totals"><tbody><tr><td class="svb-k">Opening balance</td><td>${money(st.opening)}</td></tr>
          <tr><td class="svb-k">Billed</td><td>${money(st.debit)}</td></tr><tr class="paid"><td>Received</td><td>${money(st.credit)}</td></tr>
          <tr class="due${st.closing > 0 ? ' open' : ''}"><td>Balance due</td><td>${money(st.closing)}</td></tr></tbody></table></div>
      ${act ? `<div class="svb-label" style="margin-top:6mm">Other activity</div>
        <table class="svb-items"><thead><tr><th>Date</th><th>Activity</th><th>Details</th><th class="num">Value</th></tr></thead><tbody>${act}</tbody></table>` : ''}
      <footer class="svb-foot">This is a computer-generated statement.</footer></div>`;
  }

  /**
   * Everything about one customer on paper (9.8.0): details and an all-time
   * summary, then equipment installed, installation jobs, service tickets,
   * repairs, AMC, quotations, bills with payments, and the full timeline.
   * A section only prints when the customer has records of that kind.
   */
  function customerHistoryHtml(h, company) {
    const co = company || {}; const c = h.customer || {};
    const td = (v, num) => `<td${num ? ' class="num"' : ''}>${v == null || v === '' ? '—' : v}</td>`;
    const section = (title, head, rows) => (rows.length ? `<div class="svb-label svb-hist-sec">${esc(title)} · ${rows.length}</div>
      <table class="svb-items svb-hist"><thead><tr>${head.map((x) => `<th${/^[₹#]|Value|Total|Paid|Balance|Charge/.test(x) ? ' class="num"' : ''}>${esc(x)}</th>`).join('')}</tr></thead>
      <tbody>${rows.join('')}</tbody></table>` : '');
    const S = h.summary || {};
    const party = `<section class="svb-box svb-party"><div class="svb-label">Customer</div><div class="svb-party-name">${esc(c.name || '')}</div>
      ${c.contact_name ? `<p>${esc(c.contact_name)}</p>` : ''}${c.area ? `<p>${esc(c.area)}</p>` : ''}
      ${c.phone ? `<p><span class="svb-k">Mobile</span> ${esc(c.phone)}</p>` : ''}${c.gstin ? `<p><span class="svb-k">GSTIN</span> ${esc(c.gstin)}</p>` : ''}
      ${c.type ? `<p><span class="svb-k">Type</span> ${esc(c.type)}${c.sites ? ' · ' + esc(c.sites) + ' site(s)' : ''}</p>` : ''}</section>`;
    const meta = `<section class="svb-box svb-docmeta"><table class="svb-meta"><tbody>
      <tr><td class="svb-k">Customer since</td><td>${esc(h.since ? fmtDate(h.since) : '—')}</td></tr>
      <tr><td class="svb-k">Total billed</td><td>${money(S.billed)}</td></tr>
      <tr><td class="svb-k">Received</td><td>${money(S.received)}</td></tr>
      <tr><td class="svb-k">Balance due</td><td>${money(S.balance)}</td></tr>
      <tr><td class="svb-k">Printed on</td><td>${esc(today())}</td></tr></tbody></table></section>`;
    const counts = [['Equipment', S.equipment], ['Installations', S.jobs], ['Tickets', S.tickets], ['Repairs', S.repairs], ['AMC', S.amc], ['Quotations', S.quotes], ['Bills', S.invoices]]
      .map(([k, v]) => `<span class="svb-hist-count"><b>${n(v)}</b> ${esc(k)}</span>`).join('');
    const E = h.sections || {};
    const body = [
      section('Equipment installed', ['Item', 'Serial no.', 'Location', 'Installed', 'Warranty till'],
        (E.equipment || []).map((e) => `<tr>${td(esc(e.name))}${td(esc(e.serial))}${td(esc(e.location))}${td(esc(fmtDate(e.installed_on)))}${td(esc(fmtDate(e.warranty_end)) + (e.in_warranty ? '' : ' <span class="svb-k">(expired)</span>'))}</tr>`)),
      section('Installation & site jobs', ['Job', 'Date', 'Type', 'Scope', 'Technician', 'Status'],
        (E.jobs || []).map((j) => `<tr>${td(esc(j.number))}${td(esc(fmtDate(j.on)))}${td(esc(j.type))}${td(esc(j.scope))}${td(esc(j.technician))}${td(esc(j.status))}</tr>`)),
      section('Service tickets', ['Ticket', 'Issue', 'Priority', 'Cover', 'Assigned', 'Status'],
        (E.tickets || []).map((t) => `<tr>${td(esc(t.number))}${td(esc(t.issue))}${td(esc(t.priority))}${td(esc(t.coverage))}${td(esc(t.assignee))}${td(esc(t.status))}</tr>`)),
      section('Repairs', ['Repair', 'Received', 'Device', 'Serial no.', 'Issue', 'Status', 'Charge'],
        (E.repairs || []).map((r) => `<tr>${td(esc(r.number))}${td(esc(fmtDate(r.received_on)))}${td(esc(r.device))}${td(esc(r.serial_no))}${td(esc(r.issue))}${td(esc(r.status))}${td(r.charge ? money(r.charge) : '—', true)}</tr>`)),
      section('AMC contracts', ['AMC', 'Plan', 'From', 'To', 'Visits', 'Status', 'Value'],
        (E.amc || []).map((a) => `<tr>${td(esc(a.number))}${td(esc(a.plan))}${td(esc(fmtDate(a.starts_on)))}${td(esc(fmtDate(a.ends_on)))}${td(esc((a.visits_used ?? 0) + ' / ' + (a.visits_total ?? 0)))}${td(esc(a.status))}${td(a.value ? money(a.value) : 'Free', true)}</tr>`)),
      section('Quotations', ['Quotation', 'Scope', 'Status', 'Value'],
        (E.quotes || []).map((q) => `<tr>${td(esc(q.number))}${td(esc(q.scope))}${td(esc(q.status))}${td(money(q.total), true)}</tr>`)),
      section('Bills & payments', ['Bill', 'Date', 'Status', 'Total', 'Paid', 'Balance'],
        (E.invoices || []).map((i) => `<tr>${td(esc(i.number) + (i.payments && i.payments.length ? `<div class="svb-hsn-note">Paid ${i.payments.map((p) => money(p.amount) + ' on ' + fmtDate(p.on)).join(', ')}</div>` : ''))}${td(esc(fmtDate(i.issue_date)))}${td(esc(i.status))}${td(money(i.total), true)}${td(money(i.paid), true)}${td(money(i.balance), true)}</tr>`)),
      section('Timeline', ['Date', 'What happened', 'Details', 'Value'],
        (h.timeline || []).map((e) => `<tr>${td(esc(fmtDate(e.on)))}${td(esc(e.title))}${td(esc(e.detail))}${td(e.amount ? money(e.amount) : '', true)}</tr>`)),
    ].join('');
    return `<div class="svb"${docStyle(co)}>${letterheadHtml(co)}
      <div class="svb-title">Customer history</div>
      <div class="svb-parties">${party}${meta}</div>
      <div class="svb-hist-counts">${counts}</div>
      ${body || '<p class="svb-k">No records for this customer yet.</p>'}
      <footer class="svb-foot">Complete record for ${esc(c.name || '')}, all time. This is a computer-generated document.</footer></div>`;
  }

  /**
   * The bill or quotation body as an HTML string (no <html>/<body>).
   * kind: 'invoice' | 'quote'.  company: the COMPANY record (logo already a
   * usable src).  customer: the customer record, or {}.
   */
  function sheetHtml(kind, doc, company, customer, opts) {
    const isQuote = kind === 'quote';
    const d = doc || {};
    const co = company || {};
    const c = customer || {};
    const o = opts || {};

    /* ---- letterhead: the company, once */
    const head = letterheadHtml(co);

    /* ---- the customer, in its own box. A bill may carry its own mobile
       number; blank falls back to the customer record. */
    const custName = (d.customer && d.customer.name) || c.name || '';
    const contact = c.contact_name && c.contact_name !== custName ? c.contact_name : '';
    const place = c.address || c.area || '';
    const phone = d.phone || c.phone || '';
    const party = `<section class="svb-box svb-party">
      <div class="svb-label">${isQuote ? 'Quotation for' : 'Bill to'}</div>
      <div class="svb-party-name">${esc(custName)}</div>
      ${contact ? `<p>${esc(contact)}</p>` : ''}
      ${place ? `<p>${esc(place)}</p>` : ''}
      ${phone ? `<p><span class="svb-k">Mobile</span> ${esc(phone)}</p>` : ''}
      ${c.gstin ? `<p><span class="svb-k">GSTIN</span> ${esc(c.gstin)}</p>` : ''}
    </section>`;

    const metaRows = isQuote
      ? [['Quotation no.', d.number], ['Date', fmtDate(o.today || new Date())], ['Valid till', fmtDate(d.valid_till)]]
      : [['Invoice no.', d.number], ['Invoice date', fmtDate(d.issue_date)], ['Due date', fmtDate(d.due_date)]];
    const meta = `<section class="svb-box svb-docmeta"><table class="svb-meta"><tbody>${
      metaRows.map(([k, v]) => `<tr><td class="svb-k">${k}</td><td>${esc(v || '\u2014')}</td></tr>`).join('')
    }</tbody></table></section>`;

    /* ---- items */
    const composition = String(co.gst_scheme || '').toLowerCase() === 'composition';
    const fallback = isQuote ? (d.scope || co.quoteFallback || 'As per quotation') : (d.scope || co.invoiceFallback || 'Goods supplied');
    const lines = lineRows(d.items, fallback, d.total, co.default_gst_rate);
    const coState = stateOf(co.gstin, co.state_code);
    const custState = stateOf(c.gstin, c.state_code);
    const gst = gstSummary(lines, !!(coState && custState && coState !== custState));
    const rows = lines.map((r) => `<tr>
        <td class="sr">${r.no}</td>
        <td>${esc(r.description)}${r.hsn ? `<div class="svb-hsn-note">HSN ${esc(r.hsn)}</div>` : ''}</td>
        <td class="num">${esc(r.qty)}</td>
        <td class="num">${esc(r.unitPrice)}</td>
        <td class="num${r.included ? ' incl' : ''}">${esc(r.amount)}</td>
      </tr>`).join('');
    const items = `<table class="svb-items"><thead><tr>
        <th class="sr">#</th><th>Description</th><th class="num qty">Qty</th><th class="num rate">Unit price</th><th class="num amt">Amount</th>
      </tr></thead><tbody>${rows}</tbody></table>`;

    /* ---- totals */
    const t = { total: n(d.total) };
    const one = gst.rates.length === 1 ? gst.rates[0] : null;
    let totalRows = '';
    if (!composition) {
      totalRows += `<tr><td class="svb-k">Taxable value</td><td>${money(gst.taxable)}</td></tr>`;
      if (gst.inter) {
        totalRows += `<tr><td class="svb-k">IGST${one != null ? ' @ ' + one + '%' : ''}</td><td>${money(gst.igst)}</td></tr>`;
      } else {
        totalRows += `<tr><td class="svb-k">CGST${one != null ? ' @ ' + (one / 2) + '%' : ''}</td><td>${money(gst.cgst)}</td></tr>`
          + `<tr><td class="svb-k">SGST${one != null ? ' @ ' + (one / 2) + '%' : ''}</td><td>${money(gst.sgst)}</td></tr>`;
      }
    }
    totalRows += `<tr class="grand"><td>Grand total</td><td>${money(t.total)}</td></tr>`;
    if (!isQuote) {
      const paid = n(d.paid);
      const balance = d.balance != null && d.balance !== '' ? n(d.balance) : t.total - paid;
      totalRows += `<tr class="paid"><td>Received</td><td>${money(paid)}</td></tr>
        <tr class="due${balance > 0 ? ' open' : ''}"><td>Balance due</td><td>${money(balance)}</td></tr>`;
    }
    const taxNote = composition
      ? `<p class="svb-scheme">Composition taxable person, not eligible to collect tax on supplies.</p>`
      : `<p class="svb-tax-note">All prices include GST${one != null ? ' @ ' + one + '%' : ''}.</p>`;
    const sum = `<div class="svb-sum">
        <div class="svb-words">
          <div class="svb-label">Amount in words</div>
          <p class="svb-words-text">${esc(amountInWords(t.total))}</p>
          ${taxNote}
        </div>
        <table class="svb-totals"><tbody>${totalRows}</tbody></table>
      </div>`;

    /* ---- terms, signature, footer */
    const termParts = (isQuote ? [co.quoteTerms, co.extras] : [co.invoiceTerms, co.extras])
      .filter((x) => x && String(x).trim());
    const terms = termParts.length
      ? `<section class="svb-terms"><div class="svb-label">Terms &amp; conditions</div>${termParts.map((x) => `<p>${escLines(x)}</p>`).join('')}</section>`
      : '';
    const sign = `<div class="svb-sign">
        ${isQuote ? '<div><div class="svb-sign-line">Customer acceptance</div></div>' : ''}
        <div class="svb-sign-for">For <b>${esc(co.name)}</b><div class="svb-sign-line">Authorised signatory</div></div>
      </div>`;
    const foot = `<footer class="svb-foot">${esc(generatedNote(kind, composition))}</footer>`;

    const docTitle = isQuote ? 'Quotation' : (composition ? 'Bill of Supply' : 'Tax Invoice');
    const style = co.docColor && /^#[0-9a-f]{6}$/i.test(co.docColor) ? ` style="--svb-doc:${co.docColor}"` : '';
    return `<div class="svb"${style}>${head}
      <div class="svb-title">${docTitle}</div>
      <div class="svb-parties">${party}${meta}</div>
      ${items}${sum}${terms}${sign}${foot}</div>`;
  }

  const api = {
    css: CSS, sheetHtml, customerHistoryHtml, accountsHtml, statementHtml, letterheadHtml, lineRows, gstSummary, stateOf, amountInWords, money, qtyText, fmtDate, taxSplit, generatedNote, esc,
  };
  g.SvBill = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
