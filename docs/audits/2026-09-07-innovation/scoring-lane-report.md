# Scoring lane — feature-length defects — the lane's final message (reconstructed)

*The lane's full report (`scoring-report.md`, nine sections) was lost in the
2026-09-07 sandbox rebuild. The branch itself survived because it was pushed:
`scoring/feature-length-defects`, tip 4643d590, seven commits on main
9b199b72, with the measurement doc
`docs/scoring/FEATURE_LENGTH_DEFECTS_2026-09-07.md` and a PENDING receipt on
the branch. What follows is the lane's final message to the orchestrator,
verbatim. The independent review of these claims, written after the rebuild,
is `scoring-review.md` beside this file. The branch is never merged by a
session: the owner's `measure-real` decides.*

## Report (verbatim)

**Branch `scoring/feature-length-defects` pushed. Tip `4643d5904dcf55902147ef8ed3eca672d1b839f8`.**

### The One Bet moved

| | `main` @ `9b199b72` | branch |
|---|---|---|
| `SHUFFLE_DROP` matched-pair | 0.5313 | **0.8750** |
| mean health gap under drop | **−1.93** (damaged copy scored *higher*) | **+2.10** |
| `CLIMAX_RELOCATE` matched-pair | 0.4219, **11 of 32 ties** | **0.5469, 1 tie**, 0 scripts pinned at 76.0 |
| blind matched pairs | 1 of 6, −0.02 | **4 of 6, +0.3833** |
| control | 1.0000 / 0.9473 | 1.0000 / 1.0000 |
| calibration | MONO, gap 25.32 | MONO, gap 25.32 — **not one sample moves** |
| new `stapled_shorts` witness | +8.2 KNOWN FAIL | **−2.0 PASS**, promoted to `hard` |

### Key findings

- **The staple is a different term from the drop.** The stapled 12 and the best part are **0.013 apart** on density (both at the ceiling) and 10.66 apart on scarcity. Measured *before* choosing — it ruled out the whole "density-only" candidate class.
- **R5's denominator inverts (0.0938).** It normalises by the quantity the degradation attacks. `scoring/feature-length-defects` and the R5 stack are **alternatives, not a stack**; the owner note now says so and puts this branch first.
- **The brief's slope constraint is nearly infeasible** — any curve rising 10 points over a unit of density has mean slope 10 against a binding ratio of 11.41. Shipped k = 2 (the largest integer under the boundary); k = 4/5/8 measure better and all violate it.
- **Item 4 is a genuine null:** the confound collapses (−0.695 → −0.015) but wiring *lowers* `CLIMAX_RELOCATE` 0.5469 → 0.5156. Exposed, not wired, asserted by a test.

### Costs, none hidden

Six assertions moved, each with its measurement; `COMPOSITE_MIN_GAP` and the PASS line untouched. Two synthetic craft pairs invert — **and they broke at the ORPHAN_CLUE guard, not the formula**, because they were ordered partly by clue-findings on character names. I also record **two errors of my own** (§6.1): commit 4 shipped two spot-check numbers measured against a variant it then rejected, and commit 3's block omitted `discrimination.test.ts`.

One follow-up I deliberately did not do: `MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT` is now ~1000× more conservative than the measured cost (after a 42,062 ms → 191 ms fix), leaving a large ensemble feature at 1.2× headroom. I did not loosen a DoS bound as a side effect of a scoring change.

**Gates:** `npm test` **0** (13,058 tests, 0 failing); lint / no-console / reachability / docs / honesty / brain / build / metamorphic / gates / benchmark all **0**. `check-scoring-receipt main..HEAD` exits **1** naming the PENDING entry — the intended state.

**What the owner's run decides:** the scarcity saturation is byte-identical at ≤15 scenes, so the public benchmark and calibration corpus are blind to it — on the private corpus (median 118 scenes) it removes ~8 points from every script, and whether AUC-24 holds above 0.622 is not knowable here.

## Round 2

