# Automatic room reconstruction — first supported case

Status: development candidate, not a released general drawing interpreter. Milestone M1 remains open.

## Product requirement

Upload drawings, then let the engine process them and build supported preliminary geometry automatically. Routine tracing, scale calibration, entering room dimensions or confirming every wall is not the normal workflow. User questions are limited to information missing or conflicting in the source documents. Unsupported recognition is an engine limitation, not a required manual setup step.

## Implemented path

After saving a floor plan and elevations, or entering 3D, the app captures the exact saved sources and analyzes them locally. Embedded PDF text is used first, with bundled OCR fallback. A worker extracts dimension evidence and paired boundary lines. The primary panel shows derived geometry or specific unresolved information. Manual tools and the old conceptual demo remain under an optional collapsed section.

The first supported geometry is a **preliminary rectangular wall shell**. All of these conditions must hold:

- One labeled rectangular room with four closed, straight paired boundaries and no internal wall-line proposals.
- Two independent dimension spans, one horizontal and one vertical, ending at the detected inside faces. Ambiguous endpoints and compact weak marks are excluded.
- Scale estimates agree within a provisional 2%; detected widths fall within the supported range. This agreement is not independent source verification.
- Each uploaded elevation identifies the same room. At least one explicitly labeled `CEILING HEIGHT` or `ROOM HEIGHT` measurement is readable, in the supported 1.8–8 m range, and all such notes agree. Absolute elevation datums are not converted into heights by guessing a floor level.
- One page per file, at most eight elevation files. Truncated linework, multiple qualifying rooms, multi-page/view ambiguity and unsupported footprints remain unresolved.

Wall solids use drawing coordinates, apparent paired-line thickness and the stated room/ceiling height. Treating those lines as walls extending to that height is an explicit provisional interpretation. Doors, windows, finishes, ceiling details, structural height and MEP are not reconstructed or verified. This is not a complete room model or proof of construction accuracy.

## Source and correction protection

- Store generated evidence separately from manually reviewed findings, scale calibration and traces. Never silently replace or promote a correction.
- Existing wall/dimension corrections block regeneration until reconciliation is implemented; they remain saved.
- Fingerprint the original file bytes and complete source set. Recheck them before publishing or reusing a saved result. Changing drawings/room clears the displayed shell and cancels outdated analysis.
- Cancel terminates the worker/OCR and prevents publishing. One analysis at a time shares the existing scan lock. No private data leaves the device.
- Reopening an unchanged result verifies source identity before display. Failed/interrupted jobs can be explicitly retried; remote job resume is not implemented.

## Verification and limits

Core tests cover no-input geometry, missing/ambiguous/contradictory dimensions, unmatched/missing/conflicting heights, broken boundaries, internal linework, multiple rooms and correction protection. The browser gate uploads two actual synthetic PDFs through the normal controls with no scale, traces or dimension entries. It checks numeric shell dimensions, offline processing, untouched manual stores, source-checked saved reopening and invalidation when a conflicting elevation is added. Run in Chromium and WebKit; physical-device speed and real-project accuracy remain separate gates.

Next engine work: arbitrary room topology, robust view ownership, door/window detection, cross-view height extraction beyond explicit notes, model/correction reconciliation and a full vision adapter evaluated on permitted representative drawings. Do not ask the user to trace their room merely because these capabilities are unfinished.
