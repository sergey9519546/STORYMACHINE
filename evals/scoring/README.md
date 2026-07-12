# evals/scoring — Phase B benchmark harness

Makes every future scorer change measurable against the frozen baseline
(`docs/scoring/BASELINE_2026-07-11.md`). Built on the runnable engine surface
(`runScriptDoctor`); the candidate-transition eval form is deferred to Phase C+.

## What's here
- `contracts/` — `MetamorphicCase`, `HumanPreferenceLabel`, `MetamorphicResult`.
- `metamorphic/base.fountain` — an original 9-scene synthetic script (committable, no rights issue).
- `runner/run-metamorphic.ts` — applies known-direction transforms, asserts the score MOVES correctly.
- `golden/` — locked baselines (metamorphic + produced-anchor).
- `human/HUMAN_LABELING_TASK.md` — the blinded-pairwise protocol that unblocks calibration (Phase G).

## Run
```
node --experimental-strip-types evals/scoring/runner/run-metamorphic.ts
```
(Requires dev deps; run off-OneDrive per EXECUTION_PLAN F0.)

## Why metamorphic first
No human labels exist yet, so absolute-score benchmarks aren't possible. But the
DIRECTION a score must move under a transform IS known (§14): scene shuffle must
lower structural health; empty verbosity must not raise it; a rename must not
change it. These catch bias and structure-blindness deterministically, today.

## Categories still to build (need inputs)
- `golden/` human-preferred pairs — needs `human/` labels.
- `hard-gates/` legality fixtures — target the proof kernel (Phase C), not the doctor.
- `calibration/`, `ranking/` — need labels + the pairwise ranker (Phases G–H).
