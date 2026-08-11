# STORYMACHINE — ULTRAPLAN (short execution brief)

*Re-spined 2026-07-14 after the product teardown. `ROADMAP.md` is the
canonical plan and `NORTH_STAR.md` is the constitution. This file is the
short cold-start answer to: **what do I do next?** If any detail here drifts
from the roadmap, the roadmap wins.*

> **Current status — 2026-08-08.** `ROADMAP.md` §3 is the authority. P0
> fielding is GO, but there are **0 valid documented human sessions** and no
> P0 outcome verdict. **P1 is active/partial**: evidence-gated work may run in
> parallel, never substitutes for P0 human evidence, and the P1 exit gate is
> not met. **P2 and P3 are complete.** P4 retention/lock-in remains blocked
> until P0 PASS and the required P1 evidence. The sections below summarize
> those lanes and their gates without replacing the roadmap.

## 0. The decision

StoryMachine is now one product by default: **private, instant, trustworthy,
reproducible screenplay coverage for a screenwriter who wants feedback before
paying a reader or submitting a draft.** Doctor + Editor is the wedge.
OASIS and the research surfaces remain available only as filed Labs work.

The project has strong deterministic engineering but no documented evidence
in this repo that a real writer wants the output. Its former headline metric
is also non-load-bearing: the live generated rulebook is 3,216 pass-scoped
constants (the earlier "8,917" figure was shown to be inaccurate by the
2026-07-14 audit), while the doctor's own diagnostics report rule-channel AUC
~0.076 versus scene-count scarcity AUC ~0.938. Reproducibility is real; score
validity on real writing is not yet proven.

The dependency order remains:

> **Validate demand → prove the score → simplify the product → make the report
> shareable → build retention.**

This is a dependency order, not a blanket serial-work freeze. The roadmap's
machine-checked evidence gates permit bounded P1 work in parallel with the P0
human lane; they do not permit engineering output to stand in for P0 evidence.

## 1. ACTIVE HUMAN LANE — P0: validate with real writers

**Status:** P0 fielding is GO. There are 0 valid documented human sessions and
no P0 outcome verdict. This evidence lane remains the highest priority and
nothing in P1, P2, or P3 can satisfy its exit gate.

**Field materials:** [operating kit](docs/user-validation/P0_OPERATING_KIT.md)
· [session template](docs/user-validation/P0_SESSION_TEMPLATE.md) ·
[phase tracker](docs/user-validation/PHASE_TRACKER.md)

**Core question:**

> After seeing the existing sample coverage report, does a screenwriter want
> to run their own draft? Why or why not?

### P0 work

1. Recruit at least **5 real screenwriters** with drafts in hand. Any career
   tier is acceptable; record enough context to interpret the session.
2. Show each person the existing sample flow and coverage report. Do not
   explain the engine, rule count, NVM, or intended answer first.
3. Observe where they understand, hesitate, distrust, or lose interest.
4. Ask the core question above, then ask:
   - What part, if any, felt useful enough to act on?
   - What did you distrust or need evidence for?
   - What would you do next with this report?
   - Would you run a private draft now? Would you pay? Why?
5. Record exact language, not a founder's interpretation. Separate observed
   behavior from interview claims.
6. Summarize the sessions in one evidence artifact. Do not add a new doctrine
   hierarchy; link the artifact from `ROADMAP.md` P0 when complete.

### P0 exit gate

At least **5 documented sessions** produce a clear answer to whether the
report creates pull toward running a writer's own draft.

- **Positive/qualified signal:** record the P0 verdict and feed the objections
  and trust requirements into the active P1 evidence work.
- **Negative/ambiguous signal:** STOP. Reframe the persona, report, or problem
  and repeat P0. Do not compensate by adding features or rules.

## 2. ACTIVE / PARTIAL — P1: prove the score on runnable real writing

P1 is active/partial under the roadmap's evidence gates and may run in parallel
with P0 fielding. It never substitutes for P0 human evidence. The One Bet is a
score that demonstrably separates strong from weak real writing — not a larger
rulebook — and the P1 exit gate is not met.

### Known baseline

- The corpus is 761 scripts with a pre-registered 60/20/20 split and a
  hash-locked test set.
- The dialogue-diversity deduction reached test AUC 0.990.
- Final pooled test AUC is 0.754, below the 0.80 gate; SHUFFLE/DROP/RELOCATE
  remain the structural gap at 0.73/0.77/0.52.
- The composite synthetic minimum-gap guard remains below its 5.0 threshold.
- The generated rule inventory remains frozen at 3,216 pass-scoped constants.

### P1 work

1. Build a legally distributable, **runnable-in-CI** benchmark from real
   drafts: Creative-Commons/public-domain screenplay material where available,
   plus author-contributed drafts licensed explicitly for testing. Do not
   manufacture synthetic "bad" scripts.
2. Obtain blinded pairwise judgments from >=3 independent experienced readers;
   measure inter-rater agreement and preserve disagreement rather than forcing
   false ground truth.
3. Pre-register the split, metrics, and gates before changing formula
   constants. Keep a held-out set the implementer cannot tune against; version
   and hash fixtures and labels.
4. Measure each score component and candidate signal independently. Rebuild
   around the smallest set that shows held-out separation; remove or neutralize
   proxy terms such as script length without craft evidence.
