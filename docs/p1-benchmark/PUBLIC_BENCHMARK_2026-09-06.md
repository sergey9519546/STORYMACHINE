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
craft result and asserted no floor in the losing direction. This lane adds
discrimination numbers that are **computed end to end on every CI run** — from
32 committed `.fountain` files, through the real doctor, to six AUCs (three
degradations × two statistics) with seeded bootstrap intervals on a
pre-registered split, against six floors. It is not a better number than
AUC-24. It is a number that exists where there was none.

**Round 2 (after independent review) changed three things about how those
numbers read**, and they matter more than the numbers: a **positive control**
was added, because a benchmark whose every reading is null cannot tell a blind
score from a broken harness (§3, §4.4); the **matched-pair statistic is now
primary and floored**, because it is the estimator a paired design earns and it
was the less flattering of the two computed in 7 of 8 cells (§4); and the
`--lock` command now actually re-locks the floors it was documented as
re-locking (§9).

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

**THE SPLIT IS REPORTED, NOT USED — say this before ROADMAP P1's wording
supplies the connection for you.** P1 asks for "a pre-registered split,
held-out evaluation, and uncertainty reporting". This benchmark delivers the
first and the third. It does **not** deliver held-out evaluation: every one of
the six floors was locked from **all 32 scripts, the five holdout files
included**, and the partition AUCs below are printed and asserted nowhere. So
no held-out evaluation has taken place here, and this holdout is already spent
against these floors — you cannot later claim it as clean evidence for a change
tuned against them. The split earns its keep the first time someone tunes on
exploration and checks on holdout against floors re-locked from exploration
alone; until then it is a pre-registration waiting for a use, honestly labelled
as one.

---

## 3. The three degradations, and why there are three

> **Two of these recipes changed on 2026-09-12 and §11 records it.**
> `CLIMAX_RELOCATE` moved the final scene to position TWO, not one, so this
> table's "move the final scene to position 1" was false when written; and
> `SHUFFLE_DROP` segmented scenes on `INT.`/`EXT.` only. Both are fixed, the two
> ORDER floors were re-locked, and every before/after number is in §11. The
> table below describes the recipes as they behaved for the 2026-09-06 run this
> document reports.

| | (a) `SHUFFLE_DROP` | (b) `CLIMAX_RELOCATE` | (c) `DIALOGUE_FLATTEN` |
|---|---|---|---|
| role | measurement | measurement | **POSITIVE CONTROL** |
| recipe | seeded Fisher-Yates shuffle of all scenes, then drop every third of the shuffled order | move the final scene to position 1 | replace every dialogue and parenthetical line with `Hello.` |
| scene count | **changes** (10 → 7) | **preserved** (measured: mean scarcity delta **0.000** over all 32) | preserved |
| imported from | `scripts/lib/auc.ts` `shuffleDropDegrade` — the AUC-24 ratchet's own recipe, byte for byte | `scripts/lib/rebuild-experiment-lib.mjs` `degradeClimaxRelocate` | `scripts/lib/rebuild-experiment-lib.mjs` `degradeDialogueFlatten` |
| lineage number to read it against | AUC-24 (private corpus, feature length) last measured 0.731 | private-corpus act-swap ~0.48 (`doctor.ts:2092-2093`); P1 baseline `CLIMAX_RELOCATE` 0.523 on 153 test scripts | P1 baseline `DIALOGUE_FLATTEN` **0.990** — the one channel that PASSES its ≥0.80 gate |

**(b) exists because scene count is the doctor's dominant term.**
`scarcityPenalty(sceneCount) = 140 / max(sceneCount,1)` (`doctor.ts:465-467`,
summed into `craftPenalty` at `doctor.ts:657`); the file's own comment at
`doctor.ts:2092-2093` records "scarcity term AUC 0.938; the weightedIssues rule
channel AUC is 0.076". A degradation that changes scene count is partly
measuring that arithmetic. One that preserves it cancels the term exactly and
leaves order-sensitivity.

**(c) exists because both measurement channels read chance, and a benchmark
whose every reading is null carries no information.** Given only (a) and (b), a
reader cannot tell **"the score is blind to mechanical damage"** from **"this
harness never worked"** — and every conclusion in this document depends on that
distinction. `DIALOGUE_FLATTEN` is a manipulation the score demonstrably does
catch: **32 of 32 scripts, zero ties, mean gap +29.30 points** (§4.4). So the
instrument separates intact from damaged, on these exact 32 files, through this
exact code path, and the near-chance readings on (a) and (b) are the score's
rather than the harness's.

