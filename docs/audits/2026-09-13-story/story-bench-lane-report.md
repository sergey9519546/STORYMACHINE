# Lane report — `lane/story-bench` (2026-09-13)

**Worktree:** `/home/user/wt-story` (a `git worktree` of the repository, node_modules symlinked, `.env` copied — the copy is gitignored and its key appears in no committed file, no log line and no artifact).
**Branch:** `lane/story-bench`, from `main @ 7663df1f`. Pushed after every commit.
**Brief:** build the first instrument for the owner's 2026-09-13 direction — "let's mainly work on the storymachine ability to actually generate good and quality stories that people will value and be entertained by" — by MEASURING the existing pipeline, not tuning it.

<!-- LOG -->

---

## 1. What the thing IS — including what the brief got wrong

The brief described a generation pipeline. What exists is a **state-simulation
pipeline with one prose step bolted on the end**, and the prose step was dead.

```
premise       ->  (NO STEP EXISTS)              ->  SceneTarget[]
SceneTarget   ->  POST /api/nvm/converge            LLM: StoryOp IR, not prose
winner        ->  POST /api/nvm/converge/commit     deterministic
commits       ->  POST /api/nvm/compile             FIXED ENGLISH TEMPLATES
fountain      ->  POST /api/nvm/revise              LLM, 14 passes — the ONLY prose step
fountain      ->  POST /api/scriptide/doctor        deterministic score
```

Six things the brief, or the repository's own orientation docs, had wrong. Each
was found by reading the code before any of it was built on.

**(a) There is no premise-to-outline step. This is finding #1, as the brief
anticipated it might be.** `POST /api/nvm/converge` takes `target: SceneTarget`
and `POST /api/nvm/converge-arc` takes `scenes: SceneTarget[]`
(`server/lib/validation.ts` `ConvergeBodySchema` / `ConvergeArcBodySchema`); a
`SceneTarget` is `{ sceneIdx, sceneFunction, activeMechanisms, tensionTarget,
qualityTarget?, themeHint? }` (`server/nvm/generate/proof-spec.ts:14-21`). The
Story wizard produces a `StoryConfig` and stops. Nothing turns a paragraph of
English into a beat sheet. The bench's beats are hand-authored in
`tests/fixtures/story-bench-premises.json`, and the fixture's own `_readme`,
the script header and every run say so.

**(b) The compiled screenplay is not generated prose.**
`server/nvm/project/index.ts`'s `renderFountainOp` maps each of the 14 StoryOp
kinds to a fixed English sentence. `'A dangerous hush falls over the room, and
something feels wrong.'` is a string constant (`index.ts:210`), and the comment
above it says why: the wording is chosen so `fountain-analyzer.ts`'s lexicons
read the intended signal. Before the revision passes run, the "screenplay" is a
rendering of a state trace through a sentence table.

**(c) The only prose step could not run at all on the configured endpoint.**
`server/nvm/revision/rewrite-llm.ts` and
`server/nvm/generate/llm-generator.ts` both imported the exported
`geminiProvider` CONSTANT rather than the provider seam. With
`AI_PROVIDER=openai-compat` and no `GEMINI_API_KEY`, `geminiProvider.generate`
throws `Gemini provider not available (GEMINI_API_KEY not set)` on every call,
which each site catches and answers with its documented fallback — the
unchanged draft, and structural stubs. The observable result is fourteen clean
revision passes over a compiled script with a health score beside it, and not
one word of it written by a model.

**(d) Neither generative call site goes through `generateContent()`**, so
neither gets its 30 s `withTimeout` or its 3-attempt `withRetry`. The brief's
hazard (c) — "the 30 s withTimeout will cut them" — does not apply to these two
paths. They call `provider.generate()` directly with no deadline; a slow model
blocks until the ROUTE's own budget fires
(`AI_BUDGET_CONVERGE_TIMEOUT_MS`, 180 s per converge). That is exactly what
happened on this lane's first full run, and §4 records it.

**(e) `POST /api/export/pdf` does not exist.** `server/routes/export.ts` offers
`fdx`, `docx`, `print-html`, `coverage`, `slate`, `breakdown`, `pitchkit` and
`verify`; the only server-side PDF code is the pdfjs-dist IMPORTER
(`server/lib/pdf-import.ts`). The PDF writer is `src/lib/pdf.ts`'s
dependency-free `fountainToPdf()`, which runs in Node exactly as it runs in the
browser, so `--packet` calls it directly — the same paginator the product
ships, which is what the brief asked for.

