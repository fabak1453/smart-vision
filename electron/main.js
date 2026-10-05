// ============================================================================
// Smart Vision ERP — Electron main process
//  Flow: check license → if trial/licensed, start embedded server + open the
//  ERP. If trial ended (or clock tampering), show only the activation window.
// ============================================================================
'use strict';

// Stability on older GPUs / Windows drivers (reduces blank window / GPU crashes)
try {
  if (process.platform === 'win32') {
    const { app: earlyApp } = require('electron');
    earlyApp.disableHardwareAcceleration();
    earlyApp.commandLine.appendSwitch('disable-gpu-sandbox');
    earlyApp.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
  }
} catch (e) { /* ignore */ }

const { app, BrowserWindow, Menu, ipcMain, shell, clipboard, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const license = require('./license');
const store = require('./db');
const localServer = require('./server');
const savedLogin = require('./saved-login');
const googleDrive = require('./google-drive');
const pairing = require('./pairing');

let mainWin = null;
let licWin = null;
let serverPort = null;

const APP_DIR = path.join(__dirname, '..', 'app');

// single instance
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const w = mainWin || licWin;
    if (w) {
      try {
        if (w.isMinimized()) w.restore();
        w.focus();
      } catch (e) { /* ignore */ }
    }
  });
}

function titleFor(st) {
  if (!st) return 'Smart Vision ERP';
  if (st.mode === 'licensed') {
    if (st.master) return 'Smart Vision ERP — Licensed (Master)';
    if (st.expires === '*') return 'Smart Vision ERP — Licensed (Lifetime)';
    return 'Smart Vision ERP — Licensed until ' + st.expires;
  }
  if (st.mode === 'trial') return 'Smart Vision ERP — Trial: ' + st.daysLeft + ' day(s) left';
  return 'Smart Vision ERP';
}

async function openMain(st) {
  if (!serverPort) {
    store.init(path.join(app.getPath('userData'), 'data'));
    const started = await localServer.start(APP_DIR);
    serverPort = started.port;
  }
  mainWin = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: titleFor(st),
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    show: false,
    autoHideMenuBar: false,
    backgroundColor: '#0f1720',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: path.join(__dirname, 'preload-app.js'),
      // Avoid rare Win 8 spellchecker crashes
      spellcheck: false,
    },
  });
  mainWin.once('ready-to-show', () => {
    try { mainWin.show(); } catch (e) { /* ignore */ }
  });
  // Fallback if ready-to-show never fires on some Win builds
  setTimeout(() => {
    try {
      if (mainWin && !mainWin.isDestroyed() && !mainWin.isVisible()) mainWin.show();
    } catch (e) { /* ignore */ }
  }, 4000);

  mainWin.on('page-title-updated', (e) => e.preventDefault());
  mainWin.webContents.on('render-process-gone', (_e, details) => {
    showFatalError('Smart Vision ERP — window crashed', new Error((details && details.reason) || 'render-process-gone'));
  });
  mainWin.webContents.on('unresponsive', () => {
    console.error('main window unresponsive');
  });

  await mainWin.loadURL('http://127.0.0.1:' + serverPort + '/index.html');
  mainWin.on('closed', () => { mainWin = null; });
}

function openLicenseWindow(st) {
  if (licWin) {
    try { licWin.focus(); } catch (e) { /* ignore */ }
    return;
  }
  licWin = new BrowserWindow({
    width: 560,
    height: 620,
    resizable: false,
    title: 'Smart Vision ERP — License',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    autoHideMenuBar: true,
    show: false,
    backgroundColor: '#0f1720',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload-license.js'),
      spellcheck: false,
    },
  });
  licWin.once('ready-to-show', () => {
    try { licWin.show(); } catch (e) { /* ignore */ }
  });
  licWin.loadFile(path.join(__dirname, 'license.html'));
  licWin.on('closed', () => {
    licWin = null;
    if (!mainWin) app.quit();
  });
}

function buildMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Data Folder',
          click: () => {
            try { shell.openPath(path.join(app.getPath('userData'), 'data')); } catch (e) { /* ignore */ }
          },
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'resetZoom' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'License',
      submenu: [
        { label: 'License / Activation…', click: () => openLicenseWindow(license.check()) },
      ],
    },
    {
      label: 'Help',
      submenu: [{
        label: 'About',
        click: () => {
          try {
            const st = license.check();
            dialog.showMessageBox({
              type: 'info',
              title: 'About',
              message: 'Smart Vision ERP ' + app.getVersion(),
              detail: (st.message || '')
                + '\nData: ' + path.join(app.getPath('userData'), 'data'),
            });
          } catch (e) { /* ignore */ }
        },
      }],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ------------------------------------------------------------------- IPC ---
ipcMain.handle('license:info', () => {
  try { return license.check(); } catch (e) { return { mode: 'error', message: String(e.message || e) }; }
});
ipcMain.handle('license:copyMachineId', () => {
  try { clipboard.writeText(license.machineCode()); return true; } catch (e) { return false; }
});
ipcMain.handle('license:activate', async (_e, key) => {
  try {
    const r = license.activate(key);
    if (r.ok) {
      const st = license.check();
      if (!mainWin) await openMain(st);
      else mainWin.setTitle(titleFor(st));
      if (licWin) setTimeout(() => { try { if (licWin) licWin.close(); } catch (e) { /* ignore */ } }, 900);
    }
    return r;
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
});

ipcMain.handle('login:save', (_e, data) => {
  try { return savedLogin.save(data || {}); } catch (e) { return { ok: false, error: String(e.message || e) }; }
});
ipcMain.handle('login:load', () => {
  try { return savedLogin.load(); } catch (e) { return { ok: true, data: null }; }
});
ipcMain.handle('login:clear', () => {
  try { return savedLogin.clear(); } catch (e) { return { ok: true }; }
});

ipcMain.handle('backup:saveCsv', async (_e, payload) => {
  try {
    const csvText = payload && payload.csvText;
    const defaultName = (payload && payload.defaultName) || 'cctv-erp-backup.csv';
    const safeName = String(defaultName).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
    const filePath = path.join(app.getPath('downloads'), safeName);
    fs.writeFileSync(filePath, String(csvText || ''), 'utf8');
    return { ok: true, path: filePath };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
});

ipcMain.handle('gdrive:status', () => {
  try { return googleDrive.status(); } catch (e) { return { ok: false, error: String(e.message || e) }; }
});
ipcMain.handle('gdrive:saveCredentials', (_e, data) => {
  try { return googleDrive.saveCredentials(data || {}); } catch (e) { return { ok: false, error: String(e.message || e) }; }
});
ipcMain.handle('gdrive:connect', async () => {
  try { return await googleDrive.connect(mainWin); } catch (e) { return { ok: false, error: String(e.message || e) }; }
});
ipcMain.handle('gdrive:disconnect', () => {
  try { return googleDrive.disconnect(); } catch (e) { return { ok: false, error: String(e.message || e) }; }
});
ipcMain.handle('gdrive:upload', async (_e, payload) => {
  try {
    return await googleDrive.uploadBackup(
      payload && payload.csvText,
      payload && payload.filename
    );
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
});
ipcMain.handle('gdrive:list', async () => {
  try { return await googleDrive.listBackups(); } catch (e) { return { ok: false, error: String(e.message || e), files: [] }; }
});
ipcMain.handle('gdrive:download', async (_e, fileId) => {
  try { return await googleDrive.downloadBackup(fileId); } catch (e) { return { ok: false, error: String(e.message || e) }; }
});

ipcMain.handle('lan:status', async () => {
  try { return localServer.pairingStatus(); } catch (e) { return { enabled: false, pin: '', urls: [], devices: [] }; }
});
ipcMain.handle('lan:enable', async (_e, on) => {
  try { return await localServer.setLanEnabled(!!on); } catch (e) { return { ok: false, error: String(e.message || e) }; }
});
ipcMain.handle('lan:rotatePin', async () => {
  try {
    pairing.newPin();
    return localServer.pairingStatus();
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
});

/**
 * Windows Firewall is the usual reason a phone / tablet "cannot reach" the shop
 * PC: the ERP binds 0.0.0.0 fine, but inbound connections are dropped until the
 * app is allowed through. This adds a rule for the app itself (not a port), so
 * it keeps working when the LAN port changes.
 */
ipcMain.handle('lan:allowFirewall', async () => {
  if (process.platform !== 'win32') return { ok: false, error: 'Windows only.' };
  const { execFile } = require('child_process');
  const exe = process.execPath;
  const rule = 'Smart Vision ERP (Wi-Fi sync)';
  const args = [
    'advfirewall', 'firewall', 'add', 'rule',
    'name=' + rule, 'dir=in', 'action=allow',
    'program=' + exe, 'enable=yes', 'profile=private,domain',
  ];
  const quoted = args.map((a) => "'" + String(a).replace(/'/g, "''") + "'").join(',');
  const ps = 'Start-Process -Verb RunAs -Wait -WindowStyle Hidden -FilePath netsh -ArgumentList ' + quoted;
  return new Promise((resolve) => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], (err) => {
      if (err) return resolve({ ok: false, error: 'Could not add the firewall rule. Approve the Windows prompt, or allow Smart Vision ERP manually in Windows Defender Firewall.' });
      resolve({ ok: true });
    });
  });
});

ipcMain.handle('whatsapp:open', async (_e, payload) => {
  let savedPath = null;
  const whatsappWebUrl = payload && payload.whatsappWebUrl;
  const pdfUrl = payload && payload.pdfUrl;
  const filename = payload && payload.filename;
  if (pdfUrl && filename) {
    let pdfWin = null;
    try {
      pdfWin = new BrowserWindow({
        show: false,
        webPreferences: { sandbox: false, contextIsolation: true },
      });
      // loadURL resolves on did-finish-load. Waiting for that event again after it
      // (as this used to) never fires, so every export hit the 15 s timeout and
      // no PDF was saved. Bound the load itself instead.
      await Promise.race([
        pdfWin.loadURL(pdfUrl),
        new Promise((_, reject) => setTimeout(() => reject(new Error('PDF page load timeout')), 15000)),
      ]);
      try {
        // Fonts and the logo must be in before printing, or the PDF has a hole.
        await pdfWin.webContents.executeJavaScript(
          'Promise.all([document.fonts ? document.fonts.ready : null].concat('
          + 'Array.from(document.images).map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; })))))'
        );
      } catch (e) { /* ignore */ }
      await new Promise((r) => setTimeout(r, 150));
      // A4 with the page margins from the document's own @page rule. (The old
      // `marginsType` option is not an Electron 33 option: it was ignored and the
      // PDF came out US Letter with default margins on top of the page's own.)
      const buf = await pdfWin.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4',
        preferCSSPageSize: true,
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
      });
      if (!buf || buf.length < 500) throw new Error('PDF buffer empty');
      const safeName = String(filename).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
      savedPath = path.join(app.getPath('downloads'), safeName);
      fs.writeFileSync(savedPath, buf);
      // Open Downloads with the PDF selected: drag it straight into the WhatsApp chat.
      try { shell.showItemInFolder(savedPath); } catch (e) { /* ignore */ }
    } catch (e) {
      console.error('pdf export failed', e);
    } finally {
      try { if (pdfWin && !pdfWin.isDestroyed()) pdfWin.destroy(); } catch (e2) { /* ignore */ }
    }
  }
  try {
    if (whatsappWebUrl) await shell.openExternal(whatsappWebUrl);
  } catch (e) { console.error('open whatsapp failed', e); }
  if (savedPath) {
    try {
      await dialog.showMessageBox({
        type: 'info',
        title: 'WhatsApp Web',
        message: 'PDF saved to your Downloads folder',
        detail: path.basename(savedPath)
          + '\n\nWhatsApp Web is opening in your browser, and the Downloads folder is open with this PDF selected: drag it into the chat (or use 📎 Attach).',
        buttons: ['OK'],
      });
    } catch (e) { /* ignore */ }
  }
  return { ok: true, pdfPath: savedPath };
});

const startupError = require('./startup-error');
let fatalShown = false;
/**
 * A short, plain message for the person at the PC; the full details go to a log
 * file (Open log folder). It used to put the whole stack trace in the dialog.
 */
function showFatalError(title, err) {
  const detail = err && (err.stack || err.message || String(err));
  console.error(title, detail);
  if (fatalShown) return; // one dialog, not a cascade of follow-up errors
  fatalShown = true;
  const info = startupError.explain(err, 'Smart Vision ERP');
  let logFile = '';
  try { logFile = startupError.writeLog(path.join(app.getPath('userData'), 'logs'), err, { app: app.getVersion(), kind: info.kind }); } catch (e) { /* ignore */ }
  try {
    const choice = dialog.showMessageBoxSync({
      type: 'error',
      title: info.title,
      message: info.title,
      detail: info.message + (logFile ? '\n\nDetails saved in:\n' + logFile : ''),
      buttons: logFile ? ['Open log folder', 'Close'] : ['Close'],
      defaultId: logFile ? 1 : 0,
      noLink: true,
    });
    if (logFile && choice === 0) shell.showItemInFolder(logFile);
  } catch (e) {
    try { dialog.showErrorBox(info.title, info.message); } catch (e2) { /* headless */ }
  }
}

process.on('uncaughtException', (err) => {
  showFatalError('Smart Vision ERP — unexpected error', err);
});
process.on('unhandledRejection', (reason) => {
  showFatalError('Smart Vision ERP — unexpected error', reason instanceof Error ? reason : new Error(String(reason)));
});

// ------------------------------------------------------------------ boot ---
let appQuitting = false;
if (gotLock) {
  app.on('before-quit', async (e) => {
    if (appQuitting || !mainWin || mainWin.isDestroyed()) return;
    e.preventDefault();
    appQuitting = true;
    try {
      await mainWin.webContents.executeJavaScript(
        '(typeof window.__svFlush === "function" ? window.__svFlush() : Promise.resolve(true))',
        true
      );
    } catch (err) { /* ignore */ }
    try { store.close(); } catch (e2) { /* ignore */ }
    app.exit(0);
  });

  app.whenReady().then(async () => {
    try {
      const userData = app.getPath('userData');
      license.init(userData);
      savedLogin.init(userData);
      googleDrive.init(userData, path.join(__dirname, 'google-oauth.json'));
      pairing.init(userData);
      buildMenu();
      const st = license.check();
      if (st.mode === 'trial' || st.mode === 'licensed') await openMain(st);
      else openLicenseWindow(st);
    } catch (err) {
      showFatalError('Smart Vision ERP could not start', err);
      app.quit();
    }
  });

  app.on('window-all-closed', () => {
    try { store.close(); } catch (e) { /* ignore */ }
    app.quit();
  });
}
