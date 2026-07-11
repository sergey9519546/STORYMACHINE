# The Hybrid Decision: Narrative Virtual Machine + Existing Engines

*Fourth companion document. The previous three describe, judge, and complete the archive. This one decides what to do now that a substantial new plan — the Narrative Virtual Machine (NVM) hybrid plan — is on the table.*

---

## 0. The Verdict in One Paragraph

**Add the NVM substrate. Do not replace anything.** The Narrative Virtual Machine is roughly **30% genuinely new architectural substrate** (StoryOps bytecode, NarrativeTransitionIR, the `NarrativeModule` interface, the Module Pressure → Decision Council flow, the four-lane build discipline, the 10 named acceptance tests) and **70% rebranded/clarified material from the existing archive** (NarrativeState, Event-Sourced Canon Ledger, Mechanism Compiler, Proof Kernel, Reveal Plans, Theme Graphs, Reader State, Scene Planner, Dialogue/Action Compiler, Sidecar, CI/CD, Cockpit, Benchmark Factory, Provenance). The 30% that is new is exactly the missing piece — **a typed runtime substrate that gives every other engine in the archive a place to live and a contract to follow.** The 70% that overlaps with the archive isn't redundant; it's *the same architecture re-expressed in a more rigorous compiler vocabulary*. Everything you've already specified in the archive (the depth upgrades from `_COMPLETING_STORYMACHINE.md`, the engines from `_BEST_RESEARCH_AND_WHATS_NEXT.md`, the reference-film regression suite pattern, the Sonnet plan) becomes a `NarrativeModule` plugged into the NVM. Nothing is lost. Almost everything fits better.

---

## 1. The Side-by-Side: What Each Plan Brings

### What the NVM Hybrid Plan Brings (the genuinely new 30%)

The NVM contributes seven architectural primitives that don't exist cleanly anywhere in the archive:

**A. `StoryOp` Bytecode (the biggest single contribution).** The discriminated union `{op: "ADD_FACT" | "EXPIRE_FACT" | "UPDATE_BELIEF" | "APPRAISE_EMOTION" | "SHIFT_RELATIONSHIP" | "ADVANCE_OBJECT_ARC" | "TRIGGER_RULE" | "SEED_CLUE" | "PAYOFF_SETUP" | "RAISE_CLOCK" | "ADVANCE_THEME_ARGUMENT" | "UPDATE_READER_STATE"}` is the missing canonical vocabulary that lets every engine in the archive talk to every other engine. The archive has dozens of engines, each with its own way of modifying state. StoryOps gives all of them a shared, typed, replayable, regression-testable instruction set.

**B. `NarrativeTransitionIR` (intermediate representation between simulation and prose).** This is the layer the archive doesn't name. The archive jumps from agent action → Fountain. NVM inserts a typed scene-change object that knows what the scene changes *before any prose is written*. This is exactly the layer where proofs run and candidates compete.

**C. `NarrativeModule` interface (pluggable contract).** The five methods `inspect(state) → ModulePressure[]`, `propose(state, pressure) → NarrativeTransitionIR[]`, `validate(transition, state) → ModuleProof`, `repair(finding, state) → RepairSuggestion[]`, `explain(objectId, state) → ExplanationPanel` is the most useful pluggability pattern in any of the planning documents. Every engine in `_COMPLETING_STORYMACHINE.md` collapses onto this contract.

**D. Module Pressure → Story Decision Council flow.** Each module emits `ModulePressure` objects (urgency × readiness × risk-if-ignored × risk-if-advanced-now × expected-payoff). The council aggregates them into a single `StoryDecision` with `whyNow` rationale and `rejectedOptions` log. This formalizes the "what scene comes next?" question better than V3.9's intervention vocabulary or Sonnet's drama manager actions.

**E. Quality-Diverse Portfolio Search.** Instead of one-shot generation, generate 24–32 candidates, compile to StoryOps, validate, repair weak ones, cluster, preserve diverse valid options. *"Pick the strangest candidate that still passes proof."* This is the right loop pattern and it's cleaner than V3.9's deterministic ToT or Sonnet's tactic-pre-selection.

**F. Four-Lane Build Discipline.** Lane A Runtime, Lane B Intelligence, Lane C Evaluation, Lane D Product. This is a project-management primitive the archive lacks. Without it, you build clever modules that never ship.

**G. Ten Named Acceptance Tests.** Bad apology / Impossible knowledge / Cheap twist / Puppet plot / Generic dialogue / Object arc / Middle drift / Canon rebellion / Reader overload / Regression. These are testable invariants, not aspirations. The archive has 53-item audits and proof kernels, but doesn't have a sharp 10-test "is this even working?" gate.

### What the Existing Archive Brings (the indispensable 70% the NVM thins out)

The NVM is a compiler architecture. The archive is the *content depth* the compiler operates on. The NVM names "RelationshipState" and "CharacterMind" without specifying:

