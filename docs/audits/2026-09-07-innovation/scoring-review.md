# Independent review — `scoring/feature-length-defects` @ `4643d590`

**Reviewer:** independent scoring-path reviewer (fresh; the prior reviewer's
work was lost with its container and nothing of it is reused here).
**Object:** 7 commits on `main` @ `9b199b72`, 35 files, +3264/−288.
**Method:** `git archive` exports of `4643d590` (branch), `9b199b72` (base),
`7ac44410` (commit 3) and `52bf410a` (the R5 tip) with `node_modules`
symlinked, plus one throwaway `git clone --shared` at the branch tip for the
git-dependent gates and the single full `npm test`. `/home/user/STORYMACHINE`'s
working tree was never modified, nothing was pushed, merged, or checked out
there, and `--lock` was never run.

**Degradation recipes are identical on both trees** — the diff touches neither
`scripts/lib/public-benchmark.ts` nor `scripts/lib/rebuild-experiment-lib.mjs`
nor any corpus file, and `scripts/lib/auc.ts`'s change is comments plus five
floor constants. So every AUC below is the same experiment on two scorers.
Every AUC, Mann-Whitney, matched-pair count, Spearman and slope figure in this
review was computed by **my own implementation**, not read off the lane's
scripts; where a rank-sum route and a double-loop route both exist I ran both
and they agree to 1e-12 (`AGREE` in the probe output).

---

## Round 1

### Verdict

**REVISE.** Five statements on the branch are untrue or unsupported as
written (items 1–5 below); two of them are falsifiable claims that my probes
falsify directly, and one is a live tool printing five numbers that its own
output contradicts forty lines above.

None of the five moves a health value. **Every headline measurement in the
lane's claim list reproduced exactly on my own scorer** — the One Bet
(shuffle-drop matched-pair `0.5313 → 0.8750`, mean health gap `−1.93 → +2.11`)
is real, the calibration corpus is untouched sample-for-sample, and the full
suite passes 13,058/0 in a real clone. So the owner's `measure-real` run is
worth spending time on, and items 1–5 can be fixed in parallel with it — but
the branch should not be merged carrying three false statements, and items 1,
2 and 7 change how the owner should read the evidence before deciding.

---

### Claims vs diff

