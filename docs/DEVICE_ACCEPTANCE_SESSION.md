# One device acceptance session

Status: prepared; physical iPad and Raspberry Pi checks not performed. Use a tested preview build, not an unverified production update. Complete automated checks and implementation batches before requesting this session.

## Prepare without Joel

- Run syntax, unit and all offline browser gates on the exact candidate commit, including the WebKit touch-viewport OCR/correction/cache check. WebKit on Linux is a compatibility test, not iPad Safari device acceptance.
- Keep native PDF and raster OCR fixtures, unchanged measurement tolerances and saved corrections tests.
- Check source changes, cancellation, interruption/restart, duplicate tabs, cache reuse and reset behavior automatically.
- Provide the preview link, exact commit and a short list of unresolved device checks together. No keyboard or developer console should be required.

## With Joel, when the candidate is ready

1. Record iPad model/iPadOS, Safari versus installed app, and available storage. Record Pi model/RAM/browser separately.
2. Enable Settings → Check processing speed. Import one permitted representative PDF and one image drawing. Keep copies outside the app.
3. Scan each; pan/zoom during processing. Record visible freezes and whether the device becomes unresponsive. Save the timing report locally.
4. Scan the same image again. Compare first and repeated scans; cache reuse must preserve identical unverified readings. Correct one finding, then decline replacement on another scan; the correction must remain.
5. Cancel a longer scan. Confirm the button responds and saved findings remain. Close/reopen during a scan, then use Restart scan; restarting begins from the start and must not silently publish partial results.
6. After the app and drawings are saved, disconnect internet and reopen. Check drawings, saved reviews and supported scanning. Reconnect afterward.
7. Compare selected dimensions/endpoints to the actual drawing. Agree source-specific tolerances and identify omissions; a fast result is not automatically accurate.

Do not clear real project data during acceptance. Use a disposable test project/build for destructive reset checks. Reports remain local unless explicitly shared. Device tests close only the measured cases, not full-model performance or the one-verified-room milestone.

WebKit CI simulates an unavailable app origin by closing every server connection after shell installation; an uncached probe must fail. Chromium uses browser offline mode. WebKit protocol offline navigation failed internally on the Linux runner before the workflow could be tested. Neither setup reproduces iPad radio or OS lifecycle behavior.
