---
type: measurement
updated: 2026-09-05
sources: [docs/p1-benchmark/BLIND_PAIRS_2026-09-04.md]
status: active
---

# Measurement — BLIND_PAIRS_2026-09-04

**Question:** does the score separate craft, or vocabulary? The calibration
corpus (`server/nvm/analyze/calibration/corpus.ts`, 20 hand-authored samples
in four bands) underwrites the health percentile, the band separation, and
the draft-rank denominator — but its samples were written FOR the engine.
This document instead writes six matched excellent/bad pairs blind to the
engine and scores them.

**Verdict counts:** the score orders **1 of 6** blind pairs correctly, vs.
**5 of 5** calibration pairs. The rule channel is at chance on both sets.
**Nine of twelve** blind scripts tie at exactly one health value because the
density penalty saturates.

**What was NOT reproduced:** this is a fixture-level (12-script) measurement,
not a corpus-scale P1 result — it complements, and does not substitute for,
[[Measurement - DISCRIMINATION_BASELINE_2026-07-29]]'s 153-script test
partition.

## Sources

- `docs/p1-benchmark/BLIND_PAIRS_2026-09-04.md`
