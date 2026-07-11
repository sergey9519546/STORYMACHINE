# STORYMACHINE — ULTRAPLAN (what's left, current spine)

*Written 2026-07-11 during the documentation-consolidation wave. Supersedes
stale sequencing in ROADMAP.md's numbered §§ where the two disagree;
NORTH_STAR.md remains the constitution. Read this file first when resuming
cold — it's the shorter, denser path to "what do I do next."*

## 0. Where the project actually stands (measured, not claimed)

- **Discrimination**: 6/6 pairs order correctly (good > bad); 5 hard in CI
  with real margins (+1.4 to +6.2). The 6th, composite-reviewer-scenario,
  orders correctly (+2.2) but hasn't cleared its own 5.0-point minimum-gap
  floor — diagnosed as ~19 style-minor false positives on the good half
  (`discrimination.test.ts` header carries the live numbers; re-read before
  quoting).
- **Ground truth**: 72 produced scripts (70 animation + Pulp Fiction + Jaws
  — first live-action entries), all RECOMMEND, manifest-locked with
  content-hash verification, env-gated harness. Has already found and
  fixed two flood-class bugs (ORPHAN_CLUE over-firing, TRIADIC/CONSECUTIVE
  firing on 90-100% of professional scripts).
- **The north-star metric is executable**: structural-degradation AUC.
  Shuffle-drop AUC-24 = 0.672 measured against a 0.622 hard ratchet floor;
  AUC-71 (full corpus) ~0.652. Chain is fully wired: harness -> detector
  (SCENE_CONTINUITY_COLLAPSE + location-run corroboration axis) -> bounded
  structural-deduction formula pathway. Binding constraint remaining is
  the detector gate's sensitivity, not the pipeline.
  A second degradation recipe, act-swap, measures ~0.48 — near coin-flip.
  This is diagnosed, not mysterious: see §1 and NORTH_STAR §2.
- **Known-dead ends, measured — do not re-run without new evidence**:
  voice-distinctness detector (PDF cue parsing yields only 3 qualifying
  speakers on 12/69 scripts — corpus-invisible); payoff-discipline
  detector (content-word clue channel is noise-bound: median 299 seeds,
  ~17% payoff ratio — too noisy to threshold); suspense-jaggedness
  scramble signal (runs backwards on real data).

## 1. THE SPINE — deep-read arc signals, then the AUC (sequential, 2-4 sessions)

The single number that operationalizes NORTH_STAR's separation-margin
claim, and everything below compounds on it — nothing else beats its
value/hour right now.

1. **Deep-read arc signals (the AUC path).** Diagnosed root cause of the
   ~0.48 act-swap AUC: lexicon-derived signals detect WHAT is said, not
   WHERE it sits in the document — swapping acts preserves all the same
   words while destroying sequence, and today's 3,216 rules are almost
   entirely content-keyed. Run 10's deep-read sensing (LLM-per-scene,
   already landed, keyless-degrading) is the mechanism to extend: emit
   document-position-aware signals (expected-vs-actual narrative position,
   setup/payoff distance, act-boundary coherence) into the same
   deterministic record-signal schema the rules already consume. Design
   doc first — this is an L, needs a real AI key to develop and measure
   against, and must degrade honestly (to today's lexicon-only signals)
   when keyless.
2. **Composite min-gap guard wave.** Close the 5.0-point floor on
   `composite-reviewer-scenario`. Same discipline as the earlier
   rhythm-guard wave: measure each offending rule against the corpus
   first. TALKING_HEADS (24/69 corpus scripts) and
   OPENING_SCENE_UNDERWEIGHT (22/69) are next after the two D2-wave
   already fixed. Heavily calibration-guarded — band monotonicity and
   length-invariance (+/-7 at 1x/2x/3x) must hold throughout.
3. **Second + third structural axes**, once (1) lands new signal.
   Location-run coherence (adjacent same-location rate — weak alone, good
   as a corroborator, already partially in via SCENE_CONTINUITY) and
   escalation coherence at scale (act-level suspense means under shuffle).
   Feed the SAME bounded deduction pathway — no new formula architecture
   needed, just new corroborating axes into the existing gate.
4. **Bad-band beyond synthetic degradations.** User's own drafts (declared
   bad by the user; needs screenplay-format versions) and/or amateur
   public drafts. Converts the AUC measurement from synthetic-bad
   (shuffled/swapped intact scripts) to real-bad, which is a stronger
   claim and may reveal degradation recipes the synthetic ones don't
   exercise.

## 2. OWNE integration (assets vendored in `docs/owne/`)

- **O1 typed promises + SG1 (converged item, do together).** Adopt the
  22-entry PT_* promise-template library onto SEED_CLUE/PAYOFF_SETUP
  (type + hard/soft + priority + payoff predicate class) — fixes
  ORPHAN_CLUE severity honestly, unblocks the payoff-discipline
  excellence detector. StoryOp contract change: sequence with
  record-parity. SG1 (Well-Made Surprise Test: preTwistSatisfaction >=
  0.6, hindsightInevitability >= 0.7, >= 3 setups,
  misdirectionEffectiveness >= 0.5) is deterministic over the same
  setup/payoff ledger — converges naturally, one migration.
  *Do together with the content-word clue-channel rebuild (§3) — same
  subsystem.*
- **O2 Tavern Letter golden fixture + Integrity Rate.** Import the fixture
  as ops/scenario; IR = (1/T)*Sum 1[event legal AND invariants hold] over
  sim traces; CI-assert IR = 1.0 and Halluc = 0 on the golden path plus
  its negative tests (early-accusation gate, teleport prevention, double
  possession, herring non-softlock). Proves the sim layer the way the
  corpus proves the doctor. Self-contained — any session, any order.
