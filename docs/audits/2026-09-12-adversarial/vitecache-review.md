# Review — `lane/vite-cache-isolation` @ `b8adfcfc`, round 1

Reviewed object: `b8adfcfcfb0e38b24b5f980ed2a10587b30108ce` on
`lane/vite-cache-isolation`, base `main` at `f79b47ec`, 4 commits, 17 files,
+1794/−28. Worktree `/home/user/wt-vitecache` (its `node_modules` is a symlink
to `/home/user/STORYMACHINE/node_modules`, which is the hazard under test).
Reviewer did not build the change. Procedure: `docs/LANE_STANDARD.md` §6.
Scratch paths below are written `<session scratch>`.

**VERDICT: REVISE** — one blocking defect (the Docker builder stage cannot
build this tree), plus four items the lane can act on. The fix itself is
correct, well-argued and holds under the concurrency I threw at it; the
blocking item is a build-context consequence of the new import that nothing in
the lane's gate list can see.

---

## 1. The brief, item by item

| # | brief item | verdict | evidence |
|---|---|---|---|
| 1 | per-worktree cache in `vite.config.ts`; reasoning written down; build and dev middleware agree; cache not a `dist/` build input | **done, with a regression** | `vite.config.ts:31` sets `cacheDir: resolveViteCacheDir({ repoRoot: __dirname })`; both dev middleware and `vite build` read that one config. Reasoning is in `scripts/lib/vite-cache-dir.mjs`'s header and is a real argument, not a gesture. But the new `vite.config.ts:5` import breaks the Docker builder stage — finding 1. |
| 1a | design: is `os.tmpdir()` right; does a crashed process hold a slot forever; is the release after the process is actually dead | **argued; two answers are weaker than the copy says** | tmpdir is defensible (see §4). A *crashed* holder does not hold a slot forever — verified. A SIGTERM'd holder leaves the lock file behind (finding 3). The release is after the *signal*, not after the death (finding 2). |
| 2 | `bootKeylessServer` passes a per-boot `VITE_CACHE_DIR` unless the caller set one; logs it | **done, driven** | `browser-verify.mjs:645,652,690-695`. Observed live on `verify:surfaces` and on my own three-boot probe: `slot-0`, `slot-1`, `slot-2`, one line each. |
| 3 | proof the 504 class cannot recur; a guard shown to FAIL on the unfixed input | **done for the resolution half; narrowed for the per-boot half** | `npm run verify:vite-cache` exit 0 (27.8 s); same command `--config=<main's vite.config.ts> --allow-repo-cache-reset` exit 1 (15.1 s) with the reported deltas exactly. The per-boot slot half has **no** end-to-end harness — only source-regex pins. I drove it myself instead (§3). |
| 4 | unit pin: two inputs → two dirs, default not under `node_modules`; check they can fail | **done, with one assertion that cannot fail** | 15/15 in 0.58 s. Six of the seven `resolveViteCacheDir` assertions are content-bearing; the seventh is `f(x) === f(x)` — finding 4. The lock state machine is untested — finding 5. |
| 5 | ARCHITECTURE "seven suites" corrected; smoke header updated; other stale counts; verify both of the lane's two corrections; is "eight / seven" right and consistent | **done; both corrections confirmed; one stale count survives** | `verify:browser` composes exactly 8 suites (`package.json`), so **eight** is right. `verify-corpus-layout.mjs` contains no `launchChromium`, no `bootKeylessServer`, no server boot — the lane's correction 1 is confirmed. `verify-production-build.mjs:430` calls `bootKeylessServer` on its default dev `serve`, so **seven dev-middleware boot sites** is right — correction 2 confirmed. Residual: finding 6. |
| 6 | only `deps_temp_*` garbage removed | **done** | `ls /home/user/STORYMACHINE/node_modules/.vite` → `deps` only, before and after my own runs. Nothing tracked touched. (Note: the mechanism used, `resetOptimizerCache`, removes `deps` as well as `deps_temp*`; the surviving `deps/` is a regenerated one, not the pre-lane bytes. Derived state, no action needed.) |

