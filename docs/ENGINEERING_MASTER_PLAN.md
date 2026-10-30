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
- **Planned feature-checklist fixtures:** include documented/missed/partial coves, tray ceilings, soffits, ceiling and base reveals, duplicate instances, multiple profiles, source revisions, and expected host-component changes. Ground truth must cover feature presence, provenance, geometry, and negative/unknown cases.
- Audit actual app behavior and identify placeholders vs functioning pipeline.
- Choose one permitted room with plan, elevations, and ideally sections; confirm drawing revisions.
- Produce ground-truth table of walls, openings, ceiling elevations, and key dimensions, independently measured/confirmed.
- Define test cases: clean raster, rotated scan, cropped plan, scale bar, dimension disagreement, multiple revisions, missing elevation.
- Exit: repeatable input corpus, ground truth, and automated tests exist.

### Stage 1 — Drawing ingestion and coordinate system
- **Planned:** retain page/view/crop coordinates for both location/extent annotations ("It goes here") and explanatory detail/profile annotations ("This explains it"), independently of zoom and screen size. Preserve source identity/revision and allow multiple segments/sources per feature.
- **Automatic-first remains mandatory:** recognize drawing scale from documented dimensions/graphic scales with independent checks; manual calibration is exception-only.
- Preserve original files; page IDs, project/room, revision, units, orientation, metadata, source provenance.
- Render PDFs/raster consistently at known resolution; support zoom and pan with coordinate transforms.
- Calibrate by graphic scale or known dimension; cross-check a second independent measurement.
- Detect contradictory scales or distorted scans; flag uncertainty.
- Exit: measurements are repeatable and within a tolerance defined from the source quality; no silent scaling errors.

### Stage 2 — 2D architectural geometry
- **Planned:** add room-scoped feature catalog and multiple feature instances, separate presence/origin/review/geometry states, typed dimensions with imperial fractions and datums, stable host/annotation/source IDs, and an Add/Edit checklist interface.
- **Planned:** automatically extract wall linework and propose wall geometry; manual tracing is a correction/fallback, not routine setup. Add mark-edge/polyline/area tools and bidirectional checklist↔drawing selection.
- Extract vector paths when available; otherwise process raster linework.
- Propose wall centerlines/faces, intersections, door/window openings, arcs and symbols.
- Associate dimensions and text with geometry; editable correction tools.
- Store geometry as structured objects with drawing-coordinate references and provenance.
- Exit: one room's footprint and openings match independently confirmed ground truth.

### Stage 3 — Multi-view reconciliation
- **Planned:** link RCP runs/room edges to elevation/section/detail profiles via host, room coordinates, view orientation and dimension evidence; never infer location from proximity on a sheet. Associate cove/reveal/soffit parameters with independent per-value evidence, missing information and conflicts.
- Align plan with elevations and sections using gridlines, walls, opening IDs, datum and known dimensions.
- Infer vertical heights and opening positions only with evidence; expose conflicts and missing data.
- Use consistent coordinate conventions, levels and units.
- Exit: reconciled, source-backed 3D room specification with explicit unresolved issues.

### Stage 4 — Deterministic 3D reconstruction
- **Planned:** parameterized, editable, host-aware geometry for coves, pop-up/tray ceilings, soffits, ceiling/top-of-wall/bottom-of-wall reveals, including run/extent, profile, terminations and finish thickness. Preview affected neighbors; Apply updates actual ceiling/wall assemblies, not just labels; support Undo.
- Generate walls with actual thickness/height, openings, slabs/ceilings, not a conceptual cube.
- Keep geometry separate from visualization; support regenerate after corrections.
- Store editable semantic model with persistent element IDs and source links.
- Exit: measurable 3D room reproduces agreed ground truth within documented tolerances.

### Stage 5 — Verification and correction loop
- **Planned:** per-room checklist with presence (present/absent/unresolved/N/A), origin (detected/manual), review (unreviewed/confirmed/needs review), and geometry (not modeled/preliminary/evidence-verified) as independent fields. "Not found" stays unresolved; reviewed-with-exceptions is not verified completion.
- **Planned:** persistent additions, per-field provenance, corrections/undo history, source-linked model edits, deduplication and reconciliation after reprocessing; revised sheets trigger impact review without overwriting accepted corrections. Check reveal continuity, ceiling datums, terminations, overlaps and relevant MEP/structure.
- Project model edges and dimensions back onto each source view.
- Check dimensions, topology, intersections, clearance, cross-sheet consistency and revision mismatches.
- Explain discrepancies and let superintendent accept/reject/edit; keep audit history.
- Exit: every modeled element has source support or an explicitly acknowledged assumption; reproducible test report passes.

### Stage 6 — Architectural detail
- **Planned:** broaden the room-by-room feature catalog to all ceiling, wall-top/bottom/surface, door/opening, floor, millwork/stone, and detail conditions defined in the Feature Checklist Integration Contract below; preserve multiple instances and different profiles.
- Add wall assemblies, reveals, baseboards, millwork, finish layers, specialty conditions, and existing conditions.
- Exit: construction details reconcile across views and preserve tolerances.

