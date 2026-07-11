# Making Sense of the StoryMachine Research Archive

*A consolidated read of all 49 files (~71,000 lines of markdown + 16 Word documents + 1 PDF + 1 .skill bundle). What it adds up to, where it agrees, where it doesn't, and what's actually here.*

---

## 1. What This Archive Is

You have been building, in fragments, a single thing: a **neuro-symbolic drama engine** for screenplay generation, plus a **writer's IDE** ("ScriptIDE") that exposes its internals to a human author. Across the archive, the project is named **STORYMACHINE** and the IDE layer is **ScriptIDE**. The 49 files are not 49 different projects. They are at least **seven parallel research tracks** trying to specify the same system, each from a different vantage and at a different level of finish.

The archive is what it looks like when the same architecture gets re-derived eight different ways by eight different research passes — most of the disagreement is vocabulary and emphasis, not substance.

---

## 2. The Seven Parallel Tracks

### Track A — The V-Series (V2.0 → V4)
Eight "version" files that pretend to be a single evolving spec but actually represent five different attempted consolidations.

| File | Internal Title | Top-Level Shape | What It Adds |
|---|---|---|---|
| `STORYMACHINE_V2.0__THE_ASYMMETRY_ENGINE.md` | "V2.0 Asymmetry Engine" | 4 engines, 9 PARTS | Founding charter. Asymmetry Matrix, DEL, BDI DAGs, 5-Feature Tension (Copeland), DiriGent steering, Cognitive Dissonance (Festinger), PAL, AGM, MemRAG, BeliefNest, PLOTTER, DSR, Helium batching. |
| `STORYMACHINE_V2.1__Complete_15-Pillar_Architecture.md` | "V2.0 — 15-Pillar" | **15 pillars** | Sprawl pass. Adds Social Physics, CMAG governance, CRAFT theme critic, Genre, StyloMetrix voice, Multi-modal, Inverse Bridge (reverse compilation), Economic mgmt (Helium+Halo), Multi-user, Play mode. JEPA seeding, Narrator Agent, Data & Dice, ArticyXImporter. Neon Green / Deep Black UX. |
| `STORYMACHINE_V2.1__..._Implementation_Specification.md` | Same as above, plus impl | 15 pillars + SQL | Formalizes Pillar 6 as **2D Agency/Communion Interpersonal Circumplex** with tactical-palette blocking. StyloMetrix cosine ≥ 0.75. 4-step Inverse Bridge with retroactive AGM rollback. |
| `STORYMACHINE_V3.0__AI-Native_Computational_Dramaturgy.md` | "V3.0 /Godmode" | 7 pillars (I-VII) | First consolidation. Adds **3-Horizon agents** (Tactical/Strategic/Existential), **Tree of Thoughts** (Yao 2023), `Subtext = Internal_Reasoning − Public_Action`, contradiction_graph SQL. Drops 10 of the V2.1 pillars. |
| `STORYMACHINE_V3.5__ERNIE_THE_MASTER_BLUEPRINT.md` | "V3.5 Patched Architecture" | 6 engines + 5 patches (P0-P2) | First TypeScript. The "5 missing pieces": Pacing Controller (Guan 2024), Outline Conditioning (Rashkin 2024), ToM² PAL (Kosinski + Rescher), Narrative Consistency Checker (Zhong 2024), Dynamic Persuasion (Li 2024). Memory Stream + Reflection (Park 2023) enters here. |
| `STORYMACHINE_V3.9___THE_COMPLETE_MASTER_BLUEPRINT.md` | "V3.5 Complete Master" (filename V3.9) | 6 engines + 15 patches | Maximalist explosion. Full TypeScript type system, 10-table SQL, 25-type intervention union, ASCII Writer Cockpit dashboard, 6-week roadmap. Gervás-2014 tension reformulation. Bluff Detection added. The densest design document in the archive. |
| `STORYMACHINE_V4_MASTER_GOOGLE.md` | "V4 Master Systems" | **3 axioms + 7 engines** | Radical re-base. Adds an entire **world-physics layer**: S³AP tuples (Hoque 2026), Subconscious Layer −1, Patient Zero epistemic genealogy, prop state-machines, asset dependency graphs, 3D Spatial LCS, Sonic Occlusion, G-KMS Lorebook, Somatic State (fatigue/adrenaline), Lie Load (Sarkadi 2019), Pexelle Competency Graphs, Performance Masking, PEDS gating, Commitment Ledger, TTD-MDPs, RhythmSync, Dramatis P(escape)=0 dread, Chekhov SQL audit, Causal Invariance Fact Extractor (WASF 2026), DeepShot cinematography, Match-Cut Sequencer, Omni-Replica forgery generator, Coalition Equilibrium (AAMAS 2026), Representational Justice gate, FocalLens, Shannon-entropy convergence. **Drops** most named V3.5 patches in favor of axiomatic framing. Cites 2026 papers. |
| `STORYMACHINE_V_beta__LARGE_ERNIE_BLUEPRINT.md` | "STORYMACHINE v2.5" (parallel branch) | **9 engines** | Parallel maximalist universe. Promotes **Dialogue**, **Spatial/Embodiment**, **Theme/Motif**, and **Genre/Moral/Humor** to first-class engines. Adds humanities citations missing from V3.x/V4: Labov 1972 (idiolect), Hall 1966 (proxemics), Campbell 1949 (symbols), Kohlberg 1981 (moral stages), Attardo 1994 (humor), Neale 1980 (genre), McKee 1997 (scene purpose / orphan detection), Genette 1980 (non-linear timeline: analepsis/prolepsis/parallel/reverse/loop), Gottman 1994 (relationships). Most build-ready file in the archive: 24+ SQL tables, ~22 TypeScript engine classes, complete API surface. Adds AI Test Reader, Hook & Ending Generator (5 types), Cross-Media / Collab Engine. |

**Read in order, the V-series shows the architecture moving through five mood swings:** founding (V2.0) → sprawl (V2.1: 15 pillars) → consolidation (V3.0: 7 pillars) → patching (V3.5: 5 named patches) → maximalist patching (V3.9: 15 patches, full code) → ontological re-base (V4: 7 engines + 3 axioms with world-physics) — while in parallel a "v2.5 / Ernie" track stayed at 9 engines and accumulated the humanities lineage.

### Track B — Third-Party AI Research Reports
Ten files that look like outputs of "ask another AI to research this": Google/Gemini, ChatGPT (three versions), Sonnet, "Ernie", a "Filling Every Gap" deep dive, and a generic deep-research report.

- `AI Drama Engine Upgrade GOOGLE Research.md` — Gemini's clean 6-section architecture map. Strong on **DiriGent cognitive tension steering** and the **PLOTTER** framework for fabula → syuzhet.
- `DRAMA_MANAGER_GPT-research-report.md` — ChatGPT's 13-section paper on turning DirectorNode into a Drama Manager. Best concise definition of "drama manager as monitor-decide-act loop" (Façade lineage).
- `STORYMACHINE_RESEARCH__CHATGPT.md` / `__CHATGPT1.md` / `__CHATGPT12.md` — Three ChatGPT iterations producing literature maps + phased roadmaps.
- `STORYMACHINE_Drama_Engine_Research_SONNET.md` — **The single most build-ready single-file spec in the archive.** 1,615 lines, full SQL schema (15+ tables), per-engine implementation, validation experiments table, cost model, 30-week roadmap, explicit "moat" analysis. If only one file in this archive were going to survive, this is the one a competent engineer could rebuild from.
- `STORYMACHINE__MIXED_RESEARCH.md` — 444KB, 14,380 lines. The raw brainstorm dump that fed V2 onward. Includes the original "5 failures" framing (Tension Fallacy, Goal Stack Trap, Subtext Gap, Fabula Trap) and the verified-citation table that became V3's research grounding.
- `Filling_Every_Gap_research_StoryMachine.md` — 2,588 lines structured as 10 "PARTS" + per-section gap fills (Sections 1-31). Includes formal definitions for **Beat**, **Canon**, **Dramatic Question**, **Polarity**, **Tension**, **Arc**, **Retcon**, **Subtext**, **Storylet**.
- `deep-research-report.md` — duplicate of `STORYMACHINE_RESEARCH__CHATGPT12.md` (identical md5 hash).
- `storymachine_research_report.md` — "TIER 1 must-build / TIER 2 high-impact / TIER 3 differentiators" priority matrix. Names **FactTrack, SCORE, Relationship Graph, IBSEN objective completion, Polti situation classifier, Plot Diversity Engine ("Echoes in AI"), Suspense Engineering escape routes, StoryVerse abstract acts, ASE+EASM metrics**.

### Track C — Audit + Continuation + Upgrade Chain
Eight documents that read as a single project log: audit → fix → re-audit → integrate → continue.

