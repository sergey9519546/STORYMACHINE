# Forced-cue lane report — `scoring/forced-cue`

**Worktree:** `/home/user/wt-forcedcue`
**Branch:** `scoring/forced-cue`, pushed to origin after every commit.
**Tip:** `6d8f1653`. The pre-rebase history ended at `5be366be`; the rebase
onto `4cf5b2f3` produced `22c6b03f`, and `6d8f1653` is the commit carrying the
rebase section at the end of this report. The `git log` and `git ls-remote`
blocks below were taken before those two commits existed — the off-by-one a
self-recording report always has, stated where each block appears.
**Base:** `4cf5b2f3` — `origin/scoring/adversarial-2026-09-12`. The lane was
CUT from `3124a94e` and every before/after number below is measured against
that commit; it was rebased onto `4cf5b2f3` at the end, and that rebase and
its re-measurements are the last section of this report.
**Answers:** the scoring lane's round-2 residual (`scoring-lane-report.md`
R2.2, the row reading "32 / 32 — NOT FIXED") and the round-2 review's
judgement that pinning it was honest scoping: "no renderer strips `@`, so
honouring it in the normaliser alone would create the analyzer/renderer split
this branch exists to close." That split is what this lane closes; the marker
is now read by the parser AND dropped by every renderer, so neither half can
be true without the other.

This is scoring-path work. It is **not merged here** and waits for the owner's
`npm run measure-real`. No AUC-24 number is stated, implied or projected
anywhere in this report, in the receipt, or in any file on this branch.

```
6eeef062 docs(audit): drop a generic intensifier the pre-commit hook flagged
cb4cc957 docs(audit): the lane report's final numbers — the full suite, the tip, and my own miniature of the round-9 mistake
703903d9 fix(test): the ROUND 9 oracle names the bound it actually trips
4abd675f docs(audit): the forced-cue lane report, and receipt row 12 for what the full suite found
b3b37277 fix(guard): the shape guard learns the forced cue too — ROUND 9 of a pattern with eight prior rounds
ca8de756 docs(receipt): row 11 and the one column the owner reads for it
c72ea5a8 test(fountain): the round-2 `@` pin flips — it asserted 32 of 32, it asserts 0 of 32
ddc9e3bf feat(imports): a Final Draft character whose name is not a Fountain cue comes back as a cue
cfe5eef4 feat(fountain): honour the forced character cue `@` at the parser seam and in every renderer
```

---

## 1. What `@` is, and where it leaked

Fountain gives every element an explicit marker for the case where the
inference cannot reach it: `!` forces action, `.` forces a scene heading, `>`
forces a transition, `~` a lyric — and **`@` forces a Character cue**. None of
the five is ever printed. They say what a line IS; the page shows the line
without them.

`@` is the one that matters most, because this parser's cue test is an
ALPHABET. `CHARACTER_CUE_RE` admits a line of cased-script capitals
(`\p{Lu}\p{Lt}` plus marks, digits, and a short punctuation set) optionally
carrying `^` and the four recognised extensions. That is a deliberate
decision with a documented reason — "all caps" is a signal that exists only in
a cased script, so admitting `\p{Lo}` would make every short line of Japanese
or Hebrew action a character cue. The decision is only defensible while a
caseless writer has some other way to mark a cue, and `@` is that way. Until
this lane, `src/lib/fountain.ts` said so in a comment and did not implement it:

> Fountain's own escape hatch for those scripts is the forced-cue `@` prefix,
> which this parser does not implement today … A caseless cue is therefore
> still parsed as `action`, exactly as before.

So the trade-off was not a trade-off. It was a dead end.

**Where it leaked, and how far.** `@MARY` failed the cue test, so it was typed
`action`. A cue is what opens a dialogue block, so **every line of the speech
below it was action prose too** — the words were scored as description, the
speaker did not exist, `dialogueLineCount` did not count the speech, and the
dialogue/action ratio moved. That is why this was the largest format
sensitivity ever measured on this branch: applying a **redundant** `@` (on a
line the parser already typed as a cue, so not one printed character changes)
moved **32 of 32** of the committed public scripts, mean −1.172, largest
**−26.8** on `room-12`.

Three further leaks, each measured below:

