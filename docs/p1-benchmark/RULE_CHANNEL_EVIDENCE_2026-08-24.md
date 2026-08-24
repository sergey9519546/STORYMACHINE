# Rule-Catalog Retirement — Evidence Bar B1–B7, Measured (P-2, 2026-08-24)

**Purpose:** `docs/PATH_TO_EXCELLENCE.md` P-2 — "run retirement evidence bar
B1–B7 (channel-zero AUC on the real corpus). The project's own rebuild
experiment measured the weighted-rule channel as inverted; two weeks later the
question is still open. Settle it."

**Status of this document: EVIDENCE ONLY. Nothing is retired, and nothing here
authorizes a removal.** Removal remains "a separate approved migration, never
implied by 'freeze'" (CLAUDE.md / ROADMAP P1). No scoring path changed:
`node scripts/check-scoring-receipt.mjs` exits 0 over this change with no
receipt.

**Harness:** `scripts/measure-rule-channel-evidence.ts` —
`node --experimental-strip-types scripts/measure-rule-channel-evidence.ts`.
Raw output: `scripts/output/rule-channel-evidence.json`. It calls only exported
functions (`runScriptDoctor`, `computeHealthScore`, `computeRawCraftScore`) and
shares `scripts/lib/rebuild-experiment-lib.mjs` verbatim with
`scripts/rebuild-experiment.mjs`, so the degradation recipes, the matched-pair
AUC and the seeded bootstrap are the *same code*, not a second implementation.

---

## 0. Bottom line first

**The in-repo evidence does NOT justify a retirement recommendation, and the
decision genuinely waits on the owner runs — but not for the reason the design
assumed.** Three findings, in descending order of consequence:

1. **The design's Tier B is not free.** `RULE_CATALOG_RETIREMENT_DESIGN.md` §4
   Step 2 defines Tier B as "never fires on any script in the real corpus —
   candidate for removal at zero measurable score cost, **by construction**."
   That "by construction" is false for the statistic the bar is written in.
   246 rule names on this corpus fire *only* on a degraded variant and never on
   an intact script, so they are Tier B by the design's own definition while
   still moving every degradation AUC. Measured: removing exactly Tier B costs
   pooled AUC **0.572 → 0.530** and SCENE_SHUFFLE **0.487 → 0.342**. Step 3's
   safety argument ("zero measurable score cost, by construction") needs
   rewriting before it is executed, whatever B1 says.

2. **B1's dialogue-protection clause fails on the raw numbers and passes once
   the health-0 floor is corrected for.** Both readings are below; the
   correction is the thing the 2026-08-04 rebuild experiment flagged and did
   not resolve. A bar item that flips on an artifact of the score's floor is
   not yet a decidable bar item.

3. **B5 is settled here and it is a genuine obstacle.** Zeroing the rule
   channel *breaks* calibration band monotonicity outright — the calibration
   corpus's band ordering is carried entirely by the rule channel, exactly as
   its controlled-richness design implies. Any removal that reaches into the
   firing set has to answer this, and the answer is not "re-lock the numbers".

B2, B3, B4 are CANNOT-MEASURE here (owner-local corpus). B6 is satisfied. B7 is
unsatisfied for a one-line reason: no person is named.

| Item | Verdict | One-line reason |
|---|---|---|
| **B1** Channel-zero AUC on the REAL corpus | **OWNER-GATED** (proxy measured, ambiguous) | pooled clause passes on both in-repo samples; the DIALOGUE_FLATTEN CI clause fails on the 38-source sample and passes on CC0-only and on every saturation-corrected reading |
| **B2** Held-out confirmation, once, at the end | **OWNER-GATED, correctly not run** | by protocol it runs last; the SHA-256 hash lock is present and intact |
| **B3** AUC-24 ≥ 0.622 ratchet holds | **CANNOT-MEASURE** | `REAL_SCRIPT_CORPUS_DIR` unset/absent; the assertion SKIPS |
| **B4** Produced-feature floor holds | **CANNOT-MEASURE** | same test file, same corpus, same skip |
| **B5** Calibration band monotonicity holds | **UNSATISFIED — measured, and it BREAKS** | full channel-zero collapses all four band averages to 85–86; monotonicity fails |
| **B6** A receipt | **SATISFIED (process)** | guard exists, is referenced by a CI workflow, receipts doc exists |
| **B7** A named owner and a rollback point | **UNSATISFIED (half)** | rollback plan written (design §6); no individual named |

