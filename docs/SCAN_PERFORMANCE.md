# Drawing processing measurements

RP-1 adds an optional local recorder and a reproducible browser benchmark. These measurements cover the working drawing import, embedded PDF text, bundled English OCR and dimension-association paths. Full vision inference, room reconstruction, remote queues/uploads, cache reopening, device peak memory and operating cost are not measured by this batch.

## On a device

1. Open **Settings → Check processing speed → Start timing**.
2. Import a drawing or select an existing drawing and use **Scan drawing**. Review/save the findings normally.
3. Use **Download timing report**. Review the report before sharing it.
4. **Stop timing** disconnects observers and discards in-flight captures. **Clear report** clears retained reports and invalidates in-flight captures. Reload also turns capture off and clears it.

Timing is off by default and does not upload anything. The report retains up to 50 operations, 100 stage entries per operation and 200 entries per observer. It includes sizes, pixel dimensions, counts, route, stage durations, outcomes and browser diagnostics. It excludes drawing pixels/text, filenames, hashes, coordinates, sheet/project/room identities, error messages and attribution URLs. No report is written to project storage automatically. File sizes/counts can still be project-sensitive; review exports before sharing.

Normal drawing recognition remains automatic-first. This optional diagnostic adds no required annotation or calibration step.

## What the numbers mean

| Measurement | Boundary |
| --- | --- |
| Import total | Library import call through saved data, selection and an optional image-decode/paint check. File-picker time is excluded. |
| Scan total | Scan handler through exact-source capture, extraction/OCR, dimension association, review prompt, save, OCR cleanup and outcome paint check. |
| Processing | Total minus synchronous user review-prompt time. It includes scheduling, source checks, worker setup/transfer and observed rendering waits. |
| Ready for review | Source-checked findings are prepared. They have not yet been saved. |
| First usable | Source-linked, unverified findings have been saved/rendered and the next paint opportunity observed. A decline, failure, stale source or empty result never receives this mark. |
| Acknowledgement/outcome | Next visible-document paint opportunity following status feedback. Not a physical screen-presentation measurement. |
| Source validation | Sum of repeated exact source/page/room checks, including hashing. Do not remove these checks to improve a number. |
| Save and DOM | Existing synchronous localStorage save plus DOM update. This does not measure physical disk flush. Import IndexedDB timing ends on transaction completion. |
| Long tasks | Browser-reported main-thread tasks overlapping the operation. Other UI work and review prompts can overlap; these are observations, not exclusive attribution. |
| Browser input events | Thresholded Event Timing entries where supported. Absence of an entry is not a zero-latency input. |
| JS heap sample | Coarse samples at stage boundaries. Not process/device peak memory; worker, WASM, canvas/GPU and other allocations are not fully represented. |

Stages can contain other stages. In particular a dimension-worker span contains its decode/threshold/association spans. Do not add nested durations to estimate total completion. Missing/unsupported metrics stay missing, rather than zero.

`first_in_page` and `repeat_in_page` describe recorder position in the current document, not hardware/model cache temperature. A PDF scan after import already has a loaded PDF engine. The current OCR implementation initializes and terminates a worker for every scan. No inference-result cache is added here.

## Repeatable reference workload

Install the repository's pinned Playwright 1.56.1 and its Chromium browser using the same process as CI. Then run from the repository root:

```sh
node tools/benchmark-scans.cjs --output /absolute/path/scan-report.json
node tools/benchmark-scans.cjs --route pdf_embedded_text --output /absolute/path/pdf-report.json
node tools/benchmark-scans.cjs --smoke
```

The full run uses three separate browser contexts and 20 repeated import/scan pairs per route, one job at a time. App-shell assets are installed from localhost and the browser is then offline. Installation time is separate and is not a realistic internet download benchmark. The reference fixtures are synthetic:

- One 600 × 400-point PDF page rendered to 2,400 × 1,600 pixels, with two native text readings and two tick-ended dimension spans, including a short chain member.
- One 1,400 × 450-pixel PNG with two text labels and a 12-foot dimension supported by witness lines. The actual bundled English OCR runs.

Each timed scan must retain the expected source-pixel dimension endpoints, pending findings and unverified geometry. The harness sends trusted touch inputs to the real zoom controls during scans and records pointerdown-to-next-paint opportunity, with a separate idle baseline. It checks that transforms change. This is not physical iPad touch, panning/editing acceptance, multi-user load or full room/model inference. Review confirmations are automatically accepted; review wait remains visible in the raw timings.

