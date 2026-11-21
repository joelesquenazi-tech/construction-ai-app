# Bundled OCR assets

Pinned unmodified distributions: tesseract.js 5.1.1 (Apache-2.0), tesseract.js-core 5.1.1 (license retained), @tesseract.js-data/eng 1.0.0 / 4.0.0 compressed English model. The language package declares MIT; upstream Tesseract English traineddata is distributed by the Tesseract project under Apache-2.0. Preserve applicable notices. Packages obtained using npm pack; SHA-256 checksums and sizes are in manifest.json.

The core directory contains all four WASM variants and their JavaScript loaders, allowing upstream SIMD/LSTM selection. No remote OCR endpoint is used. All worker/core/language paths are explicitly same-origin. Service-worker installation caches the complete asset set or fails and retains the prior app shell. The bundle adds approximately 41 MB; initial install/update requires access to the app host. Browser storage eviction can require reinstalling assets. Real iPad Safari memory/performance remains to be tested; a passing Chromium offline test is not proof of device support.

Do not update a single file independently. Repackage pinned distributions, regenerate manifest.json, update service-worker version, and rerun the real offline OCR fixture. Private drawings stay in IndexedDB and do not enter the asset manifest/cache.