**(f) The adapter cannot use an ambient `HTTPS_PROXY`, by design.**
`fetchOpenAICompat` supplies its own undici dispatcher pinned to a
DNS-resolved, re-validated IP (its "DNS rebinding — CLOSED at this fetch site"
block). In a sandbox whose only egress is a proxy, that makes every adapter
call fail with `fetch failed` before a byte leaves the box — which is what
`npm run story:bench -- --check` reported on its first run. Weakening the pin
to make a bench run would trade a real SSRF guard for a measurement, so the
bench stands up a loopback HTTP relay and points `AI_BASE_URL` at it instead.
The adapter still builds the request, still sets `max_tokens`, still parses the
response; one TCP hop is replaced.

---

## 2. Item-by-item

| # | item | disposition |
|---|---|---|
| 1 | Adapter hardening | **done, and widened once for cause.** `content:null` → empty completion + `openai_compat_empty_completion`; 400/401/403/404/410 → `OpenAICompatUnavailableError` (names the model, `nonRetryable`, honoured by `withRetry`); `config.maxOutputTokens` → `max_tokens`; `probeOpenAICompatModels()` for `--check`. **Read of what the generators request today:** `rewrite-llm.ts` computes 8,192–32,768 and the adapter was dropping it; `llm-generator.ts` requests NO budget at all. The widening: a fifth fix outside "the adapter" — both generative call sites used the `geminiProvider` constant, so without it the adapter's guards would have been exercised by nothing. Each shown failing first (§3). |
| 2 | `npm run story:bench` | **done.** `scripts/story-bench.mjs`, fixture `tests/fixtures/story-bench-premises.json` (6 premises, 6 shapes, 7–8 beats each), real routes against a booted server with the `.env` provider loaded. Records model, latency, tokens, fallbacks per call; writes scripts, doctor readouts and call logs to `data/story-bench/<date>/` (gitignored — `data/` is in `.gitignore`). Prints the required table. **Deviation, stated:** the premise→outline step the brief asked to find does not exist (§1a), so the beats are fixture data, labelled as such everywhere. |
| 3 | Run it for real, 6 × 1 | see §4 and §5. |
| 4 | Reading packet | **done.** `--packet` → `packet.fountain` + `packet.pdf` under the run directory, front matter with the five-question rubric, a blank grid, and the sentence that six scored scripts is the SEED of Decision #3's ~30-case set and satisfies none of its condition. **Deviation, stated:** through `src/lib/pdf.ts`'s `fountainToPdf()`, not `POST /api/export/pdf` — that route does not exist (§1e). |
| 5 | Honesty boundaries | **done.** No LLM-reader column was added — the optional one is described and not built. No quality claim anywhere; §6 of the method doc states what the doctor cannot see. Nothing the bench produces reaches a user-visible surface. |
| 6 | Docs, brain, ROADMAP, Decision, claims | **done.** `docs/story-generation/STORY_BENCH_2026-09-13.md`; brain notes `Generation - Story Bench`, `Decision 8 - …`, `Audit - 2026-09-13 Story Bench Lane`, linked from `00 Home`; ROADMAP P2 and P4 amendments that add the track WITHOUT touching the Labs gate or Decision #3's condition; `DECISION_LOG.md` Decision #8; claims rows 116–117. `npm run brain` + `check-brain` fresh; brain-coverage green. |

---

## 3. The guards, shown failing first (§3)

Every guard below was written against an upstream shape REPRODUCED live on
2026-09-13 (§3 of `docs/story-generation/STORY_BENCH_2026-09-13.md` has the
measurements), then demonstrated to FAIL on the unfixed code before it was
shown to pass. The demonstration method: apply one targeted un-fix to the
working tree, run
`node --experimental-strip-types tests/core/openai-compat-generation-guards.test.ts`,
restore. Recorded results, all from the same file (15 assertions in total):

| un-fix applied | result |
|---|---|
| the `openai_compat_empty_completion` log line removed | **pass 14 / fail 1** |
| `isPermanentModelFailure` returns `false` (404/410/401 retried as ordinary errors) | **pass 12 / fail 3** |
| `config.maxOutputTokens` dropped instead of forwarded as `max_tokens` | **pass 14 / fail 1** |
| the response emits only `.text`, no `candidates[]`/`finishReason` | **pass 13 / fail 2** |
| both call sites reach for the `geminiProvider` constant again | **pass 13 / fail 2** |
| nothing un-fixed (restored) | **pass 15 / fail 0** |

The three-failure row is the one worth reading: it is the 404, the 410 and the
401 cases, and each asserts BOTH that the error names the model and that
`withRetry` issued exactly **one** request rather than three. The companion
assertion in the same describe block — a 503 that must still be retried — is
what stops the non-retryable flag from widening into "never retry anything".

---

## 4. The bench table

<!-- TABLE -->

---

## 5. Two readings

<!-- READINGS -->

---

## 6. Gates

<!-- GATES -->

---

## 7. Left undone, and why

<!-- UNDONE -->

---

`Tip:` <!-- TIP -->
