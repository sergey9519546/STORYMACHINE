# P0 Readiness Assessment — 2026-07-28

**Status:** Evidence-only. No engine, formula, rule, or detector was modified
to produce this document. Two new measurement scripts were added under
`scripts/`; their outputs are committed under `scripts/output/`. This file
sits under `docs/user-validation/` because it bears directly on whether the
P0 gate (validate with real writers) is even *fieldable* in its current form.

## TL;DR

The P0 gate as written asks: *"show 5+ real screenwriters the sample report;
would they run their own draft?"* Before spending recruitment effort on that
question, two runnable probes were built over the **52 real produced
screenplays already in `data/screenplays/`** to test the simpler, upstream
question: **does the score the report is built on actually read the script?**

The answer, on the evidence below, is **no — not for most real scripts, and
not on most of the channels the report claims to score.** Specifically:

1. **The Fountain parser is dialogue-blind on 42 of 52 real screenplays
   (81%).** Including every Pixar script in the corpus (Ratatouille, Soul,
   Up, Inside Out, Incredibles, Coco, Elemental, Luca, Onward, Toy Story 4,
   Turning Red, etc.) and every Spider-Verse script. The "Dialogue & Voice"
   dimension on those reports is computed from **zero detected dialogue**.
2. **The health score does not move under four of five mechanical
   degradations** applied to real scripts (scene shuffle, midpoint drop,
   climax relocate, dialogue flatten). Only scene-heading removal produces
   a signal, and that signal is inconsistent across scripts.
3. **The 14-point clustering on the real corpus (84.6 – 98.9) is therefore
   not evidence of correct scoring** — it is evidence that the score is
   dominated by a single term (the `140/sceneCount` scarcity penalty) that
   every produced feature satisfies, while the rule and dialogue channels
   contribute approximately nothing on the scripts the parser misreads.

**Recommendation:** the P0 gate should not be fielded against real writers
in its current state. Showing a screenwriter a "Dialogue & Voice = 99.8"
score that was computed without reading any dialogue is the exact failure
mode NORTH_STAR §1 warns against: *"a broken ruler is perfectly
reproducible; determinism is worthless if the verdict is wrong."* The
recruitment effort would validate demand for a number that does not yet
mean what it claims.

The two probes below are the replacement evidence P0 needs: they are
runnable today, reproducible by anyone, and they answer the upstream
question (does the score work?) for free, without a single recruitment
email.

---

## Probe 1 — Real-corpus scoring

**Script:** `scripts/probe-real-corpus.mjs`
**Output:** `scripts/output/real-corpus-scores.csv` (52 rows)
**Command:** `node scripts/probe-real-corpus.mjs`

Scores every `.fountain` file under `data/screenplays/` through the real,
frozen `runScriptDoctor()` pipeline and emits health/grade/verdict/issue
counts. Results:

```
48 valid screenplays (4 had scene-count collapse from parse failures):
  Health range:  84.6 – 98.9
  Mean:          93.2
  Std deviation:  4.5
  Band distribution:
    excellent (≥95):  20 scripts
    strong    (85-95): 27 scripts
    uneven    (50-85):  1 script   (a-scanner-darkly, H=84.6)
    troubled  (<50):    0 scripts
```

Every produced feature scores RECOMMEND or CONSIDER. The lowest-scoring
script in the corpus (A Scanner Darkly, H=84.6) is a produced, distributed,
Richard Linklater feature. The score does not separate good real writing
from anything — because there is no "anything" in this corpus. Probe 2
supplies the missing negative class.

---

## Probe 2 — Paired discrimination on real scripts

**Script:** `scripts/probe-paired-discrimination.mjs`
**Output:** `scripts/output/paired-discrimination.csv` (25 rows)
**Command:** `node scripts/probe-paired-discrimination.mjs`

Takes 5 strong real scripts (Ratatouille, Soul, Spider-Verse, Inside Out,
Up — all Oscar winners or nominees, all scoring ≥ 86 by the current
formula) and applies five mechanical, reversible degradations. Each
degradation isolates one signal channel the doctor reports on. If the
channel carries weight, the score must fall. Aggregate results:

| Degradation | Channel | Mean Δ | Min Δ | Max Δ | Verdict |
|---|---|---:|---:|---:|---|
| SCENE_SHUFFLE | global arc / position | −1.0 | −5.0 | +2.9 | **BLIND** — no signal |
| MIDPOINT_DROP | 3-act structure | −0.5 | −3.5 | +0.5 | **BLIND** — no signal |
| CLIMAX_RELOCATE | climax ordering | +0.6 | −0.1 | +1.2 | **BLIND** — no signal |
| DIALOGUE_FLATTEN | character/voice/dialogue | 0.0 | 0.0 | 0.0 | **BLIND** — no signal |
| SCENE_MERGE | scene boundaries | −5.3 | −25.7 | +3.8 | real but inconsistent |

**Reading the table.** Four of five channels show no discrimination
whatsoever — the score is unchanged when the script is structurally
destroyed. The one channel that moves (scene merge) is inconsistent: it
craters Soul (−25.7) and Inside Out (−7.6) but leaves Ratatouille unchanged
(0.0) and *raises* Spider-Verse (+3.8) and Up (+3.1). That is not
discrimination; it is the `140/sceneCount` scarcity term firing
unpredictably when scene count collapses.

The DIALOGUE_FLATTEN row is the most damning: replacing every line of
dialogue with "Hello." leaves the health score **byte-identical** across
all five scripts. This is not because the dialogue channel is weakly
weighted — it is because, as Probe 3 below shows, **the parser detects zero
dialogue in these scripts to begin with.** There is nothing to flatten.

---

