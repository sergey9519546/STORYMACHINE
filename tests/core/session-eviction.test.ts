// Session eviction — idle-TTL sweep and MAX_SESSIONS-cap LRU eviction
// (server/lib/session-store.ts). Run 16 audit/hardening.
//
// This file runs its own PERSIST_SESSIONS-mode session store, isolated from
// every other test file: SESSION_DB_DIR is pointed at a fresh temp directory
// (not ':memory:', unlike tests/routes/helpers.ts's route-test harness) and
// MAX_SESSIONS is capped low, so cap-eviction can be exercised with a handful
// of real Stage instances instead of 100. Both env vars must be set before
// session-store.ts's first import, since SESSION_DB_DIR/MAX_SESSIONS are
// module-level consts read once at load time — see helpers.ts's own
// SESSION_DB_DIR comment for the identical constraint. Node's test runner
// isolates each *.test.ts file in its own process by default (documented at
// tests/routes/limiters.test.ts), so mutating process.env here cannot bleed
// into other test files.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sm-session-evict-'));
process.env.SESSION_DB_DIR = tmpDir;
process.env.MAX_SESSIONS = '3';

const {
  sessions, getOrCreateSession, destroySession, sweepIdleSessions,
  dbPathFor, PERSIST_SESSIONS, MAX_SESSIONS, SESSION_TTL_MS,
} = await import('../../server/lib/session-store.ts');

after(() => {
  for (const [, s] of sessions) { try { s.stage.close(); } catch { /* already closed */ } }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('session-store — PERSIST mode sanity', () => {
  it('this test file is exercising real file-backed persistence, not :memory:', () => {
    assert.equal(PERSIST_SESSIONS, true);
    assert.equal(MAX_SESSIONS, 3);
  });

  it('SESSION_TTL_MS has a generous, env-overridable default (not the old hardcoded 30 min)', () => {
    // Default is 24h (1440 min) when SESSION_IDLE_TTL_MINUTES is unset, which
    // is the case for this test file/process — confirms the constant is wired
    // to the env var rather than still hardcoded at the old 30-minute value.
    assert.equal(SESSION_TTL_MS, 1440 * 60 * 1000);
  });
});

describe('session eviction — idle TTL sweep (sweepIdleSessions)', () => {
  it('evicts a session idle past ttlMs: closes it, drops it from the map, but keeps its db file on disk', () => {
    const id = 'idle-session-aaaa';
    getOrCreateSession(id);
    assert.ok(sessions.has(id));
    const dbFile = dbPathFor(id);
    assert.ok(fs.existsSync(dbFile), 'db file should exist once the session is created');

    // Force it stale: lastAccess far enough in the past that (now - lastAccess)
    // exceeds the ttl passed to the sweep.
    const now = Date.now();
    sessions.get(id)!.lastAccess = now - 1000;
    const evicted = sweepIdleSessions(now, 500); // ttl 500ms, session idle 1000ms

    assert.ok(evicted.includes(id), 'sweep must report the idle session as evicted');
    assert.ok(!sessions.has(id), 'evicted session must be removed from the in-memory map');
    // The load-bearing PERSIST-mode guarantee: eviction is memory-only.
    assert.ok(fs.existsSync(dbFile), 'db file must survive idle eviction in PERSIST mode — only the handle closes');
  });

  it('a session accessed within the ttl window survives the sweep (no-fire case)', () => {
    const id = 'active-session-bbbb';
    getOrCreateSession(id);
    const now = Date.now();
    sessions.get(id)!.lastAccess = now - 100; // well within a 500ms ttl
    const evicted = sweepIdleSessions(now, 500);

    assert.ok(!evicted.includes(id), 'a recently-accessed session must not be reported as evicted');
    assert.ok(sessions.has(id), 'a recently-accessed session must still be in the map after the sweep');
  });

  it('sweeping when nothing is stale evicts nothing and leaves the map size unchanged (no-fire case)', () => {
    const sizeBefore = sessions.size;
    const evicted = sweepIdleSessions(Date.now(), 500);
    assert.deepEqual(evicted, []);
    assert.equal(sessions.size, sizeBefore);
  });
});

describe('session eviction — MAX_SESSIONS cap (LRU)', () => {
  // Reset to a clean slate regardless of what the TTL describe block above
  // left behind: sweepIdleSessions with a negative ttl evicts everything
  // currently tracked (now - lastAccess is always > a negative number for any
  // real past timestamp) without touching any db files, using only the
  // already-exported sweep function rather than a second reset mechanism.
  before(() => { sweepIdleSessions(Date.now(), -1); });

  it('starts from an empty in-memory session map', () => {
    assert.equal(sessions.size, 0);
  });

  it('evicts the least-recently-accessed session once the cap is exceeded (fire case)', () => {
    const ids = ['cap-1', 'cap-2', 'cap-3'];
    for (const id of ids) getOrCreateSession(id);
    assert.equal(sessions.size, 3, 'creating exactly MAX_SESSIONS sessions must not evict anything yet');

    // Stagger lastAccess deterministically so eviction order is unambiguous:
    // cap-1 oldest, cap-3 newest.
    const base = Date.now() - 30_000;
    ids.forEach((id, i) => { sessions.get(id)!.lastAccess = base + i * 1000; });

    const dbFileCap1 = dbPathFor('cap-1');
    assert.ok(fs.existsSync(dbFileCap1));

    // Creating a 4th session with the map already at the cap must evict the
    // single oldest (cap-1), not cap-2 or cap-3.
    getOrCreateSession('cap-4');

    assert.ok(!sessions.has('cap-1'), 'the least-recently-accessed session must be evicted at the cap');
    assert.ok(sessions.has('cap-2'), 'cap-2 (more recently accessed than cap-1) must survive');
    assert.ok(sessions.has('cap-3'), 'cap-3 (most recently accessed of the original three) must survive');
    assert.ok(sessions.has('cap-4'), 'the newly-created session must be present');
    assert.equal(sessions.size, 3, 'the map must stay at the cap, not grow past it');

    // Cap eviction, like idle eviction, is memory-only in PERSIST mode.
    assert.ok(fs.existsSync(dbFileCap1), 'db file for the cap-evicted session must survive on disk');
  });

  it('accessing an existing session (not creating a new one) never triggers cap eviction (no-fire case)', () => {
    // Map is at the cap (3) from the previous test: cap-2, cap-3, cap-4.
    assert.equal(sessions.size, 3);
    const sizeBefore = sessions.size;
    getOrCreateSession('cap-2'); // re-fetch, not a new id
    assert.equal(sessions.size, sizeBefore, 're-fetching an existing session must not change the map size');
    assert.ok(sessions.has('cap-3') && sessions.has('cap-4'), 'no unrelated session should be evicted on a cache hit');
  });
});

describe('session eviction — destroySession contrast (explicit delete vs. eviction close)', () => {
  it('unlike eviction, destroySession actually removes the db file (explicit user-initiated wipe)', () => {
    const id = 'explicit-destroy-cccc';
    getOrCreateSession(id);
    const dbFile = dbPathFor(id);
    assert.ok(fs.existsSync(dbFile));
    destroySession(id);
    assert.ok(!sessions.has(id));
    assert.ok(!fs.existsSync(dbFile), 'destroySession is the one path that deletes the persisted file');
  });
});
