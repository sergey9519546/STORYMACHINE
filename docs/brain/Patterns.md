---
type: patterns
updated: 2026-09-05
sources: [docs/LANE_STANDARD.md, docs/audits/2026-09-02-retrospective/RETROSPECTIVE.md, docs/audits/2026-09-05-review-batch/README.md, docs/PATH_TO_EXCELLENCE.md]
status: active
---

# Patterns — Recurring Mistake Classes

Named because the same shapes of error kept recurring across independent
audits and reviews. Recording them here so a new change can be checked
against the class, not just the one example that motivated each rule.

## Proving a property with the one example that motivated it

A guard is built, verified against the exact case that revealed the defect,
and declared sound — while the next member of the same class still gets
through. [[Session - 2026-09-05 Review Batch]]'s shape-guard lane (5 review
rounds) is the clearest case: each round fixed the specific bypass the
reviewer had just demonstrated, and the reviewer found the next one four
times running (the dual-dialogue caret, the repo-root-relative fixture
sweep, the un-failing fuzz cases, the weight-vs-cost-bound confusion, the
double-spaced-input bypass). `docs/LANE_STANDARD.md` §3 now states the
countermeasure directly: "a guard or gate must be shown to FAIL on the
unfixed input before it is shown to pass on the fixed one."

## One value rendered by N hand-written sentences

The same number (a health percentile, a draft rank, a structural-signal
aggregate) gets a separate hand-written sentence on each surface that shows
it, and the sentences drift — one drops a qualifier, another gets the wrong
ordinal suffix. [[Session - 2026-09-05 Review Batch]]'s cross-surface-parity
lane found four copies of the percentile copy had drifted this way, one
having silently dropped "hand-authored synthetic." The fix pattern, applied
repeatedly across [[Surface - Script Doctor Panel]],
[[Surface - Coverage HTML]], [[Surface - Coverage Letter]], and
[[Surface - Versions and Snapshots]]: move the wording into one shared
helper (`src/lib/percentile-copy.ts`, `src/lib/draft-rank-copy.ts`) and have
every surface call it, so drift becomes structurally impossible rather than
merely discouraged.

## Theme convention per file, not per surface

A styling rule (e.g. how a dark-mode color pair is declared) gets applied
consistently within one file but not enforced across the codebase, so a new
file can silently violate it and nothing catches it until a human notices a
contrast failure. [[Session - 2026-09-04 Hardening Batch]] found exactly
this: the `dark:` variant defined through `:where()` (zero specificity)
meant every light/dark token pair added the day before was tied with its
sibling and won or lost on generated source order — caught only because new
dark-theme test coverage happened to render a surface no earlier test had.

## A gate that cannot fail

A test or CI step exists, is named as if it protects something, and passes
regardless of the input it is meant to catch — because its range is empty
(the receipt gate's `origin/main...HEAD` on a push being the same commit,
see [[Gate - Receipt Gate]]), its exclusion matches by the wrong key (the
no-console gate's basename-matched `--exclude=index.ts` hiding the live
route barrel), or its fixtures never exercise the code path the assertion
claims to cover (ablating both feature-scale deductions leaving all tests
green because every fixture sat below the 15-scene threshold those terms
require). `docs/LANE_STANDARD.md` §3 and `tests/core/ci-gates-intact.test.ts`
exist specifically because "a gate that can be silently disabled by the
thing it gates is not a gate."

## A brief's premise as hypothesis

A task brief states something as settled fact that turns out to be wrong or
stale by the time the lane investigates — e.g. the rule-catalog retirement
design's premise that a tier of rules was removable "at zero measurable
score cost, by construction," which [[Measurement - RULE_CHANNEL_EVIDENCE_2026-08-24]]
measured false (removing that tier drops pooled AUC 0.572 → 0.530).
`docs/LANE_STANDARD.md` §1 states the discipline directly: "State in the
report what the thing IS (one paragraph), including anything the brief got
wrong. A brief's premise is a hypothesis, not a fact." This vault's own
build brief is not exempt: the "five session records" the owner brief named
turned out to be seven headings once counted directly in
`docs/PATH_TO_EXCELLENCE.md` — see [[Session - 2026-08-24 Five Landings]]
through [[Session - 2026-09-05 Review Batch]], all seven.

## Sources

- `docs/LANE_STANDARD.md` §1, §3, §6
- `docs/audits/2026-09-02-retrospective/RETROSPECTIVE.md`
- `docs/audits/2026-09-05-review-batch/README.md`
