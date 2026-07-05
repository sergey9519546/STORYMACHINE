// POST /api/export/verify — the determinism-badge verify endpoint (Run 15,
// ROADMAP §11). Conventions: node:test + assert/strict + startTestServer,
// matching tests/routes/export-coverage.test.ts's harness and fixture style.
//
// Expected report numbers are computed by calling runScriptDoctor directly
// (the same pure function the route itself calls) rather than hand-guessing
// them — this file asserts the ROUTE's contract (hash-first short-circuit,
// checked/mismatches bookkeeping, tolerance, exactly-one-of validation,
// determinism), not the doctor's own scoring, which is covered elsewhere
// (tests/core/script-doctor.test.ts).
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { startTestServer, type TestServer } from './helpers.ts';
import { fountainToFdx } from '../../src/lib/fdx.ts';
import { fdxToFountain } from '../../server/lib/fdx-import.ts';
import { runScriptDoctor, clearDoctorCache } from '../../server/nvm/analyze/doctor.ts';

// Same fixture as tests/routes/export-coverage.test.ts: enough scenes/
// dialogue/characters for the 14 revision passes to have real material, so
// this exercises a non-degenerate report end to end (verdict/dimensions/
// healthPercentile all populated, per ScriptDoctorReport's own doc comment).
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

function sha256(text: string): string {
  return createHash('sha256').update(text.trim()).digest('hex');
}

