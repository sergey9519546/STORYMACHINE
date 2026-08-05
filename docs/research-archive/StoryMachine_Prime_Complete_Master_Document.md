---
title: "StoryMachine Prime - Complete Research, Architecture, and Build Blueprint"
subtitle: "Consolidated master document from all collected StoryMachine research and project notes"
author: "Prepared for the StoryMachine project"
date: "June 2026"
geometry: margin=0.75in
fontsize: 10pt
---

# Scope and Method

This document is the consolidated StoryMachine master document requested after the earlier summaries proved too thin. It integrates the available project files, research notes, audits, architecture revisions, build-guide decisions, and current verified research direction into one coherent artifact.

Scope discipline: this document uses the uploaded and visible StoryMachine materials available in the workspace. It does not claim access to hidden or inaccessible project chats outside the available source set. The internal files collectively contain the project's current consensus: StoryMachine should be a proof-first Narrative OS / Narrative Virtual Machine, not a generic AI writing chatbot.

The document does four jobs:

1. Preserves the final project position.
2. Compares and resolves the research contradictions.
3. Converts the architecture into buildable schemas, modules, workflows, and acceptance gates.
4. Separates what is research-backed, craft-inferred, and must-build-new.

## Internal source inventory

| ID | Internal source | Approx. words |
|---|---:|---:|
| I1 | AI StoryMachine Development.txt | 4,936 |
| I2 | AI_StoryMachine_Research_Compendium.pdf | 14,693 |
| I3 | Advanced AI Story Engine Research.docx | 4,446 |
| I4 | Architectural Specification for an Advanced Cognitive Narrative Engine and Screenplay IDE (1).pdf | 6,157 |
| I5 | Architectural Specification for an Advanced Cognitive Narrative Engine and Screenplay IDE.pdf | 4,689 |
| I6 | Markov Storytelling Algorithm.txt | 5,486 |
| I7 | Research and Implementation Plan.txt | 5,947 |
| I8 | Story Engine Computability.txt | 1,380 |
| I9 | Story Machine Design.txt | 5,738 |
| I10 | StoryMachine Build Guide.txt | 2,922 |
| I11 | StoryMachine Master Document.txt | 6,004 |
| I12 | StoryMachine_Complete_Research_Document.docx | 17,698 |
| I13 | StoryMachine_Prime_v6_3_Master_Document_June_2026.docx | 5,837 |
| I14 | [NEW] research and upgrades.txt | 7,061 |

## Evidence labels used throughout

| Label | Meaning | How to use it |
|---|---|---|
| Research-backed | Directly supported by current systems, papers, benchmarks, or stable engineering practice. | Use as architectural support, but still test internally. |
| Craft-inferred | Strong dramaturgical or screenwriting doctrine, not directly proven by a cited system. | Use as design policy and editorial logic. |
| Must-build-new | Not solved by any cited source as an integrated system. | Treat as product moat and validation burden. |

# 1. Executive Thesis

StoryMachine is not an AI screenplay generator.

StoryMachine is a dual-mode, proof-first Narrative OS:

```text
LIVE MODE
A mutable dramatic runtime where the writer enters a living story-state system and changes the world through action, dialogue, refusal, discovery, deception, relationship pressure, and irreversible choice.

FINAL MODE
A screenplay compiler that turns the realized path through that validated story state into fixed screenplay pages, then improves those pages through targeted rewrite passes without corrupting canon.
```

The product goal is not:

```text
Prompt -> screenplay
```

The product goal is:

```text
Writer enters living dramatic system
-> actions and dialogue mutate typed state
-> branch futures evolve causally
-> proof gates validate every commit
-> screenplay memory captures the realized path
-> final mode compiles clean Fountain / script pages
-> targeted passes polish without corrupting canon
```

The strongest one-line definition:

> StoryMachine is a proof-first Narrative OS for turning living, validated story state into editable screenplay while preserving canon, causality, character intention, epistemic asymmetry, dramatic mechanism, and downstream consequence.

## Stable operating loop

```text
Author Intent
-> Narrative State
-> Story Pressure
-> Candidate Transition
-> StoryOps
-> Proof Kernel
-> Scene Plan
-> Dialogue / Action Plan
-> ScreenplayMemory
-> Clean Screenplay
-> Diagnostics
-> Author-approved Canon Commit
```

## Non-negotiable law

```text
Proof before prose.
State before text.
Event before state.
Branch before scene.
Dialogue as action.
LLM as proposer / repairer / renderer, not canon.
```

## Product moat

The writer-facing question that defines the whole product is:

```text
What breaks if I change this?
```

A writer should be able to click any line, beat, reveal, clue, object, relationship turn, scene, motif, or branch and see:

```text
Why this exists.
What it changes.
Who knows it.
Who misbelieves it.
Who is hiding it.
Which mechanism it operates.
Which future payoff it enables.
What breaks if it is removed or changed.
```

That is the ScriptIDE distinction. The product is not another button that writes pages. It is a narrative proof debugger.

# 2. Final Decision Summary

| Area | Final decision |
|---|---|
| Product identity | Narrative OS / Narrative Virtual Machine. |
| First shippable wedge | Proof-only script intelligence/debugger before full generation. |
| Truth source | Append-only Event-Sourced Canon Ledger. |
| Runtime read source | StoryState projection rebuilt from events. |
| Active scene | SceneState runtime container. |
| Futures | BranchNode DAG with merge semantics. |
| Screenplay | Rendered projection from ScreenplayMemory, not canon. |
| Memory | SEEM-style Episodic Event Frames feeding E2RAG-style entity/event graph projections. |
| Generation | LLM proposes, extracts, repairs, critiques, and renders; it cannot commit canon. |
| Dialogue | Compiled speech + action; every turn must have intent, tactic, mechanism, and state delta. |
| Learning | Offline/shadow/canary adaptation only; no live self-mutating swarm. |
| Evaluation | ConStory-Bench + FlawedFictions-style adversarial regression factory. |
| Rights | Functional annotation and synthetic equivalents, not raw protected-script imitation. |
| Production stack | PostgreSQL/JSONB, event log, pgvector, BM25, Redis workers, S3 artifacts, OpenTelemetry-style traces. |

# 3. What Is Removed or Downgraded

The old Shannon-Haeggstroem StoryMachine framing is no longer active architecture. The project learned from it, but the direct mathematical claims were too strong.

| Deprecated idea | Final correction |
|---|---|
| Gibbs measure over raw prose detects plot holes | Removed. Plot holes become computable only after prose is converted into typed facts, events, beliefs, object states, causal links, and constraints. |
| CFTP perfectly samples complete stories | Removed. CFTP requires special monotone/bounding structures not present in open-ended narrative generation. |
| Percolation/BK/BHK preserves mystery | Removed. Use graph separation invariants plus audience-state modeling instead. |
| HMM/Markov chain is the story engine | Downgraded. HMM/semi-Markov logic may help with pacing phases, but cannot enforce causality, intention, knowledge legality, object continuity, relationship debt, or payoff obligations. |
| Stationary distribution represents a satisfying story arc | Removed. Story arcs are directional, phase-conditioned, and debt-driven, not stationary. |
| Universal entropy band for pacing | Removed. Entropy/JSD only apply over defined distributions, not raw prose or universal story quality. |
| Universal zero-sum story logic | Removed. Use typed resource logic: consumable, transferable, copyable, persistent, depleting, accumulating, positive-sum, negative-sum. |
| Raw-script imitation training | Removed unless rights are secured. Use functional annotation and synthetic equivalents. |
| Constraint solving catches all plot holes | Downgraded. It catches encoded contradictions only. |
| Do-calculus as universal narrative formula | Downgraded. Use causal graph surgery as dependency simulation unless a valid probabilistic SCM exists. |
| Binary belief matrix | Removed as too crude. Use typed belief graph with attitudes, confidence, source reliability, time, and nested belief. |

Correct computational rule:

```text
Do not compute story quality over raw prose.
Represent story meaning as typed state where possible.
Validate hard constraints.
Use soft metrics only to rank or diagnose already-valid candidates.
Render prose last.
```

# 4. What Stays

The retained architecture is:

```text
Event-Sourced Canon Ledger
-> StoryState Projection
-> SceneState Runtime Container
-> BranchNode DAG
-> Temporal Fact Store
-> Entity/Event Graph Projection
-> Knowledge / Belief Graph
-> Causal StoryGraph
-> Character Mind Engine
-> Relationship Engine
-> Mechanism Compiler
-> Drama Manager
-> Storylet Eligibility Engine
-> Proof Kernel
-> Dialogue / Action Compiler
-> ScreenplayMemory Projection
-> Screenplay Compiler
-> Regression Harness
-> ScriptIDE Proof Interface
```

