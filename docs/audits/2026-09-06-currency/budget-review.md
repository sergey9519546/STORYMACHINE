# Independent review — the guard's double parse + a per-analysis wall-clock budget (`adce4325`)

## Round 1

**Reviewer:** independent (I am the reviewer who ran the cue guard's seven rounds and wrote the
§7.7 note this lane was commissioned from). **Worktree:**
`/home/user/STORYMACHINE/.claude/worktrees/agent-ab1d694d3beb187a4`, one commit `adce4325` on
`main@2bfcbf9d`, 15 files +1097/−27 (tag `audit/2026-09-06/budget-round1`). Reviewed from a
`git archive adce4325` export (`<session scratch>/sf2-review/budget`, `node_modules` symlinked,
local `git init` for the fixture tests); the worktree was never built or booted in. Every server I
started is killed (`pgrep -af server.ts` shows only `/home/user/STORYMACHINE`, another lane's).
Box load average ≈5.2 throughout, so my absolute ms are pessimistic; all comparisons are same-box.
Probes/logs: `.../sf2-review/B-*.log`, `bud-nofire.mjs`, `B-conc.mjs`.

**Verdict: REVISE** — one substantive item. The mechanism is well-built, the STOP on item 1 is
correct and I verified both of its seams independently, the derivation reproduces to within 1%, and
the browser step is real. But the one registered sentence renders in a state where it is **not
true**, and I measured six legitimate requests receiving it.

---

## 1. Brief-vs-diff

| # | Brief item | Status | Evidence |
|---|---|---|---|
| 1 | Make the guard's parse reusable **or**, if reuse needs the analyzer's entry, **STOP and report the seam** | **STOPPED — correctly, and the escape clause was the brief's own** | `server/lib/validation.ts` comment-only change (the old "a real, available option … DEFERRED" paragraph replaced by a `2026-09-06 FOLLOW-UP` block with both seams and the three timings). I verified both seams myself: §2. |
| 1a | stale-parse test | **SKIPPED, declared** | No memo exists; the report names this as a skip and says a future memo owes the test. Correct call — a test over an absent cache cannot fail (LANE_STANDARD §3). |
| 2a | Decision #7 in the log's format | **DONE** | `docs/DECISION_LOG.md` (+149): Context / Question / three Options with rejections / Decision / derivation / what the writer sees / Rationale / What this does NOT decide / Evidence. Fidelity checked in §5. |
| 2b | configurable budget in the pool, cancel like Cancel, honest registered sentence, typed error, must not fire on the corpora | **DONE** (one truthfulness defect, §4) | `server/lib/doctor-budget.ts` (new leaf: `doctorAnalysisBudgetMs()`, sentence, `DoctorAnalysisBudgetExceededError` with `status = 400` and a name-**and**-prototype recognizer); `server/nvm/analyze/doctor-pool.ts:armAnalysisBudget/clearAnalysisBudget/onAnalysisBudgetExceeded` (queued job spliced out of the FIFO; running job cancelled exactly as `dispatch()`'s `onAbort` does — detach listener, clear `slot.active`, `setBusy(false)`, `dropSlot`, `terminate()`, reject, `pump()`); timer cleared on every settlement path because `resolve`/`reject` are wrapped. |
| 2c | README row, brain note, register row | **DONE** | README env row (default `30000`, `0`/`off` disables, names the in-process carve-out); `docs/brain/Decisions/Decision 7 - …md` + a section in `Surface - Script Doctor Panel.md`; `docs/CLAIMS_REGISTER.md` row 72 quotes the sentence verbatim. |
| 2d | unit + route + browser tests, fail-first | **DONE** | `tests/core/doctor-analysis-budget.test.ts` **16/16**, `tests/routes/doctor-analysis-budget.test.ts` **3/3**, `tests/core/doctor-worker-pool.test.ts` **9/9** — all re-run by me. Browser step driven end to end by me: §6. |
| — | no scoring-path change; no `console.*`; limiters/zod intact | **DONE** | §3, and `server/app.ts`'s branch is additive; every route keeps its limiter. |

---

## 2. Item 1's STOP — I checked both seams rather than accepting them

**SEAM 1 (signature) is real and decisive.** `scripts/check-scoring-receipt.mjs:231-235` lists
`server/nvm/analyze/doctor.ts`, `emotional-arc.ts` and `fountain-analyzer.ts` as ALWAYS-SCORING by
**exact path** — no import-graph escape. Every reuse shape the brief offered changes
`analyzeFountainText(fountain: string)` or `runScriptDoctor`'s signature, i.e. edits one of those
files, i.e. demands a measurement receipt for a change that moves no number.

**SEAM 2 (realm) is the one that settles the arithmetic — and it reproduces.** I ran the lane's own
`measure-guard.mjs` against the export (860,417-char accepted ceiling payload, 3 runs, load ≈5.2):

```
guard fountainShapeRejectionReason (ACCEPT)    90.4, 75.7, 69.1 ms   (lane: 68.6–75.3 quiet / 96.9–111.5 loaded)
normalizeScreenplay + parseFountain alone      26.7, 26.5, 26.8 ms   (lane: 26.3–28.5)
structuredClone(blocks)  [postMessage cost]    28.0, 26.6, 21.5 ms   (lane: 21.6–26.1)   blocks=27,393 · 2,645,392 bytes
```

Transport is **80–105%** of the parse it would replace, on my box as on theirs. The conclusion
holds. One honest nuance the report does not mention: the same probe prints
`JSON.stringify(blocks)` at **6.4–7.8 ms**, so a leaner hand-rolled transport is not obviously as
expensive as structured clone — but the receiving realm still has to materialize it, and SEAM 1
alone is disqualifying, so this does not change the answer. Worth one sentence in the comment so a
future reader does not re-derive it from the structured-clone number alone.

---

## 3. The receipt-gate claim — verified by computing the set, not by reading the message

`node scripts/check-scoring-receipt.mjs main..HEAD` → exit 0, *"no scoring-path files changed"*. I
then ran the gate's own `computeReachableSet(root, ['server/nvm/analyze/doctor.ts'])` directly:

```
reachable set size = 67
not in set   server/nvm/analyze/doctor-pool.ts     <- the file this lane changed most
not in set   server/lib/doctor-budget.ts · server/app.ts · server/routes/scriptide.ts · server/lib/validation.ts
sanity (must be in): fountain-analyzer.ts ✓ · screenplay-normalizer.ts ✓ · src/lib/fountain.ts ✓
lane set 67 vs main set 67 — identical = true
```

So `doctor-pool.ts` is genuinely outside `doctor.ts`'s import graph (`doctor.ts` mentions the pool
only in a comment; the edges run the other way), the always-scoring tiers do not cover
`server/nvm/analyze/` wholesale (only three exact files plus `calibration/` and `revision/passes/`),
and **nothing this lane added pulled a new file into the graph** — the two sets are byte-identical.
The gate's silence is correct, not a miss. `check-doctor-output-identity` (baseline `main@2bfcbf9d`
→ this tree, both generated by me): **45/45 byte-identical**.

