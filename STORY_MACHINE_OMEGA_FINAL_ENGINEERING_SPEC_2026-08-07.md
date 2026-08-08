# STORY MACHINE Ω — FINAL ENGINEERING SPECIFICATION
## Maximum-Defensible Implementation Architecture for a Stateful Narrative Operating System and Screenwriting Engine

**Date:** 2026-08-07  
**Status:** Implementation specification / ceiling candidate, subject to empirical replacement.  
**Primary target:** AI-assisted long-form screenwriting with analysis, planning, state tracking, revision, and optional autonomous generation.  
**Secondary targets:** screenplay analysis, story validation, training-data generation, serialized narrative, interactive narrative.  
**Supersedes:** earlier practical implementation guides that hard-coded a 79-primitive ontology, used string preconditions/effects, or treated whole-screenplay drafting as the central generation unit.

---

# 0 — EXECUTIVE DECISION

The correct first implementation of Story Machine is **not**:

1. define all 79 primitives;
2. ask an LLM for a full outline;
3. ask the LLM for a full screenplay;
4. run a few graph checks;
5. revise the whole screenplay.

That produces a screenplay generator with graph-shaped metadata.

The correct implementation is:

```text
EVALUATION CORPUS
        ↓
SEMANTIC RUNTIME
        ↓
EXECUTABLE STATE TRANSITIONS
        ↓
EVENT LEDGER + SNAPSHOTS
        ↓
TEMPORAL / CAUSAL / EPISTEMIC / INTENTIONAL PROJECTIONS
        ↓
SCRIPT PARSER + PROVENANCE
        ↓
NARRATIVE MEMORY
        ↓
BRANCH PLANNER
        ↓
SCENE CONTRACT
        ↓
SCENE-LEVEL DRAMATIC REALIZATION
        ↓
SCREENPLAY RENDERER
        ↓
CLAIM RE-EXTRACTION
        ↓
SEMANTIC DIFF
        ↓
LOCAL REPAIR
        ↓
TRANSACTIONAL COMMIT
```

The ontology is a **versioned semantic vocabulary inside the runtime**, not the runtime itself.

The 4,157 legacy event names are a **coverage benchmark and authoring vocabulary**, not evidence that 79 primitives are correct.

---

# 1 — PRODUCT STRATEGY

## 1.1 Build the proving instrument before the autonomous writer

The highest-information path is:

### Product 0 — Narrative Runtime Test Harness

Internal only.

Purpose:

- prove state transitions;
- prove knowledge tracking;
- prove temporal logic;
- prove branch isolation;
- prove replay;
- prove author locks;
- build regression cases.

### Product 1 — Story Analysis / Validation Engine

Input:

- Fountain;
- FDX;
- plain-text screenplay;
- structured outline.

Output:

- extracted narrative model;
- evidence-backed continuity findings;
- character-knowledge timeline;
- setup/payoff map;
- causal gaps;
- unresolved ambiguities;
- revision impact analysis.

This tests whether Story Machine can **understand** narrative before asking it to generate narrative.

### Product 2 — Screenwriting Assistant

Human remains primary author.

Capabilities:

- scene planning;
- continuity queries;
- “what breaks if?”;
- character-view queries;
- local alternatives;
- targeted revision;
- thread/obligation tracking.

### Product 3 — Scene Generator

Generates one scene at a time from accepted state + scene contract.

### Product 4 — Long-Form Screenplay Generator

Only after Products 0–3 prove long-horizon state, planning, semantic round-trip, evaluation, and repair.

---

# 2 — TWO SOURCE-OF-TRUTH MODES

This distinction is mandatory.

## 2.1 AUTHORING MODE

Story Machine is creating or co-authoring the story.

Authoritative truth:

```text
ACCEPTED EVENT LEDGER
+
CURRENT CANON SNAPSHOT
+
AUTHOR INTENT LEDGER
```

Screenplay text is downstream realization.

If rendered prose invents a material fact, that fact is **not automatically canon**.

## 2.2 ANALYSIS MODE

Story Machine is analyzing an existing screenplay.

Authoritative evidence:

```text
SOURCE SCREENPLAY TEXT
```

The semantic graph is a derived interpretation.

Every extracted claim stores:

- source scene;
- source span;
- extractor version;
- confidence;
- ambiguity status.

The engine must not convert ambiguous text into false certainty.

## 2.3 IMPORT / RECONCILIATION MODE

A user imports screenplay text into an existing project.

```text
SOURCE TEXT
→ CLAIM EXTRACTION
→ DIFF AGAINST CANON
→ USER / POLICY RESOLUTION
```

Possible outcomes:

- text matches canon;
- harmless surface detail;
- proposed new canon;
- contradiction;
- version mismatch.

---

# 3 — NON-NEGOTIABLE PRINCIPLES

1. **Canonical state is external to the LLM context.**
2. **Proposals cannot mutate canon.**
3. **Committed changes are append-only events.**
4. **Snapshots are projections of the event ledger.**
5. **Preconditions/effects are executable structures, not strings.**
6. **World truth and character belief are separate.**
7. **Diegetic scope and audience presentation are separate.**
8. **Causality, chronology, epistemics, intentionality, and thematic relations are separate projections.**
9. **Hard invariants and craft preferences are separate.**
10. **Scene generation is incremental.**
11. **Every rendered scene is semantically round-tripped before commit.**
12. **Repairs are localized and regression-tested.**
13. **Ontology size is empirical.**
14. **LLM/reward scores are evidence, not artistic truth.**
15. **Human author intent outranks generic heuristics.**
16. **Long-running execution pins its semantic environment.**
17. **Important automated judgments record evidence/provenance.**
18. **Every expensive subsystem must survive ablation.**

---

# 4 — TECH STACK

## 4.1 Python

Use Python for semantic runtime, extraction, validation, planning, evaluation, model adapters, and APIs.

Recommended baseline:

```text
Python 3.12+
```

subject to dependency compatibility.

## 4.2 Pydantic v2

Use at process/API boundaries.

Use `Field(default_factory=...)` for generated IDs and mutable defaults.

## 4.3 PostgreSQL

Use PostgreSQL for serious MVP and production:

- transactions;
- append-only event tables;
- JSONB semantic payloads;
- relational integrity;
- recursive queries where useful;
- mature operational tooling.

A disposable spike may use SQLite.

Do **not** adopt Neo4j merely because the domain has graphs. Benchmark it later if graph traversal becomes a demonstrated bottleneck.

## 4.4 NetworkX `MultiDiGraph`

Use as in-memory/offline analytical projection.

The same two events can have several relations:

```text
A ENABLES B
A MOTIVATES B
A FORESHADOWS B
A SETS_UP B
```

An ordinary `DiGraph` cannot safely represent those as parallel directed edges.

NetworkX is not canonical persistence.

## 4.5 Workflow orchestration

Two supported approaches:

### A — Custom domain orchestrator

Preferred when exact event-sourced semantics, replay, and low framework coupling dominate.

### B — LangGraph adapter

Useful if durable node checkpoints, human interrupts, workflow replay, and recovery justify the dependency.

Story Machine semantics remain in domain code. LangGraph thread/checkpoint state never becomes canonical narrative truth.

## 4.6 Fountain

Use Fountain as a diff-friendly, human-readable screenplay surface format. Support FDX for interoperability/export.

## 4.7 FastAPI

Use for typed API, streaming, async model calls, project endpoints, and diagnostics.

## 4.8 UI sequence

```text
test harness
→ CLI
→ API
→ thin internal UI
→ writer-facing editor
```

---

# 5 — EXECUTION MANIFEST / SEMANTIC SNAPSHOT

Every durable run binds the semantic environment it started with.

```python
from datetime import datetime, timezone
from uuid import UUID, uuid4
from pydantic import BaseModel, Field


class ExecutionManifest(BaseModel):
    run_id: UUID = Field(default_factory=uuid4)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    code_revision: str
    schema_version: str
    ontology_version: str
    planner_policy_version: str
    validator_bundle_version: str
    prompt_bundle_version: str

    model_provider: str
    model_id: str
    model_revision: str | None = None

    retrieval_index_snapshot: str | None = None
    embedding_model_revision: str | None = None

    tool_registry_version: str
    project_policy_version: str
```

