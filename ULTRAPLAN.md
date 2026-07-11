# STORYMACHINE — ULTRAPLAN (what's left, post-corpus era)

*Written 2026-07-10 at the close of the corpus/score-trust run (PRs #187–#190).
Supersedes stale sequencing in ROADMAP §§ where noted; NORTH_STAR.md remains
the constitution. Read this file first when resuming cold.*

## 0. Where the project actually stands (measured, not claimed)

- **Score trust: 6-of-6 discrimination pairs order correctly**, 5 hard in CI;
  active-vs-passive gap +6.2 (two parallel fixes compounding). Remaining todo:
  composite 5.0-pt min-gap (+2.2 today; diagnosis filed in
  discrimination.test.ts — good-half style-minor floods, ~19 rules).
- **Ground truth exists**: 69 produced features (87.3–98.7, all RECOMMEND),
  env-gated harness, manifest locked. It has already found and fixed two
  flood-class bugs (ORPHAN_CLUE 556–1,077 criticals; TRIADIC/CONSECUTIVE
  firing on 90–100% of professional scripts).
- **The north-star metric is executable**: structural-degradation AUC,
  currently **0.684** (ratchet ≥ 0.6, target ≥ 0.9). The chain
  harness → detector (SCENE_CONTINUITY_COLLAPSE) → formula pathway
  (bounded structural deduction) is fully wired; the binding constraint is
  the detector GATE (CI < 0.05 catches 5/12 scrambles).
- **Known-dead ends, measured, do not re-run**: voice-distinctness detector
  (PDF cue parsing yields 3 qualifying speakers on 12/69), payoff-discipline
  detector (content-word clue channel noise-bound: median 299 seeds, ~17%
  payoff ratio), suspense-jaggedness scramble signal (backwards on real data).

## 1. THE SPINE — raise the AUC to 0.9 (2–4 sessions, sequential)

The single number that operationalizes NORTH_STAR's "separation margin."
Everything in this section compounds; nothing elsewhere beats its value/hour.

1. **Widen the continuity gate with FP analysis.** Per-script analysis of the
   12-pair measurement: bads at CI 0.05–0.18 escape; intact "9" (anthology)
   sits at −0.05. Options measured, not guessed: per-axis thresholds instead
   of composite; exempt scripts with authored-fragmentation signals; raise
   gate to 0.15 with a second corroborating axis (location-run collapse).
2. **Second + third structural axes.** Location-run coherence (adjacent
   same-location rate: weak alone, good as corroborator) and escalation
   coherence at scale (act-level suspense means under shuffle). Each feeds
   the SAME deduction pathway — no new formula work needed.
3. **Degradation variants.** Add reverse-order and act-swap degradations
   (cheaper to detect than full shuffle? measure) so the AUC isn't
   overfitted to one scramble recipe. Extend harness subset 12 → 24.
4. **Bad-band beyond degradations**: user's own drafts (user has declared
   them bad — screenplay-format versions needed) and/or amateur public
   drafts. Converts AUC from synthetic-bad to real-bad.

## 2. OWNE integration (ROADMAP §13d, assets vendored in docs/owne/)

- **O1 Typed promises** — adopt PT_* library onto SEED_CLUE/PAYOFF_SETUP
  (hard/soft, priority, payoff predicate class). Fixes ORPHAN_CLUE severity
  honestly; unblocks payoff-discipline excellence detector; StoryOp contract
  change → sequence with record-parity. *Do together with the content-word
  channel rebuild (§3.2) — same subsystem, one migration.*
- **O2 Tavern Letter golden fixture + Integrity Rate** — proves the sim
  layer like the corpus proved the doctor. Self-contained; any session.
- **O3 Assertion containment** — Asserted(output) ⊆ licensed facts ∪ common
  ground, checked deterministically on every LLM rewrite/candidate.
  The strongest trust upgrade on the generative side (subsumes B-wave 2's
  Semantic Firewall).
- **O4 Belief-movement surprise** (½‖μₑ−μ‖₁) — new Type-1 channel with real
  math; feeds twist/reveal rules + metrics.
- **O5 Mystery fairness gates** (Type 3, genre-routed) — min-clues-before-
  solve, herring non-softlock, discourse-class ScenePurpose extensions.

## 3. Score-trust remainder

1. **Composite min-gap wave**: guard the ~19 style minors that flood the
   composite good half — same length-normalization discipline as the rhythm
   wave (measure each on corpus first; TALKING_HEADS 24/69 and
   OPENING_SCENE_UNDERWEIGHT 22/69 are the next worst offenders after the
   two already fixed).
2. **Content-word clue-channel rebuild**: residual noise traces to a
   SceneUnit.characters coverage gap (names leak into cluster word sets:
   "hand-anna"). Fix attribution, then re-measure; if payoff ratio becomes
   informative (>0.4 median), land the payoff-discipline detector with
   O1's typed promises.

## 4. Deployment & credibility (unchanged priorities, sharper scope)

1. **E2E browser journeys** (revive Run 17-A): upload→doctor→fix-verify,
   what-if, interview, coverage export. Playwright; nothing clicked E2E yet.
2. **Frontend tests**: start ScriptDoctorPanel (formula versioning, sample
   provenance) + StartScreen (sample handoff sessionStorage).
3. **Auth implementation** (docs/AUTH.md documents; nothing enforces) —
   blocker for public multi-user deploy only.
4. **OCR recovery** of the 8 dropped scans (Toy Story, Lion King, Beauty &
   the Beast, Fantastic Mr Fox, Aladdin, Moana, Big Hero 6…) → corpus ~77.
5. **Repo hygiene** (this session hit it AGAIN — OneDrive truncated two
   source files mid-edit): move working clone off OneDrive, .gitattributes
   (`* text=auto`), prune ~30 stale bolt-*/apex-* branches.

## 5. Product surface (from earlier runs, still open)

- Run 25 remainder: blank-editor bounce; sample reachable from EVERY entry
  surface (Doctor panel has it; StartScreen has it; ScriptIDE empty state?).
- Run 17b polish: panel consolidation (24+ flat buttons), accessibility
  pass, dedupe dual Fountain parsers, .fdx in-place client import.
- D-wave (§13c): seeded divergence operators — the one generative upgrade
  with research backing. After O3 lands (containment should gate divergent
  candidates from day one).
- B-wave 2 remainder beyond O3: menace target-curve delta audit,
  contradiction families over rootCauses.
- R-wave residue not covered by O4/O5: scene economy score, speech-act
  channel, epistemic contract, canon tiers, evaluator hard-veto audit.

## 6. Standing cautions (learned this run, expensive to relearn)

- **Parallel sessions are real**: two sessions independently built passivity
  detectors and merged concurrently (PRs #185–#188). Before ANY wave: pull
  main, check git log for overlapping work, expect to reconcile.
- **Measure before threshold — on the REAL corpus**, always. Every detector
  that skipped this died or misfired. Fixture-only evidence is necessary
  but never sufficient.
- **Density normalization eats rule families at feature scale.** A new rule
  that must move feature-length health needs either the structural-deduction
  pathway or multiplicity with cap+rollup — never assume instances add up.
- **OneDrive + git + this repo = file truncation.** Stage via the sandbox,
  copy with byte-count verification, keep .git operations on the Windows
  side via Desktop Commander.

## 7. Definition of done (v1.0-north-star, updated)

All of NORTH_STAR §3 plus, now measurable: degradation AUC ≥ 0.9 with at
least three degradation recipes and one real-bad band; Integrity Rate = 1.0
on all golden sim fixtures; assertion containment enforced on every
generative path; composite discrimination gap ≥ 5.0 hard in CI.
