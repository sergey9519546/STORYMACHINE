---
type: measurement
updated: 2026-09-06
sources: [docs/p1-benchmark/PUBLIC_BENCHMARK_2026-09-06.md]
status: active
---

# Measurement — PUBLIC_BENCHMARK_2026-09-06

**Question:** can a discrimination number run in CI at all? Every existing
one could not — the AUC-24 ratchet is corpus-gated and skips, its committed
table is not locked yet and skips, and the only always-on signal was a
`knownFailing` craft result with no floor in the losing direction. This
document scores the 32 distributable screenplays already in the repository
(20 CC0 + 12 blind-pair fixtures) intact and under two degradations, on every
CI run, with no corpus and no owner step.

**Verdict counts:** `SHUFFLE_DROP` (the AUC-24 recipe, scene count changes)
AUC **0.5586**, 95% CI [0.4219, 0.6973]. `CLIMAX_RELOCATE` (scene count
preserved) AUC **0.4673**, 95% CI [0.4014, 0.5264]. N = 32, seeded
2000-resample bootstrap, seed 42. **Both intervals contain 0.5** and both
mean health gaps are negative — the damaged copy scores higher on average.
The calibration control, scored separately and excluded from every asserted
number, orders 5 of 5 with a 25.32 gap.

**The prediction it refuted.** The scene-count-artifact argument predicted a
short-script shuffle-drop benchmark would look ~10× MORE separable, because
dropping 10 scenes to 7 adds 140/7 − 140/10 = 6.00 points of scarcity penalty
against 0.58 at the private corpus's median 118 scenes. Decomposed over all
32 scripts, scarcity does rise by a mean of +5.693 — and the density penalty
falls by 7.625 at the same time, because the drop removes a larger share of
weighted issues than of words and `density = weightedIssues/wordCount^0.7` is
convex. Net, degradation RAISES health by 1.93 points. The arithmetic was
right; the conclusion drawn from it was not.

**Branches.** Run unmerged on the three pushed scoring branches:
`scoring/r5-verbosity-bias` shuffle-drop **0.1245**, `advice-rule-fixes`
**0.5298**, `stacked-r5-plus-advice` **0.1089** — all three below the 0.5386
floor, R5 moving 28 of 32 scripts from `CONSIDER` to `PASS`. See
[[Measurement - BLIND_PAIRS_ON_BRANCHES_2026-09-04]] for the craft-side
reading of the same branches.

**What was NOT reproduced:** anything about the private corpus. No
`npm run measure-real` run happened, no AUC-24 value is claimed, and the
feature-scale deductions never fire at 9–14 scenes — this is a strictly
smaller engine than [[Gate - AUC-24 Ratchet]] measures, and whether the
branch findings transfer is exactly what the owner's corpus run decides.
Enforced by [[Gate - Public Benchmark]].

## Sources

- `docs/p1-benchmark/PUBLIC_BENCHMARK_2026-09-06.md`
