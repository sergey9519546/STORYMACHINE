---
type: audit
updated: 2026-09-19
sources: [docs/audits/2026-09-19-cast-grounding/README.md, server/nvm/proof/tier1/intentional.ts, server/nvm/proof/kernel.ts, server/nvm/generate/proof-spec.ts, server/nvm/converge/loop.ts, server/nvm/converge/cast-alignment.ts, server/lib/validation.ts, scripts/story-bench.mjs, tests/nvm/proof/intentional-cast.test.ts, SESSION_REPORT_2026-09-19.md]
status: active
---

# Audit — 2026-09-19 Cast Grounding

**Directory:** `docs/audits/2026-09-19-cast-grounding/` — the lane record for
SESSION_REPORT_2026-09-19.md §4 row 10, on `lane/cast-grounding` from
`1e7779de`.

## What it answers

`IntentionalProof` (`server/nvm/proof/tier1/intentional.ts`) grounded a
candidate partly against that same candidate: `knownCharacters(ir, state)`
was state's characters PLUS every `charId` of an `UPDATE_BELIEF` in the IR
under judgment. Measured against the `1e7779de` baseline committed as
`tests/nvm/proof/fixtures/intentional-equivalence-baseline.json`, that
inverted the proof — an IR that invents "Char1" and emits its belief PASSED
against an empty state, while an IR referencing the real cast (MAYA, DEV)
was BLOCKED. The story bench's 17 Tier-1 blocks are the second case:
`scripts/story-bench.mjs` seeds the premise's cast with `UPDATE_BELIEF` ops
only at COMMIT of scene 0, so during convergence of scene 0 the state knows
nobody. `proofsToConstraints` then turned each block into "Introduce
character X with an UPDATE_BELIEF op", teaching the generator the
self-grounding trick.

**Fix.** `SceneTarget.cast?: string[]` — the ids the caller says exist —
validated in `SceneTargetSchema` on `activeMechanisms`'s convention plus a
single-line refinement. `knownCharacters`/`intentionalProof`/`runTier1` take
an optional `IntentionalGroundingOptions { cast?, allowIntroduce? }`: omitted,
the behaviour is byte-identical to `1e7779de` and no existing caller changes;
supplied, the set is state ∪ cast and the IR grounds nothing by itself.
`loop.ts` passes one such object to `runTier1` at both call sites and to
`alignCandidateCast`'s option set, so alignment offers what the proof
accepts — including at scene 0, where it previously skipped with
`nothing_to_align`. Under a cast, an `IntentionalProof` block emits a
`free_form` "act through one of the cast" constraint instead of
`must_introduce_character` (no new `kind`: the union is switched on in one
place), and `buildSystemPreamble` states one labelled CAST line, sanitized
with `sanitizeSingleLine` and capped at an element boundary.

**`allowIntroduce`, honestly.** Kept, so the G9 "proof failures become spec"
inversion has a legal path for names the loop itself asked for, and pinned in
three directions by the new test. But with a cast supplied no constraint
source emits `must_introduce_character`, so the loop's derivation of that list
is empty on every iteration today — wired from the spec rather than hardcoded
to `[]` only so the allowance and the instruction stay one fact.

**Bench comparability.** `beatsToSceneTargets` now sends the premise's cast.
Runs before and after this commit measure different things (an invented name
is now a block; a cast member referenced before its belief is not), and there
is no committed bench baseline to re-lock.

## Why it is safe to have merged

Fail-first, verified live: the new test file run against the stashed
pre-change tree is 10 pass / 13 fail, and 23 / 0 after — with case (e), the
`runTier1`-with-no-opts equivalence against the `1e7779de` baseline, passing
on BOTH trees, as an equivalence pin must. `tests/core/converge-loop-contract.test.ts`
(8)-(9) carry the same before/after through `convergeScene` with a fake
generator: `tier1Passed` true without a cast, false with one, attributed to
`IntentionalProof` alone. Nothing on the scoring path changed —
`node scripts/check-scoring-receipt.mjs 1e7779de..HEAD` reports "no
scoring-path files changed", so no measurement receipt is written. Every
named gate passes unmodified, including all 15 `tests/passes/*.test.ts`
(6,477 assertions) and `tests/core/core-01.test.ts`'s existing
`must_introduce_character` assertion, which pins the no-cast path. `tsc
--noEmit` and `check-no-console` are clean. `npm test` and `npm run brain`
were out of scope for this lane and were not run.

**Related:** [[Audit - 2026-09-19 TypeSafe Cast Alignment]],
[[Audit - 2026-09-19 Converge Contract]],
[[Audit - 2026-09-19 Generation Prompt Inputs]], [[Patterns]],
`docs/audits/2026-09-19-cast-grounding/README.md`.

## Sources

- `docs/audits/2026-09-19-cast-grounding/README.md`
- `server/nvm/proof/tier1/intentional.ts`
- `server/nvm/proof/kernel.ts`
- `server/nvm/generate/proof-spec.ts`
- `server/nvm/converge/loop.ts`
- `server/nvm/converge/cast-alignment.ts`
- `server/lib/validation.ts`
- `scripts/story-bench.mjs`
- `tests/nvm/proof/intentional-cast.test.ts`
- `SESSION_REPORT_2026-09-19.md`
