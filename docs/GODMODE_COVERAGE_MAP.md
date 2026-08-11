# GODMODE Coverage Map — StoryMachine vs the Screenplay Understanding Standard

**Reference**: `docs/GODMODE_SCREENPLAY_UNDERSTANDING_STANDARD.md` (45 levels, 32 artifacts)
**Audited**: 2026-08-11 against `codex/quarantine-2026-08-08-prototypes` branch

## Status legend

- **STRONG** — system exists, is wired into a live path, and covers the level's requirements
- **PARTIAL** — system exists and is wired but covers only part of the level's requirements
- **UNWIRED** — code exists but has no live-path consumer (dead code)
- **GAP** — no system exists for this level

## Coverage by GODMODE level

### Foundation levels

| Level | Status | StoryMachine system | What exists | What's needed |
|---|---|---|---|---|
| L1 Script Intent Profile | PARTIAL | `NarrativeState.authorIntent` | Genre, theme, target structure (3 fields) | Full intent profile: tone, audience promise, ambiguity target, authorial risk |
| L2 Premise & Story Engine | PARTIAL | `StoryGenome` (selfplay/genome.ts), DirectorNode | Terminal want, stakes, dominant wound | Story-engine lifecycle (seeded→activated→costly→crisis→resolved) |
| L3 World/Rules/Institutions | PARTIAL | `objectiveReality` (AtomicFact[]), `TRIGGER_RULE` op | Facts + fired rules | Rule enforcement system (who enforces, who benefits, loopholes) |
| L4 Fabula/Syuzhet | UNWIRED | `disclosure-ledger.ts` (discourse order), `truth-ledger.ts` (interval facts) | Both built, **neither wired**. `truth-extraction.ts` chains to truth-ledger but is itself uncalled | Wire disclosure-ledger into the analysis route; wire truth-extraction into doctor.ts |

### Architecture levels

| Level | Status | StoryMachine system | What exists | What's needed |
|---|---|---|---|---|
| L5 Causal Architecture | PARTIAL | `story-graph.ts` (696 LOC), proof/tier1/causal.ts | Causal/temporal/promise graph; on report but **not in health formula** | Promote to scored; add causal-density to health deduction |
| L6 Protagonist Architecture | STRONG | `psychology.ts` (659 LOC), AppraisalEngine, decision.ts | Wound, fear, need, false belief, defense cascade, Trinity, Big Five | — |
| L7 Opposition Architecture | PARTIAL | `conflict-orchestrator.ts`, intention-registry.ts | Goal collisions, threatened plans, leverage reversals | Thematic opposition (antagonist as counterclaim, not just obstacle) |
| L8 Supporting Character Function | GAP | — | All characters treated uniformly | 14 supporting function types (ally, foil, mirror, gatekeeper, etc.) |
| L9 Character Intentionality Chains | PARTIAL | intention-registry.ts, decision.ts, BeatTrace | Want/fear/tactic per character; beat traces | Full intention chains (perceived situation → belief → goal → tactic → outcome → belief update) |
| L10 Relationship Architecture | STRONG | RelationshipDelta (14 dims), TheoryOfMind, stress-ledger relational account | Trust/affinity/power/debt per pair; rupture/repair tracking | — |

### Structural levels

| Level | Status | StoryMachine system | What exists | What's needed |
|---|---|---|---|---|
| L11 Structural Architecture | PARTIAL | pacing.ts, structure.ts revision passes | Rule-based act/turning-point detection | Structural map as data (not just rule violations) |
| L12 Sequence Architecture | GAP | — | No sequence-as-group-of-scenes model | Sequence grouping, per-sequence objectives, escalation tracking |
| L13 Subplot Architecture | GAP | — | No subplot model | Subplot identification + intersection tracking |
| L14 Scene Function Intelligence | PARTIAL | ScreenplaySceneRecord.purpose, stress-ledger SCENE_DEAD_AIR | Scene purpose detection + dead-air | Full scene function ledger (17 function types) |

### Craft levels

| Level | Status | StoryMachine system | What exists | What's needed |
|---|---|---|---|---|
| L15 Beat & Tactic Chains | PARTIAL | BeatTrace (types.ts), dialogue_tactics in training corpus | Beat type + causal chain; tactic per dialogue | Full beat records with tactic progression |
| L16 Dialogue Intelligence | PARTIAL | dialogue.ts revision pass, DialogueAtom schema | Rule-based dialogue quality checks | 6-layer dialogue model (surface, hidden, tactical, relationship, knowledge, voice) |
| L17 Action as Dialogue | PARTIAL | action-to-ops.ts (ActionLogEntry → StoryOp) | 15 action types → ops compiler | Action semantics (what does each action beat replace/answer/infer?) |
| L18 Voice Distinction | PARTIAL | voice.ts pass, voiceAnalysis on FountainAnalysis | Lexical diversity, speech pattern derivation | Per-character Voice Grammar (12 properties) |
| L19 Reveal & Clue Architecture | UNWIRED | reveal/RevealPlan.ts (11-line stub), disclosure-ledger.ts, EarnedRevealProof | Type exists, **zero producers**. Stage methods exist with no callers | Wire disclosure-ledger; populate ir.revealPlans from the engine |
| L20 Audience-State Architecture | PARTIAL | audienceState (4 scalars), stress-ledger AUDIENCE_QUESTION | Suspense/curiosity/investment + question tracking | Full audience curve (known facts, suspected, false beliefs, expected/feared outcomes) |

