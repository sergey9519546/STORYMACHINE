# Forced-cue lane report — `scoring/forced-cue`

**Worktree:** `/home/user/wt-forcedcue`
**Branch:** `scoring/forced-cue`, pushed to origin after every commit.
**Tip:** `ca8de756`
**Base:** `3124a94e` — `origin/scoring/adversarial-2026-09-12` at the moment
this lane was cut.
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
6. **What this lane did NOT fix, with its size.** `>` forced transitions are
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
| full suite | `npm test`, once, on the final tree | see below |

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

* The `>` renderer leak in §6.6 — named with its mechanism, not fixed.
* The private corpus cannot be read from here, so how many of the 761 drafts
  carry a forced cue is unknown. The `@cue` column is the instrument that
  answers it in one run; this lane provides the instrument and claims no
  reading from it.
* The lane is **not merged**. It waits on the owner's `npm run measure-real`.

---

## Tip and origin

```
$ git ls-remote origin scoring/forced-cue scoring/adversarial-2026-09-12 main
0ecc8aea84a668c9279c5ffe46fd3c3c7dc26c2b	refs/heads/main
4cf5b2f3c3bb61dafdb5afc2ac59a2c0ad674db0	refs/heads/scoring/adversarial-2026-09-12
ca8de756b5efdb16b3c7990775ba2bb832c25583	refs/heads/scoring/forced-cue
```

`refs/heads/scoring/forced-cue` is at this lane's tip, `ca8de756`. Two notes
for the orchestrator: `origin/scoring/adversarial-2026-09-12` has moved since
this lane was cut (`3124a94e` → `4cf5b2f3`), and `main` has moved too
(`251e0840` → `0ecc8aea`), so this branch needs a rebase and a re-run of the
identity harness and the benchmark against whichever tree it is merged into —
the harness's own header says the baseline must be the branch being merged
INTO, not the commit branched FROM.
