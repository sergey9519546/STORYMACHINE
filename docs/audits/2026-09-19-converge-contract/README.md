# Lane record — converge contract (2026-09-19)

**Branch:** `lane/converge-contract`, HEAD `53f6e377` at lane start.
**Scope:** SESSION_REPORT_2026-09-19.md §4 row 13 / logic audit findings C11
and C12 — `POST /api/nvm/converge`'s (and its siblings' — `converge-arc`,
`converge-stream`) input validation, and `convergeScene()`'s result shape
when nothing passes Tier 1. Not touched: `converge.ts`'s timeout branches
(fixed by the immediately preceding `converge-stream-close` lane),
`cast-alignment.ts`, `server/nvm/analyze/**`.

---

## 1. C12 — `SceneTarget` and budget were unvalidated

`server/lib/validation.ts`'s `ConvergeBodySchema` used to be:

```ts
target: z.object({ sceneIdx: z.number() }).passthrough(),
budget: z.object({
  maxIterations: z.number().optional(),
  candidatesPerIteration: z.number().optional(),
}).passthrough().optional(),
```

Everything `convergeScene()` (`server/nvm/converge/loop.ts`) treats as a
typed `SceneTarget` — `sceneFunction`, `activeMechanisms`, `tensionTarget`,
`qualityTarget`, `necessity`, `themeHint` — arrived unvalidated:

- a string `tensionTarget` made `valuationScore >= target.tensionTarget`
  (`loop.ts`'s `tensionMet` check) a comparison that can never behave as the
  caller expects, silently defeating the tension gate;
- `activeMechanisms`/`themeHint` flowed into the generation prompt with no
  bound on size or item count (they are sanitized at the prompt-building
  site, but nothing here bounded them before that);
- `budget.maxIterations` accepted `-1` (or `0`), and `for (let iter = 0; iter
  < budget.maxIterations; iter++)` with a negative/zero bound runs zero
  iterations — landing directly in C11's synthesized-empty-IR path (§2).

### Fix

`SceneTargetSchema` (new, `server/lib/validation.ts`) types every field:

- `sceneIdx`: `int().min(0)`
- `sceneFunction`: `z.enum(SCENE_FUNCTIONS)` — the exact six values
  `server/nvm/ir/NarrativeTransitionIR.ts` declares and
  `server/nvm/generate/llm-generator.ts`'s `IR_SCHEMA` enumerates for the LLM
  response schema itself; `SCENE_FUNCTIONS` is exported once and reused by
  both the schema and `converge-stream`'s query parsing (§3) so there is one
  list, not two that can drift.
- `activeMechanisms`: `z.array(noControlChars.max(64)).max(24)`
- `tensionTarget`: `z.number().finite().min(0).max(1_000_000)` — deliberately
  NOT capped at 100. `deriveTensionLedger`'s `totalTension` is an unbounded
  sum across open narrative positions, not a 0–100 score, and
  `tests/routes/nvm-converge-select.test.ts` (an existing, unmodified GATE
  test) deliberately sends `tensionTarget: 999999` as an "unreachable
  ceiling" fixture to exercise the budget-exhausted path. A 0–100 cap — the
  number in this lane's brief — would 400 that fixture; verified live (a
  0–100 max makes that gate fail) before choosing the wider bound.
  `.finite()` still rejects `Infinity`/`NaN`.
- `qualityTarget`: `z.number().min(0).max(100).optional()` (this one really
  is a 0–100 score — `runQualityEngine()`'s `QualityReport.score`).
- `themeHint`: `noControlChars.max(300).optional()`
- `necessity`: reuses the pre-existing `NecessityCertificateSchema`
  (`validation.ts`, already used by `OutlineBeatSchema` — one schema for the
  one `NecessityCertificate` shape, not a second copy).

`.passthrough()` is dropped: neither client that builds a converge request
body — `scripts/story-bench.mjs`'s `beatsToSceneTargets()` and
`src/components/ArcPlannerPanel.tsx`'s `compile()` — sends any field beyond
the ones now typed (grepped both; verified `ConvergePanel.tsx` calls
`converge-stream`, not this JSON route, so it never built this body shape at
all).

`ConvergeBudgetSchema` (new, shared by `ConvergeBodySchema` and
`ConvergeArcBodySchema`):

```ts
maxIterations: z.number().int().min(1).max(10).optional(),
candidatesPerIteration: z.number().int().min(1).max(5).optional(),
maxLLMCalls: z.number().int().min(1).optional(),
```

The 10/5 upper bounds match what `server/routes/nvm/converge.ts` was already
*trying* to enforce at the route level (`Math.min(Number(rawBudget.
maxIterations ?? 4), 10)`) — but that call had no `Math.max`, so a negative
value passed straight through unclamped. That route-level `Math.min` is left
in place (now redundant but harmless — its input is already validated) since
removing it is not needed to fix the defect and touching it risks the
route's other budget-construction logic for no gain.

`ConvergeArcBodySchema.scenes` changes from `z.array(z.unknown()).min(1).
max(8)` to `z.array(SceneTargetSchema).min(1).max(8)` — the route's own
comment already documents `scenes[]` as sharing `SceneTarget`'s shape with
the single-scene route; the array item type just said `unknown`. `seed` and
`budget` fields (both read by the route via `req.body?.seed`/`req.body?.
budget` but previously absent from the schema entirely) are added.

## 2. C11 — `convergeScene()`'s result described two different IRs

`server/nvm/converge/loop.ts`'s budget-exhausted return path (no candidate
converged within the iteration budget):

