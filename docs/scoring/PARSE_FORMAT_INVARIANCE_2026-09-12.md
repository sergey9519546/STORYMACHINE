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

Identical writing must score identically however it reaches the analyzer.
**That sentence is the goal, not a claim about this tree.** What is evidenced
here is the eighteen transforms below, each measured on all 32 committed
scripts and each asserted per script in
`tests/core/parse-format-invariance.test.ts`. One named transform still moves
all 32 and is pinned rather than fixed — Fountain's forced cue `@`, §3.3 — and
two more change the ELEMENT rather than its formatting and are therefore
outside the claim, also §3.3. Read the sentence as scoped to what is asserted;
the honest form of a universal claim is a list of the cases you have closed.

The public benchmark's whole measured signal on the 32 committed scripts is a
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
3. `compiled.fountain` is `stripTitlePage(normalizeScreenplay(fountain))` —
   the same text the analyzer reads, on every path. **This line said
   `joinWrappedDialogue(fountain)` until round 2 of this review, and that was
   wrong from `ef683d4e` onwards** (see §1.6).

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

`tests/core/parse-format-invariance.test.ts` copied unchanged onto a
`git archive 78ec4464` export of the branch base:

| file version | on the `78ec4464` export | on this tree |
|---|---|---|
| round 1 (`git show 85273742:...`, 49 tests) | **44 fail, 5 pass** | 49 of 49 pass |
| round 2 (as committed, 59 tests) | **53 fail, 6 pass** | **59 of 59 pass** |

*(Corrected in round 2: this section read "35 of 37 assertions fail" and "37 of
37 pass", which was the count while the file was being written and was never
re-measured against the committed file. The direction of the claim is
unaffected — it is stronger than it was written. The independent review
measured 44 of 49 first; this is that number, reproduced.)*

The handful that pass on the base pass for a reason: the escape-clause test,
the dialogue-flatten both-directions control, and the transforms that were
already invariant before any of this work (CRLF, the byte-order mark, the
contentHash separation). The round-2 rows are also shown failing first against
the ROUND-1 TIP rather than the base — `git archive 85273742`, where **8 of 59
fail**: the three forced-element markers, the three cue-extension spellings and
both halves of the `(O.C.)` mechanism test. See §3.

### 1.6 The stronger half WAS taken, and three places said it was not

**Corrected in round 2, from the independent review's one blocking finding.**

At `716ee817` (the dialogue-reflow commit) `compiled.fountain` was
`joinWrappedDialogue(fountain)`, and this section said the whole normalizer was
the stronger version, measured and deliberately not taken. At `ef683d4e` (the
next commit) the line became `stripTitlePage(normalizeScreenplay(fountain))` —
which is right, because the seam exists to make the passes read the analyzer's
text — and this section, `doctor.ts`'s comment above the line, and the lane
report's §5 all went on saying the opposite. Nothing was concealed and nothing
was smuggled: it is drift between two commits, and it is corrected here rather
than reverted, because the stronger version is the one the branch should ship.

**What it actually does.** `normalizeScreenplay` is the typographic fold, the
non-printing strip, the forced-marker strip and — on a double-spaced import
only — the full reconstruction: wrapped fragments joined, action paragraphs
reflowed, cues uppercased, the blank line between a cue and its speech closed.
The 14 revision passes now receive that text. On a single-spaced draft the
difference from the join alone is the fold and the strips; on a double-spaced
import it is the reconstruction as well.

**Measured.** `data/screenplays/dead-frequency.fountain` re-emitted in the shape
a scraped PDF arrives in — every line hard-wrapped at 45 columns with a blank
line after every line, not one word changed — scored on a `git archive`
export of `85273742` and on the same export with this one line reverted to the
expression the branch documented:

```
node --experimental-strip-types <scratch>/ds.mjs      (run from each tree root)

  compiled.fountain = stripTitlePage(normalizeScreenplay(f))   health 81.4, 182 issues, c/m/n 2/32/148
  compiled.fountain = joinWrappedDialogue(f)  (as documented)  health 82.3, 158 issues, c/m/n 2/28/128
  the same file NOT re-emitted                                 health 81.7, 173 issues / 172 issues
```

0.9 health and 24 issues between the two expressions, on exactly the document
shape the private corpus is made of. Read the third row with them: the version
this branch ships is **0.3** from the un-re-emitted reading of the same
screenplay, and the version it documented is **0.6** away. The stronger half
halves the format gap it exists to close, which is the affirmative case for
keeping it, and it is also why its whole effect is invisible from this tree:
**no fixture in this repository is double-spaced.**

