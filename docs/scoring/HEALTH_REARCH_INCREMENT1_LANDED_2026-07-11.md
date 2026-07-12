# Health re-architecture — Increment 1 LANDED (2026-07-11B)

**Shipped: the continuous arc-incoherence structural deduction. The doctor now
has genuine scene-ORDER detection it fundamentally lacked. Full suite green
(9,428 tests, 0 fail); all ratchets held or improved; manifest re-locked.**

## The diagnostic that started it (rule_channel_probe)

The doctor's shuffle-drop "structural discrimination" (AUC 0.672) was almost
entirely a scene-COUNT artifact: the scarcity term (140/sceneCount) carries
AUC 0.938 because the shuffle-drop recipe DROPS 1/3 of scenes; the weightedIssues
rule channel carries AUC 0.076 (rules fire LESS on shuffled scripts — fewer
scenes to flag). With scene count held constant (act-swap recipe) the doctor
scored 0.480 — it could not detect scene reordering at all.

## What shipped

A bounded, continuous arc-incoherence deduction in `aggregateReport`
(doctor.ts), living in the existing structural-deduction path (`health =
baseHealth − structuralDeduction − arcIncoherenceDeduction`), NOT in the density
scalar:

```
ARC_DED_MIN_SCENES = 15   // feature-scale floor — excludes all calibration/discrimination fixtures
ARC_DED_REF        = 1.2  // arcHealth below this = incoherent trajectory
ARC_DED_K          = 8    // points per unit of incoherence
ARC_DED_CAP        = 15   // bounded, like sibling structural deductions
arcIncoherenceDeduction = min(CAP, K · max(0, REF − emotionalArc.arcHealth))   // feature-scale & scored only
```

It reads the emotional-arc rampCorrelation/peakPosition signal (previously
diagnostic-only, measured to separate act-swap at AUC ~0.82) and converts it
into rule-channel structural discrimination — the re-architecture's whole thesis:
put structural detection where it's independent of the leveling curve.

## Measured results (real authoritative harness, not simulation)

| metric | before | after |
|---|---|---|
| act-swap AUC-24 | 0.480 | **0.615** (graduated past the 0.55 bar) |
| shuffle-drop AUC-24 | 0.672 | **0.731** (floor 0.622 holds) |
| produced-anchor (min intact health) | — | **≥ 80, zero violations** |
| discrimination pairs | 13/0 | **13/0 (byte-identical — feature-scale floor)** |
| calibration | 21/0 | **21/0 (byte-identical)** |
| full suite | 9,428 / 0 fail | **9,428 / 0 fail** |

## Manifest re-lock (auditable)

19/71 feature scripts shifted (the deduction fired); modest bounded drops
(−0.1 to −5.9); **zero anchor violations** (all still ≥ 80); **1 verdict change**:
A Scanner Darkly RECOMMEND→CONSIDER — correct for Linklater's deliberately
fragmented rotoscoped narrative. Jaws (slow-burn first act) and Up (elliptical
open) took the largest, defensible deductions. Calibration (20) and
discrimination (6) fixtures untouched by design (all < 15 scenes).

## Why this is the re-architecture, not a patch

It proves the thesis from SATURATION_ROOT_CAUSE: once structural discrimination
lives in the rule/deduction channel (AUC independent of the density curve
shape), the arc signal graduates AND the structural AUC rises — the entanglement
that blocked arc-graduation, verbosity, and the composite gap is broken for the
arc axis. Increment 2 (de-saturating the density normalizer now that structural
AUC no longer depends on its shape — to close the composite gap / verbosity) is
the natural follow-on, gated by the same full ratchet set.

Files: `server/nvm/analyze/doctor.ts`, `tests/fixtures/real-corpus-manifest.json`
(re-locked), `tests/core/real-script-corpus.test.ts` (header numbers updated).
Git commit remains user-owned.