```ts
let finalIR = best ?? (lastCandidates.length > 0 ? lastCandidates[lastCandidates.length - 1] : null);
...
return {
  ir: finalIR,
  finalValuation: finalLedger.totalTension,   // computed FROM finalIR
  finalQuality: finalQReport.score,           // computed FROM finalIR
  finalComposite: safeBestComposite,          // was bestComposite (from `best`) — 0 when best is null
  winner: (bestCandidateId && best) ? {...} : null,
};
```

Whenever nothing ever passed Tier 1, `best` stays `null`, so `finalIR` falls
back to the last-evaluated (rejected) candidate or a synthesized
pass-through IR — but `finalComposite` was still `bestComposite`, which
never got set (stays `-Infinity`, floored to `0`). `finalValuation`/
`finalQuality` described `finalIR`; `finalComposite` described a candidate
(`best`) that, in this exact branch, does not exist. Three fields
purporting to summarize one result described two different IRs.

Separately, the last-resort fallback:

```ts
if (!finalIR && llmCallCount <= llmCallLimit) {
  llmCallCount++;
  const fallback = await generate(buildGenerationSpec(state, target), 1);
  ...
}
```

used `<=`, so it could fire — spending one more `generate()` call — even
after `llmCallCount` had already reached `llmCallLimit` inside the main
loop, i.e. an effective limit of `maxLLMCalls + 1`. And the synthesized
last-resort IR (built when even that fallback call produces nothing)
carried `provenance: { origin: 'model_generated', createdAt: Date.now() }`
— no `model` field, so nothing distinguished it from real model output,
unlike `server/nvm/generate/llm-generator.ts`'s `stubIR()`, which already
tags its stub candidates `model: 'stub'` and is read that way elsewhere
(`llm-generator.ts`'s own `stubbedFromLLM` count,
`tests/core/openai-compat-generation-guards.test.ts`).

### Fix

- Added `tier1Passed: boolean` to `ConvergeResult` — `true` on the converged
  early-return (only reachable via `convergedThisIter`, which requires a
  Tier-1 pass), `bestCandidateId !== null` on the budget-exhausted path
  (equivalent to `winner !== null`, kept as its own field so a caller
  reading `ir` for diagnostics — always populated, winner or not — has an
  explicit flag rather than re-deriving it from `winner === null`). Threaded
  through into the route JSON responses (`POST /api/nvm/converge`,
  `GET /api/nvm/converge-stream`'s `converge_complete` event, and
  `POST /api/nvm/converge-arc`'s per-scene `sceneResults[]`) alongside the
  pre-existing fields, additively — no field removed or renamed.
- `finalComposite`/`finalValuation`/`finalQuality` on the budget-exhausted
  path are now ALL recomputed from `finalIR` using the loop's own composite
  formula (`0.6 * normalizeTension(tension, target.tensionTarget) + 0.4 *
  qualityScore`), replacing the `bestComposite`/`safeBestComposite` value
  entirely for this field. `winner`'s own `composite` field is unaffected
  (still `safeBestComposite`, describing `best` — correct there, since
  `winner` is explicitly `best`, never `finalIR`, when the two diverge).
- The off-by-one: `llmCallCount <= llmCallLimit` → `llmCallCount <
  llmCallLimit`.
- The synthesized last-resort IR's provenance gains `model: 'stub'`,
  matching `stubIR()`'s convention exactly (grepped for
  `provenance.model === 'stub'` / `model: 'stub'` across `server/` and
  `tests/` — one convention, now honored at both synthesis sites).

`scripts/story-bench.mjs`'s own comment at its converge call site (`runOnePremise()`)
already documents reading `result?.ir` and `result?.finalComposite` even
when `winner` is `null`, for exactly this reason — this fix makes that
already-relied-upon behavior actually honest instead of accidentally
plausible.

## 3. `converge-stream`'s unchecked `sceneFunction` cast

