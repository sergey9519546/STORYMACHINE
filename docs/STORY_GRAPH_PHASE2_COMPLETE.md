# Story Graph Phase 2 — COMPLETE ✅

**Date:** 2026-07-15  
**Status:** Phase 2 Enhanced Diagnostics Implemented & Tested  
**Next:** P0 User Validation → Phase 3 (Question Graph)

---

## What Was Delivered

### 1. Enhanced Diagnostic System

**Before (V1)**:
```typescript
findings: [
  { type: 'unpaid-promise', sceneIdx: 3, message: 'Setup "key" never resolved' }
]
```

**After (Phase 2)**:
```typescript
diagnostics: {
  critical: [
    {
      severity: 'critical',
      type: 'unpaid-promise',
      sceneIdx: 3,
      message: 'Setup "key" planted but never resolved',
      impact: 'Audiences remember setups and expect payoffs. Unresolved promises can feel like plot holes.',
      suggestions: [
        'Add a payoff scene in Act 2 or 3 to resolve this setup',
        'If this setup is no longer relevant, consider removing it',
        'Connect this promise to an existing climax or resolution scene'
      ],
      confidence: 0.85
    }
  ],
  medium: [...],
  low: [...],
  strengths: [
    {
      severity: 'strength',
      type: 'high-closure',
      message: 'Strong closure: 85% of promises are paid off',
      impact: 'Audiences feel satisfied when setups are resolved.',
      suggestions: [
        'Maintain this attention to setup-payoff structure',
        'Ensure remaining unpaid promises are intentional'
      ],
      confidence: 0.9
    }
  ]
},
summary: {
  totalIssues: 5,
  criticalCount: 1,
  strengthCount: 2,
  overallAssessment: 'good'
}
```

### 2. Severity Classification Logic

**Critical Issues**:
- Unpaid promises seeded in Act 1 (first 25% of script)
- Isolated scenes at key structural positions (opening, act breaks, midpoint, climax)
- Backward causality > 40% (majorly broken structure)

**Medium Issues**:
- Unpaid promises seeded in Act 2
- Isolated scenes at non-critical positions
- Flat tension across all acts
- Backward causality 40-60%

**Low Issues**:
- Unpaid promises seeded in Act 3 (minor loose ends)
- Low causal density (may be acceptable for episodic stories)

### 3. Context-Aware Suggestions

**Act-Position Awareness**:
- Act 1 unpaid promise → "Add payoff in Act 2 or 3"
- Act 2 unpaid promise → "Add payoff in Act 3 before climax"
- Act 3 unpaid promise → "Add brief payoff in resolution, or consider if minor detail"

**Issue-Specific Templates**:
- **Unpaid promises**: 3 suggestions (add payoff, remove setup, connect to existing scene)
- **Isolated scenes**: 4 suggestions (add causal link, seed/payoff promise, show character growth, evaluate necessity)
- **Backward arcs**: 4 suggestions (review scene order, check flashbacks, verify causality, adjust acts)
- **Flat tension**: 4 suggestions (raise stakes in Act 2, build toward climax, add pressure points, increase challenges)

### 4. Strength Detection (NEW)

**Four Strength Types**:

1. **High Closure** (promisePaymentRatio ≥ 0.8)
   - "85% of promises are paid off"
   - Impact: Builds trust in storytelling

2. **Tight Causality** (setupPayoffDistance > 20 scenes)
   - "Average 24 scenes between setup and payoff"
   - Impact: Patient setup creates satisfying "aha" moments

3. **Strong Escalation** (escalationMonotonicity = 1.0)
   - "Tension rises consistently across all acts"
   - Impact: Keeps audiences engaged toward climax

4. **Clear Causality** (forwardEdgeRatio ≥ 0.95)
   - "98% of causal links flow forward"
   - Impact: Creates clear cause-and-effect chains

### 5. Overall Assessment

