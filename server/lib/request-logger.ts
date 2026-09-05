// request-logger.ts — the Express request-logging middleware, split out of
// ./logger.ts (retrospective #5, 2026-09-03).
//
// WHY THE SPLIT. logger.ts is imported all over the deterministic analysis
// path (server/nvm/revision/pipeline.ts, among others), so it sits inside the
// reachable set rooted at server/nvm/analyze/doctor.ts. That is acceptable
// only while it stays a leaf: a structured JSON sink with no dependencies.
// requestLogger() referenced Express's RequestHandler type, which made the web
// framework part of the core's type graph for a function no analysis code has
// ever called. Moving it here keeps logger.ts genuinely dependency-free, which
// is the condition tests/core/pure-core-boundary.test.ts allowlists it under.

import { logger } from './logger.ts';

// Express request logger middleware — logs method, path, status, duration in ms.
//
// PATH FIELD (2026-09-04 ops audit finding B, revised by the same day's
// follow-up review). Prior to the audit's fix, `path` came from `req.path`,
// which is re-derived at the CURRENT router's mount point — by the time this
// middleware's res.on('finish') fires, later mounts in server/app.ts
// (`app.use('/assets', ...)`, `app.use('/api', ...)`) had already stripped
// their own prefix off it, so a request to `/assets/does-not-exist.js`
// logged as `path: "/does-not-exist.js"` and `/api/nope` logged as
// `path: "/nope"` — both indistinguishable from a request at the site root,
// and both invisible as the asset/api 404 guards they actually were
// (server/app.ts's two 404 handlers, added the same day).
//
// The first fix read `req.originalUrl` (with the query string split off) —
// closer, but wrong for a different reason the follow-up review found:
// `req.originalUrl` is the RAW request-target string as the client sent it,
// and for an absolute-form request line (RFC 9112 §3.2.2 — legal, and both
// Node's HTTP parser and Express accept and serve it, e.g. from a
// proxy-style client: `GET http://evil.example.com/api/nope HTTP/1.1`) that
// string includes an attacker-chosen scheme and host, which then landed
// verbatim in the logged `path` field — a log-integrity issue, since every
// consumer of this field (grep, a log shipper, `tests/routes/events.test.ts`'s
// own `"path":"/api/…"` match) assumes a leading-slash pathname, never a full
// URL.
//
// `req.baseUrl + req.path` fixes both problems with the SAME mechanism that
// caused the original bug, read correctly: Express sets `req.baseUrl` (the
// matched mount prefix, e.g. `/api`) and trims `req.url`/`req.path` to the
// remainder as it descends into a mounted router or path-prefixed
// middleware, and — critically — never restores either one afterward unless
// the terminal handler calls `next()` (it doesn't; it ends the request with
// `res.json()`/`res.end()`). So by the time `res.on('finish')` fires,
// `req.baseUrl` and `req.path` are frozen at whatever the DEEPEST layer that
// actually handled the request set them to, and concatenating them
// reconstructs the real, full, prefix-included path Express itself parsed —
// never the client's raw, spoofable request-target string. `req.baseUrl`
// and `req.path` are always parsed relative paths (Express strips
// scheme/authority during its own URL parsing before either field is ever
// set), so this expression cannot carry a host no matter how the request
// line was formatted; no query-stripping helper is needed either, since
// neither field carries one. Removes a third copy of "strip the query off a
// URL string" (server/collab/yjs-server.ts's own two, for the WS upgrade
// path, are unrelated and untouched — see below).
//
// A session id is capability-bearing data (`?sessionId=...`, the fallback
// identifier SSE call sites use because they can't set the X-Session-Id
// header — server/lib/session-store.ts's sessionId() precedence-1 comment)
// and must never reach a log line; `req.baseUrl + req.path` structurally
// excludes the query string, same as `req.path` alone always did, so that
// property holds unchanged (server/app.ts's comment on this middleware's
// call site documents the full rationale).
// C2 (2026-09-05 review, LOW). A request at a bare mount root (`GET /api`,
// `GET /assets`) has `req.baseUrl === '/api'`/`'/assets'` and
// `req.path === '/'` — Express's own convention for "nothing past the mount
// point" — so the plain concatenation above invents a trailing slash the
// client never sent (`GET /api` logged as `path: "/api/"`). Harmless for
// grepping, but this field's own comment above claims it "reconstructs the
// real, full, prefix-included path Express itself parsed" — and for this
// one shape, byte-for-byte, it did not. Fixed by dropping req.path's lone
// `/` when baseUrl already supplies the full path; every other shape
// (`req.path` empty, or a real sub-path like `/does-not-exist.js`) is
// unchanged.
//
// 2026-09-05 review (second pass, pre-existing). In dev mode, a request
// whose error is raised before Express ever enters a mounted router (e.g.
// `GET /%zz`'s malformed-percent-encoding URIError, thrown during the very
// first route-matching attempt at the top level) reaches this middleware's
// `res.on('finish')` with `req.baseUrl` still `undefined`, not `''` — the
// two are NOT the same value here despite both meaning "no mount prefix":
// string concatenation coerces `undefined` to the four-character literal
// `"undefined"`, so the plain `req.baseUrl + req.path` expression logged
// `"undefined/%zz"` — a real path that never existed, not the pathname
// Express actually parsed. Fixed by normalizing a nullish baseUrl to `''`
// before either branch runs.
function loggedPath(req: { baseUrl?: string; path: string }): string {
  const baseUrl = req.baseUrl ?? '';
  return req.path === '/' && baseUrl ? baseUrl : baseUrl + req.path;
}

export function requestLogger(): import('express').RequestHandler {
  return (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      logger.info('request', {
        method: req.method,
        path: loggedPath(req),
        status: res.statusCode,
        ms: Date.now() - start,
      });
    });
    next();
  };
}
