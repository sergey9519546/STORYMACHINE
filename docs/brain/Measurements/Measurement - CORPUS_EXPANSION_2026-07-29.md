---
type: measurement
updated: 2026-09-05
sources: [docs/p1-benchmark/CORPUS_EXPANSION_2026-07-29.md]
status: active
---

# Measurement — CORPUS_EXPANSION_2026-07-29

**Question:** grow the P1 corpus from an animation-only 48 scripts to a
broad, largely live-action set, with full provenance for auditability.

**Status: Complete.** Corpus grew **48 → 761** produced screenplays (89
original + 684 crawled from IMSDb/DailyScript across 14 genres), shifting
composition from 100% animation to **~92% live-action**, split 60/20/20
train/val/test (seed 42, hash-locked test set; 153 scripts in the test
partition).

**What this feeds:** the corpus this document built is what
[[Measurement - DISCRIMINATION_BASELINE_2026-07-29]] measures against.

**What was NOT reproduced here:** this document is provenance only — it
does not itself report discrimination numbers.

## Sources

- `docs/p1-benchmark/CORPUS_EXPANSION_2026-07-29.md`
