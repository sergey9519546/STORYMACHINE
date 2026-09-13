# Lane report — `voice-bound-ci-derivation`

- **Worktree:** `/home/user/wt-bound`
- **Branch:** `lane/voice-bound-ci-derivation` (branched from `main` @ `996e27a0`, rebased onto `68d05192`)
- **Tip:** round 1 `48585b18`, round 2 `52303fe1` (pushed to `origin/lane/voice-bound-ci-derivation`, rebased onto `main` @ `68d05192`).
- **Calibration branches (delete after review):** `calibrate/voice-bound-2026-09-13`,
  `…-13b`, `…-13c`, `…-13d` — push-triggered runs of the calibration workflow,
  which cannot be `workflow_dispatch`ed before the workflow reaches the default
  branch (see §2).

## 1. What the thing IS

`server/lib/validation.ts`'s Fountain shape guard runs on every route that
accepts raw Fountain text, before the analyzer sees it. One of its bounds,
`MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT`, exists because `voice-delta.ts`'s
`analyzeVoices` does an O(distinct²) Burrows's-Delta pass, and does it only when
EVERY distinct character clears `VOICE_ELIGIBLE_MIN_WORDS` (30). The bound
rejects a document once, in that all-eligible state,
`(eligible cast) × (their total pooled dialogue words)` crosses 675,000.

On 2026-09-12 that value was re-derived twice — from fixture weights (round 1,
1,500,000, which a reviewer showed admitted a 27-second analysis), then from
measured `runScriptDoctor` cost on the worst shape the ceiling admits (round 2,
675,000). Round 2's derivation is sound in method. Its record says the timings
were taken on "this box" and "the reviewer's box".

Neither box is the one that enforces it. The security suite asserts, on every CI
run, that the worst shape the bound admits costs under half
`DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS` (15,000 ms) of CPU. That assertion runs on
`ubuntu-latest`, inside a parallel `npm test`. The first real Actions run since
2026-09-02 failed it.

## 2. Where the brief was right, and where it was wrong

The brief's hypothesis — *the bound must hold on the slowest machine that
enforces it, and that machine must be named in the record* — is right about the
diagnosis and about naming the machine. Three of its premises are wrong, each
corrected below with the measurement that corrects it.

**(a) `CLAUDE.md` does not mention 675,000.** `grep -n '675' CLAUDE.md
ARCHITECTURE.md README.md AGENTS.md` returns nothing on `main` @ `996e27a0`.
The number appears in `server/lib/validation.ts`, the security suite,
`docs/CLAIMS_REGISTER.md` row 69, `docs/brain/Gates/Gate - Fountain Shape
Guard.md`, `docs/brain/Sessions/Session - 2026-09-12 Adversarial Review.md`, and
the Owner R5 caveat. Nothing was added to `CLAUDE.md`: a guard constant is not
project-memory material, and inventing a mention to satisfy the brief would make
the memory file longer without making it truer.

**(b) "Re-derive the bound" does not work, and the arithmetic says so before any
measurement.** A scalar bound on `cast × pooled words` cannot separate the two
shapes it has to separate. The realistic ensembles this bound exists to keep
serving weigh 457,200 (30-cast) and 609,600 (40-cast) on the committed
probe-cast generator, so a weight bound below 613,470 rejects an ordinary
40-character feature — which is adversarial finding 10, the regression the
2026-09-12 work existed to fix. The runner needs something near 400,000. The two
constraints have no overlap. Measured, at essentially equal weight, the two
shapes are 1.9x apart in cost, because the driver is the O(distinct²) pair
count, not the product.

So the change is a SECOND, orthogonal bound —
`MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT`, on the eligible cast count — with the
weight bound untouched. This is strictly a strengthening, and the no-subtraction
rule is met in the literal sense: the weight bound is evaluated FIRST, so every
payload it rejected is still rejected, with the same message; the new bound only
ever turns an ACCEPT into a REJECT.

**(c) The half-budget CPU target is not, on this machine, a statement about this
guard.** See §6. A legitimate 40-character feature — accepted, unremarkable —
costs 12,057 ms of CPU on the runner under the calibration's load proxy, 80% of
the 15,000 ms ceiling on its own. Most of that budget is the analyzer's baseline
cost on a feature-length document. No cast bound can buy margin against it, and
this lane did not pretend otherwise: it is disclosed here, in the constant's own
comment, and in the test's comment, rather than papered over with a margin that
would have cost the product a 41-character ensemble.

