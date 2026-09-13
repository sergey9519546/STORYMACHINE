# Renderer-residuals lane report — `scoring/renderer-residuals`

**Worktree:** `/home/user/wt-residuals`
**Branch:** `scoring/renderer-residuals`, pushed to origin after every commit.
**Base:** `089bec91` — `origin/scoring/forced-cue`, itself stacked on
`origin/scoring/adversarial-2026-09-12` @ `4cf5b2f3`. Every before/after number
below is measured against `089bec91`, not against `main`.
**Last code commit:** `80b1621f` — `git diff 80b1621f..HEAD -- ':!docs'` is
empty, so every measurement in this report was taken on that tree and the
commits after it are the receipt and this report. The tip is named in
`## Tip and origin` at the end.
**Answers:** `forcedcue-lane-report.md` §6.7 (both residuals, with the
mechanism it names) and `forcedcue-review.md` §5 and non-blocking 3.

This is scoring-path work. It is **not merged here** and waits for the owner's
`npm run measure-real`. No AUC-24 number is stated, implied or projected
anywhere in this report, in the receipt, or in any file on this branch.

```
2cb92b66 docs(receipt): the attestation says what ran without tripping the claim scan
8cf152c1 docs(receipt): the PENDING ledger row for the forced-transition change
80b1621f feat(probe): the owner's one column for `>`, beside the one for `@`
c13c3adc feat(fountain): honour the forced transition `>` at the parser seam and in every renderer
```

---

## 1. What the thing IS

Fountain gives five elements an explicit marker for the case where inference
cannot reach them: `!` forces action, `.` a scene heading, `~` a lyric, `@` a
character cue — and **`>` forces a transition**. None is ever printed. They say
what a line IS; the page shows the line without them.

`src/lib/fountain.ts` implemented four of the five. The fifth had no branch at
all, so **`>CUT TO:` was typed `action`**, and the consequences split in two
directions that could not both be right:

* At the **analysis seam**, `stripForcedMarkers`
  (`server/nvm/analyze/screenplay-normalizer.ts`) removed the marker anyway.
  Its `>` entry carried `parserTypes: false` with a comment saying exactly why:
  "the parser has no forced-transition branch". The analyzer therefore scored a
  transition.
* At every **renderer**, the same line was typed `action` and printed
  `>CUT TO:` verbatim, left-aligned at the 1.5" action indent, in the layout
  that feeds the PDF writer, in the FDX `<Text>` node and in the DOCX run.

One line, two answers — the analyzer/renderer split the forced-cue lane exists
to close, in its last instance on this stack.

**A CUSTOM transition was worse, and it is the case the marker exists for.**
`>SMASH TO BLACK.` is a transition no inferred rule in this parser reaches: it
is not one of the four fixed strings (`FADE IN:`, `FADE OUT.`, `CUT TO:`,
`DISSOLVE TO:`) and it does not end in `TO:`. So the normaliser's re-parse check
correctly refused the strip — removing the marker would have changed the element
— and the line stayed **ACTION PROSE carrying a literal `>`** into `actionLines`,
the word count and every rule lexicon. The marker whose whole job is to be
unambiguous was the thing that made the line ambiguous.

### What the brief got wrong, in four places

1. **`src/lib/fdx-import.ts` does not exist on this stack.** The brief names it
   as where "the exports-truth lane added the FDX round-trip disclosure". The
   importer here is `server/lib/fdx-import.ts`; the exports-truth lane is
   `lane/exports-truth`, which is not in this lineage. The round-trip work in
   this report is against the server-side file.
2. **`docs/brain/Branches/Branch - Forced Cue.md` does not exist.** The
   forced-cue lane added no brain note. A new note,
   `Branch - Renderer Residuals.md`, is added and linked from
   `Owner - R5 Measurement and Merge`; nothing links from a file that was never
   written, and no note was invented on that lane's behalf.
