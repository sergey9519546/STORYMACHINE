---
type: measurement
updated: 2026-09-05
sources: [docs/scoring/EMOTIONAL_ARC_ANTISLOP_EXPERIMENT_2026-07-11.md]
status: active
---

# Measurement — EMOTIONAL_ARC_ANTISLOP_EXPERIMENT_2026-07-11

**Question:** measurement-first execution of ROADMAP §8 waves EA
(emotional-arc) and AS (anti-slop) — all deterministic, no LLM, on the
45-film real corpus (reconstructed Fountain, rights-safe). Prototypes are
throwaway (Python, `/tmp`); nothing shipped to the engine from this
document.

**Verdict counts:** **EA → GO (with calibration work).** Per-scene VAD
(compact lexicon) + structural tension → position-aware arc-shape features
(ramp-correlation, peak position, resolution drop) → `arc_health`, compared
against the current engine via AUC = fraction of real>degraded pairs (using
the engine's own degradation recipes).

**What this fed:** the GO recommendation is what
[[Measurement - ARC_RECALIBRATION_WAVE_2026-07-11]] later held back from
wiring into `health`.

## Sources

- `docs/scoring/EMOTIONAL_ARC_ANTISLOP_EXPERIMENT_2026-07-11.md`
