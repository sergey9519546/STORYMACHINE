import { Type } from '@google/genai';
import { randomUUID } from 'crypto';
import { getTemperature, generateContent, modelForTask } from './ai.ts';
import type {
  CharacterSheet,
  NarrativeAction,
  ActionLogEntry,
  Location,
  Belief,
  TheoryOfMind,
  BeliefSource,
  EpistemicUpdate,
  Goal,
  GoalStack,
  GoalMutation,
  PersuasionRecord,
} from './types.ts';
import { Stage } from './Stage.ts';
import { safeJsonParse } from '../lib/json.ts';
import { logger } from '../lib/logger.ts';
import { sanitizeForPrompt } from '../lib/prompt-utils.ts';
import { consolidateBeliefs, decayBeliefConfidence } from '../lib/memory.ts';
import { detectSemanticContradictions } from '../lib/embeddings.ts';
import { getReadyGoals } from './agent/psychology.ts';
// M4: delegate prompt-building and action-selection to agent/decision.ts
import { buildPrompt, selectBestAction } from './agent/decision.ts';
// M4: delegate reflection synthesis and goal replanning to agent/memory.ts
import { synthesizeReflectionsFor, replanGoalsFor } from './agent/memory.ts';
// Run 13 (keyless deterministic simulation): rule-based fallbacks for both
// takeTurn (when selectBestAction returns null) and updateEpistemics (when
// the LLM call fails/is absent) — see agent/deterministic.ts's header for
// the full design.
import { buildDeterministicEpistemics, composeDeterministicAction } from './agent/deterministic.ts';
import type { EpistemicsFallbackResult } from './agent/deterministic.ts';

// ── Agent class ──────────────────────────────────────────────────────────────

export class Agent {
  private sheet: CharacterSheet;
  private stage: Stage;
  private _reflectionInFlight = false;
  // Persuasion strategies computed in buildEnhancedPrompt; written to DB in takeTurn.
  private _pendingPersuasionStrategies = new Map<string, string>();
  // Circuit breaker: cap consecutive replan attempts so a perpetually-blocked
  // goal stack cannot cause an infinite replanning loop.
  private _replanAttempts = 0;

  constructor(sheet: CharacterSheet, stage: Stage) {
    this.sheet = sheet;
    this.stage = stage;
  }

  // Re-hydrate sheet from Stage so we always have current state
  private refreshSheet(): void {
    const fresh = this.stage.getAgent(this.sheet.char_id);
    if (fresh) this.sheet = fresh;
  }

  // M4: delegates to agent/decision.ts (buildPrompt + selectBestAction).
  public async takeTurn(): Promise<NarrativeAction> {
    this.refreshSheet();

    const currentNode = this.stage.getLocation(this.sheet.current_location_id);
    if (!currentNode) throw new Error('Agent is in an invalid location');

    const sensoryFilter = this.stage.getSensoryFilter(this.sheet.current_location_id);
    const otherAgents = this.stage.getAgentsInLocation(this.sheet.current_location_id)
      .filter(a => a.char_id !== this.sheet.char_id);

    const { prompt, pendingStrategies, consumedPressureIds } = buildPrompt(
      this.sheet, this.stage, currentNode, sensoryFilter, otherAgents,
    );
    this._pendingPersuasionStrategies = pendingStrategies;

    const action = await selectBestAction(this.sheet, this.stage, prompt);

    // Write persuasion records exactly once per turn, after the action is chosen.
    const currentTurn = this.stage.getTurnCount();
    for (const [targetId, strategy] of this._pendingPersuasionStrategies) {
      this.stage.recordPersuasion({
        id: randomUUID(),
        agent_id: this.sheet.char_id,
        target_id: targetId,
        strategy: strategy as import('./types.ts').PersuasionStrategy,
        turn: currentTurn,
      });
    }
    this._pendingPersuasionStrategies.clear();

    // Mark dramatic pressures consumed only after action is confirmed — prevents
    // pressures being wasted if selectBestAction fails or times out.
    for (const pressureId of consumedPressureIds) {
      this.stage.markPressureApplied(pressureId);
    }

    // Run 13: selectBestAction returns null only on missing key / timeout /
    // parse failure — the rule-based composer reuses this SAME turn's
    // (sheet, currentNode, otherAgents) so the fallback action is grounded in
    // identical state to what the LLM prompt would have seen.
    return action ?? composeDeterministicAction(this.sheet, this.stage, currentNode, otherAgents);
  }

