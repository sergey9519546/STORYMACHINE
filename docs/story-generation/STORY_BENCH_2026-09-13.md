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

`npm run story:bench`, six premises, one run each, 2026-09-13. Reproduced from
`data/story-bench/2026-09-13/table.md` (the scripts themselves stay in that
gitignored directory; only numbers are quoted here).

| premise               | shape                 | scenes | words | health | verdict | llm calls | fallbacks | passes changed | wall s | tokens | status |
|-----------------------|-----------------------|--------|-------|--------|---------|-----------|-----------|----------------|--------|--------|--------|
| harbor-lights         | ensemble / large cast | 1/8    | 142   | 0      | PASS    | 16        | 15        | 2/14           | 1010.4 | 95444  | ok     |
| counterweight         | two-hander            | 1/7    | 60    | 0      | PASS    | 10        | 12        | 1/14           | 1170.3 | 52936  | ok     |
| the-understudy-clause | comedy                | 1/7    | 85    | 0      | PASS    | 15        | 15        | 2/14           | 779.0  | 83118  | ok     |
| nine-minutes-of-tape  | non-linear            | 1/7    | 117   | 0      | PASS    | 14        | 14        | 1/14           | 1047.1 | 97541  | ok     |
| the-long-way-round    | animation / family    | 1/8    | 100   | 30     | PASS    | 13        | 15        | 1/14           | 1642.1 | 74804  | ok     |
| cold-open             | thriller              | 1/8    | 83    | 0      | PASS    | 15        | 15        | 2/14           | 1230.4 | 83230  | ok     |

Totals: **83 LLM calls, 0 empty completions, 487,073 tokens, 114.7 minutes of
wall clock, 6 of 45 requested scenes committed.**

**Read the `scenes` column first. It is committed/requested, and it is 1 of 7
or 1 of 8 on every premise without exception.** The target was 6–10 scenes and
6–12 pages; what came out is one scene and 60–142 words. That is the run's
headline, and the per-scene records say exactly why:

| premise | scenes rejected by ContinuityProof | scenes with no Tier-1-passing candidate | scenes lost to the converge budget |
|---|---|---|---|
| harbor-lights | 6 | 6 | 1 |
| counterweight | 4 | 4 | 2 |
| the-understudy-clause | 6 | 6 | 0 |
| nine-minutes-of-tape | 6 | 6 | 0 |
| the-long-way-round | 5 | 5 | 2 |
| cold-open | 6 | 6 | 1 |

**ContinuityProof rejected 33 of the 39 scenes that were not committed — and
the facts that collided were never the model's.** *(Corrected in round 2; the
first statement of this paragraph blamed the prompt context, and would have
pointed the next lane at the wrong component.)*

Every one of the 74 `llm_generator_partial_parse` lines in this run has
`stubbed === returned`: **not one model-authored candidate survived `parseOp`,
in any scene, of any premise.** With 11 `llm_generator_failed` beside them,
**zero model-authored ops reached a committed scene in the whole 114.7-minute
run.** So every commit after scene one was a STUB colliding with scene one's
stub. `stubIR` (`server/nvm/generate/llm-generator.ts`) hard-codes
`ADD_FACT { subject:'scene', predicate:'contains', object:'event_<idx>' }`, and
ContinuityProof (`server/nvm/proof/tier1/continuity.ts`) blocks two facts
sharing a `(subject, predicate)` over overlapping validity with different
objects — which two stubs of different candidate index, committed in different
scenes, always are. The proof behaved exactly as specified, on input the bench
itself generated.

**The cause is the JSON-schema seam, and it costs one call to see.**
`IR_SCHEMA` declared `ops.items` as `{properties:{op},required:['op']}` — one
property, no payload — and a structured decoder honours that literally.
Measured live on this endpoint, same prompt, two schemas:

| schema | latency | ops returned | ops carrying any field besides `op` |
|---|---|---|---|
| the shipped `IR_SCHEMA` | 6,054 ms | 4 | **0 of 4** — `[{"op":"ADD_FACT"},{"op":"UPDATE_BELIEF"},{"op":"SEED_CLUE"},{"op":"RAISE_CLOCK"}]` |
| `anyOf`, one branch per op kind | 15,575 ms | 4 | **4 of 4**, full `AtomicFact` / `Belief` payloads |

