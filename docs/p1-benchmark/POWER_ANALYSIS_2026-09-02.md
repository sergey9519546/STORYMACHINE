# P1/P0 Power Analysis — 2026-09-02

**Status:** PROPOSAL. Nothing in this document is adopted policy — every
number below is a recommendation for the owner to sign off on (or reject) in
`PRE_REGISTRATION_PROTOCOL.md`'s new §12. This document answers retrospective
finding #10 (`docs/audits/2026-09-02-retrospective/RETROSPECTIVE.md` §10):
the One Bet — 5 moderated writer sessions (P0) plus a >=3-reader,
>=0.80-pooled-AUC gate on a 153-script held-out test partition (P1) — was
never power-analyzed. It still isn't a validated design; this document is the
first attempt to say, in numbers, what it can and cannot show.

**The honest headline, stated plainly, up front:** at the sample sizes
currently written into the plan, none of the three legs can do the job asked
of it. A single AUC measurement on the 153-script test partition cannot tell
0.80 apart from 0.75 — the 95% confidence interval is roughly +/-0.07 around
the point estimate, wider than the gap the gate is supposed to police. Five
moderated sessions cannot tell "writers want this" from "five people were
polite" — the exact 95% interval on 4/5 "would use again" runs from 28% to
99%. A kappa computed on whatever subset of the labeling corpus each reader
happens to have in common needs a stated minimum overlap (43-49 scripts
labeled by all readers) that nothing in the current protocol requires. The
plan is under-powered on all three legs as written. That is the finding.

All arithmetic below is produced by
`/tmp/claude-0/-home-user-STORYMACHINE/057a350f-7a69-54f4-ba49-41ec690a2ffe/scratchpad/power-analysis.mjs`,
reproduced in full in the Appendix. No statistic in this document was typed
in by hand — every number is copied from that script's stdout.

---

## 1. AUC gate power (153-script held-out test partition)

### 1.1 What "153 scripts" means here, and why the positive/negative split is not written down

`DISCRIMINATION_BASELINE_2026-07-29.md` and `docs/p1-benchmark/README.md`
report AUC on 153 test-partition scripts using a **mechanical** ground truth:
each script is paired with a degraded twin of itself (SCENE_SHUFFLE,
MIDPOINT_DROP, CLIMAX_RELOCATE, DIALOGUE_FLATTEN), and AUC is the pairwise
statistic on "original scores higher than its own degraded twin." By
construction that is 153 "positive" instances (originals) against 153
"negative" instances (degraded twins) — a 50/50 split falls out of the
measurement mechanism itself, not a design choice.

The **human-labeled** benchmark the >=0.80 gate is written for
(`PRE_REGISTRATION_PROTOCOL.md` §6: "Binary classification: A/B vs C/D") does
not exist yet — zero labels have been collected (`docs/p1-benchmark/README.md`,
"What P1 has NOT done"). `SPLIT_STRATEGY.md`'s quality-distribution *target*
(not an achieved distribution) is A 20-30%, B 30-40%, C 25-35%, D 5-15%;
taking the midpoints (25/35/30/10) and grouping A+B vs C+D gives an
approximately 60/40 split. Because no real distribution exists to derive
this from, per this document's instructions we compute the AUC standard
error under three scenarios and let the reader see the sensitivity:

1. **50/50** — the mechanical-degradation construction as actually measured.
2. **~60/40 (92/61)** — derived from the SPLIT_STRATEGY quality-tier target.
3. **1:3 (38/115)** — a deliberately imbalanced stress case, since a future
   human-labeled corpus skewed toward "most scripts are B/C tier" could
   plausibly produce a lopsided A+B-vs-C+D split.

### 1.2 Hanley-McNeil standard error

For an AUC estimate from `n1` positive and `n2` negative instances:

```
SE(AUC) = sqrt[ AUC(1-AUC) + (n1-1)(Q1-AUC^2) + (n2-1)(Q2-AUC^2) ] / sqrt(n1*n2)
Q1 = AUC / (2 - AUC)
Q2 = 2*AUC^2 / (1 + AUC)
```

(Hanley & McNeil 1982.) 95% CI = `AUC +/- 1.959964 * SE`.

