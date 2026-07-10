// HTTP behavior for POST /api/scriptide/doctor/deep — the opt-in "deep read"
// sibling of /doctor. Mirrors tests/routes/scriptide-doctor.test.ts's fixture
// style and tests/routes/game-interview.test.ts's ai.ts provider-mock idiom
// (setLLMProvider/resetLLMProvider), applied to the deep-read seam instead.
//
// Two doctor.ts/deep-read.ts caches sit between these requests and the actual
// work: doctor.ts's report-level LRU (keyed on contentHash + storyContext +
// deepRead mode) and deep-read.ts's scene-level LRU (keyed on scene text +
// prompt version + model). Both are cleared before every test in this file
// so a mocked-provider run can never leak a cached "usedLLM: true" reading
// into the keyless tests (or vice versa) purely because of fixture reuse or
// test order — each test's assertions describe its OWN request, not
// whatever a previous test happened to cache.
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, type TestServer } from './helpers.ts';
import { setLLMProvider, resetLLMProvider } from '../../server/engine/ai.ts';
import { clearDoctorCache } from '../../server/nvm/analyze/doctor.ts';
import { clearDeepReadCache } from '../../server/nvm/analyze/deep-read.ts';
import { fountainToFdx } from '../../src/lib/fdx.ts';

// 4-scene fixture — same shape as scriptide-doctor.test.ts's (4 sluglines, 3
// speaking characters, dialogue and lexicon density in every scene) so this
// exercises the real 14-pass pipeline, not an all-zeros degenerate case.
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

const MULTI_SCENE_FDX = fountainToFdx(MULTI_SCENE_FOUNTAIN, 'The Long Wait');

// Valid annotations for every scene in MULTI_SCENE_FOUNTAIN (sceneIdx 0-3,
// matching fountain-analyzer.ts's 0-based scene numbering), satisfying
// deep-read.ts's RawAnnotationSchema exactly (.strict() — no extra fields).
const VALID_ANNOTATIONS = [
  { sceneIdx: 0, suspenseDelta: 2, curiosityDelta: 1, emotionalShift: 'negative', purpose: 'introduce_conflict', dramaticTurn: 'Jax and Mara wait tensely for a contact who is already late.', revelation: null },
  { sceneIdx: 1, suspenseDelta: 3, curiosityDelta: 2, emotionalShift: 'negative', purpose: 'raise_stakes', dramaticTurn: 'An unknown truck arrives outside.', revelation: null },
  { sceneIdx: 2, suspenseDelta: 4, curiosityDelta: 3, emotionalShift: 'negative', purpose: 'revelation', dramaticTurn: 'A stranger accuses Jax of lying to Mara.', revelation: 'Jax has been lying to Mara since the beginning.' },
  { sceneIdx: 3, suspenseDelta: 1, curiosityDelta: 0, emotionalShift: 'positive', purpose: 'resolution', dramaticTurn: 'Jax and Mara drive away together.', revelation: null },
];

