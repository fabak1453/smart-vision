'use strict';
/**
 * Smart Vision ERP — Excel-friendly CSV backup / restore
 *
 * v2 (default export): one ## section per table with normal columns.
 *   Edit in Excel, leave id blank for new rows, use plain names for links.
 * v1 (legacy): entity,id,json — still accepted on restore.
 *
 * Conflict rules on import:
 *   • Duplicate business keys (name / number / sku / serial_no) → last row wins
 *   • Blank id → auto-assigned
 *   • Invoice balance recomputed as total − paid
 *   • Restore replaces every ERP table (full snapshot)
 */

const MARKER_V1 = '# Smart Vision ERP backup v1';
const MARKER_V2 = '# Smart Vision ERP backup v2';
const MARKER = MARKER_V2;

const TABLE_ORDER = [
  'team', 'customers', 'leads', 'quotes', 'invoices', 'jobs', 'tickets', 'amc',
  'products', 'serials', 'equipment', 'credentials', 'purchaseOrders', 'repairs',
  'catalog', 'company',
];

const SCHEMAS = {
  team: {
    cols: ['id', 'name', 'role', 'phone', 'login_username', 'login_password'],
    key: (r) => String(r.name || '').toLowerCase(),
  },
  catalog: {
    cols: ['id', 'group', 'brand', 'price', 'items'],
    key: (r) => String(r.group || '').toLowerCase() + '|' + String(r.brand || '').toLowerCase(),
    nums: ['price'],
    lists: { items: 'textList' },
  },
  company: {
    cols: ['id', 'name', 'phone', 'email', 'web', 'address', 'gstin', 'logo', 'extras', 'quoteTerms', 'invoiceTerms'],
    key: () => 'company',
  },
  customers: {
    cols: ['id', 'name', 'area', 'type', 'contact_name', 'phone', 'sites', 'owner', 'lifetime_value'],
    key: (r) => String(r.name || '').toLowerCase(),
    refs: { owner: 'obj' },
    nums: ['sites', 'lifetime_value'],
  },
  leads: {
    cols: ['id', 'name', 'requirement', 'value', 'source', 'segment', 'owner', 'stage'],
    key: (r) => String(r.id || '') + '|' + String(r.name || '').toLowerCase(),
    refs: { owner: 'obj' },
    nums: ['value', 'stage'],
  },
  quotes: {
    cols: ['id', 'number', 'customer', 'scope', 'total', 'status', 'owner', 'valid_till', 'invoice_number', 'job_number', 'items'],
    key: (r) => String(r.number || '').toLowerCase(),
    refs: { customer: 'obj', owner: 'obj' },
    nums: ['total'],
    lists: { items: 'amountItems' },
  },
  invoices: {
    cols: ['id', 'number', 'customer', 'total', 'paid', 'balance', 'status', 'issue_date', 'due_date', 'note', 'items', 'payments'],
    key: (r) => String(r.number || '').toLowerCase(),
    refs: { customer: 'obj' },
    nums: ['total', 'paid', 'balance'],
    lists: { items: 'amountItems', payments: 'payments' },
  },
  jobs: {
    cols: ['id', 'number', 'customer', 'type', 'scope', 'scheduled_on', 'slot', 'technician', 'status', 'checklist'],
    key: (r) => String(r.number || '').toLowerCase(),
    refs: { customer: 'obj', technician: 'obj' },
    lists: { checklist: 'checklist' },
  },
  tickets: {
    cols: ['id', 'number', 'customer', 'issue', 'priority', 'coverage', 'assignee', 'status', 'sla_state', 'activities'],
    key: (r) => String(r.number || '').toLowerCase(),
    refs: { customer: 'obj', assignee: 'obj' },
    lists: { activities: 'activities' },
  },
  amc: {
    cols: ['id', 'number', 'customer', 'plan', 'devices', 'value', 'starts_on', 'ends_on', 'visits_total', 'visits_used', 'status', 'invoice_number'],
    key: (r) => String(r.number || '').toLowerCase(),
    refs: { customer: 'obj' },
    nums: ['devices', 'value', 'visits_total', 'visits_used'],
  },
  products: {
    cols: ['id', 'sku', 'name', 'specs', 'category', 'purchase_price', 'sale_price', 'stock', 'reserved', 'reorder_level', 'track_serials'],
    key: (r) => String(r.sku || '').toLowerCase(),
    nums: ['purchase_price', 'sale_price', 'stock', 'reserved', 'reorder_level'],
    bools: ['track_serials'],
  },
  serials: {
    cols: ['id', 'serial_no', 'product', 'customer', 'status', 'in_warranty', 'sold_on', 'warranty_end'],
    key: (r) => String(r.serial_no || '').toLowerCase(),
    refs: { product: 'obj', customer: 'obj' },
    bools: ['in_warranty'],
  },
  equipment: {
    cols: ['id', 'name', 'customer', 'product', 'serial_no', 'location', 'installed_on', 'warranty_end', 'in_warranty'],
    key: (r) => String(r.serial_no || r.id || '') + '|' + String(r.customer || '').toLowerCase(),
    refs: { customer: 'obj', product: 'obj' },
    bools: ['in_warranty'],
  },
  credentials: {
    cols: ['id', 'label', 'customer', 'host', 'port', 'username', 'password', 'notes'],
    key: (r) => String(r.customer || '').toLowerCase() + '|' + String(r.label || '').toLowerCase(),
    refs: { customer: 'obj' },
    nums: ['port'],
  },
  purchaseOrders: {
    cols: ['id', 'number', 'supplier', 'ordered_on', 'eta', 'total', 'status', 'items'],
    key: (r) => String(r.number || '').toLowerCase(),
    refs: { supplier: 'obj' },
    nums: ['total'],
    lists: { items: 'poItems' },
  },
  repairs: {
    cols: ['id', 'number', 'customer', 'device', 'serial_no', 'issue', 'coverage', 'received_on', 'promised_on', 'technician', 'charge', 'status', 'invoice_number'],
    key: (r) => String(r.number || '').toLowerCase(),
    refs: { customer: 'obj', technician: 'obj' },
    nums: ['charge'],
  },
};

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

