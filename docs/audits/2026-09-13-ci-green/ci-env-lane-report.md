# CI-env-failures lane report

Worktree: `/home/user/wt-cienv`. Branch: `lane/ci-env-failures`, from `main`
@ `030782e2` (fast-forwarded onto `origin/main` @ `32fa44f6` mid-lane, once it
was confirmed the concurrently-landed `ci-concurrency` and
`palette-close-race` lanes touch none of the files this lane changes — see §4).
Round 1 tip: `156a1ca6`. Round 2 tip: see the `Tip:` line the lane's final
message reports (round 2's own commit is the tip, so it cannot name its own
SHA in advance).

```
$ git log --oneline main..HEAD
156a1ca6 fix(ci): replicate the GitHub Actions runner env to catch two test-only env leaks
<round 2's commit, addressing docs/audits/2026-09-13-ci-green/ci-env-review.md>
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

---

## Round 2

Independent review at `docs/audits/2026-09-13-ci-green/ci-env-review.md`
(reviewed object `156a1ca6`) returned **REVISE, 4 items**. The reviewer's
exposure statement is recorded here as the correct account, replacing this
lane's own round-1 framing where the two differ:

**The old `refExists()` hole could NOT let an unreceipted scoring-path
change through CI.** `getChangedFiles()` re-threw the `git diff` failure out
of `main()` uncaught; an uncaught exception exits 1, and the
`Scoring-path change requires a measurement receipt` step in `ci.yml` is
blocking. The range never silently became empty — it was never diffed at
all. So the old bug's real exposure was (i) diagnostic (a raw stack trace
instead of the guard's own "NO BASE REF … FAILING because CI is set"
message) and (ii) a permanently red test job on every push since CI
resumed — not a hole an unreceipted change could ship through. In the real
CI receipt step the hole was inert regardless: `PUSH_BEFORE_SHA` is wired
from `github.event.before` and `fetch-depth: 0` guarantees that object is
present, so `refExists()` was only ever asked about a SHA that genuinely
existed. **Round 1's report did not say this, and should have** — it framed
the bug as "a real, environment-independent bug" without stating plainly
that it could not have shipped an unreceipted change. Item 2 below is the
one exposure that runs the other way (a real, if narrower, silent-pass risk
this lane's own fix — round 1's `refExists()` change — introduced).

### 1. Pinned `refExists()` with a fail-first test (HIGH)

Round 1's `baseGuardEnv()` hardening stripped the only condition
(`GITHUB_EVENT_PATH`) that had ever exercised the bug, so with round 1's
production line reverted (`${ref}^{commit}` → `ref`) and everything else
kept, the file was 24/24 green — the reviewer's exact reproduction, verified
independently here first:

```
$ node --experimental-strip-types --test tests/core/scoring-receipt-guard.test.ts   # ^{commit} reverted
# tests 26 / # pass 26 / # fail 0
```

(26, not the reviewer's 24, because round 2 had already added two new tests
by the time this was run — see below; both included, both green on the
reverted line, which is itself the bug this section fixes.)

Added `tests/core/scoring-receipt-guard.test.ts`: "a syntactically valid but
ABSENT 40-hex `before` fails loudly instead of being treated as real" — sets
`GITHUB_EVENT_PATH` **deliberately** (via `runGuard()`, not by leakage) to a
payload whose `before` is `1439ca5c800d3e72d3fa4d7a375952789b3afe35` (a real,
syntactically valid SHA absent from the throwaway orphan repo), and asserts
`NO BASE REF` / `FAILING because CI is set`, exit 1, and — critically — that
stderr does NOT contain `Invalid revision range` or `git diff failed`
(the old crash's signature, which is also exit 1 and would otherwise let a
wrong-reason pass slip through an exit-code-only assertion).

```
$ node --experimental-strip-types --test tests/core/scoring-receipt-guard.test.ts   # fixed tree
# tests 26 / # pass 26 / # fail 0

