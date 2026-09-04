# Evening batch audit — 975eada2..948c2a6b (2026-09-04)

Read-only audit in worktree `/home/user/STORYMACHINE/.claude/worktrees/agent-af5e391ed56645643` at `948c2a6b`.
Every claim was assumed false until reproduced. Every probe was reverted; `git status` is clean.

## Area: Fountain shape guard + fdx/pdf post-conversion application (3ed845ef)

Verdict: **PARTIAL — the routing hole is closed, the guard it routes to is not sound.**

The commit's own claim ("all 9 routes now reject an uploaded fdx/pdf whose converted
Fountain has 1,600 distinct character cues") reproduces. What does NOT hold is the
implied property that the guard stops the shape.

`CUE_LIKE_LINE_RE` in `server/lib/validation.ts:228` is
`/^[A-Z0-9 .,'()&\-]{1,40}$/` — ASCII-only, capped at 40 chars. The analyzer's own
cue test, `CHARACTER_CUE_RE` in `src/lib/fountain.ts:81`, is
`^[\p{Lu}\p{Lt}][\p{Lu}\p{Lt}\p{M}0-9 \t'.#\-]*...$` with the `u` flag and **no length
cap**. Four disjoint families of line are real character cues to the analyzer and
invisible to the guard: any non-ASCII capital script (Cyrillic, Greek, accented Latin),
any cue containing `#`, and any cue longer than 40 characters.

Measured, guard function vs parser, 3,000 cues each:

```
asciiPlain   len 84017 | guard: REJECT | parser cue blocks: 3000
cyrillic     len 81017 | guard: PASS   | parser cue blocks: 3000
greek        len 84017 | guard: PASS   | parser cue blocks: 3000
hashName     len 75017 | guard: PASS   | parser cue blocks: 3000
long41       len 168017| guard: PASS   | parser cue blocks: 3000
```

The cost the guard exists to prevent is intact. Direct `runScriptDoctor` timings:

```
control-2names-2000  chars 38017  ms  339
cyrillic-1000        chars 27017  ms 1032
cyrillic-2000        chars 54017  ms 4639     (4.5x for 2x input — quadratic)
```

End to end through the live routes (`POST /api/scriptide/doctor`, dev server, N=2000):

```
raw fountain  ascii x2000     HTTP 400     96ms GUARD-REJECTED
raw fountain  cyrillic x2000  HTTP 200   6345ms REACHED-ANALYZER
raw fountain  hash x2000      HTTP 200   2131ms REACHED-ANALYZER
raw fountain  long41 x2000    HTTP 200   6386ms REACHED-ANALYZER
fdx-converted ascii x2000     HTTP 400     19ms GUARD-REJECTED
fdx-converted cyrillic x2000  HTTP 200    122ms REACHED-ANALYZER  (report cache hit)
fdx-converted hash x2000      HTTP 200     43ms REACHED-ANALYZER
fdx-converted long41 x2000    HTTP 200     79ms REACHED-ANALYZER
```

At `MAX_FOUNTAIN_CHARS` (900,000) a Cyrillic-cue payload carries ~33,000 distinct cues;
quadratic extrapolation from the 2,000-cue measurement puts that at ~20 CPU-minutes per
request, single-shot, unauthenticated, on every one of the nine routes the commit
"closed". The commit's regression tests only ever send the ASCII shape, so they pass
while the vector is open.

Edges that DO hold:
- huge-token guard at its ceiling: 440 tokens x 2000ch (880,456ch) -> HTTP 200 in 1777ms.
- one 2001-char token -> HTTP 400 in 6ms.
- the largest cue set the guard permits (1500 distinct ASCII cues, 42,017ch) -> HTTP 200
  in 3163ms — allowed, and already the most expensive legal request on the route.

Reproduce: `node scratchpad/audit-evening/probe-guard.mjs` (BASE=<dev server>).

## Area: collab WS frame cap (36148055)

Verdict: **REPRODUCED.**

Drove it: `POST /api/collab/rooms` -> `POST /api/collab/token` -> real `ws` connection to
`/collab/<room>?token=...`, then one frame per size.

```
room create: 200 {"roomId":"-G2kL24bf_izGUF1hkp6kQ"}
frame      1024 bytes -> STILL OPEN after 1500ms (frame accepted)
frame   2096128 bytes -> STILL OPEN after 1500ms (frame accepted)   (2MiB - 1KiB)
frame   2098176 bytes -> closed code=1009                            (2MiB + 1KiB)
frame  16777216 bytes -> closed code=1009
```

`COLLAB_MAX_FRAME_BYTES` (default 2MiB) is enforced by `ws`'s `maxPayload` and answers
with the correct 1009 (Message Too Big). Reproduce:
`node scratchpad/audit-evening/probe-collab.mjs`.

## Area: production compression / cache differentiation / /assets 404 (c369c9e3)

Verdict: **REPRODUCED**, with one observability gap.

`npm run build` then `NODE_ENV=production PORT=4312 npx tsx server.ts`:

```
/                          200  enc=(none) cc=no-cache
/some/deep/link            200  enc=(none) cc=no-cache
/scriptide                 200  enc=(none) cc=no-cache
/assets/index-D7zYcsnx.js  200  enc=br     cc=public, max-age=31536000, immutable
/favicon.svg               200  enc=(none) cc=public, max-age=0
/assets/does-not-exist.js  404  application/json
/api/nope                  404  application/json
POST /api/scriptide/doctor 200  enc=br  vary=Accept-Encoding  wire bytes=53739
```

Deep links and `/` agree on `no-cache`; hashed assets get the year-long immutable
cache; bare-named `favicon.svg` revalidates. Compression is real (brotli negotiated) on
both static assets and JSON API bodies.

Path traversal (with `curl --path-as-is`, so the client does not normalize the path
away before it is sent):

```
/assets/../../.env                404 application/json
/assets/../server/app.ts          404 application/json
/assets/%2e%2e/%2e%2e/.env        404 application/json
/assets/..%2f..%2f.env            404 application/json
/assets/%2e%2e%2f%2e%2e%2f.env    404 application/json
/assets/subdir/../index-*.js      200 (correctly resolves to the real asset)
```