---

## 2. The number I reproduced

The lane's headline proof number, reproduced on this machine, same command,
only the config differing:

```
$ git show f79b47ec:vite.config.ts > <session scratch>/unfixed.vite.config.ts
$ node scripts/verify-vite-cache-isolation.mjs \
    --config=<session scratch>/unfixed.vite.config.ts --allow-repo-cache-reset
```

```
[vite-cache] A ... realpath /home/user/STORYMACHINE/node_modules/.vite
[vite-cache] B ... realpath /home/user/STORYMACHINE/node_modules/.vite
[vite-cache] FAIL — both servers resolved ONE physical cache directory
[vite-cache] step 1 — A: 159 responses, 23 hashed dep URLs, 0 bad | B: 159 responses, 23 hashed dep URLs, 0 bad
[vite-cache] B re-optimized … -> A's cache CHANGED (44 -> 46 files, +46/-44)
[vite-cache] A re-optimized … -> B's cache CHANGED (46 -> 46 files, +46/-46)
exit 1                                                        (15.1 s)
```

**+46/−44 and +46/−46, both directions, exactly as reported.** The fixed tree,
same harness, no `--config`: two distinct realpaths, `44 -> 44 (+0/-0)` and
`46 -> 46 (+0/-0)`, 0 × 504, **exit 0** (27.8 s). The guard fails on the
unfixed input before it passes on the fixed one, which is what §3 asks for.

Worth recording from the failing run, because it is stronger evidence than the
lane claimed: every removed/added pair is the *same filename at the same size
with a new mtime* (`deps/@codemirror_autocomplete.js 72395` at
`…193237.372` → `…195597.372`). That is a whole live `deps/` directory
renamed out from under a running server, byte-for-byte re-emitted by a process
that has never heard of it — which is precisely the state in which an
outstanding `?v=<browserHash>` becomes a 504.

Second number reproduced, driven in a real browser:

```
$ PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run verify:surfaces
[verify] serving: Vite dev middleware with NODE_ENV unset (/@vite/client in the markup) …
[verify] vite cache: /tmp/storymachine-vite/wt-vitecache-7d3599e298c6/slot-0 (per-boot pooled directory) — never node_modules/.vite …
[verify] 248/248 assertions passed.          exit 0   (1 m 29 s)
```

**248/248, and the boot log names the cache dir.** Item 2 is real on the wire,
not only in a regex.

---

## 3. What I drove beyond the report

**Can the fixed tree 504?** The brief's scenario: cold cache, two boots from
the *same* worktree through `bootKeylessServer`, a third boot launched while
the first two are still optimizing. Written as `<session scratch>/stress.mjs`,
run from `/home/user/wt-vitecache` after clearing
`/tmp/storymachine-vite/wt-vitecache-7d3599e298c6/*`:

```
[probe] cold: cleared /tmp/storymachine-vite/wt-vitecache-7d3599e298c6
[A] vite cache: …/slot-0   [B] vite cache: …/slot-1   [C] vite cache: …/slot-2
[probe] after first crawls: 477 responses, 69 hashed dep URLs, 0 x 504, 0 bad
[probe] TOTAL 615 responses, 0 x 504/Outdated Optimize Dep, 0 bad
[probe] after shutdown, lock files: (none)
```

Three live optimizers, one worktree, one `node_modules`, all cold, the third
booting mid-optimize, then every held hashed dep URL replayed twice against
every server while all three were up: **615 responses, zero 504s, zero bad,
and every lock released.** I could not make the fixed tree 504. The per-boot
half works; it is only unpinned.

**Lock state machine, driven by hand** (fixture repo, `<session scratch>`):

| case | result |
|---|---|
| holder `kill -TERM` (what CI does) | lock file **survives**; next allocation reclaims slot 0 (dead pid) |
| holder `kill -9` | lock file survives; next allocation reclaims slot 0 |
| unparseable lock (`not json`) | treated as held → allocation moves to slot 1 |
| symlinked checkout vs real path | `repoCacheKey` identical (`wt-vitecache-7d3599e298c6`) — the behaviour the unit test claims to pin is real |

