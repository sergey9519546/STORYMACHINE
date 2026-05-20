import type { EmotionState, EmotionType, EpistemicUpdate, DramaticPressureType } from './types.ts';
import { Stage } from './Stage.ts';

// Exhaustiveness guard: add every DramaticPressureType value here or this file
// fails to compile. When you add a new type in types.ts, TypeScript will error
// here until you also add an if-block in appraise() and list it below.
// TO ADD A NEW DramaticPressureType: (1) add the union member in types.ts,
// (2) add an if-block in appraise() below, (3) add the key here.
const _PRESSURE_TYPES_HANDLED: Record<DramaticPressureType, true> = {
  confrontation_imminent: true,
  evidence_against:       true,
  ally_compromised:       true,
  goal_blocked:           true,
  revelation_due:         true,
  CONFRONT:               true,
  WITHHOLD:               true,
  ESCALATE:               true,
  COOL:                   true,
  REDIRECT:               true,
  REVEAL:                 true,
};
void _PRESSURE_TYPES_HANDLED; // prevent unused-var warnings

// ── AppraisalEngine ──────────────────────────────────────────────────────────
// Pure deterministic OCC (Ortony-Clore-Collins 1988) appraisal layer.
// Reads from Stage (GoalMutations, DramaticPressures) written by the spine
// and computes per-agent emotion states.  No Gemini calls.
//
// Emotions are appraisals of events relative to goals:
//   joy        — subgoal achieved
//   distress   — subgoal blocked / terminal threatened / contradiction found
//   anger      — distress attributed to another agent's deliberate action
//   fear       — anticipatory: confrontation_imminent or CONFRONT pressure
//   pride      — own successful (un-contradicted) deception
//   shame      — own failure exposed by another agent
//
// Contagion: emotions diffuse between co-present agents at end of each room
// simulation round, weighted by mutual trust (theoryOfMind.trust_level).

const DECAY = 0.88;               // per-turn decay factor toward baseline
const CONTAGION_RATE = 0.08;      // base bleed rate per round × trust
const SUSPICION_BLEED = 5;        // max suspicion points transferred per contagion pass

const EMOTION_DIMS = ['joy', 'distress', 'anger', 'fear', 'pride', 'shame'] as const;
type NumericDim = typeof EMOTION_DIMS[number];

function blank(): EmotionState {
  return { joy: 0, distress: 0, anger: 0, fear: 0, pride: 0, shame: 0, dominant: 'neutral', intensity: 0, last_updated_at: -1 };
}

function setDominant(e: EmotionState): void {
  let maxKey: NumericDim = 'joy';
  let maxVal = 0;
  for (const k of EMOTION_DIMS) {
    if (e[k] > maxVal) { maxVal = e[k]; maxKey = k; }
  }
  e.dominant = maxVal > 10 ? (maxKey as EmotionType) : 'neutral';
  e.intensity = maxVal;
}

export class AppraisalEngine {
  private stage: Stage;

  constructor(stage: Stage) {
    this.stage = stage;
  }

