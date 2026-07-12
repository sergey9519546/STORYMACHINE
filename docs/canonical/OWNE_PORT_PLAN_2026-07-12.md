# OWNE → StoryMachine port plan (build spec for #69 / #70 / #133)

**Source:** `owne-engine (FINAL)` (Python, in `_reference_keep_2026-07-12/`). A complete,
tested reference implementation of the substrate. This turns tasks #138 → concrete steps.

## The one adaptation that governs everything

OWNE **populates** its ledgers from *validated generation events* (`caused_by_event_ids`
on generated StoryOps). StoryMachine must populate the *same ledgers* from **extraction
over a comprehended imported script** (this session's normalizer output → scenes,
dialogue, speakers). So:

> **Port the ledger data structures + algorithms verbatim; replace the *population source*
> from "generation events" to "per-scene fact extraction," where OWNE's `step` = the
> scene's presentation-order index.** Skip everything under `owne/llm/`, `owne/planning/`,
> `owne/drama/manager.py`, `owne/realizer.py`, `owne/selector.py`'s generation path — those
> are the writing engine, not the evaluator.

## Mapping table (source → target → task)

| OWNE source | Port to (TS) | Task | Port mode |
|---|---|---|---|
| `core/state.py` `NCPState` (dot-path container: set/query/delete/snapshot/diff/merge) | `NarrativeState.ts` | #69 | **verbatim** |
| `ledgers/truth.py` `TruthFact` + `TruthLedger` (14 statuses, 11 canon tiers, 8 epistemic layers, validity intervals) | `truth-ledger.ts` | #70 | **verbatim struct; adapt population** |
| `ledgers/truth.py` `detect_contradictions()` (FactTrack: same subj/pred + incompatible obj + same layer + overlapping interval + no explaining event) | fold into `truth-ledger.ts` + `assertion-containment.ts` | #70/#105 | **verbatim algorithm** |
| `ledgers/belief.py` / `presentation.py` / `audience.py` | `belief-ledger.ts` / `disclosure-ledger.ts` / audience | #69/#120/#97 | verbatim struct; adapt population |
| `promise.py` `Promise`/`PromiseLedger` (setup_class, payoff_predicate, deadline_step, urgency) | extend `typed-promises.ts` | #81 | verbatim + PT_* library (#139) |
| `narrative/whatif.py` `WhatIfAnalyzer` (fork_state / simulate_alternate / compare / what_if) | `whatif.ts` | #133 | **adapt: re-run proofs, not re-simulate** |
| `graphs/temporal.py` | already have `temporal.ts` (Allen) | #70 | reconcile |
| `graphs/causal.py` / `clue.py` / `spatial.py` | causal/clue/spatial views | #105/#82/#113 | verbatim struct |
| `validation/validators.py` + `llm/proof_gates.py` | proof kernel | #109/#72 | adapt (drop LLM gate; keep deterministic predicates) |

## Step-by-step

### Step 1 — `NarrativeState` (#69) [verbatim]
Port `NCPState`: a `{ledgers, graphs, characters}` container with dot-path `set/query/
delete/snapshot/restore/diff`. This is the single object every detector reads as a
**stateless view** (#108). Acceptance: snapshot→mutate→diff round-trips; OWNE's
`test_state.py` cases pass in TS.

### Step 2 — `TruthLedger` + FactTrack contradiction (#70) [verbatim struct, adapted feed]
Port `TruthFact` (subject/predicate/object, status, canon_tier, epistemic_layer,
confidence, `valid_from_step`, `valid_until_step`, `caused_by_event_ids`) and the
`TruthLedger` methods (`add/expire/register_transition_event/detect_contradictions/
retcon/promote/query`).
- **Population (the adaptation):** run the FactTrack pre/post/static decomposition per
  scene (from the comprehended scenes) → each post-fact is a `TruthFact` with
  `valid_from_step = sceneIndex`; a later contradicting fact sets the earlier one's
  `valid_until_step` unless a transition event explains it (`register_transition_event`).
- `detect_contradictions()` ports verbatim — it IS the assertion-containment upgrade (#105),
  replacing the crude `acknowledgedReversal` boolean with interval overlap on both
  checkpoints. Acceptance: OWNE's `test_truth.py` + the reference broken fixtures
  (`object_ownership_conflict`, `pure_and_then`) flag; produced-corpus stays zero-FP.

### Step 3 — Belief / Presentation / Audience ledgers (#69/#120/#97) [verbatim struct]
Port the three sibling ledgers into `NarrativeState`. Belief carries nested-ToM depth
(#120: `K_a K_b P`) + `source_origin_id` genealogy. Presentation vs Audience gap = the
fair-reveal + dramatic-irony signals (#97/disclosure). Fold the existing
`epistemic-ledger.ts` / `disclosure-ledger.ts` into these.

### Step 4 — What-If / Impact(v) (#133) [ADAPT]
Port `WhatIfAnalyzer` structure (`fork_state / compare / what_if`) but change the engine:
OWNE re-*simulates* a forked generation kernel; StoryMachine instead **re-runs the
deterministic proofs/contradiction-detection on the forked NarrativeState** after applying
the proposed change to fact/scene X. `Impact(v)` = the set of findings whose truth value
flips (fire→clear or clear→fire). Output the WhatIfReport (original vs alternate + the
downstream findings + recommendation). Acceptance: ≥80% recall of hand-labeled downstream
breaks on 5 corpus scripts (the #133 gate).

### Step 5 — Promises (#81) [verbatim + content]
Port `PromiseLedger` (`create/is_active/is_overdue/urgency`) and load the 22-entry Π/PT_*
template library + Tavern-Letter fixture from `docs/owne/` (#139). Wire onto
`typed-promises.ts` (already built).

## Guardrails
- **No LLM in the verdict path.** Port only OWNE's deterministic parts; its `llm/` gates
  become deterministic predicates (#109) or a frozen proposer (#76), never a live judge.
- **Reproducibility preserved:** the ledgers are pure functions of the extracted facts +
  scene order → byte-reproducible, cacheable by state-hash (#108).
- **Rights:** OWNE is reference *code*; StoryMachine ports the algorithms, not any script
  content. Corpus text stays local.
- **Reconcile, don't duplicate:** where StoryMachine already has a module (temporal.ts,
  epistemic/disclosure/custody/assertion, typed-promises), fold OWNE's version in rather
  than adding a parallel one — matches the "views not engines" discipline (#108).

## Sequence
Step 1 (#69) → Step 2 (#70) unlock Steps 3–5 and the whole findings layer (#72). Build
Step 1+2 first; they are the keystone the 12 blocked spine tasks wait on.
