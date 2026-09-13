# Review — `lane/vitecache-notes` @ `c33cbf13`, round 1

Reviewed object: `c33cbf1345202b9f15314afdac48065fc2b53373` on
`lane/vitecache-notes`, base `main` at `996e27a0`, two commits (code at
`e5c42d7f`, lane report at `c33cbf13`), 7 files, +632/−62. Worktree
`/home/user/wt-notes`. Reviewer did not build the change. Procedure:
`docs/LANE_STANDARD.md` §6. Scratch paths below are written
`<session scratch>`.

**VERDICT: REVISE** — the three code fixes are each correct, each shown to
fail first, and item 2 removes a real duplicate implementation. What sends
this back is that item 1's recorded rationale is false: the new comment (in
two files) and the lane report state a concrete cost for the old inline
teardown — "section 6's production boot always took a SECOND slot instead of
reusing this one's warm cache" — and that boot happens BEFORE the dev
instance, never calls `allocateViteCacheSlot()`, and runs a server that never
starts Vite at all. The fix stays; the reason written beside it has to be the
true one. Three smaller items are folded into the list.

---

## 1. The brief, item by item

| # | brief item | verdict | evidence |
|---|---|---|---|
| 1 | route `verify-production-build.mjs:505`'s inline teardown through `shutdown()`; pin the caller count | **done, with a false rationale** | `scripts/verify-production-build.mjs:517` is now `if (devProc) await shutdown({ serverProc: devProc });` and the inline `kill('SIGTERM')`/`sleep(400)`/`SIGKILL` is gone. The count pin (`tests/scripts/vite-cache-dir.test.ts:544-604`) asserts 4 and names the four files. But the stated cost of the old path is not real — finding 1. Two further unstated consequences — findings 2 and 3. |
| 1a | does the `:505` boot actually allocate a slot? | **premise confirmed** | `scripts/verify-production-build.mjs:430` boots through `bootKeylessServer()`, which allocates at `scripts/lib/browser-verify.mjs:660` and attaches `releaseViteCacheSlot` at `:683`. So the slot is real and the inline kill genuinely never released it. The lane's premise check is right; only the consequence it draws is wrong. |
| 1b | is the `browser-verify.mjs` exclusion from the scan justified? | **yes, and necessary** | `scripts/lib/browser-verify.mjs:680` really does carry `` `shutdown({ serverProc })` frees the slot… `` in prose, and that string has no `graceMs`, so without the exclusion the scan reports 5 and names the definition file as a caller. (The definition at `:1227` would not match — `[^}]*\}\)` cannot cross `} = {})` — so the comment at `:680` is the whole reason the exclusion is needed, which is what the lane report §3 says.) |
| 1c | run the test and nudge the count | **done, it fails** | See §2. |
| 2 | one `buildTimeImports` walker, shared by `distStaleness()` and the docker-context test | **done** | `scripts/lib/build-time-imports.mjs` is the only definition in the tree (`grep -rn 'function buildTimeImports'` → one hit); `tests/core/docker-context.test.ts:6` imports it, and the local copy is deleted in the diff, not left beside it. `scripts/lib/browser-verify.mjs:501` feeds the walker's output into `distStaleness()`'s input list. |
| 2a | relative imports only — `node_modules` must not become build inputs | **confirmed** | `RELATIVE_IMPORT_RE` captures `['"](\.[^'"]*)['"]`, so a bare specifier cannot match. Live output on this tree: `buildTimeImports(cwd, 'vite.config.ts')` → `["vite-cache-dir.mjs"]`, nothing else, even though the config imports `@tailwindcss/vite`, `@vitejs/plugin-react`, `path` and `vite`. |
| 2b | reproduce the fail-first | **reproduced** | See §2. |
| 2c | does `ensureBuiltDist` rebuild when it should and NOT when a non-input changes? | **both directions confirmed** | `ensureBuiltDist` (`browser-verify.mjs:535,543-544`) takes its decision straight from `distStaleness()`, so the new input is wired into the rebuild. Negative direction, measured: future-dating `README.md`, `docs/LANE_STANDARD.md`, or `scripts/lib/browser-verify.mjs` itself each leaves `distStaleness().reason` at `null`. The walker widened the input set by exactly one file, not by a class. |
| 3 | re-install the signal handler per signal | **done** | `vite-cache-dir.mjs:264-298`: `installedSignalHandlers` (a `Map`, `:269`) replaces the process-wide boolean, the handler deletes its own entry at `:287`, and `installExitHooks()` runs on every `allocateViteCacheSlot()` (`:347`). The `'exit'` listener keeps its own one-shot flag, correctly — `'exit'` cannot fire twice. |
| 3a | re-raise guard still only when nothing else listens; no double-release; no releasing another holder's slot | **all three hold** | The guard is `if (process.listenerCount(signal) === 0) process.kill(process.pid, signal)` (`:293`), unchanged from base and still after `process.off`. Double-release is impossible: each `release` closure carries its own `released` flag and `heldSlots.delete(release)` (`:341-345`), so the stale closure left over from a fired handler is inert. Releasing another holder's slot is impossible for the same reason — the closure unlinks the `lockPath` it captured, and a re-allocation of the same slot index gets a fresh closure over a fresh lock. |
| 3b | is per-signal right when one process holds two slots? | **yes** | The handler calls `releaseHeldSlots()`, which iterates every slot this process holds, so one listener per signal already covers N slots; per-slot handlers would be N identical listeners racing to do the same global release, plus a `MaxListeners` warning. Measured in-process: three consecutive `allocateViteCacheSlot()` calls (slots 0, 1, 2) leave `process.listenerCount('SIGTERM') === 1`, `SIGINT === 1`, `exit === 1`. |
| 3c | reproduce the fail-first timing | **reproduced** | See §2. |

