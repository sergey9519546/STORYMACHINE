# Verbosity-bias fix — investigation & disposition (2026-07-11B)

**Decision: HOLD as a documented defect. The fix requires a full from-scratch
re-calibration of the density regime — no zero-regression surgical patch exists.
Proven three ways by measurement below.** Keep the `empty_verbosity` metamorphic
case as the standing regression witness.

## The bias (confirmed, exact)

`health = 100 − densityPenalty − scarcityPenalty`, where
`densityPenalty` uses `density = weightedIssues / wordCount^0.7`.
Appending stateless filler ("The wind continues. Nothing else happens. Time
passes without event.") to each scene adds words but no issues and no scenes,
so density falls, penalty falls, health **rises**.

- base.fountain health **66.4 → 72.4 = +6.0** (metamorphic epsilon is 0.5 → FAIL).
- scarcityPenalty (140/sceneCount) is unchanged (scene count constant), so the
  entire bias flows through the word denominator.

## Why every surgical (zero-regression) lever is ruled out

1. **Anti-slop penalty** — dead. The filler does **not** fire anti-slop
   (padded slopScore 0.000, 0 detections), so an anti-slop-weighted penalty
   would not touch the padded case. Separately, anti-slop is **not** zero-FP on
   produced work (3/72 corpus scripts fire: Meet the Robinsons, Elemental,
   Toy Story 3), so using it as a penalty would itself shift exact-health.

2. **Words-per-scene cap on the opportunity denominator** — mathematically
   impossible to separate. For the test to flip, the cap must be ≤ base's rate
   (**28 wps**). But:
   - calibration(20) wps = 27–34 (controlled-richness band),
   - produced corpus(71) wps = 51–1485 (median 193).
   A cap ≤ 28 caps almost every calibration sample (breaks band monotonicity)
   and every corpus script (raises their density → lowers health → the
   high-wps scripts, e.g. Despicable_Me at 1485 wps, break the produced-anchor
   ≥80). The padding operates in a wps band (28→38) that lies **inside** the
   calibration band and **below** the corpus, so no global cap separates it.

3. **Global exponent/power change** — reintroduces the measured confound the
   calibration corpus header explicitly warns against; touches all 71 exact +
   20 calibration + 6 discrimination + shuffle AUC. Not a patch — a full
   re-derivation.

## Correct fix (deferred to a dedicated wave)

A from-scratch re-calibration that adds a **length-independent absolute
issue-count term** to the penalty (so padding cannot dilute the signal),
re-deriving the calibration bands and re-locking the 71-script manifest, gated
by: `empty_verbosity` flips to PASS **and** 6/6 discrimination holds **and**
20-sample band monotonicity holds **and** shuffle-drop AUC ≥ 0.622 **and** all
71 produced scripts stay ≥ 80. This is a controlled-richness re-calibration
exercise, not an incremental patch, and should be run as its own wave.
