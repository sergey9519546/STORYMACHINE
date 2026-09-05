// Format short-circuit parity between POST /api/scriptide/doctor and
// POST /api/scriptide/fix's writer-supplied-candidate path (2026-09-05
// review finding D1).
//
// POST /doctor and /doctor/stream both refuse non-screenplay prose with
// `formatUnrecognized` BEFORE the doctor ever runs (scriptide.ts's own
// `hasSceneHeading` guard) — but /fix's writer path (candidateFountain)
// ran the doctor on BOTH `fountain` and `candidateFountain` unconditionally,
// so text /doctor refuses to score got a full `health: 0, verdict: 'PASS'`
// receipt here instead. server/nvm/analyze/fix-delta.ts's own header states
// the receipt's whole warrant as "POST either text to /doctor and the
// numbers must match byte for byte" — a candidate (or a base) with no scene
// heading was a two-request falsification of that sentence, and when BOTH
// sides were unscorable the receipt read as "your rewrite changed nothing"
// (PASS -> PASS, 0 cleared, 0 introduced) when in fact nothing was ever
// analyzed.
//
// Fixed by applying the SAME hasSceneHeading short-circuit /doctor uses to
// BOTH fields in the writer path, before either baseline or candidate
// analysis runs, returning the same `formatUnrecognized`/`reason`/`hint`
// shape /doctor returns plus `comparable: false` — the receipt-level signal
// a renderer needs to tell this apart from a genuine health/verdict delta.
//
// A SEPARATE file from tests/routes/scriptide-fix.test.ts deliberately: that
// file already runs 18-19 requests against /api/scriptide/fix's aiLimiter
// (20/min, shared across every test in one file since Node's test runner
// gives each FILE its own process — server/lib/session-store.ts's aiLimiter
// is an in-memory store scoped to that process) — adding these five more
// requests to that file tips it over the limit and turns unrelated
// low-numbered tests into 429s. A fresh file gets a fresh limiter budget.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, type TestServer } from './helpers.ts';

// Same scene-truncation fixture tests/routes/scriptide-doctor.test.ts and the
// other export-route tests build (ANALYZER_SCENE_CEILING = 400,
// server/nvm/analyze/fountain-analyzer.ts) — cheap per-scene text, so 1,001
// tiny scenes trip truncatedForAnalysis without a slow analysis.
function buildSceneTruncatedFountain(): string {
  return Array.from(
    { length: 1_001 },
    (_, index) => `INT. ROOM ${index} - DAY\n\nA person waits.`,
  ).join('\n\n');
}

const FOUNTAIN = `INT. OFFICE - DAY

JAX
Where is she?

MARA
I don't know.
`;

const UNRECOGNIZABLE_PROSE =
  'This is just an ordinary paragraph of prose. It has no scene headings '
  + 'at all, no INT. or EXT., nothing that looks like a screenplay slugline. '
  + 'It reads like a short story or an essay instead.';

