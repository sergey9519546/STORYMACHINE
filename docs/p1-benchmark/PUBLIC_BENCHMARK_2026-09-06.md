# Public benchmark — degradation discrimination on distributable prose, in CI

**Date:** 2026-09-06 · **Tree:** `main @ c16f7e0c` plus this lane's changes ·
**Reproduce anything below with one command, no corpus, no key:**

```
npm run benchmark:public            # the table
npm run benchmark:public -- --control   # plus the calibration control
npm run benchmark:public -- --json      # machine-readable
npm test -- (tests/core/public-benchmark.test.ts runs unconditionally)
```

Every number in this document came out of those commands on this tree. None
is transcribed from another document, and none describes the private corpus.

---

## 0. What changed, in one paragraph

Before this lane, **every** discrimination statistic in the repository was
invisible to CI. `tests/core/real-script-corpus.test.ts` is env-gated on
`REAL_SCRIPT_CORPUS_DIR` and the corpus is local-only for copyright reasons,
so it skips on every run. `tests/core/auc24-table.test.ts` would recompute the
same statistic from a committed table of numbers, but that table can only be
produced by the owner (`npm run lock-auc24`) and is not committed, so it skips
too. The only always-on signal was
`tests/core/blind-pairs-discrimination.test.ts`, which records a **failing**
craft result and asserted no floor in the losing direction. This lane adds a
discrimination number that is **computed end to end on every CI run** — from
32 committed `.fountain` files, through the real doctor, to an AUC with a
seeded bootstrap interval on a pre-registered split, against two floors. It is
not a better number than AUC-24. It is a number that exists where there was
none.

---

## 1. The corpus, and whose licence it is on

| set | n | licence | provenance, from that set's own file |
|---|---|---|---|
| `data/screenplays/*.fountain` | 20 | CC0 1.0 Universal | `data/screenplays/LICENSE-live-action.md` §Provenance: original works written in 2026 for this corpus, "None is copied from, adapted from, or based on any real, produced, copyrighted, or publicly-distributed screenplay." |
| `tests/fixtures/blind-pairs/*.fountain` | 12 | CC0 1.0, declared in each file's `/* */` boneyard | `tests/fixtures/blind-pairs/README.md` "The exact order of operations", steps 1–5: six matched excellent/bad pairs written 2026-09-04 by an author who had read no scoring rule, lexicon, revision pass, calibration sample or prior discrimination number. The write-first order is a fact in the git history. |
| **total scored** | **32** | | |
| `calibration/corpus.ts` `REFERENCE_CORPUS` | 20 | in-repo source | **CONTROL ONLY — excluded from every asserted number** (see §6). |

Both scored sets carry a caveat the harness prints on every run, and that
belongs next to any quotation of these numbers:

* The 20 CC0 scripts are **agent-authored**. `undertow.fountain`'s own boneyard
  says so: "Not a substitute for professionally-authored 'real writing' in P1's
  validation sense."
* The 12 blind-pair scripts are twelve short screenplays by a **single author**,
  not blind-labelled by independent readers. Their README says it: "evidence,
  not a benchmark."

The calibration corpus is excluded on evidence, not taste:
`docs/p1-benchmark/RULE_CHANNEL_EVIDENCE_2026-08-24.md` §0 finding 3 shows its
band ordering is carried **entirely** by the weighted-rule channel — zeroing
that channel "breaks calibration band monotonicity outright" — because those
samples were hand-authored from the rules' own lexicons. Scoring them inside a
benchmark meant to be independent of the rule channel would let the engine's
recognition of its own vocabulary do the work.

---

## 2. The pre-registered split

**Rule, implemented once in `scripts/lib/public-benchmark.ts` `partitionFor()`
and recorded in `tests/fixtures/public-benchmark-split.json`:**

```
holdout iff parseInt(sha256(file bytes).slice(0, 8), 16) % 10 < 3;
otherwise exploration
```

Three properties a hand-picked split does not have:

1. **Nobody chose it.** The assignment is a function of the file's own bytes,
   fixed in code before any AUC was computed. No script can land in
   exploration because it scored inconveniently.
