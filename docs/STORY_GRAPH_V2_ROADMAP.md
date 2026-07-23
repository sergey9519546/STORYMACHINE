# Story Graph V2 — Implementation Roadmap

**Date:** 2026-07-15  
**Status:** Implementation Plan  
**Parent:** STORY_GRAPH_ARCHITECTURE_V2.md (comprehensive vision)

---

## Context

**Current State (V1)**:
- ✅ Causal Graph implemented (setup→payoff tracking)
- ✅ 6 metrics operational: promisePaymentRatio, forwardEdgeRatio, arcCoherence, escalationMonotonicity, causalDensity, isolatedScenes
- ✅ Validated on 364 real screenplays (100% success rate)
- ✅ **Key finding**: Diagnostic value (unpaid promises) > Discriminative value (AUC)

**Vision (V2)**: 10-layer multi-graph with interactive diagnostics (see ARCHITECTURE_V2.md)

**This Document**: Phased implementation plan with validation gates

---

## Guiding Principles

1. **Demand before rigor** (AGENTS.md): Each layer must prove user value before building the next
2. **Validate before expand**: Run user testing + discrimination testing for each phase
3. **Diagnostic over discriminative**: Focus on actionable insights, not just metrics
4. **Incremental deployment**: Each phase ships independently, backward compatible

---

## Phase 1: Foundation Enhancement (CURRENT)

**Status**: ✅ Complete

### Deliverables
- [x] Fix forwardEdgeRatio calculation (use promiseMap directly)
- [x] Position-sensitivity regression test (env-gated)
- [x] Architecture V2 design document

### Validation
- Tests pass: ✅ 9549/9625 passing
- No regressions: ✅ Verified

### Next Gate
- P0: User testing with real writers on unpaid promise report

---

## Phase 2: Enhanced Diagnostics (NEXT — 1 week)

**Goal**: Make unpaid promise report actionable with severity + suggestions

### Deliverables
1. **Severity Classification**
   - Critical: Setup in Act 1, never paid off
   - Medium: Setup in Act 2, never paid off
   - Low: Minor setup (< 5 mentions), never paid off

2. **Contextual Suggestions**
   ```typescript
   interface EnhancedDiagnostic {
     severity: 'critical' | 'medium' | 'low';
     type: string;
     sceneIdx: number;
     message: string;
     impact: string;  // Why this matters
     suggestions: string[];  // How to fix it
     relatedScenes?: number[];  // Connected scenes
   }
   ```

3. **Strength Detection**
   - Identify what's working well (tight causal chains, good payment ratio)
   - Show positive feedback alongside issues

### Implementation
- Extend `StoryGraphReport.findings` with new structure
- Add severity scoring based on:
  - Setup position (earlier = more critical if unpaid)
  - Promise prominence (how many times referenced)
  - Story impact (does it block understanding)
  
### Validation Gates
- [ ] User testing: Do writers act on the suggestions?
- [ ] Accuracy testing: Are severity rankings correct?
- [ ] Trust testing: Do writers trust the findings?

**GO/NO-GO**: If writers don't find enhanced diagnostics more useful than V1, pause and iterate before Phase 3.

---

## Phase 3: Question Graph Layer (2 weeks)

**Goal**: Track dramatic questions posed and answered

### Why This Layer Next
1. **High user value**: "What questions does my story raise?" is a common writer concern
2. **Proven signal**: Questions are structurally detectable (question marks, mystery setups)
3. **Discrimination potential**: Question density correlates with engagement

### Deliverables
1. **Question Node Type**
   ```typescript
   interface QuestionNode extends StoryGraphNode {
     type: 'question';
     questionText: string;
     category: 'dramatic' | 'mystery' | 'curiosity' | 'thematic';
     posedAt: number;  // scene index
     answeredAt?: number;  // scene index (if answered)
   }
   ```

2. **Question Detection Methods**
   - **Pattern matching**: Literal question marks in dialogue/action
   - **LLM extraction**: "What dramatic questions does this scene raise?"
   - **Setup detection**: Existing seededClueIds that are mysteries

3. **Question Metrics**
   - Question answer ratio (% of questions answered)
   - Open question curve (questions open at each scene)
   - Question lifespan distribution
   - Question density (questions per act)

4. **Question Diagnostics**
   - Unanswered questions (mysteries never resolved)
   - Questions answered too quickly (< 3 scenes)
   - Question drought (long stretches without new questions)
   - Forgotten mysteries (question ignored for > 20 scenes)

### Implementation Strategy
- Create `extractQuestions(analysis: FountainAnalysis): QuestionNode[]`
- Integrate into `buildStoryGraph()` as new node/edge type
- Add to `StoryGraphReport` as optional `questionGraph` field

