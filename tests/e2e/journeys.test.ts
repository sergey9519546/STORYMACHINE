// End-to-end journey verification (Run 17-A) -- the first-ever full-stack
// smoke test: spawns the real server as a child process (keyless, no
// GEMINI_API_KEY) and drives it over real HTTP, exercising the deterministic
// analysis-only surface that is this product's front door (see CLAUDE.md's
// "Gotchas": the server deliberately boots without an AI key).
//
// Honest-skip pattern (matches tests/core/real-script-corpus.test.ts): these
// hit real network sockets and spawn a real process, both expensive and
// occasionally flaky in CI, so the whole suite is gated behind RUN_E2E=1
// rather than running by default.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
// The certified sample screenplay (src/lib/sample-script.ts) — the exact text
// the manual 2026-07-28 browser smoke drove through StartScreen → "Try sample
// coverage" → ScriptDoctorPanel. Importing it directly (it's a pure-data module,
// no React deps) lets the new journeys below lock the SAME report/export shapes
// that smoke certified, rather than a separately-authored fixture that could
// drift from the one-click demo path.
import { title as sampleTitle, fountain as sampleFountain } from '../../src/lib/sample-script.ts';

const RUN_E2E = process.env.RUN_E2E === '1';
const PORT = 4577; // fixed ephemeral-range port for this suite's own server instance
const BASE = `http://127.0.0.1:${PORT}`;

let server: ChildProcess | undefined;