| # | lane's claim | my reproduction | result |
|---|---|---|---|
| 1 | public benchmark SHUFFLE_DROP paired 0.5313 → 0.8750; gap −1.93 → +2.10; CLIMAX 0.4219 (11 ties) → 0.5469 (1 tie, 0 pinned); control 1.0000/0.9473 → 1.0000/1.0000; blind 1/6 (−0.0167) → 4/6 (+0.3833) | 0.5313 → 0.8750 (17/15/0 → 28/4/0); gap −1.93125 → **+2.109375** (doc says +2.10; rounds to +2.11); 0.4219 (11 ties, 10 pinned) → 0.5469 (1 tie, 0 pinned); all-pairs 0.5586 → 0.8306 and 0.4673 → 0.5151; control 1.0000/0.9473 → 1.0000/1.0000; blind 1/6 −0.0167 → 4/6 +0.3833 | **TRUE** (one 0.01 rounding) |
| 1b | floors re-locked upward | all six raised, each exactly `measured − 0.02`; `AUC24_FLOOR` untouched at 0.622 | **confirmed, see item 7c** |
| 2 | calibration "MONO, gap 25.32 — not one sample moves" | band averages identical on both trees (62.4 / 52.52 / 42.12 / 37.08), gap 25.32, **all 20 sample healths byte-identical**; all 20 sit on the power branch (density > 1) and all are ≤ 10 scenes, so neither change can reach them | **TRUE** |
| 3 | `stapled_shorts` +8.2 KNOWN FAIL on main → −2.0 PASS, promoted to `hard`; not tuned to the fix | base +8.2 (86.5 vs 78.3), branch −2.0 (79.8 vs 81.8); `npm run test:metamorphic` on the branch: 7 hard passes, witness PASS −2.0, exit 0 | numbers **TRUE**; the *invariant* is **NOT** established — **item 1** |
| 4 | "the staple is a different term from the drop": densityPenalty 0.013 apart, scarcity 10.66 apart | on main: densPen 10.000 vs 9.987 = **0.0129**; scarcity 1.007 vs 11.667 = **10.6595**; residual −2.49; all 12 parts \|resid\| ≤ 0.05 | **TRUE** |
| 5 | R5's denominator inverts at paired 0.0938; the two are alternatives, not a stack | R5 tip `52bf410a`, my own matched-pair: **0.0938** (3/29/0), mean gap −15.78, CLIMAX 0.4844, 1 tie, blind 3/6 | 0.0938 **TRUE**; "alternatives" substantively right, reason misstated — **item 8** |
| 6 | mean slope 10 vs binding ratio 11.41; k=2 satisfies; k=4/5/8 violate | max slope k→0 10.0000, k=2 **10.8232**, k=2.6335 **11.4100**, k=3 11.8146, k=4 13.1392, k=8 20.7557, k=50 125.0000; boundary solves to 2.6343; anchoring exact (f(0)=0, f(1)=10 = power branch at d=1) | arithmetic **TRUE**; the constraint as *stated* is not the one satisfied — **item 2** |
| 7 | item-4 null: confound −0.695 → −0.015; wiring lowers CLIMAX 0.5469 → 0.5156; exposed not wired | my own Spearman: −0.6949 → **−0.0152** (32 scripts), −0.6432 → **−0.1757** (12 blind); moves 32/32 under CLIMAX, up 16 / down 16, intact higher **16/32**; range 0.8683–1.7849; my own cap-6 / threshold-1.0 ramp: CLIMAX 0.5469 → **0.5156**, DROP 0.8750 unchanged; **no** ramp shape I tried (cap 3/6/10 × thr 0.8/1.0/1.2/1.5) raises CLIMAX above unwired; `doctor.ts` contains 0 references to the field | **TRUE** |
| 8 | six moved assertions, each a re-anchor with cause; COMPOSITE_MIN_GAP and the PASS line untouched; two craft pairs invert at the clue guard, not the formula | commit-3 tree: dramatized −1.4, composite +0.1. Tip: **−0.2** and **+1.4**. All six pair values match the new ledger exactly. `COMPOSITE_MIN_GAP` still 5.0; `health < 60` PASS line untouched; the 20.0 delta gate untouched; agency counts **tightened** from bounds to exact 2/20 and 5/20 | **TRUE** (one caveat, item 9a) |
| 9 | two self-recorded errors; the tip corrects both | both corrected: 84.6 and 65 both reproduce against `computeHealthScore`; commit 3's block does now carry `discrimination.test.ts`. **A third of the same class survives** | **item 4** |
| 10 | saturation byte-identical ≤15 scenes; ~8 points on the private corpus; no private number claimed | all 32 public scripts are 9–14 scenes intact, 6–10 degraded, all 20 calibration samples 9–10 → the term is identical by construction. My own derivation: 140/15 − 140/118 = **8.147**; 7.58 at 80 scenes, 8.63 at 200. Grep of added lines: no AUC-24 value, no corpus fingerprint, no private number anywhere | **TRUE**; framing misdirects — **item 7** |
| 11 | voice abstention + "a name is not a clue": probe bypasses | 30-word predicate unchanged (`>= 30` both trees); walk-on at exactly 30 words eligible on both. **Three clue-guard bypasses found** | **item 3** |
| 12 | the summary paragraph may not contradict the five numbers | inert 2-scene reproduces exactly (gap 70 = term 70, strengths `[]`); bottom-band dimension-strength guard holds. On all 8 of my ≥15-scene probes the disclosure sentence's quoted term ≠ the gap it explains | **item 6** |
| 13 | DoS bound not loosened; 42,062 ms → 191 ms real | `MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT` still `300_000`; new predicate reads a subset of the old set, so it is strictly stricter (verified by case analysis). My timing on the same 19,900-pair shape: base **39,012 ms** → branch **110 ms** (355×) | **TRUE**, conservative |
| 14 | gates | see the gate table below — all as claimed | **TRUE** |

