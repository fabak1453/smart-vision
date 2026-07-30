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
        webPreferences: { sandbox: true, contextIsolation: true },
      });
      await pdfWin.loadURL(pdfUrl);
      await new Promise((r) => setTimeout(r, 900));
      const buf = await pdfWin.webContents.printToPDF({
        printBackground: true,
        marginsType: 1,
      });
      const safeName = String(filename).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
      savedPath = path.join(app.getPath('downloads'), safeName);
      fs.writeFileSync(savedPath, buf);
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
          + '\n\nWhatsApp Web is opening in your browser. Use the attach (📎) button and select this PDF to send it.',
        buttons: ['OK'],
      });
    } catch (e) { /* ignore */ }
  }
  return { ok: true, pdfPath: savedPath };
});

function showFatalError(title, err) {
  const detail = err && (err.stack || err.message || String(err));
  console.error(title, detail);
  try {
    dialog.showErrorBox(title, detail || 'Unknown error');
  } catch (e) { /* headless */ }
}

process.on('uncaughtException', (err) => {
  showFatalError('Smart Vision ERP — unexpected error', err);
});
process.on('unhandledRejection', (reason) => {
  showFatalError('Smart Vision ERP — unexpected error', reason instanceof Error ? reason : new Error(String(reason)));
});

// ------------------------------------------------------------------ boot ---
if (gotLock) {
  app.whenReady().then(async () => {
    try {
      const userData = app.getPath('userData');
      license.init(userData);
      savedLogin.init(userData);
      googleDrive.init(userData, path.join(__dirname, 'google-oauth.json'));
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
