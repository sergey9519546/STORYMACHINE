// tests/routes/nvm-revision-budget-attempts.test.ts — POST /api/nvm/revise's
// attempt ceiling actually bounds provider.generate() calls, not merely the
// wall-clock deadline tests/routes/nvm-revision-budget.test.ts covers.
//
// SEPARATE FILE, SEPARATE PROCESS: this file overrides
// AI_BUDGET_REVISE_MAX_ATTEMPTS instead of AI_BUDGET_REVISE_TIMEOUT_MS.
// server/routes/nvm/revision.ts computes REVISE_BUDGET once at module load,
// so the two overrides cannot coexist in one process without one shadowing
// the intent of the other's test — node:test's one-process-per-file isolation
// (same reasoning as the sibling file's header comment) is what makes running
// both safe.
//
// DESIGN CHOICE THIS FILE PINS (server/routes/nvm/revision.ts's REVISE_BUDGET
// comment has the full argument): unlike server/routes/nvm/converge.ts, this
// pipeline has no route-constructed `generate` function reference to wrap
// with withCountedAttempts() — server/nvm/revision/rewrite-llm.ts calls
// getGenerativeProvider() itself as a self-registered singleton. The smallest
// correct fix is consumeAiAttempt() inside llmRewrite(), in the SAME try/catch
// that already treats "no key"/"provider threw" as "fall back to the
// unchanged draft for this pass" — server/nvm/revision/pipeline.ts (scoring
// path; this lane must not touch it) already swallows a thrown error per pass
// into a no-op rather than aborting the request, so an exhausted budget
// degrades the SAME way a missing key does: the ceiling still bounds real
// provider calls (what this test proves), but the route still returns 200,
// not a distinct error status.
process.env.AI_BUDGET_REVISE_MAX_ATTEMPTS = '2';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, freshSessionId, type TestServer } from './helpers.ts';
import { setLLMProvider, resetLLMProvider } from '../../server/engine/ai.ts';

/** Same three-scene seed as the sibling budget test file (duplicated for the
 *  same reason — no cross-file import that could disturb either file's env
 *  prelude). This exact seed makes 3 of the 14 passes (intention,
 *  character-arc, payoff) find an issue and reach the LLM rewriter — the
 *  ceiling of 2 this file sets is deliberately BELOW that natural demand, so
 *  a real cap (not merely "never observed to exceed 2") is what the test
 *  proves. */
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

describe('routes/nvm/revision — attempt ceiling actually bounds provider.generate() calls', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  it('a provider that always succeeds is still capped at the ceiling (2), not called for all 3 issue-bearing passes', async () => {
    let calls = 0;
    const revisedFountain = 'INT. LOCKED ROOM - NIGHT\n\nA door, and no way through it, for a very long time indeed.\n\nEVE\nWe have to find another way in, and we have very little time left.\n'.repeat(20);
    setLLMProvider({
      generate: async () => {
        calls++;
        return {
          candidates: [{ finishReason: 'STOP', content: { parts: [{ text: revisedFountain }] } }],
        };
      },
    } as never);
    try {
      const sid = await seedThreeScenes(server);
      const res = await fetch(`${server.baseUrl}/api/nvm/revise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid, title: 'CEILING TEST' }),
      });
      // The pipeline still completes normally — see this file's header for
      // why an exhausted budget degrades like a missing key rather than
      // becoming a distinct route-level error here.
      assert.equal(res.status, 200);
      const body = await res.json() as { failedPasses: string[] };
      assert.deepEqual(body.failedPasses, [], 'a budget-exhausted pass degrades to unchanged text, not a recorded pipeline failure');
      assert.equal(calls, 2, `expected the ceiling (2) to cap real provider calls below the natural demand (3); got ${calls}`);
    } finally {
      resetLLMProvider();
    }
  });
});
