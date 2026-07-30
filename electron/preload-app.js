'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  whatsappOpen: (payload) => ipcRenderer.invoke('whatsapp:open', payload),
});
