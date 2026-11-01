// Writes capacitor.config.json. The screens are built into the app (www/), so it opens without internet.
// It talks to the online CSE Reviewer at APP_URL to log in, get new questions and save results.
const fs = require('node:fs');
const path = require('node:path');
const config = {
  appId: process.env.APP_ID || 'ph.csereviewer.app',
  appName: 'CSE Reviewer',
  webDir: 'www',
  android: { backgroundColor: '#1e40af' },
  ios: { backgroundColor: '#1e40af', contentInset: 'automatic' },
  plugins: {
    // Automatic updates of the screens. app.js checks our own server and picks a safe moment to switch.
    // No Capgo cloud: the plugin's own update checks and usage reports are turned off.
    CapacitorUpdater: { autoUpdate: false, updateUrl: '', channelUrl: '', statsUrl: '', resetWhenUpdate: true },
    // Daily study reminder and "Premium ends tomorrow" (scheduled on the phone, so they work offline and when the app is closed).
    LocalNotifications: { iconColor: '#1e40af' },
  },
};
fs.writeFileSync(path.join(__dirname, '..', 'capacitor.config.json'), JSON.stringify(config, null, 2));
console.log('capacitor.config.json written');