---

## 1. What the bar actually is, and where each item can be settled

The bar is `docs/p1-benchmark/RULE_CATALOG_RETIREMENT_DESIGN.md` §3. Read
carefully, it splits three ways:

- **Corpus-gated (B1, B2, B3, B4).** All four name the owner-local
  761-script corpus (`CORPUS_DIR` / `REAL_SCRIPT_CORPUS_DIR`). CLAUDE.md
  already records why it cannot reach CI: local-only for copyright, and
  mounting it through secrets was rejected. Confirmed again by this harness's
  own reachability probe rather than assumed — see §6.
- **In-repo-settleable (B5).** The calibration reference corpus ships in git
  (`server/nvm/analyze/calibration/corpus.ts`), so B5 can be decided here
  outright. It is, in §5, and the answer is not the convenient one.
- **Process-checkable (B6, B7).** Verifiable by inspection of the repository
  and of the design document. Done mechanically in §7.

---

## 2. Catalog census — re-derived, and the design document is stale by one

Re-derived from the current tree rather than quoted, because a census that is
only ever quoted is exactly how the disproven "~8,917 rules" story survived as
long as it did (audit R2-C01).

| Fact | This tree (f940ccd) | Design §1 (2026-08-04) |
|---|--:|--:|
| Pass files scanned (excl. `types.ts`) | 15 | 14 + `confidence.ts` |
| Pass-scoped constants `(pass, RULE)` | **3,217** | 3,216 |
| Distinct rule NAMES | **3,186** | 3,185 |
| Names owned by two passes | 31 | 31 |
| Total lines in those files | 98,239 | 97,953 |

**The live freeze HOLDS**: 3,217 matches `docs/rulebook/README.md`'s published
total exactly, which is the comparison `tests/core/rulebook.test.ts` enforces
in CI. **The design document, CLAUDE.md and ROADMAP P1 are stale by one**: all
three say 3,216. The delta is git-traceable — `33a2ee48` (2026-08-07),
"Regenerate rulebook docs for the new INVERSE_CHEKHOV_GUN rule", causality pass
236 → 237. So one entry was added to the catalog after ROADMAP P1's "add no
entries" line was written. Recording it, not litigating it: the addition went
through the normal review path and the generated rulebook was regenerated with
it. The number in the prose is what is wrong, and it should be corrected to
3,217 the next time those files are touched for another reason.

---

## 3. Step-0 firing frequency — how large Tier B really is

Design §4 Step 0 asks for a firing-frequency census as the input that turns
"remove the catalog" into "remove *these* rules". Run here on the reachable
corpus (18 CC0 trainval + 20 calibration = 38 sources; the 2 CC0 files in the
hash-locked held-out test partition are excluded, per
`MEASUREMENT_RUNBOOK.md`):

| Statistic | Value |
|---|--:|
| Distinct rule names firing on ≥1 intact script | **906 / 3,186 (28.4%)** |
| Silent on every intact script (Tier B candidates) | **2,280 / 3,186 (71.6%)** |
| Firing *only* on a degraded variant, never intact | **246** |

This reproduces the design §2 figure (934/3,216, 29.0%) to within the
difference in denominator and corpus — that count was pass-scoped over 20 CC0
scripts; this one is NAME-scoped over 18 CC0 + 20 calibration. Names are the
only granularity available at measurement time: `RevisionIssue` carries no
pass, so a name owned by two passes is observed once. Upper bound on the
resulting discrepancy: 31 constants, stated rather than hidden.

Concentration (weighted severity = 4·critical + 1.5·major + 0.5·minor):

| Top-K rules | Share of all weighted severity |
|--:|--:|
| 1 | 5.9% |
| 5 | 15.9% |
| 10 | 22.2% |
| 25 | 38.3% |
| 50 | 52.8% |
| 100 | 67.1% |

