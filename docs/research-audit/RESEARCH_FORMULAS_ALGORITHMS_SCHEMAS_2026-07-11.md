# Research Formulas, Algorithms & Schemas — 2026-07-11 Intake (verbatim)

Extracted, not paraphrased. This is the implementable contract layer behind
`RESEARCH_INTEGRATION_2026-07-11.md` (which carries the adopt/defer/reject
decisions). Formulas are reproduced in the source's own notation; TypeScript
interfaces and Python signatures are copied from the artifacts; schema
required-field lists are copied from the reference engine's JSON schemas.

Provenance:
- **MAESTRO-S v2** blueprint (generation objectives, §5).
- **TRACE** white paper (product data model §11, algorithms §12–17).
- **Reference Engine 0.2.0** Python source (proof kernel, craft registry, JSON schemas, corpus gate).
- **FactTrack** (Lyu, Yang, Kong, Klein) — temporal validity intervals.

---

## PART A — MAESTRO-S generation objectives (§5, verbatim)

### A.1 Objects and notation
- `p` story prompt; `i` author-intent spec; `b` inference budget; `z` seed; `a` architecture.
- `s = G(p,i,a,b,z)` generated story; `x_s` structured narrative state.
- `j` judge; `r_j(s)` judge response; `ℓ(s)` full generation+revision lineage.

### A.2 Creativity — "unexpected but fitting"
```
C(s) = f( N_concept, N_structure, N_imagery, F_prompt, F_story )
```
- N_concept premise/thematic novelty; N_structure event/reveal novelty; N_imagery image/language novelty;
- F_prompt fit to request; F_story fit to the story's own causal + emotional logic.
Operational research definition, not a universal aesthetic theorem.

### A.3 Novelty (descriptive difference, not quality)
```
N(s) = ( N_semantic, N_plot, N_style, N_portfolio )
```
Measures: semantic embedding distance from same-prompt candidates; event-graph edit
distance; style-feature distance; descriptor-cell coverage; human surprise rating;
rarity of concept combinations. *Novelty metrics are not evidence of copyright originality.*

### A.4 Coherence
```
H(s) = f( H_causal, H_intentional, H_structural, H_thematic, H_emotional )
```

### A.5 Consistency (narrower, more formal than coherence)
```
X(s) = 1 - ( E_temporal + E_entity + E_knowledge + E_world + E_relationship + E_object ) / Z
```
`Z` normalizes for story length and number of tracked entities.

### A.6 Adherence A(s)
Required characters/events; forbidden content; target length; POV; tense; format;
genre contract; explicit author locks.

### A.7 Writer utility
```
W = f( time_saved, candidate_acceptance, edit_distance, perceived_control,
       authorship_satisfaction, reuse )
```

### A.8 Cost / Latency (report separately — never a single scalar)
- **K(a,p,z):** prompt tokens; generated tokens; model calls; active-parameter token proxy;
  accelerator-seconds; peak memory; hosted monetary cost; human-review time; storage/retrieval ops.
- **T(a,p,z):** time to first candidate; time to first *valid* candidate; time to portfolio;
  time to author-accepted output; critical-path latency; total accelerator time.

### A.9 Constrained multi-objective form
```
max  𝒫[ C(s), H(s), X(s), A(s), W(s) ]
s.t. K ≤ B_K
     T ≤ B_T
     S_safety(s) ≥ τ_S
     R_rights(s) ≤ τ_R
     A_hard(s) = 1
```
`𝒫` = the Pareto set, **not** one universal scalar score.

### A.10 Risk-sensitive utility (CVaR tail control)
```
U_risk(s) = E[U(s)] - λ · CVaR_α( L_continuity, L_safety, L_rights, L_latency )
```
Penalizes rare-but-severe canon/privacy/safety failures even when average scores are high.

### A.11 Revision homogenization — stop rules
For lineage `ℓ = (s_0, s_1, …, s_R)`:
```
ΔH_r = H(s_r) - H(s_{r-1})
ΔN_r = N(s_r) - N(s_{r-1})

STOP when  E[ΔH_r] / Cost(r) < τ_H
   or when E[ΔN_r] < -τ_N          (unless author explicitly accepts the trade-off)
```
Every draft lineage retains pre-critique text and measures novelty after each repair.