**Shape-guard CPU budget** — `tests/security/fountain-shape-guard-cue-parity.test.ts`,
run alone, nothing else heavy running, box at `up 7 min`, load ~0.6–0.8:

| tree | result | wall |
|---|---|---|
| `/home/user/wt-vitecache` @ `b8adfcfc` | **658/658 pass, 0 fail** | 16.96 s |
| `/home/user/STORYMACHINE` @ `f79b47ec`, clean | **658/658 pass, 0 fail** | 18.95 s |

It **passes on both trees today**, and the lane tree is ~2 s faster than main.
The lane's report has it failing at 20 833 ms (lane) / 21 363 ms (main) on the
same box earlier; today's sandbox is quiet enough that the N=150 shape lands
under the 15 000 ms CPU bound. So: load-dependent, reproduces on unmodified
main when the box is busy, **unrelated to this diff** — confirmed
independently, not inferred: `git diff --stat f79b47ec..b8adfcfc -- server/
src/ tests/` is **empty**, and `node scripts/check-scoring-receipt.mjs
f79b47ec..b8adfcfc` reports "no scoring-path files changed. OK." (exit 0). The
bound belongs to whoever owns it; nothing here.

---

## 4. Findings

### BLOCKING

**1. The Docker builder stage cannot build this tree. `.dockerignore` denies
`scripts/`, and `vite.config.ts:5` now imports from it.**

`.dockerignore` is deny-by-default (`**`) with an explicit allowlist:
`package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`,
`index.html`, `server.ts`, `server/**`, `src/**`, `public/**`. **`scripts/` is
not on it.** The builder stage is `COPY . .` then `RUN npm run build`
(`Dockerfile:13-14`), and both `release.yml:300-303` and `edge.yml:104-107`
build with `context: .`, so `.dockerignore` applies to the published image and
to `:edge` on every main push.

Reproduced by rebuilding the context exactly as the allowlist defines it
(the nine allowlisted roots, `node_modules` symlinked in, no `scripts/`):

```
$ cd <session scratch>/dockerctx && npm run build
[UNRESOLVED_IMPORT] Could not resolve './scripts/lib/vite-cache-dir.mjs' in vite.config.ts
 5 │ import { resolveViteCacheDir } from './scripts/lib/vite-cache-dir.mjs';
   │                                      ────────┬────────  Module not found.
exit 1
```

Diagnosis is exact — copying that **one** file into the same context and
re-running gives `✓ built in 2.66s`, exit 0. Nothing else is missing.

Why no gate caught it: the lane ran `npm run build` in a tree that has
`scripts/`, and `tests/core/docker-context.test.ts` — which exists precisely
to model this policy — checks a **hardcoded** `requiredContextPaths` list
(`:89`) that does not derive from `vite.config.ts`'s imports. It passes 3/3 on
this tree. A test that cannot catch the bug proves nothing (§3).

Fix: allowlist the file in `.dockerignore` (`!scripts/` + `!scripts/lib/**`,
or the single path, with the parent-traversal exception the file's own comment
already explains), **and** add it to `requiredContextPaths` so the next
build-time import into `vite.config.ts` is caught rather than rediscovered in
a release. Better still, derive that list from the config's import graph; see
§5.

### MODERATE

**2. `shutdown()` releases the slot after the *signal*, not after the process
is dead — so the hazard the comment says it closed is only narrowed.**

`browser-verify.mjs:1185` is `serverProc.kill()` (default `graceMs = 0`) and
`:1200` releases immediately after. `kill()` returns as soon as the signal is
queued; the server is still running its `vite.close()` and may still have an
optimizer mid-rename. The comment at `:1190-1199` says releasing early "would
let a second boot in the same process claim slot 0 and start an optimizer in a
directory the dying server has not finished with — a smaller copy of the
defect this whole change exists to close." With `graceMs = 0` that is still
reachable; `4b475582` shrank the window from "before SIGTERM" to "microseconds
after SIGTERM", it did not close it. (With `graceMs > 0` the `sleep` incidentally
covers it, but that is a per-suite teardown choice, not the mechanism.)

