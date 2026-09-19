// tests/routes/nvm-revision-budget.test.ts — HTTP-level proof that
// POST /api/nvm/revise and GET /api/nvm/revise-stream have the same
// server-side deadline their sibling converge routes already have
// (server/routes/nvm/converge.ts's CONVERGE_BUDGET), plus that the stream
// route now validates its query string BEFORE flushing SSE headers.
//
// THE DEFECT (2026-09-19, revise-deadline lane; READ session report §4 row 4,
// logic audit C13): before this lane, these two routes ran up to 14
// sequential provider.generate() calls with NO server-side deadline at all —
// a bench run hit a 301s cut that turned out to be undici's CLIENT-side
// headersTimeout, not anything the server itself enforced. The FAIL-FIRST
// test below ('a hung provider is cut off by the deadline...') is the one
// that demonstrates this: run against the pre-fix server/routes/nvm/
// revision.ts (git stash the lane's changes to that file, or check out
// 31d83cb6's copy), it hangs until Node's own default test timeout kills the
// run — there is no 503, ever, because nothing on the server side was
// watching the clock. See this lane's audit
// (docs/audits/2026-09-19-revise-deadline/README.md) for the captured
// fail-first transcript.
//
// ENV VARS BEFORE ANY IMPORT (mirrors tests/routes/ai-budget-wiring.test.ts's
// own header comment): server/routes/nvm/revision.ts computes REVISE_BUDGET
// ONCE at module load via aiBudgetEnvNumber(), so the override has to land
// before that module (transitively, server/app.ts) is ever imported. Node's
// test runner isolates each *.test.ts file into its own process, so this has
// no effect on any other test file's env — see tests/routes/nvm-revision-
// budget-attempts.test.ts for why the attempt-ceiling coverage lives in a
// SEPARATE file rather than sharing this one's tiny deadline.
process.env.AI_BUDGET_REVISE_TIMEOUT_MS = '300';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, freshSessionId, type TestServer } from './helpers.ts';
import { setLLMProvider, resetLLMProvider } from '../../server/engine/ai.ts';

/** A provider whose generate() never settles — the shape a truly hung network
 *  call takes. Distinct from ai-budget-wiring.test.ts's slowProvider(), which
 *  resolves after a bounded delay: this file's whole point is proving the
 *  deadline is what ends the request, with NOTHING on the other end ever
 *  going to complete on its own — the exact case CLAUDE.md's defect report
 *  describes ("the server itself never stops"). */
function hangingProvider() {
  return { generate: () => new Promise<never>(() => {}) };
}

/** A provider that resolves immediately with a well-formed, LLM-rewrite-
 *  acceptable response (long enough to clear rewrite.ts's REWRITE_MIN_LENGTH_
 *  RATIO). Used only to prove the budget wiring does not disturb an ordinary
 *  successful run — tests/routes/nvm-revision.test.ts already covers the
 *  keyless success path exhaustively; this is the SAME route with the budget
 *  actually active end to end (real provider seam, real REVISE_BUDGET
 *  context), which the keyless suite cannot exercise since a keyless
 *  provider throws before ever reaching consumeAiAttempt()'s caller.
 *  `calls` lets a caller observe how many times it was actually invoked. */
function fastAcceptingProvider(revisedFountain: string) {
  let calls = 0;
  const provider = {
    generate: async () => {
      calls++;
      return {
        candidates: [{ finishReason: 'STOP', content: { parts: [{ text: revisedFountain }] } }],
      };
    },
  };
  return { provider, calls: () => calls };
}

/** Same three seeded scenes as tests/routes/nvm-revision.test.ts's
 *  seedThreeScenes() — duplicated rather than imported so this file has no
 *  load-order dependency on that one, and because the two files' env-var
 *  preludes (this file sets AI_BUDGET_REVISE_TIMEOUT_MS at module load) must
 *  never risk sharing an import that could pull server/app.ts in before the
 *  override lands. This exact seed is what gives the pipeline real StoryCommits
 *  to compile, which in turn is what makes at least one of the 14 passes
 *  actually find an issue and reach the LLM rewriter — an EMPTY/near-empty
 *  session triggers zero issues across all 14 passes, so the provider (real
 *  or hanging) is never even called and every test below would pass for the
 *  wrong reason (verified against this exact seed: 3 of 14 passes — intention,
 *  character-arc, payoff — find one issue each and call generate()). */
async function seedThreeScenes(server: TestServer): Promise<string> {
  const sid = freshSessionId();
  const scenes: Array<{ sceneIdx: number; ops: unknown[] }> = [
    {
      sceneIdx: 0,
      ops: [
        { op: 'ADD_FACT', fact: { factId: 'f1', subject: 'door', predicate: 'is', object: 'locked', addedAtTurn: 0, validFrom: 0, validTo: null } },
        { op: 'SEED_CLUE', clueId: 'key-under-mat', carrier: 'object' },
      ],
    },
    { sceneIdx: 1, ops: [{ op: 'RAISE_CLOCK', clockId: 'bomb', amount: 40 }] },
    {
      sceneIdx: 2,
      ops: [
        { op: 'ADD_FACT', fact: { factId: 'f2', subject: 'bomb', predicate: 'is', object: 'armed', addedAtTurn: 2, validFrom: 2, validTo: null } },
      ],
    },
  ];
  for (const scene of scenes) {
    const res = await fetch(`${server.baseUrl}/api/nvm/inject-ops`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, sceneIdx: scene.sceneIdx, ops: scene.ops }),
    });
    assert.equal(res.status, 200, 'seeding via inject-ops must succeed');
  }
  return sid;
}

