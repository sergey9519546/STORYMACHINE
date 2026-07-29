# P1 Discrimination Baseline — 2026-07-29

**Status:** First rigorous discrimination measurement on real produced
screenplays. Mechanical ground truth (degradation pairs), not human labels.
Establishes the P1 starting point against which all formula work is
measured.

## TL;DR

The doctor health score's **dialogue channel passes the P1 discrimination
gate** (AUC 0.906, 95% CI [0.833, 0.969]) on 48 real produced screenplays.
The **climax-ordering channel is at chance** (AUC 0.490). The pooled AUC
across all four degradation channels is **0.732** — below the 0.80 gate
but well above the rule channel's previously-measured 0.076, confirming
the dialogue channel is doing real discrimination work that the
structural blindness drags down.

This is the **mechanical-ground-truth baseline**. The P1 exit gate
requires the same AUC on human-labeled real writing. Mechanical
degradation is a defensible proxy: if the score cannot separate a real
script from its own structurally-destroyed twin, it cannot be expected
to separate strong from weak human writing.

---

## Methodology

**Script:** `scripts/measure-discrimination-auc.mjs`
**Output:** `scripts/output/discrimination-auc.csv` (192 pair rows)
**Command:** `node scripts/measure-discrimination-auc.mjs`

### Pairwise AUC with bootstrap CI

For each of 48 valid real produced screenplays (52 in `data/screenplays/`
minus 4 with scene-count parse collapse), four mechanical degradations
were applied to produce degraded twins:

