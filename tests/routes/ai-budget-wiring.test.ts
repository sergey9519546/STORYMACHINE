// HTTP-level proof that server/lib/ai-budget.ts is actually WIRED into the
// highest-fan-out routes (Task 1), not merely available as an unused module —
// tests/routes/ai-budget.test.ts already proves the primitive itself works
// with a fake call-counting provider; this file proves the ROUTES use it.
//
// The budget timeouts below are driven down to a few milliseconds via env
// vars (aiBudgetEnvNumber's override seam, server/lib/ai-budget.ts) BEFORE
// server/routes/game.ts is ever imported — its budget constants are computed
// once at module load, so the override must land first, mirroring how
// helpers.ts sets SESSION_DB_DIR ahead of its own dynamic app import. Node's
// test runner isolates each *.test.ts file into its own process, so this
// does not affect any other test file's env.
process.env.AI_BUDGET_TURN_TIMEOUT_MS = '40';
process.env.AI_BUDGET_RUN_ROOM_TIMEOUT_MS = '40';
process.env.AI_BUDGET_SIMULATE_TO_FOUNTAIN_TIMEOUT_MS = '40';
process.env.AI_BUDGET_INTERVIEW_TIMEOUT_MS = '40';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, freshSessionId, type TestServer } from './helpers.ts';
import { setLLMProvider, resetLLMProvider } from '../../server/engine/ai.ts';

// A provider that resolves, but slower than the ~40ms budget deadline these
// tests set — enough to prove the budget (not the provider's own success/
// failure path) is what ends the request. Deliberately NOT a never-resolving
// promise: generateContent() itself retries transient failures up to 3x with
// its own ~30s per-attempt timeout, so a truly-hung provider makes the
// SERVER-SIDE background operation (which server/routes/game.ts's
// coordinator-safe pattern keeps awaiting after sending the early response —
// see /api/turn's comment) take 30-100+ real seconds to settle, dragging out
// or cross-contaminating later tests that also swap the global provider seam.
// Resolving after a short, bounded delay keeps every abandoned background
// operation in this file settling quickly and cleanly instead.
function slowProvider(delayMs = 150) {
  return { generate: () => new Promise((resolve) => setTimeout(() => resolve({ text: 'stub reply' }), delayMs)) };
}

/** Seeds a session with TWO agents in the same location — Orchestrator's
 *  runRoomSimulation (server/engine/Orchestrator.ts) returns immediately with
 *  NO provider call at all when a room has fewer than 2 agents
 *  ('dialogue_lock_insufficient_agents'), so the run-room/simulate-to-fountain
 *  budget-wiring tests below need two to actually reach the provider seam. */
async function seedTwoAgentSession(baseUrl: string): Promise<string> {
  const sid = freshSessionId();
  const res = await fetch(`${baseUrl}/api/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: sid,
      nodes: [{ location_id: 'gallery', name: 'Gallery', description: 'A quiet museum gallery.', adjacent_locations: [] }],
      agents: [
        {
          char_id: 'agent-eve',
          name: 'Eve Marlowe',
          public_mask: 'A composed museum curator.',
          hidden_motive: 'Recover the stolen ledger before the board finds out.',
          knowledge_vector: ['The vault code was changed the night of the gala.'],
          suspicion_score: 10,
          current_location_id: 'gallery',
        },
        {
          char_id: 'agent-tom',
          name: 'Tom Reyes',
          public_mask: 'A nervous night guard.',
          hidden_motive: 'Cover up that he fell asleep on shift.',
          knowledge_vector: ['He was not at his post at midnight.'],
          suspicion_score: 40,
          current_location_id: 'gallery',
        },
      ],
    }),
  });
  assert.equal(res.status, 200);
  return sid;
}

async function seedAgentSession(baseUrl: string): Promise<string> {
  const sid = freshSessionId();
  const res = await fetch(`${baseUrl}/api/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: sid,
      nodes: [{ location_id: 'gallery', name: 'Gallery', description: 'A quiet museum gallery.', adjacent_locations: [] }],
      agents: [{
        char_id: 'agent-eve',
        name: 'Eve Marlowe',
        public_mask: 'A composed museum curator.',
        hidden_motive: 'Recover the stolen ledger before the board finds out.',
        knowledge_vector: ['The vault code was changed the night of the gala.'],
        suspicion_score: 10,
        current_location_id: 'gallery',
      }],
    }),
  });
  assert.equal(res.status, 200);
  return sid;
}

