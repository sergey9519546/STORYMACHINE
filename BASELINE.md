# G0 Baseline (task G0-00)

## Toolchain
- Node: v22.22.2
- npm: 10.9.7

## Baseline commit
- `5c49609` — `origin/main` ("Merge pull request #222 from sergey9519546/claude/audit-gap-fixes")
- Tagged: `g0-baseline`

## Gate results at baseline (run 2026-07-23, this environment)
- `npm install` — clean (lockfile consistent)
- `npm run lint` (tsc --noEmit) — 0 errors
- `npm test` — 9689 tests: 9610 pass, 0 fail, 78 skipped, 1 todo

## Deviation from TODO.md G0-00 — honestly stated
TODO.md pins the baseline to commit `9776fec` on branch
`codex/ultra-audit-critical-fixes`. That branch and commit **do not exist
on the GitHub remote** and are unreachable from every fetched ref
(verified via `git ls-remote`, full `--prune` fetch, object lookup, and
`--disambiguate`). No codex-authored commits exist anywhere in the
repository history. The branch was most likely never pushed from the
local (OneDrive) machine, which is quarantined per Rule 4.

Decision (delegated by the operator after verification): baseline =
current green `main`. Rationale:
1. `9776fec` is unverifiable and unreachable from this environment.
2. `main`'s lineage already contains the ultra-audit program: the plan
   itself (`52035ef`, docs/superpowers/plans/2026-07-15-ultra-audit-
   critical-fixes.md) and part of its artifacts
   (`src/lib/scriptide-draft-store.ts`, `src/lib/uploaded-files.ts`).
3. Any unpushed fork predates the 8 PRs merged 2026-07-23 (CI
   restoration, an auth gate on /api/ai-providers/switch, route
   validation, schema-drift fixes). Building on it would discard
   verified security fixes and resurrect a red-CI engine state.
4. Rule 1 (ONE ENGINE) is honored: green `main` is the single canonical
   engine; no new engine, parallel store, or v2 is created.

If `codex/ultra-audit-critical-fixes` is later pushed, its unlanded
work (e.g. `server/lib/ai-budget.ts`, `SessionCommandCoordinator`)
should be evaluated and cherry-picked onto this lineage — never the
reverse.
