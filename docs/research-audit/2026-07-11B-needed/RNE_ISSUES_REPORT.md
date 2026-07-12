# Recursive Narrative Engine: Prioritized Issues List
## Severity Ratings and Recommendations
### Research Completion Report

---

## Summary

This document synthesizes all previous findings about the Recursive Narrative Engine (RNE) into a prioritized issues list with severity ratings. The analysis draws from:

1. The main SKILL.md (v7.0.0) - the operational skill file
2. GOD_MODE_PHASE1_IMPROVEMENTS.md - explicit Phase 1 weakness fixes
3. Architecting a Studio-Quality Narrator - academic blueprint document
4. William Joyce inventory - visual development context

---

## PRIORITIZED ISSUES LIST

### CRITICAL (Severity: 1 - Must Fix)

| # | Issue | Location | Evidence | Recommendation |
|---|-------|----------|----------|--------------|
| 1 | **Character Interiority Gap** | Phase 6, Critic 2 (Character) | GOD MODE doc explicitly addresses Lewis having "no interiority" - operates on one level for entire film | Implement GOOB character engine: WANT/NEEED/LIE/GHOST/SPINE/PRESSURE for ALL main characters |
| 2 | **Climax EmotionalDramatization Failure** | Phase 7 (Drafting) | "Aram types code into a terminal and the city relights. That is a plot resolution, not a climax" (GOD MODE) | Climax must be emotional first, technical second. Internal break MUST precede the typing |
| 3 | **Family Characters Are Generic Types** | Phase 1 (Intake & Visual Direction) | "Phase 1 document called the family 'types, not characters'" | Each family member needs: specific WANT, relationship to protagonist, ONE LINE only they could say |
| 4 | **Sequence Overloading** | Phase 7-8 | Sequence E carries both HAK reveal AND Goob-Lewis recognition - dilutes both | Move HAK map reveal to late Sequence D, free Sequence E for Goob event |

---

### HIGH (Severity: 2 - Significant Problems)

| # | Issue | Location | Evidence | Recommendation |
|---|-------|----------|----------|--------------|
| 5 | **Missing Beat Sheet Visual Requirement** | Phase 7, Step 2 | "BEAT SHEET: Each beat must state: What the audience SEES (not just what happens - the visual moment)" | Every beat MUST have explicit "VISUAL MOMENT" field - not plot summary |
| 6 | **Dual-Layer Audience Not Operationalized** | Phase 6, Critic 7 | "Kid Layer: ages 5-12" / "Parent Layer: ages 25-45" - but no concrete mechanism | Add explicit "dual-layer impact" field to EVERY story beat |
| 7 | **Humanizer Phase Applied Too Late** | Phase 9 | Humanizer runs AFTER all quality gates pass - but problems should be caught earlier | Phase 9 scan should be available as diagnostic tool during Phase 6 |
| 8 | **ToM Consistency Audit Gaps** | Phase 6, Critic 2 | "Every major action in the story traces to one of these [want/need/fear/wound]?" - but no enforcement mechanism | Add mandatory "ToM Trace" field to all beat annotations |

---

### MEDIUM (Severity: 3 - Important Improvements)

| # | Issue | Location | Evidence | Recommendation |
|---|-------|----------|----------|--------------|
| 9 | **Phase Routing Confusion** | Phase Router | Complex table with multiple entry conditions - user may enter wrong phase | Simplify to 3 routes: "start fresh", "revise existing", "evaluate/critique" |
| 10 | **Knowledge Graph Read/Write Overhead** | Schema, Read/Write Procedures | 11-step Read Procedure, 10-step Write Procedure - too complex for real-time use | Simplify to 5-step core operations; full procedure as appendix |
| 11 | **Dynamic Critic Scaling Unclear** | Phase 6 | "Quick concepts: run Character and Structure critics only" - no clear criteria for determining complexity | Add explicit complexity calculator: lines × characters × budget_tier |
| 12 | **Script Dependencies Obsolete** | CLI Reference | References `observe.py`, `improve.py` scripts that are marked for removal in academic document | Remove legacy CLI references; rely on in-context learning |
| 13 | **Genre Supplements Incomplete** | Phase 1 | Only Family Adventure, Musical, Buddy Comedy, Coming of Age, Horror/Dark documented | Add: Sci-Fi/Fantasy, Action-Adventure, Comedy (non-buddy) supplements |

