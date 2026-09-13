# ci-env-failures — independent review, round 1

Reviewed object: `lane/ci-env-failures` @ `156a1ca67f765a079ba75b2b4778fb78989cf950`
(`156a1ca6`), one commit on top of `main` @ `32fa44f6` (the lane branched from
`030782e2` and was fast-forwarded onto the palette merge; the diff reviewed is
`git show 156a1ca6`, which is exactly this lane's own change). Worktree
`/home/user/wt-cienv`. Reviewer did not build the lane. Lane report:
`docs/audits/2026-09-13-ci-green/ci-env-lane-report.md`. Scratch paths below
are written `<session scratch>`.

**VERDICT: REVISE (4 items).** The diagnosis is right, both root causes are
real, both reproduce, and the reproduction is honest. But the headline
production fix is pinned by no test — reverting it leaves the whole suite
green, under the replicated runner env and locally — and the same fix routes a
new class of input into a pre-existing silent-pass in the receipt gate, turning
a red build into a green one for that input. Both are inside this lane's own
change and cheap to close.

---

## 1. The brief, item by item

| # | brief item | verdict |
|---|---|---|
| 1 | Reproduce under the runner's exact env | **done** — reproduced independently here, both files, fail-first (numbers in §2) |
| 2a | Fix the class: env leakage into spawned children | **narrowed** — the two live instances are fixed, and one (`GATES.map(g => g.env)`) is generic. A third site in the *same file* the lane edited still spreads `...process.env` (finding 4); several more remain in `tests/` (§5, non-blocking) |
| 2b | Fix the class: scripts trusting inherited GITHUB vars | **done for the actual hole** — `refExists()` is the only `rev-parse --verify` caller that is ever handed a 40-hex SHA; the one other site (`scripts/owner-measure.mjs:887`) is handed a full `refs/remotes/...` path, which git does resolve, so it does not share the hole. But the fix is untested (finding 1) and changes the gate's failure posture (finding 2) |
| 2c | "each shown failing first" | **narrowed** — shown failing first in the *report*; not shown failing first in the *repository*. Reverting the production fix and keeping everything else, the suite is 24/24 green (§2, finding 1). Per LANE_STANDARD §3 a guard must fail on the unfixed input |
| 3 | `npm run test:ci-env`, wired into LANE_STANDARD §4 and ARCHITECTURE | **done, with an overclaim** — the script exists, takes file arguments, never detaches the working tree, and is documented in both places; but it replicates by addition only and so is not the runner's env on the one machine where the difference bites (finding 3) |
| — | claims-register row 20 anchor 553 -> 568 | **correct** — `ARCHITECTURE.md:568` is the anchor line; `tests/core/claims-row-citations.test.ts` 5/5 |
| — | audits README row, brain note | **done** — `check-brain` fresh, `honesty-audit` clean |

## 2. Reproduced numbers (this reviewer, not the lane)

Replicated env used throughout: full `git clone` of the repo into
`<session scratch>`, detached at the commit under test, `node_modules`
symlinked, plus `GITHUB_ACTIONS/CI/GITHUB_EVENT_NAME=push/GITHUB_SHA/
GITHUB_REF/GITHUB_REF_NAME/GITHUB_REF_TYPE/GITHUB_REPOSITORY/GITHUB_WORKFLOW/
GITHUB_RUN_ID/GITHUB_RUN_NUMBER/GITHUB_ACTOR/GITHUB_WORKSPACE/GITHUB_EVENT_PATH/
RUNNER_OS/RUNNER_TEMP/TZ/LANG` + `RUN_E2E=1`/`GIT_SHA` (ci.yml's "Run tests"
step env), `PUSH_BEFORE_SHA` unset. `git version 2.43.0`, Node v22.22.2.

| run | result |
|---|---|
| **fail-first A** — `tests/core/scoring-receipt-guard.test.ts` on the PRE-fix tree (`030782e2`), replicated env | `# tests 24 / # pass 23 / # fail 1`; inner failure at `:663`, `fatal: Invalid revision range 1439ca5c800d…..030782e260d9…` — the lane's account exactly |
| **fail-first B** — `tests/scripts/report-unverified-gates.test.ts`, PRE-fix tree, replicated env | `# tests 42 / # pass 41 / # fail 1` (`not ok 5 - the real gate list`, `:164`) |
| **B with `RUN_E2E` unset, nothing else changed** | `# tests 42 / # pass 42 / # fail 0` — `RUN_E2E=1` is the single flipping variable, confirmed |
| **after** — `npm run test:ci-env -- tests/core/scoring-receipt-guard.test.ts tests/scripts/report-unverified-gates.test.ts` on `156a1ca6` | exit 0, `# tests 66 / # pass 66 / # fail 0` — the report's 66/66 reproduces |
| worktree after that run | `HEAD` still on `lane/ci-env-failures`, `git status --porcelain` 0 lines — the tool does not detach or dirty the tree |
| `git rev-parse --verify --quiet <absent 40-hex>` / same `+ ^{commit}` | exit 0 (echoes the SHA back) / exit 1, no output — the fix's premise is correct |
| `tests/core/claims-row-citations.test.ts` | 5/5, exit 0 |
| `npm run check-brain` | `OK. 114 notes, 455 links, graph is fresh.` exit 0 |
| `npm run honesty-audit` | `scanned 465 files … plus the claims register (116 rows) — clean`, exit 0 |

Driving the guard directly (throwaway repos in `<session scratch>`, runner env,
`GITHUB_EVENT_PATH` pointing at a push payload whose `before` is a valid but
absent 40-hex SHA):

| case | repo | script | result |
|---|---|---|---|
| orphan, leaked event path | one commit, no `origin/main` | **new** | `NO BASE REF … FAILING because CI is set`, **exit 1** — the intended message |
| orphan, leaked event path | same | **old (`030782e2`)** | `fatal: Invalid revision range …` + raw Node stack trace from `getChangedFiles`, **exit 1** |
| A: real `before` (control) | `origin/main == HEAD`, unreceipted `doctor.ts` change in the push | **new** | `SCORING-PATH CHANGE WITHOUT A VALID MEASUREMENT RECEIPT`, **exit 1** — correct |
| B: unresolvable `before` | same repo, same unreceipted change | **new** | `range "origin/main...HEAD" — no scoring-path files changed. OK.` **exit 0** |
| C: same input as B | same | **old** | stack trace, **exit 1** |
| D: unresolvable NON-hex `before` | same | old **and** new | `… no scoring-path files changed. OK.` exit 0 — the fall-through itself pre-dates this lane |

## 3. The real exposure of the old bug, stated plainly

**The old `refExists()` hole could not let an unreceipted scoring-path change
through the CI gate.** The failure path was `getChangedFiles()` re-throwing a
`git diff` failure out of `main()` with no handler; an uncaught exception in
Node exits **1**, and the `Scoring-path change requires a measurement receipt`
step in `.github/workflows/ci.yml` is blocking (no `continue-on-error`, and
`tests/core/ci-gates-intact.test.ts` pins that). The range never silently
became empty — it was never diffed at all. Verified by running the pre-fix
script: exit 1, both in the orphan repo and in a push-shaped repo.

So the exposure was: (i) **diagnostic** — a raw stack trace instead of the
guard's "NO BASE REF … FAILING because CI is set" message, which is precisely
the message written to tell a reader that the *checkout*, not the code, is
broken; and (ii) **a permanently red test job on every push since CI resumed**,
which has its own cost — a job that is red for a known reason is a job whose
next, unknown red goes unread. In the real CI receipt step the hole was inert
anyway: `PUSH_BEFORE_SHA` is wired from `github.event.before` and
`fetch-depth: 0` guarantees that object is present, so `refExists` was being
asked about a SHA that genuinely existed.

**The unreceipted-change exposure exists in the other direction, and this lane
opens it** — see finding 2.

## 4. Findings

### HIGH — 1. The production fix is pinned by no test; the test hardening removed the only thing that exposed it

`baseGuardEnv()` strips `GITHUB_EVENT_PATH` from every guard invocation in
`tests/core/scoring-receipt-guard.test.ts`. That is correct hygiene, and it is
also the only condition under which the `refExists()` bug ever manifested. With
the test hardening kept and **only** the production line reverted
(`${ref}^{commit}` -> `ref`) in a scratch clone of `156a1ca6`:

```
tests/core/scoring-receipt-guard.test.ts   # tests 24 / # pass 24 / # fail 0   (replicated runner env)
tests/core/scoring-receipt-guard.test.ts   # tests 24 / # pass 24 / # fail 0   (plain sandbox env)
tests/core/check-scoring-receipt.test.ts   # tests 8  / # pass 8  / # fail 0
```

`grep -rn '\^{commit}' tests/` returns nothing. LANE_STANDARD §3: "A guard or
gate must be shown to FAIL on the unfixed input before it is shown to pass on
the fixed one. A test that could not have caught the bug proves nothing." The
lane's own headline finding — "a REAL bug, environment-independent" — is today
protected by a comment. A future refactor of `refExists()` reintroduces it in
silence.

### HIGH — 2. The fix converts a loud failure into a silent green for "push event, `before` present but unresolvable"

`resolveDefaultRange()`'s push branch falls through when `refExists(before)` is
false, and the next candidate is `origin/main...HEAD` — which, on a push to
`main`, names the same commit twice and diffs nothing, so the guard prints
`no scoring-path files changed. OK.` and exits 0. That is the exact shape the
top of `scripts/check-scoring-receipt.mjs` documents as "~182 main-push runs
gated by nothing … how the 2026-08-08 fabricated receipt reached main".

Before this lane, a non-zero 40-hex `before` could never reach that fall-through
(`refExists` always said true, and the job died loudly). After it, it does.
Demonstrated above as case B vs case C: the *same input*, over a repo carrying
a real unreceipted `doctor.ts` change, goes **exit 1 (red) -> exit 0 (green)**.

To be exact about blame: the fall-through itself is pre-existing (case D shows
a non-hex `before` reaching it on both trees). What this lane changes is which
inputs arrive there, and it moves the highest-stakes input class — a real SHA
from a real push event that the checkout cannot resolve (force-push after gc, a
`fetch-depth` regression, a stale `PUSH_BEFORE_SHA` wired from another
workflow) — from "build goes red" to "build goes green with nothing checked".
The lane now owns `refExists()`'s semantics, so it is the right place to close
it: in the push branch, a `before` that is present, non-zero and unresolvable
must take the `NO BASE REF` path (message + exit 1 under CI), never the
`origin/main...HEAD` fall-through. Roughly four lines, and it is directly
testable — which also discharges finding 1.

### MEDIUM — 3. `test-ci-env.mjs` replicates by addition only, and §4's sentence overclaims

The script spreads the caller's `process.env` and deletes exactly one key
(`PUSH_BEFORE_SHA`). The runner's "Run tests" step is defined as much by what it
does **not** carry:

- **`GEMINI_API_KEY`** — ci.yml omits it deliberately, with a long comment
  ("the product's official keyless analysis-only mode is what CI must prove").
  A developer with a key in their shell runs a strictly different posture.
- **`REAL_SCRIPT_CORPUS_DIR`** — set nowhere in `.github/` (CLAUDE.md is
  explicit). On the owner's machine — the only machine where it is set, and the
  machine most likely to run this tool before a push — `test:ci-env` would run
  the corpus suite CI never runs.
- **`GITHUB_TOKEN` / `HONESTY_AUDIT_REPO`** — set only on the honesty-audit
  step, not ambiently. `env | grep GITHUB_TOKEN` in **this very sandbox**
  returns a value: the tool passes it through into a run it calls "the runner
  env", and `tests/core/honesty-audit-claims.test.ts` spawns the audit script
  with full inheritance (§5).

`docs/LANE_STANDARD.md` §4 now tells every future lane the command "replicates
the GitHub Actions push-to-main runner's environment". Per LANE_STANDARD §2
("copy tells the truth"), either subtract the vars CI does not set — a
`DELETE = ['GEMINI_API_KEY', 'REAL_SCRIPT_CORPUS_DIR', 'HONESTY_AUDIT_REPO',
'GITHUB_TOKEN', 'GH_TOKEN', 'PUSH_BEFORE_SHA']` loop beside the additive block,
with the one-line reason each — or say in both docs that it adds the runner's
vars without removing yours. Subtraction is the better version; it is the same
four lines and it makes the tool's name true.

### MEDIUM — 4. The same class survives in the same file, twenty lines from the fix

`tests/scripts/report-unverified-gates.test.ts:660` (the `NODE_TEST_CONTEXT`
poison test) still spawns the reporter with `env: { ...process.env,
NODE_TEST_CONTEXT: 'child-v8' }`, inheriting `RUN_E2E` on the runner. It is
inert **today** only because its three assertions read `[RAN]
tests/core/public-benchmark.test.ts` and the mutation line, not the `[SKIPPED]`
section — i.e. the same accident that kept it green is the one that failed
twenty lines up. `CLEAN_GATE_ENV` is already defined in the file; the fix is
`env: { ...CLEAN_GATE_ENV, NODE_TEST_CONTEXT: 'child-v8' }`. The brief asked
for the class, and a miss inside the edited file is the cheapest possible one
to close.

### LOW / noted — 5. The rest of the class, audited (non-blocking)

The brief's `grep -rn "process.env" tests/ | grep -iE "spawn|exec"` is
line-scoped and finds **none** of the real sites (all 24 hits are
`DOCTOR_POOL_EAGER_RESPAWN` assignments). The audit that finds them is
`grep -rln -E "spawnSync\(|execFileSync\(|execSync\(|\bspawn\(" tests/` — 18
files, 32 call sites. Judged against what the runner actually exports
(`CI`, `GITHUB_*`, `RUN_E2E`, `GIT_SHA`, `NODE_TEST_CONTEXT`):

- `tests/core/check-scoring-receipt.test.ts:94` — `{ ...process.env, CI: '' }`
  spawning the **same guard**. Inert only because every caller passes an
  explicit range, so `resolveDefaultRange()` is never reached. One range-less
  call site away from the bug just fixed.
- `tests/core/honesty-audit-claims.test.ts:35` — `spawnSync('node', [SCRIPT],
  { cwd })`, no `env` at all, over a throwaway fixture tree. Inert only because
  `HONESTY_AUDIT_REPO` is not ambient; `GITHUB_TOKEN` *is* ambient in this
  sandbox, so the repo-metadata lane is one env var away from making a unit
  test hit the network.
- `scripts/report-unverified-gates.mjs:459` (`runSuiteDefault`) — spreads
  `process.env` and deletes only `NODE_TEST_CONTEXT`; same shape, already
  carrying the precedent comment for why subtraction matters.
- `tests/core/rebuild-experiment.test.ts`, `tests/core/public-benchmark-limits.test.ts`,
  `tests/scripts/verify-report.test.ts`, `tests/scripts/vite-cache-dir.test.ts`,
  `tests/scripts/owner-measure-e2e.test.ts`, `tests/core/rate-limit-verification-override.test.ts`,
  `tests/core/runtime-limits.test.ts`, `tests/e2e/journeys.test.ts` — inherit,
  but the scripts they drive read no env the runner sets ambiently (verified by
  grepping each target's `process.env` reads). Latent, not live.

None of these blocks: the runner's own TAP says exactly two files were red, and
`test:ci-env` is now the standing instrument for the rest. They belong in the
report's "what was NOT done" section, which today says only that the full suite
was not run under the replicated env.

### LOW — 6. Two small things in `test-ci-env.mjs`

Each run leaves an `mkdtemp` directory behind (never removed). On a detached
HEAD it sets `GITHUB_REF=refs/heads/<40-hex>`, which Actions never produces;
harmless today (nothing reads `GITHUB_REF`), wrong if something starts to.

## 5. What a stronger version would have done

The lane found a real bug and told the truth about it, including the honest
distinction between "the leak" and "the bug the leak exposed" — that paragraph
is the best thing in the report. The stronger version differs in one move: it
would have written the failing test **before** hardening the env, so that the
`refExists()` fix was pinned by a case that sets `GITHUB_EVENT_PATH`
deliberately — a push payload whose `before` is a syntactically valid, absent
SHA — instead of by the accident of a leak that the same commit then removed.
That single test is where findings 1 and 2 meet: writing it forces the author
to answer "and what *should* happen when `before` does not resolve?", which is
the question that surfaces the `origin/main...HEAD` fall-through and the green
build hiding behind it. Everything else here is in scope and cheap; that one
test is the difference between a fix and a fixed *class*. The sweep of the
remaining inherited-env spawn sites (§5) and a `test:ci-env` that subtracts as
well as adds are the same instinct applied twice more.

---

## VERDICT: REVISE

1. **Pin the `refExists()` fix with a test that fails without it.** Add a case
   to `tests/core/scoring-receipt-guard.test.ts` that sets `GITHUB_EVENT_PATH`
   explicitly (not via leakage) to a push payload whose `before` is a valid but
   absent 40-hex SHA, and assert the guard's behaviour. Show it red with
   `${ref}^{commit}` reverted and green with it — as of `156a1ca6`, reverting
   that one line leaves 24/24 + 8/8 green under both environments.
2. **Do not let an unresolvable `before` fall through to `origin/main...HEAD`.**
   In `resolveDefaultRange()`'s push branch, a `before` that is present,
   non-zero and unresolvable must take the `NO BASE REF` path (exit 1 under
   CI), not the same-commit range that prints "OK". Reproduce case B above
   (unreceipted `doctor.ts` change, exit 0 today) as the fail-first, and cover
   the all-zeros first-push case stays lenient as it is now.
3. **Make `test:ci-env` subtract as well as add**, and match the copy: remove
   `GEMINI_API_KEY`, `REAL_SCRIPT_CORPUS_DIR`, `HONESTY_AUDIT_REPO`,
   `GITHUB_TOKEN`/`GH_TOKEN` (alongside `PUSH_BEFORE_SHA`) with the one-line
   reason each, or state plainly in `docs/LANE_STANDARD.md` §4 and
   `ARCHITECTURE.md` §9 that it adds the runner's variables without removing
   the caller's.
4. **Close the same-class site in the edited file**:
   `tests/scripts/report-unverified-gates.test.ts:660` should build its child
   env from `CLEAN_GATE_ENV`, not `process.env`.

Optional, not blocking, but worth a paragraph in the report's §5: the remaining
inherited-env spawn sites listed in §5 above (with the grep that actually finds
them), and the two small `test-ci-env.mjs` nits in finding 6.

---

# Round 2 (4c92674f)

Reviewed object: `lane/ci-env-failures` @ `4c92674f2b4a…` (`4c92674f`), diff
`git diff 156a1ca6..4c92674f`. Warm re-check of the four round-1 items by the
same reviewer, per LANE_STANDARD §6. Everything below was re-measured here, not
read off the lane's report.

**VERDICT: REVISE (1 item, documentation).** All four code items are done, and
done at the right level — every fix is now pinned by a test that fails without
it, isolated one line at a time, and every number in the lane's round-2 gate
table reproduces exactly. The one blocker is in the report: item 1's evidence
block contains two contradictory readings of the same command, and the one
that would be read first is false.

## Per-item verdicts

| # | round-1 item | round-2 verdict |
|---|---|---|
| 1 | Pin the `refExists()` fix with a test that fails without it | **DONE.** The new test sets `GITHUB_EVENT_PATH` deliberately (via `runGuard`, not leakage) to a payload whose `before` is a valid-but-absent 40-hex SHA and asserts the guard's own text — `NO BASE REF`, `FAILING because CI is set` — plus `doesNotMatch(/Invalid revision range\|git diff failed/)`, which is the right assertion: the old crash was also exit 1, so an exit-code-only test would have passed for the wrong reason. Reverting only `${ref}^{commit}` → `ref` on the round-2 tree: **24/26, exactly tests 8 and 9 red**, everything else green. |
| 2 | Don't let an unresolvable `before` fall through to `origin/main...HEAD` | **DONE, and wider than asked.** `if (!refExists(before)) return null;` in the push branch. Reverting only that line back to the round-1 shape (keeping `^{commit}`): **25/26, exactly test 9 red** — the isolation is clean. Re-driving my round-1 case B (throwaway repo, `origin/main == HEAD`, real unreceipted `doctor.ts` change, unresolvable wired `before`): **exit 1 with `NO BASE REF … FAILING because CI is set`**, where round 1 printed `no scoring-path files changed. OK.` and exited 0. The non-hex `before` case (case D, the pre-existing hole I flagged as *not* this lane's fault) is now closed too: exit 1 on the same input that was green on `main` and on round 1. |
| 3 | Make `test:ci-env` subtract as well as add | **DONE.** `DELETE_FROM_RUNNER_ENV` carries all six keys I named (`PUSH_BEFORE_SHA`, `GEMINI_API_KEY`, `REAL_SCRIPT_CORPUS_DIR`, `HONESTY_AUDIT_REPO`, `GITHUB_TOKEN`, `GH_TOKEN`), each with its own reason, and the tool prints what it actually removed. Live in this sandbox: `removed from the caller's env (the runner does not carry these): GITHUB_TOKEN, GH_TOKEN`. Checked against `.github/workflows/ci.yml`: the `Run tests` step's `env:` block is exactly `RUN_E2E` + `GIT_SHA`; `GEMINI_API_KEY` appears only on `Build`, `HONESTY_AUDIT_REPO`/`GITHUB_TOKEN` only on `Honesty string audit`, `PUSH_BEFORE_SHA` only on the receipt step — the subtraction list matches the workflow. Finding 6 folded in: scratch dir removed in a `finally` (verified `ls -d /tmp/ci-env-repro-*` = 0 before and after a run), and `GITHUB_REF` no longer embeds a raw SHA. |
| 4 | Close the same-class site in the edited file | **DONE.** `tests/scripts/report-unverified-gates.test.ts:660` builds from `CLEAN_GATE_ENV`. The 18-file spawn/exec audit in the report matches my own enumeration file for file, and each disposition I spot-checked is accurate. |

## Reproduced numbers (round 2, this reviewer)

| run | result |
|---|---|
| `tests/core/scoring-receipt-guard.test.ts` + `tests/scripts/report-unverified-gates.test.ts` + `tests/core/check-scoring-receipt.test.ts`, plain sandbox env | **76/76**, exit 0 |
| `npm run test:ci-env -- <the two target files>` | exit 0, **68/68**; removal line printed; `HEAD` still on `lane/ci-env-failures`, `git status --porcelain` 0 lines; `/tmp/ci-env-repro-*` count 0 before and 0 after |
| `^{commit}` reverted, nothing else (item 1 fail-first) | **26 tests / 24 pass / 2 fail** — `not ok 8`, `not ok 9` |
| only `return null` reverted to the round-1 shape (item 2 fail-first) | **26 / 25 / 1** — `not ok 9` only |
| pristine `4c92674f` | **26 / 26 / 0** |
| guard driven: unresolvable `before` + unreceipted `doctor.ts` change | exit 1, `NO BASE REF` — round 1 was exit 0 `… no scoring-path files changed. OK.` |
| guard driven: real `before`, same repo (control) | exit 1, `SCORING-PATH CHANGE WITHOUT A VALID MEASUREMENT RECEIPT` — still catches it |
| guard driven: all-zeros sentinel (`before` = 40 zeros) | `range "origin/main...HEAD" … OK.` exit 0 — **unchanged**, the branch-creating push stays lenient |
| guard driven: `pull_request` event with the same payload | `origin/main...HEAD`, exit 0 — the PR path is untouched |
| `npm run lint` | exit 0 |

## The one blocker

### R2-1 (MUST FIX, report only) — item 1's evidence block contradicts itself, and the first reading is false

`ci-env-lane-report.md` §"Round 2 / 1. Pinned `refExists()`…" prints:

```
$ node --experimental-strip-types --test tests/core/scoring-receipt-guard.test.ts   # ^{commit} reverted
# tests 26 / # pass 26 / # fail 0
```

followed by "(26, not the reviewer's 24 … both included, **both green on the
reverted line**…)". Twenty lines later the same file prints the same command
with the same revert as `# tests 26 / # pass 24 / # fail 2`, tests 8 and 9 red.

