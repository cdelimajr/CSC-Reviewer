// Copies the CSE Reviewer screens (public/) into an app, so the app opens without internet.
// Usage: node ../copy-web.js <target folder>   (APP_URL = the online server, for login and syncing)
const fs = require('node:fs');
const path = require('node:path');
const web = require('../src/webbuild');
const target = path.resolve(process.argv[2] || 'www');
const url = (process.env.APP_URL || 'https://cse-reviewer-7lmg.onrender.com').replace(/\/$/, '');
const version = web.versionOf();
fs.rmSync(target, { recursive: true, force: true });
for (const f of web.listFiles()) {
  fs.mkdirSync(path.dirname(path.join(target, f)), { recursive: true });
  fs.copyFileSync(path.join(web.DIR, f), path.join(target, f));
}
// CSE_BUILD tells the phone app which screens it has, so it only downloads newer ones.
fs.writeFileSync(path.join(target, 'config.js'), web.configJs(url, version));
console.log(`Copied app files to ${target} (server: ${url}, version ${version})`);
