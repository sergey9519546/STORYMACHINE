# Clever Moves: Gap-Closing Upgrades for the Working Repo

*Sixth companion. The five prior docs specify the architecture. This one is the upgrade list — specific, opinionated moves that close gaps in those specs and cut complexity rather than add it. Each item maps to a concrete code change you can make this week.*

The mission: more leverage, not more code.

---

## 0. The Single Move That Collapses Half the Architecture

**Most "engines" should be VIEWS over the canonical state, not stateful services.**

Across the five docs there are ~22 named engines. In a naive build that's ~22 modules with their own internal state, lifecycle, and APIs. In practice, the majority of them are *queries* over `NarrativeState` + the `StoryCommit` ledger. They don't need their own state. They need a `view()` method.

Concrete fix in the repo:

```ts
// Before: stateful engine
class ReincorporationEngine {
  trackedSetups: Map<SetupID, Setup>;
  trackedPayoffs: Map<PayoffID, Payoff>;
  // ... own state, own update logic, drift risk
}

// After: stateless view
const reincorporationView = (state: NarrativeState) => ({
  density: countAct3StoryOpsReferencingAct12Elements(state) / countAct3StoryOps(state),
  orphanedSetups: findStoryOpsTaggedSetupWithoutMatchingPayoff(state),
  symbolArcs: groupOpsByAffectedSymbol(state).filter(arc => arc.changedAcrossActs),
});
```

