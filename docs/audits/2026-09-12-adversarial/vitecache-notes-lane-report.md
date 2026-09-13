# Lane report — `lane/vitecache-notes`

- **Worktree:** `/home/user/wt-notes` (its `node_modules` is a symlink to
  `/home/user/STORYMACHINE/node_modules`)
- **Branch:** `lane/vitecache-notes`, from `main` at `996e27a0`
- **Tip:** `e5c42d7fcc1eb3e24cd01d4d26dc9e236b8f21cb` — the tree every gate in
  §3 was confirmed against.

```
$ git log --oneline main..HEAD
e5c42d7f fix: three vite-cache-isolation review observations (a)-(c)
```

**Source:** `docs/audits/2026-09-12-adversarial/vitecache-review.md`, round 2
(`fe92429f`, merged to `main` at `ce093a0c`), the three non-blocking
observations (a)–(c) under "Observations (non-blocking, no action required
to merge)". All three are addressed here, one commit.

---

## 1. What each item became

### Item 1 — the `shutdown()` comment's caller count

**What the comment claimed vs. what was true.** The comment beside
`serverProc?.releaseViteCacheSlot?.()` in `scripts/lib/browser-verify.mjs`
named four `graceMs = 0` callers: `verify:ui-polish`,
`verify:local-safety-net`, `verify:command-palette`, and
`verify:production`'s dev instance. Reading every caller
(`grep -n "shutdown(" scripts/*.mjs`) showed only **three** actually called
`shutdown()` with the default `graceMs`:

- `scripts/verify-e4-local-safety-net.mjs:566` — `shutdown({ browser, serverProc })`
- `scripts/verify-e5-command-palette.mjs:223` — `shutdown({ browser, serverProc })`
- `scripts/verify-ui-polish-affordances.mjs:367` — `shutdown({ browser, serverProc })`

`scripts/verify-production-build.mjs:505` (as it stood before this lane) tore
its dev instance down **inline** — `devProc.kill('SIGTERM')` / `sleep(400)` /
`SIGKILL` on timeout — and never called `shutdown()` at all. So the comment's
"four" was actually three (review observation (a), confirmed).

**Does that boot allocate a slot? Yes.** `verify-production-build.mjs:430`
boots the dev instance through `bootKeylessServer()`
(`scripts/lib/browser-verify.mjs:697`), which calls `allocateViteCacheSlot()`
and attaches `serverProc.releaseViteCacheSlot = cache.release` — the SAME
per-boot allocation every other `bootKeylessServer()` caller gets. The inline
kill at the old `:505` never called that release function, so the slot sat
held until the whole gate process exited (harmless — `vite-cache-dir.mjs`'s
exit hook frees it then — but it meant section 6's separate production boot,
a few lines later in the same file, always took a SECOND slot instead of
reusing this one's now-idle, warm cache the moment section 5 was done with
it). **Real, if low-severity, defect — fixed.**

**Fix — `scripts/verify-production-build.mjs:505-517`:** the inline
kill/sleep/SIGKILL sequence is replaced with
`if (devProc) await shutdown({ serverProc: devProc });`, with a comment
explaining why (releases the slot correctly, and gets `shutdown()`'s
wait-for-actual-exit-before-release behavior instead of the sleep-based
approximation). This makes the original comment's "four" **literally true**
rather than a count that happened to read right, so the comment
(`scripts/lib/browser-verify.mjs:1249-1264`) was corrected to explain the
history rather than just restate the (now-true) count — it records that the
fourth entry is true only as of this lane, cites the review, and explains
what the inline path used to cost.

**Count-pinning test —
`tests/scripts/vite-cache-dir.test.ts:544-604`** (new
`describe('shutdown()'s graceMs=0 callers …')`), matching the shape of the
repo's existing count pins (`tests/scripts/smoke-gate-serve-mode.test.ts`'s
`assert.equal(boots.length, 2, …)`):

- walks every `scripts/**/*.mjs` file (excluding
  `scripts/lib/browser-verify.mjs` itself, which defines `shutdown()` and
  whose own doc comments quote example calls — a plain source scan cannot
  tell prose from code, so the one file where that ambiguity can occur is
  excluded rather than mis-parsed) for `shutdown({ … })` calls with no
  `graceMs` in the object literal;
- asserts the count is exactly 4 and lists exactly the four files;
- asserts `verify-production-build.mjs` really calls
  `shutdown({ serverProc: devProc })` and that the old inline
  `devProc.kill('SIGTERM')` sequence is gone;
- asserts the comment still names all four callers by npm script name.

