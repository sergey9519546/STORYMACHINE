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

---

## Round 2 — response to `docs/audits/2026-09-12-adversarial/verifytier-review.md`

Continued in the same worktree on the rebased tip `4328a6eb` (the lane's
`5bbc8a42` on main `537c1aa3`), pushed after every commit.

```
git log --oneline 537c1aa3..HEAD
511688b8 docs: the refusal described as it actually behaves (review findings 3, 6)
01260b05 letter: the headline's length segment comes from the shared formatter (review finding 7)
a622cc3f verify: the claim gate covers all nine tier claims, keyed on structure not a marker
4328a6eb verify-report: read only the letter's real claim rows, and finish the brain notes
dbb1b537 verify: the #verify page states what its form cannot check
e1663f92 docs: the producer tier, the claim set, and the verifier's stated scope (DOC-1)
cafd1e6f verify: the forgery matrix — every new claim, every artifact shape, both directions
1e842c88 verify-report: the CLI reads every new claim, and cross-checks the page against the block
11f2143a verify: one definition of the claims an artifact carries, covering the producer tier
```

**Every number in this section was re-derived on the round-2 tip.** None is
carried forward from round 1 — which is item 8's point, and round 1's table had
two stale figures because it did carry numbers forward.

### R2.0 Fail-first — all seven review forgeries, on `4328a6eb`

Fixture `data/screenplays/chain-of-custody.fountain` (13 scenes, 824 words,
~4 pages / ~4 min, health 76.3, CONSIDER, 178 issues, one tier finding at p. 2).
Log: `<session scratch>/repro/fail-first-round2.log` — **7 of 7 printed
`VERIFIED — authentic and reproducible under this engine.` at exit 0.**

| # | forgery | shapes | before | after |
|---|---|---|---|---|
| 1 | `Estimated pages` + `Estimated runtime (minutes)` rows deleted, page forged to `~500 pages / ~500 min (est.)` | letter, HTML | VERIFIED, exit 0 | **exit 1**, `missing claim: Estimated pages` + `missing claim: Estimated runtime (minutes)` |
| 2 | `Health percentile reading` row deleted, page rewritten to `Health percentile: top 5%` | letter, HTML | VERIFIED, exit 0 | **exit 1**, `missing claim: Health percentile reading` + the missing-bounds line |
| 3 | tier marker renamed (`## Reader summary` → `## Reader Summary`; `class="reader-tier"` → `"reader-tier-page"`), all nine tier rows deleted, all four page claims forged | letter, HTML | VERIFIED, exit 0 | **exit 1**, `missing claim: Scenes` … and the body disagreements |
| 4 | page says `Unavailable for this report (it was rendered without the script text)` while the block claims `Logline: derived` | letter | VERIFIED, exit 0 | **exit 1**, `the logline line says loglineState = not stated …` |

Two further attacks found while building the fix, both now fixtures:

| forgery | result on the round-2 tip |
|---|---|
| `Health percentile reading` row deleted AND the page's whole percentile sentence removed (so no reading is left to compare) | **exit 1** — `the summary page states no reference bounds — every genuine reader summary page states them exactly once, so that statement has been removed` |
| a divider inserted immediately after the tier heading, shrinking the letter's tier REGION past every claim, then the Length line forged | **exit 1**, names `sceneCount = 9999` |

### R2.1 What the eight items became

