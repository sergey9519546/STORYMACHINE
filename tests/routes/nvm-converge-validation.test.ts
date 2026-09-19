// 2026-09-19 converge-contract lane (C12) — SceneTargetSchema/ConvergeBudgetSchema
// (server/lib/validation.ts) type what used to be
// `target: z.object({ sceneIdx: z.number() }).passthrough()` and an unbounded
// `budget.maxIterations`. See tests/routes/nvm-converge-select.test.ts for the
// pre-existing route-test conventions (startTestServer harness, REAL_MECHANISM)
// this file follows; this file covers the REJECTION side those tests never
// exercised, plus a bench-shaped request that must still succeed unchanged.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, freshSessionId, type TestServer } from './helpers.ts';

const REAL_MECHANISM = 'relationship_externalization'; // a real *.mech.json id — MechanismProof requires one

describe('routes/nvm — POST /api/nvm/converge input validation (C12)', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  it('(1) a string tensionTarget rejects with 400 and a field-named error, instead of silently making the gate meaningless', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/converge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: freshSessionId(),
        target: {
          sceneIdx: 0, sceneFunction: 'build_tension',
          activeMechanisms: [REAL_MECHANISM],
          tensionTarget: 'high', qualityTarget: 0,
        },
      }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(typeof body.error, 'string');
    assert.ok(Array.isArray(body.details) || typeof body.error === 'string', 'error body should be present');
    const haystack = JSON.stringify(body).toLowerCase();
    assert.ok(haystack.includes('tensiontarget'), `error should name the offending field, got: ${JSON.stringify(body)}`);
  });

  it('(2) budget.maxIterations: -1 rejects with 400 (was silently accepted and ran the loop zero times)', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/converge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: freshSessionId(),
        target: {
          sceneIdx: 0, sceneFunction: 'build_tension',
          activeMechanisms: [REAL_MECHANISM],
          tensionTarget: 0, qualityTarget: 0,
        },
        budget: { maxIterations: -1, candidatesPerIteration: 2 },
      }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    const haystack = JSON.stringify(body).toLowerCase();
    assert.ok(haystack.includes('maxiterations'), `error should name maxIterations, got: ${JSON.stringify(body)}`);
  });

  it('(3) budget.maxIterations: 0 rejects with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/converge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: freshSessionId(),
        target: {
          sceneIdx: 0, sceneFunction: 'build_tension',
          activeMechanisms: [REAL_MECHANISM],
          tensionTarget: 0, qualityTarget: 0,
        },
        budget: { maxIterations: 0, candidatesPerIteration: 2 },
      }),
    });
    assert.equal(res.status, 400);
  });

  it('(4) a valid bench-shaped request (scripts/story-bench.mjs beatsToSceneTargets() shape) still succeeds with 200, unchanged', async () => {
    // Mirrors beatsToSceneTargets()'s exact output shape in scripts/story-bench.mjs.
    const target = {
      sceneIdx: 0,
      sceneFunction: 'establish_world',
      activeMechanisms: [REAL_MECHANISM],
      tensionTarget: 20,
      qualityTarget: 60,
      themeHint: 'the letter arrives unopened',
    };
    const res = await fetch(`${server.baseUrl}/api/nvm/converge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: freshSessionId(),
        target,
        seed: 20260913,
        budget: { maxIterations: 2, candidatesPerIteration: 2 },
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(typeof body.finalComposite, 'number');
    assert.ok('tier1Passed' in body, 'route response should surface tier1Passed');
  });

  it('an out-of-enum sceneFunction rejects with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/converge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: freshSessionId(),
        target: {
          sceneIdx: 0, sceneFunction: 'not_a_real_function',
          activeMechanisms: [REAL_MECHANISM],
          tensionTarget: 0, qualityTarget: 0,
        },
      }),
    });
    assert.equal(res.status, 400);
  });

  it('an unreachable-but-legitimate large tensionTarget (999999, the nvm-converge-select fixture) still validates', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/converge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: freshSessionId(),
        target: {
          sceneIdx: 0, sceneFunction: 'build_tension',
          activeMechanisms: [REAL_MECHANISM],
          tensionTarget: 999999, qualityTarget: 0,
        },
        budget: { maxIterations: 1, candidatesPerIteration: 1 },
      }),
    });
    assert.equal(res.status, 200);
  });

  it('GET /api/nvm/converge-stream with an invalid sceneFunction query param falls back to build_tension instead of an unchecked cast', async () => {
    const sid = freshSessionId();
    const params = new URLSearchParams({
      sessionId: sid,
      sceneFunction: "'; DROP TABLE scenes; --",
      maxIterations: '1',
      candidatesPerIteration: '1',
      tensionTarget: '0',
      qualityTarget: '0',
    });
    const es = await fetch(`${server.baseUrl}/api/nvm/converge-stream?${params}`);
    assert.equal(es.status, 200);
    const text = await es.text();
    const completeLine = text.split('\n').find(l => l.includes('converge_complete'));
    assert.ok(completeLine, 'expected a converge_complete SSE event');
    const payload = JSON.parse(completeLine!.slice('data: '.length));
    assert.equal(typeof payload.result.finalComposite, 'number');
  });
});
