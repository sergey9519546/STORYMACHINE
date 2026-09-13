# CI green — 2026-09-13

GitHub Actions ran for this repository for the first time since 2026-09-02 on
this day (the account-level block was lifted). The first real run on `main`
(run 34736306670, attempt 2 on 996e27a0) told the truth about the previous
week's work: the browser battery was green on the runner; the test job was red
on exactly one subtest, and later runs showed a second failure in the browser
job that the sandbox battery had never exercised. Each became a lane under
`docs/LANE_STANDARD.md` §6 (independent review before merge) and §7
(pushed after every commit, reviews committed before the merge).

## The lanes

| lane | what it found | rounds | landed |
|---|---|---|---|
| `voice-bound-ci-derivation` — the N=150 voice-weight boundary cost 19,713 ms of CPU on the runner against a 15,000 ms half-budget line derived on the sandbox; the runner's own tables showed no weight bound can hold that line without rejecting ordinary 30–40 character features, so a second, orthogonal bound on the eligible cast (`MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT` = 80) was derived ON the runner (three CPU models seen in two hours, 20% apart), locked in a committed table the test reads, with every realistic ensemble still accepted (75 roles at weight 674,025: ACCEPT; 81: REJECT) and the disclosure that on the slowest fleet member under saturating load no bound can hold the line | REVISE 8 (the margin's comment disagreed with its constant; a cross-machine correction; the "heaviest admitted document" false by 1.84x; the rejected band misstated; a fixture column measured under the wrong constant; the named "real fix" was the wrong one — hoisting `burrowsDelta` is 44–56x, bit-identical, receipt-only) → MERGE | see `git log` (this README lands with the merge) |
| `ci-concurrency` — one CI run per branch, not one per commit (superseded lane-branch runs cancelled; main's runs keyed by SHA so none is ever cancelled or dropped); a failure summary printed at the end of every test job and the full TAP uploaded, because the job-log API returns only the last ~100 KB of a 7-minute stream | REVISE 6 → REVISE 1 (a comment satisfied the pipefail assertion) → MERGE | this merge (see `git log`) |
| `palette-close-race` — `verify:command-palette` red 3 of 3 on main: the assertion sampled the dialog count the instant the lazily-imported Ship panel appeared, inside the palette's 0.14 s exit animation; fixed through `waitFor({ state: 'detached' })` with the three sibling Escape checks, a wiring test on `runAt`'s ordering, and a scanner for the shape | REVISE 6 (the scanner missed its own guarded line past a 20-line comment; ten evasion shapes; the causal account) → REVISE 1 (the code comments still told the retracted story) → MERGE — the racing quantity was the one-time lazy import of the Ship panel on its first open (813 ms) inside the palette's exit animation (212–293 ms measured detach), not runner speed; throttling masks the race | this merge (see `git log`) |
| `ci-env-failures` — the test job (not the browser job) was red on the runner on exactly two files, every push since CI resumed, and green on the sandbox every time: both were a test spreading `{ ...process.env, ... }` (or a bare `execFileSync` with no `env`) into a child process, so it silently inherited the runner's ambient `GITHUB_EVENT_PATH` or `RUN_E2E` — one leak also exposed a real `git rev-parse --verify` bug (a syntactically-valid-but-nonexistent SHA reads as "exists"), the other a gate reporting itself "ran" off the wrong env var; `npm run test:ci-env` now replicates the runner env locally so this class cannot come back unnoticed | REVISE 4 (the production fix was pinned by no test; the same fix opened a silent-pass for a real-but-unresolvable `before`; `test:ci-env` replicated by addition only; the same env-spread class survived 20 lines from the fix) → round 2 pending re-review | this merge (see `git log`) |

Each `*-lane-report.md` and `*-review.md` is the full record, with every
reproduction's command and number.
