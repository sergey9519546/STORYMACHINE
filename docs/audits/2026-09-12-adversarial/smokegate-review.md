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
