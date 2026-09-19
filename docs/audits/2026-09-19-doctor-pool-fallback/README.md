# Lane record — doctor-pool-fallback (2026-09-19)

Branch `lane/doctor-pool-fallback`, from `53f6e377`.

Two reliability defects in the product's front door, both named in
`SESSION_REPORT_2026-09-19.md` §4 row 12 (logic audit C9 and C10):

> **Worker load failure never trips the in-process fallback**; a worker that
> cannot import `doctor.ts` 500s every request forever. And once
> `poolDisabled` latches, the Decision #7 wall-clock budget vanishes
> process-wide with no signal.

---

## 1. C9 — property 4 was unreachable for the failure it names

`server/nvm/analyze/doctor-pool.ts`'s header promises:

> **NEVER WORSE THAN BEFORE.** If workers cannot run in this environment at
> all — an exotic loader setup, a locked-down runtime, a bundler that did not
> emit the worker file — the pool disables itself permanently and every call
> runs in-process, exactly as it did before this file existed.

The latch (`poolDisabled = true`) had exactly two triggers: `new Worker()`
throwing, and a `'error'` event on a slot whose `ready` was still false.

Neither fires for the case the sentence names most directly — a worker thread
that *starts* fine and then cannot load the analyzer. `doctor-worker.ts`
wrapped its lazy `await import('./doctor.ts')` in the **same `try/catch` as
the analysis**, so a module-load failure came back as an ordinary per-job
`{type:'error', id}` message:

* `announcedReady` stayed false, so no `ready` message was posted;
* `slot.ready` therefore never flipped;
* no `'error'` event was ever emitted (nothing threw on the thread);
* the pool read it as **one failed script**: it rejected the caller, **kept
  the slot**, and pump() fed it the next request, which failed identically.

The product's front door 500s forever instead of falling back. Property 4's
text was aspirational for the exact environment class it enumerates.

### Measured, pre-change

`scripts/` was not touched; the instrument is a small probe (reproduced in
§5) that imports a given tree's pool and makes two ordinary submissions.
Against a clean `git archive 53f6e377` checkout whose worker's doctor
specifier was rewritten to a module that does not resolve — i.e. exactly
"a bundler that did not emit the module":

```
call 1 outcome:       REJECTED (Error: Cannot find module '.../__doctor_missing__.ts'
                      imported from .../server/nvm/analyze/doctor-worker.ts)
  poolDisabled:       false
  workers:            1
call 2 outcome:       REJECTED (Error: Cannot find module '.../__doctor_missing__.ts' ...)
  poolDisabled:       false
  disabledReason:     null
  workers:            1
  workerRuns:         2
  inProcessRuns:      0
doctor_pool_disabled lines: 0
```

Every symptom the defect predicts: the caller is rejected, the latch stays
open, the broken slot is retained, and the second call repeats it.

### The fix

**`server/nvm/analyze/doctor-worker.ts`** — the module load moves OUT of the
analysis `try/catch` into its own. On failure it posts a distinct
`{type:'load_failed', id, name, message, stack}` and then, on the next turn of
the event loop, exits with `DOCTOR_WORKER_LOAD_FAILED_EXIT` (97).

Two deliberate details:

* **The exit is deferred by one turn** (`setTimeout(..., 0)`), not
  synchronous. The message is the signal the pool acts on; the exit is only
  the backstop for it being lost, and a synchronous `process.exit()` races
  the post.
* **A distinctive exit code, not `!slot.ready`.** A deliberate
  `worker.terminate()` (Cancel, a run-budget kill, a purge, shutdown) exits
  with 1, and `ready` is *also* false for a perfectly healthy worker cancelled
  during its first, cold job. Latching the pool off for a Cancel would be a
  worse defect than the one being fixed, so the `'exit'` backstop keys on the
  code alone.

**`server/nvm/analyze/doctor-pool.ts`** — one shared handler,
`handleWorkerEnvironmentFailure(slot, reason)`, now serves all three triggers
that can reach it with a job attached: the `'error'`-while-not-ready branch
(which it replaces verbatim), the new `load_failed` message, and that
message's exit-code backstop. It latches, drops the slot, disarms the job's
budget timers, and **runs the in-flight job in-process** so the caller who
discovered the broken environment still gets a report.