The guard holds on every variant. (A plain `fetch()` of `/assets/../../.env` returns 200
+ index.html, but that is the *client* collapsing the path to `/.env` before it leaves —
the request never carries an `/assets` prefix. Not a server hole; worth knowing before
someone files it as one.)

### SSE under production compression — the specific thing that could have broken

Verdict: **REPRODUCED.** `POST /api/scriptide/doctor/stream` on a 400-scene script,
`Accept-Encoding: gzip, deflate, br`, `NODE_ENV=production`:

```
status 200 | content-type text/event-stream | content-encoding (none) | vary (none)
37 network chunk(s), 2151450 bytes total, stream finished at 305ms
  +     7ms      77B  data: {"type":"doctor_progress","event":{"type":
  +    24ms      99B  data: {"type":"doctor_progress","event":{"type":
  +   172ms   65521B  data: {"type":"doctor_progress",...
  ...
first chunk at +7ms, last at +305ms (spread 298ms)
```

The filter fires: no `content-encoding`, no `Vary`, and progress frames arrive at +7ms
and +24ms — long before the stream ends at +305ms. A buffering compressor would have
produced one arrival. The lazy-filter reasoning in `server/app.ts` (Content-Type is set
before the first write, so `filter` sees it) holds in practice.

### HALF-WIRED: production request logging loses the mount prefix

