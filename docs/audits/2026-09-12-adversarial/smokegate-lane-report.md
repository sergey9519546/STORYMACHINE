# Lane report — `lane/smoke-gate-boot` (the smoke gate's boot, and one scanner escape)

**Worktree:** `/home/user/wt-smoke` (`node_modules` → the main checkout's, 217
entries). **Branch:** `lane/smoke-gate-boot`, rebased onto `main` `e41e55ca`.
**Tip:** `f0b5d787046944706d69c764676f9af32224cafa`.

```
$ git log --oneline main..HEAD
f0b5d787 test(scanner): track the innerText ASSIGNMENT, not only the line that reads it
0077fc6f docs(gates): say which front end each browser suite serves, and pin it
0099d2c2 fix(gates): the P0 smoke gate serves the BUILT dist/, and says so on every run
```

12 files, **+709 / −73**. No `src/`, no `server/`. The only file written under
`/home/user/STORYMACHINE` is this report (uncommitted).

---

## 1. What the thing is (and what the brief got right)

`verify:p0-flow` (`scripts/smoke-p0-live-flow.mjs`) is the golden-path gate: it
boots a keyless server, clicks "Try sample coverage", and asserts the verdict,
the two pinned earliest-instant windows, the Cancel and failed-run toggle
sentences, the budget-stopped sentence, and the sample's provenance. It runs in
CI's `browser` job and **blocks `publish` in `release.yml`**.

Its boot went through `bootKeylessServer`, which set no `NODE_ENV`, so
`server/app.ts:279` took the **Vite dev-middleware** branch. Reproduced
independently before changing anything: the served `/` carried `/@vite/client`
and no hashed `/assets/*.js`. So the gate that gates the published image
certified an app the published image never serves — and nothing in its output,
its header, or any document said which of the two it was. The p0-flow reviewer
had to boot a server by hand and grep markup to establish it.

Two things the brief supposed that are NOT true, and one that is:

- **"docs say the smoke gate drives the production build."** No document in
  this repository said that. `README.md`, `CONTRIBUTING.md`, `ci.yml`,
  `verify-production-build.mjs`'s header and the browser-battery brain note all
  said the OPPOSITE — "`verify:production` is the only suite that boots
  `NODE_ENV=production`" — and were correct at the time. The false sentence
  lived in the orchestrator's brief, not in the tree. (All five are now stale in
  the other direction, and all five are fixed here.)
- **"the writer runs the built app."** For this gate's own audience that was
  false too: `docs/user-validation/RUN_DEMO.md` tells a P0 moderator to stand
  the server up with `npm run dev`, i.e. the dev front end. That did not change
  the decision, but it changed what had to be written down — see §2's last
  paragraph and the RUN_DEMO.md diff.
- **The 504 is real and recurs.** It is not a one-off the previous lane was
  unlucky with: it fired again, unprompted, in my own before-runs (§3).

## 2. Decision: **(a)** — the gate serves the built `dist/`

`bootKeylessServer` gained a `serve` option. `verify:p0-flow` passes
`SERVE_BUILT_DIST` on **both** of its boots (the main server and step 3e's
budget server); the other seven suites keep the dev default. Three mechanisms,
all in `scripts/lib/browser-verify.mjs`:

1. **`ensureBuiltDist()`** — `dist/` must exist and be newer than every client
   build input (`src/`, `index.html`, `vite.config.ts`, `package.json`,
   `package-lock.json`; `server/**` deliberately excluded — the server runs from
   source in both modes, so a server edit cannot stale a bundle). If it is not,
   the gate runs `npm run build` itself and refuses loudly if that still leaves
   `dist/` unusable.
2. **`serveModeOf()`** — one `GET /` classifies the front end from the markup
   (`/@vite/client` vs a hashed `/assets/*.js`). **Every** boot now prints it;
   a boot that comes up in the other mode throws by name.
