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

function backup(dataDir) {
  try {
    if (!fs.existsSync(dbFile)) return;
    const dir = path.join(dataDir, 'backups');
    fs.mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    fs.copyFileSync(dbFile, path.join(dir, `erp-${stamp}.sqlite`));
    const old = fs.readdirSync(dir).filter((f) => f.endsWith('.sqlite')).sort();
    while (old.length > 10) fs.unlinkSync(path.join(dir, old.shift()));
  } catch (e) { /* backups are best-effort */ }
}

/** Load the saved snapshot (string of JSON) or '{}' on first run. */
function loadState() {
  try {
    const row = db.prepare('SELECT json FROM state WHERE id = 1').get();
    return row ? row.json : '{}';
  } catch (e) { return '{}'; }
}

/** Save snapshot + refresh the mirrored per-entity tables (one transaction). */
function saveState(jsonText) {
  const parsed = JSON.parse(jsonText); // throws on bad JSON → caller returns 400
  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO state (id, json, updated_at) VALUES (1, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at
    `).run(jsonText);

    const entities = (parsed && parsed.DB && typeof parsed.DB === 'object') ? parsed.DB : {};
    for (const [name, rows] of Object.entries(entities)) {
      if (!Array.isArray(rows)) continue;
      const t = 'erp_' + ident(name);
      db.exec(`CREATE TABLE IF NOT EXISTS ${t} (id INTEGER PRIMARY KEY, json TEXT NOT NULL)`);
      db.prepare(`DELETE FROM ${t}`).run();
      const ins = db.prepare(`INSERT OR REPLACE INTO ${t} (id, json) VALUES (?, ?)`);
      let auto = 1;
      for (const r of rows) ins.run(Number.isFinite(r?.id) ? r.id : auto++, JSON.stringify(r));
    }
    if (Array.isArray(parsed.TEAM)) {
      db.exec(`CREATE TABLE IF NOT EXISTS erp_team (id INTEGER PRIMARY KEY, json TEXT NOT NULL)`);
      db.prepare('DELETE FROM erp_team').run();
      const ins = db.prepare('INSERT OR REPLACE INTO erp_team (id, json) VALUES (?, ?)');
      parsed.TEAM.forEach((r, i) => ins.run(Number.isFinite(r?.id) ? r.id : i + 1, JSON.stringify(r)));
    }
  });
  tx();
  return true;
}

function close() { try { db && db.close(); } catch (e) { /* ignore */ } }

module.exports = { init, loadState, saveState, close, get file() { return dbFile; } };
