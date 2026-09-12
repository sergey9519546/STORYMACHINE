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
import { buildReaderTier } from '../../server/lib/reader-tier.ts';
import type { ArtifactClaims } from '../../server/lib/artifact-claims.ts';

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

function buildSceneTruncatedFountain(): string {
  return Array.from(
    { length: 1_001 },
    (_, index) => `INT. ROOM ${index} - DAY\n\nA person waits.`,
  ).join('\n\n');
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
    assert.equal(body.mismatchKind, 'content_mismatch');
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

  // #4: engine identity (provenance.engineCommit/rulebookCount) is checked
  // separately from content/score fields — a mismatch confined to it is
  // advisory ("the engine moved, re-run to confirm"), never a sign the
  // report was tampered with.
  it('engine identity differs while content and score match -> soft engine_mismatch, verified stays true', async () => {
    assert.ok(report.provenance, 'sanity: a non-degenerate report must carry provenance');

    const res = await post({
      fountain: MULTI_SCENE_FOUNTAIN,
      expected: {
        contentHash,
        health: report.health,
        verdict: report.verdict,
        totalIssues: report.totalIssues,
        engineCommit: `${report.provenance!.engineCommit}-a-different-build`,
        rulebookCount: report.provenance!.rulebookCount,
      },
    });
    assert.equal(res.status, 200);
    const body = await res.json();

    assert.equal(body.verified, true, 'content and score both check out; an engine-only difference must not flip verified false');
    assert.equal(body.mismatchKind, 'engine_mismatch');
    assert.match(body.message, /re-run/i);
    assert.equal(body.mismatches.length, 1);
    assert.equal(body.mismatches[0].field, 'engineCommit');
    assert.equal(body.mismatches[0].actual, report.provenance!.engineCommit);
    assert.equal(body.recomputed.engineCommit, report.provenance!.engineCommit);
    assert.equal(body.recomputed.rulebookCount, report.provenance!.rulebookCount);
  });

  it('rulebookCount alone differing is also classified as the soft engine_mismatch', async () => {
    const res = await post({
      fountain: MULTI_SCENE_FOUNTAIN,
      expected: { contentHash, rulebookCount: (report.provenance?.rulebookCount ?? 0) + 1 },
    });
    const body = await res.json();
    assert.equal(body.verified, true);
    assert.equal(body.mismatchKind, 'engine_mismatch');
  });

  it('a real score mismatch alongside an engine difference is still the hard score_mismatch, not engine_mismatch', async () => {
    const tamperedHealth = report.health > 50 ? 0 : 100;
    const res = await post({
      fountain: MULTI_SCENE_FOUNTAIN,
      expected: {
        contentHash,
        health: tamperedHealth,
        engineCommit: `${report.provenance?.engineCommit ?? ''}-a-different-build`,
      },
    });
    const body = await res.json();
    assert.equal(body.verified, false);
    assert.equal(body.mismatchKind, 'score_mismatch');
    assert.equal(body.message, undefined, 'the soft engine message must not appear alongside a hard mismatch');
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

  it('refuses to attest a score or verdict when recomputation covers only a scene-truncated prefix', async () => {
    const fountain = buildSceneTruncatedFountain();
    const res = await post({ fountain, expected: { contentHash: sha256(fountain) } });
    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.verified, false);
    assert.equal(body.error, 'analysis_incomplete');
    assert.match(body.message, /complete/i);
    assert.equal(body.recomputed, undefined);
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

  // Attack-lane audit follow-up (fdx-conversion bypass) — this route shares
  // export.ts's resolveFountainOrRespond() helper with breakdown and
  // pitchkit; see tests/routes/scriptide-doctor.test.ts's own copy of this
  // test for the full rationale. The shape guard must fire BEFORE the
  // contentHash comparison, so any well-formed (if wrong) hash proves the
  // point — this deliberately does not reuse the real `contentHash` fixture
  // above, since a real match would let the route reach its normal
  // doctor-verification path instead of the guard this test targets.
  it('POST an fdx whose converted Fountain has 1,600 distinct character cues is rejected fast, not analyzed', async () => {
    let fountain = 'INT. ROOM - DAY\n\n';
    for (let i = 0; i < 1600; i++) fountain += `CHARACTER${i}\nLine.\n\n`;
    const fdx = fountainToFdx(fountain, 'Pathological');

    const start = Date.now();
    const res = await post({ fdx, expected: { contentHash: 'a'.repeat(64) } });
    const ms = Date.now() - start;
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /more than 1500 distinct all-caps character-cue-shaped lines/);
    // 1000ms, not 100ms — see tests/routes/scriptide-doctor.test.ts's own
    // copy of this test for why (measured `npm test` full-suite contention).
    assert.ok(ms < 1000, `expected a fast rejection (<1000ms), took ${ms}ms — the fdx-path guard may not be firing`);
  });

  // ── Structural signals in `recomputed` (2026-09-04 honesty-matrix fix) ────
  // Same two document aggregates ScriptDoctorPanel.tsx's "Shape & Rhythm"
  // section and both coverage exports already show — recomputed here for
  // parity, but PURELY INFORMATIONAL: VerifyBodySchema carries no
  // `expected.structuralSignals` field at all, so a caller cannot even name
  // an expectation for it, and it can never enter `checked`/`mismatches` or
  // move `verified`.
  it('recomputed.structuralSignals mirrors report.structuralSignals exactly when the report carries a scored block', async () => {
    assert.ok(report.structuralSignals?.scored, 'sanity: the fixture must be non-degenerate enough to score structural signals');

    const res = await post({
      fountain: MULTI_SCENE_FOUNTAIN,
      expected: { contentHash, health: report.health, verdict: report.verdict, totalIssues: report.totalIssues },
    });
    const body = await res.json();

    assert.deepEqual(body.recomputed.structuralSignals, {
      meanAbsDialogueShareDelta: report.structuralSignals!.meanAbsDialogueShareDelta,
      actionSentenceCvOverall: report.structuralSignals!.actionSentenceCvOverall,
    });
  });

  it('an edited/tampered structuralSignals aggregate in `expected` does not affect verified, checked, or mismatches — the field cannot even be named', async () => {
    const res = await post({
      fountain: MULTI_SCENE_FOUNTAIN,
      expected: {
        contentHash,
        health: report.health,
        verdict: report.verdict,
        totalIssues: report.totalIssues,
        // Not part of VerifyExpectedSchema — zod strips it silently rather
        // than erroring, proving this can never become a checked field.
        structuralSignals: { meanAbsDialogueShareDelta: 999, actionSentenceCvOverall: -999 },
      },
    });
    assert.equal(res.status, 200);
    const body = await res.json();

    assert.equal(body.verified, true);
    assert.deepEqual(body.mismatches, []);
    assert.ok(!body.checked.includes('structuralSignals'), 'structuralSignals must never be a checked field');
    // recomputed still carries the ROUTE's own true reading, unaffected by
    // whatever bogus value was sent in `expected`.
    assert.deepEqual(body.recomputed.structuralSignals, {
      meanAbsDialogueShareDelta: report.structuralSignals!.meanAbsDialogueShareDelta,
      actionSentenceCvOverall: report.structuralSignals!.actionSentenceCvOverall,
    });
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

// P3 exit gate, end to end: "a third party can open a shared report and
// independently verify the score." The tests above prove the ROUTE honors a
// correct `expected`; this one proves the shared ARTIFACT actually hands a
// recipient a correct `expected` — the two halves are only a growth loop if
// they meet. Everything here is scraped out of the exported HTML, never read
// off the in-process report object, because that HTML file is all a third
// party ever has.
describe('routes/export — a shared report verifies from its own published claims', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); clearDoctorCache(); });
  after(async () => { await server.close(); });

  /** Pull the verify-block claims out of an exported report the same way a
   *  recipient reads them off the page. Returns raw strings — parsing them
   *  back into an `expected` payload is part of what's under test. */
  function scrapeVerifyClaims(html: string): Record<string, string> {
    const claims: Record<string, string> = {};
    const block = html.match(/<dl class="verify-claims">([\s\S]*?)<\/dl>/);
    assert.ok(block, 'the exported report must contain a verify-claims list');
    for (const [, term, value] of block[1].matchAll(/<dt>([^<]+)<\/dt><dd><code>([^<]*)<\/code><\/dd>/g)) {
      claims[term] = value;
    }
    return claims;
  }

  it('an exported report verifies against the original script using only the values it printed', async () => {
    const exportRes = await fetch(`${server.baseUrl}/api/export/coverage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fountain: MULTI_SCENE_FOUNTAIN, title: 'The Warehouse' }),
    });
    assert.equal(exportRes.status, 200);
    const html = await exportRes.text();

    const claims = scrapeVerifyClaims(html);
    const publishedHash = claims['Script-text hash (SHA-256, full)'];
    assert.ok(publishedHash, 'the report must publish a script-text hash');
    assert.match(publishedHash, /^[0-9a-f]{64}$/, 'the published hash must be the full digest a recipient can use');
    assert.equal(publishedHash, sha256(MULTI_SCENE_FOUNTAIN), 'it must be the hash of the script that was analyzed');

    const verifyRes = await fetch(`${server.baseUrl}/api/export/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fountain: MULTI_SCENE_FOUNTAIN,
        expected: {
          contentHash: publishedHash,
          health: Number(claims['Health']),
          verdict: claims['Verdict'],
          totalIssues: Number(claims['Total issues']),
        },
      }),
    });
    assert.equal(verifyRes.status, 200);
    const body = await verifyRes.json();

    assert.equal(body.verified, true,
      `a freshly exported report must verify against its own script; mismatches: ${JSON.stringify(body.mismatches)}`);
    assert.deepEqual([...body.checked].sort(), ['contentHash', 'health', 'totalIssues', 'verdict']);
  });

  it('a tampered health figure fails verification while the hash still matches', async () => {
    // The forgery this whole mechanism exists to catch: someone edits the
    // score in the HTML before forwarding it. The script text is untouched,
    // so the hash still checks out — only re-running the analysis exposes it.
    const exportRes = await fetch(`${server.baseUrl}/api/export/coverage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fountain: MULTI_SCENE_FOUNTAIN, title: 'The Warehouse' }),
    });
    const claims = scrapeVerifyClaims(await exportRes.text());
    const realHealth = Number(claims['Health']);

    const verifyRes = await fetch(`${server.baseUrl}/api/export/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fountain: MULTI_SCENE_FOUNTAIN,
        expected: {
          contentHash: claims['Script-text hash (SHA-256, full)'],
          health: Math.min(100, realHealth + 20), // the inflated claim
        },
      }),
    });
    const body = await verifyRes.json();

    assert.equal(body.verified, false, 'an inflated score must not pass verification');
    const healthMismatch = body.mismatches.find((m: { field: string }) => m.field === 'health');
    assert.ok(healthMismatch, 'the health mismatch must be named explicitly');
    assert.equal(healthMismatch.actual, realHealth, 'the recipient must be told the real number');
  });

  it('a report paired with a different script fails on the hash alone', async () => {
    // The other forgery: a genuine strong report forwarded as if it were
    // coverage of a different (weaker) script.
    const exportRes = await fetch(`${server.baseUrl}/api/export/coverage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fountain: MULTI_SCENE_FOUNTAIN, title: 'The Warehouse' }),
    });
    const claims = scrapeVerifyClaims(await exportRes.text());

    const verifyRes = await fetch(`${server.baseUrl}/api/export/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fountain: `${MULTI_SCENE_FOUNTAIN}\n\nINT. SOMEWHERE ELSE - DAY\n\nA scene that was never analyzed.\n`,
        expected: { contentHash: claims['Script-text hash (SHA-256, full)'] },
      }),
    });
    const body = await verifyRes.json();

    assert.equal(body.verified, false);
    assert.ok(body.mismatches.some((m: { field: string }) => m.field === 'contentHash'));
  });
});

