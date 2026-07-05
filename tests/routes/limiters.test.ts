// Dedicated file for rate-limiter burst tests. express-rate-limit's default
// store is an in-memory Map scoped to the limiter instance, which is created
// once at module load in server/lib/session-store.ts and shared by every
// route that imports gameLimiter/aiLimiter — i.e. it's process-global state.
// Node's test runner isolates each *.test.ts file in its own process by
// default, so keeping the burst assertions here (rather than mixed into the
// other route test files) guarantees they see a clean limiter window and
// can't be thrown off by request counts consumed by unrelated tests.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, freshSessionId, type TestServer } from './helpers.ts';

describe('rate limiters — HTTP behavior', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  it('gameLimiter returns 429 after 120 requests/min to a gameLimiter-protected route', async () => {
    const sid = freshSessionId();
    const url = `${server.baseUrl}/api/nvm/commits?sessionId=${sid}`;
    const statuses: number[] = [];
    // Fire comfortably past the 120/min ceiling; sequential (not parallel) so
    // the count against the shared window is deterministic.
    for (let i = 0; i < 130; i++) {
      const res = await fetch(url);
      statuses.push(res.status);
      if (res.status === 429) break;
    }
    assert.ok(statuses.includes(429), `expected a 429 within 130 requests, got statuses: ${statuses.slice(-5).join(',')}`);
  });

  it('aiLimiter returns 429 after 20 requests/min to an aiLimiter-protected route', async () => {
    const url = `${server.baseUrl}/api/scriptide/clean-action`;
    const statuses: number[] = [];
    // Body intentionally omits 'text' so each request fails fast on the
    // in-handler guard rather than attempting a real Gemini call — the
    // rate-limiter middleware runs before the handler either way, so the
    // 429 still fires purely from request volume.
    for (let i = 0; i < 25; i++) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      statuses.push(res.status);
      if (res.status === 429) break;
    }
    assert.ok(statuses.includes(429), `expected a 429 within 25 requests, got statuses: ${statuses.join(',')}`);
  });
});