A paused run must not silently resume under incompatible:

- model aliases;
- prompts;
- ontology versions;
- retrieval corpora;
- validators;
- tool contracts.

A changed semantic environment is an explicit migration/replay/new branch.

---

# 6 — REPOSITORY STRUCTURE

```text
story_machine/
│
├── domain/
│   ├── ids.py
│   ├── entities.py
│   ├── propositions.py
│   ├── fluents.py
│   ├── predicates.py
│   ├── effects.py
│   ├── transitions.py
│   ├── relations.py
│   ├── obligations.py
│   ├── author_intent.py
│   └── project_policy.py
│
├── ontology/
│   ├── kernel.py
│   ├── aliases.py
│   ├── operators.py
│   ├── domains.py
│   ├── registry.py
│   └── migrations/
│
├── runtime/
│   ├── state.py
│   ├── interpreter.py
│   ├── transaction.py
│   ├── commit.py
│   ├── replay.py
│   ├── snapshots.py
│   └── impact.py
│
├── store/
│   ├── event_store.py
│   ├── postgres.py
│   ├── repositories.py
│   └── migrations/
│
├── projections/
│   ├── temporal.py
│   ├── causal.py
│   ├── epistemic.py
│   ├── intentional.py
│   ├── relationship.py
│   ├── discourse.py
│   ├── thematic.py
│   └── networkx_projection.py
│
├── epistemics/
│   ├── state.py
│   ├── acquisition.py
│   ├── belief_revision.py
│   ├── source_trust.py
│   └── nested.py
│
├── memory/
│   ├── query.py
│   ├── graph_retrieval.py
│   ├── hybrid_retrieval.py
│   ├── access_control.py
│   └── evidence.py
│
├── parser/
│   ├── fountain.py
│   ├── fdx.py
│   ├── scene_segmentation.py
│   ├── entity_extraction.py
│   ├── event_extraction.py
│   ├── coreference.py
│   ├── claim_extraction.py
│   └── provenance.py
│
├── validation/
│   ├── hard/
│   ├── contract/
│   ├── learned/
│   └── report.py
│
├── planning/
│   ├── goals.py
│   ├── proposals.py
│   ├── branches.py
│   ├── simulator.py
│   ├── search.py
│   ├── beam.py
│   ├── mcts.py
│   ├── hierarchical.py
│   ├── constraint_solver.py
│   ├── epistemic_planner.py
│   └── selector.py
│
├── scenes/
│   ├── contract.py
│   ├── beats.py
│   ├── av_ir.py
│   ├── compiler.py
│   └── scene_state.py
│
├── generation/
│   ├── adapters.py
│   ├── character_proposer.py
│   ├── dramatic_realizer.py
│   ├── dialogue.py
│   ├── renderer.py
│   ├── claim_roundtrip.py
│   └── local_repair.py
│
├── evaluation/
│   ├── benchmark.py
│   ├── migration_eval.py
│   ├── horizon_eval.py
│   ├── pairwise.py
│   ├── judge_audit.py
│   ├── regression.py
│   ├── metamorphic.py
│   └── reports.py
│
├── provenance/
│   ├── execution_manifest.py
│   ├── model_calls.py
│   ├── rights.py
│   └── similarity.py
│
├── orchestration/
│   ├── workflow.py
│   ├── custom_runtime.py
│   └── langgraph_adapter.py
│
├── api/
├── cli/
├── tests/
└── pyproject.toml
```

---

# 7 — IDENTIFIERS AND IMMUTABILITY

```python
from typing import NewType
from uuid import UUID
from pydantic import BaseModel, ConfigDict


EntityId = NewType("EntityId", UUID)
EventId = NewType("EventId", UUID)
PropositionId = NewType("PropositionId", UUID)
BranchId = NewType("BranchId", UUID)
SceneId = NewType("SceneId", UUID)


class FrozenModel(BaseModel):
    model_config = ConfigDict(frozen=True)
```

Committed ledger records are immutable.

Working proposals/simulations may be mutable copies.

---

# 8 — ENTITIES AND CAPABILITIES

```python
from enum import StrEnum
from uuid import UUID, uuid4
from pydantic import Field


class EntityKind(StrEnum):
    CHARACTER = "character"
    GROUP = "group"
    OBJECT = "object"
    LOCATION = "location"
    INSTITUTION = "institution"
    FORCE = "force"
    RELATIONSHIP = "relationship"
    INFORMATION = "information"
    STATE_OF_AFFAIRS = "state_of_affairs"


class Capability(StrEnum):
    AGENCY = "agency"
    INTERIORITY = "interiority"
    LOCOMOTION = "locomotion"
    VISION = "vision"
    HEARING = "hearing"
    SPEECH = "speech"
    POSSESSION = "possession"
    MEMORY = "memory"
    VULNERABILITY = "vulnerability"


class Entity(FrozenModel):
    id: UUID = Field(default_factory=uuid4)
    kind: EntityKind
    canonical_name: str
    aliases: tuple[str, ...] = ()
    capabilities: frozenset[Capability] = frozenset()
```

Capability-based typing lets a sentient object act, a ghost perceive without ordinary physical affordances, and a collective have decision behavior.

---

# 9 — PROPOSITIONS

World truth is separate from belief.

```python
class TruthStatus(StrEnum):
    TRUE = "true"
    FALSE = "false"
    UNKNOWN = "unknown"
    INDETERMINATE = "indeterminate"


class Proposition(FrozenModel):
    id: UUID = Field(default_factory=uuid4)
    predicate: str
    arguments: tuple[str, ...]
    temporal_scope: str | None = None
    truth_status: TruthStatus = TruthStatus.UNKNOWN
```

Example:

```text
P7 = IS_KILLER(ALICE)
CANON(P7) = TRUE
BOB belief(P7) = 0.20
CAROL belief(P7) = 0.85
AUDIENCE target suspicion(P7) = MEDIUM
```

---

# 10 — FLUENTS

```python
from typing import Any


class FluentKey(FrozenModel):
    name: str
    args: tuple[str, ...]


class FluentValue(FrozenModel):
    value: Any
```

Examples:

```text
AT(alice) = kitchen
POSSESSES(alice, key) = true
ALIVE(bob) = true
TRUST(alice, bob) = 0.42
LOCKED(vault) = true
```

---

# 11 — EXECUTABLE CONDITION AST

Never use free-text semantic conditions such as:

```text
"AGENT exists at ORIGIN"
```

Use executable structures.

```python
from typing import Annotated, Literal, Union
from pydantic import BaseModel, Field


class FluentEquals(BaseModel):
    kind: Literal["fluent_equals"]
    fluent: FluentKey
    value: object


class HasCapability(BaseModel):
    kind: Literal["has_capability"]
    entity_id: str
    capability: Capability


class PropositionIs(BaseModel):
    kind: Literal["proposition_is"]
    proposition_id: str
    truth: TruthStatus


class AllOf(BaseModel):
    kind: Literal["all"]
    items: list["Condition"]


class AnyOf(BaseModel):
    kind: Literal["any"]
    items: list["Condition"]


class NotCondition(BaseModel):
    kind: Literal["not"]
    item: "Condition"


Condition = Annotated[
    Union[
        FluentEquals,
        HasCapability,
        PropositionIs,
        AllOf,
        AnyOf,
        NotCondition,
    ],
    Field(discriminator="kind"),
]
```

---

# 12 — EXECUTABLE EFFECT AST

```python
class SetFluent(BaseModel):
    kind: Literal["set_fluent"]
    fluent: FluentKey
    value: object


class RemoveFluent(BaseModel):
    kind: Literal["remove_fluent"]
    fluent: FluentKey


class SetPropositionTruth(BaseModel):
    kind: Literal["set_proposition_truth"]
    proposition_id: str
    truth: TruthStatus


Effect = Annotated[
    Union[
        SetFluent,
        RemoveFluent,
        SetPropositionTruth,
    ],
    Field(discriminator="kind"),
]
```

