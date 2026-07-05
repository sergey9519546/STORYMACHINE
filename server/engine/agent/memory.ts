// M4 — Extracted from Agent.ts: memory synthesis and goal replanning.
// Both functions are self-contained (read/write via stage, no shared instance
// state) making them independently testable and deployable.

import { randomUUID } from 'crypto';
import { Type } from '@google/genai';
import { generateContent, modelForTask, getTemperature } from '../ai.ts';
import type { Stage } from '../Stage.ts';
import type { Belief, BeliefSource, Goal, GoalStack, GoalMutation } from '../types.ts';
import { safeJsonParse } from '../../lib/json.ts';
import { logger } from '../../lib/logger.ts';
import { sanitizeForPrompt } from '../../lib/prompt-utils.ts';
import { getReadyGoals } from './psychology.ts';

// ── synthesizeReflectionsFor ──────────────────────────────────────────────────

/**
 * F: Memory-stream reflection synthesis.
 * Every 5 turns: generate 3 high-level insight beliefs from recent scene events.
 * Merges reflection beliefs onto the current belief set; skips duplicates.
 */
export async function synthesizeReflectionsFor(charId: string, stage: Stage): Promise<void> {
  const sheet = stage.getAgent(charId);
  if (!sheet) return;

  const recentFull = stage.getSensoryFilter(sheet.current_location_id, 10);
  if (recentFull.length === 0) return;

  const transcript = recentFull.map(a => {
    const name = sanitizeForPrompt(stage.getAgent(a.char_id)?.name ?? 'Unknown', 128);
    return `[${a.action_type}] ${name}: ${a.content}`;
  }).join('\n');

  const existingBeliefs = (sheet.beliefs ?? []).slice(0, 5).map(b => b.proposition).join('; ');

  const response = await generateContent({
    model: modelForTask('EPISTEMICS'),
    contents: `You are ${sanitizeForPrompt(sheet.name, 256)}. Reflect on these recent events and synthesize exactly 3 high-level insights.\n\nEvents:\n${transcript}\n\nExisting beliefs: ${existingBeliefs || 'none'}\n\nOutput 3 reflective insights that go beyond the surface events — patterns, implications, strategic assessments.`,
    config: {
      temperature: getTemperature(),
      systemInstruction: `You are ${sanitizeForPrompt(sheet.name, 256)} in a reflective moment. Synthesize insights, not observations.`,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reflections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                insight:    { type: Type.STRING },
                confidence: { type: Type.NUMBER, description: '0.0-1.0' },
              },
              required: ['insight', 'confidence'],
            },
          },
        },
        required: ['reflections'],
      },
    },
  }, { label: `synthesizeReflections:${sheet.name}`, timeoutMs: 20_000 }).catch(err => {
    logger.error('agent_ai_error', { agent: sheet.name, method: 'synthesizeReflections', message: (err as Error).message });
    return null;
  });

  if (!response) return;
  const reflRaw = response.text ?? '{}';
  const parsed = safeJsonParse<{ reflections: Array<{ insight: string; confidence: number }> }>(
    reflRaw,
    { reflections: [] },
  );
  if (!parsed.reflections?.length && reflRaw.length > 10) {
    logger.warn('agent_parse_fallback', { agent: sheet.name, method: 'synthesizeReflections', preview: reflRaw.substring(0, 120) });
  }

  // Re-read the sheet after the async LLM call — beliefs may have been updated
  // by a concurrent updateEpistemics.
  const freshSheet = stage.getAgent(charId);
  if (!freshSheet) return;
  const existingBeliefsFull = freshSheet.beliefs ?? [];
  const existingProps = new Set(existingBeliefsFull.map(b => b.proposition.toLowerCase()));

  const reflectionBeliefs: Belief[] = (parsed.reflections ?? [])
    .filter(r => r.insight && !existingProps.has(r.insight.toLowerCase()))
    .slice(0, 3)
    .map(r => ({
      id: randomUUID(),
      proposition: r.insight,
      confidence: typeof r.confidence === 'number' && isFinite(r.confidence) ? Math.max(0, Math.min(1, r.confidence)) : 0.5,
      source: 'inferred' as BeliefSource,
      acquired_at: stage.getTurnCount(),
    }));

  if (reflectionBeliefs.length > 0) {
    stage.updateAgentBeliefs(charId, [...existingBeliefsFull, ...reflectionBeliefs]);
    logger.info('agent_reflection', { agent: sheet.name, new_insights: reflectionBeliefs.length });
  }
}

