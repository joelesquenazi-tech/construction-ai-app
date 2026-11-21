# Dimension endpoint association — version 2 candidate

Target: Stage 0 failure reproduction / Stage 1 dimension evidence. Extends the consolidated draft PR #59. Automatic scale, plan/elevation registration and verified 3D remain open.

## Failure being addressed

The original scanner required a dimension to span an entire detected line and expected long perpendicular witness intersections at its outer ends. It could not assign adjacent members of a continuous dimension chain, rejected short spans, and reduced some small source marks out of the analysis raster. The earlier private two-label pilot read both labels but associated neither span.

## Changed behavior

- Detect approximate diagonal slash ticks and preserve the existing perpendicular-witness pathway. Endpoints must be supported by source pixels; labels alone never invent spans.
- Split continuous or label-interrupted baselines at consecutive supported markers. A label that straddles a marker is not stretched across several members of the chain.
- Support shorter members when both ends have tick evidence. Reject strokes that only extend to one side of the baseline, obvious cross decorations, and continuing diagonal hatch lines. Dense repetitions without enough nearby measurement labels are left unresolved.
- Exclude endpoint positions within text boxes. When multiple baselines/spans remain plausible, preserve alternatives and leave `points_px` null.
- Compact marks with one off-baseline pixel on each side can be retained as weak proposals when a thin baseline and unambiguous local pattern support them. They are labeled `compact_endpoint_marks_require_review`; they are not equivalent to reliable geometric verification.

This is local image processing, not a general architectural semantic model. Visible linework can still resemble an annotation. Source drawing/legend conventions take precedence over general graphical clues.

## Bounds and provenance

The shared analysis-size function preserves native detail where possible while enforcing **2,400 pixels per side** and **4.2 million pixels total**. Both axes map independently back to the exact analyzed source-page coordinates. The area bound describes the working raster, not total application memory or a device-performance guarantee.

Existing density, measurement-count and ambiguity bounds remain; endpoint searching stops after one million positions. Exhausted searches remain unassociated with a visible issue in exported evidence.

Each dimension evidence record retains the existing schema, with:

- `algorithm_version: 2` and `method: raster_line_endpoint_markers`;
- actual `analysis_raster` dimensions;
- per-endpoint original-pixel coordinates and support kinds;
- support resolution (`witness_intersection`, `multi_pixel_diagonal`, or `compact_pixel_mark`);
- unverified geometry and explicit issues/alternatives.

Saved older reports retain their original version/evidence. Re-scanning uses the existing explicit replacement confirmation. Reading corrections and independent accuracy annotations remain separate from detector proposals.

## Acceptance evidence

### Synthetic regression corpus

The new generic raster fixtures cover horizontal and vertical chains, both slash directions, long and short members, extension-line support, thick strokes, competing baselines, bare lines, single ticks, one-sided spurs, dense hatching, fully labeled longer chains, decorative crosses, text overlap, compact marks and independent X/Y remapping. The cases reproduce the failure without committing a private drawing crop or its coordinates.

The offline browser test creates a synthetic PDF and exercises actual PDF.js rendering/embedded-text extraction, raster thresholding, a long member plus a short final member, source-pixel endpoint support, pending review and unchanged calibration/wall stores. It makes no model-call simulation for this dimension association check.

### Private pilot — limited development evidence

The input file/page bytes, independent truth and original label/endpoint tolerances were held fixed against the previous pilot. Native PDF label readings remain **2/2 matched**. Dimension spans improve from **0/2 to 2/2 matched**, within the original **3 source-pixel endpoint tolerance**, with **zero extra proposals inside the annotated region**.

The baseline report remains unchanged. Full before/after evidence and source coordinates are kept in a separate private comparison bundle. Only aggregate counts are committed here.

This was a two-label development region, not a held-out benchmark or whole-sheet evaluation. Its assistant-authored visual annotations still need superintendent confirmation. Pixel tolerances have not become project construction acceptance tolerances. Other regions, devices and drawing conventions remain unverified.

## Remaining work

Physical iPad Safari and Raspberry Pi performance; additional permitted test regions and negative examples; agreed source-specific tolerances; drawing viewport ownership; arrowhead-only or arbitrary-angle dimensions; graphic scales; vector geometry; and independent scale/cross-view confirmation. Endpoints proposed by this module do not establish verified geometry or a complete room.
