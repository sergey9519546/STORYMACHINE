# STORYMACHINE_TARGET_SYSTEM

The research-supported target design. Framing: **one Narrative OS, two faces** —
an audit product (the front door) and a proof-gated generate→audit→select engine
(behind it). This is an evolution of the shipped system, **not a rebuild**: the
`server/nvm` engine already implements most of the core; the target adds a small
number of missing contracts and reframes the surface.

## 1. Product

- **Primary user:** working / near-working screenwriter (mystery & thriller first — genres where continuity, fair reveals, and open loops are load-bearing). (INTAKE-03 §2, §1.5)
- **Core problem:** "If I change this, what breaks?" — continuity, knowledge legality, setups/payoffs, and reveal fairness are invisible until they fail.
- **Primary outcome:** an evidence-linked audit + a validated change-impact + a small portfolio of validated repairs, with the writer always in control of canon.
- **Core workflow:** import → extract evidence-linked records → confirm only high-value ambiguities → commit versioned ledger → audit → rank → (optional) change-impact → (optional) repair portfolio → re-audit → export.
- **Differentiation vs a chatbot / long prompt / loose writing agents:** deterministic canon with provenance; findings carry evidence + confidence tiers; the model never silently edits the writer's source; every finding is diffable, attributable, regression-testable.

**Explicit non-goals (stop building these as the product):** autonomous full-script generation as the front door; a permanent visible multi-agent "writers' room"; a graph database at launch; MAP-Elites / learned routing / RL; general story-generation benchmark; multi-language; novels; institutional dashboards; LLM-as-judge scoring. (INTAKE-03 §3.2/§6.2, CANON-NS)

## 2. Narrative system (mostly exists; gaps marked ⛳)

- **Story representation:** event-sourced canon ledger + materialized `StoryState` (exists, `server/nvm/state`).
- **Temporal state:** validity-interval facts (FactTrack, INTAKE-04) with an **Allen-interval propagator** for transitive contradiction detection ⛳ (RECOVER-02; upgrades ad-hoc time checks).
- **Plot causality:** typed dependency edges (`causes/enables/motivates/reveals/sets_up/pays_off/requires_knowledge/requires_presence`) (INTAKE-03 §11.6). Graph exists (`twin/scm.ts`).
- **Character state / voice:** minds/beliefs/relationships exist; add **Burrows's Delta** structured voice-similarity ⛳ (RECOVER-01).
- **Canon & contradiction:** proof kernel with hard blockers that assert only encoded facts (exists, `server/nvm/proof`).
- **Setup/payoff & open loops:** `PromiseRecord` lifecycle (open→reinforced→paid→possibly_abandoned) (INTAKE-03 §11.8) — partially in engine.
- **Revision propagation:** change-impact `I(C)` over the dependency graph ⛳ (product headline). **Reality check:** today's graph (`twin/scm.ts`) is built over *generation* StoryOps with *inferred* edges and no `Impact(v)`; the audit product needs it rebuilt over *imported-script* typed-dependency extraction — new work, gated by W3.

## 3. Intelligence system

- **Determinism boundary (hard law):** deterministic code owns parsing, versions, diffs, graph traversal, hard precondition checks, confidence-aggregation, audit history. The model only proposes aliases, event effects, belief/goal/setup hypotheses, causal-link candidates, explanations, repair strategies, bounded prose patches. (INTAKE-03 §10.4, CANON-NS)
- **Sparse specialists, not a swarm:** one base pass always; specialist passes fire only when a difficulty/uncertainty probe predicts value, and each must beat a role-placebo before it stays ⛳ (INTAKE-02 A3, #3/#10).
- **Selection:** rank candidates by risk-sensitive utility $U_{\text{risk}}$ (CVaR tail control), not mean score ⛳ (§RESEARCH_AND_MATH 2.2).
- **Abstention:** the engine may output "insufficient evidence to judge" ⛳ (absent today; INTAKE-03 §17.6).
- **Human approval gates:** writer confirmations + author locks outrank all inference (INTAKE-03 §10 laws 6/9).

## 4. Data & state (contracts to add)

Additive to existing `RevisionIssue`/state types — none break call sites:

- **Finding contract (three orthogonal axes):** `severity` (exists) × `determinism {deterministic|structured_only|heuristic}` × `confidenceTier {strong_evidence|worth_a_look|pattern_to_watch}`. Invariant: heuristic ⇒ never a hard blocker. ⛳ (INTAKE-05 D.3; DERIV-PLAN)
- **EvidenceAtom** with provenance + confidence on every extracted claim; low confidence cannot support a high-certainty finding. ⛳ (INTAKE-03 §11.3, §17.2)
- **AuthorLock** (scope/instruction/mode) created at import-time confirmation. ⛳
- **Versioned StoryLedger** with `parentVersionId` + branch clone for change-impact (exists in part via event-sourcing).

## 5. Engineering

- **Single production engine:** TypeScript `server/nvm`. Python Reference Engine 0.2.0 (INTAKE-05) is a **conformance oracle** — port its `CraftFinding` contract, JSON schemas, and treat its 56 tests as a behavior spec; do not run two engines.
- **Schemas:** adopt the 6 JSON schemas (check-definition / audit-finding / audit-report / parse-confirmation / world-ledger / coverage-matrix) as validation targets.
- **Evaluation infra:** keep the 72-script corpus + discrimination harness + AUC floor 0.622; add the real-literary "great" band (Ibsen/Chekhov/Wilde) with must_fire/must_not_fire gating (INTAKE-05 D.5).
- **Cost/portability:** report cost as a vector (accelerator-seconds primary, tokens secondary — INTAKE-02 §5.2.7); model-agnostic provider boundary (exists).

## 6. Text architecture diagram

```text
  SCRIPT ─▶ NORMALIZE/PARSE ─▶ EXTRACT (EvidenceAtoms +conf) ─▶ CONFIRM (top-5 V(q) → AuthorLocks)
                                                                     │
                                                          COMMIT versioned StoryLedger
                                                                     │
   ┌───────────────── DETERMINISTIC CORE (owns canon) ──────────────┴───────────────┐
   │  proof kernel (9 validators) · Allen temporal · dependency graph · diff/version │
   └──────────────┬───────────────────────────────┬──────────────────────┬──────────┘
                  ▼                                ▼                       ▼
             AUDIT (findings:                 CHANGE-IMPACT           REPAIR PORTFOLIO
         severity×determinism×tier)            I(C), Impact(v)      3 validated modes, U_risk
                  │  Priority(f) rank, dedup, ABSTAIN                     │
                  └───────────────▶ EVIDENCE-LINKED REPORT ◀──────────────┘
                                        │
                            (behind the door, proof-gated)
                       GENERATE → AUDIT → SELECT  ·  sparse specialists · CVaR select
```

## 7. Migration from current system (small, ordered)

1. Add the finding contract (optional fields + guard) — inert until rules opt in. (DERIV-PLAN)
2. Add abstention as a finding outcome.
3. Surface change-impact `I(C)` on the existing `twin/whatif` graph as the headline.
4. Add the import confirmation loop + author locks.
5. Port Allen-interval temporal proof + Burrows's Delta as structured detectors.
6. Convert the always-on critic room to sparse, placebo-gated specialists.

Each step is additive and independently testable; none requires a rebuild.
