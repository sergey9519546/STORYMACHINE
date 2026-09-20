---
type: audit
updated: 2026-09-20
sources: [docs/audits/2026-09-20-dead-weight-b3/README.md, docs/proposals/DEAD_WEIGHT_REMOVAL_2026-08-24.md, docs/UNIFIED_STATE_2026-09-02.md]
status: active
---

# Audit — 2026-09-20 Dead Weight B3

**Directory:** `docs/audits/2026-09-20-dead-weight-b3/` — the lane record for
executing Proposal B3 of
`docs/proposals/DEAD_WEIGHT_REMOVAL_2026-08-24.md`, on `lane/dead-weight-b3`
from `26d930dd`.

## What it answers

Whether `agent-scheduler/` (12 tracked files: four markdown reports,
`cron-config.json`, `crontab-schedule.txt`, `package.json`,
`progress-tracker.json`, three `.js` files) and `test-freeride.js` (repo
root) — the proposal's own two strongest genuine delete candidates — could
be removed with nothing breaking, and whether the proposal's claims about
them (imported by nothing; exits 1 on a missing build artifact) still held
a month later.

**Fix.** `git rm -r agent-scheduler test-freeride.js`, one commit, 13 files
removed. Both claims were re-verified immediately before deletion:
`node test-freeride.js` still exited 1 with
`Cannot find module '.../dist/server/engine/ai.js'`, and
`grep -rn "from '.*agent-scheduler\|require(.*agent-scheduler" .` (outside
`node_modules`) found no hits — `agent-scheduler/` was imported by nothing.

**Config surface.** A broad reference grep across `*.ts/*.tsx/*.mjs/*.js/
*.json/*.yml/*.yaml/*.md/Dockerfile/.dockerignore` (excluding
`node_modules` and the proposal doc itself) found every hit outside the two
deleted trees to be a historical doc mention — `SESSION_REPORT_2026-09-19.md`
row 18, `docs/user-validation/P0_EVIDENCE_SUMMARY.md:60`, and
`docs/filed-backlog/root-reports-2026-07/AGENT_SCHEDULER_DELIVERY.md` — none
of which is a live reference, so none was edited. `package.json`,
`.github/workflows/*`, `tsconfig.json`'s exclude list,
`scripts/run-tests.mjs`, `scripts/check-no-console.mjs`,
`scripts/verify-server-reachability.mjs` (what
`npm run check-server-reachability` runs), `.dockerignore`, and
`docs/CLAIMS_REGISTER.md` all had zero hits, so **no config file needed an
edit** — no quarantine count, allowlist, or asserted number moves.

**Scope discipline.** Proposal A (already addressed in an earlier session),
B1 (collecting the two live-code orphan tests into `TEST_ROOTS`), B2 (the
78-file unreachable `server/**` closure), and the four never-run v5.0 test
files are untouched — the owner authorized B3 specifically, nothing wider.
`docs/proposals/DEAD_WEIGHT_REMOVAL_2026-08-24.md` carries a dated
"Acted on 2026-09-20" note at the top of its B3 section (the proposal text
itself is not rewritten), and `docs/UNIFIED_STATE_2026-09-02.md`'s
2026-09-19 addendum has a one-line 2026-09-20 follow-up recording the same.

## Why it is safe to have merged

Both of the proposal's load-bearing claims were re-verified live, not taken
on faith from a dated document: the exit code and error text of
`node test-freeride.js`, and the empty result of the
`agent-scheduler` import grep, both quoted in
`docs/audits/2026-09-20-dead-weight-b3/README.md`. No scoring-path file was
touched (`scripts/check-scoring-receipt.mjs 26d930dd..HEAD` reports no
scoring-path files changed, so no measurement receipt is required). `npm
test` and `npm run brain` were out of scope for this lane per its brief and
were not run; `npm run check-brain` was run and may report the graph as
stale for that reason — this note's own wikilinks still resolve.

**Related:** `docs/proposals/DEAD_WEIGHT_REMOVAL_2026-08-24.md`,
`docs/UNIFIED_STATE_2026-09-02.md`, [[Patterns]].

## Sources

- `docs/audits/2026-09-20-dead-weight-b3/README.md`
- `docs/proposals/DEAD_WEIGHT_REMOVAL_2026-08-24.md`
- `docs/UNIFIED_STATE_2026-09-02.md`
