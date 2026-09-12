# Rulebook-and-guard-bound lane — independent review of `08a67802`

Reviewed object: `08a6780228d579f64aa902b0cc1f96c28d4cdb6c`
(`lane/rulebook-and-guard-bound` tip, on origin; the lane's `71c61244` rebased
onto `main 6b4ea31f`; two commits, `a8e34631` + `08a67802`). Reviewer did not
build the change. Work done from `git archive 08a67802 | tar -x` and
`git archive 6b4ea31f | tar -x` under `<session scratch>/rulebook-review/`
with `node_modules` symlinked; `/home/user/wt-rulebook` and
`/home/user/STORYMACHINE`'s tree were not modified except to write this file.

Budget per LANE_STANDARD §4: the touched suites, the receipt gate, output
identity, and the reviewer's own probes. No full `npm test`, no browser
battery.

---

## Round 1

### Brief vs diff

| # | Brief item | Status | Evidence |
|---|---|---|---|
| 14a | Extractor collects the `id:`→`title:` field block and matches `requiredRules` **or** `memberRules` | **done** | `scripts/generate-rulebook.ts:443,448,458-472` — block terminated by `FIELD_TERMINATOR_RE` (`explanation:`/`observation:`, both non-optional in `RootCauseTemplate` (`cluster.ts:433`) and `DuplicateFamily` (`cluster.ts:1044`), so the terminator is type-guaranteed), 40-line defensive cap |
| 14b | `assertRootCauseTemplatesWellFormed` refuses empty title / empty Requires, naming the cluster | **done** | `scripts/generate-rulebook.ts:788`, called at `:809` before `renderRootCausesDoc` emits |
| 14c | Regenerate-into-temp zero-diff test in `tests/core/rulebook.test.ts` | **done, and fail-first verified by the reviewer** | `tests/core/rulebook.test.ts:79` |
| 14d | `docs/rulebook/root-causes.md` regenerated, only that file changed | **done** | `git diff --stat 6b4ea31f..08a67802` lists exactly one file under `docs/rulebook/` |
| 14e | `cluster.ts` untouched | **done** | absent from the diff stat |
| 14f | Rule COUNT unchanged (3,217) | **done** | live regeneration prints `totalRules 3217`; `docs/rulebook/README.md:7` says 3217; `tests/core/rulebook.test.ts` count case passes |
| 14g | Nothing under `revision/passes/**` or the scoring path changed | **done** | receipt gate: "no scoring-path files changed. OK.", exit 0 |
| 10a | Six measured timings at casts 15/20/25/30/40/60 | **claimed, partially reproducible** | reviewer reproduced 3 of 6 rows in shape (monotone, same order of magnitude) but not in value — see item 4 |
| 10b | Bound 1,500,000 sits inside (606,000, 1,920,000) | **done, but the bracket is on fixture WEIGHTS, not on COST** | see item 1 — **BLOCKER** |
| 10c | Six new tests; realistic 20/30/40 casts ACCEPTED | **done, fail-first verified** | `tests/security/fountain-shape-guard-cue-parity.test.ts:2942`; reviewer reproduced accept-on-tip / reject-on-baseline |
| 10d | Bypass B is the lightest **pinned** rejection, and the bound is computed against its weight, not a literal | **done** (with one nuance, item 7) | production-instrumented enumeration of all 60 bound rejections in the suite |
| 10e | Rejection copy still true | **done** | message interpolates the constant; prints `more than 1500000 …` |
| 10f | `validation.ts` outside `doctor.ts`'s import graph, by the receipt gate's own reachability | **done** | `computeReachableSet` → `not reachable` |
| 10g | Claims register row 69 updated | **done** | `docs/CLAIMS_REGISTER.md:161`; `honesty-audit` clean |
| 10h | Two brain Gate notes | **done** | both present, `check-brain` fresh, `brain-coverage` 7/7 |
| G | Identity 45/45 | **done, and stronger than claimed** | see item 6 |

---

### Reproductions

Every command below was run by the reviewer. `<tip>` =
`<session scratch>/rulebook-review/tip` (export of `08a67802`), `<base>` =
`…/base` (export of `6b4ea31f`).

**R1 — finding 14 reproduces on the baseline, 16 added lines.**
```
$ cd <base> && node --experimental-strip-types scripts/generate-rulebook.ts
rulebook: 3217 rules across 14 passes -> docs/rulebook/
$ diff <(git show 6b4ea31f:docs/rulebook/root-causes.md) <base>/docs/rulebook/root-causes.md | wc -l
18            # 2 diff markers + 16 added lines — matches the audit exactly
```

**R2 — pre-fix extractor's exact breakdown, and the new guard fires on it.**
```
old extractor templates: 18
empty title:    clock-zone-imbalance, seed-suspense-aftermath-void, stakes-zone-imbalance
empty requires: clock-zone-imbalance, payoff-scene-emotional-flatline,
                payoff-scene-relational-flatline, revelation-relational-flatline,
                seed-scene-emotional-flatline, seed-suspense-aftermath-void,
                staging-zone-imbalance, stakes-zone-imbalance
GUARD FIRES on pre-fix extraction
new extractor templates: 18  empty title: 0  empty requires: 0
```
Identical to the lane report's 3/8 breakdown.

