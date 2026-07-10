// W4 — validation-completeness audit (server/lib/validation.ts,
// server/routes/{config,game,scriptide,export}.ts, server/routes/nvm/*.ts).
//
// CLAUDE.md's security-constraints section claims "every route ... zod-
// validates its body". A route audit found ~38 routes across these files
// that either validated only inline (ad-hoc `if (!x || !VALID.includes(x))`
// checks, or none at all) instead of going through validate()/validateParams()
// with a proper zod schema in validation.ts, matching the pattern every
// already-schema'd sibling route in the same files already used. This file
// is the fire/no-fire coverage for every route this run brought into that
// pattern: one 400 test (malformed body/param — proves the new schema
// actually rejects) and one 200-or-documented-shape test (minimal valid
// input — proves the schema didn't regress the legitimate case) per route.
//
// AI-backed routes (aiLimiter, no try/catch degrade — world-build,
// refine-dialogue, analyze-tension, clean-action, character-profile,
// analyze-script) have no graceful keyless fallback the way
// /api/game/interview or /api/scriptide/fix do: server/engine/ai.ts's
// getAI() throws when GEMINI_API_KEY is unset, and these six routes let
// that throw propagate to the global error handler's generic 500 (not a
// ValidationError, so not a 400 — see server/app.ts's error handler). This
// test environment runs keyless throughout (same as every other route test
// file in this directory — see e.g. tests/routes/game-fixes.test.ts's
// header comment), so for those six routes the "valid input" case is
// asserted as "validation passed" (status is NOT 400) rather than a literal
// 200 — that IS these routes' documented keyless behavior today, and is
// exactly the gap CLAUDE.md's Gotchas section would want called out rather
// than silently asserted around.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, freshSessionId, type TestServer } from './helpers.ts';

