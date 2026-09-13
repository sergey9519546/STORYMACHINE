---
type: branch
updated: 2026-09-13
status: ready-for-owner
sources: [docs/audits/2026-09-12-adversarial/residuals-lane-report.md, docs/audits/2026-09-12-adversarial/residuals-review.md, docs/audits/2026-09-12-adversarial/forcedcue-lane-report.md]
---

# Branch — `scoring/renderer-residuals`

The last item in the owner's measurement order, and the smallest. It closes the
two residuals `forcedcue-lane-report.md` §6.7 named with their mechanism and
deliberately did not fix, and it is **stacked on `scoring/forced-cue`** @
`089bec91`, which is itself stacked on [[Branch - Adversarial 2026-09-12]] @
`4cf5b2f3`. Measure the stacked tip; see
[[Owner - R5 Measurement and Merge]] for where it sits in the order.

**Tip `56b96765`, READY-FOR-OWNER** after two review rounds
(`docs/audits/2026-09-12-adversarial/residuals-review.md`: REVISE on `0944b4f9`
with six items, MERGE on `56b96765` at `a4df0c49`, every item reproduced by
the reviewer rather than read from the report). It closes the two residuals
[[Branch - Forced Cue]] left named. This note is the copy on `main`; the
branch carries its own, written against the older vault it stacks on, and the
lane report and both review rounds are committed here under
`docs/audits/2026-09-12-adversarial/`.

## What the two residuals were

**One was a defect.** `parseFountain` had no forced-transition branch, so a `>`
line was typed `action`. The analysis seam stripped the marker anyway —
`stripForcedMarkers`' `>` entry carried `parserTypes: false` precisely because
the parser did not read it — while all four exporters printed `>CUT TO:`
verbatim at the action indent. One line, two answers: the analyzer/renderer
split the forced-cue work exists to close, in its last instance on this stack.
A CUSTOM transition was worse. `>SMASH TO BLACK.` is a transition no inferred
rule in this parser reaches, so the seam's re-parse check refused the strip and
the line stayed ACTION PROSE carrying a literal `>` into every rule lexicon and
word count — which is the case the marker exists for.

**The other was a decision, and is now written down.** An `@` line that is not
in cue position stays `action` and its marker prints. Fountain's §Character
defines the element as "any line entirely in uppercase, with one empty line
before it, and without an empty line after it"; the forcing marker overrides the
UPPERCASE test — the one a caseless script or a mixed-case surname cannot pass,
and the reason the marker exists — not the two POSITION requirements. On such a
line the `@` is not a marker at all but a character the writer typed, and
printing it is correct. There is no analyzer/renderer split to close, and the
analysis seam had already reached the same conclusion in code
(`parserTypes: true`). The statement lives beside `FORCED_CUE_MARKER` in
`src/lib/fountain.ts` and both directions are pinned.

## What it does

1. `isForcedTransitionLine` is THE definition of the marker — the marker, a
   non-empty body, and not the `>text<` centering shape. The parser's branch,
   `stripForcedMarkers`' `>` entry and BOTH `isTransition` heuristics
   (`screenplay-normalizer.ts`, `canonical-fountain.ts`) ask it instead of
   spelling it again.
2. `renderableText` strips the marker once, so layout, PDF, FDX and DOCX all
   stop printing it and the line is right-aligned like any transition.
3. The `>` entry moves from `parserTypes: false` to `true`, which is what stops
   a `>` opening a line inside a speech from being touched at all.
4. `server/lib/fdx-import.ts`'s claim that a custom transition "survives the
   round trip instead of silently becoming a plain action line" **was false** —
   the marker that function adds to rescue the line was what condemned it. It
   is true now, and asserted in both directions.
5. `npm run probe-corpus-shape` gains a **`>tr`** column beside `@cue`: the
   count of transition blocks the parser typed FROM the marker, which is the
   whole answer for this change on any corpus.

## The cost

**No floor moves and none was moved.** All six public-benchmark statistics are
identical to the digit on this tree and on a `git archive 089bec91` export —
shuffle-drop 0.8438 / 0.7896, climax-relocate 0.5938 / 0.5234, control
1.0000 / 0.9814. The control was checked deliberately, because a change to
transition or character typing is the kind that could move it. `AUC24_FLOOR`
untouched; `--lock` never run. See [[Gate - Public Benchmark]].

**Nothing in the repository moves.** Output identity is 45/45 byte-identical
with `GIT_SHA` pinned, and re-scoring all 32 committed scripts on both trees
gives 0 of 32 differing surfaces — because no committed fixture contains a line
beginning `>` or `@`, which is also why nothing here could have caught the
defect.

**What it costs a draft that USES the marker**, measured with the same bytes on
both trees — one `>SMASH TO BLACK.` inserted before each script's last scene
heading: 8 of 32 reports differ between the two engines, mean health delta over
all 32 **+0.028**, largest **+3.1**, largest the other way **-1.5**, zero
verdict flips and zero scene-count changes. The direction is not uniformly
favourable, which is what a correctness fix looks like.

## Round 2 (independent review)

`residuals-review.md` returned REVISE on `0944b4f9` with six items; all six are
addressed and the branch's numbers did not move. Two were the reason for the
verdict, and both were brief item C being reported as done when it was not:
`>text<` centering was still absorbed into the preceding action paragraph at the
ANALYSIS seam (fixed — `isCenteredLine` is exported and both structural-line
lists ask it), and centered text does not survive the FDX round trip (pinned as
an expected loss with the mechanism; `centered → 'Action'` because Final Draft
has no Centered paragraph type). The other four: one case rule for a mixed-case
forced transition across all four exporters, `server/lib/pdf-import.ts`'s
identical false round-trip claim fixed, a first test suite for
`canonical-fountain.ts`, and the receipt's scoring-path file list made to agree
with the gate. **All six public-benchmark statistics and the 45-fixture output
identity were re-run after each scoring-path commit and are unchanged to the
digit.**

## Receipt

One PENDING entry, 2026-09-13 "RENDERER RESIDUALS", in
`docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`.
`node scripts/check-scoring-receipt.mjs 089bec91..HEAD` exits 1 naming exactly
it, which is the intended state. No AUC-24 number is stated, implied or
projected; the owner reads the probe's `>tr` column on the private corpus
before any AUC. See [[Gate - Receipt Gate]].

## Sources

- `docs/audits/2026-09-12-adversarial/residuals-lane-report.md`
- `docs/audits/2026-09-12-adversarial/residuals-review.md`