| Concept | Correct role |
|---|---|
| Event sourcing / CQRS | Canon history, replay, rollback, branch, audit, and projection. |
| Branch DAG | Possible and committed futures, including merge/convergence. |
| POCL / IPOCL | Causality plus character intentionality. |
| HTN planning | Mechanism-specific decomposition of high-level story functions into executable tasks. |
| Storylets | Authorable conditional dramatic units. |
| FactTrack-style facts | Time-aware atomic facts and validity intervals. |
| Belief / epistemic graph | Who knows, suspects, misbelieves, hides, remembers, or pretends. |
| Ceptre / linear logic inspiration | Resourceful state rewriting. |
| Information theory | Reader-state diagnostics over defined distributions. |
| ConStory-Bench / FlawedFictions | Regression and adversarial continuity tests. |
| Dialogue compiler | State-changing speech/action under mechanism pressure. |
| ScriptIDE | Diagnostic editor and proof interface. |
| LLMs | Propose, extract, repair, critique, render, summarize; never silently commit canon. |

# 5. Research Foundation and Source Register

The literature supports ingredients, not the full integrated product. StoryMachine remains a must-build-new system that combines multiple research lines into one product architecture.

## 5.1 Core research map

| Research line | Representative source | Contribution | StoryMachine adoption | Limitation |
|---|---|---|---|---|
| Time-aware canon | FactTrack | Atomic facts with validity intervals and contradiction detection. | Adopt now for TemporalFact and Canon Ledger. | Does not solve character arc or screenplay compilation. |
| Graph-first planning | PLOTTER | Event/character graph planning with Evaluate-Plan-Revise. | Adopt as planning policy and candidate repair cycle. | Preprint; extraction and repair complexity remains. |
| Long-form consistency | ConStory-Bench / Lost in Stories | 2,000 prompts, 5 error categories, 19 subtypes. | Adopt taxonomy for regression and proof reports. | Checker depends on fact extraction quality. |
| Plot-hole adversarial tests | FlawedFictions | Synthetic plot-hole injection; LLMs struggle as story length increases. | Adopt for adversarial benchmark factory. | Does not provide full repair architecture. |
| Graphical world models | Shadow-Loom | Versioned graphical world model; LLM at boundary; causal/narrative physics. | Adopt as reference architecture, not proof of production readiness. | Research artifact, not benchmarked production system. |
| Entity/event retrieval | E2RAG | Separate entity and event graphs linked by bipartite mapping. | Adopt as derived memory projection. | Retrieval framework, not full story runtime. |
| Episodic memory | SEEM | Graph memory plus episodic event frames with provenance. | Adopt for EpisodicEventFrame and memory population. | Agent memory, not screenplay-specific. |
| Dialogue conditioning | Action2Dialogue | Scene/action-conditioned dialogue with Recursive Narrative Bank. | Adopt as support for scene-grounded dialogue. | Does not validate state-change proof. |
| Emotional retrieval | Emotional RAG | Semantic + emotional memory retrieval for role-playing agents. | Adopt for emotion-indexed memory retrieval. | Role-play focus, not proof kernel. |
| Character representation | CHIRON | Character sheets with validation against false facts. | Adopt for character state extraction and validation. | Does not model dramatic mechanism by itself. |
| Generative agents | Generative Agents | Memory stream, reflection, planning. | Adopt selectively for character memory/planning patterns. | Agents can drift without proof gates. |
| Linear logic | Ceptre | Rule language for generative interactive systems and resource usage. | Adopt as model for resource rewrite engine. | Not a full screenplay system. |
| Narrative planning | Riedl & Young / IPOCL | Plot causality plus character intentionality. | Adopt as core planning doctrine. | Older symbolic planning requires adaptation. |
| Storylets | Lume | Constraint-selected parameterized scene fragments. | Adopt for storylet eligibility engine. | Needs global story-state integration. |
| Production observability | OpenTelemetry, AgentTrace-style ideas | Traces, logs, runtime diagnostics. | Adopt for AI/runtime observability. | Needs domain-specific trace schema. |
| Collaboration | Yjs/CRDT concepts | Concurrent editing and relative anchors. | Prototype after proof-only MVP. | Screenplay AST overlay is required. |

## 5.2 Verified source register

- FactTrack: Lyu, Yang, Kong, and Klein, "FactTrack: Time-Aware World State Tracking in Story Outlines," NAACL 2025. Key use: atomic facts, validity intervals, contradiction detection.
- PLOTTER: Gu et al., "Planning Beyond Text: Graph-based Reasoning for Complex Narrative Generation," arXiv:2604.21253. Key use: graph-based Evaluate-Plan-Revise over event and character graphs.
- ConStory-Bench / Lost in Stories: Li et al., arXiv:2603.05890. Key use: long-form consistency taxonomy and evidence-grounded contradiction checker.
- Shadow-Loom: Wilmot, arXiv:2605.02475. Key use: versioned graphical world model; LLMs at boundary; typed graph reasoning.
- E2RAG: Zhang et al., "Respecting Temporal-Causal Consistency: Entity-Event Knowledge Graphs for Retrieval-Augmented Generation," arXiv:2506.05939. Key use: entity/event dual graph and ChronoQA.
- SEEM: Lu et al., "Structured Episodic Event Memory," arXiv:2601.06411. Key use: Episodic Event Frames, provenance, graph plus episodic memory.
- Action2Dialogue: Kang and Lin, arXiv:2505.16819. Key use: scene/action-conditioned dialogue and Recursive Narrative Bank.
- Emotional RAG: Huang et al., arXiv:2410.23041. Key use: semantic and emotional retrieval for character memory.
- FlawedFictions: Ahuja, Sclar, and Tsvetkov, arXiv:2504.11900. Key use: plot-hole detection benchmark and synthetic flaw injection.
- CHIRON: Gurung and Lapata, arXiv:2406.10190. Key use: rich character-sheet representation and validation.
- Generative Agents: Park et al., arXiv:2304.03442. Key use: memory stream, reflection, planning for believable agents.
- Ceptre: Martens, AIIDE 2015. Key use: linear-logic rule language for generative interactive systems.
- IPOCL / Narrative Planning: Riedl and Young, JAIR 2010. Key use: causal plot progression plus character intentionality.
- Lume: Mason et al. Key use: storylets, formal constraints, parameterized scenes.

## 5.3 Research adoption policy

1. Stable/foundational sources can justify architecture patterns: IPOCL, FactTrack, CHIRON, Lume, Ceptre, Generative Agents, ConStory-Bench, FlawedFictions, E2RAG, SEEM.
2. Recent preprints guide design but cannot be treated as production proof without internal replication: PLOTTER, Shadow-Loom, Graph-R1, Graph-RFT, AdaTKG, AgentTrace-style observability.
3. RL, self-improvement, and autonomous multi-agent mechanisms must remain lab/shadow mode until they beat deterministic baselines without increasing false positives, cost, latency, rights risk, or knowledge leaks.
4. Every source must be connected to an implementation object: schema, validator, UI panel, test fixture, or roadmap item.

# 6. Product Definition and User Promise

StoryMachine helps writers build coherent, emotionally functional stories by tracking canon, causality, character knowledge, relationship pressure, object arcs, reveals, themes, pacing, dialogue function, and downstream consequences.

It is not:

```text
a chatbot
a prompt chain
a screenplay autocomplete tool
a Markov story toy
a raw LLM wrapper
a one-shot outline generator
```

It is:

```text
a stateful dramatic runtime
+ event-sourced canon
+ temporal-causal story graph
+ belief / epistemic engine
+ character mind engine
+ branch DAG
+ proof kernel
+ dialogue/action compiler
+ screenplay compiler
+ ScriptIDE diagnostic surface
```

## 6.1 Product modes

### Live Mode

Live Mode is a mutable story-state runtime. The writer may start from nothing, fragments, a character, a premise, a world, a genre, an uploaded outline, a partial treatment, or prior scenes.

The system creates:

```text
premise field
cast field
world field
opening pressure
initial mechanisms
initial branch frontier
first playable scene
```

The writer can enter as a character, an author-presence, a director, a narrator, or a player-writer hybrid. Every action or line becomes:

```text
raw user input
-> parsed intent/action
-> precondition check
-> belief/knowledge legality check
-> StateDelta / StoryOps
-> event append
-> StoryState projection
-> SceneState update
-> BranchNode DAG update
-> ScreenplayMemory projection
-> rendered continuation
```

### Final Mode

Final Mode is not a fresh generation pass. It compiles the realized state path:

```text
committed branch path
-> ScreenplayMemory
-> ScreenplayIR
-> clean Fountain
-> annotated/debug Fountain
-> targeted rewrite diagnosis
-> continuity-preserving rewrite passes
-> export
```

Final-mode rewrite may revise line polish, compression, pacing, transition prose, and action description. Any canon change requires a validated StatePatch.

### Proof-only wedge

The first shippable product should not attempt full feature screenplay generation. It should ingest an outline, beat sheet, or screenplay segment, create typed state, detect continuity/knowledge/reveal/payoff issues, show downstream breakage, and export a continuity/proof report.

