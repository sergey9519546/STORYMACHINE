# STORYMACHINE — Complete Gap Analysis

**Date:** 2026-07-15  
**Context:** After implementing Story Graph V2 Phase 1-2, analyzing entire project

---

## 🎯 Critical Missing (P0 Blockers)

### **1. P0 User Validation Infrastructure** ⚠️ BLOCKS EVERYTHING
**Status**: Not started  
**Impact**: Entire project blocked until this completes

**What's Missing**:
- No writer recruitment process
- No validation protocol documented
- No session recording framework
- No evidence collection system
- No decision criteria for GO/NO-GO

**Required**:
```
docs/user-validation/
  ├── P0_PROTOCOL.md              # How to run sessions
  ├── P0_RECRUITMENT.md           # Where to find writers
  ├── P0_SCREENING_QUESTIONS.md   # Writer qualification
  ├── P0_SESSION_GUIDE.md         # What to show, what to ask
  ├── P0_EVIDENCE_TEMPLATE.md     # How to document findings
  └── sessions/                    # Individual session notes
      ├── writer-001.md
      ├── writer-002.md
      └── ...
```

**Story Graph Implication**: 
- Phase 2 enhanced diagnostics ready for testing
- But NO PLAN for how to actually show them to writers
- Need: "Show writer Story Graph report, measure reaction"

---

### **2. P1 Real Benchmark Corpus** ⚠️ BLOCKS TRUST
**Status**: Mentioned but not built  
**Impact**: Can't prove score discriminates quality

**What's Missing**:
- No legally distributable real screenplay corpus
- No blind labels from 3+ independent readers
- No inter-rater agreement measurement
- No pre-registered evaluation protocol
- No held-out test set

**Required**:
```
corpus/
  ├── LICENSE.md                  # CC0, author-contributed, public domain
  ├── scripts/                    # Real screenplays
  │   ├── strong/
  │   └── weak/
  ├── labels/                     # Blind judgments
  │   ├── reader-1.jsonl
  │   ├── reader-2.jsonl
  │   └── reader-3.jsonl
  ├── pre-registration.md         # Methodology committed before tuning
  └── splits/
      ├── train.txt               # For development
      ├── validation.txt          # For tuning
      └── held-out.txt            # Never touched until final eval
```

**Story Graph Implication**:
- Story graph validated on 364 scripts (structure exists)
- But those scripts have NO QUALITY LABELS
- Can measure structure, can't measure if structure = quality

---

### **3. Story Graph Frontend** ⚠️ NO UI
**Status**: Backend complete, frontend missing entirely  
**Impact**: Writers can't see/interact with diagnostics

**What's Missing**:
- No visualization of the graph
- No UI for enhanced diagnostics (Phase 2)
- ScriptDoctorPanel doesn't show story graph findings
- No interactive exploration
- No way to click suggestions → apply fixes

**Required**:
```typescript
// New component needed
src/components/scriptide/StoryGraphPanel.tsx

Features:
- Show diagnostics by severity (🔴 critical, 🟡 medium, ⚪ low, ✅ strengths)
- Expand/collapse each diagnostic
- Show impact + suggestions
- Click scene index → jump to scene
- Click suggestion → apply fix (if actionable)
- Toggle between causal/question/theme layers (future)
```

**Current State**:
- ScriptDoctorPanel.tsx exists (2692 lines)
- Shows pass-based issues
- Does NOT show story graph findings
- Needs integration

---

## 🔴 High Priority Missing (P1 Requirements)

### **4. Story Graph AUC Measurement on Real Corpus**
**Status**: Designed, not measured  
**Impact**: Don't know if story graph metrics actually discriminate

**What's Missing**:
- Act-swap AUC never measured on real 364-script corpus
- Position-sensitivity regression test exists but env-gated
- No measurement of forwardEdgeRatio on real vs swapped
- No measurement of graphHealth discrimination

**Blocker**: 
- `STORY_GRAPH_CORPUS_DIR` not set
- Tests skip without corpus access
- Corpus path: `C:/Users/serge/.openclaw-autoclaw/workspace/.cluster/corpus-pipeline/output/merged-fountain`

**To Do**:
```bash
# Set corpus dir and run tests
export STORY_GRAPH_CORPUS_DIR="path/to/corpus"
npm test tests/core/story-graph-corpus-auc.test.ts

# Should measure:
# - forwardEdgeRatio AUC ≥0.70 (target)
# - arcCoherence AUC ≥0.70 (target)
# - graphHealth AUC ≥0.70 (target)
```

---