Engines that should be views, not stateful modules:
- Reincorporation, Mirror Scene, Surprise Bandwidth, Necessity, Throughline
- Most of the proof checks (see §1 below)
- Pacing audit (it's a count over scene ops)
- Reveal readiness (it's a function of clue ecology state)
- Voice differentiation (it's a pairwise distance over recent lines)
- Cliché density, originality score, reincorporation density

Engines that genuinely need their own state:
- Cognition Module (per-agent BDI + memory + ToM updates that need to persist)
- Relationship Module (relationship state evolves continuously)
- World/State Kernel (the canon ledger itself)
- Drama Manager Module (decision-making state across scenes)
- Reveal Module (RevealPlan objects with lifecycle)
- Theme Module (ThemeArgumentGraph state)

That's 6 stateful engines, not 22. The other 16 become pure functions over state. Refactor benefit: drift-free, parallelizable, cacheable by state-hash, testable as pure functions, no migration concerns when state shape changes.

This single move probably halves the repo.

---

## 1. Operationalizing the 13 Proofs Cheaply

The biggest hand-wave across the architecture is "the proof kernel runs and validates." Here's what each proof should actually be. **Most should be deterministic predicates, not LLM judges.** LLM judges only where genuine semantic judgment is needed.

| Proof | Tier | How to actually implement | Cost |
|---|---|---|---|
| TemporalProof | 1 | Allen Interval Algebra constraint propagation over `eventGraph`. Detect transitive violations. | Deterministic, <10ms |
| CausalProof | 1 | Every non-initial event has ≥1 causal predecessor edge in `causalGraph` with `enables`/`triggers`/`motivates` relation. | Deterministic graph traversal |
| IntentionalProof | 1 | Action's actor has an active `goal_node` (in their DAG) whose proposition is served by this action. Match by predicate, not embedding. | Deterministic, single lookup |
| MechanismProof | 1 | Scene's `activeMechanisms` field is non-empty; mechanism's `lifecycle` state advanced this scene; mechanism's `invariants[]` all return true. | Deterministic predicate eval |
| EpistemicProof | 1 | All facts referenced by character in dialogue ∈ that character's `belief_layers` AT this turn (with valid validity interval). | Deterministic lookup |
| ContinuityProof | 1 | No two facts in `objectiveReality` have same (subject, predicate) with overlapping validity intervals and incompatible objects, unless an event explains the change. | Deterministic SQL query |
| ProvenanceProof | 1 | Every line has a `provenance_record` row. Easy boolean check. | Deterministic |
| NecessityProof | 2 | The `NecessityCertificate` has non-empty answers for why_now/here/them. Check the scene references at least one. | Deterministic field check |
| SpecificityProof | 2 | Line embedding distance from precomputed generic-cluster centroid > threshold (calibrated per-genre). | Statistical, ~50ms |
| VoiceProof | 2 | Stylometric classifier (logistic regression over n-gram + function-word features) predicts correct speaker from the line at confidence > threshold. | Statistical, ~10ms |
| ReincorporationProof | 2 | Count of `StoryOp.affected_elements` in Act 3 ops that ALSO appear in Act 1-2 ops AND have changed state. Threshold 70%. | Deterministic count |
| RelationshipProof | 2 | If scene is repair scene: check that prior scene had harm + intermediate scene had cost paid + current scene has changed behavior + target character's belief layer accepts. 4-predicate AND. | Deterministic |
| EmotionProof | 2 | Emotion-shift StoryOps in this scene each have a causally-prior event in `eventGraph` (i.e., emotion was *caused*, not declared). | Deterministic graph check |
| SubtextProof | 2 | For every line: `explicitMeaning != subtextMeaning` AND subtext detector (small classifier on intent-vs-surface delta) confirms. | Statistical, ~30ms |
| SurpriseProof | 2 | Audience-model service predicted this turn's outcome with probability < 0.5. Cheap Haiku call cached per state-hash. | Single LLM call, $0.0001 |
| ReaderStateProof | 2 | Reader-simulator's projected curiosity/suspense/investment curves remain within target genre bounds. | Deterministic interpolation |
| PolarityProof | 2 | Scene's `valenceTrajectory` (before/after) shows a sign-flip or magnitude shift > threshold (McKee's "gap"). | Deterministic |
| SpatialProof | 2 | Every character reference to seen/heard/learned fact in scene must trace to a sightline/sound zone/inference path in `SceneSpace`. | Deterministic graph reachability |
| DialogueProof | 2 | The 10 dialogue validators (see §3) all return true. | Deterministic chain |
| GenericnessProof | 3 | TVTropes-style cosine similarity against archetype embeddings + conflict-softening detection. | Statistical |
| OriginalityProof | 3 | Distance from precomputed known-screenplay corpus in embedding space. | Statistical |
| BiasAuditProof | 4 | Quantified per-axis representation scores against thresholds + Bechdel-family tests. | Deterministic count + classifier |
| AttributionProof | 4 | Every line in `provenance_record` has origin in {user_authored, model_generated, model_rewritten, ...}. | Deterministic |

**Net result**: of 23 proofs, 17 are deterministic predicates, 4 are cheap statistical, 2 need an LLM call. Total cost per scene with all proofs running: ~3 LLM calls (~$0.0005), ~200ms of deterministic work. Affordable to run on every commit.

The clever frame: **proofs operate on StoryOps, not on prose.** Prose is for humans. Proofs are for the substrate.

---

## 2. The Single Audience-Model Service

Across the architecture, ~6 different modules want to know "what does the audience expect next?":
- Reveal Engine (40-70% sweet spot)
- Surprise Engine (was this actually surprising?)
- Reader-State Simulator (suspense/curiosity/investment curves)
- Pacing Engine (boredom risk)
- Dramaturge (was a beat unearned?)
- Genericness Detector (is this predictable for the genre?)

**Clever fix**: one cheap shared service.

```ts
const audienceModel = async (state: NarrativeState, candidateOutcomes: string[]) => {
  const hash = stateHash(state);
  const cached = cache.get(hash);
  if (cached) return cached;
  
  // ONE Haiku call returns probabilities for all candidate outcomes
  const response = await haiku.complete({
    prompt: audiencePredictionPrompt(state.recentSummary, candidateOutcomes),
    response_format: 'json',
  });
  cache.set(hash, response);
  return response; // { outcome_probabilities: {...}, suspense: 0.6, curiosity: 0.4, investment: 0.7 }
};
```

Every audience-related module queries this. Cache by state-hash. Total cost: 1-2 Haiku calls per scene (~$0.0002), shared by all six modules. The audience model isn't a research project; it's a single LLM call with a stable prompt and a cache.

---

## 3. The 10 Dialogue Validators as 10 Cheap Predicates

The Dialogue Engine has 10 named validators. Each is currently described in prose. Each should be a 1-3 line predicate over `DialogueTurnIR`:

```ts
const validators = {
  mechanismRelevance: (turn) => turn.activeMechanism != null,
  
  stateChange: (turn) => Object.keys(turn.requiredStateDelta).length > 0,
  
  voiceSpecificity: (turn, voiceProfile) => 
    stylometricMatch(turn.surfaceLine, voiceProfile) > 0.7,
  
  subtextGap: (turn) => 
    turn.explicitMeaning !== turn.subtextMeaning,
  
  knowledgeLegality: (turn, state) => 
    extractFactsReferenced(turn.surfaceLine)
      .every(fact => state.characterBeliefStates[turn.speakerId].knows(fact)),
  
  expositionLaundering: (turn, state) => 
    newInfoWordRatio(turn.surfaceLine, state) < 0.4, // not pure exposition
  
  responseChain: (turn, prevTurn) => 
    turn.references?.includes(prevTurn?.id) || 
    turn.actionInstead?.answersPreviousLine === prevTurn?.id,
  
  relationshipPressure: (turn, scene) => 
    scene.relationshipDeltas.some(d => d.changedAtTurn === turn.id),
  
  silenceActionAlternative: (turn, candidates) => 
    candidates.some(c => c.silence || c.actionInstead),
  
  motifCallback: (turn, state) => 
    extractMotifs(turn.surfaceLine).some(m => state.usedMotifs.has(m)),
};

const dialogueProof = (turn, ctx) => 
  Object.entries(validators).every(([name, fn]) => fn(turn, ctx));
```

That's the entire dialogue validation layer. ~70 lines of TypeScript. No LLM calls. Every line in every scene gets validated in <5ms. Fail = repair attempt = retry with explicit corrective constraint.

---

## 4. The Underspecified Subtext Mechanism (Pre-LLM Generation)

The Synthesis doc says subtext should be a "hard constraint" generated BEFORE the LLM call. The other docs treat it as post-validation. The first is right and cheaper.

**Clever fix**: generate the (explicitMeaning, subtextMeaning) pair first as structured data, then prompt the LLM with the pair as a constraint:

```
You are ELI. The previous line said: "$5,000. Today."

You need to deliver a line that:
- ON THE SURFACE means: "This object is not available for purchase."
- BUT ACTUALLY conveys: "I am defined by what I refuse to give up."
- USING the technique: DEFLECTION (refuse the explicit transaction, 
  do not engage the emotional pressure)
- WITH voice: clipped, monosyllabic-when-stressed, formal

Produce one line, ≤8 words.
```

The LLM produces "Not for sale." or "It's not." or "Not this." All pass. Subtext is *encoded in the prompt*, not validated after. Post-render validation becomes a redundancy check, not the primary mechanism.

This is the single biggest dialogue-quality improvement available, and it's a prompt-shape change, not new infrastructure.

---

## 5. Mechanism Definitions as Schema Files, Not Code

The Mechanism Compiler has 3 MVP mechanisms (Object Burden, Legitimacy Split, Relationship Externalization). Each is described in prose across the docs. Better: each is a JSON schema file the compiler auto-discovers.

```json
// mechanisms/object_burden.mech.json
{
  "id": "object_burden",
  "themeClaimTemplate": "What we hold preserves us / What we hold imprisons us",
  "physicalCarrier": {"type": "object", "required": true},
  "lifecycleStates": ["seeded", "activated", "helpful", "costly", "dangerous", "crisis", "transformed", "resolved"],
  "transitionRules": [
    {"from": "seeded", "to": "activated", "condition": "object_touched_by_non_owner"},
    {"from": "activated", "to": "helpful", "condition": "object_provides_unexpected_benefit"},
    {"from": "helpful", "to": "costly", "condition": "object_requires_owner_to_sacrifice"},
    // ...
  ],
  "climaxProofPredicate": "owner_must_choose: keep | release | reframe | transfer",
  "endingProofPredicate": "object_meaning_changed_across_acts",
  "invariants": [
    "central_object_changes_meaning_across_acts",
    "climax_forces_choice"
  ]
}
```

Compiler auto-loads `mechanisms/*.mech.json`. Adding a new mechanism = dropping a file. No code change. Same pattern as Claude Skills.

Grows from 3 → 30 mechanisms naturally over time. Each new file is testable independently.

---

## 6. The "What-Breaks-If-Removed" Query Is Already Free

With event-sourced `StoryCommit` + StoryOps + proof traces, this query is mechanical:

```ts
const whatBreaksIfRemoved = (commitId: CommitID, state: NarrativeState) => {
  const proposedState = state.withoutCommit(commitId);
  const downstreamCommits = state.commitsAfter(commitId);
  
  const broken = [];
  for (const downstream of downstreamCommits) {
    const proofResults = runAllProofs(downstream, proposedState);
    for (const [proofType, result] of Object.entries(proofResults)) {
      if (!result.pass) {
        broken.push({commit: downstream.id, proof: proofType, reason: result.reason});
      }
    }
  }
  return broken;
};
```

No new architecture. The cockpit calls this on hover over any scene. The "killer feature" is ~30 lines.

---

## 7. Personal Learning: Skip the LoRA

The completion doc proposes per-writer LoRA / adapter fine-tuning. Too heavy for v1.

**Clever fix**: per-writer few-shot example bank.

```ts
interface WriterProfile {
  acceptedExamples: GeneratedLine[];   // writer kept these
  editedExamples: {before: string, after: string}[];  // writer changed these
  rejectedExamples: GeneratedLine[];   // writer threw these out
}

// When generating, inject top-K relevant examples:
const buildPersonalizedPrompt = (basePrompt, ctx, writerProfile) => {
  const relevant = retrieveSimilarExamples(ctx, writerProfile, k=8);
  return `
    Here are 8 examples of what this writer prefers (accepted) vs what they rejected:
    ${formatExamples(relevant)}
    
    Now: ${basePrompt}
  `;
};
```

In-context learning matches LoRA fine-tuning on style transfer up to ~1000 examples. By the time you have >1000 rated examples per writer, you'll know which writers are valuable enough to justify training. Until then, it's a SQL query, not a GPU job.

---

## 8. The Voice Differentiation Metric: Burrows's Delta

The completion doc wants stylometric distance between characters. No need for deep models.

**Burrows's Delta** (1990s technique, embarrassingly effective):
1. Compute frequency of each of the ~50 most common function words in each character's lines.
2. Z-score normalize each frequency against the corpus mean.
3. Distance between two characters = mean absolute difference of z-scores.

```python
def burrows_delta(char_a_lines, char_b_lines, function_words):
    freqs_a = wordfreqs(char_a_lines, function_words)
    freqs_b = wordfreqs(char_b_lines, function_words)
    mean = wordfreqs(all_lines, function_words)
    std = wordstd(all_lines, function_words)
    z_a = (freqs_a - mean) / std
    z_b = (freqs_b - mean) / std
    return np.mean(np.abs(z_a - z_b))
```

~30 lines of Python. No training, no embeddings, no inference cost. Detects voice convergence within ~3 scenes of dialogue per character. Industry standard for authorship attribution. Better than 90% of "voice differentiation metrics" that use deep models.

Fire `VOICE_DIFFERENTIATION` pacing hint when delta drops below 0.7 between any two main characters for 3 consecutive scenes.

---

## 9. The Specificity Engine in 50 Lines

The biggest single quality lever in the entire architecture, per the previous docs. Here's the actual implementation:

```ts
// 1. Precompute the generic-cluster centroid (one-time, offline):
const genericLines = [
  "Are you okay?", "I love you.", "I don't know what to do.", 
  "We need to talk.", "I'm sorry.", "Thanks for everything.",
  // ... ~500 of the most generic screenplay lines you can find
];
const genericCentroid = mean(genericLines.map(embed));
fs.writeFileSync('generic_centroid.json', JSON.stringify(genericCentroid));

// 2. At runtime, per generated line:
const specificityScore = async (line: string) => {
  const lineVec = await embed(line);
  const distance = cosineDistance(lineVec, genericCentroid);
  return distance; // higher = more specific
};

// 3. Specificity proof:
const SPECIFICITY_THRESHOLD = 0.35; // calibrated against reference-film corpus

const specificityProof = async (turn: DialogueTurnIR) => {
  const score = await specificityScore(turn.surfaceLine);
  return {
    pass: score > SPECIFICITY_THRESHOLD,
    score,
    repair: score < SPECIFICITY_THRESHOLD 
      ? `Regenerate with at least one specific concrete detail (proper noun, brand, sensory specific, named gesture).`
      : null
  };
};
```

Calibration: take your reference-film corpus's transcripts, run all dialogue through. The 25th percentile of corpus dialogue is your threshold (below this, "even the corpus would reject it"). Calibrate per-genre (genre-specific centroids — a noir line "the rain was wet" might be specific for noir but generic for romcom).

This is the entire engine. ~50 lines. Highest leverage upgrade in the system.

---

## 10. The Necessity Engine: It's a Form, Not a Judge

Stop trying to "validate that the answers are good." Just require that *some* specific answers exist:

```ts
interface NecessityCertificate {
  whyNow: string;      // required, ≥10 chars, must reference a time-specific event
  whyHere: string;     // required, ≥10 chars, must reference a location-specific feature
  whyThem: string;     // required, ≥10 chars, must reference a character-specific attribute
  forcingFunction: string;  // required, ≥10 chars, must describe a specific triggering event
}

const necessityProof = (cert: NecessityCertificate) => ({
  pass: Object.values(cert).every(v => v?.length >= 10),
  missing: Object.entries(cert).filter(([k, v]) => !v || v.length < 10).map(([k]) => k),
});
```

That's it. The engine asks the writer once at outline time. Stores the answers. Audits that they exist and are non-trivial. Doesn't try to LLM-judge "is this a good reason?"

If the writer puts garbage in, the writer's project produces garbage out. The engine's job is to enforce that *some* answer exists, which is enough to catch the 90% case where a writer skips the question entirely. Don't optimize the 10% case where the writer answers thoughtfully but wrongly — that's not the engine's failure mode.

---

## 11. Cost-Aware Model Routing

Most calls don't need Sonnet. A single wrapper:

```ts
const callLLM = async (purpose: PurposeTag, prompt: string) => {
  const modelMap = {
    'tactic_selection': 'claude-haiku-4-5',
    'belief_update': 'claude-haiku-4-5',
    'memory_importance': 'claude-haiku-4-5',
    'audience_prediction': 'claude-haiku-4-5',
    'subtext_generation': 'claude-sonnet-4-6',
    'dialogue_rendering': 'claude-sonnet-4-6',
    'dramaturge_review': 'claude-sonnet-4-6',
    'judge_eval': 'claude-sonnet-4-6',
  };
  const model = modelMap[purpose] ?? 'claude-haiku-4-5';
  const result = await anthropic.complete({model, prompt});
  await logCost(purpose, model, result.usage);
  return result;
};
```

Every call is tagged. Track per-purpose accuracy via the regression suite. If Haiku-for-belief-update produces drift on reference-film regression, promote that purpose to Sonnet. Until then, save 10x.

Real cost target per 6-scene short: <$0.50.

---

## 12. The xMemory Hierarchy Without xMemory

The completion doc proposes xMemory's 4-level hierarchy (raw / episodes / semantics / themes). The xMemory paper's specific algorithms aren't required. The hierarchy is:

```ts
interface MemoryHierarchy {
  raw: MemoryEntry[];                        // every observation, fast write
  episodes: EpisodeSummary[];                // 5-turn rollups, written by reflection
  semantics: SemanticFact[];                 // distilled persistent facts, every 5 turns
  themes: ThemeMemory[];                     // long-range pattern memories
}

// Retrieval = top-down with budget:
const xMemoryRetrieve = (query, agent, budget=2000_tokens) => {
  const themes = topK(agent.memory.themes, query, 2);
  const semantics = topK(agent.memory.semantics, query, 5, exclude=themes);
  const episodes = topK(agent.memory.episodes, query, 3, exclude=themes+semantics);
  const raw = topK(agent.memory.raw, query, 5, exclude=above);
  return budgetTrim([themes, semantics, episodes, raw], budget);
};
```

Use `pgvector` for the embedding lookups. No new memory library. ~150 lines total.

---

## 13. The Causal Plot Graph in 60 Lines

The R² causal plot graph from the continuation docs sounds heavy. It's not:

```ts
// After each StoryCommit:
const updateCausalGraph = (commit: StoryCommit, prevCommits: StoryCommit[], graph: CausalGraph) => {
  for (const event of commit.events) {
    // Heuristic: find the most recent 3 events that could causally lead here
    const candidates = lastN(prevCommits.flatMap(c => c.events), 10);
    for (const candidate of candidates) {
      const edgeType = inferCausalRelation(candidate, event); // 'enables' | 'triggers' | 'motivates' | null
      if (edgeType) graph.addEdge(candidate.id, event.id, edgeType);
    }
  }
  // Every 5 scenes: LLM pass to validate/repair edges
  if (commit.sceneIdx % 5 === 0) await llmRefineGraph(graph);
};
```

`inferCausalRelation` is a 30-line rule-set: does candidate's effect predicate match event's precondition? Does candidate's actor match event's actor with motive? Does the time gap fit? Sliding-window heuristic + LLM refinement = good enough.

For cycle-breaking: standard DFS, mark back-edges, remove the lowest-confidence edge in the cycle.

---

## 14. Reveal Readiness as One Number

The Reveal Engine specifies "prestige readiness" as a composite score. The components keep multiplying across docs. Clever simplification:

```ts
const revealReadiness = (revealPlan: RevealPlan, state: NarrativeState) => {
  const planted = revealPlan.clueEcology.filter(c => c.placed).length / revealPlan.clueEcology.length;
  const audience = audienceModel(state, [revealPlan.hiddenTruth]).probability;  // 0-1
  const cooldown = scenesSinceLastReveal(state) / 5;  // 0-1, max at 5+ scenes
  
  // Sweet spot is high planted (>0.6), audience expectation 0.4-0.7, sufficient cooldown
  const sweetSpotPenalty = Math.abs(audience - 0.55) * 2; // 0 at sweet, ~1 at extremes
  
  return planted * 0.5 + (1 - sweetSpotPenalty) * 0.3 + Math.min(cooldown, 1) * 0.2;
};
// > 0.7 → ready to reveal
// 0.4-0.7 → almost
// < 0.4 → need more setup
```

Three terms, all queryable. Done.

---

## 15. The Reference-Film Regression Suite, Concretely

The previous docs say "run engine against a reference-film corpus, check it recovers ground truth." Here's how:

For each film in your chosen corpus, create a `regression/<film_id>.ground_truth.json`:

```json
{
  "film": "<film_id>",
  "central_mechanism": "object_burden",
  "physical_carrier": "<carrier_object>",
  "wound": "<wound_description>",
  "false_dream": "<false_dream_description>",
  "companion": {"character": "<companion_id>", "function": "wound_mirror"},
  "antagonist_function": "dark_mirror",
  "antagonist_character": "<antagonist_id>",
  "climax_proof": "<climax_action_that_proves_arc>",
  "ending_proof": "<final_state_that_proves_theme>",
  "key_beats": [
    {"page_range": "1-4", "function": "theme_injection"},
    {"page_range": "10-14", "function": "emotional_compression"},
    {"page_range": "48-52", "function": "silent_climax"}
  ],
  "central_law_trace": "theme(...) → mechanism(...) → rule(...) → object(...) → cost(...) → witness(...) → proof(...) → scene(...)"
}
```

Test harness:
```ts
const testFilmRegression = async (film: GroundTruth) => {
  const transcript = readFountain(`corpus/${film.film}.fountain`);
  const reverseEngine = await runReverseEngine(transcript);
  
  return {
    mechanism_correct: reverseEngine.central_mechanism === film.central_mechanism,
    carrier_correct: reverseEngine.physical_carrier === film.physical_carrier,
    arc_recovered: arcMatch(reverseEngine.arc, film) > 0.8,
    beats_recovered: beatRecall(reverseEngine.beats, film.key_beats) > 0.7,
  };
};
```

N films × 4 metrics = 4N boolean checks. CI passes if ≥80% pass. Improves over time.

The .docx reverse-engineerings in the archive demonstrate the *analytical pattern* (mechanism / wound / false_dream / companion / antagonist / climax_proof / ending_proof / key_beats / central_law_trace). They are not the production corpus. Pick a clean-IP corpus to actually run against: public-domain shorts, original-IP screenplays you own, or licensed reference scripts.

---

## 16. The Build-vs-Buy Decisions

Don't build what already exists:

| Capability | Library | Why |
|---|---|---|
| Embeddings | `text-embedding-3-small` (OpenAI) or `voyage-3` | Cheap, fast, well-calibrated. Don't fine-tune. |
| Vector storage | `pgvector` on Postgres | One DB. ACID + vectors. No Pinecone/Qdrant in v1. |
| Graph queries | Apache AGE on Postgres OR recursive CTEs | One DB. Graph DB only if profiling demands. |
| Stylometry | `spacy` + `nltk` + 30 lines of numpy | Burrows's Delta is 30 lines. |
| ASP constraints | `clingo` via `python-clingo` | Industry standard. Don't write a constraint solver. |
| Temporal facts | Custom on Postgres with `tstzrange` | Built-in temporal range type. Use it. |
| Memory hierarchy | Custom on pgvector | xMemory is a hierarchy + retrieval rule, not a library you import. |
| Prompt management | `promptfoo` or custom YAML | Versioned prompts, A/B testing built in. |
| Cost telemetry | `langfuse` or custom rows | Per-call cost + latency + model rows. Don't reinvent. |
| Fountain parser | `fountain-js` | Don't write a Fountain parser. |
| Screenplay export | `pandoc` for many formats; FDX via fountain → FDX converter | Off-the-shelf. |
| Testing | `vitest` + `playwright` (cockpit) | Standard. |
| Image generation (storyboards) | `stable-diffusion-xl` API or Midjourney/DALL-E | Optional. Don't build. |
| TTS (read-aloud mode) | ElevenLabs API | Best voice cloning. Don't roll your own. |
| Audio analysis (if Suno integration) | `librosa` | Standard. |

Don't add Neo4j unless graph traversal becomes profiled bottleneck. Don't add Mem0 unless your custom xMemory underperforms. Don't add Qdrant unless pgvector is the bottleneck. Each new infra dependency is a future migration cost.

---

## 17. Research Probes Actually Worth Running

These are genuine experiments where the answer affects design decisions. Run them in Week 2-3:

**Probe 1 — Specificity threshold calibration.**
Run all dialogue from your reference-film corpus through `specificityScore`. Plot the distribution. The 25th percentile is your hard threshold (below this, even canonical screenplays would cut it). The median is your "good" threshold. The 75th is your "corpus-quality" threshold. Cost: ~$5 in API calls.

**Probe 2 — Voice differentiation sample size.**
How many lines of dialogue does Burrows's Delta need before it reliably distinguishes two characters? Sample size grows the matrix. Use your reference-film corpus: take 5/10/20/40/80 lines per character, measure detection accuracy on held-out lines. Find the elbow. Use that as the "voice can be measured" threshold in the Cockpit.

**Probe 3 — Audience model accuracy.**
Generate 20 short scenes. Have the audience-model service predict the "audience expectation" of the next event. Have 5 humans actually rate audience expectation. Compute Spearman correlation. If r > 0.6, the audience model is trustworthy. If not, swap to a different prompt or model.

**Probe 4 — Subtext pre-generation vs post-validation.**
A/B test: same scene, run dialogue generation with (a) free-form prompt + post-validation, (b) pre-generated subtext pair + constrained prompt. Human-rate which produces better subtext on 10 paired scenes. Use the winner.

**Probe 5 — Reference-film regression baseline.**
Before any tuning, run the engine on the 7 films cold. Record baseline numbers. This is your starting line. Every upgrade gets measured against this.

**Probe 6 — Mechanism schema coverage.**
Take 30 random feature films from outside your regression corpus. For each, try to express its central mechanism in one of the 3 MVP schemas (Object Burden / Legitimacy Split / Relationship Externalization). What percentage fit cleanly? What patterns appear in the misses? This tells you which mechanism schemas to add next.

**Probe 7 — Cheap proof vs LLM proof divergence.**
For the proofs that have both a deterministic version and could be replaced with an LLM judge (e.g., SubtextProof, EmotionProof), compare. Where do they disagree? In the disagreements, who's right (vs a human rater)? Decide where to spend LLM cycles.

Each probe is <1 day of work and produces real numbers that resolve design decisions the docs currently hand-wave.

---

## 18. The Sidecar JSON Schema, Locked Down

The architecture says "sidecar has line-level annotations." The schema isn't locked. Lock it now:

```ts
interface SceneAnnotationSidecar {
  sceneId: SceneID;
  version: "1.0";
  
  scene: {
    activeMechanisms: MechanismID[];
    sceneFunction: SceneFunction;
    nucleusBeat: BeatID;
    proofs: { [proofType: string]: ProofResult };
    stateDelta: StatePatch;
  };
  
  lines: {
    lineId: string;
    speakerId?: CharacterID;
    surface: string;
    hiddenIntent: string;
    tactic: DialogueTactic;
    explicitMeaning: string;
    subtextMeaning: string;
    subtextTechnique: SubtextTechnique;
    activeMechanism: MechanismID;
    voiceProfileMatch: number;
    specificityScore: number;
    stateDelta: Partial<StatePatch>;
    proofs: { [proofType: string]: boolean };
    provenance: {
      origin: "user_authored" | "model_generated" | "model_rewritten" | "model_edited_by_user";
      model?: string;
      prompt?: string;
      cost?: number;
      timestamp: string;
    };
    causalLinks: {
      enabledBy: LineID[];
      enables: LineID[];
    };
  }[];
  
  diagnostics: DiagnosticFinding[];
}
```

Every Cockpit panel reads from this. Every export format renders from this. Every future plugin extends this. Lock the v1.0 schema, version subsequent changes.

---

## 19. The Single Most Underused Theory: Propp's Morphology

The archive cites Propp once in passing. Propp identified 31 *functions* and 7 *character archetypes* that account for ~95% of folktale structure. They map cleanly to screenwriting:

- 31 functions = a beat-template library, ready to use
- 7 archetypes (Hero, Villain, Donor, Helper, Princess, Dispatcher, False Hero) = role-tag enum for characters

Clever move: add `proppFunction` and `proppArchetype` as optional fields on Beat and Character. Auto-fill from BDI goal + scene function. Use as features in the genre classifier and ASP constraint solver.

5-hour add. Surprisingly powerful for plot-structure detection.

---

## 20. The Lawful Defaults

Last clever move: every Module's default behavior should be "do nothing surprising." Surprise is the writer's job. The Module's job is to refuse the obvious failures.

This means:
- Drama Manager: default to no intervention. Inject only when a Tier 1 proof fails or pacing alert fires.
- Specificity: default to acceptance. Reject only when score < threshold.
- Voice: default to acceptance. Flag only when divergence drops below 0.7 for 3 scenes.
- Reincorporation: default to no nag. Alert only when Act 3 reincorporation density < 70%.
- Theme: default to no nag. Alert only when premise-counter-premise balance > 0.7 either way mid-Act-2.

Most of the time, every module returns `pass: true, no_action`. The signal is the alerts, not the volume. Writer trust = the engine shuts up unless something is wrong.

---

## 21. The Three Things to Code This Week

If you have the repo and want momentum, the highest-leverage three:

**A. The Specificity Engine** (§9). ~50 lines + a one-time centroid build. Immediate dialogue quality lift on every scene.

**B. The 10 Dialogue Validators** (§3). ~70 lines. Plug into the Dialogue Compiler. Every output gets the validation chain. Cheap, fast, catches most generic failures.

**C. The Reference-Film Regression JSON files** (§15). 5-10 small JSON files following the schema shown above, populated against your chosen clean-IP corpus. (The .docx files in the workspace demonstrate the analytical pattern; pick your own corpus to actually run against.) Zero new code. Gives you a measurable baseline against which every future change gets scored.

Three days of work. Sets the quality floor and the measurement baseline for everything else.

---

## 22. The Frame Going Forward

The architecture is settled. The gaps that remain are mostly calibration questions (thresholds, weights, model choices) and operationalization questions (how exactly does this proof check). Both classes are answered by:

1. **Pick the cheapest implementation that could possibly work.**
2. **Calibrate against the reference-film regression suite.**
3. **Measure cost and accuracy per change.**
4. **Promote to a more expensive technique only when measurement demands.**

Most "engines" are views, not services. Most "proofs" are predicates, not LLM judges. Most "models" can be Haiku, not Sonnet. Most "memory systems" are pgvector queries, not new libraries. Most "personalization" is few-shot, not fine-tuning. Most "experiments" can be run in a day with $5 of API calls.

The cleverness is the discipline.

---

## 23. Adopt from the Clean Baseline Blueprint (Net-New)

A "strict baseline architecture" blueprint was pasted into the conversation that is ~90% restatement of the NVM hybrid plan but contributes eight specific items worth integrating verbatim. Each is additive — none replaces existing material.

### 23.1 `MemoryQuery` typed enum (8 query types)
Every memory call must declare its intent. No free-form retrieval. Constrains the retrieval surface and makes memory observable.

```ts
type MemoryQuery =
  | { type: "does_this_break_canon"; event: EventNode }
  | { type: "can_character_say_this"; characterId: CharacterID; line: string }
  | { type: "what_does_audience_know"; sceneId: SceneID }
  | { type: "is_reveal_earned"; revealId: RevealID }
  | { type: "what_relationship_debt_exists"; pair: [CharacterID, CharacterID] }
  | { type: "what_mechanism_is_active"; sceneId: SceneID }
  | { type: "what_object_meaning_is_active"; objectId: ObjectID }
  | { type: "what_memory_should_this_emotion_retrieve"; characterId: CharacterID; emotion: EmotionType };
```

Retrieval rule: *retrieve the minimum context needed to reduce uncertainty for the current proof.* Every query above maps to a specific proof or decision. No `retrieve_relevant_memories()` free-for-all. ~80 lines wiring this into xMemory.

### 23.2 Six routed knowledge stores
Replace "memory substrate" with six named stores with explicit routing. Each store has its own retrieval policy.

```
1. Temporal Fact Store        (objective_truth + lies + rumors + memories + predictions, with validity intervals)
2. Belief / Epistemic Store   (per-character belief layers + audience knowledge)
3. Character Mind Store       (BDI + voice + memory profile per character)
4. Relationship Store         (RelationshipState per dyad, including coalitions)
5. Mechanism Store            (active NarrativeMechanism objects with lifecycle states)
6. Reader State Store         (audience knowledge, suspense, curiosity, memory decay)
```

Memory queries route to one or more of the six. Provides clean isolation for testing, caching, and rate-limiting per store. ~150 lines of routing + a typed router interface.

### 23.3 Ten mechanism kinds (post-MVP roadmap)
The MVP has 3 mechanisms (Object Burden, Legitimacy Split, Relationship Externalization). The clean blueprint extends to 10. The other 7 become the Phase 2 expansion roadmap:

```ts
type MechanismKind =
  | "object_burden"               // Phase 1 (MVP)
  | "legitimacy_split"            // Phase 1 (MVP)
  | "relationship_externalization" // Phase 1 (MVP)
  | "ritual_law"                  // Phase 2: required objects/actions/participants/violations/costs explicit
  | "canon_rebellion"             // Phase 2: classify continuity break as accidental vs intentional moral resistance
  | "false_purpose"               // Phase 2: protagonist pursues a goal that turns out to be a defense
  | "clue_cascade"                // Phase 2: each set piece changes clue/possession/location/threat/inference state
  | "ability_psychology"          // Phase 2: ability traits map to psychological state
  | "identity_performance"        // Phase 2: public role vs private self diverge under pressure
  | "predatory_wish_trap";        // Phase 2: protagonist's desire turns out to be a snare
```

Each new mechanism gets its own `.mech.json` schema file (per §5 above). Adds a mechanism per week after MVP ships.

### 23.4 `ArcDebt` as first-class object
Drama Manager's "what's underfed?" question becomes a typed return value, not a heuristic LLM call.

```ts
interface ArcDebt {
  arcId: string;
  expectedProgressByNow: number;   // computed from outline pacing
  actualProgress: number;          // computed from StoryOps applied to this arc
  debt: number;                    // expectedProgressByNow - actualProgress

  risk:
    | "stagnant"        // no progress for N scenes
    | "overresolved"    // arc is resolved too early
    | "underpressured"  // arc is progressing but not under tension
    | "overcrowded"     // too many parallel arcs competing
    | "reader_forgetting" // memory-trace salience dropping
    | "theme_flattening"; // theme stated without enacted evidence
}
```

Drama Manager's `inspect()` returns `ArcDebt[]` directly. The Cockpit's "what's wrong?" panel renders these as colored badges per arc. ~40 lines.

### 23.5 `RelationshipRepairProof` with 8 typed repair actions
Make repair invariants measurable, not narrative.

```ts
interface RelationshipRepairProof {
  offender: CharacterID;
  harmed: CharacterID;

  repairAction:
    | "apology"
    | "truth_disclosure"
    | "public_defense"
    | "private_care"
    | "sacrifice"
    | "behavior_change"
    | "shared_risk"
    | "object_gesture";

  costPaid: ChoiceCost;
  harmAcknowledged: boolean;
  changedBehaviorEvidence: EventID[];
  harmedCharacterReceivesIt: boolean;

  residualResentment: number;   // 0-1, never reaches 0 without time
  trustRecovered: number;        // 0-1, may not exceed pre-rupture trust
}
```

`RelationshipProof` (Tier 2) checks the 4-predicate AND (harmAcknowledged ∧ costPaid > threshold ∧ changedBehaviorEvidence.length ≥ 1 ∧ harmedCharacterReceivesIt). If all four, the repair commits; `trustRecovered` is computed proportional to `costPaid`. ~50 lines.

### 23.6 REST API endpoint blueprint
Lock the API surface now so the Cockpit and SDK can be built against stable contracts. The blueprint provides:

```http
# Story lifecycle
POST   /stories
GET    /stories/:storyId
PATCH  /stories/:storyId
DELETE /stories/:storyId

# Canon & commits
GET    /stories/:storyId/commits
GET    /stories/:storyId/commits/:commitId
POST   /stories/:storyId/changesets
POST   /stories/:storyId/changesets/:id/test
POST   /stories/:storyId/changesets/:id/commit
POST   /stories/:storyId/changesets/:id/revert

# State
GET    /stories/:storyId/state
GET    /stories/:storyId/state/{facts|beliefs|relationships|mechanisms|reveals|theme}

# Generation
POST   /stories/:storyId/pressures/scan
POST   /stories/:storyId/decisions
POST   /stories/:storyId/candidates
POST   /stories/:storyId/candidates/:id/prove
POST   /stories/:storyId/candidates/:id/render

# Scenes
POST   /stories/:storyId/scenes
GET    /stories/:storyId/scenes/:sceneId
PATCH  /stories/:storyId/scenes/:sceneId
POST   /stories/:storyId/scenes/:sceneId/test
POST   /stories/:storyId/scenes/:sceneId/rewrite

# Diagnostics
GET    /stories/:storyId/diagnostics
GET    /stories/:storyId/diagnostics/{regressions|reveal-readiness|mechanism-integrity|dialogue}

# Export
POST   /stories/:storyId/export/{fountain|pdf|sidecar|fdx|highland}
```

Adopt verbatim. Maps cleanly onto a REST framework of choice (FastAPI, NestJS, Hono). Validates against the Cockpit's needs in Stage 21.

### 23.7 LLM role separation (the cleanest articulation of the boundary discipline)
Six LLM roles + seven typed-code roles. Every prompt is tagged with one of six purposes.

```
LLM roles (boundary):
  proposer    — generates candidate transitions
  extractor   — pulls facts/beliefs/structure from prose
  critic      — judges quality / detects issues
  repairer    — fixes failed candidates
  renderer    — produces final prose / Fountain
  summarizer  — condenses for memory / context

Typed-code roles (substrate):
  store     — persists state
  diff      — computes deltas
  validate  — runs predicates
  prove     — runs proof kernel
  commit    — atomically applies a StoryCommit
  regress   — runs regression suite
  export    — produces output artifacts
```

Combine with §11 (model routing): each LLM role tagged → routed to appropriate model (Haiku for extractor/summarizer; Sonnet for proposer/critic/repairer/renderer). Cost telemetry per role. Failure isolation per role. ~30 lines of dispatch logic.

### 23.8 The strict 15-phase implementation with explicit exit gates
Replace the loose 8-week milestone framing with the clean blueprint's gated phases:

| Phase | What ships | Exit gate (must pass before next phase) |
|---|---|---|
| 0 — Architecture freeze | Canonical terminology, type definitions, module contracts, proof vocabulary, diagnostic vocabulary | All modules use the same IDs, state objects, proof objects, diagnostic format |
| 1 — State Kernel | NarrativeState, AtomicFact, BeliefGraph, CharacterMind, RelationshipState, NarrativeMechanism, ObjectStateArc, RevealPlan, ThemeGraph, ReaderState | A story can exist as typed state without prose |
| 2 — Canon Ledger | StoryCommit, StoryChangeSet, StatePatch, diff, rollback, branch, commit | System can remove a scene and report changed facts/beliefs/relationships/reveals/broken dependencies |
| 3 — StoryOps + Proof Tier 1 | StoryOps, ExecutableTransition, Temporal/Causal/Intentional/Mechanism/Provenance proofs | A bad beat fails before screenplay rendering |
| 4 — Mechanism MVP | Object Burden, Legitimacy Split, Relationship Externalization | Given a premise, system produces mechanism + rules + costs + escalation + climax/ending proofs |
| 5 — Character/Relationship/Emotion | CharacterMind, Goal/Fear/Wound, EmotionAppraisal, RelationshipState, RelationshipRepairProof | System can explain why a character acts or speaks |
| 6 — Drama Manager + Decision Council | ModulePressure, StoryPressure, ArcDebt, StoryDecision, rejected options, risk profile | System can select next pressure and explain why alternatives were rejected |
| 7 — Candidate Search | Generator, StoryOp compiler, proof loop, repair loop, QD portfolio, genericness vector | System returns valid alternatives that differ meaningfully |
| 8 — Reveal/Theme/Reader | RevealPlan, ClueEcology, ThemeArgumentGraph, ReaderState, ReaderMemoryTrace | System detects cheap twists, slogan themes, reader overload |
| 9 — Scene Planner + Spatial | ScenePlan, SceneSpace, sightlines/occlusions/sound zones/camera, spatial proof | System blocks impossible knowledge from sightline/sound violations |
| 10 — Dialogue/Action Compiler | DialogueExchangeIR, DialogueTurnIR, DialogueActionBeat, SubtextGap, VoiceSpecificity, DialogueProof | A polished but state-neutral line is cut or repaired |
| 11 — Screenplay Compiler | Clean Fountain renderer, annotated renderer, debug renderer, sidecar annotations | Clean screenplay contains no hidden diagnostics |
| 12 — Narrative CI/CD | Changesets, regression tests, what-breaks-if-removed, diagnostic reports, repair suggestions | Editing Scene N can flag broken payoff in Scene M |
| 13 — ScriptIDE | Editor, proof panels, candidate portfolio, diagnostics, inspectors | Writer can edit, test, compare alternatives, commit |
| 14 — Data + Benchmarks | Functional annotation format, synthetic benchmark factory, evaluation dashboard | Can measure improvement across versions |
| 15 — Production hardening | Auth, rate limits, job queues, observability, billing hooks, permissioning, artifact export, backup/restore | API can run production workloads safely |

Each phase has a binary exit gate. No phase begins until prior phase's exit gate passes in CI. This replaces the looser "Week 0 → Week 8" framing with explicit acceptance criteria per phase. Maps cleanly onto the 8-week roadmap (phases 0–11 fit in the 8 weeks; phases 12–15 are post-MVP hardening).

### 23.9 The strict operating rule (the law)
The clean blueprint also states the operating rule more sharply than my prior versions:

> *No generated scene becomes canon until it has: (1) a typed state transition, (2) explicit causal and character-intention proof, (3) relationship/emotion/belief updates, (4) mechanism operation, (5) screenplay render, (6) diagnostics, (7) author approval.*

This is the seven-step commit gate. Worth pinning as the literal acceptance contract in the codebase (a comment at the top of `commit.ts`, a paragraph in the README).

---

These nine additions integrate cleanly with the rest of the architecture. None replaces anything. Each is a 30-150 line addition to the codebase. Combined: ~2-3 days of work, but they sharpen the entire system's contract surface.

---

*Read with the other five companion docs. This is the upgrade-list version — every entry maps to a concrete code change.*
