// tests/routes/nvm-converge-stream-timeout.test.ts — HTTP-level proof that
// GET /api/nvm/converge-stream closes its SSE response on a deadline timeout
// instead of hanging behind an awaited, abandoned operation.
//
// THE DEFECT (2026-09-19, converge-stream-close lane): the timeout branch
// used to be `emitSSE({...}); await operation.catch(() => {}); return;` —
// awaiting the abandoned `operation` BEFORE the outer `finally {
// ensureEnded(); }` could run, so `res.end()` never happened when the
// underlying provider call was truly hung, even though the terminal SSE
// event had already been written. The identical bug was found and fixed on
// GET /api/nvm/revise-stream first (520a3891; docs/audits/2026-09-19-
// revise-deadline/README.md §2, §4, which named this exact route/branch as a
// follow-up rather than fixing it there) — this file mirrors that lane's
// fail-first proof and its assertions for the converge-stream sibling.
// See docs/audits/2026-09-19-converge-stream-close/README.md for the
// captured fail-first transcript and the coordinator-safety analysis of why
// this reordering is safe even though — unlike revise-stream — this route IS
// withSessionCommand-wrapped.
//
// ENV VAR BEFORE ANY IMPORT (mirrors tests/routes/nvm-revision-budget.test.ts
// and tests/routes/ai-budget-wiring.test.ts's own header comments):
// server/routes/nvm/converge.ts computes CONVERGE_BUDGET ONCE at module load
// via aiBudgetEnvNumber(), so the override has to land before that module
// (transitively, server/app.ts) is ever imported. Node's test runner
// isolates each *.test.ts file into its own process, so this has no effect
// on any other test file's env.
process.env.AI_BUDGET_CONVERGE_TIMEOUT_MS = '250';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, freshSessionId, type TestServer } from './helpers.ts';
import { setLLMProvider, resetLLMProvider } from '../../server/engine/ai.ts';

/** A provider whose generate() never settles — the shape a truly hung network
 *  call takes. Same construction as tests/routes/nvm-revision-budget.test.ts's
 *  hangingProvider(): the whole point is proving the deadline (not the
 *  provider's own eventual success/failure) is what ends the request, with
 *  NOTHING on the other end ever going to complete on its own. */
function hangingProvider() {
  return { generate: () => new Promise<never>(() => {}) };
}

/** A real mechanism id — server/nvm/converge/loop.ts's MechanismProof
 *  requires one. Mirrors tests/routes/nvm-converge-select.test.ts's
 *  REAL_MECHANISM constant (duplicated rather than imported so this file has
 *  no load-order dependency on that one, and because that file sets no env
 *  var but this one must set AI_BUDGET_CONVERGE_TIMEOUT_MS ahead of any
 *  import). */
const REAL_MECHANISM = 'relationship_externalization';

/** Builds the GET /api/nvm/converge-stream query string for a valid,
 *  minimal request — sceneIdx 0 (Tier 1 always passes there, per
 *  nvm-converge-select.test.ts) so the request reaches convergeScene()'s
 *  first `generate()` call rather than failing validation or short-
 *  circuiting before ever touching the provider seam. */
function convergeStreamQuery(sid: string): string {
  const params = new URLSearchParams({
    sessionId: sid,
    sceneIdx: '0',
    sceneFunction: 'build_tension',
    tensionTarget: '60',
    qualityTarget: '60',
    maxIterations: '2',
    candidatesPerIteration: '2',
  });
  return params.toString();
}

describe('routes/nvm/converge — GET /api/nvm/converge-stream closes on deadline timeout', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  it('a hung provider makes the stream emit converge_error and CLOSE, promptly, with no unhandled rejection', async () => {
    // (c) unhandled-rejection spy for the duration of this test. The fix's
    // whole safety property is that the abandoned `operation.catch(() => {})`
    // can never surface as an unhandled rejection — this is the direct proof,
    // not merely an inference from reading the code.
    const unhandled: unknown[] = [];
    const onUnhandledRejection = (reason: unknown) => { unhandled.push(reason); };
    process.on('unhandledRejection', onUnhandledRejection);

    setLLMProvider(hangingProvider() as never);
    try {
      const sid = freshSessionId();
      const start = Date.now();
      const res = await fetch(`${server.baseUrl}/api/nvm/converge-stream?${convergeStreamQuery(sid)}`);
      assert.equal(res.status, 200, 'SSE headers are already flushed by the time a deadline can fire');
      // (b) the response stream CLOSES: res.text() only resolves once the
      // body reader reaches end (the server called res.end()), so measuring
      // elapsed time around it is a direct proof the connection closed, not
      // merely that an event was written to a still-open socket.
      const text = await res.text();
      const elapsed = Date.now() - start;
      // Before this lane's fix, ending the response depended on first
      // AWAITING the abandoned (never-settling) convergeScene() operation, so
      // the stream never closed and this same assertion hung the test — see
      // the route's comment on why `operation.catch()` is NOT awaited before
      // ensureEnded() there.
      assert.ok(elapsed < 3000, `expected the stream to close promptly on deadline, took ${elapsed}ms`);

      // (a) a converge_error/ai_budget_exceeded event arrived, and it is the
      // LAST event on the stream (the terminal event this route ever sends
      // on a timeout).
      const events = text.split('\n\n').filter((c) => c.startsWith('data: ')).map((c) => JSON.parse(c.slice('data: '.length)));
      assert.ok(
        events.some((e) => e.type === 'converge_error' && e.error === 'ai_budget_exceeded'),
        `expected a terminal converge_error/ai_budget_exceeded event, got: ${JSON.stringify(events)}`,
      );
      assert.equal(events[events.length - 1].type, 'converge_error', 'the budget error must be the LAST event on the stream');

      // Give the abandoned (still-pending, never-resolving) `operation` a
      // beat to have its `.catch(() => {})` handler attached and observed by
      // Node's rejection-tracking machinery before checking for unhandled
      // rejections — it never actually settles (hangingProvider().generate()
      // never resolves), so there is nothing to await here; this is purely
      // "let a microtask/macrotask turn pass."
      await new Promise((resolve) => setTimeout(resolve, 50));
    } finally {
      resetLLMProvider();
      process.off('unhandledRejection', onUnhandledRejection);
    }

    // (c) no unhandled rejection was emitted during the test.
    assert.deepEqual(unhandled, [], `expected zero unhandledRejection events, got: ${JSON.stringify(unhandled)}`);
  });
});
