import { GoogleGenAI, Type } from '@google/genai';
import { randomUUID } from 'crypto';
import type {
  CharacterSheet,
  NarrativeAction,
  ActionLogEntry,
  Location,
  Belief,
  TheoryOfMind,
  DarkTriad,
  AttachmentStyle,
  DefenseMechanism,
  BeliefSource,
} from './types.ts';
import { Stage } from './Stage.ts';
import { safeJsonParse } from '../../src/lib/json.ts';

// ── Psychology prompt helpers ────────────────────────────────────────────────

function describeAttachment(style: AttachmentStyle | undefined): string {
  switch (style) {
    case 'anxious':          return 'You cling to connection; under pressure you over-explain and seek reassurance. You avoid relocating until forced.';
    case 'avoidant':         return 'You suppress discomfort through withdrawal. When tension rises your instinct is to leave the room rather than confront.';
    case 'anxious_avoidant': return 'You simultaneously crave and fear closeness. You may provoke conflict then recoil from its consequences.';
    default:                 return 'You engage with situations directly and can regulate your responses under pressure.';
  }
}

function describeDefenses(mechanisms: DefenseMechanism[] | undefined): string {
  if (!mechanisms || mechanisms.length === 0) return '';
  const map: Record<DefenseMechanism, string> = {
    rationalization:      'You always have a logical explanation ready, even when you are in the wrong.',
    intellectualization:  'You discuss uncomfortable topics in abstract, detached terms to avoid feeling them.',
    projection:           'You attribute your own motives to others, accusing them of what you yourself are doing.',
    displacement:         'When you cannot attack the real threat, you redirect your anger at a safer target.',
    denial:               'You flatly refuse to acknowledge facts that threaten your self-concept.',
    dissociation:         'Under extreme stress you can become unnervingly calm and detached.',
    repression:           'You genuinely do not consciously register information that is too threatening.',
  };
  return mechanisms.map(m => map[m]).join(' ');
}

function describeActionBias(
  darkTriad: DarkTriad | undefined,
  attachment: AttachmentStyle | undefined,
  suspicion: number,
): string {
  const lines: string[] = [];
  const dt = darkTriad ?? { machiavellianism: 50, narcissism: 50, psychopathy: 50 };

  if (dt.machiavellianism > 70) lines.push('Your high strategic intelligence means LIE is a natural tool when it serves your goal.');
  if (dt.psychopathy > 70)       lines.push('You feel no social cost to deception; LIE carries no hesitation for you.');
  if (dt.narcissism > 70)        lines.push('You rarely back down or admit error; SPEAK is often a performance of dominance.');
  if (dt.machiavellianism < 30)  lines.push('You tend toward direct honesty; deception feels costly to you.');

  if (attachment === 'anxious')  lines.push('Right now your anxiety pulls you toward SPEAK — you need to know what others are thinking.');
  if (attachment === 'avoidant' && suspicion > 40) lines.push('Your tension is rising; RELOCATE is starting to feel appealing.');

  return lines.length > 0 ? lines.join(' ') : 'Choose whichever action best serves your immediate goal.';
}

// ── Agent class ──────────────────────────────────────────────────────────────

export class Agent {
  private sheet: CharacterSheet;
  private stage: Stage;
  private _ai: GoogleGenAI | null = null;

  constructor(sheet: CharacterSheet, stage: Stage) {
    this.sheet = sheet;
    this.stage = stage;
  }

  private get ai(): GoogleGenAI {
    if (!this._ai) {
      const key = process.env.GEMINI_API_KEY;
      if (!key) throw new Error('GEMINI_API_KEY environment variable is required');
      this._ai = new GoogleGenAI({ apiKey: key });
    }
    return this._ai;
  }

  // Re-hydrate sheet from Stage so we always have current state
  private refreshSheet(): void {
    const fresh = this.stage.getAgent(this.sheet.char_id);
    if (fresh) this.sheet = fresh;
  }

