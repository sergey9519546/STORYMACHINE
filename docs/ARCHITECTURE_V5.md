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

## 1. Ten Assumptions Destroyed and Rebuilt

### Assumption 1: "More rules = better discrimination"

**Why it's a cage:** 8,917 rules achieved AUC 0.076. The audit proved rule density is not the lever. Adding rules past saturation adds maintenance cost without discriminating power.

**Rebuild:** **Minimum discriminating set.** If 3 graph properties (promise-payment ratio, escalation monotonicity, causal density) achieve AUC >0.80 on held-out real writing, ship those 3. Stop when discrimination saturates. The new gate is not rule count — it is the smallest set that passes the benchmark.

**Concrete mechanism:** Measure each graph metric's independent contribution via ablation on the held-out benchmark. Rank by discriminating power. Compose only the metrics where removal drops held-out AUC below threshold. This is feature selection applied to structural metrics.

```typescript
interface GraphMetric {
  id: string;
  compute: (graph: StoryGraph) => number;
  ablationDelta: number;  // held-out AUC drop when removed
}

function selectMinimumSet(metrics: GraphMetric[], threshold: number): GraphMetric[] {
  // Greedy forward selection until AUC >= threshold
  // Return smallest discriminating set
}
```

---

### Assumption 2: "The user is one person writing alone"

**Why it's a cage:** Every writing room, every co-author pair, every writer-director collaboration needs shared structural truth. The current system has no model for multi-user Story Graph ownership or conflict resolution.

**Rebuild:** **Multi-cursor Story Graph as CRDT.** Multiple writers mutate different subgraphs concurrently (Writer A owns Character X's want-chain; Writer B owns the mystery revelation beats). The PDDL planner ensures mutations don't violate global constraints (Writer B can't pay a promise Writer A opened unless causality supports it). Conflicts surface as **graph merge proposals** requiring explicit reconciliation, not silent last-write-wins.

**Concrete mechanism:** Each Beat, Promise, Want gets a Lamport timestamp + author ID. PDDL planner validates graph mutations for causal consistency before accepting. Yjs provides real-time sync (already exists for Fountain text). Graph merge is a typed operation:

```typescript
interface GraphMerge {
  base: StoryGraph;
  branchA: GraphDelta;
  branchB: GraphDelta;
  conflicts: Conflict[];  // where A and B both mutate same beat
  proposedResolution: StoryGraph;
}

function mergeGraphs(merge: GraphMerge): MergeResult {
  // Auto-resolve non-conflicting (different subgraphs)
  // Surface conflicts as proposals: "A opened promise p12; B deleted the beat that would pay it"
}
```

---

### Assumption 3: "Output is a fixed screenplay file"

**Why it's a cage:** A screenplay is not an artifact — it is a **living graph that compiles to multiple output formats**. The writer sees annotated beats. The agent sees a coverage report. The director sees a shot list. The actor sees their character's want-chain. One graph, many projections.

**Rebuild:** **The Story Graph is source of truth; text is a compiled view.** Fountain/FDX/PDF are **render targets** from the graph, not the primary representation. "Save" doesn't save text — it checkpoints graph state (a StoryCommit). "Export" offers: Fountain (writer view), Coverage Report (agent view), Shot List (director view), Character Arc Workbook (actor view), Interactive Prototype (studio view).

**Concrete mechanism:** Extend StoryCommit ledger. Each commit is a graph delta. Current head is a folded graph. Exports are pure functions:

```typescript
type ViewType = 
  | "fountain" 
  | "coverage-report" 
  | "shot-list" 
  | "character-workbook" 
  | "interactive-prototype";

function render(graph: StoryGraph, view: ViewType): Artifact {
  switch(view) {
    case "fountain": return compileToFountain(graph);
    case "coverage-report": return generateCoverageFromGraph(graph);
    case "shot-list": return extractShotsFromBeats(graph);
    case "character-workbook": return buildArcWorkbook(graph);
    case "interactive-prototype": return compileToBranchingHTML(graph);
  }
}
```

Text is ephemeral; graph is durable. The writer edits structure; the system renders prose.

---

### Assumption 4: "LLMs can't be trusted, so ban them from core functions"

**Why it's a cage:** The constitution says "no LLM-as-judge" but the current system swung too far — LLMs are exiled to opt-in annotation, so the deterministic core lacks semantic depth. It can see "this word appears" but not "this is a threat."

**Rebuild:** **Deterministic validators on LLM-derived signals.** LLMs SENSE (annotate beats: threat/promise/revelation/cost) and contentHash-cache the annotations. The PDDL planner and scorer operate on the annotated graph **deterministically** — same annotations always produce same plan and score. Reproducibility holds (contentHash of text + model version → contentHash of annotations). The firewall: "LLMs label; rules verdict."

**Concrete mechanism:** Story Graph Builder gains SENSE layer (opt-in, keyless-degradable). Annotations are immutable once cached:

```typescript
interface BeatAnnotation {
  beatId: string;
  labels: AnnotationLabel[];  // threat, promise, revelation, cost, etc.
  modelVersion: string;
  contentHash: string;  // hash of source text
  cachedAt: timestamp;
}

// Deterministic: same text + model version → same annotations (cached)
function annotateBeat(beat: Beat, modelVersion: string): BeatAnnotation {
  const cached = annotationCache.get(beat.contentHash, modelVersion);
  if (cached) return cached;
  
  const labels = llmSensePass(beat.text, modelVersion);  // LLM call
  const annotation = { beatId: beat.id, labels, modelVersion, contentHash: beat.contentHash };
  annotationCache.set(annotation);
  return annotation;
}

// PDDL preconditions check annotations, not text
precondition hasThreat(beat: Beat): boolean {
  return beat.annotations.some(a => a.labels.includes("threat"));
}
```

Same annotations → same plan. Reproducible but semantic.

---

### Assumption 5: "Structure is discovered through analysis"

**Why it's a cage:** The current system reverse-engineers structure from finished text. But **structure should be designed, not discovered**. The writer should operate on promises and beats directly, then render to prose — not write prose and hope structure emerges.

**Rebuild:** **Structure-first authoring.** The writer doesn't type "INT. COFFEE SHOP - DAY" — they declare a Beat in the graph:

```typescript
Beat {
  id: "b23",
  kind: "revelation",
  character: "Alice", 
  reveals: Promise.p12,
  causes: [b45, b47]
}
```

PDDL planner validates this beat is legal (p12 exists, b45/b47 are reachable). The Screenwriter agent (Trinity) generates prose for that beat. Writer edits graph; machine renders text.

**Concrete mechanism:** Dual-register editor. Left pane: graph view (beats as nodes, causation as edges, promises as colored markers). Right pane: rendered Fountain. Edit either side; changes propagate bidirectionally.

```typescript
// Graph edit propagates to text
function onGraphMutation(delta: GraphDelta) {
  validateWithPDDL(delta);  // reject if illegal
  applyDelta(currentGraph, delta);
  const affectedBeats = delta.mutatedBeats;
  regenerateText(affectedBeats);  // Screenwriter agent renders prose
}

// Text edit propagates to graph  
function onTextEdit(range: TextRange, newText: string) {
  const affectedBeat = findBeatByRange(range);
  reAnnotateBeat(affectedBeat, newText);  // update semantic labels
  updateGraphFromAnnotations(affectedBeat);
}
```

The graph is truth; Fountain is view.

---

### Assumption 6: "Real-time means 'instant LLM response'"

**Why it's a cage:** Real-time in the current system is keyhole-local (generate one line). But **narrative time is non-local** — changi
