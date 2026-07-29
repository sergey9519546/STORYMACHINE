# P0 Readiness Assessment — 2026-07-28

**Status:** Evidence-only. No engine, formula, rule, or detector was modified
to produce this document. Two measurement scripts were added under `scripts/`;
their outputs are committed under `scripts/output/`.

## RETRACTION (read first)

An earlier draft of this assessment (commit `41764d8`, same date) claimed the
Fountain parser was "dialogue-blind on 42 of 52 real screenplays (81%),
including every Pixar and Spider-Verse screenplay," and that the "Dialogue &
Voice" dimension was therefore a floor value computed from zero dialogue on
those scripts.

**That claim was false. It is retracted in full.**

The error was in the measurement instrument, not the engine. My
`DIALOGUE_FLATTEN` degradation called `parseFountain()` directly on raw,
double-spaced input. The engine never does this: `analyzeFountainText()` calls
`parseFountain(normalizeScreenplay(fountain))`, and `normalizeScreenplay()`
(`server/nvm/analyze/screenplay-normalizer.ts`) exists *specifically* to
collapse double-spaced imported scripts into clean Fountain before parsing.
That module's header comment documents the exact issue I "discovered" —
including naming Ratatouille, Mulan, and Coco by name — as a known problem
the normalizer was built to fix.

Verified through the real pipeline (`analyzeFountainText`, which normalizes):

| Script | Dialogue lines detected |
|---|---:|
| ratatouille-2007 | 799 |
| soul-2020 | 822 |
| up-2009 | 687 |
| inside-out-2015 | 1,028 |
| spider-man-into-the-spider-verse-2018 | 1,033 |

Of 52 corpus scripts, only **3** have zero detected dialogue — and all three
(`big-hero-6-2014`, `moana`, `brave-2012`) are scene-count-collapse parse
failures (1–11 scenes), not dialogue-blindness. The engine reads dialogue
correctly on 49 of 52 real scripts.

