# Independent review — `lane/story-bench` @ `2a0546ff` (round 2)

**Tip line — reviewed object:** `lane/story-bench` @ **`2a0546ff`**
("docs(audit): round 2's gates, the single full npm test, and the Tip line"),
on `origin/main` `91c369c5`. Round 1 ended at `9a7dc522`; the round-1 review is
committed at `9af43fe2`
(`docs/audits/2026-09-13-story/story-bench-review.md`, 366 lines); round 2 is
`9d392911..2a0546ff`, seven commits.
**Worktree:** `<session scratch>/wt-storybench-review`, detached at `2a0546ff`.
**Reviewer:** did not build this lane, and is not the round-1 reviewer — this
is a cold re-check, read from the round-1 file up. Procedure:
`docs/LANE_STANDARD.md` §6, held to §3.

**Verdict: REVISE.** Nine items, all cheap, none requiring a bench re-run. The
lane's central round-2 work — the `IR_SCHEMA` union fix — is correct, is the
difference between a measurement and a fiction, and I could not break it. What
sends this back is smaller and more specific: **two of the round-1 items the
lane's own closure table reports as `done` are not done**, and one of them is
a sentence that is factually false about the doctor's behaviour and contradicts
§4 of the document it sits in. Under §5 that is a false report, not a nit.

---

## 1. Round-1 closure, item by item