- `storymachine_audit.md` — 53 issues across M0-M8 milestones (11 critical, 14 major, 13 minor, 15 recommendations). Most surgical document. Catches that:
  - `propositionsContradict()` is a regex stub that catches almost nothing
  - AGM revision matches by exact string — never matches real LLM output
  - "Copeland 2024" tension citation **doesn't actually exist** (weights are invented)
  - Real cost is ~25-30 calls/round, not the claimed 11
  - M8.2's "ToT" is NOT Tree of Thoughts, it's a scoring table
  - Recommends inserting **M1.5 integration test harness** before M2 because "11 critical bugs can silently produce zero output"

- `v35_integration_plan.md` — Comparative audit of V3.5 against the M0-M8 plan. Citation integrity audit: **3 of 13 V3.5 citations fabricated, 5 misrepresented, only 5 clean**. Rejects: full CICERO piKL, `embedded_vector BLOB`, "Akoury 2024 Auto-Pivot." Accepts: Pacing Controller, per-turn beat conditioning, target-aware persuasion, visibilityModel, public_announcements table, lightweight CICERO intent.

- `storymachine_master_upgrade.md` — 10 research-validated upgrade domains. Best single map of what 2025-2026 papers actually contribute. Names: Utopian Illusion (arXiv 2510.21180), EvolvTrip (arXiv 2506.13641), TOMA (arXiv 2509.22887), Agentic RAG, Drama Llama (arXiv 2501.09099), HoLLMwood Editor (arXiv 2406.11683), ASP-Guided generation (arXiv 2406.00554), Constella (arXiv 2507.05820), CORRPUS code-world-model, Quality-Diversity.

- `storymachine_prompts.md` — Production-ready library of 10 numbered prompts (System, Per-Turn Agent Action, Epistemic Batch Update, OCC Appraisal, Consistency Checker, Memory Importance, Reflection, Contradiction Detection, Tactic Deliberation ToT-lite, Director Evaluation). Implements U-shaped attention (Liu 2024), Anthropic 2023 "THE MOST IMPORTANT CONSTRAINT" trick, 12 tactic IDs, full `TurnContext` interface.

- `storymachine_continuation.md` — 941 lines. Cross-document audit of the prior 5 docs (17 unresolved/contradiction/superseded items) + 8 new research upgrades (xMemory, Emotional RAG, PCL Role Chain, R² Causal Plot Graph, Plug-and-Play Dramaturge, Causal Graph backbone, FilmAgent Cinematographer, Deep Persona Prompting). Provides 8-week build order.

- `storymachine_continuation_2.md` — Adds 7 more research domains: **Character Voice Architecture** (StyleChat — kills the "every character sounds the same" problem), **MCTS Branching**, **Coalition Formation**, **Branch-and-Bottleneck**, **Simulate-then-Rewrite**, **WhatELSE bidirectional outline-instance**, **Production Architecture** (structured logging, cost telemetry, graceful degradation, session persistence).

- `ULTRAPLAN_NarrativeAgent_2026.md` — 8-week Python-pseudocode roadmap. **5-layer architecture**: Symbolic Backbone → Character Substrate → Agent Runtime → Production Refinement → Output Surface. 16 papers each mapped to concrete code. Tech stack: Mem0 + Neo4j + Qdrant + Claude Sonnet/Haiku + Clingo ASP + LangChain.

- `StoryMachine_DeepResearch_Synthesis.md` — **The outlier.** Uses a fundamentally different vocabulary (proof kernel, mechanisms, "central law"). Builds around a **3-tier proof system**: Tier 1 Hard Blocks (TemporalProof, CausalProof, EpistemicProof, MechanismProof), Tier 2 Quality Gates (IntentProof, EmotionProof, GenericnessProof, CulturalCausalityProof, AuthorIntentProof), Tier 3 Ranking Signals (ReaderProof, VoiceConsistencyProof). Includes the **EMA 6-step emotion pipeline** (appraise → select → intensify → cope → govern → mask), **MAP-Elites portfolio generation**, **8-technique SubtextLayer**, **MINSTREL TRAM** for myth-template variation. Proposes **PostgreSQL + Apache AGE** as DB instead of SQLite. The seed-story walkthrough (Nora + recipe book) is the clearest end-to-end mechanism-proof example in the archive.

### Track D — MIMO / ScriptIDE Logic Engine
Two huge files (10K + 21K lines) that read as the user re-asking a deep-research model to expand the engine, then to expand again.

- `StoryMachine___ScriptIDE_Logic_Engine__MIMO.md` (9,922 lines / 569KB) — Twelve numbered Parts, organized as a deep theoretical foundation. The most important sections:
  - **Part I: The Externalization Thesis** — Grounds the entire architecture in the April 2026 Externalization survey. The four dimensions (Memory / Skills / Protocols / Harness) each map to a StoryMachine subsystem. The thesis: *"Your StoryMachine transforms the intractable problem of 'generate a coherent 120-page screenplay' into the tractable problem of 'maintain a versioned world model, satisfy typed constraints, and compile state transitions into formatted prose.'"*
  - **Part II: The Causal Foundation** — Pearl's ladder in narrative context. **CLadder** empirically shows LLMs fail at intervention (rung 2) and counterfactual (rung 3). **RE-IMAGINE** confirms via symbolic variations. **Shadow-Loom** is the architectural answer: LLMs at the boundary (extraction, rendering, audit), typed-code reasoning over a versioned graph. Three-check rejection: causal propagation, counterfactual consistency, audit pass. Dual physics: causal (Pearl's do-calculus) + narrative (mystery/irony/suspense/surprise scoring).
  - **Part III: Memory Architecture Beyond HiMem** — HiMem's hierarchical memory with topic-aware segmentation + conflict-aware reconsolidation. xMemory's insight: *"agent memory is a bounded, coherent stream with highly correlated spans that are often duplicates"* — RAG is the wrong shape.
  - **Part IV: Consistency Engine — ConStory-Bench Deep Integration** — The full 19-subtype taxonomy of consistency errors. ConStory-Checker pipeline.
  - **Part V: Formal Foundations** (the most novel part of this file) — Eight formal frameworks applied to narrative:
    - **5.1 Event Calculus** (Kowalski-Sergot 1986, Shanahan 1997): Fluents, Events, Initiates/Terminates/HoldsAt, inertia, frame problem. Event-sourced architecture for perfect rollback.
    - **5.2 Allen's Interval Algebra** (1983): 13 temporal relations. Used to detect temporal contradictions via transitive constraint propagation.
    - **5.3 Dynamic Epistemic Logic (DEL)** (Baltag & Moss 2004): Kripke models, action models, public/private announcement, misdirection. Knowledge hierarchy: Unknown → Suspected → Believed → Known.
    - **5.4 Type Theory for Narrative Safety**: Dependent types where event preconditions and effects are type-level constraints. "Shoot John when John is already dead → type error."
    - **5.5 Game Theory**: Normal-form games per scene, Bayesian games for hidden information, mechanism design for scene structure.
    - **5.6 Information Theory for Reveals**: Shannon entropy. Reveal sweet spot = 40-70% audience expectation. Red herring entropy.
    - **5.7 Graph Grammars** (Rozenberg 1997): Story structure as context-free grammar with genre-specific rules.
    - **5.8 Process Algebras** (CSP/CCS/π-calculus): Concurrent plotlines with synchronization at crossover scenes.
  - **Part VI: Multi-Agent Architecture** — Eight specialized agents: Planner (HTN+MCTS), Director (macro), World (state authority), Character (BDI per character), Reveal (secret tracker), Compiler (graph↔Fountain), Consistency Auditor, Evaluation Engine. Typed message protocol between agents.
  - **Parts VII-X**: Compiler pipeline, evaluation, ScriptIDE design, tech stack.
  - **Parts 1-32 (second half)**: A complete "narrative theory map" by 32 thematic sections (Core narrative theory, Story logic primitives, Narrative planning, Causal story graphs, World-state engine, Long-form consistency, Character cognition, ToM, Epistemic engine, Memory substrate, Emotional intelligence, Relationship engine, Drama manager, Reveal engine, Scene engine, Dialogue/subtext, Theme, Genre, Multi-agent simulation, Deliberative reasoning, Narrative compiler, ScriptIDE intelligence, Co-creative UI, Evaluation engine, Data/datasets, Knowledge representation, Neuro-symbolic, LLM orchestration, Multimodal, Production architecture, Safety/rights/ethics, Specific papers).

