# Review — `voice-bound-ci-derivation`, round 1, reviewed object `026c0948`

- **Reviewed SHA:** `026c0948` (substantive tip `48585b18`), branch
  `lane/voice-bound-ci-derivation`, rebased on `main` @ `68d05192`.
- **Reviewer:** independent; did not build this lane. Worktree
  `/home/user/wt-bound`.
- **Diff read:** `git -C /home/user/wt-bound diff 68d05192..026c0948` (17 files,
  +2,420 / −99).
- **Reviewing machine (every number below unless marked otherwise):**
  `local: Intel(R) Xeon(R) Processor @ 2.10GHz x4 (parallelism 4, 16 GiB), node v22.22.2, linux/x64`,
  load average 1.30–1.85 with one sibling CPU-bound process from another lane.
  Scratch paths are written `<session scratch>`.

The lane is right about the diagnosis, right that the weight bound cannot be
re-derived downward, and right that a second orthogonal bound is the available
remedy. The shipped constant is conservative and the change is a strict
narrowing. What this review sends back is not the design: it is six places
where the RECORD of the derivation says something the committed measurements do
not support — in a lane whose entire thesis is that a derivation carried by
prose is a derivation nothing recomputes.

---

## 1. Brief items against the diff

| # | Brief item | Verdict |
|---|---|---|
| 1 | Re-derive the bound on the runner, with the machine named | **Done, and better than asked.** `scripts/lib/machine-fingerprint.ts` stamps every timing; `tests/fixtures/voice-bound-derivation.json` carries CPU, cores, node, runner image and `GITHUB_RUN_ID`; both failure messages and a pass-time TAP diagnostic name the machine. |
| 2 | Lower `MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT` so the runner clears it | **Correctly refused, with arithmetic.** Verified independently: the committed probe-cast generator weighs 457,200 at 30 cast and 609,600 at 40 cast (fixture rows, and reproduced locally), so any weight bound at the ~400,000 the runner needs rejects an ordinary 40-character feature. The refusal is the right call and it is argued from numbers, not from preference. |
| 3 | A second bound instead | **Done.** `MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT = 80`, evaluated SECOND. Order verified by reading both call sites and by driving payloads: N=151 uniform-min still rejects via `MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT`, every pinned DoS/bypass fixture keeps its message (662/662 in the parity file). |
| 4 | The derivation must be executable, not prose | **Done for the constant, NOT done for the constant's own comment** — see finding 1. `tests/core/voice-bound-derivation.test.ts` re-derives 80 from the committed table with the same `deriveCast` the calibration uses, and fails on a nudge. But the comment beside the constant states a DIFFERENT margin from the one the code applies, and nothing recomputes a comment. |
| 5 | Legacy mirror kept so the ROUND 7 equivalence proof compares data sources | **Done.** `legacyVoiceEligibleWeightRejectionReason` carries the same check in the same order with the same message. |
| 6 | Calibration script + runner workflow | **Done.** `permissions: contents: read`, `timeout-minutes: 60`, inputs through `env` not shell interpolation — stricter than `ci.yml`, which has no timeout at all. Two small gaps in finding 9. |
| 7 | Docs that quoted 675,000 still tell the truth | **Mostly.** Claims register rows 69 + 116, the gate note, the Owner R5 caveat and the Branch note are all updated and accurate. Two prose statements about the newly-rejected range are wrong (finding 5); `docs/PATH_TO_EXCELLENCE.md` still carries the pre-runner guarantee (finding 8). |
| 8 | Report what the guard no longer guarantees | **Raised honestly but scoped too narrowly** — the lane's own §6 flags the 40-cast cost, which is the right instinct, but the residual it names is the INELIGIBLE document. A fully ELIGIBLE document both bounds admit costs 1.87x the derivation shape (finding 4). |

---

## 2. Reproduced numbers

### 2.1 The sandbox column reproduces (within ~5%)

```
cd /home/user/wt-bound
npm run --silent measure-voice-bound -- \
  --max-admitted=80,85 --uniform-min=150 --probe-cast=40 --repeats=2 --conditions=idle
```

