# STORYMACHINE — Decision Log

**Purpose**: Audit trail of major strategic decisions that changed project direction.

---

## Decision #1: User Validation First (2026-07-15)

**Context**: 10+ planning documents gave contradictory guidance:
- ROADMAP.md (2026-07-14): "P0 user validation blocks all new engine work"
- V5.0_ULTIMATE_ROADMAP.md (2026-07-15): "Ship V5.0 Complete, build 4 new layers over 6-12 months"
- SESSION_EPIC_COMPLETE.md (2026-07-15): "10,922 LOC deployed, ready to merge to main"

**The Question**: Should we activate V5.0 systems now or validate user demand first?

**Options Considered**:
1. **User Validation First** — Follow ROADMAP P0 stance, recruit 5+ writers, prove demand before building
2. **Technical Integration First** — Wire V5 systems into production, validate later
3. **Hybrid** — Parallel tracks (validate + integrate simultaneously)
4. **Just Fix Broken** — Make existing code work, decide after

**Decision**: **User Validation First** (Option 1)

**Rationale**:
- NORTH_STAR.md constitutional law: "Demand before rigor"
- Project's central failure mode was "optimizing rigor without validated user need"
- V5 systems are 5,000+ LOC built without a single user interview
- Story Graph Phase 1-2 ready to show users — validate before building Phase 3-4
- Risk mitigation: Learn cheaply (2-3 weeks) before investing heavily (2-3 months)

**Implications**:
- P0 is a **hard gate** — no new engine work until it clears
- V5 systems remain in **shadow mode** (OFF by default) until P0 GREEN
- Story Graph Phase 3-4 blocked on P0 GREEN + P1 validation
- Infinity Gate Layer 4-7 moved to filed backlog
- Wave program stays RETIRED, rule count frozen at 8,917

**Expected Outcomes**:
- **GREEN (4+ strong pull)**: Proceed to activate V5 + build P1 benchmark corpus
- **YELLOW (2-3 strong pull)**: Fix objections, iterate P0, re-test
- **RED (<2 strong pull)**: Archive V5, stop P1, pivot or graceful exit

**Documents Reconciled**:
- Created MASTER_ROADMAP.md as single source of truth
- Archived contradictory docs to `filed-backlog/2026-07-15-session/`:
  - V5.0_ULTIMATE_ROADMAP.md
  - SESSION_EPIC_COMPLETE.md
  - ULTRAPROMPT_BLUEPRINT_*.md
  - UX_OVERHAUL_COMPLETE_*.md
  - STORY_GRAPH_*.md (11 files)
  - V5.0_RELEASE.md

**Status**: Active — Phase 0 (documentation) in progress, Phase 1 (fix broken) next, Phase 2 (P0 validation) starts this week

**Revision History**: This decision can be revisited if P0 GREEN validates demand for V5 capabilities

---

## Decision Template (for future entries)

**Context**: What situation prompted this decision?

**The Question**: What was being decided?

**Options Considered**: What alternatives were evaluated?

**Decision**: What was chosen?

**Rationale**: Why was this the best choice?

**Implications**: What does this commit the project to?

**Expected Outcomes**: What are the success criteria?

**Status**: Active / Superseded / Revisited

**Revision History**: When and why this was updated

---

**End of DECISION_LOG.md**
