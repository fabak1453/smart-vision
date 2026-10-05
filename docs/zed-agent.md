# Zed agent for Smart Vision ERP

A Cursor-style agent inside Zed that works in a loop until the change is proven:
**read → write → verify → debug → verify …** It uses Zed's own agent (no
extension, no extra service).

| Piece | File | What it does |
|---|---|---|
| Always-on instructions | `AGENTS.md` | The loop, when to stop and ask, project rules |
| Skills | `.agents/skills/` | `/loop`, `/read-code`, `/write-code`, `/verify`, `/debug` |
| One verify command | `scripts/verify.js` | Rebuild, syntax, JSON, every test; ends with `RESULT: PASS/FAIL` |
| Profiles + permissions | `docs/zed-user-settings.jsonc` | Paste into your **user** settings |
| Tasks | `.zed/tasks.json` | Run verify yourself from the command palette |
| Kit self-test | `test-agent-kit.js` | Fails if any of the above drifts from the code |

## Set up (once, about 5 minutes)

1. **Zed v0.224 or newer.** Older versions have no `tool_permissions`.
2. **Open the project folder** in Zed and **trust it** when asked. Zed only
   loads project skills from trusted folders.
3. **Install dependencies** in Zed's terminal: `npm install`. If the
   better-sqlite3 rebuild fails, `npm install --ignore-scripts` is enough for
   the agent (tests don't need SQLite).
4. **Settings:** command palette → `zed: open settings file`, then merge the
   `"agent"` block from `docs/zed-user-settings.jsonc`. It has to be your user
   settings: Zed ignores agent profiles in a project's `.zed/settings.json`.
5. **Model:** in the Agent Panel pick a strong coding model with tool use.
   (A profile can pin one with `"default_model"`; the snippet leaves that to you.)
6. **Check it:** run `npm test`. You should see `RESULT: PASS — 12 checks`.

## Use it

Open the Agent Panel, choose the **Loop** profile, and describe the task:

> On the bill, show the customer's GSTIN under their name when the customer
> has one.

Or start with the skill explicitly: `/loop add a discount line to the bill`.

The agent reads the code, makes the change, runs `node scripts/verify.js`,
fixes whatever fails, and repeats until `RESULT: PASS`. It ends with a report:
files changed, the RESULT line, and anything only you can check (printing,
the phone).

Other entry points:

| You type | It does |
|---|---|
| `/verify` | Runs the checks and reviews the uncommitted diff |
| `/debug` + an error or symptom | Reproduces, finds the root cause, adds a regression test |
| `/read-code` + a question | Explains where and how something works, without editing |
| **Review** profile in a second thread | Checks the work with no ability to edit |

If a long task stops before `RESULT: PASS` (the model ended its turn), type
**continue**. The loop picks up from its log.

## What it may do without asking

- Edit project files, except generated files (`app/smart-vision-app.js`,
  `app/vendor/`, `apk/www/`), secrets, `keygen/`, `build/certs/`. Those
  are blocked outright.
- Run the verify/test commands, `npm install` (no new packages), and
  read-only git (`status`, `diff`, `log`).

It **asks first** for `git commit/push/checkout/reset/stash`, deleting or moving
files, installing a new package, `npm run dist`, Gradle, network downloads,
and edits to `package.json`, `capacitor.config.json`, `AndroidManifest.xml`,
`scripts/verify.js` and `AGENTS.md`.

Every agent edit can be reviewed and undone from the Agent Panel. Committing
before a big task gives you a clean point to return to.

## Run verify yourself

Command palette → `task: spawn` → **verify: everything**, or **verify: this
test file** while a `test-*.js` is open. Same as `npm test` /
`node scripts/verify.js <suite>`.

## Changing the kit

Edit `AGENTS.md` or a skill, then run `npm test`: `test-agent-kit.js` checks
that every path, grep anchor, command and permission rule still matches the
repo. Keep `AGENTS.md` short. It is sent with every message; detail belongs
in skills.
