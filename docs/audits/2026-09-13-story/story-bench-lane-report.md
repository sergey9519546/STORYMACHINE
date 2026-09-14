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

*Round 2: that table was recorded at `4c2a8a92`, when the file held 15 cases.
The committed file now runs **22** — `5a9dfc2b` added the `finish_reason`
mapping and the unknown-word pass-through, and round 2 added the three
provider-policy cases and two more permanent-status cases. Re-recorded against
the file as shipped:*

| un-fix applied | result |
|---|---|
| `finish_reason: 'length'` left unmapped, so `evaluateRewrite` cannot see truncation | **pass 16 / fail 1** (the reviewer independently reproduced this one) |
| `IR_SCHEMA` back to the one-property op | **pass 6 / fail 3** of `tests/core/llm-generator-schema.test.ts` |
| the translator drops `anyOf` again | **pass 6 / fail 3** of the same file |
| nothing un-fixed (restored) | **22 / 0** guards, **9 / 0** schema, **30 / 0** bench helpers |

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
| full suite | `npm test` | **0** — 14,047 tests, **13,955 pass / 0 fail**, 91 skipped, 1 todo, ~341 s. Run on the rebased tree, and run AGAIN after the three docs-only commits that followed it: identical counts both times |

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

Verified rather than asserted: with `.env` reduced to `AI_PROVIDER=gemini` and
no key, `node scripts/story-bench.mjs` printed those two sentences and exited
**2**, and `grep -rn "story-bench" .github/` returns nothing.

---

## Round 2 — response to `docs/audits/2026-09-13-story/story-bench-review.md`

Reviewed object `9a7dc522`, verdict REVISE, eight items plus the seam fix and
the re-run. The review's central finding was right and is the reason this round
exists: the first run's table hid its own root cause, and the paragraph a
reader would have quoted pointed the next lane at the wrong component.

| # | review item | disposition |
|---|---|---|
| 1 | correct the ContinuityProof attribution | **done.** §4 of this report and of the method doc now state that 74/74 returned candidates were stubbed, that no model-authored op reached any committed scene, and that the colliding `(scene, contains, event_N)` facts are `stubIR`'s. Both carry the two-schema measurement and point at `IR_SCHEMA` / `geminiSchemaToJsonSchema`. §7.4's "most useful next thing to look at" is replaced by what was found and fixed. |
| 2 | fix the PASS reading | **done.** `verdictFor` (`doctor.ts:860`) returns PASS for `health < 60` — the rejection verdict. All three sentences corrected in both docs; the `.doctor.json` writer now records `verdictMeaning` beside the verdict so the file cannot be misread either. |
| 3 | keep `excerptNote` and `pageEstimate` | **done.** Both are in the readout writer (`story-bench.mjs`), the claim that the doctor never mentions the thinness is deleted, and §6 of the method doc now quotes `excerptNote` as the thing the doctor DOES say. Visible in the v2 readings. |
| 4 | add the column that decides what the run measured | **done.** `model scenes` — committed scenes whose IR is not a stub — is in `renderTable` and in both tables. v1 reads **0/1 in all six rows**; v2 reads 14/16 overall. "The generative half is alive" is narrowed to the revision step. |
| 5 | widen `classifyRun` structurally | **done.** FAILED / FRAGMENT / DEGRADED / ok, with the two original clauses FIRST so claims row 117 stays literally true, pinned both ways (10 new assertions, including one that a perfect scene record cannot talk the original clause out of firing). Re-run over the v1 artifacts, **all six rows move from `ok` to `FAILED`**. |
| 6 | resolve the FreeRide priority | **done.** `getGenerativeProvider()` honours an explicit configuration always and refuses an AUTO-SELECTED FreeRide, which is what `ai-config.ts`'s `llmReady()` policy requires for these surfaces. Three tests: Gemini-keyed unchanged, openai-compat used when configured, FreeRide never called. The docstring is corrected — the seam was never "Gemini otherwise". |
| 7 | make the run directory non-destructive | **done, twice.** Per-run directories (`<date>`, `<date>-runN`, `--out`), and then the half the reviewer actually asked for: each premise writes `<id>.row.json` and the table is **derived** from every row file present. Re-running three premises into an existing run is additive — which is how the corrected v2 table exists without a second two-hour run. |
| 8 | the four LOW items | **done.** `event_0`: twice in HARBOR LIGHTS, three across the run. §3's un-fix table re-recorded against the file as shipped (22 cases, not 15), with the `length → MAX_TOKENS` row and the two schema un-fixes. HTTP 400 is named as a rejected REQUEST rather than an unavailable model, and 400 and 403 are now tested. The `intention` and `rhythm` passes are named where the report said "some pass". |
| 9 | fix the schema seam, shown failing first | **done.** All 14 StoryOp kinds declared as an `anyOf` mirroring `parseOp`; `geminiSchemaToJsonSchema` taught `anyOf`/`oneOf`, `additionalProperties` and explicit type arrays, all three of which it was dropping. Shown failing first two ways (§3), plus one live call through the real adapter with the real schema: **5 ops returned, 5 accepted by `parseOp`, 8.6 s.** No prompt, craft directive, pass order or budget touched. |
| 10 | re-run the six premises, second table beside the first | **done.** §4b. `llm_generator_partial_parse` 74 → 4; committed scenes 6/45 → 16/45; model-authored ops committed 0 → 74. Two fresh readings in §5b, warranted because the output changed shape: the revision pipeline now writes whole scenes with real exchanges, and it writes them about a story nobody asked for. |

