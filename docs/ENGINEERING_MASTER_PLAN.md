# Construction AI — Engineering Master Plan v1.0
Date: 2026-10-21
Status: APPROVED ENGINEERING DIRECTION; milestones NOT YET VERIFIED

## North Star
Turn real architectural and MEP construction drawings into an accurate, editable, source-traceable 3D model for field coordination. Never mistake a conceptual visualization for reconstructed geometry.

## Non-negotiable principles
1. Dimensional accuracy before photorealism, native packaging, or VR.
2. Every element stores drawing source, sheet/revision, page, geometry evidence, confidence, and verification status.
3. Distinguish measured, inferred, assumed, contradictory, and unknown geometry. Never silently invent.
4. AI proposes interpretations; deterministic geometry and consistency checks validate them.
5. Superintendent review and corrections are persistent, reversible, and scoped appropriately.
6. Preserve confidential user-controlled data and provider-independent, self-hostable inference. Internet access is allowed; third-party hosted AI must not be required.
7. Prove one room end to end, then scale to floors/buildings and MEP.
8. No automatic RFI submission; only flag possible coordination/RFI needs.

## Development stages and exit gates
### Stage 0 — Baseline and test corpus
- Audit actual app behavior and identify placeholders vs functioning pipeline.
- Choose one permitted room with plan, elevations, and ideally sections; confirm drawing revisions.
- Produce ground-truth table of walls, openings, ceiling elevations, and key dimensions, independently measured/confirmed.
- Define test cases: clean raster, rotated scan, cropped plan, scale bar, dimension disagreement, multiple revisions, missing elevation.
- Exit: repeatable input corpus, ground truth, and automated tests exist.

### Stage 1 — Drawing ingestion and coordinate system
- Preserve original files; page IDs, project/room, revision, units, orientation, metadata, source provenance.
- Render PDFs/raster consistently at known resolution; support zoom and pan with coordinate transforms.
- Calibrate by graphic scale or known dimension; cross-check a second independent measurement.
- Detect contradictory scales or distorted scans; flag uncertainty.
- Exit: measurements are repeatable and within a tolerance defined from the source quality; no silent scaling errors.

### Stage 2 — 2D architectural geometry
- Extract vector paths when available; otherwise process raster linework.
- Propose wall centerlines/faces, intersections, door/window openings, arcs and symbols.
- Associate dimensions and text with geometry; editable correction tools.
- Store geometry as structured objects with drawing-coordinate references and provenance.
- Exit: one room's footprint and openings match independently confirmed ground truth.

### Stage 3 — Multi-view reconciliation
- Align plan with elevations and sections using gridlines, walls, opening IDs, datum and known dimensions.
- Infer vertical heights and opening positions only with evidence; expose conflicts and missing data.
- Use consistent coordinate conventions, levels and units.
- Exit: reconciled, source-backed 3D room specification with explicit unresolved issues.

### Stage 4 — Deterministic 3D reconstruction
- Generate walls with actual thickness/height, openings, slabs/ceilings, not a conceptual cube.
- Keep geometry separate from visualization; support regenerate after corrections.
- Store editable semantic model with persistent element IDs and source links.
- Exit: measurable 3D room reproduces agreed ground truth within documented tolerances.

### Stage 5 — Verification and correction loop
- Project model edges and dimensions back onto each source view.
- Check dimensions, topology, intersections, clearance, cross-sheet consistency and revision mismatches.
- Explain discrepancies and let superintendent accept/reject/edit; keep audit history.
- Exit: every modeled element has source support or an explicitly acknowledged assumption; reproducible test report passes.

### Stage 6 — Architectural detail
- Add wall assemblies, reveals, baseboards, millwork, finish layers, specialty conditions, and existing conditions.
- Exit: construction details reconcile across views and preserve tolerances.

### Stage 7 — MEP coordination
- Add ducts, pipes, electrical, sprinklers and clearance envelopes with source attribution.
- Check interference and access, distinguish true clashes from incomplete information.
- Exit: reviewed test conflicts have defensible geometry and clear provenance.

### Stage 8 — Provider-independent deployment
- Package the geometry engine and self-hosted inference for local or operator-controlled server deployment; benchmark on target devices.
- Web/iOS packaging is secondary to engine correctness. Allow optional desktop processing without making network essential.
- Exit: the critical workflow completes without third-party hosted AI; documented offline features pass airplane-mode tests.

