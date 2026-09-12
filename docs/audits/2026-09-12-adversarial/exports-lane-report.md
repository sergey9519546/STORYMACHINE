# Lane report — the exports half of the writer's loop (2026-09-12)

**Worktree:** `/home/user/wt-exports2` · **Branch:** `lane/exports-truth`
**Base:** `312f4f34` — the tip of `origin/lane/writer-loop-client`, which is
`origin/main` (`f8e638c3`) plus 14 commits, `main` being a strict ancestor
(`git merge-base --is-ancestor origin/main origin/lane/writer-loop-client` → 0).
Since main fast-forwards to that tip, **basing here equals basing on main**.
**Tip:** `4af8ae97`, pushed to `origin/lane/exports-truth` after every commit (§7.1).
Scratch paths below are written as `<session scratch>`.

```
git log --oneline 312f4f34..HEAD
4af8ae97 test(title-page): the draft date joins the three tracked title-block fields
13a9d2f9 docs(brain,claims): record the six export fixes, and repair three stale anchors
f811b2f1 fix(exports): export -> re-import keeps everything that prints, and says what it does not
6c4c10a6 fix(exports): when the voice channel abstains, both surfaces say why
bf778071 fix(exports): the dimension badges reach the exported documents
00c94a9f fix(exports): every cross-reference names a heading the report rendered
12517085 fix(exports): an unapplied deduction is never rendered as an applied one
dcad8e10 fix(exports): one "things to fix first" list, four surfaces
```

8 commits · 41 files, +2999 / −138. One commit per brief item, each pushed, each
with a fail-first test whose failure was recorded on a `git archive 312f4f34`
checkout before the fix existed; plus a docs/brain commit and one test commit
closing the single failure the first full `npm test` found.

**On the coordinator's process rule:** this lane ran no pattern kill of any kind.
`pkill`, `killall` and `kill $(pgrep …)` appear nowhere in anything it ran or
wrote — it started no standalone server and no standalone browser; the only
processes it spawned were `node --experimental-strip-types <test>`,
`npm run build`, `npm test` and `npm run verify:surfaces`, each of which owns and
reaps its own children. Nothing in this lane's diff adds a kill of any shape.

---

## §1 — what the thing IS, and where the brief's premises needed correcting

All six items are **presentation and interchange** defects. Not one of them is a
scoring change: `node scripts/check-scoring-receipt.mjs 312f4f34..HEAD` ends
*"no scoring-path files changed"*, and the output-identity harness reports
**PASS — all 45 reports byte-identical** against a `git archive 312f4f34`
baseline with `GIT_SHA=identity-baseline` pinned on both sides (`analyzedAt`
excluded, no `--ignore-keys`).

Four corrections to the brief's premises, each found by reading or measuring
rather than assumed:

1. **Finding 8's defect is wider than the letter.** The brief (and the finding)
   name two lists. There are FOUR selections of the same list in the tree, and
   the panel's is the loosest: `ScriptDoctorPanel.tsx` rendered
   `report.topPriorities` RAW, with no contradictory-pair suppression at all —
   so the writer's screen could show a finding both exported documents of the
   same `contentHash` had dropped as contradicted. The one shared selection is
   wired into all four, not two.

2. **Finding 11's "in every export (HTML, letter, JSON)" is true of one of
   them.** The coverage LETTER renders no graph-health row at all — there is
   nothing there to label — and the "JSON" artifact is the raw
   `ScriptDoctorReport`, where the field is `graphHealth.graphDeduction`, the
   engine's own output shape. Renaming it is a scoring-path edit and would break
   the 45/45 identity, so it is untouched. What IS enforced for those two: the
   letter is asserted to print no graph row and no signed deduction (so it cannot
   gain an unlabelled one), and the verifier's claim set is asserted to publish
   no graph field and no row whose value is the deduction — the brief's "the
   verifier's claim set must not treat it as a health component", as a test
   rather than an observation.

3. **Finding 18's "all six `FADE OUT.` transitions are dropped" is wrong in a
   more interesting way: they are MANGLED, not dropped.** Measured on the
   231-scene fixture, the FDX writer emits six `Type="Transition"` paragraphs
   and the importer returns six transitions — as `> FADE OUT.:`. The importer
   appended a terminator to text that already had one, which then failed the
   auto-detect test it would otherwise have passed and came back force-marked.
   Finding 18's title-page half is exactly right, and there is a THIRD loss the
   finding does not name (below).

4. **Finding 17's abstention reason cannot be read off the engine.**
   `server/nvm/analyze/voice-delta.ts` has two abstention branches and returns
   `{ pairs: [], scored: false }` for both — it records neither. Adding a reason
   field is a scoring-path change. And `report.characters` counts every named
   character who APPEARS, not every character who SPEAKS, so the fixture's "81
   characters" is not evidence that two of them have dialogue. The copy
   therefore states the one branch the report settles (fewer than two named
   characters) specifically, and names both conditions otherwise — rather than
   guessing which fired, which is what the finding's own suggested wording
   ("no character has enough dialogue across the draft") would have done.

---

## §3 — before/after, each with the command that produced it

### Finding 8 — UNTRUE P3, two contradictory "3 things to fix first"
`server/lib/priority-selection.ts` (new) · `reader-tier.ts` · `coverage-html.ts` ·
`coverage-letter.ts` · `ScriptDoctorPanel.tsx`

Four selections of one list:

| surface | before | after |
|---|---|---|
| producer tier | `suppressContradictoryFindings(top).slice(0, 3)` | `leadingPriorities(top, 3)` |
| coverage HTML | `suppressContradictoryFindings(top)` | `orderedPriorities(top)` |
| coverage letter body | `[...anchored, ...unanchored].slice(0, 3)` | `orderedPriorities(top)` |
| Script Doctor panel | `report.topPriorities` — no filter | `orderedPriorities(top)` |

On `data/screenplays/runoff.fountain`, one exported letter, one `contentHash`:

| | list #1 (page one) | list #2 (body), before | list #2 (body), after |
|---|---|---|---|
| 1 | **CRITICAL** — Conflict layer | MAJOR — Scene 5 (midpoint) | **CRITICAL** — Conflict layer |
| 2 | MAJOR — Scene 5 (midpoint) — p. 3 | MAJOR — End of Act 1 (Scene ~3) | MAJOR — Scene 5 (midpoint) |
| 3 | MAJOR — Overall structure | MAJOR — End of Act 2 (Scene ~7) | MAJOR — Overall structure |
| heading | The 3 things to fix first | The 3 things to fix first | **The 10 things to fix first** |

The body now renders the whole list, as the coverage HTML already did, so the
two headings state different counts and the same order — the tier is a prefix.
**Nothing the old slice showed is lost:** all three of its entries are still
printed, at ranks 1, 3 and 4 of the committed golden.

`leadingPriorities` suppresses BEFORE it slices, which is the one case the order
of those two operations matters: a suppressed finding inside the leading three
made slice-then-suppress return two findings and a hole.

