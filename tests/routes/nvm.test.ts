import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, freshSessionId, type TestServer } from './helpers.ts';

describe('routes/nvm — HTTP behavior', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  it('GET /api/nvm/commits returns 200 with an empty commit list for a fresh session', async () => {
    const sid = freshSessionId();
    const res = await fetch(`${server.baseUrl}/api/nvm/commits?sessionId=${sid}`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body.commits, []);
  });

  it('GET /api/nvm/ghost-commits returns 200 for a fresh session', async () => {
    const sid = freshSessionId();
    const res = await fetch(`${server.baseUrl}/api/nvm/ghost-commits?sessionId=${sid}`);
    assert.equal(res.status, 200);
  });

  it('GET /api/nvm/commits/:commitId returns 404 for a nonexistent commit', async () => {
    const sid = freshSessionId();
    const res = await fetch(`${server.baseUrl}/api/nvm/commits/does-not-exist?sessionId=${sid}`);
    assert.equal(res.status, 404);
  });

  it('POST /api/nvm/converge-arc requires a non-empty scenes array — rejects with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/converge-arc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: freshSessionId(), scenes: [] }),
    });
    assert.equal(res.status, 400);
  });

  it('POST /api/nvm/selfplay requires a non-empty scenarios array — rejects with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/selfplay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: freshSessionId(), scenarios: [] }),
    });
    assert.equal(res.status, 400);
  });

  // The routes below previously relied on ad-hoc inline checks with no shared
  // schema (audit M2.3); each now runs through zod validate(). These assert
  // the 400 path for a representative malformed body per route.

  it('POST /api/nvm/ghost-commits/branch rejects a missing ghostId with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/ghost-commits/branch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: freshSessionId() }),
    });
    assert.equal(res.status, 400);
  });

  it('POST /api/nvm/redteam rejects a plan without revealId with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/redteam`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: freshSessionId(), plan: { notRevealId: true } }),
    });
    assert.equal(res.status, 400);
  });

  it('POST /api/nvm/quality rejects an ir without an ops array with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/quality`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: freshSessionId(), ir: { notOps: true } }),
    });
    assert.equal(res.status, 400);
  });

  it('POST /api/nvm/twin/do rejects a missing opId with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/twin/do`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: freshSessionId() }),
    });
    assert.equal(res.status, 400);
  });

  it('POST /api/nvm/author/fixed-points rejects an empty fixedPoints array with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/author/fixed-points`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: freshSessionId(), fixedPoints: [] }),
    });
    assert.equal(res.status, 400);
  });

  it('POST /api/nvm/author/backchain rejects a fixedPoint without atScene with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/author/backchain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: freshSessionId(), fixedPoint: { description: 'x' } }),
    });
    assert.equal(res.status, 400);
  });

  it('POST /api/nvm/inject-ops rejects an op with an unknown op kind with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/inject-ops`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: freshSessionId(), ops: [{ op: 'NOT_A_REAL_OP' }] }),
    });
    assert.equal(res.status, 400);
  });

  it('POST /api/nvm/inject-ops accepts a well-formed op with 200', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/inject-ops`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: freshSessionId(),
        ops: [{ op: 'ADD_FACT', fact: { factId: 'f1', subject: 'alice', predicate: 'knows', object: 'bob' } }],
      }),
    });
    assert.equal(res.status, 200);
  });

  it('POST /api/nvm/converge rejects a target without sceneIdx with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/converge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: freshSessionId(), target: { notSceneIdx: true } }),
    });
    assert.equal(res.status, 400);
  });

  it('POST /api/nvm/genome/diff rejects missing runIdA/runIdB with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/genome/diff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: freshSessionId() }),
    });
    assert.equal(res.status, 400);
  });

  it('POST /api/nvm/genome/breed rejects missing runIdA/runIdB with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/genome/breed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: freshSessionId() }),
    });
    assert.equal(res.status, 400);
  });

  it('POST /api/nvm/repair rejects an ir without an ops array with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/repair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: freshSessionId(), ir: {} }),
    });
    assert.equal(res.status, 400);
  });

  it('POST /api/nvm/live/move rejects an empty text with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/live/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: freshSessionId(), text: '' }),
    });
    assert.equal(res.status, 400);
  });

  it('POST /api/nvm/compile accepts an empty body with 200 (title is optional)', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/compile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: freshSessionId() }),
    });
    assert.equal(res.status, 200);
  });

  it('POST /api/nvm/compile rejects a non-string title with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/compile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: freshSessionId(), title: 12345 }),
    });
    assert.equal(res.status, 400);
  });
});
