// Cockpit Inspector — explains a narrative action as a call stack.
// Given an event_id (from Action_Log), traces backward through the causal
// chain: which pressure triggered the tactic, which goal drove the pressure,
// which belief updated the goal. Returns an ExplainPanel the Cockpit renders.

import type { Stage } from '../../engine/Stage.ts';

export interface ExplainFrame {
  layer: 'goal' | 'pressure' | 'tactic' | 'line';
  id: string;
  summary: string;
}

export interface ExplainPanel {
  eventId: string;
  charId: string | null;
  actionType: string;
  content: string;
  frames: ExplainFrame[];
}

export function explainAction(stage: Stage, eventId: string): ExplainPanel | null {
  const log = stage.getFullLedger();
  const entry = log.find(e => e.action_id === eventId);
  if (!entry) return null;

  const frames: ExplainFrame[] = [];

  // Layer 4 — the raw line output
  frames.push({
    layer: 'line',
    id: eventId,
    summary: `${entry.action_type}: "${entry.content.slice(0, 80)}${entry.content.length > 80 ? '…' : ''}"`,
  });

  // Layer 3 — tactic: derive from action_type
  const tacticMap: Record<string, string> = {
    SPEAK: 'verbal persuasion / information exchange',
    DECEIVE: 'deliberate misdirection',
    EXAMINE: 'epistemic investigation',
    MOVE: 'strategic repositioning',
    WAIT: 'observation hold',
    PERSUADE: 'social pressure application',
  };
  const tacticSummary = tacticMap[entry.action_type] ?? `${entry.action_type} tactic`;
  frames.push({ layer: 'tactic', id: entry.action_type, summary: tacticSummary });

  // Layer 2 — pressure: most recent pressure applied to this char before the event
  if (entry.char_id) {
    const pressures = stage.getActivePressures(entry.char_id);
    if (pressures.length > 0) {
      const p = pressures[0];
      frames.push({
        layer: 'pressure',
        id: p.pressure_id,
        summary: `${p.pressure_type} pressure (intensity ${p.intensity}) from ${p.source_char_id ?? 'world'}: ${p.bias_hint}`,
      });
    }
  }

  // Layer 1 — goal: top of the goal stack for this char
  if (entry.char_id) {
    const agent = stage.getAgent(entry.char_id);
    if (agent?.goalStack) {
      const { terminal, instrumental } = agent.goalStack;
      frames.push({
        layer: 'goal',
        id: entry.char_id,
        summary: `terminal goal: "${terminal}" | instrumental: [${instrumental.slice(0, 2).join(', ')}]`,
      });
    }
  }

  // Reverse so call stack reads goal→pressure→tactic→line (top-down causality)
  frames.reverse();

  return {
    eventId,
    charId: entry.char_id ?? null,
    actionType: entry.action_type,
    content: entry.content,
    frames,
  };
}

// Bulk explain: return ExplainPanel for every event in a scene, ordered by turn.
export function explainScene(stage: Stage, locationId: string): ExplainPanel[] {
  const log = stage.getSensoryFilter(locationId, 100);
  return log
    .map(e => explainAction(stage, e.action_id))
    .filter((p): p is ExplainPanel => p !== null);
}
