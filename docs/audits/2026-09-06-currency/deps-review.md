# Independent review — dependency-upgrade lane (`7737b51d`, tag `audit/2026-09-06/deps-round1`)

## Round 1

**Reviewer:** independent (did not build this change).
**Lane worktree:** `/home/user/STORYMACHINE/.claude/worktrees/agent-a82cded35f653bb9c`, branch
`worktree-agent-a82cded35f653bb9c`, 10 commits `fdeba7eb..7737b51d` on `main @ da3db049`.
**Reviewed from:** a clean `git archive 7737b51d | tar -x` export at
`<scratch>/deps-review/` with its **own** `npm ci` (lockfile changed; main's `node_modules`
was never symlinked into it). `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`,
`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` (Chromium pinned at
`/opt/pw-browsers/chromium` → `chromium-1194`).
**READ-ONLY honored:** `git -C /home/user/STORYMACHINE status --porcelain` → 0 lines before
and after; `git -C …/worktrees/agent-a82cded35f653bb9c status --porcelain` → 0 lines,
`HEAD = 7737b51d`. Every edit I made was to my own export (one cast reverted for a tsc probe,
then restored — `tsc --noEmit` exit 0 on the restored tree).
**Probes/logs:** `<scratch>/reviews/rv-*.log`, `rv-walk.mjs`, `rv-walk-e4.mjs`,
`rv-sendfile.mjs`, `<scratch>/e4probe/rv-sendfile-e4.mjs`, `<scratch>/id-before|id-after`.
**Servers:** one production-mode server on port 39311 from the export; killed
(`pkill -f "tsx server.ts"`, `ps aux | grep '[t]sx server.ts'` → 0). The browser suites boot
and tear down their own; none survived.
**Budget:** no full `npm test` re-run and no eight-suite battery (the orchestrator runs those
once per merge). I ran the security-critical route tests, the persistence tests,
`verify:production`, `verify:surfaces`, `fuzz-routes --quick`, the five repo gates, the
output-identity harness end to end against a `da3db049` baseline, and my own Express-4-vs-5
differential probes.

**Verdict: REVISE** — the engineering is sound and every substantive claim in the report
reproduces (including the bundle byte count, exactly). Two items block: a **stale stack table
that this change made false** (`ARCHITECTURE.md:71,74`), and the **sendFile fix has no
regression guard that can fail anywhere but this sandbox** — I proved the unfixed code passes
`verify:production` on any checkout path without a dot-segment, which is what CI has. Both are
small and mechanical. Everything else is notes.

---

## 1. Brief-vs-diff table

Non-lockfile diff is 7 files, +102/−56 (`git diff --stat da3db049..7737b51d -- . ':(exclude)package-lock.json'`).

| # | Claim | Status | Evidence (reproduced by me) |
|---|---|---|---|
| 1 | `npm audit` 3 moderate (qs via express 4) → 0 | **DONE** | `npm ci` in my export ended `found 0 vulnerabilities`; `npm audit` exit 0, `found 0 vulnerabilities` (`rv-audit.log`). `node_modules/qs` = **6.16.0** (the fixed line); it is reachable only because `express@5.2.1 → body-parser@2.3.0` no longer pins `qs@~6.15.1`. The fix really is the express major, not an `audit fix`. |
| 2 | Tier 1 = every in-range minor/patch | **DONE, lockfile-only (correct)** | `git diff da3db049..7737b51d -- package.json` shows **no** range change for any Tier-1 package (`@tailwindcss/vite` stays `^4.1.14`, `@codemirror/*` unchanged, …). Tier 1 moved resolved versions in `package-lock.json` only, which is the right shape for "in-range". |
| 3 | Majors landed one per commit | **DONE** | `git log --oneline da3db049..7737b51d`: 10 commits, one major per commit, plus the one bug-fix commit `6d82ade5` sitting immediately after the express commit it belongs to. Installed: express 5.2.1, send 1.2.1, serve-static 2.2.1, path-to-regexp 8.4.2, vite 8.2.2, rolldown 1.2.7, better-sqlite3 13.0.3, playwright 1.63.0, @google/genai 2.21.0, lucide-react 1.41.0, motion 13.2.0. |
| 4 | typescript 7 skipped (classic Compiler API gone) | **DONE, correctly skipped** | `package.json` still `"typescript": "~5.8.2"` — the original `~` range, not a caret npm would have written. The two consumers named in the report are real: `tests/helpers/strip-comments.ts` and `tests/core/theme-convention.test.ts` both walk TS ASTs as a library. I did not install TS 7 to re-verify the ~30 errors; the skip is the conservative call either way and the range is untouched. |
| 5 | @types/node 26 skipped (CI/Dockerfile/engines say 22) | **DONE** | `.github/workflows/ci.yml` `node-version: "22"`; `Dockerfile` `FROM node:22-alpine` ×3 stages; `engines` `">=22.13.0 \|\| >=24"`. Nothing asserts 26. `@types/node` stays `^22.14.0`. |
| 6 | Node 24 Dockerfile base left alone | **DONE** | `Dockerfile` unchanged in the diff; three `node:22-alpine` stages. |
| 7 | One real bug found + fixed (Express 5 `send@1` dotfile guard) | **DONE — and I reproduced the regression on both sides** | §3 below. Express 4/`send@0.19.2` serves a dot-ancestor path **200**; Express 5/`send@1.2.1` **404**s it; `{ root }` → **200**. The causal story is exactly right. |
| 8 | Full `npm test` 12,928/0 each tier; identity 45/45 each tier; receipt clean | **NOT RE-RUN (test) / DONE (identity, receipt)** | Per LANE_STANDARD §4 I did not re-run the full suite. Identity reproduced end to end: **PASS — all 45 reports byte-identical** vs a `git archive da3db049` baseline (`rv-id-compare.log`). `node scripts/check-scoring-receipt.mjs da3db049..7737b51d` → "no scoring-path files changed. OK.", exit 0. |
| 9 | Non-lockfile files touched: the 7 listed | **DONE, exact** | `server/app.ts`, `server/routes/game.ts`, `server/routes/nvm/commits.ts`, `server/routes/nvm/debug.ts`, `tests/routes/route-capabilities.test.ts`, `vite.config.ts`, `package.json`. Nothing else. |
| 10 | Nothing downgraded or removed (owner rule: never subtract) | **DONE — two apparent downgrades are hoisting artifacts** | §9 below. 465 → 363 lockfile entries; **0** direct dependencies removed; the two version-decreases are `readable-stream` and `string_decoder` being re-hoisted from `jszip/node_modules/` to the top level after `prebuild-install`'s chain disappeared. `jszip` wanted `~2.3.6` before and after. |