  public async takeTurn(): Promise<NarrativeAction> {
    this.refreshSheet();

    const currentNode = this.stage.getLocation(this.sheet.current_location_id);
    if (!currentNode) throw new Error('Agent is in an invalid location');

    const sensoryFilter = this.stage.getSensoryFilter(this.sheet.current_location_id);
    const otherAgents = this.stage.getAgentsInLocation(this.sheet.current_location_id)
      .filter(a => a.char_id !== this.sheet.char_id);

    const prompt = this.buildEnhancedPrompt(currentNode, sensoryFilter, otherAgents);

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        systemInstruction: `You are playing the role of ${this.sheet.name}. You must output a strict JSON object representing your next action.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            action_type: { type: Type.STRING, enum: ['SPEAK', 'EXAMINE', 'LIE', 'RELOCATE'] },
            target: { type: Type.STRING, nullable: true, description: 'Name of character being addressed, or location name if RELOCATE.' },
            content: { type: Type.STRING, description: 'The actual dialogue or action description.' },
            reasoning: { type: Type.STRING, description: 'Internal reasoning (not spoken). How this action serves your goal.' },
          },
          required: ['action_type', 'content'],
        },
      },
    });

    const raw = safeJsonParse<NarrativeAction & { reasoning?: string }>(
      response.text || '{}',
      { action_type: 'SPEAK', content: '', target: null },
    );

    return {
      action_type: raw.action_type,
      target: raw.target ?? null,
      content: raw.content,
    };
  }

  private buildEnhancedPrompt(
    node: Location,
    history: ActionLogEntry[],
    otherAgents: CharacterSheet[],
  ): string {
    // ── History block ──
    const historyStr = history.length === 0
      ? '(Silence. You are the first to speak.)'
      : history.map(e => {
          const name = this.stage.getAgent(e.char_id)?.name ?? 'Unknown';
          const tag = e.action_type === 'LIE' ? 'SPEAK' : e.action_type; // LIE appears as SPEAK to observers
          return `[${tag}] ${name}: ${e.content}`;
        }).join('\n');

    // ── Beliefs block (top 10 by confidence) ──
    const beliefs = (this.sheet.beliefs ?? [])
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10);
    const beliefsStr = beliefs.length > 0
      ? beliefs.map(b => `  - "${b.proposition}" (confidence: ${Math.round(b.confidence * 100)}%, source: ${b.source})`).join('\n')
      : '  (No established beliefs yet — you are gathering information.)';

    // ── Theory of mind block ──
    const tomEntries = Object.values(this.sheet.theoryOfMind ?? {}).slice(0, 5);
    const tomStr = tomEntries.length > 0
      ? tomEntries.map(tom => {
          const name = this.stage.getAgent(tom.subject_id)?.name ?? tom.subject_id;
          const knowledge = tom.believed_knowledge.slice(0, 3).map(k => `"${k}"`).join(', ');
          return `  - ${name}: trust=${Math.round(tom.trust_level * 100)}%, motive="${tom.believed_motive}", I think they know: [${knowledge}]`;
        }).join('\n')
      : '  (You have not yet formed models of the others here.)';

    // ── Goal block ──
    const goalStr = this.sheet.goalStack
      ? `TERMINAL OBJECTIVE: ${this.sheet.goalStack.terminal.description}\nCURRENT SUBGOAL: ${this.sheet.goalStack.instrumental[0]?.description ?? 'gather information and orient yourself'}`
      : `TERMINAL OBJECTIVE: ${this.sheet.hidden_motive}\nCURRENT SUBGOAL: Assess who in this room is a threat or an asset to your objective.`;

    // ── Psychology block ──
    const actionBias = describeActionBias(this.sheet.darkTriad, this.sheet.attachmentStyle, this.sheet.suspicion_score);

    return `You are ${this.sheet.name}. Your public persona: ${this.sheet.public_mask}

HIDDEN DIRECTIVE: Your true motive is: "${this.sheet.hidden_motive}". Never state this directly. Every action serves it.

PSYCHOLOGICAL PROFILE:
${describeAttachment(this.sheet.attachmentStyle)}
${describeDefenses(this.sheet.defenseMechanisms)}

YOUR CURRENT GOALS:
${goalStr}

WHAT YOU KNOW (your belief system):
${beliefsStr}

YOUR MODEL OF THE OTHERS IN THIS ROOM:
${tomStr}

LOCATION: ${node.name}
${node.description}
OTHERS PRESENT: ${otherAgents.map(a => a.name).join(', ') || 'no one else'}

RECENT EVENTS:
${historyStr}

BEHAVIORAL TENDENCY: ${actionBias}

Choose your next action. Output a NarrativeAction JSON. Use action_type LIE only when you are deliberately saying something you know to be false. RELOCATE only when moving to a specific named location. EXAMINE when observing something without speaking.`;
  }

  // ── Epistemic update (replaces evaluateState) ────────────────────────────────
  // Called after each turn to update beliefs + theory of mind based on what was observed.

  public async updateEpistemics(recentActions: ActionLogEntry[]): Promise<void> {
    if (recentActions.length === 0) return;
    this.refreshSheet();

    const observableActions = recentActions.filter(
      a => a.location_id === this.sheet.current_location_id || a.char_id === this.sheet.char_id,
    );
    if (observableActions.length === 0) return;

    const otherAgentsInRoom = this.stage.getAgentsInLocation(this.sheet.current_location_id)
      .filter(a => a.char_id !== this.sheet.char_id);

    const actionSummary = observableActions.map(a => {
      const name = this.stage.getAgent(a.char_id)?.name ?? 'Unknown';
      return `[${a.action_type}] ${name}: ${a.content}`;
    }).join('\n');

    const currentBeliefsSummary = (this.sheet.beliefs ?? [])
      .slice(0, 8)
      .map(b => `"${b.proposition}" (${Math.round(b.confidence * 100)}%)`)
      .join(', ');

    const otherAgentNames = otherAgentsInRoom.map(a => a.name).join(', ');

    const prompt = `You are ${this.sheet.name}. You just witnessed these events:

${actionSummary}

Your existing beliefs: ${currentBeliefsSummary || 'none yet'}
Others in the room: ${otherAgentNames || 'none'}
Your motive: ${this.sheet.hidden_motive}

Based on what you just witnessed:
1. Has your suspicion level changed? (0-100)
2. What NEW facts did you learn or deduce? (Be specific propositions)
3. Update your model of each other agent — what do you now think their motive is? Do you trust them more or less?
4. Did anything you observed contradict what you believed?`;

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        systemInstruction: `You are updating the internal state of ${this.sheet.name} based on recent observations.`,
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
                },
                required: ['proposition', 'confidence', 'source'],
              },
            },
            updatedTheoryOfMind: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  agent_name: { type: Type.STRING },
                  believed_motive: { type: Type.STRING },
                  trust_level: { type: Type.NUMBER, description: '0.0-1.0' },
                  new_believed_knowledge: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['agent_name', 'believed_motive', 'trust_level'],
              },
            },
            contradiction_detected: { type: Type.BOOLEAN },
          },
          required: ['newSuspicionScore', 'newBeliefs', 'updatedTheoryOfMind', 'contradiction_detected'],
        },
      },
    });

    const result = safeJsonParse<{
      newSuspicionScore: number;
      newBeliefs: Array<{ proposition: string; confidence: number; source: string }>;
      updatedTheoryOfMind: Array<{ agent_name: string; believed_motive: string; trust_level: number; new_believed_knowledge?: string[] }>;
      contradiction_detected: boolean;
    }>(response.text ?? '{}', {
      newSuspicionScore: this.sheet.suspicion_score,
      newBeliefs: [],
      updatedTheoryOfMind: [],
      contradiction_detected: false,
    });

    // ── Update suspicion ──
    this.stage.updateAgentSuspicion(this.sheet.char_id, result.newSuspicionScore);

    // ── Merge new beliefs (deduplicate by proposition substring) ──
    const existingBeliefs = this.sheet.beliefs ?? [];
    const existingProps = new Set(existingBeliefs.map(b => b.proposition.toLowerCase()));
    const freshBeliefs: Belief[] = result.newBeliefs
      .filter(b => b.proposition && !existingProps.has(b.proposition.toLowerCase()))
      .map(b => ({
        id: randomUUID(),
        proposition: b.proposition,
        confidence: Math.max(0, Math.min(1, b.confidence)),
        source: (b.source as BeliefSource) ?? 'inferred',
        acquired_at: this.stage.getTurnCount(),
      }));

    if (freshBeliefs.length > 0) {
      this.stage.updateAgentBeliefs(this.sheet.char_id, [...existingBeliefs, ...freshBeliefs]);
      // Also add high-confidence beliefs to legacy knowledge_vector
      const highConf = freshBeliefs.filter(b => b.confidence >= 0.7).map(b => b.proposition);
      if (highConf.length > 0) this.stage.updateAgentKnowledge(this.sheet.char_id, highConf);
    }

    // ── Update theory of mind ──
    if (result.updatedTheoryOfMind.length > 0) {
      const currentToM = { ...(this.sheet.theoryOfMind ?? {}) };
      for (const entry of result.updatedTheoryOfMind) {
        const targetAgent = otherAgentsInRoom.find(a => a.name === entry.agent_name);
        if (!targetAgent) continue;
        const existing = currentToM[targetAgent.char_id];
        currentToM[targetAgent.char_id] = {
          subject_id: targetAgent.char_id,
          believed_motive: entry.believed_motive,
          trust_level: Math.max(0, Math.min(1, entry.trust_level)),
          believed_knowledge: [
            ...(existing?.believed_knowledge ?? []),
            ...(entry.new_believed_knowledge ?? []),
          ].slice(0, 20), // cap at 20 facts per ToM entry
        } satisfies TheoryOfMind;
      }
      this.stage.updateTheoryOfMind(this.sheet.char_id, currentToM);
    }
  }

  // ── Legacy evaluateState — kept for backward compatibility ──────────────────
  public async evaluateState(recentActions: ActionLogEntry[]): Promise<void> {
    return this.updateEpistemics(recentActions);
  }
}
