---
type: audit
updated: 2026-09-19
sources: [docs/audits/2026-09-19-typesafe-cast-alignment/README.md, server/lib/ai-providers/typesafe.ts, server/nvm/converge/cast-alignment.ts, server/nvm/converge/loop.ts, server/nvm/proof/tier1/intentional.ts, tests/core/typesafe-adapter.test.ts, tests/nvm/converge/cast-alignment.test.ts, docs/story-generation/STORY_BENCH_2026-09-13.md, .env.example, README.md]
status: active
---

# Audit — 2026-09-19 TypeSafe Cast Alignment

**Directory:** `docs/audits/2026-09-19-typesafe-cast-alignment/` — the lane
record for the opt-in cast-alignment step added on
`claude/fable-5-1-orchestrator-yil0xr` from `5ec6a1db`.

## What it answers

The story bench's one finding about the MODEL rather than the plumbing: the
candidate generator invents `PROTAGONIST` / `Alex` / `Char1` instead of using
the supplied cast, and IntentionalProof blocks 17 of 29 scenes for it. The step
asks TypeSafe's System One API — which **selects from options the caller
supplies** and cannot write text — which cast member an invented name is, and
renames the `charId` only when a score ladder rounds to "clearly one of the
cast" AND a choice names a real cast member at confidence ≥ 0.6. Otherwise the
op is left alone and the proof blocks it exactly as today.

## Why it is safe to have merged

Off by default (`TYPESAFE_CAST_ALIGNMENT`), and off is a tested no-op: the same
object reference comes back, no transport call happens, and the converge
history has no `castAlignment` key at all. Nothing touches the scoring path —
`check-scoring-receipt` reports *no scoring-path files changed* — and
IntentionalProof's decision logic is unchanged; the only edit there is the
extraction of `knownCharacters()` so the proof and the alignment cannot drift
apart. No model verdict reaches a score (NORTH_STAR.md §1), which is what
[[Decision 3 - Demote Generative Surface to Labs]] put the whole generative
surface behind Labs to protect.

The standing lesson is a [[Patterns]] one this repository keeps re-learning:
**a fallback that looks like success is worse than a failure.** Every skip and
every failure carries a reason on `ConvergeStep.castAlignment`, present even
when `applied:false`, and the adapter throws rather than returning a default
answer.

**Related:** [[Generation - Story Bench]], [[Audit - 2026-09-13 CI Green]],
[[Patterns]], `docs/LANE_STANDARD.md`,
`docs/audits/2026-09-19-typesafe-cast-alignment/README.md`.

## Sources

- `docs/audits/2026-09-19-typesafe-cast-alignment/README.md`
- `server/lib/ai-providers/typesafe.ts`
- `server/nvm/converge/cast-alignment.ts`
- `server/nvm/converge/loop.ts`
- `server/nvm/proof/tier1/intentional.ts`
- `tests/core/typesafe-adapter.test.ts`
- `tests/nvm/converge/cast-alignment.test.ts`
- `docs/story-generation/STORY_BENCH_2026-09-13.md`
