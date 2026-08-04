# /godmode Integration: The Complete End-to-End StoryMachine

*Fifth and apex companion document. If the other four were lost, this is the one to keep — it traces a single line from the author typing a logline to a regression-tested, ethics-audited, production-ready screenplay with line-level provenance, and shows where every named subsystem from the archive plus the NVM hybrid plan plus the completeness map participates in that line.*

The previous documents:
- `_SENSE_OF_THE_RESEARCH.md` — what's in the archive
- `_BEST_RESEARCH_AND_WHATS_NEXT.md` — what's best, weak, and shippable
- `_COMPLETING_STORYMACHINE.md` — what makes the engine complete (22 layers, 25 dimensions)
- `_HYBRID_DECISION.md` — NVM substrate + archive engines = additive integration

This document: **how it all runs as one system.**

---

## 0. The /godmode Operating Image

When fully integrated, StoryMachine has **three nested loops** and **four perpendicular monitoring layers**. Every subsystem from every research track lives at one specific location in this image.

```
┌────────────────────────────────────────────────────────────────────────┐
│                    MACRO LOOP (per project / per script)               │
│                                                                          │
│  Logline → Intent → Premise → Mechanism → Outline → Project Bible       │
│       ↓                                                                  │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │            MESO LOOP (per scene, ~24-scene script)               │   │
│  │                                                                    │   │
│  │  Pressure Scan → Decision Council → Candidate Portfolio (24-32)  │   │
│  │       → Proof Gating → Scene Planner → ScenePlan → Visual+Sound  │   │
│  │       → Dialogue Compiler → Screenplay Render → Sidecar          │   │
│  │       → Proof Re-run → Commit                                     │   │
│  │       ↓                                                            │   │
│  │  ┌────────────────────────────────────────────────────────────┐   │   │
│  │  │           MICRO LOOP (per turn within scene)                │   │   │
│  │  │                                                              │   │   │
│  │  │  Agent Pressure → BDI Action Choice → ToM Update            │   │   │
│  │  │       → Epistemic Batch → Emotion Appraisal                  │   │   │
│  │  │       → Contradiction Check → Memory Write                   │   │   │
│  │  │       → Reflection (every 5 turns) → Next Agent              │   │   │
│  │  └────────────────────────────────────────────────────────────┘   │   │
│  │                                                                    │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│       ↓                                                                  │
│  Harvest → Refine (Dramaturge 3-stage) → HAR → Editor Notes             │
│       → Ethics/Provenance Pass → Final Fountain + Sidecar               │
│       → Production Bridge (breakdowns, shot list, budget, pitch)         │
│       → Industry Export (FDX, Highland, Fade In)                         │
│       → Pedagogy/Annotation/Coverage Generation                          │
│       → Series Bible Update (if applicable)                              │
└────────────────────────────────────────────────────────────────────────┘
       ↑                                                            ↓
       │                                                            │
┌──────┴──────────────────────────────────────────────────────────┴──────┐
│              PERPENDICULAR LAYER A: Narrative CI/CD                     │
│  Every commit → 15 regression tests + 10 acceptance tests +             │
│  reference-film regression suite + StructuralMetrics + ASE eval suite     │
└────────────────────────────────────────────────────────────────────────┘
       ↑                                                            ↓
┌──────┴──────────────────────────────────────────────────────────┴──────┐
│              PERPENDICULAR LAYER B: Ethics / Provenance Monitor         │
│  Continuous: bias audit (multi-axis) + sensitivity reader pass +        │
│  cultural appropriation detector + historical accuracy + IP scan +      │
│  defamation risk + per-line authorship attribution +                    │
│  WGA disclosure metadata + content watermarking + confidence scoring    │
└────────────────────────────────────────────────────────────────────────┘
       ↑                                                            ↓
┌──────┴──────────────────────────────────────────────────────────┴──────┐
│              PERPENDICULAR LAYER C: Personal Learning Loop              │
│  Per-writer LoRA / adapter updates from every edit, rejection,          │
│  acceptance, dwell pattern, time-of-day usage, genre mode,              │
│  workflow mode, voice preferences. Active learning surfaces             │
│  least-confident outputs for writer rating.                              │
└────────────────────────────────────────────────────────────────────────┘
       ↑                                                            ↓
┌──────┴──────────────────────────────────────────────────────────┴──────┐
│              PERPENDICULAR LAYER D: Autoresearch Optimization           │
│  Overnight loop: maximize narrative_score = w1·C + w2·S − w3·D          │
│  through autonomous experimentation on train.py parameters.             │
│  prepare.py immutable (Story Bible). program.md authored instructions.  │
│  Hard gates per project (e.g., for GOOB: Armenian context, Future Son). │
└────────────────────────────────────────────────────────────────────────┘
```

Everything else in the archive — every engine name, every proof type, every theory framework, every research paper — is a participant in one of these loops or layers.

---

## 1. The Master Pipeline: 25 Stages End to End

Below is the complete pipeline. Each stage names the subsystems that participate (drawn from the archive, the NVM hybrid plan, the completion document, and the judgment document). Each stage produces concrete artifacts and is gated by specific proofs.

### Stage 1 — Author Intent Capture (Cockpit)
**Trigger**: writer opens ScriptIDE, types logline or premise.

**Subsystems active**:
- ScriptIDE Cockpit Welcome Mode
- Project Setup Wizard
- Character Bible Builder (proposes initial character roster)
- World Bible Builder (proposes world parameters)
- Logline Parser (NLP extracts protagonist / antagonist / object / wound / setting / genre)
- Comparable Film Matcher (suggests "this resembles X, Y, Z")
- Audience Demographic Selector
- Distribution Format Selector (feature / short / TV pilot / stage / game / comic)

**Artifacts produced**: `ProjectManifest` with intent string, parsed entities, comparable films, target audience, target format.

**Proofs**: none yet (intent is input, not validation target).

**Cost**: ~$0.01.

### Stage 2 — Premise + Counter-Premise (Theme Engine)
**Subsystems active**:
- Theme Engine (Truby spine)
- Egri Premise Machinery
- Counter-Premise Generator
- Ironic Distance Calibrator
- Philosophical Position Detector
- Mythic Resonance Engine (matches premise against Hero's Journey, Propp's 31 functions, ATU index, Frye's mythoi)

**Artifacts produced**: `ThemeArgumentGraph` skeleton — central question, primary claim, counter-claim, advocates (which character will embody which side), expected resolution mode (synthesis / triumph of claim / triumph of counter-claim / tragic neither / open).

**Proofs**: AuthorIntentProof (Tier 2).

**Example output for locksmith+piano**:
- Central question: "What do we owe the dead?"
- Primary claim: "Grief disguised as devotion isolates us from the living."
- Counter-claim: "Honoring the dead requires not living."
- Expected resolution: synthesis (the piano stays but is played publicly).

### Stage 3 — Mechanism Selection (Mechanism Compiler)
**Subsystems active**:
- Mechanism Compiler MVP (with the 3 priority mechanisms: Object Burden, Legitimacy Split, Relationship Externalization)
- Long-term: 20+ mechanisms (Ritual Protocol, Witness Conversion, Climax Proof, Ending Proof, etc.)
- Central Law enforcer: `theme → mechanism → rule → object/body/ritual → cost → witness → irreversible proof → scene`
- Genre Engine (constrains mechanism choices by genre conventions)
- Reference-Film Library (matches premise to nearest known-working mechanism)

**Artifacts produced**: `NarrativeMechanism` object with kind, theme claim, protagonist wound, dramatic question, physical carrier (object/ritual/body/institution/ability/identity/canon/clue_system), governing rules, loopholes, costs, lifecycle, escalation path, climax proof, ending proof, invariants.

**Proofs**: MechanismProof (Tier 1).

**Example for locksmith+piano**:
- Kind: Object Burden (primary) + Relationship Externalization (secondary)
- Physical carrier: piano
- Rules: piano is shrine + piano contains family history + piano is communication medium
- Costs: keeping = isolation; releasing = vulnerability
- Climax proof: locksmith allows piano to be played publicly
- Ending proof: piano's meaning shifts from shrine to shared voice

### Stage 4 — Necessity Audit (Necessity Engine)
**Subsystems active**:
- Necessity Engine (Why now? Why here? Why them?)
- Stakes Auditor
- Forcing Function Designer

**Artifacts produced**: `NecessityCertificate` — explicit answers locked.

**Proofs**: NecessityProof (Tier 2).

**Example**:
- Why now: today is wife's death anniversary; the kid surfaces today because foster care system aged-out yesterday
- Why here: the shop is the only place the piano can be; the kid found this neighborhood through her late mother's address book
- Why them: the locksmith is the kid's biological grandfather (the secret she'll reveal)
- Forcing function: customer arrives offering double; kid sees this through window and chooses this shop

### Stage 5 — Character Mind Synthesis (Cognition Module)
**Subsystems active**:
- Cognition Module:
  - BDI DAG goal substrate
  - Memory Stream (xMemory 4-level: themes / semantics / episodes / raw)
  - OCC emotion + contagion + Hatfield 1994
  - EMA 6-step appraisal pipeline (appraise / select / intensify / cope / govern / mask)
  - Mood layer (PAD dimensional)
  - ToM² PAL with three-level visibilityModel (Kosinski + Rescher)
  - EvolvTrip temporal ToM triples
  - TOMA chain-of-thought ToM
  - Festinger cognitive dissonance + Vaillant defense mechanism hierarchy
  - Internal Family Systems Parts (Schwartz)
  - Attachment style (Bowlby/Ainsworth/Hazan-Shaver)
  - Somatic markers (Damasio)
  - Maslow need hierarchy + override at activation > 0.8 for physiological/safety
  - Erikson life-stage filter
  - Habit / Procedural Memory
  - Counterfactual ledger
  - Implicit vs explicit belief split
  - Personality (Big Five filtered + Dark Triad active markers only)
  - PCL Role Chain 5-question identity scaffold
  - Trauma & Subconscious Layer (V4's Layer −1)
- Constella FRIENDS DISCOVERY (proposes 2-3 new characters with explicit tensions)
- Constella JOURNALS (private journal entry per character)
- QD Character Generation (5 variants per character with diverse needs/defenses/Dark Triad)

**Artifacts produced**: `CharacterMind` per character, fully specified across cognition / emotion / ToM / memory / personality / attachment / trauma / habits / counterfactuals.

**Proofs**: IntentionalProof (Tier 1) on every projected action.

### Stage 6 — Relationship Graph Construction (Relationship Module)
**Subsystems active**:
- Relationship Module with `RelationshipState` (affect: love/trust/intimacy/admiration/resentment/envy/fear/contempt/guilt/obligation/dependency; dialectics: connectionAutonomy / opennessSecrecy / protectionControl / dutyFreedom / dependenceAgency / admirationEnvy / loyaltyTruth; power: publicHolder/privateHolder/currentMode/volatility)
- Repair Invariant Enforcer (no repair without harm acknowledgement + cost + changed behavior + believable reception)
- Coalition Tracker (formations, alliances, conspiracies)
- CICERO Trust Model with reliability decay
- Power Dynamics Engine (Brown-Levinson FTAs)
- Gottman relationship dynamics
- Interpersonal Circumplex (Agency, Communion)
- Cultural Cognition Layer (Hofstede + cross-cultural patterns)

**Artifacts produced**: `RelationshipGraph` — every dyad fully specified, including ruptureHistory, repairHistory, unresolvedDebts, sharedObjects, sharedSecrets, sharedRituals, currentPressure.

### Stage 7 — World State Initialization (World/Spatial Module)
**Subsystems active**:
- World-State Engine (FactTrack-style atomic facts with validity intervals)
- Spatial Engine (3D LCS coordinates, proxemics per Hall 1966, tableau planning)
- Prop Registry (V4 prop state machines)
- Asset Dependency Graphs
- Sonic Occlusion Maps
- Location Log with population mechanism
- G-KMS Lorebook (canonical world laws)
- Historical Accuracy Layer (if period piece)
- Genre World Conventions

**Artifacts produced**: initial `NarrativeState` with objectiveReality (TemporalFactStore), characterBeliefStates (BeliefGraph per character), audienceState, authorIntent, fabula skeleton, syuzhet skeleton (empty), eventGraph, causalGraph, characters, relationships, mechanisms, objectArcs, revealPlans, themeGraph, genreContracts, readerSimulation, provenance.

**Proofs**: ContinuityProof, TemporalProof (initialized).

### Stage 8 — Reveal Architecture Seeding (Reveal Module)
**Subsystems active**:
- Reveal Module
- Per-secret IllusionArc objects
- Chekhov's Gun tracker (SQL audit + forced injection if unused by Act 3)
- Sternberg triad (curiosity / suspense / surprise)
- Reveal Mode Selector (mystery / suspense / dramatic_irony / surprise / recognition / reversal / confirmation / betrayal / false_reveal)
- Clue Ecology Designer (8 carrier types: object / line / gesture / location / absence / behavior / camera / sound)
- Misdirection Designer (with false reveals as decoys)
- Prestige Readiness composite score
- Dramatis plan-based suspense (P(escape)=0 → dread state)
- Information Theory reveal sweet-spot (40-70% audience expectation)

**Artifacts produced**: `RevealPlan[]` — every secret in the story has a planned reveal mode + knowledge states + clue ecology + misdirections + false reveals + readiness signals + scheduled reveal event.

**Example for locksmith+piano**: 
- Hidden truth: kid is locksmith's biological granddaughter (the wife's secret daughter from before marriage)
- Reveal mode: recognition (the song the wife taught her)
- Clue ecology: kid hums fragment in Scene 3 (audience-only) / kid says her grandmother taught her in Scene 4 (both) / kid plays the song fully in Scene 5 (recognition moment)
- Misdirection: locksmith assumes the kid is a thief

