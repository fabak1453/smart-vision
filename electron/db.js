// ============================================================================
// Smart Vision ERP — SQLite storage (better-sqlite3)
//  • `state` table holds the full app snapshot (what the app loads/saves)
//  • Each entity is also mirrored into its own table (customers, leads,
//    quotes, invoices, jobs, tickets, amc, products, ...) so the data is
//    real, queryable SQL — open erp.sqlite with any SQLite browser.
//  • Automatic rotating backups on every start (keeps the last 10).
// ============================================================================
'use strict';
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

let db = null;
let dbFile = null;

const ident = (s) => String(s).replace(/[^A-Za-z0-9_]/g, '_'); // safe table name

function init(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  dbFile = path.join(dataDir, 'erp.sqlite');
  backup(dataDir); // rotate a backup of the previous session first
  db = new Database(dbFile);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
  return dbFile;
}

function copyIfExists(src, dest) {
  if (fs.existsSync(src)) fs.copyFileSync(src, dest);
}

function backup(dataDir) {
  try {
    if (!fs.existsSync(dbFile)) return;
    const dir = path.join(dataDir, 'backups');
    fs.mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const dest = path.join(dir, `erp-${stamp}.sqlite`);
    copyIfExists(dbFile, dest);
    copyIfExists(dbFile + '-wal', dest + '-wal');
    copyIfExists(dbFile + '-shm', dest + '-shm');
    const old = fs.readdirSync(dir).filter((f) => f.endsWith('.sqlite')).sort();
    while (old.length > 10) {
      const base = old.shift();
      const p = path.join(dir, base);
      try { fs.unlinkSync(p); } catch (e) { /* ignore */ }
      try { fs.unlinkSync(p + '-wal'); } catch (e) { /* ignore */ }
      try { fs.unlinkSync(p + '-shm'); } catch (e) { /* ignore */ }
    }
  } catch (e) { /* backups are best-effort */ }
}

function getMeta(key) {
  try {
    const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key);
    return row ? row.value : null;
  } catch (e) { return null; }
}
function setMeta(key, value) {
  db.prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, String(value));
}

function getRevision() {
  const n = parseInt(getMeta('revision') || '0', 10);
  return Number.isFinite(n) ? n : 0;
}
function setRevision(n) {
  setMeta('revision', String(n));
}

/**
 * A counter bumped on EVERY write, whoever made it — the PC window, a phone
 * sync, or a CSV restore. Clients poll it to notice that the database changed
 * underneath them. Deliberately separate from `revision`, which belongs to the
 * phone merge protocol and must not move on an ordinary autosave.
 */
function getSeq() {
  const n = parseInt(getMeta('seq') || '0', 10);
  return Number.isFinite(n) ? n : 0;
}
function stateStamp() {
  return { seq: getSeq(), revision: getRevision(), savedAt: Number(getMeta('savedAt')) || 0 };
}

/** Load the saved snapshot (string of JSON) or '{}' on first run. */
function loadState() {
  try {
    const row = db.prepare('SELECT json FROM state WHERE id = 1').get();
    if (!row) return '{}';
    try {
      const parsed = JSON.parse(row.json);
      if (parsed && parsed.revision == null) parsed.revision = getRevision();
      return JSON.stringify(parsed);
    } catch (e) { return row.json; }
  } catch (e) { return '{}'; }
}

function upsertEntityTable(name, rows) {
  if (!Array.isArray(rows)) return;
  const t = 'erp_' + ident(name);
  db.exec(`CREATE TABLE IF NOT EXISTS ${t} (id INTEGER PRIMARY KEY, json TEXT NOT NULL)`);
  const ins = db.prepare(`INSERT INTO ${t} (id, json) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET json = excluded.json`);
  const ids = [];
  let auto = 1;
  for (const r of rows) {
    const id = Number.isFinite(r?.id) ? r.id : auto++;
    ids.push(id);
    ins.run(id, JSON.stringify(r));
  }
  if (!ids.length) {
    db.prepare(`DELETE FROM ${t}`).run();
    return;
  }
  db.prepare(`DELETE FROM ${t} WHERE id NOT IN (SELECT CAST(value AS INTEGER) FROM json_each(?))`).run(JSON.stringify(ids));
}

/** Save snapshot + refresh the mirrored per-entity tables (one transaction). */
function saveState(jsonText) {
  const parsed = JSON.parse(jsonText); // throws on bad JSON → caller returns 400
  const prevRev = getRevision();
  const incomingRev = Number(parsed.revision);
  parsed.revision = Math.max(prevRev, Number.isFinite(incomingRev) ? incomingRev : 0);
  // Every snapshot on disk carries a time. A restore that arrived without one
  // used to look infinitely old, so the app preferred its own stale copy and
  // quietly undid the restore on the next start.
  if (!Number(parsed.savedAt)) parsed.savedAt = Date.now();
  const nextSeq = getSeq() + 1;
  jsonText = JSON.stringify(parsed);
  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO state (id, json, updated_at) VALUES (1, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at
    `).run(jsonText);

    const entities = (parsed && parsed.DB && typeof parsed.DB === 'object') ? parsed.DB : {};
    for (const [name, rows] of Object.entries(entities)) upsertEntityTable(name, rows);
    if (Array.isArray(parsed.TEAM)) upsertEntityTable('team', parsed.TEAM);
    if (parsed.revision != null) setRevision(parsed.revision);
    setMeta('seq', String(nextSeq));
    setMeta('savedAt', String(parsed.savedAt));
  });
  tx();
  return { ok: true, seq: nextSeq, revision: parsed.revision, savedAt: parsed.savedAt };
}

function close() { try { db && db.close(); } catch (e) { /* ignore */ } }

module.exports = { init, loadState, saveState, close, getMeta, setMeta, getRevision, setRevision, getSeq, stateStamp, get file() { return dbFile; } };