| Split | n1 | n2 | AUC | SE | 95% CI | width |
|---|---:|---:|---:|---:|---|---:|
| 50/50 | 77 | 76 | 0.80 (gate) | 0.0358 | [0.730, 0.870] | 0.140 |
| 50/50 | 77 | 76 | 0.766 (MIDPOINT_DROP, observed) | 0.0383 | [0.691, 0.841] | 0.150 |
| 50/50 | 77 | 76 | 0.734 (SCENE_SHUFFLE, observed) | 0.0403 | [0.655, 0.813] | 0.158 |
| ~60/40 | 92 | 61 | 0.80 (gate) | 0.0349 | [0.732, 0.869] | 0.137 |
| ~60/40 | 92 | 61 | 0.766 | 0.0376 | [0.692, 0.840] | 0.147 |
| ~60/40 | 92 | 61 | 0.734 | 0.0398 | [0.656, 0.812] | 0.156 |
| 1:3 | 38 | 115 | 0.80 (gate) | 0.0460 | [0.710, 0.890] | 0.180 |
| 1:3 | 38 | 115 | 0.766 | 0.0485 | [0.671, 0.861] | 0.190 |
| 1:3 | 38 | 115 | 0.734 | 0.0505 | [0.635, 0.833] | 0.198 |

The 95% CI on a single point estimate at n=153 is roughly **+/-0.07 to
+/-0.09** around the AUC, depending on the split. The two currently-observed
structural baselines (SCENE_SHUFFLE 0.734, MIDPOINT_DROP 0.766) already sit
comfortably inside that band around the 0.80 gate.

### 1.3 Minimum detectable difference (MDE) between two independent AUC estimates

For comparing two independently measured AUCs (e.g. before/after a scoring
change, both measured on this test partition) at significance
alpha=0.05 (two-sided) and power 80%:

```
MDE = (z_{1-alpha/2} + z_{1-beta}) * sqrt(SE_A^2 + SE_B^2)
z_{1-alpha/2} = 1.959964 (alpha=0.05, two-sided)
z_{1-beta}    = 0.841621 (power=80%, beta=0.20)
```

Evaluated at AUC~0.78 (the midpoint of the observed range) with SE_A = SE_B
(same n, same operating point):

| Split | SE | MDE |
|---|---:|---:|
| 50/50 | 0.0373 | 0.148 |
| ~60/40 | 0.0366 | 0.145 |
| 1:3 | 0.0476 | 0.189 |

**At n=153, two AUC measurements on this partition cannot be told apart
unless they differ by roughly 0.145-0.19** — an order of magnitude larger
than the 0.05 gap between the observed pooled AUC (0.754) and the gate
(0.80), and larger than the entire observed spread across all four
degradation channels (0.523 to 0.990).

### 1.4 Can 0.80 be distinguished from 0.75 at n=153?

One-sample check: is the fixed value 0.75 outside the 95% CI computed around
an observed AUC of 0.80?

| Split | SE | 95% CI lower bound at AUC=0.80 | 0.75 inside the CI? |
|---|---:|---:|---|
| 50/50 | 0.0358 | 0.730 | **yes — not distinguishable** |
| ~60/40 | 0.0349 | 0.732 | **yes — not distinguishable** |
| 1:3 | 0.0460 | 0.710 | **yes — not distinguishable** |

