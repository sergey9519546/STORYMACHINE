# script-training — reference-analysis corpus & annotation methodology

Turns the animation reference corpus into a **derived functional-annotation
dataset** that improves the StoryMachine **audit** engine. Adopted per the
2026-07-11 decision: **adopt for audit / eval now, defer model fine-tuning**
(planner/renderer training stays in the deferred generation track — see
`docs/canonical/STORYMACHINE_EXECUTION_PLAN.md` Minimum High-End Plan).

## Non-negotiable rights posture
The 53 animation screenplays are **copyrighted**. They are `reference_only`:
- allowed: human_analysis, automatic_annotation, retrieval-of-labels, evaluation.
- forbidden: storing verbatim text, entering model context/weights, export.
Only **derived** artifacts (functional labels, structural metrics, state-change
signals, synthetic equivalents) are stored. No raw dialogue/action lines are
persisted. `annotations/` is gitignored. This mirrors the engine's existing
env-gated corpus discipline (corpus text never enters git).

## What this feeds (audit/eval, not training)
- A "great" reference band for calibration (extends the Ibsen/Chekhov idea to produced animation features).
- Ground truth for the audit's functional tests: scene-function classification, state-delta prediction, impossible-knowledge detection, reveal fairness, voice-swap, synthetic-flaw detection.
- Hidden-eval split by studio/title/writer (never random scenes from one script across train/test).

## Layout
```
taxonomy/     genre contracts, scene functions, mechanisms, dialogue tactics, annotation guide
schemas/      JSONL/JSON schemas for the 4 annotation levels
sources/      source-register.csv — rights + provenance per script
tools/        extract_annotations.py — PDF → derived annotations (no verbatim)
annotations/  derived output (GITIGNORED)
```

## Deferred (generation track, gated)
Planner / dialogue-compiler / renderer fine-tuning, preference-ranking data,
offline optimization. Not started; see the execution plan's "Later" section.
