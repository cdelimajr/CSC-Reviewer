// CSE Reviewer for Windows. The screens are built in (www/), so the app opens without internet.
// It uses the online CSE Reviewer (set in www/config.js) to log in, get new questions and save results.
const { app, BrowserWindow, shell } = require('electron');
const path = require('node:path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200, height: 820, minWidth: 380, minHeight: 600, title: 'CSE Reviewer', backgroundColor: '#1e40af', autoHideMenuBar: true,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.loadFile(path.join(__dirname, 'www', 'index.html'));
  // Links to other websites open in the normal browser.
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file:')) { e.preventDefault(); shell.openExternal(url); }
  });
}

// Automatic updates from GitHub Releases: a new version downloads quietly in the background and is
// installed when the user closes the app, so it never interrupts an exam. The next start is the new version.
// Only the installed app (Setup.exe) can update itself; the portable .exe cannot.
function autoUpdate() {
  if (!app.isPackaged || process.env.PORTABLE_EXECUTABLE_DIR) return;
  let updater;
  try { ({ autoUpdater: updater } = require('electron-updater')); } catch { return; }
  updater.autoDownload = true;
  updater.autoInstallOnAppQuit = true;
  updater.on('error', () => {}); // offline or no release yet: try again later
  const check = () => updater.checkForUpdates().catch(() => {});
  check();
  setInterval(check, 4 * 3600e3);
}

app.whenReady().then(() => {
  createWindow();
  autoUpdate();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