**No. A single measurement of 0.80 on a 153-script test partition cannot be
statistically distinguished from 0.75 under any of the three split
assumptions.** The CI lower bound sits well below 0.75 in every scenario.
The gate as written treats 0.80 as a bright line; at this sample size it is
not one — an observed AUC anywhere from roughly 0.71 to 0.87 is consistent
with a "true" AUC of 0.80, and an observed AUC of 0.75-0.77 (where the
project's own structural channels currently sit) is statistically
indistinguishable from clearing the gate outright.

---

## 2. Reader agreement (Fleiss' kappa)

### 2.1 Proposed floor and rationale

`PRE_REGISTRATION_PROTOCOL.md` §3 already states a target ("Fleiss' kappa
>= 0.60 (substantial agreement)"), citing the standard Landis & Koch (1977)
interpretation bands (0.41-0.60 moderate, 0.61-0.80 substantial). This
document does not change that number — it is a reasonable floor for a
4-tier craft judgment where full agreement is not expected — but it adds
what was missing: a computable overlap budget and the resulting sample-size
and labor requirements, without which the existing 0.60 floor has never been
paired with a number of scripts that could actually estimate it precisely.

**Proposal: keep the >= 0.60 point-estimate floor, and add a stated CI
requirement — the 95% CI half-width around the measured kappa must be <=
0.10.** Rationale: without a CI requirement, a kappa point estimate of 0.61
computed on a handful of overlapping scripts is not meaningfully different
from a kappa of 0.55 — the "substantial agreement" claim needs the interval
narrow enough that 0.60 and neighboring bands (moderate: 0.41-0.60) are not
both inside it.

### 2.2 Formula and overlap budget

Large-sample variance approximation for Fleiss' kappa (Fleiss, Levin & Paik
2003 — the formula implemented by the R `irr` package's `kappam.fleiss`),
for `N` subjects (scripts labeled by all raters), `n` raters per subject, and
category marginal proportions `p_j`:

```
S1 = sum_j p_j (1 - p_j)
S2 = sum_j p_j (1 - p_j) (1 - 2 p_j)
Var(kappa) = 2 / (N * n * (n-1)) * [ (S1)^2 - S2 ] / (S1)^2
SE(kappa) = sqrt(Var(kappa))
```

This needs the category marginals `p_j`, which do not exist before any
labeling happens. Two planning scenarios, both computed:

- **Uniform 4-tier assumption (A=B=C=D=0.25 each)** — the simplest planning
  default when the achieved distribution is unknown.
- **SPLIT_STRATEGY's stated target distribution (A=0.25, B=0.35, C=0.30,
  D=0.10)** — closer to what the corpus design actually aims for.

Solving `1.959964 * SE(kappa) <= 0.10` for `N` at `n=3` raters:

| Scenario | core factor | N required (95% half-width <= 0.10) |
|---|---:|---:|
| Uniform (0.25 each) | 0.3333 | **43** |
| SPLIT_STRATEGY target (0.25/0.35/0.30/0.10) | 0.3780 | **49** |

**Proposed overlap budget: at least 49 scripts must be labeled by ALL THREE
readers** (the more conservative of the two scenarios) before the kappa
computed on them has a 95% CI narrow enough (+/-0.10) to distinguish
"substantial" agreement from the "moderate" band immediately below it. Below
that count the CI is wider than the gap between the pass/fail interpretation
bands: at N=30 the half-width is already 0.12-0.13, wider than the entire
"substantial" band's own width (0.20).

### 2.3 Total labels per reader and reader-hours

`PRE_REGISTRATION_PROTOCOL.md` §2 targets a 100-200-script human-labeled
corpus, and §3's "Labeling Procedure" already specifies every reader labels
every script (full overlap) — which, if actually followed, clears the §2.2
overlap floor by a wide margin (100-200 >> 49). The cost of that design has
never been stated in reader-hours. Assuming a 105-page average screenplay
(midpoint of the 90-120-page target range) and three candidate reading
paces (careful structural coverage, including writing the 1-2 sentence
justification, is markedly slower than a casual read):

| Corpus N (full overlap, 3 readers) | Labels/reader | Pages/reader | 40 pg/hr | 60 pg/hr | 90 pg/hr |
|---:|---:|---:|---:|---:|---:|
| 100 | 100 | 10,500 | 262.5 hr | 175.0 hr | 116.7 hr |
| 150 | 150 | 15,750 | 393.8 hr | 262.5 hr | 175.0 hr |
| 200 | 200 | 21,000 | 525.0 hr | 350.0 hr | 233.3 hr |

At the corpus target's midpoint (150 scripts) and a middle reading pace (60
pages/hour), each of the 3 readers needs **~262.5 hours** — over six 40-hour
weeks per reader, ~787.5 reader-hours total. The existing pre-registration
protocol's Phase 2 timeline budgets this at "Week 3-4" (2 weeks). Those two
numbers are incompatible for a full-overlap design at the stated corpus
size; the owner must either shrink the labeled corpus, adopt a partial
overlap design (a fixed overlap core of >=49 scripts read by all three
readers for the kappa computation, with the remainder split across readers
to raise total labeled volume within a fixed reader-hour budget — not
currently specified anywhere in this directory), or accept the longer
timeline.

---

