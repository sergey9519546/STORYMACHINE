import express from 'express';
import compression from 'compression';
import path from 'path';
import { logger } from './lib/logger.ts';
import { requestLogger } from './lib/request-logger.ts';
import { ValidationError, SessionBusyError, SessionCapacityError, gameLimiter } from './lib/session-store.ts';
import configRouter      from './routes/config.ts';
import gameRouter        from './routes/game.ts';
import scriptideRouter   from './routes/scriptide.ts';
import nvmRouter         from './routes/nvm.ts';
import exportRouter      from './routes/export.ts';
import coverageLetterRouter from './routes/coverage-letter.ts';
import collabRouter      from './routes/collab.ts';
import eventsRouter      from './routes/events.ts';
import aiProvidersRouter from './routes/ai-providers.ts';
import liveRouter        from './routes/live.ts';
import criticsRouter     from './routes/critics.ts';

export interface CreateAppOptions {
  /**
   * Serve the built SPA (prod: static `dist/`; dev: Vite middleware).
   * Route-level tests set this to false — they only exercise `/api/*` and
   * don't need a Vite dev server or a built `dist/` directory to exist.
   * Defaults to true so server.ts's production behavior is unchanged.
   */
  serveStatic?: boolean;
}

/**
 * Builds the Express app: middleware, routers, error handler, and (optionally)
 * static/SPA serving. Extracted from server.ts so tests can boot the same app
 * in-process via `fetch` without going through `startServer()`'s env preflight,
 * port binding, or process-lifecycle wiring.
 */
