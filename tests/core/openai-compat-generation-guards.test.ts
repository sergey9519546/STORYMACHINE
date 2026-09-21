// openai-compat-generation-guards.test.ts — the four guards the story-bench
// lane added to server/lib/ai-providers/openai-compat.ts (2026-09-13), plus the
// two call-site regressions that made the generative half inert on any
// OpenAI-compatible endpoint.
//
// WHY EACH GUARD EXISTS. Every one of these was reproduced live against
// https://integrate.api.nvidia.com/v1 on 2026-09-13 before it was written; the
// loopback mocks below replay the exact upstream shapes that run observed.
// Each test is written so it FAILS on the pre-guard adapter — see
// docs/audits/2026-09-13-story/story-bench-lane-report.md §"guards shown
// failing first" for the recorded failure output of each.
//
// No key, no network: every case is a loopback http server. The whole file
// runs in CI.
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { GenerateContentParameters, GenerateContentResponse } from '@google/genai';
import {
  makeOpenAICompatLLMProvider,
  probeOpenAICompatModels,
  OpenAICompatUnavailableError,
} from '../../server/lib/ai-providers/openai-compat.ts';
import { applyConfig } from '../../server/lib/ai-config.ts';
import { getLLMProvider, getGenerativeProvider, setLLMProvider, resetLLMProvider, withRetry, geminiProvider } from '../../server/engine/ai.ts';

function listen(handler: http.RequestListener): Promise<{ url: string; server: http.Server }> {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as { port: number };
      resolve({ url: `http://127.0.0.1:${addr.port}`, server });
    });
  });
}

async function close(server: http.Server): Promise<void> {
  await new Promise<void>((r) => server.close(() => r()));
}

/** Collect every logger line written to stderr while `fn` runs. */
async function captureStderr(fn: () => Promise<void>): Promise<string[]> {
  const lines: string[] = [];
  const original = process.stderr.write.bind(process.stderr);
  (process.stderr as unknown as { write: unknown }).write = (chunk: unknown, ...rest: unknown[]) => {
    lines.push(String(chunk));
    return (original as (...a: unknown[]) => boolean)(chunk, ...rest);
  };
  try {
    await fn();
  } finally {
    (process.stderr as unknown as { write: unknown }).write = original;
  }
  return lines;
}

const BASE_PARAMS = (extra?: Partial<GenerateContentParameters>): GenerateContentParameters => ({
  model: 'test/model-x',
  contents: [{ role: 'user', parts: [{ text: 'Write one scene.' }] }],
  ...extra,
} as GenerateContentParameters);