describe('POST /api/scriptide/fix (writer path) vs POST /api/scriptide/doctor — format-unrecognized parity', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  const postFix = (body: unknown) => fetch(`${server.baseUrl}/api/scriptide/fix`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const postDoctor = (body: unknown) => fetch(`${server.baseUrl}/api/scriptide/doctor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  it('candidateFountain has no scene heading: /fix answers formatUnrecognized, matching /doctor on the same text', async () => {
    const doctorRes = await postDoctor({ fountain: UNRECOGNIZABLE_PROSE });
    const doctorBody = await doctorRes.json();
    assert.equal(doctorBody.formatUnrecognized, true, 'sanity: /doctor must refuse this text for the parity check to mean anything');

    const res = await postFix({ fountain: FOUNTAIN, candidateFountain: UNRECOGNIZABLE_PROSE });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.formatUnrecognized, true);
    assert.equal(body.comparable, false, 'a formatUnrecognized receipt is not a real before/after delta');
    assert.equal(body.field, 'candidateFountain');
    assert.equal(body.reason, doctorBody.reason);
    assert.equal(body.hint, doctorBody.hint);
    // No score of any kind must leak out — the exact defect (health: 0,
    // verdict: 'PASS' for unscorable text) this short-circuit exists to close.
    assert.equal('health' in body, false);
    assert.equal('verdict' in body, false);
    assert.equal('before' in body, false);
    assert.equal('after' in body, false);
    assert.equal('cleared' in body, false);
    assert.equal('introduced' in body, false);
  });

  it('base fountain has no scene heading: /fix answers formatUnrecognized for the base field', async () => {
    const res = await postFix({ fountain: UNRECOGNIZABLE_PROSE, candidateFountain: FOUNTAIN });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.formatUnrecognized, true);
    assert.equal(body.comparable, false);
    assert.equal(body.field, 'fountain');
  });

  it('both sides unrecognizable: /fix answers formatUnrecognized rather than a false "nothing changed" PASS-to-PASS receipt', async () => {
    const res = await postFix({
      fountain: UNRECOGNIZABLE_PROSE,
      candidateFountain: `${UNRECOGNIZABLE_PROSE} A bit different.`,
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.formatUnrecognized, true);
    assert.equal(body.comparable, false);
    // The base is checked first (POST order) — the field named is the base's.
    assert.equal(body.field, 'fountain');
    assert.equal('before' in body, false);
    assert.equal('after' in body, false);
  });

  it('a whitespace-only candidate is NOT treated as unrecognizable prose (matches /doctor\'s own degenerate-report path, not this short-circuit)', async () => {
    // hasSceneHeading's short-circuit deliberately excludes blank/whitespace
    // input — see scriptide.ts's own comment on the /doctor route's
    // short-circuit. A whitespace-only candidate must still reach the
    // ordinary path, not the formatUnrecognized one.
    const res = await postFix({ fountain: FOUNTAIN, candidateFountain: '   \n\n  ' });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal('formatUnrecognized' in body, false);
  });

  it('a real candidate with real scene headings is unaffected (no false positive on the short-circuit)', async () => {
    const res = await postFix({ fountain: FOUNTAIN, candidateFountain: FOUNTAIN });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal('formatUnrecognized' in body, false);
    assert.equal(typeof body.before.health, 'number');
    assert.equal(typeof body.after.health, 'number');
    // 2026-09-05 review finding D4 — a byte-identical candidate is the
    // simplest case of "no measured difference": identicalAnalysis must be
    // true whenever the hashes already agree (see the next test for the
    // OTHER way this can be true: matching health/verdict/issues despite
    // DIFFERENT hashes).
    assert.equal(body.identicalAnalysis, true);
    assert.equal(body.before.contentHash, body.after.contentHash);
  });

  // 2026-09-05 review finding D4 — computeContentHash is a whole-document
  // `trim()`-only digest, while normalizeScreenplay strips PER-LINE trailing
  // whitespace before anything reads the text. A candidate that only adds
  // trailing spaces to every line therefore analyzes identically (same
  // health, same verdict, same issue set) while its contentHash differs from
  // the baseline's — presenting `before.contentHash !== after.contentHash`
  // alone would read as "these documents differ" when analytically they do
  // not. `identicalAnalysis` is the fix: true here even though the hashes
  // disagree, because cleared/introduced are both empty and health matches.
  it('a candidate that differs from the baseline only by trailing whitespace on each line reports identicalAnalysis: true despite different contentHashes', async () => {
    const candidateFountain = FOUNTAIN.split('\n').map((line) => (line.length > 0 ? `${line}  ` : line)).join('\n');
    const res = await postFix({ fountain: FOUNTAIN, candidateFountain });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal('formatUnrecognized' in body, false);
    assert.equal(body.before.health, body.after.health);
    assert.deepEqual(body.cleared, []);
    assert.deepEqual(body.introduced, []);
    assert.notEqual(body.before.contentHash, body.after.contentHash, 'sanity: computeContentHash must actually disagree here for this to be a real test of identicalAnalysis, not a tautology');
    assert.equal(body.identicalAnalysis, true, 'the receipt must say "no measured difference" rather than implying one from mismatched hashes alone');
  });
});

// ── D3 (2026-09-05 review finding D3): FixBodySchema's refinement used to
// accept "at least one complete shape", so a body carrying BOTH a writer's
// candidateFountain AND a generation request's span/issues silently took the
// writer path — span/issues were dropped with no signal, and a client that
// sent both (a stale field on a shared request object) got a verification
// instead of the generation it asked for. The schema now rejects both shapes
// in the same request. Schema-level 400s only — no doctor call, cheap on the
// aiLimiter budget this file shares.
describe('POST /api/scriptide/fix — FixBodySchema rejects both candidateFountain AND span+issues in one request (finding D3)', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  const postFix = (body: unknown) => fetch(`${server.baseUrl}/api/scriptide/fix`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  it('candidateFountain together with span+issues is rejected, naming both shapes', async () => {
    const res = await postFix({
      fountain: FOUNTAIN,
      candidateFountain: FOUNTAIN,
      span: { startLine: 1, endLine: 1 },
      issues: [{ rule: 'test_rule', description: 'a finding' }],
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /provide either candidateFountain.*or both span and issues/);
    assert.match(body.error, /not both shapes/);
  });

  it('candidateFountain alone (no span/issues) still succeeds — the exclusivity fix does not narrow the ordinary writer path', async () => {
    const res = await postFix({ fountain: FOUNTAIN, candidateFountain: FOUNTAIN });
    assert.equal(res.status, 200);
  });
});

// ── D2 (2026-09-05 review finding D2): a candidate that exceeds the
// analyzer's scene budget (truncatedForAnalysis) is not malformed — it is
// longer than one analysis pass scores — but used to get the exact same
// "Check the draft and try again" copy a genuinely malformed candidate
// (failedPasses non-empty) gets. That sends a writer looking for a mistake
// that is not there. The note now branches on WHY completeness failed.
describe('POST /api/scriptide/fix — writer path names the truncation reason distinctly from a malformed-candidate failure (finding D2)', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  const postFix = (body: unknown) => fetch(`${server.baseUrl}/api/scriptide/fix`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  it('a candidate that exceeds the analyzer\'s scene ceiling gets the "longer than one pass scores" note, not "check the draft and try again"', async () => {
    const res = await postFix({ fountain: FOUNTAIN, candidateFountain: buildSceneTruncatedFountain() });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.match(body.note, /longer than the analyzer scores in one pass/i);
    assert.doesNotMatch(body.note, /check the draft and try again/i);
  });
});