`parseOp` returns null for a payload-less op, `parseIR` falls back to `stubIR`,
and the warn line fires. Telling the generator the existing `(subject,
predicate)` pairs — which is what the first version of this paragraph proposed
— would have changed nothing at all while the schema kept asking for no
payload. Fixed in round 2 (`9d392911`), and §4b is the re-run.

**Every premise also had zero Tier-1-passing candidates** (`noWinner` equals
the ContinuityProof count in every row): the bench committed the best-of-run IR
in each case, which the commit route then re-proved and refused. The reason
sits in the `fallbacks` column: **86 fallbacks against 83 LLM calls** — 74
`llm_generator_partial_parse`, 11 `llm_generator_failed` and 1
`revision_rewrite_failed`. The 74 are the important ones: the model answered,
but its ops failed `parseOp` in `server/nvm/generate/llm-generator.ts` and the
candidate degraded to a structural stub. A stub scores composite 0, which is what every
`composite=0` note in the run records.

**The REVISION step is now demonstrably alive. The candidate generator is
not.** *(Narrowed in round 2; the first statement claimed "the generative half"
and the table could not show which half.)* 83 calls reached the provider, none
returned an empty completion, and 487,073 tokens were spent — those three
numbers prove the TRANSPORT works. What they do not prove is generation: of the
83 calls, the candidate-generation ones contributed **zero ops to zero
committed scenes**, and the only model-authored text anywhere in this run is
whatever 9 of 84 revision passes changed. Before the call-site fix in
`1a5af829` even that would have read 0/84.

The table grew the column that decides this, so the rows say it without a
paragraph: **`model scenes`**, committed scenes whose IR is not a stub
(`ir.provenance.model !== 'stub'`, a field already on every IR). On the v1 run
it is **0/1 in all six rows**.

**The health column is not a result to read as quality — but the verdict
column is the doctor getting it right.** *(Corrected in round 2. The first
statement of this paragraph read PASS as an endorsement. It is the opposite.)*
`verdictFor` (`server/nvm/analyze/doctor.ts:860`) is three lines: `health >= 85
&& sceneCount >= 8 → RECOMMEND`; `health < 60 → PASS`; else `CONSIDER`. In
coverage vocabulary **PASS is a reader passing ON the script** — the harshest
of the three. Health 0 on a 60-word fragment therefore produces exactly the
right verdict, by the shortest path in the file, and six PASSes is the doctor
rejecting six fragments rather than blessing them.

The doctor also said so in words, and the first version of this bench threw the
sentence away. `excerptNote` (`doctor.ts:900-910`, wired at `doctor.ts:2308`)
reads, on these scripts: *"This reads like an excerpt (1 scene analyzed):
scores and verdicts are computed the same way as for a full script, but with
this little material they should be read as feedback on the pages, not coverage
of a feature."* The readout writer kept only health, verdict, sceneCount,
contentHash and ten findings — so an instrument built to report what the doctor
can and cannot see discarded the doctor's own disclosure. It is kept now, with
`pageEstimate` and a `verdictMeaning` line beside the verdict.

**The one non-zero health in the table is the sharpest single observation in
this run.** `the-long-way-round` scores 30 where the other five score 0, and
the reason is not craft. Its compiled draft has **one** scene heading; its
final draft has **two** (`the-long-way-round.compiled.fountain` vs
`.final.fountain`, `INT. SCENE 1 - MOMENTS LATER` at line 13), because a
revision pass invented a second heading that no committed scene backs — and
`the-long-way-round.calls.json` records exactly one pass that changed text on
that script, **`intention`**. The
doctor scored the document it was given — `sceneCount` 2 instead of 1 — and the
health moved. That is the scene-count scarcity term the doctor's own
measurement says carries AUC ~0.938 (`server/nvm/analyze/doctor.ts:2092-2093`),
being moved by a rewriter typing a slugline. No new story exists; a heading
does.

---

## 5. Two readings

Both scripts were read start to finish, in the files under
`data/story-bench/2026-09-13/` (gitignored, so paths and line numbers below are
the evidence; no quoted text beyond a phrase).