Top five by weight: `ZERO_ENTROPY_SCENE` (36 scripts, 274.5),
`NO_REVERSALS_LONG_STORY` (38, 152.0), `EXPOSITION_DUMP` (37, 139.5),
`PASSIVE_ACT3_INTENTION` (26, 104.0), `INTENTION_INVISIBLE` (38, 68.5).

**Read with care.** "Silent on 38 short scripts" is not "silent on 761
features". Design §4 Step 0 requires this census on the real corpus before any
name enters Tier B, and this document does not substitute for it.

---

## 4. B1 — channel-zero AUC, in-repo proxy

The exact ablation is the identity `rebuild-experiment.mjs` §7 established and
this harness generalises from "zero the whole channel" to "keep an arbitrary
subset": `densityPenalty` is the only term in `computeHealthScore` reading
`bySeverity`, so evaluating the exported function twice — once with severity
counts restricted to a rule subset, once with the real counts — isolates that
subset's health contribution exactly, with no edit to any scoring file.

Matched pairs, four degradation recipes, seeded percentile bootstrap (2000
resamples, seed 42).

### 4a. All 38 reachable sources (CC0 trainval + calibration)

| Degradation | baseline AUC (95% CI) | RULE_ZERO AUC (95% CI) | Δ | saturated pairs |
|---|---|---|--:|--:|
| SCENE_SHUFFLE | 0.487 [0.342, 0.632] | 0.500 [0.500, 0.500] | +0.013 | 0/38 |
| MIDPOINT_DROP | 0.303 [0.158, 0.461] | 1.000 [1.000, 1.000] | +0.697 | 0/38 |
| CLIMAX_RELOCATE | 0.500 [0.329, 0.658] | 0.500 [0.500, 0.500] | +0.000 | 0/38 |
| DIALOGUE_FLATTEN | 1.000 [1.000, 1.000] | **0.789 [0.711, 0.868]** | −0.211 | **20/38** |
| **POOLED** | 0.572 [0.493, 0.648] | **0.697 [0.658, 0.734]** | +0.125 | 20/152 |

### 4b. CC0 only (18 real third-party scripts — the closer analogue)

| Degradation | baseline AUC (95% CI) | RULE_ZERO AUC (95% CI) | Δ | saturated pairs |
|---|---|---|--:|--:|
| SCENE_SHUFFLE | 0.417 [0.222, 0.639] | 0.500 [0.500, 0.500] | +0.083 | 0/18 |
| MIDPOINT_DROP | 0.528 [0.306, 0.750] | 1.000 [1.000, 1.000] | +0.472 | 0/18 |
| CLIMAX_RELOCATE | 0.389 [0.194, 0.611] | 0.500 [0.500, 0.500] | +0.111 | 0/18 |
| DIALOGUE_FLATTEN | 1.000 [1.000, 1.000] | 0.972 [0.917, 1.000] | −0.028 | 1/18 |
| **POOLED** | 0.583 [0.472, 0.688] | **0.743 [0.688, 0.799]** | +0.160 | 1/72 |

### 4c. The saturation correction the 2026-08-04 run flagged but did not apply

`doctor.ts` floors health at 0. A degraded variant that bottomed out has
already lost the information the rule channel took below zero, so adding the
channel back recovers the *same* ceiling for every saturated variant and they
TIE under RULE_ZERO. On DIALOGUE_FLATTEN, 20 of 38 degraded variants saturate —
so the −0.211 above is measuring the floor, not the channel. Dropping saturated
pairs:

| Statistic | baseline | RULE_ZERO | n |
|---|---|---|--:|
| DIALOGUE_FLATTEN (all sources) | 1.000 [1.000, 1.000] | **1.000 [1.000, 1.000]** | 18 |
| POOLED (all sources) | 0.508 [0.424, 0.595] | 0.712 [0.670, 0.754] | 132 |
| DIALOGUE_FLATTEN (CC0 only) | 1.000 [1.000, 1.000] | **1.000 [1.000, 1.000]** | 17 |
| POOLED (CC0 only) | 0.577 [0.465, 0.683] | 0.746 [0.690, 0.803] | 71 |

