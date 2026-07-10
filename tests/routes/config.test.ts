import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, freshSessionId, type TestServer } from './helpers.ts';

describe('routes/config — HTTP behavior', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  it('GET /health returns 200 with status ok', async () => {
    const res = await fetch(`${server.baseUrl}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.equal(typeof body.sessions, 'number');
  });

  it('GET /api/ai-config returns 200 and never leaks a key value, only boolean flags', async () => {
    const res = await fetch(`${server.baseUrl}/api/ai-config`);
    assert.equal(res.status, 200);
    const body = await res.json();
    for (const forbiddenKey of ['apiKey', 'imgApiKey', 'ttsApiKey', 'embApiKey']) {
      assert.equal(body[forbiddenKey], undefined, `response must not include ${forbiddenKey}`);
    }
    for (const flag of ['keySet', 'imgKeySet', 'ttsKeySet', 'embKeySet']) {
      assert.equal(typeof body[flag], 'boolean', `${flag} must be a boolean flag`);
    }
  });

  it('GET /api/ai-config exposes llmReady as a boolean and still never leaks key material', async () => {
    const res = await fetch(`${server.baseUrl}/api/ai-config`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(typeof body.llmReady, 'boolean', 'llmReady must be a boolean flag');
    for (const forbiddenKey of ['apiKey', 'imgApiKey', 'ttsApiKey', 'embApiKey']) {
      assert.equal(body[forbiddenKey], undefined, `response must not include ${forbiddenKey}`);
    }
    // Belt-and-suspenders: no field anywhere in the payload should contain what
    // looks like an actual secret value (only booleans/strings describing config).
    const raw = JSON.stringify(body);
    assert.doesNotMatch(raw, /sk-[A-Za-z0-9_-]{10,}/, 'response must not contain an API-key-shaped value');
  });

  it('POST /api/ai-config rejects an invalid body with 400 (zod validation)', async () => {
    const res = await fetch(`${server.baseUrl}/api/ai-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'not-a-real-provider' }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(typeof body.error, 'string');
  });

  it('POST /api/outline rejects a body without a beats array with 400 (zod validation)', async () => {
    const res = await fetch(`${server.baseUrl}/api/outline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: freshSessionId(), notBeats: true }),
    });
    assert.equal(res.status, 400);
  });

  it('POST /api/outline accepts a well-formed beats array with 200', async () => {
    const res = await fetch(`${server.baseUrl}/api/outline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: freshSessionId(),
        beats: [{ phase: 'Setup', turn_start: 0, turn_end: 3, goal: 'Introduce the world' }],
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.beatCount, 1);
  });

  it('POST /api/session/import rejects a snapshot missing required arrays with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/session/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: freshSessionId(), notAgents: [] }),
    });
    assert.equal(res.status, 400);
  });

  it('GET /api/pacing-target rejects a malformed sessionId with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/pacing-target?sessionId=${encodeURIComponent('has spaces!')}`);
    assert.equal(res.status, 400);
  });

  // ── I1-a: story_tone persistence (IllusionState-backed, not in-memory) ────

  it('POST /api/story-tone accepts a valid tone with 200 and echoes it back', async () => {
    const res = await fetch(`${server.baseUrl}/api/story-tone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: freshSessionId(), tone: 'bleak' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.tone, 'bleak');
  });

  it('POST /api/story-tone rejects an unknown tone with 400 (zod validation)', async () => {
    const res = await fetch(`${server.baseUrl}/api/story-tone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: freshSessionId(), tone: 'not-a-tone' }),
    });
    assert.equal(res.status, 400);
  });

  it('story_tone persists in IllusionState and rides GET /api/session/export', async () => {
    const sid = freshSessionId();
    const postRes = await fetch(`${server.baseUrl}/api/story-tone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, tone: 'operatic' }),
    });
    assert.equal(postRes.status, 200);

    const cfgRes = await fetch(`${server.baseUrl}/api/story-config?sessionId=${sid}`);
    assert.equal(cfgRes.status, 200);
    const cfg = await cfgRes.json();
    assert.equal(cfg.story_tone, 'operatic', 'story-config must read tone back from IllusionState');

    const expRes = await fetch(`${server.baseUrl}/api/session/export?sessionId=${sid}`);
    assert.equal(expRes.status, 200);
    const snap = await expRes.json();
    assert.equal(snap.illusion_state?.story_tone, 'operatic', 'session export must carry story_tone');
  });

  // ── I1-a: character arc mode (mirrors /api/emotional-arc) ─────────────────

  it('POST /api/character-arc-mode accepts a valid mode with 200 and persists it through story-config and export', async () => {
    const sid = freshSessionId();
    const res = await fetch(`${server.baseUrl}/api/character-arc-mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, mode: 'corruption' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.mode, 'corruption');

    const cfgRes = await fetch(`${server.baseUrl}/api/story-config?sessionId=${sid}`);
    const cfg = await cfgRes.json();
    assert.equal(cfg.character_arc_mode, 'corruption');

    const expRes = await fetch(`${server.baseUrl}/api/session/export?sessionId=${sid}`);
    const snap = await expRes.json();
    assert.equal(snap.illusion_state?.character_arc_mode, 'corruption', 'session export must carry character_arc_mode');
  });

  it('POST /api/character-arc-mode rejects an unknown mode with 400 naming valid modes', async () => {
    const res = await fetch(`${server.baseUrl}/api/character-arc-mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: freshSessionId(), mode: 'ascension' }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /hero_journey/, '400 message should enumerate valid modes');
  });

  it('POST /api/character-arc-mode rejects a missing mode with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/character-arc-mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: freshSessionId() }),
    });
    assert.equal(res.status, 400);
  });

  it('GET /api/story-config reports character_arc_mode: null when never set', async () => {
    const res = await fetch(`${server.baseUrl}/api/story-config?sessionId=${freshSessionId()}`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.character_arc_mode, null);
  });

  it('story_tone and character_arc_mode survive a session import round-trip', async () => {
    const snapshot = {
      sessionId: freshSessionId(),
      schema_version: 6,
      exported_at: Date.now(),
      locations: [{ location_id: 'room1', name: 'Room', description: '', adjacent_locations: [] }],
      agents: [{
        char_id: 'alice', name: 'Alice', public_mask: 'friendly', hidden_motive: 'none',
        knowledge_vector: [], current_location_id: 'room1', suspicion_score: 0, is_alive: true,
      }],
      action_log: [],
      dramatic_pressures: [],
      event_propositions: [],
      persuasion_log: [],
      illusion_state: {
        phase: 'Setup', planted_elements: [], pending_recontextualization: [],
        story_tone: 'paranoid', character_arc_mode: 'descent',
      },
      beat_traces: [],
      belief_edges: [],
      goal_mutations: [],
    };
    const impRes = await fetch(`${server.baseUrl}/api/session/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot),
    });
    assert.equal(impRes.status, 200);

    const cfgRes = await fetch(`${server.baseUrl}/api/story-config?sessionId=${snapshot.sessionId}`);
    const cfg = await cfgRes.json();
    assert.equal(cfg.story_tone, 'paranoid', 'imported story_tone must be readable');
    assert.equal(cfg.character_arc_mode, 'descent', 'imported character_arc_mode must be readable');
  });
});