## 3. What changed

| File | What |
|---|---|
| `server/lib/validation.ts` | `MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT = 80`, its derivation comment, and the check in both the production and the retired-legacy branch (the latter so the ROUND 7 equivalence proof keeps comparing two DATA SOURCES rather than two different sets of bounds). Plus `realVoiceWordCountsForMeasurement`, a measurement-only export of the PRODUCTION character-to-word map. |
| `scripts/lib/voice-bound.ts` | The three document shapes and the derivation rule, in one place. `buildUniformMin` and `buildProbeCastFeature` lifted verbatim out of the security suite; `buildUniformCast`/`buildMaxAdmitted`/`maxAdmittedWordsPerSpeaker` new; `deriveCast` + `DERIVATION_MARGIN_FRACTION` + `DERIVATION_SHAPE`. |
| `scripts/lib/machine-fingerprint.ts` | One description of "which machine was this measured on". |
| `scripts/measure-voice-bound-cost.mjs` | The calibration sweep (`npm run measure-voice-bound`). |
| `.github/workflows/calibrate-voice-bound.yml` | Runs it on `ubuntu-latest`. |
| `tests/fixtures/voice-bound-derivation.json` | The runner's table, locked verbatim from the run's own `--json=-` block. |
| `tests/core/voice-bound-derivation.test.ts` | Re-derives the constant from that table on every CI run. |
| `tests/security/fountain-shape-guard-cue-parity.test.ts` | The boundary moved to the cast bound; machine named in both failure messages and in a TAP diagnostic on pass. |
| `docs/CLAIMS_REGISTER.md` | New row 116; row 69 cross-referenced. |
| `docs/brain/…` | Gate note, Owner R5 caveat, the feature-length Branch note, and a new Audit note. |

### The generators are the same bytes

`buildUniformMin` and `buildProbeCastFeature` were written out inside the
"finding 10" describe block, which is why the 2026-09-12 derivation could only
be reproduced by re-typing them. They now live in `scripts/lib/voice-bound.ts`
and are imported by both the calibration script and the suite. Before the move,
both were run against verbatim copies of the inline versions at 11 casts each:
**22/22 outputs byte-identical** (sha256, first 16 hex).

## 4. The tables

Both produced by the same committed script, `npm run measure-voice-bound`. Each
row is two measurements, each in its own child process (the doctor memoizes on
`contentHash`, so a repeated identical payload in one process reads 0 ms).
`max-admitted` is the heaviest document the weight bound admits at that cast;
`uniform-min` is the 2026-09-12 shape; `probe-cast` is a realistic
Zipf-distributed feature.

### This sandbox, idle (load average 0.64 at start, 1.29 at end)

`local: Intel(R) Xeon(R) Processor @ 2.10GHz x4 (parallelism 4, 16 GiB), node v22.22.2, linux/x64`

| shape | N | pooled words | weight | CPU max (ms) | % of the 15,000 ms half-budget |
|---|---|---|---|---|---|
| max-admitted | 50 | 13,500 | 675,000 | 6,296 | 42% |
| max-admitted | 60 | 11,160 | 669,600 | 6,738 | 45% |
| max-admitted | 65 | 10,140 | 659,100 | 6,799 | 45% |
| max-admitted | 70 | 9,240 | 646,800 | 6,966 | 46% |
| max-admitted | 75 | 9,000 | 675,000 | 7,298 | 49% |
| max-admitted | 80 | 8,160 | 652,800 | 7,337 | 49% |
| max-admitted | 85 | 7,650 | 650,250 | 7,903 | 53% |
| max-admitted | 90 | 7,020 | 631,800 | 7,580 | 51% |
| max-admitted | 100 | 6,600 | 660,000 | 8,566 | 57% |
| uniform-min | 150 | 4,500 | 675,000 | 12,091 | 81% |
| probe-cast | 20 | 15,192 | 303,840 | 2,969 | 20% |
| probe-cast | 30 | 15,240 | 457,200 | 4,563 | 30% |
| probe-cast | 40 | 15,240 | 609,600 | 6,060 | 40% |
| probe-cast | 44 | 15,282 | 672,408 | 6,772 | 45% |

