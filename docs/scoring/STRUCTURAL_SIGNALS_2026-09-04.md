# Structural signals — dense, lexicon-free readings (2026-09-04)

**Module:** `server/nvm/analyze/structural-signals.ts` ·
**Tests:** `server/nvm/analyze/structural-signals.test.ts` ·
**Measurement:** `node --experimental-strip-types scripts/measure-structural-signals.ts`
· **Report field:** `ScriptDoctorReport.structuralSignals` (additive, optional)

Set D below is the six blind matched pairs landed by a parallel lane
(`tests/fixtures/blind-pairs/`, `docs/p1-benchmark/BLIND_PAIRS_2026-09-04.md`).

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
`STRUCTURAL_SIGNAL_SPECS` before any of these numbers existed. Seven of the
thirteen carry a craft prior (six `higher`, one `lower`); the other six carry
`none` — there
is no defensible a-priori direction for them, so their AUC is printed in the
arbitrary `higher` direction and marked DESCRIPTIVE, and it counts neither for
nor against. **No direction below was changed after seeing a result.**

* **Set B** — the audit's matched pair (`tests/fixtures/advice-quality/`,
  copied verbatim from the 2026-09-04 advice-quality audit), N = 1.
* **Set C** — calibration corpus, 5 `strong` vs 5 `troubled`, N = 25.
* **Set D** — `tests/fixtures/blind-pairs/`: six matched pairs written on
  2026-09-04 by an author who had read none of the engine before writing them
  (that directory's README.md carries the order of operations and the git
  history that backs it), N = 6. This is the only set here whose stimulus was
  authored without knowledge of the rules.

| channel | direction | B: audit pair (N=1) | C: calib strong>troubled (N=25) | D: blind pairs (N=6) | read |
|---|---|---|---|---|---|
| `meanAbsDialogueShareDelta` | higher | 1/1 = 1.000 ✓ | 24/25 = **0.960** ✓ | 5/6 = **0.833** ✓ | orders all three sets |
| `actionSentenceCvOverall` | higher | 1/1 = 1.000 ✓ | 4/25 = 0.160 ✗ | 6/6 = **1.000** ✓ | orders both real-prose sets perfectly; inverts only where it has nothing to read |
| `dialogueShareRange` | higher | 1/1 = 1.000 ✓ | 18/25 = 0.720 ✓ | 4/6 = 0.667 ✓ | orders all three, weakly |
| `sceneLengthCv` | higher | 1/1 = 1.000 ✓ | 14/25 = 0.560 ✓ | 2/6 = 0.333 ✗ | inconsistent |
| `meanTurnWords` | lower | 0/1 = 0.000 ✗ | 0/25 = 0.000 ✗ | 6/6 = **1.000** ✓ | direction reverses BETWEEN sets — see below |
| `newPairSceneRate` | higher | 0/1 = 0.000 ✗ | 6.5/25 = 0.260 ✗ | 3/6 = 0.500 = | prior REFUTED |
| `meanOpenCloseShift` | higher | 0/1 = 0.000 ✗ | 0/25 = 0.000 ✗ | 4/6 = 0.667 ✓ | inconsistent |
| `meanSpeakersPerScene` | none | 0.000 desc | 0.000 desc | 0.000 desc | **0/32 pairs — the most consistent column in the table, and unregistered** |
| `leadShareSlope` | none | 1.000 desc | 0.200 desc | 0.833 desc | descriptive |
| `lastNewPairPosition` | none | 0.000 desc | 0.840 desc | 0.417 desc | descriptive |
| `meanLeadShare` | none | 1.000 desc | 0.240 desc | 0.333 desc | descriptive |
| `speakerEntropy` | none | 1.000 desc | 0.040 desc | 0.333 desc | descriptive |
| `openCloseModeFlipRate` | none | 0.000 desc | 0.500 desc | 0.750 desc | descriptive |

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

Raw values on set D for the four channels the discussion below turns on
(excellent / bad per pair):

| pair | `actionSentenceCvOverall` | `meanAbsDialogueShareDelta` | `meanTurnWords` | `meanSpeakersPerScene` |
|---|---|---|---|---|
| `fence-line` | 0.6231 / 0.4822 | 0.2862 / 0.2441 | 7.86 / 14.43 | 1.1 / 1.6 |
| `low-tide` | 0.5696 / 0.4017 | 0.3235 / 0.2161 | 5.98 / 10.39 | 1.6 / 1.9 |
| `night-shift` | 0.8383 / 0.4710 | 0.3911 / 0.2994 | 6.94 / 14.92 | 1.2 / 1.8 |
| `signal-drift` | 0.6851 / 0.4260 | 0.3402 / 0.3502 | 6.24 / 17.41 | 1.3 / 1.5 |
| `the-deposit` | 0.8185 / 0.5194 | 0.3038 / 0.1546 | 5.65 / 10.07 | 2.1 / 2.3 |
| `the-ledger` | 0.7394 / 0.4261 | 0.4513 / 0.1781 | 6.94 / 14.53 | 1.3 / 1.8 |