Extend later with conditional, numeric, probabilistic, epistemic, relationship, and obligation effects.

---

# 13 — PRIMITIVE REGISTRY

The primitive registry is provisional and versioned.

```python
class PrimitiveSpec(FrozenModel):
    id: str
    name: str
    required_roles: dict[str, str]
    optional_roles: dict[str, str] = {}
    preconditions: tuple[Condition, ...]
    effects: tuple[Effect, ...]
    tags: frozenset[str] = frozenset()
```

Start with a semantic anchor set that exercises distinct runtime behavior:

1. MOVE
2. TRANSFER
3. CREATE
4. DAMAGE
5. DESTROY
6. CONCEAL_INFORMATION
7. REVEAL_INFORMATION
8. COMMUNICATE
9. ACQUIRE_INFORMATION
10. UPDATE_BELIEF
11. DECIDE
12. COMMIT
13. RELATIONSHIP_CHANGE
14. STATUS_CHANGE
15. PREVENT
16. DIE

Expand from evidence:

- failed legacy decomposition;
- real-screenplay parser cases;
- planner requirements;
- benchmark failures.

---

# 14 — KERNEL VS AUTHORING VOCABULARY

The system has:

```text
CANONICAL KERNEL
+
RICH AUTHORING VOCABULARY
```

Example:

```text
THREATEN
```

may compile into:

```text
COMMUNICATE(
    speech_act = THREAT,
    content = conditional_harm(...)
)
```

with downstream contextual effects on fear, expectation, obligations, and conflict.

This preserves writer-friendly vocabulary without forcing every lexical distinction into the semantic kernel.


# 15 — TRANSITION PROPOSAL VS COMMITTED EVENT

A proposal is not canon.

```python
class TransitionProposal(BaseModel):
    proposal_id: UUID = Field(default_factory=uuid4)
    branch_id: UUID

    primitive_id: str
    roles: dict[str, str]

    preconditions: list[Condition]
    effects: list[Effect]

    epistemic_effects: list[dict] = []
    relationship_effects: list[dict] = []
    obligation_effects: list[dict] = []

    rationale: str | None = None
    generated_by: str
```

Committed record:

```python
class CommittedEvent(FrozenModel):
    event_id: UUID = Field(default_factory=uuid4)
    sequence_no: int
    project_id: UUID

    primitive_id: str
    roles: dict[str, str]
    applied_effects: tuple[Effect, ...]

    story_time: str | None
    narrative_position: int | None

    branch_origin: UUID | None
    causal_parent_ids: tuple[UUID, ...] = ()
    intentional_parent_ids: tuple[UUID, ...] = ()

    source_provenance: dict
    execution_manifest_id: UUID

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
```

Committed events never change. Corrections are later events.

---

# 16 — WORLD SNAPSHOT

```python
class WorldSnapshot(BaseModel):
    project_id: UUID
    last_sequence_no: int

    entities: dict[str, Entity] = {}
    fluents: dict[str, object] = {}
    proposition_truth: dict[str, TruthStatus] = {}

    active_obligations: dict[str, dict] = {}
    author_locks: dict[str, dict] = {}
```

A snapshot is a cache/projection. The ledger is authoritative in authoring mode.

---

# 17 — TRANSACTIONAL RUNTIME

```python
class TransitionResult(BaseModel):
    valid: bool
    errors: list[dict] = []
    warnings: list[dict] = []
    simulated_state: WorldSnapshot | None = None


async def simulate_transition(
    proposal: TransitionProposal,
    state: WorldSnapshot,
    runtime,
) -> TransitionResult:

    errors = runtime.evaluate_preconditions(
        proposal.preconditions,
        state,
    )

    if errors:
        return TransitionResult(valid=False, errors=errors)

    candidate = state.model_copy(deep=True)
    runtime.apply_effects(proposal.effects, candidate)

    invariant_errors = runtime.check_invariants(candidate)

    if invariant_errors:
        return TransitionResult(
            valid=False,
            errors=invariant_errors,
        )

    return TransitionResult(
        valid=True,
        simulated_state=candidate,
    )
```

Commit protocol:

```text
BEGIN DATABASE TRANSACTION

1. verify expected state revision
2. validate proposal
3. append committed event
4. update snapshot projection
5. update relation projections
6. update obligations
7. write provenance
8. COMMIT

ON FAILURE:
ROLLBACK
```

Never append first and check contradictions afterward.

---

# 18 — EVENT STORE

Conceptual PostgreSQL schema:

```sql
CREATE TABLE narrative_event (
    project_id UUID NOT NULL,
    sequence_no BIGINT NOT NULL,
    event_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    manifest_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (project_id, sequence_no),
    UNIQUE (event_id)
);

CREATE TABLE narrative_snapshot (
    project_id UUID NOT NULL,
    sequence_no BIGINT NOT NULL,
    snapshot JSONB NOT NULL,
    PRIMARY KEY (project_id, sequence_no)
);

CREATE TABLE narrative_relation (
    relation_id UUID PRIMARY KEY,
    project_id UUID NOT NULL,
    source_event_id UUID NOT NULL,
    target_event_id UUID NOT NULL,
    relation_type TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
```

Multiple relation rows may connect the same event pair.

---

# 19 — GRAPH PROJECTIONS

Do not overload one graph.

## 19.1 Temporal

- BEFORE
- AFTER
- MEETS
- OVERLAPS
- DURING
- SIMULTANEOUS

## 19.2 Causal

- CAUSES
- CONTRIBUTES_TO
- ENABLES
- PREVENTS
- MAINTAINS
- TERMINATES
- COMPLICATES

## 19.3 Intentional

- MOTIVATES
- SERVES_GOAL
- BLOCKS_GOAL
- SATISFIES_GOAL
- ABANDONS_GOAL

## 19.4 Epistemic

- ACQUIRES
- KNOWS
- BELIEVES
- SUSPECTS
- DOUBTS
- MISBELIEVES
- DECEIVED_ABOUT

## 19.5 Discourse

- PRESENTED_BEFORE
- WITHHELD_UNTIL
- FLASHBACK_OF
- REVEALED_TO_AUDIENCE
- REFRAMES

## 19.6 Thematic

- SUPPORTS
- CHALLENGES
- ECHOES
- CONTRASTS
- RECONTEXTUALIZES

---

# 20 — NETWORKX PROJECTION

```python
import networkx as nx


def build_relation_graph(events, relations) -> nx.MultiDiGraph:
    g = nx.MultiDiGraph()

    for event in events:
        g.add_node(
            str(event.event_id),
            event_type=event.primitive_id,
            sequence_no=event.sequence_no,
        )

    for rel in relations:
        g.add_edge(
            str(rel.source_event_id),
            str(rel.target_event_id),
            key=str(rel.relation_id),
            relation_type=rel.relation_type,
            **rel.metadata,
        )

    return g
```

Use explicit relation filtering. Do not rely on incorrect `subgraph_view` callback assumptions.

---

# 21 — CHARACTER MIND

```python
class CharacterMind(BaseModel):
    character_id: UUID

    identity_long_term: dict
    adaptation_mid_term: dict
    affect_short_term: dict

    goals: list[dict]
    intentions: list[dict]
    commitments: list[dict]

    beliefs: dict[str, "BeliefRecord"]
    memories: dict[str, "MemoryRecord"]

    source_trust: dict[str, float]
    relationship_models: dict[str, dict]
```

Characters are dynamic systems, not static bios.

---

# 22 — BELIEF RECORD

```python
class BeliefRecord(BaseModel):
    proposition_id: UUID
    confidence: float = Field(ge=0.0, le=1.0)

    status: Literal[
        "believes",
        "suspects",
        "doubts",
        "rejects",
    ]

    source_ids: list[str] = []
    evidence_ids: list[str] = []

    acquired_at_event: UUID | None = None
    last_revised_at_event: UUID | None = None
```

