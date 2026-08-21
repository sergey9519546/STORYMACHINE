// S1 (docs/PATH_TO_EXCELLENCE.md Phase S) — backup cadence, :memory:-mode
// half. Companion to tests/core/backup-schedule-persist.test.ts, in its own
// process (same PERSIST_SESSIONS-can't-flip-mid-process reasoning): confirms
// startBackupSchedule() declines even a valid, positive BACKUP_INTERVAL_HOURS
// when SESSION_DB_DIR is ':memory:' — there is nothing on disk to back up, so
// scheduling a timer would be pure overhead with an always-noop payload.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

process.env.SESSION_DB_DIR = ':memory:';
process.env.BACKUP_INTERVAL_HOURS = '6';

const { PERSIST_SESSIONS } = await import('../../server/lib/session-store.ts');
const { startBackupSchedule } = await import('../../server.ts');

describe('startBackupSchedule() — :memory:-mode', () => {
  it('this test file is exercising :memory: mode, not real file persistence', () => {
    assert.equal(PERSIST_SESSIONS, false);
  });

  it('declines to schedule even with a valid positive BACKUP_INTERVAL_HOURS — nothing to back up', () => {
    assert.equal(process.env.BACKUP_INTERVAL_HOURS, '6', 'sanity: the interval really is set and valid');
    assert.equal(startBackupSchedule(), undefined);
  });
});
