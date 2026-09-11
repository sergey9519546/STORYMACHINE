---
type: branch
updated: 2026-09-11
sources: [docs/audits/2026-09-07-innovation/scoring-review.md, docs/audits/2026-09-07-innovation/scoring-lane-report.md]
status: pending-measurement
---

# Branch — Feature-Length Saturation Only

**Branch:** `origin/scoring/feature-length-saturation-only` @ `efd1a463`
(3 commits on `main` @ `ad3f6fa7`).

**What it is:** the scarcity-saturation half of
[[Branch - Feature-Length Defects]] on its own — `scarcityPenalty`
saturating at `140/min(sceneCount, 12)`, with the `stapled_shorts` witness
and its own PENDING receipt and re-locked floors — cherry-picked so the owner
can land the half that fixes the staple pathology if AUC-24 rejects the
steepness change. It does not touch `densityPenalty`, so it does not collide
with [[Branch - R5 Verbosity Bias]] at all.

**What it reads, honestly:** on [[Gate - Public Benchmark]] the matched-pair
shuffle-drop stays at `main`'s 0.5313 (all-pairs 0.5493) and the mean health
gap under the drop gets slightly WORSE (−1.93 → −2.15), because the
saturation alone does not fix the deletion reward; the staple witness passes
at a margin of exactly 0.0 rather than the combined branch's 1.6, because
without the steepness change the density term is pinned at its ceiling for
both documents. One floor moved down and one moved up
(`PUBLIC_ORDER_FLOOR` 0.4473 → 0.4546); the reviewer verified both. The
reviewer reproduced every number on this branch too, "including the sat
branch's uncomfortable readings".

**Where it sits in the owner's order:** SECOND — measured only if the
combined branch does not hold above the AUC-24 floor; see
[[Owner - R5 Measurement and Merge]] and [[Gate - Receipt Gate]].

## Sources

- `docs/audits/2026-09-07-innovation/scoring-review.md` — round 2, "sat-only 0.5313 / 0.5493 / −2.15"
- `docs/audits/2026-09-07-innovation/scoring-lane-report.md` — round 2, item 8