---

## 2. Express 5 — the migration guide's breaking list, grepped route by route

I worked the published Express 5 breaking-change list, not the diff.

| Breaking change | Grep / probe | Result |
|---|---|---|
| path-to-regexp v8: bare `*` wildcards illegal | `grep -rE "(router\|app)\.(get\|post\|put\|patch\|delete\|del\|all\|use)\(\s*['\"\`][^'\"\`]*[\*\?\+\(\)\[\]]"` over `server/`, `server.ts`, `scripts/` | **0 hits** after the fix. The only wildcard in the tree is the SPA catch-all, converted to `/{*splat}` (`server/app.ts:318`). |
| `{}` braces needed for the root to match | live probe | `GET /` → **200**, `GET /deep/link` → **200** (§4). An unbraced `*splat` would have missed `/`; the braces are right and the comment at `app.ts:314-318` says so. |
| `:param?` optional syntax changed; `?`/`+` removed | same grep | **0 hits** — no optional or repeated params anywhere. |
| `app.del` removed | `grep -rn "\.del("` `server/` | **0 hits**. |
| `res.redirect('back')` removed | `grep -rn "redirect(['\"]back"` `server/ src/` | **0 hits**. |
| `express.urlencoded` `extended` default flip | `grep -rn "express\.(json\|urlencoded\|raw\|text)"` | `urlencoded` is **never used**. Body parsers in play: `express.json({limit:'1mb'})` (`server/app.ts:75`) and one route-local `express.raw({limit:'15mb'})` (`server/routes/scriptide.ts:919`). Moot. |
| `req.query` is a getter (assignment throws) | `grep -rn "req\.query\s*="` `server/` | **0 hits**. All 20 read sites take flat scalars (`limit`, `offset`, `seed`, `format`, `nodeId`, `sessionId`, `sceneIdx`, `title`, `syuzhet`, `maxTurns`); `server/routes/nvm/converge.ts:184` casts to a flat `Record<string,string>`. Nothing depends on the extended parser's nested/bracket behaviour. |
| `req.body` is `undefined` until parsed (was `{}`) | 10 bare `req.body` derefs found (e.g. `server/routes/export.ts:479`, `server/routes/scriptide.ts:1513`, `server/routes/config.ts:462`) | **Structurally safe.** Every one sits behind `validate(schema)` (`server/lib/validation.ts:2940-2951`), which calls `schema.safeParse(req.body)` — `safeParse(undefined)` on an object schema fails, so the handler never runs. Probed live: `POST /api/export/slate` with no Content-Type, with `{}`, and with `text/plain` all return **400**, never 500 (§4). |
| async error handling now built in | — | `asyncHandler` is retained everywhere. Redundant under Express 5, but harmless and conservative; keeping it means the routes behave identically if the wrapper is ever reused elsewhere. Not a defect. |

**The three route files.** `game.ts:982,1003,1030`, `nvm/commits.ts:29`, `nvm/debug.ts:22,31` —
six `req.params.X as string` casts, nothing else. I established *why* rather than taking the
report's word: reverting the cast at `commits.ts:29` and running `tsc --noEmit` gives

```
server/routes/nvm/commits.ts(29,34): error TS2345:
  Argument of type 'string | string[]' is not assignable to parameter of type 'string'.
```