**Zeroing the channel costs DIALOGUE_FLATTEN nothing at all** once the health-0
floor is excluded. The apparent −0.211 is an artifact of the floor and of the
calibration corpus's short, deliberately-damaged samples bottoming out under
dialogue flattening.

### 4d. B1's pass condition, evaluated

Design §3 B1: RULE_ZERO must not be worse than baseline on pooled AUC, **and**
its CI lower bound on DIALOGUE_FLATTEN must not fall below the ≥0.80 gate that
channel currently clears.

| Sample | pooled clause | DIALOGUE_FLATTEN CI-lo clause | B1-proxy |
|---|---|---|---|
| All 38 sources | 0.572 → 0.697 **PASS** | 0.711 < 0.80 **FAIL** | **FAIL** |
| CC0 only (18) | 0.583 → 0.743 **PASS** | 0.917 ≥ 0.80 **PASS** | **PASS** |
| Either, saturation-corrected | PASS | 1.000 **PASS** | **PASS** |

**This is a proxy on 38 short scripts, not B1.** B1 is defined over the
761-script corpus and only that version can decide a retirement. What the proxy
establishes is narrower and still useful: the inversion the 2026-08-04 rebuild
experiment reported reproduces on the current tree, and B1's dialogue clause is
sensitive to a floor artifact that the design did not anticipate — so the owner
run should report the saturation-corrected number alongside the raw one, or the
clause will decide the migration on an artifact.

### 4e. Reproducibility of the 2026-08-04 rebuild experiment

Re-running `node scripts/rebuild-experiment.mjs` and
`… --with-calibration` on this tree (exit 0 both):

| Statistic | 2026-08-04 (`REBUILD_EXPERIMENT_2026-08-04.md`) | This tree | Reproduces? |
|---|--:|--:|---|
| CC0 `RULE_ZERO` pooled | 0.743 | 0.743 | **exactly** |
| CC0 `RULE_ZERO` per-degradation | 0.500 / 1.000 / 0.500 | 0.500 / 1.000 / 0.500 | **exactly** |
| CC0 `baseline` pooled | 0.542 | 0.583 | **no** |
| CC0 `baseline` SHUFFLE / DROP / RELOCATE | 0.306 / 0.444 / 0.417 | 0.417 / 0.528 / 0.389 | **no** |
| Calibration-sensitivity `baseline` pooled | 0.553 | 0.572 | **no** |

The degradations are seeded and deterministic, so this is a real tree change,
not run-to-run noise: **the RULE_ZERO arm is stable because it does not read
the rule channel at all, and the baseline arm moved because the rule channel
moved** (scoring-path work landed between 2026-08-04 and now). The committed
CSVs under `scripts/output/rebuild-experiment-*.csv` are therefore the
2026-08-04 record, not a description of this tree; they were deliberately left
untouched here so that dated document keeps its artifacts. The direction of the
2026-08-04 conclusion survives; its baseline numbers should not be quoted as
current.

---

## 5. B5 — calibration band monotonicity, settled in-repo, and it BREAKS

`tests/core/calibration.test.ts` asserts strict band-average monotonicity on
`computeRawCraftScore`: strong > competent > weak > troubled. Per CLAUDE.md,
the corpus's controlled-richness design makes craft the only independent
variable — every band shares scene and word budgets — so `scarcityPenalty` is
near-constant across bands and the ordering is carried by `densityPenalty`,
i.e. **by the rule channel**. Measured directly:

| Configuration | strong | competent | weak | troubled | B5 |
|---|--:|--:|--:|--:|---|
| RULE_ZERO (channel fully removed) | 86.000 | 85.689 | 86.000 | 85.067 | **BREAKS** |
| top-1 rules kept | 86.000 | 85.689 | 86.000 | 85.067 | **BREAKS** |
| top-5 kept | 85.999 | 85.559 | 85.931 | 84.927 | **BREAKS** |
| top-10 kept | 84.340 | 78.023 | 80.834 | 77.510 | **BREAKS** |
| top-25 kept | 76.055 | 75.555 | 75.702 | 74.714 | **BREAKS** |
| top-50 kept | 75.228 | 72.625 | 72.649 | 69.913 | **BREAKS** |
| top-100 kept | 72.822 | 66.123 | 61.636 | 59.735 | HOLDS |
| top-250 kept | 67.801 | 59.519 | 51.267 | 49.246 | HOLDS |
| top-500 kept | 65.133 | 55.526 | 42.778 | **44.949** | **BREAKS** |
| Tier B removed (only never-firing rules dropped) | 62.392 | 52.522 | 42.117 | 37.078 | HOLDS |
| today (full catalog) | 62.392 | 52.522 | 42.117 | 37.078 | HOLDS |

