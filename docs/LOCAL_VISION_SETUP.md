# Local vision connection — VISION-1

Status: first integration for testing, not trained/validated construction recognition.
This adds an optional local vision step to **Drawing interpretation** alongside
the existing OCR and rule-based text interpretation. It returns source-linked
review proposals; it does not create or verify 3D geometry.

## Start on a computer

1. Install [Ollama](https://ollama.com/download) for your computer and Python 3.10+.
   Qwen3-VL requires Ollama 0.12.7 or newer; use a current supported release.
2. In Terminal or PowerShell, download the local **Instruct** model once:

   ```sh
   ollama pull qwen3-vl:4b-instruct
   ```

   This selected quantized model download is approximately 3.3 GB; additional RAM
   or VRAM is needed to run the model and process images. Download size is not a
   hardware requirement. CPU inference is possible but latency must be measured.
   No claim is made that a Surface or iPad can run it at useful speed.
3. Download/checkout this app branch, extract it, then open a terminal in the
   folder containing `index.html`. Start the local app:

   ```sh
   python local-engine/vision_server.py
   ```

   On systems using `python3`, use that command instead of `python`. Keep the
   terminal open. Ollama must also be running. If Ollama is not already running,
   start its app or run `ollama serve` in another terminal.
4. Open **http://127.0.0.1:8765** in the browser on that same computer.
5. Import one permitted drawing into Library. Open **Drawing interpretation**,
   choose **Check local model**, then **Load selected drawing**. Enter the drawing
   revision if known; otherwise it remains unknown. Optionally drag a region over
   a room or detail, then choose **Analyze with local vision**.
6. Compare blue proposal boxes with the drawing. **Keep for review**, **Not
   correct**, and **Reset review** save interpretation choices only. They do not
   verify construction dimensions, change accepted wall corrections, or build 3D.
   Export the current proposal JSON if needed; it contains source references and
   model readings, not the drawing image. Treat exported readings as project data.

The browser origin matters: GitHub Pages and the local app have separate storage.
Your existing drawing files/reviews do not automatically transfer to the local
origin. Keep your originals and existing backups; import a drawing copy for this
test. Do not clear or replace the current hosted application's data.

## What runs where

- Browser: drawing preview/region selection, optional previously extracted OCR
  context, source fingerprint, proposal overlays, review history and saving.
- Python local server: serves the app and validates inference requests/results.
- Ollama at fixed `127.0.0.1:11434`: runs `qwen3-vl:4b-instruct` locally.
- Missing models fail with installation instructions; this adapter never pulls
  models, selects cloud tags, sends requests to a remote endpoint, or falls back
  to a hosted AI service. Environment HTTP proxies and redirects are disabled.
- One inference request at a time prevents competing model jobs. Cancel stops
  the browser request; Ollama may still finish that job. Another request may
  report busy until it finishes.
- Installed model inference is designed to work without internet. Actual
  airplane-mode execution, model performance and target-device support still need
  verification. Existing OCR's first-run CDN dependency is unchanged and does not
  become offline merely because this vision adapter is local.
- This server binds to loopback only, so an iPhone/iPad cannot reach the computer
  through its own `localhost`. Authenticated private-LAN access or native device
  inference is future deployment work, not enabled by this batch.

## First-pass boundaries

The model suggests drawing type and candidate walls, doors/windows, ceilings,
coves, soffits, reveals, printed dimensions, room labels and detail references.
These categories are a schema, **not evidence of demonstrated model accuracy**.

Analyze a whole sheet to orient yourself, then use a region when detail is small.
The longest image edge sent to inference is capped at 1600 pixels. The adapter
rejects malformed or out-of-range generated boxes, but valid JSON and valid
coordinates do not establish that a feature or text reading is correct.

Each run records project/room/sheet/page, optional revision, the SHA-256 hash of
the exact source preview, original dimensions, selected crop, sent dimensions,
model tag, timestamp and original-pixel proposal boxes. Re-running appends a new
run without overwriting decisions. Unknown revisions stay unknown. There is no
cross-sheet alignment, scale calibration, millimeter conversion, automatic
rule-catalog fusion, model training or construction verification in this batch.

## Verification and next gate

```sh
node --test tests/*.test.cjs
python -m unittest discover -s local-engine -p "test_*.py" -v
node tests/vision-browser.cjs
```

Browser tests need Playwright and its Chromium browser. Adapter and browser
tests use synthetic input and simulated model output; they do not download or
run Qwen3-VL. They exercise real HTTP, request/output validation, source mapping,
review persistence, stale-response cancellation and preservation of prior data.

Next: run the installed model on a permitted one-room drawing with independently
labeled true walls, non-walls/dimension lines, openings and drawing types. Record
misses, false positives, printed-text accuracy, localization error, latency,
memory, behavior on empty/ambiguous crops and whether it improves the current
baseline. Choose tolerances before judging results. Only then integrate approved
local rules, measured scale and reconciled elevations into the geometry pipeline.
Fine-tuning and agent tool loops remain separate, evidence-driven milestones.

## Primary references used for the adapter

- [Qwen3-VL 4B Instruct in Ollama](https://ollama.com/library/qwen3-vl:4b-instruct)
- [Ollama vision API](https://docs.ollama.com/capabilities/vision)
- [Ollama structured outputs](https://docs.ollama.com/capabilities/structured-outputs)

Retain applicable model licenses with deployment. The selected Ollama model card
identifies Apache 2.0; the model weights are installed separately, not committed
to this repository.
