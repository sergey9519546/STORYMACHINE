# Exports / producer tier — independent review of `8165c168`

*Reviewed object: `lane/exports-producer-tier` tip **`8165c168`**, ten commits on
`dd57251d` (the lane report and the brief both say "nine" — see item 8). Reviewer
did not build the change. Both trees held read-only: `git status --porcelain` empty
in `/home/user/STORYMACHINE` and `/home/user/wt-exports` before and after. All work
ran from `git archive 8165c168 | tar -x` plus a `git archive dd57251d` baseline and
five mutated copies under `<session scratch>/exports-review/`, `node_modules`
symlinked. No server of mine is left running. Budget per LANE_STANDARD §4: touched
suites, output identity, the receipt, `verify:surfaces`, and my own probes — no full
`npm test`, no browser battery.*

## Round 1

### Verdict: REVISE (5 items, 4 non-blocking notes)

The engineering is the strongest version of this work I have reviewed in this
batch. Everything load-bearing reproduced at the number reported, in the failure
direction first: the parity mutation bites at exactly 5/13 and 4/13 with the quoted
messages verbatim, the forged-verdict regression is real (the `dd57251d` CLI returns
**exit 0, "VERIFIED"** on a forged span stamp), the print-media fit and the
page-ref/PDF agreement reproduce to the decimal, and both logline gates fail the
suite when defeated. What sends it back is narrower: **four claims in SHIPPED bytes
do not survive being checked**, and two of them are the exact defect a prior round
already named. Every item below is mechanical.

---

## 1. The twelve prior-round items against this diff