function nameOf(v) {
  if (v == null || v === '') return '';
  if (typeof v === 'object') return v.name || v.serial_no || '';
  return String(v);
}

function asObj(name) {
  const n = String(name || '').trim();
  return n ? { name: n } : null;
}

function encodeTextList(items) {
  if (!Array.isArray(items) || !items.length) return '';
  return items.map((s) => String(s || '').replace(/\|/g, '/')).join('|');
}
function decodeTextList(s) {
  if (!String(s || '').trim()) return [];
  return String(s).split('|').map((x) => x.trim()).filter(Boolean);
}

function encodeAmountItems(items) {
  if (!Array.isArray(items) || !items.length) return '';
  return items.map((it) => {
    const qty = it.qty != null && it.qty !== '' ? it.qty : 1;
    const pid = it.product_id != null && it.product_id !== '' ? it.product_id : '';
    return `${String(it.description || '').replace(/\|/g, '/')}|${it.amount ?? 0}|${qty}|${pid}`;
  }).join(';');
}

function decodeAmountItems(s) {
  if (!String(s || '').trim()) return [];
  return String(s).split(';').map((part, i) => {
    const p = part.trim();
    if (!p) return null;
    const bits = p.split('|');
    if (bits.length === 1) return { id: i + 1, description: p, amount: 0, qty: 1 };
    if (bits.length === 2) {
      return { id: i + 1, description: bits[0].trim(), amount: Number(bits[1]) || 0, qty: 1 };
    }
    const pidRaw = bits[3] != null ? String(bits[3]).trim() : '';
    return {
      id: i + 1,
      description: bits[0].trim(),
      amount: Number(bits[1]) || 0,
      qty: Number(bits[2]) || 1,
      product_id: pidRaw ? (Number(pidRaw) || pidRaw) : null,
    };
  }).filter(Boolean);
}

