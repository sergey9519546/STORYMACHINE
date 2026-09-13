# Independent review — `lane/story-bench` @ `9a7dc522` (round 1)

**Reviewed object:** `lane/story-bench` @ **`9a7dc522`**, rebased on `main`
`91c369c5`. Worktree `/home/user/wt-story`. Diff read:
`git diff 91c369c5..9a7dc522` (20 files, +3,628 / -20).
**Lane's own record:** `docs/audits/2026-09-13-story/story-bench-lane-report.md`;
method doc `docs/story-generation/STORY_BENCH_2026-09-13.md`.
**Reviewer:** did not build this lane. Procedure: `docs/LANE_STANDARD.md` §6.
**Verdict: REVISE** (list at the end). Nothing here disputes that the lane found
real bugs and fixed them properly; the revisions are about what the run's
numbers mean and what the next lane will be pointed at.

---

## 1. The brief, item by item

| # | brief item | disposition |
|---|---|---|
| 1 | adapter hardening — `content:null`, 404 function-not-found, `max_tokens`, `/models` probe | **done, and honestly widened.** All four land in `server/lib/ai-providers/openai-compat.ts`, plus the `@google/genai` response shape and the `finish_reason` map, plus the two call-site fixes. Each is covered by a test that goes red when the fix is removed (§2). One statement is stale: the report's §3 un-fix table totals 15 cases, the committed file runs 17, and the `length → MAX_TOKENS` mapping added in `5a9dfc2b` is not a row in it (finding 8). |
| 2 | `npm run story:bench` driving the existing pipeline, recording every call, labelling an all-fallback run FAILED | **done.** `scripts/story-bench.mjs`, real routes against a booted server, per-call structured records folded out of the server's own log stream. `classifyRun` is pinned in both directions. The label it gives THIS run is the problem, not its existence (finding 4). |
| 3 | six premises, numbers table committed, two scripts read honestly | **done, with two corrections.** Table and per-scene accounting are reproducible from the gitignored artifacts and internally consistent (33 + 6 = 39 uncommitted; 45 beats; 487,073 tokens all check out). The readings are evidenced to path:line and are accurate line-for-line, with one wrong count (finding 7) and one conclusion drawn from a field the bench itself threw away (finding 2). |
| 4 | owner reading packet, Fountain + PDF, five-question rubric | **done.** `--packet`, front matter carries the five questions, a blank grid, and the sentence that six scripts satisfy none of Decision #3's condition. Route substitution (`src/lib/pdf.ts` instead of a non-existent `POST /api/export/pdf`) is correct and disclosed; I confirmed `server/routes/export.ts` offers no `pdf` format. |
| 5 | honesty boundaries — no LLM-as-judge, doctor health reported with what it cannot see | **done on the LLM-judge boundary** (no reader column exists; the conditions for one are pre-registered). **Narrowed on "what it cannot see":** §6 lists what the doctor cannot see and omits the one thing it DOES say about these scripts — `excerptNote` — while two readings assert the opposite (finding 2). |
| 6 | docs, brain, ROADMAP amendment, Decision entry, claims rows, clean CI skip | **done.** ROADMAP P2/P4 amendments add the track and explicitly leave Decision #3's gate and its re-promotion condition standing; Decision #8 repeats that; claims rows are 117–118, after main's max of 116; `check-brain` 118 notes / 468 links fresh; `honesty-audit` 465 files + 518 markdown + 118 claims rows clean; brain-coverage 7/7; the bench appears nowhere in `.github/`; keyless exit is 2. All re-run by me (§2). |

---

## 2. Reproduced, on this machine, on this tree

Per LANE_STANDARD §6.2 a reviewer reproduces numbers and drives the change
rather than re-running the battery. Eight things were reproduced, including one
row of the table driven end to end; two further measurements below are new ones
the lane did not make.

