// requestLogger() logs the real, mount-prefixed path — 2026-09-04 ops audit
// finding B, revised the same day by the follow-up review.
//
// Before the audit's fix, requestLogger() (server/lib/request-logger.ts)
// logged Express's `req.path` alone, which is re-derived at whatever router
// is CURRENTLY handling the request. By the time this middleware's
// `res.on('finish')` fired — after Express had already walked into a nested
// router mounted with its own prefix (server/app.ts's `app.use('/assets',
// ...)` and `app.use('/api', gameLimiter, ...)` 404 guards, both added
// 2026-09-04) — that prefix had already been stripped off `req.path`. A
// request to `/assets/does-not-exist.js` logged as
// `path: "/does-not-exist.js"`, and `/api/nope` logged as `path: "/nope"` —
// both indistinguishable from a request at the site root, making the two
// 404 guards invisible as asset/api 404s specifically.
//
// The audit's first fix read the path portion of `req.originalUrl` instead
// (query string stripped). The follow-up review found that expression logs
// a FULL URL — including an attacker-chosen scheme and host — for an
// absolute-form request target (RFC 9112 §3.2.2: legal, and both Node and
// Express accept and serve it, e.g. from a proxy-style client), since
// `req.originalUrl` is the client's raw request-target string verbatim.
// The fix now in place logs `req.baseUrl + req.path` instead — see
// request-logger.ts's own comment for why that expression survives mount
// prefixes (same mechanism that caused the original bug) while never
// carrying a host (Express strips scheme/authority before either field is
// ever set, regardless of request-line form).
//
// Three levels of proof:
//   1. A minimal standalone app that mounts a sub-router under an explicit
//      prefix (the literal repro the audit finding describes) — proves the
//      prefix-survival mechanism in isolation.
//   2. The real app (server/app.ts), hitting the actual `/api` 404 guard —
//      proves the fix lands where the bug was found, not just in a toy case.
//   3. An absolute-form request line sent over a raw socket (the follow-up
//      review's own repro) — proves no host-injection into the logged path.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import net from 'node:net';
import type { AddressInfo } from 'net';
import { requestLogger } from '../../server/lib/request-logger.ts';

async function withCapturedStdout(fn: () => Promise<void>): Promise<string[]> {
  const captured: string[] = [];
  const originalWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = ((chunk: unknown, ...args: unknown[]) => {
    captured.push(String(chunk));
    return (originalWrite as (...values: unknown[]) => boolean)(chunk, ...args);
  }) as typeof process.stdout.write;
  try {
    await fn();
  } finally {
    process.stdout.write = originalWrite;
  }
  return captured.flatMap((chunk) => chunk.split('\n')).filter(Boolean);
}