An earlier full sweep on the same box (wider `uniform-min` grid) measured
N=60/80/90/100/110/120/130/140/150/160 at
2,141/3,622/4,451/5,608/6,699/8,007/9,279/10,926/12,377/13,939 ms — the curve is
quadratic in cast, as the 2026-09-12 lane said: cost rises 5.78x from N=60 to
N=150 for a 2.5x rise in cast, an exponent of 1.91.

### `ubuntu-latest`, the machine that enforces the bound

Locked verbatim into `tests/fixtures/voice-bound-derivation.json` from run
`34740951649`'s own `--json=-` block.

``github-actions: INTEL(R) XEON(R) PLATINUM 8573C x4 (parallelism 4, 16 GiB), node v22.23.2, linux/x64, runner Linux/X64/ubuntu24/20260907.300.1, run 34740951649``

| shape | N | pooled words | weight | CPU max, idle (ms) | CPU max, load proxy (ms) | % of half-budget (proxy) |
|---|---|---|---|---|---|---|
| max-admitted | 50 | 13,500 | 675,000 | 6,245 | 10,288 | 69% |
| max-admitted | 60 | 11,160 | 669,600 | 6,437 | 10,903 | 73% |
| max-admitted | 65 | 10,140 | 659,100 | 6,593 | 11,091 | 74% |
| max-admitted | 70 | 9,240 | 646,800 | 6,738 | 11,071 | 74% |
| max-admitted | 75 | 9,000 | 675,000 | 6,956 | 11,892 | 79% |
| **max-admitted** | **80** | **8,160** | **652,800** | **7,171** | **11,848** | **79%** |
| max-admitted | 85 | 7,650 | 650,250 | 7,436 | 12,158 | 81% |
| max-admitted | 90 | 7,020 | 631,800 | 7,408 | 12,560 | 84% |
| max-admitted | 100 | 6,600 | 660,000 | 8,023 | 13,836 | 92% |
| uniform-min | 150 | 4,500 | 675,000 | 11,986 | 20,022 | 133% |
| probe-cast | 20 | 15,192 | 303,840 | 2,890 | 5,153 | 34% |
| probe-cast | 30 | 15,240 | 457,200 | 4,319 | 7,708 | 51% |
| probe-cast | 40 | 15,240 | 609,600 | 5,792 | 10,606 | 71% |
| probe-cast | 44 | 15,282 | 672,408 | 6,447 | 11,500 | 77% |

The earlier sweep on the OTHER runner (`calibrate/…-13c`, run 34739790205, an
AMD EPYC 9V74) measured the same `uniform-min` N=150 at **24,052 ms** under the
proxy, and `max-admitted` at 40/80/90/100 at 12,442 / 14,724 / 15,341 /
16,390 ms. That 20.1% spread between two `ubuntu-latest` machines in the same
hour is what `DERIVATION_MARGIN_FRACTION` is, and the cap of 80 was checked
against BOTH: 11,848 ms against a 12,000 ms ceiling on the locked table, and
14,724 ms under the proxy on the slower one, which is 12,939 ms once the proxy's
own 13.8% is taken back out — 86% of the 15,000 ms the assertion enforces.

### What the two tables say together

| | sandbox idle | runner idle | runner, load proxy | runner, real `npm test` |
|---|---|---|---|---|
| uniform-min N=150 (the 2026-09-12 boundary) | 12,091 | 11,986 | 20,022 (this runner) / 24,052 (the other one) | **21,133** (run 34739080950) / 19,713 (run 34736306670) |

The last column is the one that matters: it is the assertion's own measurement,
taken by the assertion, inside the suite, on the machine that gates this
repository. The load proxy is measured **13.8% more expensive** than
that real condition at the same shape on the same day, which is why the
derivation targets the half-budget under the proxy and holds no further margin
back — see `DERIVATION_MARGIN_FRACTION`'s own comment.

## 5. The derivation

