import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, type TestServer } from './helpers.ts';
import { fountainToFdx } from '../../src/lib/fdx.ts';

// Multi-scene Fountain fixture: 4 sluglines (INT./EXT.), 3 speaking characters,
// dialogue in every scene, and a few lexicon hits (deadline term "midnight",
// danger terms "gun"/"dark"/"run", a quoted clue phrase) so the fixture
// exercises real signal extraction rather than an all-zeros degenerate case.
const MULTI_SCENE_FOUNTAIN = `INT. WAREHOUSE - NIGHT

Rain hammers the tin roof. JAX crouches behind a stack of crates, a gun in his hand.

JAX
(whispering)
She said midnight. It's already past that.

MARA
We wait. If they're not here by dawn, we run.

JAX
I don't like waiting in the dark.

EXT. WAREHOUSE - CONTINUOUS

A truck's headlights sweep across the gravel lot. MARA watches through a cracked window.

MARA
Someone's here. Get down.

INT. WAREHOUSE - MOMENTS LATER

The door bursts open. A STRANGER steps inside, face hidden in shadow.

STRANGER
I know what you did.

JAX
That's not true.

STRANGER
You've been lying to her since the beginning.

MARA
Jax? What is he talking about?

EXT. HIGHWAY - DAWN

JAX and MARA run toward the car as the "SILVER KEY" catches the first light.

MARA
Just drive. We'll figure out the rest later.

JAX
I'm sorry. I should have told you everything.
`;

// Real Final Draft XML for the fdx submission path — generated from the same
// fixture via the existing Fountain→FDX exporter (src/lib/fdx.ts), so this
// exercises the doctor route's fdx branch with a script rich enough to
// produce a non-degenerate report, without hand-rolling FDX XML by hand.
const MULTI_SCENE_FDX = fountainToFdx(MULTI_SCENE_FOUNTAIN, 'The Long Wait');

describe('routes/scriptide/doctor — HTTP behavior', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  const post = (body: unknown) => fetch(`${server.baseUrl}/api/scriptide/doctor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  it('POST a valid multi-scene Fountain script returns 200 with a well-formed ScriptDoctorReport', async () => {
    const res = await post({ fountain: MULTI_SCENE_FOUNTAIN });
    assert.equal(res.status, 200);
    const body = await res.json();

    // All ScriptDoctorReport keys present.
    const expectedKeys = [
      'health', 'grade', 'totalIssues', 'bySeverity', 'passes', 'sceneHeatmap',
      'topPriorities', 'structure', 'characters', 'sceneCount', 'wordCount', 'analyzedAt',
    ];
    for (const key of expectedKeys) {
      assert.ok(key in body, `expected report to have key "${key}"`);
    }

    // All 14 revision passes run in diagnose-only mode, including zero-issue ones.
    assert.equal(body.passes.length, 14);

    // The heatmap has exactly one entry per parsed scene.
    assert.equal(body.sceneHeatmap.length, body.sceneCount);
    assert.equal(body.sceneCount, 4);

    // health is clamped to [0, 100].
    assert.ok(body.health >= 0 && body.health <= 100, `health ${body.health} out of [0,100]`);

    // bySeverity sums to totalIssues.
    const { critical, major, minor } = body.bySeverity;
    assert.equal(critical + major + minor, body.totalIssues);
  });

  it('POST a whitespace-only fountain returns 200 with the documented zero-scene contract', async () => {
    const res = await post({ fountain: '   \n  ' });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.health, 0);
    assert.equal(body.grade, 'troubled');
    assert.deepEqual(body.passes, []);
    assert.equal(body.sceneCount, 0);
  });

  it('POST with a missing fountain field returns 400', async () => {
    const res = await post({});
    assert.equal(res.status, 400);
  });

  it('POST with fountain of the wrong type (number) returns 400', async () => {
    const res = await post({ fountain: 42 });
    assert.equal(res.status, 400);
  });

  it('POST with an empty-string fountain returns 400 (zod .min(1))', async () => {
    const res = await post({ fountain: '' });
    assert.equal(res.status, 400);
  });

  it('POST an oversized fountain (900_001 chars) is rejected', async () => {
    const res = await post({ fountain: 'A'.repeat(900_001) });
    // The zod DoctorBodySchema caps fountain at 900_000 chars, specifically so
    // it rejects before the express `express.json({ limit: '1mb' })` body cap
    // would (900_001 chars is still well under 1mb of JSON bytes once the
    // `{"fountain":"..."}` wrapper is counted), so in practice zod's 400 fires
    // first. Assert either status since a body-size 413 would also be a
    // correct rejection if that cap ever fired first.
    assert.ok(res.status === 400 || res.status === 413, `expected 400 or 413, got ${res.status}`);
  });

  it('POST accepts an optional title alongside fountain', async () => {
    const res = await post({ fountain: MULTI_SCENE_FOUNTAIN, title: 'The Long Wait' });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.sceneCount, 4);
  });

  it('is deterministic through HTTP: the same script POSTed twice yields deep-equal reports', async () => {
    const [res1, res2] = await Promise.all([post({ fountain: MULTI_SCENE_FOUNTAIN }), post({ fountain: MULTI_SCENE_FOUNTAIN })]);
    assert.equal(res1.status, 200);
    assert.equal(res2.status, 200);
    const body1 = await res1.json();
    const body2 = await res2.json();
    delete body1.analyzedAt;
    delete body2.analyzedAt;
    assert.deepEqual(body1, body2);
  });

  // ── Final Draft (.fdx) submission path ────────────────────────────────────
  it('POST a valid Final Draft (.fdx) body returns 200 with a well-formed report and source.format "fdx"', async () => {
    const res = await post({ fdx: MULTI_SCENE_FDX });
    assert.equal(res.status, 200);
    const body = await res.json();

    // Same 14-pass contract as the fountain submission path — the doctor
    // never knows or cares which format the script arrived in.
    assert.equal(body.passes.length, 14);
    assert.equal(body.sceneCount, 4);

    assert.equal(body.source.format, 'fdx');
    assert.equal(typeof body.source.convertedFountain, 'string');
    assert.ok(body.source.convertedFountain.length > 0);
    // The converted Fountain text carries at least one recognizable slugline.
    assert.match(body.source.convertedFountain, /INT\.\s+WAREHOUSE|EXT\.\s+WAREHOUSE|EXT\.\s+HIGHWAY/);
  });

  it('POST a body with both fountain and fdx returns 400', async () => {
    const res = await post({ fountain: MULTI_SCENE_FOUNTAIN, fdx: MULTI_SCENE_FDX });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /exactly one of fountain or fdx/);
  });

  it('POST a body with neither fountain nor fdx returns 400', async () => {
    const res = await post({ title: 'Untitled' });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /exactly one of fountain or fdx/);
  });

  it('POST a malformed fdx (no <Paragraph> elements) returns 400', async () => {
    const res = await post({ fdx: '<FinalDraft><Content></Content></FinalDraft>' });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(typeof body.error === 'string' && body.error.length > 0);
  });
});
