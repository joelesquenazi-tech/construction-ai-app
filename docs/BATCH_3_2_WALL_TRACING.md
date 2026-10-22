# Batch 3.2 — Touch wall tracing (Stage 1, experimental)

This is the first frontend-to-engine interchange integration. On the 3D Model page, after the required floor plan and elevations have been uploaded, open **Trace a wall from the floor plan**.

1. Upload a JPG/PNG floor plan and at least one elevation using the existing model setup.
2. Calibrate the JPG/PNG using **Drawing setup → Calibrate scale** and the two-point ruler. Existing manual numeric-only calibration cannot be exported because it lacks original pixel endpoints.
3. Open wall tracing, tap two points on a wall centerline, enter sheet, revision, wall ID, thickness and height, and save. Repeat for other walls.
4. Export engine JSON. The file conforms to `construction-ai-drawing-annotations-v0.1` in the Python engine repository. To generate an OBJ on a machine with that repository: `python engine/drawing_interchange.py construction-ai-traced-walls.json --obj traced.obj`.

Wall records are saved in device-local browser storage, scoped to the current project and room. Original drawings remain in IndexedDB and are not sent to a server. Export is a user-initiated local download. No external AI provider is involved.

**Limitations:** JPG/PNG only; manual tap-to-trace, no drag adjustment or automatic line detection; wall centerlines must be axis-aligned for the current Python geometry kernel; all heights/thicknesses are unverified assumptions; openings and elevations are not yet traced; no second scale cross-check is recorded in this UI, so the Python engine flags the calibration as provisional. Exporting JSON does not generate a model in the browser. The existing 3D view remains conceptual and is not silently replaced with unverified geometry. PDF support, 3D preview and cross-view verification are later milestones.

**Acceptance before Stage 1 exit:** test on iPad and desktop, verify source-image coordinate mapping on varied aspect ratios, support two independent scale dimensions, add opening/elevation evidence, and prove the exported interchange reconstructs a measured room against independent ground truth.