### Stage 9 — VR/MR
- Export verified model to lightweight Quest 3S walkthrough; layers and measurements.
- Later, marker-calibrated mixed reality site overlay.
- Exit: immersive model coordinates and dimensions match the verified canonical model.

## Milestone M1: One verified room
Inputs: floor plan plus matching elevations; sections if needed; source revisions and ground truth.
Outputs: real 3D walls, doors, windows, ceiling, measurable dimensions, evidence links, unresolved assumption register, corrections and repeatable regeneration.
Acceptance:
- Source-to-model dimensional tolerances agreed before testing and documented per element.
- No invented wall, opening, height or datum marked as verified.
- Independent source dimensions cross-check scale.
- Every element traceable to drawing coordinates/sheet/revision.
- Corrections persist through reload and regeneration.
- Automated regression cases pass, including contradictory/missing inputs.
- Another reviewer can reproduce the results.
Not accepted: conceptual cube, manual room box alone, AI prose claiming geometry without geometric proof.

## Batch discipline
Every implementation batch must state: target stage, hypothesis, affected components, measurable acceptance tests, regression tests, known limitations, and evidence of results.
No unrelated UI polishing, App Store packaging, VR, or photorealism while M1 is unproven, except blockers for testability/security.
Keep existing user data safe; migrations require backup/recovery.
Do not mark a stage complete without demonstrated tests.
When user asks for the next batch, start at Stage 0 then advance only after exit gate is met.

## Immediate next batch — Stage 0
1. Audit repositories and actual app drawing/model flow; list real capabilities vs stubs.
2. Define canonical geometry/data schema and coordinate units.
3. Create one-room ground-truth fixture and measurement acceptance checklist.
4. Add automated tests for scale and source-coordinate transforms.
5. Identify the smallest implementation to create first actual wall geometry from a verified line.

## Provider-independent execution contract (revised 2026-10-21; supersedes offline-only requirement)
- The core drawing-to-verified-3D product must not require ChatGPT, OpenAI API, a third-party hosted LLM, cloud OCR provider, or other externally controlled AI service to function.
- Internet connectivity and remote processing are allowed when useful. Remote processing must be deployable on infrastructure controlled by the Construction AI operator, using self-hosted inference and owned processing code.
- Support a shared, versioned geometry and verification engine with interchangeable execution modes: on-device where feasible, optional local workstation, or a self-hosted server.
- Keep essential project access, viewing, annotations, measurement, saved models, and correction history usable offline when technically feasible. Heavy automated reconstruction may require an available processing machine or server; disclose this rather than implying it works offline on every device.
- Use open-source or appropriately licensed locally runnable models and libraries, subject to license, platform and hardware checks. Keep model adapters replaceable.
- Protect confidential drawings: user-controlled storage, explicit consent before any server upload, encryption in transit for remote processing, access controls, retention/deletion policies, and no undisclosed external data transfer.
- Stage 0 benchmarks both on-device and self-hosted execution for accuracy, memory, latency, throughput, cost and reliability.
- Acceptance tests must run the core reconstruction pipeline without calls to third-party hosted AI services. Include a self-hosted end-to-end test and an offline test for the subset of functions promised to work offline.
- ChatGPT may assist development but is never a production runtime dependency. Vendor-specific services may be optional integrations, never the only path to reconstruct and verify a model.
- Do not claim the application is fully offline until its entire promised workflow has passed an actual network-disabled test.

## Progress log — 2026-10-21 — Stage 0 started
- Engine repository PR #1 merged: source-linked metric wall/opening geometry kernel, OBJ exporter, synthetic room fixture, automated calibration/coordinate/geometry tests, and audited baseline.
- GitHub Actions automated unit-test step passed for the new engine branch; full OCR workflow was still running when the PR was merged.
- Geometry is built from explicit synthetic records only. Automatic interpretation and plan/elevation alignment remain unimplemented. No claims of M1 completion.
- Stage 0 remains OPEN pending authorized room ground truth, tolerances, drawing-to-model integration and performance/privacy benchmarks.
- Engine source: https://github.com/joelesquenazi-tech/Construction-ai/blob/main/engine/geometry_core.py
- Audit: https://github.com/joelesquenazi-tech/Construction-ai/blob/main/docs/STAGE0_BASELINE.md