Three things worth stating plainly:

- **Full channel-zero collapses the four bands to an 0.93-point spread**
  (86.000 / 85.689 / 86.000 / 85.067) and `weak` ties `strong`. With the rule
  channel gone there is nothing left to separate four scripts that were built
  to share every other budget. B5 is not a formality here; it is the
  calibration corpus doing exactly what its design says it does.
- **Monotonicity is not monotone in K.** top-100 and top-250 hold, top-500
  breaks (`troubled` 44.949 overtakes `weak` 42.778), and the full catalog
  holds again. A partial removal can break B5 even when both a smaller and a
  larger retention set pass it — so B5 has to be re-measured for the *exact*
  removal set, never inferred from a neighbouring one.
- **Tier-B removal is B5-safe.** It reproduces today's numbers to six
  significant figures, which is the expected result and a useful check that
  the subset arithmetic is right.

---

## 6. Graded top-K ablation — how much of the channel is load-bearing

Keep only the K rules contributing the most weighted severity; zero the rest.
K=0 is full RULE_ZERO; K=all is today's doctor. All 38 sources.

| K | rules kept | pooled AUC (95% CI) | SHUFFLE | DROP | RELOCATE | DIALOGUE |
|--:|--:|---|--:|--:|--:|--:|
| 0 | 0 | 0.697 [0.658, 0.734] | 0.500 | 1.000 | 0.500 | 0.789 |
| 1 | 1 | 0.697 [0.658, 0.734] | 0.500 | 1.000 | 0.500 | 0.789 |
| **5** | **5** | **0.753 [0.714, 0.793]** | 0.513 | 1.000 | 0.513 | 0.987 |
| 10 | 10 | 0.730 [0.681, 0.780] | 0.513 | 0.842 | 0.618 | 0.947 |
| 25 | 25 | 0.704 [0.648, 0.757] | 0.461 | 0.868 | 0.500 | 0.987 |
| 50 | 50 | 0.691 [0.622, 0.757] | 0.329 | 0.868 | 0.566 | 1.000 |
| 100 | 100 | 0.625 [0.559, 0.691] | 0.421 | 0.553 | 0.526 | 1.000 |
| 250 | 250 | 0.638 [0.563, 0.707] | 0.500 | 0.500 | 0.553 | 1.000 |
| 500 | 500 | 0.579 [0.503, 0.655] | 0.342 | 0.447 | 0.526 | 1.000 |
| all | 906 | 0.572 [0.493, 0.648] | 0.487 | 0.303 | 0.500 | 1.000 |