### HARBOR LIGHTS (ensemble, 8 beats requested, 1 committed) — 29 lines

`harbor-lights.final.fountain`, the whole script.

**What a reader would say first is that this is not a scene.** Six characters
appear at lines 4, 8, 11, 14, 17 and 20. Each says one line. None of them
answers, interrupts, contradicts or even acknowledges the one before. There is
no exchange, so there is nothing to follow; the page is six captions stacked on
top of each other. Nobody wants anything from anyone else in the room, which is
the whole of drama gone missing in nine lines.

**The dialogue is not on-the-nose; it is the nose.** Every line is the
character's belief restated as speech — this is literally what it is, since the
cast grounding (`castGroundingOps`) injects one belief per character and the
compiler renders `UPDATE_BELIEF` as `CHARACTER / (believing) <proposition>`.
The revision pass rewrote the form and kept the content: line 9 is "You must
open it tonight", line 15 is "The certificate will hold", line 21 is the
character's seeded belief verbatim, unchanged, presented as a line of dialogue.
A reader cannot tell the difference between a character and a logline about
that character.

**The scene does not end; it stops, three times.** Lines 23, 25 and 29 are
three consecutive action paragraphs that each say the same thing in different
words — a hush, a hum, a tick, and the air is heavy, then tight. Nothing has
changed between them. There is no turn anywhere on the page, because there is
no event: the last thing that happens is at line 6, where TOMAS hides the
letter, and the remaining 23 lines describe a room.

**`event_0` is printed in the finished screenplay** — lines 25 and 29 carry the
raw internal op identifier in the prose the writer would read (`"the scene
holds event_0"`, `"As event_0 lingers"`). **Twice in this screenplay, three
times across the run** (harbor-lights 2, counterweight 1, the other four 0);
the first statement of this sentence said three times here, and in a report
about honest counting that is worth correcting. It came from the stub
generator's `object: 'event_0'` and survived fourteen revision passes.

**Line 27 is not a sentence.** "Silence thick here."

**And the title page is gone.** The compiled draft opens with `Title: HARBOR
LIGHTS` / `Credit: Written by STORYMACHINE`
(`harbor-lights.compiled.fountain:1-2`); the final draft starts at the scene
heading. Two passes changed this script and `harbor-lights.calls.json` names
them — **`intention` and `rhythm`** — so the title page went out under one of
those two, and neither of the twelve that followed noticed.

**What the doctor said about it:** health **0**, verdict **PASS**, sceneCount
1 (`harbor-lights.doctor.json`). The top finding is `PASSIVE_ESCALATION`
("no character causes a reversal"), which is right. Underneath it are five
`INTENTION_INVISIBLE` findings, one per character, saying each "appears in the
screenplay but has no tracked beliefs or goals" — about the six characters
whose ONLY content is a tracked belief, which the revision pass had just
rewritten into dialogue. A verdict of PASS on a 142-word fragment is the number
this lane most wants a reader to distrust.

### COUNTERWEIGHT (two-hander, 7 beats requested, 1 committed) — 17 lines

`counterweight.final.fountain`, the whole script.

**This one is better, and the reason is worth naming.** Two people want
opposite things and both lines say so: ILKA at line 8 wants the bridge cleared
by dawn, DESMOND at line 11 wants it stopped before someone is hurt. That is a
real opposition, on the page, in eleven lines. It is better than HARBOR LIGHTS
for a structural reason, not a craft one — a two-hander has two beliefs to
ground, so the one scene the pipeline managed to commit happens to contain the
entire conflict. With six characters the same mechanism produces a queue.

**It is still on-the-nose in the most literal way available.** Compare
`counterweight.compiled.fountain:8` — `(believing) the calculation was right
and the bridge is safe` — with `counterweight.final.fountain:8`. The revision
pass did not dramatise the belief; it paraphrased it into the present tense and
gave it a want. Both characters announce their position in their only line.
Neither hides anything, neither deflects, and the film's actual subject — that
one of them knows she was wrong — is nowhere on the page, because the beat that
carried it (`set_up_payoff`, "the notebook page she did not submit") was one of
the four scenes rejected.