| # | Prior-round item | Disposition | Evidence |
|---|---|---|---|
| R1-1 | the "turn" must be a quoted line in a dialogue block **within the climax scene's span**; runoff stops, off-season keeps | **DONE** | `logline.ts:467-504` gates BOTH candidates against `sceneDialogue[r.sceneIdx]` (`dialogueTextByScene`, `logline.ts:283-305`) — per-scene, not whole-script, which closes round 2's contrived hole. Reproduced: `runoff` drops `the turn “The inspector nods, packs the binder, and leaves”`; `off-season` keeps `the turn “I forgive you for not coming back”` |
| R1-2 | no fact rendered twice on the producer's first page | **NARROWED** | logline/verdict/health/word-count each render exactly 1× on the first page (measured). But the reference-bounds string renders **2×, adjacent** (`reader-tier.ts:325-326`) on every draft outside the band — and **0 of 20** CC0 shorts are inside the band. → **item 2** |
| R1-3 | an honest priorities heading on a one-item draft | **DONE** | `priorities-copy.ts`: `prioritiesHeadingFor(1)` = `"Fix this first"`, `(3)` = `"The 3 things to fix first"`, `(0)` = `"Nothing urgent surfaced"`. `"Top Priorities"` occurs 0× in the rendered HTML and 0× in the letter; one helper for 4 surfaces |
| R1-4 | symmetric `percentileIsComparable`, runoff as fixture, legacy snapshots without `wordCount` read "not comparable" (not a crash) | **DONE** | `percentile-copy.ts:107-117` requires both dimensions finite and in band. `percentile-comparability.test.ts` 15/15: runoff (9 sc / 1,448 w) drives tier + HTML + both letter renderings + exported slate + real snapshot→trend, all "not comparable"; legacy snapshot → `wordCount: null` → not comparable; zod accepts absent, rejects `'1200' / -5 / 12.5 / null / {} / NaN`; 8 surfaces asserted to decide through a gated helper |
| R1-5 | the letter's percentile through the shared sentence, one wording exactly twice | **DONE in count, BROKEN in copy** | Occurrences of `notComparableSentence()`: **2 in markdown, 2 in text**; no `\d+th pct`, no `top \d+%`. But `coverage-letter.ts:314` welds `— not against other scripts you might send it, and not a market comparison.` onto it, so the caveat no longer parses. → **item 3** |
| R1-6 | strengths retitle, caption BELOW the decline line, bytes above identical, every entry kept | **DONE** | `strengths-copy.ts`; rendered HTML title idx 23024 < caption idx 23105, both 1×; goldens show the block below `plainSummary` and the excerpt note, entries unchanged, `What’s Working` gone (asserted in `p0-sample-drift` case 3 too) |
| R1-7 | the 342-char parenthetical → `formatSceneList`, boundaries probed | **DONE, better than claimed** | `[]`→`""`, `[0]`→`"Scene 1"`, `[0,1]`→`"Scenes 1, 2"`, `[0,1,2]`→`"Scenes 1–3"`, `[2,8,39]`→`"Scenes 3, 9, 40"` (not collapsed), `[0,1,2,6,7]`→`"Scenes 1–3, 7, 8"`, unsorted/dup/negative/non-integer handled; coverage property holds. Widest finding **1,231 → 28 chars**; all three call sites guard `''` (`coverage-html.ts:496`, `coverage-letter.ts:261`, `ScriptDoctorPanel.tsx:1997`) |
| R1-8 | three factual errors ("21 CC0", a wrong test path, a wrong logline count) | **DONE** | `grep -rn "21 CC0\|21 shorts\|21 distributable"` over the tree → **0 hits**. 801 cited repository-path occurrences scanned across every changed `.ts/.tsx/.mjs` → **0 genuinely missing** (7 apparent misses are line-wrapped fragments). Suite counts match the report exactly |
| R2-1 | regenerate the sample report + a drift guard that survives its own next commit | **DONE, with an environment caveat** | Guard bites: restoring the `dd57251d` sample fails **2 of 3** cases. Survives its own commit (`GIT_SHA` masking). But the mask is 40-hex-only, so the suite fails in any `.git`-less tree. → **note A** |
| R2-2 | the `21`→`20` straggler | **DONE** | see R1-8 |
| R2-3 | the now-dead `.logline-line` CSS rule | **DONE, with proof** | The class is live again (`reader-tier.ts:316` + `coverage-html.ts:744`). `coverage-html.test.ts:1058-1120` enforces stylesheet↔markup equivalence in BOTH directions over 20 tracked classes plus a RETIRED list (`stamp-wrap`), which is how `.header-main` (styled, never rendered) was found |
| R2-4 | scope `isSpokenInScript` to the climax scene's span | **DONE** | see R1-1 |

---

## 2. The lane's headline numbers, reproduced

All commands run in `<session scratch>/exports-review/tip` unless stated.