- **O3 assertion containment.** Asserted(output) subset-of licensed facts
  union common ground, checked deterministically on every LLM
  rewrite/candidate via entity/fact extraction against session canon +
  input span. The strongest trust upgrade on the generative side
  (subsumes the filed Semantic Firewall item). Gates D-wave's divergence
  operators once both exist.
- **O4 belief-movement surprise** (1/2 * ||mu_e - mu||_1 over an explicit
  hypothesis distribution) — new Type-1 channel with real math, replacing
  lexicon-intensity twist proxies. Feeds twist/reveal rules + the metrics
  module.
- **O5 mystery fairness gates** (Type 3, genre-routed) — min-clues-before-
  solve, herring non-softlock, discourse-class ScenePurpose extensions for
  the mystery genre router.

## 3. Score-trust remainder

1. **Composite min-gap wave** — see §1.2, same item, listed once.
2. **Content-word clue-channel rebuild.** Residual noise traces to a
   `SceneUnit.characters` coverage gap (character names leak into cluster
   word sets — e.g. "hand-anna"). Fix attribution, re-measure; if the
   payoff ratio becomes informative (>0.4 median, up from ~17%), land the
   payoff-discipline detector using O1's typed promises as the severity
   model.

## 4. Deployment & credibility

1. **E2E browser journeys** (Playwright — nothing has been clicked
   end-to-end in a real browser; the current harness is keyless API-level
   only): upload->doctor->fix-verify, what-if, interview, coverage export.
2. **Frontend tests**: start with `ScriptDoctorPanel` (formula versioning,
   sample provenance) + `StartScreen` (sample-handoff sessionStorage).
3. **Auth implementation** (`docs/AUTH.md` documents the trust model;
   nothing enforces it) — blocks public multi-user deploy only, not the
   deterministic core.
4. **OCR recovery** of the remaining dropped scans -> corpus toward 150+
   via the 155-screenplay sourcing index (SG6, `Film_Script_Research_
   Report.docx`, 91.6% publicly available).
5. **Repo hygiene**: this has bitten the project before (OneDrive
   truncated source files mid-edit) — keep the working clone off
   OneDrive where possible, `.gitattributes` (`* text=auto`), prune stale
   branches periodically.

## 5. Product surface (still open, lower priority than §§1-4)

- Run 25 remainder: blank-editor bounce fix; sample content reachable from
  every entry surface (Doctor panel and StartScreen have it; verify
  ScriptIDE's empty state does too).
- Run 17b polish: panel consolidation (24+ flat buttons -> grouped nav),
  accessibility pass, dedupe the two hand-rolled Fountain parsers
  (`src/services/director.ts` vs. `src/lib/fountain.ts`), `.fdx` in-place
  client import (currently toast-redirects to the Doctor upload flow).
- D-wave (seeded divergence operators) — the one generative-side upgrade
  with actual research backing (Osborn-checklist divergence-before-
  convergence). Sequence AFTER O3 (§2) so containment gates divergent
  candidates from day one.
- B-wave 2 remainder beyond O3: menace target-curve delta audit,
  contradiction families over rootCauses.
- R-wave residue not covered by O4/O5: scene economy score, speech-act
  channel, epistemic contract, canon tiers, evaluator hard-veto audit —
  full list in ROADMAP §5.9, not duplicated here.
- MASTER_RESEARCH_AUDIT Tier 1 remnants + Tier 2 channels — full ranked
  list in ROADMAP §5.6 and `docs/research-audit/MASTER_RESEARCH_AUDIT.md`
  directly; not duplicated here to avoid three-way drift.

## 6. Standing cautions (learned the expensive way — read before a wave)

- **Parallel sessions are real.** Two sessions have independently built
  the same detector and merged concurrently. Before ANY wave: `git pull`
  main, check `git log` for overlapping work, expect to reconcile.
- **Measure before threshold — on the REAL corpus, always.** Every
  detector that skipped this died (never fired) or misfired (inverted on
  well-crafted writing). Fixture-only evidence is necessary but never
  sufficient.
- **Density normalization eats rule families at feature scale.** A new
  rule that must move feature-length health needs either the structural-
  deduction pathway or multiplicity with a cap + rollup — never assume
  instances add up linearly against the density term.
- **Lexicon signals carry content, not position.** Global-arc / document-
  position claims need a semantic channel that reads FOR position — see
  §1.1. This is the reason act-swap AUC lags shuffle-drop AUC by ~0.2.
- **OneDrive + git + this repo = file truncation risk.** Stage via a
  sandbox, copy with byte-count verification, keep `.git` operations on
  the Windows side when working from the OneDrive-synced clone.
- **Sandbox environment notes**: `npm install --ignore-scripts --no-audit
  --no-fund` then `npm rebuild better-sqlite3 --nodedir=/usr` if native
  bindings are needed in-sandbox; no `gh` CLI in sandbox — ship via the
  Desktop Commander PowerShell ritual (stage files, then a `.ps1` written
  via `write_file` + run via `start_process`, never inline `-c` with
  shell variables); OneDrive round-trips can inflate diffs with CRLF —
  normalize to LF before every commit and verify with a byte/line check,
  not just a visual diff.

## 7. Definition of done (v1.0-north-star)

All of NORTH_STAR §1 (non-negotiables) plus, now measurable: degradation
AUC >= 0.9 with at least three degradation recipes (shuffle-drop, act-swap,
and one more) and at least one real-bad band (not just synthetic
degradation); Integrity Rate = 1.0 on all golden sim fixtures; assertion
containment enforced on every generative path; composite discrimination
gap >= 5.0 hard in CI, alongside the 5 pairs already there.
