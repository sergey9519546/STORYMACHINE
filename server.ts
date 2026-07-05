import 'dotenv/config';
import fs from 'fs';
import { initFromEnv } from './server/lib/ai-config.ts';
import { logger } from './server/lib/logger.ts';
import { sessions, PERSIST_SESSIONS, SESSION_DB_DIR } from './server/lib/session-store.ts';
import { createApp } from './server/app.ts';
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

  const app = await createApp();

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
