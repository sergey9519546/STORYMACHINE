# Independent review — `scoring/forced-cue` round 1 (**`f258c405`**)

**Reviewer:** the independent scoring-path reviewer who wrote rounds 1-4 of
`scoring-review.md`, including the round-2 note that judged pinning `@` to be
honest scoping. This lane closes that pin, so I am re-checking my own
judgement as well as the lane's work.
**Object:** `scoring/forced-cue` @ `f258c405`, worktree `/home/user/wt-forcedcue`,
clean at the reviewed SHA; `origin/scoring/forced-cue` is at the same SHA.
Twelve commits over `4cf5b2f3` (ten code, two report), rebased from a lane cut
at `3124a94e`.
**Lane report:** `docs/audits/2026-09-12-adversarial/forcedcue-lane-report.md`
(512 lines, read in full).
**Method:** `git archive` exports of `4cf5b2f3` (the merge target) and
`1a8cc967` (the commit where the parser reads `@` and the guard does not) in
`<session scratch>`, `node_modules` symlinked. Nothing committed, pushed,
merged or checked out; `--lock` never run; no full `npm test`; no private
corpus on this machine and none sought.

Scoring-path work, so the verdict is READY-FOR-OWNER or REVISE, never MERGE.
It is **READY-FOR-OWNER**.

---

## 1. The ROUND 9 fix — the item I was asked to push hardest on

### 1.1 The hole was real, and I reproduced every cell of the table

`<session scratch>/payload.mjs` builds the round-5/6 shape (distinct 600,
occurrences 12,000, each cue adjacent to its speech) twice — once with bare
cues, once with `@` on every cue — and reads `guardCueOccurrences`, the
pipeline's character-block count, the round-8 oracle and the rejection reason
on three trees:

| tree | forced-cue payload: `guardCueOccurrences` | pipeline cue blocks | oracle `guard >= pipeline` | rejected by |
|---|---|---|---|---|
| `4cf5b2f3` (base) | 0 | **0** | true | **ACCEPTED** (cheap: `@` made no cues) |
| `1a8cc967` (parser taught, guard not) | **0** | **12,000** | **FALSE** | `MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT` — the **real-parse** bound |
| `f258c405` (tip) | **12,000** | 12,000 | true | `MAX_FOUNTAIN_FREQUENT_CUE_LINES` — the **cheap pre-parse** bound |

Every figure matches the lane's §5b table, including the bound each payload
trips **by name**. The characterisation is also right and matters: on the
unchanged base the payload is accepted and costs nothing because there are no
cues there either, so this is **a hole the parser change opened, not one it
revealed**. Writing one character in front of each cue turned the cheap bound
off for exactly one commit of this lane's history, and the lane found it with
its own full-suite run rather than leaving it for me.

### 1.2 Is the fourth disjunct as tight as the other three? **No — and that is the right answer**

```ts
const trimmed = line.trim();
if (trimmed.startsWith(FORCED_CUE_MARKER) && trimmed.slice(1).trim() !== '') return true;
return CHARACTER_CUE_RE.test(line) || CUE_LIKE_LINE_RE.test(line) || isCharacterCue(line);
```

It is a bare prefix test where the other three are alphabet grammars, so it is
far wider — the comment says so ("deliberately the WIDEST of the four"). Three
things make that defensible, and I checked each rather than accepting the
argument:

**(a) It cannot reintroduce an earlier bypass, by construction.** The code is
`D || A || B || C`, which is monotone: a line the old guard called cue-like
still is. A bypass is a false *negative*, so widening cannot create one.
Checked empirically as well as structurally — a grammar product over every
family rounds 1-8 covered plus the `@` family
(`<session scratch>/mono2.mjs`, 15 name shapes × 7 extension tails × 10
prefixes):

```
lines checked 1050 | base-true that went FALSE at tip: 0 | newly true at tip: 315
```

Both bypass suites pass at the tip: `fountain-shape-guard-cue-bypass` **59/59**,
`fountain-shape-guard-cue-parity` **653/653**, EXIT=0 each.

