---
type: audit
updated: 2026-09-19
sources: [docs/audits/2026-09-19-revise-deadline/README.md, server/routes/nvm/revision.ts, server/routes/nvm/converge.ts, server/lib/ai-budget.ts, server/lib/validation.ts, server/nvm/revision/rewrite-llm.ts, server/nvm/revision/pipeline.ts, tests/routes/nvm-revision-budget.test.ts, tests/routes/nvm-revision-budget-attempts.test.ts, docs/story-generation/STORY_BENCH_2026-09-13.md, .env.example]
status: active
---

# Audit — 2026-09-19 Revise Deadline

**Directory:** `docs/audits/2026-09-19-revise-deadline/` — the lane record
for giving `POST /api/nvm/revise` and `GET /api/nvm/revise-stream` the same
server-side deadline, attempt ceiling and budget context their sibling
`server/routes/nvm/converge.ts` routes already have, added on
`claude/fable-5-1-orchestrator-yil0xr` from `31d83cb6`.

## What it answers

READ session report §4 row 4 / logic audit C13: the 14-pass revision
pipeline made up to 14 sequential `provider.generate()` calls with **no
server-side deadline, attempt ceiling, or budget context at all** — unlike
every `converge.ts` route. [[Generation - Story Bench]] §4c independently
measured the consequence: a 300 s client-side `headersTimeout` was mistaken
for a server-side deadline (it was undici's, not the server's own), costing
three of six bench premises their entire revision step with no hint the
timeout was client-side. The client fix landed separately
(`ee115561`); this lane is the server-side half that was still missing.

`server/routes/nvm/revision.ts` now has `REVISE_BUDGET: AiBudgetLimits`,
wired through `runWithBudgetContext()`/`withDeadline()` exactly as
`converge.ts`'s `CONVERGE_BUDGET` is (`AI_BUDGET_REVISE_TIMEOUT_MS`, default
900 s; `AI_BUDGET_REVISE_MAX_ATTEMPTS`, default 28). `GET
/api/nvm/revise-stream` also gained `validateQuery(ReviseStreamQuerySchema)`
— a new middleware (`server/lib/validation.ts`) run **before** SSE headers
flush, fixing a real bug this lane found: a malformed query used to be caught
by the route's own try/catch *after* headers were already sent, producing a
`200` with a generic error event instead of a clean `400`.

## The attempt-ceiling design choice (why it is not `withCountedAttempts()`)

`converge.ts` counts attempts by wrapping a route-constructed `generate`
function reference and handing it into `convergeScene()` by reference. The
revision pipeline has no equivalent seam — `server/nvm/revision/
rewrite-llm.ts` calls `getGenerativeProvider()` itself as a self-registered
singleton. Both files that WOULD let a budget-exhausted error abort the
request (`pipeline.ts`'s per-pass loop, `rewrite.ts`'s `rewritePass()`) are
on the scoring path (`scripts/check-scoring-receipt.mjs`) and this lane may
not touch either — and `pipeline.ts`'s per-pass `try/catch` already turns
**any** thrown error into a no-op skipped-pass entry rather than propagating
it, for every caller, not just this one.

So the fix is the smallest one available: `consumeAiAttempt()` runs inside
`rewrite-llm.ts`'s `llmRewrite()`, in the SAME `try` block that already
treats "no API key" as "fall back to the unchanged draft." This **really
does** bound total provider calls per request — verified directly: with a
ceiling of 2 against an input that naturally drives 3+ passes to call the
provider, exactly 2 real calls happen. It does **not** turn an
exhausted-budget request into a distinct HTTP error the way a deadline
timeout does; the route still returns a normal `200`, degraded exactly like
a missing key would degrade it. (Converge's own attempts-exceeded path is,
on inspection, not actually shaped into a distinct error either — only its
wall-clock `timedOut` branch is; see the README §3 for the full trace.) The
wall-clock deadline is what gives this route its actual "cannot hang
forever" guarantee; the ceiling is defense-in-depth against cost within an
otherwise-on-time request.

## A bug found and fixed in the same change: SSE deadline ordering

Copying `converge-stream`'s timeout branch verbatim (`emitSSE(...); await
operation.catch(() => {}); return;`) does not close the SSE connection
promptly when the abandoned operation never settles (a truly hung provider
call — the exact failure this budget exists to bound): a live probe against
a never-resolving fake provider showed the client-visible stream simply
never ending, even though the terminal error event had already been
written. `revise-stream`'s branch now calls `ensureEnded()` immediately
after emitting the event and lets the abandoned operation settle in the
background, unawaited (`operation.catch(() => {})`, never an unhandled
rejection). `converge-stream` was not touched or independently re-verified
either way; the same bug shape plausibly exists there too and is named as a
follow-up in the README rather than fixed here.

## Why it is safe to have merged

Nothing on the scoring path changed — `node scripts/check-scoring-receipt.mjs
31d83cb6..HEAD` reports *no scoring-path files changed*;
`server/nvm/revision/pipeline.ts` and `server/nvm/revision/rewrite.ts` are
untouched, and `rewrite-llm.ts` (edited) is not itself reachable from
`doctor.ts` — confirmed by `tests/core/pure-core-boundary.test.ts`'s
allowlist staying unchanged. Fail-first tested: the new deadline test hangs
indefinitely (killed only by an external `timeout` wrapper, exit 124, no
server-side stop at all) against the pre-lane route file, and passes cleanly
against the fix. No quality claim, no Labs-gate change — this bounds cost
and duration, not what the pipeline produces.

**Related:** [[Generation - Story Bench]],
[[Audit - 2026-09-19 TypeSafe Cast Alignment]],
[[Audit - 2026-09-19 Generation Prompt Inputs]],
[[Audit - 2026-09-19 Converge Stream Close]] (the follow-up this README's §6
named, which fixes the identical bug on `converge-stream`), [[Patterns]],
`docs/LANE_STANDARD.md`,
`docs/audits/2026-09-19-revise-deadline/README.md`.

## Sources

- `docs/audits/2026-09-19-revise-deadline/README.md`
- `server/routes/nvm/revision.ts`
- `server/routes/nvm/converge.ts`
- `server/lib/ai-budget.ts`
- `server/lib/validation.ts`
- `server/nvm/revision/rewrite-llm.ts`
- `server/nvm/revision/pipeline.ts`
- `tests/routes/nvm-revision-budget.test.ts`
- `tests/routes/nvm-revision-budget-attempts.test.ts`
- `docs/story-generation/STORY_BENCH_2026-09-13.md`
- `.env.example`
