# Offline drawing-convention rule library — proposed integration contract

**Status: PLANNED; reference review, not implemented recognition or model approval.**
Applies to Site RESOLV3D's local/owner-controlled drawing-recognition and deterministic 3D reconstruction pipeline. The three references are **clues**, not universal requirements. None confers code compliance or authorizes RFIs.

## Precedence (must be enforced for each proposed interpretation)

1. **Project-specific construction drawings, sections, elevations, details and specifications** (current revision; original actual source geometry and notes).
2. **Project architect/owner standards, legends and documented project conventions.**
3. **USACE A/E/C Graphics Standard Release 2.2; USACE A/E/C CAD Standard Release 6.2; VA BIM Manual revised November 2023** (general convention clues only).

Do not promote a generic convention to a definite assertion when project sources disagree, are absent or illegible. The engine must store the conflicting project evidence and mark the item `assumption_needs_review`. A rule match is **never** a verified element, code-compliance decision or authorized RFI. Drawing linework and OCR text cannot establish construction dimensions without source-specific scale and cross-view checks.

## Proposed source-backed rule catalog

Each row is a candidate library record with required traceability and human review scope. Page references identify the **document's printed page**, not necessarily the PDF viewer page.

| ID / name | Drawing evidence to look for | Proposed recognition/model result | Source document and page/section | Superintendent confirmation |
|---|---|---|---|---|
| CONV-DIM-001 Dimension annotation, not wall | Dimension text, witness/extension lines, dimension line, terminators (slash or filled arrow); nearby repeated parallel dimension strings | Mark associated strokes as `dimension_annotation_candidate`; exclude from automatic wall-solid extrusion; do not treat 2 parallel strokes alone as wall | USACE **Graphics R2.2**, §5.5, printed pp. 64–68 (dimension lines/terminators/settings) | **Conditional:** only auto-suppress when coherent evidence agrees and project conventions do not conflict; review partial/ambiguous examples |
| CONV-LINE-002 Line-purpose classification | Line weight/style and pattern with nearby text: visible outline, centerline, hidden line, leader/dimension line | Label strokes by proposed graphical purpose before proposing solids; unknown pattern remains `unresolved_linework` | USACE **Graphics R2.2**, §4.3, printed pp. 46–47 | **Yes** for uncertain line types or conflicts with project legend |
| CONV-SCALE-003 View and graphic scale | View label, graphic scale, `NTS`, separate enlarged view boundaries, known dimension strings | Scope candidate pixel-to-length transform **per view**, not blanket per sheet; no measure from NTS without independent evidence | USACE **Graphics R2.2**, §4.2.3 (scale notation), printed pp. 37–39; §5.5 dimensions | **Yes** if viewport boundary/scale association or independent dimensions cannot be verified |
| CONV-REF-004 Cross-view callout | Section/elevation/detail callout symbol, drawing identifier, sheet reference, direction/section arrow | Propose linked plan↔elevation/detail source references; do not infer wall height/assembly until view identity confirmed | USACE **Graphics R2.2**, §4.2.4, printed pp. 40–42 | **Yes** if sheet/view target missing or cross-revision |
| CONV-SHEET-005 Discipline and sheet clues | Sheet identification designator, title block, drawing-type label and legend | Propose plan/elevation/section/MEP/discipline classification with evidence; filename/title alone cannot verify | USACE **CAD R6.2**, §2.4, Tables 2-1 and 2-2 | **Conditional:** review ambiguous/contradictory title, mixed-discipline sheets, owner-specific naming |
| CONV-LAYER-006 CAD level/layer hint | Native CAD layer string, visibility, discipline/group/minor group and status phase when available | Suggest class `wall_candidate`, `annotation_candidate`, `equipment_candidate`, `existing_conditions`, etc.; project legend overrides layer name | USACE **CAD R6.2**, §4.1–4.2, printed pp. 32–35 | **Yes** if layer is absent, nonstandard or disagrees with linework |
| MODEL-OBJ-007 Typed semantic model objects | Source element category, schedule/tag, dimensions, location and related views | Maintain distinct stable IDs for walls, finishes, doors, ceilings, equipment and systems rather than undifferentiated outlines | **VA BIM Manual (Nov 2023)**, §§2.5–2.6, printed pp. 8–9 | **Yes** when object identity, host or dimensions not corroborated |
| MODEL-DIM-008 Actual versus nominal size | Dimension strings, specified assembly type, detail/profile and actual documented face positions | Record actual width/thickness/offset per assembly as evidence-backed properties; reject a guessed universal tolerance | **VA BIM Manual (Nov 2023)**, §2.4, printed p. 8 | **Yes** for missing sizes/tolerances or disagreement; VA 1/8-in bound **not** universally applicable |
| MODEL-FIN-009 Interior finishes | Room finish schedule, RCP, finish plan, interior elevation, base/reveal/ceiling notes, relevant details | Create distinct finish layers/ceiling conditions linked to rooms and hosts, pending reconciliation | **VA BIM Manual (Nov 2023)**, §§2.18.4 and 2.5; confirm section/subsection in local references before enforcement | **Yes** for layers, material thickness, reveals, datum and source conflicts |
| MODEL-MEP-010 Separate systems and coordination | Mechanical/electrical/plumbing/fire documents, system components, openings, related elevations and equipment clearance | Keep discipline-specific provisional elements with source evidence; test deterministic overlap, clearance and access only when dimensions are supported | **VA BIM Manual (Nov 2023)**, §§2.18.8, 4.8.1 | **Yes** for undocumented sizes/clearances and interpretation of possible clashes |

