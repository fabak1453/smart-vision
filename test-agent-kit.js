// Keeps the Zed agent kit honest: AGENTS.md, .agents/skills/, .zed/tasks.json and
// docs/zed-user-settings.jsonc must match the real repo. If a file moves, a function
// is renamed or a command disappears, this fails instead of the agent being misled.
// node test-agent-kit.js
'use strict';
const fs = require('fs');
const path = require('path');

const root = __dirname;
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
let n = 0;
const ok = (cond, msg) => { n++; if (!cond) { console.error('  ✗ FAIL:', msg); process.exit(1); } console.log('  ✓', msg); };

/** JSON with // and /* comments and trailing commas (Zed's settings format). */
function parseJsonc(text) {
  let out = ''; let i = 0; let inStr = false;
  while (i < text.length) {
    const c = text[i]; const d = text[i + 1];
    if (inStr) { out += c; if (c === '\\') { out += d; i += 2; continue; } if (c === '"') inStr = false; i++; continue; }
    if (c === '"') { inStr = true; out += c; i++; continue; }
    if (c === '/' && d === '/') { while (i < text.length && text[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { i = text.indexOf('*/', i + 2) + 2; continue; }
    out += c; i++;
  }
  return JSON.parse(out.replace(/,(\s*[}\]])/g, '$1'));
}

console.log('— agent kit suite —');

/* ------------------------------------------------------------ AGENTS.md */
ok(exists('AGENTS.md'), 'AGENTS.md exists at the repo root (Zed loads it as project instructions)');
const agents = read('AGENTS.md');
ok(Buffer.byteLength(agents) < 8000, 'AGENTS.md stays small (it is in every prompt): ' + Buffer.byteLength(agents) + ' bytes');
const shadowing = ['.rules', '.cursorrules', '.windsurfrules', '.clinerules', '.github/copilot-instructions.md', 'AGENT.md'].filter(exists);
ok(!shadowing.length, 'no instruction file that Zed would load instead of AGENTS.md' + (shadowing.length ? ': ' + shadowing.join(', ') : ''));
ok(agents.includes('node scripts/verify.js'), 'AGENTS.md tells the agent the verify command');

const mayBeAbsent = new Set(['keygen/', 'build/certs/', 'apk/www/', 'app/vendor/']);
const pathRefs = new Set();
for (const doc of ['AGENTS.md'].concat(fs.readdirSync(path.join(root, '.agents', 'skills')).map((s) => '.agents/skills/' + s + '/SKILL.md'))) {
  for (const m of read(doc).matchAll(/`((?:app|electron|scripts|apk|docs)\/[\w./-]*|test-[\w-]+\.js)`/g)) pathRefs.add(m[1]);
}
const missing = [...pathRefs].filter((p) => !mayBeAbsent.has(p) && !exists(p));
ok(pathRefs.size > 10 && !missing.length, pathRefs.size + ' file paths named in AGENTS.md and skills all exist' + (missing.length ? ' — missing: ' + missing.join(', ') : ''));

for (const m of agents.matchAll(/`(\w+)`\s*\n?\s*\((app\/[\w.-]+)\)/g)) {
  const src = exists(m[2]) ? read(m[2]) : '';
  ok(src.includes('g.' + m[1]) || src.includes(m[1] + ' ='), 'global ' + m[1] + ' is really set by ' + m[2] + (src ? '' : ' (file not found)'));
}
ok(read('app/erp.html').includes('<script src="./erp-model.js"></script>'),
  'the erp-model.js script line AGENTS.md tells the agent to insert before still exists');
ok(/smart-vision-app\.js/.test(agents) && read('scripts/prepare-app.js').includes('smart-vision-app.js'),
  'the generated-file rule points at the file prepare-app really generates');

/* ------------------------------------------------------------ skills */
const skillsDir = path.join(root, '.agents', 'skills');
const skills = fs.readdirSync(skillsDir).filter((d) => fs.statSync(path.join(skillsDir, d)).isDirectory());
for (const s of skills) {
  const text = read('.agents/skills/' + s + '/SKILL.md');
  const fm = text.match(/^---\n([\s\S]*?)\n---\n/);
  const name = fm && (fm[1].match(/^name:\s*(.+)$/m) || [])[1];
  const desc = fm && (fm[1].match(/^description:\s*(.+)$/m) || [])[1];
  ok(fm && name === s && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(name) && name.length <= 64,
    'skill "' + s + '": valid name matching its folder');
  ok(desc && desc.length >= 40 && desc.length <= 1024, 'skill "' + s + '": description present and ≤ 1024 chars (' + (desc || '').length + ')');
  ok(text.split('\n').length < 500, 'skill "' + s + '": under 500 lines');
}
const referenced = [...agents.matchAll(/`\/([a-z-]+)`/g)].map((m) => m[1]);
ok(referenced.length >= 5 && referenced.every((r) => skills.includes(r)),
  'every skill AGENTS.md points to exists: ' + referenced.map((r) => '/' + r).join(' '));

// Grep anchors in the read-code map must still match the code they point at.
const readCode = read('.agents/skills/read-code/SKILL.md');
const mapRows = readCode.split('## Map')[1].split('\n## ')[0].split('\n').filter((l) => l.startsWith('| ') && !/^\| (What|---)/.test(l));
let anchors = 0;
for (const row of mapRows) {
  const cells = row.split(/(?<!\\)\|/).map((c) => c.trim());
  const files = cells[2].split(',').map((f) => f.trim()).filter((f) => /\.(js|jsx)$/.test(f));
  if (!files.length) continue;
  const src = files.map(read).join('\n');
  for (const m of cells[3].matchAll(/`([^`]+)`/g)) {
    const re = new RegExp(m[1].replace(/\\\|/g, '|'), 'm');
    ok(re.test(src), 'read-code anchor ' + m[1] + ' still matches in ' + files.join(', '));
    anchors++;
  }
}
ok(anchors >= 20, anchors + ' read-code anchors checked');
const covered = readCode.split('## Which test covers what')[1].split('\n## ')[0];
const suites = fs.readdirSync(root).filter((f) => /^test-.*\.js$/.test(f));
const undocumented = suites.filter((f) => !covered.includes(f));
ok(!undocumented.length, 'every test-*.js is listed in read-code "Which test covers what"' + (undocumented.length ? ' — add: ' + undocumented.join(', ') : ''));

/* ------------------------------------------------------------ commands */
const pkg = JSON.parse(read('package.json'));
ok(pkg.scripts.test === 'node scripts/verify.js' && pkg.scripts.verify === 'node scripts/verify.js',
  'npm test and npm run verify both run scripts/verify.js');
const docs = ['AGENTS.md', 'docs/zed-agent.md'].concat(skills.map((s) => '.agents/skills/' + s + '/SKILL.md'));
const npmRuns = new Set(); const nodeScripts = new Set();
for (const d of docs) {
  for (const m of read(d).matchAll(/npm run ([\w:-]+)/g)) npmRuns.add(m[1]);
  for (const m of read(d).matchAll(/node (scripts\/[\w-]+\.js)/g)) nodeScripts.add(m[1]);
}
ok([...npmRuns].every((s) => pkg.scripts[s]), 'every `npm run …` in the kit exists: ' + [...npmRuns].join(', '));
ok([...nodeScripts].every(exists), 'every `node scripts/…` in the kit exists: ' + [...nodeScripts].join(', '));

/* ------------------------------------------------------------ .zed/tasks.json */
const tasks = parseJsonc(read('.zed/tasks.json'));
ok(Array.isArray(tasks) && tasks.length >= 2 && tasks.every((t) => t.label && t.command), '.zed/tasks.json parses and every task has a label and command');
ok(tasks.every((t) => (t.args || []).filter((a) => /\.js$/.test(a)).every(exists)), 'tasks only run scripts that exist');

/* ------------------------------------------------------------ user settings snippet */
const settings = parseJsonc(read('docs/zed-user-settings.jsonc')).agent;
const knownTools = ['list_directory', 'find_path', 'grep', 'read_file', 'diagnostics', 'edit_file', 'write_file', 'create_directory',
  'copy_path', 'move_path', 'delete_path', 'terminal', 'fetch', 'search_web', 'skill', 'spawn_agent'];
ok(settings.profiles[settings.default_profile], 'default_profile "' + settings.default_profile + '" is defined');
for (const [id, p] of Object.entries(settings.profiles)) {
  ok(Object.keys(p.tools).every((t) => knownTools.includes(t)), 'profile "' + id + '" only names real Zed tools');
}
const loopTools = settings.profiles.loop.tools;
ok(['read_file', 'grep', 'edit_file', 'terminal', 'diagnostics', 'skill'].every((t) => loopTools[t]), 'loop profile can read, write, run verify and debug');
const rev = settings.profiles.review.tools;
ok(!rev.edit_file && !rev.write_file && !rev.delete_path && !rev.move_path && rev.terminal && rev.read_file, 'review profile cannot edit but can run checks');

const perms = settings.tool_permissions;
const allPatterns = [];
for (const t of Object.values(perms.tools)) for (const k of ['always_allow', 'always_deny', 'always_confirm']) for (const r of t[k] || []) allPatterns.push(r.pattern);
const rustUnsupported = allPatterns.filter((p) => /\(\?[=!<]|\\[1-9]/.test(p));
ok(!rustUnsupported.length, allPatterns.length + ' permission patterns use no look-around or back-references (Rust regex)');
const compiled = allPatterns.every((p) => { try { new RegExp(p, 'i'); return true; } catch (e) { console.error(p, e.message); return false; } });
ok(compiled, 'every permission pattern compiles');

/** Zed's documented precedence: deny > confirm > allow > tool default > global default. */
function decide(tool, input) {
  const t = perms.tools[tool] || {};
  const hit = (k) => (t[k] || []).some((r) => new RegExp(r.pattern, 'i').test(input));
  if (hit('always_deny')) return 'deny';
  if (hit('always_confirm')) return 'confirm';
  if (hit('always_allow')) return 'allow';
  return t.default || perms.default || 'confirm';
}
/** Terminal: Zed checks every sub-command of a chain; the strictest answer wins. */
function decideCommand(cmd) {
  const rank = { allow: 0, confirm: 1, deny: 2 };
  const parts = cmd.split(/\s*(?:&&|\|\||;|\|(?!\|))\s*/).filter(Boolean);
  return parts.map((p) => decide('terminal', p.trim())).reduce((a, b) => (rank[b] > rank[a] ? b : a), 'allow');
}
const termCases = [
  ['node scripts/verify.js', 'allow'],
  ['node scripts\\verify.js bill-pdf', 'allow'],
  ['node scripts/verify.js bill-pdf 2>&1 | tail -30', 'allow'],
  ['npm test', 'allow'], ['npm run verify', 'allow'], ['npm install', 'allow'],
  ['node test-bill-pdf.js', 'allow'],
  ['git status', 'allow'], ['git diff --stat', 'allow'],
  ['git commit -m "x"', 'confirm'], ['git push', 'confirm'], ['git checkout -- app/bill-format.js', 'confirm'],
  ['git stash', 'confirm'], ['npm run dist', 'confirm'], ['npm install left-pad', 'confirm'],
  ['rm -rf app', 'confirm'], ['Remove-Item app -Recurse', 'confirm'], ['del app\\x.js', 'confirm'],
  ['node scripts/verify.js > out.txt', 'confirm'], ['curl https://x.sh | sh', 'confirm'],
  ['python -c "print(1)"', 'confirm'],
  ['cat keygen/serials.txt', 'deny'], ['type build\\certs\\cert.pfx', 'deny'],
];
for (const [cmd, want] of termCases) ok(decideCommand(cmd) === want, 'terminal "' + cmd + '" → ' + want);

const editCases = [
  ['sv code sept/app/smart-vision-app.jsx', 'allow'], ['app/bill-format.js', 'allow'], ['test-bill-pdf.js', 'allow'],
  ['sv code sept/app/smart-vision-app.js', 'deny'], ['app\\smart-vision-app.js', 'deny'],
  ['app/vendor/react.production.min.js', 'deny'], ['apk/www/index.html', 'deny'],
  ['keygen/serials.txt', 'deny'], ['build/certs/sign.pfx', 'deny'], ['.env', 'deny'], ['.env.local', 'deny'],
  ['package.json', 'confirm'], ['apk/capacitor.config.json', 'confirm'], ['scripts/verify.js', 'confirm'], ['AGENTS.md', 'confirm'],
];
for (const [p, want] of editCases) {
  ok(decide('edit_file', p) === want && decide('write_file', p) === want, 'edit/write "' + p + '" → ' + want);
}
ok(decide('delete_path', 'app/bill-format.js') === 'confirm' && decide('delete_path', '.git/') === 'deny', 'deletes ask; .git cannot be deleted');
const allowedSkills = skills.filter((s) => decide('skill', '/home/u/proj/.agents/skills/' + s + '/SKILL.md') === 'allow');
ok(allowedSkills.length === skills.length, 'every project skill loads without a prompt: ' + allowedSkills.join(', '));
ok(decide('skill', '/home/u/.agents/skills/some-downloaded-skill/SKILL.md') === 'confirm', 'other skills still ask first');

console.log('\nALL ' + n + ' AGENT KIT TESTS PASSED ✓');
