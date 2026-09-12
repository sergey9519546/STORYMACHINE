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
| exported coverage report | the channel is absent entirely | `Voice Separation · 6/6 Pairs` + the reading instruction, or `not measured` + the reason |

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
| honesty audit | `node scripts/honesty-audit.mjs` | **0** — 465 files, 473 markdown, 114 claims rows, clean |
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