## 3. The five moderated sessions (P0)

### 3.1 What n=5 can establish, exactly

Treating "would use again" as a binomial proportion, the exact
(Clopper-Pearson) 95% confidence interval for `x` successes out of `n=5`:

| Result | Observed p | 95% CI (Clopper-Pearson) | width |
|---|---:|---|---:|
| 3/5 | 0.60 | [0.147, 0.947] | 0.801 |
| 4/5 | 0.80 | [0.284, 0.995] | 0.711 |
| 5/5 | 1.00 | [0.478, 1.000] | 0.522 |

**4 of 5 writers saying "I'd use this again" is consistent with a true
adoption rate anywhere from about 28% to about 99%.** Even the best possible
result at n=5 — 5 for 5 — only pins the true rate down to [0.48, 1.00]: the
interval still straddles "half of all writers" and "essentially everyone."
Five sessions can surface concrete objections, moments of trust or
disbelief, and qualitative signal worth reading verbatim (as
`ROADMAP.md`'s P0 section already asks for) — that is real information. What
it cannot do is support a quantitative claim like "most writers want this,"
because the interval around any n=5 result is wide enough to be consistent
with both "most" and "a small, polite minority."

### 3.2 What n bounds the interval to +/-20 points

Using the same exact method, holding the observed rate near 0.80 (as the
"4/5" scenario suggests) and searching for the smallest `n` such that the
Clopper-Pearson 95% CI half-width is `<= 0.20`:

```
n=17, x=14 (rounding 0.80*17): CI = [0.566, 0.962], half-width = 0.198
```

**n≈17 documented sessions**, at a rate holding near 80% "would use again,"
are needed before the interval narrows to +/-20 points. (A conservative,
distribution-free planning cross-check using the normal approximation
`n = z^2 * p(1-p) / E^2` at the worst case `p=0.5` gives n=25; at the
optimistic `p=0.8` it gives n=16 — consistent with the exact n=17 above.)
Five sessions is roughly a third of what is needed even for this relatively
loose +/-20-point target, and nowhere near what would be needed for a
tighter, more decision-grade interval.

### 3.3 Do not soften this

Five moderated sessions, as currently specified, is a qualitative
discovery exercise, not a validated go/no-go gate. It can catch a
report nobody wants to open — the "core question" ROADMAP.md asks for
("does this make you want to run your own draft?") is a legitimate use of
five conversations. It cannot support the phrase "P0 passed" as a
statistically defensible claim about writer demand at large, and it should
not be treated as interchangeable with the AUC gate's quantitative rigor
elsewhere in the same document.

---

## 4. Summary of proposed floors (for §12 of PRE_REGISTRATION_PROTOCOL.md)

All of the following are PROPOSALS requiring the owner's signature — see the
new section added to `PRE_REGISTRATION_PROTOCOL.md`.

| Item | Proposed value | Basis |
|---|---|---|
| Fleiss' kappa point-estimate floor | >= 0.60 (unchanged from existing protocol) | Landis & Koch (1977) "substantial agreement" band |
| Fleiss' kappa CI requirement (new) | 95% CI half-width <= 0.10 | So the point estimate cannot float between agreement bands |
| Overlap budget (new) | >= 49 scripts labeled by ALL readers | Solves the kappa-CI formula above at n=3 raters, SPLIT_STRATEGY-target category marginals |
| AUC gate — acknowledge CI at n=153 | Report the 95% CI alongside every point estimate; treat gate as "point estimate >= 0.80 AND CI lower bound clearly separated from 0.75" rather than a bare point comparison | Section 1 above — a bare 0.80 vs 0.75 comparison is not resolvable at this n |
| MDE for re-measuring AUC after a scoring change | ~0.15 (same-n, independent-estimate comparison) | Section 1.3 |
| P0 session count for a +/-20-point CI on "would use again" | ~17 sessions (vs. the current 5) | Section 3.2 |

---

## Appendix: full computation output

Script: `/tmp/claude-0/-home-user-STORYMACHINE/057a350f-7a69-54f4-ba49-41ec690a2ffe/scratchpad/power-analysis.mjs`
(zero dependencies, plain Node; every number above is copied from this
output, nothing was hand-typed).

```
==============================================================================
SECTION 1 — Hanley-McNeil SE of AUC, n=153-script test partition
==============================================================================

-- split: 50/50 (pairwise-construction default: each script contributes one "better" and one "worse" instance) --
   n1=77, n2=76 (n1+n2=153)
   AUC=0.8 (gate (0.80)): SE=0.0358  95% CI=[0.7297, 0.8703]  width=0.1405
   AUC=0.766 (observed MIDPOINT_DROP test baseline (0.766)): SE=0.0383  95% CI=[0.6909, 0.8411]  width=0.1502
   AUC=0.734 (observed SCENE_SHUFFLE test baseline (0.734)): SE=0.0403  95% CI=[0.655, 0.813]  width=0.158

-- split: derived from SPLIT_STRATEGY quality-tier target (A+B=60% vs C+D=40%, midpoints 25/35/30/10) --
   n1=92, n2=61 (n1+n2=153)
   AUC=0.8 (gate (0.80)): SE=0.0349  95% CI=[0.7315, 0.8685]  width=0.137
   AUC=0.766 (observed MIDPOINT_DROP test baseline (0.766)): SE=0.0376  95% CI=[0.6923, 0.8397]  width=0.1474
   AUC=0.734 (observed SCENE_SHUFFLE test baseline (0.734)): SE=0.0398  95% CI=[0.656, 0.812]  width=0.156

-- split: 1:3 imbalance (stress case) --
   n1=38, n2=115 (n1+n2=153)
   AUC=0.8 (gate (0.80)): SE=0.046  95% CI=[0.7098, 0.8902]  width=0.1804
   AUC=0.766 (observed MIDPOINT_DROP test baseline (0.766)): SE=0.0485  95% CI=[0.6708, 0.8612]  width=0.1903
   AUC=0.734 (observed SCENE_SHUFFLE test baseline (0.734)): SE=0.0505  95% CI=[0.6351, 0.8329]  width=0.1979

-- Minimum detectable difference (MDE) between two independent AUC
   estimates at 80% power, alpha=0.05 two-sided, evaluated at AUC~0.78 --
   50/50 (pairwise-construction default: each script contributes one "better" and one "worse" instance): SE=0.0373  MDE=0.148
   derived from SPLIT_STRATEGY quality-tier target (A+B=60% vs C+D=40%, midpoints 25/35/30/10): SE=0.0366  MDE=0.1448
   1:3 imbalance (stress case): SE=0.0476  MDE=0.1885

-- One-sample check: is 0.80 distinguishable from 0.75 at n=153? --
   50/50 (pairwise-construction default: each script contributes one "better" and one "worse" instance): SE=0.0358  95% CI lower bound=0.7297  0.75 INSIDE the CI (NOT distinguishable)
   derived from SPLIT_STRATEGY quality-tier target (A+B=60% vs C+D=40%, midpoints 25/35/30/10): SE=0.0349  95% CI lower bound=0.7315  0.75 INSIDE the CI (NOT distinguishable)
   1:3 imbalance (stress case): SE=0.046  95% CI lower bound=0.7098  0.75 INSIDE the CI (NOT distinguishable)

==============================================================================
SECTION 2 — Fleiss' kappa: overlap budget for a target CI half-width
==============================================================================

-- uniform 4-tier planning default (A=B=C=D=0.25) --
   core factor [(S1)^2 - S2]/(S1)^2 = 0.333333
   N (all-3-raters overlap) for 95% CI half-width <= 0.1: N = 2*core*z^2 / (halfWidth^2 * n*(n-1)) = 42.68 -> round up to 43
     N=30: SE=0.0609  95% half-width=0.1193  full width=0.2386
     N=43: SE=0.0508  95% half-width=0.0996  full width=0.1993
     N=45: SE=0.0497  95% half-width=0.0974  full width=0.1948
     N=60: SE=0.043  95% half-width=0.0843  full width=0.1687
     N=100: SE=0.0333  95% half-width=0.0653  full width=0.1307
     N=150: SE=0.0272  95% half-width=0.0533  full width=0.1067

-- SPLIT_STRATEGY target distribution (A=0.25,B=0.35,C=0.30,D=0.10) --
   core factor [(S1)^2 - S2]/(S1)^2 = 0.377965
   N (all-3-raters overlap) for 95% CI half-width <= 0.1: N = 2*core*z^2 / (halfWidth^2 * n*(n-1)) = 48.4 -> round up to 49
     N=30: SE=0.0648  95% half-width=0.127  full width=0.254
     N=43: SE=0.0541  95% half-width=0.1061  full width=0.2122
     N=45: SE=0.0529  95% half-width=0.1037  full width=0.2074
     N=60: SE=0.0458  95% half-width=0.0898  full width=0.1796
     N=100: SE=0.0355  95% half-width=0.0696  full width=0.1391
     N=150: SE=0.029  95% half-width=0.0568  full width=0.1136

-- Reader labor for a full-overlap design (every reader rates every
   script in the corpus) at the PRE_REGISTRATION_PROTOCOL corpus target --

   corpus N=100 (full overlap: each of 3 readers labels all 100):
     total labels produced = 3 * 100 = 300
     labels per reader = 100
     pages per reader = 100 * 105 = 10500
       at 40 pages/hour: 262.5 reader-hours per reader (787.5 total across 3 readers)
       at 60 pages/hour: 175 reader-hours per reader (525 total across 3 readers)
       at 90 pages/hour: 116.7 reader-hours per reader (350 total across 3 readers)

   corpus N=150 (full overlap: each of 3 readers labels all 150):
     total labels produced = 3 * 150 = 450
     labels per reader = 150
     pages per reader = 150 * 105 = 15750
       at 40 pages/hour: 393.8 reader-hours per reader (1181.3 total across 3 readers)
       at 60 pages/hour: 262.5 reader-hours per reader (787.5 total across 3 readers)
       at 90 pages/hour: 175 reader-hours per reader (525 total across 3 readers)

   corpus N=200 (full overlap: each of 3 readers labels all 200):
     total labels produced = 3 * 200 = 600
     labels per reader = 200
     pages per reader = 200 * 105 = 21000
       at 40 pages/hour: 525 reader-hours per reader (1575 total across 3 readers)
       at 60 pages/hour: 350 reader-hours per reader (1050 total across 3 readers)
       at 90 pages/hour: 233.3 reader-hours per reader (700 total across 3 readers)

==============================================================================
SECTION 3 — n=5 moderated sessions: binomial CI on a proportion
==============================================================================

   x=4/n=5 (observed p=0.8):
     Clopper-Pearson exact 95% CI: [0.2836, 0.9949]  width=0.7114
     Wilson score 95% CI:          [0.3755, 0.9638]  width=0.5882

   x=5/n=5 (observed p=1):
     Clopper-Pearson exact 95% CI: [0.4782, 1]  width=0.5218
     Wilson score 95% CI:          [0.5655, 1]  width=0.4345

   x=3/n=5 (observed p=0.6):
     Clopper-Pearson exact 95% CI: [0.1466, 0.9473]  width=0.8006
     Wilson score 95% CI:          [0.2307, 0.8824]  width=0.6517

-- Smallest n (assuming true rate stays near 0.80, x=round(0.8n)) such
   that the exact Clopper-Pearson 95% CI half-width <= 0.20 --
   n=17, x=14: CI=[0.5657, 0.962]  half-width=0.1982  <-- first n meeting +/-20pt target

-- Reference: normal-approximation planning formulas (not what's used above,
   shown for cross-check) n = z^2*p*(1-p)/E^2, E=0.20, z=1.96 --
   p=0.5: n = 24.01 -> round up to 25
   p=0.8: n = 15.37 -> round up to 16

==============================================================================
END OF COMPUTATION
==============================================================================
```

---

## Related documents

- `PRE_REGISTRATION_PROTOCOL.md` — the governing methodology; §12 (new,
  unsigned) references this document.
- `docs/p1-benchmark/DISCRIMINATION_BASELINE_2026-07-29.md` — the source of
  the 153-script test partition and the observed AUC baselines used above.
- `docs/p1-benchmark/SPLIT_STRATEGY.md` — the quality-tier distribution
  target used to derive the ~60/40 split scenario.
- `docs/p1-benchmark/LABELING_KIT.md` — the machinery that would run a real
  labeling round; §5 already flags an unresolved rubric-clarification gap
  this document does not touch.
- `docs/audits/2026-09-02-retrospective/RETROSPECTIVE.md` §10 — the finding
  this document answers.
