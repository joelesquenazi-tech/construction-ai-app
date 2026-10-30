# Stage 0: local wall-line accuracy benchmark

Target: the master plan's **open Stage 0 corpus and repeatable acceptance gate**.
Hypothesis: source-matched, independently reviewed centerline truth and explicit
tolerances let us measure detection improvements without confusing saved manual
corrections with automatic recognition. This batch supplies the evaluation
software and synthetic examples, not an authorized real-room corpus.

## What runs

```sh
node --test tests/*.test.cjs
node tools/run-wall-baseline.cjs
```

The baseline generates two temporary P5 PGM drawings, runs the **actual existing
`wall-proposals.js` detector**, scores original-pixel centerlines, prints JSON
reports, and removes its temporary inputs. It does not call a model or network.
The baseline command succeeds only if both expected outcomes are reproduced:

| Synthetic case | True positives | False positives | Missed walls | Precision | Recall | Case target |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Four-wall rectangle | 4 | 0 | 0 | 100% | 100% | passes |
| Rectangle + diagonal wall + non-wall parallel dimension pair | 4 | 1 | 1 | 80% | 80% | **fails** |

The deliberately difficult case exposes existing defects; a successful CI run
does not mean that case passed its accuracy target. Both examples use a
**synthetic-only** 6-pixel endpoint tolerance and 1-degree angle tolerance, with
95% minimum precision/recall and zero permitted non-wall matches. These are not
accepted tolerances for any real drawing. The detector remains unchanged.

## Private one-room workflow

Keep files outside the repository, or in the root `local-benchmarks/` directory
which is ignored by Git. Reports include source names, coordinates and review
metadata; treat them like the corresponding private drawings. No project input,
report, reference PDF or drawing needs to be uploaded to use this tool.

1. Select an authorized room and the exact plan, page, revision and view. Retain
   matching elevations/sections for the broader Stage 0 ground-truth table.
2. Prepare a full-page/view grayscale raster **without changing coordinate
   orientation**. The current runner accepts binary P5 PGM, max value 255,
   at most 2600 pixels per side, thresholded at grayscale <192. For PDFs,
   retain the original PDF separately and label coordinates
   `rendered_pdf_page_pixels`. Raster dimensions and the actual exported PGM
   checksum identify the evaluation pixel space. No implicit rescaling occurs.
3. Before evaluating, have two reviewers agree the centerline endpoints, known
   non-wall lines, coverage, pixel localization tolerances and detection targets.
   Record their identities and the rationale. `complete_view` means every wall
   centerline in that evaluation view is annotated, not merely easy examples.
   Use `partial` when truth is incomplete; it cannot pass the full-view gate.
4. Build a truth JSON using the contract below. Use SHA-256 of the original
   document bytes and of the exported PGM bytes, not file metadata. For an
   original PGM drawing, both hashes can be identical. The fixture generator in
   `tests/fixtures/wall-benchmark/synthetic.cjs` is a complete working example.
5. Run locally, supplying the original document when different from the PGM:

```sh
node tools/wall-benchmark.cjs \
  --case /private/room/truth.json \
  --raster /private/room/plan.pgm \
  --document /private/room/original.pdf \
  --output /private/room/report-001.json
```

`--output` creates a **new** file with mode 0600; it refuses to overwrite any
existing file, including an input or older report. Without it, the private report
is printed to the terminal. Exit codes: **0** case target passed; **1** valid
evaluation failed a target or has blockers; **2** invalid input or I/O error.
The runner reads local files only, never localStorage or IndexedDB, and does not
modify the source drawing, application reviews, OCR findings or model data.

Alternative detector output can be supplied with `--proposals raw.json` together
with `--raster` for checksum validation. This scores the supplied proposals
instead of the bundled detector. JSON-only input is permitted for diagnostics,
but cannot pass the byte-verified case gate. Supplied output's method/run ID are
declarations, not proof of how it was generated; archive its producing code and
parameters independently. Corrected/rejected app output is not a raw-detector
benchmark. There is no automatic export bridge from the browser in this batch.

## Version 1 JSON contract

Truth:

- `schema`: `construction-ai-wall-benchmark-case-v1`; `case_id`: stable case ID.
- `corpus_kind`: `synthetic` or `private_project`.
- `coverage`: `complete_view` or `partial`.
- `source`: all of `project_id`, `room_id`, `sheet_id`, `revision`, `view_id`,
  `filename`, one-based `page`, integer `width`/`height`, lowercase
  `document_sha256`/`raster_sha256`, and `coordinate_space`
  (`original_image_pixels` or `rendered_pdf_page_pixels`).
