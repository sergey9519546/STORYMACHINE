---
type: branch
updated: 2026-09-11
sources: [docs/scoring/FEATURE_LENGTH_DEFECTS_2026-09-07.md, docs/p1-benchmark/MEASUREMENT_RECEIPTS.md, docs/p1-benchmark/PUBLIC_BENCHMARK_2026-09-06.md]
status: pending-measurement
---

# Branch — Feature-Length Defects

**Branch:** `scoring/feature-length-defects`, thirteen commits on `main` @
`ad3f6fa7` — seven from round 1 (with the formula commit split into two so the
two halves are separately landable) plus six from round 2, the revision round an
independent review asked for. The review is
`docs/audits/2026-09-07-innovation/scoring-review.md` and the round-2 report is
appended to `scoring-lane-report.md` beside it.

**What it is:** the scoring lane's answer to [[Gate - Public Benchmark]] §10 —
"the density term rewards deletion" — plus the report defects that only show
up at, or are only visible because of, feature length.

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

## Sources

- `docs/scoring/FEATURE_LENGTH_DEFECTS_2026-09-07.md` — the running table, the candidate comparison, the null
- `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` — the PENDING entry for this branch
- `docs/p1-benchmark/PUBLIC_BENCHMARK_2026-09-06.md` §11 — the re-locked floors
