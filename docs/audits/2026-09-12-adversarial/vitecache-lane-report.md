# Lane report — `lane/vite-cache-isolation`

- **Worktree:** `/home/user/wt-vitecache` (its `node_modules` is a symlink to
  `/home/user/STORYMACHINE/node_modules`, which is the hazard this lane fixes
  and is left in place)
- **Branch:** `lane/vite-cache-isolation`, from `main` at `f79b47ec`
- **Tip:** `4beee016c2bfbf1c8f7ba936d3dd841da98bbf88` — the tree every gate in
  §6 was confirmed against. Exactly one commit follows it on this branch and it
  changes only these lines, because a report cannot contain the hash of the
  commit that contains the report.
- **Rounds:** round 1 reviewed at `b8adfcfc` (REVISE, `vitecache-review.md`
  committed at `ecaf6d9b`); round 2 is §6.

```
$ git log --oneline main..HEAD
4beee016 docs(audit): round 2 of the vite-cache-isolation lane report
836f4727 fix(vite): round 2 — unbreak the Docker builder stage, and make the lock's promises true
ecaf6d9b docs(audit): vitecache-review round 1 (b8adfcfc) — REVISE
b8adfcfc docs(audit): the lane report's own Tip line and log
4b475582 docs(audit): the vite-cache-isolation lane report; release the cache slot after the kill
bcd5de35 docs(brain): a Gate note for the Vite cache isolation harness
d88cc1da fix(vite): one dependency-optimizer cache per worktree and per boot
```

---

## 1. What the thing IS

`server/app.ts:279-285` picks one of two front ends. With `NODE_ENV` unset it
mounts **Vite dev middleware** — `createViteServer({ server: { middlewareMode:
true }, appType: 'spa' })`, with no `root`, no `configFile` and (until this
lane) no `cacheDir`. Vite therefore resolved all three from `process.cwd()`,
and its default `cacheDir` is `<root>/node_modules/.vite`.

Every lane in this repository works in a `git worktree` whose `node_modules`
is a **symlink** to the main checkout's — that is how a worktree gets a
dependency tree, and every lane brief instructs it. So `node_modules/.vite`
was never per-worktree. Two path strings, one physical directory:

```
/tmp/.../worktree-a/node_modules/.vite  ->  /home/user/STORYMACHINE/node_modules/.vite
/tmp/.../worktree-b/node_modules/.vite  ->  /home/user/STORYMACHINE/node_modules/.vite
```

Vite's dependency optimizer does not treat that directory as append-only. It
scans, writes `deps_temp_<hash>/`, and **renames it onto `deps/`** — removing
what was there. Two optimizers doing that concurrently means one server's live
cache is deleted and rewritten by a process that has never heard of it, and any
request carrying a `?v=<browserHash>` the surviving metadata no longer
recognises gets Vite's `504 Outdated Optimize Dep`.