`spawnSlot()`'s own catch now captures the error (it was `catch {}`) so the
reason it latches with says what actually happened.

### Measured, post-change

Same probe, same two calls, against this branch with
`DOCTOR_WORKER_DOCTOR_MODULE` pointed at the missing module:

```
call 1 outcome:       RESULT (health=30)
  poolDisabled:       true
  workers:            0
call 2 outcome:       RESULT (health=30)
  poolDisabled:       true
  disabledReason:     "worker could not load the doctor module: Cannot find module
                       '.../server/nvm/analyze/__doctor_missing__.ts' imported from
                       '.../server/nvm/analyze/doctor-worker.ts'"
  workers:            0
  workerRuns:         1
  inProcessRuns:      2
doctor_pool_disabled lines: 1
  {"time":"...","level":"warn","msg":"doctor_pool_disabled","reason":"worker could not
   load the doctor module: Cannot find module '...' imported from '...'"}
```

`workerRuns: 1` alongside `inProcessRuns: 2` is not a miscount: the first
submission genuinely *was* dispatched to a worker and then genuinely *did*
run on the main thread. The counters' own comment used to call the three
outcomes "mutually exclusive"; that word is now removed rather than left
quietly wrong, with the one overlapping case documented (it can happen at
most once per process, because the same event latches the pool for good).

---

## 2. C10 — the latch was invisible, and so was the budget's absence

Once `poolDisabled` latched, every submission ran in-process with **neither**
`DOCTOR_QUEUE_BUDGET_MS` nor `DOCTOR_ANALYSIS_BUDGET_MS`, admission control
skipped, and nothing telling an operator. `/health` reported only a rising
`inProcessRuns` — which an ordinary **deep read** produces as well. A server
that had permanently lost its worker pool was indistinguishable from a
healthy one doing deep-read work.

Three changes, deliberately **not** including re-arming the budget:

**(i) The latch is exposed.** `doctorPoolStatus()` gains `disabledReason`
beside the `disabled` it already had; `GET /health`'s `doctorPool` block
gains `poolDisabled` and `poolDisabledReason` (additive — every prior field
is untouched, and `tests/routes/ready.test.ts`'s whole-object `deepEqual`
still guards the shape). `disablePool()` logs **exactly one**
`doctor_pool_disabled` warn line per process, naming the reason; the
idempotence guard is also what keeps the FIRST reason — the one that actually
describes the environment — from being overwritten by a second worker's.

**(ii) A fallback run that outlasts the budget says so.** The budget is not
*enforceable* here and the documented reason stands: enforcement is one
primitive, terminating a worker, and on the main thread a fired budget would
reject the caller while the analysis ran on underneath them — stopping the
wait without stopping the work. So no timer is armed and no new rejection
exists. What is new is visibility: when the queue budget is configured and a
**fallback** run exceeds the analysis budget, `doctor_inprocess_over_budget`
is logged once, after the run, with `elapsedMs`, both budgets, the pool's
`meanJobMs` (what admission control would have judged it against) and the
latch state.

Two exclusions, both tested:

* the queue budget being switched **off** (`0`/`off`) silences it — an
  operator who has told this server not to reason about wall clock gets no
  line;
* **deep read** is excluded. It is I/O-bound LLM fan-out that legitimately
  outruns a CPU budget, it is in-process by design rather than by failure,
  and warning on every one would bury the case this exists to surface.

**(iii) It is written down where the reader of Decision #7 will be.** Property
5 in `doctor-pool.ts`'s header now states outright that neither budget is
enforced on the fallback path, why, and what replaced silence.

---

## 3. The test-injection choice

The hard part is making `import('./doctor.ts')` fail inside a real worker
without editing the tree. The brief offered three options; the one taken is a
narrower variant of option (2).

* **Option 1 — an existing override.** There was none: `WORKER_URL` was a
  module-level `new URL('./doctor-worker.ts', import.meta.url)` with no seam.
* **Option 3 — an injectable `Worker` constructor.** Rejected: the pool's
  whole value proposition is that a real thread runs the analysis, and a fake
  `Worker` class tests the coordinator against a fiction of a worker. The
  defect under repair lived in the *seam* between the two files.
