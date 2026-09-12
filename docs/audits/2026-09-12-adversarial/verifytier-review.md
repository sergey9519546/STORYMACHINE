# Independent review — lane `lane/verify-covers-tier`, reviewed SHA `4328a6eb`

Reviewed object: `4328a6eb337bd4ce27ef0e5d2860c63b15c437aa` (branch
`lane/verify-covers-tier`, on origin; the lane's `5bbc8a42` rebased onto main
`537c1aa3`; six commits). Reviewer did not build the change.

Method: `git archive 4328a6eb | tar -x` and `git archive 537c1aa3 | tar -x`
under `<session scratch>/verify-review/{tip,base}` with `node_modules`
symlinked, plus a third tree from `318493c9` (the commit before
`server/lib/reader-tier.ts` existed) for the no-tier back-compatibility case.
Genuine artifacts in all four shapes were produced by booting the real keyless
Express app in-process (`server/app.ts`'s `createApp`) and POSTing
`/api/export/coverage`, `/api/export/coverage-letter` and
`/api/scriptide/doctor` — never the renderers called directly. Nothing in
`/home/user/STORYMACHINE`'s tree was modified except this file; nothing was
pushed; `/home/user/wt-verify` was not touched.

Fixture throughout: `data/screenplays/chain-of-custody.fountain` — 13 scenes,
824 words, ~4 pages / ~4 min, health 76.3, CONSIDER, 178 issues, one tier
finding at p. 2, `contentHash 96f52997…07fcc`.

## Round 1

### Brief vs diff

| # | Brief / finding item | In the diff | Verdict |
|---|---|---|---|
| 1 | BUG-1: forged sceneCount / wordCount / page reference caught in HTML, letter and JSON | `server/lib/artifact-claims.ts` (new, 558 lines), nine `VerifyExpectedSchema` fields, both scrapers rewritten | **done** (all five original forgeries refused, field named) |
| 2 | One definition both exporters write from and both verifiers read from | `CLAIM_ROW_SPECS` + `claimRowsFor`/`decodeClaimRows`; `coverage-html.ts:664`, `coverage-letter.ts:515`, `verify-report.mjs`, `verify-compare.ts` | **done**, one surviving hand-copy (finding 7) |
| 3 | writer-loop finding 2: the tier's second verdict/health rendering is checked | `collectTierBodyClaims` (`verify-report.mjs:270-400`), `parseHealthLine`/`parseLetterTierVerdictLine` | **done** (both forgeries refused, rendering named) |
| 4 | Page references recomputed through the real paginator, entry by entry | `recomputeArtifactClaims` → `buildReaderTier({fountain})`; `pageRefsDisagreement` compares ordinal, rule, id, page | **done** |
| 5 | Zod discipline extended to the nine new fields, NaN never 0 | `validation.ts:2600-2646`; `parseCount` returns NaN for `''` | **done** for all nine, in route and CLI |
| 6 | Deleting a claim row cannot opt a number out of verification | `TIER_CLAIM_LABELS` + `missingTierClaims` (`verify-report.mjs:672`) | **NARROWED, not reported as narrowed** — 5 of 9 labels (findings 1, 2) |
| 7 | The refusal is gated on the tier's presence, not an editable stamp | `rendersProducerTier` (`verify-report.mjs:404`) keyed on one marker string | **does not hold** (finding 3) |
| 8 | DOC-1: README.md / ARCHITECTURE.md / brain notes / claims register | README +45, ARCHITECTURE +56, four Surface notes, register rows 94-99 | **done**, two sentences overclaim (finding 6) |
| 9 | `#verify` in-app page states its gap rather than growing nine fields | `src/components/VerifyReport.tsx:333-347` | **narrowed, and reported as narrowed** — accepted, see "the deliberate narrowing" |

### Reproductions

Fail-first, on the baseline tree `537c1aa3` — all five print
`VERIFIED — authentic and reproducible under this engine.` at exit 0:

```
cd <session scratch>/verify-review/base
node --experimental-strip-types scripts/verify-report.mjs <F> \
  data/screenplays/chain-of-custody.fountain
```

| forgery | shape | baseline `537c1aa3` | tip `4328a6eb` |
|---|---|---|---|
| Length line → `9,999 scenes · 999,999 words · ~500 pages / ~500 min (est.)`, `tier-page` → `p. 999`, heading → `The 9 things to fix first` | coverage HTML | VERIFIED, exit 0 | **exit 1** — names `sceneCount` 9999/13, `wordCount` 999999/824, `estimatedPages` 500/4, `estimatedRuntimeMinutes` 500/4, `prioritiesListed` 9/3, `page reference 1 reads p. 999 … block claims p. 2` |
| same three edits on `**Length.**`, `— p. 999`, `### The 9 things…` | letter `.md` | VERIFIED, exit 0 | **exit 1** — same six lines |
| `sceneCount: 9999`, `wordCount: 999999`, `pageEstimate 500/500` | report `.json` | VERIFIED, exit 0 | **exit 1** — `NOT VERIFIED — reproduction disagrees on: sceneCount, wordCount, estimatedPages, estimatedRuntimeMinutes` |
| `**Verdict.** RECOMMEND · Health 94.6 / 100` | letter `.md` | VERIFIED, exit 0 | **exit 1** — `the summary page’s verdict line says verdict = RECOMMEND, but this report's verify block says verdict = CONSIDER` + the health reading line |
| `&middot; Health 94.6 / 100` in the tier | coverage HTML | VERIFIED, exit 0 | **exit 1** — `the summary page’s health reading says health = 94.6, but this report's verify block says health = 76.3` |

Forgeries the lane did not list — **caught** (all exit 1):

| forgery | result |
|---|---|
| tier page reference only (`— p. 2` → `— p. 7`), block untouched | `page reference 1 reads p. 7 on the page, but this report's verify block claims p. 2` |
| reference-bounds parenthetical only (`20 samples / 9–10 scenes / 256–337 words` → `40 samples / 1–99 …`) | `the reference bounds on the page says referenceBounds = 40 samples …` |
| logline gated/ungated swap, body side (real logline → `Not derived — no single speaker holds…`) | `the logline line says loglineState = not derived … block says derived` |
| logline swap, block side (`Logline: derived` → `not derived`) | same disagreement, opposite direction |
| finding id in the `Page references` row (`#9bed77ed917160b0` → `#deadbeefdeadbeef`) | `NOT VERIFIED — reproduction disagrees on: pageRefs` (recomputation, entry by entry) |
| `Scenes: 13` row deleted, tier left | `missing claim: Scenes` |
| `Page references` row deleted (HTML) | `missing claim: Page references` |
| consistent forgery: Length line + `Scenes:` row + letter headline + logline prose all → 99 scenes | `sceneCount: no (report 99, local 13)` — recomputation |

Genuine artifacts — **must verify**, and do (exit 0):

| artifact | result |
|---|---|
| coverage HTML, letter `.md`, letter `.txt`, report `.json` from the live keyless tip server | exit 0, **all 12 claim fields report `yes`** in all three document shapes (no extractor silently collects nothing) |
| CRLF, BOM, CRLF+BOM copies of the genuine letter; CRLF and BOM copies of the genuine HTML | exit 0 each |
| genuine pre-tier artifacts built from `318493c9` (no reader summary page), all four shapes | exit 0 each; the ten tier fields are named as `not claimed by this … report` |

Every extractor was shown to fire rather than collect nothing, in both
directions: each of the nine new claims has at least one body-only forgery
above that is caught by name, and the genuine runs list all twelve as `yes`.

Gates reproduced independently:

```
node scripts/check-scoring-receipt.mjs 537c1aa3..4328a6eb
  → no scoring-path files changed. OK. (exit 0)
GIT_SHA=identity-baseline node scripts/check-doctor-output-identity.mjs --tree base  --out id-before
GIT_SHA=identity-baseline node scripts/check-doctor-output-identity.mjs --tree tip   --out id-after
node scripts/check-doctor-output-identity.mjs --compare id-before id-after
  → OUTPUT IDENTITY: PASS — all 45 reports are byte-identical (analyzedAt excluded). (exit 0, no --ignore-keys)
node --experimental-strip-types tests/core/public-benchmark.test.ts   → 28 pass / 0 fail
node scripts/check-no-console.mjs    → 305 files, 23 quarantine entries, OK (exit 0)
npm run check-docs                   → clean (exit 0)
npm run honesty-audit                → 459 files + 450 markdown + 99 register rows, clean (exit 0)
npm run check-brain                  → 101 notes, 353 links, fresh (exit 0)
PW_CHROMIUM_PATH=… npm run verify:surfaces → 213/213 assertions passed (exit 0)
```

Touched-suite counts all match the lane report exactly: `artifact-claims` 91/0,
`reader-tier` 22/0, `coverage-html` 54/0, `coverage-letter` 47/0,
`export-verify` 58/0, `verify-report` 105/0, `page-refs` 12/0.

Both trailers (`Co-Authored-By: Claude Fable 5.1`, `Claude-Session: …`) are
present on all six commits, matching the convention on every commit of `main`
in the surrounding range. No model identifier appears in the diff
(`git diff 537c1aa3..4328a6eb | grep -E 'claude-(opus|sonnet|haiku|fable)|gpt-4|gemini-[0-9]'`
is empty).

Mutation probes (one formatter at a time, then the touched suites):

| mutation | killed by |
|---|---|
| `formatLengthLine`: `' · '` → `' \| '` | artifact-claims 7 fail, coverage-html 1, coverage-letter 3 |
| `VERDICT_WORD.PASS`: `'PASS (decline)'` → `'PASS'` | coverage-html 1, coverage-letter 1 |
| `formatHealthLine`: `' / 100'` → `'/100'` | reader-tier 1, coverage-html 1, coverage-letter 3 |
| `encodePageRefs`: `'no page'` → `'unknown'` | artifact-claims 3 fail |
| **scrape only**: `parseHealthLine` made to match nothing, formatter untouched (the 2026-09-11 regression class) | `tests/scripts/verify-report.test.ts` **3 fail** — the guarantee holds |

### VERDICT: REVISE

The lane's central claim is sound and I could not break it on the paths it
named: the five original forgeries and the two from writer-loop finding 2 are
all refused by name, the zod wall holds for every new field in both the route
and the CLI, the page references are genuinely recomputed entry by entry
through the real paginator, and none of it false-fires on a genuine artifact in
any shape or transport encoding. Three items below are the same defect seen
from three angles, and one of them restores BUG-1 in full.

1. **The row-deletion refusal covers 5 of the 9 tier claims, so the brief's own
   `~500 pages / ~500 min` forgery still verifies at exit 0.**
   `server/lib/artifact-claims.ts:374-376` lists only
   `Scenes`, `Words`, `Priorities listed`, `Reference bounds`,
   `Page references`. `Estimated pages`, `Estimated runtime (minutes)`,
   `Health percentile reading` and `Logline` are equally tier-only labels, and
   the comment immediately above the list (`:369-373`) states the rule that
   should include them — *"The labels that only a producer-tier artifact
   publishes. A document that RENDERS a tier must publish all of these"*. So
   this is an oversight against the module's own stated rule, not a documented
   non-goal; `tests/core/artifact-claims.test.ts:173-178` only asserts
   `TIER_CLAIM_LABELS ⊆ CLAIM_ROW_SPECS`, never the converse, so nothing pins
   the omission either way.

   Reproduction (letter): delete the two lines `Estimated pages: 4` and
   `Estimated runtime (minutes): 4` from the footer, then forge the reader
   summary page's Length line **and** the letter headline to
   `~500 pages / ~500 min (est.)`:

   ```
   node --experimental-strip-types scripts/verify-report.mjs \
     <session scratch>/verify-review/f-tip/U-letter-drop-pageest-rows-forge-length.md \
     data/screenplays/chain-of-custody.fountain
     →   not claimed by this letter report, so not checked: healthPercentile, estimatedPages, estimatedRuntimeMinutes
         VERIFIED — authentic and reproducible under this engine.          exit 0
   ```

   The same works on the HTML report (delete the two `<div><dt>Estimated …`
   rows, forge `tier-key">Length</span>`):
   `U-html-drop-pageest-forge-length.html` → VERIFIED, exit 0, with the page
   reading `13 scenes · 824 words · ~500 pages / ~500 min (est.)`.

   Fix: `TIER_CLAIM_LABELS` should be derived, not listed — every
   `CLAIM_ROW_SPEC` a tier artifact can state, minus the ones a given shape
   genuinely cannot carry — and `artifact-claims.test.ts` should assert the
   converse direction (every claim `buildArtifactClaims` populates for a
   tier-rendered report is required of a tier artifact), so a tenth claim
   cannot be added without entering the gate.

2. **Same cause, but the forgery inflates rather than degrades: a deleted
   `Health percentile reading` row lets the reader summary page claim a
   top-5% ranking the engine never produced.** Because the genuine bounds
   string lives inside the not-comparable sentence's parenthetical
   (`server/lib/reader-tier.ts:239-241`, rule 4), replacing that whole
   sentence removes the page's only bounds text as well, so
   `referenceBoundsFromText` returns `null` and that body claim is skipped too
   — the `Reference bounds:` row survives untouched and `missingTierClaims`
   is satisfied.

   ```
   node --experimental-strip-types scripts/verify-report.mjs \
     <session scratch>/verify-review/f-tip/U-letter-drop-percentile-row-forge-body.md \
     data/screenplays/chain-of-custody.fountain
     → line 13 of the document reads: "Health percentile: top 5%"
         not claimed by this letter report, so not checked: healthPercentile, percentileReading
         VERIFIED — authentic and reproducible under this engine.          exit 0
   ```

   This is BUG-1's exact shape one claim narrower: a producer reads a forged
   page, runs the command the page tells them to run, and is told VERIFIED.
   It is mitigated only by the honest `not claimed … so not checked` line,
   which is below the reproduction block and above the verdict a reader
   actually acts on.

3. **The tier-presence gate is keyed on one forger-editable marker string, and
   editing it restores every original forgery.** `splitTierRegion`
   (`scripts/verify-report.mjs:220-237`) locates the tier by
   `text.indexOf('<section class="reader-tier">')` for HTML and
   `Math.max(text.indexOf('## Reader summary'), text.indexOf('READER SUMMARY'))`
   for the letter; `rendersProducerTier` (`:404-406`) is `tier !== ''`, and
   `missingTierClaims` (`:672-677`) returns `[]` when it is false. One edit to
   that marker therefore turns off `collectTierBodyClaims` **and** the
   row-deletion refusal at once, after which the nine rows can simply be
   deleted.

   Reproduction (letter — a one-character edit, `## Reader summary` →
   `## Reader Summary`, which renders identically to any human, plus the
   original three forgeries and the nine rows deleted):

   ```
   node --experimental-strip-types scripts/verify-report.mjs \
     <session scratch>/verify-review/f-tip/U-letter-rename-tier-heading.md \
     data/screenplays/chain-of-custody.fountain
     → VERIFIED — authentic and reproducible under this engine.           exit 0
   ```

   And on the HTML report (`<section class="reader-tier">` →
   `<section class="reader-tier-page">`, all four page forgeries including
   `&middot; Health 94.6 / 100`, nine rows deleted):
   `U-html-rename-tier-class.html` → VERIFIED, exit 0, on a document whose
   first page reads `9,999 scenes · 999,999 words · ~500 pages`,
   `Health 94.6 / 100`, `p. 999`, `The 9 things to fix first`.

   This falsifies lane report §2.4 and `docs/CLAIMS_REGISTER.md` row 97 —
   *"Gated on the summary page's PRESENCE rather than on a version stamp a
   forger could also edit"*. A class attribute and a heading's capitalisation
   are strictly easier to edit than a version stamp.

   Fix: key the requirement on something a forgery cannot remove without
   removing the claim itself. Both bypass documents above still contain a
   parseable Length line, so the cheapest correct gate is
   `parseLengthLine(wholeDocument) !== null` (or: any of the tier's
   renderings present anywhere in the document) requires the tier rows. A
   second, independent condition — the presence of `VERIFY_SCOPE_SENTENCE`,
   which the new exporters always emit and which is the sentence the forger is
   relying on — would make it two edits rather than one.

4. **`bodyLoglineState` treats "the page says it cannot say" as "no claim", so
   a page that contradicts its own `Logline: derived` row verifies.**
   `scripts/verify-report.mjs:265` returns `null` for `LOGLINE_UNKNOWN_NOTE`,
   and `findBodyBlockDisagreements` skips a `null`-valued claim.

   ```
   # the tier's logline line replaced with
   #   "**Logline.** Unavailable for this report (it was rendered without the script text)."
   # while the block still says "Logline: derived"
   node --experimental-strip-types scripts/verify-report.mjs \
     <session scratch>/verify-review/f-tip/U-letter-block-logline-unknown-body.md \
     data/screenplays/chain-of-custody.fountain
     → VERIFIED — authentic and reproducible under this engine.           exit 0
   ```

   Low severity — it degrades the page rather than inflating it, and the
   opposite direction (a real logline against a `not derived` row) is caught.
   But the third logline state is this lane's own addition, so the scrape
   should carry it: return `'unknown'` and compare it against the absence of a
   `loglineState` claim, rather than collapsing it into "nothing to check".

5. **Report accuracy: three of the formatter/parser pairs §3 says are
   "round-trip tested" have no test.** `formatHealthLine`, `parseHealthLine`
   and `parseLetterTierVerdictLine` appear in no file under `tests/`
   (`grep -rln` is empty), and `VERDICT_WORD`/`verdictFromWord` are not
   referenced by `tests/core/artifact-claims.test.ts` either. The functional
   guarantee the report claims for them does hold — disabling only
   `parseHealthLine`'s pattern leaves all five core suites green but fails
   `tests/scripts/verify-report.test.ts` with 3 failures — so this is a false
   sentence in the report, not a hole in the product. Either add the three
   round trips (two lines each) or say in the report that these pairs are
   pinned by the forgery matrix and the letter goldens instead.

6. **Shipped docs overstate the refusal.** `README.md`'s bullet — *"A report
   that renders a summary page whose numbers its block does not publish is
   refused rather than verified on what remains"* — `ARCHITECTURE.md` §4's
   *"a document that renders a summary page whose numbers its verify block does
   not publish is **refused**"*, `docs/brain/Surfaces/Surface - Exports.md`'s
   *"A tier with no tier claims is refused … Gated on the tier's PRESENCE"*,
   and register row 97 are each true only for 5 of the 9 labels and only while
   the marker is intact. They become true once finding 1 and finding 3 are
   fixed; until then they are the kind of sentence this lane exists to stop
   shipping. (README's *"every value it states as a number or as a discrete
   reading"* is fine — the raw `healthPercentile` is correctly described as
   the *reading*, and the CLI names it as unchecked per run.)

7. **One surviving hand-copy of the length formatter, with no test on the
   rendering it feeds.** `server/lib/coverage-letter.ts:239-252`
   (`buildHeadline`) formats `N scenes · M words · ~P pages / ~R min (est.)`
   itself rather than through `formatLengthLine`, and the CLI reads that
   headline back with `parseLengthLine` as a third independent rendering
   (`verify-report.mjs:334-348`). The two must stay byte-compatible, and
   nothing asserts the headline claim is collected — `grep -n "letter headline"
   tests/` is empty. If `buildHeadline` is reworded, `parseLengthLine(rest)`
   returns `null`, the third rendering silently stops being checked, and every
   suite stays green. In scope: either format the headline's length segment
   from `formatLengthLine(claims)`, or add one assertion that the genuine
   letter's headline claim appears in the checked set.

8. **Two stale numbers in the report's gate table.** `check-brain` on the tip
   reports *101 notes, 353 links* (the table says 350 — correct for commit
   `e1663f92`, stale for the tip, and the tip commit message itself says 353);
   `honesty-audit` reports *450 tracked markdown files* (the table says 456).
   Both gates exit 0. Cosmetic, but the table is the record.

### The deliberate narrowing — accepted

The `#verify` page posting only what a recipient types is the right call and
the report names it honestly. Nine paste fields on a form a third party fills
in by hand would make that surface worse, and the new copy
(`src/components/VerifyReport.tsx:341-347`) names the gap and points at the
command that closes it, which is the same discipline
`VERIFY_SCOPE_SENTENCE` applies to the artifacts. A file-upload path is a UI
lane. Left-undone items 2, 3, 4 and 6 are likewise fairly described; item 5
(no browser assertion on the new sentence) is real and cheap, and is worth
adding to `verify:surfaces` alongside the finding-7 assertion.

One observation not counted as a finding: `buildReaderTier` now derives the
logline itself when a caller passes none (`server/lib/reader-tier.ts:169-176`),
which means a caller that supplies its OWN logline on a script whose
dialogue-share gate fires would publish `Logline: derived` against a
recomputed `not derived` and fail verification on a genuine artifact. Not
demonstrable here: every in-repo caller (both export routes,
`scripts/generate-p0-sample-report.ts`, `scripts/measure-reader-tier-page.mjs`)
passes `buildLogline`'s own output, and the gate fires on none of the 20 CC0
scripts in `data/screenplays/` (checked directly). Worth a line in the
module's header rather than a code change.
