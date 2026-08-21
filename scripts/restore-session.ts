#!/usr/bin/env node
// CLI wrapper for server/lib/backup.ts's restoreSession() — see README.md
// "Backing it up safely" for the manual cp-based fallback and the restore
// drill (tests/core/backup-restore-drill.test.ts) that proves this round-trips
// byte-exact against a running session store.
//
// Usage:
//   node --experimental-strip-types scripts/restore-session.ts <sessionId> <snapshotFile>
//
// <snapshotFile> is the specific `<sessionId>.db` file inside one of
// `npm run backup`'s timestamped snapshot directories, e.g.
// backup/2026-08-21T12-00-00-000Z/mysession.db — it need not share the
// destination sessionId (restoring a snapshot under a NEW id is always safe).
//
// Precondition: the destination session must be closed and not currently
// addressable — run `POST /api/session/delete` (or stop the server) first if
// restoring OVER the original id. Restoring under a fresh id has no such
// requirement.
//
// Env:
//   SESSION_DB_DIR   destination dir for the restored .db file (default: data/sessions)
import path from 'path';
import { restoreSession } from '../server/lib/backup.ts';

const [, , sessionId, snapshotFile] = process.argv;
if (!sessionId || !snapshotFile) {
  console.error('Usage: node --experimental-strip-types scripts/restore-session.ts <sessionId> <snapshotFile>');
  process.exit(1);
}

const sessionDbDir = process.env.SESSION_DB_DIR ?? path.join(process.cwd(), 'data', 'sessions');

async function main(): Promise<void> {
  const result = restoreSession({
    snapshotFile: path.resolve(snapshotFile),
    sessionDbDir,
    sessionId,
  });
  console.log(JSON.stringify({ status: 'restored', ...result }, null, 2));
}

main().catch((err) => {
  console.error('restore-session: fatal error', err);
  process.exit(1);
});