**Fail-first, shown by reverting only `scripts/verify-production-build.mjs`**
(`git stash push -- scripts/verify-production-build.mjs`, re-run, `git stash
pop`): 2 of the 3 new sub-tests went red — the count came back 3 not 4, and
the "no inline kill" assertion failed because the inline kill was still
there. Restoring the fix returned the suite to 24/24 (later 25/25 once item
3's test was added).

### Item 2 — `distStaleness()` and `vite.config.ts`'s own imports

**The gap.** `vite.config.ts` imports `vite-cache-dir.mjs` (a relative
import, since the round-2 fix moved that module to the repository root), and
`scripts/lib/browser-verify.mjs`'s `distStaleness()` decided `dist/`'s
build inputs from a hand-written `DIST_BUILD_INPUTS` list plus a
root-level-config regex — neither of which knew a config file could import
anything. `tests/core/docker-context.test.ts` had already grown a
`buildTimeImports()` walker on 2026-09-13 to fix the identical blind spot for
the Docker-context policy (review round-1 finding 1); the review named that
walker as "exactly the derivation `DIST_BUILD_INPUTS` would need."

**Fail-first evidence, shown before any fix (commands run against this
worktree, before editing anything):**

```
$ npm run build                                    # clean build
$ touch -d "+2 minutes" vite-cache-dir.mjs          # touch the build-time import
$ node -e "import('./scripts/lib/browser-verify.mjs').then(({distStaleness}) => \
    console.log(distStaleness({repo: process.cwd()}).reason))"
BEFORE FIX distStaleness: null                      # "current" — WRONG: dist/ is now stale
```

**After the fix, same touched file, nothing else changed:**

```
AFTER FIX distStaleness: "dist/index.html is older than vite-cache-dir.mjs (2026-09-13T04:24:03.171Z < 2026-09-13T04:26:08.081Z)"
```

Exact same input, `null`/"current" before, "stale" (naming the touched file)
after — the guard is shown to fail before it is shown to pass, per
`docs/LANE_STANDARD.md` §3. (`vite-cache-dir.mjs` was then `touch`ed back and
`dist/` rebuilt to leave the tree clean for the later gates.)

**Fix — the preferred, one-implementation option, not the "why not" essay:**

- `scripts/lib/build-time-imports.mjs` (new file) — the walker
  (`RELATIVE_IMPORT_RE`, `RESOLUTION_SUFFIXES`, `resolveRelative`,
  `buildTimeImports`) moved out of `tests/core/docker-context.test.ts`
  verbatim, exported.
- `tests/core/docker-context.test.ts:5-8` now imports
  `{ RELATIVE_IMPORT_RE, buildTimeImports }` from that shared module instead
  of defining its own copy; `tests/core/docker-context.test.ts:150` is
  unchanged in behavior (`buildTimeImports(root, 'vite.config.ts')`) but now
  calls the shared implementation. The fixture-based
  "derives vite.config.ts's build-time imports" test and the "would have
  caught the 2026-09-13 regression" fail-direction test are untouched and
  still pass (7/7 in that file).
- `scripts/lib/browser-verify.mjs:495-503` — `distStaleness()` now does:
  ```js
  for (const imported of buildTimeImports(cwd, 'vite.config.ts')) {
    if (!inputs.includes(imported)) inputs.push(imported);
  }
  ```
  right after the existing root-level-config-by-pattern loop, with a comment
  (`:407-421`) explaining why this is a build input and citing review
  observation (b). A fixture repo with no `vite.config.ts` (the synthetic
  `distStaleness` tests in `tests/scripts/smoke-gate-serve-mode.test.ts`)
  gets `[]` from the walker, same as any other missing input — verified,
  those 10 tests still pass unchanged.

One walker, two policies (Docker-context admissibility, `dist/` staleness)
that can now never learn about `vite.config.ts`'s import graph at different
times — the "second copy of a threshold" the lane standard calls a defect
(§1) is gone.

### Item 3 — the once-only signal handler

**The gap, measured.** `vite-cache-dir.mjs`'s `installExitHooks()` used a
single process-wide boolean (`exitHooksInstalled`) to install the
SIGINT/SIGTERM/SIGHUP handlers "at most once." Each handler removes itself
after it fires (`process.off(signal, handler)`), because a listener left
attached after re-raising the signal would receive its own re-raise. With a
single whole-process flag, self-removal was **permanent**: a gate with its
own non-exiting SIGTERM handler survives the first SIGTERM (this module's
handler releases the slot and removes itself), is then free to allocate a
SECOND slot — a real, legitimate case (the review's own `own-handler` test
variant models exactly this) — and a second SIGTERM found no handler left
here at all.

**Decision: re-install, not document-only.** The review's own read was "no
residual hazard… pid-liveness reclaim covers it once it dies," which is
true, but "a process can legitimately allocate again after a caught signal"
is exactly the condition item 3 names as the re-install trigger, and the fix
is small (~15 lines, no new failure modes): track "installed" **per signal**
instead of by one flag.

**Fix — `vite-cache-dir.mjs:264-298`:**
- `exitHookInstalled` (singular) still guards the `'exit'` listener, which
  fires at most once per process by definition and so never needs
  re-installing.
- `installedSignalHandlers` (`Map<signal, handler>`) replaces the boolean for
  SIGINT/SIGTERM/SIGHUP. `installExitHooks()` runs on every
  `allocateViteCacheSlot()` call (unchanged call site,
  `vite-cache-dir.mjs:307`) and re-attaches exactly the signals whose handler
  most recently fired and self-removed (`installedSignalHandlers.delete(signal)`
  inside the handler, `:287`), leaving signals that have not fired untouched
  — no duplicate listeners, no `MaxListeners` warning.
- The block comment above (`:231-259`) is rewritten to explain the gap, cite
  review observation (c) by name, and describe the new per-signal tracking.

**Test — `tests/scripts/vite-cache-dir.test.ts:425-503`**, matching the
existing SIGTERM-driving test's shape (spawn a real holder process, real
signals, assert on real lock files rather than mocking):

