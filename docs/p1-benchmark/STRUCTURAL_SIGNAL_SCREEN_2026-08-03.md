# Structural signal screen — 2026-08-03

**What this is:** a cheap falsification pass over five candidate order-sensitive
signals, run BEFORE implementing any of them. **What it is not:** a P1 result.
Every number here comes from 26 scripts (the 20 band-labeled calibration
samples in `server/nvm/analyze/calibration/corpus.ts` plus the 6 CC0
screenplays in `data/screenplays/`), not the 761-script corpus, whose text is
local-only and absent from the cloud container this ran in. No figure below
may be quoted as a gate measurement.

Reproduce with `node scripts/probe-interscene-candidates.mjs`; raw win/tie/loss
and AUC per candidate per degradation land in
`scripts/output/probe-interscene-candidates.json`. The three degradation
functions are copied verbatim from `scripts/measure-auc-split.mjs` so the screen
and the real harness damage scripts identically.

## Why screen at all

P1's structural channels sit below the gate: SCENE_SHUFFLE 0.734,
MIDPOINT_DROP 0.766, CLIMAX_RELOCATE 0.523 (chance) on the held-out test
partition. The diagnosis is settled — every field on `ScreenplaySceneRecord`
is computed from its own scene's text, so reordering preserves all of them.
The 2026-07-29 session then spent its cycle implementing `peakPosFrac` and
discovered only afterward that it inherited exactly that blindness.

This screen exists so that failure mode costs an hour instead of a session.
A candidate that cannot move on 26 scripts under a degradation designed to
destroy the very property it claims to measure is not worth building; a
candidate that does move still has to prove itself on the real corpus.

## Verdicts (n=26 for every statistic)

| Candidate | SHUFFLE | DROP | RELOCATE | Verdict |
|---|---|---|---|---|
| 1. Scene-to-scene intensity delta | 0.577 | 0.596 | 0.462 | WEAK — near chance; the variance variant runs backwards (0.442 on all three) |
| 2. Forward-reference density | 0.462 | 0.500 | 0.519 | WEAK/DEAD, but confounded — see the floor effect below |
| 3. Local-context emotional shift | 0.577–0.615 | **0.750** | 0.558–0.615 | PROMISING for DROP only; useless on RELOCATE |
| 4. Setup-before-payoff ordering | 0/26 | 0/26 | 0/26 | **DEAD — tautological by construction.** See D6 below |
| 5. Question-answer latency | 1/7 | 0/6 | 2/6 | UNDERPOWERED, not refuted — the only mechanism order-sensitive by construction |

## The two results that matter

### Candidate 4 is not weak — it is structurally incapable of firing

Setup-before-payoff ordering should have been the purest order signal
available: a payoff landing before the thing it pays off is unambiguously a
structural error, and shuffling scenes should manufacture them freely. It
produced **zero inversions across 26 scripts and all three degradations** —
not noise, a constant.

The cause is in `applyClueLifecycle` (`server/nvm/analyze/fountain-analyzer.ts`
~line 838):

```ts
const first = occ[0];
const last = occ[occ.length - 1];
```

The seed is *defined* as the first occurrence and the payoff as the last, in
whatever order the scenes arrive. A payoff therefore cannot precede its seed —
the relation is assigned, never observed. This reproduces the 2026-07-29
diagnosis's Step 3 finding at 26/26 rather than 5/5, and it is recorded as a
detector defect (D6) because it has a consequence beyond this screen: the
engine cannot flag a genuine payoff-before-setup error in a real draft either.

### Candidate 5 is already implemented, already consumed, and routed through the channel that cannot carry it

Question-answer latency (`detectQuestionLatency`, feeding `questionsRaised` /
`questionsResolved` / `questionsResolvedSameScene` / `questionsUnresolved`)
forward-matches each raised question against later lines *in whatever scene
order it is given*. Reordering can therefore convert a resolved question into
an unresolved one. Alone among the five candidates, that makes it
order-sensitive **by construction** rather than statistically.

It is also already wired into the score — but through the wrong channel. Three
rules in `server/nvm/revision/passes/payoff.ts` (~6612-6710) read these fields:
`UNANSWERED_QUESTION_FLOOD`, `INSTANT_GRATIFICATION_PATTERN`, and
`DEAD_QUESTION_ZONE`. All three emit ordinary issues, which flow into
`bySeverity` and then through `densityPenalty` — the density-normalized
weighted-rule channel that the doctor's own instrumentation measures at
AUC ~0.076. At feature scale, one to three extra `major` issues dissolve among
hundreds. This is the same absorption mechanism the discrimination baseline
already names for the other channels.

**So the cheapest remaining P1 experiment requires no new analyzer field at
all** — it is a re-routing question: does moving these existing outputs into a
bounded structural deduction (mirroring `structuralDeduction` /
`arcIncoherenceDeduction`) recover order-sensitivity at feature scale?

This screen **cannot** answer that, and the honest reason is sample power, not
refutation: only **8 of 26** scripts raise even one substantive dialogue
question, because calibration samples run 300–360 words. Most pairs tie at
0 vs 0. The rules' own thresholds (≥6 raised, ≥4 resolved) are never
approached. A signal cannot be falsified on material that cannot express it.

## What to do next, in order

1. **Run candidate 5 on the real corpus** via `measure-auc-split.mjs`, on
   train only. Two questions: does unresolved-question rate move under
   CLIMAX_RELOCATE at feature scale, and does re-routing those three rules
   into a bounded deduction move the channel AUC? No new field required.
2. **Do not build candidate 3** unless 5 fails. Its only real effect is on
   MIDPOINT_DROP, which already scores 0.766 through the existing scarcity
   term, so its marginal value is probably redundant — and it contributes
   nothing to CLIMAX_RELOCATE, the actual blocker.
3. **Retest candidate 2 on feature-length material before dismissing it.**
   Its failure here is plausibly a floor effect rather than a refutation:
   calibration scripts carry 3–5 named characters and mostly-unique locations
   across ~10 scenes, leaving almost no opportunity to reference an
   unestablished entity no matter how the scenes are ordered. That is a
   property of the test material, not evidence about the signal.
4. **Do not pursue candidate 4** in its current form. Making it work means
   changing how clue lifecycles are *derived* (D6), not adding a formula on
   top of a relation that is assigned rather than measured.

## Discipline note

Candidates 1, 2, and 3 are order-sensitive only *statistically* — they read
adjacent-pair aggregates that reordering tends to disturb. Candidate 5 is
order-sensitive *mechanically*. That distinction predicted this screen's
outcome better than any measured value did, and it is the cheaper filter to
apply first when the next candidate list is drawn up.