  // ── Epistemic update (replaces evaluateState) ────────────────────────────────
  // Called after each turn to update beliefs + theory of mind based on what was observed.

  public async updateEpistemics(recentActions: ActionLogEntry[]): Promise<EpistemicUpdate> {
    const empty: EpistemicUpdate = {
      char_id: this.sheet.char_id,
      new_beliefs: [],
      contradiction_detected: false,
      contradicted_propositions: [],
    };
    if (recentActions.length === 0) return empty;
    this.refreshSheet();

    const observableActions = recentActions.filter(
      a => a.location_id === this.sheet.current_location_id || a.char_id === this.sheet.char_id,
    );
    if (observableActions.length === 0) return empty;

    const otherAgentsInRoom = this.stage.getAgentsInLocation(this.sheet.current_location_id)
      .filter(a => a.char_id !== this.sheet.char_id);

    // Numbered so Gemini can reference by index when reporting source_action_index.
    // LIE appears as SPEAK — epistemic isolation: the character doesn't know which statements are lies.
    const actionSummary = observableActions.map((a, i) => {
      const name = sanitizeForPrompt(this.stage.getAgent(a.char_id)?.name ?? 'Unknown', 128);
      const tag = a.action_type === 'LIE' ? 'SPEAK' : a.action_type;
      return `[${i}] [${tag}] ${name}: ${a.content}`;
    }).join('\n');

    const currentBeliefsSummary = (this.sheet.beliefs ?? [])
      .slice(0, 8)
      .map(b => `"${b.proposition}" (${Math.round(b.confidence * 100)}%)`)
      .join(', ');

    const otherAgentNames = otherAgentsInRoom.map(a => sanitizeForPrompt(a.name, 128)).join(', ');

    // ToM² context: what do you think others know / believe?
    const tomSummary = Object.values(this.sheet.theoryOfMind ?? {}).slice(0, 3).map(tom => {
      const n = sanitizeForPrompt(this.stage.getAgent(tom.subject_id)?.name ?? tom.subject_id, 128);
      return `  - You believe ${n} knows: ${tom.believed_knowledge.slice(0, 2).map(k => sanitizeForPrompt(k, 300)).join('; ') || 'nothing confirmed'}`;
    }).join('\n');

    const prompt = `You are ${sanitizeForPrompt(this.sheet.name, 256)}. You just witnessed these events:

${actionSummary}

Your existing beliefs: ${currentBeliefsSummary || 'none yet'}
Others in the room: ${otherAgentNames || 'none'}
Your motive: ${sanitizeForPrompt(this.sheet.hidden_motive)}

LEVEL-2 THEORY OF MIND (what you think others know):
${tomSummary || '  (No established models yet.)'}

Based on what you just witnessed:
1. Has your suspicion level changed? (0-100)
2. What NEW facts did you learn or deduce? (Be specific propositions)
3. Update your model of each other agent — what do you now think their motive is, and what do THEY now think YOU know?
4. Did anything you observed contradict what you believed?
5. Level-3 ToM: What do you think each other agent believes that YOU believe about THEM? (meta-epistemic inference)`;

    const response = await generateContent({
      model: modelForTask('EPISTEMICS'),
      contents: prompt,
      config: {
        temperature: getTemperature(),
        systemInstruction: `You are updating the internal state of ${sanitizeForPrompt(this.sheet.name, 256)} based on recent observations.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            newSuspicionScore: { type: Type.INTEGER, description: '0-100' },
            newBeliefs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  proposition: { type: Type.STRING },
                  confidence: { type: Type.NUMBER, description: '0.0-1.0' },
                  source: { type: Type.STRING, enum: ['witnessed', 'told', 'inferred'] },
                  source_action_index: {
                    type: Type.INTEGER,
                    description: 'Index (0-based) of the action in the numbered list that caused this belief. -1 if not traceable to a specific action.',
                    nullable: true,
                  },
                },
                required: ['proposition', 'confidence', 'source'],
              },
            },
            contradicted_propositions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Verbatim text of prior beliefs that the new observations contradict.',
            },
            updatedTheoryOfMind: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  agent_name: { type: Type.STRING },
                  believed_motive: { type: Type.STRING },
                  trust_level: { type: Type.NUMBER, description: '0.0-1.0' },
                  affinity: { type: Type.NUMBER, nullable: true, description: '0.0-1.0: emotional warmth/liking' },
                  power_balance: { type: Type.NUMBER, nullable: true, description: '0=they dominate, 0.5=equal, 1=I dominate' },
                  debt: { type: Type.NUMBER, nullable: true, description: '0.0-1.0: obligation I feel toward them' },
                  new_believed_knowledge: { type: Type.ARRAY, items: { type: Type.STRING } },
                  shared_history_event: { type: Type.STRING, nullable: true, description: 'A memorable joint event to add to shared history, or null.' },
                },
                required: ['agent_name', 'believed_motive', 'trust_level'],
              },
            },
            contradiction_detected: { type: Type.BOOLEAN },
            goal_stack_update: {
              type: Type.OBJECT,
              nullable: true,
              properties: {
                add_subgoal: { type: Type.STRING, nullable: true, description: 'A new instrumental subgoal to prepend, or null.' },
                mark_achieved: { type: Type.STRING, nullable: true, description: 'Exact or partial description of the subgoal now achieved, or null.' },
              },
            },
            level2_tom: {
              type: Type.ARRAY,
              description: 'Level-2 Theory of Mind: what you now believe each other agent believes about you or the situation.',
              items: {
                type: Type.OBJECT,
                properties: {
                  about_agent: { type: Type.STRING, description: 'Name of the agent whose beliefs you are modeling.' },
                  they_believe_about_you: { type: Type.STRING },
                  confidence: { type: Type.NUMBER, description: '0.0-1.0' },
                },
                required: ['about_agent', 'they_believe_about_you', 'confidence'],
              },
            },
            level3_tom: {
              type: Type.ARRAY,
              description: 'Level-3 Theory of Mind: what you believe each other agent believes ABOUT WHAT YOU BELIEVE about them.',
              items: {
                type: Type.OBJECT,
                properties: {
                  about_agent: { type: Type.STRING },
                  they_believe_you_believe: { type: Type.STRING, description: 'What they think you think about them.' },
                  confidence: { type: Type.NUMBER, description: '0.0-1.0' },
                },
                required: ['about_agent', 'they_believe_you_believe', 'confidence'],
              },
            },
          },
          required: ['newSuspicionScore', 'newBeliefs', 'updatedTheoryOfMind', 'contradiction_detected', 'contradicted_propositions'],
        },
      },
    }, { label: `updateEpistemics:${this.sheet.name}`, timeoutMs: 30_000 }).catch(err => {
      const e = err as Error;
      logger.error('agent_ai_error', {
        agent: this.sheet.name,
        method: 'updateEpistemics',
        error_type: e.message.includes('timeout') ? 'timeout' : 'upstream',
        message: e.message,
      });
      return null;
    });

    // Run 13: previously `if (!response) return empty;` here — beliefs/ToM
    // were completely frozen keylessly. Instead, synthesize a rule-based
    // `result` in the IDENTICAL shape the LLM branch parses its JSON into
    // (EpistemicsFallbackResult mirrors the inline type below field-for-
    // field). Every line AFTER this block — belief merge, ToM merge,
    // goal-stack mutation, deadlock detection, reflection scheduling — is
    // then genuinely shared by both paths; the Orchestrator's before/after
    // ToM/emotion diffing (→ SHIFT_RELATIONSHIP / APPRAISE_EMOTION ops) needs
    // no special-casing to see a keyless turn's output, because by this point
    // there is no distinction left to special-case.
    const epistemicsRawText = response?.text ?? '{}';
    const result: EpistemicsFallbackResult = response
      ? safeJsonParse<EpistemicsFallbackResult>(epistemicsRawText, {
          newSuspicionScore: this.sheet.suspicion_score,
          newBeliefs: [],
          updatedTheoryOfMind: [],
          contradiction_detected: false,
          contradicted_propositions: [],
        })
      : buildDeterministicEpistemics(this.sheet, observableActions, otherAgentsInRoom);
    const usedDeterministicFallback = !response;
    if (response && !result.newBeliefs?.length && epistemicsRawText.length > 10) {
      logger.warn('agent_parse_fallback', { agent: this.sheet.name, method: 'updateEpistemics', preview: epistemicsRawText.substring(0, 120) });
    }

    // ── Update suspicion ──
    this.stage.updateAgentSuspicion(this.sheet.char_id, result.newSuspicionScore);

    // ── Merge new beliefs (deduplicate by proposition substring) ──
    const existingBeliefs = this.sheet.beliefs ?? [];
    const existingProps = new Set(existingBeliefs.map(b => b.proposition.toLowerCase()));
    const freshBeliefs: Belief[] = result.newBeliefs
      .filter(b => b.proposition && !existingProps.has(b.proposition.toLowerCase()))
      .map(b => {
        // Resolve source agent + event from the indexed action list
        const srcIdx = typeof b.source_action_index === 'number'
          && b.source_action_index >= 0
          && b.source_action_index < observableActions.length
          ? b.source_action_index : null;
        const srcAction = srcIdx !== null ? observableActions[srcIdx] : null;
        const rawConf = b.confidence;
        return {
          id: randomUUID(),
          proposition: b.proposition,
          confidence: typeof rawConf === 'number' && isFinite(rawConf) ? Math.max(0, Math.min(1, rawConf)) : 0.5,
          source: (b.source as BeliefSource) ?? 'inferred',
          source_agent_id: srcAction?.char_id,
          source_event_id: srcAction?.action_id,
          acquired_at: this.stage.getTurnCount(),
        };
      });

    const mergedBeliefs = [...existingBeliefs, ...freshBeliefs];
    const currentTurn = this.stage.getTurnCount();

    // Every 5 turns: decay confidence on unwitnessed beliefs, then consolidate.
    const finalBeliefs = (currentTurn > 0 && currentTurn % 5 === 0)
      ? consolidateBeliefs(decayBeliefConfidence(mergedBeliefs), currentTurn)
      : mergedBeliefs;

    // Semantic contradiction detection (every 5 turns): supplement Jaccard with embeddings
    // C6: wrapped in try-catch — embedding provider failure must not crash the epistemic update.
    if (currentTurn > 0 && currentTurn % 5 === 0 && freshBeliefs.length > 0) {
      try {
        const semanticPairs = await detectSemanticContradictions(existingBeliefs, freshBeliefs);
        for (const { existing_id, new_id, similarity } of semanticPairs) {
          // Annotate both beliefs in finalBeliefs with the contradicts field
          const eb = finalBeliefs.find(b => b.id === existing_id);
          const nb = finalBeliefs.find(b => b.id === new_id);
          if (eb && nb) {
            eb.contradicts = [...new Set([...(eb.contradicts ?? []), new_id])];
            nb.contradicts = [...new Set([...(nb.contradicts ?? []), existing_id])];
            logger.info('semantic_contradiction', { agent: this.sheet.name, similarity: similarity.toFixed(2), a: eb.proposition.slice(0, 60), b: nb.proposition.slice(0, 60) });
          }
        }
      } catch (embedErr) {
        logger.warn('semantic_contradiction_skipped', { agent: this.sheet.name, reason: (embedErr as Error).message });
        // Continue with undetected semantic contradictions — Jaccard-based detection still ran above.
      }
    }

    if (finalBeliefs.length !== existingBeliefs.length || freshBeliefs.length > 0) {
      this.stage.updateAgentBeliefs(this.sheet.char_id, finalBeliefs);
      // Also add high-confidence beliefs to legacy knowledge_vector
      const highConf = freshBeliefs.filter(b => b.confidence >= 0.7).map(b => b.proposition);
      if (highConf.length > 0) this.stage.updateAgentKnowledge(this.sheet.char_id, highConf);
    }

    // ── Update theory of mind + CICERO trust decay ──
    {
      const currentToM = { ...(this.sheet.theoryOfMind ?? {}) };
      const observedIds = new Set<string>();

      for (const entry of result.updatedTheoryOfMind) {
        const targetAgent = otherAgentsInRoom.find(a => a.name === entry.agent_name);
        if (!targetAgent) continue;
        observedIds.add(targetAgent.char_id);
        const existing = currentToM[targetAgent.char_id];
        const clamp01 = (v: number | null | undefined) =>
          typeof v === 'number' && isFinite(v) ? Math.max(0, Math.min(1, v)) : undefined;
        const newHistoryEvent = entry.shared_history_event?.trim() || null;
        const rawTrust = entry.trust_level;
        currentToM[targetAgent.char_id] = {
          subject_id: targetAgent.char_id,
          believed_motive: entry.believed_motive,
          trust_level: typeof rawTrust === 'number' && isFinite(rawTrust) ? Math.max(0, Math.min(1, rawTrust)) : 0.5,
          believed_knowledge: [
            ...(existing?.believed_knowledge ?? []),
            ...(entry.new_believed_knowledge ?? []),
          ].slice(0, 20),
          affinity: clamp01(entry.affinity) ?? existing?.affinity,
          power_balance: clamp01(entry.power_balance) ?? existing?.power_balance,
          debt: clamp01(entry.debt) ?? existing?.debt,
          shared_history: newHistoryEvent
            ? [...(existing?.shared_history ?? []), newHistoryEvent].slice(-10)
            : existing?.shared_history,
        } satisfies TheoryOfMind;
      }

      // E: CICERO trust decay — unobserved agents lose 0.01 trust per update
      for (const [agentId, tom] of Object.entries(currentToM)) {
        if (!observedIds.has(agentId)) {
          currentToM[agentId] = { ...tom, trust_level: Math.max(0, Math.min(1, tom.trust_level - 0.01)) };
        }
      }

      // C: Level-2 ToM — store as extra believed_knowledge entries prefixed "[L2]"
      for (const l2 of (result.level2_tom ?? [])) {
        const targetAgent = otherAgentsInRoom.find(a => a.name === l2.about_agent);
        if (!targetAgent || l2.confidence < 0.4) continue;
        const entry = currentToM[targetAgent.char_id];
        if (entry) {
          const l2Fact = `[L2] They believe about you: ${l2.they_believe_about_you}`;
          if (!entry.believed_knowledge.includes(l2Fact)) {
            entry.believed_knowledge = [...entry.believed_knowledge, l2Fact].slice(0, 20);
          }
        }
      }

      // D: Level-3 ToM — what they think you think about them, prefixed "[L3]"
      for (const l3 of (result.level3_tom ?? [])) {
        const targetAgent = otherAgentsInRoom.find(a => a.name === l3.about_agent);
        if (!targetAgent || l3.confidence < 0.4) continue;
        const entry = currentToM[targetAgent.char_id];
        if (entry) {
          const l3Fact = `[L3] They think you believe: ${l3.they_believe_you_believe}`;
          if (!entry.believed_knowledge.includes(l3Fact)) {
            entry.believed_knowledge = [...entry.believed_knowledge, l3Fact].slice(0, 20);
          }
        }
      }

      this.stage.updateTheoryOfMind(this.sheet.char_id, currentToM);
    }

    // ── Self-directed goal stack mutation ──
    // Record GoalMutation rows so AppraisalEngine can appraise joy/distress correctly.
    const gsu = result.goal_stack_update;
    if (gsu) {
      this.refreshSheet();
      const gsRaw = this.sheet.goalStack;
      if (gsRaw) {
        // Work on a shallow copy so this.sheet.goalStack is NOT mutated in-place.
        const gs: GoalStack = { ...gsRaw, instrumental: [...gsRaw.instrumental] };
        const pendingMutations: GoalMutation[] = [];
        const triggerEventId = observableActions[observableActions.length - 1]?.action_id ?? 'epistemic_update';
        const turnIndex = this.stage.getTurnCount();

        if (gsu.add_subgoal) {
          // Dedup: skip if a goal with the same description already exists
          const normalised = gsu.add_subgoal.trim().toLowerCase();
          const duplicate = gs.instrumental.some(g => g.description.trim().toLowerCase() === normalised);
          if (!duplicate) {
            const newGoal: Goal = { id: randomUUID(), description: gsu.add_subgoal, value: 70, achieved: false };
            gs.instrumental = [newGoal, ...gs.instrumental];
            gs.last_planned_at = turnIndex;
            // Cap at 8: retain all active goals, trim oldest achieved ones first
            const GOAL_CAP = 8;
            if (gs.instrumental.length > GOAL_CAP) {
              const active   = gs.instrumental.filter(g => !g.achieved);
              const achieved = gs.instrumental.filter(g => g.achieved);
              gs.instrumental = [...active, ...achieved].slice(0, GOAL_CAP);
            }
            pendingMutations.push({
              mutation_id: randomUUID(),
              char_id: this.sheet.char_id,
              turn_index: turnIndex,
              trigger_event_id: triggerEventId,
              mutation_type: 'subgoal_added',
              description: `${this.sheet.name} formed new subgoal: "${gsu.add_subgoal}"`,
              new_subgoal: gsu.add_subgoal,
            });
          } // end !duplicate
        }

        if (gsu.mark_achieved) {
          const needle = gsu.mark_achieved.toLowerCase();
          const idx = gs.instrumental.findIndex(g => g.description.toLowerCase().includes(needle));
          if (idx >= 0) {
            const achieved = gs.instrumental[idx];
            // Immutable update — shallow copy means elements are shared references; mutate via replacement.
            gs.instrumental[idx] = { ...achieved, achieved: true };
            pendingMutations.push({
              mutation_id: randomUUID(),
              char_id: this.sheet.char_id,
              turn_index: turnIndex,
              trigger_event_id: triggerEventId,
              mutation_type: 'subgoal_achieved',
              description: `${this.sheet.name} achieved subgoal: "${achieved.description}"`,
              old_subgoal: achieved.description,
            });
            // Promote to terminal achievement when all instrumental goals are done.
            // This is the primary climax trigger (_isClimaxReached) — without this,
            // the "terminal goal achieved → resolution" arc is permanently dead code.
            const allDone = gs.instrumental.every(g => g.achieved);
            if (allDone && !gs.terminal.achieved) {
              gs.terminal = { ...gs.terminal, achieved: true };
              pendingMutations.push({
                mutation_id: randomUUID(),
                char_id: this.sheet.char_id,
                turn_index: turnIndex,
                trigger_event_id: triggerEventId,
                mutation_type: 'subgoal_achieved',
                description: `${this.sheet.name} achieved TERMINAL GOAL: "${gs.terminal.description}"`,
                new_subgoal: gs.terminal.description,
              });
            }
          }
        }

        // H5: Write goal stack + all mutation records atomically.
        // If the first mutation has a companion goal-stack change, use the
        // atomic helper; otherwise write each mutation individually.
        if (pendingMutations.length > 0) {
          // Use the atomic helper for the first mutation (goal stack + record together).
          this.stage.updateGoalStackWithMutation(this.sheet.char_id, gs, pendingMutations[0]);
          // Write any additional mutations individually (uncommon — both branches fired).
          for (const mut of pendingMutations.slice(1)) {
            this.stage.recordGoalMutation(mut);
          }
        }
      }
    }

    // ── Goal-DAG deadlock detection: replan when all paths are blocked ──
    {
      this.refreshSheet();
      const latestGs = this.sheet.goalStack;
      const trigId = observableActions[observableActions.length - 1]?.action_id ?? 'epistemic_update';
      if (latestGs && getReadyGoals(latestGs).length === 0 && latestGs.instrumental.some(g => !g.achieved)) {
        if (this._replanAttempts < 3) {
          this._replanAttempts++;
          await this.replanGoals(trigId);
        } else {
          // After 3 failed replans, mark all active goals achieved to break the deadlock.
          // This prevents an infinite replanning loop when the LLM keeps producing
          // goals that also deadlock. The terminal goal remains unachieved (correct).
          this.refreshSheet();
          const gsNow = this.sheet.goalStack;
          if (gsNow) {
            this.stage.updateGoalStack(this.sheet.char_id, {
              ...gsNow,
              instrumental: gsNow.instrumental.map(g => ({ ...g, achieved: true })),
            });
          }
          this._replanAttempts = 0;
          logger.warn('goal_deadlock_force_clear', { agent: this.sheet.name });
        }
      } else {
        this._replanAttempts = 0;  // reset counter when goals are not blocked
      }
    }

    // ── F: Memory Stream + Reflection (every 5 turns) ──
    const turnCount = this.stage.getTurnCount();
    if (turnCount > 0 && turnCount % 5 === 0 && !this._reflectionInFlight) {
      this._reflectionInFlight = true;
      this.synthesizeReflections()
        .catch(e => logger.warn('agent_reflection_error', { agent: this.sheet.name, message: (e as Error).message }))
        .finally(() => { this._reflectionInFlight = false; });
    }

    return {
      char_id: this.sheet.char_id,
      new_beliefs: freshBeliefs,
      contradiction_detected: result.contradiction_detected ?? false,
      contradicted_propositions: result.contradicted_propositions ?? [],
      source_event_id: observableActions.length > 0 ? observableActions[observableActions.length - 1].action_id : undefined,
      ...(usedDeterministicFallback ? { deterministic: true } : {}),
    };
  }

  // M4: delegates to agent/memory.ts (synthesizeReflectionsFor).
  private async synthesizeReflections(): Promise<void> {
    return synthesizeReflectionsFor(this.sheet.char_id, this.stage);
  }

  // M4: delegates to agent/memory.ts (replanGoalsFor).
  private async replanGoals(triggerEventId: string): Promise<void> {
    return replanGoalsFor(this.sheet.char_id, this.stage, triggerEventId);
  }

  // ── Legacy evaluateState — kept for backward compatibility ──────────────────
  public async evaluateState(recentActions: ActionLogEntry[]): Promise<EpistemicUpdate> {
    return this.updateEpistemics(recentActions);
  }
}
