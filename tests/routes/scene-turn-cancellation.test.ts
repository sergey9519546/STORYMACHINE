// HTTP + unit-level proof that POST /api/turn and POST /api/run-scene now get
// the SAME between-turn cancellation story commit 7f57119 already gave
// run-room-stream/run-room/simulate-to-fountain: a hung/slow provider call
// can no longer strand a session's SessionCommandCoordinator FIFO (/api/turn)
// or a scene's room reservations (/api/run-scene) for the full natural
// duration of an abandoned background operation — see game.ts's updated
// "CORRECTION (2026-08-04, Lane D...)" comments on both routes for the full
// design writeup.
//
// /api/turn's fix is narrower than run-room's, by design: a single turn has
// no per-agent loop to check a signal "between turns" the way
// runRoomSimulation does — Orchestrator.runTurn's one in-flight call
// (agent.takeTurn()) is always allowed to finish. What IS skippable are its
// two NOT-YET-STARTED phases after that (the epistemic update, the Director
// pass) — see Orchestrator.ts's runTurn doc for the two checkpoints.
//
// /api/run-scene's fix mirrors run-room's exactly, one level up:
// Orchestrator.runFullScene now checks `signal` between ROUNDS and between
// ROOMS, and threads it into every nested runRoomSimulation call so a
// deadline firing mid-room is bounded by that room's OWN between-turn check,
// not the room's full natural duration.
//
// Env overrides land before server/routes/game.ts is ever imported (its
// budget constants are computed once at module load) — mirrors
// tests/routes/ai-budget-wiring.test.ts's and
// tests/routes/sse-wall-timer-cancellation.test.ts's own precedent for this
// exact env var. Node's test runner isolates each *.test.ts file into its own
// process, so this does not affect any other test file's env.
process.env.AI_BUDGET_TURN_TIMEOUT_MS = '60';
process.env.AI_BUDGET_RUN_SCENE_TIMEOUT_MS = '60';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, freshSessionId, type TestServer } from './helpers.ts';
import { setLLMProvider, resetLLMProvider } from '../../server/engine/ai.ts';
import { Stage } from '../../server/engine/Stage.ts';
import { Orchestrator } from '../../server/engine/Orchestrator.ts';

// Resolves successfully, but slower than the short wall-timers these tests
// set — enough to prove the between-call skip/abort (not the provider's own
// success/failure path) is what ends the operation promptly. Deliberately
// bounded (not a never-resolving promise) for the same reason
// sse-wall-timer-cancellation.test.ts's identical slowProvider() documents:
// generateContent() itself retries transient failures with its own ~30s-per-
// attempt timeout, so a truly-hung provider would drag an abandoned in-flight
// call out to tens of seconds regardless of any between-call hook (which can
// only stop the NEXT call from starting, not reach into an already-issued
// fetch). Resolving after a short, bounded delay keeps this file's
// assertions fast and deterministic.
function slowProvider(delayMs: number) {
  return { generate: () => new Promise((resolve) => setTimeout(() => resolve({ text: 'stub reply' }), delayMs)) };
}

