// Gives the screens a few safe desktop features (nothing else from Node or Electron):
// - Windows Hello (fingerprint, face or PIN) for quick login
// - encryption of the login key with this Windows account (it cannot be read on another PC or account)
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cseDesktop', {
  hello: {
    available: () => ipcRenderer.invoke('hello:available'),
    verify: (reason) => ipcRenderer.invoke('hello:verify', String(reason || '')),
  },
  protect: (text) => ipcRenderer.invoke('secure:protect', String(text)),
  unprotect: (data) => ipcRenderer.invoke('secure:unprotect', String(data)),
});
