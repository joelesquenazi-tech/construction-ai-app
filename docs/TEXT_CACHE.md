# Reusing local OCR

The first RP-4 slice stores only raw text, boxes and confidence from bundled English OCR. A repeat scan of an unchanged drawing can skip OCR initialization and recognition. PDF embedded text and dimension association still run normally. There is no full vision model or geometry cache.

## Correctness and privacy

- Match original and raster SHA-256, project, room, sheet, page, revision, pixel dimensions and the explicit OCR/preprocessing version. Future OCR asset, language or preprocessing changes must bump `scan-text-cache.js`'s version.
- Rebuild findings, current knowledge suggestions and dimension evidence each time. Never store reviews, corrections, confirmed scale or model geometry in this cache. Source and review guards still run before replacement; the normal replacement confirmation remains required.
- Store privately in this app origin's localStorage: at most four entries, 128,000 characters per entry and 256,000 characters total (roughly 512 KB UTF-16 payload). This is not encrypted storage. No upload or diagnostic export of cached text.
- Oversized, malformed or empty OCR results are not cached. Missing, corrupt, unavailable or full storage falls back to normal processing. Cache retention is an optimization, never required for a scan.
- Removing a drawing clears the OCR cache. Clear all app data removes it; the reset generation guard prevents old tabs from writing it back.
- Cached text may survive a cancelled or discarded scan if OCR already finished; it contains no review decision. Cancellation still prevents findings replacement.

Optional timing reports distinguish `text_cache: hit/miss` without including text or source identity. The existing extraction benchmark deliberately clears the cache before each run to preserve comparability. The offline OCR browser gate verifies real OCR, reload reuse, exact findings parity and declined-replacement correction preservation. These checks do not establish physical-device latency or broad drawing accuracy.

Remaining RP-4 work: region/crop processing, full analysis/model/rule-version cache, selective invalidation and independently validated revised-drawing correction reconciliation.