`@types/express` 5 widens `req.params[k]` to `string | string[]` because path-to-regexp v8
wildcards can produce arrays. **The cast is sound and runtime-guarded twice over:** all six
sites are plain named single segments (`:charId`, `:commitId`, `:eventId`, `:locationId`),
which can never be an array; and each route runs `validateParams()` first against a schema
whose field is `z.string().min(1).max(64|128)` (`validation.ts:2675,2693,2697,2701`) — an
array would 400 before the handler. This is not a loosening of `strict`.

**Limiter + zod coverage held.** The strongest evidence is differential, not a passing test:
I walked the live router tree in both trees with the same probe
(`rv-walk.mjs` / `rv-walk-e4.mjs`, `app.router` vs `app._router`) and diffed the sorted
method+path lists:

```
Express 4 (main @ da3db049, express 4.22.2):  ROUTE_COUNT 136
Express 5 (export @ 7737b51d, express 5.2.1): ROUTE_COUNT 136
diff → IDENTICAL route sets
```

So the `app._router` → `app.router` change in `route-capabilities.test.ts:322` does not
under-enumerate, and no route path changed shape. The walk also cannot go vacuous even if it
did break: `llmRoutes`/`deterministicRoutes` are checked in the *reverse* direction
(`… but no longer exists in the live router — stale entry`, `route-capabilities.test.ts:381,398`),
so a shrinking walk fails loudly rather than passing over an empty array. `assertRootMount`'s
`layer.slash ?? layer.regexp?.fast_slash` is correct in both directions (`slash: false` on a
prefixed mount short-circuits `??` and still fires).

Gates:

```
tests/routes/route-capabilities.test.ts   exit 0   pass 6   fail 0
tests/routes/hardening.test.ts            exit 0   pass 24  fail 0
tests/routes/ingress-security.test.ts     exit 0   pass 35  fail 0
tests/routes/limiters.test.ts             exit 0   pass 2   fail 0
npm run check-server-reachability         exit 0   (313 source files, 235 reachable, 78 allowlisted)
npm run fuzz-routes -- --quick            exit 0   98 requests, flagged 0, PASS
```

---

## 3. The sendFile fix — correct, and I reproduced the regression on both majors

`server/app.ts:346`: `res.sendFile('index.html', { root: distPath })`.

I built a minimal app (`rv-sendfile.mjs`) with three routes — the old hand-joined absolute
path, the new `{ root }` form, and a traversal attempt — plus a mounted `express.static`, and
ran it under **both** dependency trees against a dist under `<scratch>/.dotparent/app/dist`
and under `<scratch>/plainparent/app/dist`:

```
EXPRESS 4.22.2 / send 0.19.2   dot-ancestor path
  /old (path.join, no root)                200   <html>SPA</html>
  /new ({ root: distPath })                200
  /trav ('../../../etc/passwd', root set)  403 Forbidden
  /static-served/assets/main-abc123.js     200

EXPRESS 5.2.1 / send 1.2.1     dot-ancestor path
  /old (path.join, no root)                404          <-- THE REGRESSION
  /new ({ root: distPath })                200
  /trav ('../../../etc/passwd', root set)  403 Forbidden
  /static-served/index.html                200
  /static-served/assets/main-abc123.js     200

EXPRESS 5.2.1 / send 1.2.1     plain (production-like) path
  /old (path.join, no root)                200          <-- see REVISE #2
  /new ({ root: distPath })                200
```

Answering the brief's four questions:

1. **Correct for the SPA fallback?** Yes — `GET /` and `GET /deep/link` both return 200 from
   the live server (§4), and `verify:production` asserts index.html arrives at both with
   `Cache-Control: no-cache`.
2. **Correct for hashed assets?** Yes, and they were never at risk: assets go through
   `app.use('/assets', express.static(...))` (`server/app.ts:290`), and `serve-static` always
   passes a `root` to `send`, so only the path *relative to root* is dotfile-checked. My probe
   confirms it directly — `/static-served/assets/main-abc123.js` returned **200** under the
   dot-ancestor path even on Express 5, in the same process where `/old` 404'd.
3. **Still blocks traversal?** Yes. `{ root }` is what *enables* send's containment check —
   `res.sendFile('../../../etc/passwd', { root })` → **403 Forbidden**, not a leak, on both
   majors. And `verify:production`'s raw-HTTP probes all pass: `/assets/../../.env`,
   `..%2f..%2f`, `%2e%2e%2f`, `..%252f..%252f`, `....//....//` — 10 assertions, every one
   `status=404 len=21`, none falling through to the SPA shell. `fuzz-routes` adds
   `commitId-path-traversal` → 404 and `commitId-null-byte` → 404.