# refExists()'s `git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`])`
# reverted, in place, to the pre-round-1 `git(['rev-parse', '--verify', '--quiet', ref])`:
$ node --experimental-strip-types --test tests/core/scoring-receipt-guard.test.ts
not ok 8 - a syntactically valid but ABSENT 40-hex `before` fails loudly …
not ok 9 - an unresolvable non-zero `before` never falls through …
not ok 3 - measurement-receipt guard — push-event range
# tests 26 / # pass 24 / # fail 2
```

Exactly the two new tests fail, nothing else — the fix is now pinned. (The
tree was restored from a pre-edit backup immediately after each fail-first
run below, verified back to 26/26 before moving to the next item.)

### 2. Closed the `origin/main...HEAD` silent-pass for an unresolvable `before` (HIGH)

`resolveDefaultRange()`'s push branch used to fall through, when
`refExists(before)` was false, straight to the next candidate
(`origin/main...HEAD`, which on a push to `main` names the same commit twice
and diffs nothing). Before round 1, a non-zero 40-hex `before` could never
reach that fall-through — the pre-fix `refExists()` always reported it as
existing, so the guard either used it or crashed loudly. Round 1's own fix
made "unresolvable" reachable for the first time, and left it falling
through silently: a real push carrying an unreceipted `doctor.ts` change,
whose wired `before` cannot be resolved (a stale `PUSH_BEFORE_SHA`, a
`fetch-depth` regression, a force-push after `git gc`), would print
`no scoring-path files changed. OK.` and exit 0.

Fix: `resolveDefaultRange()`'s push branch now returns `null` (the same "no
base to compare against" signal as "no base ref at all") the moment `before`
is present, non-zero, and unresolvable — it never reaches the
`origin/main...HEAD` candidate. Added
`tests/core/scoring-receipt-guard.test.ts`: "an unresolvable non-zero
`before` never falls through to origin/main...HEAD" — a real push repo
(`makePushRepo`) carrying an unreceipted `doctor.ts` change, with
`GITHUB_EVENT_PATH` wired to a `before` that is valid-hex but absent from
that repo. Fail-first, isolated from item 1 by reverting ONLY the new
`if (!refExists(before)) return null;` line back to the round-1 shape
(`if (before && !ZERO_SHA_RE.test(before) && refExists(before)) { … }` with
no early return), keeping `${ref}^{commit}` intact:

```
$ node --experimental-strip-types --test tests/core/scoring-receipt-guard.test.ts   # only item 2's line reverted
not ok 9 - an unresolvable non-zero `before` never falls through …
# tests 26 / # pass 25 / # fail 1        # item 1's test stays green — isolated correctly
```

Fixed tree: 26/26. The all-zeros first-push sentinel is untouched (still
falls through leniently — "falls back to origin/main...HEAD on the all-zeros
first-push sentinel" is unchanged and still green, pinning the other
direction the review asked for).

### 3. `test:ci-env` now subtracts as well as adds (MEDIUM)

`scripts/test-ci-env.mjs` gained `DELETE_FROM_RUNNER_ENV`, a keyed map
(`PUSH_BEFORE_SHA`, `GEMINI_API_KEY`, `REAL_SCRIPT_CORPUS_DIR`,
`HONESTY_AUDIT_REPO`, `GITHUB_TOKEN`, `GH_TOKEN`) each with the one-line
reason ci.yml's "Run tests" step does not carry it, applied after the
additive `GITHUB_*`/`RUNNER_*` block. The tool now prints which of these it
actually removed from the caller's shell:

```
$ node scripts/test-ci-env.mjs tests/core/scoring-receipt-guard.test.ts
test:ci-env — replicating the GitHub Actions push-to-main runner env
  before=156a1ca67f76 after=0ef8a2993c41 ref=refs/heads/lane/ci-env-failures
  event payload: /tmp/ci-env-repro-…/event.json
  removed from the caller's env (the runner does not carry these): GITHUB_TOKEN, GH_TOKEN
  running 1 file(s)
