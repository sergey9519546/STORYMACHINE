---
type: audit
updated: 2026-09-19
sources: [docs/audits/2026-09-19-doctor-pool-fallback/README.md, server/nvm/analyze/doctor-pool.ts, server/nvm/analyze/doctor-worker.ts, server/routes/config.ts, tests/core/doctor-pool-load-failure.test.ts, tests/routes/doctor-pool-disabled-health.test.ts, tests/routes/ready.test.ts, README.md, SESSION_REPORT_2026-09-19.md]
status: active
---

# Audit — 2026-09-19 Doctor Pool Fallback

**Directory:** `docs/audits/2026-09-19-doctor-pool-fallback/` — the lane
record for making the Script Doctor worker pool's in-process fallback
actually reachable for the failure its own header names, and for making the
fallback latch visible once it sets. Branch `lane/doctor-pool-fallback`,
from `53f6e377`.

## What it answers

READ session report §4 row 12 / logic audit **C9** and **C10**.

**C9.** `server/nvm/analyze/doctor-pool.ts`'s property 4 promises that if
workers cannot run in this environment — "a bundler that did not emit the
worker file" among them — the pool disables itself permanently and every call
runs in-process. The latch had two triggers: `new Worker()` throwing, and an
`'error'` event on a not-yet-ready slot. Neither fires for a worker that
*starts* fine and then cannot import the analyzer, because
`server/nvm/analyze/doctor-worker.ts` wrapped its lazy
`await import('./doctor.ts')` in the **same try/catch as the analysis**: the
failure came back as an ordinary per-job `error` message, `slot.ready` never
flipped, no `'error'` event fired, and the pool rejected the caller and kept
the slot — so every later request repeated it. Measured on the pre-change
files: two submissions, both `REJECTED`, `poolDisabled` still `false`,
`workers: 1`, zero `doctor_pool_disabled` lines. The product's front door
500s forever rather than falling back.

The worker now posts a distinct `load_failed` message and exits with its own
code (`DOCTOR_WORKER_LOAD_FAILED_EXIT`, 97) one turn later so the message
flushes first; the pool treats both as the environment case through one
shared `handleWorkerEnvironmentFailure()`, which also replaces the old
`'error'`-while-not-ready branch verbatim. The in-flight caller is handed to
the in-process path rather than rejected. Post-change, the same two
submissions both return a report, the latch is set with a reason, and exactly
one warn line is emitted.

**The exit backstop keys on the exit CODE, not on `!slot.ready`** — `ready`
is also false for a healthy worker cancelled during its first, cold job, and
latching the pool off for a Cancel would be a worse defect than the one being
fixed.

**C10.** Once the latch set, every run went in-process with neither
`DOCTOR_QUEUE_BUDGET_MS` nor `DOCTOR_ANALYSIS_BUDGET_MS` and no admission
control, and the only symptom on `/health` was a rising `inProcessRuns` —
which a deep read produces too, so a server that had lost its worker pool
read exactly like a healthy one. `doctorPoolStatus()` gains `disabledReason`,
`GET /health` gains `poolDisabled`/`poolDisabledReason` (additive; the
whole-object `deepEqual` in `tests/routes/ready.test.ts` still guards the
shape), and one `doctor_pool_disabled` warn line names the reason.

## What was deliberately NOT changed

The budget is **still not enforced** on the fallback path, and
`doctor-pool.ts`'s property 5 now says so outright so the reader of
[[Decision 7 - Per-Analysis Wall-Clock Budget]] is not misled. Enforcement is one
primitive — terminate the worker — and on the main thread a fired budget
would reject the caller while the analysis ran on underneath them, stopping
the wait without stopping the work. What replaced silence is a log line:
a fallback run that outlasts the analysis budget emits
`doctor_inprocess_over_budget` with its elapsed ms. Deep read is excluded (it
legitimately outruns a CPU budget), as is a queue budget switched off. No new
rejection exists anywhere, because adding one to the path whose whole job is
"no worse than before this file existed" would be a behaviour change rather
than a fix. `/ready` is untouched: a latched pool is degraded, not unready.

## The test-injection choice

Making `import('./doctor.ts')` fail inside a **real** worker is the hard part.
An injectable `Worker` class was rejected — it tests the coordinator against a
fiction of a worker, and the defect lived in the seam between the two files. A
stand-in worker script behind `DOCTOR_WORKER_SCRIPT` exists (test-only,
ignored under `NODE_ENV=production`, documented in `README.md`) but is used
for exactly one branch: the exit-code backstop for a `load_failed` message
that never arrives. The main suite instead uses
`DOCTOR_WORKER_DOCTOR_MODULE`, the specifier the worker imports the doctor
from — pointed at a module that does not resolve, it reproduces the failure
**inside the shipped worker file**, which a copy of that file never could.

## Why it is safe to have merged

Nothing on the scoring path changed: `node scripts/check-scoring-receipt.mjs
53f6e377..HEAD` reports *no scoring-path files changed*, and
`node scripts/check-doctor-output-identity.mjs --compare` reports
**PASS — all 45 reports are byte-identical**. No quality claim, no score
moved; this is a reliability and observability change on the front door.

**Related:** [[Decision 7 - Per-Analysis Wall-Clock Budget]],
[[Audit - 2026-09-19 Converge Stream Close]],
[[Audit - 2026-09-19 Revise Deadline]], [[Patterns]],
`docs/LANE_STANDARD.md`,
`docs/audits/2026-09-19-doctor-pool-fallback/README.md`.

## Sources

- `docs/audits/2026-09-19-doctor-pool-fallback/README.md`
- `server/nvm/analyze/doctor-pool.ts`
- `server/nvm/analyze/doctor-worker.ts`
- `server/routes/config.ts`
- `tests/core/doctor-pool-load-failure.test.ts`
- `tests/routes/doctor-pool-disabled-health.test.ts`
- `tests/routes/ready.test.ts`
- `README.md`
- `SESSION_REPORT_2026-09-19.md`
