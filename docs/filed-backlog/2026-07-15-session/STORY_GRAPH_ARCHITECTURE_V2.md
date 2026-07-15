# Story Graph Architecture V2 — The Absolute Vision

**Date:** 2026-07-15  
**Status:** Design Document — Comprehensive Multi-Layer Story Graph System

---

## Executive Summary

This document defines the **most comprehensive story graph system possible** for narrative analysis. Instead of a single-layer graph tracking only setup→payoff relationships, we design a **multi-layer, hierarchical, dynamic graph** that captures ALL structural relationships in a narrative.

**Core Insight**: Stories aren't just causal chains — they're **simultaneous networks** of causality, character relationships, thematic echoes, information flow, emotional progression, temporal structure, power dynamics, and dramatic questions.

---

## Current Limitations (V1)

The existing story-graph.ts (400 lines) tracks:
- **One graph type**: Causal (setup→payoff)
- **Three edge types**: causal, character-arc, temporal
- **One node type**: promise nodes
- **Six metrics**: promisePaymentRatio, forwardEdgeRatio, arcCoherence, escalationMonotonicity, causalDensity, isolatedScenes

**Value discovered**: Diagnostic (unpaid promises) > Discriminative (AUC)

**Key finding**: "First tool to automatically detect 'you set this up and never paid it off' at scale"

---

## The Absolute Vision: 10-Layer Story Graph

### Layer 1: Causal Graph (EXISTS — enhance)
**What it captures**: Setup→Payoff, Action→Consequence, Decision→Outcome

**Current nodes**: Promise nodes (setup, payoff)  
**Enhanced nodes**: Event nodes, Decision nodes, Consequence nodes, Obstacle nodes, Response nodes

**Current edges**: causal (setup→payoff)  
**Enhanced edges**:
- `causes`: Strong causality (A causes B)
- `enables`: Weak causality (A makes B possible)
- `prevents`: Negative causality (A blocks B)
- `resolves`: Resolution (A resolves tension from B)

**Metrics**:
- Promise payment ratio ✓ (exists)
- Causal chain length (average cause→effect distance)
- Causal density ✓ (exists)
- Critical path (minimum scenes needed to tell the story)
- Chekhov's gun score (% of introduced elements that matter)

**Diagnostics**:
- Unpaid promises ✓ (exists)
- Orphaned payoffs (payoff without setup)
- Causal violations (effect before cause in story time)
- Isolated causal chains (disconnected from main plot)

---

### Layer 2: Character Relationship Graph (PARTIALLY EXISTS — expand)
**What it captures**: How characters relate, influence, and change each other

**Nodes**: Character state nodes (emotional states, beliefs, relationships)

**Edges**:
- `influences`: Character A changes character B
- `allies`: Characters cooperate
- `conflicts`: Characters oppose
- `mentors`: Character A teaches B
- `betrays`: Character A betrays B's trust
- `loves`: Romantic connection
- `depends-on`: Character A needs B

**Metrics**:
- Character arc completion (% of characters with beginning→middle→end states)
- Character agency (% of events driven by character choice vs external forces)
- Relationship arc completion (% of relationship threads resolved)
- Character centrality (which characters are structural hubs)
- Ensemble balance (how evenly distributed is narrative focus)

**Diagnostics**:
- Flat characters (no state changes)
- Passive protagonists (reacting, not driving)
- Unresolved relationships
- Orphaned characters (no meaningful connections)

---

### Layer 3: Thematic Graph (NEW — high value)
**What it captures**: Ideas, motifs, symbols, philosophical arguments

**Nodes**: Theme statement nodes, Motif nodes, Symbol nodes, Value nodes

**Edges**:
- `echoes`: Scene B echoes theme from scene A
- `contradicts`: Scene B presents counter-argument to A
- `develops`: Scene B deepens theme from A
- `synthesizes`: Scene B resolves thesis (A) vs antithesis (B)
- `symbolizes`: Object/action A represents theme B

