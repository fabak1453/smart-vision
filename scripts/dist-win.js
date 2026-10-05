#!/usr/bin/env node
'use strict';
/**
 * npm run dist — the Windows installer, with a guard.
 *
 * The app's database module (better-sqlite3) is native code. Built on a Mac, the
 * Windows copy has to be DOWNLOADED; if that download fails, the Mac copy used to
 * go into the installer silently: it installed fine and then could not start
 * ("Smart Vision ERP could not start" + a wall of errors). Now every step checks
 * the file itself, and the build stops with a plain message instead.
 *
 *   node scripts/dist-win.js          NSIS installer + portable exe (dist/)
 *   node scripts/dist-win.js --dir    unpacked app only (dist/win-unpacked), for testing
 *
 * Works from Windows, macOS and Linux (no shell-specific syntax).
 */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const root = path.join(__dirname, '..');
const MODULE_DIR = path.join(root, 'node_modules', 'better-sqlite3');
const BINARY = path.join(MODULE_DIR, 'build', 'Release', 'better_sqlite3.node');
const PACKED = path.join(root, 'dist', 'win-unpacked', 'resources', 'app.asar.unpacked', 'node_modules',
  'better-sqlite3', 'build', 'Release', 'better_sqlite3.node');

/** What a native binary is built for, from its header: {format: pe|elf|macho|missing|unknown, arch}. */
function inspectBinary(file) {
  let b;
  try { b = fs.readFileSync(file); } catch (e) { return { format: 'missing', arch: '' }; }
  if (b.length >= 64 && b[0] === 0x4d && b[1] === 0x5a) { // MZ → Windows PE
    const pe = b.readUInt32LE(0x3c);
    if (pe + 6 <= b.length && b.toString('latin1', pe, pe + 4) === 'PE\0\0') {
      const m = b.readUInt16LE(pe + 4);
      return { format: 'pe', arch: m === 0x8664 ? 'x64' : m === 0xaa64 ? 'arm64' : m === 0x14c ? 'ia32' : 'other' };
    }
  }
  if (b.length >= 20 && b[0] === 0x7f && b.toString('latin1', 1, 4) === 'ELF') {
    const m = b.readUInt16LE(0x12);
    return { format: 'elf', arch: m === 0x3e ? 'x64' : m === 0xb7 ? 'arm64' : 'other' };
  }
  if (b.length >= 8) {
    const magic = b.readUInt32LE(0);
    if (magic === 0xfeedfacf || magic === 0xfeedface) {
      const cpu = b.readUInt32LE(4);
      return { format: 'macho', arch: cpu === 0x01000007 ? 'x64' : cpu === 0x0100000c ? 'arm64' : 'other' };
    }
    if (b.readUInt32BE(0) === 0xcafebabe) return { format: 'macho', arch: 'universal' };
  }
  return { format: 'unknown', arch: '' };
}
const NAMES = { pe: 'Windows', elf: 'Linux', macho: 'macOS', missing: 'missing', unknown: 'unknown' };
const isWin64 = (i) => i.format === 'pe' && i.arch === 'x64';
const describe = (i) => (i.format === 'missing' ? 'missing' : NAMES[i.format] + (i.arch ? ' ' + i.arch : ''));

function run(cmd, args, env) {
  const r = cp.spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32', env: Object.assign({}, process.env, env || {}) });
  return r.status === 0;
}
const bin = (name) => path.join(root, 'node_modules', '.bin', name + (process.platform === 'win32' ? '.cmd' : ''));
const DIST = path.join(root, 'dist');
let started = 0;
/** Installers from a failed build must never be shipped by mistake. */
function quarantineInstallers() {
  if (!fs.existsSync(DIST)) return [];
  const moved = [];
  for (const f of fs.readdirSync(DIST)) {
    const full = path.join(DIST, f);
    if (/\.exe$/i.test(f) && !/BROKEN-do-not-ship/.test(f) && fs.statSync(full).mtimeMs >= started - 1000) {
      const to = full.replace(/\.exe$/i, '.BROKEN-do-not-ship.exe');
      fs.renameSync(full, to);
      moved.push(path.basename(to));
    }
  }
  return moved;
}
function stop(msg) {
  const moved = quarantineInstallers();
  console.error('\n✗ ' + msg + (moved.length ? '\n  Renamed so nobody ships it: ' + moved.join(', ') : '') + '\n');
  process.exit(1);
}

