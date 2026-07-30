// ============================================================================
// Smart Vision ERP — Electron main process
//  Flow: check license → if trial/licensed, start embedded server + open the
//  ERP. If trial ended (or clock tampering), show only the activation window.
// ============================================================================
'use strict';
const { app, BrowserWindow, Menu, ipcMain, shell, clipboard, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const license = require('./license');
const store = require('./db');
const localServer = require('./server');

let mainWin = null;
let licWin = null;
let serverPort = null;

const APP_DIR = path.join(__dirname, '..', 'app');

// single instance
if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => {
  const w = mainWin || licWin;
  if (w) { if (w.isMinimized()) w.restore(); w.focus(); }
});

function titleFor(st) {
  if (st.mode === 'licensed') {
    if (st.master) return 'Smart Vision ERP — Licensed (Master)';
    if (st.expires === '*') return 'Smart Vision ERP — Licensed (Lifetime)';
    return `Smart Vision ERP — Licensed until ${st.expires}`;
  }
  if (st.mode === 'trial') return `Smart Vision ERP — Trial: ${st.daysLeft} day(s) left`;
  return 'Smart Vision ERP';
}

async function openMain(st) {
  if (!serverPort) {
    store.init(path.join(app.getPath('userData'), 'data'));
    const { port } = await localServer.start(APP_DIR);
    serverPort = port;
  }
  mainWin = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1024, minHeight: 640,
    title: titleFor(st),
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    autoHideMenuBar: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload-app.js'),
    },
  });
  mainWin.on('page-title-updated', (e) => e.preventDefault()); // keep our title
  mainWin.loadURL(`http://127.0.0.1:${serverPort}/index.html`);
  mainWin.on('closed', () => { mainWin = null; });
}

function openLicenseWindow(st) {
  if (licWin) { licWin.focus(); return; }
  licWin = new BrowserWindow({
    width: 560, height: 620, resizable: false,
    title: 'Smart Vision ERP — License',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true, nodeIntegration: false,
      preload: path.join(__dirname, 'preload-license.js'),
    },
  });
  licWin.loadFile(path.join(__dirname, 'license.html'));
  licWin.on('closed', () => {
    licWin = null;
    // if the app is blocked and the user closes the license window → quit
    if (!mainWin) app.quit();
  });
}

function buildMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Open Data Folder', click: () => shell.openPath(path.join(app.getPath('userData'), 'data')) },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    { label: 'View', submenu: [{ role: 'reload' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'resetZoom' }, { role: 'togglefullscreen' }] },
    {
      label: 'License',
      submenu: [
        { label: 'License / Activation…', click: () => openLicenseWindow(license.check()) },
        {
          label: 'Copy Machine ID',
          click: () => { clipboard.writeText(license.machineCode()); },
        },
      ],
    },
    {
      label: 'Help',
      submenu: [{
        label: 'About',
        click: () => {
          const st = license.check();
          dialog.showMessageBox({ type: 'info', title: 'About', message: 'Smart Vision ERP',
            detail: `${st.message}\nMachine ID: ${st.machineCode}\nData: ${path.join(app.getPath('userData'), 'data')}` });
        },
      }],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ------------------------------------------------------------------- IPC ---
ipcMain.handle('license:info', () => license.check());
ipcMain.handle('license:copyMachineId', () => { clipboard.writeText(license.machineCode()); return true; });
ipcMain.handle('license:activate', async (_e, key) => {
  const r = license.activate(key);
  if (r.ok) {
    const st = license.check();
    if (!mainWin) await openMain(st); // was blocked → open the app now
    else mainWin.setTitle(titleFor(st));
    if (licWin) setTimeout(() => licWin && licWin.close(), 900);
  }
  return r;
});

ipcMain.handle('whatsapp:open', async (_e, { whatsappWebUrl, pdfUrl, filename }) => {
  let savedPath = null;
  if (pdfUrl && filename) {
    const pdfWin = new BrowserWindow({
      show: false,
      webPreferences: { sandbox: true, contextIsolation: true },
    });
    try {
      await pdfWin.loadURL(pdfUrl);
      await new Promise((r) => setTimeout(r, 900));
      const buf = await pdfWin.webContents.printToPDF({
        printBackground: true,
        marginsType: 1,
      });
      savedPath = path.join(app.getPath('downloads'), filename);
      fs.writeFileSync(savedPath, buf);
    } finally {
      pdfWin.destroy();
    }
  }
  if (whatsappWebUrl) await shell.openExternal(whatsappWebUrl);
  if (savedPath) {
    await dialog.showMessageBox({
      type: 'info',
      title: 'WhatsApp Web',
      message: 'PDF saved to your Downloads folder',
      detail: `${path.basename(savedPath)}\n\nWhatsApp Web is opening in your browser. Use the attach (📎) button and select this PDF to send it.`,
      buttons: ['OK'],
    });
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

process.on('uncaughtException', (err) => showFatalError('Smart Vision ERP — startup error', err));
process.on('unhandledRejection', (reason) => showFatalError('Smart Vision ERP — startup error', reason));

// ------------------------------------------------------------------ boot ---
app.whenReady().then(async () => {
  try {
    license.init(app.getPath('userData'));
    buildMenu();
    const st = license.check();
    if (st.mode === 'trial' || st.mode === 'licensed') await openMain(st);
    else openLicenseWindow(st); // expired / tampered → activation gate only
  } catch (err) {
    showFatalError('Smart Vision ERP could not start', err);
    app.quit();
  }
});

app.on('window-all-closed', () => { store.close(); app.quit(); });