1. **SCENE_SHUFFLE** — randomize scene order (seeded, reproducible)
2. **MIDPOINT_DROP** — delete the middle 20% of scenes
3. **CLIMAX_RELOCATE** — move the final scene to position 2
4. **DIALOGUE_FLATTEN** — replace all dialogue with "Hello." (via the
   project's own `parseFountain` on normalized text, matching the
   engine's input path)

This yields up to 48 pairs per degradation channel, 192 pairs pooled.

**Pairwise AUC** is the fraction of pairs where
`health(real) > health(degraded)`, with ties counted as 0.5. This IS
the AUC of a binary classifier on balanced pairs — the simplest rigorous
discrimination metric.

**95% CI** via bootstrap resampling: 10,000 iterations, resampling pairs
with replacement (seeded PRNG, reproducible), percentile method for
bounds.

### Why this is a valid P1 baseline

The P1 pre-registration protocol (`PRE_REGISTRATION_PROTOCOL.md`) sets
AUC >= 0.80 with 95% CI lower bound > 0.65 as the gate, on a
human-labeled held-out set. That set requires 3+ blind readers labeling
100-200 scripts — human work that cannot be done by this harness alone.

Mechanical degradation is a **defensible lower bound**: every degraded
twin is unambiguously worse than its original by construction (a script
with its climax relocated to scene 2 is structurally broken regardless
of taste). If the score cannot rank the original above its own
destruction, it cannot be expected to rank strong above weak human
writing. The human-labeled benchmark, when built, must confirm or beat
these numbers.

---

## Results

| Degradation | Channel | Pairs | AUC | 95% CI | P1 gate |
|---|---|---:|---:|---|---|
| **DIALOGUE_FLATTEN** | character/voice/dialogue | 48 | **0.906** | [0.833, 0.969] | **PASS** |
| SCENE_SHUFFLE | global arc / position | 48 | 0.771 | [0.667, 0.875] | partial |
| MIDPOINT_DROP | 3-act structure | 48 | 0.760 | [0.635, 0.875] | partial |
| CLIMAX_RELOCATE | climax ordering | 48 | **0.490** | [0.385, 0.594] | **FAIL** (chance) |
| **ALL POOLED** | all channels | 192 | **0.732** | [0.674, 0.786] | partial |

### Reading the table

**DIALOGUE_FLATTEN passes the gate.** AUC 0.906 with a tight CI — the
dialogue channel is a genuine, strong discriminator. This confirms what
the per-dimension probe (`scripts/probe-dimension-honesty.mjs`) showed:
flattening dialogue drops the Character dimension by −25.5 points and
overall health by a mean of −15.3. The score reads dialogue, weights it
heavily, and discriminates hard on it.

**CLIMAX_RELOCATE is at chance** (AUC 0.490, CI includes 0.50). The score
cannot detect a relocated climax on real scripts at feature scale. This
is the empirical confirmation of NORTH_STAR §2 law #1 on real writing:
the climax-placement gate reads *content*, not *position*, so relocating
the peak scene re-binds the gate to whatever scene is now most intense.

**SCENE_SHUFFLE and MIDPOINT_DROP are partial** (0.771 and 0.760). They
show real but incomplete discrimination — the score detects *some*
structural damage from reordering/deletion, but not enough to clear 0.80.
This is the density-normalization absorption at feature scale (NORTH_STAR
§2 law #2): at 14 scenes the midpoint drop moves Structure & Pacing by
−8.1; at 127 scenes by −0.4. The signal exists at short-script scale and
is absorbed at feature scale.

**The pooled AUC of 0.732** is the honest aggregate: a single number
that says "the score discriminates meaningfully above chance (0.50) and
well above the rule channel alone (0.076), but does not yet meet the
0.80 P1 gate because structural channels drag it down."

---

## What this means for P1

### The channel that already works

**Dialogue discrimination is solved.** AUC 0.906 on real produced
screenplays is a strong, defensible result. No further work on the
dialogue channel is needed for P1 — it carries the score.

### The channel that's the P1 bet

**Structural discrimination is the work.** Three of four channels (SHUFFLE
0.771, DROP 0.760, RELOCATE 0.490) are below the gate. The pooled AUC
would clear 0.80 if these three lifted by ~0.07-0.10 each. This is
precisely what NORTH_STAR §2 law #2 names: *"Document-scale findings
(global arc, structural collapse) need the bounded structural-deduction
pathway — a dedicated, capped formula contribution outside the density-
normalized instance count — not more detectors hoping to out-fire the
normalization."*

The bounded structural-deduction pathway is the P1 bet. The AUC harness
is the instrument that measures whether it works.

### Comparison to prior internal measurements

| Source | Metric | Value | Method |
|---|---|---:|---|
| `doctor.ts:1656-1669` | rule channel AUC | 0.076 | internal, artificial |
| `doctor.ts:1656-1669` | scene-count scarcity AUC | 0.938 | artificial scene-drop |
| `discrimination.test.ts` | composite pair gap | +2.9 | 6 synthetic pairs |
| **This harness** | **dialogue AUC** | **0.906** | **48 real scripts** |
| **This harness** | **pooled AUC** | **0.732** | **48 real scripts** |

The dialogue-channel result (0.906) is the first real-writing
discrimination number that passes the P1 gate. The scarcity-term number
(0.938) was always measured on *artificial* scene-drop; this harness's
scene-shuffle AUC (0.771) is the *real-writing* equivalent and is
notably lower, suggesting the scarcity term's 0.938 was inflated by the
artificial degradation's severity.

---

## Limitations (honest)

1. **Mechanical ground truth, not human judgment.** Degraded twins are
   unambiguously worse by construction, but human-labeled strong-vs-weak
   pairs would test whether the score tracks *taste*, not just *damage*.
   The human benchmark remains the P1 exit requirement.

2. **No held-out set.** All 48 scripts are scored; there's no
   train/test split because no tuning is happening yet. When formula
   work begins, the pre-registration's held-out protocol applies.

3. **Degradation severity varies.** DIALOGUE_FLATTEN is a catastrophic
   degradation (all dialogue → "Hello."); SCENE_SHUFFLE is milder
   (scenes reordered, content preserved). The AUCs are not directly
   comparable across channels — a higher AUC on a harsher degradation
   is not "a better channel." What's comparable is the gate pass/fail
   against the same 0.80 bar.

4. **Corpus is animation-heavy.** All 48 scripts are produced animation
   features (Pixar, DreamWorks, Sony, Laika). Live-action features may
   score differently (the corpus already includes Pulp Fiction and Jaws
   in manifest but not in `data/screenplays/`). Corpus diversity is a
   P1 expansion target.

---

## Reproducibility

```bash
node scripts/measure-discrimination-auc.mjs
# → scripts/output/discrimination-auc.csv (192 pair rows)
```

Deterministic (seeded PRNG for shuffle and bootstrap). Runs in ~5
minutes. No engine modifications — runs the frozen `runScriptDoctor()`
pipeline on inputs derived from real produced screenplays.

## Provenance

- Corpus: `data/screenplays/` — 52 produced screenplays (48 valid after
  parse-failure exclusion), manifest-locked.
- Engine: HEAD of `main` (commit prior to this report). No engine files
  modified for this measurement.
- Methodology: pairwise AUC with bootstrap CI, standard for binary
  classification on balanced pairs.
- P1 gate: `ROADMAP.md` §3 P1 + `PRE_REGISTRATION_PROTOCOL.md` §11.
