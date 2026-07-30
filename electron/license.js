// ============================================================================
// Smart Vision ERP — License engine
//  • Free trial (TRIAL_DAYS below), machine-locked activation keys
//  • Keys are Ed25519-signed offline tokens: SVE1.<payload>.<signature>
//  • The app only contains the PUBLIC key — keys cannot be forged.
//  • Master key (machine "*", expiry "*") unlocks any PC forever.
//  • Trial record is stored in TWO places (app data + a hidden mirror file)
//    and clock roll-back is detected, so the trial can't be reset easily.
// ============================================================================
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

// ---------------------------------------------------------------- CONFIG ---
const TRIAL_DAYS = 14; // <- change trial length here
const PRODUCT = 'Smart Vision ERP';
// Ed25519 PUBLIC key (hex). The matching PRIVATE key lives only in your keygen.
const PUBLIC_KEY_HEX = '195db129f648063c1298f018fa0bb98062808161c325db5b07b9fe324969dcf1';
// ---------------------------------------------------------------------------

const DER_PUB_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');
const publicKey = crypto.createPublicKey({
  key: Buffer.concat([DER_PUB_PREFIX, Buffer.from(PUBLIC_KEY_HEX, 'hex')]),
  format: 'der',
  type: 'spki',
});

// ------------------------------------------------------------ machine id ---
function rawMachineId() {
  // Windows: MachineGuid from the registry (stable per PC).
  try {
    if (process.platform === 'win32') {
      const { execSync } = require('child_process');
      const out = execSync(
        'reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid',
        { stdio: ['ignore', 'pipe', 'ignore'] }
      ).toString();
      const m = out.match(/MachineGuid\s+REG_SZ\s+([0-9a-fA-F-]+)/);
      if (m) return m[1].toLowerCase();
    }
  } catch (e) { /* fall through */ }
  // Fallback fingerprint (also used on macOS/Linux while developing)
  const cpu = (os.cpus()[0] || {}).model || '';
  return [os.hostname(), os.platform(), os.arch(), cpu, os.homedir()].join('|');
}

function machineCode() {
  const h = crypto.createHash('sha256').update(rawMachineId()).digest('hex')
    .slice(0, 12).toUpperCase();
  return h.replace(/(.{4})(.{4})(.{4})/, '$1-$2-$3'); // e.g. 3F9A-1C77-B02D
}
const codeBare = (c) => String(c || '').replace(/[^0-9A-F]/gi, '').toUpperCase();

// ------------------------------------------------------- key verification ---
function b64uToBuf(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64');
}

/** Verify a key string. Returns {ok, reason?, info?} — never throws. */
function verifyKey(keyString, forMachineCode) {
  try {
    const clean = String(keyString || '').replace(/\s+/g, '');
    const parts = clean.split('.');
    if (parts.length !== 3 || parts[0] !== 'SVE1') {
      return { ok: false, reason: 'That does not look like a Smart Vision key.' };
    }
    const payload = b64uToBuf(parts[1]);
    const sig = b64uToBuf(parts[2]);
    if (!crypto.verify(null, payload, publicKey, sig)) {
      return { ok: false, reason: 'Invalid key — signature check failed.' };
    }
    const info = JSON.parse(payload.toString('utf8')); // { m, e, t, n? }
    const master = info.t === 'MASTER';
    if (!master && info.m !== '*' && info.m !== codeBare(forMachineCode)) {
      return { ok: false, reason: 'This key is for a different computer (Machine ID mismatch).' };
    }
    if (!master && info.e !== '*') {
      const today = new Date().toISOString().slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(info.e)) return { ok: false, reason: 'Key has an invalid expiry date.' };
      if (today > info.e) return { ok: false, reason: `This key expired on ${info.e}. Please get a renewal key.` };
    }
    return { ok: true, info: { machine: info.m, expires: master ? '*' : info.e, type: info.t || 'STD', name: info.n || '' } };
  } catch (e) {
    return { ok: false, reason: 'Could not read that key. Please paste the full key.' };
  }
}

// -------------------------------------------------- trial state (2 copies) ---
let storeDir = null;   // set via init(userDataPath)
function storeFile()  { return path.join(storeDir, 'license.json'); }
function mirrorFile() {
  const base = process.env.LOCALAPPDATA || path.join(os.homedir(), '.config');
  return path.join(base, '.sv_erp_meta.json'); // hidden-ish mirror copy
}

function readJson(f) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return null; } }
function writeJson(f, obj) {
  try {
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, JSON.stringify(obj));
  } catch (e) { /* non-fatal */ }
}

function loadState() {
  const a = readJson(storeFile());
  const b = readJson(mirrorFile());
  if (!a && !b) return null;
  const s = {
    installedAt: Math.min(a?.installedAt ?? Infinity, b?.installedAt ?? Infinity),
    lastSeen:    Math.max(a?.lastSeen ?? 0, b?.lastSeen ?? 0),
    key:         a?.key || b?.key || null,
  };
  if (!isFinite(s.installedAt)) s.installedAt = Date.now();
  return s;
}
function saveState(s) { writeJson(storeFile(), s); writeJson(mirrorFile(), s); }

// ----------------------------------------------------------------- public ---
function init(userDataPath) { storeDir = userDataPath; }

/**
 * Main status check. Returns:
 *  { mode: 'licensed'|'trial'|'expired'|'tampered',
 *    machineCode, daysLeft?, expires?, master?, licensee?, message }
 */
function check() {
  const mc = machineCode();
  const now = Date.now();
  let s = loadState();
  if (!s) { s = { installedAt: now, lastSeen: now, key: null }; saveState(s); }

  // clock roll-back detection (5 min tolerance)
  const tampered = now < s.lastSeen - 5 * 60 * 1000;
  if (now > s.lastSeen) { s.lastSeen = now; saveState(s); }

  // activated?
  if (s.key) {
    const v = verifyKey(s.key, mc);
    if (v.ok) {
      const master = v.info.type === 'MASTER';
      return {
        mode: 'licensed', machineCode: mc, master,
        expires: v.info.expires, licensee: v.info.name,
        message: master ? 'Licensed — master key (never expires).'
          : v.info.expires === '*' ? 'Licensed — lifetime.'
          : `Licensed until ${v.info.expires}.`,
      };
    }
    // stored key no longer valid (expired) → fall through to expired screen
    return { mode: 'expired', machineCode: mc, message: v.reason };
  }

  if (tampered) {
    return { mode: 'tampered', machineCode: mc,
      message: 'System clock change detected. Please correct the date/time or activate with a license key.' };
  }

  const trialEnd = s.installedAt + TRIAL_DAYS * 86400000;
  if (now <= trialEnd) {
    const daysLeft = Math.max(1, Math.ceil((trialEnd - now) / 86400000));
    return { mode: 'trial', machineCode: mc, daysLeft,
      message: `Free trial — ${daysLeft} day${daysLeft === 1 ? '' : 's'} left.` };
  }
  return { mode: 'expired', machineCode: mc,
    message: `Your ${TRIAL_DAYS}-day free trial has ended. Enter a license key to continue.` };
}

/** Try to activate with a key. On success it is persisted. */
function activate(keyString) {
  const mc = machineCode();
  const v = verifyKey(keyString, mc);
  if (!v.ok) return { ok: false, message: v.reason };
  const s = loadState() || { installedAt: Date.now(), lastSeen: Date.now() };
  s.key = String(keyString).replace(/\s+/g, '');
  saveState(s);
  return { ok: true, message: 'Activated successfully!', info: v.info };
}

module.exports = { init, check, activate, machineCode, verifyKey, PRODUCT, TRIAL_DAYS };
