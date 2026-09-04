# Independent re-verification — STORYMACHINE main @ c21fdc5b — 2026-09-04

Read-only. Baselines extracted with `git archive` under this scratchpad,
`node_modules` symlinked from the working tree so both sides resolve identical deps.

## Claim 1 — Corpus contamination (`c21fdc5b`) — REPRODUCED

Method: my own harness (`h1-parse.mts`, `h2-clues.mts`) importing each tree's own
`src/lib/fountain.ts` and `server/nvm/analyze/fountain-analyzer.ts`; plus the repo's
`check-doctor-output-identity.mjs` run over `git archive c21fdc5b^` vs `c21fdc5b`.

| sub-claim | theirs | mine | verdict |
|---|---|---|---|
| `//` headers parse as action | yes | 161/161 header lines typed `action` in the before tree; 201/201 `boneyard` after | REPRODUCED |
| header size | 3–15 lines, 22–149 words | 3–15 lines; 25–164 whitespace tokens incl. the `//` marker = 22–149 words excl. it | REPRODUCED |
| clue seeds from headers | 106 of 237 (44.7%) | sum-of-per-file-distinct seeds 237 with header, 131 without; 106 present only with the header | REPRODUCED exactly |
| undertow scene-1 suspense | 3 → 0 | 3 → 0 (series `[3,0,0,0,0,1,0,1,0,-1,0,0]` → `[0,...]`) | REPRODUCED |
| suspense moved at index 0 only | yes, 13 files | exactly 13 files moved, all at index 0, no other index moved in any of the 20 | REPRODUCED (all 13 before→after values match the receipt digit for digit) |
| calibration byte-identical, 25 of 45 moved | yes | `OUTPUT IDENTITY: FAIL — 25 fixture(s) differ`; 0 of the 20 calibration samples differ; the 25 are the 20 screenplays + p0 sample + 4 synthetics | REPRODUCED |
| per-fixture health/findings/verdict/scene table | 22 rows | every health value, every findings count, every verdict and every scene count matches | REPRODUCED |
| undertow loses CLIMAX_TOO_EARLY + FALSE_CLIMAX from top ten | yes | confirmed | REPRODUCED |

### Two errors found IN the receipt (number holds, prose does not)
1. "13 files moved there, **7 were already 0 there and did not move at all**" — of the 7
   that did not move, only 4 were at 0 (room-12, runoff, the-detour, transfer-window).
   counter-offer sat at 1, off-season at 1, dead-frequency at **3** and none of them moved.
   The stated reason for their non-movement is false; the shape claim ("moved at index 0 and
   nowhere else") is still true.
2. "18 of 21 non-synthetic fixtures up, 1 down, 2 flat" — measured **15 up, 1 down, 5 flat**.
   The receipt's OWN table lists five flats (counter-offer, dead-frequency, off-season,
   runoff, p0/sample-script), so the summary line contradicts the table above it.

## Claim 2 — Server freeze (`2c760e16`, `b1d91955`) — REPRODUCED (exports) / PARTIALLY (compare)

Method: `git archive 2c760e16^` (= `547ea7f1`) and `git archive b1d91955^` (= `63e156db`)
into scratch trees, the CURRENT `scripts/load-test-doctor.mjs` copied into each so the
same instrument ran on both sides, `.vectors` deleted before every compare run. Plus my
own independent probe (`probe-freeze.mjs`): boot the tree's server, fire ONE request at a
route, probe `/health` every 25 ms, report probes answered, longest single `/health`
response and longest gap between consecutive answered probes. Same container, 4 CPUs.

### Export routes — `/health` p95 while the route is under load (4-wide x 2 rounds, 150 scenes)

| route | their before | my before | their after | my after |
|---|---|---|---|---|
| /api/scriptide/doctor (control) | 218 | 127 | 165 | 97 |
| /api/export/coverage-letter | 1,794 | 1,728 | 15 | 9 |
| /api/export/coverage | 1,875 | 1,762 | 122 | 129 |
| /api/export/pitchkit | 1,749 | 1,739 | 104 | 57 |
| /api/export/slate | 3,939 | 3,347 | 11 | 20 |
| /api/export/verify | 1,567 | 1,542 | 7 | 7 |

Probes answered per export phase: theirs 3–5 before / 23–58 after; mine 3–4 before /
19–37 after. **REPRODUCED.**

### My independent single-request probe (one request, no concurrency)

