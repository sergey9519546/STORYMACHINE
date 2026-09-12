# Lane report — verify covers the producer tier (BUG-1, DOC-1, writer-loop finding 2)

Worktree `/home/user/wt-verify` · branch `lane/verify-covers-tier`, created from
`3bb623cc` · pushed to `origin/lane/verify-covers-tier` after every commit.

```
git log --oneline 3bb623cc..HEAD
5bbc8a42 verify-report: read only the letter's real claim rows, and finish the brain notes
5984f02c verify: the #verify page states what its form cannot check
5fad0d7a docs: the producer tier, the claim set, and the verifier's stated scope (DOC-1)
c2718795 verify: the forgery matrix — every new claim, every artifact shape, both directions
8102559c verify-report: the CLI reads every new claim, and cross-checks the page against the block
65240a45 verify: one definition of the claims an artifact carries, covering the producer tier
```

## 1. What the thing is

An exported coverage report is a document that tells its reader to distrust it
until they re-run the engine: *"Anyone with the original script text can confirm
it was produced by the engine — not hand-edited."* The machinery behind that
sentence is a **claim set** — the values the artifact publishes in its verify
block — and two verifiers that recompute them: `POST /api/export/verify`
(hosted, receives claims a caller scraped) and `npm run verify-report` (offline,
holds the whole document, so it can also check the document against itself).

Until this lane the claim set was seven fields: `contentHash`, `health`,
`verdict`, `totalIssues`, `healthPercentile`, `engineCommit`, `rulebookCount`.
On 2026-09-11 the **producer tier** (`server/lib/reader-tier.ts`) put nine more
statements on the first page of every coverage report and every coverage letter
— a scene count, a word count, an estimated page/minute figure, a page
reference per leading finding, a count in the priorities heading, a percentile
reading, the reference bounds, a logline state, and a second rendering of the
verdict and health — and none of them entered the claim set. The route's zod
schema had no *field* for a scene count, so even a caller who wanted to check
one could not.

The lane makes the claim set **everything the artifact states as a number or as
a discrete reading**, with one server-side definition
(`server/lib/artifact-claims.ts`) that the exporters render the page FROM and
both verifiers read back.

## 2. What the brief got wrong, and what it under-specified

**The brief was right about the defect and the reproduction.** Both reproduced
verbatim before any code changed (fail-first log:
`<session scratch>/repro/fail-first.log`, five `VERIFIED … exit 0` transcripts).

Four things the brief did not anticipate:

1. **"The producer tier puts … on the one page"** undercounts by one claim
   class. The tier is also a SECOND rendering of the verdict and the health,
   which is investigator A's finding 2 — delivered to this lane mid-flight and
   built here. The brief's own field list (scene count, word count, page
   estimate, page refs, priorities count, percentile, bounds, logline) does not
   include them, and they are the two claims a forger would most want to move.

2. **"the logline gate's reading" is not a two-state fact.** `buildReaderTier`
   had two logline states and printed *"no single speaker holds enough of this
   script's dialogue for one"* — a claim ABOUT THE SCRIPT — for both the
   dialogue-share gate firing and a caller simply not supplying a logline. A
   verifiable claim has to distinguish those, because a verifier holding only
   the script text recomputes the gate and would disagree with a document that
   never ran it. Three states now (supplied / derived from the text / cannot
   say), which also removed a sentence the document could not support.

3. **"the exporters must derive the verify block from the same object the tier
   renders from"** is achievable in a stronger form than the brief asks for:
   the tier's own Length line is now FORMATTED FROM the claim object
   (`formatLengthLine`), rather than formatted beside it. A forged Length line
   and a genuine Scenes claim are therefore two edits, not one.

4. **"check only what was claimed" has a hole the brief's field list cannot
   close.** Deleting a claim row is a missing value, not a wrong one — so a
   forger could opt a number out of verification by deleting its row. The CLI
   now REFUSES a document that renders a reader summary page whose numbers its
   block does not publish, gated on the tier's presence (not a version stamp a
   forger could also edit), so every artifact exported before 2026-09-11 still
   verifies unchanged.

