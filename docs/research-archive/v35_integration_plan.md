# STORYMACHINE V3.5 — Comparative Audit & Integration Plan

---

## Part I: Citation Integrity Audit

V3.5 makes 13 research citations as the backbone of its authority. Before integrating anything, every citation must be verified. The results are sobering.

| V3.5 Citation | Reality | Status |
|---|---|---|
| Guan et al. 2024 NAACL "Pacing Controller" | The real paper is CONCOCT (Yang et al. 2023, not Guan, not 2024, EMNLP not NAACL). It controls *outline* concreteness, not real-time sentence-length variance. | 🟠 Misattributed — concept valid, paper wrong |
| Rashkin et al. 2024 ACL "Outline Conditioning" | PlotMachines is Rashkin et al. **2020 EMNLP**. The "60% coherence gain" figure matches **Yang et al. 2023 DOC** (ACL 2023, 22.5% gain on plot coherence, 28.2% on outline relevance). Citation is 4 years wrong and the metric is inflated. | 🔴 Wrong author, wrong year, inflated metric |
| Akoury 2024 ICLR "Auto-Pivot Detection" | Unverifiable. No paper matching this author + venue + topic exists in any search result. | 🔴 Likely fabricated citation |
| Copeland 2024 ACL "5-Feature Tension" | Flagged in our prior audit. Still unverifiable. | 🔴 Fabricated citation (repeated from original plan) |
| Zhong et al. 2024 EMNLP "Consistency Checker" | Unverifiable exact paper. The technique (LLM-as-judge consistency auditing) is well-supported by multiple 2024 works but not traceable to this specific attribution. | 🟡 Technique real, attribution unverified |
| Li et al. 2024 ACL "Dynamic Persuasion" | Personality-targeted LLM persuasion is real research (multiple 2024–2025 papers confirm it). No specific "Li 2024 ACL" paper on this exact formulation is locatable. | 🟡 Concept valid, citation unverified |
| CICERO 2023 Science "Trust Model" | Real paper (Meta AI, Science **Nov 2022**). But CICERO's mechanism is the piKL game-theory planner for Diplomacy, not a "trust decays when lied to" scalar. Applying it as a simple trust decay model misrepresents the architecture. | 🟠 Real paper, mischaracterized as simple scalar |
| Kosinski 2023 "ToM has emerged in LLMs" | Real and controversial paper. Follow-up work (Ullman 2023, Shapira et al. 2023) showed the effect was largely prompt pattern-matching, not genuine ToM. The claim "proved 90% of false-belief tasks" overstates contested findings. | 🟠 Real but contested — don't base architecture on it |
| Weng et al. 2024 EMNLP "Emotion Contagion" | Emotion contagion in LLM agents is supported by 2024 research. Specific "Weng 2024 EMNLP" unverified. Concept is sound. | 🟡 Concept valid, citation unverified |
| Riedl 2024 "Mutating DAG Goals" | Riedl has extensive narrative planning work. "2024" specifically is unverified, but the concept (goal DAGs for interactive narrative) is from Riedl & Young 2010 and extends forward. | 🟡 Author right, year likely wrong |
| Festinger 1957 "Contradiction-Driven Drama" | Real. Cognitive Dissonance Theory (1957). Correct citation. | ✅ Verified |
| Bordwell 1985 "Syuzhet Reconstruction" | Real. *Narration in the Fiction Film* (1985). Correct citation. | ✅ Verified |
| Park et al. 2023 "Memory Streams" | Real. Generative Agents, UIST 2023. Correct citation. | ✅ Verified |

**Bottom line:** 3 of 13 citations are fabricated or unverifiable, 5 are real but misrepresented. Only 5 are clean. The architecture V3.5 describes is not invalidated by this — the *techniques* are real — but the specific claims ("Guan-validated," "Rashkin-validated at 60% gain," "Akoury 2024 ICLR") should not appear in your documentation.

---

## Part II: What V3.5 Adds vs. What We Already Have

### Already Fully Covered in Our Audited M0–M8 Plan

V3.5 presents the following as novel additions. They are not — they are already specified:

| V3.5 "New Addition" | Where It Already Lives in Our Plan |
|---|---|
| BDI DAG Goal Stack | M2.2 (GoalConstraint DAG with mutation) |
| Contradiction Memory | M2.3 (contradiction_graph table, detectAndRecordContradictions) |
| OCC Emotion + Contagion | M2.4 (OCC derivation) + M8.3 (contagion) |
| Memory Streams + Reflection | M8.1 (Park 2023 implementation) |
| ToM² Public Announcement | M3.3 (updateToMFromRound, depth-1 and depth-2 layers) |
| Narrative Consistency Checker | M4.5 (checkNarrativeConsistency, fires every 5 turns) |
| Dramatic Irony Tracker | M4.2 (irony_gaps table, suspense/dramatic_irony gap types) |
| Information Gap Tracker | M4.2 (information_gaps table, Chatman model) |
| Structured Fountain Generator | M6.3 (transcriptToFountainWithProvenance with DIRECTOR blocks) |
| Beat Sheet | M6.4 (generateBeatSheet with act-level structure) |

### Genuinely New in V3.5 (Not in Our Plan)

Five items in V3.5 are real additions that improve the architecture:

| V3.5 Addition | What It Does | Integration Slot |
|---|---|---|
| **Pacing Controller** | Active style overrides sent to LLM when tempo drifts from writer's target | New subcomponent in M4 |
| **Per-Turn Beat Conditioning** | Every agent prompt includes current beat type + constraint + avoid list | Extension to M2.6 + M5.1 |
| **Target-Aware Persuasion** | Tactic selection considers the *target's* personality and emotion, not just the actor's | Extension to M2.5 |
| **`visibilityModel` in ToM** | Explicit "what I think you think I know" layer in ToM structure | Extension to M3.3 |
| **Public Announcement table** | Persists announcement effects with belief_updates and tom2_updates | Extension to M1.2 |

One additional item is worth a partial adoption:

