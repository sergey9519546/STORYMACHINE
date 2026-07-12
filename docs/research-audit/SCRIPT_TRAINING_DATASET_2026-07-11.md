# Script-Training Reference Dataset — 2026-07-11

Decision (confirmed with user): **adopt the reference scripts for the AUDIT / eval
track now; defer model fine-tuning** (planner/renderer training stays in the
generation track, gated by the Minimum High-End Plan). This turns the animation
corpus into a *derived functional-annotation* dataset that strengthens the
deterministic audit — it is **not** a model-training run.

## Rights posture (non-negotiable)
The 53 animation feature screenplays are **copyrighted → `reference_only`**.
- Allowed: human_analysis, automatic_annotation, retrieval-of-labels, evaluation.
- Forbidden: storing verbatim text, entering model context/weights, export.
Only **derived** artifacts are stored (labels, structural metrics, state-change
signals). Verified: extractor output carries no `text`/`line`/`content` fields.
`script-training/annotations/` is gitignored. Mirrors the engine's existing
env-gated corpus discipline (corpus text never enters git). Source register:
`script-training/sources/source-register.csv` (per-title rights + provenance).

## What was built
- `script-training/taxonomy/` — genre contracts (animation_family_feature), scene functions, mechanisms, dialogue tactics, annotation guide (4-level codebook).
- `script-training/schemas/annotation.schema.json` — derived-only annotation schema.
- `script-training/sources/source-register.csv` — all 55 PDFs governed (rights=reference_only).
- `script-training/tools/extract_annotations.py` — PDF → derived annotations via per-script adaptive **indentation geometry** (separates action / dialogue / character-cue).
- `script-training/annotations/scenes.jsonl` — **4,372 derived scene records across 46 scripts** (gitignored).

## Dataset quality (honest)
**Reliable (deterministic, verified):** scene segmentation, INT/EXT, time-of-day,
ordinal/position, dialogue-vs-action counts (overall dialogue share 0.47 —
realistic), participant counts (2.18/scene — realistic), coarse scene_function
(pressure/escalation/discovery/reversal/payoff/aftermath/setup — sanely spread).

**Deferred to the semantic stage (NOT populated):** active_mechanism, hidden
intent, subtext, state_change_signals, reveal_mode — these need the LLM-assisted
annotation stage (research §4 levels 3–4) and are left `null`/empty on purpose.
The deterministic pass builds the *structural band*; the semantic band is future
work, and honestly labelling that boundary is the point of the two-tier design.

**OCR gap (9 image-only PDFs, queued):** Aladdin, Moana, Lion King, Brave,
Ratatouille, Big Hero 6, Red Turtle, Secret Life of Pets, + the DreamWorks
education resource (not a script). Matches ROADMAP §5.8 OCR-recovery item.

## How it feeds the audit (adopt-for-audit mapping)
The research's "functional tests" are **evaluations of the audit engine**, and
this dataset is their ground truth:
| Functional test | Audit engine component it exercises |
|---|---|
| scene-function classification | the doctor's structural passes |
| state-delta prediction | scene state-change detection (`scene_no_state_change`) |
| impossible-knowledge detection | proof kernel `KnowledgeValidator` |
| reveal fairness | reveal/setup-payoff ledger |
| voice-swap | Burrows's Delta detector (RECOVER-01) |
| synthetic-flaw detection | inject continuity errors → doctor must catch |
Also: a produced-animation **"great" calibration band** (extends the
Ibsen/Chekhov idea), and hidden-eval split **by studio/title** (never random
scenes from one script across train/eval).

## Deferred (generation track, gated — not started)
Planner / dialogue-compiler / renderer fine-tuning, preference-ranking data,
offline optimization. Requires rights-cleared/owned/synthetic text for the
renderer stage — the reference scripts never enter that stage.
