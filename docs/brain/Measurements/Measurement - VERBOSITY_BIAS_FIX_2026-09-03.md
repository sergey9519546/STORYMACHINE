---
type: measurement
updated: 2026-09-06
sources: [docs/scoring/VERBOSITY_BIAS_FIX_2026-09-03.md, docs/p1-benchmark/MEASUREMENT_RECEIPTS.md]
status: pending-measurement
---

# Measurement — VERBOSITY_BIAS_FIX_2026-09-03

**Question:** the health score rewarded padding — appending stateless filler
to every scene of `evals/scoring/metamorphic/base.fountain` moved health
60.9 to 66.3, across the CONSIDER/PASS boundary
([[Measurement - VERBOSITY_BIAS_2026-07-11]], retrospective finding #1). Can
the density denominator stop reading a channel the writer can inflate?

**What changed:** `densityPenalty`'s denominator moved from `wordCount^0.7`
to `(sceneCount * 30)^0.7`, and the piecewise logistic-plus-power curve over
it collapsed to one continuous `8 * density^2`. Scenes are the one
opportunity unit a writer cannot inflate without adding structure; action
paragraphs are what the filler adds, and speeches are inflated by the bad
craft the score exists to detect. Both alternatives were swept and both broke
band monotonicity or inverted discrimination pairs — the doc carries the
tables.

**Status: PENDING OWNER MEASUREMENT.** No real-corpus run has happened. Every
number below comes from fixtures committed to this repository; the AUC-24
floor in `scripts/lib/auc.ts` is untested against this change. See
[[Gate - Receipt Gate]] and [[Owner - R5 Measurement and Merge]].

**Measured in-repo, against `main` at `2bfcbf9d` (2026-09-06 re-run after the
rebase):** the padding witness flips from +5.4 to −4.4 and metamorphic runs
8 of 8 hard with no known-failing witness; all 45 in-repo reports move
(health RMS 20.45, 28 verdict changes, no `sceneCount` change); calibration
band separation falls 25.32 to 11.14 while still ordering 5 of 5; blind
matched pairs rise from 1 of 6 to 3 of 6 with no script left pinned at the
old shared 76.0 — see [[Measurement - BLIND_PAIRS_ON_BRANCHES_2026-09-04]] for
why that rise is the removal of a saturating clamp rather than new craft
judgment.

**What this fed:** [[Branch - R5 Verbosity Bias]], and through it the stacked
branch the owner's second measurement needs. The 72-row real-corpus manifest
is stale until re-locked on the owner's machine.

## Sources

- `docs/scoring/VERBOSITY_BIAS_FIX_2026-09-03.md`
- `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` (the PENDING entry and its 2026-09-06 addendum)