### Integration levels

| Level | Status | StoryMachine system | What exists | What's needed |
|---|---|---|---|---|
| L21 Setup/Payoff Architecture | STRONG | CLUE/PAYOFF_SETUP/CLOCK/OBJECT in arc-tracker, payoff.ts pass | Full setup/payoff lifecycle tracking | — |
| L22 Object-State & Motif Arcs | PARTIAL | objectArcs in NarrativeState, ADVANCE_OBJECT_ARC op | Object lifecycle states | Meaning arcs (initial → useful → costly → dangerous → reinterpreted → final) |
| L23 Theme as Argument | PARTIAL | themeArgument (ThemeMove[]), theme.ts pass, stress-ledger thematic account | 11 theme moves tracked | Theme Argument Graph (central question, competing claims, advocates, evidence) |
| L24 Genre Intelligence | STRONG | genre-router.ts (1872 LOC), GENRE_RULE_MODIFIERS | Genre-conditioned thresholds, genre pass modifiers | — |
| L25 Cinematic Execution | PARTIAL | RECORD_VISUAL_FACT / RECORD_SONIC_FACT ops | Raw recording of visual/sonic facts | Cinematic analysis (visual causality, blocking, framing, sound design) |
| L26 Pacing & Rhythm | PARTIAL | pacing.ts/rhythm.ts passes, stress-ledger fatigue/hysteresis | Rule-based pacing + fatigue/burnout detection | Pacing curve as data; reversal density tracking |
| L27 Emotional Architecture | STRONG | AppraisalEngine (OCC), stress-ledger EMOTIONAL_DEBT + catharsis + fatigue | Full OCC appraisal + debt tracking + catharsis + fatigue | — |
| L28 Tone Control | PARTIAL | IllusionState on Stage | Phase/structure/theme/genre illusion state | Tonal consistency tracking, tonal contrast/rupture detection |
| L29 Authorial Voice | PARTIAL | voiceAnalysis on FountainAnalysis | Per-script voice metrics | Authorial voice profiling (worldview, image selection, moral perspective) |
| L30 Ending Intelligence | PARTIAL | end-condition.ts, screenplay/structure.ts | End-condition checking | Multi-system ending proof (external/internal/relationship/mechanism/theme/genre resolution) |

### Quality & evidence levels

| Level | Status | StoryMachine system | What exists | What's needed |
|---|---|---|---|---|
| L33 Hard Legality vs Soft Excellence | STRONG | Proof Kernel (Tier 1-4), revision passes (14), doctor.ts health formula | 18 proofs (hard block → flag → rank → advisory); 14 craft passes; bounded health deduction | — |
| L34 Evidence-Backed Annotations | PARTIAL | Provenance on StoryCommit, proof results with findings | Op-level provenance + proof findings | Scene-level evidence-backed annotations (the AnnotationAtom schema) |
| L35 Counterfactual Proof | STRONG | twin/counterfactual.ts (Pearl do()-calculus), whatif/explore.ts | Full counterfactual: "what breaks if scene/op is removed" via causal DAG | — |
| L36 Controlled Weak Versions | PARTIAL | DIR 2 shadow_mutations.py, preference pairs (11,580) | External training pipeline with corruption types | Integrated into StoryMachine's own analysis path |
| L37 Deliberate Rule-Breaking | GAP | — | No system identifies intentional convention violations | Rule-violation detection with compensation analysis |
| L38 Cross-Script Comparison | GAP | — | No cross-script comparative records | Comparative analysis across the corpus |

## Summary

| Status | Count | Levels |
|---|---|---|
| STRONG | 7 | L6, L10, L21, L24, L27, L33, L35 |
| PARTIAL | 20 | L1, L2, L3, L5, L7, L9, L11, L14, L15, L16, L17, L18, L20, L22, L23, L25, L26, L28, L29, L30, L34, L36 |
| UNWIRED | 2 | L4 (disclosure/truth ledger), L19 (reveal engine) |
| GAP | 4 | L8, L12, L13, L37, L38 |

## Highest-value actions

1. **Wire L4/L19** — disclosure-ledger + truth-ledger + epistemic-ledger are built but uncalled. Wiring them covers 3 levels at once.
2. **Build L12 Sequence Architecture** — the biggest structural gap. Sequences are "the most useful unit between whole script and scene" (GODMODE §14). No model exists.
3. **Promote L5** — story-graph is wired to the report but not to health. Adding graph metrics to the health formula would make causal architecture a scored dimension.
4. **Build L8 Supporting Character Function** — 14 function types that determine how each character should be analyzed. Currently all characters are treated uniformly.
