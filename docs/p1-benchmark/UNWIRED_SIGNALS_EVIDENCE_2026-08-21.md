# Unwired Signals — Measurement Evidence (P-1, 2026-08-21)

**Purpose:** ROADMAP/PATH_TO_EXCELLENCE Phase P, item P-1 — wire-or-retire
the four unwired analysis signals (`agency-signal.ts`, `question-latency-
deduction.ts`, `reversal-detection.ts`, `truth-extraction.ts`) by measuring
each against the 125-film annotated corpus, reusing the stress-ledger's
already-proved method. This is the evidence lane only: **nothing in this
document changes a scoring path.** `node scripts/check-scoring-receipt.mjs`
exits 0 for this change (no scoring-path file touched).

**Script:** `scripts/measure-unwired-signals.ts` —
`node --experimental-strip-types scripts/measure-unwired-signals.ts`.
Raw output: `scripts/output/measure-unwired-signals.json`.

**Headline finding, stated first because it governs everything below:**
neither corpus this task named is reachable from this session. The 125-film
annotated corpus (`screenplay_training`, referenced by
`docs/p1-benchmark/STRESS_LEDGER_CALIBRATION_2026-08-11.md` and
`scripts/calibrate-stress-ledger.ts`) lives at a Windows path on the
maintainer's local machine and does not exist here — confirmed by directly
checking `ANNOT_DIR`/`QUAL_DIR` (both empty in this environment) and by
searching the filesystem for `screenplay_training` / `dramatic.json` (no
hits). The 761-script P1 real-writing corpus
(`REAL_SCRIPT_CORPUS_DIR`) is equally absent — `data/screenplays/crawl/`
(the path `scripts/measure-auc-split.mjs`'s `corpus-split.json` expects)
does not exist in this worktree; `data/` is gitignored per CLAUDE.md, so
only the 20 CC0 sample scripts ship in git. **This is not a script bug — it
is the exact local-only-corpus constraint CLAUDE.md already documents for
`REAL_SCRIPT_CORPUS_DIR`, now confirmed to apply identically to the 125-film
corpus.** The measurement script is built and ready to run for real the
moment `ANNOT_DIR`/`QUAL_DIR` point at the maintainer's local copy; running
it here produces the honest CANNOT-MEASURE report below, plus real numbers
from the one corpus this session *can* reach (Part B, 44 in-repo real
scripts).

---

## 0. Method

`scripts/measure-unwired-signals.ts` runs two parts:

- **Part A — 125-film annotated corpus.** Reuses
  `scripts/calibrate-stress-ledger.ts`'s exact annotation→StoryOps bridge
  (same `DramaticScene` schema, same `convertScene`/`convertFilm` mapping,
  same `ANNOT_DIR`/`QUAL_DIR` env-var contract), then feeds the resulting
  `StoryOp[]` through the REAL `buildScreenplayMemory`
  (`server/nvm/screenplay/memory.ts`) — the same ops-derived path every
  production caller uses — to get `ScreenplaySceneRecord[]`, the record
  type all four unwired modules consume. Configurable via `ANNOT_DIR`/
  `QUAL_DIR`, identical contract to the stress-ledger script.
- **Part B — 44-script in-repo real-prose corpus.** The same sample every
  other P1 unwired-signal probe in this repo already uses (20 calibration-
  corpus samples + 20 CC0 screenplays under `data/screenplays/` + 4
  structural-form-experiment fixtures), reusing the degradation functions
  (`SCENE_SHUFFLE`/`MIDPOINT_DROP`/`CLIMAX_RELOCATE`) verbatim from
  `scripts/measure-auc-split.mjs`. This is real prose the session can
  actually reach, so Part B is where this document gets real numbers today.
  Adds a percentile-bootstrap 95% CI (2000 resamples) on every pairwise AUC
  — the uncertainty reporting the task asked for — which the pre-existing
  probes this reuses (`probe-truth-order-sensitivity.mjs`,
  `probe-question-latency-deduction.mjs`) did not compute.

**Baseline every signal is measured against:** doctor.ts's own instrumented
comparison (CLAUDE.md, `doctor.ts:1892-1898`) — scene-count scarcity alone
carries **AUC ~0.938** on the real corpus; the entire weighted-rule channel
(3,216 pass-scoped constants) contributes **AUC ~0.076**. A new signal
earns wiring by moving discrimination meaningfully toward the former, not
by existing.

---

## 1. Reversal-detection (`server/nvm/analyze/reversal-detection.ts`)

**What it computes:** two independent channels reading only
`ScreenplaySceneRecord` fields (no LLM). Channel 1 — a scene's `revelation`
text matches an allegiance/identity-inversion lexicon (mole, traitor, "it
was me all along", etc.). Channel 2 — a character pair's *rolling* signed
`relationshipShifts` sum crosses an "established" threshold (>=3) in one
direction, then swings >=4 in the opposite direction in a single scene.
Responds to detector defect D3: the legacy `reversalCount`
(`structure.ts`) is defined only as `suspenseDelta < -1`, which misses
every revelation-type reversal (D3's own worked example: "The Second Key"
scores 0 legacy reversals despite the climax revealing Vance signed the
antagonist's transfer papers).

**Corpus reachability — the ONE signal structurally testable against the
125-film corpus, with caveats.** Channel 2 is driven by numeric
`SHIFT_RELATIONSHIP` amounts, which the stress-ledger converter *does*
emit (`confrontation`: -0.3, `test`: -0.15, `reversal` tag: -0.5), and the
corpus's own `reversal` annotation field is a direct per-scene ground-truth
label — a genuine precision/recall opportunity none of the other three
signals get. Two caveats an owner run must carry: (a) Channel 1 needs raw
revelation *prose* to match against a lexicon; the ops-derived path's
`revelation` field is populated only from `UPDATE_BELIEF` ops, which the
stress-ledger converter never emits, so Channel 1 is unreachable via this
bridge for the same reason as agency-signal/truth-extraction below — only
Channel 2 is testable. (b) **FIXED 2026-08-24 in `434be38c` — this caveat is
discharged; the owner run below is now safe to take at face value.** The
converter's `SHIFT_RELATIONSHIP` amplitudes (0.15–0.5) are roughly 10x
smaller than `reversal-detection.ts`'s own established/swing thresholds
(3/4), which were tuned against real fountain-text amplitudes
(`RELATIONSHIP_SHIFT_THRESHOLD=2`, per-scene cap 5). Run as shipped in
August 2026, Channel 2 structurally under-fired on this bridge regardless of
the real reversal rate, so the owner run would have measured the scale
rather than the detector. The fix does not retune the thresholds — it
expresses them in the producer's own unit (`inferAmplitudeScale` /
`ReversalDetectionOptions.amplitudeScale`), returning exactly 1 (a
byte-for-byte no-op) for the text path's integer convention and
`max(|amount|)/5` otherwise, which maps this bridge's 0.5 ceiling to 0.1 and
turns (3, 4) into (0.3, 0.4). `scripts/measure-unwired-signals.ts` now
prints the inferred scale per film, so a run reporting `1.0` across the
board is a signal that the bridge changed and the numbers need a second
look. Still not a scoring change: the module remains unwired and outside
`doctor.ts`'s import graph, and `check-scoring-receipt` exits 0 over the fix.

**Measured (Part B, 44 in-repo real scripts, this session):**

- Legacy-vs-detected disagreement: **0/44** scripts where the detector
  finds more reversals than the legacy suspense-dip count (D3's exact
  failure mode did not reproduce on this sample), and **0/44** where
  legacy finds reversals the detector's two channels miss. On this
  particular 44-script sample, `detectedCount` and `legacyCount` never
  diverged — a genuine null result on this corpus, not evidence the
  detector is inert (its own file header and tests already demonstrate
  Channel 1/2 firing on hand-built fixtures; this sample's scripts simply
  don't happen to contain the specific disagreement shape D3 flagged).
- Channel-2 order-sensitivity (does `detectedCount` move under
  degradation): **0/44 moved** under SCENE_SHUFFLE, MIDPOINT_DROP, and
  CLIMAX_RELOCATE alike. Consistent with the amplitude-mismatch caveat
  above being a real, general property (not corpus-specific): the 44
  in-repo scripts run 9-16 scenes each and the calibration-corpus / CC0
  material simply doesn't stack enough same-pair `SHIFT_RELATIONSHIP`
  amount to cross the >=3 established threshold before a swing, so
  Channel 2 rarely activates on THIS corpus either, independent of the
  annotation-bridge scaling issue.

**CANNOT-MEASURE (Part A, this session):** ANNOT_DIR/QUAL_DIR absent.
Channel 2's precision/recall-against-`reversal`-label computation exists in
`scripts/measure-unwired-signals.ts` and is ready to run; it did not
execute here for lack of corpus.

**Recommendation: WIRE (Channel 2 only) — evidence incomplete, not
negative; the discharge step is a single owner-machine run.** The scene-
level ground-truth comparison against the corpus's own `reversal` label is
the strongest measurement opportunity of the four signals and has not yet
been run for real. Exact discharge step:

```
ANNOT_DIR=<path>/screenplay_training/corpus/05_dramatic_annotations \
QUAL_DIR=<path>/screenplay_training/corpus/07_quality_scores \
node --experimental-strip-types scripts/measure-unwired-signals.ts
```

The amplitude mismatch that used to make this run uninterpretable is fixed
(`434be38c`, 2026-08-24); the rescale is applied automatically and reported
per film, so no manual threshold edit is needed for this run.

If Channel 2 clears a meaningful precision/recall bar against the labeled
`reversal` field, it is a
wiring candidate; a subsequent AUC-24 real-corpus run per the P1 protocol
(CLAUDE.md's "Which floor, exactly") would then decide whether to route it
into a bounded deduction. Channel 1 stays unwired regardless — it needs raw
prose no annotation corpus in this project supplies.

---

## 2. Agency-signal (`server/nvm/analyze/agency-signal.ts`)

**What it computes:** reads `dramaticTurn`/`visualBeats` text for a
protagonist-as-near-leading-subject clause matched against a decisive-verb
lexicon (turns, grabs, fires, ...) or a spectator-verb lexicon (watches,
waits, stares, ...), plus `powerHolder` for dialogue-initiative. Responds
to detector defects D1/D2: the legacy `PROTAGONIST_PASSIVITY_CLIMAX`/
`PASSIVE_ACT3_INTENTION` predicate (`emotionalShift === 'neutral' &&
!clockRaised && seededClueIds.length === 0`) calls a scene passive purely
from mood/stakes/clue lexicon channels, blind to whether the protagonist
is actually acting (D1's worked example: June silently and decisively
opens a vault at the story's climax; the legacy predicate calls it
passive).

**Corpus reachability — CANNOT-MEASURE-MEANINGFULLY.** `dramaticTurn` on
the ops-derived path is synthesized by `memory.ts`'s `deriveDramaticTurn`
from `ADD_FACT`/`UPDATE_BELIEF` ops; the stress-ledger converter never
emits either op type, so `deriveDramaticTurn` always falls through to its
final fallback, `` `Scene ${purpose}` `` (e.g. "Scene character moment") —
a fixed template string that can never contain a protagonist name adjacent
to a decisive or spectator verb. `visualBeats` is populated only from
`RECORD_VISUAL_FACT`, which the converter emits exactly once per scene
(`fact: 'setting'`, only for `exposition`/`set_piece` mechanisms) — again,
never prose containing the protagonist's name. Running this signal against
the annotation-bridged records would execute without error and report
**zero agency evidence on every film, every time** — not because the
detector fails, but because the bridge structurally cannot produce the
text this signal reads. Reporting that as a corpus finding would be
dishonest; it is a bridge-construction artifact.

**Measured (Part B, 44 in-repo real scripts, this session):**

- D1 (peak-scene passivity) disagreement: **2/44** scripts where the
  legacy neutral/no-clock/no-clue predicate calls the peak scene passive
  while this module detects genuine decisive action or dialogue
  initiative there.
- D2 (Act-3 window passivity) disagreement: **4/44** scripts where legacy
  calls every Act-3 scene passive while this module finds initiative in at
  least one.

These are small-sample counts (n=44, non-degradation, disagreement-rate
design — this signal is not order-sensitive by construction: peak/Act-3
scene selection follows `suspenseDelta`, which is intrinsic to each
scene's own content, not document position, so no
SCENE_SHUFFLE/MIDPOINT_DROP/CLIMAX_RELOCATE AUC framework applies here).
They corroborate, on real prose, the specific failure mode D1/D2 were
opened to describe: the legacy predicate does occasionally call a
genuinely active protagonist passive.

**CANNOT-MEASURE (Part A, this session):** ANNOT_DIR/QUAL_DIR absent, and
even when present the bridge cannot supply this signal's required text (see
above) — this is the one signal where corpus absence is NOT the limiting
factor; the annotation schema itself is.

**Recommendation: RETIRE the "measure against the 125-film corpus" path
specifically (structurally impossible with the current annotation
schema); keep the module unwired pending a DIFFERENT evidence source.**
The only honest way to move this signal's evidence forward is the
761-script REAL_SCRIPT_CORPUS_DIR run its own file header already asks
for (`--with-agency-signal` on `measure-auc-split.mjs`), which needs raw
prose, not annotations — also not reachable from this session (see
headline finding). Absent that, this module stays exactly where it is:
built, tested, honestly documented as unwired, with real-but-small
disagreement evidence (2/44, 4/44) from the in-repo sample and no corpus
path currently available to grow that sample size within this project's
existing data assets.

---

## 3. Question-latency-deduction (`server/nvm/analyze/question-latency-deduction.ts`)

**What it computes:** a bounded, document-level deduction candidate
(0-15 points, 15-scene floor, 6-question floor, linear ramp above a 0.25
unresolved-rate reference) from the existing `questionsRaised`/
`questionsResolved`/`questionsUnresolved` channel — the same statistic
three ordinary-issue rules in `payoff.ts` already consume through
`densityPenalty` (the channel doctor's own instrumentation measures at
AUC ~0.076). Screened in `docs/p1-benchmark/STRUCTURAL_SIGNAL_SCREEN_
2026-08-03.md` as the one order-sensitive-by-construction candidate among
five (forward-matches each raised question against later lines in
whatever scene order it's given).

**Corpus reachability — CANNOT-MEASURE, not underpowered.**
`questionsRaised`/`Resolved`/`Unresolved` are documented in `memory.ts` as
populated *only* on the text-derived path ("the ops-derived path has no
raw dialogue text to lex-match against"). The stress-ledger converter
produces zero `questionsRaised` for every scene of every film, so
`computeQuestionLatencyDeduction`'s `gated` flag is false for 100% of the
corpus by construction — this is a clean, structural CANNOT-MEASURE, not a
sample-size problem.

**Measured (Part B, 44 in-repo real scripts, this session):**

- Coverage: **23/44** scripts raised >=1 substantive dialogue question on
  clean text.
- GATED (as-shipped, 15-scene + 6-question floor): **n=0 valid pairs on
  every degradation** — all 44 in-repo scripts run below the 15-scene
  floor (9-16 scenes), so the shipped gate cannot be exercised on this
  corpus at all (a known, designed property — the floor exists so the
  20-sample calibration corpus stays byte-identical if this is ever
  wired, not tuned to fire on small scripts).
- UNGATED (the underlying `unresolvedRate` alone, no floors), with 95%
  bootstrap CI (2000 resamples):
  - SCENE_SHUFFLE: n=23, **AUC 0.565**, 95% CI **[0.457, 0.674]**
  - MIDPOINT_DROP: n=19, **AUC 0.526**, 95% CI **[0.421, 0.632]**
  - CLIMAX_RELOCATE: n=23, **AUC 0.543**, 95% CI **[0.500, 0.609]**

All three CIs straddle 0.5 (chance). This is an honest **NEAR-CHANCE**
result on this sample — consistent with, not contradicting, the 2026-08-03
screen doc's own verdict ("UNDERPOWERED, not refuted": only 8/26 scripts
raised even one substantive question in that earlier, smaller sample).

**CANNOT-MEASURE (Part A, this session):** structural, as above — not
retried even with a hypothetical corpus present.

**Recommendation: RETIRE the "measure via annotation corpus" path
(structurally impossible); the open question stays exactly where the
2026-08-03 screen doc left it — genuinely underpowered on every corpus
this project's git-tracked assets can reach.** The only source that could
move this past NEAR-CHANCE is the 761-script REAL_SCRIPT_CORPUS_DIR run
(`--with-question-latency-deduction`), which needs the maintainer's local
machine. No fabricated urgency here: three separate CIs centered on 0.5 is
itself a real, useful, negative-leaning result on the material actually
available, not a gap in this evidence pass.

---

## 4. Truth-extraction (`server/nvm/analyze/truth-extraction.ts`)

**What it computes:** deterministic, pure-text extraction of life-status
`TruthFact`s (alive/dead per character per scene) from raw Fountain text,
feeding `truth-ledger.ts`'s Allen-interval contradiction detector. Scoped
deliberately narrow (life status only, after rejecting character-presence,
object-possession, and world-facts-from-dialogue as unsafe fact families —
see the module's own header) with six documented precision guards (named
speaker gate, action-text-only death cues, flashback/dream exclusion,
hedge-word gate, V.O. exclusion, earliest-cue-only).

**Corpus reachability — CANNOT-MEASURE by construction, the cleanest of
the four.** This signal requires `parseFountain` over actual raw
screenplay prose end to end. The 125-film annotation corpus (per the
stress-ledger method's own description) carries no raw text at all — only
structured per-scene tags (`active_mechanism`, `function_tags`,
`reversal`, `thematic_function`, `audience_information_advantage`,
`characters_present`). There is no bridge from structured annotations to
prose, and building one (synthesizing fake dialogue to "test" a text
extractor) would not be a measurement of this detector, so
`scripts/measure-unwired-signals.ts` does not attempt it — this is a
declared, not attempted, CANNOT-MEASURE.

**Measured (Part B, 44 in-repo real scripts, this session — via the
pre-existing `scripts/probe-truth-order-sensitivity.mjs`, reused rather
than reimplemented; the same numbers additionally appear in Part B of the
new combined script):**

- **Section A (real corpus, n=44):** false positives on clean,
  unmodified text: **0/44** scripts produced any contradiction (0 total).
  **38/44** scripts contain zero on-page deaths explicit enough to fire at
  all — the false-positive rate is genuinely zero on this sample, but
  RECALL is untestable here (no death events to detect). Order-sensitivity
  rank stat on real material is degenerate for the same reason
  (SCENE_SHUFFLE AUC 0.523 n=44 but only 2 non-tied pairs; MIDPOINT_DROP
  and CLIMAX_RELOCATE both AUC 0.500, 0 non-tied pairs).
- **Section B (12 synthetic mechanism-proof fixtures, built solely to
  isolate the order-sensitivity property since Section A has no death
  events to test it with):** 0/12 false positives on clean text (expected,
  by construction). SCENE_SHUFFLE AUC **1.000** (12/12 win), CLIMAX_
  RELOCATE AUC **1.000** (12/12 win), MIDPOINT_DROP AUC 0.500 (0/12
  moved — the death scene sits after the drop window in every fixture by
  construction, so this degradation cannot move it). The MECHANISM is
  confirmed genuinely order-sensitive; Section A confirms zero false
  positives on real, competently-written material; neither section can
  speak to real-world RECALL (no in-repo script stages an on-page death
  explicit enough to test against).

**Recommendation: WIRE the false-positive evidence as sufficient for a
LOW-RISK deduction/rule; RECALL stays CANNOT-MEASURE pending real
material.** Zero false positives across 44 real scripts plus a perfect
1.000/1.000 mechanism proof on synthetic fixtures is unusually clean
evidence for this class of detector — the honest gap is that no script
available to this project (in-repo or the 125-film annotations) contains
the death event needed to measure recall. The 761-script
REAL_SCRIPT_CORPUS_DIR run (`probe-truth-order-sensitivity.mjs`'s own
`RECALL MODE`, already built and documented in that script's header) is
the discharge step:

```
REAL_SCRIPT_CORPUS_DIR=/path/to/corpus node scripts/probe-truth-order-sensitivity.mjs
```

Given the precision side is already this strong, a maintainer could
reasonably choose to wire a conservative version now (e.g. a low-severity
flag, not a deduction, gated to fire only above some contradiction count)
while the recall question is still open — that is a product judgment call
outside this evidence lane's scope, not a claim this document makes for
itself.

---

## 5. Summary table

| Signal | 125-film corpus (this session) | In-repo real-prose (measured) | Recommendation |
|---|---|---|---|
| reversal-detection (Ch. 2) | CANNOT-MEASURE (corpus absent); structurally reachable in principle — the amplitude-mismatch caveat is FIXED (`434be38c`, 2026-08-24) | 0/44 disagreement, 0/44 moved under degradation | WIRE — evidence incomplete, discharge = owner-machine run above |
| reversal-detection (Ch. 1) | CANNOT-MEASURE (no prose in corpus) | n/a (not order-sensitive; disagreement-rate design shared with Ch. 2's count) | stays unwired — needs 761-script prose corpus |
| agency-signal | CANNOT-MEASURE-MEANINGFULLY (bridge produces no matchable text even if corpus were present) | D1: 2/44 disagree, D2: 4/44 disagree | RETIRE this measurement path; unwired pending 761-script corpus |
| question-latency-deduction | CANNOT-MEASURE (ops path never populates raised/resolved/unresolved) | GATED n=0 (below 15-scene floor); UNGATED AUC 0.53–0.57, all 3 CIs straddle 0.5 | RETIRE this measurement path; near-chance on best available sample |
| truth-extraction | CANNOT-MEASURE (no raw prose in corpus at all) | 0/44 false positives; synthetic mechanism AUC 1.000/1.000 (shuffle/relocate) | WIRE the FP evidence as sufficient; RECALL stays CANNOT-MEASURE pending 761-corpus run |

**Baseline for context (CLAUDE.md, `doctor.ts:1892-1898`):** scene-count
scarcity alone, AUC ~0.938; the entire weighted-rule channel (3,216
constants), AUC ~0.076. None of the four unwired signals has been measured
against the real corpus at feature scale yet — every number above is
either a small-sample in-repo disagreement/FP rate or a documented
CANNOT-MEASURE. That is the honest state of the evidence, not a result
this document can round up.

---

## 6. What would discharge each open item

1. **125-film corpus, all four signals:** `ANNOT_DIR`/`QUAL_DIR` pointed
   at the maintainer's local `screenplay_training` corpus, then
   `node --experimental-strip-types scripts/measure-unwired-signals.ts`.
   Will produce a real reversal-detection Channel-2 precision/recall
   report against the corpus's own `reversal` label; will confirm (not
   guess) that agency-signal/question-latency/truth-extraction remain
   CANNOT-MEASURE against this specific corpus, exactly as reasoned above
   — or surface a bridge fix this document did not anticipate.
2. **761-script REAL_SCRIPT_CORPUS_DIR, all four signals:**
   `REAL_SCRIPT_CORPUS_DIR=<path>` with the appropriate existing flag —
   `measure-auc-split.mjs --with-agency-signal` /
   `--with-reversal-detection` / `--with-question-latency-deduction`, and
   `probe-truth-order-sensitivity.mjs`'s built-in RECALL MODE for
   truth-extraction. This is real prose at real scale and is the strongest
   evidence source for every signal except reversal-detection Channel 2
   (which uniquely benefits from the 125-film corpus's direct `reversal`
   ground-truth label instead).
3. **Any resulting wiring decision** (not this document's call) requires
   the full P1 evidence protocol per CLAUDE.md — positive/negative
   fixtures plus a corpus-measured before/after against the AUC-24 >= 0.622
   ratchet in `tests/core/real-script-corpus.test.ts` — and a
   `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` entry once a scoring-path
   file actually changes.