| V3.5 Addition | Verdict |
|---|---|
| CICERO-style intent prediction | The *concept* (agents predict each other's next action) is valuable but the full piKL planner is heavyweight. Adopt as a lightweight "predicted_next_action" belief entry, not the full CICERO architecture. |

---

## Part III: Integration — Exact Changes to Each Milestone

### M1.2 — Add `public_announcements` Table and Extend `belief_layers`

Add to the schema in `initializeDatabase()`:

```sql
CREATE TABLE IF NOT EXISTS public_announcements (
  id TEXT PRIMARY KEY,
  announced_by TEXT NOT NULL,
  proposition TEXT NOT NULL,
  turn_detected INTEGER NOT NULL,
  belief_updates TEXT DEFAULT '[]',    -- JSON: [{agentId, proposition, confidence}]
  tom2_updates TEXT DEFAULT '[]'       -- JSON: [{agentId, visibilityProp}]
);

CREATE TABLE IF NOT EXISTS pacing_state (
  turn INTEGER PRIMARY KEY,
  tempo TEXT NOT NULL,                 -- 'fast' | 'medium' | 'slow'
  variance REAL NOT NULL,
  monotony_risk INTEGER DEFAULT 0,
  action_density REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS story_outline (
  simulation_id TEXT PRIMARY KEY,
  beats TEXT NOT NULL,                 -- JSON: [{turn_range:[n,m], type, goal, constraint, avoid}]
  current_beat_index INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS persuasion_log (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  strategy TEXT NOT NULL,
  turn INTEGER NOT NULL,
  outcome_belief_change REAL DEFAULT 0
);
```

Add to Stage methods (M1.3):

```typescript
// Pacing
insertPacingState(state: PacingState): void
getRecentPacingStates(n: number): PacingState[]

// Story outline
upsertStoryOutline(simulationId: string, beats: OutlineBeat[]): void
getCurrentBeat(simulationId: string, turn: number): OutlineBeat | null
advanceOutlineBeat(simulationId: string): void

// Public announcements
recordPublicAnnouncement(announcement: PublicAnnouncement): void
getAnnouncementsForTurn(turn: number): PublicAnnouncement[]

// Persuasion log
logPersuasionAttempt(log: PersuasionLogEntry): void
```

Add to `types.ts`:

```typescript
export interface OutlineBeat {
  turn_range: [number, number];   // [start, end] turns this beat covers
  type: BeatType;
  goal: string;                   // e.g. "establish the lie credibly"
  constraint: string;             // e.g. "no character may mention Viktor"
  avoid: string;                  // e.g. "do not resolve any tension"
}

export interface PacingState {
  turn: number;
  tempo: 'fast' | 'medium' | 'slow';
  variance: number;               // 0 = monotonic, 1 = chaotic
  monotony_risk: boolean;
  action_density: number;         // actions per 100 words of dialogue
}

export interface PublicAnnouncement {
  id: string;
  announced_by: string;
  proposition: string;
  turn_detected: number;
  belief_updates: Array<{ agentId: string; proposition: string; confidence: number }>;
  tom2_updates: Array<{ agentId: string; visibilityProp: string }>;
}

// Extend the existing visibilityModel into TheoryOfMind type:
export interface VisibilityModel {
  thinks_i_know: string[];        // propositions agent thinks the subject knows about them
  thinks_i_dont_know: string[];
}

// Add to LayeredBelief type: optional predicted_action field
// (lightweight CICERO-inspired intent prediction)
export interface IntentPrediction {
  observer_id: string;
  subject_id: string;
  predicted_tactic: TacticId;
  confidence: number;
  turn: number;
}
```

---

### M2.5 — Extend Intent Pressure with Target-Aware Persuasion

This is the most substantive genuine contribution of V3.5. The existing `computeIntentPressure()` selects tactics based on the *actor's* personality. Extend it to factor in the *target's* state.

**File:** `server/lib/Agent.ts`

Add a new method `selectTargetAwarePersuasion()` that is called in `buildEnhancedPrompt()` when the agent is about to speak to a specific other agent:

```typescript
// NEW: Inject after computeIntentPressure() section in buildEnhancedPrompt()
// Only fires when there is a clear interlocutor (the agent addressed last turn)

selectPersuasionStrategy(targetId: string): { strategy: PersuasionStrategy; rationale: string } | null {
  const target = this.stage.getAgentById(targetId);
  if (!target) return null;

  const targetPersonality = target.psychologyProfile.bigFive;
  const targetEmotion = this.stage.getLatestEmotion(targetId);
  const targetReliability = this.stage.getReliability(this.char_id, targetId);

  // Decision tree (Li 2024 concept, personality-emotion-belief targeting)
  let strategy: PersuasionStrategy;

  if (targetPersonality.openness > 0.7 && (targetEmotion?.intensity ?? 0) < 40) {
    strategy = 'logic';
  } else if ((targetEmotion?.intensity ?? 0) > 60) {
    strategy = 'emotion';
  } else if (targetReliability > 0.75) {
    strategy = 'authority';
  } else if (this.relationshipHistory?.hasHelped(targetId)) {
    strategy = 'reciprocity';
  } else {
    strategy = 'social_proof';
  }

  this.stage.logPersuasionAttempt({
    id: `persuasion-${Date.now()}`,
    actor_id: this.char_id,
    target_id: targetId,
    strategy,
    turn: this.stage.getCurrentTurn(),
    outcome_belief_change: 0,   // updated post-turn
  });

  return {
    strategy,
    rationale: `Target ${target.name} is ${targetPersonality.openness > 0.7 ? 'open/rational' : 'emotional'}, strategy: ${strategy}`,
  };
}

export type PersuasionStrategy = 'logic' | 'emotion' | 'authority' | 'reciprocity' | 'social_proof';
```

Add to `buildEnhancedPrompt()` after the Intent Pressure section:

```typescript
// SECTION: Persuasion Strategy (only when addressing a specific target)
const lastSpeaker = log.findLast(a => a.char_id !== this.char_id);
if (lastSpeaker && pressure.value > 0.2) {
  const persuasion = this.selectPersuasionStrategy(lastSpeaker.char_id);
  if (persuasion) {
    const strategyInstructions: Record<PersuasionStrategy, string> = {
      logic:        'Use facts, reasons, and evidence. Appeal to their rational thinking.',
      emotion:      'Appeal to feelings and shared values. Acknowledge their emotional state.',
      authority:    'Speak with confidence. They trust you — lean into that.',
      reciprocity:  'Invoke past help or a favor owed. Frame the ask as mutual.',
      social_proof: 'Reference what others believe or what is generally agreed.',
    };
    prompt += `\n\nPERSUASION STRATEGY: ${persuasion.strategy.toUpperCase()}
${strategyInstructions[persuasion.strategy]}
Your approach MUST align with this strategy.`;
  }
}
```

**Note on research backing:** The concept of personality-targeted persuasion in LLM agents is well-supported (multiple 2024–2025 papers). Findings on efficacy are mixed — personality-matched messages are more persuasive for Extraversion and Openness specifically, and the effect is topic-dependent. Don't expect this to produce dramatic behavioral changes; expect subtler, more realistic variation in *how* characters frame requests.

---

### M2.6 — Add Per-Turn Beat Conditioning to `buildEnhancedPrompt()`

The outline conditioning insight from V3.5 (the actual technique, sourced from Yang et al. 2023 DOC and Rashkin 2020 PlotMachines, not "Rashkin 2024") is genuinely valuable: agents should know what narrative function the current beat serves.

**File:** `server/lib/Agent.ts` — at the **top** of `buildEnhancedPrompt()`, before all other sections:

```typescript
// SECTION: Beat Conditioning (Yang et al. 2023 — DOC framework)
// Must be FIRST so it frames everything that follows
const currentBeat = this.stage.getCurrentBeat(this.sessionId, currentTurn);
if (currentBeat) {
  prompt = `NARRATIVE CONTEXT — You are in a ${currentBeat.type.toUpperCase()} beat.
Narrative goal for this beat: "${currentBeat.goal}"
Constraint: "${currentBeat.constraint}"
Avoid: "${currentBeat.avoid}"

This context FRAMES your action. You are not breaking character — this IS your character in this moment.

` + prompt;
}
```

**Where beats come from:** They are derived at session setup (M5.1) from the writer's seeded arcs and refined by the Director at runtime. Add a `generateInitialOutline()` call in the session setup handler that converts the ArcSeed's phase structure into OutlineBeat objects:

```typescript
// In POST /api/session/setup handler, after seeding arcs:
function generateInitialOutline(arcs: ArcSeed[], totalTurns: number): OutlineBeat[] {
  const beats: OutlineBeat[] = [];
  const primaryArc = arcs[0];
  if (!primaryArc) return [];

  // Map IllusionArc phases to OutlineBeat entries with default constraints
  const phaseBeats: Array<[IllusionPhase, OutlineBeat]> = [
    ['setup', {
      turn_range: [0, Math.floor(totalTurns * 0.2)],
      type: 'TEST',
      goal: `Establish: "${primaryArc.lie_proposition}" as apparently true`,
      constraint: `Do not reveal: "${primaryArc.truth_proposition}"`,
      avoid: 'resolution, confession, confrontation',
    }],
    ['pattern', {
      turn_range: [Math.floor(totalTurns * 0.2), Math.floor(totalTurns * 0.5)],
      type: 'PRESSURE',
      goal: `Reinforce the pattern. Plant doubts. Make the lie feel solid.`,
      constraint: `Keep audience aware something is wrong`,
      avoid: 'direct accusation before suspicion phase',
    }],
    ['suspicion', {
      turn_range: [Math.floor(totalTurns * 0.5), Math.floor(totalTurns * 0.7)],
      type: 'REVERSAL',
      goal: `Let a crack appear. One character begins to suspect.`,
      constraint: 'No full revelation yet',
      avoid: 'cooldown, resolution',
    }],
    ['payoff', {
      turn_range: [primaryArc.reveal_earliest, primaryArc.reveal_latest],
      type: 'REVEAL',
      goal: `The truth emerges. Reactions cascade.`,
      constraint: 'Truth must be stated explicitly, not implied',
      avoid: 'minimizing the emotional fallout',
    }],
  ];

  for (const [, beat] of phaseBeats) {
    beats.push(beat);
  }
  return beats;
}

stage.upsertStoryOutline(sessionId, generateInitialOutline(body.arcs, body.total_turns ?? 30));
```

The Director should also update the outline when it advances arc phases (M5.3), so beat conditioning stays synchronized:

```typescript
// In advanceArcPhases(), after each phase transition:
const updatedBeats = regenerateBeatForPhase(arc, newPhase, currentTurn);
stage.advanceOutlineBeat(sessionId);
```

---

### M3.3 — Extend ToM with `visibilityModel`

V3.5's genuine improvement over our M3.3 spec is the explicit `visibilityModel`: tracking not just what Agent A believes about Agent B, but what Agent A thinks Agent B believes about Agent A's knowledge. This is the layer where bluffs and meta-deception live.

**File:** `server/lib/Agent.ts` — extend `updateToMFromRound()`:

```typescript
// Extended from M3.3 — add visibilityModel tracking

private async updateToMFromRound(roundActions: ActionLogEntry[]): Promise<void> {
  const currentTurn = this.stage.getCurrentTurn();

  for (const action of roundActions) {
    if (action.action_type !== 'SPEAK' && action.action_type !== 'LIE') continue;
    if (action.char_id === this.char_id) continue;

    const publicClaim = action.content;
    const sourceReliability = this.stage.getReliability(action.char_id, this.char_id);

    // Depth-1: what I think the speaker believes (existing M3.3 logic)
    this.stage.upsertBeliefLayer({
      observer_id: this.char_id,
      subject_id: action.char_id,
      proposition: publicClaim,
      depth: 1,
      confidence: 0.7 * sourceReliability,
      source_weight: sourceReliability,
      layer: 'inferred',
      created_turn: currentTurn,
    });

    // NEW: visibilityModel update
    // If the speaker made a public announcement, they now know I heard it.
    // So I update my model of "what the speaker thinks I know":
    const existingTom2 = this.getToM2Entry(action.char_id);
    existingTom2.visibility_model_thinks_i_know.push(publicClaim);

    // Depth-2 (existing M3.3 logic — high drama arcs only)
    const isHighDrama = await this.relevanceCheckLLM(publicClaim, this.stage.getIllusionArcs());
    if (isHighDrama) {
      this.stage.upsertBeliefLayer({
        observer_id: this.char_id,
        subject_id: action.char_id,
        proposition: `wants_me_to_believe: ${publicClaim}`,
        depth: 2,
        confidence: 0.5,
        source_weight: 1.0,
        layer: 'inferred',
        created_turn: currentTurn,
      });

      // Record as public announcement for sidecar export
      this.stage.recordPublicAnnouncement({
        id: `ann-${Date.now()}`,
        announced_by: action.char_id,
        proposition: publicClaim,
        turn_detected: currentTurn,
        belief_updates: [{ agentId: this.char_id, proposition: publicClaim, confidence: 0.7 }],
        tom2_updates: [{ agentId: this.char_id, visibilityProp: `${action.char_id} knows I heard: ${publicClaim}` }],
      });
    }
  }
}

// NEW: expose visibilityModel in prompt when relevant
// Add to buildEnhancedPrompt() after beliefs section:
const visibilityInsights = this.getVisibilityModelInsights();
if (visibilityInsights.length > 0) {
  prompt += `\n\nWHAT OTHERS KNOW ABOUT YOUR KNOWLEDGE:
${visibilityInsights.slice(0, 2).map(v => `- ${v.speaker} knows you heard: "${v.proposition}"`).join('\n')}
You may use this strategically — you know that they know you know.`;
}
```

---

### M4 — Add Pacing Controller as a DirectorNode Subcomponent

This is V3.5's only genuinely new subcomponent. It adds an active feedback loop: the Director measures actual pacing each turn and injects a style modifier into agent prompts when the tempo drifts.

**File:** `server/lib/PacingController.ts` (new file)

```typescript
import { TurnData, PacingState, Stage } from '../types';

export class PacingController {
  private writerTargetTempo: 'fast' | 'medium' | 'slow';
  private stage: Stage;

  constructor(stage: Stage, targetTempo: 'fast' | 'medium' | 'slow' = 'medium') {
    this.stage = stage;
    this.writerTargetTempo = targetTempo;
  }

  // Called by DirectorNode after each round
  measureAndStore(actions: ActionLogEntry[]): PacingState {
    const allContent = actions.map(a => a.content ?? '').join(' ');
    const sentences = allContent.split(/[.!?]+/).filter(s => s.trim().length > 3);
    const wordCounts = sentences.map(s => s.trim().split(/\s+/).length);
    const avgLength = wordCounts.reduce((s, n) => s + n, 0) / Math.max(1, wordCounts.length);
    const variance = this.calculateVariance(wordCounts);
    const actionCount = actions.filter(a => a.action_type === 'EXAMINE' || a.action_type === 'RELOCATE').length;
    const totalWords = allContent.split(/\s+/).length;
    const density = totalWords > 0 ? actionCount / (totalWords / 100) : 0;

    let tempo: 'fast' | 'medium' | 'slow' = 'medium';
    if (density > 0.5 && avgLength < 8) tempo = 'fast';
    else if (density < 0.15 && avgLength > 20) tempo = 'slow';

    const recentPacing = this.stage.getRecentPacingStates(3);
    const monotonyRisk = recentPacing.length >= 3 && recentPacing.every(p => p.variance < 0.25);

    const state: PacingState = {
      turn: this.stage.getCurrentTurn(),
      tempo, variance, monotony_risk: monotonyRisk, action_density: density,
    };
    this.stage.insertPacingState(state);
    return state;
  }

  // Returns a style override string to inject into agent prompts this turn.
  // Returns null if pacing is on target.
  getPacingOverride(currentPacing: PacingState): string | null {
    if (currentPacing.monotony_risk) {
      return `PACING NOTE: The scene has become rhythmically monotonous. Use shorter, punchier exchanges. Vary sentence length deliberately. Introduce a physical action.`;
    }
    if (currentPacing.tempo === 'fast' && this.writerTargetTempo === 'slow') {
      return `PACING NOTE: Slow down. Let the moment breathe. Long, layered sentences. Let subtext sit.`;
    }
    if (currentPacing.tempo === 'slow' && this.writerTargetTempo === 'fast') {
      return `PACING NOTE: Accelerate. Short sentences. Fragment thoughts. Don't complete ideas — interrupt.`;
    }
    return null;
  }

  private calculateVariance(nums: number[]): number {
    if (nums.length < 2) return 0;
    const mean = nums.reduce((s, n) => s + n, 0) / nums.length;
    const squareDiffs = nums.map(n => (n - mean) ** 2);
    const avgSquareDiff = squareDiffs.reduce((s, n) => s + n, 0) / squareDiffs.length;
    return Math.min(1, Math.sqrt(avgSquareDiff) / mean);
  }
}
```

**Wire into DirectorNode and agent prompts:**

```typescript
// DirectorNode.ts — in evaluateAndSteer(), after tension computation:
const pacingState = this.pacingController.measureAndStore(roundActions);
const pacingOverride = this.pacingController.getPacingOverride(pacingState);