3. The banner line the brief asked for, e.g.
   `[smoke] serving: the BUILT dist/ under NODE_ENV=production (hashed asset /assets/index-MmPcFF4j.js) — the same static bundle the Dockerfile CMD serves; no Vite dev middleware in this run.`

**Why (a) rather than (b),** with the four things that decided it:

| question | answer, measured |
|---|---|
| does the MOUNT hold still pin against the built chunk? | **yes.** `npm run build` emits `dist/assets/CoverageSummary-Bj05VbW3.js`; `**/CoverageSummary*` matches it, `earlyChunk.waitUntilHeld()` resolves (it throws on a glob that matched nothing), and the regressed tree is caught 3/3 at MOUNT (§4) |
| what does it cost? | **it is cheaper.** 20.0–22.5 s dev → 13.1–15.9 s dist, paired and alternated (§3). `npm run build` is 2.7 / 3.1 / 3.6 s and only runs when `dist/` is stale |
| does CI still work with no build step? | **yes**, because the gate builds when stale — no `ci.yml` step added, `verify:browser` still runs from a clean checkout |
| does it lose dev coverage of the golden path? | **no.** `verify:surfaces` (P3) and `verify:a11y` both drive "Try sample coverage" with `NODE_ENV` unset |

And what it gains: the gate that blocks `publish` now exercises the CSP, the
hashed asset URLs and the static-serving branch that only exist in the
published artifact — and `NODE_ENV=production` runs no Vite dep optimizer at
all, so the 504 class is **removed**, not merely made less likely. Option (b)'s
per-worktree `VITE_CACHE_DIR` would have narrowed that window for this gate
while leaving it open in the seven suites that keep dev middleware; it is
recorded as a follow-up in §7 rather than done here.

The honest cost of (a) is that the gate no longer serves exactly what the P0
moderator serves. `RUN_DEMO.md` now says so in the smoke-check section, names
the observable difference (HMR noise and no CSP in dev — which is why step 5's
console rule tolerates lines this gate tolerates none of), and gives the
command that makes the two match (`npm run build` then `NODE_ENV=production npm start`).

## 3. Before / after, six runs each

**Paired and alternated** (one before, one after, back to back, so both see the
same machine): "before" is `git archive origin/main` exported to scratch with
`node_modules` symlinked, dev middleware; "after" is the worktree tip served
from `dist/`. Foreground, one at a time, load read at each run's start.

| pair | BEFORE load | BEFORE exit | BEFORE wall | AFTER load | AFTER exit | AFTER wall |
|---|---|---|---|---|---|---|
| 1 | 0.92 | 0 | 21.6 s | 3.93 | 0 | **13.1 s** |
| 2 | 3.54 | 0 | 20.0 s | 4.70 | 0 | **15.9 s** |
| 3 | 5.74 | 0 | 22.5 s | 6.39 | 0 | **14.8 s** |
| 4 | 6.79 | 0 | 21.8 s | 5.70 | 0 | **14.7 s** |
| 5 | 5.23 | 0 | 21.5 s | 4.24 | 0 | **14.2 s** |
| 6 | 3.58 | 0 | 20.3 s | 3.93 | 0 | **13.6 s** |

12/12 green. **The distribution did not widen:** before spans 20.0–22.5 (range
2.5 s), after spans 13.1–15.9 (range 2.8 s) — the same spread, the centre 7 s
lower. A seventh run on the final rebased tip: exit 0, 13.4 s at load 1.52.

**The unpaired before-set, run first, while another lane held the machine** —
kept because it is the evidence for the 504:

| run | load | exit | wall | note |
|---|---|---|---|---|
| 1 | 4.58 | 0 | 23.9 s | |
| 2 | 4.57 | 0 | 29.9 s | |
| 3 | 8.15 | **1** | 36.2 s | `504 (Outdated Optimize Dep)` → no "Try sample coverage" button, 1 genuine console error |
| 4 | 5.46 | 0 | 30.0 s | |
| 5 | 7.12 | 0 | 28.7 s | |
| 6 | 7.04 | 0 | 28.8 s | |

