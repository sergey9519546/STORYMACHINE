import type { EmotionState, EmotionType, EpistemicUpdate } from './types.ts';
import { Stage } from './Stage.ts';

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

const DECAY = 0.88;            // per-turn decay factor toward baseline
const CONTAGION_RATE = 0.08;   // base bleed rate per round × trust

const EMOTION_DIMS = ['joy', 'distress', 'anger', 'fear', 'pride', 'shame'] as const;
type NumericDim = typeof EMOTION_DIMS[number];

function blank(turn: number): EmotionState {
  return { joy: 0, distress: 0, anger: 0, fear: 0, pride: 0, shame: 0, dominant: 'neutral', intensity: 0, last_updated_at: turn };
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
    const current = agent.emotionState ?? blank(turnIndex);
    const next: EmotionState = { ...current };

    // ── Decay toward baseline ──
    for (const k of EMOTION_DIMS) {
      next[k] = Math.round(next[k] * DECAY);
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
      if (p.pressure_type === 'confrontation_imminent' || p.pressure_type === 'CONFRONT') {
        next.fear = Math.min(100, next.fear + Math.round(p.intensity * 0.25));
      }
      if (p.pressure_type === 'evidence_against') {
        // Being on the receiving end of evidence = shame
        next.shame = Math.min(100, next.shame + Math.round(p.intensity * 0.2));
      }
      if (p.pressure_type === 'confrontation_imminent' && p.source_char_id) {
        // Discoverer → suspect: anger at source
        next.anger = Math.min(100, next.anger + 20);
        if (!next.anger_target_id || next.anger > 50) {
          next.anger_target_id = p.source_char_id;
        }
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
      snap[a.char_id] = a.emotionState ?? blank(turnIndex);
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
}
