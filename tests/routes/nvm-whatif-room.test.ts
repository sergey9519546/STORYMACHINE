// Tests for the What-If Lab compose endpoint (POST /api/nvm/whatif/explore,
// server/nvm/whatif/explore.ts) and the on-demand Writers' Room
// (POST /api/nvm/room/critique). Both routes are deterministic and keyless —
// no GEMINI_API_KEY is configured anywhere in this file, and neither route
// makes an LLM call, so there is nothing to stub: real buildSCM/doIntervention,
// real generateBranchField/scoreBranch, and real critics/*.ts all run exactly
// as they would in production. See tests/routes/nvm-converge-select.test.ts
// for the pre-existing route-test conventions this file follows (startTestServer
// harness, freshSessionId per test).
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, freshSessionId, type TestServer } from './helpers.ts';

describe('routes/nvm — What-If Lab explore + on-demand Writers\' Room', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  // Seeds a session with one real commit (ADD_FACT + RAISE_CLOCK + SEED_CLUE)
  // via the existing, already-tested POST /api/nvm/inject-ops route, then
  // reads back the real opId of the RAISE_CLOCK op via GET /api/nvm/twin/scm
  // so tests never hardcode the private "${commitId}:${opIdx}" opId format.
  async function seedSessionWithClockOp(sid: string): Promise<string> {
    const injectRes = await fetch(`${server.baseUrl}/api/nvm/inject-ops`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sid,
        sceneIdx: 0,
        ops: [
          { op: 'ADD_FACT', fact: { factId: 'f1', subject: 'door', predicate: 'is', object: 'locked', addedAtTurn: 0, validFrom: 0, validTo: null } },
          { op: 'RAISE_CLOCK', clockId: 'bomb', amount: 40 },
          { op: 'SEED_CLUE', clueId: 'key-under-mat', carrier: 'object' },
        ],
      }),
    });
    assert.equal(injectRes.status, 200, 'seeding via inject-ops must succeed');

    const scmRes = await fetch(`${server.baseUrl}/api/nvm/twin/scm?sessionId=${sid}`);
    assert.equal(scmRes.status, 200);
    const scmBody = await scmRes.json();
    const clockNode = scmBody.nodes.find((n: { op: { op: string } }) => n.op.op === 'RAISE_CLOCK');
    assert.ok(clockNode, 'seeded RAISE_CLOCK op must appear in the SCM');
    return clockNode.opId as string;
  }

  // ── POST /api/nvm/whatif/explore ───────────────────────────────────────────

  it('POST /api/nvm/whatif/explore — 200 with baseline/intervened/consequences/branches, branches ranked descending by composite and capped at the default limit of 3', async () => {
    const sid = freshSessionId();
    const opId = await seedSessionWithClockOp(sid);

    const res = await fetch(`${server.baseUrl}/api/nvm/whatif/explore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, opId, replacement: null }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();

    // Baseline vs intervened snapshot shape
    for (const snap of [body.baseline, body.intervened]) {
      assert.equal(typeof snap.tension, 'number');
      assert.ok(snap.clocks && typeof snap.clocks === 'object');
      assert.ok(Array.isArray(snap.relationships));
      assert.ok(Array.isArray(snap.openSetups));
    }
    // Removing the RAISE_CLOCK op must show up as a clock-value diff.
    assert.equal(body.baseline.clocks.bomb, 40, 'baseline should reflect the seeded clock raise');
    assert.equal(body.intervened.clocks.bomb ?? 0, 0, 'removing the RAISE_CLOCK op should zero out the clock in the intervened snapshot');

    assert.ok(Array.isArray(body.consequences));
    assert.ok(body.consequences.length > 0);
    for (const c of body.consequences) {
      assert.equal(typeof c.kind, 'string');
      assert.equal(typeof c.description, 'string');
      assert.ok(!/[A-Z_]{4,}/.test(c.description), `consequence description should be plain language, not jargon: "${c.description}"`);
    }
    assert.ok(body.consequences.some((c: { kind: string }) => c.kind === 'removed'), 'the intervention itself should be reported as a "removed" consequence');
    assert.ok(body.consequences.some((c: { kind: string }) => c.kind === 'clock_shift'), 'the clock delta should be reported');

    assert.ok(Array.isArray(body.branches));
    assert.ok(body.branches.length <= 3, 'default branchLimit is 3');
    let lastComposite = Infinity;
    for (const b of body.branches) {
      assert.equal(typeof b.branchId, 'string');
      assert.ok(Array.isArray(b.ops));
      assert.equal(typeof b.summary, 'string');
      assert.equal(typeof b.scores.tension, 'number');
      assert.equal(typeof b.scores.quality, 'number');
      assert.equal(typeof b.scores.composite, 'number');
      assert.ok(b.scores.composite <= lastComposite, 'branches must be ranked best-first by composite score');
      lastComposite = b.scores.composite;
    }
  });

  it('POST /api/nvm/whatif/explore — deterministic across two identical calls (same session, same intervention)', async () => {
    const sid = freshSessionId();
    const opId = await seedSessionWithClockOp(sid);
    const payload = JSON.stringify({ sessionId: sid, opId, replacement: null, branchLimit: 5 });

    const [res1, res2] = await Promise.all([
      fetch(`${server.baseUrl}/api/nvm/whatif/explore`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload }),
      fetch(`${server.baseUrl}/api/nvm/whatif/explore`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload }),
    ]);
    assert.equal(res1.status, 200);
    assert.equal(res2.status, 200);
    const [body1, body2] = await Promise.all([res1.json(), res2.json()]);
    assert.deepEqual(body1, body2, 'identical requests must produce byte-identical responses — no Date.now()/randomUUID() leakage');
  });

  it('POST /api/nvm/whatif/explore — an unknown opId on a fresh, empty session returns 200 with an honest no-op answer (empty-ish consequences, baseline === intervened)', async () => {
    const sid = freshSessionId();
    const res = await fetch(`${server.baseUrl}/api/nvm/whatif/explore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, opId: 'nonexistent-commit:0' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body.baseline, body.intervened, 'nothing to intervene on — baseline and intervened must be identical');
    assert.equal(body.consequences.length, 1);
    assert.equal(body.consequences[0].kind, 'no_effect');
    assert.ok(Array.isArray(body.branches));
  });

  it('POST /api/nvm/whatif/explore — a missing opId rejects with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/whatif/explore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: freshSessionId() }),
    });
    assert.equal(res.status, 400);
  });

  it('POST /api/nvm/whatif/explore — an out-of-range branchLimit rejects with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/whatif/explore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: freshSessionId(), opId: 'x:0', branchLimit: 9 }),
    });
    assert.equal(res.status, 400);
  });

  // ── POST /api/nvm/room/critique ─────────────────────────────────────────────

  it('POST /api/nvm/room/critique — 200 with a real Critique[] shape, a dominant critic, and a numeric consensus, for a seeded session', async () => {
    const sid = freshSessionId();
    await seedSessionWithClockOp(sid);

    const res = await fetch(`${server.baseUrl}/api/nvm/room/critique`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();

    assert.ok(Array.isArray(body.critiques));
    assert.ok(body.critiques.length > 0, 'the shell IR always declares empty postconditions, so the showrunner critic should always object at least once');
    for (const c of body.critiques) {
      assert.equal(typeof c.criticId, 'string');
      assert.equal(typeof c.severity, 'number');
      assert.equal(typeof c.objection, 'string');
      assert.ok('suggestedOperator' in c);
      assert.equal(typeof c.attentionBid, 'number');
    }
    assert.equal(typeof body.dominant, 'string');
    assert.ok('suggestedOperator' in body);
    assert.equal(typeof body.consensus, 'number');
  });

  it('POST /api/nvm/room/critique — 200 on a fresh session with no commits yet (empty-ops shell IR, no crash)', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/room/critique`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: freshSessionId() }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.critiques));
    assert.equal(typeof body.consensus, 'number');
  });

  it('POST /api/nvm/room/critique — deterministic across two identical calls', async () => {
    const sid = freshSessionId();
    await seedSessionWithClockOp(sid);
    const payload = JSON.stringify({ sessionId: sid });

    const [res1, res2] = await Promise.all([
      fetch(`${server.baseUrl}/api/nvm/room/critique`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload }),
      fetch(`${server.baseUrl}/api/nvm/room/critique`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload }),
    ]);
    assert.equal(res1.status, 200);
    assert.equal(res2.status, 200);
    const [body1, body2] = await Promise.all([res1.json(), res2.json()]);
    assert.deepEqual(body1, body2, 'identical requests must produce byte-identical responses');
  });
});