describe('openai-compat adapter — generation guards', () => {
  after(() => { resetLLMProvider(); applyConfig({ provider: 'gemini' }, {}); });

  // ── Guard 1: content:null is an EMPTY completion, never a success ─────────
  // Reproduced upstream: reasoning models on this dialect answer
  //   { choices: [{ message: { content: null, reasoning_content: "<the whole
  //     completion>" }, finish_reason: "stop" }] }
  it('treats message.content:null as an empty completion and logs it structurally', async () => {
    const { url, server } = await listen((req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        choices: [{
          message: { content: null, reasoning_content: 'x'.repeat(731) },
          finish_reason: 'length',
        }],
        usage: { prompt_tokens: 9, completion_tokens: 512 },
      }));
    });
    try {
      const provider = makeOpenAICompatLLMProvider({ baseURL: url, apiKey: 'k' });
      let response: GenerateContentResponse | undefined;
      const lines = await captureStderr(async () => {
        response = await provider.generate(BASE_PARAMS());
      });

      // The completion is EMPTY — not the string "null", not undefined.
      assert.equal((response as { text?: string }).text, '', 'content:null must become an empty completion');
      assert.equal(
        response?.candidates?.[0]?.content?.parts?.[0]?.text, '',
        'the Gemini-shaped mirror must be empty too, so a caller reading either shape sees the same thing',
      );

      // …and it is OBSERVABLE. The pre-guard adapter produced the same '' with
      // no log line at all, which is exactly what made a run of empty
      // completions look like a working pipeline.
      const hit = lines.map((l) => { try { return JSON.parse(l) as Record<string, unknown>; } catch { return null; } })
        .find((o) => o?.msg === 'openai_compat_empty_completion');
      assert.ok(hit, 'an empty completion must emit openai_compat_empty_completion');
      assert.equal(hit!.contentWasNull, true);
      assert.equal(hit!.reasoningContentChars, 731, 'the reasoning_content length must be reported');
      assert.equal(hit!.finishReason, 'length');
      assert.equal(hit!.model, 'test/model-x');
    } finally { await close(server); }
  });

  it('does not log an empty-completion line when the completion is non-empty', async () => {
    const { url, server } = await listen((req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { content: 'INT. ROOM - DAY' }, finish_reason: 'stop' }] }));
    });
    try {
      const provider = makeOpenAICompatLLMProvider({ baseURL: url, apiKey: 'k' });
      const lines = await captureStderr(async () => { await provider.generate(BASE_PARAMS()); });
      assert.ok(
        !lines.some((l) => l.includes('openai_compat_empty_completion')),
        'a real completion must not be reported as empty (the guard must fire in one direction only)',
      );
    } finally { await close(server); }
  });

  // ── Guard 2: an unavailable model is a NAMED, NON-RETRYABLE failure ───────
  // Reproduced upstream: a model this account cannot serve answers
  //   404 {"detail":"Function '<uuid>': Not found for account '<acct>'"}
  // — a body that names an opaque UUID and never the model the caller asked
  // for. A retired model answers 410 "has reached its end of life".
  // All four permanent statuses, including the two the first round left
  // untested (400 and 403), and each with the WORDING that fits it: a 400 is
  // about the request, a 401/403 about the credential, a 404/410 about the
  // model. `expect` is the phrase that must appear in the message.
  for (const [status, body, expect] of [
    [404, '{"status":404,"title":"Not Found","detail":"Function \'00bdd0a7-e38f\': Not found for account \'acct\'"}', 'is not available from this endpoint'],
    [410, '{"title":"Gone","status":410,"detail":"The model has reached its end of life on 2026-08-07"}', 'is not available from this endpoint'],
    [401, 'unauthorized', 'refused the credential'],
    [403, 'forbidden', 'refused the credential'],
    [400, '{"error":{"message":"messages: too many tokens"}}', 'rejected the request'],
  ] as Array<[number, string, string]>) {
    it(`surfaces HTTP ${status} as a non-retryable error naming the model, and withRetry does not retry it`, async () => {
      let requests = 0;
      const { url, server } = await listen((req, res) => {
        requests++;
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(body);
      });
      try {
        const provider = makeOpenAICompatLLMProvider({ baseURL: url, apiKey: 'k' });
        await assert.rejects(
          () => withRetry(() => provider.generate(BASE_PARAMS()), 'guard-test', 3),
          (err: unknown) => {
            assert.ok(err instanceof OpenAICompatUnavailableError, `expected OpenAICompatUnavailableError, got ${String(err)}`);
            assert.equal((err as OpenAICompatUnavailableError).status, status);
            assert.equal((err as OpenAICompatUnavailableError).model, 'test/model-x');
            assert.equal((err as OpenAICompatUnavailableError).nonRetryable, true);
            // The MODEL must be in the message — the upstream body never is.
            assert.match((err as Error).message, /test\/model-x/);
            // …and the message must describe the RIGHT thing. Reporting a 400
            // as "model not available" sends a reader to check their model id
            // when the request body is what was refused.
            assert.ok(
              (err as Error).message.includes(expect),
              `HTTP ${status} message should say "${expect}", got: ${(err as Error).message}`,
            );
            return true;
          },
        );
        // The retry-storm half of the guard: one request, not three.
        assert.equal(requests, 1, `a permanent failure must be issued once, not retried (saw ${requests})`);
      } finally { await close(server); }
    });
  }

  it('still retries a genuinely transient 503', async () => {
    let requests = 0;
    const { url, server } = await listen((req, res) => {
      requests++;
      if (requests < 2) { res.writeHead(503); res.end('overloaded'); return; }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }));
    });
    try {
      const provider = makeOpenAICompatLLMProvider({ baseURL: url, apiKey: 'k' });
      const res = await withRetry(() => provider.generate(BASE_PARAMS()), 'guard-test-transient', 3);
      assert.equal((res as { text?: string }).text, 'ok');
      assert.equal(requests, 2, 'a 503 must still be retried — the non-retryable flag must not widen to everything');
    } finally { await close(server); }
  });

  // ── Guard 3: maxOutputTokens reaches the wire as max_tokens ──────────────
  // server/nvm/revision/rewrite-llm.ts sizes this to 8_192–32_768 so a whole
  // screenplay comes back un-truncated; the adapter used to drop it.
  it('forwards config.maxOutputTokens as max_tokens', async () => {
    let seenBody: Record<string, unknown> | undefined;
    const { url, server } = await listen((req, res) => {
      let raw = '';
      req.on('data', (d) => { raw += d; });
      req.on('end', () => {
        seenBody = JSON.parse(raw) as Record<string, unknown>;
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }));
      });
    });
    try {
      const provider = makeOpenAICompatLLMProvider({ baseURL: url, apiKey: 'k' });
      await provider.generate(BASE_PARAMS({ config: { maxOutputTokens: 16_384, temperature: 0.4 } }));
      assert.equal(seenBody?.max_tokens, 16_384, 'maxOutputTokens must reach the endpoint as max_tokens');
      assert.equal(seenBody?.temperature, 0.4);
    } finally { await close(server); }
  });

  it('omits max_tokens entirely when the caller sets no budget', async () => {
    let seenBody: Record<string, unknown> | undefined;
    const { url, server } = await listen((req, res) => {
      let raw = '';
      req.on('data', (d) => { raw += d; });
      req.on('end', () => {
        seenBody = JSON.parse(raw) as Record<string, unknown>;
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }));
      });
    });
    try {
      const provider = makeOpenAICompatLLMProvider({ baseURL: url, apiKey: 'k' });
      await provider.generate(BASE_PARAMS({ config: { temperature: 0.4 } }));
      assert.ok(!('max_tokens' in (seenBody ?? {})), 'no budget asked for means no cap imposed');
    } finally { await close(server); }
  });

  // ── Guard 4: BOTH response shapes, including finishReason ────────────────
  it('populates the Gemini-shaped candidates[] and finishReason alongside .text', async () => {
    const { url, server } = await listen((req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        choices: [{ message: { content: 'INT. BAR - NIGHT\n\nShe waits.' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 11, completion_tokens: 22 },
      }));
    });
    try {
      const provider = makeOpenAICompatLLMProvider({ baseURL: url, apiKey: 'k' });
      const res = await provider.generate(BASE_PARAMS());
      // `.text` — what the engine seam's own helpers read.
      assert.equal((res as { text?: string }).text, 'INT. BAR - NIGHT\n\nShe waits.');
      // The @google/genai shape — what rewrite-llm.ts and llm-generator.ts read.
      assert.equal(res.candidates?.[0]?.content?.parts?.[0]?.text, 'INT. BAR - NIGHT\n\nShe waits.');
      // finishReason — what evaluateRewrite() uses to reject a truncated
      // rewrite, in the vocabulary that function actually reads.
      assert.equal(res.candidates?.[0]?.finishReason, 'STOP');
      assert.equal(res.usageMetadata?.promptTokenCount, 11);
      assert.equal(res.usageMetadata?.candidatesTokenCount, 22);
    } finally { await close(server); }
  });

  // ── Guard 4b: a TRUNCATED completion must be legible to evaluateRewrite ──
  // The OpenAI dialect says 'length'; evaluateRewrite's first line tests for
  // 'MAX_TOKENS'. Unmapped, a rewrite the endpoint cut off mid-screenplay is
  // ACCEPTED — it is long enough to clear the length ratio and its truncation
  // flag is a word nothing reads.
  it('maps finish_reason "length" to MAX_TOKENS, so a truncated rewrite is rejected', async () => {
    const original = 'INT. A - DAY\n\n' + 'Something happens here on the page. '.repeat(60);
    const cut = 'INT. A - DAY\n\n' + 'Something happens here on the page. '.repeat(58) + 'Something happ';
    const { url, server } = await listen((req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { content: cut }, finish_reason: 'length' }] }));
    });
    try {
      const provider = makeOpenAICompatLLMProvider({ baseURL: url, apiKey: 'k' });
      const res = await provider.generate(BASE_PARAMS());
      assert.equal(res.candidates?.[0]?.finishReason, 'MAX_TOKENS');

      // …and the consumer that word exists for must act on it. Without the
      // mapping this rewrite is accepted: it is 96% of the original length, so
      // the ratio check passes and only the finish reason could have caught it.
      const { evaluateRewrite } = await import('../../server/nvm/revision/rewrite.ts');
      const verdict = evaluateRewrite(cut, original.length, res.candidates?.[0]?.finishReason);
      assert.equal(verdict.accept, false);
      assert.equal(verdict.reason, 'truncated');
      assert.equal(
        evaluateRewrite(cut, original.length, 'length').accept, true,
        'the unmapped word is invisible to evaluateRewrite — which is the bug this mapping closes',
      );
    } finally { await close(server); }
  });

  it('passes an unrecognised finish_reason through rather than renaming it', async () => {
    const { url, server } = await listen((req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { content: 'ok' }, finish_reason: 'tool_calls' }] }));
    });
    try {
      const provider = makeOpenAICompatLLMProvider({ baseURL: url, apiKey: 'k' });
      const res = await provider.generate(BASE_PARAMS());
      assert.equal(res.candidates?.[0]?.finishReason, 'tool_calls');
    } finally { await close(server); }
  });

  // ── The /models reachability probe ───────────────────────────────────────
  it('probeOpenAICompatModels lists served model ids and never returns the key', async () => {
    let seenAuth: string | undefined;
    const { url, server } = await listen((req, res) => {
      seenAuth = req.headers.authorization;
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: [{ id: 'a/one' }, { id: 'b/two' }, { notAnId: 1 }] }));
    });
    try {
      const probe = await probeOpenAICompatModels({ baseURL: url, apiKey: 'sekret-value' });
      assert.equal(probe.ok, true);
      assert.deepEqual(probe.ids, ['a/one', 'b/two'], 'malformed entries are dropped, not stringified');
      assert.equal(seenAuth, 'Bearer sekret-value', 'the probe must authenticate like every other call');
      assert.ok(
        !JSON.stringify(probe).includes('sekret-value'),
        'the probe result must never carry key material — it is printed by npm run story:bench -- --check',
      );
    } finally { await close(server); }
  });

  it('probeOpenAICompatModels reports a failure instead of throwing', async () => {
    const { url, server } = await listen((req, res) => { res.writeHead(403); res.end('forbidden'); });
    try {
      const probe = await probeOpenAICompatModels({ baseURL: url, apiKey: 'k' });
      assert.equal(probe.ok, false);
      assert.equal(probe.status, 403);
      assert.deepEqual(probe.ids, []);
      assert.match(probe.error ?? '', /forbidden/);
    } finally { await close(server); }
  });
});

