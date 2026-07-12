# Experiment Report — Emotional-Arc + Anti-Slop prototypes (2026-07-11)

Measurement-first execution of ROADMAP §8 waves EA + AS. All deterministic, no
LLM, on the 45-film real corpus (reconstructed Fountain, rights-safe). Prototypes
are throwaway (Python, `/tmp`); nothing shipped to the engine yet.

## EA — Emotional-arc signal → GO (with calibration work)
Per-scene VAD (compact lexicon) + structural tension → position-aware arc-shape
features (ramp-correlation, peak position, resolution drop) → `arc_health`.
Degraded twins via the engine's own recipes; AUC = fraction of real>degraded pairs.

| Metric | Arc signal | Current engine | Read |
|---|---|---|---|
| **act-swap all-pairs AUC** | **0.642** | **≈0.48 (chance)** | **the blind spot cracks** |
| shuffle-drop all-pairs AUC | 0.585 | 0.672 | engine already stronger here |
| mean arc_health real vs act-swapped | 1.40 vs 1.17 (Δ+0.22) | — | populations separate |

**Verdict: GO.** A position-aware arc signal beats chance on act-swap (§5.1, the
#1 open gap) — with only a hand-built lexicon. **Honest caveats:** matched
per-script win-rate is ~0.48 (this is a population-level "well-shaped arc" signal,
not a per-script tamper detector); tiny lexicon; reconstructed scripts; no
hold-out. **Next:** port to `fountain-analyzer.ts` as a signal channel using a
real VAD lexicon (NRC-VAD), calibrate features on the corpus, re-measure act-swap
AUC with the real doctor; ship only if it holds and the 0.622/6-of-6 ratchets
don't regress.

## AS-1 — Anti-slop detectors → PARTIAL GO
| Detector | Real films | Synthetic slop | Verdict |
|---|---|---|---|
| **generic-emotion** ("weight settled", "heart pounded"…) | 0.04 / film | 9 in a 6-line passage | **ADOPT** — clean discrimination |
| negated-cliché ("not X, but Y") | 5.7 / film | 6 in passage | CONDITIONAL — needs a "justified" guard; screenplays use it legitimately |
| bigram-freshness | 0.638 | 0.891 (higher!) | DROP as-is — short varied text scores fresher; misleading at scene scale |

**Verdict: adopt generic-emotion (heuristic `pattern_to_watch` tier); guard
negated-cliché before use; reformulate freshness with length normalization or drop.**

## AS-2 — Verbosity-bias fix → mechanism confirmed, fix specified
Confirmed analytically with the doctor's exact density formula
(`penalty = 2.5·(weighted/words^0.7)^3.75`): holding weighted issues constant,
adding filler words lowers density → lowers penalty → RAISES health (the Phase-B
`empty_verbosity` +6). **Fix (minimal, calibration-safe):** count stateless /
no-state-change action lines as issues, so padding adds weightedIssues in
proportion to added words and cancels the density dilution (preferred over
floor-the-denominator, which perturbs every score). **Gate:** prototype the fix,
confirm `evals/scoring` `empty_verbosity` flips FAIL→PASS AND no regression to
calibration / 6-of-6 discrimination / 0.622 AUC, before touching `doctor.ts`.

## Net decisions
- **EA:** proceed to real-lexicon integration + doctor-level AUC re-measure (highest value).
- **AS:** ship generic-emotion detector; guard/drop the other two; prototype the verbosity fix behind the metamorphic gate.
- Nothing shipped to the engine this pass — these are the measurements the waves are gated on.

---

## Arc→health blend gate (measured 2026-07-11, `arc_wire_gate.ts`)
Blending `health + w·arcHealth·20` through the REAL doctor on the 44-film corpus:
| w | act-swap AUC | shuffle-drop AUC |
|---|---|---|
| 0.00 (health only) | 0.506 | 0.741 |
| 0.25 | 0.615 | 0.704 |
| **0.50** | **0.659** | **0.679** |
| 1.00 | 0.670 | 0.626 |
| 2.00 | 0.660 | 0.574 (breaches 0.622) |

**Decision: GO at w≈0.5** — act-swap +0.15 (the blind spot), shuffle-drop stays
above the floor. **BUT NOT WIRED YET (gated):** this corpus is the reconstructed
Fountain set with local degradation recipes; its shuffle baseline (0.741) differs
from the engine's env-gated harness (0.672). The DEFINITIVE gate is the engine's
own `REAL_SCRIPT_CORPUS_DIR` AUC harness + re-locking the 20-sample calibration
corpus + discrimination manifest (changing `health` shifts every exact-health
assertion). That re-calibration is a dedicated wave — wiring blind would break
the green suite and can't verify the real 0.622 floor from here. Weight to use
when that wave runs: w≈0.5.
