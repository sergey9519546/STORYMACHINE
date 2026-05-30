// Wave 57 — Live Story Bible (P7)
// Builds a compact (≤1400 char) story context summary for injection into every
// LLM prompt — agent turns and ScriptIDE calls alike.  The bible accumulates as
// StoryCommits land: each call reflects the current ledger state so the model
// always has story memory without receiving the full raw transcript.

import type { Stage } from '../../engine/Stage.ts';
import { sanitizeForPrompt } from '../../lib/prompt-utils.ts';

const MAX_CHARS = 1400;

/**
 * Build a compact story context block for injection into LLM prompts.
 * Returns an empty string when there is no accumulated story (first turn).
 */
export function buildStoryBibleSummary(stage: Stage): string {
  const illusionState = stage.getIllusionState();
  const agents = stage.getAllAgents();
  const allBeats = stage.getAllBeatTraces();
  const commits = stage.getCommits().filter(c => !c.reverted);

  if (commits.length === 0 && agents.length === 0) return '';

  const parts: string[] = [];

  // ── Header: theme, style, story position ─────────────────────────────────
  if (illusionState.story_theme) {
    parts.push(`THEME: ${sanitizeForPrompt(illusionState.story_theme, 200)}`);
  }
  if (illusionState.director_style) {
    parts.push(`STYLE: ${illusionState.director_style}`);
  }
  parts.push(`STORY PHASE: ${illusionState.phase ?? 'Setup'} | Turn ${stage.getTurnCount()}`);

  // ── Characters with current emotional state and active goal ───────────────
  if (agents.length > 0) {
    const charLines: string[] = ['CHARACTERS:'];
    for (const a of agents.slice(0, 6)) {
      const es = a.emotionState;
      const emotionStr = es && es.dominant !== 'neutral' && es.intensity >= 20
        ? ` [${es.dominant} ${es.intensity}]` : '';
      const goal = a.goalStack?.instrumental.find(g => !g.achieved)?.description;
      const goalStr = goal ? ` → ${sanitizeForPrompt(goal, 80)}` : '';
      charLines.push(`  ${sanitizeForPrompt(a.name, 80)}${emotionStr}${goalStr}`);
    }
    parts.push(charLines.join('\n'));
  }

  // ── Recent dramatic beats (last 4, excluding mundane pressure_applied) ────
  const relevantBeats = allBeats
    .filter(b => b.beat_type !== 'pressure_applied')
    .slice(-4);
  if (relevantBeats.length > 0) {
    const beatLines: string[] = ['RECENT DRAMATIC EVENTS:'];
    for (const b of relevantBeats) {
      beatLines.push(`  [${b.beat_type}] ${sanitizeForPrompt(b.narrative_summary, 100)}`);
    }
    parts.push(beatLines.join('\n'));
  }

  // ── Unresolved clues and hot clocks from commit ledger ────────────────────
  const plantedIds = new Set<string>();
  const paidIds = new Set<string>();
  const clockTotals: Record<string, number> = {};
  for (const c of commits) {
    for (const op of c.ops) {
      if (op.op === 'SEED_CLUE') plantedIds.add(op.clueId);
      if (op.op === 'PAYOFF_SETUP') paidIds.add(op.setupId);
      if (op.op === 'RAISE_CLOCK') {
        const a = op.amount;
        clockTotals[op.clockId] = (clockTotals[op.clockId] ?? 0) + (isFinite(a) ? a : 0);
      }
    }
  }
  const unresolvedCount = [...plantedIds].filter(id => !paidIds.has(id)).length;
  if (unresolvedCount > 0) {
    parts.push(`OPEN CLUES: ${unresolvedCount} seeded but not yet paid off`);
  }
  const hotClocks = Object.entries(clockTotals)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);
  if (hotClocks.length > 0) {
    parts.push(`ACTIVE CLOCKS: ${hotClocks.map(([id, v]) => `${id}=${v}`).join(', ')}`);
  }

  const summary = `STORY BIBLE (live — do not contradict):\n${parts.join('\n')}`;
  return summary.length > MAX_CHARS
    ? summary.substring(0, MAX_CHARS) + '\n[...truncated]'
    : summary;
}