### Stage 7 — MEP coordination
- **Planned:** extend checklist to diffusers, grilles, ducts, lights, sprinklers, devices, equipment/access, columns and beams; validate feature/assembly interferences, clearance and access without claiming buildability from geometry alone.
- Add ducts, pipes, electrical, sprinklers and clearance envelopes with source attribution.
- Check interference and access, distinguish true clashes from incomplete information.
- Exit: reviewed test conflicts have defensible geometry and clear provenance.

### Stage 8 — Provider-independent deployment
- **Planned:** prove local/offline checklist, annotations, source linking, inference for supported features, parameterized application, undo, persistence and reprocessing. No ChatGPT or mandatory hosted inference; saved project corrections do not become generalized model training without separate consent and controls.
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

## Feature Checklist Integration Contract — approved requirements, PLANNED (2026-10-22)
This contract elaborates the existing Stages 0–8; it is **not a parallel roadmap**. No feature in this contract is implemented or tested merely by being specified here.

### Product behavior and catalog
Each room's checklist is a **search guide and verification aid**, never proof that an undocumented feature is absent. Search automatically; the superintendent may add a missed feature by identifying its drawing location and optional explanatory detail, without manually building its 3D geometry. Support many instances of the same feature, each independently hosted, dimensioned, sourced and reviewed.

| Category | Features to search, model and verify (planned) |
| --- | --- |
| Ceilings | Main elevation, height changes, pop-up/tray, soffit, bulkhead, cove, perimeter recess, ceiling reveal, slope, access panel |
| Top of walls | Ceiling connection, shadow reveal, recessed track, crown, cove, stop-below-ceiling, finish wrapping onto ceiling |
| Bottom of walls | Flush/recessed/projecting baseboard, base reveal, shadow gap, finish-to-floor, recessed lighting, door/millwork transitions |
| Wall surfaces | Finish thickness, wainscot, panels, niche, pilaster, projection, recess, horizontal/vertical reveals |
| Doors/openings | Opening dimensions, frame depth, casing, flush/concealed frame, head/jamb reveals, pocket, threshold, finish alignment |
| Floors | Finish thickness, elevation change, slope, transition, border, recess, drain, threshold relationship |
| Millwork/stone | Dimensions/depths, filler, scribe, toe kick, counter, backsplash, overhang, integrated lighting, equipment clearance |
| MEP/structure | Duct, diffuser, grille, light, sprinkler, device, access, column, beam, interference with finished assemblies |

**First implementation family:** coves; pop-up/tray ceilings; soffits; ceiling reveals; top-of-wall reveals; bottom-of-wall reveals. Extend the same schema and tools to the remaining catalog.

### Checklist record and interface
Every feature-type row displays name, instance count, and **four independent status axes**:
- Presence: `present | absent | unresolved | not_applicable`.
- Origin (per instance): `system_detected | manually_added`.
- Review: `unreviewed | confirmed | needs_review`.
- Geometry: `not_modeled | preliminary | verified_against_available_evidence`.

Do not conflate detection, review and verification. A missing detector result does not mean absent. Reviewed rooms may contain unresolved items, but such items remain visible and block a fully verified designation.

Provide context-sensitive **Add manually, Locate on drawing, Link detail, Edit, Preview, Apply, Undo** actions, with explicit unit, datum, per-value source, assumptions, conflicts and missing information. A row may hold many independently editable instances; not one global yes/no.

**Cove-specific fields:** room, host ceiling surface/edge, run/extent, width, depth, drop, profile, main/lower ceiling elevations, lip elevation, corners, end conditions, material/finish thickness, lighting/access if documented, RCP/elevation/section/detail references, unresolved values.

**Reveal-specific fields:** host surface/junction, top/bottom/ceiling/vertical position, opening width/height, recess depth, offset/elevation and datum, backing/finish, extent, corners/terminations, continuity at doors/millwork, supporting sources. A `½"` label alone cannot establish location, extent, opening and recess depth. Accept typed architectural imperial fractions; convert to consistent internal metres without discarding displayed units.

### Annotation purposes and navigation
Two distinct annotation roles: **location/extent** ("It goes here") and **explanation/profile** ("This explains it"). Permit tapping a detected edge, drawing/editing/deleting line or polyline, and outlining an area. Preserve original sheet/page/revision/view/crop and document-space coordinates; allow multiple marks/segments and multiple sources per instance. RCP location and section profile are independently linked, then registered through room/host/orientation/dimensions rather than sheet proximity. Bidirectional selection highlights checklist instance, all linked drawing marks, and actual model feature.

