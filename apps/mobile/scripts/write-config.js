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
};
fs.writeFileSync(path.join(__dirname, '..', 'capacitor.config.json'), JSON.stringify(config, null, 2));
console.log('capacitor.config.json written');
