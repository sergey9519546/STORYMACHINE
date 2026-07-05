// HTTP behavior for POST /api/game/interview (character-interview feature).
// Deliverable 3 unit tests for the pure buildInterviewGrounding() builder live
// in tests/core/interview.test.ts instead — this file is HTTP-surface only
// (session seeding, status codes, response shape, the ai.ts provider seam).
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, freshSessionId, type TestServer } from './helpers.ts';
import { setLLMProvider, resetLLMProvider } from '../../server/engine/ai.ts';

describe('routes/game — POST /api/game/interview', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  // Seeds a fresh session with one agent (with a knowledge_vector fact, which
  // Stage.addAgent seeds as a witnessed belief — see server/engine/Stage.ts) so
  // every test in this file has a real, non-empty CharacterSheet to interview.
  async function seedSession(): Promise<string> {
    const sid = freshSessionId();
    const res = await fetch(`${server.baseUrl}/api/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sid,
        // Character_State.current_location_id has a FOREIGN KEY REFERENCES
        // Locations(location_id) — an agent pointed at an unregistered node id
        // (or '') fails the insert (silently, per /api/init's per-agent
        // try/catch) and the agent never actually ends up in the session. So
        // the node must be registered in the same /api/init call.
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

  it('keyless: returns 200 with full receipts, usedLLM:false, a note, and NO answer field', async () => {
    const sid = await seedSession();
    const res = await fetch(`${server.baseUrl}/api/game/interview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, agentName: 'Eve Marlowe', question: 'What happened to the vault?' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();

    assert.equal(body.usedLLM, false);
    assert.equal(typeof body.note, 'string');
    assert.ok(body.note.length > 0);
    assert.equal('answer' in body, false, 'keyless response must not include an answer field');

    assert.ok(Array.isArray(body.receipts.beliefs));
    assert.ok(body.receipts.beliefs.length > 0, 'the seeded knowledge_vector fact should surface as a belief receipt');
    assert.equal(typeof body.receipts.emotion.dominant, 'string');
    assert.equal(typeof body.receipts.emotion.intensity, 'number');
    assert.ok('defense' in body.receipts && 'gloss' in body.receipts.defense);
    assert.equal(typeof body.receipts.speechPattern, 'string');
    assert.ok(Array.isArray(body.receipts.goals));
    assert.ok(Array.isArray(body.receipts.relationshipsInPlay));
  });

  it('unknown agent name returns 404 with a clear message', async () => {
    const sid = await seedSession();
    const res = await fetch(`${server.baseUrl}/api/game/interview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, agentName: 'Nobody Here', question: 'Are you real?' }),
    });
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.match(body.error, /Nobody Here/);
  });

  it('malformed body — missing question — is rejected with 400', async () => {
    const sid = await seedSession();
    const res = await fetch(`${server.baseUrl}/api/game/interview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, agentName: 'Eve Marlowe' }),
    });
    assert.equal(res.status, 400);
  });

  it('malformed body — oversized history (>20 turns) — is rejected with 400', async () => {
    const sid = await seedSession();
    const history = Array.from({ length: 21 }, (_, i) => ({ role: 'user' as const, text: `turn ${i}` }));
    const res = await fetch(`${server.baseUrl}/api/game/interview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, agentName: 'Eve Marlowe', question: 'Hello?', history }),
    });
    assert.equal(res.status, 400);
  });

  it('malformed body — an oversized history entry (>2000 chars) — is rejected with 400', async () => {
    const sid = await seedSession();
    const history = [{ role: 'character' as const, text: 'x'.repeat(2001) }];
    const res = await fetch(`${server.baseUrl}/api/game/interview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, agentName: 'Eve Marlowe', question: 'Hello?', history }),
    });
    assert.equal(res.status, 400);
  });

  it('mocked provider (ai.ts seam): canned reply yields 200 with answer, usedLLM:true, and receipts still present', async () => {
    setLLMProvider({ generate: async () => ({ text: '  I would rather not discuss the vault.  ' } as never) });
    try {
      const sid = await seedSession();
      const res = await fetch(`${server.baseUrl}/api/game/interview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid, agentName: 'Eve Marlowe', question: 'What happened to the vault?' }),
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.usedLLM, true);
      assert.equal(body.answer, 'I would rather not discuss the vault.');
      assert.equal('note' in body, false);
      assert.ok(Array.isArray(body.receipts.beliefs) && body.receipts.beliefs.length > 0);
    } finally {
      resetLLMProvider();
    }
  });

  it('mocked provider: an empty completion falls through to the keyless shape', async () => {
    setLLMProvider({ generate: async () => ({ text: '   ' } as never) });
    try {
      const sid = await seedSession();
      const res = await fetch(`${server.baseUrl}/api/game/interview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid, agentName: 'Eve Marlowe', question: 'What happened to the vault?' }),
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.usedLLM, false);
      assert.equal(typeof body.note, 'string');
      assert.equal('answer' in body, false);
    } finally {
      resetLLMProvider();
    }
  });

  it('keyless receipts are deterministic across two identical calls', async () => {
    const sid = await seedSession();
    const makeRequest = () => fetch(`${server.baseUrl}/api/game/interview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, agentName: 'Eve Marlowe', question: 'What happened to the vault?' }),
    }).then(r => r.json());

    const [first, second] = await Promise.all([makeRequest(), makeRequest()]);
    assert.deepEqual(first.receipts, second.receipts);
    assert.equal(first.usedLLM, false);
    assert.equal(second.usedLLM, false);
  });
});