### What separates, what is noise, what inverts

* **Orders every set:** `meanAbsDialogueShareDelta` (1.000 / 0.960 / 0.833) —
  the scene-to-scene swing in how much of a scene is talk versus action. It is
  the only channel here that orders all three sets in its registered direction,
  and its one miss on set D (`signal-drift`, 0.3402 vs 0.3502) is a hair.
* **Orders both real-prose sets perfectly:** `actionSentenceCvOverall`
  (1/1 and 6/6, with no overlap at all between the excellent and bad ranges on
  set D: 0.57–0.84 against 0.40–0.52). It inverts on the calibration corpus,
  and §3 says why: that corpus writes one action sentence per scene, so a
  within-scene action-prose variance channel is non-zero on 1.0% of its scenes.
  Its set-C number measures nothing rather than contradicting sets B and D. On
  this evidence it is the second candidate worth a real-corpus run.
* **`dialogueShareRange`** orders all three but weakly (0.720 / 0.667), and it
  is partly a coarser restatement of `meanAbsDialogueShareDelta`.
* **Direction reverses between sets:** `meanTurnWords` scores 0.000 on B and C
  and 1.000 on D, with wide margins in both directions — the blind set's bad
  drafts run 10–17 words per speech against the good drafts' 5.6–7.9, while the
  calibration corpus's troubled band runs SHORTER speeches (6.1–7.9) than its
  strong band (8.7–11.0). The channel is not measuring craft; it is measuring
  how each author chose to write badness. This is the single most useful
  negative result in this table, and it is the reason the registered `lower`
  prior is **not** being re-registered as `higher` on the strength of set D.
* **Refuted:** `newPairSceneRate` (0.000 / 0.260 / 0.500) — new speaker
  pairings do not order craft on any set here. `meanOpenCloseShift` and
  `sceneLengthCv` are inconsistent across sets and are not candidates.
* **The unregistered column worth flagging:** `meanSpeakersPerScene` scores
  0.000 on all three sets — **0 of 32 pairs**, i.e. in every single comparison
  the better script has fewer speaking characters per scene. That is the most
  consistent ordering anywhere in this table and it carries **no registered
  direction**, so it is stated here as a HYPOTHESIS for a future pre-registered
  measurement and is claimed as nothing else. Two reasons for caution beyond
  the pre-registration rule: it is a plausible artifact of how three different
  authors reached for "bad" (more people talking), and it is the same variable
  the collinearity attack below implicates in the channels that do separate.

### Attacks run on the result, and what they found

1. **Collinearity with cast size.** Spearman rho against
   `meanSpeakersPerScene`: over 40 CC0+calibration scripts / over the 20 CC0
   fixtures alone / over the 12 blind scripts —
   `meanAbsDialogueShareDelta` −0.392 / −0.677 / **−0.643**;
   `actionSentenceCvOverall` +0.085 / −0.379 / −0.408;
   `dialogueShareRange` −0.363 / −0.539 / −0.366;
   `meanSpeakerTurns` +0.870 / +0.832 (dropped for it, §3).
   The strongest channel is moderately-to-substantially anti-correlated with
   cast size on every set, and cast size is itself the perfect 0/32 orderer
   above. **A meaningful part of what `meanAbsDialogueShareDelta` orders may be
   "fewer people per scene", not craft.** That confound is open, not settled,
   and any wiring attempt has to control for it — which is the first thing §6's
   real-corpus run should do.
2. **Corpus circularity on set C.** The calibration corpus is a
   controlled-richness design, and the audit's R9 already showed its troubled
   band is written in the exact phrasings the dialogue and originality rules
   flag. Its scenes carry one action line and one or two single-line speeches,
   which is why `meanSpeakerTurns` equals `meanSpeakersPerScene` on all 20
   samples and why `actionSentenceCv` fires on 1.0% of its scenes. Set C
   measures how the corpus's bands were authored at least as much as craft.
3. **Set B is one pair; set D is one author.** A 1/1 result is a direction, not
   a measurement, and set D's own README says it plainly: twelve short scripts
   by a single author, not blind-labelled by independent readers, no held-out
   split. Set D is by some distance the best evidence here — it is the only
   stimulus written without knowledge of the engine — and it is still evidence,
   not a benchmark.
