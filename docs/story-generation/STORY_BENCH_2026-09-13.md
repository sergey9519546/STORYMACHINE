# Story Bench — first run, 2026-09-13

**What this document is.** The method and the first measurement of
`npm run story:bench`, the instrument built on 2026-09-13 for the owner's
direction to work on "the storymachine ability to actually generate good and
quality stories that people will value and be entertained by."

**What it is not.** It is not a quality claim, a gate, or a result anyone
should tune against yet. It is a *before*. `docs/DECISION_LOG.md` Decision #8
records why the first lane on that direction measures instead of tuning:
Decision #3 gated the whole generative surface on the finding that every
LLM-adjacent test in this repository is plumbing, and ten days later there was
still no number to improve and no artifact to read.

---

## 1. What the pipeline actually is

Read this section before reading the table. Three of these five lines were not
what the lane's brief — or the repository's own orientation docs — described.

```
premise       ->  (NO STEP EXISTS)              ->  SceneTarget[]
SceneTarget   ->  POST /api/nvm/converge            LLM: StoryOp IR, not prose
winner        ->  POST /api/nvm/converge/commit     deterministic
commits       ->  POST /api/nvm/compile             FIXED ENGLISH TEMPLATES
fountain      ->  POST /api/nvm/revise              LLM: 14 passes — the ONLY prose step
fountain      ->  POST /api/scriptide/doctor        deterministic score
```

**There is no premise-to-outline step.** `POST /api/nvm/converge` and
`POST /api/nvm/converge-arc` both require a `SceneTarget[]` from the caller
(`server/nvm/generate/proof-spec.ts`: `sceneIdx`, `sceneFunction`,
`activeMechanisms`, `tensionTarget`, `themeHint`). The Story wizard produces a
`StoryConfig` and stops. Nothing anywhere turns a paragraph of English into a
beat sheet. The bench's beats are therefore **hand-authored** in
`tests/fixtures/story-bench-premises.json`, and the fixture, the script header
and every run say so. Structure the bench produces is not structure the product
derived.

**The compiled screenplay is not generated prose.**
`server/nvm/project/index.ts`'s `renderFountainOp` maps each StoryOp to a fixed
English sentence. `"A dangerous hush falls over the room, and something feels
wrong."` is a string constant, chosen — per the comment above it — so that
`fountain-analyzer.ts`'s lexicons can read it. Before the revision passes run,
the "screenplay" is a rendering of a state trace.

**`POST /api/nvm/revise` is the only step in the whole pipeline that writes
prose**, and until this lane it could not run at all on an OpenAI-compatible
deployment: `server/nvm/revision/rewrite-llm.ts` and
`server/nvm/generate/llm-generator.ts` both imported the exported
`geminiProvider` CONSTANT instead of the provider seam, so with
`AI_PROVIDER=openai-compat` and no `GEMINI_API_KEY` every call threw *Gemini
provider not available* and took its documented fallback. The result looked
like fourteen clean passes over a compiled script with a health score beside
it, and not one word of it had been written by a model. Both call sites now use
`getLLMProvider()`.

Two further behaviours a reader should not assume:

- **Neither generative call site goes through `generateContent()`**, so neither
  is bounded by its 30 s `withTimeout` or its 3-attempt `withRetry`. They call
  `provider.generate()` directly with no deadline. A slow model blocks until
  the route's own budget fires (`AI_BUDGET_CONVERGE_TIMEOUT_MS`, 180 s per
  converge; `AI_BUDGET_CONVERGE_ARC_TIMEOUT_MS`, 600 s for an arc).
- **`POST /api/export/pdf` does not exist.** Server-side export offers `fdx`,
  `docx`, `print-html`, `coverage`, `slate`, `breakdown`, `pitchkit` and
  `verify`. The PDF writer is `src/lib/pdf.ts`'s dependency-free
  `fountainToPdf()`, which `--packet` calls directly — the same paginator the
  product ships.

---

## 2. Method

```
npm run story:bench -- --check     # /models reachability, spends no generation
npm run story:bench                # six premises, one run each
npm run story:bench -- --only <id> # one premise
npm run story:bench -- --packet    # the reading packet, from the latest run dir
```

**Premises.** Six, in `tests/fixtures/story-bench-premises.json`, written for
this fixture (no existing property, no real person), of six deliberately
different shapes: an ensemble with a large cast, a two-hander, a comedy, a
non-linear mystery, an animation-shaped family film, and a thriller. Each
carries a one-paragraph premise, a genre, a tone, a theme, a cast line and 7–8
hand-authored beats.

**Per premise the bench** converges each beat
(`budget: { maxIterations: 2, candidatesPerIteration: 2 }`, fixed seed
`20260913 + sceneIdx`), commits each winner, compiles, runs the 14-pass
revision, and scores the final text with `POST /api/scriptide/doctor`. It
writes, under `data/story-bench/<date>/` (gitignored — `data/` in
`.gitignore`): the compiled Fountain, the final Fountain, the doctor readout,
the per-premise call log, `table.md`, `summary.json` and the server's whole
structured log stream.

**Call accounting** comes from one structured line per completion,
`openai_compat_call`, emitted by the adapter with the model, latency, prompt
and completion tokens, completion length and finish reason. `metrics.snapshot()`
could not answer this: it buckets by call-site category and keeps no model
identity, and neither generative call site records into it at all.

**A FAILED run is labelled, not reported as a story.** `classifyRun()` marks a
run FAILED when no LLM call reached the provider, or when the revision pipeline
ran and **no** pass changed the text. Both directions are pinned in
`tests/scripts/story-bench.test.ts`.

