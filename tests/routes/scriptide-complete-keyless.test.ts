// GET /api/scriptide/complete — keyless guard (G0-03 hygiene).
//
// Before this change, /api/scriptide/complete was the one generation route in
// server/routes/scriptide.ts with no llmReady() guard (the other six —
// world-build, refine-dialogue, analyze-tension, clean-action,
// character-profile, analyze-script — all check it, see the "Keyless guard
// for the seven generation-only ScriptIDE routes" comment at that file's
// definition). Missing the guard meant a keyless server flushed SSE headers
// (200, text/event-stream) and only then hit generateContentStream(), which
// throws with no key — an honest-degradation violation.
//
// This test runs with no GEMINI_API_KEY and no multi-provider config (same
// keyless-by-default test environment as every other route test file in this
// directory — see tests/routes/game-fixes.test.ts's header comment), so
// llmReady() is false throughout.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, type TestServer } from './helpers.ts';

describe('routes/scriptide — GET /api/scriptide/complete keyless guard (G0-03)', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  it('keyless: returns 503 with the KEYLESS_AI_NOTE shape instead of a 200 SSE stream', async () => {
    const prefix = 'INT. QUIET HOUSE - NIGHT\nA woman studies a photograph in silence.';
    const res = await fetch(`${server.baseUrl}/api/scriptide/complete?prefix=${encodeURIComponent(prefix)}`);
    assert.equal(res.status, 503);
    assert.notEqual(res.headers.get('content-type'), 'text/event-stream');
    const body = await res.json();
    assert.equal(typeof body.error, 'string');
    assert.ok(body.error.length > 0);
  });
});