`GET /api/nvm/converge-stream` has no `validate()` middleware (its request
shape is query params, parsed and clamped by hand). `tensionTarget`/
`qualityTarget`/`maxIterations`/`candidatesPerIteration` were already
`Math.max`/`Math.min`-clamped; `sceneFunction` was not — `(q['sceneFunction']
?? 'build_tension') as SceneTarget['sceneFunction']`, an unchecked cast, so
any query string flowed straight into the generation prompt and the
resulting IR's `sceneFunction` field as if it were one of the six declared
values. Fixed by checking the raw value against the same `SCENE_FUNCTIONS`
list `SceneTargetSchema` uses, falling back to `'build_tension'` (the same
default the unchecked cast used when the param was absent) for anything
invalid — no 400 here, matching this endpoint's existing pattern of clamping
malformed query input rather than rejecting it. The route's timeout
branches (both `converge-stream`'s and the other two routes') were not
touched.

## 4. Tests

- `tests/routes/nvm-converge-validation.test.ts` (new): string
  `tensionTarget` → 400 naming the field; `maxIterations: -1` → 400;
  `maxIterations: 0` → 400; a `beatsToSceneTargets()`-shaped bench request →
  200 unchanged, response carries `tier1Passed`; an out-of-enum
  `sceneFunction` → 400; the existing 999999 fixture still validates;
  `converge-stream` with an injected `sceneFunction` query value still
  completes (falls back rather than propagating the raw string).
- `tests/core/converge-loop-contract.test.ts` (new): drives `convergeScene()`
  directly (no server, no LLM key — same convention as
  `tests/nvm/generate/craft-convergence.test.ts`) with fake
  `CandidateGenerator`s. (5) every candidate fails Tier 1 (CausalProof, the
  same fixture `nvm-converge-select.test.ts` uses) →
  `tier1Passed === false`, `winner === null`, `finalComposite` equals the
  composite recomputed for `result.ir` and is not `0`. (6) a generator that
  returns no candidates, with `maxIterations * candidatesPerIteration ===
  maxLLMCalls === 3` (so the main loop alone exactly exhausts the declared
  budget) — measured **4** `generate()` calls before the fix, **3** after.
  (7) the synthesized last-resort IR (`maxLLMCalls: 0`, no candidate ever
  produced) carries `provenance.model === 'stub'`.

All three fail-first: verified live by `git stash push` on the fix
files, re-running (5/7 route-validation subtests fail; 3/3 loop-contract
tests fail — the exact assertions the fix addresses), then `git stash pop`
and re-running green.

## 5. Gates

| gate | result |
|---|---|
| `tests/routes/nvm-converge-validation.test.ts` (new) | 7/7 pass |
| `tests/core/converge-loop-contract.test.ts` (new) | 3/3 pass |
| `tests/routes/nvm-converge-select.test.ts` | 9/9 pass, unmodified |
| `tests/routes/nvm-converge-stream-timeout.test.ts` | 1/1 pass, unmodified |
| `tests/routes/validation-completeness.test.ts` | 58/58 pass |
| `tests/core/api-schemas.test.ts` | 6/6 pass |
| `tests/nvm/converge/cast-alignment.test.ts` | 19/19 pass, unmodified |
| `tests/scripts/story-bench.test.ts` | 38/38 pass, unmodified |
| `tests/core/llm-seam-wiring.test.ts` | 7/7 pass |
| `tests/core/pure-core-boundary.test.ts` | 6/6 pass |
| `npm run lint` (`tsc --noEmit`) | clean |
| `npm run check-no-console` | OK (310 files, 23 quarantine entries, unchanged) |
| `node scripts/check-scoring-receipt.mjs 53f6e377..HEAD` | "no scoring-path files changed" |
| `node --experimental-strip-types tests/core/brain-coverage.test.ts` | pass (this README + brain note added) |

Full `npm test` and `npm run brain` were explicitly out of scope for this
lane and were not run.

## 6. What was not done

- `converge-stream`'s query params other than `sceneFunction` were already
  clamped before this lane and are unchanged.
- No zod `validate()` middleware was added to `GET /api/nvm/converge-stream`
  itself — its existing hand-rolled clamp-and-fall-back pattern was kept
  (consistent with every other clamped param on that route) rather than
  converting the whole route to schema validation, which was out of this
  lane's scope and would touch code adjacent to the just-fixed timeout
  branches.
- `SelfplayBodySchema` (`server/lib/validation.ts`) has the same
  unbounded-`budget` shape C12 fixed on `ConvergeBodySchema`/
  `ConvergeArcBodySchema`, but `server/routes/nvm/selfplay.ts` already
  clamps `maxIterations`/`candidatesPerIteration` with both `Math.min` AND
  `Math.max` at the route level (unlike `converge.ts`'s pre-fix
  `Math.min`-only clamp), so it is not vulnerable to the same
  negative-value defect. Left untouched — out of this lane's named scope
  (only `converge`/`converge-arc`/`converge-stream` were named) and a
  separate, lower-severity finding if it is ever worth its own lane.
