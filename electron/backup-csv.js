'use strict';

const MARKER = '# Smart Vision ERP backup v1';

function csvCell(value) {
  const s = String(value ?? '');
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function parseRow(line) {
  const out = [];
  let cur = '';
  let i = 0;
  let quoted = false;
  while (i < line.length) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i += 2; continue; }
        quoted = false; i++; continue;
      }
      cur += ch; i++; continue;
    }
    if (ch === '"') { quoted = true; i++; continue; }
    if (ch === ',') { out.push(cur); cur = ''; i++; continue; }
    cur += ch; i++;
  }
  out.push(cur);
  return out;
}

/** Build CSV from persisted app state `{ DB, TEAM }`. */
function stateToCsv(state) {
  const lines = ['entity,id,json'];
  const db = (state && state.DB) || {};
  for (const [table, rows] of Object.entries(db)) {
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      lines.push([csvCell(table), csvCell(row.id ?? ''), csvCell(JSON.stringify(row))].join(','));
    }
  }
  const team = (state && state.TEAM) || [];
  if (Array.isArray(team)) {
    for (const row of team) {
      lines.push([csvCell('team'), csvCell(row.id ?? ''), csvCell(JSON.stringify(row))].join(','));
    }
  }
  return '\uFEFF' + MARKER + '\r\n' + lines.join('\r\n');
}

/** Parse backup CSV back into `{ DB, TEAM }`. */
function csvToState(text) {
  const raw = String(text || '').replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/).filter((l) => l && !l.startsWith('#'));
  if (!lines.length) throw new Error('empty backup');
  const head = lines[0].toLowerCase();
  if (!head.startsWith('entity,')) throw new Error('invalid backup header');
  const DB = {};
  const TEAM = [];
  const counts = {};
  for (let i = 1; i < lines.length; i++) {
    const cols = parseRow(lines[i]);
    if (cols.length < 3) continue;
    const entity = cols[0];
    let rec;
    try { rec = JSON.parse(cols[2]); } catch (e) { continue; }
    if (entity === 'team') {
      TEAM.push(rec);
      counts.team = (counts.team || 0) + 1;
    } else {
      if (!DB[entity]) DB[entity] = [];
      DB[entity].push(rec);
      counts[entity] = (counts[entity] || 0) + 1;
    }
  }
  if (!Object.keys(counts).length) throw new Error('no records in backup');
  return { state: { DB, TEAM }, counts };
}

module.exports = { stateToCsv, csvToState, MARKER };