export async function createApp(opts: CreateAppOptions = {}): Promise<express.Express> {
  const { serveStatic = true } = opts;

  const app = express();
  app.disable('x-powered-by'); // don't advertise the framework

  // ── Reverse-proxy IP trust (opt-in only) ────────────────────────────────────
  // gameLimiter/aiLimiter/heavyBodyLimiter (server/lib/session-store.ts) use
  // express-rate-limit's default keying, which is `req.ip` — Express's IP,
  // which by default is the raw socket address. Deployed behind a reverse
  // proxy/load balancer (nginx, Cloudflare, a PaaS edge) every request arrives
  // from the proxy's own IP, so `req.ip` is the SAME value for every visitor —
  // the three limiters silently collapse into one shared, trivially-exhausted
  // budget for the whole deployment rather than a per-client one. Fixing this
  // requires Express to read the real client IP out of `X-Forwarded-For`,
  // which only `app.set('trust proxy', ...)` enables.
  //
  // That trust is NOT unconditional here: `X-Forwarded-For` is an ordinary
  // request header, so any direct (non-proxied) client can forge it to spoof
  // an arbitrary IP and dodge/target rate limits or IP-based logging. Setting
  // `trust proxy` unconditionally would make every deployment — including the
  // common case of running directly on a port with no proxy in front — trust
  // that forgeable header. Instead this is opt-in via TRUST_PROXY, which the
  // operator sets ONLY when a reverse proxy actually terminates in front of
  // this process (see README's Deployment section):
  //   TRUST_PROXY=1        → trust exactly one hop (typical single reverse
  //                          proxy / load balancer in front of this process).
  //   TRUST_PROXY=<number> → trust that many hops (Express's numeric mode).
  //   TRUST_PROXY=<anything else> → passed through as-is (Express also
  //                          accepts 'loopback', a specific IP/CIDR, or a
  //                          comma-separated list — see Express's `trust
  //                          proxy` docs for the exact semantics).
  // Unset (the default): no trust-proxy config is applied — `req.ip` stays
  // socket-address-only, matching Express's own default.
  const trustProxy = process.env.TRUST_PROXY;
  if (trustProxy) {
    const hops = Number(trustProxy);
    app.set('trust proxy', Number.isInteger(hops) ? hops : trustProxy);
  }

  app.use(express.json({ limit: '1mb' }));
  // requestLogger() (server/lib/logger.ts) logs { method, path, status, ms }
  // per request, where `path` is Express's `req.path` — the parsed URL
  // *pathname only*; per Express/Node's `url.parse` semantics, `req.path`
  // never includes the query string (that's `req.url` / `req.originalUrl`,
  // neither of which this logger reads). This is deliberate and load-bearing,
  // not incidental: SSE call sites (e.g. GET /api/run-room-stream) can't
  // set the X-Session-Id header the way fetch()-based callers do, so
  // src/lib/session.ts's withSession() instead appends the session id as a
  // `?sessionId=...` query param (see server/lib/session-store.ts's
  // sessionId() precedence-1 comment). A session id is a per-user isolation
  // capability — logging it verbatim, request after request, would let
  // anyone with log access impersonate that session's Stage. Because
  // `req.path` structurally excludes the query string, that capability never
  // reaches a log line today, on this route or any other.
  //
  // Verified with certainty this is the ONLY place in server/** that logs
  // per-request path/URL data: the global error handler below (`path:
  // req.path`) uses the same pathname-only field, and a repo-wide grep of
  // server/** for `req.url` / `req.originalUrl` turns up exactly one other
  // hit (server/collab/yjs-server.ts, parsing a WS upgrade request's room id
  // and auth token — never logged raw; only the parsed `room` value is
  // logged). Nothing in server/** logs a full URL or query string anywhere,
  // so there is no redaction to wire in — this comment documents *why*
  // that's true and safe by construction, rather than incidental.
  app.use(requestLogger());
  // Assign a trace ID to every request for correlation across logs.
  app.use((_req, res, next) => { res.locals.traceId = crypto.randomUUID(); next(); });

  // ── Security headers ─────────────────────────────────────────────────────────
  // Hand-set (no dependency) and applied to every response, including static
  // assets.
  //
  // Content-Security-Policy is gated to NODE_ENV==='production' only — that's
  // exactly the branch (below, "Static serving") where app.ts serves the
  // built dist/ instead of Vite's dev middleware. Vite dev mode injects its
  // own inline HMR client script and needs eval() for fast refresh; a policy
  // strict enough to be worth anything would break that, and a policy loose
  // enough not to would be noise. Production serves a build with no such
  // needs (verified against the actual `npm run build` output, dist/, below),
  // so dev mode is left exactly as before: no CSP header at all.
  //
  // Policy derivation (verified against dist/ produced by `npm run build`):
  //   - script-src 'self': dist/index.html's only <script> is the bundled,
  //     same-origin `/assets/index-*.js` entry; no inline <script>, no CDN.
  //   - style-src 'self' 'unsafe-inline': dist/index.html has no inline
  //     <style>/style="" of its own, but two bundled dependencies write
  //     inline style at runtime and would break under a strict style-src:
  //     the `motion` (Framer Motion) vendor chunk animates by setting
  //     `el.style.transform`/`el.style.display` directly (grepped in
  //     dist/assets/vendor-motion-*.js), and CodeMirror (ScriptIDE's editor)
  //     injects its theme as a runtime-created <style> element (its
  //     StyleModule mechanism) rather than a static stylesheet. Neither
  //     supports CSP nonces, so 'unsafe-inline' is the only workable
  //     mitigation short of ripping out both — scoped to style-src only,
  //     never script-src, so it can't be used to run script.
  //   - img-src 'self' data:: CodeMirror also emits `data:image/svg+xml`
  //     background-image URLs for its gutter markers (grepped in
  //     dist/assets/ScriptIDE-*.js) — those need img-src, not style-src, to
  //     load.
  //   - font-src 'self': no data:/CDN font URLs found in dist/assets/*.css.
  //   - connect-src 'self': every API call and the /api/run-room-stream SSE
  //     stream is same-origin fetch/EventSource; per the CSP spec,
  //     'self' for connect-src also covers same-origin ws:/wss: (the collab
  //     WebSocket at /collab/:room), so no separate ws: entry is needed.
  //   - object-src 'none', base-uri 'self', frame-ancestors 'none': no
  //     <object>/<embed>, no <base>, and this app is never meant to be
  //     framed (X-Frame-Options: DENY below is the legacy form of the same
  //     rule) — belt-and-suspenders defaults with no functional cost.
  if (process.env.NODE_ENV === 'production') {
    const CSP = [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
    ].join('; ');
    app.use((_req, res, next) => {
      res.setHeader('Content-Security-Policy', CSP);
      next();
    });
  }

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    // Ignored over plain HTTP per spec; effective if ever served via TLS/proxy.
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
    next();
  });

  // ── Response compression (production only) ─────────────────────────────────
  // Gated to NODE_ENV==='production' for the same reason the CSP block above
  // is: dev serves through Vite's own middleware (which does its own asset
  // handling), so this only needs to cover the built `dist/` static files and
  // the JSON API responses below, both of which are production-only code
  // paths here. `compression` picks br (Node >=11 has native zlib brotli) or
  // gzip per the request's Accept-Encoding, negotiates via a `Vary` header,
  // and leaves anything under its size threshold (1kb default) uncompressed.
  //
  // filter EXCLUDES text/event-stream: mime-db marks it compressible (verified
  // — `compressible('text/event-stream')` returns true), but every SSE route
  // in server/routes/** (game.ts, scriptide.ts, nvm/revision.ts,
  // nvm/converge.ts — grepped exhaustively) depends on each `data: ...\n\n`
  // frame reaching the client as soon as it's written for live progress; the
  // default compressor buffers output before flushing, which would turn a
  // live-progress stream into one delayed burst at the end. Those routes all
  // call `res.setHeader('Content-Type', 'text/event-stream')` before their
  // first write, so it's already on `res` by the time `filter` runs (compression
  // calls its filter lazily, on the first write/end) — checking it here is a
  // response-shape check, not a route allowlist that could quietly drift.
  if (process.env.NODE_ENV === 'production') {
    app.use(compression({
      filter: (req, res) => {
        const contentType = res.getHeader('Content-Type');
        if (typeof contentType === 'string' && contentType.startsWith('text/event-stream')) return false;
        return compression.filter(req, res);
      },
    }));
  }

  app.use(configRouter);
  app.use(aiProvidersRouter);
  app.use(gameRouter);
  app.use(scriptideRouter);
  app.use(nvmRouter);
  app.use(exportRouter);
  app.use(coverageLetterRouter);
  app.use(collabRouter);
  app.use(eventsRouter);
  app.use(liveRouter);
  app.use(criticsRouter);

  // ── Unknown-/api-path 404 guard ──────────────────────────────────────────────
  // Terminal handler for any request (all methods) whose path starts with /api
  // but matched none of the routers above. Every real route in server/routes/*
  // is /api/-prefixed (verified repo-wide), so anything reaching this point is a
  // typo'd, removed, or probed endpoint. It MUST sit before the SPA fallback:
  // both Vite's dev middleware (appType 'spa') and the production `app.get('*')`
  // catch-all below answer any unmatched GET with index.html + 200, so without
  // this guard an unknown /api GET returns HTML with a success status and the
  // caller's res.json() parse fails far from the real cause. gameLimiter applies
  // per the repo-wide "every route takes a limiter" rule (CLAUDE.md) — this can
  // never trigger an LLM call, so the general tier (not aiLimiter) is correct,
  // and metering it keeps endpoint enumeration from being the one unthrottled
  // /api surface.
  app.use('/api', gameLimiter, (_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // ── Static serving ─────────────────────────────────────────────────────────
  if (serveStatic) {
    if (process.env.NODE_ENV !== 'production') {
      // Dynamically imported: route-level tests pass serveStatic:false and
      // never reach this branch, so they skip Vite's (relatively heavy)
      // module-load cost entirely rather than paying it on every test process.
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      // dist/assets/ is Vite's content-hashed build output (e.g.
      // index-B3kjzYWS.js) — any change to a file's content changes its
      // filename, so a stale cached copy can only ever be replaced by a new
      // URL, never silently served past a real change. That's what makes a
      // year-long `immutable` cache safe here specifically, unlike the rest
      // of dist/ (favicon.svg, fonts/*) which ship under their bare,
      // unhashed names and must keep revalidating instead.
      app.use('/assets', express.static(path.join(distPath, 'assets'), {
        maxAge: '1y',
        immutable: true,
      }));
      // A request under /assets/ that didn't match a real file must never
      // fall through to the SPA catch-all below — without this guard, a
      // typo'd asset URL, a bad CDN purge, or a path-traversal probe
      // (/assets/../../.env, percent-encoded variants — express.static's
      // underlying `send` already normalizes and refuses to serve outside
      // its root, so these just miss like any other 404 here) all got a 200
      // + index.html, which looks like a successful load right up until the
      // browser tries to execute HTML as the JS it asked for. Anything
      // reaching this point already missed the static mount above.
      app.use('/assets', (_req, res) => {
        res.status(404).json({ error: 'Not found' });
      });
      // `index: false`: express.static's own directory-index behavior would
      // otherwise serve dist/index.html directly for GET / with ITS default
      // cache headers, bypassing the explicit `no-cache` the catch-all below
      // sets — the exact inconsistency this option exists to prevent (verified:
      // without it, `/` and a deep link like `/some/route` disagreed on
      // Cache-Control even though both serve the identical file). Turning it
      // off routes every path, `/` included, through the one catch-all below,
      // so index.html gets the same explicit header no matter which URL asked
      // for it.
      app.use(express.static(distPath, { index: false }));
      app.get('*', (_req, res) => {
        // index.html must NOT share the long, immutable cache above: it is
        // the one file whose content legitimately changes on every deploy
        // (it's what points the browser at the current build's hashed asset
        // URLs), so it needs to be revalidated on every request rather than
        // served stale from a cache that thinks it's still the old build.
        res.setHeader('Cache-Control', 'no-cache');
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  // ── Global error handler ───────────────────────────────────────────────────
  // Always log full error + stack server-side; never expose internals to client.
  // Registered AFTER static serving (Vite dev middleware / express.static /
  // the SPA catch-all's res.sendFile) so it can actually catch errors raised
  // there: Express dispatches next(err) by walking FORWARD through the
  // middleware stack from the failing handler's position looking for the next
  // error-handling (4-arg) middleware — one registered earlier in the stack,
  // as this used to be, is never reached and falls through to Express's own
  // default error handler instead.
  app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    // Malformed JSON body — Express throws a SyntaxError with a 'body' property.
    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({ error: 'Invalid JSON in request body' });
      return;
    }
    // Application-level validation errors (e.g. bad sessionId format).
    if (err instanceof ValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    // Session lifecycle pressure is expected and retryable: never evict or
    // close an active command merely to satisfy a request. Keep it distinct
    // from an application fault so clients do not retry a 500 blindly.
    if (err instanceof SessionBusyError || err instanceof SessionCapacityError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    // Body over express.json()'s 1mb cap — body-parser throws a
    // PayloadTooLargeError (status 413, type 'entity.too.large') before any
    // route or zod validation runs. This is a routine client mistake, not a
    // server fault: without this branch it falls through to the generic 500
    // below and gets logged as unhandled_error, which is both the wrong
    // status code for an oversized request and log noise for something the
    // client — not this server — got wrong.
    if (('status' in err && (err as { status?: unknown }).status === 413) || (err as { type?: unknown }).type === 'entity.too.large') {
      res.status(413).json({ error: 'Request body too large' });
      return;
    }
    logger.error('unhandled_error', {
      message: err.message,
      stack: err.stack,
      method: req.method,
      // req.path, not req.url/req.originalUrl — same pathname-only,
      // query-excluding rationale documented at requestLogger()'s call site
      // above (capability-bearing query params like ?sessionId= must not
      // reach logs).
      path: req.path,
    });
    res.status(500).json({ error: 'Internal Server Error' });
  });

  return app;
}