**Assessment Levels**:
- **strong**: 0 critical, ≤2 medium, ≥2 strengths
- **good**: 0 critical, ≤5 total issues
- **needs-work**: ≤2 critical, ≤10 total issues
- **weak**: >2 critical or >10 total issues

Provides at-a-glance health summary for writers.

---

## Implementation Details

### Code Changes

**File**: `server/nvm/analyze/story-graph.ts`

**Added Functions** (~240 lines):
- `classifySeverity(finding, analysis, graph)`: Act-aware severity classification
- `generateImpact(finding, analysis)`: Explains why each issue matters
- `generateSuggestions(finding, analysis, graph)`: Context-aware fixes (3-4 per issue)
- `detectStrengths(graph, analysis)`: Identifies structural strengths

**Updated Functions**:
- `analyzeStoryGraph()`: Now returns enhanced diagnostics structure instead of simple findings array

**New Types**:
- `DiagnosticSeverity`: 'critical' | 'medium' | 'low' | 'strength'
- `EnhancedDiagnostic`: Full diagnostic with severity, impact, suggestions, confidence
- `StoryGraphReport`: Updated with diagnostics structure and summary

### Test Coverage

**New Test File**: `tests/core/story-graph-enhanced-diagnostics.test.ts` (14 tests)
- Severity classification (3 tests)
- Suggestion generation (3 tests)
- Strength detection (3 tests)
- Overall assessment (3 tests)
- Diagnostic structure (2 tests)

**Updated Test File**: `tests/core/story-graph.test.ts`
- Updated 1 test to use new diagnostics structure
- All 14 tests passing

**Full Suite Results**:
- Total: 9636 tests
- Pass: 9560
- Fail: 3 (pre-existing, unrelated)
- Skip: 72
- Todo: 1
- **No regressions introduced**

---

## User-Facing Changes

### What Writers Now Get

**1. Prioritized Issues**
- See critical issues first (must fix)
- Medium issues next (should fix)
- Low issues last (could improve)

**2. Clear Explanations**
- Every issue includes "Impact" field
- Explains why this structural pattern matters
- Helps writers understand the problem

**3. Actionable Guidance**
- 3-4 specific suggestions per issue
- Multiple approaches (writer chooses)
- Context-aware based on act position

**4. Positive Feedback**
- Strength detection shows what's working
- Balances negative findings with positives
- Motivational ("Strong closure: 85% paid off!")

**5. Overall Health**
- Single-word assessment (strong/good/needs-work/weak)
- Summary statistics (5 issues, 1 critical, 2 strengths)
- At-a-glance script health

### Example Output Format

```
🔴 CRITICAL (1)
  • Unpaid Promise (Scene 3)
    Setup "gun" planted but never resolved
    Impact: Audiences expect payoffs. Unresolved promises feel like plot holes.
    → Add payoff scene in Act 2 or 3
    → Connect to existing climax scene
    → If no longer relevant, remove it

🟡 MEDIUM (3)
  • Isolated Scene (Scene 12)
    Scene has no causal connections to story
    Impact: May feel disconnected or unnecessary.
    → Add causal connection to later scenes
    → Seed or pay off a promise here
    → Show character growth that carries forward

⚪ LOW (1)
  • Unpaid Promise (Scene 87)
    Late-act setup never resolved
    Impact: Minor loose end, may be acceptable
    → Add brief payoff in resolution
    → Consider if this setup is necessary

✅ STRENGTHS (2)
  • High Closure: 85% of promises paid off
  • Strong Escalation: Tension rises across all acts

📊 OVERALL: Good
  5 total issues • 1 critical • 2 strengths
```

---

## Validation Plan

### Phase 2 Success Criteria

**Quantitative** (requires user testing):
- [ ] Severity classification accuracy ≥ 90% (expert review)
- [ ] Suggestion actionability ≥ 70% (writers implement at least one)
- [ ] Test coverage ≥ 85% for new code ✅ (achieved)
- [ ] Zero regressions ✅ (verified: 9560 tests pass)