**Worktree:** `/home/user/wt-flength` (a git worktree; `/home/user/STORYMACHINE`
was never checked out to, and the only change this lane made there is this
appended section — left for the orchestrator to commit, which it did mid-round as
`3754f60a`; the three final fills below it, the tip SHA, the commit count and the
full-suite row, are the remaining uncommitted diff).
**Branch:** `scoring/feature-length-defects`, tip
`13d64bb58af4123a7534b205489d7d96b6e688e1`, **17 commits** on `main` @ `ad3f6fa7`.
**Sibling branch:** `scoring/feature-length-saturation-only`, tip
`efd1a463014d2974931ebc6d5bf60f1eed447878`, 3 commits on `main` @ `ad3f6fa7`.
Both pushed after every commit; `origin` matches both SHAs exactly.
**Object reviewed:** `4643d590`; review
`docs/audits/2026-09-07-innovation/scoring-review.md`, verdict REVISE, nine items
plus cosmetics.

### Headline first: one of the nine items moved a number, and one item was tried, measured and reverted

| | `main` @ `ad3f6fa7` | round 1 (`4643d590`) | **round 2 final** | floor |
|---|---|---|---|---|
| `SHUFFLE_DROP` matched-pair (PRIMARY) | 0.5313 | 0.8750 | **0.8750** [0.7500, 0.9688] | 0.855 |
| `SHUFFLE_DROP` all-pairs | 0.5586 | 0.8306 | **0.8291** [0.7222, 0.9268] | 0.8091 ← moved DOWN |
| `SHUFFLE_DROP` ordered/inverted/tied | 17/15/0 | 28/4/0 | **28/4/0** | — |
| `SHUFFLE_DROP` mean health gap | −1.93125 | +2.109375 | **+1.89375** | — |
| `CLIMAX_RELOCATE` matched-pair (PRIMARY) | 0.4219 | 0.5469 | **0.5469** [0.3750, 0.7188] | 0.5269 |
| `CLIMAX_RELOCATE` all-pairs | 0.4673 | 0.5151 | **0.5151** [0.4473, 0.5820] | 0.4951 |
| `CLIMAX_RELOCATE` exact ties | 11 of 32 | 1 of 32 | **1 of 32** | — |
| `DIALOGUE_FLATTEN` control | 1.0000 / 0.9473, gap 29.30 | 1.0000 / 1.0000, gap 26.40 | **1.0000 / 1.0000, gap 26.40** | 0.98 / 0.98 |
| blind matched pairs | 1 of 6, −0.0167 | 4 of 6, +0.3833 | **4 of 6, +0.3833** | none |
| calibration bands | MONO, gap 25.32 | unchanged, 21/21 | **unchanged, 21/21** | — |
| `stapled_shorts` witness | +8.2 KNOWN FAIL, **every** ordering failed | −2.0 on ONE ordering; **+0.7 over 14, 7 failing** | **−1.6 over ALL 14 orderings** | — |

Read the last row against the one above it in the round-1 column: that is the
whole of item 1, and it is the only item that moved a benchmark number. The
floors: **one moved, and it moved DOWN** — `PUBLIC_SHUFFLE_DROP_FLOOR`
0.8106 → 0.8091, because the saturation point went from 15 scenes to 12 and one of
the 1,024 all-pairs comparisons went with it. `AUC24_FLOOR` is untouched at 0.622.

**A second, upward re-lock happened and was undone, and that is in the ledger
rather than erased.** Item 3's first attempt at the clue guard read 0.9063 /
0.8433 / 0.5938 and all four measurement floors were re-locked up to match
(0.855 → 0.8863, 0.8091 → 0.8233, 0.5269 → 0.5738, 0.4951 → 0.5039). The one full
`npm test` then showed that attempt had re-admitted character names; it was
reverted and the four floors were re-locked back to exactly the values the
saturation commit left. The 0.9063 figure belongs to a tree that does not ship and
it is quoted nowhere as this branch's reading — only in the record of what was
tried (the doc's §12, the receipt's round-2 section, commit `e4a172a2`).