**(b) The risk it does carry is the other direction — a legitimate document
rejected — and the realistic case is provably unaffected.** The widened
predicate feeds a walk that still requires the structural cue POSITION, so a
line beginning `@` inside a speech never becomes an occurrence. Measured
(`<session scratch>/falsepos2.mjs`), a 60-scene feature whose 1,200 dialogue
lines each open `@user…`:

```
social-media feature (1200 dialogue lines opening @user):
  tip   cueOccurrences = 1200   ACCEPTED
  base  cueOccurrences = 1200   ACCEPTED
```

**Identical on both trees.** The disjunct's width does not reach a document
that merely mentions handles; the tightening is done by the walk, not the
predicate.

**(c) Where it does bite, it bites at the existing threshold and on documents
that really are cues.** `@handleN` + a speech line, repeated 16 times each:

```
 50 distinct × 16   cueOccurrences 800    ACCEPTED
 51 distinct × 16   cueOccurrences 816    REJECTED (MAX_FOUNTAIN_FREQUENT_CUE_LINES = 50)
200 distinct × 16   cueOccurrences 3200   REJECTED
```

No threshold changed; at the tip those payloads genuinely are 800-3,200
character cues, so rejecting them is the guard working, not a false positive.
The same shapes without the marker read 0 and are accepted on both trees.

An ordinary forced-cue draft (12 scenes × 30 speeches, every cue forced) is
**ACCEPTED** on both trees, which is the lane's own stated other direction.

### 1.3 The self-disclosed slip in §5b

The parity oracle's rejection assertion now builds its regex from
`MAX_FOUNTAIN_FREQUENT_CUE_LINES` and `FREQUENT_CUE_OCCURRENCE_THRESHOLD` —
the two constants the payload actually trips — rather than from
`MAX_FOUNTAIN_DISTINCT_CUE_LINES`. The disclosure is accurate, the fix is the
right one (build the oracle from the bound it means, not from a literal or the
neighbouring constant), and writing it up as "the same mistake in miniature"
next to the ROUND 9 finding is the correct instinct.

---

## 2. The renderer table, checked by hand

I built the lane's fixture independently (`@MARY`, `@McCLANE`, `@田中`,
`@MARY ^`, each with a speech, in a two-scene document) and drove every
exporter on both trees (`<session scratch>/render.mjs`, `<session scratch>/docx.mjs`).

| surface | `4cf5b2f3` | `f258c405` |
|---|---|---|
| `parseFountain` element types | all 12 blocks `action` | `scene_heading, action, character, dialogue, character, dialogue, dual_dialogue, dialogue, dual_dialogue, dialogue, scene_heading, action` |
| `layoutScreenplay` | 23 lines, **4** `@` | 19 lines, **0** `@` |
| `fountainToPdf` | **4** `@` in the content stream | **0** |
| `fountainToFdx` | **4** `@`; `Type="Action"` ×10, Character 0, Dialogue 0 | **0** `@`; **Character 4, Dialogue 4**, Action 2 |
| `fountainToDocx` → `word/document.xml` | **4** `@`; `Action` ×10 | **0** `@`; **Character ×4, Dialogue ×4** |

Every cell of the lane's §3 table, on my own probe, including the 23 → 19 line
drop. The DOCX row I unzipped and read `document.xml` directly rather than
counting bytes in the archive.

**The FDX importer round trip**, also by hand
(`<session scratch>/fdxin.mjs`, a minimal `.fdx` with one Character paragraph):

| Character paragraph | `4cf5b2f3` | `f258c405` |
|---|---|---|
| `田中` | `田中` → parses `action, action` (**the speech is lost**) | `@田中` → parses `character, dialogue` |
| `MARY` | `MARY` → `character, dialogue` | **byte-identical** |
| `McCLANE` | `MCCLANE` | **byte-identical** |
| `Mary Ann` | `MARY ANN` | **byte-identical** |

The claim that cue-shaped names round-trip unchanged holds, and the caseless
name is the only thing that moves.

**The analyzer/renderer split this lane exists to close is closed for `@`**:
the parser reads the marker and all four exporters drop it, and because
`renderableText` is one definition called by all three of the old `cleanText`
copies, the two halves cannot drift apart again without a test noticing.

---

## 3. The 32 committed scripts, and my own `@`-family transforms

