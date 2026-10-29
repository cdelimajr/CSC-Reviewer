// Service worker: keeps the app's files on the device so CSE Reviewer opens without internet.
// Questions for offline use are saved by app.js. Server data (/api) is never cached here.
const CACHE = 'cse-reviewer-v3';
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
  // Use the newest files when online, the saved copy when offline.
  e.respondWith(fetch(e.request).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request.mode === 'navigate' ? '/index.html' : e.request, copy)); }
    return res;
  }).catch(() => caches.match(e.request.mode === 'navigate' ? '/index.html' : e.request, { ignoreSearch: true })
    .then((r) => r || caches.match('/index.html'))));
});
