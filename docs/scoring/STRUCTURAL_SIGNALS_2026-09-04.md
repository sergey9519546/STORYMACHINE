# Structural signals — dense, lexicon-free readings (2026-09-04)

**Module:** `server/nvm/analyze/structural-signals.ts` ·
**Tests:** `server/nvm/analyze/structural-signals.test.ts` ·
**Measurement:** `node --experimental-strip-types scripts/measure-structural-signals.ts`
· **Report field:** `ScriptDoctorReport.structuralSignals` (additive, optional)

**Nothing in this document changes a score.** The block is diagnostic only: no
`health`, `grade`, `verdict`, `dimension`, `topPriorities` entry, or revision
pass reads any number in it. §6 states the one path by which any of these could
become part of the score, and who decides.

---

## 1. Why

The 2026-09-04 advice-quality audit measured a deliberately excellent 10-page
script and a deliberately bad one, matched on scene count and length, scoring
**76.0 vs 76.0** with 7 of 10 top notes in common. The audit's own root-cause
R1 named the mechanism: nearly all advice derives from four sparse lexicon
channels. Re-measured here on the same 427 in-repo scenes:

| legacy channel | scenes present | rate |
|---|---|---|
| `emotionalShift` not 'neutral' | 31/427 | 7.3% |
| `clockRaised` | 30/427 | 7.0% |
| `revelation` present | 29/427 | 6.8% |
| `suspenseDelta` non-zero | 99/427 | 23.2% |
| `agency-signal` evidence (built, unwired) | 60/427 | 14.1% |
| `reversal-detection` candidates (built, unwired) | 0/427 | 0.0% |

A channel absent on 93% of scenes can only produce "X is missing" notes, and
those fire on a good draft and a bad one alike. The two previously-built
unwired detectors do not fix that: `agency-signal` fires on 14.1% of scenes and
`reversal-detection` on **zero** — reproducing, from a third direction, the
0/44 null result already recorded in
`docs/p1-benchmark/UNWIRED_SIGNALS_EVIDENCE_2026-08-21.md`.

So this work adds no lexicon and no rule. Every channel below is defined over
counts of words, lines, sentences, speech turns and speakers. None can be
defeated by choosing different vocabulary.

---

## 2. The channels, and what each one is

Per scene (`structuralSignals.scenes[]`):

| channel | definition |
|---|---|
| `words` | words in the scene's action + dialogue text (slugline excluded) |
| `lengthZ` | `words` as a population z-score against this script's own scenes |
| `dialogueShare` | dialogue words / (dialogue + action) words |
| `dialogueShareDelta` | this scene's `dialogueShare` minus the previous scene's (signed) |
| `speakerTurns` | character cues in the scene that are actually followed by dialogue |
| `meanTurnWords` | dialogue words / `speakerTurns` |
| `speakers` | distinct speaking characters |
| `newPairs` | unordered speaker pairings co-present here and in no earlier scene |
| `leadShare` | share of the scene's dialogue words spoken by the script's top speaker |
| `actionSentenceCv` | sd/mean of the scene's action-sentence lengths |
| `openCloseShift` | \|mean line words over the first third − over the last third\| / scene mean |
| `openCloseModeFlip` | first and last ordered line differ in mode (action vs dialogue) |

Per report, the aggregates measured for separation in §4: `sceneLengthCv`,
`meanAbsDialogueShareDelta`, `dialogueShareRange`, `newPairSceneRate`,
`lastNewPairPosition`, `meanSpeakersPerScene`, `meanTurnWords`,
`meanLeadShare`, `leadShareSlope`, `speakerEntropy`,
`actionSentenceCvOverall`, `meanOpenCloseShift`, `openCloseModeFlipRate`.
Each carries its own one-line definition in `STRUCTURAL_SIGNAL_SPECS`
(structural-signals.ts) alongside the craft direction registered for it — see
§4's pre-registration note.

---

## 3. Density (the bar this work was set)

The brief's bar: a channel that is zero on more than half of scenes is not the
fix. Measured over the 20 `data/screenplays/*.fountain` CC0 fixtures plus the
20 calibration `REFERENCE_CORPUS` samples — 427 scenes.

