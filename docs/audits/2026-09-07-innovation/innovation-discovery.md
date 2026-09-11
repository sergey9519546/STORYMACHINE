# Innovation discovery — what can advance P1/P3 without the private corpus (reconstructed)

*Read-only lane, 2026-09-06 (Opus). The full report (~30 KB: the distributable-
set inventory, the harness comparison, the invariance proof for
`actionSentenceCvOverall`, the wiring analysis) was lost in the 2026-09-07
sandbox rebuild. Its recommendation paragraph survives verbatim from the
session transcript and is what the batch was built from.*

## Recommendation (verbatim)

The repo already contains everything needed to run a **real degradation-AUC
benchmark in CI on distributable text** except three committed artifacts: a
split file over the distributable set, a manifest lock over it, and a floor
constant separate from `AUC24_FLOOR`. The recipe is pure and corpus-free
(`scripts/lib/auc.ts`), a second harness already defaults its corpus directory
to `data/screenplays` and carries seeded bootstrap CIs
(`scripts/lib/rebuild-experiment-lib.mjs:100,394`), and CI already runs the
gate reporter and the receipt checker. What does **not** exist is any test that
computes a discrimination statistic over the 32 distributable `.fountain` files
on every CI run — the only always-on discrimination signal today is a
`knownFailing` wrapper that records the doctor ordering **1 of 6** blind matched
pairs (`tests/core/blind-pairs-discrimination.test.ts:91-116`,
`docs/p1-benchmark/BLIND_PAIRS_ON_BRANCHES_2026-09-04.md`). Build the public
benchmark first (it needs no corpus, no owner, and crosses no receipt gate),
build it with a **scene-count-preserving degradation alongside the shuffle-drop
one** — because the doctor's measured discrimination is a scene-count artifact
(`doctor.ts:2092-2093`, mechanism at `doctor.ts:465-467`) and a short-script
shuffle-drop benchmark would inflate exactly that artifact by ~10x — and pair
it with a local `npm run verify-report` CLI, which is the one P3 gap left
(`/api/export/verify` and `#verify` both already ship). Defer wiring any
structural signal into health: `actionSentenceCvOverall`, the channel with the
cleanest blind-pair separation, is **provably invariant under the shuffle half
of the AUC-24 recipe**, so the wiring path written in
`docs/scoring/STRUCTURAL_SIGNALS_2026-09-04.md` §6 would measure it with an
instrument that cannot see it.

## What was built from it

The public benchmark (`npm run benchmark:public`, `tests/core/public-benchmark.test.ts`,
`docs/p1-benchmark/PUBLIC_BENCHMARK_2026-09-06.md`) with both degradations
and, after review, a positive control; `npm run verify-report`
(`scripts/verify-report.mjs`); and the structural-signal wiring deferred to a
`scoring/*` branch measured on the new instrument, where the order-sensitive
candidate `meanAbsDialogueShareDelta` measured a null (see
`scoring-lane-report.md`).