3. **Residual B is not a leak of the same class as A, and the brief's most
   likely resolution is rejected.** The brief proposed "`@` forces a character
   element wherever it appears". §3 gives the spec reading and the three reasons
   that is wrong, and what was built instead.
4. **The `>` residual is not only a renderer problem.** The brief frames both as
   renderer residuals. Fixing `>` at the parser seam necessarily changes what
   the ANALYZER sees on a custom transition — that line goes from `action` to
   `transition` — so this is a scoring change with a measurable size, not a
   cosmetic one. §5 measures it.

---

## 2. The change, in five places

**`src/lib/fountain.ts`.** `FORCED_TRANSITION_MARKER = '>'` and
`isForcedTransitionLine(trimmed)` — the marker, a non-empty body, and not the
`>text<` centering shape that claims the same first character. That predicate is
**THE one definition**: the parser's new branch, `stripForcedMarkers`' `>` entry
and both `isTransition` heuristics all ask it rather than spelling it again.
`renderableText` strips the marker once, beside the classifier whose markers it
inverts.

**Two limits, each different from the forced cue's and each spec-cited.** A
forced transition does **not** require a line under it: §Character defines its
element as "without an empty line after it" because a cue is the head of a
dialogue block and is meaningless without the speech, while §Transition's
forcing sentence says any line can be forced to one. So `>FADE OUT.` as the last
line of a draft is a transition and `@JIMMY` as the last line is not a cue. And
a bare `>` declares nothing — there is no element and stripping the marker would
leave an empty line — so it stays action with the character on it, mirroring the
cue branch's `cueLine !== ''` guard.

**It does NOT break out of a dialogue block**, unlike `!`, `.` and `~`. That is
this parser's pre-existing rule, stated in the dialogue-block comment the
stacked branch wrote, and the forced branch is placed after it. A writer who
drops the blank line before a transition keeps the speech intact rather than
losing a dialogue line. Pinned in both directions.

**`server/nvm/analyze/screenplay-normalizer.ts`.** The `>` entry moves from
`parserTypes: false` to `true`. With the parser reading the marker this is an
ordinary redundant-marker strip like `!`, `.` and `@`, and the flag is what stops
a `>` the parser typed as something else — a `>` opening a line inside a speech
— from being touched at all. The comment that said the parser has no such branch
is replaced by one that records why it used to be there.

**Both `isTransition` heuristics.** `screenplay-normalizer.ts`'s
double-spaced reconstruction and `canonical-fountain.ts`'s packed-input pass each
carry a private inferred-transition test, and **neither knew about the marker**.
This was found by a test, not by reading: the first version of the
seam-agrees-with-the-page assertion failed because on a double-spaced-shaped
document the reconstruction glued `>SMASH TO BLACK.` into the preceding action
paragraph — `"Mary closes the file. >SMASH TO BLACK."` — while the page printed
it as a right-aligned transition. A plain `CUT TO:` in the same position was
handled correctly, so the defect was exactly on the custom transition the marker
exists for. Both now delegate the forced half to `isForcedTransitionLine`.

**`server/lib/fdx-import.ts`.** No code change; a claim corrected.
`formatTransition` forces a custom transition with `> ` so it "survives the round
trip instead of silently becoming a plain action line". **That sentence was
false.** The marker it added was what condemned the line: `> SMASH TO BLACK:`
came back as an ACTION line carrying a literal `>`, strictly worse than the plain
action line the marker was meant to prevent. The escape worked only for the
wordings the inferred heuristic would have caught anyway — the ones that did not
need it. It is true now, and the comment says so.

**`scripts/probe-corpus-shape.ts`.** A `>tr` column beside `@cue`, and
`forcedTransitionLines` in `--csv`. It counts transition BLOCKS the parser typed
FROM the marker, not lines matching `/^>/`, so a `>` inside a speech and a
`>text<` centering are correctly not counted. Both counts now come out of ONE
`parseFountain` pass, so the second column costs nothing on top of the first.