| shape | N | weight | lane's sandbox-idle CPU max | this review | delta |
|---|---|---|---|---|---|
| max-admitted | 80 | 652,800 | 7,337 ms | **7,688 ms** | +4.8% |
| max-admitted | 85 | 650,250 | 7,903 ms | **7,719 ms** | −2.3% |
| uniform-min | 150 | 675,000 | 12,091 ms | **12,724 ms** | +5.2% |
| probe-cast | 40 | 609,600 | 6,060 ms | **6,387 ms** | +5.4% |

The lane's sandbox table is reproducible. (Note the script's own derivation
line on an `idle` sweep prints **85**, not 80 — correct behaviour, because the
constant is derived from the `loaded` runner table, but it is worth knowing
that the script prints a number that is not the shipped one when run the way a
reader will first run it.)

### 2.2 The derivation test fails on a nudge, in both directions

```
node --experimental-strip-types tests/core/voice-bound-derivation.test.ts   # 7/7 pass, exit 0
# constant 80 -> 85:
#   not ok 3 - the constant equals the cast the table derives — re-computed here, not trusted
#   "MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT is 85, but the committed calibration table
#    (INTEL(R) XEON(R) PLATINUM 8573C, run 34740951649, 2026-09-13T05:52:14.241Z) derives 80
#    (worst CPU sample 11848ms against a 12000ms ceiling)."
#   # tests 7 # pass 6 # fail 1        (constant restored; worktree clean)
```

### 2.3 The security parity file

```
node --experimental-strip-types tests/security/fountain-shape-guard-cue-parity.test.ts
# tests 662  # pass 662  # fail 0  # skipped 0   (12.4 s wall)
# TAP diagnostic on PASS:
#   voice-bound worst-case cost: max-admitted N=80 (102 words/speaker) cpu 7503ms
#   (50% of the 15000ms half-budget target), wall 7439ms — local: Intel(R) Xeon(R) ...
```

The pass-time diagnostic is a genuinely good addition: every CI log now carries
the number and the machine, whether or not the assertion is near the line.

### 2.4 The large-ensemble question, driven through the route

Generator: a feature-scale war-film ensemble — Zipf-distributed speech with a
30-word floor, one scene heading per speaker, real action paragraphs — fitted
by bisection to the heaviest document the WEIGHT bound still admits at each
cast (`<session scratch>/ensemble.mjs`, `ens2.mjs`).

| cast | chars | scenes | distinct | pooled words | weight | verdict |
|---|---|---|---|---|---|---|
| 60 | 87,026 | 60 | 60 | 11,249 | 674,940 | ACCEPT |
| 70 | 76,293 | 70 | 70 | 9,611 | 672,770 | ACCEPT |
| **75** | **72,331** | **75** | **75** | **8,987** | **674,025** | **ACCEPT** |
| 80 | 68,567 | 80 | 80 | 8,395 | 671,600 | ACCEPT |
| **81** | **68,109** | **81** | **81** | **8,317** | **673,677** | **REJECT — `MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT`** |
| 85 | 65,717 | 85 | 85 | 7,927 | 673,795 | REJECT — `MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT` |
| 100 | 52,266 | 50 | 100 | 6,725 | 672,500 | REJECT — `MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT` |

Driven over HTTP through `POST /api/scriptide/doctor` on a real booted test
server:

```
cast=75  chars=72331  status=200  wall=10682ms  health=60.3  scenes=75
cast=81  chars=68109  status=400  wall=27ms
  "fountain: has more speaking characters who each speak enough to be individually
   voice-scored than this server analyzes in one pass (81, more than 80) — ..."
```

Same document measured the calibration's own way (fresh process,
`process.cpuUsage()` around one `runScriptDoctor`): **7,937 / 8,129 ms** of CPU,
against max-admitted N=80's 7,688 ms on the same box.

