# RL-1 — Offline drawing-rule review foundation

## Batch scope and hypothesis

Target: Stage 0/1 infrastructure, not a completed reconstruction stage. A versioned local rule catalog and deterministic source-precedence resolver can make provisional interpretation explainable without overwriting drawing reviews, calibration, or model geometry.

This implements the software portions of RL-1 steps 1–4 in OFFLINE_RULE_LIBRARY_SPEC.md. Step 5, permissioned real-drawing evaluation, remains open. Stage 0's ground-truth/tolerance gates and M1 are not complete.

## Components and behavior

- `rule-library/v1/catalog.json`: ten proposed rules from the existing specification, including section/printed-page metadata, required evidence kinds, negative examples, constraints and fixture identifiers. No reference PDF text or private drawing is bundled. Citations are copied from the approved specification, not independently re-verified this batch; missing printed pages and all citations require local reference review.
- `manifest.json` and a pinned UI SHA-256: catalog version/checksum validation. A mismatched catalog fails closed. Rules are inactive by default, and modeling is always disabled.
- `rule-library.js`: pure deterministic validation, evidence matching, project-document > project-standard > general-reference precedence, same-tier contradiction handling, source isolation, manual-correction preservation, versioned local approval/override transactions and bounded Undo. It performs no network calls and emits no geometry or RFI action.
- `rule-library-ui.js`: Drawing conventions in Knowledge. Local reviewed activation/disable, reviewer attribution, export, Undo and source-cited project interpretations. Each interpretation retains the candidate's sheet/revision/page/view, original pixel bounds/dimensions, explicit reference document/sheet/revision/page and rationale. Decisions are project-scoped and tied to the exact catalog checksum/version; a new catalog uses a new key and cannot silently inherit approvals. Old data is retained until the user explicitly clears app data; project export includes all retained catalog versions, even those not active now.
- Wall-line review emits a read-only evidence snapshot and displays Why this line needs review. The existing detector provides only parallel-line-pair evidence; it does not fabricate dimension text, witness lines, terminators or a source revision. Incomplete identity/evidence remains unresolved. Explicit reviewer-declared source identity is shown as provisional project evidence, not independent verification.
- All new assets are precached. No mandatory hosted AI/CDN is introduced by RL-1. Existing OCR's separate CDN dependency remains; this does not claim the complete reconstruction/OCR workflow is offline.

## Source and correction boundaries

Every match requires the same project, room, sheet, revision, page, view, filename, source signature, pixel dimensions, coordinate space and candidate group, plus observed evidence and in-bounds coordinates. PDF evidence uses rendered-page pixels, not native vector coordinates. The existing source signature is based on file metadata/dimensions, not a cryptographic content hash; it does not independently prove source identity.

An explicit same-source user wall decision outranks new suggestions. Different revisions retain old interpretations/corrections for impact review without applying them to the new source. Contradictions at equal project priority remain unresolved. Higher-priority project interpretations retain lower-tier conflicts in their explanations. Every outcome retains `automatic_confirmation`, `verified_geometry`, `ready_for_verified_3d`, `code_compliance` and `rfi_authorized` as false.

Rule preferences use separate construction-ai-prefixed localStorage keys. Existing knowledge records, saved drawing imports/PDFs, reviews, wall corrections, geometry and scale stores are not migrated or written by the rule library. The existing Clear all app data action naturally removes these new project preferences too.

## Acceptance and results

- `node --test tests/*.test.cjs`: all existing drawing source, coordinate/loupe, OCR decision, scale, wall geometry/proposal/review suites plus rule-library tests pass.
- Rule tests cover all ten positive/missing-evidence/source-isolation fixtures, inactive defaults, reviewed activation, project detail/legend precedence, contradictory dimensions, immutable same-source corrections, revision changes, undo, project/catalog/version isolation, missing/out-of-bounds evidence, unsafe catalog rejection, and network-disabled execution.
- `node tests/rule-library-browser.cjs`: disposable Chromium with iPad touch/viewport emulation passes local approval safeguards, explanations, project overrides and Undo, original correction/geometry preservation, project isolation, offline reload/decisions, no external requests, and checksum-failure retention.
- Existing PDF import, clear-data and easy-upload browser regressions pass after combining the pending uploader work with the current PDF/OCR fixes.
- JavaScript syntax and changed-file whitespace checks pass. CI now discovers all `tests/*.test.cjs` files.

No real-drawing accuracy, source-verified geometry, automatic scale, automatic plan/elevation registration, full offline OCR, or physical iPad Safari acceptance is claimed.

## Next gate

Keep Stage 0 open: select an authorized private room corpus, confirm revisions and exhaustive annotation coverage, establish source-quality-specific tolerances, and run the local truth evaluator to measure false positives, omissions and endpoint errors. Never commit those drawings. Then connect locally extracted PDF text/vector evidence and project legend ownership to this contract. Actual wall semantics, verified scale, cross-view registration and deterministic host-wall application remain separate gated batches.
