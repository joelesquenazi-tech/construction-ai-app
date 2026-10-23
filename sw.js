// Only app-shell assets belong in Cache Storage. Private drawings remain in IndexedDB.
const CACHE_PREFIX = 'construction-ai-shell-';
const CACHE = `${CACHE_PREFIX}v3-16-advanced-scale-review`;
const FILES = [
  './', './index.html', './styles.css', './app.js', './data.js', './finding-review.js', './pwa.js',
  './pdf-import.js','./drawing-image-source.js','./vendor/pdfjs/pdf.worker.min.mjs','./vendor/pdfjs/cmaps.json','./vendor/pdfjs/pdf.min.mjs','./vendor/pdfjs/wasm/jbig2_nowasm_fallback.js','./vendor/pdfjs/wasm/jbig2.wasm','./vendor/pdfjs/wasm/qcms_bg.wasm','./vendor/pdfjs/wasm/openjpeg_nowasm_fallback.js','./vendor/pdfjs/wasm/openjpeg.wasm','./vendor/pdfjs/standard_fonts/FoxitFixedItalic.pfb','./vendor/pdfjs/standard_fonts/FoxitSerifItalic.pfb','./vendor/pdfjs/standard_fonts/LiberationSans-Regular.ttf','./vendor/pdfjs/standard_fonts/LiberationSans-Italic.ttf','./vendor/pdfjs/standard_fonts/FoxitSymbol.pfb','./vendor/pdfjs/standard_fonts/FoxitSerifBoldItalic.pfb','./vendor/pdfjs/standard_fonts/LiberationSans-Bold.ttf','./vendor/pdfjs/standard_fonts/FoxitFixed.pfb','./vendor/pdfjs/standard_fonts/FoxitFixedBoldItalic.pfb','./vendor/pdfjs/standard_fonts/FoxitFixedBold.pfb','./vendor/pdfjs/standard_fonts/FoxitDingbats.pfb','./vendor/pdfjs/standard_fonts/LiberationSans-BoldItalic.ttf','./vendor/pdfjs/standard_fonts/FoxitSerif.pfb','./vendor/pdfjs/standard_fonts/FoxitSerifBold.pfb', './data-reset.js', './reset.html', './reset-data.js', './settings.js', './scale-review.js', './projects.js', './library.js', './knowledge.js', './ipad-ocr.js', './interpretation.js', './drawing-point-tools.js', './model3d.js', './wall-tracing.js', './wall-geometry.js', './geometry-preview.js', './wall-proposals.js', './wall-review-state.js', './wall-candidate-review.js', './light-ui.js', './sidebar.js', './launcher.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'
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