**Reference metadata stored per rule:** document title, revision/release, exact section and printed page(s), rule ID/version, interpretation author/reviewer, proposed evidence signatures, source precedence tier, failure/ambiguity cases, approval/activation status, and regression fixture IDs. Where exact page headings may differ across printed and digital versions, the original printed reference takes priority and is linked to a locally accessible reference file.

## Local machine-readable rule schema — next engineering batch (planned)

Each approved rule becomes a bundled JSON entry (or SQLite row) with:
- `rule_id`, `version`, `status: proposed|approved|disabled`, `source: {document,release,section,pages,local_reference_id}`.
- `evidence_requirements`: typed OCR text, line primitives, vector style/layer, room/view relationships, scale-independent layout clues; rule cannot claim to have seen source evidence it cannot access.
- `result`: proposed element/annotation classification, modeling constraints **or** explicit refusal to build when evidence missing.
- `precedence`: `project_documents > project_standards > general_references`; explicit project overrides are recorded with source and revision.
- `review`: `not_required_if_strongly_correlated|required_on_ambiguity|always_required` plus reason and reviewer ID.
- `assumptions`, `conflicts`, `confidence`, `source_links` (sheet, page, revision, original coordinates).
- `tests`: positive/negative fixtures, false-positive guards, contradiction, revision impact, and offline acceptance.

**Engine steps:** ingest native vector/raster and OCR evidence → identify sheet/view and provenance → compute candidate rule evidence → apply tiered project/source precedence and deterministic constraints → emit **provisional** annotation/model suggestions with an explanation → superintendent confirm/correct → save local corrections and undo history → reprocess without overwriting corrections. Rule matches never silently become `verified_against_available_evidence`.

**Offline contract:** bundle reviewed JSON catalog in app/desktop runtime or user-local SQLite/IndexedDB, version and checksum it, load in airplane mode, and store project exceptions locally. The guide PDFs themselves need not be reread or uploaded for each scan; approved excerpts/metadata may be packaged locally consistent with source handling and licensing. No mandatory CDN, ChatGPT API or third-party hosted AI in the inference path. Merely pre-caching the shell **does not** establish full offline OCR/model inference.

## First executable batch — RL-1

1. Create `rule-library/v1/catalog.json` with the initial **proposed** rules above, source sections/page references, evidence signatures, override policy and explicit human-confirmation requirements; catalog **not enabled** for modeling.
2. Implement a deterministic schema validator + precedence resolver and unit tests (project detail overrides general convention; project legend overrides CAD layer; missing evidence remains unresolved; contradicted dimension is not a wall; no code compliance/RFI capability).
3. Add local cache/persistence strategy for approved rules and project-specific overrides, with version/revision checks and offline tests. No unapproved use of rules in engine.
4. Add transparent explanation UI: "why we think this is a dimension line" with visible drawing evidence, source page and assumed/unresolved fields.
5. Validate against authorized private drawings, especially false wall positives around dimensions and missed actual upper/right wall segments; record false positives and source-to-model geometry tolerances.

**Acceptance:** deterministic rules and tests pass without network; conflicts retain project precedence; a reference convention alone cannot auto-verify a wall or scale; manual corrections survive reprocessing; no RFIs generated/submitted. Keep preliminary 3D → verify against drawings/deterministic rules → superintendent corrections → permanently retained project corrections.
