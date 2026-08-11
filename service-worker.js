/*
  Service Worker for The Volume Ledger.

  What this file does, in plain terms:
  - It lets the app open even with no internet connection, by keeping a
    saved copy ("cache") of the app's own files (the HTML, the manifest,
    the icons).
  - It does NOT store your manga collection. Your series, volume
    statuses, notes, and covers live in the browser's own storage
    (localStorage/IndexedDB), completely separately from this cache.
    Nothing here can delete or touch that data.

  How updates work (read this before changing anything):
  - CACHE_NAME below has a version number in it (v1, v2, ...).
  - Every time you want to push a real update to the app, bump that
    number (v1 -> v2 -> v3 ...). That's what tells a phone that already
    installed this app "a new version exists."
  - On activate, this worker deletes any cache that doesn't match the
    CURRENT CACHE_NAME, so old cached copies of the app never linger
    around and get served by mistake.
  - self.skipWaiting() and clients.claim() below mean an update takes
    over immediately on next load, rather than requiring you to fully
    close and reopen the app.
*/

const CACHE_NAME = 'volume-ledger-v1';
const APP_SHELL = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

// Network-first for the app's own HTML, so you always get the latest
// version when you have a connection, and fall back to the cached copy
// only when you're offline. Cache-first for everything else (icons,
// manifest) since those change rarely.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const isAppShellPage = req.mode === 'navigate' || req.url.endsWith('index.html') || req.url.endsWith('/');

  if (isAppShellPage) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => caches.match(req).then((res) => res || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});
