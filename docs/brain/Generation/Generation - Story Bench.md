---
type: measurement
updated: 2026-09-18
sources: [scripts/story-bench.mjs, tests/fixtures/story-bench-premises.json, tests/scripts/story-bench.test.ts, tests/core/openai-compat-generation-guards.test.ts, tests/core/llm-generator-schema.test.ts, server/lib/ai-providers/openai-compat.ts, server/lib/ai-providers/schema.ts, server/engine/ai.ts, server/nvm/revision/rewrite-llm.ts, server/nvm/generate/llm-generator.ts, server/nvm/project/index.ts, docs/story-generation/STORY_BENCH_2026-09-13.md]
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
unfixed adapter (`tests/core/openai-compat-generation-guards.test.ts`, 22
assertions as shipped, loopback mocks, no key):

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
CONSTANT, not the seam. Both now use **`getGenerativeProvider()`**
(`server/engine/ai.ts:308`) — not `getLLMProvider()`. The difference is
deliberate and was the round-1 reviewer's item 6: `getGenerativeProvider()`
honours an explicitly configured provider always, and refuses an AUTO-SELECTED
FreeRide for these two surfaces, falling back to `geminiProvider` instead.

## THE SCHEMA DEFECT — the round that overturned the first run

**The v1 run measured nothing about generation, and its own table said so once
the right column existed.** `IR_SCHEMA.ops.items` declared ONE property, `op`,
with no payload. A structured decoder honours that literally, so the endpoint
returned `[{"op":"ADD_FACT"},{"op":"RAISE_CLOCK"}, ...]`; `parseOp` returns null
for every one; `parseIR` falls back to `stubIR`. Over the 83-call v1 run that
was **74 of 74 returned candidates stubbed and ZERO model-authored ops
committed** — so the ContinuityProof collisions v1 blamed on the model were
`stubIR`'s own `(scene, contains, event_N)` facts. The model was fine; the
schema never asked for a payload.

Fixed by declaring all 14 `StoryOp` kinds as an `anyOf`, one branch per kind,
each mirroring `parseOp`; `server/lib/ai-providers/schema.ts` had to be taught
`anyOf`/`oneOf`, `additionalProperties` and explicit type arrays in the same
change, because it was DROPPING them — a union declared and then deleted on the
way to the wire. Round 3 closed two more seams in the same family: the
`SHIFT_RELATIONSHIP` branch declared `pair` as an unbounded array while
`parseOp` requires two elements (so the translator also had to learn
`minItems`/`maxItems`), and the `EMOTION` branch admitted a PARTIAL
`EmotionState`, which the dispatcher stored wholesale and which made
`server/nvm/quality/index.ts:495`'s `(emo.fear + emo.distress) > 100` evaluate
`NaN > 100` — false, so a debt check failed open in silence.
`tests/core/llm-generator-schema.test.ts` now synthesises the SMALLEST payload
each branch permits from that branch's own declaration and requires `parseOp` to
accept it, so a branch looser than the parser fails in CI rather than over a
run's worth of live calls.

**The v2 re-run, on the corrected seam:** `llm_generator_partial_parse` 74 -> 4,
committed scenes 6/45 -> 16/45, model-authored ops committed 0 -> 74, and the
blocking Tier 1 proof moved from ContinuityProof (33 in v1, 0 in v2) to
IntentionalProof (17) — because the model invents characters instead of using
the cast it is given. Read `model scenes` first in either table: it is the
column that decides whether a run measured the model or the stub generator.
Nothing in the v1-to-v2 movement is a QUALITY claim; health, verdict and words
largely restate scenes-committed, per the AUC figures below.

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
- `tests/scripts/story-bench.test.ts` (the helpers, above all `classifyRun`,
  and `rowsFromDir` — the derivation the committed tables rest on),
  `tests/core/openai-compat-generation-guards.test.ts` (the four guards),
  `tests/core/llm-generator-schema.test.ts` (the schema/`parseOp` contract)
- `docs/story-generation/STORY_BENCH_2026-09-13.md` — method, BOTH run tables
  (v1 and the v2 re-run in §4b), and the readings in §5 and §5b
- [[Decision 9 - Generation Quality Becomes a Measured Track]],
  [[Audit - 2026-09-13 Story Bench Lane]]

## What the doctor's own numbers say about reading this

Scene-count scarcity carries AUC ~0.938 of the doctor's discrimination against
~0.076 for the entire weighted-rule channel
(`server/nvm/analyze/doctor.ts:2092-2093`). On a generated script that means
health and verdict are very largely a restatement of how many scenes committed —
which is why the v1-to-v2 comparison is roughly two movements, not nine, and why
the reading packet heads each script with the COMMITTED scene count and names
the doctor's `sceneCount` separately. The doctor's count includes any heading a
revision pass typed with no committed scene behind it: `the-understudy-clause`
is scored on 5 where 3 committed.
