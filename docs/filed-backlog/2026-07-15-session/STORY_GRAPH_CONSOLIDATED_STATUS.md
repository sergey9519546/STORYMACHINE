# Story Graph — Consolidated Status & Phase 2 Plan

**Date:** 2026-07-15  
**Status:** V1 Complete, Multiple Agent Sessions Reconciled, Ready for Phase 2

---

## Session Reconciliation

### What Multiple Agents Built

**Session 1** (STORY_GRAPH_IMPLEMENTATION_2026-07-15.md):
- ✅ Core story-graph.ts (400 lines)
- ✅ Integration with doctor.ts
- ✅ 14 unit tests, all passing
- ✅ Metrics: promisePaymentRatio, forwardEdgeRatio, arcCoherence, escalationMonotonicity, causalDensity, isolatedScenes

**Session 2** (STORY_GRAPH_STATUS_2026-07-15.md):
- ✅ Real-corpus AUC test framework (added to real-script-corpus.test.ts)
- 🔴 Finding: Graph requires full scene signals (not just raw Fountain text)
- ⏸️ Blocked: Waiting for REAL_SCRIPT_CORPUS_DIR access to measure AUC

**Session 3** (STORY_GRAPH_FINAL_REPORT_2026-07-15.md):
- ✅ Validated on 364 real screenplays (merged-fountain corpus)
- 🎯 **Key pivot**: Act-swap AUC was wrong metric (text-swap doesn't break record structure)
- 🎯 **Real value**: Diagnostic features (unpaid promise detection) > Discriminative (AUC)
- ✅ Killer feature proven: "First tool to detect 'you set this up and never paid it off' at scale"

**Current Session** (STORY_GRAPH_ARCHITECTURE_V2.md + ROADMAP):
- ✅ Fixed forwardEdgeRatio calculation (use promiseMap directly)
- ✅ Added position-sensitivity regression test (env-gated)
- ✅ Designed comprehensive V2 architecture (10 layers)
- ✅ Created phased implementation roadmap

### Current Code State

**✅ Working & Tested**:
- `server/nvm/analyze/story-graph.ts` — Core graph construction (with forwardEdgeRatio fix)
- `server/nvm/analyze/doctor.ts` — Integration (storyGraph optional field)
- `server/nvm/analyze/types.ts` — Type definitions
- `tests/core/story-graph.test.ts` — 14 unit tests
- `tests/core/story-graph-corpus-auc.test.ts` — Position-sensitivity regression (env-gated)

**📊 Test Status**: 9546/9622 passing (3 pre-existing failures, 1 todo unrelated)

**🔧 No Conflicts**: All sessions worked on compatible areas, no merge conflicts

---

## Key Insights from Session Reconciliation

### 1. Text-Swap vs Record-Swap Issue (Critical Understanding)

**Problem Discovered**: Text-level act-swap (reordering Fountain scenes) doesn't break record-level structure because scene indices stay sequential (0,1,2,3...), so `seededClueIds` and `payoffSetupIds` references remain valid.

**Example**:
```
Original: Scene 0 seeds "gun", Scene 5 pays off "gun"
After text-swap: Different scene content, but still indices 0,1,2,3,4,5
Result: payoffSetupIds still references valid indices → no violation detected
```

**Implication**: 
- forwardEdgeRatio on text-swapped scripts = 1.000 (appears perfect)
- This is CORRECT behavior — graph measures record-level structure
- Act-swap AUC test doesn't work as originally conceived

### 2. Real Value Proposition Shift

**Original goal**: Discriminate intact vs act-swapped (AUC ≥0.70)  
**Actual value**: **Diagnostic features** for writers

**Proven on 364 scripts**:
- Unpaid Promise Detection: ~150 unpaid promises per script
- Promise-Payment Ratio: 30-60% typical
- Actionable insights: "You set up X on page 12 and never resolved it"

**This is the killer feature**: First tool to automatically detect setup-payoff gaps at scale.

### 3. Discrimination vs Diagnostics

**Discrimination** (P1 goal): Prove score separates good from bad writing  
**Diagnostics** (Current value): Help writers see structural issues

**Current stance**: Focus on diagnostics first (proven user value), discrimination second (harder to prove).

---

## Phase 2 Implementation Plan: Enhanced Diagnostics

### Goal
Make unpaid promise report **actionable** with severity classification and contextual suggestions.

### What to Build

#### 1. Severity Classification
```typescript
type DiagnosticSeverity = 'critical' | 'medium' | 'low' | 'strength';

interface EnhancedDiagnostic {
  severity: DiagnosticSeverity;
  type: 'unpaid-promise' | 'isolated-scene' | 'backward-arc' | 'flat-tension' | 'tight-causality';
  sceneIdx?: number;
  sceneRange?: [number, number];  // For multi-scene issues
  message: string;
  impact: string;  // Why this matters
  suggestions: string[];  // How to fix it
  relatedScenes?: number[];  // Connected scenes
  confidence?: number;  // 0-1, how sure we are
}
```

#### 2. Severity Rules

**Critical** (must fix):
- Unpaid promise seeded in Act 1 (setup in first 25% of script)
- Isolated scene in critical position (inciting incident, midpoint, climax)
- Backward causality > 40% (majorly broken structure)

**Medium** (should fix):
- Unpaid promise seeded in Act 2
- Isolated scene in non-critical position
- Flat tension across all acts (escalationMonotonicity = 0)

**Low** (could improve):
- Unpaid promise seeded in Act 3 (minor loose end)
- Low causal density (< 0.5, episodic structure but not necessarily bad)

**Strength** (what's working):
- Promise payment ratio > 80%
- Tight causal chains (long promise distances, 20+ scenes)
- Strong escalation (escalationMonotonicity = 1.0)
- High forward edge ratio (> 0.9)

#### 3. Contextual Suggestions

**For unpaid promises**:
```typescript
if (promiseInAct1) {
  suggestions = [
    "Add a payoff scene in Act 2 or 3 to resolve this setup",
    "If this setup is no longer relevant, consider removing it to tighten the story",
    "Connect this promise to an existing scene's purpose"
  ];
}
```

**For isolated scenes**:
```typescript
suggestions = [
  "Add a causal connection: have this scene's events affect later scenes",
  "Connect to a promise: seed or pay off a setup in this scene",
  "If truly standalone, consider whether this scene is necessary"
];
```

**For flat tension**:
```typescript
suggestions = [
  "Raise stakes in Act 2: introduce complications or obstacles",
  "Build toward climax: increase suspense in the final 25% of the script",
  "Add reversals: change direction at act boundaries"
];
```

#### 4. Implementation Changes

**File**: `server/nvm/analyze/story-graph.ts`

**Add functions**:
- `classifySeverity(finding, analysis): DiagnosticSeverity`
- `generateImpact(finding): string`
- `generateSuggestions(finding, analysis): string[]`
- `findRelatedScenes(finding, graph): number[]`
- `detectStrengths(graph, analysis): EnhancedDiagnostic[]`

**Update `analyzeStoryGraph()`**:
- Replace simple `findings` array with `EnhancedDiagnostic[]`
- Add severity classification for each finding
- Add impact and suggestions
- Add strength detection (new!)

#### 5. New Report Structure

```typescript
export interface StoryGraphReport {
  graph: StoryGraph;
  
  // Categorized diagnostics
  diagnostics: {
    critical: EnhancedDiagnostic[];
    medium: EnhancedDiagnostic[];
    low: EnhancedDiagnostic[];
    strengths: EnhancedDiagnostic[];
  };
  
  // Summary statistics
  summary: {
    totalIssues: number;
    criticalCount: number;
    strengthCount: number;
    overallAssessment: 'strong' | 'good' | 'needs-work' | 'weak';
  };
  
  graphHealth: number;  // 0-100 composite (unchanged)
}
```

### Implementation Steps

1. **Add severity classification logic** (2-3 hours)
   - Write `classifySeverity()` function
   - Test on calibration corpus fixtures
   
2. **Add suggestion generation** (3-4 hours)
   - Write suggestion templates for each finding type
   - Context-aware: different suggestions based on act position
   
3. **Add strength detection** (2-3 hours)
   - Identify what's working well
   - Balance negative findings with positive feedback
   
4. **Update report structure** (1-2 hours)
   - Refactor `analyzeStoryGraph()` to use new structure
   - Update types.ts
   
5. **Write tests** (2-3 hours)
   - Test severity classification on known cases
   - Test suggestion generation
   - Test strength detection
   
6. **Update existing tests** (1 hour)
   - Adapt story-graph.test.ts to new structure
   - Ensure backward compatibility

**Total estimate**: 11-16 hours (1.5-2 days)

### Validation Criteria

✅ **Severity accuracy**: Manual review of 20 scripts, 90%+ agreement on critical vs low  
✅ **Suggestion quality**: Writers find at least 1 actionable suggestion per critical issue  
✅ **Strength detection**: Positive feedback present in scripts with health > 80  
✅ **Test coverage**: All new functions have unit tests  
✅ **No regressions**: Existing 9546 tests still pass

---

## Phase 2 Success Metrics

### Quantitative
- Severity classification accuracy ≥ 90% (validated against expert review)
- Suggestion actionability rate ≥ 70% (writers implement at least one)
- Test coverage ≥ 85% for new code
- Zero regressions in existing tests

### Qualitative
- Writers report findings are "useful" or "very useful" (≥4/5 on scale)
- Writers prefer enhanced diagnostics over V1 simple findings
- Writers cite specific suggestions when making revisions

### GO/NO-GO Gate
**Proceed to Phase 3 (Question Graph) IF**:
- All quantitative metrics met
- At least 5/10 writers prefer enhanced version
- No critical usability issues reported

---

## After Phase 2: Question Graph Preview

Once enhanced diagnostics prove value, Phase 3 adds:
- **Question nodes**: Dramatic questions posed/answered
- **Question metrics**: Answer ratio, open question curve, lifespan
- **Question diagnostics**: Unanswered mysteries, questions answered too quickly

This requires LLM extraction ("What questions does this scene raise?"), so Phase 2 success proves the diagnostic model before investing in LLM integration.

---

## Current Blockers: NONE

✅ V1 foundation complete  
✅ Tests passing  
✅ No merge conflicts  
✅ Clear Phase 2 requirements  

**Ready to implement enhanced diagnostics immediately.**

---

## Files to Modify

**Primary**:
- `server/nvm/analyze/story-graph.ts` — Add severity, suggestions, strengths
- `server/nvm/analyze/types.ts` — Update StoryGraphReport interface

**Tests**:
- `tests/core/story-graph.test.ts` — Update for new structure
- `tests/core/story-graph-enhanced-diagnostics.test.ts` — NEW, test severity/suggestions

**Documentation** (after implementation):
- Update STORY_GRAPH_V2_ROADMAP.md with Phase 2 completion
- Create STORY_GRAPH_ENHANCED_DIAGNOSTICS_RESULTS.md

---

## Next Action

Begin Phase 2 implementation:
1. Add `EnhancedDiagnostic` type to types.ts
2. Implement severity classification in story-graph.ts
3. Write tests alongside implementation
4. Validate on calibration corpus

**Target completion**: 1.5-2 days  
**Validation**: Expert review + writer feedback
