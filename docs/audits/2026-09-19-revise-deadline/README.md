# Lane record — revise deadline (2026-09-19)

**Branch:** `claude/fable-5-1-orchestrator-yil0xr`, worktree branch
`lane/revise-deadline`, from `31d83cb6`.
**Scope:** give `POST /api/nvm/revise` and `GET /api/nvm/revise-stream` the
same server-side deadline, attempt ceiling and budget context their sibling
`server/routes/nvm/converge.ts` routes already have. Nothing on the scoring
path changes.

---

## 1. The defect

READ session report §4 row 4 / logic audit C13: `POST /api/nvm/revise` and
`GET /api/nvm/revise-stream` (`server/routes/nvm/revision.ts`) run up to 14
sequential `provider.generate()` calls — one per revision pass — with **no
server-side deadline, no attempt ceiling, and no budget context at all**.
`server/routes/nvm/converge.ts`'s three routes already have exactly this
(`CONVERGE_BUDGET`/`CONVERGE_ARC_BUDGET`, `runWithBudgetContext()`,
`withDeadline()`, `withCountedAttempts()`, from `server/lib/ai-budget.ts`);
the revise routes never got the equivalent treatment.

`docs/story-generation/STORY_BENCH_2026-09-13.md` §4c independently confirms
the consequence: **"undici's 300s `headersTimeout` was aborting the 14-pass
revision, and it is not the `AbortSignal`."** Three of six bench premises lost
their entire revision step to a **client-side** timeout with no hint the
deadline was its own; the fix landed in the bench's own HTTP client
(`ee115561`), not the server. After that fix, `counterweight`'s revision
legitimately ran **405s**. The server itself was never watching the clock —
a hung or merely slow provider call could run indefinitely, with nothing on
the server side to stop it, unlike every converge route.

## 2. What changed

### `server/routes/nvm/revision.ts`

- `REVISE_BUDGET: AiBudgetLimits` — same shape as converge.ts's
  `CONVERGE_BUDGET`, computed once at module load via `aiBudgetEnvNumber()`:
  - `timeoutMs`: `AI_BUDGET_REVISE_TIMEOUT_MS`, default **900,000ms (15 min)**
    — comfortably above the 405s legitimate run STORY_BENCH_2026-09-13.md §4c
    measured, with real headroom rather than shaving the default down to
    "usually enough."
  - `maxAttempts`: `AI_BUDGET_REVISE_MAX_ATTEMPTS`, default **28** (14 passes
    × 2 — one real call plus headroom per pass).
- Both `POST /api/nvm/revise` and `GET /api/nvm/revise-stream` now wrap
  `runRevisionPipeline(...)` in `runWithBudgetContext(REVISE_BUDGET, …)`,
  raced with `withDeadline(operation, REVISE_BUDGET.timeoutMs)`, exactly as
  converge.ts's routes do. On a timeout:
  - POST returns the same shape converge.ts's routes return:
    `503 { error: '...protect the server...', code: 'AI_BUDGET_DEADLINE_EXCEEDED' }`.
  - The SSE route emits `{ type: 'revision_error', error: 'ai_budget_exceeded' }`
    — the same event shape `converge-stream` emits on its own timeout
    (`{ type: 'converge_error', error: 'ai_budget_exceeded' }`).
- **One deliberate deviation from copying converge.ts's SSE branch verbatim,
  found through testing (see §4):** on a timeout, the SSE route does **not**
  `await` the abandoned pipeline operation before closing the stream. It
  still lets the operation settle in the background (`operation.catch(() =>
  {})`, unawaited, so it can never become an unhandled rejection), but calls
  `ensureEnded()` immediately after emitting the terminal event. Awaiting
  first — which is what converge-stream's equivalent branch does, and what
  this route's own `POST` branch effectively achieves for free because
  `res.json()` already ends the response before that await runs — would hold
  the SSE connection open until the underlying (possibly permanently hung)
  provider call itself settles, i.e. **never**, for exactly the failure mode
  this budget exists to bound. A live probe against a never-resolving fake
  provider confirmed this: with the await-first order, the client-visible
  stream never closed even though the error event had already been written;
  reordering to end-then-background-await fixed it (525ms end to end). This
  is flagged as a candidate follow-up for converge-stream too — see §5.
- `GET /api/nvm/revise-stream` now runs `validateQuery(ReviseStreamQuerySchema)`
  **before** `res.flushHeaders()`. Before this, a malformed `?sessionId=` or
  `?title=` was caught by the route's own try/catch **after** SSE headers
  were already sent, producing a `200` response carrying a generic
  `{type:"revision_error", error:"internal_error"}` event rather than a clean
  `400` — inconsistent with every other validated route in this app,
  including `POST /api/nvm/revise` itself.