describe('validation-completeness — server/routes/config.ts', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  it('POST /api/pacing-target rejects an unknown target with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/pacing-target`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: 'ludicrous-speed' }),
    });
    assert.equal(res.status, 400);
  });
  it('POST /api/pacing-target accepts a valid target with 200', async () => {
    const res = await fetch(`${server.baseUrl}/api/pacing-target?sessionId=${freshSessionId()}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: 'fast' }),
    });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).target, 'fast');
  });

  it('POST /api/emotional-arc rejects an unknown arc with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/emotional-arc`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ arc: 'not-a-real-arc' }),
    });
    assert.equal(res.status, 400);
  });
  it('POST /api/emotional-arc accepts a valid arc with 200', async () => {
    const res = await fetch(`${server.baseUrl}/api/emotional-arc?sessionId=${freshSessionId()}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ arc: 'rags_to_riches' }),
    });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).arc, 'rags_to_riches');
  });

  it('POST /api/director-style rejects an unknown style with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/director-style`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ style: 'not-a-real-style' }),
    });
    assert.equal(res.status, 400);
  });
  it('POST /api/director-style accepts a valid style with 200', async () => {
    const res = await fetch(`${server.baseUrl}/api/director-style?sessionId=${freshSessionId()}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ style: 'hitchcock' }),
    });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).style, 'hitchcock');
  });

  it('POST /api/story-genre rejects an unknown genre with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/story-genre`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ genre: 'not-a-real-genre' }),
    });
    assert.equal(res.status, 400);
  });
  it('POST /api/story-genre accepts a valid genre with 200', async () => {
    const res = await fetch(`${server.baseUrl}/api/story-genre?sessionId=${freshSessionId()}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ genre: 'thriller' }),
    });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).genre, 'thriller');
  });

  it('POST /api/character-arc-mode rejects an unknown mode with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/character-arc-mode`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'not-a-real-mode' }),
    });
    assert.equal(res.status, 400);
  });
  it('POST /api/character-arc-mode accepts a valid mode with 200', async () => {
    const res = await fetch(`${server.baseUrl}/api/character-arc-mode?sessionId=${freshSessionId()}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'hero_journey' }),
    });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).mode, 'hero_journey');
  });

  it('POST /api/story-theme rejects a non-string theme with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/story-theme`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: 12345 }),
    });
    assert.equal(res.status, 400);
  });
  it('POST /api/story-theme accepts a string theme with 200', async () => {
    const res = await fetch(`${server.baseUrl}/api/story-theme?sessionId=${freshSessionId()}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: 'Betrayal and redemption' }),
    });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).theme, 'Betrayal and redemption');
  });

  it('POST /api/outline/apply-preset rejects an unknown structure with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/outline/apply-preset`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ structure: 'not-a-real-structure' }),
    });
    assert.equal(res.status, 400);
  });
  it('POST /api/outline/apply-preset accepts a valid structure with 200', async () => {
    const res = await fetch(`${server.baseUrl}/api/outline/apply-preset?sessionId=${freshSessionId()}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ structure: 'save_the_cat', expectedTurns: 20 }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.structure, 'save_the_cat');
    assert.ok(Array.isArray(body.beats));
  });
});

describe('validation-completeness — server/routes/game.ts', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  it('POST /api/simulate-to-fountain rejects nodes that are not an array with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/simulate-to-fountain`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodes: 'not-an-array', agents: [] }),
    });
    assert.equal(res.status, 400);
  });
  it('POST /api/simulate-to-fountain accepts a minimal valid scenario with 200', async () => {
    const res = await fetch(`${server.baseUrl}/api/simulate-to-fountain`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nodes: [{ location_id: 'loc1', name: 'Office' }],
        agents: [{ char_id: 'a1', name: 'Alex' }],
        location_id: 'loc1',
        maxTurns: 1,
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(typeof body.fountain, 'string');
  });

  it('POST /api/qbn/filter-choices rejects a non-array choices field with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/qbn/filter-choices`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ choices: 'not-an-array' }),
    });
    assert.equal(res.status, 400);
  });
  it('POST /api/qbn/filter-choices accepts an empty choices array with 200', async () => {
    const res = await fetch(`${server.baseUrl}/api/qbn/filter-choices`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ choices: [] }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body.available, []);
  });

  it('POST /api/ncp-storyform rejects a non-object throughlines field with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/ncp-storyform`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ throughlines: 'not-an-object' }),
    });
    assert.equal(res.status, 400);
  });
  it('POST /api/ncp-storyform accepts an empty body with 200', async () => {
    const res = await fetch(`${server.baseUrl}/api/ncp-storyform?sessionId=${freshSessionId()}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok('activeThroughlines' in body);
  });

  it('GET /api/dramatic-pressure/:charId rejects a charId over 64 chars with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/dramatic-pressure/${'x'.repeat(65)}?sessionId=${freshSessionId()}`);
    assert.equal(res.status, 400);
  });
  it('GET /api/dramatic-pressure/:charId accepts a well-formed (if unregistered) charId with 200', async () => {
    const res = await fetch(`${server.baseUrl}/api/dramatic-pressure/nobody?sessionId=${freshSessionId()}`);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(await res.json()));
  });

  it('GET /api/goal-mutations/:charId rejects a charId over 64 chars with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/goal-mutations/${'x'.repeat(65)}?sessionId=${freshSessionId()}`);
    assert.equal(res.status, 400);
  });
  it('GET /api/goal-mutations/:charId accepts a well-formed (if unregistered) charId with 200', async () => {
    const res = await fetch(`${server.baseUrl}/api/goal-mutations/nobody?sessionId=${freshSessionId()}`);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(await res.json()));
  });

  it('GET /api/persuasion/:charId rejects a charId over 64 chars with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/persuasion/${'x'.repeat(65)}?sessionId=${freshSessionId()}`);
    assert.equal(res.status, 400);
  });
  it('GET /api/persuasion/:charId accepts a well-formed (if unregistered) charId with 200', async () => {
    const res = await fetch(`${server.baseUrl}/api/persuasion/nobody?sessionId=${freshSessionId()}`);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(await res.json()));
  });
});