async function seedOneAgentSession(baseUrl: string, sid: string, locationId = 'gallery'): Promise<void> {
  const res = await fetch(`${baseUrl}/api/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: sid,
      nodes: [{ location_id: locationId, name: 'Gallery', description: 'A quiet museum gallery.', adjacent_locations: [] }],
      agents: [{
        char_id: 'agent-eve', name: 'Eve Marlowe', public_mask: 'A composed museum curator.',
        hidden_motive: 'Recover the stolen ledger before the board finds out.',
        knowledge_vector: ['The vault code was changed the night of the gala.'],
        suspicion_score: 10, current_location_id: locationId,
      }],
    }),
  });
  assert.equal(res.status, 200);
}

async function seedTwoRoomScene(baseUrl: string, sid: string): Promise<{ locationIds: string[] }> {
  const locationIds = ['gallery', 'vault'];
  const res = await fetch(`${baseUrl}/api/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: sid,
      nodes: [
        { location_id: 'gallery', name: 'Gallery', description: 'A quiet museum gallery.', adjacent_locations: ['vault'] },
        { location_id: 'vault', name: 'Vault', description: 'A locked vault.', adjacent_locations: ['gallery'] },
      ],
      agents: [
        {
          char_id: 'agent-eve', name: 'Eve Marlowe', public_mask: 'A composed museum curator.',
          hidden_motive: 'Recover the stolen ledger before the board finds out.',
          knowledge_vector: ['The vault code was changed the night of the gala.'],
          suspicion_score: 10, current_location_id: 'gallery',
        },
        {
          char_id: 'agent-tom', name: 'Tom Reyes', public_mask: 'A nervous night guard.',
          hidden_motive: 'Cover up that he fell asleep on shift.',
          knowledge_vector: ['He was not at his post at midnight.'],
          suspicion_score: 40, current_location_id: 'gallery',
        },
        {
          char_id: 'agent-ana', name: 'Ana Kade', public_mask: 'A meticulous board auditor.',
          hidden_motive: 'Expose the curator before the gala ends.',
          knowledge_vector: [], suspicion_score: 15, current_location_id: 'vault',
        },
        {
          char_id: 'agent-leo', name: 'Leo Furst', public_mask: 'A charming donor.',
          hidden_motive: 'Steal the ledger himself.',
          knowledge_vector: [], suspicion_score: 5, current_location_id: 'vault',
        },
      ],
    }),
  });
  assert.equal(res.status, 200);
  return { locationIds };
}

