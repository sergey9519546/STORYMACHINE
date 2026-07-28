// Online-safe session backup logic. See README.md "Backing it up safely" for
// the rationale: a raw `cp`/fs copy of a SQLite file that's mid-WAL-write is
// unsafe, so this uses better-sqlite3's Database.prototype.backup(dest) —
// SQLite's own online backup API, safe to call against a db that is open and
// in use by the running server. Pure logic lives here and takes an injected
// timestamp so it's deterministic under test; scripts/backup-sessions.ts is
// the CLI entrypoint that supplies a real Date.now().
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import { logger } from './logger.ts';
import type { Stage } from '../engine/Stage.ts';

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
 * Create one verified recovery artifact from the exact live Stage handle.
 * The artifact is built and checked under a unique temporary name, then
 * published without replacement only after SQLite integrity and schema checks
 * succeed. A failure never removes an existing recovery artifact.
 */
export async function createVerifiedBackup(stage: Stage, destination: string): Promise<void> {
  const destinationDir = path.dirname(destination);
  const tempPath = path.join(destinationDir, `.storymachine-backup-${randomUUID()}.tmp`);
  const sqliteSuffixes = ['', '-wal', '-shm', '-journal'] as const;
  let verificationDb: Database.Database | null = null;
  let tempReserved = false;

  try {
    fs.mkdirSync(destinationDir, { recursive: true });
    if (sqliteSuffixes.some(suffix => fs.existsSync(destination + suffix))) {
      throw new Error(`Refusing to replace an existing backup: ${destination}`);
    }

    // Reserve a private same-directory staging path. The destination is not
    // observable as a recovery artifact until verification completes.
    // A reset recovery artifact can contain the full writer project. On
    // POSIX, create the private staging inode with owner-only permissions;
    // Windows applies its normal ACL inheritance instead.
    const tempFd = fs.openSync(tempPath, 'wx', 0o600);
    fs.closeSync(tempFd);
    tempReserved = true;
    await stage.backupTo(tempPath);

    verificationDb = new Database(tempPath, { readonly: true, fileMustExist: true });
    const integrity = verificationDb.pragma('quick_check', { simple: true });
    if (integrity !== 'ok') {
      throw new Error(`Backup integrity check failed: ${String(integrity)}`);
    }
    const sourceVersion = stage.getSchemaVersion();
    const destinationVersion = verificationDb.pragma('user_version', { simple: true }) as number;
    if (destinationVersion !== sourceVersion) {
      throw new Error(`Backup schema version mismatch: source=${sourceVersion}, destination=${destinationVersion}`);
    }
    verificationDb.close();
    verificationDb = null;

    // A readonly verification handle can leave empty sidecars. They are not
    // part of a standalone recovery file.
    for (const suffix of sqliteSuffixes.slice(1)) {
      try { fs.rmSync(tempPath + suffix, { force: true }); } catch { /* final cleanup repeats below */ }
    }
    if (sqliteSuffixes.some(suffix => fs.existsSync(destination + suffix))) {
      throw new Error(`Refusing to replace an existing backup: ${destination}`);
    }

    // linkSync is a same-volume no-clobber publish: EEXIST is a safe failure
    // rather than a replacement. Removing the staging link leaves the verified
    // inode at the stable destination.
    fs.linkSync(tempPath, destination);
    try {
      fs.rmSync(tempPath, { force: true });
    } catch {
      // The published copy is already durable. Keep the reservation flag true
      // so final cleanup gets another chance to remove only the private link.
    }
    tempReserved = fs.existsSync(tempPath);
  } finally {
    try { verificationDb?.close(); } catch { /* best effort */ }
    if (tempReserved) {
      for (const suffix of sqliteSuffixes) {
        try { fs.rmSync(tempPath + suffix, { force: true }); } catch { /* best effort */ }
      }
    }
  }
}