- `MIMOchat_StoryMachine___ScriptIDE_Logic_Engine_.md` (21,441 lines / 947KB) — The biggest file in the archive. First half repeats MIMO ScriptIDE's 32-theme structure. Second half adds **45 numbered "engines"** that read as the user's eventual unified spec:
  1. Core platform primitives (`Story`, `Project`, `NarrativeState`, `StoryCommit`, etc.)
  2. Event-sourced canon ledger (StoryCommit + branching + merge + diff + undo)
  3. Temporal Fact Engine (FactTrack-style)
  4. Character Mind Engine (BDI + ToM)
  5. Belief / Epistemic Engine
  6. Emotion Appraisal + Governance Engine (6.1 Appraisal, 6.2 Governance)
  7. Narrative Mechanism Compiler
  8. Object-State Arc Engine
  9. Ritual Protocol Engine
  10. Legitimacy Split Engine
  11. Antagonist Function Splitter
  12. Ability-as-Psychology Engine
  13. Public / Private Identity Loop
  14. Climax Proof Engine
  15. Witness Conversion Engine
  16. False Dream / Anti-Goal Engine
  17. Micro-Sensation Memory Engine
  18. Cultural Causality Engine
  19. Relationship Externalization Engine
  20. Canon Conflict / Rebellion Engine
  21. Myth Template Variation Engine
  22. Rule / Loophole / Cost Engine
  23. Reframed Memory Engine
  24. Tonal Contrast Sequencer
  25. Family System Engine
  26. Expressive Medium Engine
  27. Ending Proof Engine
  28. Narrative Proof Kernel
  29. Mechanism Proof
  30. Candidate Transition Generator
  31. Selection Intelligence Engine
  32. Genericness Detector
  33. Reader-State Simulator
  34. Scene-as-Mechanism Planner
  35. Scene Discourse / RST Composer
  36. Spatial-Cinematic Proof Engine
  37. Screenplay Renderer
  38. Voice Renderer
  39. Narrative CI/CD
  40. Explainable Creative UI
  41. Memory Routing Layer
  42. Provenance Ledger
  43. Synthetic Benchmark Factory
  44. Database tables
  45. API endpoints

  This 45-engine list is **the most expansive enumeration of subsystems in the whole archive**. It is also where the central law gets stated most cleanly:

  > "Do **not** build 25 disconnected engines. Build **one Narrative Mechanism OS** whose central law is: `theme → mechanism → rule → object/body/ritual → cost → witness → irreversible proof → scene`."

### Track E — Chat Exports / Compiled Responses
Three files that are exports of conversation history.

- `storymachine_chat_responses_compiled.md` (1,866 lines) and `storymachine_all_accessible_assistant_responses.md` (1,874 lines) — Near-duplicates. Both contain a complete **Dialogue Engine spec** organized as:
  1. Audit verdict on prior dialogue work
  2. The real architecture: Dialogue as state transition (DialogueTurn as atomic unit)
  3. The corrected Dialogue Compiler
  4. Per-script teaching using a small set of canonical animated reference films — each teaches a different dialogue principle
  5. The 7 dialogue validators (mechanism relevance / voice-swap / subtext gap / knowledge / state-change / exposition laundering / response-chain)
  6. The 5-step training plan to teach an AI "the way"
  7. The Dialogue Intelligence Layer + generation algorithm
  8. The full evaluation suite (5 tests: function classification / masked line replacement / bad-line repair / voice attribution / state delta proof)
  9. The final corrected law of dialogue

  The second half of both files is a **50+ source annotated bibliography** organized into 12 categories (Foundational structure / Studio methodology / Character architecture / Object & motif / Tone & voice / Sensory translation / Embedded narratives / Anthropomorphism / Institutional worlds / Emotional design / Commodification / Additional craft), each source mapped to an Engine Upgrade.

- `StoryMachine_GPT_chat.md` (3,393 lines) — Long ChatGPT thread covering similar ground.

### Track F — Word Documents (Reference-Film Reverse-Engineering)
Sixteen .docx files. Most are duplicates of one another (`AI_StoryMachine_Complete_Report.docx` byte-equals `deepandintensiv.docx`; `StoryMachine___ScriptIDE_Ernie.docx` equals `researchandmake.docx`). Their unique content is a **page-by-page reverse-engineering of seven canonical animated screenplays**.

For each film, the analysis extracts: **Core Question**, **Structure**, **Revelation Trigger**, **Emotional Payload**, and a per-page table of (Text → What It Actually Does → Engine Component).