`requestLogger()` reads `req.path` at response time, after Express's `app.use('/assets',
…)` and `app.use('/api', …)` mounts have stripped their prefix from `req.url`. Measured
in the live production server's own log:

```
GET /assets/index-D7zYcsnx.js  -> logged as {"path":"/index-D7zYcsnx.js","status":200}
GET /assets/does-not-exist.js  -> logged as {"path":"/does-not-exist.js","status":404}
GET /api/nope                  -> logged as {"path":"/nope","status":404}
GET /assets/                   -> logged as {"path":"/","status":404}
```

So the two 404 guards this batch added are invisible in the logs as *asset* or *api*
404s — an operator reading production logs cannot distinguish a missing asset from a
missing SPA route, which is exactly the signal the guards exist to produce.

## Area: doctor-pool pre-warm (fd5b2a68)

Verdict: **PARTIAL — it works, and it does not protect the request it was built for.**

Three boots, each measuring the first real `POST /api/scriptide/doctor` against a
30-scene script:

```
prewarm ON,  request fired the instant the port accepts   first 2432ms  second  93ms
prewarm ON,  request fired after doctor_pool_prewarmed    first  120ms  second  55ms
prewarm OFF (DOCTOR_POOL_PREWARM=0), instant              first 2886ms  second  73ms
```

`void warmDoctorPool()` is called from *inside* `server.listen()`'s callback
(`server.ts:161-171`), so the port is already accepting connections for the entire
~2.1-2.7s warm-up window (`doctor_pool_prewarmed … "ms":2391` / `"ms":2670` /
`"ms":2125` across the boots I measured). A request that lands in that window still pays
2.4s — 84% of the un-warmed cost. The win is real only for a request that arrives after
the window, and nothing in the process tells a load balancer, orchestrator or health
check when that is. In a rolling deploy the first user request is precisely the one that
lands inside the window.

Reproduce: `node scratchpad/audit-evening/probe-prewarm.mjs`.

## Area: structural signals — cross-surface agreement (3b6db1c4, c49ea3d6)

Verdict: **HALF-WIRED.** The numbers that ARE shown agree everywhere. Two surfaces are
missing readings a third shows.

Driven in Chromium (StartScreen -> "Try sample coverage" -> "Full report"), sample
script, 12 scenes:

- panel "Shape & Rhythm": `Talk/action swing 0.28`, `Action-prose variation 0.64`
- `report.structuralSignals`: `meanAbsDialogueShareDelta 0.2846`, `actionSentenceCvOverall 0.6385`
- exported coverage HTML `sig-note`: `mean talk/action swing 0.28 · action-sentence variation 0.64`
- coverage letter: same two values in prose

Per-scene tooltips match `coverage-html.ts`'s verbatim, e.g.
`INT. KQRS RADIO STUDIO - NIGHT — 135 words (z -0.09) · dialogue 27% (Δ +0.00) · 1
speaker(s), 1 turn(s), 36.0 words/turn · lead share 100% · new pairings 0 · open/close
shift 0.30`. 12 bars in the panel, 12 `sig-cell`s in the HTML, 12 `sceneLineSpans`.
**Numbers agree across every surface that shows them.**

Interaction works, including the keyboard path the brief asked about:

```
scene bars: 12, disabled=0, tabindex=default
focus() a bar -> activeElement = "Scene 3: EXT. ROUTE 9 - MILLER BRIDGE - PRE-DAWN — jump to this scene"
Enter  -> editor flash count 0 -> 12
click  -> editor flash count 12 -> 14
```

375px: strip is 276px wide inside a 375px viewport, `bodyScrollWidth == clientWidth ==
375` — no horizontal page overflow; the strip scrolls inside itself as designed.

### Where it is not wired

| surface | shape signals | draft rank | health percentile |
|---|---|---|---|
| ScriptDoctorPanel | yes (2 aggregates + 12-scene strip) | yes | yes |
| exported coverage HTML (`/api/export/coverage`) | yes (7 aggregates + strip) | **no** | **no** |
| coverage letter (`/api/export/coverage-letter`) | yes (2 aggregates) | yes | yes |
| fix & verify receipt | only when `usedLLM` (see below) | n/a | n/a |
| snapshot trend (Versions) | yes (2 aggregates) | **no** | **no** |
| `/api/export/verify` | **no** | **no** | yes (in `recomputed`) |
| `/api/export/slate` | **no** | **no** | yes |

Measured: `/api/export/coverage` on the sample script — `mentions draft rank: false`,
`mentions health percentile: false`. `coverage-html.ts` contains no `percentile` token at
all. The exported HTML report is P3's shareable artifact and is the one surface a reader
outside the app ever sees; it is also the only surface that shows the shape readings but
neither denominator.

### The fix receipt is unreachable on the default deploy

`server/routes/scriptide.ts:1097` gates the receipt's `structuralSignals: {before, after}`
on `result.usedLLM && result.candidateFountain`. On the keyless server every browser
battery certifies — the deploy CLAUDE.md calls "the product's front door" — a real
`POST /api/scriptide/fix` answers:

```
status 200 | keys: usedLLM,note | usedLLM: false | candidateFountain? false
structuralSignals present: false
```

The receipt render path, its unit tests and its route test all exist; no writer on a
keyless deploy can reach it, and Fix & verify is additionally Labs-gated (DECISION #3).

## Area: draft-rank denominator (ff9e2d54)

Verdict: **PARTIAL — correct arithmetic, wrong denominator for the surface it sits on,
and copy that promises something the code cannot deliver.**

Driven in Chromium, the app's own front-door flow. What the panel shows after one real
diagnosis of the sample script:

```
draft-rank line   : "First saved draft — rank among your drafts appears after your next save"
Draft History btn : "Draft History1 draft"
localStorage      : {"sm_doctor_history_v1":1}
Draft History rows: 1  ->  "9/4/2026, 8:01:20 PM  78  CONSIDER  173 issues"
```

Two records of "your own drafts" live in the SAME panel, a few hundred pixels apart, and
they disagree. `computeDraftRank(snapshots, health)` counts only ScriptIDE **snapshots**
(the Versions tab). The panel's own **Draft History** (`sm_doctor_history_v1`, up to 50
retained, 10 shown, health + verdict + issue count per entry) is a complete record of the
writer's own drafts of this script and is not counted at all. A writer who has run the
doctor twelve times and never touched Versions is told they have no drafts to rank
against.

Second, the empty-state copy. `computeDraftRank` returns `{rank:1, of:1}` in two very
different situations: (a) genuinely no saved snapshots, and (b) snapshots exist but none
carries a `health` value. Case (b) is not exotic — `ScriptIDE.tsx:1975` only attaches
health when `coverageReport?.fountain === scriptText` (a fresh report matching the exact
current text), so every snapshot saved after any edit-without-re-run is health-less. Both
cases render the same line:

> "First saved draft — rank among your drafts appears after your next save"

In case (b) that sentence is false: the next save produces another health-less snapshot
and the line never changes. `src/lib/snapshot-trend.ts:80-87`'s own doc comment names
this state ("or every snapshot predates the scoring feature") and still routes it to copy
that promises a rank is coming.

`computeDraftRank`'s tie/ordering behaviour itself is correct — verified against
`tests/core/snapshot-trend.test.ts`'s cases and by inspection: strictly-higher-only
counting, so ties share the better rank.

## Area: a11y at-rest gate (f4a8cda6) + dark mode on the new section

Verdict on the gate itself: **REPRODUCED.** `npm run verify:a11y` → `69/69 assertions
passed`, and the landing surface is genuinely audited at rest:

```
[verify] landing at-rest moments — settle-signal+quiet: 0 serious/critical; +second quiet window: 0 serious/critical
[PASS] landing :: axe: zero serious/critical violations (worst of 2 at-rest moments) — clean
```

Verdict on what it covers: **HALF-WIRED — the new section has zero dark-mode coverage,
and it is broken there.**

Measured in Chromium with the app's own `Alt+Shift+D` toggle, sample script, full-report
dialog, dark active:

```
"Shape & Rhythm"        fg rgb(33,29,21)  bg oklch(0.21 0.006 285.885)
"Talk/action swing"     fg rgb(0,0,0)     bg oklch(0.21 0.006 285.885)
"0.28"                  fg rgb(0,0,0)     bg oklch(0.21 0.006 285.885)
"Action-prose variation" fg rgb(0,0,0)    bg oklch(0.21 0.006 285.885)
"0.64"                  fg rgb(0,0,0)     bg oklch(0.21 0.006 285.885)
```

`oklch(0.21 0.006 285.885)` resolves to `rgb(24,24,27)` (#18181b, zinc-900). WCAG
contrast:

```
black text            1.19:1   (12px bold — AA needs 4.5:1)
rgb(33,29,21) text    1.06:1
white on that bg     17.72:1   (for reference)
```

The offending classes are `text-xs font-bold uppercase tracking-widest text-black` and
`text-xs font-bold text-black` in `ScriptDoctorPanel.tsx`'s `ShapeRhythmSection` — the
only elements in the section with no `dark:` pair, and they are the section's two headline
labels and both of its numbers. Cropped dark screenshot:
`scratchpad/audit-evening/shots/shape-dark.png`.

### Why the gate is blind to it — two complementary holes

- `verify-a11y.mjs` section 5 opens the real full-report dialog (`dark-full-report-dialog`)
  but on the hand-typed script `INT. DARK ROOM - NIGHT / … / JANE / …`. Measured against
  the live route: `sceneCount 1 | structuralSignals.scored: false`. Below
  `MIN_SCENES_TO_SCORE = 2`, so the section is structurally absent from that DOM.
- Section 6 (`dark-doctor-report-rich`) uses the real 12-scene sample — but it never
  clicks "Full report", so it audits CoverageSummary, and `ShapeRhythmSection` only exists
  inside `ScriptDoctorPanel`.

The surface with the data never opens the panel; the surface that opens the panel has no
data. That is verbatim the gap section 6's own header says it was written to close ("that
flow's hand-typed 4-line script is too thin for the structural engine to produce any
diagnostics — so axe never measured them, and the bugs shipped invisibly").

## Area: code split (948c2a6b) — vite manualChunks + collab dynamic import

Verdict: **REPRODUCED, end to end, in the real production build.**

`npm run build` reproduces the commit's exact figures: `ScriptIDE-BM751aJB.js 182.50 kB`,
`vendor-codemirror-DYw64keu.js 341.14 kB`, `yjs-CPrgPlKJ.js 96.03 kB`; no chunk over
500 kB; no Tailwind warning in the build log. `npm run verify:production` →
**71/71 assertions passed**, including the newly-hardened
`[PASS] bundle-sizes :: every JS chunk stays under the 500KB raw cap (0 chunk(s) over)`
and `total JS: 1730.7KB raw, 527.6KB gzip`.

Driven in Chromium against `NODE_ENV=production` + `dist/`:

```
landing (first paint):
  index, vendor-lucide, vendor-motion, StartScreen, scriptide-draft-store, index, proxy
  yjs chunk fetched: false
