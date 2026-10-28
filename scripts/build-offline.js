// Builds a single offline HTML file (no server, no internet needed) for testing the app.
// Output: dist/cse-reviewer-offline.html
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const modules = { './blueprint': 'src/blueprint.js', './generators': 'src/generators.js', './exam': 'src/exam.js' };
const { QUESTIONS, VERSION } = require('../src/bank');

// Where the offline file looks for newer questions when online (first one that works wins).
// Set CSE_ONLINE_URL to the deployed app (e.g. https://cse-reviewer.onrender.com) when it is live.
const sources = [];
if (process.env.CSE_ONLINE_URL) sources.push(process.env.CSE_ONLINE_URL.replace(/\/$/, '') + '/api/public/questions');
sources.push('https://raw.githubusercontent.com/cdelimajr/CSC-Reviewer/main/questions/questions.json');

// Also publish the question list to questions/questions.json (what the offline file downloads from GitHub).
fs.mkdirSync(path.join(root, 'questions'), { recursive: true });
fs.writeFileSync(path.join(root, 'questions', 'questions.json'), JSON.stringify({ version: VERSION, count: QUESTIONS.length, questions: QUESTIONS }, null, 1));
const iconUri = 'data:image/svg+xml;base64,' + Buffer.from(read('public/icons/icon.svg')).toString('base64');
const safe = (js) => js.replace(/<\/script/gi, '<\\/script');

const loader = `
const __mods = {}, __cache = {};
function __define(name, exports) { __cache[name] = { exports }; }
function __require(name) {
  if (__cache[name]) return __cache[name].exports;
  const m = { exports: {} }; __cache[name] = m; __mods[name](m, m.exports, __require); return m.exports;
}
${Object.entries(modules).map(([name, file]) => `__mods[${JSON.stringify(name)}] = function (module, exports, require) {\n${read(file)}\n};`).join('\n')}
`;

const html = `<!doctype html>
<html lang="fil">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>CSE Reviewer (Offline)</title>
<meta name="theme-color" content="#1e40af">
<link rel="icon" href="${iconUri}">
<style>${read('public/styles.css')}
.offline-bar { background: #f5b301; color: #172033; font-size: 13px; text-align: center; padding: 6px 12px; }
.offline-bar button { background: none; border: 0; text-decoration: underline; cursor: pointer; font-size: 13px; color: inherit; padding: 0 4px; }
</style>
</head>
<body>
<div class="offline-bar">Offline test version · naka-save ang data sa browser na ito lamang · <button onclick="if (confirm('Burahin ang lahat ng offline na data (accounts, resulta, tanong)?')) cseOfflineReset()">I-reset ang data</button></div>
<div id="app"><div class="boot">Naglo-load…</div></div>
<div id="toast" role="status" aria-live="polite"></div>
<script>window.__CSE_BANK = ${safe(JSON.stringify({ version: VERSION, sources, questions: QUESTIONS }))};</script>
<script>${safe(loader)}</script>
<script>${safe(read('offline/local-api.js'))}</script>
<script>${safe(read('public/app.js').split('/icons/icon.svg').join(iconUri).replace(/if \('serviceWorker' in navigator\)[^\n]*\n/, ''))}</script>
</body>
</html>
`;
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'cse-reviewer-offline.html'), html);
console.log(`Built dist/cse-reviewer-offline.html (${Math.round(html.length / 1024)} KB)`);
