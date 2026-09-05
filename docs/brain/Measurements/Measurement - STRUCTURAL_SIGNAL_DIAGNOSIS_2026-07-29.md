---
type: measurement
updated: 2026-09-05
sources: [docs/p1-benchmark/STRUCTURAL_SIGNAL_DIAGNOSIS_2026-07-29.md]
status: active
---

# Measurement — STRUCTURAL_SIGNAL_DIAGNOSIS_2026-07-29

**Question:** root-cause why CLIMAX_RELOCATE AUC sits at 0.490 (chance) and
why formula tuning alone cannot lift the structural channels to the P1
gate.

**Verdict:** the root cause is not the health formula — it is the **signal
layer**: every field on `ScreenplaySceneRecord` is computed from that
scene's own text, so shuffling or relocating scenes preserves every field
and no formula built on them can detect the reordering. The fix needs a new
analyzer-layer field that reads a scene's position or content *relative to
its neighbors*.

**What this fed:** confirmed a second time, independently, by
[[Measurement - STRUCTURAL_SIGNAL_SCREEN_2026-08-03]], which screened five
candidate order-sensitive signals before implementing any.

## Sources

- `docs/p1-benchmark/STRUCTURAL_SIGNAL_DIAGNOSIS_2026-07-29.md`
