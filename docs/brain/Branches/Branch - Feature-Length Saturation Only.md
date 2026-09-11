---
type: branch
updated: 2026-09-11
sources: [docs/scoring/FEATURE_LENGTH_DEFECTS_2026-09-07.md, docs/p1-benchmark/MEASUREMENT_RECEIPTS.md, docs/p1-benchmark/PUBLIC_BENCHMARK_2026-09-06.md]
status: pending-measurement
---

# Branch — Feature-Length Saturation Only

**Branch:** `scoring/feature-length-saturation-only`, three commits on `main` @
`ad3f6fa7`.

**What it is:** ONE HALF of [[Branch - Feature-Length Defects]]. That branch
changes two things in `doctor.ts` — the sub-1 density curve's steepness
(`SUB_DENSITY_STEEPNESS` 50 → 2, inside `densityPenalty`) and the scarcity
term's saturation (`140/min(sceneCount, 12)`, inside `scarcityPenalty`). They
are two different functions, so they are independently landable. This branch is
the saturation without the steepness, so the owner can land the half that fixes
the staple pathology if `npm run measure-real` rejects the half that does not
collide with anything else.

**Read the order, not just the branch.** Measure
[[Branch - Feature-Length Defects]] FIRST. This one is the fallback — step 2 of
the decision tree in [[Owner - R5 Measurement and Merge]].

**What it measurably does, on distributable text:**

| channel | `main` | this branch |
|---|---|---|
| `SHUFFLE_DROP` matched-pair | 0.5313 | 0.5313 — **byte-identical** |
| `SHUFFLE_DROP` all-pairs | 0.5586 | 0.5493 |
| `SHUFFLE_DROP` mean health gap | −1.93125 | **−2.15 (worse)** |
| `CLIMAX_RELOCATE` matched-pair | 0.4219, 11 ties | 0.4219, 11 ties — **byte-identical** |
| `CLIMAX_RELOCATE` all-pairs | 0.4673 | 0.4746 |
| `DIALOGUE_FLATTEN` control | 1.0000 / 0.9473 | 1.0000 / 0.9473 |
| calibration bands | MONO, gap 25.32 | MONO, gap 25.32 (not one sample moves) |
| `stapled_shorts` witness | +6.4 KNOWN FAIL | **0.0 PASS over all 14 orderings** |

The two PRIMARY statistics do not move at all, because the saturation cannot
touch a document of 12 scenes or fewer and the public corpus is 9-14 intact /
6-10 degraded. Only the all-pairs pair moves, from the six 13-and-14-scene
scripts paying 0.898-1.667 points more. Two floors were re-locked from this
branch's own run, one DOWN and one UP; `AUC24_FLOOR` is untouched at 0.622.

**The two costs, stated before the benefit.**

1. **The mean health gap under the drop gets WORSE**, −1.93125 → −2.15. The
   saturation alone does not fix the deletion reward — the steepness change is
   what does that, and this branch leaves it out. On the public corpus the
   damaged copy still scores higher on average, by slightly more than on `main`.
2. **The staple witness passes at a margin of exactly 0.0**, not 1.8. At a
   saturation point of 12 the scarcity term contributes exactly zero to that
   comparison, so the margin is the staple's own density disadvantage plus its
   deductions; without the steepness change the density penalty is pinned at its
   10-point ceiling for both documents (they sit 0.013 apart), so the density
   disadvantage rounds to zero and the whole margin is a deduction term that is
   non-negative but often exactly 0. The invariant holds by construction here and
   never strictly.

**What it does close.** The arithmetic, as a property rather than three spot
values: the scarcity term is `140/min(n, 12)` at every scene count from 2 to
400, flat at and above 12, strictly decreasing below. Scene count buys NOTHING at
or above 12 scenes, and the residue it can still buy is exactly
`140/bestPartScenes − 140/12` — 3.889 points for a 9-scene best part, zero if and
only if the best part is at or past the saturation point.

**Why it is parked:** it is a scoring-path change, so it needs
`npm run measure-real` against the local corpus — see [[Gate - Receipt Gate]] and
[[Owner - R5 Measurement and Merge]]. `check-scoring-receipt.mjs main..HEAD`
exits **1**, correctly, naming its own PENDING entry.

**What the owner's run can and cannot settle.** Identical in kind to the sibling
branch: a ~10.480-point near-uniform level shift at the private median of 118
scenes, which moves verdicts, grades and all 72 manifest rows but is
rank-preserving and cannot move AUC-24; and the scarcity channel's per-script
degradation delta going from +0.586 to exactly 0.000 for every script of roughly
22 scenes or more, which is what AUC-24 measures. See [[Gate - AUC-24 Ratchet]].

## Sources

- `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` — this branch's PENDING entry
- `docs/p1-benchmark/PUBLIC_BENCHMARK_2026-09-06.md` §11 — its re-locked floors and the per-branch table
- `docs/scoring/FEATURE_LENGTH_DEFECTS_2026-09-07.md` — the candidate comparison both branches come out of
