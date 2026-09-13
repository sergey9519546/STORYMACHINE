# Lane report — `voice-bound-ci-derivation`

- **Worktree:** `/home/user/wt-bound`
- **Branch:** `lane/voice-bound-ci-derivation` (from `main` @ `996e27a0`)
- **Tip:** see the Tip line at the end of this file.
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

**What the pair now admits at worst:** `max-admitted` at cast 80 —
102 words per speaker, weight 652,800. Above that cast the cast
bound rejects; at that cast the weight bound caps the words. Measured
7,337 ms on this sandbox and 11,848 ms on the runner under the load
proxy.

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
3. **The analyzer-side pair cap is still the real fix.** Capping
   `analyzeVoices`'s O(distinct²) pair count would let both bounds rise. It is
   scoring-path and belongs to the scoring lane; this lane changed nothing
   reachable from `doctor.ts`.
4. **The pre-existing residual (§6) is untouched.** An ineligible-walk-on
   document at the 400-scene ceiling still costs ~12-14 s locally and more on
   the runner. It is out of this bound's reach by construction.
