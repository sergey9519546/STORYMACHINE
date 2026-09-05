---
type: measurement
updated: 2026-09-05
sources: [docs/scoring/ARC_RECALIBRATION_WAVE_2026-07-11.md]
status: active
---

# Measurement — ARC_RECALIBRATION_WAVE_2026-07-11

**Question:** should the emotional-arc signal be wired into `health` this
wave?

**Decision: HOLD the wire.** Keep the emotional-arc signal diagnostic-only
— it is real but sub-ratchet; wiring it into `health` this wave would
regress the scale and/or the produced-floor. Recorded as the graduation
gate for a future, stronger position-aware detector. Measured against the
authoritative env-gated 71-script corpus baseline
(`tests/core/real-script-corpus.test.ts`, `REAL_SCRIPT_CORPUS_DIR`).

**What was NOT reproduced:** no wiring happened as a result of this
document — the signal remained diagnostic-only.

## Sources

- `docs/scoring/ARC_RECALIBRATION_WAVE_2026-07-11.md`
