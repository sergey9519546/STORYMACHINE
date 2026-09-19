# Audit — 2026-09-19 generator-honesty

**Lane:** `generator-honesty`, worktree branch `lane/generator-honesty` off
`53f6e377` (`claude/fable-5-1-orchestrator-yil0xr`). One of six parallel
lanes the 2026-09-19 orchestrator session queued from its own findings
(`SESSION_REPORT_2026-09-19.md` §4, rows 9 and 14). Scope: three small
correctness fixes in the LLM candidate generator's parse layer,
`server/nvm/generate/llm-generator.ts`. No other file on the scoring path
(`server/nvm/analyze/**`, `server/nvm/revision/**`,
`server/nvm/ops/dispatcher.ts`) was touched.

## The three defects

### (a) `parseOp` accepted an id-less `UPDATE_BELIEF`; the dispatcher then collapsed distinct beliefs to one

`parseOp`'s `UPDATE_BELIEF` branch (pre-fix, `llm-generator.ts:73-78`)
checked only `belief.proposition` (non-empty string) and `charId` — every
other field of `Belief` (`id`, `confidence`, `source`, `source_event_id`,
`acquired_at`) was cast through unchecked, even though `IR_SCHEMA`'s
`BELIEF` node (same file, `:240-251`) already *declared* all six as
`required`. The schema was advisory; nothing enforced it.

`server/nvm/ops/dispatcher.ts:34-39` (untouched by this lane) upserts a
character's beliefs by identity:

```ts
const next = existing.some(b => b.id === op.belief.id)
  ? existing.map(b => (b.id === op.belief.id ? op.belief : b))
  : [...existing, op.belief];
```

With `id === undefined` on every id-less belief, a character's **second**
id-less `UPDATE_BELIEF` matches the first on `undefined === undefined` and
**replaces** it instead of adding a second belief. Two distinct
model-authored beliefs for one character collapse to one; the lost belief
is lost dialogue/plot content in whatever prose the pipeline renders from
it. Verified live with the probe below (identical to `p2.ts` in the
session-report investigation, re-run here against the pre-fix file).

`confidence` cast through unchecked also meant a model that returned
`confidence: "high"` (a string) reached committed state as a string, which
would NaN out of any arithmetic that treats it as a number.

**Fix.** `UPDATE_BELIEF` now validates every field, mirroring the
`APPRAISE_EMOTION` branch's existing per-field discipline (that branch's
own header comment documents being fixed for exactly this class of defect
on 2026-09-18; `UPDATE_BELIEF`, `SHIFT_RELATIONSHIP.delta` and
`UPDATE_READER_STATE.delta` were the three left behind):

- `proposition`: non-empty string, else reject the op.
- `id`: non-empty string if present; **if absent, synthesized** as
  `` belief_${sha256(charId + '|' + proposition).slice(0,8)} `` — see "The
  id-synthesis decision" below.
- `confidence`: finite number in `[0,1]`; else defaults to `0.5` and logs
  `llm_belief_confidence_defaulted` via `logger.debug` (structured, no
  `console.*`).
- `source`: one of `'witnessed' | 'told' | 'inferred'`; else `'inferred'`.
- `source_event_id`: non-empty string if present; else `` llm_${id} ``
  (mirrors `scripts/story-bench.mjs`'s `castGroundingOps`, which already
  synthesizes `` ${premise.id}-seed-${i} `` / `` ${premise.id}-open `` for
  the same reason — a non-empty, traceable id rather than an empty
  string, since `server/nvm/room/critics/character-advocate.ts:82` reads
  a *witnessed* belief with no `source_event_id` as an objection-worthy
  gap).
- `acquired_at`: finite number if present; else `0` (same default
  `castGroundingOps` and `server/nvm/converge/operators.ts:268,283` use).

`SHIFT_RELATIONSHIP.delta` now validates `dimension` (string),
`amount` (finite number, bounded to `-1..1` per `RelationshipDelta`'s own
comment in `server/nvm/ops/StoryOp.ts:33`), and `reason` (string) — a bad
delta rejects **that op only**, not the candidate's other ops.

