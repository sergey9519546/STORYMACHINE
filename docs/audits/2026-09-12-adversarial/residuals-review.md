# Residuals review — round 1, reviewed SHA `0944b4f9`

**Reviewed object:** `scoring/renderer-residuals` @ `0944b4f9`, base `089bec91`
(= `origin/scoring/forced-cue`, itself on `scoring/adversarial-2026-09-12` @
`4cf5b2f3`). **Worktree:** `/home/user/wt-residuals`, clean, `git diff
80b1621f..HEAD -- ':!docs'` empty (verified), 7 commits in range.
**Reviewer:** independent; did not build this change.
**Lane report:** `docs/audits/2026-09-12-adversarial/residuals-lane-report.md`.

This is a scoring branch. MERGE/REVISE here means "ready / not ready for the
owner's `npm run measure-real`"; nothing is merged in this sandbox.

---

## 1. The brief, item by item

| # | item | verdict |
|---|---|---|
| A | forced transition `>` fixed at the parser seam, one implementation, type `transition`, marker stripped once, right-aligned in layout/PDF/FDX/DOCX | **DONE** — driven and confirmed on all four (§3) |
| B | `@` out of cue position: decide with spec citation; the lane REJECTED the brief's hypothesis and keeps the marker printing | **DECIDED, and the decision holds** (§4). Not blocking. |
| C | round-trip losslessness through every exporter that claims it; fixtures both ways — centered stays centered, `>` inside dialogue stays dialogue, `@` inside parenthetical stays put | **NARROWED** — the `>`/`@` round trip is asserted and correct; "centered stays centered" is asserted only at the parser, and it FAILS both at the analysis seam and through the FDX round trip (findings 1 and 1b). Neither failure is named in the report's §9. |
| D | tests positive/negative; stacked branches' parse-invariance and permutation-ensemble still pass | **DONE** — 85/85 on the two touched suites, 5/5 on `order-ensemble`, run here |
| M | exactly one PENDING receipt; six benchmark statistics to the digit; `auc.ts` + both fixtures untouched; `>tr` column; 0 of 32 | **DONE** — every one of these reproduced or verified (§2, §6) |

---

## 2. The number I reproduced

```
$ cd /home/user/wt-residuals && npm run benchmark:public
SHUFFLE_DROP      matched-pair 0.8438 [0.7188, 0.9688]   all-pairs 0.7896 [0.6738, 0.8975]
CLIMAX_RELOCATE   matched-pair 0.5938 [0.4219, 0.7500]   all-pairs 0.5234 [0.4678, 0.5874]
DIALOGUE_FLATTEN  matched-pair 1.0000 [1.0000, 1.0000]   all-pairs 0.9814 [0.9531, 1.0000]
exit 0, 6.38 s
```

All six digits match the lane report and the receipt exactly, intervals
included. Also verified, not re-derived from the report:

* `git diff 089bec91..HEAD -- scripts/lib/auc.ts
  tests/fixtures/public-corpus-manifest.json
  tests/fixtures/public-benchmark-split.json` → **empty**. No floor moved,
  `--lock` was not run, `AUC24_FLOOR` untouched.
* `node scripts/check-scoring-receipt.mjs 089bec91..HEAD` → **exit 1**, naming
  **one** problem: the single 2026-09-13 PENDING entry. Two scoring-path files
  (`src/lib/fountain.ts`, `server/nvm/analyze/screenplay-normalizer.ts`).
* The receipt gains exactly **one** `###` entry in the range.
* `npm run --silent probe-corpus-shape -- --public` → exit 0, `>tr` in the
  table head, "scripts with a forced transition 0 of 32".
* `npm run check-brain` → 105 notes, 391 links, fresh.
  `node --experimental-strip-types tests/core/brain-coverage.test.ts` → 7/7.
  `Owner - R5 Measurement and Merge` names this branch **LAST**, stacked on
  `scoring/forced-cue` @ `089bec91`, with the stack spelled out.
* Touched suites re-run here: `parse-format-invariance` +
  `fdx-import` → **85 pass, 0 fail**; `order-ensemble` → **5 pass, 0 fail**.

I did not re-run `npm test` or the battery (lane standard §4).

---

## 3. What I drove, as a writer

A fixture with `>CUT TO:`, `>SMASH TO BLACK.`, `>THE END<`, a `>` line inside a
speech, a bare `>`, `@Jimmy-Ray` in cue position, `@handle` with a blank under
it, `@everyone listen up` mid-paragraph, `(@beat)`, and the Fountain spec's own
`> Burn to White.` — pushed through `parseFountain`, `layoutScreenplay`,
`fountainToPdf`, `fountainToFdx`, `fountainToDocx`, and
`fdxToFountain(fountainToFdx(...))` (scripts in `<session scratch>`).

What I saw, all on `0944b4f9`:

* **Parser**: `>CUT TO:` and `>SMASH TO BLACK.` → `transition`, `renderableText`
  → `CUT TO:` / `SMASH TO BLACK.`. `>THE END<` → `centered`. `>` inside the
  speech → `dialogue`, marker kept. Bare `>` → `action`, marker kept.
* **Layout (feeds the PDF)**: `CUT TO:` at `xPt 489.6`, `SMASH TO BLACK.` at
  `xPt 432` — right-aligned against the 108pt action indent. No marker.
* **PDF**: `Tj` text-showing operators contain `(CUT TO:)`, `(SMASH TO BLACK.)`,
  and the only `>` shown is the one inside the speech, correctly.
* **FDX**: `<Paragraph Type="Transition">` for both; one `&gt;` in the file, the
  dialogue one.
* **DOCX**: `<w:pStyle w:val="Transition"/>` with the marker gone from the run.
* **FDX round trip**: `>CUT TO:` → `CUT TO:` (unforced, inferred) and
  `SMASH TO BLACK` → `> SMASH TO BLACK:` — both re-parse as `transition`; the
  trip is idempotent on a second pass. `@田中`-class cues survive forced.
* **Double-spaced reconstruction** (the shape the lane's own test caught):
  `>SMASH TO BLACK.` now survives on its own line as `transition` where it used
  to be glued into the preceding action paragraph. The fix demonstrably works.
* **canonical-fountain packed pass**: `formatCanonicalFountain` on a
  single-spaced document inserts the blank lines around `>SMASH TO BLACK.`
  correctly — the second `isTransition` widening does what it claims.

**Cannot-fail audit (lane standard §3).** I checked every renderer assertion in
the diff for the shape the lane itself flagged. They are sound: the PDF check
extracts `(...) Tj` operands rather than grepping the file (the `>>` trap is
avoided, and the lane records that its first draft had it); the FDX check is
`includes('&gt;') === false`, which is false-able because the exporter escapes
`>` (confirmed: the unfixed shape does produce `&gt;`); the DOCX check counts
`&gt;` inside `<w:t>` runs only; the layout check filters `l.text` for `>`; the
`xPt > 108` check is a real inequality. The three subtests that pass on both
trees are labelled as such in the report and in the test file, which is the
right way to ship a both-directions guard. **No cannot-fail assertion found.**

---

## 4. Residual B: the lane's rejection holds

I read the spec myself rather than taking the lane's quotation on trust
(fountain.io is behind a bot check; the original spec document mirrored at
`static1.squarespace.com/.../fountain.html`, plus the 1.1 forcing text):

* §Character — "A Character element is any line entirely in uppercase, with one
  empty line before it, and without an empty line after it."
* §Character forcing (1.1) — "You can force a Character element by preceding it
  with the 'at' symbol @… Fountain will remove the @ and interpret McCLANE as
  Character, **preserving its mixed case**."
* §Transition — "You can force any line to be a transition by beginning it with
  a greater-than symbol >", with the spec's own example `> Burn to White.`
* §Dialogue — "Dialogue is any text following a Character or Parenthetical
  element."

Three things follow, and the lane got all three right.

1. **The removal of `@` is tied to the interpretation**, not to the character:
   "remove the @ **and interpret** … as Character". Where the line is not a
   Character element there is no interpretation to trigger the removal. The
   spec nowhere contemplates a forced cue with nothing under it, so this is a
   reading, not a citation — but it is the better reading, because the element
   is *defined* by the line that follows it.
2. **The alternative is worse for the writer**, which is the test the brief
   asks for. The only contested shape is a whole `@LINE` followed by a blank or
   EOF (a `@` line with text under it is ALREADY a cue on this branch, forced
   or not; a `@` inside a speech or mid-paragraph is obviously prose). Making
   that shape an unconditional cue turns `@everyone in the room froze.` into a
   dangling, uppercased, centered cue — a worse artefact in the producer's PDF
   than a visible `@`, and silent in the same way. Stripping the marker without
   forcing the element would delete a character the writer typed and break the
   round trip.
3. **"No analyzer/renderer split exists here" is verified, not asserted.** I
   drove it: `normalizeScreenplay` keeps `@handle`, `renderableText` keeps
   `@handle`, and the FDX export carries `@handle`. Same character both sides.
   That is what makes B a different animal from A, and the lane's tests pin it
   in both directions.

The residual harm the lane names — a writer who forgets the speech gets a
printed `@` silently — is real, and its mitigation (`FountainBlock.lintErrors`)
is correctly declined with file and line evidence: `lintErrors` is rendered by
exactly one surface, whose empty state says "No camera bleed detected" and whose
remedy is "Clean with AI" (verified at `AnalysisPanel.tsx:29/71/81/98`), and
whose only current producer is the camera-bleed check at `fountain.ts:484-489`.
Using the channel without redesigning that panel would make its copy lie. **Out
of scope, correctly named.** B is not a blocking item.

---

## 5. Findings, by severity

### 1. (BLOCKING, small) `>text<` centering is still eaten at the analysis seam — the same defect the lane fixed one shape over, and it is a named brief-C fixture

The lane taught both `isTransition` heuristics `isForcedTransitionLine`, which
by construction excludes the `<`-terminated shape. On a double-spaced-shaped
document the normaliser's reconstruction therefore still glues a centered line
into the preceding action paragraph — the *exact* failure the report describes
for `>SMASH TO BLACK.` ("glued into the preceding action paragraph", §2), in the
same function, still live:

```
doc: INT. OFFICE - DAY / Mary closes the file. / She looks up at the window. /
     >SMASH TO BLACK. / EXT. STREET - NIGHT / Rain falls hard. / >THE END<
     (every line followed by a blank — the normaliser's own double-spaced shape)

page: …, transition:">SMASH TO BLACK.", scene_heading, action:"Rain falls hard.",
      centered:">THE END<"
seam: …, transition:">SMASH TO BLACK.", scene_heading,
      action:"Rain falls hard. >THE END<"      ← centering gone, marker scored as prose
```

So `THE END` reaches `actionLines`, the word count and every rule lexicon as
`Rain falls hard. >THE END<`, while the page centers it. That is an
analyzer/renderer split of precisely the class this lane exists to close, and
the brief named "centered stays centered" as a required fixture. The lane's
centering assertion (`'centering must not be eaten by the transition branch'`)
tests the parser only — i.e. the one place the property holds.

Do one of: (a) fix it — teach the normaliser's structural-line detection the
`>…<` shape, which on the 32 committed scripts moves nothing (no fixture
contains a line beginning `>`; grep re-verified here) and rides the same owner
measurement this branch is already waiting on; or (b) pin the current behaviour
with a seam assertion and name it in report §9 as a live, measured, pre-existing
split. What is not acceptable is the present state, where item C reads as done.

**1b (same item).** `>THE END<` also does not survive Fountain → FDX → Fountain:
`fdx.ts` maps `centered → 'Action'`, so it comes back as an action line reading
`THE END`, centering lost. Pre-existing and out of scope to fix, but it is the
second half of "centered stays centered", it is absent from §9, and the lane's
new round-trip test would have failed had the fixture included a centered line.

### 2. (REVISE, small) A mixed-case forced transition now prints different TEXT from different exporters — newly reachable, unmeasured, unpinned

The spec's own forcing example is `> Burn to White.` On `0944b4f9`:

```
layout/PDF : "BURN TO WHITE."      (SPEC.transition.uppercase = true)
FDX        : <Text>Burn to White.</Text>
DOCX       : <w:t>Burn to White.</w:t>   (style Transition)
```

Before this change all four printed `> Burn to White.` — wrong, but identical.
The uppercase transform was previously unreachable for transitions, because an
*inferred* transition is uppercase by definition; the forced branch is what made
it observable. Lane standard §2 ("every surface shows the same … from the same
source") is the rule at stake. Note the same divergence already exists on the
base for `@McCLANE` (layout `MCCLANE`, FDX `McCLANE`) — where the spec is
explicit that forcing *preserves mixed case* — so a real fix is wider than this
lane. In scope here: measure it, name it, and pin the chosen behaviour with a
test, so the next reader does not find it as news.

### 3. (REVISE, one line) `server/lib/pdf-import.ts` carries the identical false round-trip claim the lane just corrected in `fdx-import.ts`

`pdf-import.ts:640-650` says transitions are "matching the exact patterns
`server/lib/fdx-import.ts`'s `formatTransition` and `src/lib/fountain.ts`'s
parser already use … so a transition round-trips identically regardless of which
importer produced it". It then adds `OTHER_TRANSITION_RE` =
`/^(THE END\.?|TIME CUT:|INTERCUT WITH:)$/`, and emits every recognised
transition **unforced** (`out.push(text.toUpperCase())`, line 567). Verified:

```
THE END.        → scene_heading,action,action
TIME CUT:       → scene_heading,action,action
INTERCUT WITH:  → scene_heading,action,action
CUT TO:         → scene_heading,action,transition
```

So the PDF importer recognises a transition and then writes Fountain that this
repository's own parser reads back as action — the same defect, with the same
false comment, in the sibling importer. This lane is the change that makes the
one-character fix (`> `) available and it is the change whose whole subject is
that claim. Fix it here or name it in §9 with this evidence; leaving the false
sentence standing after correcting its twin is the weaker outcome.

### 4. (REVISE, small) The `canonical-fountain.ts` widening ships with no test

`canonical-fountain.ts` has no test file, and nothing under `npm test` imports
`formatCanonicalFountain` — its only consumers are three `scripts/probe-*.mjs`
that do not run in the suite (its own header says so). The lane changed its
behaviour and added no assertion; the report's fail-first table covers the
normaliser twin only. I verified by hand that it works (packed input, forced
transition correctly given its own block), so this is a coverage gap, not a
defect — but standard §3 asks for every surface touched, and one assertion in
an existing suite closes it.

### 5. (NIT) The receipt over-lists the scoring-path files

The receipt says "(`src/lib/fountain.ts`,
`server/nvm/analyze/screenplay-normalizer.ts`,
`server/nvm/analyze/canonical-fountain.ts`)"; `check-scoring-receipt` names
**two** (canonical-fountain is not reachable from `doctor.ts`), and the lane
report §8 says two. Harmless over-inclusion, but the two documents disagree.

Everything else I probed came back clean: the marker has exactly ONE definition
(`isForcedTransitionLine`, asked by the parser branch, `renderableText`'s
constant, `stripForcedMarkers`' entry and both heuristics — **no third copy**);
the `parserTypes: false → true` flip is correct and is what protects a `>`
inside a speech; the `>`-does-not-break-a-dialogue-block call is not merely
"this parser's existing rule" but the *spec-correct* one ("Dialogue is any text
following a Character or Parenthetical element") — it is `!`, `.` and `~` that
deviate, which is worth stating that way in the report; and the `: `-appending
importer mutation is honestly pinned rather than smuggled.

---

## 6. What a stronger version would have done

The strongest version of this lane runs its own negative fixtures through the
*seam* as well as the parser. The lane's best move — writing the
"seam-agrees-with-the-page" property and letting it find the double-spaced
gluing defect it had not predicted — was applied to the positive fixture only.
Applied to the three negatives it already wrote (centering, `>` in a speech,
bare `>`), the same property finds finding 1 in one run, and the fix is the same
size as the one already made. That is in scope, and it is the item I would most
like to see before the owner spends a `measure-real` run: fixing it later makes
it a second scoring change and a second run.

Two things are genuinely out of scope and correctly left: the `lintErrors`
surface (a UI redesign with no measurement in a scoring lane), and the
importer's colon mutation (changes the imported text of every `.fdx`). One thing
sits on the boundary and I would take it: consolidating the *inferred*
transition grammar, which still exists in five spellings
(`fountain.ts:466`, `screenplay-normalizer.ts:35`, `canonical-fountain.ts:53`,
`fdx-import.ts:92-93`, `pdf-import.ts:118-123`, the last with three extra
phrases the others do not have — which is exactly how finding 3 came about).
The lane gave the FORCED marker one definition and left the inferred one with
five; naming that in the report as the next lane's work would cost a sentence.

---

VERDICT: REVISE

1. **Centering at the analysis seam (finding 1).** `>text<` is still absorbed
   into the preceding action paragraph by the normaliser's reconstruction on a
   double-spaced-shaped document, so the analyzer scores `Rain falls hard.
   >THE END<` as action prose while the page centers it. Either fix it in
   `server/nvm/analyze/screenplay-normalizer.ts` (0 of 32 committed scripts can
   move; it rides this branch's pending owner measurement) or pin the current
   behaviour with a seam assertion. Either way it must be named in report §9 —
   brief item C asked for "centered stays centered" and the property is
   currently asserted only where it holds.
2. **The FDX round trip for centered text (finding 1b).** `centered → 'Action'`
   in `src/lib/fdx.ts` loses the element; add it to the round-trip fixture (as
   an expected-loss assertion, if not fixing) and to §9, so item C is reported
   as narrowed rather than done.
3. **Cross-renderer text divergence on a mixed-case forced transition
   (finding 2).** `> Burn to White.` prints `BURN TO WHITE.` from layout/PDF and
   `Burn to White.` from FDX and DOCX. Decide which is right, pin it with a
   test, and record the decision beside `FORCED_TRANSITION_MARKER`; note the
   pre-existing `@McCLANE` twin so the wider cleanup is visible.
4. **`server/lib/pdf-import.ts` (finding 3).** Its round-trip claim is false for
   `THE END.` / `TIME CUT:` / `INTERCUT WITH:`, which it emits unforced and this
   parser reads back as action. Force them with `> ` (one line, now that the
   parser reads the marker) or correct the comment and name it in §9.
5. **One assertion for `canonical-fountain.ts` (finding 4)**, since the file has
   no suite of its own and nothing in `npm test` reaches
   `formatCanonicalFountain`.
6. **Receipt/report agreement (finding 5).** The receipt lists three
   scoring-path files; the guard and the lane report say two.

None of these touches the core change, which is correct, well-evidenced, and
driven clean through all four renderers, the analysis seam and the FDX round
trip. Items 1-2 are why this is REVISE rather than MERGE: the brief's item C is
reported as done and is not.