---

## 2. Reproduced numbers

All run in `/home/user/wt-notes` with `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium`
exported, one at a time.

**The lane's 25/25** —

```
$ node --experimental-strip-types tests/scripts/vite-cache-dir.test.ts
# tests 25 / # pass 25 / # fail 0 / # duration_ms 350.62157   (real 0m0.468s)
```

**The count pin can fail** (nudge: one throwaway `scripts/__review-count-probe.mjs`
containing `await shutdown({ serverProc });`, removed again afterwards) —

```
not ok 1 - is exactly the four files the comment names — a count that can fail
  expected 4 graceMs=0 shutdown() callers under scripts/, found 5:
  ["scripts/__review-count-probe.mjs","scripts/verify-e4-local-safety-net.mjs",
   "scripts/verify-e5-command-palette.mjs","scripts/verify-production-build.mjs",
   "scripts/verify-ui-polish-affordances.mjs"]
# tests 25 / # pass 24 / # fail 1
```

**Item 2's fail-first, same input, two versions of one file** — `dist/` built
and current, then `touch -d "+2 minutes" vite-cache-dir.mjs`:

```
$ git checkout 996e27a0 -- scripts/lib/browser-verify.mjs
$ node -e "import('./scripts/lib/browser-verify.mjs').then(({distStaleness})=>console.log(distStaleness({repo:process.cwd()}).reason))"
null                                              # BEFORE: "current", and wrong
$ git checkout HEAD -- scripts/lib/browser-verify.mjs
$ node -e "…same line…"
dist/index.html is older than vite-cache-dir.mjs (2026-09-13T04:35:38.147Z < 2026-09-13T04:49:39.254Z)
```

Restoring the original mtime returns it to `null`, so the new input is a real
mtime comparison and not a permanent "stale".

**Item 3's fail-first timing** —

```
$ git checkout 996e27a0 -- vite-cache-dir.mjs
$ node --experimental-strip-types tests/scripts/vite-cache-dir.test.ts
not ok 5 - re-installs a signal handler that already fired once, …
  error: 'timed out waiting for condition'
# tests 25 / # pass 24 / # fail 1                 (real 0m10.529s)
```

against `real 0m0.468s` for the whole 25-test file with the fix — the lane's
"10 s before, ~100 ms after", confirmed at file granularity.

**The suite this lane's only production-code edit lives in, driven once** —

```
$ npm run verify:production
[verify] 71/71 assertions passed.      build: 2586ms      (real 0m17.590s)
```