## Progress log — 2026-10-22 — Stage 1 interchange prototype
- Engine PR #2 merged: pixel-space traced wall coordinates are calibrated into metric 3D walls and openings, with optional independent scale cross-check, source evidence, revision warnings and OBJ export.
- Ten interchange tests added; GitHub Actions automated test step passed. The long OCR workflow was still in progress at the time of the test check.
- The synthetic input is human-traced annotations, not automatic wall recognition or elevation alignment. No end-to-end real-drawing reconstruction demonstrated.
- Stage 0 real-world ground-truth and acceptance-tolerance gates remain open. Stage 1 is IN PROGRESS.
- Engine: https://github.com/joelesquenazi-tech/Construction-ai/blob/main/engine/drawing_interchange.py
- Contract: https://github.com/joelesquenazi-tech/Construction-ai/blob/main/docs/STAGE1_INTERCHANGE.md

## Progress log — 2026-10-22 — Batch 3.2: local wall tracing UI
- Frontend PR #22 merged: touch-enabled floor plan JPG/PNG wall-centerline tracing, room-scoped local records, explicit sheet/revision and provisional wall dimensions, export in Python engine annotation schema.
- Existing 3D conceptual model remains unchanged; no automatic wall recognition or automatic in-browser OBJ generation is claimed.
- Added frontend CI JavaScript syntax workflow; syntax checks passed. The legacy browser regression test requires Playwright and is not yet in the new CI; physical iPad/Safari validation is pending.
- Tracing export requires existing two-point image calibration; missing independent scale cross-check remains flagged in Python. All traced walls are assumptions.
- Next: source-coordinate device testing, independent scale check in app, editable opening annotations, then drawing line proposals and multi-view reconciliation.
- Code: https://github.com/joelesquenazi-tech/construction-ai-app/blob/main/wall-tracing.js
- Guide: https://github.com/joelesquenazi-tech/construction-ai-app/blob/main/docs/BATCH_3_2_WALL_TRACING.md

## Progress log — 2026-10-22 — Batch 3.3 independent scale check
- Frontend PR #23 merged. Wall tracing now records a second independent known dimension, compares pixel scale to primary calibration, rejects discrepancy above a provisional 2% threshold, and blocks export without a consistent check.
- The cross-check is included in engine JSON and independently revalidated by the Python adapter. GitHub Actions JavaScript syntax checks passed.
- Two user-entered dimensions are not independent design verification. Real drawing acceptance tolerances, mobile browser testing, elevation alignment, and automatic recognition remain open.
- Guide: https://github.com/joelesquenazi-tech/construction-ai-app/blob/main/docs/BATCH_3_3_SCALE_VERIFICATION.md

## Progress log — 2026-10-22 — Batch 3.4 traced wall 3D preview
- Frontend PR #24 merged. The 3D Model page now has a separate read-only SVG isometric preview of manually traced wall solids, based on original floor-plan pixels, primary calibration, and independent scale cross-check.
- Walls are shown as assumed full-height prisms with source sheet/revision/ID and measured centerline lengths. Missing scale checks and unsupported diagonal walls block the preview rather than silently fabricating geometry.
- Existing conceptual 3D viewer remains separate; the preview does not render Python OBJ output, door/window openings, elevations or source-verified construction geometry.
- GitHub Actions JavaScript syntax checks passed. Browser/device integration and real-room accuracy verification remain outstanding.
- Guide: https://github.com/joelesquenazi-tech/construction-ai-app/blob/main/docs/BATCH_3_4_GEOMETRY_PREVIEW.md

## Progress log — 2026-10-22 — Batch 3.5 opening partitioning
- Frontend PR #25 merged. Manual source-linked door/window opening fields added to the traced wall dialog; rejects out-of-bounds and overlapping openings, stores locally, and exports opening records to the Python engine interchange schema.
- Browser wall geometry kernel partitions full-height prisms around rectangular openings. Separate traced geometry preview displays resulting wall solids with voids.
- Eight deterministic JavaScript geometry unit tests added; GitHub Actions syntax and geometry test steps passed.
- Opening dimensions are still manual assumptions; elevation reconciliation, Python/browser exact fixture comparison, physical iPad testing and verified real drawing geometry remain pending.
- Guide: https://github.com/joelesquenazi-tech/construction-ai-app/blob/main/docs/BATCH_3_5_OPENINGS.md

## Product requirement — Automatic-first drawing interpretation (confirmed 2026-10-22)
**Default user experience:** Upload a floor plan and matching elevations; the system automatically analyzes the drawings, derives scale from dimension annotations and/or graphic scales, independently cross-checks scale, identifies wall geometry and openings, reconciles heights against elevations, builds a source-linked 3D model, and presents exceptions for user review. The user must **not** be required to calibrate scale, trace walls, or manually enter ordinary dimensions as a standard prerequisite.