4. **Real fix or sandbox accommodation? Is `dotfiles` now explicit?** It is a **real fix** —
   `{ root }` + a bare filename is Express's own documented pattern and the only form whose
   behaviour does not depend on where the app happens to live on disk — but its *trigger* was
   sandbox-specific: the third block above shows the unfixed code returns 200 on any path
   without a dot-segment, so a deploy under `/opt/app` or the Docker image's `/app` would
   never have hit it. That is not an argument against the fix; it is an argument that the fix
   currently has no guard (REVISE #2). On `dotfiles`: the behaviour is now *deterministic*
   rather than explicit — send still defaults to `dotfiles:'ignore'`, but the only path it
   ever checks is the literal `'index.html'`, one segment, no dot. I would **not** add
   `dotfiles:` to this call (it would imply the filename is variable, which it is not);
   `express.static(distPath, { index: false })` at `app.ts:313` likewise keeps the sane
   `'ignore'` default for anything dot-named that lands in `dist/`. Non-blocking either way.

---

## 4. Driving it as a writer would — live production-mode server

Booted from the export: `PORT=39311 NODE_ENV=production SESSION_DB_DIR=:memory: npx tsx server.ts`,
keyless (`startup_keyless`), doctor pool pre-warmed in 2141 ms. Killed afterwards.

```
POST /api/export/slate  (no Content-Type, no body)       400
POST /api/export/slate  (Content-Type: application/json, {})   400
POST /api/export/slate  (Content-Type: text/plain)       400
GET  /                  (SPA root via /{*splat})         200
GET  /deep/link         (SPA deep link)                  200
GET  /api/ledger?limit=5&offset=0                        200
GET  /api/ledger?a[b]=c        (nested query)            200
GET  /api/ledger?limit[]=5     (array query)             200  body []
GET  /api/dramatic-pressure/          (missing param)    404
GET  /api/dramatic-pressure/abc                          200
GET  /api/nvm/commits/..%2f..%2fetc%2fpasswd             404
```

No 500 anywhere: the `req.body === undefined` change lands as a clean 400, and the query-parser
change is invisible because nothing reads nested query.

Browser suites, from the export, `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium`:

```
npm run verify:production   exit 0   71/71 assertions
npm run verify:surfaces     exit 0   193/193 assertions
```

---

## 5. Vite 8 — bundle, code-split budget, headers

My own build (`GEMINI_API_KEY=test-key-ci npm run build`): `vite v8.2.2`, 2510 modules,
**built in 1.61 s**.

```
dist total (find -type f -printf '%s' | sum) = 2,295,220 bytes
report §7 "Final (all 10 commits, rebased)"  = 2,295,220 bytes     <-- exact match
JS chunks = 64 ; recharts present in dist = 0 files
vendor-codemirror-DTl1tyx2.js  340.68 kB / 109.80 kB gzip
vendor-motion-Coeffdh9.js      121.01 kB /  39.28 kB gzip
vendor-lucide-CrrO6f6E.js       28.64 kB /  10.13 kB gzip
```

All three intended vendor chunks survive the object→function `manualChunks` conversion
(`vite.config.ts:41-66`), and `recharts` is still absent — the deliberate removal documented
in the old comment was carried forward, not quietly reinstated. The 500 KB per-chunk budget:
`[PASS] bundle-sizes :: every JS chunk stays under the 500KB raw cap (0 chunk(s) over)`,
total `1755.3KB raw, 525.5KB gzip`.

Compression / cache headers all hold under Rolldown output (10 + 5 assertions):
gzip and brotli both negotiated and byte-exact on decode; `Vary: Accept-Encoding` present; no
`Accept-Encoding` → identity with a matching `Content-Length`; the SSE doctor stream never
compressed; hashed asset → `public, max-age=31536000, immutable`; `index.html` → `no-cache` at
`/` **and** via the SPA fallback; unhashed `favicon.svg` → `public, max-age=0`.

Two new build-time warnings, both benign and both worth knowing about (note 4 below):
Vite's native-config warning names `__dirname` at `vite.config.ts:11`, and lightningcss (new
via vite 8 — it appears in the lockfile as `vite/node_modules/lightningcss@1.33.0`) emits
3 CSS warnings for junk utilities Tailwind generated from *prose* in comments
(`--sm-ink...`, `--sm-*`, `--sm-panel*` — from `src/styles/design-system.css:18-30`,
`src/components/editor/search-panel-theme.ts:15`, `ScriptDoctorPanel.tsx:200`). Pre-existing
content-scanner noise, newly surfaced because esbuild's minifier never validated it.

---

## 6. better-sqlite3 13 + @types 9 — including the Dockerfile question

```
tests/routes/session-delete.test.ts                exit 0  pass 5  fail 0
tests/routes/session-rotation-persistence.test.ts  exit 0  pass 4  fail 0
tests/routes/game-reset-persistence.test.ts        exit 0  pass 4  fail 0
tests/core/draft-persistence.test.ts               exit 0  pass 6  fail 0
verify:production journey (Delete Everything)      PASS — control reachable, reload performed,
                                                   clean slate after reload, 0 console errors
```

**The native-rebuild question, answered from the installed package rather than the changelog.**

