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

**Verdict counts** (matched-pair is PRIMARY — a paired design; all-pairs was
the friendlier of the two in 7 of 8 cells, so both are floored). N = 32,
seeded 2000-resample bootstrap, seed 42:

* `SHUFFLE_DROP` (the AUC-24 recipe, scene count changes) — **0.5313**
  [0.3750, 0.6875] matched-pair, 0.5586 [0.4219, 0.6973] all-pairs, 17/15/0.
* `CLIMAX_RELOCATE` (scene count preserved) — **0.4219** [0.2813, 0.5625],
  0.4673 [0.4014, 0.5264], 8/13/**11 ties** (10 scripts pinned at health 76.0
  on the density cap, so a third of that N cannot move).
* `DIALOGUE_FLATTEN` — a **POSITIVE CONTROL**, added round 2 after independent
  review: **1.0000** matched-pair, 0.9473 all-pairs, 32/0/0, +29.30 points, of
  which ~16.71 come from outside the density/scarcity formula. Both
  measurement channels read chance; without a manipulation the score
  demonstrably catches, a reader could not tell a blind score from a broken
  harness. It proves the instrument reads, never that the score is valid.

**All four measurement-channel intervals contain 0.5** and both mean health
gaps are negative — the damaged copy scores higher on average. The calibration
control, scored separately and excluded from every asserted number, orders 5 of
5 with a 25.32 gap. The pre-registered split is **reported, not used**: all six
floors were locked from all 32 scripts, holdout included.

**The prediction it refuted.** The scene-count-artifact argument predicted a
short-script shuffle-drop benchmark would look ~10× MORE separable, because
dropping 10 scenes to 7 adds 140/7 − 140/10 = 6.00 points of scarcity penalty
against 0.58 at the private corpus's median 118 scenes. Decomposed over all
32 scripts, scarcity does rise by a mean of +5.693 — and the density penalty
falls by 7.625 at the same time, because the drop removes a larger share of
weighted issues than of words and `density = weightedIssues/wordCount^0.7` is
convex. Net, degradation RAISES health by 1.93 points. The arithmetic was
right; the conclusion drawn from it was not.

**Branches.** Run unmerged, pinned to the SHAs measured. Shuffle-drop
matched-pair: `scoring/r5-verbosity-bias @ 52bf410a` **0.0938**,
`scoring/advice-rule-fixes @ a1cf7677` **0.4375**,
`scoring/stacked-r5-plus-advice @ 408166ae` **0.0938** — all three below the
0.5113 primary floor (and below 0.5386 on all-pairs), R5 inverting 29 of 32
scripts and moving 28 of 32 from `CONSIDER` to `PASS`. The **control holds on
all three** (1.0000 / 0.9844 / 1.0000), which is what licenses reading those as
the score inverting rather than the harness failing there. See
[[Measurement - BLIND_PAIRS_ON_BRANCHES_2026-09-04]] for the craft-side
reading of the same branches.

**A finding for the scoring lane, filed here so it does not live only in a
benchmark doc.** Under shuffle-drop the corpus keeps 72.5% of its words but
only 50.2% of its weighted issues, and the sub-density branch is a logistic
with steepness 50 around midpoint 0.52 (`doctor.ts:447-449`) — a near-step
function crossed by a density move of ~±0.05. `counter-offer` crosses it in one
step (density penalty 10.000 → 0.000, health +4.0) and `room-12` gains 36.5
points, both while a third of the script is deleted. Stated as a property of
the score: on 9–14-scene scripts the health formula pays a writer to delete a
third of their scenes. That is `doctor.ts`, it crosses [[Gate - Receipt Gate]],
and it belongs to the density-term work, not to this benchmark.

**What was NOT reproduced:** anything about the private corpus. No
`npm run measure-real` run happened, no AUC-24 value is claimed, and the
feature-scale deductions never fire at 9–14 scenes — this is a strictly
smaller engine than [[Gate - AUC-24 Ratchet]] measures, and whether the
branch findings transfer is exactly what the owner's corpus run decides.
Enforced by [[Gate - Public Benchmark]].

## Sources

- `docs/p1-benchmark/PUBLIC_BENCHMARK_2026-09-06.md`
