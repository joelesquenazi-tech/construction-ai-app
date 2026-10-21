# Batch 1.2.1

Adds the missing 192px and 512px PNG app icons and shows Batch 1.2.1 in the header and About section. The required app-shell files now all exist, allowing the service worker's atomic precache to complete.

The service worker uses construction-ai-shell-v1-2-1, reads only its current cache, and removes only older construction-ai-shell caches. Unrelated origin caches are retained. Offline entry-point navigation also supports query parameters. Missing resources still use the network rather than returning HTML.

No changes to app.js, data.js, pwa.js, storage keys, IndexedDB schema, drawing imports, OCR samples, review decisions, or record serialization. No architectural drawings are included.

## Validation

Passed automated headless Chromium tests against a local HTTPS server under /construction-ai-app/:
- Install/update from a previous controlling worker; all nine required files cached and available offline.
- Old app-shell cache removed and unrelated cache retained.
- Header and About version labels visible.
- Offline reload and home/index.html navigation with query parameters.
- Synthetic PNG import retained in IndexedDB after worker update and offline reload.
- Saved confirmed OCR reading, review note, and construction records retained exactly after update/reload; all 15 findings remain loaded.
- Offline record edits persisted across reloads.
- Missing image fails offline rather than receiving HTML; no browser page errors.

Also passed JavaScript syntax checks, PNG decode/dimension checks against the manifest, and git diff --check.

## Repeating the device check after a separately authorized release

Open the app online at its existing origin, wait for offline installation, and refresh. Confirm both version labels. With a non-sensitive test image and test review/record saved locally, switch offline and reopen the app; verify the image, decision, and records remain and record edits survive reopening. Never commit drawings or private records.

## Limitations

No physical iPad/Safari or airplane-mode test was performed. Initial installation/update requires online HTTPS access and successful retrieval of all required files. A failed required-file fetch rejects installation, leaving a previously active worker available. Browser/iOS storage eviction or clearing site data can remove offline files and saved data; JSON backups exclude drawing images. Existing 15-example OCR dataset and other prototype limitations remain. Tests used synthetic data only; no live user browser data was accessed. No merge or deployment was performed.
