// "Delete Everything" vs. the PROCESS-MEMORY stores that learned about the
// writer's draft after E4's original verification (2026-09-04 privacy
// re-verification).
//
// tests/routes/session-delete.test.ts already covers the durable half (the
// session row is gone, a subsequent load reports empty) and
// tests/core/session-delete-reset-backups.test.ts covers the on-disk reset
// backups. This file covers the two stores that live only in RAM and are
// therefore invisible to both:
//
//   1. THE COLLABORATION REGISTRY + Y.DOC. A room minted by a session
//      outlives its SQLite file by up to COLLAB_ROOM_TTL_MS (24h) and its
//      Y.Doc holds the draft text in process memory for as long as the room
//      lives. Measured before the fix, in a live browser run: POST
//      /api/collab/token still answered 200 for a room whose session had just
//      completed "Delete Everything".
//
//   2. THE DOCTOR'S REPORT CACHE. A cached report is derived, not raw, but
//      its findings carry `location` strings built from the writer's own
//      sluglines ("Scene 3 (INT. THE BAR)"), so a report for a deleted draft
//      is writer-identifiable content sitting in memory.
//
// Every assertion here observes the store through the SAME surface a caller
// would (a follow-up HTTP request, or the doctor's own exported cache peek),
// not through a private handle — a purge that only satisfies an internal
// counter is not a purge.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, freshSessionId, type TestServer } from './helpers.ts';

const { collabRegistrySize, resetCollabRoomsForTesting } = await import('../../server/lib/collab-rooms.ts');
const { destroyAllRoomsForTesting } = await import('../../server/collab/yjs-server.ts');

async function post(server: TestServer, path: string, body: unknown, sid: string): Promise<Response> {
  return fetch(`${server.baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Session-Id': sid },
    body: JSON.stringify(body),
  });
}

// Both the slugline and the character cue carry a distinctive token, because
// a report's writer-identifiable content shows up in `location` strings under
// either shape ("Scene 3 (INT. THE BARQX)" or "Character: MARLAQX") depending
// on which pass fired.
const MARKER = 'QXDRILL';
const FOUNTAIN = `Title: THE ${MARKER} DELETION DRILL

INT. THE ${MARKER} BAR - NIGHT

A slugline distinctive enough to recognise inside a cached report.

MARLA${MARKER}
One line of dialogue.

EXT. ${MARKER} PIER - DAY

Rain on the boards.

MARLA${MARKER}
Another line.
`;

describe('routes — POST /api/session/delete purges the collaboration registry', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => {
    destroyAllRoomsForTesting();
    resetCollabRoomsForTesting();
    await server.close();
  });

  it('a room minted by the session stops being joinable once the session is deleted', async () => {
    const sid = freshSessionId();
    const created = await post(server, '/api/collab/rooms', {}, sid);
    assert.equal(created.status, 200);
    const { roomId } = await created.json() as { roomId: string };

    // Precondition: the capability works right now.
    assert.equal((await post(server, '/api/collab/token', { roomId }, sid)).status, 200);

    const deleted = await post(server, '/api/session/delete', {}, sid);
    assert.equal(deleted.status, 200);
    const body = await deleted.json() as { collabRoomsPurged: number };
    assert.equal(body.collabRoomsPurged, 1, 'the response reports the room it forgot');

    // The whole point: the id is now indistinguishable from one that was
    // never minted (server/routes/collab.ts's single REFUSAL).
    const after = await post(server, '/api/collab/token', { roomId }, sid);
    assert.equal(after.status, 404, 'a deleted session\'s room must no longer mint tokens');
  });

  it('purges every room the session created, not just the most recent one', async () => {
    const sid = freshSessionId();
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const res = await post(server, '/api/collab/rooms', {}, sid);
      ids.push((await res.json() as { roomId: string }).roomId);
    }
    const body = await (await post(server, '/api/session/delete', {}, sid)).json() as { collabRoomsPurged: number };
    assert.equal(body.collabRoomsPurged, 3);
    for (const roomId of ids) {
      assert.equal((await post(server, '/api/collab/token', { roomId }, sid)).status, 404, roomId);
    }
  });

  it('never purges a room another session created', async () => {
    const mine = freshSessionId();
    const theirs = freshSessionId();
    const theirRoom = (await (await post(server, '/api/collab/rooms', {}, theirs)).json() as { roomId: string }).roomId;
    await post(server, '/api/collab/rooms', {}, mine);

    const sizeBefore = collabRegistrySize();
    const body = await (await post(server, '/api/session/delete', {}, mine)).json() as { collabRoomsPurged: number };
    assert.equal(body.collabRoomsPurged, 1);
    assert.equal(collabRegistrySize(), sizeBefore - 1);
    assert.equal(
      (await post(server, '/api/collab/token', { roomId: theirRoom }, theirs)).status,
      200,
      'another writer\'s room must still be joinable',
    );
  });

  it('deleting a session that never created a room reports zero and still succeeds', async () => {
    const sid = freshSessionId();
    const body = await (await post(server, '/api/session/delete', {}, sid)).json() as {
      status: string; collabRoomsPurged: number;
    };
    assert.equal(body.status, 'deleted');
    assert.equal(body.collabRoomsPurged, 0);
  });
});

describe('routes — POST /api/session/delete purges the doctor report cache', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  it('a report cached for the writer\'s script is gone from process memory afterwards', async () => {
    const sid = freshSessionId();
    const run = await post(server, '/api/scriptide/doctor', { fountain: FOUNTAIN }, sid);
    assert.equal(run.status, 200);

    // Observed through the doctor's own coordinator-side peek — the exact
    // function runScriptDoctorOffThread consults before dispatching, so a
    // hit here IS a hit on the live serving path.
    const { doctorCachePeek } = await import('../../server/nvm/analyze/doctor.ts');
    const cachedBefore = doctorCachePeek(FOUNTAIN);
    assert.ok(cachedBefore, 'precondition: the run really did populate the cache');
    assert.ok(
      JSON.stringify(cachedBefore).includes(MARKER),
      'precondition: a cached report really does carry the writer\'s own words '
      + '(a slugline or a character name, via each finding\'s `location`) — '
      + 'if this ever stops holding, the cache stopped being writer-identifiable '
      + 'and this suite should be re-argued, not deleted',
    );

    const deleted = await post(server, '/api/session/delete', {}, sid);
    assert.equal(deleted.status, 200);
    assert.equal((await deleted.json() as { doctorCacheCleared: boolean }).doctorCacheCleared, true);

    assert.equal(
      doctorCachePeek(FOUNTAIN),
      undefined,
      'the cached report must not survive the wipe that deleted the script it describes',
    );
  });

  it('the surface still works after the purge — the next run recomputes rather than erroring', async () => {
    const sid = freshSessionId();
    const again = await post(server, '/api/scriptide/doctor', { fountain: FOUNTAIN }, sid);
    assert.equal(again.status, 200);
    const report = await again.json() as { health: number };
    assert.equal(typeof report.health, 'number');
  });
});