`UPDATE_READER_STATE.delta` validates `suspense`/`curiosity`/`investment`
(number when present) and `knownFact` (string when present) — **but an
empty `{}` delta is still accepted**, because every `ReaderStateDelta`
field is genuinely optional in `server/nvm/ops/StoryOp.ts:56-61`, and
`IR_SCHEMA`'s `READER_STATE_DELTA` node declares no `required` list at
all. `tests/core/llm-generator-schema.test.ts`'s "accepts the SMALLEST
payload every branch permits" check synthesizes exactly `{}` for this
branch from that declaration and asserts `parseOp` must accept it — so
`UPDATE_READER_STATE` is deliberately the *less* strict sibling of
`SHIFT_RELATIONSHIP` here, not an oversight.

#### The id-synthesis decision

The brief allowed either rejecting an id-less belief or synthesizing an
id. **Synthesizing was chosen**, for one reason stated in the code
comment at the fix site: *rejecting re-creates the failure mode this fix
exists to close.* `parseIR` falls back to `stubIR()` — a candidate with
zero real ops, i.e. the "model could not write a scene" failure the
2026-09-13 story-bench lane spent its whole investigation on — whenever
`ops.length === 0` after filtering. A model that writes a good belief but
forgets to name it is common (the schema does not *require* `id` be
model-supplied meaningfully — only that it be present in the strict
sense), and rejecting that op is strictly worse than accepting it with a
deterministic id: it can turn one missing string field into a fully
stubbed candidate.

The hash is **deterministic in `(charId, proposition)`**, not random, so
the same proposition repeated for the same character resolves to the
same id and upserts onto its own prior belief (the dispatcher's own
intended behavior for a belief that gets reinforced or restated) instead
of silently duplicating under two different random ids. This is the one
thing an id-less payload can still promise about itself — identity by
content — and the fix preserves it rather than discarding it for
randomness.

### (b) A stub could not be told apart from a model-authored candidate; the model label was hard-coded

`stubIR()` (`:13-33`) and a real parsed candidate (`parseIR`, pre-fix
`:169`) both stamped `provenance.origin: 'model_generated'`. Every proof
and route that reads `origin` (`server/nvm/proof/tier1/provenance.ts`'s
`ProvenanceProof`, and ~15 call sites across `server/routes/nvm/**` and
`server/nvm/**` that stamp `'model_generated'`) treats that value as "not
user-authored" — which a stub also is, correctly — so widening
`ProvenanceOrigin` (`server/nvm/ir/NarrativeTransitionIR.ts:13-14`) to add
a distinct `'stub'` value would mean re-auditing every one of those call
sites for a distinction none of them currently need, for no behavioral
gain (a stub SHOULD still pass `ProvenanceProof` — it is attributable,
just not model-authored content).

`provenance.model` was already the field that told a stub apart from a
real candidate (`stubIR` sets the literal `'stub'`;
`scripts/story-bench.mjs` and
`tests/core/openai-compat-generation-guards.test.ts` already both
independently re-derived `provenance.model === 'stub'` / `!== 'stub'`
checks before this lane) — the defect was that this distinction had no
single owner, and that a parsed (real) candidate's `model` was hard-coded
to the literal string `'gemini'` regardless of which provider actually
answered, so an openai-compat deployment's model-authored candidates were
mislabeled with a provider that never ran.

**Fix.** Per the brief's documented fallback: `origin` is left alone
(`'model_generated'` for both, unchanged — no scoring-path or proof-layer
file touched), and a new exported `isStubIR(ir): boolean` in
`llm-generator.ts` (`return ir.provenance.model === 'stub'`) is now the
one place that makes the distinction. `scripts/story-bench.mjs:680` and
both `provenance.model` assertions in
`tests/core/openai-compat-generation-guards.test.ts` (:426, :444) were
grepped for and routed through it. `parseIR` gained a `model: string`
parameter; `makeLLMCandidateGenerator` passes its already-resolved
`candidateModel` (`ai.modelForTask('CANDIDATE')`, which reads
`AI_TASK_TIER_CANDIDATE` / `AI_FAST_MODEL` / `GEMINI_FAST_MODEL` — the
task runs on the `'fast'` tier — and falls back to `'gemini-2.5-flash'`),
i.e. the literal model string the call was actually made with, instead of
a hard-coded constant.