**The scene ends without a turn, twice over.** Line 13, the one genuinely
dramatic beat in the script, is an action the revision pass invented: Ilka
slams her palm and the room goes quiet. It is then immediately followed by line
15, a template constant — "A dangerous hush falls over the room, and something
feels wrong" — which says the same thing again, worse, in the words
`server/nvm/project/index.ts:210` supplies for a positive suspense delta. And
line 17, the last line of the screenplay, is `"Scene contains event_0, plain
and undeniable now."` The script ends on an internal identifier.

**There is no midpoint, because there is no middle.** Seven beats were asked
for and one committed; four were rejected by ContinuityProof and two lost the
converge call to the route's budget. What is on the page is beat one. The
structure the fixture describes — the tide, the notebook page, the moment he
reveals he has already read it — does not exist in any file.

**What the doctor said about it:** health **0**, verdict **PASS**, sceneCount
1, and exactly two findings, both `INTENTION_INVISIBLE`, one per character.
The one thing the doctor flagged is the one thing the script arguably does have
— each character states a want in their only line. Nothing in the report
mentions that the screenplay is seventeen lines long, ends on `event_0`, or
contains a single scene.

---

## 4b. The re-run with the corrected seam (v2)

The seam fix (`9d392911`) changed what the pipeline produces, so the run was
repeated on the corrected seam. Both tables are kept, because the difference
between them is the measurement.

**v1 — what the bench measured before the fix** (`data/story-bench/2026-09-13/`):
the STUB generator, colliding with itself. Re-labelled here by round 2's
structural classifier, which is the label these runs should always have carried:

| premise | shape | scenes | model scenes | words | health | verdict | llm calls | fallbacks | passes changed | wall s | tokens | v1 label | round-2 label |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| harbor-lights | ensemble / large cast | 1/8 | 0/1 | 142 | 0 | PASS | 16 | 15 | 2/14 | 1010.4 | 95444 | ok | **FAILED** |
| counterweight | two-hander | 1/7 | 0/1 | 60 | 0 | PASS | 10 | 12 | 1/14 | 1170.3 | 52936 | ok | **FAILED** |
| the-understudy-clause | comedy | 1/7 | 0/1 | 85 | 0 | PASS | 15 | 15 | 2/14 | 779.0 | 83118 | ok | **FAILED** |
| nine-minutes-of-tape | non-linear | 1/7 | 0/1 | 117 | 0 | PASS | 14 | 14 | 1/14 | 1047.1 | 97541 | ok | **FAILED** |
| the-long-way-round | animation / family | 1/8 | 0/1 | 100 | 30 | PASS | 13 | 15 | 1/14 | 1642.1 | 74804 | ok | **FAILED** |
| cold-open | thriller | 1/8 | 0/1 | 83 | 0 | PASS | 15 | 15 | 2/14 | 1230.4 | 83230 | ok | **FAILED** |

83 calls · 86 fallbacks (74 `llm_generator_partial_parse`) · 487,073 tokens ·
114.7 min · **6 of 45 scenes committed, 0 of them model-authored** · 33
ContinuityProof blocks, all of them stub-versus-stub. Every row re-labels from
`ok` to `FAILED — no committed scene carried a model-authored op (every
candidate stubbed)`, which is what actually happened.

**v2 — the same six premises on the corrected seam**
(`data/story-bench/2026-09-13-run2/`):

| premise | shape | scenes | model scenes | words | health | verdict | llm calls | fallbacks | passes changed | wall s | tokens | status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| harbor-lights | ensemble / large cast | 3/8 | 2/3 | 290 | 53.3 | PASS | 21 | 1 | 4/14 | 1342.1 | 152592 | FRAGMENT |
| counterweight | two-hander | 3/7 | 2/3 | 320 | 65 | CONSIDER | 20 | 3 | 6/14 | 1167.0 | 119007 | FRAGMENT |
| the-understudy-clause | comedy | 3/7 | 3/3 | 437 | 71.9 | CONSIDER | 15 | 5 | 4/14 | 1481.9 | 110402 | FRAGMENT |
| nine-minutes-of-tape | non-linear | 4/7 | 4/4 | 835 | 74.4 | CONSIDER | 23 | 1 | 8/14 | 1498.4 | 156757 | DEGRADED |
| the-long-way-round | animation / family | 1/8 | 1/1 | 132 | 0 | PASS | 15 | 2 | 2/14 | 1197.2 | 83096 | FRAGMENT |
| cold-open | thriller | 2/8 | 2/2 | 196 | 30 | PASS | 12 | 8 | 2/14 | 2065.1 | 76664 | FRAGMENT |