**Provider.** `AI_PROVIDER=openai-compat` against
`https://integrate.api.nvidia.com/v1`. `AI_MODEL` (pro tier)
`deepseek-ai/deepseek-v4-pro-0813`; `AI_FAST_MODEL`
`nvidia/nemotron-3-super-120b-a12b`. Both generative tasks route to the FAST
tier by `TASK_TIER` in `server/engine/ai.ts` (`CANDIDATE` and `REVISION` are
`'fast'`), so the pro model is not exercised by this run.

**Sandbox note.** The adapter deliberately supplies its own undici dispatcher
pinned to a re-validated IP, so it does not honour an ambient `HTTPS_PROXY`.
Where the only egress is a proxy, every adapter call fails with `fetch failed`
before a byte leaves the box. The bench stands up a loopback HTTP relay and
points `AI_BASE_URL` at it rather than weakening the pin: the adapter still
builds the request, still sets `max_tokens`, still parses the response. One TCP
hop is replaced; nothing that was hardened is bypassed.

---

## 3. Measured endpoint behaviour (reproduced before anything was built)

All measured live on 2026-09-13 against the configured endpoint.

| behaviour | measurement |
|---|---|
| `/models` | HTTP 200, 82 model ids, ~300 ms. Both configured models listed. |
| unavailable model (`writer/palmyra-creative-122b`) | HTTP 404 in 66 ms, body `Function '<uuid>': Not found for account '<acct>'` — **the model is never named** |
| retired model (`deepseek-ai/deepseek-v4-flash`) | HTTP 410 in 269 ms, "has reached its end of life on 2026-08-07" |
| unknown model (`nvidia/nemotron-3-ultra-340b-a28b`) | HTTP 404 in 70 ms, `404 page not found` |
| pro tier (`deepseek-ai/deepseek-v4-pro-0813`), 23-token answer | **47,283 ms** |
| `google/gemma-4-31b-it`, 16-token answer | **53,486 ms** |
| fast tier (`nvidia/nemotron-3-super-120b-a12b`), short prompt | 627–786 ms |
| fast tier, one real candidate-generation prompt (391 prompt tokens, JSON schema) | **15,069 / 20,133 / 25,659 / 29,117 / 78,032 ms** (n = 5 successful; one HTTP 503 at 393 ms). 1,370–2,306 completion tokens, most of them `reasoning_content`. |
| same prompt with `max_tokens: 4000` vs uncapped | 15,069 and 29,117 capped against 78,032, 20,133 and 25,659 uncapped — **the cap does not explain the spread** |

Two consequences were acted on and one deliberately was not.

- The 404/410 shapes are permanent and unnamed, so the adapter raises a
  **named, non-retryable** error. Three attempts at a model an account cannot
  serve cost three round trips for the identical answer.
- Reasoning models on this dialect answer with `content: null` and the text in
  `reasoning_content`, or spend the whole budget thinking. The adapter treats
  that as an **empty completion** and logs it structurally; it already produced
  `''`, silently, which is what made a run of empty completions look like a
  working pipeline.
- **No output cap was added to the candidate generator.** The measurement above
  says a cap would not buy the latency it looks like it should, and an
  unnecessary cap on a JSON response risks truncating it. Measured, not
  assumed.

---

## 4. The run

<!-- TABLE -->

---

## 5. Two readings

<!-- READINGS -->

---

## 6. What the doctor cannot see

The health, verdict and scene count in the table are real, deterministic
measurements, reproducible from the text by `contentHash`. They measure that
script's **structure**: scene count, act balance, causal chains, dialogue
shape, the 3,217-constant rule channel and the scarcity term that dominates it.

They do not measure, and nothing in this repository measures:

- whether the story is interesting;
- whether a line of dialogue sounds like a person said it;
- whether a scene ends on a turn rather than stopping;
- whether a reader would keep going after page two;
- whether the premise was worth telling.

This is not a gap to close with a cleverer rule. By the doctor's own
measurement (`server/nvm/analyze/doctor.ts:2092-2093`) the entire weighted-rule
channel contributes AUC ~0.076 to discrimination while scene-count scarcity
carries ~0.938 — adding rules stopped adding signal a long time ago. The
instrument for the five questions above is a human reader, which is what
`npm run story:bench -- --packet` exists to feed.

`NORTH_STAR.md` §1's *No LLM-as-judge* forbids closing it the other way for
anything a user sees. The bench may carry an optional LLM-reader column, and if
it ever does it will be labelled *research signal, not a verdict*, use a pinned
model and prompt, and feed no user-visible number. It does not carry one today.

---

## 7. What this changes, and what it does not

**Changes.** Generation has an instrument, a recorded first measurement, and a
reading packet a human can score. The next lane has a before to beat.

**Does not change.** The Labs gate stands exactly as Decision #3 set it, and
its condition for re-promotion — roughly 30 cases, a rubric, at least two
scorers, a pinned model, running in CI — is unchanged and unmet. Six scripts is
not thirty and one scorer is not two. No prompt, craft-spec directive, pass
order or convergence budget was tuned. No scoring floor moves;
`node scripts/check-scoring-receipt.mjs main..HEAD` reports no scoring-path
file changed.

## How to reproduce

1. Put a provider in `.env` (`AI_PROVIDER`, `AI_BASE_URL`, `AI_API_KEY`,
   `AI_MODEL`, `AI_FAST_MODEL`).
2. `npm run story:bench -- --check` — confirms the endpoint serves the models
   you configured, and spends no generation.
3. `npm run story:bench` — writes `data/story-bench/<date>/`.
4. `npm run story:bench -- --packet` — writes `packet.fountain` and
   `packet.pdf` in the same directory.

The bench needs a key, is not part of `npm test`, and has no CI step; CI has no
key and never invokes it. With no usable provider it prints why, exits 2, and
says that nothing was measured.
