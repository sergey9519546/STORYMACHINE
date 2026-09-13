---
type: measurement
updated: 2026-09-13
sources: [scripts/story-bench.mjs, tests/fixtures/story-bench-premises.json, tests/scripts/story-bench.test.ts, tests/core/openai-compat-generation-guards.test.ts, server/lib/ai-providers/openai-compat.ts, server/engine/ai.ts, server/nvm/revision/rewrite-llm.ts, server/nvm/generate/llm-generator.ts, server/nvm/project/index.ts, docs/story-generation/STORY_BENCH_2026-09-13.md]
status: active
---

# Generation — Story Bench

**Question:** what does this repository's generation pipeline actually produce,
and what did each step cost? Nothing had ever answered it —
[[Decision 3 - Demote Generative Surface to Labs]]'s finding was that every
LLM-adjacent test here is plumbing.

**Command:** `npm run story:bench` (`--check` for a `/models` reachability
probe, `--packet` for the reading packet). It needs a key, is not part of
`npm test`, and has no CI step.

## The pipeline, as it really is

```
premise  ->  (NO STEP EXISTS)  ->  SceneTarget[]        hand-authored in the fixture
SceneTarget  ->  POST /api/nvm/converge                 LLM, produces StoryOp IR, not prose
winner       ->  POST /api/nvm/converge/commit          deterministic
commits      ->  POST /api/nvm/compile                  FIXED ENGLISH TEMPLATES
fountain     ->  POST /api/nvm/revise                   LLM, 14 passes — the ONLY prose step
fountain     ->  POST /api/scriptide/doctor             deterministic score
```

Two of those lines are the finding. There is no premise-to-outline step in the
product at all. And `server/nvm/project/index.ts`'s `renderFountainOp` turns
each StoryOp into a constant sentence — `"A dangerous hush falls over the
room, and something feels wrong."` is a literal, chosen to trip
`fountain-analyzer.ts`'s own lexicons. So before the revision passes run, the
"screenplay" is a rendering of a state trace, not writing.

## What was fixed so the measurement could happen at all

Four adapter guards on `server/lib/ai-providers/openai-compat.ts`, each
reproduced live against the configured endpoint and each shown failing on the
unfixed adapter (`tests/core/openai-compat-generation-guards.test.ts`, 15
assertions, loopback mocks, no key):

1. `message.content: null` is an EMPTY completion, logged as
   `openai_compat_empty_completion` with the `reasoning_content` length. It
   already became `''` — silently.
2. HTTP 400/401/403/404/410 become `OpenAICompatUnavailableError`, naming the
   model (the upstream 404 body names only an opaque function UUID) and
   carrying `nonRetryable`, which `withRetry` now honours. One request instead
   of three. A 503 still retries.
3. `config.maxOutputTokens` reaches the wire as `max_tokens`. It was dropped,
   which silently defeated `rewrite-llm.ts`'s 8,192–32,768 budget: a truncated
   rewrite is REJECTED and the pipeline keeps the unchanged draft.
4. The response carries the `@google/genai` shape (`candidates[0].content.
   parts[0].text`, `finishReason`) as well as `.text`, because that is what
   both generative call sites read.

And the call-site half: `server/nvm/revision/rewrite-llm.ts` and
`server/nvm/generate/llm-generator.ts` reached for the `geminiProvider`
CONSTANT, not the seam. Both now use `getLLMProvider()`.

## Two behaviours a reader should not assume

- **Neither generative call site goes through `generateContent()`**, so
  neither gets its 30 s `withTimeout` or its 3-attempt `withRetry`. They call
  `provider.generate()` directly, with no deadline. A slow model simply blocks
  until the route's own budget (`AI_BUDGET_CONVERGE_TIMEOUT_MS`, 180 s per
  converge) fires.
- **One candidate-generation call measured 15–78 s** against the configured
  reasoning model (n = 6, median ~26 s; 391 prompt tokens, 1,370–2,306
  completion tokens, of which most are `reasoning_content`). Capping
  `max_tokens` at 4,000 did NOT reduce it — 15 s and 29 s capped against 78 s,
  20 s and 26 s uncapped — so no cap was added to the candidate generator on
  latency grounds. Measured, not assumed.

## What the doctor cannot see

Health, verdict and scene count on a generated script are real, deterministic
measurements of its STRUCTURE. They say nothing about whether the story is
interesting, whether the dialogue sounds like people, whether a scene ends on a
turn, or whether anyone would keep reading. The reading packet
(`--packet`) exists because a human is the only instrument here that can.

## Sources

- `scripts/story-bench.mjs`, `tests/fixtures/story-bench-premises.json`
- `tests/scripts/story-bench.test.ts` (the helpers, above all `classifyRun`),
  `tests/core/openai-compat-generation-guards.test.ts` (the four guards)
- `docs/story-generation/STORY_BENCH_2026-09-13.md` — method, the run table,
  the two readings
- [[Decision 8 - Generation Quality Becomes a Measured Track]],
  [[Audit - 2026-09-13 Story Bench Lane]]
