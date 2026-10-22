// Only app-shell assets belong in Cache Storage. Private drawings remain in IndexedDB.
const CACHE_PREFIX = 'construction-ai-shell-';
const CACHE = `${CACHE_PREFIX}v2-5`;
const FILES = [
  './', './index.html', './styles.css', './app.js', './data.js', './pwa.js',
  './settings.js', './projects.js', './library.js', './knowledge.js', './ipad-ocr.js', './interpretation.js', './model3d.js', './light-ui.js', './sidebar.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', event => {
  // Fail the install if any required asset is unavailable; keep the old worker usable.
  event.waitUntil(caches.open(CACHE)
    .then(cache => cache.addAll(FILES))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys
      .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE)
      .map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(event.request);
    if (cached) return cached;
    // Home-screen launches may include query parameters. Serve the cached shell
    // only for the app entry points, never for missing images or other resources.
    const entry = new URL('./', self.registration.scope);
    if (event.request.mode === 'navigate' &&
        (url.pathname === entry.pathname || url.pathname === `${entry.pathname}index.html`)) {
      const shell = await cache.match('./index.html');
      if (shell) return shell;
    }
    return fetch(event.request);
  }));
});

// A user-initiated refresh can activate an already installed update.
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