| what | command / method | result |
|---|---|---|
| `/models` reachability (method doc §3) | `npm run story:bench -- --check` | **82 model ids**, both configured models `SERVED`, exit **0**, no key printed. Matches §3's "HTTP 200, 82 model ids". |
| the un-fix goes red (LANE_STANDARD §3) | replaced `case 'length': return 'MAX_TOKENS'` with a pass-through, re-ran the guard file, restored | **17 tests → 16 pass / 1 fail**, and the failure is `maps finish_reason "length" to MAX_TOKENS, so a truncated rewrite is rejected`. Restored tree is byte-clean (`git diff --stat` empty), 17/17 green. |
| the two touched test files | `node --experimental-strip-types tests/core/openai-compat-generation-guards.test.ts` / `tests/scripts/story-bench.test.ts` | **17 pass / 0 fail**, **19 pass / 0 fail** |
| the doctor row for COUNTERWEIGHT | ran `runScriptDoctor` directly on `counterweight.final.fountain` | health **0**, verdict **PASS**, sceneCount **1**, `contentHash` **f18aa73f…** — identical to the bench's committed readout, including the hash |
| the one non-zero health | same script twice: `the-long-way-round.final.fountain` as generated, then with the invented `INT. SCENE 1 - MOMENTS LATER` line deleted | **health 30 → health 0**, sceneCount 2 → 1. **The lane's sharpest claim is correct**: a rewriter typing a slugline moved the score, and nothing else did. |
| run totals | folded the six `*.calls.json` logs | 83 `openai_compat_call` lines; 141,212 prompt + 345,861 completion = **487,073 tokens**; 74 `llm_generator_partial_parse`; 33 ContinuityProof blocks over 39 uncommitted scenes |
| keyless exit | `.env` moved aside, `node scripts/story-bench.mjs` with the AI vars unset | prints *"Nothing was measured. This is not a result."*, exits **2**; `.env` restored, mode `600` intact |
| gates I re-ran | `npm run check-brain`, `npm run honesty-audit`, brain-coverage, claims-lane tests | **0 / 0 / 7 pass / 15 pass** — the lane's numbers |
| **one row of the table, driven end to end** | `npm run story:bench -- --only the-understudy-clause` (15.5 min, one premise, live endpoint) | **`1/7 · 130 words · health 0 · PASS · 16 calls · 15 fallbacks · 1/14 passes · 931.0 s · 91,852 tokens · ok`**, against the lane's `1/7 · 85 · 0 · PASS · 15 · 15 · 2/14 · 779.0 · 83,118 · ok`. Identical on every structural field, stochastic on words, latency and tokens. Beat 1 committed "7 ops from winner", beats 2–7 were all refused by ContinuityProof, and **14 of 14 partial-parse lines again had `stubbed === returned`** — the 74/74 below is the loop's behaviour, not that run's luck. |

**Two measurements the lane did not make, both cheap, both decisive.**

1. **74 of 74.** Every `llm_generator_partial_parse` line in the entire run has
   `stubbed === returned` — *not one* model-authored candidate survived
   `parseOp`, in any scene, of any premise. Together with 11
   `llm_generator_failed`, **zero model-authored ops reached a committed
   scene in the whole 114.7-minute run.**
2. **One live call, 11.9 s, explains it.** I sent the converge loop's own
   `IR_SCHEMA` through this same adapter to the same endpoint and printed the
   raw completion. The endpoint's `json_schema` enforcement constrains each op
   object to the only property the schema declares — `op`:

   ```
   "ops": [ { "op": "ADD_FACT" }, { "op": "RAISE_CLOCK" },
            { "op": "ADD_FACT" }, { "op": "RAISE_CLOCK" } ]
   ```

   `IR_SCHEMA` (`server/nvm/generate/llm-generator.ts:155-194`) declares
   `ops.items` as `{ type:'object', properties:{ op:{type:'string'} },
   required:['op'] }` and nothing else, so a constrained decoder cannot emit
   `fact`, `charId`, `delta`, `clockId` — and `parseOp`
   (`llm-generator.ts:37-122`) returns `null` for every one of them, `parseIR`
   returns `stubIR`, and the warn line fires. **This is a schema defect, not a
   model failure and not a continuity failure.** It costs one call to see, and
   the bench spent 83.

---

## 3. Findings

### MAJOR 1 — the root cause in §4 is mis-attributed, and it points the next lane at the wrong component

