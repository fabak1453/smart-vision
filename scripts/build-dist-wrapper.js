#!/usr/bin/env node
'use strict';
/**
 * Build wrapper: runs prepare-app then electron-builder,
 * reporting progress, stdout/stderr tail and artifacts to the Debug Server.
 */
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const envFile = path.join(root, '.dbg', 'exe-dist-installer.env');
let DEBUG_SERVER_URL = 'http://127.0.0.1:7778/event';
let DEBUG_SESSION_ID = 'exe-dist-installer';
try {
  const e = fs.readFileSync(envFile, 'utf8');
  DEBUG_SERVER_URL = (e.match(/DEBUG_SERVER_URL=(.+)/) || [])[1] || DEBUG_SERVER_URL;
  DEBUG_SESSION_ID = (e.match(/DEBUG_SESSION_ID=(.+)/) || [])[1] || DEBUG_SESSION_ID;
} catch (_e) {}

function report(hypothesisId, msg, data) {
  try {
    const payload = JSON.stringify({
      sessionId: DEBUG_SESSION_ID,
      runId: 'pre-fix',
      hypothesisId,
      location: 'scripts/build-dist-wrapper.js',
      msg: '[DEBUG] ' + msg,
      data: data || {},
      ts: Date.now(),
    });
    const u = new URL(DEBUG_SERVER_URL);
    const http = require(u.protocol.replace(':', ''));
    const req = http.request({
      method: 'POST',
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname + u.search,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: 5000,
    }, () => {});
    req.on('error', () => {});
    req.write(payload);
    req.end();
  } catch (_e) {}
}

function runPrepareApp() {
  report('C', 'prepare-app:start');
  const start = Date.now();
  const r = spawnSync(process.execPath, [path.join(root, 'scripts', 'prepare-app.js')], {
    cwd: root,
    encoding: 'utf8',
    timeout: 120_000,
  });
  const duration = Date.now() - start;
  let outBytes = 0;
  try {
    const p = path.join(root, 'app', 'smart-vision-app.js');
    outBytes = fs.statSync(p).size;
  } catch (_e) {}
  let snippet = '';
  try {
    snippet = (fs.readFileSync(path.join(root, 'app', 'smart-vision-app.js'), 'utf8')).slice(0, 300);
  } catch (_e) {}
  report('C', 'prepare-app:done', {
    durationMs: duration,
    status: r.status,
    stdoutTail: (r.stdout || '').slice(-400),
    stderrTail: (r.stderr || '').slice(-400),
    outFileBytes: outBytes,
    usesJsxRuntime: snippet.includes('_jsxRuntime') || snippet.includes('react/jsx-runtime'),
  });
  if (r.status !== 0) process.exit(r.status || 1);
}

function parseArtifacts(distDir) {
  const out = [];
  try {
    if (fs.existsSync(distDir)) {
      for (const name of fs.readdirSync(distDir)) {
        const p = path.join(distDir, name);
        const st = fs.statSync(p);
        if (st.isFile()) {
          out.push({ name, size: st.size });
        }
      }
    }
  } catch (_e) {}
  return out;
}

function runBuilder() {
  report('A,B,D,E', 'electron-builder:start', {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    CSC_AUTO: process.env.CSC_IDENTITY_AUTO_DISCOVERY,
  });
  const distDir = path.join(root, 'dist');
  const env = Object.create(process.env);
  env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';
  env.USE_HARD_LINKS = 'false';
  const child = spawn(process.execPath, [
    require.resolve('electron-builder/out/cli/cli.js'),
    '--win',
    '--x64',
  ], {
    cwd: root,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let soFarOut = '';
  let soFarErr = '';
  child.stdout.on('data', d => {
    soFarOut += d.toString('utf8');
    if (soFarOut.length > 8000) soFarOut = soFarOut.slice(-8000);
  });
  child.stderr.on('data', d => {
    soFarErr += d.toString('utf8');
    if (soFarErr.length > 8000) soFarErr = soFarErr.slice(-8000);
  });
  child.on('close', code => {
    const files = parseArtifacts(distDir);
    const hasWine = (soFarOut + soFarErr).match(/wine/i);
    const hasNodeGyp = (soFarOut + soFarErr).match(/node-gyp|prebuild-install|better-sqlite3/);
    report('A,B,D,E', 'electron-builder:done', {
      exitCode: code,
      stdoutTail: soFarOut.slice(-2000),
      stderrTail: soFarErr.slice(-2000),
      artifacts: files,
      wineMentioned: !!hasWine,
      nodeGypMentioned: !!hasNodeGyp,
    });
    process.exit(code === 0 ? 0 : code || 1);
  });
}

runPrepareApp();
runBuilder();
