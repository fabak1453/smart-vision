'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  whatsappOpen: (payload) => ipcRenderer.invoke('whatsapp:open', payload),
  saveBackupCsv: (csvText, defaultName) => ipcRenderer.invoke('backup:saveCsv', { csvText, defaultName }),
  saveLogin: (data) => ipcRenderer.invoke('login:save', data),
  loadSavedLogin: () => ipcRenderer.invoke('login:load'),
  clearSavedLogin: () => ipcRenderer.invoke('login:clear'),
  gdriveStatus: () => ipcRenderer.invoke('gdrive:status'),
  gdriveSaveCredentials: (data) => ipcRenderer.invoke('gdrive:saveCredentials', data),
  gdriveConnect: () => ipcRenderer.invoke('gdrive:connect'),
  gdriveDisconnect: () => ipcRenderer.invoke('gdrive:disconnect'),
  gdriveUpload: (csvText, filename) => ipcRenderer.invoke('gdrive:upload', { csvText, filename }),
  gdriveList: () => ipcRenderer.invoke('gdrive:list'),
  gdriveDownload: (fileId) => ipcRenderer.invoke('gdrive:download', fileId),
});
