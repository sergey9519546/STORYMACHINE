# STORYMACHINE — active work prompt (post-P0-freeze, pre-validation)

> Use this in a fresh agent session. It is scoped to the one thing that
> actually de-risks the project right now: making the deterministic core an
> *honest, writer-grade* coverage report — and proving, on real scripts,
> that what it claims is true. Everything else (recruitment, sessions, the
> ship decision) is human work the freeze correctly reserves to the owner.

## Why this prompt and not a godmode/endgame suite

The project is pre-P0. Per NORTH_STAR (*demand before rigor*), user
validation has not run and the gate is unmet. A godmode/executor prompt
(12-phase hardening + deployment + eval corpus + WCAG-everywhere) optimizes
for breadth across a *complete* product — it would repeat the rigor-before-
demand anti-pattern this project has explicitly rejected. The bottleneck is
narrow: the rule channel has measured AUC ~0.076 (near-random); the only
signal that currently separates strong from weak writing is scene-count
scarcity. So the highest-leverage work is not "harden everything," it is
"make the report's claims honest and demonstrate that it discriminates."

## Hard guardrails (do not violate)

- ROADMAP.md, NORTH_STAR.md, AGENTS.md, docs/adr/, and
  docs/user-validation/PHASE_TRACKER.md are canonical. Read them first.
- The P0 freeze holds: no new product/engine features, no scoring-formula /
  constant / rule / detector / calibration changes, no UI redesign, no new
  rules (frozen at 3,216), no waves. The only exceptions are stated below.
- Do not introduce deployment, billing, multi-tenant auth, accounts, or a
  hosted eval dashboard. Those are post-P0 and out of scope.
- No `console.*` under server/** (CI-enforced). Use server/lib/logger.ts.
- Do not claim something works without a runnable test or runtime trace.
  Replace "should work" with the exact evidence.

## The one job

Make the deterministic coverage report — what a writer sees when they run
Script Doctor on a real draft — measurably more honest and measurably more
discriminating on real writing, **without touching the frozen scoring
formula, constants, rules, or detectors.** That sounds contradictory; it
isn't. Three concrete, freeze-permitted levers do the work:

### Lever 1 — Audit every user-facing claim the report makes against what the engine actually computes

The report surfaces health, grade, verdict, issue counts, dimensions,
strengths, story-graph, and percentile. For each visible number, label, and
sentence: trace it to the exact code that produces it. If a claim is
unsubstantiated by the underlying computation (e.g. a "strength" that is
just a thresholded count, a "percentile" with no real reference
population), either (a) soften the wording to match what is actually
measured, or (b) flag it for the owner. Do NOT invent new metrics; make
existing ones honest.

Output: a claim-by-claim ledger (claim → code source → verdict: substantiated
/ overstated / fabricated → minimal rewording or a documented gap).

### Lever 2 — Build runnable discrimination evidence on REAL scripts (not synthetic fixtures)

This is the single highest-value thing an agent can do for this project.
AGENTS.md is explicit: "For any scoring change, tests must include both
positive/negative fixtures and runnable discrimination evidence on real
writing; synthetic fire/no-fire coverage alone is not enough." The same
standard applies to proving the *current* score works.

There is a real screenplay corpus on this machine (261+ produced
screenplays in .fountain — see docs/p1-benchmark/SCREENPLAY_SOURCING_TODO.md;
env-gated via REAL_SCRIPT_CORPUS_DIR, harness at
tests/core/real-script-corpus.test.ts). Use it.

- Run the current Script Doctor over a held-out slice of the corpus.
- For each script, capture the full report (health, verdict, dimension
  scores, issue counts, top root causes).
- Pair scripts where possible by craft quality (the corpus has produced
  features + produced samples; the project's own discrimination harness
  in tests/core/discrimination.test.ts already establishes the pairing
  methodology).
- Measure: does the current score ORDER strong-above-weak on real writing,
  and by what margin? Where does it tie or invert?
- Output a runnable artifact (a script under scripts/, env-gated like the
  existing harness) that re-generates this evidence, plus a one-page
  results summary committed to docs/scoring/.

This does not change the score. It tells the truth about the score — which
is the precondition for both P0 (showing writers something honest) and P1
(deciding what to fix). The two documented blind spots (the
discrimination.test.ts composite-gap todo; the empty_verbosity metamorphic
known-fail) are *evidence this work is needed*, not blockers for it.

### Lever 3 — Make the report a writer would actually trust

Within the freeze (no new engine work, no redesign): improve the *honesty*
of how the report communicates uncertainty, evidence, and what is a
suggestion vs. a measured property. This is the report's voice, not its
math. Concrete examples:
- If a dimension score rests on a single detector, say so ("based on
  midpoint pressure alone") rather than presenting it as a rounded
  authority.
- If the verdict is CONSIDER, the reasons should be the top root causes,
  not generic language.
- If the sample flow is shown, it must be clearly labeled as a sample, not
  the writer's work.

## Definition of done for this prompt

- The claim ledger (Lever 1) is complete and committed.
- The real-script discrimination harness (Lever 2) runs via an env-gated
  script and produces a results summary; no synthetic-only claim of
  discrimination survives.
- Any report wording softened in Lever 3 is covered by an honesty-audit
  rule so it cannot regress (the audit already exists — extend it).
- `npm run lint && npm test && npm run build` exit 0; the CI console-grep
  stays clean; `npm run honesty-audit` stays clean.
- A short summary in docs/scoring/ states, in plain language, what the
  current score actually does and does not do on real writing.

## Out of scope (do not start)

- P1 benchmark construction, blind human labels, AUC targets — blocked
  until P0 clears.
- Any engine/scoring/rule/detector change.
- Deployment, accounts, billing, multi-tenancy, observability stack.
- Recruitment, session running, the ship decision — human work.
- A godmode 12-phase hardening sweep.

Begin by reading ROADMAP.md §3, NORTH_STAR.md, AGENTS.md, the PHASE_TRACKER,
and docs/scoring/VERBOSITY_BIAS_2026-07-11.md, then standing up Lever 2's
harness against the real corpus. The evidence comes first; the rewording
follows from what the evidence shows.
