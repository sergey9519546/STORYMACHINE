---
type: branch
updated: 2026-09-11
sources: [docs/audits/2026-09-07-innovation/scoring-review.md, docs/audits/2026-09-07-innovation/scoring-lane-report.md, docs/p1-benchmark/PUBLIC_BENCHMARK_2026-09-06.md]
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
- `docs/scoring/FEATURE_LENGTH_DEFECTS_2026-09-07.md` (on the branch; not on `main`)
- `docs/p1-benchmark/PUBLIC_BENCHMARK_2026-09-06.md` — the `main` baseline the readings are against
