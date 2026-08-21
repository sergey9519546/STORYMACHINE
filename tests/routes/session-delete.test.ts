// E4 "delete everything" — the server half. POST /api/session/delete
// (server/routes/config.ts) calls destroySession() (server/lib/session-store.ts)
// on the CALLER's own session: evicts the in-memory Stage and, in PERSIST
// mode, unlinks the .db/-wal/-shm/-journal files. tests/routes/helpers.ts
// runs every route test against SESSION_DB_DIR=':memory:', so this file
// covers the in-memory eviction contract; PERSIST-mode file deletion itself
// is exercised by tests/core/session-eviction.test.ts and
// tests/routes/session-rotation-persistence.test.ts's existing coverage of
// destroySession's sibling primitives.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, freshSessionId, type TestServer } from './helpers.ts';

describe('routes — POST /api/session/delete ("delete everything")', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  it('deletes a session that had a saved ScriptIDE draft — a subsequent load reports empty', async () => {
    const sid = freshSessionId();

    const saveRes = await fetch(`${server.baseUrl}/api/scriptide/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Session-Id': sid },
      body: JSON.stringify({
        scriptText: 'INT. VAULT - NIGHT\n\nSomething worth deleting.',
        snapshots: [], characters: [], researchNotes: [], isDarkMode: false,
        expectedUpdatedAt: null,
      }),
    });
    assert.equal(saveRes.status, 200);

    const loadBefore = await fetch(`${server.baseUrl}/api/scriptide/load?sessionId=${sid}`);
    const bodyBefore = await loadBefore.json();
    assert.equal(bodyBefore.status, 'ok');
    assert.equal(bodyBefore.scriptText, 'INT. VAULT - NIGHT\n\nSomething worth deleting.');

    const deleteRes = await fetch(`${server.baseUrl}/api/session/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Session-Id': sid },
      body: JSON.stringify({}),
    });
    assert.equal(deleteRes.status, 200);
    const deleteBody = await deleteRes.json();
    assert.equal(deleteBody.status, 'deleted');
    assert.equal(deleteBody.sessionId, sid);

    const loadAfter = await fetch(`${server.baseUrl}/api/scriptide/load?sessionId=${sid}`);
    const bodyAfter = await loadAfter.json();
    assert.equal(bodyAfter.status, 'empty');
    assert.equal(bodyAfter.scriptText, '');
  });

  it('deleting a session that never existed still succeeds (idempotent, no data to lose)', async () => {
    const sid = freshSessionId();
    const res = await fetch(`${server.baseUrl}/api/session/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Session-Id': sid },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'deleted');
    assert.equal(body.sessionId, sid);
  });

  it('deletes only the caller\'s own session, leaving a different session untouched', async () => {
    const sidA = freshSessionId();
    const sidB = freshSessionId();

    for (const [sid, text] of [[sidA, 'DRAFT A'], [sidB, 'DRAFT B']] as const) {
      const res = await fetch(`${server.baseUrl}/api/scriptide/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Session-Id': sid },
        body: JSON.stringify({
          scriptText: text, snapshots: [], characters: [], researchNotes: [],
          isDarkMode: false, expectedUpdatedAt: null,
        }),
      });
      assert.equal(res.status, 200);
    }

    const deleteRes = await fetch(`${server.baseUrl}/api/session/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Session-Id': sidA },
      body: JSON.stringify({}),
    });
    assert.equal(deleteRes.status, 200);

    const loadA = await fetch(`${server.baseUrl}/api/scriptide/load?sessionId=${sidA}`);
    assert.equal((await loadA.json()).status, 'empty');

    const loadB = await fetch(`${server.baseUrl}/api/scriptide/load?sessionId=${sidB}`);
    const bodyB = await loadB.json();
    assert.equal(bodyB.status, 'ok');
    assert.equal(bodyB.scriptText, 'DRAFT B');
  });

  it('rejects a body with unexpected fields (zod .strict())', async () => {
    const sid = freshSessionId();
    const res = await fetch(`${server.baseUrl}/api/session/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Session-Id': sid },
      body: JSON.stringify({ targetSessionId: 'someone-elses-session' }),
    });
    assert.equal(res.status, 400);
  });

  it('accepts an empty/omitted body (matches AiConfigTestBodySchema-style bodyless-POST tolerance)', async () => {
    const sid = freshSessionId();
    const res = await fetch(`${server.baseUrl}/api/session/delete`, {
      method: 'POST',
      headers: { 'X-Session-Id': sid },
    });
    assert.equal(res.status, 200);
  });
});