**What round 2 also found, unprompted:** two defects in the instrument itself,
recorded in §4c — undici's 300 s `headersTimeout` silently killing the 14-pass
revision on three of six v2 rows, and the table-rebuild problem behind item 7.
Both are fixed and both are disclosed with the rows they cost.

**What the reviewer was right about that this round does NOT close:** the
"stronger version" note — that the bench writes 60 KB of structured log per run
and not one byte of what a model actually said. It still does not. One bounded
redacted sample per fallback class would have turned the schema diagnosis from
eleven seconds of the reviewer's time into zero of mine. It is the first thing
the next round should add, and §7 records it as undone rather than done.

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
4. **No raw completion is kept.** The bench writes ~60 KB of structured log
   per run and not one byte of what a model actually said, so its largest
   number — `llm_generator_partial_parse` — is undiagnosable from its own
   output. The reviewer diagnosed it in eleven seconds with one call the bench
   could have made itself. One bounded, redacted sample per fallback class
   (first 2 KB; the run directory is gitignored anyway) is the first thing the
   next round should add. Not done here, and named rather than implied.
5. **The v2 failure mode is measured, not explained.** IntentionalProof blocked
   17 of the 29 uncommitted v2 scenes because the model invents characters
   instead of using the cast. WHY it does — whether `buildSystemPreamble`'s
   known-characters line is reaching the prompt at all, and whether it is
   reaching it before the first commit lands — is the obvious next question,
   and answering it means changing a prompt, which this lane does not do.
6. **Diagnosed and fixed in round 2, not left as future work.** The first
   statement of this item said finding out why the proof kernel rejects LLM
   candidates was "the most useful next thing to look at" and filed it. The
   review found the answer in one call: the proof kernel was rejecting the
   bench's OWN STUBS, because `IR_SCHEMA` asked the decoder for ops with no
   payload. Fixed at the schema seam (`9d392911`), shown failing first, and
   re-measured in §4b. What remains genuinely open is whether the model's ops
   pass Tier 1 once they exist — which §4b now answers with numbers instead of
   a hypothesis.
7. **The browser suites were not run.** This lane changes no user-visible
   surface: no component, no route contract, no copy a writer reads. The
   surfaces the generative controls live behind are Labs-gated and untouched.
8. **`npm run story:bench` has no CI step, deliberately.** It generates, so it
   needs a key; CI has none. The pure helpers ARE covered in CI by
   `tests/scripts/story-bench.test.ts`, and the bench itself exits 2 with
   "Nothing was measured. This is not a result." when no provider is
   configured.

---

`Tip:` `d5d58f56` is the commit that added this report; the branch tip is one
commit later (`36e764bf`, which only writes this SHA in). Both are on
`lane/story-bench`, pushed, rebased onto `origin/main`
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
