const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
  sendNotification: (data) => ipcRenderer.send('notify', data),
  navigate: (path) => ipcRenderer.send('navigate', path),
  isElectron: true,
});