That is the failure the p0-flow lane hit once and left open, reproduced without
trying to: two worktrees sharing one `node_modules/.vite` through a symlinked
`node_modules`. It cannot recur on the production branch.

`npm run build`, three consecutive runs at load 6.0–6.9: **3.57 / 3.08 / 2.71 s**.

## 4. The two pinned windows still pin

`git archive` of the tip with **only** the `doctorAutoSample` clause removed
from `coverageFullReportToggleState` (`src/components/ScriptIDE.tsx:2453`),
`node scripts/smoke-p0-live-flow.mjs`, foreground, one at a time:

| run | load | exit | wall | caught by |
|---|---|---|---|---|
| 1 | 2.15 | **1** | 7.0 s | MOUNT ("was NOT disabled at the earliest instant") |
| 2 | 2.06 | **1** | 5.0 s | MOUNT |
| 3 | 1.98 | **1** | 5.7 s | MOUNT |

**3/3**, as the brief required. Run 1's log also exercises the freshness rule
end to end on a real tree: `dist/index.html does not exist; running npm run
build` → `dist/ rebuilt`; run 2 then reports `dist/ is current (… newest build
input src/components/ScriptIDE.tsx) — not rebuilding`, i.e. it saw the planted
edit and correctly judged the build newer than it.

IN FLIGHT is still pinned on the healthy tree: every green run logs
`earliest-instant "Full report" click did not cold-open the full report (MOUNT
and IN FLIGHT windows both held)`, and that line is only reachable through
`earlyRun.waitUntilHeld()`, which throws when the POST hold intercepted
nothing.

## 5. The scanner escape — fail-first, three ways

`bareVerdictPolls` required the verdict alternation and `innerText` on the SAME
line. It now carries a **taint**: an identifier assigned from an `innerText`
read (of `document.body` or any element, through an `await`, with the
right-hand side spread over lines) is tainted for the rest of its block,
propagates through derived assignments, and a verdict alternation tested
against a tainted name anywhere is the same offender. `textContent` taints too
but stays benign until `.toUpperCase()` promotes it — the `text-transform` bug
rewritten by hand. Two masks over one set of byte positions: structure (brace
depth, identifier occurrences) from the fully masked copy; content from a
comments-only mask, so `new RegExp('RECOMMEND|CONSIDER|PASS')` is visible while
prose about the trap is not.

| tree | result |
|---|---|
| tip, untouched | **12 pass / 0 fail** (3 suites) |
| tip + the round-3 reviewer's plant in `verify-focus-traps.mjs`, and a hand-uppercased `textContent` poll in `verify-e5-command-palette.mjs` | **11 pass / 1 fail**, both named by file, line and origin — `verify-focus-traps.mjs:409` with "`t` derives from an innerText read at line 408", `verify-e5-command-palette.mjs:232` with "`up` derives from a textContent read uppercased by hand at line 230" |
| **`main`'s own `scripts/`** + this scanner | **11 pass / 1 fail**, naming a REAL site: `scripts/verify-p2-p3-surfaces.mjs:808` |

The third row is the one that matters: the new rule is not plant-only, it
reaches shipped code. `:807-808` reads the summary panel's `innerText` after
waiting for the panel's own "Full report" button and then tests a bare
alternation on it — a one-shot read rather than a poll, so the readiness wait
makes a progress-copy match unlikely, not impossible, and an assertion that
CAN be satisfied by "RUNNING PASS 1 OF 14…" is weaker than it reads. It is
fixed at the cause, not exempted: `textCarriesDoctorVerdict()` is the new
node-side twin of `waitForDoctorVerdict`'s page-side predicate (progress copy
stripped, verdict as a whole word, a fresh `RegExp` per call because
`DOCTOR_PROGRESS_COPY_RE` is `/g`). `verify:surfaces` re-run: **248/248**.