The letter's `ANCHORED_LOCATION_RE` is DELETED rather than moved into the shared
function, with the reason at the site: applying an anchored-first re-sort there
would demote the same document-anchored CRITICAL on every surface instead of one.
Same shape as this file's own 2026-09-11 removal of `severityRank()`.

**Fail-first:** `tests/core/priority-selection-one-list.test.ts` — **6 of 11 fail**
on `312f4f34` with the new module copied in, so the guard loads and fails on the
unfixed renderers rather than on a missing import. 11/11 here.
Log: `<session scratch>/ex2/faillogs/f8-failfirst.log`.

### Finding 11 — UNTRUE P3, an unapplied deduction rendered as applied
`src/lib/diagnostic-copy.ts` · `coverage-html.ts` · `ScriptDoctorPanel.tsx`

| surface | before | after |
|---|---|---|
| exported coverage HTML | `→ Health deduction` · `−9` | `Would deduct if enabled` · `up to 9 pts — not applied` |
| Script Doctor panel | `37/100 −9hp`, the `−9hp` in stamp red | `37/100` + `Would deduct if enabled: up to 9 pts — not applied`, muted |
| section heading (export) | `Structural Analysis` | `Structural Analysis` + the shared `Diagnostic — not part of Health` badge |
| card caption (export) | none | `diagnosticNotInHealthSentence('Graph Health')` |

The number itself, the magnitude and every finding under them still print. The
client lane captioned this card on 2026-09-11 and left the `−9hp` figure; the
figure is the half finding 11 is actually about, and it is now conditional by
construction ("Would", never "did"), unsigned for every input including negative
and non-finite, and out of the headline's "hp" unit.

`tests/core/diagnostic-not-health-label.test.ts` required the literal
`−{report.graphHealth.graphDeduction}hp` — the exact rendering this finding
forbids. That assertion is REPLACED, not dropped: the magnitude is still required
to render, through the shared unsigned function, and a new assertion forbids the
minus sign. Its import-shape assertion was pinned to three exact lines, so adding
a third shared symbol failed a test about whether the copy is shared; it now
asserts the property (one import, from that module, carrying every symbol).

**Fail-first:** `tests/core/unapplied-deduction-honesty.test.ts` — **4 of 9 fail**
on `312f4f34` (the module copied in). 9/9 here.
Log: `faillogs/f11-failfirst.log`.

### Finding 16 — ROUGH P3, a cross-reference to a section that does not exist
`server/lib/report-sections.ts` (new) · `coverage-html.ts` · `coverage-letter.ts`

```
before:  grep -c "Top Priorities" RUNOFF.coverage.html  ->  1
         (and that one occurrence IS the cross-reference)
after:   grep -c "Top Priorities" RUNOFF.coverage.html  ->  0
```

The rendered sentence, on `runoff`:

> The 16 findings below cluster the detailed issue list by where they land in
> the script — read after **The 10 things to fix first**, alongside **Full Pass
> Appendix**.

The check is structural rather than a banned string, which is the part worth
reviewing: every cross-reference renders as `<span class="xref">…</span>`, and
`tests/core/report-cross-references.test.ts` extracts every one of them from a
rendered document and requires it to name a heading THAT document rendered.
Driven over four shapes chosen because a dangling reference is likeliest where a
section is conditional — the 231-scene fixture (every section), a 9-scene short,
a report with NO root causes (neither referring section renders, so the document
must contain no `.xref` at all), and a one-priority report (the heading is "Fix
this first", with no numeral, so a reference computed from a different count
names nothing).

The priorities count is computed ONCE in `renderCoverageHtml` and handed to the
section that prints the heading and the two that name it — a reference derived
from a different count is the same defect in a new costume.

Two more references were found and fixed while enumerating: the letter pointed at
a `"Structural Signals"` strip (the HTML heading has carried
`(new, unwired diagnostics)` since the qualifier was added), and both letter
renderers hand-typed the `Root Causes` heading the coverage HTML also prints. A
source-level case asserts no renderer hand-types a section title at all.

**Fail-first:** **6 of 12 fail** on `312f4f34`, including
*"the markdown letter points at "Structural Signals", which the exported HTML
does not head"*. 12/12 here. Log: `faillogs/f16-failfirst.log`.

### Findings 4/14 (export half) — the dimension badges
`coverage-html.ts` · `coverage-letter.ts`

Before this commit, three surfaces stated three different things about the same
five numbers of one `contentHash`: the panel showed five gated badges and a gated
caption, the coverage HTML showed **none**, and the letter had **no dimension
section at all**. The finding's reproduction was fixed on the writer's screen and
invisible in the document a producer receives.

Measured, per surface, on the fixture and on `runoff`:

```
runoff (9 sc / 1448 w)    panel   HTML        letter
  Structure & Pacing  94  not comparable  (none)  (no section)   ->  all three: "not comparable"
  Dialogue & Voice    98  not comparable  (none)  (no section)   ->  all three: "not comparable"
  Theme & Orig.      100  not comparable  (none)  (no section)   ->  all three: "not comparable"
231-scene assembly        not comparable  (none)  (no section)   ->  all three: "not comparable"
```

The test asserts **equality against the shared helpers**, per dimension, in the
HTML, the markdown letter and the plain-text letter — not the presence of a
badge. A constructed in-bounds case exercises the SHOWN path (0 of the 20 CC0
scripts are inside the reference bounds, so it cannot be got from a real script):
the badge must come from the direction-safe vocabulary — `top 10%` /
`bottom 10%` / `bottom quartile` / `stronger than N%`, a grammar that cannot
produce `percentileBand(20)`'s "top 80%" at all — and the tooltip must name the
unclamped statistic it ranked. Source-level cases assert no surface calls
`dimensionPercentileBand` or `percentileBand` directly.

The badge sits beside the LABEL, not the score: "not comparable" is a statement
about the ranking, and putting it next to the 92/100 is what made the two read as
two readings of one number.

`tests/core/percentile-comparability.test.ts`'s prose count for the reference
bounds goes **2 → 3** (the tier, the new Craft Dimensions caption, the
how-to-read caveat). This is the one loosened number in the lane and it is
loosened by ADDING an assertion, not by widening one: the count is still exact,
and each of the three occurrences must now fall in a DIFFERENT section, so a
section that states the bounds twice — the defect that test exists for — still
fails.

**Fail-first:** **6 of 8 fail** on `312f4f34`. 8/8 here.
Log: `faillogs/f4-14-failfirst.log`.

### Finding 17 (tooltip half) — voice separation reads N/A with the wrong tooltip
`src/lib/voice-separation-copy.ts` (new) · `CoverageSummary.tsx` · `coverage-html.ts`

Measured with a real doctor run on the committed inputs — and re-measured by the
test, so an engine change that makes the channel report fails there rather than
leaving copy asserted for a state that no longer occurs:

| input | scenes | characters | `voiceAnalysis.scored` |
|---|---|---|---|
| `assembled-feature.fountain` | 231 | 81 | **false** |
| `runoff` | 9 | 5 | true (10 pairs) |
| `dead-frequency` | 12 | 4 | true (6 pairs) |
| `chain-of-custody` | 13 | 4 | true (6 pairs) |