```
better-sqlite3@12.8.0 (main):  dependencies {bindings, prebuild-install}
                               scripts.install = "prebuild-install || node-gyp rebuild --release"
                               binary artifact  = build/Release/better_sqlite3.node   (produced at install)
better-sqlite3@13.0.3 (lane):  dependencies {node-addon-api}      <-- no install script at all
                               files[] includes "prebuilds/**"
                               prebuilds/ = darwin-{arm64,x64}, linux-{arm64,x64},
                                            linuxmusl-{arm64,x64}, win32-{arm64,x64}
```

So in the `node:22-alpine` `deps` stage, `npm ci` under v13 **neither compiles nor downloads**:
`prebuilds/linuxmusl-x64.node` ships inside the tarball, and there is no install script to run.
Under v12 the same `npm ci` had to run `prebuild-install` (a network fetch from GitHub
releases, with `node-gyp` — absent from `node:22-alpine` — as the only fallback). This major is
a **strict improvement** for the image: one fewer network dependency at build time and 143
fewer lockfile entries. `engines.node >=22` is satisfied by all three `node:22-alpine` stages
and `engines` `">=22.13.0 || >=24"`. `@types/better-sqlite3@9.6.0` against the v13 runtime:
`tsc --noEmit` exit 0 with no signature changes anywhere in the diff.

---

## 7. @google/genai 2.x — why a major needed no code change

There is **no** provider-code diff, and that is correct. The repo's entire import surface,
enumerated by grep across `server/`, `src/`, `scripts/`, `tests/`:

- values: `GoogleGenAI` (`server/engine/ai.ts:1`), `Modality` (same line), `Type`
  (`Agent.ts:1`, `DirectorNode.ts:1`, `agent/memory.ts:6`, `agent/decision.ts:6`,
  `nvm/live/intent-parser.ts:2`, `routes/scriptide.ts:2`), `FinishReason`
  (`ai-provider.ts:8`);
- types only: `GenerateContentParameters`, `GenerateContentResponse`, `Schema`, `Candidate`;
- methods: `ai.models.generateContent`, `.generateContentStream`, `.embedContent`
  (`ai.ts:138,143,154`).

v2's breaking changes are confined to the Interactions API. I checked the installed 2.21.0
package at runtime rather than trusting the changelog:

```
GoogleGenAI function | Modality object | Type object | FinishReason object
models.generateContent function | generateContentStream function | embedContent function
```

plus `tsc --noEmit` exit 0 over every type-only import. `npm run verify:llm-providers` exit 0 —
but keyless it prints `llmReady=false … keyless — analysis-only mode, nothing to smoke`, i.e.
it proves boot, not a call. See note 5.

---

## 8. Playwright 1.63 and lucide-react 1.41

**Playwright.** `playwright@1.63.0` pins Chromium revision **1243**; this container has only
**1194** (plus `chromium_headless_shell-1194`), which is exactly what `playwright@1.56.1` on
main pins. Consequence, reproduced:

```
npm run verify:production                                       exit 1
  FATAL: browserType.launch: Executable doesn't exist at
  /opt/pw-browsers/chromium_headless_shell-1243/…/chrome-headless-shell
npm run verify:production  PW_CHROMIUM_PATH=/opt/pw-browsers/chromium   exit 0  71/71
npm run verify:surfaces    PW_CHROMIUM_PATH=/opt/pw-browsers/chromium   exit 0  193/193
```

This is **not** a CI break: `.github/workflows/ci.yml:248` runs
`npx playwright install --with-deps chromium` in the browser job, which will fetch 1243 to
match. It is a *local* verification caveat — see note 3. `playwright` is still an exact pin
(`"1.63.0"`, no caret), which is what `tests/core/ci-gates-intact.test.ts` requires and what
the report says caught its own caret slip.

**lucide-react.** The report says it verified "all 40 icon names this repo imports". The real
number is higher: parsing every `import { … } from 'lucide-react'` across `src/` gives **97
distinct named imports**, and I checked each against the installed module —

```
icons imported: 97
MISSING in lucide-react@1.41.0: none
```

The build emits no missing-export warnings (the only build warnings are the two described in
§5, neither about lucide). No defect; the report's count is just wrong (note 4).

---

## 9. Gates, and the "never subtract" check

```
npm audit                                       exit 0   found 0 vulnerabilities
npm run lint (tsc --noEmit)                     exit 0
npm run build                                   exit 0   dist 2,295,220 B, 64 JS chunks
npm run check-no-console                        exit 0
npm run check-server-reachability               exit 0
npm run check-docs                              exit 0
npm run check-brain                             exit 0   90 notes, 265 links, fresh
npm run honesty-audit                           exit 0   445 files + 420 md + 71 claims, clean
node scripts/check-scoring-receipt.mjs da3db049..7737b51d   exit 0   "no scoring-path files changed. OK."
check-doctor-output-identity --compare          PASS — all 45 reports byte-identical
                                                (baseline = git archive da3db049, after = 7737b51d)
```

**Lockfile subtraction audit** (`git show <rev>:package-lock.json`, both revs, diffed by
package path):