### 3.1 The headline reproduces to the digit

`<session scratch>/r2markers.mjs` (my own probe from round 2 of the sibling
lane), six transforms, six-field surface, both trees:

| transform | `4cf5b2f3` | `f258c405` |
|---|---|---|
| forced-cue `@` on every character cue | **32 / 32, mean −1.172, largest −26.8 on room-12** | **0 / 32, mean 0.000** |
| forced-action `!` | 0 / 32 | 0 / 32 |
| forced-heading `.` | 0 / 32 | 0 / 32 |
| forced-transition `>` | 0 / 6 | 0 / 6 |
| `(V.O.)` → `(V.O)` | 0 / 8 | 0 / 8 |
| every extension without periods | 0 / 14 | 0 / 14 |

32/32 → 0/32 with the mean and the largest exactly as reported, and — the part
worth saying — **the other five rows stayed at zero**, so closing `@` did not
reopen anything the sibling lane closed.

### 3.2 My own transforms in the `@` family

The brief asked for four; I ran eleven (`<session scratch>/fc-parse.ts`). All
behave to the Fountain spec.

| case | result |
|---|---|
| `@MARY` (redundant, already all-caps) | `character`, renders **`MARY`** |
| `@MARY (V.O.)` | `character`, renders `MARY (V.O.)`; `stripCueDecorations` → `MARY` |
| `@MARY (into phone)` | `character`, renders `MARY (into phone)` — matches the §6.4 disclosure |
| `@handle` (lowercase, in cue position) | `character` — the marker's entire purpose |
| `@田中` | `character`, renders `田中` |
| `@田中 ^` after a cue | `dual_dialogue`, retags the preceding cue, renders `田中` |
| `@everyone, listen up.` as the **second line of a speech** | **stays `dialogue`** — the guard the report promises |
| `@` alone on a line | `action` — not a cue |
| `@` with a whitespace-only body | `action` — not a cue |
| `@everyone in the room turned.` opening an action paragraph, **followed by a blank line** | `action`; the `@` is rendered literally |
| `@everyone in the room turned.` opening an action paragraph, **followed by a non-blank line** | **`character`**, and the next line becomes `dialogue` |

The last row is the one finding in this section, and it is non-blocking: it is
what the Fountain specification says (`@` at line start forces a cue, and this
parser applies the same "blank line above, text below" shape it applies to an
unforced one), and the parser is right. But §2 of the lane report uses
`@everyone, listen up` as its example of what the change protects, and the
protection it actually has is **"not inside a speech"**, not "not on prose". A
writer who opens an action paragraph with `@` and does not leave a blank line
after it gets a speaker. See non-blocking 1.

The empty-body guard is present in both halves — the parser (`cueLine !== ''`)
and the cost guard (`trimmed.slice(1).trim() !== ''`) — and I confirmed both.

---

## 4. The pin flip, and the second pin

Round 2's instruction was: *"move this row into FORMAT_TRANSFORMS as an
invariance assertion, check that every renderer strips the marker too, and
delete this test. Do not relax it."* All three, verified:

* `describe('the forced cue \`@\` is a known, quantified gap (round 2)')` is
  **deleted** — `grep -c "PINNED KNOWN GAP"` on the tip returns **0**.
* `@` is now a `FORMAT_TRANSFORMS` row asserting **0 of 32**, beside `!`, `.`
  and `>`.
* The renderer half is asserted in the same file — layout, FDX, DOCX
  (`<w:t>` runs) and PDF each checked for `@`, on a cue only `@` can express,
  which is the direction an analyzer that merely *deleted* the marker could
  not fake.
* The second pin I had not named either: `unicode-character-cues.test.ts` went
  from `assert.equal(blockTypeInContext('@たなか'), 'action', 'forced-cue
  support arrived without a test')` to `'character'`, with the both-directions
  companion asserting the **unmarked** `たなか` is still `action` — which is
  the caseless-alphabet decision itself and must not move.

**Fail-first**, my own copy of the three test files onto a `4cf5b2f3` export
(the lane measured against `3124a94e`; the two trees differ only by round 4's
memo, and the result is the same):