**Answer to the brief's question (b): no legitimate screenplay I could build is
newly rejected in practice, and the reason is worth writing down.** "Eligible"
means every parsed character with more than zero dialogue words has at least
`VOICE_ELIGIBLE_MIN_WORDS` = 30 — one walk-on under 30 words makes
`allEligible` false and NEITHER bound is consulted at all. A realistic 120-role
TV-pilot ensemble with sub-30-word walk-ons is ACCEPTED, before and after
(verified). And for a document where all 81+ roles clear 30 words, the WEIGHT
bound already caps total dialogue at 675,000/N — 8,333 words at N=81, about
13 pages of dialogue across a 68-page document. The newly-rejected set is
therefore thin-dialogue, flat-distribution, 81+-role documents. That is a
narrow and defensible loss. It is also **not** the range the record names — see
finding 5.

### 2.5 A document BOTH bounds admit, costing 1.87x the derivation shape

`buildMaxAdmitted(80, 675_000)` is 58,260 chars with **two scene headings**
(`buildUniformCast` emits one heading per 40 speakers). Neither bound
constrains document size or scene count. So: that same 80-speaker,
102-words-each body, padded with 398 action-only scenes to the analyzer's
400-scene ceiling.

```
node --experimental-strip-types <session scratch>/worst-cost.mjs 398
{"addedScenes":398,"chars":265376,"guard":"ACCEPT","cpuMs":14371,"wallMs":14033,"sceneCount":400,"health":83}
{"addedScenes":398,"chars":265376,"guard":"ACCEPT","cpuMs":14497,"wallMs":14210,"sceneCount":400,"health":83}
```

**14,371 / 14,497 ms of CPU, ACCEPTED by both bounds, on the box where the
derivation shape reads 7,688 ms** — 1.87x, and 96% of the 15,000 ms half-budget
here rather than 51%.

### 2.6 What actually drives the cost (`<session scratch>/vd-bench.mjs`)

| corpus | pairs | `analyzeVoices` | hoisted-frequency equivalent | speedup | max delta difference |
|---|---|---|---|---|---|
| cast 80, 102 words each | 3,160 | **7,627 ms** | **136 ms** | **56.0x** | **0** |
| cast 150, 30 words each | 11,175 | **12,277 ms** | **226 ms** | **54.3x** | **0** |

`burrowsDelta` computes `freqA`/`freqB` once — and then calls
`corpusStats(allDialogues, word, words)` inside a loop over the 65 function
words, and `corpusStats` re-derives `relativeFrequencies` for BOTH characters
every time. That is 130 full re-tokenizations of both sides per pair. Hoisting
it (mean/sd computed from the two frequencies already in hand, same operations
in the same order) is **bit-identical** — zero difference across all 3,160 and
11,175 pairs — and removes 98% of the cost.

---

## 3. Findings

### HIGH 1 — the constant's own derivation comment states a margin that derives a different constant

`server/lib/validation.ts:719-721`:

> DERIVED, not chosen: it is the largest cast whose worst measured
> runScriptDoctor CPU stays under half DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS less a
> **15% margin**

The shipped rule is `DERIVATION_MARGIN_FRACTION = 0.20`
(`scripts/lib/voice-bound.ts:233`). Re-derived from the committed table:

```
margin 0.20  ceiling 12000  -> derived cast 80 at 11848 ms      <- shipped
margin 0.15  ceiling 12750  -> derived cast 90 at 12560 ms
margin 0.10  ceiling 13500  -> derived cast 90 at 12560 ms
```

The comment as written justifies **90**, not 80. It is a leftover from the
intermediate commit `213795e7`, whose message says "The derivation margin is now
0 … stacking a chosen 15% on top would put the cap at 40". The fixture test
cannot catch this: it compares the constant to `deriveCast`, and nobody
recomputes a comment. This is exactly the failure this lane was built to end,
reproduced inside the fix. **Fix: `20%`, and say the 0.20 lives in
`DERIVATION_MARGIN_FRACTION` so the two cannot drift again.**

### HIGH 2 — the 13.8% "the proxy is harsher than the real thing" constant is cross-machine arithmetic, and the committed table contradicts it