### Gates, run by me

| gate | command | result |
|---|---|---|
| full suite | `npm test` in a clone at `4643d590` | **exit 0 — 13,058 tests, 0 fail, 91 skipped, 4 todo** (exactly as claimed) |
| receipt gate | `node scripts/check-scoring-receipt.mjs 9b199b72..4643d590` | **exit 1**, naming exactly **one** `PENDING ENTRY`; all four required fields present, the only problem reported is the pending marker |
| conversion recipe | three scans applied mechanically to the 2026-09-07 entry on a scratch copy, then the real CLI | **exit 0** — "gained a well-formed new entry in the same range. OK." |
| brain | `npm run check-brain` | exit 0 |
| honesty | `npm run honesty-audit` | exit 0 |
| docs | `npm run check-docs` | exit 0 |
| console | `npm run check-no-console` | exit 0 |
| metamorphic | `npm run test:metamorphic` | exit 0, 7 hard passes, `stapled_shorts` −2.0 |
| benchmark | `npm run benchmark:public` | all six AUCs and all three sign-count triples identical to my own implementation |
| trailers | `git rev-list 9b199b72..4643d590` | **7/7 commits** carry both `Co-Authored-By: Claude …` and `Claude-Session: https://claude.ai/code/session_…` |
| identity | `check-doctor-output-identity.mjs` both trees + my own comparator | 45 compared, **health moved 25, RMS 9.580, mean +2.944, largest +32.2 on `transfer-window`, 6 verdict flips, 5 grade flips** — every figure as claimed |

*(A first `npm test` run against the `git archive` export reported 12 failures;
all 12 were `Command failed: git ls-files … fatal: not a git repository`, an
artifact of the tar export, and all 12 pass in the clone. Recorded so the
export method is not mistaken for a finding.)*

---

## Items requiring revision

### 1. The staple invariant is false for half of the orderings of the witness's own twelve parts — the witness passes by pinning a favourable one

`evals/scoring/runner/metamorphic-cases.ts:110-128` registers `stapled_shorts`
as **`hard`** with the description "twelve unrelated CC0 shorts stapled end to
end → health must NOT exceed the BEST single part", and its promotion comment
says "it now fails the build if length alone ever buys health again."
`server/nvm/analyze/doctor.ts:552-575` (the `SATURATION (2026-09-07)` block)
and the doc's §8.2/§8.3 present the staple pathology as closed.

The twelve are stapled in one fixed order (the first twelve `data/screenplays`
files, alphabetical). Reorder the **same twelve files** and the invariant
fails:

```
cd <branch export>
node --experimental-strip-types probe-staple.ts     # my own probe, same sceneBodyOf + '\n\n' join
TWELVE (the witness)     staple  79.8 (139 sc)  bestPart 81.8  delta -2.0  PASS
TWELVE reversed          staple  82.4 (139 sc)  bestPart 81.8  delta +0.6  FAIL
```

Twelve mulberry32 permutations of the identical set:

```
node --experimental-strip-types probe-staple2.ts 81.8
perm seeds 1..12 → 81.8 81.2 81.4 82.4 80.6 82.0 82.5 82.2 82.2 81.4 79.1 82.2
min 79.1  max 82.5  range 3.4  FAILs 6/12
```

**6 of 12 random orderings of the witness's own parts still outscore the best
single part**, by up to +0.7. The shipped alphabetical order is the 3rd lowest
of the 13 orderings I measured. So the witness's 2.0-point margin is smaller
than the 3.4-point order-sensitivity of its own construction: it is a true
observation about one arrangement, not the standing guard its promotion comment
claims. On `main` every ordering failed by +5.8 to +10.7, so the change is a
large real improvement — the overclaim is in the generalisation, not the
direction.