The dev instance's section-5 teardown now goes through `shutdown()` in a real
run, the byte-identity check between dev and production still passes, and
teardown does not hang. `tests/core/docker-context.test.ts` 7/7 and
`tests/scripts/smoke-gate-serve-mode.test.ts` 10/10 (the `distStaleness`
consumers) also reproduce. Full `npm test` not re-run — the lane ran it
(13811 / 0 fail) and §4 says a review reproduces one number rather than the
battery.

---

## 3. Findings

### Finding 1 (blocking) — the recorded cost of the old inline teardown is not real

`scripts/lib/browser-verify.mjs:1259-1263` and
`scripts/verify-production-build.mjs:509-512` both now state, as fact, that
the un-released slot "meant that suite's own second, PRODUCTION boot always
took a SECOND slot instead of reusing this one's warm cache." The lane report
§1 repeats it and leans on it to call the defect "real, if low-severity."
Three independent reasons it is false, all in the file the comment is written
in:

1. **Order.** There is no second production boot. `prodProc` is booted once,
   at `scripts/verify-production-build.mjs:243` (section 1), and is still the
   same process at `:669`. Section 6 reuses it; nothing between the dev
   teardown at `:517` and the final `shutdown()` at `:669` spawns a server —
   verified by scanning that range for `bootKeylessServer(`, `bootProduction(`
   and `spawn(`: no hits. The production boot is BEFORE the dev boot, so a
   slot released at `:517` could not have been reused by it under any
   ordering.
2. **It never allocates a slot.** `bootProduction()` (`:210-237`) spawns
   `tsx server.ts` directly and never calls `allocateViteCacheSlot()` — the
   file's own header says so at `:23-31` ("WHY IT IS NOT
   `bootKeylessServer()`"). Only the dev instance goes through the helper.
3. **It never uses a Vite cache.** That boot sets `NODE_ENV: 'production'`
   (`:219`), and `server/app.ts:279` only imports Vite and creates the
   middleware when `NODE_ENV !== 'production'`. A warm optimizer cache is
   worth nothing to a server that never starts an optimizer.

This is the same class of defect the round-2 observation this lane answers was
about: a comment whose number happened to read right. Replacing it with a
second claim that does not survive reading the file is the thing to fix before
merge, not after. The true benefit is smaller and worth stating plainly: the
slot is now freed at the end of section 5 rather than at gate-process exit, so
a CONCURRENT gate (another worktree, or a second gate against this repo) gets
slot N back for the whole of section 6 — the Chromium journey, about 14 s of a
17.6 s run — instead of being pushed to slot N+1; and `shutdown()` frees it
after `waitForChildExit` rather than after a fixed 400 ms sleep, which is the
release-ordering property the whole round-1 lane exists for. Both are
defensible on their own. Neither needs the invented one.

### Finding 2 (should fix, or state) — the port to `shutdown()` silently drops SIGKILL escalation

Old path: `SIGTERM` → `sleep(400)` → `SIGKILL` if `!devProc.killed`. New path,
at the `graceMs = 0` default: a single `serverProc.kill()` (SIGTERM), then
`waitForChildExit(proc, 5000)` and nothing else — a dev server that ignores
SIGTERM is now waited on for 5 s and then left running, where before it was
killed at 400 ms. Defensible (the other three `graceMs = 0` callers tear down
the same kind of dev server the same way, and the 5 s wait is the safer half
of the trade), but the lane report describes the old sequence only as
"approximated by luck" and does not mention that anything was given up. Note
also the tension worth naming out loud: `graceMs: 400` would have been the
byte-faithful port, and choosing `graceMs = 0` is what made the comment's
"four" literally true. Say which was chosen and why, in the report and in the
comment at `:505`.

### Finding 3 (small) — "all eight call sites" is itself a hand count, and it is off

`tests/scripts/vite-cache-dir.test.ts:573-575` justifies the `[^}]*` scan with
"every call site is a single-line, unnested object literal today (verified by
hand across all eight call sites)". There are **eleven** `shutdown({ … })`
call sites, in eight files (`smoke-p0-live-flow.mjs` has three,
`verify-production-build.mjs` two). The property asserted is still true of all
eleven; only the count is wrong. In a lane whose subject is a hand-counted
number in a comment, this one should say "eight files, eleven call sites".

### Finding 4 (small) — the "no duplicate listeners" claim is true but unpinned

