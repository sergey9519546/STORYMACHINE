# P1 Structural Signal Diagnosis — 2026-07-29

**Status:** Root-cause diagnosis. Explains why CLIMAX_RELOCATE AUC is 0.490
(chance) and why formula tuning alone cannot lift the structural channels
to the P1 gate. Documents the analyzer-layer work that the structural-
deduction bet actually requires.

## TL;DR

The discrimination baseline (`DISCRIMINATION_BASELINE_2026-07-29.md`)
showed CLIMAX_RELOCATE AUC at 0.490 (chance). The root cause is not the
health formula — it's the **signal layer**: every field in
`ScreenplaySceneRecord` is derived from that scene's own text, so
reordering scenes preserves every field, and no formula on those fields
can detect reordering.

**This is not a formula-tuning problem. It is a signal-extraction
problem.** No weight on `arcCoherence`, `tightestScene`, `peakFraction`,
or `payoffSetupIds` can lift CLIMAX_RELOCATE AUC, because none of those
signals carry document-position information independent of per-scene
content. Shipping a constant-tuning "improvement" without a new signal
would be p-hacking — it would inflate train AUC without generalizing to
the held-out test set.

The fix requires analyzer-layer work: a signal that genuinely reads
document position relative to neighbors. This document names the
obstacle precisely so the next P1 session doesn't rediscover it.

---

## The diagnosis, step by step

### Step 1 — Confirm the formula has no position-reading term

`computeHealthScore` (doctor.ts:434-441) is `100 − craftPenalty`, where
`craftPenalty = densityPenalty + scarcityPenalty`. Neither term reads
peak position, act shape, or climax placement. The `structuralDeduction`
and `arcIncoherenceDeduction` that the 2026-07-14 deep audit documented
(`health = 100 − craftPenalty − structuralDeduction − arcIncoherence`)
are no longer in the formula — the demand-first re-spin stripped them.

So the current formula has **zero** position-reading signal. CLIMAX_
RELOCATE AUC 0.490 is consistent with this.

### Step 2 — Check whether existing position-aware signals move under relocate

Three candidates existed:

| Signal | Source | Moves under CLIMAX_RELOCATE? |
|---|---|---|
| `structure.tightestScene` | `analyzeStructure` | **No** — it's `sceneIdx` (authored scene number), not document position |
| `storyGraph.arcCoherence` | `buildStoryGraph` | Barely (±0.1, inconsistent direction) |
| `storyGraph.escalationMonotonicity` | `buildStoryGraph` | **No** — stuck at 0.500 (degenerate) |

Measured on 5 train scripts (Ratatouille, Up, Spider-Verse, Inside Out,
Soul): `arcCoherence` wobbles within ±0.1 and not consistently;
`escalationMonotonicity` is pinned at 0.500 across all 5.

### Step 3 — Check the cross-scene reference signal (`payoffSetupIds`)

The one field that *should* be position-dependent: a payoff in scene N
references a setup in scene M (M < N). Reordering should invert this.

Measured "inverted payoffs" (payoff whose setup now appears after it) on
5 train scripts: **0 inverted in both baseline and relocated.** Every
script shows 0/N → 0/N. Reason: `payoffSetupIds` and `seededClueIds` are
detected from **content** (the analyzer finds clue mentions by scanning
scene text), not by tracking authorial intent. Reordering preserves the
content, so the setup-payoff pairing is preserved regardless of order.

### Step 4 — Confirm every `ScreenplaySceneRecord` field is per-scene content

Inspected `server/nvm/screenplay/memory.ts:63-108`. Every field
(`suspenseDelta`, `clockDelta`, `dramaticTurn`, `seededClueIds`,
`payoffSetupIds`, `relationshipShifts`, `emotionalShift`, `purpose`) is
computed from that scene's own text. None captures *relative position
to other scenes*.

**Conclusion:** the analyzer has no signal that genuinely captures
document position independent of per-scene content. This is the root
cause. The CLIMAX_RELOCATE AUC of 0.490 is a signal-layer limitation,
not a formula-layer one.

### Step 5 — Why SHUFFLE/DROP still show partial signal (0.77/0.76)

