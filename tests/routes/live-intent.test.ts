// Behavioral HTTP coverage for POST /api/live/intent (server/routes/live.ts) —
// the writer-intent parser the Editor calls from src/components/ScriptIDE.tsx.
//
// WHY THIS ROUTE, AND WHY ITS OWN FILE. A route audit found 27 of the app's
// 131 registered endpoints had no behavioral test at all; the only thing
// "covering" them was tests/routes/route-capabilities.test.ts, whose own
// header states it makes no HTTP requests (it is a deliberate static walk of
// the router tree, for limiter completeness). Of those 27, this is the ONE on
// the shipped ROADMAP-P2 surface: `grep -rn "api/live/intent" src/` returns
// exactly one hit, in ScriptIDE.tsx — the Editor half of "Doctor + Editor" —
// while the other 26 belong to Labs-gated research panels
// (src/lib/feature-flags.ts) or have no frontend consumer at all.
//
// The file is separate from tests/routes/nvm-revision.test.ts because both
// exercise aiLimiter, which is a single process-global rateLimit instance
// (server/lib/session-store.ts) shared by every AI route at 20 requests/60s
// per IP. node:test runs each test FILE in its own process, so splitting the
// two files gives each its own 20-request budget instead of making them
// compete for one. This file spends 8.
//
// KEYLESS BY DEFAULT — that is the contract under test. CLAUDE.md's Gotchas
// section is explicit that "the server deliberately boots WITHOUT an AI key
// into analysis-only mode", and this route's honest response to that state is
// a 503 that names the reason, not a crash and not a fabricated parse. Two
// tests below temporarily set a dummy GEMINI_API_KEY to reach the far side of
// that gate; llmReady() (server/lib/ai-config.ts) reads process.env live at
// call time, so no restart is needed. NO LLM CALL IS EVER MADE: those two
// tests send bodies that IntentRequestSchema rejects, so the handler returns
// 400 before parseIntent() is reached. The same dummy-key idiom is already
// used by tests/routes/ai-config-live-path.test.ts and
// tests/routes/scriptide-complete.test.ts.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, type TestServer } from './helpers.ts';

const DUMMY_KEY = 'dummy-test-key-never-used-for-a-real-call';

describe('routes — POST /api/live/intent (Editor intent parser)', async () => {
  let server: TestServer;
  let savedKey: string | undefined;

  before(async () => {
    // Capture and clear so this file's keyless assertions hold no matter what
    // the ambient environment carries, and restore it in after().
    savedKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    server = await startTestServer();
  });
  after(async () => {
    if (savedKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = savedKey;
    await server.close();
  });

  function postIntent(body: unknown): Promise<Response> {
    return fetch(`${server.baseUrl}/api/live/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  // ── Keyless posture ────────────────────────────────────────────────────────

  it('answers a well-formed request with 503 and a reason when no key is configured', async () => {
    assert.equal(process.env.GEMINI_API_KEY, undefined, 'sanity: this assertion is only meaningful keyless');
    const res = await postIntent({ userInput: 'Have Sarah burn the letter instead of reading it.' });
    assert.equal(res.status, 503);
    const body = await res.json();
    // The message must say WHY — a bare 503 is indistinguishable from an
    // outage, and this state is a deliberate, documented operating mode.
    assert.match(body.error, /keyless mode/i);
    assert.match(body.error, /GEMINI_API_KEY/);
  });

  it('never echoes the configured key value into a response body or header', async () => {
    // CLAUDE.md's security constraints: API keys live only in .env and are
    // never serialized to clients. The 503 body naming the ENV VAR is fine and
    // deliberate — what must never appear is the VALUE. Checked on the far side
    // of the gate too, since that is the only state where a value exists to leak.
    process.env.GEMINI_API_KEY = DUMMY_KEY;
    let keyedRaw: string;
    let keyedHeaders: string;
    try {
      const res = await postIntent({ userInput: '' });
      assert.equal(res.status, 400);
      keyedRaw = await res.text();
      keyedHeaders = [...res.headers].map(([k, v]) => `${k}: ${v}`).join('\n');
    } finally {
      delete process.env.GEMINI_API_KEY;
    }
    assert.ok(!keyedRaw.includes(DUMMY_KEY), `key value leaked into the response body: ${keyedRaw}`);
    assert.ok(!keyedHeaders.includes(DUMMY_KEY), `key value leaked into a response header: ${keyedHeaders}`);

    const keyless = await postIntent({ userInput: 'anything' });
    const keylessRaw = await keyless.text();
    assert.ok(!keylessRaw.includes(DUMMY_KEY));
    // No provider-shaped credential of any kind in the keyless body either.
    assert.ok(!/\bsk-[A-Za-z0-9]/.test(keylessRaw) && !/\bAIza[A-Za-z0-9]/.test(keylessRaw), keylessRaw);
  });

  it('the keyless gate is checked BEFORE the body schema — a malformed body still gets 503, not 400', async () => {
    // This is the route's real ordering (server/routes/live.ts checks
    // llmReady() first, then safeParse), documented here rather than
    // asserted-around, because it means the zod schema below is unreachable
    // in the default keyless deployment. Pinning it makes any future
    // reordering a visible, reviewed change instead of a silent one.
    const res = await postIntent({ userInput: '' });
    assert.equal(res.status, 503);
  });

  // ── Rate-limiter tier ──────────────────────────────────────────────────────

  it('sits on aiLimiter (20/min), not gameLimiter (120/min)', async () => {
    // The 429 path itself is proven over real HTTP by
    // tests/routes/limiters.test.ts at deliberate wall-clock cost; what
    // matters here is the TIER, and express-rate-limit's standardHeaders
    // publish it on every response — including the 503.
    const res = await postIntent({ userInput: 'tier check' });
    assert.equal(
      res.headers.get('ratelimit-limit'), '20',
      'this route reaches an LLM through parseIntent(); a 120 here would mean it had been demoted to gameLimiter',
    );
  });

  // ── The zod schema, reached only once the gate opens ───────────────────────

  it('rejects malformed bodies with 400 once a key is configured (IntentRequestSchema)', async () => {
    process.env.GEMINI_API_KEY = DUMMY_KEY;
    try {
      const cases: Array<[string, unknown]> = [
        ['missing userInput', {}],
        ['empty userInput', { userInput: '' }],
        ['userInput over the 5000-char cap', { userInput: 'x'.repeat(5001) }],
        ['userInput of the wrong type', { userInput: 42 }],
      ];
      for (const [label, body] of cases) {
        const res = await postIntent(body);
        // 400, never 500: every one of these returns before parseIntent() is
        // called, so the dummy key is never used for a network request.
        assert.equal(res.status, 400, `${label} must be rejected with 400`);
        const json = await res.json();
        assert.equal(json.error, 'Invalid request body', label);
        assert.ok(json.details?.userInput?._errors?.length > 0, `${label} must name userInput as the failing field`);
      }
    } finally {
      delete process.env.GEMINI_API_KEY;
    }
  });

  it('reverts to the keyless 503 as soon as the key is gone again (llmReady is read per request, not cached)', async () => {
    process.env.GEMINI_API_KEY = DUMMY_KEY;
    try {
      const keyed = await postIntent({ userInput: '' });
      assert.equal(keyed.status, 400, 'with a key present the schema is reachable');
    } finally {
      delete process.env.GEMINI_API_KEY;
    }
    const keyless = await postIntent({ userInput: '' });
    assert.equal(keyless.status, 503, 'removing the key must close the gate again without a restart');
  });
});