| file | on the `4cf5b2f3` export | at the tip |
|---|---|---|
| `parse-format-invariance.test.ts` | **5 fail** / 60 pass | **65 / 65** |
| `unicode-character-cues.test.ts` | **1 fail** / 16 pass | **17 / 17** |
| `fdx-import.test.ts` | **1 fail** / 8 pass | **9 / 9** |

5 + 1 + 1, exactly as claimed.

---

## 5. The `>` disclosure — honest, and now the only one left

Checked rather than taken (`<session scratch>/gt2.mjs`):

```
>CUT TO:   analysis seam (normalizeScreenplay + parseFountain):  transition:"CUT TO:"
           parseFountain on the RAW text:                        action:">CUT TO:"
           renderableText:                                       ">CUT TO:"
           fountainToFdx:                                        prints '>' in a Text node
           layoutScreenplay:                                     prints ">CUT"
>SMASH TO BLACK.  same, and not stripped at the analysis seam either
```

So the analyzer/renderer split **still exists for `>`**, exactly as §6.7 says,
with exactly the mechanism it names: the parser has no forced-transition
branch, the line arrives typed `action`, and `renderableText`'s `centered`
strip does not reach it. The report's judgement that the fix is a parser
branch rather than a renderer strip is correct — it is the same shape of
change this lane made for `@`. Named with its mechanism, not fixed, out of
scope. That is an honest disclosure, and it is now the branch's only remaining
instance of the defect class its own organising principle is built on.

---

## 6. The regression surface

```
GIT_SHA=FCPIN --tree <scratch>/fcbase (4cf5b2f3) and --tree . (f258c405)
--compare  ->  OUTPUT IDENTITY: PASS — all 45 reports byte-identical            EXIT=0

npm run benchmark:public                                                        EXIT=0
  0.8438 / 0.7896 · 0.5938 / 0.5234 · 1.0000 / 0.9814

node scripts/check-scoring-receipt.mjs 78ec4464..HEAD
  EXIT=1 — exactly ONE "PENDING ENTRY"

git diff --stat 4cf5b2f3..f258c405 -- scripts/lib/auc.ts
                                      tests/fixtures/public-corpus-manifest.json
                                      tests/fixtures/public-benchmark-split.json
  (empty — all three untouched)
```

Benchmark to the digit for the fifth consecutive object in this batch;
`AUC24_FLOOR` untouched; `--lock` never run.

**The 45/45 is explained, not lucky**, and I verified the explanation myself:
`grep -rlE "^@"` over `data/screenplays/*.fountain`,
`tests/fixtures/*.fountain`, `tests/fixtures/blind-pairs/*.fountain` lists **no
file**, and `grep -cE "^\s*@"` over `src/lib/sample-script.ts` and
`server/nvm/analyze/calibration/corpus.ts` returns **0** and **0**. No
committed fixture has a line beginning `@`, which is simultaneously why the
harness cannot move and why nothing in this repository could have caught the
defect.

| gate | result |
|---|---|
| `npm run lint` · `check-no-console` · `check-docs` · `honesty-audit` · `check-brain` | EXIT=0 (all five) |
| `npm run gates` | **EXIT=0**; mutation check raised `PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR` to 0.8938 and the suite **FAILED on that floor by name** |
| `npm run test:metamorphic` | EXIT=0 — 8 hard passes, 1 documented witness |
| `tests/routes/fountain-shape-guard-cue-bypass.test.ts` | **59 / 59** |
| `tests/security/fountain-shape-guard-cue-parity.test.ts` | **653 / 653** |
| `parse-format-invariance` · `unicode-character-cues` · `fdx-import` | 65 / 65 · 17 / 17 · 9 / 9 |

**The `@cue` column's semantics are exactly as documented.** `countForcedCues`
parses the RAW submission and counts blocks the parser typed `character` or
`dual_dialogue` whose text starts with the marker. On a document holding one
forced cue, one `@`-opened action paragraph and one `@` inside a speech it
returns **1** where `/^@/gm` returns **3** — the two lines the change
deliberately leaves alone are correctly not counted. `npm run --silent
probe-corpus-shape -- --public` carries the column in the table and
`forcedCueLines` in the CSV, reading **0 of 32** with the explanatory clause.

---