### Validation Gates
- [ ] Extraction accuracy: Manual review of 50 scripts, measure precision/recall
- [ ] User value: Do writers find question tracking useful?
- [ ] Discrimination test: Does question density improve AUC on real corpus?

**GO/NO-GO**: If extraction accuracy < 70% or writers don't find it useful, iterate extraction method before Phase 4.

---

## Phase 4: Thematic Graph Layer (3 weeks)

**Goal**: Track theme echoes, motifs, and philosophical arguments

### Why This Layer Next
1. **High artistic value**: Theme development is core to craft
2. **Hard to self-diagnose**: Writers often can't see their own thematic patterns
3. **Unique capability**: No other tool does this

### Deliverables
1. **Theme Node Type**
   ```typescript
   interface ThemeNode extends StoryGraphNode {
     type: 'theme';
     themeText: string;
     category: 'value-statement' | 'motif' | 'symbol' | 'argument';
     sceneIdx: number;
   }
   ```

2. **Theme Detection Methods**
   - **LLM extraction**: "What theme or idea does this scene express?"
   - **Semantic similarity**: Find thematic echoes via embeddings
   - **Motif tracking**: Recurring objects/colors/images
   - **Value conflicts**: Opposing positions (freedom vs security)

3. **Theme Edges**
   - `echoes`: Scene B reinforces theme from A
   - `contradicts`: Scene B presents counter-argument to A
   - `develops`: Scene B deepens theme from A
   - `synthesizes`: Scene B resolves thesis/antithesis

4. **Theme Metrics**
   - Thematic unity (coherence of echoes)
   - Motif repetition score (rule of three detection)
   - Thematic resolution (are arguments concluded)
   - Symbol density

5. **Theme Diagnostics**
   - Orphaned themes (introduced once, never developed)
   - Contradictory themes (unintentional philosophical chaos)
   - Missing synthesis (thesis vs antithesis without resolution)
   - Heavy-handed themes (stated but not demonstrated)

### Implementation Strategy
- LLM integration required (OpenAI/Anthropic API)
- Embedding-based similarity (use existing vector store if available)
- Incremental: Start with motif tracking (simpler), then expand to themes

### Validation Gates
- [ ] Extraction accuracy: Expert review (professional screenwriter validation)
- [ ] Thematic consistency: Test on scripts with known themes
- [ ] User value: Writers find insights they couldn't see themselves?
- [ ] Discrimination test: Does thematic unity correlate with quality?

**GO/NO-GO**: This is the highest-risk phase (LLM extraction quality). If accuracy < 60% or false positives frustrate writers, pivot approach.

---

## Phase 5: Path Analysis Tools (2 weeks)

**Goal**: Let writers trace causality chains interactively

### Deliverables
1. **Trace Functions**
   ```typescript
   interface PathAnalysisTools {
     traceCauses(sceneIdx: number): CausalChain;
     traceConsequences(sceneIdx: number): CausalChain;
     findCriticalPath(): number[];  // Minimum scenes to tell story
     findBridges(): number[];  // Scenes connecting separate threads
   }
   ```

2. **Critical Path Algorithm**
   - Graph traversal: Find minimum spanning tree of causal edges
   - Identifies scenes essential to main plot
   - Shows which scenes could be cut without breaking causality

3. **Impact Simulation**
   - `simulateRemoval(sceneIdx: number): ImpactReport`
   - Shows what breaks if a scene is removed
   - Identifies orphaned promises, broken chains

### Implementation Strategy
- Pure graph algorithm work (no LLM needed)
- Build on existing graph structure from Phase 1-4
- API-first: expose as functions before UI

### Validation Gates
- [ ] Algorithm correctness: Test on known narrative structures
- [ ] User value: Do writers use these tools?
- [ ] Performance: Sub-second response for 150-scene scripts

---

## Phase 6: Comparative Benchmarking (2 weeks)

**Goal**: "How does my structure compare to successful films?"

### Deliverables
1. **Corpus Statistics**
   - Build benchmark dataset from 364-screenplay corpus
   - Calculate percentile distributions for all metrics
   - Genre-specific norms (drama vs thriller vs comedy)

2. **Comparison Report**
   ```typescript
   interface BenchmarkComparison {
     metric: string;
     yourValue: number;
     genreAverage: number;
     percentile: number;  // Where you rank (0-100)
     topQuartile: number;  // What's considered strong
     insight: string;
   }
   ```

3. **Exemplar Matching**
   - Find structurally similar successful scripts
   - "Your setup-payoff pattern resembles [The Usual Suspects]"
   - Show divergence points

### Implementation Strategy
- Pre-compute corpus statistics (one-time analysis)
- Store in static JSON files (fast lookup)
- Simple percentile calculations at runtime

### Validation Gates
- [ ] Corpus coverage: At least 100 scripts per major genre
- [ ] Statistical validity: Sufficient sample sizes
- [ ] User value: Writers find comparisons motivating?