* **Option 2 — a test-only script override.** Implemented as
  `DOCTOR_WORKER_SCRIPT` (ignored under `NODE_ENV=production`, documented as
  test-only in `README.md`), but it is **not** what the main suite uses, for
  one reason: a stand-in worker file is free to drift from the shipped
  `doctor-worker.ts`, and the shipped file's load-failure branch is precisely
  what must be proven. A test that passes against a copy proves nothing about
  the original.

So the main suite uses a second, narrower test-only knob:
**`DOCTOR_WORKER_DOCTOR_MODULE`**, the specifier `doctor-worker.ts` lazily
imports the doctor from. Pointed at a module that does not resolve, it
reproduces "this environment cannot load the doctor" **inside the real worker
file**, exercising the real `load_failed` post and the real exit. Both knobs
are ignored under `NODE_ENV=production`, neither is read by anything in the
product, and both are documented in `README.md`'s env table, marked
**Test only**.

`DOCTOR_WORKER_SCRIPT` earns its keep on exactly one branch a real worker
cannot be made to take on demand: the `'exit'`-code backstop for a
`load_failed` message that never arrives. That test writes a three-line
stand-in worker to a temp dir which does nothing but
`process.exit(DOCTOR_WORKER_LOAD_FAILED_EXIT)`.

---

## 4. Tests

New: `tests/core/doctor-pool-load-failure.test.ts` (6 tests) and
`tests/routes/doctor-pool-disabled-health.test.ts` (2 tests). Changed:
`tests/routes/ready.test.ts`'s whole-object `deepEqual` gains the two new
`/health` keys.

| assertion | where |
|---|---|
| the in-flight caller gets a RESULT, not a rejection | core, test 1 |
| `poolDisabled === true`, reason names the load failure | core, test 1 |
| exactly **one** `doctor_pool_disabled` warn line | core, test 1 |
| the failed slot is dropped and nothing respawns (`workers === 0`) | core, tests 1-2 |
| a subsequent call runs in-process **without** dispatching to a worker | core, test 2 |
| the exit-code backstop latches with the message lost | core, test 3 |
| `doctor_inprocess_over_budget` logs elapsed ms on an over-budget fallback run | core, test 4 |
| silence when the queue budget is off | core, test 5 |
| silence for a deep read | core, test 6 |
| `/health` carries `poolDisabled:false`/`poolDisabledReason:null` when healthy | routes, test 1 |
| `/health` carries `true` + the reason once latched | routes, test 2 |

`resetDoctorPoolDisabledForTests()` is new and test-only (the latch is
permanent by design), so one test file can exercise the environment case
without poisoning every later test in the same process.

### Why the fail-first evidence is a probe, not this suite

The committed suite **cannot** be run against the pre-change files: it imports
`resetDoctorPoolDisabledForTests` and `DOCTOR_WORKER_LOAD_FAILED_EXIT`, which
do not exist there, and its injection knob does not exist there either — the
run ends in a module error, which is not a demonstration of anything. So the
fail-first instrument is a probe that uses **only exports both trees share**
(`runScriptDoctorOffThread`, `doctorPoolStatus`, `shutdownDoctorPool`) and
drives the same two submissions. Its two runs are quoted in §1 above: pre-fix
`REJECTED / false / REJECTED / 0 log lines`, post-fix
`RESULT / true / RESULT / 1 log line`.

---

## 5. The probe

```js
// scratch probe — not committed; the same two calls against whichever tree.
const pool = await import(`${tree}/server/nvm/analyze/doctor-pool.ts`);
// ... tee process.stderr, counting `doctor_pool_disabled` lines ...
const first  = await call(1);   // RESULT (health=N) | REJECTED (name: message)
const afterFirst = pool.doctorPoolStatus();
const second = await call(2);
const afterSecond = pool.doctorPoolStatus();
```

Run against the baseline as
`git archive 53f6e377 | tar -x -C <dir>` with the worker's `'./doctor.ts'`
specifier rewritten to `'./__doctor_missing__.ts'` (the pre-change worker has
no injection seam); against this branch with
`DOCTOR_WORKER_DOCTOR_MODULE='./__doctor_missing__.ts'`.

---

## 6. Gates

