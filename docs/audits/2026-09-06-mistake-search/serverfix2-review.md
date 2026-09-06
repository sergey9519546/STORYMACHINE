# Independent review — serverfix2 (`f7466fb0`, tag `audit/2026-09-05/server-fixes-2-round1`)

## Round 1

**Reviewer:** independent (did not build this change).
**Worktree:** `/home/user/STORYMACHINE/.claude/worktrees/agent-aadffb46506a968c2`, branch
`worktree-agent-aadffb46506a968c2`, one commit `f7466fb0` on `main@4cbaf02f`, 13 files
+1277/−88. `git -C … status --porcelain` empty before and after this review; I made no edit
to the worktree or to `/home/user/STORYMACHINE`.
**Probes/logs:** `<session scratch>/sf2-review/` (`inv9.mjs`, `r9a.mjs`, `r9b.mjs`, `cost9.mjs`,
`dsweep.mjs`, `skew.mjs`, `legit9.mjs`, `vac.mjs`, `http9.mjs`, `http9b.mjs`, `d1f2.mjs`,
`d3d4.mjs`, `e1.mjs`, `f1f2.mjs`, `explore9.mjs`, `fixstats.mjs`, `main-guard.mjs`,
`main-r8-cost.mjs`, plus `*.log`).
**Servers:** one keyless server booted from the worktree on port 39411; killed
(`curl` → exit 7, `pgrep -af server.ts` clean). No server was booted from the main checkout —
the "before" numbers were taken in-process against `/home/user/STORYMACHINE`'s modules.
**Budget:** no full `npm test`, no browser battery. I ran the seven touched test files, the
receipt/no-console gates, the output-identity harness end to end, and my own ninth-round
attack. Box load average 1.9–3.0 throughout (other lanes live), so absolute ms are ~10–20%
pessimistic; all comparisons below are same-box, same-hour.

**Verdict: REVISE** — one BLOCKER (a ninth-round guard hole I built and measured on this tree:
**HTTP 200 in 71,880 ms** for an 860 KB payload, and **343,598 ms of `runScriptDoctor`** for a
334 KB payload matching the repo's own "plausible feature" cue metrics), one MEDIUM (F1's new withheld-`fountain` state is not
wired into the only client that reads it), one LOW (D4 stops at the wire). Everything the
brief actually asked for is done and reproduces; §1 records that in full.

---

## 1. Brief-vs-diff table

