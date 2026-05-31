import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { initFromEnv } from './server/lib/ai-config.ts';
import { logger, requestLogger } from './server/lib/logger.ts';
import { sessions, PERSIST_SESSIONS, SESSION_DB_DIR, ValidationError } from './server/lib/session-store.ts';
import configRouter    from './server/routes/config.ts';
import gameRouter      from './server/routes/game.ts';
import scriptideRouter from './server/routes/scriptide.ts';
import nvmRouter       from './server/routes/nvm.ts';
import { attachCollabServer } from './server/collab/yjs-server.ts';

const AI_PROVIDER = process.env.AI_PROVIDER ?? 'gemini';
if (AI_PROVIDER === 'gemini' && !process.env.GEMINI_API_KEY) {
  console.error('FATAL: GEMINI_API_KEY environment variable is not set. Exiting.');
  process.exit(1);
}
if (AI_PROVIDER === 'openai-compat' && (!process.env.AI_BASE_URL || !process.env.AI_API_KEY)) {
  console.error('FATAL: AI_PROVIDER=openai-compat requires AI_BASE_URL and AI_API_KEY. Exiting.');
  process.exit(1);
}

initFromEnv();

async function startServer() {
  if (PERSIST_SESSIONS) {
    fs.mkdirSync(SESSION_DB_DIR, { recursive: true });
    logger.info('session_persistence', { dir: SESSION_DB_DIR });
  }

  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use(requestLogger());
  // Assign a trace ID to every request for correlation across logs.
  app.use((_req, res, next) => { res.locals.traceId = crypto.randomUUID(); next(); });

  app.use(configRouter);
  app.use(gameRouter);
  app.use(scriptideRouter);
  app.use(nvmRouter);

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
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  const PORT = Number(process.env.PORT ?? 3000);
  if (isNaN(PORT) || PORT < 1 || PORT > 65535) {
    console.error(`FATAL: Invalid PORT value "${process.env.PORT}". Must be 1–65535.`);
    process.exit(1);
  }
  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info('server_started', { port: PORT });
  });

  // P4: real-time collaboration — Yjs sync over WebSocket on /collab/:room.
  // Shares the HTTP server (and port); only claims the /collab upgrade path so
  // Vite's HMR WebSocket in dev is left untouched.
  attachCollabServer(server);

  // ── Graceful shutdown ────────────────────────────────────────────────────────
  const shutdown = (signal: string) => {
    logger.info('server_shutdown', { signal });
    server.close(() => {
      // Close all SQLite handles before exiting so WAL files are flushed cleanly.
      for (const { stage } of sessions.values()) {
        try { stage.close(); } catch { /* already closed */ }
      }
      process.exit(0);
    });
    // Hard-kill after 10s if in-flight requests haven't drained.
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

startServer();