This wedge proves the moat before the more expensive live runtime is complete.

# 7. Master Architecture

```text
CLIENTS
  ScriptIDE
  Live Runtime UI
  Beat Board
  Branch Explorer
  Diagnostics Console
  REST API
  SDK
  Worker Console

API LAYER
  Auth / Project API
  Story API
  Scene API
  Branch API
  Generation API
  Diagnostics API
  Compile API
  Export API

NARRATIVE RUNTIME
  Narrative State Kernel
  Event-Sourced Canon Ledger
  Branch DAG
  Temporal Fact Store
  Entity-Event Graph Projection
  Knowledge / Belief Graph
  Causal StoryGraph
  Character Mind Engine
  Relationship Engine
  Emotion Appraisal Engine
  Memory Retrieval Layer
  Mechanism Compiler
  Drama Manager
  Story Decision Council
  Storylet Eligibility Engine
  Constraint Solver
  Resource Rewrite Engine
  Reveal / Illusion Engine
  Theme Argumentation Engine
  Genre Intelligence Layer
  Information Diagnostics Engine
  Spatial-Cinematic Engine
  Dialogue / Action Compiler
  Screenplay Compiler
  Evaluation / Regression Harness
  LLM Orchestration Layer
  Rights / Provenance / Governance

STORAGE
  PostgreSQL
  JSONB story snapshots
  append-only story_events
  branch_edges
  pgvector / vector index
  BM25 text index
  Redis queue/cache/streams
  S3-compatible artifact storage
  telemetry / trace store

BACKGROUND WORKERS
  extraction workers
  projection workers
  proof workers
  generation workers
  retrieval workers
  regression workers
  benchmark workers
  export workers
```

Start with PostgreSQL + JSONB + append-only events. Do not start with a graph database as source of truth. Add graph-native infrastructure only when traversal bottlenecks are proven.

# 8. Runtime Model

The locked persistence pattern:

```text
1. Event Log
   Durable historical source of truth.

2. StoryState Snapshot
   Current materialized read model for fast runtime access.

3. SceneState
   Active dramatic execution container.

4. Branch DAG
   Possible / committed / merged / pruned futures.

5. ScreenplayMemory
   Rewriteable projection for compilation.

6. Rendered Screenplay
   Output artifact, not canon.
```

## 8.1 Runtime loop

```text
UserActionInput
-> ParsedAction
-> Proof Kernel
-> StoryEvent
-> StateDelta / StoryOps
-> StoryState projection
-> SceneState update
-> BranchNode DAG update
-> ScreenplayMemory projection
-> AI dramatization
-> RuntimeTurnResult
```

Core invariant:

```text
No prose without state.
No state without event.
No event without proof.
No branch without consequence.
No merge without conflict resolution.
No projection without checkpoint.
No compile without ScreenplayIR.
No export without provenance.
```

# 9. Core Data Model

The following schemas are the practical foundation. They are not final implementation code, but they define the runtime contracts.

## 9.1 StoryEvent

```ts
interface StoryEvent {
  id: EventID;
  story_id: StoryID;
  branch_id: BranchID;
  scene_id: SceneID | null;

  event_type:
    | "user_action"
    | "character_action"
    | "dialogue_line"
    | "belief_update"
    | "relationship_shift"
    | "conflict_escalation"
    | "reveal"
    | "lie"
    | "object_transfer"
    | "branch_created"
    | "branch_committed"
    | "branch_merged"
    | "branch_pruned"
    | "scene_resolved"
    | "screenplay_logged"
    | "revision_applied";

  actor_id: CharacterID | "user" | "system";
  payload: Record<string, unknown>;
  state_delta: StateDelta | null;

  causation_event_id: EventID | null;
  correlation_id: ID;
  command_id: ID;
  idempotency_key: string;

  expected_story_version: number;
  resulting_story_version: number;
  schema_version: number;
  created_at: TimestampISO;
}
```

## 9.2 StoryState

```ts
interface StoryState {
  story_id: StoryID;
  version: number;
  created_at: TimestampISO;
  updated_at: TimestampISO;

  mode: "live_runtime" | "compile_only" | "revision";
  phase:
    | "bootstrapping"
    | "opening"
    | "rising_action"
    | "midpoint"
    | "crisis"
    | "climax"
    | "resolution"
    | "compiled";

  canon: CanonState;
  world: WorldState;
  characters: Record<CharacterID, CharacterState>;
  relationships: Record<RelationshipID, RelationshipState>;
  beliefs: BeliefState;
  audience: AudienceState;
  conflicts: ConflictState;
  structure: StructureState;
  emotional_arc: EmotionalArcState;
  setups_payoffs: SetupPayoffState;

  active_scene_id: SceneID | null;
  active_branch_id: BranchID;
  branch_graph: BranchGraphState;

  event_log_ref: EventID[];
  screenplay_memory_ref: ID;

  safety_locks: SafetyLocks;
  diagnostics: StoryDiagnostics;
}
```

StoryState is authoritative for runtime reads. StoryEvent log is authoritative for history, replay, audit, branch recovery, and legal proof.

## 9.3 SceneState

```ts
interface SceneState {
  id: SceneID;
  branch_id: BranchID;
  source_story_version: number;

  slugline_candidate: string | null;
  location_id: LocationID | null;
  time_label: string | null;

  status: "booting" | "active" | "paused" | "resolved" | "aborted";

  participants: CharacterID[];
  pov_character_id: CharacterID | null;
  user_controlled_character_id: CharacterID | null;

  scene_goal: string;
  required_story_function: SceneFunction[];
  active_mechanism_ids: MechanismID[];

  visible_intentions: Record<CharacterID, string[]>;
  hidden_intentions: Record<CharacterID, string[]>;

  active_conflict_ids: ID[];
  belief_asymmetry_ids: ID[];
  audience_advantage_ids: ID[];

  emotional_temperature: number;
  power_map: Record<CharacterID, number>;

  reversal_candidates: ReversalCandidate[];
  beat_queue: SceneBeat[];
  committed_beats: SceneBeat[];

  exit_conditions: ExitCondition[];
  scene_result: SceneResult | null;
  diagnostics: SceneDiagnostics;
}
```

Scene rule:

```text
No scene closes unless at least one exit condition is satisfied.
No scene is valid unless at least one important state changes.
```

## 9.4 BranchNode DAG

```ts
interface BranchNode {
  id: BranchID;

  parent_branch_ids: BranchID[];
  child_branch_ids: BranchID[];

  merge_of_branch_ids?: BranchID[];
  common_ancestor_branch_id?: BranchID | null;

  branch_depth: number;
  trigger_event_id: EventID | null;
  trigger_description: string;

  status:
    | "latent"
    | "active"
    | "committed"
    | "merged"
    | "pruned"
    | "compiled";

  state_delta: StateDelta;
  branch_summary: string;

  scores: BranchScores;
  branch_hooks: string[];
  projected_next_scene_types: SceneFunction[];

  created_at: TimestampISO;
  committed_at?: TimestampISO;
  pruned_reason: string | null;
}
```

Branch invariants:

```text
No cycles.
No committed branch without trigger_event_id, except root.
No merge without common ancestor analysis.
No active branch whose parent is pruned.
No compiled branch unless every committed scene has ScreenplayMemory.
```

## 9.5 BranchMergePlan

```ts
interface BranchMergePlan {
  merge_id: ID;
  source_branch_ids: BranchID[];
  common_ancestor_branch_id: BranchID;

  merge_strategy:
    | "canon_union"
    | "canon_prefer_left"
    | "canon_prefer_right"
    | "manual_author_resolution"
    | "alternate_cut";

  conflicting_facts: FactID[];
  conflicting_beliefs: BeliefID[];
  conflicting_relationship_states: RelationshipID[];
  conflicting_object_states: ObjectID[];
  broken_payoffs: ID[];

  resolution_notes: string[];
}
```

## 9.6 StateDelta and StoryOps

```ts
interface StateDelta {
  semantic_summary: string;
  json_patch: JsonPatchOperation[];
  narrative_patches: NarrativePatch[];

  affected: {
    canon_fact_ids: ID[];
    character_ids: CharacterID[];
    relationship_ids: RelationshipID[];
    belief_ids: ID[];
    audience_thread_ids: ID[];
    conflict_ids: ID[];
    object_ids: ObjectID[];
    setup_payoff_ids: ID[];
  };

  proof: StateDeltaProof;
}
```

```ts
type JsonPatchOperation =
  | { op: "add"; path: string; value: unknown }
  | { op: "remove"; path: string }
  | { op: "replace"; path: string; value: unknown }
  | { op: "test"; path: string; value: unknown };
```

StoryOps are executable narrative bytecode:

```ts
type StoryOp =
  | { op: "ADD_FACT"; fact: AtomicFact }
  | { op: "EXPIRE_FACT"; factId: FactID; untilEventId: EventID }
  | { op: "UPDATE_BELIEF"; characterId: CharacterID; delta: BeliefDelta }
  | { op: "APPRAISE_EMOTION"; characterId: CharacterID; appraisal: EmotionAppraisal }
  | { op: "SHIFT_RELATIONSHIP"; relationshipId: RelationshipID; delta: RelationshipDelta }
  | { op: "ADVANCE_OBJECT_ARC"; objectId: ObjectID; delta: ObjectStateDelta }
  | { op: "TRIGGER_RULE"; ruleId: RuleID; eventId: EventID }
  | { op: "SEED_CLUE"; revealId: RevealID; clue: Clue }
  | { op: "PAYOFF_SETUP"; setupId: SetupID; payoffEventId: EventID }
  | { op: "RAISE_CLOCK"; clockId: ClockID; delta: ClockDelta }
  | { op: "ADVANCE_THEME_ARGUMENT"; edge: ThemeEdge }
  | { op: "UPDATE_AUDIENCE_STATE"; delta: AudienceStateDelta };
```

## 9.7 AtomicFact

```ts
interface AtomicFact {
  id: FactID;
  subject: EntityID;
  predicate: string;
  object: EntityID | string | number | boolean | null;

  truthStatus: "true" | "false" | "unknown" | "contested";

  validFromEventId?: EventID;
  validUntilEventId?: EventID;

  sourceEventId?: EventID;
  confidence: number;

  layer:
    | "objective_world"
    | "character_belief"
    | "audience_belief"
    | "author_intent"
    | "rumor"
    | "lie"
    | "memory"
    | "prediction";
}
```

Contradiction test:

```text
same subject/predicate
+ incompatible object
+ same epistemic layer
+ overlapping validity interval
+ no event explaining transition
= contradiction
```

This is not a contradiction:

```text
Truth: Nora was at the warehouse.
Leo believes: Nora was with her sister.
Audience knows: Nora lied.
Author intends reveal in Scene 38.
```

That is dramatic structure.

# 10. Knowledge and Belief Engine

Drama depends on asymmetry:

```text
Objective truth != character belief != audience belief != author intent.
```

## 10.1 Belief object

```ts
interface Belief {
  id: BeliefID;
  holder: CharacterID | "audience" | "writer";

  proposition: FactID | string;

  status:
    | "unknown"
    | "suspected"
    | "known"
    | "misbelieved"
    | "concealed"
    | "denied"
    | "contested";

  confidence: number;
  sourceEventId?: EventID;
  sourceReliability?: number;

  acquiredAtEventId?: EventID;
  validUntilEventId?: EventID;

  contradictedBy?: FactID[];
  supports?: FactID[];
}
```

## 10.2 Nested belief

```ts
interface NestedBelief {
  holder: CharacterID;
  targetMind: CharacterID;
  beliefAboutTarget: Belief;
  depth: 1 | 2 | 3;
}
```

Required queries:

```ts
type EpistemicQuery =
  | { type: "who_knows"; factId: FactID }
  | { type: "who_suspects"; factId: FactID }
  | { type: "can_character_know"; characterId: CharacterID; factId: FactID; atScene: SceneID }
  | { type: "would_this_line_leak_secret"; lineId: string }
  | { type: "what_does_audience_know"; sceneId: SceneID }
  | { type: "does_this_break_dramatic_irony"; eventId: EventID };
```

## 10.3 DeceptionThread

```ts
interface DeceptionThread {
  id: ID;
  deceiver_id: CharacterID;
  target_ids: Array<CharacterID | "audience">;
  false_proposition: string;
  truth_fact_id: FactID;
  lie_event_ids: EventID[];
  supporting_misdirections: ID[];
  risk_level: number;
  current_status: "hidden" | "suspected" | "exposed" | "reframed";
}
```

A lie is not just a line. It must create or update a deception thread.

# 11. Character Mind Engine

Characters are not personality prompts. They are BDI-style dramatic agents with wounds, needs, goals, fears, beliefs, masks, tactics, memories, and social constraints.

```ts
interface CharacterMind {
  id: CharacterID;
  name: string;

  existential: {
    wound?: string;
    need?: string;
    lieBelieved?: string;
    fear?: string;
    desire?: string;
    shameTrigger?: string;
    moralBoundary?: string;
    mask?: string;
  };

  strategic: {
    longTermGoals: Goal[];
    currentSceneObjective?: GoalID;
    fallbackObjective?: GoalID;
    escalationCondition?: Predicate;
    opponentModels: Record<CharacterID, OpponentModel>;
  };

  tactical: {
    currentTactic?: DialogueTactic | ActionTactic;
    pressureLevel: number;
    concealmentPressure: number;
    availableMoves: CandidateMove[];
  };

  beliefs: BeliefGraph;
  emotions: EmotionState;
  memory: CharacterMemory;
  relationships: Record<CharacterID, RelationshipID>;
}
```

Character action rule:

```text
A character action is valid only if:
1. the character can know enough to do it,
2. the action serves or protects some goal, wound, fear, lie, value, or tactical need,
3. the action does not violate the character model without a pressure-based explanation,
4. the action changes state.
```

# 12. Relationship Engine

Relationships are not one trust score. They are multi-axis pressure systems.

```ts
interface RelationshipState {
  id: RelationshipID;
  pair: [CharacterID, CharacterID];

  trust: number;
  intimacy: number;
  resentment: number;
  admiration: number;
  fear: number;
  dependency: number;
  obligation: number;

  power: {
    currentHolder?: CharacterID;
    mode: "equal" | "dominant" | "covert" | "unstable";
  };

  unresolvedDebts: RelationshipDebt[];
  ruptureHistory: EventID[];
  repairHistory: EventID[];

  publicFace: string;
  privateTruth: string;
}
```

Relationship rule:

```text
No major relationship repair without cost.
No betrayal without prior trust, dependence, obligation, or vulnerability.
No intimacy escalation without exposure, sacrifice, risk, or recognition.
```

# 13. Causal StoryGraph

```ts
interface EventNode {
  id: EventID;
  sceneId?: SceneID;
  beatId?: BeatID;

  type:
    | "action"
    | "decision"
    | "dialogue"
    | "discovery"
    | "reveal"
    | "betrayal"
    | "reversal"
    | "recognition"
    | "object_transfer"
    | "ritual"
    | "institutional_action";

  actorIds: CharacterID[];
  targetIds: Array<CharacterID | ObjectID | LocationID | FactID>;

  description: string;

  preconditions: Predicate[];
  effects: StatePatch[];

  causes: EventID[];
  enables: EventID[];
  causalLinks: CausalLink[];

  characterGoalServed?: GoalID[];
  characterGoalBlocked?: GoalID[];

  audienceEffect?: AudienceEffect[];
  setupIds?: EventID[];
  payoffIds?: EventID[];

  fabulaIndex: number;
  syuzhetIndex?: number;

  proof?: EventProof;
}
```

```ts
interface CausalLink {
  causeEventId: EventID;
  effectEventId: EventID;

  type:
    | "physical"
    | "social"
    | "emotional"
    | "epistemic"
    | "institutional"
    | "ritual"
    | "motivational"
    | "thematic";

  strength: number;
}
```

Every candidate beat must answer:

```text
Why can this happen?
Why would this character do it?
What changes afterward?
What future payoff does it enable?
What future payoff does it endanger?
What breaks if it is removed?
```

# 14. Mechanism Compiler

A strong story is not merely a sequence of events. It is a mechanism: theme made physical, social, ritual, epistemic, institutional, object-based, or psychological.

```ts
type MechanismKind =
  | "object_burden"
  | "legitimacy_split"
  | "relationship_externalization"
  | "ritual_law"
  | "canon_rebellion"
  | "false_purpose"
  | "clue_cascade"
  | "ability_psychology"
  | "identity_performance"
  | "predatory_wish_trap"
  | "cosmology_succession"
  | "emotion_governance";
```

```ts
interface StoryMechanism {
  id: MechanismID;
  kind: MechanismKind;

  themeClaim: string;
  protagonistWound: string;
  dramaticQuestion: string;

  carrier:
    | { type: "object"; objectId: ObjectID }
    | { type: "ritual"; ritualId: ID }
    | { type: "institution"; institutionId: ID }
    | { type: "relationship"; relationshipId: RelationshipID }
    | { type: "secret"; factId: FactID }
    | { type: "world_rule"; ruleId: ID };

  state: "seeded" | "pressurizing" | "inverting" | "paying_off" | "resolved";

  requiredBeats: MechanismBeat[];
  currentDebts: MechanismDebt[];
}
```

Mechanism rule:

```text
Every major scene must either:
advance a mechanism,
invert a mechanism,
pay off a mechanism,
expose the cost of a mechanism,
or create debt for a later mechanism.
```