Truth and belief remain separate.

---

# 23 — KNOWLEDGE PROVENANCE

The query:

```text
Why does Alice know the safe combination?
```

should answer:

```text
P41 SAFE_COMBINATION_IS_9284
  ← learned from NOTE_7
  ← note observed in EVENT_114
  ← EVENT_114 occurred before current scene
```

Knowledge validation uses acquisition/provenance paths, not a bare set membership test.

---

# 24 — SELECTIVE NESTED BELIEF

Default:

```text
A believes P
```

When deception requires it:

```text
A believes (B suspects P)
A knows (B does not know P)
```

Activate nested epistemics only for active deception, bluff, mystery, social manipulation, or explicit query.

This avoids combinatorial explosion while preserving the necessary expressive power.

---

# 25 — NARRATOR VS AUDIENCE

Narrator may:

- know truth;
- lack truth;
- lie;
- withhold;
- misremember;
- reframe.

Audience receives presentation.

Never infer:

```text
event.scope != UNKNOWN
→ audience knows event
```

Instead:

```text
CANON EVENT
+
PRESENTATION EVENT
→ AUDIENCE TARGET UPDATE
```

A secret murder can be shown to the audience while remaining unknown to all characters.

---

# 26 — AUTHOR INTENT LEDGER

```python
class LockStrength(StrEnum):
    HARD = "hard"
    SOFT = "soft"
    PREFERENCE = "preference"


class IntentRecord(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    target_type: str
    target_id: str
    intent_type: str

    rationale: str | None = None
    strength: LockStrength
    allowed_mutations: list[str] = []
    created_by: str
```

Examples:

- ambiguity is deliberate;
- red herring remains unresolved;
- scene 27 stays quiet;
- relationship must not romanticize;
- ending identity reveal is locked;
- narrator remains unreliable.

Critics consult intent before suggesting repair.

---

# 27 — OBLIGATION MODEL

An obligation is not created because an object merely appears.

```python
class ObligationStatus(StrEnum):
    CREATED = "created"
    ACTIVE = "active"
    DEFERRED = "deferred"
    FULFILLED = "fulfilled"
    SUBVERTED = "subverted"
    TRANSFORMED = "transformed"
    RELEASED = "released"
    DELIBERATELY_UNRESOLVED = "deliberately_unresolved"
    ACCIDENTALLY_ORPHANED = "accidentally_orphaned"
```

Obligations arise from meaningful expectation:

- explicit promise;
- narrative question;
- salient setup;
- deadline;
- foregrounded threat;
- world-rule expectation;
- adopted genre contract;
- authorial setup.

Only accidental orphaning is automatically defective.

---

# 28 — SCREENPLAY PARSER

The validation product cannot exist without a reliable parser.

Pipeline:

```text
Fountain / FDX
↓
deterministic screenplay syntax parsing
↓
scene segmentation
↓
entity/coreference candidate extraction
↓
event/claim extraction
↓
proposition extraction
↓
temporal normalization
↓
epistemic-access extraction
↓
relationship-state extraction
↓
source-span provenance
↓
confidence / ambiguity classification
↓
semantic graph
```

---

# 29 — SCRIPT-DERIVED CLAIM

```python
class EvidenceSpan(BaseModel):
    document_id: str
    scene_id: str
    start_offset: int
    end_offset: int
    text_hash: str


class ExtractedClaim(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    proposition: Proposition
    evidence: list[EvidenceSpan]
    confidence: float
    extractor_version: str

    status: Literal[
        "supported",
        "ambiguous",
        "contradicted",
        "inferred",
    ]
```

No claim without provenance.

---

# 30 — ANALYSIS-MODE AMBIGUITY

Suppose the script contains:

```text
Alice stares at the empty chair.

ALICE
He always leaves before dessert.
```

Possible interpretations include ordinary absence, abandonment, resentment, grief, or death.

The parser must not promote one interpretation to fact unless supported.

Store hypotheses and uncertainty.

Hard validation never depends on an ambiguous inferred fact unless the project/user resolves it.

---

# 31 — VALIDATION STACK

## Layer 0 — Schema

- IDs;
- role types;
- required fields;
- ranges.

## Layer 1 — Deterministic world invariants

- impossible co-location;
- destroyed object reused;
- impossible possession;
- inaccessible location;
- capability violation;
- dead character acts without world rule.

## Layer 2 — Temporal

- ordinary effect before cause;
- impossible overlap;
- time-window contradiction;
- deadline feasibility.

## Layer 3 — Epistemic

- character acts on inaccessible information;
- unsupported belief revision;
- secret leak without acquisition;
- narrator/audience conflation.

## Layer 4 — Causal

- claimed cause unsupported;
- missing prerequisite;
- unearned conflict resolution;
- accidental causal circularity.

## Layer 5 — Contract

- author lock;
- explicit setup/payoff;
- project rule;
- world rule;
- explicitly adopted genre promise.

## Layer 6 — Learned craft critics

- intentionality;
- orchestration;
- dialogue;
- exposition;
- subtext;
- emotional causality;
- originality;
- tone;
- pacing.

Craft critics cannot upgrade preference into hard world error.

---

# 32 — VALIDATION FINDING

```python
class ValidationFinding(BaseModel):
    id: UUID = Field(default_factory=uuid4)

    severity: Literal[
        "error",
        "warning",
        "suggestion",
    ]

    category: str
    event_ids: list[UUID] = []
    scene_ids: list[str] = []

    message: str
    evidence: list[EvidenceSpan] = []

    violated_rule_id: str | None = None
    confidence: float = 1.0
    minimal_repair_target: str | None = None
```

High-quality finding:

```text
Scene 42: Bob confronts Alice about the forged passport.

Problem:
Bob has no supported acquisition path for PASSPORT_IS_FORGED.

Evidence:
- Scene 18: only Carol examines the passport.
- Scene 27: Carol withholds her conclusion from Bob.

Repair options:
A. Give Bob access to Scene 18 evidence.
B. Change confrontation from knowledge to suspicion.
C. Add an independent evidence-acquisition event.
```

Not:

```text
Make Bob's motivation clearer.
```

---

# 33 — REMOVE THESE AS UNIVERSAL VALIDATORS

Do not hardcode:

- consecutive scenes cannot share intensity;
- stakes must rise every act;
- every scene flips polarity;
- every scene does two jobs;
- every scene ends on a hook;
- every prominent object must pay off;
- every line needs subtext;
- midpoint must hit a page number.

These belong in optional craft/genre/project profiles.

---

# 34 — GOLDEN VALIDATION CORPUS FIRST

Before generation, create 50–200 hand-audited micro-narratives.

Cases should isolate:

1. correct movement;
2. impossible co-location;
3. destroyed object reused;
4. knowledge leak;
5. correct private reveal;
6. audience knows / character does not;
7. character knows / audience does not;
8. false belief;
9. lie believed;
10. lie rejected;
11. alias reveal;
12. unreliable narrator;
13. setup fulfilled;
14. deliberate unresolved question;
15. accidental orphan;
16. coincidence creates trouble;
17. coincidence resolves climax;
18. flashback;
19. simultaneous events;
20. time loop.

Every runtime change runs this corpus.

---

# 35 — PROPERTY-BASED TESTING

Properties:

```text
A character cannot intentionally use information
without an admissible belief/knowledge path.

A committed event's sequence number is unique and monotonic.

Replaying the ledger under a compatible manifest
produces the same canonical snapshot.
```

Generate randomized states/transitions to attack the runtime.

---

# 36 — METAMORPHIC TESTING

Examples:

If a red herring moves later:

```text
core murder causal chain should remain unchanged
```

If Bob loses access to a clue:

```text
all actions whose only justification is that clue become invalid
```

If gun becomes knife:

```text
generic weapon-dependent scenes survive;
firearm-specific scenes invalidate.
```

---

# 37 — 4,157-EVENT MIGRATION EXPERIMENT

Do not “map” and declare victory.

