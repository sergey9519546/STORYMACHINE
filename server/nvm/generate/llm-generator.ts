// LLM-backed CandidateGenerator (Wave 15).
// Formats a GenerationSpec into a structured Gemini prompt and parses the
// JSON response into NarrativeTransitionIR candidates.
// Falls back to a structural stub if the LLM is unavailable or fails.

import type { NarrativeTransitionIR, SceneFunction } from '../ir/NarrativeTransitionIR.ts';
import type { StoryOp } from '../ops/StoryOp.ts';
import type { CandidateGenerator, GenerationSpec } from './proof-spec.ts';

// ── Structural stub (used when LLM is unavailable) ────────────────────────────

function stubIR(spec: GenerationSpec, idx: number): NarrativeTransitionIR {
  const ops: StoryOp[] = [
    { op: 'UPDATE_READER_STATE', delta: { suspense: 5 + idx * 2, curiosity: 3 } },
    { op: 'ADD_FACT', fact: {
      factId: `stub-fact-${spec.target.sceneIdx}-${idx}`,
      subject: 'scene', predicate: 'contains', object: `event_${idx}`,
      addedAtTurn: spec.target.sceneIdx, validFrom: spec.target.sceneIdx, validTo: null,
    }},
  ];
  return {
    transitionId: `stub-${spec.target.sceneIdx}-${idx}-${Date.now()}`,
    sceneIdx: spec.target.sceneIdx,
    sceneFunction: spec.target.sceneFunction,
    activeMechanisms: spec.target.activeMechanisms,
    beforeStateHash: 'stub',
    ops,
    preconditions: [],
    postconditions: [],
    provenance: { origin: 'model_generated', createdAt: Date.now(), model: 'stub' },
  };
}

// ── Parse LLM JSON response into IRs ─────────────────────────────────────────