# 15. Drama Manager

The Drama Manager chooses the next pressure, not the final prose. It tracks:

```text
story phase
scene function
tension debt
reveal debt
relationship debt
theme debt
object arc debt
genre obligations
reader load
curiosity decay
cooldown need
escalation need
```

Pacing states:

```ts
type PacingState =
  | "orientation"
  | "investigation"
  | "pressure"
  | "chase"
  | "reversal"
  | "reveal"
  | "aftermath"
  | "climax"
  | "resolution";
```

Markov/HMM/semi-Markov logic belongs here only as a phase/pacing controller, not as the story reasoner.

# 16. Dialogue / Action Compiler

This is the most important implementation correction.

The dialogue system should not ask:

```text
What would this character say?
```

It should ask:

```text
What is this character trying to do with this line?
What truth are they avoiding?
What pressure are they under?
What mechanism are they operating?
What state changes after they say or do it?
Could silence, gesture, exit, or object transfer do it better?
```

Final law:

```text
No line enters the screenplay unless it proves:
1. speaker objective,
2. hidden intent,
3. tactic,
4. active mechanism,
5. voice specificity,
6. knowledge legality,
7. subtext gap,
8. state change.
```

## 16.1 DialogueExchange

```ts
interface DialogueExchange {
  sceneId: SceneID;
  activeMechanism: MechanismID;

  before: {
    beliefs: BeliefSnapshot[];
    emotions: EmotionSnapshot[];
    relationships: RelationshipSnapshot[];
    power: PowerSnapshot[];
    objectStates: ObjectStateSnapshot[];
    audienceKnowledge: AudienceKnowledgeSnapshot[];
  };

  turns: DialogueTurn[];

  after: {
    beliefs: BeliefDelta[];
    emotions: EmotionDelta[];
    relationships: RelationshipDelta[];
    power: PowerDelta[];
    objectStates: ObjectStateDelta[];
    audienceKnowledge: AudienceKnowledgeDelta[];
  };

  proof: DialogueProof;
}
```

A dialogue exchange fails if before and after are identical.

```text
No state change -> no scene.
```

## 16.2 DialogueTurn

```ts
interface DialogueTurn {
  id: string;
  speakerId: CharacterID;
  surfaceLine: string;

  hiddenIntent: string;

  tactic:
    | "deflect"
    | "accuse"
    | "test"
    | "threaten"
    | "comfort"
    | "perform_role"
    | "conceal"
    | "reframe"
    | "stall"
    | "confess"
    | "deny"
    | "bait"
    | "plead"
    | "command"
    | "joke"
    | "misdirect"
    | "withdraw";

  target: CharacterID | ObjectID | BeliefID | string;
  activeMechanism: MechanismID;

  explicitMeaning: string;
  subtextMeaning: string;

  beliefDelta?: BeliefDelta;
  emotionDelta?: EmotionDelta;
  powerDelta?: PowerDelta;
  relationshipDelta?: RelationshipDelta;
  objectStateDelta?: ObjectStateDelta;
  clueDelta?: ClueDelta;

  voiceFeatures: VoiceFeature[];
  performanceBeat?: ActionBeat;
  silenceAlternative?: boolean;
}
```

## 16.3 Action-as-dialogue

```ts
interface DialogueActionBeat {
  actorId: CharacterID;
  action: string;
  replacesLine?: string;
  answersPreviousLine?: string;
  stateDelta: StatePatch;
  subtextMeaning: string;
}
```

Validator:

```text
Could this spoken line be stronger as:
silence,
object transfer,
gesture,
refusal,
physical action,
gaze,
exit,
failed answer?
```

# 17. Proof Kernel

The Proof Kernel is the commit gate. It does not prove literary greatness. It proves encoded legality and emits diagnostics for softer judgments.

```ts
type ProofType =
  | "temporal"
  | "causal"
  | "intentional"
  | "motivational"
  | "emotion"
  | "relationship"
  | "epistemic"
  | "reveal"
  | "theme"
  | "mechanism"
  | "genre"
  | "reader"
  | "spatial"
  | "dialogue"
  | "provenance";
```

```ts
interface NarrativeProof {
  transition_id: TransitionID;

  temporal: TemporalProof;
  causal: CausalProof;
  intentional: IntentionalProof;
  motivational: MotivationalProof;
  emotional: EmotionProof;
  relationship: RelationshipProof;
  epistemic: EpistemicProof;
  reveal: RevealProof;
  theme: ThemeProof;
  mechanism: MechanismProof;
  reader: ReaderProof;
  spatial?: SpatialProof;
  dialogue?: DialogueProof;
  provenance: ProvenanceProof;

  pass: boolean;
  blockers: DiagnosticFinding[];
  warnings: DiagnosticFinding[];
}
```

Proof questions:

```text
Temporal: Can this be true at this moment?
Causal: What caused it?
Intentional: Why would the character do it?
Motivational: Why this tactic instead of another?
Emotional: What appraisal produces this feeling?
Relationship: What rupture, repair, debt, or power shift happens?
Epistemic: Who knows, suspects, misbelieves, or hides?
Reveal: Does this seed, pay, or reframe information?
Theme: What claim is supported, attacked, or complicated?
Mechanism: What story machine is operated?
Reader: What happens to curiosity, suspense, confusion, or memory?
Spatial: Could the character see, hear, reach, or infer it?
Dialogue: Does each line perform state-changing work?
Provenance: Where did this output come from?
```

## 17.1 Validator catalog

| Validator | Hard/soft | Blocks commit? | Purpose |
|---|---:|---:|---|
| Temporal validator | Hard | Yes | Prevents impossible chronology and validity interval errors. |
| Canon validator | Hard | Yes | Prevents contradiction in objective facts unless explained by an event. |
| Epistemic validator | Hard | Yes | Prevents characters from knowing or revealing impossible information. |
| Causal validator | Hard | Yes | Ensures events have sufficient causes/preconditions. |
| Intentionality validator | Hard | Yes | Ensures character actions are goal/motive/pressure explainable. |
| Object continuity validator | Hard | Yes | Tracks possession, location, affordance, damage, and visibility. |
| Spatial validator | Hard | Yes | Checks sightlines, hearing, blocking, camera knowledge, and occlusion. |
| Relationship validator | Mixed | Sometimes | Blocks cheap repairs or betrayals without setup; warns on weak shifts. |
| Reveal validator | Mixed | Sometimes | Enforces clue debt, audience state, and reveal legality. |
| Mechanism validator | Mixed | Sometimes | Checks whether scene operates a story mechanism. |
| Dialogue validator | Mixed | Sometimes | Checks objective, tactic, subtext, knowledge, state delta, and voice. |
| Reader-state validator | Soft | No | Diagnoses confusion, suspense, curiosity, novelty, and cognitive load. |
| Provenance validator | Hard | Yes | Prevents export/training/derivation violations. |

# 18. Reader / Audience State

AudienceState is not optional. The engine must remember what the viewer has seen, inferred, forgotten, misunderstood, or expects.

```ts
interface AudienceState {
  knownFacts: FactID[];
  suspectedFacts: FactID[];
  misdirections: MisdirectionThread[];

  suspense_threads: AudienceThread[];
  irony_threads: AudienceThread[];
  mystery_threads: AudienceThread[];
  curiosity_threads: AudienceThread[];

  current_advantage_over_characters: Record<CharacterID, number>;

  clue_memory: AudienceClueMemory[];
  confusion_risk: number;
  curiosity_decay_risk: number;
}
```

```ts
interface AudienceClueMemory {
  clue_id: ID;
  first_seen_event_id: EventID;
  apparent_meaning: string;
  true_meaning: string | null;
  memorability: number;
  recontextualized_by_event_id: EventID | null;
}
```

This prevents a common failure: the audience saw something, but the engine forgot they saw it.

# 19. Spatial-Cinematic Engine

Scene-space epistemics are mandatory, not decorative.

```ts
interface SceneSpace {
  location_id: LocationID;
  character_positions: CharacterPose[];
  object_positions: ObjectPose[];
  sightlines: Sightline[];
  sound_zones: SoundZone[];
  occlusions: Occlusion[];
  camera_frame: CameraFrame;
  audience_visible_objects: ObjectID[];
  audience_hidden_objects: ObjectID[];
}
```

Spatial proof catches:

```text
Character cannot know X.
Audience can see X.
Villain overheard X.
Protagonist thinks nobody saw X.
Object was visible in frame but never noticed.
Line leaks a secret to someone within hearing range.
```

# 20. Temporal-Causal Memory Architecture

Do not build one vector store and call it memory.

Use routed stores:

```text
Temporal Fact Store
Belief / Epistemic Store
Character Mind Store
Relationship Store
Mechanism Store
Reader State Store
Dialogue Function Store
Provenance Store
ScreenplayMemory Store
```

## 20.1 SEEM x E2RAG synthesis

The strongest memory design is:

```text
Canon Ledger
  -> TemporalFact table
  -> NarrativeEvent table
  -> BeliefFact table
  -> RelationshipState table
  -> MechanismState table

Derived indexes
  -> Entity Subgraph
  -> Event Subgraph
  -> EntityEventEdge bipartite map
  -> Time-sliced entity embeddings
  -> Emotion-indexed episodic memory
  -> Vector/BM25/graph retrieval
```

Canonical EpisodicEventFrame:

```ts
interface EpisodicEventFrame {
  id: EventID;
  storyId: StoryID;

  narrativeTime: {
    fabulaIndex: number;
    syuzhetIndex: number;
    timestamp?: string;
    timeMode: "linear" | "flashback" | "flashforward" | "timeskip";
  };

  participants: Array<{
    entityId: EntityID;
    role:
      | "agent"
      | "patient"
      | "speaker"
      | "listener"
      | "witness"
      | "instrument"
      | "location"
      | "beneficiary"
      | "victim";
  }>;

  stateDeltas: StateDelta[];
  causalParents: EventID[];
  causalChildren: EventID[];

  emotionVector: EmotionVector;
  mechanismIds: MechanismID[];

  provenance: {
    sourceCommitId: CommitID;
    sourceTextSpan?: TextSpan;
    createdBy: "writer" | "extractor_agent" | "simulation";
    confidence: number;
  };
}
```

Graph rule:

```text
The graph is a projection.
The ledger is truth.
```

# 21. LLM Orchestration

LLMs may:

```text
propose candidate transitions
extract typed facts from prose
repair failed candidates
criticize weak scenes
render screenplay
summarize branches
suggest alternatives
rank portfolios
```

LLMs may not:

```text
silently mutate canon
override proof gates
invent hidden facts without StateDelta
repair continuity by rewriting history invisibly
use restricted references as imitation data
self-train from user projects without explicit rights
```

Core law:

```text
The LLM proposes.
The Proof Kernel disposes.
The author commits.
The ledger remembers.
```

# 22. Multi-Agent Writer's Room

Use bounded, typed, gated agents. Do not build a live self-mutating swarm.

Recommended agents:

```text
Director Agent
Writer Agent
Critic Agent
Continuity Agent
Emotion Agent
Retrieval Policy Agent
Rights / Provenance Agent
```

Rules:

```text
Agents may propose, critique, retrieve, score, and repair.
Agents may never commit canon.
Agents communicate through typed messages.
Every agent output is traceable.
Every accepted output becomes a candidate StateDelta.
Every candidate StateDelta must pass proof.
```

# 23. Adaptive Learning and RL

Do not build one giant self-improving production loop.

Use four separated learning loops:

| Loop | Learns | Risk | Promotion gate |
|---|---|---:|---|
| Retrieval policy loop | Which graph paths to retrieve | Medium | Eval + latency + cost |
| Critic loop | Which plot holes to inject/detect | Medium | Frozen adversarial set |
| Emotion rerank loop | Which emotional memories matter | Low/medium | Dialogue quality + no knowledge leaks |
| Generation loop | Better scene rendering | High | Human review + rights audit |

Correct production loop:

```text
Generate scene
-> validate
-> writer edits / accepts / rejects
-> store traces
-> offline training candidate
-> frozen eval suite
-> compare to current policy
-> human review
-> canary rollout
-> promote or rollback
```

Never let an adversarial loop corrupt canonical scenes. Use shadow corrupted branches:

```text
Canon candidate scene
-> copy to shadow branch
-> inject synthetic flaw
-> Continuity Agent detects flaw
-> score detection
-> discard corrupted branch
```

# 24. ScriptIDE Product Surface

## 24.1 Main panels

```text
Script Editor
Proof Sidecar
Canon Inspector
Belief Inspector
Relationship Inspector
Mechanism Inspector
Branch Explorer
Scene Runtime Console
Dialogue Function Panel
Audience State Panel
Regression Warnings
Provenance / Rights Panel
```

## 24.2 Core workflows

### Click a line

Shows:

```text
speaker objective
hidden intent
tactic
subtext
knowledge legality
state delta
relationship effect
mechanism operated
voice features
alternative action beats
```

### Edit a scene

System creates:

```text
Changeset
-> affected facts
-> affected beliefs
-> affected payoffs
-> affected branch nodes
-> proof results
-> repair candidates
```

### Remove a clue

System answers:

```text
Which reveal breaks?
Which audience inference disappears?
Which later line becomes unsupported?
Which branch becomes impossible?
```

### Rewrite dialogue

System checks:

```text
Does the new line leak forbidden knowledge?
Does it still change state?
Does it preserve subtext?
Does it preserve voice?
Does it satisfy the same mechanism role?
```

# 25. Screenplay Compiler

The screenplay compiler is a renderer and reviser of validated story state.

Pipeline:

```text
Committed Branch Path
-> ScreenplayMemory
-> ScreenplayIR
-> Fountain Draft
-> Continuity-preserving rewrite pass
-> Dialogue polish pass
-> Action line compression pass
-> Scene rhythm pass
-> Annotated export
-> Clean export
```

## 25.1 ScreenplayMemory

```ts
interface ScreenplayMemoryState {
  projection_version: number;
  source_story_version: number;

  scene_memories: Record<ID, ScreenplaySceneMemory>;
  beat_memories: Record<ID, ScreenplayBeatMemory>;
  draft_order_scene_ids: ID[];
}
```

Rules:

```text
ScreenplayMemory can be regenerated.
ScreenplayMemory can be revised.
ScreenplayMemory must not define canon.
Final-mode rewrite cannot mutate CanonState directly.
```

# 26. Evaluation and Regression Harness

Regression fixtures:

```text
belief leak
impossible object access
cheap relationship repair
dead reveal
branch merge contradiction
scene with no state change
dialogue with no subtext gap
payoff broken by upstream edit
audience confusion overload
screenplay compile without scene memory
provenance violation
```

Minimum metrics:

```text
proof pass rate
false positive continuity warnings
false negative continuity failures
belief legality failures
dialogue state-change rate
subtext gap rate
branch merge conflict rate
screenplay compile coverage
average repair success
writer accept/reject ratio
latency per generation
retrieval evidence recall
provenance compliance
```

# 27. Production Architecture

Start with:

```text
PostgreSQL
JSONB snapshots
append-only story_events
branch_edges table
pgvector for embeddings
BM25 text index
Redis queue/cache/streams
S3-compatible artifact storage
OpenTelemetry-style traces
background workers
```

Do not start with:

```text
graph database as source of truth
fully autonomous self-mutating swarm
RL-controlled production canon
single vector store memory
one-shot screenplay generation
```

## 27.1 Projection checkpoints

```ts
interface ProjectionCheckpoint {
  projection_name:
    | "story_state"
    | "scene_state"
    | "branch_graph"
    | "screenplay_memory"
    | "diagnostics"
    | "search_index";

  story_id: ID;
  last_processed_event_id: EventID;
  last_processed_story_version: number;

  status: "healthy" | "rebuilding" | "stale" | "failed";
  updated_at: TimestampISO;
}
```

Without checkpoints, events, snapshots, branch graph, diagnostics, search indexes, and screenplay memory will drift invisibly.

## 27.2 Minimum persistence tables

```text
stories
story_snapshots
story_events
story_event_streams
projection_checkpoints

branches
branch_edges
branch_merge_plans

scenes
scene_checkpoints
scene_beats

characters
character_minds
relationships
relationship_events

atomic_facts
belief_atoms
nested_beliefs
audience_threads
deception_threads

objects
locations
world_rules
pressure_sources

mechanisms
mechanism_beats

reveals
clues
misdirections

theme_claims
theme_edges

setup_payoff_items

screenplay_projection_events
screenplay_scene_memories
screenplay_ir
rendered_scenes

diagnostics
proof_results
provenance_records
rights_boundaries
telemetry_traces
```

# 28. Rights, Safety, and Provenance

Provenance is not a later safety feature. It is part of the core data model.

```ts
interface RightsBoundary {
  object_id: ID;
  object_type: "line" | "scene" | "character" | "world" | "motif" | "reference";

  origin:
    | "user_authored"
    | "model_generated"
    | "licensed_source"
    | "public_domain"
    | "derived_annotation"
    | "project_canon";

  rights_status:
    | "owned"
    | "licensed"
    | "public_domain"
    | "unknown"
    | "restricted";

  allowed_uses: ("display" | "rewrite" | "train" | "export" | "share")[];
}
```

Rules:

```text
No export without provenance checks.
No training on restricted user material.
No raw script imitation unless rights are secured.
Use protected references for functional annotation only.
Keep synthetic equivalents separate from source references.
```

# 29. Roadmap and Acceptance Gates

## Phase 0 - Research governance and golden fixtures

Deliver:

```text
source register
rights policy
schema repository
golden continuity fixtures
proof trace format
initial validator taxonomy
```