## 37.1 Stratified anchor set

Manually curate examples across physical, cognitive, emotional, social, communicative, mystery, genre labels, absence, modality, composite, and institutional categories.

## 37.2 Assisted decomposition

LLM proposes:

```text
legacy event
→ kernel operations
→ operators
→ domain arguments
→ composition
```

## 37.3 Independent round trip

```text
decomposition
→ human-readable reconstruction
→ semantic equivalence review
```

## 37.4 Metrics

- direct-map rate;
- composition rate;
- operatorization rate;
- alias-only rate;
- ambiguous rate;
- meaning-loss rate;
- over-decomposition rate;
- unresolved rate;
- kernel-extension pressure.

No primitive-count conclusion before this report exists.

---

# 38 — NARRATIVE MEMORY FABRIC

Long context is not memory architecture.

## M0 — Beat
Immediate dialogue/actions.

## M1 — Scene
Participants, location, props, goals, local state.

## M2 — Active threads
Relevant plot/relationship/mystery subgraphs.

## M3 — Character-local memory
Only accessible knowledge/history.

## M4 — Canon
Full accepted state/ledger.

## M5 — Provenance
Source evidence/extraction lineage.

## M6 — Optional latent long-horizon state
Experimental sidecar for long-range pattern prediction; never authoritative.

---

# 39 — MEMORY QUERY ROUTER

```python
class MemoryQuery(BaseModel):
    query_type: Literal[
        "fact",
        "causal",
        "temporal",
        "character_knowledge",
        "relationship",
        "obligation",
        "thread",
        "theme",
    ]

    requester_character_id: UUID | None = None
    scene_position: int | None = None
    payload: dict
```

Examples:

```text
Who knew the code by scene 27?
→ epistemic + temporal

What caused Alice to stop trusting Bob?
→ relationship + causal

Did the red umbrella pay off?
→ obligation

What does Bob think Alice knows?
→ nested epistemic
```

Vector similarity is supporting retrieval, not the universal retrieval strategy.

---

# 40 — PLANNING CONTEXT

```python
class PlanningContext(BaseModel):
    canonical_state: WorldSnapshot
    active_threads: list[dict]
    active_obligations: list[dict]
    character_views: dict[str, CharacterMind]
    author_intent: list[IntentRecord]
    project_policy: dict
    current_sequence_goal: dict
```

---

# 41 — CHARACTER PROPOSALS

Characters propose from bounded local state:

```text
CHARACTER VIEW
+
GOALS
+
BELIEFS
+
AFFECT
+
RELATIONSHIPS
→ ACTION PROPOSALS
```

They do not mutate canon.

A director/planner combines character proposals with environmental, antagonist, systemic, and author-driven possibilities.

---

# 42 — BRANCH OBJECT

```python
class NarrativeBranch(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    parent_state_revision: int
    proposals: list[TransitionProposal]

    simulation: dict | None = None
    hard_findings: list[ValidationFinding] = []
    creative_scores: dict[str, float] = {}

    status: Literal[
        "proposed",
        "simulated",
        "invalid",
        "candidate",
        "selected",
        "rejected",
    ]
```

---

# 43 — PLANNER PORTFOLIO

There is no guaranteed single best planner.

Start with:

### A — LLM proposals + hard simulation
Cheapest useful baseline.

### B — Beam / best-first
Bounded alternative search.

### C — Hierarchical decomposition
Useful for structured problems such as heist, investigation, pursuit, trial, rescue.

### D — MCTS
Experimental for long delayed consequences.

### E — Epistemic planner
Deception, mystery, bluff, social information.

### F — Constraint solver
Exact time, location, possession, resource, deadline feasibility.

A meta-controller routes by problem class and compute budget.

Every planner must survive ablation against simpler alternatives.

---

# 44 — PARETO SELECTION

Hard validity first.

Then preserve Pareto candidates across:

- character intentionality;
- causal strength;
- conflict quality;
- originality;
- emotional causality;
- thematic utility;
- thread interaction;
- surprise;
- retrospective support;
- future option value;
- pacing fit;
- production constraints;
- author taste.

A temporal contradiction cannot be averaged away by originality.

---

# 45 — FUTURE OPTION VALUE

Estimate:

```text
OPTION VALUE =
quality of viable future branches
- contradiction risk
- premature closure
- repetition
- complexity debt
```

Use as planner heuristic, not hard law.


# 46 — SCENE CONTRACT

```python
class SceneContract(BaseModel):
    scene_id: UUID = Field(default_factory=uuid4)
    entry_state_revision: int

    location_id: UUID
    participating_characters: list[UUID]
    focalizer: UUID | None

    objectives: dict[str, str]
    obstacles: list[str]
    stakes: dict

    required_transitions: list[TransitionProposal]
    forbidden_conditions: list[Condition]

    information_delta: list[dict]
    relationship_delta: list[dict]
    obligation_delta: list[dict]

    author_locks: list[UUID]
    exit_conditions: list[Condition]
```

This is the formal handoff from planner to realization.

---

# 47 — BEAT IR

No fixed beat count.

```python
class Beat(BaseModel):
    actor: UUID | None
    tactic: str | None
    target: UUID | None
    observable_action: str
    expected_response: str | None
    semantic_transition_ids: list[UUID]
    information_effect: dict | None = None
    pressure_effect: dict | None = None
```

---

# 48 — AUDIOVISUAL IR

Before screenplay prose, model what can be seen/heard.

```python
class AVRealization(BaseModel):
    scene_id: UUID

    visible_actions: list[str]
    blocking: list[str]
    prop_interactions: list[str]

    dialogue_intents: list[dict]
    audible_dialogue: list[dict]

    sound_events: list[str]
    silences: list[dict]
    visual_information: list[dict]

    entrances: list[str]
    exits: list[str]
```

This forces filmability before surface writing.

---

# 49 — SCREENPLAY RENDERER

Input:

```text
Scene Contract
+
AV IR
+
style profile
+
character voice state
```

Output:

```text
Fountain scene
```

Renderer may alter:

- syntax;
- diction;
- rhythm;
- compression;
- line breaks;
- descriptive texture.

Renderer may not silently alter:

- canonical outcome;
- location;
- possession;
- knowledge;
- relationship state;
- world rule;
- causal mechanism;
- protected intent.

---

# 50 — SEMANTIC ROUND-TRIP FIREWALL

After rendering:

```text
Fountain scene
→ claim extractor
→ extracted propositions/events
→ semantic diff
```

Difference classes:

```text
SURFACE_ONLY
SUPPORTED_IMPLICATION
MATERIAL_NEW_FACT
CANON_CONTRADICTION
KNOWLEDGE_LEAK
WORLD_RULE_MUTATION
UNPLANNED_OBLIGATION
AUTHOR_LOCK_VIOLATION
```

Material mutations route back to planning/review rather than silently entering canon.

---

# 51 — SCENE GENERATION PIPELINE

```python
async def generate_next_scene(project_id: UUID):

    state = await load_canonical_state(project_id)

    memory = await retrieve_relevant_memory(
        project_id=project_id,
        state=state,
    )

    planning_context = build_planning_context(
        state,
        memory,
    )

    branches = await propose_branches(planning_context)

    valid = []

    for branch in branches:
        result = await simulate_and_validate(branch, state)
        if result.valid:
            valid.append(result)

    selected = await select_pareto_candidate(valid)

    contract = compile_scene_contract(selected)
    realizations = await generate_av_realizations(contract)

    rendered = await render_scene_candidates(
        contract,
        realizations,
    )

    checked = []

    for candidate in rendered:
        claims = await extract_claims(candidate)
        semantic_diff = diff_against_contract(
            claims,
            contract,
            selected,
        )

        critique = await run_craft_critics(
            candidate,
            contract,
        )

        checked.append(
            score_candidate(
                candidate,
                semantic_diff,
                critique,
            )
        )

    winner = select_rendered_candidate(checked)
    repaired = await local_repair_if_needed(winner)

    await regression_test(repaired)

    await transactional_commit(
        project_id,
        selected,
        repaired,
    )

    return repaired
```