### A.12 Selected architecture path (scored, §10)
Top three of 12 candidates, staged: **C2 Hierarchical Plan–Draft–Verify → A3
Single-First Agent Spawn → X3 Graph-Causal QD Council.** C2 establishes the core;
A3 tests sparse specialization; X3 tests graph/frontier value. X3 is labeled
*speculative/unproven*; K1 (strong single model + reward search) is the mandatory baseline.

### A.13 Falsification conditions (collaboration thesis falsified if ANY hold)
- state-aware best-of-N is non-inferior under matched compute;
- role-placebo or permuted-role controls match correct specialists;
- agent gains disappear under GPU-second matching;
- specialist activation approaches 100% of prompts;
- revision homogenization offsets coherence gains;
- human preferences do not reproduce automated-judge gains;
- gains depend on one checkpoint or one prompt family.

---

## PART B — TRACE canonical data model (§11, verbatim TypeScript)

### B.1 Evidence atom (every semantic inference begins here)
```typescript
interface EvidenceAtom {
  id: string; projectId: string; versionId: string;
  kind: "entity_mention" | "event" | "fact" | "belief" | "goal" | "relationship"
      | "object_state" | "setup" | "payoff" | "question" | "reveal" | "world_rule";
  proposition: string;
  sourceSpanIds: string[];
  extractorId: string; extractorVersion: string; confidence: number;
  status: "proposed" | "confirmed_by_writer" | "rejected_by_writer" | "committed" | "superseded";
}
```

### B.2 Story ledger (materialized, versioned, derived from evidence + writer corrections)
```typescript
interface StoryLedger {
  projectId: string; versionId: string; parentVersionId?: string;
  entities: Record<string, StoryEntity>;
  scenes: Record<string, LedgerScene>;
  events: Record<string, StoryEvent>;
  facts: Record<string, TemporalFact>;
  knowledge: KnowledgeRecord[];
  relationships: RelationshipRecord[];
  objects: ObjectStateRecord[];
  loops: PromiseRecord[];
  reveals: RevealRecord[];
  authorLocks: AuthorLock[];
  graph: DependencyGraph;
  extractionSummary: ExtractionSummary;
}
```

### B.3 Temporal fact (FactTrack-style validity interval + belief layer)
```typescript
interface TemporalFact {
  id: string; subjectId: string; predicate: string; object: string | number | boolean;
  layer: "objective" | "character_belief" | "audience_belief" | "narrator_claim" | "author_intent";
  holderId?: string;
  validFromSceneId: string; validUntilSceneId?: string;
  sourceSpanIds: string[]; confidence: number;
  writerStatus: "unreviewed" | "confirmed" | "corrected" | "intentional_ambiguity";
}
```

### B.4 Events + dependency edge types
```typescript
interface StoryEvent {
  id: string; sceneId: string; summary: string;
  actors: string[]; targets: string[];
  preconditions: PredicateRef[]; effects: StateEffect[];
  sourceSpanIds: string[]; confidence: number;
}
type DependencyType =
  | "causes" | "enables" | "motivates" | "reveals" | "supports_belief" | "contradicts"
  | "sets_up" | "pays_off" | "transfers_object" | "changes_relationship"
  | "requires_presence" | "requires_knowledge";
interface DependencyEdge {
  id: string; fromId: string; toId: string; type: DependencyType;
  sourceSpanIds: string[]; confidence: number;
  writerStatus: "inferred" | "confirmed" | "rejected";
}
```

### B.5 Knowledge, promise/payoff, author lock, audit finding
```typescript
interface KnowledgeRecord {
  id: string; holder: string | "AUDIENCE"; propositionId: string;
  status: "unknown" | "suspected" | "believed" | "known" | "misbelieved";
  confidence: number; acquiredAtSceneId?: string;
  sourceEventIds: string[]; sourceSpanIds: string[];
}
interface PromiseRecord {
  id: string;
  kind: "setup" | "clue" | "question" | "motif" | "threat"
      | "relationship_promise" | "genre_promise" | "object_expectation";
  description: string; openedAtSceneId: string;
  reinforcedAtSceneIds: string[]; payoffSceneIds: string[];
  status: "open" | "reinforced" | "paid" | "reframed" | "intentional_unresolved" | "possibly_abandoned";
  salience: "high" | "medium" | "low"; sourceSpanIds: string[]; confidence: number;
}
interface AuthorLock {
  id: string;
  scope: "fact" | "scene" | "character" | "relationship" | "reveal" | "dialogue"
       | "ending" | "style" | "finding_type";
  targetIds: string[]; instruction: string;
  mode: "do_not_challenge" | "preserve" | "intentional_ambiguity" | "soft_preference";
  createdBy: "writer"; createdAt: string;
}
interface AuditFinding {
  id: string; projectId: string; versionId: string;
  type: FindingType;
  classification: "conflict" | "strong_risk" | "craft_suggestion";
  title: string; explanation: string; whyItMatters: string;
  severity: 1 | 2 | 3 | 4 | 5; confidence: number; downstreamImpact: number;
  evidence: FindingEvidence[]; affectedNodeIds: string[]; uncertainty: string[];
  suggestedNextAction: "inspect" | "confirm_fact" | "test_change" | "request_repairs" | "dismiss";
  writerDisposition?: "useful" | "not_issue" | "intentional" | "unsure";
}
```

