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
  if (illusionState.story_genre) {
    parts.push(`GENRE: ${illusionState.story_genre}`);
  }
  parts.push(`STORY PHASE: ${illusionState.phase ?? 'Setup'} | Turn ${stage.getTurnCount()}`);

  // ── Characters with emotional state, active goal, and arc progress ────────
  if (agents.length > 0) {
    const charLines: string[] = ['CHARACTERS:'];
    for (const a of agents.slice(0, 6)) {
      const es = a.emotionState;
      const emotionStr = es && es.dominant !== 'neutral' && es.intensity >= 20
        ? ` [${es.dominant} ${es.intensity}]` : '';
      const goal = a.goalStack?.instrumental.find(g => !g.achieved)?.description;
      const goalStr = goal ? ` → ${sanitizeForPrompt(goal, 80)}` : '';
      // Arc progress: fraction of instrumental goals achieved
      const gs = a.goalStack;
      let arcStr = '';
      if (gs && gs.instrumental.length > 0) {
        const achieved = gs.instrumental.filter(g => g.achieved).length;
        const pct = Math.round((achieved / gs.instrumental.length) * 100);
        arcStr = ` (arc ${pct}%)`;
      }
      charLines.push(`  ${sanitizeForPrompt(a.name, 80)}${emotionStr}${arcStr}${goalStr}`);
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
  const unresolvedClueIds = [...plantedIds].filter(id => !paidIds.has(id));
  if (unresolvedClueIds.length > 0) {
    // List actual clue IDs so the LLM can reference them in PAYOFF_SETUP ops
    const topIds = unresolvedClueIds.slice(0, 5).map(id => `"${id}"`).join(', ');
    const more = unresolvedClueIds.length > 5 ? ` (+${unresolvedClueIds.length - 5} more)` : '';
    parts.push(`OPEN CLUES (${unresolvedClueIds.length}): ${topIds}${more} — not yet paid off`);
  }
  const hotClocks = Object.entries(clockTotals)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);
  if (hotClocks.length > 0) {
    parts.push(`ACTIVE CLOCKS: ${hotClocks.map(([id, v]) => `${id}=${v}`).join(', ')}`);
  }

  // ── Theme argument trajectory ────────────────────────────────────────────
  const themeMoveCounts: Record<string, number> = {};
  let resolveCount = 0;
  for (const c of commits) {
    for (const op of c.ops) {
      if (op.op === 'ADVANCE_THEME_ARGUMENT') {
        themeMoveCounts[op.move] = (themeMoveCounts[op.move] ?? 0) + 1;
        if (op.move === 'resolve') resolveCount++;
      }
    }
  }
  if (Object.keys(themeMoveCounts).length > 0) {
    const moveSummary = Object.entries(themeMoveCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([m, n]) => `${n}×${m}`)
      .join(', ');
    const resolved = resolveCount > 0 ? ' ← RESOLVED' : '';
    parts.push(`THEME MOVES: ${moveSummary}${resolved}`);
  }

  // ── Strongest relationship tensions from live state ──────────────────────
  // (Read NarrativeState from commits rather than calling buildNarrativeState to
  //  avoid circular dependency; approximate from SHIFT_RELATIONSHIP op totals)
  const relTotals: Record<string, number> = {};
  for (const c of commits) {
    for (const op of c.ops) {
      if (op.op === 'SHIFT_RELATIONSHIP') {
        const key = op.pair.slice().sort().join('|');
        const a = op.delta.amount;
        relTotals[key] = (relTotals[key] ?? 0) + (isFinite(a) ? a : 0);
      }
    }
  }
  const strongRels = Object.entries(relTotals)
    .filter(([, v]) => Math.abs(v) >= 0.5)
    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
    .slice(0, 3);
  if (strongRels.length > 0) {
    const relStr = strongRels.map(([k, v]) => `${k}=${v > 0 ? '+' : ''}${v.toFixed(1)}`).join(', ');
    parts.push(`RELATIONSHIPS: ${relStr}`);
  }

  const summary = `STORY BIBLE (live — do not contradict):\n${parts.join('\n')}`;
  return summary.length > MAX_CHARS
    ? summary.substring(0, MAX_CHARS) + '\n[...truncated]'
    : summary;
}
