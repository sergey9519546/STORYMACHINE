# GODMODE Coverage Map — StoryMachine vs the Screenplay Understanding Standard

**Reference**: `docs/screenplay-understanding/GODMODE_STANDARD.md` (45 levels, 32 artifacts)
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
| L5 Causal Architecture | PARTIAL | `story-graph.ts` (696 LOC), `graph-health.ts`, proof/tier1/causal.ts | Causal/temporal/promise graph; graph health surfaced diagnostically | Repair graph extraction and re-calibrate before any score/verdict promotion |
| L6 Protagonist Architecture | STRONG | `psychology.ts` (659 LOC), AppraisalEngine, decision.ts | Wound, fear, need, false belief, defense cascade, Trinity, Big Five | — |
| L7 Opposition Architecture | PARTIAL | `conflict-orchestrator.ts`, intention-registry.ts | Goal collisions, threatened plans, leverage reversals | Thematic opposition (antagonist as counterclaim, not just obstacle) |
| L8 Supporting Character Function | GAP | — | All characters treated uniformly | 14 supporting function types (ally, foil, mirror, gatekeeper, etc.) |
| L9 Character Intentionality Chains | PARTIAL | intention-registry.ts, decision.ts, BeatTrace | Want/fear/tactic per character; beat traces | Full intention chains (perceived situation → belief → goal → tactic → outcome → belief update) |
| L10 Relationship Architecture | STRONG | RelationshipDelta (14 dims), TheoryOfMind, stress-ledger relational account | Trust/affinity/power/debt per pair; rupture/repair tracking | — |

### Structural levels

| Level | Status | StoryMachine system | What exists | What's needed |
|---|---|---|---|---|
| L11 Structural Architecture | PARTIAL | pacing.ts, structure.ts revision passes | Rule-based act/turning-point detection | Structural map as data (not just rule violations) |
| L12 Sequence Architecture | PARTIAL | `arc-tracker.ts` SequenceGroup | Adaptive scene grouping (target 8), distress/catharsis/reveal/dead-air flags | Sequence objective/POV/question/active opposition model |
| L13 Subplot Architecture | PARTIAL | `subplot-tracker.ts` | Relationship arcs, mystery threads, theme counterarguments, object arcs + intersections | Main-plot relationship, character goals, escalation semantics |
| L14 Scene Function Intelligence | PARTIAL | ScreenplaySceneRecord.purpose, stress-ledger SCENE_DEAD_AIR | Scene purpose detection + dead-air | Full scene function ledger (17 function types) |

### Craft levels

| Level | Status | StoryMachine system | What exists | What's needed |
|---|---|---|---|---|
| L15 Beat & Tactic Chains | PARTIAL | BeatTrace (types.ts), dialogue_tactics in training corpus | Beat type + causal chain; tactic per dialogue | Full beat records with tactic progression |
| L16 Dialogue Intelligence | PARTIAL | dialogue.ts revision pass, DialogueAtom schema | Rule-based dialogue quality checks | 6-layer dialogue model (surface, hidden, tactical, relationship, knowledge, voice) |
| L17 Action as Dialogue | PARTIAL | action-to-ops.ts (ActionLogEntry → StoryOp) | 15 action types → ops compiler | Action semantics (what does each action beat replace/answer/infer?) |
| L18 Voice Distinction | PARTIAL | voice.ts pass, voiceAnalysis on FountainAnalysis | Lexical diversity, speech pattern derivation | Per-character Voice Grammar (12 properties) |
| L19 Reveal & Clue Architecture | PARTIAL | `disclosure-analysis.ts`, disclosure-ledger.ts, EarnedRevealProof | Fair-reveal ordering and epistemic gaps wired into Doctor; `RevealPlan` still has zero producers | Populate `ir.revealPlans` from the engine |
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
| L37 Deliberate Rule-Breaking | PARTIAL | `rule-breaking.ts` | Detects compensated passive protagonists, minimal dialogue, abrupt endings, escalating repetition; preserve notices surfaced in Doctor | Broaden convention set; feed preserve notices into revision-advice suppression |
| L38 Cross-Script Comparison | PARTIAL | `cross-script.ts`, `POST /api/nvm/analyze/craft-compare` | Shared functions, invariants, variable implementation details, structural similarity pairs | Corpus-wide persistent comparative records, genre conditioning |

## Summary

**Updated 2026-08-12** after GODMODE completion session.

| Status | Count | Levels |
|---|---|---|
| STRONG | 7 | L6, L10, L21, L24, L27, L33, L35 |
| PARTIAL | 28 | L1, L2, L3, L4, L5 (diagnostic; calibration failed for scoring), L7, L8, L9, L11, L12, L13, L14, L15, L16, L17, L18, L19, L20, L22, L23, L25, L26, L28, L29, L30, L34, L36, L37, L38 |
| UNWIRED | 0 | Every built GODMODE module has a live consumer |
| GAP | 0 | No unbuilt priority levels remain; all remaining work is depth/calibration |

## Completed actions (previously listed as highest-value)

1. ~~Wire L4/L19~~ — ✅ DONE. disclosure-analysis.ts wires all three ledgers.
2. ~~Build L12 Sequence Architecture~~ — ✅ DONE. SequenceGroup on ArcCompletionReport.
3. ~~Promote L5~~ — ⚠️ CALIBRATION REJECTED scoring promotion. `scripts/calibrate-graph-health.ts` measured wrong-sign discrimination on the controlled corpus (`r=-0.290` for graph health vs band rank; deduction `r=+0.282`). Graph health remains surfaced as a diagnostic, not a health/verdict deduction, until the graph extractor is repaired and re-calibrated.
4. ~~Build L8 Supporting Character Function~~ — ✅ DONE. character-function.ts classifies 14 types.
5. ~~Build L13 Subplot Architecture~~ — ✅ DONE. subplot-tracker.ts identifies threads + intersections.

## Remaining highest-value actions

1. **Repair L5 graph extraction, then re-calibrate** — the current graph metric treats the calibration corpus's controlled-richness layout as isolated/underlinked. Do not restore its health deduction until repaired extraction shows the correct sign on both controlled bands and real scripts.
2. **Deepen L37** — add compensated nonlinear chronology, tonal collision, late-protagonist-clarity, and genre-conditioned convention handling; then apply verified preserve notices to revision-advice suppression.
3. **Deepen L38** — persist comparative records across the corpus, add genre/intent conditioning, and expose comparison in the writer-facing product UI.
4. **Expand partial GODMODE levels** — L1 intent profile, L9 full intention chains, L14 scene-function ledger, L16 six-layer dialogue, L20 audience curve, L22 object meaning arcs, L23 theme argument graph, L30 ending proof, and L34 AnnotationAtom evidence envelopes.
