# Audit — 2026-09-20 Dead Weight B3

**Directory:** this lane record, on `lane/dead-weight-b3` from `26d930dd`.

## What it answers

Whether `agent-scheduler/` (12 tracked files) and `test-freeride.js` — the
two strongest delete candidates in
`docs/proposals/DEAD_WEIGHT_REMOVAL_2026-08-24.md`'s Proposal B3 — could be
removed safely, and whether the proposal's own claims about them still held.
The owner authorized acting on B3 specifically and nothing wider: Proposal A,
B1, B2, and the four never-run v5.0 test files are untouched and remain
proposals awaiting the owner.

## Dependency map (all commands run from the worktree root)

### Inventory

```
$ git ls-files agent-scheduler | wc -l
12
```

Matches the proposal's count exactly. Files:
`DELIVERY_REPORT.md`, `IMPLEMENTATION_SUMMARY.md`, `README.md`, `STATUS.md`,
`WINDOWS-SETUP.md`, `cron-config.json`, `crontab-schedule.txt`, `demo.js`,
`implementation-agent.js`, `package.json`, `progress-tracker.json`,
`scheduler.js`.

### Broad reference search

```
$ grep -rn 'agent-scheduler\|test-freeride' \
    --include=*.ts --include=*.tsx --include=*.mjs --include=*.js \
    --include=*.json --include=*.yml --include=*.yaml --include=*.md \
    --include=Dockerfile --include=.dockerignore . \
  | grep -v node_modules | grep -v '^./docs/proposals/'
```

Every hit, classified:

| Hit | Classification |
|---|---|
| `./test-freeride.js:3` (its own header comment) | self-reference, deleted with the file |
| `./agent-scheduler/**` (demo.js, README.md, DELIVERY_REPORT.md, STATUS.md, WINDOWS-SETUP.md, IMPLEMENTATION_SUMMARY.md, cron-config.json, package.json — all internal cross-references between the directory's own files) | self-references, all deleted together — nothing outside the directory points in |
| `./SESSION_REPORT_2026-09-19.md:133` | doc mention (dated audit finding row noting B3 "never acted on"). Left unedited — it is a historical, dated session report, a snapshot of state on 2026-09-19, not a living status doc; rewriting a past report's findings after the fact would misrepresent what was true when it was written. The now-current status lives in the proposal doc's own "Acted on 2026-09-20" note and in `docs/UNIFIED_STATE_2026-09-02.md`'s addendum (both updated in this lane). |
| `./docs/user-validation/P0_EVIDENCE_SUMMARY.md:60` | doc mention (historical debugging note quoting a `dist/` build artifact name from `test-freeride.js`, dated well before this lane). Left unedited for the same reason — historical record, not a live reference. |
| `./docs/filed-backlog/root-reports-2026-07/AGENT_SCHEDULER_DELIVERY.md` (7 lines) | doc mention — a filed-backlog historical delivery report *about* `agent-scheduler/`'s original construction. Left unedited: it documents a thing that existed, which remains true after deletion, and `docs/filed-backlog/` is explicitly non-current material per `ROADMAP.md` §8. |

No hit was a reference that would break at runtime or in CI.

### Config/gate files checked individually (none had a hit)

```
$ grep -n 'agent-scheduler\|test-freeride' package.json                        → (no output)
$ grep -rn 'agent-scheduler\|test-freeride' .github/                           → (no output)
$ grep -n 'agent-scheduler\|test-freeride' tsconfig.json                       → (no output)
$ grep -n 'agent-scheduler\|test-freeride' .dockerignore                       → (no output)
$ grep -n 'agent-scheduler\|test-freeride' scripts/run-tests.mjs               → (no output)
$ grep -n 'agent-scheduler\|test-freeride' scripts/check-no-console.mjs        → (no output)
$ grep -n 'agent-scheduler\|test-freeride' scripts/verify-server-reachability.mjs → (no output)
$ grep -rln 'agent-scheduler\|test-freeride' docs/brain/                       → (no output, before this lane's own new note)
$ grep -n 'agent-scheduler\|test-freeride' docs/CLAIMS_REGISTER.md             → (no output; exit 1)
```

`npm run check-server-reachability` runs `scripts/verify-server-reachability.mjs`
(confirmed via `package.json` line 34); neither path appears in its
allowlist or anywhere else in that script. **Conclusion: no config file
required an edit.** tsconfig's exclude/quarantine list, the console-check
exemptions, and the reachability allowlist are all unchanged by this lane —
their counts (if asserted by a gate script) do not move.

## Claim verification (before deleting)

```
$ node test-freeride.js; echo EXIT=$?
Testing FreeRide integration...
❌ Test failed: Cannot find module '.../dist/server/engine/ai.js' imported from
   .../test-freeride.js
Make sure to build the project first:
  npm run build
EXIT=1
```

Matches the proposal's claim exactly (exit 1, missing `dist/server/engine/ai.js`).

```
$ grep -rn "from '.*agent-scheduler\|require(.*agent-scheduler" . | grep -v node_modules
(no output — exit 1)
```

Confirms `agent-scheduler/` is imported by nothing, as the proposal claimed.

## What was removed

```
$ git rm -r agent-scheduler test-freeride.js
```

13 files removed: the 12 tracked files under `agent-scheduler/` plus
`test-freeride.js` at the repo root.

## What remains for the owner

Unchanged by this lane, per the proposal:

- **Proposal A** — the Story Vector compare surface fixes were already
  shipped in an earlier session (see the proposal's "What this session
  actually changed" section); Proposal A's own two-fix recommendation there
  is otherwise not part of B3 and was not touched here.
- **Proposal B1** — collecting the two live-code orphan tests
  (`tests/critics/critics-engine.test.ts`,
  `server/nvm/kernel/event-store.test.ts`) into `run-tests.mjs`'s
  `TEST_ROOTS` — not done, deliberately (the proposal calls it a separate
  reviewed change).
- **Proposal B2** — the 78-file unreachable `server/**` closure (v5.0
  quantum/research/planning/infinity-gate subsystem, 51 files / 17,120
  lines) — kept as reference per the proposal's own recommendation to defer.
- **The four never-run v5.0 test files** (`server/nvm/kernel/__tests__/*`,
  `tests/apdl.test.ts`) that fail 2/2/10/8 against their own quarantined
  code, three of them unable to execute for lack of `vitest`/`@jest/globals`
  — untouched.

All four remain proposals awaiting the owner's decision, exactly as
`docs/proposals/DEAD_WEIGHT_REMOVAL_2026-08-24.md` and
`docs/UNIFIED_STATE_2026-09-02.md`'s 2026-09-20 addendum line now state.

## Gates

See the commit message / handback report for the full gate table (lint,
check-no-console, check-server-reachability, check-brain, build, the named
brain/CI/docker test files, `scripts/run-tests.mjs` dry listing, and
`scripts/check-scoring-receipt.mjs 26d930dd..HEAD`). No scoring-path file
was touched by this lane.