106 calls · 20 fallbacks · 698,518 tokens · 145.9 min · **16 of 45 scenes
committed, 14 of them model-authored, carrying 74 model-written ops** · 26 of
84 revision passes changed text · 17 IntentionalProof blocks, 0 ContinuityProof
blocks.

**What moved, and what did not.**

| | v1 | v2 |
|---|---|---|
| scenes committed | 6 / 45 | **16 / 45** |
| committed scenes whose IR came from the model | **0 / 6** | **14 / 16** |
| model-authored ops committed | **0** | **74** |
| fallbacks per LLM call | 86 / 83 ≈ **1.04** | 20 / 106 ≈ **0.19** |
| `llm_generator_partial_parse` | **74** | **4** |
| revision passes that changed text | 9 / 84 | **26 / 84** |
| words per script | 60–142 | **132–835** |
| health | 0, 0, 0, 0, 30, 0 | 53.3, 65, 71.9, 74.4, 0, 30 |
| verdicts | six PASS (rejection) | three PASS, **three CONSIDER** |
| the blocking Tier 1 proof | ContinuityProof × 33 | **IntentionalProof × 17**, ContinuityProof × 0 |
| every run's label | FAILED | 5 FRAGMENT, 1 DEGRADED |

**Read `model scenes` first, as in v1.** It is 14 of 16 rather than 0 of 6: the
model is now writing the story ops that reach a commit. `llm_generator_partial_parse`
fell from 74 to **4**, which is the schema fix measured end to end.

**The failure mode MOVED rather than disappearing.** ContinuityProof, which
blocked 33 scenes in v1, blocked **none** in v2 — confirming that what it was
refusing was the stub generator's own `scene.contains = event_N` facts.
IntentionalProof now blocks 17, and the readings in §5b show why: the model
invents characters (`PROTAGONIST`, `Alex`, `Antagonist`, `Rila`, `Char1`)
instead of using the cast it is given, and an op referencing a character with no
belief in state is a Tier 1 block. That is a real finding about the generation
loop and the first one this bench has produced that is ABOUT the model.

**Nothing here is a quality claim, and one row got worse.**
`the-long-way-round` went from 1/8 to 1/8 and health 30 to health 0 — six
premises, one run each, on a stochastic generator whose per-call latency varies
5×. The table records a change in what the pipeline can assemble; it does not
establish that any script is good, and §6 is still what the doctor cannot see.

---

## 4c. Two more instrument defects this run found

Both were found by running the bench, which is what it is for, and both are
disclosed rather than quietly fixed.

**1. undici's 300 s `headersTimeout` was aborting the 14-pass revision, and it
is not the `AbortSignal`.** `POST /api/nvm/revise` sends no headers until all
fourteen sequential LLM passes have finished. undici's default
`headersTimeout` fires independently of a request's `AbortSignal`, so a
revision that legitimately ran past five minutes was killed client-side with a
bare `fetch failed`. **Three of the six v2 rows lost their ENTIRE revision step
to it at 301 s** — `counterweight`, `nine-minutes-of-tape` and
`the-long-way-round` — and the bench recorded `revise failed — fetch failed`
with no hint that the deadline was its own. Fixed in `ee115561` (the bench's
own calls go through an `undici.Agent` with `headersTimeout` and `bodyTimeout`
disabled, leaving the `AbortSignal` as the single real deadline), and **those
three premises were re-run** on the fixed client into the same run directory;
the v2 table above is the corrected one. The fix is visible in the numbers:
`counterweight`'s revision now runs **405 s** and changes 6 of 14 passes, where
before it was cut at 301 s having changed none.

This is distinct from the `converge failed (300s)` lines in both runs, which
are genuine: those carry `AI_BUDGET_DEADLINE_EXCEEDED` from the route's own
budget, which this bench deliberately raised to 300 s for the server it boots.

