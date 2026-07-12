# Density re-calibration wave — viability measurement (2026-07-11B)

**Outcome: the verbosity fix is a RE-ARCHITECTURE, not a re-tune. Do not attempt
it as a manifest re-lock wave. Documented here so the next attempt starts from
the measured truth, not a guess.**

## What was measured (scale-invariant, on the authoritative corpus + calibration)

Candidate: switch the density opportunity unit from `wordCount^0.7` (padding-
sensitive) to a `sceneCount`-based unit (padding-robust).

1. **Verbosity (empty_verbosity): FIXED.** base.fountain scene-density
   17.506 → padded 19.439 (rises, because filler adds a few weighted issues
   while sceneCount is constant) ⇒ health would FALL under padding, flipping the
   metamorphic case. Word-density fell 1.694 → 1.520 (the current +6 bias).
2. **Calibration band monotonicity: PRESERVED, cleanly.** mean scene-density by
   band = strong 19.35 < competent 20.20 < weak 21.83 < troubled 23.00 — perfectly
   ordered (the controlled-scene-budget corpus design makes scene-density track
   craft).
3. **Structural discrimination (shuffle-drop): DEGRADED.** intact<degraded
   ordering correct on a 20-script probe: word-density 11/20 (0.55) vs
   scene-density 6/20 (0.30 — worse than chance). The shuffle-drop recipe removes
   1/3 of scenes, so a sceneCount-normalized density does not track that damage.

## Why it can't be a simple blend either

The +6 bias comes from a large word-density drop. Offsetting it by ADDING a
linear scene-density term needs weight w ≥ ~3.2 (since scene-density's padding
delta ≈1.9 is small vs its absolute ≈17.5), and w·17.5 ≈ 55 penalty points drives
every script's health to the 0 floor. A linear add destroys the scale.

## The real conclusion

The structural-discrimination signal (shuffle-drop AUC 0.672, a hard ratchet)
and the padding-robustness objective are **entangled in one shared density
scalar**. Word-normalization gives structural discrimination but admits the
verbosity bias; scene-normalization gives padding-robustness but loses
structural discrimination. No single re-normalized scalar satisfies both.

The correct fix DECOUPLES them: keep structural degradation detection in the
RULE channel (detectors that fire on shuffle/act-swap, feeding weightedIssues),
and make the density NORMALIZER padding-robust (scene-based) — so the absolute
health level stops rewarding filler while the rules still catch structural
damage. That is a re-architecture of how health is composed, gated by the full
ratchet set, and should be planned as its own project — NOT a re-lock wave.

Until then, the `empty_verbosity` metamorphic case remains the standing witness
(documented HOLD in VERBOSITY_BIAS_2026-07-11.md).