---

### LOW (Severity: 4 - Minor Issues/Polishing)

| # | Issue | Location | Evidence | Recommendation |
|---|-------|----------|----------|--------------|
| 14 | **Output Format Inconsistency** | Output Format | Multiple output formats across phases - hard to track what user receives | Standardize ALL phase outputs to 8-section structure |
| 15 | **Changelog Format Changes** | Changelog | v6.x, v7.x documented differently - harder to track evolution | Standardize changelog entries to full 4-column format |
| 16 | **Skill Version Confusion** | Metadata | Academic doc proposes "v2.0" but current is "v7.0.0" - mismatch | Clarify versioning strategy: academic v2.0 maps to v7.x |
| 17 | **29 Patterns Redundancy** | Phase 9 | Some patterns overlap (Rule of Three appears twice as #11 and #29) | Deduplicate patterns; consolidate to 25 core patterns |
| 18 | **Missing "Next Iteration Prompt" Defaults** | Output Format | No guidance on what makes a good vs bad iteration prompt | Add examples: specific beat focus vs "make it better" |

---

## Issues by Category

### Story Structure (Critical + High)

- Character Interiority Gap
- Climax Emotional Dramatization Failure
- Family Characters Are Generic Types
- Sequence Overloading
- Missing Beat Sheet Visual Requirement
- Dual-Layer Audience Not Operationalized
- ToM Consistency Audit Gaps

### Process/Workflow (High + Medium)

- Phase Routing Confusion  
- Knowledge Graph Read/Write Overhead
- Dynamic Critic Scaling Unclear
- Humanizer Phase Applied Too Late
- Script Dependencies Obsolete
- Genre Supplements Incomplete

### Documentation/Polish (Low)

- Output Format Inconsistency
- Changelog Format Changes
- Skill Version Confusion
- 29 Patterns Redundancy
- Missing "Next Iteration Prompt" Defaults

---

## Comparative Analysis: What Was Already Fixed

From the Changelog in SKILL.md (v7.0.0), several previous issues have been addressed:

| Previous Issue | Resolution Status | Evidence |
|---------------|-----------------|----------|
| Phase ordering (Drafting before Story Reel) | FIXED | "Drafting (7) now comes before Story Reel Review (8)" |
| Pixar DNA unified checklist | FIXED | "Single checklist applied across all critics instead of scattered" |
| Production budget tiers | FIXED | Skeptic now checks budget reality with indie/mid/tentpole |
| Visual moment in timeline | FIXED | Added `visual_moment` field to timeline entries |
| Dual-layer audience critic | FIXED | New Critic 7 added to Phase 6 |
| Visual storytelling critic | FIXED | New Critic 6 added to Phase 6 |

---

## Recommended Fix Priority Order

Based on structural dependencies:

### First Sprint (Critical Issues Only)

1. Implement character engine (WANT/NEED/LIE/GHOST/SPINE/PRESSURE)
2. Fix climax dramatization (internal break before typing)
3. Specify all family characters with unique voices
4. Rebalance Sequence D/E for event spacing

### Second Sprint (High Priority)

5. Add visual moment requirement to all beats
6. Operationalize dual-layer per beat
7. Add ToM trace enforcement
8. Make humanizer available during Phase 6

### Third Sprint (Medium Priority)

9. Simplify phase routing
10. Streamline KG operations
11. Define complexity calculator
12. Remove obsolete CLI references
13. Complete genre supplements

### Fourth Sprint (Low Priority)

14. Standardize output format
15. Fix changelog entries
16. Clarify version mapping
17. Deduplicate patterns

---

## Files Referenced

- `/workspace/user_input_files/recursive-narrative-engine/SKILL.md` (primary)
- `/workspace/user_input_files/user_input_files/GOD_MODE_PHASE1_IMPROVEMENTS.md`
- `/workspace/user_input_files/user_input_files/Architecting a Studio-Quality Narrator_ Integrating Pixar's Cognitive Framework into the Recursive Narrative Engine.md`

---

*Report generated: April 15, 2026*
*Next step: Apply Priority 1 fixes in next iteration*