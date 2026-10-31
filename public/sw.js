// Service worker: keeps the app's files on the device so CSE Reviewer opens instantly, even without internet.
// The server fills in VERSION below (it changes whenever the app's files change). A new version downloads
// all files in the background into a new cache, then waits. It takes over when the app is next opened,
// or earlier when app.js says it is safe (app in the background, user not in the middle of anything).
// Questions for offline use are saved by app.js. Server data (/api) is never cached here.
const VERSION = '__VERSION__';
const CACHE = 'cse-reviewer-' + VERSION;
const FILES = ['/index.html', '/app.js', '/pdf.js', '/config.js', '/styles.css', '/manifest.webmanifest',
  '/icons/icon.svg', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // Always from the server (not the browser cache), so every file is from the same version.
    await Promise.all(FILES.map(async (f) => {
      const res = await fetch(f, { cache: 'reload' });
      if (!res.ok) throw new Error(`${f}: ${res.status}`);
      await c.put(f, res);
    }));
    // The older service worker (v1 to v6) cannot wait for a safe moment, so take over from it right away.
    // It already refreshed files one by one, so this changes nothing the user is doing.
    if ((await caches.keys()).some((k) => /^cse-reviewer-v\d+$/.test(k))) await self.skipWaiting();
  })());
});
self.addEventListener('message', (e) => { if (e.data === 'skip-waiting') self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  const key = e.request.mode === 'navigate' ? '/index.html' : url.pathname;
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const saved = await c.match(key);
    if (saved) return saved; // this version's files, never mixed with another version
    return fetch(e.request).catch(async () => (await c.match('/index.html')) || Response.error());
  }));
});