---

# 52 — WHY NOT ONE-SHOT 110-PAGE GENERATION

Whole-draft generation:

- weakens state control;
- complicates knowledge tracking;
- allows local errors to propagate;
- increases revision blast radius;
- makes semantic reconciliation difficult;
- conflates story construction and screenplay rendering.

Keep it only as a research baseline.

Default production architecture commits one controlled scene/sequence unit at a time.

---

# 53 — CRITIC SYSTEM

Each critic is narrow.

## Intentionality critic

```text
Why does this character make this choice now?
Which belief, goal, value, fear, commitment, or pressure supports it?
```

## Orchestration critic

```text
Are threads interacting meaningfully?
Is narrative weight distributed effectively?
Are turns repetitive?
```

## Dialogue critic

```text
Does dialogue perform useful social action?
Does voice follow current character state?
```

## Subtext critic

```text
Is implicit meaning useful in this scene?
```

Not:

```text
Every line must have subtext.
```

## Originality critic

Examines:

- causal choice;
- agency;
- cost;
- relationship dynamics;
- information design;
- set-piece;
- structure.

Not merely embedding distance.

---

# 54 — ROOT-CAUSE REPAIR

Given:

```text
Scene 88 climax feels arbitrary
```

Trace:

```text
Scene 88 resolution lacks causal support
← Scene 74 decision lacks prerequisite
← protagonist never acquired clue
← Scene 39 clue was removed during revision
```

Prefer repairing the earliest minimal cause that preserves intent.

---

# 55 — REPAIR OBJECT

```python
class RepairProposal(BaseModel):
    target_type: str
    target_id: str
    root_cause_id: str
    operations: list[dict]
    predicted_fixes: list[str]
    predicted_side_effects: list[str]
    confidence: float
```

---

# 56 — REGRESSION TESTING

After repair:

1. rerun local hard validation;
2. calculate dependency closure;
3. rerun affected epistemic queries;
4. rerun affected obligations;
5. rerun affected relationship arcs;
6. rerun ending constraints if dependency reaches ending;
7. compare author locks.

A small prose edit may have a large semantic impact.

---

# 57 — IMPACT ANALYSIS API

```text
what_breaks_if(event_removed)
what_breaks_if(character_learns_fact_earlier)
what_breaks_if(object_changes_owner)
what_breaks_if(scene_moves)
what_breaks_if(reveal_is_delayed)
```

This is a high-value writer-facing capability.

---

# 58 — INITIAL CLI

```text
story-machine import script.fountain
story-machine analyze project
story-machine validate project
story-machine knowledge CHARACTER --scene 42
story-machine trace-cause EVENT_A EVENT_B
story-machine open-obligations
story-machine impact --remove scene_17
story-machine explain finding_83
```

Do not expose autonomous feature generation until analysis is stable.

---

# 59 — API SURFACE

```text
POST /projects
POST /projects/{id}/import

GET  /projects/{id}/state
GET  /projects/{id}/events
GET  /projects/{id}/relations

GET  /projects/{id}/characters/{character}/view
GET  /projects/{id}/obligations
GET  /projects/{id}/findings

POST /projects/{id}/analyze
POST /projects/{id}/validate

POST /projects/{id}/branches
POST /projects/{id}/branches/{branch}/simulate
POST /projects/{id}/branches/{branch}/select

POST /projects/{id}/scenes/plan
POST /projects/{id}/scenes/render

POST /projects/{id}/repairs
POST /projects/{id}/commits
```

---

# 60 — OBSERVABILITY

```python
class ModelCallRecord(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    manifest_id: UUID
    purpose: str

    provider: str
    model_id: str
    prompt_template_version: str

    input_hash: str
    output_hash: str

    latency_ms: int
    token_usage: dict

    parent_trace_id: UUID | None = None
```

---

# 61 — REPLAY

## Deterministic semantic replay

Reapply committed domain events.

Expected:

```text
same ledger + compatible manifest
→ same snapshot
```

## Generative replay

LLM calls are not assumed deterministic.

For exact debugging, reuse cached outputs.

For a new experiment, create a new run/manifest/branch.

---

# 62 — EXECUTION ISOLATION

Pin:

- model revision;
- ontology registry;
- prompt bundle;
- validator bundle;
- retrieval snapshot;
- schema;
- tool registry.

Resuming with changed resources is explicit migration or new branch, not invisible behavior.

---

# 63 — EVALUATION HARNESS

Evaluation exists before generation.

## Parser metrics

- scene segmentation;
- entity extraction;
- coreference;
- event extraction;
- proposition extraction;
- knowledge attribution;
- relation extraction.

## Runtime metrics

- valid transition acceptance;
- invalid transition rejection;
- replay correctness;
- branch isolation;
- invariant coverage.

## Narrative QA

- who knows P at scene N?;
- where is object X?;
- who owns X?;
- what caused Y?;
- which setups remain open?;
- how did relationship A/B change?;
- earliest evidence for P?

## Generation metrics

- hard-error rate;
- renderer mutation rate;
- knowledge leaks;
- continuity errors;
- repair success;
- regression rate.

## Creative evaluation

Human pairwise:

- character;
- causality;
- emotional truth;
- originality;
- scene effectiveness;
- dialogue;
- overall preference.

---

# 64 — HORIZON CURVE

Evaluate at:

```text
1 scene
5 scenes
20 scenes
50 scenes
feature length
season length
100+ episode equivalent
```

Plot degradation rather than one aggregate long-form score.

---

# 65 — JUDGE RELIABILITY

Automated judges are noisy sensors.

Use:

- multiple judge models/families where possible;
- blinded candidate identity;
- randomized order;
- repeated ratings;
- rubric-specific judgments;
- disagreement tracking;
- confidence;
- human calibration.

A reward model does not define quality.

---

# 66 — DATA PROGRAM

Do not fine-tune before the runtime creates useful structured supervision.

Priority data:

1. rights-cleared screenplay text;
2. script → semantic graph pairs;
3. graph → scene-contract pairs;
4. contract → scene pairs;
5. intentionality annotations;
6. knowledge-timeline annotations;
7. causal-chain annotations;
8. revision histories;
9. failure → repair pairs;
10. expert pairwise preferences.

---

# 67 — TRAINING STAGES

## A — Parser / representation

Train extraction.

## B — Transition prediction

```text
state + proposed transition
→ valid / invalid
→ next state
```

## C — Knowledge / belief

Track acquisition and revision.

## D — Planner

```text
state + goal
→ candidate transitions
```

## E — Scene contract

```text
selected branch
→ scene contract
```

## F — AV realization

```text
contract
→ observable behavior / dialogue intent
```

## G — Renderer

```text
AV IR
→ screenplay
```

## H — Semantic round trip

```text
screenplay
→ claims
```

## I — Repair

```text
finding + evidence + dependency graph
→ localized patch
```

## J — Preference

Only after hard consistency is controlled.

---

# 68 — RIGHTS / PROVENANCE

Every training artifact records:

```text
source
rights basis
license
draft lineage
transformation lineage
duplicate cluster
split assignment
```

Separate evaluation holdouts by:

- franchise;
- adaptation;
- writer;
- draft lineage;
- near-duplicate cluster.

---

# 69 — IMPLEMENTATION ROADMAP

## PHASE 0 — Evaluation Before Ontology Lock

**Target:** 1–2 weeks.

Build:

- 50–200 golden micro-stories;
- hard failure taxonomy;
- parser benchmark sample;
- primitive anchor set;
- CI.

Gate:

```text
No ontology expansion without failing evidence.
```

## PHASE 1 — Executable Semantic Runtime

**Target:** 2–4 weeks.

Build:

- entities;
- propositions;
- fluents;
- condition AST;
- effect AST;
- provisional 10–20 operation kernel;
- transition simulation;
- invariants.

Gate:

- golden deterministic cases pass;
- impossible transitions rejected before mutation.

## PHASE 2 — Event Store + Replay

