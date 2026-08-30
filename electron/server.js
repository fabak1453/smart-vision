// ============================================================================
// Smart Vision ERP — embedded local server
//  Serves the app's static files and implements the same ./api.php contract
//  the app already uses (GET = load state, POST = save state), backed by
//  SQLite. Listens only on 127.0.0.1 with a random free port.
// ============================================================================
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const store = require('./db');
const { stateToCsv, csvToState } = require('./backup-csv');
const { buildDocumentHtml, normalizePhone } = require('./document-html');
const crypto = require('crypto');

const pendingWaDocs = new Map();
function pruneWaDocs() {
  const now = Date.now();
  for (const [id, row] of pendingWaDocs) {
    if (now - row.at > 60 * 60 * 1000) pendingWaDocs.delete(id);
  }
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jsx': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

function start(appDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try { handle(req, res, appDir); }
      catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'server error' }));
      }
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
    server.on('error', reject);
  });
}

function handle(req, res, appDir) {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);

  function readBody(request, response, onEnd) {
    let body = '';
    let tooBig = false;
    request.on('data', (c) => {
      if (tooBig) return;
      body += c;
      if (body.length > 50 * 1024 * 1024) {
        tooBig = true;
        body = '';
        try {
          response.writeHead(413, { 'Content-Type': 'application/json' });
          response.end(JSON.stringify({ error: 'payload too large' }));
        } catch (e) { /* already closed */ }
        request.destroy();
      }
    });
    request.on('end', () => { if (!tooBig) onEnd(body); });
    request.on('error', () => {
      if (tooBig) return;
      response.writeHead(500, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: 'read error' }));
    });
  }

  // ---- data API (same contract as api.php / server.py / Netlify fn) ----
  if (urlPath.replace(/\/+$/, '').endsWith('/api.php')) {
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(store.loadState());
    }
    if (req.method === 'POST') {
      return readBody(req, res, (body) => {
        try {
          store.saveState(body || 'null');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, bytes: body.length }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'invalid json' }));
        }
      });
    }
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'method not allowed' }));
  }

  // ---- CSV backup (reads/writes the same SQLite snapshot as api.php) ----
  if (urlPath.replace(/\/+$/, '').endsWith('/backup/export')) {
    if (req.method !== 'GET') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'method not allowed' }));
    }
    let state = {};
    try { state = JSON.parse(store.loadState() || '{}'); } catch (e) { state = {}; }
    const csv = stateToCsv(state);
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="cctv-erp-backup.csv"',
    });
    return res.end(csv);
  }
  if (urlPath.replace(/\/+$/, '').endsWith('/backup/import')) {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'method not allowed' }));
    }
    return readBody(req, res, (body) => {
      try {
        const parsed = csvToState(body);
        let existing = {};
        try { existing = JSON.parse(store.loadState() || '{}'); } catch (e) { existing = {}; }
        const present = new Set(parsed.sections || Object.keys((parsed.state && parsed.state.DB) || {}));
        if (Array.isArray(parsed.state && parsed.state.TEAM)) present.add('team');
        const edb = (existing && existing.DB) || {};
        const omitted = Object.keys(edb).filter((k) => Array.isArray(edb[k]) && edb[k].length && !present.has(k));
        if (omitted.length) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Incomplete backup (missing ## ' + omitted.join(', ## ') + '). Restore cancelled so live data is not wiped.' }));
        }
        store.saveState(JSON.stringify(parsed.state));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, restored: parsed.counts }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message || 'invalid backup' }));
      }
    });
  }

  // ---- WhatsApp Web (message + optional PDF document) ----
  if (urlPath.replace(/\/+$/, '').endsWith('/api/whatsapp/send')) {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'method not allowed' }));
    }
    return readBody(req, res, (body) => {
      try {
        const payload = JSON.parse(body || '{}');
        const customerName = String(payload.customerName || '').trim();
        const message = String(payload.message || '').trim();
        if (!customerName || !message) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'customerName and message required' }));
        }
        let state = {};
        try { state = JSON.parse(store.loadState() || '{}'); } catch (e) { state = {}; }
        const customers = (state.DB && state.DB.customers) || [];
        const customer = customers.find((c) => c.name === customerName);
        const phone = normalizePhone(customer && customer.phone);
        if (!phone) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: `No phone number on file for "${customerName}".` }));
        }
        const whatsappWebUrl = `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
        let pdfUrl = null;
        let filename = null;
        if (payload.kind && payload.doc) {
          pruneWaDocs();
          const id = crypto.randomBytes(12).toString('hex');
          const html = buildDocumentHtml(payload.kind, payload.doc, payload.company || {}, customer);
          pendingWaDocs.set(id, { html, at: Date.now() });
          pdfUrl = `/api/whatsapp/document/${id}.html`;
          const num = payload.doc.number || 'document';
          filename = `${payload.kind}-${String(num).replace(/[^\w.-]+/g, '_')}.pdf`;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, whatsappWebUrl, pdfUrl, filename, phone }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'whatsapp prepare failed' }));
      }
    });
  }
  const docMatch = urlPath.match(/\/api\/whatsapp\/document\/([a-f0-9]+)\.html$/);
  if (docMatch) {
    const row = pendingWaDocs.get(docMatch[1]);
    if (!row) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(row.html);
  }

  // ---- static files ----
  let rel = urlPath === '/' ? '/index.html' : urlPath;
  const file = path.normalize(path.join(appDir, rel));
  if (!file.startsWith(path.normalize(appDir))) { // path traversal guard
    res.writeHead(403); return res.end();
  }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
}

module.exports = { start };