| channel | combined (427) | CC0 only (231) | calibration only (196) | verdict |
|---|---|---|---|---|
| `words` | 100.0% | 100.0% | 100.0% | DENSE |
| `lengthZ` | 99.5% | 100.0% | 99.0% | DENSE |
| `dialogueShare` | 94.4% | 89.6% | 100.0% | DENSE |
| `dialogueShareDelta` | 88.1% | 90.0% | 85.7% | DENSE |
| `speakerTurns` | 94.4% | 89.6% | 100.0% | DENSE |
| `meanTurnWords` | 94.4% | 89.6% | 100.0% | DENSE |
| `speakers` | 94.4% | 89.6% | 100.0% | DENSE |
| `leadShare` | 75.2% | 74.5% | 76.0% | DENSE |
| `openCloseShift` | 89.5% | 86.1% | 93.4% | DENSE |
| `openCloseModeFlip` | 80.6% | 64.1% | **100.0%** | DENSE, degenerate on one corpus |
| `newPairs` | **21.5%** | 27.7% | 14.3% | SPARSE — fails the bar |
| `actionSentenceCv` | **35.6%** | 64.9% | **1.0%** | corpus-dependent |

Ten of twelve channels clear the bar, against 6.8–7.3% for the lexicon
channels they exist to replace. Three findings are worth stating rather than
averaging away:

* **`newPairs` fails the bar and always will.** It is an EVENT channel — "two
  people who never shared a scene now share one" can only fire a handful of
  times per script. Its per-scene sparsity is correct behaviour, not a defect,
  but it does mean this channel is not a candidate for scene-level advice. The
  document-level rate (`newPairSceneRate`) is the usable form.
* **`actionSentenceCv` is 64.9% on real screenplays and 1.0% on the
  calibration corpus.** The calibration samples write exactly one action
  sentence per scene, so there is nothing for a within-scene variance channel
  to measure there. This is a property of that corpus's controlled-richness
  design (CLAUDE.md's own gotcha), not of the channel.
* **`openCloseModeFlip` is true on 196/196 calibration scenes** — every sample
  opens on action and closes on a speech. That independently confirms, from a
  different measurement, the corpus-degeneracy finding already recorded in
  `fountain-analyzer.ts`'s Wave 1190 header ("196/196 scenes open with
  action"). On real screenplays the channel varies normally (64.1%). It is kept
  with the split stated, not deleted on one corpus's evidence.

### Channels measured and DROPPED

| dropped | evidence | why |
|---|---|---|
| dialogue question density (per scene) | present on 9.4% of all scenes (14.7% CC0, 3.1% calibration) | fails the same density bar the lexicon channels fail; it is not the fix, so it does not earn a place on every report. Still measured by the script under "Dropped candidate" so the number stays reproducible. |
| `meanSpeakerTurns` (report aggregate) | Spearman rho **0.870** against `meanSpeakersPerScene` over 40 scripts (0.832 over the 20 CC0 fixtures alone) | it restates cast size. The per-scene `speakerTurns` is kept — that is a scene fact, not a script-level claim. |

---

## 4. Separation

**One statistic throughout:** the RANK-ORDERING COUNT — of the N cross-group
script pairs, how many does the channel order in its registered direction (ties
count 0.5). Divided by N that number is the Mann-Whitney AUC, so both forms
appear and no second statistic is introduced between sets.

**Pre-registration.** Each channel's direction was written into
`STRUCTURAL_SIGNAL_SPECS` before any of these numbers existed. Five channels
carry a craft prior (`higher` / `lower`); the other eight carry `none` — there
is no defensible a-priori direction for them, so their AUC is printed in the
arbitrary `higher` direction and marked DESCRIPTIVE, and it counts neither for
nor against. **No direction below was changed after seeing a result**, and two
priors are recorded as REFUTED rather than flipped.

**Set B** — the audit's matched pair (`tests/fixtures/advice-quality/`,
copied verbatim from the audit), N = 1.
**Set C** — calibration corpus, 5 `strong` vs 5 `troubled`, N = 25.
**Set D** — `tests/fixtures/blind-pairs/`: **absent from the tree at the time
of this measurement**, so Part D was skipped, printed as skipped, and is not
reported. The measurement script picks the directory up automatically if a
later lane lands it.