// Pass override to all agents for use in NEXT turn's prompt
if (pacingOverride) {
  for (const agent of agents) {
    agent.setPacingHint(pacingOverride);
  }
}

// Agent.ts — add setPacingHint() and consume in buildEnhancedPrompt()
private pacingHint: string | null = null;

setPacingHint(hint: string | null): void {
  this.pacingHint = hint;
}

// In buildEnhancedPrompt(), after Beat Conditioning, before Goals:
if (this.pacingHint) {
  prompt += `${this.pacingHint}\n\n`;
  this.pacingHint = null;  // consume — only applies for one turn
}
```

**Writer API for pacing curve:** Add to session setup request and `POST /api/session/:id/pacing`:

```typescript
interface SessionSetupRequest {
  // ... existing fields
  pacing?: 'fast' | 'medium' | 'slow';  // default 'medium'
}

// POST /api/session/:id/pacing — change tempo mid-simulation
app.post('/api/session/:sessionId/pacing', asyncHandler(async (req, res) => {
  const { tempo } = req.body;
  const { orchestrator } = getOrCreateSession(req.params.sessionId);
  orchestrator.directorNode.pacingController.writerTargetTempo = tempo;
  res.json({ ok: true, tempo });
}));
```

**Research note:** The actual foundation for this is Yang et al.'s DOC (2023) and CONCOCT's insight that pacing in LLM generation must be actively controlled, not expected to emerge. DOC showed 22.5% gain in plot coherence and 20.7% gain in interestingness with active outline control — not the "60% / 45%" figures V3.5 claims.

---

### M5.1 — Add Outline Seeding to Session Setup API

The V3.5 beat conditioning requires that story outlines be generated at session setup and stored in the `story_outline` table (added in M1.2 above). The `generateInitialOutline()` call described in M2.6 above should be added here.

Additionally, expose a `PUT /api/session/:id/outline` endpoint so the Writer Cockpit can let the writer refine beats mid-simulation:

```typescript
app.put('/api/session/:sessionId/outline', asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { beats } = req.body;  // OutlineBeat[]
  const { stage } = getOrCreateSession(sessionId);
  stage.upsertStoryOutline(sessionId, beats);
  res.json({ ok: true, beat_count: beats.length });
}));
```

---

### M5.2 — Lightweight CICERO-Style Intent Prediction

The full CICERO architecture (piKL bilateral planning algorithm) is not practical to port. But the *intent modeling concept* — having each agent predict what other agents will do next — produces meaningfully richer epistemic behavior.

Add as a lightweight addition to `updateEpistemicsBatch()`:

```typescript
// NEW: After updating beliefs, have each agent predict the primary goal
// of each other agent they interacted with this round.
// This is a cheap heuristic, not a full piKL solver.