- **Cognition depth**: BDI DAG goals + Memory Stream + Reflection + OCC + emotion contagion + ToM² PAL + EvolvTrip triples + TOMA chain-of-thought + Festinger dissonance + Maslow + Vaillant defense hierarchy + IFS Parts + somatic markers + attachment style + Erikson stage + counterfactual ledger + implicit/explicit belief split
- **Dialogue depth**: Speech Acts + Grice's flouted maxims + Brown-Levinson politeness + conversation analysis turn-taking + register/code-switching + discourse markers + disfluency modeling + rhetorical device library + verbal tics + private vocabularies + silence engineering
- **Visual depth**: DeepShot cinematography + Color Script + Light/Shadow + Composition Grammar + Production Design Semiotics + Tableau / Stage Picture + Costume as Character + Aspect Ratio + Editing Rhythm Grammar + Match-Cut Sequencer
- **Sound design**: Score / leitmotif / foley / ambience / diegetic vs non-diegetic / acoustic space / silence-as-climax
- **Theory grounding**: Pearl's ladder + CLadder + Event Calculus + Allen Interval Algebra + DEL + Type Theory + Game Theory + Information Theory + Graph Grammars + Process Algebras + RST relations + Externalization Thesis
- **Specific research papers**: ~120 cited papers with attribution map (FactTrack, xMemory, HiMem, ConStory-Bench, Shadow-Loom, EvolvTrip, TOMA, Drama Llama, IBSEN, Plug-and-Play Dramaturge, R², FilmAgent, HoLLMwood, Constella, EmotionalRAG, Utopian Illusion, Lost in Stories, ASP-Guided generation, etc.)
- **Reference-film empirical validation**: page-by-page reverse engineering of canonical animated films with engine-component tags
- **Specificity / Reincorporation / Necessity / Surprise / Mirror Scene engines** from `_COMPLETING_STORYMACHINE.md`
- **The full 22-layer engine inventory** from the completion document
- **The cross-cutting operating principles** (Show Don't Tell, Specificity Mandate, Mechanism-over-Sentiment, Asymmetric Information Is Drama's Engine, etc.)

### What's Genuinely Duplicated (and Where the NVM Wins on Clarity)

Several archive concepts get sharper expression in the NVM:

| Concept | Archive | NVM | Verdict |
|---|---|---|---|
| State of the world | Many partial schemas (V3.9, V_beta, MIMOchat) | Unified `NarrativeState` with 4 truth layers | **NVM wins on clarity** |
| Story version control | MIMOchat names `StoryCommit`, light spec | Full `StoryCommit` with named delta types | **NVM wins on detail** |
| Proof system | Synthesis: 11 proofs across 3 tiers | NVM: 13 proofs (adds spatial + dialogue + provenance) | **Merge: use NVM list, use Synthesis's tier discipline** |
| Mechanism Compiler | MIMOchat #7, brief | NVM: full `NarrativeMechanism` contract + MVP discipline (3 mechanisms, not 20) | **NVM wins on MVP discipline** |
| Intervention vocabulary | V3.9: 25 typed interventions | NVM: 12 StoryOp types | **They're complementary; interventions are higher-level, StoryOps lower-level** |
| Reveal architecture | V3.9 + Sonnet: IllusionArc + Chekhov | NVM: `RevealPlan` + `Clue` with 8 carrier types | **NVM extends; merge** |
| Theme engine | V_beta: Truby + claim+support+warrant | NVM: ThemeArgumentGraph with claims/supports/attacks/undercuts/complicates/resolves | **NVM wins on argumentation depth** |
| Reader state | V3.9 + Sonnet: Cheong-Young | NVM: explicit `ReaderState` with memory-trace decay risk | **NVM wins on decay tracking** |
| Scene planner | V_beta + Sonnet | NVM: explicit `ScenePlan` with RST relations + `SceneSpace` | **NVM wins on RST + spatial integration** |
| Dialogue compiler | Chat exports: 7 validators | NVM: `DialogueExchangeIR` with action-as-dialogue + 10 validators | **NVM wins; extends archive's 7 validators** |
| Screenplay + sidecar | Sonnet partial | NVM: clean separation `clean_fountain` / `annotated_fountain` / `debug_scene_plan` | **NVM wins on clean/annotated separation** |
| CI/CD | MIMOchat #39 | NVM: full `StoryChangeSet` with regression test list | **NVM wins on regression-test rigor** |
| Cockpit | V3.9 + Sonnet | NVM: 14 panels including What-Breaks-If-Removed | **NVM wins on diagnostic depth** |

So the NVM doesn't replace the archive — it *re-expresses 70% of it with a compiler vocabulary that's sharper and more buildable*. The remaining 30% of the NVM is genuinely new substrate that the archive needed but didn't have.

---

## 2. Why the Right Answer Is Additive

The user's instinct in the framing of this question — *"if we can add instead of replacing/upgrading features"* — is correct. Here's why, formally:

The NVM specifies an **execution architecture**. It's the runtime, the bytecode, the IR, the proof kernel, the search loop, the test harness. It is *content-agnostic*. It would work for any narrative engine that produces structured state changes.

The archive specifies **content engines**. It's the deep psychology of characters, the visual grammar of cinema, the structural grammar of screenwriting, the specific research foundations, the per-genre conventions, the canonical-film validation suite. It is *runtime-agnostic*. Most of it could be ported to a different execution architecture.

