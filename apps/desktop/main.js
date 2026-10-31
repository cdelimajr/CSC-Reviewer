// CSE Reviewer for Windows. The screens are built in (www/), so the app opens without internet.
// It uses the online CSE Reviewer (set in www/config.js) to log in, get new questions and save results.
const { app, BrowserWindow, shell, ipcMain, safeStorage } = require('electron');
const { execFile } = require('node:child_process');
const path = require('node:path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200, height: 820, minWidth: 380, minHeight: 600, title: 'CSE Reviewer', backgroundColor: '#1e40af', autoHideMenuBar: true,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, preload: path.join(__dirname, 'preload.js') },
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

// Windows Hello (fingerprint, face or PIN) through the built-in Windows API, run with PowerShell,
// so the app needs no extra native module. Used for quick login (see public/app.js).
function helloScript(body) {
  return `$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' })[0]
function Await($op, $type) { $t = $asTask.MakeGenericMethod($type).Invoke($null, @($op)); $t.Wait(-1) | Out-Null; $t.Result }
$V = [Windows.Security.Credentials.UI.UserConsentVerifier,Windows.Security.Credentials.UI,ContentType=WindowsRuntime]
${body}`;
}
function runHello(body, timeoutMs) {
  if (process.platform !== 'win32') return Promise.resolve('');
  const encoded = Buffer.from(helloScript(body), 'utf16le').toString('base64');
  return new Promise((resolve) => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded],
      { windowsHide: true, timeout: timeoutMs }, (err, stdout) => resolve(err ? '' : String(stdout).trim()));
  });
}
let helloCache = null;
ipcMain.handle('hello:available', async () => {
  if (helloCache === null) {
    const out = await runHello('Await ($V::CheckAvailabilityAsync()) ([Windows.Security.Credentials.UI.UserConsentVerifierAvailability])', 20000);
    helloCache = out === 'Available' && safeStorage.isEncryptionAvailable();
  }
  return helloCache;
});
ipcMain.handle('hello:verify', async (e, reason) => {
  const msg = String(reason || 'CSE Reviewer').replace(/[^\p{L}\p{N} .,!?-]/gu, '').slice(0, 80) || 'CSE Reviewer';
  const win = BrowserWindow.fromWebContents(e.sender);
  const out = await runHello(`Await ($V::RequestVerificationAsync('${msg}')) ([Windows.Security.Credentials.UI.UserConsentVerificationResult])`, 120000);
  if (win && !win.isDestroyed()) win.focus();
  return out === 'Verified';
});
ipcMain.handle('secure:protect', (e, text) => safeStorage.encryptString(String(text)).toString('base64'));
ipcMain.handle('secure:unprotect', (e, data) => safeStorage.decryptString(Buffer.from(String(data), 'base64')));

app.whenReady().then(() => {
  createWindow();
  autoUpdate();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