Fix, cheap and exact: `await once(serverProc, 'exit')` (bounded, e.g. 5 s) before
calling `releaseViteCacheSlot`, or move the release into the child's `'exit'`
handler. Then the comment is true as written. The lane's own standard for
`4b475582` was "the code was made true rather than the comment softened"; the
same standard applies here.

**3. `process.once('exit', cache.release)` does not fire on the case its
comment names.** `browser-verify.mjs:642-645` says "Released when this gate
process exits, however it exits — a gate killed by CI must not leave a slot
looking held." Node's `'exit'` event does **not** run on SIGTERM/SIGINT with no
handler installed. Measured: after `kill -TERM` on a holder, `slot-0.lock` is
still on disk. The slot does come back — but by a different mechanism the
comment never names (pid-liveness reclaim on the *next* allocation,
`vite-cache-dir.mjs:lockHolderAlive`). Fix: add `SIGINT`/`SIGTERM` handlers, or
rewrite the comment to say pid-reclaim is the backstop and `'exit'` covers only
normal and thrown exits. Copy tells the truth (§2).

**4. One unit assertion cannot fail, and it is the one guarding the realpath
key.** `tests/scripts/vite-cache-dir.test.ts:101`, *"keys off the RESOLVED
path, so a symlinked checkout is one cache, not two"*, asserts
`repoCacheKey(REPO) === repoCacheKey(path.join(REPO, 'src', '..'))`.
`path.join` normalizes `src/..` away *before the call*, so both arguments are
the byte-identical string `/home/user/wt-vitecache` — verified — and the
assertion is `f(x) === f(x)`, true for any deterministic `f`, including one
with `realpathSync` deleted. The test also `mkdtemp`s a `scratch` directory it
never uses. The behaviour is genuinely implemented (I symlinked a real path to
the worktree by hand: both key `wt-vitecache-7d3599e298c6`) — it is simply
unpinned. Fix: symlink a temp path at the target and compare through it, which
is what the `scratch` directory was evidently meant for.

**5. The lock state machine — the whole safety mechanism — has no test in
either direction.** `claimLock` / `lockHolderAlive` decide whether two live
optimizers can land in one directory. Nothing in `npm test` exercises: a live
holder's lock being respected, a dead holder's lock being reclaimed, or an
unreadable lock being treated as held. `allocateViteCacheSlot` is tested only
through three simultaneous allocations in one process (which never reaches the
EEXIST branch's reclaim path at all). §3 asks for both directions. All three
behave correctly today — I drove each by hand (§3) — so this is coverage, not a
bug; it is cheap and it is the part most likely to rot.

### LOW / non-blocking

**6. A stale "six browser suites" count survives in an active gate, and it
contradicts the new eight-suite narrative.** `tests/core/ci-gates-intact.test.ts:416`
is titled *"verify:browser really runs all six browser suites (a shortened
battery is a quiet bypass)"* and pins six names; `verify:a11y` and
`verify:production` are absent, so either could be dropped from
`verify:browser` with that gate green — the exact bypass shape it exists to
prevent. The lane's grep was `grep -rn "seven suites" --include=*.md .`, which
by construction could not see a `.ts` file saying "six". Item 5's spirit ("other
stale count claims") covers it; two added strings fix it.

**7. Slot litter that never self-heals.** An unparseable lock file is treated
as held forever (verified: allocation skipped to slot 1) with no reclaim path,
and a lock left behind by a machine restart whose pid has since been reused
reads as live for the same reason. `/tmp` surviving a sandbox rebuild that
erases worktrees is exactly the shape that produces this. Bounded at 64 slots,
never a correctness violation (the `mkdtemp` overflow branch is unshared), and
correctly traded in the lane report's §5.8 — but §5.8's "they are reused, not
accumulated" is slightly rosier than the two cases above. The lock already
records an `at` timestamp that nothing reads; an age cutoff would close both.