| # | item | what shipped |
|---|---|---|
| 1 | Cover all nine tier claims; assert equality both ways | `ClaimRowSpec` gains a `tier: 'always' \| 'ifRendered'` column; `TIER_CLAIM_LABELS` / `TIER_ALWAYS_LABELS` / `TIER_CONDITIONAL_LABELS` are **derived** from it. `tests/core/artifact-claims.test.ts` asserts the converse direction (every tier-only claim a full tier report publishes is required — 9 of them) and the always/ifRendered split against a thin report. A tenth claim enters the gate by being marked, not by someone remembering a second list. |
| 2 | The "top 5%" deletion | The four conditional claims are required **when the page states them** — the page and the block must agree about which claims EXIST, not only about their values. The half that row-deletion cannot cover (the bounds text leaving with the sentence) is a structural check: a genuine summary page states the reference bounds exactly once, so a tier page with none has had that statement removed. |
| 3 | Gate on structure, not a string | Two independent conditions, the first needing no tier detection at all: **(a)** a block that publishes ANY tier claim must publish every required one — so partial deletion is refused whatever the markup says; **(b)** a block with none left is refused when the document still shows any of several structural signals (the verify block's scope sentence, the tier caption, the tier stylesheet rules and section classes, the labelled Length / Logline / Verdict lines, the spaced `Health N / 100` reading). The region is multi-anchored and widens to the whole document when it holds no Length line. |
| 4 | Three logline states | `bodyLoglineState` returns `derived` / `not derived` / `not stated (the page says it was rendered without the script text)` / `null` (no logline line). The third is a value the zod enum can never accept, so a page in that state and a block claiming either real state always disagree. A test asserts the three are distinguishable from each other, not merely non-passing. |
| 5 | The three missing round trips | `formatHealthLine`/`parseHealthLine` (all 1,001 one-decimal values, in all three shapes' surrounding markup, **and** the letter headline it must NOT match), `parseLetterTierVerdictLine` (both letter renderers, the `PASS (decline)` parenthetical, and the letter's own `**Verdict: X**` line it must not confuse), `VERDICT_WORD`/`verdictFromWord`. |
| 6 | Copy to the truth | README, ARCHITECTURE §4, the brain Exports note and register row 97 now describe the two conditions **and state the honest limit**: N independent edits, not an unforgeable property. |
| 7 | The surviving length-formatter copy | `buildHeadline` formats its length segment through `formatLengthLine`. Byte-identical output — the three letter goldens and the sample report are untouched by the refactor — and the headline's collection is separately asserted by forging ONLY the headline. |
| 8 | Stale numbers | Corrected, and every number here re-derived. |

### R2.2 What the review got right that the round-1 report got wrong

- Round 1 §2.4 and register row 97 said the refusal was "gated on the summary
  page's PRESENCE rather than on a version stamp a forger could also edit". False
  twice over, exactly as the reviewer wrote: the required set covered 5 of 9
  labels, and a class attribute or a heading's capitalisation is easier to edit
  than a version stamp. Both are corrected in the shipped docs, not only here.
- Round 1 §3 called three formatter/parser pairs "round-trip tested" when they
  had no test. They have one now; the sentence was false when written.
- The round-1 "a report with NO summary page at all" case cut the tier out of
  today's HTML and left the tier stylesheet and the scope sentence in place — a
  tampered document, and therefore no evidence about back-compatibility. It is
  replaced by byte copies of GENUINE pre-tier artifacts rendered by `318493c9`
  (`tests/fixtures/verify-report/`, with a README forbidding regeneration), and
  the tampered shape is kept as its own case asserting it IS refused.

### R2.3 The residue, stated

A forger who deletes a conditional claim from the block **and** removes its
rendering from the page (no page estimate anywhere, no percentile sentence and no
bounds line) produces a shorter report that states nothing false, and it verifies
on the claims it does publish. That is removal, not forgery, and treating it as a
refusal would refuse every genuine report that legitimately has no page estimate.
The always-required five (Scenes, Words, Priorities listed, Reference bounds, Page
references) cannot be dropped this way.

### R2.4 Gates — round 2, all foreground, all re-derived

| gate | result | exit |
|---|---|---|
| `npx tsc --noEmit` (= `npm run lint`) | clean | 0 |
| `node scripts/check-no-console.mjs` | 305 files, **23** quarantine entries, all proven unreachable (round 2's table said 24 — corrected in round 3, see R3.2) | 0 |
| `npm run check-docs` | no AI writing patterns | 0 |
| `npm run honesty-audit` | 459 files + 99 register rows — clean. (The tracked-markdown count is deliberately NOT quoted: round 2's table said 461, which was this worktree's count with uncommitted audit files in it, not the committed tree's 450 — see R3.2) | 0 |
| `npm run check-brain` | **101 notes, 353 links**, fresh (round 1's table said 350 — stale, item 8) | 0 |
| `node scripts/check-scoring-receipt.mjs 537c1aa3..HEAD` | **"no scoring-path files changed"** | 0 |
| output identity vs `git archive 537c1aa3`, `GIT_SHA` pinned equal, no `--ignore-keys` | **PASS — all 45 reports byte-identical** | 0 |
| `tests/core/public-benchmark.test.ts` | **28 pass / 0 fail** | 0 |
| `npm run build` | clean | 0 |
| `PW_CHROMIUM_PATH=… npm run verify:surfaces` | **215/215 assertions passed** (213 + the two new `#verify` scope assertions) | 0 |
| `tests/scripts/verify-report.test.ts` | **153 pass / 0 fail** (105 at the end of round 1) | 0 |
| `tests/routes/export-verify.test.ts` | 58 pass / 0 fail | 0 |
| `tests/core/artifact-claims.test.ts` | **104 pass / 0 fail** (91 at the end of round 1) | 0 |
| `tests/core/reader-tier.test.ts` | 22 pass / 0 fail | 0 |
| `tests/core/coverage-html.test.ts` | 54 pass / 0 fail | 0 |
| `tests/core/coverage-letter.test.ts` | 47 pass / 0 fail | 0 |
| `tests/core/percentile-comparability.test.ts` | 23 pass / 0 fail | 0 |
| `tests/core/p0-sample-drift.test.ts` | 4 pass / 0 fail | 0 |
| `tests/core/page-refs.test.ts` | 12 pass / 0 fail | 0 |
| `tests/routes/root-cause-parity.test.ts` | 18 pass / 0 fail | 0 |
| `tests/core/honesty-audit-claims.test.ts` | 5 pass / 0 fail | 0 |
| **ONE full `npm test`** | **13,482 tests · 13,390 pass · 0 fail · 91 skipped · 1 todo** (on the final tree, `511688b8`) | 0 |

The round-1 table's other stale figure: it reported `honesty-audit` scanning
"456 tracked markdown files". That number moves with the tree (the reviewer
measured 450 on `4328a6eb`; it is 461 here after this round's doc commits), so it
should never have been quoted as a fixed result — the exit code is the gate.

### R2.5 Left undone, after round 2

1. **`#verify` still checks only what a recipient types** (accepted by the review
   as the right call). The page now says so, and `verify:surfaces` asserts a
   verifier actually sees the sentence — round 1's left-undone item 5, closed.
2. **The raw report JSON still carries no summary page**, so five claims do not
   exist in that shape. Unchanged and stated per run.
3. **The logline's TEXT is still not verified, only its state** — and
   `server/lib/reader-tier.ts` now records the reviewer's observation about a
   caller that supplies its own logline against a firing gate.
4. **The claim-row label table is back-compatible by test, not by type.**
5. **R2.3's removal residue** above.

---

## Round 3 — response to the round-2 review (copy only, plus the counterexample as a fixture)

One commit on the rebased tip `8475f583`, pushed:
`c9c50296 docs: the known limit, measured — with the counterexample committed as a fixture`.

**Every number below was re-derived on a clean `git archive c9c50296 | tar -x`,
not in the worktree** — which is the whole of item 2, and is why round 2's table
had two figures that did not reproduce.

### R3.1 The stated limit was still false, and the reviewer had the counterexample

Round 2 replaced one wrong sentence with another. The shipped text said a forger
who strips every signal *"leaves a document that no longer renders a summary page
in any recognisable form"*. Replayed here on my own tip, the reviewer's artifacts
verify at **exit 0**:

| fixture | edits | what the page states | verifier |
|---|---|---|---|
| `known-limit-relabelled-coverage.html` | **14** | `9,999 scenes · 999,999 words · ~500 pages / ~500 min (est.)`, `Health percentile: top 5%`, `The 9 things to fix first`, `p. 999` | VERIFIED, exit 0 |
| `known-limit-relabelled-letter.md` | **17** | the same four, under `**Premise.**` / `**Size.**` / `**Rating.**` | VERIFIED, exit 0 |

The edits that matter are edits 1 and 2: every `reader-tier`/`tier-*` markup class
renamed **and the matching stylesheet selectors renamed with them**, so zero
classes are left unstyled and the page renders exactly as the genuine one does. I
confirmed that on the fixture: every `rs-*` class in the file has a matching rule.
The first half of round 2's sentence ("N independent edits, not an unforgeable
property") was right; the second half described a cost the forger does not pay,
because every signal is a machine-readable LABEL, not the page a human reads.

All four sites now carry the reviewer's wording with the measured numbers rather
than "N": README.md, ARCHITECTURE.md §4, `docs/brain/Surfaces/Surface - Exports.md`
and `docs/CLAIMS_REGISTER.md` row 97.

**Both artifacts are committed** as
`tests/fixtures/verify-report/known-limit-relabelled-{coverage.html,letter.md}`,
asserted in `tests/scripts/verify-report.test.ts` to still exit 0 under a
`KNOWN LIMIT` heading — a fail-first target, not a guard. The assertion's failure
message says what to do when it flips (move the fixtures out of the known-limit
block, delete the README section and the four sentences that cite them), and the
test also asserts the four forged strings are still in the fixture bytes, so a
fixture that lost its forgery cannot make the block a tautology. The fixtures
README lists all 14/17 edits and tabulates what the page claims against what the
engine says.

This is **not** the R2.3 residue. R2.3 covers a forger who REMOVES a claim's
rendering and states nothing false; here the page states four things that are
false, one of them flattering, and nothing warns the reader.

### R3.2 The two figures, corrected — and why they were wrong

| figure | round 2 said | clean archive of `c9c50296` says |
|---|---|---|
| `check-no-console` quarantine entries | 24 | **23** |
| `honesty-audit` tracked markdown files | 461 | **454** on this tip (450 on `511688b8`) |

The 24 came from a worktree with an untracked fixtures directory in it. The 461
was this worktree's count with uncommitted audit files present — a moving number
quoted as a fixed result, one line after the round's own closing paragraph warned
against exactly that. **The markdown count is now not quoted at all** in the
corrected round-2 table: it counts the whole tree, so it moves whenever anything
lands on main, and the exit code is the gate. Both round-2 table rows were
corrected in place, in both report copies, with a pointer to this section.

### R3.3 Gates — round 3, on a clean `git archive c9c50296`

| gate | result | exit |
|---|---|---|
| `node scripts/check-scoring-receipt.mjs 537c1aa3..c9c50296` | **"no scoring-path files changed"** | 0 |
| output identity vs `git archive 537c1aa3`, `GIT_SHA` pinned equal, no `--ignore-keys` | **PASS — all 45 reports byte-identical** | 0 |
| `node scripts/check-no-console.mjs` | 305 files, **23** quarantine entries, all proven unreachable | 0 |
| `npm run check-docs` | no AI writing patterns | 0 |
| `npm run honesty-audit` | 459 files, 99 register rows — clean | 0 |
| `npm run check-brain` | 101 notes, 353 links, fresh | 0 |
| `npx tsc --noEmit` | clean | 0 |
| `tests/scripts/verify-report.test.ts` | **155 pass / 0 fail** (153 in round 2; +2 known-limit cases) | 0 |
| `tests/core/artifact-claims.test.ts` | 104 pass / 0 fail | 0 |
| `tests/core/reader-tier.test.ts` | 22 pass / 0 fail | 0 |
| `tests/core/coverage-html.test.ts` | 54 pass / 0 fail | 0 |
| `tests/core/coverage-letter.test.ts` | 47 pass / 0 fail | 0 |

No engine, claim-set, gate or test BEHAVIOUR changed in this round — the only
executable change is two new assertions that document a limit. The full
`npm test`, the public benchmark and `verify:surfaces` were run on the round-2
tip (13,482 / 13,390 pass / 0 fail; 28/28; 215/215) and this round touches
nothing they cover; the two new test cases are inside
`tests/scripts/verify-report.test.ts`, re-run above at 155/0.

### R3.4 Left undone, after round 3

Unchanged from R2.5, with one item now measured rather than asserted:

1. **The known limit itself** — 14 edits to an HTML, 17 to a letter — is open,
   documented, and has a committed fail-first target. Closing it means keying the
   gate on something that is not a label: the page's own rendered numbers rather
   than the markup around them.
2. `#verify` still checks only what a recipient types (accepted by the review).
3. The raw report JSON carries no summary page, so five claims do not exist there.
4. The logline's TEXT is not verified, only its state.
5. The claim-row label table is back-compatible by test, not by type.
6. R2.3's removal residue.
