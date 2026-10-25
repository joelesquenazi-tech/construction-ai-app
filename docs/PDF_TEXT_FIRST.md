# Native PDF text extraction — Drawing review batch (2026-10-25)

**Implemented, unverified interpretation.** This batch changes how **Drawings → Scan drawing** obtains text. It does **not** automatically determine scale, generate geometry, verify BIM coordination, or replace superintendent approval.

## Why

Text recognition of rendered drawing pixels can turn architectural notes into unreadable characters, especially at reduced resolution. Many authored vector PDFs already include real selectable text. Reading that text directly is the correct first attempt; image OCR is a fallback, not the default for such PDFs.

## Supported workflow

1. Import a PDF using **Drawings → Upload drawing**. Each selected PDF page is rendered locally and saved as a sheet; the untouched source PDF is also retained in private IndexedDB storage.
2. Select a PDF-derived sheet and press **Scan drawing**.
3. The scanner checks for **embedded PDF text using locally bundled PDF.js** and the original selected PDF page. Extracted items carry:
   - original selectable string, not Tesseract's guessed reading;
   - approximate original *rendered-page pixel* text box and point, calculated using the PDF text and viewport transforms;
   - `source_kind: pdf_embedded_text`, **no OCR-confidence percentage**;
   - `pending` review state, plus unverified source terminology.
4. Review the findings against the visible sheet. **Confirm** requires an independently verified reading; **Reject** saves a reversible decision; **Save as pending** leaves uncertainties unresolved.
5. PDF image scans with no usable embedded text and JPG/PNG sheets can still use Tesseract.js **only after an explicit user prompt**. At present that fallback may download third-party OCR software/language data. The drawing is processed locally by the OCR library, but the full image-OCR workflow is **not guaranteed offline**. Do not claim otherwise.

### What this does NOT establish

- An embedded PDF string is **not** a project-approved dimension, verified scale, title-block identity, drawing legend, or code compliance.
- Native PDF text may be missing, encoded incorrectly, fragmented, rotated, or produce approximate coordinates. It remains unverified and may require superintendent correction.
- Scale inference and plan/elevation cross-view registration remain separate milestones; this batch does not change wall or 3D geometry.
- All project drawings, review decisions, and source PDF bytes stay in the user's own project/drawing storage. The local scan does not upload source drawing data.
- This is **not yet a learned architectural vision model**. It is deterministic PDF text extraction plus the existing optional OCR and heuristics.
- The original source document and project-specific standards have precedence over general reference conventions from USACE and VA.

## Verification

- Frontend: `node --test tests/*.test.cjs` checks PDF viewport transform math, rotation and clipping, missing/invalid text, confidence labeling and input safeguards.
- Optional browser integration: `node tests/pdf-import.cjs` (requires installed Playwright/Chromium, Python reportlab, OpenSSL) generates **synthetic** PDF pages, tests local import, native text positioning and no-external-request behavior, including offline mode.
- Still required: in-browser iPad Safari functional testing and source-text accuracy/coordinate validation on authorized real construction PDFs with diverse orientations/fonts. The optional browser test is not part of standard CI until its external test dependencies are provisioned.

## Next implementation

Package the Tesseract worker, WASM and language data as first-party/local offline assets; validate local usage and license. Add actual drawing-text association for dimensions and callouts with source-scoped priority, project legend overrides and rule-library reasoning. Do not turn PDF text into verified 3D geometry without independent dimensional and cross-view evidence.
