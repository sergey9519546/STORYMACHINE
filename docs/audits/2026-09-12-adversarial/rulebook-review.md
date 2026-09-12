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
