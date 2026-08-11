# P1 Continuation Brief — 2026-08-11

**Purpose:** update the structural-signal recommendation with the
falsification-screen evidence, name the hard blocker, and hand the next
step to whoever has the real corpus. Read alongside
`STRUCTURAL_SIGNAL_DIAGNOSIS_2026-07-29.md` (the root-cause diagnosis)
and `DISCRIMINATION_BASELINE_2026-07-29.md` (the gate numbers).

## Where the gate stands

| Channel | Current AUC | Gate | Status |
|---|---|---|---|
| Pooled | 0.754 | ≥ 0.80 | below |
| SCENE_SHUFFLE | 0.73 | ≥ 0.80 | below |
| SCENE_DROP | 0.77 | ≥ 0.80 | below |
| CLIMAX_RELOCATE | 0.52 | ≥ 0.70 | **at chance** |
| Composite min-gap | +2.9 | ≥ 5.0 | below |

## What the diagnosis got right, and what it got wrong

`STRUCTURAL_SIGNAL_DIAGNOSIS_2026-07-29.md` correctly identified the
root cause: every field in `ScreenplaySceneRecord` is per-scene content-
derived, so reordering preserves all fields, and no formula on them can
detect CLIMAX_RELOCATE. That finding holds and has been confirmed three
ways. It also correctly killed the formula-tuning path: `arcIncoherence
Deduction` fires backwards, `reaganFitDeduction` measured worse, the
climax-zone deduction was reverted. **Do not retry these.**

The diagnosis's *recommendation* — implement candidate #1, scene-to-
scene intensity delta — was written before the falsification screen ran.
The screen (`scripts/output/probe-interscene-candidates.json`, n=26)
showed candidate #1 is **weak to dead**:

| Candidate | SHUFFLE | DROP | RELOCATE | Verdict |
|---|---|---|---|---|
| 1_intensityDelta_meanAbsDelta | 0.577 | 0.596 | 0.462 | weak |
| 1_intensityDelta_variance | 0.442 | 0.442 | 0.442 | **dead (wrong direction)** |
| 1_intensityDelta_monotoneRuns | 0.596 | 0.288 | 0.558 | weak/dead |
| 2_forwardReference_count | 0.462 | 0.404 | 0.519 | dead |
| 2_forwardReference_density | 0.462 | 0.500 | 0.519 | dead |
| **3_emotionalShift_sameRuns** | 0.577 | **0.981** | 0.558 | **promising** |
| **3_emotionalShift_sameRunsRate** | 0.577 | 0.750 | 0.558 | **promising** |
| **3_emotionalShift_entropy** | **0.615** | 0.750 | **0.615** | **promising (broadest)** |
| 4_setupBeforePayoff_inversions | 0.500 | 0.500 | 0.500 | dead |
| 5_questionLatency_* | 0.563 | 0.500 | 0.625 | weak |

**The one candidate worth carrying forward is `3_emotionalShift_entropy`**
(candidate #3 in the diagnosis, "local-context emotional shift"). It is
the only signal that lifts *all three* degradations above 0.60 on the
screen — including CLIMAX_RELOCATE at 0.615 (vs the engine's current
0.52 and the gate's 0.70). It is the diagnosis's #3 pick, not its #1.

## The hard blocker

The screen ran on **n=26** (the 20 calibration samples + 6 CC0 scripts)
because that is all this container holds. The 761-script corpus the
gate is measured on is **not in this environment** — `data/screenplays/`
has 20 `.fountain` files; the split (`scripts/output/corpus-split.json`)
references 761, and its first entry (`crawl/action/the-avengers.fountain`)
does not exist on disk. The corpus is local-only (copyright, gitignored
per `AGENTS.md`).

**No engine change made from this environment can be validated to gate
standards.** Shipping one anyway is exactly the overfitting/p-hacking
risk the pre-registration protocol (§10) and the diagnosis both warn
against. So this brief does not implement a deduction. It points at the
one validation step that can only run where the corpus lives.

## The next step (requires the real corpus)

1. **Re-run the falsification screen at full corpus scale.**
   `scripts/probe-interscene-candidates.mjs` already computes all five
   candidate families; it samples 30 from `corpus-split.json`'s train
   split. Point it at the full train split (n=456) and the three
   degradations. The JSON shape is already machine-readable.

2. **Decision rule (pre-registered, do not relax mid-run):**
   - If `3_emotionalShift_entropy` lifts **CLIMAX_RELOCATE ≥ 0.65 on the
     val split (n=152)** AND does not regress SHUFFLE/DROP below their
     current 0.73/0.77 → implement it as a bounded shadow field in the
     analyzer + a capped structural deduction (mirroring the
     arc/dialogue deduction shape: feature-scale floor, bounded cap).
   - Then evaluate **once** on the test split (n=153). If RELOCATE ≥ 0.70
     and pooled ≥ 0.80 → wire it, lock the manifest, ship.
   - If the val signal does not hold at n=152, the screen's n=26 promise
     was small-sample noise. Do not tune constants to rescue it — that
     is the failure mode the diagnosis exists to prevent.

3. **What "implement" looks like** (only after step 2 clears): a new
   inter-scene field on the analysis pipeline — the entropy of
   scene-to-scene emotional-shift run-lengths, computed relative to a
   rolling local window (not absolute VAD, which the diagnosis showed is
   order-preserving). Wired as a bounded deduction with a feature-scale
   floor (≥15 scenes) so the calibration/discrimination fixtures stay
   byte-identical. This is analyzer-layer work, not formula tuning.

## What this session shipped (and deliberately did not)

- **Shipped to main (`5cfb54e`):** re-anchored `SCORING_ENGINE_AUDIT.md`
  — corrected 11 drifted citations, inventoried the four-channel
  deduction stack (the health formula is no longer just
  `100 − craftPenalty`), added the double-counting failure mode. Docs
  only, no engine code.
- **Did NOT ship:** an engine change for the structural gap. Reason: the
  corpus needed to validate it is not in this environment, and the
  diagnosis + pre-registration protocol both forbid shipping an
  unvalidated scoring change. The risk is not that it might fail — it's
  that it might appear to succeed on n=26 and then not generalize,
  which is the exact p-hacking trap the P1 protocol exists to prevent.
- **Did NOT ship:** the full Scoring Engine V2 rewrite (directive Phases
  C–I). Reason: NORTH_STAR "demand before rigor" (P0 at 0 valid sessions
  on `origin/main`) + the directive's own §3 ("build the benchmark
  before redesigning the scorer") both put it downstream of (a) P0
  clearing and (b) the P1 gate clearing. Building it now would be the
  project's documented central failure mode.

## Provenance

- Falsification data: `scripts/output/probe-interscene-candidates.json`
  (generated 2026-08-03, n=26)
- Root-cause diagnosis: `STRUCTURAL_SIGNAL_DIAGNOSIS_2026-07-29.md`
- Gate numbers: `DISCRIMINATION_BASELINE_2026-07-29.md`
- Pre-registration: `PRE_REGISTRATION_PROTOCOL.md` §10 (no test-set
  tuning, no post-hoc rationalizations)
- Corpus split: `scripts/output/corpus-split.json` (seed 42, 60/20/20,
  test hash-locked)