1. **Every renderer printed the marker.** `screenplay-layout.ts` (which the
   PDF writer draws from), `fdx.ts` and `docx.ts` each carried a
   byte-identical eight-line `cleanText` stripping `.`, `!`, `^`, `>…<`, `~`,
   `#` and `=`. None knew about `@`, and all three were reached only for
   blocks the parser had typed — so with the parser fixed and the renderers
   not, `@MARY` would have SCORED as a cue and PRINTED as `@MARY`. Three
   copies of one rule is how a marker gets missed by all three at once.
2. **The FDX importer could not round-trip a name the cue alphabet excludes.**
   `fdxToFountain` already forces the two other inferred elements —
   `formatSceneHeading` prefixes `.`, `formatTransition` prefixes `> ` — and
   Character had no such guard: it emitted `para.text.toUpperCase()` and
   trusted the name to be cue-shaped. A Final Draft file whose Character
   paragraph holds `田中` came back as an ACTION line and took its speech with
   it, silently, on exactly the real files the importer exists to accept.
3. **The editor's cue autocompletion was a fifth copy of the decoration
   strip.** Round 2 folded four copies (`fountain-analyzer.ts`, `locate.ts`,
   `prioritize.ts`, `truth-extraction.ts`) onto `stripCueDecorations`;
   `harvestCueNames` in `src/components/editor/screenplay-complete.ts` was on
   the editor side of the repo and was not in that sweep.

### What the brief's premise got right, and the one thing it did not

The brief and the round-2 review both say the fix "must reach BOTH the
analyzer and every renderer". That is right and it is what was built. The one
correction: the review's phrasing implies the renderers need to learn about
`@`. They do not — what they needed was to **stop having three copies of the
rule**. `renderableText` in `src/lib/fountain.ts` is one definition of "what a
block prints", living beside the classifier whose markers it inverts, and all
three renderers call it. The marker set it strips is the marker set
`parseFountain` reads, which is the property that keeps the two halves from
drifting again.

---

## 2. The change, in four places

**`src/lib/fountain.ts`.** `FORCED_CUE_MARKER = '@'`. `parseFountain` types
`@NAME` as `character` and `@NAME^` as `dual_dialogue` (with the same
retro-tag of the preceding cue as the left column), under **exactly** the
unforced cue's shape: preceded by a blank line, followed by a non-empty line.
The caret and extension tails are read past the marker. `stripCueDecorations`
drops it, so every cue-name comparison already routing through that function
sees `@田中` and `田中` as one speaker with no change of its own.

**It deliberately does NOT break out of a dialogue block**, unlike `!`, `.`
and `~`. A Character element requires a preceding blank line in the spec, and
the `prevBlock.type === 'empty'` guard is this parser saying the same thing.
The reason it matters more for `@` than for the other three is that `@` is a
character writers really do type inside a speech — a handle, an address —
and reading `@everyone, listen up` as a cue would be worse than the bug being
fixed. Asserted in both directions.

**`renderableText`** replaces the three `cleanText` copies (layout, fdx,
docx), adding the `@` strip once.

**`server/nvm/analyze/screenplay-normalizer.ts`.** `@` becomes the fourth
entry in `FORCED_MARKERS`, declaring `['character', 'dual_dialogue']` with
`parserTypes: true`. Round 2 could not add it, because the condition the
function tests — "the document still parses to the element the marker
DECLARED" — could not be met by a parser that did not read `@`. Now it can,
and the existing fixpoint re-parse is what keeps it honest: on `@McCLANE` or
`@田中` the strip does NOT survive (the bare name is not a cue), the marker
stays in the analysed text, and the line is still typed `character` because
the PARSER reads it. `parserTypes: true` is the guard that stops an action
line's `@` being touched.

**`server/lib/fdx-import.ts`.** `formatCharacter` asks the parser's own
`CHARACTER_CUE_RE` and forces with `@` when the answer is no. Asking the
parser rather than restating the grammar is what stops the two drifting.

**`src/components/editor/screenplay-complete.ts`.** `harvestCueNames` routes
through `stripCueDecorations`, which is also how it learned `@`.

---

## 3. The renderer table, before and after

Fixture: four cues carrying `@` — one redundant (`@MARY`), one that NEEDS the
marker (`@McCLANE`, mixed case), one caseless (`@田中`), one dual-dialogue
(`@MARY^`) — each with a speech beneath it, inside a two-scene document.
Probe run from each tree root, `node --experimental-strip-types
<session scratch>/render-probe.mjs <root> <fixture>`, EXIT=0 both sides.

