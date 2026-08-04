# Rebuild Experiment — 2026-08-04: which signals actually separate?

**Status:** Harness built and run. Every number below comes from a run executed
in this session against the in-repo corpus. **No number here is a corpus
measurement, and none of it authorizes a scoring change** — the maintainer
command in §8 is the measurement that would.

**What was built:** `scripts/rebuild-experiment.mjs` (+ its mechanics library
`scripts/lib/rebuild-experiment-lib.mjs`, + `tests/core/rebuild-experiment.test.ts`).
One command scores a corpus under **32 scoring configurations** — all 16 subsets
of the four unwired candidate signals, each with and without the weighted-rule
channel zeroed — across the four `measure-auc-split.mjs` degradations, with
seeded bootstrap CIs.

**No scoring file was edited.** The harness calls only exported functions
(`runScriptDoctor`, `computeHealthScore`, `analyzeFountainText`, and the four
candidate modules). `scripts/measure-auc-split.mjs`, `doctor.ts`,
`fountain-analyzer.ts`, `emotional-arc.ts`, `calibration/**`,
`revision/passes/**` and `package.json` are untouched.

---

## 1. Caveats — read these before quoting any number

This block is printed by the harness itself at the top and bottom of every run,
and is asserted by `tests/core/rebuild-experiment.test.ts`.

1. **Directional, not conclusive.** The in-repo corpus is 18–38 screenplays. At
   that N a 95% bootstrap CI on an AUC spans roughly ±0.2. Rankings here are
   hypotheses to test on the real corpus, not findings.
2. **Not comparable to `DISCRIMINATION_BASELINE_2026-07-29.md`.** That baseline
   is 761 produced feature screenplays (153-script hash-locked test partition,
   100–400 scenes each). The in-repo scripts are 9–14-scene AI-authored shorts —
   `CC0_CORPUS_EXPANSION_2026-08-04.md` says so up front — plus 10-scene
   controlled calibration samples. Several scoring paths are feature-scale-gated
   and cannot fire at all at this length (§5).
3. **Not comparable to the AUC-24 ≥ 0.622 ratchet** in
   `tests/core/real-script-corpus.test.ts` either. That is ONE combined
   shuffle-and-drop degradation scored as an all-pairs goods×bads grid; this is
   four separate matched-pair degradations.
4. **The real measurement is the maintainer command** in §8.
5. **The candidate deduction shapes for REV / AGENCY / TRUTH are harness-local
   research probes, not proposed wiring** (§4).

---

## 2. Why this exists

`ROADMAP.md` P1 says: rebuild the score around the **smallest signal set that
actually separates**. Two committed facts make that concrete.

- `docs/p1-benchmark/DISCRIMINATION_BASELINE_2026-07-29.md`, 153-script
  hash-locked test partition: DIALOGUE_FLATTEN 0.990 (passes the ≥0.80 gate),
  MIDPOINT_DROP 0.766, SCENE_SHUFFLE 0.734, CLIMAX_RELOCATE 0.523 (chance),
  ALL POOLED 0.754.
- `server/nvm/analyze/doctor.ts` lines 1893–1899: the weighted-rule channel
  contributes AUC ~0.076 to shuffle-drop discrimination while scene-count
  scarcity carries ~0.938.

Meanwhile four candidate signals are built, tested, and **unwired**:

| Module | What it ships today | Composable into health from outside? |
|---|---|---|
| `question-latency-deduction.ts` | its own bounded deduction | **Yes** — `measure-auc-split.mjs` already composes it (lines 132–144) |
| `reversal-detection.ts` | `computeReversalDelta` comparison stats | No — `--with-reversal-detection` is diagnostic-only by that file's own header |
| `agency-signal.ts` | `computeD1/D2AgencyDelta` comparison stats | No — `--with-agency-signal` is diagnostic-only, same header |
| `truth-extraction.ts` | `detectTruthContradictions` | No — no flag, no deduction shape |

**Finding, stated as the task asked:** only one of the four can be composed
without inventing something. The other three have no agreed deduction shape
anywhere in the repository. Rather than force them, the harness defines
explicitly harness-local candidate shapes (§4) and labels every result produced
through them as such.

---

## 3. Method

Degradations, AUC, and bootstrap are **ported verbatim** from
`scripts/measure-auc-split.mjs` with per-function line citations in
`scripts/lib/rebuild-experiment-lib.mjs`'s header:

| Piece | Source |
|---|---|
| `mulberry32` | `measure-auc-split.mjs` 245–252 |
| `pairwiseAuc` (matched-pair, tie = 0.5, empty = NaN) | 253–261 |
| `bootstrapCi` (percentile, seed 42) | 262–274 |
| `segmentScenes` / `reassemble` | 279–297 |
| `degradeShuffle` (seed 42 Fisher–Yates) | 298–305 |
| `degradeMidpointDrop` (drop the 40–60% window) | 306–311 |
| `degradeClimaxRelocate` (last scene → index 1) | 312–318 |
| `degradeDialogueFlatten` (every dialogue/parenthetical line → `Hello.`) | 319–325 |

The `real-script-corpus.test.ts` AUC-24 recipe is deliberately **not**
reproduced: it is a different degradation and a different estimator, and mixing
the two would produce a number comparable to neither ratchet.