### `server/lib/validation.ts`

- `validateQuery(schema)` — a new middleware factory, same 400 shape as the
  existing `validate()`/`validateParams()`, applied to `req.query` instead of
  `req.body`/`req.params`. No GET route in this repository validated its
  query string with zod before this; `validateQuery` is the general-purpose
  primitive, not a one-off.
- `ReviseStreamQuerySchema` — `{ sessionId: sessionIdField, title:
  z.string().max(256).optional() }`, the query-string counterpart to
  `ReviseBodySchema` (same `sessionIdField`, same title bound). No
  `approvedSpans` field: the SSE route never accepted approved spans (it
  always calls `runRevisionPipeline` with `[]`), so there is nothing to
  validate there.

### `server/nvm/revision/rewrite-llm.ts` (NOT scoring path — see §3)

- `llmRewrite()` now calls `consumeAiAttempt()` (from `server/lib/
  ai-budget.ts`) immediately before its one `provider.generate()` call,
  **inside** the existing `try` block that already treats "no key
  configured" and "the provider threw" as "fall back to the unchanged draft
  for this pass." `consumeAiAttempt()` is a no-op outside an active budget
  context, so this is inert for every keyless/no-budget caller — including
  every pre-existing test in this repository (confirmed: all pass unchanged).
- The `catch` block now distinguishes an `AiBudgetExceededError` from an
  ordinary provider failure in its log line
  (`revision_rewrite_budget_exceeded` vs. `revision_rewrite_failed`), purely
  for observability — the fallback behavior is identical either way.

### `.env.example`