### **5. Pre-Registration Protocol**
**Status**: Not created  
**Impact**: Risk of overfitting to test data

**What's Missing**:
- No pre-registered methodology
- No commitment to metrics before seeing results
- No versioned/hashed fixtures
- No protection against benchmark leakage

**Required**:
```
docs/evaluation/
  ├── PRE_REGISTRATION.md         # Committed methodology
  ├── BENCHMARK_V1_MANIFEST.md    # Locked before tuning
  └── EVAL_PROTOCOL.md            # Exact procedure
```

---

### **6. Uncertainty Reporting**
**Status**: Point estimates only  
**Impact**: Can't assess confidence in discrimination claims

**What's Missing**:
- No bootstrap confidence intervals
- No error bars on AUC measurements
- No uncertainty in Phase 2 diagnostics
- No calibration curves

**Story Graph Has**:
- Confidence scores on diagnostics (0.7-0.9)
- But these are HARDCODED, not measured

**Need**:
- Calibrate confidence against expert labels
- "Critical" severity is correct 90% of time → confidence 0.9

---

## 🟡 Medium Priority Missing (UX/Product)

### **7. ScriptDoctorPanel Integration**
**Status**: Exists but needs update  
**Impact**: Enhanced diagnostics invisible to users

**What's Missing**:
- ScriptDoctorPanel shows old pass-based findings
- Doesn't show Phase 2 enhanced diagnostics
- No severity-based grouping (🔴🟡⚪✅)
- No impact/suggestions display
- No strength detection shown

**To Do**:
```typescript
// Update ScriptDoctorPanel.tsx to show:
if (report.storyGraph) {
  <StoryGraphSection>
    <CriticalIssues items={report.storyGraph.diagnostics.critical} />
    <MediumIssues items={report.storyGraph.diagnostics.medium} />
    <LowIssues items={report.storyGraph.diagnostics.low} />
    <Strengths items={report.storyGraph.diagnostics.strengths} />
  </StoryGraphSection>
}
```

---

### **8. Suggestion Actionability**
**Status**: Text suggestions only  
**Impact**: Writers read suggestions but can't act on them

**What's Missing**:
- No click-to-apply for suggestions
- No jump-to-scene for issues
- No "fix this" buttons
- No tracking of which suggestions were implemented

**Future Enhancement**:
- Click "Add payoff scene in Act 2" → opens scene insertion UI
- Click "Scene 12" → jumps to that scene
- Track: which diagnostics led to action?

---

### **9. Progress Tracking**
**Status**: None  
**Impact**: Writers can't see improvement

**What's Missing**:
- No revision history
- No before/after comparison
- No "watch your score climb" loop
- No visual progress indicators

**Note**: This is P4 (retention), intentionally deferred

---

### **10. Export/Sharing for Story Graph**
**Status**: Doctor report exports, but not story graph  
**Impact**: Can't share structural findings

**What's Missing**:
- Story graph diagnostics not in PDF/HTML export
- No shareable "your story structure" report
- No verification link for graph findings

**To Do**:
```
Coverage Report Export should include:
- Overall Assessment: "Good" (5 issues, 1 critical, 2 strengths)
- Critical Issues section
- Strengths section
- Graph visualization (optional)
```

---

## 🟢 Lower Priority Missing (Nice to Have)

### **11. Phase 3-4 Implementation**
**Status**: Fully designed, not implemented  
**Impact**: Missing question & theme analysis

**What's Missing**:
- Question Graph (dramatic questions posed/answered)
- Thematic Graph (themes, motifs, symbols)
- Pattern-matching detection ready to code
- 4-6 days of implementation work

**Why Lower Priority**:
- Validate Phase 2 first
- Prove diagnostic model works
- Then add more layers

---

### **12. LLM Integration**
**Status**: Architecture ready, not implemented  
**Impact**: Stuck at 60-70% accuracy vs 85-95% potential

**What's Missing**:
- No LLM provider setup
- No prompt templates
- No response parsing
- No rate limiting
- No caching
- No cost tracking

**Why Deferred**:
- Pattern-matching MVP proves value first
- LLM costs money ($0.01-0.10 per script)
- Don't invest until MVP validated

---

### **13. Interactive Graph Tools**
**Status**: Designed, not implemented  
**Impact**: Writers can't explore structure interactively

**What's Missing**:
- Path tracing (click node → see causes/consequences)
- Critical path analysis (minimum scenes to tell story)
- Impact simulation (what if I remove this scene?)
- Narrative surgery (reorder scenes, see impact)

**Why Lower Priority**:
- Phase 5-6 features
- Need Phase 2 validation first
- Advanced features, not core value

