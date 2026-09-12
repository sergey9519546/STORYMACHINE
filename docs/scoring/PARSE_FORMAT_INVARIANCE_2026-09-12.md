# Parse and format invariance — measurement record

**Branch:** `scoring/adversarial-2026-09-12` (stacked on
`scoring/feature-length-defects`, rebased onto `main @ 8aa1f696`).
**Answers:** `docs/audits/2026-09-12-adversarial/engine-logic.md` findings 4, 5
and 13, and `writer-loop.md` finding 1.
**Reproduce:** every number below comes from
`node --experimental-strip-types tests/core/parse-format-invariance.test.ts`,
`npm run test:metamorphic`, `npm run benchmark:public`, and
`node scripts/check-doctor-output-identity.mjs`. No private corpus was read and
no AUC-24 value appears here.

## 0. The claim, and why it is a prerequisite rather than a nicety

Identical writing must score identically however it reaches the analyzer. The
public benchmark's whole measured signal on the 32 committed scripts is a
shuffle-drop mean health gap of 1.9 points and a climax-relocate gap of 1.5.
Against that, the adversarial review measured an 11.1-point swing on `main`
from re-wrapping dialogue, a 5.2-point swing from adding a title page, and a
4.7-point swing from curly apostrophes. An instrument that reads formatting at
several times the amplitude of the thing it claims to measure is not measuring
that thing, and every AUC in this repository inherits the problem. That is why
this work is a **prerequisite** to the P1 bet and not a parallel improvement:
running `npm run measure-real` before it re-locks a floor onto a scorer that
reads whitespace.

## 1. The dialogue reflow (finding 4)

### 1.1 The three defects, in the order the text meets them

1. **`src/lib/fountain.ts`.** A line was classified `dialogue` only when the
   PREVIOUS block was `character`, `dual_dialogue` or `parenthetical`. A
   previous block of type `dialogue` was not accepted, so the second and every
   subsequent line of a speech fell through to the default and was scored as
   ACTION PROSE — same words, same speaker, same order. The parenthetical
   branch immediately below it already accepted a previous `dialogue` block,
   so the omission was local to one condition.
2. **`server/nvm/analyze/screenplay-normalizer.ts`.** `normalizeScreenplay`
   returned clean input verbatim, so a speech the writer wrapped at 35 columns
   stayed three physical lines where the same speech typed on one line stayed
   one. Several analyzer signals read per-line shape.
3. **`server/nvm/analyze/doctor.ts`.** `compiled.fountain` — the text the 14
   revision passes read — was the RAW submission, while `mergedAnalysis.records`
   came from `normalizeScreenplay(fountain)`. Two texts, one report.

### 1.2 The fixes

1. The dialogue element runs from its cue to the next blank line. Inside that
   span a non-blank line is a parenthetical if it is wrapped in `()` and
   dialogue otherwise, with four escapes — a forced action `!`, a forced
   heading `.`, a lyric `~`, and a recognised `INT./EXT.` heading — because
   real drafts drop the blank line before those and reading them as dialogue
   would be worse than the bug. The old
   `prev is character | dual_dialogue | parenthetical -> dialogue` clause is
   not deleted so much as generalised; keeping both would be two definitions
   of one rule, which is how the missing case survived.
2. `joinWrappedDialogue(text)` joins each run of consecutive dialogue lines
   into one element, using `parseFountain` itself to find the runs so the rule
   stays written down once. The FIRST line of a run keeps its bytes (its
   indentation is the speech's own); only continuation lines are trimmed, so a
   speech that was never wrapped comes back out unchanged. `normalizeScreenplay`
   applies it on the clean path.
3. `compiled.fountain` is `joinWrappedDialogue(fountain)`.

### 1.3 What it moved

The transform: re-wrap DIALOGUE lines only, at 30/35/40/60 columns, locating
them with the repository's own parser. No blank line introduced, no word
changed (asserted: the whitespace-normalised text is byte-identical), scene
count unchanged on every script. 32 scripts × 4 widths = 128 pairs.

| tree | pairs moved | mean Δ | max abs Δ | worst case |
|---|---|---|---|---|
| branch base (`78ec4464`) | **119 / 128** | +0.115 | **8.8** | `room-12` at 60 cols 63.9 → 55.1, **CONSIDER → PASS** |
| + parser fix only | 119 / 128 | +0.236 | 5.9 | — |
| + normalizer join | 111 / 128 | +0.086 | 2.0 | — |
| + pipeline reads the joined text | **0 / 128** | 0.000 | **0.0** | — |

The first three rows are why the fix is three fixes: each one closes a
different seam, and any one of them alone leaves a swing larger than the signal.

### 1.4 What it did NOT move

* **The public benchmark is byte-identical.** All six AUCs, all six intervals,
  all three sign-count triples, the manifest and the split are unchanged —
  `SHUFFLE_DROP` 0.8750 / 0.8291 (28/4/0), `CLIMAX_RELOCATE` 0.5938 / 0.5269
  (18/12/2), `DIALOGUE_FLATTEN` 1.0000 / 1.0000 (32/0/0). Every one of the 32
  scripts writes one-line speeches, so `joinWrappedDialogue` is a no-op on
  them — which is asserted, per script, in the invariance suite.
* **Every committed fixture's report is byte-identical.** The output-identity
  harness over all 45 fixtures (20 screenplays, 20 calibration samples, the P0
  sample, four synthetic scene-count fixtures) reports
  `OUTPUT IDENTITY: PASS — all 45 reports are byte-identical modulo the
  ignored key(s) [provenance.engineCommit]`. `provenance.engineCommit` is
  ignored because the baseline is a `git archive` tree with no commit stamp
  (`"dev"`); it is not a report field any fix in this range touches.
* Calibration 25/25, blind pairs included, metamorphic 8 hard passes.

### 1.5 The guard shown failing first

`tests/core/parse-format-invariance.test.ts` copied unchanged onto the branch
base tree: **35 of 37 assertions fail**. On this tree: **37 of 37 pass**. The
two that pass on both are the escape-clause test and the dialogue-flatten
both-directions control, which is the point of having them.

### 1.6 The half measured and NOT taken

`compiled.fountain = normalizeScreenplay(fountain)` — i.e. handing the passes
the same reconstruction the analyzer gets on EVERY path, not just the clean
one — is the stronger version of fix 3. It is not taken here. On a
double-spaced import `normalizeScreenplay` also uppercases cues and reflows
action paragraphs, and the documents that take that branch are exactly the
scraped PDFs of the private AUC-24 corpus, so the change cannot be measured
from this tree at all: it would be a scoring change whose entire blast radius
is invisible here. `joinWrappedDialogue` is the half that is provably a no-op
on every committed fixture. The owner's `npm run measure-real` is what would
settle the other half, and it should be measured as its own change, not
smuggled in with this one.