**Partition discipline.** The harness reads `scripts/output/corpus-split.json`
and **refuses `--partition=test`** outright (asserted by a test). The default
`--partition=trainval` additionally drops every file listed in `split.test`, so
even a whole-directory run cannot leak into the held-out set. In this session's
run that guard fired: `transfer-window.fountain` and `runoff.fountain` are in
the test partition and were excluded, leaving 18 of the 20 in-repo CC0 scripts.

**Bootstrap.** 2000 resamples, seed 42, percentile bounds, reproducible for a
given `(pairs, iterations, seed)` triple.

---

## 4. The four candidate deduction shapes

Constants were fixed **before** the first measurement run and were not tuned
afterwards. Each reuses the codebase's existing bounded-deduction pattern
(gate → rate → reference → slope → cap), with caps in the same order of
magnitude as `doctor.ts`'s own structural deductions (15/18/24).

| Signal | Shape | Origin |
|---|---|---|
| **QL** | `computeQuestionLatencyDeduction(records).deduction`, subtracted, floored at 0 | **the module's own**, composed exactly as `measure-auc-split.mjs` does |
| **REV** | reversal scarcity: gate ≥8 scenes, reference 0.15 reversals/scene, cap 12, slope 80 | **harness-local** |
| **AGENCY** | Act-3 initiative scarcity off `computeD2AgencyDelta`: gate ≥2 Act-3 scenes, reference 0.5, cap 10, slope 20 | **harness-local** |
| **TRUTH** | 4 points per detected contradiction, cap 12, no gate | **harness-local** |

**Rule-channel zeroing (`RULE_ZERO`)** is *not* a candidate signal — it is an
exact external ablation, described in §7.

---

## 5. Signal coverage — what could fire at all

Measured on the intact scripts of each run; "responded" counts how often a
signal's deduction moved away from its intact value across all degraded
variants (i.e. whether it can separate anything at all).

**CC0 only (18 scripts, 72 degraded variants):**

| signal | gate passed | non-zero on intact | responded to degradation |
|---|--:|--:|--:|
| QL | 0/18 | 0/18 | 0/72 |
| REV | 18/18 | 18/18 | 1/72 |
| AGENCY | 18/18 | 17/18 | 17/72 |
| TRUTH | 18/18 | 0/18 | 2/72 |

**CC0 + calibration (38 scripts, 152 degraded variants):**

| signal | gate passed | non-zero on intact | responded to degradation |
|---|--:|--:|--:|
| QL | 0/38 | 0/38 | 0/152 |
| REV | 38/38 | 38/38 | 5/152 |
| AGENCY | 38/38 | 37/38 | 23/152 |
| TRUTH | 38/38 | 0/38 | 2/152 |

Reading these rows, in order of how much they change the conclusion:

- **QL is unmeasurable in this sandbox, not measured-and-useless.**
  `question-latency-deduction.ts`'s own `minScenesFloor()` is 15 scenes and no
  in-repo script reaches it (the CC0 corpus tops out at 14 scenes; calibration
  samples are exactly 10). Its deduction is identically 0 everywhere, so every
  `…+QL` configuration in §6 is **byte-identical** to its QL-less counterpart.
  That identity is also a useful self-check that the harness composes
  correctly.
- **REV is a saturated constant here.** `detectReversals` returns
  `reversalCount = 0` on all 18 intact CC0 scripts (see the `revCount` column of
  `scripts/output/rebuild-experiment-signals-trainval.csv`), so the scarcity
  shape sits pinned at its 12-point cap for every script. A constant cannot
  separate anything; where REV *does* move (5/152) it moves on degraded
  variants in the wrong direction, which is why every REV configuration ranks
  below its REV-less twin. This measures **the shape at this scale**, not the
  detector: a detector with zero recall on the corpus cannot be given a
  scarcity shape and be expected to discriminate.
- **TRUTH is asymmetric, and that is the interesting shape.** It fires on
  **zero** intact scripts (0 false positives, consistent with
  `CC0_CORPUS_EXPANSION_2026-08-04.md` §4) and on 2 degraded variants. A signal
  that is silent on good writing and speaks only on damaged writing costs
  nothing and can only help — it is the only candidate here with that property.
- **AGENCY is the most responsive (17/72, 23/152)** and the only signal that
  moves CLIMAX_RELOCATE at all, because its Act-3 window is the only
  *positional* read among the four. It also costs SCENE_SHUFFLE and
  MIDPOINT_DROP on this material.

---

## 6. Results

### 6a. Primary run — 18 CC0 scripts, `--partition=trainval`

`node scripts/rebuild-experiment.mjs` · 72 pairs per degradation · bootstrap
2000, seed 42 · artifacts `scripts/output/rebuild-experiment-trainval.csv`,
`…-signals-trainval.csv`.

Ranked by pooled AUC (lift is vs. the `baseline` configuration, i.e. today's
doctor health):

