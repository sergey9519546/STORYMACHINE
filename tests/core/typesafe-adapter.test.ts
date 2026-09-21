// typesafe-adapter.test.ts — the System One adapter, with no network.
//
// WHAT THIS FILE PINS. server/lib/ai-providers/typesafe.ts is the only place in
// this repository that talks to api.typesafe.ai, and the properties its caller
// (server/nvm/converge/cast-alignment.ts) relies on are all failure properties:
//
//   1. it NEVER returns a success-shaped result for a call that did not
//      succeed — missing key, HTTP error, malformed body and timeout each throw
//      a typed TypeSafeUnavailableError carrying the reason;
//   2. an identical request returns an identical answer without a second call
//      (the reproducibility cache);
//   3. neither the API key nor the state text reaches a log line or an error
//      message — including when the upstream ECHOES the key back.
//
// Every test drives the injected transport seam (setTypeSafeTransport), which
// is the same shape of seam engine/ai.ts offers with setLLMProvider. Nothing
// here opens a socket.
import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  systemOne, TypeSafeUnavailableError,
  setTypeSafeTransport, resetTypeSafeTransport, clearTypeSafeCache,
  typeSafeConfigured, typeSafeModel, redactSecrets,
  TYPESAFE_ENDPOINT, TYPESAFE_DEFAULT_MODEL,
  type TypeSafeTransport, type TypeSafeQuestion,
} from '../../server/lib/ai-providers/typesafe.ts';
import { logger } from '../../server/lib/logger.ts';

const FAKE_KEY = 'ts-test-not-a-real-key-0000';
const STATE_SECRET_PHRASE = 'Ilka argues the bridge is safe';

const QUESTIONS: Record<string, TypeSafeQuestion> = {
  relation: {
    type: 'score',
    instructions: 'Is this name one of the cast?',
    criteria: ['a different character not in the cast', 'possibly one of the cast, unclear which', 'clearly one of the cast members'],
  },
  which: {
    type: 'choice',
    instructions: 'Which one?',
    criteria: { ILKA: null, DESMOND: null, none: 'none of the above' },
  },
};

const STATE = { cast: ['ILKA', 'DESMOND'], scene_note: STATE_SECRET_PHRASE };

function okBody(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    model: TYPESAFE_DEFAULT_MODEL,
    answers: {
      relation: { type: 'score', score: 1.03, confidence: 0.91 },
      which: { type: 'choice', choice: 'ILKA', confidence: 0.15 },
    },
    usage: { input_tokens: 120, output_tokens: 7 },
    ...overrides,
  });
}

/** A transport that records what it was handed and replies with `body`. */
function recordingTransport(status: number, body: string) {
  const calls: Array<{ url: string; headers: Record<string, string>; body: string }> = [];
  const transport: TypeSafeTransport = async (url, init) => {
    calls.push({ url, headers: init.headers, body: init.body });
    return { status, text: async () => body };
  };
  return { transport, calls };
}

