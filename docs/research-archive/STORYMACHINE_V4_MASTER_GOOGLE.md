# **STORYMACHINE V4**

## **Master Systems Architecture & Computational Dramaturgy Specification**

This document serves as the absolute, unified engineering blueprint for **STORYMACHINE v2.0**. It synthesizes peer-reviewed narrative theory, advanced agentic research, and 2026 SOTA benchmarks into a closed-loop physics engine for drama.

---

### **0. THE THREE AXIOMS OF COMPUTATIONAL DRAMA**

STORYMACHINE abandons generative "vibes" in favor of deterministic dramatic physics:

1. **Tension is a Vector Gap:** The multidimensional distance between an agent's desired state ($I$) and perceived reality ($P$).
2. **Knowledge is an Asymmetry Matrix:** Drama lives in the gaps of nested beliefs ($K_a P$, $K_a K_b P$).
3. **Subtext is a Calculable Delta:** Subtext = Internal Reasoning ($Stage 1$) - Public Action ($Stage 2$).

---

### **ENGINE 1: THE ONTOLOGICAL SUBSTRATE (World & Epistemics)**

**1.1. The S³AP Social World Matrix [Hoque et al., 2026]**
Every turn is stored as a tuple: `(Environment_State, Agent_Action, Mental_State_Update)`. This ensures formal social reasoning and prevents factual drift.

**1.2. Dynamic Modal Logic & Subconscious Layers**

* **Layer 0 (Ground Truth):** Objective reality.
* **Layer 1-3:** Nested Theory of Mind ($K_a P \rightarrow K_a K_b P$).
* **Layer -1 (Subconscious):** Detached reality for hallucinations, dreams, or extreme trauma-induced dissociation.
* **Epistemic Genealogy:** Every belief tracks a `source_origin_id` ("Patient Zero") to trace the path of a lie or revelation.

**1.3. Persistence & Environmental Physics**

* **Prop State-Machines:** Objects possess functional states (e.g., `Gun: [Safety_On, Jammed, Empty]`).
* **Asset Dependency Graphs:** Technical items require chains (e.g., `Camera` requires `Battery` + `Media`).
* **Spatial LCS (3D Grounding):** Agents and props have $x, y, z$ coordinates within location nodes.
* **Sonic Occlusion Maps:** Calculates "Sonic Density" to determine `OVERHEAR` tactic success probabilities.
* **G-KMS Lorebook:** Validated public facts are admitted into "World Law," inherited by all future agents.

---

### **ENGINE 2: AGENT COGNITION (The Dissonance Reactor)**

**2.1. 3-Tier Horizon Goal DAG & Reflection [Park 2023]**