| Claim | Command | Result |
|---|---|---|
| 231-scene fixture, 19,293 words, 899 issues, hash `6c27c8693c40…`, health 84.4, CONSIDER | `node --experimental-strip-types <probe p1-rootcause.ts>` | **exact match on all six** |
| 70 root causes with spans / 69 without | same | **70 / 69** ✓ |
| 3rd finding `Scenes 1–58` vs `Scene 1` | same | ✓ (`sceneIdxs` 0..57 vs `[0]`) |
| top finding `1, 2–12` vs `1, 2–9` | same | **WRONG — `Scenes 2–12` vs `Scenes 2–4, 6–9`** → **item 1** |
| scene lists 1,231 → 28 chars; 12,189 → 590 summed; 27 of 70 unanchored | same | **exact match on all three** |
| parity bites on reverting `export.ts`: 5 of 13 | revert `export.ts:404` to `clusterIssues(locateIssues(...))`, rerun `tests/routes/root-cause-parity.test.ts` | **5 fail / 8 pass**, messages verbatim: `HTML renders "Scenes 20, 23, 24", which no doctor-route finding names`; `exported HTML never says "Scenes 57–172" for the 116-scene finding` |
| parity bites on the letter route: 4 of 13 | restore the `dd57251d` `coverage-letter.ts`, rerun | **4 fail / 9 pass**: `letter never says "Scenes 1–58"`, `letter renders "Scenes 2–4, 6–9", which no doctor-route finding names` |
| `PROTAGONIST_MIN_DIALOGUE_SHARE 0.20` inside a measured gap 7.3% → 27.8% (high 62.1%) | `<probe p3b.ts>` over all 33 committed scripts, keyless | **assembly 7.3% · close-quarters 27.8% · signal-drift-bad 62.1%** ✓ |
| loglines 33/33 → 32/33, the loss being the assembly | same | ✓ |
| turn-quoting 7 of 32 → 3 of 32 | same | **8 → 3**, five scripts lose the clause (the four named **plus `runoff`**) → **item 5** |
| mid-clause ellipses 4 of 32 → 0 | same | **5 → 1**; `runoff` still ships one → **item 4** |
| "most-present speaker" justified by 4 of 32 / 18 of 32 | `<probe p4-metric.ts>`, `<probe p5-scenes.ts>` | **4 of 32** (red-line, the-detour, low-tide-bad, low-tide-excellent) and **18 of 32** ✓ |
| brief's "7 of 32" unsupportable; protagonist role on 2 of 33 | `<probe p6-proto.ts>` | **2 of 33** (same-page, assembly) ✓ — the correction is true, not convenient |
| tier worst case 631.8 px of 931.2 px, 2,454-char budget | `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium node --experimental-strip-types scripts/measure-reader-tier-page.mjs` | **exit 0** — runoff 490.5 px / **631.8 px** / 67.8% / 1,524 chars; implied budget **2,454**, pinned at `reader-tier.test.ts:244` |
| 231 page refs, 0 unresolved, monotonic, matching the PDF's printed labels | `<probe p8-pages.ts>` — real `fountainToPdf` bytes, last `(N.) Tj` per page stream | **231 refs, 0 unresolved, monotonic, page 1 → 79, 32 ms**; every scene's slug found on the page its reference names, **228/228** checkable (pages 0–1 print no label, as claimed). Report says 229 → off by one (**note D**) |
| "not comparable" on all 8 surfaces for runoff | `tests/core/percentile-comparability.test.ts` | **15/15**; 5 surfaces driven, 8 asserted by source proof |
| `verify:surfaces` 212/212 | `PW_CHROMIUM_PATH=… node scripts/verify-p2-p3-surfaces.mjs` | **212/212, exit 0** |
| the forged-verdict fix | `<probe p7-forge.ts>` + the `dd57251d` CLI | **the defect was real**: the baseline CLI on today's span stamp, verdict forged to RECOMMEND → `authentic: yes`, `VERIFIED`, **exit 0**. Tip CLI: forged span → exit 1, forged legacy `<div>` → exit 1, clean legacy `<div>` → exit 0. Narrowing the tip CLI back to `div` fails exactly 1 of 19 cases |
| the drift guard cannot be satisfied by a stale sample | restore the `dd57251d` sample, rerun `p0-sample-drift` | **2 of 3 fail** ("stale — the renderer has moved", "the producer tier") |
| both logline gates bite | defeat the quote gate / the share gate in source, rerun `logline.test.ts` | **6 of 56** (runoff's regression named) and **2 of 56** ✓ |
| touched suites | each file run individually | reader-tier **18/18** · scene-ranges **14/14** · reference-bounds **8/8** · page-refs **12/12** · percentile-comparability **15/15** · percentile-copy-consistency **30/30** · slate-percentile-denominator **3/3** · snapshot-trend **63/63** · logline **56/56** · coverage-html **53/53** · coverage-letter **47/47** · root-cause-parity **13/13** · brain-coverage **7/7** · honesty-audit-claims **5/5** · verify-report **19/19** · p0-sample-drift **3/3** (with `GIT_SHA` set; see note A) |

### Gates

| Gate | Command | Result |
|---|---|---|
| scoring receipt | `node scripts/check-scoring-receipt.mjs dd57251d..8165c168` (real repo) | **exit 0 — "no scoring-path files changed"** |
| output identity | `GIT_SHA` pinned identically, `--tree base`, `--tree tip`, then `--compare`, **no `--ignore-keys`** | **PASS — all 45 reports byte-identical** (`analyzedAt` excluded by the harness) |
| public benchmark | `node --experimental-strip-types tests/core/public-benchmark.test.ts` | **28/28, 0 skipped** |
| brain | `node scripts/brain-graph.mjs --check` | **exit 0 — 97 notes, 322 links, fresh** |
| honesty audit | `node scripts/honesty-audit.mjs` | **exit 0 — 458 files, 432 markdown, 92 register rows, clean** |
| docs quality | `node --experimental-strip-types scripts/check-docs-quality.ts --all` | **exit 0 — clean** |
| no-console | `node scripts/check-no-console.mjs` | **exit 0 — 304 files** (report says 300; baseline is 298 — **note C**) |
| trailers | `git log --format=… dd57251d..8165c168` | **both trailers on all 10 commits**; `Co-Authored-By: Claude Fable 5.1` matches every recent `main` commit, so it is the repository's convention, not a leak |
| model identifiers in content | grep over every changed file for `fable\|opus\|sonnet\|haiku\|claude-[0-9a-z]\|gpt-[0-9]` | **0 hits** (the `gpt-4o` strings in `SettingsPanel.tsx` are untouched pre-existing provider placeholders) |
| claims register quotes shipped bytes | `<probe p13-register.ts>` imports each constant and greps the register | **11 of 11 rows byte-exact** (rows 82, 85, 86×2, 87×3, 88, 89, 90, 91) |

### The three things the lane says the brief got wrong — all three check out

1. **231 scenes, not 146** — `runScriptDoctor` reports `sceneCount: 231`, 19,293 words, no truncation. True.
2. **"7 of 32" is not reproducible** — the only independent central-figure designation, `characterFunctions`' protagonist role, is populated on **2 of 33** scripts, so it cannot carry a 7-of-32 statistic. The two substitutes are real: **4 of 32** and **18 of 32**, both reproduced. True, and the register row 84 records the correction rather than burying it.
3. **No stale "21 CC0" claims** — 0 hits tree-wide. True.

---

## REVISE — numbered items

**1. A measured table in shipped bytes has a wrong row, and a brain note quotes it.**
`server/lib/root-cause-pipeline.ts:34` and `docs/brain/Surfaces/Surface - Root Cause Pipeline.md:34` both state `top finding's scenes | 1, 2–12 | 1, 2–9`. Neither value exists. Reproduction (`<session scratch>/exports-review/probes/p2-top.ts`):

```
#0 WITH    idxs=[1..11]      -> Scenes 2–12
#0 WITHOUT idxs=[1,2,3,5,6,7,8] -> Scenes 2–4, 6–9
```

There is no scene 1 in either, and the without-spans list is **gappy**, not the contiguous `2–9` the table shows — so the table understates its own finding (the drift is worse than advertised) while being unreproducible. The `3rd finding` row is exactly right. Fix the one row in both places and in §3.1 of the report.

**2. The producer's first page states the reference bounds twice — the defect round-1 item 2 named.**
`server/lib/reader-tier.ts:325-326` emits two adjacent `<p class="tier-bounds">`: the not-comparable sentence, which already carries `(20 samples / 9–10 scenes / 256–337 words)`, and then `Reference bounds: 20 samples / 9–10 scenes / 256–337 words.` Reproduction — first page of the exported HTML for `runoff` (`<probe p10-firstpage.ts>`, `<session scratch>/exports-review/firstpage.html`): `"20 samples"` **2×**, `"256"` **2×** inside one page. In the committed golden letter `tests/fixtures/coverage-letter/report1.expected.md` the string appears **3×** (`grep -c "20 samples"` → 3). This is not an edge case: `<probe p14-band.ts>` measures **0 of 20 CC0 shorts inside the band**, so every real draft takes this path. Suppress the bounds line when `percentileLine` is the not-comparable sentence (it already carries the bounds), or drop the parenthetical from the sentence when the bounds line renders beside it. Re-lock the three letter goldens and the HTML fixture after.

**3. The letter's how-to-read caveat no longer parses on any real draft.**
`server/lib/coverage-letter.ts:314` concatenates `${reading} — not against other scripts you might send it, and not a market comparison.` The trailing clause modifies "ranks … against", which the not-comparable reading does not contain. Shipped, in all three committed goldens (`report{1,2,3}.expected.md:58`):

> Health percentile: not comparable — this draft is outside the bounds of the hand-authored synthetic reference set (20 samples / 9–10 scenes / 256–337 words) — not against other scripts you might send it, and not a market comparison.

§2's "copy tells the truth" is about every state that renders it, and this is the state 100% of real drafts render. Branch the trailing clause on comparability (it is true and useful on the band path, which the in-band synthetic case in `percentile-comparability.test.ts:100` already covers) and add a case asserting the not-comparable letter does NOT carry it.

**4. "Mid-clause ellipses: 4 before, 0 after" is false, in shipped bytes, and the lane's own showcase script is the counter-example.**
`server/lib/logline.ts:360` claims `…and 0 after; no script loses its inciting clause`. Reproduction (`<probe p3b.ts>`, 32 real committed scripts, keyless): **5 before** (code-blue, counter-offer, mise, **runoff**, the-ledger-bad), **1 after**. `runoff.fountain`'s shipped logline, the first line of its producer tier:

> `SARA must contend with “Creek Mile 14, Tuesday morning. Turbidity source appears to originate above the new construction pad at the tree line. The upstream contrac…”.`

Three sentences, truncated mid-word, as the opening line of the producer's page — which is product-discovery finding #7 verbatim ("the producer's report opens with a machine-mangled logline"). The cause is three lines from the fix: `findIncitingIncident` (`logline.ts:347-371`) now takes `firstSentence(text)`, while its sibling `findApparentGoal` (`logline.ts:327`) still returns `truncate(text, MAX_CLAUSE_LEN)` with no `firstSentence` — one concept, two implementations, which is §1's "a second copy of a formatter is a defect". Apply `firstSentence` there (with the measured cost of any clause lost), and narrow the comment to the channel it measured. At minimum the claim must stop saying 0.

**5. The turn-quoting before-count omits the script the change is named for.**
§3.2(b) of the report says "7 of 32 before, 3 after" and lists "the four that lost the clause". Measured: **8 before, 3 after, five lost** — the four named plus `runoff`, which the same paragraph describes losing its turn two sentences earlier. Arithmetically self-consistent, factually one short. Report-only (no shipped byte states 7), but §5 makes a miscounted before/after a false report. Correct to 8 → 3 and name five.

---

## Non-blocking notes

**A. The drift guard fails in a `.git`-less tree.** `tests/core/p0-sample-drift.test.ts:64` masks `\b[0-9a-f]{40}\b`; in a tree without `.git`, `build-info.ts:71` resolves `engineCommit` to `'dev'`, which the mask does not cover, so the suite fails 1 of 3 with `generator: dev / committed: <ENGINE_COMMIT>`. Reproduced in the review archive; passes 3/3 with `GIT_SHA` set. CI has `.git`, so this is not a merge blocker — but `git archive` is the workflow this repository's own identity harness prescribes, so masking `dev` as well (or pinning `GIT_SHA` in the test) costs one line and removes a trap.

**B. The "citation correction" commit replaces a once-correct citation with a wrong provenance story.** `scripts/probe-dimension-honesty.mjs:27-32` now states that `"The climax is where it belongs — …"` is "from the RETIRED 'The Second Key' stimulus (swapped out 2026-08-04)" and "appears nowhere in the committed artifact at any line". Git disagrees: `git show 272943f9:docs/user-validation/sample-coverage-report.html | grep -n` puts that exact sentence at **line 376** of that very artifact, and `99fb0159` ("soften two overstated claims", **2026-07-28**) removed it. The original citation was correct when written; it went stale. The present-tense half of the new comment is true, but the attribution and the date are not, and the lane report's "has never contained at any line" is false. Restate it as "removed from this artifact by 99fb0159".

**C. Two counts in the report do not match the tree.** `check-no-console` reports **304** files on the tip (298 on `dd57251d`); the report says 300. And the report says "Nine commits" with a `git log` block that omits `8165c168` — the range holds **ten**. LANE_STANDARD §5 asks for the log of the final tree.

**D. "229 of 231 references checkable" is 228.** Three scenes sit on PDF page 1, which prints no label by the convention the lane documents, so 228 references can be checked against a printed `(N.) Tj`. The test itself asserts no such number, so nothing is wrong in the code.

---

## What a stronger version would have done, and whether it was in scope

- **In scope and missed:** item 4. Finding #7 is "the producer's report opens with a machine-mangled logline", and the mangling that remains is in the same file, the same function family, and is what the tier actually prints for the lane's own demonstration script. The quote gate's KNOWN LIMIT note (`logline.ts:363-371`) is an honest record of a *different* residual (an unquoted action clause); it does not cover a mid-word truncation the lane claims to have eliminated.
- **Out of scope, correctly recorded:** the cluster-title overclaim (§6.3). I quantified it so the decision is informed rather than abstract: **6 of 70** findings on the feature fixture ship a title whose range is wider than their own scene list directly beneath it — e.g. `title "Scenes 207–219"` over `list "Scenes 207–211, 213, 215–219"` (`<probe p12-titles.ts>`). It is `cluster.ts`, it moves every finding id's visible prefix, and §2 permits deferral with file-and-line evidence, which the lane gave. Worth a follow-up, not this lane.
- **Out of scope, correctly stopped:** defect #8's actual contradiction. I confirmed `plainSummary` is still interpolated verbatim and the caption sits below it, so no byte above the decline line moved.
- **Not a shortcut:** the `verify:surfaces` gate rewrite (`5ae09a78`). I checked specifically for circularity, since deriving an expectation from the module under test is how a gate stops being able to fail. It derives from the **exported document's own printed scene/word counts**, then asserts the implied sentence is present AND the other form is absent — so it now also catches a document that states two readings of one number. The only softness is that the "other form absent" assertion passes vacuously if the size scrape returns null; the companion assertion catches that. The priorities-heading locator enumerates counts 0–10, which is enough for this fixture but would silently stop matching at 11+.
- **Not a shortcut:** the output-identity baseline. The lane used `dd57251d`, not `main` (`ad3f6fa7`), against the harness's own explicit warning — and justified it by `git diff --name-only dd57251d..ad3f6fa7` listing no `.ts` file. I confirmed the gap is documentation only, so the 45/45 stands; if `main` gains an engine commit before the merge, redo it.

## Merge notes for the orchestrator

- `docs/brain/GRAPH.md` and `docs/brain/brain.graph.json` will conflict on rebase (regenerated on both sides). Take either, then `npm run brain && npm run check-brain`.
- Item 1 touches a brain note, so re-run `npm run brain` after fixing it.
- Items 2 and 3 re-lock `tests/fixtures/coverage-letter/report{1,2,3}.expected.md` and `tests/fixtures/coverage-html/no-percentile-no-draftrank.html`, and will move `docs/user-validation/sample-coverage-report.html` — which means `npm run generate-p0-sample` and a re-read of the `p0-sample-drift` diff before the re-check.
- No scoring-path file is touched, so no receipt is required for any of the five items.