function encodePoItems(items) {
  if (!Array.isArray(items) || !items.length) return '';
  return items.map((it) => `${it.description || ''}|${it.qty ?? 0}|${it.unit_price ?? 0}`).join(';');
}

function decodePoItems(s) {
  if (!String(s || '').trim()) return [];
  return String(s).split(';').map((part, i) => {
    const p = part.trim();
    if (!p) return null;
    const bits = p.split('|');
    return {
      id: i + 1,
      description: (bits[0] || '').trim(),
      qty: Number(bits[1]) || 0,
      unit_price: Number(bits[2]) || 0,
    };
  }).filter(Boolean);
}

function encodeChecklist(items) {
  if (!Array.isArray(items) || !items.length) return '';
  return items.map((it) => `${it.label || ''}|${it.done ? 1 : 0}`).join(';');
}

function decodeChecklist(s) {
  if (!String(s || '').trim()) return [];
  return String(s).split(';').map((part, i) => {
    const p = part.trim();
    if (!p) return null;
    const bar = p.lastIndexOf('|');
    if (bar < 0) return { id: i + 1, label: p, done: false };
    const flag = p.slice(bar + 1).trim().toLowerCase();
    return { id: i + 1, label: p.slice(0, bar).trim(), done: flag === '1' || flag === 'true' || flag === 'yes' };
  }).filter(Boolean);
}

function encodePayments(items) {
  if (!Array.isArray(items) || !items.length) return '';
  return items.map((it) => `${it.amount ?? 0}|${it.on || ''}`).join(';');
}

function decodePayments(s) {
  if (!String(s || '').trim()) return [];
  return String(s).split(';').map((part) => {
    const p = part.trim();
    if (!p) return null;
    const bar = p.indexOf('|');
    if (bar < 0) return { amount: Number(p) || 0, on: '' };
    return { amount: Number(p.slice(0, bar)) || 0, on: p.slice(bar + 1).trim() };
  }).filter(Boolean);
}

function encodeActivities(items) {
  if (!Array.isArray(items) || !items.length) return '';
  return items.map((it) => `${String(it.note || '').replace(/\|/g, '/')}|${it.created_at || ''}`).join(';');
}

function decodeActivities(s) {
  if (!String(s || '').trim()) return [];
  return String(s).split(';').map((part, i) => {
    const p = part.trim();
    if (!p) return null;
    const bar = p.lastIndexOf('|');
    if (bar < 0) return { id: i + 1, note: p, created_at: '' };
    return { id: i + 1, note: p.slice(0, bar).trim(), created_at: p.slice(bar + 1).trim() };
  }).filter(Boolean);
}

const LIST_ENC = {
  amountItems: encodeAmountItems,
  poItems: encodePoItems,
  checklist: encodeChecklist,
  payments: encodePayments,
  activities: encodeActivities,
  textList: encodeTextList,
};
const LIST_DEC = {
  amountItems: decodeAmountItems,
  poItems: decodePoItems,
  checklist: decodeChecklist,
  payments: decodePayments,
  activities: decodeActivities,
  textList: decodeTextList,
};

function rowToFlat(table, row) {
  const schema = SCHEMAS[table];
  if (!schema) return null;
  const out = {};
  schema.cols.forEach((c) => { out[c] = ''; });
  out.id = row.id ?? '';
  schema.cols.forEach((c) => {
    if (c === 'id') return;
    if (schema.lists && schema.lists[c]) {
      out[c] = LIST_ENC[schema.lists[c]](row[c]);
      return;
    }
    if (schema.refs && schema.refs[c] === 'obj') {
      out[c] = nameOf(row[c]);
      return;
    }
    if (c === 'serial_no' && table === 'equipment') {
      out[c] = row.serial?.serial_no || row.serial_no || '';
      return;
    }
    if (schema.bools && schema.bools.includes(c)) {
      out[c] = row[c] ? '1' : '0';
      return;
    }
    const v = row[c];
    out[c] = v == null ? '' : v;
  });
  return out;
}