async function waitForServer(timeoutMs = 20_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/api/ai-config`);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error('server did not become ready in time');
}

const MULTI_SCENE_FOUNTAIN = `Title: E2E Journey Script
Author: Run 17-A

INT. KITCHEN - DAY

JANE stands at the counter, chopping vegetables. She glances at the clock.

JANE
He's late. Again.

The door opens. MARK enters, breathless.

MARK
Traffic was insane. I'm sorry.

JANE
You're always sorry.

Mark sets down his bag and crosses to her.

MARK
I mean it this time.

EXT. BACKYARD - CONTINUOUS

Jane storms out through the back door. Mark follows, calling after her.

MARK
Jane, wait!

She stops at the fence, arms crossed, staring at the horizon.

JANE
Why do I keep waiting for you to change?

INT. KITCHEN - LATER

The kitchen is quiet now. Jane sits alone at the table, the vegetables
abandoned. She stares at a photograph in her hand.

JANE
(to herself)
Maybe I already know the answer.
`;

before(async () => {
  if (!RUN_E2E) return;
  const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
  server = spawn(
    process.execPath,
    ['--experimental-strip-types', 'server.ts'],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        PORT: String(PORT),
        GEMINI_API_KEY: '',
        NODE_ENV: 'test',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  let stderr = '';
  server.stderr?.on('data', (d) => { stderr += d.toString(); });
  server.on('exit', (code) => {
    if (code !== null && code !== 0 && !process.env.__E2E_SHUTTING_DOWN__) {
      // eslint-disable-next-line no-console
      console.error(`e2e server exited early with code ${code}\n${stderr}`);
    }
  });
  await waitForServer();
});

after(async () => {
  if (!RUN_E2E || !server) return;
  process.env.__E2E_SHUTTING_DOWN__ = '1';
  server.kill('SIGTERM');
  await new Promise(r => setTimeout(r, 200));
});

describe('e2e journeys (Run 17-A)', { skip: !RUN_E2E && 'RUN_E2E not set -- set RUN_E2E=1 to spawn the real server and run journeys' }, () => {
  it('journey 1: POST /api/scriptide/doctor returns a full report', async () => {
    const res = await fetch(`${BASE}/api/scriptide/doctor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fountain: MULTI_SCENE_FOUNTAIN }),
    });
    assert.equal(res.status, 200);
    const report = await res.json();
    assert.equal(typeof report.health, 'number');
    assert.equal(typeof report.verdict, 'string');
    assert.ok(report.dimensions && typeof report.dimensions === 'object');
    assert.equal(typeof report.contentHash, 'string');
    assert.ok(report.contentHash.length > 0);
    // pageEstimate is an object ({ pages, runtimeMinutes, basis }), not a bare
    // number -- confirmed against server/nvm/analyze/doctor.ts's actual
    // response shape rather than assumed from the route name.
    assert.ok(report.pageEstimate && typeof report.pageEstimate === 'object');
    assert.equal(typeof report.pageEstimate.pages, 'number');
    assert.ok(report.pageEstimate.pages > 0);
  });

  it('journey 2: determinism -- identical text twice yields identical contentHash and health', async () => {
    const post = () => fetch(`${BASE}/api/scriptide/doctor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fountain: MULTI_SCENE_FOUNTAIN }),
    }).then(r => r.json());

    const [first, second] = await Promise.all([post(), post()]);
    assert.equal(first.contentHash, second.contentHash);
    assert.equal(first.health, second.health);
  });

  it('journey 3: POST /api/scriptide/fix keyless -- 200, usedLLM:false, honest note, never 500', async () => {
    const res = await fetch(`${BASE}/api/scriptide/fix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fountain: MULTI_SCENE_FOUNTAIN,
        span: { startLine: 1, endLine: 3 },
        issues: [{ rule: 'TEST_RULE', description: 'placeholder issue for e2e fix journey' }],
      }),
    });
    assert.equal(res.status, 200);
    const result = await res.json();
    assert.equal(result.usedLLM, false);
    assert.equal(typeof result.note, 'string');
    assert.ok(result.note.length > 0);
  });

  it('journey 4: POST /api/game/interview keyless -- 200 with receipts', async () => {
    const sessionId = 'e2e-journey-4';
    const initRes = await fetch(`${BASE}/api/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        agents: [{
          char_id: 'jane',
          name: 'Jane',
          public_mask: 'Composed, guarded.',
          hidden_motive: 'Wants Mark to finally show up on time.',
        }],
      }),
    });
    assert.equal(initRes.status, 200);

    const res = await fetch(`${BASE}/api/game/interview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        agentName: 'Jane',
        question: 'Why are you upset with Mark?',
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.receipts, 'expected receipts to be present keyless');
    assert.equal(body.usedLLM, false);
    assert.equal(typeof body.note, 'string');
  });

  it('journey 5: POST /api/export/coverage returns HTML containing health and verdict', async () => {
    const res = await fetch(`${BASE}/api/export/coverage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fountain: MULTI_SCENE_FOUNTAIN, title: 'E2E Journey Script' }),
    });
    assert.equal(res.status, 200);
    const contentType = res.headers.get('content-type') ?? '';
    assert.ok(contentType.includes('text/html'), `expected html, got ${contentType}`);
    const html = await res.text();

    const doctorRes = await fetch(`${BASE}/api/scriptide/doctor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fountain: MULTI_SCENE_FOUNTAIN }),
    });
    const report = await doctorRes.json();
    const healthStr = String(Math.round(report.health * 10) / 10);
    assert.ok(
      html.includes(healthStr) || html.includes(String(Math.round(report.health))),
      `expected html to contain the health number (${healthStr})`,
    );
    assert.ok(
      html.toUpperCase().includes(String(report.verdict).toUpperCase()),
      `expected html to contain the verdict label (${report.verdict})`,
    );
  });

  it('journey 7: GET /api/ai-config reports llmReady:false keyless', async () => {
    const res = await fetch(`${BASE}/api/ai-config`);
    assert.equal(res.status, 200);
    const config = await res.json();
    assert.equal(config.llmReady, false);
  });

  // ─── Locks for the HTTP invariants the 2026-07-28 browser smoke certified ───
  // (commit 4c131df). That smoke drove StartScreen → "Try sample coverage" →
  // ScriptDoctorPanel in headless Chromium and exists only as a status note;
  // nothing in CI would have caught a future regression in the HTTP-level
  // shapes it relied on. The journeys below lock those shapes at the HTTP layer
  // (no browser/Playwright) so a regression fails CI instead of silently
  // waiting for a manual re-smoke. SHAPE/POSTURE only — exact scoring numbers
  // (health, totals) are deliberately not asserted; they're the frozen engine's
  // scoring surface, brittle to pin and out of freeze-permitted scope.
  //
  // Ordering note: the gameLimiter-touching journeys (8 & 9 below) run BEFORE
  // journey 6's 130-request rate-limit stress test, which exhausts the shared
  // gameLimiter budget for the rest of the suite. Journey 10 sits on aiLimiter
  // (a separate budget), so it's immune and placed last.

  // The built-in sample script's coverage report shape — the certified one-click
  // demo path. journey 1 above already locks health/verdict/dimensions/contentHash/
  // pageEstimate on a separately-authored fixture; this one locks the FIELDS A
  // RENDERED REPORT NEEDS THAT journey 1 omits (issue counts + per-severity
  // breakdown + the five known dimension keys each carrying a numeric score) on
  // the exact sample text the manual smoke ran, so the demo's contract can't
  // regress even if journey 1's fixture stays green.
  it('journey 8: built-in sample script doctor report carries issue counts and all five dimensions', async () => {
    const res = await fetch(`${BASE}/api/scriptide/doctor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fountain: sampleFountain, title: sampleTitle }),
    });
    assert.equal(res.status, 200);
    const report = await res.json();

    // A whole-draft assessment, not a sentinel/degraded shape — the sample is a
    // real (if short) screenplay, so a future regression that silently turned it
    // into an analysisComplete:false report would make every number below lie.
    assert.equal(report.analysisComplete, true);

    // Issue counts: the rendered panel's severity chips + "N issues" header.
    assert.equal(typeof report.totalIssues, 'number');
    assert.ok(Number.isFinite(report.totalIssues), 'totalIssues must be a finite number');
    assert.ok(report.totalIssues >= 0);
    assert.ok(report.bySeverity && typeof report.bySeverity === 'object');
    for (const sev of ['critical', 'major', 'minor'] as const) {
      assert.equal(typeof report.bySeverity[sev], 'number', `bySeverity.${sev} must be a number`);
      assert.ok(Number.isFinite(report.bySeverity[sev]));
      assert.ok(report.bySeverity[sev] >= 0);
    }
    // The per-severity counts must sum to the headline total — a shape-level
    // consistency check that catches a future aggregation regression without
    // pinning any specific count.
    const sevSum = report.bySeverity.critical + report.bySeverity.major + report.bySeverity.minor;
    assert.equal(sevSum, report.totalIssues, 'bySeverity counts must sum to totalIssues');

    // All five writer-facing craft dimensions, each with a numeric score — the
    // dimension bars the panel renders. Fixed key set (DimensionKey in
    // server/nvm/analyze/types.ts); a missing/renamed dimension is a report-
    // shape regression, not a scoring change.
    assert.ok(Array.isArray(report.dimensions), 'dimensions must be an array');
    const dimKeys = report.dimensions.map((d: { key: string }) => d.key);
    const EXPECTED_DIMENSIONS = [
      'structure-pacing', 'character', 'dialogue-voice', 'plot-logic', 'theme-originality',
    ];
    assert.deepEqual(dimKeys.sort(), [...EXPECTED_DIMENSIONS].sort());
    for (const dim of report.dimensions) {
      assert.equal(typeof dim.score, 'number', `dimension ${dim.key}.score must be a number`);
      assert.ok(Number.isFinite(dim.score));
      assert.ok(dim.score >= 0 && dim.score <= 100, `dimension ${dim.key}.score must be in [0,100]`);
    }

    // rootCauses is attached by the route (clusterIssues over located issues) —
    // the panel's "root-cause findings" cards. Assert it's an array (may be
    // empty for a flawless script; the sample deliberately is not, but shape >
    // contents here).
    assert.ok(Array.isArray(report.rootCauses), 'rootCauses must be an array');
  });

  // The coverage export must be a non-trivially-sized, real HTML document — not
  // an error page or a stub. The manual smoke measured ~210KB; this asserts a
  // conservative floor (well below the observed size, deliberately loose so a
  // minor renderer tweak doesn't break CI) plus the HTML-doctype invariant that
  // distinguishes a rendered report from a JSON error body. journey 5 already
  // checks the body CONTAINS the health/verdict strings; this extends it with
  // the size + content-type contract the panel's "download a coverage report"
  // affordance depends on.
  it('journey 9: coverage export returns a non-trivially-sized HTML document', async () => {
    const res = await fetch(`${BASE}/api/export/coverage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fountain: sampleFountain, title: sampleTitle }),
    });
    assert.equal(res.status, 200);
    const contentType = res.headers.get('content-type') ?? '';
    assert.ok(contentType.includes('text/html'), `expected html content-type, got ${contentType}`);
    const html = await res.text();
    // A rendered coverage report starts with an HTML doctype; a JSON error body
    // (the route's own failure path returns application/json) would not.
    assert.ok(/^<!doctype html>/i.test(html), 'coverage export must be an HTML document');
    // Loose floor: the manual smoke produced ~210KB. Anything under 10KB would
    // be a stub/error-page masquerading as a report. NOT pinned to the exact
    // byte count — that's brittle against renderer evolution.
    assert.ok(html.length > 10_000, `coverage export unexpectedly small (${html.length} bytes)`);
  });

  it('journey 6: rate limiter -- 130 rapid requests against a gameLimiter route yields at least one 429', async () => {
    const requests = Array.from({ length: 130 }, () => fetch(`${BASE}/api/scriptide/doctor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fountain: MULTI_SCENE_FOUNTAIN }),
    }));
    const results = await Promise.all(requests);
    const statuses = results.map(r => r.status);
    const tooMany = statuses.filter(s => s === 429).length;
    assert.ok(tooMany >= 1, `expected at least one 429 among ${statuses.length} rapid requests, got statuses: ${JSON.stringify(statuses.slice(0, 20))}...`);
  });

  // Honest keyless degradation for a route that genuinely needs an LLM. The
  // product's front door is analysis-only (AGENTS.md "Gotchas": the server
  // deliberately boots without an AI key), so a generation route hit keyless
  // must respond with a documented, clean degradation — NOT a 500-with-stack
  // crash. /api/analyze-script is the comprehensive AI analysis route the
  // frontend director (src/services/director.ts) calls; it guards keyless with
  // a 503 + JSON {error} body (server/routes/scriptide.ts). journeys 3 & 4 lock
  // the 200+usedLLM:false degradation shape for /fix and /interview; this locks
  // the 503 shape the SSE/JSON generation routes use — a different, equally-
  // required honesty contract. (aiLimiter, a separate budget from the now-
  // exhausted gameLimiter, so safe to run after journey 6.)
  it('journey 10: POST /api/analyze-script keyless degrades honestly (503, clean JSON, never 500)', async () => {
    const res = await fetch(`${BASE}/api/analyze-script`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scriptText: sampleFountain,
        engineState: {},
        characters: [],
      }),
    });
    // 503 (Service Unavailable) is the documented keyless degradation for this
    // route — distinctly NOT 500 (which would mean an uncaught throw / stack
    // leak, the exact "honest degradation" violation AGENTS.md forbids).
    assert.equal(res.status, 503);
    const body = await res.json();
    assert.equal(typeof body.error, 'string');
    assert.ok(body.error.length > 0, 'keyless 503 must carry a non-empty error note');
  });
});