---

## 3. Residual B, and why it is a decision rather than a leak

An `@` line that is not in cue position stays `action` and prints its marker.
The brief's stated hypothesis was that `@` should force a character element
wherever it appears. It is rejected, and the statement lives beside
`FORCED_CUE_MARKER` in `src/lib/fountain.ts` with the spec quote.

**The spec.** §Character defines the element as "any line entirely in uppercase,
with one empty line before it, and without an empty line after it", and then
gives the forcing escape: a Character element can be forced by preceding it with
the "at" symbol. What the marker overrides is the **UPPERCASE** test — the one a
caseless script, a mixed-case surname or a lowercase handle cannot pass, and the
reason the marker exists at all. It does not override the two POSITION
requirements, and it cannot: a Character element is the head of a dialogue
block, so "without an empty line after it" is not decoration, it is the speech.
A line with nothing under it is not a cue in any reading of the spec, forced or
not.

**So on such a line the `@` is not a marker at all.** It is a character the
writer typed, and printing it is correct. **There is no analyzer/renderer split
here** — which is precisely what made the `>` residual a defect and makes this
one not. The analysis seam had already reached the same conclusion in code
before it was ever written down: `stripForcedMarkers`' `@` entry carries
`parserTypes: true`, whose whole job is to leave alone a `@` on a line the parser
did not type a cue from. The scored text and the printed page carry the same
character, and that property is now asserted rather than argued.

**The edge case, handled explicitly.** `@JIMMY` with a blank line under it, or as
the last line of a draft, is action and prints the marker. Both are pinned,
against the forced transition's contrasting behaviour on the same shape, so the
asymmetry reads as the decision it is.

**The cost, and what was NOT done.** A writer who types `@JIMMY` and forgets the
speech gets an action line with a visible `@`, silently. The parser knows this
happened and `FountainBlock.lintErrors` is the channel that would tell them. It
is deliberately unused: the only surface that renders `lintErrors` is
`src/components/scriptide/AnalysisPanel.tsx`, whose empty state reads "No camera
bleed detected. Action is pure." (line 71) and whose per-block remedy is a
"Clean with AI" button (line 98) that rewrites the line's prose — the wrong
remedy for a missing blank line, on a surface this scoring lane has no
measurement for. Using the channel without redesigning that panel would make its
copy lie. The file and the two lines are named here and at the parser seam so
the reason is checkable rather than asserted.

---

## 4. Before and after, by surface

Fixture (`<session scratch>/probe.mjs`, run from each tree root): two forced
transitions — one the inferred grammar CAN reach (`>CUT TO:`) and one it cannot
(`>SMASH TO BLACK.`) — a `>text<` centering, a `>` inside a speech, a `@` in cue
position and a `@` on an action line, inside a two-scene document. EXIT=0 both
sides.

| surface | at `089bec91` | here |
|---|---|---|
| `parseFountain` on `>CUT TO:` | `action`, text `">CUT TO:"` | `transition`, renders `CUT TO:` |
| `parseFountain` on `>SMASH TO BLACK.` | `action`, text `">SMASH TO BLACK."` | `transition`, renders `SMASH TO BLACK.` |
| analysis seam (`parseFountain(normalizeScreenplay(…))`), `>CUT TO:` | `transition:"CUT TO:"` — **disagrees with the page** | `transition:"CUT TO:"` — agrees |
| analysis seam, `>SMASH TO BLACK.` | `action:">SMASH TO BLACK."` | `transition:">SMASH TO BLACK."` (marker kept, correctly: the strip does not survive a re-parse) |
| analysis seam, same line in a DOUBLE-SPACED document | `"Mary closes the file. >SMASH TO BLACK."` — glued into the action paragraph | on its own line, typed `transition` |
| `screenplay-layout.ts` (feeds the PDF writer) | prints `>CUT TO:` and `>SMASH TO BLACK.` at the action indent | prints `CUT TO:` / `SMASH TO BLACK.`, right-aligned (x > 108pt) |
| `src/lib/pdf.ts` | the marker in the `Tj` text-showing operators | 0 markers shown |
| `src/lib/fdx.ts` | 3 `&gt;` in the XML; both lines `Type="Action"` | 1 `&gt;` (the one inside a speech, correctly) ; `Type="Transition"` |
| `src/lib/docx.ts` | the marker in text runs, `Action` style | no marker, `Transition` style |
| `server/lib/fdx-import.ts` round trip of a CUSTOM Final Draft transition | comes back as an action line reading `> SMASH TO BLACK:` | comes back as a transition; an auto-detected one (`CUT TO:`) is byte-identical to before |
| `@handle` on an action line | prints `@handle` | prints `@handle` — unchanged, and now asserted to match the analysis seam |

