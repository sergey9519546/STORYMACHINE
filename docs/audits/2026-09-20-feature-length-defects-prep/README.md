# 2026-09-20 — preparing `scoring/feature-length-defects` for measurement

**Lane:** `lane/land-feature-length-defects`, worktree from `e79c64b4`.
**Merged:** `origin/scoring/feature-length-defects` @ `bcc96f85` (18 commits,
42 files) via `git merge --no-ff`, merge commit `058f48c0`.
**Runbook followed:** `docs/audits/2026-09-20-parked-branches/README.md`
§ `scoring/feature-length-defects` — REBASE-THEN-LAND.
**Template followed:** `docs/audits/2026-09-20-advice-rule-fixes-landing/README.md`.
**Receipt:** the 2026-09-20 PUBLIC-CORPUS entry at the end of
`docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`.

**This lane does not land the branch, and it is not a merge decision.** It
merges the branch onto the session branch in a worktree, resolves thirteen
conflicts, measures everything that can be measured without the private corpus,
and stops. No real-corpus figure is claimed anywhere in this record:
`REAL_SCRIPT_CORPUS_DIR` was never set, and the corpus is not present in this
environment.

**The one thing to read before anything else: every one of the six public
floors is CLEARED, and no floor was re-locked. Three test failures are left
standing on purpose, and one of them — the voice-eligible-weight bound — is a
decision the owner has to make before this branch can land at all. See §6.**

---

## 1. What the branch is

Two formula constants and four report defects, from the 2026-09-06 product
discovery and its three review rounds
(`docs/scoring/FEATURE_LENGTH_DEFECTS_2026-09-07.md`, merged in with the
branch):

1. **`scarcityPenalty` saturates at 12 scenes** — `140/min(sceneCount, 12)`.
   Scene count buys nothing at or above 12, which closes the staple pathology:
   twelve CC0 shorts, each 71-79 and every one CONSIDER, stapled end to end
   used to score 86.5 and RECOMMEND. It is identity below 12 scenes, so the
   public corpus and the calibration corpus are nearly blind to it and the
   private corpus is not.
2. **`SUB_DENSITY_STEEPNESS` 50 → 2**, with the sub-1 curve re-anchored to meet
   the power branch exactly at density 1. The near-step logistic handed back
   its entire 10-point range in one step when a drop removed weighted issues
   faster than words, so deletion paid.
3. **`analyzeVoices` abstains per CHARACTER, not per script**, with a 220x
   performance fix and the shape guard's cost model moving to the eligible
   subset.
4. **`ORPHAN_CLUE` gains a proper-noun / title / location guard** — a 139-scene
   document's critical tier was eight character names.
5. **`meanAbsDialogueShareDeltaNormalised`** exposed and NOT wired, on a
   measured null, asserted by a test.
6. **`buildPlainSummary` / `buildStrengths`** can no longer contradict the five
   dimension scores.

## 2. Conflicts and how each was resolved

Thirteen files, seven docs and six code — one code file more than the
parked-branches triage predicted against `26d930dd`, and one file that never
conflicted had to change anyway (`src/lib/voice-separation-copy.ts`).

| file | conflict | resolution |
|---|---|---|
| `docs/brain/GRAPH.md`, `docs/brain/brain.graph.json` | content | OURS. Generated; the orchestrator regenerates. |
| `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` | content | both sides kept in order, no entry dropped from either. The branch's entry was then rewritten in place — §4. |
| `docs/p1-benchmark/PUBLIC_BENCHMARK_2026-09-06.md` | content | both addenda kept. The branch's was written as §11 before `main` had one, so it is renumbered §12 with a note that the section numbers follow landing order, not measurement order. This lane's own §13 is appended. |
| `docs/brain/Branches/Branch - Feature-Length Defects.md` | add/add | UNIONED. Ours knew the 2026-09-12/13 voice-bound correction and the `burrowsDelta` finding; theirs had the per-channel measurement tables and the two-part account of what AUC-24 can settle. |
| `docs/brain/Branches/Branch - Feature-Length Saturation Only.md` | add/add | UNIONED, theirs as the base (it is the fuller note), plus ours' branch SHA and reviewer sentence. |
| `docs/brain/Owner/Owner - R5 Measurement and Merge.md` | content | ours for the command and the branch table (`owner:measure` superseded the hand sequence), plus the branch's decision tree spliced in as a subsection — the ours side pointed at it as living "ON THE BRANCH", and after this merge it lives here. |
| `scripts/lib/auc.ts` | content | the branch's four floor constants taken as the branch's own content; BOTH narrative blocks kept, each labelled with the tree it describes, because neither describes the merged one. |
| `scripts/lib/public-benchmark.ts` | content | the branch's `publicBenchmarkLimits(result)` renderer taken — see §2.1. |
| `scripts/report-unverified-gates.mjs` | content | the branch's no-point-estimate `doesNotProve` text PLUS ours' "AND NOT that the floors are WELL CHOSEN" paragraph. |
| `server/lib/validation.ts` (3 hunks) | content | the branch's per-character eligibility and its single `voiceEligibleWeightReason`; its 1,500,000 weight bound NOT taken — see §2.2. |
| `src/components/scriptide/CoverageSummary.tsx` (2 hunks) | content | both behaviours, by moving the branch's copy into the shared module — see §2.3. |
| `tests/core/public-benchmark.test.ts` | content | the branch's INVERTED tie assertion, which is what the ours-side assertion's own failure message asked for ("If the density cap stopped pinning scripts, that is a real scoring change"). Measured here: 0 scripts pinned at 76.0, 2 ties of 32. |
| `tests/security/fountain-shape-guard-cue-parity.test.ts` | content | both import sets. |

### 2.1 The printed caveats: one renderer, two callers

The branch replaced the frozen `PUBLIC_BENCHMARK_LIMITS` string with
`publicBenchmarkLimits(result)`, because the constant had drifted and
`npm run benchmark:public` was printing five numbers its own table contradicted
forty lines above. `main` meanwhile added `--limits` (a ~0.3 s runless print)
and `tests/core/public-benchmark-limits.test.ts`, which greps that command's
real stdout for finding 6's corrected `ARC_DED_MIN_SCENES` sentence and asserts
it prints `PUBLIC_BENCHMARK_LIMITS` verbatim. Keeping the constant AND the
function would reintroduce exactly the drift the branch fixed.

Resolved by making the result optional: `publicBenchmarkLimits(result?)` renders
the same caveats with every live figure replaced by the sentence that says no
measurement was run, and `PUBLIC_BENCHMARK_LIMITS` is that renderer called with
no argument. `--limits` keeps working, the grep keeps checking printed bytes,
and no number is frozen anywhere. Finding 6's corrected sentence (the one that
names `ARC_DED_MIN_SCENES` alone and records that `climaxZoneDecayDeduction` is
exported and wired into nothing) is carried over the branch's older two-constant
wording. `tests/core/public-benchmark-limits.test.ts` 7/7.

### 2.2 The voice-eligible-weight bound: `main`'s 675,000 stands

The branch re-derived `MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT` to **1,500,000**,
bracketing fixture WEIGHTS below the lightest pinned payload. The independent
review of the `main`-side lane that made the same change showed weight is not a
cost proxy across shapes: at 1,500,000 the worst admitted shape is 223 speakers
x 30 words, which costs 27-36 s in `runScriptDoctor` against a 30 s budget.
`main` answered with a SECOND bound — 675,000 plus
`MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT` = 80, derived on the GitHub runner.

So `main`'s pair is kept and the branch's number is dropped. What IS taken from
the branch: its per-character eligibility, its single `voiceEligibleWeightReason`
implementation (so the real-parse path and the retired legacy path evaluate one
bound and the round-7 equivalence proof still compares two DATA SOURCES rather
than two sets of bounds — the cast bound now applies on both), and its two
cost-model constants, which are asserted against 675,000: 675,000 x 0.173 us =
117 ms, 85x under the review's 10 s target. The cast bound is checked SECOND, so
every payload the weight bound already rejects keeps the message it has always
had.

**This leaves a real, unresolved collision. See §6.1.**

### 2.3 The Voice Separation tooltip: three states, one module

`main` moved this tile's copy into `src/lib/voice-separation-copy.ts` so that no
surface types the channel's words itself, and
`tests/core/voice-separation-abstention.test.ts` asserts the tile's source
contains the exact call `voiceSeparationTooltip(report.voiceAnalysis,
report.characters?.length ?? 0)`. The branch added a THIRD state — the channel
reports, but on a subset of the cast — and implemented it as three new
`STAT_DEFINITIONS` entries and a computed string inside the component.

Both behaviours are kept by moving the branch's sentence into the module:
`VoiceAnalysisReading` gains an optional `excludedCharacters`,
`voiceSeparationTooltip` appends `VOICE_SEPARATION_EXCLUDED_PREFIX` plus up to
six held-out names when the channel reported on a subset, and the component's
local builder is deleted. The exact call the test pins is unchanged.

## 3. Output identity — 45 fixtures, 25 health moves, 0 scene-count moves

`git archive e79c64b4` baseline, `GIT_SHA=dev` on both sides,
`node scripts/check-doctor-output-identity.mjs`. Health moves on **25 of 45**
(RMS **9.839**, mean **+2.292**, 17 up / 8 down), **6 verdicts flip**, 5 grades
flip, `sceneCount` moves on **0 of 45**. That reproduces the branch's own
round-2 figures exactly (25, RMS 9.839, mean +2.292, largest +32.2, 6 verdicts).