## VERDICT: **READY-FOR-OWNER**

This closes the residual my own round-2 note judged to be honest scoping, and
it closes it in the direction that note said was required: the parser reads the
marker **and** every renderer drops it, so neither half can be true without the
other. Every headline reproduces on my own probes — the renderer table cell by
cell, the FDX round trip, 32/32 → 0/32 with the mean and the largest to the
digit, the fail-first 5 + 1 + 1, 45/45 identity, the benchmark to the digit,
the receipt at one PENDING entry.

The ROUND 9 finding is the strongest thing in the lane. It is the ninth
instance of a pattern with eight recorded prior rounds, it is the first to
arrive with a parser change rather than a review, the lane found it with its
own full-suite run, and it is written up with the bound each payload trips by
name rather than as "still rejected". I reproduced the unsafe state at
`1a8cc967` (guard 0 against a pipeline of 12,000, oracle FALSE) and the fixed
state at the tip. The widened disjunct cannot reintroduce an earlier bypass —
monotone by construction, and 0 of 1,050 grammar-product lines regressed — and
the false-positive risk it theoretically carries does not reach a realistic
document, because the walk still requires cue position.

Nothing blocking. Five non-blocking items.

### Non-blocking

1. **The in-speech guard is narrower than §2's sentence implies.** The report
   says reading `@everyone, listen up` as a cue "would be worse than the bug
   being fixed", and the guard delivers that **inside a speech**. The same
   line at the head of an action paragraph followed by a non-blank line *is*
   read as a cue, and the line under it becomes dialogue. That is what the
   Fountain specification says and the parser is right, but one clause —
   "inside a speech; at the head of a paragraph the spec makes it a cue, which
   is the marker's purpose" — would stop the sentence reading as a wider
   promise than the code gives. The invariance suite's both-directions subtest
   covers the in-speech case only.
2. **The fourth disjunct's safety is measured here but not asserted
   anywhere.** The suite asserts the weaker half (an ordinary 30-speech
   forced-cue draft is accepted). The property that makes the widening
   defensible is the one I measured: a document whose *dialogue* opens with
   handles reads the same `guardCueOccurrences` as it did before the change
   (1,200 vs 1,200) because the walk requires cue position. A test pinning
   that would turn the argument into a property, and it is cheap.
3. **`@`-opened action lines render the marker literally.** An `@` line that
   is not in cue position stays `action` and `renderableText` leaves the `@`
   on it, so it prints. Defensible — it is not a cue, so the character is
   literal text — but it is the same family as the `>` residual and worth one
   line beside it, since `renderableText` is now the one place either strip
   would go.
4. **The report's own `Tip:` line is one commit stale.** It names `6d8f1653`
   while origin and the worktree are at `f258c405`, whose subject is "the
   report's Tip line survives the rebase" — the commit that exists to fix the
   line left it pointing at its own parent. Purely cosmetic and provably so:
   `git diff --stat 6d8f1653..f258c405` touches only the report, and
   `git diff 78b7e696..f258c405 -- ':!docs'` is **empty**, so no code follows
   the last code commit. Worth correcting so the reviewed SHA in the audit
   README and the report agree.
5. **Carried forward from the sibling lane, unchanged and still binding:**
   `MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT = 1,500,000` must not land before the
   `lane/rulebook-and-guard-bound` re-derivation to 675,000 is applied on the
   merged tree with the analyzer pair cap in place. This lane does not touch
   that constant.

### What the owner's run settles and what it cannot

**Settles, and this one is answerable by counting.** Whether any of the 761
drafts carries a forced cue. The engine's behaviour before this change was
total — a draft with no `@` cue cannot have moved — so the `@cue` column of
`npm run --silent probe-corpus-shape` settles the whole corpus in one run. A
corpus of all-zero counts closes the question outright; any non-zero row is
exactly the set of documents whose speakers, `dialogueLineCount` and
dialogue/action ratio moved, and those are the rows to read per-script before
any rank statistic. This is now the **fifth** corpus-visible change in the
stack, after the strip-order change, the passes reading the reconstructed
text, the forced-marker strip and the cue-extension fold; the receipt's
"WHAT TO COMPARE" ordering applies unchanged, and the `@cue` column slots into
its step 1.

