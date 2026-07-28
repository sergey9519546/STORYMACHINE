import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, freshSessionId, type TestServer } from './helpers.ts';

function legacySnapshot(sessionId: string, storyTone = 'paranoid') {
  return {
    sessionId,
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
      story_tone: storyTone, character_arc_mode: 'descent',
    },
    beat_traces: [],
    belief_edges: [],
    goal_mutations: [],
  };
}

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

  it('GET /health includes version and commit, with safe fallback values in the keyless test env', async () => {
    const res = await fetch(`${server.baseUrl}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    // Additive/byte-compatible: prior fields still present alongside the new ones.
    assert.equal(body.status, 'ok');
    assert.equal(typeof body.uptime, 'number');
    assert.equal(typeof body.sessions, 'number');
    // version: package.json's version in this checkout (never empty/undefined).
    assert.equal(typeof body.version, 'string');
    assert.ok(body.version.length > 0, 'version must not be empty');
    // commit: no GIT_SHA is set for this test run (no Docker build-arg
    // plumbing in `npm test`), so build-info.ts's documented fallback applies.
    assert.equal(body.commit, 'dev');
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

  it('GET /api/session/export labels an allowlisted observation, never a project backup', async () => {
    const sid = freshSessionId();
    const draftMarker = `CONFIDENTIAL-DRAFT-${sid}`;
    const save = await fetch(`${server.baseUrl}/api/scriptide/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sid,
        scriptText: draftMarker,
        snapshots: [],
        characters: [],
        researchNotes: [],
        isDarkMode: false,
      }),
    });
    assert.equal(save.status, 200);

    const res = await fetch(`${server.baseUrl}/api/session/export?sessionId=${sid}`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('cache-control'), 'no-store');
    assert.match(
      res.headers.get('content-disposition') ?? '',
      /filename="storymachine-partial-simulation-observation\.json"/,
    );

    const raw = await res.text();
    assert.equal(raw.includes(draftMarker), false, 'the observation must not contain writer draft bytes');
    const body = JSON.parse(raw);
    assert.equal(body.kind, 'storymachine.simulation-observation');
    assert.equal(body.format_version, 1);
    assert.equal(body.project_recoverable, false);
    assert.equal(body.project_restore.supported, false);
    assert.equal(body.project_restore.use_instead, 'documented-sqlite-backup-and-restore');
    assert.equal(body.manifest.complete_project_state, false);
    assert.equal(body.manifest.exclusion_policy, 'all_unlisted_session_and_project_state_is_excluded');
    assert.deepEqual(body.manifest.included, [
      'action_log', 'agents', 'beat_traces', 'belief_edges', 'dramatic_pressures',
      'event_propositions', 'goal_mutations', 'illusion_state', 'locations',
      'persuasion_log', 'stakes',
    ]);
    assert.deepEqual(Object.keys(body.observation).sort(), [...body.manifest.included].sort());
    assert.ok(body.manifest.notable_exclusions.includes('writer_draft_and_scriptide_state'));
    assert.equal(body.observation.scriptText, undefined);
    assert.equal(body.locations, undefined, 'simulation data belongs inside the explicit observation envelope');

    const importRes = await fetch(`${server.baseUrl}/api/session/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: raw,
    });
    assert.equal(importRes.status, 410);
    assert.equal((await importRes.json()).code, 'SESSION_JSON_IMPORT_RETIRED');

    const load = await fetch(`${server.baseUrl}/api/scriptide/load?sessionId=${sid}`);
    assert.equal(load.status, 200);
    assert.equal(
      (await load.json()).scriptText,
      draftMarker,
      'posting an observation to the retired importer must preserve the writer draft',
    );
  });

  it('POST /api/session/import is retired regardless of the legacy body shape', async () => {
    const res = await fetch(`${server.baseUrl}/api/session/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: freshSessionId(), notAgents: [] }),
    });
    assert.equal(res.status, 410);
    const body = await res.json();
    assert.equal(body.code, 'SESSION_JSON_IMPORT_RETIRED');
  });

  it('invalid JSON for the retired importer is rejected before routing and preserves existing state', async () => {
    const sid = freshSessionId();
    const seed = await fetch(`${server.baseUrl}/api/story-tone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, tone: 'operatic' }),
    });
    assert.equal(seed.status, 200);

    const res = await fetch(`${server.baseUrl}/api/session/import?sessionId=${sid}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"schema_version":',
    });
    assert.equal(res.status, 400);

    const after = await fetch(`${server.baseUrl}/api/story-config?sessionId=${sid}`);
    assert.equal(after.status, 200);
    assert.equal((await after.json()).story_tone, 'operatic');
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
    assert.equal(snap.observation?.illusion_state?.story_tone, 'operatic', 'observation must carry story_tone');
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
    assert.equal(snap.observation?.illusion_state?.character_arc_mode, 'corruption', 'observation must carry character_arc_mode');
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

  it('POST /api/session/import leaves existing state unchanged and never creates the legacy session', async () => {
    const sid = freshSessionId();
    const seed = await fetch(`${server.baseUrl}/api/story-tone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, tone: 'operatic' }),
    });
    assert.equal(seed.status, 200);
    const before = await (await fetch(`${server.baseUrl}/api/story-config?sessionId=${sid}`)).json();
    const healthBefore = await (await fetch(`${server.baseUrl}/health`)).json();

    const impRes = await fetch(`${server.baseUrl}/api/session/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(legacySnapshot(sid, 'paranoid')),
    });
    assert.equal(impRes.status, 410);
    assert.equal((await impRes.json()).code, 'SESSION_JSON_IMPORT_RETIRED');

    const after = await (await fetch(`${server.baseUrl}/api/story-config?sessionId=${sid}`)).json();
    assert.deepEqual(after, before);
    const healthAfter = await (await fetch(`${server.baseUrl}/health`)).json();
    assert.equal(healthAfter.sessions, healthBefore.sessions);
  });
});

