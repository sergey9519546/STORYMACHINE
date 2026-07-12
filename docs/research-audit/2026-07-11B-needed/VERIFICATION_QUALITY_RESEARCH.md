# VERIFICATION & QUALITY APPROACH - RESEARCH FINDINGS
## Agent 4: Verification & Quality Specialist

---

## 1. TASK SUMMARY

Research how to verify quality of generated stories. Focus on TS-SF scoring (mean ≥ 5), MAD Debate structure, quality gates, and available tools. Argue FOR a specific verification approach with specific metrics and thresholds.

---

## 2. RESEARCH FINDINGS

### 2.1 Primary Quality Metric: TS-SF (Transportation Scale Short Form)

**Source**: Green & Brock 2000; Appel, Gnambs, Richter 2015

**Validation**: 7765+ citations - verified predictor of story impact

**6-Item Short Form (7-point scale)**:

| Item | Statement |
|------|-----------|
| 1 | "I could picture the events in this story taking place." |
| 2 | "I was mentally involved in the story while reading it." |
| 3 | "I wanted to learn how the story ended." |
| 4 | "The story affected me emotionally." |
| 5 | "I was very interested in what happens to the characters." |
| 6 | "After finishing the story, I wanted to discuss it with someone." |

**THRESHOLD**: Mean score ≥ 5 = high transportation (successful story)

**WHY THIS WORKS**:
- Measures absorption, not novelty
- Aligns with neural coupling research (Hasson et al.)
- Maps to narrative empathy (Keen 2007)
- Practical: 6 items, 7-point scale, validated

---

### 2.2 Debate Structure: MAD Debate

**Source**: Liang et al., "Encouraging Divergent Thinking in LLMs through Multi-Agent Debate" (EMNLP 2024)

**Architecture**: Tit-for-tat + Judge

| Component | Function |
|-----------|----------|
| **Agent A** | Argues for story quality |
| **Agent B** | Counter-argues (tit-for-tat) |
| **Judge** | Evaluates, decides |

**Key Finding**: Debate > sequential critique for creative tasks

**Adaptive Break**: Debate ends when:
- Convergence reached
- Max rounds (3-5) reached
- Judge confidence high

**WHY THIS WORKS**:
- Solves Degeneration-of-Thought (DoT)
- Prevents models from sticking to initial positions
- Better than sequential critics (per papers)

---

### 2.3 Quality Gates (Replacing 7 Sequential Critics)

**OLD (RNE v7.0)**: 7 sequential critics with arbitrary checklists

**NEW**: 4 gates only

| Gate | What It Checks | Metric |
|------|---------------|--------|
| **Arc Match** | Follows selected UVM arc? | Binary |
| **Transportation** | TS-SF mean ≥ 5? | Score 1-7 |
| **Empathy** | Creates vicarious sharing? | Binary |
| **Debate Pass** | MAD debate resolves? | Judge decision |

**GATE SEQUENCE**:
1. Arc Match (fast check - does story follow the selected arc shape?)
2. Transportation (TS-SF proxy scoring - does it have transportation indicators?)
3. Empathy (can readers share character perspectives?)
4. Debate Pass (MAD resolves or max rounds reached)

---

### 2.4 Available Tools for Verification

From EMOTIONAL_STORY_ENGINE_V2.md:

| Tool Name | Purpose |
|-----------|---------|
| `mcp_mcp_matrix_batch_web_search` | Research comparable stories |
| `mcp_mcp_matrix_extract_content_from_websites` | Deep analysis |
| `mcp_mcp_matrix_image_synthesize` | Visual concepts (for mood boards) |

From ITERATION_5_FINAL_SYNTHESIS.md (Multi-layer Validation):

**Layer 1: Automated** (Cost: $0)
- Sentiment arc analysis
- Emotional vocabulary density
- Specificity score
- Pacing analysis
- Arc compliance
- Tension mechanics

**Layer 2: Self-Report Surveys** (Cost: 3 readers × 15 min)
- TS-SF (6 items) - Score: ___/42
- SAM (V/A/D) - Valence, Arousal, Dominance
- Specific recall

**Layer 3: Internal "Brain Trust"**
- Confusion check, engagement check, emotional beat landing, character arc validation
- Required: 3/3 Pass OR 2/3 with notes addressed

---

## 3. ARGUMENT FOR SPECIFIC APPROACH

### THE CASE FOR: TS-SF-Centric Verification with MAD Debate

**RECOMMENDED APPROACH**:

**Phase 4: Debated Verification**