- New "AI provider fan-out budgets" section documenting
  `AI_BUDGET_REVISE_TIMEOUT_MS` and `AI_BUDGET_REVISE_MAX_ATTEMPTS`. No
  `AI_BUDGET_*` variable (converge's included) was previously documented in
  this file at all — the brief said "beside the converge ones," but there
  were none to be beside; this is the first `AI_BUDGET_*` entry in
  `.env.example`, and the new section says so.

## 3. The attempt-counting design choice, and why it differs from converge.ts

`converge.ts` counts attempts by wrapping a `generate` **function reference**
the route itself constructs (`makeLLMCandidateGenerator()`) with
`withCountedAttempts()`, then handing that wrapped reference into
`convergeScene()` **by reference**. `convergeScene()` never catches what that
wrapped function throws, so an `AiBudgetExceededError` propagates straight
out of the operation the route is racing.

The revision pipeline has **no equivalent seam**.
`server/nvm/revision/rewrite-llm.ts` calls `getGenerativeProvider()` itself,
as a self-registered singleton rewriter (module-load side effect, wired by
`server/routes/nvm/revision.ts`'s side-effect import) — there is no
route-constructed function for the route to wrap and hand in.

Two files stood between "count attempts" and "make an exhausted ceiling
visibly abort the request the way converge.ts's does," and **both are on the
scoring path** (`scripts/check-scoring-receipt.mjs`: `server/nvm/revision/
passes/**` is always-scoring, and the reachable-set walk from `doctor.ts`
includes `../revision/pipeline.ts` and `../revision/rewrite.ts` by name) —
this lane may not touch either:

- `server/nvm/revision/pipeline.ts`'s per-pass loop (both the sequential path
  and the diagnose-only fast path) already wraps **every** pass call in its
  own `try/catch` and turns **any** thrown error into a no-op `"Pass skipped
  due to error"` entry in `failedPasses`, then continues to the next pass. It
  does not propagate.
- `server/nvm/revision/rewrite.ts`'s `rewritePass()` is the thing that
  actually invokes the registered rewriter — also scoring path, also
  unmodified.

Given that constraint, the smallest correct change is **`consumeAiAttempt()`
inside `llmRewrite()`'s own existing `try` block** (§2 above). This has a
real, honest consequence, stated plainly rather than left implicit:

**What the ceiling DOES guarantee:** once `REVISE_BUDGET.maxAttempts` is
reached (or its `timeoutMs` has already elapsed at the moment a new attempt
would be made), **no further `provider.generate()` call is made for the rest
of the request.** This was verified directly (§4): with a ceiling of 2 and a
fountain that naturally drives 3 passes to call the provider, exactly 2 real
calls happen, not 3 — and with more issue-bearing passes downstream (the
accepted rewrites changed the text, which made *more* than the original 3
passes want to call the provider), the remaining 5+ attempts were all denied
before ever reaching `provider.generate()`. This is the real, load-bearing
safety property: total LLM cost per request is bounded, the same guarantee
converge.ts's ceiling provides.

**What the ceiling does NOT do:** it does not turn an exhausted-budget
request into a distinct HTTP error the way a timed-out request does. Once
`pipeline.ts`'s per-pass `catch` swallows the `AiBudgetExceededError`
exactly like it would swallow "no API key," the route still returns a normal
`200` with a complete `RevisionResult` — the remaining passes simply stop
reaching the provider and their `revisedFountain` stays whatever the prior
pass left it as (`failedPasses` stays `[]`; the passes did not fail, they
just could not afford another rewrite). Converge.ts's own attempts-exceeded
path is not actually distinguishable either in practice, for a related
reason: `convergeScene()`'s rejection propagates to `withDeadline()`, which
re-rejects with the same error, which is not itself caught by anything that
maps `AiBudgetExceededError` to a shaped response in `converge.ts` (only the
`raced.timedOut` — pure wall-clock — branch is shaped there); an
attempts-exceeded converge request falls through to the global error
handler's generic `500`. So "the same shaped error converge.ts returns on
attempts-exceeded" does not exist as a thing to mirror; what this lane
mirrors faithfully is converge.ts's **deadline** shape (§2), which is the
part of the defect report (the 301s/405s client-timeout story) this lane was
actually opened to fix.

The wall-clock deadline (`withDeadline`, §2) is therefore what gives this
route the "cannot hang forever" guarantee converge has; the attempt ceiling
is defense-in-depth against runaway provider cost within a request that is
still under its wall-clock budget, not a second path to the same shaped
error. Both properties are real and independently tested (§4).

## 4. Tests

`tests/routes/nvm-revision-budget.test.ts` (new) and
`tests/routes/nvm-revision-budget-attempts.test.ts` (new, separate process —
see its header for why the two env overrides cannot share one file).

- **(a) deadline, POST.** `AI_BUDGET_REVISE_TIMEOUT_MS=300`, a provider whose
  `generate()` never resolves, three seeded scenes (chosen because they drive
  3 of 14 passes — `intention`, `character-arc`, `payoff` — to actually reach
  the provider; an empty/near-empty session finds zero issues across all 14
  passes and never calls the provider at all, which would make every test in
  both new files pass for the wrong reason). Asserts `503`,
  `code: 'AI_BUDGET_DEADLINE_EXCEEDED'`, elapsed < 3000ms.
- **(b) unchanged success shape.** A fast, accepting fake provider (not
  keyless — the keyless suite in `tests/routes/nvm-revision.test.ts` already
  covers the no-provider path exhaustively and cannot exercise the budget
  context at all, since a keyless provider throws before ever reaching
  `consumeAiAttempt()`'s caller). Asserts `200`, all 14 passes present, no
  `failedPasses`, and that the fake was actually reached.
- **(c) attempts ceiling.** Separate file, `AI_BUDGET_REVISE_MAX_ATTEMPTS=2`,
  an always-succeeding fast provider, same three-scene seed (natural demand
  3+ calls). Asserts the provider was called **exactly 2** times, not 3+, and
  that the route still returns `200` with `failedPasses: []` (see §3 for why
  that is the correct, and only honestly achievable, shape here).
- **(d) stream deadline.** Same hung-provider setup as (a), against
  `GET /api/nvm/revise-stream`. Asserts the stream closes within 3000ms and
  its **last** event is `{type:"revision_error", error:"ai_budget_exceeded"}`.
  This test is what found the await-ordering bug described in §2 — see the
  fail-first transcript below for the deadline test, and this test's own
  passing run for proof the stream-closing fix is real (it would otherwise
  hang the test process the same way, just at a different call site).
- **(e) stream query validation.** Malformed `sessionId` and an over-long
  `title` on `GET /api/nvm/revise-stream` both return `400` with a
  `field: message` body and NOT `text/event-stream`.

### Fail-first (item a)

Restored `server/routes/nvm/revision.ts` to its pre-lane content
(`git show 31d83cb6:server/routes/nvm/revision.ts`) with the two new test
files and the rest of the lane's changes (`validation.ts`, `rewrite-llm.ts`)
left in place, then ran only the deadline test under a hard 12s external
timeout:

```
$ timeout 12 node --experimental-strip-types --test \
    --test-name-pattern="hung provider is cut off" \
    tests/routes/nvm-revision-budget.test.ts
EXIT CODE: 124
TAP version 13
# {"...":"collab_secret_generated",...}
# {"...","method":"POST","path":"/api/nvm/inject-ops","status":200,"ms":21}
# {"...","method":"POST","path":"/api/nvm/inject-ops","status":200,"ms":8}
# {"...","method":"POST","path":"/api/nvm/inject-ops","status":200,"ms":1}
(no further output — the test process was killed by the external timeout,
 not by the test runner; there is no server-side stop at all)
```

Exit code 124 is `timeout`'s own "I had to kill it" code — the three seed
requests (gameLimiter, deterministic) completed normally, and the
`POST /api/nvm/revise` request against the hung provider then hung
indefinitely: no `503`, no test result, nothing. That is the defect in one
transcript. `server/routes/nvm/revision.ts` was then restored to its
lane-fixed content and the full suite re-run green (§5).

## 5. Gates (worktree `lane/revise-deadline`, from `31d83cb6`)

| Gate | Result |
|---|---|
| `npx tsc --noEmit` (lint) | exit 0, no output |
| `node scripts/check-no-console.mjs` | exit 0 — "310 file(s) under server/ checked, 23 tsconfig quarantine entr(ies) applied, all proven unreachable from the server. OK." |
| `node scripts/check-scoring-receipt.mjs 31d83cb6..HEAD` | exit 0 — "no scoring-path files changed. OK." |
| `tests/routes/nvm-revision-budget.test.ts` (new) | 5/5 pass |
| `tests/routes/nvm-revision-budget-attempts.test.ts` (new) | 1/1 pass |
| `tests/routes/nvm-revision.test.ts` (existing, unmodified) | 12/12 pass — unaffected |
| `tests/routes/ai-budget-wiring.test.ts` | pass, unaffected (no revise assertions to update — it enumerates game.ts routes only) |
| `tests/routes/ai-budget.test.ts` | pass, unaffected |
| `tests/routes/route-capabilities.test.ts` | pass — its static route/limiter walk already listed `POST /api/nvm/revise` and `GET /api/nvm/revise-stream` on `aiLimiter`; unchanged by this lane |
| `tests/routes/validation-completeness.test.ts` | pass, unaffected (does not enumerate the revise routes; `validateQuery` is new infrastructure, not a route this file was tracking) |
| `tests/core/llm-seam-wiring.test.ts` | pass — confirms `rewrite-llm.ts`'s registration and the doctor's zero-LLM-cost contract are both unaffected |
| `tests/core/pure-core-boundary.test.ts` | pass — the reachable-set-from-`doctor.ts` allowlist is unchanged; `rewrite-llm.ts`'s new import of `ai-budget.ts` does not touch the reachable set (rewrite-llm.ts itself is not statically reachable from `doctor.ts` — see §3) |
| `npm run check-brain` | exit 0 after `npm run brain` regenerated the graph in this worktree |
| `tests/core/brain-coverage.test.ts` | pass, after adding this note |
| `node scripts/honesty-audit.mjs` | exit 0 |
| `tests/core/docs-gating-set.test.ts` | pass |
| `RUN_E2E=1 npm test` | 0 failures (full suite) |

(Exact numeric test counts and any gate output worth quoting verbatim are in
the session's final report rather than duplicated here twice.)

## 6. What this does NOT do

- No scoring change. `server/nvm/analyze/**`, `server/nvm/revision/passes/**`,
  `server/nvm/revision/pipeline.ts`, and `server/nvm/revision/rewrite.ts` are
  byte-for-byte unmodified.
- No quality claim. This lane bounds *how long* and *how much* a revise
  request can cost the server; it says nothing about the quality of what the
  pipeline produces, and does not touch `docs/p1-benchmark/**` or any
  discrimination floor.
- Labs gate untouched. This is the deterministic/keyless-safe route surface,
  not the Labs-only generative simulation surface (`server/engine/**`); no
  Labs flag or config was touched.
- Does not fix `converge-stream`'s analogous await-before-`ensureEnded()`
  ordering on its own timeout branch (`server/routes/nvm/converge.ts`) — the
  same bug class this lane found and fixed on `revise-stream` (§2) plausibly
  exists there too, since the code shape is the same, but `converge.ts` is
  out of this lane's stated scope and was not independently verified either
  way. Flagged as a follow-up, not fixed here.
- Does not add a `validateQuery` schema to any OTHER GET/stream route in this
  app (`converge-stream`, for instance, still parses and clamps its query
  parameters by hand). `validateQuery` is now available as general
  infrastructure for a future lane to apply there; applying it elsewhere was
  not this lane's assignment.