### Stage 9 — Outline Generation (Pacing + Drama Manager + Plot Structure)
**Subsystems active**:
- Plot Structure Engine (Classical / Mini-Plot / Anti-Plot mode selector)
- Multi-Timeline Solver (analepsis / prolepsis / parallel / reverse / loop / frame-narrative)
- Pacing Module (target genre curve + emotional beat frequency + dialogue density)
- Drama Manager Module
- Outline Conditioning (Yang 2023 DOC / Rashkin 2020 PlotMachines)
- ASP Beat Sequence Constraint Solver (15 narrative constraints)
- Emotional Arc Engine (6 ARC_TEMPLATES: rise_fall / fall_rise / steady_rise / rags_riches_rags / icarus / cinderella)
- Drama Llama Storylet Library (natural-language beat triggers)
- ULTRAPLAN 5-layer architecture
- Branch-and-Bottleneck (bottleneck_turns with enforceBottlenecks 5 turns ahead)

**Artifacts produced**: `Outline` — N-scene structure with per-scene metadata: SceneFunction, goal, constraint, avoid clauses, active mechanisms, scheduled pressure, expected emotional valence, expected reveal events, expected reincorporations.

**Proofs**: ThemeProof, PacingProof, NecessityProof on outline acceptance.

**Example for locksmith+piano**:
- Scene 1: Setup. Eli refuses customer. Mechanism: Object Burden seeded.
- Scene 2: Complication. Kid hides in shop. Mechanism: Object activated.
- Scene 3: Escalation. Kid plays fragment. Clue planted. Mechanism: helpful → costly.
- Scene 4: Reversal. Kid says grandmother taught her. Mechanism: dangerous.
- Scene 5: Crisis. Eli confronts secret. Mechanism: crisis.
- Scene 6: Payoff. Public playing. Mechanism: transformed → resolved.

### Stage 10 — Per-Scene Meso Loop Entry (Story Decision Council)
For each outlined scene, the meso loop begins.

**Subsystems active in Module Pressure Scan**:
Every NarrativeModule's `inspect(state)` runs in parallel:
- Cognition Module: per-agent pressure (frustrated goals, contradictions, OCC events)
- Relationship Module: rupture/repair pressures, coalition shifts
- Drama Manager Module: tension delta, pacing monotony, irony gap, info gap
- Reveal Module: reveal readiness, clue freshness, misdirection effectiveness
- Theme Module: claim/counter-claim balance, unresolved contradictions
- Necessity Module: "why this scene now?" audit
- Specificity Module: standby (validates candidates)
- Reincorporation Module: setups awaiting payoff, symbols awaiting transformation
- Surprise Module: surprise bandwidth audit
- Mirror Scene Module: opportunities for parallel scenes
- Pacing Module: emotional beat cadence
- Genre Module: convention compliance pressure
- Voice Module: voice differentiation status
- Production Module: budget/location/cast practicality

**Artifacts produced**: `ModulePressure[]` — one or more pressures per module, each with (urgency × readiness × riskIfIgnored × riskIfAdvancedNow × expectedPayoff × recommendedSceneFunctions × explanation).

### Stage 11 — Story Decision (Council)
**Subsystems active**:
- Story Decision Council (aggregates ModulePressures)
- Decision Rules ("Never reveal before audience readiness," "Never repair before rupture cost is paid," etc.)
- Authorial Override Layer (writer can force a decision)

**Artifacts produced**: `StoryDecision` — selectedPressure, selectedSceneFunction, selectedMechanisms, whyNow rationale, rejectedOptions log with futureReconsiderationCondition, requiredProofs, riskProfile.

### Stage 12 — Candidate Transition Search (Portfolio Engine)
**Subsystems active**:
- Candidate Transition Search (24-32 candidates)
- 8 search modes: causal-safe / emotionally painful / weird-but-valid / theme-sharpening / reveal-strengthening / relationship-damaging / visually cinematic / anti-generic
- Each candidate is a `NarrativeTransitionIR` (typed scene-change object)
- Each compiled to `ExecutableTransition` (IR + StoryOps + preconditions + postconditions)
- MAP-Elites portfolio with 4 BCs (mechanismAdvancement / characterPerspective / genericnessDistance / emotionalValence)
- Graph of Thoughts generation pattern

**Artifacts produced**: `Candidate[]` — typed scene-change candidates with proof predictions.

### Stage 13 — Proof Kernel Validation (Per Candidate)
**Subsystems active**:
- Full 4-tier 13-proof contract runs on every candidate:
  - Tier 1 Hard Blocks: TemporalProof, CausalProof, IntentionalProof, MechanismProof, EpistemicProof, ContinuityProof, ProvenanceProof
  - Tier 2 Quality Gates: EmotionProof, MotivationalProof, RelationshipProof, ThemeProof, ReaderStateProof, SpatialProof, DialogueProof, SubtextProof, VoiceProof, NecessityProof, ReincorporationProof, SpecificityProof, SurpriseProof, PolarityProof
- Tier 1 failures eliminate candidates
- Tier 2 failures flag candidates for repair via `repair()` method
- Genericness Vector scoring (per candidate)

**Artifacts produced**: filtered Candidate[] (valid candidates only), repair logs for Tier 2 fails.

