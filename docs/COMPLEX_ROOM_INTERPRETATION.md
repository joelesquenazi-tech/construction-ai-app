# Complex-room interpretation — active development focus

Date: 2026-11-14
Status: approved priority; implementation and acceptance remain open.

## Outcome

Upload a permitted room drawing set. Automatically identify relevant plans, reflected ceiling plans, elevations, sections and details; build an editable preliminary room model; compare its geometry with the sources. Ask the superintendent only about genuinely missing or conflicting information. Preserve corrections across reload, reprocessing and revisions.

The existing rectangular-shell path does not satisfy this outcome. Its passing synthetic tests do not establish real-drawing accuracy. The recorded app still showed the manual workflow; development, release and installed-build verification are separate gates.

## Ordered implementation batches

### CR-1: Separate and identify views

Target: multi-view sheets like those visible in the user's recording.

- Preserve original file, revision, page and page-coordinate transforms.
- Detect view regions and associate titles, view numbers, room labels and scale notes with their own regions.
- Classify plan, RCP, elevation, section, detail, schedule, notes and unknown regions.
- Prevent title blocks, legends, neighboring views and dimensions from becoming room walls or measurements.
- Retain competing assignments as unresolved; do not infer view ownership solely from nearest text.
- Process multi-page sources explicitly; never silently use page one as the entire drawing set.

Deliverables: versioned view/evidence records; bounded extraction interface; varied synthetic sheets and negative cases; evaluation on permitted real sheets. Acceptance measures view detection misses/false positives, region overlap and wrong text/dimension ownership. Define source-specific tolerances before evaluating held-out examples.

### CR-2: Integrate replaceable vision interpretation

- Use native PDF text/vector evidence when available and OCR for raster sources.
- Give the vision adapter bounded view images plus source coordinates, rather than asking for an unsupported prose description of the entire building.
- Require structured proposals for walls, openings, room boundaries, ceiling features, references and uncertainty. Each proposal links to its source region.
- Validate schema, units, coordinate bounds and source identity. Reject malformed, stale or unsupported output; model confidence does not equal verified accuracy.
- Benchmark appropriately licensed, self-hostable candidates on the same held-out inputs before selecting one. Include a no-vision baseline, memory, cold/warm latency and failure rate.
- Keep UI and saved results usable locally. Heavy inference may run on an operator-controlled workstation/server; do not promise iPad/Pi inference speed without measurements. No confidential upload is authorized by this plan.

### CR-3: Reconcile a room across views

Resolve room identity, view orientation, detail references, revisions, independent scale evidence and floor/ceiling datums. Link each dimension to the element it measures. Maintain per-value evidence, conflicts and unknowns. A detail explains a profile only when its reference and host association are supported; proximity is insufficient.

### CR-4: Generate and verify complex geometry

Support concave/stepped footprints and angled walls, then curved walls with explicit radius/arc evidence. Add door/window openings and varying wall/ceiling heights. Reconstruct source-supported soffits, coves, trays and reveals through host-aware parameters. Keep missing details visibly incomplete.

Check closure, intersections, opening placement, dimension residuals, height consistency and projected model edges against each source view. Keep assumed, inferred, measured and verified values distinct. Never replace persistent corrections silently.

### CR-5: Deliver and verify the actual app

Use the tested build in a reviewable release, verify its deployment identity and update behavior, and confirm preserved projects/drawings/corrections. Distinguish draft, deployed and installed versions in reports. A passing branch does not mean the user's installed app has changed.

## Acceptance corpus and evidence

Start with reproducible synthetic drawing sets; use already permitted real drawings where available. The recording is evidence of workflow and sheet complexity, not a source suitable for dimensional ground truth. Do not reconstruct dimensions from its compressed pixels.

Required coverage:

| Case | Required behavior |
| --- | --- |
| Multiple views with different scales on one sheet | Separate coordinates and dimensions; no cross-view borrowing |
| L-shaped room, alcove and angled boundary | Preserve footprint topology and supported dimensions |
| Curved wall with radius missing or present | Reconstruct only supported arc; otherwise unresolved |
| Doors/windows with elevations and sections | Reconcile opening position, width, sill and head |
| Split ceiling, soffit, cove and reveal | Link location and profile; preserve unknown parameters |
| Conflicting dimensions or revisions | Report conflict; do not silently choose a value |
| Missing elevation, obscured text or noisy scan | Preserve partial result and explicit missing evidence |
| Revised source and existing correction | Revalidate affected elements without overwriting corrections |

