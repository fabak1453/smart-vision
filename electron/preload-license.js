'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('svLicense', {
  info: () => ipcRenderer.invoke('license:info'),
  activate: (key) => ipcRenderer.invoke('license:activate', key),
  copyMachineId: () => ipcRenderer.invoke('license:copyMachineId'),
});