describe('routes/scriptide/doctor/deep — HTTP behavior', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  // Belt-and-suspenders against cross-test cache bleed (see file-header note).
  beforeEach(() => {
    clearDoctorCache();
    clearDeepReadCache();
  });

  const postDeep = (body: unknown) => fetch(`${server.baseUrl}/api/scriptide/doctor/deep`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const postDoctor = (body: unknown) => fetch(`${server.baseUrl}/api/scriptide/doctor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  it('keyless: POST a valid fountain returns 200 with deepRead present, usedLLM false, and fallbackScenes covering every scene', async () => {
    const res = await postDeep({ fountain: MULTI_SCENE_FOUNTAIN });
    assert.equal(res.status, 200);
    const body = await res.json();

    assert.ok(body.deepRead, 'expected a deepRead field on a /doctor/deep response');
    assert.equal(body.deepRead.usedLLM, false);
    assert.equal(body.deepRead.scenesTotal, 4);
    assert.equal(body.deepRead.scenesRead, 0);
    assert.deepEqual(body.deepRead.fallbackScenes.slice().sort((a: number, b: number) => a - b), [0, 1, 2, 3]);

    // Still a complete, well-formed report otherwise — never a 500 for lack
    // of a key, and never a degraded/partial report shape either.
    assert.equal(body.passes.length, 14);
    assert.equal(body.sceneCount, 4);
    assert.ok(body.health >= 0 && body.health <= 100);
  });

  it('keyless: a deep report is deep-equal to the quick /doctor report for the same fountain, aside from analyzedAt and deepRead (full fallback ⇒ identical signals)', async () => {
    const [deepRes, quickRes] = await Promise.all([
      postDeep({ fountain: MULTI_SCENE_FOUNTAIN }),
      postDoctor({ fountain: MULTI_SCENE_FOUNTAIN }),
    ]);
    assert.equal(deepRes.status, 200);
    assert.equal(quickRes.status, 200);
    const deepBody = await deepRes.json();
    const quickBody = await quickRes.json();

    assert.ok(!('deepRead' in quickBody), 'quick /doctor must never carry a deepRead field');

    delete deepBody.analyzedAt;
    delete deepBody.deepRead;
    delete quickBody.analyzedAt;
    assert.deepEqual(deepBody, quickBody);
  });

  it('mocked provider (ai.ts seam): valid per-scene annotations yield 200 with usedLLM true and scenesRead > 0', async () => {
    setLLMProvider({
      generate: async () => ({ text: JSON.stringify(VALID_ANNOTATIONS) } as never),
    });
    try {
      const res = await postDeep({ fountain: MULTI_SCENE_FOUNTAIN });
      assert.equal(res.status, 200);
      const body = await res.json();

      assert.ok(body.deepRead);
      assert.equal(body.deepRead.usedLLM, true);
      assert.ok(body.deepRead.scenesRead > 0, `expected scenesRead > 0, got ${body.deepRead.scenesRead}`);
      assert.equal(body.deepRead.scenesRead, 4);
      assert.equal(body.deepRead.scenesTotal, 4);
      assert.deepEqual(body.deepRead.fallbackScenes, []);

      // Still a complete report — deep read changes signals, not report shape.
      assert.equal(body.passes.length, 14);
      assert.equal(body.sceneCount, 4);
    } finally {
      resetLLMProvider();
    }
  });

  it('POST a body with both fountain and fdx returns 400', async () => {
    const res = await postDeep({ fountain: MULTI_SCENE_FOUNTAIN, fdx: MULTI_SCENE_FDX });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /exactly one of fountain or fdx/);
  });

  it('POST a body with neither fountain nor fdx returns 400', async () => {
    const res = await postDeep({ title: 'Untitled' });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /exactly one of fountain or fdx/);
  });

  it('POST a valid Final Draft (.fdx) body returns 200 with source.format "fdx" and deepRead present', async () => {
    const res = await postDeep({ fdx: MULTI_SCENE_FDX });
    assert.equal(res.status, 200);
    const body = await res.json();

    assert.equal(body.source.format, 'fdx');
    assert.equal(typeof body.source.convertedFountain, 'string');
    assert.ok(body.source.convertedFountain.length > 0);
    assert.ok(body.deepRead, 'expected deepRead on the fdx submission path too');
    assert.equal(body.deepRead.scenesTotal, 4);
  });

  it('POST a malformed fdx (no <Paragraph> elements) returns 400', async () => {
    const res = await postDeep({ fdx: '<FinalDraft><Content></Content></FinalDraft>' });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(typeof body.error === 'string' && body.error.length > 0);
  });

  it('regression: quick /doctor still never carries a deepRead field', async () => {
    const res = await postDoctor({ fountain: MULTI_SCENE_FOUNTAIN });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(!('deepRead' in body), 'quick /doctor response must never include deepRead');
  });
});
