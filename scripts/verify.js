#!/usr/bin/env node
'use strict';
/**
 * The VERIFY step of the agent loop, in one command (humans can use it too).
 *
 *   node scripts/verify.js               compile .jsx + syntax + JSON + every test-*.js
 *   node scripts/verify.js bill-pdf      … but only test-bill-pdf.js (fast while debugging)
 *   node scripts/verify.js wiring lan    … several suites
 *   node scripts/verify.js --json        also print a JSON summary as the last line
 *
 * Exit code 0 only when every check passed. The last line always starts with
 * "RESULT: PASS" or "RESULT: FAIL" so an agent can read it without parsing.
 * Needs `npm install` once (for the JSX compiler). No Electron, SQLite or phone.
 */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const root = path.join(__dirname, '..');
const argv = process.argv.slice(2);
const wantJson = argv.includes('--json');
const only = argv.filter((a) => !a.startsWith('--'));
const started = Date.now();
const results = [];
let buildOk = false; // a usable app/smart-vision-app.js exists for the tests

function record(name, ok, summary, detail) {
  results.push({ name, ok, summary: summary || '', detail: detail || '' });
}
function rel(p) { return path.relative(root, p).split(path.sep).join('/'); }
function tailLines(text, n) {
  return String(text || '').replace(/\r/g, '').trimEnd().split('\n').slice(-n).join('\n');
}
function listJs(dir) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs).filter((f) => f.endsWith('.js')).map((f) => path.join(abs, f));
}

/* ---------------------------------------------------------------- 1. compile */
(function compile() {
  const jsxPath = path.join(root, 'app', 'smart-vision-app.jsx');
  const jsPath = path.join(root, 'app', 'smart-vision-app.js');
  let babel;
  try { babel = require('@babel/core'); require.resolve('@babel/preset-react'); } catch (e) {
    record('compile', false, 'JSX compiler not installed', 'Run `npm install` once, then re-run verify.');
    return;
  }
  let fresh;
  try {
    fresh = babel.transformFileSync(jsxPath, {
      filename: jsxPath, babelrc: false, configFile: false,
      presets: [[require.resolve('@babel/preset-react'), { runtime: 'classic' }]],
    }).code;
  } catch (e) {
    record('compile', false, 'app/smart-vision-app.jsx does not compile', String(e.message || e));
    return;
  }
  // Does the generated .js still say what the .jsx says? Compare meaning, not formatting.
  //  • differs, .jsx is newer  → the .js is just stale (normal after editing the .jsx)
  //  • differs, .js is newer   → someone edited the generated file by hand. Regenerating
  //    would silently throw that edit away, so keep a copy and FAIL until it is ported.
  let handEdit = '';
  let stale = false;
  // A hand edit keeps failing on later runs until the .jsx is changed (ported) —
  // otherwise simply re-running verify would turn it green with the edit lost.
  const markerDir = path.join(root, 'node_modules', '.cache', 'sv-verify');
  const marker = path.join(markerDir, 'hand-edit.json');
  if (fs.existsSync(marker)) {
    try {
      const m = JSON.parse(fs.readFileSync(marker, 'utf8'));
      if (fs.statSync(jsxPath).mtimeMs > m.at) fs.unlinkSync(marker); // the .jsx changed since: ported
      else handEdit = m.message + '\n(Still not ported. To discard the hand edit instead, delete ' + marker + ')';
    } catch (e) { try { fs.unlinkSync(marker); } catch (e2) { /* ignore */ } }
  }
  if (!handEdit) try {
    const norm = (src) => babel.transformSync(src, { babelrc: false, configFile: false, compact: true, comments: false }).code;
    if (fs.existsSync(jsPath)) {
      const current = fs.readFileSync(jsPath, 'utf8');
      if (norm(current) !== norm(fresh)) {
        const jsNewer = fs.statSync(jsPath).mtimeMs - fs.statSync(jsxPath).mtimeMs > 2000;
        if (jsNewer) {
          const keep = path.join(require('os').tmpdir(), 'smart-vision-app.hand-edited-' + Date.now() + '.js');
          fs.writeFileSync(keep, current);
          handEdit = 'app/smart-vision-app.js was edited by hand. It is generated from the .jsx, so that edit has been '
            + 'replaced by a fresh build. Your edited copy is saved at:\n  ' + keep + '\n'
            + 'Compare:  git diff --no-index app/smart-vision-app.js "' + keep + '"\n'
            + 'Then make the same change in app/smart-vision-app.jsx and re-run verify.';
          try {
            fs.mkdirSync(markerDir, { recursive: true });
            fs.writeFileSync(marker, JSON.stringify({ at: Date.now(), backup: keep, message: handEdit }));
          } catch (e) { /* best effort */ }
        } else {
          stale = true;
        }
      }
    }
  } catch (e) { /* the comparison is a safety net; never block the build on it */ }
  const r = cp.spawnSync(process.execPath, [path.join(root, 'scripts', 'prepare-app.js')], { cwd: root, encoding: 'utf8' });
  if (r.status !== 0) {
    record('compile', false, 'npm run prepare-app failed', tailLines((r.stdout || '') + (r.stderr || ''), 15));
    return;
  }
  buildOk = true;
  if (handEdit) {
    record('compile', false, 'generated app/smart-vision-app.js was edited by hand', handEdit);
    return;
  }
  record('compile', true, 'app/smart-vision-app.jsx → .js' + (stale ? '  (rebuilt)' : ''), '');
})();

