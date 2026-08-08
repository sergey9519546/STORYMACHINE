// Real-HTTP regression for a client that abandons a coordinator-held room
// stream.  The wall deadline must stay well beyond this deliberately slow
// simulation: this test is about disconnect cancellation, not timeout wiring.
process.env.AI_BUDGET_RUN_ROOM_TIMEOUT_MS = '20_000';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { startTestServer, freshSessionId, type TestServer } from './helpers.ts';
import { setLLMProvider, resetLLMProvider } from '../../server/engine/ai.ts';

const SLOW_PROVIDER_DELAY_MS = 250;

function slowProvider() {
  return {
    generate: () => new Promise((resolve) => setTimeout(() => resolve({ text: 'stub reply' }), SLOW_PROVIDER_DELAY_MS)),
  };
}

async function seedTwoAgentSession(baseUrl: string, sid: string): Promise<void> {
  const res = await fetch(`${baseUrl}/api/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: sid,
      nodes: [{ location_id: 'gallery', name: 'Gallery', description: 'A quiet museum gallery.', adjacent_locations: [] }],
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
      ],
    }),
  });
  assert.equal(res.status, 200);
}

/** Open a real SSE stream and destroy its socket as soon as the first event arrives. */
async function destroyAfterInitialSseChunk(url: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    let disconnecting = false;
    let receivedChunk = false;
    const request = http.get(url, (response) => {
      response.once('data', (chunk: Buffer) => {
        try {
          assert.match(chunk.toString(), /^data: /, 'expected the stream to begin with an SSE data event');
          receivedChunk = true;
          disconnecting = true;
          request.destroy();
          resolve();
        } catch (error) {
          request.destroy();
          reject(error);
        }
      });
      response.once('error', (error) => {
        if (!disconnecting) reject(error);
      });
    });
    request.once('error', (error) => {
      if (!disconnecting) reject(error);
    });
    request.setTimeout(5_000, () => {
      request.destroy();
      if (!receivedChunk) reject(new Error('timed out before the room stream emitted its initial SSE chunk'));
    });
  });
}

describe('SSE client-disconnect cancellation', () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  it('cancels the abandoned room stream before admitting a same-session reset, without any post-reset ledger writes', async () => {
    const sid = freshSessionId();
    await seedTwoAgentSession(server.baseUrl, sid);
    setLLMProvider(slowProvider() as never);

    try {
      await destroyAfterInitialSseChunk(
        `${server.baseUrl}/api/run-room-stream?sessionId=${sid}&nodeId=gallery&maxTurns=12`,
      );

      // This reset queues behind the room command in the same session FIFO.
      // It must wait for the cooperative cancellation boundary, never for all
      // twelve deliberately slow turns, and it must not be admitted before the
      // abandoned operation has stopped writing to the Stage.
      const resetStartedAt = Date.now();
      const reset = await fetch(`${server.baseUrl}/api/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid }),
      });
      const resetElapsedMs = Date.now() - resetStartedAt;
      assert.equal(reset.status, 200, `expected queued reset to settle normally, got ${reset.status}: ${await reset.text()}`);
      assert.ok(
        resetElapsedMs < 1_800,
        `expected reset to settle at the disconnect cancellation boundary, not after the full slow run; took ${resetElapsedMs}ms`,
      );

      // Wait through several provider intervals.  If a disconnect listener
      // released the coordinator/room reservation early, the reset would race
      // the still-running simulation and its old orchestrator would append
      // fresh actions after this reset completed.
      await new Promise((resolve) => setTimeout(resolve, SLOW_PROVIDER_DELAY_MS * 4));
      const ledger = await (await fetch(`${server.baseUrl}/api/ledger?sessionId=${sid}`)).json();
      assert.deepEqual(ledger, [], 'the abandoned stream must append no work after the reset boundary');
    } finally {
      resetLLMProvider();
    }
  });
});