**R3 — regeneration on the tip is a zero diff, count unchanged.**
```
$ cd <tip> && generateRulebook(<scratch>/regen)
totalRules 3217 passes 14
$ for f in <scratch>/regen/*; do cmp -s $f <tip>/docs/rulebook/$(basename $f) || echo DIFFERS $f; done
(no output)
```

**R4 — the four restored titles are `cluster.ts`'s own human titles.**
`clock-zone-imbalance` → "Deadline pressure is bunched, not spread"
(`cluster.ts:1168`); `seed-suspense-aftermath-void` → "Planted clues raise no
suspense once they land" (`:1197`); `staging-zone-imbalance` → "Physical
staging is bunched, not spread" (`:1181`); `stakes-zone-imbalance` →
"Stakes-raising scenes are bunched, not spread" (`:1154`). All four match the
regenerated catalog byte for byte.

**R5 — the zero-diff test fails on the unfixed input (§3 fail-first).**
Tip export with only `docs/rulebook/root-causes.md` reverted to `6b4ea31f`:
```
not ok 4 - regenerating into a temp directory produces a zero diff …
  docs/rulebook/** is stale relative to a live regeneration in: root-causes.md
# tests 6  # pass 5  exit=1
```

**R6 — a planted untitled cluster makes the generator refuse.**
Scratch copy of the tip with one extra `DuplicateFamily`-shaped object
(`id: 'planted-untitled-cluster'`, `memberRules: ['PLANTED_RULE_A']`,
`title: ''`) inserted into `cluster.ts`:
```
THREW: generate-rulebook: refusing to emit root-causes.md — the following
cluster(s) in server/nvm/analyze/cluster.ts extracted with empty title:
planted-untitled-cluster. …
exit=3
```

**R7 — receipt gate and reachability.**
```
$ node scripts/check-scoring-receipt.mjs 6b4ea31f..08a67802
check-scoring-receipt: range "6b4ea31f..08a67802" — no scoring-path files changed. OK.   exit=0
$ computeReachableSet(cwd, ['server/nvm/analyze/doctor.ts'])   # the gate's own function
reachable set size: 67
server/lib/validation.ts        -> not reachable
scripts/generate-rulebook.ts    -> not reachable
server/nvm/analyze/cluster.ts   -> not reachable
```

**R8 — accept/reject flip, tip vs baseline, on the committed probe generator**
(`tests/security/…:2950`'s `buildProbeCastFeature`, run against both trees'
`fountainShapeRejectionReason`):

| cast | chars | tip (1,500,000) | baseline (300,000) |
|---|---|---|---|
| 15 | 122,064 | ACCEPTED | ACCEPTED |
| 20 | 122,115 | ACCEPTED | REJECTED (voice-weight) |
| 25 | 122,507 | ACCEPTED | REJECTED (voice-weight) |
| 30 | 122,689 | ACCEPTED | REJECTED (voice-weight) |
| 40 | 122,924 | ACCEPTED | REJECTED (voice-weight) |
| 60 | 123,446 | ACCEPTED | REJECTED (voice-weight) |

The fail-first direction the lane claims is real.

**R9 — the reviewer's own cost curve** (`runScriptDoctor` timed directly,
reviewer's box, one run each; "uniform-min" = every speaker at exactly
`VOICE_ELIGIBLE_MIN_WORDS` = 30 real dialogue words, double-spaced
bypass-B-shaped wrap so every wrap paragraph parses as dialogue):

