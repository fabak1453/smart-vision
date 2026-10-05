'use strict';
// The bill / quotation PDF the shop PC builds for WhatsApp. The sheet itself
// comes from app/bill-format.js — the same builder the in-app A4 print uses —
// so the printed copy and the WhatsApp copy are always the same document.
const Bill = require('../app/bill-format.js');

const inr = Bill.money;
const fmtDate = Bill.fmtDate;
const esc = Bill.esc;

/** The page is served from /api/whatsapp/document/…, so a relative asset path
 *  like ./assets/sv-logo.png has to be made root-relative to resolve. */
function resolveLogoSrc(logo) {
  if (!logo) return '';
  const s = String(logo);
  if (s.startsWith('data:') || s.startsWith('http://') || s.startsWith('https://')) return s;
  return '/' + s.replace(/^\.?\//, '');
}

function buildDocumentHtml(kind, doc, company, customer) {
  const co = Object.assign({}, company || {}, { logo: resolveLogoSrc(company && company.logo) });
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(doc && doc.number)}</title>
<style>@page{size:A4;margin:14mm}html,body{margin:0;padding:0;background:#fff}${Bill.css}</style>
</head><body>${Bill.sheetHtml(kind, doc || {}, co, customer || {})}</body></html>`;
}

function normalizePhone(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  if (!d) return '';
  return d.startsWith('91') && d.length >= 12 ? d : '91' + d.replace(/^0+/, '').slice(-10);
}

module.exports = { buildDocumentHtml, normalizePhone, inr, fmtDate, resolveLogoSrc };