| gate | result |
|---|---|
| `tests/core/doctor-pool-load-failure.test.ts` (new) | 6/6 pass |
| `tests/routes/doctor-pool-disabled-health.test.ts` (new) | 2/2 pass |
| `tests/core/doctor-worker-pool.test.ts` | 9/9 pass |
| `tests/core/doctor-pool-prewarm.test.ts` | 5/5 pass |
| `tests/core/doctor-pool-progress.test.ts` | 4/4 pass |
| `tests/core/doctor-pool-warm-state.test.ts` | 13/13 pass |
| `tests/core/doctor-pool-call-sites.test.ts` | 3/3 pass |
| `tests/core/doctor-analysis-budget.test.ts` | 27/27 pass |
| `tests/routes/doctor-analysis-budget.test.ts` | 6/6 pass |
| `tests/routes/ready.test.ts` | 10/10 pass |
| `tests/core/server-prewarm-before-listen.test.ts` | 6/6 pass |
| `tests/routes/scriptide-doctor.test.ts` | 18/18 pass |
| `tests/routes/scriptide-doctor-deep.test.ts` | 9/9 pass |
| `tests/routes/scriptide-doctor-pdf.test.ts` | 9/9 pass |
| `tests/routes/scriptide-doctor-pdf-offthread.test.ts` | 3/3 pass |
| `tests/routes/scriptide-doctor-stream.test.ts` | 7/7 pass |
| `tests/core/brain-coverage.test.ts` | 8/8 pass |
| `npm run lint` (`tsc --noEmit`) | clean |
| `npm run check-no-console` | `310 file(s) under server/ checked ... all proven unreachable from the server. OK.` |
| `node scripts/check-scoring-receipt.mjs 53f6e377..HEAD` | `no scoring-path files changed. OK.` |
| `npm run check-server-reachability` | `OK — every unreachable file under server/ is a known, documented entry.` |
| `node scripts/check-doctor-output-identity.mjs --compare` | see below |

Output identity, baseline `git archive 53f6e377` vs this working tree (both
run with `GIT_SHA=dev`, since the baseline export has no `.git` and the
report's `engineCommit` would otherwise differ for a reason that has nothing
to do with this change):

```
OUTPUT IDENTITY: PASS — all 45 reports are byte-identical (analyzedAt excluded).
```

Nothing on the scoring path was touched. `doctor-pool.ts` and
`doctor-worker.ts` are not in `doctor.ts`'s reachable set and are not on
`check-scoring-receipt.mjs`'s named list; the gate confirms it, and the
identity harness proves no report byte moved.

---

## 7. What was NOT done

* **The budget is still not enforced on the fallback path.** Deliberate, and
  argued above (and now in the header, so the reader of Decision #7 is not
  misled). Enforcing it would require a second cancellation primitive the
  main thread does not have.
* **No new rejection anywhere.** `doctor_inprocess_over_budget` is a log line,
  not a 400/503. Adding a rejection on the path whose entire job is to be "no
  worse than before this file existed" would be a behaviour change, not a fix.
* **`/ready` is unchanged.** A latched pool is a *degraded* process, not an
  unready one — it serves every request correctly, on the main thread — so
  flipping readiness would drain a container that is working. The signal
  belongs on `/health`, which is where it went.
* **The prewarm's `poolDisabled` branch was not revisited.** `warmDoctorPool()`
  already reduces to one warm-up job when the latch is set; nothing about this
  lane changes that.
* **Not pushed** (per the lane brief). `lane/doctor-pool-fallback` exists
  locally only.

## 8. § Review findings fixed (span-check-hardening lane, 2026-09-19)

An adversarial review of this lane's commit (`9c25f79a`) found two LOW
defects in `doctor-pool.ts`, fixed on `lane/span-check-hardening` from
`1e7779de`.

