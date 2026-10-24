# Easy drawing upload — Batch 3.16

Upload drawings is available directly in the drawing toolbar and Drawing Library. It opens the device file picker and a simple upload panel:

1. Choose one or several JPG, PNG or PDF files.
2. Select Floor plan, Elevation or Other. This choice applies to the selected files; mixed types can be imported in separate batches or relabeled afterward.
3. Optionally name a single drawing, or choose PDF pages under PDF page selection.
4. Save drawings, then Done to view them.

Sheet numbers are generated automatically (FP001, EL001, DR001). Filenames supply default drawing names. PDF pages become separate labeled sheets, and generated numbers avoid existing page IDs. Up to 20 files can be selected per batch, 40 MB per file, with the existing limit of 20 PDF pages per document per import. Files stay in the existing IndexedDB library on this device.

Labels appear on library rows, in the drawing selector and viewer subtitle. Drawing type can be filtered separately from discipline. Select a sheet and use Selected drawing type to change its label. Relabeling preserves sheet IDs, coordinates, source files, reviews, records and calibration. Existing drawings are not renamed or reclassified automatically; known model-source roles supply display labels until explicitly changed. These labels organize sheets; they do not verify geometry or choose a model's source files automatically.

Advanced: sheet numbers and replacement retains the original manual import controls, including discipline and an explicit drawing-type choice. The existing Replace selected sheet control retains its label. Custom sheet imports continue to require confirmation before replacing saved images/pages.

The uploader warns before switching away from unsaved edits. During saving the dialog prevents accidental duplicate submission or dismissal. Each file has its own result; successful imports are retained and Retry failed files retries only failures. Cancel before saving leaves the library unchanged. Missing image MIME types from device Files are recognized from JPG/PNG extensions. The uploader is included in the app-shell cache and works offline after installation.

## Validation

`node tests/drawing-upload.cjs` uses generated PDFs and the existing app icon only in a disposable Chromium context with iPad viewport/touch emulation. It covers the direct native file picker, multiple files, cancel, required type, unsaved-edit cancellation, default names/unique numbering, per-page PDF labels, label edits/filtering, retry without duplicate successes, persistence/offline PDF upload, and unchanged existing reviews/records.

The PDF import and clear-data browser regression suites, all five geometry/scale/review test suites, JavaScript syntax and changed-file whitespace checks also pass. Physical iPad Safari testing is still pending; Chromium emulation is not Safari.