**2. Re-running one premise used to destroy the other five.** `table.md` and
`summary.json` were written from whatever premises THIS invocation ran, so
`--only <id>` after a six-premise run replaced a six-row table with a one-row
one and turned `--packet` into a one-script packet. The reviewer hit it for
real while reproducing a single row and restored 29 files by hand. Now each
premise writes `<id>.row.json` and the table and summary are **derived** from
every row file in the directory, in fixture order — so re-running the three
rows defect 1 cost was additive, which is how the v2 table above came to exist
without a second two-hour run. `--into <dir>` is the named way to write into an
existing run; `--out` still refuses to reuse a directory that holds a
`summary.json`.

---

## 5b. Two readings of the v2 output

Read start to finish in `data/story-bench/2026-09-13-run2/` (gitignored; paths
and line numbers are the evidence, no quoted text beyond a phrase). Both
premises below completed their revision step, so their numbers are final and
unaffected by the `headersTimeout` defect in §4c.

### THE UNDERSTUDY CLAUSE (comedy, 3 of 7 scenes committed) — 101 lines

`the-understudy-clause.final.fountain`. Health **71.9**, verdict **CONSIDER**,
sceneCount 5, 3 pages, 437 words — the strongest row in the run, and the first
script this bench has produced that a reader can get lost in for a page.

**Something new happens here, and it is not what the pipeline was asked to
do.** Lines 1–57 are the three committed scenes, still rendered through the
template table. Lines 59–101 are two entirely new scenes the REVISION pipeline
wrote from nothing — real sluglines (`INT. ARCHIVE ROOM - NIGHT`,
`INT. THEATER LOBBY - NIGHT`), alternating cues, actions between lines. They
have beats: ALEX wants the dossier, MR_DAWE will not hand it over, and the
exchange escalates over four turns to `ALEX lunges.` (76). It is the only
passage in either run with the shape of a scene.

**And it is a different film.** The premise is a regional theatre faking a
press night for an insurance payout. Lines 59–78 are an archive heist between
two characters who are not in the cast, about a sealed dossier, with a red LED
counting to 00:00. The revision pipeline invented a protagonist (`ALEX`), an
antagonist role (`Antagonist`, 21 and 23) and a location, and wrote them
competently into a story nobody asked for. The comedy — the clerk who cannot
act, the critic, the assessor in seat F12 — never appears.

**The dialogue tells you how it is being said.** Line 62 is `"I whisper, it's
done."`; line 93 is `"I raise my voice: the insurance pays only if the show
goes on."`; line 14 is `"I'm skeptical—something about the lead feels wrong"`.
The performance direction has been folded into the words, which is what
happens when a belief with a confidence value is asked to become a line: the
attitude is data, so it gets typed.

**The internal identifiers reached the page again, and this time one of them is
a character in the story.** `"id 2"`, `"id 3"`, `"id 4"` are printed as clue
text at lines 25, 36 and 55, and at lines 27, 38 and 53 the same string is the
ticking clock: *"running out of time before the id 2 reaches its final hour"*.
That sentence is a template constant with a model-supplied `clockId` slotted
in, and the model supplied `id 2`. It appears three times in 57 lines.

**The scene numbers admit what is missing.** The headings are SCENE 0, SCENE 3,
SCENE 5 (1, 31, 44): the slug carries the requested beat index, so the four
rejected beats leave visible gaps. A reader sees the holes without being told.

**What the doctor said:** health 71.9, verdict **CONSIDER** — the middle tier,
which is right for pages this thin — plus its own disclosure, which the bench
now keeps: *"This reads like an excerpt (5 scenes analyzed)… read as feedback
on the pages, not coverage of a feature."* Its top findings are `NO_REVERSALS`,
three `BELIEF_ISOLATION`, `CLOCK_WITHOUT_CONFRONTATION` and
`NO_RELATIONSHIP_MOVEMENT`. Every one of those is true of this script, and
`CLOCK_WITHOUT_CONFRONTATION` is the clock called `id 2`.

### HARBOR LIGHTS (ensemble, 3 of 8 scenes committed) — 64 lines

`harbor-lights.final.fountain`. Health **53.3**, verdict **PASS**, sceneCount
3, 2 pages, 290 words.