Both the lane report and the method doc explain the 33 ContinuityProof
refusals like this: *"From scene two onward the candidate generator re-asserts
pairs the committed scenes already fixed, with different values… The generator
is never told the existing `(subject, predicate)` pairs in a form it respects —
`buildSystemPreamble` reports a FACT COUNT, not the facts — so this is not a
flaky rejection; it is the shape of the loop."*

The mechanism is right; the actor is not. The IR that collided was never the
model's. `stubIR` (`server/nvm/generate/llm-generator.ts:13-33`) hard-codes
`ADD_FACT { subject:'scene', predicate:'contains', object:'event_' + idx,
validFrom: sceneIdx, validTo: null }`. ContinuityProof
(`server/nvm/proof/tier1/continuity.ts:19-39`) blocks two facts that share
`(subject, predicate)` over overlapping validity with different objects — which
is precisely what two stubs of different candidate index, committed in
different scenes, always are. Since **74/74 candidates were stubs**, every
commit after scene one was a stub colliding with scene one's stub. Telling the
generator the existing fact pairs — §4's implied fix, and §7.4's "most useful
next thing to look at" — would change nothing at all while the schema keeps
returning payload-less ops.

The report already contains the true chain (the `composite=0` notes, the
`fallbacks` column, "the candidate degraded to a structural stub"); it just
does not follow it to the end, and the paragraph a reader will quote is the one
that blames prompt context. Fix the attribution, and re-point §7.4 at
`IR_SCHEMA` / `geminiSchemaToJsonSchema` with the raw-completion evidence
above. This is worth the revision round on its own: the whole value of a
measure-first lane is where it aims the tune-first lane that follows.

### MAJOR 2 — `PASS` is the rejection verdict, and the doctor DID disclose the thinness

`verdictFor` (`server/nvm/analyze/doctor.ts:860-864`) is three lines:
`health >= 85 && sceneCount >= 8 → RECOMMEND`; `health < 60 → PASS`; else
`CONSIDER`. In coverage vocabulary PASS is a reader passing ON the script — the
harshest of the three. Health 0 on a 60-word fragment therefore produces
exactly the right verdict, by the shortest path in the file.

The report reads it the other way round, three times: *"every one of the six
returns verdict PASS — on a one-scene, sub-150-word fragment"*, *"this row of
six PASSes is the clearest demonstration in the report that a verdict is not an
endorsement"*, *"A verdict of PASS on a 142-word fragment is the number this
lane most wants a reader to distrust."* A reader who has not opened
`verdictFor` will take away that the tool blessed six fragments. It rejected
them.

It is worse than a wording slip, because the same paragraph asserts the doctor
said nothing about the thinness: *"Nothing in the report mentions that the
screenplay is seventeen lines long, ends on `event_0`, or contains a single
scene."* The doctor's report carries `excerptNote`
(`doctor.ts:900-910`, wired at `doctor.ts:2308`), and on this exact script it
reads: *"This reads like an excerpt (1 scene analyzed): scores and verdicts are
computed the same way as for a full script, but with this little material they
should be read as feedback on the pages, not coverage of a feature."* I
reproduced it in §2. The bench never saw it because its readout writer
(`scripts/story-bench.mjs:583-589`) keeps only `health`, `verdict`,
`sceneCount`, `contentHash` and ten findings, and drops `excerptNote` and
`pageEstimate`. So an instrument built to report what the doctor can and cannot
see discarded the doctor's own disclosure, and then reported its absence as a
finding. Keep the field, correct the three sentences, and add `excerptNote` to
§6 as the one thing the doctor DOES say about a fragment.

### MAJOR 3 — "the generative half is now demonstrably alive" is true of one step, and the table cannot show which

The sentence is carried by 83 calls, 0 empty completions and 487,073 tokens.
Those three numbers are real, and they prove the *transport* is alive. They do
not prove the generative half is: of the 83 calls, the candidate-generation
ones contributed **zero ops to zero committed scenes**, and the only
model-authored text anywhere in the run is whatever 9 of 84 revision passes
changed. The table has a `fallbacks` column and a `passes changed` column but
no column for the number that decides what the run measured — model-authored
ops committed, or committed scenes whose IR was not a stub. Add it (it is one
field, `ir.provenance.model !== 'stub'`, already on every IR), and the six rows
say what they are without a paragraph of prose.