| route | tree | probes answered during the request | longest /health stall |
|---|---|---|---|
| /api/export/slate | before | 6 | 1,723 ms |
| /api/export/verify | before | 5 | 1,131 ms |
| /api/nvm/analyze/compare | before | 9 | 1,154 ms |
| /api/export/slate | after | 83 | 539 ms |
| /api/export/verify | after | 63 | 555 ms |
| /api/nvm/analyze/compare | after | 67 | 537 ms |

A SINGLE unauthenticated request really did stall `/health` for over a second before the
fix. That part is unambiguous and stronger than a p95 shows.

### Something they did not report
The after tree still shows a **~540 ms `/health` stall, uniform across all three routes**,
on the FIRST request to a fresh server. The receipt attributes the compare route's
residual (p99 460 ms) to `clusterCorpus`/`alignVectors` — an explanation that cannot cover
`/api/export/verify` or `/api/export/slate`, which do no vector work. I isolated it: with
the pool already warmed by one prior request AND a cache-missing payload, the same routes
hold the loop for **6 ms and 26 ms**. So the residual is worker-pool COLD START, not
per-request main-thread work — which makes the fix better than claimed and the stated
cause wrong.

### Compare route — PARTIALLY REPRODUCED

| statistic | theirs | mine |
|---|---|---|
| /health p95 during compare phase | 2,420 → 51 ms | **734 → 60 ms** |
| probes answered | 19 → 43 | 21 → 74 |
| compare route's OWN mean latency | 3,509 → 2,461 ms | **3,590 → 4,565 ms** |
| control route /health p95 | 20 → 21 ms | 42 → 101 ms |

The after value (51 vs 60 ms) reproduces; the **before value does not** — I measure the
pre-fix `/health` p95 at 734 ms, not 2,420 ms, so the improvement is ~12x in my run and
~47x in theirs. p95 over ~20 probes is a single order statistic and is not a stable
number; the receipt reports it to four significant figures. Their claim that "the control
moved by 1 ms, which is what says the compare-route number is the change and not the
weather" does not survive re-running: my control moved 42 → 101 ms, i.e. the weather on
this container is worth more than 1 ms and their 1 ms was luck, not method.
**Their claim that the compare route's own latency improved (3,509 → 2,461 ms) is NOT
REPRODUCED** — I measured it getting slower (3,590 → 4,565 ms mean). Directionally the
event-loop claim holds; the specific latency-improvement claim does not.

## Claim 4 — Log leakage (`fda5777c`) — REPRODUCED