**The queue from v1 is still a queue, and now it is a queue with a stranger in
it.** Lines 4–28 are the six seeded characters saying their seeded belief in
order, exactly as before — TOMAS (4), NELL (7), DRU (16), KAI (20), FATHER_ORR
(24), MAYOR_LOCK (27) — and this time the revision pass appended a paraphrase
of each belief as an action line beneath it (6, 14, 18, 22): *"He tucks the
letter away, hoping to buy himself time."* Saying the subtext twice is worse
than saying it once. Then at line 37 a character called `PROTAGONIST` speaks,
and at 58 and 60 a character called `Alex` states his purpose and then his
"actual purpose" — neither is in the premise, the cast, or the other twenty-six
lines.

**The only exchange in the script is nine words long.** At lines 7–10 NELL asks
*"What if waiting makes it worse?"* and TOMAS answers *"All is well"*. That is
the one moment in 64 lines where a character responds to another character. It
is also the moment the script is closest to working, which is the useful thing
to know.

**Raw identifiers again:** `"c3"` (30), `"c4"` (32), `"c5"` (56) as clue text,
and `tensionClock1` at line 64 inside the same deadline sentence. `event_1`
survives at line 48 — that is the one committed scene whose IR is a stub
(`committedNonStub` 2 of 3), so the template rendering of `stubIR`'s own
`ADD_FACT` is still printed as prose.

**Where the structure went:** 4 of the 8 beats were refused by
**IntentionalProof** — an op referencing a character with no belief in state —
which is the v2 failure mode and a direct consequence of the model inventing
`PROTAGONIST` and `Alex` instead of using the six cast members it was given.
One more beat lost its converge call to the route's 300 s budget.

**What the doctor said:** health 53.3, verdict **PASS** — the rejection verdict,
correctly — with `TOO_MANY_OPEN_CONFLICTS` first, then seven
`INTENTION_INVISIBLE`, one per character, then `QUESTION_DODGE` and
`CADENCE_MONOTONY`. `QUESTION_DODGE` is lines 8–10: NELL's question, TOMAS's
non-answer. The deterministic engine found the one exchange in the script and
named what is wrong with it.

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

**What it DOES say about a fragment, and the bench used to throw away.**
`excerptNote` (`server/nvm/analyze/doctor.ts:900-910`, wired at
`doctor.ts:2308`) fires below the RECOMMEND floor of 8 scenes and reads, on
every script in this run: *"This reads like an excerpt (1 scene analyzed):
scores and verdicts are computed the same way as for a full script, but with
this little material they should be read as feedback on the pages, not coverage
of a feature."* The doctor is not silent about thinness; the first version of
this bench's readout writer dropped the field, and then the readings reported
its absence as a finding. It is kept now, with `pageEstimate`. And `verdictFor`
(`doctor.ts:860`) returns **PASS for `health < 60`** — the rejection verdict, a
reader passing ON the script — so on these fragments the doctor's verdict is
correct, not credulous.

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

## 6b. The reading packet

`npm run story:bench -- --packet` assembles the six scripts of the newest run
into one Fountain file and one PDF, through `src/lib/pdf.ts`'s
`fountainToPdf()` — the paginator the product ships, since there is no
`POST /api/export/pdf`. **The packet the owner should read is the v2 one**,
`data/story-bench/2026-09-13-run2/packet.fountain` (15,702 chars) and
`packet.pdf` (32,871 bytes). The v1 packet was 6,152 chars and 13,273 bytes,
and v1 is the run in which no committed scene carried a model-authored op, so
it is a packet of the stub generator's output and is not worth a reader's
time.

Its front matter carries the five questions the owner scores each script on,
1–5, and a blank grid:

1. Would I keep reading after page 2?
2. Do I know what the protagonist wants?
3. Did a scene surprise me?
4. Does the dialogue sound like people?
5. Would I be entertained if a friend made this?

It also says, in the packet itself rather than only here, that the health
number beside each script measures structure and cannot see whether a story is
interesting; and that six scored scripts is the SEED of Decision #3's ~30-case
golden set — six cases of about thirty, one scorer of at least two — which
satisfies none of that decision's condition and promotes nothing out of Labs.

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
