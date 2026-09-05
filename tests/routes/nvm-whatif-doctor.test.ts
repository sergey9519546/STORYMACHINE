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
    // REVIEW FIX (round 2, 2026-09-05) — the determinism receipt, forwarded
    // so a promoted/undo snapshot (src/components/ScriptIDE.tsx) can
    // dedupe exactly against this run in computeDraftRank instead of only
    // the approximate health+timestamp fallback (src/lib/
    // snapshot-trend.ts).
    assert.equal(typeof body.base.contentHash, 'string');
    assert.match(body.base.contentHash, /^[0-9a-f]{64}$/);

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
      // REVIEW FIX (round 2, 2026-09-05) — same determinism receipt as
      // body.base.contentHash above, per branch.
      assert.equal(typeof branch.contentHash, 'string');
      assert.match(branch.contentHash, /^[0-9a-f]{64}$/, 'contentHash is a real sha256 hex digest, not a placeholder');
    }
    assert.equal(typeof body.base.contentHash, 'string');
    assert.match(body.base.contentHash, /^[0-9a-f]{64}$/);
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
    assert.equal(first.base.contentHash, second.base.contentHash, 'identical text must hash identically');
    for (let i = 0; i < first.branches.length; i++) {
      assert.equal(first.branches[i].branchId, second.branches[i].branchId);
      assert.equal(first.branches[i].fountain, second.branches[i].fountain);
      assert.equal(first.branches[i].health, second.branches[i].health);
      assert.equal(first.branches[i].verdict, second.branches[i].verdict);
      assert.equal(first.branches[i].contentHash, second.branches[i].contentHash);
    }
  });

  // 2026-09-05 review finding F2 (superseding the pre-F2 version of this
  // test): a session with NOTHING committed has an EMPTY causal model
  // (buildSCM's nodes are built 1:1 from stage.getLiveCommits() — see
  // scm.ts's own first pass), so ANY opId — 'no-such-op:0' included — is now
  // rejected by opIdExists() BEFORE materialization ever runs, rather than
  // reaching materializeWhatIf and coming back with a withheld-score-but-200
  // report the way it used to. This is a STRICTLY STRONGER honesty
  // guarantee than the one this test used to check (no response describing
  // a hypothetical at all, rather than a response that honestly declines to
  // score one) — and it means the base-sceneCount-0 shape `unscorableDraft`
  // exists for is now UNREACHABLE through this route specifically: base is
  // always `stage.getLiveCommits()` projected directly (materialize.ts), so
  // base has >= 1 scene whenever `scm` has >= 1 node, i.e. whenever any opId
  // can be valid at all. `unscorableDraft`'s contentHash/analyzedAt fields
  // (finding F4) remain in place as defense-in-depth against a future change
  // that decouples "scm has a node" from "commits is non-empty" — verified
  // by reading server/routes/nvm/twin-whatif.ts directly, not exercisable
  // end-to-end today.
  it('a session with nothing committed has an empty causal model, so even a plausible-looking opId 404s before any materialization runs (finding F2)', async () => {
    const sid = freshSessionId();
    const res = await postDoctor(sid, { opId: 'no-such-op:0', replacement: null });
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.match(body.error, /not found in this session's causal model/);
  });

  // 2026-09-05 review finding F2 — MEDIUM: a nonexistent opId used to return
  // 200 with a real healthDelta (measured: +23.3, byte-identical to a real
  // intervention's), because materializeWhatIf does not itself refuse a
  // target absent from the graph the way counterfactual.ts's doIntervention
  // does internally (a "not found in SCM" summary with no numbers attached).
  // /whatif/doctor now checks the opId against the session's OWN SCM before
  // doing anything else, so a stale, typo'd, or probed-for opId can never
  // produce a scored response. (/whatif/explore is deliberately UNCHANGED —
  // see twin-whatif.ts's opIdExists() comment: its own nonexistent-opId
  // answer was already honest, not fabricated, and stays covered by
  // tests/routes/nvm-whatif-room.test.ts's own "honest no-op answer" test.)
  it('a nonexistent opId against a session that DOES have real ops still 404s on /whatif/doctor (finding F2)', async () => {
    const sid = freshSessionId();
    await seedTwoSceneSession(sid); // real ops exist in the SCM, just not this id
    const staleOpId = 'whatif-scene-0:999';

    const doctorRes = await postDoctor(sid, { opId: staleOpId, replacement: null });
    assert.equal(doctorRes.status, 404);
    const doctorBody = await doctorRes.json();
    assert.match(doctorBody.error, new RegExp(`opId "${staleOpId}".*not found`));
  });

  // 2026-09-05 review finding F3 — the comment above the zero-scene
  // short-circuit in twin-whatif.ts was narrowed to say the boundary is "no
  // slugline at all", not "not enough script to score": a ONE-scene
  // projected draft (below structuralSignals' own >= 2-scene floor) still
  // reaches the doctor and comes back analysisComplete:true, health:0 — the
  // SAME shared threshold /api/scriptide/doctor uses for a genuine one-scene
  // submission, not a divergence introduced by this route. Pinned here so a
  // future change to that shared threshold shows up as an intentional diff
  // in this test, not a silent behavior change.
  it('a one-scene session is scored (analysisComplete:true, health a number) — the zero-scene short-circuit boundary is "no slugline anywhere", not "not enough script" (finding F3)', async () => {
    const sid = freshSessionId();
    const res = await fetch(`${server.baseUrl}/api/nvm/inject-ops`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sid,
        sceneIdx: 0,
        ops: [{ op: 'RAISE_CLOCK', clockId: 'bomb', amount: 40 }],
      }),
    });
    assert.equal(res.status, 200);
    const scmRes = await fetch(`${server.baseUrl}/api/nvm/twin/scm?sessionId=${sid}`);
    const scmBody = await scmRes.json();
    const opId = scmBody.nodes[0].opId as string;

    const body = await (await postDoctor(sid, { opId, replacement: null, branchLimit: 1 })).json();
    assert.equal(body.base.sceneCount, 1);
    assert.equal(body.base.analysisComplete, true);
    assert.equal(typeof body.base.health, 'number');
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

