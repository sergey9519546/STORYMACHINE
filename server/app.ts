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
  app.use(express.json({ limit: '1mb' }));
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