### Manual-add and correction transaction
1. Tap **Add manually** for the feature; select room/host and relevant drawing.
2. Mark location/extent in source coordinates; optionally link a separate explanatory section/elevation/detail.
3. Re-examine marked evidence using the automatic interpretation pipeline; propose supported fields, relationships and geometry, and expose unknowns.
4. Allow typed edits and specific missing-value requests; mark unsupported geometry preliminary, never verified.
5. Highlight affected geometry and neighboring elements in 3D Preview, including intersections.
6. Apply a reversible, parameterized change to the actual host assembly; keep feature, annotations, source references and model elements linked.
7. Persist correction, edit history and Undo; after reprocessing reconcile stable identities and avoid duplicates. Never silently overwrite user-confirmed corrections.

Location marks are not confirmation of complete geometry. Missing scale, registration, orientation or critical dimensions must block verified application or remain explicitly provisional.

### Interpretation and geometry contracts
Per feature determine host assembly, room-space transform, profile/parameters, datum, run/extent, corners, terminations, finish thicknesses, neighbors and **per-consequential-value** source evidence. Distinguish wall overall width, wall height, reveal opening, recess depth and elevation above finished floor using view type, witness/extension lines, leaders, orientation and detail references. Modify host ceiling/wall component geometry, preserve adjacent openings/finishes, and flag uncertain assembly scope. Deterministically test continuity, corners, terminations, ceiling heights, overlapping recesses, material intersections, MEP and structural clearance; geometrically consistent is not necessarily documented or buildable.

### Persistence, revisions and learning boundaries
Use stable IDs for project/room, host surface, feature instance, annotation, source, model component and change transaction. Store parameter values/units/datums and provenance individually; preserve detected/manual origin, review and geometry state, assumptions/conflicts/missing data, affected elements and timestamped correction history. Local project storage must retain changes through close/reopen, rebuild and reprocessing; reconciliation should keep uncertain matches for review. Changed sheets/revisions invalidate stale registrations and flag affected instances, while preserving earlier evidence and user edits. Corrections are **project-local knowledge**, not automatic model retraining or universal construction rules.

### Dependencies and ordered implementation slices
| Slice | Deliverable (all planned) | Required dependencies | Existing stage |
| --- | --- | --- | --- |
| FC-1 | Catalog, typed feature/instance/status/source/correction schema | Stable project, room, drawing, surface, model IDs | 0, 2, 5 |
| FC-2 | Room checklist UI, per-instance Add/Edit, units, review and counts | FC-1; existing frontend room UI | 2, 5 |
| FC-3 | Location and explanatory-detail annotation tools, linked selection | FC-1; viewer coordinate transforms; page/revision IDs | 1–3 |
| FC-4 | Local correction transactions, undo, stable reconciliation | FC-2/3; local project persistence | 5 |
| FC-5 | Parametric cove/tray/soffit/reveal preview and Apply to host | Reliable scale, cross-view registration, host assemblies, FC-1/3/4 | 3–4, 6 |
| FC-6 | Automatic feature search and evidence-based field population | Feature schema, vector/OCR extraction, wall recognition, view association | 1–3, 6 |
| FC-7 | Continuity/clash checks and honest room completion reporting | FC-5/6; linked source and model geometry | 5–7 |
| FC-8 | Revision-impact review, full catalog, offline end-to-end acceptance | Stable correction/reconciliation, supported local inference | 5–8 |

Manual UI may precede fully automatic recognition for testability; **the default finished workflow still requires automatic scale and wall extraction**, with manual calibration/tracing reserved for correction.

### End-to-end acceptance scenarios (NOT YET PASSED)
1. Auto-detect documented cove; link RCP run + section profile; fill only evidenced fields and generate hosted geometry.
2. Missed cove: mark RCP edge, link section, preview/apply without manual 3D construction.
3. Partial evidence: unknown cove depth stays unresolved/assumed, not verified.
4. Distinguish ½-inch base reveal from floor level or overall wall-height measurement using source context.
5. Two coves with different profiles in one room retain independent IDs, parameters and sources.
6. Checklist↔drawing↔3D selection highlights the same instance and its many source marks.
7. Soffit/reveal application modifies correct host components and identifies neighboring intersections.
8. Close/reopen and drawing reprocessing retain corrections without duplicates or silent overwrites.
9. Revised RCP flags affected corrections; old source and history remain available.
10. Undo restores model, annotations and feature state coherently.
11. With required local models/files installed, supported feature inference, edits, modeling, persistence and review work offline.
12. Completion reporting leaves unresolved, assumed, unreviewed and unmodeled items visible; no false "fully verified" room.

### Reusable components already implemented — limited scope
- Frontend local drawing viewer/room scope, manual scale cross-check, wall tracing, local browser storage, preview and manual rectangular openings are prototypes; they **do not** provide feature checklist instances or source-aware cove geometry.
- Python `automatic_scale.py` evaluates already-associated dimension candidates; it does **not** read scale automatically from drawing PDFs/images.
- Python `semantic_constraints.py` validates explicit dimension/target hypotheses and proposes a finish-only floor reveal; it does **not** discover features, interpret source details, or update actual component meshes.
- Python deterministic wall/opening geometry and source interchange exist, but no general hosted parametric cove/soffit/reveal application, linked checklist UI, revision reconciliation, or end-to-end offline validation has been demonstrated.