Method: my own in-process harness (`h4b.mts`) importing each tree's own `Agent.ts`,
`DirectorNode.ts`, `agent/memory.ts`, `Stage.ts` and `ai.ts`; a fake `LLMProvider` whose
malformed output BEGINS with a story marker (so V8's own 10-char snippet would carry it);
a character sheet whose `name` is a second marker; stdout/stderr captured for the whole
run. Trees: `git archive fda5777c^` (= `2c760e16`) vs `c21fdc5b`.

| tree | flag | character-name hits | story-text hits |
|---|---|---|---|
| pre-fix | unset | **3** | **3** |
| pre-fix | =1 | 3 | 3 (flag did not exist) |
| post-fix | unset | **0** | **0** |
| post-fix | =1 | 0 | **8** |

The pre-fix leaking lines, verbatim:
`{"msg":"agent_parse_fallback","agent":"QQCHARACTERNAMEQQ","method":"takeTurn","preview":"QQSTORYTEXTQQ she never told anyone what happened to her brother behind the quarry fence, and the model forgot to emit J"}`
— a 120-char verbatim preview of the model's output plus the character's display name, ×3.

**V8 `JSON.parse` snippet behaviour, reproduced directly:**
`JSON.parse('QQSTORYTEXTQQ she never told…')` → `Unexpected token 'Q', "QQSTORYTEX"... is not valid JSON`.
Confirmed in the running engine too — pre-fix: `{"msg":"json_parse_error","message":"Unexpected token 'Q', \"QQSTORYTEX\"... is not valid JSON"}`;
post-fix: `{"msg":"json_parse_error","errorName":"SyntaxError","input":{"length":130,"sha256_12":"b8ad4d895fb8"}}`.

One nuance the record does not state: the V8 snippet form leaks **exactly 10 characters**,
and only when the response does not begin with valid JSON — a fenced ```` ```json ```` reply
leaks only the fence. The unbounded leak was the hand-written `preview:` field, not V8.
The fix is correct either way; the record slightly over-attributes the severity to V8.

## Claim 5 — Advice audit figures (`origin/claude/advice-rule-fixes-pending-measurement` @ `68c64eca`) — PARTIALLY REPRODUCED

The audit doc named in the brief (`scratchpad/advice-quality-audit.md`) is not in the
repository or in any commit; the committed statement of these figures is
`docs/scoring/ADVICE_RULE_FIXES_2026-09-04.md` on the branch (parent = `c21fdc5b`).

Method: `git archive 68c64eca` into a scratch tree; the branch's two fixtures scored with
BOTH the branch's `doctor.ts` and main's, via my own runner (`h5-pair.mts`). Reversal
predicate measured with my own harness (`h5-rev.mts`) over the 42 scripts the repo ships
(20 `data/screenplays` + 20 calibration `REFERENCE_CORPUS` + the 2 new fixtures).

| claim | theirs | mine | verdict |
|---|---|---|---|
| pair both score 76.0 on main | 76.0 / 76.0 | **76.0 / 76.0**, grade `strong`, verdict CONSIDER both | REPRODUCED |
| top-ten overlap on main | 7 of 10 | **7 of 10** | REPRODUCED |
| pair still 76.0/76.0 on the branch | 76.0 / 76.0 | **76.0 / 76.0** | REPRODUCED |
| branch top-ten overlap | 7 of 10 | **7 of 10** | REPRODUCED |
| branch issue/critical/strength counts | EXC 132/0/2, BAD 150/1/0 | **EXC 132/0/2, BAD 150/1/0** | REPRODUCED exactly |
| BEFORE issue counts | EXC 158, BAD 148 | **EXC 159, BAD 147** | NOT REPRODUCED (±1 each) |
| `suspenseDelta < -1` reachability | 0 / 42 | **0 / 42** | REPRODUCED |
| `suspenseDelta <= -1` reachability | 24 / 42 (26/42 on the branch) | **24 / 42; 26 / 42 on the branch** | REPRODUCED exactly |
| suspenseDelta is integer-valued | yes | yes; global min across all 42 scripts is **-1** | REPRODUCED |

### The brief's "29 scripts" does not exist
The record says "**29 executable call sites** now share one definition", not 29 scripts.
The script figure is 0/42. (I could not land exactly 29 by any counting convention I tried:
`grep` for a non-comment `suspenseDelta < -1` on main gives 27 lines, several of which are
inside user-facing description STRINGS rather than predicates; the branch's shared helper
has 23 non-definition usage lines. Order of magnitude right, exact number not reproducible.
Not material to the finding.)

### The "before" row was not measured on the committed inputs
159/147 is what both `c21fdc5b` (the branch's parent) and `af61cb3c` produce for the
committed fixtures. Stripping the fixtures' boneyard headers gives 157/145. Nothing I can
construct gives 158/148. Since boneyard text still counts toward `wordCount` (the health
density denominator — the residual the corpus-integrity receipt itself documents), the most
likely explanation is that the "before" row was measured against an earlier draft of the
fixture files than the ones committed. That makes the doc's before/after pair a comparison
across two different inputs, which is exactly the mistake the output-identity harness's own
header warns about ("PICK THE BASELINE CAREFULLY"). The conclusion — the composite cannot
separate the pair — is unaffected, because health is 76.0 on both sides either way.

## Claim 6 — Anchor share (`ab59ad4a`, `5cf8de83`) — REPRODUCED exactly

Method: my own harness (`h6-anchor.mts`, `h6-cluster.mts`) — `runScriptDoctor`, then the
tree's own `locateIssues` over `report.passes.flatMap(...)`, counting `anchor === 'document'`.
Trees: `git archive ab59ad4a^` (= `2775c4fd`) vs `ab59ad4a`; `ab59ad4a` vs `5cf8de83`.

| fixture | their before → after | my before → after |
|---|---|---|
| sample | 81.6% → 46.6% | **81.6% → 46.6%** |
| chain-of-custody | 81.5% → 45.1% | **81.5% → 45.1%** |
| red-line | 84.7% → 50.6% | **84.7% → 50.6%** |
| low-tide-strong | 83.2% → 40.6% | **83.2% → 40.6%** |
| firebreak-troubled | 73.7% → 44.2% | **73.7% → 44.2%** |
| TOTAL | 81.8% (666/814) → 46.4% (378/814) | **81.8% (666/814) → 46.4% (378/814)** |

Every figure identical, including the denominator.

Largest cluster on `red-line`: **memberCount 112, severity critical, lines 1–143** before
`5cf8de83`; **15** after (and still 15 on the `c21fdc5b` tip). The sibling document-family
dumps they name (38, 31, 30, 16) reproduce exactly. REPRODUCED.

One note on their prose: the record calls it "112 members"; the cluster's `memberRules`
array holds 107 (distinct rule names) and `memberCount` holds 112. Both fields exist; the
one they quoted is the right one for the claim they made.

## Claim 7 — Accessibility (`63e156db`, `26b828f4`, `bee9310e`) — SPLIT: the `.sm-title` claim REPRODUCED; "zero serious/critical" NOT REPRODUCED

### (a) The `.sm-title` cascade collision — REPRODUCED exactly
`design-system.css` line 92 sets `.sm-title{...;color:var(--sm-ink)}` and loads AFTER
Tailwind, so `text-[var(--sm-cream)]` (identical 0,1,0 specificity) lost on source order.
Measured live in a real Chromium, Ship panel, `git archive 63e156db^` (= `fda5777c`):

    {"t":"Ship","fg":"33,29,21","bg":"26,23,18","r":1.06}   ← BEFORE

`#211d15` ink on `#1a1712` night chrome = **1.06:1**. At the tip the same element measures
**15.16:1** (`fg 242,236,221`). "Roughly 1:1" is if anything generous to themselves.
Arithmetically confirmed independently: `contrast(#211d15, #1a1712) = 1.065`.

### (b) "axe reports zero serious/critical violations on the audited surfaces in both themes now" — NOT REPRODUCED

I ran axe-core 4.x from `node_modules` myself, tags
`wcag2a,wcag2aa,wcag21a,wcag21aa,best-practice`, **no rule exclusions and no allowlist**,
on the current tip. `verify-a11y.mjs`'s own `KNOWN_UNFIXED_RULE_IDS` is empty, so the
exclusion list is not where the difference lives — the difference is WHEN it looks.

Landing surface (`StartScreen`), settled 4 s, **light AND dark**: 4 serious
`color-contrast` violations, every run:

| node | measured | required |
|---|---|---|
| `#entrance-actions-heading` ("Start here") | 3.45:1 | 4.5:1 |
| `.text-[var(--sm-cream)]/70` (badge on `#c1301c`) | 3.05:1 | 4.5:1 |
| `.whitespace-normal` (badge on `#c1301c`) | 3.55:1 | 4.5:1 |
| `.text-ink/35` | **2.23:1** | 4.5:1 |

`verify-a11y.mjs` reports `[PASS] landing :: axe: zero serious/critical violations — clean`,
and its whole run is 69/69. I reproduced why, by auditing the SAME page at four times in one
session, from the exact moment `verify-a11y.mjs` audits it:

    T0 (exactly verify-a11y.mjs's moment) => CLEAN
    T0+1s                                 => color-contrast(11)
    T0+3s                                 => color-contrast(4)

The stylesheet count and CSS rule count are identical at all four points (1 sheet, 124
rules), so this is not a CSS load race — the landing page's own content mounts after the
`Start fresh` button that the suite waits on. **The landing surface's axe PASS is a timing
artifact.** The editor surface is genuinely clean in both themes at rest (I re-checked with
a 4 s settle), so this is not a blanket failure of the a11y work — the a11y work is real —
but the headline "zero serious/critical on the audited surfaces in both themes" is false as
written, and the suite that certifies it cannot see the violations it certifies against.

This is the more serious form of the problem the record itself already worries about
elsewhere ("the tests asserted the behaviour that was written, not the promise that was
made"): here the test asserts the promise, and misses because it looks too early.

## Claim 8 — Identity receipts dated 2026-09-02 or later — REPRODUCED (5 of 5 checked)

All five receipts dated 2026-09-02+ cite a baseline SHA. **Every cited baseline resolves**
(`305bb4ab`, `5f6e38a6`, `568efc86`, `e68435ca`, `63e156db`, `26b828f4`, `fbd8ee15`).
I re-ran `scripts/check-doctor-output-identity.mjs` myself, snapshotting each cited baseline
and the commit where that lane landed on `main`.

| receipt | baseline → landed | claimed | mine |
|---|---|---|---|
| compare-route off-thread (2026-09-04) | `63e156db` → `b1d91955` | `PASS — all 45 reports are byte-identical` | **identical string** |
| Unicode character cues (2026-09-03) | `e68435ca` → `c3613515` | `PASS — all 45 reports are byte-identical` | **identical string** |
| R6 engine-version surface (2026-09-03) | `568efc86` → `8caa0971` | PASS modulo 4 keys, each `differs in 45/45 reports`, 3 require-added confirmed | **identical output, verbatim, all four differ counts 45/45** |
| R6 negative control | same two dirs, no flags | `FAIL — 45 fixture(s) differ.` | **`FAIL — 45 fixture(s) differ.`** |
| corpus-integrity rebase check (2026-09-04) | `fbd8ee15` vs `26b828f4` | "all 45 baseline reports are byte-identical" | **PASS, all 45 byte-identical** |
| corpus-integrity main claim (2026-09-04) | `26b828f4` → `c21fdc5b` | `FAIL — 25 fixture(s) differ`, calibration untouched | **`FAIL — 25 fixture(s) differ`, 0 calibration** |

No receipt in this set failed to reproduce and no cited baseline failed to resolve. The
identity-receipt discipline is the strongest-verified thing in these two days' record.

## Claim 3 — "Delete Everything" (`547ea7f1`) — REPRODUCED (3 of the 4 named survivors confirmed directly; the 4th not observable from outside the process)

Method: my own probe (`h3-delete.mjs`). Real Chromium, real app. `SESSION_DB_DIR` and
`SESSION_BACKUP_DIR` pointed at a fresh scratch root per run. The marker was typed into the
REAL CodeMirror editor (`keyboard.insertText` on the focused `.cm-content`), then a save, a
`POST /api/reset` (which publishes the server-side backup), a re-save, a minted collab room
plus a token, and a cold+warm doctor call to prove the report cache was live. The wipe was
performed through the real UI: More tools → Labs & Settings → the `Session` tab → `Delete
Everything` → `Yes, delete everything`, waiting on the control's OWN `framenavigated`.
IndexedDB was **enumerated** via `indexedDB.databases()` and every object store dumped with
`getAll()` — no database or store name is assumed anywhere. Non-vacuity checks were added
first: the probe FAILS if the marker was not actually in IndexedDB and localStorage before
the wipe.

### At the tip (`c21fdc5b`) — 15/15 PASS
Non-vacuity confirmed (`databases=[storymachine_scriptide_v1]` holds the marker; localStorage
holds it; the `.db-wal` holds it at 622,152 b; the backup `.db` holds it at 249,856 b; the
token returns 200; warm doctor call 7 ms vs 1,990 ms cold). After the control:

- localStorage: clean (only `sm_app_view_v1`, `sm_session_id_v1` remain)
- sessionStorage: clean
- IndexedDB (enumerated): clean — the database is gone entirely
- session SQLite file **and its WAL**: gone (`SESSION_DB_DIR` empty)
- reset-backup directory: clean
- collab token for the deleted room: **404**, not 200
- doctor cache: post-delete call takes 1,035 ms (vs a 7 ms warm hit) — recomputed

### On the pre-fix tree (`git archive 547ea7f1^` = `7488d622`) — 3 FAILS, exactly as claimed

| store | pre-fix result |
|---|---|
| reset-backup directory | **SURVIVED** — a readable 249,856-byte SQLite copy of the whole session still on disk after the wipe (the record says "a 249KB readable copy"; that is this file) |
| collab registry / Y.Doc | **SURVIVED** — `POST /api/collab/token` answered **200** for the room the session had just deleted everything for |
| doctor report cache | **SURVIVED** — the post-delete doctor call returned in **10 ms** against a 2,048 ms cold cost: a cache hit |
| worker realms | COULD NOT TEST separately — from outside the process a worker-held copy and the main-thread cache are the same 10 ms observation. The other three are confirmed; this one I can neither confirm nor refute, and I would not have claimed it from this vantage point. |

localStorage, sessionStorage, IndexedDB and the live SQLite file were already clean on the
pre-fix tree, which is what the record says (those two stores were the ones E4 covered).
Verdict: REPRODUCED.

---

## Tally

| # | claim | verdict |
|---|---|---|
| 1 | Corpus contamination (`c21fdc5b`) | **REPRODUCED** (2 prose errors found inside the receipt) |
| 2 | Server freeze — export routes (`2c760e16`) | **REPRODUCED** |
| 2b | Server freeze — compare route (`b1d91955`) | **PARTIALLY** (after value holds; before value 734 ms not 2,420 ms; the "own latency improved" claim NOT REPRODUCED) |
| 3 | Delete Everything (`547ea7f1`) | **REPRODUCED** (3 of 4 named survivors confirmed; "worker realms" not separately observable) |
| 4 | Log leakage (`fda5777c`) | **REPRODUCED** |
| 5 | Advice audit figures (branch `68c64eca`) | **PARTIALLY** (all headline figures reproduce; the "before" issue counts 158/148 do not — I get 159/147) |
| 6 | Anchor share (`ab59ad4a`, `5cf8de83`) | **REPRODUCED** (every figure, to the decimal) |
| 7a | `.sm-title` cascade collision at ~1:1 | **REPRODUCED** (measured 1.06:1 live) |
| 7b | axe zero serious/critical, both themes | **NOT REPRODUCED** (4 serious color-contrast violations on the landing surface at rest, both themes; the suite's PASS is a timing artifact) |
| 8 | Identity receipts, 5 checked | **REPRODUCED** (5/5, verbatim; every cited baseline resolves) |

Reproduced 7 · Partially 2 · Not reproduced 1 · Could not test 1 sub-item.

## Things they missed or got wrong

1. **Landing page has 4 serious WCAG AA contrast failures right now** (claim 7b). Worse than
   the miss itself: `verify-a11y.mjs` audits that page before its content settles, so the
   gate is structurally blind there. Same page, same session: CLEAN at the suite's moment,
   11 violating nodes 1 s later, 4 at rest. Any future landing-page contrast regression is
   invisible to this gate.
2. **The ~540 ms residual `/health` stall after the pool fix is worker COLD START**, not
   `clusterCorpus`/`alignVectors` as the record states — it appears identically on
   `/api/export/verify` and `/api/export/slate`, which do no vector work, and vanishes
   (6–26 ms) once the pool is warm and the payload misses the doctor cache. The fix is
   better than claimed; the stated cause is wrong.
3. **The compare route's `2,420 → 51 ms` figure is a p95 over ~20 probes.** Their control
   moving "by 1 ms, which is what says the compare-route number is the change and not the
   weather" was luck: my control moved 42 → 101 ms on the same container. The effect is real
   and large; the precision claimed for it is not supportable from one run.
4. **The corpus-integrity receipt contradicts its own table** ("18 of 21 up, 1 down, 2 flat"
   vs its own five flat rows; actual 15/1/5) and misstates why 7 scripts did not move
   ("already 0 there" — three of them sat at 1, 1 and 3).
5. **The advice branch's "before" row was measured against inputs that are not the committed
   fixtures** (159/147 on both candidate baselines, 157/145 with the headers stripped; the
   doc says 158/148).
6. **The brief's own "0 of the 29 scripts" is a mis-transcription** of "29 executable call
   sites"; the script figure is 0 of 42, which reproduces exactly.
7. The V8 `JSON.parse` leak is bounded to **10 characters** and only fires when the response
   does not begin with valid JSON. The record's framing ("put the writer's words into the
   logs") is true of the hand-written `preview:` field (120 chars, verbatim), not really of
   V8. Same fix, over-attributed cause.

## Provenance of this run
- Every before/after tree was a `git archive` of a named SHA under this scratchpad, with
  `node_modules` symlinked from the working checkout so both sides resolved identical deps.
- The repository was never modified: `git status --short` is empty and no commit, stash,
  checkout or push was made. `.claude/worktrees/` ignored. Only `git fetch origin` of the
  one named branch ref was run (read-only, no HEAD movement).
- **Main moved under me mid-run.** It was `c21fdc5b` at the start and `975eada2` at the end
  (`0a0edcc9`, `fe98ab36`, `975eada2` landed at 17:35 UTC from a parallel session). Every
  code comparison in this report was against a pinned archive, so nothing is contaminated;
  the two browser probes that used the live checkout (claim 3, claim 7) were re-run against
  the pinned `c21fdc5b` archive and produced identical results.
- Artifacts: `h1-parse.mts`, `h2-clues.mts`, `h3-delete.mjs`, `h4b.mts`, `h5-pair.mts`,
  `h5-rev.mts`, `h6-anchor.mts`, `h6-cluster.mts`, `my-axe*.mjs`, `probe-freeze*.mjs`,
  `load-*.log`, `id-*/`, `r-*/` — all under this scratchpad.
