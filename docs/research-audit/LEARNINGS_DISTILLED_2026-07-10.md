# Learnings Distilled — 2026-07-10 Learning-Loop Pass

Baseline: `docs/research-audit/MASTER_RESEARCH_AUDIT.md` (2026-07-10 incorporation
queue). Everything below is implementation-grade detail found in keeper files
that is NOT already captured as a bullet in that queue. Organized by theme;
each item tags its source file. Source files are archived to
`_superseded_2026-07-10/` unless marked KEEP — their content now lives here.

## Memory architecture (paper-specific, with arXiv IDs)
- **xMemory** (arXiv 2602.02007): hierarchical memory store; benchmark
  discipline — must beat vanilla top-5 RAG by >=10% on LoCoMo/PerLTQA or the
  hierarchy is broken. Bottom level should delegate to Mem0's multi-signal
  retrieval (semantic + BM25 + entity matching) rather than reimplementing a
  leaf retriever. — *ULTRAPLAN_NarrativeAgent_2026.md*
- **FactTrack** (arXiv 2407.16347): the contradiction-vs-progression fix —
  a character can be alive (ch.1) and dead (ch.5) validly; only flag
  contradiction when two facts share the *same validity interval*. World
  state should pass through FactTrack validity-interval checking before
  facts enter any semantic/memory layer. — *ULTRAPLAN_NarrativeAgent_2026.md*
- **Utopian Illusion** (arXiv 2510.21180): LLM multi-agent dialogue drifts
  toward unrealistically positive/agreeable social tone (higher sentiment,
  fewer negations, worse with more agents). Two concrete counters not yet in
  the queue: (1) **Sentiment Watchdog** — if all agents trend toward
  relief/joy/neutral for 3+ consecutive turns/scenes, treat as a dramatic
  emergency and force a pressure-application beat; (2) **Primacy Effect
  Suppression** — randomize which character/agent acts/speaks first each
  round; a fixed first-speaker sets emotional tone that others converge to.
  — *storymachine_master_upgrade.md*, *ULTRAPLAN_NarrativeAgent_2026.md*

## Benchmarks worth citing when justifying the wave program's existence
- FlawedFictions (arXiv 2504.11900): LLM story generation introduces
  100%+ more plot holes than human writing; summarization introduces 50%+
  more; open-source models self-detect their own inconsistencies at ~53%
  (near-random).
- ConStory-Bench / "Lost in Stories" (arXiv 2603.05890): every LLM category
  (proprietary, open-source, fine-tuned, multi-agent) fails long-form
  consistency; errors cluster most in factual/temporal dimensions and at the
  narrative midpoint (highest accumulated state).
- StoryAlign / StoryRMB (arXiv 2605.04831): first reward-model benchmark for
  story preference — 1,133 human-verified instances, ~100k preference pairs.
  Relevant if a future calibration-loop wave wants an external reward-model
  comparison point. — *Narrative_Intelligence_Systems_Research_Paper_v6.md*

## Neurobiological director mechanisms beyond what pixar_cognitive_architecture covers
- **Dopamine Prediction Error Architecture**: unexpected outcomes/information
  create reward-prediction-error signals that sustain attention — distinct
  mechanism from the kept Oxytocin Bonding axiom; worth a "was this beat
  actually surprising vs merely novel" check if a future excellence-detector
  wave targets reveal pacing.
- **Cortisol Sustained Attention Architecture**: elevated tension/stress
  maintains vigilance and creates "addiction to resolution" — a mechanism
  distinct from oxytocin bonding, useful framing for a sustained-tension
  (not just peak-tension) pacing check. — *UNIFIED_DIRECTOR_COGNITIVE_ARCHITECTURE.md*

## Consistency checking granularity
- "All 19 subtypes" of long-form consistency errors, each paired with a
  specific automated check function (not just the 5 category names already
  in most other docs) — if a future wave targets consistency-checking
  depth, this file had the fullest enumeration seen in the archive.
  — *Filling_Every_Gap_research_StoryMachine.md*

## Design/visual-QA technique (not narrative, but reusable pattern)
- **85/15 Design System Validator** pattern: YOLO v8 for geometric shape
  classification (curve vs angle) + CLIP for semantic style similarity +
  rule engine for ratio compliance + Percy-style visual regression testing.
  Not directly applicable to the text-only revision engine today, but the
  general pattern (cheap geometric classifier + embedding similarity +
  deterministic ratio rule) is a reusable template if StoryMachine ever
  gains a storyboard/visual module. — *TRIBE_Story_Integration_Architecture.md*

## Standing caution (reinforces v35_integration_plan / audit warning)
- Every "Ernie" branch document (Complete_Ernie_V5.55, Complete_Report,
  Complete_Report23, Complete_Research_Report, "5 1_50 time better",
  v4.5_Complete_Ernie_V5.55) repeats the same fabricated-citation pattern
  already documented in `v35_integration_plan.md` — confirmed on spot-check,
  no new mechanisms found beyond what's already in earlier lineage docs or
  the queue. No further per-file learnings extracted from this branch.