Keep development and held-out sets separate. Record reference provenance and tolerances before scoring. Report dimension reading accuracy, association accuracy, feature precision/recall, topology errors, model dimension residuals, unresolved coverage, unnecessary user questions and elapsed time. Also report sample counts and unsupported cases. Synthetic accuracy is not real-project accuracy.

## Completion criteria

One real complex room set produces a dimensionally checked preliminary model without routine manual setup. Independently reviewed reference geometry, stated tolerances and source-linked errors support the result. Missing/conflicting evidence stays visible; corrections survive regeneration. Report processing time and UI responsiveness on actual target execution hardware. M1 remains open until its full acceptance criteria pass.

## Deferred while this is open

Unrelated styling, photorealism, VR/MR and broad MEP expansion. Continue only infrastructure work that directly enables drawing interpretation, verification, data preservation or delivery. Do not train a custom model or buy hardware before establishing the baseline and measured gap.

## CR-1 development checkpoint — 2026-11-17

Added `drawing-view-regions.js`, an isolated bounded whitespace-region proposal and evidence-association module. Keeps original page coordinates and source identity; rejects stale regions; crossing/uncontained evidence stays unassigned and overlapping ownership stays ambiguous. Title hints distinguish explicit floor-plan/RCP/elevation/section/detail/schedule text; mixed labels remain unknown.

Six new unit tests pass; full unit suite: 182 passed. Includes transformed coordinates, neighboring views, crossing dimensions, overlapping assignments, revisions, blank/connected sheets and bounds. These are synthetic tests only.

Not connected to production reconstruction yet. Whitespace can split a single view or merge several, especially with sheet borders, dimensions or title blocks. Outputs are proposals, never verified view boundaries. Next: combine raster regions with title/reference evidence and evaluate real sheet ownership before feeding cropped views to wall detection. No new automatic wall tracing or live deployment is claimed by this checkpoint.

## CR-1 development checkpoint — title evidence and worker integration

The automatic-room worker now runs region proposals and contained-title analysis, returning `viewAnalysis` with source-linked title boxes, candidate types, evidence assignments and ambiguity explanations. The offline shell includes the new dependency. Exact title-shaped labels are used; common prose references are excluded. Multiple titles, including two of the same type, leave a region unknown. Detached titles are not assigned by nearest-neighbor guessing.

Verification: 185 unit tests pass, including execution of the actual worker with raster fallback, source transforms, references, overlapping assignments, detached labels and multiple titles. The existing rectangular reconstruction still uses its prior checks. View analysis is diagnostic and explicitly `geometry_ready: false`; it does not authorize crop-based geometry. Browser/device testing and real sheet view-boundary accuracy remain open. Next: reconcile detached title strips and graphic regions using additional layout evidence, then test safe cropped wall detection against independently defined regions.

## CR-1 checkpoint — detached captions

Added layout proposals for title strips beneath a graphic. Requires horizontal containment, left/center alignment, bounded vertical gap and no intervening region. Competing captions or overlapping graphic candidates remain ambiguous; prose references and titles already inside substantial regions are excluded. Links preserve source identity and title boxes without merging regions or promoting geometry eligibility. Worker diagnostics include these links automatically.

190 unit tests pass, including a raster-to-region-to-caption integration fixture, intervening content, distant/offset captions, competing titles, stale sources and unchanged inputs. Thresholds are provisional synthetic-fixture settings. Detached captions remain unverified suggestions; no general view ownership, automatic complex-room tracing or deployed update is claimed. Next: evaluate these proposals on permitted real sheets and establish validated crop ownership before generating region-scoped wall candidates.

## CR-1 checkpoint — real-sheet border failure

Evaluated the region proposer on an already permitted private elevation sheet, locally. Baseline returned one page-wide region because the thin sheet frame connected otherwise separate drawings. Added bounded suppression of thin, almost page-spanning margin lines in a segmentation-only copy; original raster pixels remain unchanged for wall and dimension extraction. Suppressed line indices are reported for diagnostics. No private pixels, text or source coordinates are committed.

On this one development sheet, the revised proposer returns ten regions. Visual overlay inspection shows separate regions around all four elevation drawings and separate note/title-block regions. This is a qualitative development result, not a held-out accuracy score or verified view ownership. It demonstrates separation, not automatic wall tracing or reconstruction. Other border styles, connected annotation lines and dense sheets remain open.

192 unit tests pass, including thin frame separation, byte-preservation of original raster, thick margin content and long interior lines. No deployment or physical-device validation. Next: native-text title associations on real regions, then region-scoped line proposals with full-source coordinate mapping and boundary guards.