---

## PART C — TRACE algorithms (§12–17, verbatim)

### C.1 Extraction confidence thresholds (per record type; initial engineering settings)
| Record type | Auto-commit | Ask | Otherwise |
|---|---:|---:|---|
| Character cue identity | 0.98 | 0.85 | keep separate |
| Named object identity | 0.95 | 0.80 | uncertain object |
| Explicit fact | 0.90 | 0.72 | proposed only |
| Character belief | 0.86 | 0.68 | uncertain belief |
| Causal edge | 0.82 | 0.65 | omit from strong findings |
| Setup/payoff | 0.82 | 0.62 | soft candidate |
| Author intent | never infer as hard | ask only | uncertain |

### C.2 Confirmation-question selection (ask only the top 5 positive-value before first audit)
```
V(q) = U(q) · I(q) · P_answer(q) - C_writer(q)
```
U uncertainty reduction; I downstream finding impact; P_answer prob. writer answers quickly;
C_writer interruption cost.

### C.3 Finding classes (three epistemic levels)
- **Conflict** — supported by encoded state + strong evidence (two incompatible locations at same story time; object used with no custody path; info used with no evidence path; incompatible objective facts; violated prompt/lock).
- **Strong risk** — high-confidence structural concern, not a contradiction (reveal depends on evidence introduced too late; abandoned setup; agency collapse; repair removed a later motivation; duplicate information function).
- **Craft suggestion** — interpretive, never framed as fact.

### C.4 Knowledge legality
```
CanKnow(c,p,s) = DirectObservation ∨ CommunicationPath ∨ InferencePath ∨ PriorKnowledge ∨ WriterConfirmed
```
If no path exists → report a **knowledge risk** (info could have been learned offscreen), not an asserted plot hole. Finding must state: what the action requires knowing; latest known evidence path; whether offscreen explanation could resolve it.

### C.5 Temporal-consistency procedure
1. Extract explicit time anchors. 2. Build relative-order constraints. 3. Normalize days/dates/ages/durations. 4. Detect cycles or incompatible intervals. 5. Identify whether a flashback/dream/hypothetical/unreliable account explains the apparent conflict. 6. Produce a finding only when evidence remains sufficient.

### C.6 Open-loop lifecycle
Loop → `possibly_abandoned` only when: it remains open late enough to matter; no payoff or intentional-unresolved lock exists; earlier salience exceeds threshold; no later reframing explains it. Salience estimated from repetition, placement, dialogue emphasis, reaction, action emphasis, causal connection, writer confirmation.

### C.7 Reveal fairness (heuristic, never "bad twist")
Compute an evidence path from prior audience-visible clues to the revealed proposition. Seven questions: (1) ≥1 material clue available before? (2) chance to notice/remember? (3) decisive interpretation introduced only at reveal? (4) reinterprets vs replaces earlier material? (5) consistent with prior objective state? (6) downstream consequence? (7) confusion intentional + locked? Output language: "The audience currently receives the decisive evidence at the reveal," not "bad twist."

### C.8 Protagonist agency window
```
AgencyWindow = protagonist-driven consequential scenes / eligible scenes in window
```
Report stretches, not isolated scenes; no universal threshold as law.

### C.9 Change-impact
Supported changes:
```typescript
type ProposedChange =
  | { kind: "delete_scene"; sceneId: string }
  | { kind: "move_scene"; sceneId: string; beforeSceneId?: string; afterSceneId?: string }
  | { kind: "replace_scene_effects"; sceneId: string; proposedEffects: StateEffect[] }
  | { kind: "rewrite_scope"; sourceSpanIds: string[]; description: string }
  | { kind: "import_diff"; fromVersionId: string; toVersionId: string };
```
Procedure: clone ledger → isolated branch; apply typed patch; recompute direct facts/effects; traverse outgoing dependency edges; invalidate broken preconditions; recompute knowledge acquisition, object custody, relationships; re-evaluate loops+reveals in affected neighborhood; stop at stable boundaries/configured depth; return affected nodes, confidence, ambiguities.

