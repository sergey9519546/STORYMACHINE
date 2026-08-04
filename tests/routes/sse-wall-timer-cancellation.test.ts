// HTTP + unit-level proof that the SSE wall-timer's stranded-lock tradeoff
// (ULTRAREVIEW_FINDINGS.md's integrity note; CLAUDE.md's "DECISION MADE",
// 2026-08-04) is actually resolved: GET /api/run-room-stream's wall timer now
// trips Orchestrator.runRoomSimulation's between-turn AbortSignal instead of
// merely suppressing further SSE writes while silently continuing to await an
// unbounded background operation. This file proves, over real HTTP:
//   1. a genuinely stalled provider gets the stream ENDED (not hung) —
//      bounded by the wall-clock deadline plus at most one in-flight turn's
//      own per-call timeout, never the simulation's full natural duration;
//   2. the room lock RELEASES — a follow-up mutating command for the SAME
//      session is admitted, not 409'd, immediately after the stream ends;
//   3. the final SSE event is labeled `truncated: true` /
//      `stoppedBy: 'AI_BUDGET_DEADLINE_EXCEEDED'` — never presented as a
//      normal completion;
//   4. no Stage-write interleaving: the follow-up command's own actions land
//      strictly after the truncated run's, with no duplicate action ids —
//      only possible because the orchestrator promise is FULLY awaited
//      (never abandoned) before the lock/stream release, exactly as before
//      this change;
//   5. a fast run is NOT truncated and completes normally;
//   6. FALSIFIABILITY: a direct Orchestrator-level test proves the hook
//      itself is what bounds the operation — the identical slow provider,
//      called WITHOUT a signal (i.e. the pre-fix / hook-disabled shape),
//      does NOT settle within the same short test-level deadline that the
//      signal-driven call comfortably beats. If the between-turn check were
//      ever removed, this is the exact failure the hang-scenario test above
//      would start exhibiting.
//
// Env override lands before server/routes/game.ts is ever imported (its
// budget constants are computed once at module load) — mirrors
// tests/routes/ai-budget-wiring.test.ts's own precedent for this exact
// env var. Node's test runner isolates each *.test.ts file into its own
// process, so this does not affect any other test file's env.
process.env.AI_BUDGET_RUN_ROOM_TIMEOUT_MS = '60';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, freshSessionId, type TestServer } from './helpers.ts';
import { setLLMProvider, resetLLMProvider } from '../../server/engine/ai.ts';
import { Stage } from '../../server/engine/Stage.ts';
import { Orchestrator } from '../../server/engine/Orchestrator.ts';

// Resolves successfully, but slower than the ~60ms wall-timer these tests
// set — enough to prove the between-turn abort (not the provider's own
// success/failure path) is what ends the operation. Deliberately bounded
// (not a never-resolving promise): generateContent() itself retries
// transient failures with its own ~30s-per-attempt timeout, so a truly-hung
// provider would drag every abandoned in-flight call out to tens of seconds
// even with the abort hook wired (the hook only stops the NEXT turn from
// starting — it can't reach into an already-issued fetch). Resolving after a
// short, bounded delay keeps this file's assertions fast and deterministic.
// Mirrors tests/routes/ai-budget-wiring.test.ts's identical slowProvider().
function slowProvider(delayMs: number) {
  return { generate: () => new Promise((resolve) => setTimeout(() => resolve({ text: 'stub reply' }), delayMs)) };
}