// ── The producer tier's claims, through the ROUTE (2026-09-12, BUG-1) ────────
// docs/audits/2026-09-12-adversarial/server-data-tests.md: the tier states a
// scene count, a word count, a page/minute estimate, a priorities count, a
// percentile reading, the reference bounds, a logline state and a page reference
// per finding — and `VerifyExpectedSchema` had no FIELD for any of them, so this
// route could not check them even if a caller asked. These cases are the route
// half of that fix: the claims an exported report publishes all reach the
// comparator, every one of them can fail, and the page references are re-resolved
// through the paginator rather than taken on trust.
describe('routes/export — POST /api/export/verify checks every claim the producer tier publishes', async () => {
  let server: TestServer;
  let report: Awaited<ReturnType<typeof runScriptDoctor>>;
  let contentHash: string;
  let claims: ArtifactClaims;

  before(async () => {
    server = await startTestServer();
    clearDoctorCache();
    report = await runScriptDoctor(MULTI_SCENE_FOUNTAIN);
    contentHash = sha256(MULTI_SCENE_FOUNTAIN);
    // The exact claim set a genuine export of this script publishes.
    claims = buildReaderTier(report, { fountain: MULTI_SCENE_FOUNTAIN }).claims;
  });
  after(async () => { await server.close(); });

  function post(body: unknown) {
    return fetch(`${server.baseUrl}/api/export/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  /** Every tier claim, as a route caller would send them. */
  function tierExpected(over: Record<string, unknown> = {}) {
    return {
      contentHash,
      sceneCount: claims.sceneCount,
      wordCount: claims.wordCount,
      estimatedPages: claims.estimatedPages,
      estimatedRuntimeMinutes: claims.estimatedRuntimeMinutes,
      prioritiesListed: claims.prioritiesListed,
      percentileReading: claims.percentileReading,
      referenceBounds: claims.referenceBounds,
      loglineState: claims.loglineState,
      pageRefs: claims.pageRefs,
      ...over,
    };
  }

  it('a genuine claim set verifies, and every tier field is named in `checked`', async () => {
    const res = await post({ fountain: MULTI_SCENE_FOUNTAIN, expected: tierExpected() });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.verified, true, `mismatches: ${JSON.stringify(body.mismatches)}`);
    for (const field of [
      'sceneCount', 'wordCount', 'estimatedPages', 'estimatedRuntimeMinutes',
      'prioritiesListed', 'percentileReading', 'referenceBounds', 'loglineState', 'pageRefs',
    ]) {
      assert.ok(body.checked.includes(field), `${field} must be a checked field`);
    }
  });

  it('`recomputed` reports the engine’s own reading of every tier claim, whether or not the caller claimed it', async () => {
    const res = await post({ fountain: MULTI_SCENE_FOUNTAIN, expected: { contentHash } });
    const body = await res.json();
    assert.equal(body.verified, true);
    assert.equal(body.recomputed.sceneCount, claims.sceneCount);
    assert.equal(body.recomputed.wordCount, claims.wordCount);
    assert.equal(body.recomputed.prioritiesListed, claims.prioritiesListed);
    assert.equal(body.recomputed.referenceBounds, claims.referenceBounds);
    assert.equal(body.recomputed.loglineState, claims.loglineState);
    assert.deepEqual(body.recomputed.pageRefs, claims.pageRefs);
    // Reported but NOT checked, because the caller named none of them.
    assert.ok(!body.checked.includes('sceneCount'));
  });

  for (const [field, forged] of [
    ['sceneCount', 9999],
    ['wordCount', 999_999],
    ['estimatedPages', 500],
    ['estimatedRuntimeMinutes', 500],
    ['prioritiesListed', 9],
    ['percentileReading', 'top 10%'],
    ['referenceBounds', '200 samples / 9–10 scenes / 256–337 words'],
    ['loglineState', 'not derived'],
  ] as Array<[string, unknown]>) {
    it(`a forged ${field} is a hard mismatch naming ${field}, never an engine advisory`, async () => {
      const res = await post({ fountain: MULTI_SCENE_FOUNTAIN, expected: tierExpected({ [field]: forged }) });
      const body = await res.json();
      assert.equal(body.verified, false, `${field} must be able to fail verification`);
      assert.equal(body.mismatchKind, 'score_mismatch',
        'a tier claim is a content claim, not an engine-identity one');
      assert.ok(body.mismatches.some((m: { field: string }) => m.field === field),
        `mismatches must name ${field}: ${JSON.stringify(body.mismatches)}`);
    });
  }

  it('a forged page reference fails and names WHICH finding points at the wrong page', async () => {
    const forgedRefs = (claims.pageRefs ?? []).map((r, i) => (i === 0 ? { ...r, page: 999 } : r));
    const res = await post({ fountain: MULTI_SCENE_FOUNTAIN, expected: tierExpected({ pageRefs: forgedRefs }) });
    const body = await res.json();
    assert.equal(body.verified, false);
    const mismatch = body.mismatches.find((m: { field: string }) => m.field === 'pageRefs');
    assert.ok(mismatch, `mismatches must name pageRefs: ${JSON.stringify(body.mismatches)}`);
    assert.match(mismatch.detail, /reference 1 \(.+\) points at p\. 999 in this report and/);
  });

  it('a page-reference list with a finding deleted fails on its length, not silently on the entries that remain', async () => {
    const res = await post({
      fountain: MULTI_SCENE_FOUNTAIN,
      expected: tierExpected({ pageRefs: (claims.pageRefs ?? []).slice(0, 1) }),
    });
    const body = await res.json();
    assert.equal(body.verified, false);
    const mismatch = body.mismatches.find((m: { field: string }) => m.field === 'pageRefs');
    assert.match(mismatch.detail, /claims 1 page reference, the engine resolves 3/);
  });

  it('a page reference attributed to the wrong rule fails even when the page number is right', async () => {
    const swapped = (claims.pageRefs ?? []).map((r, i) => (i === 0 ? { ...r, rule: 'SOME_OTHER_RULE' } : r));
    const res = await post({ fountain: MULTI_SCENE_FOUNTAIN, expected: tierExpected({ pageRefs: swapped }) });
    const body = await res.json();
    assert.equal(body.verified, false);
    const mismatch = body.mismatches.find((m: { field: string }) => m.field === 'pageRefs');
    assert.match(mismatch.detail, /names rule SOME_OTHER_RULE in this report/);
  });

  // The zod wall in front of the comparator — the 2026-09-06 NaN finding, re-run
  // for every field added on 2026-09-12. A claim that cannot be compared must be a
  // 400, never a silent pass: `Math.abs(NaN - x) > tolerance` is false.
  for (const field of ['sceneCount', 'wordCount', 'estimatedPages', 'estimatedRuntimeMinutes', 'prioritiesListed']) {
    for (const [label, value] of [
      ['a non-numeric string', 'OUTSTANDING'],
      ['null (JSON has no NaN)', null],
      ['a negative', -1],
      ['a float', 6.5],
      ['an empty string', ''],
    ] as Array<[string, unknown]>) {
      it(`${field} = ${label} is rejected with 400 before the comparator runs`, async () => {
        const res = await post({ fountain: MULTI_SCENE_FOUNTAIN, expected: { contentHash, [field]: value } });
        assert.equal(res.status, 400, `${field} = ${String(value)} must not reach the comparator`);
      });
    }
  }

  it('a percentileReading that is not a band or "not comparable" is rejected with 400', async () => {
    for (const bad of ['', 'middle 50%', 'not-comparable', 'EXCELLENT']) {
      const res = await post({ fountain: MULTI_SCENE_FOUNTAIN, expected: { contentHash, percentileReading: bad } });
      assert.equal(res.status, 400, JSON.stringify(bad));
    }
  });

  it('a malformed pageRefs entry is rejected with 400 rather than partially checked', async () => {
    const bads: unknown[] = [
      'p. 999',
      [{ ordinal: 1, rule: 'X' }],
      [{ ordinal: 0, rule: 'X', page: 1 }],
      [{ ordinal: 1, rule: 'X', page: 0 }],
      [{ ordinal: 1, rule: 'X', page: 1, extra: 'x' }],
    ];
    for (const bad of bads) {
      const res = await post({ fountain: MULTI_SCENE_FOUNTAIN, expected: { contentHash, pageRefs: bad } });
      assert.equal(res.status, 400, JSON.stringify(bad));
    }
  });
});
