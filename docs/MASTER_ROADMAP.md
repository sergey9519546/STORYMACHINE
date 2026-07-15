# STORYMACHINE — MASTER ROADMAP (Single Source of Truth)

**Reconciled:** 2026-07-15  
**Decision:** User Validation First  
**Status:** Phase 0 in progress

This document consolidates ROADMAP.md, NORTH_STAR.md, and reconciles all contradictory planning documents. It is the **single canonical source of truth** for project direction.

---

## 0. The Master Decision

On 2026-07-15, when faced with contradictory guidance across 10+ planning documents, the project chose:

> **User Validation First over Technical Integration First**

This means:
- P0 user validation gates all new engine work
- V5.0 systems exist in shadow mode, remain OFF until validation proves demand
- Story Graph Phase 1-2 is production-ready, shows to users in P0
- Phase 3-4 are design documents only, not implemented
- No new rules, waves, or research intake until P0 clears

---

## 1. Ground Truth (What Actually Exists)

### ✅ WORKING & PRODUCTION-READY

**Story Graph Phase 1-2** (697 LOC fully integrated)
- Enhanced diagnostics with severity/suggestions/strengths
- UI in ScriptDoctorPanel.tsx, 28/28 tests passing
- **Shows to writers in P0 sessions**

**V5.0 Systems** (5,000+ LOC shadow mode)
- EventStore, Trinity Gate, Quantum Field, Type Adapters
- OFF by default, can enable via V5_EVENTSTORE_SHADOW=true
- **Activates if P0 GREEN**

**P0 Validation Materials** (complete)
- Protocol, recruitment templates, sample report ready

**Deterministic Core** (production-ready)
- Keyless boot, contentHash reproducibility, security gates passing

### ❌ NOT IMPLEMENTED
- Phase 3-4 Story Graph (design docs only)
- V5 wired into Stage (shadow mode exists, not active)
- Labs feature flag (documented, not coded)

---

## 2. The Unified Plan

### PHASE 0: Documentation Reconciliation (2-4 hours)
- Create MASTER_ROADMAP.md ← YOU ARE HERE
- Archive contradictory docs to filed-backlog/2026-07-15-session/
- Create DECISION_LOG.md
- Update AGENTS.md

### PHASE 1: Fix What's Broken (4-6 hours)
- Verify Story Graph UI renders
- Implement Labs feature flag
- Verify V5 shadow mode OFF
- Fix TypeScript errors, verify build

### PHASE 2: P0 User Validation (2-3 weeks) — BLOCKS ALL DOWNSTREAM

**Week 1: Recruitment** (target 10+ interested)
- Post Reddit, tweet, DM screenwriters
- Track in P0_EXECUTION_LOG.md

**Week 2: Sessions** (target 8-10 completed)
- Show sample report with Story Graph
- Watch reactions, ask "Would you run your own draft?"
- Document verbatim, count pull signals

**Week 3: Decision**
- Aggregate in P0_EVIDENCE_SUMMARY.md
- Apply decision tree:
  - **GREEN (4+ strong)** → Phase 3A+3B (activate V5, build P1 corpus)
  - **YELLOW (2-3 strong)** → Phase 3C (fix objections, iterate)
  - **RED (<2 strong)** → Phase 3D (STOP, pivot or archive)

### PHASE 3A: IF GREEN — Activate V5 (2-3 weeks)
- Wire Trinity Gate into Stage.ts
- Test with V5 enabled
- Document in V5_ACTIVATION_GUIDE.md

### PHASE 3B: IF GREEN — Build P1 Benchmark (4-6 weeks)
- Assemble 20-40 real screenplays
- Get blind labels from 3+ readers
- Prove held-out AUC ≥ 0.80

### PHASE 3C: IF YELLOW — Iterate P0 (1-2 weeks)
- Fix top 3 objections
- Re-test with 5 new writers

### PHASE 3D: IF RED — Stop & Pivot (1 week)
- Document learnings in P0_FAILURE_ANALYSIS.md
- Archive V5 systems
- Define pivot or graceful exit

---

## 3. What NOT to Do (Gates)

**BEFORE P0 CLEARS:**
- No Phase 3-4 Story Graph
- No Infinity Gate Layer 4-7
- No new rules (frozen at 8,917)
- No OASIS expansion
- No research intake
- No new waves

**EXCEPTION:** Security fixes bypass gates

---

## 4. File Structure

```
docs/
  ├── MASTER_ROADMAP.md          ← SINGLE SOURCE OF TRUTH
  ├── NORTH_STAR.md
  ├── ARCHITECTURE.md
  ├── DECISION_LOG.md            (NEW)
  ├── user-validation/           (P0 ACTIVE)
  └── filed-backlog/             (HISTORICAL)
      └── 2026-07-15-session/
```

---

## 5. References

**Active**: NORTH_STAR.md (constitution), ARCHITECTURE.md (system map), docs/user-validation/ (P0 work)

**Filed**: docs/filed-backlog/ (V5 vision, session docs, research audits)

---

## 6. Current Status

**Phase**: Phase 0 — IN PROGRESS

**Next**: Archive contradictory docs, create DECISION_LOG.md, update AGENTS.md

**Blocking**: All downstream work blocked on P0 GREEN

---

**Constitutional Reminder:**

> **Demand before rigor.** No new engine work without validated user need.

> **V5 systems are filed capabilities that activate IF validation proves demand.**

> **P0 is a hard gate that determines whether the project continues building or pivots.**

