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
