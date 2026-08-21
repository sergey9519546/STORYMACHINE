// S1 (docs/PATH_TO_EXCELLENCE.md Phase S) — backup cadence, PERSIST-mode
// half. server.ts's startBackupSchedule() gives the existing backup logic
// (server/lib/backup.ts, the same code `npm run backup` runs) an opt-in,
// env-configured in-process interval instead of leaving scheduling entirely
// to an operator's own cron entry.
//
// SESSION_DB_DIR points at a real temp directory (not ':memory:') set BEFORE
// server.ts's first import, so PERSIST_SESSIONS is true in this process —
// isolated in its own process, per Node's test-runner default (see
// tests/core/session-eviction.test.ts's identical rationale), so this file's
// env-var mutations can't bleed into (or be bled into by) any other test
// file. The :memory:-mode "always off" half of this contract lives in the
// sibling tests/core/backup-schedule-memory.test.ts, in its own process, for
// the same reason PERSIST_SESSIONS can't be flipped mid-process.
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sm-backup-schedule-persist-'));
process.env.SESSION_DB_DIR = tmpDir;

const { PERSIST_SESSIONS } = await import('../../server/lib/session-store.ts');
const { startBackupSchedule } = await import('../../server.ts');

const activeTimers: NodeJS.Timeout[] = [];
after(() => {
  for (const timer of activeTimers) clearInterval(timer);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.BACKUP_INTERVAL_HOURS;
  delete process.env.BACKUP_DIR;
});

describe('startBackupSchedule() — PERSIST-mode', () => {
  it('this test file is exercising real PERSIST-mode file storage, not :memory:', () => {
    assert.equal(PERSIST_SESSIONS, true);
  });

  it('does nothing when BACKUP_INTERVAL_HOURS is unset — off by default (keyless-first minimalism)', () => {
    delete process.env.BACKUP_INTERVAL_HOURS;
    assert.equal(startBackupSchedule(), undefined);
  });

  it('does nothing for 0, a negative value, or a non-numeric value (fails safe, not crash)', () => {
    for (const value of ['0', '-1', 'not-a-number', '']) {
      process.env.BACKUP_INTERVAL_HOURS = value;
      assert.equal(startBackupSchedule(), undefined, `expected no timer for BACKUP_INTERVAL_HOURS=${JSON.stringify(value)}`);
    }
  });

  it('registers a real, unref\'d interval timer once BACKUP_INTERVAL_HOURS is a positive number (fire case)', () => {
    const backupDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sm-backup-schedule-out-'));
    try {
      process.env.BACKUP_INTERVAL_HOURS = '6';
      process.env.BACKUP_DIR = backupDir;
      const timer = startBackupSchedule();
      assert.ok(timer, 'expected a real interval handle for a valid positive BACKUP_INTERVAL_HOURS');
      activeTimers.push(timer!);
      // Registering the schedule itself must not eagerly run a backup — only
      // the (long-period) interval callback does, on its own future tick.
      assert.equal(fs.readdirSync(backupDir).length, 0,
        'starting the schedule must not itself perform a backup synchronously');
    } finally {
      fs.rmSync(backupDir, { recursive: true, force: true });
    }
  });
});
