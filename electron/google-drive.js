'use strict';
/**
 * Google Drive backup / restore (OAuth Desktop + Drive API v3).
 * Scope: drive.file — only files created by this app.
 * Credentials: packaged electron/google-oauth.json and/or userData override.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const { URL, URLSearchParams } = require('url');
const { BrowserWindow, safeStorage, shell } = require('electron');

const FOLDER_NAME = 'Smart Vision ERP Backups';
const SCOPES = ['https://www.googleapis.com/auth/drive.file', 'openid', 'email'];
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

let userDataDir = null;
let packagedConfigPath = null;
let authWin = null;

function init(dir, pkgConfigPath) {
  userDataDir = dir;
  packagedConfigPath = pkgConfigPath || null;
  try { fs.mkdirSync(dir, { recursive: true }); } catch (e) { /* ignore */ }
}

function credsPath() { return path.join(userDataDir, 'google-oauth.json'); }
function tokensPath() { return path.join(userDataDir, 'google-tokens.bin'); }

function readJsonSafe(p) {
  try {
    if (!p || !fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) { return null; }
}

function getCredentials() {
  const user = readJsonSafe(credsPath()) || {};
  const pkg = readJsonSafe(packagedConfigPath) || {};
  const clientId = String(user.clientId || pkg.clientId || '').trim();
  const clientSecret = String(user.clientSecret || pkg.clientSecret || '').trim();
  return { clientId, clientSecret, configured: !!clientId };
}

function saveCredentials({ clientId, clientSecret }) {
  const data = {
    clientId: String(clientId || '').trim(),
    clientSecret: String(clientSecret || '').trim(),
  };
  fs.writeFileSync(credsPath(), JSON.stringify(data, null, 2), 'utf8');
  return { ok: true, ...getCredentials() };
}

function encodeSecret(text) {
  const raw = Buffer.from(String(text || ''), 'utf8');
  try {
    if (safeStorage && safeStorage.isEncryptionAvailable && safeStorage.isEncryptionAvailable()) {
      return Buffer.concat([Buffer.from([1]), safeStorage.encryptString(raw.toString('utf8'))]);
    }
  } catch (e) { /* fall through */ }
  return Buffer.concat([Buffer.from([0]), Buffer.from(raw.toString('base64'), 'utf8')]);
}

function decodeSecret(buf) {
  if (!buf || !buf.length) return null;
  try {
    const kind = buf[0];
    const payload = buf.slice(1);
    if (kind === 1 && safeStorage && safeStorage.decryptString) return safeStorage.decryptString(payload);
    if (kind === 0) return Buffer.from(payload.toString('utf8'), 'base64').toString('utf8');
  } catch (e) { /* ignore */ }
  return null;
}

function loadTokens() {
  try {
    if (!fs.existsSync(tokensPath())) return null;
    const text = decodeSecret(fs.readFileSync(tokensPath()));
    if (!text) return null;
    return JSON.parse(text);
  } catch (e) { return null; }
}

function saveTokens(tokens) {
  const prev = loadTokens() || {};
  const next = {
    access_token: tokens.access_token || prev.access_token,
    refresh_token: tokens.refresh_token || prev.refresh_token,
    expiry_date: tokens.expiry_date || (Date.now() + (Number(tokens.expires_in) || 3600) * 1000 - 60000),
    email: tokens.email || prev.email || '',
  };
  fs.writeFileSync(tokensPath(), encodeSecret(JSON.stringify(next)));
  return next;
}

function clearTokens() {
  try { if (fs.existsSync(tokensPath())) fs.unlinkSync(tokensPath()); } catch (e) { /* ignore */ }
  return { ok: true };
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function makePkce() {
  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

function httpsRequest(method, urlStr, { headers, body, raw } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const req = https.request({
      method: method || 'GET',
      hostname: u.hostname,
      path: u.pathname + u.search,
      headers: headers || {},
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        if (raw) return resolve({ status: res.statusCode, headers: res.headers, body: buf });
        const text = buf.toString('utf8');
        let json = null;
        try { json = text ? JSON.parse(text) : null; } catch (e) { json = null; }
        resolve({ status: res.statusCode, headers: res.headers, text, json });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function exchangeCode({ code, redirectUri, codeVerifier, clientId, clientSecret }) {
  const params = new URLSearchParams({
    code,
    client_id: clientId,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
    code_verifier: codeVerifier,
  });
  if (clientSecret) params.set('client_secret', clientSecret);
  const res = await httpsRequest('POST', TOKEN_URL, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (res.status >= 400 || !res.json || !res.json.access_token) {
    throw new Error((res.json && (res.json.error_description || res.json.error)) || 'Token exchange failed');
  }
  return res.json;
}

async function refreshAccessToken(tokens, creds) {
  if (!tokens || !tokens.refresh_token) throw new Error('Not connected to Google Drive — connect first.');
  const params = new URLSearchParams({
    client_id: creds.clientId,
    refresh_token: tokens.refresh_token,
    grant_type: 'refresh_token',
  });
  if (creds.clientSecret) params.set('client_secret', creds.clientSecret);
  const res = await httpsRequest('POST', TOKEN_URL, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (res.status >= 400 || !res.json || !res.json.access_token) {
    clearTokens();
    throw new Error('Google session expired — connect Google Drive again.');
  }
  return saveTokens({ ...res.json, refresh_token: tokens.refresh_token, email: tokens.email });
}

async function getAccessToken() {
  const creds = getCredentials();
  if (!creds.configured) throw new Error('Add your Google OAuth Client ID in Settings first.');
  let tokens = loadTokens();
  if (!tokens || !tokens.access_token) throw new Error('Not connected to Google Drive — click Connect first.');
  if (tokens.expiry_date && Date.now() < Number(tokens.expiry_date)) return { token: tokens.access_token, email: tokens.email, creds };
  tokens = await refreshAccessToken(tokens, creds);
  return { token: tokens.access_token, email: tokens.email, creds };
}

async function fetchUserEmail(accessToken) {
  try {
    const res = await httpsRequest('GET', 'https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: 'Bearer ' + accessToken },
    });
    return (res.json && (res.json.email || res.json.sub)) || '';
  } catch (e) { return ''; }
}

function startLoopbackServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ server, port, redirectUri: 'http://127.0.0.1:' + port });
    });
  });
}

