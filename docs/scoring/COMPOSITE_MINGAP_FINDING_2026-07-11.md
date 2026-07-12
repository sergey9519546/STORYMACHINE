# Composite min-gap wave — finding (2026-07-11B)

**Outcome: the composite-reviewer min-gap (+2.2, wants ≥5.0) CANNOT be closed by
adding a defect rule. `composite-bad` is penalty-saturated at health 70.0.
The gap needs an EXCELLENCE lever on `composite-good`, or a non-saturating
health-scale change — not another defect detector.**

## What was tried (and why it looked promising)

An `ON_THE_NOSE_MOTIVE` defect signal: characters narrating their own guilt/
motive aloud in dialogue ("I still feel so guilty", "I only did it because I
was desperate", "this is really bringing back memories of…"). Measure-before-
threshold on the authoritative corpus + all 6 discrimination pairs (tightened
5-pattern set):

- composite-reviewer bad: **5 hits**, good: 0
- dramatized-vs-told bad: 1 hit, good: 0
- other 4 pairs: 0/0 (no interference)
- **71 produced corpus: 0/72 false positives** (standalone probe)

A genuinely clean, principled, near-zero-FP on-the-nose detector — exactly the
kind of Wave v2 detector the discrimination test invites.

## Why it does not close the gap

Wired as a `major` defect rule in `belief.ts` and re-measured through the real
doctor:

- subtext-bad 77.7 → 75.4, dramatized-bad moved — the rule DOES lower less-
  saturated scripts.
- **composite-bad stayed exactly 70.0** — unchanged. So did escalation-bad and
  setup-bad (both already 70.0). Three "bad" fixtures sit at exactly 70.0:
  they are in the **saturated region of the density penalty curve**, where
  adding 5–7 more weighted issues moves health by ~0. The health scalar has
  bottomed out for these scripts.

Consequence: no defect rule, however well-targeted, can widen the composite gap,
because the "bad" side is already at its penalty floor. Confirmed and reverted
(belief.ts restored byte-identical; repo never touched).

Secondary caution discovered: the in-pipeline dialogue parse fires slightly
differently from the standalone probe (subtext-bad moved despite 0 probe hits),
so any future in-pipeline lexical rule must be validated for corpus exact-health
impact through the REAL doctor, not a standalone probe.

## The real path (deferred, correctly scoped)

Close the composite gap by RAISING `composite-good` via an earned-strengths
(excellence) signal that the good script exhibits and the bad one lacks
(active-protagonist agency, paid-off setup, withheld/ironic ending) AND that is
wired into the health/earned-strengths surface — OR revisit the density-curve
saturation so heavily-flagged scripts are not all compressed onto ~70.0 (which
is the same "structural-discrimination lives in a saturating scalar" limitation
documented in DENSITY_RECAL_FINDING_2026-07-11.md). Until then the
`composite-reviewer-scenario` min-gap stays a `todo` (ordering already passes as
a hard assertion).