| # | Brief item | Status | Evidence (file:line, reproduced) |
|---|---|---|---|
| 1 | **BLOCKER A1-R8** — candidate predicate = UNION of the three cue predicates; oracle test `guardCueOccurrences >= pipeline character blocks`; time the round-8 payload before/after; keep 54 fixtures + caps-heavy + two-hander; fix the "NOT a cost vector" comment | **DONE** | `server/lib/validation.ts:576` `isCueLikeLine = CHARACTER_CUE_RE.test \|\| CUE_LIKE_LINE_RE.test \|\| isCharacterCue`; the counting walk is now one generator `walkGuardCueOccurrences` (`validation.ts:580`) shared by `fountainShapeRejectionReason` (`:731`) and the test-only `guardCueOccurrences` (`:803`). Comment rewritten at `validation.ts:509-559` with the full round-8 trace (the "NOT a cost vector" sentence is gone). Before/after in §3: main ACCEPT + 99,124 ms → worktree **HTTP 400 in 114 ms**. 54 tracked fixtures 0 rejected, caps-heavy/two-hander/(cont'd)-two-hander accepted at gaps 0–3, commented cast list accepted (§5). Oracle read for vacuity in §4. |
| 2 | **D1** — apply `/doctor`'s format short-circuit to base AND candidate on `/fix`'s writer path, same shape + receipt-level `comparable:false`, panel renders it, test asserting `/doctor` and `/fix` agree | **DONE** | `server/routes/scriptide.ts:1188-1201` (loop over both fields, POST order, before either doctor run); panel branch `src/components/scriptide/ScriptDoctorPanel.tsx:2123-2152` inside `if (!hasCandidate)` (`:2101`) — reachable (§6). Driven: `/doctor` and `/fix` return the same `reason`/`hint` for the same prose, `/fix` adds `comparable:false` + `field`, 3–8 ms, no `health`/`verdict`/`before`/`after` (§6). |
| 3 | **F1** — `.max()` on ops, per-branch total cap, projected fountain through `fountainShapeRejectionReason` + `MAX_FOUNTAIN_CHARS` before scoring, 4xx-equivalent, tests per bound | **DONE, one stated narrowing** | `validation.ts:1196-1214` `MAX_INJECT_OPS_PER_COMMIT = 500`; `server/routes/nvm/twin-whatif.ts:297-311` `tooLargeDraft`/`exceedsGuard`/`scoreDraft`; `:323` `responseFountainOf` withholds the text. Narrowing (declared in the report, not silent): a per-draft `200 + tooLarge:true`, not a top-level 4xx. Reproduced: 501 ops → 400, 500 → 200; 4 legal calls → **200 in 1,431 ms**, 1,185-byte body, `tooLarge:true`, no `health`, no `fountain`, `contentHash` present (§7). |
| 4 | **F2** — validate `opId` against the SCM, 404, test | **DONE, scope narrowed and the narrowing is correct** | `twin-whatif.ts:52-54` `opIdExists`, applied at `:193-196` on `/whatif/doctor` only; the `/explore` half of the previous agent's version was reverted with the reasoning at `:28-51`. Reproduced: bogus opId 404 on a seeded session and on an empty one; `/explore` still answers honestly and NAMES the missing id (§7). I agree with the revert — evidence in §7. |
| 5 | **E1** — letter's first-draft arm through the shared helper, test per state, register row | **DONE** | `server/lib/coverage-letter.ts:263-285` (`appendedNote` computed once, appended in BOTH arms — the `of > 1` arm's inline IIFE is gone, so there is now one expression, not two). `docs/CLAIMS_REGISTER.md:111` row 61, specific (names the arm, the finding, the two surfaces that already had the note, and the test). Driven: letter and HTML now agree per state (§8). |
| 6 | **D2–D4, E2, F3, F4, C3** | **D2/D3/E2/F3 done · D4 half-wired · F4 correctly declared unreachable · C3 already on main** | D2 `scriptide.ts:1218-1234` (branch on `truncatedForAnalysis`); D3 `validation.ts:1549-1568` exclusive refinement (400 reproduced, both single shapes still 200); E2 `validation.ts:1428-1438` (`tied requires of >= 2`, 400 reproduced on both export routes); F3 `twin-whatif.ts:248-258` comment narrowed + one-scene test; **D4 `server/nvm/analyze/fix-delta.ts:50-61,133` computes `identicalAnalysis` and ships it, but no surface renders it** (REVISE #3); F4 verified unreachable by reading, not by report (§9); C3 confirmed already on `main`. |
| — | No scoring-path edits; no `console.*` | **DONE** | `node scripts/check-scoring-receipt.mjs main..HEAD` → "no scoring-path files changed", exit 0. `fix-delta.ts` is NOT in `doctor.ts`'s import graph — `doctor.ts` never imports it; its only importers are `server/nvm/analyze/fix.ts:69` and `server/routes/scriptide.ts:1245`, i.e. downstream. The receipt gate correctly did not fire. `check-no-console` exit 0. |

---

## 2. BLOCKER — round 9: the union predicate is right, but the BOUNDS admit requests costing 1–6 MINUTES

I could not break the predicate (§4/§5: 40 shapes, zero oracle violations). I broke the guard
anyway, on the one axis the oracle cannot see: `guardCueOccurrences` counts every one of these
cues — it just decides they are fine.

**The payloads are boring.** ALL-CAPS ASCII names, one ordinary lowercase dialogue line each,
one scene heading per 40 lines. No Unicode, no parenthetical tails, no carets, no boneyard, no
blank-line gaps, no oversized tokens.

Reproduce over real HTTP (server booted from the worktree, keyless, port 39411 —
`sf2-review/http9.mjs`, `http9b.mjs`), same server, same minute:

```
doctor R8 (cont'd) 200x6000   chars=380717  HTTP 400 in    114ms  REJECTED   <- the fix works
doctor R9 50 distinct x 6000  chars=292817  HTTP 200 in  22560ms  *** REACHED ANALYZER ***
doctor R9 50 distinct x18000  chars=860417  HTTP 200 in  71880ms  *** REACHED ANALYZER ***
```

**In-process cost surface** (`sf2-review/cost9.mjs`, `dsweep.mjs`, `skew.mjs`, `plaus.mjs`;
`runScriptDoctor` on the worktree's own modules). Fixed 6,000 occurrences, ~310–334 KB each —
only the CAST SHAPE varies:

| shape (6,000 cue occurrences, ~320 KB) | distinct | guard | `runScriptDoctor` |
|---|---|---|---|
| uniform cast | 2 | ACCEPT | 2,111 ms |
| uniform cast | 8 | ACCEPT | 4,787 ms |
| uniform cast | **50** | **ACCEPT** | **24,119 ms** |
| uniform cast | 200 | REJECT (frequent-cue-lines) | — |
| uniform cast | **520** | **ACCEPT** | **322,435 ms (5m22s)** |
| skewed: 40 majors + 480 one-line minors | 520 | ACCEPT | 3,976 ms |
| **the repo's own "plausible feature" cue metrics** (8 leads over 15 lines + 512 minors under it, `distinct=520 occurrences=6,300 frequentCount=8`, 333,862 chars) | 520 | **ACCEPT** | **343,598 ms (5m44s)** |

and along the size axis at distinct = 50 (`cost9.mjs`): 1,000 occ → 4,557 ms · 3,000 →
11,571 ms · 6,000 → 22,275 ms · 12,000 → 48,631 ms · 18,000 → 71,880 ms over HTTP.

**Why every bound misses.** `MAX_FOUNTAIN_FREQUENT_CUE_LINES = 50` (`validation.ts:439`,
checked at `:773`) only counts a line once it occurs **more than 15** times
(`FREQUENT_CUE_OCCURRENCE_THRESHOLD`, `:426`), and it fires on `> 50`, so:

* 50 distinct names × 360 lines each → exactly 50 frequent lines → not `> 50` → accepted;
* 520 distinct names × 11 lines each → **zero** frequent lines → nothing to count;
* `MAX_FOUNTAIN_CUE_WEIGHT = 10,000,000` is 3× above the 3.12 M weight of the 5m44s payload
  and 11× above the 900 K weight of the 71.9 s one;
* `MAX_FOUNTAIN_DISTINCT_CUE_LINES = 1,500` is 3× above 520.

The guard's own documented calibration grid (`validation.ts:386-398`) never sampled this
region: its `distinct=50` rows stop at 20 repeats (1,000 occurrences, 217 ms) and its
`distinct=800`/`1,500` rows only go to 20 repeats as well. The measured cost surface is not
"weight" — at the SAME weight (3.12 M) the uniform 520-name cast costs 322 s and the skewed
one 4 s — it tracks the number of distinct cue lines the analyzer actually recognizes as
speaking parts times the text volume, and that quantity is unpriced by all three bounds in the
band "many distinct names, each speaking 2–15 times".

**Two facts make this a blocker rather than a footnote.**
1. `/api/scriptide/doctor` is unauthenticated and on `gameLimiter` (120/min per IP) against a
   2-worker pool. One IP can queue 120 × 5-minute analyses a minute.
2. The shape that costs 5m44s is the repo's OWN model of a legitimate feature-length script
   (the margin-proof fixture at `tests/security/fountain-shape-guard-cue-parity.test.ts:426`,
   which prints `distinct=520 occurrences=6332 frequentCount=8` on every run and asserts only
   that it is NOT REJECTED — it never measures what accepting it costs). Either that fixture
   is unrealistic (real scripts are cheap: the 54 tracked fixtures top out at **57** cue
   occurrences and the 20 CC0 corpus scripts at **45** — `sf2-review/fixstats.mjs`; my skewed
   40-major/480-minor feature costs 4.0 s), in which case the guard's advertised margins are
   measured against the wrong thing, or it is realistic, in which case the product analyses a
   plausible script in 5m44s. Both readings need an answer; neither is in the report.

**Worst legal request I can construct** (guard verdict measured, cost NOT run): 50 distinct
names with minimal adjacent dialogue — **880,277 chars, 129,450 occurrences, weight 6.47 M →
ACCEPT** (`fixstats.mjs`).

**Pre-existing, not a regression.** `main@4cbaf02f` accepts the identical payloads
(`sf2-review/main-guard.mjs`: `distinct=50 occ=6000`, `distinct=520 occ=6000`, and
`50 × 18,000` all `*** ACCEPT ***`). I still return it as a blocker because (a) the review
criterion for this round is an accepted payload over 10 s and these are 22 s to 5m44s, and
(b) the lane's own artifact overclaims closure of the pattern: `validation.ts:552-559` says
the oracle means "the next shape variance in ANY of these three predicates is caught by that
invariant directly, rather than needing a ninth review round to notice it". The oracle holds
perfectly on every payload above (guard count = pipeline count exactly) while a 5m44s request
is served. The invariant proves the guard SEES every character block; it says nothing about
whether the guard REJECTS in time. That distinction belongs next to the invariant, and the
frequency-band hole belongs in the bounds.

I am not prescribing a constant. The shape of a fix that has 1–2 orders of magnitude of margin
over everything real in this repo: price the band the frequency threshold ignores (a total
cue-occurrence cap, or counting a line as "frequent" from 2 occurrences with a
correspondingly larger allowance), and extend the margin-proof block to assert a measured
`runScriptDoctor` CEILING on the accepted region rather than only non-rejection.

## 3. Round-8 before/after, reproduced on both trees

**Before — `main@4cbaf02f`, in-process** (`sf2-review/main-r8-cost.mjs`; no server booted from
the main checkout, so nothing was written there):

```
chars 374717  guard ACCEPT  charBlocks 6000
main runScriptDoctor ms = 99124
```

(The finding recorded 82,401 ms on an idle box; 99.1 s here is the same measurement under
load average ≈2.4. Same verdict, same 6,000 pipeline character blocks.)

**After — worktree, over real HTTP** (`sf2-review/http9.mjs`, port 39411):

```
POST /api/scriptide/doctor  chars=380717  HTTP 400 in 114ms
  {"error":"fountain: must not contain more than 50 distinct all-caps character-cue-shaped
   lines that each occur more than 15 times …"}
```

The lane's "~15 ms" is the in-test pure-function number; 114 ms is the end-to-end HTTP round
trip including body transfer of 380 KB. Both are the same fix. The `/fix` `candidateFountain`
path carries it too (`fountain-shape-guard-cue-bypass.test.ts`, 57/57 pass).

---

## 4. The oracle test: real, not vacuous — with one honest caveat

Read at `tests/security/fountain-shape-guard-cue-parity.test.ts:960-1140`.

* It compares against the **real pipeline** — `parseFountain(normalizeScreenplay(text))`
  filtered to `type === 'character'` (`:979`), not a re-derivation of the guard's own rules.
  That is the right oracle.
* The generator does produce the families it names: at attack scale it asserts
  `assert.equal(pipelineCount, 6000)` / `12_000` **before** the inequality (`:1108`, `:1123`,
  `:1136`), so those three cannot pass by producing nothing.
* The caps-heavy case asserts BOTH sides are 0 (`:1085-1090`), so the invariant cannot be
  satisfied by blanket over-rejection.
* **Caveat (non-blocking):** the small grid (14 families × gaps 0–5, `DISTINCT=4`,
  `OCCURRENCES=12`) has **20 of 84 cells where the pipeline produces 0 blocks**, so those
  cells are trivially true. I measured the whole grid (`sf2-review/vac.mjs`, `vac.log`): the
  caret families are 0/0 at every gap, `41+ char cue` is live only at gap 0, and the three
  lowercase-extension families are 0 at gap 0 (correctly — `parseFountain` rejects a lowercase
  tail adjacent). 64 of 84 cells are live, every family is live at ≥1 gap, and the three
  attack-scale cases are pinned — so the test would have caught rounds 4–8. Adding a
  per-family `assert.ok(pipelineCount > 0)` where it should be >0 would make the grid
  self-guarding against a future generator regression.
* **The structural caveat is §2's:** the oracle asserts `guardCueOccurrences >= pipelineCount`
  and never that the guard REJECTS. It cannot see a bound-calibration hole.

---

## 5. My own ninth-round sweep — 40 shapes, zero oracle violations

`sf2-review/inv9.mjs` + `r9a.mjs`/`r9b.mjs` compute, for each payload, `guardCueOccurrences`,
the real pipeline's `character`+`dual_dialogue` block count, and the guard verdict
(logs: `r9a.log`, `r9b.log`). Every shape the brief named, plus more:

REJECTED with guard count ≥ pipeline count (6,000/6,000 unless noted): lowercase `(cont'd)`,
lowercase `(mumbling)`, lowercase `(o.s.)`, trailing tab, trailing NBSP, leading spaces,
leading tab, **CRLF document**, cue→parenthetical→dialogue, gap = 5 and gap = 9 blank lines,
whitespace-only gaps (tab and NBSP), Cyrillic, Greek, accented, `#` in the name, no scene
heading anywhere, mixed families in one document, 5-word and 31-char cues *adjacent*,
all four boneyard variants (incl. 200 × 45,000 = 2.45 MB), terminal cues with nothing after.

ACCEPTED, and **pipeline block count = 0** in every case (so not a miscount): `@`-forced cues
(upper and lower — `parseFountain` has no `@` support, `src/lib/fountain.ts:137`), caret dual
dialogue (tight and spaced), centered `>TEXT<`, lowercase and Title-case names, `.`-forced
headings only, 5-word/31-char/period-terminated/`X TO:` cues when *blank-gapped*.

Legitimate-script regression on this tree (`sf2-review/legit9.mjs`): caps-heavy feature,
caps-heavy + `CUT TO:`, the two-hander, and a `(cont'd)`/`(V.O.)` two-hander — all
**ACCEPTED at gaps 0, 1, 2 and 3**; the commented-out 50-name cast list inside `/* … */`
**ACCEPTED**; all **54 tracked `.fountain` fixtures accepted** (`fixstats.mjs`). Widening the
gate with `isCharacterCue` did not cost a single legitimate acceptance.

---

## 6. D1 — driven on both routes, and the panel branch is reachable

`sf2-review/d1f2.mjs`, same prose to both routes:

```
doctor                          200   87ms  {"formatUnrecognized":true,"reason":"No scene headings such as INT. or EXT. …"}
fix (both prose)                200    8ms  {"usedLLM":false,"source":"writer","comparable":false,"formatUnrecognized":true,"field":"fountain","reason":<identical>,"hint":<identical>}
fix (base script, cand prose)   200    5ms  … "field":"candidateFountain" …
fix (base prose,  cand script)  200    3ms  … "field":"fountain" …
fix (real pair, control)        200 1480ms  before/after/cleared/introduced — unchanged behavior
```

`reason` and `hint` are byte-identical to `/doctor`'s (both read
`FORMAT_UNRECOGNIZED_REASON`/`_HINT`, `scriptide.ts:448-451`), no `health`/`verdict`/`before`/
`after`/`cleared`/`introduced` leaks, and the doctor never runs (3–8 ms vs 1,480 ms).
`baselineOnlySignals(fountain)` is still called on that path but returns `{}` for unscorable
text (`scriptide.ts:120` — `if (!before.scored) return undefined`), so no half-invented
signals ship.

**Panel:** the new branch (`ScriptDoctorPanel.tsx:2123`) sits inside `if (!hasCandidate)`
(`:2101`, `hasCandidate = (hasSpanCandidate || isWriterCandidate) && !!result.before &&
!!result.after`). The short-circuit response carries no `candidateFountain`, no `before`, no
`after`, so `hasCandidate` is false and the branch fires before the generic
"no fix could be generated" fallback. The response reaches it: the fetch is a 200, so it
lands in `setVerifyRun({ result: data, … })` (`:3762`) rather than the `!res.ok` throw. There
is no React render harness in this repo, so this is verified by reading the path and by the
HTTP shape above — the lane says so plainly rather than claiming a driven check it did not do.

---

## 7. F1 / F2 — reproduced, and the `/explore` revert is correct

**F1** (`sf2-review/f1f2.mjs`, live server):

```
501 ops -> 400        500 ops -> 200
commit 0..3 -> 200 (93 / 262 / 703 / 978 ms)
F1 /whatif/doctor -> 200 in 1431ms  responseBytes=1185
   base.tooLarge=true  base.health=undefined  'fountain' in base=false  sceneCount=4
   contentHash=22843d99f1…  branch healthDelta absent
```

The finding's shape cost 26.5 s and a 3.85 MB body; it now costs **1.4 s and 1.2 KB**. The
narrowing (200 + `tooLarge` per draft instead of a request-level 4xx) is declared in the
report and is the better shape — it lets one oversized branch be refused while the base still
scores. But see REVISE #2: the withheld `fountain` is a new state the client does not know
about.

**F2**: bogus opId → `404 {"error":"opId \"nope:0\" not found in this session's causal
model"}` on a session **with** real ops and on an empty one. Both reproduced.

**The `/explore` revert — I checked it rather than taking the report's word**
(`sf2-review/explore9.mjs`, one seeded 2-scene session, real vs bogus opId):

```
REAL  opId: baseline===intervened=false, consequences=[removed, clock_shift, tension_shift],
            branch scores differ per branch
BOGUS opId: baseline===intervened=TRUE,
            consequences=[{"kind":"no_effect","description":"no story event with id \"nope:0\"
                           exists yet in this session, so nothing changed"}]
```

That is honest, not a fabricated delta wearing a different name: the response *names the
missing id*, reports no change, and carries no doctor-derived number anywhere (the branch
`scores` are `generateBranchField`'s own heuristics for "what could you add next", produced
from session state and not from the intervention). This is a different animal from
`/whatif/doctor`'s pre-fix `healthDelta: +23.3` for a nonexistent op. The lane reverted a
guard that would have broken a deliberate, tested contract
(`tests/routes/nvm-whatif-room.test.ts:112`) and documented the scope decision at
`twin-whatif.ts:28-51`. **I agree with the revert.** One non-blocking note: a caller that
reads only `branches` still sees two scored-looking branches for a nonexistent op — the
`no_effect` consequence is the only marker.

---

## 8. E1 / E2 — letter and HTML now agree per state

`sf2-review/e1.mjs`, both export routes, same payload:

| draftRank | letter | HTML | note present |
|---|---|---|---|
| `{rank:1, of:1, unscored:5}` | 200 | 200 | **both true** |
| `{rank:1, of:1}` | 200 | 200 | both false (correct — nothing unscored) |
| `{rank:3, of:6, unscored:1}` | 200 | 200 | both true |
| `{rank:1, of:1, tied:true}` | **400** | **400** | E2 — `tied requires of >= 2` |

The letter's first-draft sentence is now exactly:

```
This is your first saved draft of this script — a rank among your own drafts will appear
after your next run or save. 5 of 6 runs and saved drafts of this script are unranked
(saved without a fresh diagnosis).
```

which is what `docs/CLAIMS_REGISTER.md:111` (row 61) claims, verbatim and specifically — the
row names the arm, the finding, the two surfaces that already had the note, and the test.
The refactor also removed the duplicated inline IIFE, so both arms now read one
`appendedNote` (`coverage-letter.ts:274-275`) — one implementation, per §1 of the standard.

---

## 9. F4 — "structurally unreachable" verified by reading the route, not the report

The claim checks out. `base.sceneCount` is `commits.length` of the LIVE commits
(`server/nvm/whatif/materialize.ts:114`, called at `:124` with
`commits.filter(c => !c.reverted)`), and `buildSCM` builds `nodes` 1:1 from
`stage.getLiveCommits()` (`server/nvm/twin/scm.ts:29-40`). So a valid `opId` implies ≥1 node
implies ≥1 live commit implies `base.sceneCount >= 1`; with F2's 404 in front
(`twin-whatif.ts:193`), the zero-scene base is unreachable through this route. Variants
inherit the base's commits plus branch ops, so they cannot be zero-scene either. The
`unscorableDraft` fix (`twin-whatif.ts:290-296`) stays as defense-in-depth, and the lane says
plainly that it verified this by reading. Correct on both counts.

---

## 10. Gates I re-ran myself (foreground, exit codes)

```
node scripts/check-scoring-receipt.mjs main..HEAD   exit 0  "no scoring-path files changed"
npm run check-no-console                            exit 0  296 files, 23 quarantine entries
node scripts/check-doctor-output-identity.mjs --tree /home/user/STORYMACHINE --out …/ident-main   exit 0 (45 snapshots)
node scripts/check-doctor-output-identity.mjs --tree <worktree>              --out …/ident-wt     exit 0 (45 snapshots)
node scripts/check-doctor-output-identity.mjs --compare …/ident-main …/ident-wt                   exit 0
    OUTPUT IDENTITY: PASS — all 45 reports are byte-identical (analyzedAt excluded)
```

Touched test files, `node --experimental-strip-types`, all exit 0:
`fountain-shape-guard-cue-parity 383` · `fountain-shape-guard-cue-bypass 57` ·
`scriptide-fix-format-guard 9` · `nvm-whatif-doctor 9` · `nvm-whatif-room 8` ·
`export-coverage-letter 23` · `draft-rank-copy-consistency 21`.

Not run in this pass, per the budget instruction, and stated so the merge record is honest:
full `npm test` (the lane reports 12,460/0), `lint`, `check-docs`, `honesty-audit`,
`check-brain`, `fuzz-routes`, `pure-core-boundary`, the browser battery.

---

## 11. Non-blocking observations (recorded, not for the REVISE list)

**(a) Duplicate import.** `server/routes/nvm/twin-whatif.ts:19` imports
`fountainShapeRejectionReason` from `'../../lib/validation.ts'` in a second statement while
`:12-16` already imports from the same module. Legal, but the file now has two import sites
for one module.

**(b) `exceedsGuard` runs the shape walk twice per draft.** `twin-whatif.ts:305` (scoring
decision) and `:323` (`responseFountainOf`) each call
`fountainShapeRejectionReason(fountain)` on the same text; on a 1 MB draft that is two full
O(n) walks where one memoized result would do. Immaterial next to the analysis it replaces.

**(c) The `intervened: ''` placeholder** (`twin-whatif.ts:356`) is safe today —
`WhatIfPanel.tsx:1185` renders `labResult.intervened` (the `/explore` snapshot object), not
this field — and the comment says so. Worth keeping true.

---

## 12. Verdict

**REVISE**, on the three numbered items below. To be explicit about proportion: everything
this brief asked for is built, reproduces, and is honestly reported — including the two
narrowings (F1's per-draft 200, F2's `/explore` revert), both of which I checked and both of
which are the better call. Item 1 is a hole the lane's brief did not name and its oracle
cannot see; I would accept a scoped bound fix with a margin proof, not a redesign.

### The numbered list

1. **BLOCKER — `server/lib/validation.ts:409-439` (the three cost bounds): the guard's
   accepted region contains requests costing 22 s to 5m44s.** The union predicate and the
   oracle are correct and I could not break either; the bounds are what fails. Reproduce, on
   this tree, keyless server on port 39411 (`sf2-review/http9b.mjs`, `plaus.mjs`, `dsweep.mjs`):
   `50 distinct ALL-CAPS names × 18,000 ordinary cue+dialogue pairs, 860,417 chars →
   POST /api/scriptide/doctor HTTP 200 in 71,880 ms`; `520 distinct × 6,000, 317,770 chars →
   ACCEPT, runScriptDoctor 322,435 ms`; the repo's own plausible-feature cue metrics
   (`distinct=520 occurrences=6,300 frequentCount=8`, 333,862 chars) → **ACCEPT,
   runScriptDoctor 343,598 ms**. `MAX_FOUNTAIN_FREQUENT_CUE_LINES` fires on `> 50` lines that
   each occur `> 15` times (`validation.ts:426,439`), so a 50-name cast at 360 lines each
   (exactly 50) and a 520-name cast at 11 lines each (zero) are both invisible to it, while
   `MAX_FOUNTAIN_CUE_WEIGHT = 10,000,000` sits 3–11× above the weights that cost minutes.
   Price the 2–15-occurrence band, and extend the margin-proof block
   (`tests/security/fountain-shape-guard-cue-parity.test.ts:426`) to assert a measured
   `runScriptDoctor` ceiling on the ACCEPTED region, not only non-rejection. Headroom is huge:
   the 54 tracked fixtures top out at 57 cue occurrences, the CC0 corpus at 45, and a skewed
   40-major/480-minor feature of the same size costs 4.0 s. Pre-existing on `main` (same
   payloads accepted there) — fix it here or hand it to a follow-up lane with these numbers,
   but do not merge with `validation.ts:552-559` claiming the pattern is closed when the
   oracle holds exactly on every payload above.

2. **MEDIUM — F1's withheld `fountain` is a new response state the only client that reads it
   does not know about.** `server/routes/nvm/twin-whatif.ts:337,347-349` now omit `fountain`
   from a base/branch the size guard refused, but `src/components/WhatIfPanel.tsx:151` still
   types `fountain: string` (required) inside `WhatIfDoctorDraft`, the response is cast with
   `as WhatIfDoctorResult` (`:841`) so `tsc` cannot catch it, the Promote control is offered
   for any branch that has a doctor readout at all (`:586`, no gate on `analysisComplete`),
   and `promoteBranch` hands the editor `text: branch.fountain` (`:873`) — `undefined` for a
   `tooLarge` branch. `tooLarge` is also absent from the client types, so the panel has no way
   to say WHY the score is missing, which was the stated point of naming it
   (`twin-whatif.ts:293`). Make `fountain` optional in the two client interfaces, gate Promote
   on its presence, and render the `tooLarge` reason.

3. **LOW — D4 stops at the wire.** `server/nvm/analyze/fix-delta.ts:50-61,133` computes and
   ships `identicalAnalysis` (verified live: a trailing-whitespace-only candidate returns
   `identicalAnalysis=true` with different `contentHash`es), but nothing renders it — `grep -rn
   identicalAnalysis src/` returns nothing, so the receipt still shows two hashes for one
   document with no "no measured difference" line. The finding's own wording was "so the
   receipt can say 'no measured difference' rather than implying one"; the receipt still does
   not say it. One line in `ScriptDoctorPanel.tsx`'s receipt card finishes it.

---

## Round 2 — re-check of `7321b502` (tag `audit/2026-09-05/server-fixes-2-round2`)

**Same reviewer** (LANE_STANDARD §6). Same worktree; second commit on `f7466fb0`,
`git diff f7466fb0..7321b502` = 6 files +597/−17 (`docs/CLAIMS_REGISTER.md`,
`server/lib/validation.ts`, `src/components/WhatIfPanel.tsx`,
`src/components/scriptide/ScriptDoctorPanel.tsx`, and 2 test files — **no scoring-path file
edited**; `voice-delta.ts` and `fountain-analyzer.ts` are read-only in this range, confirmed by
`--name-only`). Worktree `git status --porcelain` empty. Probes in `<session scratch>/sf2-review/`
(`r2attack.mjs`, `r2attack2.mjs`, `r2attack3.mjs`, `r2verify.mjs`, `oldfix.mjs`, `http2.mjs`).
One server booted on port 39421 for the HTTP repros, killed (`pgrep -af server.ts` clean).

**Verdict: REVISE** — items 2 and 3 are done and accepted; item 1's fix is real but **still
bypassed twice**, one of them by ordinary imported-screenplay formatting rather than by an
attack shape.

### 2.1 My three items against the diff

| # | Round-1 item | Status | Evidence |
|---|---|---|---|
| 1 | BLOCKER — accepted region contains 22 s–5m44s requests | **PARTIALLY FIXED — reopened, see §2.3** | New bound `MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT = 300_000` (`server/lib/validation.ts:553`), tracked per base name (`stripCueExtensionForVoiceGrouping` `:717`, `countWords` `:731`, `voiceKey`/`dialogueWords` on `GuardCueOccurrence` `:690-712`) and applied once every character clears `VOICE_ELIGIBLE_MIN_WORDS` (`:536`) at `validation.ts:985-1008`. **All five of my round-1 payloads now reject by name** and the legitimate shapes still pass (§2.2). The driver diagnosis is correct and I verified it in the source, not the report. But the new bound is defeated by a 35-character addition, and by the double-spaced wrapped-dialogue shape the normalizer exists to handle (§2.3). |
| 2 | MEDIUM — F1's withheld `fountain` not wired into the client | **DONE** | `WhatIfPanel.tsx:151` `fountain?: string` (now honestly optional) and `:160` `tooLarge?: boolean`; `DoctorReadout`'s unscored branch renders a third distinct sentence at `:522-531`; Promote gated on `doctor.fountain` at **both** render sites (`:611` button, `:627` confirm dialog) and again inside `promoteBranch` (`:901` `if (!branch.fountain) return;`) so a render-site regression fails closed. Register row 63 names the sentence and the gate. Verified by reading all four call sites (no React render harness exists in this repo — same method round 1 used, and stated as such). |
| 3 | LOW — D4 stops at the wire | **DONE** | `ScriptDoctorPanel.tsx:1972-1980` adds `identicalAnalysis?: boolean`; the receipt renders "No measured difference — …" at `:2240-2251`, gated on `result.identicalAnalysis && before.contentHash !== after.contentHash` (correct — when the hashes agree the health/verdict line already says nothing changed). `tests/core/fix-receipt-identical-analysis-copy.test.ts` 4/4 pass; register row 62. |

### 2.2 What the new bound does close — reproduced

`sf2-review/r2verify.mjs`, guard only, on this tree:

```
round-1 payload 1 (50 x 18,000)                 chars=860417  REJECT [MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT]
round-1 payload 2 (520 x 6,000)                 chars=317770  REJECT [MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT]
round-1 payload 3 (plausible-feature metrics)   chars=333862  REJECT [MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT]
round-1 50 x 6,000  (was 22.5s)                 chars=311890  REJECT [MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT]
round-1 50 x 12,000 (was 48.6s)                 chars=623890  REJECT [MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT]
round-1 skewed legit feature (was 4.0s)         chars=317490  *** ACCEPT ***

tracked .fountain fixtures: 54, rejected: 0
calibration corpus: 20, rejected: 0
P0 sample: accepted
```

**The driver claim is true and I checked the source, not the report.**
`server/nvm/analyze/voice-delta.ts:174-181` really is all-or-nothing —
`for (const char of characters) { … if (totalWords < MIN_WORDS) return { pairs: [], scored: false }; }`
before the O(distinct²) double loop at `:187-188` — and it is called **once, document-wide**
(`fountain-analyzer.ts:2482`, over a `dialogueByCharacter` built from every scene unit at
`:2474-2481`), not per scene, so one ineligible character really does kill the whole pass.

**The coordinator's first question, answered by measurement** (`sf2-review/r2attack.mjs`,
200 uniform characters × 2,000 occurrences, 103 KB):