That is not a hypothesis. It took a browser gate down on 2026-09-12 —
`docs/audits/2026-09-12-adversarial/p0flow-lane-report.md:94` and `:217`,
`p0flow-review.md:235` ("a per-worktree `VITE_CACHE_DIR` would fix it and is
out of scope"). The receipt outlived the incident: `node_modules/.vite` held
**nine abandoned `deps_temp_*` directories**, one per optimizer run that was
interrupted by another process renaming over it.

### Where the brief's premise was a hypothesis, and what it actually is

The brief listed the suites that still boot dev middleware and said to confirm
the list. Confirmed by reading every `bootKeylessServer` call site and every
`launchChromium` call:

| script | browser suite? | front end it boots |
|---|---|---|
| `verify-p2-p3-surfaces.mjs` | yes | Vite dev middleware |
| `verify-focus-traps.mjs` | yes | Vite dev middleware |
| `verify-ui-polish-affordances.mjs` | yes | Vite dev middleware |
| `verify-e4-local-safety-net.mjs` | yes | Vite dev middleware |
| `verify-e5-command-palette.mjs` | yes | Vite dev middleware |
| `verify-a11y.mjs` | yes | Vite dev middleware |
| `verify-production-build.mjs` | yes | **both** — a dev instance via `bootKeylessServer` and a production instance it spawns itself (`:218-225`) |
| `smoke-p0-live-flow.mjs` | yes | the built `dist/`, in both of its boots |

Two corrections to the brief:

1. **`verify-corpus-layout.mjs` is not a browser suite at all.** It contains no
   `launchChromium`, no `bootKeylessServer` and no server boot — it is a corpus
   manifest pre-flight check for the P1 measurement runbook. It cannot have
   been affected by this defect and is not touched by this lane. (Same for
   `smoke-llm-providers.mjs`.)
2. **`verify-production-build.mjs` was missing from the brief's list**, and it
   does boot dev middleware — `:430`, `bootKeylessServer` on its default
   `serve`. So the true count of dev-middleware boot sites is **seven**: six
   suites outright plus the dev half of `verify:production`.

The eight browser suites are therefore the eight in `npm run verify:browser`,
and they do not all drive the same front end. `ARCHITECTURE.md:481` said "The
seven suites are …" and listed seven; it was wrong in the count, wrong in the
membership, and silent on the front-end split.

---

## 2. What was built

### Item 1 — one cache per repository path (`vite.config.ts`, `vite-cache-dir.mjs`)

*(Round 1 put that module at `scripts/lib/vite-cache-dir.mjs`. It moved to the
repository root in round 2 — see §6, item 1, for the measurement that forced
it. Everything else in this section stands.)*

`vite.config.ts` now sets

```ts
cacheDir: resolveViteCacheDir({ repoRoot: __dirname }),
```

`resolveViteCacheDir` returns `VITE_CACHE_DIR` when it is set to a non-blank
string (resolved against the repo root, as Vite resolves a relative
`cacheDir`), and otherwise
`<os.tmpdir()>/storymachine-vite/<basename>-<sha256(realpath)[0:12]>/default`.

**Why `os.tmpdir()` and not `<repo>/.vite-cache`** (the brief offered both; the
full argument is in `vite-cache-dir.mjs`'s header):

1. An in-repo cache has to be `.gitignore`d, and an ignore rule is only as
   good as the next person who copies the tree without it. A directory outside
   the repository cannot appear in `git status` or in a diff.
2. `scripts/lib/browser-verify.mjs`'s `distStaleness()` decides whether `dist/`
   is stale by walking build inputs — and it picks up root-level config **by
   pattern** (`DIST_BUILD_CONFIG_RE`), not by list. A high-churn directory at
   the repository root is one regex edit away from making every browser gate
   rebuild `dist/` on every run. Outside the repository that is impossible, and
   `tests/scripts/vite-cache-dir.test.ts` pins the property rather than the
   regex.
3. CLAUDE.md's OneDrive hazard: direct writes into the mounted repo truncate
   files and inflate diffs with CRLF. The optimizer writes hundreds of files
   per run.

The cost is that a reboot or a tmp sweep loses the cache and Vite re-optimizes
once. A dependency-optimizer cache is derived state; losing a gate run is not.
No `.gitignore` change was needed, and none was made.

**`vite build` and the dev middleware agree by construction**, because both
read this one config: `server/app.ts` passes no `cacheDir` (a test asserts it
still does not, so a second copy of the decision cannot appear at the call
site), and `vite build` is the same config object.

**`ensureBuiltDist` / `DIST_BUILD_INPUTS` do not treat the cache as a build
input** — the cache is not under the repository at all, and
`tests/scripts/vite-cache-dir.test.ts` asserts both that property and that
`distStaleness()` never names a `.vite` path as its newest input.

### Item 2 — one cache per boot (`scripts/lib/browser-verify.mjs`)

A repository-path key separates two worktrees. It cannot separate two boots of
the *same* worktree, which the brief correctly calls out. `bootKeylessServer`
now calls `allocateViteCacheSlot({ repoRoot: cwd, env: { ...process.env,
...extraEnv } })` before it boots — before `ensureBuiltDist`, too, so a gate
that has to rebuild `dist/` optimizes into the same isolated directory — and
puts the result in the server's environment as `VITE_CACHE_DIR`.

Allocation is a **pooled exclusive lock**, not a fresh temp directory per boot:

- `open(<base>/slot-N.lock, 'wx')` is one atomic filesystem operation, so two
  processes racing for a slot cannot both win.
- A lock whose recorded pid is gone (`process.kill(pid, 0)` throws `ESRCH`) is
  reclaimed; a lock that cannot be read or parsed is treated as **held**. Every
  ambiguous answer costs one extra slot, never a shared directory.
- Slot 0 is free whenever nothing else is running, so the ordinary
  one-gate-at-a-time run keeps a **warm** cache instead of re-optimizing every
  dependency on every gate. A per-boot `mkdtemp` would have been simpler and
  would have made every browser suite pay a cold optimize forever.
- `release()` is idempotent and runs from `shutdown()` (so a second boot in the
  same gate reuses the warm slot) with `process.once('exit', …)` as the
  backstop for a gate that is killed.
- A caller that already set `VITE_CACHE_DIR` — in the environment or in
  `extraEnv` — owns the decision and gets it back untouched.

The resolved directory is logged on boot, beside the existing `serving:` line.
Observed on a real `verify:surfaces` run:

```
[verify] serving: Vite dev middleware with NODE_ENV unset (/@vite/client in the markup) — dist/ is NOT used by this run.
[verify] vite cache: /tmp/storymachine-vite/wt-vitecache-7d3599e298c6/slot-0 (per-boot pooled directory) — never node_modules/.vite, which every worktree shares through the symlinked node_modules.
```

### Item 3 — the harness (`scripts/verify-vite-cache-isolation.mjs`, `scripts/lib/vite-dev-probe.mjs`, `npm run verify:vite-cache`)

Two **shadow roots** in a temp directory, each a directory of symlinks into the
repository (`node_modules`, `src`, `public`, `scripts`, `index.html`,
`tsconfig.json`, `package.json`) plus a **real copy of the Vite config under
test**. Two distinct repository paths sharing one dependency tree — the lane
topology, without the cost of a second worktree. `--config=<path>` is what
makes the unfixed tree a real input (`git show main:vite.config.ts`) rather
than a simulated one.

`scripts/lib/vite-dev-probe.mjs` boots each one through the same call
`server/app.ts:283-284` makes (same options, no `root`, no `configFile`, cwd
decides), so the cache directory under test is chosen by the code path the
product uses. It reports `cacheDir` **and its realpath**, because two path
strings that resolve to one physical directory is exactly what a symlinked
`node_modules` produces.

Protocol — staged, not raced, because a race is a coin that sometimes lands on
the bug:

1. crawl both servers breadth-first from `index.html` through `/src/**` and
   into every optimized-dep URL those modules import; record each server's
   hashed dep URLs;
2. fingerprint the idle server's cache (path + size + mtime, recursive);
3. drive the other server, alone, through a module importing a dependency only
   it has, forcing a second optimizer run with a different hash;
4. re-fingerprint the idle server's cache;
5. replay the idle server's own hashed dep URLs verbatim and count 504s;
6. repeat with the roles swapped.

It starts **cold** (boot, read the cache path, stop, clear `deps/` and
`deps_temp_*`, boot again), because a warm shared cache is quiet — measured
below. The reset refuses a cache directory inside the repository unless
`--allow-repo-cache-reset` is passed, so a default run cannot touch a
developer's `node_modules/.vite`.

### Item 4 — the unit pin (`tests/scripts/vite-cache-dir.test.ts`)

15 assertions, ~34 ms: two repo paths give two directories; one repo path gives
a stable directory; two `VITE_CACHE_DIR` values give two directories; a
relative one resolves against the root; a blank one reads as unset (rather than
putting the cache on top of the checkout); the default is never under
`node_modules` and never inside the repository; the key is the *resolved* path
so a symlinked checkout is one cache. Plus the wiring: `vite.config.ts` sets
`cacheDir` from the resolver, `bootKeylessServer` allocates/passes/logs/frees,
`server/app.ts` still names no `cacheDir` of its own, and the cache is not a
`dist/` build input.

### Item 5 — the documents

- `ARCHITECTURE.md` §9: the stale "The seven suites are …" paragraph is
  replaced by the true count (eight), a table of which front end each one
  drives, the two neighbours that are *not* browser suites and have been
  miscounted as such, and a pointer to the cache fix.
- `scripts/smoke-p0-live-flow.mjs` header: the paragraph describing the shared
  cache as a live hazard now says it is fixed at the source, names
  `vite.config.ts`'s `cacheDir` / `vite-cache-dir.mjs` /
  `bootKeylessServer`'s `allocateViteCacheSlot`, quotes the measured
  before/after, and says why the gate still serves `dist/` anyway (that reason
  was about what gets published, not about the optimizer).
- Two more stale counts found by the same grep and corrected: `ROADMAP.md:160-167`
  ("runs all six", listing six of eight) and
  `docs/user-validation/P0_EVIDENCE_SUMMARY.md:93` ("the six browser suites").
- `docs/CLAIMS_REGISTER.md` row 20's line anchor moved `ARCHITECTURE.md:500 ->
  :527`, because the §9 rewrite moved the "Not yet proven by default CI"
  anchor. `npm run honesty-audit` caught this and is green again.
- `grep -rn "seven suites" --include=*.md .` now returns only
  `docs/audits/**` — historical records of the defect, deliberately left as
  written.

### Item 6 — cleanup

The nine stale `deps_temp_*` directories under
`/home/user/STORYMACHINE/node_modules/.vite/` are **gone** — removed by the
harness's `--allow-repo-cache-reset` cold-start step during the unfixed-config
runs below. `ls node_modules/.vite` is now just `deps`. Nothing tracked was
deleted; nothing else was touched. That remaining `deps/` is now dead weight:
after this change neither the dev middleware, nor `npm run dev`, nor
`vite build`, nor any gate writes to or reads from `node_modules/.vite`.

---

## 3. Before / after, with the commands

### The proof (item 3), same command, only the config differing

```
$ git show main:vite.config.ts > /tmp/unfixed.vite.config.ts
$ node scripts/verify-vite-cache-isolation.mjs --config=/tmp/unfixed.vite.config.ts --allow-repo-cache-reset
```

```
[vite-cache] cold start: /home/user/STORYMACHINE/node_modules/.vite — removed 2 entries (deps_temp_1b3b59de, deps_temp_a6ddb27f)
[vite-cache] A ... cacheDir /tmp/vite-cache-isolation-XXXX/worktree-a/node_modules/.vite
[vite-cache]     realpath /home/user/STORYMACHINE/node_modules/.vite
[vite-cache] B ... cacheDir /tmp/vite-cache-isolation-XXXX/worktree-b/node_modules/.vite
[vite-cache]     realpath /home/user/STORYMACHINE/node_modules/.vite
[vite-cache] FAIL — both servers resolved ONE physical cache directory
[vite-cache] step 1 — A: 159 responses, 23 hashed dep URLs, 0 bad | B: 159 responses, 23 hashed dep URLs, 0 bad
[vite-cache] B re-optimized via /vite-cache-probe-divergent.ts (docx) -> A's cache CHANGED (44 -> 46 files, +46/-44)
[vite-cache] A re-optimized via /vite-cache-probe-divergent.ts (recharts) -> B's cache CHANGED (46 -> 46 files, +46/-46)
[vite-cache] FAIL — see the lines above.
exit 1
```

```
$ node scripts/verify-vite-cache-isolation.mjs      # this tree's config
```

```
[vite-cache] A ... realpath /tmp/storymachine-vite/worktree-a-fa3b1a0431b0/default
[vite-cache] B ... realpath /tmp/storymachine-vite/worktree-b-40d215efd5b5/default
[vite-cache] PASS — two distinct physical cache directories.
[vite-cache] step 1 — A: 159 responses, 23 hashed dep URLs, 0 bad | B: 159 responses, 23 hashed dep URLs, 0 bad
[vite-cache] B re-optimized via /vite-cache-probe-divergent.ts (docx) -> A's cache unchanged (44 -> 44 files, +0/-0)
[vite-cache] A replayed 23 held dep URLs: 0 x 504/Outdated-Optimize-Dep, 0 bad in total
[vite-cache] A re-optimized via /vite-cache-probe-divergent.ts (recharts) -> B's cache unchanged (46 -> 46 files, +0/-0)
[vite-cache] B replayed 23 held dep URLs: 0 x 504/Outdated-Optimize-Dep, 0 bad in total
[vite-cache] total 504 / Outdated Optimize Dep responses: 0
[vite-cache] total bad responses (all causes): 0
[vite-cache] PASS — two caches, neither writable by the other, zero 504s.
exit 0
```

| | unfixed config | this tree |
|---|---|---|
| physical cache directories for two worktrees | **1** | **2** |
| A's live cache, after B re-optimized | **CHANGED, 44 -> 46 files, +46/-44** | unchanged, +0/-0 |
| B's live cache, after A re-optimized | **CHANGED, 46 -> 46 files, +46/-46** | unchanged, +0/-0 |
| 504 / Outdated Optimize Dep on replay | 0 | 0 |
| exit code | 1 | 0 |

### What is honest about the 504 count

**The 504 itself did not reproduce in the staged run on either tree, and I am
not claiming it did.** Step 4 (the fingerprint) is the deterministic signal and
the one that separates the two configs. Step 5 (the 504 count) is the symptom,
and the symptom is racy — the smoke-gate lane measured it at 1 red in 6
dev-mode runs. A 504 needs a request to land in the window between the rewrite
and the holder noticing, so a staged protocol can legitimately see zero on a
broken tree. Step 5 stays in the harness as a guard that must never fire, not
as the proof.

Two measurements that shaped the harness and are worth a reviewer's attention,
because each one is a way this harness could have passed for the wrong reason:

- **A warm shared cache is silent.** The first version ran the unfixed config
  against an already-optimized `deps/` and reported 0 bad responses while both
  servers pointed at one directory. Both read; neither wrote. That is why the
  harness now forces a cold start.
- **A server invalidating its own URLs is not this defect.** An intermediate
  version reused step 1's URL set for both directions, so the server that
  re-optimized in direction one replayed its own superseded hashes in direction
  two and answered **22 x 504 on the unfixed tree and 23 x 504 on the fixed
  one**. That is correct Vite behavior (a re-optimize tells the browser to
  reload) and it made the fix look broken. Each direction now re-crawls the
  idle server first. A reviewer who wants to see the trap can delete the
  `refreshed` crawl in `crossContamination` and watch both trees "fail"
  identically.
- **A divergent dependency that is not divergent is a no-op.** `yjs` was the
  first choice for shadow B and produced "cache unchanged" on the *broken*
  tree, because `collab.ts`'s dynamic import already puts it in Vite's startup
  scan. It was replaced with `docx` (server-only, never crawled by the client
  build) after checking `ls node_modules/.vite/deps`.

### The unit pin, shown to fail first (§3 of the standard)

```
$ cp /tmp/unfixed.vite.config.ts vite.config.ts
$ node --experimental-strip-types tests/scripts/vite-cache-dir.test.ts
not ok 1 - vite.config.ts sets cacheDir from the resolver, keyed to its own directory
# tests 15 # pass 14 # fail 1
$ git checkout vite.config.ts     # restored
# tests 15 # pass 15 # fail 0
```

### The dev path a developer actually uses

`npm run dev` sets no `VITE_CACHE_DIR`, so it exercises the config default
through `server/app.ts` rather than through `bootKeylessServer`. Driven:

```
$ rm -rf /tmp/storymachine-vite/wt-vitecache-7d3599e298c6/default
$ env -u VITE_CACHE_DIR PORT=5599 node --experimental-strip-types server.ts &
$ curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:5599/      -> 200
$ curl -s http://127.0.0.1:5599/src/main.tsx | head -c 200             -> transformed module
$ ls /tmp/storymachine-vite/wt-vitecache-7d3599e298c6/default          -> deps
```

The optimizer ran and landed in the tmpdir cache; `node_modules/.vite` gained
nothing.

---

## 4. Gates

Run in the foreground, one at a time, from `/home/user/wt-vitecache`.
`PW_CHROMIUM_PATH=/opt/pw-browsers/chromium` exported for the browser suites.

| gate | command | exit |
|---|---|---|
| tests for the files touched | `node --experimental-strip-types tests/scripts/vite-cache-dir.test.ts` (15/15) | 0 |
| " | `.../smoke-gate-serve-mode.test.ts` (10/10) | 0 |
| " | `.../browser-verify-timing.test.ts` (23/23) | 0 |
| " | `.../keyless-browser-certification.test.ts` (2/2) | 0 |
| lint | `npm run lint` | 0 |
| console guard | `npm run check-no-console` (307 files) | 0 |
| server reachability | `npm run check-server-reachability` | 0 |
| build | `npm run build` (2.85 s, no oversized chunk) | 0 |
| docs quality | `npm run check-docs` | 0 |
| brain graph | `npm run brain` then `npm run check-brain` (110 notes, 420 links, fresh) | 0 |
| honesty audit | `npm run honesty-audit` (465 files, 115 register rows) | 0 |
| scoring receipt | `node scripts/check-scoring-receipt.mjs main..HEAD` — "no scoring-path files changed" | 0 |
| new harness, this tree | `npm run verify:vite-cache` | 0 |
| new harness, main's config | `... --config=/tmp/unfixed.vite.config.ts --allow-repo-cache-reset` | **1 (expected)** |
| brain coverage | `node --experimental-strip-types tests/core/brain-coverage.test.ts` (7/7) | 0 |
| browser: surfaces | `npm run verify:surfaces` — 248/248 | 0 |
| browser: a11y | `npm run verify:a11y` — 134/134 | 0 |
| full suite | `npm test` — 13704/13797 pass, **1 fail**, and that failure reproduces on unmodified `main` (see below) | **1** |

**Two gates failed on the way, legitimately, and were fixed rather than worked
around.** Both are recorded here because a lane report that only lists green
gates is not a record of what happened.

1. `npm run honesty-audit` — the §9 rewrite moved `ARCHITECTURE.md`'s "Not yet
   proven by default CI" anchor from line 500 to 527, outside the claims
   register's +/-3 window. `docs/CLAIMS_REGISTER.md` row 20 now cites `:527`
   and records the move.
2. `tests/core/brain-coverage.test.ts` (d) — it requires every
   `npm run verify:*` script to be named by a note under `docs/brain/Gates/`,
   and the new `verify:vite-cache` had none. Note added
   (`docs/brain/Gates/Gate - Vite Cache Isolation.md`, linked from
   `docs/brain/00 Home.md`) and the graph regenerated.

   **How it was found, stated exactly:** a first `npm test` was started in the
   background, surfaced this failure at assertion 415, and was then terminated
   by me partway through (the run's own processes were killed by pid while I
   was cleaning up a second invocation I had started by mistake). That first
   run is NOT a completed suite and is not claimed as one — its log stops at
   assertion 1086 with no exit code. The run in the table above is the one
   that completed, and it is the only full-suite result this report asserts.

### `npm test` exits 1, and it is not this lane

The completed run has exactly one failure:

```
not ok 2714 - finding 10: MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT re-derivation — realistic casts accept, DoS fixtures still reject
  tests/security/fountain-shape-guard-cue-parity.test.ts:3043
  expected the N=150 worst-case accepted shape to cost under half the 30000ms
  analysis budget of CPU, used 21118ms — the bound's 2x-headroom derivation no
  longer holds
```

It is a **CPU-time budget assertion**, and it is **pre-existing**. Driven,
because "it is probably load" is not evidence:

| where | tree | measured |
|---|---|---|
| inside the full run, box under load from a sibling lane | this branch | 21118 ms |
| the file alone, load average ~1.0 | this branch | 20833 ms |
| the file alone, `/home/user/STORYMACHINE` at `f79b47ec`, **unmodified `main`** | main | 21363 ms |

Unmodified `main` fails it by the same margin, and this branch is if anything
marginally faster. Nothing this lane touches is on the analysis path —
`node scripts/check-scoring-receipt.mjs main..HEAD` reports "no scoring-path
files changed". The bound wants the shape to cost under 15000 ms and this
machine spends ~21000 ms on it; that is a fact about this box's speed against
a bound derived on a faster one, and it belongs to whoever owns that bound,
not to this branch. **Flagged for the orchestrator: `npm test` is red on
`main` today, on this machine.**

### One change landed after the completed suite run

The full run above was made at `bcd5de35`. One change follows it, in
`shutdown()` in `scripts/lib/browser-verify.mjs`: the Vite cache slot is now
released **after** the server is killed rather than before. The comment that
shipped at `bcd5de35` claimed releasing early was "harmless (nothing else can
be using it)", and that is not quite true — a gate that shuts one server down
and boots another in the same process could claim slot 0 while the first
server was still dying, which is a small copy of the defect this whole change
exists to close. No caller does that today; the comment was still overclaiming,
so the code was made true rather than the comment softened.

It is a reordering of two statements with no runtime test in `npm test` beyond
the source-pin in `tests/scripts/vite-cache-dir.test.ts`. Re-run on the final
tree rather than re-running the full suite for it: `npm run lint` (0), the
four test files that pin `browser-verify.mjs`
(`vite-cache-dir` 15/15, `smoke-gate-serve-mode` 10/10,
`browser-verify-timing` 23/23, `keyless-browser-certification` 2/2),
`npm run verify:surfaces` (248/248, exit 0) and `npm run verify:vite-cache`
(exit 0) — every path that actually calls `shutdown()`.

---

## 5. What was left undone, and why

1. **The 504 is not reproduced end to end, only its mechanism.** See §3. The
   deterministic assertion is that one server's optimizer rewrites another
   server's live cache; the 504 is the racy downstream symptom. Making the
   symptom deterministic would mean holding a request open inside Vite's rename
   window, which means instrumenting Vite rather than driving it, and a harness
   that has to patch the thing under test proves less than one that does not.
2. **`npm run verify:vite-cache` is not wired into `verify:browser` or CI.** It
   takes ~40 s, boots four Vite servers and needs no browser, so it does not
   belong in the eight-suite browser battery; and CI runs one job in one
   checkout, where the defect cannot occur. `tests/scripts/vite-cache-dir.test.ts`
   is what runs on every `npm test`, and it is what would catch a regression of
   the wiring. Putting the full harness in CI is a reasonable follow-up and is
   a decision about CI cost, not about this fix.
3. **The other six browser suites were not re-run.** Per LANE_STANDARD §4 the
   orchestrator runs the battery once per merge. `verify:surfaces` and
   `verify:a11y` were run here because they are the two the brief named, and
   they share the one boot path that changed; `verify:production` is the one a
   reviewer should add if they want a third, because it is the only suite that
   boots a dev instance *and* a production instance and so exercises the
   `ensureBuiltDist(viteCacheDir)` argument as well.
4. **`node_modules/.vite/deps` is left in place.** Item 6 scoped cleanup to the
   stale `deps_temp_*` directories, and `deps/` is regenerable build garbage
   that nothing now writes. Deleting it is safe but was not asked for.
5. **The new harness has no brain Gate note requirement enforced beyond
   naming.** `tests/core/brain-coverage.test.ts` (d) checks that a
   `docs/brain/Gates/` note *names* each `verify:*` script; it cannot check
   that the note is accurate. The note written here
   (`Gate - Vite Cache Isolation`) states its own limits, including that the
   504 count is a guard rather than the proof.
6. **No `.gitignore` change.** The default cache is outside the repository, so
   there is nothing to ignore. If a future maintainer moves it in-repo, the
   ignore rule and the `DIST_BUILD_CONFIG_RE` interaction both come back — the
   reasoning is in `vite-cache-dir.mjs`'s header so that decision is made with
   its costs visible.
7. **Two Vites started in one worktree WITHOUT `bootKeylessServer` still
   share `<base>/default`.** The config can only key on the repository root,
   so `npm run dev` and a concurrent `vite build` in the same worktree land in
   the same directory. That is the same exposure any single-checkout setup has
   always had, it is not the cross-worktree defect, and `vite build` under
   Vite 8/Rolldown does not run the dev dependency optimizer at all — but it is
   the one sharing case this change does not close, and a reviewer should know
   it is a deliberate boundary rather than an oversight. Closing it would mean
   putting slot allocation inside `vite.config.ts`, which runs in Vite's own
   config-load process and has no place to release a lock.
8. **Slot pool ceiling is 64 per repository**, after which allocation falls
   back to unpooled `mkdtemp` directories. Both branches are correct; the
   ceiling only bounds lock-file litter. No cleanup of old slot directories is
   implemented — they are reused, not accumulated, so the steady state is
   "as many slots as the most concurrent boots that repository ever saw".
9. **A lock this process cannot PARSE is held forever** (round 2; review
   finding 7). `lockHolderAlive` treats an unreadable lock as held —
   deliberately, since every ambiguous answer must cost a slot rather than risk
   a shared directory — and nothing ever reclaims it. The same is true of a
   lock left by a machine restart whose pid has since been reused. `/tmp`
   surviving a sandbox rebuild that erases worktrees is exactly the shape that
   produces this. It is never a correctness violation (the overflow branch is
   unshared) and it is bounded at 64 slots, but item 8's "they are reused, not
   accumulated" is too rosy for these two cases, and this is the correction.
   The lock already records an `at` timestamp that nothing reads; an age cutoff
   would close both, and is the obvious next change if slot litter is ever seen
   in practice.
10. **Four post-spawn throw paths leave an orphaned server holding a slot's
    directory** (round 2; review finding 8). `bootKeylessServer` throws on boot
    timeout, on a missing `server_started`, on `assertKeylessAiConfig`, and on
    a `serveModeOf` mismatch without killing `serverProc` and without returning
    it, so the caller cannot `shutdown()` it. The gate then exits, the exit
    hook frees the lock, and the *next* boot claims that slot while the orphan
    is still serving out of it. The orphan leak is pre-existing and outside this
    lane, but it is a second route into the hazard §6 item 2 is about, and it is
    why the `shutdown()` comment no longer reasons from "nothing else can be
    using it".



---

## 6. Round 2 — the review's five blocking items

Review: `docs/audits/2026-09-12-adversarial/vitecache-review.md`, REVISE on
`b8adfcfc`. The reviewer reproduced +46/−44, +0/−0 and 248/248, could not make
the fixed tree 504 across three cold concurrent boots from one worktree, and
established that the shape-guard CPU failure §4 flagged passes on both trees on
a quiet box (16.96 s lane / 18.95 s main) — so that was load, as reported, and
the earlier red is retired rather than left hanging.

### Item 1 (BLOCKING) — the Docker builder stage could not build this tree

**The defect, reproduced before the fix.** `.dockerignore` is deny-by-default
and does not allowlist `scripts/`; `Dockerfile:13-14` is `COPY . .` +
`RUN npm run build`, and `release.yml:302` / `edge.yml:105` build with
`context: .`. Round 1's `vite.config.ts:5` imported
`./scripts/lib/vite-cache-dir.mjs`. Assembling a context from exactly the nine
allowlisted roots and building it:

```
$ cd <session scratch>/ctx-before && npm run build
[UNRESOLVED_IMPORT] Could not resolve './scripts/lib/vite-cache-dir.mjs' in vite.config.ts
exit 1
```

**The decision: the module moved to the repository root, it was not
allowlisted in place.** The brief and the review both offered either. I tried
the allowlist first — `!scripts/`, `!scripts/lib/`,
`!scripts/lib/vite-cache-dir.mjs` — and the new scope test I wrote alongside it
failed:

```
not ok 6 - does not admit the rest of scripts/ — only the one build input
   scripts/verify-vite-cache-isolation.mjs must stay out of the Docker context
   false !== true
```

Under the ordered Moby semantics `tests/core/docker-context.test.ts` models, a
pattern may match a path **or a parent** (`patternMatches`, `:62-74`). So the
`!scripts/` traversal exception Docker needs before it will descend also
un-denies every other file under `scripts/` — the whole tree of browser gates,
corpus tooling and the rulebook generator enters the build context. Narrowing
it back needs a re-deny/re-allow sequence (`scripts/lib/**` then
`!scripts/lib/vite-cache-dir.mjs`, plus something to re-deny `scripts/*`)
whose correctness depends on pattern order and on which rules happen to match
directories rather than files; I traced one that works today and would rot the
first time someone adds a directory under `scripts/`.

At the repository root it is **one line**, with no parent to traverse and no
subtree to re-deny, and it sits beside the `vite.config.ts` it configures.
`scripts/` stays fully denied. The reasoning is written into `.dockerignore`
itself, and the parent-matching fact is pinned as an assertion so that if it
ever stops being true the note is flagged as stale rather than quietly wrong.

**Fail, then pass**, on contexts assembled from the allowlist:

| context | contents | result |
|---|---|---|
| `ctx-before` | the nine roots the allowlist admitted at `f79b47ec` | `[UNRESOLVED_IMPORT] Could not resolve './vite-cache-dir.mjs' in vite.config.ts`, **exit 1** |
| `ctx-after` | the same, plus exactly what the new `!vite-cache-dir.mjs` line admits | `✓ built in 1.33s`, **exit 0** |

**And the test now derives the requirement instead of remembering it.**
`tests/core/docker-context.test.ts` walks `vite.config.ts`'s relative imports
transitively (`buildTimeImports`, resolving extension-less specifiers, dynamic
`import()` and bare specifiers correctly) and adds every one to
`requiredContextPaths`. Four new assertions, three of which exist to stop this
from becoming another test that cannot fail:

- the walker is pinned against a temp fixture (static + dynamic + transitive
  imports found; bare specifiers ignored; a specifier resolving to nothing is
  not a requirement) — so a broken regex cannot make the policy check vacuous;
- the derivation is non-vacuous in both directions: it must find imports if and
  only if `vite.config.ts` has relative imports;
- **the fail direction is a test, not a sentence**: for each derived import,
  remove the `.dockerignore` exception that admits it and assert the policy
  check goes red. That is the shape the allowlist had at `f79b47ec`;
- `scripts/` is asserted to remain fully denied.

7/7, and it fails on the round-1 tree.

### Item 2 — release after the death, not after the signal

`shutdown()` now `await waitForChildExit(serverProc, SERVER_EXIT_WAIT_MS)`
before `releaseViteCacheSlot()` (`scripts/lib/browser-verify.mjs`). The
reviewer was right that `4b475582` shrank the window rather than closing it:
`kill()` returns when the signal is queued, and `graceMs = 0` is the default
that `verify:ui-polish`, `verify:local-safety-net`, `verify:command-palette`
and `verify:production`'s dev instance all use, so the `graceMs > 0` sleep that
incidentally covered the others was luck, not a mechanism.

The wait is bounded at 5 s and its timer is `unref`'d and cleared on exit — an
unref'd-but-pending 5 s handle would add five seconds to every gate's teardown,
which is how a correctness fix gets reverted. On timeout the slot is freed
anyway: a wedged server holding a cache directory forever is worse than a small
overlap. The comment now says all of that instead of claiming the window is
closed. Pinned by a test that asserts the release appears *after* the wait in
the function body and that the bound exists.

### Item 3 — signals, and the reclaim path that always carried the guarantee

`process.once('exit', …)` does not run on SIGTERM/SIGINT. The hooks moved out
of `bootKeylessServer` and into `vite-cache-dir.mjs`, which owns the lock:
`installExitHooks()` registers `'exit'` plus SIGINT/SIGTERM/SIGHUP once per
process, on first allocation, and releases every slot the process holds.

It re-raises the signal so the process still dies the way the sender asked —
**but only when nothing else is listening**. Stealing another component's
graceful shutdown to tidy a cache directory would be a worse bug than the
litter. My first test fixture proved this matters: a holder with its own no-op
SIGTERM listener hung, because the hook correctly declined to re-raise over it.
Both paths are now tested.

Measured, before and after, same probe:

| tree | lock after `kill -TERM` | holder exit |
|---|---|---|
| `b8adfcfc` (`process.once('exit')` only) | **`slot-0.lock` still on disk** | 143 |
| this tree | **gone** | 143 |
| this tree, holder has its own SIGTERM handler | **gone** | 7 (its own choice, not hijacked) |

And the comment now names the mechanism that always did the real work:
`lockHolderAlive`'s pid reclaim on the *next* allocation is the backstop that
covers SIGKILL, a power cut and a sandbox rebuild — none of which run any
handler. The signal hooks only make the lock file disappear promptly rather
than at the next allocation.

### Item 4 — the assertion that could not fail

`tests/scripts/vite-cache-dir.test.ts` compared `repoCacheKey(REPO)` with
`repoCacheKey(path.join(REPO, 'src', '..'))`; `path.join` normalizes before the
call, so both arguments were the byte-identical string and the assertion held
for any deterministic function, `realpathSync` deleted included. It now makes a
real symlink in the temp directory the test was already creating and
discarding, asserts the two paths are genuinely different strings *and*
different basenames first, checks the key and the full `resolveViteCacheDir`
agree through the link, and checks that two genuinely different trees still
separate.

### Item 5 — the lock state machine, both directions, mutation-checked

Four new tests in `describe('the lock state machine')`. Each behavioural case
is asserted twice: against the real module, and against a **mutant** built by
replacing exactly one condition in the module's own source and importing it.

| case | real module | mutant (condition inverted) |
|---|---|---|
| live holder's lock respected | slot 1 | `if (lockHolderAlive(…)) return false;` → `if (false)`: takes slot 0 |
| dead holder's lock reclaimed | slot 0 | `return …code === 'EPERM';` → `return true;`: moves to slot 1 |
| unparseable lock treated as held | slot 1 | `catch { return true; }` → `catch { return false; }`: takes slot 0 |
| the lock records pid + timestamp, and `release()` removes it | asserted | — |

A mutant that passed would mean the assertion above it measures nothing. The
dead pid is a real one: a child spawned and already exited.

### Non-blocking, folded in

`tests/core/ci-gates-intact.test.ts` was titled *"verify:browser really runs
all six browser suites"* and pinned six of the eight, so `verify:a11y` and
`verify:production` could have been dropped from the battery with that gate
green — the exact bypass it exists to prevent. Now eight, with the **count**
asserted as well as the membership, so a ninth suite added without being pinned
reopens nothing. The review is right about why round 1 missed it: the grep was
`--include=*.md` and this is a `.ts` file saying "six".

Findings 7 and 8 are recorded in §5 below (items 9 and 10).

### Round 2 gates

| gate | exit |
|---|---|
| `tests/core/docker-context.test.ts` (7/7, was 3/3 and could not fail) | 0 |
| `tests/core/ci-gates-intact.test.ts` (30/30) | 0 |
| `tests/core/brain-coverage.test.ts` (7/7) · `tests/core/documentation-truth.test.ts` (8/8) | 0 |
| `tests/scripts/vite-cache-dir.test.ts` (21/21, was 15/15) | 0 |
| `smoke-gate-serve-mode` (10/10) · `browser-verify-timing` (23/23) · `keyless-browser-certification` (2/2) | 0 |
| `npm run lint` | 0 |
| `npm run check-no-console` | 0 |
| `npm run build` | 0 |
| `npm run check-docs` · `brain` · `check-brain` | 0 |
| `npm run honesty-audit` | 0 |
| `node scripts/check-scoring-receipt.mjs main..HEAD` | 0 |
| `npm run verify:vite-cache` (harness still passes with the module at the root) | 0 |
| `npm run verify:surfaces` (248/248, and no lock file left behind) | 0 |

No second full `npm test` — the orchestrator runs it at merge, per the cost
rule for this round.

---

Tip: `4beee016c2bfbf1c8f7ba936d3dd841da98bbf88` (the one commit after it is this
line).