One brief item is **narrowed, deliberately, and it is the item to argue with**:
"BOTH verifiers" is the route and the CLI. The in-app `#verify` page is a third
verifier-shaped surface, and it posts only the six values a recipient types into
its form — it never sees the document, so it cannot do the body-versus-block
check at all. Nine more paste fields would make that form worse, not stronger,
so the page now STATES the gap and points at the offline command (commit
`5984f02c`). A stronger version would give `#verify` a file-upload path so it
could hold the document the way the CLI does; that is a UI lane, not this one.

## 3. What was built

**`server/lib/artifact-claims.ts` (new, 558 lines).** One `ArtifactClaims`
shape; one `CLAIM_ROW_SPECS` label table written by both exporters
(`claimRowsFor`) and read by both verifiers (`decodeClaimRows`); a
formatter+parser pair per rendering, living together and round-trip tested
(`formatLengthLine`/`parseLengthLine`, `formatHealthLine`/`parseHealthLine`,
`encodePageRefs`/`decodePageRefs`, `VERDICT_WORD`/`verdictFromWord`,
`percentileReadingFromText`, `referenceBoundsFromText`); and
`VERIFY_SCOPE_SENTENCE`, the stated scope, shipped in both documents and in
`--help`.

**The page is rendered from the claim object.** `buildReaderTier` builds
`ArtifactClaims` and formats its Length line from it; `coverage-html.ts` and
`coverage-letter.ts` keep the tier they built and publish `tier.claims`. The
six pre-existing HTML labels are byte-identical, so every report exported before
today still parses.

**Nine new `VerifyExpectedSchema` fields**, each with the 2026-09-06 NaN
discipline extended to it: the decoder hands zod `NaN` (never `0`) for an
unreadable or EMPTY printed value, because `Number('')` is `0`. The readings are
validated as readings (a percentile band or `not comparable`; a bounds line
matching its formatter; a two-value logline enum), not as free text.

**Recomputation, not trust.** `recomputeArtifactClaims` calls `buildReaderTier`
with only the script text — the verifier is never handed the value it is
checking — so page references are re-resolved through
`page-refs.ts` → `screenplay-layout.ts`, the paginator `pdf.ts` lays the real
PDF out with, and compared entry by entry (ordinal, rule, finding id, page).

**The verdict word has one definition.** It had four hand-copies
(`coverage-html`'s `VERDICT_STYLE.label`, `coverage-letter`'s `VERDICT_LABEL`,
`reader-tier`'s `VERDICT_WORD`, the CLI's inverse map) — and the copy that
mattered was the one the CLI could not read back.

## 4. Every number measured

### 4.1 The fail-first reproductions (tree `3bb623cc`, keyless)

Fixture `data/screenplays/chain-of-custody.fountain`: 13 scenes, 824 words,
~4 pages / ~4 min, health 76.3, CONSIDER, 178 issues, one tier finding at p. 2.

| forgery | shape | before (3bb623cc) | after (HEAD) |
|---|---|---|---|
| `9,999 scenes · 999,999 words · ~500 pages / ~500 min (est.)` + `p. 999` + `The 9 things to fix first` | coverage HTML | `VERIFIED`, exit 0 | exit 1, names `sceneCount`/`wordCount`/page reference |
| same, `**Length.**` line + `— p. 999` + `### The 9 things…` | letter `.md` | `VERIFIED`, exit 0 | exit 1 |
| `sceneCount: 9999`, `wordCount: 999999`, `pageEstimate 500/500` | report `.json` | `VERIFIED`, exit 0 | exit 1, `reproduction disagrees on: sceneCount, wordCount, estimatedPages, estimatedRuntimeMinutes` |
| `**Verdict.** RECOMMEND · Health 94.6 / 100` (investigator A finding 2) | letter `.md` | `VERIFIED`, exit 0 | exit 1, `the summary page's verdict line says verdict = RECOMMEND, but this report's verify block says verdict = CONSIDER` |
| `&middot; Health 94.6 / 100` (same finding, HTML) | coverage HTML | `VERIFIED`, exit 0 | exit 1, `the summary page's health reading says health = 94.6` |

The same two A-finding-2 forgeries were re-run against this lane's own commit
`8102559c` (claim set landed, tier verdict/health not yet scraped) and still
printed `VERIFIED` — so the fix is the scrape, not the claim set alone.

### 4.2 Coverage of the claim set

