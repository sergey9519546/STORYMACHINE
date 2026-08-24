# CLIMAX_RELOCATE — Noun-Type Novelty, Re-Derived (P-3, 2026-08-24)

**Purpose:** `docs/PATH_TO_EXCELLENCE.md` P-3 — "The CLIMAX_RELOCATE wall: the
one sanctioned next experiment is noun-type-aware novelty (proper vs.
relational/anaphoric reference), reproduced from committed source against the
real corpus — the prior result is marked unreproducible-historical and must not
be cited until re-derived."

**Status: EVIDENCE ONLY. Nothing is wired.** No deduction, no rule, no scoring
change. `node scripts/check-scoring-receipt.mjs` exits 0 over this change with
no receipt.

**Harness:** `scripts/rederive-climax-relocate.ts` —
`node --experimental-strip-types scripts/rederive-climax-relocate.ts`.
Raw output: `scripts/output/climax-relocate-rederivation.json`.

**Companion:** `docs/p1-benchmark/RULE_CHANNEL_EVIDENCE_2026-08-24.md` (P-2,
same session).

---

## 0. Bottom line first

**The historical claim's DIRECTION reproduces; its MAGNITUDE does not; and the
noun-type layer P-3 sanctioned does exactly what P-3 predicted it would do —
without producing a discriminator this corpus can defend.**

1. **A reachability defect blocks literal reproduction.** All four committed
   probes in the 2026-08-05 family select their corpus with
   `.filter(f => f.endsWith('.fountain.txt'))`. The in-repo CC0 corpus uses
   `.fountain`. All four therefore select **zero files** and exit 0 having
   measured nothing — including the two commands
   `NOVELTY_SIGNAL_2026-08-05.md` names in its own "Reproduction" section.
2. **Rebuilt from committed pieces, the targeted claim's direction holds and
   its numbers do not.** Historical: intact 0.31 → relocated 0.76,
   delta +0.45, 10/11 rose. Measured now on 18 CC0: intact 0.25 → relocated
   0.53, **delta +0.28, 18/18 rose**. The rise is real and universal on this
   material; it is ~40% smaller than reported.
3. **The noun-type contrast behaves as hypothesised — and that is the useful
   finding.** Against a specificity control this harness adds (move a *middle*
   scene to the front instead of the climax), proper-noun novelty is
   **anti-specific** (fires *more* on the benign move, gap −0.105) while the
   relational-reference formulation is **specific** (gap +0.118). That is
   precisely the confusion `NOVELTY_SIGNAL` said a viable discriminator would
   have to resolve, now measured rather than argued.
4. **No formulation is defensible as a detector on this corpus.** Four of five
   fail sensitivity; the one that passes both conditions (anaphoric-marker
   density at scene 1, AUC 0.645 [0.539, 0.750]) is one positive out of five
   unregistered tests on 38 short scripts, which is the weakest kind of
   positive result there is.

**Verdict on the historical claim: PARTIALLY SUPPORTED in direction,
UNSUPPORTED in magnitude, and UNDECIDABLE as a detector in-repo.** It should
stay marked unreproducible-historical. Its numbers must still not be cited.

---

## 1. What the committed source actually computes

The targeted probe behind the 10/11 claim was never committed —
`NOVELTY_SIGNAL_2026-08-05.md` says so itself. What *is* committed, and what
this re-derivation is built from:

| Committed piece | File | What it does |
|---|---|---|
| `segment()` | `probe-forward-reference.mjs:32-42`, `probe-novelty-global.mjs:27-37` (byte-identical) | Splits on `/^(INT|EXT)\./`, folds the preamble into scene 0 |
| `relocate()` | `probe-novelty-global.mjs:38` | Pops the last scene, splices it at index 1 |
| `shuffle()` | `probe-novelty-global.mjs:39-44` | Lehmer RNG seeded 42, Fisher-Yates |
| `midpointDrop()` | `probe-novelty-global.mjs:45-48` | Drops scenes 40%–60% |
| `properNouns()` + `STOP` | `probe-forward-reference.mjs:61-73` | All-caps tokens ≥3 chars, plus capitalized non-line-initial words, minus a 100-entry stoplist. Returns DISTINCT nouns per scene |

All five are copied verbatim into `scripts/rederive-climax-relocate.ts` with
line provenance. The targeted *statistic* is rebuilt on top of them from
`NOVELTY_SIGNAL`'s prose specification.

**Stated plainly: a rebuilt statistic is not the original probe.** This
document never claims the historical table was reproduced, only that the
measure it described was reconstructed from the pieces that survived.

### 1a. The reachability defect