Success:

```text
Every research claim maps to a schema, validator, UI panel, or test fixture.
```

## Phase 1 - Proof-only Script Intelligence MVP

Deliver:

```text
import outline / script segment
extract entities/events/facts/beliefs/relationships
Canon Ledger MVP
TemporalFact MVP
BeliefGraph MVP
ProofTrace MVP
diagnostics report
continuity report
```

Success:

```text
The system can answer what breaks if a beat, clue, object, or line changes.
```

## Phase 2 - Runtime kernel

Deliver:

```text
event log
StoryState projection
SceneState checkpoint
BranchNode DAG
StateDelta / StoryOps
basic Proof Kernel
JSON Patch support
projection checkpoints
```

Success:

```text
A user action becomes a validated event, mutates StoryState, updates SceneState, and can be replayed.
```

## Phase 3 - Live Runtime MVP

Deliver:

```text
CharacterMind MVP
RelationshipState MVP
AudienceState MVP
scene runtime loop
causal validator
intention validator
knowledge legality validator
basic branch generation
screenplay memory logger
```

Success:

```text
A writer can enter a scene, make choices, generate dialogue/action, and every accepted beat creates a valid state delta.
```

## Phase 4 - Dialogue / Action Compiler

Deliver:

```text
DialogueExchange model
DialogueTurn model
speech-action tactics
subtext validator
knowledge leak validator
state-change validator
action-as-dialogue alternatives
voice memory retrieval
```

Success:

```text
No generated line enters the script unless it changes belief, emotion, relationship, power, object state, clue state, audience state, or mechanism pressure.
```

## Phase 5 - Branch DAG and merge semantics

Deliver:

```text
BranchNode DAG
branch_edges
BranchMergePlan
common ancestor detection
merge conflict reports
branch pruning
alternate cut support
```

Success:

```text
Multiple dramatic futures can split, converge, conflict, and merge without corrupting canon.
```

## Phase 6 - Screenplay compiler

Deliver:

```text
ScreenplayMemory
ScreenplayIR
clean Fountain render
annotated Fountain render
debug render
scene compression pass
dialogue polish pass
continuity-preserving rewrite pass
```

Success:

```text
The realized live path compiles into screenplay pages without changing canon.
```

## Phase 7 - Regression and evaluation harness

Deliver:

```text
continuity fixture suite
belief leak tests
object continuity tests
relationship repair tests
payoff break tests
ConStory-Bench-style taxonomy mapping
FlawedFictions-style synthetic plot-hole injection
proof false-positive/false-negative tracking
```

Success:

```text
Every release can be regression-tested against narrative failure fixtures.
```

## Phase 8 - Bounded adaptive lab

Deliver:

```text
retrieval trace logging
offline retrieval policy training
critic shadow branches
frozen eval sets
canary deployment
human approval workflow
model/policy rollback
```

Success:

```text
The system improves from traces without allowing live self-mutating production behavior.
```

# 30. MVP Demo

Do not demo a feature-length screenplay first.

Demo this:

```text
1. User starts blank or with one fragment.
2. System generates five premise/cast/world seed portfolios.
3. User selects one.
4. System creates initial state, cast, world pressure, and first scene.
5. User enters as protagonist.
6. User speaks or acts.
7. State changes visibly.
8. Belief, relationship, and audience state update.
9. Branch field mutates.
10. Director chooses next pressure.
11. AI dramatizes accepted beat.
12. Scene ends with a real turn.
13. System compiles lived path into 3-5 screenplay pages.
14. Dialogue/subtext pass rewrites the pages.
15. User inspects proof sidecar.
```

This proves the full product loop without overbuilding.

# 31. Hard Commit Rules

```text
No prose commit without valid StateDelta.
No event append unless expected_story_version matches current version.
No branch creation without trigger_event_id, except root branch.
No branch merge without common ancestor analysis.
No character action commit if active intentions cannot justify it.
No dialogue_line commit unless it changes belief, relationship, power, emotion, audience knowledge, object state, conflict, or mechanism pressure.
No reveal commit unless BeliefState or AudienceState changes.
No lie commit unless it creates or updates a DeceptionThread.
No scene close unless at least one ExitCondition is satisfied.
No screenplay compile unless every committed-path scene has ScreenplaySceneMemory.
No final-mode rewrite may alter CanonState directly.
No export without provenance checks.
```

# 32. Open Questions

These remain unresolved and should become decision records, prototypes, or benchmark tasks.

1. How much author control should exist over proof severity? Some writers want hard enforcement; others want warnings and manual override.
2. What is the smallest useful set of belief attitudes for v1: knows/suspects/misbelieves/unknown, or a richer taxonomy from the start?
3. Should the first proof-only MVP ingest Fountain directly, or start with structured outline/beat-sheet imports?
4. Should mechanism templates be built as author-facing primitives or hidden runtime structures?
5. How should the system display proof results without overwhelming writers?
6. What is the minimal screenplay IR that supports Fountain, FDX, and annotated debug exports?
7. Which claims require internal replication before being productized? PLOTTER, Shadow-Loom, Graph-R1/RFT, and newer adaptive memory methods should remain design references until replicated.
8. How should the system model genre obligations without becoming formulaic?
9. What privacy and training guarantees are required before onboarding real writers?
10. How should collaborative CRDT editing reconcile with typed story-state patches?

# 33. Glossary

| Term | Meaning |
|---|---|
| Canon Ledger | Append-only source of truth for objective facts, events, beliefs, state deltas, commits, branches, and retcons. |
| StoryState | Current projected read model used by the runtime. |
| SceneState | Active dramatic execution container for the current scene. |
| Branch DAG | Directed acyclic graph of possible, committed, pruned, and merged futures. |
| TemporalFact | A fact with validFrom/validTo and epistemic scope. |
| BeliefGraph | Graph of what characters, audience, and author believe, suspect, misbelieve, or hide. |
| EpisodicEventFrame | Structured memory object representing narrative progression, participants, deltas, causality, emotion, mechanism, and provenance. |
| Entity/Event dual graph | Derived graph with stable entities and dynamic events linked by time-stamped bipartite edges. |
| StoryOps | Executable narrative bytecode: add fact, expire fact, update belief, shift relationship, seed clue, etc. |
| Mechanism | Active story machine that turns theme into object, ritual, institution, body, relationship, rule, clue system, or psychological pressure. |
| ProofTrace | Evidence-backed validator result explaining pass/warn/fail and repair suggestions. |
| DialogueTurn | Speech/action unit with surface line, hidden intent, tactic, target, mechanism, state delta, and proof. |
| ScreenplayMemory | Rewriteable projection of committed story state into screenplay compilation memory. |
| ScriptIDE | Writer-facing editor and proof debugger. |
| Benchmark Factory | System that converts proof outcomes, plot-hole injections, appeals, edits, and retrieval traces into regression/eval data. |

# 34. Final Build Law

```text
StoryMachine is not:
LLM + better prompts + memory.

StoryMachine is:
typed narrative state
+ event-sourced canon
+ temporal-causal graph
+ epistemic asymmetry
+ character intentionality
+ relationship pressure
+ mechanism compiler
+ proof kernel
+ dialogue as state-changing action
+ branch DAG
+ screenplay projection
+ regression harness
+ ScriptIDE proof surface.
```

The final version is a narrative debugger, runtime, and compiler. The LLM gives it language. The system gives it memory, law, causality, and consequence.


# 35. 32-Domain Research Checklist

This section preserves the broad research checklist from the compendium and turns it into implementation decisions. It is intentionally compact: each domain becomes an architecture obligation rather than a literature essay.

