// Per-user session identity via the X-Session-Id header (see
// server/lib/session-store.ts's sessionId(req)). Deployed instances previously
// had every browser share the 'default' session's story state because nothing
// in the request ever carried a client-specific id; the fix adds a header the
// client-side fetch wrapper (src/main.tsx) sets on every /api/* call, with
// this precedence:
//   1. explicit sessionId in the body (non-GET) or query (GET) — unchanged,
//      pre-existing behavior; malformed explicit values still 400.
//   2. X-Session-Id header, if present and matching [A-Za-z0-9_-]{8,64} —
//      new in this change.
//   3. 'default' — the original single-session fallback.
//
// This file is HTTP-surface only. tests/routes/game.test.ts already covers
// the explicit body/query sessionId path (including its 400-on-malformed
// behavior) and must keep passing unchanged — this file adds header-specific
// coverage without touching that one.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, freshSessionId, type TestServer } from './helpers.ts';
import { mergeSessionHeader } from '../../src/lib/session.ts';

describe('routes — X-Session-Id header precedence', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  it('two requests with different X-Session-Id headers get fully isolated state', async () => {
    const headerA = freshSessionId();
    const headerB = freshSessionId();

    // Seed a node + agent under header A, with NO explicit sessionId anywhere
    // in the body — the header must be the only thing identifying the session.
    const initRes = await fetch(`${server.baseUrl}/api/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Session-Id': headerA },
      body: JSON.stringify({
        nodes: [{ location_id: 'gallery', name: 'Gallery', description: 'A quiet gallery.', adjacent_locations: [] }],
        agents: [{
          char_id: 'agent-a',
          name: 'Agent A',
          public_mask: 'mask', hidden_motive: 'motive',
          knowledge_vector: [], suspicion_score: 0, current_location_id: 'gallery',
        }],
      }),
    });
    assert.equal(initRes.status, 200);
    const initBody = await initRes.json();
    // The server resolved the header into the session id it actually used.
    assert.equal(initBody.sessionId, headerA);

    // GET /api/state under header B — a totally different session — must see
    // NEITHER the agent nor the node registered under header A.
    const stateB = await fetch(`${server.baseUrl}/api/state`, {
      headers: { 'X-Session-Id': headerB },
    });
    assert.equal(stateB.status, 200);
    const bodyB = await stateB.json();
    assert.deepEqual(bodyB.agents, []);
    assert.deepEqual(bodyB.nodes, []);

    // GET /api/state under header A again sees exactly what was seeded.
    const stateA = await fetch(`${server.baseUrl}/api/state`, {
      headers: { 'X-Session-Id': headerA },
    });
    assert.equal(stateA.status, 200);
    const bodyA = await stateA.json();
    assert.equal(bodyA.agents.length, 1);
    assert.equal(bodyA.agents[0].char_id, 'agent-a');
    assert.equal(bodyA.nodes.length, 1);
  });

  it('an invalid X-Session-Id header falls through to "default" instead of erroring', async () => {
    // Contains a space and a '!' — fails [A-Za-z0-9_-]{8,64}. Per the spec,
    // a malformed HEADER (unlike a malformed explicit body/query sessionId)
    // must never 400 — it silently resolves to 'default'.
    const res = await fetch(`${server.baseUrl}/api/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Session-Id': 'not a valid id!' },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.sessionId, 'default');
  });

  it('a too-short X-Session-Id header (under the 8-char floor) also falls through to "default"', async () => {
    const res = await fetch(`${server.baseUrl}/api/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Session-Id': 'short1' },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.sessionId, 'default');
  });

  it('an explicit body sessionId beats a conflicting (valid) X-Session-Id header', async () => {
    const bodySid = freshSessionId();
    const headerSid = freshSessionId();
    assert.notEqual(bodySid, headerSid);

    const res = await fetch(`${server.baseUrl}/api/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Session-Id': headerSid },
      body: JSON.stringify({ sessionId: bodySid }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.sessionId, bodySid);

    // Prove it's really the body id that got used: state under the body id
    // should be empty (fresh), and state under the *header* id must ALSO be
    // empty/untouched — confirming the header was never consulted.
    const stateHeader = await fetch(`${server.baseUrl}/api/state`, {
      headers: { 'X-Session-Id': headerSid },
    });
    const stateHeaderBody = await stateHeader.json();
    assert.deepEqual(stateHeaderBody.agents, []);
  });

  it('a header-only session id round-trips through a full init -> state cycle', async () => {
    const headerSid = freshSessionId();
    const initRes = await fetch(`${server.baseUrl}/api/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Session-Id': headerSid },
      body: JSON.stringify({
        nodes: [{ location_id: 'dock', name: 'Dock', description: 'A foggy dock.', adjacent_locations: [] }],
        agents: [{
          char_id: 'agent-rt',
          name: 'Round Tripper',
          public_mask: 'mask', hidden_motive: 'motive',
          knowledge_vector: [], suspicion_score: 0, current_location_id: 'dock',
        }],
      }),
    });
    assert.equal(initRes.status, 200);

    const stateRes = await fetch(`${server.baseUrl}/api/state`, {
      headers: { 'X-Session-Id': headerSid },
    });
    assert.equal(stateRes.status, 200);
    const state = await stateRes.json();
    assert.equal(state.agents.length, 1);
    assert.equal(state.agents[0].char_id, 'agent-rt');
    assert.equal(state.nodes[0].location_id, 'dock');

    // GET routes (like SSE panels' query-param path) still work identically
    // via ?sessionId= — precedence 1 (explicit query) picks up the same id.
    const stateViaQuery = await fetch(`${server.baseUrl}/api/state?sessionId=${headerSid}`);
    assert.equal(stateViaQuery.status, 200);
    const stateViaQueryBody = await stateViaQuery.json();
    assert.equal(stateViaQueryBody.agents.length, 1);
  });
});

describe('src/lib/session.ts — mergeSessionHeader (fetch header-merge helper)', () => {
  it('adds X-Session-Id to a plain object headers init, preserving other entries', () => {
    const merged = mergeSessionHeader({ 'Content-Type': 'application/json' }, 'abc123');
    assert.deepEqual(merged, { 'Content-Type': 'application/json', 'X-Session-Id': 'abc123' });
  });

  it('adds X-Session-Id when no headers init was passed at all (undefined)', () => {
    const merged = mergeSessionHeader(undefined, 'abc123');
    assert.deepEqual(merged, { 'X-Session-Id': 'abc123' });
  });

  it('overwrites a pre-existing (differently-cased) X-Session-Id key in a plain object', () => {
    const merged = mergeSessionHeader({ 'x-session-id': 'stale', Accept: 'application/json' }, 'fresh456');
    assert.deepEqual(merged, { Accept: 'application/json', 'X-Session-Id': 'fresh456' });
  });

  it('adds X-Session-Id to an array-form headers init, preserving other entries', () => {
    const merged = mergeSessionHeader([['Content-Type', 'application/json'], ['Accept', 'text/plain']], 'abc123');
    assert.deepEqual(merged, [
      ['Content-Type', 'application/json'],
      ['Accept', 'text/plain'],
      ['X-Session-Id', 'abc123'],
    ]);
  });

  it('drops a stale X-Session-Id entry from an array-form headers init before re-adding it', () => {
    const merged = mergeSessionHeader([['X-Session-Id', 'stale'], ['Accept', 'text/plain']], 'fresh456');
    assert.deepEqual(merged, [['Accept', 'text/plain'], ['X-Session-Id', 'fresh456']]);
  });

  it('adds/overwrites X-Session-Id on a Headers instance, preserving other entries', () => {
    const existing = new Headers({ 'Content-Type': 'application/json', 'X-Session-Id': 'stale' });
    const merged = mergeSessionHeader(existing, 'fresh456');
    assert.ok(merged instanceof Headers);
    assert.equal((merged as Headers).get('X-Session-Id'), 'fresh456');
    assert.equal((merged as Headers).get('Content-Type'), 'application/json');
    // The original Headers instance passed in must be untouched (merge, not mutate).
    assert.equal(existing.get('X-Session-Id'), 'stale');
  });
});