**8. Four post-spawn throw paths leave an orphaned server holding the slot's
directory.** `bootKeylessServer` throws on boot timeout, missing
`server_started`, `assertKeylessAiConfig`, and a `serveModeOf` mismatch
(`:670-686`) without killing `serverProc` and without returning it, so the
caller cannot `shutdown()` it. The gate process then exits, `'exit'` fires,
the lock is released — and the *next* boot claims that slot while the orphan
is still serving out of it. The orphan leak is pre-existing and not this
lane's to fix, but it is a second route into the hazard finding 2 is about, and
it makes the `:1190` comment's "nothing else can be using it" reasoning
narrower than it reads. Worth a sentence in the report at minimum.

### Things I went looking for and did not find

No copied implementation (one resolver, one lock, `server/app.ts` still names
no `cacheDir` and a test pins that). No widened tolerance. No surface dropped.
The harness's two named traps are real and are guarded: the vacuity check at
`verify-vite-cache-isolation.mjs` step 1 (`held.size === 0` → fail, not skip)
and the per-direction `refreshed` re-crawl. The report's honesty about the 504
not reproducing end to end is correct and is the right call. `check-docs`,
`honesty-audit` and the claims-register anchor move all check out on the
committed tree.

---

## 5. What a stronger version would have done

**In scope, and the reason this is REVISE:** treated `vite.config.ts` as a file
with a *build context*, not just a module. The moment it grows its first
relative import, three things move together — the import, `.dockerignore`'s
allowlist, and `tests/core/docker-context.test.ts`'s `requiredContextPaths`.
The strongest version derives the third from the first: read `vite.config.ts`,
walk its relative imports transitively, and assert every one of them survives
the `.dockerignore` policy the test already models faithfully. That is ~15 lines
on top of machinery that already exists in that file, it would have failed on
this diff, and it closes the class rather than this instance. Cheaper fallback,
also in scope: run the builder stage's `npm run build` against a context
assembled from the allowlist — which is what I did, and it took one command.

**In scope, smaller:** make the two source-regex pins in
`tests/scripts/vite-cache-dir.test.ts` behavioural. The wiring assertions match
literal source text (`/allocateViteCacheSlot\(\{ repoRoot: cwd, env: \{ \.\.\.process\.env, \.\.\.\(extraEnv \?\? \{\} \) \} \}\)/`
and friends), so a correct refactor that renames `cwd` reds them while a
semantic regression that keeps the spelling passes. The three-boot probe in §3
runs in 14 s with no browser and asserts the property itself; a trimmed version
of it is a better pin than four regexes.

