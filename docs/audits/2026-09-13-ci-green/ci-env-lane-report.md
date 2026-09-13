# CI-env-failures lane report

Worktree: `/home/user/wt-cienv`. Branch: `lane/ci-env-failures`, from `main`
@ `030782e2` (fast-forwarded onto `origin/main` @ `32fa44f6` mid-lane, once it
was confirmed the concurrently-landed `ci-concurrency` and
`palette-close-race` lanes touch none of the files this lane changes — see §4).

```
$ git log --oneline main..HEAD
<this lane's commit(s) — see the final message's Tip line>
```

## 1. What the thing IS

The brief's finding was real and reproduces deterministically: `npm test` was
green on this sandbox (14,000 tests, 0 failures, three runs) and red on the
GitHub Actions runner on exactly two files, every push-to-main run since CI
resumed. Both failures are the SAME class of bug — a test (or the script it
exercises) built a child process's environment by spreading the outer
`process.env`, so it silently inherited whatever GitHub Actions sets
ambiently for a `push`-event job step. Neither leak can reproduce on this
sandbox, because this sandbox's own `process.env` never carries `GITHUB_*`
or `RUN_E2E` — which is exactly why "0 failures locally" proved nothing
about the runner. One of the two also uncovered a second, independent, real
bug in `scripts/check-scoring-receipt.mjs` itself (a `git rev-parse --verify`
gotcha) that the env leak merely exposed rather than caused.

## 2. Reproduction

A full clone (`git clone /home/user/STORYMACHINE`, then
`git checkout --detach origin/main`, matching `actions/checkout`'s actual
checkout shape) with `node_modules` symlinked back to the sandbox's install,
run with this env battery (`/tmp/ci-env-repro/env.sh`, reconstructed as
`scripts/test-ci-env.mjs` below):

```
GITHUB_ACTIONS=true CI=true GITHUB_EVENT_NAME=push
GITHUB_SHA=<HEAD> GITHUB_REF=refs/heads/main GITHUB_REF_NAME=main
GITHUB_REF_TYPE=branch GITHUB_REPOSITORY=sergey9519546/STORYMACHINE
GITHUB_WORKFLOW=CI GITHUB_RUN_ID=<n> GITHUB_RUN_NUMBER=1
GITHUB_ACTOR=<actor> GITHUB_WORKSPACE=<repo> GITHUB_EVENT_PATH=<event.json>
RUNNER_OS=Linux RUNNER_TEMP=<dir> TZ=UTC LANG=C.UTF-8
RUN_E2E=1 GIT_SHA=<HEAD>          # ci.yml's "Run tests" step-level env
```

(`event.json` = `{"before": "<HEAD~1>", "after": "<HEAD>", "ref":
"refs/heads/main", "repository": {"full_name": "sergey9519546/STORYMACHINE"}}`
— a real push-shaped payload built from the repo's own last two commits.
`PUSH_BEFORE_SHA` deliberately left UNSET: it is wired only into the
separate `check-scoring-receipt`/`Report unverified gates` CI steps, never
into "Run tests" — that asymmetry is exactly what makes the real leak
(`GITHUB_EVENT_PATH`, not `PUSH_BEFORE_SHA`) reproducible.)

```
$ node --experimental-strip-types --test tests/core/scoring-receipt-guard.test.ts
...
not ok 8 - FAILS under CI when there is no base ref at all (an absent check must not be green)
  location: .../tests/core/scoring-receipt-guard.test.ts:663:3
  error: fatal: Invalid revision range 1439ca5c800d...35..030782e260d9...1
not ok 3 - measurement-receipt guard — push-event range
  location: .../tests/core/scoring-receipt-guard.test.ts:453:1
  error: '1 subtest failed'
```

Byte-identical shape to the CI TAP in the brief:
`not ok 1166 - measurement-receipt guard — push-event range,
location: tests/core/scoring-receipt-guard.test.ts:453:1`.

```
$ RUN_E2E=1 node --experimental-strip-types --test tests/scripts/report-unverified-gates.test.ts
...
not ok 4 - the E2E journeys gate expires 2026-10-15
not ok 5 - the real gate list
  location: .../tests/scripts/report-unverified-gates.test.ts:164:1
  error: '1 subtest failed'
```