| claim | published (HTML / letter / JSON) | recomputed from | body rendering(s) cross-checked |
|---|---|---|---|
| sceneCount | row / row / field | report | tier Length line, letter headline |
| wordCount | row / row / field | report | tier Length line, letter headline |
| estimatedPages | row / row / `pageEstimate.pages` | report | tier Length line, letter headline |
| estimatedRuntimeMinutes | row / row / `pageEstimate.runtimeMinutes` | report | tier Length line, letter headline |
| prioritiesListed | row / row / — | suppressed top priorities, capped at 3 | tier priorities heading |
| percentileReading | row / row / (from raw `healthPercentile`) | `percentileCellFor` | tier percentile line |
| referenceBounds | row / row / — | `derivedReferenceBoundsLine` | tier percentile parenthetical or bounds line |
| loglineState | row / row / — | `buildLogline` on the script text | tier logline line |
| pageRefs | row / row / — | `scenePageNumbers` via `layoutScreenplay` | every printed `p. N`, in order |
| verdict | row / prose + row / field | report | tier stamp (HTML), tier verdict line (letter), letter `**Verdict:**`, plainSummary |
| health | row / prose + row / field | report | tier health reading, health headline (HTML), letter headline, plainSummary |

Deliberately NOT checked, stated in three places (`VERIFY_SCOPE_SENTENCE` in
both documents and in `--help`; claims-register row 94): wording — the report's
prose, the finding descriptions, the logline's TEXT (only whether one was
derived), the title, the author, and the caller-supplied draft-rank line. Also
stated per run: `not claimed by this json report, so not checked: …` (register
row 98).

### 4.3 Three defects the forgery matrix found in this lane's own work

1. The plain-text letter's tier region ended at the first `\n---`, which is the
   dashes under `READER SUMMARY` — a GENUINE `.txt` letter reported
   "the summary prints 0 page references, but this report's verify block claims
   1", exit 1. Fixed: the divider is a whole line of exactly 3 or 40 dashes.
2. The plain-text tier's priorities heading is a bare underlined line and
   `READER SUMMARY` is one too — taking the first match read the wrong heading,
   the inverse returned `null`, and the claim was silently never checked. Fixed:
   every candidate is offered to the shared inverse, the first it RECOGNISES
   wins.
3. CRLF in the ARTIFACT broke every `^…$` scrape (`---\r` does not match
   `/^---$/m`), failing genuine letters. Fixed: the artifact is BOM- and
   CRLF-normalised before parsing; the SCRIPT text stays byte-exact, so a CRLF
   copy of the script is still DIAGNOSED rather than normalised into a pass
   (the 2026-09-06 finding-4 behaviour is unchanged and still asserted).

### 4.4 Fixtures and goldens

Genuine artifacts come from a **live keyless server** in-process
(`startTestServer` → `POST /api/export/coverage`, `/api/export/coverage-letter`,
`/api/scriptide/doctor`): four shapes (coverage HTML, letter `.md`, letter
`.txt`, report `.json`), regenerated every run rather than committed.

Forgery matrix: **11 claims × 3 document shapes × 2 directions** (page-only →
caught by self-disagreement; every-rendering-plus-block → caught only by
recomputation, which must name the field) + 4 JSON fields + the
stripped-rows refusal + the no-tier back-compat case + **CRLF / BOM / CRLF+BOM**
variants of a genuine letter, a genuine HTML report and a forged letter.

Goldens regenerated and diffed by eye: `tests/fixtures/coverage-html/no-percentile-no-draftrank.html`,
`tests/fixtures/coverage-letter/report{1,2,3}.expected.md`,
`docs/user-validation/sample-coverage-report.html`.

## 5. Gates (foreground, with exit codes)

