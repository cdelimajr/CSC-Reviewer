// CSE Reviewer for Windows: a window that opens the online CSE Reviewer.
// Without internet it shows the "Walang internet" page and reloads when the connection returns.
const { app, BrowserWindow, shell, net } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

let APP_URL = 'https://cse-reviewer.onrender.com';
try { APP_URL = JSON.parse(fs.readFileSync(path.join(__dirname, 'app-config.json'), 'utf8')).url || APP_URL; } catch { /* default */ }
const host = new URL(APP_URL).host;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200, height: 820, minWidth: 380, minHeight: 600, title: 'CSE Reviewer', backgroundColor: '#1e40af', autoHideMenuBar: true,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.loadURL(APP_URL);
  win.webContents.on('did-fail-load', (_e, code, _desc, url, isMain) => {
    if (isMain && code !== -3) win.loadFile(path.join(__dirname, 'offline.html'));
  });
  // Keep the app on CSE Reviewer; open other links in the normal browser.
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => {
    if (url.startsWith('file:')) return;
    if (new URL(url).host !== host) { e.preventDefault(); shell.openExternal(url); }
  });
  // While the offline page is showing, check the connection and go back to the app when it returns.
  setInterval(() => {
    if (!win.isDestroyed() && win.webContents.getURL().startsWith('file:') && net.isOnline()) win.loadURL(APP_URL);
  }, 5000);
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
