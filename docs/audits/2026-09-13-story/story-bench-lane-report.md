# Lane report — `lane/story-bench` (2026-09-13)

**Worktree:** `/home/user/wt-story` (a `git worktree` of the repository, node_modules symlinked, `.env` copied — the copy is gitignored and its key appears in no committed file, no log line and no artifact).
**Branch:** `lane/story-bench`, from `main @ 7663df1f`. Pushed after every commit.
**Brief:** build the first instrument for the owner's 2026-09-13 direction — "let's mainly work on the storymachine ability to actually generate good and quality stories that people will value and be entertained by" — by MEASURING the existing pipeline, not tuning it.

```
git log --oneline origin/main..HEAD      # rebased onto origin/main 91c369c5
```

    7a8b92c6 feat(bench): the first six-premise run, the packet, and the CLI-order bug it found
    365cfa42 fix(bench): the two Tier 1 proofs that were silently eating every scene
    5a9dfc2b fix(ai): map finish_reason "length" to MAX_TOKENS, and commit the best-of-run IR
    d552d270 fix(bench): the converge route's 180 s budget is not a bench budget
    1453ba4f docs(bench): the method doc, and two claims-register rows for its two absolutes
    3687ac65 feat(bench): npm run story:bench — the story-generation measurement instrument
    1a5af829 feat(ai): harden the openai-compat adapter and point generation at the active seam

The pre-rebase objects were `9ad66f76 5713e6fc b70cfc10 7c9676ce 3a829cd8
e389422d 4c2a8a92`; each was pushed to `origin/lane/story-bench` as it was
made, per LANE_STANDARD §7.1. The rebase resolved two conflicts, both against
work `main` landed while this lane ran: `docs/brain/GRAPH.md` (regenerated with
`npm run brain`) and `docs/CLAIMS_REGISTER.md`, where `main` had taken row 116,
so this lane's two rows were renumbered to **117 and 118** and their line
anchors re-pointed.

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
| 6 | Docs, brain, ROADMAP, Decision, claims | **done.** `docs/story-generation/STORY_BENCH_2026-09-13.md`; brain notes `Generation - Story Bench`, `Decision 8 - …`, `Audit - 2026-09-13 Story Bench Lane`, linked from `00 Home`; ROADMAP P2 and P4 amendments that add the track WITHOUT touching the Labs gate or Decision #3's condition; `DECISION_LOG.md` Decision #8; claims rows 117–118. `npm run brain` + `check-brain` fresh; brain-coverage green. |

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

**ContinuityProof rejected 33 of the 39 scenes that were not committed.** It is
a Tier 1 proof, so it blocks: after `applyStoryOps`, no two facts may share a
`(subject, predicate)` with overlapping validity and different objects
(`server/nvm/proof/tier1/continuity.ts`). From scene two onward the candidate
generator re-asserts pairs the committed scenes already fixed, with different
values, and the commit is refused. The generator is never told the existing
`(subject, predicate)` pairs in a form it respects — `buildSystemPreamble`
reports a FACT COUNT, not the facts — so this is not a flaky rejection; it is
the shape of the loop.

**Every premise also had zero Tier-1-passing candidates** (`noWinner` equals
the ContinuityProof count in every row): the bench committed the best-of-run IR
in each case, which the commit route then re-proved and refused. The reason
sits in the `fallbacks` column: **86 fallbacks against 83 LLM calls** — 74
`llm_generator_partial_parse`, 11 `llm_generator_failed` and 1
`revision_rewrite_failed`. The 74 are the important ones: the model answered,
but its ops failed `parseOp` in `server/nvm/generate/llm-generator.ts` and the
candidate degraded to a structural stub. A stub scores composite 0, which is what every
`composite=0` note in the run records.

**The generative half is now demonstrably alive, which it was not at the start
of this lane.** 83 calls reached the provider, none returned an empty
completion, 487,073 tokens were spent, and 9 of 84 revision passes changed the
text. Before the call-site fix in `4c2a8a92`, that column would have read 0/14
on all six rows and the table would have been six FAILED runs.

**The health column is not a result to read as quality.** Five of six scripts
score health 0 and every one of the six returns verdict **PASS** — on a
one-scene, sub-150-word fragment. The doctor was handed a document far outside
anything it was calibrated on; §6 is about what it can and cannot see, and this
row of six PASSes is the clearest demonstration in the report that a verdict is
not an endorsement.

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

**`event_0` is printed in the finished screenplay, three times** — lines 25 and
29 carry the raw internal op identifier in the prose the writer would read
(`"the scene holds event_0"`, `"As event_0 lingers"`). It came from the stub
generator's `object: 'event_0'` and survived fourteen revision passes.

**Line 27 is not a sentence.** "Silence thick here."

**And the title page is gone.** The compiled draft opens with `Title: HARBOR
LIGHTS` / `Credit: Written by STORYMACHINE`
(`harbor-lights.compiled.fountain:1-2`); the final draft starts at the scene
heading. Some pass dropped the title page and no pass noticed.

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

## 6. Gates

All run on the final rebased tree (`lane/story-bench` on `origin/main`
`91c369c5`), in the foreground, exit codes as reported by the shell.