function parseOp(raw: Record<string, unknown>): StoryOp | null {
  try {
    const opStr = raw['op'];
    if (typeof opStr !== 'string') return null;
    const op = opStr;
    const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
    switch (op) {
      case 'ADD_FACT': {
        const fact = raw['fact'];
        if (!isObj(fact)) return null;
        // Validate all required AtomicFact fields
        if (typeof fact['factId'] !== 'string' ||
            typeof fact['subject'] !== 'string' ||
            typeof fact['predicate'] !== 'string' ||
            typeof fact['object'] !== 'string') return null;
        const addedAtTurn = typeof fact['addedAtTurn'] === 'number' ? fact['addedAtTurn'] : 0;
        const validFrom   = typeof fact['validFrom']   === 'number' ? fact['validFrom']   : 0;
        const validTo     = fact['validTo'] === null ? null : (typeof fact['validTo'] === 'number' ? fact['validTo'] : null);
        return { op: 'ADD_FACT', fact: {
          factId: fact['factId'] as string, subject: fact['subject'] as string,
          predicate: fact['predicate'] as string, object: fact['object'] as string,
          addedAtTurn, validFrom, validTo,
        }};
      }
      case 'EXPIRE_FACT': {
        if (typeof raw['factId'] !== 'string') return null;
        return { op: 'EXPIRE_FACT', factId: raw['factId'], atTurn: typeof raw['atTurn'] === 'number' ? raw['atTurn'] : 0 };
      }
      case 'UPDATE_BELIEF': {
        const belief = raw['belief'];
        const charId = raw['charId'];
        if (!isObj(belief) || typeof belief['proposition'] !== 'string' || typeof charId !== 'string') return null;
        return { op: 'UPDATE_BELIEF', charId, belief: belief as unknown as StoryOp & { op: 'UPDATE_BELIEF' } extends { belief: infer B } ? B : never };
      }
      case 'APPRAISE_EMOTION': {
        const emotion = raw['emotion'];
        const charId  = raw['charId'];
        if (!isObj(emotion) || typeof charId !== 'string') return null;
        return { op: 'APPRAISE_EMOTION', charId, emotion: emotion as unknown as StoryOp & { op: 'APPRAISE_EMOTION' } extends { emotion: infer E } ? E : never };
      }
      case 'SHIFT_RELATIONSHIP': {
        const pair = raw['pair'];
        if (!Array.isArray(pair) || pair.length < 2 || typeof pair[0] !== 'string' || typeof pair[1] !== 'string') return null;
        if (!isObj(raw['delta'])) return null;
        return { op: 'SHIFT_RELATIONSHIP', pair: pair as [string, string], delta: raw['delta'] as unknown as StoryOp & { op: 'SHIFT_RELATIONSHIP' } extends { delta: infer D } ? D : never };
      }
      case 'ADVANCE_OBJECT_ARC': {
        if (typeof raw['objectId'] !== 'string' || typeof raw['toState'] !== 'string') return null;
        return { op: 'ADVANCE_OBJECT_ARC', objectId: raw['objectId'], toState: raw['toState'] };
      }
      case 'TRIGGER_RULE': {
        if (typeof raw['mechanismId'] !== 'string' || typeof raw['ruleId'] !== 'string') return null;
        return { op: 'TRIGGER_RULE', mechanismId: raw['mechanismId'], ruleId: raw['ruleId'] };
      }
      case 'SEED_CLUE':
        if (typeof raw['clueId'] !== 'string') return null;
        return { op, clueId: raw['clueId'], carrier: (raw['carrier'] ?? 'object') as StoryOp & { op: 'SEED_CLUE' } extends { carrier: infer C } ? C : never };
      case 'PAYOFF_SETUP':
        if (typeof raw['setupId'] !== 'string' || typeof raw['payoffEventId'] !== 'string') return null;
        return { op, setupId: raw['setupId'], payoffEventId: raw['payoffEventId'] };
      case 'RAISE_CLOCK':
        if (typeof raw['clockId'] !== 'string') return null;
        const rawAmt = raw['amount'];
        const parsedAmt = typeof rawAmt === 'number' ? rawAmt : (typeof rawAmt === 'string' ? parseFloat(rawAmt) : 1);
        return { op, clockId: raw['clockId'], amount: isFinite(parsedAmt) ? parsedAmt : 1 };
      case 'ADVANCE_THEME_ARGUMENT':
        if (typeof raw['claimId'] !== 'string') return null;
        return { op, claimId: raw['claimId'], move: (raw['move'] ?? 'support') as StoryOp & { op: 'ADVANCE_THEME_ARGUMENT' } extends { move: infer M } ? M : never };
      case 'UPDATE_READER_STATE': {
        if (!isObj(raw['delta'])) return null;
        return { op, delta: raw['delta'] as unknown as StoryOp & { op: 'UPDATE_READER_STATE' } extends { delta: infer D } ? D : never };
      }
      case 'RECORD_VISUAL_FACT': {
        if (typeof raw['fact'] !== 'string') return null;
        return { op: 'RECORD_VISUAL_FACT', sceneId: String(raw['sceneId'] ?? ''), fact: raw['fact'] };
      }
      case 'RECORD_SONIC_FACT': {
        if (typeof raw['fact'] !== 'string') return null;
        return { op: 'RECORD_SONIC_FACT', sceneId: String(raw['sceneId'] ?? ''), fact: raw['fact'] };
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

function parseIR(raw: unknown, spec: GenerationSpec, idx: number): NarrativeTransitionIR {
  const obj = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {};
  const rawOps = Array.isArray(obj['ops']) ? obj['ops'] as unknown[] : [];
  const ops: StoryOp[] = rawOps
    .map(o => parseOp(o as Record<string, unknown>))
    .filter((o): o is StoryOp => o !== null);

  if (ops.length === 0) return stubIR(spec, idx);

  return {
    transitionId: String(obj['transitionId'] ?? `llm-${spec.target.sceneIdx}-${idx}-${Date.now()}`),
    sceneIdx: spec.target.sceneIdx,
    sceneFunction: (obj['sceneFunction'] as SceneFunction | undefined) ?? spec.target.sceneFunction,
    activeMechanisms: spec.target.activeMechanisms,
    beforeStateHash: 'llm-generated',
    ops,
    preconditions: Array.isArray(obj['preconditions']) ? obj['preconditions'] as string[] : [],
    postconditions: Array.isArray(obj['postconditions']) ? obj['postconditions'] as string[] : [],
    provenance: { origin: 'model_generated', createdAt: Date.now(), model: 'gemini' },
    causalLinks: Array.isArray(obj['causalLinks'])
      ? (obj['causalLinks'] as Array<{ opIdx: number; causedBy: string[] }>)
          .filter(link => typeof link.opIdx === 'number' && link.opIdx >= 0 && link.opIdx < ops.length)
      : undefined,
  };
}

// ── The generator ─────────────────────────────────────────────────────────────

const IR_SCHEMA = {
  type: 'object',
  properties: {
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          transitionId: { type: 'string' },
          sceneFunction: { type: 'string', enum: ['advance_plot','reveal_character','build_tension','provide_relief','set_up_payoff','establish_world'] },
          ops: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                op: { type: 'string' },
              },
              required: ['op'],
            },
          },
          preconditions: { type: 'array', items: { type: 'string' } },
          postconditions: { type: 'array', items: { type: 'string' } },
          causalLinks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                opIdx: { type: 'number' },
                causedBy: { type: 'array', items: { type: 'string' } },
              },
              required: ['opIdx', 'causedBy'],
            },
          },
        },
        required: ['transitionId', 'sceneFunction', 'ops'],
      },
    },
  },
  required: ['candidates'],
};