**What the owner must do with it** is in
`docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`'s pending entry, beside the
strip-order change of row 8, because the two compound: on a double-spaced
import the analyzer's text and the passes' text both change. It is the
corpus-visible change on this branch with the largest expected effect.

## 2. The other ten transforms (findings 5, 13, and the writer's-loop finding 1)

Same corpus, same method: 32 committed scripts, one transform each, exact
equality on `health` / `grade` / `verdict` / `sceneCount` / `totalIssues` /
`bySeverity`. All eleven rows are asserted per script in
`tests/core/parse-format-invariance.test.ts`.

**READ THE TWO COLUMNS AS THE SAME STATISTIC, WHICH THEY ARE NOT BY DEFAULT.**
*(Clarified in round 2, from the independent review's non-blocking item 4.)*
The "after" column is `0 / 32` over that whole six-field surface — no script
moves on any of the six. The "branch base" column counts something narrower:
how many scripts' **health** moved, which is the figure the base was measured
with. The two are not interchangeable, and the gap is not rhetorical: on the
base, adding a title page moves SOME field of the six on 32 of 32 scripts while
moving health on 29. Where a before-number is quoted below it is the
health-move count; every after-number is the six-field count, which is the
stronger of the two.

| transform | branch base | after |
|---|---|---|
| dialogue reflow, 30/35/40/60 cols | 119 / 128 pairs, max 8.8, 1 verdict flip | **0 / 128, 0.0** |
| a standard Fountain title page | 29 / 32, range [-0.5, +1.2] | **0 / 32** |
| curly apostrophes (U+2019) | 21 / 32, range [-0.6, +1.6] | **0 / 32** |
| curly double quotes (U+201C/D) | 7 / 32, up to +4.3 | **0 / 32** |
| a boneyard note before the script | 20 / 32 | **0 / 32** |
| a boneyard note after the script | 19 / 32 | **0 / 32** |
| a boneyard padded x800 | **32 / 32, mean +7.206, up to +18.6, 4 verdict flips CONSIDER -> RECOMMEND** | **0 / 32** |
| an inline `[[note]]` | 22 / 32 | **0 / 32** |
| a synopsis line | 20 / 32 | **0 / 32** |
| a section heading | 16 / 32 | **0 / 32** |
| CRLF line endings | 0 / 32 | 0 / 32 |
| a byte-order mark | 0 / 32 | 0 / 32 |

### 2.1 The four fixes

1. **`foldTypography`** — NFKC, then an explicit curly-to-ASCII quote fold.
   NFKC alone does not map curly quotes (they are not compatibility-equivalent),
   so the fold is written out; NFKC still runs because it handles the rest of
   the same family, the ligatures a PDF extractor emits and the non-breaking
   spaces a word processor leaves. Em and en dashes are deliberately NOT folded:
   the lexicons read them on purpose.
2. **`stripNonPrinting`** — the four constructs Fountain defines as never
   printed (boneyard, notes, synopses, sections) leave the text the analysis
   reads. Block types come from `parseFountain`, not a regex, so a `#` inside a
   line of dialogue is never mistaken for a section heading.
3. **`titlePageBlockCount` / `stripTitlePage`** — the spec's rule exactly: a
   title page exists only when the document's first non-blank line is a `Key:`
   line, and it runs to the first blank line, with indented continuations. Any
   other document preamble (a `FADE IN:`, an epigraph) is left where it is.
   The text is not discarded — `analyzeFountainText` still hands the pre-heading
   blocks to the clue walk as `titlePageText`, which is what stops a script's
   own title being read as a planted clue.
4. **The denominator.** `wordCount` is the printing words of the analyzed
   scenes, not `fastWordCount(<raw submission>)`. `submittedWordCount` keeps the
   raw figure.

`aggregateReport` now computes the canonical analysis text once and every signal
that used to take the raw submission reads it instead — the emotional arc, the
page estimate, anti-slop, theme, interiority, mirror scenes, silence, bonding,
the cold-open promise, pattern establishment and the structural signals.
`computeContentHash` deliberately still hashes the SUBMITTED bytes: two files
that normalise to the same screenplay are still two different submissions, and
that is asserted.

### 2.2 What it cost

This is the expensive half of the lane and the cost is a real one.
`docs/p1-benchmark/PUBLIC_BENCHMARK_2026-09-06.md` §14 carries it in full: four
floors move DOWN, the primary shuffle-drop AUC from 0.8750 to **0.8438**, and
the whole of that movement is attributable by rerun to the denominator change
alone (the three parse fixes move it by 0.0000). The cause is that all 32
fixtures open with their own CC0 licence record in a boneyard, worth 24-151
words each, and those words were counted as screenplay. The benchmark's
separation was partly a measurement of this repository's filing habits.

Per-script: all 32 fall, mean **-1.453**, range -0.1 to -12.3, two verdicts
CONSIDER -> PASS. The 20 calibration samples are byte-identical. The
output-identity harness is a deliberate **FAIL** — 25 of 45 fixtures differ
(20 screenplays, the P0 sample, 4 synthetic scene-count fixtures), on the keys
`score`, `issueCount`, `minor`, `major`, `percentile`, `percentileDescriptor`,
`summary` and `freshness`, plus the always-ignored `provenance.engineCommit`.
The 20 calibration fixtures do not differ.

### 2.3 What the owner's AUC-24 run can and cannot settle

The private corpus is real screenplays. Whether they carry boneyards, notes or
title pages is not knowable from here, and that is exactly what decides how far
AUC-24 moves. Three cases, and nothing in this repository can tell them apart:

* **No non-printing text and no title page.** The denominator is unchanged and
  AUC-24 should not move at all.
* **A title page on most drafts** (the likely case for real screenplays). Every
  script loses a few words from the denominator, both halves of each matched
  pair equally, so the level shifts and the rank statistic largely does not.
* **Substantial boneyard or note text.** Then the same correction that cost
  0.031 here will move AUC-24 by an amount proportional to how much of each
  draft was never meant to be printed, and the direction is not predictable
  from this corpus.

AUC-24 **cannot** settle whether the correction is right — that is a question
about what a screenplay is, and it is answered by the format specification, not
by a statistic. If AUC-24 falls, the finding is about the private corpus's
document shape, and the response is to look at what those drafts contain, not
to move `AUC24_FLOOR`.

---

## 3. Round 2: the forced-element markers and the cue extensions

Built after the independent review
(`docs/audits/2026-09-12-adversarial/scoring-review.md`), whose author measured
one transform this lane had not thought of and found a second in the same
family. Both are the same defect in two places: **a character that tells the
parser what an element IS was left in the element's text and scored as prose.**

Method as above — 32 committed scripts, one transform each, exact equality on
the six-field surface, asserted per script. The "before" column is measured on a
`git archive 85273742` export (the round-1 tip), not on the branch base, because
these are pre-existing defects that round 1 neither introduced nor closed.
Reproduce with `node --experimental-strip-types <scratch>/markers.mjs` run from
each tree root, or by running the suite itself.

### 3.1 The forced-element markers

A marker is applied where it is **redundant** — declaring the element the line
already parses as — so not one printed character changes and no element changes.
That is what makes each row a format transform and not a writing one.

| transform | at `85273742` | here |
|---|---|---|
| forced-action `!` on every action line | **32 / 32, mean +1.056, largest +7.0 on room-12, one verdict PROMOTED PASS → CONSIDER** | **0 / 32** |
| forced-heading `.` on every scene heading | **32 / 32, mean +0.659, largest +2.5** | **0 / 32** |
| forced-transition `>` on every transition line | **5 / 6 applicable, mean −4.080, largest −15.7** | **0 / 6** |
| forced-cue `@` on every character cue | **32 / 32, mean −1.172, largest −26.8** | **32 / 32 — NOT FIXED, see §3.3** |

`!` was the reviewer's find and is the reason this section exists: a
never-printed marker, applied mechanically, worth up to 7 points and a verdict
promotion. `.` matters because several scripts in the private corpus mark scenes
that way (`screenplay-normalizer.ts`'s own header names Ratatouille, Coco and
Up). `>` is the largest per-script mover of the three that are fixed, because
this parser has no forced-transition branch at all: `>CUT TO:` was an ACTION
LINE, `>` and all.

**The rule, and the line it must not cross.** `stripForcedMarkers` removes a
marker only when the whole document still parses to the element the marker
DECLARED **and** every unmarked line still parses to what it parsed to before.
The check is a re-parse, not a heuristic. Scene segmentation is the strongest
signal the engine has — the doctor's own measurement puts scene-count scarcity
at AUC ~0.938 against ~0.076 for the entire weighted-rule channel — so a `.`
silently dissolving a scene heading would be far worse than the leak it closed.
A marker that fails the test keeps its character, and its leak with it.

### 3.2 The cue extensions

| transform | at `85273742` | here |
|---|---|---|
| every extension respelled without its periods — `(V.O)`, `(O.S)`, `(CONTD)` | **12 / 14 applicable, largest −1.3 on soft-launch** | **0 / 14** |
| every extension respelled with no punctuation — `(VO)`, `(OS)` | **12 / 14 applicable** | **0 / 14** |
| every extension in lower case — `(v.o.)` | **12 / 14 applicable** | **0 / 14** |
| `(V.O.)` → `(V.O)` alone (the review's own transform) | **8 / 8 applicable** | **0 / 8** |
| a curly apostrophe inside `(CONT’D)` | 0 / 9 (the typographic fold already covered it) | 0 / 9 |

`CHARACTER_CUE_RE` admitted only the canonical spellings, so `MARY (V.O)` was
not a cue: the line was action prose and so was the speech beneath it.
`normalizeCueExtensions` folds the variants onto the canonical set at the
analysis seam, before both strips, because those read block types from
`parseFountain` and a cue the parser cannot see is a speech it types as action.
The fold applies only to a line that is a cue name followed by nothing but
parenthetical tails, and only when EVERY tail is a recognised extension, so
`MARY (into phone)` — a wryly-directed cue this parser has never accepted — is
left exactly as it was, and so is `THE SIGN READS KEEP OUT (beat)`.

**One line DOES change class, and it is a consistency fix rather than a new
ambiguity** *(named in round 3, from the round-2 review's non-blocking item 4)*.
An all-caps action-shaped line ending in an extension — `DOOR SLAMS (OS)` — is
now a character cue with the next line as its dialogue. It was already one when
spelled canonically: measured on a `git archive 85273742` export,
`DOOR SLAMS (O.S.)` parsed `character` + `dialogue` there while
`DOOR SLAMS (OS)`, `DOOR SLAMS (O.S)` and `A PHONE BUZZES (VO)` parsed
`action` + `action`. So the fold does not create the class — it removes a
**spelling-dependent** inconsistency inside a class the parser has always had.
Whether an all-caps line ending in `(O.S.)` should be a cue at all is a
separate question about `CHARACTER_CUE_RE`'s shape, and it is not answered by
spelling one of its four aliases differently from the other three.

**Five copies of one rule, and what the fifth copy cost.** The extension set
lived inline in `CHARACTER_CUE_RE` and again, byte-identically, in
`fountain-analyzer.ts`, `locate.ts`, `prioritize.ts` and `truth-extraction.ts`,
each with a comment saying a shared helper was not worth exporting. All five
omitted `(O.C.)`. So an off-camera cue failed the cue test and its speech became
action prose — and had it passed, the four strips would have made
`MARY (O.C.)` a second character. One definition now: `CUE_EXTENSIONS` and
`stripCueDecorations` in `src/lib/fountain.ts`, with the cue regex built from
the set and admitting more than one tail, so `MARY (V.O.) (CONT'D)` is a cue.

### 3.3 What round 2 did NOT close, with its size

* **The forced cue `@` is not stripped.** It is the largest format sensitivity
  measured anywhere on this branch — 32 of 32 scripts, up to 26.8 points — and
  it is pinned as a two-sided assertion with that number rather than left to be
  rediscovered. It is not fixed here because honouring it is a PARSER FEATURE
  wearing a normaliser's clothes: unlike `!`, `.` and `>`, removing `@` changes
  the type of every line BELOW the cue (action becomes dialogue), and the
  editor, PDF, FDX and DOCX renderers would all still print the marker the
  analysis had decided was invisible. `src/lib/fountain.ts` has said since
  2026-09-03 that teaching every renderer to strip it is a separate change; it
  still is, and it is worth its own lane.
* **The lyric `~` and the centered `> … <` are outside the claim, not inside
  it.** Neither has a redundant application: no line in any of these 32 scripts
  parses as `lyrics` or `centered` already, so adding the marker necessarily
  changes the ELEMENT. Measured for the record — wrapping every transition line
  as `> … <` moves 5 of 6 applicable scripts (largest −1.6) and a `~` on one
  dialogue line moves 8 of 32 (largest +0.5) — and named as element changes
  rather than counted as invariance failures. Both block types are skipped by
  `extractSceneContent`, so neither carries a word into the heuristics either
  way.
* **Nothing was re-locked.** All 45 output-identity fixtures are byte-identical
  against `85273742` with `GIT_SHA` pinned equal, `npm run benchmark:public`
  reproduces 0.8438 / 0.7896, 0.5938 / 0.5234 and 1.0000 / 0.9814, and no floor
  constant in `scripts/lib/auc.ts` was touched. The 32 committed scripts carry
  no forced marker and no non-canonical extension — which is exactly why these
  defects survived a benchmark, and why every "before" number above had to be
  produced by a synthetic transform.
