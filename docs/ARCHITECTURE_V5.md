# STORYMACHINE — Architecture V5: The Neuro-Symbolic Story Engine

*Written 2026-07-15. A technically honest, radically ambitious architecture that extends the Story Graph foundation (VISION_REBUILD.md) with PDDL planning, Trinity agents, hard validators, and graph-native intelligence.*

---

## 0. The Reframe: Reading and Writing as Dual Operations on One Graph

The current system has an identity crisis. It wants to be both a diagnostic reader (Script Doctor) and a generative writer (OASIS). These were built as separate systems competing for the same state.

VISION_REBUILD.md solved half: how to READ screenplays correctly — model them as a causal-temporal Story Graph of Promises, Payments, Wants, Beats, and Tension. Graph-native scoring is order-sensitive, solving the act-swap failure (current AUC ~0.48).

**V5 completes the circle:** STORYMACHINE is a bidirectional engine operating on one shared Story Graph:

```
READING:  Screenplay text → Parser → Story Graph → Scorer → Diagnosis
WRITING:  Intent → PDDL Planner → Graph mutations → Trinity Agents → Validated scenes → Text
```

The Story Graph is the shared substrate. The reader validates what the writer produces. The writer acts on what the reader diagnoses.

This reconciles:
- "No LLM-as-judge" with generative capabilities (LLMs SENSE/GENERATE; validators SCORE/REJECT)
- Orphaned OASIS with clear job (stress-test graph under counterfactuals)  
- Proof kernel with generation (validates graph mutations before commit)
- Keyless-first with opt-in generation (reading keyless; writing degrades gracefully)

V5 is the two-way Story Graph engine — the first tool that reads your structure to diagnose it AND writes structure that passes the same diagnosis.

---