The pattern: each film is broken into ~10–13 page ranges; each range gets tagged with the dramaturgical function it serves (Theme Injection, Sacred Object Setup, Emotional Compression / Show Don't Tell, Wound + False Dream, Companion as Wound Mirror, Thesis Statement, Antagonist as Dark Mirror, Escalation, Wound Activation, All Is Lost, Silent Climax + Earned Revelation, Letting Go as Resolution, Thematic Closure).

The point of this corpus is **validation by canonical screenplay**. Every architectural claim in the engine (Sacred Object, Companion as Wound Mirror, Antagonist as Dark Mirror, Silent Climax, Sensory Proof, Theme Verbalization Moment, Bittersweet Victory) is anchored to a specific beat in an existing film that already executes it. The .docx files were intended to demonstrate that the engine is not inventing new structures — it is encoding what already works in produced screenplays. *(Note: for shipping, replace this corpus with public-domain or original-IP reference scripts; the validation pattern is sound but the specific reference set should not be carried into the production codebase.)*

- `compare_u002fco.docx` is the only .docx with substantively unique content: a **gap analysis comparing MIMOchat's principles against StoryMachine v3.0** — 20-row table flagging what MIMOchat had that v3.0 didn't (ToM in agents, DEL, BDI nested beliefs, stereotype debiasing, pragmatic language, tool-calling, think-aloud protocols, AI awareness dimensions, Flash-Loom hybrid, CoT-in-context, controller-actor decomp, Scone social reasoning, Event Calculus, argumentation theory, graph grammars, process algebras, multimodal). This is the document that motivated the V3.0 → V3.5 jump.

### Track G — Autoresearch Playbook PDF + Film Director .skill
Two outlier files that approach the problem from a completely different direction.

- `The Autoresearch Playbook...pdf` (19 pages, 5,038 words) — Adapts **Andrej Karpathy's `autoresearch`** framework (autonomous AI experiment loop with single modifiable file + fixed budget + scalar metric + full autonomy) to creative narrative generation. The central innovation is replacing `val_bpb` (validation bits per byte) with a **composite `narrative_score`**:

  ```
  narrative_score = w1·C + w2·S − w3·D
  
  where:
    C = constraint compliance score (McKee value turns, Hitchcock suspense, etc.)
    S = embedding similarity to reference beats (alignment with creative vision)
    D = diversity index (homogenization penalty)
  ```

  Three-file contract:
  - `prepare.py` — **immutable** Story Bible (reference embeddings, constraint validators, `evaluate_narrative()`)
  - `train.py` — **mutable** creative engine (the only file the agent can modify; exposes prompt/temperature/critique-pass/weights as top-level parameters)
  - `program.md` — human strategy guide (Setup, Experimentation, Output, Experiment Loop)

  The PDF also describes **distillation patterns** for adapting heavy concepts into loop-compatible components:
  - TRIBE v2 multimodal → text embedding similarity to high-engagement reference corpus
  - Hybrid Emotional Engine (VAD tensors) → keyword-based valence approximation + heuristic pacing
  - RNE adversarial critic → parameterized "Skeptic Pass" in train.py
  - FOST Armature → immutable thesis vector in prepare.py

  The PDF explicitly references **Armenian context** and the **Future Son twist** as automatic-discard hard gates — i.e., this is set up to optimize a specific GOOB-related story.

- `film-director-ars-research.skill` (ZIP bundle, 6 files, 32KB) — A reusable Claude skill for researching film directors. Uses an **Adversarial Recursive Synthesis (ARS) Framework** with **11 parallel research streams** where Stream 11 is "The Iconoclast" (adversarial validator hunting contradictions). Output is a **three-layer Aristotelian structure**:
  - Layer 1: Ground Truth (immutable facts, axioms, productive contradictions)
  - Layer 2: Generative Mechanics (decision trees, process workflows, weighted criteria)
  - Layer 3: Edge Cases (pattern violations, adaptive responses, creative evolution)
  
  Six JSON-LD schemas (FormativeExperience, PhilosophicalAxiom, ProductiveContradiction, DirectorDecisionRule, DirectorCreativeProcess, PatternViolation) encode all findings. The deliverable is a 20,000-30,000 word "Cognitive Operating System Document" + 30-50 JSON-LD rule corpus + Iconoclast Validation Report. This skill is the user's pattern for capturing **how a master craftsman thinks**, in a form an AI can actually execute.

---

## 3. The Spine That Connects All Seven Tracks

Despite the surface chaos, every track reaches the same destination. Here is the unbroken spine:

### 3.1 The Central Thesis
**Pure LLM generation is locally fluent and globally incoherent.** Every track says this, and most cite the same evidence (P1's "Can LLMs Generate Good Stories?" arXiv 2506.10161 — 78% of LLM stories lack causal linkage, 65% suffer intentionality collapse, 72% have conflict atrophy). The corollary every track endorses: **add a symbolic harness around the LLM, not a bigger LLM.**

Or, in the MIMO ScriptIDE wording:
> *"Your StoryMachine transforms the intractable problem of 'generate a coherent 120-page screenplay' into the tractable problem of 'maintain a versioned world model, satisfy typed constraints, and compile state transitions into formatted prose.'"*

### 3.2 The Architecture Pattern
**LLMs at the boundary, typed code in the core.** This is "Shadow-Loom architecture" in MIMO, "harness era" in MIMOchat, "neuro-symbolic hybrid" in Sonnet, the "3 axioms + 7 engines" of V4, the "9-engine model" of V_beta, the "6 engines + 15 patches" of V3.9. Same shape:

```
                  ┌────────── HARNESS LAYER ──────────┐
                  │  Drama Manager · Auditor · Eval   │
                  └───────────────┬───────────────────┘
                                  │
                  ┌───────────────┴───────────────────┐
                  │       ORCHESTRATION BUS           │
                  │   (typed messages, event source)  │
                  └─┬───────┬───────┬───────┬─────────┘
                    │       │       │       │
              ┌─────┴─┐ ┌──┴──┐ ┌──┴──┐ ┌──┴──────┐
              │Planner│ │World│ │Char │ │ Reveal  │
              │ Agent │ │Agent│ │Agent│ │  Agent  │
              └─────┬─┘ └──┬──┘ └──┬──┘ └──┬──────┘
                    │      │      │      │
                  ┌─┴──────┴──────┴──────┴──────────┐
                  │     SHARED MEMORY SUBSTRATE     │
                  │  Episodic · Semantic · Epistemic│
                  │  · Emotional · Structural       │
                  │   (versioned, event-sourced)    │
                  └──────────────┬──────────────────┘
                                 │
                  ┌──────────────┴──────────────────┐
                  │       LLM BOUNDARY LAYER        │
                  │  extract · render · score · audit│
                  └─────────────────────────────────┘
```

### 3.3 The Engine Inventory (Deduplicated Master List)
Every named subsystem across all 49 files folds into **23 functional engines**. The names differ by track, but the function is constant.

| # | Functional Engine | Common Names Across Archive | Citation Anchors |
|---|---|---|---|
| 1 | **World State / Canon Ledger** | World-State Engine, Event-sourced canon, NarrativeState, FactTrack, Temporal Fact Engine, Allen-temporal store | FactTrack (arXiv 2407.16347), Shanahan 1997 Event Calculus, Allen 1983 |
| 2 | **Character Cognition (BDI)** | Agent Cognition, Character Mind Engine, BDI DAG Goals, 3-Horizon agents, Memory Stream + Reflection | Bratman BDI, Park 2023 (UIST), Riedl 2024, Besta 2024 (Graph of Thoughts) |
| 3 | **Theory of Mind (Nested Beliefs)** | Asymmetry Matrix, ToM², PAL, visibilityModel, EvolvTrip ToM triples, TOMA | Kosinski 2023, Rescher 2006, EvolvTrip (arXiv 2506.13641), TOMA (arXiv 2509.22887) |
| 4 | **Epistemic Engine** | Belief layers, AGM revision, 4-realities, public_announcements, source reliability | AGM 1985, DEL (Baltag-Moss 2004), Fagin-Halpern-Moses-Vardi 1995, CICERO 2023 |
| 5 | **Memory Substrate** | xMemory, HiMem, Memory Stream, MemoryRouter, hybrid retrieval, three-level pyramid | xMemory (arXiv 2602.02007), HiMem (Jan 2026), Park 2023, EmotionalRAG (arXiv 2410.23041) |
| 6 | **Emotion Engine** | OCC emotion, EMA pipeline, Mood (PAD), emotion contagion | Ortony-Clore-Collins 1988, Gratch-Marsella EMA 2004/09, Weng 2024 (EmoAgent), Hatfield 1994 |
| 7 | **Relationship Engine** | Interpersonal Circumplex, CICERO trust, Coalition Tracker, Gottman relationship dynamics | Circumplex (Wiggins), CICERO 2023, Gottman 1994, AAMAS 2026 (Coalition Equilibrium) |
| 8 | **Drama Manager** | DirectorNode, Façade-style beat sequencer, Drama Llama storylets, IBSEN director, intervention vocabulary, leverage points | Façade (Mateas-Stern 2005), IBSEN (arXiv 2407.01093), Weyhrauch SBDM, Drama Llama (arXiv 2501.09099), Portonovo 2012 |
| 9 | **Tension Engine** | 5-Feature Tension, Gervás expectation-violation, Tension Vector Steering (DiriGent), TTD-MDPs | Gervás 2014, Copeland 2024 (unverified), Roberts TTD-MDPs, Cheong-Young suspense |
| 10 | **Pacing Controller** | Pacing Controller, RhythmSync, Snyder beats, monotony detection | Guan 2024 (NAACL) / actually CONCOCT-Yang 2023, Snyder 2005 |
| 11 | **Reveal / Illusion Engine** | Reveal Architecture, Shadow-Loom AMWNs, Per-Secret IllusionArc, Chekhov's Guns, Prestige Readiness | Truby 2007, Bordwell 1985, Hitchcock 1966, Sternberg 1990 (curiosity/suspense/surprise) |
| 12 | **Information Gap / Irony Tracker** | Dramatic Irony Tracker, Information Gap Tracker, four-realities knowledge tracker | Chatman 1978, Hitchcock 1966 |
| 13 | **Narrative Mechanism Compiler** | Mechanism Compiler, Central Law (`theme → mechanism → rule → object → cost → witness → proof → scene`), Causal Plot Graph, R² causal | IPOCL (Riedl-Young 2010), Façade Beat = Mechanism + Scene Plan, R² (arXiv 2503.15655), CausalCoT |
| 14 | **Scene Engine** | Scene-as-Mechanism Planner, Scene Purpose Classifier (McKee orphan detection), RST Composer, ABL | McKee 1997, ABL behavior language, RST (Mann-Thompson) |
| 15 | **Subtext Engine** | SubtextLayer (8 techniques), Subtext = Internal − Public, action-subtext pair generator | Grice 1975, Sperber-Wilson 1986, Pinter, "Beneath the Surface" 2026 subtext paper |
| 16 | **Dialogue Engine** | Idiolect Profiles (Labov), Voice compliance checker, dialogue state-transition compiler, 7 dialogue validators | Labov 1972, McKee 2016 Dialogue, StyleChat (arXiv 2403.11439) |
| 17 | **Voice / Stylometry** | StyleChat Style Thought Chain, StyloMetrix linter, quantitative VoiceProfile, voice divergence monitor | StyleChat, StyloMetrix, "LLM fingerprint" stylometry research |
| 18 | **Genre / Trope / Moral / Humor Engine** | Genre Rules (Neale), Trope Penalty (Representational Justice), TVTropes (27K patterns), Moral Alignment (Kohlberg), Humor (Attardo) | Neale 1980, Kohlberg 1981, Attardo 1994, TVTropes |
| 19 | **Theme / Premise Engine** | Theme Engine, Theme Critic CRAFT, Author Intent Proof, MoralArgument (claim+support+warrant), Yorke's 5-act, Coyne's obligatory scenes | Truby 2007, Egri 1946, Yorke 2013, Coyne 2015 |
| 20 | **Spatial / Embodiment / Cinematic Engine** | 3D Spatial LCS, Sonic Occlusion, Proxemics (Hall), DeepShot cinematography, FilmAgent Cinematographer, Match-Cut Sequencer | Hall 1966, FilmAgent (arXiv 2501.12909), DeepShot 2026, Genette 1980 (POV) |
| 21 | **Script Bridge / Narrative Compiler / Renderer** | Script Bridge, PLOTTER (fabula→syuzhet), 2-stage DSR + Dramaturge, Structured Fountain, Beat Annotator, syuzhet endpoint | Bordwell 1985, Dramatron, Genette 1980, Guan 2023 (ACL), Plug-and-Play Dramaturge (arXiv 2510.05188) |
| 22 | **Writer Cockpit / ScriptIDE** | Writer Cockpit, ScriptIDE, Director's Cut Mode, Harvest Mode, What-If Branching, Constella features, simulation health dashboard | Constella (arXiv 2507.05820), WhatELSE CHI 2025, DiaryPlay/Orchid CHI 2025, IBSEN human-in-loop |
| 23 | **Evaluation / CI / Provenance** | ASE+EASM, Multi-dimensional diagnostic dashboard, Narrative CI/CD, Provenance Ledger, AI Test Reader, Causal Invariance Fact Extractor | ASE+EASM metrics, ConStory-Bench (19 subtypes), WASF 2026 Causal Invariance, MAP-Elites (Mouret-Clune 2015) |

Beyond the 23 functional engines, the **45-engine MIMOchat list** introduces specialty subsystems that don't appear elsewhere: Ritual Protocol Engine, Legitimacy Split Engine, Antagonist Function Splitter, Ability-as-Psychology, Public/Private Identity Loop, Witness Conversion, False Dream / Anti-Goal, Micro-Sensation Memory, Cultural Causality, Relationship Externalization, Canon Conflict / Rebellion, Myth Template Variation (MINSTREL TRAM), Rule/Loophole/Cost, Reframed Memory, Tonal Contrast Sequencer, Family System Engine, Expressive Medium Engine, Ending Proof Engine. These are best read as **specific dramaturgical patterns** that the user wants the engine to be capable of, not as separate runtime subsystems — they're patterns that get composed from the 23 engines above.

### 3.4 The Three Axioms (from V4, restated)
1. **Tension = Vector Gap** between Ideal and Perceived state across (Intimacy, Power, Mystery).
2. **Knowledge = Asymmetry Matrix** of nested beliefs `K_a K_b P` to bounded depth.
3. **Subtext = Calculable Delta**: `Subtext = Internal_Reasoning − Public_Action`.

### 3.5 The Central Law (from MIMOchat)
```
theme → mechanism → rule → object/body/ritual → cost → witness → irreversible proof → scene
```
Every story beat must be traceable through this chain. If any link is missing, the scene is "narratively inert" (Meehan 1976, Riedl-Young 2010). The witness can be a person, an institution, or a belief system. The "irreversible proof" is what separates drama from incident.

### 3.6 The Three-Tier Proof Kernel (from Deep Research Synthesis)
- **Tier 1 (Hard Blocks — cannot ship if failing):** TemporalProof, CausalProof, EpistemicProof, MechanismProof
- **Tier 2 (Quality Gates — must pass for reader experience):** IntentProof, EmotionProof, GenericnessProof, CulturalCausalityProof, AuthorIntentProof
- **Tier 3 (Ranking Signals — used to choose among valid candidates):** ReaderProof, VoiceConsistencyProof

This is the most rigorous quality framework in the archive — *and it's the one written in a vocabulary almost orthogonal to the rest*. It is best understood as the **acceptance test contract** that V4's seven engines must collectively satisfy.

---

## 4. The Research Foundation (Master Citation Map)

Across all 49 files, ~120 distinct papers/systems are cited. Grouped by what they prove:

### 4.1 "LLMs alone can't do narrative" (the motivating evidence)
- P1 "Can LLMs Generate Good Stories?" (arXiv 2506.10161) — 78% causal vacuum
- CLadder (Pearl's ladder benchmark) — LLMs fail rungs 2-3
- RE-IMAGINE (symbolic variation reasoning)
- ConStory-Bench (arXiv 2603.05890) — 19 subtypes of long-form consistency error
- Lost in Stories — persona drift across long simulations
- Utopian Illusion (arXiv 2510.21180) — homogeneously positive output
- "Beneath the Surface" 2026 — LLMs systematically under-subtext
- Tian et al. 2024 EMNLP — LLMs can't self-assess suspense
- Matlin 2025 — LLM self-evaluation fails
- Selective Deficits in LLM Mental Self-Modeling (arXiv 2603.26089)

### 4.2 The Hybrid Architecture Validation
- P6 (hybrid LLM-as-heuristic + classical planner) — 60% search reduction
- Shadow-Loom (arXiv 2605.02475) — LLM-at-boundary + typed-code-in-core architecture
- HiMem — hierarchical memory beats flat top-k
- xMemory (arXiv 2602.02007) — RAG is the wrong shape for agent memory
- FactTrack (arXiv 2407.16347) — temporal validity intervals
- CORRPUS (arXiv 2212.10754) — code-based world model in prompts

### 4.3 Character Architecture
- Bratman 1987 BDI
- Park et al. 2023 (UIST) Generative Agents — Memory Stream + Reflection
- Riedl 2024 BDI architecture (cited as authority but year sometimes disputed)
- Besta 2024 (AAAI/ICLR) Graph of Thoughts — for DAG goal stacks
- Yao 2023 (NeurIPS) Tree of Thoughts — for tactical planning
- Festinger 1957 cognitive dissonance
- Ortony-Clore-Collins 1988 OCC emotion
- Gratch & Marsella 2004/2009 EMA appraisal pipeline
- Weng 2024 (EMNLP) EmoAgent + Hatfield 1994 emotional contagion
- EvolvTrip (arXiv 2506.13641) — temporal ToM knowledge graph
- TOMA (arXiv 2509.22887) — inference-time mental state hypotheses
- PCL Role Chain (ACL 2025 Findings)
- PsyPlay (Yang Feb 2025)
- Kosinski 2023 — ToM emerged in LLMs (contested by Sap 2022)

### 4.4 Knowledge / Epistemic
- AGM 1985 (Alchourrón-Gärdenfors-Makinson) belief revision postulates
- Rescher 2006 Public Announcement Logic
- Baltag & Moss 2004 Dynamic Epistemic Logic
- Fagin-Halpern-Moses-Vardi 1995 "Reasoning About Knowledge"
- CICERO 2023 (Meta AI, Science) — Diplomacy, trust modeling

### 4.5 Tension / Drama Management
- Mateas & Stern 2005 Façade — Beat sequencing as drama management
- Weyhrauch SBDM — drama manager as search
- Mateas-Nelson search-based drama management
- IBSEN (arXiv 2407.01093, ACL 2024) — director-actor framework
- Portonovo 2012 — tension derivative leverage points
- Gervás 2014 — tension as expectation violation
- Copeland 2024 5-feature tension — **citation unverified (likely fabricated)**
- Roberts TTD-MDPs — trajectory distributions
- DiriGent — cognitive tension steering
- Akoury 2024 (ICLR) Auto-Pivot — **citation unverified**
- Guan 2024 (NAACL) Pacing — actually CONCOCT-Yang 2023
- Rashkin "Outline Conditioning" — actually 2020 EMNLP + DOC 2023 (22.5% gain, not "60%")
- Drama Llama (arXiv 2501.09099) — natural-language beat triggers / storylets
- Cheong & Young 2006 / O'Neill & Riedl 2011-2014 — potential suspense
- Sternberg 1990 — curiosity / suspense / surprise triad

### 4.6 Narrative Compilation / Screenplay Theory
- Aristotle Poetics
- Field 1979 screenplay structure
- McKee 1997 Story — "the gap," scene purpose, dramatic question
- McKee 2016 Dialogue
- Snyder 2005 Save the Cat
- Truby 2007 Anatomy of Story
- Egri 1946 Art of Dramatic Writing
- Vogler Writer's Journey, Campbell 1949 Hero with a Thousand Faces
- Yorke 2013 Into the Woods (5-act model)
- Coyne 2015 Story Grid (obligatory scenes per genre)
- Bordwell 1985 Narration in Fiction Film — fabula vs syuzhet
- Genette 1980 — analepsis, prolepsis, focalization, parallel narration
- Chatman 1978 — story vs discourse, information gaps
- Booth, Tarkovsky, Sorkin (voice / tone)
- TALE-SPIN (Meehan 1977) — used as anti-pattern (what NOT to build)
- MINSTREL (Turner 1994) — Transform-Recall-Adapt
- IPOCL (Riedl-Young JAIR 2010)
- Dramatron, PLOTTER — fabula→syuzhet reconstruction
- Plug-and-Play Dramaturge (arXiv 2510.05188) — 3-stage refinement
- R² novel-to-screenplay (arXiv 2503.15655)
- HoLLMwood (arXiv 2406.11683) — editor agent
- FilmAgent (arXiv 2501.12909) — crew roles + Debate-Judge

### 4.7 Reveals / Information / Surprise
- Sternberg 1990 narrative surprise triad
- Information theory (Shannon entropy for reveal sweet spot 40-70%)
- Hitchcock 1966 dramatic irony
- TruBy 2007 reveal architecture
- Genette 1980 paralipsis/paralepsis
- Dramatis model — plan-based suspense, P(escape)=0 → dread

### 4.8 Multi-Agent / Coalitions
- IBSEN multi-actor framework
- Mimesis — social-norm-driven characters
- Drama Llama storylets
- HoLLMwood actor loop
- FilmAgent debate-judge pattern
- Coalition Formation (arXiv 2604.14386)
- Constella (arXiv 2507.05820) — ensemble character authoring
- Generative Agents (Park 2023)

### 4.9 Evaluation
- ASE+EASM metrics
- Reagan 2016 emotional arcs
- "All Stories Are One Story" (arXiv 2508.02132)
- EmotionalRAG (arXiv 2410.23041)
- LLM-as-judge (Zheng 2023 MT-Bench)
- StoryCloze, CoQA-style coherence metrics
- Quality-Diversity / MAP-Elites (Mouret-Clune 2015, Lehman 2024)
- Hofstede 2001 cultural dimensions

### 4.10 Constraints / Symbolic
- Glaive — constraint-based interactive fiction
- ASP-Guided generation (arXiv 2406.00554) — 15 narrative constraints, plot diversity
- Clingo (ASP solver)
- Allen 1983 Interval Algebra
- Event Calculus (Kowalski-Sergot 1986, Shanahan 1997)
- Type theory / dependent types
- Game theory (normal-form games per scene)
- Graph grammars (Rozenberg 1997)
- Process algebras (CSP/CCS/π-calculus)

### 4.11 Production Engineering
- LLM circuit breaker patterns
- Prompt caching tiered strategies (session / round / turn)
- Mem0, Neo4j + NetworkX, Qdrant
- LangChain, LangSmith
- PostgreSQL + Apache AGE (graph queries on relational)
- SSE streaming for long-running simulations
- WAL mode on SQLite
- U-shaped attention (Liu 2024)
- Anthropic 2023 "MOST IMPORTANT CONSTRAINT" trick

### 4.12 Tooling / Methodology Outliers
- Karpathy `autoresearch` — autonomous experiment loop (single modifiable file + scalar metric)
- Adversarial Recursive Synthesis (ARS) — 11-stream director research with iconoclast validator
- StyleChat Style Thought Chain (arXiv 2403.11439)
- MCTS Branch Explorer (Narrative Studio, arXiv 2504.02426, ACL 2025)
- WhatELSE bidirectional outline-instance (CHI 2025)
- DiaryPlay / Orchid branch-and-bottleneck (CHI 2025)
- Externalization Survey (April 2026) — the framing that says "agent harness > better model"

### 4.13 Where the Citations Break Down
The `v35_integration_plan.md` audit flagged that **3 of 13 V3.5 citations are fabricated** ("Akoury 2024 ICLR Auto-Pivot", "Copeland 2024 ACL 5-Feature Tension", "Guan 2024 NAACL Pacing Controller") and **5 are misrepresented** (Rashkin is 2020 EMNLP not 2024 ACL; the "60% coherence gain" is actually 22.5%; CICERO is mischaracterized as scalar; Kosinski ToM is contested; Riedl year off). The Sonnet research and audit docs treat Copeland weights as **tunable hyperparameters labeled with a fake citation for narrative authority** — this should be addressed honestly going forward.

---

## 5. The Reference-Film Validation Track (What the Scripts Prove)

The .docx files collectively make a single argument: **the engine isn't speculative. Every architectural component already exists in a produced film.** The reverse-engineerings ground the architecture in canonical executions of:

- **MechanismProof** (IPOCL) — events must operate a mechanism or are narratively inert
- **IntentProof** — character intentionality must be perceptible, stated by characters but must be inferred by the engine from behavior
- **SubtextLayer** — visual subtext (not just dialogue subtext) is how feeling actually gets carried; the SubtextLayer must operate on action, blocking, gesture, and silence, not just speech
- **EMA Emotion Pipeline** — appraise → select → intensify → cope → govern → mask is observable as the structure of certain animated films, particularly emotion-centric ones
- **Character Arc Engine** — the wound → false_resolution → dark_night → transformation 4-beat structure recurs universally in the reference set
- **Epistemic Engine** — the epistemic gap (what characters know vs what audience knows) IS the dramatic engine; DEL operators (public/private announcement, misdirection) map directly to canonical reveal moments
- **Memory Architecture** — memories function as typed retrievable objects in well-made narratives, validating xMemory's typed-query model
- **Scene Engine** — McKee's "the gap" between expectation and result is universal across the reference set
- **Theme Engine** — every great film is a moral argument structured as narrative (claim + support + warrant); the Theme Engine must generate and test this structure, not just label themes
- **Pacing Engine** — Cheong-Young suspense (P(bad outcome) × imminence × investment) is implementable; deadlines + escalating stakes are the operational form

The .docx track ends with a critical gap finding: **visual subtext, mechanism-as-metaphor, emotion-as-causal-driver, object-as-character-arc, and silence-as-dialogue** are five capabilities the engine MUST replicate that no current research paper directly addresses. The reference scripts prove they're necessary; the engine has to invent the mechanisms.

*(Note: for shipping, replace the proprietary reference set with public-domain or original-IP scripts; the validation pattern is sound, the specific corpus is not.)*

---

## 6. The Implementation Roadmap (Where Everything Converges)

Multiple docs propose multi-week build orders. When you stack them, they agree on a **clear convergence**:

### Week 0 — Engineering Foundation (all docs agree this is first)
- Agent order randomization (1 line, fixes primacy effect)
- WAL mode + synchronous=NORMAL on SQLite
- Friction mandate appended to epistemic prompt (kills Utopian Illusion)
- Session TTL eviction (30 min)
- SSE line accumulator (fixes brittle partial-chunk reads)
- LLM circuit breaker (5 failures → open 30s)
- `runAgentWithFallback` graceful degradation → deterministic SILENCE action
- Cost telemetry (`llm_call_log` table)
- Structured logging (`simulation_events` table)
- Session persistence (`sessions` table + `restoreActiveSessions` on boot)
- `_schema_version` table + `runMigrations()`
- **M1.5 Integration Test Harness** (per Audit recommendation — without this, 11 critical bugs silently produce zero output)

### Week 1 — Symbolic Ground Truth
- `world_state` table + `WorldStateTracker` (FactTrack pattern)
- `location_log` table with population in Orchestrator Phase 1
- `tom_triples` table (EvolvTrip) + generation
- `relationship_graph` + `relationship_events` tables
- `causal_graph` table + incremental linking (heuristic + LLM every 5 turns)
- `pivot_points` + `turn_snapshots` tables
- `snapshotTurn()` + `rollbackToTurn()` via SQLite backup
- Causal edge taxonomy (enables / prevents / motivates / requires / delays / escalates / de_escalates)
- Logical edge taxonomy (contradicts / entails / supports / undermines / reframes)
- Allen Interval Algebra (6 narrative-relevant temporal relations)
- `state_snapshots` every 20 events

### Week 2 — Memory + ToM
- xMemory 4-level hierarchy (raw → episodes → semantics → themes)
- `semantic_facts` + `memory_themes` tables
- `distillSemantics()` every 5 turns
- EmotionalRAG (sequential strategy: semantic-first then emotional re-rank)
- Hybrid retrieval scoring formula (0.35 keyword + 0.25 recency + 0.25 importance + 0.15 goal)
- Importance scoring batched with epistemic update
- Grounding check on reflections
- TOMA chain-of-thought ToM
- visibilityModel in ToM
- Higher-order ToM strategic exploitation

### Week 3 — Prompt Engineering
- PCL Role Chain 5-question scaffold (replace ad-hoc identity prompts)
- Streamlined identity anchor (attribute ordering by influence; remove low-trait Big Five)
- Contrastive persona hint on pressure > 0.8
- Code-based world state in prompt (CORRPUS pattern: `const worldState = {...}`)
- U-shape attention 15-section structure
- Output format stated twice (primacy + recency)
- Anthropic "THE MOST IMPORTANT CONSTRAINT" trick
- StyleChat Style Thought Chain (recite then respond)
- Quantitative VoiceProfile (targetAvgWordsPerSentence, forbiddenPatterns, syntaxSignature, allowedFillerWords)
- `checkVoiceCompliance()` post-generation with retry

### Week 4 — Director Intelligence
- PacingController (measureAndStore, getPacingOverride, monotony detection)
- Natural-language beat triggers (Drama Llama) — replace TypeScript preconditions
- ASP sequence constraints (15 rules: no repeat, REVEAL requires setup, mandatory COOLDOWN, etc.)
- BeatSequenceSolver lightweight ASP solver
- IBSEN objective completion check
- Emotional arc target curve (6 arc types: Rags-to-Riches, Tragedy, Man in Hole, Cinderella, Oedipus, Steady Fall)
- `getTargetTensionCurve()` per arc type
- `classifyEmotionalArc()` from valence array
- Polti situation classifier every 5 turns
- Sentiment watchdog (3+ rounds positive → APPLY_PRESSURE)
- Voice divergence monitor (`checkVoiceDivergence()` Director-level)
- Target-Aware Persuasion (`selectPersuasionStrategy` decision tree)

### Week 5 — Script Bridge Rebuild
- CausalPlotConstructor (R² Reader module) — sliding-window causal graph + cycle-breaking
- HallucinationAwareRefiner (HAR) — 2-iteration inconsistency detection
- CinematographerAgent (FilmAgent-inspired) — scene direction metadata
- DramaturgeAgent (Plug-and-Play, 3-stage: Global Review → Scene Review → Coordinated Revision)
- RewriteAgent (Simulate-then-Rewrite) — transforms raw simulation to polished Fountain
- EditorAgent (HoLLMwood) — strengths/weaknesses/missing beats review
- Causal graph-based scene segmentation
- Debate-Judge consistency pattern (FilmAgent)
- Syuzhet endpoint with 3 ordering suggestions (in medias res / classic 3-act / reveal-first/Columbo)
- Coalition Tracker (`coalitions` + `coalition_events` tables)
- Branch-and-Bottleneck (`bottleneck_turns` JSON + `enforceBottlenecks()` 5 turns ahead)

### Week 6 — Writer Cockpit
- xMemory context display
- Causal graph visualization
- Emotional arc target vs actual overlay
- Pivot markers with [Branch Here]
- Dramaturge notes panel
- Cinematography preview
- Pacing curve control panel
- Outline/beat panel with [Edit Beat] [Force Advance]
- Simulation Health warnings (flatness, dissonance, arc stall)
- Constella FRIENDS DISCOVERY / JOURNALS / COMMENTS panels
- "Creative Control" slider
- MCTS Branch Explorer (`/explore-branches` endpoint, UCT selection, K=3 expansions)
- WhatELSE bidirectional abstraction (`/abstract-scene` and `/instantiate-outline` endpoints)

### Week 7 — Evaluation + Regression
- ASE LLM-as-judge evaluation suite (coherence, empathy, surprise, engagement, emotional consistency, complexity)
- StructuralMetrics (arc match, tension variance, consistency errors, Polti diversity, beat diversity, tactic entropy, irony gaps, contradictions resolved, payoffs reached)
- Emotional arc measurement + classification
- Human calibration loop
- SimulationReplay + `runRegressionTest`
- Prompt version tracking (`prompt_versions` + `simulation_metadata`)
- Quality dashboard in Writer Cockpit
- Prompt caching tiered (session / round / turn)
- Parallel agent processing (4 phases)

### Beyond Week 7 — Specialist Engines (V_beta and V4 additions)
- **Dialogue Engine** with idiolect profiles, 7 dialogue validators, power-shift computation, subtext classification
- **Spatial / Embodiment Engine** — proximity (Hall 1966), body language, touch events, environment mood, cinematography
- **Theme / Motif Engine** — Truby spine, symbol tracking (Campbell)
- **Genre / Moral / Humor Engine** — Neale genre rules, Kohlberg moral alignment, Attardo humor classification
- **Cross-Media / Collab Engine** — `narrative_branches`, `narrative_versions`
- **AI Test Reader** (V_beta evaluator)
- **Hook & Ending Generator** (5 ending types)
- V4 world-physics: S³AP tuples, Subconscious Layer −1, prop state machines, asset dependency graphs, 3D spatial LCS, sonic occlusion, somatic state (fatigue/adrenaline), Lie Load, Pexelle competency graphs, performance masking, PEDS gating, Commitment Ledger, TTD-MDPs, RhythmSync, Dramatis P(escape)=0, Chekhov SQL audit, Causal Invariance Fact Extractor, DeepShot, Match-Cut, Omni-Replica forgery, Coalition Equilibrium, Representational Justice trope penalty, FocalLens, Shannon-entropy convergence

---

## 7. The Unresolved Contradictions

The continuation report flagged 16 substantive contradictions across the archive. The most important ones to resolve before more building:

### Conflict 1 — Architecture Vocabulary
The **Deep Research Synthesis** track uses an almost-orthogonal vocabulary (mechanism / proof / central law / portfolio / MAP-Elites / RecognitionAgent / ChoiceCost) from everything else (agent / belief / tactic / inference trace / DirectorNode / Drama Manager / Script Bridge). They are equivalent in spirit but require translation. **Recommendation:** treat the Synthesis as the **acceptance test contract** (Tier 1/2/3 proofs) for the engine specified in the M0-M8 vocabulary. They are not competing — they layer.

### Conflict 2 — Database Backend
Three different stacks proposed:
- **SQLite** (baseline in V2-V3.9, audit, continuations, prompts, V3.5 plan)
- **PostgreSQL + Apache AGE** (Synthesis: "ACID transactions are non-negotiable")
- **Mem0 + Neo4j + Qdrant** (ULTRAPLAN)

**Recommendation:** SQLite for the prototype phase (Weeks 0-4), migrate to PostgreSQL + AGE when state_snapshots and concurrent multi-user become real requirements. Neo4j only if the relationship graph operations become a profiled bottleneck.

### Conflict 3 — Tension Model
V2-V3.9 use **Copeland 2024 5-feature tension** (weights 0.31, 0.24, 0.19, 0.16, 0.10) — citation is fabricated. V3.9 also has **Gervás 2014 expectation-violation**. V4 abandons explicit weights in favor of **vector-gap axiom + TTD-MDPs**. **Recommendation:** label the 5 features as tunable hyperparameters (not citation-backed), keep them as the operational model, use Gervás expectation-violation as the conceptual frame, and treat V4's TTD-MDP as a future research direction.

### Conflict 4 — Memory Architecture
Master Upgrade proposes 3-level pyramid + Hybrid RAG. Continuation I supersedes both with xMemory's 4-level hierarchy. ULTRAPLAN supports xMemory. **Recommendation:** xMemory wins. Master Upgrade's hybrid retrieval scoring formula (0.35/0.25/0.25/0.15) is still useful at the leaf-level retriever within the xMemory hierarchy.

### Conflict 5 — Reveal Pipeline Order
Five post-processing agents (RewriteAgent / HAR / DramaturgeAgent / EditorAgent / Beat-Annotator) are proposed across docs without a clean ordering. **Recommendation:**
```
Simulate
  → segmentIntoBeats
  → RewriteAgent (turn → Fountain-ready dialogue)
  → transcriptToFountainWithProvenance
  → HAR (2-iteration inconsistency check)
  → DramaturgeAgent (3-stage: Global → Scene → Coordinated Revision)
  → EditorAgent (review-only notes for the writer)
```

### Conflict 6 — Voice as Soft vs Hard
Prompts treat voice as a soft prompt section. Continuation II treats it as a Director-monitored metric with post-generation validation + retry. Synthesis treats subtext as a hard constraint generated BEFORE the LLM call. **Recommendation:** adopt Continuation II's harder enforcement — quantitative VoiceProfile + checkVoiceCompliance() with retry. Add Synthesis's pre-generation subtext constraint for dialogue specifically (SubtextLayer's 8 techniques).

### Conflict 7 — "ToT" Implementation
Original M8.2 has a deterministic scoring table called "ToT" but it's not Tree of Thoughts. The Audit catches this. Prompts v2 Prompt 9 replaces it with a real lightweight ToT (one LLM call, 3 candidates × 1 turn ahead). **Recommendation:** rename M8.2 to `selectTacticHeuristically` and adopt Prompt 9 as the actual ToT.

### Conflict 8 — Cost Model
Original plan claims 11 LLM calls per round. Audit shows real cost is 25-30. Sonnet's optimization claims this can drop to ~16 with batching + cognitive caching. **Recommendation:** publish the corrected ~16-call/round number with the post-upgrade architecture. Budget for ~$2.10/30-round simulation at GPT-4o prices, or ~$0.80-1.20 using Haiku/Flash for tactic selection and belief diffs.

---

## 8. The Three Defining Insights (Across All Tracks)

When you collapse the entire archive into the propositions that recur in every track and never get contradicted:

### Insight 1 — The Symbolic Layer IS the Product
Every 2025-2026 paper that outperforms pure neural approaches does so by adding a symbolic layer. The LLM is good at fluency, terrible at causality, consistency, ToM, and authorial intent. **StoryMachine's competitive advantage is not the LLM — it's the typed, versioned, queryable symbolic substrate that no competitor has built.** This is true in the M0-M8 track ("Symbolic-Neural Balance Is the Core Engineering Problem"), the Synthesis track ("hard proofs are non-negotiable"), the MIMO ScriptIDE track ("Harness Era system"), and the ULTRAPLAN track ("Layer 0 Symbolic Backbone").

### Insight 2 — LLMs Are Systematically Optimistic, and That Destroys Drama
Documented across multiple sources (Utopian Illusion paper, primacy effect, Tian-2024 EMNLP). LLMs default to positive sentiment, low conflict, polite dialogue, clean resolution. **Drama requires friction.** The friction mandate, sentiment watchdog, dissonance engine, contradiction memory, and forced-tactic-under-pressure mechanisms are all answering this. The voice differentiation problem (every character sounds like the same person) is the same failure mode in dialogue form.

### Insight 3 — Writers Need Transparency More Than Power
Constella research + the audit track + every continuation doc converge on this. Professional writers abandon AI narrative tools when the AI is opaque. **Every choice the engine makes must be inspectable.** This is why provenance ledgers, causal traces, inference-trace tables, "Why does this line exist?" features, director's-cut mid-simulation override, what-if branching, and the entire Writer Cockpit observability dashboard exist. The product is not "AI writes your script." The product is **"AI shows its work, and you stay the director."**

### A Fourth Insight (Implicit Across the Archive)
The .docx track + MIMOchat's central law together make a quieter claim that holds up under all the noise: **drama is mechanism, not language.** Every film in the reference set resolves through a mechanism — a physical, observable, irreversible act that proves the thematic argument. The dialogue at the climax doesn't carry the drama — the mechanism does. The engine's job is to make mechanisms that **operate**, not to make sentences that **sound good**.

---

## 9. What's Actually Buildable Right Now

If you strip the archive of everything that would require new research, here is the minimum viable engine that every track agrees on and that has cleanly verified citations:

### Core (must-haves, all verified)
1. **Event-sourced canon ledger** (StoryCommit + branching + diff) — Event Calculus, Allen Interval Algebra
2. **Atomic-fact world state** with validity intervals — FactTrack
3. **BDI agent cognition** with Memory Stream + Reflection — Park 2023, Riedl, Bratman
4. **xMemory 4-level hierarchy** for agent memory — xMemory paper (arXiv 2602.02007)
5. **EvolvTrip ToM triples** + visibility model — EvolvTrip
6. **AGM belief revision** — Alchourrón-Gärdenfors-Makinson 1985
7. **OCC + emotion contagion** — Ortony-Clore-Collins 1988, Weng 2024
8. **Drama manager** as monitor-decide-act with intervention vocabulary — Façade (Mateas-Stern 2005), IBSEN
9. **Natural-language beat triggers** — Drama Llama
10. **Pacing controller** with sentence variance + action density — CONCOCT/Yang 2023 (NOT "Guan 2024 NAACL")
11. **Outline conditioning every turn** — DOC (Yang 2023, ACL) / PlotMachines (Rashkin 2020 EMNLP)
12. **Fabula → Syuzhet reconstruction** for export — Bordwell 1985, Genette 1980
13. **2-stage DSR + Plug-and-Play Dramaturge** for post-processing — arXiv 2510.05188
14. **Structured Fountain export** with scene metadata — Guan 2023 (ACL)
15. **Writer Cockpit** with Director's Cut Mode + What-If Branching + Harvest Mode

### Quality / Production
16. **U-shaped 15-section prompt** — Liu 2024
17. **PCL Role Chain** identity scaffold — ACL 2025 Findings
18. **StyleChat Style Thought Chain** + quantitative VoiceProfile + voice compliance checker
19. **Friction mandate + sentiment watchdog** — Utopian Illusion paper
20. **Agent order randomization** — primacy effect literature
21. **Cost telemetry + circuit breaker + graceful degradation + session persistence** — production engineering
22. **Integration test harness (M1.5)** before M2 — Audit recommendation
23. **ASE LLM-as-judge evaluation suite** — Zheng 2023 MT-Bench
24. **Prompt caching tiered + parallel agent processing**

### Specialty (V4 / V_beta additions, after the core ships)
25. World-physics Layer (3D spatial LCS, prop state machines, somatic state)
26. Specialized engines (Dialogue, Spatial/Embodiment, Theme/Motif, Genre/Moral/Humor)
27. MCTS Branch Explorer, Coalition Tracker, Branch-and-Bottleneck, WhatELSE
28. Causal Invariance Fact Extractor, Chekhov SQL Auditor
29. Mechanism Compiler with 8-technique SubtextLayer (Synthesis track)
30. The 3-tier Proof Kernel as acceptance-test contract

### What to Reject / Defer
- Full CICERO piKL bilateral planner (use lightweight intent prediction only)
- Embedded vector BLOB in memory_stream (defer until profiled need)
- The "Akoury 2024" Auto-Pivot citation (use Papalampidi 2019 instead)
- Full Kripke possible-worlds semantics (state explosion)
- Raw chain-of-thought dump to Fountain
- Pure round-level batching without causal ordering preservation
- Scalar tension score as primary Director steering signal
- TRIBE v2 full fMRI prediction, neurochemical reward shaping (PDF playbook explicitly rejects)
- 30+ action types (kills observability)
- "More AI buttons" without engine coupling

---

## 10. The One-Sentence Definition

From Sonnet's research, restated here because it survives translation across every track:

> **A beat-sequenced, intervention-limited drama manager guiding a deception-capable multi-agent social simulation, with a provenance-rich, syuzhet-reconstructed screenplay-harvesting pipeline — where writers seed pressure and secrets, watch an intelligent drama manager produce emergent narrative behavior through epistemically aware agents, and harvest that behavior into structured, subtext-rich screenplay material through an integrated writer cockpit where the writer is always the director, never the audience.**

Layered with MIMOchat's central law:

> **One Narrative Mechanism OS whose central law is `theme → mechanism → rule → object/body/ritual → cost → witness → irreversible proof → scene`, validated against the Tier 1 hard-block proofs (Temporal, Causal, Epistemic, Mechanism) and refined against the Tier 2 quality gates and Tier 3 ranking signals.**

And, from the Autoresearch playbook, the optimization target:

> **`narrative_score = w1·C + w2·S − w3·D`**, where `C` is rule-based constraint compliance from screenwriting theory (McKee value turns, Hitchcock suspense, mechanism proof chain), `S` is embedding similarity to reference beats, and `D` is a diversity penalty against homogenization — with weights tunable inside `train.py` and the agent optimizing the score autonomously while the human retains final creative judgment.

These three statements are the same product described at three altitudes.

---

## 11. Recommended Reading Order (For Future You)

If you ever re-open this archive, here is the order that builds understanding fastest:

1. **`STORYMACHINE_Drama_Engine_Research_SONNET.md`** — start here. Single most build-ready file. 1,615 lines covering everything end-to-end with citations, code, cost, and validation.
2. **`storymachine_audit.md`** — read second. Catches all the gaps in the Sonnet plan and gives you the corrected milestone order.
3. **`STORYMACHINE_V3.9___THE_COMPLETE_MASTER_BLUEPRINT.md`** — the most detailed TypeScript+SQL implementation spec.
4. **`storymachine_prompts.md`** — the 10 production prompts you'll actually run.
5. **`storymachine_continuation.md`** + **`storymachine_continuation_2.md`** — the meta-audit and the voice/MCTS/coalitions extensions.
6. **`storymachine_master_upgrade.md`** — 10-domain research-grounded upgrade roadmap.
7. **`ULTRAPLAN_NarrativeAgent_2026.md`** — Python pseudocode version of the same architecture for cross-checking.
8. **`StoryMachine_DeepResearch_Synthesis.md`** — read last because the vocabulary is different; this is the proof-kernel acceptance contract layer.
9. **`StoryMachine___ScriptIDE_Logic_Engine__MIMO.md`** — for the formal foundations (Event Calculus, Allen, DEL, Type Theory, Game Theory, Info Theory, Graph Grammars, Process Algebras) when you need to defend an architectural choice on theoretical grounds.
10. **`MIMOchat_StoryMachine___ScriptIDE_Logic_Engine_.md`** — when you want to be reminded of the central law and the 45-engine inventory.
11. **`STORYMACHINE_V4_MASTER_GOOGLE.md`** — for the world-physics direction (V4) when you're ready to add the ontological substrate.
12. **`STORYMACHINE_V_beta__LARGE_ERNIE_BLUEPRINT.md`** — for the humanities-grounded 9-engine alternative (Dialogue, Spatial/Embodiment, Theme/Motif, Genre/Moral/Humor as first-class engines).
13. **`Filling_Every_Gap_research_StoryMachine.md`** — encyclopedic gap-filling for every section of the spec.
14. **`v35_integration_plan.md`** — the citation integrity audit (essential before quoting any source).
15. **The .docx reference-film reverse-engineerings** — when you need to validate an architectural decision against canonical screenplay execution.
16. **`The Autoresearch Playbook_...pdf`** — when you're ready to think about the autonomous optimization loop and how this becomes a self-improving system.
17. **`film-director-ars-research.skill`** — when you need to encode another auteur's decision-making into the engine.

Everything else is duplicative or supplementary.

---

## 12. The Bottom Line

You have not been making 49 separate things. You have been writing the same neuro-symbolic dramaturgy engine 49 times, from seven directions, with the same spine surviving every rewrite:

- **A symbolic core** (typed, versioned, event-sourced state)
- **LLM-at-the-boundary** (extract → render → audit, never reason)
- **Six to nine engines** of character cognition, ToM, epistemics, memory, emotion, drama management, reveal architecture, narrative compilation, and ScriptIDE
- **A reference-film-validated central law** that ties theme to scene through mechanism
- **A three-tier proof kernel** as the acceptance contract
- **A writer cockpit** where the human is always the director
- **An autonomous-optimization loop** (Autoresearch-style) ready to wrap the whole thing once it ships

The disagreements between tracks are real but small: vocabulary, naming, citation accuracy, database choice, where to put the 5-feature tension weights. The convergence on what to build, in what order, at what cost, with what evidence — is overwhelming.

The next step is not more research. It is **picking one track to be canonical (Sonnet is the best candidate), running it through the audit's 53 fixes, and shipping Week 0 + Week 1 from Section 6 above.**