`scripts/lib/voice-bound.ts:196-213` states gap 1 as needing no margin, on this
evidence:

> Same shape, same machine class, same day: uniform-min N=150 cost 24,052 ms of
> CPU under the proxy (run 34739790205) and 21,133 ms inside the real `npm test`
> (run 34739080950) — the proxy is 13.8% dearer.

Run 34739790205 is the **AMD EPYC 9V74**. The CPU model of run 34739080950 is
recorded **nowhere** in the diff — I grepped every `.md`, `.ts`, `.mjs` and
`.yml` for both run ids; the only rows are the lane report's run table and this
comment, and neither names a machine. The very next paragraph of the same
comment establishes that those two `ubuntu-latest` CPU models are **20.1%**
apart. So the 13.8% is a machine difference, a condition difference, or any mix
of the two, and the record cannot tell them apart.

Against the machine whose proxy figure IS committed — the Xeon 8573C, fixture
`loaded` row, uniform-min N=150 = **20,022 ms** — the two real-`npm test`
measurements of that same shape are **19,713 ms** (run 34736306670) and
**21,133 ms** (run 34739080950), mean 20,423 ms. On that reading the proxy is
~2% **cheaper** than the real condition, not 13.8% dearer, and gap 1 needs a
margin rather than none.

This is load-bearing twice over. The "checked both ways" sentence converts the
EPYC's max-admitted N=80 figure (14,724 ms under the proxy) down to 12,939 ms
and calls it "86% of the 15,000 ms the assertion enforces". Under
proxy ≈ real, that same row reads **14.7–15.5 s against a 15,000 ms
assertion** — the shipped bound would be at or over the line on the slower half
of the fleet, which is the precise class of surprise this lane exists to
prevent. **Fix (cheap, both available): (a) read the machine out of run
34739080950's log — the lane's own TAP diagnostic now prints it — and write it
into the comment; if it is a Xeon, delete the 13.8% and re-state gap 1 as
unmeasured. (b) Say plainly what the bound is verified to do on an EPYC
runner, rather than deriving it through an unattributed correction.**

### HIGH 3 — applied to the slower runner's own table, the stated rule derives nothing

The lane's §4 reports the EPYC sweep at max-admitted 40/80/90/100 =
12,442 / 14,724 / 15,341 / 16,390 ms. The rule's ceiling is 12,000 ms, so the
**smallest swept cast already fails it** and `deriveCast` returns `null` — the
state `tests/core/voice-bound-derivation.test.ts` asserts against with "no swept
cast cleared the target — the sweep needs to go lower". The table was locked
from the one runner on which the rule yields an answer, and the record does not
say so. That is measurement selection, even if it was not intended as such, and
it is invisible to every test in the diff. **Fix: state that the derivation is
conditional on the Xeon-class runner and what happens on the other one, or
re-lock from the EPYC and take the lower cast.**

### HIGH 4 — "the heaviest document BOTH bounds admit" is false, by 1.87x, and §6's residual does not cover it

`tests/security/fountain-shape-guard-cue-parity.test.ts:3038` names its subject
"the max-admitted N=80 boundary — **the heaviest document BOTH bounds admit**",
and the lane report §5 heads its conclusion "What the pair now admits at worst".
Neither bound constrains document size or scene count, and the derivation shape
has **2 scene headings** at 58,260 chars. §2.5 above: the same eligible body at
the 400-scene ceiling is ACCEPTED by both bounds and costs **14,371 / 14,497 ms**
against the derivation shape's **7,688 ms** on the same machine in the same
harness.

The lane's §6 disclosure explicitly does not reach this: it describes a
document where "the walk-on really is under `VOICE_ELIGIBLE_MIN_WORDS`,
`analyzeVoices` really does abstain". Here it does not abstain — the full
O(distinct²) voice pass is paid, on top of the feature-scale analyzer load.
The claim to retire is not the bound, it is the sentence: what the pair bounds
is the ELIGIBLE-SPEAKER dimension of the cost, not the cost. **Fix: narrow both
sentences, and record this measurement beside the existing residual so the next
lane inherits it as a number rather than rediscovering it.**