| surface | at `3124a94e` | here |
|---|---|---|
| `parseFountain` element types | all 12 blocks `action` — four cues and four speeches included | `scene_heading, action, character, dialogue, character, dialogue, dual_dialogue, dialogue, dual_dialogue, dialogue, scene_heading, action` |
| `screenplay-layout.ts` (feeds the PDF writer) | **4 of 4 cue lines printed the marker**; 23 laid-out lines, cues at the action indent | **0 of 4**; 19 lines, cues at the 3.7" cue indent with the speech glued beneath |
| `src/lib/pdf.ts` | 4 `@` in the content stream | **0** |
| `src/lib/fdx.ts` | 4 `@`; every cue and speech `Type="Action"` | **0 `@`**; `Type="Character"` + `Type="Dialogue"` |
| `src/lib/docx.ts` | 4 text runs containing `@`; `Action` style throughout | **0**; `Character` / `Dialogue` styles |
| `server/lib/fdx-import.ts` round trip of a caseless Character paragraph | comes back as an action line, speech as action prose | comes back as `@田中` and re-parses `character` + `dialogue`; a cue-shaped name (`MARY`) is byte-identical to before |

The PDF/layout line-count drop (23 → 19) is the blank-line spacing rule doing
its job: an action block takes a blank line before it, a dialogue line under a
cue does not. It is the visible shape of the elements being right.

---

## 4. The 32 committed scripts, before and after

