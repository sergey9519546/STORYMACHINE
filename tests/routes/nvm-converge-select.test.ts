// Tests for the generate→audit→select closure: convergeScene() (server/nvm/converge/loop.ts)
// now returns a per-candidate audit trail (`candidates[]`), a committable `winner`,
// and the last writers'-room's full critique transcript (`roomTranscript`) instead of
// computing and discarding them — and POST /api/nvm/converge/commit is the missing
// back-half that actually turns a selection (winner, runner-up, or a restored ghost)
// into a StoryCommit. See tests/routes/nvm.test.ts for the pre-existing route-test
// conventions this file follows (startTestServer harness, freshSessionId per test).
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, freshSessionId, type TestServer } from './helpers.ts';

// Keyless test environment (see tests/core/core-02.test.ts's "stub path" tests) —
// makeLLMCandidateGenerator() has no GEMINI_API_KEY to work with, so every candidate
// convergeScene() evaluates here is the deterministic structural stub from
// server/nvm/generate/llm-generator.ts: ops are always
//   [{op:'UPDATE_READER_STATE', delta:{suspense, curiosity}}, {op:'ADD_FACT', ...}],
// activeMechanisms is inherited from the request's target.activeMechanisms, and
// preconditions is always []. That determinism is exactly what makes this suite
// reliable without mocking the LLM.
const REAL_MECHANISM = 'relationship_externalization'; // a real *.mech.json id — MechanismProof requires one