**Out of scope, correctly left:** wiring `verify:vite-cache` into CI (the
report's §5.2 reasoning is right — one job, one checkout), instrumenting Vite
to make the 504 deterministic (§5.1), and the `npm run dev` + concurrent
`vite build` case in one worktree (§5.7 — genuinely unreachable from
`vite.config.ts`, and correctly written down rather than hidden).

---

## VERDICT: REVISE

1. **Unbreak the Docker builder stage.** Add `scripts/lib/vite-cache-dir.mjs`
   (with its parent traversal) to `.dockerignore`'s allowlist, and add the same
   path to `requiredContextPaths` in `tests/core/docker-context.test.ts` so the
   policy test can see it. Show the fail-then-pass: `npm run build` in a context
   assembled from the allowlist, exit 1 before, exit 0 after. Stronger and
   preferred: derive the required paths from `vite.config.ts`'s relative import
   graph so the next import is caught automatically.
2. **Release the cache slot after the server is actually dead, not after the
   signal.** `await once(serverProc, 'exit')` (bounded) before
   `releaseViteCacheSlot()` in `shutdown()`, so `browser-verify.mjs:1190-1199`
   is true at `graceMs = 0` as well as `graceMs > 0`.
3. **Make `browser-verify.mjs:642-644`'s comment true, or make the code match
   it.** `process.once('exit', …)` does not run on SIGTERM/SIGINT — measured, the
   lock file survives. Either install signal handlers or say plainly that
   pid-liveness reclaim in `lockHolderAlive` is the backstop for a killed gate.
4. **Fix the assertion that cannot fail.**
   `tests/scripts/vite-cache-dir.test.ts:101` compares `repoCacheKey` against
   itself (`path.join(REPO,'src','..')` is the byte-identical string). Use a
   real symlink — the `scratch` directory that test already creates and
   discards — so the `realpathSync` key is actually pinned.
5. **Pin the lock state machine in both directions.** Three cases, all of which
   I drove by hand and all of which pass today: a live holder's lock is
   respected, a dead holder's lock is reclaimed, an unparseable lock is treated
   as held.

Non-blocking, worth folding in while the branch is open: correct
`tests/core/ci-gates-intact.test.ts:416`'s "all six browser suites" to eight and
add `verify:a11y` / `verify:production` to the names it pins (finding 6); and
note findings 7 and 8 in the lane report's §5 so the boundaries are recorded
rather than implied.

Re-review on the new diff will re-check these five items only.

---

# Round 2 (`fe92429f`) — re-check of the five items

Reviewed object: `fe92429f` on `lane/vite-cache-isolation` (code lands at
`836f4727`); round-2 diff `git diff b8adfcfc..fe92429f`, 13 files,
+1200/−49. Warm re-check by the same reviewer, scoped to the five revision
items and the non-blocking count, per §6. The browser battery and the full
`npm test` were deliberately not re-run.

## Per-item verdicts

| # | round-1 item | verdict | what I checked, not what the report says |
|---|---|---|---|
| 1 | Docker builder stage | **FIXED — better than the fix I proposed** | Rebuilt the assembled context myself, both ways. Without the module: `[UNRESOLVED_IMPORT] Could not resolve './vite-cache-dir.mjs' in vite.config.ts`, **exit 1**. Same context plus that one file: **exit 0, `✓ built in 1.28s`**. `scripts/` appears in no active `.dockerignore` rule, so it stays denied by `**`. |
| 2 | release after the child is dead | **FIXED** | `shutdown()` now `await waitForChildExit(serverProc, SERVER_EXIT_WAIT_MS)` inside the try, release after it, outside the try; `waitForChildExit` short-circuits on `exitCode`/`signalCode`, `unref`s its timer and clears it on exit, and returns `'timeout'` rather than hanging. Ordering pinned by index comparison in `tests/scripts/vite-cache-dir.test.ts`. |
| 3 | the exit-hook comment | **FIXED, and measured by me** | At `b8adfcfc` a `kill -TERM`'d holder left `slot-0.lock`. On this tree, same holder, same signal: **no lock file, holder exits 143**. The hook now lives in `vite-cache-dir.mjs`, installed once and only after a slot is actually taken, and the header names pid-liveness reclaim as the SIGKILL/power-cut backstop rather than claiming `'exit'` covers it. |
| 4 | the assertion that could not fail | **FIXED** | Real `symlinkSync` in a temp dir; asserts the two paths are different strings *and* different basenames before comparing keys, checks the property through `resolveViteCacheDir` as well as `repoCacheKey`, and adds a third tree that must key differently. It is no longer `f(x) === f(x)`. |
| 5 | the lock state machine | **PINNED, with real mutants** | Live / dead / unparseable, each asserted against the module **and** against a mutant with exactly that condition inverted, where the mutant must produce the *opposite* slot. The mutants are genuine inversions (`if (lockHolderAlive(…)) return false` → `if (false) …`; the `EPERM` result → `true`; the JSON `catch { return true }` → `false`), and `loadMutant` asserts its anchor still exists, so a rename cannot turn the mutation into a silent no-op. `deadPid()` uses an already-exited child rather than a guessed number. 15 → **21 assertions**. |
| — | non-blocking: stale "six suites" | **FIXED** | `ci-gates-intact.test.ts` now says eight, pins all eight names, **and** asserts the count of `verify:` tokens in the battery, so a ninth suite added without being pinned reopens nothing quietly. |

## Gates I ran on this tree

```
npm run lint                                        exit 0
tests/scripts/vite-cache-dir.test.ts                21/21
tests/core/docker-context.test.ts                    7/7
tests/core/ci-gates-intact.test.ts                  30/30
tests/core/brain-coverage.test.ts                    7/7
npm run verify:vite-cache        +0/-0 both ways, 0 x 504, exit 0
npm run honesty-audit      465 files, 115 rows, clean, exit 0
npm run check-brain        111 notes, 423 links, fresh, exit 0
npm run check-no-console   307 files under server/, exit 0
```

## Judging the move to the repository root

I asked what the move breaks or hides, since the lane's own round-1 argument
cited `distStaleness`'s root-level pattern pickup as a reason to keep things
out of the root.

- **The `!scripts/` claim is real, not a modelling artifact.** Moby matches a
  path *or any parent* when deciding exclusion — which is why this policy's
  own `!server/` + `!server/**` pair works — so a `!scripts/` traversal
  exception genuinely un-denies the subtree. The lane pinned that as an
  assertion rather than a comment: if the semantics ever change, the note goes
  red instead of stale. Getting back to one file would need an order-dependent
  re-deny/re-allow sequence. The move is the better call.
- **`tsc --noEmit`** has no `include` and `allowJs: true`, so the root `.mjs`
  is type-checked exactly as it was under `scripts/lib/` — lint exit 0.
- **`check-no-console`** is scoped to `server/**` and never saw the file in
  either location; it contains no `console.*` anyway.
- **`honesty-audit`** reports the same 465 files as round 1 — moved, not added.
- **`distStaleness`** does *not* pick it up: `DIST_BUILD_CONFIG_RE` requires the
  literal `vite.config.`, and `vite-cache-dir.mjs` does not match. The round-1
  argument is not contradicted — it was about a *high-churn cache directory*
  becoming a build input, and a static module is not that. See observation (b).
- **No live reference to the old path survives.** The four remaining mentions
  are narrative (two comments in the context test, one modelling assertion, one
  brain-note sentence) and are correct as history.

A build-config helper beside the `vite.config.ts` it configures, with the
reason written into the `.dockerignore` line that admits it, is an acceptable
root-level file.

## Observations (non-blocking, no action required to merge)

(a) **The new `shutdown()` comment is off by one.** It names four `graceMs = 0`
suites "(`verify:ui-polish`, `verify:local-safety-net`, `verify:command-palette`,
and `verify:production`'s dev instance)". Three of those are right; the fourth
is not — `verify-production-build.mjs:505` tears its dev instance down inline
(`kill('SIGTERM')` / sleep / `SIGKILL`) and never calls `shutdown()`, so that
boot gets neither the new wait nor the release and holds its slot until the gate
exits. Harmless (the prod boot simply takes the next slot, and both are freed at
exit), but it is the same shape as the two comments this round corrected.

(b) **A build-time import that `distStaleness` does not count.**
`vite.config.ts` imports `vite-cache-dir.mjs`, and `DIST_BUILD_CONFIG_RE` does
not match it, so editing that module does not mark `dist/` stale. Benign today
— it only chooses `cacheDir` and cannot change `dist/` bytes — but the
`buildTimeImports` walker this round added to `tests/core/docker-context.test.ts`
is exactly the derivation `DIST_BUILD_INPUTS` would need to close it.

(c) **The signal handler is installed once and never re-installed.** After it
fires it removes itself, so a gate with its own *non-exiting* SIGTERM handler
that allocates a slot after the first signal leaves that lock in place on a
second signal — measured. No residual hazard: the process is alive and
legitimately holding the slot, and pid-liveness reclaim covers it once it dies.

## VERDICT: MERGE

All five revision items are fixed, and three of them are fixed with evidence
stronger than the list asked for: the context requirement is now *derived* from
the config's import graph with the walker itself pinned against a fixture and a
fail-direction test (3/3 → 7/7); the lock state machine is pinned by mutation
rather than by assertion alone (15 → 21); and the SIGTERM behaviour is driven
end to end in both the plain and the own-handler variant instead of described.
The non-blocking count item was fixed with a count assertion on top of the
membership. Nothing in the round-2 diff touches the scoring path. Observations
(a)–(c) are for the lane report or a later lane, not for another round.