describe('routes/export/verify — HTTP behavior', async () => {
  let server: TestServer;
  const contentHash = sha256(MULTI_SCENE_FOUNTAIN);
  let report: Awaited<ReturnType<typeof runScriptDoctor>>;

  // fdx round-trips through fountainToFdx -> fdxToFountain, which does not
  // necessarily reproduce MULTI_SCENE_FOUNTAIN byte-for-byte (whitespace/
  // formatting normalization) — the fdx path's own expected values must be
  // computed against the ACTUAL converted text, not the original fixture.
  const convertedFromFdx = fdxToFountain(MULTI_SCENE_FDX).fountain;
  const fdxContentHash = sha256(convertedFromFdx);
  let fdxReport: Awaited<ReturnType<typeof runScriptDoctor>>;

  before(async () => {
    server = await startTestServer();
    clearDoctorCache();
    report = await runScriptDoctor(MULTI_SCENE_FOUNTAIN);
    fdxReport = await runScriptDoctor(convertedFromFdx);
  });
  after(async () => { await server.close(); });

  const post = (body: unknown) => fetch(`${server.baseUrl}/api/export/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  it('matching everything -> verified true, checked lists every provided field', async () => {
    const expected: Record<string, unknown> = {
      contentHash,
      health: report.health,
      verdict: report.verdict,
      totalIssues: report.totalIssues,
    };
    if (report.healthPercentile !== undefined) expected.healthPercentile = report.healthPercentile;

    const res = await post({ fountain: MULTI_SCENE_FOUNTAIN, expected });
    assert.equal(res.status, 200);
    const body = await res.json();

    assert.equal(body.verified, true);
    assert.deepEqual(body.mismatches, []);
    assert.deepEqual(new Set(body.checked), new Set(Object.keys(expected)));
    assert.equal(body.recomputed.contentHash, contentHash);
    assert.equal(body.recomputed.health, report.health);
    assert.equal(body.recomputed.verdict, report.verdict);
    assert.equal(body.recomputed.totalIssues, report.totalIssues);
    assert.ok(typeof body.verifiedAt === 'number');
  });

  it('tampered health -> verified false with the single mismatch named, other fields stay checked and clean', async () => {
    // Guaranteed far outside VERIFY_FLOAT_TOLERANCE (0.05) and still within
    // the [0,100] schema bound regardless of report.health's real value.
    const tamperedHealth = report.health > 50 ? 0 : 100;

    const res = await post({
      fountain: MULTI_SCENE_FOUNTAIN,
      expected: {
        contentHash,
        health: tamperedHealth,
        verdict: report.verdict,
        totalIssues: report.totalIssues,
      },
    });
    assert.equal(res.status, 200);
    const body = await res.json();

    assert.equal(body.verified, false);
    assert.deepEqual(new Set(body.checked), new Set(['contentHash', 'health', 'verdict', 'totalIssues']));
    assert.equal(body.mismatches.length, 1);
    assert.equal(body.mismatches[0].field, 'health');
    assert.equal(body.mismatches[0].expected, tamperedHealth);
    assert.equal(body.mismatches[0].actual, report.health);
    // The untampered fields must not show up as mismatches even though they
    // were compared.
    assert.ok(!body.mismatches.some((m: { field: string }) => m.field === 'verdict'));
    assert.ok(!body.mismatches.some((m: { field: string }) => m.field === 'totalIssues'));
  });

  it('wrong contentHash -> verified false, hash mismatch named, doctor NOT re-run', async () => {
    const wrongHash = contentHash.slice(0, -1) + (contentHash.endsWith('0') ? '1' : '0');

    const res = await post({
      fountain: MULTI_SCENE_FOUNTAIN,
      expected: { contentHash: wrongHash, health: report.health, totalIssues: report.totalIssues },
    });
    assert.equal(res.status, 200);
    const body = await res.json();

    assert.equal(body.verified, false);
    assert.deepEqual(body.checked, ['contentHash']);
    assert.equal(body.mismatches.length, 1);
    assert.equal(body.mismatches[0].field, 'contentHash');
    assert.equal(body.mismatches[0].expected, wrongHash);
    assert.equal(body.mismatches[0].actual, contentHash);
    // Honest signal that the doctor never ran on this path: `recomputed`
    // carries only the contentHash it just computed, none of the report
    // fields (health/verdict/totalIssues/healthPercentile) that would only
    // exist once runScriptDoctor had actually been called.
    assert.deepEqual(Object.keys(body.recomputed), ['contentHash']);
  });

  it('fdx path: matching everything against the fdx-converted text -> verified true', async () => {
    const res = await post({
      fdx: MULTI_SCENE_FDX,
      expected: {
        contentHash: fdxContentHash,
        health: fdxReport.health,
        verdict: fdxReport.verdict,
        totalIssues: fdxReport.totalIssues,
      },
    });
    assert.equal(res.status, 200);
    const body = await res.json();

    assert.equal(body.verified, true);
    assert.deepEqual(body.mismatches, []);
    assert.equal(body.recomputed.contentHash, fdxContentHash);
  });

  it('missing expected.contentHash -> 400', async () => {
    const res = await post({ fountain: MULTI_SCENE_FOUNTAIN, expected: { health: 50 } });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(typeof body.error === 'string' && body.error.length > 0);
  });

  it('both fountain and fdx -> 400 (exactly-one)', async () => {
    const res = await post({
      fountain: MULTI_SCENE_FOUNTAIN,
      fdx: MULTI_SCENE_FDX,
      expected: { contentHash },
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /exactly one of fountain or fdx/);
  });

  it('neither fountain nor fdx -> 400 (exactly-one)', async () => {
    const res = await post({ expected: { contentHash } });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /exactly one of fountain or fdx/);
  });

  it('is deterministic: verifying twice yields identical bodies apart from verifiedAt', async () => {
    const expected = { contentHash, health: report.health, verdict: report.verdict, totalIssues: report.totalIssues };

    const [res1, res2] = await Promise.all([
      post({ fountain: MULTI_SCENE_FOUNTAIN, expected }),
      post({ fountain: MULTI_SCENE_FOUNTAIN, expected }),
    ]);
    const [body1, body2] = await Promise.all([res1.json(), res2.json()]);

    const { verifiedAt: _v1, ...rest1 } = body1;
    const { verifiedAt: _v2, ...rest2 } = body2;
    assert.deepEqual(rest1, rest2);
  });
});
