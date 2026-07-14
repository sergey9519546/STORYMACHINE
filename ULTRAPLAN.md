# STORYMACHINE — ULTRAPLAN (short execution brief)

*Re-spined 2026-07-14 after the product teardown. `ROADMAP.md` is the
canonical plan and `NORTH_STAR.md` is the constitution. This file is the
short cold-start answer to: **what do I do next?** If any detail here drifts
from the roadmap, the roadmap wins.*

## 0. The decision

StoryMachine is now one product by default: **private, instant, trustworthy,
reproducible screenplay coverage for a screenwriter who wants feedback before
paying a reader or submitting a draft.** Doctor + Editor is the wedge.
OASIS and the research surfaces remain available only as filed Labs work.

The project has strong deterministic engineering but no documented evidence
in this repo that a real writer wants the output. Its former headline metric
is also non-load-bearing: ~5,701 of 8,917 generated rules are permutations
from 7 templates, while the doctor's own diagnostics report rule-channel AUC
~0.076 versus scene-count scarcity AUC ~0.938. Reproducibility is real; score
validity on real writing is not yet proven.

Therefore the order is fixed:

> **Validate demand → prove the score → simplify the product → make the report
> shareable → build retention.**

Do not parallelize phases. The ordering is the strategy.

## 1. ACTIVE NOW — P0: validate with real writers

**Status:** No completed user-validation sessions are documented in the repo.
P0 blocks new product and engine work. Critical security fixes are the only
exception.

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

- **Positive/qualified signal:** proceed to P1 using the objections and trust
  requirements as P1 inputs.
- **Negative/ambiguous signal:** STOP. Reframe the persona, report, or problem
  and repeat P0. Do not compensate by adding features or rules.

## 2. NEXT — P1: prove the score on runnable real writing

P1 begins only after P0 clears. The One Bet is a score that demonstrably
separates strong from weak real writing — not a larger rulebook.

### Known baseline

- 6 synthetic discrimination pairs; two hard pairs clear by only +1.4 and the
  composite pair still misses its 5.0-point minimum-gap guard.
- 20-sample calibration corpus is synthetic controlled-richness data.
- The 72-produced-script corpus text is outside the repo, so its harness skips
  without `REAL_SCRIPT_CORPUS_DIR`; it is a produced-floor check, not a
  strong-vs-weak discrimination test. Manifest: 71 RECOMMEND + 1 CONSIDER.
- Shuffle-drop AUC ~0.652 (hard floor 0.622).
- Raw act-swap ~0.48; doctor-level bounded deduction ~0.62; emotional-arc
  diagnostic signal ~0.647.
- Rule-channel AUC ~0.076; scene-count scarcity AUC ~0.938.

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
7. Freeze rule growth: add no entries to the current 8,917-entry generated
   catalog; treat ~2,300 distinct rule concepts as the maintained conceptual
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

## 3. THEN — P2 through P4

### P2 — Collapse to Doctor + Editor

Default journey: **open/paste script → coverage report → per-scene fixes →
export.** Gate OASIS and the ~38 research panels behind one Labs flag. Remove
NVM/converge/twin/simulation vocabulary from first-run paths.

**Exit:** a new user reaches a first report with zero Labs jargon exposure;
time-to-first-report is instrumented.

### P3 — Make the report the growth unit

Turn the existing authentic server-side coverage export into a presentable
PDF/HTML artifact: verdict, five craft dimensions, top five fixes, and a
third-party verification path that re-derives the score against the script's
`contentHash`.

**Exit:** a recipient can independently verify a shared report; export/share
rate is measured.

### P4 — Retention and defensibility

Only after trust: draft-history progress, jump-to-line and deterministic fixes,
then auth/accounts for durable multi-user use.

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

Until P0 clears, **the next task is user validation — not another detector,
rule, panel, agent, research intake, or architecture layer.**
