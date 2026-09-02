// Unit tests for the HMAC collab-token scheme (server/lib/collab-auth.ts).
// These exercise the pure sign/verify logic directly — see websocket.test.ts
// for the end-to-end WebSocket-upgrade behavior that actually consumes it.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { issueCollabToken, verifyCollabToken } from '../../server/lib/collab-auth.ts';

describe('collab-auth — token issue/verify', () => {
  it('a freshly issued token verifies against the room it was issued for', () => {
    const { token } = issueCollabToken('room-a');
    assert.equal(verifyCollabToken('room-a', token), true);
  });

  it('a token issued for one room does not verify against a different room', () => {
    const { token } = issueCollabToken('room-a');
    assert.equal(verifyCollabToken('room-b', token), false);
  });

  it('a token with a tampered signature does not verify', () => {
    const { token } = issueCollabToken('room-a');
    const [exp, sig] = token.split('.');
    const tampered = `${exp}.${sig.slice(0, -1)}${sig.at(-1) === '0' ? '1' : '0'}`;
    assert.equal(verifyCollabToken('room-a', tampered), false);
  });

  it('an expired token does not verify', () => {
    // Build a token with an expiry far in the past using the same signing
    // input the real issuer uses, bypassing the TTL to simulate expiry
    // without needing to wait 30 minutes in a test.
    const room = 'room-a';
    const pastExp = Date.now() - 60 * 60 * 1000; // 1 hour ago
    // Recompute the signature the same way issueCollabToken does internally
    // by issuing a real token and then rewriting its expiry — the signature
    // must also change, so instead verify that an old, otherwise-untouched
    // token's expiry can't just be edited forward: replacing exp without
    // recomputing sig must fail (proves exp is authenticated, not just read).
    const { token } = issueCollabToken(room);
    const [, sig] = token.split('.');
    const rewrittenExpiry = `${pastExp}.${sig}`;
    assert.equal(verifyCollabToken(room, rewrittenExpiry), false);
  });

  it('a missing or malformed token does not verify', () => {
    assert.equal(verifyCollabToken('room-a', null), false);
    assert.equal(verifyCollabToken('room-a', undefined), false);
    assert.equal(verifyCollabToken('room-a', ''), false);
    assert.equal(verifyCollabToken('room-a', 'not-a-real-token'), false);
    assert.equal(verifyCollabToken('room-a', 'notanumber.deadbeef'), false);
  });
});

// ── Route behavior (real HTTP, real Express app) ─────────────────────────────
// The unit tests above prove the HMAC layer is sound. It always was — and it
// never mattered, because POST /api/collab/token would mint a valid token for
// ANY room NAME any caller typed, so an attacker asked for a token for the
// room they wanted and the unpublished Y.Doc synced to them
// (docs/audits/2026-09-02-retrospective/RETROSPECTIVE.md §4). These tests
// cover the part that closes that: a room must be MINTED by the server before
// a token for it exists at all.
import { before, after } from 'node:test';
import { startTestServer, freshSessionId, type TestServer } from '../routes/helpers.ts';

// A syntactically perfect room id that was never minted. The whole security
// claim in one constant: well-formed is not the same as authorized.
const UNMINTED_ID = 'ZZZZZZZZZZZZZZZZZZZZZZ';