1. Holder allocates slot 0, installs its own **non-exiting** SIGTERM handler.
2. Test sends SIGTERM #1 — asserts the slot-0 lock file disappears (this
   module's handler fired and released it; the holder survives because of
   its own handler).
3. Test writes `allocate-second` to the holder's stdin — the holder
   legitimately allocates again (reclaims slot 0, now free) — asserts the new
   lock exists.
4. Test sends SIGTERM #2 — asserts the lock **is** released this time.

**Fail-first, shown by reverting only `vite-cache-dir.mjs`**
(`git stash push -- vite-cache-dir.mjs`, re-run, `git stash pop`): step 4
never happened — the test timed out after 10 s waiting for the second
lock's disappearance (`error: 'timed out waiting for condition'`), exactly
the documented gap. Restoring the fix: the same test passes in ~100 ms.

---

## 2. Gates

All run in the foreground, one at a time, in `/home/user/wt-notes`,
`PW_CHROMIUM_PATH=/opt/pw-browsers/chromium` exported for the browser suites.

| gate | result | exit |
|---|---|---|
| `tests/scripts/vite-cache-dir.test.ts` (touched) | 25/25 | 0 |
| `tests/core/docker-context.test.ts` (touched) | 7/7 | 0 |
| `tests/scripts/smoke-gate-serve-mode.test.ts` (uses `distStaleness`, not directly touched but load-bearing) | 10/10 | 0 |
| `npm run lint` (`tsc --noEmit`) | clean | 0 |
| `check-no-console` | 307 files under `server/` checked, clean | 0 |
| `npm run build` | `✓ built in 1.69s` | 0 |
| `check-docs` | "No AI writing patterns detected" | 0 |
| `honesty-audit` | 465 files + 497 markdown files + 115 claims-register rows, clean | 0 |
| `check-scoring-receipt main..HEAD` | "no scoring-path files changed. OK." | 0 |
| `npm run verify:vite-cache` | PASS — two caches, neither writable by the other, zero 504s | 0 |
| `npm run verify:production` (ONE run — the suite whose teardown this lane touches) | 71/71 assertions | 0 |
| `npm run verify:surfaces` (ONE run) | 248/248 assertions | 0 |
| `npm test` (full suite, ONCE, final tree) | 13811 tests, 2411 suites, **13719 pass, 0 fail**, 91 skipped, 1 todo (332979 ms) | 0 |

The 91 skips are the documented env-gated ones (`REAL_SCRIPT_CORPUS_DIR`-gated
AUC-24 recompute tests among them — see `npm test` output lines around
"tests/fixtures/auc24-table.json is not committed yet"), not new skips from
this change.

---

## 3. What was left undone, and why

Nothing from the three items was narrowed or skipped. Two smaller choices,
recorded rather than hidden:

- Item 1's count-pinning test excludes `scripts/lib/browser-verify.mjs` from
  its `shutdown()`-caller scan, because that file's own doc comments quote
  example calls in prose (`` `shutdown({ serverProc })` frees the slot… ``)
  that a plain regex scan cannot distinguish from code. A comment-aware
  parser would remove the need for the exclusion; a regex scan is what the
  rest of this codebase's count-pins already use (e.g. the fixture-based
  `buildTimeImports` walker itself matches on raw source text), so the
  cheaper, consistent choice was made instead.
- Item 3's fix re-installs per SIGNAL, not per SLOT — a process holding two
  slots simultaneously still shares one SIGTERM handler for both (calling
  `releaseHeldSlots()`, which iterates every held slot, same as before this
  lane). That was already the existing, correct design for the ordinary case
  (one handler releasing everything this process holds) and item 3 only
  asked about the handler surviving across signals, not about per-slot
  handler multiplicity, so it was left as it was.

Nothing else was postponed. Scoring-path files were not touched
(`check-scoring-receipt` confirms it).

---

Tip: `e5c42d7fcc1eb3e24cd01d4d26dc9e236b8f21cb`