```
files matching *.fountain.txt (what the committed probes glob): 0
files matching *.fountain   (what is actually on disk):         20
```

Affected, all with the same selector:

- `scripts/probe-novelty-global.mjs:25`
- `scripts/probe-forward-reference.mjs:29`
- `scripts/probe-climax-relocate-discrimination.mjs:34`
- `scripts/probe-climax-locators.mjs:26`

Each exits 0 with an empty result table — a silent no-op, not a failure, which
is why it survived. `NOVELTY_SIGNAL_2026-08-05.md`'s "Reproduction" section
offers two of them as the commands that reproduce its committed formulations;
on this checkout they reproduce nothing. This harness reads `*.fountain`
instead of inheriting the bug. **The four probe files are left untouched
(deletion moratorium, and a one-character fix to a probe is a separate,
reviewable change — not something to slip into an evidence lane).**

---

## 2. The targeted claim, rebuilt

Method per `NOVELTY_SIGNAL`: take the original last scene (the climax),
compute what fraction of its proper nouns do not appear in any scene before it;
relocate it to index 1 and recompute against the new near-empty prior set.

Corpus: 18 CC0 `.fountain` scripts (trainval; the 2 files in the hash-locked
held-out test partition are excluded per `MEASUREMENT_RUNBOOK.md`) plus the 20
calibration samples as a sensitivity read.

| | intact mean (range) | relocated mean (range) | delta mean (range) | rose > 0.1 |
|---|---|---|---|---|
| **Historical (claim under test, not evidence)** | 0.31 (0.12–0.55) | 0.76 (0.59–0.92) | **+0.45** (+0.10 to +0.72) | 10/11 |
| **CC0 only, n=18, this run** | 0.25 (0.00–0.50) | 0.53 (0.25–1.00) | **+0.28** (+0.11 to +0.60) | **18/18 (100%)** |
| **All 38 sources, this run** | 0.25 (0.00–0.50) | 0.51 (0.17–1.00) | **+0.26** (+0.00 to +0.67) | 35/38 (92%) |

**What reproduces:** the direction, unanimously. Every one of the 18 CC0
scripts rises by more than 0.1 — a *stronger* consistency result than the
reported 10/11.

**What does not:** the magnitude. Both endpoints sit lower than reported
(intact 0.25 vs 0.31, relocated 0.53 vs 0.76) and the delta is 38% smaller
(+0.28 vs +0.45). Since the corpus is not the same corpus and the probe is not
the same probe, this is not evidence the historical numbers were wrong — it is
evidence they cannot be carried forward as figures.

**What this statistic is not:** a detector. It is **oracle-assisted** — it is
*told* which scene moved. `NOVELTY_SIGNAL`'s central difficulty was that a real
detector does not know that, and the four global formulations that tried to
remove the oracle all failed. Part 3 measures detectors.

---

## 3. Noun-type-aware formulations, measured

### 3a. The type distinction, as implemented

| Type | Definition | Why it should behave differently |
|---|---|---|
| **PROPER** | `properNouns()`, committed verbatim | A name being INTRODUCED. Novel at scene 1 is *normal* — that is what an opening does |
| **RELATIONAL** | Head noun of a definite or possessive NP (`the …`, `his/her/their/my/your/our …`), one-step adjective skip, naive singular fold | A definite reference PRESUPPOSES shared knowledge. One with no antecedent in any earlier scene is a genuine forward reference, not an introduction |
| **ANAPHORIC** | Bare markers with no head: `again`, `this time`, `last time`, `like before`, `as usual`, `as always`, `the same`, `back here`, `still here`, `by now`, `ever since` | Unanchorable by construction |

**Honest limit, stated before the numbers.** This is a lexical approximation,
not a parse. There is no POS tagger and no coreference layer in this codebase —
`agency-signal.ts:99` documents that gap explicitly — so "head noun after a
determiner, with a one-step adjective skip" is the best available stand-in for
a definite-NP head. It will mis-head some phrases. **A null result from this
approximation does not refute a real coreference implementation**, which is
branch (b) of `NOVELTY_SIGNAL`'s own hypothesis and remains untested.

### 3b. The five formulations

All are computable without knowing which scene moved.

| ID | Statistic |
|---|---|
| F1 | Proper-noun novelty at scene 1 (the historical "second cold open", reproduced) |
| F2 | Relational unanchored-reference rate at scene 1 |
| F3 | **Relational excess** at scene 1 = F2 − F1 (the noun-TYPE contrast P-3 names) |
| F4 | Max relational excess over scenes 1..n−1 (position-free version of F3) |
| F5 | Anaphoric-marker density at scene 1, per 100 words |

