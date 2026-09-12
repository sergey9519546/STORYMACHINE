# Independent review — `lane/smoke-gate-boot` round 1 (**f0b5d787**)

**Reviewed object:** `lane/smoke-gate-boot` tip `f0b5d787`
(`f0b5d787046944706d69c764676f9af32224cafa`), worktree `/home/user/wt-smoke`
(`node_modules` → the main checkout's, 217 entries), rebased onto `main`
`e41e55ca` (`main` is `bb98e043` as I write; docs-only in between).
`git diff --stat e41e55ca f0b5d787` → **12 files, +709 / −73**. No `src/`, no
`server/`.
**Method:** the worktree was driven read-only — no tracked file in it was
edited; every planted tree lives under `<session scratch>` and every plant is
named below. `git status --short` in the worktree is empty after all runs
(`dist/` is gitignored, and building it is the change under review). Browsers
launched with `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium`; `ss -ltnp` showed
no listeners before each boot, and `ps -eo args | grep -c
'[s]moke-p0-live-flow\|[v]erify-p2-p3'` was 0 before every browser run. The
only file written under `/home/user/STORYMACHINE` is this review. I reviewed
the p0-flow lane whose attack item 5 opened this one.

---

## 1. `ensureBuiltDist()` — does the staleness rule cover every build input?

`DIST_BUILD_INPUTS = ['src', 'index.html', 'vite.config.ts', 'package.json',
'package-lock.json']` (`browser-verify.mjs`). I drove `distStaleness()`
directly against a `git archive f0b5d787` export built once
(`<session scratch>/sg/t1`, `npm run build` → "built in 1.82s"):

| planted change (mtime set 5 s into the future) | `distStaleness()` |
|---|---|
| nothing (straight after the build) | **current**, newest input `src/App.tsx` |
| `public/favicon.svg` touched | **current** — not seen |
| `public/fonts/inter-400.woff2` touched | **current** — not seen |
| `src/App.tsx` touched | **stale** — "dist/index.html is older than src/App.tsx" |

**The `src/` and `index.html` directions work, end to end.** I changed
`index.html`'s `<title>` to `REVIEWER_MARKER_7f3a` and booted through the
lane's own helper (`bootKeylessServer({ serve: SERVE_BUILT_DIST })`):

```
[rev] dist/ is stale — dist/index.html is older than index.html (…); running `npm run build`...
[rev] dist/ rebuilt (2026-09-12T22:55:55.785Z).
[rev] serving: the BUILT dist/ under NODE_ENV=production (hashed asset /assets/index-MmPcFF4j.js) …
served title  : <title>REVIEWER_MARKER_7f3a</title>
served marker : true
vite client   : false
```

So a stale `dist/` plus a fresh input is rebuilt and the **served bytes carry
the change** — the gate does not silently certify old bytes for those inputs.

**`public/**` is a real input and is not covered.** Vite copies `public/`
verbatim into `dist/` — `dist/favicon.svg` and `dist/fonts/` (11 `.woff2`
files) exist for no other reason, and the built stylesheet references
`fonts/`. Planted a content change (`data-reviewer="RVW_PUBLIC_7f3a"` added to
`public/favicon.svg`) and booted the same way:

```
staleness after public/ edit: null
[rev2] dist/ is current (built …) — not rebuilding.
served favicon carries the tree edit: false
tree favicon carries it            : true
```

The gate reported "dist/ is current" and served a file that is **not this
tree's**. That is the exact sentence `ensureBuiltDist`'s doc comment promises
cannot happen ("so a gate served from dist/ can never certify bytes that are
not the tree's own"), and the new suite's own staleness fixtures
(`smoke-gate-serve-mode.test.ts:90-117`) exercise `src/main.tsx` and
`index.html` but never a `public/`-shaped input, so nothing caught it.
Blocking item 1 — it is one word in the array.

*(`metadata.json` is also outside the list, and correctly so: nothing in
`index.html` or `src/` references it, so it is not a client build input.)*

## 2. `serveModeOf()` — can it be fooled?

Driven against the real function with a stub `fetchImpl`, six cases:

| markup | classified | direction |
|---|---|---|
| dist markup + `/@vite/client` inside an HTML **comment** | `vite-dev-middleware` | **fail-closed** — the gate asked for `built-dist`, so it throws by name rather than certifying |
| dev markup that also names `/assets/index-abc.js` | `vite-dev-middleware` | correct (the `/@vite/client` test runs first) |
| dist markup, hashed **CSS** only | `built-dist` | correct |
| dist markup with everything inlined | `unknown` | fail-closed (throws) |
| empty body (an error page) | `unknown` | fail-closed |
| asset URL in **single** quotes | `unknown` | fail-closed |

**The dangerous direction is unreachable.** To certify a dev server as the
built bundle, its markup would have to lack `/@vite/client` *and* carry a
hashed `/assets/*.js` — Vite injects the client into every dev HTML response,
and I confirmed it on a live dev boot (`verify:ui-polish`'s banner, §3). Every
way I could confuse the classifier makes the gate **refuse**, which is the
right failure. Two narrow notes in Non-blocking.

## 3. Is the dev path of the golden flow still covered?

Source first: `grep -n "bootKeylessServer(" scripts/*.mjs` — only
`smoke-p0-live-flow.mjs` passes `serve:` (twice: the main boot at `:134`, step
3e's budget server at `:435`, both `SERVE_BUILT_DIST`). `verify-a11y.mjs:424`,
`verify-e4-local-safety-net.mjs:114`, `verify-e5-command-palette.mjs:49`,
`verify-focus-traps.mjs:198`, `verify-p2-p3-surfaces.mjs:463`,
`verify-ui-polish-affordances.mjs:102` and `verify-production-build.mjs:430`'s
dev-comparison boot pass none, so they take the dev default.

Then driven, because a banner is the claim:

| suite | result | banner |
|---|---|---|
| `npm run verify:ui-polish` (load 2.51) | **exit 0**, 27/27, 13 s | `[verify] serving: Vite dev middleware with NODE_ENV unset (/@vite/client in the markup) — dist/ is NOT used by this run.` |
| `npm run verify:surfaces` (load 2.12) | **exit 0**, **248/248**, 86 s | same dev banner |

`verify:surfaces` is the one that matters here: its **P3** phase drives
StartScreen → "Try sample coverage" → rendered verdict → export → verify
(`:777-861`) on the dev front end, and it passed —
`[PASS] P3 :: Sample coverage produces a rendered verdict (Doctor reachable end
to end) — summary panel verdict text present=true`. `verify:a11y` I did not
re-run (it is the long one); its dev boot and its three "Try sample coverage"
journeys are at `:424`, `:558-583`, `:858-862` and `:1244`, and the dev banner
above is the shared default those boots print. **The claim holds.**

## 4. `verify:p0-flow` — the tip, and the regressed tree

Tip, foreground, one at a time, in `/home/user/wt-smoke`:

| run | load | exit | wall | boot lines |
|---|---|---|---|---|
| 1 | 0.17 | **0** | 13.9 s | `dist/ is current (… newest build input vite.config.ts) — not rebuilding` · `serving: the BUILT dist/ … (hashed asset /assets/index-MmPcFF4j.js)` |
| 2 | 1.75 | **0** | 12.9 s | same |
| 3 | 1.49 | **0** | 13.5 s | same |

**3/3 green at 12.9–13.5 s**, inside the lane's reported 13.1–15.9 s band for
the dist path and well under the 20.0–22.5 s it reports for dev. `git status
--short` in the worktree: empty.

Regressed tree — `git archive f0b5d787` with **only** the `doctorAutoSample`
clause removed from `coverageFullReportToggleState`
(`<session scratch>/sg/reg`, `node scripts/smoke-p0-live-flow.mjs`):

| run | load | exit | wall | caught by | freshness line |
|---|---|---|---|---|---|
| 1 | 1.26 | **1** | 7 s | MOUNT | `dist/ is stale — dist/index.html does not exist; running npm run build` |
| 2 | 1.32 | **1** | 5 s | MOUNT | `dist/ is current (… newest build input src/components/ScriptIDE.tsx)` |
| 3 | 2.18 | **1** | 5 s | MOUNT | same |

**3/3 exit 1 at MOUNT**, and this doubles as the proof of the lane's riskiest
carry-over: MOUNT can only fire after `earlyChunk.waitUntilHeld()` resolves, so
`**/CoverageSummary*` demonstrably matches the **built** chunk
(`dist/assets/CoverageSummary-<hash>.js`), not just the dev module URL. Run 1
also exercises the build-when-missing branch on a real tree, and runs 2–3 show
the rule correctly judging a fresh build newer than the planted edit.

## 5. The scanner, with my own plants — and is `:808` a fix or a relabel?

Baseline on the tip: `node --experimental-strip-types --test
tests/scripts/wait-for-function-options-position.test.ts
tests/scripts/smoke-gate-serve-mode.test.ts` → **exit 0, 17 pass, 0 fail, 4
suites**. Then five plants of my own in `scripts/` of a tip export:

| plant | shape | result |
|---|---|---|
| A | the round-3 reviewer's escape: `const t = document.body.innerText;` one line above the alternation | **caught** — `verify-plant-a.mjs:5 … [\`t\` derives from an innerText read at line 4]` |
| B | derived: `const raw = …innerText; const t = raw.trim();` | **caught** — origin named at line 4 |
| C | a plain `textContent` poll (the two deliberate `verify-a11y.mjs` sites' shape) | **not flagged** — correct, no churn |
| D | tainted value passed to a local predicate: `const check = (s) => /…/.test(s); return check(t);` | **NOT caught** — escapes |
| E | `let t; t = document.querySelector('aside').innerText;` (assignment without declaration, element-scoped) | **caught** — origin named at line 5 |

So the escape this commit exists to close is closed, in the two shapes that
matter (hoisted read, derived assignment), with the origin line reported; one
narrower shape (D) still escapes — Non-blocking 1.

**`:808` is a real fix, not a relabel.** The old line was
`/RECOMMEND|CONSIDER|PASS/.test(summaryText)`; it now routes through
`textCarriesDoctorVerdict()`. Driven against the real function:

| input | old regex | `textCarriesDoctorVerdict` |
|---|---|---|
| `RUNNING PASS 1 OF 14…` | **true** (the bug) | **false** |
| `READING THE DRAFT…` / `COMPILING THE REPORT…` | false | false |
| `PASSENGER LIST` | **true** | **false** |
| `VERDICT CONSIDER HEALTH 78` | true | true |
| `RUNNING PASS 1 OF 14… VERDICT CONSIDER` | true | true |

Called three times in a row it returns `false,false,false` — the fresh
`RegExp` per call really does stop `DOCTOR_PROGRESS_COPY_RE`'s `/g`
`lastIndex` leaking between callers. And it still passes on real page text:
the `verify:surfaces` run in §3 records that assertion as `present=true` with
the suite at 248/248.

## 6. Gates

| gate | command | exit |
|---|---|---|
| touched tests | `node --experimental-strip-types --test tests/scripts/wait-for-function-options-position.test.ts tests/scripts/smoke-gate-serve-mode.test.ts` | **0** — 17 pass, 0 fail |
| scoring receipt | `node scripts/check-scoring-receipt.mjs main..HEAD` | **0** — "no scoring-path files changed" (also 0 against `origin/main` and `e41e55ca`) |
| docs | `npm run check-docs` | **0** — "No AI writing patterns detected" |
| claims register | `node scripts/honesty-audit.mjs` | **0** — 465 files, 489 tracked md, 115 rows, clean |
| brain graph | `node scripts/brain-graph.mjs --check` | **0** — 110 notes, 419 links, fresh |
| ui-polish | `npm run verify:ui-polish` | **0** — 27/27 |
| surfaces | `npm run verify:surfaces` | **0** — 248/248 |

I did not re-run `npm test` (the orchestrator's merge gate) or `verify:a11y`.

### The documents

I read the five corrections. They are accurate and they do not overclaim:
`README.md` and `CONTRIBUTING.md` now say two of the eight serve the built
`dist/` and that `verify:production` remains the only one that boots the
Dockerfile's own `CMD`; `ci.yml`/`release.yml` say the same and explain why the
`browser` job still needs no build step; `RUN_DEMO.md` states plainly that the
moderator's `npm run dev` is the **other** front end, names the observable
difference (HMR noise, no CSP) and gives the command that makes them match.
That last one is the honest disclosure the change owed its audience.

---

## VERDICT: **REVISE**

One item, and it is one word. Everything else here is merge-quality: the serve
mode is now read off the wire and cannot be fooled in the dangerous direction,
the banner is real on both branches, the gate is faster and its 504 class is
gone, the two pinned windows still pin **against the built chunk**, the dev
path of the golden flow is genuinely still covered (driven, 248/248), the
scanner catches the escape it was opened for, and `:808` is a real
strengthening that still passes on real text.

1. **`public/` is a client build input and `DIST_BUILD_INPUTS` omits it, so the
   gate can serve — and report as "current" — bytes that are not this tree's.**
   Measured: a content edit to `public/favicon.svg` leaves `distStaleness()`
   returning `reason: null`, the boot logs "dist/ is current … not
   rebuilding", and the served `/favicon.svg` lacks the edit the tree has.
   `public/` holds the favicon and the 11 `.woff2` faces the built stylesheet
   references, all copied verbatim into `dist/`. Add `'public'` to
   `DIST_BUILD_INPUTS`, and add a `public/`-shaped case to
   `smoke-gate-serve-mode.test.ts`'s staleness fixtures (which today cover only
   `src/main.tsx` and `index.html`) so the rule is shown to fire on it. If you
   would rather not rebuild on a font touch, the alternative is to narrow the
   claim — but `ensureBuiltDist`'s "can never certify bytes that are not the
   tree's own" then has to stop being written as an absolute.

### Non-blocking

1. **One scanner shape still escapes:** a tainted identifier passed as an
   argument to a locally-defined predicate
   (`const check = (s) => /RECOMMEND|CONSIDER|PASS/.test(s); return check(t);`)
   is not flagged — planted as `verify-plant-d.mjs`, suite stayed green while
   plants A, B and E were all named. Deliberate-evasion shaped, and narrower
   than the shape just closed; worth a line in the scanner's comment saying the
   taint does not cross a call boundary, so the next reader knows the edge.
2. **`serveModeOf` matches only double-quoted asset attributes**
   (`/(?:src|href)="(\/assets\/[^"]+\.(?:js|css))"/`). A single-quoted
   `src='/assets/index-abc.js'` classifies as `unknown`. Vite emits double
   quotes, so this is not live, and the failure is fail-closed (the boot
   throws) — but an HTML minifier in the build chain would turn a green gate
   red for a reason that is not a defect.
3. **`serveModeOf` ignores `res.ok`.** A 500 or a proxy error page reaches the
   classifier as markup and comes back `unknown`; the resulting throw names
   "neither /@vite/client nor a /assets/ URL in N bytes of /" rather than the
   status. Same outcome, worse message.
4. **The budget server (step 3e) calls `ensureBuiltDist()` a second time**
   inside one gate run. It is a stat-walk and a no-op in practice (the first
   boot just built it), but the walk covers all of `src/` twice per run.
5. **Per-worktree `VITE_CACHE_DIR` for the six remaining dev suites** is
   correctly left undone and correctly recorded — this lane removed the 504
   class from `verify:p0-flow` only, and the hazard is now measured evidence
   for whoever takes that lane.

---

## Round 2 — re-check of **96ab1ac1**

**Reviewed object:** `lane/smoke-gate-boot` tip `96ab1ac1`, five commits over
`f0b5d787` — `3f504d99` (public/), `a586884e` (call-boundary taint),
`142c4e47` (attribute quoting), `93513cf9` (non-2xx status), `96ab1ac1`
(one freshness walk per run). `git diff --stat f0b5d787 96ab1ac1` → **3 files,
+362 / −11**; no `src/`, no `server/`. Same reviewer, warm context: I re-checked
my own items and nothing else. Worktree clean after every run; every plant
under `<session scratch>`.

### Blocking item 1 — `public/` — **closed, and I repeated my own experiment**

`DIST_BUILD_INPUTS` is now `['src', 'public', 'index.html', 'vite.config.ts',
'package.json', 'package-lock.json']`, plus root files matched by shape
(`DIST_BUILD_CONFIG_RE`: `tsconfig*.json`, `postcss|tailwind|vite.config.*`) so
a config added later is covered the day it appears. The same favicon experiment
on a `git archive 96ab1ac1` export, built once, then
`public/favicon.svg` edited:

```
staleness after public/ edit: "dist/index.html is older than public/favicon.svg (… < …)"
[rev] dist/ is stale — …; running `npm run build`...
[rev] dist/ rebuilt (2026-09-12T23:21:36.589Z).
served favicon carries the tree edit: true        ← was FALSE at f0b5d787
```

**Fail-first, driven:** with `'public'` removed again from the list in a scratch
copy, `smoke-gate-serve-mode.test.ts` goes **9 pass / 1 fail**, the failure
being `distStaleness fires on public/ — the input that was missing (review round
1, blocking)`. A second new test (`this repository really does ship a public/
directory into dist/`) keeps that fixture from going vacuous if `public/` is
ever emptied. That is the shape a staleness rule has to be proven in, and it now
is.

The in/out audit reads as an audit rather than a list, and the one exclusion I
could have argued with checks out: `git grep -n "import.meta.env" -- src
index.html` at the tip is **empty**, so no env value is inlined into the bundle
and `.env*` is correctly out. `ensureBuiltDist`'s doc comment no longer states
the guarantee as an absolute.

### Non-blocking 1 — call-boundary taint — **closed, and it holds against a
harder plant**

Plant D rebuilt verbatim, plus one of my own (F) designed to beat a naive
pre-pass — a `function` declaration rather than an arrow, the tainted value in
the **second** argument position behind a decoy literal:

| plant | result |
|---|---|
| D — `const check = (s) => /…/.test(s); return check(t);` | **caught** — `verify-plant-d.mjs:6 … [\`t\` derives from an innerText read at line 4, tested by \`check()\`]` |
| F — `function hasVerdict(prefix, s) {…} return hasVerdict('x', body);` | **caught** — `verify-plant-f.mjs:6 … [\`body\` derives from an innerText read at line 4, tested by \`hasVerdict()\`]` |
| C — a plain `textContent` poll (the two deliberate `verify-a11y.mjs` sites) | **still not flagged** — 13 pass / 0 fail with it present, so the fix bought no churn |

The message now names the predicate as well as the origin line. Imported
predicates are declared out of scope for a single-file textual scan and the test
says so rather than leaving it implied — the right call for a scanner that must
not become a type checker.

### Non-blocking 2 and 3 — `serveModeOf` — **closed**

Re-probed with a stub `fetchImpl`:

| markup / response | classified |
|---|---|
| `src='/assets/index-abc.js'` (single quotes) | **built-dist** (was `unknown`) |
| `src=/assets/index-abc.js` (unquoted) | **built-dist** |
| `href = "/assets/index-Xy12.css"` (spaced `=`) | **built-dist** |
| `src="/assets/index-MmPcFF4j.js"` (baseline) | built-dist |
| stray `/@vite/client` in a comment | vite-dev (fail-closed, unchanged and correct) |
| everything inlined | `unknown` (fail-closed, correct) |
| HTTP 500 / 404 / 302 | **throws, naming the status** — e.g. "GET / answered HTTP 500 Internal Server Error, so there is no served front end to classify" |

The fail-open direction is still unreachable (the `/@vite/client` test runs
first), and the two ways a green gate could have gone red for a non-defect are
gone.

### Non-blocking 4 — one walk per run — **closed**

`verifiedDists` memoizes a VERIFIED-CURRENT result per repo per process, and
only ever after re-checking. Visible in both of my gate runs:

```
[smoke]        dist/ is current (built …, newest build input vite.config.ts) — not rebuilding.
[smoke-budget] dist/ already verified current in this run — not re-checking.
```

Also exercised directly: two `bootKeylessServer({ serve: SERVE_BUILT_DIST })`
calls in one process print the build line once and the cached line second.

### Gates I re-ran

| gate | command | exit |
|---|---|---|
| touched tests | `node --experimental-strip-types --test tests/scripts/wait-for-function-options-position.test.ts tests/scripts/smoke-gate-serve-mode.test.ts` | **0** — 23 pass, 0 fail, 4 suites (was 17) |
| p0-flow ×2 (tip) | `npm run verify:p0-flow` | **0**, **0** — 16.6 s at load 4.52, 16.1 s at load 6.20 (round 1 measured 12.9–13.9 s at load 0.17–1.75; these ran under 3–4× the load) |
| scoring receipt | `node scripts/check-scoring-receipt.mjs main..HEAD` | **0** — "no scoring-path files changed" |
| claims register | `node scripts/honesty-audit.mjs` | **0** — 465 files, 489 tracked md, 115 rows, clean |
| env exclusion | `git grep -n "import.meta.env" -- src index.html` | **empty** |

I did not re-run `verify:surfaces`, `verify:ui-polish` or `npm test`: round 2
touches `DIST_BUILD_INPUTS`, `serveModeOf`, the memo and the scanner, and the
two dev suites' behaviour depends on none of them (both were green on
`f0b5d787` in round 1, driven).

---

## VERDICT: **MERGE**

The one blocking item is fixed at the cause and, more to the point, shown to
fail first: `public/` is in the list, the served favicon now carries the tree's
edit where it did not before, and removing the entry again turns the new fixture
red by name. All four non-blocking items were taken as well, each with the
narrower failure mode closed rather than documented — including the harder
call-boundary plant I wrote specifically to beat the new taint pre-pass, which
it caught with the predicate named.

### Non-blocking

1. **The memo is keyed on the repo path for the life of the process**, and
   deliberately caches only "verified current". Within one gate run nothing
   edits `src/`, so this is right today; if a future gate ever rebuilds or
   mutates the tree between its own boots, the second boot would trust the first
   boot's verdict. One line in the comment would fix the trap for whoever writes
   that gate.
2. **`DIST_BUILD_CONFIG_RE` matches root files only** (`readdirSync(cwd)`), so a
   config moved into a subdirectory — `config/vite.config.ts`, say — would stop
   being seen without anything failing. The shape-matching idea is the right
   one; its blind spot is depth, not name.
3. **Round-1 non-blocking item about a `.fulfill(` mention inside a hand-rolled
   hold is already closed upstream** — `e41e55ca` carries the test ("a hold whose
   handler only MENTIONS route.fulfill( in a comment or string is still a hold"),
   so it arrived with the p0-flow lane's merge, not this one. Noting it so the
   item is not chased twice.