- **465 → 363** entries: **143 removed, 41 added, 142 upgraded, 2 decreased.**
- **0 direct dependencies removed** from `package.json` — the diff is 12 version-range lines,
  no deletions.
- Removals are all transitive and all explained: the `@rollup/rollup-*` ×25 and
  `vite/node_modules/@esbuild/*` ×26 platform binaries (replaced by
  `@rolldown/binding-*` ×16 + `lightningcss-*`), `@babel/*` ×19 + `react-refresh`
  (plugin-react 6 drops bundled Babel for Oxc), and `prebuild-install`'s chain — `bl`, `buffer`,
  `tar-fs`, `tar-stream`, `pump`, `rc`, `node-abi`, `simple-get`, … (better-sqlite3 13's
  prebuilds), plus Express 4's `array-flatten`, `methods`, `utils-merge`, `destroy`,
  `mime@1.6.0`, `debug@2.6.9`.
- The two decreases are **hoisting artifacts, not downgrades**:
  `readable-stream 3.6.2 → 2.3.8` and `string_decoder 1.3.0 → 1.1.1`. Before, `readable-stream@3`
  was hoisted for `bl`/`tar-stream` (both now gone) while `jszip/node_modules/readable-stream@2.3.8`
  sat nested; after, `jszip`'s copy is simply hoisted to the top level. Dependents:
  `before → {bl ^3.4.0, jszip ~2.3.6, tar-stream ^3.1.1}`, `after → {jszip ~2.3.6}`. Nothing
  that depended on v3 still exists, and `jszip` gets the same v2 it always got. `npm audit`
  reports 0 either way. **No subtraction.**

---

## 10. What a stronger version would have done