**Settles, on a second population.** Whether the corpus was ever imported
through `fdxToFountain` with a Character name the cue alphabet excludes. Those
documents used to lose the speech entirely; they now gain a speaker. The
importer's behaviour on cue-shaped names is byte-identical, so only that
population moves.

**Cannot settle.** Whether honouring `@` is right. Fountain's specification
answers that, not a statistic: the marker declares a Character element and is
never printed, and this branch is the first state of the repository in which
both halves of that sentence are true at once. If AUC-24 moves, the finding is
about how many of those drafts use the marker — read them. `AUC24_FLOOR` does
not move.

**Cannot move at all.** All 45 committed fixture reports are byte-identical,
the six public AUCs are unchanged to the digit, `scripts/lib/auc.ts` and both
benchmark fixtures are untouched, and no committed fixture contains a line
beginning `@`.

---

*Round 1. Reviewed SHA **`f258c405`**. On a revision, the same reviewer
re-checks these items against the new diff.*

---

## Round 2 — re-check of `089bec91`

**Object:** four commits over `f258c405` (`523c38c8`, `282fa2b6`, `75de2c55`,
`089bec91`); origin is at the reviewed SHA and the worktree is clean at it.
`git diff --stat 282fa2b6..089bec91 -- ':!docs'` is **empty**, so `282fa2b6` is
the last commit touching code. Warm re-check of my own four non-blocking items;
same method, nothing committed or pushed, `--lock` never run, no full
`npm test`.

### R2.a Item 1 — the cue-position guard, said where it is claimed and pinned

`src/lib/fountain.ts` now carries "WHAT THAT DOES AND DOES NOT PROTECT,
exactly" beside the parser branch, and it draws the line where the code draws
it: the protection is **cue position**, not prose. The new subtest pins the
boundary in three positions **on one sentence**, which is the right shape for
this — the same bytes, three placements:

| placement of `@everyone in the room turned.` | asserted |
|---|---|
| head of a paragraph, non-blank line under it | `scene_heading,character,dialogue` — **IS a cue** |
| head of a paragraph, blank line under it | `scene_heading,action,action` |
| second line of an action paragraph | `scene_heading,action,action` |

The first row is the one I raised, and pinning it as *correct* rather than
apologising for it is right: a parser that refused there could not express the
caseless cue this whole lane exists for, and the failure message says so. The
test now fails if someone "protects prose" and silently breaks the marker.

`tests/core/parse-format-invariance.test.ts`: **66 / 66**, EXIT=0 (was 65).

### R2.b Item 2 — the fourth disjunct's safety is a property now, and I re-ran the mutation myself

The new assertion in `fountain-shape-guard-cue-parity.test.ts` builds the
document I measured in round 1 — 60 scenes, 1,200 speeches, every **dialogue**
line opening `@handle…` — and asserts three things: the walk counts 1,200 and
not 2,400, the count is unchanged when the handles are stripped, and the
document is ACCEPTED.

Reproduced on the tip:

```
TIP  guardCueOccurrences            = 1200
TIP  same document, handles stripped = 1200
TIP  fountainShapeRejectionReason    = ACCEPTED
```

**And the mutation, run by me rather than read.** I exported `089bec91`,
disabled the walk's cue-position check with one edit
(`if (!nextLineIsDialogue) continue;` → `if (false && !nextLineIsDialogue)`),
and re-ran:

```
MUTANT  guardCueOccurrences = 2400
MUTANT  tests/security/fountain-shape-guard-cue-parity.test.ts
        not ok — "a document whose every DIALOGUE line opens with `@handle` counts its cues and nothing else"
        "the walk must count the 1200 cues and NOT the 1200 dialogue lines that merely start with \"@\"."
        EXIT=1
```

Exactly 2,400 and the named failure. So the claim I could only measure in round
1 is now a property the suite enforces, and it is enforced by the mechanism
that actually does the work — the walk's cue-position check, not the disjunct.
That is the correct place to have put the assertion.

`fountain-shape-guard-cue-parity.test.ts`: **654 / 654** (was 653);
`fountain-shape-guard-cue-bypass.test.ts`: **59 / 59**, both EXIT=0.