### MEDIUM 4 — `classifyRun` is honest about what it claims and silent about what matters

The rule is defensible as written and claim 117 states it exactly: no LLM call,
or every revision pass fell back, is FAILED. It is pinned both ways in
`tests/scripts/story-bench.test.ts:180-204`. But `status: ok` on a run that
committed 1 of 8 scenes and shipped a 142-word fragment is the label a reader
sees first, and the lane's own report calls it "arguably too generous". It is.
A rule that stays purely structural — no prose judgement, so NORTH_STAR §1 is
untouched:

```
FAILED    — no LLM call reached the provider
          | every revision pass fell back
          | no committed scene's IR came from the model (every candidate stubbed)
FRAGMENT  — committed scenes < 50% of requested, or < 3 scenes
DEGRADED  — committed >= 50% but any scene lost to a proof or the budget
ok        — every requested scene committed and at least one pass changed text
```

On this run that prints `FAILED (no model-authored ops)` six times, which is
what happened. Keep `classifyRun`'s current two clauses as the first two lines
so claim 117 stays literally true, and register the new clauses beside it.

### MEDIUM 5 — the seam is not "Gemini otherwise", and the Gemini-keyed direction is untested

`getLLMProvider()`'s docstring (`server/engine/ai.ts:247-259`) says the seam
holds "openai-compat when AI_PROVIDER says so, Gemini otherwise". That is not
what `resetLLMProvider()` does. It defers to `aiProviderManager`, whose
`autoSelectProvider()` (`server/engine/ai-provider.ts:489-503`) has the
priority order **`freeride` > `gemini`**. So on a deployment that sets
`OPENROUTER_API_KEY` — with or without a Gemini key — the two call sites this
lane re-pointed now resolve to `FreeRideProvider`, which asks OpenRouter for
`modelForTask('REVISION')` (a Gemini model id it does not serve), fails, and
fails over to `google/gemma-2-9b-it:free`. Before this lane both call sites
always used Gemini. `server/lib/ai-config.ts:170-180` deliberately refuses to
count `OPENROUTER_API_KEY` as `llmReady` for these surfaces — *"the legacy
FreeRide bridge is not yet response-compatible with the ScriptIDE routes… would
send a writer's draft to a provider and return an empty or invalid result"* —
and this change routes the 14-pass revision there anyway.

Severity is bounded: the response shape FreeRide returns IS Gemini-shaped
(`ai-provider.ts:288-304`), and a plain `GEMINI_API_KEY`-only deployment is
unaffected — `GeminiProvider.generate` and the `geminiProvider` constant are
the same call. So this is not a broken path; it is an untested, undocumented
change of model for the only prose step, on a configuration the repo elsewhere
says must not serve it. Either exclude `freeride` at these two sites, or state
the new behaviour in the docstring and pin it with a test in the Gemini
direction — there is currently none (`getLLMProvider returns whatever
ai-config last wired` tests only the openai-compat direction).

### MEDIUM 6 — a second run in the same day silently destroys the first run's record

`runBench` writes `table.md` and `summary.json` into `data/story-bench/<date>/`
unconditionally, and with `--only <id>` the `rows` it writes contain that one
premise. `runPacket` then reads `summary.json` from the newest dated directory.
So `npm run story:bench -- --only cold-open` on 2026-09-13, after the six-row
run, replaces the six-row table and summary with a one-row one, overwrites that
premise's four artifacts, and turns `--packet` into a one-script packet — with
no warning and no backup. **This is not a hypothetical: reproducing one row
(§2) overwrote `table.md` and `summary.json` with a single-premise table and
replaced four of that premise's artifacts.** The run this whole report is
written from lives in exactly that directory; I had copied it aside first and
restored all 29 files afterwards (verified: six rows back in `summary.json`,
`table.md` byte-identical), which is not a step the next reader will know to
take. Write to
`<date>/` + a run ordinal or a `--out` suffix, or refuse to overwrite an
existing `summary.json` without `--force`.

### LOW 7 — `event_0` appears twice in HARBOR LIGHTS, not three times

