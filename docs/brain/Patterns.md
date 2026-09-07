---
type: patterns
updated: 2026-09-06
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

## No fixture at product length

Every gate in the repository was green on inputs a third the size of the
median user's draft, so the defects that only exist at product length shipped
unseen. Measured 2026-09-06: the largest committed Fountain file anywhere
under version control was **12 scenes / 10,861 B**
(`tests/fixtures/feature-scale-discrimination/intact.fountain`);
`data/screenplays/` is twenty shorts of 9-14 scenes; the built-in P0 sample is
12 scenes; the calibration corpus is twenty short samples; every browser suite
ran on short form. A read-only product discovery on a 231-scene assembly found
four BROKEN/HALF-BUILT items that are invisible below ~40 scenes — the worst an
infinite React render loop (error #185) fired by typing a new scene after a
coverage run, reproduced 5/5 at feature length and 0/N on the 12-scene short.

The trap is not "we forgot to test big inputs". It is that a *threshold* in the
code (React's 50-nested-update limit, a bounded structural deduction, a
clustering cut-off) can only be crossed by an input large enough to cross it,
so a short-form suite is not a weaker version of the same test — it is a test
of a different code path, passing honestly and proving nothing about the one
that matters. The countermeasure is a committed stimulus at product length that
the suites actually drive:
`tests/fixtures/feature-length/assembled-feature.fountain` (231 scenes,
deterministic, CC0, regenerable via
`scripts/build-feature-length-fixture.mjs`), exercised by
`scripts/verify-p2-p3-surfaces.mjs`'s `P2-featurelen` phase and
`tests/core/finding-jump.test.ts`. Its README states the other half of the
discipline: it is a deliberately incoherent assembly, so it may be measured
for scale and behaviour and never for craft.

## A harness that hides the defect it is pointed at

The same 2026-09-06 render loop produced a second, sharper lesson, and the
first attempt at it got the diagnosis wrong — which is the pattern worth
recording. The browser step that types a new scene into the feature draft
reproduced the loop 5/5 and 4/5 while the machine was busy and **0/5 while it
was idle**, so round 1 recorded the defect as "load-dependent" and the gate as
a real regression check but not a fail-first instrument. The independent
review measured the actual variable: `page.keyboard.type()` awaits a CDP
round-trip **per key**, and that round-trip is a drained frame — exactly what
React's nested-update counter needs to reset. Delivering the identical keys
through non-awaited `Input.dispatchKeyEvent` removes the gap and the gate
becomes deterministic: **3/3 failures on the unfixed tree, 0/3 on the fixed
one**, whole suite, same box.

Generalised: when a gate is intermittent, suspect the harness's own
synchronisation before concluding the defect is probabilistic. A test tool
that politely waits between actions is simulating a *slower* user than the one
the bug needs, and "this cannot be made deterministic" is a claim that must be
measured like any other. It is also why the source-level guard
(`tests/core/scriptide-render-loop-guard.test.ts`) is kept alongside rather
than instead: a grep for one hook on one line pins the convention but could
never catch the same ratchet arriving through a different setter — which
`ScriptIDE.tsx`'s title-page autofill was one condition away from doing.

## Sources

- `docs/LANE_STANDARD.md` §1, §3, §6
- `docs/audits/2026-09-02-retrospective/RETROSPECTIVE.md`
- `docs/audits/2026-09-05-review-batch/README.md`
