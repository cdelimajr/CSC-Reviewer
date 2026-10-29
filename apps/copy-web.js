// Copies the CSE Reviewer screens (public/) into an app, so the app opens without internet.
// Usage: node ../copy-web.js <target folder>   (APP_URL = the online server, for login and syncing)
const fs = require('node:fs');
const path = require('node:path');
const target = path.resolve(process.argv[2] || 'www');
const src = path.join(__dirname, '..', 'public');
const url = (process.env.APP_URL || 'https://cse-reviewer-7lmg.onrender.com').replace(/\/$/, '');
fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(src, target, { recursive: true, filter: (f) => !f.endsWith('sw.js') });
fs.writeFileSync(path.join(target, 'config.js'), `// Server for login, new questions and saving results.\nwindow.CSE_API = ${JSON.stringify(url)};\n`);
console.log(`Copied app files to ${target} (server: ${url})`);
