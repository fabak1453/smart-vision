'use strict';
/**
 * Saved login credentials (Remember me / auto-login).
 * Uses Electron safeStorage when available (OS keychain / DPAPI on Windows).
 * Falls back to lightly encoded local file if encryption is unavailable.
 */
const fs = require('fs');
const path = require('path');
const { safeStorage } = require('electron');

let filePath = null;

function init(userDataDir) {
  try {
    fs.mkdirSync(userDataDir, { recursive: true });
    filePath = path.join(userDataDir, 'saved-login.bin');
  } catch (e) {
    filePath = null;
  }
}

function encode(text) {
  const raw = Buffer.from(String(text || ''), 'utf8');
  try {
    if (safeStorage && typeof safeStorage.isEncryptionAvailable === 'function' && safeStorage.isEncryptionAvailable()) {
      return Buffer.concat([Buffer.from([1]), safeStorage.encryptString(raw.toString('utf8'))]);
    }
  } catch (e) { /* fall through */ }
  // fallback marker 0 + base64 (local machine only)
  return Buffer.concat([Buffer.from([0]), Buffer.from(raw.toString('base64'), 'utf8')]);
}

function decode(buf) {
  if (!buf || !buf.length) return null;
  try {
    const kind = buf[0];
    const payload = buf.slice(1);
    if (kind === 1 && safeStorage && typeof safeStorage.decryptString === 'function') {
      return safeStorage.decryptString(payload);
    }
    if (kind === 0) {
      return Buffer.from(payload.toString('utf8'), 'base64').toString('utf8');
    }
  } catch (e) { /* ignore */ }
  return null;
}

function save(data) {
  if (!filePath) return { ok: false };
  try {
    const json = JSON.stringify({
      username: String((data && data.username) || ''),
      password: String((data && data.password) || ''),
      autoLogin: !!(data && data.autoLogin),
      remember: !!(data && data.remember),
    });
    fs.writeFileSync(filePath, encode(json));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function load() {
  if (!filePath || !fs.existsSync(filePath)) return { ok: true, data: null };
  try {
    const raw = fs.readFileSync(filePath);
    const text = decode(raw);
    if (!text) return { ok: true, data: null };
    const data = JSON.parse(text);
    return {
      ok: true,
      data: {
        username: String(data.username || ''),
        password: String(data.password || ''),
        autoLogin: !!data.autoLogin,
        remember: data.remember !== false,
      },
    };
  } catch (e) {
    return { ok: true, data: null };
  }
}

function clear() {
  if (!filePath) return { ok: true };
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (e) { /* ignore */ }
  return { ok: true };
}

module.exports = { init, save, load, clear };
