'use strict';
// When the desktop app cannot start: a short, plain reason for the person at the
// shop PC, the full details in a log file. (It used to dump the whole stack trace
// into a dialog: "tons of errors" and no idea what to do.)
// No Electron here, so it can be tested with plain Node.
const fs = require('fs');
const path = require('path');

/** Classify a startup error → { kind, title, message } in plain words. */
function explain(err, productName) {
  const name = productName || 'Smart Vision ERP';
  const text = String((err && (err.stack || err.message)) || err || '');
  const has = (re) => re.test(text);
  if (has(/better_sqlite3\.node|better-sqlite3|NODE_MODULE_VERSION|not a valid Win32 application|ERR_DLOPEN_FAILED|was compiled against a different Node\.js version|invalid ELF header|wrong ELF class|mach-o/i)) {
    return {
      kind: 'native-module',
      title: name + ' could not start: installer problem',
      message: 'The database part of this installer was built for a different kind of computer, so Windows cannot load it.\n\n'
        + 'Your data is safe: nothing was changed or deleted.\n\n'
        + 'Fix: install a new installer made with "npm run dist" (version 9.8.1 or later checks this and will not produce a broken installer).',
    };
  }
  if (has(/SQLITE_CORRUPT|file is not a database|database disk image is malformed/i)) {
    return {
      kind: 'database-damaged',
      title: name + ' could not start: data file damaged',
      message: 'The data file could not be read. Automatic backups of earlier days are in the "backups" folder next to it.\n\n'
        + 'Do not delete anything. Send the log file to support, or restore the latest backup.',
    };
  }
  if (has(/EACCES|EPERM|SQLITE_READONLY|SQLITE_CANTOPEN|attempt to write a readonly database/i)) {
    return {
      kind: 'no-permission',
      title: name + ' could not start: no permission to the data folder',
      message: 'Windows did not allow the app to open its data folder (antivirus, a cloud-sync folder, or the app was started as a different user).\n\n'
        + 'Close other copies of the app, then start it again. If it keeps happening, restart the PC.',
    };
  }
  if (has(/ENOSPC|SQLITE_FULL|disk is full/i)) {
    return {
      kind: 'disk-full', title: name + ' could not start: disk full',
      message: 'The drive with the app data is full. Free some space, then start the app again. Your data is safe.',
    };
  }
  if (has(/SQLITE_BUSY|database is locked|EADDRINUSE/i)) {
    return {
      kind: 'already-running', title: name + ' could not start: already open',
      message: 'Another copy of the app is still running or closing. Wait a few seconds, or close it from the taskbar, then start again.',
    };
  }
  const first = text.split('\n').map((l) => l.trim()).find(Boolean) || 'Unknown error';
  return {
    kind: 'other', title: name + ' could not start',
    message: 'Something went wrong while starting:\n\n' + first.slice(0, 300) + '\n\nYour data is safe. Please send the log file to support.',
  };
}

/** Write the full details to <userData>/logs/startup-error-<time>.txt. Returns the path, or '' if that fails too. */
function writeLog(logDir, err, extra) {
  try {
    fs.mkdirSync(logDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const file = path.join(logDir, 'startup-error-' + stamp + '.txt');
    const lines = [
      'Time: ' + new Date().toString(),
      'App: ' + ((extra && extra.app) || ''),
      'Versions: electron ' + process.versions.electron + ', node ' + process.versions.node + ', modules ' + process.versions.modules
        + ', ' + process.platform + '-' + process.arch,
      'Kind: ' + ((extra && extra.kind) || ''),
      '',
      String((err && (err.stack || err.message)) || err || ''),
    ];
    fs.writeFileSync(file, lines.join('\n'));
    return file;
  } catch (e) {
    return '';
  }
}

module.exports = { explain, writeLog };