These are orthogonal. The NVM is the platform. The archive is the software running on the platform. Replacing one with the other doesn't make sense; layering them is the natural move.

**Concretely:**
- The NVM defines `NarrativeModule.inspect(state) → ModulePressure[]`. The archive's Drama Manager spec defines *what kinds of pressures* the Drama Manager module emits (tension delta, beat phase, intervention budget, irony gap, reveal readiness, pacing monotony, voice divergence). One is the interface; the other is the implementation.
- The NVM defines `StoryOp.SHIFT_RELATIONSHIP`. The archive's Relationship Engine spec defines *what relationship deltas matter* (love, trust, intimacy, admiration, resentment, envy, fear, contempt, guilt, obligation, dependency, and the dialectic dimensions). One is the bytecode; the other is the semantics.
- The NVM defines `NarrativeProof` as a structured object. The archive's Synthesis defines the 11 proof types and their semantic content. One is the type; the other is the validation logic.
- The NVM defines `DialogueExchangeIR` and a `DialogueTurnIR` with `hiddenIntent`, `tactic`, `subtextMeaning`. The archive's Dialogue Engine specifies *what tactics exist* (deflect, mirror, probe, corner, confess_partial, lie, gaslight, counteraccuse, escalate, withdraw, appeal, sacrifice) and *what makes subtext work* (Grice's flouted maxims, indirect speech acts, the 8-technique SubtextLayer from Synthesis). One is the structure; the other is the linguistics.

The relationship is the same as a compiler vs the programs it compiles. You don't replace LLVM with a C++ standard library; you write your C++ library against LLVM's IR.

---

## 3. The Unified Picture (NVM Substrate + Archive Engines)

After the merge, here's the actual architecture:

```
┌─────────────────────────────────────────────────────────────┐
│              NVM SUBSTRATE (from new plan)                  │
│                                                              │
│  NarrativeState (4 truth layers + temporal facts)           │
│  StoryCommit (event-sourced canon ledger)                   │
│  NarrativeTransitionIR (typed scene-change IR)              │
│  StoryOp[] (typed bytecode)                                 │
│  NarrativeProof (13-proof validation)                       │
│  Quality-Diverse Portfolio Search                           │
│  Story Decision Council                                     │
│  Scene Planner + RST + SceneSpace                           │
│  Dialogue/Action Compiler                                   │
│  Screenplay Compiler + Sidecar                              │
│  Narrative CI/CD                                            │
│  ScriptIDE Proof Cockpit                                    │
│  Benchmark Factory                                          │
│  ProvenanceLedger                                           │
└─────────────────────────────────────────────────────────────┘
                          ▲
                          │ implements NarrativeModule
                          │
┌─────────────────────────────────────────────────────────────┐
│       CONTENT ENGINES (from archive, all become Modules)    │
│                                                              │
│  Cognition Module — BDI + Memory + OCC + ToM² + Vaillant   │
│      + IFS + attachment + somatic + Maslow + Erikson        │
│      Emits: UPDATE_BELIEF, APPRAISE_EMOTION, TRIGGER_RULE   │
│                                                              │
│  Relationship Module — Circumplex + Gottman + Coalition +   │
│      power dialectics + repair invariants                   │
│      Emits: SHIFT_RELATIONSHIP                              │
│                                                              │
│  Dialogue Module — Speech Acts + Grice + Brown-Levinson +   │
│      conversation analysis + register + verbal tics +       │
│      8-technique subtext + 10 dialogue validators           │
│      Emits: DialogueExchangeIR with StoryOps                │
│                                                              │
│  Visual Module — DeepShot + Color Script + Light/Shadow +   │
│      Composition + Tableau + Costume + Aspect Ratio +       │
│      Editing Rhythm                                         │
│      Emits: ADD_FACT (visual) + scene blocking              │
│                                                              │
│  Sound Module — Score + leitmotif + foley + diegetic +      │
│      acoustic space + silence-as-climax                     │
│      Emits: ADD_FACT (sonic) + DialogueTurnIR voice cues    │
│                                                              │
│  Drama Manager Module — tension + pacing + irony gap +      │
│      info gap + intervention vocabulary                     │
│      Emits: ModulePressure (urgency, readiness, payoff)     │
│                                                              │
│  Reveal Module — IllusionArc + Chekhov + Sternberg triad    │
│      Emits: SEED_CLUE + PAYOFF_SETUP + UPDATE_READER_STATE  │
│                                                              │
│  Theme Module — Truby spine + Egri premise +                │
│      counter-premise + Walton argumentation                 │
│      Emits: ADVANCE_THEME_ARGUMENT                          │
│                                                              │
│  Genre Module — Neale + subgenre + era codes +              │
│      hybrid logic + genre conventions                       │
│      Emits: ModulePressure (genre compliance)               │
│                                                              │
│  Specificity Module — embedding-distance + detail mandate   │
│      Emits: ModuleProof (rejects generic candidates)        │
│                                                              │
│  Reincorporation Module — setup/payoff + symbol arc +       │
│      mirror scene + theme echo                              │
│      Emits: ModulePressure + PAYOFF_SETUP                   │
│                                                              │
│  Necessity Module — "why now/here/them?" audit              │
│      Emits: ModuleProof (gates outline acceptance)          │
│                                                              │
│  Surprise Module — per-scene micro-surprise + reveal        │
│      bandwidth + subverted-trope detection                  │
│      Emits: ModulePressure                                  │
│                                                              │
│  Pacing Module — micro (sentence/action) + meso             │
│      (scene length) + macro (act tempo) + dialogue          │
│      density + emotional beat frequency + subplot           │
│      interleave                                             │
│      Emits: ModulePressure + RAISE_CLOCK                    │
│                                                              │
│  Production Bridge Module — breakdowns + shot list +        │
│      budget tags + casting types + locations + format       │
│      exports (FDX, Highland, Fade In)                       │
│      Renders to: production artifacts (sidecar)             │
│                                                              │
│  Ethics / Provenance Module — bias audit + sensitivity +    │
│      cultural appropriation + historical accuracy + IP +    │
│      defamation + attribution + WGA disclosure              │
│      Emits: ModuleProof (gates output)                      │
│                                                              │
│  Personal Learning Module — per-writer LoRA + style         │
│      transfer + reject-pattern mining                       │
│      Modifies: how other modules score candidates           │
│                                                              │
│  Pedagogy Module — annotation + exercise generation +       │
│      compare-to-reference-films                             │
│      Renders to: teaching panel (cockpit)                   │
│                                                              │
│  Cross-Media Module — novel↔screenplay↔stage↔game↔comic     │
│      Renders to: format-specific output                     │
└─────────────────────────────────────────────────────────────┘
```