* **Existential (Open-Ended):** Long-term wounds/needs. Updated via **Reflection Loops** every $N$ turns.
* **Strategic (Scene):** Current objectives with **Cross-Character Edges** (dependencies on other agents' goals).
* **Tactical (Beat):** Mask vs. True State.

**2.2. Dual-Drive Escalation & Somatic Feedback**

* **Intent Pressure:** $Pressure += (Importance \times Frustration) - (Progress \times Relief)$.
* **Dissonance Loop [Festinger, 1957]:** Conflicting beliefs trigger clinical defenses (Denial, Projection).
* **Somatic State-Machine:** Tracks Fatigue, Adrenaline, and Impairment. High fatigue structurally blocks "High-IQ" tactics, forcing impulsive tactical shifts.

**2.3. Deception Physics & Capabilities**

* **Lie Load [Sarkadi 2019]:** Mathematical burden of nested lies. High load triggers **Epistemic Leaks** (conflicting dialogue).
* **Pexelle Competency Graphs [2026]:** Tactics are gated by validated skill nodes (e.g., cannot `FORGE` without `Forgery` skill).
* **Performance Masking:** Agents calculate a `Masking_Level` (0.0-1.0) to suppress emotive prose in public actions while maintaining high-intensity subtext.

**2.4. Deterministic ToT & CICERO Commitments**

* **Zero-LLM Lookahead:** Local scoring of 3 tactics 2 steps ahead ($\Delta g$, Risk, Progress).
* **PEDS Gating:** Personality (Big Five/Dark Triad) weights ToT math but is redacted from final LLM prompts.
* **Commitment Ledger:** Logs `PROMISES`. Violations trigger a `BETRAYAL_EVENT`.

---

### **ENGINE 3: PROACTIVE DRAMA MANAGEMENT (DirectorNode)**

**3.1. Tension Steering & TTD-MDPs [Roberts et al.]**
Optimizes for a **Trajectory Distribution** of narrative arcs (Intimacy, Power, Mystery) rather than a single linear path.

**3.2. System Moves & Plot Rescheduling [IBSEN 2024]**

* **Intervention Palette:** *Reveal, Withhold, Escalate, Cool, Redirect, Complicate, Force proximity, Separate, Ticking clock, Mirror, Betray expectation.*
* **Abstract Act Rescheduling:** Re-routes the Syuzhet outline if emergent agent behavior bypasses the locked conclusion.

**3.3. Rhythmic & Physical Control**

* **Rhythmic Beat Controller (RhythmSync):** Assigns a "Beat Frequency" (Dialogue vs. Action ratio) to scenes.
* **Data & Dice:** Background probability for physical failure (e.g., gun jams) injecting non-deterministic "evidentiary shocks."

---

### **ENGINE 4: REVEAL ARCHITECTURE (The Illusion Engine)**

**4.1. Reveal Objects & Interweaving**
Manages concurrent secrets via `active_threads`, interweaving setup seeds for Thread B during the prestige of Thread A.

**4.2. Plan-Based Suspense (Dramatis Model)**
Suspense is calculated as the inverse of the probability of available escape nodes in the agent's Goal DAG. $P(Escape) = 0$ triggers a **Dread State**.

**4.3. Chekhov's Gun Auditing**
SQL audits setup propositions. If unresolved, the DirectorNode forces a contextual injection.

---

### **ENGINE 5: NARRATIVE COMPILER (Script Bridge)**

**5.1. Syuzhet Reconstruction & Elastic Time**
Groups actions by **Reveal Impact**. Decouples simulation ticks from chronological time (supports montages vs. real-time).

**5.2. 2-Stage DSR & The Narrator Agent**

* **Stage 1:** Private Reasoning.
* **Stage 2:** Focalized Public Action.
* **Narrator Agent:** Isolated LLM call writes action lines based on **World Truth (Layer 0)** and **Spatial LCS**.
* **Causal Invariance [WASF 2026]:** Symbolic "Fact Extractor" rejects prose that contradicts the SQL World State.

**5.3. Cinematic Orchestration**

* **DeepShot 2026:** Suggested shot lists (ECU, Wide, etc.) based on Tension Vectors.
* **Match-Cut Sequencer:** Finds thematic/visual anchors between scenes for professional transitions.
* **Artifact Generator (Omni-Replica):** Generates synthetic PDF receipts, logs, or forgeries with Merkle-DAG provenance.

---

### **ENGINE 6: SOCIOLOGICAL & THEMATIC ENFORCERS**

**6.1. Institution & Coalition Logic [AAMAS 2026]**
Calculates **Coalition Equilibrium** for groups sharing secrets. Audits the cost of betrayal vs. group stability.

**6.2. 5-Turn Auditor & Fidelity [Zhong 2024]**
Audits chronological consistency. **Explanation Fidelity** checks logical entailment between `Reasoning` and `Tactic`.

**6.3. Representational Justice Gate**
Applies a "Trope Penalty" to ToT scores that rely on lazy stereotypes, forcing subversive tactical selection.

---

### **ENGINE 7: THE WRITER COCKPIT (Control Logic)**

**7.1. Initialization & Inactivity**

* **JEPA Seeding:** Logline-to-Matrix world inference.
* **Proactive Play:** Director forces agents to `PROBE` or `ESCALATE` against the writer if input stalls.

**7.2. Analytics & Visualizations**

* **FocalLens Interaction Matrix:** Tracks Who Sees vs. Who Participates for every beat.
* **Shannon Entropy:** Tracks belief dispersion; high entropy triggers a `CONVERGENCE` beat.
* **Auto-Pivot Detection:** Flags Tension zero-crossings for What-If branching.

---

### **9. MASTER SQL SCHEMAS**

```sql
-- Epistemic & Social World (S3AP)
CREATE TABLE epistemic_matrix (
  observer_id TEXT, subject_id TEXT, prop_hash TEXT, depth INT, 
  confidence REAL, source_weight REAL, layer TEXT, 
  source_origin_id TEXT, vector_clock INT
);
CREATE TABLE s3ap_tuples (
  turn_idx INT PRIMARY KEY, env_hash TEXT, action_tuple TEXT, mental_state_diff TEXT
);

-- Cognition, Goals, & Somatic
CREATE TABLE goal_nodes (
  id TEXT PRIMARY KEY, agent_id TEXT, horizon TEXT, 
  utility REAL, progress REAL, pressure REAL, status TEXT
);
CREATE TABLE somatic_states (
  agent_id TEXT PRIMARY KEY, fatigue REAL, adrenaline REAL, 
  impairment REAL, judgment_multiplier REAL
);
CREATE TABLE competency_graph (
  agent_id TEXT, skill_node TEXT, proficiency REAL, PRIMARY KEY(agent_id, skill_node)
);

-- World Persistence & Technical (Catalog Logic)
CREATE TABLE prop_registry (
  id TEXT PRIMARY KEY, location_id TEXT, current_state TEXT, owner_id TEXT
);
CREATE TABLE asset_dependencies (
  parent_id TEXT, required_child_type TEXT, is_connected BOOLEAN
);
CREATE TABLE spatial_coordinates (
  node_id TEXT PRIMARY KEY, location_id TEXT, pos_x REAL, pos_y REAL, pos_z REAL
);

-- Director & Narrative Pacing
CREATE TABLE dm_action_log (
  id TEXT PRIMARY KEY, turn INT, active_thread TEXT, system_move TEXT, 
  expected_tension_delta REAL, pacing_density TEXT
);
CREATE TABLE chekhov_guns (
  setup_prop TEXT, payoff_action_id TEXT, turns_limit INT, resolved BOOLEAN
);

-- Artifacts & Provenance (Omni-Replica)
CREATE TABLE artifact_registry (
  id TEXT PRIMARY KEY, origin_action_id TEXT, merkle_hash TEXT, file_path TEXT
);

```

---

### **10. EMPIRICAL VALIDATION PROTOCOL**

* **Asymmetry Integrity:** 0 belief inversions (100% monotonicity).
* **Invariance Check:** 0 prose-to-SQL contradictions.
* **Beat Segmentation:** Boundary F1 Score $\ge 0.75$.
* **Batching Fidelity:** Mean Dynamic Time Warping (DTW) $< 0.15$.