**Fix:** either make the case's comparison the **maximum** health over a small
fixed set of orderings (so the invariant it asserts is the one it tests), or
keep the single order and state the measured order-sensitivity beside it with
these numbers. Do not leave "fails the build if length alone ever buys health
again" standing; it does not.

### 2. The slope-constraint table misstates its population, two of its eight rows do not reproduce, and the four it omits are exactly the four scripts that still gain health under the drop

`docs/scoring/FEATURE_LENGTH_DEFECTS_2026-09-07.md` §8.2, "Why steepness 2 and
not a value that measures better", says: *"Stated per script as `Δscarcity /
|Δdensity|` under the drop recipe, and measured over **all 32 scripts** on the
commit-3 tree, the eight tightest are:"* — then lists
`the-deposit-excellent 11.41` as **BINDING**. `server/nvm/analyze/doctor.ts:496-506`
repeats "the BINDING script is `the-deposit-excellent` at 11.41."

Measured over all 32 scripts on the commit-3 tree (`7ac44410`) and on the tip —
identical results on both:

```
node --experimental-strip-types probe-slope2.ts
transfer-window          dIntact 1.5946  dDrop 0.6948  dS 6.000  |dD| 0.8997  ratio  6.67
room-12                  dIntact 1.5996  dDrop 0.7546  dS 6.000  |dD| 0.8450  ratio  7.10
the-key-under-the-mat    dIntact 1.3315  dDrop 0.8235  dS 4.773  |dD| 0.5080  ratio  9.39
quiet-season             dIntact 1.1800  dDrop 0.6095  dS 6.000  |dD| 0.5705  ratio 10.52
the-deposit-excellent    dIntact 0.9284  dDrop 0.4027  dS 6.000  |dD| 0.5256  ratio 11.42
min ratio overall = 6.67
```

Three consequences.

**(a) The stated population is wrong, and under it the constraint is
infeasible.** Over all 32 the minimum is **6.67**, not 11.41. A curve rising
`SUB_DENSITY_SCALE = 10` points across a unit of density has mean slope 10 and
therefore maximum slope ≥ 10 — the doc's own argument — so under the literal
reading **no admissible curve exists at all**, k=2 (10.8232) and even a
straight line (10.0000) included. The defensible population is the 16 scripts
whose density stays below 1 at *both* ends, where the sub-1 derivative is the
operative quantity; restricted that way the minimum **is**
`the-deposit-excellent` at **11.42**, and the doc's first five rows plus
`the-deposit-bad` match mine exactly. The filter is correct and unstated.

**(b) Two of the eight rows do not reproduce on any tree in this branch.** The
doc lists `signal-drift-excellent |Δdensity| 0.4410 → ratio 13.61` and
`quiet-season |Δdensity| 0.3905 → ratio 15.36`; I measure 0.4849 → 12.37 and
0.5705 → 10.52. Both are scripts whose intact density is above 1 (1.0439 and
1.1800), i.e. both are outside the defensible population in the first place.

**(c) The omission is load-bearing, not cosmetic.** The four scripts missing
from the table are precisely the four where the damaged copy still wins on the
branch:

```
node stats.mjs branch.json  →  SHUFFLE_DROP 28/4/0
quiet-season          73.8 -> 73.9  (+0.1)
the-key-under-the-mat 72.5 -> 74.1  (+1.6)
room-12               63.9 -> 72.3  (+8.4)
transfer-window       64.1 -> 73.0  (+8.9)
```