function flatToRow(table, flat) {
  const schema = SCHEMAS[table];
  if (!schema) return null;
  const row = {};
  schema.cols.forEach((c) => {
    let v = flat[c];
    if (v === undefined || v === null) v = '';
    v = String(v).trim();
    if (c === 'id') {
      row.id = v === '' ? null : Number(v);
      if (!Number.isFinite(row.id)) row.id = null;
      return;
    }
    if (schema.lists && schema.lists[c]) {
      row[c] = LIST_DEC[schema.lists[c]](v);
      return;
    }
    if (schema.refs && schema.refs[c] === 'obj') {
      row[c] = asObj(v);
      return;
    }
    if (c === 'serial_no' && table === 'equipment') {
      row.serial = v ? { serial_no: v } : null;
      return;
    }
    if (schema.bools && schema.bools.includes(c)) {
      const low = v.toLowerCase();
      row[c] = low === '1' || low === 'true' || low === 'yes';
      return;
    }
    if (schema.nums && schema.nums.includes(c)) {
      row[c] = v === '' ? 0 : Number(v);
      if (!Number.isFinite(row[c])) row[c] = 0;
      return;
    }
    row[c] = v;
  });
  if (table === 'invoices') {
    row.total = Number(row.total) || 0;
    row.paid = Number(row.paid) || 0;
    row.balance = row.total - row.paid;
    if (!Array.isArray(row.payments)) row.payments = [];
    if (!Array.isArray(row.items)) row.items = [];
  }
  if (table === 'quotes' && !Array.isArray(row.items)) row.items = [];
  if (table === 'jobs' && !Array.isArray(row.checklist)) row.checklist = [];
  if (table === 'tickets' && !Array.isArray(row.activities)) row.activities = [];
  if (table === 'purchaseOrders' && !Array.isArray(row.items)) row.items = [];
  if (table === 'serials' && !row.customer) row.customer = null;
  if ((table === 'jobs' || table === 'repairs' || table === 'tickets') && row.technician === undefined) { /* ok */ }
  return row;
}

function dedupeAndAssignIds(table, rows) {
  const schema = SCHEMAS[table];
  const byKey = new Map();
  rows.forEach((r) => {
    if (!r) return;
    const k = schema && schema.key ? schema.key(r) : String(r.id || Math.random());
    if (!k || k === '|' || k === 'null') return;
    byKey.set(k, r);
  });
  const out = Array.from(byKey.values());
  let maxId = 0;
  out.forEach((r) => { if (Number.isFinite(r.id) && r.id > maxId) maxId = r.id; });
  out.forEach((r) => {
    if (!Number.isFinite(r.id) || r.id <= 0) r.id = ++maxId;
  });
  // Final id-collision fix (two different keys with same id)
  const seenId = new Set();
  out.forEach((r) => {
    if (seenId.has(r.id)) r.id = ++maxId;
    seenId.add(r.id);
  });
  return out;
}

