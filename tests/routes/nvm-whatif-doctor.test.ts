// Tests for the What-If Lab's Script Doctor readout (POST /api/nvm/whatif/doctor,
// server/routes/nvm/twin-whatif.ts) and the branch materialisation it stands on
// (server/nvm/whatif/materialize.ts).
//
// Deterministic and keyless like tests/routes/nvm-whatif-room.test.ts, whose
// seedSessionWithClockOp idiom this file reuses: no GEMINI_API_KEY is set
// anywhere here, and nothing on this route's path makes an LLM call — real
// buildSCM/doIntervention, the real StoryCommit -> Fountain projector
// (server/nvm/project/index.ts) and the real 14-pass doctor all run exactly as
// they would in production.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, freshSessionId, type TestServer } from './helpers.ts';

describe('routes/nvm — What-If Lab × Script Doctor', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  // Two commits (so the projected draft has two scenes and the cross-scene
  // structural aggregates are `scored`), seeded through the existing keyless
  // POST /api/nvm/inject-ops route. Returns the real opId of the RAISE_CLOCK op,
  // read back from GET /api/nvm/twin/scm so no test hardcodes the private
  // "${commitId}:${opIdx}" opId format.
  async function seedTwoSceneSession(sid: string): Promise<string> {
    const scenes = [
      {
        sceneIdx: 0,
        ops: [
          { op: 'ADD_FACT', fact: { factId: 'f1', subject: 'door', predicate: 'is', object: 'locked', addedAtTurn: 0, validFrom: 0, validTo: null } },
          { op: 'RAISE_CLOCK', clockId: 'bomb', amount: 40 },
          { op: 'SEED_CLUE', clueId: 'key-under-mat', carrier: 'object' },
        ],
      },
      {
        sceneIdx: 1,
        ops: [
          { op: 'UPDATE_BELIEF', charId: 'mara', belief: { proposition: 'the key is gone', confidence: 0.8 } },
          { op: 'SHIFT_RELATIONSHIP', pair: ['mara', 'ivo'], delta: { dimension: 'trust', amount: -0.4, reason: 'she caught him lying' } },
        ],
      },
    ];
    for (const scene of scenes) {
      const res = await fetch(`${server.baseUrl}/api/nvm/inject-ops`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid, ...scene }),
      });
      assert.equal(res.status, 200, 'seeding via inject-ops must succeed');
    }

    const scmRes = await fetch(`${server.baseUrl}/api/nvm/twin/scm?sessionId=${sid}`);
    assert.equal(scmRes.status, 200);
    const scmBody = await scmRes.json();
    const clockNode = scmBody.nodes.find((n: { op: { op: string } }) => n.op.op === 'RAISE_CLOCK');
    assert.ok(clockNode, 'seeded RAISE_CLOCK op must appear in the SCM');
    return clockNode.opId as string;
  }

  async function postDoctor(sid: string, body: Record<string, unknown>) {
    return fetch(`${server.baseUrl}/api/nvm/whatif/doctor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, ...body }),
    });
  }

  it('materialises the base draft and every branch as real Fountain and scores each through the doctor', async () => {
    const sid = freshSessionId();
    const opId = await seedTwoSceneSession(sid);

    const res = await postDoctor(sid, { opId, replacement: null, branchLimit: 2 });
    assert.equal(res.status, 200);
    const body = await res.json();

    // The base draft is the CURRENT commits projected — real Fountain with real
    // scene headings, not a placeholder.
    assert.match(body.base.fountain, /^INT\. /m, 'base draft must carry Fountain scene headings');
    assert.equal(body.base.analysisComplete, true);
    assert.equal(typeof body.base.health, 'number');
    assert.equal(body.base.sceneCount, 2, 'two seeded commits project to two scenes');
    // 2026-09-04 review (REVISE item 5): the base report is complete, so
    // presentReport must carry healthPercentile alongside health/grade —
    // gated on the SAME `complete` flag, never a second condition.
    assert.equal(typeof body.base.healthPercentile, 'number');

    assert.ok(Array.isArray(body.branches) && body.branches.length > 0, 'at least one scored branch');
    assert.ok(body.branches.length <= 2, 'branchLimit is honoured');

    for (const branch of body.branches) {
      assert.equal(typeof branch.branchId, 'string');
      assert.match(branch.fountain, /^INT\. /m, 'each branch materialises to real Fountain');
      assert.equal(branch.analysisComplete, true, 'a materialised branch is analysable');
      assert.equal(typeof branch.health, 'number');
      assert.equal(typeof branch.grade, 'string');
      assert.equal(typeof branch.verdict, 'string');
      assert.equal(typeof branch.healthDelta, 'number');
      assert.equal(
        branch.healthDelta,
        Math.round((branch.health - body.base.health) * 10) / 10,
        'healthDelta is the branch health minus the base health, nothing else',
      );
      // 2026-09-04 review (REVISE item 5) — closes the "promoted snapshot can
      // never show a percentile" asymmetry the review found: every complete
      // branch report must carry healthPercentile, the same field a manually
      // saved snapshot already gets from confirmSnapshot.
      assert.equal(typeof branch.healthPercentile, 'number');
      // Descriptive structural aggregates — present because the variant has
      // >= 2 scenes, so structuralSignals.scored is true.
      assert.equal(typeof branch.meanAbsDialogueShareDelta, 'number');
      assert.equal(typeof branch.actionSentenceCvOverall, 'number');
    }
  });

  it('a branch variant is the intervened timeline PLUS that branch — the intervened op is gone from the text and the branch adds a scene', async () => {
    const sid = freshSessionId();
    const opId = await seedTwoSceneSession(sid);

    const res = await postDoctor(sid, { opId, replacement: null, branchLimit: 1 });
    assert.equal(res.status, 200);
    const body = await res.json();

    // RAISE_CLOCK on the "bomb" clock renders a distinctive deadline sentence
    // naming that clock (project/index.ts's renderFountainOp). It is in the base
    // draft and must NOT be anywhere in the counterfactual timeline, because
    // that is the op the intervention removed. Matched on the CLOCK NAME, not on
    // the generic "deadline tightens" stem: a branch is free to propose its own
    // RAISE_CLOCK on a different clock, and that is a genuinely different beat,
    // not a leak of the removed one.
    assert.match(body.base.fountain, /before the bomb reaches/, 'the base draft contains the bomb-clock beat');
    assert.doesNotMatch(body.intervened, /before the bomb reaches/, 'do() removed the clock op, so its prose is gone');
    assert.doesNotMatch(body.branches[0].fountain, /before the bomb reaches/);

    const sceneCount = (t: string) => (t.match(/^INT\. /gm) ?? []).length;
    assert.equal(
      sceneCount(body.branches[0].fountain),
      sceneCount(body.intervened) + 1,
      'a branch appends exactly one proposed scene to the counterfactual timeline',
    );
  });

  it('is byte-for-byte deterministic — the same intervention twice produces the same materialised text and the same scores', async () => {
    const sid = freshSessionId();
    const opId = await seedTwoSceneSession(sid);

    const first = await (await postDoctor(sid, { opId, replacement: null, branchLimit: 3 })).json();
    const second = await (await postDoctor(sid, { opId, replacement: null, branchLimit: 3 })).json();

    assert.equal(first.base.fountain, second.base.fountain);
    assert.equal(first.intervened, second.intervened);
    assert.equal(first.branches.length, second.branches.length);
    for (let i = 0; i < first.branches.length; i++) {
      assert.equal(first.branches[i].branchId, second.branches[i].branchId);
      assert.equal(first.branches[i].fountain, second.branches[i].fountain);
      assert.equal(first.branches[i].health, second.branches[i].health);
      assert.equal(first.branches[i].verdict, second.branches[i].verdict);
    }
  });

  it('withholds health and grade — and the delta — on a session with nothing to analyze, rather than inventing a score', async () => {
    const sid = freshSessionId();
    // No inject-ops: no commits, so the projected draft is a title page with no
    // scenes and the doctor's own degenerate path marks it incomplete.
    const res = await postDoctor(sid, { opId: 'no-such-op:0', replacement: null });
    assert.equal(res.status, 200);
    const body = await res.json();

    assert.equal(body.base.analysisComplete, false);
    assert.equal(body.base.health, undefined, 'no health on an unanalysable draft');
    assert.equal(body.base.grade, undefined, 'no grade on an unanalysable draft');
    for (const branch of body.branches) {
      assert.equal(branch.healthDelta, undefined, 'never a delta against a withheld score');
    }
  });

  it('rejects a malformed body through the shared zod validator', async () => {
    const sid = freshSessionId();
    const missingOpId = await postDoctor(sid, { replacement: null });
    assert.equal(missingOpId.status, 400);

    const opId = await seedTwoSceneSession(sid);
    const badLimit = await postDoctor(sid, { opId, branchLimit: 99 });
    assert.equal(badLimit.status, 400, 'branchLimit is clamped by the schema, not silently accepted');
  });
});