**Five rules outscore 906** on pooled AUC (0.753 vs 0.572), and the curve is
monotonically *decreasing* in K from K=5 onward. That is the strongest version
of the "the channel is inverted" claim this repository has produced — and it is
still an 18+20-script reading with overlapping CIs (K=5's [0.714, 0.793] and
K=all's [0.493, 0.648] do not overlap; K=5 vs K=10 and K=25 do). Treat the
*shape* as the finding and the ranking of adjacent K as noise.

The two CIs that do not overlap are worth naming precisely: K=5 vs K=all is a
separation this sample supports; every claim finer than that is not.

**Arithmetic soundness check.** Keeping every rule observed firing on *any*
variant reproduces baseline identically on all five statistics — the identity
that must hold by construction if the subset arithmetic is right. It does.

---

## 7. The Tier-B finding — the design's "by construction" is wrong

Design §4 Step 2 defines **Tier B — silent:** "never fires on any script in the
real corpus. Candidate for removal at zero measurable score cost, **by
construction**." Step 3 then removes Tier B only, resting on that guarantee.

Measured on this corpus, removing exactly Tier B (the 2,280 names no intact
script fires):

| Degradation | baseline AUC | Tier-B-removed AUC | Δ |
|---|--:|--:|--:|
| SCENE_SHUFFLE | 0.487 | 0.342 | **−0.145** |
| MIDPOINT_DROP | 0.303 | 0.303 | +0.000 |
| CLIMAX_RELOCATE | 0.500 | 0.474 | −0.026 |
| DIALOGUE_FLATTEN | 1.000 | 1.000 | +0.000 |
| **POOLED** | **0.572** | **0.530** | **−0.043** |

The cause is measured, not speculated: **246 rule names fire only on a degraded
variant and never on an intact script.** They are Tier B by the design's own
definition — "never fires on any script in the real corpus" is a statement
about the *corpus*, and the corpus is intact scripts — while still carrying
signal in the one statistic the bar is written in. The guarantee holds for
intact scoring (every intact score is byte-identical, confirmed in §5's Tier-B
row) and fails for degradation AUC.

**What this means for the migration, concretely:** Step 2's Tier B definition
must be widened to "never fires on any script in the real corpus *or on any
degradation of one*", or Step 3 must drop its "zero measurable score cost, by
construction" claim and carry a measured before/after like any other scoring
change. This is a defect in the migration design, found before it ran, and it
is independent of how B1 resolves.

---

## 8. B2 / B3 / B4 — reachability, probed rather than assumed

| Probe | Result |
|---|---|
| `REAL_SCRIPT_CORPUS_DIR` set and present | **false** (unset) |
| `CORPUS_DIR` set and present | **false** (unset) |
| `data/screenplays/crawl/` present | **false** |
| `tests/fixtures/real-corpus-manifest.json` present | true (0 entries — the manifest is a shape, not a corpus) |
| `scripts/output/corpus-test-hash.txt` (B2 hash lock) | **present** |

B3 (AUC-24 ≥ 0.622) and B4 (produced-feature floor: health ≥ 80, verdict
`RECOMMEND`) are both asserted in `tests/core/real-script-corpus.test.ts`,
which SKIPS without `REAL_SCRIPT_CORPUS_DIR`. Both are CANNOT-MEASURE here.
This is CLAUDE.md's documented local-only-corpus constraint, re-confirmed by
direct probe, not a harness defect.

B2 is correctly *not* run: per `MEASUREMENT_RUNBOOK.md` and
`PRE_REGISTRATION_PROTOCOL.md` the held-out partition is evaluated exactly once,
after the migration's shape is frozen. The hash lock is present and intact,
`rebuild-experiment.mjs` still refuses `--partition=test`, and this harness
excludes the 2 CC0 files in the test partition from every number above.

---

## 9. B6 / B7 — the process items

| Check | Result |
|---|---|
| `scripts/check-scoring-receipt.mjs` exists | true |
| …referenced by a `.github/workflows/` job | true |
| `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` exists | true |
| Rollback plan written (design §6) | true |
| A specific person named as owner in the design | **false** |

**B6 SATISFIED as a process guarantee.** The guard is wired as a blocking CI
step. Its documented limitation is unchanged and worth restating: CI cannot
verify a recorded number is real, only that a same-range receipt entry exists.

**B7 UNSATISFIED, half.** §6 gives branch discipline, per-step revert, the
tripwire order and an explicit "point of no return: none, by construction" — a
genuine rollback plan. What it does not do is name an individual accountable
for the migration. That is a one-line fix and a human decision; this harness
cannot and should not supply it.

---

## 10. Bottom line — does the in-repo evidence justify a retirement?

**No, and the honest reason is not "the numbers are too small".**

The numbers are small, and they do point the way the 2026-08-04 experiment
pointed: on 38 reachable sources the weighted-rule channel is at best inert and
at worst inverted on the three structural degradations, five rules outscore all
906 firing ones on pooled AUC, and zeroing the channel costs dialogue
discrimination nothing once the health-0 floor is corrected for. If the bar
were "is there a directional case for retirement", that case is stronger today
than it was two weeks ago.

But the bar is not that, and three things block it here:

1. **B5 is settled and it says no** — not "no evidence", but a measured break.
   The calibration corpus's band ordering is carried entirely by the rule
   channel. Any removal reaching into the firing set must re-measure B5 for its
   exact removal set (monotonicity is not monotone in K), and a removal that
   breaks it is breaking something real, not a stale lock to re-record.
2. **The migration's own safety guarantee is wrong.** Tier B is not free.
   246 degradation-only rules make Step 3's "zero measurable score cost, by
   construction" false for the bar's own statistic. Fix the design before
   running it.
3. **B1 cannot be decided from here, and its dialogue clause is not yet
   decidable anywhere** until the owner run reports the saturation-corrected
   number alongside the raw one. As written, that clause flips on an artifact
   of the score's zero floor.

So: **the decision genuinely waits on the owner runs** — but the owner should
run them against a corrected design and a corrected clause, not the ones
written on 2026-08-04. Nothing in this document authorizes removing a single
rule.

---

## 11. Owner discharge — the exact commands

```bash
# B1 (the real one) — channel-zero ablation on the 761-script corpus.
# Report BOTH the raw and the saturation-corrected DIALOGUE_FLATTEN CI;
# see §4c for why the raw one can fail on a floor artifact.
CORPUS_DIR=<761-script corpus> node scripts/rebuild-experiment.mjs --partition=trainval

# B3 + B4 — the AUC-24 >= 0.622 ratchet and the produced-feature floor.
REAL_SCRIPT_CORPUS_DIR=<corpus> npm test

# Step 0 on the real corpus — the firing census that decides which names are
# actually Tier B. Widen the definition first (see §7).
CORPUS_DIR=<corpus> node --experimental-strip-types scripts/measure-rule-channel-evidence.ts

# B5 — settled in-repo (§5); re-run for the EXACT removal set after any removal.
node --experimental-strip-types tests/core/calibration.test.ts

# B2 — LAST, exactly once, after the migration's shape is frozen.
CORPUS_DIR=<corpus> node scripts/measure-auc-split.mjs --partition test
```

**Thresholds that decide retirement**, restated so no run is ambiguous:

- **B1 passes** iff RULE_ZERO pooled AUC ≥ baseline pooled AUC **and** the
  RULE_ZERO DIALOGUE_FLATTEN bootstrap CI lower bound ≥ 0.80 — evaluated on
  saturation-corrected pairs, with the raw figure reported alongside.
- **B3 passes** iff AUC-24 ≥ 0.622 (the ratchet asserted in
  `tests/core/real-script-corpus.test.ts`; last measured 0.731). Do not
  substitute a P1 761-script number for it — different corpus, different
  degradation, different denominator.
- **B4 passes** iff every produced feature still scores health ≥ 80 with
  verdict `RECOMMEND`.
- **B5 passes** iff strong > competent > weak > troubled strictly on
  band-average `computeRawCraftScore`, measured for the exact removal set.
- **If B1 fails, the design is finished and the catalog stays** (design §3).
  That remains a real and acceptable outcome.

---

## 12. What could not be measured here, and exactly why

| Item | Why not |
|---|---|
| B1 on the real corpus | 761-script corpus is owner-local (copyright); `CORPUS_DIR` unset, `data/screenplays/crawl/` absent |
| B2 held-out confirmation | Correctly withheld by protocol — one evaluation, after the shape is frozen |
| B3 AUC-24 ratchet | `REAL_SCRIPT_CORPUS_DIR` unset; the assertion SKIPS |
| B4 produced-feature floor | Same test file, same corpus, same skip |
| Tier-A/Tier-C partition | Requires B1's per-rule ablation on the real corpus (design §4 Step 2). Tier C additionally requires the ≥3-blind-reader human benchmark, which does not exist yet (design §8 Q1) — a mechanical degradation cannot adjudicate a craft rule |
| Whether 2,280 silent names are silent on *features* | This corpus is 38 short scripts (9–16 scenes). Design §4 Step 0 on the real corpus is the only thing that answers it |