| fixture | scenes | health | Δ | verdict | findings |
|---|---|---|---|---|---|
| `screenplay/transfer-window` | 10 | 31.9 → 64.1 | +32.2 | **PASS → CONSIDER** | 218 → 133 |
| `screenplay/room-12` | 10 | 33.5 → 63.9 | +30.4 | **PASS → CONSIDER** | 197 → 125 |
| `screenplay/runoff` | 9 | 74.6 → 78.6 | +4.0 | CONSIDER | 142 → 136 |
| `screenplay/off-season` | 9 | 71.2 → 74.8 | +3.6 | CONSIDER | 171 → 114 |
| `p0/sample-script` | 12 | 78.3 → 81.8 | +3.5 | CONSIDER | 173 → 172 |
| `screenplay/dead-frequency` | 12 | 78.3 → 81.8 | +3.5 | CONSIDER | 173 → 172 |
| `screenplay/mise` | 12 | 74.2 → 77.4 | +3.2 | CONSIDER | 208 → 133 |
| `screenplay/red-line` | 14 | 73.7 → 76.7 | +3.0 | CONSIDER | 246 → 173 |
| `screenplay/high-voltage` | 13 | 75.4 → 78.3 | +2.9 | CONSIDER | 213 → 138 |
| `screenplay/counter-offer` | 10 | 76.0 → 78.8 | +2.8 | CONSIDER | 191 → 171 |
| `screenplay/close-quarters` | 13 | 75.6 → 77.8 | +2.2 | CONSIDER | 191 → 131 |
| `screenplay/the-defense-rests` | 12 | 77.0 → 78.5 | +1.5 | CONSIDER | 187 → 132 |
| `screenplay/chain-of-custody` | 13 | 76.3 → 77.7 | +1.4 | CONSIDER | 178 → 129 |
| `screenplay/undertow` | 12 | 77.1 → 78.2 | +1.1 | CONSIDER | 159 → 136 |
| `screenplay/same-page` | 11 | 75.8 → 76.8 | +1.0 | CONSIDER | 166 → 150 |
| `screenplay/soft-launch` | 12 | 77.3 → 78.1 | +0.8 | CONSIDER | 162 → 145 |
| `screenplay/quiet-season` | 10 | 73.2 → 73.8 | +0.6 | CONSIDER | 138 → 119 |
| `screenplay/code-blue` | 14 | 78.0 → 77.8 | −0.2 | CONSIDER | 194 → 157 |
| `screenplay/two-lane` | 13 | 79.0 → 78.7 | −0.3 | CONSIDER | 174 → 150 |
| `screenplay/the-detour` | 11 | 74.0 → 73.4 | −0.6 | CONSIDER | 155 → 155 |
| `screenplay/the-key-under-the-mat` | 11 | 74.2 → 72.5 | −1.7 | CONSIDER | 189 → 213 |
| `synthetic/300-scenes` | 306 | 88.4 → 79.6 | −8.8 | **RECOMMEND → CONSIDER** | 957 → 985 |
| `synthetic/60-scenes` | 62 | 85.6 → 76.6 | −9.0 | **RECOMMEND → CONSIDER** | 578 → 591 |
| `synthetic/120-scenes` | 120 | 86.6 → 76.7 | −9.9 | **RECOMMEND → CONSIDER** | 758 → 751 |
| `synthetic/240-scenes` | 244 | 87.5 → 77.6 | −9.9 | **RECOMMEND → CONSIDER** | 908 → 948 |

**Attribution, per term rather than per fixture.**

* **The four synthetic scale fixtures are `scarcityPenalty` and nothing else.**
  `140/sceneCount → 140/min(sceneCount, 12)` predicts −9.41 / −10.50 / −11.09 /
  −11.21 at 62 / 120 / 244 / 306 scenes, against measured −9.0 / −9.9 / −9.9 /
  −8.8; the residue is the density curve returning a little of it. These four
  are the only fixtures in the repository long enough for that term to be the
  story, and they all cross RECOMMEND → CONSIDER.
* **The 21 shorts are `densityPenalty` plus the `ORPHAN_CLUE` guard.** Every one
  is 9-14 scenes, where the saturation is identity or nearly so (0.00 to −1.67),
  so their +0.6 to +4.0 is the sub-1 curve, and their large finding drops
  (`transfer-window` −85, `high-voltage` −75, `mise` −75) are the proper-noun
  guard no longer filing character names as critical clues.
* **`transfer-window` +32.2 and `room-12` +30.4** are the two scripts that sat
  on the old curve's floor. They are the change's headline and its largest
  single risk: a 30-point move on a committed fixture is the kind of thing the
  private-corpus run exists to sanity-check.
* **Not one of the 20 calibration samples moves.** `tests/core/calibration.test.ts`
  is 21/21 and band monotonicity is untouched, which is what the branch claimed.

## 4. Public benchmark — before, after, every floor cleared, none re-locked

`npm run benchmark:public -- --json`, N=32, 2000-resample bootstrap at seed 42,
on a `git archive e79c64b4` checkout and on this tree.

| channel | statistic | `e79c64b4` | this tree | floor | status |
|---|---|---|---|---|---|
| SHUFFLE_DROP | matched-pair (PRIMARY) | 0.5313 | **0.8750** [0.7500, 0.9688] | `PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR` 0.855 | **above** |
| SHUFFLE_DROP | all-pairs | 0.5586 | **0.8291** [0.7222, 0.9268] | `PUBLIC_SHUFFLE_DROP_FLOOR` 0.8091 | **above** |
| CLIMAX_RELOCATE | matched-pair (PRIMARY) | 0.4063 | **0.5938** [0.4219, 0.7500] | `PUBLIC_ORDER_PAIRED_FLOOR` 0.5269 | **above** |
| CLIMAX_RELOCATE | all-pairs | 0.4443 | **0.5269** [0.4639, 0.5986] | `PUBLIC_ORDER_FLOOR` 0.4951 | **above** |
| DIALOGUE_FLATTEN (control) | matched-pair | 1.0000 | 1.0000 [1.0000, 1.0000] | `PUBLIC_DIALOGUE_FLATTEN_PAIRED_FLOOR` 0.98 | **above** |
| DIALOGUE_FLATTEN (control) | all-pairs | 0.9473 | **1.0000** [1.0000, 1.0000] | `PUBLIC_DIALOGUE_FLATTEN_FLOOR` 0.98 | **above** |

| other statistics | `e79c64b4` | this tree |
|---|---|---|
| SHUFFLE_DROP ordered / inverted / tied | 17 / 15 / 0 | **28 / 4 / 0** |
| SHUFFLE_DROP mean health gap | −1.9313 (damaged copy higher) | **+1.8937** |
| CLIMAX_RELOCATE ordered / inverted / tied | 8 / 14 / 10 | **18 / 12 / 2** |
| CLIMAX_RELOCATE mean health gap | −1.2344 | **+0.0875** |
| DIALOGUE_FLATTEN ordered / inverted / tied | 32 / 0 / 0 | 32 / 0 / 0 |
| DIALOGUE_FLATTEN mean health gap | +29.30 | **+26.40** |
| scripts pinned at health 76.0 | 10 | **0** |

**The shuffle-drop row reproduces the branch exactly** (0.8750 / 0.8291,
28/4/0, +1.89). **The climax-relocate row does not, and must not be compared to
the branch's 0.5469 / 0.5151**: the branch measured against a tree whose
relocation spliced the final scene at position TWO, and `main` corrected that to
position ONE on 2026-09-12 (adversarial finding 12). This tree measures a
stronger manipulation and reads it better than `main` does. The matched-pair
interval still contains 0.5.

**NO FLOOR WAS RE-LOCKED.** `npm run benchmark:public -- --lock` was not run.
The four measurement floors are the branch's own, merged unchanged. One is
therefore stale in the direction of caution: `round4(0.5938 − 0.02)` is 0.5738
and `PUBLIC_ORDER_PAIRED_FLOOR` is 0.5269, so the suite's idempotence check
fails — §6.3. A preparation lane does not re-lock a ratchet for a scoring change
whose real-corpus measurement has not happened, and `--lock` rewrites all six at
once, so it would also absorb anything else that moved.

## 5. Blind pairs — the number the branch claimed, reproduced

`node --experimental-strip-types --test tests/core/blind-pairs-discrimination.test.ts`

* before (`e79c64b4`): `ordered 1 of 6, mean gap -0.0167` — exit 0, 4/4
* after: `ordered 4 of 6, mean gap 0.3833` — exit 0, 4/4

Per pair, after: `night-shift` 78.1 / 76.2 ordered · `low-tide` 78.1 / 78.0
ordered · `the-deposit` 76.6 / 77.0 inverted · `the-ledger` 77.6 / 76.5 ordered ·
`signal-drift` 75.6 / 76.6 inverted · `fence-line` 77.6 / 77.0 ordered. No pair
is pinned at a shared value any more (before, three of the six were exact ties
at 76.0). The registered known-failing result is unchanged and nothing in that
test was relaxed. Six pairs is inside what chance produces either way.

## 6. Feature-scale evidence, and the three failures left standing

`tests/fixtures/feature-length/assembled-feature.fountain`, 231 scenes, the only
feature-length fixture in the repository:

| | `e79c64b4` | this tree |
|---|---|---|
| health / grade | 84.4 `strong` | **74.4 `solid`** |
| verdict | CONSIDER | CONSIDER |
| voice channel | abstains, 0 pairs | **scores 1,770 pairs, 21 characters held out** |
| findings | 899 | 946 |

The −10.0 is the saturation at the scale it was built for (`140/231 = 0.606` →
`140/12 = 11.667` predicts −11.06). The voice row is the per-character
abstention: the channel that read N/A on every real feature now reports, and
names who it left out. `tests/core/feature-scale-discrimination.test.ts` is 7/7,
including the verdict-tier assertion the branch re-closed on its own merits
(intact 79 CONSIDER, flattened 58.2 PASS). `npm run test:metamorphic` exits 0
with the branch's `stapled_shorts` witness passing at **−1.6 over all 14 seeded
orderings** (n=14, min 76.8, max 80.2, range 3.4), 7 hard passes and one
registered known-failing witness (`empty_verbosity`, unchanged);
`scene_dup_padding` moves −10.5 → −4.4 on the same saturation.

### 6.1 BLOCKING — the shape guard now sits 1.52x from `main`'s bound

`tests/security/fountain-shape-guard-cue-parity.test.ts`: **676 pass, 2 fail.**