**It is a control, not evidence, and the difference is the point.** The engine
ships a deduction built specifically for this manipulation — `doctor.ts`'s
dialogue-degradation deduction, motivated in its own header by
`DIALOGUE_FLATTEN` measuring 0.54 at feature scale. Catching a manipulation you
built a detector for is a liveness check, not a discovery. Measured here: of
the 29.30-point mean gap, **16.71 points on average come from outside the
density/scarcity craft formula entirely** (per-script 17.1–18.0 on most files;
`the-ledger-excellent` flattened has craft formula 75.20 and actual health
58.1). That is what makes it a check on the whole instrument rather than a
second reading of the same term: neither (a) nor (b) moves health through
anything but that formula.

---

## 4. Results

Two statistics are computed and **both are floored**, because the two lineages
define AUC differently and mixing them has caused trouble before:

* **AUC (matched-pair) — PRIMARY.** Each script against a degraded copy of
  *itself*. `pairwiseAuc` in `scripts/lib/rebuild-experiment-lib.mjs`; the
  definition the 761-script P1 baseline reports. This is a paired design, so
  the estimator that respects the pairing is the honest reading — and it is
  the **less** flattering of the two in 7 of the 8 measurement cells this
  benchmark has produced across `main` and the three scoring branches.
* **AUC (all-pairs) — secondary.** Mann-Whitney over the full intact ×
  degraded grid. `computeAuc` in `scripts/lib/auc.ts`; the AUC-24 definition.
  It compares script A intact against script B degraded, folding between-script
  variance (author, length, content) back into a comparison the pairing
  controls. Reported and floored because the shuffle-drop recipe comes from
  that lineage and a reader will look for it — never as the headline.
* Both intervals are seeded 2000-resample percentile bootstraps, **seed 42**,
  resampling scripts with replacement. The matched-pair interval is
  `bootstrapCi` imported verbatim; the all-pairs interval is
  `bootstrapCiAllPairs`, the identical resample with `computeAuc` recomputed
  inside the loop instead of `pairwiseAuc` (documented in
  `scripts/lib/public-benchmark.ts`'s header — `bootstrapCi` hardcodes its
  statistic and cannot produce this interval).

### 4.1 Headline

