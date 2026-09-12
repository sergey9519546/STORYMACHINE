# Independent review — `lane/exports-truth` round 1 (**4af8ae97**)

Reviewed object: `4af8ae975fd76a81a083da8b4e21ee7586bf056e` (branch
`lane/exports-truth`, worktree `/home/user/wt-exports2`, 8 commits over base
`312f4f3470913f31faf429764658ac9e0ec83182`; `git diff 312f4f34 4af8ae97` =
41 files, +2999 / −138). The reviewer did not build the change and did not
write to the worktree or to any tracked file except this review.

Method. The tip was exercised in place in `/home/user/wt-exports2`; the
baseline is a `git archive 312f4f34 | tar -x` export under
`<session scratch>/base2` with `node_modules` symlinked. Genuine artifacts
were produced by booting the real keyless Express app in-process
(`server/app.ts`'s `createApp`, `serveStatic:false`) and POSTing
`/api/export/coverage` and `/api/export/coverage-letter` — never by calling
the renderers directly. Round-trip numbers come from the real writers and
readers (`src/lib/fdx.ts`, `server/lib/fdx-import.ts`, `src/lib/pdf.ts`,
`server/lib/pdf-import.ts`) with real `runScriptDoctor` runs on both sides.

**A method warning for the batch.** The first baseline extraction of this
review landed in a `base/` directory that the shared session scratch already
contained (files stamped 05:46, i.e. an earlier commit's `git archive`), and
the extraction did not replace them — 57 files differed from `312f4f34`,
including `coverage-html.ts`, `coverage-letter.ts`, `reader-tier.ts`,
`percentile-copy.ts`, `ScriptDoctorPanel.tsx` and all three letter goldens.
Every baseline measurement in this review was re-run from scratch in a fresh
`base2/` after that was caught (`sha256sum` against
`git show 312f4f34:<path>`), and only the re-run numbers are reported below.
Any other reviewer in this batch reusing `<session scratch>/base` should
verify it against the blob before trusting it.

Fixtures throughout: `data/screenplays/runoff.fountain` (9 scenes, 1,448
words, health 74.6, CONSIDER, `contentHash cb1c8707…`),
`data/screenplays/chain-of-custody.fountain` (13 scenes, 824 words, health
76.3, `96f52997…`) and
`tests/fixtures/feature-length/assembled-feature.fountain` (231 scenes,
19,293 words, health 84.4, `6c27c869…`).

## Round 1

### Brief vs diff

| # | Brief item (writer-loop finding) | In the diff | Verdict |
|---|---|---|---|
| 8 | two contradictory "three things to fix first" lists in one letter | `server/lib/priority-selection.ts` (new), wired into `reader-tier.ts`, `coverage-html.ts`, `coverage-letter.ts`, `ScriptDoctorPanel.tsx`; letter's `ANCHORED_LOCATION_RE` deleted | **done and widened** — four surfaces, not two; widening is stated in the report. One consequence unexamined (blocking 2), one surface untested (non-blocking 1) |
| 11 | Graph Health's −9 hp rendered as applied | `UNAPPLIED_DEDUCTION_LABEL` / `unappliedDeductionReading` in `src/lib/diagnostic-copy.ts`, rendered by the export and the panel; section badge in the export's `<h2>` | **done** — verified in driven exports: no signed figure, no "hp", magnitude still printed |
| 16 | cross-reference to a heading the report no longer renders | `server/lib/report-sections.ts` (new), `.xref` spans, one priorities count computed once and handed to all three sections | **done** — `grep -c "Top Priorities"` 1 → 0, every `.xref` resolves, on three real exports |
| 18 | export → re-import loses content silently — measure and disclose | `fdx-import.ts` title page + transition terminator, draft date through the whole export model, `src/lib/export-roundtrip.ts` (new) + Ship panel | **measurement: done and exactly reproducible. Disclosure: OVERCLAIMS (blocking 1)** |
| 4/14 | export-side dimension badges through the client lane's shared clamped-badge function, no second formatter | `coverage-html.ts` + `coverage-letter.ts` call `dimensionPercentileBadgeFor` / `…TooltipFor` / `…CaptionFor`; source-level "no second formatter" cases over all three surfaces | **done** — the strongest item in the lane |
| 17 | when the voice channel abstains, say why | `src/lib/voice-separation-copy.ts` (new), `CoverageSummary.tsx` tile, new export row in both states | **done, narrowed and reported as narrowed** (the reason names both conditions rather than the branch; the branch is scoring-path) |

Nothing in the diff is a silent change: every file outside the six items is
docs, brain, goldens or tests, and each golden byte is accounted for (below).
No model identifier appears anywhere in the diff
(`git diff 312f4f34 4af8ae97 | grep -Ei 'claude-(opus|sonnet|haiku|fable)|gpt-[0-9]|gemini-[0-9]'`
is empty). Both trailers are present on all 8 commits.

### Reproductions — driven, with commands

All export artifacts came from the live keyless server
(`<session scratch>/drive.mjs`, `createApp` + `fetch`):

```
POST /api/export/coverage        runoff 200 (196,463 B) · chain-of-custody 200 (229,828 B) · assembled-feature 200 (897,177 B)
POST /api/export/coverage-letter runoff 200 (md 11,666 B, hash cb1c8707ce9e) · chain-of-custody 200 (96f529970a75) · assembled-feature 200 (6c27c8693c40)
```

**Finding 8 — "one priorities list, four surfaces": reproduced, on three
scripts.** On `runoff` the lane's own before/after table is exact — page one
is `CRITICAL — Conflict layer` / `MAJOR — Scene 5 (midpoint) — p. 3` /
`MAJOR — Overall structure`, and the body's list now begins with those same
three under `The 10 things to fix first`. Machine-checked across the rendered
documents (`<session scratch>` python extractor over the driven artifacts):

| script | tier heading | body heading | tier == first 3 of body | letter body == coverage-HTML list |
|---|---|---|---|---|
| runoff | The 3 things to fix first | The 10 things to fix first | **yes** | **yes** (10 of 10, item for item) |
| chain-of-custody | The 3 things to fix first | The 10 things to fix first | **yes** | **yes** |
| assembled-feature | The 3 things to fix first | The 10 things to fix first | **yes** | **yes** |

The HTML reader tier, the letter's tier, the letter's body and the HTML's
priorities section are four renderings that now agree. The FOURTH *surface*
in the lane's table — the in-app panel — could not be driven here and is not
pinned by any test (non-blocking 1).

**Finding 16 — reproduced.** `grep -c "Top Priorities"` is **0** in all three
driven coverage reports (the lane measured 1 → 0 on `runoff`). Every
`<span class="xref">` in all three documents names a heading that same
document rendered (`The 10 things to fix first`, `Full Pass Appendix`), and
the letter's caveat now names `Structural Signals (new, unwired diagnostics)`
— the heading the HTML actually prints.

**Finding 11 / 17 — reproduced in the documents a producer receives:**

```
assembled-feature  Structural Analysis <span class="diagnostic-badge">Diagnostic — not part of Health
                   Would deduct if enabled → "up to 10 pts — not applied"      (no minus sign anywhere)
                   Voice Separation → "not measured" + "Not measured: this reading needs at least two characters…"
chain-of-custody   Would deduct if enabled → "up to 12 pts — not applied" · Voice Separation → "6/6 Pairs"
runoff             Would deduct if enabled → "up to 6 pts — not applied"  · Voice Separation → "10/10 Pairs"
```

The section badge is accurate: nothing in that section feeds health —
`graphHealth`, `voiceAnalysis`, `disclosureAnalysis` and `subplots` are
attached to the report (`doctor.ts:2292, 2328, 2334`) and consumed only by
display/generation code, never by the health computation.

**Finding 18 — every number in the lane's table reproduced exactly**
(`<session scratch>/rt.mjs`, real doctor runs both sides):

| input | format | health | words | issues | scenes |
|---|---|---|---|---|---|
| assembled-feature | original | 84.4 | 19,293 | 899 | 231 |
| | FDX, **baseline 312f4f34** | 84.8 | **17,442** | 887 | 231 |
| | FDX, **tip** | 84.8 | **17,450** | 885 | 231 |
| | PDF text, tip | 84.8 | 17,447 | 857 | 231 |
| runoff | original / FDX / PDF | 74.6 / 74.5 / 74.8 | 1,448 / 1,424 / 1,424 | 142 / 147 / 126 | 9 |
| chain-of-custody | original | 76.3 (**strong**) | 824 | 178 | 13 |
| | FDX | 75.4 | 772 | 176 | 13 |
| | PDF text | **73.6 (solid)** | 772 | 187 | 13 |

The requested number — **76.3 → 73.6 with the grade moving strong → solid on
the `chain-of-custody` PDF round trip** — reproduces. So does the bug half:
on the baseline tree `FADE OUT.:` is present and **0 of 6** `FADE OUT.`
transitions survive on the feature fixture; on the tip **6 of 6** survive and
`FADE OUT.:` appears nowhere. Baseline non-boneyard line loss on the feature
was 10 lines (4 title-page + 6 mangled transitions); on the tip it is **0**
for all three scripts.

**Cross-lane: the verify lane's CLI still verifies tip artifacts.** Not asked
for, and the lane's touched-suite list omits it, but this lane rewrote the
documents that CLI scrapes:

```
node --experimental-strip-types scripts/verify-report.mjs <artifact> data/screenplays/<script>.fountain
  runoff.coverage.html · runoff.letter.md · chain-of-custody.coverage.html · chain-of-custody.letter.md
  → VERIFIED — authentic and reproducible under this engine.   exit 0 (all four)
  → prioritiesListed: yes (report 3, local 3) — the new "The 10 things…" body heading does not confuse the tier claim
node --experimental-strip-types tests/scripts/verify-report.test.ts   → 155 pass / 0 fail
```

### Gates run by the reviewer, in the foreground

```
node scripts/honesty-audit.mjs
  → scanned 465 files, plus 474 tracked markdown files …, plus the claims register (114 rows) — clean.   exit 0
node scripts/check-scoring-receipt.mjs 312f4f34..HEAD
  → check-scoring-receipt: range "312f4f34..HEAD" — no scoring-path files changed. OK.                   exit 0
GIT_SHA=identity-baseline node scripts/check-doctor-output-identity.mjs --tree <session scratch>/base2 --out id-before2   exit 0 (45 snapshots)
GIT_SHA=identity-baseline node scripts/check-doctor-output-identity.mjs --tree .                        --out id-after    exit 0 (45 snapshots)
node scripts/check-doctor-output-identity.mjs --compare id-before2 id-after
  → OUTPUT IDENTITY: PASS — all 45 reports are byte-identical (analyzedAt excluded).                     exit 0 (no --ignore-keys)
```

The lane's §5.6 claim is independently confirmed: on the true baseline
`node scripts/honesty-audit.mjs` **exits 1** with exactly three
`claims-register-line-anchor-mismatch` hits — row 3 (`StartScreen.tsx:344`,
anchor at 361), row 5 (`:477`, anchor at 494), row 9
(`ScriptDoctorPanel.tsx:4993`, anchor at 5025) — and the lane's repaired
`5047` is 5025 plus the 22 lines its own panel edits add.

Touched suites, run individually on the tip — every count matches the lane
report exactly:

```
priority-selection-one-list 11/0 · unapplied-deduction-honesty 9/0 · report-cross-references 12/0
dimension-badge-export-parity 8/0 · voice-separation-abstention 11/0 · export-roundtrip 19/0
coverage-html 54/0 · coverage-letter 47/0 · reader-tier 22/0 · artifact-claims 104/0
percentile-comparability 23/0 · percentile-copy-consistency 30/0 · diagnostic-not-health-label 8/0
dimension-percentile-badge 11/0 · dimension-badge-wiring 3/0 · fdx-import 8/0
fountain-title-block 15/0 · p0-sample-drift 4/0
routes/export-coverage 13/0 · routes/export-coverage-letter 23/0
```

`npm run verify:surfaces` was NOT re-run (cost rule; the orchestrator runs the
battery). The lane reports 248/248 with one recorded flake. Nothing in this
review depends on it, and the three new surfaces it would cover have no
assertions in it either way (lane §5.7, confirmed:
`grep -c "data-export-roundtrip\|data-unapplied-deduction" scripts/verify-p2-p3-surfaces.mjs`
→ 0).

### The shortcut hunt

**Fail-first — three of the eight commits, re-checked on a clean
`git archive 312f4f34` export with the new module copied in.** All three claims
hold exactly:

| suite | lane's claim | measured on `312f4f34` | on the tip |
|---|---|---|---|
| `priority-selection-one-list` | 6 of 11 fail | **5 pass / 6 fail** | 11/0 |
| `report-cross-references` | 6 of 12 fail | **6 pass / 6 fail** | 12/0 |
| `export-roundtrip` | 9 of 19 fail | **10 pass / 9 fail** | 19/0 |

The failures are the right ones (e.g. *"the markdown letter points at
'Structural Signals', which the exported HTML does not head"*, *"the title
page did not survive the round trip"*, *"every transition comes back as
written"*), not load errors.

**Golden re-locks — every changed byte is explained by the six fixes.**
Checked line by line:

* `report{1,2,3}.expected.md` — a new `## Craft Dimensions` section (five
  `label — score/100 — not comparable` bullets + the gated caption); the
  priorities heading `The 3` → `The 10` with the three original entries still
  present at ranks 1, 3 and 4; and (report3) the `Structural Signals (new,
  unwired diagnostics)` title. Nothing else moved — no score, no verdict, no
  summary prose.
* `tests/fixtures/coverage-html/no-percentile-no-draftrank.html` — **CSS
  only** (42 added lines: `.diagnostic-badge`, `.diagnostic-note`, `.xref`,
  `.dim-pct`, `.dim-pct-caption`). That fixture's report carries no
  `graphHealth`, no `voiceAnalysis` and no dimension percentiles, so no markup
  could change, and none did.
* `docs/user-validation/sample-coverage-report.html` — the same CSS, the five
  dimension badges + caption, the Structural Analysis badge, the two rewritten
  graph rows + diagnostic sentence, the Voice Separation row, and the two
  `.xref` spans. Everything else in the diff is the three fields
  `p0-sample-drift.test.ts` already masks (engine commit, generated
  timestamp). The document's own priorities heading (`The 9 things to fix
  first`) is unchanged, which is the right outcome: the HTML already rendered
  the whole suppressed list, so finding 8 moved the letter only.

No re-lock hides a regression. The one loosened number
(`percentile-comparability` prose count 2 → 3) is loosened by ADDING a
per-section assertion, exactly as the report says — a section stating the
bounds twice still fails.

**Copy that overclaims — found, in the new round-trip disclosure.** See
blocking item 1. This is the one place where the lane asserts more than it
measured, and the test it cites cannot detect the difference.

**A promise the lane's own change falsified — the letter's length.** See
blocking item 2.

### §5's eight "left undone" items, judged

1. raw JSON still carries `graphHealth.graphDeduction` — **honest.** Renaming
   it is a scoring-path edit and would break the 45/45 identity; the lane
   guards instead that nothing reads it as health, and that guard is real
   (`unapplied-deduction-honesty.test.ts:144-159`).
2. finding 17's specificity — **honest.** `voice-delta.ts` genuinely records
   neither branch, and `report.characters` genuinely counts appearances, not
   speakers.
3. finding 4's real cause (`rawScore` ranked, clamped score shown) — **honest
   and out of scope** (scoring).
4. the "No percentile badges:" caption — **honest**, and correctly escalated
   rather than silently reworded. One reviewer note below.
5. duplicate register rows 94–99 — **honest**; confirmed
   (`grep -oE "^\| [0-9]+ \|" docs/CLAIMS_REGISTER.md | … | uniq -d` → 94 95
   96 97 98 99; 114 rows total).
6. three stale anchors repaired — **honest and verified** (gate output above).
7. no `verify:surfaces` assertion over the three new surfaces — **honest**;
   in scope for a stronger version, cheap, not required by the brief.
8. the PDF round trip is disclosed, not repaired — **honest**; 73.6 vs 76.3
   reproduced, and repairing it is a real piece of work with its own
   measurement.

None of the eight is a dodge. The one item missing from that list is the
letter's length (blocking 2).

### What a stronger version would have done

* **Exercised one fixture that uses more of Fountain than the three committed
  scripts do.** All three round-trip cases contain only boneyard comments —
  zero section headings, zero synopses, zero inline notes, zero dual dialogue,
  zero centered text, zero lyrics, zero page breaks
  (`grep -cE '^#{1,6} |^= |\[\[|\^$|^~|^===' ` on each is 0). A single
  hand-built fixture carrying the constructs the product's own parser supports
  (`src/lib/fountain.ts` types `dual_dialogue`, `centered`, `lyrics`) would
  have turned the disclosure from a sentence into the claim the lane wanted.
  **In scope** — it is the difference between "measured and disclosed" and
  "disclosed".
* **Pinned the fourth surface.** The badge half of findings 4/14 checks the
  panel at source level; the priorities half does not check it at all. Two
  lines in `priority-selection-one-list.test.ts`, same pattern as the file
  beside it. **In scope.**
* **Compared the round trip by multiset, not by set membership** (see
  non-blocking 3). **In scope, one line.**
* Three `verify:surfaces` phases over `data-export-roundtrip`,
  `data-unapplied-deduction` and the export's Voice Separation row. **Not in
  scope** — the brief did not ask, and the lane names the gap.

### Orchestrator notes

* **Duplicate rows 94–99**: confirmed present and invisible to the gates (the
  claims lane checks anchors, not numbering). This lane's own rows are 101–108
  and collide with nothing; renumbering at merge is the right call, and
  nothing in this lane needs to change for it.
* **"No percentile badges:"**: the lane is right to leave the wording to its
  owner, but note that after this merge the sentence ships in **three**
  documents instead of one, and in the letter it sits directly above five
  bullets each ending "— not comparable", where the contradiction is at its
  most visible. That raises, not lowers, the value of the client lane's
  one-line reword (and the cost of deferring it).

## VERDICT: **REVISE**

The engineering here is strong and I could not break the parts the lane is
actually about: the four priorities renderings agree on three real scripts,
every cross-reference resolves, the unapplied deduction is unsigned and
conditional in both the export and the panel, the dimension badges come from
the shared gated helpers with no second formatter, the abstention reason is
honest about which branch it can and cannot name, and the three fail-first
claims I re-ran are exact. The scoring surface is untouched — 45/45
byte-identical against the true baseline, and no scoring-path file in the
range. Two items below are copy: this lane exists to stop documents from
saying untrue things, and it ships two sentences that are not true.

1. **The FDX round-trip disclosure is false in both directions, and the test
   it cites cannot see either.** `src/lib/export-roundtrip.ts:56-60` ships,
   in the Final Draft button's hover title and in claims-register row 105 as
   `measured-in-repo / supported`:

   > "Comes back whole, except Fountain comments, notes, synopses and section
   > headings: Final Draft has no equivalent for text that is never printed,
   > so they are not carried. Everything that prints — title page, scene
   > headings, action, dialogue, transitions — survives the round trip."

   *(a) Three of the four named non-printing constructs ARE carried — as
   printed text.* Measured on a real script
   (`<session scratch>/probe4.mjs`: `chain-of-custody` with one `# ACT ONE`
   and one `= Maya finds the log.` added, which is how a writer outlines):

   ```
   marked original :  scenes=13 words=832 health=76.2
   after FDX round :  scenes=13 words=778 health=75.0
   section survives as action?   true      ("ACT ONE" is now an action line)
   synopsis survives as action?  true      ("Maya finds the log." is now an action line)
   ```

   `src/lib/fdx.ts:31-32` maps `section` and `synopsis` to `Action`, and an
   inline note survives verbatim inside the action text it sits in
   (`"MAYA pours coffee. [[check this]]"` comes back unchanged). So
   non-printing text is PROMOTED to printing text — the opposite of "not
   carried", and a bigger change to the returned report than dropping it
   would have been.

   *(b) Five printing constructs the product's own parser supports do NOT
   survive.* `<session scratch>/probe.mjs`, one round trip through
   `fountainToFdx` → `fdxToFountain`:

   | written | comes back as | what is lost |
   |---|---|---|
   | `MAYA ^` | `MAYA` | dual dialogue — and `fdx.ts:81-93` **does** write the `<DualDialogue>` element, so this loss is in `fdx-import.ts`, the file this lane edited |
   | `> THE END <` | `THE END` | centering, and the line is now an all-caps action line |
   | `~Somewhere a radio plays` | `Somewhere a radio plays` | lyric formatting |
   | `!FORCED ACTION LINE IN CAPS` | `FORCED ACTION LINE IN CAPS` | the force that stopped caps text parsing as a character cue |
   | `===` | `==` | a page break becomes a synopsis marker |

   plus `@McAVOY` returning with a blank line inserted before its dialogue, so
   the speech becomes action.

   *(c) The gate cannot catch any of it.* All three
   `tests/core/export-roundtrip.test.ts` cases contain only boneyard
   comments, and `withoutNonPrinting` strips all four constructs from the
   EXPECTED side — so a construct that survives is invisible, and three of
   the four "not carried" claims are never exercised at all. Row 105's
   evidence citation (`…test.ts:94 "the loss is EXACTLY the non-printing"`)
   therefore supports a narrower statement than the row makes.

   Fix (cheapest correct version): say what was measured. Name boneyard as
   the construct that is dropped; say that notes, synopses and section
   headings come back as ordinary action text; and add the printing
   constructs above to the sentence, or stop saying "everything that prints".
   Then add ONE fixture carrying them so the claim has a gate under it, and
   update `EXPORT_ROUNDTRIP_SUMMARY` (row 107, same overclaim: "without
   losing anything that prints") and
   `docs/brain/Surfaces/Surface - Export Round Trip.md:69-80`, which repeats
   it. Repairing the importer is NOT required — the lane's own split between
   "bug, fixed" and "format limit, disclosed" is the right one; the disclosure
   just has to match the measurement.

2. **The letter is no longer "one-to-two-page", and four places still promise
   it is.** Finding 8 was a disagreement between two lists; the lane fixed it
   by making the body render the WHOLE list (3 → 10 entries here) and findings
   4/14 added a five-line Craft Dimensions section. Measured, same renderer,
   same scripts, base vs tip (`<session scratch>/len.mjs`, plain-text letter):

   | script | `312f4f34` | `4af8ae97` |
   |---|---|---|
   | runoff | 1,207 words (~2.4 pp) | **1,929 words (~3.9 pp)** |
   | chain-of-custody | 1,122 words (~2.2 pp) | **1,900 words (~3.8 pp)** |

   `src/components/scriptide/ScriptDoctorPanel.tsx:4485` tells the writer, in
   the button's own title, *"Download a one-to-two-page coverage letter"*, and
   `server/lib/coverage-letter.ts:1`, `:768` and
   `server/routes/coverage-letter.ts:1` all describe it the same way. It was
   already marginal at the branch point and this lane roughly doubles it.
   Either reword the four sentences to what the document now is, or bound the
   body list — but the lane report's §5 should not have been silent about it,
   since making the body list unbounded is this lane's own decision.

### Non-blocking

1. **The fourth surface has no test.** The lane's headline is "one list, four
   surfaces", and `ScriptDoctorPanel.tsx`'s `panelPriorities` is pinned by
   nothing: `grep -rn "orderedPriorities\|panelPriorities" tests/` matches
   only the two new test files, neither of which reads the panel source.
   Reverting `panelPriorities` to `report.topPriorities` leaves every suite
   green. The badge half of findings 4/14 pins the same file at source level
   three times (`dimension-badge-export-parity.test.ts:211-245`), so this is
   an inconsistency inside the lane's own practice, not an unknown technique.
2. **A second wording for one state.** `server/lib/coverage-html.ts:1545`
   hand-types `'not measured'` for the abstention while
   `src/lib/voice-separation-copy.ts` exports
   `VOICE_SEPARATION_ABSTAINED_VALUE` (`'N/A'`) and
   `voiceSeparationShortValue`, which the panel uses — so the two surfaces
   state the same fact in two words from two places, in a lane whose brief
   item 4/14 is "no second formatter". Both are truthful and the export's
   wording is the better one; make it the module's, or export a second
   constant.
3. **The round-trip comparison is a set test, and the word-gap tolerance is
   wide.** `tests/core/export-roundtrip.test.ts:100` is
   `expected.filter(l => !actual.includes(l))` over an ARRAY of lines, so a
   lost duplicate line (one of five identical `MAYA` cues, a repeated action
   beat) and any reordering are invisible; a multiset comparison is one line.
   `:210` allows a 1% word gap — ~174 words on the feature fixture — against
   a measured gap of single digits.
4. **One stale number in the report's gate table.** `honesty-audit` on the tip
   reports **474** tracked markdown files; the table says 473 (correct before
   the lane's own docs commit added the new brain note). Both exit 0.
5. **`verify:surfaces` was not re-run by this review** (cost rule). The lane's
   248/248 and its recorded flake are taken as reported; no finding here
   depends on the browser.
6. The exported letter carries no graph-health row and no Voice Separation
   row, so findings 11 and 17 reach one exported document rather than two.
   The lane states this for 11 (§1 correction 2) and asserts it as a test; for
   17 the §3 table's "exported coverage report" row could be read as covering
   both. Worth one clarifying word in the report, not a change to the code.

## Round 2 — re-check of `a89589a4`

Reviewed object: `a89589a47b29eab43114d405509227a1ef0e1d00`, twelve commits over
`eb8cf9b291ad85b362993188457a658096ffe2d1` (the round-1 eight, replayed by the
rebase, plus `e9a07911`, `306eb8bd`, `36f6cb53`, `a89589a4`; round 2 alone is
19 files, +863 / −59). Same reviewer, warm context, same rules: foreground,
nothing killed by pattern, no full `npm test`, no write to the worktree.

Both baselines for this round are FRESH exports in a new scratch directory
(`<session scratch>/r2rev/base-eb` = `eb8cf9b2`, `…/base-4af` = `4af8ae97`),
each verified file-by-file against the blob before anything was measured in it
— `sha256(base-eb/server/lib/fdx-import.ts)` = `88a7d7730c993cf5…`,
`base-4af/…` = `9e4411f100a6a9ca…` (the lane's own cited hash),
`doctor.ts` = `e8acebfff34ba505…` on both. The round-1 warning about a stale
`base/` is not repeated here.

### Blocking item 1 — the FDX round trip: **closed**

I re-ran my own round-1 probes unchanged against the tip, plus three new ones.

**The five printing constructs** (`<session scratch>/probe.mjs`, one round trip
through the real `fountainToFdx` → `fdxToFountain`):

| written | round 1 (`4af8ae97`) | round 2 tip |
|---|---|---|
| `MAYA ^` | `MAYA` | **`MAYA ^`** |
| `> THE END <` | `THE END` | **`> THE END <`** |
| `~Somewhere a radio plays` | `Somewhere a radio plays` | **`~Somewhere a radio plays`** |
| `===` | `==` | **`===`** |
| `!FORCED ACTION LINE IN CAPS` | bare caps | bare caps — the one disclosed `'unforced'` case |

The forced-marker rule is the interesting one, so I attacked it rather than
reading it (`<session scratch>/r2rev/force.mjs`, block types via the product's
own `parseFountain`): `!INT. THE MIND OF A KILLER` and `!CUT TO:` both come
back **with the `!` and as `action`**; `!SUPER: THREE YEARS EARLIER` followed
immediately by a line of prose — the case where dropping the marker could
create a character cue — comes back as **two `action` blocks, not a cue**,
because the importer separates paragraphs with a blank line, and an unforced
all-caps line behaves identically. So `'unforced'` is a marker that is dropped
where it has nothing to do, not a construct that is corrupted.

**The three wrongly-carried non-printing constructs**
(`<session scratch>/probe3.mjs` and `probe4.mjs`, re-run unchanged):

```
probe3, tip:  the FDX body is Scene Heading + Action("MAYA pours coffee.") + <DualDialogue>
              — "# ACT ONE", "= Maya finally says it." and "[[check this]]" are gone,
              and the action line keeps its prose.
probe4, tip:  chain-of-custody + one "# ACT ONE" + one "= Maya finds the log."
              round 1:  772 → 778 words, health 75.4 → 75.0, both markers printed as action
              round 2:  772 words, health 75.4 — section survives as action? false · synopsis? false
```

The markers now cost the returned report nothing at all. I also checked the
stronger form of the claim — that the words are absent from the FDX **file**,
not just from the way back: on the new `every-construct.fountain` fixture,
`ACT ONE`, `Maya finds the log` and `check this line` are all `false` in the
exported FDX string, and the exporter emits only `Scene Heading, Action,
Character, Parenthetical, Dialogue, Transition` plus the four title-page types,
with `Style="Italic"`, `Alignment="Center"` and `StartsNewPage="Yes"` as the
only added attributes — Final Draft's own vocabulary, nothing invented.

**Omission precision** — the risk a new "leave it out" rule creates is that it
eats text that merely looks non-printing. It does not
(`<session scratch>/r2rev/omit.mjs`): `The sign reads = OUT OF ORDER.`,
`He was #1 on the list.` and `Room #4, = the one with the door.` all survive
verbatim, in the right block types.

**"Byte-identical on all 21 committed screenplays" — verified, with one
clarification the lane should make.** `sha256` of `fountainToFdx` output per
script, 20 CC0 + the feature fixture:

```
tip vs 4af8ae97 (round-1 tip)  → diff exit 0, 21/21 identical
tip vs eb8cf9b2 (pre-lane)     → 20/21 identical; assembled-feature differs by exactly one line:
                                 +  <Paragraph Type="Draft Date"><Text>2026-09-06</Text></Paragraph>
```

The claim is true for the comparison that matters to round 2 (the exporter
rewrite is byte-neutral), and the single pre-lane difference is round 1's own
intended draft-date fix on the only committed script carrying a `Draft date:`
line. Worth one word in the report so a reader does not check it against the
wrong base.

**The disclosure now matches the measurement, row by row.** All nine
`FDX_CONSTRUCT_FATE` rows reproduce on my probes; `EXPORT_ROUNDTRIP_NOTE.fdx`
and `EXPORT_ROUNDTRIP_SUMMARY` say "left out rather than carried" (true) and
list the four surviving constructs by name (true). Register rows **111** and
**113** carry the corrected sentences and cite the per-construct assertions.
The claim I falsified in round 1 no longer exists in the tree.

### Blocking item 2 — the letter's promise: **closed**, and the arithmetic holds

Measured independently, same method as round 1 (plain-text letter, words / 500):

| | pre-lane `eb8cf9b2` | tip `a89589a4` |
|---|---|---|
| runoff | 1,017 w — 2.03 pp | 1,739 w — 3.48 pp |
| chain-of-custody | 928 w — 1.86 pp | 1,706 w — 3.41 pp |
| the-detour | 925 w — 1.85 pp | 1,625 w — 3.25 pp |
| assembled-feature | 1,223 w — 2.45 pp | 1,789 w — 3.58 pp |
| **all 21 committed scripts** | 1.80 – 2.45 pp | **3.25 – 3.58 pp** |

Every figure in the lane's table reproduces to the word. **"(i) impossible" is
true as stated**, and I re-derived it rather than taking it: rendering the same
reports with `topPriorities: []` gives **891 w (1.78 pp)** for runoff and
**797 w (1.59 pp)** for chain-of-custody — and those are without the Root
Causes section, which adds ~190 words more, so the non-priorities content alone
is ~2.0–2.2 pp. No bound on the body can reach "one-to-two-page"; the only
route there is deleting a merged section, which the standing directive forbids.
The option-(i) comparison also holds: a three-item body plus a compact tail
saves a few dozen words against the full list, not a page. **(ii) is the right
call and the promise is now true.** All nine sites say three-to-four-page,
including the one a writer reads (`ScriptDoctorPanel.tsx:4485`), and the gate
in `coverage-letter.test.ts` fails if either half drifts.

One correction the lane should make, which is why non-blocking 1 below exists:
**the stated range is measured on a report shape no route ever renders.** Both
`lenall.mjs` and the new gate build the report from `runScriptDoctor` alone,
with no `rootCauses`; `server/routes/coverage-letter.ts:148` and the panel both
attach `buildRootCausePipeline` output, and that section is worth ~0.35 pp. As
the product actually ships it:

```
21 scripts, rootCauses attached: min 3.53 pp (the-detour) · max 3.96 pp (counter-offer) · 0 at or over 4.0
counter-offer: lane's harness 1,791 w (3.58 pp) · as the route ships it 1,979 w (3.96 pp)
```

The promise still holds — 3.96 < 4 — but with about 20 words of margin on the
longest letter, and the gate's own window (`pp >= 3 && pp < 5`) is 1.4 pp wider
than the sentence it protects.

### The other four items — all closed

* **N1, the fourth surface.** Re-run on a fresh `git archive 4af8ae97` export:
  unreverted **14 / 0**; with the exact revert the round-1 review named
  (`() => orderedPriorities(report?.topPriorities)` → `() => report?.topPriorities ?? []`)
  **12 pass / 2 fail**, naming the panel by the defect. The pins are read with
  comments stripped and the second one matches *any* raw read outside the one
  shared call rather than a fixed string, so it is a property, not a grep.
* **N2, one wording.** `VOICE_SEPARATION_NOT_MEASURED_VALUE` +
  `voiceSeparationLongValue()` in the copy module; `coverage-html.ts` no longer
  types the literal.
* **N3, multiset and tolerance.** `export-roundtrip.test.ts:112` tallies each
  distinct line (a lost duplicate is now visible); the word gap is `<= 2`
  against a measured 0, replacing the 1% / 174-word window.
* **N4 / N6**, the stale 473 and finding 17's reach: corrected in the report.

### Gates, re-run by the reviewer

```
node scripts/honesty-audit.mjs
  → scanned 465 files, plus 479 tracked markdown files …, plus the claims register (115 rows) — clean.   exit 0
node scripts/check-scoring-receipt.mjs eb8cf9b2..HEAD
  → range "eb8cf9b2..HEAD" — no scoring-path files changed. OK.                                          exit 0
GIT_SHA=identity-baseline node scripts/check-doctor-output-identity.mjs --tree <session scratch>/r2rev/base-eb --out id-before   exit 0 (45)
GIT_SHA=identity-baseline node scripts/check-doctor-output-identity.mjs --tree .                              --out id-after     exit 0 (45)
node scripts/check-doctor-output-identity.mjs --compare id-before id-after
  → OUTPUT IDENTITY: PASS — all 45 reports are byte-identical (analyzedAt excluded).                     exit 0 (no --ignore-keys)
```

Touched suites on the tip, each run individually — every count matches the
lane's round-2 table:

```
export-roundtrip 35/0 · coverage-letter 52/0 · priority-selection-one-list 14/0
voice-separation-abstention 15/0 · fdx-import 8/0 · export-xml-wellformed 11/0
coverage-html 54/0 · report-cross-references 12/0 · dimension-badge-export-parity 8/0
```

Fail-first, re-run on the fresh blob-verified `git archive 4af8ae97` export
(three of the four claims, two required):

| suite | lane's claim | measured |
|---|---|---|
| `export-roundtrip` | 14 of 35 fail | **21 pass / 14 fail**, and they are the right fourteen (every construct row except `boneyard: dropped`, the scene-count case, the FDX-vocabulary case, the verbatim golden, idempotence) |
| `coverage-letter` | 2 of the new cases fail | **50 pass / 2 fail** — the two copy cases; the three page-count cases pass there, exactly as the lane states |
| `priority-selection-one-list` | 2 of 3 fail on the named revert | **12 pass / 2 fail** with the revert applied |

Re-driving the export routes on the tip returns artifacts **byte-identical to
round 1's** (`/api/export/coverage` 196,463 / 229,828 / 897,177 B;
`/api/export/coverage-letter` hashes `cb1c8707ce9e` / `96f529970a75` /
`6c27c8693c40`), so every round-1 driven conclusion — one priorities list
across four renderings, zero dangling cross-references, the unapplied-deduction
and voice rows — still holds without re-deriving it. The offline verifier still
returns `VERIFIED … exit 0` on the tip's letter. The round-1 orchestrator note
about duplicate register rows is resolved on this base: `uniq -d` over the row
numbers is now empty, 115 rows, no collision with this lane's 107–115.

## VERDICT: **MERGE**

Both blocking items are closed with the stronger version of the fix rather than
the cheaper one: the round trip was repaired in both directions instead of the
disclosure being narrowed to match the defect, and the letter's nine
descriptions were corrected to a measurement that I re-derived independently
and that holds for a 231-scene feature and a 9-scene short alike. The four
non-blocking items are done. The scoring surface is untouched — 45/45
byte-identical against a blob-verified `eb8cf9b2`, no scoring-path file in the
range — and the exported FDX of all 21 committed screenplays is unchanged by
this round, so no writer's existing export moved.

### Non-blocking

1. **The letter's stated range is measured on a report the product never
   renders.** `tests/core/coverage-letter.test.ts:777` and the lane's
   `lenall.mjs` both render a bare `runScriptDoctor` report; every caller
   (`server/routes/coverage-letter.ts:148` and the panel) attaches
   `buildRootCausePipeline` output first, worth ~0.35 pp. Shipped range is
   **3.53 – 3.96 pp**, not 3.3 – 3.6 (register row 115 and the test's comment
   both carry the smaller figure). The promise survives, with ~20 words of
   margin on `counter-offer.fountain`. Two one-line fixes: build the gate's
   report the way the route does, and bound it at `<= 4.0` so it enforces the
   sentence rather than a window a page and a half wider.
2. **"Byte-identical on all 21 committed screenplays" needs its base named.**
   True against `4af8ae97` (21/21). Against the pre-lane `eb8cf9b2` it is 20/21,
   the one difference being round 1's intended `Draft Date` title-page line on
   the only script that has one.
3. **Inline boneyard and multi-line notes still print.**
   `/* … */` inside an action line and a `[[ … ]]` note spanning two lines both
   cross into the FDX as ordinary action text. This is not a defect in the new
   omission logic: `src/lib/fountain.ts:110` recognises boneyard only at line
   start, so within this product that text is action and does print. The
   disclosure is therefore scoped to the constructs the parser implements,
   which is the honest scope — worth one sentence at the site so the next
   reader does not re-derive it as a finding, as I did.
4. **Paragraph grouping is not preserved, for forced and unforced text alike.**
   Two action lines written without a blank line between them come back as two
   paragraphs. Inherent to FDX (a paragraph is a paragraph), identical before
   and after this lane, and invisible to the engine — recorded only because
   "everything that prints comes back" is now an exact claim and this is the
   one thing that legitimately changes shape.
5. Round-1 non-blocking 5 stands: `verify:surfaces` was not re-run by this
   review, and the lane's §5.5 records that the three new export surfaces still
   have no browser assertion. Nothing in either round's verdict depends on it.