4. **Band ordering is not monotone on set C.** On `meanAbsDialogueShareDelta`
   the band means run competent > strong > weak > troubled. A channel that
   orders the extremes but scrambles the middle is not yet a scoring input.

---

## 5. Where it shows up

* `ScriptDoctorReport.structuralSignals` — additive, optional key.
* `server/lib/coverage-html.ts` — a "Structural Signals (new, unwired
  diagnostics)" section: one bar per scene, filled by that scene's dialogue
  share, with the full per-scene row on hover, plus a document summary line.
  Its own copy states that no part of the score is derived from it.
* `server/lib/coverage-letter.ts` — a "Shape and rhythm" paragraph in "How to
  Read This Report", emitted only when the block is present AND scored,
  naming `meanAbsDialogueShareDelta` and `actionSentenceCvOverall` with their
  actual values and stating both are descriptive only. Gated on the field's
  presence so the two pre-existing captured-report fixtures
  (`tests/fixtures/coverage-letter/report{1,2}.json`, which predate this
  field) render byte-identically to before; a third fixture pair
  (`report3.json`/`report3.expected.md`) carries the field and exercises the
  paragraph.
* `src/components/scriptide/ScriptDoctorPanel.tsx` — a collapsible "Shape &
  Rhythm" section (state remembered in `localStorage`, same try/catch
  idiom as the panel's other client-side preferences): the per-scene strip
  (scene index, words, dialogue share, speakers, length z-score, open/close
  register shift — the full row on hover, matching coverage-html.ts's
  tooltip text verbatim) plus the same two document aggregates as the letter,
  each with one plain sentence and an explicit "not part of the score" label.
  Clicking a scene bar jumps the editor to that scene, resolved through
  `sceneLineSpans` — a route-level attachment (`server/routes/scriptide.ts`,
  mirroring the existing `locatedIssues`/`rootCauses` attachment) of
  `server/nvm/analyze/locate.ts`'s per-scene line spans, since
  `StructuralSignalsReport`'s own scene rows carry no line numbers.
* `src/components/scriptide/ScriptDoctorPanel.tsx`'s fix-and-verify receipt
  (`FixReceiptCard`) — when POST `/api/scriptide/fix` produced a verified
  candidate and BOTH the original and candidate whole-document text scored,
  the route (not `server/nvm/analyze/fix.ts` or `types.ts`'s
  `FixVerifyResult`, both left untouched) attaches a separate
  `structuralSignals: { before, after }` field carrying the same two
  aggregates, rendered beside the health delta and labelled descriptive.
* `src/components/scriptide/SnapshotManager.tsx` (the Versions tab) — the
  same two aggregates are captured per saved snapshot, additively, exactly
  like `health`/`verdict`/`sceneCount` already are (only when a fresh SCORED
  report exists for the exact text being snapshotted); a second line renders
  under the health-trend sparkline caption, oldest-scored → newest-scored,
  labelled descriptive. `src/lib/snapshot-trend.ts`'s `SnapshotTrendEntry`
  carries them as `number | null`, resolving to `null` under the same
  missing-data rule as every other field there.

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
On the evidence above, two channels are worth spending that run on:
`meanAbsDialogueShareDelta` (orders all three sets) and
`actionSentenceCvOverall` (orders both real-prose sets perfectly, with
non-overlapping ranges on the blind pairs). Both should be measured with the
cast-size confound from §4's attack 1 controlled for, because
`meanSpeakersPerScene` orders 32 of 32 pairs on its own and may be doing the
work.

---

## 7. Honest summary

Twelve dense, lexicon-free per-scene channels now exist and are exposed, and
the density claim is real: 10 of 12 are non-zero on 75-100% of scenes, where
the channels driving today's advice are absent on 93%. Density was the stated
problem, and density is solved.

Separation is the weaker half, and the honest version of it is this. Two
channels look genuinely promising: `meanAbsDialogueShareDelta` orders all three
available sets (1.000 / 0.960 / 0.833), and `actionSentenceCvOverall` orders
both real-prose sets perfectly with non-overlapping ranges on the blind pairs,
inverting only on the one corpus where it has nothing to read. The best set
here is set D, the six blind pairs, because it is the only stimulus written
without knowledge of the engine — and it is still six pairs by one author.
Against that, `meanTurnWords` orders set D perfectly and set C perfectly
BACKWARDS, which is a standing warning that a matched pair measures how its
author writes badness; and the strongest channel is anti-correlated with cast
size on every set, while cast size alone orders 32 of 32 pairs. Nobody has
controlled for that yet.

Nothing here has been measured on real writing at scale. Until it has, the
honest claim is: **these channels are dense and cheap, two of them survive
three sets including one written blind, and one open confound could account for
part of that** — not that any of them would move discrimination on real
screenplays.
