import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, type TestServer } from './helpers.ts';
import { fountainToFdx } from '../../src/lib/fdx.ts';
import { shutdownDoctorPool, doctorPoolStatus } from '../../server/nvm/analyze/doctor-pool.ts';

// Same multi-scene fixture shape as tests/routes/scriptide-doctor.test.ts —
// non-degenerate enough to exercise real signal extraction and produce 14
// non-trivial pass results.
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

/** A script large enough that its analysis stays in flight long enough for a
 *  cancel test to land mid-run without being racy. */
function bigScript(sceneCount: number): string {
  const parts: string[] = [];
  for (let i = 0; i < sceneCount; i++) {
    parts.push(
      `INT. LOCATION ${i} - ${i % 2 === 0 ? 'DAY' : 'NIGHT'}`,
      '',
      `A room that has seen better days. ${'Dust settles on the windowsill. '.repeat(3)}`,
      '',
      i % 3 === 0 ? 'MARA' : 'DEL',
      `Someone has to say it. Nobody wants to be the one who says it in room ${i}.`,
      '',
      'She turns away, hands shaking, and does not answer.',
      '',
    );
  }
  return parts.join('\n');
}

/** SSE frames are "\n\n"-terminated, "data: <json>" lines — parses every
 *  frame in a response body as it streams in. */
async function collectSSE(res: Response): Promise<Array<Record<string, unknown>>> {
  const frames: Array<Record<string, unknown>> = [];
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let boundary: number;
    while ((boundary = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const line = frame.split('\n').find(l => l.startsWith('data: '));
      if (line) frames.push(JSON.parse(line.slice(6)));
    }
  }
  return frames;
}

