# P1 Readiness Assessment — what's blocked vs. pre-buildable

> **Status: P1 is NOT HARD-BLOCKED on P0.** The P0 hard-gate was retired
> 2026-08-11 (`docs/DECISION_LOG.md` Decision #2); engine work proceeds in
> parallel with P0. The remaining P1 blocker is the real corpus + human
> labels (not in this environment). This document separates what is genuinely
> blocked on those inputs from what is pre-buildable infrastructure that
> touches no experiment, no score, and no held-out data — so that when the
> corpus arrives, the P1 launch is days, not weeks.
>
> This is an assessment, not an execution plan. Nothing here starts a P1
> experiment, builds a benchmark, collects labels, or changes scoring.

## The three hard blockers (none are agent-fixable)

1. **P0 has not cleared.** 0/5 sessions. ROADMAP §3 orders the phases
   strictly; P1 starting before P0 would repeat the rigor-before-demand
   anti-pattern the 2026-07-14 re-spine corrected. This is non-negotiable.

2. **No weak human-written comparison class exists.** P1's entire claim is
   "does the score order weak human writing below strong human writing?"
   (`PRE_REGISTRATION_PROTOCOL.md` H1). The on-disk corpus (73 produced
   features in `../real-script-corpus`, ~53 in `data/screenplays/`) is the
   STRONG class only — all produced pro animation features. There is no
   directory of weak/amateur human-written screenplays anywhere on this
   machine (verified 2026-07-28). `SCREENPLAY_SOURCING_TODO.md` Task 1 names
   this as the highest-priority gap. Producing it is human sourcing work
   (find rights-cleared amateur specs, contest rejects, student drafts with
   permission) — not something an agent can fabricate, and synthetic "bad"
   scripts are explicitly forbidden as a substitute.

3. **No blinded human labels exist.** `PRE_REGISTRATION_PROTOCOL.md` requires
   ≥3 independent experienced readers giving blinded pairwise judgments, with
   inter-rater agreement measured and disagreements preserved. Zero labels
   exist (`evals/scoring/human/` has a protocol + importer contracts but no
   `labels/*.jsonl`). Recruiting and running readers is human work.

## What already exists (P1 assets, inventory-only)

| Asset | Location | State |
|---|---|---|
| Pre-registration protocol | `docs/p1-benchmark/PRE_REGISTRATION_PROTOCOL.md` | Template, version 1.0; gate = AUC ≥0.80, CI LB >0.65 |
| Split strategy | `docs/p1-benchmark/SPLIT_STRATEGY.md` | 60/20/20, held-out by script/writer |
| Sources research | `docs/p1-benchmark/SCREENPLAY_SOURCES_RESEARCH.md` | Legality per source |
| Manifest schema | `docs/p1-benchmark/corpus-manifest-schema.json` | Defined |
| Label importer contracts | `evals/scoring/contracts/human-label-import.ts` | Parses/validates JSONL |
| Human labeling task | `evals/scoring/human/HUMAN_LABELING_TASK.md` | Protocol, role-separated |
| Current-score evidence | `docs/scoring/REAL_SCRIPT_DISCRIMINATION_2026-07-28.md` | Produced-floor + degradation AUC (NOT strong-vs-weak) |
| Score behavior summary | `docs/scoring/WHAT_THE_SCORE_DOES_2026-07-28.md` | Plain-language |

## What IS pre-buildable (no experiment, no score change, no held-out data)

These are pure tooling/scaffolding. Building them now does not start P1 —
they have no data to run on and change nothing about the score. They remove
launch friction so P1 can begin immediately on P0-GREEN.

- **A held-out split + hashing tool** that takes a corpus + manifest and emits
  a deterministic, versioned, SHA-locked train/val/test split, with the test
  set's hashes published before any scoring touches it (per
  `SPLIT_STRATEGY.md`). No real data yet — just the mechanism.
- **A bootstrap-CI AUC runner** (point estimate + 95% CI lower bound) that
  the eventual held-out evaluation will call. The current `measure-real`
  harness computes AUC but no CI; the pre-registration requires the CI LB.
- **An inter-rater agreement runner** (Krippendorff's α or Fleiss' κ over the
  label importer's output) that reports agreement AND preserves
  disagreements rather than forcing consensus — a pre-registration
  requirement with no current implementation.
- **A "no-leakage" check** that verifies the implementer cannot access the
  held-out test split (access control + hash verification), pre-registered
  before any model work.

These four are the difference between "P1 starts" and "P1 starts and is
credible." They are explicitly allowed pre-P1 work *in the same sense* the
`measure-real` harness was: tooling that produces no claim until data exists.

## What is NOT pre-buildable (and why)

- **The benchmark corpus itself** — requires the missing weak class +
  rights clearance per script. Human sourcing.
- **The labels** — requires recruited readers. Human.
- **Any scoring/formula/constant/rule/detector change** — frozen under P0;
  P1 requires pre-registration FIRST, then held-out proof. Even reading the
  score's current behavior (done in `measure-real`) changes nothing.
- **The actual AUC result** — no data, no result. Pre-registration exists
  precisely so the result cannot be tuned into existence.

## Recommendation (for the decision owner)

Do not start P1 now. But if you want launch-day readiness, the four
pre-buildable tools above are a legitimate, freeze-safe workstream — they
touch no experiment and no score. They can be built speculatively and will
sit idle until the corpus/labels arrive (the P0 hard-gate was retired
2026-08-11; the corpus blocker remains). Say the word and I
will plan and build them as a separate, scoped workstream (not as "starting
P1").