describe('routes/nvm — converge candidate selection & commit', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  it('POST /api/nvm/converge (sceneIdx 0, trivial targets) converges at iteration 0 with a non-null winner, scored candidates[], and no roomTranscript', async () => {
    const sid = freshSessionId();
    const res = await fetch(`${server.baseUrl}/api/nvm/converge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sid,
        target: {
          sceneIdx: 0, sceneFunction: 'build_tension',
          activeMechanisms: [REAL_MECHANISM],
          tensionTarget: 0, qualityTarget: 0, // trivially met — converges at iteration 0
        },
        budget: { maxIterations: 2, candidatesPerIteration: 2 },
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();

    assert.equal(body.converged, true);
    assert.ok(Array.isArray(body.candidates), 'candidates should be an array');
    assert.equal(body.candidates.length, 2, 'iteration 0 only — converges before iteration 1 runs');

    for (const c of body.candidates) {
      assert.ok(['winner', 'pass', 'ghost'].includes(c.status), `unexpected status "${c.status}"`);
      assert.match(c.candidateId, /^c\d+-\d+$/, 'candidateId should be the deterministic c<iter>-<idx> form');
      assert.equal(typeof c.composite, 'number');
      assert.equal(typeof c.tension, 'number');
      assert.equal(typeof c.quality, 'number');
      assert.ok(Array.isArray(c.tier1Failures));
      assert.ok(Array.isArray(c.tier2Flags));
      assert.ok(c.ir && Array.isArray(c.ir.ops), 'each candidate record must carry its own full ir');
    }
    const winners = body.candidates.filter((c: unknown) => (c as { status: string }).status === 'winner');
    assert.equal(winners.length, 1, 'exactly one candidate should be flagged as the winner');

    assert.ok(body.winner, 'winner should be non-null — Tier 1 always passes at sceneIdx 0');
    assert.equal(typeof body.winner.candidateId, 'string');
    assert.equal(body.winner.candidateId, winners[0].candidateId, 'top-level winner must match the winning candidate record');
    assert.ok(Array.isArray(body.winner.ir.ops));
    assert.equal(typeof body.winner.composite, 'number');

    // The writers' room only runs once a `best` exists AND iter > 0 — converging
    // at iteration 0 means it never ran.
    assert.equal(body.roomTranscript, undefined);
  });

  it('POST /api/nvm/converge (sceneIdx > 0) — stub candidates declare no preconditions, so CausalProof blocks every one of them and winner is null', async () => {
    const sid = freshSessionId();
    const res = await fetch(`${server.baseUrl}/api/nvm/converge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sid,
        target: {
          sceneIdx: 3, sceneFunction: 'build_tension',
          activeMechanisms: [REAL_MECHANISM],
          tensionTarget: 0, qualityTarget: 0,
        },
        budget: { maxIterations: 1, candidatesPerIteration: 2 },
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();

    assert.equal(body.converged, false);
    assert.equal(body.winner, null, 'no candidate ever passed Tier 1, so winner must be null (never a candidate object)');
    assert.ok(body.candidates.length > 0);
    for (const c of body.candidates) {
      assert.equal(c.status, 'ghost');
      assert.equal(c.ghostReason, 'proof_fail');
      assert.ok(c.tier1Failures.includes('CausalProof'), 'a non-initial scene with ops but no preconditions must fail CausalProof');
      // Deliverable 1: scores are captured even for a candidate that can never
      // commit — that's the whole point of not discarding them.
      assert.equal(typeof c.composite, 'number');
      assert.equal(typeof c.tension, 'number');
      assert.equal(typeof c.quality, 'number');
    }

    // Ghosts persisted into the Ghost Ledger — verify via the pre-existing endpoint.
    const ghostsRes = await fetch(`${server.baseUrl}/api/nvm/ghost-commits?sessionId=${sid}`);
    assert.equal(ghostsRes.status, 200);
    const ghostsBody = await ghostsRes.json();
    assert.ok(ghostsBody.ghosts.length >= body.candidates.length);
  });

  it('POST /api/nvm/converge — budget exhausted with an unreachable tension target still surfaces a non-null winner and a populated roomTranscript', async () => {
    const sid = freshSessionId();
    const res = await fetch(`${server.baseUrl}/api/nvm/converge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sid,
        target: {
          sceneIdx: 0, sceneFunction: 'build_tension',
          activeMechanisms: [REAL_MECHANISM],
          tensionTarget: 999999, qualityTarget: 0, // unreachable — never converges
        },
        budget: { maxIterations: 2, candidatesPerIteration: 2 },
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();

    assert.equal(body.converged, false);
    assert.ok(body.winner, 'Tier 1 always passes at sceneIdx 0, so the composite-argmax `best` — and winner — should be set even though nothing converged');
    assert.ok(Array.isArray(body.roomTranscript), 'iteration 1 ran with a `best` already set from iteration 0, so the writers\' room must have run');
    for (const critique of body.roomTranscript) {
      assert.equal(typeof critique.criticId, 'string');
      assert.equal(typeof critique.severity, 'number');
      assert.equal(typeof critique.objection, 'string');
      assert.equal(typeof critique.attentionBid, 'number');
    }
    assert.ok(
      body.candidates.some((c: unknown) => (c as { ghostReason?: string }).ghostReason === 'valuation_too_low'),
      'every candidate should miss the unreachable tension target',
    );
  });

  it('POST /api/nvm/converge/commit — the converge winner\'s ops commit with 200 and appear in GET /api/nvm/commits carrying the converge_selected marker', async () => {
    const sid = freshSessionId();
    const convergeRes = await fetch(`${server.baseUrl}/api/nvm/converge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sid,
        target: {
          sceneIdx: 0, sceneFunction: 'build_tension',
          activeMechanisms: [REAL_MECHANISM],
          tensionTarget: 0, qualityTarget: 0,
        },
        budget: { maxIterations: 1, candidatesPerIteration: 2 },
      }),
    });
    const convergeBody = await convergeRes.json();
    assert.ok(convergeBody.winner, 'precondition: converge must produce a winner to commit');

    const commitRes = await fetch(`${server.baseUrl}/api/nvm/converge/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sid,
        ops: convergeBody.winner.ir.ops,
        sceneIdx: convergeBody.winner.ir.sceneIdx,
        activeMechanisms: convergeBody.winner.ir.activeMechanisms,
        preconditions: convergeBody.winner.ir.preconditions,
        summary: 'accepted the converge winner',
      }),
    });
    assert.equal(commitRes.status, 200);
    const commitBody = await commitRes.json();
    assert.equal(typeof commitBody.commitId, 'string');
    assert.ok(commitBody.commitId.startsWith('converge_selected-'));
    assert.equal(commitBody.marker, 'converge_selected');

    const commitsRes = await fetch(`${server.baseUrl}/api/nvm/commits?sessionId=${sid}`);
    assert.equal(commitsRes.status, 200);
    const commitsBody = await commitsRes.json();
    const found = commitsBody.commits.find((c: unknown) => (c as { commitId: string }).commitId === commitBody.commitId);
    assert.ok(found, 'the committed candidate should appear in GET /api/nvm/commits');
    assert.ok(found.commitId.includes('converge_selected'));
  });

  it('POST /api/nvm/converge/commit — a non-winner candidate can be committed too (candidates[] carries full ir for exactly this reason)', async () => {
    const sid = freshSessionId();
    const convergeRes = await fetch(`${server.baseUrl}/api/nvm/converge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sid,
        target: {
          sceneIdx: 0, sceneFunction: 'build_tension',
          activeMechanisms: [REAL_MECHANISM],
          tensionTarget: 0, qualityTarget: 0,
        },
        budget: { maxIterations: 1, candidatesPerIteration: 3 },
      }),
    });
    const convergeBody = await convergeRes.json();
    const nonWinner = convergeBody.candidates.find((c: unknown) => (c as { status: string }).status !== 'winner');
    assert.ok(nonWinner, 'expects at least one non-winner candidate with candidatesPerIteration=3');

    const commitRes = await fetch(`${server.baseUrl}/api/nvm/converge/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sid,
        ops: nonWinner.ir.ops,
        sceneIdx: nonWinner.ir.sceneIdx,
        activeMechanisms: nonWinner.ir.activeMechanisms,
        preconditions: nonWinner.ir.preconditions,
      }),
    });
    assert.equal(commitRes.status, 200);
  });

  it('POST /api/nvm/converge/commit — ops that violate a Tier1 proof against current session state reject with 409 and a failures list', async () => {
    const sid = freshSessionId();
    const res = await fetch(`${server.baseUrl}/api/nvm/converge/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sid,
        // EXPIRE_FACT for a fact that was never ADD_FACT'd anywhere — TemporalProof
        // blocks this unconditionally, so this deterministically exercises the 409
        // path without needing to race two concurrent requests against shared state.
        ops: [{ op: 'EXPIRE_FACT', factId: 'never-existed', atTurn: 0 }],
        sceneIdx: 0,
        activeMechanisms: [REAL_MECHANISM],
      }),
    });
    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(typeof body.error, 'string');
    assert.ok(Array.isArray(body.failures));
    assert.ok(body.failures.some((f: unknown) => (f as { proof: string }).proof === 'TemporalProof'));
  });

  it('POST /api/nvm/converge/commit — a missing ops field rejects with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/converge/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: freshSessionId() }),
    });
    assert.equal(res.status, 400);
  });

  it('POST /api/nvm/converge/commit — an empty ops array rejects with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/converge/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: freshSessionId(), ops: [] }),
    });
    assert.equal(res.status, 400);
  });

  it('POST /api/nvm/converge/commit — an unknown op kind rejects with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/converge/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: freshSessionId(), ops: [{ op: 'NOT_A_REAL_OP' }] }),
    });
    assert.equal(res.status, 400);
  });
});