| # | configuration | pooled AUC | 95% CI | lift |
|--:|---|--:|---|--:|
| 1 | `RULE_ZERO+QL+TRUTH` | 0.757 | [0.701, 0.813] | +0.215 |
| 2 | `RULE_ZERO+TRUTH` | 0.757 | [0.701, 0.813] | +0.215 |
| 3 | `RULE_ZERO` | 0.743 | [0.688, 0.799] | +0.201 |
| 4 | `RULE_ZERO+AGENCY+TRUTH` | 0.743 | [0.667, 0.813] | +0.201 |
| 5 | `RULE_ZERO+QL` | 0.743 | [0.688, 0.799] | +0.201 |
| 6 | `RULE_ZERO+QL+AGENCY+TRUTH` | 0.743 | [0.667, 0.813] | +0.201 |
| 7 | `RULE_ZERO+QL+REV+TRUTH` | 0.743 | [0.681, 0.806] | +0.201 |
| 8 | `RULE_ZERO+REV+TRUTH` | 0.743 | [0.681, 0.806] | +0.201 |
| 9 | `RULE_ZERO+AGENCY` | 0.736 | [0.660, 0.806] | +0.194 |
| 10 | `RULE_ZERO+QL+AGENCY` | 0.736 | [0.660, 0.806] | +0.194 |
| 11 | `RULE_ZERO+QL+REV` | 0.729 | [0.667, 0.792] | +0.188 |
| 12 | `RULE_ZERO+QL+REV+AGENCY+TRUTH` | 0.729 | [0.653, 0.799] | +0.188 |
| 13 | `RULE_ZERO+REV` | 0.729 | [0.667, 0.792] | +0.188 |
| 14 | `RULE_ZERO+REV+AGENCY+TRUTH` | 0.729 | [0.653, 0.799] | +0.188 |
| 15 | `RULE_ZERO+QL+REV+AGENCY` | 0.722 | [0.646, 0.792] | +0.180 |
| 16 | `RULE_ZERO+REV+AGENCY` | 0.722 | [0.646, 0.792] | +0.180 |
| 17 | `QL+REV+TRUTH` | 0.556 | [0.438, 0.674] | +0.014 |
| 18 | `QL+TRUTH` | 0.556 | [0.438, 0.674] | +0.014 |
| 19 | `REV+TRUTH` | 0.556 | [0.438, 0.674] | +0.014 |
| 20 | `TRUTH` | 0.556 | [0.438, 0.674] | +0.014 |
| 21 | `AGENCY+TRUTH` | 0.542 | [0.424, 0.653] | +0.000 |
| 22 | `baseline` | 0.542 | [0.424, 0.660] | +0.000 |
| 23 | `QL` | 0.542 | [0.424, 0.660] | +0.000 |
| 24 | `QL+AGENCY+TRUTH` | 0.542 | [0.424, 0.653] | +0.000 |
| 25 | `QL+REV` | 0.542 | [0.424, 0.660] | +0.000 |
| 26 | `QL+REV+AGENCY+TRUTH` | 0.542 | [0.424, 0.653] | +0.000 |
| 27 | `REV` | 0.542 | [0.424, 0.660] | +0.000 |
| 28 | `REV+AGENCY+TRUTH` | 0.542 | [0.424, 0.653] | +0.000 |
| 29 | `AGENCY` | 0.528 | [0.410, 0.639] | -0.014 |
| 30 | `QL+AGENCY` | 0.528 | [0.410, 0.639] | -0.014 |
| 31 | `QL+REV+AGENCY` | 0.528 | [0.410, 0.639] | -0.014 |
| 32 | `REV+AGENCY` | 0.528 | [0.410, 0.639] | -0.014 |

Per degradation (AUC with 95% CI):