Both documents bold *"`event_0` is printed in the finished screenplay, three
times"* and then cite two lines (25 and 29). I counted every final draft:
harbor-lights 2, counterweight 1, the other four 0 — **three across the run,
two in that screenplay**. In a report whose subject is honest counting, fix the
sentence (the across-the-run number is the better one anyway).

### LOW 8 — §3's failing-first table is stale relative to the committed test file

The un-fix table's rows sum to 15 cases; the committed file runs 17
(`# tests 17`), and the two added in `5a9dfc2b` — the `length → MAX_TOKENS`
mapping and the unknown-word pass-through — have no row. The mapping is in fact
self-evidencing (the test asserts `evaluateRewrite(cut, …, 'length').accept ===
true` inline, i.e. it demonstrates the bug it closes) and I confirmed it goes
red when un-fixed, so the *evidence* exists; the table just does not describe
the file as shipped. Re-record it, or say which commit it was taken at.

### LOW 9 — HTTP 400 is in the permanent set, untested, and mis-described to the caller

`isPermanentModelFailure` includes `400`, which no test covers (404/410/401 are
covered; 403 and 400 are not) and which the adapter's own comment block does
not mention while explaining 404/410/401/403. A 400 is the one status in that
set that is usually about the *request* — a malformed body, an over-long
context — yet it is reported as `OpenAI-compat model "X" is not available from
this endpoint`, which will send someone looking at their model id. Non-retrying
a 400 is right; name it correctly and test it.

### LOW 10 — the pass that invented the slugline is named in the data and not in the prose

`the-long-way-round.calls.json` records exactly one pass that changed text —
`intention`. That is the pass that typed `INT. SCENE 1 - MOMENTS LATER` and
moved health 0 → 30. The report says "a revision pass" and "some pass" (also
for the dropped HARBOR LIGHTS title page, where `perPass` records `intention`
and `rhythm`). The bench already collects this; spending the one sentence makes
the finding actionable instead of anecdotal.

### Not findings, checked and clear

- **Key hygiene.** A grep for the provider key's literal prefix over the whole worktree, excluding `.env`,
  is empty; `git grep` over the reviewed tree is empty; `.env` is matched by
  `.gitignore:15`, `data/` by `.gitignore:41`; `git status` is clean; the
  `--check` output, the relay, the call logs and `server.log` carry no
  Authorization header. The probe test asserts the key never reaches the probe
  result.
- **Scoring path.** `check-scoring-receipt main..HEAD` reporting "no
  scoring-path files changed" is the correct answer, not a loophole: the four
  `server/` files are the adapter, the seam, and the two generative call sites,
  and `tests/core/pure-core-boundary.test.ts` still passes.
- **The readings' line references.** Every line number I checked in both
  readings is right, including the six character cues at 4/8/11/14/17/20, the
  verbatim belief at line 21, the non-sentence at line 27, the invented action
  at counterweight:13 and the template constant at counterweight:15. One
  addition rather than a correction: the only physical action in HARBOR LIGHTS
  (line 6, Tomas hiding the letter) is typed INSIDE Tomas's dialogue block, not
  as an action element — so the script does not contain a single action line
  before line 23.
- **Labs gate and Decision #3.** Neither amendment nor Decision #8 weakens the
  gate or its re-promotion condition; both restate it. Claims rows are numbered
  after main's max. The bench is absent from `.github/`.

---

## 4. What the bench actually measured

It measured the transport, the revision step, and the stub generator's
collision with itself — not generation. Across 114.7 minutes and 83 calls,
every candidate the model returned parsed as JSON and then lost every one of
its ops to `parseOp`, because the JSON schema the adapter sends declares one
property per op (`op`) and the endpoint's structured-output decoder honours it
literally; 74 of 74 partial-parse lines report every returned candidate
stubbed. So each converge call ended with `stubIR`, each commit after the first
asserted `scene.contains = event_N` against scene one's `event_M`, and
ContinuityProof — behaving exactly as specified — refused 33 of 39. What
reached the doctor was six one-scene fixed-template renderings with one
model-written pass or two applied on top. That makes this run a genuine and
valuable measurement of four things (the adapter now carries a real request and
answers with a legible response; the revision pipeline reaches a model and
changes text 9 times in 84; the compiler is a sentence table; the doctor scores
a fragment as a fragment and says so) and a measurement of the generative loop
in no sense at all. The lane's own headline — "an instrument that produces six
one-scene fragments has measured generation or only measured ContinuityProof" —
has a third answer, and it is the one the artifacts support: it measured
neither, and the reason is eleven lines of schema.

