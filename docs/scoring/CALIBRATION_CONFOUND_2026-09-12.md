# The calibration corpus's word budget is not controlled — measurement, and what re-authoring would take

**Branch:** `scoring/adversarial-2026-09-12`.
**Answers:** `docs/audits/2026-09-12-adversarial/engine-logic.md` finding 8.
**Reproduce:** `npm run benchmark:public -- --control` ·
`node --experimental-strip-types tests/core/calibration.test.ts`.
**Nothing in the corpus was edited.** No private corpus was read; no AUC-24
value appears here.

## 1. The claim

`CLAUDE.md` states the design as a standing gotcha:

> band monotonicity is a property of the CONTROLLED-RICHNESS DESIGN — all 20
> samples share scene/word budgets and structural-signal presence, so craft is
> the only variable. Changing one band's richness without matching every other
> band reintroduces the measured confound and the calibration tests will
> (correctly) fail.

The second sentence is why this lane does **not** touch the corpus. The first
sentence is not true of the word budget.

## 2. The measurement, on this branch

| band | n | scenes | words (min…max, mean) | mean health |
|---|---|---|---|---|
| strong | 5 | 10…10 | 314…337 (**327**) | 62.40 |
| competent | 5 | 9…10 | 290…311 (298) | 52.52 |
| weak | 5 | 10…10 | 269…297 (288) | 42.12 |
| troubled | 5 | 9…10 | 256…324 (**278**) | 37.08 |

```
Spearman(band, wordCount)  = 0.7526
Spearman(band, health)     = 0.7099
Spearman(band, sceneCount) = 0.4472
```

Band rank correlates with word count **more tightly than with the health score
the corpus exists to calibrate**. Scene count is not shared either: three
troubled and one competent sample have 9 scenes rather than 10, which at
`scarcityPenalty = 140/sceneCount` is an extra 1.56 points of penalty, also in
the direction that flatters the band ordering.

All 20 samples sit on the density power branch, where
`density = weightedIssues / wordCount^0.7`. Extra words mechanically buy a
lower penalty.

## 3. The counterfactual

Re-score every sample through the shipped `computeHealthScore` at a common
**298-word, 10-scene** budget, keeping its own issue mix:

| band | shipped | budget-equalised | Δ |
|---|---|---|---|
| strong | 62.40 | 58.22 | **−4.18** |
| competent | 52.52 | 52.92 | +0.40 |
| weak | 42.12 | 44.80 | +2.68 |
| troubled | 37.08 | 41.64 | **+4.56** |

```
strong-minus-troubled gap      25.32 -> 16.58   (34.5% of the gap was the budget)
all-25-pairs AUC(strong>troubled) 0.9600 -> 0.7600
```

Every one of these figures reproduces the adversarial review's numbers exactly,
which is worth stating: the review measured them on `main`, and the branch's
formula changes did not move them.

## 4. The `--control` line was reporting a statistic that is not one

`npm run benchmark:public -- --control` printed *"strong over troubled: 5 of 5
ordered, mean gap 25.32"*. The strong and troubled bands hold five **unrelated**
samples each; there is no matched-pair relationship between `strong[i]` and
`troubled[i]`, and the count therefore depends on an array order nothing pins.
Measured: **it holds for 96 of the 120 orderings of the troubled band.**

The honest cross-band statistic is the all-pairs AUC, **0.9600** — not 1.0000,
because `Lockdown` (troubled, 58.8) outscores `Second Wind` (strong, 58.2).

The line now leads with the all-pairs AUC, keeps the index-wise count labelled
as what it is (the measurement docs quote it, and deleting a published number is
worse than labelling it), and prints the whole confound underneath, computed
from the run rather than written down.

## 5. What was changed, and what was not

Changed: `measureCalibrationControl` computes and returns the per-band word
budgets, the all-pairs AUC, the three Spearman coefficients and the
budget-equalised counterfactual; `--control` prints all of it;
`tests/core/calibration.test.ts` asserts the confound's size in four tests, in
both directions — each one's failure message says that if the corpus was
genuinely equalised the test should be **rewritten as the invariant** rather
than relaxed.

Not changed: one byte of `server/nvm/analyze/calibration/corpus.ts`. No
scoring-path file is touched by this work at all.

## 6. What re-authoring would require (owner-gated, task #48)

Stated so the decision is costed rather than deferred:

1. **Pin every sample to one budget.** An identical `wordCount` and
   `sceneCount` across all 20 — the gotcha's own condition — enforced by a test
   asserting equality, not a range. That is a rewrite of 20 screenplays, not an
   edit: adding words to the troubled band to reach 327 means adding *troubled*
   words, and whether a sample's issue mix survives being padded is exactly the
   question the corpus exists to answer.
2. **Re-derive every band threshold.** `calibration/reference.ts`'s
   distribution is built from these 20 healths. Equalising moves the strong
   band down 4.18 and the troubled band up 4.56, so every percentile the
   product reports moves with them, as does `percentileDescriptor` and the
   "top N% of the reference set" copy on five dimension badges.
3. **Re-measure everything keyed to it.** The output-identity harness scores
   all 20 samples; the public benchmark prints them as its control; the P0
   sample report quotes a percentile. Expect a deliberate identity FAIL of the
   same kind as the 2026-09-04 corpus-integrity correction.
4. **Decide what "controlled" should mean.** Equalising the word budget does
   not equalise scene count, dialogue share, or cast size — the last of which
   `docs/scoring/STRUCTURAL_SIGNALS_2026-09-04.md` already registers as a
   confound of its own (Spearman −0.69). A corpus controlled on one variable
   and uncontrolled on three is not obviously better than one that discloses
   all four.
5. **Or retire the claim instead.** The cheaper, more honest option: stop
   calling it a control, report the band ordering as an all-pairs AUC with the
   word budget as a disclosed covariate, and let the P1 benchmark on real
   labelled writing carry the discrimination claim. That is what this lane
   implements as the interim state, and it is a complete answer if the corpus
   is never re-authored.

## 7. What the owner's run can and cannot settle

Nothing here moves a number, so AUC-24 cannot move because of it. The owner's
corpus also cannot settle whether the calibration corpus is well-designed —
different corpus, different purpose. What *would* settle it is the P1 benchmark
this roadmap already names: real drafts, independently blind-labelled, where
the label does not come from the same lexicons the rules match on.