| configuration | SCENE SHUFFLE | MIDPOINT DROP | CLIMAX RELOCATE | DIALOGUE FLATTEN |
|---|---|---|---|---|
| `RULE_ZERO+QL+TRUTH` | 0.556 [0.50, 0.64] | 1.000 [1.00, 1.00] | 0.500 [0.50, 0.50] | 0.972 [0.92, 1.00] |
| `RULE_ZERO+TRUTH` | 0.556 [0.50, 0.64] | 1.000 [1.00, 1.00] | 0.500 [0.50, 0.50] | 0.972 [0.92, 1.00] |
| `RULE_ZERO` | 0.500 [0.50, 0.50] | 1.000 [1.00, 1.00] | 0.500 [0.50, 0.50] | 0.972 [0.92, 1.00] |
| `RULE_ZERO+AGENCY+TRUTH` | 0.472 [0.33, 0.61] | 1.000 [1.00, 1.00] | 0.528 [0.44, 0.64] | 0.972 [0.92, 1.00] |
| `RULE_ZERO+QL` | 0.500 [0.50, 0.50] | 1.000 [1.00, 1.00] | 0.500 [0.50, 0.50] | 0.972 [0.92, 1.00] |
| `RULE_ZERO+QL+AGENCY+TRUTH` | 0.472 [0.33, 0.61] | 1.000 [1.00, 1.00] | 0.528 [0.44, 0.64] | 0.972 [0.92, 1.00] |
| `RULE_ZERO+QL+REV+TRUTH` | 0.556 [0.50, 0.64] | 0.944 [0.83, 1.00] | 0.500 [0.50, 0.50] | 0.972 [0.92, 1.00] |
| `RULE_ZERO+REV+TRUTH` | 0.556 [0.50, 0.64] | 0.944 [0.83, 1.00] | 0.500 [0.50, 0.50] | 0.972 [0.92, 1.00] |
| `RULE_ZERO+AGENCY` | 0.444 [0.31, 0.58] | 1.000 [1.00, 1.00] | 0.528 [0.44, 0.64] | 0.972 [0.92, 1.00] |
| `RULE_ZERO+QL+AGENCY` | 0.444 [0.31, 0.58] | 1.000 [1.00, 1.00] | 0.528 [0.44, 0.64] | 0.972 [0.92, 1.00] |
| `RULE_ZERO+QL+REV` | 0.500 [0.50, 0.50] | 0.944 [0.83, 1.00] | 0.500 [0.50, 0.50] | 0.972 [0.92, 1.00] |
| `RULE_ZERO+QL+REV+AGENCY+TRUTH` | 0.472 [0.33, 0.61] | 0.944 [0.83, 1.00] | 0.528 [0.44, 0.64] | 0.972 [0.92, 1.00] |
| `RULE_ZERO+REV` | 0.500 [0.50, 0.50] | 0.944 [0.83, 1.00] | 0.500 [0.50, 0.50] | 0.972 [0.92, 1.00] |
| `RULE_ZERO+REV+AGENCY+TRUTH` | 0.472 [0.33, 0.61] | 0.944 [0.83, 1.00] | 0.528 [0.44, 0.64] | 0.972 [0.92, 1.00] |
| `RULE_ZERO+QL+REV+AGENCY` | 0.444 [0.31, 0.58] | 0.944 [0.83, 1.00] | 0.528 [0.44, 0.64] | 0.972 [0.92, 1.00] |
| `RULE_ZERO+REV+AGENCY` | 0.444 [0.31, 0.58] | 0.944 [0.83, 1.00] | 0.528 [0.44, 0.64] | 0.972 [0.92, 1.00] |
| `QL+REV+TRUTH` | 0.361 [0.17, 0.58] | 0.444 [0.22, 0.67] | 0.417 [0.19, 0.67] | 1.000 [1.00, 1.00] |
| `QL+TRUTH` | 0.361 [0.17, 0.58] | 0.444 [0.22, 0.67] | 0.417 [0.19, 0.67] | 1.000 [1.00, 1.00] |
| `REV+TRUTH` | 0.361 [0.17, 0.58] | 0.444 [0.22, 0.67] | 0.417 [0.19, 0.67] | 1.000 [1.00, 1.00] |
| `TRUTH` | 0.361 [0.17, 0.58] | 0.444 [0.22, 0.67] | 0.417 [0.19, 0.67] | 1.000 [1.00, 1.00] |
| `AGENCY+TRUTH` | 0.306 [0.11, 0.53] | 0.389 [0.17, 0.61] | 0.472 [0.28, 0.69] | 1.000 [1.00, 1.00] |
| `baseline` | 0.306 [0.11, 0.53] | 0.444 [0.22, 0.67] | 0.417 [0.19, 0.67] | 1.000 [1.00, 1.00] |
| `QL` | 0.306 [0.11, 0.53] | 0.444 [0.22, 0.67] | 0.417 [0.19, 0.67] | 1.000 [1.00, 1.00] |
| `QL+AGENCY+TRUTH` | 0.306 [0.11, 0.53] | 0.389 [0.17, 0.61] | 0.472 [0.28, 0.69] | 1.000 [1.00, 1.00] |
| `QL+REV` | 0.306 [0.11, 0.53] | 0.444 [0.22, 0.67] | 0.417 [0.19, 0.67] | 1.000 [1.00, 1.00] |
| `QL+REV+AGENCY+TRUTH` | 0.306 [0.11, 0.53] | 0.389 [0.17, 0.61] | 0.472 [0.28, 0.69] | 1.000 [1.00, 1.00] |
| `REV` | 0.306 [0.11, 0.53] | 0.444 [0.22, 0.67] | 0.417 [0.19, 0.67] | 1.000 [1.00, 1.00] |
| `REV+AGENCY+TRUTH` | 0.306 [0.11, 0.53] | 0.389 [0.17, 0.61] | 0.472 [0.28, 0.69] | 1.000 [1.00, 1.00] |
| `AGENCY` | 0.250 [0.06, 0.44] | 0.389 [0.17, 0.61] | 0.472 [0.28, 0.69] | 1.000 [1.00, 1.00] |
| `QL+AGENCY` | 0.250 [0.06, 0.44] | 0.389 [0.17, 0.61] | 0.472 [0.28, 0.69] | 1.000 [1.00, 1.00] |
| `QL+REV+AGENCY` | 0.250 [0.06, 0.44] | 0.389 [0.17, 0.61] | 0.472 [0.28, 0.69] | 1.000 [1.00, 1.00] |
| `REV+AGENCY` | 0.250 [0.06, 0.44] | 0.389 [0.17, 0.61] | 0.472 [0.28, 0.69] | 1.000 [1.00, 1.00] |

### 6b. Sensitivity run — 18 CC0 + 20 calibration samples

`node scripts/rebuild-experiment.mjs --with-calibration` · 152 pairs per
degradation · artifacts `scripts/output/rebuild-experiment-trainval-with-calibration.csv`,
`…-signals-trainval-with-calibration.csv`.

