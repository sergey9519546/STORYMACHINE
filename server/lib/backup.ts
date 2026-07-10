// Online-safe session backup logic. See README.md "Backing it up safely" for
// the rationale: a raw `cp`/fs copy of a SQLite file that's mid-WAL-write is
// unsafe, so this uses better-sqlite3's Database.prototype.backup(dest) —
// SQLite's own online backup API, safe to call against a db that is open and
// in use by the running server. Pure logic lives here and takes an injected
// timestamp so it's deterministic under test; scripts/backup-sessions.ts is
// the CLI entrypoint that supplies a real Date.now().
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { logger } from './logger.ts';

export interface BackupOptions {
  /** Directory holding per-session .db files (or ':memory:' — no-op). */
  sessionDbDir: string;
  /** Directory under which a timestamped snapshot subdir is created. */
  backupRootDir: string;
  /** Injected clock value — pass Date.now() at the call site, never read it here. */
  now: number;
  /** Optional retention: delete snapshot dirs older than this many days. */
  retentionDays?: number;
  /** Optional retention: keep only the K most recent snapshot dirs. */
  retentionKeep?: number;
}

export interface BackupSummary {
  backedUp: number;
  skipped: number;
  destDir: string | null;
  /** Filenames (not full paths) of dbs that failed to back up. */
  skippedFiles: string[];
  /** True if sessionDbDir was ':memory:' or missing/empty — nothing to do. */
  noop: boolean;
}

function timestampLabel(now: number): string {
  // ISO-ish but filesystem-safe: 2026-07-10T12-34-56-789Z
  return new Date(now).toISOString().replace(/[:.]/g, '-');
}

/**
 * Back up every `<sessionId>.db` file in `sessionDbDir` into a fresh,
 * timestamped subdirectory of `backupRootDir`, using better-sqlite3's online
 * backup API. Never throws on a single database's failure — a locked or
 * corrupt db is logged and skipped so the rest of the batch still runs.
 */
export async function backupSessions(opts: BackupOptions): Promise<BackupSummary> {
  const { sessionDbDir, backupRootDir, now } = opts;

  if (sessionDbDir === ':memory:') {
    logger.info('backup: session store is in-memory, nothing to back up', { sessionDbDir });
    return { backedUp: 0, skipped: 0, destDir: null, skippedFiles: [], noop: true };
  }

  let entries: string[];
  try {
    entries = fs.readdirSync(sessionDbDir);
  } catch {
    logger.info('backup: session dir missing, nothing to back up', { sessionDbDir });
    return { backedUp: 0, skipped: 0, destDir: null, skippedFiles: [], noop: true };
  }

  const dbFiles = entries.filter((f) => f.endsWith('.db'));
  if (dbFiles.length === 0) {
    logger.info('backup: session dir empty, nothing to back up', { sessionDbDir });
    return { backedUp: 0, skipped: 0, destDir: null, skippedFiles: [], noop: true };
  }

  const destDir = path.join(backupRootDir, timestampLabel(now));
  fs.mkdirSync(destDir, { recursive: true });

  let backedUp = 0;
  const skippedFiles: string[] = [];

  for (const file of dbFiles) {
    const srcPath = path.join(sessionDbDir, file);
    const destPath = path.join(destDir, file);
    let db: Database.Database | null = null;
    try {
      db = new Database(srcPath, { readonly: true, fileMustExist: true });
      await db.backup(destPath);
      backedUp++;
    } catch (err) {
      skippedFiles.push(file);
      logger.warn('backup: skipping unbackupable session db', {
        file,
        error: err instanceof Error ? err.message : String(err),
      });
      // Clean up a partial/failed destination file if one was created.
      try { fs.rmSync(destPath, { force: true }); } catch { /* best effort */ }
    } finally {
      try { db?.close(); } catch { /* best effort */ }
    }
  }

  if (opts.retentionDays !== undefined || opts.retentionKeep !== undefined) {
    pruneBackups(backupRootDir, now, opts.retentionDays, opts.retentionKeep);
  }

  const summary: BackupSummary = {
    backedUp,
    skipped: skippedFiles.length,
    destDir,
    skippedFiles,
    noop: false,
  };
  logger.info('backup: complete', { ...summary });
  return summary;
}

/**
 * Delete old timestamped snapshot subdirectories of `backupRootDir`. Off by
 * default — callers must pass retentionDays and/or retentionKeep explicitly.
 * Never throws; a single unreadable/undeletable entry is skipped.
 */
export function pruneBackups(
  backupRootDir: string,
  now: number,
  retentionDays?: number,
  retentionKeep?: number,
): void {
  let entries: string[];
  try {
    entries = fs.readdirSync(backupRootDir);
  } catch {
    return;
  }

  const dirs = entries
    .map((name) => {
      const full = path.join(backupRootDir, name);
      let mtimeMs: number;
      try {
        const st = fs.statSync(full);
        if (!st.isDirectory()) return null;
        mtimeMs = st.mtimeMs;
      } catch {
        return null;
      }
      return { name, full, mtimeMs };
    })
    .filter((d): d is { name: string; full: string; mtimeMs: number } => d !== null)
    .sort((a, b) => b.mtimeMs - a.mtimeMs); // newest first

  const toDelete = new Set<string>();

  if (retentionKeep !== undefined && retentionKeep >= 0) {
    for (const d of dirs.slice(retentionKeep)) toDelete.add(d.full);
  }

  if (retentionDays !== undefined && retentionDays >= 0) {
    const cutoff = now - retentionDays * 24 * 60 * 60 * 1000;
    for (const d of dirs) {
      if (d.mtimeMs < cutoff) toDelete.add(d.full);
    }
  }

  for (const full of toDelete) {
    try {
      fs.rmSync(full, { recursive: true, force: true });
    } catch (err) {
      logger.warn('backup: failed to prune old snapshot', {
        dir: full,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