| # | Domain | What we keep | Implementation object |
|---:|---|---|---|
| 1 | Core narrative theory | Separate fabula, syuzhet, discourse; track suspense, curiosity, surprise, irony, reversal, recognition, setup, payoff, focalization. | NarrativeState, AudienceState, ScreenplayIR. |
| 2 | Story logic primitives | Define act, sequence, scene, beat, event, clue, reveal, promise, payoff, conflict, reversal, recognition, and state change. | Shared schema package and glossary. |
| 3 | Narrative planning | Use POCL/IPOCL/HTN-style planning for causality and character intentionality. | Causal Planner, Mechanism Planner, StoryOps. |
| 4 | Causal story graphs | Represent event causes, effects, affordances, dependencies, and counterfactual branch impact. | Causal StoryGraph and CounterfactualBranch. |
| 5 | World-state engine | Store canon as event-sourced state with temporal facts and projections. | Canon Ledger, StoryState Projection. |
| 6 | Long-form consistency | Detect factual, temporal, trait, world-rule, and payoff drift. | Regression Harness and ProofTrace. |
| 7 | Character cognition | Use layered character minds: existential, strategic, tactical. | CharacterMind and CharacterState. |
| 8 | Theory of Mind | Track who knows, suspects, misbelieves, hides, and believes about other minds. | BeliefGraph and NestedBelief. |
| 9 | Epistemic engine | Maintain objective truth, character belief, audience belief, author intent, rumor, lie, memory, prediction. | AtomicFact.layer and EpistemicQuery. |
| 10 | Memory substrate | Use routed hierarchical memory, not one vector store. | SEEM Event Frames, E2RAG dual graph, retrieval router. |
| 11 | Emotional intelligence | Model appraisal, emotional memory, emotional pressure, and audience emotion. | EmotionState, EmotionAppraisal, Emotional Retrieval. |
| 12 | Relationship engine | Model trust, intimacy, resentment, admiration, fear, dependency, obligation, power, rupture, repair. | RelationshipState and RelationshipDebt. |
| 13 | Drama manager | Select pressure based on phase, debt, clocks, reveal state, reader load, escalation/cooldown. | DramaManager and CandidatePortfolio. |
| 14 | Reveal engine | Track clue ecology, misdirection, fair play, reveal timing, audience knowledge. | RevealState, Clue, MisdirectionThread. |
| 15 | Scene engine | Ensure each scene has participants, objectives, pressure, conflict, mechanism, exit condition, and state change. | SceneState and SceneProof. |
| 16 | Dialogue/subtext engine | Compile line/action as state-changing speech acts under mechanism pressure. | DialogueExchange and DialogueTurn. |
| 17 | Theme engine | Convert theme into argument, counterargument, motif, object, relationship, ritual, or world-rule pressure. | ThemeClaim, ThemeEdge, Mechanism. |
| 18 | Genre intelligence | Track genre contract, obligations, expected turns, permitted deviations, and formula risk. | GenreContract and GenreValidator. |
| 19 | Multi-agent simulation | Use bounded agents for critique, continuity, emotion, retrieval, and rendering; no autonomous canon commit. | Typed agent messages and agent audit log. |
| 20 | Deliberative reasoning | Use multi-step reasoning only inside typed, inspected, replayable flows. | Candidate explanations and proof traces. |
| 21 | Narrative compiler | Compile validated state into beat sheets, outlines, scene plans, ScreenplayIR, Fountain, FDX. | Screenplay Compiler. |
| 22 | ScriptIDE intelligence | Make every line inspectable for purpose, state delta, proof, and breakage. | Proof Sidecar, Inspectors, Branch Explorer. |
| 23 | Co-creative UI/UX | Provide portfolios, sliders, proof warnings, commit/branch decisions, and structured diff. | ScriptIDE workflow layer. |
| 24 | Evaluation engine | Measure proof pass rate, false positives, false negatives, belief leaks, payoff breaks, dialogue state-change rate. | Benchmark Factory. |
| 25 | Data and datasets | Use licensed/public/synthetic data; avoid protected-expression imitation. | RightsBoundary and dataset registry. |
| 26 | Knowledge representation | Store facts, events, beliefs, objects, places, relationships, mechanisms, and audience state as queryable structures. | PostgreSQL/JSONB + graph projections. |
| 27 | Neuro-symbolic architecture | Let symbolic/typed systems own canon and proof; let LLMs propose/render/repair. | LLM Orchestrator + Proof Kernel. |
| 28 | LLM orchestration | Use model calls behind typed contracts, retry limits, caching, provenance, and validation. | LLM Call Trace and Prompt Contract. |
| 29 | Multimodal story intelligence | Add visual/storyboard/blocking later; start with spatial-cinematic proof of visibility/hearing. | SceneSpace and CameraFrame. |
| 30 | Production architecture | Build event log, projections, workers, telemetry, and exports before RL/adaptive systems. | Runtime services and observability. |
| 31 | Safety, rights, ethics | Treat privacy, IP, plagiarism, likeness, content safety, and prompt injection as architecture. | Governance and Provenance layer. |
| 32 | Specific papers/projects | Keep source register and adoption status current. | Research governance file and decision log. |

# 36. Top 10 Priority Research Clusters

| Priority | Cluster | Why it matters first |
|---:|---|---|
| 1 | Narrative planning | Without causal and intentional planning, the product is just prose generation. |
| 2 | Causal story graphs | Needed to answer what breaks downstream. |
| 3 | Time-aware world-state tracking | Needed for canon, contradiction detection, and retcons. |
| 4 | Character cognition / BDI | Needed for believable action and dialogue. |
| 5 | Theory of Mind / epistemics | Needed for secrets, lies, dramatic irony, and knowledge legality. |
| 6 | Long-term memory | Needed for long-form coherence and retrieval. |
| 7 | Dialogue as action | Needed for screenplay quality and scene work. |
| 8 | Evaluation and adversarial testing | Needed to avoid overclaiming and regressions. |
| 9 | ScriptIDE proof interface | Needed to make the hidden architecture usable by writers. |
| 10 | Rights/provenance/security | Needed for professional adoption and safe training/export. |

# 37. Practical Build Orders

## 37.1 Do first

- Source register and adoption status.
- Golden test fixtures.
- Canon Ledger schema.
- AtomicFact and Belief schemas.
- StateDelta, StoryOps, and ProofTrace.
- Importer for outline or script segment.
- Proof-only diagnostics.
- ScriptIDE proof sidecar.

## 37.2 Do next

- Branch DAG with merge semantics.
- SceneState runtime loop.
- CharacterMind and RelationshipState MVP.
- DialogueExchange and DialogueTurn compiler.
- ScreenplayMemory projection.
- Regression harness and benchmark factory.

## 37.3 Defer

- Full feature screenplay generation.
- Live self-improving agents.
- RL retrieval policies.
- Full multimodal storyboard reasoning.
- Collaborative CRDT writers' room.
- Graph database as source of truth.

# 38. Audit Notes and Guardrails

1. Do not claim formal proof of story quality. Claim proof of encoded constraints plus diagnostics for subjective quality.
2. Do not treat any single paper as the StoryMachine solution. Each paper supplies one ingredient.
3. Do not hide LLM uncertainty. Store extraction confidence and evidence spans.
4. Do not allow model repair to rewrite canon silently. Repairs become candidate patches.
5. Do not train on protected user or reference material without explicit rights.
6. Do not collapse audience belief into world truth. AudienceState is its own object.
7. Do not collapse character belief into objective fact. Belief is scoped to holder, confidence, source, and time.
8. Do not represent branch history as a tree if convergence and merge are required. Use DAG semantics from the start.
9. Do not treat GraphRAG/RL as truth. Retrieval supplies evidence; proof gates decide legality.
10. Do not ship generation before proof-only diagnostics work.


# Appendix A - Compact Reference Matrix

| Module | Primary inputs | Primary outputs | Hard gate |
|---|---|---|---|
| Canon Ledger | StoryOps, StateDelta | Event history, replayable state | Version/idempotency/provenance |
| Temporal Fact Store | Events, facts | Validity intervals | Contradiction test |
| Belief Engine | Facts, evidence, dialogue | Belief deltas | Knowledge legality |
| Character Mind | Goals, wounds, beliefs | Candidate actions | Intentionality proof |
| Relationship Engine | Actions, dialogue, history | Trust/power/obligation deltas | Repair/betrayal cost |
| Mechanism Compiler | Theme, wound, object/rule | Mechanism debts and beats | Mechanism operation |
| Drama Manager | Debts, phase, audience state | Next pressure portfolio | Candidate legality |
| Dialogue Compiler | SceneState, CharacterMind | DialogueTurn list | State-change proof |
| Screenplay Compiler | ScreenplayMemory | Fountain/FDX/export | Canon preservation |
| Regression Harness | Commit diff | Proof report | Failure fixtures |

# Appendix B - First Implementation Checklist

```text
Repository setup
- schema package
- validator package
- proof trace JSON schema
- fixture package
- source register

Canon MVP
- stories table
- story_events table
- story_snapshots table
- projection_checkpoints table
- StateDelta + JsonPatch support

Proof-only MVP
- import outline/script segment
- extract entities/events/facts
- create AtomicFact records
- create Belief records
- run temporal/canon/knowledge validators
- produce proof report

ScriptIDE MVP
- script editor shell
- proof sidecar
- canon inspector
- belief inspector
- change impact report

Evaluation MVP
- golden story fixtures
- belief leak fixture
- object continuity fixture
- broken payoff fixture
- cheap repair fixture
- plot-hole injection fixture
```

# Appendix C - Recommended Next Step

Implement Phase 0 and Phase 1 before anything else:

```text
1. Source register and research governance.
2. Golden fixtures.
3. Canon Ledger schema.
4. TemporalFact schema.
5. BeliefGraph schema.
6. ProofTrace schema.
7. Proof-only diagnostics importer.
8. ScriptIDE proof sidecar prototype.
```

The first proof-only prototype should prove the central promise:

```text
The system can tell a writer exactly what breaks if they change a beat, clue, line, object, or reveal.
```