describe('validation-completeness — server/routes/scriptide.ts', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  it('POST /api/scriptide/save rejects a non-string scriptText with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/scriptide/save?sessionId=${freshSessionId()}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scriptText: 12345 }),
    });
    assert.equal(res.status, 400);
  });
  it('POST /api/scriptide/save accepts an empty body with 200', async () => {
    const res = await fetch(`${server.baseUrl}/api/scriptide/save?sessionId=${freshSessionId()}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).status, 'saved');
  });

  it('POST /api/scriptide/personas rejects a non-object body with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/scriptide/personas`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify('not-an-object'),
    });
    assert.equal(res.status, 400);
  });
  it('POST /api/scriptide/personas accepts a well-formed persona with 200', async () => {
    const res = await fetch(`${server.baseUrl}/api/scriptide/personas`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'w4-test-persona', name: 'W4 Test', systemPreamble: 'Write like a careful editor.' }),
    });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).persona.id, 'w4-test-persona');
  });

  it('POST /api/scriptide/world-build rejects a missing beat with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/scriptide/world-build`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
  });
  it('POST /api/scriptide/world-build accepts a valid beat (keyless: not a 400)', async () => {
    const res = await fetch(`${server.baseUrl}/api/scriptide/world-build?sessionId=${freshSessionId()}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ beat: 'The hero discovers the map is a fake.' }),
    });
    assert.notEqual(res.status, 400, 'valid input must pass schema validation');
  });

  it('POST /api/scriptide/refine-dialogue rejects a missing dialogue with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/scriptide/refine-dialogue`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
  });
  it('POST /api/scriptide/refine-dialogue accepts valid dialogue (keyless: not a 400)', async () => {
    const res = await fetch(`${server.baseUrl}/api/scriptide/refine-dialogue?sessionId=${freshSessionId()}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dialogue: 'ALEX\nI never asked for this.' }),
    });
    assert.notEqual(res.status, 400, 'valid input must pass schema validation');
  });

  it('POST /api/scriptide/analyze-tension rejects a missing scene with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/scriptide/analyze-tension`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
  });
  it('POST /api/scriptide/analyze-tension accepts a valid scene (keyless: not a 400)', async () => {
    const res = await fetch(`${server.baseUrl}/api/scriptide/analyze-tension?sessionId=${freshSessionId()}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scene: 'INT. OFFICE - DAY\n\nAlex waits.' }),
    });
    assert.notEqual(res.status, 400, 'valid input must pass schema validation');
  });

  it('POST /api/scriptide/character-profile rejects a missing profile with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/scriptide/character-profile`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
  });
  it('POST /api/scriptide/character-profile accepts a valid profile (keyless: not a 400)', async () => {
    const res = await fetch(`${server.baseUrl}/api/scriptide/character-profile?sessionId=${freshSessionId()}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: { name: 'Alex', ghost: 'A lost sibling', lie: 'I work alone', want: 'The truth', need: 'To trust again' } }),
    });
    assert.notEqual(res.status, 400, 'valid input must pass schema validation');
  });

  it('POST /api/analyze-script rejects a missing scriptText with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/analyze-script`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
  });
  it('POST /api/analyze-script accepts a valid scriptText (keyless: not a 400)', async () => {
    const res = await fetch(`${server.baseUrl}/api/analyze-script?sessionId=${freshSessionId()}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scriptText: 'INT. OFFICE - DAY\n\nAlex waits.' }),
    });
    assert.notEqual(res.status, 400, 'valid input must pass schema validation');
  });

  it('POST /api/characters/export rejects a missing charId with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/characters/export`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
  });
  it('POST /api/characters/export returns 404 for a well-formed but unregistered charId (schema passed)', async () => {
    const res = await fetch(`${server.baseUrl}/api/characters/export?sessionId=${freshSessionId()}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ charId: 'nobody' }),
    });
    assert.equal(res.status, 404, 'a well-formed charId must clear validation and reach the not-found check');
  });

  it('POST /api/characters/import rejects a missing bundle with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/characters/import`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
  });
  it('POST /api/characters/import rejects a malformed (but present) bundle with 400 from the deeper isCharacterMemoryBundle check', async () => {
    const res = await fetch(`${server.baseUrl}/api/characters/import?sessionId=${freshSessionId()}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bundle: { notAValidBundle: true } }),
    });
    assert.equal(res.status, 400);
  });
});

describe('validation-completeness — server/routes/export.ts', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  it('POST /api/export/print-html rejects a missing fountain field with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/export/print-html`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Untitled' }),
    });
    assert.equal(res.status, 400);
  });
  it('POST /api/export/print-html returns 200 with HTML for a valid fountain body', async () => {
    const res = await fetch(`${server.baseUrl}/api/export/print-html`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fountain: 'INT. OFFICE - DAY\n\nAlice sits down.', title: 'Test Script' }),
    });
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type')?.startsWith('text/html'));
    const text = await res.text();
    assert.ok(text.includes('<!DOCTYPE html>'));
  });

  it('POST /api/export/docx returns 200 with a docx buffer for a valid fountain body', async () => {
    const res = await fetch(`${server.baseUrl}/api/export/docx`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fountain: 'INT. OFFICE - DAY\n\nAlice sits down.', title: 'Test Script' }),
    });
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type')?.includes('officedocument.wordprocessingml'));
  });
});

