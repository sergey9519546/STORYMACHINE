// End-to-end test of the /collab/<room> WebSocket auth gate: boots the real
// HTTP server (Express app + attachCollabServer, exactly as server.ts wires
// them together) and drives it with a raw `ws` client — no mocking of the
// upgrade handler itself.
//
// The gate is now TWO checks, not one: a valid HMAC token AND a live entry in
// the room registry (server/lib/collab-rooms.ts). The second exists because
// the token is stateless by design — an HMAC over (room, expiry) with a
// 30-minute TTL and no server-side record — so without it, a token minted
// before a room expired, or replayed out of a shared URL or a log, would keep
// opening the document for the rest of its window. See
// docs/audits/2026-09-02-retrospective/RETROSPECTIVE.md §4.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import WebSocket from 'ws';

process.env.SESSION_DB_DIR = ':memory:';

let baseHttpUrl: string;
let baseWsUrl: string;
let server: Server;

let destroyAllRoomsForTesting: () => void;
let resetCollabRoomsForTesting: () => void;

before(async () => {
  const { createApp } = await import('../../server/app.ts');
  const collabServer = await import('../../server/collab/yjs-server.ts');
  const collabRooms = await import('../../server/lib/collab-rooms.ts');
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
  // Rooms this suite opens are otherwise kept alive forever — see
  // destroyAllRoomsForTesting's doc comment — which would leave an un-unref'd
  // Awareness interval running and hang the test process even after
  // server.close() resolves.
  destroyAllRoomsForTesting();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

let sessionCounter = 0;
function freshSession(): string {
  sessionCounter += 1;
  return `collab-ws-${process.pid}-${sessionCounter}`;
}

/**
 * Mint a room and a token for it — the only way a client can legitimately
 * reach the socket now. The room id comes from the server; there is no API
 * that accepts one the caller chose.
 */
async function joinable(): Promise<{ roomId: string; token: string }> {
  const sessionId = freshSession();
  const roomRes = await fetch(`${baseHttpUrl}/api/collab/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Session-Id': sessionId },
    body: '{}',
  });
  assert.equal(roomRes.status, 200);
  const { roomId } = await roomRes.json() as { roomId: string };

  const tokenRes = await fetch(`${baseHttpUrl}/api/collab/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Session-Id': sessionId },
    body: JSON.stringify({ roomId }),
  });
  assert.equal(tokenRes.status, 200);
  const { token } = await tokenRes.json() as { token: string };
  return { roomId, token };
}

// Attempts a WS connection and resolves with 'open' | 'rejected', instead of
// letting an upgrade rejection surface as an unhandled 'error' event.
function attemptConnection(url: string): Promise<'open' | 'rejected'> {
  return new Promise((resolve) => {
    const ws = new WebSocket(url);
    ws.on('open', () => { ws.close(); resolve('open'); });
    ws.on('unexpected-response', () => resolve('rejected'));
    ws.on('error', () => resolve('rejected'));
  });
}

describe('collab WebSocket — auth gate', async () => {
  it('rejects a connection with no token', async () => {
    const { roomId } = await joinable();
    const outcome = await attemptConnection(`${baseWsUrl}/collab/${roomId}`);
    assert.equal(outcome, 'rejected');
  });

  it('rejects a connection with a tampered token', async () => {
    const { roomId, token } = await joinable();
    const [exp, sig] = token.split('.');
    const tampered = `${exp}.${sig.slice(0, -1)}${sig.at(-1) === '0' ? '1' : '0'}`;
    const outcome = await attemptConnection(`${baseWsUrl}/collab/${roomId}?token=${tampered}`);
    assert.equal(outcome, 'rejected');
  });

  it('rejects a valid token used against a different room than it was issued for', async () => {
    const one = await joinable();
    const two = await joinable();
    const outcome = await attemptConnection(`${baseWsUrl}/collab/${two.roomId}?token=${one.token}`);
    assert.equal(outcome, 'rejected');
  });

  it('rejects a guessable room name that was never minted', async () => {
    // No token can exist for it (the token route refuses to mint one), so the
    // only way in would be forging one — but even a forged-shape token fails
    // the HMAC. This asserts the end of the retired attack at the socket.
    const outcome = await attemptConnection(`${baseWsUrl}/collab/draft?token=1.deadbeef`);
    assert.equal(outcome, 'rejected');
  });

  it('accepts a connection with a valid token for the matching minted room', async () => {
    const { roomId, token } = await joinable();
    const outcome = await attemptConnection(`${baseWsUrl}/collab/${roomId}?token=${token}`);
    assert.equal(outcome, 'open');
  });

  it('does not log the room id when it refuses an upgrade', async () => {
    // The room id is a live capability. A rejection log line carrying it would
    // put working join credentials in every log sink — the same reason
    // docs/AUTH.md keeps the session id out of request logging.
    const { roomId } = await joinable();
    const captured: string[] = [];
    const realErr = process.stderr.write.bind(process.stderr);
    process.stderr.write = ((chunk: string | Uint8Array, ...rest: unknown[]) => {
      captured.push(String(chunk));
      return (realErr as (...a: unknown[]) => boolean)(chunk, ...rest);
    }) as typeof process.stderr.write;
    try {
      // No token — takes the rejection branch that used to log { room }.
      await attemptConnection(`${baseWsUrl}/collab/${roomId}`);
    } finally {
      process.stderr.write = realErr;
    }
    assert.equal(captured.join('').includes(roomId), false);
  });

  // LAST: clearing the registry would break every test above it.
  it('rejects a still-valid token once its room has left the registry', async () => {
    const { roomId, token } = await joinable();
    // Sanity: this exact URL works while the room is registered.
    assert.equal(await attemptConnection(`${baseWsUrl}/collab/${roomId}?token=${token}`), 'open');

    // Now drop the room the way a TTL lapse, a ceiling eviction, or a process
    // restart would. The token is untouched and still verifies — the whole
    // point is that verifying is no longer sufficient.
    resetCollabRoomsForTesting();
    const { verifyCollabToken } = await import('../../server/lib/collab-auth.ts');
    assert.equal(verifyCollabToken(roomId, token), true, 'token should still be cryptographically valid');

    const outcome = await attemptConnection(`${baseWsUrl}/collab/${roomId}?token=${token}`);
    assert.equal(outcome, 'rejected');
  });
});
