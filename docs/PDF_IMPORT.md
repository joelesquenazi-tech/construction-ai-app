# PDF drawing import — Batch 3.12

Drawing Library and Replace selected sheet now accept PDF alongside JPG/PNG. The PDF pages field accepts `all`, a page number, or ranges such as `1-3,5`. Each page is a separate sheet (for example A101-P1 and A101-P2) with separate review/scale coordinates. Up to 20 pages per import and 40 MB per PDF are supported. Larger documents can be imported in page ranges.

PDF.js renders previews on this device, with a maximum edge of 2400 pixels and maximum area of 4 megapixels. These previews can be viewed, zoomed, calibrated, and scanned through the existing sheet tools. They do not create verified geometry. Existing scale and OCR findings must be checked when replacing a sheet. The original PDF is retained in IndexedDB and can be downloaded with Download source PDF. No PDF content is uploaded or sent to a CDN.

The model setup's existing PDF upload uses page 1 for its library preview and point ruler. Import additional pages through Drawing Library. Existing original PDF library entries also render page 1 rather than showing an empty preview. Password-protected PDFs must be unlocked before import; malformed documents report errors.

All renderer code, character maps, standard fonts and image codecs are vendored and included in the new service-worker shell cache. Initial installation/update needs internet, but PDF import and viewing work offline after installation. Browser storage eviction, quota limits, and unusually complex PDFs can still affect imports. Keep originals and review backups. Existing project, sheet, review, construction-record, geometry and model storage schemas/keys are not migrated or reset.

## Validation

`node tests/pdf-import.cjs` (Playwright, Chromium, Python/reportlab and OpenSSL) uses generated synthetic PDFs only. Verified two-page rendering into distinct sheet IDs, page-range selection, original PDF retention, preservation of existing reviews/records and image, errors without library mutation for corrupt/encrypted PDFs, offline import after reloading the app, and reopening cached previews offline. No external requests or page errors.

All five existing geometry/scale/review unit-test suites and JavaScript syntax checks passed. Physical iPad Safari testing is not available in this environment; Chromium uses iPad viewport/touch emulation and does not establish Safari compatibility.