| # | configuration | pooled AUC | 95% CI | lift |
|--:|---|--:|---|--:|
| 1 | `RULE_ZERO+QL+TRUTH` | 0.697 | [0.658, 0.734] | +0.145 |
| 2 | `RULE_ZERO+TRUTH` | 0.697 | [0.658, 0.734] | +0.145 |
| 3 | `RULE_ZERO` | 0.691 | [0.651, 0.727] | +0.138 |
| 4 | `RULE_ZERO+QL` | 0.691 | [0.651, 0.727] | +0.138 |
| 5 | `RULE_ZERO+AGENCY+TRUTH` | 0.684 | [0.638, 0.727] | +0.132 |
| 6 | `RULE_ZERO+QL+AGENCY+TRUTH` | 0.684 | [0.638, 0.727] | +0.132 |
| 7 | `RULE_ZERO+AGENCY` | 0.681 | [0.635, 0.727] | +0.128 |
| 8 | `RULE_ZERO+QL+AGENCY` | 0.681 | [0.635, 0.727] | +0.128 |
| 9 | `RULE_ZERO+QL+REV+TRUTH` | 0.664 | [0.622, 0.704] | +0.112 |
| 10 | `RULE_ZERO+REV+TRUTH` | 0.664 | [0.622, 0.704] | +0.112 |
| 11 | `RULE_ZERO+QL+REV` | 0.658 | [0.615, 0.701] | +0.105 |
| 12 | `RULE_ZERO+REV` | 0.658 | [0.615, 0.701] | +0.105 |
| 13 | `RULE_ZERO+QL+REV+AGENCY+TRUTH` | 0.651 | [0.602, 0.701] | +0.099 |
| 14 | `RULE_ZERO+REV+AGENCY+TRUTH` | 0.651 | [0.602, 0.701] | +0.099 |
| 15 | `RULE_ZERO+QL+REV+AGENCY` | 0.648 | [0.599, 0.694] | +0.095 |
| 16 | `RULE_ZERO+REV+AGENCY` | 0.648 | [0.599, 0.694] | +0.095 |
| 17 | `QL+REV+TRUTH` | 0.559 | [0.484, 0.635] | +0.007 |
| 18 | `QL+TRUTH` | 0.559 | [0.484, 0.635] | +0.007 |
| 19 | `REV+TRUTH` | 0.559 | [0.484, 0.635] | +0.007 |
| 20 | `TRUTH` | 0.559 | [0.484, 0.635] | +0.007 |
| 21 | `AGENCY+TRUTH` | 0.553 | [0.474, 0.628] | +0.000 |
| 22 | `baseline` | 0.553 | [0.474, 0.628] | +0.000 |
| 23 | `QL` | 0.553 | [0.474, 0.628] | +0.000 |
| 24 | `QL+AGENCY+TRUTH` | 0.553 | [0.474, 0.628] | +0.000 |
| 25 | `QL+REV` | 0.553 | [0.474, 0.628] | +0.000 |
| 26 | `REV` | 0.553 | [0.474, 0.628] | +0.000 |
| 27 | `AGENCY` | 0.546 | [0.467, 0.622] | -0.006 |
| 28 | `QL+AGENCY` | 0.546 | [0.467, 0.622] | -0.006 |
| 29 | `QL+REV+AGENCY+TRUTH` | 0.546 | [0.470, 0.622] | -0.006 |
| 30 | `REV+AGENCY+TRUTH` | 0.546 | [0.470, 0.622] | -0.006 |
| 31 | `QL+REV+AGENCY` | 0.539 | [0.464, 0.615] | -0.013 |
| 32 | `REV+AGENCY` | 0.539 | [0.464, 0.615] | -0.013 |

Per degradation (AUC with 95% CI):