- **Pinned the sendFile regression environment-independently** (REVISE #2). The lane found the
  bug the hard way and fixed it correctly, but the only thing standing between `main` and a
  future refactor back to `path.join(distPath, …)` is a suite that, per my third probe block in
  §3, returns 200 on the unfixed code anywhere without a dot-segment in the path — including
  GitHub Actions' `/home/runner/work/<repo>/<repo>`. LANE_STANDARD §3: a guard must be shown to
  FAIL on the unfixed input. Here it fails only by accident of *where* the reviewer happens to
  stand.
- **Updated the one doc this change falsified** (REVISE #1). Two table cells.
- **Recorded the Chromium-revision consequence** where the next person will hit it — the
  battery scripts' own header comments already document `PW_CHROMIUM_PATH`; what is missing is
  that after this bump the sandbox's 1194 is *no longer* the version Playwright pins, so the
  override is now mandatory locally rather than optional. Note 3, in scope but not blocking.
- Out of scope and correctly left alone: typescript 7, `@types/node` 26, the Node 24 base.
  All three skips are argued from repo evidence I re-verified, not from convenience.

---

**Verdict: REVISE**

1. **`ARCHITECTURE.md:71` and `:74` are now false.** The Stack table reads `| HTTP | Express 4 |`
   and `| Frontend | React 19, Vite 6, Tailwind 4, CodeMirror 6 |`; this branch ships Express
   5.2.1 and Vite 8.2.2. Reproduction: `sed -n '68,76p' ARCHITECTURE.md` on `7737b51d`.
   Change to `Express 5` and `Vite 8`. (`check-docs`/`honesty-audit` do not catch version
   drift, so this needs the human edit; it is the "copy tells the truth" clause of
   LANE_STANDARD §2, and this lane is what made it untrue.)
2. **The `server/app.ts:346` fix has no regression guard that can fail off this sandbox.** Add a
   test that pins it independently of the checkout path — e.g. a route test that creates a
   temp dir with a dot-prefixed ancestor (`<tmp>/.guard/dist/index.html`), builds an app with
   `serveStatic:true` pointed at it, and asserts the SPA fallback returns 200 with the shell.
   Reproduction that it is needed, from §3: on `<scratch>/plainparent/app/dist` (no dot
   segment) the **unfixed** `res.sendFile(path.join(distPath,'index.html'))` returns **200**
   under Express 5.2.1/send 1.2.1, so `verify:production` — the suite that caught this —
   would pass on the unfixed code on a normal CI runner path. Show the new test failing on the
   `path.join` form and passing on the `{ root }` form.

Notes (not blocking, no action required to merge once 1–2 land):

3. `playwright@1.63.0` pins Chromium **1243**; this container has **1194** only. Without
   `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium` every browser suite now fails to launch
   (reproduced: `verify:production` exit 1). CI is unaffected — `ci.yml:248` installs the
   matching browser. But every green battery run on this branch was a 1.63 client driving a
   49-revision-older browser, which is weaker evidence than the same run was before the bump.
   Worth one line wherever the sandbox's browser provisioning is described.
4. Two report figures are off, both harmlessly: §8's "all 40 icon names this repo imports"
   (actually **97** distinct named lucide imports across `src/` — all 97 resolve), and §7's
   final row "still ~541KB gzip" (the final tree measures **525.5 KB** gzip / 1755.3 KB raw /
   64 chunks; the byte count `2,295,220` in the same row is exact). Favorable direction in both
   cases.
5. The `@google/genai` 1→2 major is verified statically only — `tsc`, a runtime export check,
   and a keyless boot that explicitly prints "nothing to smoke". No live `generateContent` call
   was exercised against 2.21.0 in this environment. Real residual, unavoidable without a key;
   worth stating in the merge record rather than leaving implied.

---

## Round 2

**Same reviewer.** Eleventh commit **`717ac51d`** on `7737b51d`
(tag `audit/2026-09-06/deps-round2`), 3 files, **+125/−2**:
`ARCHITECTURE.md` (+2/−2), `README.md` (+20), `tests/routes/hardening.test.ts` (+103).
Re-checked from the same export, re-synced with `git archive 717ac51d | tar -x` over it
(same `node_modules` — the lockfile did not change in this commit).
**READ-ONLY still honored:** `git -C /home/user/STORYMACHINE status --porcelain` → 0 lines;
worktree → 0 lines, `HEAD = 717ac51d`. The only edit I made was to my own export
(`server/app.ts` reverted for the fail-first probe, then restored from a backup; the restored
tree re-runs 29/29).
**Budget:** smallest pass, as instructed — diff read, the new describe run both ways, cleanup
checked, `ci.yml` read against the README paragraph, one more stale-version grep. No full
`npm test`, no battery.

### R1-#1 — `ARCHITECTURE.md` stack table — **FIXED, verified**

`ARCHITECTURE.md:71` now `| HTTP | Express 5 |`; `:74` now
`| Frontend | React 19, Vite 8, Tailwind 4, CodeMirror 6 |`. Both match what the lockfile
actually installs (express 5.2.1, vite 8.2.2).

The "only dated audit snapshots remain" claim is **true, and I checked it is not vacuous** —
there really is one such hit, and it really is history:

```
grep -rniE "express ?4|express@4|vite ?6|vite@6|playwright 1\.56|better-sqlite3 ?12|
            lucide-react 0\.|motion 12|@google/genai 1\.|typescript 5\.8"
  README ARCHITECTURE CONTRIBUTING RELIABILITY SECURITY NORTH_STAR ROADMAP
  ULTRAPLAN CHANGELOG AGENTS docs/
→ 0 hits outside docs/audits|docs/p1-benchmark|docs/sessions
→ 1 hit total in docs/:
   docs/audits/2026-07-14-high-end-audit/PHASE_2_REPOSITORY_RECONSTRUCTION.md:251
     "Express 4 server on one Node 22 process"
```

A dated audit's description of the repo as it stood on 2026-07-14; rewriting it would falsify
the record. Correctly left alone. `docs/brain/` (Surface and Gate notes included): **0 hits**.

### R1-#2 — environment-independent regression guard — **FIXED, and I proved fail-first myself**

`tests/routes/hardening.test.ts:343-445`, new describe *"SPA fallback survives a dot-prefixed
ancestor directory"*. The mechanism is the right one: `fs.mkdtempSync(path.join(os.tmpdir(),
'.sm-dotguard-'))` — the leading `.` in the *template* makes the temp directory itself the
dot-prefixed ancestor, so the trigger travels with the test instead of depending on where the
checkout sits. It then `process.chdir()`s there and calls `createApp({ serveStatic: true })`,
which is what makes `distPath = path.join(process.cwd(), 'dist')` land under the dot segment.

**This is the assertion that matters, and I re-derived it rather than trusting the report.**
My export lives at `…/scratchpad/deps-review` — I confirmed it has **zero** path segments
starting with a dot (`pwd | tr '/' '\n' | grep -c '^\.'` → `0`), i.e. the exact situation in
which `verify:production` could not tell the two forms apart. From that path:

```
FIXED   (res.sendFile('index.html', { root: distPath }))
  node --experimental-strip-types tests/routes/hardening.test.ts
  exit 0   # tests 29   # pass 29   # fail 0

UNFIXED (reverted to res.sendFile(path.join(distPath, 'index.html')))
  exit 1   # tests 29   # pass 27   # fail 2
    not ok 2 - GET / (SPA fallback at the root) returns 200 with the app shell
    not ok 3 - GET /some/deep/route (SPA fallback, a deep link) returns 200 with the app shell
        Expected values to be strictly equal:  404 !== 200
    (subtests 1, 4, 5 — the dot-prefix sanity check, the hashed asset, the traversal probe —
     stayed green in BOTH runs)

