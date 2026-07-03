// End-to-end test of the /collab/<room> WebSocket auth gate: boots the real
// HTTP server (Express app + attachCollabServer, exactly as server.ts wires
// them together) and drives it with a raw `ws` client — no mocking of the
// upgrade handler itself.
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

before(async () => {
  const { createApp } = await import('../../server/app.ts');
  const collabServer = await import('../../server/collab/yjs-server.ts');
  destroyAllRoomsForTesting = collabServer.destroyAllRoomsForTesting;
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
  // Rooms this suite opens (e.g. 'valid-room') are otherwise kept alive
  // forever — see destroyAllRoomsForTesting's doc comment — which would leave
  // an un-unref'd Awareness interval running and hang the test process even
  // after server.close() resolves.
  destroyAllRoomsForTesting();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

async function fetchToken(room: string): Promise<string> {
  const res = await fetch(`${baseHttpUrl}/api/collab/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room }),
  });
  assert.equal(res.status, 200);
  const body = await res.json() as { token: string };
  return body.token;
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
    const outcome = await attemptConnection(`${baseWsUrl}/collab/no-token-room`);
    assert.equal(outcome, 'rejected');
  });

  it('rejects a connection with a tampered token', async () => {
    const token = await fetchToken('tampered-room');
    const [exp, sig] = token.split('.');
    const tampered = `${exp}.${sig.slice(0, -1)}${sig.at(-1) === '0' ? '1' : '0'}`;
    const outcome = await attemptConnection(`${baseWsUrl}/collab/tampered-room?token=${tampered}`);
    assert.equal(outcome, 'rejected');
  });

  it('rejects a valid token used against a different room than it was issued for', async () => {
    const token = await fetchToken('room-one');
    const outcome = await attemptConnection(`${baseWsUrl}/collab/room-two?token=${token}`);
    assert.equal(outcome, 'rejected');
  });

  it('accepts a connection with a valid token for the matching room', async () => {
    const token = await fetchToken('valid-room');
    const outcome = await attemptConnection(`${baseWsUrl}/collab/valid-room?token=${token}`);
    assert.equal(outcome, 'open');
  });
});