Byte-identical to the brief's `not ok 2702 - the real gate list, location:
tests/scripts/report-unverified-gates.test.ts:164:1`. Both env variables
named below, individually: dropping either restores green.

## 3. The two root causes, and the variable(s) that flip each

### 3a. `scoring-receipt-guard.test.ts` — `GITHUB_EVENT_PATH` (ambient on every step) exposes a real bug in `refExists()`

The failing test spawns the guard over an ORPHAN throwaway repo (one commit,
no `origin/main`) with `env: { ...process.env, CI: '1', GITHUB_EVENT_NAME:
'push' }` — it does not set `PUSH_BEFORE_SHA`, `GITHUB_SHA`, or
`GITHUB_EVENT_PATH`, so all three leak straight through from the OUTER
environment. On the runner, `GITHUB_EVENT_PATH` is always set and points at
the real push event for the actual commit being tested — a real, syntactically
valid 40-hex SHA, `1439ca5c…`, that does **not** exist as an object in the
orphan throwaway repo.

`check-scoring-receipt.mjs`'s `pushEventBeforeSha()` falls back to
`GITHUB_EVENT_PATH` when `PUSH_BEFORE_SHA` is empty (by design — that
fallback is itself the fix for a prior hole), reads that real `before` SHA,
and hands it to `refExists()`:

```js
function refExists(ref) {
  try {
    git(['rev-parse', '--verify', '--quiet', ref]);
    return true;
  } catch { return false; }
}
```

**This is a genuine, environment-independent bug**, reproduced directly:

```
$ git rev-parse --verify --quiet 1439ca5c800d3e72d3fa4d7a375952789b3afe35
1439ca5c800d3e72d3fa4d7a375952789b3afe35
$ echo $?
0
```

`git rev-parse --verify` on a syntactically valid full-length hex string
returns success and echoes it back WITHOUT checking the object database — it
only actually resolves an object when the ref needs disambiguation.
`refExists()` therefore reports "exists" for a commit that plainly does not.
`resolveDefaultRange()` then builds `<fake-before>..<head>`, and
`git diff --name-only` on that range dies with `fatal: Invalid revision
range`, an **uncaught exception this script never handles** — a raw Node
stack trace on stderr instead of the intended `NO BASE REF` /
`FAILING because CI is set` message the test expects.

**Fix (at the cause):** `scripts/check-scoring-receipt.mjs`'s `refExists()`
now verifies `` `${ref}^{commit}` ``, which forces git to actually dereference
the object:

```
$ git rev-parse --verify --quiet 1439ca5c800d3e72d3fa4d7a375952789b3afe35^{commit}
$ echo $?
1
```

With that fixed, the leaked fake `before` is correctly treated as
non-existent, `resolveDefaultRange()` falls through its existing chain
(`origin/main` → local `main`/`HEAD~1` → null) exactly as the orphan-repo
test expects, and the crash cannot recur for ANY caller of `refExists()`
(also used for `origin/main`, `main`, `HEAD~1`, and the `GITHUB_SHA` head
candidate), not just this one leaked value.

**Test hardening (defense in depth, per item 2):** the same test — and
`runGuard()`, the helper most of the file's other tests share — built env
with `{ ...process.env, CI: '1', ...overrides }`, which only neutralizes the
keys a given call bothers to override. Every push-event-relevant key
(`PUSH_BEFORE_SHA`, `GITHUB_EVENT_PATH`, `GITHUB_EVENT_NAME`, `GITHUB_SHA`) is
now stripped from a `baseGuardEnv()` helper before any override is applied,
so a future test that forgets to override one of these can no longer inherit
a real value from whatever job happens to be running it.

**Variable that flips it:** `GITHUB_EVENT_PATH` alone (ambient on the
runner, absent on the sandbox), combined with the pre-existing `refExists()`
bug. `GITHUB_SHA` also leaks in the same test but is not the deciding factor
(it only matters after `before` is wrongly accepted).

### 3b. `report-unverified-gates.test.ts` — `RUN_E2E=1` (ci.yml's "Run tests" step env) makes a gate self-report as "ran" for the wrong reason

`REPORTER_OUTPUT` is produced by `execFileSync('node', [SCRIPT], { cwd:
REPO_ROOT, encoding: 'utf8' })` — **no `env` key at all**, so Node's
`child_process` default (full inheritance) applies. `report-unverified-gates.mjs`'s
`main()` calls `evaluateGates()` with no options, so `gateRan()` defaults to
reading `process.env` directly:

```js
export function gateRan(g, { env = process.env, root = REPO_ROOT } = {}) {
  if (g.env) return Boolean(env[g.env]);
  ...
}
```

The E2E-journeys gate is keyed on `env: 'RUN_E2E'`. `ci.yml`'s "Run tests"
step — the very step that runs this test file via `npm test` — sets
`RUN_E2E: "1"` for itself. That value leaks into the `execFileSync` child,
so `gateRan()` reports the E2E gate as **"ran"** (satisfied) purely because
the surrounding test harness happens to export that variable for an
unrelated reason — not because the gate's own suite (`tests/e2e/journeys.test.ts`)
was actually verified in this invocation. The gate then never appears in the
`[SKIPPED]` section, so the test's `assert.match(out, /unset:\s+RUN_E2E/)`
and its `expires: 2026-10-15` line both fail to find their text. The
reporter's REAL CI step (`.github/workflows/ci.yml`'s separate "Report
unverified gates" step) is unaffected — GitHub Actions step-level `env:`
blocks do not carry over to later steps in the same job, so `RUN_E2E` is
unset by the time that step runs — this is a leak scoped to the test file's
own self-check, not a defect in the shipped gate report as CI actually runs
it. It is still worth guarding: the whole point of `report-unverified-gates.mjs`
is to distrust "looks satisfied," and this is exactly the false-positive
shape it exists to catch, one layer down.

**Fix:** the module-level `REPORTER_OUTPUT` computation now strips every env
key any `GATES` entry keys off of (`GATES.map(g => g.env)`, generically —
today that is `RUN_E2E` and `REAL_SCRIPT_CORPUS_DIR`) from the child's env
before invoking the script, so a gate added later inherits the same
guarantee without anyone extending a hand-written deny-list.

**Variable that flips it:** `RUN_E2E=1` alone. Confirmed by toggling it in
isolation against an otherwise-identical env (§2's reproduction, run once
with `RUN_E2E` unset — 42/42 pass — and once with `RUN_E2E=1` — the same two
`not ok`s as the runner).

## 4. Fix summary

| file | change |
|---|---|
| `scripts/check-scoring-receipt.mjs` | `refExists()` now checks `` `${ref}^{commit}` ``, so a syntactically-valid-but-nonexistent SHA is correctly reported absent instead of crashing the range resolver with an uncaught `git diff` failure. |
| `tests/core/scoring-receipt-guard.test.ts` | Added `baseGuardEnv()`, which strips `PUSH_BEFORE_SHA`/`GITHUB_EVENT_PATH`/`GITHUB_EVENT_NAME`/`GITHUB_SHA` from the outer env before any test-specific override; `runGuard()` and both raw `spawnSync` call sites in the push-event describe block now build from it instead of `{ ...process.env, ... }`. |
| `tests/scripts/report-unverified-gates.test.ts` | `REPORTER_OUTPUT`'s `execFileSync` now passes an explicit `env` with every `GATES[].env` key deleted, instead of inheriting `process.env` by default. |
| `scripts/test-ci-env.mjs` (new) | `npm run test:ci-env` — replicates the push-to-main runner env (full `GITHUB_*`/`RUNNER_*` battery + `RUN_E2E`/`GIT_SHA`) and runs the full suite or named files under it. |
| `package.json` | `"test:ci-env": "node scripts/test-ci-env.mjs"`. |
| `docs/LANE_STANDARD.md` §4 | A lane runs `npm run test:ci-env` (full or scoped to touched files) before claiming green, with the reasoning above. |
| `ARCHITECTURE.md` §9 | New paragraph on the `test` job's ambient env and `test:ci-env`, beside the existing CI/browser-suite paragraph. |

Each fix is shown failing first under the exact replicated runner env, and
passing after, in §2 above and in the raw TAP files this session produced
(`/tmp/ci-env-repro/run1.tap`…`after2.tap` — scratch, not committed; the
transcript above is the durable record per §7 of this file).

## 5. What was NOT done, and why

- **The real GitHub Actions job was not re-run from here** — item 4 of the
  brief is explicit that the orchestrator reads the real runner after this
  push, not this lane. This report's reproduction is a full local clone under
  the documented env battery, not the runner itself.
- **`git config user.*` was not left unset in the reproduction clone** — the
  sandbox's own global `~/.gitconfig` sets `user.name`/`user.email` (and
  `commit.gpgsign=true` with a signing helper). Every throwaway repo the
  tests themselves create already disables `commit.gpgsign` locally
  (`makePushRepo`/`makeOrphanRepo`), which is what actually matters here;
  investigating whether the sandbox's *global* gpgsign setting differs from
  a bare runner was not pursued further, because it does not bear on either
  reproduced failure (both reproduce with it present, since the throwaway
  repos already neutralize it locally) — see the note in `scripts/test-ci-env.mjs`'s
  header about what full topology fidelity (a scratch clone + `--detach`)
  would still add over the in-place default this tool uses.
- **`git rev-parse --abbrev-ref HEAD` on a detached HEAD** was checked (`HEAD`)
  and confirmed unused by either affected file (`grep -rn abbrev-ref`); it
  matters for `scripts/owner-measure.mjs` and its test, out of this lane's
  scope.

## 6. Gates

| gate | result |
|---|---|
| `tests/core/scoring-receipt-guard.test.ts` under replicated runner env | RED before fix (2 failures) → GREEN after (24/24) |
| `tests/scripts/report-unverified-gates.test.ts` under replicated runner env (`RUN_E2E=1`) | RED before fix (2 failures) → GREEN after (42/42) |
| Same two files, plain sandbox env | GREEN, unchanged (74/74 combined) |
| `npm run lint` | exit 0 |
| `npm run check-no-console` | exit 0 |
| `npm run check-docs` | exit 0 |
| `npm run honesty-audit` | exit 0 |
| `node scripts/check-scoring-receipt.mjs main..HEAD` | exit 0 — "no scoring-path files changed. OK." (`check-scoring-receipt.mjs` is not reachable from `doctor.ts`) |
| `npm run test:ci-env -- tests/core/scoring-receipt-guard.test.ts tests/scripts/report-unverified-gates.test.ts` | exit 0, 66/66 |

No full `npm test` run (per the brief's GATES line — the orchestrator runs it
at merge).