**Qualitative** (requires user testing):
- [ ] Writers rate findings as "useful" or "very useful" (≥4/5)
- [ ] Writers prefer enhanced diagnostics over V1 simple findings
- [ ] Writers cite specific suggestions when making revisions

### Next Steps

**Immediate**:
1. P0 User Testing (5-10 screenwriters)
   - Show enhanced diagnostics on their real scripts
   - Collect feedback on severity classification
   - Ask which suggestions they would implement
   - Measure preference: Phase 2 vs V1

**If Validation Passes**:
2. Proceed to Phase 3 (Question Graph)
   - Add dramatic question tracking
   - Requires LLM extraction
   - 2-3 week implementation

**If Validation Fails**:
2. Iterate on Phase 2
   - Adjust severity thresholds
   - Refine suggestion templates
   - Add more strength types
   - Re-test with users

---

## Technical Debt & Future Work

### Known Limitations

1. **Signal Dependency**
   - Strength detection requires seededClueIds/payoffSetupIds
   - Simple Fountain text won't generate rich signals
   - Real scripts with full analyzer pipeline work correctly

2. **Suggestion Templates**
   - Currently hardcoded suggestion text
   - Could be made more dynamic based on genre/style
   - Future: LLM-generated personalized suggestions

3. **Confidence Scores**
   - Currently hardcoded (0.7-0.95)
   - Could be calibrated against expert labels
   - Future: Learn confidence from user feedback

### Future Enhancements

**Phase 3 Integration**:
- Question Graph diagnostics will follow same pattern
- "Unanswered question (Scene 12)" with severity + suggestions
- Thematic Graph diagnostics in Phase 4

**User Preferences**:
- Allow writers to customize severity thresholds
- "I write episodic stories, don't flag low causal density"
- "I intentionally leave mysteries open, don't flag all unpaid promises"

**Learning System**:
- Track which suggestions writers implement
- Boost confidence for high-implementation suggestions
- Deprecate low-implementation suggestions

---

## Documentation Updates

**Created**:
- `STORY_GRAPH_CONSOLIDATED_STATUS.md` — Multi-agent session reconciliation
- `tests/core/story-graph-enhanced-diagnostics.test.ts` — 14 new tests

**To Update** (after P0 validation):
- `STORY_GRAPH_V2_ROADMAP.md` — Mark Phase 2 complete
- `STORY_GRAPH_FINAL_REPORT_2026-07-15.md` — Add Phase 2 results

---

## Commits

1. `feac51e` — fix(story-graph): compute forwardEdgeRatio from promiseMap directly
2. `ddb3838` — docs(story-graph): add V2 architecture vision and implementation roadmap
3. `9c23f6d` — feat(story-graph): Phase 2 - Enhanced Diagnostics with Severity & Suggestions

**Total additions**: +1,030 lines (diagnostics logic + tests + docs)  
**Total changes**: 4 files modified, 3 files added

---

## Phase 2 Status: ✅ COMPLETE

**Implementation**: ✅ Done  
**Tests**: ✅ Passing (14/14 new tests, 9560/9636 total)  
**Documentation**: ✅ Updated  
**Commits**: ✅ Pushed to main  

**Blocker**: P0 user validation (requires real writers testing on real scripts)

**Ready for**: User validation → Phase 3 or Phase 2 iteration based on feedback

---

## Summary

Phase 2 transforms story graph from **metrics-only** to **actionable diagnostics**:

- Writers know **what's wrong** (severity classification)
- Writers know **why it matters** (impact explanations)
- Writers know **how to fix it** (3-4 suggestions per issue)
- Writers see **what's working** (strength detection)
- Writers get **overall health** (strong/good/needs-work/weak)

This is the foundation for user adoption. If writers find Phase 2 diagnostics useful, we proceed to Phase 3 (Question Graph). If not, we iterate on Phase 2 based on feedback.

The system is ready for real-world validation.