export function makeLLMCandidateGenerator(): CandidateGenerator {
  return async (spec: GenerationSpec, n: number): Promise<NarrativeTransitionIR[]> => {
    // Dynamic import to avoid circular dependency at module load time.
    let provider: import('../../engine/ai.ts').LLMProvider;
    let candidateModel: string;
    try {
      const ai = await import('../../engine/ai.ts');
      provider = ai.geminiProvider;
      candidateModel = ai.modelForTask('CANDIDATE');
      // Test that the provider is usable (key present)
      ai.getAI();
    } catch {
      // No key or provider unavailable — use stubs
      return Array.from({ length: n }, (_, i) => stubIR(spec, i));
    }

    const userPrompt = [
      spec.systemPreamble,
      '',
      `Generate exactly ${n} scene transition candidate(s) as a JSON object with a "candidates" array.`,
      'Each candidate must include: transitionId (unique string), sceneFunction, ops (array of StoryOps),',
      'preconditions (string[]), postconditions (string[]), and optionally causalLinks.',
      '',
      'StoryOp kinds and their REQUIRED fields (use exactly these structures):',
      '  ADD_FACT: {"op":"ADD_FACT","fact":{"factId":"<unique-id>","subject":"<entity>","predicate":"<verb>","object":"<value>","addedAtTurn":' + spec.target.sceneIdx + ',"validFrom":' + spec.target.sceneIdx + ',"validTo":null}}',
      '  UPDATE_BELIEF: {"op":"UPDATE_BELIEF","charId":"<charId>","belief":{"id":"<unique-id>","proposition":"<what they believe>","confidence":0.8,"source":"witnessed","source_event_id":"<eventId>","acquired_at":' + spec.target.sceneIdx + '}}',
      '  APPRAISE_EMOTION: {"op":"APPRAISE_EMOTION","charId":"<charId>","emotion":{"joy":0,"distress":70,"anger":0,"fear":0,"pride":0,"shame":0,"dominant":"distress","intensity":70,"last_updated_at":' + spec.target.sceneIdx + '}}',
      '  SHIFT_RELATIONSHIP: {"op":"SHIFT_RELATIONSHIP","pair":["<charA>","<charB>"],"delta":{"dimension":"trust","amount":-0.3,"reason":"<why it shifted>"}}',
      '  SEED_CLUE: {"op":"SEED_CLUE","clueId":"<unique-id>","carrier":"line"}',
      '  PAYOFF_SETUP: {"op":"PAYOFF_SETUP","setupId":"<clueId-from-state>","payoffEventId":"<eventId>"}',
      '  RAISE_CLOCK: {"op":"RAISE_CLOCK","clockId":"<unique-id>","amount":2}',
      '  ADVANCE_THEME_ARGUMENT: {"op":"ADVANCE_THEME_ARGUMENT","claimId":"<unique-id>","move":"support"}',
      '  UPDATE_READER_STATE: {"op":"UPDATE_READER_STATE","delta":{"suspense":15,"curiosity":10}}',
      '  RECORD_VISUAL_FACT: {"op":"RECORD_VISUAL_FACT","sceneId":"s' + spec.target.sceneIdx + '","fact":"<specific visual detail>"}',
      '  RECORD_SONIC_FACT: {"op":"RECORD_SONIC_FACT","sceneId":"s' + spec.target.sceneIdx + '","fact":"<specific sound detail>"}',
      '',
      'Use 3–6 ops per candidate. Include at least one tension-raising op (RAISE_CLOCK, SHIFT_RELATIONSHIP, or APPRAISE_EMOTION).',
      'causalLinks: array of {"opIdx": N, "causedBy": [M]} explaining which op caused which.',
    ].join('\n');

    try {
      const response = await provider.generate({
        model: candidateModel,
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: IR_SCHEMA,
          temperature: 0.9,
        },
      });

      const text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const parsed = JSON.parse(text) as { candidates?: unknown[] };
      const rawCandidates = parsed.candidates ?? [];

      const irs = rawCandidates.slice(0, n).map((c, i) => parseIR(c, spec, i));
      // Pad with stubs if LLM returned fewer than requested
      while (irs.length < n) irs.push(stubIR(spec, irs.length));
      return irs;
    } catch {
      return Array.from({ length: n }, (_, i) => stubIR(spec, i));
    }
  };
}
