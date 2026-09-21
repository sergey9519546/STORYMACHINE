---
type: audit
updated: 2026-09-19
sources: [docs/audits/2026-09-19-converge-stream-close/README.md, server/routes/nvm/converge.ts, server/routes/nvm/revision.ts, server/lib/ai-budget.ts, server/nvm/converge/loop.ts, tests/routes/nvm-converge-stream-timeout.test.ts, docs/audits/2026-09-19-revise-deadline/README.md]
status: active
---

# Audit — 2026-09-19 Converge Stream Close

**Directory:** `docs/audits/2026-09-19-converge-stream-close/` — the lane
record for closing `GET /api/nvm/converge-stream`'s SSE response on a
deadline timeout instead of hanging behind an awaited, abandoned operation,
on `claude/fable-5-1-orchestrator-yil0xr` from `aa0d785f`.

## What it answers

The exact bug class [[Audit - 2026-09-19 Revise Deadline]] found and fixed on
`GET /api/nvm/revise-stream`, applied to its sibling route. Before this lane,
`server/routes/nvm/converge.ts`'s timeout branch was `emitSSE({...}); await
operation.catch(() => {}); return;` — the `await` runs before the function
returns, which is before the outer `finally { ensureEnded(); }` can execute.
For a truly hung provider call (the exact case `AI_BUDGET_CONVERGE_
TIMEOUT_MS` exists to bound), that `await` never resolves, so `res.end()`
never runs and the SSE connection stays open indefinitely even though the
terminal `converge_error` event was already written. The revise-deadline
lane's README explicitly named this route/branch as an
un-independently-verified follow-up rather than fixing it; this lane is that
follow-up.

The fix mirrors `revision.ts`'s: emit the terminal event, let the abandoned
`operation` settle in the background unawaited (`.catch(() => {})`, never an
unhandled rejection), then call `ensureEnded()` immediately.

## The coordinator-safety question this lane had to answer that revise-stream didn't

`revise-stream` is not `withSessionCommand`-wrapped (no Stage/SQLite writes
at all), so abandoning its operation was uncomplicated. `converge-stream` IS
`withSessionCommand`-wrapped, and this file's own header warns:
"SessionCommandCoordinator must never admit the next queued command before
this one's real Stage/ghost-ledger writes are done." Reordering the timeout
branch to not await `operation` means the handler (and therefore
`session.commands.run()`) resolves before `operation` settles — is that
actually safe here?

Yes, verified directly: `convergeScene()` (`server/nvm/converge/loop.ts`)
takes a plain `NarrativeState` value, not `Stage`, and neither it nor any
module in its dependency graph imports `Stage` or touches the session's
SQLite handle — it is pure computation. The only code on this route that
calls `appendGhost(stage, ...)` runs strictly *after* `const result =
raced.value;`, i.e. only on the non-timeout success path in the same
function call; on a timeout that code is never reached, and the abandoned
`operation` promise has no `.then()` continuation that would read its
eventually-resolved ghosts even if it settles later. So this command makes
**zero** Stage writes on the timeout path whether `operation` is awaited or
not — the coordinator guarantee is not weakened.

This is a genuinely different case from `POST /api/nvm/converge-arc`, whose
`appendGhost()` calls run *inside* the `operation` itself (inside its
per-scene loop) — abandoning that operation on timeout really would risk a
Stage-write race, which is exactly why `converge-arc`'s (and `converge`'s)
timeout branches were verified and correctly left unchanged: both respond
via `res.json()`, which ends the client-visible response before the
trailing `await operation.catch(() => {})` runs, so the client is never kept
waiting — and for `converge-arc` specifically, that trailing await is also
load-bearing for coordinator safety, not merely harmless.

## Why it is safe to have merged

Nothing on the scoring path changed — `check-scoring-receipt.mjs` reports no
scoring-path files touched; `server/nvm/converge/loop.ts` and every other
scoring-path file are unmodified. Fail-first tested: `git stash push
server/routes/nvm/converge.ts` reverted the file to its pre-fix content, and
the new test (`tests/routes/nvm-converge-stream-timeout.test.ts`) against a
never-resolving fake provider hung until an external `timeout 15` killed it
(exit 124, no server-side stop at all) — the same shape
`nvm-revision-budget.test.ts`'s fail-first transcript showed for
revise-stream. Restoring the fix (`git stash pop`) made the same test pass
green, asserting the terminal event arrives, the stream closes within 3s
(measured around `await res.text()`, which only resolves once the body
reader reaches end), and zero `unhandledRejection` events fire.

**Related:** [[Audit - 2026-09-19 Revise Deadline]], [[Patterns]],
`docs/LANE_STANDARD.md`,
`docs/audits/2026-09-19-converge-stream-close/README.md`.

## Sources

- `docs/audits/2026-09-19-converge-stream-close/README.md`
- `server/routes/nvm/converge.ts`
- `server/routes/nvm/revision.ts`
- `server/lib/ai-budget.ts`
- `server/nvm/converge/loop.ts`
- `tests/routes/nvm-converge-stream-timeout.test.ts`
- `docs/audits/2026-09-19-revise-deadline/README.md`