```
assembled-feature.fountain: voice-eligible weight 443990 clears the 675000
bound with only 1.52x headroom (< 3x)
```

The branch's per-character eligibility makes the shape guard read the eligible
SUBSET, which is strictly stricter and closes a measured hole — and it is why
`main`'s own committed feature fixture now weighs 443,990 where it used to weigh
far less. The document is ACCEPTED; what fails is the branch's OWN margin
assertion, which demands 3x headroom on every legitimate fixture, and its
companion (bound x measured worst-shape rate under the cost target).

The branch's answer was 1,500,000, and §2.2 explains why that is not available.
The fix that would let BOTH bounds rise is already identified and is not a
scoring change: `burrowsDelta` re-derives both characters' relative frequencies
130 times per pair by calling `corpusStats` inside the loop over the 65 function
words. Hoisting it is bit-identical (`maxDeltaDiff = 0` over every pair) and
43.8x-56x faster, and `analyzeVoices` is ~99% of the worst admitted shape's
cost. It is scoring-path (`voice-delta.ts` is reachable from `doctor.ts`) so it
needs its own receipt, but it costs the score nothing.

**This lane does not choose between those options.** It is the one item that
must be settled before the branch can land, whatever the AUC-24 run says.

### 6.2 `tests/core/scene-grammar.test.ts` — 15 pass, 1 fail

"health no longer moves when a writer types an ellipsis" asserts that a
five-scene script and the same script with one `...` continuation line inside a
dialogue block score EQUAL. Measured, with the test's own fixture:

| | `e79c64b4` | this tree |
|---|---|---|
| WITHOUT the ellipsis line | 62.0 | 63.0 |
| WITH it | 62.0 | **64.2** |
| scenes, both | 5 / 5 | 5 / 5 |
| findings | 11 → 10 | 11 → 10 |
| words | 57 → 60 | 57 → 60 |

The scene-grammar property itself HOLDS: the phantom scene is gone and
`sceneCount` is 5 on both documents on both trees. What has gone is the exact
health equality, and the reason is that the two documents are not identical —
the second has three more words and one fewer major finding. On `e79c64b4` the
saturated sub-1 density term absorbed that difference; at steepness 2 the curve
is near-linear and passes it through as +1.2. **The assertion was measuring the
saturation as much as the grammar.** Re-anchoring it is a decision about another
lane's guard, so this lane leaves it failing and reports it rather than
rewriting it.

### 6.3 `tests/core/public-benchmark.test.ts` — 32 pass, 1 fail, deliberately

The failing subtest is `` `--lock` rewrites every floor from the measurement,
and only those lines ``, at its last assertion: "a re-lock on an up-to-date tree
must be a no-op". It fails because `PUBLIC_ORDER_PAIRED_FLOOR` is 0.5269 and
this tree measures 0.5938. **No floor assertion fails**; the six ratchet
subtests and "every floor sits a stated margin below a real measurement" all
pass (the largest gap is 0.0669, inside the 4x-margin allowance of 0.08). This
is the single reason `npm run gates` exits 1.

### 6.4 `tests/core/coverage-letter.test.ts` — 52 pass, 1 fail

`counter-offer.fountain` renders a ~4.02-page letter (measured 3.96 before)
against a "three to four pages" promise repeated in nine descriptions. The test
states its own condition for restating the promise: re-measure all 21 committed
screenplays the way the route renders them. Out of scope here, and reported.

## 7. Two fixtures re-locked, one test re-anchored, one correction reverted