**Manual tools:** Existing two-point calibration, wall tracing, and opening entry are temporary engineering scaffolding and permanent optional fallback/correction tools, not the product's primary path. Keep them available under an advanced review/correction workflow; do not confuse a passing user-entered scale check with independently verified design evidence.

**Automatic pipeline acceptance gates:**
1. Extract vector geometry/text when possible, otherwise raster linework and OCR; retain exact source coordinates, sheet/revision, and provenance.
2. Detect printed dimensions/graphic scales, associate annotations with specific line segments, estimate pixel-to-world transform, cross-check independently, and flag distortion or inconsistent scales.
3. Propose walls, intersections, doors/windows and room boundaries with evidence and confidence; support diagonal geometry as drawings require.
4. Reconcile plans with elevations/sections for heights, openings and datum. Never fill absent information without a visible assumption.
5. Construct deterministic 3D geometry, compare reprojections and known dimensions against source, and route only ambiguity/contradictions to user review.
6. Measure performance on held-out annotated drawings with ground truth; report precision/recall and dimensional errors, not just that code executes.
7. Preserve provider independence and confidentiality; core workflow must not depend on third-party hosted AI.

**Next engineering priority change:** Focus upcoming batches on automatic scale extraction and wall proposal pipeline (Stage 1/2), using synthetic labeled fixtures first and a permissioned real drawing for acceptance. Browser/Python geometry parity and correction persistence remain important, but must not displace automatic-first ingestion. No claim of automatic recognition until tested.

## Progress log — 2026-10-22 — Automatic-first scale reasoning
- Python engine PR #3 merged: `engine/automatic_scale.py` evaluates source-linked, dimension-line-associated candidates, parses architectural imperial and metric labels, estimates scale, and flags inconsistent/missing evidence as needs_review.
- Ten new Python unit tests. An initial test failure for feet-inch hyphen parsing was corrected; the updated automated test step passed.
- This component consumes structured candidates; it does not extract dimensions from PDFs/images or associate text to linework automatically yet. All passing scales are provisional, not source-verified.
- Next: automated vector PDF extraction and dimension-line association, followed by wall proposal generation. Preserve exception-only user review as the default experience.
- Engine code: https://github.com/joelesquenazi-tech/Construction-ai/blob/main/engine/automatic_scale.py

## Roadmap amendment — Architectural semantic relationships and detail-driven geometry (2026-10-22)

**Status:** Approved product requirement; not implemented. This amendment strengthens Stages 2–6 and M1. It does not claim that the current engine understands architectural details.

### Core requirement: understand what dimensions *control*
The engine must not treat OCR text as geometry or assume that horizontal dimensions represent wall widths and vertical dimensions represent wall heights. It must identify dimension witnesses/extension lines, arrowheads/ticks, referenced endpoints, drawing view, scale, units, associated element(s), and whether the measurement controls overall extents, clear opening, finished face, rough framing, elevation/datum, reveal, offset, or assembly layer. Ambiguous dimensions remain unresolved with an explanation and source location.

### Architectural relationship graph (introduce during Stages 2–3)
- Canonical entities: building, level, room, wall, wall assembly, substrate/framing, finish layer, floor/slab/finish, ceiling, opening, door/window, millwork, trim, baseboard, reveal/profile, datum, dimension, annotation, drawing view, detail reference, and source revision.
- Typed relationships: bounds, belongs_to, adjacent_to, hosted_by, above/below, offsets_from, aligns_with, continuous_with, dimension_controls, detailed_by, and supersedes/refines. Store explicit direction, coordinate frame, datum and tolerance.
- Every interpreted relationship must retain sheet/page/revision, drawing coordinates, extracted evidence, inference method, confidence, verification state and dependency links. Do not infer physical connectivity merely from line overlap.
- Resolve plan-to-elevation-to-section/detail references and drawing view orientation before applying a dimension to a 3D axis or object.

