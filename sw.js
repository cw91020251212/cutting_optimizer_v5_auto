/* Cutting Optimizer service worker
 * Internal reliability only: network-first HTML/assets with a versioned offline cache.
 * The version is intentionally changed whenever the application bundle changes so
 * installed PWA clients do not keep an old index.html after a release.
 */
const APP_VERSION = '2026-09-24-internal-1';
const CACHE_NAME = `cutting-optimizer-${APP_VERSION}`;
const CORE_ASSETS = [
  './',
  './index.html',
  './assets/manifest.webmanifest',
  './assets/favicon.ico',
  './assets/icon-32.png',
  './assets/icon-192.png',
  './assets/icon-256.png',
  './assets/icon-512.png',
  './assets/apple-touch-icon.png',
  './assets/og-preview.png'
];

function isSameOriginGet(request) {
  return request.method === 'GET' && new URL(request.url).origin === self.location.origin;
}

async function cacheCoreAssets() {
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(CORE_ASSETS.map(async (asset) => {
    try {
      await cache.add(asset);
    } catch (_) {
      // Optional PWA assets should never prevent installation of the app shell.
    }
  }));
}

self.addEventListener('install', (event) => {
  event.waitUntil(cacheCoreAssets().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('cutting-optimizer-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (!isSameOriginGet(request)) return;

  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response && response.status === 200 && response.type === 'basic') {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    } catch (_) {
      const cached = await caches.match(request);
      if (cached) return cached;
      if (request.mode === 'navigate') {
        const shell = await caches.match('./index.html');
        if (shell) return shell;
      }
      return Response.error();
    }
  })());
});