`scripts/lib/auc.ts:133-135` says flatly "the formula stopped paying a writer to
delete a third of their scenes", and `doctor.ts:413-424` (the `THE DELETION
REWARD` block) names `room-12`'s +36.5 on main as the worst case. `room-12` still gains **+8.4** and `transfer-window`
**+8.9** — because they are on the power branch, which the slope constraint
provably cannot cover. The 28/4/0 sign count *is* reported, so this is an
unqualified narrative beside a disclosed number, not a hidden one; but a
reviewer reading the constraint table cannot find out which scripts the
constraint fails to reach, because those are the rows that were dropped.

**Fix:** state the restriction ("the 16 scripts whose density is sub-1 at both
ends — the only ones the sub-1 derivative governs"), correct or drop the two
non-reproducing rows, and add one sentence naming the four residual inversions
and why the constraint cannot cover them.

### 3. "`BRASS KEY` beside a character called KEY stays a clue" is false — the full-name learning pass defeats the asymmetry the guard is sold on, and two more shapes suppress genuine props

The claim appears three times, word for word:
`server/nvm/analyze/fountain-analyzer.ts:1700-1703` (the
`buildProperNounGuard` header, whose function opens at `:1704`), commit
`7ac44410`'s message, and the doc's `FEATURE_LENGTH_DEFECTS_2026-09-07.md:266-268`. `tests/core/clue-proper-noun-guard.test.ts:147-153` has a FIRES
case for `BRASS KEY`, but its cast is `MARA / DESK CLERK / RAY` — it never puts
a character called `KEY` in the script, so the stated asymmetry is asserted
everywhere and tested nowhere.

Probe, `seededClueIds` on the lane's own fixture body with only the cue names
changed (branch export, `probe-clue2.ts`):

```
A. control, title THE LONG WAY DOWN, cues MARA/DESK CLERK/RAY   seeded: ["brass-key"]        <- guard working
D. identical body, the speaking cue changed to KEY              seeded: ["mara-voss"]        <- brass-key GONE
```

The mechanism is the paragraph immediately below the claim
(`fountain-analyzer.ts:1716-1733`, the full-name learning pass inside
`buildProperNounGuard`): `nameWords` starts as every word of every
cue, so it contains `key`; the learning pass then takes any multi-word token
containing an already-known cue word and adds its *other* words — `brass key`
contains `key`, so `brass` becomes a name word; then `words.every(w =>
nameWords.has(w))` is true and the prop is excluded. The exact example the
comment uses to justify "every, never any" is the counterexample.

Two more suppressions in the failure direction, same fixture:

```
C. title LEVERAGE, prop LEVERAGE planted and never paid off     seeded: []
   (base: ["leverage", …])                                       <- the whole channel silenced
B. title THE BRASS KEY, prop BRASS KEY                          seeded: ["key-title"]
   (base: ["brass-key", …])                                      <- the real prop suppressed, a
                                                                    nonsense token admitted
E. caps phrase "MARA REVOLVER" in scene 1, prop REVOLVER         seeded: ["revolver-lift"]
F. control for E, REVOLVER never adjacent to a cue name          seeded: ["revolver"]
```

E/F isolate the chaining: the guard's comment says "only tokens containing an
ALREADY-KNOWN cue word teach new words, **so the set cannot chain outward
through unrelated props**." It chains outward exactly one step into a prop, and
one step is enough to delete that prop's clue. B and C matter because
screenplays are routinely titled after their central object.

The net measured effect of the guard on discrimination is positive and the
ORPHAN_CLUE channel is low-value anyway (AUC ~0.076), so I am not asking for
the guard to be reverted. I am asking for the three copies of a false claim to
go, the learning pass's real reach to be stated, and `clue-proper-noun-guard.test.ts`
to gain the case that actually exercises the asymmetry (a character called
`KEY`) — as a `todo` with the measured id list if it cannot be made to pass.

### 4. The third error of the credit-cap class, in the same file the lane corrected

§9.3 records commit 4 shipping two spot-check values measured against the
rejected scene-count credit cap, and the tip corrects both numbers (84.6 and
65 both reproduce against `computeHealthScore`). The **prose** from that variant
was not corrected, two lines above and eleven lines below the numbers that
were:

- `tests/core/script-doctor.test.ts:219-222` — "Three constants moved and one
  term is new … the sub-1 density curve's steepness (50 -> 2), **a scene-count
  credit cap on that curve**, and saturation of the scarcity term at 15
  scenes." The credit cap was measured, rejected (§8.2) and removed. Two things
  moved, not three.
- `tests/core/script-doctor.test.ts:251` — "At 25 scenes the density credit is
  uncapped (25 >= **`CREDIT_FULL_SCENES`**)". `grep -rn CREDIT_FULL_SCENES
  server/ scripts/ evals/` returns nothing: the constant exists nowhere in the
  shipped tree.
- `tests/core/script-doctor.test.ts:228` — "density = 8.5/300^0.7 = **0.1889**".
  `8.5 / Math.pow(300, 0.7) = 0.1568`. (The asserted 84.6 is right; the quoted
  density is not.)

This is the same class §9.3 exists to record, so it belongs in the same place
with the same honesty.

### 5. `npm run benchmark:public` on the branch prints five numbers that its own table contradicts in the same output

`scripts/lib/public-benchmark.ts:743-763` (`PUBLIC_BENCHMARK_LIMITS`) is not
touched by the diff. Running the branch's own benchmark:

```
cd <branch export> && npm run benchmark:public
  SHUFFLE_DROP  matched 0.8750 [0.7500, 0.9688]  …  sign counts 28/4/0, EXACT TIES 0
  …
  WHAT IT SAYS TODAY (2026-09-06, this tree; matched-pair is the primary statistic)
    * Shuffle-drop 0.5313 matched-pair [0.3750, 0.6875] / 0.5586 all-pairs …
      ALL FOUR intervals contain 0.5 … Control: 1.0000 / 0.9473.
  WHAT IT CANNOT SHOW
    * … Ten of the 32 scripts sit pinned at exactly health 76.0 … so 11 of 32 pairs are
      EXACT ties … That channel's point estimate rests on 21 movable scripts …
    * … The blind-pairs result (1 of 6 ordered …) is the craft question, and it is a
      different, failing measurement.