**Target:** 1–2 weeks.

Build:

- PostgreSQL ledger;
- snapshots;
- commit transaction;
- replay;
- manifest pinning;
- author intent ledger.

Gate:

```text
same ledger + compatible manifest → same canonical state
```

## PHASE 3 — Temporal / Epistemic / Causal Projections

**Target:** 2–4 weeks.

Build:

- temporal relations;
- proposition provenance;
- character beliefs;
- source trust;
- causal/intentional edges;
- MultiDiGraph projection.

Gate:

- golden knowledge/causal/timeline queries pass.

## PHASE 4 — Screenplay Parser

**Target:** 3–6 weeks.

Build:

- Fountain parsing;
- scene segmentation;
- entity/coreference;
- event/claim extraction;
- provenance;
- ambiguity handling.

Gate:

- human-audited extraction threshold;
- findings cite source evidence.

## PHASE 5 — First Shippable Product: Analysis / Validation

Build:

- CLI;
- API;
- validation reports;
- character-knowledge view;
- causal trace;
- open obligations;
- impact analysis.

Gate:

- professional users find reports useful;
- false-positive rate acceptable;
- author-intent overrides work.

## PHASE 6 — 4,157 Migration

Run full experiment.

Gate:

- actual coverage/meaning-loss report;
- kernel modified only from evidence.

## PHASE 7 — Narrative Memory Fabric

Gate:

- beats flat/vector-only retrieval on multi-hop narrative QA.

## PHASE 8 — Branch Planner

Build:

- LLM proposals;
- simulation;
- hard pruning;
- beam search;
- Pareto selection.

Optional after benchmarks:

- hierarchical planner;
- MCTS;
- epistemic planner;
- constraint solver.

Gate:

- planner beats one-shot outline baseline.

## PHASE 9 — Scene Contract + AV IR

Gate:

- contracts capture intended semantics;
- expected state deltas are reproducible.

## PHASE 10 — Renderer + Material-Fact Firewall

Gate:

- round-trip catches renderer mutations;
- scene-level generation beats whole-draft baseline on continuity.

## PHASE 11 — Local Repair + Regression

Gate:

- local repair beats whole rewrite on preservation and downstream errors.

## PHASE 12 — Preference / Creative Optimization

Add only now:

- originality search;
- pairwise human evaluation;
- reward models;
- fine-tuning;
- best-of-n.

Gate:

- held-out expert preference improves;
- consistency does not regress.

---

# 70 — SOLO / SMALL-TEAM MVP

Do **not** promise the final autonomous screenplay generator in 12 weeks.

Build:

```text
✓ PostgreSQL event ledger
✓ entities / propositions / fluent runtime
✓ 12–16 provisional semantic operations
✓ executable conditions/effects
✓ 20–50 golden cases
✓ basic epistemic provenance
✓ temporal/causal projections
✓ Fountain parser
✓ evidence-backed validator
✓ CLI
✓ API
✓ one character-knowledge query
✓ one impact-analysis query
✓ one local suggested-repair flow
```

Do not build yet:

```text
✗ full 4,157 manual mapping
✗ fine-tuned screenplay model
✗ Neo4j
✗ MCTS
✗ elaborate web editor
✗ reward model
✗ feature-length autonomous generation
```

---

# 71 — MVP SUCCESS CRITERIA

The MVP succeeds if it can take a short screenplay and reliably answer:

1. What materially happened?
2. What is uncertain?
3. Where are important objects?
4. Who knows important facts?
5. How did they learn them?
6. Which relationships changed?
7. Which events caused later events?
8. Which setups appear unresolved?
9. Which apparent problems are deliberate?
10. What later scenes would a proposed change affect?

If it cannot do these, it is not ready to write 110 pages.

---

# 72 — CORE TEST EXAMPLE

```python
async def test_character_cannot_act_on_hidden_fact(runtime):
    state = demo_state()

    learn = proposal_learn(
        character="ALICE",
        proposition="SAFE_CODE_IS_9284",
        visibility=["ALICE"],
    )

    state = (await runtime.commit(learn, state)).state

    use = proposal_unlock_safe(
        character="BOB",
        code="9284",
        required_proposition="SAFE_CODE_IS_9284",
    )

    result = await runtime.simulate(use, state)

    assert result.valid is False
    assert any(
        x["category"] == "epistemic"
        for x in result.errors
    )
```

---

# 73 — CORRECT PACING POLICY

A pacing critic should produce:

```text
OBSERVATION:
Scenes 21–25 maintain similar tension-vector profiles
with little information or tactic change.

CONFIDENCE:
0.71

PROJECT PROFILE:
Thriller profile prefers more modulation here.

STATUS:
Suggestion, not structural error.

AUTHOR INTENT:
Scene 23 is HARD_LOCK quiet/static.

REPAIR:
Do not alter Scene 23.
Consider changing Scenes 21/22 or 24/25.
```

Not:

```text
Two scenes have intensity 6. Violation.
```

---

# 74 — CORRECT ORIGINALITY EVALUATION

Do not equate originality with embedding distance from tropes.

Evaluate:

- expectedness of event;
- causal mechanism;
- agent choice;
- cost;
- relationship configuration;
- information design;
- set-piece;
- structural strategy.

Use human pairwise preference as the final creative evidence.

---

# 75 — PROVIDER / MODEL ABSTRACTION

Do not hard-code provider model names into architecture.

```python
class ModelCapabilityProfile(BaseModel):
    structured_output: bool
    long_context: bool
    tool_calling: bool
    reasoning_control: bool
    streaming: bool
    fine_tunable: bool
    local_deployment: bool
```

Route tasks by benchmarked performance.

The best parser, planner, renderer, and critic may be different models.

---

# 76 — FRAMEWORK DEPENDENCY RULE

LangGraph may provide orchestration features such as checkpointing, durable execution, human interruption, and workflow replay.

Story Machine owns:

- event ledger;
- semantic state;
- author intent;
- narrative relations;
- validation;
- branch semantics.

If LangGraph disappears, the canonical project remains valid.

This is the correct dependency direction.

---

# 77 — POSTGRES VS GRAPH DATABASE

Default:

```text
PostgreSQL = canonical persistence
NetworkX MultiDiGraph = analytical projection
```

Consider a graph database only if measurements show relation traversal dominates and operational complexity is justified.

---

# 78 — FAILURE MODES TO WATCH

## Runtime

- state mutation before validation;
- stale snapshot;
- event ordering race;
- replay mismatch;
- branch leakage;
- manifest/version skew.

## Parser

- wrong coreference;
- inferred fact treated as explicit;
- dialogue speaker ambiguity;
- offscreen event hallucinated;
- narrator claim treated as truth.

## Planner

- character omniscience;
- invalid preconditions;
- cosmetic branch diversity;
- option-space collapse;
- genre-template overfitting.

## Renderer

- invented prop;
- new relationship fact;
- changed outcome;
- unplanned clue;
- knowledge leak.

## Critic

- repairs deliberate ambiguity;
- generic taste masquerades as rule;
- reward hacking;
- judge order bias;
- excessive rewriting.

---

# 79 — ACCEPTANCE GATES

Do not advance because a phase “works.”

Each phase needs measurable gates.

Examples:

```text
Parser gate:
High precision on explicit material facts
while preserving ambiguity.

Epistemic gate:
No known leakage on golden cases
plus agreed performance on script QA.

Renderer gate:
Material-fact mutation rate below agreed threshold.

Repair gate:
Localized repair causes fewer downstream regressions
than whole-scene rewrite.
```

Set exact thresholds after pilot measurement rather than inventing them.

---

# 80 — KILL CRITERIA