### R2.c Items 3 and 4

* **Item 3.** §6.7 now names both residuals with the shared mechanism —
  `renderableText` strips `@` only from `character` / `dual_dialogue`, so a
  `@` line that is not in cue position prints from every exporter — and it
  grades them correctly: one step milder than `>`, because the line is not a
  cue and the marker declares nothing. It also states the cost of closing it
  (a decision that a leading `@` never prints, which is a claim about prose
  this lane has no measurement for), which is the honest reason to leave it.
  Both residuals now point at the one function either strip would live in.
* **Item 4.** The better answer than the one I asked for. Rather than writing
  a third literal SHA, the header pins **the last code commit** — `282fa2b6`,
  with `git diff 282fa2b6..HEAD -- ':!docs'` empty as the proof — and explains
  that a line inside a file cannot name the commit that writes it, which is
  the failure mode rather than an accident. I verified the proof: that diff is
  empty, so every measurement in the report was taken on the tree it names.
  The three historical SHAs (`5be366be`, `22c6b03f`, `f258c405`) are kept as
  the lineage.

### R2.d The regression surface

```
GIT_SHA=FC2PIN, --tree <scratch>/fcbase (4cf5b2f3) and --tree . (089bec91)
--compare  ->  OUTPUT IDENTITY: PASS — all 45 reports byte-identical           EXIT=0

npm run benchmark:public                                                       EXIT=0
  0.8438 / 0.7896 · 0.5938 / 0.5234 · 1.0000 / 0.9814

node scripts/check-scoring-receipt.mjs 78ec4464..HEAD   EXIT=1, exactly ONE PENDING entry

git diff --stat f258c405..089bec91 -- scripts/lib/auc.ts
                                      tests/fixtures/public-corpus-manifest.json
                                      tests/fixtures/public-benchmark-split.json
  (empty — all three untouched)
```

| gate | result |
|---|---|
| `npm run lint` · `check-no-console` · `check-docs` · `honesty-audit` · `check-brain` | EXIT=0 (all five) |
| `npm run gates` | **EXIT=0**; mutation check raised `PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR` to 0.8938 and the suite **FAILED on that floor by name** |

Benchmark to the digit for the sixth consecutive object in this batch.

## VERDICT: **READY-FOR-OWNER**

Four items, four clean answers, and two of them better than what I asked for:
the cue-position boundary is pinned as *correct behaviour on one sentence in
three placements* rather than hedged, and the `Tip:` problem is solved by
pinning the last code commit with a falsifiable proof instead of a third
literal SHA that would have gone stale the same way. The guard property is now
enforced where the work happens, and I confirmed by mutation that the
assertion can fail and names the number when it does.

Round 2 moves no score: 45 of 45 reports byte-identical to `4cf5b2f3`, six
AUCs to the digit, `auc.ts` and both benchmark fixtures untouched, receipt
still at one PENDING entry. Two new tests, both two-sided, neither able to pass
vacuously.

I have no further items on this branch.

### Non-blocking

1. **Carried forward, unchanged and still binding:**
   `MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT = 1,500,000` must not land before the
   `lane/rulebook-and-guard-bound` re-derivation to 675,000 is applied on the
   merged tree with the analyzer pair cap in place. Neither round of this lane
   touches that constant.
2. **The two renderer residuals** (`>` forced transitions, and `@` lines that
   are not in cue position) are named, mechanised and sized, and both would be
   fixed in `renderableText` — the `>` one behind a parser branch first. They
   are the next lane, not this one's debt.

### What the owner's run settles and what it cannot

Unchanged from round 1 — round 2 moves no number. The `@cue` column of
`npm run --silent probe-corpus-shape` still settles, by counting, whether any
of the 761 drafts carries a forced cue, and the FDX-import population is still
the second thing to look at. What round 2 adds is that the two properties the
change rests on — the parser's cue-position boundary and the guard's
position-bounded walk — are now assertions in the suite rather than
measurements in a review, so a future change that quietly widens either one
fails a named test instead of waiting for a tenth round.

---

*Round 2. Reviewed SHA **`089bec91`** (last code commit `282fa2b6`); round 1's
was `f258c405`.*