### 3c. The degradations, and one control that was doing no work

- **CLIMAX_RELOCATE** — the target.
- **SCENE_SHUFFLE** — a second, harsher reordering.
- **MIDPOINT_DROP** — the committed length control. **It is vacuous here.** It
  removes only scenes 40%–60%, so it cannot touch scene 0 or scene 1 and
  leaves every position-1 statistic bit-identical: 0/38 non-tied pairs on F1,
  F2, F3 and F5. It passes "the control stays quiet" by construction, proving
  nothing. Reported for continuity, relied on for nothing.
- **MID_SCENE_RELOCATE** — the specificity control this harness adds: move a
  *middle* scene to index 1 instead of the climax. A formulation that rises
  just as much here is detecting "a scene moved to the front", not "the
  CLIMAX moved to the front" — the exact confusion `NOVELTY_SIGNAL`'s failure
  analysis said a viable discriminator has to resolve.

### 3d. Results (n=38: 18 CC0 + 20 calibration; bootstrap 2000, seed 42)

| Formulation | Degradation | AUC (95% CI) | rose > 0.02 | non-tied |
|---|---|---|--:|--:|
| **F1** proper novelty @1 | CLIMAX_RELOCATE | 0.526 [0.368, 0.684] | 19/38 | 36/38 |
| | SCENE_SHUFFLE | 0.500 [0.342, 0.658] | 17/38 | 34/38 |
| | MIDPOINT_DROP | 0.500 [0.500, 0.500] | 0/38 | **0/38** |
| | MID_SCENE_RELOCATE | **0.632** [0.487, 0.763] | 21/38 | 32/38 |
| **F2** relational unanchored @1 | CLIMAX_RELOCATE | 0.605 [0.474, 0.737] | 18/38 | 28/38 |
| | SCENE_SHUFFLE | 0.684 [0.566, 0.803] | 20/38 | 26/38 |
| | MIDPOINT_DROP | 0.500 [0.500, 0.500] | 0/38 | **0/38** |
| | MID_SCENE_RELOCATE | **0.658** [0.526, 0.789] | 20/38 | 28/38 |
| **F3** relational excess @1 | CLIMAX_RELOCATE | 0.632 [0.474, 0.763] | 23/38 | 38/38 |
| | SCENE_SHUFFLE | 0.684 [0.539, 0.816] | 24/38 | 36/38 |
| | MIDPOINT_DROP | 0.500 [0.500, 0.500] | 0/38 | **0/38** |
| | MID_SCENE_RELOCATE | **0.513** [0.355, 0.671] | 19/38 | 37/38 |
| **F4** max relational excess | CLIMAX_RELOCATE | 0.526 [0.447, 0.605] | 5/38 | 10/38 |
| | SCENE_SHUFFLE | 0.592 [0.461, 0.711] | 17/38 | 27/38 |
| | MIDPOINT_DROP | 0.342 [0.250, 0.434] | 2/38 | 18/38 |
| | MID_SCENE_RELOCATE | 0.500 [0.408, 0.592] | 6/38 | 14/38 |
| **F5** anaphoric density @1 | CLIMAX_RELOCATE | **0.645** [0.539, 0.750] | 16/38 | 21/38 |
| | SCENE_SHUFFLE | 0.579 [0.487, 0.671] | 10/38 | 14/38 |
| | MIDPOINT_DROP | 0.500 [0.500, 0.500] | 0/38 | **0/38** |
| | MID_SCENE_RELOCATE | 0.539 [0.434, 0.632] | 8/38 | 13/38 |

---

## 4. Verdict, computed

A formulation is viable only if both hold:

- **(a) SENSITIVITY** — CLIMAX_RELOCATE 95% CI lower bound above 0.5.
- **(b) SPECIFICITY** — MID_SCENE_RELOCATE AUC at least 0.05 *below*
  CLIMAX_RELOCATE AUC.

| Formulation | relocate AUC | CI-lo | sensitive? | mid-scene AUC | gap | specific? | verdict |
|---|--:|--:|---|--:|--:|---|---|
| F1 proper novelty @1 | 0.526 | 0.368 | no | 0.632 | **−0.105** | **no (anti-specific)** | NOT VIABLE |
| F2 relational unanchored @1 | 0.605 | 0.474 | no | 0.658 | −0.053 | no (anti-specific) | NOT VIABLE |
| F3 relational excess @1 | 0.632 | 0.474 | no | 0.513 | **+0.118** | **yes** | NOT VIABLE |
| F4 max relational excess | 0.526 | 0.447 | no | 0.500 | +0.026 | no | NOT VIABLE |
| F5 anaphoric density @1 | 0.645 | **0.539** | **yes** | 0.539 | **+0.105** | **yes** | **VIABLE** |

