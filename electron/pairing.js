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

function newPin() {
  data.pin = String(Math.floor(100000 + Math.random() * 900000));
  data.pinExpires = 0; // valid until LAN is turned off or PIN is rotated
  save();
  return data.pin;
}

function setEnabled(on) {
  data.enabled = !!on;
  if (data.enabled && !data.pin) newPin();
  save();
  return status();
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

function pinMatches(pin) {
  if (!data.enabled || !data.pin) return false;
  return String(pin || '') === String(data.pin);
}

function requireCsvPin(req) {
  if (isLocalAddress(req.socket && req.socket.remoteAddress)) return { ok: true, local: true };
  if (!data.enabled) return { ok: false, error: 'Wi-Fi CSV is off on the shop PC.', status: 403 };
  if (!pinMatches(requestPin(req))) return { ok: false, error: 'Wrong PIN.', status: 401 };
  return { ok: true };
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

function requireAuth(req) {
  if (isLocalAddress(req.socket && req.socket.remoteAddress)) return { ok: true, local: true };
  if (!data.enabled) return { ok: false, error: 'LAN pairing is off.', status: 403 };
  const device = findDevice(tokenFromReq(req));
  if (!device) return { ok: false, error: 'Unauthorized', status: 401 };
  return { ok: true, device };
}

module.exports = {
  init, save, newPin, setEnabled, status, lanUrls, isLocalAddress,
  tokenFromReq, findDevice, pair, requireAuth, requireCsvPin, pinMatches, requestPin, Erp,
  get enabled() { return !!data.enabled; },
};