5. Integrate the landed emotional-arc channel only if it improves held-out
   doctor-level discrimination without calibration or produced-floor
   regressions.
6. Close the composite minimum-gap guard through measured false-positive
   reduction — never by a global curve tweak that merely moves the fixture.
7. Freeze rule growth: add no entries to the current 3,216-entry generated
   catalog; treat the distinct rule concepts as the maintained conceptual
   set. Author no new wave. Removal is a separately approved migration after
   dependency mapping, never implied by "freeze."

### P1 exit gate

- On a pre-registered held-out set large enough to report uncertainty,
  real-writing discrimination point-estimate AUC **>= 0.80**; report a 95%
  bootstrap interval whose lower bound is **> 0.65**.
- Shuffle-drop AUC **>= 0.80**.
- Act-swap AUC **>= 0.70**.
- Composite minimum-gap guard passes at **>= 5.0**.
- No benchmark leakage or material regression in deterministic, keyless,
  calibration, produced-floor, security, type-check, or build gates.

If the thresholds cannot be met without unstable proxies or benchmark
leakage, report that result and revisit the product claim. Do not hide it
behind another rule expansion.

## 3. CURRENT STATE — P2/P3 complete; P4 blocked

### P2 — Collapse to Doctor + Editor ✅ COMPLETE

The default journey is **open/paste script → coverage report → per-scene fixes
→ export.** OASIS and the research panels are gated behind the Labs flag.

**Exit:** a new user reaches a first report with zero Labs jargon exposure;
time-to-first-report is instrumented.

### P3 — Make the report the growth unit ✅ COMPLETE

Exported reports carry the claims needed for re-attestation, and the in-app
verification path re-derives the score against the script's `contentHash`.
Export rate and time-to-first-report are instrumented.

**Exit:** a recipient can independently verify a shared report; export/share
rate is measured.

### P4 — Retention and defensibility

**Blocked:** do not begin retention/lock-in work until P0 PASS and the required
P1 evidence. Only after those gates: draft-history progress, jump-to-line and
deterministic fixes, then auth/accounts for durable multi-user use.

**Exit:** returning-user and multi-revision-session rates are measured.

## 4. Frozen / filed — not current work

Do not pull these forward without explicitly changing `ROADMAP.md` sequencing:

- Program v2 / 3-rules-plus-6-tests wave cadence — **retired**.
- Rule-count growth and Wave 1191-style template expansion — **frozen**.
- OASIS simulation, OWNE O1–O5, STORY GOD SG1–SG6, D/R/B-wave remnants —
  **Labs / filed**.
- Research-paper intake as a roadmap driver — **retired**; adopt a mechanism
  only when a validated user need requires it.
- Corpus growth to 150+ and OCR recovery — filed; benchmark usefulness and
  legal/runnable access matter more than corpus size.
- Autonomous full-script generation, permanent multi-agent swarm, graph DB,
  MAP-Elites/RL at launch, LLM-as-judge, TS-SF-as-gate — rejected/deferred for
  reasons recorded in `ROADMAP.md` §8 and the research-audit documents.

Historical quality documents and research audits remain useful evidence, not
active work queues.

## 5. Preserve these foundations

Every phase keeps the assets that are genuinely differentiated:

- No LLM in the verdict path.
- Keyless-first boot and functional analysis-only mode.
- Honest degradation — labeled fallback, never silent substitution or 500.
- `contentHash` determinism and reproducibility receipts.
- Server-side-only AI calls and secret hygiene.
- Zod validation, appropriate rate limits, production security controls.
- Server-side re-run for authentic coverage export.
- CI no-console rule, keyless test posture, full lint/test/build before push.

These are necessary trust foundations. They are not proof that the score is
correct or that users want it.

## 6. Expensive cautions — still binding

- **Runnable real evidence, always.** Synthetic fire/no-fire fixtures are
  necessary but insufficient. An env-gated test that skips in CI cannot be
  the sole evidence for a product claim.
- **Do not tune and evaluate on the same examples.** Preserve a held-out set
  and record benchmark/version hashes with results.
- **Density normalization eats rule families at feature scale.** Structural
  document findings require bounded deductions, not more issue instances.
- **Lexicon detects content, not position.** Arc-order claims require
  position-aware channels and held-out proof.
- **Parallel sessions are real.** Read the current branch, pull its integration
  target, and check `git log` before implementation; never hardcode a branch.
- **OneDrive can truncate files and inflate CRLF diffs.** Use the safest
  available working path, verify byte counts for large transfers, and inspect
  diffs before committing.
- **No destructive cleanup by implication.** "Kill" means hide or stop
  investing. File deletion requires dependency review and explicit approval.

## 7. Definition of done for this roadmap

There is no single engineering finish line called "v1.0-north-star." The
roadmap advances only when evidence clears each phase gate:

1. Writers show real pull toward running their own drafts.
2. The score separates strong from weak real writing on a runnable held-out
   benchmark.
3. The default product exposes one clear Doctor + Editor journey.
4. The report is shareable and independently verifiable.
5. Returning writers use it across revisions.

Current execution has two active lanes: P0 human fielding and bounded,
evidence-gated P1 work. P0 remains at 0 valid documented human sessions with
no outcome verdict; P1 remains partial with its exit gate unmet; P2 and P3 are
complete. P4 remains blocked until P0 PASS and the required P1 evidence.