| Observation | Action |
|---|---|
| primitive registry absorbs domain labels | refactor kernel |
| >5% legacy cases require meaning-loss | expand/refactor semantics |
| graph planning does not beat simpler planning | narrow/remove |
| nested epistemics add no deception benefit | restrict/disable |
| NetworkX becomes bottleneck | replace projection engine |
| graph database adds no measured benefit | do not adopt |
| workflow framework creates semantic/version risk | custom orchestrator |
| narrative memory does not beat flat retrieval | redesign |
| round-trip checker catches little useful error | narrow |
| local repair creates regressions | improve dependency model |
| reward model fails human correlation | remove from selection |
| creative search lowers human preference | redesign |
| users reject notes as false positives | recalibrate |
| expensive subsystem does not improve held-out metrics | delete |

---

# 81 — RESEARCH PROGRAM

## Experiment 1 — Kernel minimality

Compare candidate primitive sets.

## Experiment 2 — Parser quality vs practical usefulness

Measure which extraction errors actually damage validation.

## Experiment 3 — Flat retrieval vs narrative graph retrieval

Use multi-hop narrative questions.

## Experiment 4 — Whole-draft vs scene-transaction generation

Measure continuity, knowledge leakage, repair cost, preference.

## Experiment 5 — Graph planner vs outline-only planner

Measure causality, intentionality, creativity, cost.

## Experiment 6 — Custom orchestrator vs LangGraph

Measure reliability, recovery, semantic pinning, development speed, observability.

## Experiment 7 — PostgreSQL-only vs graph store

Use real query traces.

## Experiment 8 — Local repair vs whole rewrite

Measure collateral damage.

## Experiment 9 — Automated preference vs expert preference

Audit judge stability.

## Experiment 10 — Long-horizon degradation

Measure 10/20/50/100+ scene horizons.

---

# 82 — RESEARCH BASIS

The architecture uses the strongest currently relevant evidence while treating very recent preprints as provisional rather than settled fact.

## PLOTTER — Graph-first narrative planning

**Planning Beyond Text: Graph-based Reasoning for Complex Narrative Generation**  
arXiv:2604.21253, 2026.

Relevance:

- planning on event and character graphs;
- Evaluate → Plan → Revise before complete text;
- structural repair under logical constraints.

## Narrative World Model — Narratology-specific memory

**Narrative World Model: Narratology-Grounded Writer Memory for Long-Form Fiction**  
arXiv:2607.05577, 2026.

Relevance:

- typed temporal-state graph;
- query-conditioned hybrid retrieval;
- knowledge timing, reveal timing, relationship changes, setup/payoff QA.

## ConWriter — Incremental transition-constrained generation

**ConWriter: Transition-Constrained Stateful Long-Form Story Generation with Lightweight Neuro-Symbolic Consistency Control**  
arXiv:2608.05169, 2026.

Relevance:

- scene-level incremental generation;
- evolving narrative state;
- transition checks;
- uncertainty-aware validation;
- localized repair.

## EPDDL — Epistemic planning

**The Epistemic Planning Domain Definition Language: Official Guideline**  
arXiv:2601.20969, 2026.

Relevance:

- knowledge and belief as planning state;
- Dynamic Epistemic Logic semantics;
- formal epistemic actions.

## Decomposed screenplay generation

**Beyond Direct Generation: A Decomposed Approach to Well-Crafted Screenwriting with LLMs**  
arXiv:2510.23163, revised 2026.

Relevance:

- decouples narrative construction from screenplay-format realization;
- evidence against one decoding task doing both jobs.

## Event-sourced agent architecture

**The Log is the Agent: Event-Sourced Reactive Graphs for Auditable, Forkable Agentic Systems**  
arXiv:2605.21997, 2026.

Relevance:

- event log as source of truth;
- deterministic replay;
- cheap forking;
- lineage.

## Story preference modeling

**StoryAlign: Evaluating and Training Reward Models for Story Generation**  
arXiv:2605.04831 / ICLR 2026.

Relevance:

- story-specific reward modeling;
- best-of-n;
- evidence that reward models remain imperfect proxies for human preferences.

## Very-long-horizon latent state

**NarrativeWorldBench / N-VSSM**  
arXiv:2606.17391, 2026.

Relevance:

- evaluates horizons to 200;
- explores learned latent narrative state.

Treat as optional research sidecar, not authoritative semantic core.

## Durable orchestration

**LangGraph official documentation**, 2026.

Relevance:

- checkpoints;
- persistence;
- human-in-the-loop;
- replay/time travel;
- fault recovery.

## Semantic isolation

**BEGIN AI TRANSACTION: Semantic Isolation for Durable AI Workflows**  
arXiv:2608.05412, 2026.

Relevance:

- checkpoint durability does not itself pin prompt/model/tool/index semantics;
- motivates execution manifests and semantic snapshot compatibility.

## Pydantic official documentation

Relevance:

- typed validation;
- `Field(default_factory=...)` for generated/default values.

## NetworkX official documentation

Relevance:

- `MultiDiGraph` supports directed parallel edges;
- ordinary `DiGraph` does not.

## Fountain official specification

Relevance:

- human-readable plain-text screenplay representation.

## PostgreSQL official documentation

Relevance:

- transactions;
- JSONB;
- recursive queries;
- mature persistence.

---

# 83 — FINAL BUILD ORDER

```text
1. Golden semantic/evaluation corpus
2. Executable semantic runtime
3. Event ledger + snapshot replay
4. Temporal / epistemic / causal projections
5. Script parser + provenance
6. Analysis / validation product
7. 4,157-event coverage experiment
8. Narrative Memory Fabric
9. Branch planner
10. Scene Contract compiler
11. Audiovisual realization layer
12. Scene renderer
13. Semantic round-trip firewall
14. Root-cause local repair
15. Regression testing
16. Human preference evaluation
17. Creative search / reward models
18. Custom fine-tuning
19. Full long-form autonomous generation
```

This order maximizes information gained per engineering dollar and minimizes the risk of building a sophisticated system on an unproven semantic core.

---

# 84 — WHAT TO BUILD MONDAY MORNING

### Day 1

1. Create repository.
2. Create Pydantic `Entity`, `Proposition`, `FluentKey`.
3. Implement `Condition` AST.
4. Implement `Effect` AST.
5. Implement `WorldSnapshot`.
6. Implement `simulate_transition()`.
7. Write five deterministic tests.

### Day 2

8. Implement append-only PostgreSQL event store.
9. Implement snapshot replay.
10. Add execution manifest.

### Day 3

11. Add character belief records.
12. Implement private LEARN and public REVEAL examples.
13. Test knowledge leakage.

### Day 4

14. Implement temporal/causal relation tables.
15. Build `MultiDiGraph` projection.
16. Add `trace_causal_chain()`.

### Day 5

17. Parse a tiny Fountain screenplay.
18. Extract scenes deterministically.
19. Extract candidate events with source spans.
20. Produce the first evidence-backed continuity finding.

At the end of week one, you should **not** have a screenplay generator.

You should have something more valuable:

> A small narrative computer that can distinguish truth, belief, state transition, evidence, presentation, and contradiction.

That is the correct foundation.

---

# 85 — FINAL ENGINEERING DEFINITION

> **Story Machine Ω should be implemented as a versioned, event-sourced semantic narrative runtime with executable state transitions, evidence-backed screenplay parsing, separate temporal/causal/epistemic/intentional/discourse projections, author-intent protection, narratology-aware memory, branch simulation, scene contracts, scene-level generation, semantic round-trip validation, root-cause localized repair, regression testing, and empirically gated ontology expansion.**

The ontology is not the foundation.

The **semantic runtime is the foundation**.

The screenplay model is not the source of story truth.

The **accepted event ledger is the source of truth in authoring mode**.

The validator is not a bundle of screenwriting aphorisms.

It separates:

```text
impossibility
from
contract violation
from
creative preference
```

The generator does not write 110 pages and hope a critic repairs them.

It proposes, simulates, validates, realizes, round-trips, repairs, and commits **one controlled unit at a time**.

And no component survives because it looks sophisticated.

Every major subsystem must survive:

```text
BENCHMARK
→ ABLATION
→ ADVERSARIAL TEST
→ HELD-OUT TEST
→ HUMAN EVALUATION
```

or it is replaced.

---

*End of STORY MACHINE Ω — Final Engineering Specification.*
