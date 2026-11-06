# Responsive processing plan

Status: roadmap requirements, 2026-11-02; first local instrumentation/worker benchmark batch, 2026-11-05. No latency or hardware claim has been validated for the complete application. This plan expands the existing provider-independent execution contract.

## Product behavior

The app should remain useful while analysis runs. Opening saved drawings, navigating a model, marking evidence and saving corrections must not wait for a large AI inference request. Preliminary outputs identify their sources, assumptions and unresolved conditions. A complete verified room is a separate outcome.

| Work | Preferred candidate execution | User experience |
| --- | --- | --- |
| Drawing/model viewing, touch controls, corrections | Device | Immediate interaction; available with saved data offline |
| PDF text, bounded line extraction, simple geometry checks | Device workers where benchmarks support it | Incremental evidence without blocking input |
| Difficult visual interpretation, cross-sheet reasoning, reconstruction | Workstation or operator-controlled GPU service; approved managed adapter optionally evaluated | Durable background job; first useful region results before complete analysis |
| Reopening unchanged data | Versioned local cache | Show saved results immediately with their verification state |

Do not assume moving a task to a server fixes latency. Upload time, preprocessing, model initialization, queueing, inference, validation and download all contribute. A powerful GPU or high tokens/second figure alone is not a user-response benchmark. No specific conclusion is drawn about the unidentified YouTube demonstration.

## Provisional performance budgets — targets to validate

Measure p95 on a declared reference workload/device/network profile. These are initial product targets, not promises or universal drawing limits.

| Interaction | Initial target | Completion definition |
| --- | --- | --- |
| Acknowledge tap, start/cancel job, save-action feedback | 200 ms | Visible response; durable-save completion reported separately |
| Input responsiveness during analysis | No inference-dependent blocking; p95 feedback within 200 ms | Touch/scroll/edit usable under load; long main-thread tasks recorded |
| Reopen an unchanged cached room/result | 2 seconds | Saved supported content usable, not just a loading skeleton |
| First useful evidence for a supported selected region, warm backend | 10 seconds | Source-linked usable findings or a meaningful unsupported/error result |
| Reference one-room background analysis | 60 seconds | Declared pipeline stages finished with unresolved items explicit; not a claim of verified M1 |

Define page counts, source pixel dimensions, file sizes, model/context/output limits and concurrency before applying the region/room targets. A complex sheet set may take longer; show scope and job state honestly. Record cold start and initial installation/model download separately; do not hide them by reporting only warm results.

If a route misses its latency budget or quality gate, reduce the supported job scope, improve the pipeline or select another approved execution route. Do not silently lower accuracy, invent results, drop validation or describe streaming text as completed geometry. Do not buy a workstation based on these targets.

## Pipeline changes, in order

1. **RP-1 — Instrument and benchmark.** Record import/render, native text/OCR, line association, model load, queue/upload/inference, deterministic validation, persistence and result rendering. Capture time to first useful evidence, total completion, p50/p95, peak memory, responsiveness, failure/cancellation rate and cost per completed job. Keep cold/warm timings separate. Existing accuracy fixtures remain correctness gates; expand permitted real-region coverage.
2. **RP-2 — Background job contract.** Add queued/running/partial/complete/failed/cancelled states, source/revision scope, bounded concurrency, duplicate-job suppression, timeouts and cancellation. Persist completed stages, support reconnect/resume and discard stale responses. Progress reflects finished work; no fabricated countdowns.
3. **RP-3 — Incremental local processing.** Move costly synchronous work off the UI thread where feasible. Extract PDF text/vector evidence before raster/model work; process a selected room/region first; send bounded structured model requests only for ambiguity. Avoid serial multi-agent loops on the ordinary interaction path. Benchmark worker transfer/memory costs as well as computation.
4. **RP-4 — Cache and invalidation.** Key automatic results by original/page/crop identity, revision, extraction/model/prompt/rule/settings versions and preprocessing. Reuse unchanged work; recompute affected parts after edits. Retain superintendent corrections separately and revalidate them against revised sources. A cache hit must not resurrect stale verification.
5. **RP-5 — Compare heavy-analysis routes.** Run the same permitted workload and quality gates on local workstation and operator-controlled GPU service; optionally test an approved managed adapter with synthetic/public inputs first. Measure one user and realistic concurrent users, including upload/queue and failure recovery. Select by end-to-end latency, accuracy, privacy, reliability and operating cost, not throughput alone.
6. **RP-6 — Device and degraded-network acceptance.** Test physical iPad Safari and Raspberry Pi with the supported local subset, including memory pressure. Simulate slow/disconnected networks, server overload and cold starts. Viewing, edits and saved evidence stay usable; heavy jobs clearly report when their processing route is unavailable. No surprise remote upload as a fallback.

## Privacy and independence

Core geometry/evidence schemas and verification stay owned and provider independent. The preferred remote candidate is infrastructure controlled by the operator. Managed processing is an optional adapter under evaluation, not a newly mandatory dependency.

Before sending private drawings to any processing server, obtain explicit project authorization, define the destination and data scope, and implement authentication, encrypted transport, access controls, retention/deletion and logging rules. Protect temporary crops and prompts as confidential data too. Project corrections do not automatically become generalized model training data. This amendment does not authorize uploading current project drawings, purchasing compute or subscribing to a provider.

## Release gate and next deliverable

The first RP-1 slice instruments current import, native text/OCR, source guards, dimension association, review wait, saving and paint opportunities. An opt-in on-device report and actual offline browser benchmark are implemented. The declared synthetic workload includes fresh-context and repeated runs, percentile sample counts, idle/under-scan touch feedback, long tasks, outcome accounting and coarse JS heap samples. Unsupported heavy vision, remote queue/network, reconstruction, cache reopening, device peak memory and operating cost remain explicit gaps. Guide, protocol and measured comparison: [SCAN_PERFORMANCE.md](SCAN_PERFORMANCE.md).

The baseline exposed main-thread pixel/line work as an interaction delay. A bounded local worker now performs raster decoding, thresholding and dimension association when supported. The existing main-thread path remains a capability fallback, with exact findings parity checked on both synthetic fixtures. Worker loading/processing errors retain saved findings; post-processing source checks still reject stale results. This is an early RP-3 improvement justified by RP-1 evidence; it is not a persistent/cancellable RP-2 job system. No heavy vision model or remote inference is added.

**Next:** RP-2 versioned/cancellable background job contract and recovery, then broaden measurements to permitted real regions and physical iPad/Pi. Keep fallback latency and memory acceptance open. Device measurements can use the optional Settings timing export. Backend/model selection follows comparable complete-workflow results; a UI-progress demonstration is not sufficient.

M1 still requires source-backed dimensional accuracy, independent scale/cross-view checks and persistent corrections. Speed requirements supplement those gates. Existing draft vision adapter work does not prove real-model speed or useful hardware capacity.

## Primary references informing measurement

- NVIDIA inference metrics: https://docs.nvidia.com/nim/benchmarking/llm/metrics — separate first-token and full-request latency, including queue/network effects.
- NVIDIA benchmarking guidance: https://nvidia.github.io/TensorRT-LLM/developer-guide/perf-benchmarking.html — benchmark latency and throughput under declared workloads and serving conditions.

These references inform the benchmark design; they do not establish this app's timings or prescribe a particular runtime/provider.