after "Start fresh" (ScriptIDE mounted, CodeMirror live):
  + ScriptIDE, roving-tabindex, vendor-codemirror, SnapshotManager, snapshot-trend
  vendor-codemirror fetched: true   yjs chunk fetched: false
  typing works from the split codemirror chunk: true
after navigating to /?collab=<real room id>:
  + y-websocket, yjs
  yjs chunk fetched now: true
errors: none
```

The lazy boundary is real and the collab stack is genuinely deferred until a room is
joined. One note, not a defect: `SnapshotManager` and `snapshot-trend` are fetched on the
same tick as `ScriptIDE` (the `hideList` instance mounts immediately), so that particular
`React.lazy()` boundary buys a parallel request rather than a deferral — the commit's
"first paint's DOM is unchanged" claim is true either way.

## Area: load-aware browser battery (13a5ee12)

Verdict on the runner and the refusal switch: **REPRODUCED.**

```
$ VERIFY_MAX_LOAD_PER_CPU=0.0001 npm run verify:focus-traps
[verify] refusing to run: load 0.10/cpu exceeds VERIFY_MAX_LOAD_PER_CPU=0.0001 … — not launching Chromium or booting the server.
npm exit=3          (no server boot, no Chromium launch)

$ node scripts/verify-browser-battery.mjs --retry-flaky 2 verify:focus-traps verify:surfaces
[verify-battery] verify:focus-traps FAILED on attempt 1 — retrying ALONE (attempt 2/3)
[verify-battery] verify:focus-traps FAILED on attempt 2 — retrying ALONE (attempt 3/3)
[verify-battery] verify:focus-traps: FAIL after 3 attempts — logs kept: …/scripts/output/flaky-retries/verify-focus-traps-attempt1-*.log , …-attempt3-*.log
exit=3            (verify:surfaces never ran — battery stops at the first exhausted suite)
```

Verdict on the timing policy: **PARTIAL — correct on the machine it was measured on,
silently a no-op on two platforms it will actually run on.**

`getTiming()` with `os.loadavg`/`os.cpus` stubbed:

```
loadavg 0 (Node returns [0,0,0] on Windows, always)          scale=1.000  ms(5000)=5000
loadavg 0.5 on 4 cpus (idle)                                 scale=1.000  ms(5000)=5000
loadavg 4 on 4 cpus (1.0/cpu, saturated)                     scale=1.000  ms(5000)=5000
loadavg 7 on 4 cpus (the measured flaky case)                scale=1.750  ms(5000)=8750
loadavg 40 on 4 cpus (pathological)                          scale=4.000  ms(5000)=20000
loadavg 7,  os.cpus()=64 (4-cpu cgroup on a 64-core host)    scale=1.000  ms(5000)=5000
loadavg 28, os.cpus()=64 (7x over a 4-cpu quota)             scale=1.000  ms(5000)=5000
```

Two silent no-ops:

- **Windows** — `os.loadavg()` returns `[0,0,0]` there unconditionally, so the policy is
  permanently 1.0x. CLAUDE.md's own OneDrive gotcha says this repo is worked on from
  Windows, so this is the maintainer's own machine.
- **A CPU-quota-limited container** — `os.cpus().length` reports the *host's* cores, not
  the cgroup quota. A 4-cpu container on a 64-core host at load 28 (seven times over the
  real quota — far worse than the load 7 case the commit was written for) computes
  0.44/cpu and scales 1.0x. (This particular container has `cpu.max = -1` and
  `nproc == os.cpus().length == 4`, so it is not affected; the arithmetic above is the
  proof for one that is.)

In both cases the suite logs `timeout scale 1.0x`, which is indistinguishable from
"machine is idle" — the failure mode is invisible in the log the commit calls "the whole
visible contract".

## Area: the docs

### `docs/scoring/STRUCTURAL_SIGNALS_2026-09-04.md` — REPRODUCED

`node --experimental-strip-types scripts/measure-structural-signals.ts` reproduces every
number in §3 and §4 **exactly**, digit for digit. Spot-checks:

- density, combined 427 scenes: `words 427/427 100.0%`, `lengthZ 425/427 99.5%`,
  `dialogueShare 403/427 94.4%`, `newPairs 92/427 21.5%`, `actionSentenceCv 152/427 35.6%`
- lexicon control: `emotionalShift 31/427 7.3%`, `clockRaised 30/427 7.0%`,
  `revelation 29/427 6.8%`, `reversal-detection 0/427 0.0%`
- CC0-only `actionSentenceCv 150/231 64.9%` vs calibration-only `1.0%` — the corpus split
  the doc calls out
- separation: `meanAbsDialogueShareDelta 1/1, 24/25 = 0.960, 5/6 = 0.833`;
  `actionSentenceCvOverall 1/1, 4/25 = 0.160, 6/6 = 1.000`;
  `meanSpeakersPerScene 0/1, 0/25, 0/6`
- the dropped question-density candidate: `40/427 9.4%`, `34/231 14.7%`

`tests/core/blind-pairs-discrimination.test.ts` reproduces the registered blind-pairs
result exactly — `1 of 6 ordered, mean gap -0.02, … 5 of 5 and a 25.32 gap on the
calibration corpus`, with per-pair health values matching
`BLIND_PAIRS_ON_BRANCHES_2026-09-04.md`'s `main` column line for line.
`server/nvm/analyze/structural-signals.test.ts`: **17/17**, including the assertion that
`doctor.ts` mentions `structuralSignals` exactly once.

### One doc number that is TRUE but NOT REPRODUCIBLE BY THE COMMAND THE DOC NAMES

§3's dropped-channel row claims `meanSpeakerTurns` has "Spearman rho **0.870** against
`meanSpeakersPerScene` over 40 scripts (0.832 over the 20 CC0 fixtures alone)". The
measurement script the doc names as its reproduction command emits a collinearity table
with twelve rows — and `meanSpeakerTurns` is not one of them:

```
$ node --experimental-strip-types scripts/measure-structural-signals.ts | grep 0.870
(no output)
```

I recomputed it independently (`scratchpad/audit-evening/rho-check.mts`, same 20 CC0 +
20 calibration scripts, average-rank Spearman):

```
CC0 + calibration (40): rho(meanSpeakerTurns, meanSpeakersPerScene) = 0.870
CC0 only (20):          rho(meanSpeakerTurns, meanSpeakersPerScene) = 0.832
```

Both figures are **correct**. But the doc holds itself to a stated standard one row
earlier — "Still measured by the script under 'Dropped candidate' so the number stays
reproducible" — and this row does not meet it. A re-verifier following the doc's own
instructions marks it NOT REPRODUCED. Command that shows it: the grep above.

### `docs/PATH_TO_EXCELLENCE.md` (494a9319) — three statements a re-verifier would mark NOT REPRODUCED

1. **"one unbroken 900,000-character token and 10,000 distinct one-off character cues
   both drove the analyzer quadratic … Both are now refused in under 25 ms by a single
   shape guard"** — the token half reproduces (2001 chars → HTTP 400 in 6ms). The cue
   half does not: `POST /api/scriptide/doctor` with 2,000 distinct Cyrillic, `#`-bearing
   or >40-char cues returns **HTTP 200 after 2.1–6.4 s**, having run the full analyzer.
   Only the ASCII, ≤40-char spelling of the shape is refused. `scripts/fuzz-routes.mjs`'s
   own `pathologicalFdx(n)` emits `CHARACTER${i}` — the one spelling the guard catches —
   which is why the vector survived the attack lane. Command:
   `node scratchpad/audit-evening/probe-guard.mjs`.