---

### **14. Comparative Benchmarking**
**Status**: Designed, not implemented  
**Impact**: Can't say "your structure vs successful films"

**What's Missing**:
- No corpus statistics database
- No percentile calculations
- No genre-specific norms
- No exemplar matching

**Why Lower Priority**:
- Phase 6 feature
- Requires large validated corpus
- Nice to have, not essential

---

## 🔧 Technical Debt

### **15. TypeScript Configuration**
**Status**: Many pre-existing errors  
**Impact**: Type safety compromised

**Issues**:
- downlevelIteration errors (can't iterate Map/Set)
- allowImportingTsExtensions needed
- 1,326 `as any` casts in revision passes
- Module resolution issues

**Low Priority**: Code works, just messy

---

### **16. Test Coverage**
**Status**: 9560/9636 passing (99.2%)  
**Impact**: 3 failing tests, 72 skipped, 1 todo

**Failing Tests** (pre-existing):
- Temporal consistency issues
- Composite reviewer gap (BLIND SPOT)

**Skipped Tests**:
- Real corpus tests (need REAL_SCRIPT_CORPUS_DIR)

**To Do**: Fix or document known failures

---

### **17. Untracked Files**
**Status**: Found during session  
**Impact**: Unknown, possibly from other agents

**Files**:
- `server/nvm/kernel/` (event-store.ts, types.ts)
- `server/nvm/quantum/` (unknown contents)

**To Do**: 
- Review these files
- Decide: keep or delete?
- If keep: commit with context

---

### **18. Documentation Drift**
**Status**: Inconsistent numbers  
**Impact**: Confusion about claims

**Issues**:
- Landing footer: "3,216 rules"
- Docs: "8,917 rules"
- Old plan: "10,523 rules"
- Actual distinct rules: ~2,300

**To Do**: Align all marketing materials

---

## 📊 Analytics & Observability Missing

### **19. Telemetry**
**Status**: None  
**Impact**: Don't know what features are used

**What's Missing**:
- No event tracking
- No feature usage metrics
- No error tracking (Sentry, etc.)
- No performance monitoring
- No funnel analysis

**Questions We Can't Answer**:
- Do writers use story graph diagnostics?
- Which suggestions are most acted upon?
- Where do writers drop off?
- What errors occur in production?

---

### **20. A/B Testing Infrastructure**
**Status**: None  
**Impact**: Can't compare approaches

**What's Missing**:
- No feature flags
- No experiment framework
- No statistical testing
- No variant assignment

**Needed For**:
- Pattern-matching vs LLM comparison
- Phase 2 vs V1 preference
- Different suggestion phrasings

---

## 🎨 Design System / UX Gaps

### **21. Story Graph Visual Language**
**Status**: No design  
**Impact**: Don't know how to show graph to writers

**What's Missing**:
- No graph layout design
- No node/edge visualization
- No color scheme for layers
- No interaction patterns
- No responsive design

**Design Questions**:
- Force-directed layout? Hierarchical? Timeline?
- How to show 10 layers without overwhelming?
- Mobile experience?
- Accessibility?

---

### **22. Diagnostic Presentation**
**Status**: Text-only in design  
**Impact**: May be hard to scan

**Missing**:
- No visual severity indicators (just 🔴🟡⚪✅ in docs)
- No expand/collapse patterns
- No filtering/sorting
- No search within diagnostics

---

## 📚 Education / Onboarding Gaps

### **23. Writer Education**
**Status**: None  
**Impact**: Writers may not understand findings

**What's Missing**:
- No "why unpaid promises matter" explanation
- No examples of good vs bad structure
- No tutorial/walkthrough
- No glossary of terms
- No "first time using story graph" flow

---

### **24. Examples & Case Studies**
**Status**: None  
**Impact**: Show don't tell missing

**What's Missing**:
- No example of strong structure analyzed
- No example of weak structure with fixes
- No before/after case studies
- No "what good looks like"

---

## 🔐 Security / Infrastructure Gaps

### **25. LLM Safety (Future)**
**Status**: Not needed yet, but will be  
**Impact**: When LLM added, need safeguards

**What's Missing** (for future LLM use):
- Prompt injection protection
- Content filtering
- Rate limiting per user
- Cost caps
- Abuse monitoring

---

### **26. Caching Strategy**
**Status**: None  
**Impact**: Expensive re-analysis

**What's Missing**:
- No result caching
- Every script re-analyzed from scratch
- No incremental analysis (scene changes → re-analyze all)

**Future Need**:
- Cache by contentHash
- Invalidate on script change
- LLM response caching (expensive)

---

## 📈 Business / GTM Gaps (If Relevant)

### **27. Pricing Strategy**
**Status**: Not defined  
**Impact**: Unknown if/how to monetize

**Questions**:
- Free tier? How much?
- Paid tier? What features?
- Per-script pricing? Subscription?
- Enterprise licensing?

---

### **28. Distribution / Growth**
**Status**: P3 (shareable report) is growth loop  
**Impact**: No active distribution now

**What's Missing**:
- No SEO strategy
- No content marketing
- No partnerships (screenplay competitions, film schools)
- No referral program

**Note**: P3 shareable report IS the growth loop, so this is intentionally deferred

---

## 🎯 Prioritized Gaps (What to Build Next)

### **MUST DO BEFORE ANYTHING ELSE**
1. ⚠️ **P0 Validation Infrastructure** — Document protocol, recruit writers, run sessions
2. ⚠️ **Story Graph Frontend** — Build StoryGraphPanel.tsx to show Phase 2 diagnostics
3. ⚠️ **ScriptDoctorPanel Integration** — Display enhanced diagnostics in existing UI

### **CAN'T PROVE VALUE WITHOUT**
4. ⚠️ **P1 Real Benchmark Corpus** — Get real scripts with blind quality labels
5. ⚠️ **Story Graph AUC Measurement** — Set corpus dir, run discrimination tests
6. ⚠️ **Pre-Registration** — Commit to methodology before tuning

### **NICE TO HAVE AFTER VALIDATION**
7. 🟢 Phase 3-4 Implementation (Question & Theme graphs)
8. 🟢 LLM Integration (upgrade pattern-matching to LLM)
9. 🟢 Interactive Tools (path tracing, critical path, simulation)
10. 🟢 Comparative Benchmarking (percentiles, genre norms)

---

## 💡 Key Insights

### **What's NOT Missing (Already Strong)**
✅ Story Graph Phase 1-2 implementation (1,030 lines, 28 tests, all passing)  
✅ 10-layer architecture design (136KB documentation)  
✅ Hybrid LLM strategy (pattern-matching MVP + upgrade path)  
✅ Enhanced diagnostics system (severity, impact, suggestions, strengths)  
✅ Technical foundation (reproducible, deterministic, keyless)  
✅ Security posture (rate limiting, server-side LLM, CI guards)  

### **What's MOST Missing**
❌ **User validation** — Zero real writers tested  
❌ **Real benchmark** — No labeled real screenplay corpus  
❌ **Frontend** — No UI to show story graph findings  
❌ **Proof of discrimination** — AUC not measured on real writing  

### **The Honest Assessment**
The technology is impressive. The architecture is comprehensive. The code is well-written and tested. **But there's no evidence anyone wants it.**

ROADMAP.md is brutally honest: "StoryMachine is a beautifully engineered answer to a question nobody has confirmed anyone is asking."

---

## 🚀 Recommended Next Steps

### **Option A: Follow ROADMAP.md (Recommended)**
1. **P0 Validation First** — Stop all feature work
2. Build P0 protocol & recruit writers
3. Show them current Doctor report + Story Graph Phase 2
4. Document reactions: do they want to run their own draft?
5. GO/NO-GO decision based on evidence
6. If GO → P1 (build real benchmark)
7. If NO-GO → reframe entire product

### **Option B: Finish Story Graph First (Risky)**
1. Build StoryGraphPanel.tsx
2. Implement Phase 3-4 (questions & themes)
3. Add LLM integration
4. Build interactive tools
5. THEN do P0 validation
6. Risk: built more features no one asked for

### **Option C: Hybrid (Pragmatic)**
1. **Build minimal UI** for Phase 2 diagnostics (1-2 days)
2. **Run P0 validation** with that UI (1 week)
3. Based on P0 results:
   - If strong signal → build P1 benchmark
   - If weak signal → pivot
   - If ambiguous → iterate P0

---

## 📝 Summary

**What You Have**: World-class story graph technology, comprehensively designed and partially implemented.

**What You're Missing**: Evidence that anyone wants it, and a way to show it to them.

**The Gap**: Not technical, it's validation. The ROADMAP is clear: P0 blocks everything.

**My Recommendation**: 
1. Build minimal Story Graph UI (StoryGraphPanel.tsx) — 1-2 days
2. Run P0 validation showing enhanced diagnostics — 1 week
3. Let real writers' reactions decide what to build next

**The brutal truth**: You can build all 10 layers, all the LLM integration, all the interactive tools... and if P0 fails, none of it matters.

Build the minimum to test the value hypothesis. Then build more only if validated.
