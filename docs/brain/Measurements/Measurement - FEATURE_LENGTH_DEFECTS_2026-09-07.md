---
type: measurement
updated: 2026-09-07
sources: [docs/scoring/FEATURE_LENGTH_DEFECTS_2026-09-07.md, evals/scoring/runner/metamorphic-cases.ts, server/nvm/analyze/doctor.ts, server/nvm/analyze/voice-delta.ts, server/nvm/analyze/structural-signals.ts]
status: pending-measurement
---

# Measurement — FEATURE_LENGTH_DEFECTS_2026-09-07

**Question:** the defects that only show up at, or are only visible because
of, feature length — the dialogue channel abstaining for the whole script,
`ORPHAN_CLUE`'s critical tier being character names and the title, the health
formula paying a writer both for DELETING a third of their scenes and for
STAPLING unrelated scripts together, and the summary paragraph contradicting
the five dimension scores printed beside it. The third is
[[Gate - Public Benchmark]]'s §10 finding and the One Bet.

**Status: PENDING OWNER MEASUREMENT.** Every number comes from committed
fixtures and the public benchmark; the private 761-script corpus was not
touched and is not described. See [[Gate - Receipt Gate]] and
[[Owner - R5 Measurement and Merge]].

**The decomposition that drives everything.** Under the shuffle-drop recipe
the 32-script public corpus retains 72.5% of its words but only ~51% of its
weighted issues, so `densityPenalty` fell 7.632 while `scarcityPenalty` rose
only 5.693 — the damaged copy scored **1.9 points higher on average**. The
staple is the same formula's other end and a DIFFERENT term: the stapled
twelve and the best single part sit **0.013 apart** on density (both pinned at
the 10-point ceiling) and 10.66 apart on scarcity, so no change confined to
the density term could ever move that witness. That was measured before any
candidate was chosen, and it is what ruled out the whole class.

**The candidate comparison (doc §8.2).** R5's scene-opportunity denominator
measures paired shuffle-drop **0.0938** — an inversion, worse than doing
nothing — because a scene drop shrinks `(sceneCount·30)^0.7` by 0.752 while
weighted issues fall to 0.546: it normalises by the quantity the degradation
attacks. A scene-count CREDIT CAP measured the best row on the secondary
statistic and was rejected anyway: it introduces a NEW saturation at health
74.7 on five of six synthetic pairs, and this branch's whole diagnosis is that
saturation is the defect. Steeper curves (k = 4, 5, 8) measure better and all
violate the slope constraint, which — measured — binds at 11.41 and is very
nearly infeasible: any curve rising 10 points across a unit of density has
mean slope 10.

**Results.** Shuffle-drop matched-pair 0.5313 → **0.8750** (17/15/0 → 28/4/0,
mean gap −1.93 → +2.10); climax-relocate 0.4219 → **0.5469** with exact ties
11 of 32 → 1 and no script left pinned at 76.0; the control at 1.0000/1.0000;
blind matched pairs 1 of 6 → **4 of 6**; calibration band monotonicity intact
with not one of the 20 samples moving. `stapled_shorts`, a new metamorphic
witness registered known-failing at +8.2, measures −2.0 and is promoted to
`hard`.

**The null, kept because it is a result.**
`meanAbsDialogueShareDeltaNormalised` divides the raw channel by the sd of the
same shares; the cast-size confound collapses (Spearman −0.695 → −0.015 on 32
scripts, −0.643 → −0.176 on the blind twelve) and the 5-of-6 blind ordering
survives. But under `CLIMAX_RELOCATE` it moves on 32 of 32 scripts and the
intact script is higher on exactly **16 of 32** — chance — and wiring it
LOWERS that channel 0.5469 → 0.5156. It ships exposed and not wired, and that
is asserted by a test rather than trusted.

**What this fed:** the branch [[Branch - Feature-Length Defects]].

## Sources

- `docs/scoring/FEATURE_LENGTH_DEFECTS_2026-09-07.md`
- `evals/scoring/runner/metamorphic-cases.ts` (`stapled_shorts`)
- `docs/p1-benchmark/PUBLIC_BENCHMARK_2026-09-06.md` §10 (the finding) and §11 (the re-locked floors)