---

## 4. BLOCKER-shaped finding — the registered sentence is false in the queued case, and I measured it

The budget is armed at **submission**, deliberately (queue time is the writer's wall clock — I agree
with that choice). But queued and running failures reject with the *same*
`DoctorAnalysisBudgetExceededError`, so they render the *same* sentence:

> "This draft took longer to analyze than this server's per-analysis budget (30s), so the run was
> stopped and nothing was scored. Try again, or split the draft into shorter files and analyze them
> separately."

Driven against the lane's own build (`B-conc.mjs`, server on port 39491, default budget, default
2-worker pool, each request a **distinct** 346 KB feature — 400 distinct cues × 15 occurrences,
solo cost **1.7–3.2 s**, comfortably legitimate and ~10× inside the budget):

```
 6 concurrent   6/6 scored, slowest 10,872 ms
20 concurrent  20/20 scored, slowest 23,398 ms
36 concurrent  36/36 scored, slowest 27,236 ms
60 concurrent  54/60 scored — 6 rejected: HTTP 400 in ~34,455 ms with the sentence above
```

Sixty requests is half of `gameLimiter`'s own 120/min allowance, from one IP, with no oversized
draft anywhere. For those six writers every clause of the sentence is wrong or unhelpful: the draft
did **not** take longer than the budget (it takes ~2 s and never ran); "split the draft into shorter
files" does not address the real cause; only "Try again" is right, and it is right for a reason the
sentence does not give. LANE_STANDARD §2's last bullet is explicit — *a sentence that promises
something must be true in every state that renders it* — and this is a newly **registered** claim
(row 72), i.e. the ledger the honesty audit exists to protect.

The distinction is already computed: `onAnalysisBudgetExceeded` logs `state: 'queued'` vs
`'running'` (`doctor-pool.ts`) and then throws away that fact. Carrying it into the error gives a
second registered sentence for the queued case at no structural cost.

**And it settles the status question (brief item c).** I read the alternative in Decision #7 — *"a
5xx was considered and rejected because it invites a blind retry of what is, for the same draft on
the same server, a deterministic outcome."* That reasoning is **right for the running case** and
**wrong for the queued one**: a queued rejection is not deterministic, retrying later is exactly the
correct client behaviour, and 503 (optionally with `Retry-After`) is the status that says so. It
also matters operationally: today six contention failures are indistinguishable, in logs and in any
status-code dashboard, from client errors. My judgement:

- **running past the budget → 400** — keep it. It matches the guard's own analysis-cost 4xx
  (`MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT`) and 413's precedent that "this input is beyond what this
  server will process" is a 4xx.
- **rejected while still queued → 503** with its own sentence naming contention, not the draft.

---

## 5. Decision #7 read for fidelity to the numbers

Faithful. It quotes the round-7 review's 12,340/13,566 ms and its own 13,765 ms, states the 2×
headroom, the `DOCTOR_POOL_PREWARM_TIMEOUT_MS` coincidence and the 120 s panel watchdog, says
plainly that the default is **not** tight enough to reject the ~14 s document and why that is the
point, and lists what it does not decide — including, in as many words, that arming at submission
leaves pool **sizing** unanswered. §4 is the consequence of that acknowledged gap reaching the
writer, not a contradiction of the entry.

I re-ran the lane's own `worst-case3.mjs` on the export (load ≈5.2):

```
600 × 15  → 11,221 ms ACCEPT   (lane 11,291)
700 × 15  → 12,211 ms ACCEPT   (lane 12,722)
750 × 15  → 13,382 ms ACCEPT   (lane 13,231)
800 × 15  → 13,853 ms ACCEPT   (lane 13,765)   <- the derivation's anchor, reproduced within 1%
700 × 15 + 50 frequent × 60 → guard REJECTS (cue weight), as claimed
```

No-fire table, re-measured independently (`bud-nofire.mjs`, in-process `runScriptDoctor`):
54 tracked fixtures slowest **132 ms** (`data/screenplays/chain-of-custody.fountain` — the lane's
120–127 ms), 20 calibration samples slowest **20 ms**, P0 sample **0 ms**. Nothing legitimate comes
near the default; the committed test asserting each against **half** the default is the right
ratchet.

---

## 6. The browser step — driven, not read

`node scripts/smoke-p0-live-flow.mjs` on the export: **PASS**, including