**Finding 7 (LOW, confirmed) — `poolDisabledReason` leaked absolute
filesystem paths onto the unauthenticated `/health`.** The reason string
passed to `disablePool()` is, in every real-world trigger, built by
interpolating a raw `Error.message` — a failed dynamic `import()` in
Node's ESM loader reports `Cannot find module '<absolute path>' imported
from <absolute path>`, naming both the missing module and
`doctor-worker.ts` itself by their full on-disk paths. `GET /health` is
explicitly unauthenticated (route-capabilities' documented exemption list),
so this server's directory layout — home directory name, deployment path,
username on some hosts — was legible to anyone who could reach that route,
for the life of the process once the latch fired. **Fix:**
`sanitizeDisabledReason()` strips absolute path segments (POSIX: two or
more `/segment` components in a row; Windows: a drive-letter path) with the
literal placeholder `<path>`, then caps the result at 200 characters, and
`disablePool()` applies it before the reason is ever stored or logged. The
module-not-found WORDING is left untouched — only the path segments are
replaced — so the reason still names the class of failure ("worker could
not load the doctor module: Cannot find module '<path>' imported from
<path>") without naming the box. Confirmed against a real load failure
(the same `DOCTOR_WORKER_DOCTOR_MODULE` injection this lane's own tests
use): the specifier name and every absolute path segment are gone from
`doctorPoolStatus().disabledReason` and from `GET /health`'s
`doctorPool.poolDisabledReason`, replaced by `<path>`, while `Cannot find
module` and `could not load the doctor module` still appear.
`tests/core/doctor-pool-load-failure.test.ts`'s assertion that the reason
"carries the underlying loader message" (checking for the literal
specifier `__doctor_module_that_does_not_exist__`) necessarily changed —
that substring is exactly what sanitization now removes — to instead assert
`Cannot find module` survives, the specifier does not, the `<path>`
placeholder appears, and the length is capped at 200.
`tests/routes/doctor-pool-disabled-health.test.ts` needed no change: its
existing assertion (`/could not load the doctor module/`) never asserted on
the raw path.

**Finding 8 (LOW, confirmed) — a dropped slot could arm an idle timer.**
`handleWorkerEnvironmentFailure()` called `dropSlot(slot)` — which removes
the slot from the `slots` array and clears any idle timer on it — *before*
`setBusy(slot, false)`, the opposite order from every other settlement path
in this file (`finishJob`, `onRunBudgetExceeded`, the abort handler in
`dispatch()`), all of which mark the slot idle first and only then drop it.
No live idle-timer defect was reproducible against the current source —
`setBusy()` only refs/unrefs the worker handle and nothing on this specific
path re-arms `armIdleTimer()` afterward — but the inverted order was real
and was the one place in the file where a slot no longer in `slots` could
still be acted on by a call ordinarily paired with pool membership,
leaving a latent trap for a future edit near either line. **Fix:** swapped
the order so `setBusy(slot, false)` (guarded on `active` being set, as
before) runs before `dropSlot(slot)`, matching every other caller in the
file; `disablePool(reason)` and the in-process retry are otherwise
unchanged. Verified with the existing pool tests
(`tests/core/doctor-pool-load-failure.test.ts`,
`tests/core/doctor-worker-pool.test.ts`,
`tests/core/doctor-pool-warm-state.test.ts`,
`tests/routes/ready.test.ts`,
`tests/routes/doctor-pool-disabled-health.test.ts`) — all pass unchanged,
consistent with this being an ordering hardening rather than a behavior
change.

Gates (`lane/span-check-hardening`, from `1e7779de`):

| Gate | Result |
|---|---|
| `tests/core/doctor-pool-load-failure.test.ts` | pass — 6/6 (assertion updated for finding 7) |
| `tests/routes/doctor-pool-disabled-health.test.ts` | pass — 2/2 (unmodified) |
| `tests/core/doctor-worker-pool.test.ts` | pass — 9/9 |
| `tests/core/doctor-pool-warm-state.test.ts` | pass — 13/13 |
| `tests/routes/ready.test.ts` | pass — 10/10 |
| `npm run lint` (`tsc --noEmit`) | pass, no errors |
| `npm run check-no-console` | pass — 310 file(s) checked, all proven unreachable |
| `node scripts/check-scoring-receipt.mjs 1e7779de..HEAD` | pass — "no scoring-path files changed. OK." |
| `node scripts/check-doctor-output-identity.mjs --compare`, baseline `git archive 1e7779de` (both sides `GIT_SHA=dev`) | `OUTPUT IDENTITY: PASS — all 45 reports are byte-identical (analyzedAt excluded).` |

Files touched by this hardening: `server/nvm/analyze/doctor-pool.ts`,
`tests/core/doctor-pool-load-failure.test.ts`, this section, and
`docs/brain/Audits/Audit - 2026-09-19 Doctor Pool Fallback.md` (one pointer
line). `doctor-worker.ts` was not touched — the sanitization lives entirely
on the coordinator side, at the one place (`disablePool()`) every trigger
already funnels through.
