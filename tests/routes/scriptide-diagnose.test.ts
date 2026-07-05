import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, type TestServer } from './helpers.ts';

// Multi-scene Fountain fixture — 4 sluglines, 3 speaking characters, dialogue
// in every scene, and enough lexicon density (deadline/danger/mystery terms)
// that the 14-pass pipeline has real material to diagnose rather than an
// all-zeros degenerate case. Mirrors the fixture shape used in
// tests/routes/scriptide-doctor.test.ts so both routes are exercised against
// comparably rich input.
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

const VALID_ANCHORS = new Set(['scene', 'character', 'lines', 'document']);

describe('routes/scriptide/diagnose — HTTP behavior', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  const postDiagnose = (body: unknown) => fetch(`${server.baseUrl}/api/scriptide/diagnose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const postDoctor = (body: unknown) => fetch(`${server.baseUrl}/api/scriptide/doctor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  it('POST a valid multi-scene Fountain script returns 200 with a well-formed LiveDiagnosis', async () => {
    const res = await postDiagnose({ fountain: MULTI_SCENE_FOUNTAIN });
    assert.equal(res.status, 200);
    const body = await res.json();

    // No API key needed and no full 14-pass report here — only the
    // lightweight LiveDiagnosis shape (types.ts).
    const expectedKeys = ['health', 'grade', 'sceneCount', 'locatedIssues', 'rootCauses', 'contentHash', 'analyzedAt'];
    for (const key of expectedKeys) {
      assert.ok(key in body, `expected LiveDiagnosis to have key "${key}"`);
    }
    assert.equal(body.sceneCount, 4);
    assert.ok(body.health >= 0 && body.health <= 100);
    assert.ok(Array.isArray(body.locatedIssues));
    assert.ok(Array.isArray(body.rootCauses));

    // Every located issue resolves to one of the four documented anchors,
    // and carries the original issue + pass alongside the resolved span.
    for (const li of body.locatedIssues) {
      assert.ok(VALID_ANCHORS.has(li.anchor), `unexpected anchor "${li.anchor}"`);
      assert.ok(typeof li.issue === 'object' && li.issue !== null);
      assert.ok(typeof li.pass === 'string' && li.pass.length > 0);
      if (li.anchor === 'document') {
        assert.equal(li.startLine, undefined);
        assert.equal(li.endLine, undefined);
      } else {
        assert.ok(typeof li.startLine === 'number' && li.startLine >= 1);
        assert.ok(typeof li.endLine === 'number' && li.endLine >= li.startLine);
      }
    }

    // Every root-cause finding subsumes at least 2 issues (no singletons).
    for (const finding of body.rootCauses) {
      assert.ok(finding.memberCount >= 2, `finding ${finding.id} has memberCount < 2`);
      assert.doesNotMatch(finding.title, /[A-Z]{3,}/, 'title leaked an ALL_CAPS rule token');
      assert.doesNotMatch(finding.explanation, /[A-Z]{3,}/, 'explanation leaked an ALL_CAPS rule token');
    }

    // Determinism receipt: sha256 hex (64 lowercase hex chars).
    assert.match(body.contentHash, /^[0-9a-f]{64}$/);
  });

  it('POST an empty-string fountain returns 400 (zod .min(1))', async () => {
    const res = await postDiagnose({ fountain: '' });
    assert.equal(res.status, 400);
  });

  it('POST with a missing fountain field returns 400', async () => {
    const res = await postDiagnose({});
    assert.equal(res.status, 400);
  });

  it('POST with fountain of the wrong type (number) returns 400', async () => {
    const res = await postDiagnose({ fountain: 42 });
    assert.equal(res.status, 400);
  });

  it('is deterministic through HTTP: the same script POSTed twice yields deep-equal diagnoses (minus analyzedAt)', async () => {
    const [res1, res2] = await Promise.all([
      postDiagnose({ fountain: MULTI_SCENE_FOUNTAIN }),
      postDiagnose({ fountain: MULTI_SCENE_FOUNTAIN }),
    ]);
    assert.equal(res1.status, 200);
    assert.equal(res2.status, 200);
    const body1 = await res1.json();
    const body2 = await res2.json();
    delete body1.analyzedAt;
    delete body2.analyzedAt;
    assert.deepEqual(body1, body2);
  });

  it('/doctor now returns 200 with a rootCauses field attached', async () => {
    const res = await postDoctor({ fountain: MULTI_SCENE_FOUNTAIN });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok('rootCauses' in body, 'expected /doctor report to carry rootCauses');
    assert.ok(Array.isArray(body.rootCauses));
    // Every existing field is still present — the enrichment is additive.
    assert.equal(body.sceneCount, 4);
    assert.equal(body.passes.length, 14);
  });
});
