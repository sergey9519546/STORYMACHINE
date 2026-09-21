---
type: audit
updated: 2026-09-21
sources: [docs/audits/2026-09-21-prod-loader-guard/README.md, server/nvm/analyze/calibration/reference.ts, server/nvm/analyze/doctor.ts, server/nvm/analyze/doctor-worker.ts, server/lib/logger.ts, tests/core/doctor-calibration-under-tsx.test.ts, tests/core/calibration.test.ts, CLAUDE.md, docs/p1-benchmark/MEASUREMENT_RECEIPTS.md]
status: active
---

# Audit — 2026-09-21 Prod Loader Guard

**Directory:** `docs/audits/2026-09-21-prod-loader-guard/` — the lane record
for `lane/prod-loader-guard`, branched from `3fde3f1d` (main's lineage).

## What it answers

On 2026-09-21 the feature-length candidate branch was found shipping every
production doctor report **without** `healthPercentile` or any dimension
`percentile` / `percentileDescriptor` — silently, for as long as it had carried
a `const sig = (x: number) => …` inside `subDensityCurve`. Mechanism: the
production loader (`tsx server.ts`) transforms through esbuild `keepNames`,
which wraps every NAMED function expression in a call to a module-level
`var __name` that is hoisted but still uninitialised when
`calibration/reference.ts`'s top-level await scores the corpus through
`computeRawCraftScore` mid-cycle (doctor.ts is the cycle's entry on every pool
worker and on a `tsx server.ts` main thread). `TypeError: __name is not a
function` hit reference.ts's bare `catch {}`, the distribution came back empty,
and nothing logged it. `npm test` and the dev server run
`--experimental-strip-types`, which injects no helper, so no test could see it.
It is the function-expression twin of the module-level-const TDZ gotcha
`CLAUDE.md` already carried — hidden by the same fallback.

**Does main's lineage have it?** No — verified under the real tsx CLI with
`NODE_ENV=production`: the main-thread distribution holds 20 of 20, in-thread
and pooled reports both carry every percentile field, and the two are
`deepEqual` with `analyzedAt` excluded. It had the same two structural
weaknesses, and both are closed:

- **The guard.** `tests/core/doctor-calibration-under-tsx.test.ts` spawns
  `process.execPath` running `tsx/dist/cli.mjs` on a probe that imports
  `doctor.ts` first, runs the doctor in-thread, clears the cache, runs it
  through the real pool, and asserts the distribution size, the percentile
  fields on both reports, one worker run / zero in-process, `deepEqual`, and a
  stderr free of the new log line and of `__name is not a function`.
  **Proven able to fail**: `const sig = (x: number) => x;` inserted inside
  `densityPenalty` fails it by name — `main thread: reference distribution
  holds 0 of 20 corpus samples` — and was reverted from a byte copy. 4.1–4.6 s
  wall.
- **The catch is loud.** `reference.ts`'s wrap is now the exported
  `settleDistribution(build, log = logger)`: the same empty distribution on a
  throw, but `logger.error(CALIBRATION_UNAVAILABLE_LOG_MSG, { error, thread,
  corpusSize, percentileFieldsAbsent: true })` first — `server/lib/logger.ts`,
  never the global console object. Four unit cases in
  `tests/core/calibration.test.ts` drive it with a throwing builder and a spy
  sink (25/25, was 21).

## Why it is safe to have merged

The only scoring-path edit is inside a catch branch that never executes on
this tree; the success path returns `buildDistribution()`'s promise by
identity. `check-doctor-output-identity --compare` against
`git archive 3fde3f1d` is **45/45 byte-identical**; all six public-benchmark
statistics reproduce unchanged (0.5313 / 0.5586, 0.4063 / 0.4443,
1.0000 / 0.9473) with ordered/inverted/tied counts unchanged; `script-doctor`
86/86, `doctor-worker-pool` 9/9, `doctor-history-identity` 35/35,
`blind-pairs-discrimination` 4/4, `pure-core-boundary` 6/6 (the logger was
already allowed on the doctor's graph). No floor in `scripts/lib/auc.ts` moved,
no re-lock ran, and no real-corpus figure is claimed: the private AUC-24 corpus
is not present in this environment. The receipt is the 2026-09-21 entry headed
"production-loader guard (calibration catch made loud; no formula change)" in
`docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`, and
`node scripts/check-scoring-receipt.mjs 3fde3f1d..HEAD` exits 0 on it.
`CLAUDE.md`'s TDZ gotcha gained one sentence naming this twin and the guard.
`npm test` in full was out of scope for this lane.

**Deliberately not done:** moving the craft formula into a leaf module with no
import of `doctor.ts`, which would retire both gotchas structurally — a move of
scoring-path code, and the right follow-up.

**Related:** [[Audit - 2026-09-20 Burrows Delta Hoist]], [[Patterns]],
`docs/audits/2026-09-21-prod-loader-guard/README.md`,
`docs/audits/2026-09-20-feature-length-defects-prep/README.md` §E5 (on
`lane/devprod-dimensions`, where the defect was found).

## Sources

- `docs/audits/2026-09-21-prod-loader-guard/README.md`
- `server/nvm/analyze/calibration/reference.ts`
- `server/nvm/analyze/doctor.ts`
- `server/nvm/analyze/doctor-worker.ts`
- `server/lib/logger.ts`
- `tests/core/doctor-calibration-under-tsx.test.ts`
- `tests/core/calibration.test.ts`
- `CLAUDE.md`
- `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`
