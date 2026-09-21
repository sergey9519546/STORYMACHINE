# Lane record — converge-stream close (2026-09-19)

**Branch:** `claude/fable-5-1-orchestrator-yil0xr`, HEAD `aa0d785f` at lane
start.
**Scope:** `GET /api/nvm/converge-stream`'s timeout branch
(`server/routes/nvm/converge.ts`) — close the SSE response on deadline
instead of awaiting the abandoned convergence operation first. One reasoned
check on `POST /api/nvm/converge-arc` and `POST /api/nvm/converge` to confirm
they need no equivalent change. One live test. Nothing on the scoring path
changes.

---

## 1. The defect

`GET /api/nvm/converge-stream`'s timeout branch was:

```ts
if (raced.timedOut) {
  emitSSE({ type: 'converge_error', error: 'ai_budget_exceeded' });
  await operation.catch(() => {});
  return;
}
```

`await operation.catch(() => {})` runs **before** the function returns, which
is before the outer `finally { ensureEnded(); }` can execute. For a truly
hung provider call (`generate()` that never resolves — the exact case
`AI_BUDGET_CONVERGE_TIMEOUT_MS` exists to bound), `operation` never settles,
so this `await` never resolves, so `ensureEnded()` (and therefore `res.end()`)
never runs — the SSE connection stays open indefinitely even though the
terminal `converge_error` event was already written to the client.