describe('routes/scriptide/doctor/stream — SSE behavior', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); await shutdownDoctorPool(); });

  const postStream = (body: unknown, signal?: AbortSignal) => fetch(`${server.baseUrl}/api/scriptide/doctor/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  it('streams stage + pass_complete progress events, then one doctor_result with a well-formed report', async () => {
    const res = await postStream({ fountain: MULTI_SCENE_FOUNTAIN });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') ?? '', /text\/event-stream/);

    const frames = await collectSSE(res);
    const progressFrames = frames.filter(f => f.type === 'doctor_progress');
    const resultFrames = frames.filter(f => f.type === 'doctor_result');
    const errorFrames = frames.filter(f => f.type === 'doctor_error');

    assert.deepEqual(errorFrames, []);
    assert.equal(resultFrames.length, 1);
    assert.ok(progressFrames.length > 0, 'expected at least one progress frame');

    const progressEvents = progressFrames.map(f => f.event as Record<string, unknown>);
    const stageNames = progressEvents.filter(e => e.type === 'stage').map(e => e.stage);
    assert.ok(stageNames.includes('parsing'));
    assert.ok(stageNames.includes('passes_start'));
    assert.ok(stageNames.includes('aggregating'));

    const passCompletes = progressEvents.filter(e => e.type === 'pass_complete');
    assert.equal(passCompletes.length, 14, 'expected one pass_complete event per revision pass');

    const report = resultFrames[0]!.report as Record<string, unknown>;
    assert.equal((report.passes as unknown[]).length, 14);
    assert.equal(typeof report.health, 'number');
    assert.ok(Array.isArray(report.rootCauses));
    assert.deepEqual((report.source as Record<string, unknown>).format, 'fountain');
  });

  it('matches the non-streaming /doctor route’s final report, minus analyzedAt', async () => {
    const plainRes = await fetch(`${server.baseUrl}/api/scriptide/doctor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fountain: MULTI_SCENE_FOUNTAIN }),
    });
    const plain = await plainRes.json() as Record<string, unknown>;

    const streamedRes = await postStream({ fountain: MULTI_SCENE_FOUNTAIN });
    const frames = await collectSSE(streamedRes);
    const streamed = (frames.find(f => f.type === 'doctor_result') as { report: Record<string, unknown> }).report;

    delete plain.analyzedAt;
    delete streamed.analyzedAt;
    assert.deepEqual(streamed, plain);
  });

  it('accepts an fdx body with the same two-format contract as /doctor', async () => {
    const res = await postStream({ fdx: MULTI_SCENE_FDX });
    assert.equal(res.status, 200);
    const frames = await collectSSE(res);
    const result = frames.find(f => f.type === 'doctor_result') as { report: Record<string, unknown> } | undefined;
    assert.ok(result, 'expected a doctor_result frame');
    assert.equal((result.report.source as Record<string, unknown>).format, 'fdx');
    assert.equal((result.report.passes as unknown[]).length, 14);
  });

  it('rejects an invalid body (neither fountain nor fdx) with 400, before any streaming starts', async () => {
    const res = await postStream({ title: 'Untitled' });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /exactly one of fountain or fdx/);
  });

  it('emits a doctor_error frame (not a 500) for a malformed fdx body', async () => {
    const res = await postStream({ fdx: '<FinalDraft><Content></Content></FinalDraft>' });
    // The malformed-fdx guard runs before headers are sent no differently
    // than the fountain path — assert whichever shape this route settled on
    // rather than assuming: either a clean 400 (validation-style) or a
    // 200 + doctor_error SSE frame (stream-already-opened style) is honest;
    // a raw 500 is not.
    if (res.status === 200) {
      const frames = await collectSSE(res);
      assert.ok(frames.some(f => f.type === 'doctor_error'));
    } else {
      assert.equal(res.status, 400);
    }
  });

  // Attack-lane audit follow-up (fdx-conversion bypass) — see
  // scriptide-doctor.test.ts's own copy of this test for the full rationale.
  // This route answers with an SSE doctor_error frame rather than a plain
  // 400 (rejectPathologicalConvertedFountain writes a real HTTP 400, which
  // this route never sends once the SSE stream has opened — see the route's
  // own comment in server/routes/scriptide.ts), so this asserts that frame
  // shape instead of res.status.
  it('emits a doctor_error frame fast, not analyzed, for an fdx whose converted Fountain has 1,600 distinct character cues', async () => {
    let fountain = 'INT. ROOM - DAY\n\n';
    for (let i = 0; i < 1600; i++) fountain += `CHARACTER${i}\nLine.\n\n`;
    const fdx = fountainToFdx(fountain, 'Pathological');

    const start = Date.now();
    const res = await postStream({ fdx });
    const frames = await collectSSE(res);
    const ms = Date.now() - start;

    const errorFrame = frames.find(f => f.type === 'doctor_error') as { error: string } | undefined;
    assert.ok(errorFrame, 'expected a doctor_error frame');
    assert.match(errorFrame.error, /more than 1500 distinct all-caps character-cue-shaped lines/);
    assert.equal(frames.some(f => f.type === 'doctor_result'), false, 'must not have gone on to analyze it');
    // 1000ms, not 100ms — see tests/routes/scriptide-doctor.test.ts's own
    // copy of this test for why (measured `npm test` full-suite contention).
    assert.ok(ms < 1000, `expected a fast rejection (<1000ms), took ${ms}ms — the fdx-path guard may not be firing`);
  });

  it('really cancels the server-side analysis on client abort, and the server stays healthy immediately after', async () => {
    const controller = new AbortController();
    const res = await postStream({ fountain: bigScript(220) }, controller.signal);
    assert.equal(res.status, 200);

    const reader = res.body!.getReader();
    // Read until at least one real progress frame arrives — proves the
    // analysis is genuinely running server-side before we cancel it.
    const decoder = new TextDecoder();
    let buffer = '';
    let sawProgress = false;
    for (let i = 0; i < 50 && !sawProgress; i++) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      if (buffer.includes('"type":"doctor_progress"')) sawProgress = true;
    }
    assert.ok(sawProgress, 'expected at least one progress frame before cancelling');

    controller.abort();
    await assert.rejects(reader.read());

    // Give the pool a moment to process the terminate.
    await new Promise(resolve => setTimeout(resolve, 100));
    if (!doctorPoolStatus().disabled) {
      assert.equal(doctorPoolStatus().queued, 0, 'a cancelled job must not remain queued');
    }

    // The server must be immediately responsive to a fresh, unrelated request.
    const health = await fetch(`${server.baseUrl}/health`);
    assert.equal(health.status, 200);

    const followUp = await fetch(`${server.baseUrl}/api/scriptide/doctor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fountain: MULTI_SCENE_FOUNTAIN }),
    });
    assert.equal(followUp.status, 200);
    const followUpBody = await followUp.json();
    assert.equal(followUpBody.sceneCount, 4);
  });
});
