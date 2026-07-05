// HTTP-surface tests for the simulation↔NVM integration fixes:
//   Fix B — /api/init (and /api/simulate-to-fountain) now accept + apply
//           darkTriad/bigFive/attachmentStyle/defenseMechanisms/goalStack.
//   Fix C — Tier-1 canon drops surface as an additive `droppedCommits` field.
//   Fix D — POST /api/run-scene exposes the previously-dormant
//           Orchestrator.runFullScene (multi-room orchestration).
//
// Runs keyless throughout (no GEMINI_API_KEY in this environment) —
// Agent.takeTurn/updateEpistemics/DirectorNode already degrade gracefully
// without a key (each generateContent call site has its own .catch → a safe
// fallback value), which is exactly the "must not 500 keyless" behavior Fix D
// requires and this file exercises directly.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, freshSessionId, type TestServer } from './helpers.ts';
import { resetLLMProvider } from '../../server/engine/ai.ts';
import { Stage } from '../../server/engine/Stage.ts';
import { Orchestrator } from '../../server/engine/Orchestrator.ts';

describe('routes/game — Fix B (psychology at init)', async () => {
  let server: TestServer;
  before(async () => { resetLLMProvider(); server = await startTestServer(); });
  after(async () => { await server.close(); });

  function agentPayload(overrides: Record<string, unknown> = {}) {
    return {
      char_id: 'agent-nora',
      name: 'Nora Vance',
      public_mask: 'A composed art dealer.',
      hidden_motive: 'Protect the forged painting.',
      knowledge_vector: ['The painting is a forgery.'],
      suspicion_score: 10,
      current_location_id: 'gallery',
      ...overrides,
    };
  }

  async function initSession(sid: string, agent: Record<string, unknown>): Promise<Response> {
    return fetch(`${server.baseUrl}/api/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sid,
        nodes: [{ location_id: 'gallery', name: 'Gallery', description: 'A quiet gallery.', adjacent_locations: [] }],
        agents: [agent],
      }),
    });
  }

  it('init with full psychology → /api/game/interview receipts reflect the configured attachment/defense/goals', async () => {
    const sid = freshSessionId();
    const initRes = await initSession(sid, agentPayload({
      attachmentStyle: 'avoidant',
      darkTriad: { machiavellianism: 70, narcissism: 60, psychopathy: 40 },
      bigFive: { openness: 50, conscientiousness: 50, extraversion: 50, agreeableness: 50, neuroticism: 50 },
      defenseMechanisms: ['denial'],
      goalStack: {
        terminal: { id: 'goal-terminal', description: 'Escape prosecution', value: 90, achieved: false },
        instrumental: [
          { id: 'goal-1', description: 'Destroy the ledger', value: 80, achieved: false },
        ],
        last_planned_at: 0,
      },
    }));
    assert.equal(initRes.status, 200);

    const res = await fetch(`${server.baseUrl}/api/game/interview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, agentName: 'Nora Vance', question: 'What do you want?' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.receipts.attachment.style, 'avoidant', 'configured attachmentStyle reached the live CharacterSheet');
    assert.ok(
      body.receipts.goals.includes('Destroy the ledger'),
      'configured goalStack instrumental goal surfaces as a receipt',
    );
  });

  it('init WITHOUT psychology fields → unchanged defaults (backward compat)', async () => {
    const sid = freshSessionId();
    const initRes = await initSession(sid, agentPayload());
    assert.equal(initRes.status, 200);

    const res = await fetch(`${server.baseUrl}/api/game/interview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, agentName: 'Nora Vance', question: 'What do you want?' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.receipts.attachment.style, 'secure', 'default attachment style is unchanged when omitted');
    // No goalStack supplied → falls back to hidden_motive (interview.ts's documented fallback).
    assert.deepEqual(body.receipts.goals, ['Protect the forged painting.']);
  });

  it('invalid attachmentStyle is rejected with 400 (zod validation)', async () => {
    const sid = freshSessionId();
    const res = await initSession(sid, agentPayload({ attachmentStyle: 'obsessed' }));
    assert.equal(res.status, 400);
  });

  it('invalid darkTriad value (out of 0-100 range) is rejected with 400', async () => {
    const sid = freshSessionId();
    const res = await initSession(sid, agentPayload({
      darkTriad: { machiavellianism: 500, narcissism: 50, psychopathy: 50 },
    }));
    assert.equal(res.status, 400);
  });

  it('invalid defenseMechanisms entry is rejected with 400', async () => {
    const sid = freshSessionId();
    const res = await initSession(sid, agentPayload({ defenseMechanisms: ['gaslighting'] }));
    assert.equal(res.status, 400);
  });
});

describe('routes/game — Fix C (droppedCommits surfacing)', async () => {
  let server: TestServer;
  before(async () => { resetLLMProvider(); server = await startTestServer(); });
  after(async () => { await server.close(); });

  it('a normal keyless /api/turn response has NO droppedCommits field (additive-only, absent when zero)', async () => {
    const sid = freshSessionId();
    const initRes = await fetch(`${server.baseUrl}/api/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sid,
        nodes: [{ location_id: 'gallery', name: 'Gallery', description: 'desc', adjacent_locations: [] }],
        agents: [
          { char_id: 'a1', name: 'Alpha', public_mask: 'calm', hidden_motive: 'win', current_location_id: 'gallery' },
          { char_id: 'a2', name: 'Beta', public_mask: 'calm', hidden_motive: 'win', current_location_id: 'gallery' },
        ],
      }),
    });
    assert.equal(initRes.status, 200);

    const res = await fetch(`${server.baseUrl}/api/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, agentId: 'a1' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok('action' in body);
    assert.equal('droppedCommits' in body, false, 'droppedCommits must be absent when nothing was dropped');
  });

  // Forcing a genuine Tier-1 rejection through the live HTTP engine keylessly
  // is not cheaply deterministic (it would require mocking the exact Gemini
  // JSON response shape for updateEpistemics to synthesize an illegal belief).
  // Per the task's own guidance, the collection/drain plumbing is instead
  // unit-tested directly here (Orchestrator.consumeDroppedCommits), and the
  // onTier1Reject → buildTurnCommit contract is fully covered end-to-end,
  // including a REAL forced Tier-1 rejection, in tests/core/bridge-ops.test.ts.
  it('Orchestrator.consumeDroppedCommits() plumbing: null when nothing dropped, and drains-to-null after a read', () => {
    const stage = new Stage(':memory:');
    try {
      const orchestrator = new Orchestrator(stage);
      assert.equal(orchestrator.consumeDroppedCommits(), null, 'nothing dropped yet on a fresh Orchestrator');
      // A second consecutive read must also be null (idempotent no-op drain).
      assert.equal(orchestrator.consumeDroppedCommits(), null);
    } finally {
      stage.close();
    }
  });
});

describe('routes/game — Fix D (POST /api/run-scene)', async () => {
  let server: TestServer;
  before(async () => { resetLLMProvider(); server = await startTestServer(); });
  after(async () => { await server.close(); });

  it('keyless: an empty (no-agent) scene returns 200 with the hollow-but-valid structure', async () => {
    const sid = freshSessionId();
    const initRes = await fetch(`${server.baseUrl}/api/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sid,
        nodes: [
          { location_id: 'room-a', name: 'Room A', description: 'desc', adjacent_locations: ['room-b'] },
          { location_id: 'room-b', name: 'Room B', description: 'desc', adjacent_locations: ['room-a'] },
        ],
      }),
    });
    assert.equal(initRes.status, 200);

    const res = await fetch(`${server.baseUrl}/api/run-scene`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, locationIds: ['room-a', 'room-b'] }),
    });
    assert.equal(res.status, 200, 'must not 500 keylessly, even with no agents to drive');
    const body = await res.json();
    assert.equal(body.status, 'completed');
    assert.equal(body.roundsRun, 0, 'no agents anywhere → runFullScene exits before any round');
    assert.equal(body.totalTurns, 0);
    assert.deepEqual(body.locationIds, ['room-a', 'room-b']);
    assert.equal('droppedCommits' in body, false);
  });

  it('keyless: a scene with two agents in one room actually runs turns and returns 200', async () => {
    const sid = freshSessionId();
    const initRes = await fetch(`${server.baseUrl}/api/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sid,
        nodes: [{ location_id: 'gallery', name: 'Gallery', description: 'desc', adjacent_locations: [] }],
        agents: [
          { char_id: 'a1', name: 'Alpha', public_mask: 'calm', hidden_motive: 'win', current_location_id: 'gallery' },
          { char_id: 'a2', name: 'Beta', public_mask: 'calm', hidden_motive: 'win', current_location_id: 'gallery' },
        ],
      }),
    });
    assert.equal(initRes.status, 200);

    const res = await fetch(`${server.baseUrl}/api/run-scene`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, locationIds: ['gallery'], roundsPerRoom: 2 }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'completed');
    assert.ok(body.totalTurns > 0, 'runFullScene actually drove turns for the seeded agents');
  });

  it('an unknown locationId is rejected with 404', async () => {
    const sid = freshSessionId();
    const res = await fetch(`${server.baseUrl}/api/run-scene`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, locationIds: ['nowhere'] }),
    });
    assert.equal(res.status, 404);
  });

  it('an empty locationIds array is rejected with 400 (zod min(1))', async () => {
    const sid = freshSessionId();
    const res = await fetch(`${server.baseUrl}/api/run-scene`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, locationIds: [] }),
    });
    assert.equal(res.status, 400);
  });

  it('more than 8 locationIds is rejected with 400 (zod max(8))', async () => {
    const sid = freshSessionId();
    const locationIds = Array.from({ length: 9 }, (_, i) => `room-${i}`);
    const res = await fetch(`${server.baseUrl}/api/run-scene`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, locationIds }),
    });
    assert.equal(res.status, 400);
  });
});

// ── Run 13 — keyless deterministic simulation ───────────────────────────────
// Unit coverage for the rule-based composer/epistemics fallback themselves
// lives in tests/core/deterministic-sim.test.ts — this describe block is the
// HTTP-surface, end-to-end proof: a keyless /api/turn produces a real
// (non-frozen) ledger entry AND a StoryCommit with real ops, and a keyless
// /api/run-room actually moves a character's beliefs (checked via the
// existing /api/game/interview receipts, before vs after — the same
// "receipts are the front door" proof pattern Run 1 established).
describe('routes/game — Run 13 (keyless deterministic simulation)', async () => {
  let server: TestServer;
  before(async () => { resetLLMProvider(); server = await startTestServer(); });
  after(async () => { await server.close(); });

  async function initTwoAgents(sid: string, locationId = 'gallery') {
    return fetch(`${server.baseUrl}/api/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sid,
        nodes: [{ location_id: locationId, name: 'Gallery', description: 'A quiet gallery.', adjacent_locations: [] }],
        agents: [
          {
            char_id: 'nora', name: 'Nora Vance', public_mask: 'A composed art dealer.',
            hidden_motive: 'Protect the forged painting.', current_location_id: locationId,
            goalStack: {
              terminal: { id: 'g0', description: 'clear her name', value: 90, achieved: false },
              instrumental: [{ id: 'g1', description: 'find out who forged the painting', value: 70, achieved: false }],
              last_planned_at: 0,
            },
          },
          { char_id: 'milo', name: 'Milo Cross', public_mask: 'A nervous curator.', hidden_motive: 'Cover his tracks.', current_location_id: locationId },
        ],
      }),
    });
  }

  it('keyless POST /api/turn: the ledger entry is deterministic (not the old hollow "..."), and a StoryCommit with real ops lands in canon', async () => {
    const sid = freshSessionId();
    assert.equal((await initTwoAgents(sid)).status, 200);

    const turnRes = await fetch(`${server.baseUrl}/api/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, agentId: 'nora' }),
    });
    assert.equal(turnRes.status, 200);
    const turnBody = await turnRes.json();
    assert.equal(turnBody.action.deterministic, true, 'keyless action must carry the deterministic flag');
    assert.notEqual(turnBody.action.content, '...', 'must not be the pre-Run-13 hollow ellipsis');
    assert.ok(turnBody.action.content.length > 0);

    const commitsRes = await fetch(`${server.baseUrl}/api/nvm/commits?sessionId=${sid}`);
    assert.equal(commitsRes.status, 200);
    const commitsBody = await commitsRes.json();
    assert.ok(Array.isArray(commitsBody.commits) && commitsBody.commits.length > 0, 'the turn produced at least one StoryCommit');
    const lastCommit = commitsBody.commits[commitsBody.commits.length - 1];
    assert.ok(Array.isArray(lastCommit.ops) && lastCommit.ops.length > 0, 'the commit carries real ops, not an empty shell');
  });

  it('keyless POST /api/run-room: beliefs actually move — interview receipts differ before vs after', async () => {
    const sid = freshSessionId();
    assert.equal((await initTwoAgents(sid)).status, 200);

    const before = await fetch(`${server.baseUrl}/api/game/interview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, agentName: 'Nora Vance', question: 'What do you believe about Milo right now?' }),
    });
    assert.equal(before.status, 200);
    const beforeBody = await before.json();
    const beforeBeliefCount = beforeBody.receipts.beliefs.length;

    const roomRes = await fetch(`${server.baseUrl}/api/run-room`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, nodeId: 'gallery', maxTurns: 4 }),
    });
    assert.equal(roomRes.status, 200);

    const after = await fetch(`${server.baseUrl}/api/game/interview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, agentName: 'Nora Vance', question: 'What do you believe about Milo right now?' }),
    });
    assert.equal(after.status, 200);
    const afterBody = await after.json();

    assert.ok(
      afterBody.receipts.beliefs.length > beforeBeliefCount,
      `run-room must produce genuine belief movement keylessly (before=${beforeBeliefCount}, after=${afterBody.receipts.beliefs.length})`,
    );
  });
});