function main() {
  const dirOnly = process.argv.includes('--dir');
  started = Date.now();
  const electronVersion = require(path.join(root, 'node_modules', 'electron', 'package.json')).version;
  console.log('Windows build · Electron ' + electronVersion + (dirOnly ? ' · unpacked only' : ''));

  // 1. app code
  if (!run(process.execPath, [path.join(root, 'scripts', 'prepare-app.js')])) stop('prepare-app failed.');

  // 2. the Windows database module for Electron
  run(bin('electron-builder'), ['install-app-deps', '--platform', 'win32', '--arch', 'x64']);
  let info = inspectBinary(BINARY);
  if (!isWin64(info)) {
    console.log('Database module is ' + describe(info) + ', not Windows x64: downloading the Windows one…');
    // prebuild-install works on the package in the current folder.
    cp.spawnSync(process.execPath, [path.join(root, 'node_modules', 'prebuild-install', 'bin.js'),
      '--runtime', 'electron', '--target', electronVersion, '--arch', 'x64', '--platform', 'win32'], { cwd: MODULE_DIR, stdio: 'inherit' });
    info = inspectBinary(BINARY);
  }
  if (!isWin64(info)) {
    stop('The Windows database module could not be prepared (it is ' + describe(info) + ').\n'
      + '  An installer built now would install but NOT start, so no installer was made.\n'
      + '  Usually: no internet, or GitHub blocked, during the build. Connect and run `npm run dist` again.');
  }
  console.log('✓ database module: Windows x64 for Electron ' + electronVersion);

  // 3. the installer (unsigned; don't let electron-builder rebuild the checked module)
  const args = ['--win', '--x64', '-c.npmRebuild=false'].concat(dirOnly ? ['--dir'] : []);
  if (!run(bin('electron-builder'), args, { CSC_IDENTITY_AUTO_DISCOVERY: 'false' })) {
    stop('electron-builder failed (see above).'
      + (process.platform !== 'win32' ? '\n  On macOS / Linux the Windows installer needs Wine (macOS: brew install --cask wine-stable), or run `npm run dist` on a Windows PC.' : ''));
  }

  // 4. check what actually went into the app
  const packed = inspectBinary(PACKED);
  if (!isWin64(packed)) stop('The packed app contains a ' + describe(packed) + ' database module: it would not start on Windows.');
  console.log('✓ packed app checked: its database module is Windows x64');

  // 5. put this computer's own module back, so `npm start` keeps working here
  if (process.platform !== 'win32') {
    console.log('Restoring the ' + process.platform + ' database module for local use…');
    cp.spawnSync(process.execPath, [path.join(root, 'node_modules', 'prebuild-install', 'bin.js'),
      '--runtime', 'electron', '--target', electronVersion, '--arch', process.arch, '--platform', process.platform], { cwd: MODULE_DIR, stdio: 'inherit' });
    const want = process.platform === 'darwin' ? 'macho' : 'elf';
    if (inspectBinary(BINARY).format === want) console.log('✓ local module restored (' + describe(inspectBinary(BINARY)) + ')');
    else console.log('Note: run `npm install` before `npm start` on this computer (local module is ' + describe(inspectBinary(BINARY)) + ').');
  }
  const out = fs.existsSync(path.join(root, 'dist')) ? fs.readdirSync(path.join(root, 'dist')).filter((f) => /\.exe$/i.test(f)) : [];
  console.log('\n✓ Done.' + (out.length ? ' Ship: ' + out.map((f) => 'dist/' + f).join(', ') : ' Unpacked app: dist/win-unpacked'));
}

module.exports = { inspectBinary, isWin64, describe };
if (require.main === module) main();