2. **Adding a script never reassigns an existing one.** A rank rule ("sort by
   hash, take the first 30%") reshuffles every assignment when the corpus
   grows; a per-file modulo cannot. That is what makes it a *pre*-registration
   rather than a snapshot.
3. **Editing a script moves it, loudly** — the hash is over file bytes, so any
   edit shows up as a diff in both committed fixtures.

**What it actually drew:** 27 exploration / **5 holdout** (15.6%), against a
rule targeting ~30%. That is the draw. Re-tuning the threshold after seeing
the assignment is exactly the hand-picking the rule exists to prevent, so the
number is reported and not fixed. The five holdout files are
`mise`, `off-season`, `quiet-season`, `night-shift-excellent`,
`signal-drift-bad`. A five-script partition AUC is reported below and is very
wide; treat it as a shape, not a result.

**Known limitation, stated here rather than discovered later.** The blind-pairs
set contains near-duplicates by construction (an `-excellent` and a `-bad`
member share a premise, a ten-scene skeleton and a cast). A per-file rule can
put one member in exploration and its partner in holdout, so for those scripts
the holdout is not fully independent. Keying the split on the pair would fix
that and break property (1), because "which member's hash names the pair" is a
choice.

---

## 3. The two degradations, and why there are two

| | (a) `SHUFFLE_DROP` | (b) `CLIMAX_RELOCATE` |
|---|---|---|
| recipe | seeded Fisher-Yates shuffle of all scenes, then drop every third of the shuffled order | move the final scene to position 1 |
| scene count | **changes** (10 → 7) | **preserved** (measured: mean scarcity delta **0.000** over all 32) |
| imported from | `scripts/lib/auc.ts` `shuffleDropDegrade` — the AUC-24 ratchet's own recipe, byte for byte | `scripts/lib/rebuild-experiment-lib.mjs` `degradeClimaxRelocate` |
| lineage number to read it against | AUC-24 (private corpus, feature length) last measured 0.731 | private-corpus act-swap ~0.48 (`doctor.ts:2092-2093`); P1 baseline `CLIMAX_RELOCATE` 0.523 on 153 test scripts |

(b) exists because `scarcityPenalty(sceneCount) = 140 / max(sceneCount,1)`
(`doctor.ts:465-467`, summed into `craftPenalty` at `doctor.ts:657`) is the
doctor's dominant discrimination term — the file's own comment at
`doctor.ts:2092-2093` records "scarcity term AUC 0.938; the weightedIssues rule
channel AUC is 0.076". A degradation that changes scene count is partly
measuring that arithmetic. One that preserves it cancels the term exactly and
leaves order-sensitivity.

---

## 4. Results

Statistics reported for both degradations, because the two lineages define AUC
differently and mixing them has caused trouble before:

* **AUC (all-pairs)** — Mann-Whitney over the full intact × degraded grid.
  `computeAuc` in `scripts/lib/auc.ts`; the AUC-24 definition. **This is the
  statistic the floors assert**, for both degradations, so the two are directly
  comparable to each other.
* **AUC (matched-pair)** — each script against its own degraded self.
  `pairwiseAuc` in `scripts/lib/rebuild-experiment-lib.mjs`; the definition the
  761-script P1 baseline reports.
* Both intervals are seeded 2000-resample percentile bootstraps, **seed 42**,
  resampling scripts with replacement. The matched-pair interval is
  `bootstrapCi` imported verbatim; the all-pairs interval is
  `bootstrapCiAllPairs`, the identical resample with `computeAuc` recomputed
  inside the loop instead of `pairwiseAuc` (documented in
  `scripts/lib/public-benchmark.ts`'s header — `bootstrapCi` hardcodes its
  statistic and cannot produce this interval).

### 4.1 Headline

| degradation | N | AUC (all-pairs) | 95% CI | AUC (matched-pair) | 95% CI | mean health gap | floor |
|---|---|---|---|---|---|---|---|
| `SHUFFLE_DROP` | 32 | **0.5586** | [0.4219, 0.6973] | 0.5313 | [0.3750, 0.6875] | −1.93 | `PUBLIC_SHUFFLE_DROP_FLOOR` = **0.5386** |
| `CLIMAX_RELOCATE` | 32 | **0.4673** | [0.4014, 0.5264] | 0.4219 | [0.2813, 0.5625] | −1.46 | `PUBLIC_ORDER_FLOOR` = **0.4473** |

**Both 95% intervals contain 0.5.** On this corpus the doctor does not reliably
prefer an intact script to a mechanically damaged copy of itself under either
recipe, and the mean health gap is **negative** under both — the damaged copy
scores *higher* on average. Floors are `round4(measured − 0.02)`
(`PUBLIC_FLOOR_MARGIN`, `scripts/lib/auc.ts`).

Partition breakdown (matched-pair, for a set this small the all-pairs grid on 5
scripts is not worth quoting):

| degradation | exploration (N=27) | holdout (N=5) |
|---|---|---|
| `SHUFFLE_DROP` | 0.5556 | 0.4000 |
| `CLIMAX_RELOCATE` | 0.4259 | 0.4000 |

### 4.2 Per-script pairs — `SHUFFLE_DROP`

| file | partition | intact | degraded | gap | scenes |
|---|---|---|---|---|---|
| `chain-of-custody` | exploration | 76.3 | 74.4 | 1.9 | 13→9 |
| `close-quarters` | exploration | 75.6 | 74.4 | 1.2 | 13→9 |
| `code-blue` | exploration | 78.0 | 71.8 | 6.2 | 14→10 |
| `counter-offer` | exploration | 76.0 | 80.0 | −4.0 | 10→7 |
| `dead-frequency` | exploration | 78.3 | 76.8 | 1.5 | 12→8 |
| `high-voltage` | exploration | 75.4 | 74.3 | 1.1 | 13→9 |
| `mise` | holdout | 74.2 | 72.3 | 1.9 | 12→8 |
| `off-season` | holdout | 71.2 | 74.0 | −2.8 | 9→6 |
| `quiet-season` | holdout | 73.2 | 70.7 | 2.5 | 10→7 |
| `red-line` | exploration | 73.7 | 74.7 | −1.0 | 14→10 |
| `room-12` | exploration | 33.5 | 70.0 | −36.5 | 10→7 |
| `runoff` | exploration | 74.6 | 76.7 | −2.1 | 9→6 |
| `same-page` | exploration | 75.8 | 71.4 | 4.4 | 11→8 |
| `soft-launch` | exploration | 77.3 | 72.5 | 4.8 | 12→8 |
| `the-defense-rests` | exploration | 77.0 | 72.5 | 4.5 | 12→8 |
| `the-detour` | exploration | 74.0 | 72.5 | 1.5 | 11→8 |
| `the-key-under-the-mat` | exploration | 74.2 | 72.5 | 1.7 | 11→8 |
| `transfer-window` | exploration | 31.9 | 70.0 | −38.1 | 10→7 |
| `two-lane` | exploration | 79.0 | 74.0 | 5.0 | 13→9 |
| `undertow` | exploration | 77.1 | 72.5 | 4.6 | 12→8 |
| `fence-line-bad` | exploration | 76.0 | 80.0 | −4.0 | 10→7 |
| `fence-line-excellent` | exploration | 76.0 | 80.0 | −4.0 | 10→7 |
| `low-tide-bad` | exploration | 76.0 | 79.9 | −3.9 | 10→7 |
| `low-tide-excellent` | exploration | 76.0 | 80.0 | −4.0 | 10→7 |
| `night-shift-bad` | exploration | 76.0 | 80.0 | −4.0 | 10→7 |
| `night-shift-excellent` | holdout | 76.0 | 80.0 | −4.0 | 10→7 |
| `signal-drift-bad` | holdout | 76.0 | 79.5 | −3.5 | 10→7 |
| `signal-drift-excellent` | exploration | 75.6 | 70.1 | 5.5 | 10→7 |
| `the-deposit-bad` | exploration | 76.0 | 79.9 | −3.9 | 10→7 |
| `the-deposit-excellent` | exploration | 75.1 | 80.0 | −4.9 | 10→7 |
| `the-ledger-bad` | exploration | 74.8 | 70.1 | 4.7 | 10→7 |
| `the-ledger-excellent` | exploration | 76.0 | 70.1 | 5.9 | 10→7 |

### 4.3 Per-script pairs — `CLIMAX_RELOCATE`

Scene count is identical on every row by construction, and asserted
(`tests/core/public-benchmark.test.ts`, "CLIMAX_RELOCATE preserves scene count
on every script"). Eleven of the 32 gaps are exactly 0.0.

| file | partition | intact | degraded | gap |
|---|---|---|---|---|
| `chain-of-custody` | exploration | 76.3 | 75.5 | 0.8 |
| `close-quarters` | exploration | 75.6 | 78.7 | −3.1 |
| `code-blue` | exploration | 78.0 | 78.5 | −0.5 |
| `counter-offer` | exploration | 76.0 | 76.0 | 0.0 |
| `dead-frequency` | exploration | 78.3 | 78.3 | 0.0 |
| `high-voltage` | exploration | 75.4 | 74.7 | 0.7 |
| `mise` | holdout | 74.2 | 75.1 | −0.9 |
| `off-season` | holdout | 71.2 | 74.3 | −3.1 |
| `quiet-season` | holdout | 73.2 | 71.5 | 1.7 |
| `red-line` | exploration | 73.7 | 76.3 | −2.6 |
| `room-12` | exploration | 33.5 | 57.1 | −23.6 |
| `runoff` | exploration | 74.6 | 74.5 | 0.1 |
| `same-page` | exploration | 75.8 | 74.5 | 1.3 |
| `soft-launch` | exploration | 77.3 | 77.6 | −0.3 |
| `the-defense-rests` | exploration | 77.0 | 78.3 | −1.3 |
| `the-detour` | exploration | 74.0 | 74.1 | −0.1 |
| `the-key-under-the-mat` | exploration | 74.2 | 73.1 | 1.1 |
| `transfer-window` | exploration | 31.9 | 48.1 | −16.2 |
| `two-lane` | exploration | 79.0 | 78.7 | 0.3 |
| `undertow` | exploration | 77.1 | 77.5 | −0.4 |
| `fence-line-bad` | exploration | 76.0 | 76.0 | 0.0 |
| `fence-line-excellent` | exploration | 76.0 | 76.0 | 0.0 |
| `low-tide-bad` | exploration | 76.0 | 76.0 | 0.0 |
| `low-tide-excellent` | exploration | 76.0 | 76.0 | 0.0 |
| `night-shift-bad` | exploration | 76.0 | 76.0 | 0.0 |
| `night-shift-excellent` | holdout | 76.0 | 76.0 | 0.0 |
| `signal-drift-bad` | holdout | 76.0 | 76.0 | 0.0 |
| `signal-drift-excellent` | exploration | 75.6 | 75.7 | −0.1 |
| `the-deposit-bad` | exploration | 76.0 | 76.0 | 0.0 |
| `the-deposit-excellent` | exploration | 75.1 | 75.7 | −0.6 |
| `the-ledger-bad` | exploration | 74.8 | 74.6 | 0.2 |
| `the-ledger-excellent` | exploration | 76.0 | 76.0 | 0.0 |

The `CLIMAX_RELOCATE` mean of −1.46 is carried almost entirely by two
saturated scripts. Excluding `room-12` and `transfer-window` — the two shortest
files (427 and 454 words), both pinned near the health floor — the mean gap
over the remaining 30 is **−0.23 points**, i.e. indistinguishable from nothing
happening.

---

## 5. The scene-count-artifact prediction, and what measuring it showed

The brief this lane was built from, and
`docs/audits/`-adjacent reasoning before it, predicted that a short-script
shuffle-drop benchmark would look **~10× more separable** than the private
corpus, because the recipe attacks the scarcity term directly:

```
10-scene script dropped to 7 :  140/7  - 140/10  = 6.00 points of extra penalty
private corpus median 118    :  140/79 - 140/118 = 0.58 points
```

That arithmetic is correct and the conclusion drawn from it is **false**, which
is the most useful thing this benchmark has produced so far. Decomposing every
one of the 32 health deltas into its two halves (`computeHealthScore` evaluated
against each variant's own `bySeverity` / `sceneCount` / `wordCount`, with
`scarcityPenalty = 140/sceneCount` separated out):

| term, `SHUFFLE_DROP`, mean over N=32 | value |
|---|---|
| extra **scarcity** penalty from losing scenes | **+5.693** points |
| change in **density** penalty | **−7.625** points |
| net change in health | **−1.931** (health goes UP under degradation) |

Dropping every third scene removes a larger share of the weighted issues than
of the words — for example `counter-offer` goes from 130.0 weighted issues over
1521 words to 44.5 over 1026 — and `density = weightedIssues / wordCount^0.7`
is convex, so the density penalty collapses faster than scarcity rises. On the
private corpus at 118 scenes the scarcity term moves only 0.58 points and the
density term barely moves at all, which is why the same recipe behaves
differently there.

The same decomposition on `CLIMAX_RELOCATE` returns **scarcity delta exactly
0.000**, confirming the design property that makes it worth reporting: it
cannot be moved by the scene-count channel.

**The lesson, for the next person tempted to argue a number from the formula:**
both of these figures had a confident prediction attached, and running the
measurement changed one of them by 0.4 AUC. `measure-before-threshold` is not
a slogan.

---

## 6. The calibration control (excluded from every asserted number)

`npm run benchmark:public -- --control`:

| band | n | mean health |
|---|---|---|
| strong | 5 | 62.40 |
| competent | 5 | 52.52 |
| weak | 5 | 42.12 |
| troubled | 5 | 37.08 |

Strong over troubled: **5 of 5 ordered, mean gap 25.32**.

Read this against §4 and against the blind pairs (1 of 6 ordered, mean gap
−0.02, `tests/core/blind-pairs-discrimination.test.ts`). The engine separates
the corpus written from its own lexicons cleanly and separates nothing else.
That is the same finding `RULE_CHANNEL_EVIDENCE_2026-08-24.md` and
`BLIND_PAIRS_2026-09-04.md` reached by different routes; this benchmark now
reproduces it on every CI run instead of in a dated document.

---

## 7. The same harness on the three pushed scoring branches

Run on `origin/scoring/*` as pushed (fetched, **not merged**; each extracted to
a scratch tree with only `scripts/lib/public-benchmark.ts` and a JSON runner
copied in, so the doctor under test is that branch's own). No receipt on those
branches changes — this lane touched none of them.

### 7.1 `SHUFFLE_DROP`

| tree | N | AUC (all-pairs) | 95% CI | AUC (matched-pair) | 95% CI | mean gap |
|---|---|---|---|---|---|---|
| `main @ c16f7e0c` | 32 | **0.5586** | [0.4219, 0.6973] | 0.5313 | [0.3750, 0.6875] | −1.93 |
| `scoring/r5-verbosity-bias` | 32 | **0.1245** | [0.0513, 0.2129] | 0.0938 | [0.0000, 0.1875] | −15.78 |
| `scoring/advice-rule-fixes` | 32 | **0.5298** | [0.4033, 0.6548] | 0.4375 | [0.2813, 0.6250] | −3.60 |
| `scoring/stacked-r5-plus-advice` | 32 | **0.1089** | [0.0361, 0.1973] | 0.0938 | [0.0000, 0.1875] | −15.09 |

### 7.2 `CLIMAX_RELOCATE`

| tree | N | AUC (all-pairs) | 95% CI | AUC (matched-pair) | 95% CI | mean gap |
|---|---|---|---|---|---|---|
| `main @ c16f7e0c` | 32 | **0.4673** | [0.4014, 0.5264] | 0.4219 | [0.2813, 0.5625] | −1.46 |
| `scoring/r5-verbosity-bias` | 32 | **0.5034** | [0.4302, 0.5811] | 0.4844 | [0.3281, 0.6563] | −0.19 |
| `scoring/advice-rule-fixes` | 32 | **0.5068** | [0.4482, 0.5640] | 0.4844 | [0.3438, 0.6250] | −1.49 |
| `scoring/stacked-r5-plus-advice` | 32 | **0.4971** | [0.4263, 0.5654] | 0.5313 | [0.3750, 0.7188] | 0.28 |

### 7.3 Manifest movement against `main`, per branch

| branch | health rows moved | verdict rows moved | `words` rows moved | mean health delta |
|---|---|---|---|---|
| `scoring/r5-verbosity-bias` | 32 / 32 | 28 / 32, all `CONSIDER` → `PASS` | 0 / 32 | **−24.73** |
| `scoring/advice-rule-fixes` | 19 / 32 | 0 / 32 | **32 / 32** | −1.84 (over moved rows) |
| `scoring/stacked-r5-plus-advice` | 32 / 32 | 25 / 32, all `CONSIDER` → `PASS` | 32 / 32 | **−22.42** |

### 7.4 What that table does and does not say

**Says, plainly:** had this benchmark existed before those branches were
written, `PUBLIC_SHUFFLE_DROP_FLOOR = 0.5386` would have **failed** on
`scoring/r5-verbosity-bias` (0.1245) and on
`scoring/stacked-r5-plus-advice` (0.1089), and `scoring/advice-rule-fixes`
(0.5298) would have failed too, by 0.009. On this corpus the R5 change inverts
the shuffle-drop statistic: the degraded copy outscores the intact one on
nearly every script (mean gap −15.78 points). It also moves 28 of 32 scripts
from `CONSIDER` to `PASS`, which is the worst of the three coverage verdicts
(`doctor.ts` types: health ≥ 85 and ≥ 8 scenes → `RECOMMEND`, health ≥ 60 →
`CONSIDER`, else `PASS`). That is a large, previously invisible fact about a
branch whose stated purpose is a different (real) defect.

**Does not say** that R5 is wrong. Removing `wordCount` from the density
penalty is a fix for a measured verbosity bias
(`docs/scoring/VERBOSITY_BIAS_2026-07-11.md`, and the `empty_verbosity`
known-failing metamorphic case). What the number says is that on 9–14-scene
scripts the same change makes health track raw issue count, which the
shuffle-drop recipe reduces by a third along with the scenes. Whether that is
also true at feature length is exactly what `npm run measure-real` on the
owner's corpus decides, and this benchmark cannot.

**Does not say** anything about AUC-24 on those branches. Their receipts are
`PENDING OWNER MEASUREMENT` entries and remain so; nothing here discharges
them, and this lane deliberately changed no file on any of those branches.

---

## 8. What this benchmark can and cannot show

**Can**

* Recompute a discrimination number on every CI run, on committed text, by
  anyone, with no corpus mount, no key and no owner step.
* Turn a scoring change's effect on real distributable prose into a reviewable
  numeric diff — 32 rows of `{sceneCount, words, health, verdict}` in
  `tests/fixtures/public-corpus-manifest.json`, plus two AUCs with intervals.
* Settle the scene-count question by measurement rather than arithmetic (§5).
* Catch a large regression in either direction. §7 is the worked example.

**Cannot**

* Show that health tracks **craft**. Mechanical damage is not bad writing. The
  craft question is the blind pairs, and its answer is 1 of 6.
* Transfer to feature-length real writing. N = 32 at 9–14 scenes.
  `ARC_DED_MIN_SCENES` and `CLIMAX_DED_MIN_SCENES` are both 15
  (`doctor.ts:2101`, `doctor.ts:619-622`), so the feature-scale deductions
  never fire on this corpus at all — this benchmark measures a strictly
  smaller engine than the AUC-24 ratchet does.
* Say anything about the AUC-24 ≥ 0.622 ratchet. Different corpus, different
  script length, different denominator. **The owner's `npm run measure-real`
  run is what confirms or refutes transfer, in either direction, and nothing in
  this repository can stand in for it.** If a future corpus run shows the same
  branches behaving well at feature length, that refutes transfer from this
  benchmark; if it shows them behaving as they do here, it confirms it. Both
  outcomes are informative and neither is assumed here.
* Vouch for the source text. Twenty of the 32 scripts are agent-authored; the
  other twelve are one human author's, unlabelled by independent readers.

---

## 9. Where each piece lives

| piece | file |
|---|---|
| harness (corpus discovery, degradations, statistics, intervals, limits text) | `scripts/lib/public-benchmark.ts` |
| floors and the margin | `scripts/lib/auc.ts` — `PUBLIC_SHUFFLE_DROP_FLOOR`, `PUBLIC_ORDER_FLOOR`, `PUBLIC_FLOOR_MARGIN` |
| always-on assertions | `tests/core/public-benchmark.test.ts` |
| manifest lock (32 rows) | `tests/fixtures/public-corpus-manifest.json` |
| pre-registered split | `tests/fixtures/public-benchmark-split.json` |
| CLI | `scripts/benchmark-public.ts`, `npm run benchmark:public` |
| re-lock command | `npm run benchmark:public -- --lock` |
| gate row | `scripts/report-unverified-gates.mjs` `VERIFIED_GATES` (`npm run gates`) |
| receipt | `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`, PUBLIC-CORPUS section |

**Runtime.** 96 doctor runs (32 intact + 32 + 32) plus two 2000-resample
bootstraps: **3.05 s** measured (`npm run benchmark:public -- --json` reports
`elapsedMs`), 4.8 s wall for the whole CLI including Node start. The always-on
test adds the same 3 s to `npm test`, well inside the 60 s budget this lane was
held to.