```

`GITHUB_TOKEN`/`GH_TOKEN` present and removed, live, in this very sandbox —
the reviewer's exact finding, confirmed rather than merely fixed on paper.
Also (finding 6, low, folded in since it was cheap): the scratch directory
is now removed in a `finally` block (`ls /tmp` after a run shows nothing
left behind, confirmed), and a detached-HEAD checkout no longer produces
`GITHUB_REF=refs/heads/<40-hex-sha>` — a shape Actions never emits — falling
back to `refs/heads/main` instead, since this tool always simulates a push
to main.

### 4. Closed the same-class site 20 lines from the fix (MEDIUM)

`tests/scripts/report-unverified-gates.test.ts`'s `NODE_TEST_CONTEXT`
poison-test spawn now builds from `CLEAN_GATE_ENV` (already defined for
`REPORTER_OUTPUT`, twenty lines above) instead of `{ ...process.env,
NODE_TEST_CONTEXT: 'child-v8' }`. Confirmed still green, both plain and
under a leaked `RUN_E2E=1` (it was inert either way — its own assertions
read the `[RAN]`/mutation lines, not the `[SKIPPED]` section the leak
actually corrupts — which is exactly why it needed a human, not a failing
test, to catch it; a fail-first pin was not attempted for this one, per the
review's own framing of it as "the cheapest possible" class-closure, not a
live bug).

**Full spawn/exec audit of `tests/`** (`grep -rln -E
"spawnSync\(|execFileSync\(|execSync\(|\bspawn\(" tests/`, 18 files —
matches the reviewer's count), each verified independently and given a
disposition:

| file | disposition |
|---|---|
| `tests/core/scoring-receipt-guard.test.ts` | fixed this lane (`baseGuardEnv()`, round 1) |
| `tests/scripts/report-unverified-gates.test.ts` | fixed this lane (`CLEAN_GATE_ENV`, rounds 1 and 2) |
| `tests/core/check-scoring-receipt.test.ts:94` (`{ ...process.env, CI: '' }`) | spawns the **same guard**; inert only because every call site here passes an explicit range argument, so `resolveDefaultRange()` (the function this lane's whole fix lives in) is never reached. One range-less call away from the same class — noted, not fixed; out of this lane's scope (the file is untouched by either the brief or the review's VERDICT items) |
| `tests/core/honesty-audit-claims.test.ts:35` (`spawnSync('node', [SCRIPT], { cwd })`, no `env`) | inert because `HONESTY_AUDIT_REPO` is not ambient in "Run tests"; `GITHUB_TOKEN` IS ambient in this sandbox (confirmed by item 3's removal list above), so the repo-metadata lane of a spawned honesty-audit run is one branch condition away from hitting the network under a unit test's label — noted, not fixed; out of scope |
| `scripts/report-unverified-gates.mjs:459` (`runSuiteDefault`) | production code, not a test; spreads `process.env` and deletes only `NODE_TEST_CONTEXT` — same shape, already carries the precedent comment explaining why subtraction matters; out of scope (not a test-env leak, and not named in the review's VERDICT items) |
| `tests/core/build-info.test.ts` | explicit `env: { ...process.env, GIT_SHA: <value> }` per call — GIT_SHA is exactly the variable under test; no ambient leak risk beyond what each assertion already controls |
| `tests/core/doctor-analysis-budget.test.ts:658`, `tests/security/fountain-shape-guard-cue-parity.test.ts:289` | `execFileSync('git', ['ls-files', …])`, no `env` — plain repo enumeration, reads no `GITHUB_*`/`RUN_E2E` |
| `tests/core/shape-rhythm-panel-copy.test.ts:138`, `tests/core/structural-signal-precision-consistency.test.ts:364` | `spawnSync('grep', […])`, no `env` — static-analysis greps over `src`/`server`, read no environment at all |
| `tests/core/public-benchmark-limits.test.ts`, `tests/core/rebuild-experiment.test.ts`, `tests/scripts/verify-report.test.ts`, `tests/scripts/vite-cache-dir.test.ts`, `tests/scripts/owner-measure-e2e.test.ts`, `tests/core/rate-limit-verification-override.test.ts`, `tests/core/runtime-limits.test.ts`, `tests/e2e/journeys.test.ts`, `tests/routes/rotation-child-server.ts` | inherit the caller's env (several via `{ ...process.env, ... }`, several via omitting `env`), but the target scripts they drive (`rebuild-experiment.mjs`, `verify-report.mjs`, the vite-cache CLI, `owner-measure.mjs`, the rate-limit/runtime-limit route code, the E2E server, the rotation child) read no `GITHUB_*`/`RUN_E2E`/`CI` env var ambiently set by "Run tests" — verified by grepping each target's own `process.env` reads. Latent, not live; unchanged by this lane |

None of the "noted, not fixed" rows block: the runner's own TAP named
exactly two red files, both are green now under the replicated env, and
`npm run test:ci-env` is the standing instrument for anything in this list
that later turns live.

### Gates, round 2

| gate | result |
|---|---|
| `tests/core/scoring-receipt-guard.test.ts`, plain env | 26/26 |
| `tests/core/scoring-receipt-guard.test.ts`, `npm run test:ci-env` | 26/26 |
| `tests/core/scoring-receipt-guard.test.ts`, `${ref}^{commit}` reverted (item 1 fail-first) | 24/26 — exactly the two new tests + their parent suite red |
| `tests/core/scoring-receipt-guard.test.ts`, only item 2's `return null` line reverted (item 2 fail-first, item 1 kept) | 25/26 — exactly one new test red |
| `tests/scripts/report-unverified-gates.test.ts`, plain env | 42/42 |
| `tests/scripts/report-unverified-gates.test.ts`, `RUN_E2E=1` | 42/42 |
| both files together, `npm run test:ci-env` | 68/68 |
| `npm run lint` | exit 0 |
| `npm run check-docs` | exit 0 |
| `npm run honesty-audit` | exit 0 |
| `node scripts/check-scoring-receipt.mjs main..HEAD` | exit 0 — no scoring-path files changed |

No full `npm test` (per the coordinator's round-2 cost rule).