RESTORED  exit 0   # pass 29   # fail 0
```

Exactly the two assertions the lane claimed, exactly the 404, and — the part that closes R1-#2
— **from a checkout path with no dot segment**, which is what CI has. The guard now fails on
the unfixed input everywhere, not only in this sandbox. The asset and traversal subtests
staying green in both runs is the correct control: it shows the new describe is discriminating
on the SPA path specifically, not just reacting to any change under `app.ts`.

The two supporting subtests are worth keeping and are not decorative: the dot-prefix sanity
check (`path.basename(fakeRoot).startsWith('.')`) stops the whole block from silently becoming
a no-op if a future `os.tmpdir()`/mkdtemp change drops the prefix, and the traversal probe
(`/assets/..%2f…%2fetc%2fpasswd` → 403/404 plus a `!/root:/` body check) pins that the
containment behaviour is unaffected by the dot-ancestor root.

**Temp-dir cleanup — checked, and checked on the failing path too:**

```
before any run:            ls -d /tmp/.sm-dotguard-*  → 0
after the passing run:     0
after the FAILING run:     0
```

`after()` closes the server, `process.chdir(originalCwd)`, `delete process.env.NODE_ENV`,
`fs.rmSync(fakeRoot, { recursive: true, force: true })`. Nothing leaks on either path, and the
subsequent describes in the same file (the S1-c crash-safety block) still pass — 29/29 — so the
`chdir`/`NODE_ENV` mutation is properly scoped. `delete process.env.NODE_ENV` rather than
restoring a saved value is **correct here, not a bug**: the unit-test job runs with `NODE_ENV`
unset on purpose (`.github/workflows/ci.yml:204` — "suite boots with NODE_ENV unset, so all of
them exercise `server/app.ts`'s …"), so deleting restores the true prior state.

No `dotfiles:` option was added, per my round-1 read. Correct — the filename is a literal.

### README "Local Chromium version" — accurate against `ci.yml`

`README.md:129-146`. I read the CI job it describes rather than the paragraph alone
(`.github/workflows/ci.yml:230-256`):

- *"the `browser` job … runs `npx playwright install --with-deps chromium` before the battery"* —
  true: `- name: Install Playwright Chromium / run: npx playwright install --with-deps chromium`
  is the step immediately before `- name: Browser verification battery / run: npm run verify:browser`.
- *"which always fetches the exact revision the checked-out `playwright` version pins"* — true,
  and the workflow says the same thing in its own comment two lines above the job
  ("`playwright` is a pinned devDependency, so the installed browser build always matches the
  client driving it").
- *"the override … is a local/sandbox convenience only"* — true, and stronger than stated:
  `ci.yml:251-254` deliberately documents that `PW_CHROMIUM_PATH` is **not** set in CI
  ("keeping it unset here is what proves the CI path really works").
- *"`playwright` is an exact-pinned devDependency … `tests/core/ci-gates-intact.test.ts` fails
  the build if that ever changes"* — true (`"playwright": "1.63.0"`, no range char).
- The failure mode quoted (`browserType.launch: Executable doesn't exist at
  .../chromium_headless_shell-<new-revision>/...`) is verbatim what I hit in round 1 §8.

No overclaim; the paragraph does not promise the sandbox will be re-provisioned, only how to
work with it.

### Report figures — corrected

The two numbers I flagged now read 97 lucide icons and 525.5 KB gzip / 64 chunks, matching my
own measurements (round 1 §5, §8).

### Gates re-run on `717ac51d`

```
npm run lint (tsc --noEmit)                                exit 0
tests/routes/hardening.test.ts                             exit 0   29/29
npm run check-docs                                         exit 0   "No AI writing patterns detected"
npm run check-brain                                        exit 0   90 notes, 265 links, fresh
npm run honesty-audit                                      exit 0
node scripts/check-scoring-receipt.mjs da3db049..717ac51d  exit 0   "no scoring-path files changed. OK."
```

Nothing in this commit touches `package.json`, `package-lock.json`, or any runtime file, so the
round-1 measurements (audit 0, dist 2,295,220 B, identity 45/45, `verify:production` 71/71,
`verify:surfaces` 193/193, 136-route walk) all still stand unchanged.

---

**Verdict: MERGE**

Both round-1 blockers are closed on evidence I produced myself, not on the report's word: the
stack table is true again and the one remaining stale string is a dated audit snapshot that
should stay stale; and the sendFile guard now fails with `404 !== 200` on exactly the two SPA
assertions from a checkout path containing no dot segment, which is the environment CI runs in
and the precise gap round 1 named. Cleanup is clean on both the passing and the failing path,
and the README paragraph checks out line-for-line against the workflow it describes.

One optional follow-up, not a condition of merge and not worth another round:

1. `tests/routes/hardening.test.ts:396-404` — in `after()`, `server.close()` runs *before*
   `process.chdir(originalCwd)` and `fs.rmSync(fakeRoot, …)`. If `before()` ever throws between
   `process.chdir(fakeRoot)` (`:369`) and the `server` assignment (`:377`) — a `createApp`
   failure, say — `after()` still runs (verified: node:test executes `after` when `before`
   throws) but dies on `server.close()` with `server` undefined, so the restore never happens
   and the process stays cwd'd inside the temp dir for every later describe in the file, which
   would bury the real error under a cascade. One line: `if (server) { await close }`, or move
   the `chdir`/`rmSync` ahead of the close. Only reachable when the file is already failing, so
   it costs nothing to leave until the next time this file is touched.