| channel | direction | B: audit pair (N=1) | C: calib strong>troubled (N=25) | read |
|---|---|---|---|---|
| `meanAbsDialogueShareDelta` | higher | 1/1 = 1.000 ✓ | 24/25 = **0.960** ✓ | orders both sets, the one channel that does |
| `dialogueShareRange` | higher | 1/1 = 1.000 ✓ | 18/25 = 0.720 ✓ | orders both sets, weaker |
| `sceneLengthCv` | higher | 1/1 = 1.000 ✓ | 14/25 = 0.560 ✓ | orders both sets, near chance on C |
| `actionSentenceCvOverall` | higher | 1/1 = 1.000 ✓ | 4/25 = 0.160 ✗ | **inconsistent** — inverts on C |
| `newPairSceneRate` | higher | 0/1 = 0.000 ✗ | 6.5/25 = 0.260 ✗ | prior REFUTED on both sets |
| `meanTurnWords` | lower | 0/1 = 0.000 ✗ | 0/25 = 0.000 ✗ | prior REFUTED on both sets, perfectly |
| `meanOpenCloseShift` | higher | 0/1 = 0.000 ✗ | 0/25 = 0.000 ✗ | prior REFUTED on both sets, perfectly |
| `lastNewPairPosition` | none | 0.000 desc | 0.840 desc | descriptive |
| `meanSpeakersPerScene` | none | 0.000 desc | 0.000 desc | descriptive |
| `meanLeadShare` | none | 1.000 desc | 0.240 desc | descriptive |
| `leadShareSlope` | none | 1.000 desc | 0.200 desc | descriptive |
| `speakerEntropy` | none | 1.000 desc | 0.040 desc | descriptive |
| `openCloseModeFlipRate` | none | 0.000 desc | 0.500 desc | descriptive |

Raw values on set B (excellent / bad):

| channel | excellent | bad |
|---|---|---|
| `sceneLengthCv` | 0.3100 | 0.2447 |
| `meanAbsDialogueShareDelta` | 0.4235 | 0.1986 |
| `dialogueShareRange` | 0.8627 | 0.4119 |
| `newPairSceneRate` | 0.2000 | 0.4000 |
| `lastNewPairPosition` | 0.2222 | 0.7778 |
| `meanSpeakersPerScene` | 1.3000 | 1.9000 |
| `meanTurnWords` | 11.9167 | 11.0351 |
| `meanLeadShare` | 0.6080 | 0.5262 |
| `leadShareSlope` | 0.3760 | −0.1190 |
| `speakerEntropy` | 0.8696 | 0.8067 |
| `actionSentenceCvOverall` | 0.7583 | 0.5568 |
| `meanOpenCloseShift` | 0.5378 | 0.5903 |
| `openCloseModeFlipRate` | 0.3000 | 0.4000 |

### What separates, what is noise, what inverts

* **Separates on both sets:** `meanAbsDialogueShareDelta` (1.000 / 0.960),
  `dialogueShareRange` (1.000 / 0.720), `sceneLengthCv` (1.000 / 0.560, which
  on set C is barely better than a coin). One channel — the scene-to-scene
  swing in the talk/action mix — is the only genuinely strong result here.
* **Inconsistent:** `actionSentenceCvOverall` orders the audit pair perfectly
  and inverts on the calibration bands (0.160). §3 explains why: that channel
  has almost nothing to read on the calibration corpus (non-zero on 1.0% of its
  scenes), so its set-C number is close to meaningless rather than contrary
  evidence. It is reported as inconsistent, not as a win.
* **Priors refuted:** `meanTurnWords` ("clipped turns read as better craft")
  and `meanOpenCloseShift` ("a scene that ends in a different register moved")
  both score 0.000 on BOTH sets — meaning their inverses order every pair
  perfectly. That is an interesting result and it is **not** re-registered
  here: flipping a direction after seeing 0.000 is exactly the fishing this
  pre-registration exists to prevent. Anyone who wants to claim the inverse
  must register it and measure on a set that was not used to find it.
