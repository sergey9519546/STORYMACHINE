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
import { createShutdownHandler, installCrashHandlers } from '../../server.ts';

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

// Unknown-/api-path 404 guard (server/app.ts). Without it, any /api request
// that matches no router falls through to the SPA fallback — Vite's dev
// middleware (appType 'spa') or the production `app.get('*')` catch-all —
// and returns index.html with HTTP 200, so a typo'd or removed endpoint
// looks like success until the caller's res.json() blows up on HTML. The
// guard sits after the six routers and before static serving, so real
// routes must keep matching first (the no-fire tests below).
describe('hardening — unknown /api paths return a JSON 404, not the SPA fallback', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  it('GET to an unknown /api path returns 404 with a JSON error body', async () => {
    const res = await fetch(`${server.baseUrl}/api/definitely-not-a-route`);
    assert.equal(res.status, 404);
    assert.match(res.headers.get('content-type') ?? '', /application\/json/);
    const body = await res.json();
    assert.equal(typeof body.error, 'string');
  });

  it('POST to an unknown /api path returns 404 too — the guard is method-agnostic, unlike the GET-only SPA catch-all', async () => {
    const res = await fetch(`${server.baseUrl}/api/nope/nested/deeper`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anything: true }),
    });
    assert.equal(res.status, 404);
    assert.match(res.headers.get('content-type') ?? '', /application\/json/);
    const body = await res.json();
    assert.equal(typeof body.error, 'string');
  });

  it('does not shadow real /api routes — GET /api/ai-config still answers 200 (no-fire)', async () => {
    const res = await fetch(`${server.baseUrl}/api/ai-config`);
    assert.equal(res.status, 200);
    const body = await res.json();
    // llmReady is the route's own contract (see server/routes/config.ts) —
    // asserting on it confirms the real handler ran, not some other fallback.
    assert.equal(typeof body.llmReady, 'boolean');
  });

  it('does not touch non-/api paths — /health (no /api prefix, no limiter by design) still answers 200 (no-fire)', async () => {
    const res = await fetch(`${server.baseUrl}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
  });
});

// S1-c — process-level crash safety net (BLOCKER finding). server.ts had
// SIGTERM/SIGINT graceful shutdown but no uncaughtException/unhandledRejection
// handlers, so a rejected promise anywhere in the process (a session-store
// sweep, a collab WS handler) would crash a bare `docker run` with nothing to
// restart it. Rather than importing server.ts's real startServer() (which
// binds a live port and stands up real sessions — unnecessary for unit-testing
// the handler wiring, and server.ts guards it to only auto-run when it's the
// process entry point, which it isn't here), these tests exercise the two
// exported building blocks directly: createShutdownHandler() (the same
// close-sqlite-then-exit function SIGTERM/SIGINT/uncaughtException all share)
// and installCrashHandlers() (which registers the two process listeners and
// wires uncaughtException to reuse that shutdown function).
describe('hardening — process-level crash handlers (server.ts)', () => {
  // Every test in this block stubs process.exit so an intentionally-triggered
  // uncaughtException/unhandledRejection can't actually terminate the test
  // runner, and removes the listeners it installs afterward so they don't
  // leak into other tests/other describe blocks in this same process.
  function withStubbedExit(fn: (exitCalls: number[]) => void | Promise<void>) {
    return async () => {
      const exitCalls: number[] = [];
      const originalExit = process.exit;
      process.exit = ((code?: number) => {
        exitCalls.push(code ?? 0);
        // Deliberately does NOT throw/return-never: the handler code under
        // test only ever does work *before* calling process.exit(), so a
        // no-op stub is sufficient and keeps the test process alive.
      }) as typeof process.exit;
      try {
        await fn(exitCalls);
      } finally {
        process.exit = originalExit;
      }
    };
  }

  it('createShutdownHandler() closes the server, then exits 0 for a signal-driven shutdown', withStubbedExit((exitCalls) => {
    let closeCallback: (() => void) | undefined;
    const fakeServer = { close: (cb: () => void) => { closeCallback = cb; } } as unknown as import('http').Server;
    const shutdown = createShutdownHandler(fakeServer);

    shutdown('SIGTERM');
    assert.equal(exitCalls.length, 0, 'must wait for server.close()\'s callback before exiting');
    closeCallback?.();
    assert.deepEqual(exitCalls, [0], 'SIGTERM shutdown should exit 0');
  }));

  it('createShutdownHandler() exits with the given non-zero code for a crash-driven shutdown', withStubbedExit((exitCalls) => {
    let closeCallback: (() => void) | undefined;
    const fakeServer = { close: (cb: () => void) => { closeCallback = cb; } } as unknown as import('http').Server;
    const shutdown = createShutdownHandler(fakeServer);

    shutdown('uncaughtException', 1);
    closeCallback?.();
    assert.deepEqual(exitCalls, [1], 'crash-driven shutdown should exit non-zero');
  }));

  // Intercepts process.on() during installCrashHandlers() so the handler
  // functions can be captured and invoked directly — rather than via
  // process.emit('uncaughtException', ...), which would also reach
  // node:test's OWN uncaughtException listener (it uses that to detect real
  // test-runner crashes) and fail the test run regardless of whether our
  // handler correctly caught and handled it. Capturing + calling the
  // function directly tests exactly the same logic without that collision,
  // and never touches the real global listener list.
  function captureHandlers(install: (shutdown: (s: string, c?: number) => void) => void, shutdown: (s: string, c?: number) => void) {
    const handlers: Record<string, (...args: unknown[]) => void> = {};
    const originalOn = process.on.bind(process);
    process.on = ((event: string, listener: (...args: unknown[]) => void) => {
      handlers[event] = listener;
      return process;
    }) as typeof process.on;
    try {
      install(shutdown);
    } finally {
      process.on = originalOn;
    }
    return handlers;
  }

  it('installCrashHandlers() wires uncaughtException to invoke the SAME shutdown function passed in (no duplicated cleanup path)', withStubbedExit((exitCalls) => {
    const shutdownCalls: Array<[string, number | undefined]> = [];
    const fakeShutdown = (signal: string, exitCode?: number) => { shutdownCalls.push([signal, exitCode]); };

    const handlers = captureHandlers(installCrashHandlers, fakeShutdown);
    assert.ok(handlers.uncaughtException, 'expected installCrashHandlers() to register an uncaughtException listener');
    handlers.uncaughtException(new Error('boom'));

    assert.deepEqual(
      shutdownCalls, [['uncaughtException', 1]],
      'uncaughtException must call the shared shutdown function with a non-zero exit code',
    );
    // Confirms the handler itself never calls process.exit directly — only
    // the shutdown function it delegates to would.
    assert.equal(exitCalls.length, 0);
  }));

  it('installCrashHandlers() logs and swallows an unhandledRejection — it does NOT call shutdown (a single bad promise must not kill the server)', withStubbedExit((exitCalls) => {
    let shutdownCalls = 0;
    const fakeShutdown = () => { shutdownCalls += 1; };
    const originalWrite = process.stderr.write.bind(process.stderr);
    const captured: string[] = [];
    process.stderr.write = ((chunk: unknown, ...args: unknown[]) => {
      captured.push(String(chunk));
      return (originalWrite as (...a: unknown[]) => boolean)(chunk, ...args);
    }) as typeof process.stderr.write;

    try {
      const handlers = captureHandlers(installCrashHandlers, fakeShutdown);
      assert.ok(handlers.unhandledRejection, 'expected installCrashHandlers() to register an unhandledRejection listener');
      handlers.unhandledRejection(new Error('rejected'), Promise.resolve());

      assert.equal(shutdownCalls, 0, 'unhandledRejection must not trigger shutdown/exit');
      assert.equal(exitCalls.length, 0);
      const logged = captured.some((line) => line.includes('unhandled_rejection') && line.includes('rejected'));
      assert.ok(logged, `expected an unhandled_rejection log line, got: ${captured.join('')}`);
    } finally {
      process.stderr.write = originalWrite;
    }
  }));
});

// S1-c — production-only Content-Security-Policy (SHOULD finding). app.ts
// previously set every other hardening header unconditionally but explicitly
// deferred CSP because Vite dev-mode needs inline/eval script for HMR. The
// fix scopes CSP to NODE_ENV==='production' (the same branch that serves the
// built dist/ instead of Vite middleware), leaving dev mode byte-for-byte as
// it was.
describe('hardening — production Content-Security-Policy', () => {
  // Each test restores process.env.NODE_ENV itself in a finally block
  // (rather than a shared afterEach) so a failure mid-test still restores it.
  const originalNodeEnv = process.env.NODE_ENV;

  it('sets a strict same-origin CSP when NODE_ENV=production', async () => {
    process.env.NODE_ENV = 'production';
    let server: TestServer | undefined;
    try {
      server = await startTestServer();
      const res = await fetch(`${server.baseUrl}/health`);
      const csp = res.headers.get('content-security-policy');
      assert.ok(csp, 'expected a Content-Security-Policy header in production mode');
      assert.match(csp!, /default-src 'self'/);
      assert.match(csp!, /script-src 'self'/);
      // No unsafe-inline/unsafe-eval on script-src specifically — only
      // style-src carries 'unsafe-inline', and only for the documented
      // (motion + CodeMirror) reason.
      assert.doesNotMatch(csp!.split(';').find((d) => d.trim().startsWith('script-src')) ?? '', /unsafe-/);
      assert.match(csp!, /style-src 'self' 'unsafe-inline'/);
      assert.match(csp!, /img-src 'self' data:/);
      assert.match(csp!, /object-src 'none'/);
      assert.match(csp!, /frame-ancestors 'none'/);
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      await server?.close();
    }
  });

  it('sets no Content-Security-Policy header outside production (dev mode, Vite HMR-compatible)', async () => {
    process.env.NODE_ENV = 'test';
    let server: TestServer | undefined;
    try {
      server = await startTestServer();
      const res = await fetch(`${server.baseUrl}/health`);
      assert.equal(res.headers.get('content-security-policy'), null);
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      await server?.close();
    }
  });
});