| configuration | SCENE SHUFFLE | MIDPOINT DROP | CLIMAX RELOCATE | DIALOGUE FLATTEN |
|---|---|---|---|---|
| `RULE_ZERO+QL+TRUTH` | 0.526 [0.50, 0.57] | 1.000 [1.00, 1.00] | 0.500 [0.50, 0.50] | 0.763 [0.68, 0.84] |
| `RULE_ZERO+TRUTH` | 0.526 [0.50, 0.57] | 1.000 [1.00, 1.00] | 0.500 [0.50, 0.50] | 0.763 [0.68, 0.84] |
| `RULE_ZERO` | 0.500 [0.50, 0.50] | 1.000 [1.00, 1.00] | 0.500 [0.50, 0.50] | 0.763 [0.68, 0.84] |
| `RULE_ZERO+QL` | 0.500 [0.50, 0.50] | 1.000 [1.00, 1.00] | 0.500 [0.50, 0.50] | 0.763 [0.68, 0.84] |
| `RULE_ZERO+AGENCY+TRUTH` | 0.474 [0.41, 0.55] | 0.974 [0.92, 1.00] | 0.513 [0.46, 0.57] | 0.776 [0.70, 0.86] |
| `RULE_ZERO+QL+AGENCY+TRUTH` | 0.474 [0.41, 0.55] | 0.974 [0.92, 1.00] | 0.513 [0.46, 0.57] | 0.776 [0.70, 0.86] |
| `RULE_ZERO+AGENCY` | 0.461 [0.39, 0.53] | 0.974 [0.92, 1.00] | 0.513 [0.46, 0.57] | 0.776 [0.70, 0.86] |
| `RULE_ZERO+QL+AGENCY` | 0.461 [0.39, 0.53] | 0.974 [0.92, 1.00] | 0.513 [0.46, 0.57] | 0.776 [0.70, 0.86] |
| `RULE_ZERO+QL+REV+TRUTH` | 0.526 [0.50, 0.57] | 0.868 [0.74, 0.97] | 0.500 [0.50, 0.50] | 0.763 [0.68, 0.84] |
| `RULE_ZERO+REV+TRUTH` | 0.526 [0.50, 0.57] | 0.868 [0.74, 0.97] | 0.500 [0.50, 0.50] | 0.763 [0.68, 0.84] |
| `RULE_ZERO+QL+REV` | 0.500 [0.50, 0.50] | 0.868 [0.74, 0.97] | 0.500 [0.50, 0.50] | 0.763 [0.68, 0.84] |
| `RULE_ZERO+REV` | 0.500 [0.50, 0.50] | 0.868 [0.74, 0.97] | 0.500 [0.50, 0.50] | 0.763 [0.68, 0.84] |
| `RULE_ZERO+QL+REV+AGENCY+TRUTH` | 0.474 [0.41, 0.55] | 0.842 [0.71, 0.95] | 0.513 [0.46, 0.57] | 0.776 [0.70, 0.86] |
| `RULE_ZERO+REV+AGENCY+TRUTH` | 0.474 [0.41, 0.55] | 0.842 [0.71, 0.95] | 0.513 [0.46, 0.57] | 0.776 [0.70, 0.86] |
| `RULE_ZERO+QL+REV+AGENCY` | 0.461 [0.39, 0.53] | 0.842 [0.71, 0.95] | 0.513 [0.46, 0.57] | 0.776 [0.70, 0.86] |
| `RULE_ZERO+REV+AGENCY` | 0.461 [0.39, 0.53] | 0.842 [0.71, 0.95] | 0.513 [0.46, 0.57] | 0.776 [0.70, 0.86] |
| `QL+REV+TRUTH` | 0.526 [0.37, 0.67] | 0.210 [0.08, 0.34] | 0.500 [0.34, 0.66] | 1.000 [1.00, 1.00] |
| `QL+TRUTH` | 0.526 [0.37, 0.67] | 0.210 [0.08, 0.34] | 0.500 [0.34, 0.66] | 1.000 [1.00, 1.00] |
| `REV+TRUTH` | 0.526 [0.37, 0.67] | 0.210 [0.08, 0.34] | 0.500 [0.34, 0.66] | 1.000 [1.00, 1.00] |
| `TRUTH` | 0.526 [0.37, 0.67] | 0.210 [0.08, 0.34] | 0.500 [0.34, 0.66] | 1.000 [1.00, 1.00] |
| `AGENCY+TRUTH` | 0.500 [0.34, 0.64] | 0.184 [0.05, 0.32] | 0.526 [0.37, 0.67] | 1.000 [1.00, 1.00] |
| `baseline` | 0.500 [0.34, 0.64] | 0.210 [0.08, 0.34] | 0.500 [0.34, 0.66] | 1.000 [1.00, 1.00] |
| `QL` | 0.500 [0.34, 0.64] | 0.210 [0.08, 0.34] | 0.500 [0.34, 0.66] | 1.000 [1.00, 1.00] |
| `QL+AGENCY+TRUTH` | 0.500 [0.34, 0.64] | 0.184 [0.05, 0.32] | 0.526 [0.37, 0.67] | 1.000 [1.00, 1.00] |
| `QL+REV` | 0.500 [0.34, 0.64] | 0.210 [0.08, 0.34] | 0.500 [0.34, 0.66] | 1.000 [1.00, 1.00] |
| `REV` | 0.500 [0.34, 0.64] | 0.210 [0.08, 0.34] | 0.500 [0.34, 0.66] | 1.000 [1.00, 1.00] |
| `AGENCY` | 0.474 [0.32, 0.62] | 0.184 [0.05, 0.32] | 0.526 [0.37, 0.67] | 1.000 [1.00, 1.00] |
| `QL+AGENCY` | 0.474 [0.32, 0.62] | 0.184 [0.05, 0.32] | 0.526 [0.37, 0.67] | 1.000 [1.00, 1.00] |
| `QL+REV+AGENCY+TRUTH` | 0.500 [0.34, 0.64] | 0.184 [0.05, 0.32] | 0.526 [0.37, 0.67] | 0.974 [0.93, 1.00] |
| `REV+AGENCY+TRUTH` | 0.500 [0.34, 0.64] | 0.184 [0.05, 0.32] | 0.526 [0.37, 0.67] | 0.974 [0.93, 1.00] |
| `QL+REV+AGENCY` | 0.474 [0.32, 0.62] | 0.184 [0.05, 0.32] | 0.526 [0.37, 0.67] | 0.974 [0.93, 1.00] |
| `REV+AGENCY` | 0.474 [0.32, 0.62] | 0.184 [0.05, 0.32] | 0.526 [0.37, 0.67] | 0.974 [0.93, 1.00] |

