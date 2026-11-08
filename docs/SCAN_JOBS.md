# Cancel and restart local drawing scans

## What the operator sees

Select a drawing and tap **Scan drawing**. **Cancel scan** is available during processing. The app leaves saved findings in place until it has finished analysis and you accept the existing replacement prompt. Declining that prompt discards the new findings. If the page closes during analysis, reopen the same room and drawing and tap **Restart scan**. This starts from the beginning and checks the original file, rendered page, revision and job version first. Use **Scan drawing** for a new or replaced drawing. The app never automatically restarts a scan.

If interruption happened just as you approved saving, check the saved findings first. Findings storage and recovery status are separate writes, so the journal can say interrupted even if the approved save went through.

## Scope and safeguards

- A versioned, local journal retains the most recent scan per project, room and sheet, up to 20 records. It stores status, stage and source fingerprints, without drawing bytes, findings, filenames or error text. Clear all app data removes it. The optional timing export does not include journal identities.
- One active scan per app origin across tabs that run this version, using Web Locks. Refresh older tabs before concurrent use. A browser without Web Locks reports that scanning is unavailable; existing saved drawings and reviews can still be viewed. No remote job queue or server is used.
- The job checks its selected room/sheet, data generation and exact current source before applying results. Changes to saved findings on that sheet during the scan also block replacement. This coordinates scan jobs, not all independent editing/import transactions across tabs.
- Cancel ends the OCR supervisor (including initialization), stops the dimension worker and requests PDF loading-task cleanup. Late results cannot reach the save step. Already issued hashing, reads or main-thread fallback work may finish; synchronous browser operations cannot be interrupted mid-call.
- Processing has a two-minute budget excluding time in the review prompt. Dimension worker work has a separate 30-second limit. On reload, a journal record left running after its tab releases the lock becomes interrupted. Restart requires a captured matching source; if interrupted before capture, use Scan drawing. No partial scan results are stored or published.
- Scan timing now includes journal updates and the OCR supervisor boundary in relevant stages. Prior benchmark numbers describe the earlier build; rerun on physical iPad/Pi before drawing release conclusions.

## Verification

The offline browser gate covers cancellation during OCR setup, worker termination, refusal to launch a second scan, reload recovery, explicit restart with unchanged findings, and refusing recovery after a same-size raster change. Existing real OCR, PDF extraction/source guards, dimension review and performance smoke checks remain in CI.

Durable server execution, reconnect to a running remote job, partial-result checkpoints, result reuse, and physical device acceptance remain roadmap work.
