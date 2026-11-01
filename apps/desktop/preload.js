// Gives the screens a few safe desktop features (nothing else from Node or Electron):
// - Windows Hello (fingerprint, face or PIN) for quick login
// - encryption of the login key with this Windows account (it cannot be read on another PC or account)
// - telling the app whether this account is Premium, so it checks for updates more often
// - asking the user before a downloaded update is installed
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cseDesktop', {
  hello: {
    available: () => ipcRenderer.invoke('hello:available'),
    verify: (reason) => ipcRenderer.invoke('hello:verify', String(reason || '')),
  },
  protect: (text) => ipcRenderer.invoke('secure:protect', String(text)),
  unprotect: (data) => ipcRenderer.invoke('secure:unprotect', String(data)),
  updates: {
    speed: (premium) => ipcRenderer.send('update:speed', !!premium),
    // A new version is downloaded: ask the user, then install it and restart the app.
    ready: () => ipcRenderer.invoke('update:ready'),
    onReady: (fn) => { ipcRenderer.on('update:ready', () => fn()); },
    install: () => ipcRenderer.invoke('update:install'),
  },
});
