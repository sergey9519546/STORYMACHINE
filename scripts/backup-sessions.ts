#!/usr/bin/env node
// CLI wrapper for server/lib/backup.ts — see README.md "Backing it up
// safely" for usage, cron scheduling, and the restore procedure.
//
// Usage:
//   node --experimental-strip-types scripts/backup-sessions.ts [destDir]
//
// Env:
//   SESSION_DB_DIR         source dir of per-session .db files (default: data/sessions)
//   BACKUP_DIR             dest root dir for snapshots (default: backup), overridden by [destDir] arg
//   BACKUP_RETENTION_DAYS  optional: prune snapshot dirs older than N days
//   BACKUP_RETENTION_KEEP  optional: prune all but the K most recent snapshot dirs
import path from 'path';
import { backupSessions } from '../server/lib/backup.ts';

const sessionDbDir = process.env.SESSION_DB_DIR ?? path.join(process.cwd(), 'data', 'sessions');
const backupRootDir = process.argv[2] ?? process.env.BACKUP_DIR ?? path.join(process.cwd(), 'backup');
const retentionDays = process.env.BACKUP_RETENTION_DAYS ? Number(process.env.BACKUP_RETENTION_DAYS) : undefined;
const retentionKeep = process.env.BACKUP_RETENTION_KEEP ? Number(process.env.BACKUP_RETENTION_KEEP) : undefined;

async function main(): Promise<void> {
  const summary = await backupSessions({
    sessionDbDir,
    backupRootDir,
    now: Date.now(),
    retentionDays,
    retentionKeep,
  });

  console.log(JSON.stringify(summary, null, 2));

  if (summary.noop) {
    process.exit(0);
  }

  // Some dbs existed but every single one failed — that's cron-alert-worthy.
  if (summary.backedUp === 0 && summary.skipped > 0) {
    process.exit(1);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('backup-sessions: fatal error', err);
  process.exit(1);
});