### Detail interpretation and geometry propagation (Stages 3–6)
- Treat enlarged details and schedules as *additional constraints* that refine a general plan/elevation, not as an automatic override of every other sheet. Reconcile revision, scope, referenced assembly, and actual field condition; flag genuine contradictions.
- Decompose wall assemblies into framing/substrate, finish layers, baseboards, trims and specialty profiles with independent extents. Changes to one component must not silently alter the whole wall.
- Example acceptance scenario: a section/elevation specifies a **½-inch vertical reveal at finished floor**. Link the note and dimension to the bottom of the designated wall finish and the top of finished-floor datum. Adjust the finish/profile geometry only if the source detail supports it; do not shorten framing, substrate or entire wall without explicit evidence. If the drawing instead calls for a through-assembly gap or proprietary reveal trim, apply that distinct condition.
- Resolve whether a reveal dimension is height, depth, width, or setback based on the detail's view and witness lines; never assume ½ inch is vertical solely because the annotation is near the floor.
- Propagate accepted constraints into deterministic 3D geometry, preserve component IDs and source references, and rerun dependent alignment/continuity checks. If evidence is insufficient, propose interpretations for superintendent approval; never fabricate a verified detail.

### Automatic-first workflow
Upload floor plan and elevations (plus sections/details when available) → extract and associate dimension/linework evidence → identify objects and view relationships → build semantic constraint graph → reconstruct assemblies → apply detail constraints → validate source reprojections → show **only exceptions** requiring review. Manual tracing, scale entry, and detail edits are fallback/correction tools, not standard prerequisites.

### Measurable acceptance tests (new)
1. A horizontal dimension in plan controlling wall overall length is associated with that wall's correct endpoints and not its height.
2. A vertical dimension in elevation controlling wall/finish height is mapped to the correct datum and component, not plan width.
3. Clear-opening, face-of-finish, and rough-opening dimensions are differentiated even when values are similar.
4. A ½-inch floor-to-finish reveal changes the finish lower boundary (or specified reveal profile) while leaving structural/framing extents unchanged when the detail calls for finish-only treatment.
5. Alternate section calling for a through-wall gap produces a different result; ambiguous or contradictory details stop automatic modification and raise a review item.
6. Plan/elevation/detail references are linked across sheet revisions and orientation; stale or mismatched revisions do not silently override newer information.
7. Corrected semantic relationships and geometry persist after regeneration and retain an auditable source trail.
8. Compare proposals with independently annotated real drawing examples: report dimension-to-object assignment accuracy, view-matching accuracy, component-change correctness, false modifications, and unreviewed ambiguities. Define thresholds before acceptance.

### Sequencing and milestone effect
- **Stage 1:** Automatic dimension extraction and witness-line association with source evidence.
- **Stage 2:** Semantic element identity and dimension-to-object/axis binding, not merely wall-line recognition.
- **Stage 3:** View-to-view matching, datums, detail callout linkage and typed constraint graph.
- **Stage 4:** Component-aware deterministic geometry and dependency-based regeneration.
- **Stage 5:** Verify dimension bindings and changes by reprojecting each affected component into the correct source view.
- **Stage 6:** Full architectural detail rules, including reveals, finish layers, baseboards, continuity, trim and proprietary profiles. Prototype the floor-reveal case earlier as a cross-stage acceptance fixture.
- **M1:** Still requires one verified room; add at least one independently checked plan/elevation/detail relationship and one finish-specific modification that leaves unaffected components unchanged, when those details are present in the selected room. Do not claim semantic/detail interpretation complete based on a synthetic fixture alone.

**Next development priority after extraction:** source-linked dimension-to-object association and a typed constraint graph, then a synthetic ½-inch floor-reveal fixture with both finish-only and through-assembly variants. Preserve automatic-first, exception-only UX and provider-independent inference.

## Progress log — 2026-10-22 — Semantic dimension constraints prototype
- Python engine PR #4 merged. Added `engine/semantic_constraints.py`: typed wall/finish/substrate/floor entities; source-linked dimension hypotheses with witnesses, axis and role; fail-closed binding validation and conflicting-dimension review.
- Added a finish-only vertical floor reveal constraint proposal: moves the wall finish bottom elevation by the supplied gap (e.g. ½ inch) and explicitly leaves the wall substrate and finished floor unchanged. All modifications remain proposed and require source review.
- Twelve unit tests added; GitHub Actions automated unit-test step passed. The full drawing OCR workflow and device tests are not evidence of semantic accuracy.
- This module does not yet extract drawing relationships, decide which component a dimension controls, or change actual meshes. Next: automatic witness-line association, multi-view/datum mapping, typed relationship graph, and deterministic component mesh updates with source reprojection.
- Engine: https://github.com/joelesquenazi-tech/Construction-ai/blob/main/engine/semantic_constraints.py
- Contract: https://github.com/joelesquenazi-tech/Construction-ai/blob/main/docs/SEMANTIC_DIMENSION_BINDING.md