describe('ai-budget wiring — routes actually enforce their deadline, not just import the module', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  it('POST /api/turn: a slow provider is cut off by the budget deadline (503, AI_BUDGET_DEADLINE_EXCEEDED), promptly', async () => {
    setLLMProvider(slowProvider() as never);
    try {
      const sid = await seedAgentSession(server.baseUrl);
      const start = Date.now();
      const res = await fetch(`${server.baseUrl}/api/turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid, agentId: 'agent-eve' }),
      });
      const elapsed = Date.now() - start;
      assert.equal(res.status, 503);
      const body = await res.json();
      assert.equal(body.code, 'AI_BUDGET_DEADLINE_EXCEEDED');
      assert.match(body.error, /protect the server/);
      // Generous ceiling: proves the ~40ms budget cut it off, not the
      // provider's own eventual (150ms) resolution.
      assert.ok(elapsed < 5000, `expected a prompt budget-deadline response, took ${elapsed}ms`);
    } finally {
      resetLLMProvider();
    }
  });

  it('POST /api/turn: the session remains usable after a budget timeout (coordinator was not left stuck)', async () => {
    setLLMProvider(slowProvider() as never);
    let sid: string;
    try {
      sid = await seedAgentSession(server.baseUrl);
      const timedOut = await fetch(`${server.baseUrl}/api/turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid, agentId: 'agent-eve' }),
      });
      assert.equal(timedOut.status, 503);
    } finally {
      resetLLMProvider();
    }
    // With the default (keyless) provider restored, the SAME session must
    // still accept a follow-up command — proves SessionCommandCoordinator
    // was not left waiting on the abandoned-from-the-client's-view turn.
    const followUp = await fetch(`${server.baseUrl}/api/state?sessionId=${sid}`);
    assert.equal(followUp.status, 200);
  });

  it('POST /api/game/interview: a slow provider degrades honestly with an ACCURATE budget note (not the keyless "add an AI key" note)', async () => {
    setLLMProvider(slowProvider() as never);
    try {
      const sid = await seedAgentSession(server.baseUrl);
      const res = await fetch(`${server.baseUrl}/api/game/interview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid, agentName: 'Eve Marlowe', question: 'What happened to the vault?' }),
      });
      assert.equal(res.status, 200, 'a budget stop must still be a 200 with receipts, per this route\'s existing honest-degradation contract');
      const body = await res.json();
      assert.equal(body.usedLLM, false);
      assert.match(body.note, /took too long/);
      assert.doesNotMatch(body.note, /add an AI key/, 'a budget stop is not a missing-key condition — the note must not claim it is');
      assert.ok(Array.isArray(body.receipts.beliefs) && body.receipts.beliefs.length > 0);
    } finally {
      resetLLMProvider();
    }
  });

  it('POST /api/simulate-to-fountain: a slow provider is cut off by the budget deadline (503, AI_BUDGET_DEADLINE_EXCEEDED), promptly', async () => {
    setLLMProvider(slowProvider() as never);
    try {
      const start = Date.now();
      const res = await fetch(`${server.baseUrl}/api/simulate-to-fountain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // TWO agents in the same location: Orchestrator.runRoomSimulation
        // returns immediately with no provider call at all below 2 agents
        // (server/engine/Orchestrator.ts's 'dialogue_lock_insufficient_agents'
        // guard) — this route needs a real attempted call for the budget
        // deadline to be what actually ends the request.
        body: JSON.stringify({
          nodes: [{ location_id: 'gallery', name: 'Gallery', description: 'A quiet museum gallery.', adjacent_locations: [] }],
          agents: [
            {
              char_id: 'agent-eve', name: 'Eve Marlowe', public_mask: 'A composed museum curator.',
              hidden_motive: 'Recover the stolen ledger.', knowledge_vector: [], suspicion_score: 0,
              current_location_id: 'gallery',
            },
            {
              char_id: 'agent-tom', name: 'Tom Reyes', public_mask: 'A nervous night guard.',
              hidden_motive: 'Cover up that he fell asleep on shift.', knowledge_vector: [], suspicion_score: 40,
              current_location_id: 'gallery',
            },
          ],
          location_id: 'gallery',
          maxTurns: 2,
        }),
      });
      const elapsed = Date.now() - start;
      assert.equal(res.status, 503);
      const body = await res.json();
      assert.equal(body.code, 'AI_BUDGET_DEADLINE_EXCEEDED');
      assert.ok(elapsed < 5000, `expected a prompt budget-deadline response, took ${elapsed}ms`);
    } finally {
      resetLLMProvider();
    }
  });

  it('POST /api/run-room: a slow provider is cut off by the budget deadline (503, AI_BUDGET_DEADLINE_EXCEEDED), promptly [2-agent room]', async () => {
    setLLMProvider(slowProvider() as never);
    try {
      const sid = await seedTwoAgentSession(server.baseUrl);
      const start = Date.now();
      const res = await fetch(`${server.baseUrl}/api/run-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid, nodeId: 'gallery', maxTurns: 2 }),
      });
      const elapsed = Date.now() - start;
      assert.equal(res.status, 503);
      const body = await res.json();
      assert.equal(body.code, 'AI_BUDGET_DEADLINE_EXCEEDED');
      assert.ok(elapsed < 5000, `expected a prompt budget-deadline response, took ${elapsed}ms`);
    } finally {
      resetLLMProvider();
    }
  });
});