The review's transform, reproduced exactly: `redundantMarker('character',
'@')` prefixes the marker to every line the repository's own parser ALREADY
types as a cue, so not one printed character and no element changes. Surface
compared is the six-field one the invariance suite uses (`health`, `grade`,
`verdict`, `sceneCount`, `totalIssues`, `bySeverity`).

| | at `3124a94e` | here |
|---|---|---|
| applicable scripts | 32 of 32 | 32 of 32 |
| scripts whose surface moved | **32 of 32** | **0 of 32** |
| mean health delta | **−1.172** | **0.000** |
| largest single move | **−26.8** (`room-12`, 51.6 → 24.8) | **0.0** |
| second largest | −23.6 (`transfer-window`, 55.8 → 32.2) | 0.0 |
| largest in the other direction | +6.9 (`the-detour`, 69.1 → 76.0) | 0.0 |
| verdict flips | 0 (two PASS scripts stayed PASS while falling 26.8 and 23.6) | 0 |

The two big movers are the two scripts whose health is carried by dialogue
density rather than scene count; the rest of the distribution is a smear
between −2.8 and +2.8, in both directions, which is what a defect that turns
speech into prose does to a mixed rule set. The 32/32, the mean and the
largest all reproduce the round-2 lane report to the digit.

---

## 5. The pin flip, and the second pin nobody had noticed

Round 2 pinned the gap as a two-sided assertion carrying its measured size,
with an instruction for whoever closed it: *"move this row into
FORMAT_TRANSFORMS as an invariance assertion, check that every renderer strips
the marker too, and delete this test. Do not relax it."* All three, exactly:

* The `@` row is the **nineteenth** `FORMAT_TRANSFORM` and asserts **0 of 32**.
  The pinned `describe` is deleted, not relaxed.
* A new `describe` covers what an invariance row cannot: an analyzer that
  simply DELETED `@` would pass the row while every exporter still printed the
  marker. So the marker is checked in the direction deletion cannot fake — on
  a cue only `@` can express — across the parser's element sequence, the `^`
  retag, the analyzer's speaker and dialogue counts, and all four renderers.
* **A second pin existed and the brief did not name it.**
  `tests/core/unicode-character-cues.test.ts` asserted
  `blockTypeInContext('@たなか') === 'action'` with the message "forced-cue
  support arrived without a test". It has. A new fixture,
  `tests/fixtures/unicode-cues/forced-caseless-cues.fountain`, is the existing
  `caseless-cues.fountain` with the marker on each of its three cues; the test
  asserts the two files differ ONLY in the marker, so the pair cannot drift,
  and that the bare lines stay `action` while the marked ones are three
  speakers with three lines of dialogue. It lives in the subdirectory for the
  reason that README already gives: the identity harness scans
  `tests/fixtures/*.fountain` flat and its fixture set is a fixed 45.

**Fail-first**, on a `git archive 3124a94e` export in the session scratch dir
with only the four test files and the new fixture copied in:

| file | on the `3124a94e` export | here |
|---|---|---|
| `tests/core/parse-format-invariance.test.ts` | **5 fail** — the `@` row reporting "32 of 32 scripts moved", and 3 of the 4 new bug-facing subtests | 0 fail (65 pass) |
| `tests/core/unicode-character-cues.test.ts` | **1 fail** — "each forced cue is a speaker, under its BARE name" | 0 fail (17 pass) |
| `tests/core/fdx-import.test.ts` | **1 fail** — the not-cue-shaped Character round trip | 0 fail (9 pass) |

The one new subtest that passes on BOTH trees is the deliberate
both-directions guard — `@` inside a speech is not a cue, and an action line's
`@` is left alone — which must never change and is recorded here so it is not
mistaken for a test that cannot fail.

---

## 5b. What the full suite found: the guard did not know about `@` either

The first full `npm test` of this lane failed — **4 failures**, all in
`tests/routes/fountain-shape-guard-cue-bypass.test.ts`, green on the base
export. It is the most useful thing that happened in this lane, so it is
written up rather than quietly fixed.

`server/lib/validation.ts` carries a cheap, pre-parse cost guard whose job is
to reject a pathological payload BEFORE anything parses it. Its line-shape
predicate, `isCueLikeLine`, is documented as "a PROVABLE superset of every cue
test this repository runs downstream" and is the union of three predicates.
Eight review rounds are recorded above it, each one a reviewer finding one more
shape a downstream consumer treated as a cue and the guard did not.

**This was the ninth, and the first to arrive with a parser change rather than
with a review.** All three disjuncts start at a cased-script capital — which
is exactly what the forced cue exists to escape — so all three returned false
on `@NAME` while `parseFountain` made a character block out of it. Measured on
the shape the round-5/6 tests already use (distinct=600, occurrences=12,000,
each cue adjacent to its speech), at `ca8de756` against this tip:

| | at `ca8de756` (parser taught, guard not) | at `b3b37277` |
|---|---|---|
| `guardCueOccurrences` | **0** | **12,000** |
| pipeline character blocks (`parseFountain(normalizeScreenplay(text))`) | 12,000 | 12,000 |
| the round-8 oracle, `guard >= pipeline` | **FALSE** — the unsafe direction | TRUE |
| rejected by | `MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT`, which runs a **real parse** | `MAX_FOUNTAIN_FREQUENT_CUE_LINES`, the cheap pre-parse bound |

Writing one character in front of each cue turned the cheap bound off. On the
unchanged base (`3124a94e`) the same payload is accepted and costs nothing,
because `@` made no cues there either — so this is a hole the parser change
opened, not one it revealed.

`isCueLikeLine` gains a fourth disjunct, deliberately the widest of the four:
any trimmed line starting with the marker and carrying a non-empty body, which
is what `parseFountain` requires before the structural checks it shares with an
unforced cue. Over-counting is this guard's safe direction and always has been.

The second fix came out of the same failure. `formatCharacter` tested a Final
Draft Character paragraph's WHOLE text against `CHARACTER_CUE_RE`, so a
paragraph holding embedded newlines — which real Final Draft never writes and a
hand-built `.fdx` can — failed the test and took a marker declaring the whole
blob a cue. It is now left exactly as the importer has always emitted it.

**Fail-first for both**, on a `git archive ca8de756` export:
`tests/routes/fountain-shape-guard-cue-bypass.test.ts` ROUND 9 fails (and the
4 pre-existing `.fdx` failures with it), `tests/security/fountain-shape-guard-cue-parity.test.ts`
ROUND 9 fails; both green here (59 and 653 passing). One caveat recorded so the
next reader does not misread it: four OTHER suites in the parity file fail on
ANY `git archive` export, including the pristine `3124a94e` one, because
`trackedFountainFiles()` shells out to `git ls-files` and an export has no
`.git`. That is a harness artifact of the fail-first method, not a regression;
in the worktree the file is 653 of 653.

The route test asserts the BOUND BY NAME, not just the 400 — at `ca8de756` the
payload was still rejected, by the expensive bound, so a test asserting only
the status would have passed on the unfixed guard.

**And one mistake of my own, recorded because it is the same mistake in
miniature.** The parity oracle's rejection assertion was written against a
literal, passed, and was then rewritten to use this file's
`REJECTION_RE` without re-running the file. `REJECTION_RE` is built from
`MAX_FOUNTAIN_DISTINCT_CUE_LINES` (1500); this payload trips
`MAX_FOUNTAIN_FREQUENT_CUE_LINES` (50 lines occurring more than 15 times).
For one commit the assertion named the wrong bound and could not have caught
the regression it exists for. The final `npm test` found it; `703903d9` builds
it from the two constants it actually means, with a comment saying which bound
is which.

---

## 6. Every cost

1. **A draft that forces its cues gains characters and dialogue.** That is the
   fix, not a side effect, but it moves `characters`, `dialogueLineCount`, the
   dialogue/action ratio and everything downstream of them on any document
   carrying `@`. Zero committed fixtures carry one (verified by grep over
   `data/screenplays`, `tests/fixtures`, `sample-script.ts` and the
   calibration corpus), which is why the identity harness is 45/45 and the
   benchmark is unchanged — and equally why nothing in this repository could
   have caught the defect.
2. **`fdxToFountain` can do the same to an imported document.** A Final Draft
   Character name that is not cue-shaped now becomes a speaker where it used
   to be action prose. Names that were already cue-shaped import
   byte-identically; the existing round-trip fixtures are untouched and green.
3. **`stripCueDecorations` now strips a leading `@` from any string handed to
   it.** Four analyzer modules share that function, and they hand it cue text,
   so the reach is cue names — but it is a widening of a shared helper and is
   named here rather than left to be found.
4. **`harvestCueNames` narrowed from "strip any trailing parenthetical" to
   "strip the recognised extensions".** For an unforced cue the two sets
   coincide, because `CHARACTER_CUE_RE` admits only those four tails, so no
   existing completion changes. For a FORCED cue whose body carries a
   non-extension parenthetical (`@MARY (into phone)`), the whole body is now
   offered. There is no prior behaviour to narrow there — forced cues did not
   exist — but it is a real difference from what the old regex would have done.
5. **The probe costs one extra `parseFountain` per script.** Measured:
   `npm run probe-corpus-shape -- --public`, three consecutive runs each way,
   2162 / 2157 / 2235 ms with the column against 2191 / 2146 / 2122 ms with
   the call replaced by a constant — inside the run-to-run noise, because each
   row already pays two full analyses.
6. **The cost guard now over-counts every line starting with `@`.** That is
   the safe direction by the guard's own stated design, and the widening is
   bounded to lines whose body is non-empty — but a draft whose DIALOGUE
   repeatedly opens with a handle now contributes to a cue-count bound it did
   not before. The thresholds are in the hundreds of distinct lines and
   thousands of occurrences, and the other direction is asserted (an ordinary
   30-speech forced-cue draft is accepted).
7. **What this lane did NOT fix, with its size.** `>` forced transitions are
   stripped at the ANALYSIS seam (round 2) but not by the renderers: the
   parser has no forced-transition branch, so `>CUT TO:` arrives typed
   `action` and the exporters print it `>` and all, as an Action element.
   Fixing it is a parser branch, not a renderer strip — the same shape of
   change this lane made for `@` — and it is out of this lane's scope. It is
   named here with its mechanism so it is not rediscovered as news, and
   `renderableText` is now the one place its strip would go.

---

## 7. The receipt row

`docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` keeps **exactly one** PENDING
entry over `78ec4464..HEAD`; `node scripts/check-scoring-receipt.mjs
78ec4464..HEAD` exits **1** naming exactly it, which is the intended state.

Row 11 of that entry's commit ledger records the before/after above. Row 9's
sentence "The forced cue `@` is NOT fixed" was true when it was written and is
not now; it reads "was NOT fixed in this row … row 11 is that work", so the
ledger stays a record rather than becoming a false claim.

**What the owner compares is one column.** This is the only change on the
branch whose reach can be answered by counting, because the engine's behaviour
before it was total: a draft with no forced cue cannot have moved.
`npm run probe-corpus-shape` — the probe the receipt's first owner instruction
already names — gains a **`@cue`** column, and `forcedCueLines` in `--csv`. It
counts the cue BLOCKS the parser typed from the marker, not lines matching
`/^@/`, so an `@` opening an action line or sitting inside a speech is
correctly not counted; those are the lines the change deliberately leaves
alone, and a regex would have reported them as affected. The group summary
says in words when a whole group is zero. On the 32 committed scripts it reads
**0 of 32**.

---

## 8. Gates, in the foreground, with exit codes

| gate | command | exit |
|---|---|---|
| touched tests, individually | `node --experimental-strip-types --test tests/core/parse-format-invariance.test.ts` (65 pass) | 0 |
| | `… tests/core/unicode-character-cues.test.ts` (17 pass) | 0 |
| | `… tests/core/fdx-import.test.ts` (9 pass) | 0 |
| | `… tests/core/fountain-analyzer.test.ts` (69 pass) | 0 |
| | `… tests/core/core-02.test.ts` (427 pass, covers `harvestCueNames`) | 0 |
| | `… tests/core/pure-core-boundary.test.ts` (6 pass) | 0 |
| | the six together, one run: 202 pass, 0 fail | 0 |
| | `… tests/routes/fountain-shape-guard-cue-bypass.test.ts` (59 pass, was 4 failing) | 0 |
| | `… tests/security/fountain-shape-guard-cue-parity.test.ts` (653 pass) | 0 |
| lint | `npx tsc --noEmit` | 0 |
| console | `node scripts/check-no-console.mjs` — 304 files, 23 quarantine entries | 0 |
| docs | `npm run check-docs` | 0 |
| honesty | `node scripts/honesty-audit.mjs` — 458 files, 474 markdown, 93 claims | 0 |
| brain | `node scripts/brain-graph.mjs --check` — 104 notes, 386 links, fresh | 0 |
| gates | `npm run gates` — public-benchmark suite RAN and, re-run with `PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR` raised to 0.8938, FAILED on that floor by name | 0 |
| metamorphic | `npm run test:metamorphic` — 8/9 raw, 1 documented witness (`empty_verbosity`) | 0 |
| build | `npm run build` | 0 |
| reachability | `node scripts/verify-server-reachability.mjs` | 0 |
| receipt | `node scripts/check-scoring-receipt.mjs 78ec4464..HEAD` — 1, naming the single PENDING entry (intended) | 1 |
| identity | `check-doctor-output-identity.mjs --tree <3124a94e export> / --tree . / --compare`, `GIT_SHA=identity` on both | 0 |
| full suite | `npm test`, once, on the final tree — **13,325 pass, 0 fail, 91 skipped, 5 todo** (2356 suites, 238 s) | 0 |

**Output identity: PASS — all 45 reports byte-identical** (`analyzedAt`
excluded), with `GIT_SHA` pinned equal on both trees. **0 of 45 fixtures
move**, and the reason is checkable rather than hoped for: no committed
fixture contains a line beginning `@` (grep over `data/screenplays/*.fountain`,
`tests/fixtures/*.fountain`, `tests/fixtures/blind-pairs/*.fountain`,
`src/lib/sample-script.ts` and `server/nvm/analyze/calibration/corpus.ts`
returns zero). The new `forced-caseless-cues.fountain` is in the `unicode-cues`
SUBDIRECTORY precisely so the harness's fixed set of 45 does not become 46.

**`npm run benchmark:public` reproduces to the digit:** shuffle-drop
**0.8438** matched-pair / **0.7896** all-pairs · climax-relocate **0.5938** /
**0.5234** · control **1.0000** / **0.9814**. `AUC24_FLOOR` untouched;
`--lock` never run; no constant in `scripts/lib/auc.ts` changed.

---

## 9. What is left undone

* The `>` renderer leak in §6.7 — named with its mechanism, not fixed.
* The private corpus cannot be read from here, so how many of the 761 drafts
  carry a forced cue is unknown. The `@cue` column is the instrument that
  answers it in one run; this lane provides the instrument and claims no
  reading from it.
* The lane is **not merged**. It waits on the owner's `npm run measure-real`.

---

## Tip and origin

```
$ git ls-remote origin scoring/forced-cue scoring/adversarial-2026-09-12 main
3f4a68725edae64861ac5fececd97c86798e1b42	refs/heads/main
4cf5b2f3c3bb61dafdb5afc2ac59a2c0ad674db0	refs/heads/scoring/adversarial-2026-09-12
6eeef0620779b5f1c3d5267bd948a9c911a1cca6	refs/heads/scoring/forced-cue
```

That is verbatim, taken at `6eeef062`. The commit carrying this section is the
one after it, so the tip named at the top of this report is one ahead of the
line above — the usual and unavoidable off-by-one of a report that records its
own branch. Everything measured in this report was measured at or before
`703903d9`; the two commits after it are this report and a one-word wording
fix, and neither touches code.

Two notes for the orchestrator: `origin/scoring/adversarial-2026-09-12` has
moved since this lane was cut (`3124a94e` → `4cf5b2f3`), and `main` moved
twice during it (`251e0840` → `0ecc8aea` → `3f4a6872`), so this branch needs a
rebase and a re-run of the identity harness and the benchmark against
whichever tree it is merged into — the harness's own header says the baseline
must be the branch being merged INTO, not the commit branched FROM.

---

## Rebase onto `4cf5b2f3`

This lane was cut from `origin/scoring/adversarial-2026-09-12` @ `3124a94e`;
that branch has since moved to `4cf5b2f3` (its rounds 3 and 4). Rebased.

**Old tip `5be366be` → new tip `22c6b03f`.** Ten commits, same order, same
messages, same trailers.

### Conflicts, and how they were resolved

**One file conflicted: `scripts/probe-corpus-shape.ts`,** in the commit that
adds the `@cue` column, and in both places the column is printed. Rounds 3-4
had made `submittedWordCount` and `isDoubleSpaced` OPTIONAL on the probe's row
(so the script can run against a checkout from before those fields existed and
say so, rather than printing `undefined`), replacing the inline gap arithmetic
with a `gapOf(r)` helper and adding an `UNREPORTED` note. My side added the
`forcedCues` column to the same two statements. **Resolved by keeping both**:
upstream's optional-field shape, with the `@cue` cell appended to it. Nothing
of either side was dropped.

`docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` **auto-merged** — rounds 3-4 added
no ledger row numbered 11 or higher, so rows 11 and 12 land in order with no
renumbering, and row 9's "was NOT fixed in this row … row 11 is that work"
edit still applies to the sentence it was written for. `docs/brain/GRAPH.md`
and `brain.graph.json` did not conflict, and `npm run check-brain` is fresh on
the rebased tip (104 notes, 386 links) without regenerating.

### Patch equivalence

Sorted diff-line comparison, `3124a94e..5be366be` against `4cf5b2f3..HEAD`,
over the whole tree EXCLUDING the two files above: **609 lines each side,
identical**. Run again per-file on the two excluded ones, the sets are also
identical — **50 lines each for `probe-corpus-shape.ts`, 37 each for
`MEASUREMENT_RECEIPTS.md`** — so the rebase changed nothing this lane adds,
conflicted files included. The lane report itself is byte-identical across the
rebase apart from this section.

### The five re-measurements on `22c6b03f`

| # | check | result | exit |
|---|---|---|---|
| 1 | the touched tests, one run — parse-format-invariance, unicode-character-cues, fdx-import, fountain-analyzer, core-02, the route bypass suite, the parity suite, public-benchmark | **1,332 pass, 0 fail**, 154 suites | 0 |
| 2 | `npm run benchmark:public` | **0.8438 / 0.7896 · 0.5938 / 0.5234 · 1.0000 / 0.9814** — to the digit, unchanged | 0 |
| 3 | output identity vs a `git archive 4cf5b2f3` export, `GIT_SHA=identity` pinned on both trees | **PASS — all 45 reports byte-identical** (`analyzedAt` excluded) | 0 |
| 4 | `node scripts/check-scoring-receipt.mjs 78ec4464..HEAD` (`78ec4464` is still an ancestor) | exit 1 naming **exactly one** PENDING entry | 1 |
| 5 | `npm run --silent probe-corpus-shape -- --public` | the **`@cue`** column is present in the table head and every row, and the group summary reads "scripts with a forced cue 0 of 32" | 0 |

`AUC24_FLOOR` still untouched, `--lock` still never run, and no AUC-24 number
is stated, implied or projected anywhere on the rebased branch.
