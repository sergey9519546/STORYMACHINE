---
type: branch
updated: 2026-09-11
sources: [docs/audits/2026-09-07-innovation/scoring-review.md, docs/audits/2026-09-07-innovation/scoring-lane-report.md, docs/scoring/FEATURE_LENGTH_DEFECTS_2026-09-07.md, docs/p1-benchmark/MEASUREMENT_RECEIPTS.md, docs/p1-benchmark/PUBLIC_BENCHMARK_2026-09-06.md]
status: pending-measurement
---

# Branch — Feature-Length Defects

**Branch:** `origin/scoring/feature-length-defects` @ `bcc96f85`
(18 commits on `main` @ `ad3f6fa7`; round-2 tip `13d64bb5`; the pre-rebase
round-1 tip `4643d590` is no longer an ancestor).

**What it is:** the scoring-path answer to three findings of the 2026-09-06
product discovery ([[Audit - 2026-09-07 Innovation Batch]]): the voice
channel abstained on every feature-length script (now per character); the
title of the script and its character names were scored as critical clues
(guarded — two lexically undecidable shapes stay `todo` behind a corpus-wide
property that went from 65 offenders of 131 seeded ids to 0 of 53); and
length beat coherence — twelve unrelated shorts stapled together outscored
every one of them. The formula change is split into two separately landable
commits: `SUB_DENSITY_STEEPNESS` 50 → 2 inside `densityPenalty` (the half
that collides with [[Branch - R5 Verbosity Bias]]), and `scarcityPenalty`
saturating at `140/min(sceneCount, 12)` (the half that fixes the staple, and
the only half with any effect at feature length —
[[Branch - Feature-Length Saturation Only]] is that half alone). The
order-sensitive candidate `meanAbsDialogueShareDelta` measured a null once
cast size was normalised and stays exposed, not wired, asserted by a test.

**Measured on [[Gate - Public Benchmark]]** (reviewer-reproduced on an
independent scorer): matched-pair shuffle-drop 0.5313 → **0.8750**
[0.7500, 0.9688], mean health gap under the drop −1.93 → **+1.89** (the
damaged copy no longer scores higher); climax-relocate 0.4219 → 0.5469 with
exact ties 11 → 1; control 1.0000/1.0000; blind pairs 1 of 6 → 4 of 6;
calibration corpus byte-identical per sample. The `stapled_shorts`
metamorphic witness reads −1.6 over the lane's 14 orderings and −1.5 over the
reviewer's 58 (0 of 58 fail). Identity vs `main`: 25 of 45 reports move,
RMS 9.839, six verdict flips. One floor re-locked DOWN (all-pairs
shuffle-drop 0.8106 → 0.8091); `AUC24_FLOOR` untouched.

**Review:** three rounds by one independent reviewer — REVISE (nine items,
every headline number reproduced), REVISE (four one-line untruths left),
**MERGE-READY-FOR-OWNER** at `bcc96f85`. The clue-guard narrowing that read
better on every statistic was tried, measured, and reverted when the full
suite showed it had put a character name into the clue channel; floors
restored to the byte.

**Known defect on the branch (found 2026-09-12, not yet corrected there):**
the branch re-derived `MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT` to 1,500,000 by
bracketing fixture WEIGHTS below the lightest pinned DoS payload; the
independent review of the main-side lane that made the same change
(`docs/audits/2026-09-12-adversarial/rulebook-review.md`) showed weight is
not a cost proxy across shapes — a 223-speaker × 30-word document under
that bound costs 27–36 s in `runScriptDoctor`, over the 30 s analysis
budget, where the old 300,000 bound's worst case was 6.4 s. The main-side
lane is re-deriving the bound from measured cost; the branch's bound
commit needs the same correction before the owner lands it, and the
stacked branch [[Branch - Adversarial 2026-09-12]] is building the
analyzer-side pair cap that makes the shape cheap.

**What the main side actually did (2026-09-13, [[Audit - 2026-09-13 CI Green]]):**
not a lower weight bound — a SECOND one. `MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT`
stays at 675,000 and `MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT` now bounds the
eligible cast count beside it, derived on the GitHub runner itself. A scalar
weight bound the runner can carry also rejects an ordinary 40-character
feature, so lowering it further was not available. So the correction this
branch needs is BOTH constants, not a different number for the one it
carries.

**And the fix that raises either is not the pair cap** (2026-09-13 review,
finding 7). `burrowsDelta` re-derives both characters' relative frequencies 130
times per pair — `corpusStats` is called inside the loop over the 65 function
words and recomputes `relativeFrequencies` for both sides each time, from two
maps already in hand. Hoisting it is the same arithmetic in the same order:
**bit-identical** (`maxDeltaDiff = 0` over every pair) and 43.8x faster on a
435-pair corpus, 56.0x / 54.3x on the two shapes the bounds are derived against.
`analyzeVoices` is ~99% of the worst admitted shape's cost and ~98% of that is
redundant recomputation. It is scoring-path (`voice-delta.ts` is reachable from
`doctor.ts`) so it needs a receipt — but it costs the score nothing, which a
pair cap does not.


**What the branch changes, in the branch author's own words** (kept from the
branch-side copy of this note, which this merge unions with the session-side
copy above):

1. **Voice channel, per-character abstention.** `analyzeVoices` abstained for
   the WHOLE script if any one character had under 30 words, so every real
   feature (they all have a one-line walk-on) read `VOICE SEPARATION — N/A`.
   18 of 45 in-repo fixtures scored before; 44 of 45 after. Two coupled
   changes it required: a **220x performance fix** (42,062 ms → 191 ms on a
   200-name payload, proven bit-identical against a from-scratch reference)
   and the shape guard's cost model moving to the eligible SUBSET, which
   closes a measured hole and is strictly stricter.