## 5. What a stronger version would have done

It would have kept one raw completion. The bench writes 60 KB of structured log
per run and not one byte of what a model actually said, so its single largest
number — 74 `llm_generator_partial_parse` — is undiagnosable from its own
output, and the lane had to file the diagnosis as future work (§7.4). One
bounded, redacted sample per fallback class (first 2 KB, the run directory is
gitignored anyway) would have turned eleven seconds of reading into the answer,
and the lane would have shipped the schema finding instead of a proof-kernel
hypothesis. Everything else follows from the same instinct: a `model ops
committed` column instead of a prose paragraph about aliveness; `excerptNote`
kept instead of the claim that the doctor stayed silent; a status vocabulary
that can say `fragment`. None of that is scope creep — it is the same six runs,
read one level deeper — and all of it is cheaper than the 114.7 minutes already
spent. What the lane did do, it did to the standard: every guard reproduced
live before it was written, every fix red before green (I verified one by
un-fixing it), the beats disclosed as fixture data in four places, the packet
telling its one scorer that it is one scorer, and six honest paragraphs about
scripts nobody would want to have written.

---

## VERDICT: REVISE

1. **Correct the ContinuityProof attribution (MAJOR 1).** State in §4 of both
   the report and the method doc that 74/74 returned candidates were stubbed,
   that no model-authored op reached any committed scene, and that the colliding
   `(scene, contains, event_N)` facts are `stubIR`'s, not the model's. Re-point
   §7.4 at `IR_SCHEMA`/`geminiSchemaToJsonSchema`; the raw completion in §2 of
   this review is quotable evidence.
2. **Fix the PASS reading (MAJOR 2).** Say that `verdictFor` returns PASS for
   `health < 60` — the rejection verdict — so the six PASSes are the doctor
   being right, not a verdict path to distrust. Remove or rewrite the three
   sentences that imply otherwise, in the report, the method doc and anywhere
   the brain notes repeat them.
3. **Keep `excerptNote` (and `pageEstimate`) in the readout (MAJOR 2).** Add
   them to the `.doctor.json` writer, delete the claim that the doctor never
   mentions the script is one scene, and add the note to §6 as the thing the
   doctor DOES say about a fragment.
4. **Add the column that decides what the run measured (MAJOR 3).** Committed
   scenes whose IR is not a stub (or model-authored ops committed) in
   `renderTable`, and re-state "the generative half is alive" as the narrower,
   true claim about the revision step.
5. **Widen `classifyRun` structurally (MEDIUM 4)**, keeping its two existing
   clauses first so claim 117 stays true; add `FRAGMENT`/`DEGRADED` and a
   stub-only `FAILED`, pin the new clauses both ways, and re-print this run's
   six rows under it.
6. **Resolve the FreeRide priority (MEDIUM 5).** Either exclude `freeride` at
   these two call sites, or correct `getLLMProvider()`'s docstring and add a
   test in the Gemini-keyed direction; note the `llmReady` policy in
   `ai-config.ts` that this currently crosses.
7. **Make the run directory non-destructive (MEDIUM 6)** — a run ordinal, an
   `--out`, or a refusal to overwrite an existing `summary.json`.
8. **Correct the `event_0` count (LOW 7)**, re-record or date-stamp §3's
   un-fix table against the 17-case file (LOW 8), document and test the 400
   branch with a message that fits it (LOW 9), and name the `intention` pass in
   both places the report says "some pass" (LOW 10).

Items 1–4 are the round; 5–8 are cheap and should ride with it. Nothing in this
list requires re-running the bench: every number it asks for is already in
`data/story-bench/2026-09-13/`, except the one raw completion, which costs
twelve seconds.