| shape | distinct | pooled words | weight | chars | guard | wall |
|---|---|---|---|---|---|---|
| probe-cast 20 | 20 | 15,192 | 303,840 | 122,115 | ACCEPTED | 2,755 ms |
| probe-cast 40 | 40 | 15,240 | 609,600 | 122,924 | ACCEPTED | 6,483 ms |
| probe-cast 60 | 60 | 15,270 | 916,200 | 123,446 | ACCEPTED | 10,450 ms |
| probe-cast 99 @14,800w | 99 | 15,000 | **1,485,000** | 121,894 | **ACCEPTED** | **16,080 ms** |
| uniform-min 100×30 (old bound's ceiling) | 100 | 3,000 | 300,000 | 22,455 | ACCEPTED | 6,384 ms |
| uniform-min 150×30 | 150 | 4,500 | 675,000 | 33,710 | ACCEPTED | 12,471 ms |
| uniform-min 180×30 | 180 | 5,400 | 972,000 | 40,485 | ACCEPTED | 18,638 ms |
| **uniform-min 223×30 (new bound's ceiling)** | 223 | 6,690 | **1,491,870** | **50,172** | **ACCEPTED** | **27,558 / 27,295 ms** (two runs) |
| uniform-min 224×30 (one speaker over) | 224 | 6,720 | 1,505,280 | 50,396 | REJECTED | 29,439 ms |
| bypass B (pinned DoS fixture) | 200 | 9,600 | 1,920,000 | 79,070 | REJECTED | 31,118 ms |

The reviewer's box is **~1.31× faster** than the lane's on the identical
committed fixture (probe-cast 60: 10,450 ms here vs the report's 13,734 ms).

**R10 — full enumeration of every rejection the security suite takes via this
bound.** Production `realVoiceEligibleWeightRejectionReason` instrumented in a
scratch copy to record `voiceEligibleWeight` on every rejection, suite run
whole (654/654 pass with the instrumentation in place):
```
REJECTIONS-VIA-BOUND count=60 distinct weights (lightest 6):
1,600,000 | 1,920,000 | 2,400,000 | 4,788,000 | 18,720,000 | 19,656,000
weight=1,600,000 distinct=40  pooled=40,000 chars=350,890 @ test:2752
weight=1,920,000 distinct=200 pooled= 9,600 chars= 63,070 @ test:1801  (bypass B)
```

**R11 — gates re-run by the reviewer on the tip export.**
| Gate | Result |
|---|---|
| `tests/core/rulebook.test.ts` | 6/6, exit 0 |
| `tests/core/rulebook-links.test.ts` | 3/3, exit 0 |
| `tests/security/fountain-shape-guard-cue-parity.test.ts` | **654/654, exit 0** |
| `tests/routes/fountain-shape-guard-cue-bypass.test.ts` | 57/57, exit 0 |
| `tests/core/analyzer-dos.test.ts` | 12/12, exit 0 |
| `tests/core/brain-coverage.test.ts` | 7/7, exit 0 |
| `npx tsc --noEmit` | 0 errors, exit 0 |
| `check-brain` | "OK. 104 notes, 376 links, graph is fresh." exit 0 |
| `honesty-audit` | "scanned 458 files … clean." exit 0 |
| `check-docs` | "No AI writing patterns detected." exit 0 |
| `check-no-console` | "304 file(s) … OK." exit 0 |
| `check-scoring-receipt 6b4ea31f..08a67802` | "no scoring-path files changed. OK." exit 0 |
| output identity, **GIT_SHA pinned, no `--ignore-keys`** | "PASS — all 45 reports are byte-identical (analyzedAt excluded)." exit 0 |

(The suite needs a git repo in the export — `git ls-files -- *.fountain` at
`tests/security/…:271`; without `git init` in the export 4 suites abort and the
count reads 577/573. That is an export artifact, not a lane defect.)

Both commits carry both trailers (`Co-Authored-By:` and `Claude-Session:`).
No model identifier appears anywhere in the diff's content, `brain.graph.json`
included.

---

### Verdict: **REVISE**

Finding 14 is done properly and I would merge it on its own: root cause
correctly identified as broader than the brief's symptom, fix is shape-general
rather than a widened magic number, the guard was shown to fire on the real
pre-fix extraction, and the freshness test was shown to fail on the unfixed
input. Finding 10's bound is **under-derived**: it brackets the fixture
weights it was fitted to, and does not bracket cost.

---

#### 1. BLOCKER — the new bound admits a 27.3 s analysis; the guard no longer brackets cost

`server/lib/validation.ts:638` (`MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT = 1_500_000`).

The bound's whole purpose is to reject before the analyzer pays. Because the
guard also requires every speaker to clear `VOICE_ELIGIBLE_MIN_WORDS = 30`
(`:567`), the maximum distinct cast the bound admits is
`sqrt(1,500,000 / 30) = 223`. A 50 KB document with 223 speakers of exactly 30
words each has weight `223 × 6,690 = 1,491,870` — under the bound — and is
**ACCEPTED**:

```
uniform-min 223×30 | distinct 223 | pooled 6,690 | weight 1,491,870
                   | chars 50,172 | guard ACCEPTED | wall 27,558 ms / 27,295 ms
uniform-min 224×30 | distinct 224 | pooled 6,720 | weight 1,505,280
                   | chars 50,396 | guard REJECTED | wall 29,439 ms
```
Reproduce: build `cast` speakers, each `CHARACTERi\n\n` followed by five
`this is ordinary lowercase dialogue here\n\n` paragraphs (the double-spaced
bypass-B wrap shape, so `normalizeScreenplay` reflows every paragraph into
dialogue), 40 cues per scene; then `fountainShapeRejectionReason(text)` and
`runScriptDoctor(text)`. Script at
`<session scratch>/rulebook-review/probe/build3.ts` + `measure.ts`.

Three things follow, each measured:

* **The accept/reject line no longer separates cheap from expensive.** It now
  falls between 27.3 s (accepted) and 29.4 s (rejected). Under the old bound
  the same shape's ceiling was `100 × 30 = 300,000` → **6.4 s**. The change
  multiplies the accepted worst case by **4.3×**.
* **It is at the analysis budget.** `DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS = 30_000`
  (`server/lib/doctor-budget.ts:124`, Decision #7). 27.3 s is 91% of it on my
  box; scaled by the 1.31× factor measured on the lane's own committed
  probe-cast-60 fixture, the same document is **≈36 s on the lane's box —
  over the budget**. The writer then gets row 72's "took longer than this
  server's per-analysis budget (30s) … nothing was scored" instead of the
  guard's honest "trim the cast", after burning 30 s of a worker. That is the
  same "no score, no report" outcome finding 10 objected to, reached more
  expensively.
* **It is a DoS regression against `main`.** 50 KB of text now buys ~27 s of
  worker CPU where `6b4ea31f` rejected the identical document (confirmed:
  baseline decision on the 223×30 document is REJECTED). Bypass B — a payload
  this file pins as an attack — costs 31.1 s, only 13% more than the heaviest
  thing the new bound lets through, and it is rejected in <500 ms
  (`test:1805`).

The bracket in the comment at `:611-620` is between two *fixture weights*
(606,000 and 1,920,000). Weight is not a cost proxy across shapes: at
essentially the same weight, 99×15,000 costs 16.1 s and 223×30 costs 27.3 s —
a 1.7× spread — because `analyzeVoices` is O(distinct²) and the product is
linear in distinct.

What a stronger version would have done: keep the file's own
cost-per-unit method (item 2) and pick the largest bound whose *max-distinct*
shape stays inside the previously-recorded ~14 s residual. From R9 that is
between `180×30` (972,000 → 18.6 s) and `150×30` (675,000 → 12.5 s) on my box
— i.e. roughly **650,000–700,000**, which still admits every cast the lane
measured (cast 40 = 606,000) and still admits an ordinary 40-character
ensemble, while keeping the old bound's cost contract. That is a smaller
answer to finding 10 than 1,500,000, but it is one the guard's contract
supports. In scope: yes — it is the same one-constant edit.

#### 2. The file's own rate-based derivation was deleted, not re-applied

`server/lib/validation.ts:488-496` still carries the round-2 fit —
"cost ≈ C × (eligible-distinct-count) × (total pooled words) … C in
0.01-0.022 ms per unit". `6b4ea31f:server/lib/validation.ts:573-577` applied
it: "300,000 × the worst observed rate (0.022 ms/unit) predicts a ~6.6 s
ceiling, comfortably under the review's ~10 s target with margin for a slower
box." The lane deleted that sentence and replaced the derivation with a
fixture bracket. Applying the retained model to the new value gives
`1,500,000 × 0.022 = 33,000 ms` — **above the 30 s budget**, and within 20% of
what I actually measured (27.3 s on a box 1.31× faster than the lane's). The
method that was already in the file would have caught this before the constant
was written. LANE_STANDARD §6.3: this is a widened tolerance reported as
"done".

#### 3. The constant's own comment contradicts the value it sets

`server/lib/validation.ts:598-602`: "the O(distinct²) cost this bound exists to
stop is driven by DISTINCT COUNT far more than by this product once the cast
stays in the dozens, not the hundreds." The bound set eight lines later admits
**223 distinct speakers** — hundreds, the regime the sentence names as
dangerous. `:617-620` says the bound "admits any cast this repo's own
neighbouring comment already calls ordinary"; it admits 2.25× more than that
(223, not 99). LANE_STANDARD §2, copy tells the truth. Fix with the value
(item 1), or state the true max-distinct the bound admits and why it is
acceptable, with the number.

The brain note `docs/brain/Gates/Gate - Fountain Shape Guard.md` ("What it
cannot catch") does flag this hazard qualitatively — "a large-but-plausible
cast with an unusually high per-pair cost could still be expensive within this
bound" — which is honest, but §3 requires the number, and the number is the
one that shows the bound is mis-set.

#### 4. The six-row timing table is not reproducible from anything committed

Lane report §3 and `server/lib/validation.ts:592-598` quote weights
227,250 / 303,000 / 378,750 / 454,500 / 606,000 / 909,000 from "probe-cast.ts",
which is not in the tree. Running the committed generator
(`tests/security/fountain-shape-guard-cue-parity.test.ts:2950`,
`buildProbeCastFeature`) and the production weight computation gives
303,840 / 609,600 / 916,200 for casts 20/40/60 — close, but not the quoted
numbers, and the audit's own reproduction gives a third set (302,400 at cast
20). The differences are immaterial to any decision; the reproducibility is
not. Either cite the committed generator's numbers, or commit the probe. Wall
times are box-dependent and reproduce in shape only (mine are 1.31× faster).

#### 5. `generateRulebook` leaves a partially-regenerated directory when the guard throws

`scripts/generate-rulebook.ts:923-945`: `README.md`, the 14 pass docs and
`excellence.md` are written before `renderRootCausesDoc` is reached, and
`genre.md` after, so a throw at `:809` leaves `outDir` with 16 of 18 files
rewritten and no `genre.md`. Harmless today (the other files are byte-identical
on a clean tree) but the error text says "refusing to emit root-causes.md"
while the run has already emitted most of the catalog. Render everything to
memory first, then write — or say what actually happened.

#### 6. Non-blocking — the identity gate is stronger than the report claims

The report records "byte-identical **modulo** `provenance.engineCommit` via
`--ignore-keys`". Pinning `GIT_SHA` equal on both snapshots (the method the
other lanes in this batch used) gives the full, unqualified result:
```
$ GIT_SHA=00000…0 node scripts/check-doctor-output-identity.mjs --tree <base> --out <before>
$ GIT_SHA=00000…0 node scripts/check-doctor-output-identity.mjs --tree <tip>  --out <after>
$ node scripts/check-doctor-output-identity.mjs --compare <before> <after>
OUTPUT IDENTITY: PASS — all 45 reports are byte-identical (analyzedAt excluded).   exit=0
```
`server/lib/build-info.ts` takes `GIT_SHA` over the local `.git`, so nothing in
the harness needed to be ignored. Claim the stronger gate.

#### 7. Non-blocking — "lightest pinned rejection" is right, with one thing worth recording

R10 confirms bypass B (1,920,000) is the lightest rejection the file *pins* —
the claim at `validation.ts:603-610` is accurate as written. But the file also
contains a document at **1,600,000** that the new bound now rejects
(`test:2737-2754`, described in its own comment as "the realistic-feature
fixture … real characters throughout", 40 speakers × 40,000 pooled words); it
is not a pinned rejection only because that test asserts nothing about this
bound. So the real gap between the bound and the nearest rejecting document in
the suite is **1.067×**, not the 1.28× quoted at `:619-620`. Worth one clause
in the comment.

#### 8. Non-blocking — one more copy of `dsWrapped`

`tests/security/fountain-shape-guard-cue-parity.test.ts:2998` re-implements
ROUND 3's generator (already present at `:1233`, `:1263`, `:1787`, `:2814`) and
then `:3041` inlines a sixth copy of the same thing inside the same test. The
"computed from its own generator, not a literal" property the comment claims is
therefore computed from a *copy* of the generator: if `:1787`'s shape ever
changes, `:3031`'s `assert.equal(weight, 1_920_000)` fails loudly rather than
silently, so the risk is contained — but one shared helper would make the claim
literally true. Pre-existing pattern in this file; noted, not required.

---

### What is already right, and should not be disturbed on revision

* The finding-14 fix is the shape-general one, not a wider magic number, and
  it repaired four `memberRules` clusters that were *already* wrong in the
  committed catalog and invisible to every existing test.
* The well-formedness guard demonstrably fires on the real pre-fix extraction
  (R2), and the freshness test demonstrably fails on the unfixed catalog (R5).
* No scoring-path file changed, proved by the gate's own reachability rather
  than by assertion (R7), and 45/45 reports are byte-identical (R11).
* The 20/30/40-cast ACCEPT proof is real and fail-first (R8). The problem is
  not that those casts are accepted; it is what else the chosen value accepts.

---

## Round 2

Reviewed object: `d43022fe10c5950b4fea205219be82fa38042e59` — one commit on
`8cdec674` (the round-1 object `08a67802` rebased onto `main @ 9cd1805c`), on
`origin/lane/rulebook-and-guard-bound`. Same reviewer. Worked from
`git archive d43022fe` beside the round-1 export;
`/home/user/wt-rulebook` read-only, nothing in `/home/user/STORYMACHINE`
modified except this file. Budget: the touched suites, identity, the receipt
gate, my own probes.

### Round-1 items, re-checked against the round-2 diff

| Item | Round-1 verdict | Round 2 | Evidence |
|---|---|---|---|
| 1 | **BLOCKER** — 1,500,000 admits a 27.3 s analysis | **fixed** | bound is 675,000 (`server/lib/validation.ts:668`), derived from cost on the worst-admitted shape; reproduced below |
| 2 | rate-based derivation deleted, not re-applied | **fixed** | `validation.ts:630-636` re-applies the file's own worst historical rate (0.022 ms/unit × 675,000 = 14,850 ms) as a cross-check on the direct measurement |
| 3 | comment contradicts the value ("dozens, not hundreds" vs 223) | **fixed**, with one wording slip (item 12) | `validation.ts:638-641` states the true admitted maximum (150) |
| 4 | six-timing table unreproducible | **superseded** | the round-2 generator `buildUniformMin` is committed at `tests/security/fountain-shape-guard-cue-parity.test.ts:3030`, and I reproduced its numbers |
| 5 | `generateRulebook` partial write on throw | **not addressed** | acceptable — out of the round's named scope, and non-blocking |
| 6 | identity gate weaker than it needed to be | **fixed** | reproduced below, 45/45 with `GIT_SHA` pinned and no `--ignore-keys` |
| 7 | nearest-neighbour margin was 1.067×, not 1.28× | **superseded** | margin to bypass B is now 2.844×; the 1,600,000 unpinned neighbour is 2.37× clear |
| 8 | one more copy of `dsWrapped` | **declined, reasonably** | pre-existing pattern, flagged as not required |

### Reproductions

`<r2>` = `<session scratch>/rulebook-review/r2` (export of `d43022fe`),
`<base2>` = export of `main @ 9cd1805c`.

**R12 — the worst admitted shape, measured, on my box.** `buildUniformMin(N)`
as committed (N speakers × exactly 5 double-spaced 6-word paragraphs = 30 real
words), `runScriptDoctor` in-process, fresh payload per run (the doctor caches
on `contentHash`, so a repeated identical text reads 0 ms — I hit that trap
too):

| shape | distinct | weight | guard | wall | CPU |
|---|---|---|---|---|---|
| uniform-min N=150 (**at the bound**) | 150 | 675,000 | **ACCEPTED** | 13,418 / 13,894 / 14,023 / 13,709 / 13,804 / 15,093 / 15,241 ms | 12,405 / 12,898 / 13,170 ms |
| uniform-min N=151 (one speaker over) | 151 | 684,030 | **REJECTED** | — | — |

Median wall ≈ **14.0 s**, median CPU ≈ **12.9 s**. The lane reports 12.1 s
median on its box; my seven runs straddle the 15 s design target (two of seven
exceeded it on wall clock) while every CPU sample sits under it. The target is
met, with a thinner margin than the report's "~24%" — on CPU, the quantity the
headroom claim is about, the margin is **12–17%**.

**R13 — the bound holds ACROSS shapes, which is what round 1 was about.**
Three different shapes at or just under 675,000:

| shape | distinct | pooled words | weight | guard | wall | CPU |
|---|---|---|---|---|---|---|
| few-big: probe-cast 44 (largest admitted) | 44 | 15,282 | 672,408 | ACCEPTED | 7,497 / 6,915 ms | 6,747 / 6,667 ms |
| mid: 100 speakers × 66 words | 100 | 6,600 | 660,000 | ACCEPTED | 9,882 / 8,972 ms | 8,774 / 8,815 ms |
| **uniform-min: 150 × 30** | 150 | 4,500 | 675,000 | ACCEPTED | 13,418–15,241 ms | 12,405–13,170 ms |

Cost rises monotonically with distinct count at fixed weight, and the
uniform-min shape is the maximum — exactly what the round-2 derivation
assumes. **Nothing admitted by 675,000 costs more than ~14 s on my box.** The
bound now brackets cost, not fixture weights. Round-1 BLOCKER discharged.

**R14 — the new boundary tests fail on the unfixed tree (§3).** Against
`8cdec674`'s `validation.ts` (bound 1,500,000):
```
round-1 bound 1500000
N=151 on round-1 tree:    ACCEPTED  (=> the new "N=151 REJECTED" test fails)
60-cast on round-1 tree:  ACCEPTED  (=> the new "60-cast REJECTED" test fails)
```

**R15 — no pinned rejection flipped.** Production
`realVoiceEligibleWeightRejectionReason` instrumented in a scratch copy to
record every rejecting weight; whole suite run:
```
# tests 657  # pass 657  # fail 0
REJECTIONS-VIA-BOUND count=62 distinct weights:
684,030 | 916,200 | 1,600,000 | 1,920,000 | 2,400,000 | 4,788,000 | 18,720,000 | 19,656,000
```
Every weight present at round 1 is still present; the two new entries are the
lane's own N=151 and 60-cast cases. Lightest **pinned** DoS/bypass fixture is
still bypass B at 1,920,000 → margin `1,920,000 / 675,000 = 2.844×`, matching
the claimed 2.84×. The unpinned 1,600,000 "realistic-feature fixture"
(`test:2737`) that I flagged at round 1 is now 2.37× clear.

**R16 — the rejection copy a 60-cast writer now sees.**
```
"has too large a cast where every named character speaks enough to be individually
 voice-scored (more than 675000 in distinct speaking characters × their total pooled
 dialogue words) — this is a cast-size and analysis-cost limit, not a formatting
 error; trim the cast or split the draft — bound MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT"
```
True (the constant is interpolated, so the number cannot drift), and it names
two things the writer can do. "Too large a cast" is a partial description —
the binding quantity is cast × pooled words, which is why a 150-speaker sketch
document passes and a 45-speaker feature does not — but the sentence states
that product explicitly in its own next clause, so it corrects itself. Claims
register row 69 carries the new number and the full round-1 → round-2 history;
`honesty-audit` clean.

**R17 — gates re-run by the reviewer on the round-2 export.**
| Gate | Result |
|---|---|
| `tests/security/fountain-shape-guard-cue-parity.test.ts` | **657/657, exit 0** (duration 19.9 s, up from 4.2 s — see item 11) |
| `tests/routes/fountain-shape-guard-cue-bypass.test.ts` | 57/57, exit 0 |
| `tests/core/analyzer-dos.test.ts` | 12/12, exit 0 |
| `tests/core/rulebook.test.ts` | 6/6, exit 0 |
| `tests/core/brain-coverage.test.ts` | 7/7, exit 0 |
| `npx tsc --noEmit` | 0 errors, exit 0 |
| `check-brain` | "OK. 104 notes, 383 links, graph is fresh." exit 0 |
| `honesty-audit` | "scanned 459 files … clean." exit 0 |
| `check-docs` | "No AI writing patterns detected." exit 0 |
| `check-no-console` | "305 file(s) … OK." exit 0 |
| `check-scoring-receipt 8cdec674..d43022fe` | "no scoring-path files changed. OK." exit 0 |
| output identity vs `main @ 9cd1805c`, `GIT_SHA` pinned, **no `--ignore-keys`** | "PASS — all 45 reports are byte-identical (analyzedAt excluded)." exit 0 |

Both trailers present on `d43022fe`; no model identifier anywhere in the
diff's content.

**One correction to my own round 1.** I scaled my 27.3 s N=223 measurement to
"≈36 s on the lane's box" using a 1.31× factor taken from the probe-cast
fixture. The lane's round-2 sweep measures 27,361 ms for the same shape on its
own box — within 1% of mine. The 1.31× was shape-specific and my scaled figure
was wrong; the BLOCKER stood on the unscaled number alone (91% of the budget
on either box), but the extrapolation should not have been stated as it was.

---

### Verdict: **REVISE** — one item

The engineering is right and I want to be explicit about that: the bound is now
derived from measured cost on the shape that actually maximizes cost, I
verified it holds across three different shapes at the same weight (R13), the
boundary tests fail on the unfixed tree (R14), nothing pinned flipped (R15),
the narrowing to 60-cast ensembles is disclosed in the comment, in a test, and
in the brain note rather than hidden, and every gate passes including the
stronger identity form. One item stands between this and MERGE, and it is a
single-line change with the pattern already in this repository.

#### 9. The `ms < 20_000` wall-clock assertion is the exact form this repository already retired for flaking, and it is looser than the target it claims to guard

`tests/security/fountain-shape-guard-cue-parity.test.ts:3055-3061`:
```ts
const start = Date.now();
await runScriptDoctor(text);
const ms = Date.now() - start;
assert.ok(ms < 20_000, `…`);
```
Three problems, and `tests/core/doctor-analysis-budget.test.ts:620-655` already
solved all three for the same measurement:

* **Wall clock is the quantity that has already flaked here.** That file's own
  header records it: "the wall-clock version of this assertion tripped twice on
  trees that did not touch it (18,512 ms and 21,624 ms under load; 8.5 s alone)"
  — a **2.5× load inflation on a fixture costing 8.5 s standalone**. This
  lane's fixture costs **13.4–15.2 s standalone on my box** (R12) inside a
  suite that `npm test` runs in parallel with everything else. The same
  inflation puts it past 20,000 ms comfortably. The comment's claim that 20 s
  is chosen so it will not "flake on ordinary shared-box noise" is not
  supported by the noise this repository has actually recorded.
* **It is looser than the target.** The derivation's target is 15 s (half the
  budget); the assertion admits 20 s. The comment says so ("looser than the 15s
  design target deliberately"), which makes it disclosed, not correct: a
  regression from 12.1 s to 19.9 s would leave the derivation false and the
  test green.
* **`20_000` is a bare literal.** `doctor-analysis-budget.test.ts:642-643`
  derives both of its ceilings from `DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS`, so a
  budget change moves them together. This one decouples.

**The fix, which passes today.** Use the two-part assertion from
`doctor-analysis-budget.test.ts:646-655` verbatim — CPU time against half the
budget, wall clock against the full budget:
```ts
const cpuStart = process.cpuUsage();
const start = Date.now();
await runScriptDoctor(text);
const wallMs = Date.now() - start;
const c = process.cpuUsage(cpuStart);
const cpuMs = (c.user + c.system) / 1000;
assert.ok(cpuMs < DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS / 2, …);
assert.ok(wallMs < DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS, …);
```
I measured this shape at **12,405 / 12,898 / 13,170 ms of CPU** (R12) — inside
the 15,000 ms half-budget on every sample, with 12–17% margin — so the strict
form passes now and would have caught round 1's 223-speaker document (27 s CPU)
outright. No change to the bound is implied.

---

### Non-blocking, for the same edit or the merge note

#### 10. Header item (b)'s cross-shape comparison does not reproduce, and its conclusion is right for the wrong reason

`server/lib/validation.ts:613-622` cites "probe-cast cast=45, weight 681,750 …
about the same, ~12.6s" and concludes the two shapes "are not the 1.7x-apart
pair the reviewer measured at 1.5M". Two corrections: cast 45 measures **686,340**
on the committed generator and is **REJECTED** by this very bound, so the cited
comparator is not a document the guard admits (the largest admitted few-big cast
is 44, at 672,408); and measured (R13) the spread at this weight is **1.9×**
(6.9–7.5 s few-big vs 13.4–15.2 s uniform-min), i.e. wider than the 1.7× at
1.5M, not narrower. The bound is safe anyway — not because the shapes converged,
but because the derivation is anchored on the worst one, which is the correct
method. Delete the convergence claim rather than defend it; it is the weakest
sentence in an otherwise well-evidenced comment.

#### 11. The suite got 4.8× slower, in the file that is not the one that budgeted for it

`tests/security/…` went from 4.2 s to 19.9 s on my box because the N=150 case
runs a real `runScriptDoctor`. `doctor-analysis-budget.test.ts:9-12` explicitly
avoided this shape of cost ("a genuinely slow fixture would add ~14 s to every
CI run to prove the same branch"). Here the slow run IS the proof, so it is not
the same trade — but it is worth one line in the file header saying the suite
now carries a ~14 s cost and why, so the next person to find it does not
"optimize" it away.

#### 12. Two small wording slips in header item (d)

`validation.ts:638-641` says `MAX_FOUNTAIN_FREQUENT_CUE_LINES`'s "dozens … not
HUNDREDS" framing "below is corrected to say so". That comment is **above**
(`validation.ts:541-552`), and it was **not edited** — the contradiction was
removed by lowering the value, not by correcting the neighbour. Say that
instead.

---

### Verdict line

**REVISE** — item 9 only. Items 10–12 are non-blocking and can ride along.
Everything else in round 2 is MERGE-ready and reproduces: the bound is
cost-derived and shape-robust (R12, R13), the new tests fail on the unfixed
tree (R14), no pinned rejection flipped and bypass B's margin is 2.844× (R15),
the rejection copy is true and actionable (R16), and all twelve gates pass
including 657/657 and 45/45 unqualified identity (R17).

---

## Round 3

Reviewed object: `547d630b` — one commit on `df5cde59` (the round-2 object
`d43022fe` rebased onto main), on `origin/lane/rulebook-and-guard-bound`. Same
reviewer, confirmation pass only: two files, 52 insertions / 21 deletions,
`server/lib/validation.ts` **comment lines only** (verified: the diff contains
no non-comment `+`/`-` line in that file, and
`MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT` is still `675_000` at `validation.ts:680`).

### Round-2 items, re-checked

**Item 9 — the timing assertion. Fixed, verbatim and derived.**
`tests/security/fountain-shape-guard-cue-parity.test.ts:3067-3081` now matches
`tests/core/doctor-analysis-budget.test.ts:646-655` in form: `process.cpuUsage()`
around the call, `cpuMs < DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS / 2` and
`wallMs < DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS`, both imported from
`server/lib/doctor-budget.ts` rather than written as numbers. No timing literal
remains in the file — the only `20_000`/`20000` occurrences left (`:454`,
`:852`) are unrelated word-count sanity checks, and `1_920_000` at `:3135` is
bypass B's weight.

**R18 — fail-first reproduces on my box.** Same two-part check applied by hand:
```
uniform-min N=150 (the committed case) | guard ACCEPTED | cpu 12,764ms vs half-budget 15,000 -> PASS | wall 12,781ms vs 30,000 -> PASS
uniform-min N=223 (round-1's document) | guard REJECTED | cpu 26,653ms vs half-budget 15,000 -> FAIL | wall 26,686ms vs 30,000 -> PASS
```
The lane reports 29,034 ms of CPU for N=223 on its box; I measure 26,653 ms —
different boxes, same verdict, and the margin at N=150 is 15%. Note the second
row: the **wall** half of the pair still PASSES on round-1's 27 s document. Only
the CPU-against-half-budget assertion catches it, which is precisely the
argument for using the repo's two-part form rather than any single wall-clock
ceiling.

**Item 10 — the header comparator. Fixed, and the cited numbers are right.**
`validation.ts:615-630` now cites cast 44 at weight **672,408**, measured
6.9–7.5 s, and states the spread against the uniform-min worst case as ~1.9×,
WIDER than 1.7×, with the convergence claim deleted and replaced by the correct
reason the bound is safe (it is derived from the worst shape). Verified on the
committed generator in the round-3 tree:
```
probe-cast 44 weight 672,408 | guard ACCEPTED
probe-cast 45 weight 686,340 | guard REJECTED
```
So the document the comment now cites is one the bound admits, its weight is
exact, and the discarded cast-45 comparator is confirmed to be rejected by this
very bound.

**Item 12 — the ride-along wording. Fixed.** `validation.ts:648-652` now says
the `MAX_FOUNTAIN_FREQUENT_CUE_LINES` framing is "(ABOVE, not below)" and that
"that comment was not itself edited; the contradiction is gone because this
value was lowered to something the framing is actually true of."

**Item 11** (the suite now carries a ~14 s cost) was not taken up; it was
non-blocking and the file's new comment block already explains why the real
`runScriptDoctor` run is there. Fine as is.

### Gates re-run

| Gate | Result |
|---|---|
| `tests/security/fountain-shape-guard-cue-parity.test.ts` | **657/657, exit 0** (18.2 s) |
| `npx tsc --noEmit` | 0 errors, exit 0 |
| `check-scoring-receipt df5cde59..547d630b` | "no scoring-path files changed. OK." exit 0 |
| `check-docs` | "No AI writing patterns detected." exit 0 |
| `honesty-audit` | "scanned 459 files … clean." exit 0 |

Output identity was not re-run this round and does not need to be: the only
`server/**` change is comment text, `MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT` is
unchanged, and round 2's run against `main @ 9cd1805c` already returned 45/45
byte-identical with `GIT_SHA` pinned and no `--ignore-keys`. Both trailers
present on `547d630b`.

### Verdict: **MERGE**

Both round-2 items are closed with the fixes I asked for, in the form I asked
for, and both reproduce on my box: the timing assertion is the repository's own
two-part CPU/wall form derived from `DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS` (N=150
passes at 12,764 ms CPU, 15% margin; round 1's N=223 document fails it at
26,653 ms, while a wall-only check would not have), and the header comparator
now cites a document the bound actually admits, at the right weight, with the
unreproducible convergence claim removed rather than defended. Nothing else in
the lane moved. Finding 14 and finding 10 are both answered, and the round-3
tree is the strongest of the three.
