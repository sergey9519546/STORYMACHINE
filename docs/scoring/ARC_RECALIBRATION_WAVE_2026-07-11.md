# Re-calibration wave — emotional-arc → health (2026-07-11)

**Decision: HOLD the wire. Keep the emotional-arc signal diagnostic-only.**
The signal is real but sub-ratchet; wiring it into `health` this wave would
regress the scale and/or the produced-floor. Recorded here as the graduation
gate for a future, stronger position-aware detector.

## Authoritative baseline (env-gated 71-script corpus, current doctor)

Harness: `tests/core/real-script-corpus.test.ts` with
`REAL_SCRIPT_CORPUS_DIR` = `STORYMACHINE V1 REPO/real-script-corpus`.

- Suite: **75 tests, 73 pass, 0 fail, 2 todo** — green.
- All 71 scripts **exact-health match** the committed manifest (doctor stable).
- **Shuffle-drop AUC-24 = 0.672** (hard ratchet floor 0.622 — holds).
- **Act-swap AUC-24 = 0.480** (todo-only; graduation bar 0.55).

## What the measurement established (measure-before-threshold)

Standalone arc-signal separation on the authoritative corpus (61 scripts ≥6
scenes; AUC over the 24-script subset):

| signal | AUC vs act-swap | AUC vs shuffle-drop |
|---|---|---|
| `rampCorrelation` (tension should rise) | **0.823** | 0.552 |
| `peakPosition` (climax should sit late) | 0.754 | 0.535 |
| `arcHealth` (composite) | 0.804 | 0.613 |
| `reaganFit` (archetype fit) | 0.465 | 0.575 |
| current `health` (reference) | 0.467 | 0.734 |

Findings:
1. The arc signal genuinely **sees act-swap damage** (0.80–0.82) that the
   entire current doctor is blind to (0.467) — act-swap preserves every local
   adjacency, so only a global position-aware signal can catch it.
2. **Archetype-agnostic gating fails**: `reaganFit` does *not* separate
   act-swap (0.465). Swapped arcs still fit *some* archetype. The separating
   information is strictly **position-aware** (climax placement + rising ramp).
3. The signal is **continuous with heavy intact/swap overlap**, not a clean
   gate. Zero-intact-FP thresholds:
   - single `rampCorrelation < intactMin`: fires 2/61 swap.
   - single `arcHealth < intactMin`: fires 5/61 swap, 3/61 shuffle.
   - best **conjunction** with **0** intact FP: *does not exist* on this corpus.
   - best `≤1`-intact-FP conjunction (`peakPos<0.56 ∧ rampCorr<-0.18`): fires
     13/61 swap, 7/61 shuffle — **but flags 1 produced feature** (produced-floor
     violation).
4. Continuous additive blend `health' = clamp(health + w·arcHealth)`:
   - w=0.75: act-swap 0.538, shuffle 0.736, 0 clamped.
   - w=1.0: act-swap 0.542, shuffle 0.733, 2 clamped at 100.
   - w=1.5: act-swap 0.545, shuffle 0.727, **14 clamped at 100**.
   - Reaches the 0.55 bar only by saturating a quarter of the corpus at
     health=100 (scale damage) and requires a full 71-entry manifest re-lock.

## Why HOLD is the correct call

- No path to a **material** act-swap AUC lift is **zero-regression**: every
  option either flags a produced feature, saturates the health scale, or lands
  the AUC right on the 0.55 "flapping" boundary the test author explicitly
  warned against (test header, act-swap section).
- Every ratchet currently holds. Wiring blind would trade a real ratchet
  (scale integrity + produced-floor) for a fragile sub-ratchet.

## Graduation gate (what unlocks the wire)

Wire arc into `health` only when a position-aware **climax-placement**
extractor achieves a **zero-intact-FP gate that fires on ≥12/61 swapped
scripts**, OR a continuous arc score reaching **act-swap AUC ≥ 0.55 without
health saturation** (no intact script clamped at 100) — re-measured on this
same authoritative corpus, then re-locking the manifest and re-running the
full gate (shuffle ≥0.622, 6/6 discrimination, 71 exact, anchor ≥80, suite
green).

Next build direction: replace the single-peak `peakPosition` with a smoothed
multi-window tension-centroid + a monotonic-rise test over act-thirds, which
should sharpen the intact/swap boundary enough for a zero-FP gate.