  // Call after _runSpineForUpdate for each agent.
  // Reads freshly-written GoalMutations and DramaticPressures from Stage.
  public appraise(update: EpistemicUpdate): void {
    const agent = this.stage.getAgent(update.char_id);
    if (!agent) return;

    const turnIndex = this.stage.getTurnCount();
    const current = agent.emotionState ?? blank();
    // Skip if already appraised this turn (prevents double-counting when the acting
    // agent also appears as a Director observer for the same turn index).
    if (current.last_updated_at >= turnIndex) return;
    const next: EmotionState = { ...current };

    // ── Decay toward baseline ──
    // Floor-based decay with forced -1 step for small values ensures strict
    // monotonic decrease to 0. Math.ceil would freeze emotions at values ≤ 8 forever.
    for (const k of EMOTION_DIMS) {
      const decayed = Math.floor(next[k] * DECAY);
      next[k] = decayed >= next[k] ? Math.max(0, next[k] - 1) : decayed;
    }

    // ── Appraise recent goal mutations ──
    const mutations = this.stage.getRecentGoalMutations(update.char_id, turnIndex);
    for (const m of mutations) {
      if (m.mutation_type === 'subgoal_achieved') {
        next.joy = Math.min(100, next.joy + 30);
      } else if (m.mutation_type === 'subgoal_blocked') {
        next.distress = Math.min(100, next.distress + 30);
      } else if (m.mutation_type === 'terminal_threatened') {
        next.distress = Math.min(100, next.distress + 40);
        next.fear = Math.min(100, next.fear + 20);
      }
    }

    // ── Appraise epistemic contradiction ──
    if (update.contradiction_detected) {
      next.distress = Math.min(100, next.distress + 20);
    }

    // ── Appraise active pressures ──
    const pressures = this.stage.getActivePressures(update.char_id);
    for (const p of pressures) {
      const mag = Math.round(p.intensity * 0.25);
      if (p.pressure_type === 'confrontation_imminent' || p.pressure_type === 'CONFRONT') {
        next.fear = Math.min(100, next.fear + mag);
      }
      if (p.pressure_type === 'evidence_against') {
        next.shame = Math.min(100, next.shame + Math.round(p.intensity * 0.2));
      }
      if (p.pressure_type === 'confrontation_imminent' && p.source_char_id) {
        next.anger = Math.min(100, next.anger + 20);
        if (!next.anger_target_id || next.anger > 50) {
          next.anger_target_id = p.source_char_id;
        }
      }
      if (p.pressure_type === 'ESCALATE') {
        // Rising stakes → fear + distress
        next.fear    = Math.min(100, next.fear    + mag);
        next.distress = Math.min(100, next.distress + Math.round(p.intensity * 0.2));
      }
      if (p.pressure_type === 'COOL') {
        // Deliberate de-escalation → relief (joy dampens distress and fear)
        next.joy      = Math.min(100, next.joy      + Math.round(p.intensity * 0.15));
        next.distress = Math.max(0,   next.distress - Math.round(p.intensity * 0.1));
        next.fear     = Math.max(0,   next.fear     - Math.round(p.intensity * 0.1));
      }
      if (p.pressure_type === 'REDIRECT') {
        // Forced topic change → disorientation (mild distress, confusion ≈ fear)
        next.distress = Math.min(100, next.distress + Math.round(p.intensity * 0.15));
        next.fear     = Math.min(100, next.fear     + Math.round(p.intensity * 0.1));
      }
      if (p.pressure_type === 'REVEAL') {
        // Hidden truth exposed → shame + distress
        next.shame    = Math.min(100, next.shame    + Math.round(p.intensity * 0.3));
        next.distress = Math.min(100, next.distress + Math.round(p.intensity * 0.2));
      }
      if (p.pressure_type === 'WITHHOLD') {
        // Needed information withheld → frustration ≈ anger
        next.anger    = Math.min(100, next.anger    + Math.round(p.intensity * 0.2));
        next.distress = Math.min(100, next.distress + Math.round(p.intensity * 0.1));
      }
      if (p.pressure_type === 'goal_blocked') {
        // Direct goal obstruction → distress + anger at blocker
        next.distress = Math.min(100, next.distress + Math.round(p.intensity * 0.35));
        if (p.source_char_id) {
          next.anger = Math.min(100, next.anger + Math.round(p.intensity * 0.2));
          if (!next.anger_target_id) next.anger_target_id = p.source_char_id;
        }
      }
      if (p.pressure_type === 'ally_compromised') {
        // Someone trusted has been revealed as compromised → fear + betrayal anger
        next.fear  = Math.min(100, next.fear  + Math.round(p.intensity * 0.3));
        next.anger = Math.min(100, next.anger + Math.round(p.intensity * 0.2));
        if (p.source_char_id && !next.anger_target_id) {
          next.anger_target_id = p.source_char_id;
        }
      }
      if (p.pressure_type === 'revelation_due') {
        // Something is about to be revealed — anticipatory anxiety
        next.fear    = Math.min(100, next.fear    + Math.round(p.intensity * 0.2));
        next.distress = Math.min(100, next.distress + Math.round(p.intensity * 0.15));
      }
    }

    // If contradiction detected AND we know who told the contradicted belief → anger at them
    if (update.contradiction_detected) {
      const allBeliefs = agent.beliefs ?? [];
      for (const prop of update.contradicted_propositions) {
        const contradicted = allBeliefs.find(b => b.proposition === prop && b.source_agent_id);
        if (contradicted?.source_agent_id) {
          next.anger = Math.min(100, next.anger + 15);
          if (!next.anger_target_id) next.anger_target_id = contradicted.source_agent_id;
          break;
        }
      }
    }

    // ── Pride: successful deception — agent just lied and it wasn't detected ──
    // Last action by this agent was LIE AND no contradiction surfaced this update.
    const lastAction = this.stage.getLastActionForAgent(update.char_id);
    if (lastAction?.action_type === 'LIE' && !update.contradiction_detected) {
      next.pride = Math.min(100, next.pride + 20);
    }

    // Clear anger target once anger has decayed to negligible
    if (next.anger < 10) next.anger_target_id = undefined;

    setDominant(next);
    next.last_updated_at = turnIndex;

    this.stage.updateEmotionState(update.char_id, next);
  }

