---
type: branch
updated: 2026-09-07
sources: [docs/scoring/FEATURE_LENGTH_DEFECTS_2026-09-07.md, docs/p1-benchmark/MEASUREMENT_RECEIPTS.md, docs/p1-benchmark/PUBLIC_BENCHMARK_2026-09-06.md]
status: pending-measurement
---

# Branch — Feature-Length Defects

**Branch:** `scoring/feature-length-defects`, six commits on `main` @
`9b199b72`.

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
   `scarcityPenalty` saturating at 15 scenes.
4. **`meanAbsDialogueShareDeltaNormalised`** — exposed, NOT wired, on a
   measured null.
5. **Honest `plainSummary` / `strengths`** — the paragraph can no longer
   contradict the five dimension scores. Strings only.

**What it measurably does, on distributable text:**

| channel | `main` @ `9b199b72` | this branch |
|---|---|---|
| `SHUFFLE_DROP` matched-pair | 0.5313 | **0.8750** |
| `SHUFFLE_DROP` mean health gap | **−1.93** (damaged copy higher) | **+2.10** |
| `CLIMAX_RELOCATE` matched-pair | 0.4219, 11 of 32 ties | **0.5469, 1 tie** |
| `DIALOGUE_FLATTEN` control | 1.0000 / 0.9473 | 1.0000 / 1.0000 |
| blind matched pairs | 1 of 6, −0.02 | **4 of 6, +0.3833** |
| calibration bands | MONO, gap 25.32 | MONO, gap 25.32 (not one sample moves) |
| `stapled_shorts` witness | +8.2 KNOWN FAIL | **−2.0 PASS**, promoted to `hard` |

Blast radius: 25 of 45 in-repo fixtures move health (RMS 9.580), 6 verdicts
flip. Four assertions moved, each re-anchored with its measurement rather than
a widened tolerance — see the doc's §8.4.

**Why it is parked:** it is a scoring-path change, so it needs
`npm run measure-real` against the local corpus before it can be trusted and
merged — see [[Gate - Receipt Gate]] and [[Owner - R5 Measurement and Merge]].
`check-scoring-receipt.mjs main..HEAD` exits **1**, correctly, because the
entry is PENDING.

**The one thing the owner's run has to check.** The scarcity saturation is
byte-identical for every script of 15 scenes or fewer, so the public benchmark
and the calibration corpus are blind to it. On the private corpus (median 118
scenes) it will move every script by roughly 8 points, and whether AUC-24 stays
above its 0.622 floor is not knowable from this repository. A fall is a real
finding about this change, not a reason to move the floor — see
[[Gate - AUC-24 Ratchet]].

**Relation to the other parked branches.** It is INDEPENDENT of
[[Branch - R5 Verbosity Bias]] and [[Branch - Stacked R5 plus Advice]], and it
addresses the same defect from the opposite direction: R5 replaces the density
denominator with scene opportunity, which this branch measured and rejected —
paired shuffle-drop **0.0938**, an inversion, because it normalises by the
quantity the degradation attacks. Both cannot land; see
[[Measurement - FEATURE_LENGTH_DEFECTS_2026-09-07]] §8.2.

## Sources

- `docs/scoring/FEATURE_LENGTH_DEFECTS_2026-09-07.md` — the running table, the candidate comparison, the null
- `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` — the PENDING entry for this branch
- `docs/p1-benchmark/PUBLIC_BENCHMARK_2026-09-06.md` §11 — the re-locked floors