### Immediate actionable batch — FC-1
Define a versioned, dependency-free feature catalog and JSON instance schema with stable room/host IDs, the four independent status axes, source annotation roles, typed per-value units/datums/provenance, multi-instance identity and correction transaction records. Add synthetic tests for two distinct coves, an unresolved depth, a base reveal, and rejection of invalid status/host/source combinations. **Do not** claim detection, 3D application, or acceptance scenarios passed until later batches implement and test them.


## Automatic-first drawing setup and precise snapping — approved requirements, PLANNED (2026-10-22)

**User acceptance requirement:** A normal operator uploads floor plans and elevations and receives an evidence-backed, automatically determined scale and plan/elevation alignment status without tracing or manually calibrating. The current UI's `Plan and elevation alignment pending` is an unimplemented check, not a verified conflict or evidence of agreement. Never label a result verified merely because files exist or a dimension was read.

### AS-1 — Drawing type and readiness
- Classify uploaded sheets as plan, elevation, section, RCP, detail or unknown using actual drawing evidence; allow override and record it. Detect missing views by room, revision and sheet identity.
- Separate states: `missing_input`, `processing`, `provisional`, `verified_against_available_evidence`, `needs_review`, `unsupported`. Presence of floor and elevation files alone is not proof of alignment.
- Replace static pending text with actionable status, evidence links and a targeted correction button. Do not block unrelated 3D preview solely because verification is pending; distinguish preliminary vs verified model.

### AS-2 — Automatic scale inference and verification
- Extract drawing vectors and raster lines; locate dimension witnesses/arrows, read imperial/metric labels, associate labels to *the correct dimension segment* and drawing viewport, infer px/ft or model units. Read graphic scales when available; do not assume PDF paper size establishes architectural scale.
- Validate with at least two independent, non-collinear or suitably separated dimension observations when possible; check tolerance, consistency, local viewports, image resizing and source revision. Ambiguous, contradictory or insufficient evidence stays `needs_review`.
- Persist evidence with source sheet, page, revision, original-image coordinates, label, endpoints, confidence, method and tolerance; store canonical units and display architectural ft-in-fraction.
- Existing `engine/automatic_scale.py` handles supplied dimension observations, **not** automated OCR/vector detection or association. Build extraction/association and end-to-end fixture tests before calling this automatic.

### AS-3 — Plan/elevation cross-view registration
- Identify matching walls/openings/grids/levels across floor plan and elevations, resolve orientation and datum, propose transforms and elevations; validate independent dimensions and inconsistent/changed revisions.
- Show which sources align, residual error and which feature(s) need human review. Never auto-verify based on upload count, filename or visual resemblance alone.

### AS-4 — Friendly manual snapping fallback
- Manual ruler is secondary: touch-down shows a 4× loupe centered on the **actual image coordinate under the finger**, not a fixed raw-pixel crop. Show candidate endpoint/intersection and confidence; allow switching candidate, fine nudging, drag adjustment, explicit Accept and Undo.
- Prefer geometric line endpoints, witness-line intersections and corners, **not nearest dark pixel** (which may be text or noise). Display finger crosshair separately from the snapped target; indicate when snap is off. A snapped candidate does not itself verify scale.
- Prevent iPad selection/callouts/scroll gesture conflicts while dragging. Keep image/SVG/loupe coordinate mapping consistent across portrait/landscape, scrolling, zoom, device pixel ratio and image resize. Include debug overlay showing touch CSS pixels, original image pixels and chosen snap pixel for regression.
- Acceptance: user can place a known 19′-0″ dimension precisely with one-hand iPad touch and edit in feet/inches/fractions (through 1/64″), no displaced endpoint, no text selection, and stable accuracy at edges and after scrolling.

### Engineering order and proof
1. Synthetic source-page fixtures for dimensions, line intersections, viewport scale, revision and plan/elevation correspondence; deterministic coordinate and unit tests.
2. Raster/vector feature extraction and dimension association; test with actual user-authorized drawings **locally**, without sending confidential drawings to third-party AI.
3. Automatic scale evidence and cross-view registration with honest statuses; integrate frontend after evidence contract stabilizes.
4. Geometric snap candidates, magnifier nudge/accept UX and iPad Safari physical testing.
5. Acceptance gate: automatic setup succeeds on representative real room with floor and elevations, independent scale agreement, source-linked registration, explicit tolerance and zero mandatory manual clicks; uncertainty triggers focused review. No automatic-success claim before this gate.



## Progress log — 2026-10-22 — Automatic scale discovery, first raster ingestion slice

