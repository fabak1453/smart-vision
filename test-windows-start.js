// Windows app "could not start" (9.8.1): the installer can no longer ship a database
// module for the wrong platform, and if startup still fails the person at the PC gets
// a short plain reason + a log file instead of a wall of stack trace.
// node test-windows-start.js
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
let n = 0;
const ok = (cond, msg) => { n++; if (!cond) { console.error('  ✗ FAIL:', msg); process.exit(1); } console.log('  ✓', msg); };
const read = (p) => fs.readFileSync(path.join(__dirname, p), 'utf8');
console.log('— windows start suite —');

/* ---------------------------------------------------------------- build guard */
const { inspectBinary, isWin64 } = require('./scripts/dist-win.js');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'svnative-'));
const file = (name, buf) => { const p = path.join(tmp, name); fs.writeFileSync(p, buf); return p; };
const pe = (machine) => { const b = Buffer.alloc(256); b.write('MZ', 0, 'latin1'); b.writeUInt32LE(0x80, 0x3c); b.write('PE\0\0', 0x80, 'latin1'); b.writeUInt16LE(machine, 0x84); return b; };
const elf = (m) => { const b = Buffer.alloc(64); b[0] = 0x7f; b.write('ELF', 1, 'latin1'); b.writeUInt16LE(m, 0x12); return b; };
const macho = (cpu) => { const b = Buffer.alloc(32); b.writeUInt32LE(0xfeedfacf, 0); b.writeUInt32LE(cpu, 4); return b; };
const r = (b) => inspectBinary(file('x' + Math.random(), b));
ok(isWin64(r(pe(0x8664))), 'a Windows x64 module is recognised as right for the installer');
ok(!isWin64(r(pe(0xaa64))) && r(pe(0xaa64)).arch === 'arm64', 'Windows ARM is not x64');
ok(r(elf(0x3e)).format === 'elf' && !isWin64(r(elf(0x3e))), 'a Linux module is refused');
ok(r(macho(0x01000007)).format === 'macho' && r(macho(0x0100000c)).arch === 'arm64' && !isWin64(r(macho(0x0100000c))), 'a Mac module (Intel or Apple silicon) is refused');
const fat = Buffer.alloc(16); fat.writeUInt32BE(0xcafebabe, 0);
ok(r(fat).format === 'macho', 'a universal Mac module is refused');
ok(inspectBinary(path.join(tmp, 'nope.node')).format === 'missing' && r(Buffer.from('hello world, not a binary')).format === 'unknown', 'missing / garbage files are refused');
const pkg = JSON.parse(read('package.json'));
ok(pkg.scripts.dist === 'node scripts/dist-win.js', 'npm run dist goes through the guarded build (and no Mac-only env syntax, so it also runs on Windows)');
const dist = read('scripts/dist-win.js');
ok(/install-app-deps', '--platform', 'win32'/.test(dist) && /stop\('The Windows database module could not be prepared/.test(dist), 'the build stops with a plain message when the Windows module cannot be prepared');
ok(/inspectBinary\(PACKED\)/.test(dist) && /-c\.npmRebuild=false/.test(dist), 'it checks the module inside the finished app, and electron-builder cannot swap it afterwards');
ok(/BROKEN-do-not-ship/.test(dist), 'an installer from a failed build is renamed *.BROKEN-do-not-ship.exe');

/* ---------------------------------------------------------------- startup message */
const S = require('./electron/startup-error.js');
const kind = (m) => S.explain(new Error(m)).kind;
ok(kind('\\\\?\\C:\\Program Files\\Smart Vision ERP\\resources\\app.asar.unpacked\\node_modules\\better-sqlite3\\build\\Release\\better_sqlite3.node is not a valid Win32 application.') === 'native-module',
  'Windows: "not a valid Win32 application" → installer problem');
ok(kind('The module was compiled against a different Node.js version using NODE_MODULE_VERSION 127. This version of Node.js requires NODE_MODULE_VERSION 130.') === 'native-module', 'NODE_MODULE_VERSION mismatch → installer problem');
ok(kind('better_sqlite3.node: invalid ELF header') === 'native-module', 'wrong-format module → installer problem');
ok(kind('SqliteError: database disk image is malformed') === 'database-damaged', 'damaged data file → its own message (backups exist)');
ok(kind("EPERM: operation not permitted, open 'C:\\Users\\x\\AppData\\Roaming\\Smart Vision ERP\\data\\erp.sqlite'") === 'no-permission', 'no permission → its own message');
ok(kind('ENOSPC: no space left on device') === 'disk-full' && kind('SqliteError: database is locked') === 'already-running', 'disk full / already running → their own messages');
const other = S.explain(new Error('TypeError: Cannot read properties of undefined (reading "x")\n    at a (main.js:1:1)\n    at b (main.js:2:2)'));
ok(other.kind === 'other' && other.message.includes('Cannot read properties') && !other.message.includes('at a (main.js'), 'anything else: the first line only, never the whole stack');
ok(Object.values({ a: S.explain(new Error('NODE_MODULE_VERSION 1')), b: other }).every((i) => i.message.length < 420 && /data is safe/i.test(i.message)),
  'every message is short and says the data is safe');
const logDir = path.join(tmp, 'logs');
const lf = S.writeLog(logDir, new Error('better_sqlite3.node: invalid ELF header\n    at dlopen'), { app: '9.8.1', kind: 'native-module' });
const log = fs.readFileSync(lf, 'utf8');
ok(/startup-error-.*\.txt$/.test(lf) && /Kind: native-module/.test(log) && /invalid ELF header/.test(log) && /modules \d+/.test(log), 'the full details (and Electron / module versions) go to a log file');
const main = read('electron/main.js');
ok(/require\('\.\/startup-error'\)/.test(main) && /startupError\.writeLog/.test(main) && /'Open log folder'/.test(main) && /if \(fatalShown\) return;/.test(main),
  'main.js: one short dialog with "Open log folder", details in the log');
fs.rmSync(tmp, { recursive: true, force: true });
console.log('\nALL ' + n + ' WINDOWS START TESTS PASSED ✓');