| gate | result | exit |
|---|---|---|
| `npx tsc --noEmit` (= `npm run lint`) | clean | 0 |
| `node scripts/check-no-console.mjs` | 305 files, 23 quarantine entries, all proven unreachable | 0 |
| `npm run check-docs` | no AI writing patterns | 0 |
| `npm run honesty-audit` | 459 files + 456 markdown + claims register (99 rows) — clean | 0 |
| `npm run check-brain` | 101 notes, 350 links, fresh | 0 |
| `node scripts/check-scoring-receipt.mjs 3bb623cc..HEAD` | **"no scoring-path files changed"** | 0 |
| output identity vs `git archive 3bb623cc` (no `--ignore-keys`) | **PASS — all 45 reports byte-identical** (`analyzedAt` excluded) | 0 |
| `tests/core/public-benchmark.test.ts` | **28 pass / 0 fail** | 0 |
| `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run verify:surfaces` | **213/213 assertions passed** (re-run after the `#verify` copy change) | 0 |
| `npm run build` | clean | 0 |
| `tests/routes/export-verify.test.ts` | **58 pass / 0 fail** (18 before) | 0 |
| `tests/scripts/verify-report.test.ts` | ****105 pass / 0 fail**** (20 before) | 0 |
| `tests/core/artifact-claims.test.ts` (new) | 91 pass / 0 fail | 0 |
| `tests/core/reader-tier.test.ts` | 22 pass / 0 fail | 0 |
| `tests/core/coverage-html.test.ts` | 54 pass / 0 fail | 0 |
| `tests/core/coverage-letter.test.ts` | 47 pass / 0 fail | 0 |
| `tests/core/percentile-comparability.test.ts` | 23 pass / 0 fail | 0 |
| `tests/core/percentile-copy-consistency.test.ts` | 30 pass / 0 fail | 0 |
| `tests/core/page-refs.test.ts` | 12 pass / 0 fail | 0 |
| `tests/core/reference-bounds.test.ts` | 8 pass / 0 fail | 0 |
| `tests/core/p0-sample-drift.test.ts` | 4 pass / 0 fail (sample regenerated) | 0 |
| `tests/core/honesty-audit-claims.test.ts` | 5 pass / 0 fail | 0 |
| `tests/core/brain-coverage.test.ts` | 7 pass / 0 fail | 0 |
| `tests/routes/export-coverage.test.ts` | 13 pass / 0 fail | 0 |
| `tests/routes/export-coverage-letter.test.ts` | 23 pass / 0 fail | 0 |
| `tests/routes/root-cause-parity.test.ts` | 18 pass / 0 fail | 0 |
| **ONE full `npm test`** | **13,421 tests · 13,329 pass · 0 fail · 91 skipped · 1 todo** (on the final tree, `5bbc8a42`) | 0 |

Note on the output-identity harness: a bare `git archive` baseline has no
`.git`, so `server/lib/build-info.ts` resolves `engineCommit` to `'dev'` there
and to the real HEAD in the worktree — 45/45 reports "differ" on that one field
for a reason that has nothing to do with the change. Both snapshots were taken
with `GIT_SHA=identity-baseline` so the engine identity is pinned equal on both
sides; that is the only harness-level accommodation, and no `--ignore-keys` was
used.

No browser battery was run beyond `verify:surfaces` (the orchestrator runs it).

## 6. Left undone

1. **`#verify` still checks only what a recipient types.** Named in §2; the page
   now says so. A file-upload path for `#verify` would close it.
2. **The raw report JSON carries no reader summary page**, so five claims do not
   exist in that shape (priorities count, page references, reference bounds,
   logline state, the percentile BAND). Its scene/word/page-estimate numbers ARE
   checked. Stated in `--help`, printed per run, and registered (row 98). Adding
   the tier's claims to the doctor report JSON would have changed the doctor
   report shape, which brief item 6 forbids without stopping first — so it was
   not done.
3. **The logline's TEXT is not verified, only its state.** The text is
   deterministic (`buildLogline`) and could be compared; it is left out because
   a caller may legitimately supply its own logline (the same trust posture as
   `title`/`author`), and verifying the text would fail such an artifact. The
   exclusion is stated in the scope sentence rather than left implicit.
4. **`structuralSignals` remains informational**, unchanged — it is reported in
   `recomputed` and can never move `verified`, exactly as before.
5. **No new browser assertion covers the `#verify` copy I added.**
   `verify:surfaces` drives `#verify` and passes 213/213 with it present, but
   nothing asserts the new sentence is on the page; a `verify:surfaces`
   assertion would be the stronger version.
6. **The claim-row label table is back-compatible by test, not by type.**
   `tests/core/artifact-claims.test.ts` asserts the six pre-2026-09-12 labels
   are still present; nothing prevents a future edit from renaming one and
   updating that test in the same commit.