describe('validation-completeness — server/routes/nvm/* (path-param routes)', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  it('GET /api/debug/explain/:eventId rejects an eventId over 128 chars with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/debug/explain/${'x'.repeat(129)}?sessionId=${freshSessionId()}`);
    assert.equal(res.status, 400);
  });
  it('GET /api/debug/explain/:eventId returns 404 for a well-formed but unknown eventId', async () => {
    const res = await fetch(`${server.baseUrl}/api/debug/explain/nonexistent-event?sessionId=${freshSessionId()}`);
    assert.equal(res.status, 404);
  });

  it('GET /api/debug/explain-scene/:locationId rejects a locationId over 128 chars with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/debug/explain-scene/${'x'.repeat(129)}?sessionId=${freshSessionId()}`);
    assert.equal(res.status, 400);
  });
  it('GET /api/debug/explain-scene/:locationId returns 200 (empty panels) for a well-formed but unknown locationId', async () => {
    const res = await fetch(`${server.baseUrl}/api/debug/explain-scene/nonexistent-loc?sessionId=${freshSessionId()}`);
    assert.equal(res.status, 200);
    assert.deepEqual((await res.json()).panels, []);
  });

  it('GET /api/nvm/project/:target rejects an unknown target with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/project/not-a-real-target?sessionId=${freshSessionId()}`);
    assert.equal(res.status, 400);
  });
  it('GET /api/nvm/project/:target accepts a valid target with 200', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/project/fountain?sessionId=${freshSessionId()}`);
    assert.equal(res.status, 200);
  });

  it('GET /api/nvm/proof/:commitId rejects a commitId over 128 chars with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/proof/${'x'.repeat(129)}?sessionId=${freshSessionId()}`);
    assert.equal(res.status, 400);
  });
  it('GET /api/nvm/proof/:commitId returns 404 for a well-formed but unknown commitId', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/proof/nonexistent-commit?sessionId=${freshSessionId()}`);
    assert.equal(res.status, 404);
  });

  it('GET /api/nvm/commits/:commitId rejects a commitId over 128 chars with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/commits/${'x'.repeat(129)}?sessionId=${freshSessionId()}`);
    assert.equal(res.status, 400);
  });
  it('GET /api/nvm/commits/:commitId returns 404 for a well-formed but unknown commitId', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/commits/nonexistent-commit?sessionId=${freshSessionId()}`);
    assert.equal(res.status, 404);
  });

  it('GET /api/nvm/quality/scene/:commitId rejects a commitId over 128 chars with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/quality/scene/${'x'.repeat(129)}?sessionId=${freshSessionId()}`);
    assert.equal(res.status, 400);
  });
  it('GET /api/nvm/quality/scene/:commitId returns 404 for a well-formed but unknown commitId', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/quality/scene/nonexistent-commit?sessionId=${freshSessionId()}`);
    assert.equal(res.status, 404);
  });
});