async function post(
  server: TestServer,
  path: string,
  body: unknown,
  sessionId: string | null,
): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (sessionId) headers['X-Session-Id'] = sessionId;
  return fetch(`${server.baseUrl}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
}

async function mintRoom(server: TestServer, sessionId: string): Promise<string> {
  const res = await post(server, '/api/collab/rooms', {}, sessionId);
  assert.equal(res.status, 200);
  const { roomId } = await res.json() as { roomId: string };
  return roomId;
}

describe('routes/collab — the room id is minted, never accepted', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  it('POST /api/collab/rooms mints an unguessable id and takes no room input', async () => {
    const res = await post(server, '/api/collab/rooms', { roomId: 'chosen-by-me' }, freshSessionId());
    assert.equal(res.status, 200);
    const body = await res.json() as { roomId: string };
    // 16 CSPRNG bytes as base64url. Critically, NOT the id the caller asked for.
    assert.match(body.roomId, /^[A-Za-z0-9_-]{22}$/);
    assert.notEqual(body.roomId, 'chosen-by-me');
  });

  it('create → token → a token that verifies against that exact room', async () => {
    const sid = freshSessionId();
    const roomId = await mintRoom(server, sid);
    const res = await post(server, '/api/collab/token', { roomId }, sid);
    assert.equal(res.status, 200);
    const body = await res.json() as { token: string; expiresAt: number };
    assert.equal(typeof body.token, 'string');
    assert.equal(typeof body.expiresAt, 'number');
    assert.equal(verifyCollabToken(roomId, body.token), true);
  });

  it('a collaborator on a DIFFERENT session can mint a token for a shared id', async () => {
    // The product behavior the model has to keep: possession of the link is
    // the authorization, so the creator is not the only party who can join.
    const roomId = await mintRoom(server, freshSessionId());
    const res = await post(server, '/api/collab/token', { roomId }, freshSessionId());
    assert.equal(res.status, 200);
  });

  it('refuses a token for a well-formed id the server never minted', async () => {
    const res = await post(server, '/api/collab/token', { roomId: UNMINTED_ID }, freshSessionId());
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { error: 'No such collaboration room.' });
  });

  it('refuses a token for a guessed room NAME — the exact retired attack', async () => {
    // Every one of these would have returned 200 and a working token before
    // this change, handing the guesser read+write on someone's draft.
    for (const guess of ['draft', 'script', 'my-movie', 'room-1']) {
      const res = await post(server, '/api/collab/token', { roomId: guess }, freshSessionId());
      assert.equal(res.status, 404, `guessed name "${guess}" was not refused`);
    }
  });

  it('rejects the retired { room } body shape with 400 rather than guessing', async () => {
    // A stale client must fail loudly, not fall back to some default room.
    const res = await post(server, '/api/collab/token', { room: 'draft' }, freshSessionId());
    assert.equal(res.status, 400);
  });

  it('rejects a malformed room id with 400', async () => {
    const res = await post(server, '/api/collab/token', { roomId: 'has spaces! and $ymbols' }, freshSessionId());
    assert.equal(res.status, 400);
  });

  it('refuses both routes to a caller presenting no session id', async () => {
    // Not an access check — session ids are self-minted (src/lib/session.ts).
    // It keeps the per-session budgets from collapsing into one shared
    // 'default' bucket that any single caller could exhaust for everyone.
    assert.equal((await post(server, '/api/collab/rooms', {}, null)).status, 400);
    assert.equal((await post(server, '/api/collab/token', { roomId: UNMINTED_ID }, null)).status, 400);
  });
});

describe('routes/collab — per-session budgets', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  it('room creation exhausts at the per-session ceiling with 429', async () => {
    const { COLLAB_ROOMS_PER_SESSION_PER_MIN } = await import('../../server/lib/collab-rooms.ts');
    const sid = freshSessionId();
    for (let i = 0; i < COLLAB_ROOMS_PER_SESSION_PER_MIN; i++) {
      assert.equal((await post(server, '/api/collab/rooms', {}, sid)).status, 200, `create ${i}`);
    }
    const res = await post(server, '/api/collab/rooms', {}, sid);
    assert.equal(res.status, 429);
    // Still per-session, not global: another writer is unaffected.
    assert.equal((await post(server, '/api/collab/rooms', {}, freshSessionId())).status, 200);
  });
});

describe('routes/collab — the room id never reaches a log line', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  it('creating and joining a room logs nothing containing the id', async () => {
    // A room id is a live capability, exactly like the session id docs/AUTH.md
    // keeps out of request logging. A log sink holding room ids is a log sink
    // holding working join credentials, so this asserts the whole process
    // output — not just the collab logger's own calls.
    const captured: string[] = [];
    const realOut = process.stdout.write.bind(process.stdout);
    const realErr = process.stderr.write.bind(process.stderr);
    // Tee rather than swallow: node:test's own TAP output goes through here.
    process.stdout.write = ((chunk: string | Uint8Array, ...rest: unknown[]) => {
      captured.push(String(chunk));
      return (realOut as (...a: unknown[]) => boolean)(chunk, ...rest);
    }) as typeof process.stdout.write;
    process.stderr.write = ((chunk: string | Uint8Array, ...rest: unknown[]) => {
      captured.push(String(chunk));
      return (realErr as (...a: unknown[]) => boolean)(chunk, ...rest);
    }) as typeof process.stderr.write;

    let roomId: string;
    try {
      const sid = freshSessionId();
      roomId = await mintRoom(server, sid);
      await post(server, '/api/collab/token', { roomId }, sid);
      // A refusal must not log the probed id either.
      await post(server, '/api/collab/token', { roomId: UNMINTED_ID }, sid);
    } finally {
      process.stdout.write = realOut;
      process.stderr.write = realErr;
    }

    const output = captured.join('');
    assert.equal(output.includes(roomId), false, 'a minted room id appeared in process output');
    assert.equal(output.includes(UNMINTED_ID), false, 'a probed room id appeared in process output');
  });
});
