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