Every engine in the 22-layer inventory from `_COMPLETING_STORYMACHINE.md` collapses cleanly into this model. None are lost. All gain a contract.

---

## 4. What Changes vs What Doesn't

### What the NVM **doesn't change**

- The 23-engine deduplicated inventory from `_SENSE_OF_THE_RESEARCH.md` Section 3.3 — every engine survives, each becomes a `NarrativeModule`.
- The 22-layer complete-engine map from `_COMPLETING_STORYMACHINE.md` Section 3 — every layer survives.
- The research foundation (~120 papers cited) — all still grounds the modules.
- The reference-film validation suite *pattern* — becomes the canonical benchmark format in the Benchmark Factory (NVM Phase 15). Production corpus to be replaced with public-domain or original-IP scripts.
- The Sonnet research file as primary spec — every section maps onto a NarrativeModule or runtime component.
- The Synthesis 3-tier proof kernel — survives as the proof discipline; NVM adds 2 more proofs (spatial, dialogue) to reach 13 total.
- The reference-film-validated central law (`theme → mechanism → rule → object → cost → witness → proof → scene`) — survives as the Mechanism Compiler's law.
- The operating principles (Show Don't Tell, Specificity Mandate, Mechanism-over-Sentiment, etc.) — survive as proofs that NVM modules run.

### What the NVM **changes**

- **Vocabulary alignment**: every state mutation now goes through StoryOps. Every scene-change goes through NarrativeTransitionIR. This is mostly mechanical — the existing engine specs need their state mutations renamed but not redesigned.
- **Pluggability contract**: every engine must implement the 5-method NarrativeModule interface. Most engine specs already implicitly have these methods; making them explicit is a 1–2 hour exercise per engine.
- **Search architecture**: the 24–32-candidate Quality-Diverse Portfolio search replaces one-shot generation. This is a substrate change that benefits every module.
- **Proof gating**: nothing enters canon without passing the 13 proofs. The acceptance contract gets sharper.
- **Build discipline**: the four-lane build (Runtime / Intelligence / Evaluation / Product) replaces the loose "domain" organization in the existing roadmaps.
- **MVP scope**: instead of trying to ship "all 6 engines + 15 patches + 22 layers" in week 8, ship "3 mechanisms + Tier 1 proofs + StoryOps + Cockpit basics" in week 4.

### What the NVM **adds**

- **StoryOp bytecode** as the canonical state-change vocabulary
- **NarrativeTransitionIR** as the typed scene-change object
- **`NarrativeModule` interface** as the engine contract
- **Module Pressure → Story Decision Council** flow
- **Quality-Diverse Portfolio** search with 8 named search modes
- **Story Bytecode VM** (the runtime that executes StoryOps)
- **What-Breaks-If-Removed** query (a single feature that justifies the entire architecture by itself)
- **10 named acceptance tests** as concrete CI gates
- **Four-Lane Build** discipline
- **Clear MVP** (6-scene short film engine with 3 mechanisms)

---

## 5. The Revised 8-Week Roadmap (Hybrid)

The NVM's 17-phase plan and the archive's 8-week plan converge cleanly. Here's the merged build sequence, week by week, that ships the NVM substrate and integrates the archive content:

### Week 0 — Architecture Freeze + Foundation Engineering
**NVM Phase 0 + the existing Week 0 work**
- Vocabulary lock: `NarrativeState`, `StoryCommit`, `NarrativeTransitionIR`, `StoryOp`, `StatePatch`, `NarrativeProof`, `ModulePressure`, `StoryDecision`, `ScenePlan`, `DialogueExchangeIR`
- The existing Week 0 engineering: WAL mode, agent order randomization, friction mandate, session TTL, circuit breaker, graceful degradation, cost telemetry, structured logging, schema migrations, M1.5 integration test harness
- **Lane discipline**: organize sprint into Lane A (Runtime), Lane B (Intelligence), Lane C (Evaluation), Lane D (Product) tasks
- **Exit test**: represent a simple scenario (Nora's lie about the warehouse) as facts + beliefs + relationship deltas + reader-state deltas, no prose

### Week 1 — Narrative State Kernel + Event-Sourced Canon
**NVM Phases 1 + 2**
- `NarrativeState` with 4 truth layers (objective / character belief / audience / author intent)
- Temporal `AtomicFact` model with validity intervals
- Contradiction rule formalization
- `StoryCommit` with full delta types
- Branch / merge / rollback / canon diff / proof trace
- Allen Interval Algebra for temporal relations
- Causal Graph + Causal/Logical edge taxonomies
- `state_snapshots` every 20 events
- **Exit test**: remove a scene mid-story; system reports exactly what breaks downstream

### Week 2 — StoryOps + Proof Kernel Tier 1 + Mechanism MVP
**NVM Phases 3 + 4**
- `StoryOp` discriminated union (12 op types)
- `ExecutableTransition` (IR + ops + pre/post conditions)
- Tier 1 proofs: TemporalProof, CausalProof, IntentionalProof, MechanismProof, ProvenanceProof
- Mechanism Compiler MVP with **only 3 mechanisms**: Object Burden, Legitimacy Split, Relationship Externalization
- Mechanism invariants for each
- **Exit test**: a proposed betrayal fails IntentionalProof if no character motive supports it

### Week 3 — Cognition + Relationship + Emotion Modules
**NVM Phase 5 + the archive's deep cognition layer**
- Implement `RelationshipState` with affect + dialectics + power + rupture/repair history
- Repair invariant: no full repair without harm acknowledgement + cost + changed behavior + believable reception
- `EmotionAppraisal` (EMA-style, 6-step)
- Cognition Module wrapping BDI + Memory Stream + OCC + Festinger + Maslow
- Add depth from `_COMPLETING_STORYMACHINE.md`: Vaillant defenses, IFS Parts, attachment style, somatic markers
- PCL Role Chain identity scaffold
- Streamlined identity anchor
- xMemory 4-level hierarchy + EmotionalRAG
- EvolvTrip ToM triples + TOMA chain-of-thought
- **Exit test**: system can explain "why did Nora lie?" with appraisal trace

### Week 4 — Module Pressure Scan + Story Decision Council + Portfolio Search
**NVM Phases 6 + 7**
- `NarrativeModule` interface stabilized
- Module Pressure Scan loop (every module inspects state, emits ModulePressure[])
- Story Decision Council aggregates pressures → StoryDecision
- Decision rules ("Never reveal before audience readiness," etc.)
- Quality-Diverse Portfolio Search (24–32 candidates per decision)
- 8 search modes (causal-safe, painful, weird-valid, theme-sharpening, etc.)
- GenericnessVector scoring
- Selection law: "Pick the strangest candidate that still passes proof"
- **Exit test**: same scene goal returns valid alternatives differing in emotional cost / theme pressure / relationship consequence

### Week 5 — Reveal + Theme + Reader + Scene Planner + Dialogue Compiler + Screenplay
**NVM Phases 8 + 9 + 10 + 11**
- `RevealPlan` with 8 reveal modes + clue ecology (8 carrier types) + misdirections + false reveals
- `ThemeArgumentGraph` with claims/supports/attacks/undercuts/complicates/resolves
- Reader simulation with memory-trace decay risk
- `ScenePlan` with `SceneSpace` (sightlines, occlusions, exits, sound zones)
- Spatial proof (no character knows what they couldn't see/hear/infer)
- `DialogueExchangeIR` + `DialogueTurnIR` + `DialogueActionBeat`
- 10 dialogue validators
- Voice depth from `_COMPLETING_STORYMACHINE.md`: Speech Acts + Grice + Brown-Levinson + verbal tics
- Action-as-Dialogue support
- Screenplay Compiler with 3 render modes (clean_fountain / annotated_fountain / debug_scene_plan)
- SceneAnnotationSidecar with full line-level provenance
- **Exit test**: polished line is cut if it changes no state

### Week 6 — Narrative CI/CD + ScriptIDE Proof Cockpit
**NVM Phases 12 + 13**
- `StoryChangeSet` with regression test suite (15 named tests)
- "What-breaks-if-removed" query
- ScriptIDE Cockpit with 14 panels including the killer feature: click any line, see surface + hidden intent + tactic + belief legality + relationship delta + mechanism + future dependency + what-breaks-if-removed
- Constella FRIENDS DISCOVERY / JOURNALS / COMMENTS panels
- Director's Cut mid-simulation override
- Harvest Mode (browse / pin / reorder / refine / gap-fill)
- What-If Branching with MCTS
- **Exit test**: rewriting a scene shows ripple effects with repair suggestions

### Week 7 — Functional Annotation + Benchmark Factory + Reference-Film Regression
**NVM Phases 14 + 15**
- Functional annotation pipeline (scene → mechanism, line → tactic, etc.)
- Synthetic Benchmark Factory with 11 benchmark families
- Reference-film regression suite (5-10 corpus films chosen for clean IP — public-domain shorts, original-IP screenplays, or licensed references)
- For each corpus film, the engine should reverse-engineer: mechanism, wound→false_dream→dark_night→transformation arc, silent climax, antagonist as dark mirror
- ASE LLM-as-judge eval suite
- 10 acceptance tests wired as CI gates
- **Exit test**: all 10 acceptance tests pass on the MVP locksmith+piano short

### Week 8 — Production Architecture + Provenance + Hardening
**NVM Phases 16 + 17**
- PostgreSQL + JSONB + pgvector + Redis + S3 + OpenTelemetry
- All core tables stood up
- `ProvenanceRecord` with origin tracking + rights status
- WGA-compliant authorship attribution
- Multi-axis bias audit (initial pass)
- Sensitivity reader pass
- Per-line attribution metadata
- Cost optimization (prompt caching, parallel agent processing, batching)
- **Exit test**: full provenance trace for any generated line; ready to ship MVP to first 5 screenwriter testers

The 8-week roadmap from `_BEST_RESEARCH_AND_WHATS_NEXT.md` was already 80% aligned with the NVM's 17-phase plan. This revision tightens the alignment and shifts the discipline toward typed bytecode + proof gating + portfolio search.

---

## 6. The Specific Decisions to Make Right Now

To execute the hybrid plan, three architectural decisions need to be locked:

### Decision 1 — `StoryOp` Vocabulary
**Adopt the NVM's 12 StoryOp types as canonical.** Every engine emits StoryOps. Every state mutation is a StoryOp. Every regression test runs against a StoryOp trace. This is the single most leveraged decision — it unifies every engine in the archive.

The 12 ops: `ADD_FACT`, `EXPIRE_FACT`, `UPDATE_BELIEF`, `APPRAISE_EMOTION`, `SHIFT_RELATIONSHIP`, `ADVANCE_OBJECT_ARC`, `TRIGGER_RULE`, `SEED_CLUE`, `PAYOFF_SETUP`, `RAISE_CLOCK`, `ADVANCE_THEME_ARGUMENT`, `UPDATE_READER_STATE`. Add `RECORD_VISUAL_FACT` and `RECORD_SONIC_FACT` for the visual/sound engines from the completion doc, bringing the total to 14.

### Decision 2 — `NarrativeModule` Contract
**Adopt the 5-method interface verbatim from the NVM plan.** Every engine in the archive (cognition, relationship, drama manager, reveal, theme, dialogue, visual, sound, specificity, reincorporation, necessity, pacing, genre, production bridge, ethics, personal learning, pedagogy, cross-media) implements `inspect / propose / validate / repair / explain`. This is the single most leveraged organizational decision — it lets every researcher's track plug in without re-architecting.

### Decision 3 — Proof Kernel Discipline
**Merge Synthesis's 11 proofs + NVM's 13 proofs into a unified 13-proof contract**, organized in 4 tiers from `_COMPLETING_STORYMACHINE.md`:
- **Tier 1 (Hard Blocks)**: TemporalProof, CausalProof, IntentionalProof, MechanismProof, EpistemicProof, ContinuityProof, ProvenanceProof
- **Tier 2 (Quality Gates)**: EmotionProof, MotivationalProof, RelationshipProof, ThemeProof, ReaderStateProof, SpatialProof, DialogueProof, SubtextProof, VoiceProof, NecessityProof, ReincorporationProof, SpecificityProof, SurpriseProof, PolarityProof
- **Tier 3 (Ranking Signals)**: GenericnessProof, OriginalityProof, RewatchRewardProof, VoiceConsistencyProof
- **Tier 4 (Ethics & Disclosure)**: BiasAuditProof, SensitivityProof, IPProof, AttributionProof, DisclosureProof

Tier 1 blocks ship. Tier 2 flags for review. Tier 3 ranks candidates. Tier 4 monitors continuously.

If those three decisions are locked, the archive's 22 layers and the NVM's 17 phases collapse into one coherent build sequence. Nothing is lost. Almost everything fits better.

---

## 7. The Risks of the Hybrid Approach (and How to Manage Them)

### Risk 1 — Substrate complexity bloat
**Risk**: NVM substrate (StoryOps + IR + Module interface + Proof Kernel + Portfolio Search + CI/CD + Cockpit) is itself a 2-3 month project. Adding the archive's 22 layers on top could explode scope.
**Mitigation**: The NVM's MVP discipline solves this. Build only 3 mechanisms (Object Burden, Legitimacy Split, Relationship Externalization). Build only Tier 1 + Tier 2 proofs. Build only 5–6 modules in the first pass (Cognition, Relationship, Drama Manager, Reveal, Dialogue, Mechanism). The 22-layer completeness map is the destination, not the starting point. The MVP is the 6-scene locksmith+piano short.

### Risk 2 — Vocabulary translation cost
**Risk**: Every existing engine spec needs to be re-expressed in NVM vocabulary. ~30 specs across the archive.
**Mitigation**: Most translations are mechanical. The Drama Manager's existing intervention vocabulary maps to ModulePressure objects; the existing TypeScript interfaces map to StoryOp emissions. Budget 1–2 hours per existing engine spec for translation. Total: ~40 hours. Done in Week 0.

### Risk 3 — Module contract over-constraint
**Risk**: Forcing every researcher's content track through the 5-method interface might lose nuance specific to that track.
**Mitigation**: The interface is *minimal*, not exhaustive. Each module can have additional internal complexity. The 5 methods are the *contract*, not the *implementation*. The Sonnet research file's depth in tension calculation lives inside the Drama Manager Module's `inspect()` and `validate()` — that depth isn't exposed at the interface, it's just there.

### Risk 4 — Performance with 24–32 candidates per decision
**Risk**: Portfolio search with 24–32 candidates × N modules × M proofs per scene = potentially expensive.
**Mitigation**: Pre-validate cheaply (deterministic proofs first, LLM-based proofs last). Cluster candidates and only validate representatives. Cap candidates at 16 in MVP, scale to 24–32 once performance is profiled. Use cheap models (Haiku/Flash) for first-pass scoring, Sonnet only for final selection.

### Risk 5 — Test infrastructure cost
**Risk**: 10 acceptance tests + 15 regression tests + 11 benchmark families + reference-film suite is a substantial test infrastructure.
**Mitigation**: This is the right cost to pay. The audit's diagnosis ("11 critical bugs that silently produce zero output") demands this. Build tests progressively: Week 0 has the integration test harness, Week 7 has the full suite.

### Risk 6 — Hybridization confuses contributors
**Risk**: The archive uses M0-M8 milestones, mechanism / proof vocabulary, agent / belief / tactic vocabulary, 22-layer completeness map. The NVM uses 17 phases, four lanes, StoryOps, Modules, Proofs. Multiple vocabularies risk confusing future readers and contributors.
**Mitigation**: Pick one vocabulary as canonical. The NVM's vocabulary is sharper and more buildable; make it canonical. Translate the archive's terms to NVM equivalents (DirectorNode → Drama Manager Module, BDI Goal Stack → Cognition Module's goal-DAG state, etc.). Maintain a glossary mapping old terms → new terms.

---

## 8. What Stays From `_COMPLETING_STORYMACHINE.md`

The 22-layer completeness map and all the depth upgrades from the completion document **all stay**. They become specifications for individual NarrativeModule implementations:

- **Attachment Theory + Vaillant + IFS + somatic markers** → internals of the Cognition Module
- **Speech Acts + Grice + Brown-Levinson + verbal tics** → internals of the Dialogue Module
- **Color Script + Light/Shadow + Composition Grammar + Tableau** → internals of the Visual Module
- **Score + leitmotif + foley + acoustic space** → internals of the Sound Module
- **Egri premise + counter-premise + Walton argumentation** → internals of the Theme Module
- **Specificity Engine** → its own NarrativeModule (the highest-impact single module)
- **Reincorporation Engine** → its own NarrativeModule
- **Necessity Engine** → its own NarrativeModule
- **Mirror Scene Engine** → its own NarrativeModule
- **Surprise Bandwidth Engine** → its own NarrativeModule
- **Production Bridge** → its own NarrativeModule (renders to production artifacts)
- **Personal Learning Module** → modifies how other modules score candidates
- **Pedagogy / Cross-Media / Live-Interactive** → renderers and modes layered on top

The 12-phase 90-week completeness roadmap from `_COMPLETING_STORYMACHINE.md` survives intact. Phases 1-8 ship the v1 NVM with 5-6 core modules. Phases 9-12 ship the rest of the modules. The destination doesn't change; the build discipline gets sharper.

---

## 9. What Stays From `_BEST_RESEARCH_AND_WHATS_NEXT.md`

The judgment about which files to use as primary sources still holds:

- **Sonnet research** remains the most build-ready single-file spec — most of it maps to NarrativeModule internals
- **V3.9 TypeScript types + SQL schema** remains the implementation reference for state shapes
- **Audit's 53 fixes** remain the must-apply patch list
- **Prompts library** remains the LLM contract layer (now invoked inside specific modules' `propose()` / `validate()`)
- **ULTRAPLAN's 8-week schedule** is replaced by the hybrid 8-week schedule above
- **Synthesis's proof kernel** is merged into the 13-proof unified contract
- **Reference-film .docx track** provides the regression-suite pattern (corpus to be re-selected for production)

The 10 problems flagged in the judgment document (fabricated Copeland citation, spec-numbers-not-measured, etc.) all still apply. The NVM doesn't fix them; it just gives them a cleaner architecture to be fixed inside.

---

## 10. The Two Things That Surprised Me Most In The Hybrid Plan

### Surprise 1 — The What-Breaks-If-Removed Query
The single feature that justifies the entire NVM substrate cost is the **What-Breaks-If-Removed** query in the Cockpit. With event-sourced StoryCommits + typed StoryOps + proof traces, this query becomes mechanical: walk forward from the removed commit, find which downstream proofs lose their supporting evidence, surface the broken chain. No prose archive has anywhere close to this capability. Final Draft can't do it. WriterDuet can't do it. Sudowrite can't do it. This is **the killer feature** that makes a professional screenwriter switch tools.

### Surprise 2 — The MVP Discipline
"Build only 3 mechanisms first. Do not start with 20." This is the single sentence that makes the difference between shipping and not-shipping. The archive's tendency toward maximalism (V3.9's 15 patches, V_beta's 9 first-class engines, MIMOchat's 45 numbered engines, the completion doc's 22 layers) is exactly the failure mode the NVM solves. By specifying that the v1 is a 6-scene short with 3 mechanisms (Object Burden + Legitimacy Split + Relationship Externalization), the NVM imposes a scope discipline the archive lacked.

These two features together (What-Breaks-If-Removed + ruthless MVP) are worth more than the rest of the substrate combined.

---

## 11. The Specific Recommendation

**Do this:**

1. **Adopt the NVM as substrate.** StoryOps, NarrativeTransitionIR, NarrativeModule interface, Proof Kernel, Quality-Diverse Portfolio Search, Story Decision Council, Scene Planner, Dialogue/Action Compiler, Screenplay+Sidecar, Narrative CI/CD, ScriptIDE Cockpit.

2. **Keep all 23 functional engines from the archive.** They become NarrativeModule implementations. Their internal depth (BDI + ToM² + xMemory + OCC + EMA + Vaillant + IFS, etc.) is preserved.

3. **Keep all 22 layers from the completeness map.** They define the long-term roadmap. v1 ships layers 0-9; v3 covers layers 10-15; v5 covers 16-22.

4. **Apply the MVP discipline.** v1 = 6-scene short film with 3 mechanisms (locksmith + piano example). All other content engines are post-MVP.

5. **Apply the four-lane build discipline.** Every sprint has Lane A (Runtime), Lane B (Intelligence), Lane C (Evaluation), Lane D (Product) tickets.

6. **Use the merged 8-week roadmap above** (Section 5) as the canonical schedule, with the NVM's 17 phases as detailed task breakdowns inside it.

7. **Lock the three decisions** (Section 6): 14-op StoryOp vocabulary, 5-method NarrativeModule interface, 4-tier 13-proof contract.

8. **Translate the archive's vocabulary to NVM terms** in Week 0. Maintain a glossary. DirectorNode → Drama Manager Module. BDI Goal Stack → Cognition Module state. PLOTTER → Scene Planner + Syuzhet Reconstructor. Etc.

9. **Apply all 53 audit fixes** during Week 0–2 substrate build.

10. **Wire up reference-film regression suite + 10 acceptance tests as CI gates** by end of Week 7.

11. **Keep Specificity Engine as Week 0 mini-feature** — even before the full NVM substrate ships, a per-line specificity audit catches generic content. It's a 4-hour build with disproportionate quality impact.

**Don't do this:**

- Don't replace existing engine content with NVM's lighter content sketches. The archive's depth (psychology, dialogue, theory grounding, reference-film empirical validation) is irreplaceable. The NVM's content sections (Mechanism, Relationship, Emotion, Reveal, Theme, etc.) are *interface specifications*, not *content replacements*.
- Don't ship a "research v1" with all 22 layers. Ship the locksmith + piano short. Then layer.
- Don't get into a vocabulary fight. Pick NVM vocabulary as canonical; translate old docs; move on.
- Don't skip the Specificity Engine. Every other quality lever is multiplied by it.

---

## 12. The Bottom Line

The Narrative Virtual Machine plan is the right architecture. The existing archive is the right content. They're orthogonal, complementary, and additive. The NVM gives the archive an execution model; the archive gives the NVM the depth that makes it actually produce good screenplays.

Build the NVM substrate in Weeks 0–4. Wrap the existing engines as NarrativeModules in Weeks 3–6. Ship the 6-scene short MVP in Week 7. Pass the 10 acceptance tests and the reference-film regression suite by end of Week 8.

Then start working through the 22-layer completeness map, one module at a time, layered onto the same stable substrate. Each new module ships as a `NarrativeModule` implementation, plugs into the same StoryDecision Council, emits the same StoryOps into the same StoryCommit ledger, and is gated by the same 13-proof contract.

The result, by month 24, is what the archive has been describing for the past year — but with a stable runtime underneath that lets every research thread, every depth upgrade, every domain-specific module plug in without re-architecting.

**The right move is hybrid additive integration, not replacement.** That's the decision.

---

*Read with `_SENSE_OF_THE_RESEARCH.md`, `_BEST_RESEARCH_AND_WHATS_NEXT.md`, and `_COMPLETING_STORYMACHINE.md`. Together the four documents describe, judge, complete, and operationalize the StoryMachine build.*