### Stage 14 — Quality-Diverse Selection
**Subsystems active**:
- Quality-Diverse Portfolio (preserve diversity, not just max-score)
- Tier 3 Ranking Signals: GenericnessProof, OriginalityProof, RewatchRewardProof, VoiceConsistencyProof
- Anti-Sentimentality Engine
- Selection Law: "Pick the strangest candidate that still passes proof"
- Writer Style Adapter (uses per-writer LoRA to bias toward writer's preferences)

**Artifacts produced**: 1 chosen `NarrativeTransitionIR` + 3-5 alternate valid candidates surfaced to writer.

### Stage 15 — Scene Planning (Scene Planner + Sub-Modules)
**Subsystems active**:
- Scene Planner
- RST Discourse Composer (background / contrast / concession / cause / result / preparation / elaboration / condition / evidence)
- Scene Purpose Classifier (McKee 6-function: advance_plot / reveal_character / build_tension / provide_relief / set_up_payoff / establish_world) + orphan-scene detector
- SceneSpace builder (locations, regions, characters, objects, sightlines, occlusions, exits, soundZones, cameraFrame, visibleObjects, hiddenObjects)
- Spatial Epistemic Proof (no character knows what they couldn't see/hear/infer)
- Visual Module (DeepShot cinematography + Color Script + Light/Shadow + Composition Grammar + Tableau + Costume + Aspect Ratio + Editing Rhythm + Match-Cut Sequencer + Production Design Semiotics)
- Sound Design Engine (score + leitmotif + foley + ambience + diegetic/non-diegetic + acoustic space + silence-as-climax)
- Genre Visual Conventions
- Reincorporation Engine (which earlier elements should this scene transform?)
- Mirror Scene Engine (is this a mirror of an earlier scene?)

**Artifacts produced**: `ScenePlan` — sceneId, transitionId, activeMechanisms, sceneFunction, beforeState, afterState, nucleusBeat, satellites, requiredOps, requiredVisualInformation (cameraFrame + colorScript + lightingMood + composition + tableau + costumeNote), requiredDialogueFunctions, dialoguePlan, blockingPlan (SceneSpace), readerEffect (ReaderStateDelta).

### Stage 16 — Micro Loop Execution (Per-Turn Simulation)
The scene's nucleus is now simulated turn-by-turn within the ScenePlan's constraints.

**Subsystems active per turn**:
- 10 production prompt builders (from `storymachine_prompts.md`)
- U-shape 15-section prompt (Liu 2024)
- Anthropic 2023 "THE MOST IMPORTANT CONSTRAINT" trick
- Per-turn Agent Action prompt (Prompt 2)
- Epistemic Batch Update + OCC Appraisal folded (Prompt 3 + 4)
- PCL Role Chain (every 5 turns or pressure > 0.75)
- StyleChat Style Thought Chain (every turn, voice recitation)
- Streamlined identity anchor (no irrelevant Big Five)
- Code-based world state injected (CORRPUS)
- Beat conditioning at prompt top
- Pacing override hints
- Friction mandate
- Sentiment watchdog (3+ rounds positive → APPLY_PRESSURE)
- ToT-lite tactic deliberation (Prompt 9) — 3 candidates × 1 turn ahead
- Memory Importance scorer (Prompt 6) — batched per round
- Reflection (Prompt 7) — every 5 turns
- Contradiction Detection (Prompt 8) — on high-confidence belief pairs
- Narrative Consistency Checker (Prompt 5) — every 5 turns

**Per turn, the engine produces**:
1. TACTIC choice (from 12-tactic vocabulary: deflect / mirror / probe / corner / confess_partial / lie / gaslight / counteraccuse / escalate / withdraw / appeal / sacrifice)
2. REASONING (≤40 tokens, structured 4-step scratchpad)
3. ACTION_TYPE (SPEAK / SILENCE / ACT)
4. CONTENT (dialogue line or action description)
5. SUBTEXT (explicit hidden-meaning annotation)
6. StoryOps emitted to canon

**Voice Module runs per turn**:
- Quantitative VoiceProfile check (targetAvgWordsPerSentence, allowedFillerWords, forbiddenPatterns, syntaxSignature, vocabularyDensity)
- checkVoiceCompliance() with retry on violation
- Idiolect profile (Labov 1972)
- Verbal tic / catchphrase library
- Discourse marker strategy
- Register / code-switching
- Disfluency modeling under pressure

**Dialogue depth runs per line**:
- Speech Act Theory (locutionary / illocutionary / perlocutionary)
- Gricean Maxim flouting detection (subtext source)
- Brown-Levinson politeness (FTAs)
- Relevance Theory scoring
- Conversation Analysis (adjacency pairs, repair sequences)
- Rhetorical Device Library
- Argumentation scheme (Walton/Toulmin) if argument scene
- Silence-as-Dialogue option

**Specificity Engine validates every line**:
- Embedding distance from generic cluster centroid
- Rejection of lines too close to centroid
- Forced regeneration with detail mandate

**StoryOps emitted**:
Each turn emits StoryOps to canon: UPDATE_BELIEF, APPRAISE_EMOTION, SHIFT_RELATIONSHIP, possibly TRIGGER_RULE, SEED_CLUE, PAYOFF_SETUP, UPDATE_READER_STATE.

**Cost telemetry per turn**: tracked.
**Per-line provenance**: stored.

### Stage 17 — Dialogue/Action Compilation
After all turns in the scene have run, the Dialogue/Action Compiler produces the structured `DialogueExchangeIR`:

**Subsystems active**:
- Dialogue Compiler (action-as-dialogue support)
- 10 Dialogue Validators:
  - mechanism relevance
  - state change
  - voice specificity
  - subtext gap
  - knowledge legality
  - exposition laundering
  - response chain
  - relationship pressure
  - silence/action alternative
  - motif / callback use
- SubtextLayer (8 techniques: INDIRECT / DEFLECTION / CODED / OVERCOMPENSATION / IMPLICATION / CONTRADICTION / ABSENCE / LAYERED_MEANING) — generated BEFORE LLM call as hard constraint
- Voice Performance Cues (timbre, pace, breathing, accent)
- Profanity Calibration per project

**Dialogue Law enforced**: *No line enters screenplay unless it proves speaker objective + hidden intent + tactic + knowledge legality + voice specificity + subtext gap + mechanism relevance + state change.*

**Artifacts produced**: `DialogueExchangeIR` — sceneId, transitionId, activeMechanisms, before snapshot, turns (DialogueTurnIR[]), actionBeats (DialogueActionBeat[]), after delta, DialogueProof.

### Stage 18 — Screenplay Render + Sidecar
**Subsystems active**:
- Screenplay Compiler with 3 render modes (clean_fountain / annotated_fountain / debug_scene_plan)
- Structured Fountain with scene metadata (Guan 2023)
- SceneAnnotationSidecar (line-level annotations: speaker / hiddenIntent / tactic / activeMechanism / stateDelta / proofLinks)
- Provenance Ledger (per-line authorship attribution)
- Multi-Format Output (Fountain + FDX + Highland + Fade In + Final Draft + Movie Magic + comic-script + stage-play + game-script + prose)

**Artifacts produced**: `CompileResult` = { fountain (clean), sidecar (full intelligence), proof (NarrativeProof), diagnostics }.

### Stage 19 — Per-Scene Post-Processing
The raw scene output goes through three quality passes in order:

**RewriteAgent** (Simulate-then-Rewrite):
- Takes raw simulation transcript
- Rewrites into polished Fountain prose
- Applies VoiceProfile + SubtextLayer constraints from upstream

**HAR** (Hallucination-Aware Refinement, 2 iterations):
- Detects inconsistencies vs known world state
- Repairs or flags

**Plug-and-Play Dramaturge** (3-stage):
- Stage 1: Global Review (top 3 structural issues)
- Stage 2: Scene-level Review (up to 2 local issues per scene)
- Stage 3: Hierarchical Coordinated Revision (integrate global + scene, keep names/structure, ±20% length)

**EditorAgent** (HoLLMwood — review only):
- Strengths / weaknesses / missing_beats / character_notes / key_recommendation
- Surfaces notes to writer; doesn't auto-apply

**FilmAgent Debate-Judge** (consistency triangulation):
- Defense agent + Prosecution agent + Judge revision
- Used for high-stakes consistency calls

**Artifacts produced**: refined scene with diagnostic notes.

### Stage 20 — Scene-Level Proof Re-Run + Commit
All 13 proofs re-run on the rendered scene. If anything fails, the scene is rejected or repaired.

**Subsystems active**:
- Full Proof Kernel re-validation
- Coalition stability check
- Mechanism lifecycle audit (still on-track?)
- Reveal readiness recompute
- Reader state delta projection
- Reincorporation density check
- Mirror scene opportunity log
- Specificity per-line audit
- Voice differentiation metric (Director-level pairwise stylometric distance)

**If pass**: scene becomes a `StoryCommit` in the canon ledger.
**If fail**: repair attempt; if unfixable, escalate to writer with diagnostic.

**Artifacts produced**: `StoryCommit` with all deltas (factDeltas + beliefDeltas + relationshipDeltas + emotionDeltas + objectDeltas + mechanismDeltas + revealDeltas + themeDeltas + readerDeltas), diagnostics, author approval pending.

### Stage 21 — Cockpit Update + Author Review
The ScriptIDE Cockpit refreshes with the new scene's state diff.

**Panels active**:
- Screenplay editor (new scene rendered)
- Narrative state diff (highlighted changes)
- Mechanism inspector (piano arc progression visualized)
- Relationship graph (trust trajectory updated)
- Reveal timeline (clue planted / paid off markers)
- Theme argument graph (premise vs counter-premise balance)
- Object-state arc (piano: shrine → played)
- Character belief map (per character)
- Reader-state simulator (curiosity + suspense + investment curves)
- Spatial blocking view (scene's diagram)
- Diagnostics panel (any flagged issues)
- Candidate portfolio (5 alternates surfaced — "could have been")
- What-breaks-if-removed query (ready to run)
- Provenance report
- Cost telemetry

**Author actions available**:
- Accept scene as-is
- Director's Cut Mode mid-scene override (rewind any turn, change any line, redirect simulation)
- Harvest Mode (pin specific scenes, reorder, refine, gap-fill)
- What-If Branching (fork at any pivot point, MCTS-explore alternatives)
- Constella JOURNALS (read each character's inner journal entry for this scene)
- Coverage Generator (one-page coverage on-demand)
- Editor's Notes (apply Dramaturge suggestions)

**Personal Learning Loop monitors**: every writer action — accept / reject / edit / dwell / branch — feeds into the per-writer LoRA / adapter.

### Stage 22 — Macro Loop Continuation
After Scene N commits, the loop returns to Stage 10 for Scene N+1. Continues until all outlined scenes are committed.

**Cross-scene monitoring runs continuously**:
- Reincorporation Engine: tracks setups awaiting payoff
- Surprise Bandwidth: ensures surprise allocation across acts
- Reveal Module: schedules reveals at readiness sweet-spot
- Theme Engine: monitors claim/counter-claim trajectory
- Pacing Engine: monitors emotional beat frequency
- Coalition Tracker: monitors alliance stability decay
- Branch-and-Bottleneck: enforces bottleneck constraints 5 turns ahead
- Genre Engine: convention compliance
- Voice Module: pairwise voice divergence across all characters

### Stage 23 — End-of-Script Global Passes
After all scenes commit, global passes run:

**Plot Structure Engine final audit**:
- Three-act / mini-plot / anti-plot structure verified
- Pinch-point spacing
- Climax mechanism proof
- Ending proof

**Reincorporation Engine final audit**:
- Setup → payoff completeness (every setup paid off OR explicitly noted as deliberate dangling)
- Symbol arc completeness
- Mirror scene validation
- Theme reincorporation in Act 3

**Theme Engine final synthesis**:
- Premise vs counter-premise resolution validation
- Argument graph closure check
- Author intent honored

**Pacing Engine final curve check**:
- Emotional arc matches target type (Rags-to-Riches / Tragedy / Man in Hole / Cinderella / Oedipus / Steady Fall)
- Dialogue density curve matches genre norm
- Scene length distribution

**Reader-State Simulator final projection**:
- Predicted reader trajectory plotted
- Confusion peaks identified
- Investment curve verified
- Re-watch reward layers cataloged

**Causal Plot Constructor (R²)**:
- Sliding-window causal graph built from full action log
- Cycle-breaking via DFS
- Scene boundaries = chain breaks
- Diagnostic on any orphan causal nodes

**Editor Agent (HoLLMwood) final pass**:
- Overall strengths / weaknesses / missing-beats / key-recommendations

### Stage 24 — Ethics / Provenance / Disclosure Pass
**Subsystems active** (this is Perpendicular Layer B made explicit):
- Multi-axis bias auditor (race / gender / sexuality / ability / age / class / religion / body / neurodivergence)
- Bechdel-Wallace and family of representation tests
- Authentic cultural representation engine
- Trauma-informed generation audit (violence / abuse / mental illness / addiction)
- Mental health sensitivity (depression / suicide / self-harm / eating disorders)
- Cultural appropriation detector
- Power dynamics audit (screen-time / lines-per-character / agency-per-character by identity axis)
- Stereotyping watchdog (embed-based)
- Historical accuracy layer
- IP / copyright / trademark scan
- Defamation risk scan
- Real-person depiction check
- Privacy / data protection
- Authorship attribution finalized (per-line provenance)
- WGA-compliant disclosure metadata
- AI content watermarking
- Confidence-weighted output scoring
- Failure mode transparency
- Reasoning trace exposed in UI
- Bias disclosure (per-character if applicable)

**Artifacts produced**: `EthicsCertificate` + provenance manifest + disclosure metadata embedded in export.

**If issues**: writer is alerted with specifics. Engine does not silently rewrite.

### Stage 25 — Production Bridge + Industry Export
**Subsystems active**:
- Production Bridge Module
- Breakdown Sheets generator (locations, props, characters, costumes per scene)
- Shot List Generation (DeepShot productionized)
- Storyboard Integration (optional, image model)
- Budget Implication Tagging (cost drivers: water, fire, kids, animals, VFX, name actors, INT/EXT, day/night, location type)
- Casting Type Tags (physical type, age range, voice quality, skill requirements)
- Location Scouting Hints
- Production Schedule Estimator (day-out-of-days)
- Director-Style Application (.skill bundles — apply Nolan / Coppola / Anderson / Spielberg / Coens style if desired)
- Trailer Beat Selector (which 90 seconds sell this?)
- Pitch Document Generator (logline + synopsis + treatment + comparable films)
- Three-Page Treatment Auto-Generator
- Coverage Generator (full)
- Festival Submission Package

**Multi-Format Output**:
- Fountain (.fountain)
- FDX (.fdx — Final Draft)
- Highland (.highland)
- Fade In (.fadein)
- Movie Magic Screenwriter (.mmsw)
- Prose (.docx)
- Comic Script (.txt comic format)
- Stage Play (.fountain stage)
- Game Script (.json branching)

**Artifacts produced**: full project archive ready for production.

### Stage 26 — Narrative CI/CD Final Sweep
**Subsystems active** (Perpendicular Layer A made explicit):
- StoryChangeSet from this draft
- 15 regression tests run:
  - Temporal consistency
  - Causal links
  - Character intentionality
  - Relationship rupture/repair
  - Emotion continuity
  - Belief legality
  - Reveal readiness
  - Theme pressure
  - Mechanism integrity
  - Object arc continuity
  - Reader confusion
  - Dialogue function
  - Voice consistency
  - Spatial epistemics
  - Provenance
- 10 acceptance tests run:
  - Bad apology test
  - Impossible knowledge test
  - Cheap twist test
  - Puppet plot test
  - Generic dialogue test
  - Object arc test
  - Middle drift test
  - Canon rebellion test
  - Reader overload test
  - Regression test (delete-and-verify)
- reference-film regression suite (if applicable)
- ASE LLM-as-judge eval suite (coherence / empathy / surprise / engagement / emotional consistency / complexity)
- StructuralMetrics (arc match / tension variance / consistency errors / Polti diversity / beat diversity / tactic entropy / irony gaps / contradictions resolved / payoffs reached)
- Voice-Differentiation Metric (stylometric)
- Specificity Metric (per-line)
- Surprise Bandwidth Audit
- Reincorporation Density Audit
- Inter-Rater Reliability tracking (if human raters configured)
- Reading-Time Estimation
- Comparable Film Matcher
- Originality Score
- Cliché Density Heatmap
- Demographic Appeal Predictor
- Critical Reception Predictor

**Artifacts produced**: full diagnostic report + benchmark score deltas vs prior commits.

### Stage 27 — Personal Learning Loop (Background)
**Subsystems active** (Perpendicular Layer C made explicit):
- Per-writer LoRA / adapter update from this draft's edits, rejections, and accepts
- Style transfer model refresh
- Reject-pattern mining
- Workflow pattern logging
- Genre mode detection
- Time-of-day sensitivity tracking
- Personal skill library expansion
- Active learning queue (least-confident outputs for writer rating)

**Artifacts produced**: updated per-writer model; next session will produce better-tuned defaults.

### Stage 28 — Autoresearch Optimization (Optional, Background)
**Subsystems active** (Perpendicular Layer D made explicit):
- Karpathy `autoresearch` loop
- `prepare.py` immutable Story Bible (this project)
- `train.py` mutable creative engine (prompts, temperatures, weights, critique-pass logic)
- `program.md` human strategy guide
- Composite `narrative_score = w1·C + w2·S − w3·D`
- Hard-gate constraints (per project — e.g., for GOOB: Armenian context, Future Son twist)
- 30 overnight experiments
- Keep/discard cadence
- Best variants surfaced to writer next morning

**Artifacts produced**: experimental variants ranked by narrative_score; writer chooses or ignores.

### Stage 29 — Series / Cross-Media / Pedagogy / Long-Term
**Subsystems active**:
- Series Bible Maintenance (if part of series)
- Cross-Media Adaptation Engine (if adapting to another medium)
- Pedagogy Mode (if this is a teaching example)
- Long-term project memory
- Comparable-films corpus update

**Artifacts produced**: long-term project assets.

---

## 2. The Worked Example: Locksmith + Piano Short, Stage by Stage

To make the integration concrete, here's the locksmith+piano MVP traced through the full pipeline.

### Inputs
**Writer types in ScriptIDE**:
> "Create a short about a widowed locksmith who refuses to sell his dead wife's piano, until a runaway kid uses it to expose a family secret."

### Outputs After Each Stage

**After Stage 1 (Intent Capture)**:
```yaml
ProjectManifest:
  intent: [logline above]
  protagonist: locksmith (male, ~55, widowed, defensive)
  companion: runaway kid (female, ~12, hidden agenda)
  key_object: piano (wife's, contested)
  wound: grief / widowhood
  genre: drama (intimate, character-driven)
  format: short_film (6 scenes, ~12 min)
  comparable_films: [Up (grief mechanism), The Whale (intimate chamber), Manchester by the Sea (widowhood)]
```

**After Stage 2 (Premise)**:
```yaml
ThemeArgumentGraph:
  central_question: "What do we owe the dead?"
  primary_claim: "Grief disguised as devotion isolates us from the living."
  counter_claim: "Honoring the dead requires not living."
  primary_advocate: kid (lives loudly)
  counter_advocate: locksmith (preserves silence)
  expected_resolution: synthesis (the piano stays AND is played publicly)
  ironic_distance: low (film is WITH characters, empathetic)
  mythic_resonance: Demeter/Persephone (mother-loss recovery), Orpheus (looking back), Lear (recognition through child)
```

**After Stage 3 (Mechanism)**:
```yaml
NarrativeMechanism[1]:
  kind: object_burden
  themeClaim: "Grief disguised as devotion isolates us from the living"
  protagonistWound: "widowhood + over-identification with wife"
  dramaticQuestion: "Will Eli let the piano be played?"
  physicalCarrier:
    type: object
    objectId: piano_001
  governingRules:
    - piano_is_shrine_to_dead_wife
    - piano_contains_family_memory
    - piano_is_communication_medium_with_kid
  loopholes:
    - kid_is_not_buying_just_playing
  costs:
    - keeping_piano = isolation
    - releasing_piano = vulnerability_to_grief
  lifecycle: [seeded, activated, helpful, costly, dangerous, crisis, transformed, resolved]
  escalationPath: 6 mechanism beats mapped to 6 scenes
  climaxProof: "Eli invites public playing"
  endingProof: "Piano's meaning shifts from shrine to shared voice"
  invariants:
    - central_object_must_change_meaning_across_acts
    - climax_must_force_keep_release_reframe_transfer
```

**After Stage 4 (Necessity)**:
```yaml
NecessityCertificate:
  why_now: 
    - today is wife's death anniversary (Eli)
    - kid aged out of foster care yesterday (Maya)
  why_here:
    - shop is only place piano can be (Eli built it for the piano)
    - kid found neighborhood via her late mother's address book
  why_them:
    - kid is Eli's biological granddaughter (the secret)
    - wife had a daughter before marriage; never told Eli
  forcing_function: customer arrives offering double; kid sees through window and chooses this shop
```

**After Stage 5 (Cognition)**:
```yaml
Eli (CharacterMind):
  big_five: {openness: 0.2, conscientiousness: 0.85, extraversion: 0.15, agreeableness: 0.5, neuroticism: 0.7}
  attachment_style: anxious_avoidant (loss-conditioned)
  IFS_dominant_part: Exile (grief) + Manager (avoidance)
  vaillant_defense: intellectualization + sublimation (locksmithing as control)
  maslow_level_active: belonging (unmet) + safety (self-imposed)
  erikson_stage: integrity_vs_despair
  somatic_markers:
    - piano = warmth + chest_tightness
    - cash_offers = recoil
    - young_voices = melted_alarm
  primary_goal: preserve_wife_memorial
  secondary_goals: maintain_routine, avoid_emotion
  trauma_event: wife_died_18_months_ago_suddenly
  subconscious_layer:
    recurring_image: wife_at_piano_back_turned
    dissociation_trigger: piano_sound

Maya (CharacterMind):
  big_five: {openness: 0.85, conscientiousness: 0.4, extraversion: 0.6, agreeableness: 0.55, neuroticism: 0.65}
  attachment_style: anxious-preoccupied (foster-system)
  IFS_dominant_part: Firefighter (running, hiding) + Exile (longing for family)
  vaillant_defense: humor + altruism (mature for age)
  maslow_level_active: safety (unmet) + belonging (unmet)
  erikson_stage: identity_vs_role_confusion (premature)
  primary_goal: find_grandfather_safely
  secondary_goals: not_be_returned_to_system, learn_truth_about_mother
  hidden_intentions: 
    - knows_eli_is_grandfather
    - withholding_until_safe
```

**After Stage 6 (Relationships)**:
```yaml
relationship[Eli, Maya]:
  initial_affect: 0 (haven't met)
  trajectory_target: rupture_then_repair_then_synthesis
  dialectic: protectionControl ↔ dependenceAgency
  
relationship[Eli, wife_memory]:
  affect: {love: 0.9, longing: 1.0, guilt: 0.3}
  unresolved_debts: [unspoken_thanks, unspoken_apologies]
  
relationship[Maya, dead_mother]:
  affect: {longing: 0.95, anger: 0.5, idealization: 0.7}
  ruptureHistory: [abandonment_by_death]
```

**After Stage 7 (World State)**:
```yaml
NarrativeState.locations:
  - locksmith_shop: small, well-ordered, dusty piano in back
  - piano_room: shrine-like, small framed sketch on wall
  - alley_behind_shop: maya's hiding spot
  - neighborhood: golden-hour exterior for Scene 6
  
atomic_facts (selected):
  - {subject: piano, predicate: belongs_to, object: wife, layer: objective, validFrom: 1992}
  - {subject: piano, predicate: not_for_sale, object: any_price, layer: eli_belief, validFrom: 2024_01_15}
  - {subject: maya, predicate: biological_grandchild_of, object: eli, layer: objective, validFrom: 2012}
  - {subject: maya, predicate: biological_grandchild_of, object: eli, layer: eli_belief, validUntil: scene_5} # eli doesn't know yet
  - {subject: maya, predicate: knows_grandmother_taught_song, object: true, layer: audience_belief, validFrom: scene_3}
```

**After Stage 8 (Reveals)**:
```yaml
RevealPlan[1]:
  hiddenTruth: maya_is_eli_biological_granddaughter
  revealMode: recognition (via the song)
  knowledgeStates:
    objective_truth: maya_is_grandchild
    audience:
      scene_1: unknown
      scene_3: suspicion_planted (humming)
      scene_4: hypothesis (grandmother_taught_her)
      scene_5: confirmation
    eli:
      scene_1-4: unaware
      scene_5: recognition
    maya:
      scene_1+: knows_throughout (withholding)
  clueEcology:
    - {sceneId: 3, carrier: line, content: "humming fragment of wife's song", visibility: audience_only}
    - {sceneId: 4, carrier: line, content: "my grandmother taught me", visibility: both}
    - {sceneId: 5, carrier: behavior, content: "plays whole song", visibility: both, supportsTruth: maya_is_grandchild}
  misdirections:
    - {sceneId: 2, content: "kid seems like thief", supportsFalseInterpretation: maya_is_burglar}
```

**After Stage 9 (Outline)** — abbreviated:
```
Scene 1 (Setup, 2 min):
  Function: setup
  Mechanism: object_burden seeded
  Pressure: customer offers double; eli refuses
  Reveal action: piano marked as unsellable (no clue yet)
  Necessity: anniversary day
  Target emotional valence: -0.3 (somber, controlled)

Scene 2 (Complication, 1.5 min):
  Function: complication
  Mechanism: object_burden activated (kid touches piano)
  Pressure: kid hides in shop, discovers piano
  Misdirection: kid seems like thief
  Target valence: -0.2 → +0.1 (curiosity)

Scene 3 (Escalation, 2 min):
  Function: escalation
  Mechanism: helpful_but_unstable
  Pressure: kid plays fragment; eli reacts
  Clue planted: humming wife's song (audience-only)
  Target valence: +0.2 → -0.4 (eli's destabilization)

Scene 4 (Reversal, 2 min):
  Function: reveal_preparation
  Mechanism: dangerous
  Pressure: kid says "my grandmother taught me"
  Clue advanced: both audience and eli now suspect
  Target valence: -0.4 → -0.6 (dread)

Scene 5 (Crisis, 2.5 min):
  Function: crisis + recognition
  Mechanism: crisis_to_transformed
  Pressure: kid plays whole song; eli recognizes; truth surfaces
  Reveal: full recognition
  Repair invariant test: eli must pay cost (admit anger at wife's secret) before repair
  Target valence: -0.7 → +0.2 (catharsis)

Scene 6 (Payoff, 2 min):
  Function: payoff
  Mechanism: transformed_resolved
  Pressure: eli invites neighbors; maya plays publicly
  Reincorporation: piano's meaning fully transformed; mirror to Scene 1
  Target valence: +0.6 (warm, earned)
```

**After Stage 10-22 (Per-scene loops execute)** — Scene 1 traced in detail:

**Stage 10**: Module Pressure Scan for Scene 1
```yaml
pressures:
  drama_manager: {urgency: 0.7, recommended: setup}
  cognition_eli: {urgency: 0.6, motivation: anniversary_grief}
  reveal: {urgency: 0.3, recommended: mark_piano_unsellable_no_clue}
  theme: {urgency: 0.8, recommended: establish_premise_via_refusal}
  necessity: {urgency: 0.9, anchor: anniversary}
  specificity: standby
```

**Stage 11**: Decision Council selects setup function, mechanism seeded, customer-offers-cash beat.

**Stage 12**: 16 candidate transitions generated. Examples:
- Candidate A: Customer offers $5K cash, Eli refuses politely. *(Generic — rejected by Specificity Module)*
- Candidate B: Customer offers $5K cash, Eli refuses bluntly, then dusts piano. *(Valid)*
- Candidate C: Customer offers $5K + emotional manipulation ("my daughter plays"). Eli flinches, refuses with edge. *(Strong — anchors necessity)*
- Candidate D: Multiple customers harass over the morning. *(Pacing wrong)*
- ... 12 more

**Stage 13**: Proof Kernel runs. 11 candidates pass Tier 1; 3 fail Tier 2 specificity.

**Stage 14**: Portfolio selects Candidate C (anchors anniversary, has emotional manipulation as hook). Surfaces Candidates B and E as alternates.

**Stage 15**: Scene Plan generated:
- ScenePlan.SceneSpace: shop interior, piano center-frame, customer at door, small framed sketch on wall
- Visual: color (muted blue-gray + one warm wedding-photo accent), low-key lighting, 50mm locked-off, 2.35:1
- Sound: small reverberant shop, no score (silence as significance), wife's-song leitmotif IMPLIED but unplayed
- Dialogue functions needed: refusal, deflection, restrained threat
- Required visual: small framed sketch, dust on piano, locksmith's hands

**Stage 16**: Micro loop runs ~12 turns:
- Customer enters with offer
- Eli turns from dusting; checks small framed sketch
- Customer: "$5,000. Today." (Tactic: pressure)
- Eli: "Not for sale." (Tactic: terminal_close; Voice: clipped; Subtext: "Don't touch what's hers")
- Customer mentions daughter; Eli's StoryOp: APPRAISE_EMOTION (shame + fear + anger), UPDATE_BELIEF (this man uses children)
- Eli: "I think you should leave." (Tactic: ejection; Subtext: "I am defined by my refusal")
- Customer leaves
- Eli stands alone; StoryOp: UPDATE_READER_STATE (suspense += 0.1, curiosity += 0.2)
- Silence beat (no dialogue, locksmith stares at piano)

Per-line VoiceProfile check: passes (Eli's idiolect = clipped, monosyllabic-when-stressed, formal).
Per-line Specificity check: passes (small framed sketch, dust, $5,000 = specific).
Subtext gap check: passes (literal meaning ≠ implied meaning at every Eli line).

**Stage 17**: Dialogue Compiler produces DialogueExchangeIR with 10 validators passing.

**Stage 18**: Screenplay rendered:
```
INT. LOCKSMITH SHOP - DAY

Dust motes drift in light from a high window. ELI VAUGHN (55,
cardigan, careful hands) wipes a cloth across the keys of a 
worn upright. A photograph above the piano: Eli and his wife
MIRA on their long ago, both laughing.

The bell rings.

A CUSTOMER (40s, sharp suit, checkbook in hand) steps inside.

      CUSTOMER
Five thousand. Today.

Eli pauses. Looks at the photograph. Then back.

      ELI
Not for sale.

      CUSTOMER
My daughter plays. She'd love it.

A muscle moves in Eli's jaw.

      ELI
I think you should leave.

The customer waits. Eli doesn't blink. The customer leaves.

Eli stands alone in the dust. The piano stays. He picks up
the cloth. Begins, again.

                                              CUT TO:
```

Sidecar (excerpt):
```json
{
  "lineId": "S1-L7",
  "speaker": "ELI",
  "surface": "Not for sale.",
  "hiddenIntent": "Protect memorial. Refuse to participate in transaction that erases Mira.",
  "tactic": "terminal_close",
  "activeMechanism": "object_burden_seeded",
  "stateDelta": {
    "eli.belief_layers": {"piano_is_sacred": confidence 0.95},
    "reader_state": {"curiosity": +0.15}
  },
  "voiceProfile": "clipped, monosyllabic under stress",
  "subtextGap": "literal meaning: object unavailable. Implied meaning: identity defined by refusal.",
  "proofLinks": ["IntentionalProof:eli-grief-loop", "MechanismProof:object_burden_seed"]
}
```

**Stage 19**: RewriteAgent polishes prose. HAR detects no inconsistencies. Dramaturge global review: "Strong setup. Recommend cutting one beat — customer's 'my daughter plays' line is on-the-nose. Consider showing him with a child's photo in wallet instead."

**Stage 20**: 13 proofs re-run. All pass except SubtextProof flags "my daughter plays" as borderline. Writer chooses to keep — explicit pressure justifies on-the-nose-ness here.

**Stage 21**: Cockpit updates. Mechanism inspector shows piano arc at "seeded." Reveal timeline shows clue planting scheduled for Scene 3. Eli's belief map shows new propositions. Reader-state curve plotted.

**Stage 22**: Loop advances to Scene 2.

[Scenes 2-6 run with same pipeline. State accumulates. Mechanism escalates. Maya hums in Scene 3 (audience suspicion). Maya says "grandmother" in Scene 4 (Eli's suspicion). Maya plays the full song in Scene 5 (recognition crisis). Eli invites neighbors in Scene 6 (transformation).]

**After Stage 23 (End-of-Script Global Passes)**:
- Plot Structure: Classical 6-scene short, ✓
- Reincorporation: 100% setups paid off, ✓
- Theme: premise tested via Eli's transformation, counter-premise (Maya's case) acknowledged, synthesis achieved ✓
- Pacing: emotional valence curve matches "Cinderella" arc with bittersweet inflection ✓
- Reader-state: predicted trajectory smooth, no confusion peaks above threshold ✓
- Causal Plot: clean DAG, no orphan nodes ✓
- Editor notes: 3 minor suggestions

**After Stage 24 (Ethics)**:
- Bias audit: female character (Maya) has equal screen time, full agency, named, has goals; passes Bechdel-like tests ✓
- Sensitivity: trauma-informed (widowhood handled with care, abandonment treated with dignity) ✓
- IP: no real persons, no trademarks, no copyrighted music (the song is composed; or alternatively licensed public-domain folk) ✓
- Attribution: ~30% AI-generated, ~70% writer-edited, per-line provenance attached
- WGA disclosure metadata embedded

**After Stage 25 (Production Bridge)**:
- Breakdown: 1 location (locksmith shop), 2 main actors (Eli, Maya), 1 supporting (Customer), 1 hero prop (piano), 1 hero photo (wedding)
- Shot list: 47 shots across 6 scenes
- Budget tag: micro-budget short ($30-80K depending on cast)
- Casting types: Eli (Bryan Cranston / Brian Dennehy archetype), Maya (introspective 12yo)
- Locations: one practical shop interior, one neighborhood exterior for Scene 6
- Pitch document: 1 page, comparable films listed
- Industry exports: .fountain, .fdx, .highland all generated

**After Stage 26 (CI/CD)**:
- 15 regression tests: all pass
- 10 acceptance tests: all pass
- ASE LLM-as-judge: coherence 4.6/5, empathy 4.4/5, surprise 4.1/5, engagement 4.5/5, emotional consistency 4.7/5
- Voice differentiation: stylometric distance Eli-Maya = 0.71 (target > 0.6) ✓
- Specificity per-line average: 0.78 (target > 0.7) ✓
- Surprise bandwidth: 1 micro-surprise per scene, 1 medium reveal mid-script, 1 large reveal Scene 5 ✓
- Reincorporation density Act 3: 84% (target > 70%) ✓
- Originality vs reference-film corpus: distance > threshold ✓
- Cliché density: low ✓

**After Stage 27 (Personal Learning)**:
- Writer accepted 73% of suggestions, edited 22%, rejected 5%
- Rejection patterns: writer dislikes auto-generated camera direction (rejected 80% of DeepShot suggestions) → reduce camera-direction confidence for future
- Writer added "anniversary as necessity anchor" to personal skill library
- Per-writer LoRA updated

**After Stage 28 (Optional Autoresearch)**:
- 30 overnight variants generated
- Best variant: alternate Scene 5 with longer silence before recognition; +6% on narrative_score
- Surfaced to writer for review

**After Stage 29 (Long-Term)**:
- Project saved to writer's portfolio
- If writer plans feature expansion, Series Bible scaffolding offered
- If writer wants to teach this, Pedagogy Mode can annotate the script

---

## 3. The Module Catalog (Where Every Subsystem Lives)

Every named subsystem from the archive + NVM + completion + judgment work maps to one row below. The table answers: *for any concept you remember reading about, where does it live in the integrated system?*

| Subsystem | Lives In Stage(s) | Emits / Validates |
|---|---|---|
| BDI Goal DAG | Cognition Module (Stage 5, 16) | UPDATE_BELIEF, ModulePressure |
| Memory Stream + Reflection | Cognition Module (Stage 5, 16) | xMemory writes, ADD_FACT |
| xMemory 4-level hierarchy | Cognition Module (Stage 5) | hierarchical retrieval |
| EmotionalRAG | Cognition Module (Stage 5) | emotion-congruent retrieval |
| OCC Emotion | Cognition Module + EMA pipeline (Stage 5, 16) | APPRAISE_EMOTION |
| Emotion Contagion | Relationship Module (Stage 6, 16) | APPRAISE_EMOTION |
| EMA 6-step pipeline | Cognition Module (Stage 16) | full emotion lifecycle |
| Mood (PAD) | Cognition Module (Stage 5, 16) | mood drift state |
| ToM² PAL + visibilityModel | Cognition Module (Stage 5, 16) | nested-belief updates |
| EvolvTrip ToM triples | Cognition Module (Stage 5) | belief / desire / intention / emotion triples |
| TOMA chain-of-thought | Cognition Module (Stage 16) | structured ToM reasoning |
| Festinger dissonance | Cognition Module (Stage 16) | dissonance score, defense triggers |
| Vaillant defense hierarchy | Cognition Module (Stage 5, 16) | defense mechanism selection |
| IFS Parts | Cognition Module (Stage 5, 16) | inner-conflict modeling |
| Attachment Theory | Cognition Module (Stage 5) | relationship behavior modulation |
| Somatic markers | Cognition Module (Stage 5, 16) | gut-level bias |
| Counterfactual ledger | Cognition Module (Stage 5) | "what if" tracking |
| Implicit / explicit belief split | Cognition Module (Stage 5) | shadow belief layer |
| Maslow level + Erikson stage | Cognition Module (Stage 5) | need-hierarchy override, life-stage filter |
| PCL Role Chain | Prompts (Stage 16) | identity scaffold every 5 turns |
| Big Five + Dark Triad | Cognition Module (Stage 5) | personality filter |
| QD Character Generation | Cognition Module (Stage 5) | 5-variant character generation |
| Interpersonal Circumplex | Relationship Module (Stage 6) | (Agency, Communion) per dyad |
| CICERO Trust Model | Relationship Module (Stage 6, 16) | trust decay, betrayal detection |
| Gottman dynamics | Relationship Module (Stage 6, 16) | relationship-event deltas |
| Coalition Tracker | Relationship Module (Stage 6, 22) | coalition formation/decay |
| Repair Invariant | Relationship Module (Stage 5, 13) | RelationshipProof gating |
| Drama Manager | Drama Manager Module (Stage 10-11, 22) | ModulePressure aggregation |
| 5-Feature Tension | Drama Manager Module (Stage 16, 22) | tension scoring (weights labeled as hyperparameters) |
| Gervás expectation-violation | Drama Manager Module (Stage 16) | tension reformulation |
| TTD-MDPs (future) | Drama Manager Module (long-term) | trajectory distributions |
| Pacing Controller (Yang 2023 CONCOCT) | Pacing Module (Stage 16, 22) | RAISE_CLOCK, pacing override |
| Dramatic Irony Tracker | Drama Manager Module (Stage 22) | irony gap detection |
| Information Gap Tracker | Drama Manager Module (Stage 22) | curiosity gap detection |
| Intervention Vocabulary | Drama Manager Module (Stage 11, 16) | beat-level interventions |
| Drama Llama Storylets | Drama Manager Module (Stage 9, 22) | NL beat triggers |
| ASP Beat Sequence Constraints | Pacing Module / Outliner (Stage 9) | constraint solver |
| Emotional Arc Engine (6 types) | Pacing Module (Stage 9, 23) | valence curve targeting |
| IllusionArc + Chekhov Tracker | Reveal Module (Stage 8, 22) | SEED_CLUE, PAYOFF_SETUP |
| Sternberg triad | Reveal Module (Stage 8) | curiosity/suspense/surprise mode |
| Clue Ecology (8 carriers) | Reveal Module (Stage 8) | typed clue planting |
| Prestige Readiness | Reveal Module (Stage 22) | reveal-timing score |
| Dramatis P(escape)=0 dread | Reveal Module (Stage 22) | dread-state detection |
| Information Theory sweet-spot | Reveal Module (Stage 22) | 40-70% expectation tuning |
| Theme Engine | Theme Module (Stage 2, 23) | ADVANCE_THEME_ARGUMENT |
| Egri Premise | Theme Module (Stage 2) | premise / counter-premise |
| Walton/Toulmin argumentation | Theme Module (Stage 2, 22) | argument graph |
| Mythic Resonance | Theme Module (Stage 2) | myth match |
| Ironic Distance | Theme Module (Stage 2) | tonal stance |
| Genre Engine | Genre Module (Stage 9, 15, 22) | genre convention pressure |
| Subgenre / Era / Hybrid logic | Genre Module (long-term) | convention overlays |
| FactTrack temporal facts | World Module (Stage 7) | ADD_FACT, EXPIRE_FACT |
| Allen Interval Algebra | World Module (Stage 7, 13) | TemporalProof |
| Event Calculus | World Module (Stage 7) | fluent lifecycle |
| Causal Graph (R²) | World Module + Causal Plot Constructor (Stage 23) | causal coherence |
| Pearl's Ladder enforcement | World Module + Proof Kernel (Stage 13) | CausalProof |
| Shadow-Loom architecture | Whole substrate (NVM) | LLM-at-boundary discipline |
| ConStory-Bench 19 subtypes | CI/CD (Stage 26) | consistency auditing |
| Spatial Engine (3D LCS) | World Module (Stage 7, 15) | SpatialProof |
| Sonic Occlusion | World Module + Sound Module (Stage 15) | SpatialProof for sound |
| Prop State Machines | World Module (Stage 7) | object state lifecycle |
| Asset Dependency Graphs | World Module (Stage 7) | prop affordance gating |
| Historical Accuracy | World Module (Stage 7) | period validity |
| G-KMS Lorebook | World Module (Stage 7) | world law inheritance |
| Central Law | Mechanism Compiler (Stage 3) | theme→mechanism→...→scene |
| Mechanism Compiler MVP (3 mechanisms) | Mechanism Compiler (Stage 3) | MechanismProof |
| Object Burden / Legitimacy Split / Relationship Externalization | Mechanism Compiler (Stage 3) | specific mechanism kinds |
| Full 20+ mechanism library | Mechanism Compiler (long-term) | post-MVP additions |
| MINSTREL TRAM | Mechanism Compiler (long-term) | template variation |
| Scene Planner | Scene Planner (Stage 15) | ScenePlan |
| RST Discourse Composer | Scene Planner (Stage 15) | scene-relation structuring |
| Scene Purpose Classifier (McKee) | Scene Planner (Stage 15) | orphan-scene detection |
| Necessity Engine | Necessity Module (Stage 4, 10) | NecessityProof |
| DeepShot Cinematography | Visual Module (Stage 15) | shot list metadata |
| Color Script Engine | Visual Module (Stage 15) | per-scene palette |
| Light & Shadow Engine | Visual Module (Stage 15) | lighting mood |
| Composition Grammar | Visual Module (Stage 15) | framing rules |
| Production Design Semiotics | Visual Module (Stage 15, 25) | symbolic prop assignment |
| Tableau / Stage Picture | Visual Module (Stage 15) | character placement |
| Costume as Character | Visual Module (Stage 15, 25) | costume arc per character |
| Aspect Ratio Engine | Visual Module (Stage 15) | format choice |
| Editing Rhythm Grammar | Visual Module (Stage 18, 23) | transition library |
| Match-Cut Sequencer | Visual Module (Stage 18) | match-cut suggestions |
| Sound Design Engine | Sound Module (Stage 15) | sound annotation |
| Score Engine + leitmotif | Sound Module (Stage 15) | per-scene music cues |
| Voice Performance Cues | Sound Module + Dialogue Module (Stage 16, 17) | per-line VO direction |
| Specificity Engine | Specificity Module (Stage 13, 16, 17, 20) | SpecificityProof, per-line rejection |
| Reincorporation Engine | Reincorporation Module (Stage 22, 23) | setup/payoff audit, ReincorporationProof |
| Mirror Scene Engine | Mirror Scene Module (Stage 15, 22, 23) | parallel-scene tracking |
| Surprise Bandwidth Engine | Surprise Module (Stage 13, 22, 23) | SurpriseProof, micro-surprise audit |
| Anti-Sentimentality Engine | Anti-Sentimentality Module (Stage 14, 19) | flag over-stated emotion |
| Voice Module (idiolect) | Voice Module (Stage 16) | VoiceProof, voice compliance |
| StyleChat Style Thought Chain | Voice Module + Prompts (Stage 16) | per-turn voice recitation |
| Quantitative VoiceProfile | Voice Module (Stage 16) | targetAvgWordsPerSentence et al |
| Voice Divergence Monitor | Drama Manager Module (Stage 22) | pairwise stylometric distance |
| Verbal tics / catchphrases / private vocabularies | Voice Module (Stage 5, 16) | per-character idiolect |
| Disfluency Modeling | Voice Module (Stage 16) | hesitation under pressure |
| Dialogue Engine (10 validators) | Dialogue Module (Stage 17) | DialogueProof |
| Speech Acts (Austin/Searle) | Dialogue Module (Stage 17) | force/effect annotation |
| Gricean Maxim Flouting | Dialogue Module + Subtext Module (Stage 17) | subtext-via-flouting |
| Brown-Levinson Politeness | Dialogue Module (Stage 16) | FTA strategy selection |
| Conversation Analysis | Dialogue Module (Stage 17) | turn-taking, adjacency pairs |
| Argumentation Schemes | Dialogue Module (Stage 17) | argument structure |
| Rhetorical Device Library | Dialogue Module (Stage 17) | named device selection |
| Code-Switching / Register | Dialogue Module (Stage 16) | per-context style shift |
| SubtextLayer (8 techniques) | Subtext Module (Stage 16, 17) | SubtextProof, pre-LLM constraint |
| Silence Engineering | Dialogue Module (Stage 17) | BeatOfSilence as line type |
| RewriteAgent (Simulate-then-Rewrite) | Post-Processing (Stage 19) | polish raw simulation |
| HAR (Hallucination-Aware Refinement) | Post-Processing (Stage 19) | 2-iter inconsistency check |
| Plug-and-Play Dramaturge (3-stage) | Post-Processing (Stage 19) | refinement passes |
| HoLLMwood Editor Agent | Post-Processing (Stage 19, 23) | review-only notes |
| FilmAgent Debate-Judge | Post-Processing (Stage 19) | triangulated consistency |
| FilmAgent Cinematographer | Visual Module (Stage 15) | scene direction metadata |
| Screenplay Compiler + Sidecar | Render (Stage 18) | clean Fountain + sidecar |
| Industry Format Exports | Production Bridge (Stage 25) | FDX, Highland, etc. |
| Reader State (Cheong-Young suspense) | Reader Simulator (Stage 22, 23) | ReaderStateProof |
| Curiosity / Suspense / Surprise | Reader Simulator (Stage 23) | reader-state curves |
| Memory-Trace Decay Risk | Reader Simulator (Stage 22, 23) | setup decay warning |
| Demographic Audience Submodels | Audience Module (long-term) | per-segment prediction |
| Genre Sophistication Modeling | Audience Module (long-term) | sophistication-aware reveal |
| Theory-of-Mind of the Reader | Audience Module (long-term) | meta-reveal subversion |
| Confusion Tolerance | Reader Simulator (Stage 23) | art-film vs blockbuster |
| Re-Watch Reward | Audience Module (long-term) | hidden-detail planting |
| Plot Mode Selector (Classical / Mini / Anti) | Plot Structure Module (Stage 9) | mode selection |
| Multi-Timeline Solver | Plot Structure Module (long-term) | analepsis/prolepsis/parallel/reverse/loop |
| Frame Narrative Logic | Plot Structure Module (long-term) | nested narration |
| Meta-Narrative Layer | Plot Structure Module (long-term) | self-aware narration |
| Pinch-Point Engine | Plot Structure Module (Stage 9, 23) | structural pressure points |
| MCTS Branch Explorer | What-If Branching (Stage 21) | UCT-based exploration |
| Branch-and-Bottleneck | Plot Structure / Drama Manager (Stage 22) | enforce convergence |
| WhatELSE bidirectional | Cockpit (Stage 21) | abstract↔instantiate |
| ScriptIDE Cockpit (14 panels) | Cockpit (Stage 21) | UI |
| Director's Cut Mode | Cockpit (Stage 21) | mid-simulation override |
| Harvest Mode | Cockpit (Stage 21) | scene browsing/refining |
| What-Breaks-If-Removed | Cockpit + CI/CD (Stage 21, 26) | dependency analysis |
| Constella FRIENDS DISCOVERY | Cockpit (Stage 1, 21) | character suggestion |
| Constella JOURNALS | Cockpit (Stage 21) | private journal per character |
| Constella COMMENTS | Cockpit (Stage 21) | relationship preview |
| Outline Mode | Cockpit (Stage 9) | beat-board UI |
| Treatment Mode | Cockpit (long-term) | prose-fidelity mode |
| Three-Fidelity Pipeline | Cockpit (long-term) | Treatment↔Outline↔Script |
| Character Bible Builder | Cockpit (Stage 1) | guided creation |
| World Bible Builder | Cockpit (Stage 1) | guided creation |
| Coverage Generator | Cockpit (Stage 25) | one-page coverage |
| Read-Aloud / Table Read Mode | Cockpit (long-term) | TTS scene playback |
| Pacing Curve Panel | Cockpit (Stage 21) | pacing visualization |
| Outline / Beat Panel | Cockpit (Stage 21) | beat editing |
| Multi-Format Output | Production Bridge (Stage 25) | FDX/Highland/Fountain/etc. |
| Breakdown Sheets | Production Bridge (Stage 25) | locations / props / characters / costumes |
| Shot List Generation | Production Bridge (Stage 25) | per-scene shot list |
| Budget Implication Tagging | Production Bridge (Stage 25) | cost-driver tags |
| Casting Type Tags | Production Bridge (Stage 25) | physical/voice/skill specs |
| Location Scouting Hints | Production Bridge (Stage 25) | location requirements |
| Production Schedule | Production Bridge (Stage 25) | day-out-of-days |
| Director-Style Application (.skill) | Production Bridge (Stage 25) | auteur style transfer |
| Trailer Beat Selector | Production Bridge (Stage 25) | 90-second cut |
| Pitch Document Generator | Production Bridge (Stage 25) | logline+synopsis+treatment+comparables |
| Festival Submission Package | Production Bridge (Stage 25) | cover/synopsis/bio |
| ASE LLM-as-Judge | CI/CD (Stage 26) | multi-dim eval |
| StructuralMetrics | CI/CD (Stage 26) | arc/consistency/diversity/tension |
| Inter-Rater Reliability | CI/CD (long-term) | Krippendorff's α |
| A/B Test Infrastructure | CI/CD (long-term) | reader testing |
| Reading-Time Estimation | CI/CD (Stage 26) | minutes per scene |
| Comparable Film Matcher | CI/CD + Cockpit (Stage 1, 26) | nearest-film embedding |
| Originality Score | CI/CD (Stage 26) | corpus-distance |
| Cliché Density Heatmap | CI/CD (Stage 26) | per-line cliché score |
| Demographic Appeal Predictor | Audience Module + CI/CD (Stage 26) | per-segment prediction |
| Critical Reception Predictor | CI/CD (long-term) | review-corpus prediction |
| Award-Likelihood Estimation | CI/CD (long-term) | awards-friendly element detection |
| Reference-Film Regression Suite | CI/CD (Stage 26) | 7-film regression |
| Bechdel-Wallace + family | Ethics Module (Stage 24) | representation tests |
| Multi-Axis Bias Auditor | Ethics Module (Stage 24) | per-axis scoring |
| Sensitivity Reader Pass | Ethics Module (Stage 24) | trauma-informed audit |
| Cultural Appropriation Detector | Ethics Module (Stage 24) | provenance check |
| Power Dynamics Audit | Ethics Module (Stage 24) | screen-time/lines/agency |
| IP / Copyright / Trademark Guard | Ethics Module (Stage 24) | IP risk scan |
| Defamation Risk Scan | Ethics Module (Stage 24) | real-person check |
| Trauma-Informed Generation | Ethics Module (Stage 24) | violence/abuse handling |
| Mental Health Sensitivity | Ethics Module (Stage 24) | suicide/self-harm rails |
| Representational Justice (V4) | Ethics Module (Stage 24) | trope penalty |
| Authorship Attribution (per-line) | Provenance Layer (Stage 24) | AttributionProof |
| WGA-Compliant Disclosure | Provenance Layer (Stage 24) | disclosure metadata |
| AI Content Watermarking | Provenance Layer (Stage 24) | invisible provenance |
| Confidence-Weighted Output | Provenance Layer (Stage 24) | per-line confidence |
| Failure Mode Transparency | Cockpit + Provenance (Stage 21, 24) | "I don't know" outputs |
| Reasoning Trace UI | Cockpit (Stage 21) | inference_trace visible |
| Per-Writer LoRA / Adapter | Personal Learning Loop (Stage 27) | fine-tuned style |
| Style Transfer | Personal Learning Loop (Stage 27) | "write like my last script" |
| Reject-Pattern Mining | Personal Learning Loop (Stage 27) | suppress unwanted suggestions |
| Workflow Pattern Learning | Personal Learning Loop (Stage 27) | proactive mode suggestion |
| Genre Mode Detection | Personal Learning Loop (Stage 27) | comedy mode etc. |
| Personal Skill Library | Personal Learning Loop (Stage 27) | writer's saved patterns |
| Active Learning Queue | Personal Learning Loop (Stage 27) | least-confident outputs for rating |
| Few-Shot Personalization | Personal Learning Loop (Stage 27) | 5-10 lines tune prompts |
| Autoresearch Loop | Autoresearch Layer (Stage 28) | overnight optimization |
| narrative_score | Autoresearch Layer (Stage 28) | composite metric |
| prepare.py / train.py / program.md | Autoresearch Layer (Stage 28) | three-file contract |
| Hard-Gate Constraints | Autoresearch Layer (Stage 28) | per-project guards |
| Series Bible | Cross-Media Layer (Stage 29) | series continuity |
| Cross-Media Adaptation | Cross-Media Layer (Stage 29) | novel↔script↔stage↔game↔comic |
| Spin-off / Sequel Logic | Cross-Media Layer (Stage 29) | character/mechanism continuity |
| Shared Universe Constraints | Cross-Media Layer (long-term) | crossover rules |
| Pedagogy Mode | Pedagogy Layer (Stage 29) | annotation + teaching |
| Exercise Generator | Pedagogy Layer (long-term) | writing exercises |
| Master-Class Mode (.skill) | Pedagogy Layer (Stage 29) | apply auteur process |
| Interactive Fiction Mode | Live/Interactive Layer (long-term) | choice-driven generation |
| Live Improv Support | Live/Interactive Layer (long-term) | scene starters |
| Video Game Narrative | Live/Interactive Layer (long-term) | branching narrative |
| TTRPG Integration | Live/Interactive Layer (long-term) | DM assistance |
| Streaming Live Generation | Live/Interactive Layer (long-term) | audience-influenced |
| Multi-Author / Writers' Room | Collaboration Layer (long-term) | shared editing |
| Showrunner Mode | Collaboration Layer (long-term) | one curating many |
| Role-Based Access | Collaboration Layer (long-term) | permission granularity |
| Branch / Merge for Narrative | Collaboration Layer + StoryCommit | uses NVM substrate |
| Audit Trail | Collaboration Layer + Provenance | every change attributed |
| API for Third-Party | Operations Layer (long-term) | platform extensibility |
| Plugin Architecture | Operations Layer (long-term) | third-party modules |
| Marketplace | Operations Layer (long-term) | director profiles, genre packs |
| Enterprise Mode | Operations Layer (long-term) | SSO, audit, security |
| Telemetry & Privacy Controls | Operations Layer + Cost Telemetry | opt-in/out granular |
| Localization | Operations Layer (long-term) | i18n, RTL, CJK |
| Mobile / Tablet Workflow | Cockpit (long-term) | capture on the go |
| Distraction-Free Writing Mode | Cockpit (long-term) | minimalist UI |
| Accessibility Modes | Cockpit (long-term) | a11y |
| Audio Note Integration | Cockpit (long-term) | voice memos |
| Reader / Producer Comments | Cockpit (long-term) | stakeholder feedback |
| Comparison View (draft A vs B) | Cockpit (long-term) | semantic-block diff |
| Reference Management | Cockpit (long-term) | "this scene inspired by X" |
| Revision Tracking with Reasons | Cockpit + StoryCommit (Stage 20) | every change has rationale |

That's every named subsystem from every research track. None is orphaned. Each has a home.

---

## 4. The Control Flow — Who Decides What When

The integration question that determines whether the system actually runs is: **who decides what happens next?** Here's the answer at each scale.

### Macro (per project)
The **writer** decides at the project level. The engine proposes intent parsing, premise, mechanism, outline, and audience targets — the writer accepts, edits, or rejects each. The engine never silently changes project-level decisions.

### Meso (per scene)
The **Story Decision Council** decides which scene happens next, given the Module Pressure Scan. The writer can override via Director's Cut Mode at any point. Decision rationale (whyNow, rejectedOptions) is always visible in the Cockpit. The Council weights pressures using configurable per-project priorities — by default: theme proof > mechanism advancement > reveal readiness > pacing > genre compliance > authorial preference.

### Micro (per turn)
The **agents** decide via BDI + ToT-lite + tactic deliberation. Each agent's decision is shaped by Cognition Module's full machinery (BDI / Memory / OCC / ToM² / dissonance / pressure / Maslow / attachment / etc.). The Drama Manager Module *cannot* directly override agent decisions — it can only inject pressure (via PRE_TURN_STEER intervention) or pivot the scene (via MID_TURN_OVERRIDE), with logging.

### Candidate Selection
The **Proof Kernel** decides which candidates are valid. The **Quality-Diverse Portfolio + Selection Law** ("strangest valid") chooses among valid candidates. The **Writer Style Adapter** biases selection toward this writer's preferences. The writer sees alternates and can swap.

### Post-Processing
The **RewriteAgent → HAR → Dramaturge → Editor → CI/CD** pipeline decides whether the scene ships. Any failure escalates to the writer with diagnostics. Writer always has final approval (`authorApproved` boolean in StoryCommit).

### Ethics
The **Ethics Module** decides whether output is shippable on ethical grounds. Failures are surfaced as flags, never auto-rewrites. The writer makes final call but with full transparency about what was flagged and why.

The principle throughout: **the engine decides what's valid; the writer decides what's good.** The engine's job is to filter out invalid (proofs fail) and surface diverse valid candidates. The writer's job is to choose among them and own the result.

---

## 5. The Data Flow — What State Lives Where

```
            ┌────────────────────────────────────┐
            │     NarrativeState (live)          │
            │     [in memory + Postgres backing] │
            │                                     │
            │  - objectiveReality (TemporalFacts) │
            │  - characterBeliefStates            │
            │  - audienceState                    │
            │  - authorIntent                     │
            │  - fabula + syuzhet                 │
            │  - eventGraph + causalGraph         │
            │  - characters + relationships       │
            │  - mechanisms + objectArcs          │
            │  - revealPlans + themeGraph         │
            │  - genreContracts                   │
            │  - readerSimulation                 │
            │  - provenance                       │
            └──┬─────────────────────────────┬───┘
               │                              │
       reads from│                            │writes via StoryOps
               ▼                              ▲
       ┌───────────────────────┐    ┌─────────────────────────┐
       │  NarrativeModule.x[]  │    │  StoryCommit Ledger     │
       │  (every engine)       │───→│  (append-only, branched)│
       │                       │    │                          │
       │  inspect(state)       │    │  - factDeltas            │
       │  propose(state, p)    │    │  - beliefDeltas          │
       │  validate(trans, st)  │    │  - relationshipDeltas    │
       │  repair(finding, st)  │    │  - emotionDeltas         │
       │  explain(id, state)   │    │  - objectDeltas          │
       │                       │    │  - mechanismDeltas       │
       └───────────────────────┘    │  - revealDeltas          │
                                     │  - themeDeltas           │
                                     │  - readerDeltas          │
                                     │  - diagnostics           │
                                     │  - authorApproved        │
                                     └─────────────────────────┘
                                                │
                                                ▼
                                     ┌─────────────────────────┐
                                     │  Rendered Artifacts     │
                                     │                          │
                                     │  - clean_fountain        │
                                     │  - annotated_fountain    │
                                     │  - sidecar (line-level)  │
                                     │  - shot list             │
                                     │  - breakdowns            │
                                     │  - pitch document        │
                                     │  - industry exports      │
                                     │  - pedagogy annotations  │
                                     └─────────────────────────┘
```

**Storage tiers**:
- **In-memory**: live `NarrativeState` during a session.
- **PostgreSQL + JSONB**: persisted `NarrativeState` snapshots, `StoryCommit` ledger, characters, relationships, mechanisms, scenes, dialogue, all tables.
- **pgvector**: embeddings for memory retrieval (xMemory), genericness detection, comparable-film matching.
- **Redis**: hot caches, prompt-cache tiers, session state for active simulations.
- **S3-compatible**: rendered artifacts, sidecar, exports, backups, screenshot assets.
- **OpenTelemetry traces / Prometheus metrics**: observability across the whole pipeline.

**Provenance is a first-class column**: every StoryOp, every belief, every line, every commit has a `provenance` field pointing to its origin (user / model / model_rewritten / licensed_source / public_domain / project_canon / derived_annotation).

---

## 6. The Failure Mode Map — What Happens When Things Break

The integrated system has 13 named failure modes, each with a specific handler.

| Failure | Detection Stage | Handler |
|---|---|---|
| Tier 1 proof fails | Stage 13 | Candidate eliminated; if no candidates survive, escalate to writer with diagnostic |
| Tier 2 proof fails | Stage 13 + 20 | `repair()` method attempted; if irreparable, flag to writer |
| Voice differentiation drops | Stage 22 | Drama Manager fires VOICE_DIFFERENTIATION pacing hint; if persistent 3 rounds, escalate |
| Sentiment watchdog (3+ positive rounds) | Stage 22 | Drama Manager fires APPLY_PRESSURE intervention |
| Reveal premature | Stage 22 | Reveal Module rejects; suggest setup-strengthening scene |
| Repair without cost | Stage 13 | RelationshipProof fails; force harm-acknowledgement + cost beat first |
| Generic dialogue | Stage 16 + 20 | Specificity Engine rejects line; LLM retry with detail mandate; if 2 fails, escalate |
| Goal drift | Stage 22 | Consistency Checker flags; Cognition Module re-runs goal DAG |
| Middle drift (5 scenes no escalation) | Stage 22 | Mechanism Compiler fires escalation pressure; Drama Manager forces complication |
| LLM API failure | Any | Circuit breaker opens; `runAgentWithFallback` → deterministic SILENCE action; session continues |
| Cost overrun | Any | Cost telemetry alerts; switch to Haiku/Flash for non-critical calls |
| Ethics gate fails | Stage 24 | Flag surfaced to writer; never silent rewrite |
| Session crash | Any | Session persistence rehydrates from last `StoryCommit`; simulation resumes |

The system is **fail-loud, not fail-silent**. Every failure is logged, surfaced, and recoverable. The Integration Test Harness (M1.5 from the Audit) verifies all 13 failure modes are detected.

---

## 7. The Build Sequence — From Zero to /godmode

### Week 0–2: Substrate (NVM Phases 0–3)
**Lane A (Runtime)**: Build NarrativeState, StoryCommit ledger, StoryOp dispatcher, NarrativeTransitionIR, ExecutableTransition, base Proof Kernel (Tier 1), pgvector, Redis cache.
**Lane B (Intelligence)**: Stub modules with `inspect/propose/validate/repair/explain` no-ops; Mechanism Compiler MVP with 3 mechanisms only.
**Lane C (Evaluation)**: Build M1.5 integration test harness + the 10 acceptance tests as stubs.
**Lane D (Product)**: Minimal Cockpit shell, NarrativeState diff viewer, StoryCommit log viewer.
**Exit**: Locksmith+piano scenario representable as facts + beliefs + deltas, no prose.

### Week 3–4: Core Content Modules (NVM Phases 4–5)
**Lane A**: Wire StoryOp emission into module proposal paths.
**Lane B**: Implement Cognition Module (BDI + Memory + OCC + ToM² + Festinger + Maslow + the depth additions: Vaillant + IFS + attachment + somatic), Relationship Module (Circumplex + CICERO + Gottman + repair invariants + coalition), Drama Manager Module (Module Pressure Scan + Story Decision Council).
**Lane C**: Wire 13 proofs to validation pipeline.
**Lane D**: Cockpit panels: character belief map, relationship graph, pressure visualizer.
**Exit**: Eli and Maya are alive in the simulation; agent decisions trace through full machinery; first scene's micro-loop runs.

### Week 5–6: Outline → Scene → Dialogue → Render Pipeline (NVM Phases 6–11)
**Lane A**: Candidate search loop, Quality-Diverse Portfolio, Scene Planner, Dialogue Compiler, Screenplay Compiler + Sidecar.
**Lane B**: Reveal Module + Theme Module + Reader Simulator + Necessity Module + Specificity Module + Voice Module + Subtext Module + Pacing Module + Genre Module.
**Lane C**: reference-film regression suite (7-film) running as CI gate.
**Lane D**: Cockpit: outline editor, scene editor, mechanism inspector, reveal timeline, harvest mode, director's cut mode.
**Exit**: Locksmith+piano short generates end-to-end Fountain + sidecar; the locksmith MVP demo works.

### Week 7–8: Post-Processing + CI + Ethics + Production Bridge (NVM Phases 12–17)
**Lane A**: RewriteAgent + HAR + Dramaturge + Editor + Debate-Judge.
**Lane B**: Reincorporation Module + Mirror Scene Module + Surprise Module + Anti-Sentimentality Module + Production Bridge Module + Ethics Module.
**Lane C**: 15 regression tests + 10 acceptance tests + ASE eval + StructuralMetrics all running on every commit.
**Lane D**: Cockpit: ethics dashboard, production bridge panel, multi-format export, pitch document generator, coverage generator.
**Exit**: First 5 screenwriter testers can run the system end-to-end on the locksmith short and produce an industry-format export.

### Week 9–24: Depth Upgrades + Specialty Modules (Phases 2–4 of completeness)
- Visual Module deep (Color Script + Light/Shadow + Composition + Tableau + Costume + Aspect + Editing Rhythm + Match-Cut)
- Sound Module deep (Score + Leitmotif + Foley + Acoustic Space)
- Dialogue Module deep (Speech Acts + Grice + Brown-Levinson + Conversation Analysis + Rhetorical Devices)
- Theme Engine deep (Egri + Walton + counter-premise + symbolic density + mythic resonance)
- Plot mode selector + multi-timeline solver
- Multi-author / collaboration mode v1
- Cross-media adaptation v1 (novel↔script)

### Week 25–48: Audience Modeling + Personal Learning + Specialty Plot (Phases 5–8)
- Demographic audience submodels
- Genre sophistication modeling
- Per-writer LoRA / adapter
- Style transfer
- Reject-pattern mining
- Pedagogy mode
- Series Bible maintenance

### Week 49–80: Ethics Rigor + Live/Interactive + Autoresearch (Phases 9–11)
- Multi-axis bias auditing rigorous
- Sensitivity reader pass rigorous
- Trauma-informed generation
- Authorship attribution comprehensive
- WGA disclosure metadata
- Watermarking
- Interactive Fiction mode
- Game-narrative branching
- Autoresearch loop wrapping the engine

### Week 81+: Marketplace + Enterprise + Localization (Phase 12)
Operations layer, public API, plugin architecture, marketplace, enterprise mode, internationalization.

---

## 8. The Critical Path Through It All

If you trace the **shortest possible end-to-end run** (logline → screenplay) that exercises every architectural decision, it's this 14-step chain:

1. **Logline parsed** by ScriptIDE.
2. **Premise + Counter-Premise** generated by Theme Engine.
3. **Mechanism selected** (one of three: Object Burden / Legitimacy Split / Relationship Externalization).
4. **Necessity certified** (why now/here/them).
5. **NarrativeState seeded** with characters, relationships, world.
6. **RevealPlan seeded** with clue ecology.
7. **Outline generated** by Pacing Module under genre/arc constraints.
8. **For each scene**: Module Pressure Scan → Decision Council → Portfolio Search (24 candidates) → Proof Kernel filter → Quality-Diverse selection → Scene Plan → Visual+Sound spec → Micro-loop simulation → Dialogue Compiler → Screenplay Render+Sidecar → 13-proof re-validation → StoryCommit.
9. **Global passes**: Reincorporation + Causal Plot + Theme synthesis + Pacing curve + Reader-state.
10. **Post-processing**: RewriteAgent → HAR → Dramaturge → Editor.
11. **Ethics + Provenance** pass.
12. **CI/CD**: 15 regression tests + 10 acceptance tests + reference-film regression + ASE eval.
13. **Production Bridge**: breakdowns + shot list + budget + casting + pitch document + industry export.
14. **Personal Learning Loop** updates per-writer LoRA from edits.

Every architectural primitive participates exactly once in this chain. Nothing is decorative. Nothing is unreachable.

---

## 9. The Final Integration Law

The hybrid system, fully integrated, obeys exactly one operating principle that subsumes everything else:

> **Compile author intent into typed state via mechanism-grounded transitions. Prove every transition. Render only what passes. Audit everything in flight. Learn from every edit. Never lie about provenance. Always show the work. The writer is always the director.**

Every other rule in every other document is a corollary.

### The Subordinate Laws
1. **Central Law** (the screenplay-validated mechanism chain): `theme → mechanism → rule → object/body/ritual → cost → witness → irreversible proof → scene` — what mechanisms must satisfy.
2. **Proof Law**: No transition enters canon unless it passes Tier 1 (Hard Blocks) and survives Tier 2 (Quality Gates) — what canon must satisfy.
3. **Specificity Law**: No generic content. Every line, every detail, every emotion grounded in specific particulars — what content must satisfy.
4. **Show-Don't-Tell Law**: Dialogue carries no more than 40% of dramatic information per scene. The rest is action, environment, subtext — what scenes must satisfy.
5. **Asymmetric Information Law**: Drama lives in the gap between what characters know and what the audience knows — what reveals must satisfy.
6. **Transparency Law**: Every output has confidence + provenance + reasoning trace. No black boxes — what trust must satisfy.
7. **Specificity-of-Necessity Law**: Every scene answers Why now / here / them with specific particulars — what beats must satisfy.
8. **Reincorporation Law**: Act 3 transforms ≥70% of Acts 1-2's elements — what endings must satisfy.
9. **MVP Law**: 3 mechanisms, not 20. 6 scenes, not 60. Ship the locksmith short, then layer — what builders must satisfy.
10. **Author Sovereignty Law**: The engine never silently overrides the writer. Every choice is inspectable, every output is editable, every default is configurable — what UX must satisfy.

These ten laws, applied recursively across the 22-layer engine inventory, executed inside the NVM substrate, gated by the 13-proof kernel, validated against the reference-film regression suite, audited by the Ethics Module, observable through the ScriptIDE Cockpit, optimized over time by the Autoresearch loop, personalized to each writer by the Learning Loop, and exported to industry-standard formats — produces a screenwriting engine that does what no current tool does and that the archive has been describing for the past year.

That's the /godmode integration. Build the substrate (Weeks 0–4), wire the core modules (Weeks 5–8), ship the locksmith MVP, then layer through the 22-layer completeness map until you reach the destination at ~Week 80.

The architecture is settled. The path is clear. The next move is to write the first line of code.

---

*Read this with the other four:*
- `_SENSE_OF_THE_RESEARCH.md` — what the archive contains
- `_BEST_RESEARCH_AND_WHATS_NEXT.md` — what's best to build from
- `_COMPLETING_STORYMACHINE.md` — what makes the engine complete
- `_HYBRID_DECISION.md` — NVM substrate + archive modules = additive integration
- `_GODMODE_INTEGRATION.md` — this file: how it all runs as one system, end to end

*The five documents are the canonical map. The archive (49 files) is the research corpus. The codebase you haven't written yet is the destination.*
