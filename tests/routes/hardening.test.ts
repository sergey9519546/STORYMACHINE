// Deployment-hardening coverage (Run 8, ROADMAP.md):
//   1. heavyBodyLimiter — POST /api/scriptide/doctor/pdf gets its own, much
//      lower-ceiling rate limiter (10/min) instead of sharing gameLimiter
//      (120/min) with the rest of server/routes/scriptide.ts, since its raw
//      body cap (15mb) makes it a materially larger DoS surface per request
//      than any JSON route in this file. See the DoS-math comment at
//      heavyBodyLimiter's definition in server/lib/session-store.ts and the
//      route-wiring comment in server/routes/scriptide.ts.
//   2. Request-log hygiene for capability-bearing query params (?sessionId=
//      on SSE call sites). Investigation (documented in server/app.ts, next
//      to `app.use(requestLogger())`) found the request logger already logs
//      only `req.path` (Express's parsed pathname, which structurally
//      excludes the query string — that's req.url/req.originalUrl, neither
//      of which any logger in server/** reads) and a repo-wide grep of
//      server/** for req.url/req.originalUrl usage in a logging path turns
//      up nothing else. There is therefore no redaction helper to unit-test:
//      "truth over busywork" — see the run instructions this file was
//      written against. This file's second describe block instead asserts
//      that finding stays true (a regression guard), so the moment any
//      future change makes a per-request log line include a query string,
//      this test fails loudly instead of the leak going unnoticed.
//
// Same conventions as tests/routes/limiters.test.ts: express-rate-limit's
// default in-memory store is process-global state scoped to the limiter
// instance created once at module load (server/lib/session-store.ts), and
// node:test isolates each *.test.ts file in its own process by default — so
// burst-testing heavyBodyLimiter here can't be thrown off by request counts
// consumed by other test files, and doesn't consume gameLimiter's separate
// budget either (that's the "independent budgets" assertion below).
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, type TestServer } from './helpers.ts';

// A minimal buffer that passes the route's fast magic-byte guard
// (body.subarray(0,5) === '%PDF-', server/routes/scriptide.ts) but is not a
// structurally valid PDF, so pdfToFountain() rejects it with a 400 well
// before ever reaching runScriptDoctor. That's fine for this file's purpose:
// heavyBodyLimiter sits in front of express.raw() and the handler, so a 400
// from deeper in the handler still consumes exactly one request against the
// limiter's budget, and the 429 transition is all this test needs to observe.
const MINIMAL_PDF_MAGIC_BYTES = Buffer.from('%PDF-1.4\nnot a real pdf body', 'utf8');

const MINIMAL_FOUNTAIN = `INT. ROOM - DAY

A quiet room.

ALEX
Hello.
`;

describe('hardening — heavyBodyLimiter on POST /api/scriptide/doctor/pdf', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  const postPdf = () => fetch(`${server.baseUrl}/api/scriptide/doctor/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/pdf' },
    body: MINIMAL_PDF_MAGIC_BYTES,
  });

  it('returns 429 within 11 rapid requests, well below gameLimiter\'s 120/min ceiling', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      const res = await postPdf();
      statuses.push(res.status);
      if (res.status === 429) break;
    }
    // Every response before the 429 is a 400 (non-PDF content, per the
    // fixture's design above) — confirms the limiter, not something else in
    // the handler chain, is what eventually short-circuits the request.
    for (const s of statuses.slice(0, -1)) assert.equal(s, 400);
    assert.ok(
      statuses.includes(429),
      `expected a 429 within 11 requests (heavyBodyLimiter's max is 10/min), got: ${statuses.join(',')}`,
    );
    assert.ok(
      statuses.length <= 11,
      `heavyBodyLimiter should trip by the 11th request, took ${statuses.length}`,
    );
  });

  it('the general /api/scriptide/doctor route (gameLimiter) still accepts after doctor/pdf is throttled — independent budgets', async () => {
    // At this point the previous test has already driven doctor/pdf's
    // heavyBodyLimiter to 429. If the two routes wrongly shared one limiter
    // instance, this request would also 429; instead it must succeed,
    // proving heavyBodyLimiter and gameLimiter partition independent budgets
    // per server/lib/session-store.ts's two separate rateLimit() instances.
    const res = await fetch(`${server.baseUrl}/api/scriptide/doctor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fountain: MINIMAL_FOUNTAIN }),
    });
    assert.equal(res.status, 200, `expected 200 from the still-fresh gameLimiter budget, got ${res.status}`);
    const body = await res.json();
    assert.equal(body.source.format, 'fountain');
    assert.equal(body.passes.length, 14);
  });
});

describe('hardening — request-log query-string hygiene (regression guard)', async () => {
  let server: TestServer;
  const originalWrite = process.stdout.write.bind(process.stdout);
  let captured: string[] = [];

  before(async () => {
    server = await startTestServer();
  });
  after(async () => { await server.close(); });

  it('an SSE-style request carrying a capability-bearing ?sessionId= query param never has that value appear in the request log line', async () => {
    captured = [];
    // Intercept stdout for the duration of this one request only — the
    // logger (server/lib/logger.ts) writes structured JSON lines to stdout
    // for level 'info', which is what the per-request "request" log uses.
    process.stdout.write = ((chunk: unknown, ...args: unknown[]) => {
      captured.push(String(chunk));
      return (originalWrite as (...a: unknown[]) => boolean)(chunk, ...args);
    }) as typeof process.stdout.write;

    const secretSessionId = 'sekrit-session-value-must-not-leak-into-logs';
    try {
      // /api/scriptide/complete is the real SSE call site that carries
      // sessionId in the query string (src/lib/session.ts's withSession()) —
      // see server/app.ts's documenting comment. rawPrefix is intentionally
      // short (<10 chars) so the handler short-circuits to `{type:'done'}`
      // immediately rather than attempting a real model call.
      const res = await fetch(
        `${server.baseUrl}/api/scriptide/complete?sessionId=${secretSessionId}&prefix=hi`,
      );
      assert.equal(res.status, 200);
      await res.text(); // drain the SSE stream so 'finish' fires and the request log line is emitted
    } finally {
      process.stdout.write = originalWrite;
    }

    const requestLogLines = captured
      .flatMap((chunk) => chunk.split('\n'))
      .filter((line) => line.includes('"msg":"request"'));

    assert.ok(requestLogLines.length > 0, 'expected at least one "request" log line to have been emitted');
    for (const line of requestLogLines) {
      assert.ok(
        !line.includes(secretSessionId),
        `request log line leaked the sessionId query value: ${line}`,
      );
      // Positive control: confirms this assertion isn't vacuously true
      // because the path field was empty or the route didn't match.
      assert.ok(line.includes('/api/scriptide/complete'), `expected the path in the log line: ${line}`);
    }
  });
});