### (c) A single malformed `causalLinks` element stubbed every candidate requested for the scene

Pre-fix (`:170-173`):

```ts
causalLinks: Array.isArray(obj['causalLinks'])
  ? (obj['causalLinks'] as Array<{ opIdx: number; causedBy: string[] }>)
      .filter(link => typeof link.opIdx === 'number' && ...)
  : undefined,
```

`typeof link.opIdx` reads `.opIdx` off `link` with no check that `link`
is itself an object first. One `null` element in the array (a model
emitting a link to something it could not resolve, or any lossy
round-trip) threw `TypeError: Cannot read properties of null (reading
'opIdx')` **out of `parseIR`**, which propagated to
`makeLLMCandidateGenerator`'s outer `catch`
(`llm-generator.ts`, the `llm_generator_failed` warn path) — that catch
stubs **all `n` candidates requested for the scene**, not just the one
candidate whose `causalLinks` array had the bad element.

**Fix.** Per-element guard —
`link !== null && typeof link === 'object' && Number.isInteger(link.opIdx) && link.opIdx >= 0 && link.opIdx < ops.length`
— drops a malformed element instead of throwing, matching every other
per-element validation already in this file (e.g. the `ops` array itself
is filtered element-by-element with `parseOp` returning `null` for a bad
one, never throwing past the array boundary).

## Fail-first evidence

