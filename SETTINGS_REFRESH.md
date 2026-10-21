# Settings and Refresh App

The header cog opens a modal Settings panel. Refresh App checks for a deployed service worker, waits for installation, activation, and control of the current page, then reloads. The existing update-notice button uses the same flow. Status and retryable errors appear in Settings. Checks and activation have a 20-second timeout; failed checks/installations do not reload.

Unsaved review inputs and record fields are compared with saved state before refresh. Cancel preserves those edits; choosing Continue discards only unsaved edits on reload. A refresh waits for any pending IndexedDB drawing save to commit. No localStorage or IndexedDB data is cleared or migrated. Existing keys, database/store names, and the OCR dataset are retained. The shell cache advances to v1-2-2 and includes settings.js.

## Automated checks

Run `node tests/settings-refresh.cjs` with Playwright, Chromium (`/usr/bin/chromium` or CHROMIUM_PATH), and OpenSSL installed. The test creates an ephemeral loopback HTTPS server and certificate, uses only a generated app icon as the synthetic image, and cleans up the browser and certificate afterward.

Passed in Chromium with iPad viewport/touch emulation:
- Cog/dialog opening, Escape dismissal, and usable refresh button.
- Unsaved review and construction-record warnings; cancellation retains inputs.
- Offline and HTTP update errors, failed precache installation, and retry.
- Actual new worker control and new deployed shell before/after refresh.
- Successful refresh with no newer worker.
- Exact localStorage preservation (reviews, decisions, records), IndexedDB image restoration, and offline reload with all ten app-shell files cached.
- No page JavaScript errors.

JavaScript syntax and changed-file whitespace checks also passed.

## iPad Safari validation — pending

No physical iPad/Safari or connected device-testing service is available in this environment. Chromium device emulation is not Safari testing. This PR stays draft pending the following check on an authorized HTTPS staging deployment, without deploying or merging main:

1. In iPad Safari and the installed Home Screen app, import a non-sensitive synthetic PNG; save a review decision, note, and construction record.
2. Open the cog using touch. Check panel sizing, scrolling, focus, close button, and status announcements.
3. Change a review field without saving. Refresh App must warn; Cancel must retain the input. Repeat for construction records.
4. Save edits. Refresh App must check online and reload after the new worker controls the page. Verify the deployed version and all saved data.
5. Repeat with no update, offline, and with an unavailable required asset on staging. Errors must remain visible with a working retry button; saved data must remain intact.
6. Close/reopen offline and confirm the synthetic image, decisions, and records still load.

Safari/iOS can evict browser data; refresh cannot prevent that. No architectural drawings or private records belong in this repository. No merge or deployment was performed for this change. This change is stacked on PR #1, which remains unmerged.