Impact set over dependency graph `G=(V,E)`, changed nodes `C⊂V`:
```
I(C) = C ∪ Reach⁺(C, E_impact)     // E_impact = edge types that can propagate invalidation/changed meaning
```
Per-node severity:
```
Impact(v) = EdgeStrength(v) · NodeImportance(v) · Confidence(v) · ProximityDecay(v)
```
Categories: **Broken / Weakened / Changed meaning / Needs review / Improved.**
Full re-audit triggers: >X% scenes materially changed; act ordering changed substantially; character identity mapping changed; ending/main reveal changed; graph confidence < threshold; writer requests it.
```typescript
interface ChangeImpactReport {
  proposedChange: ProposedChange; branchVersionId: string;
  directEffects: ImpactItem[]; downstreamEffects: ImpactItem[];
  resolvedFindings: string[]; newFindings: AuditFinding[];
  uncertainty: string[]; affectedSceneIds: string[];
  estimatedRewriteScope: "small" | "medium" | "large";
}
```

### C.10 Repair portfolio
Objective (weights are product config, not craft law):
```
Score(r) = F(r) + P(r) + A(r) + T(r) - D(r) - U(r) - C(r)
```
F finding-resolution strength; P preservation of unaffected state+voice; A author-intent alignment;
T thematic/genre fit; D downstream disruption; U unresolved uncertainty; C rewrite/production cost proxy.
Three modes: **minimal disruption / bold structural / production-cheap.**
Candidate returns typed ops before prose:
```typescript
interface RepairCandidate {
  id: string; mode: "minimal" | "bold" | "production_cheap";
  title: string; rationale: string; operations: StoryOperation[];
  affectedSceneIds: string[]; fixesFindingIds: string[];
  risks: string[]; questionsForWriter: string[];
  validation: RepairValidation; estimatedRewriteScope: "small" | "medium" | "large";
}
```
Validation order (fail-closed): 1 schema validity; 2 author-lock compliance; 3 identity+timeline; 4 presence+object custody; 5 knowledge legality; 6 causal preconditions; 7 open-loop effects; 8 reveal effects; 9 production-friction change; 10 duplicate-candidate detection; 11 explanation generation. Return fewer than 3 if 3 distinct valid candidates can't be found, and explain why.

### C.11 Finding priority + confidence + abstention
```
Priority(f) = α·S_f + β·log(1+I_f) + γ·C_f + δ·R_f + ε·A_f - ζ·U_f - η·D_f
```
S severity; I downstream-impact count weighted by edge type; C evidence confidence; R reader-facing
consequence; A author relevance/selected profile; U unresolved uncertainty; D duplication with higher-ranked findings. Weights versioned, tuned against writer judgments.
- **Confidence composition:** a high-confidence finding cannot be built from a low-confidence critical premise unless the writer confirms it.
- **Severity vs confidence kept separate:** low-confidence + high-severity → a confirmation question, not a finding.
- **Explanation template:** `Observation → Evidence → Inferred dependency → Consequence → Uncertainty → Next action`.
- **Deduplication:** cluster findings sharing root cause / evidence spans / affected event / proposed action → one primary finding + secondary effects.
- **Abstention triggers:** unreliable parse; unresolved entity identity; missing critical evidence; author intent determines the issue; models disagree beyond threshold; rule inappropriate for genre/style.

### C.12 Deterministic vs probabilistic responsibility (hard boundary)
Deterministic owns: file parsing + source offsets; project/version identity; schema validation;
writer-confirmed facts; dependency-graph storage; diff calculation; graph traversal; hard precondition
checks; confidence-aggregation rules; audit history + deletion.
Model proposes: entity aliases; event summaries + inferred effects; goal/belief hypotheses;
setup/payoff hypotheses; causal-link candidates; issue explanations; repair strategies; bounded prose
patches; uncertainty estimates; natural-language presentation.

---

## PART D — Reference Engine 0.2.0 proof kernel (Python, verbatim behavior)

