'use strict';
/**
 * Smart Vision ERP — shared data model (desktop + Android).
 * Snapshot helpers, document numbering, stock_moves, and LAN merge.
 * Load before smart-vision-app.js (browser) or require() from Node.
 */
(function (root) {
  const TABLE_KEYS = [
    'customers', 'leads', 'quotes', 'invoices', 'jobs', 'tickets', 'amc',
    'products', 'serials', 'equipment', 'credentials', 'purchaseOrders', 'repairs', 'ledger',
  ];
  const LIST_KEYS = { invoices: ['payments', 'items'], quotes: ['items'], jobs: ['checklist'], tickets: ['activities'], purchaseOrders: ['items'] };
  const BUSINESS_KEY = {
    customers: (r) => String(r.name || '').toLowerCase(),
    quotes: (r) => String(r.number || '').toLowerCase(),
    invoices: (r) => String(r.number || '').toLowerCase(),
    jobs: (r) => String(r.number || '').toLowerCase(),
    tickets: (r) => String(r.number || '').toLowerCase(),
    amc: (r) => String(r.number || '').toLowerCase(),
    products: (r) => String(r.sku || '').toLowerCase(),
    serials: (r) => String(r.serial_no || '').toLowerCase(),
    purchaseOrders: (r) => String(r.number || '').toLowerCase(),
    repairs: (r) => String(r.number || '').toLowerCase(),
    ledger: (r) => String(r.number || r.id || ''),
    team: (r) => String(r.name || '').toLowerCase(),
  };

  function nowIso() {
    return new Date().toISOString();
  }
  function num(v) {
    return Number(v) || 0;
  }
  function newUuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const b = new Uint8Array(16);
      crypto.getRandomValues(b);
      b[6] = (b[6] & 0x0f) | 0x40;
      b[8] = (b[8] & 0x3f) | 0x80;
      const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
      return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }
  function escapeRe(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  function nextId(arr) {
    return (arr || []).reduce((m, x) => Math.max(m, num(x && x.id)), 0) + 1;
  }

  /** Shop: INV-2001. Phone prefix P1: INV-P1-2001. Never collides across devices. */
  function genNum(kindPrefix, arr, base, devicePrefix) {
    const lead = devicePrefix ? kindPrefix + devicePrefix + '-' : kindPrefix;
    const re = new RegExp('^' + escapeRe(lead) + '(\\d+)$');
    const mx = (arr || []).reduce((m, x) => {
      const s = String((x && x.number) || '');
      const g = s.match(re);
      if (!g) return m;
      const n = parseInt(g[1], 10);
      return isNaN(n) ? m : Math.max(m, n);
    }, base);
    return lead + (mx + 1);
  }

  function stampRow(row, deviceId, { bump = true } = {}) {
    if (!row || typeof row !== 'object') return row;
    if (!row.uuid) row.uuid = newUuid();
    if (bump || !row.updated_at) row.updated_at = nowIso();
    if (deviceId && !row.origin_device) row.origin_device = deviceId;
    stampNested(row);
    return row;
  }

  function stampNested(row) {
    ['payments', 'items', 'checklist', 'activities'].forEach((k) => {
      if (!Array.isArray(row[k])) return;
      row[k].forEach((it) => {
        if (it && typeof it === 'object' && !it.uuid) it.uuid = newUuid();
      });
    });
  }

  function walkTables(state, fn) {
    if (!state) return;
    TABLE_KEYS.forEach((k) => {
      if (Array.isArray(state.DB && state.DB[k])) state.DB[k].forEach((r) => fn(k, r));
    });
    if (Array.isArray(state.TEAM)) state.TEAM.forEach((r) => fn('team', r));
    if (Array.isArray(state.CATALOG)) state.CATALOG.forEach((r) => fn('catalog', r));
  }

  function ensureStockMoves(state) {
    if (!state.DB) state.DB = {};
    if (!Array.isArray(state.DB.stock_moves)) state.DB.stock_moves = [];
    (state.DB.products || []).forEach((p) => {
      if (p && p.stock_baseline == null) p.stock_baseline = num(p.stock);
    });
  }

  function ensureSyncMeta(state, { deviceId } = {}) {
    if (!state || typeof state !== 'object') return state;
    if (!state.DB || typeof state.DB !== 'object') state.DB = {};
    if (state.revision == null) state.revision = 0;
    ensureStockMoves(state);
    walkTables(state, (_t, row) => stampRow(row, deviceId, { bump: false }));
    (state.DB.stock_moves || []).forEach((m) => stampRow(m, deviceId, { bump: false }));
    return state;
  }

  function productUuid(state, product) {
    if (!product) return null;
    if (product.uuid) return product.uuid;
    const name = typeof product === 'string' ? product : product.name;
    const p = (state.DB.products || []).find((x) => x === product || x.name === name || x.id === num(product.id) || x.uuid === product.uuid);
    return p ? p.uuid : null;
  }

  function appendStockMove(state, { product, qty, reason, ref, deviceId, uuid }) {
    ensureStockMoves(state);
    if (product && typeof product === 'object') stampRow(product, deviceId, { bump: false });
    const pu = productUuid(state, product) || (product && product.uuid);
    if (!pu || !qty) return null;
    const p = (state.DB.products || []).find((x) => x && x.uuid === pu);
    if (p && p.stock_baseline == null) p.stock_baseline = num(p.stock);
    const move = stampRow({
      uuid: uuid || newUuid(),
      product_uuid: pu,
      qty: num(qty),
      reason: reason || 'adjust',
      ref: ref || '',
      at: nowIso(),
      origin_device: deviceId || '',
    }, deviceId);
    state.DB.stock_moves.push(move);
    return move;
  }

  function recomputeStock(state) {
    ensureStockMoves(state);
    const byProd = {};
    (state.DB.stock_moves || []).forEach((m) => {
      if (!m || m.deleted_at) return;
      const k = m.product_uuid;
      if (!k) return;
      byProd[k] = (byProd[k] || 0) + num(m.qty);
    });
    (state.DB.products || []).forEach((p) => {
      if (!p || p.deleted_at) return;
      const base = p.stock_baseline == null ? num(p.stock) : num(p.stock_baseline);
      p.stock = Math.max(0, base + (byProd[p.uuid] || 0));
    });
  }

  function tombstone(row, deviceId) {
    if (!row) return;
    stampRow(row, deviceId);
    row.deleted_at = nowIso();
  }

  function liveRows(arr) {
    return (arr || []).filter((r) => r && !r.deleted_at);
  }

  function later(a, b) {
    const ta = Date.parse((a && a.updated_at) || 0) || 0;
    const tb = Date.parse((b && b.updated_at) || 0) || 0;
    if (ta !== tb) return ta >= tb ? a : b;
    return a;
  }

  function mergeList(baseList, incomingList) {
    const map = new Map();
    (baseList || []).concat(incomingList || []).forEach((it) => {
      if (!it || typeof it !== 'object') return;
      if (!it.uuid) it.uuid = newUuid();
      const prev = map.get(it.uuid);
      map.set(it.uuid, prev ? later(prev, it) : it);
    });
    return [...map.values()].filter((x) => !x.deleted_at);
  }

  function preserveConversion(winner, other) {
    if (!winner || !other) return winner;
    const out = { ...winner };
    if (other.converted && !out.converted) out.converted = true;
    if (other.invoice_number && !out.invoice_number) out.invoice_number = other.invoice_number;
    if (other.job_number && !out.job_number) out.job_number = other.job_number;
    if (other.stocked && !out.stocked) {
      out.stocked = true;
      if (!out.received_on) out.received_on = other.received_on;
    }
    return out;
  }

  function findByUuidOrKey(arr, row, table) {
    if (!arr) return -1;
    if (row.uuid) {
      const i = arr.findIndex((x) => x && x.uuid === row.uuid);
      if (i >= 0) return i;
    }
    const keyFn = BUSINESS_KEY[table];
    if (!keyFn) return -1;
    const k = keyFn(row);
    if (!k) return -1;
    return arr.findIndex((x) => x && keyFn(x) === k);
  }

  function mergeRow(table, a, b) {
    let w = later(a, b);
    const o = w === a ? b : a;
    if (table === 'quotes' || table === 'purchaseOrders' || table === 'amc' || table === 'repairs') {
      w = preserveConversion(w, o);
    }
    const lists = LIST_KEYS[table];
    if (lists) {
      w = { ...w };
      lists.forEach((k) => {
        w[k] = mergeList(a[k], b[k]);
      });
    }
    if (table === 'invoices') {
      w = { ...w };
      const paid = (w.payments || []).reduce((s, p) => s + num(p.amount), 0);
      if ((w.payments || []).length) {
        w.paid = paid;
      }
      w.balance = num(w.total) - num(w.paid);
    }
    if (a.deleted_at || b.deleted_at) {
      const del = later({ updated_at: a.deleted_at || '' }, { updated_at: b.deleted_at || '' });
      const live = later({ updated_at: a.updated_at, _row: a }, { updated_at: b.updated_at, _row: b });
      if ((a.deleted_at && (!b.updated_at || Date.parse(a.deleted_at) >= Date.parse(b.updated_at)))
        || (b.deleted_at && (!a.updated_at || Date.parse(b.deleted_at) >= Date.parse(a.updated_at)))) {
        w = { ...w, deleted_at: (del.updated_at) || a.deleted_at || b.deleted_at };
      } else if (Date.parse(live.updated_at) > Date.parse(a.deleted_at || b.deleted_at || 0)) {
        w = { ...live._row };
        delete w.deleted_at;
      }
    }
    return w;
  }

  function nextIdFor(arr, incoming) {
    const n = num(incoming && incoming.id);
    if (n && !(arr || []).some((x) => x.id === n)) return n;
    return nextId(arr);
  }

  function applyUpsert(state, table, row) {
    const isTeam = table === 'team';
    const isCat = table === 'catalog';
    const arr = isTeam ? state.TEAM : isCat ? state.CATALOG : (state.DB[table] || (state.DB[table] = []));
    const idx = findByUuidOrKey(arr, row, table);
    if (idx < 0) {
      const copy = { ...row, id: nextIdFor(arr, row) };
      arr.push(copy);
      return copy;
    }
    const merged = mergeRow(table, arr[idx], row);
    merged.id = arr[idx].id;
    arr[idx] = merged;
    return merged;
  }

  function remapNameRefs(state) {
    const byUuid = {};
    (state.DB.customers || []).forEach((c) => {
      if (c && c.uuid) byUuid[c.uuid] = c.name;
    });
    const fix = (obj) => {
      if (!obj || typeof obj !== 'object') return;
      if (obj.uuid && byUuid[obj.uuid]) obj.name = byUuid[obj.uuid];
    };
    ['quotes', 'invoices', 'jobs', 'tickets', 'amc', 'equipment', 'credentials', 'serials', 'repairs'].forEach((t) => {
      (state.DB[t] || []).forEach((r) => {
        if (r && r.customer) fix(r.customer);
      });
    });
  }

  function cloneState(state) {
    return JSON.parse(JSON.stringify(state || {}));
  }

  /**
   * Merge phone upserts into PC snapshot (PC is source of truth after merge).
   * Does not re-run genNum / convertQuote.
   */
  function applySyncPayload(pcState, payload) {
    const state = cloneState(pcState);
    ensureSyncMeta(state);
    const upserts = (payload && payload.upserts) || {};
    Object.keys(upserts).forEach((table) => {
      (upserts[table] || []).forEach((row) => applyUpsert(state, table, row));
    });
    (payload && payload.deletes || []).forEach((d) => {
      const table = d.table;
      const arr = table === 'team' ? state.TEAM : table === 'catalog' ? state.CATALOG : state.DB[table];
      if (!arr) return;
      const idx = findByUuidOrKey(arr, d, table);
      if (idx >= 0) tombstone(arr[idx], payload.device_id);
    });
    const seenMove = new Set((state.DB.stock_moves || []).map((m) => m.uuid));
    (payload && payload.stock_moves || []).forEach((m) => {
      if (!m || seenMove.has(m.uuid)) return;
      seenMove.add(m.uuid);
      state.DB.stock_moves.push({ ...m });
    });
    remapNameRefs(state);
    recomputeStock(state);
    state.revision = num(state.revision) + 1;
    state.savedAt = Date.now();
    return state;
  }

  function collectPending(localState, baseRevision) {
    ensureSyncMeta(localState);
    const upserts = {};
    TABLE_KEYS.concat(['stock_moves']).forEach((t) => {
      upserts[t] = liveRows(localState.DB[t]).filter((r) => r.origin_device || r.updated_at);
    });
    upserts.team = liveRows(localState.TEAM);
    const deletes = [];
    walkTables(localState, (table, row) => {
      if (row && row.deleted_at) deletes.push({ table, uuid: row.uuid, deleted_at: row.deleted_at, updated_at: row.updated_at });
    });
    return {
      device_id: localState.device_id || '',
      base_revision: baseRevision,
      upserts,
      deletes,
      stock_moves: localState.DB.stock_moves || [],
    };
  }

  function localOnlyPayload(pcSnapshot, localState) {
    const pc = pcSnapshot || {};
    ensureSyncMeta(pc);
    ensureSyncMeta(localState);
    const pcUuids = new Set();
    walkTables(pc, (_t, r) => { if (r && r.uuid) pcUuids.add(r.uuid); });
    (pc.DB && pc.DB.stock_moves || []).forEach((m) => { if (m && m.uuid) pcUuids.add(m.uuid); });
    const payload = { device_id: localState.device_id, upserts: {}, deletes: [], stock_moves: [] };
    TABLE_KEYS.forEach((t) => {
      payload.upserts[t] = (localState.DB[t] || []).filter((r) => r && r.uuid && !pcUuids.has(r.uuid));
    });
    payload.upserts.team = (localState.TEAM || []).filter((r) => r && r.uuid && !pcUuids.has(r.uuid));
    payload.stock_moves = (localState.DB.stock_moves || []).filter((m) => m && m.uuid && !pcUuids.has(m.uuid));
    walkTables(localState, (table, row) => {
      if (row && row.deleted_at && pcUuids.has(row.uuid)) {
        payload.deletes.push({ table, uuid: row.uuid, deleted_at: row.deleted_at, updated_at: row.updated_at });
      }
    });
    return payload;
  }

  /** Phone rebase: keep local-only uuids, overlay PC snapshot. */
  function rebaseLocal(pcSnapshot, localState) {
    const pc = cloneState(pcSnapshot);
    return applySyncPayload(pc, localOnlyPayload(pcSnapshot, localState));
  }

  function nextDevicePrefix(existing) {
    const used = new Set((existing || []).map((d) => d.prefix));
    for (let i = 1; i < 100; i++) {
      const p = 'P' + i;
      if (!used.has(p)) return p;
    }
    return 'P' + Date.now().toString(36).slice(-4).toUpperCase();
  }

  const api = {
    TABLE_KEYS,
    newUuid,
    num,
    nextId,
    nowIso,
    genNum,
    stampRow,
    ensureSyncMeta,
    ensureStockMoves,
    appendStockMove,
    recomputeStock,
    tombstone,
    liveRows,
    applySyncPayload,
    collectPending,
    rebaseLocal,
    localOnlyPayload,
    nextDevicePrefix,
    cloneState,
    productUuid,
  };

  root.SV_ERP = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