// ── ADMIN_TOKEN gate for AI config writes ─────────────────────────────────
// Own describe block (fresh server, own env-var lifecycle) so it can't bleed
// ADMIN_TOKEN state into the tests above, which all assume it's unset.
describe('routes/config — ADMIN_TOKEN gate for AI config writes', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => {
    delete process.env.ADMIN_TOKEN;
    await server.close();
  });

  it('POST /api/ai-config succeeds from loopback with ADMIN_TOKEN unset (no-fire: default dev/test behavior preserved)', async () => {
    delete process.env.ADMIN_TOKEN;
    const res = await fetch(`${server.baseUrl}/api/ai-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'gemini' }),
    });
    assert.equal(res.status, 200);
  });

  it('GET /api/ai-config stays open regardless of ADMIN_TOKEN (no-fire: the read route is never gated)', async () => {
    process.env.ADMIN_TOKEN = 'test-admin-token-abc';
    try {
      const res = await fetch(`${server.baseUrl}/api/ai-config`);
      assert.equal(res.status, 200);
    } finally {
      delete process.env.ADMIN_TOKEN;
    }
  });

  it('POST /api/ai-config rejects a loopback caller with no bearer token once ADMIN_TOKEN is set (fire)', async () => {
    process.env.ADMIN_TOKEN = 'test-admin-token-abc';
    try {
      const res = await fetch(`${server.baseUrl}/api/ai-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'gemini' }),
      });
      assert.equal(res.status, 401);
      const body = await res.json();
      assert.equal(typeof body.error, 'string');
    } finally {
      delete process.env.ADMIN_TOKEN;
    }
  });

  it('POST /api/ai-config rejects a wrong bearer token once ADMIN_TOKEN is set (fire)', async () => {
    process.env.ADMIN_TOKEN = 'test-admin-token-abc';
    try {
      const res = await fetch(`${server.baseUrl}/api/ai-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer wrong-token' },
        body: JSON.stringify({ provider: 'gemini' }),
      });
      assert.equal(res.status, 401);
    } finally {
      delete process.env.ADMIN_TOKEN;
    }
  });

  it('POST /api/ai-config succeeds with the correct bearer token once ADMIN_TOKEN is set (no-fire)', async () => {
    process.env.ADMIN_TOKEN = 'test-admin-token-abc';
    try {
      const res = await fetch(`${server.baseUrl}/api/ai-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-admin-token-abc' },
        body: JSON.stringify({ provider: 'gemini' }),
      });
      assert.equal(res.status, 200);
    } finally {
      delete process.env.ADMIN_TOKEN;
    }
  });

  it('POST /api/ai-config/test is gated the same way once ADMIN_TOKEN is set (fire)', async () => {
    process.env.ADMIN_TOKEN = 'test-admin-token-abc';
    try {
      const res = await fetch(`${server.baseUrl}/api/ai-config/test`, { method: 'POST' });
      assert.equal(res.status, 401);
      const body = await res.json();
      assert.equal(typeof body.error, 'string');
    } finally {
      delete process.env.ADMIN_TOKEN;
    }
  });
});
