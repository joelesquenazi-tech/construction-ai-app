# Batch 3.4 — Separate traced-geometry 3D preview

The 3D Model page now includes a **Traced geometry preview** section, distinct from the existing **Conceptual 3D viewer**.

## Workflow
1. Save a floor plan and at least one elevation.
2. Use the primary two-point calibration, then record a passing second known-dimension cross-check.
3. In **Trace a wall from the floor plan**, trace wall centerlines and enter provisional thickness/height.
4. Select **Generate preview from saved traces** on the 3D Model page.

The preview locally builds rectangular 3D wall solids from original image pixels and calibration, then projects them into a read-only SVG isometric view. It shows wall IDs, centerline lengths and sheet/revision references. No server, third-party AI, or external runtime service is used.

## Safety and scope
- All walls remain explicitly labeled **assumption**. The preview is not a source-verified reconstruction.
- The primary and independent scale measurements must agree within the provisional 2% threshold. Missing or changed calibration blocks preview.
- Only axis-aligned walls are supported, matching the current Python geometry kernel; unsupported diagonal walls cause an explicit error instead of being silently rendered incorrectly.
- The viewer displays full-height wall prisms only. It **does not subtract door/window openings**, reconcile elevations, model slabs/ceilings, or import the Python OBJ. It is a separate browser visualization based on the same traced wall dimensions, **not** a proof of geometric equivalence to the Python engine.
- Existing conceptual room and review markers remain unchanged. Drawings remain local in IndexedDB.
- Browser syntax checks are automated; real iPad/Safari visual and coordinate accuracy tests remain pending.

## Next acceptance work
Add deterministic cross-runtime geometry comparison tests, browser-based opening geometry, an editable geometry correction log, and real-room source/ground-truth comparison. Do not mark Stage 1 or M1 complete until those gates pass.