2. **"First-request cold start is gone."** — reproduced only for a request that arrives
   after the ~2.4 s warm window. A request fired the instant the port accepts still takes
   **2432 ms** (vs 2886 ms unwarmed). Command:
   `node scratchpad/audit-evening/probe-prewarm.mjs`. The narrower sentence in the same
   bullet ("drops from ~2.7 s to ~120 ms") reproduces as stated (120 ms measured) under
   its implicit condition.

3. **"a `--retry-flaky` option … Eight suites, run alone and under four CPU hogs at load
   up to 11 on four CPUs: 16 of 16 pass"** — the mechanism reproduces; the "under load"
   half depends on the timing policy, which (above) is a silent 1.0x no-op on Windows and
   on cpu-quota-limited containers. The claim as written is machine-specific and the
   record does not say so.

A wording risk rather than a falsification: the record says
`meanSpeakersPerScene` "orders 32 of 32 pairs". The measurement prints `0/1`, `0/25`,
`0/6` — 32 of 32 pairs ordered in the *opposite* direction to the arbitrary printing
direction. Same fact, inverted sign; §4 of the scoring doc states it correctly as
"0/32 pairs".

### `docs/CLAIMS_REGISTER.md` rows 32–41

Rows 32, 34, 35, 36, 37, 38, 39, 40 all render **verbatim** in a live browser or a live
export, checked string by string:

```
row 32  "Rank among your drafts: 1st of 3 (by health, your own saved drafts of this script)"   [panel]
row 33  "First saved draft — rank among your drafts appears after your next save"              [panel]
row 34  "Among your own saved drafts of this script, this one ranks 2nd of 5 by health — …"    [letter]
row 35  "This is your first saved draft of this script — a rank … after your next save."       [letter]
row 36  "Read from the shape of the document — word, line, sentence, turn and speaker counts…" [panel]
row 37  "Mean scene-to-scene change in the dialogue/action word mix — descriptive only…"       [panel]
row 38  "Sentence-length variation across the draft's action lines — descriptive only…"        [panel]
row 39  "Shape and rhythm: … is 0.28, and … is 0.64. Both are descriptive only…"               [letter]
row 40  "SHAPE & RHYTHM (DESCRIPTIVE, NOT PART OF THE SCORE) / Talk/action swing 0.28 → 0.28
         / Action-prose variation 0.64 → 0.64"                                                 [Versions]
```

Two rows need a qualification the register does not carry:

- **Row 33** is marked `supported` citing the test *"with no saved snapshots at all, the
  current draft is 1st of 1"*. That test proves the return value; it does not prove the
  sentence, which asserts a *future event*. In the health-less-snapshot state (see the
  draft-rank section above) the promised rank never arrives, however many times the
  writer saves. The cited evidence does not cover the copy's actual claim.
