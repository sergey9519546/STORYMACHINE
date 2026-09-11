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