* **Noise:** the eight `none`-direction channels swing between 0.000 and 1.000
  across the two sets with no consistent story. They are kept in the report as
  descriptive readings a human can look at, not as evidence of anything.

### Attacks run on the result, and what they found

1. **Collinearity with cast size.** Spearman rho against
   `meanSpeakersPerScene`, over 40 scripts / over the 20 CC0 fixtures alone:
   `meanAbsDialogueShareDelta` −0.392 / −0.677, `dialogueShareRange` −0.363 /
   −0.539, `sceneLengthCv` −0.434 / −0.679, `meanSpeakerTurns` **+0.870 /
   +0.832** (dropped for it, §3). The three channels that separate are
   moderately anti-correlated with cast size on real screenplays — enough that
   part of what they order may be "fewer people per scene", not craft. That is
   an open confound, not a settled one, and any wiring attempt has to control
   for it.
2. **Corpus circularity on set C.** The calibration corpus is a
   controlled-richness design: 20 samples with matched scene and word budgets,
   and the audit's own R9 already showed its troubled band is written in the
   exact phrasings the dialogue and originality rules flag. Its scenes carry
   one action line and one or two single-line speeches, which is why
   `meanSpeakerTurns` equals `meanSpeakersPerScene` on all 20 samples. Set C
   therefore measures how the corpus's four bands were authored at least as
   much as it measures craft, and the perfect 0.000 / 1.000 columns should be
   read in that light.
3. **Band ordering is not monotone.** On `meanAbsDialogueShareDelta` the band
   means run competent > strong > weak > troubled, not strong > competent >
   weak > troubled. A channel that orders the extremes but scrambles the middle
   is not yet a scoring input.
4. **Set B is one pair.** A 1/1 result is a direction, not a measurement.
   Every "1.000" in the B column carries that caveat.

---

## 5. Where it shows up

* `ScriptDoctorReport.structuralSignals` — additive, optional key.
* `server/lib/coverage-html.ts` — a "Structural Signals (new, unwired
  diagnostics)" section: one bar per scene, filled by that scene's dialogue
  share, with the full per-scene row on hover, plus a document summary line.
  Its own copy states that no part of the score is derived from it.
* `server/lib/coverage-letter.ts` — one line in "How to Read This Report",
  emitted only when the block is present, saying the same thing in the
  letter's voice.

---

## 6. The path to wiring any of these into health

This is the owner's decision, and it has exactly one route. For a candidate
channel:

1. Wire the candidate into the score (a bounded deduction or a rule), on a
   branch, with positive and negative fixtures.
2. Run `npm run measure-real` against the local `REAL_SCRIPT_CORPUS_DIR` — the
   761-script corpus that cannot reach CI.
3. Compare the resulting AUC-24 against the floor in `scripts/lib/auc.ts`
   (>= 0.622; last measured 0.731). A candidate that does not move
   discrimination up, or that pushes AUC-24 below the floor, does not get
   wired.
4. Write the `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` entry recording that
   run, and re-lock `tests/fixtures/real-corpus-manifest.json` if any produced
   script's health, verdict, or scene count moved.
5. Merge.

Not before, and not by adding a rule that reads this block without steps 2–4.
On the evidence above, the only channel worth spending that run on is
`meanAbsDialogueShareDelta`, and it should be measured with the cast-size
confound in attack 1 controlled for.

---

## 7. Honest summary

Twelve dense, lexicon-free per-scene channels now exist and are exposed, and
the density claim is real: 10 of 12 are non-zero on 75–100% of scenes where the
channels driving today's advice are absent on 93%. Density was the stated
problem, and density is solved.

Separation is a much weaker result. Exactly one channel orders both available
sets convincingly, one of those sets is a one-pair fixture and the other is a
corpus with known circularity, and the strongest channels carry a moderate
anti-correlation with cast size that nobody has controlled for yet. Nothing
here has been measured on real writing at scale, and until it is, the honest
claim is: **these channels are dense and cheap and one of them looks
promising**, not that any of them would move discrimination on real
screenplays.
