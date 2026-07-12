# Health-scalar saturation — the shared root cause (2026-07-11B, real-harness proof)

Three separate heavy waves — arc→health graduation, verbosity-bias fix, and the
composite min-gap guard — all fail for the **same** reason, now proven on the
real gate rather than argued analytically.

## The mechanism

`health = 100 − densityPenalty − scarcityPenalty`. The sub-1.0-density branch is
a logistic `SUB_DENSITY_SCALE / (1 + e^(−STEEPNESS·(density − 0.52)))` with
SCALE=10, STEEPNESS=50. It **hard-saturates at 10 points** for any density ≳ 0.65.
So every fixture with density ≥ ~0.65 gets densityPenalty = 10.0 exactly →
health = 100 − 10 − 20(scarcity) = **70.0**. Measured: composite-bad (density
0.70), escalation-bad (0.75), setup-bad (0.64) all land at exactly 70.0. The
scalar is blind to differences among "bad-enough" scripts.

## The re-tune is viable on paper but breaks the real ratchet

De-saturating the logistic (raise SCALE, lower STEEPNESS) was simulated
analytically across the full corpus + calibration + discrimination sets (health
is exactly 100 − densityPenalty − scarcity for these, so simulation is exact for
that formula). Best operating point **SCALE=18, STEEPNESS=35**:

- composite gap **5.27 ≥ 5.0** ✓ (closes the min-gap)
- all 6 discrimination pairs still correctly ordered ✓
- calibration band monotonicity preserved (strong<competent<weak<troubled) ✓
- produced-anchor min health 80.8 ≥ 80 ✓

Applied to the real doctor and run through the authoritative harness:

- **shuffle-drop AUC-24 fell 0.672 → 0.617, BELOW the 0.622 hard floor.** ✗
- act-swap AUC 0.480 → 0.472. ✗

Reverted (doctor.ts byte-identical to repo). The composite gap needs SCALE ≥ 18
to reach ≥5.0, and that is exactly where the shuffle floor breaks — there is **no
sub-density operating point that satisfies both**.

## Conclusion: it is a re-architecture, not a re-tune

The structural-degradation signal (shuffle-drop AUC, a hard ratchet) and the
quality-leveling signal (how far "bad" scripts sink) are **entangled in the one
saturating sub-density scalar**. Any change that de-saturates leveling (to close
the composite gap, de-pile the bads, or admit the arc/verbosity signals) costs
structural-discrimination AUC, and vice-versa.

The real fix decouples them:
- **Structural degradation** stays/moves fully into the RULE channel — detectors
  that fire on shuffle/act-swap damage and feed weightedIssues — so the AUC does
  not depend on the shape of the leveling curve.
- The **health normalizer** is then free to be re-shaped (de-saturated,
  padding-robust) for honest quality leveling without touching structural AUC.

This is a deliberate re-architecture gated by the full ratchet set (shuffle AUC
≥0.622, act-swap, 6/6 discrimination, 20-band monotonicity, produced-anchor ≥80,
metamorphic invariances) with a 71-corpus + 20-calibration manifest re-lock. It
is its own project, not a wave — and it is the single change that would unblock
arc-graduation, the verbosity fix, and the composite min-gap simultaneously.
Supersedes the narrower notes in DENSITY_RECAL_FINDING and COMPOSITE_MINGAP_FINDING.