/* ---------------------------------------------------------------- 2. syntax */
(function syntax() {
  const files = [].concat(
    listJs('app'), listJs('electron'), listJs('scripts'), listJs('apk'), listJs(path.join('apk', 'scripts')),
    fs.readdirSync(root).filter((f) => /^test-.*\.js$/.test(f)).map((f) => path.join(root, f)),
  );
  const bad = [];
  for (const f of files) {
    const r = cp.spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
    if (r.status !== 0) bad.push(rel(f) + '\n' + tailLines(r.stderr, 6).split('\n').map((l) => '    ' + l).join('\n'));
  }
  record('syntax', !bad.length, bad.length ? bad.length + ' of ' + files.length + ' files have syntax errors' : files.length + ' files', bad.join('\n'));
})();

/* ---------------------------------------------------------------- 3. json */
(function json() {
  const files = ['package.json', 'apk/package.json', 'apk/capacitor.config.json'].filter((f) => fs.existsSync(path.join(root, f)));
  const bad = [];
  for (const f of files) {
    try { JSON.parse(fs.readFileSync(path.join(root, f), 'utf8')); } catch (e) { bad.push(f + ': ' + e.message); }
  }
  record('json', !bad.length, bad.length ? bad.join('; ') : files.length + ' files', '');
})();

/* ---------------------------------------------------------------- 4. tests */
const allSuites = fs.readdirSync(root).filter((f) => /^test-.*\.js$/.test(f)).sort();
const key = (s) => s.replace(/^test-/, '').replace(/\.js$/, '').toLowerCase();
let suites = allSuites;
if (only.length) {
  suites = allSuites.filter((f) => only.some((o) => key(f) === key(o) || key(f).includes(key(o))));
  if (!suites.length) {
    record('tests', false, 'no test file matches: ' + only.join(', '), 'Available: ' + allSuites.map(key).join(', '));
  }
}
if (!buildOk) {
  record('tests', false, 'skipped — fix the compile step first', '');
  suites = [];
}
for (const f of suites) {
  const r = cp.spawnSync(process.execPath, [path.join(root, f)], {
    cwd: root, encoding: 'utf8', timeout: 180000, env: Object.assign({}, process.env, { FORCE_COLOR: '0' }),
  });
  const out = (r.stdout || '') + (r.stderr || '');
  const lines = out.replace(/\r/g, '').split('\n');
  const failLine = lines.find((l) => /✗|FAIL\b|AssertionError|ReferenceError|TypeError|SyntaxError/.test(l));
  // test-reliability.js reports findings by severity instead of exiting non-zero.
  const sev = (s) => { const m = out.match(new RegExp('"' + s + '":\\s*(\\d+)')); return m ? Number(m[1]) : 0; };
  const p0 = sev('P0'); const p1 = sev('P1');
  const timedOut = r.error && r.error.code === 'ETIMEDOUT';
  const ok = r.status === 0 && !timedOut && !/✗ FAIL/.test(out) && p0 === 0 && p1 === 0;
  let summary;
  if (ok) {
    summary = (lines.find((l) => /PASSED/.test(l)) || (p0 + p1 === 0 && /PROBE SUMMARY/.test(out) ? 'no P0/P1 findings' : 'exit 0')).trim();
  } else if (timedOut) {
    summary = 'timed out after 180 s';
  } else if (p0 || p1) {
    summary = 'reliability findings: P0=' + p0 + ' P1=' + p1;
  } else {
    summary = (failLine || 'exit code ' + r.status).trim();
  }
  record(f, ok, summary, ok ? '' : tailLines(out, 25));
}

/* ---------------------------------------------------------------- report */
const failed = results.filter((r) => !r.ok);
const secs = ((Date.now() - started) / 1000).toFixed(1);
console.log('\n== VERIFY (' + secs + ' s)');
for (const r of results) {
  console.log((r.ok ? '  ✓ ' : '  ✗ ') + r.name.padEnd(24) + ' ' + r.summary);
  if (r.detail && (!r.ok || r.name === 'compile')) {
    console.log(r.detail.split('\n').map((l) => '      ' + l).join('\n'));
  }
}
let changed = '';
if (fs.existsSync(path.join(root, '.git'))) {
  const g = cp.spawnSync('git', ['status', '--short'], { cwd: root, encoding: 'utf8' });
  if (g.status === 0) {
    const files = g.stdout.split('\n').filter((l) => l.trim() && !/ (node_modules|app\/vendor)\//.test(l));
    changed = files.length + ' changed file(s) per git status';
  }
}
if (changed) console.log('  · ' + changed);
if (only.length && !failed.length) {
  console.log('  · PARTIAL: only ' + suites.join(', ') + ' ran. Run `node scripts/verify.js` (all) before finishing.');
}
const total = results.length;
if (failed.length) {
  const first = failed[0];
  const rerun = /^test-/.test(first.name) ? 'node scripts/verify.js ' + key(first.name) : 'node scripts/verify.js';
  console.log('RESULT: FAIL — ' + failed.length + ' of ' + total + ' checks failed. Fix the first one (' + first.name + '), then re-run: ' + rerun);
} else {
  console.log('RESULT: PASS — ' + total + ' checks' + (only.length ? ' (partial run)' : ''));
}
if (wantJson) {
  console.log(JSON.stringify({ ok: !failed.length, partial: !!only.length, seconds: Number(secs), checks: results.map(({ name, ok, summary }) => ({ name, ok, summary })) }));
}
process.exit(failed.length ? 1 : 0);