async predictPeerIntents(roundActions: ActionLogEntry[], allAgents: Agent[]): Promise<void> {
  for (const action of roundActions) {
    if (action.char_id === this.char_id) continue;

    const speaker = allAgents.find(a => a.char_id === action.char_id);
    if (!speaker) continue;

    // Use the action's tactic (from inference_trace) to predict their goal state
    const trace = this.stage.getInferenceTrace(action.action_id);
    if (!trace) continue;

    // Map observed tactic → predicted intent
    const tacticToIntent: Record<TacticId, string> = {
      lie:          `${speaker.name} is concealing something important`,
      deflect:      `${speaker.name} is avoiding a topic that threatens them`,
      probe:        `${speaker.name} is trying to learn what you know`,
      corner:       `${speaker.name} is trying to force a decision`,
      escalate:     `${speaker.name} is losing control and pushing harder`,
      appeal:       `${speaker.name} wants something and is trying to earn goodwill`,
      gaslight:     `${speaker.name} is trying to make you doubt your own perception`,
      counteraccuse:`${speaker.name} is deflecting blame onto others`,
      confess_partial: `${speaker.name} is offering partial truth to seem credible`,
      mirror:       `${speaker.name} is reflecting your energy to build false rapport`,
      sacrifice:    `${speaker.name} is giving something real to prove sincerity`,
      withdraw:     `${speaker.name} is pulling back — something threatens them`,
    };

    const intentPrediction = tacticToIntent[trace.tactic];
    if (intentPrediction) {
      // Store as a depth-1 belief about the speaker's goal
      this.stage.upsertBeliefLayer({
        observer_id: this.char_id,
        subject_id: action.char_id,
        proposition: intentPrediction,
        depth: 1,
        confidence: 0.6,   // uncertain — this is inference, not observation
        source_weight: 0.7,
        layer: 'inferred',
        created_turn: this.stage.getCurrentTurn(),
      });
    }
  }
}
```

Call `await agent.predictPeerIntents(roundActions, agents)` at the end of `updateEpistemicsBatch()`.

**What this produces:** Agents accumulate beliefs like "Marcus is probing me for what I know" or "Alice is deflecting — something threatens her." These beliefs feed into the contradiction detection and pressure computation, making characters' strategic responses feel more intelligent.

---

### M6.5 / M7 — Add Syuzhet Reordering as a First-Class Export Feature

V3.5 emphasizes syuzhet reconstruction as a major output feature. Our plan has beat ordering in Harvest Mode (M7.5) but doesn't explicitly frame it as syuzhet manipulation. Add a dedicated syuzhet endpoint that formalizes this:

```typescript
// GET /api/session/:id/syuzhet-options
// Returns the fabula (chronological beats) with suggested syuzhet orderings
app.get('/api/session/:sessionId/syuzhet-options', asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(req.params.sessionId);
  const log = stage.getActionLog();
  const tensionHistory = stage.getTensionHistory(999);
  const beats = segmentIntoBeats(log, tensionHistory, stage);

  // Fabula = chronological order
  const fabula = beats;

  // Suggested syuzhet orderings
  const suggestions = [
    {
      name: 'In medias res',
      order: [...beats].sort((a, b) => b.tension_delta - a.tension_delta).slice(0, 3)
        .concat(beats.filter(b => !beats.slice(0, 3).includes(b))),
      rationale: 'Open with highest-tension beats, then flash back to setup',
    },
    {
      name: 'Classic three-act',
      order: beats,  // chronological is often best for three-act
      rationale: 'Chronological — let the arc breathe naturally',
    },
    {
      name: 'Reveal-first',
      order: beats.filter(b => b.reveal_status === 'payoff')
        .concat(beats.filter(b => b.reveal_status !== 'payoff')),
      rationale: 'Open with the payoff beat — tell audience the ending, then show how you got there (Columbo structure)',
    },
  ];

  res.json({ fabula, syuzhet_suggestions: suggestions });
}));
```

Add a **Syuzhet Panel** to M7.5 Harvest Mode that renders these options visually.

---

### M7.1 — Add Pacing Curve Control to Simulation Dashboard

Add to the Writer Cockpit simulation control panel:

```
PACING CURVE ─────────────────────────────────
Current:  [░░░░░░░░░░░░░░░░░░░░] ← Slow
Turn 7:   ▲ Monotony Risk — variance low for 3 turns

