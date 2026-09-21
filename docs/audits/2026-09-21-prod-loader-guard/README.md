# Lane record — 2026-09-21 production-loader guard

`lane/prod-loader-guard`, branched from `3fde3f1d` (the session branch
`claude/fable-5-1-orchestrator-yil0xr`, main's lineage). A **defensive change
that moves no number**: the calibration layer's silent fallback becomes a
logged one, and a test spawns the real production loader so the class of
defect that fallback hid can never again pass `npm test`.

This lane was opened by §E5 of
`docs/audits/2026-09-20-feature-length-defects-prep/README.md` (on
`lane/devprod-dimensions`), which found the feature-length candidate shipping
every production doctor report **without** `healthPercentile`,
`dimensions[].percentile` or `dimensions[].percentileDescriptor`, for as long
as the candidate had carried a `const sig = (x: number) => …` inside
`subDensityCurve`. That branch fixed its own arrow and wrote the guard test.
This lane asks the question the finding raises about main's lineage: does THIS
tree have the defect, and if not, what stops it acquiring one?

**Answer.** It does not have the defect — verified under the real tsx CLI, on
the main thread and on a pool worker (§3). It did have the same two structural
weaknesses the candidate had: a `catch {}` that swallowed the corpus-build
failure into an empty distribution with nothing logged, and no test anywhere
that ran the doctor under the loader production uses. Both are closed here.

## 1. The commits

| commit | what |
|---|---|
| `ed07e688` `test(calibration): guard the production loader; make the empty-distribution fallback loud` | `tests/core/doctor-calibration-under-tsx.test.ts` (new), `server/nvm/analyze/calibration/reference.ts` (`settleDistribution`, `CALIBRATION_UNAVAILABLE_LOG_MSG`, logger import), four new cases in `tests/core/calibration.test.ts` |
| `d7446019` `docs(claude-md): the TDZ gotcha now names its function-expression twin under tsx` | one sentence in the "formula constants stay function-local" bullet of `CLAUDE.md` |
| `239733a5` `docs(receipts): production-loader guard — output-identity receipt …` | the `### 2026-09-21 — production-loader guard` entry appended to `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` |
| `docs(audit): production-loader guard lane record` | this file, `docs/brain/Audits/Audit - 2026-09-21 Prod Loader Guard.md`, and the regenerated brain graph |

The receipt is the authority for every measured figure; this record explains
the mechanism, the probe, and the reasoning.

## 2. The mechanism, in one paragraph

Every real deployment runs `tsx server.ts` (Dockerfile CMD, `npm start`,
`npm run dev`). tsx transforms through esbuild with `keepNames: true`, which
injects a module-level `var __name = …` at the top of every transformed module
and wraps every NAMED function expression — `const f = (x) => …`,
`const f = function () {}` — in a call to it. That helper is a plain `var`:
hoisted, so no `ReferenceError`, but `undefined` until the module's body runs.
`calibration/reference.ts` scores its 20-sample corpus in a top-level `await`
through `doctor.ts`'s `computeRawCraftScore`, and because `doctor.ts` imports
`reference.ts` back, that call runs BEFORE `doctor.ts`'s body has evaluated
whenever `doctor.ts` is the cycle's entry — which it is on every pool worker
(`doctor-worker.ts` does `import('./doctor.ts')` first) and on a
`tsx server.ts` main thread. Any named function expression reachable from
`computeRawCraftScore` therefore throws `TypeError: __name is not a function`
during the corpus build; `reference.ts`'s `catch` turned that into the empty
distribution; `aggregateReport`'s `health.length > 0` guard then left every
percentile field `undefined`. `npm test` and the dev server run
`node --experimental-strip-types`, which injects no helper, so the suite could
not see it by construction. This is the function-expression twin of the
module-level-const TDZ gotcha `CLAUDE.md` already carried, hidden by the same
fallback, for the same reason.

## 3. Verification that this tree is clean, and the fail-first probe

The guard (`tests/core/doctor-calibration-under-tsx.test.ts`) spawns
`process.execPath` running `tsx/dist/cli.mjs` — the resolution
`scripts/verify-production-build.mjs` uses, no `.bin` shim — with
`NODE_ENV=production` and `DOCTOR_POOL_PREWARM=0`, on a probe that imports
`doctor.ts` FIRST, reads the main thread's distribution size, runs a 3-scene
script in-thread, calls `clearDoctorCache()` (the pool ADOPTS worker results
into `doctor.ts`'s cache, so an in-thread run after the pool reads the
worker's report back), runs the same script through the real pool, shuts the
pool down, and prints both reports plus the pool counters. It asserts, in this
order: the main-thread distribution holds all 20 corpus samples; the in-thread
report carries `healthPercentile` and a numeric `percentile` plus a
`percentileDescriptor` on all five dimensions; the pool ran exactly one worker
job and nothing in-process; the pooled report is calibrated the same way; the
two reports are `deepEqual` with `analyzedAt` excluded; and the child's stderr
contains neither `CALIBRATION_UNAVAILABLE_LOG_MSG` nor
`__name is not a function`.

| run | tree | result | wall |
|---|---|---|---|
| clean | `ed07e688` (this lane) | **1/1 pass** — 20 of 20, both reports calibrated, deepEqual | 4.64 s |
| fail-first probe | this lane + `const sig = (x: number) => x;` inside `densityPenalty`, `weightedIssues` wrapped in it | **0/1 — fails by name**: `main thread: reference distribution holds 0 of 20 corpus samples — buildDistribution() threw and was swallowed into emptyDistribution()` | 2.5 s to the failure |
| clean, after restoring `doctor.ts` from a byte copy | `ed07e688` | **1/1 pass** | 4.11 s |

The probe run's stderr carried the new log line, which is the second half of
this lane made visible:

```
{"time":"2026-09-21T04:05:00.996Z","level":"error","msg":"calibration reference distribution unavailable: scoring the reference corpus threw and was swallowed into an empty distribution — every report this process produces will carry no healthPercentile and no dimension percentile","error":"TypeError: __name is not a function","thread":"main","corpusSize":20,"percentileFieldsAbsent":true}
```

Under this box's Node 22.22.2 only the main thread emptied; the candidate's
audit measured Node 24.21.0 (CI's and the Dockerfile's version) emptying the
workers too. The guard asserts both threads, so either version fails it. The
probe was run twice — once with the stderr assertions placed first (the
failure then named the log line) and once with them last (the failure then
named the distribution count, which is the version committed) — and
`doctor.ts` was restored from a pristine byte copy after each; `git status` is
clean on that file and the committed tree contains no probe.

Cost: the test spawns tsx once. 4.1–4.6 s wall on this machine, of which the
child itself is ~3.2 s.

## 4. The catch is loud now

`reference.ts`'s module-load build is now

```ts
const distribution: ReferenceDistribution = await settleDistribution(buildDistribution);
```

where `settleDistribution(build, log = logger)` is `try { return await build(); }
catch (err) { log.error(CALIBRATION_UNAVAILABLE_LOG_MSG, { error, thread,
corpusSize, percentileFieldsAbsent: true }); return emptyDistribution(); }`.
The fallback VALUE is unchanged — the same well-formed empty distribution,
so the server still boots analysis-only with calibration absent, exactly as
before. What changed is that a deployment which loses calibration now says so
on stderr, once per process, in the structured JSON `server/lib/logger.ts`
emits (never the global console object; `npm run check-no-console` is
CI-blocking and it caught the word in a comment of mine before it caught
anything else). The builder and the sink are parameters purely so the catch is
unit-testable without touching the scoring path: `tests/core/calibration.test.ts`
drives it with a throwing builder and a spy sink (four cases: success logs
nothing and returns by identity; a throw yields empty + exactly one line with
the message, `error: "TypeError: __name is not a function"`, a thread name,
`corpusSize: 20` and `percentileFieldsAbsent: true`; a non-`Error` throw is
quoted as a string; the default sink lands on `process.stderr` as JSON at
level `error`, not stdout). 25/25, was 21.

`node:worker_threads` and the logger are the two new imports.
`tests/core/pure-core-boundary.test.ts` already allows `server/lib/logger.ts`
on the doctor's graph (it was reachable through `revision/pipeline.ts`); 6/6.

## 5. What was deliberately not done

- **Moving the craft formula into a leaf module** with no import of
  `doctor.ts`, which would take the cycle out of the corpus path and retire
  both the const-TDZ gotcha and this one structurally. The candidate's audit
  (§E5.3) names it as the right follow-up and declines it for the same reason
  this lane does: it is a move of scoring-path code, and this lane's brief is
  the guard and the log.
- **Raising the log to a boot-time hard failure.** Calibration is an
  enhancement, not a dependency (`aggregateReport`'s own comment); the server
  must still boot without it. A loud fallback is the right shape.
- **Pinning Node 24 in the test.** The guard runs under whatever
  `process.execPath` is; CI's `node-version: "24"` covers the version the
  candidate's audit found emptying the workers, and this box's 22 covers the
  main thread. Both fail the guard, so it does not need to know which.

## 6. Gates

| check | result |
|---|---|
| `node --experimental-strip-types --test tests/core/doctor-calibration-under-tsx.test.ts` | 1/1 (4.64 s, 4.11 s), fail-first 0/1 by name — §3 |
| `tests/core/calibration.test.ts` | 25/25 |
| `tests/core/pure-core-boundary.test.ts` | 6/6 |
| `npm run lint` | 0 |
| `npm run check-no-console` | 0 (312 files, 3 quarantine entries, all proven unreachable) |
| `node scripts/check-scoring-receipt.mjs 3fde3f1d..HEAD` | OK — "gained a well-formed new entry in the same range" |
| `scripts/check-doctor-output-identity.mjs --compare` vs `git archive 3fde3f1d`, `GIT_SHA=dev` both sides | `OUTPUT IDENTITY: PASS — all 45 reports are byte-identical (analyzedAt excluded)` |
| `tests/core/public-benchmark.test.ts` | 28/28 — 0.5313 / 0.5586, 0.4063 / 0.4443, 1.0000 / 0.9473; 17/15/0, 8/14/10, 32/0/0; no floor moved, none re-locked |
| `tests/core/blind-pairs-discrimination.test.ts` | 4/4 |
| `tests/core/script-doctor.test.ts` | 86/86 |
| `tests/core/doctor-worker-pool.test.ts` | 9/9 |
| `tests/core/doctor-history-identity.test.ts` | 35/35 |
| `npm run brain && npm run check-brain` | 0 (see the lane's final commit) |
| `honesty-audit-claims` · `brain-coverage` · `docs-gating-set` | see the lane's final commit; `docs/CLAIMS_REGISTER.md` carries no `path:line` anchor into any file this lane touched (`reference.ts`, `calibration.test.ts`, `CLAUDE.md`, the receipts ledger), so no re-anchoring was needed |

Nothing was pushed. The full `npm test` is the orchestrator's run.