**Metrics**:
- Thematic unity (coherence of theme echoes)
- Motif repetition (rule of three, variation patterns)
- Thematic resolution (are arguments concluded)
- Symbol density (richness of symbolic layer)

**Diagnostics**:
- Orphaned themes (introduced but never developed)
- Contradictory themes (unintentional philosophical chaos)
- Missing synthesis (thesis vs antithesis without resolution)
- Heavy-handed themes (stated but not demonstrated)

**Implementation**: 
- LLM extraction: "What theme/idea is this scene expressing?"
- Semantic similarity: Find thematic echoes via embeddings
- Pattern matching: Track recurring symbols/motifs

---

### Layer 4: Information Flow Graph (NEW — high value for mystery/thriller)
**What it captures**: Who knows what, when they learn it, dramatic irony

**Nodes**: Information nodes (facts, secrets, lies)

**Edges**:
- `reveals`: Character A learns fact X
- `conceals`: Character A hides fact X from B
- `lies`: Character A tells false fact X to B
- `discovers`: Character A uncovers hidden fact X
- `audience-knows`: Audience learns X (dramatic irony when character doesn't)

**Metrics**:
- Dramatic irony score (% of time audience knows more than characters)
- Mystery density (unanswered questions per scene)
- Revelation timing (are reveals evenly distributed)
- Secret payload (impact when secrets are revealed)

**Diagnostics**:
- Forgotten secrets (introduced but never revealed)
- Unearned revelations (no setup for the information)
- Information dumps (too much revealed at once)
- Dramatic irony gaps (audience confused alongside characters)

---

### Layer 5: Question Graph (NEW — high value)
**What it captures**: Dramatic questions that drive engagement

**Nodes**: Question nodes (dramatic questions, mysteries)

**Edges**:
- `poses`: Scene A raises question Q
- `answers`: Scene B answers question Q from scene A
- `deepens`: Scene B complicates question Q
- `defers`: Scene B delays answer to Q (suspense technique)

**Metrics**:
- Question answer ratio (% of posed questions that are answered)
- Open question curve (how many questions are open at each point)
- Question lifespan (how long questions remain open)
- Curiosity hooks per act (are questions evenly distributed)

**Diagnostics**:
- Unanswered questions (mysteries set up but never resolved)
- Questions answered too quickly (no suspense built)
- Question drought (long stretches with no new questions)
- Forgotten mysteries (question raised then ignored for too long)

**Implementation**:
- LLM extraction: "What questions does this scene raise? What questions does it answer?"
- Pattern matching: "Will X happen?" "Who did Y?" "Why did Z occur?"

---

### Layer 6: Emotional Graph (EXISTS in emotional-arc.ts — integrate)
**What it captures**: Tension, suspense, emotional beats

**Nodes**: Emotional moment nodes (beats)

**Edges**:
- `escalates`: Scene B raises tension from A
- `releases`: Scene B provides cathartic release after A
- `mirrors`: Scene B echoes emotional tone of A
- `contrasts`: Scene B provides tonal shift from A

**Metrics**:
- Arc coherence ✓ (exists in emotional-arc.ts)
- Escalation monotonicity ✓ (exists)
- Cathartic payoff (setup emotional investment → release)
- Tonal consistency

**Diagnostics**:
- Flat emotional arc (no escalation)
- Missing catharsis (tension built but not released)
- Tonal whiplash (jarring shifts)
- Emotional numbness (too much intensity, no variation)

---

### Layer 7: Temporal Graph (PARTIALLY EXISTS — expand)
**What it captures**: Time structure, flashbacks, parallel timelines

**Nodes**: Time period nodes, Temporal anchor nodes

**Edges**:
- `follows`: Scene B follows A in story time
- `narrated-after`: Scene B shows events before A (flashback)
- `parallel`: Scenes A and B happen simultaneously
- `returns-to`: Scene B returns to same time/place as A

**Metrics**:
- Temporal consistency (no paradoxes)
- Flashback ratio (% of non-linear scenes)
- Timeline convergence (when parallel threads merge)
- Temporal momentum (pacing)

**Diagnostics**:
- Temporal paradoxes (impossible timelines)
- Unclear time jumps (audience lost)
- Unnecessary flashbacks (could be told linearly)
- Parallel threads that never converge

---

### Layer 8: Spatial Graph (NEW)
**What it captures**: Location significance, journey structure, thresholds

**Nodes**: Location nodes

**Edges**:
- `moves-to`: Character travels from A to B
- `returns-to`: Character returns to significant location A
- `crosses-threshold`: Character enters new world/zone
- `parallels`: Different characters in same location type

**Metrics**:
- Journey completion (outward journey → return)
- Threshold count (how many worlds crossed)
- Location significance (are returns meaningful)
- Geographic scope

**Diagnostics**:
- Meaningless locations (places that don't matter)
- Missed callbacks (return to locations without thematic payoff)
- Static geography (no journey/transformation)

---

### Layer 9: Power/Stakes Graph (NEW)
**What it captures**: Who has power, resources, stakes escalation

**Nodes**: Power state nodes, Resource nodes, Stake nodes

**Edges**:
- `gains-power`: Character acquires resource/capability
- `loses-power`: Character loses resource/capability
- `raises-stakes`: Scene increases what's at risk
- `lowers-stakes`: Scene reduces tension (dangerous)

**Metrics**:
- Stakes escalation (are risks increasing)
- Power dynamics (shifts in who has control)
- Zero-sum games (power transfers)
- Resource tracking (are resources consistent)

**Diagnostics**:
- Falling stakes (tension decreases)
- Unearned power (capabilities without setup)
- Forgotten resources (introduced then ignored)
- Static power dynamics (no shifts)

---

### Layer 10: Structural Graph (NEW)
**What it captures**: Act/sequence boundaries, plot threads, intercutting

**Nodes**: Structural unit nodes (acts, sequences, plot threads)

**Edges**:
- `belongs-to`: Scene belongs to act/sequence
- `intercuts`: Plot thread A cuts to thread B
- `converges`: Plot threads A and B merge
- `diverges`: Single thread splits into A and B

**Metrics**:
- Act balance (scene distribution across acts)
- Plot thread count (how many storylines)
- Thread convergence (when do threads merge)
- Intercutting rhythm (frequency of thread switches)

**Diagnostics**:
- Unbalanced acts (Act 2 too long/short)
- Orphaned threads (plot lines that don't converge)
- Thread imbalance (A-story vs B-story screen time)
- Jarring cuts (thread switches without motivation)

---

## Hierarchical Analysis

Not just scene-to-scene, but **four levels of granularity**:

### Micro: Beat-Level Graph
- Individual dramatic beats within scenes
- Moment-to-moment causality
- Fine-grained character reactions

### Meso: Scene-Level Graph (CURRENT LEVEL)
- Scene-to-scene connections
- Primary analysis level

### Macro: Sequence/Act-Level Graph
- How sequences connect
- Act-to-act escalation
- Major structural movements

### Meta: Story-Level Graph
- Overall story shape
- Genre pattern matching
- Comparative benchmarking

---

## Cross-Layer Analysis

The real power comes from **analyzing across layers**:

### Causal-Emotional Correlation
Does causal complexity correlate with emotional intensity?

### Character-Thematic Integration
Do character arcs demonstrate themes?

### Question-Stakes Alignment
Do dramatic questions raise stakes?

### Information-Suspense Interaction
Does revealing/concealing information build tension?

### Temporal-Causal Coherence
Do flashbacks enhance causality understanding?

---

## Dynamic Graph Evolution

Track **how the graph changes** as the story unfolds:

### Progressive Complexity Curve
- How does graph density evolve?
- When do critical edges form?
- When do threads converge/diverge?

### Structural Keyframes
- Identify moments where graph structure changes significantly
- These are often act breaks, reversals, revelations

### Audience Knowledge State
- What does audience know at each moment?
- When do understanding breakthroughs occur?

---

## Advanced Analytics

### Path Analysis
- **Trace causality**: Click any event, see all causes and consequences
- **Critical path**: What's the minimum scene set to tell the story?
- **Alternative paths**: Where could the story have gone differently?
- **Longest chain**: What's the deepest causal chain?

### Subgraph Analysis
- **Extract plot threads**: Isolate A-story, B-story, C-story
- **Find bridges**: Which scenes connect otherwise separate threads?
- **Detect parallelism**: Identify mirrored structures

### Pattern Recognition
- **Rule of three**: Detect repeated patterns
- **Bookends**: Find symmetric opening/closing
- **Callbacks**: Identify references to earlier moments
- **Genre patterns**: Match to hero's journey, romance beats, etc.

### Anomaly Detection
- **Isolated scenes** ✓ (exists)
- **Causal violations**: Effect before cause
- **Character inconsistencies**: Unexplained behavior changes
- **Temporal paradoxes**: Impossible timelines
- **Thematic contradictions**: Unintentional message conflicts

### Comparative Benchmarking
- **Genre norms**: How does this compare to similar stories?
- **Corpus statistics**: Where does this fall in the distribution?
- **Exemplar comparison**: How similar to successful reference works?

---

## Interactive Diagnostic System

### Current (V1)
"Unpaid promises: 223"

### Absolute Vision (V2)
**Actionable, prioritized, specific insights**:

```
🔴 CRITICAL: Act 3 Orphaned Payoff
  Scene 87 (page 94): Sarah confronts the killer
  Problem: No setup for Sarah having detective skills
  Impact: Audience confusion, unearned resolution
  Suggestion: Add scene in Act 1 showing Sarah's investigative background
  
🟡 MEDIUM: Flat Character Arc  
  Character: Marcus
  Problem: Marcus ends in same emotional state as beginning
  Impact: Wasted screen time, audience disengagement
  Suggestion: Give Marcus a personal stake that evolves
  
🟢 LOW: Theme Underdeveloped
  Theme: "Trust vs betrayal"
  Problem: Introduced in Scene 12, mentioned once more in Scene 89
  Impact: Thematic potential unrealized
  Suggestion: Add 2-3 scenes demonstrating theme through action
  
✓ STRENGTH: Strong Causal Chain
  Scenes 34→56→78→95 form tight cause-effect chain
  The gun introduced in 34 is the murder weapon in 95
  Setup distance: 61 scenes (strong patience)

📊 COMPARATIVE: Question Density
  Your script: 1.2 questions per scene
  Genre average: 1.8 questions per scene
  Top quartile: 2.3 questions per scene
  Insight: Consider raising more dramatic questions
```

---

## Implementation Architecture

### Core Data Structure

```typescript
interface StoryGraphV2 {
  // Multi-layer structure
  layers: {
    causal: CausalLayer;
    character: CharacterLayer;
    thematic: ThematicLayer;
    information: InformationLayer;
    question: QuestionLayer;
    emotional: EmotionalLayer;
    temporal: TemporalLayer;
    spatial: SpatialLayer;
    power: PowerLayer;
    structural: StructuralLayer;
  };
  
  // Each layer is a graph
  // Layers share node references but have different edge types
  
  // Cross-layer metrics
  crossLayerMetrics: {
    causalEmotionalCorrelation: number;
    characterThematicIntegration: number;
    questionStakesAlignment: number;
    // ... more
  };
  
  // Hierarchical views
  hierarchy: {
    beat: BeatLevelGraph;
    scene: SceneLevelGraph;  // Current level
    sequence: SequenceLevelGraph;
    act: ActLevelGraph;
    story: StoryLevelGraph;
  };
  
  // Dynamic evolution
  evolution: {
    complexityCurve: number[];  // Graph density over time
    structuralKeyframes: number[];  // Moments of major change
    threadLifespans: ThreadLifespan[];
  };
  
  // Pattern detection
  patterns: {
    ruleOfThree: DetectedPattern[];
    bookends: DetectedPattern[];
    callbacks: DetectedPattern[];
    genreMatches: GenrePattern[];
  };
  
  // Anomalies
  anomalies: {
    causalViolations: Anomaly[];
    characterInconsistencies: Anomaly[];
    temporalParadoxes: Anomaly[];
    thematicContradictions: Anomaly[];
  };
  
  // Diagnostics
  diagnostics: {
    critical: Diagnostic[];  // Must fix
    medium: Diagnostic[];    // Should fix
    low: Diagnostic[];       // Could improve
    strengths: Diagnostic[]; // What's working well
  };
  
  // Comparative benchmarks
  benchmarks: {
    genreNorms: BenchmarkComparison;
    corpusStats: BenchmarkComparison;
    exemplarSimilarity: ExemplarComparison[];
  };
  
  // Interactive tools
  tools: {
    traceNode: (nodeId: string) => CausalTrace;
    extractThread: (threadId: string) => Subgraph;
    findCriticalPath: () => SceneId[];
    simulateRemoval: (sceneId: string) => ImpactReport;
    suggestInsertion: (afterSceneId: string) => SuggestionReport;
  };
}
```

### Signal Extraction Strategy

**Current V1**: Relies on manually tagged signals (seededClueIds, payoffSetupIds)

**V2 Multi-Source Fusion**:

1. **Manual tags** (when available): seededClueIds, payoffSetupIds, dramaticTurn, revelation
2. **LLM extraction**: 
   - "What causal relationships exist in this scene?"
   - "What themes does this scene express?"
   - "What questions does this scene raise/answer?"
   - "What information is revealed/concealed?"
   - "How do character relationships change?"
3. **Pattern matching**: Structural patterns from text (questions marks, conflict indicators, location changes)
4. **Semantic similarity**: Find thematic/motif echoes via embeddings
5. **Entity tracking**: Follow characters, objects, locations through story
6. **Temporal reasoning**: Parse time references, flashback indicators
7. **Dependency parsing**: Extract action→consequence from sentence structure

### Phased Implementation

**Phase 1: Foundation** (Current + fixes)
- Fix forwardEdgeRatio calculation
- Enhance unpaid promise report with severity
- Add basic diagnostic insights

**Phase 2: Question + Theme Layers** (Highest ROI)
- Implement Question Graph
- Implement Thematic Graph  
- LLM-based extraction for both

**Phase 3: Information + Power Layers**
- Implement Information Flow Graph (dramatic irony)
- Implement Power/Stakes Graph

**Phase 4: Hierarchical + Cross-Layer**
- Add sequence/act level analysis
- Implement cross-layer correlation metrics

**Phase 5: Advanced Analytics**
- Path tracing tools
- Pattern recognition
- Anomaly detection
- Comparative benchmarking

**Phase 6: Interactive Tools**
- Visual graph exploration
- Narrative surgery tools (simulate changes)
- Suggestion engine

---

## Validation Strategy

Each new layer must prove value:

1. **User testing**: Do writers find it useful?
2. **Discrimination testing**: Does it improve AUC on real corpus?
3. **Actionability testing**: Can writers act on the insights?
4. **Trust testing**: Are the findings accurate?

Don't build layers that don't pass these gates.

---

## The Ultimate Deliverable

A system where a writer can:

1. **Upload a screenplay**
2. **See a multi-layer graph visualization** of all structural relationships
3. **Click any node** to trace all its connections across layers
4. **Receive prioritized diagnostics**: "Here are the 5 most important issues, ranked by impact"
5. **Explore suggestions**: "Here are 3 ways to fix this problem"
6. **Simulate changes**: "What if I removed this scene? What breaks?"
7. **Compare to benchmarks**: "How does my structure compare to successful films in this genre?"
8. **Export a report**: For sharing with collaborators

---

## Conclusion

The **absolute best story graph** isn't a single graph—it's a **multi-layer, hierarchical, dynamic, interactive diagnostic system** that captures ALL structural relationships in narrative and provides actionable insights for writers.

Current V1 discovered the killer feature: **"You set this up and never paid it off."**

V2 extends this to: **"Here's everything about your story's structure, what's working, what's not, why, and how to fix it."**

This is the vision. Now we build it, one validated layer at a time.