Target tempo: [Slow ●] [Medium ○] [Fast ○]
             [Apply]
```

The [Apply] button calls `PUT /api/session/:id/pacing` with the selected tempo. Add to the SSE event stream:

```typescript
// In sendEvent() calls, include pacing state:
sendEvent({ type: 'turn', payload: { ...turnResult, pacing: pacingState, pacing_override: pacingOverride } });
```

---

### M7.3 — Add Outline/Beat Panel to Writer Cockpit

New panel alongside Epistemic Map:

```
STORY OUTLINE ─────────────────────────────────
Beat 1 [SETUP]    Turns 0–6    ✓ Complete
  Goal: Establish lie as credible
  
Beat 2 [PRESSURE] Turns 7–14   ← Current
  Goal: Reinforce pattern, plant doubts
  Constraint: No full reveals

Beat 3 [REVERSAL] Turns 15–20
  Goal: A crack appears
  [Edit Beat] [Force Advance]
  
Beat 4 [REVEAL]   Turns 21–25
  [Edit Beat]
```

[Edit Beat] opens inline editor for goal/constraint/avoid fields that calls `PUT /api/session/:id/outline`.
[Force Advance] manually calls `stage.advanceOutlineBeat()` and syncs all agents' next-turn prompts.

---

## Part IV: What to Reject from V3.5

### Full CICERO piKL Architecture

CICERO's actual mechanism is a bilateral correlated planning algorithm (piKL) that runs iterative best-response loops between 7 agents over a game-theoretic action space. It requires: (1) a finite, enumerable action space (Diplomacy has ~1400 distinct moves), (2) a trained value function over the game state, (3) an iterative solver that runs ~100 iterations per decision point. None of these apply to an open-ended drama simulation. The lightweight intent prediction added above captures the spirit of CICERO's intent modeling without the infeasible machinery.

### `embedded_vector BLOB` in `memory_stream`

V3.5's schema adds an embedding vector column for semantic memory retrieval. This requires running a separate embedding model (OpenAI Embeddings API, or a local model like `nomic-embed-text`). This adds:
- +1 API call per memory insertion (every turn, every agent)
- Significant storage overhead
- BLOB columns in SQLite are not indexed

The keyword-overlap retrieval described in our M8 audit is sufficient for the scale of drama simulation. If semantic retrieval becomes a bottleneck later, add it as an M9 optimization. Do not add it to M1 schema.

### "Akoury 2024 Auto-Pivot Detection"

Since this paper cannot be verified, don't cite it. The functionality it describes — detecting narrative turning points — is already implemented as `tension_state.derivative === 'peak'` in our M4.1 tension model. Relabel this as turning point detection based on the verified Papalampidi et al. (2019) turning point identification work, which is the actual foundation for computational pivot detection in screenplays.

### The "V3.5 is the moat" framing

V3.5 claims "no existing system combines more than 3 of these." This is a motivational claim, not a factual one — unverifiable, and strategically irrelevant to the implementation work. Remove it from technical documentation; it belongs in a pitch deck, not an engineering spec.

---

## Part V: Revised Implementation Order

The following consolidates the original M0–M8 plan (with all audit fixes applied) and slots in V3.5's genuine additions:

| Milestone | Contents | V3.5 Additions |
|---|---|---|
| M0 | Session isolation, WAL mode, SSE, circuit breaker | — |
| M1 | Types, schema, Stage methods | + `public_announcements`, `pacing_state`, `story_outline`, `persuasion_log` tables |
| M2 | BDI agent cognition | + Target-aware persuasion (M2.5), beat conditioning in prompt (M2.6) |
| M3 | Epistemic engine | + `visibilityModel` in ToM (M3.3), lightweight intent prediction |
| M4 | Drama manager | + `PacingController` subcomponent, pacing override injection |
| M5 | Reveal architecture | + `generateInitialOutline()` at session setup, outline advancement synced to arc phase |
| M6 | Script bridge | + Syuzhet endpoint with ordering suggestions |
| M7 | Writer cockpit | + Pacing curve control panel, outline/beat panel, syuzhet panel in Harvest Mode |
| M8 | Advanced features | Memory, reflection, emotion contagion (unchanged from original) |

**Estimated net addition:** ~6–8 hours of implementation across M1–M7 for genuine V3.5 contributions. The pacing controller is the most impactful per hour — start there.

---

## Part VI: Corrected Citation Table

Use these corrected citations in all documentation:

| Feature | Correct Citation |
|---|---|
| Pacing control | Yang et al. 2023 "DOC: Improving Long Story Coherence" (ACL 2023); Yang et al. 2023 "CONCOCT: Improving Pacing in Long-Form Story Planning" (NAACL 2024) |
| Outline conditioning | Rashkin et al. 2020 "PlotMachines: Outline-Conditioned Generation with Dynamic Plot State Tracking" (EMNLP 2020); Yang et al. 2023 "DOC" (22.5% coherence gain, not 60%) |
| Turning point detection | Papalampidi et al. 2019 "Movie Plot Analysis via Turning Point Identification"; Tian et al. 2024 (EMNLP) on arousal curves |
| Narrative consistency | LLM-as-judge evaluation, Zheng et al. 2023 "Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena" |
| Theory of Mind | Kosinski 2023 (contested); cite instead Sap et al. 2022 "Neural Theory-of-Mind?" for the empirical limitations |
| Emotion contagion | Hatfield et al. 1993 (original theory); for LLM application, Chain-of-Emotion (2024, PLOS One) |
| Trust decay | Source reliability model from our own plan (M3.4); cite AGM postulates for the formal foundation |
| Persuasion strategy | Multiple 2024 papers on LLM-based personalized persuasion; no single "Li 2024 ACL" paper required |
| Memory + reflection | Park et al. 2023 "Generative Agents" (UIST 2023) — verified |
| Tension model (5 features) | Internal design — label as empirical hyperparameters, not a specific paper |

---

*Integration plan generated May 2026. Based on verified research and comparative analysis against the V3.5 blueprint.*