function requestLogLines(lines: string[]): Array<Record<string, unknown>> {
  return lines
    .filter((line) => line.includes('"msg":"request"'))
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

describe('requestLogger — logs the mount-prefixed path (server/lib/request-logger.ts)', () => {
  it('a sub-router mounted under an explicit prefix still logs that prefix', async () => {
    const app = express();
    app.use(requestLogger());
    const sub = express.Router();
    sub.get('/widget', (_req, res) => { res.json({ ok: true }); });
    // The exact shape the audit's finding describes: app.use('/assets', ...)
    // / app.use('/api', ...) both mount at a non-root prefix, which strips
    // that prefix off req.path by the time a nested handler runs.
    app.use('/mounted', sub);

    const server = await new Promise<import('http').Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    const { port } = server.address() as AddressInfo;

    try {
      const lines = await withCapturedStdout(async () => {
        const res = await fetch(`http://127.0.0.1:${port}/mounted/widget?sessionId=SHOULD_NOT_BE_LOGGED`);
        assert.equal(res.status, 200);
      });

      const requests = requestLogLines(lines);
      assert.equal(requests.length, 1, `expected exactly one request log line, got: ${lines.join('\n')}`);
      assert.equal(requests[0]!.path, '/mounted/widget', 'the sub-router\'s mount prefix must survive into the logged path');
      assert.equal(requests[0]!.method, 'GET');
      assert.equal(requests[0]!.status, 200);
      assert.equal(typeof requests[0]!.ms, 'number');
      const serialized = JSON.stringify(requests[0]);
      assert.ok(!serialized.includes('SHOULD_NOT_BE_LOGGED'), 'the query string must never reach the logged path');
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });

  it('a 404 under a mounted prefix logs that prefix too, not just the 200 case', async () => {
    const app = express();
    app.use(requestLogger());
    const sub = express.Router();
    sub.get('/widget', (_req, res) => { res.json({ ok: true }); });
    app.use('/mounted', sub);
    app.use('/mounted', (_req, res) => { res.status(404).json({ error: 'Not found' }); });

    const server = await new Promise<import('http').Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    const { port } = server.address() as AddressInfo;

    try {
      const lines = await withCapturedStdout(async () => {
        const res = await fetch(`http://127.0.0.1:${port}/mounted/does-not-exist`);
        assert.equal(res.status, 404);
      });

      const requests = requestLogLines(lines);
      assert.equal(requests.length, 1);
      assert.equal(requests[0]!.path, '/mounted/does-not-exist');
      assert.equal(requests[0]!.status, 404);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });
});

// C2 (2026-09-05 review, LOW). Express sets req.baseUrl to the mount prefix
// and req.path to '/' for a request at the BARE mount root — its own
// convention for "nothing past the mount point" — so a naive
// `req.baseUrl + req.path` concatenation invented a trailing slash the
// client never sent (`GET /api` logged as `path: "/api/"`). This describe
// block proves the fixed loggedPath() drops that invented slash, without
// disturbing any deeper sub-path (already covered above). Note: Express
// itself gives `GET /mounted` and `GET /mounted/` the IDENTICAL
// `req.baseUrl`/`req.path` pair (`'/mounted'`/`'/'`) by the time this
// middleware runs — the two requests are indistinguishable from inside
// Express, so a fix here can only pick ONE byte-accurate answer for the
// bare-mount-root shape, not recover which of the two the client actually
// sent; `/mounted` (no invented character) is the one this field's own
// comment already promises ("byte-identical to the request target").
describe('requestLogger — a bare mount root does not log an invented trailing slash (finding C2)', () => {
  it('GET /mounted (the bare mount root, no trailing slash on the wire) logs path "/mounted", not "/mounted/"', async () => {
    const app = express();
    app.use(requestLogger());
    const sub = express.Router();
    sub.get('/', (_req, res) => { res.json({ ok: true }); });
    app.use('/mounted', sub);

    const server = await new Promise<import('http').Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    const { port } = server.address() as AddressInfo;

    try {
      const lines = await withCapturedStdout(async () => {
        const res = await fetch(`http://127.0.0.1:${port}/mounted`);
        assert.equal(res.status, 200);
      });

      const requests = requestLogLines(lines);
      assert.equal(requests.length, 1, `expected exactly one request log line, got: ${lines.join('\n')}`);
      assert.equal(requests[0]!.path, '/mounted', 'a bare mount root must log the path the client actually requested, no invented "/"');
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });
});

// 2026-09-05 review (second pass, pre-existing finding). In dev mode, an
// error raised before Express's own router has assigned req.baseUrl a
// string value (observed for GET /%zz's malformed-percent-encoding
// URIError, thrown during route matching) reaches this middleware's
// `res.on('finish')` with req.baseUrl still `undefined`, not `''` — string
// concatenation coerces that to the literal 4-character text "undefined",
// so the plain `req.baseUrl + req.path` expression logged
// `"undefined/%zz"`, a path that never existed. This test forces the exact
// condition directly (a downstream middleware clears req.baseUrl before the
// response finishes) rather than depending on which internal Express code
// path leaves it unset, since `res.on('finish')` reads req.baseUrl at
// FINISH time, whatever a later handler left it as.
describe('requestLogger — an undefined req.baseUrl never becomes the literal string "undefined" (pre-existing, second review pass)', () => {
  it('logs the bare path, not "undefined" + path, when req.baseUrl is undefined at response-finish time', async () => {
    const app = express();
    app.use(requestLogger());
    app.use((req, res, _next) => {
      // Simulates the real trigger: an error path that runs before any
      // Express layer has assigned req.baseUrl a string ('' or a mount
      // prefix) — deleting it here reproduces exactly what
      // res.on('finish') then observes, regardless of which internal
      // Express code path leaves it that way in practice.
      delete (req as { baseUrl?: string }).baseUrl;
      res.status(400).json({ error: 'Malformed request' });
    });

    const server = await new Promise<import('http').Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    const { port } = server.address() as AddressInfo;

    try {
      const lines = await withCapturedStdout(async () => {
        const res = await fetch(`http://127.0.0.1:${port}/%zz`);
        assert.equal(res.status, 400);
      });

      const requests = requestLogLines(lines);
      assert.equal(requests.length, 1, `expected exactly one request log line, got: ${lines.join('\n')}`);
      assert.equal(requests[0]!.path, '/%zz', 'must log the bare path, never "undefined" prefixed onto it');
      assert.ok(!String(requests[0]!.path).includes('undefined'), `logged path must never contain the literal text "undefined", got: ${requests[0]!.path}`);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });
});

describe('requestLogger — proved against the live app.ts /api 404 guard', () => {
  it('GET /api/definitely-not-a-route logs path "/api/definitely-not-a-route", not "/definitely-not-a-route"', async () => {
    process.env.SESSION_DB_DIR = ':memory:';
    const { createApp } = await import('../../server/app.ts');
    const app = await createApp({ serveStatic: false });
    const server = await new Promise<import('http').Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    const { port } = server.address() as AddressInfo;

    try {
      const lines = await withCapturedStdout(async () => {
        const res = await fetch(`http://127.0.0.1:${port}/api/definitely-not-a-route`);
        assert.equal(res.status, 404);
      });

      const requests = requestLogLines(lines)
        .filter((r) => r.path === '/api/definitely-not-a-route' || r.path === '/definitely-not-a-route');
      assert.equal(requests.length, 1, `expected one matching request log, got: ${lines.join('\n')}`);
      // The regression this test guards: before the fix this was
      // "/definitely-not-a-route" (the /api prefix silently stripped).
      assert.equal(requests[0]!.path, '/api/definitely-not-a-route');
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });
});

describe('requestLogger — absolute-form request targets never inject a host (follow-up review item 3)', () => {
  it('GET http://evil.example.com/mounted/widget HTTP/1.1 logs path "/mounted/widget", not the full URL', async () => {
    const app = express();
    app.use(requestLogger());
    const sub = express.Router();
    sub.get('/widget', (_req, res) => { res.json({ ok: true }); });
    app.use('/mounted', sub);

    const server = await new Promise<import('http').Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    const { port } = server.address() as AddressInfo;

    try {
      const lines = await withCapturedStdout(async () => {
        // A raw absolute-form request line (RFC 9112 §3.2.2) — legal, and
        // what a proxy-style client sends; fetch()/http.request() can't
        // produce this shape directly, so this writes the request line by
        // hand over a raw TCP socket, exactly as the follow-up review's own
        // probe did.
        const statusLine = await new Promise<string>((resolve, reject) => {
          const socket = net.connect(port, '127.0.0.1', () => {
            socket.write(
              'GET http://evil.example.com/mounted/widget HTTP/1.1\r\n'
              + 'Host: 127.0.0.1\r\nConnection: close\r\n\r\n',
            );
          });
          let buf = '';
          socket.on('data', (d) => { buf += d.toString(); });
          socket.on('end', () => resolve(buf.split('\r\n')[0] ?? ''));
          socket.on('error', reject);
        });
        assert.match(statusLine, /^HTTP\/1\.1 200/, `expected a 200 status line, got: ${statusLine}`);
      });

      const requests = requestLogLines(lines);
      assert.equal(requests.length, 1, `expected exactly one request log line, got: ${lines.join('\n')}`);
      assert.equal(
        requests[0]!.path, '/mounted/widget',
        'the logged path must be the parsed pathname, never the client-chosen scheme+host from an absolute-form request line',
      );
      const serialized = JSON.stringify(requests[0]);
      assert.ok(!serialized.includes('evil.example.com'), `expected no attacker-chosen host in the logged line, got: ${serialized}`);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });
});