### MEDIUM 5 — "the 121-150-speaker shapes" understates the narrowing by 40 casts

`server/lib/validation.ts:711-713` ("the 121-150-speaker uniform-ish shapes")
and `docs/brain/Gates/Gate - Fountain Shape Guard.md` ("the 121-150-speaker
shapes that weighed under 675,000") both name what the cast bound newly
rejects. Measured:

```
uniform-min N=81   weight 196,830  weight bound alone: ACCEPT | now: REJECT (…_DISTINCT)
uniform-min N=90   weight 243,000  ACCEPT | now: REJECT
uniform-min N=100  weight 300,000  ACCEPT | now: REJECT
uniform-min N=110  weight 363,000  ACCEPT | now: REJECT
uniform-min N=120  weight 432,000  ACCEPT | now: REJECT
```

The newly-rejected band is **81–150**. The lane report is right (it gives no
range); the two prose statements are not. The gate note's "cost 15,460–24,052 ms
on the runner" also cites a 15,460 that appears in no committed table.

### MEDIUM 6 — the committed fixture's `guard` column is stale, and says REJECT for the row the constant is derived from

The lock run (34740951649) ran on `598cbae8`, where
`MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT = 65`. So
`tests/fixtures/voice-bound-derivation.json` records `"guard":"REJECT"` for
max-admitted N=70, 75, **80**, 85, 90 and 100. On the shipped tree, N=70/75/80
are ACCEPT (reproduced with `fountainShapeRejectionReason` directly). Nothing
in the fixture, its `_comment`, or the derivation test says the column was
measured against a different bound — and the test never reads it. A reader of
the table the constant is locked from concludes the derived boundary is
rejected by the guard. **Fix: re-run `--lock-from` cannot help (it never
touches rows); either drop the column, or add one line to the `_comment` saying
which bound values the column was measured under, or re-lock.**

### MEDIUM 7 — the "real fix" is named wrongly in four places, and the real one is bit-identical

§9.3, the gate note, `Branch - Feature-Length Defects` and the Owner R5 caveat
all tell the owner that raising either bound waits on "capping `analyzeVoices`'s
O(distinct²) pair count" — a lossy change that would move scores and therefore
needs a receipt and a corpus run. §2.6 above shows the pair count is not what
makes a pair expensive: `burrowsDelta` re-derives both characters' relative
frequencies 130 times per pair, and hoisting that is **56x faster with zero
difference in any delta**. `analyzeVoices` alone accounts for 7,627 ms of the
derivation shape's 7,688 ms — the voice pass IS the cost, and 98% of it is
waste.

This lane correctly cannot land it: `server/nvm/analyze/voice-delta.ts` IS in
`doctor.ts`'s reachable set (confirmed directly with
`computeReachableSet(ROOT, ['server/nvm/analyze/doctor.ts'])` — `true`;
`fountain-analyzer.ts:172` imports `analyzeVoices`, called at `:2482`), so it is
scoring-path and belongs to a scoring lane with a receipt. But the record is
what the owner will act on, and it currently points at the more expensive,
score-moving fix and not at the free one. **Fix: replace the sentence in all
four places with the measurement above.**

### LOW 8 — `docs/PATH_TO_EXCELLENCE.md` still carries the pre-runner guarantee

