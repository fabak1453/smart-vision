'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const Erp = require('../app/erp-model');

let file = null;
let data = {
  enabled: false,
  pin: '',
  pinExpires: 0,
  lanPort: 0,
  devices: [],
};

function init(userData) {
  const dir = path.join(userData, 'data');
  fs.mkdirSync(dir, { recursive: true });
  file = path.join(dir, 'pairing.json');
  try {
    if (fs.existsSync(file)) data = { ...data, ...JSON.parse(fs.readFileSync(file, 'utf8')) };
  } catch (e) { /* ignore */ }
  if (!data.devices) data.devices = [];
  return data;
}

function save() {
  if (!file) return;
  try { fs.writeFileSync(file, JSON.stringify(data, null, 2)); } catch (e) { /* ignore */ }
}

// Math.random() is predictable enough to guess from outside; the PIN is the only
// thing standing between the LAN and a full data restore, so use the crypto RNG.
function newPin() {
  let n;
  try { n = crypto.randomInt(100000, 1000000); }
  catch (e) { n = 100000 + Math.floor(Math.random() * 900000); }
  data.pin = String(n);
  data.pinExpires = 0; // valid until LAN is turned off or PIN is rotated
  pinFails = 0;
  pinLockUntil = 0;
  save();
  return data.pin;
}

function setEnabled(on) {
  data.enabled = !!on;
  if (data.enabled && !data.pin) newPin();
  save();
  return status();
}

/** Last LAN port the shop PC used — reused so the IP:port stays stable. */
function getLanPort() {
  const p = Number(data.lanPort);
  return Number.isFinite(p) && p > 0 && p < 65536 ? p : 0;
}
function setLanPort(port) {
  const p = Number(port);
  data.lanPort = Number.isFinite(p) && p > 0 && p < 65536 ? p : 0;
  save();
  return data.lanPort;
}

function lanUrls(port) {
  const urls = [];
  const ifs = os.networkInterfaces();
  Object.values(ifs).forEach((list) => {
    (list || []).forEach((n) => {
      if (n.family === 'IPv4' && !n.internal) urls.push('http://' + n.address + ':' + port);
    });
  });
  return urls;
}

function status(port) {
  return {
    enabled: !!data.enabled,
    pin: data.enabled ? data.pin : '',
    urls: port ? lanUrls(port) : [],
    devices: (data.devices || []).map((d) => ({
      id: d.id, prefix: d.prefix, name: d.name || '', created_at: d.created_at,
    })),
  };
}

/**
 * Safe status for LAN clients (phone / tablet): never reveals the PIN, only
 * enough for a device to (a) know the PC is reachable and (b) build its URL.
 * The PIN is only readable on the shop PC itself (loopback).
 */
function publicStatus(port) {
  return {
    service: 'smart-vision-erp',
    ok: true,
    enabled: !!data.enabled,
    canPair: !!data.enabled && !!data.pin,
    urls: port ? lanUrls(port) : [],
    paired_devices: (data.devices || []).length,
  };
}

function isLocalAddress(addr) {
  const a = String(addr || '');
  return a === '127.0.0.1' || a === '::1' || a === '::ffff:127.0.0.1';
}

function requestPin(req) {
  const q = String(req.url || '').split('?')[1] || '';
  let fromQuery = '';
  try { fromQuery = new URLSearchParams(q).get('pin') || ''; } catch (e) { fromQuery = ''; }
  const h = (req.headers && (req.headers['x-sv-pin'] || req.headers['X-SV-PIN'])) || '';
  return String(fromQuery || h || '').trim();
}