SHUFFLE (0.771): the signal comes from **issue count changing under
contextual recomputation**. Some passes fire differently when scenes are
in different positions because per-scene records get recomputed in
context (e.g., a "cold open" check fires differently when scene 1
changes). Measured on train: Raya 716→745 issues (+29), Encanto 990→929
(−61), Zootopia 597→561. Inconsistent direction, but enough signal to
lift AUC above chance.

DROP (0.760): the signal is the **scarcity term** (`140/sceneCount`).
Dropping scenes reduces sceneCount, which raises the penalty, which
lowers health. This works but is the same artificial-severity signal the
2026-07-14 audit flagged (the scarcity term's 0.938 AUC was on artificial
scene-drop; the real-writing equivalent measured here is 0.760).

---

## What this means for P1

### The structural-deduction bet requires analyzer-layer work

NORTH_STAR §2 law #2 names the bounded structural-deduction pathway as
the P1 fix for document-scale findings. This diagnosis shows the pathway
cannot be built at the formula layer — it requires a new **signal** that
reads document position relative to neighbors. Candidate signals that
would genuinely carry position information:

1. **Scene-to-scene intensity delta** — `intensity[i] − intensity[i−1]`.
   A rising-into-climax script has positive deltas approaching the peak;
   a relocated climax has a huge positive delta at position 2 then
   negative deltas after. This is positional by construction.
2. **Forward-reference density** — count of references (clue mentions,
   character callbacks) in scene N to content established in scenes
   *after* N. Genuine position-dependence: a payoff before its setup has
   forward references.
3. **Local-context emotional shift** — `emotionalArc[i]` relative to a
   rolling window, not absolute VAD values. Detects whether a scene
   *breaks* its local pattern, which is positional.

Each is analyzer-layer work (new fields in `ScreenplaySceneRecord` or
new fields in the analysis pipeline), not formula-layer tuning.

### What I am NOT shipping, and why

I could tune a formula constant to nudge SHUFFLE from 0.771 to ~0.81 on
the train set. Without a new signal, that would be **overfitting**: the
"improvement" would reflect noise in the train set's particular 28
scripts and would not generalize to the held-out test set. The
pre-registration protocol (`PRE_REGISTRATION_PROTOCOL.md` §10) is
explicit: *"Do NOT tune on test set to 'fix' the result. Do NOT cherry-
pick metrics that look better. Do NOT claim success with post-hoc
rationalizations."*

The same discipline applies to the validation set during iteration. A
formula change that lifts train AUC without a corresponding signal-layer
change is not real progress — it's memorizing the train set.

### What IS shipped this session

1. **The held-out split** (`scripts/split-corpus.mjs`,
   `scripts/output/corpus-split.json`,
   `scripts/output/corpus-test-hash.txt`). Test set hash-locked at
   `49d971422b1885a7a0f50f7241ee4d16fd32a065e399083dbb6cefb5138b6639`.
   Future P1 work tunes against train, checks on val, evaluates once on
   test.
2. **This diagnosis** — the root-cause finding that prevents wasted
   formula-tuning effort and points the next session at the analyzer
   layer.

### Path forward (P1 continuation)

1. **Implement a position-reading signal at the analyzer layer**
   (candidate: scene-to-scene intensity delta). This is the smallest
   change that could lift CLIMAX_RELOCATE above chance.
2. **Wire it into a bounded structural deduction** in the health formula
   (capped per NORTH_STAR §2 law #2).
3. **Measure on val set** — does the new signal lift the structural
   channels toward 0.80?
4. **If yes:** final test-set evaluation. If no: the diagnosis says
   why — try the next candidate signal.
5. **Expand corpus** beyond animation (live-action features may behave
   differently; manifest already lists Pulp Fiction, Jaws).

---

## Provenance

- Held-out split: `scripts/output/corpus-split.json` (seed 42, 60/20/20)
- Test-set lock: `scripts/output/corpus-test-hash.txt`
- Baseline AUCs: `scripts/output/discrimination-auc.csv` +
  `DISCRIMINATION_BASELINE_2026-07-29.md`
- Engine inspected: HEAD of `main` prior to this document. No engine
  files modified for this diagnosis (measurement-only).
- Discipline: no test-set tuning. The test set was split and locked but
  not evaluated — it awaits a signal-layer change worth measuring.