After fixing the degradation to normalize before parsing (matching the
engine's own input path), `DIALOGUE_FLATTEN` produces a **strong, consistent
drop** (mean −15.3 health points across 5 scripts; range −4.3 to −47.2). The
dialogue channel is, in fact, the *strongest* discriminator in the harness.

The corrected harness and corrected findings below replace the earlier
draft. The non-dialogue findings from that draft (corpus clustering,
shuffle/drop/climax/merge deltas) were always valid — they ran through
`runScriptDoctor`, which normalizes — and are reported unchanged below. The
bug was confined to the dialogue claim.

**Lesson, recorded against myself:** NORTH_STAR §1 law 2 — *"correct before
reproducible"* — applies to measurement instruments too. My probe was
perfectly reproducible and perfectly wrong, because it bypassed the
normalization layer the engine depends on. I asserted a catastrophic engine
bug from a probe that didn't exercise the engine's actual input path. The
correction was one function call (`parseFountain` →
`analyzeFountainText` / normalize-then-parse); the false claim should never
have been committed without that check.

---

## TL;DR (corrected)

Two runnable probes were built over the 52 real produced screenplays in
`data/screenplays/` to answer the upstream P0 question: **does the score
the report is built on actually discriminate?**

The answer, on the corrected evidence: **the score discriminates on two of
five signal channels and is blind on three.**

1. **Dialogue channel: strong, consistent signal.** Replacing all dialogue
   with "Hello." drops health by 4–47 points (mean −15.3) across 5
   Oscar-winning scripts. This is the strongest discriminator measured.
2. **Scene-boundary channel: real but inconsistent signal.** Removing scene
   headings drops health on some scripts (Soul −25.7, Inside Out −7.6) but
   leaves others unchanged (Ratatouille 0.0) or raises it (Spider-Verse
   +3.8, Up +3.1). The signal is the `140/sceneCount` scarcity term, which
   fires unpredictably when scene count collapses.
3. **Global-arc / position channel: blind.** Shuffling all scenes into
   random order moves the score by ≤1 point on 3 of 5 scripts (Ratatouille
   0.0, Inside Out +0.1, Up +2.9). This empirically confirms NORTH_STAR §2
   law #1 — *"lexicon signals carry content, not position"* — on real
   scripts, not just synthetic ones.
4. **3-act structure channel: blind.** Deleting the middle 20% of scenes
   (the structural midpoint) moves the score by ≤0.5 points on 4 of 5
   scripts.
5. **Climax-ordering channel: blind.** Moving the final scene to position 2
   moves the score by ≤1.2 points on all 5 scripts.

**What this means for P0:** the score is not broken — it reads dialogue,
it reads scene boundaries — but it **cannot see document-scale structure**
(arc, three-act spine, climax position). A writer who shuffles their scenes
into random order would get nearly the same score. This is a known, named
limitation (NORTH_STAR §2, law #1; the bounded structural-deduction pathway
is the documented P1 fix), now confirmed empirically on real produced
screenplays.

**Recommendation:** the P0 gate *can* be fielded in its current state — the
report is honest about what it measures (per-scene signals, dialogue,
dimensions) and the sample script is single-spaced so all channels fire.
But the report should not be presented to writers as a verdict on
*structural* quality until the position-reading gap closes. The probes below
are the runnable evidence for that narrower claim.

---

## Probe 1 — Real-corpus scoring

**Script:** `scripts/probe-real-corpus.mjs`
**Output:** `scripts/output/real-corpus-scores.csv` (52 rows)
**Command:** `node scripts/probe-real-corpus.mjs`

Scores every `.fountain` file under `data/screenplays/` through the real,
frozen `runScriptDoctor()` pipeline. Results (48 valid; 4 had scene-count
collapse from parse failures):

```
Health range:  84.6 – 98.9
Mean:          93.2
Std deviation:  4.5
Band distribution:
  excellent (≥95):  20 scripts
  strong    (85-95): 27 scripts
  uneven    (50-85):  1 script   (a-scanner-darkly, H=84.6)
  troubled  (<50):    0 scripts
```

Every produced feature scores RECOMMEND or CONSIDER. This is **not** evidence
of a broken score — every script in this corpus is genuinely good (all were
greenlit, financed, and shipped), so a tight cluster among them is arguably
correct. The corpus lacks a negative class, which is why Probe 2 supplies
one by degrading known-good scripts.

---

## Probe 2 — Paired discrimination on real scripts

**Script:** `scripts/probe-paired-discrimination.mjs`
**Output:** `scripts/output/paired-discrimination.csv` (25 rows)
**Command:** `node scripts/probe-paired-discrimination.mjs`

Takes 5 strong real scripts (Ratatouille, Soul, Spider-Verse, Inside Out,
Up — all Oscar winners or nominees, all scoring ≥ 86 by the current
formula) and applies five mechanical, reversible degradations. Each
isolates one signal channel the doctor reports on. Aggregate results:

| Degradation | Channel | Mean Δ | Min Δ | Max Δ | Verdict |
|---|---|---:|---:|---:|---|
| SCENE_SHUFFLE | global arc / position | −1.0 | −5.0 | +2.9 | **BLIND** — no signal |
| MIDPOINT_DROP | 3-act structure | −0.5 | −3.5 | +0.5 | **BLIND** — no signal |
| CLIMAX_RELOCATE | climax ordering | +0.6 | −0.1 | +1.2 | **BLIND** — no signal |
| DIALOGUE_FLATTEN | character/voice/dialogue | −15.3 | −47.2 | −4.3 | **STRONG signal** |
| SCENE_MERGE | scene boundaries | −5.3 | −25.7 | +3.8 | real but inconsistent |

**Reading the table.** Two channels discriminate; three are blind. The blind
channels are exactly the document-scale structural signals — scene order,
act spine, climax position — that NORTH_STAR §2 law #1 names as a known
limitation: lexicon signals carry *content*, not *position*, so reordering
scenes preserves content while destroying structure, and the score does not
notice.

The DIALOGUE_FLATTEN row is the strongest result in the harness: flattening
all dialogue to "Hello." drops Inside Out from 87.6 to 40.4 (−47.2), a
passing-grade script collapsing to "troubled." The dialogue channel is
alive, weighted, and discriminates hard.

The SCENE_MERGE inconsistency (Ratatouille 0.0 vs Soul −25.7) is the
`140/sceneCount` scarcity term firing when scene count collapses below the
formula's expectation, which depends on how many `.`-forced headings the
normalizer preserves versus how many scene boundaries SCENE_MERGE strips —
script-dependent, not a clean signal.

---

## What this means for P0

The score is not the broken ruler the retracted draft claimed. It reads
dialogue (strongly), it reads scene boundaries (inconsistently), and it
produces defensible per-scene signals. The P0 sample report — generated
from a single-spaced hand-authored sample — exercises all these channels.

What the score *cannot* do is see document-scale structure. A writer who
shuffles their scenes, deletes their midpoint, or relocates their climax
will see the score barely move. This is the genuine P1 gap, now confirmed
on real produced screenplays rather than synthetic fixtures:

- NORTH_STAR §2 law #1: *"Lexicon signals carry content, not position …
  Global-arc-position claims require signals that read FOR position, not
  just content."*
- NORTH_STAR §2 law #2: *"Document-scale findings (global arc, structural
  collapse) need the bounded structural-deduction pathway … not more
  detectors hoping to out-fire the normalization."*

The probes make these laws **measured on real writing**, which is exactly
the standard NORTH_STAR §1 law 3 demands: *"Measure discrimination on
runnable, real writing — always."*

**Fielding decision:** P0 can proceed against real writers with the current
report, provided the report does not claim to verdict on structural
ordering. The current sample report's language should be checked against
this — if it claims arc/structure verdicts it cannot support, that is the
honest-degradation violation to fix before fielding, not a reason to block
fielding. The probes give the recruitment effort a defensible scope: "we
are validating the dialogue/dimension/per-scene surface; structural-arc
verdicts are P1 work."

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
`runScriptDoctor()` and run it on inputs derived from real produced
screenplays. Re-running on any commit will reproduce these numbers
byte-for-byte (modulo the `analyzedAt` timestamp).

## Provenance

- Corpus: `data/screenplays/` — 52 produced screenplays, manifest-locked at
  `data/screenplays/manifest.json`. These are real, produced, distributed
  features (Pixar, DreamWorks, Sony Animation, Laika, etc.).
- Engine: HEAD of `main` at the time of this assessment. No engine files
  were modified.
- Probes: `scripts/probe-real-corpus.mjs`,
  `scripts/probe-paired-discrimination.mjs` (new this assessment).
  Outputs: `scripts/output/real-corpus-scores.csv`,
  `scripts/output/paired-discrimination.csv` (new this assessment).