---

## 5. The 32 committed scripts, and the size of the change

**Nothing in the repository moves.** Output identity, `GIT_SHA=batterypin`
pinned equal on both trees: **PASS — all 45 reports byte-identical**
(`analyzedAt` excluded). Re-scoring all 32 public scripts on both trees over the
six-field surface the invariance suite uses: **0 of 32 differ.**

The reason is checkable rather than hoped for: **no committed fixture contains a
line beginning `>` or `@`** (grep over `data/screenplays/*.fountain`,
`tests/fixtures/*.fountain`, `tests/fixtures/blind-pairs/*.fountain` returns
zero), and `npm run --silent probe-corpus-shape -- --public` reads **"scripts
with a forced transition 0 of 32"** in the new `>tr` column. That is also why
nothing in this repository could have caught the defect.

**A redundant `>` on lines the parser ALREADY typed as transitions moves 0 of the
6 applicable scripts on BOTH trees** — round 2's normaliser strip already closed
that half, and this change does not disturb it. The `FORMAT_TRANSFORMS` row that
asserts it is unchanged; only its explanatory prose is corrected, because it said
the parser has no forced-transition branch.

**THE SIZE OF THE CHANGE, same bytes on both trees.** One custom forced
transition (`>SMASH TO BLACK.`) inserted before each script's last scene heading
and nothing else altered, then scored on the `089bec91` export and here:

| | at `089bec91` | here |
|---|---|---|
| reports differing between the two engines | — | **8 of 32** |
| mean health delta over all 32 (engine to engine) | — | **+0.028** |
| largest single move | — | **+3.1** (`transfer-window`, 51.6 → 54.7) |
| largest in the other direction | — | **−1.5** (`the-key-under-the-mat`, 69.3 → 67.8) |
| verdict flips | — | **0** |
| scene-count changes | — | **0** |
| cost of that one marked line vs the untouched script | −4.2 worst (`transfer-window`) | −1.1 worst (`transfer-window`) |