- **Row 41** (the fix receipt's shape delta) is `supported` by unit and route tests, and
  is **unreachable on the deploy every browser suite certifies**: keyless
  `POST /api/scriptide/fix` answers `{usedLLM:false}` and the field is gated on
  `usedLLM`. The register lists it as shipped user-facing copy with no reachability note.

### One copy claim worth checking, and it holds

The coverage letter asserts "the exported HTML report carries a new 'Structural Signals'
strip". Verified: `/api/export/coverage` on the same script contains
`<h2>Structural Signals (new, unwired diagnostics)</h2>`, 12 `sig-cell` bars for 12
scenes, and a summary line whose two shared numbers match the letter's (`0.28`, `0.64`).

## Extra probes the brief named

**Draft rank when snapshots carry no health** (`node --experimental-strip-types
scratchpad/audit-evening/rank-healthless.mts`):

```
no snapshots at all                                  -> {"rank":1,"of":1}  "First saved draft — … appears after your next save"
5 snapshots, NONE carries health                     -> {"rank":1,"of":1}  "First saved draft — … appears after your next save"
5 snapshots, 1 carries health                        -> {"rank":1,"of":2}  "Rank among your drafts: 1st of 2"
5 snapshots, all identical health, current identical -> {"rank":1,"of":6}  "Rank among your drafts: 1st of 6"
3 snapshots, all higher                              -> {"rank":4,"of":4}  "Rank among your drafts: 4th of 4"
```

Three writer-visible consequences:
- row 2: the "appears after your next save" promise is permanently false in that state.
- row 3: the writer has **six** drafts and is told "of 2" — four saved drafts silently
  vanish from a denominator whose own copy says "your own saved drafts of this script".
- row 4: six byte-identical drafts render as "1st of 6", which reads as progress.

**The snapshot modal has no dialog semantics.** Driving the save flow, the modal at
`SnapshotManager.tsx:267` is a bare `motion.div` — no `role="dialog"`, no `aria-modal`,
no accessible name, and no `useModalFocusTrap` (which this repo uses on its other modals).
`page.getByRole('dialog')` finds nothing; I had to submit with Enter. It is not covered by
`verify-focus-traps`.

**Dark-mode root cause, precisely.** `ScriptDoctorPanel.tsx:456-462` carries a deliberate
2026-09-04 a11y note: the panel's own chrome `bg-[var(--sm-panel)]` is *theme-invariant*
("the dark-mode toggle never actually darkens it"), so bare `text-black` is the correct
choice for `MetricStatRow` and friends. `ShapeRhythmSection` copied that `text-black` but
put it inside `bg-white dark:bg-zinc-900` — a container that **does** darken (it copied
that from the Draft History collapsible). The two conventions were mixed in one component.
Visible side by side in `shots/03-shape-rhythm-dark.png`: "SUSPENSE SHAPE 82" sits black
on a light ground while "TALK/ACTION SWING 0.28" sits black on zinc-900.


## Full battery re-run

`PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run verify:browser` — all eight suites,
default (no retries), on this container:

```
verify:p0-flow: pass          verify:focus-traps: pass  (14/14)
verify:surfaces: pass (146/146)  verify:ui-polish: pass (27/27)
verify:local-safety-net: pass (23/23)  verify:command-palette: pass (17/17)
verify:a11y: pass (69/69)     verify:production: pass (71/71)
BATTERY exit=0
```

The `146/146` the structural-signals commit claims for `verify:surfaces`, the `69/69` the
a11y commit claims, and the `71/71` the production suite claims all reproduce.

---

# Summary table

| area | what I did | verdict | evidence |
|---|---|---|---|
| Fountain shape guard — fdx/pdf post-conversion routing | POSTed pathological fdx + raw fountain to `/api/scriptide/doctor` on a live server | REPRODUCED | ASCII shape → HTTP 400 in 19ms on the fdx path, 96ms raw |
| Fountain shape guard — the guard itself | 4 cue families the parser accepts and the guard's regex does not | **NOT REPRODUCED** | Cyrillic/Greek/`#`/>40-char cues: guard PASS, parser sees 3000 cues; 2000 Cyrillic cues → HTTP 200 in 6345ms; 1000→1032ms vs 2000→4639ms (quadratic) |
| huge-token guard | 2001-char token; 440×2000-char tokens (880KB) | REPRODUCED | 400 in 6ms; 200 in 1777ms |
| collab WS frame cap | minted a room + token, sent frames at the boundary | REPRODUCED | 2MiB−1KiB accepted, 2MiB+1KiB → close 1009 |
| production compression | brotli on assets and JSON API under `NODE_ENV=production` | REPRODUCED | `enc=br` on `/assets/index-*.js` and on `POST /api/scriptide/doctor` |
| SSE excluded from compression | streamed `/doctor/stream` on a 400-scene script | REPRODUCED | `content-encoding (none)`, 37 chunks, first at +7ms, last at +305ms |
| cache differentiation | `/`, deep link, hashed asset, favicon | REPRODUCED | `no-cache` / `no-cache` / `max-age=31536000, immutable` / `max-age=0` |
| `/assets` 404 + traversal | 6 traversal spellings via `curl --path-as-is` | REPRODUCED | all 404 JSON; `/assets/subdir/../index-*.js` correctly 200 |
| production request logging | read the live prod log | **HALF-WIRED** | `/assets/does-not-exist.js` logs as `{"path":"/does-not-exist.js"}`; `/api/nope` as `/nope` |
| `verify-production-build.mjs` | ran it | REPRODUCED | 71/71; the 500KB cap is now a real failure |
| doctor-pool pre-warm | 3 boots, timed the first request at 3 arrival points | **PARTIAL** | racing 2432ms vs unwarmed 2886ms vs post-warm 120ms; port open for the whole 2.1–2.7s window |
| structural signals — numbers across surfaces | drove the panel in Chromium, compared to HTML/letter/verify/slate | REPRODUCED (they agree) | 0.28 / 0.64 identical in panel, report JSON, HTML `sig-note`, letter |
| structural signals — surface coverage | probed every export | **HALF-WIRED** | exported HTML has no rank and no percentile; verify/slate have no shape readings |
| Shape & Rhythm — interaction | click and keyboard | REPRODUCED | Enter on a focused bar → editor flash 0→12; 12 bars, none disabled |
| Shape & Rhythm — 375px | resized to 375 | REPRODUCED | strip 276px, `bodyScrollWidth == 375`, no page overflow |
| Shape & Rhythm — dark mode | Alt+Shift+D, measured resolved colors | **NOT REPRODUCED (broken)** | black on `#18181b` = **1.19:1**; section header **1.06:1** |
| a11y at-rest gate | ran `verify:a11y` | REPRODUCED | 69/69; landing audited at two at-rest moments |
| a11y coverage of the new section | traced both dark surfaces | **HALF-WIRED** | `dark-full-report-dialog` uses a 1-scene script (`scored:false`); `dark-doctor-report-rich` never opens the panel |
| fix receipt shape delta | POSTed a real fix on the keyless deploy | **HALF-WIRED** | `{usedLLM:false}`; field gated on `usedLLM` |
| snapshot trend line | saved two versions in the browser | REPRODUCED | `Talk/action swing 0.28 → 0.28 · Action-prose variation 0.64 → 0.64` |
| draft rank — arithmetic | 5 denominator cases | REPRODUCED | ties share the better rank, as documented |
| draft rank — denominator + copy | compared to Draft History in the same panel | **HALF-WIRED** | "Draft History 1 draft" beside "First saved draft"; health-less snapshots vanish from `of` |
| code split | drove the real production build in Chromium | REPRODUCED | yjs absent at paint and in the editor, arrives on `?collab=` |
| battery runner | `--retry-flaky 2`, `VERIFY_MAX_LOAD_PER_CPU` | REPRODUCED | retries alone, keeps both logs, exit 3, no Chromium launch |
| full battery | `npm run verify:browser` | REPRODUCED | 8/8 suites pass, exit 0 |
| `getTiming` load scale | stubbed `os.loadavg`/`os.cpus` | **PARTIAL** | 1.75x at the measured case; **1.0x** at loadavg 0 and on a cpu-quota container |
| `STRUCTURAL_SIGNALS_…md` §3/§4 | re-ran the measurement script | REPRODUCED | every density and separation figure exact |
| dropped-channel rho 0.870 | ran the doc's own command, then recomputed | **NOT REPRODUCED by the named command** (the number itself is correct) | absent from the script's output; independent recompute gives 0.870 / 0.832 |
| blind pairs, main tree | ran the discrimination test | REPRODUCED | 1/6, −0.02, 5/5, 25.32; per-pair healths match the branches doc |
| `PATH_TO_EXCELLENCE` record | checked each falsifiable sentence | **PARTIAL** | 3 statements overclaim (see docs section) |
| `CLAIMS_REGISTER` rows 32–41 | rendered each string live | REPRODUCED (8/10 verbatim) | rows 33 and 41 need a qualification |
| snapshot modal semantics | drove the save flow | **HALF-WIRED** | no `role="dialog"`, no focus trap, no accessible name |

---

# Ranked build list

Nothing here is a removal. Each item is what to BUILD or WIRE so the thing the batch
started is finished.

### 1. Build the shape guard on the parser's own cue alphabet, not a second one
`server/lib/validation.ts:228` (`CUE_LIKE_LINE_RE`), reading from
`src/lib/fountain.ts:73-75` (`CUE_INITIAL_CLASS` / `CUE_LETTER_CLASS`).

The guard's job is "would the analyzer treat this line as a cue?", and that question
already has exactly one authoritative answer exported from `fountain.ts`. Build the
guard's predicate from those two exported classes (widened as the guard's own comment
intends: over-count, never under-count), and drop the 40-character cap — the parser has
none, so the cap is a hole rather than a bound. `validation.ts` has no import edge to
`doctor.ts`'s graph, and `fountain.ts`'s class constants are already exported for exactly
this reuse (their header: "every other cue test in the repository composes them"), so this
stays off the scoring path and needs no receipt. Then extend
`scripts/fuzz-routes.mjs`'s `pathologicalFdx(n)` (line 128) from `CHARACTER${i}` to a
family — ASCII, Cyrillic, `#`-bearing, and a 60-character name — so the fuzz lane proves
the property rather than one spelling of it, and add the same four spellings to the nine
route regression tests the security commit landed. **Writer impact:** the only finding
here that lets one unauthenticated request burn ~20 CPU-minutes on the front door.

