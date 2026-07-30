'use strict';

function inr(n) {
  return '\u20B9' + Number(n || 0).toLocaleString('en-IN');
}

function fmtDate(d) {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const BASE_STYLE = `
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #102a43; margin: 24px; font-size: 12px; }
  .head { display: flex; justify-content: space-between; border-bottom: 2px solid #102a43; padding-bottom: 12px; margin-bottom: 18px; }
  .co { text-align: right; line-height: 1.55; color: #3a4147; }
  .co b { font-size: 13px; color: #102a43; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; }
  th { background: #f4f6f8; }
  td.num, th.num { text-align: right; }
  .totals { width: 270px; margin-left: auto; }
  .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
  .grand { border-top: 1px solid #ddd; margin-top: 6px; padding-top: 8px; font-size: 14px; font-weight: 800; }
  .terms { margin-top: 24px; font-size: 10.5px; color: #5d6470; line-height: 1.5; }
`;

function itemsRows(items, total, scope) {
  const rows = (items && items.length)
    ? items
    : [{ description: scope || 'CCTV solution', amount: total }];
  return rows.map((it, i) => (
    `<tr><td>${i + 1}</td><td>${esc(it.description)}</td><td class="num">${Number(it.amount) > 0 ? inr(it.amount) : 'incl.'}</td></tr>`
  )).join('');
}

function totalsBlock(total, extraHtml) {
  const t = Number(total) || 0;
  const taxable = Math.round(t / 1.18);
  const gst = t - taxable;
  return `
    <div class="totals">
      <div><span>Taxable value</span><b>${inr(taxable)}</b></div>
      <div><span>GST @ 18%</span><b>${inr(gst)}</b></div>
      <div class="grand"><span>Grand Total</span><span>${inr(t)}</span></div>
      ${extraHtml || ''}
    </div>`;
}

function buildDocumentHtml(kind, doc, company, customer) {
  const co = company || {};
  const c = customer || {};
  const itemsHtml = itemsRows(doc.items, doc.total, doc.scope);
  const party = `
    <div>
      <div style="font-size:10px;font-weight:800;letter-spacing:.08em;color:#8b8577">${kind === 'quote' ? 'QUOTATION FOR' : 'BILL TO'}</div>
      <div style="font-weight:800;font-size:14px;margin-top:4px">${esc(doc.customer?.name || c.name)}</div>
      <div style="font-size:11px;color:#5d6470">${esc([c.area, c.contact_name].filter(Boolean).join(' · '))}</div>
      <div style="font-size:11px;color:#5d6470">${esc(c.phone || '')}</div>
    </div>`;

  let metaRight = '';
  let extraTotals = '';
  let title = 'QUOTATION';
  if (kind === 'quote') {
    metaRight = `<div><b>${esc(doc.number)}</b></div><div>Date: ${fmtDate(new Date())}</div><div>Valid till: ${fmtDate(doc.valid_till)}</div>`;
  } else {
    title = 'TAX INVOICE';
    metaRight = `<div><b>${esc(doc.number)}</b></div><div>Issued: ${fmtDate(doc.issue_date)}</div><div>Due: ${fmtDate(doc.due_date)}</div>`;
    extraTotals = `
      <div><span style="color:#1a7f4b">Received</span><b style="color:#1a7f4b">${inr(doc.paid)}</b></div>
      <div class="grand"><span>Balance Due</span><span>${inr(doc.balance)}</span></div>`;
  }

  const terms = kind === 'quote'
    ? `${esc(co.extras || '')}<br/>${esc(co.quoteTerms || '')}`
    : `${esc(co.invoiceTerms || '')} ${esc(co.extras || '')}`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(doc.number)}</title><style>${BASE_STYLE}</style></head><body>
    <div class="head">
      <div><img src="${esc(co.logo || '')}" alt="" style="height:58px;max-width:260px;object-fit:contain"/></div>
      <div class="co"><b>${esc(co.name)}</b><br/>${esc(co.address)}<br/>${esc(co.phone)} · ${esc(co.email)}<br/>${esc(co.web)}${co.gstin ? ' · GSTIN ' + esc(co.gstin) : ''}</div>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:14px">
      ${party}
      <div style="text-align:right"><div style="font-size:22px;font-weight:800">${title}</div><div style="margin-top:6px;line-height:1.6">${metaRight}</div></div>
    </div>
    <table><thead><tr><th style="width:30px">#</th><th>Description</th><th class="num" style="width:110px">Amount</th></tr></thead><tbody>${itemsHtml}</tbody></table>
    ${totalsBlock(doc.total, extraTotals)}
    <div class="terms"><b>Terms &amp; Conditions</b><br/>${terms}</div>
  </body></html>`;
}

function normalizePhone(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  if (!d) return '';
  return d.startsWith('91') && d.length >= 12 ? d : '91' + d.replace(/^0+/, '').slice(-10);
}

module.exports = { buildDocumentHtml, normalizePhone, inr, fmtDate };