## Probe 3 — Dialogue-blindness audit (root cause)

**Finding:** the Fountain parser (`src/lib/fountain.ts`) detects zero
dialogue blocks in 42 of 52 corpus scripts (81%), including every Pixar
and Spider-Verse screenplay.

**Root cause.** The character-cue detector at `src/lib/fountain.ts:75-89`
requires the previous block to be `empty` (blank line) before classifying
an all-caps line as a `character` cue, and the dialogue classifier at
line 100-101 requires the previous block to be `character`/`dual_dialogue`/
`parenthetical`. Both conditions assume **single-spaced** Fountain
(dialogue flows contiguously under its cue).

The non-matched corpus scripts are **double-spaced**: every line,
including dialogue, is followed by a blank line. Under double-spacing the
dialogue lines each become standalone `action` blocks separated by `empty`
blocks, so the dialogue-classifier's "previous block is character/paren"
condition never fires. The cue is detected (it matches the all-caps regex
and follows a blank), but the dialogue under it is not.

Evidence — same scene in two corpus formats:

```
DIALOGUE-AWARE  (cars-2-matched.fountain — single-spaced):
  LELAND TURBO
  Finn. My cover's been compromised.       ← contiguous, classified as 'dialogue'
  Everything's gone pear-shaped.

DIALOGUE-BLIND  (ratatouille-2007.fountain — double-spaced):
  REMY

  (sniffing Napoleon)                       ← blank line breaks the cue→dialogue chain

  Flour, eggs, sugar, vanilla bean,         ← classified as 'action', not 'dialogue'

  small twist of lemon...                   ← classified as 'action'
```

**Corpus-wide count** (`parseFountain` block types per file):

| Format | Scripts | Dialogue blocks detected |
|---|---:|---|
| Single-spaced ("-matched" variants + a few others) | 10 | 467 – 1268 each |
| Double-spaced (the majority of the corpus) | 42 | **0** each |

The discrimination harness in `tests/core/discrimination.test.ts` and the
calibration corpus in `server/nvm/analyze/calibration/corpus.ts` are both
single-spaced, so this blindness was invisible to every existing test.

**What this means for the score.** On 81% of the real corpus, the
"Dialogue & Voice" dimension, every `DIALOGUE_*` rule, the
`PROTAGONIST_DECISION_VACUUM` detector, and the bonding/interiority signals
that read dialogue are all operating on an empty input. The dimension
score of 99.8 reported for Ratatouille is computed from zero dialogue
samples — it is a default-floor number, not a measurement.

---

## Why this blocks P0 (not just P1)

The P0 protocol (`docs/user-validation/PHASE_TRACKER.md`) allows:
> Show the existing sample coverage report and observe without pitching.

The sample report is generated from `src/lib/sample-script.ts`, which is
hand-authored in single-spaced Fountain — so the sample report itself
*does* have dialogue detected, and the score on it is arguably meaningful.
The problem is **generalization**: a real screenwriter's draft, exported
from Final Draft or WriterDuet in standard double-spaced Fountain, will
hit the dialogue-blindness path and produce a report whose dialogue
dimension is a floor value. The writer will see "Dialogue & Voice = 99.8"
on a draft the engine never actually read for dialogue.

That is not a UX problem P0 can iterate around. It is a correctness
problem that turns the P0 core question — *"does this make you want to run
your own draft?"* — into a trap: the answer will be "yes, the number is
flattering," and the writer will trust a number that was computed without
reading their dialogue.

NORTH_STAR §1, law 2: *"Correct before reproducible. A broken ruler is
perfectly reproducible; determinism is worthless if the verdict is
wrong."*

---

## What this does NOT block

- **The deterministic surface is real and working.** The doctor boots
  keyless, produces byte-identical reports for the same input, and the
  reproducibility receipts (`contentHash`) are genuine. None of that is in
  question. The problem is upstream of reproducibility: the *input* the
  pipeline reads is incomplete.
- **The synthetic discrimination tests pass.** `tests/core/discrimination.test.ts`
  still discriminates on its 6 paired scenarios because those scenarios
  are single-spaced. The harness there is not wrong; it is testing a
  subset of the input space that hides the format bug.
- **Recruitment is not wasted effort in principle.** Once the parser reads
  dialogue on standard-format drafts, the P0 protocol is the right next
  step. This assessment says "fix the ruler before handing it to writers,"
  not "never talk to writers."

---

## Reproducibility

Both probes are deterministic and self-contained:

```bash
# Probe 1: score the whole real corpus (~90 seconds)
node scripts/probe-real-corpus.mjs
# → scripts/output/real-corpus-scores.csv

# Probe 2: paired discrimination on 5 strong scripts (~60 seconds)
node scripts/probe-paired-discrimination.mjs
# → scripts/output/paired-discrimination.csv
```

Neither script modifies the engine. Both import the real, frozen
`runScriptDoctor()` and `parseFountain()` and run them on inputs derived
from real produced screenplays. Re-running on any commit will reproduce
these numbers byte-for-byte (modulo the `analyzedAt` timestamp).

## Provenance

- Corpus: `data/screenplays/` — 52 produced screenplays, manifest-locked at
  `data/screenplays/manifest.json`. These are real, produced, distributed
  features (Pixar, DreamWorks, Sony Animation, Laika, etc.). They are the
  strongest possible "known-good" reference set available without human
  recruitment.
- Engine: HEAD of `main` at the time of this assessment. No engine files
  were modified.
- Probes: `scripts/probe-real-corpus.mjs`, `scripts/probe-paired-discrimination.mjs`
  (new this assessment). Outputs: `scripts/output/real-corpus-scores.csv`,
  `scripts/output/paired-discrimination.csv` (new this assessment).