Rule, stated once in `scripts/lib/voice-bound.ts`'s `deriveCast`: the largest
swept `max-admitted` cast whose WORST observed CPU sample stays at or under half
`DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS`, with every smaller swept cast clearing it
too (so one noisy-low sample above a noisy-high one can never promote a cast).
Worst sample, not median, because the assertion runs once per CI run and fails
on a single bad sample.

**`MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT = 80`**, at 11,848 ms;
85 (12,158 ms) is the next swept cast and does not clear. The sweep therefore
brackets the boundary rather than running out of grid — `tests/core/voice-bound-derivation.test.ts`
asserts exactly that, because "the largest cast I bothered to measure" is how
round 1 of the 2026-09-12 derivation went wrong.

`MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT` is **unchanged at 675,000**, and so is
every number quoting it. That is the honest answer to the brief's item 2: the
weight bound was not mis-derived on its own terms, and lowering it is what
cannot be done.

**What the pair now admits at worst ON THE ELIGIBLE-SPEAKER DIMENSION**
(narrowed in round 2 — see §11.4): `max-admitted` at cast 80 — 102 words per
speaker, weight 652,800. Above that cast the cast bound rejects; at that cast
the weight bound caps the words. Measured 7,337 ms on this sandbox and
11,848 ms on the runner under the load proxy, and **12,319 ms inside the real
`npm test` on an AMD EPYC 7763 runner (run 34741928418) — 82% of the 15,000 ms
the assertion enforces.** It is NOT the heaviest document both bounds admit:
neither bound constrains document size or scene count, and the same eligible
body padded to the analyzer's 400-scene ceiling is accepted at 14,334 ms.

## 6. What this does NOT claim