describe('routes/nvm/revision — server-side AI budget (deadline + query validation)', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  // ── (a) POST /api/nvm/revise: deadline cuts off a hung provider ────────────

  it('a hung provider is cut off by the deadline (503, AI_BUDGET_DEADLINE_EXCEEDED), promptly', async () => {
    setLLMProvider(hangingProvider() as never);
    try {
      const sid = await seedThreeScenes(server);
      const start = Date.now();
      const res = await fetch(`${server.baseUrl}/api/nvm/revise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid, title: 'HUNG PROVIDER' }),
      });
      const elapsed = Date.now() - start;
      assert.equal(res.status, 503);
      const body = await res.json();
      assert.equal(body.code, 'AI_BUDGET_DEADLINE_EXCEEDED');
      assert.match(body.error, /protect the server/);
      // Generous ceiling relative to the 300ms budget: proves the deadline —
      // not the provider's own (never-arriving) resolution — ended the
      // request. Before this lane's fix, this same setup hangs until Node's
      // default test timeout kills the run; see this file's header.
      assert.ok(elapsed < 3000, `expected a prompt budget-deadline response, took ${elapsed}ms`);
    } finally {
      resetLLMProvider();
    }
  });

  // ── (b) budget wiring does not disturb an ordinary successful run ──────────

  it('a normal (fast, accepting) provider still returns the unchanged RevisionResult success shape', async () => {
    const revisedFountain = 'INT. LOCKED ROOM - NIGHT\n\nA door, and no way through it, for a very long time indeed.\n\nEVE\nWe have to find another way in, and we have very little time left.\n'.repeat(20);
    const { provider, calls } = fastAcceptingProvider(revisedFountain);
    setLLMProvider(provider as never);
    try {
      const sid = await seedThreeScenes(server);
      const res = await fetch(`${server.baseUrl}/api/nvm/revise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid, title: 'NORMAL RUN' }),
      });
      assert.equal(res.status, 200, 'the budget wiring must not turn a normal run into an error');
      const body = await res.json() as { passResults: unknown[]; failedPasses: unknown[] };
      assert.equal(body.passResults.length, 14, 'all 14 passes must still run');
      assert.deepEqual(body.failedPasses, [], 'no pass may fail when the budget is never exhausted');
      assert.ok(calls() > 0, 'the fake provider must actually have been reached (proves this is not the keyless no-op path)');
    } finally {
      resetLLMProvider();
    }
  });

  // ── (d) GET /api/nvm/revise-stream: deadline emits the terminal error event ─

  it('a hung provider makes the stream emit revision_error and close, within the deadline', async () => {
    setLLMProvider(hangingProvider() as never);
    try {
      const sid = await seedThreeScenes(server);
      const start = Date.now();
      const res = await fetch(`${server.baseUrl}/api/nvm/revise-stream?sessionId=${sid}&title=HUNG%20STREAM`);
      assert.equal(res.status, 200, 'SSE headers are already flushed by the time a deadline can fire');
      const text = await res.text();
      const elapsed = Date.now() - start;
      // Before this lane's fix, ending the response depended on first
      // AWAITING the abandoned (never-settling) pipeline promise, so the
      // stream never closed and this same assertion hung the test — see the
      // route's comment on why `operation.catch()` is NOT awaited before
      // ensureEnded() there.
      assert.ok(elapsed < 3000, `expected the stream to close promptly on deadline, took ${elapsed}ms`);
      const events = text.split('\n\n').filter((c) => c.startsWith('data: ')).map((c) => JSON.parse(c.slice('data: '.length)));
      assert.ok(
        events.some((e) => e.type === 'revision_error' && e.error === 'ai_budget_exceeded'),
        `expected a terminal revision_error/ai_budget_exceeded event, got: ${JSON.stringify(events)}`,
      );
      assert.equal(events[events.length - 1].type, 'revision_error', 'the budget error must be the LAST event on the stream');
    } finally {
      resetLLMProvider();
    }
  });

  // ── (e) GET /api/nvm/revise-stream: query validation runs before SSE opens ──

  it('rejects a malformed sessionId query with 400 (not a 200 SSE stream carrying an error event)', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/revise-stream?sessionId=${encodeURIComponent('not a valid id!')}`);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /^sessionId: /);
    assert.equal(res.headers.get('content-type')?.includes('text/event-stream'), false, 'a validation 400 must not be an SSE response');
  });

  it('rejects an over-long title query with 400 (ReviseStreamQuerySchema max 256, same bound as ReviseBodySchema)', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/revise-stream?sessionId=${freshSessionId()}&title=${'x'.repeat(257)}`);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /^title: /);
  });
});