### D.1 Validator chain (ordered; `ProofKernel.validators`)
1. `VersionValidator` → `STORY_ID_MISMATCH`, `STALE_WRITE` (expected vs current story version).
2. `ActorValidator` → `ACTOR_MISSING`, `ACTOR_DEAD` (skips `user`/`system`).
3. `PreconditionsValidator` → `PRECONDITION_FAILED` (per `evaluate_condition`).
4. `KnowledgeValidator` → `KNOWLEDGE_HOLDER_REQUIRED`, `KNOWLEDGE_LEAK` (`character_knows` gate).
5. `SpatialValidator` → `PHYSICAL_ACTOR_REQUIRED`, `NOT_COLOCATED` (holder-aware object location).
6. `IntentionalityValidator` → `INTENTION_MISSING`, `INTENTION_UNSUPPORTED` (beat must bind to active goal/intention; `author_override` exempts).
7. `EventSemanticsValidator` → state-changing domains: canon, character, object, relationship, belief, audience, promise, deception, mechanism, structure, scene; a `DIALOGUE_LINE` that changes none is flagged (dialogue-is-action).
8. `ApplyAndInvariantValidator` → applies ops, checks global invariants + unmet hard promises + licensed-fact existence for screenplay beats.
9. `ProvenanceValidator` → blocks export use of records whose `rights_status ∈ {unknown, restricted}` without `export` in `allowed_uses`.

Severity ladder: `BLOCKER` (asserts only encoded facts) / `WARNING` / `INFO`. Every finding carries `code, message, validator, related_ids, repair_hint`.

### D.2 State functions (deterministic canon)
```python
state_hash(state)                      # sha256 over canonical_json(state) — reproducibility receipt
active_fact(state, fact_id, at_version=None)         # validity-interval lookup
character_knows(state, character_id, fact_id)        # known_fact_ids OR belief status KNOWN/SUSPECTED within version interval
evaluate_condition(state, condition) -> (ok, description)   # kinds incl. character_knows, fact_active, ...
unmet_hard_promises(state, at_version=None)          # active promise, hard, deadline_version < version
promise_payoff_satisfied(state, promise_id)          # all payoff_conditions evaluate true
apply_op / apply_ops(state, ...) -> changed_domains  # versioned, returns changed-domain set
```
`character_knows` truth rule (verbatim logic): true if `fact_id ∈ character.known_fact_ids`, OR a belief exists with `holder_id==c`, `fact_id==f`, `status ∈ {KNOWN, SUSPECTED}`, and `valid_from_version ≤ version ≤ (valid_until_version or ∞)`.

### D.3 Craft-check registry (11 checks; severity/tier/gate/determinism are explicit fields)
| pass | check_id | confidence_tier | gate_default | determinism |
|---|---|---|---|---|
| causality | causality_sequentialization_density_v1 | worth_a_look | soft_rank | heuristic |
| causality | causality_missing_parent_v1 | strong_evidence | hard_blocker | structured_only |
| scene_dynamics | scene_no_state_change_v1 | strong_evidence | hard_blocker | structured_only |
| scene_dynamics | scene_state_change_positive_v1 | strong_evidence | positive_signal | structured_only |
| world_integrity | character_invariant_break_v1 | strong_evidence | hard_blocker | structured_only |
| world_integrity | setup_payoff_deadline_v1 | strong_evidence | hard_blocker | deterministic |
| world_integrity | object_unique_ownership_v1 | strong_evidence | hard_blocker | deterministic |
| dialogue | dialogue_subtext_gap_v1 | worth_a_look | soft_rank | structured_only |
| dialogue | dialogue_voice_swap_risk_v1 | pattern_to_watch | soft_rank | heuristic |
| dialogue | dialogue_function_positive_v1 | strong_evidence | positive_signal | structured_only |
| vertical_format | vertical_episode_button_v1 | worth_a_look | soft_rank | heuristic |

Key rule (matches NORTH_STAR): only `structured_only`/`deterministic` checks may be `hard_blocker`; every `heuristic` check is `soft_rank` at most. Positive-signal gates feed earned-strengths.

`CraftFinding` contract: `finding_id, check_id, pass_id, severity{blocker|major|minor|positive|info}, confidence_tier{strong_evidence|worth_a_look|pattern_to_watch}, headline, diagnosis, actionable_direction, evidence[], status{open|cleared|persisting|new|suppressed|overridden}, genre_format_note`.

