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

  // C4 (2026-09-05 review, LOW). Before this, an ACCEPTED collab upgrade was
  // invisible in the logs entirely — only the rejected path
  // (collab_auth_rejected, tested above) logged anything, so grepping for
  // collab activity showed every failure and zero successes. This proves the
  // new collab_upgrade line: exactly one per accepted upgrade, the room id
  // HASHED (never the raw id — same reason the rejected-path test above
  // exists), and the join token never present in the log at all.
  it('logs one collab_upgrade line per accepted connection, with the room id hashed and the token never present', async () => {
    const { hashRoomId } = await import('../../server/lib/collab-rooms.ts');
    const { roomId, token } = await joinable();
    const captured: string[] = [];
    const realOut = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: string | Uint8Array, ...rest: unknown[]) => {
      captured.push(String(chunk));
      return (realOut as (...a: unknown[]) => boolean)(chunk, ...rest);
    }) as typeof process.stdout.write;
    try {
      const outcome = await attemptConnection(`${baseWsUrl}/collab/${roomId}?token=${token}`);
      assert.equal(outcome, 'open');
    } finally {
      process.stdout.write = realOut;
    }

    const lines = captured.join('').split('\n').filter(Boolean);
    const upgradeLines = lines
      .map((l) => { try { return JSON.parse(l) as Record<string, unknown>; } catch { return null; } })
      .filter((o): o is Record<string, unknown> => !!o && o.msg === 'collab_upgrade');

    assert.equal(upgradeLines.length, 1, `expected exactly one collab_upgrade line, got: ${JSON.stringify(lines)}`);
    assert.equal(upgradeLines[0]!.room, hashRoomId(roomId), 'the logged room field must be the SAME hash collab-rooms.ts uses internally');
    assert.notEqual(upgradeLines[0]!.room, roomId, 'the raw room id must never be logged');
    const serialized = captured.join('');
    assert.ok(!serialized.includes(roomId), 'the raw room id must not appear anywhere in the captured output');
    assert.ok(!serialized.includes(token), 'the join token must never appear in the logged output');
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

// ── Frame-size ceiling (attack-lane audit) ──────────────────────────────────
// attachCollabServer() used to construct its WebSocketServer with no
// `maxPayload` option at all, so it ran under ws's own default — 100MiB
// (104,857,600 bytes) PER FRAME, with no separate per-connection accounting
// (server/collab/yjs-server.ts, package.json's pinned `ws`; verified against
// node_modules/ws/lib/websocket-server.js's documented default). A real
// y-protocol sync/awareness frame for even a full MAX_FOUNTAIN_CHARS
// (900,000-char) document is on the order of tens of KB, not tens of MB, so
// nothing legitimate needed anywhere near that ceiling, while an
// authenticated collaborator (a legitimate join is all it takes; this is not
// an auth bypass) could hold up to 100MiB in flight per message — 200 such
// connections is a 20GB worst case with nothing here to stop it. Fixed by
// capping at COLLAB_MAX_FRAME_BYTES (2MiB by default, env-tunable). This
// asserts the cap is actually wired through `attachCollabServer`'s
// `new WebSocketServer(...)` call (not just present as an unused export) by
// sending a real oversized frame over a real, legitimately-authenticated
// connection and observing ws's own over-limit close (code 1009, "Message Too
// Big") rather than the server accepting or crashing on it.
describe('collab WebSocket — frame-size ceiling', async () => {
  it('closes the connection (code 1009) on a frame larger than COLLAB_MAX_FRAME_BYTES', async () => {
    const { COLLAB_MAX_FRAME_BYTES } = await import('../../server/collab/yjs-server.ts');
    const { roomId, token } = await joinable();
    const ws = new WebSocket(`${baseWsUrl}/collab/${roomId}?token=${token}`);
    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve());
      ws.on('error', reject);
    });

    const closeCode = await new Promise<number>((resolve) => {
      ws.on('close', (code) => resolve(code));
      ws.send(Buffer.alloc(COLLAB_MAX_FRAME_BYTES + 1024, 1));
    });
    assert.equal(closeCode, 1009, 'expected ws\'s own over-limit close code (Message Too Big)');
  });

  it('still accepts an ordinary small sync/awareness-sized frame', async () => {
    const { roomId, token } = await joinable();
    const ws = new WebSocket(`${baseWsUrl}/collab/${roomId}?token=${token}`);
    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve());
      ws.on('error', reject);
    });
    let closed = false;
    ws.on('close', () => { closed = true; });
    ws.send(Buffer.from([0, 1, 2, 3]));
    await new Promise((r) => setTimeout(r, 200));
    assert.equal(closed, false, 'a normal small frame must not trip the size ceiling');
    ws.close();
  });
});
