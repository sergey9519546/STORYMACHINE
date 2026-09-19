---
type: audit
updated: 2026-09-19
sources: [docs/audits/2026-09-19-converge-contract/README.md, server/lib/validation.ts, server/nvm/converge/loop.ts, server/routes/nvm/converge.ts, tests/routes/nvm-converge-validation.test.ts, tests/core/converge-loop-contract.test.ts, SESSION_REPORT_2026-09-19.md]
status: active
---

# Audit — 2026-09-19 Converge Contract

**Directory:** `docs/audits/2026-09-19-converge-contract/` — the lane record
for SESSION_REPORT_2026-09-19.md §4 row 13 / logic-audit findings C11 and
C12, on `lane/converge-contract` from `53f6e377`.

## What it answers

Two defects in the same request/response contract: `POST /api/nvm/converge`'s
`target` was `z.object({ sceneIdx: z.number() }).passthrough()` (C12), and
`convergeScene()`'s (`server/nvm/converge/loop.ts`) result could describe two
different IRs at once when nothing passed Tier 1 (C11).

**C12.** A string `tensionTarget` made the loop's `valuationScore >=
target.tensionTarget` gate meaningless without ever erroring; `budget.
maxIterations: -1` ran the loop zero times, landing directly in C11's
synthesized-empty-IR path. Fix: `SceneTargetSchema` types every field
(`sceneFunction` against the same six-value `SCENE_FUNCTIONS` list
`llm-generator.ts`'s `IR_SCHEMA` and `NarrativeTransitionIR.ts` both declare;
`activeMechanisms` bounded; `necessity` reuses the pre-existing
`NecessityCertificateSchema`). `tensionTarget`'s upper bound is deliberately
1,000,000, not the 100 a "target score" name suggests — `deriveTensionLedger`'s
`totalTension` is unbounded, and `tests/routes/nvm-converge-select.test.ts`
(existing, unmodified) deliberately sends `999999` as an "unreachable
ceiling" fixture; a 0–100 cap was verified live to break that gate before
the wider bound was chosen. `ConvergeBudgetSchema`
(`maxIterations`/`candidatesPerIteration`/`maxLLMCalls`, all bounded, all
`int()`) is shared by `ConvergeBodySchema` and `ConvergeArcBodySchema`.
`converge-stream`'s hand-parsed `sceneFunction` query param — previously an
unchecked cast, `(q['sceneFunction'] ?? 'build_tension') as
SceneTarget['sceneFunction']` — now checks against the same
`SCENE_FUNCTIONS` list and falls back rather than propagating an arbitrary
string.

**C11.** On the budget-exhausted return path, `finalIR` could be the last
rejected candidate or a synthesized stub (whenever `best` stayed `null`),
while `finalComposite` stayed `bestComposite` — `0` when `best` was `null`,
since nothing ever set it. `finalValuation`/`finalQuality` described
`finalIR`; `finalComposite` described a candidate that, in that exact
branch, does not exist. Fix: all three now recompute from `finalIR` with the
loop's own composite formula. Added `tier1Passed: boolean` to
`ConvergeResult` (and threaded into all three routes' JSON), equivalent to
`winner !== null` but explicit for a caller reading the always-populated
`ir` field for diagnostics. Separately, `if (!finalIR && llmCallCount <=
llmCallLimit)` let the last-resort fallback spend a `(maxLLMCalls + 1)`th
`generate()` call — fixed to `<`; measured live, 4 calls → 3 under a budget
of 3. The synthesized last-resort IR now carries `provenance.model: 'stub'`,
matching `llm-generator.ts`'s `stubIR()` convention (grepped: the same field
is what `stubbedFromLLM` counting and
`tests/core/openai-compat-generation-guards.test.ts` already key off).

## Why it is safe to have merged

Nothing on the scoring path changed —
`node scripts/check-scoring-receipt.mjs 53f6e377..HEAD` reports "no
scoring-path files changed" (both `server/lib/validation.ts` and
`server/nvm/converge/loop.ts` are verified not reachable from `doctor.ts`).
All three new-test claims (route-level 400s/200, and the three
`convergeScene()`-level contract assertions) were fail-first verified live:
`git stash push` on the fix files reproduced 5/7 route-validation failures
and 3/3 loop-contract failures, `git stash pop` restored green. Every named
GATE test (`nvm-converge-select`, `nvm-converge-stream-timeout`,
`validation-completeness`, `api-schemas`, `cast-alignment`, `story-bench`,
`llm-seam-wiring`, `pure-core-boundary`) passes unmodified — in particular
`nvm-converge-select.test.ts`'s `tensionTarget: 999999` fixture, which the
naive 0–100 bound this lane's brief suggested would have broken. `tsc
--noEmit` and `check-no-console` are both clean. `npm test` and
`npm run brain` were explicitly out of scope for this lane and were not run.

**Related:** [[Audit - 2026-09-19 Converge Stream Close]],
[[Audit - 2026-09-19 Revise Deadline]], [[Patterns]],
`docs/audits/2026-09-19-converge-contract/README.md`.

## Sources

- `docs/audits/2026-09-19-converge-contract/README.md`
- `server/lib/validation.ts`
- `server/nvm/converge/loop.ts`
- `server/routes/nvm/converge.ts`
- `tests/routes/nvm-converge-validation.test.ts`
- `tests/core/converge-loop-contract.test.ts`
- `SESSION_REPORT_2026-09-19.md`