**Output identity**, `main` @ `ad3f6fa7` against the tip, 45 fixtures: health
moves on **25**, RMS **9.839**, mean **+2.292**, largest **+32.2** on
`transfer-window`, **6 verdict flips**, 5 grade flips. Ignored keys, stated:
`plainSummary` (differs in 34 of 45 — by design, item 6's sentence), `strengths`
(4 of 45), `provenance.engineCommit` (45 of 45). Without those three ignores the
harness reports FAIL, which is the expected state for a formula change.

### The rebase, because it changed the work

Rebased onto `main` @ `ad3f6fa7` (one `--force-with-lease`, plain pushes after
every commit since). Main had moved only in UI and presentation — no scoring-path
file — so the rebase was meant to be clerical. Two brain-graph conflicts resolved
by regenerating, and then a real defect that three of **main's own** new
assertions caught: main added
`tests/fixtures/feature-length/assembled-feature.fountain`, a 2,927-line feature
it ships as "what a real draft looks like", and this branch's per-character voice
eligibility makes the shape guard read the ELIGIBLE SUBSET rather than skipping
the bound whenever one character is a walk-on. That fixture measures 58 eligible
characters pooling 7,655 words — eligible weight **443,990** against a **300,000**
bound — so it was REJECTED, and `does not reject …assembled-feature.fountain`
failed along with the `>= 3x` headroom proof (0.68x) and the legit-set sweep.

Round 1 left that constant alone on purpose, which was right while the only cost
was a synthetic fixture at 1.2x headroom and wrong once the guard refuses a
feature the repository commits. Commit `56bcb758` re-derives it to **1,500,000**,
from measurement, **bracketed on both sides**: at least 3x the heaviest tracked
fixture (≥ 1,331,970) and strictly below the lightest PINNED payload (round-3
bypass B, real-parse weight 1,920,000). Measured worst shape at the bound is
~120 ms against the review's ~10 s target; **no pinned payload changes decision**,
and 2,000,000 was tried first and does flip bypass B to accept (158 ms — no longer
a DoS, but a pinned payload silently changing decision is not something a bound
change gets to do on the way past). Two new assertions hold the bound inside that
bracket and against the recorded rate.

### Commits

```
96c23aee test(p1): a metamorphic witness for the length pathology, shown failing
abde72b9 fix(p1): the voice channel abstains per character, not per script
e5e2b534 fix(p1): a name is not a clue, and neither is the title of the script
6e914dea fix(p1): the formula stops paying for length — scarcity saturation          <- item 8 split
c5c18f96 fix(p1): the formula stops paying for deletion — steepness 50 -> 2          <- item 8 split
8c08c933 feat(p1): the dialogue-share signal, cast-size-free — and the null
c3d3b354 fix(p1): the summary paragraph may not contradict the five numbers
4cdf5ee4 test(p1): re-anchor the two assertions the full suite found, with their cause
--- round 2 ---
56bcb758 fix(guard): re-derive the voice-eligible-weight bound (the rebase collision)
5362dee9 fix(p1): close the length pathology over ORDERINGS — saturation 15 -> 12     <- items 1, 2, 4, 6, 7
768a3274 fix(benchmark): the printed caveats are rendered FROM the run                <- item 5
5e509394 fix(p1): ORPHAN_CLUE's proper-noun guard stops deleting real props           <- item 3 (partly reverted)
0eda5d15 test(p1): the verdict tier closes on its own merits, NOT-WIRED widened       <- items 9a, 9b
b0a35cb7 docs(p1): the receipt, the doc and the owner note say what round 2 did       <- items 7, 7a, 8
89a3c038 fix(gates): the unverified-gates report stops quoting a stale measurement    <- found by a gate
e4a172a2 fix(p1): revert the clue-guard narrowing — it re-admitted four real names    <- item 3, corrected
13d64bb5 docs(p1): the clue guard's header says which cause is fixed and which is not  <- comment-only
```

The original formula commit `7a8af30c` is split into `6e914dea` (saturation) and
`c5c18f96` (steepness). The split is **tree-identical at the join**:
`git diff 7a8af30c c5c18f96` is empty, and so is `git diff 3b6e6526 4cdf5ee4`
after the three downstream commits were replayed. Saturation goes first so each
commit leaves a green tree — steepness alone fails the witness, saturation alone
does not.

### The nine items

**1. The staple witness, closed over orderings — and it needed a formula change.**

Reproduced the reviewer's finding to the decimal: alphabetical 79.8 PASS, reversed
82.4 FAIL, twelve mulberry32 permutations
`81.8 81.2 81.4 82.4 80.6 82.0 82.5 82.2 82.2 81.4 79.1 82.2` against a best part
of 81.8 — 7 of 14 failing, range 3.4 against a margin of 2.0.

*Measured which term the ordering-dependence rides on, before choosing.* Every
ordering has identical scene count (139) and word count (11,412), so scarcity and
the word denominator are constant across the set. Decomposed into
`100 − densityPenalty − scarcityPenalty − deductions` at sat=15:

```
ordering        health   base   deductions   dens    scar
alphabetical      79.8   82.30        2.50   8.37   9.333
reversed          82.4   82.40        0.00   8.27   9.333
perm1..perm12   79.1-82.5  81.80-82.70  0.00-2.90  7.97-8.87  9.333
```

The ordering moves the feature-scale deductions (0.00 to 2.90 — arc incoherence)
and, slightly, density. The staple's `base` is **above** the best part's 81.8 in
every ordering, so the invariant was carried entirely by a term that is sometimes
exactly zero. Not a margin too small: a margin resting on a term that can vanish.

*The fix is arithmetic.* The comparison is a 139-scene document against a
12-scene best part, so this term's contribution is
`140/min(139,S) − 140/min(12,S)`: exactly 0 for every `S ≤ 12`, a length BONUS for
every `S ≥ 13` (2.333 points at S=15). `SCARCITY_SATURATION_SCENES` 15 → 12.

```
sat   best part   max ordering   margin   failing orderings
 12        81.8          80.2     -1.6             0 / 14   <- CHOSEN
 13        81.8          81.1     -0.7             0 / 14
 14        81.8          81.9     +0.1             1 / 14
 15        81.8          82.5     +0.7             7 / 14
```

**13 also passes and is not chosen**, and that is stated in `doctor.ts`, in the
doc and in the metamorphic case: it passes by 0.7 against a 14-member sample whose
own spread is 3.4, out of 12! orderings — the same reasoning round 1 was faulted
for. At 12 the margin is the staple's own density disadvantage plus its
deductions, because the scarcity term is removed from the comparison by arithmetic
rather than out-measured in it.

*The witness asserts the property.* `MetamorphicCase.variants` (new, optional,
documented) makes a case judged on the MAXIMUM over a variant set;
`stapledShortsOrderings()` is the reviewer's 14 — canonical, reversed, twelve
mulberry32 permutations seeded 1..12, PRNG replicated with fixed seeds so the set
is identical on every machine. The runner prints the spread on PASS as well as on
failure. **FAIL-FIRST PROVEN:** with the constant put back to 15 the new witness
reads `HARD FAIL (Δ=0.70 ≤ 0?) [n=14, min 79.1, max 82.5, range 3.4]` — the
reviewer's number.

*What is NOT closed, and nothing on the branch now says otherwise.* Below the
saturation point the term still decreases, so a staple whose best part has fewer
than 12 scenes still collects `140/min(bestPartScenes,12) − 140/12` — 3.889 points
for a 9-scene best part. The provable statement is narrower: **scene count buys
nothing at or above 12 scenes, and the residue otherwise is exactly that
expression, zero iff the best part is itself at or past the point.** Both halves
are asserted in `tests/core/script-doctor.test.ts` (the term equals
`140/min(n,12)` for every n from 2 to 400; flat above, strictly decreasing below;
the residue equals the expression). Closing it for all part lengths means
flattening the term everywhere, which deletes the deficiency signal it carries.
The promotion comment's "fails the build if length alone ever buys health again"
is gone.

*Cost:* the table above, plus — calibration byte-identical (all 20 samples are
9-10 scenes), 6 of 32 manifest health rows move (13-and-14-scene scripts, −0.9 /
−1.7) with zero verdict flips, and `scene_dup_padding`'s metamorphic margin
RECOVERS −2.1 → −4.4.

**2. The slope-constraint table.** Population stated (the **16** scripts sub-1 at
both ends, binding `the-deposit-excellent` at **11.42**); over all 32 the minimum
is **6.67**, and under that reading no admissible curve exists at all — which is
why the filter was being applied and not stated. All sixteen rows printed. The two
non-reproducing rows removed with their measured values and why they never
belonged (`signal-drift-excellent` 0.4410/13.61 → 0.4849/12.37, intact density
1.0439; `quiet-season` 0.3905/15.36 → 0.5705/10.52, intact density 1.1800 — both
power branch). The four omitted scripts named **with what the omission meant**:
they are exactly the four whose damaged copy still wins (`transfer-window` +8.9,
`room-12` +8.4, `the-key-under-the-mat` +1.6, `quiet-season` +0.1), all on the
density POWER branch, which no choice of steepness can reach. A writer of a dense
10-scene script can still gain 8.9 points by deleting a third of their scenes;
`auc.ts` now names all four beside its own 28/4/0 narrative. The max-slope table
is no longer rounded (13.1392, 20.7557). My table reproduces the reviewer's to the
decimal. One trap recorded in §12.1: `shuffleDropDegrade(text, seedKey)` takes the
FILE PATH, not a seed integer — passing `degradationSeed(file)` produces a
different document and a different table, which cost me one wrong run.

**3. ORPHAN_CLUE — two of three shapes closed at the cause, the third measured
and left open. This is the item where I got it wrong first.**

All three shapes reproduced on the lane's own fixture body, and all three were
suppressions of a genuine prop:

```
cue changed to KEY                         ["mara-voss"]   brass-key GONE
title THE BRASS KEY, prop BRASS KEY        ["key-title"]   prop gone, nonsense id in
title LEVERAGE, prop LEVERAGE              []              channel silenced
caps "MARA REVOLVER", prop REVOLVER        []              vs ["revolver"] for the control
```

*What shipped and then came back out.* I narrowed the full-name learning pass to
require the INTRODUCTION MARKER — a comma or an opening parenthesis immediately
after the caps run — which closed all four shapes and moved every benchmark
statistic upward. **The one full `npm test` failed**, on
`tests/core/agency-signal.test.ts`'s locked table: `the-defense-rests`'
`d2Disagreement` cell moved true → false, because `legacyIsPassive` reads
`record.seededClueIds.length === 0` and scene 10 had started seeding
**"jordy-lane"** — a character. "Desi recounts the recorder's index discovery to
two fellow associates, **JORDY LANE** and FEN ABIODUN, growing more animated":
in a LIST introduction the comma follows the LAST name. Widening the marker to
`and`/`&`-joined runs fixed that one, and a new corpus-wide property test then
found **four more**, every one an introduction with no marker at all:

```
mise                   "renee-okafor"       "Front-of-house manager RENEE OKAFOR checks a printed ..."
the-defense-rests      "judge-paretsky"     "JUDGE PARETSKY watches over reading glasses, unreadable."
the-defense-rests      "court-clerk-etta"   "COURT CLERK ETTA MOSS passes with a cart of files."
the-key-under-the-mat  "real-estate-agent"  "A REAL ESTATE AGENT walks the room with a clipboard ..."
```

*So the narrowing is reverted* (`e4a172a2`), with the attempt, the measurement and
the reversal recorded above the learning pass. Trading four real character names
on real scripts for two synthetic fixtures is the wrong direction for a guard
whose entire job is excluding names. **Why it cannot be fixed there, stated rather
than implied:** "BRASS KEY" beside a character called KEY is lexically identical
to "JUDGE PARETSKY" beside a character called PARETSKY — a multi-word caps run in
an action line, one of whose words is a cue name. The corpus has four of the
second shape and none of the first. Separating them needs information this pass
does not have (a role-title lexicon, or animacy), and this file's
one-list-per-signal convention is a reason to measure such a lexicon before adding
one, not to add it for two fixtures.

*What survives, and it is the unambiguous half.* The TITLE guard now excludes a
title token only when it occurs **nowhere outside the title-page region**, which
fixes the structural defect (`segmentScenes` folds the title page into scene 1)
without deleting every prop a script is named after. Shapes (ii)a and (ii)b are
hard FIRES fixtures. Shapes (i) and (iii) are `todo` fixtures carrying their
measured id lists and the undecidability reason — the reviewer's own stated remedy
for this case. The false claim is removed from `fountain-analyzer.ts` and from the
doc; it also stands in commit `e5e2b534`'s message, which is immutable history,
and both live places say it is retracted. **A NO-FIRE case** pins the capability
the narrowing would have cost (`detective`/`bellweather` still learned from a cue
of RAY), and **a new hard corpus-wide property** — no multi-word seeded clue on any
of the 20 CC0 scripts shares a word with a cue name — is the guard that caught the
four and will catch the next one **at the guard instead of three files away**.
**FAIL-FIRST PROVEN** for that property: with the marker gate restored it fails
naming all five ids.

Net effect on the benchmark: **none**. The title collision does not occur in the
32 corpus scripts, so the shipping tree's six statistics are exactly the
saturation commit's.

**4. The credit-cap residue.** All three corrected in
`tests/core/script-doctor.test.ts`: "three constants moved" → two, with the
rejected candidate named; `CREDIT_FULL_SCENES` removed (it exists nowhere in the
tree); `8.5/300^0.7 = 0.1889` → `= 8.5/54.22 = 0.1568`. The tree-wide grep found a
**fourth** instance the reviewer did not list: the doc's §8.4 item 2 still quoted
the rejected variant's `82.7` and `57.7`. Corrected with the reason.

**5. The benchmark printout.** `PUBLIC_BENCHMARK_LIMITS` replaced by
`publicBenchmarkLimits(result)`, interpolating every live figure from the
`BenchmarkResult`; two derived readings computed rather than retyped
(`pinnedScriptCount`, `blindPairOrdering` — the latter reproduces the 4 of 6 /
+0.3833 reported elsewhere); the interval sentence NAMES which intervals contain
0.5 instead of asserting all four do. Five new tests parse the RENDERED text and
refuse any four-decimal figure the run did not produce, plus the pinned/tie/movable
counts, the blind-pairs count, the interval verdict, and the control's sign counts
and gap. **FAIL-FIRST PROVEN:** re-hardcoding `Control: 1.0000 / 0.9473` fails with
"the caveats quote 0.9473, which this run did not produce".

**6. The disclosure sentence.** It now states the gap it is quoted beside, names
every term that makes it (the document density penalty, the scarcity term, the
document-scale deductions, and the dimension's own differently-curved density), and
claims only what is true of all of them. On the staple the displayed gap is 4 and
the term is 12; `summary-honesty.test.ts` asserts the quoted gap IS the real
displayed gap, that the term dwarfs it there, and that the false causal clause is
gone. Its corpus property was widened from "at least 10 of 20 take the
lowest-scoring branch" — which the saturation move broke without making anything
less honest — to "every one of the 20 takes exactly one branch and satisfies that
branch's invariant".

**7. The owner-facing framing.** Rewritten in all three places (receipt,
measurement doc §8.2a, owner note) around the two separable effects: a
**~10.480-point near-uniform level shift** at the private median of 118 scenes,
which moves verdicts, grades and all 72 manifest rows but is rank-preserving and
therefore cannot move a matched-pair statistic at all; and the **scarcity
channel's per-script degradation delta going from +0.586 to exactly 0.000** for
every script of roughly 22 scenes or more, which is what AUC-24 measures. What the
run can and cannot settle is a list. **7a:** "six commits" (there were seven) and
"Four assertions moved" (there were six) corrected with the reason. **7b:** the
floor coupling is a named paragraph in `auc.ts`; on the shipping tree only one
floor moved and it moved down, so the hazard is smaller than it was mid-round, and
the paragraph says what to do if `measure-real` forces a revert (revert the scoring
change and re-lock from the reverted tree, never lower a floor — which is exactly
what `e4a172a2` did when the clue narrowing was reverted, so the procedure is now
demonstrated and not only described).

**8. Split, and a second branch.** The reviewer is right: R5 changes
`densityPenalty` only and leaves `scarcityPenalty` untouched — they collide on ONE
function. The conclusion survives, the owner note now carries the corrected reason
plus a three-step decision tree, the formula commit is split, and
`scoring/feature-length-saturation-only` (tip `efd1a463`) carries the saturation
half on `main` @ `ad3f6fa7` with its own re-locked floors, its own §11 addendum in
the public-benchmark doc, its own brain note and its own PENDING receipt. Measured
there, stated before the benefit in all four places:

```
SHUFFLE_DROP     paired 0.5313 — byte-identical to main's; 17/15/0
                 all-pairs 0.5586 -> 0.5493
                 mean health gap -1.93125 -> -2.15   <- WORSE
CLIMAX_RELOCATE  paired 0.4219 — byte-identical; 8/13/11, all 11 ties remain
                 all-pairs 0.4673 -> 0.4746
DIALOGUE_FLATTEN control 1.0000 / 0.9473 unchanged
calibration      byte-identical, 21/21
staple witness   +6.4 KNOWN FAIL -> 0.0 PASS over all 14 orderings
```

Two honest caveats on that branch: the mean gap gets **worse** (the saturation
alone does not fix the deletion reward), and the witness passes at a margin of
**exactly 0.0**, because without the steepness change the density penalty is
pinned at its ceiling for both documents (0.013 apart) and the whole margin is a
deduction term that is often zero — the invariant holds by construction there and
never strictly. Two floors re-locked from its own run, one down
(`PUBLIC_SHUFFLE_DROP_FLOOR` 0.5386 → 0.5293) and one up (`PUBLIC_ORDER_FLOOR`
0.4473 → 0.4546); `AUC24_FLOOR` untouched.

**9a.** Better than asked: the verdict-tier assertion round 1 re-opened as `todo`
is a **hard check again, on its own merits** — intact 79 CONSIDER / flattened 58.2
PASS, a 20.8-point drop crossing the PASS line by 1.8, with neither threshold
moved (health 60, delta gate 20.0). The GRADE-tier check stays and is labelled as
the thinner of the two, with the reason (the 20.0 delta gate implies a grade drop
for any intact score below 95; the two are kept because they read different
thresholds, 75 and 60). The file has no `todo`.

**9b.** The `NOT WIRED` guard reads the whole scoring-path file set — 68 files on
this tree — enumerated from the one place that defines it,
`check-scoring-receipt.mjs`'s own classifier, newly exported as
`scoringPathFiles()`. One named exclusion (`structural-signals.ts`, which defines
the field), asserted to be on the scoring path before being excluded.
**FAIL-FIRST PROVEN:** a reference planted in
`server/nvm/revision/passes/belief.ts` — a file the old guard never read — fails it
by name.

**Cosmetics, all fixed:** the mean gap and ΔdensityPenalty are no longer truncated
(+2.109375; 7.632 in all six places it appeared); `densityPenalty` no longer takes
a `sceneCount` it discards with `void`; the R5 derivation gives the weighted-issue
ratio on BOTH trees (0.5018 → 0.667 on main, 0.5460 → 0.726 on the branch) instead
of two derivations silently disagreeing; the max-slope table carries full
precision; two references to a `tests/core/monotonicity.test.ts` that does not
exist now point at the P0.1 property that does; the control's mean gap reads 26.40
rather than a carried-forward 29.30; and the pre-existing metamorphic
order-sensitivity margins are now in the record — `scene_shuffle` −1.6,
`scene_reverse` −0.4, `scene_dup_padding` −2.1 → **−4.4** (recovered by the
saturation move).

**Found by running a gate rather than trusting it (`89a3c038`):**
`scripts/report-unverified-gates.mjs` carried a frozen copy of the 2026-09-06
reading in its `doesNotProve` string — six figures, all stale — and `npm run
gates` runs the benchmark's own suite, so the command printed the stale prose and
the fresh numbers in one session. Same defect as item 5, one file over, and it got
the same treatment rather than a number edit: the string no longer quotes any
point estimate.

### Gates

All run in the foreground in `/home/user/wt-flength`. **No browser battery** —
none of the changed surfaces is a browser surface, and `plainSummary` is asserted
as a string by `tests/core/summary-honesty.test.ts`.

| gate | command / result | exit |
|---|---|---|
| touched suites | `clue-proper-noun-guard` 12/0/2todo · `agency-signal` 52/0 · `script-doctor` 90/0 · `summary-honesty` 9/0 · `public-benchmark` 33/0 · `feature-scale-discrimination` 7/0 · `structural-signals` 22/0 · `fountain-shape-guard-cue-parity` 649/0 · `discrimination` 12/0 · `calibration` 21/0 · `blind-pairs-discrimination` 4/0 · `rebuild-experiment` 40/0 · `report-unverified-gates` 25/0 · `brain-coverage` 7/0 | **0** |
| public benchmark | `npm run benchmark:public` | **0** |
| `--lock` | run three times in total, each in the commit that changed the formula, each diff read and printed in the doc's §8.3; the net effect on the shipping tree is ONE floor, down | **0** |
| metamorphic | `npm run test:metamorphic` — 7 hard passes, witness −1.6 over 14 orderings, spread printed | **0** |
| output identity | `check-doctor-output-identity.mjs --tree … --out …` both trees, then `--compare` with `--ignore-keys plainSummary,strengths,provenance.engineCommit`; figures above | FAIL without the ignores (expected for a formula change) |
| receipt gate | `node scripts/check-scoring-receipt.mjs main..HEAD` — names exactly ONE `PENDING ENTRY`, the 2026-09-07 one; the gate's own `validateEntry` reports that single problem and no missing field, so all four required fields are present with PENDING values | **1** |
| conversion recipe | the owner's three scans applied mechanically to that entry on a `git clone --shared` scratch copy, then the real CLI: "gained a well-formed new entry in the same range. OK." (before: exit 1) | **0** |
| lint | `npm run lint` | **0** |
| no-console | `npm run check-no-console` | **0** |
| reachability | `npm run check-server-reachability` | **0** |
| build | `npm run build` | **0** |
| docs | `npm run check-docs` | **0** |
| honesty | `npm run honesty-audit` | **0** |
| brain | `npm run check-brain` — 99 notes, 331 links, fresh | **0** |
| unverified gates | `npm run gates` | **0** |
| **full suite** | `npm test` on the final tree `13d64bb5` — **13,124 tests, 13,028 pass, 0 fail**, 91 skipped, 5 todo (the 2 new clue `todo`s, the 2 pre-existing discrimination craft pairs, and 1 informational latency report) | **0** |

An earlier full `npm test` on the pre-revert tree read 13,124 tests / 1 fail, and
that failure is the agency-signal catch described under item 3. It is reported
rather than quietly superseded: it is the reason this round has a sixteenth commit.

Saturation-only branch, gates run on it: `script-doctor` 89/0 · `calibration`
21/0 · `public-benchmark` 28/0 · `discrimination` 14/0 · `test:metamorphic` 0 ·
`benchmark:public` 0 · `lint` 0 · `check-docs` 0 · `check-brain` 0 ·
`brain-coverage` 7/0 · `check-scoring-receipt main..HEAD` **1**, naming its own
PENDING entry. It did not get a full `npm test`; the brief asks for one, on the
final tree of the lane branch.

### What was left undone, and why

* **The four power-branch inversions** (`transfer-window` +8.9, `room-12` +8.4,
  `the-key-under-the-mat` +1.6, `quiet-season` +0.1). Out of reach of this change
  by construction — the sub-1 slope constraint cannot govern a script whose density
  exceeds 1 at both ends. Named in `auc.ts`, in the doc's §8.2, and in §12's
  residue list.
* **The sub-12-scene length residue.** Not closable by the saturation point
  without flattening the term and deleting the deficiency signal. Asserted as
  arithmetic rather than described.
* **Two of item 3's four shapes.** Lexically undecidable at that pass; `todo`
  fixtures with measured id lists, plus the hard corpus-wide property that keeps
  the four real names out. A role-title lexicon is the next thing to measure, and
  measuring it is the work, not adding it.
* **The pre-registered split is still reported, not used.** All six floors are
  locked from all 32 scripts, holdout included — unchanged by this round, and the
  caveat still says so in the text the benchmark prints.
* **No AUC-24 number.** The private corpus is not present. The receipt stays
  PENDING, every required field is present with a PENDING value, and the owner's
  three-scan conversion recipe is proven still to exit 0 on it.