| gate | command | exit |
|---|---|---|
| files touched — adapter guards | `node --experimental-strip-types tests/core/openai-compat-generation-guards.test.ts` | **0** (17 pass, 0 fail) |
| files touched — bench helpers | `node --experimental-strip-types tests/scripts/story-bench.test.ts` | **0** (19 pass, 0 fail) |
| files touched — core boundary | `node --experimental-strip-types tests/core/pure-core-boundary.test.ts` | **0** |
| files touched — brain coverage | `node --experimental-strip-types tests/core/brain-coverage.test.ts` | **0** (7 pass) |
| files touched — claims rows | `node --experimental-strip-types tests/core/claims-row-citations.test.ts` | **0** (5 pass) |
| files touched — claims lane | `node --experimental-strip-types tests/core/honesty-audit-claims.test.ts` | **0** (15 pass) |
| lint | `npm run lint` | **0** |
| console grep | `npm run check-no-console` | **0** (307 files, 24 quarantine entries) |
| server reachability | `npm run check-server-reachability` | **0** |
| build | `npm run build` | **0** |
| docs quality | `npm run check-docs` | **0** |
| honesty audit | `npm run honesty-audit` | **0** (465 files, 518 markdown, 118 claims rows) |
| scoring receipt | `node scripts/check-scoring-receipt.mjs main..HEAD` | **0** — *"no scoring-path files changed"* |
| unverified-gate report | `npm run gates` | **0** |
| brain graph | `npm run brain` then `npm run check-brain` | **0** — 118 notes, 468 links, fresh |
| full suite | `npm test` | **0** — 14,047 tests, **13,955 pass / 0 fail**, 91 skipped, 1 todo, 341 s, once on the final rebased tree |

**`check-scoring-receipt` agrees that generation is not the scoring path**, as
the brief asked me to confirm: the range reports *no scoring-path files
changed*. That is the correct answer and not a loophole — the four files this
lane touches under `server/` are the provider adapter, the engine seam, and the
two generative call sites, and `server/nvm/revision/rewrite-llm.ts` was
deliberately split out of `doctor.ts`'s import graph on 2026-09-03 for exactly
this reason. `tests/core/pure-core-boundary.test.ts` passes, so that split still
holds after this lane.

**The browser suites were not run** — this lane changes no user-visible
surface. Stated again in §7 rather than left to be noticed.

**The bench itself skips cleanly in CI.** `npm run story:bench` is not part of
`npm test` (`scripts/run-tests.mjs` sweeps `tests/**`, and the bench is a
`scripts/` entry point with its own npm script), it is named in no workflow,
and with no provider configured it prints *"Nothing was measured. This is not a
result."* and exits 2. What DOES run in CI is
`tests/scripts/story-bench.test.ts`, which imports the module for its pure
helpers and never boots a server or makes a call.

---

## 7. Left undone, and why

**Not done, and named rather than quietly dropped:**

1. **No held-out or repeated measurement.** Six premises, one run each, one
   seed family (`20260913 + sceneIdx`). Generation is stochastic and the
   endpoint's latency alone varied 5x on one prompt; a single run per premise
   establishes a shape, not a distribution. A second lane wanting to claim a
   change helped will need repeats.
2. **No LLM-reader column.** The brief allowed an optional one. It is not
   built, because on this run there was no question it would have answered
   that the two human readings do not, and an unpinned research signal is a
   liability the moment someone quotes it. If it is added, §6 of the method
   doc states the conditions in advance: labelled *research signal, not a
   verdict*, pinned model and prompt, feeding no user-visible number.
3. **The packet has one scorer, and it is not a scorer.** `--packet` produces
   the artifact; the scores are the owner's to give. Decision #3's condition
   needs about thirty cases and at least two scorers, and this lane
   deliberately does not pretend otherwise anywhere.
4. **Why convergence fails Tier 1 was not diagnosed.** The bench records it
   per scene (§4) and commits the best-of-run IR instead, which is what the
   route offers. Finding out WHY the proof kernel rejects LLM candidates is an
   engine question, and this lane's whole premise is that it measures first.
   It is the most useful next thing to look at.
5. **The browser suites were not run.** This lane changes no user-visible
   surface: no component, no route contract, no copy a writer reads. The
   surfaces the generative controls live behind are Labs-gated and untouched.
6. **`npm run story:bench` has no CI step, deliberately.** It generates, so it
   needs a key; CI has none. The pure helpers ARE covered in CI by
   `tests/scripts/story-bench.test.ts`, and the bench itself exits 2 with
   "Nothing was measured. This is not a result." when no provider is
   configured.

---

`Tip:` `7a8b92c6` on `lane/story-bench` (pushed), rebased onto `origin/main`
`91c369c5`. `npm test` 13,955 pass / 0 fail on that exact tree. The run's six
scripts, six doctor readouts, six call logs, `packet.fountain` and `packet.pdf`
are in `data/story-bench/2026-09-13/`, which is gitignored — they are on this
machine only, and only numbers were copied into this report.

**What the reviewer should attack first:** the `scenes` column. Every premise
committed exactly one scene of the seven or eight it asked for, so every number
to the right of it — words, health, verdict, the readings — describes a
fragment, not a screenplay, and the honest question is whether an instrument
that produces six one-scene fragments has measured generation at all or has
only measured `ContinuityProof`. Second: `classifyRun` called all six runs
`ok`, because its rule is "did any revision pass change the text" and 1–2 of 14
did. A rule that lets a 1-of-8-scene run report `ok` is arguably too generous,
and it is the honesty rule this lane registered as claim 117.