| | before | after |
|---|---|---|
| tile value (feature length) | `N/A` | `N/A` (unchanged — the tile is where the value goes) |
| tile tooltip (feature length) | *"Character pairs whose dialogue is statistically distinguishable (Burrows's Delta)… Higher is better…"* | *"Not measured: this reading needs at least two characters with dialogue and enough dialogue from each one across the whole draft to compare…"* |
| tile tooltip (a short) | the same sentence | the same sentence — it is correct beside a value |
| exported coverage report (the **HTML** one — the letter carries no Voice Separation row, as it carries no graph-health row; this fix reaches one exported document, not two) | the channel is absent entirely | `Voice Separation · 6/6 Pairs` + the reading instruction, or `not measured` + the reason |

The export row is gated on the FIELD's presence, not on `scored`: an absent
`voiceAnalysis` means the caller attached none, which is a different statement
from "the engine ran this and abstained" — the same guard convention the
`graphHealth` / `disclosureAnalysis` / `subplots` rows beside it already use.
(That gate is also why the committed byte-reference fixture, a hand-built report
with no such field, is unchanged by this commit.)

The scoring half — per-character abstention, so the channel can report at feature
length — is on the owner-gated branch and was not touched.

**Fail-first:** **7 of 11 fail** on `312f4f34` (the module copied in). 11/11
here. Log: `faillogs/f17-failfirst.log`.

### Finding 18 — ROUGH P2, export → re-import is not lossless
`server/lib/fdx-import.ts` · `src/lib/fdx.ts` · `src/lib/pdf.ts` · `src/lib/docx.ts` ·
`src/lib/export-title-page.ts` · `src/lib/fountain-title-block.ts` ·
`src/lib/export-roundtrip.ts` (new) · `ShipPanel.tsx`

**Measured first, per format** (`<session scratch>/ex2/rt.mjs`, real doctor runs
on both sides):

| input | format | health | words | issues | scenes |
|---|---|---|---|---|---|
| `assembled-feature` (231 sc) | original | 84.4 | 19,293 | 899 | 231 |
| | FDX round trip, **before** | 84.8 | 17,442 | 887 | 231 |
| | FDX round trip, **after** | 84.8 | **17,450** | 885 | 231 |
| | PDF text round trip | 84.8 | 17,447 | 857 | 231 |
| `runoff` (9 sc) | original | 74.6 | 1,448 | 142 | 9 |
| | FDX round trip | 74.5 | 1,424 | 147 | 9 |
| | PDF text round trip | 74.8 | 1,424 | 126 | 9 |
| `chain-of-custody` (13 sc) | original | 76.3 | 824 | 178 | 13 |
| | FDX round trip | 75.4 | 772 | 176 | 13 |
| | PDF text round trip | **73.6** (grade solid, not strong) | 772 | 187 | 13 |
| any | DOCX | — | — | — | there is no importer |

Then the residual loss was CLASSIFIED line by line (a diff of the round trip
against the source, with boneyard membership computed):

```
before the fixes   assembled-feature  252 lines lost, 4 of them non-boneyard
                                      (Title:, Credit:, Author:, Draft date:)
                                      + 6 lines CHANGED: FADE OUT. -> > FADE OUT.:
after fix 1+2      assembled-feature  252 lost, 1 non-boneyard (Draft date:)
after fix 3        assembled-feature  ALL lost lines are boneyard; 0 changed
                   runoff             0 non-boneyard
                   chain-of-custody   0 non-boneyard
```

**Three bugs, all in what the code chose to throw away:**

1. `fdx-import.ts` replaced the whole `<TitlePage>` subtree with `''`. It is now
   separated rather than discarded and re-emitted as the Fountain title block it
   came from — FDX's title-page paragraph types mapped back to Fountain keys, a
   repeated type (a multi-line Contact, which `fdx.ts` writes one paragraph per
   line) becoming that key's indented continuations, and a newline inside a value
   collapsed because a blank line would end the whole block and drop every key
   after it. The subtree still never reaches the BODY.
2. `formatTransition` appended `:` whenever the text did not already end in `:`,
   so `FADE OUT.` became `FADE OUT.:`, failed the auto-detect test it would
   otherwise have passed, and came back forced as `> FADE OUT.:`.
3. **Not in the finding:** the draft date was in no exporter's title-page model,
   so all three dropped it — the one non-boneyard line still lost after fix 1. It
   is now parsed, carried through `resolveExportTitlePage`, written to FDX as a
   `Draft Date` paragraph, and printed bottom-right on the PDF and DOCX cover
   sheets (the corner the contact block does not occupy). `docx.ts`'s
   `titleParagraph` gained a `'right'` alignment; `'left'` deliberately still
   emits no `<w:jc>`, so every title page exported before today is byte-unchanged.

**What is disclosed, and where.** `src/lib/export-roundtrip.ts` states per format
what happens on the way back in. The Ship panel prints the summary as an
always-visible paragraph under the export grid and the per-format note in each
button's hover title, so a reader who never hovers still gets the fact. Included
deliberately: `.fountain` is byte-identical but ScriptIDE PREPENDS a title page
when the draft has none, which is an addition rather than a loss and still
changes the hash — said, rather than discovered.

**The round-trip test is what makes that a claim rather than a hedge.** The round
trip is compared against the source with exactly the four non-printing constructs
stripped, so a round trip that lost one PRINTING line fails even though the word
count would still look about right. The `contentHash` is pinned where it should
be: a draft already in the importer's canonical shape round-trips byte-identically,
to the same hash and the same report (health, verdict, grade, sceneCount,
wordCount, contentHash all equal), and a second round trip changes nothing. The
PDF case asserts the scene count IS preserved and the hash is NOT — which is
exactly what the disclosure claims. The DOCX case inspects the module's exports,
so a `docxToFountain` appearing there fails the test rather than leaving the
"cannot be brought back" sentence to outlive its truth.

**Fail-first:** **9 of 19 fail** on `312f4f34` (the module copied in). 19/19 here.
Log: `faillogs/f18-failfirst.log`.

---

## §4 — gates, in the foreground, with exit codes