describe('POST /api/turn — between-call cancellation (2026-08-04, Lane D)', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  it('a slow provider is cut off by the budget deadline promptly, and the session is usable again without a long stall', async () => {
    const sid = freshSessionId();
    await seedOneAgentSession(server.baseUrl, sid);

    setLLMProvider(slowProvider(300) as never);
    let firstElapsedMs: number;
    try {
      const start = Date.now();
      const res = await fetch(`${server.baseUrl}/api/turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid, agentId: 'agent-eve' }),
      });
      firstElapsedMs = Date.now() - start;
      assert.equal(res.status, 503);
      const body = await res.json();
      assert.equal(body.code, 'AI_BUDGET_DEADLINE_EXCEEDED');
    } finally {
      resetLLMProvider();
    }
    // Bounded by the ~60ms wall-timer plus the one in-flight takeTurn() call
    // (300ms) — never anywhere near the ~900ms three sequential 300ms calls
    // (takeTurn + updateEpistemics + director eval) would cost if the
    // abandoned background operation ran to its full natural completion.
    assert.ok(firstElapsedMs < 900, `expected the 503 itself to return promptly, took ${firstElapsedMs}ms`);

    // The session's SessionCommandCoordinator FIFO must not still be waiting
    // on the abandoned turn (bounded by ~300ms — one in-flight call — not the
    // ~900ms full chain) — a follow-up command for the SAME session, on the
    // default (keyless, fast) provider, must complete quickly.
    const followUpStart = Date.now();
    const followUp = await fetch(`${server.baseUrl}/api/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, agentId: 'agent-eve' }),
    });
    const followUpElapsedMs = Date.now() - followUpStart;
    assert.notEqual(followUp.status, 409, 'a turn is never lock-protected by a 409, but must not hang either');
    assert.equal(followUp.status, 200, `expected the follow-up turn to complete normally, got ${followUp.status}`);
    const followUpBody = await followUp.json();
    assert.ok(followUpBody.action && typeof followUpBody.action.action_type === 'string');
    assert.ok(followUpElapsedMs < 2000, `expected the follow-up turn to complete promptly, took ${followUpElapsedMs}ms`);

    // No duplicate side effects: the truncated turn's own action (if any got
    // far enough to record one before the deadline hit) and the follow-up's
    // action must both be present, distinct, and in order — never duplicated
    // or overwritten by the two overlapping requests.
    const ledger = await (await fetch(`${server.baseUrl}/api/ledger?sessionId=${sid}`)).json();
    const actionIds = (ledger as Array<{ action_id: string }>).map(a => a.action_id);
    assert.equal(new Set(actionIds).size, actionIds.length, 'no duplicate action ids in the ledger');
  });

  it('a fast run is completely unaffected — no truncated marker, normal action shape', async () => {
    const sid = freshSessionId();
    await seedOneAgentSession(server.baseUrl, sid, 'hall');
    // Deliberately no setLLMProvider() override — runs on the default
    // keyless-fallback path (no GEMINI_API_KEY in this test environment),
    // which resolves near-instantly, comfortably inside the 60ms wall-timer.
    const res = await fetch(`${server.baseUrl}/api/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, agentId: 'agent-eve' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.truncated, undefined, 'a normally-completed turn must not carry a truncated marker');
    assert.ok(body.action && typeof body.action.action_type === 'string');
  });

  // FALSIFIABILITY: proves the two between-call checkpoints in
  // Orchestrator.runTurn (not test scheduling luck) are what bound a slow
  // turn's duration. Exercises Orchestrator.runTurn directly (bypassing
  // HTTP/game.ts entirely) so "the checkpoints are disabled" can be
  // represented exactly as it was before this change existed: simply never
  // passing a `signal`. A short, deterministic test-level race stands in for
  // the real wall-clock wait this proof would otherwise require.
  it('FALSIFIABILITY: without the signal wired (the pre-fix shape), the identical slow provider blows past the same deadline the signal-driven call comfortably beats', async () => {
    setLLMProvider(slowProvider(150) as never);
    try {
      const TEST_DEADLINE_MS = 300;
      const marker = Symbol('deadline');
      const deadline = () => new Promise(resolve => setTimeout(() => resolve(marker), TEST_DEADLINE_MS));

      // Scenario A — signal PRE-ABORTED (standing in for the wall-timer
      // having already fired by the time takeTurn() resolves): the in-flight
      // takeTurn() call is allowed to finish (bounded by its own 150ms
      // call), then BOTH checkpoints (updateEpistemics, Director eval) are
      // skipped rather than starting two more 150ms calls sequentially.
      // Must comfortably beat the deadline.
      const stageA = new Stage(':memory:');
      const orchA = new Orchestrator(stageA);
      orchA.registerNode({ location_id: 'attic', name: 'Attic', description: 'Dust and old furniture.', adjacent_locations: [] });
      orchA.registerAgent({
        char_id: 'a1', name: 'Ann', public_mask: 'calm', hidden_motive: 'find the letter',
        knowledge_vector: [], suspicion_score: 0, current_location_id: 'attic', is_alive: true,
      } as never);
      const controllerA = new AbortController();
      controllerA.abort(); // already tripped before runTurn is even called
      const resultA = await Promise.race([
        orchA.runTurn('a1', controllerA.signal),
        deadline(),
      ]);
      stageA.close();
      assert.notEqual(resultA, marker, 'expected the signal-driven call to settle before the test deadline');

      // Scenario B — the SAME slow provider, the SAME shape of call, but
      // with NO signal at all: this is exactly what /api/turn looked like
      // before this change, and exactly what a regression that silently
      // stopped checking `signal` would reintroduce. It must NOT settle
      // within the identical deadline Scenario A just beat — proving the
      // two checkpoints (not luck, not the provider, not the deadline
      // itself) are the load-bearing mechanism.
      const stageB = new Stage(':memory:');
      const orchB = new Orchestrator(stageB);
      orchB.registerNode({ location_id: 'attic', name: 'Attic', description: 'Dust and old furniture.', adjacent_locations: [] });
      orchB.registerAgent({
        char_id: 'a1', name: 'Ann', public_mask: 'calm', hidden_motive: 'find the letter',
        knowledge_vector: [], suspicion_score: 0, current_location_id: 'attic', is_alive: true,
      } as never);
      const pendingB = orchB.runTurn('a1'); // no signal — the disabled/pre-fix shape
      const resultB = await Promise.race([pendingB, deadline()]);
      assert.equal(resultB, marker, 'expected the no-signal call to STILL be pending at the deadline the signal-driven call already beat — if this fails, the between-call checkpoints have stopped being what bounds the operation');

      // Drain it fully so no dangling timers/promises leak past this test.
      await pendingB;
      stageB.close();
    } finally {
      resetLLMProvider();
    }
  });
});

describe('POST /api/run-scene — between-round/between-room cancellation (2026-08-04, Lane D)', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  it('a slow provider is cut off by the budget deadline promptly, room reservations are released, and a follow-up is admitted without duplicating actions', async () => {
    const sid = freshSessionId();
    const { locationIds } = await seedTwoRoomScene(server.baseUrl, sid);

    setLLMProvider(slowProvider(300) as never);
    let firstElapsedMs: number;
    try {
      const start = Date.now();
      const res = await fetch(`${server.baseUrl}/api/run-scene`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid, locationIds, roundsPerRoom: 3 }),
      });
      firstElapsedMs = Date.now() - start;
      assert.equal(res.status, 503);
      const body = await res.json();
      assert.equal(body.code, 'AI_BUDGET_DEADLINE_EXCEEDED');
    } finally {
      resetLLMProvider();
    }
    // Bounded by the ~60ms wall-timer plus one in-flight 300ms turn, never
    // anywhere near what 2 rooms x 3 rounds of turns + epistemics + director
    // eval at 300ms/call would actually take if left to run to natural
    // completion (multiple seconds).
    assert.ok(firstElapsedMs < 2000, `expected the 503 itself to return promptly, took ${firstElapsedMs}ms`);

    const ledgerBeforeFollowUp = await (await fetch(`${server.baseUrl}/api/ledger?sessionId=${sid}`)).json();

    // Room reservations for BOTH locations must be released — a follow-up
    // /api/run-scene for the SAME locations, same session, is admitted
    // immediately, not 409'd. Uses the default (keyless, fast) provider
    // restored by resetLLMProvider() above.
    const followUp = await fetch(`${server.baseUrl}/api/run-scene`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, locationIds, roundsPerRoom: 1 }),
    });
    assert.notEqual(followUp.status, 409, 'the room reservations must be released after the truncated run ended, not stranded');
    assert.equal(followUp.status, 200, `expected the follow-up run-scene to complete normally, got ${followUp.status}: ${JSON.stringify(await followUp.json().catch(() => null))}`);

    // No Stage-write interleaving: the orchestrator promise behind the
    // truncated request was FULLY awaited (never abandoned) before the room
    // reservations released — exactly as before this change — so the
    // follow-up's own actions must land strictly AFTER every action the
    // truncated run already recorded, with no duplicate action ids.
    const ledgerAfterFollowUp = await (await fetch(`${server.baseUrl}/api/ledger?sessionId=${sid}`)).json();
    const beforeIds = new Set((ledgerBeforeFollowUp as Array<{ action_id: string }>).map(a => a.action_id));
    const afterIds = (ledgerAfterFollowUp as Array<{ action_id: string }>).map(a => a.action_id);
    assert.equal(new Set(afterIds).size, afterIds.length, 'no duplicate action ids across the full session ledger');
    assert.deepEqual(afterIds.slice(0, beforeIds.size), [...beforeIds], 'follow-up writes must be strictly appended, never spliced into the truncated run\'s own writes');
  });

  it('a fast run is NOT truncated and completes normally', async () => {
    const sid = freshSessionId();
    const { locationIds } = await seedTwoRoomScene(server.baseUrl, sid);
    // Deliberately no setLLMProvider() override — default keyless-fallback
    // path, resolves near-instantly, comfortably inside the 60ms wall-timer.
    const res = await fetch(`${server.baseUrl}/api/run-scene`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, locationIds, roundsPerRoom: 1 }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'completed');
    assert.equal(body.truncated, undefined, 'a normally-completed scene must not carry a truncated marker');
  });

  // FALSIFIABILITY: proves the between-round/between-room AbortSignal hook in
  // Orchestrator.runFullScene (threaded through into each nested
  // runRoomSimulation call) — not test scheduling luck — is what bounds the
  // operation. Exercises Orchestrator.runFullScene directly (bypassing
  // HTTP/game.ts entirely) so "the hook is disabled" can be represented
  // exactly as it was before this change existed: simply never passing a
  // `signal`. A short, deterministic test-level race stands in for the real
  // wall-clock wait this proof would otherwise require.
  it('FALSIFIABILITY: without the signal wired (the pre-fix shape), the identical slow provider blows past the same deadline the hang-scenario test above relies on', async () => {
    setLLMProvider(slowProvider(100) as never);
    try {
      const TEST_DEADLINE_MS = 300;
      const marker = Symbol('deadline');
      const deadline = () => new Promise(resolve => setTimeout(() => resolve(marker), TEST_DEADLINE_MS));

      function seedTwoRoomStage(): { stage: Stage; orch: Orchestrator; locationIds: string[] } {
        const stage = new Stage(':memory:');
        const orch = new Orchestrator(stage);
        orch.registerNode({ location_id: 'gallery', name: 'Gallery', description: 'A quiet museum gallery.', adjacent_locations: ['vault'] });
        orch.registerNode({ location_id: 'vault', name: 'Vault', description: 'A locked vault.', adjacent_locations: ['gallery'] });
        orch.registerAgent({
          char_id: 'a1', name: 'Ann', public_mask: 'calm', hidden_motive: 'find the letter',
          knowledge_vector: [], suspicion_score: 0, current_location_id: 'gallery', is_alive: true,
        } as never);
        orch.registerAgent({
          char_id: 'a2', name: 'Bea', public_mask: 'nervous', hidden_motive: 'hide the letter',
          knowledge_vector: [], suspicion_score: 0, current_location_id: 'gallery', is_alive: true,
        } as never);
        orch.registerAgent({
          char_id: 'a3', name: 'Cid', public_mask: 'watchful', hidden_motive: 'guard the vault',
          knowledge_vector: [], suspicion_score: 0, current_location_id: 'vault', is_alive: true,
        } as never);
        orch.registerAgent({
          char_id: 'a4', name: 'Dee', public_mask: 'charming', hidden_motive: 'steal the letter',
          knowledge_vector: [], suspicion_score: 0, current_location_id: 'vault', is_alive: true,
        } as never);
        return { stage, orch, locationIds: ['gallery', 'vault'] };
      }

      // Scenario A — signal wired and tripped shortly after the call starts
      // (standing in for the wall-timer firing mid-scene): the one in-flight
      // turn is allowed to finish (bounded by its own ~100ms call), then the
      // between-turn check inside the in-flight room trips truncation, which
      // propagates up through the between-room and between-round checks so
      // neither the second room nor a second round ever starts. Must
      // comfortably beat the deadline even though 2 rooms x 2 turns/room x
      // (turn + batch epistemics + director eval) would otherwise take
      // several times as long.
      const { stage: stageA, orch: orchA, locationIds } = seedTwoRoomStage();
      const controllerA = new AbortController();
      setTimeout(() => controllerA.abort(), 30);
      const resultA = await Promise.race([
        orchA.runFullScene(locationIds, 2, 1, undefined, controllerA.signal),
        deadline(),
      ]);
      stageA.close();
      assert.notEqual(resultA, marker, 'expected the signal-driven call to settle before the test deadline');
      assert.equal((resultA as { truncated: boolean }).truncated, true);

      // Scenario B — the SAME slow provider, the SAME shape of call, but
      // with NO signal at all: this is exactly what every runFullScene call
      // looked like before this change, and exactly what a regression that
      // silently stopped checking `signal` would reintroduce. It must NOT
      // settle within the identical deadline Scenario A just beat — proving
      // the signal (not luck, not the provider, not the deadline itself) is
      // the load-bearing mechanism.
      const { stage: stageB, orch: orchB, locationIds: locationIdsB } = seedTwoRoomStage();
      const pendingB = orchB.runFullScene(locationIdsB, 2, 1); // no signal — the disabled/pre-fix shape
      const resultB = await Promise.race([pendingB, deadline()]);
      assert.equal(resultB, marker, 'expected the no-signal call to STILL be pending at the deadline the signal-driven call already beat — if this fails, the between-round/between-room check has stopped being what bounds the operation');

      // Drain it fully (it does complete on its own, just past the short
      // deadline above) so no dangling timers/promises leak past this test.
      const finalB = await pendingB;
      assert.equal(finalB.truncated, false);
      stageB.close();
    } finally {
      resetLLMProvider();
    }
  });
});