// ── F1 (2026-09-05 review finding F1, MEDIUM-HIGH): the projected fountain
// (materialize.ts's base/branch text) was the one analyzer entry point with
// neither a size guard (fountainField()'s MAX_FOUNTAIN_CHARS) nor a shape
// guard (fountainShapeRejectionReason) in front of it. Two parts, tested
// separately: (a) InjectOpsBodySchema.ops now caps at
// MAX_INJECT_OPS_PER_COMMIT (500) per call — the schema-level bound that
// stops one commit from carrying an unbounded number of ops; (b) even with
// that cap, a session grown across MULTIPLE legal calls can still reach a
// projected draft over MAX_FOUNTAIN_CHARS, so the route also runs the SAME
// guard the raw-fountain fields use before ever handing the text to the
// doctor pool.
describe('routes/nvm — What-If Lab size guard (finding F1)', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  function postDoctor(sid: string, body: Record<string, unknown>) {
    return fetch(`${server.baseUrl}/api/nvm/whatif/doctor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, ...body }),
    });
  }

  it('InjectOpsBodySchema rejects more than 500 ops in a single commit', async () => {
    const sid = freshSessionId();
    const tooMany = Array.from({ length: 501 }, (_, i) => ({
      op: 'ADD_FACT',
      fact: { factId: `f${i}`, subject: `s${i}`, predicate: 'is', object: 'true', addedAtTurn: 0, validFrom: 0, validTo: null },
    }));
    const res = await fetch(`${server.baseUrl}/api/nvm/inject-ops`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, sceneIdx: 0, ops: tooMany }),
    });
    assert.equal(res.status, 400);

    const atLimit = tooMany.slice(0, 500);
    const okRes = await fetch(`${server.baseUrl}/api/nvm/inject-ops`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, sceneIdx: 0, ops: atLimit }),
    });
    assert.equal(okRes.status, 200, 'exactly 500 ops (the new ceiling) is still legal');
  });

  // Builds a session across TWO separate, individually-legal inject-ops
  // calls (500 UPDATE_BELIEF ops each, the schema's own per-commit ceiling)
  // whose combined projected draft exceeds MAX_FOUNTAIN_CHARS (900,000) —
  // proving the guard is needed even after (a) above, since nothing stops a
  // caller from accumulating many separate legal commits. A long-but-
  // ordinary belief proposition (a writer's paragraph, not a pathological
  // token) keeps this an "ordinary inject-ops calls" reproduction, matching
  // the finding — repeated inject-ops's own quadratic per-call cost
  // (unrelated to this guard) is why this uses 2 heavier calls rather than
  // 7 lighter ones like the original finding's repro.
  it('a session grown past MAX_FOUNTAIN_CHARS across several legal inject-ops calls is not scored, and its oversized text is withheld from the response', async () => {
    const sid = freshSessionId();
    // ~500 chars — long enough that 4 calls of 500 ops each (2,000 ops,
    // ~300KB request body per call, comfortably under express.json's 1mb
    // cap) compiles to just over MAX_FOUNTAIN_CHARS.
    const longProposition = 'The key that used to sit under the mat by the back door is gone, and everyone in '
      + 'the house who might have taken it has a reason to lie about where they were that night, which makes '
      + 'the question of who moved it the same question as who is lying now, and nobody in this house has ever '
      + 'been good at telling the truth when the truth costs them something they actually want to keep. Still, '
      + 'someone has to say it out loud before morning, or the silence itself becomes the lie everyone agrees to '
      + 'live inside.';
    let opId: string | undefined;
    for (let c = 0; c < 4; c++) {
      const ops = Array.from({ length: 500 }, (_, i) => ({
        op: 'UPDATE_BELIEF',
        charId: `char${c}_${i}`,
        belief: { proposition: longProposition, confidence: 0.8 },
      }));
      const res = await fetch(`${server.baseUrl}/api/nvm/inject-ops`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid, sceneIdx: c, ops }),
      });
      assert.equal(res.status, 200, `seeding commit ${c} must succeed`);
      if (opId === undefined) {
        const scmRes = await fetch(`${server.baseUrl}/api/nvm/twin/scm?sessionId=${sid}`);
        const scmBody = await scmRes.json();
        opId = scmBody.nodes[0].opId as string;
      }
    }

    const start = Date.now();
    const res = await postDoctor(sid, { opId: opId!, replacement: null, branchLimit: 1 });
    const ms = Date.now() - start;
    assert.equal(res.status, 200);
    const body = await res.json();

    assert.equal(body.base.sceneCount, 4, 'sanity: the 4 seeded commits must all be live scenes');
    assert.equal(body.base.analysisComplete, false, 'a too-large draft must not be presented as a complete analysis');
    assert.equal(body.base.health, undefined, 'no fabricated health for a draft this guard refused to score');
    assert.equal(body.base.tooLarge, true, 'the reason must be nameable — distinct from the zero-scene formatUnrecognized shape');
    assert.equal('fountain' in body.base, false, 'the oversized base text must not ship in the response either');
    assert.equal(typeof body.base.contentHash, 'string', 'F4-style identity is still attached even on the refused-to-score shape');
    assert.match(body.base.contentHash, /^[0-9a-f]{64}$/);
    assert.equal(typeof body.base.analyzedAt, 'number');
    // Bounding COST is the point: never actually pay for a 14-pass analysis
    // of a >900k-char document. The pre-fix repro measured 26.5s for this
    // shape; well under 1s here proves runScriptDoctorOffThread never ran.
    assert.ok(ms < 5000, `expected the too-large guard to short-circuit fast (<5000ms), took ${ms}ms`);

    for (const branch of body.branches) {
      assert.equal(branch.healthDelta, undefined, 'never a delta against a withheld score');
    }
  });
});