---

## Phase 7: Interactive Visualization (4 weeks)

**Goal**: Visual graph exploration UI

### Deliverables (API + Frontend)
1. **Graph Visualization API**
   - `/api/story-graph/visualize` endpoint
   - Returns D3.js-compatible graph data
   - Support filters (show only causal layer, hide temporal edges, etc.)

2. **Interactive UI Components**
   - Node-link diagram (force-directed layout)
   - Click node → see details + connected nodes
   - Highlight causal chains
   - Color-code by layer/severity

3. **Narrative Surgery Tools**
   - Drag to reorder scenes (simulate structural changes)
   - Click scene → "What if I removed this?"
   - Insert new scene → "Where should this go?"

### Implementation Strategy
- React + D3.js (existing tech stack)
- Start with static visualization, add interactivity incrementally
- Mobile-responsive (writers work on tablets)

### Validation Gates
- [ ] Usability testing: Writers can navigate without training?
- [ ] Performance: Smooth interaction with 150+ nodes
- [ ] Value: Writers prefer visual vs text report?

---

## Phase 8+: Future Layers (TBD)

Additional layers from ARCHITECTURE_V2.md, prioritized by user demand:

- **Information Flow Graph** (dramatic irony, secrets)
- **Power/Stakes Graph** (resource tracking, escalation)
- **Spatial Graph** (journey structure, thresholds)
- **Temporal Graph expansion** (flashback analysis)
- **Character Relationship Graph expansion** (influence flows)

**Priority**: Wait for P0 user validation before committing to these.

---

## Success Metrics

### Per-Phase Metrics
- **User adoption**: % of users who enable the feature
- **Engagement**: Frequency of use per session
- **Action rate**: % of insights that lead to script changes
- **Trust**: User-reported confidence in findings

### Overall V2 Success
- **P1 achievement**: Does multi-layer graph improve AUC ≥ 0.70 on real corpus?
- **User retention**: Do writers return after seeing story graph?
- **Qualitative feedback**: "This showed me something I couldn't see"

---

## Risk Mitigation

### Technical Risks
- **LLM extraction quality**: Phases 3-4 depend on accurate extraction
  - *Mitigation*: Validate extraction accuracy before proceeding
- **Performance**: Graph algorithms scale poorly
  - *Mitigation*: Profile early, optimize critical paths, consider caching
- **Complexity**: 10 layers might overwhelm users
  - *Mitigation*: Progressive disclosure, default to 2-3 most relevant layers

### Product Risks
- **Feature bloat**: Building beyond user needs
  - *Mitigation*: Hard gates after each phase (user testing required)
- **Discrimination failure**: Doesn't improve AUC
  - *Mitigation*: P1 goal is real-world validation, not just AUC
- **Actionability gap**: Insights that writers can't act on
  - *Mitigation*: Every diagnostic must include suggestions

---

## Decision Points

### After Phase 2: Continue vs Pivot?
- **Continue if**: Enhanced diagnostics show measurably higher action rate
- **Pivot if**: Writers ignore suggestions or prefer simpler V1 report

### After Phase 4: LLM vs Non-LLM Path?
- **LLM path**: Continue if extraction accuracy ≥ 70%
- **Non-LLM path**: Fall back to pattern matching + manual tagging if LLM fails

### After Phase 6: Product vs Research?
- **Product focus**: If writers adopt and pay for story graph
- **Research focus**: If discrimination potential is there but UX needs work

---

## Timeline Estimate

- **Phase 1**: ✅ Complete
- **Phase 2**: 1 week (enhanced diagnostics)
- **Phase 3**: 2 weeks (question graph)
- **Phase 4**: 3 weeks (thematic graph)
- **Phase 5**: 2 weeks (path analysis)
- **Phase 6**: 2 weeks (benchmarking)
- **Phase 7**: 4 weeks (visualization)

**Total**: ~14 weeks (3.5 months) to complete Phases 2-7

**Critical Path**: P0 user validation gates each phase, so timeline is contingent on passing validation.

---

## Current Status: Ready for Phase 2

✅ **V1 Foundation Complete**:
- Causal graph operational
- Validated on 364 real scripts
- Unpaid promise detection working
- forwardEdgeRatio fix committed
- Architecture V2 designed

🎯 **Next Action**: Implement enhanced diagnostics (Phase 2)

📋 **Blocker**: Need P0 user testing results on current unpaid promise report before proceeding.

---

## Related Documents
- `STORY_GRAPH_ARCHITECTURE_V2.md` — Comprehensive vision (10 layers)
- `STORY_GRAPH_FINAL_REPORT_2026-07-15.md` — V1 validation results
- `AGENTS.md` — Project principles (demand before rigor)
- `ROADMAP.md` — Overall project phases