2. **`ORPHAN_CLUE` proper-noun / title / location guard.** A 139-scene
   document's critical tier was eight character names, and retitling the
   script changed the writer's first instruction. The existing speaker guard
   was near-inert: it built its cue set by scanning `rawText`, which has the
   cue lines already stripped out.
3. **The length pathology** — `SUB_DENSITY_STEEPNESS` 50 → 2 and
   `scarcityPenalty` saturating at **12** scenes. Two separate commits, because
   they are two separate functions and the owner may land only one of them; see
   [[Branch - Feature-Length Saturation Only]]. Round 1 saturated at 15, which
   did NOT close the pathology: 7 of 14 orderings of the staple witness's own
   twelve parts still outscored its best part. The witness now asserts the
   maximum over all 14 orderings.
4. **`meanAbsDialogueShareDeltaNormalised`** — exposed, NOT wired, on a
   measured null.
5. **Honest `plainSummary` / `strengths`** — the paragraph can no longer
   contradict the five dimension scores. Strings only.

**What it measurably does, on distributable text:**

| channel | `main` @ `9b199b72` | this branch |
|---|---|---|
| `SHUFFLE_DROP` matched-pair | 0.5313 | **0.8750** |
| `SHUFFLE_DROP` mean health gap | **−1.93125** (damaged copy higher) | **+1.89375** |
| `SHUFFLE_DROP` sign counts | 17/15/0 | **28/4/0** |
| `CLIMAX_RELOCATE` matched-pair | 0.4219, 11 of 32 ties | **0.5469, 1 tie** |
| `DIALOGUE_FLATTEN` control | 1.0000 / 0.9473 | 1.0000 / 1.0000 |
| blind matched pairs | 1 of 6, −0.02 | **4 of 6, +0.3833** |
| calibration bands | MONO, gap 25.32 | MONO, gap 25.32 (not one sample moves) |
| `stapled_shorts` witness | +8.2 KNOWN FAIL | **−1.6 PASS over all 14 orderings**, `hard` |

Four of the 32 are still inverted under the drop — `transfer-window` +8.9,
`room-12` +8.4, `the-key-under-the-mat` +1.6, `quiet-season` +0.1 — and all four
sit on the density POWER branch, which the sub-1 steepness change cannot reach. A
writer of a dense 10-scene script can still gain 8.9 points by deleting a third
of their scenes.

Blast radius: 25 of 45 in-repo fixtures move health (RMS 9.580), 6 verdicts
flip. Four assertions moved, each re-anchored with its measurement rather than
a widened tolerance — see the doc's §8.4.

**Why it is parked:** it is a scoring-path change, so it needs
`npm run measure-real` against the local corpus before it can be trusted and
merged — see [[Gate - Receipt Gate]] and [[Owner - R5 Measurement and Merge]].
`check-scoring-receipt.mjs main..HEAD` exits **1**, correctly, because the
entry is PENDING.

**What the owner's run can and cannot settle.** The scarcity saturation does two
separable things to a feature-length script and only one can move a matched-pair
rank statistic. A **near-uniform level shift** — every script at the private
median of 118 scenes loses 10.480 points — moves verdicts, grades and all 72
manifest rows, and is rank-preserving, so it cannot move AUC-24 at all. The
**scarcity channel's degradation delta going to exactly zero** is the
AUC-relevant change: `140/79 − 140/118 = +0.586` points of separation before,
`0.000` after, for every script of roughly 22 scenes or more. So AUC-24 measures
whether health still orders an intact feature above a shuffle-dropped copy of
itself once that channel contributes nothing. It cannot apportion the result
between the two halves, which is why [[Branch - Feature-Length Saturation Only]]
exists. A fall is a real finding about this change, not a reason to move the
floor — see [[Gate - AUC-24 Ratchet]].

**Relation to the other parked branches.** It is INDEPENDENT of
[[Branch - R5 Verbosity Bias]] and [[Branch - Stacked R5 plus Advice]], and it
addresses the same defect from the opposite direction: R5 replaces the density
denominator with scene opportunity, which this branch measured and rejected —
paired shuffle-drop **0.0938**, an inversion, because it normalises by the
quantity the degradation attacks. They collide on ONE function, not two — R5
rewrites `densityPenalty` and leaves `scarcityPenalty` alone — so the two halves
of THIS branch are independently landable even though this branch and the R5
stack are not. See [[Measurement - FEATURE_LENGTH_DEFECTS_2026-09-07]] §8.2 and
[[Branch - Feature-Length Saturation Only]].

**Why it is parked:** its receipt is PENDING. The scarcity saturation is
identity at 15 scenes or fewer, so the public benchmark and the calibration
corpus are blind to the half that matters at feature length; on the private
corpus it takes the scarcity channel's per-script degradation delta from
+0.586 to exactly 0.000 for every script of about 22 scenes or more, and
shifts every script's level by roughly 10.5 points, which is rank-preserving.
What AUC-24 can and cannot settle is spelled out in
[[Owner - R5 Measurement and Merge]], which puts this branch FIRST in the
owner's order. See [[Gate - Receipt Gate]].

## Sources

- `docs/audits/2026-09-07-innovation/scoring-review.md` — three rounds, every reproduction with its command
- `docs/audits/2026-09-07-innovation/scoring-lane-report.md` — the lane's round-1 final message and round-2 report
- `docs/scoring/FEATURE_LENGTH_DEFECTS_2026-09-07.md` — the running table, the candidate comparison, the null
- `docs/p1-benchmark/PUBLIC_BENCHMARK_2026-09-06.md` — the `main` baseline the readings are against
- `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` — the entry for this branch
