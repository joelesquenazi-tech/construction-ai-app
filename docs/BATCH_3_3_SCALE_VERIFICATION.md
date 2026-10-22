# Batch 3.3 — Independent scale check

The local wall-tracing dialog now supports a second, separately identified known dimension.

## Workflow
1. Calibrate the JPG/PNG plan with the existing primary two-point ruler.
2. Open **Trace a wall from the floor plan**.
3. Enter the length in feet of another independently known dimension, tap **Select independent dimension**, and select its two endpoints on the drawing.
4. Tap **Check and save scale**. The tool compares the second pixel span with the first calibration. A discrepancy above **2%** is rejected; this is a provisional software threshold, not an accepted construction tolerance.
5. Trace and save walls. **Export engine JSON** is blocked until the independent check is saved and consistent. The export includes the Python engine's `calibration.cross_check` object.

The independent check is stored only in this room's browser localStorage and is invalidated when the underlying primary calibration changes. The Python engine repeats the cross-check and can reject a mismatch independently.

## Remaining limits
- User-selected known dimensions are not independently verified against the drawing or the architect's intent. Passing the 2% check does **not** establish drawing accuracy.
- No PDF tracing, rotation/distortion compensation, opening/elevation tracing, automatic recognition, browser OBJ rendering, or verified model.
- No physical iPad/Safari acceptance test has yet been run. Geometry exports remain human-traced assumptions.