The second block is the true one — I measured it independently (24/26, exactly
those two). The first block, taken at face value, says the two new tests pass
with the fix reverted, which would mean item 1 did not pin anything; it reads
like the pristine run mislabelled. LANE_STANDARD §5 makes the report part of
the deliverable, and this contradiction sits inside the fail-first evidence for
the exact item the round was about. Fix: delete or correct that block and its
parenthetical so the section states one number — on the round-2 tree with
`^{commit}` reverted, 24/26, tests 8 and 9 red — and, if the round-1-tree
reproduction (24/24 green, the reviewer's number, before the new tests existed)
is worth keeping, label it as the round-1 tree explicitly.

## Not blocking, but worth folding in if the file is reopened

- **The `NO BASE REF` copy now renders in a state it does not describe.** The
  message says "no push range, no origin/main, no main, no prior commit" and
  advises "fix the checkout (fetch-depth: 0)". In the new null case, verified
  above, `origin/main` exists and the checkout is already `fetch-depth: 0` —
  the real cause is that the push's recorded `before` is not an object in this
  checkout (rewritten history, a force-push after `gc`, a stale
  `PUSH_BEFORE_SHA`). One `console.error` naming the unresolved SHA before
  returning `null` would make the sentence true in every state that renders it
  (LANE_STANDARD §2). Not a blocker: the gate's *behaviour* is now right and
  loud, and the message is no worse than `main`'s (which crashes with a stack
  trace on the same input).