Lines 82–85: "the second (675,000) admits a worst shape of 12–14 s CPU against a
30 s budget". No machine named; the runner measured that shape at 19,713 and
21,133 ms. It is a historical session record and the dated-document convention
argues for leaving it — but it is one of the two "start here" orientation
documents, and one trailing clause ("on an unnamed developer box; the runner
measured 19.7–21.1 s — see 2026-09-13") makes it true at no cost.

### LOW 9 — workflow hygiene

`.github/workflows/calibrate-voice-bound.yml` is well built: `permissions:
contents: read`, `timeout-minutes: 60`, inputs passed through `env` with the
script-injection hole called out by name and the script validating them itself.
It is stricter than `ci.yml`, which has no `timeout-minutes`. Two gaps: the
header still opens **"MANUAL ONLY"**, which the second half of the same file
contradicts; and there is no `concurrency:` group, so N pushes to `calibrate/**`
are N concurrent 60-minute jobs. On the security question the brief asks: yes,
anyone with push access can create a `calibrate/` branch and spend runner
minutes — but push access is already trusted, the job holds no secrets and only
`contents: read`, and it is time-boxed. Minutes-burn, not an escalation.

### LOW 10 — pre-existing, not this lane's

`scripts/check-scoring-receipt.mjs`'s header (line 106) lists `voice-delta.ts`
among the files "correctly excluded" as unwired — "nothing in the scoring path
imports them". It is reachable (see finding 7). The live walk is right; the
comment is stale and would mislead the next person deciding whether a
voice-delta change needs a receipt. Worth a separate one-line fix.

### LOW 11 — the batch directory has no README

`docs/audits/2026-09-13-ci-green/` contains only the lane report (and now this
review). `docs/LANE_STANDARD.md` §7.3 wants the reviewed SHA in the audit README
as well as in the review's first line. Orchestrator's item, not the lane's.

### LOW 12 — both rejection messages are duplicated verbatim between the production and legacy functions

Following the existing pattern for the weight-bound message, so not a new
defect — but drift between the two copies is invisible to the honesty audit,
which matches one string. One shared builder is the stronger version.

---

## 4. CI on the reviewed object

Read directly from the Actions API (run `34741928418`, `026c0948`):

- **`browser` job: SUCCESS** (5 min 18 s).
- **`test` job: FAILURE** — `# tests 13834 # pass 13740 # fail 2 # skipped 91`,
  7 min 0 s.
- **The subtest this lane exists for now PASSES on the runner.** The whole
  "finding 10" describe block is `ok 2717`, 13 of 13 subtests, suite duration
  14,222 ms — including the cost assertion, the N=81 rejection, and the
  uniform-min N=150 narrowing. The remedy works on the machine that enforces it.
- **The base is already red.** `main` @ `68d05192` (run `34740132220`) failed
  BOTH jobs: `browser` (`FAIL verify:command-palette`) and `test`. So the two
  remaining failures are very likely inherited rather than introduced — but I
  could not name them (the Actions log API truncates to the last ~0.2 s of a
  419 s TAP stream, and the failures print inline, far earlier). The
  orchestrator's extraction is in flight; **nothing in this review should be
  read as clearing them.**

The lane report's gate table records "CI on the lane branch | requested from the
orchestrator after the push". That is honest about not knowing. It is also the
one gate that matters most for a lane about CI, and it shipped unanswered.

---

## 5. The stronger version

The strongest version of this lane is the one it nearly wrote. Three of its
four instincts are already better than the brief asked for: refusing to lower
the weight bound and proving the refusal arithmetically before spending a
minute of runner time; lifting the generators out of the test file so the
derivation can be re-run rather than re-typed; and printing the machine on PASS,
not only on failure, so the next reader gets the number without a red build.

What separates it from the best version is that the same discipline was not
turned on its own margin. Three of the four numbers the derivation rests on —
the 15% in the constant's comment, the 13.8% proxy correction, the 121-150
range — are stated in prose and contradicted by the repository's own committed
measurements, and the fixture test cannot see any of them because it checks the
constant against the table and nothing checks the sentences against either. The
stronger version derives the margin from the two runner tables it already paid
for (both are in hand: Xeon locked, EPYC in the run log), states which machine
each number came from, and either locks from the slower one or says out loud
that it did not. Where the lane writes "checked both ways", the stronger
version would have noticed that one of the two ways requires dividing by a
constant measured across two different CPUs.

And the one thing genuinely out of scope is the thing worth carrying forward
loudest: the cost this whole two-day exercise is bounding is 98% redundant
recomputation inside `burrowsDelta`, removable bit-identically. Both bounds
exist to fence off a number that should not be there. The lane could not land
that — it is scoring-path — but it could have measured it in twenty minutes and
handed the scoring lane a 56x with `maxDeltaDiff = 0` instead of a
score-moving pair cap. That measurement is in §2.6 now; it belongs in the
record the owner reads.

---

## VERDICT: REVISE

None of these need a redesign. The bound stays at 80, the weight bound stays at
675,000, the evaluation order stays, the workflow stays. Every item is the
record catching up with the measurements already in the repository.

1. **`server/lib/validation.ts:719-721` — change "less a 15% margin" to 20%**,
   and name `DERIVATION_MARGIN_FRACTION` as the source so the two cannot drift.
   At 15% the committed table derives 90, not 80 (§2 of finding 1 shows the three
   margins side by side). *(HIGH 1)*
2. **Record the CPU model of run `34739080950`**, and re-state gap 1 of
   `DERIVATION_MARGIN_FRACTION`'s comment accordingly. If that run was not an
   EPYC 9V74, the "proxy is 13.8% dearer" claim is cross-machine and must go —
   the Xeon's own committed proxy row (20,022 ms) sits BELOW both real-`npm
   test` measurements of the same shape (19,713 / 21,133 ms), which says the
   proxy is not pessimistic at all. Everything the comment builds on that 13.8%
   — including "86% of the 15,000 ms the assertion enforces" on the slower
   runner — has to be re-derived or withdrawn. *(HIGH 2)*
3. **Say what the derivation is conditional on.** On the EPYC table the lane
   itself reports, the stated rule clears no swept cast at all (smallest, N=40,
   is 12,442 ms against a 12,000 ms ceiling) and `deriveCast` returns `null`.
   Either state that the lock is Xeon-conditional and what is known about the
   other runner, or re-lock from the EPYC and take the lower cast. *(HIGH 3)*
4. **Narrow "the heaviest document BOTH bounds admit"** in
   `tests/security/fountain-shape-guard-cue-parity.test.ts:3038` and in the lane
   report §5, to what is true: the worst shape on the ELIGIBLE-SPEAKER
   dimension. Record the measurement in §2.5 — an 80-speaker, all-eligible,
   400-scene document, ACCEPTED by both bounds, **14,371 / 14,497 ms** against
   the derivation shape's 7,688 ms on the same box — beside the existing
   `RESIDUAL accepted worst case` note, which does not cover it because
   `analyzeVoices` does not abstain here. *(HIGH 4)*
5. **Correct "121-150" to "81-150"** in `server/lib/validation.ts:711-713` and
   in `docs/brain/Gates/Gate - Fountain Shape Guard.md`, and either cite or drop
   the 15,460 ms that appears in no committed table. *(MEDIUM 5)*
6. **Disclose that the fixture's `guard` column was measured under
   `MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT = 65`** — it reads REJECT for
   max-admitted N=70/75/80, which the shipped tree ACCEPTs, including the row
   the constant is derived from. One line in the file's `_comment`, or drop the
   column. *(MEDIUM 6)*
7. **Replace "capping the pair count" with the measured fix** in §9.3, the gate
   note, `Branch - Feature-Length Defects` and the Owner R5 caveat:
   `burrowsDelta` re-derives both sides' relative frequencies 130 times per
   pair; hoisting it is **56.0x / 54.3x with `maxDeltaDiff = 0`**
   (§2.6). Still scoring-path, still the scoring lane's to land — but the owner
   should be pointed at the free, bit-identical fix, not at the score-moving
   one. *(MEDIUM 7)*
8. *(Optional, non-blocking.)* One clause on `docs/PATH_TO_EXCELLENCE.md:84`
   naming the box behind "12–14 s CPU"; drop "MANUAL ONLY" from the calibrate
   workflow's header and add a `concurrency:` group; and a separate follow-up
   for `scripts/check-scoring-receipt.mjs`'s stale claim that `voice-delta.ts`
   is unwired. *(LOW 8, 9, 10)*

Items 1, 4, 5, 6 and 7 are comment and document edits with no code change.
Item 2 needs one machine identity read out of a log the lane already produced.
Item 3 needs one paragraph. The reviewer will re-check these items against the
new diff.