### 2. Wire the shape readings and both denominators into the exported coverage HTML
`server/lib/coverage-html.ts` (a caveat block beside `buildFooterSection`),
`server/routes/export.ts` (accept and thread `draftRank`, as
`server/routes/coverage-letter.ts:48` already does), and
`src/components/scriptide/ScriptDoctorPanel.tsx:3009` (send `draftRank` on the coverage
export the same way it already does on the letter).

The exported HTML is P3's shareable artifact and the only surface a third-party reader
sees. Today it carries the strip and seven aggregates but neither the reference-set
percentile nor the rank-among-your-drafts — the two lines the panel and the letter both
lead with. `buildCaveats` (`coverage-letter.ts:229-250`) is the prose to mirror, and the
two exports already share `report.provenance.structuralReliabilityNote` precisely so they
cannot drift; extend that same consumer pattern to these two lines.

### 3. Give "Shape & Rhythm" a dark-mode palette, and give the a11y gate a surface that can see it
`src/components/scriptide/ScriptDoctorPanel.tsx` `ShapeRhythmSection` (four `text-black`
spans plus the header's inherited color); `scripts/verify-a11y.mjs` §5/§6.

Two conventions were mixed: `bg-white dark:bg-zinc-900` (a container that darkens) with
`text-black` (correct only on the theme-invariant `bg-[var(--sm-panel)]` chrome, per the
deliberate note at `ScriptDoctorPanel.tsx:456-462`). Pick one — cleanest is to give the
section the same `--sm-panel` chrome its sibling `MetricStatRow`s use, so `text-black`
becomes correct again and the panel reads as one surface. Then build the gate that would
have caught it: either type a ≥2-scene script in `verify-a11y.mjs` §5's dark flow (so
`structuralSignals.scored` is true inside `dark-full-report-dialog`), or click "Full
report" in §6's rich flow. §6's own header already names this class of gap as its reason
for existing. **Writer impact:** four numbers and a section heading sit at 1.06–1.19:1 for
every dark-mode writer.

### 4. Build the draft-rank denominator on the writer's whole history, and make its empty states honest
`src/lib/snapshot-trend.ts` (`computeDraftRank`),
`src/components/scriptide/ScriptDoctorPanel.tsx` (`DraftRankLine`, and the `history` state
it already holds), `server/lib/coverage-letter.ts` (`buildCaveats`).

Three additive changes:
- **Count the Draft History too.** The panel already holds `history`
  (`sm_doctor_history_v1`, up to 50 entries with health and verdict) and renders it a few
  hundred pixels below the rank line. Give `computeDraftRank` a second source — or one
  merged, de-duplicated on `contentHash` — so "your own drafts" means what the copy says.
  Today a writer with twelve recorded runs reads "First saved draft".