### What this actually establishes

**The noun-type hypothesis is directionally confirmed, and it is the first
thing on this wall that has been.** `NOVELTY_SIGNAL` predicted that raw
proper-noun novelty cannot tell a legitimate introduction from a misplaced
climax. Measured: F1 is **anti-specific** — it fires *more* when an ordinary
middle scene is moved to the front (0.632) than when the climax is (0.526).
The prediction was right, and the reason the four historical global
formulations failed is now a measured number rather than an argument.

Switching to relational type flips that. F3 — the explicit
relational-minus-proper contrast — is the only formulation with a solidly
positive specificity gap (+0.118) on a full 38/38 non-tied basis. It is not
sensitive enough (CI-lo 0.474, straddling chance), but it fails in the
*informative* direction: it knows the difference between the two moves and
cannot yet tell either from an intact script reliably.

**F5's positive result should be treated as a lead, not a finding.**
Anaphoric-marker density at scene 1 clears both conditions (AUC 0.645
[0.539, 0.750], specificity gap +0.105, 21/38 non-tied — not tie-degenerate).
But: five formulations were tested against one target on 38 short scripts,
nothing was pre-registered, and at a 95% CI roughly one in twenty such tests
clears chance by accident. One positive out of five unregistered tests is the
weakest kind of positive result there is. It has *not* earned a
pre-registration, and it certainly has not earned wiring.

### Verdict on the historical claim

| Question | Answer |
|---|---|
| Is the historical targeted result reproduced? | **No** — the probe was never committed and cannot be re-run |
| Is its direction supported by a rebuild from committed pieces? | **Yes** — 18/18 CC0 scripts rise, mean +0.28 |
| Are its magnitudes supported? | **No** — +0.28 vs the reported +0.45, both endpoints lower |
| Does it become a detector? | **No** — the oracle-assisted statistic does not survive removal of the oracle, which was the original finding too |
| Should `NOVELTY_SIGNAL_2026-08-05.md` stay marked unreproducible-historical? | **Yes.** Its numbers must still not be cited |

---

## 5. Owner discharge — the real corpus

```bash
CORPUS_DIR=<761-script corpus> node --experimental-strip-types scripts/rederive-climax-relocate.ts
```

The harness honours `CORPUS_DIR` (unlike `measure-auc-split.mjs`, whose
`SRC_DIR` is hardcoded — a discrepancy `REBUILD_EXPERIMENT_2026-08-04.md` §8
already recorded), reads `*.fountain` and `*.fountain.txt` alike, and applies
the same held-out-partition exclusion.

**What would decide the question at feature scale:**

| Outcome on the real corpus | What it means |
|---|---|
| F3's CI-lo rises above 0.5 while its specificity gap stays positive | The noun-type contrast is a real discriminator. It would then need pre-registration and the full P1 protocol before any wiring |
| F5 holds at ≥0.60 with CI-lo above 0.5 and a positive specificity gap | The anaphoric branch survives out of sample and stops being a multiple-comparisons artifact |
| Both CIs straddle 0.5 at n≈761 | The lexical approximation is exhausted. The remaining branch is (b) — a real coreference layer — which this codebase does not have and which is a much larger commitment than a probe |

Any wiring decision afterwards is governed by CLAUDE.md's P1 protocol —
positive/negative fixtures plus a corpus-measured before/after against the
AUC-24 ≥ 0.622 ratchet, and a `MEASUREMENT_RECEIPTS.md` entry once a
scoring-path file actually changes.

---

## 6. What could not be measured here, and exactly why

| Item | Why not |
|---|---|
| The historical 10/11 table, literally | The targeted probe source was never committed. Unrecoverable |
| Any of it against the sanctioned produced-script corpus | Owner-local; `CORPUS_DIR` unset, `data/screenplays/crawl/` absent |
| Whether the effect survives at feature scale | This corpus is 38 scripts of 9–16 scenes. `CLIMAX_RELOCATE` on a 250-scene feature moves one scene out of 250, not one out of 12 — a structurally different degradation |
| Branch (b): coreference-based anaphora resolution | No coreference layer exists in this codebase (`agency-signal.ts:99`). F5's marker list is a lexical stand-in, not a resolver |
| Whether F5 is real or a multiple-comparisons artifact | Requires either a pre-registered replication or the real-corpus run above. Not decidable from the run that generated the hypothesis |
