// Writes capacitor.config.json. The app opens APP_URL (your deployed CSE Reviewer).
const fs = require('node:fs');
const path = require('node:path');
const url = (process.env.APP_URL || 'https://cse-reviewer.onrender.com').replace(/\/$/, '');
const config = {
  appId: process.env.APP_ID || 'ph.csereviewer.app',
  appName: 'CSE Reviewer',
  webDir: 'www',
  server: { url, cleartext: false, allowNavigation: [new URL(url).host], errorPath: 'offline.html' },
  android: { backgroundColor: '#1e40af' },
  ios: { backgroundColor: '#1e40af', contentInset: 'automatic' },
};
fs.writeFileSync(path.join(__dirname, '..', 'capacitor.config.json'), JSON.stringify(config, null, 2));
console.log('capacitor.config.json ->', url);