| degradation | N | AUC matched-pair (PRIMARY) | 95% CI | floor | AUC all-pairs | 95% CI | floor | mean gap | ordered/inverted/tied |
|---|---|---|---|---|---|---|---|---|---|
| `SHUFFLE_DROP` | 32 | **0.5313** | [0.3750, 0.6875] | `PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR` = **0.5113** | 0.5586 | [0.4219, 0.6973] | `PUBLIC_SHUFFLE_DROP_FLOOR` = **0.5386** | −1.93 | 17/15/0 |
| `CLIMAX_RELOCATE` | 32 | **0.4219** | [0.2813, 0.5625] | `PUBLIC_ORDER_PAIRED_FLOOR` = **0.4019** | 0.4673 | [0.4014, 0.5264] | `PUBLIC_ORDER_FLOOR` = **0.4473** | −1.46 | 8/13/**11** |
| `DIALOGUE_FLATTEN` *(control)* | 32 | **1.0000** | [1.0000, 1.0000] | `PUBLIC_DIALOGUE_FLATTEN_PAIRED_FLOOR` = **0.98** | 0.9473 | [0.8779, 1.0000] | `PUBLIC_DIALOGUE_FLATTEN_FLOOR` = **0.9273** | +29.30 | 32/0/0 |

**All four measurement-channel intervals contain 0.5.** On this corpus the
doctor does not reliably prefer an intact script to a mechanically damaged copy
of itself under either recipe, and the mean health gap is **negative** under
both — the damaged copy scores *higher* on average. The control reads 1.0000
matched-pair, which is what licenses reading those two nulls as facts about the
score. Floors are `round4(measured − 0.02)` (`PUBLIC_FLOOR_MARGIN`,
`scripts/lib/auc.ts`), rewritten by `npm run benchmark:public -- --lock`.

**A third of `CLIMAX_RELOCATE`'s N cannot move.** Ten of the 32 intact scripts
sit at exactly health **76.0** — density penalty at its 10-point cap plus a
14.0 scarcity term — so relocating a scene inside them changes nothing and
**11 of 32 pairs are exact ties**, contributing 0.5 apiece by construction. Its
point estimate rests on 21 movable scripts, and its narrower interval reflects
that pinning, not precision. Do not read it as the more precise of the two.
`SHUFFLE_DROP` has zero ties.

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

### 4.4 Per-script pairs — `DIALOGUE_FLATTEN` (the control)

Every row ordered, no ties, no exceptions. This is the table that says the
harness works.

| file | partition | intact | flattened | gap |
|---|---|---|---|---|
| `chain-of-custody` | exploration | 76.3 | 35.5 | 40.8 |
| `close-quarters` | exploration | 75.6 | 41.1 | 34.5 |
| `code-blue` | exploration | 78.0 | 42.3 | 35.7 |
| `counter-offer` | exploration | 76.0 | 48.9 | 27.1 |
| `dead-frequency` | exploration | 78.3 | 56.4 | 21.9 |
| `high-voltage` | exploration | 75.4 | 49.1 | 26.3 |
| `mise` | holdout | 74.2 | 22.5 | 51.7 |
| `off-season` | holdout | 71.2 | 30.4 | 40.8 |
| `quiet-season` | holdout | 73.2 | 39.2 | 34.0 |
| `red-line` | exploration | 73.7 | 40.6 | 33.1 |
| `room-12` | exploration | 33.5 | 0.0 | 33.5 |
| `runoff` | exploration | 74.6 | 56.2 | 18.4 |
| `same-page` | exploration | 75.8 | 34.6 | 41.2 |
| `soft-launch` | exploration | 77.3 | 48.9 | 28.4 |
| `the-defense-rests` | exploration | 77.0 | 25.8 | 51.2 |
| `the-detour` | exploration | 74.0 | 48.2 | 25.8 |
| `the-key-under-the-mat` | exploration | 74.2 | 35.3 | 38.9 |
| `transfer-window` | exploration | 31.9 | 0.0 | 31.9 |
| `two-lane` | exploration | 79.0 | 52.9 | 26.1 |
| `undertow` | exploration | 77.1 | 52.5 | 24.6 |
| `fence-line-bad` | exploration | 76.0 | 47.3 | 28.7 |
| `fence-line-excellent` | exploration | 76.0 | 56.9 | 19.1 |
| `low-tide-bad` | exploration | 76.0 | 52.0 | 24.0 |
| `low-tide-excellent` | exploration | 76.0 | 58.0 | 18.0 |
| `night-shift-bad` | exploration | 76.0 | 52.0 | 24.0 |
| `night-shift-excellent` | holdout | 76.0 | 58.9 | 17.1 |
| `signal-drift-bad` | holdout | 76.0 | 52.6 | 23.4 |
| `signal-drift-excellent` | exploration | 75.6 | 57.1 | 18.5 |
| `the-deposit-bad` | exploration | 76.0 | 50.0 | 26.0 |
| `the-deposit-excellent` | exploration | 75.1 | 52.2 | 22.9 |
| `the-ledger-bad` | exploration | 74.8 | 42.7 | 32.1 |
| `the-ledger-excellent` | exploration | 76.0 | 58.1 | 17.9 |

Note the two scripts that were already pinned near the floor (`room-12`,
`transfer-window`) reach health **0.0** here: the control is strong enough to
saturate the low end, which is another reason its matched-pair AUC is 1.0000
while its all-pairs AUC is 0.9473 — the all-pairs grid compares those floored
scripts against other scripts' intact values.

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
| extra **scarcity** PENALTY from losing scenes | **+5.693** points |
| change in **density** PENALTY | **−7.625** points |
| net change in penalty = mean health **gap** (intact − degraded) | **−1.931** |
| net change in **health** | **+1.931** — health goes UP under degradation |

(The first three rows are penalty deltas and sum to −1.932; the last flips the
sign because a penalty going down is health going up. Round 1 printed the third
row labelled "net change in health", which contradicted its own parenthetical —
corrected here after the independent review caught it.)

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
both of these channels had a confident prediction attached. The prediction for
`CLIMAX_RELOCATE` ("near chance") held — measured 0.4219 matched-pair. The
prediction for `SHUFFLE_DROP` ("inflated by the scene-count artifact, and so
much higher than the private corpus's number") did not: it measured 0.5313,
which is not high, and the sign of the mean gap runs the opposite way to what
the argument implies. No numeric prediction was ever written down for it, so
there is no delta to quote — only a direction, and the direction was wrong.
`measure-before-threshold` is not a slogan.

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

Run on `origin/scoring/*` **at the SHAs named in every row below** (fetched and
`git archive`-extracted to scratch trees, **not merged**; only
`scripts/lib/public-benchmark.ts` and a JSON runner were copied in, so the
doctor under test is that branch's own). Those refs move — the 2026-09-06
branch-sync review records them at `cfb7233c` / `c1873e3c` / `1bae835d` earlier
the same week — so a table without SHAs is unverifiable a day later. No receipt
on those branches changes; this lane touched no file on any of them.

Matched-pair is the primary statistic in every table.

### 7.1 `SHUFFLE_DROP`

| tree | N | AUC matched-pair (PRIMARY) | 95% CI | AUC all-pairs | 95% CI | mean gap | ord/inv/tie |
|---|---|---|---|---|---|---|---|
| `main @ c16f7e0c` | 32 | **0.5313** | [0.3750, 0.6875] | 0.5586 | [0.4219, 0.6973] | −1.93 | 17/15/0 |
| `scoring/r5-verbosity-bias @ 52bf410a` | 32 | **0.0938** | [0.0000, 0.1875] | 0.1245 | [0.0513, 0.2129] | −15.78 | 3/29/0 |
| `scoring/advice-rule-fixes @ a1cf7677` | 32 | **0.4375** | [0.2813, 0.6250] | 0.5298 | [0.4033, 0.6548] | −3.60 | 14/18/0 |
| `scoring/stacked-r5-plus-advice @ 408166ae` | 32 | **0.0938** | [0.0000, 0.1875] | 0.1089 | [0.0361, 0.1973] | −15.09 | 3/29/0 |

### 7.2 `CLIMAX_RELOCATE`

| tree | N | AUC matched-pair (PRIMARY) | 95% CI | AUC all-pairs | 95% CI | mean gap | ord/inv/tie |
|---|---|---|---|---|---|---|---|
| `main @ c16f7e0c` | 32 | **0.4219** | [0.2813, 0.5625] | 0.4673 | [0.4014, 0.5264] | −1.46 | 8/13/11 |
| `scoring/r5-verbosity-bias @ 52bf410a` | 32 | **0.4844** | [0.3281, 0.6563] | 0.5034 | [0.4302, 0.5811] | −0.19 | 15/16/1 |
| `scoring/advice-rule-fixes @ a1cf7677` | 32 | **0.4844** | [0.3438, 0.6250] | 0.5068 | [0.4482, 0.5640] | −1.49 | 10/11/11 |
| `scoring/stacked-r5-plus-advice @ 408166ae` | 32 | **0.5313** | [0.3750, 0.7188] | 0.4971 | [0.4263, 0.5654] | +0.28 | 17/15/0 |

Note the tie column: R5 un-pins the density cap (1 tie instead of 11), so on
that branch this channel is measuring 31 movable scripts rather than 21. The
AUC moving from 0.4219 to 0.4844 is partly that, not only order-sensitivity.

### 7.3 `DIALOGUE_FLATTEN` — the control, on every tree

| tree | N | AUC matched-pair (PRIMARY) | 95% CI | AUC all-pairs | 95% CI | mean gap | ord/inv/tie |
|---|---|---|---|---|---|---|---|
| `main @ c16f7e0c` | 32 | **1.0000** | [1.0000, 1.0000] | 0.9473 | [0.8779, 1.0000] | +29.30 | 32/0/0 |
| `scoring/r5-verbosity-bias @ 52bf410a` | 32 | **1.0000** | [1.0000, 1.0000] | 0.9019 | [0.8467, 0.9639] | +20.16 | 32/0/0 |
| `scoring/advice-rule-fixes @ a1cf7677` | 32 | **0.9844** | [0.9531, 1.0000] | 0.9458 | [0.8716, 1.0000] | +34.65 | 31/0/1 |
| `scoring/stacked-r5-plus-advice @ 408166ae` | 32 | **1.0000** | [1.0000, 1.0000] | 0.9375 | [0.8818, 0.9883] | +21.55 | 32/0/0 |

**This row is what makes §7.1 readable.** The control holds on all four trees,
so R5's 0.0938 is not a harness that stopped working on that branch — the same
harness, on the same 32 files, still separates intact from flattened 32 of 32
there. The inversion is the score's.

### 7.4 Manifest movement against `main`, per branch

| branch | health rows moved | verdict rows moved | `words` rows moved | mean health delta |
|---|---|---|---|---|
| `scoring/r5-verbosity-bias @ 52bf410a` | 32 / 32 | 28 / 32, all `CONSIDER` → `PASS` | 0 / 32 | **−24.73** (over the 32 moved) |
| `scoring/advice-rule-fixes @ a1cf7677` | 19 / 32 | 0 / 32 | **32 / 32** | **−3.11** (over the 19 moved; −1.84 spread across all 32) |
| `scoring/stacked-r5-plus-advice @ 408166ae` | 32 / 32 | 25 / 32, all `CONSIDER` → `PASS` | 32 / 32 | **−22.42** (over the 32 moved) |

### 7.5 What that table does and does not say

**Says, plainly:** had this benchmark existed before those branches were
written, the floors would have **failed on all three**. On the primary
matched-pair statistic against `PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR = 0.5113`:
`r5` 0.0938, `stacked` 0.0938, `advice` 0.4375. On the secondary all-pairs
statistic against `PUBLIC_SHUFFLE_DROP_FLOOR = 0.5386`: 0.1245, 0.1089, and
0.5298 (short by 0.0088). On this corpus the R5 change inverts the shuffle-drop
statistic — the degraded copy outscores the intact one on **29 of 32** scripts,
mean gap −15.78 points. It also moves 28 of 32 scripts from `CONSIDER` to
`PASS`, the worst of the three coverage verdicts (`doctor.ts` types: health ≥ 85
and ≥ 8 scenes → `RECOMMEND`, health ≥ 60 → `CONSIDER`, else `PASS`). That is a
large, previously invisible fact about a branch whose stated purpose is a
different (real) defect.

**Does not say** that R5 is wrong. Removing `wordCount` from the density
denominator is a fix for a measured verbosity bias
(`docs/scoring/VERBOSITY_BIAS_2026-07-11.md`, and the `empty_verbosity`
known-failing metamorphic case). What the number says is that on 9–14-scene
scripts the same change makes health track raw issue count, which the
shuffle-drop recipe reduces to a measured 0.502 of its intact value along with
the scenes — and that R5 replaces the bounded sub-density logistic with an
unbounded squared term, so nothing caps the resulting collapse. Whether that is
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
  `tests/fixtures/public-corpus-manifest.json`, plus six AUCs with intervals.
* Settle the scene-count question by measurement rather than arithmetic (§5).
* Catch a large regression in either direction. §7 is the worked example.
* **Show that the harness itself works, separately from what it reads.** The
  `DIALOGUE_FLATTEN` control separates intact from damaged on 32 of 32 scripts
  with zero ties, on every tree measured including all three scoring branches
  (§7.3). That is the one hypothesis a benchmark of pure nulls can never rule
  out on its own, and it is ruled out here.

**Cannot**

* Show that health tracks **craft**. Mechanical damage is not bad writing. The
  craft question is the blind pairs, and its answer is 1 of 6.
* Give a moving reading on a third of the `CLIMAX_RELOCATE` sample. Ten of the
  32 scripts sit pinned at exactly health **76.0** (density penalty at its
  10-point cap plus a 14.0 scarcity term), so **11 of 32 pairs are exact ties**
  contributing 0.5 apiece by construction. That channel's estimate rests on 21
  movable scripts and its narrower interval reflects pinning, not precision —
  it is not the more precise of the two.
* Deliver a **held-out evaluation**. The split is pre-registered and reported;
  all six floors were locked from all 32 scripts, holdout included (§2).
* Prove anything with the control. `DIALOGUE_FLATTEN` is a manipulation the
  engine ships a dedicated deduction for. It proves the instrument reads, not
  that the score is valid — and mistaking one for the other would be the
  worst possible misreading of this document.
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
| floors (six) and the margin | `scripts/lib/auc.ts` — `PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR`, `PUBLIC_SHUFFLE_DROP_FLOOR`, `PUBLIC_ORDER_PAIRED_FLOOR`, `PUBLIC_ORDER_FLOOR`, `PUBLIC_DIALOGUE_FLATTEN_PAIRED_FLOOR`, `PUBLIC_DIALOGUE_FLATTEN_FLOOR`, `PUBLIC_FLOOR_MARGIN`, and the `PUBLIC_FLOORS` mapping |
| always-on assertions | `tests/core/public-benchmark.test.ts` |
| manifest lock (32 rows) | `tests/fixtures/public-corpus-manifest.json` |
| pre-registered split | `tests/fixtures/public-benchmark-split.json` |
| CLI | `scripts/benchmark-public.ts`, `npm run benchmark:public` |
| re-lock command | `npm run benchmark:public -- --lock` — rewrites the manifest, the split, **and the six floor constants in `scripts/lib/auc.ts`**, printing every `before -> after`. Round 1 claimed it re-locked the floors and did not; that is fixed rather than reworded. If any constant is not in the single-line shape it edits, it writes **no floor at all** — not even the ones it found, since a half-re-locked set is the one state nobody can reason about — and **exits 1**, naming the fixtures it had already written so you know the tree is partially re-locked. (A refusal used to exit 0, which looked exactly like success.) What it still does **not** rewrite is prose: the narrative in `auc.ts` and the numbers in this document are yours, and `tests/core/public-benchmark.test.ts` fails until both agree with the measurement. Re-lock ONLY after a scoring change you intended, and read the `auc.ts` diff — a re-lock after an unintended regression silently lowers the ratchet, which is the one way this machinery can be defeated. |
| gate row | `scripts/report-unverified-gates.mjs` `VERIFIED_GATES` (`npm run gates`) |
| receipt | `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`, PUBLIC-CORPUS section |

**Runtime.** 128 doctor runs (32 intact + 32 shuffle-drop + 32 climax-relocate
+ 32 dialogue-flatten) plus three 2000-resample bootstraps: **3.75 s** measured
(`npm run benchmark:public -- --json` reports `elapsedMs`; the control added
~0.70 s to round 1's 3.05 s), 5.0 s wall for the whole CLI including Node
start. `tests/core/public-benchmark.test.ts` is **5.66 s** wall on its own,
well inside the 60 s budget this lane was held to.

**`npm run gates` got slower, and that is a deliberate CI-time change, not a
side effect.** The reporter now RUNS each verified gate's suite and reads its
exit code — checking the fixture alone let a deleted suite still print `[RAN]`
— so it costs **5.8–6.4 s** (measured over three consecutive runs) instead of a
fraction of a second, essentially all of it this benchmark's 128 doctor runs.
The CI step is `if: always()` and otherwise unchanged. It is stated here and in
`scripts/report-unverified-gates.mjs`'s own header rather than left for someone
to find in a build-time graph, and it will scale with however many verified
gates are added later. `tests/scripts/report-unverified-gates.test.ts` pays the
same cost once (6.09 s): its five separate invocations of the reporter were
hoisted to one shared call, because six copies of the same string are not worth
six suite runs.

**`npm run gates` got slower AGAIN on 2026-09-12, for the same kind of reason.**
The adversarial review's finding 7 showed that running the suite and reading its
exit code does not survive "the file is still there but its assertions were
gutted": a suite that keeps every title, runs the real 32-script measurement and
asserts `Number.isFinite(auc)` exits 0, and the reporter printed `[RAN]` for it.
The reporter now runs each verified suite **twice** — once as itself, once with
one floor constant raised above its own measured value (in memory, via
`scripts/lib/raise-auc-floor-hook.mjs`; never on disk) — and requires the second
run to fail on that floor *by name*. Measured on the 2026-09-12 sandbox, three
consecutive runs each, measured back to back on one machine: **5.86–6.51 s** for
the single-run reporter at `main @ 59bbaf55` and **11.47–11.68 s** for this one
(one suite run is 5.92–6.15 s on the same machine, so the cost is simply the
suite, paid twice). Sandbox load moved the absolute numbers by 20% inside this one
session — measure the pair side by side if you re-measure; the ~1.9x RATIO is the
part that is about this change.
`tests/scripts/report-unverified-gates.test.ts` went from ~6 s to **22.0–22.5 s**:
one hoisted reporter invocation (~11.5 s) plus two memoised spawns of the
committed gutted fixture
(`tests/fixtures/gate-liveness/gutted-public-benchmark-suite.ts`), with the
genuine-suite case reading the hoisted output instead of paying for a third
pair. The numbers in this paragraph and in that script's header are the
same measurement; the 2026-09-06 cost change above was recorded the same way and
is kept rather than overwritten.

---

## 10. For the scoring lane, not this one: the density term rewards deletion

This is the independent reviewer's §5.1 finding, carried here verbatim in
substance because it is the most useful thing the benchmark surfaced and it
must not be left only in a benchmark document. **It is not a finding this lane
can act on** — it is `doctor.ts`, it crosses the receipt gate, and it belongs
to whoever picks up the density-term work.

> The lane's refutation is right, and the reason it is right is worse than the
> doc says. Under shuffle-drop the corpus retains **72.5% of its words but only
> 50.2% of its weighted issues**, so `density = weightedIssues / wordCount^0.7`
> falls hard — and the sub-density branch is a logistic with **steepness 50
> around midpoint 0.52** (`doctor.ts:447-449`), i.e. a near-step function whose
> entire 0→10-point range is traversed by a density move of about ±0.05.
> `counter-offer` crosses it in one step: density 0.7699 → 0.3472, density
> penalty **10.000 → 0.000**, and health rises 4 points while a third of the
> script is deleted. `room-12` gains **36.5 points** the same way.
>
> Stated as a property of the score rather than of the benchmark: **on
> 9–14-scene scripts the health formula pays you to delete a third of your
> scenes.**

Two consequences this document already records: the same saturation pins **10
of the 32 scripts at exactly health 76.0**, which is where `CLIMAX_RELOCATE`'s
11 exact ties come from (§4.1, §8); and it is why `SHUFFLE_DROP`'s mean health
gap is negative on `main` before any branch is involved (§5).

The reviewer's reading of why R5 amplifies this eightfold, also recorded here
so the branch table is not the only place it lives: R5 replaces the density
denominator `wordCount^0.7` with `(sceneCount × 30)^0.7` **and** drops the
bounded sub-density logistic for an unbounded `8 · density²`. Shuffle-drop
removes a third of the scenes, so R5's denominator shrinks by
`(2/3)^0.7 ≈ 0.752` while the numerator falls to a measured 0.502 — density
lands at ≈0.67 of intact, and a squared, uncapped penalty at ≈0.45. On `main`
the logistic's 10-point ceiling absorbs most of that; R5 removes the ceiling.
The result is not a new inversion — `main`'s own mean gap is already −1.93 with
15 of 32 inverted — it is the same inversion unmasked and amplified: 29 of 32
inverted, mean gap −15.78.

---

## 11. Re-lock, 2026-09-12 — an INSTRUMENT change, not a scoring change

Everything above §11 is the 2026-09-06 run and is left as written: it is the
record of what was measured that day, with the degradation as it then behaved.
This section records what changed on 2026-09-12, why, and every number that
moved. It is the second entry in this document's history of cost and floor
changes, and it is recorded the same way the first one was.

### 11.1 What was wrong with the instrument

`docs/audits/2026-09-12-adversarial/engine-logic.md` finding 12, reproduced and
confirmed:

1. **`CLIMAX_RELOCATE` moved the final scene to position TWO, not one.**
   `scripts/lib/rebuild-experiment-lib.mjs` did `scenes.pop()` then
   `scenes.splice(1, 0, last)`. Index 1 is the second slot, so the script's
   ORIGINAL OPENING — its most load-bearing position — stayed exactly where it
   was. Meanwhile this document's §3 table, the degradation's `label`, its
   `recipe` string and `docs/brain/Gates/Gate - Public Benchmark.md` all said
   "move the final scene to position 1". The test that covered it
   (`tests/core/rebuild-experiment.test.ts`) asserted `[ONE, SIX, TWO, …]` —
   it encoded the bug, which is why nothing caught it.
2. **No degradation asserted that it changed its input.**
   `measurePublicBenchmark` skipped a script only when `apply` returned `null`.
   A recipe that silently no-opped scored a script against an identical copy of
   itself, and the resulting EXACT TIE was counted as a legitimate observation
   worth 0.5 — the one value indistinguishable from "the engine read this pair
   and could not separate it".
3. **`shuffleDropDegrade` — byte-for-byte the AUC-24 recipe — split scenes on
   `INT.`/`EXT.` only** (`/^(?=INT\.|EXT\.)/mi`), so `EST.`, `I/E.`,
   `INT./EXT.` and Fountain forced `.HEADING` lines were invisible to it. On a
   synthetic mixed-heading script the three segmenters then in play saw 2, 4 and
   5 scenes (harness, rebuild-experiment-lib, doctor) and the degradation was a
   **no-op**. On the 32 committed scripts all three agreed, so the defect was
   latent here; the AUC-24 corpus is real screenplays and uses all four forms.

### 11.2 What was built

* **One segmenter**, `scripts/lib/scene-segments.ts`, whose grammar is not a
  fourth opinion: it reads the doctor's own `scene_heading` classification off
  `src/lib/fountain.ts`'s `parseFountain`. Its slices are verbatim, so
  `head + scenes.join('') === text` and every surviving scene is byte-identical
  to its source. `tests/core/scene-segments.test.ts` asserts it agrees with
  `analyzeFountainText(...).sceneCount` on **all 32 committed scripts** and on a
  synthetic script using every heading form the parser recognises — and asserts
  that the old `INT.`/`EXT.`-only split UNDERCOUNTS that script, so the change
  cannot be cosmetic. `scripts/lib/auc.ts` and
  `scripts/lib/rebuild-experiment-lib.mjs` both use it; neither carries a
  heading regex any more.
* **Assertions at every point a degradation becomes an observation.**
  `assertDegradationChangedText` (a no-op is an error, never a tie) and
  `assertFinalSceneIsFirst` (the final scene IS first, and the scene count is
  unchanged) live in `scripts/lib/auc.ts` and are applied by
  `scripts/lib/public-benchmark.ts`'s three `apply` functions,
  `scripts/lock-auc24.mjs`, and `tests/core/real-script-corpus.test.ts`. The
  recipes themselves stay total pure functions, because
  `tests/core/auc.test.ts`'s byte-for-byte oracle depends on that.
* **`CLIMAX_RELOCATE` now relocates to position one**, as documented.

### 11.3 Every number that moved

Measured with `npm run benchmark:public` on this tree, before and after, N=32,
2000-resample bootstrap at seed 42 both times.

| | statistic | 2026-09-06 | 2026-09-12 | floor before | floor after |
|---|---|---|---|---|---|
| `SHUFFLE_DROP` | matched-pair (PRIMARY) | 0.5313 | **0.5313** | 0.5113 | 0.5113 |
| `SHUFFLE_DROP` | all-pairs | 0.5586 | **0.5586** | 0.5386 | 0.5386 |
| `CLIMAX_RELOCATE` | matched-pair (PRIMARY) | 0.4219 | **0.4063** | 0.4019 | **0.3863** |
| `CLIMAX_RELOCATE` | all-pairs | 0.4673 | **0.4443** | 0.4473 | **0.4243** |
| `DIALOGUE_FLATTEN` (control) | matched-pair | 1.0000 | **1.0000** | 0.98 | 0.98 |
| `DIALOGUE_FLATTEN` (control) | all-pairs | 0.9473 | **0.9473** | 0.9273 | 0.9273 |

| `CLIMAX_RELOCATE`, other statistics | 2026-09-06 | 2026-09-12 |
|---|---|---|
| 95% CI, matched-pair | [0.2813, 0.5625] | [0.2656, 0.5469] |
| 95% CI, all-pairs | [0.4014, 0.5264] | [0.3662, 0.5112] |
| ordered / inverted / tied | 8 / 13 / 11 | 8 / 14 / **10** |
| mean health gap (intact − degraded) | −1.46 | **−1.23** |
| scripts pinned at health 76.0 | 10 | 10 (unchanged) |
| ties that are pinned scripts | 10 of 11 | **9 of 10** |

**Why `SHUFFLE_DROP` did not move at all.** The new segmentation produces
**byte-identical output on all 32 scripts** (measured: 0 of 32 differ) because
every heading in this corpus is a plain `INT.`/`EXT.` at column 0. That is the
evidence the segmenter change is the narrow one claimed rather than a rewrite of
the degradation: the channel whose recipe changed and whose text did not, did
not move.

**Why `CLIMAX_RELOCATE` moved.** Two contributions, measured separately before
the re-lock:

| variant | matched-pair | all-pairs | ordered/inverted/tied |
|---|---|---|---|
| old (line-join reassembly, position two) | 0.4219 | 0.4673 | 8 / 13 / 11 |
| new segmenter + reassembly, still position two | 0.4375 | 0.4736 | 9 / 13 / 10 |
| new segmenter + **position one** (shipped) | **0.4063** | **0.4443** | 8 / 14 / 10 |

So the lossless reassembly alone would have RAISED both statistics (+0.0156 /
+0.0063); correcting the position then lowered them past where they started
(−0.0156 / −0.0230 net against 2026-09-06). **The corrected manipulation is the
stronger one and the engine reads it slightly worse** — inverted pairs 13 → 14
of 32 — which is the direction an order-blind score predicts. It is not evidence
of a regression; it is a more honest reading of the same engine.

### 11.4 Receipt-style note: the score did not move, the instrument did

This is the statement a reader of the floor diff needs, and it is checkable three
ways rather than asserted:

* **No scoring-path file was touched.**
  `node scripts/check-scoring-receipt.mjs 59bbaf55..HEAD` ends with
  *"no scoring-path files changed. OK."* — so no measurement receipt is required
  or implied, and none was added to `MEASUREMENT_RECEIPTS.md` as though a scoring
  change had been measured.
* **Doctor output identity is 45/45 byte-identical.**
  `scripts/check-doctor-output-identity.mjs --compare` over the full fixture set
  (20 `data/screenplays` + 20 calibration samples + the P0 sample + the
  nonlinear/synthetic fixtures) against a `git archive 59bbaf55` baseline:
  *"OUTPUT IDENTITY: PASS — all 45 reports are byte-identical (analyzedAt
  excluded)."*
* **The 32-row manifest re-locked to its previous bytes.**
  `npm run benchmark:public -- --lock` produced **no diff** in
  `tests/fixtures/public-corpus-manifest.json` or
  `tests/fixtures/public-benchmark-split.json` — every intact `sceneCount`,
  `words`, `health` and `verdict` is exactly what it was. Only two of the six
  floor constants in `scripts/lib/auc.ts` changed.

**Which direction, and by how much:** the two ORDER floors fell, by **0.0156**
(matched-pair, 0.4019 → 0.3863) and **0.0230** (all-pairs, 0.4473 → 0.4243),
because the **degradation got STRONGER**, not because the score got worse. The
four other floors are unchanged. A floor that falls is the one movement this
machinery is most easily defeated by, so the decomposition in §11.3 exists to
show exactly which edit moved which number.

### 11.5 What this does to the AUC-24 lock

`shuffleDropDegrade` is byte-for-byte the AUC-24 recipe, so changing its
segmenter changes what `npm run lock-auc24` will measure on the owner's corpus.

* **Nothing was invalidated.** `tests/fixtures/auc24-table.json` has never
  existed — the table has not been locked even once (§ this document's §9 gate
  row, and `scripts/report-unverified-gates.mjs`'s `expires: 2026-10-01`).
* **The last recorded AUC-24, 0.731, was measured on the OLD recipe**
  (2026-07-11, `MEASUREMENT_RECEIPTS.md` §2.1). The owner's lock must run on the
  new one, and **its number is the first AUC-24 figure this segmentation has ever
  produced — it is not comparable to 0.731.**
* **`AUC24_FLOOR` is deliberately untouched at 0.622.** Moving a floor is a
  measurement's job.
* `AUC24_DEGRADATION_ID` is bumped to `shuffle-drop/v2`, so an old-recipe table
  can never be silently compared to a new measurement.

The same four statements are in `scripts/lib/auc.ts`'s header, `CLAUDE.md`'s
"Which floor, exactly" section, and `docs/brain/Gates/Gate - AUC-24 Ratchet.md`.