function stateToCsv(state) {
  const lines = [
    MARKER_V2,
    '# Excel-friendly backup — one section per table. Save as CSV UTF-8.',
    '# Leave id blank for new rows. Use plain names for customer / owner / technician.',
    '# Quote/invoice line items: Description|Amount;Description|Amount',
    '# PO items: Description|Qty|UnitPrice   Checklist: Label|1 or Label|0',
    '# Payments: Amount|YYYY-MM-DD   Activities: Note|YYYY-MM-DD',
    '# Catalog items: feature1|feature2|feature3',
    '# Unique keys (last row wins on restore): customer name, document number, sku, serial_no',
    '',
  ];
  const db = (state && state.DB) || {};
  const team = (state && state.TEAM) || [];
  const catalog = (state && state.CATALOG) || [];
  const company = (state && state.COMPANY) || null;

  TABLE_ORDER.forEach((table) => {
    const schema = SCHEMAS[table];
    if (!schema) return;
    let rows;
    if (table === 'team') rows = Array.isArray(team) ? team : [];
    else if (table === 'catalog') rows = Array.isArray(catalog) ? catalog : [];
    else if (table === 'company') rows = company ? [{ id: 1, ...company }] : [];
    else rows = Array.isArray(db[table]) ? db[table] : [];
    lines.push('## ' + table);
    lines.push(schema.cols.join(','));
    rows.forEach((row) => {
      const flat = rowToFlat(table, row);
      if (!flat) return;
      lines.push(schema.cols.map((c) => csvCell(flat[c])).join(','));
    });
    lines.push('');
  });

  // Any unknown DB tables → keep as v1-style JSON rows so nothing is lost
  Object.keys(db).forEach((table) => {
    if (SCHEMAS[table] || !Array.isArray(db[table])) return;
    lines.push('## ' + table + ' (json)');
    lines.push('id,json');
    db[table].forEach((row) => {
      lines.push([csvCell(row.id ?? ''), csvCell(JSON.stringify(row))].join(','));
    });
    lines.push('');
  });

  return '\uFEFF' + lines.join('\r\n');
}