- **Posture note for the orchestrator, not a defect:** after this change a push
  whose `before` cannot be resolved fails the receipt step by design. That is
  not a regression against `main` — the same input crashes there, also exit 1 —
  but it does mean a force-pushed branch (a rebase pushed with `--force`) can
  now go red with `NO BASE REF` on a push that carries no scoring change at
  all. A strictly stronger version would refuse only when the fall-through
  range would be degenerate (`origin/main == HEAD`, i.e. a push to main) and
  otherwise use `origin/main...HEAD`, which for a rebased lane branch is the
  honest, checkable range. Out of scope for this lane; worth a line in the
  decision log if force-pushes are part of the merge flow.

## The two out-of-scope latent risks do not block — why

Neither can flip a CI verdict today, and the test that would notice if they
ever could now exists:

- `tests/core/check-scoring-receipt.test.ts:94` spawns the same guard with
  `{ ...process.env, CI: '' }`. Every one of its call sites passes an explicit
  `range` argument, and `main()` uses `explicitRange || resolveDefaultRange()`
  — so the leaked `GITHUB_EVENT_NAME`/`GITHUB_SHA`/`GITHUB_EVENT_PATH` are
  never read at all on that path, and `CI: ''` is falsy so the CI branch is
  dead too. No assertion in the file has an outcome any ambient variable can
  change. Verified green here under the replicated runner env (part of the
  76/76 above).
