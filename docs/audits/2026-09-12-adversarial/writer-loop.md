# The writer's loop, driven adversarially — read-only, 2026-09-12

Lane: read-only investigation A (the writer's loop). Tree: `main` at
`c087a6ca`. No file in `/home/user/STORYMACHINE` was modified except this one.

## Method

`git archive c087a6ca | tar -x` into a scratch worktree with `node_modules`
symlinked from the repo; `npm run build` (exit 0); keyless production server
(`env -u GEMINI_API_KEY PORT=5311 NODE_ENV=production npx tsx server.ts`),
`GET /api/ai-config` → `"llmReady":false`, `"keySet":false`. Driven with
Playwright/Chromium 1.63 (`/opt/pw-browsers/chromium-1194`) at 1280×900 and
375×812, `colorScheme` light and dark, and against the live routes with
`curl`. Inputs: `tests/fixtures/feature-length/assembled-feature.fountain`
(231 scenes), the P0 sample (`data/screenplays/dead-frequency.fountain`, via
"Try sample coverage"), `runoff`, `off-season`, `mise`,
`the-defense-rests` from `data/screenplays/`, plus six I built to break
things — a coherent 5-scene short I wrote (`coherent-short.fountain`), a
title-page-only file, a 420-scene file, a Cyrillic/CJK/emoji cue file, the
coherent short re-emitted double-spaced as pasted-PDF text, and a 12-scene
script whose only defect is 28 lines of "as you know" exposition confined to
scene 12. Reproductions below use `<S>` for the scratch dir
(`/tmp/claude-0/-home-user-STORYMACHINE/057a350f-.../scratchpad`); screenshots
are at `<S>/shots/`. Every server and browser started was killed; `ss -ltnp`
clean on :5311 at the end.

Two fixes recorded in `docs/audits/2026-09-0*/` were re-verified as still
holding and are in §B. Three findings below **are** items recorded in
`docs/audits/2026-09-07-innovation/product-discovery.md` — but that document
records them as landed on `scoring/feature-length-defects`, an **owner-gated
branch that is not in `c087a6ca`**. They are re-listed with fresh
reproductions on main, and marked as such.

---

## A. Findings, ranked by product impact

### 1. BROKEN · P1 — Pasting a production note into a Fountain comment raises health ~10 points and flips CONSIDER → RECOMMEND on real screenplays

`server/nvm/analyze/fountain-analyzer.ts:2464`, `:2471` ·
`server/nvm/analyze/doctor.ts:657`

`wordCount` — the denominator of the density term that is most of the health
score — is `fastWordCount(fountain)` over the **raw submitted file**. Fountain
boneyard comments (`/* … */`), inline notes (`[[ … ]]`), synopses (`= …`) and
section headings (`# …`) are text the format defines as never printed, and
`fountain-analyzer.ts:548` deliberately skips the boneyard when computing
signals — so that text adds to the denominator and contributes nothing to the
numerator. Padding it is a free score.

Reproduction (server on :5311):

```
python3 -c "
src=open('data/screenplays/dead-frequency.fountain').read()
note='/*\n'+('scheduling and budget discussion '*800)+'\n*/\n\n'
import json;print(json.dumps({'fountain':note+src,'title':'X'}))" > /tmp/b.json
curl -s -X POST localhost:5311/api/scriptide/doctor \
  -H 'content-type: application/json' --data @/tmp/b.json |
  python3 -c "import json,sys;d=json.load(sys.stdin);print(d['health'],d['grade'],d['verdict'])"
```

| script | baseline | with a boneyard note |
|---|---|---|
| `dead-frequency` (the app's own sample) | 78.3 solid/strong · **CONSIDER** | 88.3 strong · **RECOMMEND** |
| `mise` | 74.2 solid · CONSIDER | 87.9 strong · **RECOMMEND** |
| `the-defense-rests` | 77.0 strong · CONSIDER | 88.3 strong · **RECOMMEND** |
| `off-season` | 71.2 solid · CONSIDER | 84.4 **strong** · CONSIDER |
| `runoff` | 74.6 solid · CONSIDER | 84.4 **strong** · CONSIDER |

All four non-printing constructs work (`runoff`: boneyard 74.6→84.4, notes
74.6→83.3, synopsis →83.3, section →83.3). Not one word of the screenplay
changed. The effect saturates at the density cap, which is the only reason
`runoff` stops short of RECOMMEND.

The code already knows this is the failure mode. `fountain-analyzer.ts:2458`
reads, verbatim: *"score denominator must never count text the analyzer did
not diagnose … otherwise post-ceiling padding can inflate the denominator and
improve health."* The guard it introduces (`analyzedWordCount`) is applied
**only** when `truncatedForAnalysis` is true — the >400-scene path. Every
real draft takes the unguarded branch.

This is the most damaging finding in the report because P1 is the One Bet.
Chained with finding 2, a writer can pad a comment block, take the RECOMMEND,
export the letter, and have `npm run verify-report` certify it.

**The best version.** The score denominator is the text the analyzer actually
read — the same `analyzedWordCount` sum, on every path, not just the truncated
one — with a metamorphic witness in `evals/scoring/` asserting that appending
a boneyard/note/synopsis/section block of any length leaves health,
verdict and every dimension byte-identical. `wordCount` on the report stays
the *printed* word count, since it is also what `percentileIsComparable` and
the page estimate read; a separate `submittedWordCount` can carry the raw
figure if anything needs it.

---

### 2. BROKEN · P3 — A coverage letter whose page-one verdict has been changed from CONSIDER to RECOMMEND passes `npm run verify-report` as VERIFIED

`scripts/verify-report.mjs:212-247` (letter), `:155-200` (HTML) ·
`server/lib/reader-tier.ts:233-247`

The producer tier added on 2026-09-11 put a **second** verdict-and-health
rendering at the top of both artifacts — `**Verdict.** CONSIDER · Health 74.6
/ 100` in the letter, `… <span class="stamp">CONSIDER</span> &middot; Health
74.6 / 100` in the HTML. The CLI's letter parser reads
`/\*\*Verdict:\s*(.+?)\*\*/` and `/Health\s+([\d.]+)\/100/`; the tier writes
`**Verdict.**` (period, not colon) and `Health 74.6 / 100` (spaces around the
slash). Neither matches. The forgery guard `collectBodyClaims` covers
`<div class="health-number">`, `class="stamp"` and the `plainSummary`
sentence — not the tier line.

Reproduction:

```
curl -s -X POST localhost:5311/api/export/coverage-letter -H 'content-type: application/json' \
  --data "$(python3 -c "import json;print(json.dumps({'fountain':open('data/screenplays/runoff.fountain').read(),'title':'RUNOFF'}))")" |
  python3 -c "import json,sys;print(json.load(sys.stdin)['markdown'])" > /tmp/letter.md
sed -i 's/\*\*Verdict\.\*\* CONSIDER · Health 74.6 \/ 100/**Verdict.** RECOMMEND · Health 94.6 \/ 100/' /tmp/letter.md
npm run verify-report -- /tmp/letter.md data/screenplays/runoff.fountain; echo "exit=$?"
```

Output: `authentic: yes`, `health: yes (report 74.6, local 74.6)`,
`verdict: yes (report CONSIDER, local CONSIDER)`,
**`VERIFIED — authentic and reproducible under this engine.`**, `exit=0` —
on a document whose first page says RECOMMEND, 94.6. The same edit to the
HTML export's tier line (`&middot; Health 74.6 / 100` → `94.6`) also verifies.

`parseLetterReport`'s own comment now states something false: *"the letter's
headline/bold-verdict-line ARE the primary source parsed above — there is no
separate machine-readable block duplicating them for a forger to leave
untouched."* There is: the tier, and it reads first.

The hosted route is honest on the claims it is *given* (a lie about health
with the true hash returns `score_mismatch` with the true values — see §B),
so this is specifically a whole-document forgery the CLI was built to catch
and does not.

**The best version.** One exported module lists every reader-facing rendering
of health and verdict in every artifact shape, the renderers emit them
through it, and the CLI scrapes the same list — so a new rendering cannot be
added without the scraper learning about it. The forgery test then iterates
that list instead of naming three sites by hand, and the 2026-09-11 lane's
own regression (moving the stamp from `<div>` to `<span>` silently disabled
the scrape) becomes impossible rather than caught by luck.

---

### 3. BROKEN · P2 — "Coverage outdated → RE-RUN COVERAGE" does not re-run coverage, and dismisses the warning

`src/components/ScriptIDE.tsx:2797-2803`

When the draft changes after a run, the status strip correctly shows
**"Coverage outdated"** with a **"Re-run coverage"** button. That button's
handler is `onClick={() => handleTaskChange("coverage")}` — it switches the
active task to `coverage`. The banner only appears while the writer is
looking at coverage, so the task is already `coverage` and the click is a
no-op: no request, no new report, and the banner disappears.

Reproduction (`<S>/invA/_drive24.mjs`, screenshots
`<S>/shots/84-outdated-banner.png`, `85-after-banner-click.png`): import
`data/screenplays/runoff.fountain` → RUN COVERAGE (HEALTH 75, 9 scenes) →
type a new `INT. ANOTHER ROOM - DAY` scene in the editor → the banner appears
(`banner visible? true`) → click `button:not([aria-label])` with text
`RE-RUN COVERAGE`:

```
POSTS after clicking the banner button: ["/scriptide/save"]
panel after: VERDICT CONSIDER HEALTH 75
banner still visible? false
```

Server log confirms zero `/api/scriptide/doctor/stream` requests in that
window. The writer is left with a verdict computed for text that no longer
exists **and** with the one honest warning about it cleared. (The panel
header's circular-arrow control, `CoverageSummary.tsx:522`, does work — I
verified 75 → 76 after the same edit via
`button[aria-label="Re-run coverage"]`. Two controls with the same name, one
inert.)

**The best version.** Both controls call the same `run()`; the stale flag is
cleared by a *completed* run, never by a click; and a browser gate in
`verify:ui-polish` drives edit → banner → click → asserts a new
`doctor/stream` request and a changed `contentHash` on the panel. The deeper
fix is that "outdated" should be a property of the report the panel is
showing (its `contentHash` ≠ the editor's), so the panel itself can grey its
own numbers rather than relying on a strip the writer may have scrolled past.

---

### 4. UNTRUE · P1, P3 — The same report says the draft cannot be compared to the reference set and that it is in the top 10% of that reference set

`src/components/scriptide/ScriptDoctorPanel.tsx:5334`, `:5347-5353` (ungated)
vs `:4969` / `:5019` (gated) · `server/nvm/analyze/doctor.ts:2255-2259`

`percentileIsComparable` (`src/lib/percentile-copy.ts:105-116`) was written
2026-09-11 to stop the product ranking real drafts against a 20-sample,
9–10-scene, 256–337-word synthetic corpus. Its own doc comment says *"One
function, both dimensions, every caller."* It is applied to the **headline**
health percentile and **not** to the five **dimension** percentile badges,
which the server computes unconditionally at `doctor.ts:2257`.

Reproduction (`<S>/invA/_drive6.mjs`, screenshot
`<S>/shots/05-full-report-dimensions.png`): Try sample coverage → FULL
REPORT. Line 140 of the rendered text:

> Health percentile: not comparable — this draft is outside the bounds of the
> hand-authored synthetic reference set (20 samples / 9–10 scenes / 256–337 words)

Lines 367–399 of the same scrolling document:

> Percentile badges compare against **the same** 20-sample, hand-authored
> synthetic reference set.
> STRUCTURE & PACING **TOP 10%** 92 · CHARACTER **TOP 10%** 95 · DIALOGUE &
> VOICE **TOP 10%** 99 · PLOT LOGIC & PAYOFF **TOP 10%** 88 · THEME &
> ORIGINALITY **TOP 10%** 100

Worse, the badge is anti-correlated with the number beside it, because
`doctor.ts:2257` ranks `build.rawScore` (the **unclamped** craft statistic,
scarcity term included) while the badge sits next to the **clamped** display
score. On my coherent 5-scene short every dimension scores 96.5–100 and every
badge reads *"bottom 10% of the reference set"* — including Theme &
Originality at **100/100 with zero issues**. On the deliberately incoherent
231-scene concatenation, Character scores **81.5** and reads **top 10%**.
Higher craft score, lower percentile; the badge is a scene-count readout.

```
curl -s -X POST localhost:5311/api/scriptide/doctor -H 'content-type: application/json' \
  --data @<(python3 -c "import json;print(json.dumps({'fountain':open('<S>/inputs/coherent-short.fountain').read(),'title':'SHORT'}))") |
  python3 -c "import json,sys;[print(d['key'],d['score'],d['percentile'],'|',d['percentileDescriptor']) for d in json.load(sys.stdin)['dimensions']]"
```

`POST /api/export/verify` also recomputes and attests
`healthPercentile: 100` for `runoff` — the number the product itself refuses
to show because it is not a valid reading (`server/lib/verify-compare.ts:166-171`).

**The best version.** One comparability decision, taken once in
`doctor.ts`'s calibration block: when the draft is outside the bounds, the
dimension percentile fields are simply not emitted, exactly as the block
already does when the distribution is empty — so no surface can render them,
including the verify recomputation. Inside the bounds, the percentile ranks
the **same statistic the panel displays**, so a 99/100 can never read "bottom
10%". `tests/core/percentile-copy-consistency.test.ts` grows an assertion
that no surface renders a percentile the gate would have withheld.

---

### 5. BROKEN · P2 — The "next fix" jump invents a line for a whole-draft finding and flashes 90% of the script

`src/lib/jump-span.ts:47-77` · `src/components/scriptide/CoverageSummary.tsx:477-494`

`server/nvm/analyze/locate.ts` is honest: for the 231-scene fixture it
anchors the top priority ("Conflict layer — An 8+ scene story with zero
suspense-dip reversals detected") at tier `document`, with no line —
and `finding-jump.ts` has the right copy ready
(`NO_LOCATION_DOCUMENT_REASON`). But `computeJumpSpan` falls through: step 1
finds no span for the top priority, step 2 then takes **the first root
cause's line-anchored members** and returns their envelope. The card renders
that envelope as if it were the top priority's location.

```
node --experimental-strip-types -e "
import {readFileSync} from 'node:fs';
import {buildRootCausePipeline} from './server/lib/root-cause-pipeline.ts';
import {runScriptDoctor} from './server/nvm/analyze/doctor.ts';
import {computeJumpSpan} from './src/lib/jump-span.ts';
const f=readFileSync('tests/fixtures/feature-length/assembled-feature.fountain','utf8');
const r=await runScriptDoctor(f,{title:'F'}); const pipe=buildRootCausePipeline(r,f);
console.log(JSON.stringify(computeJumpSpan({topLocation:pipe.prioritized[0].issue?.location??r.topPriorities[0].location,
  root:pipe.rootCauses[0], locatedIssues:pipe.locatedIssues})));"
```

→ `{"startLine":137,"endLine":2709}` on a 2,927-line file. The button is
labelled **"JUMP TO LINE 137"**; line 137 is a line of NELL's dialogue about a
weight discrepancy in scene 8, belonging to a `QUESTION_DODGE` member of an
unrelated *"Recurring zero entropy scene trouble in Scenes 2–12"* root cause.
Screenshot `<S>/shots/62-feature-jump-lands.png` shows the editor after the
click: the highlight starts mid-dialogue and runs off the bottom of the
viewport through the next scene heading.

At short length the same finding correctly shows **NO LOCATION** (verified on
`runoff`, `<S>/invA/_drive14.mjs`). The affordance only lies at feature
length — the only length where a writer cannot check it by eye.

**The best version.** `computeJumpSpan` never crosses finding boundaries: a
finding's span comes from that finding's own anchor, and nothing else. A
root-cause card jumps to the root cause's span; a top-priority card jumps to
the top priority's span or renders the honest no-location note. The label
naming a *line* for a span of 2,572 lines is a second bug in the same
control — a multi-scene span should say "Jump to scenes 8–231", or the
control should refuse a span wider than a few scenes.

---

### 6. UNTRUE · P0 — The first number a stranger sees is not what the sample produces

`src/components/StartScreen.tsx:665`, `:673`, `:678`

The start screen's "Most important after a draft / Coverage" panel sits
directly beside a button reading **"See it on the sample"** and renders a
report card, in the product's own report styling, with `VERDICT Consider ·
HEALTH 76 · NEXT Climax engagement · COUNTS 3 · 38 · 159 · LLM JUDGE None`.
All three numbers are hardcoded literals, and none of them is what the sample
produces.

Reproduction (`<S>/invA/_drive5.mjs`, screenshots
`<S>/shots/01-start-desktop-light.png`, `<S>/shots/20-mobile-start-dark.png`,
`04-coverage-panel-light.png`): load `/`, read the panel, then click "Try
sample coverage" and read the real one:

| | start screen claims | the sample actually returns |
|---|---|---|
| health | 76 | **78** |
| critical · major · minor | 3 · 38 · 159 | **2 · 32 · 139** |

Nothing labels the panel as illustrative. For a product whose entire pitch is
that its numbers are reproducible and inspectable, the first four numbers on
the front door are stale fiction — and a curious visitor discovers that by
clicking the button next to them, in about six seconds.

**The best version.** The panel is rendered from a build-time artifact
produced by running the doctor on `src/lib/sample-script.ts` (the repo
already has `npm run generate-p0-sample` doing exactly this for the P0
stimulus), with a test that fails when the committed numbers drift from a
fresh run — the same shape as `tests/core/rulebook.test.ts`. Failing that,
the card shows no numbers at all rather than wrong ones.

---

### 7. UNTRUE · P1 — Twenty unrelated shorts stapled together score higher than any of them, and higher than a coherent script

*(Recorded as discovery #5 in `docs/audits/2026-09-07-innovation/product-discovery.md`,
fixed on `scoring/feature-length-defects` — an owner-gated branch not in
`c087a6ca`. Reproduced here on main.)*

`tests/fixtures/feature-length/assembled-feature.fountain` is, by its own
header, *"a DELIBERATELY INCOHERENT assembly … no throughline, no protagonist,
no act structure and no intended meaning across the seams."*

```
curl -s -X POST localhost:5311/api/scriptide/doctor -H 'content-type: application/json' \
  --data @<(python3 -c "import json;print(json.dumps({'fountain':open('tests/fixtures/feature-length/assembled-feature.fountain').read(),'title':'F'}))") |
  python3 -c "import json,sys;d=json.load(sys.stdin);print(d['health'],d['grade'],d['verdict'],d['sceneCount'])"
```

→ `84.4 strong CONSIDER 231`. Every coherent script I ran scores lower:
`dead-frequency` 78.3, `the-defense-rests` 77.0, `runoff` 74.6, my own
coherent short 72.0, `off-season` 71.2. Its five dimension badges all read
"top 10% of the reference set"; the letter calls it **"Health 84.4/100
(Strong)"**. On main today, length beats coherence, and it is the *only*
committed feature-length input, so this is what the product does at the
length it is for.

**The best version.** A structural term that reads document-scale coherence
(the bounded-deduction pathway NORTH_STAR §2 already names) rather than
issue density, plus the `stapled_shorts` metamorphic witness as a permanent
CI assertion: concatenating N independently-scoring shorts must not score
above the max of its parts. Until that lands, the fixture's report should
carry a caption the way the 420-scene case does.

---

### 8. UNTRUE · P3 — The coverage letter prints two different, contradictory "The 3 things to fix first" lists

`server/lib/reader-tier.ts:161-163` vs `server/lib/coverage-letter.ts:275-288`

`src/lib/priorities-copy.ts` was written 2026-09-11 so that "the things to fix
first" has **one** heading everywhere. It does. The two lists under that one
heading are selected by two different algorithms, in the same document:

* the producer tier takes `suppressContradictoryFindings(topPriorities).slice(0, 3)` — engine order, contradiction-filtered;
* the letter body's `buildPriorities` re-sorts `[...anchored, ...unanchored].slice(0, 3)` — location-anchored findings first, **no** contradiction filter.

Reproduction: `POST /api/export/coverage-letter` for
`data/screenplays/runoff.fountain`, then
`grep -n "The 3 things to fix first" letter.md` → two hits.

| | list #1 (page one) | list #2 (body) |
|---|---|---|
| 1 | **CRITICAL** — Conflict layer | MAJOR — Scene 5 (midpoint) |
| 2 | MAJOR — Scene 5 (midpoint) — p. 3 | MAJOR — End of Act 1 (Scene ~3) |
| 3 | MAJOR — Overall structure | MAJOR — End of Act 2 (Scene ~7) |

The only CRITICAL finding in the report is on page one and absent from the
body's "3 things to fix first". A writer working from the back of the letter
never touches it. Same effect on `SHORT` and on the 231-scene feature. The
exported coverage **HTML** does not have this defect — its tier and its
"The 10 things to fix first" agree — so the letter also disagrees with the
HTML export of the same `contentHash`.

**The best version.** The tier's selection is *the* selection: one exported
function returns the ordered, suppression-filtered priority list, the tier
takes its first three and the body renders the same list (longer), so the two
can differ in length and never in content or order. The letter's
anchored-first re-sort, if it is wanted, belongs in that one function and
therefore applies to both.

---

### 9. UNTRUE · P1, P3 — On the product's own demo script, one report states three different health scores, two different critical counts, and calls the protagonist's name an unpaid setup

`server/nvm/analyze/doctor.ts` (headline) vs the Story Structure /
Structural Analysis sections of `ScriptDoctorPanel.tsx`

Reproduction: Try sample coverage → FULL REPORT (`<S>/out/fullreport.txt`).
The same document, on `dead-frequency` — which `data/screenplays/LICENSE-live-action.md`
documents as *"strong"-band craft calibration material* with *"Clue paid off
late; revelation past midpoint; clock honored in both halves"* — says:

* header: **VERDICT CONSIDER · HEALTH 78 · Strong draft · CRITICAL 2**
* Craft Dimensions: **STRUCTURE & PACING — TOP 10% — 92 — "is in good shape"**
* Story Structure Analysis: **"WEAK STRUCTURE · 25 issues · 8 critical · 0 strengths · Health score: 35/100 · Promise closure: 8%"**
* Structural Analysis: **"Graph Health 37/100 −9hp"**, and **"12 isolated scene(s) with no causal connections to the story"** — on a **12**-scene script, i.e. every scene
* the CRITICAL (8) list: `Setup "maya-okonkwo" planted but never resolved`, `Setup "detective-ray-okonkwo" …`, `Setup "killed" …`, `Setup "line" …`, `Setup "duty" …`, `Setup "deputy-dan-hale" …`
* Subplots: **`Mystery thread "maya-okonkwo" unresolved`** — the protagonist's own name
* Character Functions: `MAYA: ally · DAN: ally · CALLER: ally · SHERIFF PELLEW: ally` — every character, including the antagonist
* and a headline-level finding: **"12 of 13 planted clues (92%) are never paid off"** (`PAYOFF_ORPHAN_RATE`), whose "clues" are the character names above.

The same defect at feature length is worse: the 231-scene fixture's top three
CRITICAL findings are `Clue "long-way" … never paid off`, `Clue "down" …`,
`Clue "dispatcher-nell-arceo" …` — two words from its own title (*THE LONG
WAY DOWN*) and a character name. Eight of its nine orphan-clue findings are
character names. *(This is discovery #4, whose fix is on the owner-gated
`scoring/feature-length-defects`; the version above is on the **sample**, not
the fixture, and is what a first-time visitor sees.)*

**The best version.** A clue extractor with a name/title guard (proper nouns
matched against the cast list and the title page are not clues) and a
stop-list for bare function words — and one health number per document. The
"Story Structure Analysis" and "Graph Health" panels either feed the score
and agree with it, or are labelled as what `types.ts:403-405` says they are:
a diagnostic that is *"NOT part of health/verdict until repaired graph
extraction passes real-writing calibration."*

---

### 10. HALF-BUILT · NORTH_STAR §1 (honest degradation) — Two permanently dead buttons and a whole Labs section ship on the keyless default start screen

`src/components/StartScreen.tsx:736`, `:786` (dead) vs `:559` (correctly gated)

Labs defaults to OFF (`src/lib/feature-flags.ts:31-38`), so
`App.tsx:115` passes `onOpenStoryMachine` as `undefined`. Line 559 gates its
control on `{onOpenStoryMachine && (…)}`. Lines 736 and 786 instead call
`onOpenStoryMachine?.()` — rendering **"Open simulation"** and **"Simulate"**
as normal, enabled, focusable buttons that do nothing. Around them the
default start screen renders a full-width dark hero, **"WHEN YOU NEED
PRESSURE / STORY MACHINE SIMULATE"**, a four-cell feature grid (Stage /
Agents / Ledger / Return) and a numbered workflow whose steps 3 and 4 are
*"Simulate if needed"* and *"Export / return"* — i.e. the product describes a
Labs-only feature as part of its core four-step loop. The "Where you are"
rail does the same: step 4 is **"SHIP — EXPORT · SIMULATE"**.

Reproduction: `<S>/invA/_drive9.mjs` — click "Open simulation" and
"Simulate" on a fresh profile; the page does not change (`url` unchanged, top
content identical, zero page errors). Screenshots
`<S>/shots/20-mobile-start-dark.png` (the section, on a phone),
`<S>/shots/30-after-open_simulation_i.png`.

NORTH_STAR §1 is explicit: *"a Labs-gated feature degrades by not rendering at
all — hide, don't disable. A permanently-inert control … is a worse answer
than its absence."*

**The best version.** One `labsEnabled` guard wrapping the whole OASIS
section and both buttons, with the "Where you are" rail's step 4 reading
"SHIP — EXPORT" when Labs is off; and a browser gate that opens `/` with no
`sm_labs_enabled` and asserts that every visible button on the start screen
produces either a navigation or a state change.

---

### 11. UNTRUE · P3 — "Graph Health 37/100 −9hp" presents an explicitly unapplied deduction as applied

`src/components/scriptide/ScriptDoctorPanel.tsx:5588` vs
`server/nvm/analyze/types.ts:403-405`

The type's own doc comment: *"`graphDeduction` is a potential 0–15 point
value, **NOT part of health/verdict** until repaired graph extraction passes
real-writing calibration."* The panel renders it as
`{graphHealthScore}/100 −{graphDeduction}hp`, the `−9hp` in the stamp red
(`--sm-stamp-on-light` / `red-400`), in the same "hp" unit as the headline
health, with no caption. On the sample the full report reads **"Graph Health
37/100 −9hp"** directly under the headline **78** (`<S>/out/fullreport.txt:562-563`).
A reader has no way to know 9 points were not taken off.

**The best version.** Either the label says what is true — "would deduct up to
9 pts if enabled (diagnostic only, not applied)" — or the row is not rendered
until the signal is calibrated. The repo has the right precedent two sections
above it: *"SHAPE & RHYTHM · DESCRIPTIVE — NOT PART OF THE SCORE"*.

---

### 12. UNTRUE · P3 — "in good shape — a handful of minor notes" over 342 issues

`server/nvm/analyze/doctor.ts:1021`

`buildDimensionSummary`'s `excellent`/`strong` branch is a fixed string with
no count in it: *"`<label>` is in good shape — a handful of `<severity>`
notes, mostly around `<area>`."* The caption directly beneath it in the panel
states the real count.

| input | dimension | rendered together |
|---|---|---|
| 231-scene fixture | Character | "is in good shape — a handful of minor notes" · **"Based on 342 issues across 3 passes"** |
| 231-scene fixture | Plot Logic & Payoff | "a handful of minor notes" · **278 issues** |
| 231-scene fixture | Structure & Pacing | "a handful of minor notes" · **175 issues** |
| sample | Plot Logic & Payoff | "a handful of minor notes" · **58 issues** |

The `solid`/`uneven`/`troubled` branches at `:1023-1029` all interpolate
`dominantCount` correctly; only the two top bands invent "a handful". The
same sentence also calls Character "in good shape" while the plain summary in
the same panel calls Character *"the lowest-scoring diagnostic dimension, at
82/100"*.

**The best version.** Every branch states its count, and the top bands read
"N minor notes, none of them structural" or similar — the density-normalised
score can legitimately be 95 with 342 notes at feature scale, and saying so
is more credible than "a handful". The word "handful" should not survive a
grep of `server/**` copy.

---

### 13. HALF-BUILT · P1, P2 — A defect concentrated in one scene does not appear anywhere in the triage

Input: `<S>/inputs/one-bad-scene.fountain` — 11 near-identical clean scenes
plus one scene containing 14 exchanges of "As you know, Boris…" exposition.
It is the easiest possible localisation test.

```
curl -s -X POST localhost:5311/api/scriptide/doctor … | # top priorities
```

| # | location the writer is sent to |
|---|---|
| 1 | CRITICAL — Act 3 (Scenes 10–12) |
| 2 | CRITICAL — Conflict layer |
| 3 | MAJOR — Scene 7 (midpoint) |
| 4 | MAJOR — Overall structure |
| 5 | MAJOR — End of Act 1 (Scene ~4) |
| 6 | MAJOR — End of Act 2 (Scene ~10) |
| 7 | MAJOR — Scenes 2–5 |
| 8 | MAJOR — Scenes 6–9 |

**Scene 12 does not appear.** The engine *does* detect the defect — the plain
summary names *"as you know"* as the dominant rule area, and "Dialogue &
Voice" is the lowest dimension at 78 — but the ranked list a writer acts on
is saturated by act-shape checks that fire on nearly every short script
(`Act 1 boundary weak`, `Act 2 boundary weak`, `weak midpoint`, `no
reversals`), and the most concentrated issue cluster in the document is
invisible. The pass-level locations are `Dialogue throughout` (13) and
`Action lines throughout` (12) — "throughout" for something entirely in one
scene.

**The best version.** Priority ranking weights *concentration* — a rule area
whose instances cluster in one scene outranks a whole-draft check with the
same nominal severity — and the "Dialogue throughout" location resolves to
the scene span its instances actually occupy. The root-cause pipeline already
computes clusters and scene ranges; the priority list is the surface that
does not read them.

---

### 14. ROUGH · P3 — A "TOP 80%" badge on a bottom-quintile dimension

`src/lib/percentile-copy.ts:243-249`

`percentileBand(20)` returns `top 80%`. On `runoff`'s Craft Dimensions the
badge beside Dialogue & Voice (percentile 20) reads **"TOP 80%"** next to the
score **98**; Theme & Originality (percentile 20) likewise. "In the top 80%"
is literally true and reads as praise to every reader who is not thinking
about it. `percentileDescriptor` in the same file deliberately uses "stronger
than N%" for this band and reserves superlatives for the tails; the badge
undoes that.

**The best version.** The badge uses the same three-band vocabulary as the
descriptor — "top 10%", "stronger than 20%", "bottom quartile", "bottom 10%"
— so no badge can be read backwards, and `percentile-copy-consistency.test.ts`
asserts the badge and the descriptor never disagree in direction.

---

### 15. HALF-BUILT · P0 — The "this isn't Fountain" card drops the half of the server's answer that tells you what to do

`src/components/scriptide/CoverageSummary.tsx` (the `formatUnrecognized`
branch) vs `server/routes/scriptide.ts`

`POST /api/scriptide/doctor` on a title-page-only file returns both a
`reason` and a `hint`:

```
{"formatUnrecognized":true,
 "reason":"No scene headings such as INT. or EXT. were found — this doesn't read as a screenplay in Fountain format.",
 "hint":"Script Doctor analyzes Fountain-formatted screenplay text. Scene headings … begin with INT., EXT., INT./EXT., or EST. — for example \"INT. KITCHEN - DAY\"."}
```

The compact Coverage card renders only `reason`, plus **RETRY** and **USE
SAMPLE** (screenshot `<S>/shots/51-titleonly-coverage.png`). The full
`ScriptDoctorPanel` does render `hint` (`:4867`) — but the compact card is
the surface a first-time visitor lands on. The single highest-value visitor —
someone who pasted a draft out of Word or a PDF — is told the format is wrong
and offered a demo instead of the one sentence that would fix it.

**The best version.** The compact card shows the hint (it is two lines), and
the "RETRY / USE SAMPLE" pair gains a third affordance that is actually
relevant: "Add scene headings for me" is too much, but "Paste from PDF?" →
the same normaliser that already handles double-spaced text (which, to the
product's credit, works — see §C).

---

### 16. ROUGH · P3 — The exported report tells the reader to read a section that no longer exists

`server/lib/coverage-html.ts:554`

> "The 16 findings below cluster the detailed issue list by where they land in
> the script — **read after Top Priorities**, alongside the full appendix."

The 2026-09-11 heading consolidation renamed that section; the exported HTML
now contains "The 3 things to fix first" (tier) and "The 10 things to fix
first" (full list) and no "Top Priorities" heading at all. Reproduction:
`grep -c "Top Priorities" <S>/out/RUNOFF.coverage.html` → 1, and it is this
cross-reference.

**The best version.** The cross-reference is interpolated from
`prioritiesHeadingFor(n)` like every other instance of that phrase, so it
cannot drift again.

---

### 17. HALF-BUILT · P1 — Voice separation reads N/A on every feature-length script, with a tooltip that explains a number that isn't there

*(Discovery #3; fix on the owner-gated `scoring/feature-length-defects`.
Reproduced on main.)* On the 231-scene fixture the Coverage panel shows
**VOICE SEPARATION — N/A** beside an `i` tooltip reading *"Character pairs
whose dialogue is statistically distinguishable (Burrows's Delta) out of every
pair with enough dialogue to test. Higher is better — a low pair risks two
characters sounding interchangeable."* Nothing says why it abstained or what
would make it report. On the 12-scene sample the same tile reads 6/6.
Screenshot `<S>/shots/62-feature-jump-lands.png`.

**The best version.** The tile states the abstention reason in the tile
("no character has enough dialogue across the draft — 504 cues spread over 231
scenes"), and the per-character abstention on the gated branch lands so the
channel reports at the length it matters.

---

### 18. ROUGH · P2 — Export → re-import is not lossless, and the report changes

`src/lib/fdx.ts` (export) / `server/lib/fdx-import.ts` (import)

Exporting the 231-scene fixture to FDX and re-importing it drops the **title
page** (`Title:` / `Credit:` / `Author:` / `Draft date:`) and all six
`FADE OUT.` transitions, and the boneyard blocks. Verdict and grade survive;
the numbers do not:

| | original | after FDX round-trip |
|---|---|---|
| health | 84.4 | 84.8 |
| wordCount | 19,293 | 17,442 |
| totalIssues | 899 | 887 |
| verdict / grade / sceneCount | CONSIDER / strong / 231 | same |

Same shape on my short (479 → 465 words, 27 → 23 issues) and the non-ASCII
file (64.2 → 64.8 health). The health drift is finding 1 in miniature — the
lost words are the boneyard — but the title page and transitions are a plain
export defect: a writer who round-trips through Final Draft loses their title
page, and a report on the returned file will not match the report on the file
they sent.

**The best version.** The FDX writer emits `<TitlePage>` and keeps
`Type="Transition"` paragraphs it already produces on the way out (6 are
written; the importer drops them); an output-identity test asserts
`fdxToFountain(fountainToFdx(x))` reproduces `x`'s analysed content, and
therefore its `contentHash`-equivalent report, for all 20 CC0 shorts and the
feature fixture.

---

## B. What is excellent and must not regress

1. **The 420-scene refusal is exemplary honest degradation.** Importing a
   420-scene file and running coverage gives **"ANALYSIS INCOMPLETE / SCORE
   WITHHELD"**, the sentence *"this script has 420 scenes, exceeding the
   analyzer's 400-scene limit; only the first 400 scenes were analyzed; the
   score and verdict are withheld"*, and the issue count explicitly qualified
   as **"1005 ISSUES OBSERVED IN THE ANALYZED PORTION"**. No health, no
   grade, no verdict, no percentile — and `POST /api/export/verify` returns
   `422 analysis_incomplete` rather than attesting a prefix. Screenshot
   `<S>/shots/40-scale420.png`. This is what every other withholding decision
   in the product should look like.

2. **The comparability gate on the headline percentile is right, and the
   copy is unusually good.** `notComparableSentence()` names the bounds in its
   own parenthetical, `percentileCaveatSentenceFor` switches the trailing
   clause so it stays grammatical on the not-comparable path, and the letter's
   "How to read this report" adds *"A percentile against that set would be
   measuring this draft's length, not its craft."* Finding 4 is that this was
   not applied to five badges — the gate itself is the model to extend, not
   to weaken.

3. **The hosted verify route catches the lies it is shown.** With the true
   `contentHash` and forged claims (`health 99.9`, `verdict RECOMMEND`,
   `totalIssues 3`), `POST /api/export/verify` returns
   `verified:false · mismatchKind:"score_mismatch"` with every true value
   beside every false one, and `checked` naming exactly the fields the caller
   claimed. The cheap-first hash exit is right too: a wrong script returns
   with `checked:["contentHash"]` and never pays for a 14-pass run.

4. **The coverage panel on a 375px phone is a finished product.** Verdict
   stamp, health, three severity tiles with real tooltips, three signal tiles,
   "WHAT NEXT" with its jump, and a full-width FULL REPORT bar — no horizontal
   overflow at 375px in either colour scheme (`scrollWidth === clientWidth`
   both before and after a run), zero page errors. Screenshot
   `<S>/shots/21-mobile-after-sample-light.png`.

5. **Keyless really is keyless.** With no `GEMINI_API_KEY`, `llmReady:false`,
   and driving the whole loop — sample, import, coverage, full report, all
   four exports, verify — produced **no LLM-adjacent request and no API-key
   form anywhere in the doctor path**, and no route 500'd. The one violation
   of the spirit is finding 10 (dead Labs buttons), not of the letter.

**Re-verification of two recorded fixes — both hold.**

* `2026-09-07-innovation` #1, *"Typing a new scene after running coverage
  throws an infinite React render loop"* (fixed with `useIdempotentState`,
  merged `dd57251d`). **Holds.** `<S>/invA/_drive12.mjs`: load the sample, run
  coverage, then type a complete new scene into CodeMirror. Scene index goes
  12 → 13, `document.readyState === "complete"`, and **zero** `pageerror` or
  `console.error` events. Repeated on the imported `runoff` path with the same
  result.
* `2026-09-07-innovation` #2, *"The writer's screen and the producer's exports
  disagree about where the problem is, from the same `contentHash`"* (one
  shared `server/lib/root-cause-pipeline.ts`, `sceneSpans` added to
  `export.ts`). **Holds.** For `runoff`, the in-app ROOT CAUSES list and the
  exported HTML carry the same twenty root causes with byte-identical scene
  ranges — *"Recurring on the nose trouble in Scenes 7–9"*, *"Recurring near
  word repeat trouble in Scenes 2–8"*, *"Recurring act1 revelation absent
  trouble in Scenes 1–5"* — and the four named composite diagnoses (*"The
  middle has no engine"*, *"The reveal comes from nowhere and changes
  nothing"*, *"Planted material never pays off"*, *"Seeded threads carry no
  feeling"*) appear in both, the export grouping them into their own "Root
  Causes" section above "Recurring Issue Clusters". My first pass misread the
  grouping as a divergence; it is not one. The leftover is finding 16 only.

---

## C. What I could not break

* **Pasted-PDF-shaped text.** Re-emitting my coherent short with a blank line
  after every line (the shape of text pasted out of a PDF) parsed identically:
  5 scenes, 479 words, health **72.0** both ways, same verdict, same page
  estimate. Only the issue count moved (27 → 24).
* **Non-ASCII cues and headings.** Cyrillic character names, a Japanese scene
  heading, `JOSÉ-MARÍA ÑÚÑEZ`, an emoji in dialogue: parsed to the right
  scenes and speakers, no crash, no mojibake in the report, the FDX export,
  the DOCX or the print HTML. (A lone `...` line becomes a forced scene
  heading named `..` — that is Fountain spec, not a bug, though it is a trap
  worth knowing about given how much weight scene count carries.)
* **HTML escaping in the exports.** Every finding description containing
  `suspenseDelta < -1` and `suspense > 3` is escaped (`&lt;`, `&gt;`) in the
  coverage HTML — I went looking for a broken document and did not find one.
* **Determinism.** Identical text produced identical `contentHash`, health,
  verdict and issue counts across the route, the CLI and a direct in-process
  `runScriptDoctor` call, every time.
* **The rate limiters and validation.** `DoctorBodySchema`'s exactly-one-of
  refinement, the 900k character ceiling and `gameLimiter` all behaved; no
  route I hit returned a 500.
* **Page-estimate arithmetic.** I suspected a cap when the 231-scene fixture
  and the 420-scene file both reported ~79 pages; `layoutScreenplay` returns
  79 for both independently (19,293 words / 79 pp ≈ 244 w/pp, and 420 scene
  headings at ~8 rendered lines each). Coincidence, not a cap.
* **Provenance.** `engineCommit` correctly reports `dev` from a `.git`-less
  tarball rather than fabricating a SHA, and `rulebookCount` 3,217 matches
  `docs/rulebook/README.md`.

---

## D. Phase anchors, at a glance

| # | severity | anchor | one line |
|---|---|---|---|
| 1 | BROKEN | P1 | Comment padding buys +10 health and a RECOMMEND |
| 2 | BROKEN | P3 | Forged page-one verdict verifies as authentic |
| 3 | BROKEN | P2 | The "coverage outdated" re-run button does nothing |
| 4 | UNTRUE | P1, P3 | "Not comparable" and "top 10%" of the same set, one report |
| 5 | BROKEN | P2 | The next-fix jump fabricates a line and flashes the whole draft |
| 6 | UNTRUE | P0 | The front door's sample numbers are not the sample's numbers |
| 7 | UNTRUE | P1 | Twenty stapled shorts outscore every coherent script |
| 8 | UNTRUE | P3 | Two contradictory "3 things to fix first" in one letter |
| 9 | UNTRUE | P1, P3 | Three health scores and character-names-as-clues on the demo |
| 10 | HALF-BUILT | NORTH_STAR §1 | Dead Labs buttons on the keyless start screen |
| 11 | UNTRUE | P3 | An unapplied deduction rendered as "−9hp" |
| 12 | UNTRUE | P3 | "a handful of minor notes" over 342 issues |
| 13 | HALF-BUILT | P1, P2 | Triage cannot find a one-scene defect |
| 14 | ROUGH | P3 | "TOP 80%" on a bottom-quintile dimension |
| 15 | HALF-BUILT | P0 | The wrong-format card drops the actionable hint |
| 16 | ROUGH | P3 | A cross-reference to a renamed heading |
| 17 | HALF-BUILT | P1 | Voice separation N/A at feature length, unexplained |
| 18 | ROUGH | P2 | FDX round-trip loses the title page and changes the report |
