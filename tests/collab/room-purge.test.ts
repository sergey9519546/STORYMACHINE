// "Delete Everything" vs. the live collaboration document.
//
// tests/routes/session-delete-memory-stores.test.ts proves the CAPABILITY is
// revoked (the registry forgets the room, so no further token is minted). That
// is only half of it: the room's Y.Doc holds the writer's draft text in
// process memory, and a Y.Doc is kept alive across disconnects by design
// ("evicted lazily under load", server/collab/yjs-server.ts) — on a quiet
// single-writer deployment, never. This file boots the real HTTP server with
// the real collab upgrade handler, opens a real WebSocket into a real room,
// and proves that the delete destroys the DOCUMENT and closes the socket, not
// just the registry row.
//
// Same harness shape as tests/collab/websocket.test.ts, deliberately: this is
// the same server wiring (createApp + attachCollabServer, exactly as
// server.ts assembles them), driven with the same raw `ws` client.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import WebSocket from 'ws';

process.env.SESSION_DB_DIR = ':memory:';

let baseHttpUrl: string;
let baseWsUrl: string;
let server: Server;
let collabRoomCount: () => number;
let destroyAllRoomsForTesting: () => void;
let resetCollabRoomsForTesting: () => void;

before(async () => {
  const { createApp } = await import('../../server/app.ts');
  const collabServer = await import('../../server/collab/yjs-server.ts');
  const collabRooms = await import('../../server/lib/collab-rooms.ts');
  collabRoomCount = collabServer.collabRoomCount;
  destroyAllRoomsForTesting = collabServer.destroyAllRoomsForTesting;
  resetCollabRoomsForTesting = collabRooms.resetCollabRoomsForTesting;
  const app = await createApp({ serveStatic: false });
  server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  collabServer.attachCollabServer(server);
  const { port } = server.address() as AddressInfo;
  baseHttpUrl = `http://127.0.0.1:${port}`;
  baseWsUrl = `ws://127.0.0.1:${port}`;
});

after(async () => {
  destroyAllRoomsForTesting();
  resetCollabRoomsForTesting();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

let sessionCounter = 0;
function freshSession(): string {
  sessionCounter += 1;
  return `collab-purge-${process.pid}-${sessionCounter}`;
}

async function mintRoomAndToken(sessionId: string): Promise<{ roomId: string; token: string }> {
  const headers = { 'Content-Type': 'application/json', 'X-Session-Id': sessionId };
  const roomRes = await fetch(`${baseHttpUrl}/api/collab/rooms`, { method: 'POST', headers, body: '{}' });
  assert.equal(roomRes.status, 200);
  const { roomId } = await roomRes.json() as { roomId: string };
  const tokenRes = await fetch(`${baseHttpUrl}/api/collab/token`, {
    method: 'POST', headers, body: JSON.stringify({ roomId }),
  });
  assert.equal(tokenRes.status, 200);
  const { token } = await tokenRes.json() as { token: string };
  return { roomId, token };
}

function open(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.on('open', () => resolve(ws));
    ws.on('unexpected-response', () => reject(new Error('upgrade refused')));
    ws.on('error', (err) => reject(err));
  });
}

function attempt(url: string): Promise<'open' | 'rejected'> {
  return new Promise((resolve) => {
    const ws = new WebSocket(url);
    ws.on('open', () => { ws.close(); resolve('open'); });
    ws.on('unexpected-response', () => resolve('rejected'));
    ws.on('error', () => resolve('rejected'));
  });
}

async function deleteSession(sessionId: string): Promise<{ collabRoomsPurged: number }> {
  const res = await fetch(`${baseHttpUrl}/api/session/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Session-Id': sessionId },
    body: '{}',
  });
  assert.equal(res.status, 200);
  return await res.json() as { collabRoomsPurged: number };
}

describe('collab — "delete everything" destroys the live document, not just the capability', async () => {
  it('closes the open socket and drops the Y.Doc, and the still-valid token can no longer rejoin', async () => {
    const sessionId = freshSession();
    const { roomId, token } = await mintRoomAndToken(sessionId);

    const socket = await open(`${baseWsUrl}/collab/${roomId}?token=${token}`);
    const closed = new Promise<number>((resolve) => socket.on('close', (code) => resolve(code)));
    const docsBefore = collabRoomCount();
    assert.ok(docsBefore >= 1, 'precondition: joining really did materialise a Y.Doc');

    const body = await deleteSession(sessionId);
    assert.equal(body.collabRoomsPurged, 1);

    assert.equal(await closed, 1001, 'the collaborator\'s socket is closed with "going away", not left bound to a dead doc');
    assert.equal(
      collabRoomCount(), docsBefore - 1,
      'the Y.Doc holding the deleted draft must be gone from process memory',
    );

    // The join token is an HMAC over (room, expiry) with a 30-minute TTL and
    // no server-side record, so it is still cryptographically valid here. The
    // registry check is what has to stop it — the same second gate the
    // retrospective added for expiry.
    assert.equal(
      await attempt(`${baseWsUrl}/collab/${roomId}?token=${token}`),
      'rejected',
      'a token minted before the wipe must not reopen the deleted document',
    );
  });

  it('leaves another session\'s live room and its open socket completely alone', async () => {
    const mine = freshSession();
    const theirs = freshSession();
    const mineRoom = await mintRoomAndToken(mine);
    const theirRoom = await mintRoomAndToken(theirs);

    const mySocket = await open(`${baseWsUrl}/collab/${mineRoom.roomId}?token=${mineRoom.token}`);
    const theirSocket = await open(`${baseWsUrl}/collab/${theirRoom.roomId}?token=${theirRoom.token}`);
    const myClose = new Promise<number>((resolve) => mySocket.on('close', (code) => resolve(code)));
    let theirsClosed = false;
    theirSocket.on('close', () => { theirsClosed = true; });

    const body = await deleteSession(mine);
    assert.equal(body.collabRoomsPurged, 1, 'exactly one room — mine');
    assert.equal(await myClose, 1001);

    assert.equal(theirsClosed, false, 'an unrelated writer\'s socket must stay open');
    assert.equal(theirSocket.readyState, WebSocket.OPEN);
    assert.equal(
      await attempt(`${baseWsUrl}/collab/${theirRoom.roomId}?token=${theirRoom.token}`),
      'open',
      'an unrelated writer\'s room must still be joinable',
    );
    theirSocket.close();
  });
});
