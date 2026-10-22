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
6. Design for confidential device-local storage and eventual fully offline inference. Do not require permanent cloud dependency.
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

### Stage 8 — Offline deployment
- Bundle inference, geometry engine, files, and models locally; benchmark on target devices.
- Web/iOS packaging is secondary to engine correctness. Allow optional desktop processing without making network essential.
- Exit: critical workflow completes offline with acceptable memory and performance.

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

## Standalone and offline acceptance contract (added 2026-10-21)
- The delivered application must complete the critical drawing-to-verified-3D workflow with network access disabled. No ChatGPT, OpenAI API, external LLM endpoint, cloud OCR, remote geometry service, or external inference dependency may be required.
- Local AI/ML inference is permitted and expected where it adds value; it must be distributed with the application or installed locally, with appropriate model licensing and update strategy.
- Use deterministic parsers, vector extraction, OCR, image processing, geometric constraints, and mesh generation wherever appropriate; local ML proposes ambiguous classifications, never unverified dimensional truth.
- Separate platform-neutral geometry/verification code from the UI and from replaceable model adapters. Desktop and mobile may have different compute capabilities but must not depend on cloud inference.
- Treat an optional companion workstation as a local-only enhancement, not a prerequisite for opening and using a saved project. If a feature cannot run on a target mobile device, disclose its limitation and support local deferred processing or a compatible local compute mode.
- Stage 0 must benchmark the target iPad/iPhone and prospective offline workstation for memory, latency, model size, file size, battery, and storage.
- Each milestone's automated tests must include a true offline run: network disabled, no remote requests, cold launch, ingest local drawing, calibrate, interpret, reconstruct, verify, save, close, reopen, and reproduce the model.
- Development may use ChatGPT as a coding assistant; production execution must never require ChatGPT to function.
- Do not declare M1 or an offline release complete until an actual airplane-mode demonstration passes on target hardware.