The ranking is stable across the two runs — the same four configurations lead,
in the same order — which is the most that N=18/38 can support.

### 6c. Health-floor saturation, and why it changes how one row reads

The harness counts variants whose doctor health hit the 0 floor:

| run | intact | SHUFFLE | DROP | RELOCATE | FLATTEN |
|---|--:|--:|--:|--:|--:|
| CC0 only | 0/18 | 0/18 | 0/18 | 0/18 | **1/18** |
| CC0 + calibration | 0/38 | 0/38 | 0/38 | 1/38 | **20/38** |

`doctor.ts` clamps health at 0 (line 1939), so a saturated variant has already
lost whatever the weighted-rule channel took below zero. Two consequences,
both verified directly:

- Every one of the 20 flattened **calibration** variants saturates. Measured on
  the first six: intact health 50.9–67.6, flattened health **0** for all six,
  with the rule channel worth 18.4–35.1 points intact and 83.5–86.0 points
  flattened. Adding the channel back recovers the same 86.0 ceiling for both
  halves of five of those six pairs, which makes them **tie**.
- Therefore the `RULE_ZERO` DIALOGUE_FLATTEN drop from 0.972 (CC0 only) to
  0.763 (with calibration) is **an artifact of the floor**, not evidence that
  the rule channel carries dialogue signal on calibration material. And the
  `baseline` DIALOGUE_FLATTEN 1.000 on the same 20 is the weaker claim
  "degraded bottomed out", not "the score ranked them".

The CC0-only run (§6a) is therefore the cleaner of the two measurements: only
1 of its 72 variants saturates.

---

## 7. Was channel-zeroing cleanly measurable? Yes — exactly, without editing anything

`doctor.ts`:

```
health     = max(0, round10(baseHealth − structural − arc − dialogue))     (1939)
baseHealth = computeHealthScore(bySeverity, sceneCount, wordCount)         (1795)
computeHealthScore = clamp(100 − densityPenalty(bySeverity, wordCount)
                               − scarcityPenalty(sceneCount))              (587-610)
```

`densityPenalty` is the **only** term that reads `bySeverity`; `scarcityPenalty`
reads only `sceneCount`. `computeHealthScore` is exported, and
`ScriptDoctorReport` carries `bySeverity`, `sceneCount` and `wordCount`
(`types.ts` 248/257/258). So the weighted-rule channel's exact contribution is

```js
computeHealthScore({critical:0,major:0,minor:0}, sceneCount, wordCount)
  − computeHealthScore(bySeverity, sceneCount, wordCount)
```

which is what `ruleChannelZeroAdjustment()` computes. This is an exact
arithmetic identity on the real formula, not an approximation, and it needs no
edit to any scoring file. Three honest edges, all reported rather than hidden:

1. `health` is rounded to 0.1 before the add-back, so a zeroed health can differ
   from a hypothetical internally-zeroed one by ≤0.05.
2. **The 0 floor is the real limit** — see §6c. Where a variant saturates, the
   ablation is not faithful and the harness says so per degradation.
3. Adding the channel back can exceed 100; the harness clamps to [0, 100], the
   same range `doctor.ts` uses.

**Measured magnitude of the channel** (intact CC0 scripts,
`ruleChannelPoints` column): 10.0 to 58.7 points of health, median ≈14.6. This
is not a small residual term; on `room-12.fountain` it is 58.7 of the 100-point
scale.

---

## 8. The maintainer command (this is the real measurement)

```bash
CORPUS_DIR=<local 761-script corpus> node scripts/rebuild-experiment.mjs --partition=trainval
```

Hash-lock discipline per `docs/p1-benchmark/MEASUREMENT_RUNBOOK.md`:

- `--partition=trainval` unions train + val + any file the split never assigned,
  and **excludes** everything in `split.test`. Exploration therefore never
  touches the 153-script held-out partition.
- `--partition=test` is **refused** by the CLI with an explanatory error. The
  single final evaluation stays with `scripts/measure-auc-split.mjs`, which
  carries the SHA-256 test-set hash check (`corpus-test-hash.txt`).
- Add `--with-calibration` only for a sensitivity read; do not mix its numbers
  into a corpus claim.
- Optional: `--bootstrap=10000` to match `measure-auc-split.mjs`'s resample
  count once N is large enough to be worth it.

Note for whoever runs it: `MEASUREMENT_RUNBOOK.md` documents
`CORPUS_DIR=… node scripts/measure-auc-split.mjs`, but that script hardcodes
`SRC_DIR = 'data/screenplays'` and ignores `CORPUS_DIR`. This harness genuinely
honours `CORPUS_DIR` (and `--corpus-dir=`). The runbook's line is worth
correcting for `measure-auc-split.mjs` separately; it is not corrected here
because that file is out of this task's scope.

Outputs go to new filenames (`rebuild-experiment-*.csv`) that no committed
evidence artifact uses, and through `scripts/lib/output-guard.mjs`, so this
harness cannot shrink `discrimination-auc-*.csv` or `real-corpus-scores.csv`.

---