p50/p95 use nearest rank and include sample counts. Only completed runs enter completion distributions; outcome counts include all attempts. Three first-context samples and 20 repeat samples are descriptive baselines, not production reliability estimates. Shared host load and the diagnostics themselves affect timing.

The CI smoke run verifies plumbing, actual offline PDF/OCR execution, expected dimension results, touch feedback, outcome accounting, export/clear, privacy exclusions and a separate intentional long-task calibration. Calibration and mocked empty/error outcomes are excluded from product benchmark samples. CI does not enforce shared-runner wall-clock targets.

## Local dimension worker

The initial baseline exposed synchronous pixel thresholding and dimension association as a main-thread delay on the larger PDF fixture. Browsers with Worker, OffscreenCanvas and image-bitmap support now execute decode/pixel/association work in a short-lived local worker. The same bounded raster size, threshold formula, measurement parser and endpoint algorithm are used. Worker setup, transfer and execution are included in total time, with worker stages reported separately using aligned performance time origins.

Unsupported capabilities retain the bounded main-thread path and record `main_fallback`. Smoke checks compare saved worker/fallback findings exactly for native PDF and real OCR fixtures. Worker-load/processing failure fails the scan while preserving existing findings; it does not silently retry expensive processing on the UI thread. The worker has a 30-second timeout and is terminated after its result/error/timeout. Existing exact-source checks run before save. Persistent jobs, user cancellation, pause/resume and concurrency control still belong to RP-2.

## Results and remaining gates

2026-11-05 session, shared Linux x86-64 host, Chromium 141 / Playwright 1.56.1, 1,180 × 900 viewport, touch enabled, no configured CPU throttling. No GPU/model inference runs in this benchmark. This is an instrumented development baseline, not a release-device performance guarantee.

### Same larger PDF fixture: main thread versus worker

| Repeated-page measurement | Main-thread baseline | Local worker |
| --- | ---: | ---: |
| Scan sample count | 20 | 20 |
| Scan total p50 | 318 ms | 254 ms |
| Scan total p95 | 386 ms | 270 ms |
| Trusted touch-to-paint opportunity p95 | 178 ms | 33 ms |
| Touch sample count during those scans | 76 | 111 |
| Observed main-thread long tasks across those scans | 20 | 0 |

Each run must produce both expected dimension readings and both spans within the unchanged three-source-pixel endpoint tolerance. Worker/fallback smoke checks also require byte-for-byte identical saved findings for both fixtures. A different touch sample count reflects the asynchronous input schedule and job duration; these are not paired trials or a statistical confidence interval. Baseline maximum touch feedback was 211 ms even though its p95 was below the provisional 200 ms target. Worker maximum for these repeated PDF scans was 50 ms. Zero observed long tasks is limited to this fixture/run.

### Current worker pipeline

| Route / phase | Scans | Total p50 | Total p95 | First usable paint opportunity p95 | Touch feedback p95 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Native PDF, first scan after import in fresh context | 3 | 259 ms | 477 ms | 471 ms | 35 ms |
| Native PDF, repeated page | 20 | 254 ms | 270 ms | 254 ms | 33 ms |
| Raster OCR, first scan in fresh context | 3 | 864 ms | 901 ms | 886 ms | 33 ms |
| Raster OCR, repeated page | 20 | 481 ms | 521 ms | 506 ms | 32 ms |

Fresh PDF import p95 was 217 ms; repeated import p95 was 153 ms. Raster import p95 was 14 ms fresh and 23 ms repeated. Import sizes and boundaries differ from Scan; do not compare those numbers to full room interpretation. Confirmation wait is included in totals and separately retained. Both benchmark runs made no external requests and recorded no page errors. All measured scans passed their expected reading/span checks with geometry remaining unverified.

The reproducible raw records include stage distributions, all attempt outcomes, touch samples, installation times, heap limitations and implementation file hashes:

- [Main-thread PDF baseline](benchmarks/scan-main-thread-baseline-20261105.json)
- [Current PDF and OCR reference run](benchmarks/scan-performance-reference-20261105.json)

The baseline was captured before adding the worker; its hashes identify that implementation. The current reference hashes match the implemented runtime and harness. CI smoke results are separate correctness evidence, not replacements for the reference samples. See [RESPONSIVE_PROCESSING_PLAN.md](RESPONSIVE_PROCESSING_PLAN.md) for target budgets and the next roadmap gates.

These tiny fixtures do not establish representative drawing accuracy or speed. Physical iPad Safari/Pi, permitted real room sets, device memory pressure, larger/multiple pages, real vision inference, queue/network conditions, cancellation/recovery and concurrency remain open. No GPU, server or managed model is selected from this baseline.