  // Call once per runRoomSimulation after all per-agent appraisals.
  // Emotions diffuse between co-present agents weighted by mutual trust.
  public applyContagion(location_id: string): void {
    const agents = this.stage.getAgentsInLocation(location_id);
    if (agents.length < 2) return;

    const turnIndex = this.stage.getTurnCount();
    const snap: Record<string, EmotionState> = {};
    for (const a of agents) {
      snap[a.char_id] = a.emotionState ?? blank();
    }

    for (const a of agents) {
      const me = { ...snap[a.char_id] };
      const tom = a.theoryOfMind ?? {};

      for (const b of agents) {
        if (b.char_id === a.char_id) continue;
        const trust = tom[b.char_id]?.trust_level ?? 0.3;
        const other = snap[b.char_id];
        const rate = CONTAGION_RATE * trust;

        // joy and distress are contagious; fear is mildly; anger is self-directed
        me.joy      = Math.max(0, Math.min(100, Math.round(me.joy      + rate * 1.2 * (other.joy      - me.joy))));
        me.distress = Math.max(0, Math.min(100, Math.round(me.distress + rate * 0.8 * (other.distress - me.distress))));
        me.fear     = Math.max(0, Math.min(100, Math.round(me.fear     + rate * 0.5 * (other.fear     - me.fear))));
      }

      setDominant(me);
      me.last_updated_at = turnIndex;
      this.stage.updateEmotionState(a.char_id, me);
    }
  }

  // Suspicion contagion: a visibly distressed/fearful co-present agent raises
  // others' suspicion, attenuated by the observer's trust in them.
  // Must run AFTER Director suspicion updates to layer on top correctly.
  public applySuspicionContagion(location_id: string): void {
    const agents = this.stage.getAgentsInLocation(location_id);
    if (agents.length < 2) return;

    // Snapshot suspicion scores so we don't double-apply within this pass.
    const snap: Record<string, number> = {};
    for (const a of agents) snap[a.char_id] = a.suspicion_score;

    for (const observer of agents) {
      const tom = observer.theoryOfMind ?? {};
      let delta = 0;
      for (const neighbor of agents) {
        if (neighbor.char_id === observer.char_id) continue;
        const es = neighbor.emotionState;
        if (!es || !['fear', 'distress'].includes(es.dominant) || es.intensity < 30) continue;
        const trust = tom[neighbor.char_id]?.trust_level ?? 0.3;
        // Low trust amplifies suspicion; high trust dampens it.
        delta += SUSPICION_BLEED * (es.intensity / 100) * (1 - trust);
      }
      if (delta > 0) {
        const newScore = Math.min(100, snap[observer.char_id] + Math.round(delta));
        this.stage.updateAgentSuspicion(observer.char_id, newScore);
      }
    }
  }
}
