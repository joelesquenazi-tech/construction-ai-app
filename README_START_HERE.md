# Construction AI — Batch 1.1: Installable iPad prototype

## Privacy first
This package intentionally **does not contain A102.jpg**. Never upload private construction drawings to a public hosting site. After installing the app, use the **Import A102 drawing** field to select your JPG/PNG image locally. The drawing is stored in browser IndexedDB on that iPad and is not uploaded by this frontend. If browser website data is cleared or the PWA is removed, the drawing may be lost. Keep the original image in Files.

## Deployment (no terminal, no multitasking)
The PWA requires an HTTPS static host for the initial installation and updates. A private GitHub repo does **not** make GitHub Pages private. For a quick demonstration, publish ONLY the contents of this `app/` folder to a new public GitHub Pages repo; this folder contains no drawing image. Do not publish your existing private Construction-ai repo or its original drawings. If you do not want the app code public either, choose a private authenticated HTTPS hosting solution instead.

### iPad / Safari / GitHub Pages steps
1. In GitHub Safari, create a **new public repository**, for example `construction-ai-interface-demo`. Do NOT change visibility of your existing private `Construction-ai` repository.
2. Upload the contents of `app/` (not the outer ZIP) to the new repo root, preserving `icons/`. GitHub's web interface may make multi-file uploads cumbersome on iPad; GitHub's 'Add file → Upload files' supports choosing multiple files, and you can add icon files through the icons folder separately. If this is difficult, ask for a single-file alternative.
3. Repository **Settings → Pages → Build and deployment → Deploy from a branch → main / (root) → Save**.
4. Wait for the Pages deployment to succeed, then open the HTTPS Pages URL on the iPad in Safari.
5. Use Safari Share → Add to Home Screen → Add. Open from Home Screen while online once to let the app shell cache. Then test in airplane mode.
6. In the app, import the JPG/PNG of A102 from Files. The original `construction_ai_batch1/app/assets/A102.jpg` is available from the earlier ZIP in Files. Save a JSON review backup regularly.

## Limitations
- The 15 OCR samples are **still included in data.js** and are not confirmed dimensions. They are associated with A102; import the correct 4480×3051 A102 image to align markers.
- The drawing is saved in IndexedDB, while reviews/records are in localStorage; the Export reviews JSON **does not include the drawing image**. Keep the image separately.
- No Python OCR processing runs on the iPad; no automatic drawing recognition or 3D generation yet.
- Offline mode works after the service worker caches the app shell; iOS can evict cached content or site data. Offline reliability needs device testing.
- Updates to the app shell are fetched when online; reload/reopen after a new deployment. This is a prototype, not a production data system.
- The demo code is publicly readable if you use public GitHub Pages; no drawings or secrets should be committed there.
