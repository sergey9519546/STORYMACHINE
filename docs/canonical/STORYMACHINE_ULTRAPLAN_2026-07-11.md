# STORYMACHINE ULTRAPLAN — Pre-Flight integration (2026-07-11)

Master plan integrating the **Pre-Flight White Paper** with everything built so
far. Pre-Flight is not a reroute — it is the rigorous, definitive statement of
the audit-first thesis we have been converging on. It **ratifies every standing
law** and supplies the formal backbone the engine was missing. It becomes the
north-star architecture; the scattered thesis docs (TRACE, MAESTRO-S product
sections) are now *views* of it.

## 1. What Pre-Flight ratifies (no change — keep building)
- Deterministic containment: models propose/interpret; deterministic code owns state, provenance, exact quotes, validation, release. (= NORTH_STAR.)
- No generative evaluator; no rewrites; no LLM judge owns canon.
- Provenance before prose (proof object is primary; NL is a view).
- Precision before recall; **bounded claims** ("no high-confidence defects found in audited categories", never "no plot holes").
- Adversarial acquittal (search hardest for an innocent explanation before surfacing) = our anchor discipline (don't false-positive on produced films) + abstention.

## 2. The formal backbone Pre-Flight ADDS (the real upgrade)
1. **Three causality layers** — diegetic (what happened, incl. off-screen/later-disclosed), epistemic (what a character knew *at the time*), discourse (what the audience has been shown so far). Collapsing these is the root cause of most false positives. "Audience ignorance ≠ missing diegetic cause."
2. **Open-world support states** — `ENTAILED / CONTRADICTED / UNKNOWN` (+ operational `SUPPORTED/VIOLATED/UNSUPPORTED/AMBIGUOUS/DEFERRED/EXTRACTION_ERROR`). `UNKNOWN` is first-class: absence is not a negative fact.
3. **Necessity-gated surfacing criterion** — a finding surfaces only when
   `N(p,e) ≥ τ_N` AND [`S=CONTRADICTED` OR (`S=UNKNOWN` ∧ `C(p) ≥ τ_C`)] AND `A(p,e) < τ_A` ∧ `V=1`.
   (necessity, support, search-completeness, best-alternative strength, evidence contract). Thresholds calibrated **per subtype** — a knowledge-path violation ≠ an emotional-motivation judgment.
4. **Necessary vs optional setup** — classify each precondition: explicit_script_rule / established_world_rule / hard_physical_constraint / epistemic_requirement / access_or_possession / temporal_requirement (routine-releasable) vs soft_narrative_expectation (never a plot hole alone). This is the fix for over-firing structural rules on produced films.
5. **Four narrative ledgers** — physical-world, character-epistemic, causal-dependency, audience-disclosure (append-only, event-sourced). "Separate chronology from disclosure" = the audience-disclosure ledger (fair-reveal engine).
6. **Internal (multi-state) vs external (binary) verdicts** — reasoning stays multi-state; the user sees PASS / FAIL / (suppressed). Binary is a presentation decision, not the model.
7. **14-stage pipeline** — ingestion → parser → entity+bitemporal resolver → source-grounded event extraction → append-only ledger+causal graph → candidate gen → evidence retrieval → checklist adjudication → adversarial acquittal → typed proof-object → deterministic validation → subtype calibration + root-cause clustering → report.

## 3. Current state → Pre-Flight stage map (what exists, what's missing)
| Pre-Flight element | Status in engine |
|---|---|
| Parser / structure / entity resolution | EXISTS (fountain-analyzer, screenplay) |
| Event-sourced ledger + causal graph | PARTIAL (StoryCommit DAG over *generation* ops; needs an imported-script ledger — change-impact W3) |
| Proof kernel / hard gates | EXISTS (9-validator kernel; Tier-1) |
| Confidence tiers (bounded claims) | LANDED (W1 tier×determinism, inert) |
| Adversarial acquittal / anchor | MEASURED (45-film anchor holds; abstention specced) |
| Emotional-arc / "sequence≠causality" | LANDED diagnostic (act-swap AUC 0.48→0.647) |
| Anti-slop, theme-extract, interiority, TS-SF | MODULES LANDED (additive, unused; wiring + tests pending) |
| Benchmark / metamorphic | EXISTS (evals/scoring Phase B) |
| **3 causality layers** | **MISSING — build** |
| **Open-world support states + surfacing criterion** | **MISSING — the core finding-gate to build** |
| **4 ledgers (esp. epistemic + audience-disclosure)** | **PARTIAL/MISSING — build** |
| **Necessary-vs-optional setup classifier** | **MISSING — fixes structural over-fire** |
| Human labels / calibration (τ per subtype) | BLOCKED (no labels — Phase G) |

## 4. The ULTRAPLAN sequence

### Phase 0 — Foundation (close-out, mostly done)
F0 env/packaging fixes (dotenv, NODE_ENV, OneDrive) · W1 tier contract · Phase A audit + frozen baseline · Phase B metamorphic harness. **Remaining:** commit package.json+lock; `.gitattributes` EOL normalize.

### Phase 1 — Wire the landed signals (additive, gated, near-term)
1. Wire FI modules (anti-slop, theme-extract, interiority, emotional-arc) into the doctor report as **diagnostic fields** (no health impact) + land proper unit tests per module (replace the pulled subagent drafts).
2. Fix the **verbosity bias** (anti-slop deviation-density) — gated on the Phase-B `empty_verbosity` test flipping FAIL→PASS, no calibration regression.
3. Promote **emotional-arc → health** only after doctor-level act-swap AUC gain is measured with zero calibration/discrimination/AUC-floor regression.

### Phase 2 — The Pre-Flight finding-gate (the core architectural build)
4. Implement **open-world support states** (`ENTAILED/CONTRADICTED/UNKNOWN`+ops) as the finding substrate.
5. Implement the **necessity-gated surfacing criterion** (`N,S,C,A,V`) as the single release gate every detector passes through — with **per-subtype thresholds**. This is the systematic cure for the false-positive floods (INTENTION_INVISIBLE, heuristic clusters) measured on produced films.
6. Implement the **necessary-vs-optional setup classifier** (7 dependency classes) — only the 6 hard classes are routine-releasable.
7. Implement **adversarial acquittal** as an explicit pass (already the anchor's spirit) — search the strongest innocent explanation before release.

### Phase 3 — The four ledgers (state model)
8. Build the **character-epistemic ledger** (what each character knows at story-time) — upgrades the KnowledgeValidator; attacks impossible-knowledge precisely.
9. Build the **audience-disclosure ledger** (chronology vs disclosure) — the fair-reveal engine; "separate chronology from disclosure".
10. Consolidate the **causal-dependency graph over imported scripts** (change-impact W3) + the physical-world ledger.

### Phase 4 — Calibration & selection kernel (needs humans)
11. **Human labeling** (Phase G blocker) — blinded pairwise, TS-SF/NVAR rubric (diagnostic). Calibrate `τ_N/τ_C/τ_A` per subtype; Platt/isotonic per output type.
12. Scoring-kernel Phases C–H: hard-gate/soft split, multidimensional scorecard (emotional-arc + interiority + theme as dimensions), Pareto/portfolio, pairwise ranker, calibration — all under the surfacing criterion + bounded claims.

### Phase 5 — Product surface
13. Evidence-grounded report with page-linked proof objects, internal→external binary verdict, change-impact headline, repair *conditions* (never rewrites), export. Trust contract: **"No rewrites. No generic coverage. No flag without evidence. No training on your script."**

## 5. Decision gates / laws (unchanged, now formalized)
- No finding without a passing **surfacing criterion** (N,S,C,A,V) — replaces ad-hoc severity.
- `UNKNOWN` never auto-fails; absence needs a coverage contract (`C ≥ τ_C`).
- Every change: measure on the real corpus, no regression to 6/6 discrimination, AUC floor 0.622, produced-anchor 45/45 ≥ 80, full suite green.
- No LLM judge owns canon; deterministic code owns state/provenance/validation/release.

## 6. What this retires
The single-scalar health verdict as the *reasoning* model (kept only as a presentation number); ad-hoc severity assignment (→ surfacing criterion); the RNE V8 reroute; permanent multi-agent swarm; any generative-evaluator default.

## 7. Immediate next 5 (exact order)
1. Commit the pending source changes + `.gitattributes` EOL fix (Phase 0 close).
2. Wire the 4 landed diagnostic signals into the doctor report + proper per-module tests.
3. Ship the verbosity-bias fix behind the `empty_verbosity` metamorphic gate.
4. Prototype the **surfacing criterion** (open-world support states + N/S/C/A/V) on ONE detector (knowledge-path) against the corpus — the keystone of Phase 2.
5. Stand up the **character-epistemic ledger** minimally + re-measure INTENTION/knowledge false-positive rate on produced films.
