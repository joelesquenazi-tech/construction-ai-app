# Local dimension evidence — review candidate

Target: Stage 0 evaluation tooling and the Stage 1 text-to-line association prototype. Depends on the bundled offline OCR candidate in PR #56. Neither stage nor M1 is complete.

## Hypothesis and workflow

An explicit measurement label, its original-page text box, and a nearby straight line with two perpendicular witness intersections can form a useful **unverified dimension proposal**. These marks can also occur in non-dimension linework. The software does not establish their architectural meaning, view ownership, scale, or construction geometry.

1. Upload a drawing and select its sheet in **Drawings**.
2. Choose **Scan drawing**. Embedded PDF text is preferred; scanned pages use the bundled English OCR.
3. After the existing replacement confirmation, select a measurement marker. A blue rectangle identifies the approximate source text box; an orange dashed span appears only when one supported line association was found.
4. Review the original drawing. Confirm/Reject and Undo continue to record reading decisions. A corrected reading hides the original dimension overlay; the original automatic result stays available for evaluation. Replacing the drawing also hides old dimension overlays.
5. **Export reviews** includes the source-linked readings and dimension proposals for local evaluation.

No calibration, wall review, or 3D store is changed by this scan. The ordinary workflow does not require importing analysis JSON.

## Evidence and supported input

- Every new scan finding stores SHA-256 fingerprints of the original file and analyzed page raster, project/room, sheet, page, original pixel dimensions, and filename. Unknown revision stays `null`; the program does not invent a revision or view ID.
- Raster OCR now retains bounding rectangles, as native PDF text already does. PDF text-layer confidence remains `null` rather than a fabricated OCR score.
- The parser accepts whole labels with explicit feet/inches, mixed fractions through 1/64 inch, common Unicode fractions, and `mm`, `cm`, or `m`. It preserves the printed reading and records metres separately.
- Bare numbers, scale equations, AFF/datums, radius/diameter labels, mixed notes, unsupported fractions, and several dimensions in one text item are not interpreted as standalone linear measurements.
- Raster line processing is bounded to 1,800 pixels per side and 250 measurement association attempts. Endpoints map back independently in both axes to the original page pixels.
- Horizontal/vertical spans may be continuous or interrupted by their own label. Both endpoints must have perpendicular crossing evidence. Skewed/diagonal dimensions, arrowhead-only endpoints, graphic scales, and PDF vector path interpretation are not supported by this batch.

| Association status | Meaning |
| --- | --- |
| `candidate_unverified` | One plausible span with two witness crossings; interpretation needs review. |
| `ambiguous` | Several plausible spans; no endpoints selected. Up to five alternatives retained. |
| `unassociated` | A measurement reading exists, but no supported unique span was found, a bound was reached, or a text box is missing. |

Geometry status always stays `unverified`. Human reading confirmation does not promote it. Source fingerprints bind results to bytes, not to an independently authenticated drawing revision. A whole-page result still lacks individual drawing viewport ownership.

## Local independent ground truth

Run on your own machine, with permitted drawings and review exports kept outside the repository:

```sh
node tools/evaluate-dimensions.cjs /private/review-backup.json /private/dimension-truth.json > /private/dimension-report.json
```

The evaluator reads JSON only, performs no network calls, and does not open or upload the drawings. It accepts the existing `construction-ai-batch1` review export, or `{ "source": ..., "findings": [...] }` for one sheet. A changed fingerprint/page/revision/room is an error, even when image size and filename match.

The ground-truth file has this shape. Copy the **entire `source` object** from the new scan finding; independently annotate coordinates and measurement values. Placeholder source/coordinates below must be replaced. Choose source-specific tolerances before scoring.

```json
{
  "schema": "site-resolved-dimension-truth-v1",
  "dataset_kind": "permissioned_real",
  "source": {
    "sha256": "COPY_ORIGINAL_SHA256_FROM_SCAN",
    "raster_sha256": "COPY_RASTER_SHA256_FROM_SCAN",
    "filename": "COPY_FILENAME",
    "sheet_id": "COPY_INTERNAL_SHEET_ID",
    "sheet": "COPY_SHEET_LABEL",
    "page": 1,
    "revision": null,
    "project_id": "COPY_PROJECT_ID",
    "room_id": "COPY_ROOM_ID",
    "width_px": 800,
    "height_px": 500
  },
  "coverage": {
    "type": "regions",
    "exhaustively_annotated": true,
    "boxes": [{"x": 0, "y": 0, "width": 800, "height": 200}]
  },
  "label_tolerance_px": 5,
  "endpoint_tolerance_px": 3,
  "dimensions": [{
    "id": "independent-dimension-1",
    "metres": 3.6576,
    "label_box_px": {"x": 300, "y": 40, "width": 60, "height": 14},
    "axis": "h",
    "points_px": [[50, 80], [700, 80]]
  }]
}
```

Use `dataset_kind: "synthetic"` for invented fixtures. Coverage must be explicitly exhaustive: annotate **every applicable measurement label** inside each selected region, including misses. Full-page annotation uses `{ "type": "full_page", "exhaustively_annotated": true }`. Text boxes crossing a region boundary are outside scoring and counted as ignored; choose region boundaries accordingly. If a label has no independently identifiable span, use `points_px: null` and omit `axis`. An empty dimension list is valid for a deliberately selected negative region.

The report separates reading and span true/false positives, false negatives, precision, recall, and maximum endpoint error among matched spans. It uses maximum one-to-one matching, treats reversed endpoints as equivalent, and includes rejected original automatic predictions. Corrections cannot inflate the detector score. A missing denominator is reported as `null`, never perfect precision. Endpoint error for unmatched spans is represented by false positives/negatives, not hidden in an average of successful matches.

## Acceptance evidence and limits

- Node unit/regression checks cover units, invalid labels, source identity, line association, ambiguity, independent coordinate scaling, matching, duplicate predictions, omissions, annotation coverage, and human-correction isolation.
- Real bundled OCR browser test: install, disconnect browser network, reload, import synthetic raster, recognize `12 FEET`, recover expected witness endpoints within three original pixels, inspect overlay, correct/Undo, reopen the saved sheet after reload. No external requests.
- Synthetic native-PDF browser test: page 2 text and provenance, null OCR confidence, local span association, unchanged calibration/wall stores, replaced-source overlay suppression, and discarded late OCR after replacement with the exact same filename, dimensions and last-modified value.
- The browser tests use Chromium. Physical iPad Safari, Raspberry Pi timing/memory, representative permitted drawing accuracy, and agreed real-project tolerances remain OPEN. There is no real-drawing precision/recall claim.

Next gate: independently annotate an explicit region on a permitted real sheet, score it locally, inspect omissions and false matches, then improve extraction and view ownership. Independent scale confirmation, plan/elevation registration, and drawing-derived verified 3D remain later gates.