## 9. Reading: the minimal signal set I would bet on

**`RULE_ZERO + TRUTH`** — zero the weighted-rule channel, keep one asymmetric
order-sensitive detector. Pooled 0.757 [0.701, 0.813] on the primary run
(baseline 0.542 [0.424, 0.660]); 0.697 [0.658, 0.734] on the sensitivity run
(baseline 0.553). It is the top-ranked configuration in **both** runs, and every
configuration above baseline in either run contains `RULE_ZERO`.

Why this set, term by term:

- **Zeroing the rule channel is where all the movement is.** Every one of the 16
  `RULE_ZERO` configurations outranks every one of the 16 non-`RULE_ZERO`
  configurations, in both runs, with no overlap. The four candidate signals
  together move pooled AUC by at most +0.014; zeroing the channel moves it
  +0.201.
- **The channel is not merely inert — on this material it is inverted.** Primary
  run baseline: SCENE_SHUFFLE **0.306**, MIDPOINT_DROP **0.444**,
  CLIMAX_RELOCATE **0.417** — all *below* chance. Sensitivity run baseline:
  MIDPOINT_DROP **0.210**. The doctor scores the damaged script *higher* than
  the intact one, and zeroing the channel repairs it (SHUFFLE 0.306→0.500,
  DROP 0.444→1.000, RELOCATE 0.417→0.500). The mechanism is the one
  `DISCRIMINATION_BASELINE_2026-07-29.md` §"31% dialogue-flatten inversions"
  already named: destroying material removes the issues that material generated,
  so the density penalty falls and health rises.
- **But `RULE_ZERO`'s biggest single win is a scene-count artifact, and must be
  read as one.** MIDPOINT_DROP → 1.000 is scarcity doing exactly what
  `doctor.ts` 1896 already says it does (scarcity AUC 0.938): dropping 20% of
  scenes raises `140/sceneCount`. It is not new discrimination; it is the
  removal of a term that was *fighting* the scarcity term.
- **`TRUTH` is a free +0.014.** Silent on all 38 intact scripts, fires only on
  degraded ones, never lowers any per-degradation AUC in either run. Small, but
  it is the only candidate whose cost is provably zero on good writing.
- **`REV` is out.** Pinned at its cap on every intact script; strictly lowers
  MIDPOINT_DROP wherever it moves (1.000→0.944, 1.000→0.868).
- **`AGENCY` is the interesting reject.** It is the only signal that moves
  CLIMAX_RELOCATE off exactly-chance (0.500→0.528 primary, 0.500→0.513
  sensitivity) — the channel the 761-script baseline reports at 0.523 and calls
  the position-blindness problem. But on this corpus it costs more on
  SCENE_SHUFFLE than it gains: 0.500→0.444 primary. **Do not discard it on this
  evidence.** Its Act-3 window is a fraction of scene count, so at 9–14 scenes
  the window is 3–4 scenes and a single scene flips the rate by 0.25–0.33. It
  needs the feature-scale corpus before any verdict, and it is the only
  candidate with a mechanical reason to attack the one channel that is at
  chance.

**What would falsify this reading**, in order of likelihood:

1. `RULE_ZERO` losing DIALOGUE_FLATTEN at feature scale. On the real corpus that
   channel is the one that *passes* (0.990), and `dialogueDegradationDeduction`
   — which survives zeroing — is only part of why. If zeroing costs more there
   than it gains on MIDPOINT_DROP, the whole ranking inverts.
2. The MIDPOINT_DROP inversion not replicating. The real corpus reports 0.766,
   not 0.210 — the inversion measured here may be specific to 9–14-scene
   scripts where a handful of issues dominates the density term.
3. `TRUTH`'s 2/152 firing rate being noise. Two events cannot support a signal.

None of these can be settled in this sandbox. That is the point of §8.

---

## 10. Provenance

- Harness: `scripts/rebuild-experiment.mjs`, `scripts/lib/rebuild-experiment-lib.mjs`.
- Tests: `tests/core/rebuild-experiment.test.ts` — 40 tests, 0 failures.
- Raw artifacts: `scripts/output/rebuild-experiment-trainval.csv` (160 rows),
  `rebuild-experiment-signals-trainval.csv` (18 rows),
  `rebuild-experiment-trainval-with-calibration.csv` (160 rows),
  `rebuild-experiment-signals-trainval-with-calibration.csv` (38 rows).
- Corpus: `data/screenplays/` — the 20 CC0 scripts of
  `CC0_CORPUS_EXPANSION_2026-08-04.md`, minus the 2 in the held-out test
  partition; plus, in the sensitivity run, the 20 samples of
  `server/nvm/analyze/calibration/corpus.ts`.
- Engine: unmodified — `git status` for this change shows added files only, no
  modifications to any existing file.
- Verification: `npm run lint` 0 errors · `npm test` 10381 tests, 0 fail
  (78 skipped, 2 todo — pre-existing) · `npm run honesty-audit` clean ·
  `npm run check-docs` clean · `npm run check-scoring-receipt` reports no
  scoring-path files changed.
- Companion design doc: `docs/p1-benchmark/RULE_CATALOG_RETIREMENT_DESIGN.md` —
  what it would take to act on §9's first term.