### D.4 JSON schemas (required fields — the wire contracts)
- **check-definition-v1:** `id, pass_id, name, version, status, description, craft_basis, applicability, confidence_tier, gate_default, determinism, actionable_direction_template, provenance, distinct_from` (+ tags). `craft_basis` = `{principle, source_kind, citation, limitations}`.
- **audit-finding-v1:** `finding_id, check_id, pass_id, severity, confidence_tier, headline, diagnosis, actionable_direction, evidence, status` (+ related_ids, root_cause_group, feedback).
- **audit-report-v1:** `schema_version, report_id, project_id, source_digest, context, parse_confirmation, summary, findings, pass_summaries, generated_at` (+ delta).
- **parse-confirmation-v1:** `source_id, source_type, parser_version, scene_count, dialogue_block_count, action_block_count, character_cues, ambiguities, confidence, confirmed` (+ confirmed_by/at, source_digest).
- **world-ledger-v1:** `schema_version, meta, characters, locations, objects, facts, beliefs, relationships, events, promises, audience_model, scenes, global_invariants, version_history` (+ author_intent).
- **coverage-matrix-v1:** `schema_version, pass_id, pass_name, nearest_neighbors, last_updated_wave, saturation_status, matrix, checks` (+ structural_positions, modes).

### D.5 Calibration corpus gate (`run_corpus_gate`)
Manifest `fixtures.json` → each fixture: `{id, path, category(great|middle|broken|…), format, genres, metadata, expected}` where `expected = {must_fire[], must_not_fire[], allowed_warnings[]}`. Gate computes per fixture: `missing_required = must_fire − fired`, `forbidden_fired = must_not_fire ∩ fired`; for `category=="great"` fixtures, any hard blocker firing is an `unexpected_blocker` (a great script must not blocker-fire). Corpus passes only if all fixtures pass. "Great" band = real public-domain samples (Ibsen *A Doll's House*, Chekhov *The Seagull*, Wilde *Earnest*); "broken" band = targeted single-defect fixtures (no_state_change, personality_invariant_break, overdue_hard_promise, object_ownership_conflict, pure_and_then_sequence).

---

## PART E — FactTrack pipeline (temporal validity intervals, verbatim)

Four-step **Decompose–Determine–Contradiction–Update** loop, run per new event, over a world-state structure:
1. **Decompose** the event into *directional atomic facts* — LLM splits into **pre-facts** and **post-facts** (akin to pre/postconditions but in natural text; imply truthfulness across the whole validity interval).
2. **Determine** each atomic fact's **validity interval** using the world state.
3. **Detect contradictions** with existing facts via temporal overlap of validity intervals — distinguishes a *legitimate contradiction* from a fact that simply *changed over time*.
4. **Update:** add new facts, expire/close superseded ones (set `validUntil`).
This is the theoretical basis for TRACE `TemporalFact.validFromSceneId/validUntilSceneId` (B.3) and the engine's `active_fact(at_version)` interval lookup (D.2). Also yields plot-redundancy detection (an already-killed monster cannot be defeated again).

---

## PART F — Mapping to the shipped TS engine (what each contract becomes)

| Source contract | Shipped engine target | Gap to close |
|---|---|---|
| A.9 Pareto + A.10 CVaR | generation/converge selection | selection is scalar today; add Pareto set + tail-risk guard |
| A.11 homogenization stop | revision pipeline | add ΔN/ΔH stop rule + retain pre-critique lineage |
| A.13 falsification + role-placebo | generation eval harness | add matched-budget + placebo/permutation controls |
| B.1 EvidenceAtom + B.3 TemporalFact | `server/nvm/state` facts/beliefs | add provenance+confidence per atom; validity intervals already partial |
| B.5 AuthorLock | new module | import-time locks that outrank inference (see C.2) |
| C.9 Change-impact | `server/nvm` dependency graph | surface `I(C)`/`Impact(v)` as the headline feature |
| C.10 Repair portfolio | converge/revision | 3 validated modes + validation order (fail-closed) |
| C.11 Priority/abstention | doctor report | add abstention output + confidence-can't-exceed-evidence clamp |
| D.1 validator chain | proof kernel parity | use the 9-validator order as a TS conformance spec |
| D.3 tier×gate matrix | rulebook | port `confidence_tier × gate_default × determinism` fields onto rules |
| D.5 corpus gate | calibration corpus | add real-literary "great" band + must_fire/must_not_fire gate |
| E FactTrack | temporal facts | pre/post-fact decomposition + interval-overlap contradiction test |

Nothing here is scheduled by this document — the sequenced adoption order lives in
`ROADMAP.md` §7 and the rationale in `RESEARCH_INTEGRATION_2026-07-11.md`.