Ran with `git stash push -- server/nvm/generate/llm-generator.ts` (source
reverted to `53f6e377`'s content), a scratch probe script, then
`git stash pop` to restore. Full transcript:

```
$ git stash push -- server/nvm/generate/llm-generator.ts
$ node --experimental-strip-types /tmp/failfirst-probe.mjs
a1: beliefs count = 1 (expected 2)
a1: op1.belief.id = undefined op2.belief.id = undefined (expected distinct, non-undefined)
a3: confidence = high (expected 0.5, pre-fix is NaN-prone string "high")
a4: delta={} parseOp result = {"op":"SHIFT_RELATIONSHIP","pair":["ILKA","DESMOND"],"delta":{}} (expected null, pre-fix accepts it)
$ git stash pop
```

The probe imported `parseOp` (exported in both the pre-fix and fixed
file) plus `applyStoryOps`/`emptyState` and ran, against the **unfixed**
source:

- **(a1)** two id-less `UPDATE_BELIEF`s for `ILKA` with different
  propositions, applied through the real dispatcher: **1** belief
  survives (expected 2 once fixed) — the exact collapse the defect
  description names, reproduced live.
- **(a3)** `confidence: "high"` passed through unchanged as the string
  `"high"` (not defaulted, not rejected) — the NaN-propagation risk.
- **(a4)** `SHIFT_RELATIONSHIP` with `delta: {}` was **accepted** by the
  pre-fix `parseOp` (only `isObj` was checked) — should be rejected.

Separately, running the full new test file
(`tests/core/llm-generator-parse.test.ts`) against the pre-fix source via
`git stash` failed **the whole file** at module load, with:

```
SyntaxError: The requested module '../../server/nvm/generate/llm-generator.ts'
does not provide an export named 'isStubIR'
```

— itself valid fail-first evidence for defect (b): `isStubIR` does not
exist pre-fix, so every test that imports it (all 16 in the new file)
fails to even run. Restoring the fix (`git stash pop`) made all 16 pass.

## Tests

`tests/core/llm-generator-parse.test.ts` (new), 16 cases across four
`describe` blocks:

- UPDATE_BELIEF: distinct synthesized ids for distinct propositions +
  the real dispatcher probe (a1); same proposition twice synthesizes the
  same id and upserts, not duplicates (a2); non-numeric `confidence`
  defaults to `0.5` (a3); out-of-range `confidence` (`2.5`) also
  defaults; unrecognised `source` falls back to `'inferred'`; still
  rejects a belief with no proposition / no charId / whitespace-only
  proposition.
- SHIFT_RELATIONSHIP / UPDATE_READER_STATE: `delta: {}` rejected for
  SHIFT_RELATIONSHIP but accepted for UPDATE_READER_STATE per their
  different optionality (a4); `delta` as a string rejected;
  out-of-range `amount` rejected; a bad SHIFT_RELATIONSHIP does not
  affect a sibling op's own `parseOp` call; UPDATE_READER_STATE rejects
  a present field of the wrong type.
- Stub identifiability: `isStubIR` false for a real parsed candidate,
  true for the keyless/failure fallback (b1); a parsed candidate carries
  the resolved `AI_FAST_MODEL`-backed model string, not `'gemini'` (b2).
- causalLinks: a `[null, {opIdx:0,...}]` array parses to one candidate
  with one surviving link, ops intact, not stubbed (c1).

Also updated (both pre-existing, both still green): `scripts/story-bench.mjs`
(the `fromModel` line at what is now `:687`, routed through `isStubIR`)
and `tests/core/openai-compat-generation-guards.test.ts` (both
`provenance.model` assertions routed through `isStubIR`).

## Gates run (all from the worktree, `lane/generator-honesty`)

| Gate | Result |
|---|---|
| `tests/core/llm-generator-parse.test.ts` (new) | 16/16 pass |
| `tests/core/llm-generator-schema.test.ts` | 17/17 pass |
| `tests/nvm/converge/cast-alignment.test.ts` | 19/19 pass |
| `tests/scripts/story-bench.test.ts` | 38/38 pass |
| `tests/routes/nvm-converge-select.test.ts` | 9/9 pass |
| `tests/core/llm-seam-wiring.test.ts` | 7/7 pass |
| `tests/core/pure-core-boundary.test.ts` | 6/6 pass |
| `tests/core/openai-compat-generation-guards.test.ts` (updated, extra check) | 22/22 pass |
| `npm run lint` (`tsc --noEmit`) | exit 0, no errors |
| `npm run check-no-console` | exit 0 — "310 file(s) under server/ checked ... all proven unreachable" (unchanged) |
| `node scripts/check-scoring-receipt.mjs 53f6e377..HEAD` | exit 0 — "no scoring-path files changed. OK." |
| `node --experimental-strip-types tests/core/brain-coverage.test.ts` | 7/8 pass — (e) "brain.graph.json and GRAPH.md are fresh" fails, expected: this lane adds a brain note but does not run `npm run brain` per its brief (the orchestrator regenerates the graph once after merging all six lanes); every content check ((a)-(d), (f), (g)) passes |

## What is NOT done / left to the orchestrator

- `npm run brain` was deliberately not run (per this lane's brief), so
  `docs/brain/brain.graph.json` / `GRAPH.md` do not yet include this
  lane's new note or audit directory — test (e) above will fail until
  the orchestrator regenerates after merging all six lanes.
- `npm test` (the full suite) was deliberately not run, per this lane's
  brief; only the gates listed above were run.
- No scoring-path file was touched, so no `MEASUREMENT_RECEIPTS.md`
  entry is needed and `check-scoring-receipt.mjs` confirms it.
- Not pushed (`lane/generator-honesty` is local only, per instructions).

## Sources

- `server/nvm/generate/llm-generator.ts`
- `server/nvm/ops/dispatcher.ts` (read, not modified — the collapse site)
- `server/nvm/ir/NarrativeTransitionIR.ts` (read — `ProvenanceOrigin`)
- `server/nvm/proof/tier1/provenance.ts` (read — `ProvenanceProof`)
- `server/engine/ai.ts` (read — `modelForTask`, `getGenerativeProvider`)
- `scripts/story-bench.mjs`
- `tests/core/llm-generator-parse.test.ts`
- `tests/core/llm-generator-schema.test.ts`
- `tests/core/openai-compat-generation-guards.test.ts`
- `SESSION_REPORT_2026-09-19.md` §4, rows 9 and 14