- **Return the reason, not just the number.** Distinguish "no saved drafts" from "saved
  drafts exist but none carries a health value" from "n of m saved drafts are rankable",
  and render each honestly ("3 of your 5 saved versions were saved without a fresh
  diagnosis and aren't ranked here"). Today the second case renders a promise ("appears
  after your next save") that that state can never fulfil, and the third silently shrinks
  the denominator (5 saved drafts + current → "1st of 2").
- **Say when a rank is a tie.** Six byte-identical drafts render "1st of 6". Render
  "tied 1st of 6" — the data is already there — so the line cannot read as progress that
  did not happen.

### 5. Build a readiness signal so the pre-warm protects the first request
`server.ts:161-171`, `server/nvm/analyze/doctor-pool.ts` (`warmDoctorPool`), plus a route.

`warmDoctorPool()` fires inside the `listen` callback, so the port accepts traffic for the
whole 2.1–2.7s warm window and a request landing there still pays 2432ms. Build the
missing half: export a `doctorPoolReady()` predicate that flips when
`doctor_pool_prewarmed` logs, and have `GET /api/health/ready` (or the existing health
route) answer 503 until then, so an orchestrator can hold traffic for the two seconds the
optimisation needs. A `PREWARM_BEFORE_LISTEN=1` option that awaits the warm-up before
binding would serve single-process deployments that would rather boot two seconds later
than serve one slow request.

### 6. Build the fix receipt's shape delta for the deterministic path
`server/routes/scriptide.ts:1097` (`if (result.usedLLM && result.candidateFountain)`).

The receipt's before/after aggregates are the batch's most interesting new artifact — "did
this change move the shape?" — and they are gated on an LLM call, so on the keyless deploy
CLAUDE.md calls the product's front door they can never appear. Compute and attach them
whenever a candidate text exists at all (the computation is pure and cheap, as the comment
at the site says), and where no candidate exists attach the `before` reading alone so the
receipt still tells the writer where the draft stands. That also gives `CLAIMS_REGISTER`
row 41 a surface a re-verifier can reach.

### 7. Make the timing policy report when it cannot see load
`scripts/lib/browser-verify.mjs:77-109` (`getTiming`).

Read the container's real CPU allowance where one exists (`/sys/fs/cgroup/cpu.max`, or
`cpu.cfs_quota_us`/`cpu.cfs_period_us` on v1) and use `min(os.cpus().length, quota)` as the
denominator; and when `os.loadavg()[0] === 0` on a platform that cannot report it (Windows
always), log that the policy is inactive rather than `timeout scale 1.0x`, which is
indistinguishable from an idle machine. A 4-cpu container on a 64-core host at seven times
over quota computes 0.44/cpu and scales 1.0x today — the exact condition the policy was
built for, silently unhandled.

### 8. Wire the mount prefix back into the production request log
`server/lib/request-logger.ts` — capture `req.baseUrl + req.path` (or `req.originalUrl`'s
pathname) at request time rather than reading `req.path` at finish time.

The two 404 guards this batch shipped are invisible as *asset* and *api* 404s in the
production log: `/assets/does-not-exist.js` logs as `{"path":"/does-not-exist.js"}` and
`/api/nope` as `/nope`. The pathname-only, query-excluding property that the long comment
in `server/app.ts` defends is preserved by `req.baseUrl + req.path` — this adds the mount
prefix, never the query string.

### 9. Give the snapshot modal the dialog semantics the rest of the IDE's modals have
`src/components/scriptide/SnapshotManager.tsx:267-310`.

Add `role="dialog"`, `aria-modal="true"`, an `aria-labelledby` pointing at the existing
"Save Snapshot" heading, and the repo's own `useModalFocusTrap`; then add it to
`scripts/verify-focus-traps.mjs`'s list. It is currently the one modal a keyboard user can
tab out of, and `page.getByRole('dialog')` cannot find it at all — which is also why it is
untested.

### 10. Emit the dropped-channel collinearity number from the script the doc names
`scripts/measure-structural-signals.ts` (its COLLINEARITY section).

The doc's §3 claim (`meanSpeakerTurns` rho 0.870 / 0.832) is **correct** — I recomputed
both digits — but the script the doc names as its reproduction command does not print it,
while the neighbouring dropped candidate explicitly is printed "so the number stays
reproducible". Add the row. Alongside it: add one qualifying clause to `CLAIMS_REGISTER`
row 33 (the "appears after your next save" copy holds only when the next save carries a
fresh report) and a reachability note to row 41, and narrow the three
`PATH_TO_EXCELLENCE` sentences named above to what was actually measured.

---

# Overall judgement

This is a strong batch whose engineering is better than its claims. Nearly everything that
was built works: the collab frame cap, brotli compression with SSE genuinely excluded, the
cache differentiation, the `/assets` 404 guard against five traversal spellings, the code
split, the hard 500KB cap, the at-rest a11y gate, the battery runner's retry and refusal
paths, and — most impressively — every density and separation figure in
`STRUCTURAL_SIGNALS_2026-09-04.md` reproduces digit for digit from the command the doc
names, as do the blind-pairs numbers. The numbers the new structural-signal surfaces show
agree exactly across the panel, the report JSON, the exported HTML and the letter; the
scene strip is clickable *and* keyboard-operable and does not overflow at 375px; and the
full browser battery passes suite by suite on a clean re-run. That is a real evening's work
and most of it is done properly.

The pattern in what is unfinished is consistent, and worth naming because it repeats across
four independent lanes: **each new thing was verified against the shape it was written for,
and the verification then quietly became the property.** The cue guard was tested with
`CHARACTER${i}` and therefore only stops ASCII cues, while the analyzer's own cue regex
accepts every Unicode capital, `#`, and any length — so the denial-of-service the commit
says it closed is open on all nine routes it "fixed". The pre-warm was measured after the
warm-up finished and so reads as "cold start is gone", while a request arriving during the
still-open listening window pays 2432 of the 2886ms it was meant to save. The a11y gate
audits the full-report dialog with a script too thin to render the new section and audits a
rich script on a view that does not contain it, so a 1.19:1 contrast bug shipped past a
suite that passes 69/69 — the same gap that suite's own section 6 header says it exists to
close. And the draft rank was measured against a snapshot array, so it says "First saved
draft" while the Draft History directly beneath it says "1 draft". None of this is
sloppiness; it is the cost of proving a property with the single example that motivated it.
The build list above is ordered by what a writer feels first — an unauthenticated
20-CPU-minute request, then a shareable report missing both of its denominators, then four
invisible numbers in dark mode. Nothing needs removing: every item is the second half of
something already half-built, and most of them are small.
