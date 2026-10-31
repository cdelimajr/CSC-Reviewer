// The app screens (public/) as one "web build", used for automatic updates:
// - version: a short fingerprint that changes whenever any screen file changes. The website's
//   service worker and the phone app compare it to know when there is something new.
// - zip(): the screens packed for the phone app, which downloads them in the background.
// copy-web.js uses the same code, so a freshly built app knows its own version.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');

const DIR = path.join(__dirname, '..', 'public');
// config.js differs between the website and the apps, and sw.js is only for the website.
const SKIP = new Set(['config.js', 'sw.js']);

function listFiles(dir = DIR, base = '') {
  const out = [];
  for (const e of fs.readdirSync(path.join(dir, base), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...listFiles(dir, rel));
    else if (!SKIP.has(rel)) out.push(rel);
  }
  return out;
}

function versionOf(dir = DIR) {
  const h = crypto.createHash('sha256');
  for (const f of listFiles(dir)) h.update(f).update('\0').update(fs.readFileSync(path.join(dir, f))).update('\0');
  return h.digest('hex').slice(0, 12);
}

const configJs = (api, version) => `// Server for login, new questions and saving results.\nwindow.CSE_API = ${JSON.stringify(api)};\nwindow.CSE_BUILD = ${JSON.stringify(version)};\n`;

/* A small zip writer (deflate), enough for the update bundle. */
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = (buf) => { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function makeZip(entries) {
  const parts = [], central = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name), packed = zlib.deflateRawSync(data), crc = crc32(data);
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0); head.writeUInt16LE(20, 4); head.writeUInt16LE(0x0800, 6); head.writeUInt16LE(8, 8);
    head.writeUInt32LE(0x00210000, 10); // fixed date (1980-01-01) so the same files give the same zip
    head.writeUInt32LE(crc, 14); head.writeUInt32LE(packed.length, 18); head.writeUInt32LE(data.length, 22); head.writeUInt16LE(nameBuf.length, 26);
    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0); dir.writeUInt16LE(20, 4); dir.writeUInt16LE(20, 6); dir.writeUInt16LE(0x0800, 8); dir.writeUInt16LE(8, 10);
    dir.writeUInt32LE(0x00210000, 12); dir.writeUInt32LE(crc, 16); dir.writeUInt32LE(packed.length, 20); dir.writeUInt32LE(data.length, 24);
    dir.writeUInt16LE(nameBuf.length, 28); dir.writeUInt32LE(offset, 42);
    parts.push(head, nameBuf, packed); central.push(dir, nameBuf);
    offset += 30 + nameBuf.length + packed.length;
  }
  const cdir = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cdir.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, cdir, end]);
}

// The screens as a zip for the phone app, with config.js pointing at this server.
function zip(api, dir = DIR) {
  const version = versionOf(dir);
  const entries = listFiles(dir).map((f) => ({ name: f, data: fs.readFileSync(path.join(dir, f)) }));
  entries.push({ name: 'config.js', data: Buffer.from(configJs(api, version)) });
  return makeZip(entries);
}

module.exports = { DIR, listFiles, versionOf, configJs, zip, crc32 };