describe('TypeSafe System One adapter', () => {
  let savedKey: string | undefined;
  let savedModel: string | undefined;

  before(() => {
    savedKey = process.env.TYPESAFE_API_KEY;
    savedModel = process.env.TYPESAFE_MODEL;
  });
  after(() => {
    if (savedKey === undefined) delete process.env.TYPESAFE_API_KEY;
    else process.env.TYPESAFE_API_KEY = savedKey;
    if (savedModel === undefined) delete process.env.TYPESAFE_MODEL;
    else process.env.TYPESAFE_MODEL = savedModel;
    resetTypeSafeTransport();
    clearTypeSafeCache();
  });

  beforeEach(() => {
    process.env.TYPESAFE_API_KEY = FAKE_KEY;
    delete process.env.TYPESAFE_MODEL;
    clearTypeSafeCache();
  });
  afterEach(() => {
    resetTypeSafeTransport();
  });

  // ── config ────────────────────────────────────────────────────────────────

  it('pins the model id rather than an alias, and honours TYPESAFE_MODEL', () => {
    assert.equal(TYPESAFE_DEFAULT_MODEL, 'jev-1.13.0');
    assert.equal(typeSafeModel(), 'jev-1.13.0');
    process.env.TYPESAFE_MODEL = 'jev-9.9.9';
    assert.equal(typeSafeModel(), 'jev-9.9.9');
    process.env.TYPESAFE_MODEL = '   ';
    assert.equal(typeSafeModel(), TYPESAFE_DEFAULT_MODEL, 'a blank env var is not a model id');
  });

  it('typeSafeConfigured() is false for an unset or blank key', () => {
    assert.equal(typeSafeConfigured(), true);
    process.env.TYPESAFE_API_KEY = '   ';
    assert.equal(typeSafeConfigured(), false);
    delete process.env.TYPESAFE_API_KEY;
    assert.equal(typeSafeConfigured(), false);
  });

  // ── the happy path, and the request it actually sends ─────────────────────

  it('POSTs {model,state,questions} to the pinned endpoint with a Bearer key', async () => {
    const { transport, calls } = recordingTransport(200, okBody());
    setTypeSafeTransport(transport);

    const result = await systemOne({ state: STATE, questions: QUESTIONS });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, TYPESAFE_ENDPOINT);
    assert.equal(calls[0].headers['Authorization'], `Bearer ${FAKE_KEY}`);
    const sent = JSON.parse(calls[0].body) as Record<string, unknown>;
    assert.deepEqual(Object.keys(sent).sort(), ['model', 'questions', 'state']);
    assert.equal(sent['model'], TYPESAFE_DEFAULT_MODEL);
    assert.equal(result.answers['which'].choice, 'ILKA');
    assert.equal(result.answers['which'].confidence, 0.15);
    assert.equal(result.answers['relation'].score, 1.03);
    assert.equal(result.usage.input_tokens, 120);
    assert.equal(result.cacheHit, false);
  });

  // ── (j) every failure mode throws, none returns a default answer ──────────

  it('missing key throws TypeSafeUnavailableError(no_key) WITHOUT calling the transport', async () => {
    delete process.env.TYPESAFE_API_KEY;
    const { transport, calls } = recordingTransport(200, okBody());
    setTypeSafeTransport(transport);

    await assert.rejects(
      () => systemOne({ state: STATE, questions: QUESTIONS }),
      (err: unknown) => {
        assert.ok(err instanceof TypeSafeUnavailableError);
        assert.equal(err.reason, 'no_key');
        return true;
      },
    );
    assert.equal(calls.length, 0, 'no key must mean no request at all');
  });

  for (const status of [429, 500]) {
    it(`HTTP ${status} throws TypeSafeUnavailableError(http_error) carrying the status`, async () => {
      const { transport } = recordingTransport(status, '{"error":"upstream said no"}');
      setTypeSafeTransport(transport);
      await assert.rejects(
        () => systemOne({ state: STATE, questions: QUESTIONS }),
        (err: unknown) => {
          assert.ok(err instanceof TypeSafeUnavailableError);
          assert.equal(err.reason, 'http_error');
          assert.equal(err.status, status);
          return true;
        },
      );
    });
  }

  it('a 2xx body that is not a System One response throws (malformed), never a blank answer set', async () => {
    for (const body of ['not json at all', '[]', '{"model":"x"}', '{"answers":{"which":"ILKA"}}']) {
      clearTypeSafeCache();
      const { transport } = recordingTransport(200, body);
      setTypeSafeTransport(transport);
      await assert.rejects(
        () => systemOne({ state: STATE, questions: QUESTIONS }),
        (err: unknown) => {
          assert.ok(err instanceof TypeSafeUnavailableError, `body ${body} should throw the typed error`);
          assert.equal(err.reason, 'malformed');
          return true;
        },
      );
    }
  });

  it('a transport failure throws (transport) rather than resolving', async () => {
    setTypeSafeTransport(async () => { throw new Error('ECONNRESET'); });
    await assert.rejects(
      () => systemOne({ state: STATE, questions: QUESTIONS }),
      (err: unknown) => {
        assert.ok(err instanceof TypeSafeUnavailableError);
        assert.equal(err.reason, 'transport');
        return true;
      },
    );
  });

  it('the 10 s deadline fires and throws (timeout)', (t) => {
    // Mocked timers: the adapter's own setTimeout is what must abort the call,
    // so the test advances the clock rather than waiting ten real seconds.
    t.mock.timers.enable({ apis: ['setTimeout'] });
    setTypeSafeTransport((_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(new Error('aborted')));
    }));
    const pending = systemOne({ state: STATE, questions: QUESTIONS });
    t.mock.timers.tick(10_001);
    return assert.rejects(
      () => pending,
      (err: unknown) => {
        assert.ok(err instanceof TypeSafeUnavailableError);
        assert.equal(err.reason, 'timeout');
        assert.match(err.message, /10000 ms/);
        return true;
      },
    );
  });

  it("a caller's own AbortSignal is honoured and reported as 'aborted'", async () => {
    const ac = new AbortController();
    setTypeSafeTransport((_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(new Error('aborted')));
      queueMicrotask(() => ac.abort());
    }));
    await assert.rejects(
      () => systemOne({ state: STATE, questions: QUESTIONS, signal: ac.signal }),
      (err: unknown) => {
        assert.ok(err instanceof TypeSafeUnavailableError);
        assert.equal(err.reason, 'aborted');
        return true;
      },
    );
  });

  // ── (h) the reproducibility cache ─────────────────────────────────────────

  it('an identical request is served from cache — one transport call, identical answers', async () => {
    const { transport, calls } = recordingTransport(200, okBody());
    setTypeSafeTransport(transport);

    const first = await systemOne({ state: STATE, questions: QUESTIONS });
    const second = await systemOne({ state: STATE, questions: QUESTIONS });

    assert.equal(calls.length, 1, 'the second identical request must not reach the transport');
    assert.equal(first.cacheHit, false);
    assert.equal(second.cacheHit, true);
    assert.deepEqual(second.answers, first.answers);
  });

  it('the cache key covers the state, the questions AND the model', async () => {
    const { transport, calls } = recordingTransport(200, okBody());
    setTypeSafeTransport(transport);

    await systemOne({ state: STATE, questions: QUESTIONS });
    await systemOne({ state: { ...STATE, scene_note: 'different note' }, questions: QUESTIONS });
    assert.equal(calls.length, 2, 'a different state is a different request');

    process.env.TYPESAFE_MODEL = 'jev-9.9.9';
    await systemOne({ state: STATE, questions: QUESTIONS });
    assert.equal(calls.length, 3, 'a different model is a different request');
  });

  it('key order in the state does not change the cache key (canonical JSON)', async () => {
    const { transport, calls } = recordingTransport(200, okBody());
    setTypeSafeTransport(transport);
    await systemOne({ state: { a: 1, b: 2 }, questions: QUESTIONS });
    await systemOne({ state: { b: 2, a: 1 }, questions: QUESTIONS });
    assert.equal(calls.length, 1);
  });

  // ── (i) the key and the state text never reach a log line ─────────────────

  it('the per-call log line carries model/latency/tokens/cacheHit — never the key or the state', async () => {
    const lines: Array<{ msg: string; data: unknown }> = [];
    const realInfo = logger.info;
    const realWarn = logger.warn;
    const realDebug = logger.debug;
    logger.info = (msg, data) => { lines.push({ msg, data }); };
    logger.warn = (msg, data) => { lines.push({ msg, data }); };
    logger.debug = (msg, data) => { lines.push({ msg, data }); };
    try {
      const { transport } = recordingTransport(200, okBody());
      setTypeSafeTransport(transport);
      await systemOne({ state: STATE, questions: QUESTIONS });
      await systemOne({ state: STATE, questions: QUESTIONS });   // cache hit
    } finally {
      logger.info = realInfo;
      logger.warn = realWarn;
      logger.debug = realDebug;
    }

    const calls = lines.filter(l => l.msg === 'typesafe_system_one_call');
    assert.equal(calls.length, 2, 'exactly one structured line per call, cache hits included');
    const serialized = JSON.stringify(lines);
    assert.ok(!serialized.includes(FAKE_KEY), 'the API key must never be logged');
    assert.ok(!serialized.includes(STATE_SECRET_PHRASE), 'the state text must never be logged');
    const first = calls[0].data as Record<string, unknown>;
    assert.deepEqual(Object.keys(first).sort(), ['cacheHit', 'inputTokens', 'model', 'ms', 'outputTokens']);
    assert.equal(first['cacheHit'], false);
    assert.equal((calls[1].data as Record<string, unknown>)['cacheHit'], true);
  });

  it('an upstream that echoes the key back cannot leak it through the error message', async () => {
    const { transport } = recordingTransport(401, `{"error":"bad key ${FAKE_KEY}"}`);
    setTypeSafeTransport(transport);
    await assert.rejects(
      () => systemOne({ state: STATE, questions: QUESTIONS }),
      (err: unknown) => {
        assert.ok(err instanceof TypeSafeUnavailableError);
        // Since 2026-09-21 (PR #268 review finding F4) the body is not in the
        // message AT ALL — redacted or otherwise. The message is the status
        // and a fixed category, which is strictly stronger than redaction:
        // redactSecrets only removes the patterns it knows how to recognise,
        // and an upstream that echoes the REQUEST back carries text no
        // redactor can be expected to match.
        assert.equal(err.message, 'typesafe_http_401');
        assert.ok(!err.message.includes(FAKE_KEY), 'the thrown message must not carry the key');
        return true;
      },
    );
    // redactSecrets is still the guard on the transport and malformed paths,
    // where the message comes from a local exception rather than the upstream.
    assert.equal(redactSecrets(`prefix ${FAKE_KEY} suffix`), 'prefix [redacted] suffix');
  });

  // ── (j) the upstream's own reply text never rides the error out ─────────
  // 2026-09-21 review of PR #268, finding F4. The non-2xx branch used to put
  // `redactSecrets(raw).slice(0, 300)` into the thrown message. `raw` is the
  // UPSTREAM's bytes, and an upstream that validates a request by echoing it
  // (a 400 quoting the offending field is the ordinary shape) hands back the
  // submitted state — which for this adapter's only caller is the candidate
  // scene text and the scene's theme hint. From there it reaches
  // CastAlignment.error, skip()'s logger.warn, and the converge response's
  // history. The adapter's no-state-in-logs contract (property 3 in this
  // file's header) has to cover the reply as well as the request.

  it("(F4) a non-2xx body is never echoed into the thrown message — only the status and a fixed category", async () => {
    const MARK = 'ZZSTATEMARKF4';
    const { transport } = recordingTransport(
      400,
      JSON.stringify({ error: 'rejected', echo: { state: { note: MARK, scene: STATE_SECRET_PHRASE } } }),
    );
    setTypeSafeTransport(transport);
    await assert.rejects(
      () => systemOne({ state: { ...STATE, note: MARK }, questions: QUESTIONS }),
      (err: unknown) => {
        assert.ok(err instanceof TypeSafeUnavailableError);
        assert.equal(err.reason, 'http_error');
        assert.equal(err.status, 400, 'the status is still carried, typed');
        assert.equal(err.message, 'typesafe_http_400', 'the message is a fixed category plus the status');
        assert.ok(!err.message.includes(MARK), 'the submitted marker must not ride the message out');
        assert.ok(!err.message.includes(STATE_SECRET_PHRASE), 'nor the state text');
        return true;
      },
    );
  });

  it('(F4) a malformed 2xx body cannot ride the message out either, via an upstream-chosen answer id', async () => {
    const MARK = 'ZZANSWERIDMARKF4';
    clearTypeSafeCache();
    const { transport } = recordingTransport(
      200,
      JSON.stringify({ model: TYPESAFE_DEFAULT_MODEL, answers: { [MARK]: 'not an answer object' } }),
    );
    setTypeSafeTransport(transport);
    await assert.rejects(
      () => systemOne({ state: STATE, questions: QUESTIONS }),
      (err: unknown) => {
        assert.ok(err instanceof TypeSafeUnavailableError);
        assert.equal(err.reason, 'malformed');
        assert.equal(err.message, 'typesafe_bad_response');
        assert.ok(!err.message.includes(MARK), 'an answer id is upstream-chosen text, not a safe label');
        return true;
      },
    );
  });

  it('a failed call is NOT cached — the next attempt really tries again', async () => {
    let attempt = 0;
    setTypeSafeTransport(async () => {
      attempt += 1;
      return attempt === 1
        ? { status: 500, text: async () => 'upstream down' }
        : { status: 200, text: async () => okBody() };
    });
    await assert.rejects(() => systemOne({ state: STATE, questions: QUESTIONS }));
    const second = await systemOne({ state: STATE, questions: QUESTIONS });
    assert.equal(attempt, 2);
    assert.equal(second.cacheHit, false);
    assert.equal(second.answers['which'].choice, 'ILKA');
  });
});