| what | why | what moved |
|---|---|---|
| `tests/fixtures/public-corpus-manifest.json` | carried in with the merge (the branch's own lock) | 32 intact rows of sceneCount/words/health/verdict |
| `tests/fixtures/scene-grammar/plain-int-ext.report.json` | the 2026-09-20 scene-grammar lane locked a full `runScriptDoctor` snapshot against a `git archive 26d930dd` tree, and this branch legitimately moves that report | `totalIssues` 233 → 206, severity {2,51,180} → {5,52,149}, `health` unchanged at 0, `sceneCount` unchanged at 16 |
| `tests/core/voice-separation-abstention.test.ts` | its feature-length case pinned `scored: false` — the all-or-nothing abstention this branch fixes | inverted to `scored: true` with the history in a comment, and the copy case moved onto a draft that abstains by construction (exactly one character clears the 30-word floor), so it still fails where the abstention copy is wrong |

The snapshot was regenerated exactly as the test consumes it (`runScriptDoctor`
with `GIT_SHA=dev`, `analyzedAt` and `provenance.engineCommit` stripped,
`canonical()` two-space JSON plus a trailing newline), and its test comment now
records that it is a regression lock on THIS tree, not a pre-grammar-change
identity proof.

**One of the branch's corrections was reverted, and it was right.** `bcc96f85`
corrected the closed 2026-09-06 round-2 receipt entry's decomposition summary
from `−7.625 density` to `−7.632`, which matches the code and the measurement
doc. Editing a closed entry in place makes `scripts/check-scoring-receipt.mjs`
re-validate it, and that entry cites a git object that no longer exists in this
repository, so re-validating it failed the whole range on an unrelated defect.
The correction is reverted here and recorded in the new receipt entry instead.

## 8. Gate table

| gate | exit | notes |
|---|---|---|
| `npm run lint` | 0 | |
| `npm run check-no-console` | 0 | |
| `npm run check-server-reachability` | 0 | |
| `npm run check-docs` | 0 | |
| `npm run build` | 0 | |
| `node scripts/check-scoring-receipt.mjs e79c64b4..HEAD` | 0 | 5 scoring-path files, well-formed new entry |
| `npm run gates` | **1** | only because of §6.3; the report names `public-benchmark.test.ts` and nothing else |
| `npm run test:metamorphic` | 0 | 7 hard passes, `stapled_shorts` −1.6 over 14 orderings |
| `tests/core/calibration.test.ts` | 0 (21) | band monotonicity untouched |
| `tests/core/script-doctor.test.ts` | 0 (90) | |
| `tests/core/auc.test.ts` | 0 (31) | |
| `tests/core/public-benchmark-limits.test.ts` | 0 (7) | finding 6's sentence still printed |
| `tests/core/honesty-audit-claims.test.ts` | 0 (15) | after re-anchoring 7 pointers |
| `tests/core/fixture-provenance-comment-guard.test.ts` | 0 (143) | |
| `tests/core/documentation-truth.test.ts` | 0 (8) | |
| `tests/core/blind-pairs-discrimination.test.ts` | 0 (4) | |
| `tests/core/summary-honesty.test.ts` | 0 (9) | new on the branch |
| `tests/core/clue-proper-noun-guard.test.ts` | 0 (12) | new on the branch |
| `tests/core/voice-delta.test.ts` | 0 (18) | |
| `tests/core/agency-signal.test.ts` | 0 (52) | |
| `tests/core/discrimination.test.ts` | 0 (12) | |
| `tests/core/feature-scale-discrimination.test.ts` | 0 (7) | |
| `tests/core/rebuild-experiment.test.ts` | 0 (41) | |
| `tests/core/structural-signal-precision-consistency.test.ts` | 0 (39) | |
| `tests/core/coverage-html.test.ts` | 0 (54) | |
| `tests/core/voice-separation-abstention.test.ts` | 0 (15) | after §7 |
| `server/nvm/analyze/structural-signals.test.ts` | 0 (22) | |
| `evals/scoring/runner/run-metamorphic-classify.test.ts` | 0 (10) | |
| `tests/core/public-benchmark.test.ts` | **1** (32/1) | §6.3 |
| `tests/core/scene-grammar.test.ts` | **1** (15/1) | §6.2 |
| `tests/security/fountain-shape-guard-cue-parity.test.ts` | **1** (676/2) | §6.1 |
| `tests/core/coverage-letter.test.ts` | **1** (52/1) | §6.4 |

## 9. Owner runbook

```
git fetch origin lane/land-feature-length-defects
git worktree add ../trial-fld --detach origin/lane/land-feature-length-defects
cd ../trial-fld
npm ci --ignore-scripts        # Windows: then npm run setup-hooks under Git Bash
REAL_SCRIPT_CORPUS_DIR=<corpus> npm run measure-real
```

Then, in order:

1. **Read the AUC-24 against `AUC24_FLOOR` = 0.622, and measure `main` in the
   same session.** `npm run owner:measure` does both and prints the delta
   separately, which is the comparison a decision can lean on — the two AUC-24
   numbers it reports are on different recipes and are not comparable to each
   other or to 0.731. **A fall is a real finding about this change. Do not
   answer it by moving the floor** — that instruction is the branch author's and
   it is kept in the receipt.
2. **Know what the run can and cannot settle before reading it.** The saturation
   does two separable things at feature length: a near-uniform level shift
   (−10.480 points at the private median of 118 scenes) which is rank-preserving
   and cannot move AUC-24 at all, and the scarcity channel's per-script
   degradation delta going from +0.586 to exactly 0.000 for every script of
   about 22 scenes or more, which is what AUC-24 actually tests. It cannot
   apportion the result between the saturation and the steepness change —
   `scoring/feature-length-saturation-only` exists for that and is step 2 of the
   decision tree in `docs/brain/Owner/Owner - R5 Measurement and Merge.md`.
3. **Re-lock `tests/fixtures/real-corpus-manifest.json`** — all 72 rows will
   have moved, on the level shift alone.
4. **`npm run lock-auc24`** on the `shuffle-drop/v3` recipe, which writes
   `tests/fixtures/auc24-table.json` for the first time. Its number is not
   comparable to 0.731.
5. **Settle §6.1 before landing, whatever the AUC says.** Either land the
   `burrowsDelta` hoist first (bit-identical, its own receipt, lets both bounds
   rise), or accept 1.52x headroom on `main`'s own feature fixture and re-anchor
   the branch's two margin assertions with that decision written down, or raise
   the bound on a fresh cost measurement. Do not simply take the branch's
   1,500,000.
6. **Decide §6.2** — whether the scene-grammar lane's health-equality assertion
   should be re-anchored to the property it is actually about.
7. **Re-lock the six public floors, or do not.** If the branch is accepted,
   `npm run benchmark:public -- --lock` takes `PUBLIC_ORDER_PAIRED_FLOOR` from
   0.5269 to 0.5738 and leaves the other five where they are. Read the `auc.ts`
   diff either way.
8. `npm run brain` + `npm run check-brain`, then the full `npm test` once on the
   rebased tree.

## 10. Not done

* `npm run brain` / `npm run check-brain` — excluded by the brief. The graph is
  stale and `tests/core/brain-coverage.test.ts` sub-test (e) reports it.
* The full `npm test` — excluded by the brief.
* `npm run measure-real` — impossible here; the corpus is not present.
* `npm run benchmark:public -- --lock` — deliberately not run (§4).
* No push. The orchestrator pushes `lane/land-feature-length-defects`.
* The five surface docs (`README.md`, `NORTH_STAR.md`, `ROADMAP.md`,
  `ARCHITECTURE.md`, `docs/PATH_TO_EXCELLENCE.md`) still lead with `main`'s
  0.5313 / 0.4063 validity read. They are correct about the tree they name, and
  rewriting them for a branch that has not landed would be the overclaim this
  repository's honesty machinery exists to prevent. `docs/CLAIMS_REGISTER.md`
  rows 121-125 carry a sentence saying exactly that, with this lane's numbers.
* The browser battery and `npm run test:ci-env` were not run.

---

## Second pass (on `6ca3fcd0`)

**Lane:** the same `lane/land-feature-length-defects`, continued from
`4029b245`. `git merge --no-ff 6ca3fcd0` brings the session head onto the
candidate — merge commit `4229a22a` — and three commits follow it. Measured at
`7d12b32d`.

**Receipt:** the `#### SECOND PASS, 2026-09-20` subsection appended IN PLACE to
this branch's entry at the end of `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`.
`node scripts/check-scoring-receipt.mjs 6ca3fcd0..HEAD` exits 0 over five
scoring-path files.

**The one thing to read first: three of the four failures in §6 are closed and
the fourth is not, for a reason that is about the METHOD rather than about the
number. `npm run gates` exits 0. The branch's remaining failure is two
assertions in one security suite, and the owner can close it with one
`calibrate/**` push.**

### S1. What the merge brought in, and what it cost the score

The session head carries the `burrowsDelta` corpus-statistics hoist
(`04fb13cc`), the revision pipeline's ledger-structure fix, approved-span
bounds, the receipt gate's per-line field rule, `scenesFromFountain` line-ending
normalization, `AUC24_DEGRADATION_ID` `shuffle-drop/v4`, Unicode forced headings
and an event-store type-check.

**Two conflicts, not thirteen.**

| file | conflict | resolution |
|---|---|---|
| `server/nvm/analyze/voice-delta.ts` | content, 5 hunks | BOTH, because both sides hoisted the same redundancy at different levels and they COMPOSE — see below. |
| `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` | content | both sides in chronological order, no entry dropped. The session's three 2026-09-20 entries and the hoist entry precede the branch's rewritten entry, which stays last so this pass can extend it. |

`docs/brain/GRAPH.md` and `docs/brain/brain.graph.json` were taken from the
SESSION side (`git checkout 6ca3fcd0 -- …`); regeneration is the orchestrator's.
Three files auto-merged that the brief flagged as risky, and each was read in
full afterwards: `scripts/lib/auc.ts` kept the branch's four floor constants AND
the session's `AUC24_DEGRADATION_ID = 'shuffle-drop/v4'` with its narrative;
`server/lib/validation.ts` kept all three contributions (the branch's
per-character eligibility and cost-model constants, the session's approved-span
bounds, the hoist's `LANDED 2026-09-20` comment); `docs/CLAIMS_REGISTER.md` did
not conflict at all.

**The voice-delta resolution, because it is the only one on the scoring path.**
The branch had already split `deltaFromFrequencies` out of `burrowsDelta` so
`analyzeVoices` could build each eligible character's frequency table ONCE and
reuse it across every pair that character appears in (per-CHARACTER hoist,
2026-09-07). The session's hoist replaced the per-WORD `corpusStats` call with
`combinedCorpusStats`, which derives every function word's mean/sd in one pass
from the two tables the caller already holds (per-PAIR hoist, 2026-09-20). Both
are kept: `combinedCorpusStats` now runs at the top of `deltaFromFrequencies`.
The branch's `corpusStats` / `statsOf` are deleted, and that is safe because
`statsOf([fA, fB])` is the same accumulation as the session's unrolled
`meanSum` / `varianceSum` — seed, then a, then b — so the floating-point
sequence the bit-identity contract defends is unchanged. `voice-delta.test.ts`
18/18 and `voice-delta-hoist-identity.test.ts` 3/3 both pass on the merged file.

**Output identity vs `git archive 6ca3fcd0`, both sides `GIT_SHA=dev`:** 45
fixtures, health moves on **25**, RMS **9.839**, mean **+2.292**, largest
**+32.2** on `transfer-window`, **6 verdicts flip**, 5 grades flip, `sceneCount`
moves on **0 of 45**, and not one of the 20 calibration samples moves in health
or in finding count. That is §3's table reproduced to the last digit against a
DIFFERENT baseline, which is the statement that the merge changed no score. All
45 reports differ in some field, as expected: `plainSummary` is rewritten by the
report-honesty fixes, `meanAbsDialogueShareDeltaNormalised` and
`excludedCharacters` are new fields, and the dimension percentiles move with the
reference set.

### S2. The four failures, one by one

#### (a) Cue-parity headroom — STILL FAILING, and it is a method blocker, not a number

`tests/security/fountain-shape-guard-cue-parity.test.ts`: **676 pass, 2 fail**,
unchanged.

```
assembled-feature.fountain: voice-eligible weight 443990 clears the 675000
bound with only 1.52x headroom (< 3x)
```

**The cost case for raising the bound is now overwhelming, and it is measured.**
`npm run measure-voice-bound` on this sandbox (Intel Xeon @ 2.10GHz x4, 16 GiB,
node v22.22.2, linux/x64), `loaded` condition, 2 repeats — the same script the
runner workflow drives:

| shape | bound in tree | weight | CPU ms (worst) | % of the 15,000 ms half-budget |
|---|---|---|---|---|
| max-admitted N=80 | 675,000 | 652,800 | 275 | 2% |
| max-admitted N=100 | 675,000 | 660,000 | 250 | 2% |
| uniform-min N=150 | 675,000 | 675,000 | 257 | 2% |
| probe-cast N=40 | 675,000 | 609,600 | 409 | 3% |
| max-admitted N=70 | 1,900,000 | 1,881,600 | 635 | 4% |
| max-admitted N=80 | 1,900,000 | 1,881,600 | 590 | 4% |
| max-admitted N=85 | 1,900,000 | 1,864,050 | 580 | 4% |
| max-admitted N=90 | 1,900,000 | 1,895,400 | 566 | 4% |

The committed table's `max-admitted` N=80 row — the shape
`MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT` is derived from — reads **11,810 ms** on
the GitHub runner, pre-hoist. Even at a bound of 1,900,000 the worst shape the
pair of bounds admits costs 590 ms here.

**The headroom table, every tracked fixture, at the shipped bound of 675,000.**
Recomputed with the suite's own `voiceEligibleWeightOf` over the P0 sample, the
20 calibration samples and every `git ls-files -- '*.fountain'`: **69 of 80
texts reach the bound at all**, and exactly ONE is under 3x.

| headroom | voice-eligible weight | fixture |
|---|---|---|
| **1.52x** | 443,990 | `tests/fixtures/feature-length/assembled-feature.fountain` |
| 170.03x | 3,970 | `data/screenplays/runoff.fountain` |
| 176.24x | 3,830 | `tests/fixtures/feature-scale-discrimination/act-swapped.fountain` |
| 176.24x | 3,830 | `tests/fixtures/feature-scale-discrimination/intact.fountain` |
| 197.37x | 3,420 | `data/screenplays/counter-offer.fountain` |
| 283.73x | 2,379 | `P0 sample`, `data/screenplays/dead-frequency.fountain`, `demo/corpus/sample-script.fountain` |
| 320.67x | 2,105 | `data/screenplays/the-defense-rests.fountain` |
| 379.43x | 1,779 | `tests/fixtures/advice-quality/bad.fountain` |
| 393.36x | 1,716 | `tests/fixtures/blind-pairs/fence-line-bad.fountain` |
| 400.83x | 1,684 | `data/screenplays/mise.fountain` |
| … | … | … |
| 3792.1x | 178 | `calibration/Encore` (the best of the 69) |

So the admissible window is wide and unambiguous: any bound between **1,331,970**
(3x `assembled-feature`) and **1,919,999** (below the lightest pinned DoS
payload at 1,920,000) puts every tracked fixture at or above 3x, and the cost
table above says the engine can afford the top of that window with 96% of the
half-budget to spare.

**AND THE BOUND WAS NOT MOVED, BECAUSE THE METHOD CANNOT BE COMPLETED HERE.**
`tests/core/voice-bound-derivation.test.ts` binds the constant to
`tests/fixtures/voice-bound-derivation.json` through three assertions that
interlock:

1. `assert.equal(fixture.machine.ci, 'github-actions')` — a table locked from a
   developer box fails BY NAME, with the message "re-lock from
   .github/workflows/calibrate-voice-bound.yml". This is the 2026-09-13 finding
   made executable: the box that enforces a bound is the one it has to hold on.
2. `assert.deepEqual(fixture.guardEvaluatedAgainst, { weight:
   MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT, distinct:
   MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT })`.
3. The binding one: every `max-admitted` row's `pooledWords` must equal
   `row.n * maxAdmittedWordsPerSpeaker(row.n,
   MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT)`. The derivation shape is "the heaviest
   document the weight bound still admits at this cast", so **changing the
   weight bound changes what every row of the table describes**, and the table
   has to be re-measured.

Re-measuring it means a GitHub Actions run:
`.github/workflows/calibrate-voice-bound.yml` fires on `workflow_dispatch` or on
a push to `calibrate/**`, and either route needs a ref that already carries the
candidate bound. **This lane pushes nothing.** Locking a table measured on this
sandbox would satisfy nothing — assertion 1 rejects it by name — and editing the
constant without a table trades two red assertions for a differently red one.

So the number is reported and the constant is untouched. This item is **one
`calibrate/**` push away from closed**, and the runbook below says exactly what
to do with the result.

#### (b) Public-benchmark re-lock idempotence — CLOSED

`npm run benchmark:public -- --lock`, N=32, 2000-resample bootstrap at seed 42.
Every before → after, read off the command's own diff block:

| constant | before | after | measured |
|---|---|---|---|
| `PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR` | 0.855 | 0.855 | 0.8750 |
| `PUBLIC_SHUFFLE_DROP_FLOOR` | 0.8091 | 0.8091 | 0.8291 |
| `PUBLIC_ORDER_PAIRED_FLOOR` | 0.5269 | **0.5738** | 0.5938 |
| `PUBLIC_ORDER_FLOOR` | 0.4951 | **0.5069** | 0.5269 |
| `PUBLIC_DIALOGUE_FLATTEN_PAIRED_FLOOR` | 0.98 | 0.98 | 1.0000 |
| `PUBLIC_DIALOGUE_FLATTEN_FLOOR` | 0.98 | 0.98 | 1.0000 |

**No floor fell.** The two that moved are the two §4 named as stale, and they
moved to the values §4 predicted arithmetically. The four that stayed were
already at `round4(measured − 0.02)`; the control pair is capped there by a
measurement of exactly 1.0000. The six measured values are byte-for-byte §4's,
and `--lock` rewrote `tests/fixtures/public-corpus-manifest.json` and
`tests/fixtures/public-benchmark-split.json` without changing a byte of either —
the second independent confirmation that the hoist moves no number.

The narrative moved with the numbers, as the suite requires: `scripts/lib/auc.ts`
gains a dated `RE-LOCKED 2026-09-20, SECOND PASS` block, and
`docs/p1-benchmark/PUBLIC_BENCHMARK_2026-09-06.md` gains §14 with a supersession
pointer on §13's floor column. `tests/core/public-benchmark.test.ts` **33/33**;
`npm run gates` **exit 0**, including its mutation self-check
(`PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR` raised to 0.925 made the suite FAIL on that
floor by name).

The split is still pre-registered and REPORTED, not used: all six were locked
from all 32 scripts, the five holdout files included. Raising a floor does not
create a held-out evaluation.

#### (c) Scene-grammar equality — CLOSED, and re-anchored rather than relaxed

Measured on this tree with the test's own fixture pair:

| | WITHOUT the ellipsis line | WITH it |
|---|---|---|
| scenes | 5 | 5 |
| health | 63.0 | 64.2 |
| words | 57 | 60 |
| findings | 11 | 10 |

The guard now asserts `sceneCount === 5` on BOTH documents (strictly stronger
than the old `a.sceneCount === b.sceneCount`, which two 6s would have satisfied)
and `|Δhealth| < 2.0`. The comment records that the pre-fix delta was **24.2**
(62.0 → 37.8, verdict CONSIDER → PASS, on a phantom sixth scene), that exact
equality was an artefact of the saturated sub-1 density term absorbing three
words and one finding, and why the band is 2.0: twelve times under the defect it
guards and above the 1.2 that a real textual difference legitimately buys. The
failure message carries all of it. **16/16.**

#### (d) Coverage-letter page count — CLOSED, on a re-measurement of all 21

The renderer did NOT grow: `git diff e79c64b4..HEAD --` over
`server/lib/coverage-letter.ts`, `server/lib/root-cause-pipeline.ts`,
`server/lib/logline.ts` and `server/routes/coverage-letter.ts` is empty. What
moved is which findings reach the ranked body.

Re-measured the way the route renders them (`buildRootCausePipeline` attached,
plus a logline and the script text), plain text at 500 words to the page, all
21 committed screenplays:

| | min | median | max |
|---|---|---|---|
| as the route ships | **3.37** (`mise`) | **3.64** | **4.02** (`counter-offer` and `runoff`, tied) |
| bare report | 3.12 | 3.44 | 3.72 |

The 231-scene feature fixture reads 3.79. Shortest was `the-detour` at 3.53 and
is now `mise` at 3.37; the joint-longest pair was 3.96 and 3.86.

**Two of the 21 sit 0.02 pp past 4.00 — ten words.** The nine descriptions keep
"three-to-four-page", because that is what the measurement supports: a document
measured between 3.37 and 4.02 pages is a three-to-four-page document, and
"three-to-five-page" would be LESS accurate, not more. The letter was not cut
back either, for the reason its own header already gives (the non-priorities
content alone is ~2.0 pp). The gate's upper bound moves from 4.0 to 4.1 — the
measurement plus a stated 0.08 pp (~40 words) — and the pinned scripts go from
three to five so the gate sits on the real ends of the range. The module header,
the test's measured block and `docs/CLAIMS_REGISTER.md` row 115 all carry the
new numbers, and that row's three evidence anchors move 814/828/840 →
862/880/892. **55/55.**

### S3. Blind pairs, calibration, metamorphic

* Blind pairs: `ordered 4 of 6, mean gap 0.3833` — `night-shift` 78.1/76.2,
  `low-tide` 78.1/78.0, `the-deposit` 76.6/77.0 inverted, `the-ledger`
  77.6/76.5, `signal-drift` 75.6/76.6 inverted, `fence-line` 77.6/77.0. Exit 0,
  4/4, registered known-failing result untouched. Six pairs is inside what
  chance produces either way.
* `tests/core/calibration.test.ts` **21/21**, band monotonicity untouched.
* `npm run test:metamorphic` exit 0 — 7 hard passes, `stapled_shorts` holding
  over all 14 seeded orderings, `empty_verbosity` the one registered
  known-failing witness.

### S4. Gate table, second pass

| gate | exit / result |
|---|---|
| `npm run lint` | 0 |
| `npm run check-no-console` | 0 — 312 files, all proven unreachable |
| `npm run check-server-reachability` | 0 |
| `npm run check-docs` | 0 |
| `npm run build` | 0 |
| `npm run gates` | **0** (was 1) |
| `npm run test:metamorphic` | 0 |
| `node scripts/check-scoring-receipt.mjs 6ca3fcd0..HEAD` | 0 — 5 scoring-path files |
| `tests/core/script-doctor.test.ts` | 0 (90) |
| `tests/core/calibration.test.ts` | 0 (21) |
| `tests/core/auc.test.ts` | 0 (31) |
| `tests/core/public-benchmark.test.ts` | **0 (33)** |
| `tests/core/public-benchmark-limits.test.ts` | 0 (7) |
| `tests/core/honesty-audit-claims.test.ts` | **0 (15)** — after moving row 115's three anchors |
| `tests/core/fixture-provenance-comment-guard.test.ts` | 0 (143) |
| `tests/core/documentation-truth.test.ts` | 0 (8) |
| `tests/core/blind-pairs-discrimination.test.ts` | 0 (4) |
| `tests/core/summary-honesty.test.ts` | 0 (9) |
| `tests/core/clue-proper-noun-guard.test.ts` | 0 (12) |
| `tests/core/voice-delta.test.ts` | 0 (18) |
| `tests/core/voice-delta-hoist-identity.test.ts` | 0 (3) |
| `tests/core/voice-bound-derivation.test.ts` | 0 (8) |
| `tests/core/agency-signal.test.ts` | 0 (52) |
| `tests/core/discrimination.test.ts` | 0 (12) |
| `tests/core/feature-scale-discrimination.test.ts` | 0 (7) |
| `tests/core/rebuild-experiment.test.ts` | 0 (41) |
| `tests/core/structural-signal-precision-consistency.test.ts` | 0 (39) |
| `tests/core/coverage-html.test.ts` | 0 (54) |
| `tests/core/coverage-letter.test.ts` | **0 (55)** |
| `tests/core/voice-separation-abstention.test.ts` | 0 (15) |
| `tests/core/revision-per-pass-diagnostics.test.ts` | 0 (18) |
| `tests/core/scene-grammar.test.ts` | **0 (16)** |
| `tests/core/scene-split-line-endings.test.ts` | 0 (4) |
| `tests/core/auc24-table.test.ts` | 0 — 3 pass, 6 skipped (no locked table, as documented) |
| `server/nvm/analyze/structural-signals.test.ts` | 0 (22) |
| `evals/scoring/runner/run-metamorphic-classify.test.ts` | 0 (10) |
| `tests/security/fountain-shape-guard-cue-parity.test.ts` | **1 (676/2)** — §S2(a), the only failing suite on this branch |
| `tests/core/brain-coverage.test.ts` | check (e) only — the graph is stale by this lane's brief |

### S5. Owner runbook, reduced

```
git fetch origin lane/land-feature-length-defects
git worktree add ../trial-fld --detach origin/lane/land-feature-length-defects
cd ../trial-fld
npm ci --ignore-scripts        # Windows: then npm run setup-hooks under Git Bash
REAL_SCRIPT_CORPUS_DIR=<corpus> npm run measure-real
```

1. **Read the AUC-24 against `AUC24_FLOOR` = 0.622**, and measure the session
   branch in the same session — `npm run owner:measure` does both and prints the
   delta separately. A fall is a real finding about this change; do not answer
   it by moving the floor. What the run CAN and CANNOT settle is unchanged from
   §9 step 2: the saturation's level shift is rank-preserving and cannot move
   AUC-24 at all, while the scarcity channel's per-script degradation delta going
   to exactly 0.000 above ~22 scenes is what AUC-24 actually tests, and neither
   half has its own receipt.
2. **Re-lock `tests/fixtures/real-corpus-manifest.json`** — all 72 rows move on
   the level shift alone.
3. **`npm run lock-auc24`** on the **`shuffle-drop/v4`** recipe (not v3 — the id
   moved twice more since §9 was written). It writes
   `tests/fixtures/auc24-table.json` for the first time; its number is not
   comparable to 0.731.
4. **Settle §S2(a) with one `calibrate/**` push.** Set
   `MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT` to a candidate in
   [1,331,970 … 1,919,999], push the branch as `calibrate/voice-bound-<date>`,
   read the runner's `--json=-` table out of the job summary, lock it into
   `tests/fixtures/voice-bound-derivation.json`, and let
   `tests/core/voice-bound-derivation.test.ts` re-derive
   `MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT` from it. Delete the branch afterwards.
   Then `tests/security/fountain-shape-guard-cue-parity.test.ts` goes 678/0 and
   this branch has no failing test at all. The alternative — accepting 1.52x and
   re-anchoring the suite's two margin assertions — is available but is not what
   the cost measurement supports.
5. **Merge decision.** The public evidence is in: every one of the six floors is
   cleared and two were RATCHETED UP by this branch; blind pairs 1 → 4 of 6; the
   voice channel reports on real features for the first time; no calibration
   sample and no `sceneCount` moves. What is NOT in is the only thing that can
   decide it — the AUC-24 on the private corpus. Nothing in this repository can
   substitute for step 1.

### S6. Not done, second pass

* `npm run measure-real` — impossible here; the private corpus is absent from
  this environment and `REAL_SCRIPT_CORPUS_DIR` is unset.
* `npm run lock-auc24` — same reason. No table has ever been locked.
* `npm run measure-voice-bound` ON THE RUNNER, and therefore the re-derivation
  of `MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT` — §S2(a).
* `npm run brain` / `npm run check-brain` and the full `npm test` — excluded by
  this lane's brief. The graph is stale and
  `tests/core/brain-coverage.test.ts` check (e) reports it.
* No push. The orchestrator pushes `lane/land-feature-length-defects`.
* The five surface docs still lead with `main`'s 0.5313 / 0.4063 validity read,
  for the reason §10 gives, unchanged.

## Candidate bound set; derivation lock follows from the runner

**What changed.** `MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT`
(`server/lib/validation.ts`) is set to the CANDIDATE value **1,500,000** — the
branch's original proposal, inside the admissible window §S2(a) derived from
both ends:

* low end **1,331,970** = 3x `tests/fixtures/feature-length/assembled-feature.fountain`'s
  measured voice-eligible weight (443,990), the suite's own ">= 3x headroom"
  requirement;
* high end **1,919,999** = one below 1,920,000, the real-parse weight of
  round-3 bypass B, the lightest DoS/bypass payload the cue-parity suite pins
  as REJECTED.

`MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT` (80) is untouched — this commit only
moves the weight bound. The comment above the constant records the candidate,
both ends of the window, the date, and that the derivation fixture is not yet
locked (see below). The fixture itself,
`tests/fixtures/voice-bound-derivation.json`, is untouched by this commit.

**Verification, quoted.**

1. `tests/security/fountain-shape-guard-cue-parity.test.ts` — the headroom
   line, now passing:
   `voice-eligible-weight headroom: worst tracked fixture is "tests/fixtures/feature-length/assembled-feature.fountain" at 3.4x`
   (exact: 1,500,000 / 443,990 = 3.3785…x, i.e. the 3.38x headroom this task's
   brief predicted). The cost line, from the boundary-shape assertion (still
   the max-admitted N=80 shape, since `MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT`
   did not move):
   `voice-bound worst-case cost: max-admitted N=80 (234 words/speaker) cpu 603ms (4% of the 15000ms half-budget target), wall 455ms — local: Intel(R) Xeon(R) Processor @ 2.80GHz x4 (parallelism 4, 16 GiB), node v22.22.2, linux/x64`.
   Every pinned DoS/bypass payload (bypass B at 1,920,000 and the three
   round-2 payloads at 5.4M/18.72M/19.656M) is still REJECTED — confirmed by
   the suite's own "every one of this file's existing rejection fixtures is
   still REJECTED under the new bound" check, which passed.

   **Honest count: 675 pass, 3 fail — not the 676/2 this task's brief
   predicted from the headroom assertion alone.** The two former headroom
   failures now pass, as expected. A THIRD category surfaced on the full run
   that neither this task's brief nor §S2(a) above anticipated: three tests in
   the same "finding 10" describe block pin the OLD 675,000 boundary's own
   story, not just a computed comparison, and all three now fail because that
   story is specific to 675,000:
   * `a 60-cast fully-eligible feature is now REJECTED (weight 909,000 > 675,000)`
     (line 3178) — at 1,500,000 a 60-cast fully-eligible ensemble (weight
     909,000, distinct 60 <= 80) is genuinely ACCEPTED now, not just
     differently worded; the test's premise is stale, not just its literal.
   * `the uniform-min N=150 shape the 2026-09-12 derivation admitted (weight
     exactly 675,000) is now REJECTED by the cast bound` (line 3301) — its own
     sanity assertion `assert.equal(uniformMinWeight(150),
     MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT, …)` fails outright
     (`675000 !== 1500000`); N=150 no longer sits "exactly on" the weight
     bound, so the sanity premise the rest of the test is titled around is
     gone.
   * `the uniform-min N=151 shape is still REJECTED, and still by the WEIGHT
     bound` (line 3309) — N=151's weight (684,030) now clears 1,500,000, so
     the document is rejected by the CAST bound instead, and
     `assert.match(reason!, /MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT/)` no longer
     matches (`bound MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT` instead).

   This lane deliberately did **not** edit these three — the brief said
   "prefer not" to touch this file, and all three need more than a literal
   swap (new premises, new prose, in one case a genuine accept/reject flip
   that changes what the surrounding "round-2 disclosure" comment block
   claims). They are pre-existing tests whose entire point was to document
   the OLD 675,000 boundary by name; the owner's runner-lock commit (step 4
   below) is the natural place to rewrite them together with
   `MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT`'s re-derivation, since that commit
   already has to touch this describe block's boundary math. Until then this
   branch carries 3 known, explained failures in this file, not 0.

2. `tests/core/voice-bound-derivation.test.ts` — **6 pass, 2 fail, exactly the
   two fixture-vs-constant bindings this task's brief predicted, nothing
   else**:
   * `the table's guard column is the verdict THIS tree gives, not the one the
     sweep's tree gave` — `assert.deepEqual(fixture.guardEvaluatedAgainst, {
     weight: MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT, distinct:
     MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT })` fails: `{distinct: 80, weight:
     675000}` (the committed table, still locked from the 2026-09-13 runner
     run) vs `{distinct: 80, weight: 1500000}` (this tree).
   * `every derivation-shape row at or below the derived cast clears the
     ceiling …` — the per-row `assert.equal(row.pooledWords, row.n *
     maxAdmittedWordsPerSpeaker(row.n, MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT))`
     fails at the first admitted row: `max-admitted N=50 measured 13500
     pooled words, but the heaviest document the weight bound admits at that
     cast carries 30000`.

   These are the intended, by-design failures: the fixture is still locked
   against the OLD 675,000 derivation, and the whole point of this test file
   (per its own header) is that editing the constant without a fresh
   runner-measured table fails loud. Nothing else in the file's 8 tests
   fails — `MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT`'s own re-derivation
   assertion still passes because it depends on `DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS`
   and the table's rows, neither of which this commit touched.

3. **Local sweep preview (NOT locked — no file was written; `--json=-` only
   printed to stdout).** `node --experimental-strip-types --no-warnings
   scripts/measure-voice-bound-cost.mjs --max-admitted=50,60,65,70,75,80,85,90,100
   --uniform-min=150 --probe-cast=20,30,40,44 --repeats=1 --conditions=idle
   --json=-` on this sandbox (Intel(R) Xeon(R) Processor @ 2.80GHz x4, 16 GiB,
   node v22.22.2, linux/x64). Worst-case row by % of half-budget:
   `max-admitted:50 idle cpu 881 ms wall 682 ms guard ACCEPT` — 6% of the
   15,000 ms half-budget target (every other row read <=5%). The printed
   `machine.ci` value is **`"local"`** — not `"github-actions"` — which is
   exactly why `voice-bound-derivation.test.ts`'s first assertion
   (`fixture.machine.ci === 'github-actions'`) exists and why this sandbox's
   sweep cannot be the one that gets locked: a table produced here would fail
   that assertion by name even if every other number matched.

4. Gates:

   | gate | result |
   |---|---|
   | `npm run lint` | 0 |
   | `npm run check-no-console` | 0 — 312 files, 3 tsconfig quarantine entries, all proven unreachable |
   | `node scripts/check-scoring-receipt.mjs ca5f2e85..HEAD` | 0 — `no scoring-path files changed` (validation.ts sits outside doctor.ts's import graph) |
   | `tests/core/honesty-audit-claims.test.ts` | 0 (15/15) |
   | `tests/security/fountain-shape-guard-cue-parity.test.ts` | **3 fail (675/678)** — see item 1 above |
   | `tests/core/voice-bound-derivation.test.ts` | **2 fail (6/8), by design** — see item 2 above |

**The dispatch the orchestrator makes next.** Workflow
`.github/workflows/calibrate-voice-bound.yml`, `workflow_dispatch`, ref
`lane/land-feature-length-defects` (this branch, once pushed), default
inputs (`uniform_min=150`, `max_admitted=50,60,65,70,75,80,85,90,100`,
`probe_cast=20,30,40,44`, `repeats=2`, `conditions=idle,loaded`). Read the
job summary's `--json=-` block, copy it verbatim into
`tests/fixtures/voice-bound-derivation.json`, run `npm run measure-voice-bound
-- --lock-from=tests/fixtures/voice-bound-derivation.json` to re-indent and
re-evaluate the guard column against this tree, and let
`tests/core/voice-bound-derivation.test.ts` re-derive
`MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT` from the runner's own numbers — it may
not still be 80 once the weight bound is 1,500,000 rather than 675,000; the
per-cast pooled-word ceiling every `max-admitted` row carries is higher now,
so the runner's cost sweep at each cast is measuring a heavier document than
the 2026-09-13 table did. Same commit (or a follow-up in the same push) should
also rewrite the three cue-parity tests named in item 1 above, whose whole
premise is the 675,000 boundary story, to match whatever
`MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT` the runner derives.

## Runner lock (run 35542413222)

**Status: §S2(a) is CLOSED. The calibrate step in §S5 is DONE and does not need
to be run again.** The branch now has no failing test among every suite this
lane ran, including the security suite that carried the last three known
failures.

**The machine.** `.github/workflows/calibrate-voice-bound.yml`,
`workflow_dispatch`, ref `lane/land-feature-length-defects` @ `cfe56403`,
ubuntu-latest — AMD EPYC 7763 64-Core Processor x4 (parallelism 4, 16 GiB),
node v24.20.0, linux/x64, runner image `Linux/X64/ubuntu24/20260907.300.1`.
Default inputs (`uniform_min=150`,
`max_admitted=50,60,65,70,75,80,85,90,100`, `probe_cast=20,30,40,44`,
`repeats=2`, `conditions=idle,loaded`). Completed 2026-09-20T22:43:06Z. Its
printed LOCK-FILE line was copied VERBATIM from the job log into
`tests/fixtures/voice-bound-derivation.json` and re-indented by
`npm run measure-voice-bound -- --lock-from=tests/fixtures/voice-bound-derivation.json`,
which is the only thing that touched the file: the tool recomputed the
`derivation` block, `marginFraction`, the per-row `guard` column and
`guardEvaluatedAgainst` against this tree and left every timing alone. Not one
measured number was edited. `machine.ci` reads `github-actions` and
`machine.runId` reads `35542413222`, so
`voice-bound-derivation.test.ts`'s first assertion — the 2026-09-13 finding made
executable — is satisfied by the table rather than around it.

**Headline numbers.** Every swept shape costs **8% or less** of the 15,000 ms
half-budget target under load; worst is max-admitted N=50 at **1,210 ms**. Idle
worst is 754 ms. The derivation block reads `derivedCast: 100,
derivedCpuMsMax: 746`.

| shape | weight | cpu ms (idle) | cpu ms (loaded) | % of half-budget (loaded) |
|---|---|---|---|---|
| max-admitted N=50 | 1,500,000 | 754 | **1,210** | 8% |
| max-admitted N=60 | 1,490,400 | 662 | 1,057 | 7% |
| max-admitted N=65 | 1,495,650 | 650 | 1,001 | 7% |
| max-admitted N=70 | 1,499,400 | 629 | 978 | 7% |
| max-admitted N=75 | 1,485,000 | 628 | 908 | 6% |
| max-admitted N=80 | 1,497,600 | 590 | 897 | 6% |
| max-admitted N=85 | 1,473,900 | 538 | 788 | 5% |
| max-admitted N=90 | 1,458,000 | 542 | 821 | 5% |
| **max-admitted N=100** | 1,500,000 | 539 | **746** | **5%** |
| uniform-min N=150 | 675,000 | 307 | 463 | 3% |
| probe-cast N=20 | 303,840 | 417 | 616 | 4% |
| probe-cast N=30 | 457,200 | 445 | 674 | 4% |
| probe-cast N=40 | 609,600 | 592 | 841 | 6% |
| probe-cast N=44 | 672,408 | 631 | 869 | 6% |

For scale: the 2026-09-13 table's max-admitted N=80 row — the row the old
constant was derived from — read **11,810 ms** on the runner, pre-hoist. The
guard column the run PRINTED shows REJECT for max-admitted N >= 85 and for
uniform-min N=150, because the tree that ran still carried `DISTINCT = 80`;
`--lock-from` re-evaluated that column against this tree, which is exactly the
2026-09-13 finding-6 mechanism and is asserted by the fixture test.

**The two bounds now.**

| constant | value | how it is picked |
|---|---|---|
| `MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT` | **1,500,000** | HEADROOM, inside the window [1,331,970 .. 1,919,999] that §S2(a) derived from both ends. Merely CHECKED against cost. |
| `MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT` | **100** (was 80) | re-derived by `tests/core/voice-bound-derivation.test.ts` from run 35542413222's table: `deriveCast` returns 100 at 746 ms against a 12,000 ms ceiling. The constant was set from the test's own failure message. |

**And the derivation is now bounded by the SWEEP, not by cost — said here
rather than left to be noticed.** 100 is also the largest cast the run swept,
and no sweep could bracket it. On the max-admitted shape the weight bound fixes
the DOCUMENT rather than the cast: a cast of N carries
`N x floor(W / N²) ~= W / N` pooled words, so the document gets LIGHTER as the
cast grows, and since the 2026-09-07/09-20 Burrows's-Delta hoists left document
size rather than pair count dominating, cost FALLS with cast. The runner's own
loaded column is monotone the wrong way (1,210 ms at N=50 down to 746 ms at
N=100), and a local probe over every cast the weight bound can admit at all
(N=50…223 — `30 x 223² = 1,491,870` is the last one under the bound) reads
810 / 650 / 485 / 451 / 476 / 510 ms. Nothing within an order of magnitude of
the 12,000 ms ceiling. So `MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT = 100` is a
CONSERVATIVE choice equal to the top of a measured grid, not the point where
cost runs out — the weight bound would admit a cast of 223 on its own, and the
cue-parity suite asserts this one stays strictly below that so it is not
decorative.

`tests/core/voice-bound-derivation.test.ts`'s bracketing assertion was therefore
re-anchored rather than deleted, and it is strictly more informative than
before: it still demands a BRACKETING sweep whenever one is possible, and in the
grid-limited case it demands the table PROVE the shape cannot reach the ceiling
— cost not trending upward across the grid, and every swept row at or under 25%
of it. The pre-hoist table (11,848 ms at N=80, 13,836 ms at N=100, run
34740951649) fails that branch by a wide margin, which is the property the
original assertion existed for. **8/8.**

**Headroom, at the locked bounds.**

| fixture | voice-eligible weight | headroom |
|---|---|---|
| `tests/fixtures/feature-length/assembled-feature.fountain` | 443,990 | **3.4x** (1,500,000 / 443,990 = 3.3785…) |
| round-3 bypass B (lightest pinned DoS payload) | 1,920,000 | bound is 1.28x BELOW it — still REJECTED |

Quoted from the suite's own diagnostics:

```
voice-eligible-weight headroom: worst tracked fixture is
"tests/fixtures/feature-length/assembled-feature.fountain" at 3.4x

voice-bound worst-case cost: max-admitted N=100 (150 words/speaker) cpu 475ms
(3% of the 15000ms half-budget target), wall 389ms — local: Intel(R) Xeon(R)
Processor @ 2.80GHz x4 (parallelism 4, 16 GiB), node v22.22.2, linux/x64
```

**What the re-anchored cue-parity tests now assert.** Five, not three — the
"81-150 band" loop was stale for the same reason and could not be left.

1. *The realistic few-big shape's accept/reject boundary is cast 97/98, and the
   WEIGHT bound is what fires there.* Replaces "a 60-cast fully-eligible feature
   is now REJECTED (weight 909,000 > 675,000)", whose PREMISE was stale rather
   than its literal. Sweeping casts 90-105 through the guard: the verdict is
   monotone, the largest admitted cast is **97** (eligible weight 1,491,084) and
   the smallest refused is **98** (1,507,632), refused by
   `MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT` — two casts BELOW the cast bound, so on
   a realistic ensemble the cast bound never fires first, which is now a
   property that fails if it changes. The same test states the consequence of
   the re-derivation in the place the old narrowing was disclosed: the 60-cast
   ensemble (916,200) is ACCEPTED now.
2. *The document that sits EXACTLY on the weight bound is the max-admitted shape
   at the cast bound, it is ACCEPTED, and one paragraph more per speaker is
   REJECTED by the WEIGHT bound.* Replaces the `assert.equal(uniformMinWeight(150),
   MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT)` sanity check, which is unsatisfiable at
   1,500,000 (`30N² = 1,500,000` has no integer root). What sits on the bound now
   is `maxAdmittedWordsPerSpeaker(100, 1_500_000) = 150` words x 100 speakers =
   1,500,000 exactly — simultaneously ON both bounds. The equality is ±1
   sensitive in the weight bound by construction. The narrowing itself survives
   as its own test: uniform-min N=150 is still REJECTED, now unambiguously by
   the CAST bound, with its weight asserted to be under the weight bound so no
   reader has to guess which fired.
3. *The uniform-min N=151 shape is still REJECTED — by the CAST bound now.* Its
   weight, 684,030, is admitted by the raised weight bound, so the assertion
   follows the guard. The ORDERING property that test's title was really about —
   weight is evaluated FIRST, so no pinned DoS rejection ever changed its
   message — is not dropped: it is asserted directly, on uniform-min N=250,
   which violates both bounds and must still report
   `MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT`.
4. *The band the cast bound rejects is 101-223*, not 81-150. Both ends are
   arithmetic: it opens one past the cast bound and closes at
   `floor(sqrt(1,500,000 / 30)) = 223`.
5. *The band ENDS at 223*: uniform-min N=224 weighs 1,505,280, crosses the
   weight bound, and is taken by it — so the band can never silently run off the
   end of the weight bound.

`tests/security/fountain-shape-guard-cue-parity.test.ts` **681/681** (from 678
tests with 5 failing). Every pinned DoS/bypass payload is still REJECTED,
including bypass B, confirmed by the suite's own whole-file check.

**One thing left OPEN, and it is recorded rather than quietly fixed.**
`VOICE_ELIGIBLE_WEIGHT_MEASURED_US_PER_UNIT = 0.173` is a 2026-09-05
developer-box rate for the n-uniform-32-word-floor shape, taken BEFORE the
hoists, and its "the small end is the conservative one" claim no longer holds:
the runner measured the heaviest shape this bound admits (max-admitted N=50,
weight exactly 1,500,000) at 1,210 ms loaded / 754 ms idle — **0.807 and 0.503
us/unit, 4.7x and 2.9x ABOVE the constant**. The model is therefore OPTIMISTIC
by about 5x on the runner. The value is deliberately left alone, because
re-fitting it from a DIFFERENT shape's measurement is precisely the drift the
pair of constants exists to prevent, and because the margin-proof assertion
clears on either number with room (1,500,000 x 0.173 us = 260 ms; x 0.807 us =
1,211 ms; target 10,000 ms — 38x and 8.3x under). Closing it honestly means one
more runner sweep of THAT shape. The constant's comment now says all of this at
the site.

### Gate table, runner lock

| gate | result |
|---|---|
| `tests/core/voice-bound-derivation.test.ts` | 0 (8/8) |
| `tests/security/fountain-shape-guard-cue-parity.test.ts` | **0 (681/681)** |
| `tests/core/voice-delta.test.ts` | 0 (18) |
| `tests/core/voice-delta-hoist-identity.test.ts` | 0 (3) |
| `tests/core/voice-separation-abstention.test.ts` | 0 (15) |
| `tests/core/api-schemas.test.ts` | 0 (6) |
| `tests/routes/scriptide-doctor.test.ts` | 0 (18) |
| `tests/routes/scriptide-doctor-deep.test.ts` | 0 (9) |
| `tests/routes/scriptide-doctor-pdf.test.ts` | 0 (9) |
| `tests/routes/scriptide-doctor-pdf-offthread.test.ts` | 0 (3) |
| `tests/routes/scriptide-doctor-stream.test.ts` | 0 (7) |
| `tests/core/script-doctor.test.ts` | 0 (90) |
| `tests/core/calibration.test.ts` | 0 (21) |
| `tests/core/public-benchmark.test.ts` | 0 (33) |
| `tests/core/scene-grammar.test.ts` | 0 (16) |
| `tests/core/coverage-letter.test.ts` | 0 (55) |
| `tests/core/blind-pairs-discrimination.test.ts` | 0 (4) — ordered 4 of 6, mean gap 0.3833 |
| `tests/core/honesty-audit-claims.test.ts` | 0 (15) — after rows 69 and 116 |
| `tests/core/claims-row-citations.test.ts` | 0 (5) |
| `tests/core/brain-coverage.test.ts` | 0 (8) |
| `npm run lint` | 0 |
| `npm run check-no-console` | 0 — 312 files, 3 quarantine entries, all proven unreachable |
| `npm run gates` | 0 (including the public-benchmark mutation self-check) |
| `npm run build` | 0 |
| `node scripts/check-scoring-receipt.mjs cfe56403..HEAD` | 0 — `no scoring-path files changed` |

Output identity is not expected to hold on this branch and was not run: this is
the scoring candidate. Nothing in this lane touches the scoring path —
`server/lib/validation.ts` sits outside `doctor.ts`'s import graph, which the
receipt gate confirms by name.

### Owner runbook, reduced again

The calibrate step is **DONE**. What is left is the private-corpus half, which
nothing in this repository can substitute for.

```
git fetch origin lane/land-feature-length-defects
git worktree add ../trial-fld --detach origin/lane/land-feature-length-defects
cd ../trial-fld
npm ci --ignore-scripts        # Windows: then npm run setup-hooks under Git Bash
REAL_SCRIPT_CORPUS_DIR=<corpus> npm run measure-real
```

1. **Read the AUC-24 against `AUC24_FLOOR` = 0.622.** A fall is a real finding
   about this change; do not answer it by moving the floor. What the run can and
   cannot settle is unchanged from §S5 step 1.
2. **Re-lock `tests/fixtures/real-corpus-manifest.json`** — all 72 rows move on
   the level shift alone.
3. **`npm run lock-auc24`** on the **`shuffle-drop/v4`** recipe. It writes
   `tests/fixtures/auc24-table.json` for the first time; its number is not
   comparable to 0.731.
4. **Merge decision.** Unchanged from §S5 step 5, with one item removed from the
   "not in" column: the shape guard no longer blocks.

## § Cost-rate constant left open, and how to close it

The "one thing left OPEN" item above (`VOICE_ELIGIBLE_WEIGHT_MEASURED_US_PER_UNIT
= 0.173`) asked a specific question: is the runner's `uniform-min` row from run
35542413222 (N=150, weight 675,000, 463 ms loaded / 307 ms idle) the SAME shape
the 0.173 constant was fitted on, so it could be re-fit from that row instead of
staying stale? **No — checked, not assumed, and the answer is different shapes,
confirmed from two independent directions:**

1. **The generator itself refuses to produce the constant's shape.**
   `scripts/lib/voice-bound.ts`'s `buildUniformCast` — the one generator
   `uniform-min`, `max-admitted` and every fixture in the security suite share —
   throws unless `wordsPerSpeaker` is a multiple of 6 (`the paragraph's word
   count`) and at least 30. `uniform-min` is `buildUniformCast(cast, 30)`: every
   speaker at exactly 30 words, the CURRENT `VOICE_ELIGIBLE_MIN_WORDS` floor. The
   constant's own comment and the margin-proof test both name its shape as "n
   uniform characters on the 32-word floor" — and 32 is not a multiple of 6, so
   the current shared generator cannot produce it at ANY N. The 2026-09-05
   figure was measured against a different, no-longer-present ad hoc generator,
   predating this file (the header of `voice-bound.ts` dates both of today's
   generators to 2026-09-12, a week after 0.173 was taken).
2. **An independent prior review already caught the same gap from the other
   side.** `docs/audits/2026-09-07-innovation/scoring-review.md` (§"The
   re-derived DoS bound checks out"): "the worst-shape grid uses 32 words per
   character where `VOICE_ELIGIBLE_MIN_WORDS` is 30, and 30 is the heavier shape
   at fixed weight (~3% more characters, ~7% more pairs)". That is a real,
   quantified difference in what each shape measures at a given weight bound,
   not a rounding note — it is exactly why the two shapes cannot be treated as
   interchangeable inputs to the same rate.

**Because they are different shapes, per the task's own branching: the constant
is NOT changed** (still 0.173, still cross-checked in its comment against the
runner's actual worst-shape reading — max-admitted N=50, 0.807 us/unit loaded /
0.503 us/unit idle — with both readings shown to clear the 10,000 ms target:
1,500,000 x 0.173 us = 260 ms, 38x under; x 0.807 us = 1,211 ms, 8.3x under).

**No sweep was added to `scripts/measure-voice-bound-cost.mjs`'s shape list.**
The task's own bar for adding one is "a small, obviously-correct addition" and,
failing that, naming the `--uniform-min` input that already reproduces the
shape. Neither applies here:

- **No existing input reproduces it.** `uniform-min` and `max-admitted` both
  route through `buildUniformCast`, whose words-per-speaker is fixed at 30 (the
  first) or computed from the weight bound (the second) — neither is
  adjustable to 32 by choosing a different `N`, because words-per-speaker and
  cast are independent parameters and 32 is categorically excluded (not a
  multiple of 6) regardless of `N`. The closest same-code approximation,
  `--uniform-min=97` (matching the historical shape's cast exactly), measures a
  DIFFERENT weight — 30 x 97² = 282,270, not 301,088 — a ~6.3% lighter document,
  which is precisely the wrong kind of approximation for a rate whose whole
  point is weight-normalized cost.
- **Adding a true `uniform-32` shape is not a small change to verify locally.**
  It would mean introducing a second dialogue-paragraph unit alongside
  `DLG_UNIFORM`/`DLG_PROBE` sized so `voice-delta.ts`'s letter-only tokenizer
  counts exactly 32 words per speaker, in a file three other suites depend on
  for byte-stable timings (`voice-bound.ts`'s own header: "changing a generator
  here changes the measurement, the test and the constant together, or the
  fixture test fails"). Because the original 2026-09-05 generator no longer
  exists in the repository, this would be a NEW 32-word shape approximating a
  lost one from its two known outputs (n=97 -> weight 301,088), not a verified
  reproduction of it — the opposite of the "obviously correct" bar this task
  set.

**What would close this honestly, and the exact dispatch to do it:** add a
`uniform-32` entry to `VOICE_BOUND_SHAPES` in `scripts/lib/voice-bound.ts` (a
`buildUniformCast`-style generator using a 32-word paragraph, or a
`wordsPerSpeaker` override that bypasses the multiple-of-6 check with its own
verified paragraph text), wire it into `scripts/measure-voice-bound-cost.mjs`'s
CLI the same way `--uniform-min=`/`--max-admitted=` already are, confirm
locally that `pooledWordCount` on its generated dialogue reads exactly 32
per speaker, then have the owner dispatch
`.github/workflows/calibrate-voice-bound.yml` with an input naming that shape
(e.g. `uniform_32=97` alongside the existing defaults) so the row comes back
with a `machine.ci`/`machine.runId` stamp the same way `uniform-min` and
`max-admitted` did in run 35542413222. That is new generator code plus a fresh
runner sweep — genuinely out of scope for a lane restricted to
`server/lib/validation.ts`, the margin-proof test, `docs/CLAIMS_REGISTER.md`
and this README, so it is recorded here rather than attempted piecemeal.

Gate table for this decision (no code path changed; documentation only):

| gate | result |
|---|---|
| `npm run lint` | 0 |
| `tests/core/voice-bound-derivation.test.ts` | 0 (8/8) |
| `tests/security/fountain-shape-guard-cue-parity.test.ts` | 0 (681/681) |
| `tests/core/honesty-audit-claims.test.ts` | 0 (15) |
| `tests/core/brain-coverage.test.ts` | 0 (8/8), no wikilinks added |
| `node scripts/check-scoring-receipt.mjs a36ae76a..HEAD` | 0 — no scoring-path files changed |