```

Five of those are now wrong on this tree: 0.5313/0.5586 → 0.8750/0.8306; the
shuffle-drop intervals no longer contain 0.5; the control is 1.0000/1.0000;
**0** scripts are pinned at 76.0 and **1** pair ties, not 10 and 11; blind pairs
are 4 of 6, not 1. The branch's own
`tests/core/public-benchmark.test.ts:281-306` now asserts `pinned <= 2` and
`tied <= 3` — the code asserts the opposite of the prose printed beside it.
Nothing catches this: no test references `PUBLIC_BENCHMARK_LIMITS` and the
measurement doc does not quote it, so CLAUDE.md's "the caveats cannot drift
away from the number they qualify" is not in fact enforced for this string.

This is the defect commit `efc1899d` exists to fix ("the summary paragraph may
not contradict the five numbers beside it"), reproduced in the lane's own
primary measurement tool. The §11 doc addendum is exemplary; this block needs
the same treatment.

### 6. The scene-term disclosure sentence asserts a cause it does not account for on every document longer than 15 scenes

`server/nvm/analyze/doctor.ts:1997-2002` emits: *"Every diagnostic dimension
scores at or above the overall (lowest: X at N/100), because the dimensions
read issue density alone while the overall also carries the scene-count term —
at S scene(s) that term alone removes P point(s). **The gap is the length of the
draft, not the dimensions.**"*

At 2 scenes the sentence is exact (gap 70, term 70) and the lane's fixture is
that case. On every longer document I measured it is not (branch export,
`probe-summary.ts`):

```
stapled 12 (139 sc)   health 80  lowest dim 82  gap  2   quoted term  9
40 inert scenes       health 76  lowest dim 87  gap 11   quoted term  9
15 plain scenes       health 72  lowest dim 77  gap  5   quoted term  9
16/18/20/25/30 scenes gaps 6 / 7 / 7 / 6 / 4            quoted term  9 in all
```

On the staple the term is 4.5× the gap it is offered as the explanation of. The
arithmetic is `gap = (document density penalty + scarcity + deductions) −
(dimension's own density penalty)`: for the staple, 20.196 − 18 = 2.196, of
which length contributes 9.333, the feature-scale deductions 2.49, and the
Character dimension's own harsher density −18. Each quoted number is
individually true; the causal sentence is not, and a reader who subtracts 9
from 100 gets 91 against a printed 80.

**Fix:** either state the gap the sentence is explaining alongside the term, or
fire the disclosure only when the term accounts for the gap (which is the case
the lane tested), and drop "not the dimensions" where deductions and the
per-dimension density difference are doing part of the work.

### 7. The owner-facing framing of the scarcity risk points at the half of it AUC-24 cannot see

Three places — the receipt entry, the owner note, and the doc's §8.2 — say the
same thing: *"On the private corpus, whose median is 118 scenes, it will move
every script by roughly 8 points and that is the single largest thing the
owner's run has to check."* The 8 points is right (my derivation: `140/15 −
140/118 = 8.147`; 7.58 at 80 scenes, 8.63 at 200). But **AUC-24 is a matched-pair
rank statistic, and a near-uniform downward shift is rank-preserving — it
cannot move AUC-24 by itself.**

What the saturation actually does to AUC-24 is different and is not stated:

```
per-script scarcity contribution to the drop signal, n = 118 → n_drop ≈ 79
  main:   140/79 − 140/118 = 1.772 − 1.186 = +0.586 points of separation
  branch: min(79,15) = min(118,15) = 15      →      0.000, exactly
```

For every script of roughly 22 scenes or more — i.e. essentially the whole
private corpus — **the scarcity channel's degradation delta becomes exactly
zero.** That is the AUC-relevant change, and it is the quantity main's own
`auc.ts` comment already names ("0.58 points at the private corpus's median 118
scenes"). The 8-point shift is what will move verdicts, grades and the 72-row
`real-corpus-manifest.json` — which the owner note correctly asks for — but it
is not what will move AUC-24.

So, stated plainly for the owner: **AUC-24 can settle** whether health still
orders an intact feature above a shuffle-dropped copy of itself once the
scarcity channel contributes nothing and the density curve is near-linear. It
**cannot settle** which of the two changes is responsible — they ship in one
commit with no separate AUC-24 receipt — nor anything about craft.

Two smaller accuracy problems in the same owner-facing material:

**(7a)** `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`, the 2026-09-07 entry, says
"**six** commits on `main` @ `9b199b72`" — there are **seven** — and "**Four**
assertions moved" — there are **six**; the entry was written in `efc1899d` and
commit 7 moved two more (`agency-signal.test.ts`, `feature-scale-discrimination.test.ts`)
without updating it. The doc is consistent if §8.4 and §10 are read together;
the receipt, which is what the owner reads, is not.

**(7b)** The branch's `--lock` raised all six public floors. I verified each is
exactly `measured − 0.02` and that `AUC24_FLOOR` is untouched at 0.622, and
CLAUDE.md's rule ("re-lock only after a scoring change you intended, and read
the `auc.ts` diff") is satisfied — the public benchmark needs no corpus and no
owner, so "a branch the owner has not measured" does not apply to it. The
coupling worth naming: with `PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR` at 0.855, if
`measure-real` forces the owner to weaken or revert the steepness change, that
test fails and the pressure to lower the floor is exactly the hazard CLAUDE.md
warns about. The receipt's own sentence — "If it falls … do not answer it by
moving the floor in `scripts/lib/auc.ts`" — addresses it, which is why this is a
note and not a finding.

### 8. The owner note's reason for "alternatives, not a stack" is wrong, and the separable half is not offered

`docs/brain/Owner/Owner - R5 Measurement and Merge.md` says "Both cannot land:
the two rewrite **the same two functions** in `doctor.ts`." `git diff
9b199b72..52bf410a -- server/nvm/analyze/doctor.ts` shows R5 changes
`densityPenalty`'s denominator and curve and **leaves `scarcityPenalty`
untouched**. They collide on one function.

The conclusion survives — R5's denominator inverts at 0.0938 (my reproduction
on its tip) and the saturation is identity on the public corpus, so
R5 + saturation would still read 0.0938 there — but the lane's own candidate
table has `(c) steepness alone` and `(d) saturation alone` as separate rows,
and `(d)` alone is the row that carries the staple witness at `−1.3 PASS` with
the public benchmark unmoved. The owner should be told that the two halves are
independently landable: if AUC-24 rejects the steepness change, the saturation
(which fixes the staple and is the only change with a feature-length effect)
can still land on its own. The branch ships them as one commit and presents
them as one decision.

### 9. Two smaller notes, recorded rather than blocking

**(9a)** `tests/core/feature-scale-discrimination.test.ts:257-267` (the `GRADE_RANK`
assertion at `:262`) substitutes a
GRADE-tier assertion for the verdict-tier one it moved to `todo`. With the
20.0-point delta gate kept and the intact fixture at 81.4, a grade drop (crossing
75) is implied by the delta gate for any intact score below 95 — so "kept a real
tier check rather than deleting one" is nearly redundant with the gate beside
it. It is not a loosening; it is a thinner replacement than the prose suggests.

**(9b)** `server/nvm/analyze/structural-signals.test.ts:372-381`'s `NOT WIRED`
assertion greps `doctor.ts` only. A deduction added in
`revision/passes/**` or another reachable module would read the channel without
`doctor.ts` ever naming it, and the guard would pass. Worth widening to the
scoring-path file set `check-scoring-receipt.mjs` already enumerates.

### Cosmetic — no action required, listed so nothing is unreported

- Mean health gap under drop is **2.109375**; `auc.ts:134`, the doc and the
  receipt all write **+2.10** (truncated, not rounded).
- `auc.ts:162` keeps "7.625" for mean ΔdensityPenalty; measured **7.632** (the
  doc has 7.632). Pre-existing, carried forward.
- Max-slope table: k=4 printed 13.140 vs measured 13.1392; k=8 printed 20.760
  vs measured 20.7557.
- `doctor.ts:437-442` uses main's weighted-issue ratio (~0.51) inside the R5
  arithmetic and lands on "density ~0.68 of intact", where §8.2 uses the
  commit-3 tree's 0.5460 and lands on 0.73. Both ratios are correct for their
  own tree (I measured 0.5018 on base and 0.5460 on the branch); the two
  derivations just disagree with each other.
- `densityPenalty` now takes a `sceneCount` parameter it immediately discards
  (`void sceneCount;`, `doctor.ts:521`, with its justifying comment at `:516-520`) to hold the shape of a rejected
  candidate. The comment is honest about it; the signature still lies to the
  next caller.
- Unreported cost: the pre-existing metamorphic order-sensitivity margins
  collapsed on the branch and appear in no table —
  `scene_shuffle −11.3 → −1.6`, `scene_reverse −6.0 → −0.4`,
  `scene_dup_padding −10.5 → −2.1` (my runs of `npm run test:metamorphic` on
  both trees). All three still pass, but `scene_reverse` is now 0.4 points from
  flipping, on a branch whose thesis is order-sensitivity. Worth a line in §8's
  running table.

---

### What I could not break

The One Bet itself. Every number in the lane's claim list that describes a
measurement reproduced on my own implementation, several of them to four
decimals, including the ones most convenient for the lane (0.8750, 0.5469, 1
tie, 0 pinned, 4 of 6 blind pairs, calibration untouched sample-for-sample,
25/45 moved at RMS 9.580). The R5 inversion at 0.0938 reproduced on R5's own
tip. The `42,062 ms → 191 ms` claim is conservative on my box (39,012 → 110).
The DoS bound is genuinely unchanged and genuinely stricter. The single full
`npm test` is 13,058/0 in a real clone, exactly as stated. The receipt gate
refuses exactly once, for exactly the right reason, and the owner's conversion
recipe works on the new entry. No private-corpus number is claimed or implied
anywhere on the branch.

**VERDICT: REVISE** — items 1, 2, 3, 4 and 5 contain statements that are untrue
as written, each with a file:line and a one-command reproduction above. None
changes a health value, so the owner's `measure-real` run is worth spending and
can proceed in parallel; items 1, 2 and 7 should be corrected before the owner
reads the evidence to decide, because they change what the evidence says.