function parseV1(lines) {
  const head = (lines[0] || '').toLowerCase();
  if (!head.startsWith('entity,')) throw new Error('invalid backup header');
  const DB = {};
  const TEAM = [];
  const counts = {};
  for (let i = 1; i < lines.length; i++) {
    const cols = parseRow(lines[i]);
    if (cols.length < 3) continue;
    const entity = cols[0];
    const jsonRaw = cols.length === 3 ? cols[2] : cols.slice(2).join(',');
    if (!jsonRaw) continue;
    let rec;
    try { rec = JSON.parse(jsonRaw); } catch (e) { continue; }
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

function parseV2(rawLines) {
  const DB = {};
  const TEAM = [];
  const counts = {};
  let section = null;
  let cols = null;
  let jsonMode = false;

  const flushSection = () => { section = null; cols = null; jsonMode = false; };

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (!line || !line.trim()) continue;
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) {
      const m = trimmed.match(/^##\s+([A-Za-z0-9_]+)/);
      if (m) {
        section = m[1];
        cols = null;
        jsonMode = /\(json\)/i.test(trimmed);
        if (!jsonMode && !SCHEMAS[section] && section !== 'team') {
          // unknown flat section — treat as opaque skip until next ##
        }
      }
      continue;
    }
    if (!section) continue;
    if (!cols) {
      cols = parseRow(line).map((c) => c.trim());
      continue;
    }
    const vals = parseRow(line);
    const flat = {};
    cols.forEach((c, idx) => { flat[c] = vals[idx] != null ? vals[idx] : ''; });

    if (jsonMode) {
      let rec;
      try { rec = JSON.parse(flat.json || ''); } catch (e) { continue; }
      if (section === 'team') {
        TEAM.push(rec);
        counts.team = (counts.team || 0) + 1;
      } else {
        if (!DB[section]) DB[section] = [];
        DB[section].push(rec);
        counts[section] = (counts[section] || 0) + 1;
      }
      continue;
    }

    if (!SCHEMAS[section]) continue;
    const row = flatToRow(section, flat);
    if (!row) continue;
    // Skip completely empty data rows (Excel leftover)
    const meaningful = SCHEMAS[section].cols.some((c) => c !== 'id' && String(flat[c] || '').trim());
    if (!meaningful) continue;

    if (section === 'team') {
      TEAM.push(row);
    } else {
      if (!DB[section]) DB[section] = [];
      DB[section].push(row);
    }
  }

  // Dedupe + assign ids
  if (TEAM.length) {
    const cleaned = dedupeAndAssignIds('team', TEAM);
    TEAM.length = 0;
    cleaned.forEach((t) => TEAM.push(t));
    counts.team = TEAM.length;
  }
  Object.keys(DB).forEach((table) => {
    if (!SCHEMAS[table]) {
      counts[table] = DB[table].length;
      return;
    }
    DB[table] = dedupeAndAssignIds(table, DB[table]);
    counts[table] = DB[table].length;
  });

  // Ensure known tables exist (empty) so restore clears them when section omitted? 
  // Full snapshot: only tables present in file are replaced via applyState clearing all then filling.
  // applyState clears all DB keys then pushes from newDB — missing tables stay empty. Good.

  if (!Object.keys(counts).length) throw new Error('no records in backup');
  flushSection();

  let CATALOG = null;
  let COMPANY = null;
  if (Array.isArray(DB.catalog)) {
    CATALOG = DB.catalog.map((r) => ({
      id: r.id,
      group: r.group,
      brand: r.brand,
      price: Number(r.price) || 0,
      items: Array.isArray(r.items) ? r.items : [],
    }));
    counts.catalog = CATALOG.length;
    delete DB.catalog;
  }
  if (Array.isArray(DB.company) && DB.company.length) {
    const c = DB.company[0];
    COMPANY = {
      name: c.name || '', phone: c.phone || '', email: c.email || '', web: c.web || '',
      address: c.address || '', gstin: c.gstin || '', logo: c.logo || '',
      extras: c.extras || '', quoteTerms: c.quoteTerms || '', invoiceTerms: c.invoiceTerms || '',
    };
    counts.company = 1;
    delete DB.company;
  }

  return { state: { DB, TEAM, CATALOG, COMPANY }, counts };
}

function csvToState(text) {
  const raw = String(text || '').replace(/^\uFEFF/, '');
  const allLines = raw.split(/\r?\n/);
  const markerLine = allLines.find((l) => l.startsWith('# Smart Vision ERP backup'));
  const dataLines = allLines.filter((l) => l && !l.startsWith('#'));

  // v2 if marker says v2 OR file has ## section headers
  const hasSections = allLines.some((l) => /^##\s+\w+/.test(l.trim()));
  const isV2 = (markerLine && markerLine.includes('v2')) || hasSections;
  if (isV2) return parseV2(allLines);

  // v1
  if (!dataLines.length) throw new Error('empty backup');
  return parseV1(dataLines);
}

function countCsvRecords(csvText) {
  const raw = String(csvText || '').replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/);
  let n = 0;
  let inSection = false;
  let headerDone = false;
  for (const line of lines) {
    if (!line || !line.trim()) continue;
    const t = line.trim();
    if (t.startsWith('## ')) { inSection = true; headerDone = false; continue; }
    if (t.startsWith('#')) continue;
    if (t.toLowerCase().startsWith('entity,')) { inSection = true; headerDone = true; continue; }
    if (inSection && !headerDone) { headerDone = true; continue; } // column header
    if (inSection && headerDone) n++;
  }
  // Fallback for weird files
  if (n === 0) {
    return lines.filter((l) => l && !l.startsWith('#') && !/^##/.test(l.trim())
      && !l.toLowerCase().startsWith('entity,')
      && !/^(id,|table,)/i.test(l)).length;
  }
  return n;
}

(function attachSvBackupCsv(root) {
  const exported = {
    MARKER,
    MARKER_V1,
    MARKER_V2,
    SCHEMAS,
    TABLE_ORDER,
    stateToCsv,
    csvToState,
    countCsvRecords,
    csvCell,
    parseRow,
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exported;
  }
  if (root) root.SvBackupCsv = exported;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof global !== 'undefined' ? global : null));
