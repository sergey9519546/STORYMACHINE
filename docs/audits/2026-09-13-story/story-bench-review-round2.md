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

---

# ROUND 3 — the lane's closure of the nine items

*(Appended by the lane, 2026-09-18. The reviewer's text above is unchanged.)*

Reviewed object was `lane/story-bench` @ `2a0546ff`; the review itself is
committed at `06dfad70`, which is where round 3 starts. Round 3 is
`06dfad70..72b0fc99`, three commits:

```
95f03b3d fix(schema): the declared op branches mirror parseOp, and a partial
         EmotionState cannot reach state
d3f4a113 test(bench): the derivation the table rests on is guarded, and two
         siblings with it
72b0fc99 docs: the false sentence, the surviving PASS reading, the five-times
         table, and the brain
```

No bench re-run. No assertion weakened, no feature, doc section or guard
removed. The provider key was never printed, echoed, logged or written to any
artifact — the only bench command run was `--packet`, which reads a finished run
and touches no provider.

## 1 — the false sentence, and the closure table that reported it deleted

**Deleted, in both documents.** `docs/story-generation/STORY_BENCH_2026-09-13.md`
§5 and `docs/audits/2026-09-13-story/story-bench-lane-report.md` §5 no longer
contain "Nothing in the report mentions that the screenplay is seventeen lines
long, ends on `event_0`, or contains a single scene." The paragraph now ends at
`STORY_BENCH_2026-09-13.md:397` / `story-bench-lane-report.md:391` with a
*(Corrected in round 3)* marker that states what the doctor's report DOES carry
for a one-scene script: `excerptNote` (`server/nvm/analyze/doctor.ts:904`, wired
at `:2308`), quoted in full, plus `pageEstimate` — 2 pages on this script.

**Verified against the artifacts, which DO still exist in this sandbox** (see
the closing note below): `data/story-bench/2026-09-13/counterweight.doctor.json`
has exactly five keys — `health`, `verdict`, `sceneCount`, `contentHash`,
`topFindings` — and `data/story-bench/2026-09-13-run2/counterweight.doctor.json`
has eight, adding `verdictMeaning`, `excerptNote` and `pageEstimate`. So what
dropped the doctor's disclosure was this bench's FIRST readout writer, not the
doctor, and the corrected sentence says that rather than blaming the engine.
`excerptNoteFor(1)` was run directly and returns the exact string quoted.

**The closure table is corrected at `story-bench-lane-report.md:689-694`, and
the other rows were audited.**

| row | round 2 said | now |
|---|---|---|
| 2 | "All three sentences corrected in both docs" | **OVERSTATED IN ROUND 2; CLOSED IN ROUND 3.** Two were. The row now says which one was not and that it is fixed. |
| 3 | "the claim that the doctor never mentions the thinness is deleted" | **FALSELY REPORTED IN ROUND 2; CLOSED IN ROUND 3.** It was not deleted. The row now says so in those words, with the artifact evidence. |
| 7 | "done, twice" | **BUILT IN ROUND 2, GUARDED IN ROUND 3.** The feature was real; the derivation had no assertion. The row now says both. |
| 1, 4, 5, 6, 8, 9, 10 | `done` | **Stand as written.** Re-checked against the source and, where the artifacts allow it, against the run: §5b's line-level readings reproduce exactly (below). |

Spot-check of the rows the reviewer could not reach, run against the artifacts
in this worktree: `event_0` at `harbor-lights.final.fountain` lines 25 and 29,
and a third occurrence in `counterweight.final.fountain` — "twice here, three
across the run" is exact. `"id 2"`, `"id 3"`, `"id 4"` as clue text at lines 25,
36 and 55 of `the-understudy-clause.final.fountain`, with the clock sentence at
27, 38 and 53. `ALEX lunges.` at line 76. HARBOR LIGHTS v2's six character cues
at 4, 7, 16, 20, 24, 27 with the revision pass's paraphrases at 6, 14, 18, 22,
and `"c3"` at 30. Every one reproduces. One number did NOT: "It appears three
times in 57 lines" — the script is 101 lines and the three occurrences are at
27, 38 and 53. Corrected at `STORY_BENCH_2026-09-13.md:601` /
`story-bench-lane-report.md:595`.

## 2 — the surviving PASS sentence

**Fixed at `STORY_BENCH_2026-09-13.md:349` and
`story-bench-lane-report.md:343`.** "A verdict of PASS on a 142-word fragment is
the number this lane most wants a reader to distrust" is now "…is the doctor
REJECTING the fragment, which is the right answer", carrying the same
*(Corrected…)* marker the neighbouring paragraphs carry and naming what on that
row IS worth distrusting — the five `INTENTION_INVISIBLE` findings about the six
characters whose only content is a tracked belief. The surviving version is the
one §4 (`:272`) and §6 already state and that `verdictFor` (`doctor.ts:860`)
backs: `health < 60` returns PASS, the rejection verdict.

## 3 — the derivation is guarded, and a second untested helper came with it

**RED FIRST, reproducing the reviewer's own mutation before writing anything.**
With `rowsFromDir`'s body replaced by `return []` on the unmodified round-2 tree:

```
node --experimental-strip-types tests/scripts/story-bench.test.ts
# tests 30
# pass 30
# fail 0          <-- the reviewer's finding, reproduced
```

Four assertions were then written —
`tests/scripts/story-bench.test.ts:333-411`, "story-bench table is DERIVED from
the per-premise row files": rows in FIXTURE order whatever order they were
written in, a re-written `<id>.row.json` replacing exactly one row with the
other two standing, an absent row file skipped with no hole and no stray file
picked up, and `renderTable(rowsFromDir(...))` equal to
`renderTable(rows)` string for string. The fixture ids are deliberately
**not alphabetical** (`charlie, alpha, bravo`) so that a derivation which simply
globbed the directory fails too.

RED again, each un-fix applied alone (38 pass / 0 fail when fixed):

| un-fix | file | result |
|---|---|---|
| `rowsFromDir` body → `return []` | `scripts/story-bench.mjs:248` | **34 pass / 4 fail** — all four new assertions |
| `rowsFromDir` globs `readdirSync` instead of following `orderedIds` | same | **34 pass / 4 fail** |

**THE SIBLING AUDIT — and it found a second one.** Every exported helper of
`scripts/story-bench.mjs` was stubbed in turn and the suite re-run
(12 helpers). On the round-2 tree, TWO were unguarded, not one:

```
beatsToSceneTargets   pass 30 / fail 0   <-- UNGUARDED
rowsFromDir           pass 30 / fail 0   <-- UNGUARDED
castGroundingOps      29/1   parseLogLine 29/1   summariseCalls 29/1
classifyRun           23/7   scriptWordCount 29/1  nextRunDir 27/3
listRunDirs           29/1   renderTable 29/1    packetFrontMatter 28/2
```

`beatsToSceneTargets` was pinned only by a test that iterated its result with
`forEach`, which is vacuous on an empty array — a test that could not have
caught the bug, exactly the §3 failure in a different shape. It now asserts one
target per beat, and at least one, BEFORE it iterates
(`tests/scripts/story-bench.test.ts:113-121`); stubbed, the file is 37/1.
After round 3 all twelve helpers plus the new `scenesLabel` go RED when stubbed.

## 4 — `SHIFT_RELATIONSHIP` mirrors `parseOp`, and so does every other branch

**Made true, not struck.** `server/nvm/generate/llm-generator.ts:309` declares
`pair: { type: 'array', items: S, minItems: 2, maxItems: 2 }` — `minItems`
because `parseOp:85-92` requires two elements, `maxItems` because `StoryOp.ts`
types it as a two-element tuple. `server/lib/ai-providers/schema.ts:33` now
carries `minItems`, `maxItems`, `minimum`, `maximum`, `minLength`, `maxLength`
and `pattern`, which it was dropping exactly as it had been dropping `anyOf`; a
bound the translator eats is a bound the decoder never hears. `format`, `default`
and Gemini's `propertyOrdering` are deliberately NOT carried, with the reason at
the site, and that decision is itself pinned by an assertion so it cannot drift
into an accident.

**The other thirteen branches were checked mechanically, not by hand.** The
reviewer's diagnosis of why the guard missed this was right: `INSTANCES` are
hand-written full payloads, so a branch could require the wrong fields entirely
and the round-trip test would still pass. `tests/core/llm-generator-schema.test.ts:152`
now synthesises the SMALLEST payload each branch permits — from that branch's
own `required` list, property types, enums and array bounds — and requires
`parseOp` to accept it. That is the invariant the file's header claims, and it
is the assertion that fails the moment any branch is looser than the parser
anywhere. The hand-written instances are kept beside it; they test a different
thing (that a realistic payload parses) and nothing was removed.

RED first, each un-fix alone (17 pass / 0 fail when fixed):

| un-fix | result |
|---|---|
| `pair` bound removed (the exact round-2 shape) | **14 pass / 3 fail** — the synthesis test names `SHIFT_RELATIONSHIP {"op":"SHIFT_RELATIONSHIP","pair":[],...}`, plus the bound assertion and the translator assertion |
| the translator drops `minItems`/`maxItems` again | **15 pass / 2 fail** |

## 5 — the `EMOTION` branch cannot put a partial `EmotionState` into state

**Closed at the schema AND at the parser.** `llm-generator.ts:270` requires all
nine non-optional `EmotionState` fields (`anger_target_id`, the interface's only
optional member, is declared but not required, so the model can express it
without being forced to invent one). `dominant` is now the `EmotionType` enum
(`:266`) and `BELIEF.source` the `BeliefSource` enum (`:247`), for the reason the
file already gave for the other three. And `parseOp:94-98` rejects a partial
whether or not the schema was honoured, so the invariant does not depend on the
declaration — a future caller that hand-rolls an op cannot get one in either.

**The NaN is pinned in both directions**
(`tests/core/llm-generator-schema.test.ts:191-258`, "a conformant
APPRAISE_EMOTION cannot NaN the quality engine"): the branch's own minimum
payload is parsed, dispatched through `applyStoryOp` and read back out of
`characterEmotions`, with every one of the six dimensions asserted finite and
`(fear + distress)` asserted finite — the exact expression at
`server/nvm/quality/index.ts:495`; a real appraisal (fear 60, distress 70) is
asserted to REACH that comparison and trip the peak-distress debt, so if the
check ever goes blind again it fails here; and four partial payloads, including
the `{dominant, intensity}` shape the old branch admitted, are asserted to parse
to `null`.

RED: with the branch back to `required: ['dominant','intensity']` and the
parser's check removed — **14 pass / 3 fail**, the first failure reporting a
dimension that "reached committed state as undefined".

## 6 — one number, one name, in the packet

`scripts/story-bench.mjs:945` adds `scenesLabel(row)`, which renders
`"N of M scenes committed"` from `committedScenes`/`requestedScenes` — the same
quantities `renderTable` uses. The packet header (`:1068`) prints that, and
prints the doctor's count separately and by name: *"structural health 71.9
(CONSIDER), scored on the doctor's sceneCount 5"*. The front matter gains a
section, **TWO SCENE COUNTS, AND WHICH ONE IS AUTHORITATIVE**, which says the
committed count is the truth about the run and that the doctor's can be larger
because it counts headings a revision pass typed.

Driven, not asserted: `node scripts/story-bench.mjs --packet` regenerated the
packet from the real `2026-09-13-run2` artifacts. The six headers now read

```
[[ comedy · 3 of 7 scenes committed · 437 words · structural health 71.9
   (CONSIDER), scored on the doctor's sceneCount 5 · run status FRAGMENT ]]
[[ non-linear · 4 of 7 scenes committed · 835 words · structural health 74.4
   (CONSIDER), scored on the doctor's sceneCount 9 · run status DEGRADED ]]
```

— the second gap is wider than the one the reviewer found, and was invisible
before this change. RED: with `scenesLabel` returning `` `${row.scenes} scenes` ``,
37 pass / 1 fail.

## 7 — §4b's comparison reads as two movements, not nine

`STORY_BENCH_2026-09-13.md:472` and `story-bench-lane-report.md:466` add a
paragraph under the table: `health`, `verdicts` and `words per script` largely
restate `scenes committed` at the doctor's own AUC ~0.938 against ~0.076 for the
whole weighted-rule channel, and `model scenes` / `model-authored ops` /
`llm_generator_partial_parse` / `fallbacks per LLM call` are four views of the
schema fix. It states plainly that nothing in the table is evidence any script
got better.

It also makes the connection the reviewer said was never made, with the line
numbers checked in the artifact: `the-understudy-clause`'s 71.9 is the run's
highest health and is scored on a `sceneCount` of 5 where 3 committed —
`INT. SCENE 0 - DAY` (1), `INT. SCENE 3 - LATER` (31) and `INT. SCENE 5 - NIGHT`
(44) are the committed three; `INT. ARCHIVE ROOM - NIGHT` (59) and
`INT. THEATER LOBBY - NIGHT` (80) are not. The same mechanism §4 uses to explain
v1's lone health-30 row, operating on v2's best number.

## 8 — the brain, Decision #8 and the method doc are at round 3

- `docs/brain/Generation/Generation - Story Bench.md`: `getGenerativeProvider()`
  with the reason it is not `getLLMProvider()`; "22 assertions", not 15; a new
  **THE SCHEMA DEFECT** section carrying the 74-of-74 finding, the `anyOf` fix,
  round 3's two branch fixes and the v2 numbers; a new section on what the
  doctor's AUC figures mean for reading any of it; `sources` extended with
  `tests/core/llm-generator-schema.test.ts` and
  `server/lib/ai-providers/schema.ts`; `updated: 2026-09-18`.
- `docs/brain/Decisions/Decision 8 - ….md:53`: same rename, plus the schema
  defect as a second bullet in the same voice as the first.
- `docs/DECISION_LOG.md:901`: `getGenerativeProvider()` with the distinction
  spelled out, and two new bullets — the `IR_SCHEMA` fix with the 74-of-74
  measurement and round 3's two branch defects, and the v2 re-run's numbers with
  an explicit note that they are a measurement becoming real, not a quality
  claim.
- `docs/story-generation/STORY_BENCH_2026-09-13.md:57`: corrected in place with
  a marker.

`npm run brain` regenerated (118 notes, 468 links); `npm run check-brain` fresh;
`tests/core/brain-coverage.test.ts` 7 pass / 0 fail.

## 9 — the three slips and the `--packet` gap

- `scripts/story-bench.mjs:415`: "two premises" → **three**, and it now names
  them (`counterweight`, `nine-minutes-of-tape`, `the-long-way-round`), matching
  §4c.
- `STORY_BENCH_2026-09-13.md:682`: the "(1 scene analyzed) … on every script in
  this run" quote is marked as the **v1** reading it is, with the note that the
  v2 scripts have 1 to 5 scenes and `excerptNote` interpolates the count —
  §5b quotes the 5-scene variant and `2026-09-13-run2/counterweight.doctor.json`
  holds the 4-scene one.
- `docs/CLAIMS_REGISTER.md`: row 117's anchor `:186` → **`:200`**, and row 118's
  two anchors re-pointed to `:494` and `scripts/story-bench.mjs:998`, where this
  round moved them. `honesty-audit` clean.
- **Fixed, not documented.** `listRunDirs` (`scripts/story-bench.mjs:312`) takes
  an optional `stamp` — the mtime of a directory's `summary.json` — and with it
  sees every FINISHED run, including the ones `--out <name>` and `--into <name>`
  write. A directory with no `summary.json` is dropped, so `--packet` can no
  longer pick a crashed run and throw on the missing file. With no `stamp` the
  original name-only behaviour is byte-identical, and that is asserted.
  `--packet` also now accepts `--run`/`--out`/`--into` to name a directory
  outright, and derives the draft date from the run's own `ranAt` when the name
  carries none. RED: with the dated-only filter restored, 36 pass / 2 fail.

## Gates

```
npm run lint                                   exit 0, no output
node --experimental-strip-types tests/core/llm-generator-schema.test.ts
                                               17 pass / 0 fail  (was 9)
node --experimental-strip-types tests/scripts/story-bench.test.ts
                                               38 pass / 0 fail  (was 30)
node --experimental-strip-types tests/core/openai-compat-generation-guards.test.ts
                                               22 pass / 0 fail
node --experimental-strip-types tests/core/brain-coverage.test.ts
                                               7 pass / 0 fail
npm run check-no-console                       OK, 307 files
npm run check-server-reachability              OK
npm run honesty-audit                          clean (465 + 520 + 118 rows)
npm run check-docs                             clean
npm run check-brain                            OK, 118 notes, 468 links, fresh
node scripts/check-scoring-receipt.mjs origin/main..HEAD
                                               no scoring-path files changed
npm run test:ci-env -- <the three files>       77 pass / 0 fail   <- corrected: the closure section transcribed this as 62; the command gives 77 (17+38+22)
npm run build                                  exit 0, built in 1.83 s
npm test                                       exit 0 — 14,088 tests,
                                               13,996 pass / 0 fail,
                                               91 skipped, 1 todo,
                                               2,452 suites, 628.5 s
```

The full suite reconciles exactly against the reviewer's baseline of
14,072 / 13,980 / 0 / 91: **+16 tests, +16 passing, +2 suites**, which is the
8 assertions added to each of the two test files and one new `describe` block in
each. No test was removed, skipped or loosened.

## One correction to the reviewer's closing note

**`data/story-bench/` DOES exist in this lane's worktree**, and both run
directories are intact — `2026-09-13` and `2026-09-13-run2`, with every
`.final.fountain`, `.doctor.json`, `.calls.json`, `.row.json`, `summary.json`
and `server.log`. The reviewer's machine had lost them; this one had not. Every
§5 and §5b line-and-file claim listed as unverifiable above was therefore
checked, and all of them reproduce except the "57 lines" miscount, now fixed.
That does not weaken the reviewer's point — the artifacts are gitignored, live
only here, and will go with the next sandbox rebuild — so the recommendation
stands and is the strongest single thing the next round could do: commit a
bounded, redacted evidence file beside the numbers the bench publishes. It is
still recorded as undone in §7 item 4 rather than claimed.

---

# ROUND 3 RE-CHECK — the reviewer's ruling

**Tip line — reviewed object:** `lane/story-bench` @ **`19fd20d2`**
("docs(audit): round-3 closure of the nine items, appended below the reviewer's
text"), on `origin/main` `91c369c5`. Round 3 is `06dfad70..19fd20d2`, four
commits (`95f03b3d`, `d3f4a113`, `72b0fc99`, `19fd20d2`).
**Worktree:** a FRESH one, `<session scratch>/wt-sb-r3`, detached at `19fd20d2`
— not the round-2 tree.
**Reviewer:** the same one who returned REVISE at `2a0546ff` and wrote
everything above the round-3 closure section.

**My text above is unedited.** `git diff 06dfad70..19fd20d2 --
docs/audits/2026-09-13-story/story-bench-review-round2.md` contains **zero `-`
lines**: 318 insertions, 0 deletions, all below my last line.

**Verdict: MERGE.** All nine items are closed, and I checked each one by
running something rather than by reading the closure table. Two of them are
closed better than I asked for. One thing I must correct first, because it is
mine.

---

## 0. I was wrong about the artifacts, and the reason matters

My round-2 note said `data/story-bench/` "does not exist on this machine", that
both run directories "were lost with the sandbox", and that every line-level
claim in §5b was "unverifiable by me and now cannot be" checked. **All three
statements are false, and the record should carry the retraction louder than it
carried the claim.**

`/home/user/wt-story/data/story-bench/` holds `2026-09-13` (29 files) and
`2026-09-13-run2` (35 files), complete. Nothing was lost.

The lane's closure section is generous about it — "the reviewer's machine had
lost them; this one had not" — and that explanation is also wrong, in a way
worth fixing so the next lane does not inherit it. **It is the same machine.**
`data/` is gitignored, so it is not shared between worktrees and does not travel
with a branch; the bench writes to `<the worktree it ran from>/data`. The lane
ran from `/home/user/wt-story`; I reviewed from a worktree of my own and looked
in `/home/user/STORYMACHINE/data`, which never held them. That is a reviewer
error — I checked one path and reported a sandbox rebuild — not a durability
event. The §7 durability argument I drew from it is still right on its own
merits, but it was not evidenced by this, and I should not have said it was.

**I then re-verified, from the artifacts, every specific claim the coordinator
named and several more.** All reproduce, exactly:

| claim | file | result |
|---|---|---|
| v1 HARBOR LIGHTS: `event_0` at 25 and 29 | `2026-09-13/harbor-lights.final.fountain` | **both**, verbatim ("the scene holds event_0", "As event_0 lingers") |
| v1 HARBOR LIGHTS: six cues at 4/8/11/14/17/20 | same | **TOMAS, NELL, DRU, KAI, FATHER_ORR, MAYOR_LOCK**, in that order |
| v1 HARBOR LIGHTS: line 27 is not a sentence | same | `Silence thick here.` |
| v1 COUNTERWEIGHT: 17 lines, ends on `event_0` | `2026-09-13/counterweight.final.fountain` | line 17 is the last line: `Scene contains event_0, plain and undeniable now.` |
| `event_0` three across the run, two in HARBOR LIGHTS | all six v1 finals | harbor-lights **2**, counterweight **1**, other four **0** — the round-1 LOW 7 correction is right |
| v2 UNDERSTUDY: 101 lines | `2026-09-13-run2/the-understudy-clause.final.fountain` | **101** |
| v2 UNDERSTUDY: `id 2/3/4` as clue text at 25/36/55 | same | **all three**, same template sentence |
| v2 UNDERSTUDY: the clock line at 27/38/53 | same | **all three**, each reading "before the id 2 reaches its final hour" |
| v2 UNDERSTUDY: `ALEX lunges.` at 76 | same | exact |
| v2 UNDERSTUDY: two invented scenes from 59 | same | `INT. ARCHIVE ROOM - NIGHT` (59), `INT. THEATER LOBBY - NIGHT` (80); committed three at 1/31/44 as SCENE 0/3/5 |
| v2 HARBOR LIGHTS: 64 lines, cues at 4/7/16/20/24/27 | `2026-09-13-run2/harbor-lights.final.fountain` | **exact**, same six names |
| v2 HARBOR LIGHTS: `PROTAGONIST` 37, `Alex` 58 and 60 | same | exact — "Alex states purpose…", "Alex actual purpose…" |
| v2 HARBOR LIGHTS: `c3` 30, `c4` 32, `c5` 56, `event_1` 48, `tensionClock1` 64 | same | **all five** |
| the readout writer kept 5 keys in v1 and 8 in v2 | both `counterweight.doctor.json` | v1 `{health, verdict, sceneCount, contentHash, topFindings}`; v2 adds `verdictMeaning`, `excerptNote`, `pageEstimate` |

The one thing the lane reports as not reproducing — "three times in 57 lines" —
I also checked. The three clock lines are 27, 38 and 53, all inside the
committed portion the document itself calls "lines 1–57", so the old phrasing
was defensible rather than a miscount; the new text ("lines 27, 38 and 53 of a
101-line script") is strictly better because it is checkable, and the lane
marked its own sentence harder than it needed to. No issue.

**And the derivation, which round 2 could only defend with column arithmetic, I
have now verified end to end.** `renderTable(rowsFromDir('2026-09-13-run2', <the
six fixture ids>))` run against the real row files reproduces the committed v2
table of `STORY_BENCH_2026-09-13.md:442-449` **cell for cell, all six rows and
thirteen columns.** The committed table is the rendering of the row files.

---

## 1. The nine items

| # | my round-2 item | **ruling** |
|---|---|---|
| 1 | delete the false "the doctor never mentions the thinness" sentence | **CLOSED.** A repo-wide grep finds the sentence only inside *(Corrected in round 3)* markers quoting its former text, and in the round-1 review file (history). `STORY_BENCH:398` / `lane-report:392` now name `excerptNote` (`doctor.ts:904`, wired `:2308`) and `pageEstimate` instead, and the two `.doctor.json` key sets back the claim. The closure table also re-labels its own round-2 row as **"OVERSTATED IN ROUND 2"** rather than quietly fixing it, which is the right way to answer a false-report finding. |
| 2 | fix the surviving PASS sentence | **CLOSED.** `STORY_BENCH:350` / `lane-report:344` carry the correction with the same marker every other corrected paragraph has, and the replacement text is right: PASS is `health < 60`, the rejection verdict, and the number worth distrusting on that row is the five `INTENTION_INVISIBLE` findings, not the verdict. No longer contradicts §4. |
| 3 | test `rowsFromDir`, shown RED first | **CLOSED, and wider than I asked.** Four assertions in a real tmpdir: fixture order against a deliberately non-alphabetical `ORDER` (so a `readdir` glob could not pass by accident), one re-written row replacing exactly one row, absent rows skipped with a stray `.final.fountain` ignored, and `renderTable(rowsFromDir(...)) === renderTable(rows)`. **I re-ran my own mutation on the round-3 tree: `rowsFromDir` → `return []` now gives 34 pass / 4 fail.** See §2 for the full audit. |
| 4 | make the declared branches mirror `parseOp` | **CLOSED, and this is the best work in the round.** `minItems: 2, maxItems: 2` on `pair` (`llm-generator.ts:309`), `minItems`/`maxItems`/`minimum`/`maximum`/`minLength`/`maxLength`/`pattern` carried by the translator (`schema.ts:33`), and — the part that matters — `minimalInstance` (`llm-generator-schema.test.ts:57-88`), which synthesises each branch's own minimum from its `required` list, property types, enums and array bounds. I attacked it specifically; see §3. |
| 5 | close the `EMOTION` branch and the NaN path | **CLOSED, pinned at both ends.** The branch requires all nine non-optional `EmotionState` fields (`anger_target_id` declared, not required), `dominant` and `BELIEF.source` are enums, and `parseOp:94-97` independently rejects a partial. See §4 for the independence proof and for the check that the debt assertion really reaches `quality/index.ts:495`. |
| 6 | one number, one name, in the packet | **CLOSED, driven.** `scenesLabel` (`story-bench.mjs:945`) renders `"N of M scenes committed"` from the same fields `renderTable` uses; the packet header prints it **and** names the doctor's count separately; the front matter gains **TWO SCENE COUNTS, AND WHICH ONE IS AUTHORITATIVE**. I read the regenerated `packet.fountain` in the run directory: all six headers carry both numbers. |
| 7 | the "counts one improvement five times" caveat | **CLOSED.** `STORY_BENCH:472` adds **"COUNT THE ROWS OF THIS TABLE AS ROUGHLY TWO MOVEMENTS, NOT NINE"**, with the AUC 0.938 / 0.076 reasoning, the grouping of the four schema-fix views into one, and the flat sentence *"Nothing in this table is evidence that any script got BETTER."* The understudy 71.9-on-sceneCount-5 connection I said was never made is now made, with the five slugline line numbers, which I verified in the artifact. One residual, non-blocking: see §6. |
| 8 | bring the brain and Decision #8 to round 2 | **CLOSED, thoroughly.** Both brain notes and `DECISION_LOG.md:901` now say `getGenerativeProvider()` with the reason; "15 assertions" → "22 assertions as shipped"; a new **THE SCHEMA DEFECT** section in `Generation - Story Bench` carrying 74-of-74, the `anyOf` fix, round 3's two branch fixes and the v2 numbers; both `sources` lists extended with `llm-generator-schema.test.ts` and `schema.ts`; both `updated: 2026-09-18`. `check-brain` fresh at 118 notes / 468 links, `brain-coverage` 7/0. |
| 9 | the three slips and the `--packet` gap | **CLOSED, 4 of 4.** `"two premises"` is gone from `story-bench.mjs` (both docs say three, which the artifacts support). `STORY_BENCH:676-688` re-words the `excerptNote` quote as a **v1** reading and says the number inside it is not a constant. `CLAIMS_REGISTER` rows 117/118 re-anchored to `:200` and `:494` — I opened both lines and they are the `it(...)` and the assertion. And `listRunDirs` takes a stamp: **driven, not asserted** — I created a `--out`-shaped `seam-fix` directory beside an older dated one and ran `node scripts/story-bench.mjs --packet`, which printed *"packet from seam-fix (the newest finished run of 2)"*. It also refuses a directory with no `summary.json`, so a crashed run can never be packeted. |

---

## 2. The mutation audit, re-run by me on the round-3 tree

The lane reports auditing 12 exported helpers and finding a second vacuous one
(`beatsToSceneTargets`). I did not take that on trust. I stubbed **every one of
the 13 exported functions** in `scripts/story-bench.mjs` in turn — each with a
degenerate return — and ran `tests/scripts/story-bench.test.ts` after each,
restoring between:

```
runDirName           37/1     classifyRun          31/7     renderTable      36/2
beatsToSceneTargets  37/1     scriptWordCount      37/1     scenesLabel      37/1
castGroundingOps     37/1     rowsFromDir          34/4     packetFrontMatter 35/3
parseLogLine         37/1     nextRunDir           35/3
summariseCalls       37/1     listRunDirs          34/4
```

**All 13 go RED.** No exported helper is vacuous, including `scenesLabel`, which
this round added. (The lane counted 12; there are 13 with `scenesLabel`.)

**The vacuous-forEach sweep, extended past the helpers as asked.** Every
loop-driven assertion in the three lane test files was checked for a
zero-iteration hole:

- `for (const kind of SCHEMA_OP_KINDS)` (two `it`s, accumulate-then-`deepEqual`)
  — I stubbed `SCHEMA_OP_KINDS` to `[]`: **15 pass / 2 fail.** Not vacuous.
- `for (const q of bench.RUBRIC)` — I stubbed `RUBRIC` to `[]`:
  **37 pass / 1 fail.** Not vacuous.
- `for (const p of FIXTURE.premises)` (four `it`s) — the count is pinned at
  `tests/scripts/story-bench.test.ts:57`, `assert.equal(FIXTURE.premises.length, 6)`,
  so an emptied fixture fails loudly there.
- `for (const branch of opBranches())` — `opBranches()` asserts `Array.isArray`,
  and the branch count is pinned to `SCHEMA_OP_KINDS.length` in the translator
  test, which is itself pinned to the 14-key `STORY_OP_KINDS`.
- The `[status, body, expect]` loop in the guards file and the `['ADD_FACT', …]`
  loops iterate literal arrays.

No vacuous assertion remains in the lane's tests.

---

## 3. The minimal-instance synthesiser, attacked

This was the thing to be most suspicious of, because an exhaustive-looking
generator that is not actually driven by the declaration is worse than the
hand-written instances beside it. It holds.

**It is genuinely declaration-driven.** I changed one branch's declaration —
`RECORD_VISUAL_FACT`'s `fact` from `S` to `N`, i.e. the schema now promises a
number where `parseOp` requires a string — and the test failed with the
synthesised payload printed:

```
branches whose own minimum parseOp rejects:
  RECORD_VISUAL_FACT {"op":"RECORD_VISUAL_FACT","sceneId":"x","fact":0}
```

The payload **changed with the declaration** (`fact: 0`, not `'x'`), and the
hand-written `INSTANCES` test stayed green through it — which is precisely the
gap the synthesiser exists to cover.

**No branch can be silently skipped.** The loop runs over `SCHEMA_OP_KINDS`,
`branchFor(kind)` asserts a branch exists for each, and a separate `it` pins
`SCHEMA_OP_KINDS` set-equal to `STORY_OP_KINDS`'s fourteen. Emptying
`SCHEMA_OP_KINDS` fails (above). So "all 14 exercised" is enforced, not assumed.

**The synthesis rules are the right ones.** Enum → first value; `anyOf` → first
branch; object → *only* the `required` keys, recursing (an optional property is
by declaration omittable, so the minimum omits it); array → `minItems` copies,
**defaulting to zero when unbounded** — which is exactly what produced the
`pair: []` that caught `SHIFT_RELATIONSHIP`; number → 0; string → `'x'`.

**RED, four ways, each un-fix applied alone and restored** (17/0 when fixed):

| un-fix | result | lane's recorded number |
|---|---|---|
| `pair` bound removed | **14 / 3** | 14 / 3 ✔ |
| `EMOTION` back to `required: ['dominant','intensity']` | **14 / 3** | 14 / 3 ✔ |
| the whole `CONSTRAINTS` block removed from the translator | **15 / 2** | 15 / 2 ✔ |
| `parseOp`'s emotion check removed, schema left strict | **16 / 1** | — (mine) |

**The not-carried set is a deliberate, defensible line.** `format`, `default`
and `propertyOrdering` are dropped, and that is pinned hard:
`assert.deepEqual(dropped, { type: 'string' })` — a strict equality, so anything
that starts leaking through fails. `propertyOrdering` is not a JSON Schema
keyword at all; `default` is rejected by strict structured-output decoders; and
I re-grepped every `responseSchema` in `server/` (`llm-generator.ts`,
`nvm/live/intent-parser.ts`, `engine/Agent.ts`, `engine/agent/memory.ts`,
`engine/agent/decision.ts`, `engine/DirectorNode.ts`, `routes/scriptide.ts`) —
**no caller declares any of the three**, and the only caller of a newly-carried
keyword is `IR_SCHEMA`'s `pair`. Nothing else is still being silently dropped.

---

## 4. The NaN invariant, pinned at both ends

**The parser check is independent of the schema.** I removed only
`parseOp`'s new check (`llm-generator.ts:94-97`) and left the branch's nine
`required` fields in place: **16 pass / 1 fail**, the failure being *"parseOp
rejects a partial EmotionState even when the schema is bypassed"*. So the
invariant survives a caller that hand-rolls an op or a decoder that ignores
`required` — which is the whole point of enforcing it twice.

**The positive assertion really reaches `quality/index.ts:495`.** It is not a
stub: the test parses a real appraisal (`distress: 70, fear: 60`), applies it
through the **real** `applyStoryOp` (`server/nvm/ops/dispatcher.ts`) onto a real
`emptyState()`, and calls the **real** `computeArcDebt`
(`server/nvm/quality/index.ts:478`) — whose loop at `:494-495` is the
`(emo.fear + emo.distress) > 100` comparison. 70 + 60 = 130 with no
relationships, so the peak-distress debt fires and the assertion matches on its
text. The line is genuinely exercised, in both directions.

One consequence worth stating rather than hiding, and the lane does state it:
`parseOp` is now stricter, so a model that returns an `APPRAISE_EMOTION` without
`last_updated_at` loses that op entirely instead of committing a half-formed
emotion. That is the correct direction — a dropped op is visible in
`llm_generator_partial_parse`, a silently-failing debt check is not — and it is
a deliberate yield-for-correctness trade, not an accident.

---

## 5. Gates — my numbers, on `19fd20d2`

```
npm run lint                                    exit 0, no output
tests/core/llm-generator-schema.test.ts         17 pass / 0 fail   (was 9)
tests/scripts/story-bench.test.ts               38 pass / 0 fail   (was 30)
tests/core/openai-compat-generation-guards.ts   22 pass / 0 fail   (unchanged)
npm run check-no-console                        OK, 307 files
npm run honesty-audit                           clean (465 + 520 + 118 rows)
npm run check-brain                             OK, 118 notes, 468 links, fresh
tests/core/brain-coverage.test.ts               7 pass / 0 fail
npm run check-docs                              clean
check-scoring-receipt origin/main..HEAD         no scoring-path files changed
npm test                                        exit 0 — 14,088 tests,
                                                13,996 pass / 0 fail,
                                                91 skipped, 1 todo,
                                                2,452 suites, 356.5 s
npm run test:ci-env -- <the three lane files>   77 pass / 0 fail
```

Against my round-2 baseline of 14,072 / 13,980 / 2,450 suites that is exactly
**+16 tests, +16 passing, +2 suites**, with **skipped unchanged at 91 and todo
unchanged at 1** — which reconciles to the 8 assertions and one `describe` added
to each of the two files. The lane's own recorded figures match mine digit for
digit.

**The delta is additions only.** `git diff 06dfad70..19fd20d2 -- tests/` deletes
**zero** `it(` lines and **zero** `assert.` lines. `it(` counts: schema 9 → 17,
bench 30 → 38, guards 18 → 18. No `.skip`, `.only` or `.todo` anywhere in the
three files. Skipped stays 91 and todo stays 1 against my round-2 baseline, so
nothing was parked.

**The bench was NOT re-run, and this is provable rather than asserted.** In
`2026-09-13-run2/`, every generated artifact — all six `.final.fountain`,
`.doctor.json`, `.calls.json`, `.row.json`, plus `summary.json`, `table.md` and
`server.log` — still carries its **2026-09-14 00:50** mtime. Only
`packet.fountain` and `packet.pdf` are newer (**2026-09-18 01:17**), which is
`--packet` regenerating the reading packet from the existing run. `--packet`
spends no generation and touches no provider.

**Security and hygiene, re-checked on this tree.** No `console.` added under
`server/**` in the round-3 diff and `check-no-console` passes; a repo-wide grep
for key-shaped strings finds only the deliberately fake one in the pre-existing
`tests/routes/safe-error.test.ts`; `git ls-files data/` returns only the CC0
screenplay corpus, so nothing generated is committed and `.gitignore:41`'s bare
`data/` still covers `<date>`, `-runN`, `--out` and `--into` alike; the keyless
run still prints *"Nothing was measured. This is not a result."* and exits **2**;
no route was added or changed, so no limiter or zod surface is touched; nothing
in the bench lets a model score anything.

---

## 6. Two notes for the record, neither blocking

1. **The bigger scene-count gap is in the packet but not in the method doc.**
   `nine-minutes-of-tape` committed **4 of 7** and the doctor scored it on a
   `sceneCount` of **9** — five headings a revision pass typed, which I
   confirmed in the artifact (`INT. ARCHIVE ROOM - DAY` 1, `- NIGHT` 25,
   `EXT. RAIN-SLICK ALLEY` 44, `INT. VAULT CORRIDOR` 65, `INT. SERVER ROOM`
   78/92/107, `INT. ARCHIVE ROOM - DAWN` 145, `INT. VAULT` 182). Three of the
   six v2 rows are inflated this way: 3→4, 3→5 and **4→9**. The regenerated
   packet names all three, and §4b states the mechanism and illustrates it with
   the 3→5 case; a reader of the method doc alone would think the understudy row
   was the worst instance when it is the smaller one, on the row carrying the
   run's second-highest health and its only DEGRADED label. One clause in the
   §4b paragraph would fix it. I am not holding the merge for it — the artifact a
   human actually scores from carries the number.
2. **One gate figure in the closure section is mistyped.** It records
   `npm run test:ci-env -- <the three files>` as **62 pass**; I ran the same
   command and got **77 pass / 0 fail**, which is 17 + 38 + 22 and is the number
   that reconciles. The true figure is higher and nothing failed, so this is a
   transcription slip in a gate log, not a claim about behaviour — but in a lane
   whose subject is accurate counting it should be corrected the next time that
   file is touched.
3. **My round-2 closing note stays in the record, wrong, with this retraction
   under it.** That is the correct handling — a reviewer's text is not edited
   after the fact — but anyone quoting "the artifacts are gone" from above
   should read §0 first. The underlying recommendation (commit a bounded,
   redacted evidence file beside the published numbers) still stands on its own
   merits; it simply was not evidenced by what I claimed evidenced it.

---

## VERDICT: MERGE

Nine of nine closed. Items 3, 4 and 5 are closed with mechanisms rather than
edits — a mutation-audited helper set, a declaration-driven minimal-instance
synthesiser that I proved changes with the declaration, and an invariant
enforced independently at the schema and at the parser — which is the difference
between fixing three findings and making that class of finding harder to create.
Items 1, 2, 7, 8 and 9 are closed in the documents with correction markers, and
the lane re-labelled one of its own round-2 rows as overstated rather than
letting it stand, which is the behaviour that makes a closure table worth
reading at all.

The two things I got wrong in round 2 are corrected above: the artifacts exist,
and every §5/§5b claim I called unverifiable reproduces against them. The
committed v2 table is now verified as the literal rendering of the committed row
files, cell for cell, which was the last thing round 2 could only defend by
arithmetic.

Nothing in this round is blocking. The next lane's questions are unchanged and
are the lane's own: 16 of 45 scenes committed, 17 IntentionalProof blocks
because the model invents its cast, and no raw completion kept.