- `review`: `reviewer`, distinct `independent_reviewer`, ISO `reviewed_at`.
  These record supplied metadata; software cannot authenticate reviewer
  independence, authorization or annotation completeness. Synthetic fixtures
  identify synthetic expectation definitions, not real reviewers.
- `tolerances`: positive `endpoint_error_px`, `angle_error_deg` from 0 inclusive
  to 90 exclusive, and `rationale`. There are **no default project tolerances**.
- `targets`: `min_precision`, `min_recall` in (0,1], nonnegative integer
  `max_non_wall_matches`.
- `walls`: at most 200 `{id, points_px: [[x1,y1],[x2,y2]]}` centerlines.
- `non_walls`: at most 200 such records with an additional `reason`.
  IDs are unique across both sets; endpoints are finite, nondegenerate and
  within `0 <= x < width`, `0 <= y < height`. Do not mix wall faces and
  centerlines. Keep segmentation consistent at corners, openings and junctions.

Supplied proposals:

- `schema`: `construction-ai-wall-benchmark-proposals-v1`.
- `run_id`, `method`, the exact same `source`, and `candidates` (at most 200).
- Each candidate has `id`, `points_px`, `origin: local_image_heuristic`.
  Manual corrections are rejected. Raw proposals are scored even if additional
  supplied fields claim they were confirmed or rejected.

Source differences (including project, room, page, revision, view, raster bytes,
dimensions or coordinate space) are errors, never approximate comparisons.
Changing a drawing requires new truth review; never change its checksum just to
reuse stale labels. Coordinates in a resized/cropped export need their own
source raster and reviewed annotation coordinates.

## Metrics and limits

A potential match must satisfy **both** endpoint error and angle limits.
Endpoint error is the smaller, over the two endpoint orientations, of the
maximum endpoint distance. Angle error is the acute unoriented segment angle.
This penalizes incorrect extents; proximity to an infinite line or crossing the
right wall does not count. Maximum-cardinality one-to-one matching prevents
duplicate proposals increasing recall and avoids a simple greedy undercount.
Ties use stable IDs and distance-first adjacency; the assignment is deterministic
but does not minimize the total error across all maximum-cardinality matches.

Precision = matched candidates / all raw candidates. Recall = matched walls /
all truth walls. Unmatched candidates are false positives; unmatched truth walls
are omissions. All proposals are also checked against labeled non-wall lines;
the target counts distinct proposals, not repeated reference matches. A proposal
matching both wall and non-wall references flags a truth/tolerance conflict and
blocks passing. Undefined precision/recall (empty prediction/truth), partial
truth and unverified bytes cannot silently pass. Reports retain matched errors,
missed IDs, false-positive IDs, non-wall reasons and code SHA-256 identifiers.

This evaluator does not handle fragment aggregation, curved walls, wall-face to
centerline conversion, viewport registration, metric scale, openings, elevation
heights or dimensional model acceptance. A changed segmentation policy requires
reviewed new truth/versioning. PGM preprocessing differs from the browser's
canvas resampling; evaluate supplied original-pixel browser proposals separately
before making browser-performance claims. Runtime/memory benchmarks are pending.

**Stage 0 and M1 remain OPEN.** Every report explicitly leaves
`stage_0_complete`, `m1_verified`, and `real_world_acceptance` false, even for a
passing private case. A case result is one piece of the independent corpus,
dimensional, device and privacy/performance acceptance evidence required by the
master plan, not an approval of construction geometry.

## Validation of this batch

Regression tests cover the actual detector's synthetic baseline, duplicates,
missed/false wall lines, non-wall matches, reversed/short/long/angled/shifted
segments, non-greedy matching, source isolation, missing/partial/conflicting truth,
invalid coordinates/tolerances, manual correction refusal, PGM parsing, checksum
failures, exclusive output creation, network-blocked CLI and distinct exit codes.
Existing application JavaScript suites run alongside them. No runtime app code
or cache is changed; there is no release label or deployed app update in this
batch. Physical iPad Safari and real construction accuracy are still unverified.

Next: privately collect and independently review one room's truth/tolerances,
run the baseline, inspect errors, and use those results to prioritize diagonal,
dimension-exclusion and continuity evidence. Draft PRs #54 (local vision) and
#56 (offline OCR) remain separate, unmerged work; this batch does not replace
their outstanding device and real-model acceptance checks.