```
[smoke-budget] booting keyless server on port 39657 …
[smoke] budget-stopped run renders the registered sentence, with an enabled Retry (0 console errors)
[smoke] recovered after a budget-stopped run: report rendered against the shipped budget.
```

It boots a genuine second server with `DOCTOR_ANALYSIS_BUDGET_MS=1` (the pool really terminates a
worker; not a route stub), asserts the registered sentence and an **enabled** Retry, then proves a
real report renders afterwards. One wording caveat for the report: "recovers" is demonstrated by
pointing the same browser at the *shipped-budget* server, not by clicking Retry on the 1 ms one
(where it would deterministically fail again). That is the sensible thing to assert — it just is
not literally "recovers on Retry".

---

## 7. Everything else I checked

- **`server/app.ts` (+26)** is one branch in the existing global error handler, placed above the
  generic 4xx passthrough with the reason written down (that branch would answer
  `{error:'Malformed request'}`, replacing the registered sentence with a false one). It fires only
  for this error class (name **and** prototype recognizer, so a duplicated module instance cannot
  silently disable it), logs `warn` with `budgetMs`/method/path, and pulls no analyzer module graph
  in (`doctor-budget.ts` imports nothing). It does not otherwise touch any route.
- **`server/routes/scriptide.ts` (+14)**: the SSE route cannot send a status after flushing headers,
  so it emits the identical sentence in the `doctor_error` frame the client already renders. Correct
  and minimal — and it inherits §4's copy defect verbatim.
- **`src/**` unchanged**, as claimed; the panel's existing error state does the rendering (proven in
  §6, not assumed).
- **Carve-out declared**: no budget on the in-process path (deep read, `DOCTOR_WORKER_POOL=off`),
  because `runScriptDoctor` is a synchronous CPU loop with nothing to terminate — the same carve-out
  Cancel has, written at the mechanism, in the README row, in Decision #7 and in the brain note. The
  unit tests **skip** rather than silently pass when the pool is unavailable (16 pass / 0 skipped
  here, so the pool ran).
- **Gates I re-ran** (foreground, exit codes): `check-scoring-receipt main..HEAD` **0**;
  output-identity **45/45 byte-identical**; `doctor-analysis-budget` unit **16/16**, route **3/3**;
  `doctor-worker-pool` **9/9**; `smoke-p0-live-flow` **PASS**. Not re-run per the budget: full
  `npm test` (lane reports 12,947 tests / 0 fail), `lint`, `check-docs`, `honesty-audit`,
  `fuzz-routes`, `verify:surfaces`, the eight-suite battery.

---

## 8. Verdict

**REVISE**, on item 1 below. Items 2 and 3 are non-blocking and can ride along. To be clear about
proportion: this is a careful lane — it stopped where the brief told it to stop and proved why with
numbers I reproduced, it left the scoring path untouched in a way I verified by computing the gate's
own reachable set, its derivation reproduces within 1%, and its browser step drives the real
mechanism rather than a stub. The one thing standing between it and MERGE is that the mechanism's
single writer-facing sentence is false in a state I can produce with sixty ordinary requests.

### The numbered list

1. **BLOCKER — the registered sentence (row 72) is untrue for a job rejected while still QUEUED,
   and 400 is the wrong status for that half.** Reproduce: boot the lane's build with defaults and
   fire 60 concurrent **distinct** 346 KB features (`node .../sf2-review/B-conc.mjs 60 400`) —
   each costs 1.7–3.2 s solo; **54 score, 6 are rejected at ~34.5 s** with *"This draft took longer
   to analyze than this server's per-analysis budget (30s) … split the draft into shorter files"*,
   which is false for all six (they never ran) and points at a remedy that cannot help. Sixty
   requests is half of `gameLimiter`'s own per-minute allowance. `onAnalysisBudgetExceeded`
   (`server/nvm/analyze/doctor-pool.ts`) already distinguishes `state: 'queued'` from `'running'`
   in its own `logger.warn` — carry that into `DoctorAnalysisBudgetExceededError` and give the
   queued case (a) its own registered sentence naming contention rather than the draft, and (b)
   **503** (optionally `Retry-After`) rather than 400. Decision #7's rejection of 5xx — "it invites
   a blind retry of a deterministic outcome" — is exactly right for the running case and exactly
   wrong for the queued one, where a retry is the correct behaviour and where a 400 also hides
   server contention inside client-error metrics. Keep 400 for the running case. Add a route test
   per case, and a line in Decision #7 recording the split.

2. **LOW — `docs/CLAIMS_REGISTER.md` row 72 pins the sentence with a literal `(30s)`** while
   `doctorAnalysisBudgetSentence()` renders whatever `DOCTOR_ANALYSIS_BUDGET_MS` is in force. An
   operator who raises the budget ships a sentence the register does not contain. One clause in the
   row's evidence cell ("the parenthetical renders the configured budget; 30s is the default") keeps
   the ledger accurate without weakening it.

3. **LOW — two wording corrections in the report/comment, both about claims I verified as
   *stronger* or *weaker* than stated.** (a) The p0-flow step proves recovery by navigating to the
   shipped-budget server, not by clicking Retry — say that, since "recovers" reads as the latter.
   (b) The `validation.ts` FOLLOW-UP block cites only `structuredClone` (21.6–26.1 ms) for transport
   cost; the same probe measures `JSON.stringify(blocks)` at **6.4–7.8 ms**, so the "transport is
   80–95% of the parse" line is true for the structured-clone path specifically. SEAM 1 is
   disqualifying on its own, so the conclusion does not change — but a future reader should not have
   to re-derive that the cheaper serialization was considered.

---

## Round 2 — re-check of `b8fb4b0b` (tag `audit/2026-09-06/budget-round2`)

