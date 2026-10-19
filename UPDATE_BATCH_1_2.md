# Construction AI — Batch 1.2 update

## What changed
- The imported drawing fills the original 4480 × 3051 OCR coordinate canvas, even when its actual resolution is smaller.
- The app reports possible aspect-ratio mismatch (possible crop) and never treats OCR measurements as verified.
- The offline app cache version advances to v1.2; a refresh is needed after installation.
- An update notice can appear when the service worker detects a newer version.

## Update on iPad using GitHub Safari
1. In the public `construction-ai-app` repository, open **Add file → Upload files**.
2. Upload the files from this ZIP into the repository **root**, including `index.html`, `styles.css`, `app.js`, `data.js`, `pwa.js`, `sw.js`, `manifest.webmanifest`, and the `icons` folder.
3. GitHub should show existing files as changed/replaced, not a second nested folder. If it warns that files already exist or does not allow replacement, STOP and do not commit; use GitHub's editor to replace the four changed files instead: `index.html`, `styles.css`, `pwa.js`, and `sw.js`.
4. Commit with message `Update Construction AI Batch 1.2`.
5. Wait for the GitHub Pages deployment in **Actions** to finish.
6. Open your Home Screen app while online; fully close and reopen or refresh once to activate the new offline cache.
7. Confirm the drawing status says `scaled to the original 4480×3051 OCR coordinate space`.

## Safety and limitations
- Never upload A102, your drawing JPG, or private records to the public repository.
- The app's IndexedDB drawing and localStorage reviews should remain on the same device and origin, but export a JSON backup before updating. Browser storage can be cleared.
- Only the first 15 OCR examples are included. This update does not provide all 42 candidates, validate geometry, or prove that the resized drawing is uncropped.
- GitHub's web uploader may not support replacing files with identical paths in one batch. If so, stop; do not delete your current site to force the update.