| gate | command | result |
|---|---|---|
| lint | `npx tsc --noEmit` | **0** |
| no-console | `node scripts/check-no-console.mjs` | **0** — 307 files, 23 quarantine entries |
| docs quality | `npm run check-docs` | **0** — "No AI writing patterns detected" |
| honesty audit | `node scripts/honesty-audit.mjs` | **0** — 465 files, **474** markdown, 114 claims rows, clean *(corrected in round 2: this table was written before this lane's own docs commit added the brain note, and said 473; both runs exit 0 — review non-blocking 4)* |
| brain graph | `node scripts/brain-graph.mjs --check` | **0** — 106 notes, 397 links, fresh |
| brain coverage | `tests/core/brain-coverage.test.ts` | **7/7** |
| scoring receipt | `node scripts/check-scoring-receipt.mjs 312f4f34..HEAD` | **0** — *"no scoring-path files changed"* |
| output identity | `check-doctor-output-identity.mjs --compare` | **PASS — all 45 byte-identical** |
| public benchmark | `tests/core/public-benchmark.test.ts` | **28/28** |
| build | `npm run build` | **0** |
| browser | `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run verify:surfaces` | **0** — **248/248 assertions passed** |
| full suite | `npm test` | **0** — **13,696 tests · 13,604 pass · 0 fail · 91 skipped · 1 todo** |

`npm test` was run twice. The FIRST run, on `13a9d2f9`, reported exactly **one**
failure — `tests/core/fountain-title-block.test.ts` pinned
`parseFountainTitleBlock`'s whole return object with `assert.deepEqual`, and
finding 18's third fix adds `draftDate` to it. That is recorded rather than
folded in: the assertion was corrected (still a `deepEqual`, so a further field
cannot be added unnoticed) plus a new case pinning the half the addition must NOT
change, in commit `4af8ae97`. The SECOND run, on the final tree `4af8ae97`, is
the 0-fail line above. No browser battery beyond `verify:surfaces` (the
orchestrator runs it).

**Touched suites, each run individually on the final tree:**

| suite | result |
|---|---|
| `priority-selection-one-list.test.ts` (new) | 11 / 0 |
| `unapplied-deduction-honesty.test.ts` (new) | 9 / 0 |
| `report-cross-references.test.ts` (new) | 12 / 0 |
| `dimension-badge-export-parity.test.ts` (new) | 8 / 0 |
| `voice-separation-abstention.test.ts` (new) | 11 / 0 |
| `export-roundtrip.test.ts` (new) | 19 / 0 |
| `coverage-html.test.ts` | 54 / 0 |
| `coverage-letter.test.ts` | 47 / 0 |
| `reader-tier.test.ts` | 22 / 0 |
| `artifact-claims.test.ts` | 104 / 0 |
| `p0-sample-drift.test.ts` | 4 / 0 |
| `percentile-comparability.test.ts` | 23 / 0 |
| `percentile-copy-consistency.test.ts` | 30 / 0 |
| `dimension-percentile-badge.test.ts` | 11 / 0 |
| `dimension-badge-wiring.test.ts` | 3 / 0 |
| `diagnostic-not-health-label.test.ts` | 8 / 0 |
| `fdx-import.test.ts` | 8 / 0 |
| `pdf-import.test.ts` | 17 / 0 |
| `export-xml-wellformed.test.ts` | 11 / 0 |
| `coverage-format-unrecognized-card.test.ts` | 18 / 0 |
| `coverage-rerun-one-control.test.ts` | 8 / 0 |
| `coverage-summary-escape.test.ts` | 3 / 0 |
| `sample-coverage-facts.test.ts` | 3 / 0 |
| `fountain-title-block.test.ts` | 15 / 0 (was 14; 1 failing on `13a9d2f9`) |
| `honesty-audit-claims.test.ts` | 15 / 0 |
| `claims-row-citations.test.ts` | 3 / 0 |
| `brain-coverage.test.ts` | 7 / 0 |
| `tests/routes/export-coverage.test.ts` | 13 / 0 |
| `tests/routes/export-coverage-letter.test.ts` | 23 / 0 |
| `tests/routes/root-cause-parity.test.ts` | 18 / 0 |
| `tests/routes/export-fdx-docx-parity.test.ts` | 3 / 0 |
| `tests/routes/export.test.ts` | 3 / 0 |

**One browser-suite flake, recorded rather than hidden.** The first of three
`verify:surfaces` runs bailed with
`FATAL — locator.waitFor: Timeout 33375ms exceeded · waiting for
locator('header.sm-pagetop')` at `scripts/verify-p2-p3-surfaces.mjs:556`, after
83 passing assertions. That step is a `Start fresh` click followed by a wait for
the toolbar header, in a phase this lane does not touch; the final run passed
248/248 with the same binary and the same tree. It is recorded because a reviewer
may hit it, not because it is explained.

---

## §2/§5 — goldens re-locked, and what the diff said

Every re-lock below was read before it was committed.

- **`tests/fixtures/coverage-letter/report{1,2,3}.expected.md`** — twice. First
  for finding 8: the body's heading `The 3 things to fix first` → `The 10 things
  to fix first` and its three entries become ten, with all three originals still
  present at ranks 1, 3 and 4; the tier's list and heading are unchanged. Then for
  findings 4/14: a new `## Craft Dimensions` section, five `label — score/100 —
  not comparable` lines and the gated caption.
- **`tests/fixtures/coverage-html/no-percentile-no-draftrank.html`** — three
  times, each an intentional renderer change re-captured with
  `CAPTURE_COVERAGE_HTML_FIXTURE=1` and diffed: the `.diagnostic-badge` /
  `.diagnostic-note` rules, the `.xref` rule, the `.dim-pct` / `.dim-pct-caption`
  rules. **CSS only** — that fixture's hand-built report carries no
  `graphHealth`, no `voiceAnalysis` and no dimension percentiles, so no markup
  changed. This guard exists to catch UNCONDITIONAL additions, and three
  stylesheet blocks are exactly that: they ship on every report, for sections
  that render on real ones.
- **`docs/user-validation/sample-coverage-report.html`** — four times, and the
  non-masked diff each time was only this lane's own change: the two
  graph-health rows and the diagnostic caption/badge; the two cross-reference
  sentences gaining `The 9 things to fix first` and `Full Pass Appendix`; the
  five dimension badges and their caption; the Voice Separation row and its
  reading instruction. Everything else moving was the three fields
  `p0-sample-drift.test.ts` already masks (header date, footer timestamp, engine
  commit).

---

## §5 — what was left undone, narrowed, or deliberately not done

1. **The raw report JSON still carries `graphHealth.graphDeduction` with nothing
   beside it saying it was not applied.** That is the engine's own output shape;
   renaming or annotating it is a scoring-path edit and would break the 45/45
   identity. What is guarded instead is that nothing reads it as health. A
   stronger version adds a non-scoring sibling field through an approved
   migration, which is a separate change with its own receipt.
2. **Finding 17's specificity.** The finding's example reason names counts
   ("504 cues spread over 231 scenes") the report does not carry. The copy names
   the conditions instead. The stronger version records the branch in
   `voice-delta.ts`'s return — scoring-path, owner-gated.
3. **Finding 4's real cause is still unfixed and is not mine.** `doctor.ts` ranks
   `build.rawScore` while the badge sits beside the clamped score. The export now
   states the mismatch in its tooltip, exactly as the panel does; re-ranking is a
   scoring change.
4. **The `dimensionPercentileCaptionFor` copy reads oddly and I did not change
   it.** On a not-comparable draft the caption says "No percentile badges:" above
   five badges reading "not comparable". The client lane chose that wording and
   pinned it in `tests/core/dimension-percentile-badge.test.ts` and in
   `verify:surfaces`; the brief says to call their shared functions and add no
   second formatter, so the export prints it verbatim. It is worth one of the
   reviewer's minutes: if the caption became "No percentile is stated for this
   draft:", all three surfaces would improve at once and two pins would need
   updating.
5. **The claims register has duplicate row numbers 94-99** — the client lane and
   the verify lane each numbered from 93/94 and both merged. The audit does not
   check numbering, so it is invisible to the gates, and "row 96" is now
   ambiguous in prose. Untouched (renumbering another lane's rows is outside this
   brief); flagged for the orchestrator.
6. **Three register anchors were already stale at the branch point** — rows 3 and
   5 (`StartScreen.tsx`, drifted 17 lines) and row 9 (`ScriptDoctorPanel.tsx`,
   4993 → 5025). `node scripts/honesty-audit.mjs` FAILED on `312f4f34` for all
   three. They are corrected here (row 9 to 5047, since this lane's panel edits
   move it a further 22 lines), and the audit is clean.
7. **`verify:surfaces` has no assertion over the three new export surfaces.** The
   Ship panel's round-trip paragraph carries `data-export-roundtrip`, the panel's
   deduction line carries `data-unapplied-deduction`, and both are asserted at
   source level and in the rendered documents — but nothing drives them in a
   browser. Adding three phases would be the stronger version; the brief did not
   ask for them and the suite already runs 248 assertions.
8. **The PDF round trip is disclosed, not repaired.** `chain-of-custody` comes
   back at health 73.6 against 76.3, and its grade moves strong → solid. The scene
   count survives; the rest is page geometry. Repairing it means teaching
   `pdf-import.ts` to recover non-printing text that is not in the file, which is
   impossible, or tightening its block classification, which is a real piece of
   work with its own measurement.

---

# Round 2

Revision round against `docs/audits/2026-09-12-adversarial/exports-review.md`
(VERDICT REVISE — two blocking items, six non-blocking). **Worktree:**
`/home/user/wt-exports2` · **Branch:** `lane/exports-truth`.
Scratch paths below are written as `<session scratch>`; the round-2 scratch is a
FRESH directory (`<session scratch>/r2`), not the `base/` tree the reviewer
warned about — its baseline was verified against the blob before anything was
measured in it (`sha256sum <session scratch>/r2/base/server/lib/fdx-import.ts`
== `git show 4af8ae97:server/lib/fdx-import.ts | sha256sum` →
`9e4411f100a6…`).

## Step 0 — the rebase

| | |
|---|---|
| old tip | `4af8ae975fd76a81a083da8b4e21ee7586bf056e` |
| old base | `312f4f34` |
| new base | `eb8cf9b291ad85b362993188457a658096ffe2d1` (`origin/lane/writer-loop-client` at the time of the brief) |
| tip after the rebase, before round-2 work | `b7bf9c22e734c509cb137414f19a678d0c3adc04` |
| **final tip** | see "Tip and origin (Round 2)" below |

```
git fetch origin lane/writer-loop-client
git rebase --onto origin/lane/writer-loop-client 312f4f34
```

Seven of the eight commits replayed clean; the eighth
(`13a9d2f9 docs(brain,claims)`) conflicted in `docs/CLAIMS_REGISTER.md` in two
places, both expected:

1. **Rows 3, 5 and 9** — the client lane's own `565c9a2c` repaired the same
   three stale anchors this lane had. Resolved by keeping the register as it
   stands on the new base. Row 9's line number is the one value that could not
   be taken as-is: the anchor sits at `ScriptDoctorPanel.tsx:5025` in the client
   lane's tree and at `:5047` in this one, because this lane's panel edits add
   22 lines above it. `node scripts/honesty-audit.mjs` FAILED on exactly that
   row after the first resolution and passes with `:5047`; the parenthetical now
   records all three corrections (`:3443` → `:4993` → `:5025` → `:5047`) instead
   of only the client lane's.
2. **The eight new rows** — resolved by keeping the new base's rows 94–106
   untouched and appending this lane's eight at the end of the table,
   **renumbered 101–108 → 107–114**, in their original order. Two internal
   pointers were re-aimed with them: row 108's "the VALUE of the row row 101
   labels" → row 107, and row 114's "not the wording (row 91)" → **row 87**.
   That second one was WRONG BEFORE THE REBASE and is a real repair, not a
   renumbering: row 91 is `formatSceneList`'s scene-list wording; the row that
   registers `The 3 things to fix first` is and always was 87. It is invisible
   to `tests/core/claims-row-citations.test.ts`, whose scope is `src`, `server`,
   `scripts`, `tests` and `docs/brain` — the register's own prose is not
   searched.

`docs/brain/GRAPH.md` and `brain.graph.json` did not conflict. `npm run brain`
was re-run inside the conflicted commit before `--continue`, and the five
register-row citations in four brain notes were renumbered with the rows
(`107-109, 114`, `110`, `111-113` ×2).

**Patch equivalence.** As the brief specified:

```
git diff 312f4f34 4af8ae97 -- . ':!docs/CLAIMS_REGISTER.md' ':!docs/brain/GRAPH.md' \
  ':!docs/brain/brain.graph.json' | grep '^[-+]' | sort
git diff origin/lane/writer-loop-client..HEAD -- <same exclusions> | grep '^[-+]' | sort
```

These differ in **exactly five lines**, and every one of them is a claims-register
row number inside a brain note — the renumbering the resolution required, which
the brief's three-path exclusion list does not cover:

```
-  rows 10, 74-75, 82, 87-92, 105-107      +  … 111-113
-  rows 105-107                            +  rows 111-113
-  rows 49-51, 53, 56-57, 74-75, 82, 86-92, 101-103, 108   +  … 107-109, 114
-  rows 95, 100, 104                       +  rows 95, 100, 110
-  … still gets the fact (… rows 105-107). +  (… rows 111-113).
```

Adding those four brain notes to the exclusion list makes the two sorted patches
**identical** (3,112 → 2,893 lines, `diff` exit 0):

```
git diff <base> <tip> -- . ':!docs/CLAIMS_REGISTER.md' ':!docs/brain/GRAPH.md' \
  ':!docs/brain/brain.graph.json' \
  ':!docs/brain/Surfaces/Surface - Coverage HTML.md' \
  ':!docs/brain/Surfaces/Surface - Coverage Summary.md' \
  ':!docs/brain/Surfaces/Surface - Export Round Trip.md' \
  ':!docs/brain/Surfaces/Surface - Exports.md' | grep '^[-+]' | sort
→ IDENTICAL
```

**Push:** `git push --force-with-lease -u origin lane/exports-truth` —
`+ 4af8ae97...b7bf9c22 lane/exports-truth -> lane/exports-truth (forced update)`.
The one force push allowed, and the only one this lane has made.

### One thing the orchestrator needs to know: the base moved again

`origin/lane/writer-loop-client` is **no longer `eb8cf9b2`**. During this round
it became `e440a0a8` — the same seven commit subjects, new SHAs, rebased onto a
newer `origin/main` (`a3e6e688`), and `eb8cf9b2` is *not* an ancestor of it
(`git merge-base --is-ancestor eb8cf9b2 e440a0a8` → 1). This lane stayed on
`eb8cf9b2`, the tip the brief named and the tip the patch-equivalence proof
above was taken against; a second unrequested rebase onto a ref that has now
moved twice in one session would invalidate that proof and spend a second force
push on a moving target. Every range in the gate table below is therefore
written against the literal SHA `eb8cf9b2`, not the symbolic ref. **The lane
will not fast-forward onto the current client tip and needs one more rebase at
merge time.**

## The items

| # | item | done | evidence |
|---|---|---|---|
| **B1** | the FDX round trip true in both directions, and its test sees both | **yes** | `e9a07911` — construct table below; 14 of 35 cases fail on `4af8ae97` |
| **B2** | the letter's promise and its length | **yes, option (ii), with the arithmetic** | `306eb8bd` — 9 sites reworded, measured 3.3–3.6 pp over 21 scripts, gated |
| **N1** | pin the fourth surface | **yes** | `36f6cb53` — fails on the exact revert the review named |
| **N2** | one wording for the abstention | **yes** | `a89589a4` — `VOICE_SEPARATION_NOT_MEASURED_VALUE` |
| **N3** | multiset comparison, measured word gap | **yes** | in `e9a07911` — gap 1% (174 words) → measured 0 + 2 |
| **N4** | the stale 473 in the gate table | **yes** | corrected in §4 above, marked as a round-2 correction |
| **N5** | `verify:surfaces` not re-run by the review | n/a to the lane | re-run once this round (below) |
| **N6** | the clarifying word on finding 17's reach | **yes** | §3's finding-17 table row now names the HTML export and states the letter carries no such row |

## Blocking item 1 — the FDX round trip

**What the thing IS.** Two defects with one cause: the exporter decided what
crossed into FDX by mapping a Fountain block TYPE to an FDX paragraph Type, and
that map had no column for "this text never prints" and no column for "this
construct needs more than a Type to survive". So non-printing text was mapped to
`Action` (promoted to print) and printing constructs that FDX has no element for
were mapped to `Action` too (flattened). The importer, which could have read
`<DualDialogue>` — the exporter has always written it — never looked.

**Measured, before and after**, one round trip through the real
`fountainToFdx` → `fdxToFountain`, on
`tests/fixtures/fountain-constructs/every-construct.fountain` (new, 40 lines,
one of every construct `src/lib/fountain.ts` parses):

```
node --experimental-strip-types <session scratch>/r2/probe.mjs \
  <session scratch>/r2/constructs.fountain --tree <session scratch>/r2/base   # 4af8ae97
node --experimental-strip-types <session scratch>/r2/probe.mjs \
  <session scratch>/r2/constructs.fountain --tree /home/user/wt-exports2       # tip
```

| construct | on `4af8ae97` | now |
|---|---|---|
| dual dialogue `DAN ^` | `DAN` — `[character]`, the second column gone | **`DAN ^` — `[dual_dialogue]`** |
| centered `> THE END <` | `THE END` — `[action]`, an all-caps action line | **`> THE END <` — `[centered]`** |
| lyric `~Somewhere a radio plays` | `Somewhere a radio plays` — `[action]` | **`~Somewhere a radio plays` — `[lyrics]`** |
| page break `===` | `==` — a synopsis marker | **`===`** |
| forced action `!INT. THE MIND OF A KILLER` | `INT. THE MIND OF A KILLER` — **`[scene_heading]`** | **`!INT. THE MIND OF A KILLER` — `[action]`** |
| forced action `!FORCED ACTION LINE IN CAPS` | `FORCED ACTION LINE IN CAPS` — `[action]` | `FORCED ACTION LINE IN CAPS` — `[action]` *(disclosed as `'unforced'`)* |
| section `# ACT ONE` | **`ACT ONE` — `[action]`, printed in the script** | **dropped — not in the FDX body at all** |
| synopsis `= Maya finds the log…` | **`Maya finds the log…` — `[action]`, printed** | **dropped** |
| note on its own line | dropped | dropped |
| inline note `… coffee. [[check this line]]` | **survives verbatim — printed** | **dropped; the line keeps its prose** |
| boneyard `/* … */` | dropped | dropped |
| **scene count** | **2 → 3** — the round trip invented a scene | **2 → 2** |

The scene-count row is the finding the review did not have: a forced action line
shaped like a heading comes back as a heading, so the returned draft is a
different script by the engine's own primary signal.

**(a) The printing constructs, and the vocabulary they ride on.** Nothing is
invented. `<DualDialogue>` the exporter already wrote. The other three cross
over on Final Draft's own paragraph/text attributes — `Alignment="Center"`,
`<Text Style="Italic">`, `StartsNewPage="Yes"` — all three present in real FDX
documents, and a test asserts the exporter emits no paragraph `Type` outside the
seven body types and five title-page types it already used. The forced-action
marker is restored by the importer, not carried in the file, using the same
force-on-re-import technique `formatSceneHeading` (`.`) and `formatTransition`
(`> `) already used in that module.

The `!` is the one partial case and is disclosed rather than papered over. It is
a force MARKER, not content: its job is to stop Fountain reading the line as
something else. It is restored where Fountain would misread the line without it
and dropped where it would not, because the alternative — forcing every all-caps
action line — prefixes `!` to text the writer never forced. `FDX_CONSTRUCT_FATE`
names that state `'unforced'` and the suite asserts both halves.

**(b) The non-printing constructs: omitted, per the brief's own standard.** The
FDX vocabulary this codebase uses (Paragraph/Text/DualDialogue/TitlePage) has no
element Final Draft treats as non-printing, so carrying them was never an
option that produced a correct Final Draft document; `# ACT ONE` printing as an
action line is the defect the brief names, and omitting is the repair. A test
asserts the words are absent from the exported FDX **file**, not merely from the
way back.

**No writer's existing export moved.** The exported FDX is byte-identical on all
21 committed screenplays (the 20 CC0 scripts plus the 231-scene fixture) —
`sha256` per file, base vs tip, `diff` exit 0
(`<session scratch>/r2/fdx-base.txt` vs `fdx-tip.txt`). The three round-trip
cases the round-1 suite already had still pass unchanged.

**(c) Fail-first, on a FRESH `git archive 4af8ae97` export.**
`<session scratch>/r2/f18-r2-failfirst.log`: **14 of 35 fail**, and they are the
right fourteen — every printing construct, every wrongly-carried non-printing
one, the scene-count case, the FDX-vocabulary case, the verbatim round-trip
golden and the idempotence case. The two that PASS are `boneyard: dropped` (it
already was) and the table/disclosure agreement case, which is a property of the
copy rather than of the code.

**(d) The disclosure now says what is measured.** `EXPORT_ROUNDTRIP_NOTE.fdx`,
`EXPORT_ROUNDTRIP_SUMMARY`, the new `FDX_CONSTRUCT_FATE` table, register rows
**111** and **113** (verified — 111 is the per-format note, 113 the summary) and
`docs/brain/Surfaces/Surface - Export Round Trip.md` all state the same thing,
and the register rows cite the per-construct assertions rather than the
aggregate one they used to cite.

## Blocking item 2 — the letter's promise and its length

**The review undercounted the sites: there are nine, not four.**
`server/lib/coverage-letter.ts:1` and `:797`, `server/routes/coverage-letter.ts:1`,
`server/lib/validation.ts:2349`, three comments in `ScriptDoctorPanel.tsx`
(including the button title at `:4485`, the only user-facing one),
`tests/routes/export-coverage-letter.test.ts:1`, and
`docs/brain/Surfaces/Surface - Coverage Letter.md:12`.

**Measured** (`node --experimental-strip-types <session scratch>/r2/len.mjs <tree>`
and `lenall.mjs`; plain text, words / 500 = one page of 12pt Courier prose):

| | runoff | chain-of-custody |
|---|---|---|
| before this lane (`eb8cf9b2`) | 1,017 w — **~2.0 pp** | 928 w — **~1.9 pp** |
| round-1 tip (`4af8ae97`) | 1,739 w — **~3.5 pp** | 1,706 w — **~3.4 pp** |
| round-2 tip | 1,739 w — **~3.5 pp** | 1,706 w — **~3.4 pp** |

Across the 20 CC0 screenplays plus the 231-scene feature fixture: **3.3 pp to
3.6 pp**, every one of the 21.

**The choice: (ii), and the arithmetic is why (i) is not available.** Option (i)
cannot make the four — nine — sentences true, and this is the measurement that
settles it rather than an opinion:

* This letter's **non-priorities content alone measures ~1,009 words (~2.0 pp)**
  with an EMPTY priorities body: reader summary 72 + producer tier 174 + verdict
  summary 115 + checks-that-found-nothing 88 + Craft Dimensions 167 +
  how-to-read caveats 393. No bound on the body reaches "one-to-two-page". The
  only way there is deleting a section — Craft Dimensions is findings 4/14's own
  merged work, the caveats are honesty copy — which is the subtraction the
  standing directive forbids.
* And option (i) barely shortens anything, because it prints the top three
  TWICE. Measured on runoff: tier 174 + body-of-three ~255 + a compact
  ranked tail ~430 = **~859 words** against the current tier 174 + body-of-ten
  696 = **870**. Eleven words.

So the sentence is corrected to the measurement. Every one of the nine now says
**three-to-four-page**, and the length is a range that can be promised at all
only because it is **bounded by the engine**: `doctor.ts:1920` caps
`topPriorities` at ten, so a 231-scene feature and a 9-scene short render letters
within 0.3 pp of each other. Nothing was removed from the letter.

**Gated, not asserted.** `tests/core/coverage-letter.test.ts` renders the letter
from real doctor runs on the feature fixture and two shorts and requires
3 ≤ pp < 5; and reads all six files at source level, where the retired wording
may appear only in quotes (`server/lib/coverage-letter.ts` explains why it was
retired, and an explanation that cannot name the sentence is worth less) and each
must state the measured one. Registered as claim row **115**, since a writer
reads it before pressing the button.

**Fail-first:** on `4af8ae97`, **2 of the 6** new cases fail. The three
page-count cases PASS there — which is the finding stated precisely: the letter
was already three-and-a-half pages on the round-1 tip; only the sentence about
it was false.

## The non-blocking items

**1 — the fourth surface is pinned.** `36f6cb53` adds three source-level cases to
`tests/core/priority-selection-one-list.test.ts`, comments stripped so they pass
on code rather than on prose that names the field: the panel imports
`orderedPriorities` and builds its list with it; nothing in the panel reads
`report.topPriorities` outside that one call; and the heading's count comes from
the list under it. Proven two ways. On `origin/lane/writer-loop-client` with the
module copied in, all three fail (`<session scratch>/r2/panel-failfirst.log`).
And with the EXACT revert the review named applied to a `git archive 4af8ae97`
tree — `() => orderedPriorities(report?.topPriorities)` back to
`() => report?.topPriorities ?? []` — **2 of the 3 fail and the other 12 cases in
the file still pass** (`panel-revert.log`), so the guard fails on the defect, not
on a missing import.

**2 — one wording for the abstention.** `a89589a4`.
`VOICE_SEPARATION_NOT_MEASURED_VALUE` (`'not measured'`) and
`voiceSeparationLongValue()` join the badge-width pair in
`src/lib/voice-separation-copy.ts`; `server/lib/coverage-html.ts` calls it
instead of hand-typing the literal. Both surfaces are read at source level so
neither can type either literal again, and the rendered export is asserted to
print the module's word on the 231-scene fixture — with `voiceAnalysis.scored`
re-measured as `false` in the same case, so the copy cannot be asserted for a
state that no longer occurs. 2 of 15 fail on `4af8ae97`. The committed sample
report is unchanged: `'not measured'` was already the export's string, so this
moved a definition, not a document.

**3 — multiset, and a real tolerance.** Both in `e9a07911`.
`tests/core/export-roundtrip.test.ts:112` now tallies each distinct line and
reports `Nx "line"` shortfalls, so a lost duplicate — one of five identical
`MAYA` cues — fails where `expected.filter(l => !actual.includes(l))` could not
see it. The word gap: the tolerance was `< 1%` of the stripped word count,
**174 words** on the feature fixture, against a **measured gap of 0** (17,450
round-tripped vs 17,450 stripped — exact). It is now `<= 2`, with the two words
of margin stated as blank-line/punctuation slack for a future fixture rather
than as headroom.

**4 — the stale 473.** §4's honesty-audit row above now reads **474**, marked as
a round-2 correction with the reason (the table was written before this lane's
own docs commit added the brain note). Both runs exit 0.

**6 — finding 17's reach.** §3's finding-17 table row now names the **HTML**
export specifically and states that the letter carries no Voice Separation row,
as it carries no graph-health row — so findings 11 and 17 each reach one exported
document, not two. The report said this for finding 11 and left it ambiguous for
17.

## Gates — round 2, foreground, with exit codes

Base for every range below is the literal `eb8cf9b2` (see the note on the moved
client tip).

| gate | command | result |
|---|---|---|
| lint | `npx tsc --noEmit` | **0** |
| no-console | `node scripts/check-no-console.mjs` | **0** — 307 files, 24 quarantine entries |
| docs quality | `npm run check-docs` | **0** — "No AI writing patterns detected" |
| honesty audit | `node scripts/honesty-audit.mjs` | **0** — 465 files, 479 markdown, **115** claims rows, clean |
| brain graph | `node scripts/brain-graph.mjs --check` | **0** — 106 notes, 397 links, fresh |
| brain coverage | `tests/core/brain-coverage.test.ts` | **7 / 0** |
| claims row citations | `tests/core/claims-row-citations.test.ts` | **5 / 0** (the new base's uniqueness and 1..N cases) |
| scoring receipt | `node scripts/check-scoring-receipt.mjs eb8cf9b2..HEAD` | **0** — *"no scoring-path files changed"* |
| output identity | see below | **PASS — 45 / 45 byte-identical** |
| browser | `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run verify:surfaces` | see below |
| full suite | `npm test` | see below |

Touched suites, run individually on the final tree:

| suite | result |
|---|---|
| `export-roundtrip.test.ts` | **35 / 0** (was 19) |
| `coverage-letter.test.ts` | **52 / 0** (was 47) |
| `priority-selection-one-list.test.ts` | **14 / 0** (was 11) |
| `voice-separation-abstention.test.ts` | **15 / 0** (was 11) |
| `coverage-html.test.ts` | 54 / 0 |
| `fdx-import.test.ts` | 8 / 0 |
| `export-xml-wellformed.test.ts` | 11 / 0 |
| `fountain-title-block.test.ts` | 15 / 0 |
| `dimension-badge-export-parity.test.ts` | 8 / 0 |
| `report-cross-references.test.ts` | 12 / 0 |
| `reader-tier.test.ts` | 22 / 0 |
| `artifact-claims.test.ts` | 104 / 0 |
| `p0-sample-drift.test.ts` | 4 / 0 |
| `tests/routes/export-coverage.test.ts` | 13 / 0 |
| `tests/routes/export-coverage-letter.test.ts` | 23 / 0 |
| `tests/routes/export-fdx-docx-parity.test.ts` | 3 / 0 |
| `tests/routes/export.test.ts` | 3 / 0 |

**The browser suite needed a build first, and that is worth recording.** The
first `verify:surfaces` run bailed `FATAL — locator.waitFor: Timeout 15225ms`
waiting for the StartScreen's "Try sample coverage" button, after 76 passing
assertions. Not a flake and not this lane's code: the worktree's `dist/` was an
empty directory, so the keyless server served no page at all. `npm run build`
(exit 0) and the re-run passed **248/248**, peak 115 API requests in any 60 s
window against a 1,200 ceiling. Run with the documented override:
`PW_CHROMIUM_PATH=/opt/pw-browsers/chromium`.

| gate | result |
|---|---|
| build | `npm run build` — **0**, built in 3.99 s |
| browser | `PW_CHROMIUM_PATH=… npm run verify:surfaces` — **0**, **248 / 248** |
| full suite | `npm test` — **0** — **13,732 tests · 13,640 pass · 0 fail · 91 skipped · 1 todo** |

Output identity, against a FRESH `git archive eb8cf9b2` tree verified against the
blob (`sha256(idbase/server/nvm/analyze/doctor.ts)` == `sha256(git show
eb8cf9b2:…)` → `e8acebfff34ba5059844…`):

```
GIT_SHA=identity-baseline node scripts/check-doctor-output-identity.mjs --tree <session scratch>/r2/idbase --out id-before   exit 0 (45)
GIT_SHA=identity-baseline node scripts/check-doctor-output-identity.mjs --tree .                          --out id-after    exit 0 (45)
node scripts/check-doctor-output-identity.mjs --compare id-before id-after
  → OUTPUT IDENTITY: PASS — all 45 reports are byte-identical (analyzedAt excluded).                                        exit 0
```

`node scripts/check-scoring-receipt.mjs eb8cf9b2..HEAD` →
*"no scoring-path files changed. OK."* The scoring surface is untouched: the
only scoring-path file this round comes near is `src/lib/fountain.ts`, and it is
READ (the page-break shape is tested in `src/lib/fdx.ts` rather than given a
block type, with the reason at the site) and never written.

No model identifier appears anywhere in the round-2 diff
(`git diff eb8cf9b2..HEAD | grep -Ei 'claude-(opus|sonnet|haiku|fable)|gpt-[0-9]|gemini-[0-9]'`
→ empty outside the trailers), no source comment cites a claims-register row by
number, and both trailers are present on all 12 commits in the range.

## §5 — left undone, narrowed, or deliberately not done (round 2)

1. **The `!` force marker is not restored literally.** `!FORCED ACTION LINE IN
   CAPS` comes back as `FORCED ACTION LINE IN CAPS`, still an action line. The
   marker is restored only where Fountain would misread the line without it. The
   alternative — forcing every all-caps action paragraph — would prefix `!` to
   text the writer never forced; it happens to cost nothing on the committed
   corpus (0 all-caps action blocks across all 20 CC0 scripts and the feature
   fixture, measured) but a real third-party FDX is full of them
   ("SUPER: THREE YEARS EARLIER", "BLACK."), and this importer's job is reading
   those files. Disclosed as `'unforced'` rather than smoothed over.
2. **`@CUE` is not addressed.** The review's finding 18 note mentions `@McAVOY`
   returning with its speech broken. `src/lib/fountain.ts` does not implement
   Fountain's forced-cue `@` at all — its own header says so — so it is not a
   construct "the product's own Fountain parser supports", which is what the
   brief scoped item (a) to. Teaching every renderer the marker is a
   scoring-path change with its own measurement.
3. **A lyric is read back from a wholly italic paragraph.** On a third-party FDX
   an italicised action paragraph will import as a lyric. Stated at the site:
   Fountain renders lyrics italic, so the writer's rendering intent survives
   either way, and FDX has no lyric element to be more precise with.
4. **Option (i) for the letter was measured and rejected, not skipped.** The
   arithmetic is in blocking item 2 above. If the orchestrator wants the
   structural change anyway — short body, complete list below — it is a separate
   change that does not turn on the length promise, and the promise is now true
   either way.
5. **`verify:surfaces` still has no assertion over the three new export
   surfaces** (round-1 §5.7 stands). The round-2 work adds no new browser
   surface: every change this round is to a renderer, an importer, a copy module
   or a test.
6. **Three brain notes on the new base cite register rows the client lane's
   renumbering moved.** `docs/brain/Surfaces/Surface - Script Doctor Panel.md`
   lines 168, 183 and 227 cite rows 96–99 for claims that are now rows 102–105;
   `Surface - Producer Tier.md:120` cites 94–99. Those are the client lane's
   rows and the client lane's notes — not touched here, and invisible to
   `claims-row-citations.test.ts`, whose last case resolves only the two pointers
   it names by content. Flagged for the orchestrator.
7. **The register's own internal pointers are not gated.** Row 114's "(row 91)"
   was wrong from round 1 and is corrected here to row 87 — by reading, not by a
   test. Extending `claims-row-citations.test.ts` to resolve register-internal
   `(row N)` references by content is the stronger version; it is that lane's
   file and this round did not touch it.

## Tip and origin (Round 2)

```
git rev-parse HEAD
a89589a47b29eab43114d405509227a1ef0e1d00

git ls-remote origin lane/exports-truth
a89589a47b29eab43114d405509227a1ef0e1d00	refs/heads/lane/exports-truth

git status --short
(empty)
```

Origin == local tip. Twelve commits over `eb8cf9b2`, the eight of round 1 plus:

```
a89589a4 fix(exports): one wording for the abstention, owned by the copy module
36f6cb53 test(exports): the fourth surface is pinned, so the revert that broke it fails
306eb8bd fix(exports): the letter's length is a measurement, not a promise it broke
e9a07911 fix(exports): the FDX round trip is true in both directions, and its test can see both
```

47 files, +3,826 / −162 over `eb8cf9b2`; round 2 alone is 19 files, +863 / −59.
Every commit pushed as it was made; the only force push was the rebase in Step 0.