```
Input: Enriched story from Phase 3

Step A — MAD Debate:
  1. Agent A → argues for story quality
  2. Agent B → counter-argues (tit-for-tat)
  3. Judge → evaluates
  4. Repeat 3 rounds max or until convergence

Step B — TS-SF Verification:
  1. Score 6 TS-SF items using LLM-as-judge proxy
  2. Mean score ≥ 5.0 passes
  3. If failed, return to Phase 2 with feedback

Output:
  story_final: "..."
  transportation_score: 5.X
  debate_log: [...]
  pass: true/false
```

---

### 3.1 METRIC SPECIFICATION

**Primary Metric**: TS-SF Mean Score
- **Target**: ≥ 5.0 (out of 7.0)
- **Interpretation**:
  - ≥ 5.0 = High transportation (publishable)
  - 4.0-4.9 = Moderate transportation (revision needed)
  - < 4.0 = Low transportation (significant rewrite)

**Secondary Metrics**:
- Debate convergence (did agents agree?)
- Arc compliance (did story follow selected UVM arc?)
- Empathy flag (can readers share perspective?)

---

### 3.2 THRESHOLD SPECIFICATION

| Scenario | TS-SF Mean | Debate Result | Action |
|----------|-----------|---------------|--------|
| Pass | ≥ 5.0 | Converged | Proceed to output |
| Pass | ≥ 5.0 | Not converged (max rounds) | Proceed - accept alternative |
| Revision | 4.0-4.9 | Any | Return to Phase 2 with specific feedback |
| Fail | < 4.0 | Any | Return to Phase 1 - fundamental issue |

---

### 3.3 IMPLEMENTATION SPECIFICATION

**Quality Gate Pipeline**:

```
[Draft Story]
    │
    ▼
┌─────────────────────┐
│ GATE 1: ARC MATCH   │ ← Binary check: follows UVM 6 arc?
│ (Fast, automated)   │
└──────────┬──────────┘
           │ FAIL → Return to Phase 1
           │ PASS
           ▼
┌───────────────────────────┐
│ GATE 2: TRANSPORTATION    │ ← LLM-as-judge scores TS-SF items
│ (TS-SF proxy scoring)     │   Mean ≥ 5.0 required
└──────────────┬─────────────┘
               │ FAIL → Return to Phase 2 with feedback
               │ PASS
               ▼
┌─────────────────────┐
│ GATE 3: EMPATHY      │ ← Binary: can readers share perspective?
│ (Narrative empathy) │
└──────────┬──────────┘
           │ FAIL → Return to Phase 2
           │ PASS
           ▼
┌─────────────────────┐
│ GATE 4: DEBATE PASS  │ ← MAD debate resolves or max rounds
│ (MAD verification)  │
└──────────┬──────────┘
           │ FAIL → Return to Phase 2
           │ PASS
           ▼
    [FINAL OUTPUT]
```

---

### 3.4 WHY THIS APPROACH WINS

**1. RESEARCH-BACKED**:
- TS-SF has 7765+ citations
- MAD Debate published at EMNLP 2024
- UVM 6 Arcs validated in Reagan et al. 2016

**2. COST-EFFECTIVE**:
- Layer 1 automated (free)
- Layer 2 minimal human effort (3 readers × 15 min)
- No biometric equipment needed

**3. SCALABLE**:
- Automated scoring before human review
- Clear pass/fail thresholds
- Fast feedback loops

**4. VALIDATED ACROSS PAPERS**:
- Transportation predicts story impact (Green & Brock)
- Debate > sequential critique (Liang et al.)
- Humanization through empathy, not artifact removal (Keen)

---

## 4. FILES REVIEWED

- `/workspace/CORRECTED_NARRATIVE_ENGINE_V8.md` - Primary reference for Phase 4 verification
- `/workspace/EMOTIONAL_STORY_ENGINE_V2.md` - Tool references and evaluation criteria
- `/workspace/ITERATION_5_FINAL_SYNTHESIS.md` - Multi-layer validation framework

---

## 5. CONCLUSION

**RECOMMENDED VERIFICATION APPROACH**:

1. **Metric**: TS-SF mean ≥ 5.0 (primary)
2. **Structure**: MAD Debate with 3-round limit
3. **Gates**: 4 sequential gates (Arc → Transportation → Empathy → Debate)
4. **Tools**: Layer 1 automated + Layer 2 minimal human review

This approach replaces arbitrary 10-phase sequential critics with research-backed TS-SF scoring and MAD debate structure, dramatically reducing verification cost while improving accuracy.

---

*End of Research Findings - Agent 4*