async function seedTwoAgentSession(baseUrl: string, sid: string, locationId = 'gallery'): Promise<void> {
  const res = await fetch(`${baseUrl}/api/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: sid,
      nodes: [{ location_id: locationId, name: 'Gallery', description: 'A quiet museum gallery.', adjacent_locations: [] }],
      agents: [
        {
          char_id: 'agent-eve', name: 'Eve Marlowe', public_mask: 'A composed museum curator.',
          hidden_motive: 'Recover the stolen ledger before the board finds out.',
          knowledge_vector: ['The vault code was changed the night of the gala.'],
          suspicion_score: 10, current_location_id: locationId,
        },
        {
          char_id: 'agent-tom', name: 'Tom Reyes', public_mask: 'A nervous night guard.',
          hidden_motive: 'Cover up that he fell asleep on shift.',
          knowledge_vector: ['He was not at his post at midnight.'],
          suspicion_score: 40, current_location_id: locationId,
        },
      ],
    }),
  });
  assert.equal(res.status, 200);
}

/** Splits a raw SSE response body into its parsed `data: ` JSON events, in order. */
function parseSseEvents(body: string): Array<Record<string, unknown>> {
  return body
    .split('\n\n')
    .map(chunk => chunk.trim())
    .filter(chunk => chunk.startsWith('data: '))
    .map(chunk => JSON.parse(chunk.slice('data: '.length)));
}

describe('SSE wall-timer cancellation — between-turn AbortSignal hook (2026-08-04 resolution)', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  it('GET /api/run-room-stream: a stalled provider gets the stream ENDED, the lock RELEASED, and the final event honestly labeled truncated — with no Stage-write interleaving on the follow-up command', async () => {
    const sid = freshSessionId();
    await seedTwoAgentSession(server.baseUrl, sid);

    setLLMProvider(slowProvider(300) as never);
    let streamElapsedMs: number;
    let events: Array<Record<string, unknown>>;
    try {
      const start = Date.now();
      // maxTurns high enough to require multiple rounds if never truncated
      // (2 agents/round → this needs 3+ rounds to reach maxTurns on its own),
      // so a passing test genuinely exercises the between-turn check more
      // than once, not just a single-round coincidence.
      const res = await fetch(
        `${server.baseUrl}/api/run-room-stream?sessionId=${sid}&nodeId=gallery&maxTurns=8`,
      );
      const body = await res.text();
      streamElapsedMs = Date.now() - start;
      assert.equal(res.status, 200);
      events = parseSseEvents(body);
    } finally {
      resetLLMProvider();
    }

    // (1) The stream ENDED promptly — bounded by the ~60ms wall-timer plus at
    // most one in-flight 300ms turn, never anywhere near what 8 full turns +
    // director eval at 300ms/call would actually take (>2400ms) if the
    // simulation had been left to run to natural completion.
    assert.ok(
      streamElapsedMs < 2000,
      `expected the stream to end promptly (bounded by wall-timer + one in-flight turn), took ${streamElapsedMs}ms`,
    );

    // (3) The final event is labeled honestly — never presented as a normal
    // completion.
    const finalEvent = events[events.length - 1];
    assert.equal(finalEvent?.type, 'simulation_complete');
    assert.equal(finalEvent?.truncated, true, `expected the final event to carry truncated:true, got ${JSON.stringify(finalEvent)}`);
    assert.equal(finalEvent?.stoppedBy, 'AI_BUDGET_DEADLINE_EXCEEDED');
    // Sanity: the truncated run made SOME progress (at least the one in-flight
    // turn it was allowed to finish) rather than aborting before anything ran.
    assert.ok(typeof finalEvent?.totalTurns === 'number' && (finalEvent.totalTurns as number) >= 1);
    // And genuinely truncated — nowhere near the requested maxTurns=8.
    assert.ok((finalEvent!.totalTurns as number) < 8);

    const ledgerBeforeFollowUp = await (await fetch(`${server.baseUrl}/api/ledger?sessionId=${sid}`)).json();

    // (2) The room lock is released — a follow-up mutating command for the
    // SAME session (through the SAME SessionCommandCoordinator FIFO
    // withSessionCommand routes share) is admitted immediately, not 409'd.
    // Uses the default (keyless, since no GEMINI_API_KEY is set in this test
    // environment) provider restored by resetLLMProvider() above — fast and
    // deterministic, so this follow-up itself completes quickly.
    const followUp = await fetch(`${server.baseUrl}/api/run-room`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, nodeId: 'gallery', maxTurns: 2 }),
    });
    assert.notEqual(followUp.status, 409, 'the room lock must be released after the truncated stream ended, not stranded');
    assert.equal(followUp.status, 200, `expected the follow-up run-room command to complete normally, got ${followUp.status}: ${JSON.stringify(await followUp.json().catch(() => null))}`);

    // (4) No Stage-write interleaving: the orchestrator promise behind the
    // truncated stream was FULLY awaited (never abandoned) before the lock
    // released and the stream ended — exactly as before this change, per
    // CLAUDE.md's coordinator-safety constraint — so the follow-up command's
    // own actions must land strictly AFTER every action the truncated run
    // already recorded, with no duplicate action ids and no gap/overlap that
    // would indicate the two operations' Stage writes raced each other.
    const ledgerAfterFollowUp = await (await fetch(`${server.baseUrl}/api/ledger?sessionId=${sid}`)).json();
    const beforeIds = new Set((ledgerBeforeFollowUp as Array<{ action_id: string }>).map(a => a.action_id));
    const afterIds = (ledgerAfterFollowUp as Array<{ action_id: string }>).map(a => a.action_id);
    assert.equal(new Set(afterIds).size, afterIds.length, 'no duplicate action ids across the full session ledger');
    assert.ok(afterIds.length > beforeIds.size, 'the follow-up command must have recorded at least one new action');
    const newIds = afterIds.filter(id => !beforeIds.has(id));
    // Every id present before the follow-up must still be present, in the
    // same relative order, as a prefix of the post-follow-up ledger — i.e.
    // the follow-up's writes were strictly APPENDED, never spliced into or
    // racing the truncated run's own writes.
    assert.deepEqual(afterIds.slice(0, beforeIds.size), [...beforeIds]);
    assert.ok(newIds.length >= 1);
  });

  it('GET /api/run-room-stream: a fast run is NOT truncated and completes normally', async () => {
    const sid = freshSessionId();
    await seedTwoAgentSession(server.baseUrl, sid, 'hall');
    // Deliberately no setLLMProvider() override here — this runs on the
    // default keyless-fallback path (no GEMINI_API_KEY in this test
    // environment), which resolves near-instantly, comfortably inside the
    // 60ms wall-timer these tests configure.
    const res = await fetch(`${server.baseUrl}/api/run-room-stream?sessionId=${sid}&nodeId=hall&maxTurns=3`);
    assert.equal(res.status, 200);
    const events = parseSseEvents(await res.text());
    const finalEvent = events[events.length - 1];
    assert.equal(finalEvent?.type, 'simulation_complete');
    assert.equal(finalEvent?.truncated, undefined, `a normally-completed run must not carry truncated:true, got ${JSON.stringify(finalEvent)}`);
    assert.notEqual(finalEvent?.stoppedBy, 'AI_BUDGET_DEADLINE_EXCEEDED');
  });

  // FALSIFIABILITY (item 4 of the assigned task): proves the between-turn
  // AbortSignal hook itself — not test scheduling luck — is what bounds the
  // operation. Exercises Orchestrator.runRoomSimulation directly (bypassing
  // HTTP/game.ts entirely) so "the check is disabled" can be represented
  // exactly as it was before this change existed: simply never passing a
  // `signal`. A short, deterministic test-level race stands in for the real
  // 5-minute wall-clock wait this proof would otherwise require.
  it('FALSIFIABILITY: without the signal wired (the pre-fix shape), the identical slow provider blows past the same deadline the hang-scenario test above relies on', async () => {
    setLLMProvider(slowProvider(150) as never);
    try {
      const TEST_DEADLINE_MS = 300;
      const marker = Symbol('deadline');
      const deadline = () => new Promise(resolve => setTimeout(() => resolve(marker), TEST_DEADLINE_MS));

      // Scenario A — signal wired and tripped shortly after the call starts
      // (standing in for the wall-timer firing mid-simulation): the in-flight
      // turn is allowed to finish (bounded by its own ~150ms call), then the
      // between-turn check trips truncation. Must comfortably beat the
      // deadline even though maxTurns=2 would otherwise require a second
      // agent's turn plus a full epistemic batch plus a final director pass.
      const stageA = new Stage(':memory:');
      const orchA = new Orchestrator(stageA);
      orchA.registerNode({ location_id: 'attic', name: 'Attic', description: 'Dust and old furniture.', adjacent_locations: [] });
      orchA.registerAgent({
        char_id: 'a1', name: 'Ann', public_mask: 'calm', hidden_motive: 'find the letter',
        knowledge_vector: [], suspicion_score: 0, current_location_id: 'attic', is_alive: true,
      } as never);
      orchA.registerAgent({
        char_id: 'a2', name: 'Bea', public_mask: 'nervous', hidden_motive: 'hide the letter',
        knowledge_vector: [], suspicion_score: 0, current_location_id: 'attic', is_alive: true,
      } as never);
      const controllerA = new AbortController();
      setTimeout(() => controllerA.abort(), 40);
      const resultA = await Promise.race([
        orchA.runRoomSimulation('attic', 2, undefined, controllerA.signal),
        deadline(),
      ]);
      stageA.close();
      assert.notEqual(resultA, marker, 'expected the signal-driven call to settle before the test deadline');
      assert.equal((resultA as { truncated: boolean }).truncated, true);

      // Scenario B — the SAME slow provider, the SAME shape of call, but with
      // NO signal at all: this is exactly what every call site looked like
      // before this change, and exactly what a regression that silently
      // stopped checking `signal` would reintroduce. It must NOT settle
      // within the identical deadline scenario A just beat — proving the
      // signal (not luck, not the provider, not the deadline itself) is the
      // load-bearing mechanism.
      const stageB = new Stage(':memory:');
      const orchB = new Orchestrator(stageB);
      orchB.registerNode({ location_id: 'attic', name: 'Attic', description: 'Dust and old furniture.', adjacent_locations: [] });
      orchB.registerAgent({
        char_id: 'a1', name: 'Ann', public_mask: 'calm', hidden_motive: 'find the letter',
        knowledge_vector: [], suspicion_score: 0, current_location_id: 'attic', is_alive: true,
      } as never);
      orchB.registerAgent({
        char_id: 'a2', name: 'Bea', public_mask: 'nervous', hidden_motive: 'hide the letter',
        knowledge_vector: [], suspicion_score: 0, current_location_id: 'attic', is_alive: true,
      } as never);
      const pendingB = orchB.runRoomSimulation('attic', 2); // no signal — the disabled/pre-fix shape
      const resultB = await Promise.race([pendingB, deadline()]);
      assert.equal(resultB, marker, 'expected the no-signal call to STILL be pending at the deadline the signal-driven call already beat — if this fails, the between-turn check has stopped being what bounds the operation');

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
