import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, freshSessionId, type TestServer } from './helpers.ts';

function buildSceneTruncatedFountain(): string {
  return Array.from(
    { length: 1_001 },
    (_, index) => `INT. ROOM ${index} - DAY\n\nA person waits.`,
  ).join('\n\n');
}

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

  it('GET /api/nvm/health withholds sentinel scores for an empty session (G0-05)', async () => {
    const sid = freshSessionId();
    const res = await fetch(`${server.baseUrl}/api/nvm/health?sessionId=${sid}`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.commitCount, 0);
    // An empty story must NOT report a green "100%" proof pass rate.
    assert.notEqual(body.proof.passRate, 100);
    assert.equal(body.proof.passRate, null);
    assert.equal(body.proof.avgQualityScore, null);
    // ...and must not fabricate a dominant emotional arc from zero data.
    assert.equal(body.topology.dominantArc, null);
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

  it('POST /api/nvm/analyze/compare rejects a missing scriptText with 400 (zod validation)', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/analyze/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(typeof body.error, 'string');
  });

  it('POST /api/nvm/analyze/compare rejects a non-string scriptText with 400 (zod validation)', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/analyze/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scriptText: 12345 }),
    });
    assert.equal(res.status, 400);
  });

  it('POST /api/nvm/analyze/compare rejects an empty-string scriptText with 400 (zod validation)', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/analyze/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scriptText: '' }),
    });
    assert.equal(res.status, 400);
  });

  // Regression, 2026-08-24. This route was 500ing on EVERY well-formed
  // request, for two independent reasons, and nothing covered its success
  // path — the three cases above only ever exercise 400/422 rejections, so
  // the endpoint could be (and was) completely non-functional with a green
  // suite. Reproduced against a booted keyless server before the fix:
  //
  //   1. corpus-loader.ts read data/screenplays/manifest.json unconditionally.
  //      That file is written only by scripts/convert-screenplays.ts from a
  //      private PDF source dir, and `data/` is gitignored, so no checkout has
  //      one: "ENOENT: no such file or directory, open '.../manifest.json'".
  //   2. With the corpus loading, findNearestNeighbors then threw
  //      "Dimension mismatch: 2 vs 185" — the draft is vectorized BEFORE the
  //      corpus, so it carries fewer of story-vector.ts's lazily-appended
  //      RULE_INDEX dimensions than every corpus vector built after it.
  //
  // This test asserts the success path end-to-end, so a regression in either
  // mechanism fails here rather than in production.
  it('POST /api/nvm/analyze/compare returns a 200 comparison for a complete draft', async () => {
    const script = [
      'INT. KITCHEN - DAY',
      '',
      'ANNA stares at the kettle. It will not boil.',
      '',
      'ANNA',
      'I have been waiting eleven minutes.',
      '',
      'EXT. STREET - NIGHT',
      '',
      'Rain. BEN waits under an awning, watching a lit window.',
      '',
      'BEN',
      'She is not coming down.',
      '',
      'INT. CAR - NIGHT',
      '',
      'Anna drives. Ben rides shotgun, silent.',
      '',
      'ANNA',
      'Say it.',
      '',
      'BEN',
      'I already did.',
    ].join('\n');

    const res = await fetch(`${server.baseUrl}/api/nvm/analyze/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scriptText: script }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();

    assert.equal(typeof body.vector.dimensions, 'number');
    assert.ok(Array.isArray(body.nearestNeighbors));
    assert.equal(typeof body.corpus.size, 'number');
    assert.equal(typeof body.healthMetrics.health, 'number');

    // Corpus size and neighbor count must agree: an empty neighbor list is
    // only honest when there is genuinely no corpus installed.
    if (body.corpus.size > 0) {
      assert.ok(
        body.nearestNeighbors.length > 0,
        `corpus.size ${body.corpus.size} but zero neighbors returned`,
      );
      for (const n of body.nearestNeighbors) {
        assert.equal(typeof n.similarity, 'number');
        assert.ok(Number.isFinite(n.similarity), `non-finite similarity for ${n.title}`);
        assert.ok(n.similarity >= 0 && n.similarity <= 1, `similarity out of range: ${n.similarity}`);
      }
    }

    // Honesty: the response must not carry an invented structural genome.
    // Before 2026-08-24 this field was five hardcoded literals
    // (actBreakPositions: [], reversalCount: 0, 'linear', 'linear', 0.5)
    // while docs/story-vector.md advertised measured-looking values for it.
    if (body.structuralTemplate !== null) {
      assert.equal(body.structuralTemplate.genome, null);
      assert.equal(typeof body.structuralTemplate.genomeUnavailableReason, 'string');
    }
  });

  it('GET /api/nvm/analyze/corpus-stats returns 200 corpus statistics', async () => {
    // Same manifest-ENOENT 500 as the compare route above; same fix.
    const res = await fetch(`${server.baseUrl}/api/nvm/analyze/corpus-stats`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(typeof body.available, 'number');
    assert.equal(typeof body.cached, 'number');
    assert.ok(Array.isArray(body.slugs));
    assert.ok(body.slugs.length <= 10, 'corpus-stats previews at most 10 slugs');
  });

  it('POST /api/nvm/analyze/compare refuses a scene-truncated prefix before making comparative claims', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/analyze/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scriptText: buildSceneTruncatedFountain() }),
    });
    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.error, 'analysis_incomplete');
    assert.equal(body.healthMetrics, undefined);
  });

  describe('POST /api/nvm/analyze/craft-compare (GODMODE L38)', () => {
    const SCRIPT_A = `INT. OFFICE - DAY

NORA studies a receipt.

LEO
You found it.

Nora burns the receipt.`;
    const SCRIPT_B = `EXT. STREET - NIGHT

A car waits in the rain.

MARA gets in. The engine starts.`;

    it('rejects fewer than two scripts with 400', async () => {
      const res = await fetch(`${server.baseUrl}/api/nvm/analyze/craft-compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scripts: [{ label: 'only', fountain: SCRIPT_A }] }),
      });
      assert.equal(res.status, 400);
    });

    it('rejects blank labels with 400', async () => {
      const res = await fetch(`${server.baseUrl}/api/nvm/analyze/craft-compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scripts: [
          { label: '', fountain: SCRIPT_A },
          { label: 'B', fountain: SCRIPT_B },
        ] }),
      });
      assert.equal(res.status, 400);
    });

    it('returns deterministic cross-script comparison for two parseable scripts', async () => {
      const res = await fetch(`${server.baseUrl}/api/nvm/analyze/craft-compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scripts: [
          { label: 'Receipt scene', fountain: SCRIPT_A },
          { label: 'Rain scene', fountain: SCRIPT_B },
        ] }),
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.scored, true);
      assert.equal(body.summaries.length, 2);
      assert.equal(body.similarityPairs.length, 1);
      assert.equal(body.similarityPairs[0].a, 'Receipt scene');
      assert.equal(body.similarityPairs[0].b, 'Rain scene');
    });

    it('accepts non-empty plain text via the analyzer fallback scene', async () => {
      const res = await fetch(`${server.baseUrl}/api/nvm/analyze/craft-compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scripts: [
          { label: 'Plain A', fountain: 'not a screenplay' },
          { label: 'Plain B', fountain: 'also not a screenplay' },
        ] }),
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.scored, true);
      assert.equal(body.summaries.length, 2);
    });
  });
});