// A six-digit PIN is a million guesses; unthrottled, anything on the LAN could
// work through them in minutes and then overwrite the whole shop database.
let pinFails = 0;
let pinLockUntil = 0;
const PIN_MAX_FAILS = 8;
const PIN_LOCK_MS = 60 * 1000;
function pinLockedFor() {
  const left = pinLockUntil - Date.now();
  return left > 0 ? left : 0;
}
function pinMatches(pin) {
  if (!data.enabled || !data.pin) return false;
  const given = String(pin == null ? '' : pin);
  if (!given) return false; // nothing supplied — not a guess, so not counted
  if (pinLockedFor() > 0) return false;
  if (given === String(data.pin)) {
    pinFails = 0;
    return true;
  }
  pinFails += 1;
  if (pinFails >= PIN_MAX_FAILS) {
    pinFails = 0;
    pinLockUntil = Date.now() + PIN_LOCK_MS;
  }
  return false;
}

function requireCsvPin(req) {
  if (isLocalAddress(req.socket && req.socket.remoteAddress)) return { ok: true, local: true };
  if (!data.enabled) return { ok: false, error: 'Wi-Fi CSV is off on the shop PC.', status: 403 };
  if (pinMatches(requestPin(req))) return { ok: true };
  // A device already paired over LAN is trusted for the CSV endpoints too — no
  // need to re-type the PIN on the phone/tablet after pairing.
  const device = findDevice(tokenFromReq(req));
  if (device) return { ok: true, device };
  if (pinLockedFor() > 0) return { ok: false, error: 'Too many wrong PINs. Wait a minute and try again.', status: 429 };
  return { ok: false, error: 'Wrong PIN.', status: 401 };
}

function tokenFromReq(req) {
  const h = req.headers && (req.headers.authorization || req.headers.Authorization);
  if (h && /^Bearer\s+/i.test(h)) return h.replace(/^Bearer\s+/i, '').trim();
  return '';
}

function findDevice(token) {
  if (!token) return null;
  return (data.devices || []).find((d) => d.token === token) || null;
}

function pair(pin, deviceId) {
  if (!data.enabled) return { ok: false, error: 'LAN pairing is off on the shop PC.' };
  if (!pinMatches(pin)) return { ok: false, error: 'Wrong PIN.' };
  let device = (data.devices || []).find((d) => d.id === deviceId);
  if (!device) {
    device = {
      id: deviceId || crypto.randomBytes(8).toString('hex'),
      prefix: Erp.nextDevicePrefix(data.devices),
      token: crypto.randomBytes(24).toString('hex'),
      created_at: new Date().toISOString(),
    };
    data.devices.push(device);
  } else {
    device.token = crypto.randomBytes(24).toString('hex');
  }
  save();
  return { ok: true, device };
}

/**
 * Auth for the data API (/api.php) — the "work on the shop PC's live data" path.
 *   shop PC itself (loopback) : read + write
 *   correct PIN               : read + write  (phone / tablet browser terminal)
 *   paired device token       : read only     (the APK must merge via /api/sync)
 * Before this existed a LAN browser was refused even with the right PIN, so the
 * tablet silently fell back to its own localStorage and drifted from the PC.
 */
function requireDataAuth(req) {
  if (isLocalAddress(req.socket && req.socket.remoteAddress)) return { ok: true, local: true, write: true };
  if (!data.enabled) return { ok: false, error: 'Wi-Fi sharing is off on the shop PC.', status: 403 };
  if (pinMatches(requestPin(req))) return { ok: true, write: true };
  const device = findDevice(tokenFromReq(req));
  if (device) return { ok: true, write: false, device };
  return { ok: false, error: 'Enter the shop PC PIN to work on this data.', status: 401 };
}

function requireAuth(req) {
  if (isLocalAddress(req.socket && req.socket.remoteAddress)) return { ok: true, local: true };
  if (!data.enabled) return { ok: false, error: 'LAN pairing is off.', status: 403 };
  const device = findDevice(tokenFromReq(req));
  if (!device) return { ok: false, error: 'Unauthorized', status: 401 };
  return { ok: true, device };
}

module.exports = {
  init, save, newPin, setEnabled, status, publicStatus, lanUrls, isLocalAddress,
  getLanPort, setLanPort,
  tokenFromReq, findDevice, pair, requireAuth, requireDataAuth, requireCsvPin, pinMatches, pinLockedFor, requestPin, Erp,
  get enabled() { return !!data.enabled; },
};
