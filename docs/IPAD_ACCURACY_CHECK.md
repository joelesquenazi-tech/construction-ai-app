# Touch accuracy check — Stage 0 evaluation candidate

This optional development workflow builds on PR #58's source-linked scan findings. It helps collect independently checked dimensions and measure recognition on the user's own device. It is not a normal prerequisite for modeling, a calibration tool, or an automatic verification of construction geometry.

## Operator workflow

1. Select a drawing, then open **Drawings → Advanced: check recognition accuracy → Open accuracy check**.
2. Choose **Mark test area**. Tap two opposite corners around one small area, refine the handles using the 4× source magnifier, and choose **Use marked test area**. Zoom buttons and scrolling are available; placement does not use detector snapping.
3. Choose **Add independent dimension**. Mark the printed label box and the two dimension endpoints, or explicitly choose **No identifiable span**. Enter the reading with feet/inches and fraction selectors, or a numeric metric value and unit. Save it.
4. Mark every applicable measurement in the test area, including readings the scanner missed. Current scope is linear readings and horizontal/vertical dimension spans. The detector's proposals are hidden throughout annotation and are never used to populate the independent list.
5. Choose permitted-project or synthetic drawing, and set label/endpoint tolerances in **original source pixels** before scoring. These are source-quality test tolerances, not construction acceptance tolerances. Confirm both exhaustive annotation coverage and independent checking against the source. A deliberately selected area with zero applicable measurements is a valid negative test.
6. Choose **Measure recognition accuracy**. If there is no current scan, close the dialog, use **Scan drawing**, and reopen the saved check. Review matched/missed/extra readings and spans, precision, and recall. Human corrections or rejections do not improve the automatic reading score.
7. **Export private test bundle** saves the exact annotations, original detector findings, source identity and report. It contains no drawing image/PDF bytes, but its text and annotations may still be confidential.

Independent annotations save after each completed action; unfinished placements are not saved. **Undo saved action** restores the previous annotation/settings state. Reopen the same drawing to continue. Scope changes invalidate the coverage confirmation until checked again.

## Source, storage and scoring boundaries

- Original-file and analyzed-page SHA-256, page, revision, source dimensions, sheet and project/room must match the scan exactly. Unknown revision remains null. A same-size/name replacement starts a separate check; previous check records remain associated with the earlier bytes.
- Checks use a separate, versioned IndexedDB database. They do not change recognized text, reading decisions, calibration, walls, or model stores. The existing **Clear all app data** workflow includes this database. Source files and exports need their own external backups.
- Writes use a monotonically increasing revision inside a read/write transaction. A stale tab cannot overwrite a newer saved check; it must reopen. Room/sheet changes close the dialog, and late opens/saves cannot install a different source's state into the current dialog.
- Up to 100 independent dimensions, one region per source check, and ten undo snapshots are supported. Labels must lie fully inside the selected region; endpoints can extend beyond it within the same source page.
- The browser and command-line evaluator use the same dependency-free scoring module. Matching is one-to-one; duplicate predictions cannot inflate recall. Rejected original predictions are included. A missing denominator yields `null`, not a perfect score.
- Predictions whose label boxes cross the region boundary are outside scoring and counted as ignored. Pick boundaries with room around labels; this is region-scoped evaluation, not whole-sheet accuracy.
- No measurements or drawing bytes are sent to an inference service by the check. Annotations are manual source evidence, not training data or model facts. Physical iPad Safari and target-machine performance remain acceptance gates.

## Reproduce an exported check locally

```sh
node tools/evaluate-dimensions.cjs private-dimension-accuracy-check.json > report.json
```

This recomputes the score from the included truth and predictions rather than trusting the cached report. The previous two-file invocation remains supported:

```sh
node tools/evaluate-dimensions.cjs review.json truth.json > report.json
```

Exports use `site-resolved-dimension-check-bundle-v1`; independent truth retains `site-resolved-dimension-truth-v1`. The UI's structured unit entry converts values independently of the detector's text parser.

## Evidence for this batch

- Unit/regression tests cover independent units, source isolation, missing/invalid coverage and tolerances, negative regions, omissions, original rejected readings, validation, bounded history, undo and confirmation invalidation.
- Offline touch-capable Chromium test covers blank independent annotations, area/label/span taps, zoomed touch-handle dragging and the 4× magnifier, numeric unit entry, an intentionally omitted detector reading, scoring/export/CLI recomputation, reload persistence, undo, tab revision conflict, and closing on room change. Existing scan/model stores remain unchanged. This is emulation, not physical iPad Safari evidence.
- A private pilot used one real uploaded elevation PDF and a region with **two visually annotated linear measurements**, prepared before scan results were inspected. Native PDF text read **2/2** correctly under pilot label tolerance; raster line association matched **0/2** dimension spans. No incorrect span was promoted to geometry. The pilot identifies a real endpoint-association limitation; it does not establish representative drawing accuracy.
- The real drawing, its text, identity hashes, independent coordinates and full results remain private. Only synthetic sources and aggregate pilot counts are committed. Pilot annotations still require superintendent confirmation, and its pixel tolerances are not agreed project acceptance tolerances.

## Next gate

Review the two pilot annotations independently with the superintendent. Improve chained/tick-ended and short dimension-span extraction using a varied synthetic failure corpus; retain before/after measurements and test additional permitted regions. Broader real-sheet ground truth, source-specific acceptance tolerances, view ownership, automatic scale cross-checks, plan/elevation registration and M1 remain OPEN.