**Same reviewer.** Reviewed from a `git archive b8fb4b0b` export
(`<session scratch>/sf2-review/budget2`, `node_modules` symlinked, local `git init` for the fixture
tests); the lane worktree was never built or booted in. `diff adce4325..b8fb4b0b` = 13 files
+762/−155. Every server I started is killed (what remains belongs to `/home/user/STORYMACHINE` and
another lane's worktree). Box load ≈5 throughout. Probes: `.../sf2-review/B2-conc.mjs`,
`B2-poolsize.mjs`, and the `B2-*.log` files.

**Verdict: MERGE.** Round 1's blocker is fixed at the root — the queued/running distinction the
pool already computed now drives the copy, the status, the header and the tests — and all three LOW
items are done. I re-ran my own burst probe, read the timer semantics for the two races the
coordinator named, and drove the Retry-After estimate end to end.

### 2.1 (a) The burst probe, re-run on the round-2 build — zero 400s

`B2-conc.mjs`, 60 concurrent **distinct** 346 KB features (400 distinct cues × 15 occurrences,
1.7–3.2 s solo), default 2-worker pool, default budgets, server booted from the export:

```
run 1:  N=60 wall=64,950ms   {"200":42,"503":18}   Retry-After values: 4,7,10,13,16,19,22,25,29,32
run 2:  N=60 wall=65,483ms   {"200":44,"503":16}   Retry-After values: 3,6,9,12,14,17,20,23,26
        zero 400s in either run
```

(The lane measured 34/26 on its box; 42/18 and 44/16 here — same shape, quieter box.) The shed
requests now read:

> "This server is busy: your draft waited longer than the 60s it allows for a free analysis slot,
> so the run never started and nothing was scored. **Nothing is wrong with the draft** — try again
> in about N seconds."

Every clause is true for the state that renders it, which is exactly what round 1's finding asked
for. Row 73 registers it; row 72 keeps the running case.

### 2.2 (b) Timer semantics — both races are closed, by construction *and* by a guard

- **Can a job be shed as "queued" after `dispatch()` started it?** No, twice over.
  `pump()` is synchronous from `const job = queue.shift()!` to `dispatch(slot, job)` — no `await`
  between — so a pending timer callback cannot interleave; and `dispatch()` calls
  `clearQueueBudget(job)` as its fourth statement. Belt and braces: `onQueueBudgetExceeded` opens
  with `const queuedAt = queue.indexOf(job); if (queuedAt < 0) return;`, so even a
  fired-but-not-yet-run timer is a no-op for a job that has left the queue.
- **Can the run timer be armed for a job that never dispatched?** No — `armRunBudget` has exactly
  one call site, inside `dispatch()`.
- **Double-settle?** Both timers are cleared on every settlement path: the job's `resolve`/`reject`
  are wrapped in `clearAnalysisBudget(job)`, which clears both. The `poolDisabled` branch of
  `pump()` clears them before running in-process, so the carve-out cannot be shed by a timer either.
- **Does terminate-on-budget leave the pool healthy?** Measured (`B2-poolsize.mjs`, run budget
  forced to 60 ms, 10 consecutive real jobs):

```
10 forced RUN-budget kills → killed=10, other=0   (all with row 72's sentence, state:'running')
doctorPoolStatus().workers: 0 before, 0 after (slots are dropped, not eagerly respawned)
next ordinary submission: scored, 9,513 ms (includes a cold worker spawn), workers: 1 afterwards
```

So the pool is not left wedged and does not leak slots; it respawns lazily in `pump()` exactly the
way the pre-existing Cancel path leaves it. Honest consequence, recorded rather than raised: a kill
costs the **next** writer a cold worker spawn (~2–3 s of that 9.5 s), which nothing documents.

### 2.3 (c) Retry-After honesty — the estimate does not under-state

Drove the full loop (`SECOND_ROUND=1`, fresh payload salt so nothing is served from the doctor's
LRU): 60 concurrent → 16 shed with `Retry-After` 3–26 s; each shed request then retried **after
exactly its own advised delay**:

```
second round: {"200":16}  wall=28,752ms      — 16/16 served, zero second-round 503s
```

Nobody was told to come back too early. The estimate is `ceil((queued + busy) / poolSize) ×
meanJobMs` with an EWMA (α = 0.25) over completed jobs, seeded at 2 s, floored at 1 s and capped at
120 s — the cap is the right shape (past two minutes the advice stops being actionable) and the
floor prevents a `Retry-After: 0`.

### 2.4 (d) Decision #7's arithmetic checks out

The composition claim is right: a job admitted at 59.9 s of queue can then run 30 s → 89.9 s, inside
the panel's 120 s diagnosis watchdog with ~30 s of margin, and
`tests/core/doctor-analysis-budget.test.ts:103-115` pins both `CLIENT_DIAGNOSIS_WATCHDOG_MS =
120_000` and the sum, so a future raise of either budget fails CI rather than silently replacing the
registered sentence with the generic timeout copy. The entry now states plainly that 60 s does **not**
admit any burst, that shedding genuine overflow is the correct behaviour, and that the remedy for a
deployment that sheds too often is `DOCTOR_WORKER_POOL_SIZE` — the over-claim the lane wrote in its
own draft is gone, which is the right correction to have made unprompted.

### 2.5 (e) The `doctor-worker-pool` flake — pre-existing, and this lane cannot have caused it

The assertion is `secondMs < firstMs / 2` (`tests/core/doctor-worker-pool.test.ts:136`) — the
relative form adopted 2026-09-05 after the fixed 50 ms budget flaked. `git diff main..HEAD --stat`
for that file is **empty**: the lane never touched it. It passes **9/9 three times standalone** on
the round-2 tree here. And the mechanism cannot move that ratio: the LRU hit returns from
`runScriptDoctorOffThread` **before** the job object is built, so a cache-served submission arms no
timer at all. Accepted as a pre-existing, load-sensitive flake, exactly as reported.

### 2.6 (f) Gates, and my round-1 LOW items

```
node scripts/check-scoring-receipt.mjs main..HEAD  (both commits)   exit 0  "no scoring-path files changed"
check-doctor-output-identity  --compare main@2bfcbf9d ↔ this tree   PASS — 45/45 byte-identical
tests/core/doctor-analysis-budget.test.ts     20 pass / 0 fail / 0 skipped   (was 16)
tests/routes/doctor-analysis-budget.test.ts    5 pass / 0 fail               (was 3)
tests/core/doctor-worker-pool.test.ts (×3)     9 pass / 0 fail each
```

- **LOW #2 (register pinned to a literal `30s`)** — fixed: row 72's provenance cell now says "The
  parenthesised budget is NOT a literal" and names the function that renders the configured value.
- **LOW #3a ("recovers on Retry")** — fixed: `smoke-p0-live-flow.mjs:294-302` now spells out that it
  deliberately does not click Retry on the 1 ms server, because there a Retry would fail by
  construction and asserting otherwise would assert a falsehood.
- **LOW #3b (transport arithmetic)** — fixed: `server/lib/validation.ts:1612` now records the
  `JSON.stringify(blocks)` figure alongside the structured-clone one, so the "80–95% of the parse"
  line is no longer the only number a future reader meets.

Not re-run this round, per the budget: full `npm test` (lane reports 12,953/0 on the second run),
`lint`, `check-docs`, `honesty-audit`, `fuzz-routes`, `verify:surfaces`, the browser suites (round 1
drove the p0-flow budget step end to end and the mechanism's client path is unchanged since).

### 2.7 Verdict

**MERGE.** Round 1's finding is closed at the source rather than papered over: the pool's own
`state` now selects the sentence, the status, the header and the test, and the two states are
registered separately (rows 72 and 73). I could not produce a false sentence, a 400 for a queued
job, an under-stated `Retry-After`, a dispatch/shed race, or a wedged pool.

**Two things recorded for the log, neither blocking and neither in this lane's scope:**

1. **A shed writer still waits the full 60 s before being told to retry** — 62.9 s in my run, then
   "try again in about 26 seconds". That is inherent to wait-then-shed, and Decision #7 explicitly
   leaves sizing/admission control out of scope; but an admission check at submission (reject
   immediately when `ceil((queued+busy)/size) × meanJobMs` already exceeds the queue budget) would
   turn a 63 s wait into an instant, equally honest answer. Worth a line in the entry's "does not
   decide" list so the option is recorded rather than rediscovered.
2. **A run-budget kill leaves the pool with one fewer warm worker until the next submission**, so
   that writer pays a cold spawn. Same as Cancel's existing behaviour, and undocumented for both.

---

## Round 3 — re-check of `df31b73d` (tag `audit/2026-09-06/budget-round3`)

**Same reviewer.** Reviewed from a `git archive df31b73d` export
(`<session scratch>/sf2-review/budget3`); the worktree was never built or booted in (its merge gates
are running). Rebased base `main@da3db049`; rounds 1–2 replayed as `7152d8d2` + `b4bfabdd`.
`diff b4bfabdd..df31b73d` = 11 files +657/−36. Every server I started is killed. Box load ≈5.
Probes: `B3-ab.mjs`, `B3-respawn.mjs`, `B3-race.mjs`, and the `B3-*.log` files.

**Verdict: REVISE** — one item. The admission check does what it claims and I reproduced it; the
1.5× rule's bias direction is right and I computed its boundary; but the eager respawn **races
shutdown and leaves an orphan worker**, which I isolated with a clean A/B and which costs a clean
redeploy its exit code.

### 3.1 (a) The paired A/B, reproduced — twice per arm

`B3-ab.mjs` (wave A = 60 concurrent distinct features, wave B = 20 more fired 3 s later once the
pool is saturated), same box, same payloads, one binary changed:

| arm | served /80 | wave-B time-to-first-503 | wave-B 503 latencies |
|---|---|---|---|
| `DOCTOR_QUEUE_ADMISSION=off` run 1 | 37 (A 36 / B 1) | **63,580 ms** | 60.3–60.7 s |
| `…=off` run 2 | 34 (A 33 / B 1) | **65,472 ms** | 62.2–62.6 s |
| default (admission on) run 1 | 29 (A 29 / B 0) | **3,667 ms** | 0.39–1.4 s |
| default run 2 | 44 (A 44 / B 0) | **3,353 ms** | 0.13–0.31 s |

The headline claim is unambiguous and reproducible: a hopeless submission is answered in
**hundreds of milliseconds instead of a minute**, with the same 503, the same registered sentence
and a `Retry-After`. On served-count parity I can confirm the lane's "inside spread" reading, but
only because I ran each arm twice: the admission arm produced both the **lowest** (29) and the
**highest** (44) result of all four runs, so the between-run variance of one arm (15) exceeds any
between-arm difference. My first pair alone (37 → 29) would have read as a 22% throughput
regression. Recording all four numbers so nobody re-derives that scare from a single run — and
noting that "admission costs no throughput" is supported but not *established* on a box this noisy.

### 3.2 (b) The 1.5× rule — bias direction is right, and I computed the boundary

The rule is `waitAheadMs = (ceil((queued + busy + 1) / size) - 1) × meanJobMs`, refuse when
`waitAheadMs > queueBudget × 1.5`. Two biases toward admitting (drop the job's own round; 1.5×
overshoot). Computed from the shipped constants (60 s budget, 1.5×):

```
size=2, EWMA= 2s → first refusal at queue depth 90 (46 rounds); a false shed needs real jobs < 1,304 ms
size=2, EWMA= 5s → first refusal at queue depth 36 (19 rounds); …                       < 3,158 ms
size=2, EWMA=15s → first refusal at queue depth 12 ( 7 rounds); …                       < 8,571 ms
size=2, EWMA=30s → first refusal at queue depth  6 ( 4 rounds); …                      < 15,000 ms
```

So the check **cannot fire below four rounds of queued work** — the coordinator's boundary case
(queue depth 1) is provably unreachable: it would need `meanJobMs > 90 s`, and `recordJobDuration`
is called only on the completion path (`doctor-pool.ts:466`), so the EWMA is bounded by the 30 s run
budget. A false shed requires the estimator to over-state by more than 1.5×, i.e. real per-job time
under ~65% of the EWMA. The lane measured the worst observed over-statement at 1.45× (EWMA polluted
by worker cold-start), so the margin over the measured worst case is ~3% — thin, and the only
protection against it is the served-count parity in §3.1, which is noisy. The direction is right
and the harm is bounded (a refused writer gets the same 503 they would have got 60 s later), so this
is not a blocker; it is the number I would re-measure on a quiet box before raising 1.5 or lowering
the queue budget.

### 3.3 BLOCKER — eager respawn races `shutdownDoctorPool()` and leaves an orphan worker

`respawnWarmWorkerAfterTerminate` (`doctor-pool.ts:542`) guards on `shuttingDown` **at call time**,
but the worker is actually created later, inside the async `runScriptDoctorOffThread` it calls; and
`shutdownDoctorPool()` sets `shuttingDown = true` on entry and back to **`false` in its `finally`**
(`:777`, `:794`). A respawn that lands after shutdown finished therefore sees a cleared flag and
spawns. Isolated with a one-binary A/B (`B3-race.mjs`: force a run-budget kill, then immediately
`await shutdownDoctorPool()`, then look at the loop 2 s later):

```
DOCTOR_POOL_EAGER_RESPAWN=0   process exit 0
                              after shutdown: workers=0; active resources 2s later: ["Timeout"]  (mine)
DOCTOR_POOL_EAGER_RESPAWN=1   process HANGS (exit 124 under `timeout 40`)
   (the shipped default)      after shutdown: workers=0, but 2s later: ["MessagePort","Timeout","Timeout"]
                              and doctorPoolStatus().workers === 1 — a worker spawned AFTER shutdown resolved
```

`shutdownDoctorPool()` returned in 1 ms with nothing to terminate, and the replacement worker
appeared after it. Production consequence, not just a probe artifact: `server.ts`'s hard-kill timer
(`server.ts:148`) fires 10 s into a shutdown the event loop will not end on its own and exits
`firstExitCode === 0 ? 1 : firstExitCode` — so a **clean** SIGTERM redeploy that should exit 0 exits
**1, ten seconds late**, whenever a budget kill / Cancel / purge lands shortly before the signal.
That is exactly the shape of the B1 finding this repo already fixed once.

The fix is small and local: give the pool a shutdown generation counter, capture it in
`respawnWarmWorkerAfterTerminate`, and bail after the await if it moved (and/or have
`shutdownDoctorPool` drain `respawnsInFlight` before resolving, and terminate any slot that appeared
during the splice). A regression test is easy in the shape my probe already has: kill → shutdown →
assert `doctorPoolStatus().workers === 0` **after a tick**, and assert the loop is empty.

### 3.4 (c) The other two respawn guards are sound

Measured (`B3-respawn.mjs`): after a run-budget kill the replacement is warm and present at the very
next observation (`workers=1` at +0 ms, steady through +1,500 ms) — the eager path works. With
`DOCTOR_WORKER_POOL_SIZE=1` and a kill, `workers` stayed at **0 → ≤1**: the
`slots.length + respawnsInFlight >= configuredPoolSize()` guard prevents an override-lowered pool
from being grown past its size. `queue.length > 0` correctly skips the respawn (real work spawns
anyway). Prewarm-before-listen is untouched.

### 3.5 (d) The two suites' `EAGER_RESPAWN='0'` pin is honest

Both suites observe "the cancelled worker was terminated" through `doctorPoolStatus().workers`
reaching 0. With the respawn on, that count is back to 1 immediately (measured: `workers=1` at the
first observation after a kill), so the count can no longer distinguish *terminated* from
*terminated and replaced* — the assertion would become ambiguous, not merely stricter. A stronger
assertion (worker identity changed) is not available: the pool exposes no worker id, and adding one
purely for two suites is more surface than the pin. The pin is documented at both call sites with
the reason, is scoped to the process, and is cleaned up in `after`; the respawn's own coverage lives
in `tests/core/doctor-analysis-budget.test.ts` (26 tests here). Accepted.

### 3.6 (e) The NODE_ENV finding is real, and it is bigger than the lane says

`scripts/run-tests.mjs` never sets `NODE_ENV` (grep: no hits), so every `NODE_ENV === 'test'`
branch is dead during the suite. Full inventory under `server/` — one grep, all hits:

| file:line | branch | effect when `NODE_ENV` is unset |
|---|---|---|
| `doctor-pool.ts:522` | `eagerRespawnEnabled()` returns false under test | **dead under the runner** — the explicit `DOCTOR_POOL_EAGER_RESPAWN=0` pins are what protect the two suites (the lane's own finding) |
| `doctor-pool.ts:1007` | `warmDoctorPool()` no-ops under test | **also dead** — test runs pay real prewarm wall-clock unless a suite sets `DOCTOR_POOL_PREWARM=0`. The lane did not name this one |
| `app.ts:188, 238, 279` · `ai-providers/openai-compat.ts:61` · `routes/collab.ts:48` | all `=== 'production'` | fail **safe** when unset (CSP/security headers off, verbose errors on, collab secret not required) — correct for a test run, and production sets the variable |

So nothing silently runs in *production* mode under the runner; the exposure is the reverse — two
*test-mode* conveniences that never engage. Worth a follow-up lane (set `NODE_ENV=test` in
`run-tests.mjs`, or delete the two dead branches in favour of the explicit env pins), not this one.

### 3.7 (f) Gates

```
node scripts/check-scoring-receipt.mjs main..HEAD  (all three commits)   exit 0  "no scoring-path files changed"
check-doctor-output-identity --compare main@da3db049 ↔ this tree          PASS — 45/45 byte-identical
tests/core/doctor-analysis-budget.test.ts      26 pass / 0 fail / 0 skipped
tests/routes/doctor-analysis-budget.test.ts     6 pass / 0 fail
tests/core/doctor-worker-pool.test.ts (×3)      9 pass / 0 fail each
tests/routes/hardening.test.ts                 24 pass / 0 fail
```

Not re-run per the budget: full `npm test` (lane reports 12,960/0), lint, check-docs,
honesty-audit, fuzz-routes, the browser suites.

### The numbered list

1. **BLOCKER — the eager respawn can spawn a worker after `shutdownDoctorPool()` has finished,
   leaving an orphan that keeps the event loop alive and turns a clean SIGTERM into exit 1, ten
   seconds late.** Reproduce: `RESPAWN=1 timeout 40 node --experimental-strip-types
   .../sf2-review/B3-race.mjs` → the process **hangs** (exit 124), and two seconds after
   `shutdownDoctorPool()` resolved the loop holds a `MessagePort` with
   `doctorPoolStatus().workers === 1`; the identical run with `RESPAWN=0` exits **0** with an empty
   loop. Cause: `respawnWarmWorkerAfterTerminate` (`server/nvm/analyze/doctor-pool.ts:542`) checks
   `shuttingDown` before an await, and `shutdownDoctorPool` resets that flag to `false` in its
   `finally` (`:777`, `:794`), so the spawn lands unguarded; `server.ts:148`'s hard-kill then exits
   `1` where the drain would have exited `0`. Fix with a shutdown generation captured before the
   await and re-checked after it (and/or drain `respawnsInFlight` inside `shutdownDoctorPool`), plus
   a regression test in the shape of the probe: kill → shutdown → assert `workers === 0` after a
   tick and the loop empty.

2. **Non-blocking, record in the report — the served-count parity claim needs both runs to be
   honest.** I measured off: 37, 34; on: **29, 44**. Parity holds *because* the single-arm variance
   (15) swamps the difference, not because the counts matched; a single pair could be read either
   way. Quote a range, or re-measure on a quiet box, rather than "inside spread" from one pair. The
   latency result needs no such hedge: 60.3–65.5 s → 0.13–3.7 s, four runs, no overlap.

3. **Non-blocking follow-up (not this lane) — two dead `NODE_ENV === 'test'` branches.** The lane
   found one (`eagerRespawnEnabled`); the same cause kills `warmDoctorPool`'s test no-op
   (`doctor-pool.ts:1007`), so suites pay real prewarm time unless they pin
   `DOCTOR_POOL_PREWARM=0`. Everything else under `server/` branches on `'production'` and fails
   safe when unset (full table in §3.6). Either set `NODE_ENV=test` in `scripts/run-tests.mjs` or
   drop both branches in favour of the explicit env pins — but not inside this lane's diff.

---

## Round 4 — re-check of `760005f6` (tag `audit/2026-09-06/budget-round4`)

**Same reviewer.** Reviewed from a `git archive 760005f6` export
(`<session scratch>/sf2-review/budget4`); the worktree was never built or booted in (its merge gates
run concurrently, and it currently carries the lane's own uncommitted work). `diff
df31b73d..760005f6` = 8 files +355/−59. Every server I started is killed. Probes: `B4-race.mjs`,
`B4-race2.mjs`, `B4-counters.mjs`, and the `B4-*.log` files.

**Verdict: MERGE**, with one documentation nit below. Round 3's blocker is fixed and I verified it
with the same probe that found it, plus the harder two-respawns case; the LRU assertion is now
strictly stronger than what it replaced, and I reproduced its fail-first.

### 4.1 (a) The round-3 race is closed — same probe, opposite result

`B4-race.mjs` (force a run-budget kill, then immediately `await shutdownDoctorPool()`, then inspect
the loop 2 s later), run against the export:

```
DOCTOR_POOL_EAGER_RESPAWN=1  (shipped default)   exit 0
   after shutdown: workers=0 · 2s later: resources ["Timeout"] (mine only) · workers 0
   BEFORE (round 3): exit 124, resources ["MessagePort","Timeout","Timeout"], workers 1
DOCTOR_POOL_EAGER_RESPAWN=0  (control)           exit 0, unchanged
```

And the harder case the coordinator asked for — **two** respawns in flight (`B4-race2.mjs`: two
concurrent jobs both killed by the run budget with `DOCTOR_WORKER_POOL_SIZE=2`, shutdown
immediately after):

```
after two kills: workers=1
shutdown took 59ms, workers=0
2s later: resources ["Timeout"], workers 0        exit 0
```

### 4.2 (b) The drain bound — reading it, the late-spawn case is still covered

Three guards, and they compose: (1) `respawnWarmWorkerAfterTerminate` captures
`shutdownGeneration` and re-checks it (plus `shuttingDown`) after `await Promise.resolve()`, so a
respawn whose microtask lands after a shutdown began never calls `runScriptDoctorOffThread` at all;
(2) `shutdownDoctorPool` bumps the generation first, then `Promise.race`s
`allSettled(respawnPromises)` against a **3 s** deadline before splicing, and re-drains the queue
afterwards; (3) the respawn's own `finally` calls `terminateAllSlots()` whenever the generation
moved under it, and shutdown repeats `if (slots.length > 0) terminateAllSlots()` after its splice.

So a spawn slower than the 3 s drain is not leaked: shutdown proceeds without it, and when that
respawn finally settles its `finally` sees the moved generation and terminates the slots it
created. The exposure is a bounded window in which a worker exists after shutdown returned — it
ends at that respawn's own settle, and its job is the tiny warm fountain, not a real analysis.
On the second half of the question: the drain adds **at most 3 s** to `shutdownDoctorPool()`, while
`server.ts`'s hard kill is a `10_000 ms` `.unref()`'d timer armed at signal time — so the drain
cannot push shutdown past it, and (being `unref`'d) that timer never holds the loop open itself.

### 4.3 (c) The counters are exact, and one gap

`B4-counters.mjs` — two **identical** texts submitted concurrently, then a third sequentially:

```
start                          {cacheHits:0, workerRuns:0, inProcessRuns:0}
after 2 concurrent identical   {cacheHits:0, workerRuns:2, inProcessRuns:0}
after a 3rd (sequential)       {cacheHits:1, workerRuns:2, inProcessRuns:0}
sum: hits + worker + inproc = 3 for 3 submissions
```

No double-count: every submission lands in exactly one bucket. The concurrent pair genuinely runs
**twice** — the cache is consulted at submission (`doctor-pool.ts:824`) and neither had a result yet
— so there is no in-flight coalescing. That is pre-existing behaviour, and the counters report it
honestly rather than dressing the second run up as a hit; worth knowing if anyone later reads
`cacheHits` as a dedupe metric.

**The gap:** the three new fields are **not** documented in README. The `/health` row there
enumerates `doctorPool: { warm, warmedAt, ms, timedOut, completedAfterDeadline,
settledAfterTimeoutMs }` and still lists only those six; `grep -c cacheHits README.md` → **0**, and
this round's only README edit was to the `DOCTOR_QUEUE_ADMISSION` row. Item 1 below.

### 4.4 (d) The LRU test gained teeth — and I made it fail

The timing ratio is gone, replaced by **four outcome assertions**: the first submission increments
`workerRuns + inProcessRuns`; the repeat does **not**; `cacheHits` increments by exactly one; and
after `clearDoctorCache()` the next submission runs again while `cacheHits` stays put. The old
`firstMs`/`secondMs` numbers survive as a `console.log` marked informational.

Fail-first, reproduced myself rather than taken from the report: I bypassed the LRU in my export
copy (`if (cached)` → `if (false && cached)`) and re-ran the file — **8 pass / 1 fail, exit 1**,
failing on that test. Restored, then **9/9 three times**. Nothing lost its teeth; the assertion is
now immune to the contention that made it flake, which was the point.

### 4.5 Round-3's non-blocking items are both addressed

- **Parity as a range**: `docs/DECISION_LOG.md` now carries a four-runs-per-arm table (served 50–52
  off vs 50–54 on, medians equal; first 503 of the saturated wave 60,296–60,474 ms off vs
  853–959 ms in 3 of 4 on-runs and 60,342 ms in the fourth) with the EWMA-not-yet-learned caveat
  stated plainly, and it folds in my own runs ("including the reviewer's own, which fired the second
  wave at 3 s rather than 8 s ... seven answered between 0.13 s and 3.7 s and one at 60.3 s").
  That is exactly the honest form the round-3 note asked for.
- **The two dead `NODE_ENV === 'test'` branches** are recorded for a follow-up in the decision log.

### 4.6 (e) Gates

```
node scripts/check-scoring-receipt.mjs main..HEAD  (all four commits)   exit 0  "no scoring-path files changed"
check-doctor-output-identity --compare main@da3db049 ↔ this tree        PASS — 45/45 byte-identical
tests/core/doctor-worker-pool.test.ts (×3)      9 pass / 0 fail each   (+ 8/1 with the LRU bypassed)
tests/core/doctor-analysis-budget.test.ts      27 pass / 0 fail / 0 skipped
tests/routes/ready.test.ts                     10 pass / 0 fail
tests/routes/hardening.test.ts                 24 pass / 0 fail
```

Not re-run per the budget: full `npm test` (lane reports 12,961/0), lint, check-docs,
honesty-audit, fuzz-routes, the browser suites.

### 4.7 Verdict

**MERGE.** Four rounds in, every finding I raised has been closed at the root and re-verified with
the probe that produced it: the false "your draft is slow" for queued jobs (round 1) became a
registered 503 with a `Retry-After` I drove end to end; the 60 s wait before that answer (round 2)
became sub-second admission with the throughput parity honestly ranged; and the respawn that
outlived a shutdown (round 3) now exits clean under both the single- and double-respawn races. The
one item left is a README line.

### The numbered list

1. **LOW (documentation, not behaviour) — README's `/health` row does not list the three new
   `doctorPool` counters.** `grep -c cacheHits README.md` → 0, while the row explicitly enumerates
   the other six `doctorPool` fields, and `server/routes/config.ts`'s own comment calls them the
   thing "an operator can read cache effectiveness and worker utilisation" from. Add
   `cacheHits`/`workerRuns`/`inProcessRuns` to that enumeration with the one-line meaning already
   written in the route comment. (Also worth one clause there: `cacheHits` is not a dedupe counter —
   two identical texts submitted concurrently produce two `workerRuns`, measured in §4.3.)