// ── The call-site regression: the generative half must use the ACTIVE seam ──
// Until 2026-09-13 both generative call sites imported the `geminiProvider`
// CONSTANT rather than the seam, so a deployment configured for an
// OpenAI-compatible endpoint took its no-key fallback on every call. These two
// tests fail against that code: the wired provider is never consulted.
/** Drop the stand-in and re-select, so sibling files see the manager as before. */
function resetAllProvidersForTest(manager: unknown): void {
  const m = manager as { providers: Map<string, unknown>; currentProvider: unknown; autoSelectProvider: () => void };
  m.providers.delete('freeride');
  m.currentProvider = null;
  m.autoSelectProvider();
}

describe('generative call sites use the configured provider, not the Gemini constant', () => {
  after(() => { resetLLMProvider(); applyConfig({ provider: 'gemini' }, {}); });

  it('the 14-pass revision rewriter calls the wired provider', async () => {
    // Import for its registration side effect — this is the module
    // server/routes/nvm/revision.ts imports for exactly the same reason.
    await import('../../server/nvm/revision/rewrite-llm.ts');
    const { rewritePass } = await import('../../server/nvm/revision/rewrite.ts');

    let calls = 0;
    let sawMaxOutputTokens: number | undefined;
    const fountain = [
      'INT. KITCHEN - DAY', '', 'MAY pours coffee.', '',
      'MAY', 'I am upset about the money.', '',
      'INT. PORCH - LATER', '', 'RAY waits.', '',
    ].join('\n');
    const revised = fountain.replace('I am upset about the money.', 'The coffee is fine. It is always fine.');

    setLLMProvider({
      generate: async (params: GenerateContentParameters) => {
        calls++;
        sawMaxOutputTokens = params.config?.maxOutputTokens;
        return {
          text: revised,
          candidates: [{ content: { role: 'model', parts: [{ text: revised }] }, finishReason: 'STOP' }],
        } as unknown as GenerateContentResponse;
      },
    });

    const result = await rewritePass({
      fountain,
      issues: [{
        rule: 'ON_THE_NOSE', severity: 'major', location: 'scene 1',
        description: 'The line states its own subtext.',
        suggestedFix: 'Let the line be about the coffee.',
      }],
      passName: 'dialogue',
      approvedSpans: [],
    } as unknown as Parameters<typeof rewritePass>[0]);

    assert.equal(calls, 1, 'the wired provider must be the one that is called');
    assert.equal(result.usedLLM, true, 'a successful rewrite must be reported as an LLM rewrite, not a fallback');
    assert.ok(result.revised.includes('The coffee is fine'), 'the rewrite must be the text that comes back');
    assert.ok(
      typeof sawMaxOutputTokens === 'number' && sawMaxOutputTokens >= 8_192,
      'the rewriter must still budget output tokens for a whole screenplay',
    );
  });

  it('the NVM candidate generator calls the wired provider', async () => {
    const { makeLLMCandidateGenerator, isStubIR } = await import('../../server/nvm/generate/llm-generator.ts');

    let calls = 0;
    const payload = JSON.stringify({
      candidates: [{
        transitionId: 't-1',
        sceneFunction: 'build_tension',
        ops: [
          { op: 'RAISE_CLOCK', clockId: 'last-ferry', amount: 2 },
          { op: 'RECORD_VISUAL_FACT', sceneId: 's0', fact: 'a wet coat over the radiator' },
        ],
      }],
    });
    setLLMProvider({
      generate: async () => {
        calls++;
        return {
          text: payload,
          candidates: [{ content: { role: 'model', parts: [{ text: payload }] }, finishReason: 'STOP' }],
        } as unknown as GenerateContentResponse;
      },
    });

    const generate = makeLLMCandidateGenerator();
    const spec = {
      state: {},
      target: { sceneIdx: 0, sceneFunction: 'build_tension', activeMechanisms: ['suspense'], tensionTarget: 60 },
      constraints: [],
      systemPreamble: 'Write a scene.',
    } as unknown as Parameters<typeof generate>[0];

    const irs = await generate(spec, 1);
    assert.equal(calls, 1, 'the wired provider must be the one that is called');
    assert.equal(irs.length, 1);
    assert.equal(
      isStubIR(irs[0]), false,
      'a provider that answered must not be reported as a structural stub — that is the silent fallback this regression is about',
    );
    assert.equal(irs[0].ops.length, 2);
  });

  it('still falls back to the documented stub when no provider can answer', async () => {
    const { makeLLMCandidateGenerator, isStubIR } = await import('../../server/nvm/generate/llm-generator.ts');
    setLLMProvider({ generate: async () => { throw new Error('no provider'); } });
    const generate = makeLLMCandidateGenerator();
    const spec = {
      state: {},
      target: { sceneIdx: 0, sceneFunction: 'build_tension', activeMechanisms: ['suspense'], tensionTarget: 60 },
      constraints: [],
      systemPreamble: 'Write a scene.',
    } as unknown as Parameters<typeof generate>[0];
    const irs = await generate(spec, 2);
    assert.equal(irs.length, 2);
    assert.ok(irs.every(isStubIR), 'the keyless fallback must be unchanged');
  });

  // ── The provider POLICY for these two surfaces (round 2, review MEDIUM 5) ──
  // aiProviderManager.autoSelectProvider()'s priority is freeride > gemini, so
  // re-pointing the call sites at the raw seam quietly routed the only prose
  // step to the legacy OpenRouter bridge on any deployment with
  // OPENROUTER_API_KEY set — a bridge ai-config.ts's llmReady() explicitly
  // refuses to count as ready for these surfaces. Both directions are pinned.
  it('a Gemini-keyed deployment keeps the provider it had before the fix', () => {
    resetLLMProvider();               // no explicit wiring, no manager entry here
    assert.equal(
      getGenerativeProvider(), geminiProvider,
      'with nothing auto-selected the generative seam is the Gemini provider — exactly what both call sites used before this lane',
    );
  });

  it('an explicitly configured openai-compat provider IS used', async () => {
    const { url, server } = await listen((req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { content: 'configured' } }] }));
    });
    try {
      applyConfig({ provider: 'openai-compat', baseUrl: url, model: 'local-model' }, {});
      const res = await getGenerativeProvider().generate(BASE_PARAMS());
      assert.equal((res as { text?: string }).text, 'configured',
        'an explicit configuration must always win — the FreeRide carve-out must not swallow it');
    } finally { await close(server); applyConfig({ provider: 'gemini' }, {}); }
  });

  it('an AUTO-SELECTED FreeRide bridge is never chosen for these two surfaces', async () => {
    const { aiProviderManager } = await import('../../server/engine/ai-provider.ts');
    // A stand-in with the manager's own id; registering a real FreeRideProvider
    // would need a key and would reach OpenRouter.
    let freeRideCalls = 0;
    const fake = {
      id: 'freeride', name: 'FreeRide (stand-in)', tier: 'free' as const,
      generate: async () => { freeRideCalls++; return { text: 'from freeride' } as never; },
    };
    aiProviderManager.registerProvider('freeride', fake as never);
    aiProviderManager.setProvider('freeride');
    try {
      resetLLMProvider();
      // The raw accessor sees it — that is its job, and other callers may want it.
      assert.notEqual(getLLMProvider(), geminiProvider, 'the raw seam does hold the auto-selected provider');
      // The generative seam does not.
      assert.equal(
        getGenerativeProvider(), geminiProvider,
        'an auto-selected FreeRide must not serve the prose rewriter or candidate generation',
      );
      // geminiProvider.generate THROWS synchronously without a key, so this
      // needs a try/catch rather than a rejected-promise handler.
      try { await getGenerativeProvider().generate(BASE_PARAMS()); } catch { /* no key: expected */ }
      assert.equal(freeRideCalls, 0, 'the FreeRide bridge must not receive a generative call');
    } finally {
      resetAllProvidersForTest(aiProviderManager);
      resetLLMProvider();
    }
  });

  it('getLLMProvider returns whatever ai-config last wired', async () => {
    const { url, server } = await listen((req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { content: 'wired' } }] }));
    });
    try {
      applyConfig({ provider: 'openai-compat', baseUrl: url, model: 'local-model' }, {});
      const res = await getLLMProvider().generate(BASE_PARAMS());
      assert.equal((res as { text?: string }).text, 'wired');
    } finally { await close(server); }
  });
});