The scanner's own unit assertions cover both directions, including the ones a
narrower rule would have got wrong: a plain `textContent` poll is still NOT an
offender (the two deliberate `verify-a11y.mjs` sites), a name reused in another
block is not the same value, and routing an already-read string through the
shared predicate is not the trap.

## 6. Gates (foreground, in `/home/user/wt-smoke`, exit codes)

| gate | command | exit |
|---|---|---|
| touched tests | `node --experimental-strip-types --test tests/scripts/wait-for-function-options-position.test.ts tests/scripts/smoke-gate-serve-mode.test.ts` | **0** — 17 pass, 0 fail, 4 suites |
| lint | `npx tsc --noEmit` | **0** |
| no-console | `node scripts/check-no-console.mjs` | **0** — 307 files |
| docs | `npm run check-docs` | **0** |
| claims register | `node scripts/honesty-audit.mjs` | **0** — 465 files, 489 tracked md, 115 rows, clean |
| brain graph | `node scripts/brain-graph.mjs --check` | **0** — 110 notes, 419 links, fresh |
| scoring receipt | `node scripts/check-scoring-receipt.mjs main..HEAD` | **0** — "no scoring-path files changed" |
| p0-flow | `npm run verify:p0-flow` ×6 after + 1 on the rebased tip | **0** ×7 (§3) |
| p0-flow, regressed tree | `node scripts/smoke-p0-live-flow.mjs` ×3 | **1** ×3 at MOUNT (§4) |
| ui-polish | `npm run verify:ui-polish` | **0** — 27/27 |
| surfaces | `npm run verify:surfaces` | **0** — 248/248, peak 124/60 s vs ceiling 1200 |
| full suite (rebased tree) | `npm test` | **0** — 13776 tests, 13684 pass, **0 fail**, 91 skipped, 339 s |

Both browser gates that share `browser-verify.mjs` were run because this lane
edits that helper. `npm test` was run twice: once before the rebase (320 s, 0
fail) and once on the final rebased tree.

## 7. What I left undone

- **Per-worktree `VITE_CACHE_DIR` for the seven dev-middleware suites.** The
  504 that killed a before-run is gone from `verify:p0-flow` because that gate
  no longer runs a dep optimizer, but `verify:surfaces`, `verify:a11y`,
  `verify:focus-traps`, `verify:ui-polish`, `verify:local-safety-net`,
  `verify:command-palette` and `verify:production`'s dev-comparison boot all
  still share `node_modules/.vite` across worktrees. Fixing it needs
  `cacheDir: process.env.VITE_CACHE_DIR || undefined` in `vite.config.ts` plus
  a per-repo-root value in `bootKeylessServer` — two lines, but it touches the
  build config for every consumer, and this lane's brief made it the *fallback*
  option, not an addition to (a). Own lane; the hazard is measured above.
- **`ARCHITECTURE.md:481` still says "the seven suites"** and lists seven of
  the eight (it predates `verify:production`). Pre-existing, unrelated to the
  serve-mode claim, and not touched.
- **The gate still asserts nothing about the released run completing** —
  `earlyRun.release()` is followed by a context close (p0-flow review,
  non-blocking item 2). Unchanged by this lane.
- **No product change**, because there is no product defect here: every
  assertion the gate makes passes identically in both front ends. What moved is
  which app is being asserted against.

## Tip and origin

```
$ git rev-parse HEAD
f0b5d787046944706d69c764676f9af32224cafa

$ git ls-remote origin lane/smoke-gate-boot main
f0b5d787046944706d69c764676f9af32224cafa	refs/heads/lane/smoke-gate-boot
e41e55ca8f846c1d2c464a1d8d0ef480118cb1d9	refs/heads/main
```

The branch is pushed and rebased onto `main` `e41e55ca`; every commit was
pushed as it was made.