function waitForCode(server, expectedState) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      try { server.close(); } catch (e) { /* ignore */ }
      reject(new Error('Google sign-in timed out.'));
    }, 5 * 60 * 1000);

    server.on('request', (req, res) => {
      try {
        const u = new URL(req.url, 'http://127.0.0.1');
        const code = u.searchParams.get('code');
        const state = u.searchParams.get('state');
        const error = u.searchParams.get('error');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        if (error) {
          res.end('<html><body style="font-family:sans-serif;padding:40px"><h2>Sign-in cancelled</h2><p>You can close this window.</p></body></html>');
          clearTimeout(timer);
          server.close();
          reject(new Error('Google sign-in cancelled.'));
          return;
        }
        if (!code || state !== expectedState) {
          res.end('<html><body style="font-family:sans-serif;padding:40px"><h2>Invalid response</h2></body></html>');
          return;
        }
        res.end('<html><body style="font-family:sans-serif;padding:40px"><h2>Connected</h2><p>Google Drive is linked. You can close this window and return to Smart Vision ERP.</p></body></html>');
        clearTimeout(timer);
        server.close();
        resolve(code);
      } catch (e) {
        clearTimeout(timer);
        try { server.close(); } catch (e2) { /* ignore */ }
        reject(e);
      }
    });
  });
}

