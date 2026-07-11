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

  it('journey 7: GET /api/ai-config reports llmReady:false keyless', async () => {
    const res = await fetch(`${BASE}/api/ai-config`);
    assert.equal(res.status, 200);
    const config = await res.json();
    assert.equal(config.llmReady, false);
  });
});