Round 1's verdict list had eight numbered items; the lane's report answers ten
(its 9 and 10 are the schema fix and the re-run, which round 1 did not ask for
and which are the round's best work). Verified individually against the diff,
the source and, where checkable, a run.

| # | round-1 item | lane says | **I find** |
|---|---|---|---|
| 1 | correct the ContinuityProof attribution; re-point §7.4 at `IR_SCHEMA` | done | **CLOSED.** `STORY_BENCH_2026-09-13.md:190-216` and the lane report's §4 now state 74/74 stubbed, zero model-authored ops committed, and name `stubIR`'s own `(scene, contains, event_N)` as the colliding facts, with the two-schema live measurement beside it. §7 item 6 ("Diagnosed and fixed in round 2, not left as future work") replaces the old "most useful next thing to look at". I verified the mechanism at source: `stubIR` (`server/nvm/generate/llm-generator.ts:13-33`) hard-codes that fact, and `parseIR:157` returns `stubIR` when `ops.length === 0`. |
| 2 | fix the PASS reading — remove or rewrite the three named sentences | done | **PARTIALLY CLOSED.** Two of the three are gone (greps for "returns verdict PASS" and "clearest demonstration" return nothing outside the round-1 review file). The third survives **verbatim** at `docs/story-generation/STORY_BENCH_2026-09-13.md:345` and `docs/audits/2026-09-13-story/story-bench-lane-report.md:343`: *"A verdict of PASS on a 142-word fragment is the number this lane most wants a reader to distrust."* §4 of the same file (`:272`) now says the opposite — "six PASSes is the doctor rejecting six fragments rather than blessing them" — so the document contradicts itself, and every other corrected paragraph in it carries an explicit *(Corrected in round 2…)* marker that this one does not. `verdictFor` re-read at `server/nvm/analyze/doctor.ts:860`: `health < 60 → PASS`. |
| 3 | keep `excerptNote`/`pageEstimate`; **delete the claim that the doctor never mentions the thinness**; add the note to §6 | done | **PARTIALLY CLOSED — and the "deleted" half is the one that is not done.** Kept: `scripts/story-bench.mjs:747-751` writes `excerptNote` and `pageEstimate`, with `verdictMeaning` at `:742`. Added to §6: `STORY_BENCH:625-637`. **Not deleted:** `STORY_BENCH:388` and `story-bench-lane-report.md:386` still read *"Nothing in the report mentions that the screenplay is seventeen lines long, ends on `event_0`, or contains a single scene."* That sentence is false — `excerptNoteFor` (`doctor.ts:904`) fires for any `sceneCount < 8` and on this script emits "(1 scene analyzed)" — and §4 of the same document (`:262-269`) says so explicitly. The lane's closure table claims it "is deleted". It is not. |
| 4 | add the column that decides what the run measured | done | **CLOSED.** `model scenes` is a real column in `renderTable` (`scripts/story-bench.mjs:308`), computed from `ir.provenance.model !== 'stub'` at `:642-644`, carried on the row at `:702/:721`, and printed in both tables (`STORY_BENCH:410-417`, `:423-430`). "The generative half is alive" is narrowed to "**The REVISION step is now demonstrably alive. The candidate generator is not.**" (`:247`). |
| 5 | widen `classifyRun` structurally, two original clauses FIRST | done | **CLOSED.** `scripts/story-bench.mjs:196-236`: the `llmCalls === 0` and `every pass fell back` clauses are lines 204 and 205, ahead of everything new, and a caller that supplies no scene accounting gets exactly the old behaviour (`:211-213`). Ten new assertions, pinned both ways, including the one that matters — a perfect scene record cannot talk the original clause out of firing (`tests/scripts/story-bench.test.ts:255-265`). I checked the v2 table's six labels against the function by hand: 3/8, 3/7, 3/7, 1/8, 2/8 → FRAGMENT; 4/7 → DEGRADED. All six correct. |
| 6 | resolve the FreeRide priority | done | **CLOSED.** `getGenerativeProvider()` (`server/engine/ai.ts:308-310`) returns `geminiProvider` when and only when the manager AUTO-SELECTED FreeRide; `setLLMProvider` clears the flag (`:250`), so an explicit configuration always wins. Docstring corrected at `:248-284` and no longer claims "Gemini otherwise". Three tests, and I un-fixed it (below): removing the carve-out turns the file RED 21/1. `server/lib/ai-config.ts` is untouched, so `llmReady()`'s two independent sources are exactly as they were. |
| 7 | make the run directory non-destructive | **done, twice** | **PARTIALLY CLOSED.** The first half is real and guarded: `nextRunDir` (`:263-272`) never returns a directory holding a `summary.json`, and un-fixing it goes RED (below). The second half — `rowsFromDir` (`:248-256`), the derivation the whole `ce2a75b6` commit is named after — **has no test at all.** I replaced its body with `return []` and `tests/scripts/story-bench.test.ts` stayed **30 pass / 0 fail**. Per §3 that is not a guard; it is an untested feature. Nothing anywhere asserts that `renderTable(rowsFromDir(dir, ids))` reproduces a table, or that a re-run of one premise leaves the other five rows standing. |
| 8 | the four LOW items | done | **CLOSED, 4 of 4.** `event_0`: `STORY_BENCH:321-327` now says twice here, three across the run, and says it is a correction. §3's un-fix table is both date-stamped to the SHA it was taken at (`4c2a8a92`, 15 cases) **and** re-recorded against the shipped 22-case file (`story-bench-lane-report.md:137-148`). HTTP 400 is re-worded through `reasonFor` (`server/lib/ai-providers/openai-compat.ts:434-445`) and 400 and 403 are now tested (`tests/core/openai-compat-generation-guards.test.ts:128-136`). `intention` is named at `STORY_BENCH:278`, `intention` and `rhythm` at `:335`. |
| 9 | *(lane's own)* fix the schema seam, shown failing first | done | **CLOSED, and this is the round.** See §3 below. |
| 10 | *(lane's own)* re-run the six premises, second table beside the first | done | **CLOSED with one caveat.** §4b holds both tables and a `what moved` comparison. Every column of both tables sums to its stated total (§2). The caveat is not about honesty but about what the comparison invites — finding 6 below. |

Round-1's explicitly-unclosed note ("it would have kept one raw completion")
is carried forward correctly in §7 item 4 as undone rather than done. That is
the right disposition and I am not re-opening it.

---

## 2. Reproduced on this machine, on this tree

| what | command | result |
|---|---|---|
| lint | `npm run lint` | **exit 0**, no output |
| the three lane test files | `node --experimental-strip-types <file>` | schema **9 pass / 0 fail**; guards **22 / 0**; bench helpers **30 / 0** |
| full suite, once | `npm test` | **14,072 tests · 13,980 pass · 0 fail · 91 skipped · 1 todo · 2,450 suites · 385.9 s · exit 0.** Matches the lane's recorded 13,980/0 exactly (it recorded 324 s; the wall difference is sandbox load, not a discrepancy). |
| `check-no-console` | `npm run check-no-console` | 307 files under `server/`, **OK** |
| `honesty-audit` | `npm run honesty-audit` | 465 files + 519 markdown + 118 claims rows, **clean** |
| `check-brain` | `npm run check-brain` | 118 notes, 468 links, **fresh** |
| brain coverage | `tests/core/brain-coverage.test.ts` | **7 / 0** |
| scoring receipt | `node scripts/check-scoring-receipt.mjs origin/main..HEAD` | **no scoring-path files changed. OK.** |
| keyless bench | `node scripts/story-bench.mjs`, no `.env`, no AI vars in env | prints *"No usable LLM provider configured (.env). This bench generates; it cannot run keyless."* then *"Nothing was measured. This is not a result."*, **exit 2**, writes nothing under `data/` |
| keyless `--packet` | `node scripts/story-bench.mjs --packet` | throws `no data/story-bench — run npm run story:bench first`, **exit 2** |
| keyless `--check` | `node scripts/story-bench.mjs --check` | prints `key present: false`, "Nothing to probe", exit 0, no key material |
| keyless routes | `tests/routes/llm-ready.test.ts`, `tests/routes/keyless-smoke.test.ts` | **7 / 0** and **7 / 0** |

**Un-fix, run, restore — five times.** Working tree byte-clean after each
(`git status --porcelain` empty).

| un-fix applied | file | result |
|---|---|---|
| `IR_SCHEMA.ops.items` back to the one-property op | `server/nvm/generate/llm-generator.ts:312` | `llm-generator-schema.test.ts` **6 pass / 3 fail** — matches the lane's recorded number exactly |
| the translator drops `anyOf` again | `server/lib/ai-providers/schema.ts:27` | **6 pass / 3 fail** — matches |
| `reasonFor` reverted to the single "model not available" message | `server/lib/ai-providers/openai-compat.ts:427` | guards **19 pass / 3 fail**; the three failures are the 401, 403 and 400 wording assertions, each naming the phrase it wanted |
| the FreeRide carve-out removed (`return _provider`) | `server/engine/ai.ts:309` | guards **21 pass / 1 fail** — "an auto-selected FreeRide must not serve the prose rewriter or candidate generation" |
| the `committedNonStub === 0` clause removed | `scripts/story-bench.mjs:217` | bench helpers **29 pass / 1 fail** |
| `nextRunDir`'s summary.json check removed | `scripts/story-bench.mjs:266` | bench helpers **29 pass / 1 fail** |
| **`rowsFromDir` replaced with `return []`** | `scripts/story-bench.mjs:249` | bench helpers **30 pass / 0 fail — GREEN.** This is finding 1. |

**Arithmetic, both tables, independently recomputed from the six rows.** This
is the strongest evidence available to me that neither table was hand-written,
because six independent columns all reconcile to their stated totals:

- v1: calls 16+10+15+14+13+15 = **83** ✓; fallbacks = **86** ✓; tokens =
  **487,073** ✓; wall 6,879.3 s = **114.7 min** ✓; scenes **6 of 45** ✓.
- v2: calls = **106** ✓; fallbacks = **20** ✓; tokens = **698,518** ✓; wall
  8,751.7 s = **145.9 min** ✓; scenes **16 of 45** ✓; model scenes
  2+2+3+4+1+2 = **14** ✓; passes changed = **26 of 84** ✓.
- Cross-check on §4b's scene accounting: 45 − 16 = 29 uncommitted, and §7 item
  5 says IntentionalProof blocked 17 of 29. HARBOR LIGHTS: 3 committed of 8,
  and §5b accounts for the other five as 4 IntentionalProof + 1 converge
  budget. Consistent.

**Are the three re-run rows genuinely post-`ee115561`?** Yes, and it is
checkable without the artifacts. The defect aborted the revision call whole, at
301 s, with zero passes applied; the three named rows (`counterweight`,
`nine-minutes-of-tape`, `the-long-way-round`) show **6/14, 8/14 and 2/14**
passes changed. A stale pre-fix row could only read 0/14 — and would have been
labelled FAILED by `classifyRun`'s second clause, which none of the six is. The
rows are not stale.

**What I could NOT reproduce, and it matters.** `data/story-bench/` **does not
exist on this machine.** Both run directories are gone (gitignored, and the
sandbox was rebuilt since round 1, which is exactly the hazard
`docs/LANE_STANDARD.md` §7 exists for). So every line-and-file claim in §5 and
§5b — the six character cues, `event_0` at lines 25/29, `"id 2"` at 25/36/55,
`ALEX lunges.` at 76 — is **unverifiable by me**. Round 1 could check them; I
cannot. I am not treating that as a lane defect (the honest reading is
consistent, well-hedged, and the round-1 reviewer did check the v1 half line by
line), but the merge record should say plainly that the v2 readings have never
been independently checked against their artifacts and now cannot be.

---

## 3. The schema fix, scrutinised

This is the commit the brief asked me to attack hardest, and it holds up.

**All 14 kinds are declared, and the set is checked against the union itself.**
`OP_BRANCHES` (`llm-generator.ts:236-273`) declares ADD_FACT, EXPIRE_FACT,
UPDATE_BELIEF, APPRAISE_EMOTION, SHIFT_RELATIONSHIP, ADVANCE_OBJECT_ARC,
TRIGGER_RULE, SEED_CLUE, PAYOFF_SETUP, RAISE_CLOCK, ADVANCE_THEME_ARGUMENT,
UPDATE_READER_STATE, RECORD_VISUAL_FACT, RECORD_SONIC_FACT — exactly the
fourteen arms of `StoryOp` (`server/nvm/ops/StoryOp.ts:63-77`), and
`llm-generator-schema.test.ts:56` asserts set equality against
`STORY_OP_KINDS` rather than against a hand-copied list, so a fifteenth op
cannot be added without the schema noticing.

**The translator is correct for what these schemas contain.** I read
`geminiSchemaToJsonSchema` line by line. The `anyOf`/`oneOf` early return at
`schema.ts:27-36` is the right shape — a union node must not be stamped with
`type: 'object'` — and `additionalProperties` (`:50-51`) and the explicit type
array (`:55-59`) close the other two drops. The `typeof rawType === 'string'`
guard at `:13-14` is load-bearing: without it `['number','null']` would have
thrown on `toLowerCase()`.

**Was anything else being silently dropped?** Still yes, but nothing these
callers use. The translator carries `description`, `enum`, `anyOf`, `oneOf`,
`type` (string or array), `properties`, `required`, `additionalProperties`,
`items` and `nullable`. It drops `minItems`, `maxItems`, `minimum`, `maximum`,
`minLength`, `pattern`, `format`, `default` and `propertyOrdering`. I grepped
every `responseSchema` in `server/` (`llm-generator.ts`,
`nvm/live/intent-parser.ts`, `engine/Agent.ts`, `engine/agent/memory.ts`,
`engine/agent/decision.ts`, `engine/DirectorNode.ts`, `routes/scriptide.ts`):
**none of them uses any dropped keyword**, so no other caller is currently
losing anything. That is a clean result, not a lucky one — but see finding 3,
which is the one place a dropped keyword is actually needed.

**One live-behaviour claim I can only take on trust:** the two-schema
measurement (6,054 ms / 0-of-4 payloads vs 15,575 ms / 4-of-4) and the
end-to-end "5 ops returned, 5 accepted by parseOp, 8.6 s". No key here, and the
endpoint is not reachable from this sandbox. The offline half of the same claim
— that a payload-less op parses to `null` — I verified directly:
`llm-generator-schema.test.ts:96-102` asserts it in the rejecting direction,
and it goes RED when the schema regresses.

---

## 4. Findings

### 1 — MAJOR: the derivation that `ce2a75b6` is named after guards nothing

`rowsFromDir` (`scripts/story-bench.mjs:248`) is the whole of round 2's answer
to MEDIUM 6, and the closure table calls it "the half the reviewer actually
asked for". It has **no test**. I replaced its body with `return []` and
`tests/scripts/story-bench.test.ts` reported **30 pass / 0 fail**. Under
LANE_STANDARD §3 a guard must fail on unfixed input before it counts; here
there is no guard to fail. Nothing asserts the derivation's actual contract:
that `renderTable(rowsFromDir(dir, ids))` reproduces the table, that a
re-written `<id>.row.json` replaces exactly one row, that the five rows not
re-run survive, or that fixture order is preserved regardless of write order.
Two of those are a tmpdir and ten lines.

This also answers the brief's "would a hand-edit of the table be detected?"
**No.** The derivation is real in the code and nothing checks it, and the
committed doc's tables are hand-transcribed (unpadded) copies of a padded
`renderTable` output, so there is no byte-level tie between the doc and any
row file either. The arithmetic reconciliation in §2 is the only thing standing
between the committed tables and an undetectable hand-edit.

### 2 — MAJOR: round-1 item 3's "delete the false claim" half is reported done and is not done

`docs/story-generation/STORY_BENCH_2026-09-13.md:388` and
`docs/audits/2026-09-13-story/story-bench-lane-report.md:386`:

> Nothing in the report mentions that the screenplay is seventeen lines long,
> ends on `event_0`, or contains a single scene.

False, and known by this lane to be false: `excerptNoteFor`
(`server/nvm/analyze/doctor.ts:904`) returns a note for any `sceneCount < 8`
and on a one-scene script emits "(1 scene analyzed)" — quoted correctly by the
same document at `:263` and `:628`. The closure table (`lane-report.md:673`)
says "the claim that the doctor never mentions the thinness is deleted". Per §5
a `done` for something not done is a false report, which is why this is the
item that decides the verdict rather than a typo.

### 3 — MEDIUM: "EVERY BRANCH MIRRORS parseOp" is false for SHIFT_RELATIONSHIP, and the guard cannot see it

`llm-generator.ts:189` states the invariant; `:257-262` declares
`pair: { type: 'array', items: S }` with no length bound, while `parseOp`
(`:87-92`) requires `pair.length >= 2`. I ran it:

```
parseOp({op:'SHIFT_RELATIONSHIP', pair:['ILKA'], delta:{dimension:'trust',amount:-0.3,reason:'x'}})  ->  null
parseOp({op:'SHIFT_RELATIONSHIP', pair:[],       delta:{...}})                                        ->  null
```

Both payloads fully satisfy the declared branch. This is the same class of
drift the commit exists to make impossible, one op later. The guard misses it
because `INSTANCES` (`llm-generator-schema.test.ts:38-53`) are hand-written
full payloads, not minimal ones synthesised from each branch's own `required`
and property types — so a branch could require the wrong fields entirely and
test 4 would still pass. Closing it needs `minItems: 2` on the branch **and**
`minItems` support in `geminiSchemaToJsonSchema`, which currently drops it.
The other thirteen branches I checked by hand are sound.

### 4 — MEDIUM: the `EMOTION` branch admits a partial `EmotionState` into committed state

`llm-generator.ts:221-229` requires only `dominant` and `intensity`, while
`EmotionState` (`server/engine/types.ts:398-409`) declares nine non-optional
fields and `parseOp:78-83` casts the object through unchecked. The dispatcher
stores it wholesale (`server/nvm/ops/dispatcher.ts:45`), and
`server/nvm/quality/index.ts:495` then evaluates `(emo.fear + emo.distress) > 100`
— `NaN > 100` is false, so the debt check silently never fires rather than
throwing. Before this lane the model could not emit an `APPRAISE_EMOTION`
payload at all, so this path was unreachable; it is reachable now. Also
inconsistent within the same file: `dimension`, `carrier` and `move` are
declared as enums precisely so "a decoder can be stopped from inventing a
fifteenth dimension" (`:214-216`), but `EMOTION.dominant` (`EmotionType`, 7
values) and `BELIEF.source` (`BeliefSource`, 3 values) are left as free
strings.

### 5 — MEDIUM: the packet shows the human scorer the inflated scene count, under the same name the table uses for the honest one

`row.scenes` (`scripts/story-bench.mjs:709`) is the **doctor's** `sceneCount`.
`renderTable:305` deliberately does not use it — the table's `scenes` column is
`committedScenes/requestedScenes`. But the packet header
(`scripts/story-bench.mjs:975`) prints `${row.scenes} scenes`. For
`the-understudy-clause` that is **5**, where 3 were committed and 2 were
invented by the revision pipeline out of a different film (`STORY_BENCH:524-533`).
So the one artefact built for a human reader shows the number this lane's own
§4 identified as an instrument artifact — a revision pass typing a slugline —
with no note, and two surfaces call two different quantities `scenes`
(LANE_STANDARD §2: every surface that shows a number shows the same number).
The packet front matter is otherwise excellent and I would not touch it.

### 6 — MEDIUM: §4b's "what moved" table counts one improvement five times

`STORY_BENCH:440-448` lists `scenes committed`, `words per script`, `health`
and `verdicts` as four separate rows of movement. By this document's own §6
(`:638-641`) scene-count scarcity carries AUC ~0.938 of the doctor's
discrimination against ~0.076 for the whole rule channel — so `health` and
`verdicts` are very largely restatements of `scenes committed`, and `words` is
close behind. The prose hedges well ("Nothing here is a quality claim, and one
row got worse"), but the table is what a reader quotes, and as laid out it
reads as five independent gains where there are roughly two. One sentence under
the table fixes it. Related: `the-understudy-clause`'s 71.9 — the run's highest
health, and the row §5b calls "the strongest" — is scored on a `sceneCount` of
5 that includes two revision-invented headings, which is the exact mechanism §4
uses to explain v1's lone health-30 row. That connection is never made.

### 7 — LOW: the brain notes, Decision #8 and one method-doc line still describe the pre-round-2 world

Round 2 touched no file under `docs/brain/`, `ROADMAP.md` or
`docs/DECISION_LOG.md` (`git diff --stat 9af43fe2..2a0546ff` lists twelve
files, none of them). Consequences, in a repository whose CLAUDE.md makes
`docs/brain/00 Home.md` the first stop for an agent with no context:

- `docs/brain/Generation/Generation - Story Bench.md:60`,
  `docs/brain/Decisions/Decision 8 - ….md:53`,
  `docs/DECISION_LOG.md:901` and
  `docs/story-generation/STORY_BENCH_2026-09-13.md:57` all say the two call
  sites use **`getLLMProvider()`**. They use `getGenerativeProvider()`, and
  round-1 item 6 is the reason why.
- The same brain note says the guards file holds "15 assertions". It holds 22.
- Neither brain note mentions the schema defect, the `anyOf` fix, the v2 run,
  or `tests/core/llm-generator-schema.test.ts` in its `sources`. A future
  agent reading the brain learns the v1 story and none of the round that
  overturned it. `check-brain` and `brain-coverage` both pass, because they
  check freshness and link resolution, not content — so nothing catches this
  but a reader.

### 8 — LOW: three small factual/wiring slips

- `scripts/story-bench.mjs:415` says the `headersTimeout` defect cost **"two
  premises"**; `STORY_BENCH:482` and `lane-report:480` say **"Three of the six
  v2 rows"** and name all three. One is wrong, in a lane whose round-1 LOW 7
  was a miscount.
- `STORY_BENCH:628` quotes `excerptNote` as reading *"(1 scene analyzed)"* **"on
  every script in this run"**, inside §6, after §4b has established that the
  current run's scripts have 1–5 scenes and §5b has quoted the 5-scene variant
  at `:561`. That is a v1 reading printed as if it were general.
- `docs/CLAIMS_REGISTER.md:209` anchors row 117 at
  `tests/scripts/story-bench.test.ts:186`; the assertion is at **:188** (round
  2 inserted two lines above it). `638e02fe` re-pointed the other three anchors
  and missed this one. The honesty audit passes either way, so nothing else
  will catch it.

### 9 — LOW: `--out` and `--into` write run directories that `--packet` can never find

`listRunDirs` (`scripts/story-bench.mjs:287-298`) filters on
`^\d{4}-\d{2}-\d{2}(-run\d+)?$`, so a run written to `--out seam-fix` or
`--into anything` is invisible to `--packet`, which then silently assembles a
packet from an **older dated directory** and prints "the newest run directory
of N" while doing it. Either reject a non-dated `--out`, or have `--packet`
take the same argument. (`--into` also joins an unsanitised argument onto the
root; owner-run dev script, so noted rather than raised.)

### Not findings — checked and clear

- **Secret discipline.** `git grep -nE "nvapi-…|sk-…|AIza…"` over the reviewed
  tree returns only the deliberately-fake key in the pre-existing
  `tests/routes/safe-error.test.ts`. Nothing in the lane's diff logs a header,
  an env dump or a whole error object: `probeOpenAICompatModels`
  (`openai-compat.ts:1-30` of the new block) returns `{ok,status,ids,error}`
  with `error` a 300-char slice of the upstream **body**, never the request;
  the loopback relay (`story-bench.mjs:466-497`) copies headers into a forward
  request and logs none of them; `--check` prints `key present: <bool>`. The
  probe test asserts the key reaches the wire and not the result
  (`openai-compat-generation-guards.test.ts:4674-4693` of the diff). Clean.
- **Gitignore.** `.gitignore:41` is a bare `data/`, which covers
  `data/story-bench/<date>`, `-runN`, `--out` and `--into` alike.
  `git ls-files data/` returns only the pre-existing CC0 screenplay corpus. No
  generated artifact is committed, and `git status` in a tree where I ran the
  bench keyless is clean.
- **No LLM-as-judge.** Nothing in the bench asks a model for a score. The
  doctor scores (`POST /api/scriptide/doctor`); the five rubric questions
  (`story-bench.mjs:893-899`) are for the human; `classifyRun` is purely
  structural and says so at `:175-177`; §6 pre-registers the conditions under
  which a research-signal column could exist and states it does not today.
  NORTH_STAR §1 intact.
- **`console.` under `server/**`.** No `+` line in the lane's `server/` diff
  adds one; `npm run check-no-console` passes over 307 files. The bench's own
  `console.*` calls are in `scripts/`, which is out of scope by the rule's own
  wording.
- **Rate limiting and zod validation.** The lane adds and changes **no route**
  — the five `server/` files are the adapter, the schema translator, the
  provider seam and the two generative call sites. Nothing under
  `server/routes/` is touched, so `gameLimiter`/`aiLimiter` and
  `server/lib/validation.ts` are unaffected.
- **Keyless-first posture.** `server/lib/ai-config.ts` is untouched:
  `llmReady()` (`:197-201`) still ORs `GEMINI_API_KEY` against the
  multi-provider config. `getGenerativeProvider()` falls back to
  `geminiProvider`, whose `generate()` throws without a key into each call
  site's documented fallback — the pre-lane behaviour exactly. `llm-ready` and
  `keyless-smoke` route tests: 7/0 and 7/0.
- **Scoring path.** `check-scoring-receipt origin/main..HEAD` reports no
  scoring-path file changed, which is the correct answer for a diff that
  touches no file reachable from `doctor.ts`.
- **Claims 117 and 118.** Row 117's sentence survives `classifyRun`'s widening
  because the two original clauses are evaluated first — I checked by
  constructing the adversarial case (a perfect 8-of-8 scene record with zero
  passes changed) and it still returns FAILED. Row 118's anchor resolves.

---

## 5. Gates

```
npm run lint                                   exit 0
node --experimental-strip-types tests/core/llm-generator-schema.test.ts
                                               9 pass / 0 fail
node --experimental-strip-types tests/core/openai-compat-generation-guards.test.ts
                                               22 pass / 0 fail
node --experimental-strip-types tests/scripts/story-bench.test.ts
                                               30 pass / 0 fail
npm run check-no-console                       OK (307 files)
npm run honesty-audit                          clean (465 + 519 + 118 rows)
npm run check-brain                            OK (118 notes, 468 links, fresh)
node scripts/check-scoring-receipt.mjs origin/main..HEAD
                                               no scoring-path files changed
npm test                                       exit 0 — 14,072 tests,
                                               13,980 pass / 0 fail,
                                               91 skipped, 1 todo, 2,450 suites,
                                               385.9 s
```

---

## 6. What a stronger version would have done

Round 1 named the one thing and the lane carried it forward honestly (§7 item
4: still no raw completion kept). I will add only what this round's own shape
suggests. **The derivation should have been the tested thing, not the untested
one.** `ce2a75b6` is the commit that makes the committed tables trustworthy —
it is the reason a re-run of three rows could be folded into an existing run
without inventing a table — and it shipped with no assertion at all, in a round
whose central lesson was that a declaration nobody checks drifts from the code
that reads it. Ten lines in a tmpdir would have closed it, and would have made
the `renderTable`-to-document tie checkable instead of leaving column
arithmetic as the only defence. Second, and smaller: the guard file's
`INSTANCES` should be **derived from each branch's own `required` list** rather
than hand-written, which is the difference between "these fourteen payloads I
wrote parse" and "everything this schema promises, parseOp accepts" — the
second is the invariant the file's own header claims, and it is the one that
would have caught finding 3.

What the lane did do, it did well. The schema diagnosis is the most valuable
thing produced on this direction: it converted a 114-minute run that measured
nothing about generation into one that measures the model, and it did it by
reading one raw completion rather than by tuning anything. Both instrument
defects found along the way were disclosed with the rows they cost rather than
quietly fixed. The v2 readings are harsher on the output than the numbers
require, which is the right direction for a lane to err in. And the honest
headline is intact and correct: sixteen of forty-five scenes, and the model
still invents its cast.

---

## VERDICT: REVISE

Nine items. None needs the bench re-run; every number they ask for is already
in the documents or is a test.

1. **Delete the false sentence (finding 2).**
   `docs/story-generation/STORY_BENCH_2026-09-13.md:388` and
   `docs/audits/2026-09-13-story/story-bench-lane-report.md:386` — "Nothing in
   the report mentions that the screenplay is seventeen lines long, ends on
   `event_0`, or contains a single scene." Replace it with what the doctor did
   say, and correct the closure-table row that reports this as deleted
   (`story-bench-lane-report.md:673`).
2. **Fix the third PASS sentence (round-1 item 2).**
   `STORY_BENCH_2026-09-13.md:345` and `story-bench-lane-report.md:343` — "the
   number this lane most wants a reader to distrust" contradicts `:272` of the
   same file. Rewrite it the way §4 was rewritten, with the same *(Corrected in
   round 2)* marker the other paragraphs carry.
3. **Test the derivation (finding 1).** `scripts/story-bench.mjs:248`
   `rowsFromDir` — add assertions in `tests/scripts/story-bench.test.ts` that
   fail when it is neutered: rows come back in fixture order regardless of
   write order, a re-written `<id>.row.json` replaces exactly one row, absent
   row files are skipped, and `renderTable(rowsFromDir(...))` reproduces the
   expected table. Show it RED first.
4. **Make the SHIFT_RELATIONSHIP branch mirror `parseOp` (finding 3).**
   `server/nvm/generate/llm-generator.ts:257-262` needs a two-element bound, and
   `server/lib/ai-providers/schema.ts` needs to carry `minItems` for it to
   reach the wire. Either fix it or strike the "EVERY BRANCH MIRRORS parseOp"
   claim at `:189` and say which branch does not.
5. **Close or bound the EMOTION branch (finding 4).**
   `llm-generator.ts:221-229` — require the six dimensions and
   `last_updated_at`, or default them in `parseOp`, so a conformant payload
   cannot put a partial `EmotionState` into committed state and silence
   `server/nvm/quality/index.ts:495`. Declare `dominant` and `BELIEF.source` as
   enums for the same reason the other three are.
6. **One number, one name (finding 5).** `scripts/story-bench.mjs:975` prints
   `row.scenes` (the doctor's count) as "N scenes" to the human scorer while
   the table uses committed/requested. Print both, or print the committed count
   and name the doctor's separately.
7. **Add the sentence under §4b's comparison table (finding 6).**
   `STORY_BENCH_2026-09-13.md:440-448` — say that `health` and `verdicts`
   largely restate `scenes committed`, per §6's own AUC figures, and note that
   `the-understudy-clause`'s 71.9 is scored on a `sceneCount` of 5 that
   includes two revision-invented headings.
8. **Bring the brain and Decision #8 to round 2 (finding 7).**
   `docs/brain/Generation/Generation - Story Bench.md:60` (and its "15
   assertions"), `docs/brain/Decisions/Decision 8 - ….md:53`,
   `docs/DECISION_LOG.md:901`, `STORY_BENCH_2026-09-13.md:57` —
   `getGenerativeProvider()`, not `getLLMProvider()`; and the schema defect and
   the v2 run belong in the note that a contextless agent reads first.
9. **The three slips (finding 8) and the packet/`--out` mismatch (finding 9).**
   `scripts/story-bench.mjs:415` "two premises" → three;
   `STORY_BENCH_2026-09-13.md:628`'s "(1 scene analyzed) … on every script in
   this run"; `docs/CLAIMS_REGISTER.md:209`'s anchor `:186` → `:188`; and
   `scripts/story-bench.mjs:287-298` vs `:264`/`:279` — a `--out`/`--into` run
   that `--packet` silently cannot see.

Items 1–3 are the round. 4–5 are the ones a future reader of this schema will
be glad of. 6–9 are cheap and should ride with it.

**Not re-opened, deliberately:** round-1 items 1, 4, 5, 6, 8 and the schema fix
and re-run are closed, verified above, and should not cost another round. The
"keep one raw completion" note is correctly carried as undone in §7 item 4.

**One thing for the merge record, not for the lane.** `data/story-bench/` no
longer exists on this machine; both run directories were lost with the sandbox.
The v2 readings in §5b have therefore never been checked against their
artifacts by anyone but their author, and now cannot be. That is
`docs/LANE_STANDARD.md` §7 operating exactly as described, and it is an
argument — for the next lane, not this one — that the bench should commit a
redacted, bounded evidence file alongside the numbers it publishes.
