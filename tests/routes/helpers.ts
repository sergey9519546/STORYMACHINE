// Shared harness for HTTP route tests. Boots the real Express app (via
// server/app.ts's createApp()) in-process on an OS-assigned port, so tests
// exercise actual routing/middleware/rate-limiter/validation behavior through
// real HTTP requests rather than calling handler functions directly.
import type { AddressInfo } from 'net';

// Route sessions created by these tests to in-memory SQLite instead of
// data/sessions/<id>.db on disk. Must be set before server/lib/session-store.ts
// is first evaluated (it reads SESSION_DB_DIR as a module-level const), so this
// runs ahead of the dynamic import below rather than as a static import — a
// static `import { createApp } from '../../server/app.ts'` at the top of this
// file would resolve its whole dependency graph, including session-store.ts,
// before this line ever ran.
process.env.SESSION_DB_DIR = ':memory:';

export interface TestServer {
  baseUrl: string;
  close: () => Promise<void>;
}

// serveStatic:false — route tests only need /api/*, /health, /metrics; skipping
// static/Vite-middleware setup keeps each test file's boot fast and avoids
// depending on a built dist/ directory.
export async function startTestServer(): Promise<TestServer> {
  const { createApp } = await import('../../server/app.ts');
  const app = await createApp({ serveStatic: false });
  const server = await new Promise<import('http').Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const { port } = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    }),
  };
}

// A fresh, regex-valid sessionId per test avoids state bleeding between tests
// that share the process (e.g. two tests both hitting getOrCreateSession).
let counter = 0;
export function freshSessionId(): string {
  counter += 1;
  return `test-session-${process.pid}-${counter}`;
}
