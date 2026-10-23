# Clear all app data — Batch 3.13

Settings → Clear all app data permanently removes locally saved data for every project and room in this app on this browser/device. The confirmation lists drawings, original PDFs, reviews, construction records, model uploads/state, calibration, knowledge, preferences and unsaved edits. The user must type CLEAR and explicitly confirm. Cancel and direct visits to reset.html never clear data.

The confirmed action navigates to a dedicated reset document, unloading application scripts before deletion. Updated app tabs join the reset and reload afterward. Blocked database deletion displays instructions to close other app windows and continues automatically when the connection is released. Deletion failures show a retry button and warn that some data may already have been removed. Keep older app windows closed during reset.

The reset deletes the two known app IndexedDB databases and any additional construction-ai-* databases when enumeration is supported. It removes construction-ai-* localStorage and sessionStorage keys, leaving unrelated same-origin storage alone. Cache Storage and service-worker registrations are not cleared; app code, fonts, rendering/OCR engine caches, and the offline installation remain. Source files already saved in Files/downloads are not deleted.

On success the app reopens at the first-run workspace screen with an empty drawing library. Only internal migration/generation markers are retained to suppress the legacy demo sheet and avoid restoring pre-reset data via browser Back; default empty workspace settings are recreated on startup. Uploading new drawings works through the normal library. This is not an uninstall or code reset.

Keep original drawings/PDFs outside the app and export wanted reviews before clearing; review JSON does not include original drawing files. Clearing browser storage is irreversible. Reset must be deliberately initiated on the user's device; implementation/testing does not clear the user's installed app.

## Validation

Run `node tests/data-reset.cjs` with Playwright, Chromium and OpenSSL installed. The suite uses synthetic records/blobs only in disposable browser contexts. It checks typed confirmation/cancel, direct URL safety, deletion of drawings/model files and scoped data, unrelated storage retention, unchanged caches/worker, offline first-run/empty-library startup, coordination with a second app tab, blocked database handling, and failure/retry status. Existing geometry/scale/review tests and JS syntax checks also pass. Physical iPad Safari testing remains unavailable; Chromium uses iPad viewport/touch emulation.