const RESET_BACKUP_FILENAME = /^\d+-[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\.db$/i;
const RESET_BACKUP_SESSION_DIRECTORY = /^[A-Za-z0-9_-]{1,64}$/;
const SQLITE_SIDECARS = ['', '-wal', '-shm', '-journal'] as const;

export interface ResetBackupRetention {
  /** Maximum generated recovery files retained for one session. At least one. */
  keep: number;
  /** Generated files older than this are pruned unless minimumRetained protects them. */
  maxAgeMs: number;
  /** Never prune below this many newest files during a pre-publish pass. */
  minimumRetained?: number;
  /**
   * Generated recovery artifacts that must survive this pruning pass. This is
   * used immediately after publishing a reset receipt so timestamp-resolution
   * ties cannot select the just-created artifact for deletion instead of an
   * older one.
   */
  protectedNames?: readonly string[];
  /** Injectable wall clock for deterministic tests. */
  now?: number;
}

export interface ResetBackupPruneSummary {
  removed: string[];
  retained: string[];
}

function resetBackupArtifactPath(directory: string, filename: string): string {
  const root = path.resolve(directory);
  const target = path.resolve(root, filename);
  if (path.dirname(target) !== root || !RESET_BACKUP_FILENAME.test(filename)) {
    throw new Error('Refusing to prune a path outside the generated reset-backup namespace');
  }
  return target;
}

/**
 * Prune only generated, per-session reset recovery files. This intentionally
 * never walks directories or touches a manually supplied artifact. Callers
 * preserve at least one existing file before publishing a replacement so a
 * failed new backup cannot erase the last recovery point.
 */
export function pruneSessionResetBackups(
  directory: string,
  { keep, maxAgeMs, minimumRetained = 0, protectedNames = [], now = Date.now() }: ResetBackupRetention,
): ResetBackupPruneSummary {
  if (!Number.isSafeInteger(keep) || keep < 1) throw new Error('Reset backup retention keep must be a positive integer');
  if (!Number.isSafeInteger(minimumRetained) || minimumRetained < 0) throw new Error('Reset backup minimum retention must be a non-negative integer');
  if (minimumRetained > keep) throw new Error('Reset backup minimum retention cannot exceed keep');
  if (!Number.isFinite(maxAgeMs) || maxAgeMs <= 0) throw new Error('Reset backup maximum age must be positive');
  if (protectedNames.some(name => !RESET_BACKUP_FILENAME.test(name))) {
    throw new Error('Reset backup protected name must be a generated recovery artifact');
  }

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { removed: [], retained: [] };
    throw error;
  }

  const records = entries
    .filter(entry => entry.isFile() && RESET_BACKUP_FILENAME.test(entry.name))
    .map(entry => {
      const file = resetBackupArtifactPath(directory, entry.name);
      return { name: entry.name, file, mtimeMs: fs.statSync(file).mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs || b.name.localeCompare(a.name));

  const protectedSet = new Set(protectedNames);
  const protectedCount = records.filter(record => protectedSet.has(record.name)).length;
  if (protectedCount + minimumRetained > keep) {
    throw new Error('Reset backup protected and minimum retention exceed keep');
  }
  const regularCapacity = keep - protectedCount;

  const removed: string[] = [];
  const retained: string[] = [];
  let retainedRegular = 0;
  for (const record of records) {
    const protectedByReceipt = protectedSet.has(record.name);
    const protectedByMinimum = retainedRegular < minimumRetained;
    const expired = now - record.mtimeMs > maxAgeMs;
    const canRetainRegular = retainedRegular < regularCapacity;
    if (!protectedByReceipt && (!canRetainRegular || (!protectedByMinimum && expired))) {
      for (const suffix of SQLITE_SIDECARS) fs.rmSync(record.file + suffix, { force: true });
      removed.push(record.name);
    } else {
      retained.push(record.name);
      if (!protectedByReceipt) retainedRegular++;
    }
  }
  return { removed, retained };
}

/**
 * Sweep a reset-backup root without recursing into arbitrary operator files.
 * Only capability-safe session directory names and generated artifact names
 * are eligible, so manually placed files remain untouched.
 */
export function pruneAllSessionResetBackups(
  root: string,
  retention: Omit<ResetBackupRetention, 'minimumRetained'>,
): ResetBackupPruneSummary {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { removed: [], retained: [] };
    throw error;
  }

  const removed: string[] = [];
  const retained: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !RESET_BACKUP_SESSION_DIRECTORY.test(entry.name)) continue;
    const summary = pruneSessionResetBackups(path.join(root, entry.name), retention);
    removed.push(...summary.removed.map(filename => path.join(entry.name, filename)));
    retained.push(...summary.retained.map(filename => path.join(entry.name, filename)));
  }
  return { removed, retained };
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