The identical bug was found and fixed first on `GET /api/nvm/revise-stream`
(`server/routes/nvm/revision.ts`, commit `520a3891`;
`docs/audits/2026-09-19-revise-deadline/README.md` §2 and §4 record the live
probe that found it). That lane's README explicitly named this exact
route/branch as an un-independently-verified follow-up rather than fixing it
(§6: *"Does not fix `converge-stream`'s analogous await-before-`ensureEnded()`
ordering on its own timeout branch... the same bug class this lane found and
fixed on `revise-stream` plausibly exists there too... Flagged as a
follow-up, not fixed here."*). This lane is that follow-up.

## 2. The fix

`server/routes/nvm/converge.ts`, `GET /api/nvm/converge-stream`'s timeout
branch (now lines 256–290):

```ts
if (raced.timedOut) {
  emitSSE({ type: 'converge_error', error: 'ai_budget_exceeded' });
  // NOT `await`ed. Mirrors server/routes/nvm/revision.ts's identical fix
  // for GET /api/nvm/revise-stream (520a3891; ...). ensureEnded() is what
  // actually closes this SSE response; awaiting the abandoned `operation`
  // here first would hold res.end() until the underlying provider call
  // itself settles — for a truly hung call ... that is "never" ...
  //
  // COORDINATOR SAFETY (why this is safe despite this route, unlike
  // revise-stream, being withSessionCommand-wrapped — see this file's
  // header): convergeScene() ... is pure computation over its arguments.
  // The ONLY code on this route that writes to Stage is the appendGhost()
  // loop below, which runs strictly AFTER `const result = raced.value;` —
  // i.e. only on the non-timeout success path ... So even if `operation`
  // settles after this handler has returned, its result is discarded and
  // no Stage write ever happens because of it. ...
  operation.catch(() => {});
  ensureEnded();
  return;
}
```

Same reordering as `revision.ts`'s fix: emit the terminal event, let the
abandoned operation settle in the background unawaited (`.catch(() => {})`
only, so it can never become an unhandled rejection but never blocks the
response either), then call `ensureEnded()` immediately.

**Why this is safe even though converge-stream, unlike revise-stream, IS
`withSessionCommand`-wrapped** (this file's header, lines 30–34, states the
general rule: *"SessionCommandCoordinator must never admit the next queued
command before this one's real Stage/ghost-ledger writes are done"*) — this
is the one place this lane's reasoning goes beyond a literal copy of
`revision.ts`'s fix, so it is spelled out here in full:

- `convergeScene()` (`server/nvm/converge/loop.ts`) takes a plain
  `NarrativeState` value as its first argument, not `Stage`, and neither it
  nor any module it imports (`proof/kernel.ts`, `valuation/futures.ts`,
  `quality/index.ts`, `room/room.ts`, `generate/proof-spec.ts`,
  `generate/quality-spec.ts`, `ops/dispatcher.ts`, `selfplay/mine.ts`,
  `generate/llm-generator.ts`) imports `Stage` or touches the session's
  SQLite handle — confirmed by grep across that whole dependency set (no
  `Stage` import; the only string matches are unrelated identifiers like
  `ProppStage`). `convergeScene()` is pure computation over its arguments and
  a `generate` callback.
- The **only** code on this route that ever calls `appendGhost(stage, ...)`
  is the loop at converge.ts's (now) lines 298–309, which runs strictly
  **after** `const result = raced.value;` (line 292) — i.e. only on the
  non-timeout success path, inside the same function invocation. On a
  timeout, execution returns at line 290, before that loop is ever reached.
- The abandoned `operation` promise gets only `.catch(() => {})` attached to
  it (line 288) — no `.then()` continuation exists anywhere that would read
  its eventually-resolved `result.ghosts` and persist them. So even if the
  hung provider call eventually resolves long after the response has closed,
  nothing reads that resolution and no `appendGhost()` call is ever made from
  it.
- Therefore: on the timeout path, this command makes **zero** Stage writes,
  whether `operation` is awaited before the handler returns or not. The
  coordinator's "next command not admitted before this one's Stage writes are
  done" guarantee is not weakened by this reordering, because there are no
  Stage writes on this path to race against.

This is a real difference from `POST /api/nvm/converge-arc`'s operation body,
which **does** call `appendGhost()` from inside the very `operation` that
would be abandoned (see §3) — which is exactly why that route's timeout
branch keeps awaiting `operation` in full and was correctly left unchanged.

## 3. `converge-arc` / `converge` (non-stream) — reasoning check

Task: confirm `POST /api/nvm/converge-arc`'s and `POST /api/nvm/converge`'s
analogous branches are safe as-is because they respond via `res.json()`,
which ends the response immediately regardless of what runs after — the same
reason `POST /api/nvm/revise`'s branch was safe. Conclusion: **reasoning
holds for both; nothing changed in either.**

### `POST /api/nvm/converge` (lines 54–158)

```ts
// line 106
const raced = await withDeadline(operation, CONVERGE_BUDGET.timeoutMs);
if (raced.timedOut) {                                    // line 107
  res.status(503).json({ ... });                         // line 108
  await operation.catch(() => {});                        // line 112
  return;                                                 // line 113
}
```

`res.status(503).json({...})` (line 108) calls Express's `res.json()`, which
serializes the body and calls `res.end()` **synchronously within that call**
— the HTTP response is fully sent to the client before the next line
(`await operation.catch(...)`, line 112) ever runs. So whether that `await`
resolves in 1ms or never, the client already has its complete 503 response;
the `await` only delays this **handler function's own promise** (and thus
`session.commands.run()`, and thus the moment `SessionCommandCoordinator`
admits the next queued command for this session) — exactly the effect the
comment above it (lines 98–103) documents on purpose: *"the operation is
always fully awaited below, even after an early response, so
SessionCommandCoordinator never admits the next queued command before this
one's real Stage/ghost-ledger writes are done."*

Unlike the SSE route, `appendGhost()` here (lines 125–138) also only runs
after `raced.value` (line 115) on the success path, so on a timeout no writes
happen either way — but it does not matter for this route's correctness,
because the response has already ended regardless of the await. **No path
defers the JSON response behind the awaited abandoned operation; this route
does not stream.** Left unchanged.

### `POST /api/nvm/converge-arc` (lines 351–478)

```ts
// line 466
const raced = await withDeadline(operation, CONVERGE_ARC_BUDGET.timeoutMs);
if (raced.timedOut) {                                     // line 468
  res.status(503).json({ ... });                           // line 469
  await operation.catch(() => {});                          // line 473
  return;                                                  // line 474
}
res.json(raced.value);                                     // line 476
```

Same shape: `res.status(503).json({...})` (line 469) ends the response
before the subsequent `await operation.catch(() => {})` (line 473) runs.
Does not stream — `res.json()` is the only way this route ever writes to the
client, on both the timeout and success paths. Left unchanged.

**One additional fact that makes keeping the full `await` here load-bearing,
not just harmless** (found while verifying this route, beyond what the task
asked to confirm): unlike `converge` and `converge-stream`, `converge-arc`'s
`appendGhost()` calls happen **inside** the `operation` itself — see lines
418–429, inside the per-scene `for` loop (lines 411–452) that is the body of
the `runWithBudgetContext(CONVERGE_ARC_BUDGET, async () => { ... })` callback
spanning lines 405–465. If a future scene's `convergeScene()` call were slow
enough to trip the deadline while an *earlier* scene's `appendGhost()` had
already run (or a later one was about to), `operation` genuinely still has
in-flight Stage-mutating work at the moment of timeout. Abandoning it (not
awaiting before the handler returns) here **would** reintroduce the exact
race `ai-budget.ts`'s header describes: the coordinator could admit the next
queued command while this abandoned operation is still calling
`appendGhost()`. This route's existing full `await operation.catch(() => {})`
(unchanged, line 473) is therefore correctly required, not merely stylistic —
it is a genuinely different case from `converge-stream`'s, where `appendGhost`
never runs on the timeout path at all (§2).

**Conclusion:** the res.json()-ends-response reasoning is sufficient and
correct for why neither `converge`'s nor `converge-arc`'s client-visible
response is affected by the trailing `await`; independently, the
Stage-write-timing reasoning (only surfaced for `converge-arc`, which is the
one route where the mutating loop lives inside `operation` itself) is why
that trailing `await` must stay in place for coordinator safety. Neither
route needed any change.

## 4. Test

`tests/routes/nvm-converge-stream-timeout.test.ts` (new), following
`tests/routes/nvm-revision-budget.test.ts`'s pattern: `AI_BUDGET_CONVERGE_
TIMEOUT_MS` set before any import (converge.ts computes `CONVERGE_BUDGET`
once at module load); a provider whose `generate()` returns a
never-resolving promise, installed via `setLLMProvider()`
(`server/engine/ai.ts`, same seam `tests/routes/ai-budget-wiring.test.ts`
uses); a valid `GET /api/nvm/converge-stream` query (sceneIdx 0 — Tier 1
always passes there, per `tests/routes/nvm-converge-select.test.ts`, so the
request reaches `convergeScene()`'s first `generate()` call).

Asserts:
- (a) a `converge_error`/`ai_budget_exceeded` event arrives and is the last
  event on the stream;
- (b) the stream closes within 3s — measured around `await res.text()`,
  which only resolves once the body reader reaches end (i.e. the server
  actually called `res.end()`), not merely once an event was written to a
  still-open socket;
- (c) zero `unhandledRejection` events fire during the test — a
  `process.on('unhandledRejection', ...)` spy is installed for the test's
  duration (removed in `finally`) and asserted empty.

### Fail-first

```
$ git stash push server/routes/nvm/converge.ts
Saved working directory and index state WIP on claude/fable-5-1-orchestrator-yil0xr: aa0d785f ...

$ timeout 15 node --experimental-strip-types --test tests/routes/nvm-converge-stream-timeout.test.ts
EXIT CODE: 124
TAP version 13
# {"...","msg":"collab_secret_generated",...}
(no further output — the test process was killed by the external timeout,
 not by the test runner; no server-side stop at all, exactly as revision.ts's
 pre-fix fail-first transcript showed for revise-stream)

$ git stash pop
On branch claude/fable-5-1-orchestrator-yil0xr
...
Dropped refs/stash@{0} ...
```

Exit code 124 is `timeout`'s own "I had to kill it" code. The GET request
against the hung provider never returned — no 200, no event, no test
result — confirming the pre-fix branch hangs the response open exactly as
the defect states. Re-run after `git stash pop` restored the fix: green (1/1
pass, ~0.6–1.4s wall time across repeated runs).

## 5. Gates

| Gate | Result |
|---|---|
| `tests/routes/nvm-converge-stream-timeout.test.ts` (new) | 1/1 pass, exit 0 |
| `tests/routes/nvm-converge-select.test.ts` | 9/9 pass, exit 0 |
| `tests/routes/ai-budget-wiring.test.ts` | 5/5 pass, exit 0 |
| `tests/routes/ai-budget.test.ts` | 18/18 pass, exit 0 |
| `tests/routes/route-capabilities.test.ts` | 6/6 pass, exit 0 |
| `tests/routes/nvm.test.ts` | 31/31 pass, exit 0 |
| `tests/routes/sse-client-disconnect-cancellation.test.ts` | 1/1 pass, exit 0 |
| `tests/routes/sse-wall-timer-cancellation.test.ts` | 3/3 pass, exit 0 |
| `npm run lint` (`tsc --noEmit`) | exit 0, no output |
| `node scripts/check-no-console.mjs` | exit 0 — "310 file(s) under server/ checked, 24 tsconfig quarantine entr(ies) applied, all proven unreachable from the server. OK." |
| `node scripts/check-scoring-receipt.mjs aa0d785f..HEAD` | exit 0 — "no scoring-path files changed. OK." |
| `npm run check-brain` | exit 0, after `npm run brain` regenerated the graph in this checkout |
| `node --experimental-strip-types tests/core/brain-coverage.test.ts` | pass, after adding this lane's brain note |
| `node scripts/honesty-audit.mjs` | exit 0 |
| `tests/core/docs-gating-set.test.ts` | pass |
| `RUN_E2E=1 npm test` | 0 failures (full suite) |

(Exact gate output for the brain/honesty/full-suite runs is recorded verbatim
in the session's final report rather than duplicated here twice.)

## 6. What this does NOT do

- No scoring change. `server/nvm/analyze/**`, `server/nvm/revision/**`,
  `server/nvm/converge/loop.ts`, and every other scoring-path file are
  byte-for-byte unmodified — confirmed by `check-scoring-receipt.mjs`.
- Does not touch `POST /api/nvm/converge` or `POST /api/nvm/converge-arc`'s
  code — both were read and reasoned about (§3) and left unchanged, correctly
  per that reasoning.
- Does not add `validateQuery` (or any zod schema) to
  `GET /api/nvm/converge-stream`'s query parsing — it still parses and
  clamps its query parameters by hand, same as before this lane.
  `revision.ts`'s revise-deadline lane added that infrastructure for
  `revise-stream`'s query; applying it to `converge-stream` was not in this
  lane's scope and was not attempted.
- No attempt-ceiling change. `CONVERGE_BUDGET`'s `maxAttempts` and
  `withCountedAttempts()` wiring are untouched — this lane is only about the
  wall-clock-deadline response-closing bug.
