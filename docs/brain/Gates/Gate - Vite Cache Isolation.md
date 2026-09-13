---
type: gate
updated: 2026-09-13
sources: [scripts/verify-vite-cache-isolation.mjs, scripts/lib/vite-dev-probe.mjs, scripts/lib/vite-cache-dir.mjs, vite.config.ts, scripts/lib/browser-verify.mjs, tests/scripts/vite-cache-dir.test.ts, package.json]
status: active
---

# Gate — Vite Cache Isolation

**What it checks:** that two Vite dev-middleware servers booted from two
repository paths that share one `node_modules` cannot collide in the
dependency optimizer. Vite's default `cacheDir` is
`<root>/node_modules/.vite`, and every lane in this repository works in a
`git worktree` whose `node_modules` is a symlink to the main checkout's — so
that default was one physical directory reached through two path strings,
with two optimizers writing `deps_temp_<hash>/` and renaming it onto `deps/`
underneath each other. It took a browser gate down on 2026-09-12 with
`504 (Outdated Optimize Dep)`
(`docs/audits/2026-09-12-adversarial/p0flow-lane-report.md:94`, `:217`) and
left nine abandoned `deps_temp_*` directories behind as receipts.

**Command:** `npm run verify:vite-cache` — wraps
`node scripts/verify-vite-cache-isolation.mjs [--config=<path>] [--modules=N]
[--warm] [--keep] [--allow-repo-cache-reset]`. It builds two shadow roots in
a temp directory (symlinks to this repository's `node_modules`, `src`,
`public`, `scripts`, `index.html`, `tsconfig.json`, `package.json`, plus a
real copy of the Vite config under test), boots each through
`scripts/lib/vite-dev-probe.mjs` — the same `createServer({ server: {
middlewareMode: true }, appType: 'spa' })` call `server/app.ts:283-284` makes
— and then, in each direction: crawls the idle server for the
optimizer-hashed dep URLs it has committed to, fingerprints its cache
directory, drives the other server alone through a module importing a
dependency only it has (so only it re-optimizes), re-fingerprints, and
replays the idle server's URLs. Exit 0 only if the two caches are distinct
physical directories, neither was written by the other, and nothing answered
504.

**What the fix is:** `vite.config.ts` sets `cacheDir` from
`resolveViteCacheDir({ repoRoot: __dirname })`
(`scripts/lib/vite-cache-dir.mjs`), which keys the cache to the repository
root under `os.tmpdir()` — outside `node_modules` and outside the repository,
for three reasons given in that file's header. Because the config is the one
place all of them read, the dev middleware, `npm run dev` and `vite build`
agree by construction. `scripts/lib/browser-verify.mjs`'s `bootKeylessServer`
adds the second half: an exclusive-lock slot (`allocateViteCacheSlot`) per
boot, so two boots of the SAME worktree cannot share one either, with slot 0
free whenever nothing else is running so the ordinary single-gate run keeps a
warm cache. The resolved directory is logged beside the `serving:` line.

**Where it lives:** `scripts/verify-vite-cache-isolation.mjs`, a standalone
script — deliberately NOT composed into `verify:browser`'s battery
([[Gate - Browser Battery Suites]]), since it drives no UI, needs no browser,
and boots four Vite servers over ~40 s. It is not wired into CI either: CI
runs one job in one checkout, where the defect cannot occur.
`tests/scripts/vite-cache-dir.test.ts` is what runs on every `npm test` — 15
assertions over the resolution (two repo paths give two directories, a blank
`VITE_CACHE_DIR` reads as unset, the default is never under `node_modules`
and never inside the repository) and over the wiring (`vite.config.ts` sets
`cacheDir` from the resolver, `bootKeylessServer` allocates/passes/logs/frees
it, `server/app.ts` names no `cacheDir` of its own, and the cache is not a
`dist/` build input).

**What it cannot catch:** the 504 itself, reliably. The fingerprint check
(one server's optimizer rewriting another's live cache) is deterministic and
is what separates a fixed tree from a broken one — measured at
44 -> 46 files, +46/-44 in one direction and 46 -> 46, +46/-46 in the other
on the unfixed config, against +0/-0 both ways on the fixed one. The 504 is
the downstream symptom and is racy: it needs a request to land between the
rewrite and the holder noticing, which the smoke-gate lane measured at 1 red
in 6 dev-mode runs. A staged run can legitimately see zero 504s on a broken
tree, so the 504 count is a guard that must never fire, not the proof. It
also cannot see a cache collision between processes that are not Vite dev
servers, and it says nothing about the production path, which runs no
optimizer at all ([[Gate - Browser Battery Suites]]'s `verify:p0-flow` serves
the built `dist/` for that reason among others).

## Sources

- `scripts/verify-vite-cache-isolation.mjs` (protocol, the cold-start
  requirement, and the two ways this harness could pass for the wrong reason)
- `scripts/lib/vite-dev-probe.mjs` (the boot, diffed against `server/app.ts`)
- `scripts/lib/vite-cache-dir.mjs` (resolution, the slot lock, and why the
  default is in `os.tmpdir()` rather than in the repository)
- `vite.config.ts` (`cacheDir`), `scripts/lib/browser-verify.mjs`
  (`bootKeylessServer`)
- `tests/scripts/vite-cache-dir.test.ts`
- `docs/audits/2026-09-12-adversarial/vitecache-lane-report.md`
- `package.json` (`verify:vite-cache` script entry)