`vite-cache-dir.mjs:250-256` promises "no duplicate listeners, no
MaxListeners warning" from the per-signal map. I measured it and it holds
(three allocations → exactly one SIGTERM listener), but no test asserts it: the
new test drives lock files across two signals only. A three-line in-process
case — allocate twice, `assert.equal(process.listenerCount('SIGTERM'), 1)`,
release — would pin the half of the mechanism that the signal test cannot
reach, and would red immediately if the `has(signal)` guard at `:283` were
ever dropped.

### Observation (no action) — releasing on a caught, non-exiting signal

The handler frees the lock and the process may keep running. In the
`own-handler` case the lane now makes first-class, that process's Vite is
still pointed at `slot-N` while another process is free to claim it — the
sharing hazard this whole lineage exists to close, reachable by a narrow path.
Pre-existing (base behaves identically for the first signal), out of this
brief's scope, and the alternative (not releasing on a caught signal) is worse
for the ordinary case. Recording it so the next lane in this file finds it
written down.

---

## 4. The stronger version

The strongest version of this lane is the one that is already here for items 2
and 3, plus an item 1 whose comment says what actually improved. Item 2 is
exemplary: it removed a second implementation rather than teaching two lists
the same fact, kept the docker-context fixtures pointed at the shared module,
and its fail-first is a real before/after on one unchanged input. Item 3
picked the smaller of the two available fixes (per-signal tracking over
per-slot handlers) and picked correctly, and its test spawns a real process
and sends real signals instead of mocking `process.on`. Item 1's code is right
too. What a stronger item 1 would have done is check its own consequence the
way the lane checked its own premise — the premise check ("does `:430`
actually allocate a slot?") is careful and correct, and then the sentence
about what that cost the suite was written without reading the forty lines
below it. A cheaper alternative was available and would have been strictly
better: state only that the slot is held for the remainder of the gate process
and that this matters to concurrent gates, which is true, which is what the
pool exists for, and which needs no claim about this suite's own second boot.
Findings 2 through 4 are all in scope and small; none of them would justify a
round on its own.

---

**VERDICT: REVISE**

1. **Blocking.** Remove the false claim that the un-released slot cost the
   suite's own production boot a warm cache, from
   `scripts/lib/browser-verify.mjs:1259-1263`,
   `scripts/verify-production-build.mjs:509-512`, and the lane report §1.
   Replace it with what is true: the slot was held until gate-process exit,
   which costs a CONCURRENT gate a pooled slot for the length of section 6,
   and `shutdown()` releases after the child is confirmed dead rather than
   after a fixed sleep. The production instance boots first, via
   `bootProduction()` (`:243`, `:210-237`), never allocates a slot, and runs
   with `NODE_ENV=production`, where `server/app.ts:279` never starts Vite.
2. State the SIGKILL-escalation change in the comment at
   `scripts/verify-production-build.mjs:505` and in the report: the old inline
   path escalated to SIGKILL at 400 ms, the `graceMs = 0` path does not
   escalate at all. Keep `graceMs = 0` (it matches the other three dev-server
   teardowns) or use `graceMs: 400` and correct the count comment — either is
   fine, but the choice has to be visible.
3. Correct "all eight call sites" in `tests/scripts/vite-cache-dir.test.ts:575`
   to "eight files, eleven call sites" (or drop the count and keep the
   property).
4. Add the in-process listener-count assertion that pins "no duplicate
   listeners" for `installedSignalHandlers` — two allocations, one SIGTERM
   listener.

Items 2, 3 and 4 are all small enough to land in the same revision as item 1.
Re-running the full `npm test` is not needed for a revision at this size;
`tests/scripts/vite-cache-dir.test.ts` plus one `npm run verify:production`
covers everything the list touches.

---

# Round 2 (`2d85079a`)

Re-check of this reviewer's own four items against
`git diff c33cbf13..2d85079a` (code at `a28839b4`, report tip at `2d85079a`),
warm context, no battery. Same worktree, same procedure
(`docs/LANE_STANDARD.md` §6).

| # | round-1 item | disposition | verified |
|---|---|---|---|
| 1 | blocking — remove the false claim that the un-released slot cost the suite's OWN production boot a warm cache; state the true benefit | **fixed** | The sentence is gone from `scripts/lib/browser-verify.mjs:1263-1277` and `scripts/verify-production-build.mjs:505-521`, and the lane report §1 keeps the old paragraph with a "Corrected in round 2" blockquote naming it false rather than quietly rewriting history. `grep -rn "took a SECOND slot"` over `*.mjs` and `*.md` now hits only the three audit documents that quote it in order to correct it — no live comment repeats it. The replacement text is TRUE against the file: production boots first at `scripts/verify-production-build.mjs:243` (section 1), `bootProduction()` at `:210-237` spawns `tsx` directly with no `allocateViteCacheSlot()` call, and it sets `NODE_ENV: 'production'` at `:219`, which `server/app.ts:279` gates Vite creation on. The concurrent-gate benefit and the wait-for-death ordering are both real. One misdirected pointer inside the correction — see the note below; it is not a claim about behavior. |
| 2 | state the SIGKILL-escalation trade-off, or restore it | **decided and written** | `scripts/verify-production-build.mjs:523-536` now names both halves: `graceMs = 0` sends one SIGTERM and waits up to `SERVER_EXIT_WAIT_MS` (5000 ms) without escalating, where the old inline path force-killed at 400 ms; and it says why `graceMs = 0` was chosen over `graceMs: 400` (one implementation of "how a dev boot dies", shared with the other three callers, and the thing that makes the "four callers" comment literally true). The report §4 row says the same. The choice is now visible, which is what the item asked for. |
| 3 | correct "all eight call sites", or drop the count | **fixed, and derived instead of re-typed** | The doc comment above `zeroGraceShutdownCallers()` no longer carries a hand count; the file/call-site split is explained (a file with two call sites counts once for the "four callers" pin) and a new test at `tests/scripts/vite-cache-dir.test.ts:695-712` computes both numbers from `allShutdownCallSites()` — the same walk the scan uses — and asserts 11 sites in 8 files, plus the single-line property the `[^}]*` regex actually depends on, per site. That matches my own round-1 count. This is the stronger version of the item: the number that rotted is now produced, not stated. |
| 4 | pin "no duplicate listeners" | **fixed, two directions** | `tests/scripts/vite-cache-dir.test.ts:508-565` allocates twice against the statically imported real module (the count must not grow) and twice against a mutant built by `loadMutant()` with the `has(signal)` guard replaced (the count must grow by exactly 2). `loadMutant()` asserts its anchor text is still present before mutating, so the fail-direction cannot silently measure nothing, and the cleanup removes by identity, for all three signals, exactly the listeners the mutant added. |

## Reproduced, round 2

```
$ node --experimental-strip-types tests/scripts/vite-cache-dir.test.ts
# tests 27 / # pass 27 / # fail 0            (real 0m0.515s)
```

The lane's finding-4 fail-first, reproduced by breaking the REAL module's
guard rather than trusting the mutant arm alone:

```
$ sed -i 's|if (installedSignalHandlers.has(signal)) continue;|if (false) continue;|' vite-cache-dir.mjs
$ node --experimental-strip-types tests/scripts/vite-cache-dir.test.ts
not ok 6 - two allocations attach exactly one SIGTERM listener — …
        14 !== 12
# tests 27 / # pass 26 / # fail 1
```

`14 !== 12` exactly as the lane reported, and restoring the file returns it to
27/27. `npm run verify:production` was driven at round 1 (71/71, 17.59 s) and
round 2 touches no runtime path in that suite beyond comment text, so it was
not re-run.

## Note (non-blocking, fix on merge or leave)

`scripts/lib/browser-verify.mjs:1267-1268` reads "never calls
`allocateViteCacheSlot()` at all (that function spawns `tsx` directly — see
this file's own header, 'WHY IT IS NOT bootKeylessServer()')". Two small
slips, neither a claim about behavior: "that function" reads as
`allocateViteCacheSlot()` where `bootProduction()` is meant, and the header it
points to lives in `scripts/verify-production-build.mjs:23`, not in
`browser-verify.mjs`. The same sentence in the lane report §1 and at
`verify-production-build.mjs:509-512` is correct, because there "the file" IS
that file. A four-word edit ("see `verify-production-build.mjs`'s own header")
closes it; it does not hold the merge.

**VERDICT: MERGE**