- `tests/core/honesty-audit-claims.test.ts:35` spawns `honesty-audit.mjs` with
  no `env`. That script reads exactly three variables: `HONESTY_AUDIT_REPO`
  (which gates the entire repo-metadata lane) and, only inside that lane,
  `GITHUB_TOKEN`/`GH_TOKEN`. `HONESTY_AUDIT_REPO` is set on ci.yml's honesty
  step alone, never on `Run tests`, and is unset in this sandbox — so the lane
  never runs and the token is never read. The leak is real but unreachable.

Both are one env var from becoming live, which is precisely what `test:ci-env`
now covers: it subtracts `HONESTY_AUDIT_REPO`, `GITHUB_TOKEN` and `GH_TOKEN`,
so even on the owner's machine a green run there cannot be hiding them.
Recording them in the report's disposition table, as this round does, is the
right disposition — a lane should not grow to cover files neither the brief nor
the review named.

## VERDICT: REVISE

1. **R2-1 — correct item 1's contradictory evidence block in
   `ci-env-lane-report.md`** so the section reports the measured number once
   (`^{commit}` reverted on the round-2 tree = 24/26, tests 8 and 9 red), and
   label the round-1-tree 24/24 reproduction as such if it is kept. No code
   change is requested; the four code items are all MERGE-grade and verified
   above.