- Engine PR [#6](https://github.com/joelesquenazi-tech/Construction-ai/pull/6) implements a **local, conservative raster scale candidate pipeline** (`engine/scale_discovery.py`) for JPG/PNG/TIFF, plus synthetic unit tests and a generated-image smoke test. It uses OCR text bounding boxes, horizontal/vertical straight pixel runs, perpendicular witness-line tests, ambiguity/duplicate rejection, and the existing scale estimator. No project drawings are committed for tests.
- The core scale estimator now checks that supporting observations are **independent** and from the same source sheet, revision and page.
- **Implemented (engine only):** automatically propose source-linked image pixel endpoints for supported OCR labels and straight witnessed dimensions; estimate **provisional** scale if two independent observations agree. Fails to `needs_review` on insufficient or conflicting matches. Tests cover a synthetic 19′-0″ / 14′-8″ pair.
- **Not implemented:** robust real-drawing acceptance, reliable all-orientation/PDF dimension recognition, sheet-type classification (AS-1), automatic verified scale approval (remaining AS-2), plan/elevation cross-view registration (AS-3), and frontend upload-flow integration.
- **Next acceptance work:** evaluate false match rates and endpoint error on permissioned local drawings; support PDF vectors, broken/skewed witness lines and dimension callouts; propagate confidence/evidence to SITE RESOLV3D without changing existing manual calibration until proved.


## Progress log — 2026-10-22 — Scale association reliability and review-evidence handoff

- Engine PR [#7](https://github.com/joelesquenazi-tech/Construction-ai/pull/7) implements the **second conservative scale recognition slice**: OCR label orientation and dimension-span midpoint screening, review-required interior witness crossings (possible chained dimensions), and limited 1–2-pixel raster gap bridging. Real-world geometry may violate heuristics, so uncertain dimensions must remain reviewable rather than automatically accepted.
- Added a **repeatable synthetic accuracy benchmark**, run by CI, that reports accepted/rejected dimension evidence, false-positive associations, missed supported measurements, and original-image pixel endpoint errors across clean, cluttered, ambiguous, broken-line, OCR-confidence, conflicting-scale, and wall-outline scenarios. This is not a real-drawing accuracy score.
- Added a read-only `site-resolv3d-scale-evidence-v1` contract: source drawing/page/revision, OCR label boxes, original-image endpoint coordinates, provisional metres-per-original-image-pixel proposal, reason for review, and an **always false automatic_confirmation** flag. An optional transparent SVG overlay is generated at the exact original-image coordinate system for local examination; no drawing content is embedded.
- **Implemented in engine only:** conservative heuristics, synthetic metric tests, local JSON and SVG review exports. **Still planned:** actual permissioned drawing acceptance; robust PDF vector/dashed/rotated line recognition; automatic plan/elevation classification and registration; live browser processing and user-facing evidence review; automatic scale confirmation after stronger acceptance criteria.
- **Next batch:** run the evidence contract through a representative permissioned private drawing with explicit annotation of dimension witness endpoints, document measured false-positive/false-negative/endpoint-error rates, then build the website's review/status UI without mandatory external hosted AI. Existing manual calibration remains fallback until the automatic pathway proves reliable.



## Progress log — 2026-10-22 — Local source-evidence review and real-drawing evaluation tooling

- Engine PR [#8](https://github.com/joelesquenazi-tech/Construction-ai/pull/8) implements a **private/local annotated-drawing accuracy evaluator** (`engine/scale_truth_eval.py`) accepting the existing evidence-v1 JSON plus separately annotated original-image dimensions. It requires explicit `full_page` or exhaustively annotated `regions` coverage; checks exact source filename, sheet, revision, page and image dimensions; performs independent, one-to-one matches by normalized measurement and endpoint tolerance; reports true/false positive, false negative, precision, recall and pixel endpoint errors. Tests pass with synthetic annotations, **not a measured real-drawing accuracy claim**.
- Website PR [#38](https://github.com/joelesquenazi-tech/construction-ai-app/pull/38) introduces **Scale detection review** within 3D Drawing Setup. Operators can load **engine-generated JSON evidence from their own device**, inspect dimension proposals and OCR boxes over the matching JPG/PNG floor plan and select candidate spans. The JSON is stored in the existing room/project-scoped IndexedDB and invalidated when its floor plan is replaced.
- Security/honesty boundaries: the imported file must contain `automatic_confirmation: false`, `ready_for_verified_3d: false` and provisional/needs_review status, plus exact original image filename and pixel dimensions. The reviewer **never changes saved scale calibration, wall geometry, or plan/elevation alignment**. Original source images and evidence remain local on the device. Matching filename/dimensions does **not** independently establish drawing identity; source identity is supplied by the evidence file.
- **Implemented:** local offline evaluation utility, unverified source-overlay review workflow, synthetic checks and frontend schema tests. **Still planned:** instrumented evaluation on permissioned, fully annotated real construction sheets; credible recall/precision and tolerance targets; PDF/vector and rotated/skewed dimensions; browser-native detection; automated evidence-backed scale confirmation and plan/elevation registration.
- **Next implementation priority:** obtain representative permitted real-drawing ground truth locally (never commit it), run `scale_truth_eval.py` on an explicit annotated region, inspect failure cases and improve extraction. Then enable automatic local engine inference from browser ingestion with no mandatory external AI service. Continue to provide manual calibration as a fallback, not the default user journey.


## Progress log — 2026-10-22 — First on-device wall-line candidate UI (not yet verified 3D)

- Frontend [PR #40](https://github.com/joelesquenazi-tech/construction-ai-app/pull/40) adds a lightweight local JPG/PNG wall-line scanner (`wall-proposals.js`) and `wall-candidate-review.js`: binary raster analysis at bounded image resolution, straight-line run grouping and paired parallel-edge candidates (horizontal/vertical only). Each candidate is **unverified linework** and is displayed over the user's own local floor plan, with a source-coordinate 2D preview and selectable segments. The scanner runs on first 3D entry with a saved compatible floor plan; a manual rescan button is available. No drawing is transmitted outside the device for this scan.
- The large empty manual wall-trace 3D preview is hidden when no traces exist, and its status now explains that automatic 2D candidates are not equivalent to confirmed 3D wall geometry. Manual tracing remains the existing fallback.
- Synthetic Node tests cover straight paired lines, vertical/horizontal centerline proposals, thick raster strokes, rejection of single dimension-like lines and hatch marks, provisional statuses, and defensive input validation. Frontend JavaScript CI passed. Physical iPad Safari and real-drawing correctness **not yet verified**.
- **Not implemented:** verified recognition of actual walls vs double lines of millwork/dimensions, meaningful wall semantics and intersections, openings, elevation alignment, confirmed scale automatically applied to wall candidates, acceptance/corrections persisted as 3D host geometry, large PDF/TIFF or diagonal/skewed wall support, and model geometry generated from candidates. This is a **preliminary classifier**, not an automated room model.
- **Next engineering priorities:** (1) real-drawing evaluation/ground truth on authorized files in a private local environment; (2) richer wall pairing and intersection evidence, false-positive control, and room connectivity; (3) reviewed candidate persistence and correction workflow with stable IDs and source evidence; (4) link independently verified scale and plan/elevation registration; (5) turn accepted walls into parametric geometry with source-vs-model validation. Never treat candidate presence or paper scale alone as source-verified geometry.


## Progress log — 2026-10-22 — Shared calibration / tracing touch magnifier

- Frontend [PR #42](https://github.com/joelesquenazi-tech/construction-ai-app/pull/42) extracts common drawing-image pointer mapping, the **4× screen-accurate circular loupe**, separate orange finger crosshair and blue selected/snapped target, and optional experimental local nearest-dark-pixel snapping into `drawing-point-tools.js`.
- **Implemented:** Manual scale calibration and manual wall tracing both use the same coordinate / loupe implementation. Tracing now displays the floor plan as a real responsive image with a precisely registered SVG overlay, visible draggable handles, touch pointer capture, no Safari selection highlight, and optional snapping. The independent secondary-dimension selection uses the same tools.
- Bounded local source-pixel sampling avoids allocating a full-resolution image canvas for every optional snap. New Node unit tests cover display-to-original-image coordinate mapping, image scroll/zoom, edge clipping, the 4× crop and snap fallback; frontend CI passed.
- **Still unverified:** real-world iPad Safari pointer/loupe interaction on user drawing. Dark-pixel snapping is not geometric endpoint or intersection detection, and may select text or non-wall marks. Manual tracing remains a fallback rather than the primary normal workflow.
- **Next:** physical iPad regression test at different drawing aspect ratios and scrolled coordinates; future geometric candidate snapping, local automatic wall semantic verification, and automated source-backed floor/elevation registration remain separate milestones.


## Progress log — 2026-10-22 — Human review of automatic wall-line candidates

- Website [PR #44](https://github.com/joelesquenazi-tech/construction-ai-app/pull/44) adds a local 2D decision workflow to the automatic straight wall-line proposals: **Confirm wall line**, **Not a wall**, **Add missing line**, **Undo**, and optional **Hide rejected lines**. Candidates can be selected by tapping their drawing line or their review card.
- Source-linked local state stores confirmed/rejected candidate IDs and manually added wall centerline endpoints in original image pixel coordinates, keyed to the project/room, original floor plan identity, file size/last-modified and original dimensions. It restores decisions on rescan/refresh and bounds the undo history; user corrections are not submitted as training data.
- The manual missed-line tool uses the shared 4× calibration/tracing magnifier, draggable image-aligned endpoints and optional **experimental nearest dark pixel** snapping. Corrections may follow diagonal lines even though the automatic first pass still recognizes only straight horizontal/vertical parallel-edge candidates.
- **Verified by automated JavaScript regression tests:** review statuses, local state format, original-image coordinate conversion, source isolation, save/undo, invalid-point rejection, and nearest finite-line tap selection. **Physical iPad Safari interaction and representative real-drawing wall classification accuracy are still unverified.**
- **Important semantics:** `user_confirmed_2d` is a human decision on source linework, **not** evidence of verified construction geometry. Rejecting a suspected dimension line does not prove other candidates are walls. No correction automatically changes primary scale, wall thickness, floor/elevation alignment, or generated 3D geometry.
- **Next engineering batches:** quantify false positives/omissions against permissioned local drawings; improve corner/intersection and semantic wall evidence; integrate accepted 2D source geometry with independently verified scale and registered elevations; generate preliminary host walls with labeled assumptions and deterministic checks; retain correction provenance and allow undo/revision reconciliation.


## Progress log — 2026-10-22 — Review/confirm/reject missing wall-line workflow

- Frontend [PR #44](https://github.com/joelesquenazi-tech/construction-ai-app/pull/44) adds a **Confirm wall line** and **Not a wall** action beneath the candidate cards. Corrections persist on the user's device scoped to project/room plus source drawing filename, file metadata, original pixel dimensions and stable source-image coordinate candidate IDs.
- The **Add missing line** tool allows manually marking overlooked wall segments (including angled or disconnected portions) with two independently draggable endpoints and the same 4× magnifier/optional dark-pixel snap as calibration and tracing. Includes **Undo**, optional hide rejected candidates, and tapping near a proposal directly on the drawing to select it. Indexed correction state stores `user_confirmed_2d` / `rejected_non_wall` and never promotes these to source-verified 3D geometry.
- Screenshot-driven acceptance issue: the original parallel-line detector misclassified exterior dimension lines as possible walls and missed actual upper/right segments with angled or interrupted linework. **The detector's underlying architectural semantics are not fixed yet**; these controls enable local corrections and prevent rejected proposals from showing as active.
- Synthetic Node tests cover source-coordinate mapping, stable identities, accepted/rejected decisions, persistence, undo, manual diagonal annotations, invalid geometry, and direct hit testing. JavaScript CI passed. iPad gesture behavior on the user's drawing remains to be physically verified.
- **Next:** evaluate using the permissioned test drawing with labeled true-wall/non-wall segmentation; improve topological continuity, rotated/slanted line pairing, distinguishing dimension witness lines and title blocks, use user corrections as persistent project evidence (not automatic model training), and link confirmed walls to independently verified scale and elevations before 3D application.


## Progress log — 2026-10-22 — Reference-guided offline rule-library integration (PLANNED)

- Reviewed the user-supplied **USACE A/E/C Graphics Standard Release 2.2**, **USACE A/E/C CAD Standard Release 6.2**, and **VA BIM Manual, November 2023** as **context-specific reference conventions, not project standards or code approvals**. Rule-by-rule recommendations, evidence signatures, anticipated modeling/recognition result, printed source sections/pages, ambiguity and superintendent confirmation are documented in [OFFLINE_RULE_LIBRARY_SPEC.md](OFFLINE_RULE_LIBRARY_SPEC.md).
- Required precedence: **(1) current project drawings/details/specs; (2) project architect/owner standards and legends; (3) general USACE/VA convention clues**. Never override conflicting project sources or infer verified geometry from a reference convention alone.
- **Next rule-library batch RL-1 (planned; not yet an operational AI model):** versioned local JSON rule catalog, schema validation, deterministic source-precedence resolver, explicit assumptions, negative examples, local approval/disable and project overrides, source-linked explanation output, offline/airplane-mode regression tests. No hosted service dependency for active rule matching. Rules approved only after reviewing evidence and tests.
- Preserve existing pipeline and correction contract: **preliminary model → verify against actual drawings and deterministic geometry rules → superintendent confirm/reject/correct → save undoable corrections with source/revision scope**. Rule matches do not grant code compliance; no drafting/submitting RFIs.
- Initial rules focus on: dimension/witness/terminator exclusion from candidate walls; center/hidden/leader vs visible line types; view-specific scale/NTS; cross-view elevation/section/detail callouts; CAD sheet discipline/layer clues; typed BIM objects; actual vs nominal sizes; finishes and MEP host coordination.

## Progress log — 2026-10-22 — Screenshot-driven PDF and OCR UX repairs

- [PR #50](https://github.com/joelesquenazi-tech/construction-ai-app/pull/50) connects existing locally bundled PDF.js rendering to manual wall tracing, preliminary straight-wall scanning, and source-evidence previews, preserving original PDF bytes. First PDF page is rendered as a temporary raster (not vector-aware recognition); source page and pixel dimensions matter for scale and annotations. Adds filename-based warning for likely non-floor-plan sheets, including ceiling-height and elevation details, with explicit user acknowledgement before saving a manual scale. Does not imply automatic sheet classification or independent scale verification.
- [PR #51](https://github.com/joelesquenazi-tech/construction-ai-app/pull/51) repairs OCR Reject UX: visible persisted decision/Undo, next-pending navigation, default hiding of rejected drawing markers with toggle, bounded long OCR strings, calibrated OCR confidence display, and accurate "rule suggestion" terminology. Rejecting bad OCR removes it from active review display; it is not generalized AI training and does not modify geometry.
- Screenshot-specific blocker: **the user selected a ceiling-height/detail drawing as the floor source**, and the scale dialog offered two-point calibration despite no clearly shown known horizontal scale. The filename warning helps but **automatic source classification/viewport scale detection remains planned**. The website does not yet run Python automatic scale extraction; JSON analysis import is **advanced testing only**, not a normal superintendent workflow.
- **Next implementation batch after RL-1 / in parallel with Stage 1:** in-browser local PDF text/vector feature extraction with page/view ownership, dimension evidence and project precedence, with measured privacy-safe real-drawing tests; then verified scale and plan/elevation alignment. Offline OCR currently uses a CDN and must be bundled locally to meet the offline execution contract.

## Implementation candidate — RL-1 offline rule-review foundation

- Implements the software portions of the planned RL-1 batch: ten proposed, checksum/versioned local catalog entries; schema/evidence validation; project-document/legend/reference precedence; source/revision isolation; manual-correction preservation; local project approval/disable/overrides and Undo; and read-only wall-line explanations.
- All rules remain inactive until reviewed locally, and all outcomes remain provisional. No wall candidate, scale, model or code-compliance status is automatically verified. The current wall detector supplies parallel-line evidence only; revision/view identity and dimension/witness/terminator evidence are not invented.
- Existing imports, reviews, knowledge records, calibration and geometry are preserved in their existing stores. New project rule preferences use separate versioned keys. Current PDF/OCR repairs and the pending easy uploader are retained in the integration branch.
- Synthetic deterministic and offline browser tests pass; full batch details, acceptance evidence and limitations are in [RL1_IMPLEMENTATION.md](RL1_IMPLEMENTATION.md). No private project drawing or reference PDF is committed.
- Stage 0, RL-1's real-drawing acceptance item, physical iPad Safari validation and M1 remain OPEN. Next gate: permissioned local truth measurements and source-specific tolerances, followed by supported PDF text/vector evidence extraction and registration. This entry describes a review candidate, not a claim of release or verified reconstruction.


## Progress log — 2026-10-25 — Offline-first source PDF text extraction (Stage 1 / OCR evidence improvement)

- Added a local **embedded PDF text-first** route to drawing review: when the selected Drawings sheet has an original stored PDF and page identity, PDF.js extracts available selectable page text and records position boxes against the **same locally rendered page pixels**. It precedes image OCR; content, position and unit meaning remain unverified.
- Native PDF findings are recorded with `source_kind=pdf_embedded_text` and **no fabricated OCR confidence**. They remain `pending` until a human confirms/rejects them. Rejection/Undo and visible review feedback, already implemented, remain intact. Neither native text nor review decisions change calibration, walls or model verification.
- Raster/JPG/PNG and scanned PDF without usable embedded text still depend on optional Tesseract.js image OCR. Currently its script and English language files can require internet downloads: the code now requests explicit user permission before this optional fallback and states its offline limitation. True packaged offline OCR is still planned and must be tested in airplane mode.
- Added source-aligned PDF viewport text transform tests (horizontal/rotated/clipped/invalid) and a synthetic-PDF optional browser smoke test that checks original PDF bytes/text without an external call; no private client drawing is used in tests.
- Preserves source hierarchy **project drawings, details and specs → project owner/architect conventions → reviewed general USACE/VA clue rules**. Text extraction is not dimension association, classification, code approval or automatic 3D geometry.
- **Next batch:** package offline local OCR workers/models and benchmark text accuracy from sample approved raster/PDF elevations; associate labels with geometry and rule evidence, while retaining per-value source provenance. Add explicit review explanations when rule hypotheses conflict with the project legend. See `docs/PDF_TEXT_FIRST.md`.

## Implementation candidate — 2026-10-30 — Stage 0 wall-line evaluation

- Adds a local, dependency-free centerline benchmark and versioned truth/proposal/report contracts. It scores raw automatic detector output with source/page/view/revision and SHA-256 isolation, reviewed source-specific tolerances, one-to-one precision/recall, omissions, localization errors and non-wall matches. It never counts saved manual corrections as detector accuracy or changes application storage.
- Synthetic baseline runs the actual current raster detector: four-wall rectangle 4/4 matches; a diagonal-wall/parallel-dimension case records 4 matches, 1 false positive and 1 omission (80% precision/recall), explicitly failing its 95% target. CI verifies these expected outcomes, not a claim of real-room accuracy.
- Local file checks reject changed bytes and mixed source identities; partial/missing/conflicting truth cannot pass. Outputs never claim Stage 0, M1 or real-world acceptance complete. Private inputs/reports stay outside Git or in ignored `local-benchmarks/`; no drawings are uploaded.
- Target, hypothesis, source contract, measurable tests, actual baseline and limits are documented in [STAGE0_WALL_BENCHMARK.md](STAGE0_WALL_BENCHMARK.md). Runtime application code is unchanged. Existing offline-OCR and local-vision draft PRs remain separate.
- **Stage 0 remains OPEN:** independently reviewed authorized real-room ground truth and dimensional tolerances, device/performance benchmarks and end-to-end drawing/model acceptance remain required. Next: collect the private corpus and quantify failures before selecting semantic/diagonal detection and scale/registration changes. Physical iPad Safari and real-project accuracy remain unverified.
