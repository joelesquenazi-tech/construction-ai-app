# Batch 3.5 — Manually specified openings and browser partition tests

The wall-tracing dialog now includes a **provisional door/window opening** form. Select an existing wall, provide an opening ID, along-wall offset from its traced start, width, sill height and opening height, all in feet. The tool rejects out-of-wall and overlapping openings, saves the opening locally with an evidence identifier, and exports opening records compatible with the Python drawing interchange schema.

The separate reconstructed preview now partitions wall solids around rectangular openings using `wall-geometry.js`. The partitioning uses the same along-wall and vertical breakpoints as the Python engine's `wall_mesh` method. The browser test suite checks solid-wall volume, doors, windows, multiple openings, overlap and bounds rejection, reverse direction and vertical walls.

**Limitations:** Openings are user-entered numeric assumptions, not extracted from a drawing. Sill and head heights are not cross-checked with elevations; no auto door/window recognition. The browser and Python implementations have not yet been independently compared through a shared generated fixture. The preview is not a BIM union, does not resolve intersecting walls, and is not a verified construction model. Device and drawing-based tests are still required.

**Next:** cross-runtime comparison with the exact same fixture, opening edit/delete and reversible corrections, elevation-backed height validation, source-ground-truth acceptance.
