import express from 'express';
import path from 'path';
import { logger, requestLogger } from './lib/logger.ts';
import { ValidationError } from './lib/session-store.ts';
import configRouter    from './routes/config.ts';
import gameRouter      from './routes/game.ts';
import scriptideRouter from './routes/scriptide.ts';
import nvmRouter       from './routes/nvm.ts';
import exportRouter    from './routes/export.ts';
import collabRouter    from './routes/collab.ts';

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
  // not incidental: SSE call sites (e.g. GET /api/scriptide/complete) can't
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
  // assets. No Content-Security-Policy: Vite's dev-mode inline scripts and HMR
  // would need a nonce/unsafe-inline policy that weakens it to noise — revisit
  // if the app is ever served exclusively from a production build.
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

  app.use(configRouter);
  app.use(gameRouter);
  app.use(scriptideRouter);
  app.use(nvmRouter);
  app.use(exportRouter);
  app.use(collabRouter);

  // ── Global error handler ───────────────────────────────────────────────────
  // Always log full error + stack server-side; never expose internals to client.
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
      app.use(express.static(distPath));
      app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
    }
  }

  return app;
}