async function connect(parentWin) {
  const creds = getCredentials();
  if (!creds.configured) {
    return { ok: false, error: 'Add your Google OAuth Client ID (Desktop app) in Settings first.' };
  }
  const { server, redirectUri } = await startLoopbackServer();
  const { verifier, challenge } = makePkce();
  const state = b64url(crypto.randomBytes(16));
  const authParams = new URLSearchParams({
    client_id: creds.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  const authUrl = AUTH_URL + '?' + authParams.toString();

  const codePromise = waitForCode(server, state);

  if (authWin && !authWin.isDestroyed()) {
    try { authWin.close(); } catch (e) { /* ignore */ }
  }
  authWin = new BrowserWindow({
    width: 520,
    height: 720,
    parent: parentWin || undefined,
    modal: false,
    title: 'Connect Google Drive',
    autoHideMenuBar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });
  authWin.on('closed', () => { authWin = null; });
  try {
    await authWin.loadURL(authUrl);
  } catch (e) {
    try { await shell.openExternal(authUrl); } catch (e2) { /* ignore */ }
  }

  try {
    const code = await codePromise;
    try { if (authWin && !authWin.isDestroyed()) authWin.close(); } catch (e) { /* ignore */ }
    const tokenRes = await exchangeCode({
      code,
      redirectUri,
      codeVerifier: verifier,
      clientId: creds.clientId,
      clientSecret: creds.clientSecret,
    });
    const email = await fetchUserEmail(tokenRes.access_token);
    const saved = saveTokens({ ...tokenRes, email });
    return { ok: true, email: saved.email || email || '' };
  } catch (e) {
    try { server.close(); } catch (e2) { /* ignore */ }
    try { if (authWin && !authWin.isDestroyed()) authWin.close(); } catch (e3) { /* ignore */ }
    return { ok: false, error: e.message || String(e) };
  }
}

function status() {
  const creds = getCredentials();
  const tokens = loadTokens();
  return {
    ok: true,
    configured: creds.configured,
    connected: !!(tokens && tokens.refresh_token),
    email: (tokens && tokens.email) || '',
    clientId: creds.clientId,
    hasSecret: !!creds.clientSecret,
  };
}

async function driveFetch(method, apiPath, { query, body, contentType, raw } = {}) {
  const { token } = await getAccessToken();
  let url = (apiPath.startsWith('http') ? apiPath : DRIVE_API + apiPath);
  if (query) {
    const q = new URLSearchParams(query);
    url += (url.includes('?') ? '&' : '?') + q.toString();
  }
  const headers = { Authorization: 'Bearer ' + token };
  let payload = null;
  if (body != null) {
    if (Buffer.isBuffer(body) || typeof body === 'string') {
      payload = body;
      if (contentType) headers['Content-Type'] = contentType;
      headers['Content-Length'] = Buffer.byteLength(payload);
    } else {
      payload = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
  }
  const res = await httpsRequest(method, url, { headers, body: payload, raw });
  if (res.status === 401) {
    // force refresh once
    const tokens = loadTokens();
    const creds = getCredentials();
    await refreshAccessToken(tokens, creds);
    return driveFetch(method, apiPath, { query, body, contentType, raw });
  }
  if (res.status >= 400) {
    const msg = (res.json && (res.json.error && res.json.error.message)) || res.text || ('Drive API error ' + res.status);
    throw new Error(msg);
  }
  return res;
}

async function ensureBackupFolder() {
  const q = "name = '" + FOLDER_NAME.replace(/'/g, "\\'") + "' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
  const listed = await driveFetch('GET', '/files', {
    query: { q, spaces: 'drive', fields: 'files(id,name)', pageSize: '5' },
  });
  const existing = listed.json && listed.json.files && listed.json.files[0];
  if (existing) return existing.id;
  const created = await driveFetch('POST', '/files', {
    body: { name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' },
  });
  return created.json.id;
}

async function uploadBackup(csvText, filename) {
  const name = filename || ('cctv-erp-backup-' + new Date().toISOString().slice(0, 10) + '.csv');
  const folderId = await ensureBackupFolder();
  const boundary = 'sv_boundary_' + crypto.randomBytes(8).toString('hex');
  const meta = JSON.stringify({
    name,
    parents: [folderId],
    mimeType: 'text/csv',
  });
  const body =
    '--' + boundary + '\r\n'
    + 'Content-Type: application/json; charset=UTF-8\r\n\r\n'
    + meta + '\r\n'
    + '--' + boundary + '\r\n'
    + 'Content-Type: text/csv; charset=UTF-8\r\n\r\n'
    + String(csvText || '') + '\r\n'
    + '--' + boundary + '--';

  const { token } = await getAccessToken();
  const url = DRIVE_UPLOAD + '/files?uploadType=multipart&fields=id,name,createdTime,size';
  const res = await httpsRequest('POST', url, {
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'multipart/related; boundary=' + boundary,
      'Content-Length': Buffer.byteLength(body),
    },
    body,
  });
  if (res.status >= 400 || !res.json || !res.json.id) {
    throw new Error((res.json && res.json.error && res.json.error.message) || 'Upload failed');
  }
  return {
    ok: true,
    file: {
      id: res.json.id,
      name: res.json.name,
      createdTime: res.json.createdTime,
      size: res.json.size,
    },
    folder: FOLDER_NAME,
  };
}

async function listBackups() {
  const folderId = await ensureBackupFolder();
  const q = "'" + folderId + "' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'";
  const listed = await driveFetch('GET', '/files', {
    query: {
      q,
      spaces: 'drive',
      fields: 'files(id,name,createdTime,modifiedTime,size)',
      orderBy: 'createdTime desc',
      pageSize: '50',
    },
  });
  const files = (listed.json && listed.json.files) || [];
  return { ok: true, files, folder: FOLDER_NAME };
}

async function downloadBackup(fileId) {
  if (!fileId) throw new Error('No file selected');
  const { token } = await getAccessToken();
  const meta = await driveFetch('GET', '/files/' + encodeURIComponent(fileId), {
    query: { fields: 'id,name,mimeType' },
  });
  const res = await httpsRequest('GET', DRIVE_API + '/files/' + encodeURIComponent(fileId) + '?alt=media', {
    headers: { Authorization: 'Bearer ' + token },
    raw: true,
  });
  if (res.status >= 400) throw new Error('Download failed (' + res.status + ')');
  return {
    ok: true,
    name: meta.json && meta.json.name,
    csvText: res.body.toString('utf8'),
  };
}

module.exports = {
  init,
  status,
  getCredentials,
  saveCredentials,
  connect,
  disconnect: clearTokens,
  uploadBackup,
  listBackups,
  downloadBackup,
  FOLDER_NAME,
};