// ── replanGoalsFor ────────────────────────────────────────────────────────────

/**
 * Goal-DAG replanning.
 * Called when getReadyGoals() returns empty while unachieved goals remain —
 * all paths are deadlocked.  Emits terminal_threatened and asks the LLM for
 * 2 bridging subgoals that can start immediately.
 */
export async function replanGoalsFor(
  charId: string,
  stage: Stage,
  triggerEventId: string,
): Promise<void> {
  const sheet = stage.getAgent(charId);
  if (!sheet) return;
  const gs = sheet.goalStack;
  if (!gs) return;
  const ready = getReadyGoals(gs);
  const active = gs.instrumental.filter(g => !g.achieved);
  if (ready.length > 0 || active.length === 0) return;

  const turnIndex = stage.getTurnCount();
  stage.recordGoalMutation({
    mutation_id: randomUUID(),
    char_id: charId,
    turn_index: turnIndex,
    trigger_event_id: triggerEventId,
    mutation_type: 'terminal_threatened',
    description: `${sheet.name}: all subgoal paths blocked — replanning`,
  });

  const blockedDescs = active.slice(0, 3).map(g => `- ${g.description}`).join('\n');
  const response = await generateContent({
    model: modelForTask('EPISTEMICS'),
    contents: `You are ${sanitizeForPrompt(sheet.name, 256)}. Your current subgoals are ALL blocked by prerequisites that haven't been met:\n${blockedDescs}\n\nTerminal objective: ${sanitizeForPrompt(gs.terminal.description)}\n\nGenerate exactly 2 new instrumental subgoals you can pursue RIGHT NOW, without prerequisites.`,
    config: {
      systemInstruction: `You are replanning as ${sanitizeForPrompt(sheet.name, 256)}. Output only JSON.`,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          new_subgoals: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                value:       { type: Type.INTEGER, description: '0-100 importance' },
              },
              required: ['description', 'value'],
            },
          },
        },
        required: ['new_subgoals'],
      },
    },
  }, { label: `replanGoals:${sheet.name}`, timeoutMs: 20_000 }).catch(err => {
    logger.warn('goal_replan_error', { agent: sheet.name, message: (err as Error).message });
    return null;
  });

  if (!response) return;
  const raw = safeJsonParse<{ new_subgoals: Array<{ description: string; value: number }> }>(
    response.text ?? '{}', { new_subgoals: [] },
  );

  // Re-read sheet — goal stack may have been updated during the async call.
  const freshSheet = stage.getAgent(charId);
  if (!freshSheet) return;
  const gsNow = freshSheet.goalStack;
  if (!gsNow) return;
  const gsCopy: GoalStack = { ...gsNow, instrumental: [...gsNow.instrumental] };

  for (const sg of (raw.new_subgoals ?? []).slice(0, 2)) {
    if (!sg.description) continue;
    const norm = sg.description.trim().toLowerCase();
    if (gsCopy.instrumental.some(g => g.description.trim().toLowerCase() === norm)) continue;
    const newGoal: Goal = {
      id: randomUUID(),
      description: sg.description,
      value: Math.max(10, Math.min(100, sg.value ?? 60)),
      achieved: false,
    };
    gsCopy.instrumental = [newGoal, ...gsCopy.instrumental];
    stage.recordGoalMutation({
      mutation_id: randomUUID(),
      char_id: charId,
      turn_index: turnIndex,
      trigger_event_id: triggerEventId,
      mutation_type: 'subgoal_added',
      description: `${sheet.name} replanned: "${sg.description}"`,
      new_subgoal: sg.description,
    } satisfies GoalMutation);
  }
  gsCopy.last_planned_at = turnIndex;
  stage.updateGoalStack(charId, gsCopy);
  logger.info('goal_replan', { agent: sheet.name, newGoals: raw.new_subgoals?.length ?? 0 });
}