**The mechanism, with the file.** An `action` block feeds `actionLines`, the word
count and every rule lexicon (`server/nvm/analyze/fountain-analyzer.ts`, the
`extractSceneContent` accumulation, whose own comment says
"parenthetical/transition/shot/… carry no signal for these heuristics and are
intentionally skipped"). A `transition` block is skipped by those heuristics
while still counting in `wordCount` via `PRINTING_BLOCK_TYPES`. So reclassifying
one `>` line from action to transition changes scene-text density and the issue
counts that ride on it: `transfer-window` 144 → 134 issues, `night-shift-excellent`
82 → 100. **The direction is not uniformly favourable** — `night-shift-excellent`
goes 78.9 → 77.8 — which is what a correctness fix looks like rather than a
tuning one.

**`npm run benchmark:public`, this tree and a `git archive 089bec91` export,
same command:**

```
SHUFFLE_DROP      matched-pair 0.8438 [0.7188, 0.9688] floor 0.8238
                  all-pairs    0.7896 [0.6738, 0.8975] floor 0.7696
CLIMAX_RELOCATE   matched-pair 0.5938 [0.4219, 0.7500] floor 0.5738
                  all-pairs    0.5234 [0.4678, 0.5874] floor 0.5034
DIALOGUE_FLATTEN  matched-pair 1.0000 [1.0000, 1.0000] floor 0.98
                  all-pairs    0.9814 [0.9531, 1.0000] floor 0.9614
```

**All six identical to the digit on both trees, so no floor would move and none
was moved.** The control was checked deliberately, because a change to
transition or character typing is exactly the kind that could move
`DIALOGUE_FLATTEN`: **it did not** — 1.0000 / 0.9814, 32 of 32 ordered, zero
ties, both trees. `npm run benchmark:public -- --lock` was never run;
`git diff 089bec91..HEAD -- scripts/lib/auc.ts
tests/fixtures/public-corpus-manifest.json
tests/fixtures/public-benchmark-split.json` is empty; `AUC24_FLOOR` is untouched
at 0.622.

**`npm run --silent probe-corpus-shape -- --public`** (the owner's first
instruction, run before any AUC is read): exit 0, the `>tr` column present in
the table head and every row, and the group summary reading

```
scripts with a forced cue  0 of 32  (so round 3's `@` change cannot have moved one of them)
scripts with a forced transition  0 of 32  (so the 2026-09-13 `>` change cannot have moved one of them)
```

---

## 6. Fail-first

Every new assertion was shown failing on a `git archive 089bec91` export with
only the two changed test files copied in, before it was shown passing here.

| file | on the `089bec91` export | here |
|---|---|---|
| `tests/core/parse-format-invariance.test.ts` | **4 fail** / 69 pass | **73 / 73** |
| `tests/core/fdx-import.test.ts` | **3 fail** / 9 pass | **12 / 12** |

The four: the parser's element sequence on a custom forced transition, the
seam-agrees-with-the-page property, the four-renderer check, and the forced-cue
edge case (which fails on the base only because of its contrasting
forced-transition assertion — the two `@` halves of it pass on both trees, and
that is stated here rather than left to be mistaken for a test that cannot
fail). The three: the custom-transition import, the full Fountain → FDX →
Fountain round trip, and the pinned importer colon behaviour.

**One assertion had to be rewritten because it could not fail.** The PDF check
was first written as `pdf.includes('>') === false`. `>` is PDF dictionary syntax
(`>>` closes one), so that assertion can never be false on any document. It now
extracts the `(...) Tj` text-showing operators and asserts over those, plus that
the transition itself is still drawn. This is recorded because it is exactly the
shortcut §6 item 3 of the lane standard tells a reviewer to look for, and it was
in my own first draft.

**Two subtests deliberately pass on BOTH trees** and must never change: "the
three shapes that are NOT a forced transition keep the character they typed"
(centering, a `>` inside a speech, a bare `>`), and the two `@`-out-of-cue-
position assertions. They are the both-directions guards; they are named here so
they are not mistaken for tests that cannot fail.

---

## 7. Gates, in the foreground, with exit codes

| gate | command | exit |
|---|---|---|
| touched tests | `node --experimental-strip-types --test tests/core/parse-format-invariance.test.ts` (73 pass) | 0 |
| | `… tests/core/fdx-import.test.ts` (12 pass) | 0 |
| | `… server/nvm/analyze/screenplay-normalizer.test.ts` + unicode-character-cues + export-xml-wellformed + pure-core-boundary + multilingual-headings + incremental-reparse + pdf-import, one run (100 pass) | 0 |
| | `… tests/core/core-01 core-02 core-03 page-estimate page-estimate-realism corpus-shape-fields coverage-html scoring-receipt-guard` (1,282 pass) | 0 |
| | `… tests/routes/export-fdx-docx-parity export-producer export-coverage fountain-shape-guard-cue-bypass` (99 pass) | 0 |
| | `… tests/security/fountain-shape-guard-cue-parity.test.ts` (654 pass) | 0 |
| | `… tests/core/brain-coverage.test.ts` (7 pass) | 0 |
| lint | `npm run lint` (`tsc --noEmit`) | 0 |
| console | `npm run check-no-console` — 304 files, 23 quarantine entries | 0 |
| reachability | `npm run check-server-reachability` — 78 allowlisted | 0 |
| build | `npm run build` — 2.81 s | 0 |
| docs | `npm run check-docs` | 0 |
| honesty | `npm run honesty-audit` — 458 files, 475 markdown, 93 claims | 0 |
| brain | `npm run brain` then `npm run check-brain` — 105 notes, 391 links, fresh | 0 |
| gates | `npm run gates` — the public-benchmark suite RAN and, re-run with `PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR` raised to 0.8938, FAILED on that floor by name; 11.87 s | 0 |
| metamorphic | `npm run test:metamorphic` — 8/9 raw, 1 documented witness (`empty_verbosity`) | 0 |
| identity | `check-doctor-output-identity.mjs --tree <089bec91 export> / --tree . / --compare`, `GIT_SHA=batterypin` on both | 0 |
| benchmark | `npm run benchmark:public`, both trees | 0 |
| probe | `npm run --silent probe-corpus-shape -- --public` | 0 |
| receipt | `node scripts/check-scoring-receipt.mjs 089bec91..HEAD` — naming exactly ONE PENDING entry (intended) | 1 |
| full suite | `npm test`, once, on the final tree | see §9 |

---

## 8. The receipt

`docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` gains **exactly one** entry over
`089bec91..HEAD`, dated 2026-09-13 and headed PENDING OWNER MEASUREMENT.
`node scripts/check-scoring-receipt.mjs 089bec91..HEAD` exits **1** reporting
exactly one problem — that entry, as a PENDING entry — which is the intended
state. Two scoring-path files are listed as changed
(`server/nvm/analyze/screenplay-normalizer.ts`, `src/lib/fountain.ts`).

One correction was needed to get there. The attestation first read "No number in
this entry is simulated, estimated, extrapolated or projected" — true, and
`CLAIM_FIELD_SIMULATION_RE` read it as the field admitting a simulated run, so
the gate reported TWO problems. Said the same thing in words the scan does not
have to disambiguate.

---

## 9. What is left undone

* **The `lintErrors` channel for a declined marker** — named in §3 with the file
  and the two lines that make it a UI change rather than a parser one.
* **`formatTransition` appends `:` to any Final Draft transition that lacks
  one**, including `FADE OUT.`, which is one of Fountain's four canonical
  transitions and ends in a period by definition. That is a text mutation in the
  importer, present long before this work and unrelated to markers; what this
  change does is stop the mutated line ALSO losing its element type. It is
  PINNED in `tests/core/fdx-import.test.ts` rather than fixed: changing it
  changes the imported text of every `.fdx` this repository accepts, which is an
  exports question with no measurement in this lane.
* **A `>` line immediately after a dialogue line, with no blank between, is
  still dialogue.** That is this parser's existing rule and the brief's own
  negative fixture, and it is pinned — but `!`, `.` and `~` DO break out there,
  so the asymmetry is real and is named rather than smoothed over.
* **The private corpus cannot be read from here**, so how many of the 761 drafts
  carry a forced transition is unknown. The `>tr` column is the instrument that
  answers it in one run; this lane provides the instrument and claims no reading
  from it.
* **The lane is not merged.** It waits on the owner's `npm run measure-real`.

---

## Tip and origin

`git ls-remote origin scoring/renderer-residuals` gives the tip at any moment,
and is the authority. The last commit touching anything outside `docs/` is
`80b1621f`, so `git diff 80b1621f..HEAD -- ':!docs'` is empty and every
measurement above was taken on that tree.