The test's own comment says it, and so does the constant's: a 400-scene document
with a genuine one-line walk-on is INELIGIBLE for the voice pass, is accepted by
both bounds, and measures ~12-14 s on a developer box (the "RESIDUAL accepted
worst case" note that has been in `validation.ts` since 2026-09-06). On the
runner that document costs more than half the budget, and neither of these
bounds is the reason or the remedy. The same is true of an ordinary
40-character feature at 12,057 ms under the load proxy. The half-budget CPU
assertion is a statement about the worst shape the ELIGIBLE path admits, not
about everything the analyzer accepts, and a reviewer should read it that way.

## 7. Gates

| Gate | Result |
|---|---|
| `tests/security/fountain-shape-guard-cue-parity.test.ts` | 662/662, exit 0 (16.9 s — it got FASTER: the boundary document dropped from 12.3 s to 7.3 s of doctor time) |
| `tests/routes/fountain-shape-guard-cue-bypass.test.ts` | 57/57, exit 0 |
| `tests/core/analyzer-dos.test.ts` | 12/12, exit 0 |
| `tests/core/doctor-analysis-budget.test.ts` | 27/27, exit 0 |
| `tests/core/voice-bound-derivation.test.ts` | 7/7, exit 0 |
| `tests/core/claims-row-citations.test.ts` | 5/5, exit 0 |
| `tests/core/brain-coverage.test.ts` | 7/7, exit 0 |
| `tests/security/dependency-resolution.test.ts` | 4/4, exit 0 |
| `npm run lint` | exit 0 |
| `npm run check-no-console` | exit 0 — 307 files under `server/` |
| `npm run check-server-reachability` | exit 0 |
| `npm run build` | exit 0 |
| `npm run check-docs` | exit 0 |
| `npm run honesty-audit` | exit 0 — "scanned 465 files … the claims register (116 rows) — clean" |
| `node scripts/check-scoring-receipt.mjs main..HEAD` | exit 0 — **"no scoring-path files changed"**, as the brief expected: `server/lib/validation.ts` sits outside `doctor.ts`'s import graph |
| `npm run check-brain` | exit 0 — "113 notes, 440 links, graph is fresh" |
| `npm run gates` | exit 0 |
| full `npm test` | **13,824 tests, 13,732 pass, 0 fail**, 91 skipped, 1 todo, 377.5 s — once, on the final tree rebased onto `main` @ `68d05192`, load average 1.03 at start |
| CI on the lane branch | requested from the orchestrator after the push — see the final message |

## 8. Runs

| Run | What |
|---|---|
| 34736306670 (attempt 2, `main` @ 996e27a0) | the failure this lane exists for — 19,713 ms |
| 34739080950 (lane, `9380ea08`) | the same failure with the machine now named in the message, and 21,133 ms in a TAP diagnostic that prints on pass as well as on failure |
| 34739117140 (`calibrate/…-13`) | cancelled — superseded before it finished |
| 34739191217 (`calibrate/…-13b`) | first runner sweep; `uniform-min` derivation, both conditions |
| 34739790205 (`calibrate/…-13c`) | second runner sweep; added the `max-admitted` shape |
| 34740951649 (`calibrate/…-13d`) | **the lock run** — the table committed to `tests/fixtures/voice-bound-derivation.json` |
| (requested) | CI on the lane branch after the re-derivation |

The four `calibrate/*` branches could NOT be deleted from this sandbox:
`git push origin --delete calibrate/voice-bound-2026-09-13d` answers
`RPC failed; HTTP 403` and disconnects — the agent proxy refuses ref deletions
the same way it refuses tag pushes (`docs/LANE_STANDARD.md` §7.3). The
orchestrator deletes them; every run id they produced is recorded above, and the
record is the run id, not the branch.

## 9. Left undone, and why

1. **`workflow_dispatch` alone does not work before merge.** GitHub only offers
   a `workflow_dispatch` workflow for dispatch once its file is on the DEFAULT
   branch: `POST /actions/workflows/calibrate-voice-bound.yml/dispatches`
   against the lane branch answered 404, and `list_workflows` showed only the
   four workflows that exist on `main`. The workflow therefore carries a second
   trigger — a push to any `calibrate/**` branch — which is what made the
   derivation possible before the merge. After this lands, `workflow_dispatch`
   is the normal route and the push trigger is a fallback nothing else uses.
2. **A margin for runner-fleet variation is not in the derivation.** The margin
   that is there is measured (the load proxy's own pessimism). Fleet variation —
   a different CPU generation on a future `ubuntu-latest` — is not covered by
   any number this lane measured, and pretending otherwise would be the same
   mistake the 2026-09-12 record made. If it moves, the failure message now
   names the machine and says how to re-derive.
3. **The real fix is inside `burrowsDelta`, and it is free** (corrected in
   round 2 from "cap the pair count", which would have moved scores).
   `corpusStats` is called inside the loop over the 65 function words and
   re-derives `relativeFrequencies` for BOTH characters every time — 130 full
   re-tokenizations per pair, of two maps `burrowsDelta` already holds. Hoisting
   it is the same arithmetic in the same order: **bit-identical**
   (`maxDeltaDiff = 0` over every pair) and 43.8x faster on a 435-pair corpus
   here, 56.0x / 54.3x on the two shapes these bounds are derived against (round-1
   review §2.6). `server/nvm/analyze/voice-delta.ts` IS reachable from
   `doctor.ts` (verified with `computeReachableSet`), so it is scoring-path and
   needs a receipt — this lane changed nothing reachable from `doctor.ts` — but
   it is the fix to hand the scoring lane.
4. **The pre-existing residual (§6) is untouched.** An ineligible-walk-on
   document at the 400-scene ceiling still costs ~12-14 s locally and more on
   the runner. It is out of this bound's reach by construction.

## 10. Log

```
git log --oneline origin/main..HEAD
8076d503 docs(audit): the calibration branches cannot be deleted from the sandbox (proxy 403 on ref deletion)
944ef19b feat(guard): MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT = 80, derived on ubuntu-latest
598cbae8 feat(guard): a second, orthogonal bound — MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT
f0337297 feat(calibrate): sweep the shape the weight bound ACTUALLY admits, not the cheapest one
8641a554 ci(calibrate): print the lock file into the log (--json=-)
f327b12e ci(calibrate): also run the voice-bound calibration on a calibrate/** branch push
2e57f9d4 feat(guard): calibration script + runner workflow for the voice-bound derivation
```

`Tip: 48585b18`

---

# Round 2 — against `docs/audits/2026-09-13-ci-green/voice-bound-review.md` (reviewed object `026c0948`)

Nothing in the design moved: weight bound 675,000, cast bound 80, weight
evaluated first, the workflow, the shapes. Every item below is the record
catching up with measurements — three of which this round took itself, and one
of which (the cast-80 cost inside the real `npm test`) removes the piece of
cross-machine arithmetic the review objected to rather than repairing it.

**One measurement the review did not have, and it settles items 2 and 3.** The
assertion's own pass-time TAP diagnostic, from CI run `34741928418` on the
reviewed object:

```
# voice-bound worst-case cost: max-admitted N=80 (102 words/speaker)
#   cpu 12319ms (82% of the 15000ms half-budget target), wall 12769ms
#   — github-actions: AMD EPYC 7763 64-Core Processor x4 (parallelism 4, 16 GiB),
#     node v22.23.2, linux/x64, runner Linux/X64/ubuntu24/20260907.300.1,
#     run 34741928418
```

The shipped boundary shape, measured by the assertion, inside the real
`npm test`, on a **third** CPU model, at 82% of target. The derivation no longer
rests on a proxy-to-real correction at all.

| # | Item | Disposition | Where |
|---|---|---|---|
| 1 | Comment says "15% margin"; rule applies 0.20 | **Fixed, and the number is gone rather than corrected.** `validation.ts` now names `DERIVATION_MARGIN_FRACTION` and states no percentage — a number in prose beside a number in code is the drift, so the fix is one source, not two agreeing sources. The test already reads the constant (`deriveCast`'s default) and asserts `fixture.marginFraction === DERIVATION_MARGIN_FRACTION`. | `server/lib/validation.ts:732-745` |
| 2 | The 13.8% proxy correction is cross-machine | **Withdrawn, not repaired.** Run `34739080950` IS an AMD EPYC 9V74 (its own failure message names it), but I could not cheaply confirm the CPU of `34739790205`, and the correction is no longer needed: the end-to-end measurement above replaces it. `DERIVATION_MARGIN_FRACTION`'s comment now cites only same-condition comparisons, names the CPU model of every run it cites, lists the **three** models seen (EPYC 9V74, EPYC 7763, Xeon Platinum 8573C), and ends on the verified 12,319 ms. Every sentence that divided by 13.8% is deleted. | `scripts/lib/voice-bound.ts:196-236` |
| 3 | On the EPYC table the stated rule derives `null` | **Stated, in both places a reader will look.** The margin is a fleet-TRANSFER allowance and is applied to the locked table only; applying it again to a table already measured on the slower machine double-counts the same spread. The check against that machine is the raw half-budget: cast 80 reads **14,724 ms** there, inside 15,000 ms with 2% to spare, under a load harsher than the assertion's. And the honest consequence is written down: **the assertion can go red on the slowest fleet member under that load, and no cast this bound could take fixes it** — on the EPYC the smallest cast ever swept (40) already costs 12,442 ms, because feature-scale document cost, not cast size, fills the budget there. A red build there is a machine report, not a guard regression. | `scripts/lib/voice-bound.ts:206-220`, `server/lib/validation.ts:760-771` |
| 4 | "the heaviest document BOTH bounds admit" is false by 1.87x | **Fixed, and reproduced independently.** Subtest renamed to "the worst shape on the ELIGIBLE-SPEAKER dimension these two bounds govern". Reproduced on this sandbox with the lane's own harness: the same 80-speaker body + 398 action-only scenes is **ACCEPTED** at **14,334 ms** of CPU / 400 scenes, against the derivation shape's **7,800 ms** in the same process shape — 1.84x. Recorded in the test's comment, in the constant's comment (as a section of its own, since the `RESIDUAL` note does not cover it — `analyzeVoices` does not abstain here), in the gate note, and in §5 above. What the pair bounds is the eligible-speaker dimension; document size is bounded by `MAX_FOUNTAIN_CHARS`, `MAX_FOUNTAIN_CUE_WEIGHT`, the 400-scene ceiling, and `DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS`'s hard stop. | `tests/security/…:3057`, `:3083-3100`, `server/lib/validation.ts:747-758` |
| 5 | "121-150" is really 81-150; the 15,460 ms is uncited | **Both fixed, and the range is now asserted instead of restated.** Five new subtests drive uniform-min at N=81/90/110/150 (each weighing 196,830-675,000, all under the weight bound) and assert the cast bound rejects them, plus N=80 still ACCEPTED. The uncited 15,460 is replaced by the committed table's own N=150 rows (20,022 ms proxy / 11,986 ms idle). | `tests/security/…:3150-3170`, `server/lib/validation.ts:718-730`, gate note |
| 6 | The fixture's `guard` column was measured under DISTINCT = 65 | **Re-measured, and the test reads it.** `--lock-from` now re-evaluates the column against the shipping tree's guard (a pure function of the text — no analysis run) and records `guardEvaluatedAgainst: {weight, distinct}`. The column now reads ACCEPT for max-admitted 50-80 and REJECT for 85+, and a new subtest re-runs `fountainShapeRejectionReason` over every primary row and compares. Shown failing: flipping the derivation row's verdict fails it by name. Timings are never touched by `--lock-from`. | `scripts/measure-voice-bound-cost.mjs:…`, `tests/fixtures/voice-bound-derivation.json`, `tests/core/voice-bound-derivation.test.ts` |
| 7 | The "real fix" pointer names the score-moving one | **Replaced in all four places, with the mechanism verified here.** Read the code: `corpusStats` is called inside `burrowsDelta`'s loop over the 65 function words and re-derives `relativeFrequencies` for BOTH sides each time. Benchmarked independently on a 435-pair cast-30 corpus: **1,070 ms → 24 ms, 43.8x, `maxDeltaDiff` exactly 0** (the review's 56.0x / 54.3x on the two derivation shapes are cited as theirs). Reachability confirmed with `computeReachableSet(ROOT, ['server/nvm/analyze/doctor.ts'])` → `voice-delta.ts` present, so it stays scoring-path and out of this lane. The stale claim in `scripts/check-scoring-receipt.mjs` that `voice-delta.ts` is unwired is corrected in place. | `validation.ts:772-790`, gate note, `Branch - Feature-Length Defects`, Owner R5, `check-scoring-receipt.mjs:106` |
| 8 | `PATH_TO_EXCELLENCE.md:84`; workflow header; `concurrency` | **All three done.** The 12-14 s claim now names the box and the runner's 19.7-21.1 s. "MANUAL ONLY" replaced with a sentence that matches the file's own two triggers. `concurrency: calibrate-voice-bound-${{ github.ref }}` with `cancel-in-progress`. | `docs/PATH_TO_EXCELLENCE.md:84`, `.github/workflows/calibrate-voice-bound.yml` |

**Pushed back on: nothing.** Two items were answered differently from the way
the review proposed, both in the direction of less prose rather than more:
item 1 deletes the margin number from `validation.ts` instead of correcting it,
and item 2 withdraws the 13.8% correction instead of re-deriving it. Item 3 is
answered with a disclosure the review did not ask for — that no value of this
bound makes the assertion unconditionally green on the slowest fleet member —
because the alternative was to imply a guarantee the measurements do not
support.

**Not addressed (reviewer's own scoping):** LOW 11 (the batch README) is the
orchestrator's. LOW 12 (one shared builder for the two duplicated rejection
messages) follows the file's existing pattern for the weight-bound message and
would touch the retired legacy function's shape; left as the reviewer filed it,
non-blocking.

## Round 2 gates

| Gate | Result |
|---|---|
| `tests/security/fountain-shape-guard-cue-parity.test.ts` | **667/667, exit 0** (five new subtests) |
| `tests/core/voice-bound-derivation.test.ts` | **8/8, exit 0**, 0.35 s — plus the new fail-first (stale guard row) |
| `npm run lint` | exit 0 |
| `npm run check-no-console` | exit 0 |
| `npm run check-docs` | exit 0 |
| `npm run honesty-audit` | exit 0 |
| `node scripts/check-scoring-receipt.mjs origin/main..HEAD` | exit 0 — no scoring-path files changed |
| `npm run check-brain` | exit 0 — 113 notes, 441 links |
| full `npm test` | **not re-run** — the round-2 diff is comments, docs, one fixture column and five guard-only subtests; the cost rule for this round says the touched files only. Round 1's full run (13,824 / 0 fail) stands on the same tree plus these. |

`Tip: 52303fe1` (round 2)
