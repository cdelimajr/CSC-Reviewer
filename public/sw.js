// Service worker: keeps the app's files on the device so CSE Reviewer opens instantly, even without internet.
// Files come from the device first (no waiting) and are updated in the background for the next visit.
// Questions for offline use are saved by app.js. Server data (/api) is never cached here.
const CACHE = 'cse-reviewer-v4';
const FILES = ['/', '/index.html', '/app.js', '/config.js', '/styles.css', '/manifest.webmanifest',
  '/icons/icon.svg', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  const key = e.request.mode === 'navigate' ? '/index.html' : url.pathname;
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const saved = await c.match(key);
    const fresh = fetch(e.request).then((res) => { if (res.ok) c.put(key, res.clone()); return res; });
    if (saved) { e.waitUntil(fresh.catch(() => {})); return saved; }
    return fresh.catch(() => c.match('/index.html'));
  }));
});