```
A plain uniform (no walk-on)         guard=REJECT (MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT)   analyzer speakers=200, 0 under 30 words
B + ordinary 2-word walk-on          guard=ACCEPT   analyzer speakers=201, 1 under 30 words   runScriptDoctor=813ms
```

So for an *ordinary* ineligible character the design is sound: the analyzer sees the same
short character the guard did, `analyzeVoices` abstains, and the cost really is ~0.8 s. The
"only when every character is eligible" trigger is not naive — it is faithful **whenever the
guard's idea of a character's dialogue matches the analyzer's**. That is the assumption both
bypasses below break.

### 2.3 BLOCKER (reopened) — two ways to make the guard believe a character is ineligible when the analyzer does not

**Bypass A — a parenthetical-only walk-on (35 characters of payload).** The guard credits a
cue with the word count of the next non-blank line whatever that line is
(`validation.ts:905-909`, `dialogueWords: countWords(lines[dialogueLineIdx]!)`), so
`WALKON` followed by `(beat)` registers as a 1-word — therefore ineligible — character and
`allEligible` goes false, skipping the whole bound. The analyzer never sees that character at
all: `extractSceneContent` (`fountain-analyzer.ts:546-548`) explicitly skips
`parenthetical`-typed blocks ("parenthetical/transition/shot/… carry no signal for these
heuristics and are intentionally skipped"), so `WALKON` never enters `dialogueByCharacter`,
every remaining character clears `MIN_WORDS`, and `analyzeVoices` runs in full.

```
sf2-review/r2attack.mjs   (200 uniform names x 2,000 occurrences)
  A plain uniform                       guard=REJECT
  C + "WALKON\n(beat)\n"                guard=*** ACCEPT ***   analyzer speakers=200, 0 under 30 words
                                        runScriptDoctor=43,600ms
sf2-review/http2.mjs      (live server, port 39421)
  A parenthetical walk-on 200x2000  chars=103,722  HTTP 200 in 42,749ms  *** REACHED ANALYZER ***
```

**Bypass B — a double-spaced, hard-wrapped script: the ordinary imported-PDF shape.** The
guard counts ONE line (`dialogueLineIdx` is the first non-blank line after the gap), but
`normalizeScreenplay` JOINS a wrapped dialogue paragraph into a single dialogue line
(`screenplay-normalizer.ts:176-180`, the `mode === 'dialogue'` branch), so the analyzer pools
every wrapped fragment. Guard: 5 words × 4 occurrences = 20 → "ineligible" → bound skipped.
Analyzer: 15 words × 4 = 60 → eligible → O(distinct²) runs.

```
sf2-review/r2attack3.mjs
  double-spaced wrapped D=200 occ/char=4 wrap=3  chars=63,070   guard=*** ACCEPT ***
    analyzer speakers=200  min words=60  under30=0            runScriptDoctor=33,869ms
  double-spaced wrapped D=200 occ/char=8 wrap=3  chars=126,150  guard=REJECT
    (the guard's OWN count finally crosses 30 — the boundary is its under-count, not the cost)
sf2-review/http2.mjs      (live server)
  B double-spaced wrapped 200x4     chars=63,070   HTTP 200 in 33,193ms  *** REACHED ANALYZER ***
```

63 KB — 7% of the size ceiling — for 33 s of pooled CPU, on an unauthenticated `gameLimiter`
route, in the exact format `screenplay-normalizer.ts`'s own header says real imports arrive in
("they are double-spaced … and their dialogue/action is hard-wrapped mid-sentence"). Cost is
quadratic in the cast size, and `MAX_FOUNTAIN_DISTINCT_CUE_LINES` allows 1,500, so this shape
has a great deal of room above 33 s; I did not run the larger one.

Note what is NOT broken, since I tested it: in a SINGLE-spaced document `parseFountain` types
only the first line of a wrapped paragraph as `dialogue` (the rest fall through to `action`),
so guard and analyzer agree and the same shape costs 748 ms (`r2attack2.mjs`) — the divergence
is created by the normalizer's reflow, not by wrapping as such. And the base-name pooling the
coordinator asked about is correct in the safe direction: `stripCueExtensionForVoiceGrouping`
(`validation.ts:717-726`) mirrors `normalizeCharacterName` (`fountain-analyzer.ts:505-512`)
regex for regex, so `(V.O.)`/`(O.S.)`/`(CONT'D)`/`^` variants merge into one character in both
places — pooling raises a character's counted words, it cannot be used to keep the per-base
weight low.

**Both bypasses are the round 4–8 pattern wearing new clothes:** the guard maintains a second,
hand-built model of what the pipeline does — last time "what is a cue", this time "what counts
as a character's dialogue" — and diverges from it. Round 1's oracle exists for the first
model; there is no oracle for the second. The property that would have caught both, in the
same style and testable in the same file: over the generated corpus, for every base name,
`guardWords(name) >= pipelineWords(name)` where `pipelineWords` is built from
`parseFountain(normalizeScreenplay(text))`'s `dialogue` blocks — and, correspondingly, the
guard's ineligible set must be a SUBSET of the pipeline's. Both bypasses violate that
inequality directly (A: the guard invents a character the pipeline has none of; B: 20 < 60).

### 2.4 The fixture edit is legitimate — I measured it rather than taking the report's word

`buildPlausibleFeature()`'s minors went 6 occurrences → 2
(`tests/security/fountain-shape-guard-cue-parity.test.ts:410`), which conveniently makes the
fixture pass the new bound. I rebuilt both variants faithfully and timed the doctor on each
(`sf2-review/oldfix.mjs`):

```
minorOccurrences=2 (post-change)  chars=248,178  words=44,342  guard=ACCEPT   runScriptDoctor=  2,626ms
minorOccurrences=6 (pre-change)   chars=270,557  words=48,124  guard=REJECT   runScriptDoctor= 72,041ms
```

So the pre-change fixture was a genuine 72-second payload and rejecting it is cost-correct;
the edit records reality rather than hiding a false positive. **Non-blocking consequence worth
owning in the copy:** a large ensemble in which *every* speaking part clears ~30 words now
gets a 400 rather than a slow analysis. The new test's own log line is admirably honest about
the same thing ("the hypothetical weight IF every one of them were eligible would be 3,405,600
against a 300,000 bound"), and the rejection message should say plainly that this is a
size-of-cast limit, not a malformed-input error.

### 2.5 Gates I re-ran (foreground, exit codes)

```
node scripts/check-scoring-receipt.mjs main..HEAD          exit 0  "no scoring-path files changed"
npm run check-no-console                                   exit 0  296 files, 23 quarantine entries
check-doctor-output-identity --tree <worktree> --out …     exit 0  45 snapshots
check-doctor-output-identity --compare <main> <worktree>   exit 0  PASS — all 45 byte-identical
node --experimental-strip-types tests/security/fountain-shape-guard-cue-parity.test.ts   388 pass / 0 fail
node --experimental-strip-types tests/core/fix-receipt-identical-analysis-copy.test.ts     4 pass / 0 fail
```

Not re-run this round, per the budget: full `npm test` (lane reports 12,469/0), `lint`,
`check-docs`, `honesty-audit`, `fuzz-routes`, the browser battery.

### 2.6 Verdict

**REVISE.** Items 2 and 3 are complete, correct, and verified. Item 1's bound is a real
improvement — it closes every payload I reported in round 1, on the right diagnosis, with the
legitimate corpus untouched — but it is not yet a bound: two shapes, one of them the ordinary
imported-screenplay format, walk straight past it into 33–43 s analyses.

### The numbered list

1. **BLOCKER — `server/lib/validation.ts:905-909` (`dialogueWords` counts ONE line) and
   `:985-1008` (the `allEligible` trigger): the new voice bound is bypassed by any character
   the ANALYZER pools differently than the guard does.**
   *(a) Parenthetical-only walk-on:* appending `INT. HALL - DAY\n\nWALKON\n(beat)\n\n` to a
   payload the bound rejects flips it to accepted — `extractSceneContent`
   (`fountain-analyzer.ts:546-548`) skips `parenthetical` blocks, so that character never
   reaches `dialogueByCharacter` and `analyzeVoices` does not abstain. Reproduce:
   `node --experimental-strip-types .../sf2-review/r2attack.mjs` → variant A REJECT, variant C
   ACCEPT + `runScriptDoctor=43,600ms`; over HTTP, 103,722 chars → **200 in 42,749 ms**.
   *(b) Double-spaced hard-wrapped dialogue (the imported-PDF shape):* the guard counts the
   first wrapped line only, while `normalizeScreenplay` joins the paragraph, so guard-words
   (20) < analyzer-words (60). Reproduce: `.../sf2-review/r2attack3.mjs` → 63,070 chars,
   guard ACCEPT, `runScriptDoctor=33,869ms`; over HTTP **200 in 33,193 ms**
   (`.../sf2-review/http2.mjs`). Fix both by counting every line of the dialogue block the
   context check already located (not just the first) and by not crediting a cue whose only
   following content is a parenthetical — and pin it with the missing oracle:
   `guardWords(baseName) >= pipelineWords(baseName)` over
   `parseFountain(normalizeScreenplay(text))`, plus "guard's ineligible set ⊆ pipeline's",
   over the same generated corpus round 1's cue oracle already walks. Both bypasses violate
   that inequality directly, so the property is the test.

2. **LOW (copy, non-blocking on its own — fold into the same round) —
   `server/lib/validation.ts:1004`: say what the rejection actually means.** The message
   ("must not contain more than 300000 in (distinct speaking characters × their total pooled
   dialogue words) once every character has enough dialogue to be individually voice-scored")
   is a bound name, not an explanation, and the state it describes is a legitimate large
   ensemble: I measured the pre-round-2 `buildPlausibleFeature()` fixture at
   **72,041 ms** and now correctly rejected (`sf2-review/oldfix.mjs`), so real scripts of that
   cast shape will hit a 400. One sentence naming it as a cast-size/analysis-cost limit rather
   than a malformed-input error, and a matching note wherever the route surfaces it, keeps the
   copy honest under LANE_STANDARD §2's last bullet.

---

## Round 3 — re-check of `e074328f` (tag `audit/2026-09-05/server-fixes-2-round3`)

**Same reviewer.** Worktree rebased onto `main@60bce1a6`; third commit,
`git diff 326cde3a..e074328f` = 4 files +460/−7. Worktree `git status --porcelain` empty; main
checkout untouched. Probes in `<session scratch>/sf2-review/` (`r3lib.mjs`, `r3attack.mjs`,
`r3cr.mjs`, `r3le.mjs`, `r3verify.mjs`, `http3.mjs`). One server on port 39431, killed
(`pgrep -af server.ts` clean).

**Verdict: REVISE** — both named bypasses are genuinely closed and I could not reopen either;
the oracle is real; the copy, theme and register items are done. But the guard's word/eligibility
model still diverges from the analyzer's on **two further axes I found this round**, each worth
~43 s of accepted CPU, and one of them (CR-only line endings) zeroes **every** bound in the file,
not just this one.

### 3.1 What is closed — verified independently

`sf2-review/r3verify.mjs` (guard only, this tree):

```
round-2 bypass A (parenthetical walk-on)   chars=103,722  REJECT [MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT]
round-2 bypass B (double-spaced wrapped)   chars= 63,070  REJECT [MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT]
round-1 payload 2 (520 x 6,000)            chars=311,320  REJECT [MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT]
legit: normal double-spaced two-hander     chars=  3,702  *** ACCEPT ***
legit: script with parenthetical bit parts chars=  5,562  *** ACCEPT ***
tracked fixtures 54: rejected 0 · calibration 20: rejected 0 · P0 sample: accepted
```

The implementation matches the report: `isDoubleSpacedForVoiceGrouping` (`validation.ts:749-776`)
replicates `screenplay-normalizer.ts:118-136` formula-for-formula and is computed once per
document (`:834`); `accumulateDialogueWords` (`:778-820`) walks forward from the dialogue index the
existing context check already located, skips blanks and `(…)` lines, breaks at a scene heading or
the next `isCharacterCue`, joins across gaps only when the document is double-spaced, and is bounded
at 200 lines; the zero-word exclusion is `nonZeroVoiceWordCounts` (`:1079-1080`). The two
divergences I named in round 2 are addressed at their root, not pattern-matched.

**Every other shape the coordinator listed came back clean** (`sf2-review/r3attack.mjs`, which
reports guard verdict, guard names, the analyzer's own truncation-aware `dialogueByCharacter`
reconstruction, whether `analyzeVoices` would abstain, and any word-oracle violation):

```
R4-1  walk-on with (beat) + a 1-word dialogue line   ACCEPT  analyzerAbstains=true   violations=0
R4-1b walk-on with a 1-word dialogue line only       ACCEPT  analyzerAbstains=true   violations=0
R4-3  cues with trailing spaces                      REJECT                          violations=0
R4-4  dialogue starting "(beat) then some words"     REJECT                          violations=0
R4-5  dual-dialogue caret cues                       REJECT                          violations=0
      single-spaced wrapped dialogue (round-2 B ctrl) ACCEPT  analyzerAbstains=true  (748ms, round 2)
      U+2028 separators, double-spaced                ACCEPT  pipeline blocks=0      violations=0
```

The coordinator's specific question is answered by measurement: a walk-on with **one 1-word
dialogue line** is no longer excluded by the zero-total rule, is counted at 1 word, and is
therefore treated as ineligible — and that is **correct**, because the analyzer sees the same
1-word character (`voice-delta.ts:174-181` requires ≥30 words from *every* character) and abstains.
Guard and pipeline agree. Mixed single/double-spaced input agrees too: the guard's decision is the
same document-wide `isDoubleSpaced` the normalizer makes, so there is no per-block disagreement to
exploit.

### 3.2 BLOCKER (a) — CR-only line endings: the guard sees one line, the pipeline sees the whole script

`walkGuardCueOccurrences` splits on `'\n'` (`validation.ts:832`, `text.split('\n')`), but
`normalizeScreenplay` normalizes line endings FIRST (`screenplay-normalizer.ts:139`,
`raw.replace(/\r\n?/g, '\n')`) and, when the document is double-spaced, emits `\n`-joined reflowed
output that `parseFountain` then reads as a real script. So a classic-Mac / mangled-export CR-only
document is one giant line to every bound in `validation.ts` and a full screenplay to the analyzer:

```
sf2-review/r3cr.mjs
  double-spaced LF (control)   chars=105,690  guard=REJECT   pipeline character blocks=2,000  guardCueOccurrences=2,000
  double-spaced CR-only        chars=105,690  guard=*** ACCEPT ***
                               guardNames=0  analyzerNames=200 (60 words each, none under 30)
                               pipeline character blocks=2,000  guardCueOccurrences=0
                               oracleViolations=200 (worst: CHAR0 guard=0 pipeline=60)
                               runScriptDoctor=42,910ms
sf2-review/http3.mjs (live server, port 39431)
  R4-6 double-spaced CR-only   chars=105,690  HTTP 200 in 43,148ms  *** REACHED ANALYZER ***
```

This is not only a voice-bound bypass: `guardCueOccurrences` is **0** against 2,000 pipeline
character blocks, so it violates **round 1's cue oracle** as well, and the distinct/weight/frequent
bounds are all vacuous on this input. The single-spaced CR-only case is inert (`r3le.mjs`:
pipeline blocks 0 too, because `normalizeScreenplay` returns `raw` unreflowed when the document is
not double-spaced) — which is exactly why the original A2 "line endings are CLEAN" finding held: it
was measured on the single-spaced shape. The fix is one line — normalize `\r\n?` → `\n` at the top
of `walkGuardCueOccurrences` (and in `isDoubleSpacedForVoiceGrouping`'s input), mirroring
`screenplay-normalizer.ts:139` — plus CR and CRLF variants in **both** oracle corpora, which
currently contain LF only.

### 3.3 BLOCKER (b) — the 400-scene analyzer ceiling: the guard's eligibility set spans a document the analyzer never reads

`dialogueByCharacter` is built from `sceneUnits`, and `sceneUnits` come from
`allRawScenes.slice(0, ANALYZER_SCENE_CEILING)` — 400 (`fountain-analyzer.ts:2323, 2336-2337`).
The guard's eligibility scan spans the whole document. So one ordinary one-line walk-on placed in
scene 411 is an "ineligible character" to the guard and **does not exist at all** to the analyzer:
`allEligible` goes false, the bound is skipped, and `analyzeVoices` runs the full O(200²) pass over
the 400 analyzed scenes.

```
sf2-review/r3attack.mjs
  R4-2  walk-on past the 400-scene ceiling   chars=126,678  guard=*** ACCEPT ***
        guardNames=201  analyzerNames=200  analyzerAbstains=FALSE  oracleViolations=0
        runScriptDoctor=42,177ms
  R4-2b control: identical text, walk-on moved into scene 1
        guard=ACCEPT  analyzerNames=201  analyzerAbstains=TRUE   (cheap — correct behaviour)
sf2-review/http3.mjs (live server)
  R4-2  chars=126,678  HTTP 200 in 43,485ms  *** REACHED ANALYZER ***
```

Note `oracleViolations=0`: this shape is invisible to the round-3 oracle **by construction**,
because the guard's word counts are ≥ the pipeline's (it sees more, not less) and the oracle's
`pipelineWordsByBaseName` models no truncation. The property that would catch it is the
ineligible-subset check evaluated against the **truncated** pipeline view (the first
`ANALYZER_SCENE_CEILING` scene groups), which is also the natural fix on the guard side: build the
eligibility set from the first 400 scene-heading groups, or reject when EITHER the whole-document
or the truncated-prefix view is all-eligible-and-over-weight.

Both of these are the same failure the last five rounds have been: the guard maintains a
second, hand-built model of the pipeline and drifts from it — this time on line-ending
normalization and on how much of the document the analyzer actually reads.

### 3.4 The oracle is real, and its corpus is the gap

`tests/security/fountain-shape-guard-cue-parity.test.ts:928-1120`. `pipelineWordsByBaseName`
(`:942-959`) is built from the **real** `parseFountain(normalizeScreenplay(text))` blocks with
`normalizeCharacterName`'s own stripping — not a re-implementation of the guard — and
`assertWordOracle` (`:964-982`) checks both properties over the UNION of names either side knows,
so a name absent from one side reads as 0 rather than being skipped. The 8 cases genuinely include
both bypass shapes (bypass A's exact 200×2,000 payload, `:1005`; double-spaced wrap lengths 2–6,
`:1017`), the negative controls that keep it from passing by over-counting (single-spaced wrapped,
`:1041`; parenthetical-then-real-dialogue, `:1008`), extension pooling, a boneyard case, and a
mixed document. I re-ran the file: **401 pass / 0 fail**. Not vacuous. Its two gaps are exactly
§3.2 and §3.3: no CR/CRLF document anywhere in either corpus, and no truncation-aware pipeline view.

### 3.5 The `doctor-worker-pool` failure is load-sensitive, not a regression from this range

Run three times in this worktree, in isolation: **9 pass / 0 fail each time**
(`sf2-review/pool-1.log`…`pool-3.log`, exit 0 ×3). The assertion that failed in the lane's first
full run is `tests/core/doctor-worker-pool.test.ts:135` —
`assert.ok(secondMs < 50, …)` — a **fixed wall-clock 50 ms budget** for an LRU cache hit, which is
inherently load-sensitive under a full concurrent suite. And the range cannot have caused it:
`git diff main..HEAD --stat -- server/nvm/analyze/doctor-pool.ts server/nvm/analyze/doctor.ts
tests/core/doctor-worker-pool.test.ts` is **empty**. Verdict: acceptable flake, named. Worth a
follow-up (not this lane): the same test's third assertion (`:142-145`) already compares
*relatively* against the measured `secondMs`; the second could do the same instead of a magic 50.

### 3.6 The theme fixup clears AA in both themes and the pin is exact

`ScriptDoctorPanel.tsx:2153` `text-gray-500 dark:text-gray-400` and `:2168`
`text-gray-600 dark:text-gray-300`, both on the card's `bg-gray-50 dark:bg-zinc-800`. Computed
(WCAG 2.x relative luminance, normal-size thresholds — the 10px bold uppercase label is NOT large
text):

```
light  #f9fafb + #6b7280 (heading)   4.63:1  PASS
dark   #27272a + #9ca3af (heading)   5.87:1  PASS
light  #f9fafb + #4b5563 (hint)      7.23:1  PASS
dark   #27272a + #d1d5db (hint)     10.11:1  PASS
```

`tests/core/theme-convention.test.ts` **32/32**, and its floor is an exact
`assert.equal(violations.length, 65)` (`:994-999`) — not a `>=`, so the count really is back to
65 rather than merely not worse. Register row 64 quotes the new rejection sentence verbatim and the
sentence does reach the writer as `body.error` on the 400.

### 3.7 Gates I re-ran (foreground, exit codes)

```
node scripts/check-scoring-receipt.mjs main..HEAD          exit 0  "no scoring-path files changed"
npm run check-no-console                                   exit 0  296 files, 23 quarantine entries
check-doctor-output-identity --tree /home/user/STORYMACHINE --out …   exit 0 (45, baseline main@60bce1a6)
check-doctor-output-identity --tree <worktree> --out …               exit 0 (45)
check-doctor-output-identity --compare <main> <worktree>             exit 0  PASS — all 45 byte-identical
tests/security/fountain-shape-guard-cue-parity.test.ts   401 pass / 0 fail
tests/core/theme-convention.test.ts                       32 pass / 0 fail
tests/core/fix-receipt-identical-analysis-copy.test.ts     4 pass / 0 fail
tests/core/shape-rhythm-panel-copy.test.ts                30 pass / 0 fail
tests/core/doctor-worker-pool.test.ts (x3)                 9 pass / 0 fail each
```

Not re-run, per the budget: full `npm test` (lane reports 12,516/0 on the second run), `lint`,
`check-docs`, `honesty-audit`, `fuzz-routes`, the browser battery.

### The numbered list

1. **BLOCKER — CR-only line endings make every bound in `server/lib/validation.ts` vacuous while
   the analyzer sees a full script.** `walkGuardCueOccurrences` splits on `'\n'`
   (`validation.ts:832`); `normalizeScreenplay` normalizes `\r\n?` → `\n` first
   (`screenplay-normalizer.ts:139`) and reflows, so a double-spaced CR-only document is one line to
   the guard and 2,000 character blocks to the pipeline. Reproduce:
   `node --experimental-strip-types .../sf2-review/r3cr.mjs` → 105,690 chars, guard ACCEPT,
   `guardCueOccurrences=0` vs 2,000 pipeline character blocks, 200 analyzer names at 60 words each,
   `runScriptDoctor=42,910ms`; over HTTP (`.../sf2-review/http3.mjs`) **200 in 43,148 ms**. Fix:
   normalize `\r\n?` → `\n` once at the top of `walkGuardCueOccurrences` (and feed the same
   normalized array to `isDoubleSpacedForVoiceGrouping`), and add CR-only and CRLF documents to
   **both** the round-1 cue oracle and the round-3 word oracle — this violates the round-1 oracle
   too, so that corpus is the one that should have caught it.

2. **BLOCKER — the guard's eligibility set spans the whole document; `dialogueByCharacter` stops at
   `ANALYZER_SCENE_CEILING = 400` scenes** (`fountain-analyzer.ts:2323, 2336-2337`). One ordinary
   one-line walk-on in scene 411 is "ineligible" to the guard and nonexistent to the analyzer, so
   the bound is skipped while `analyzeVoices` runs in full. Reproduce:
   `node --experimental-strip-types .../sf2-review/r3attack.mjs` → case `R4-2`, 126,678 chars,
   guard ACCEPT, analyzer sees 200 names none under 30 words, `runScriptDoctor=42,177ms`; over HTTP
   **200 in 43,485 ms**; the control with the same walk-on moved into scene 1 is cheap. Fix: build
   the eligibility set from the first `ANALYZER_SCENE_CEILING` scene-heading groups (or reject if
   either the whole-document or the truncated-prefix view is all-eligible and over weight), and
   evaluate the oracle's ineligible-subset property against that same truncated pipeline view —
   it currently cannot see this class at all (`oracleViolations=0` on the live bypass).

3. **NOT a blocker, recorded so the merge note is accurate —
   `tests/core/doctor-worker-pool.test.ts:135`'s `secondMs < 50` is a fixed wall-clock budget.**
   The test passes 9/9 three times in isolation on this tree and the range's diff for
   `doctor-pool.ts`, `doctor.ts` and that test file is empty, so the lane's first-run failure is a
   load-sensitive flake, not a regression from this range — the report's call was right. A
   follow-up (not this lane) should make that assertion relative, the way the same test's
   `:142-145` already is.

---

## Round 4 — re-check of `f25e4cd3` (tag `audit/2026-09-05/server-fixes-2-round4`)

**Same reviewer.** `git diff e074328f..f25e4cd3` = 3 files +335/−6, on `main@60bce1a6`. Worktree
`git status --porcelain` empty; main checkout untouched. Probes:
`<session scratch>/sf2-review/r4attack.mjs`, `http4.mjs`, `r3lib.mjs` (reused). One server on port
39441, killed (`pgrep -af server.ts` clean).

**Verdict: REVISE** — both round-3 blockers are genuinely fixed and I reproduced the fixes over
HTTP. The scene-ceiling fix, however, counts scenes with a predicate **narrower than the parser's**,
so the same bypass reopens under three ordinary heading spellings, each measured at ~42–44 s.

### 4.1 Both round-3 blockers are closed — reproduced over HTTP

`sf2-review/http4.mjs`, live server on the worktree build:

```
round-3 (a) CR-only double-spaced        chars=105,690  HTTP 400 in   113ms  REJECTED
round-3 (b) walk-on past scene 400       chars=126,678  HTTP 400 in    18ms  REJECTED
control R4-2b walk-on in scene 1         chars=126,678  HTTP 200 in   903ms  (correct: the analyzer
                                                                     sees the same 1-word walk-on and abstains)
```

(Before: 43,148 ms and 43,485 ms, both HTTP 200.) The implementation matches the claims:
`walkGuardCueOccurrences` normalizes once at the top (`validation.ts:856`,
`text.replace(/\r\n?/g, '\n').split('\n')` — so `isDoubleSpacedForVoiceGrouping`, the cue walk and
the word accumulation all read the same normalized array), and `sceneIndex` is tracked per
occurrence (`:896, :908, :1039`) and gates the voice map at `:1099`
(`if (occ.sceneIndex <= ANALYZER_SCENE_CEILING)`). The **boundary is exactly right** for
`INT.`-style headings (`sf2-review`, boundary probe): walk-on under scene 399 or 400 → both sides
see it, guard ACCEPT and the analyzer abstains; scene 401 or 402 → both sides drop it, guard
REJECT. Cues before the first heading (sceneIndex 0) match the analyzer's preamble fold.

`tests/core/doctor-worker-pool.test.ts:135` is now relative (`secondMs < firstMs / 2`) with the
first run timed at `:126-127` — the right shape, matching the assertion below it. 9/9 pass three
times (`pool4-1..3.log`).

### 4.2 BLOCKER — the new `sceneIndex` counts scenes with a NARROWER predicate than the parser, so three ordinary heading spellings reopen the bypass

`sceneIndex` increments on `SCENE_HEADING_PREFIX_RE` (`validation.ts:896`) — `/^(INT|EXT|EST|I\/E)[. ]/`,
**case-sensitive, four prefixes**. The analyzer segments scenes on `parseFountain`'s own
`scene_heading` blocks (`src/lib/fountain.ts:127`), which is
`/^(INT|EXT|EST|I\/E|INTERIOR|EXTERIOR|ESTABLECIENDO|INT\/EXT|INTÉRIEUR|EXTÉRIEUR|INTERIEUR|EXTERIEUR|INNEN|AUSSEN)[. ]/iu`
**OR** `trimmed.startsWith('.')` (the Fountain forced-heading form). So the guard's scene count is
≤ the analyzer's, and any heading form the guard does not recognize lets past-ceiling occurrences
back into the eligibility set — which is exactly how the round-3 bypass worked.

`sf2-review/r4attack.mjs` (200 uniform eligible names over 410 scene groups + a 1-word walk-on in
the last one; guard verdict, the analyzer's own truncation-aware `dialogueByCharacter`, and
`runScriptDoctor`):

| heading form | guard | analyzer sees | abstains? | cost |
|---|---|---|---|---|
| `.SCENE n` (forced) | **ACCEPT** | 200 names, none < 30 words | no | **42,697 ms** |
| `int. location n - day` (lowercase) | **ACCEPT** | 200 | no | **43,646 ms** |
| `INTERIOR LOCATION n - DAY` | **ACCEPT** | 200 | no | **42,364 ms** |
| `INT. LOCATION n - DAY` (round-3 control) | REJECT | — | — | — |
| `INT.` headings, only the LAST one `.FORCED` | REJECT | — | — | — |

Over HTTP (`sf2-review/http4.mjs`): `.FORCED` headings, **121,345 chars → HTTP 200 in 42,575 ms**.

Note the direction trap: for this counter, neither approximation is safe. Counting too FEW scenes
(today's bug) lets a ghost ineligible name in and the bound is skipped; counting too MANY would
truncate a real character's words away, drop it under 30 and skip the bound just the same. The
scene predicate has to match `parseFountain`'s exactly — including the `.`-forced form and the
case-insensitive alternates — rather than being conservative in either direction.
`SCENE_HEADING_PREFIX_RE` is also used for the cue-skip test at `:894` and `:910`, where changing
it would alter cue counting, so this wants its own predicate (a `SCENE_SEGMENT_RE` mirroring
`fountain.ts:127`) rather than a widening in place.

**Why the new oracle does not catch it, structurally.** The ceiling-aware `pipelineWordsByBaseName`
(`…cue-parity.test.ts`, `if (sceneIndex > ANALYZER_SCENE_CEILING) continue;`) is right, but the two
asserted properties are `guardWords >= pipelineWords` and `guard-ineligible ⊆ pipeline-ineligible`.
For the ghost walk-on: guard = 1, pipeline = 0 → `1 >= 0` holds, and `1 < 30` implies `0 < 30`, so
the subset holds too. Both properties pass while the guard's decision set is wrong. The property
that catches it is the one the round-3 zero-word rule already implies: **the guard's DECISION SET
(base names with > 0 counted words) must be a subset of the ceiling-aware pipeline's decision set**
— under `.FORCED` headings the guard's set contains `WALKON` and the pipeline's does not. Add that,
plus `.`-forced / lowercase / `INTERIOR` heading documents to the corpus, which is `INT.`-only today.

### 4.3 The `ANALYZER_SCENE_CEILING` import is safe — checked, not assumed

- **No cycle.** Nothing under `server/nvm/**` imports `server/lib/validation.ts` (one comment
  mention in `revision/rewrite-llm.ts:10`, no import edge), so `validation.ts → fountain-analyzer.ts`
  is a DAG edge, not a cycle — no TDZ hazard of the kind CLAUDE.md warns about for doctor↔reference.
- **Boundary and receipt gates green.** `tests/core/pure-core-boundary.test.ts` **6/6**;
  `node scripts/check-scoring-receipt.mjs main..HEAD` → "no scoring-path files changed", exit 0
  (correct: the gate walks *from* `doctor.ts`, and this edge points the other way — `validation.ts`
  is not reachable from `doctor.ts`).
- **Load cost measured, not asserted.** Importing `server/lib/validation.ts` cold: `main` 169 ms /
  14.1 MB heap; this tree 178 ms / 14.7 MB — **+9 ms, +0.6 MB** for the added
  `fountain-analyzer.ts → {parseFountain, normalizeScreenplay, structure.ts, voice-delta.ts,
  string-utils}` subtree. That is real (every process importing validation, including boot, now
  loads the analyzer core) but small, and it buys one definition of the ceiling instead of a
  hardcoded 400 that could silently drift — the same argument the file's own header makes for
  composing `CHARACTER_CUE_RE`. Non-blocking; worth one sentence reconciling it with the adjacent
  "replicated, not imported" comments (`:749`, `:717`), which now read as inconsistent with the
  file's own newest import.
- **Definition match:** `ANALYZER_SCENE_CEILING = 400` (`fountain-analyzer.ts:2323`) is applied as
  `allRawScenes.slice(0, 400)` (`:2337`) over `segmentScenes`' heading-delimited groups. The guard's
  `sceneIndex <= 400` gate lines up with that exactly for headings both sides recognize (verified at
  399/400/401/402 above) — the mismatch is only in *which lines count as a heading* (§4.2).

### 4.4 Gates I re-ran (foreground, exit codes)

```
node scripts/check-scoring-receipt.mjs main..HEAD           exit 0  "no scoring-path files changed"
npm run check-no-console                                    exit 0
tests/core/pure-core-boundary.test.ts                        6 pass / 0 fail
tests/security/fountain-shape-guard-cue-parity.test.ts     524 pass / 0 fail
tests/routes/fountain-shape-guard-cue-bypass.test.ts        57 pass / 0 fail
tests/core/doctor-worker-pool.test.ts (x3)                   9 pass / 0 fail each
check-doctor-output-identity --compare <main@60bce1a6> <worktree>   PASS — 45/45 byte-identical
```

Not re-run, per the budget: full `npm test` (lane reports 12,639/0), `lint`, `check-docs`,
`honesty-audit`, `fuzz-routes`, the browser battery.

### The numbered list

1. **BLOCKER — `server/lib/validation.ts:896`: `sceneIndex` increments on
   `SCENE_HEADING_PREFIX_RE` (`/^(INT|EXT|EST|I\/E)[. ]/`, case-sensitive), while the analyzer
   segments scenes on `parseFountain`'s heading test (`src/lib/fountain.ts:127` — case-insensitive,
   nine more prefixes, plus the `.`-forced form).** The guard therefore under-counts scenes and lets
   past-ceiling occurrences back into the eligibility set, reopening the round-3 bypass under three
   ordinary heading spellings. Reproduce:
   `node --experimental-strip-types .../sf2-review/r4attack.mjs` →
   `.SCENE n` forced headings **ACCEPT, runScriptDoctor 42,697 ms**; lowercase `int. …`
   **ACCEPT, 43,646 ms**; `INTERIOR …` **ACCEPT, 42,364 ms** (the `INT.` control REJECTs);
   over HTTP (`.../sf2-review/http4.mjs`) the `.FORCED` payload is **121,345 chars → 200 in
   42,575 ms**. Fix with a dedicated scene-segmentation predicate mirroring `fountain.ts:127`
   exactly (do not widen `SCENE_HEADING_PREFIX_RE` itself — `:894`/`:910` use it for cue-skipping,
   where its narrowness is deliberate), and note that neither over- nor under-counting is safe here,
   so this one has to match rather than approximate.

2. **Same round, oracle gap — the round-4 properties cannot see this class.** With the ghost
   walk-on, guard = 1 word and ceiling-aware pipeline = 0, so `guardWords >= pipelineWords` and
   `guard-ineligible ⊆ pipeline-ineligible` both pass while the decision set is wrong. Add the
   property the round-3 zero-word rule already implies — **the guard's decision set (base names with
   > 0 counted words) must be a subset of the ceiling-aware pipeline's** — and add `.`-forced,
   lowercase and `INTERIOR`-style heading documents to a corpus that is `INT.`-only today. Without
   this, round 5 is another payload-specific pin rather than a closed class.

3. **Non-blocking, record only — the `ANALYZER_SCENE_CEILING` import is fine, and I checked it
   rather than assuming.** No cycle (nothing in `server/nvm/**` imports `validation.ts`),
   `pure-core-boundary` 6/6, receipt gate correctly green (the walk is *from* `doctor.ts`), and the
   measured cost of the widened static graph is +9 ms / +0.6 MB on a cold `import
   server/lib/validation.ts` (169 ms/14.1 MB → 178 ms/14.7 MB). One sentence reconciling it with the
   adjacent "replicated, not imported" comments (`:717`, `:749`) would keep the file's stated
   convention honest.

---

## Round 5 — re-check of `d9d2100a` (tag `audit/2026-09-05/server-fixes-2-round5`)

**Same reviewer.** Reviewed from a clean export, per the coordinator's mid-round note that the lane
was rebasing concurrently: `git -C <worktree> archive d9d2100a | tar -x -C
<session scratch>/sf2-review/export5` (with `node_modules` symlinked from the main checkout); all
reads via `git show d9d2100a:<path>` / that export; the server for the HTTP repros was booted from
the export on port 39451 and killed. The worktree's HEAD is now `81ff69fe` (the rebased d9d2100a) —
I did not touch it. Main is `85fca55a`. Probes: `.../sf2-review/r5lib.mjs`, `r5attack.mjs`,
`http5.mjs`.

**Verdict: REVISE** — the round-4 blocker is genuinely fixed (all three heading spellings now
reject over HTTP), the parity proof is real, the boneyard ordering is right and the
import-vs-replicate comment is accurate. But the guard's **line splitting** still diverges from the
parser's, and that reopens the same ceiling bypass with a single stray `\r`: **132,077 chars,
HTTP 200 in 51,437 ms**.

### 5.1 Round-4's blocker is closed — reproduced over HTTP on the export build

```
sf2-review/http5.mjs (server booted from the d9d2100a export, port 39451)
  R5-1 .FORCED headings          chars=121,345  HTTP 400 in   110ms  REJECTED   (was 200 in 42,575ms)
  R5-3 lowercase int. headings   chars=126,678  HTTP 400 in    19ms  REJECTED   (was ACCEPT, 43,646ms)
  R5-4 INTERIOR headings         chars=128,322  HTTP 400 in    20ms  REJECTED   (was ACCEPT, 42,364ms)
  control INT. headings          chars=126,678  HTTP 400 in    15ms  REJECTED   (unchanged)
  control walk-on inside the ceiling (scene 400)  chars=123,306  HTTP 200 in 8,165ms  (correct: both
        sides see the 1-word walk-on, the analyzer abstains; 8.2s is this 400-scene script's ordinary
        non-voice cost, under the 10s bar)
```

`isSceneSegmentHeading` (`validation.ts:752`) is `SCENE_SEGMENT_RE.test(trimmed) ||
trimmed.startsWith('.')`, used only at the scene counter (`:1005`);
`SCENE_HEADING_PREFIX_RE` is untouched and still governs cue-skipping (`:1007`, and
`accumulateDialogueWords`), which is the fix shape round 4 asked for.

### 5.2 The parity proof is against the REAL parser, and it is not vacuous

`…cue-parity.test.ts:1221-1320`. `realIsSceneHeading` calls **`parseFountain(line)` and checks
`blocks[0].type === 'scene_heading'`** — the real classifier, not a hand-written expectation — and
every generated row first asserts `real === true` (generator sanity) before asserting parity, so a
row cannot pass by generating a non-heading. The product is the full prefix list from
`fountain.ts:127` — `INT, EXT, EST, I/E, INTERIOR, EXTERIOR, ESTABLECIENDO, INT/EXT, INTÉRIEUR,
EXTÉRIEUR, INTERIEUR, EXTERIEUR, INNEN, AUSSEN` (14) × upper/lower/mixed case (3) × `.`/` `
separators (2) = **84 rows**, pinned by a count assertion. Edge cases cover `.FORCED`, a bare `.`,
`!`-forced action, `INTERPOL` (prefix-shaped, no boundary), `INT.LOCATION` (no space), lowercase
with trailing spaces, and ordinary action. Document-level, it compares its own walk replica against
`parseFountain(normalizeScreenplay(text))`'s `scene_heading` count over a mixed
forced/lowercase/INTERIOR/INT-EXT document in LF, CR-only and CRLF.

I checked the coordinator's remaining cases myself against the real parser (`sf2-review`, edge
probe): `..` → guard true / real true (this parser treats any leading `.` as a heading — a
divergence from the Fountain spec, but the guard's target is *this* parser, so agreement is
correct); `. ` → true/true; `   INT. HALL - DAY` and `\tEXT. ROAD - DAY` (leading whitespace/tab)
→ true/true; `*/ INT. HALL - DAY` (heading text on the boneyard-closing line) → false/false;
`INT` with no separator → false/false; `I/E. CAR - DAY` → true/true. **No disagreement found.**

One honest weakness: the document-level test's `guardSceneSegmentCount` is a **replica** of the
walk (its own header says so) rather than the real walk, so it proves the predicate and the
plumbing shape, not the real function — which is exactly how §5.3 slipped through.

### 5.3 BLOCKER — the guard splits lines on `\r`; `parseFountain` does not, so one stray `\r` disables the whole voice bound

Round 4 made the walk normalize `\r\n?` → `\n` before splitting (`validation.ts:~965`) — correct for
a *whole-document* CR-only file, because `normalizeScreenplay` normalizes line endings too. But it
only does so **when it reflows**: `screenplay-normalizer.ts:139-141` normalizes into `allLines`,
then `if (!isDoubleSpaced(allLines)) return raw;` — an ordinary single-spaced script comes back
**with its `\r`s intact**, and `parseFountain` splits that on `'\n'` only. So in a single-spaced
document a lone `\r` is a line break to the guard and ordinary text to the parser: the guard's line
starts are a strict superset of the parser's, and every extra "line" it sees can be a scene heading
the analyzer never segments on.

That inverts the round-4 fix: `sceneIndex` runs ahead, every occurrence past the guard's own
400 falls out of the eligibility map, the map empties, and the bound never evaluates.

```
sf2-review/r5attack.mjs  (200 names x 10 occurrences over 400 real INT. scenes, 5 cues/scene —
                          under the frequent-cue bound; ONE action line carries the payload)
  R6-0 control, no \r                      chars=123,590  guard=REJECT
  R6-1 one action line ending in
       'Something happens' + '\rINT. GHOST - DAY' x500
                                           chars=132,077  guard=*** ACCEPT ***
       guard eligible names = 0   analyzer names = 200 (60 words each, none under 30)
       word-oracle violations = 200 (worst CHAR0: guard 0 vs pipeline 60)
       runScriptDoctor = 49,234 ms
  R6-2 same with 50 fake headings          chars=124,427  guard=REJECT (partial inflation not enough)
sf2-review/http5.mjs (live server, export build)
  R6-1  chars=132,077  HTTP 200 in 51,437ms  *** REACHED ANALYZER ***
```

The whole payload difference from the REJECTing control is one line of text. The fix is to make the
guard read the same line array the pipeline will: compute
`normLines = text.replace(/\r\n?/g,'\n').split('\n')`, decide `willReflow =
isDoubleSpacedForVoiceGrouping(normLines)` (which is already computed), and walk
`willReflow ? normLines : text.split('\n')` — mirroring `normalizeScreenplay`'s own
"normalize-then-return-raw-if-not-double-spaced" rule exactly. That keeps round 3's CR-only
double-spaced payload rejected (it *is* reflowed) and closes this one.

### 5.4 Neither oracle property can see it — and the fix is one line of the assertion

`assertWordOracle` (`…cue-parity.test.ts:988-1005`) compares **`guardVoiceWordCounts`** — the
*untruncated* map — against the ceiling-aware pipeline map, so for R6-1 it reads guard 60 ≥ pipeline
60 and passes. The new round-5 decision-set property runs `guardEligibleVoiceWordCounts ⊆ pipeline`,
and R6-1's guard set is **empty**, so `∅ ⊆ anything` passes too. Both properties hold while the
guard's actual decision input is empty.

The missing half is the same inequality evaluated on the map the decision actually uses:
**`guardEligibleVoiceWordCounts(name) >= pipelineCeilingWords(name)`**. R6-1 fails it immediately
(0 ≥ 60 is false); the round-4 ghost walk-on is caught by the existing decision-set ⊆ direction. The
two together are two-sided and would have caught rounds 4 and 5 in one property. Corpus also needs a
lone-`\r`-inside-a-line document — today's corpus varies line endings only for the whole document.

### 5.5 Boneyard ordering and the import-vs-replicate comment are both correct

- The `sceneIndex` increment sits **after** the boneyard `continue` (`:1005` vs `:989`), and it
  behaves: 50 heading-shaped lines inside `/* … */` do **not** shift the 400/401 boundary — a
  399-scene document plus walk-on still ACCEPTs and a 400-scene one still REJECTs, with and without
  a boneyard closing immediately before scene 1 (so a real heading on the line *after* `*/` is
  counted, and heading text on the `*/` line itself is ignored by both sides).
- The comment at `:697-746` is accurate on every checkable claim: `fountain.ts` exports
  `CHARACTER_CUE_RE`, `CUE_INITIAL_CLASS`, `CUE_LETTER_CLASS`, `SHOT_LINE_RE`… but **not** the
  heading test, which is inline at `fountain.ts:127` — so importing it would mean editing a
  scoring-path file, and replicating is the right call. The "direction trap" paragraph correctly
  restates that neither over- nor under-counting is safe here.

### 5.6 Gates I re-ran (foreground, exit codes)

```
node scripts/check-scoring-receipt.mjs 85fca55a..d9d2100a   exit 0  "no scoring-path files changed"
check-doctor-output-identity --tree <export> / --tree <main@85fca55a> / --compare
                                                            exit 0  PASS — 45/45 byte-identical
tests/security/fountain-shape-guard-cue-parity.test.ts    629 pass / 0 fail
tests/routes/fountain-shape-guard-cue-bypass.test.ts       57 pass / 0 fail
tests/core/pure-core-boundary.test.ts                       6 pass / 0 fail
```

(The parity file first showed 3 suite failures in my export — all of them `git ls-files -z --
*.fountain` failing because `git archive` output has no `.git`. After `git init` + `git add -f --
'*.fountain'` in the export (54 files indexed) it is **629/629**, matching the lane's number. My
artifact, not the lane's.)

Not re-run, per the budget: full `npm test` (lane reports 12,744/0), `lint`, `check-docs`,
`honesty-audit`, `fuzz-routes`, the browser battery. The claims-register renumbering (61–64 → 66–69)
is deferred to the coordinator's post-rebase check, as instructed.

### The numbered list

1. **BLOCKER — `server/lib/validation.ts`'s walk splits lines on `\r`, `parseFountain` does not, so
   one stray `\r` empties the eligibility map and disables the voice bound.** Round 4's
   `text.replace(/\r\n?/g,'\n').split('\n')` is right only for documents the normalizer actually
   reflows; `screenplay-normalizer.ts:139-141` returns `raw` (CR intact) for a single-spaced script,
   which `parseFountain` then splits on `'\n'` alone. Reproduce:
   `node --experimental-strip-types .../sf2-review/r5attack.mjs` → `R6-1`, 132,077 chars, guard
   **ACCEPT**, guard-eligible names **0** vs 200 analyzer names at 60 words,
   `runScriptDoctor 49,234 ms`; over HTTP (`.../sf2-review/http5.mjs`, export build)
   **200 in 51,437 ms**; the byte-identical control without the `\r`s **REJECTs**. Fix by walking
   the same array the pipeline will parse — `willReflow ? normalizedLines : text.split('\n')`, with
   `willReflow` from the `isDoubleSpacedForVoiceGrouping` call already made — which keeps round 3's
   CR-only double-spaced payload rejected.

2. **Same round — the oracle still cannot see this class; one assertion closes it.**
   `assertWordOracle` compares the **untruncated** `guardVoiceWordCounts` against the ceiling-aware
   pipeline map, so R6-1 passes (60 ≥ 60), and the round-5 decision-set property passes vacuously on
   an empty guard set. Add the inequality on the map the decision actually consumes —
   `guardEligibleVoiceWordCounts(name) >= pipelineCeilingWords(name)` — which fails R6-1 at 0 ≥ 60,
   and add a lone-`\r`-inside-a-line document to the corpus (line endings are varied only
   document-wide today).

3. **Non-blocking, verified rather than assumed.** The round-4 blocker is genuinely closed (three
   spellings now 400 in 15–110 ms over HTTP, controls unchanged); the parity proof compares against
   the real `parseFountain` over all 14 prefixes × 3 cases × 2 separators plus seven edge cases, and
   my own probe found no disagreement on `..`, `. `, leading whitespace/tab, `*/ INT. …`, bare
   `INT`, or `I/E.`; the boneyard increment ordering is correct and does not shift the 400/401
   boundary; the import-vs-replicate comment is accurate (`fountain.ts` really has no exported
   heading predicate). One weakness worth noting for a later round: the document-level parity test
   uses a **replica** of the walk rather than the real one, so it proves the predicate, not the
   wiring — which is why §5.3 was invisible to it.

---

## Round 6 — re-check of `8798c71e` (tag `audit/2026-09-05/server-fixes-2-round6`)

**Same reviewer.** Reviewed from a `git archive 8798c71e` export
(`<session scratch>/sf2-review/export6`, `node_modules` symlinked, `git init` + `git add -f --
'*.fountain'` so the fixture tests can run) — nothing built or booted in the worktree, per the
coordinator's note that the battery is running there. Server booted from the export on port 39471
and killed (`pgrep -af server.ts` clean). Main is `85fca55a`; the lane is six commits on it.
Probes: `.../sf2-review/r6lib.mjs`, `r6attack.mjs`, `http6.mjs`. (This round survived a container
restart; the scratch export and the round-7 attack logs were re-verified after it.)

**Verdict: REVISE** — the round-5 blocker is fixed exactly as recommended, every earlier round's
payload still rejects on the rebased tree, and I could not break `resolveGuardLines` itself on any
of the third paths named. But the guard's hand-built model of the pipeline diverges once more, one
layer further in: **125,627 chars, HTTP 200 in 49,799 ms**, from a document that differs from a
REJECTing control by **37 characters**.

### 6.1 Round-5's blocker is fixed, and nothing regressed — all over HTTP on the export build

```
sf2-review/http6.mjs (port 39471)
  R6-1 lone-\r inflation (round-5 blocker)  chars=132,077  HTTP 400 in 122ms  REJECTED  (was 200 in 51,437ms)
  R6-1 control (same doc, no \r)            chars=123,577  HTTP 400 in  18ms  REJECTED
  round-3 CR-only double-spaced             chars=105,690  HTTP 400 in  20ms  REJECTED  (still closed)
  round-1 lowercase (cont'd) 200x6,000      chars=158,716  HTTP 400 in  33ms  REJECTED  (FREQUENT_CUE_LINES)
  round-2 payload 1 (50 x 18,000)           chars=860,417  HTTP 400 in 101ms  REJECTED
  round-4 .FORCED headings past ceiling     chars=121,345  HTTP 400 in  13ms  REJECTED
```

`resolveGuardLines` (`validation.ts:983-988`) is the fix I asked for, verbatim: normalize only to
DECIDE (`isDoubleSpacedForVoiceGrouping(normLines)`), then walk `docIsDoubleSpaced ? normLines :
text.split('\n')` — mirroring `screenplay-normalizer.ts:139-141`'s
`allLines`-then-`if (!isDoubleSpaced(allLines)) return raw;`.

### 6.2 No third path in `resolveGuardLines` — I attacked the decision itself

`normalizeScreenplay` returns `raw` **iff** it does not reflow, so
`normalizeScreenplay(t) !== t` IS the pipeline's own reflow decision. I compared it against
`resolveGuardLines(t).docIsDoubleSpaced` over every seam the brief named plus the boundary cases:

```
plain single-spaced / plain double-spaced ....................... agree / agree
cues with trailing spaces (double- and single-spaced) ........... agree / agree
whitespace-only "blank" lines after cues ........................ agree
EXACTLY 50% of cues blank-followed (the >= 0.5 boundary) ......... agree
just under 50% (1 of 3) ......................................... agree
BOM prefix ...................................................... agree
tab-indented cues ............................................... agree
no cues at all (the 0.9 document-ratio fallback branch) .......... agree
CRLF / CR-only double-spaced / CR-only single-spaced ............. agree / agree / agree
lone \r inside an action line (round-5's shape) .................. agree
                                                     disagreements: 0 / 14
```

The one asymmetry that exists — the normalizer strips per-line trailing whitespace
(`.map(l => l.replace(/\s+$/, ''))`) before computing `isDoubleSpaced`, and the guard does not — is
inert, because both sides' tests (`isCharacterCue`, `lines[i+1].trim() === ''`) trim internally;
the boundary rows above exercise it directly. There is no title-page strip, BOM strip or tab
expansion in `normalizeScreenplay` (the title-page line is a comment, not code), so there is no
fourth path to mirror.

### 6.3 BLOCKER — a parenthetical-only cue demotes the NEXT cue in `parseFountain`, so the guard credits a character the analyzer never sees

`parseFountain` types a cue as `character` only when `!prevBlock || prevBlock.type === 'empty'`
(`src/lib/fountain.ts:139-140`). In a reflowed (double-spaced) document, `normalizeScreenplay`
emits a parenthetical **without a following blank line** (`screenplay-normalizer.ts`'s
`isParenthetical` branch: `flush(); out.push(t);`), so the cue after it has
`prevBlock.type === 'parenthetical'` and is demoted to `action` — and its dialogue, whose previous
block is now `action`, is demoted too. The guard has no model of that rule: it counts the demoted
cue as a character and credits it the words.

That is a ghost in exactly the round-4 sense, and one ghost with fewer than 30 words switches
`allEligible` off and skips the whole bound:

```
sf2-review/r6attack.mjs   (200 uniform names x 10 occurrences, double-spaced, 400 scenes)
  R7-0 control                                   chars=125,590  guard=REJECT
  R7-1 + "PARENONLY\n\n(beat)\n\nWALKON\n\nhi there\n\n"
                                                 chars=125,627  guard=*** ACCEPT ***
        guard eligible names = 201  vs  analyzer names = 200   ghost = WALKON:2 words
        runScriptDoctor = 50,666 ms
  reflowed tail : ["","PARENONLY","(beat)","WALKON","hi there",""]
  block types   : character:PARENONLY | parenthetical:(beat) | action:WALKON | action:hi there
sf2-review/http6.mjs (live server, export build)
  R7-0 control                     chars=125,590  HTTP 400 in     13ms  REJECTED
  R7-1 parenthetical-demotion ghost chars=125,627  HTTP 200 in 49,799ms  *** REACHED ANALYZER ***
```

**37 characters** of payload separate a 13 ms rejection from a 49.8 s analysis.

The round-5 decision-set property is the right property for this — my probe detects it as
`ghosts=1` using exactly that comparison — so this is a corpus gap, not a missing property: the
oracle corpus has parenthetical-only walk-ons (round 3) and double-spaced documents (round 3), but
never a parenthetical-only cue **immediately followed by another cue** in a reflowed document, which
is the combination that triggers the demotion.

### 6.4 The pattern, and the cheapest way out — measured

Rounds 4, 5, 6 and now 7 are all the same shape: the bound is **fail-open**. It evaluates only when
the guard can prove *every* character is eligible, so every bypass to date works by making the guard
believe one character is not — a ghost it invented (rounds 4, 7) or real characters it lost
(rounds 5, 6). Two changes would end the class rather than the instance, and both are cheap:

1. **Fail closed.** When the eligibility set is empty, or when the guard cannot prove all-eligible,
   apply the bound anyway (or a calibrated fallback) instead of skipping it. Every bypass in this
   series has been a *skip*, never a miscalculation of the weight.
2. **Stop hand-modelling the pipeline.** The guard already spends an O(n) walk; the real thing is
   cheaper. Measured on the 860,417-char round-2 payload, in-process on this tree:
   `fountainShapeRejectionReason` **100.8 ms** vs `normalizeScreenplay + parseFountain`
   **72.8 ms** (54,002 blocks). `src/lib/fountain.ts` is already an import source for this file
   (`CHARACTER_CUE_RE`) and is a pure leaf, so building the character→words map from real
   `character`/`dialogue` blocks — the same two-line oracle round 1's finding recommended for cues —
   costs less than the approximation it would replace and cannot drift from it by construction.

### 6.5 The rebase is clean; the register renumbering is complete

`docs/CLAIMS_REGISTER.md` has **69 rows**, contiguous through 69; rows **66–69** are this lane's
four (first-draft letter note, `identicalAnalysis` copy, the What-If `tooLarge` sentence, the
voice-eligible rejection message), with 61–65 belonging to the concurrently-merged layout lane.
`grep -rn "row 6[1-4]\|rows 61\|claims-register row 6"` across `server/`, `src/`, `tests/` and
`docs/` (excluding the register itself) returns **nothing** — no stale pointer survived the
renumbering. Rounds 1, 2 and 4 payloads all still reject on the rebased tree (§6.1).

### 6.6 Gates I re-ran (foreground, exit codes)

```
node scripts/check-scoring-receipt.mjs 85fca55a..8798c71e   exit 0  "no scoring-path files changed"
check-doctor-output-identity --tree <export> / --compare <main@85fca55a>   PASS — 45/45 byte-identical
tests/security/fountain-shape-guard-cue-parity.test.ts     636 pass / 0 fail
tests/routes/fountain-shape-guard-cue-bypass.test.ts        57 pass / 0 fail
```

Not re-run, per the budget: full `npm test` (lane reports 12,784/0), `lint`, `check-docs`,
`honesty-audit`, `fuzz-routes`, the browser battery (running in the worktree).

### The numbered list

1. **BLOCKER — a parenthetical-only cue demotes the NEXT cue to `action` in `parseFountain`
   (`src/lib/fountain.ts:139-140`, via `screenplay-normalizer.ts`'s parenthetical branch emitting no
   trailing blank), so the guard credits a character the analyzer never pools — one ghost under 30
   words skips the whole bound.** Reproduce:
   `node --experimental-strip-types .../sf2-review/r6attack.mjs` → `R7-1`, 125,627 chars, guard
   **ACCEPT**, guard-eligible 201 vs analyzer 200 (`ghost WALKON:2`), `runScriptDoctor 50,666 ms`;
   over HTTP (`.../sf2-review/http6.mjs`, export build) **200 in 49,799 ms**, against a control that
   differs by 37 characters and rejects in 13 ms. The round-5 decision-set property already detects
   it (`ghosts=1`) — the gap is the corpus: add a parenthetical-only cue **immediately followed by
   another cue** inside a reflowed document, and the same shape at scale.

2. **Structural, same round — make the bound fail closed.** Every bypass in rounds 4–7 works by
   making the guard *skip* the check (empty or ghost-poisoned eligibility set), never by
   mis-weighting it. Applying the bound (or a calibrated fallback) when the eligibility set is empty
   or unprovable would have made all four inert. And the hand-built model can go: measured on this
   tree at the 860,417-char ceiling, `normalizeScreenplay + parseFountain` costs **72.8 ms** against
   the guard's own walk at **100.8 ms**, and `src/lib/fountain.ts` is already imported here — so
   building the character→words map from the real `character`/`dialogue` blocks is *cheaper* than
   the approximation that has now drifted four rounds running.

3. **Verified clean, recorded for the merge note.** `resolveGuardLines` matches the pipeline's own
   reflow decision on all 14 seam and boundary documents I could construct (trailing whitespace,
   whitespace-only blanks, the exact 50% cue-blank boundary, BOM, tab-indented cues, the no-cue
   0.9 fallback, LF/CRLF/CR-only, lone `\r`) — 0 disagreements, and no fourth path exists in
   `normalizeScreenplay` to mirror. Rounds 1–5 payloads all still reject on the rebased tree
   (13–122 ms). Register: 69 rows, this lane's are 66–69, no stale row references anywhere. Gates:
   receipt exit 0, output identity 45/45, guard suites 636/636 and 57/57.

---

## Round 7 — re-check of `9057b462` (tag `audit/2026-09-05/server-fixes-2-round7`)

**Same reviewer.** Reviewed from a `git archive 9057b462` export
(`<session scratch>/sf2-review/export7`, `node_modules` symlinked, local `git init` + `git add -f --
'*.fountain'` so the fixture tests run); nothing built or booted in the worktree. Server booted
from the export on port 39481 and killed — the two `server.ts` processes still alive have cwds
`/home/user/STORYMACHINE` and the worktree (the concurrent merge gates), not mine. Probes:
`.../sf2-review/r7lib.mjs`, `r7timing.mjs`, `r7probe.mjs`, `r7residual.mjs`, `http7.mjs`. I read
the code, not the (missing) report section.

**Verdict: MERGE.** This is the first round in seven where I could not construct a bypass. The
change is the structural one I asked for — the eligibility map is now built from the REAL
`parseFountain(normalizeScreenplay(text))` blocks — and I checked the mirror line by line against
`fountain-analyzer.ts` and `voice-delta.ts` rather than taking the commit message's word. Two
non-blocking items are recorded below, including one deliberate divergence that must NOT be
"fixed" later.

### 7.1 Every earlier class stays closed, and R7-1 is closed — over HTTP on the export build

```
sf2-review/http7.mjs (port 39481)
  R7-1 parenthetical-demotion ghost    chars=125,627  HTTP 400 in 194ms  REJECTED  (was 200 in 49,799ms)
  R7-0 control (no poison)             chars=125,590  HTTP 400 in  45ms  REJECTED
  round-3 CR-only double-spaced        chars=105,690  HTTP 400 in  31ms  REJECTED
  round-4 .FORCED headings past ceiling chars=121,345  HTTP 400 in  28ms  REJECTED
  round-6 lone-\r inflation            chars=132,077  HTTP 400 in  28ms  REJECTED
  LEGIT dense two-hander (3,000 turns) chars=327,022  HTTP 200 in 2,533ms  scored normally
```

### 7.2 The mirror, checked against the two source files rather than the prose

| what | `fountain-analyzer.ts` / `voice-delta.ts` | `validation.ts` (round 7) | verdict |
|---|---|---|---|
| scene grouping | `segmentScenes`: one group per `scene_heading` block; preamble folded into `scenes[0]`; zero headings → one whole-document group | `buildRealVoiceWordCounts`: same `headingIdxs` walk, same `h === 0 && headingIdxs[0] > 0` preamble fold, same zero-heading whole-document case | **identical** |
| scene ceiling | `allRawScenes.slice(0, ANALYZER_SCENE_CEILING)` (400) | `Math.min(headingIdxs.length, ANALYZER_SCENE_CEILING)` groups, constant **imported** | **identical** |
| speaker tracking | `extractSceneContent`: `currentSpeaker` per scene, set on `character`/`dual_dialogue`, **not reset by `action`**, dialogue attributed to the last cue | `walkSceneBlocks`: same, per group | **identical** |
| name normalization | `normalizeCharacterName` — `^` then `(V.O.)`/`(O.S.)`/`(CONT'D)` `gi`, then trim | `stripCueExtensionForVoiceGrouping` | **character-for-character identical** (diffed) |
| tokenizer | `tokenize`: `text.toLowerCase().match(/[a-z']+/g) ?? []` filtered by `/[a-z]/` | `voiceTokenCount`: same expression, `.length` | **identical** |
| threshold / abstain rule | `MIN_WORDS = 30`, abstain if **any** character is under it, or fewer than 2 characters | `VOICE_ELIGIBLE_MIN_WORDS = 30`, `nonZeroWordCounts.length >= 2`, `allEligible` | identical except §7.4 |

The cheap pre-parse bounds still run first and early-return (`validation.ts:1309-1327`); the parse
is reached only at `:1335`, on the path where nothing cheaper fired. `parseFountain` is imported
from `src/lib/fountain.ts`, which this file already imported for `CHARACTER_CUE_RE` — a pure leaf;
`pure-core-boundary` 6/6.

### 7.3 Cost of the second parse — measured, and under the bar

Ordinary feature-shaped payload at the size ceiling (860,417 chars: 40 majors, 600 one-line
minors, action paragraphs, 400+ scenes — ACCEPTED, so the guard runs the full parse rather than
early-returning), 3 runs each, `sf2-review/r7timing.mjs`:

```
main@85fca55a guard (hand-modelled walk)   26.2, 20.8, 20.4 ms   ACCEPT
round-7 guard (real parse)               140.2, 106.7, 107.8 ms  ACCEPT
normalize + parse alone                            50.2 ms
```

So ~**+85 ms** at the ceiling (5× the old walk, ~107–140 ms total), of which ~50 ms is the parse
the doctor will immediately repeat — the guard is a zod refinement and its blocks are discarded, so
the parse is genuinely paid twice. Under the ~150 ms bar, and ~1% of the multi-second analysis it
gates; for rejected payloads the cheap bounds still fire in 28–45 ms without parsing. Reusing the
guard's parse would mean threading blocks from validation into the route — a larger refactor than
this fix, and not worth 50 ms today.

### 7.4 The one deliberate divergence — safe, but it must be documented so a later round does not "fix" it

`realVoiceEligibleWeightRejectionReason` filters the real map with `.filter((w) => w > 0)`
(`validation.ts:1616`). `analyzeVoices` does **not**: a character whose dialogue tokenizes to zero
words (a line of pure punctuation) is a key in `dialogueByCharacter` with 0 words, so the analyzer
**abstains**. Measured (`sf2-review/r7probe.mjs`): adding `SILENT\n\n?!\n\n` to the R7-0 control
makes the analyzer abstain (201 names, one at 0 words) while the guard still **REJECTS**.

That is the *safe* direction, and deliberately so — I measured what the "faithful" fix would cost:
that exact document takes **12,407 ms** in `runScriptDoctor`
(`sf2-review`, timed). Mirroring `analyzeVoices` here would switch the bound off and accept a
12.4-second request. The current filter is therefore correct and the *mirror* claim is what is
slightly overstated. It needs a comment saying so and a test pinning the behaviour, or round 8
"restores fidelity" and reopens a regression.

(A related note for the same comment: `...` as a dialogue line is parsed as a forced **scene
heading**, not dialogue — that is why the `...` variant of this probe showed no divergence.)

### 7.5 Fail-closed branch: exercised with my own trigger, headroom is not a concern

`FAIL_CLOSED_CUE_OCCURRENCE_THRESHOLD = 6_000`, fired when the parse throws **or** yields zero
`character`/`dual_dialogue` blocks while the guard counted more than 6,000 cue-shaped lines. My
constructed trigger — 6,100 `PERSONk (mumbling)` lines (lowercase parenthetical tail: passes the
guard's union gate, fails `CHARACTER_CUE_RE`, single-spaced so nothing reflows), 450 distinct so
the cheap bounds do not fire first — gives 144,877 chars, **0 pipeline character blocks**, 6,100
guard occurrences, and rejects with the `FAIL_CLOSED_CUE_OCCURRENCE_THRESHOLD` message. Headroom
over legitimate input is not a question of margin but of shape: the branch requires *zero*
character blocks, which no real script with dialogue has, and the caps-heavy action fixture (the
one legitimate zero-character-block shape) counts **0** cue occurrences, not 6,000. Legitimate set
all accepted: **54 tracked fixtures, 20 calibration samples, the P0 sample**, a dense two-hander at
500 and 3,000 turns, the caps-heavy action feature, and the round-2 realistic 150-name skewed
feature.

### 7.6 The legacy walk is retired properly

`legacyVoiceEligibleWeightRejectionReason` is exported but has **no** production call site — 
`fountainShapeRejectionReason` ends at `return realVoiceEligibleWeightRejectionReason(...)`
(`:1335`); the legacy function appears only in the parity test. That test carries both halves the
brief asked for: an **equivalence** block asserting the legacy and real decisions agree on every
tracked fixture, every calibration sample, the P0 sample and every round 1–7 reviewer payload and
control, and a **fail-first** block proving the corpus genuinely defeats the legacy function on
≥5 cue families (so the equivalence is not vacuous).

### 7.7 Residual accepted cost — stated plainly, and why I am not calling it a blocker

The standing criterion for these rounds was "any accepted `/doctor` over 10 s". That threshold is
still crossed, but no longer by anything the guard mis-models (`sf2-review/r7residual.mjs`):

```
200 names x 10 occurrences (125,608 chars) + a genuine 2-word walk-on   ACCEPT   12,340 ms
600 names x 15 occurrences (488,602 chars) + a genuine 2-word walk-on   ACCEPT   13,566 ms
```

Here both sides *agree*: the walk-on really is under 30 words, `analyzeVoices` really does abstain,
and the ~12–14 s left is the ordinary cost of the other thirteen passes over a document sitting at
the analyzer's own 400-scene ceiling — the same 8.2 s/12.4 s a legitimate 400-scene script incurs,
and it plateaus (4× the dialogue volume adds ~10%). Bounding it would mean rejecting documents at
the ceiling the analyzer itself advertises, which is a request-timeout/pool question, not a
validation-guard one. For scale: this series started at **343,598 ms** accepted and the last four
rounds' bypasses were 42–51 s; the accepted worst case is now ~14 s. I record it so the
orchestrator can overrule me if it wants the literal criterion applied.

### 7.8 Gates I re-ran (foreground, exit codes)

```
node scripts/check-scoring-receipt.mjs 85fca55a..9057b462   exit 0  "no scoring-path files changed"
check-doctor-output-identity --tree <export> / --compare <main@85fca55a>   PASS — 45/45 byte-identical
tests/security/fountain-shape-guard-cue-parity.test.ts     646 pass / 0 fail
tests/routes/fountain-shape-guard-cue-bypass.test.ts        57 pass / 0 fail
tests/core/pure-core-boundary.test.ts                        6 pass / 0 fail
```

Not re-run, per the budget: full `npm test`, `lint`, `check-docs`, `honesty-audit`, `fuzz-routes`,
the browser battery (the coordinator is running the merge gates in the worktree).

### The numbered list (both non-blocking; MERGE stands)

1. **Document the deliberate `w > 0` divergence at `server/lib/validation.ts:1616`, and pin it.**
   `analyzeVoices` counts a zero-token character and abstains; the guard filters it out and
   rejects. That is the safe direction — I measured the "faithful" alternative at **12,407 ms**
   accepted (`SILENT\n\n?!\n\n` appended to the R7-0 control; the guard rejects it today) — but the
   surrounding comments claim a mirror, so a later round could "restore fidelity" and reopen a
   regression. One sentence plus one test.

2. **Record the measured double-parse cost next to the new parse call.** The guard now runs
   `normalizeScreenplay + parseFountain` (~50 ms at the 860,417-char ceiling) that `runScriptDoctor`
   immediately repeats; total guard time went from 20–26 ms to 107–140 ms on an accepted
   feature-shaped payload at the ceiling. Worth a line in the comment so the next person sizing a
   request budget has the number, and so reusing the parse (threading blocks out of validation) is
   an explicit, deferred option rather than an unnoticed one.
