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
    const op = raw['op'] as string;
    switch (op) {
      case 'ADD_FACT':
        return { op, fact: raw['fact'] as StoryOp & { op: 'ADD_FACT' } extends { fact: infer F } ? F : never };
      case 'UPDATE_BELIEF':
        return { op, charId: raw['charId'] as string, belief: raw['belief'] as StoryOp & { op: 'UPDATE_BELIEF' } extends { belief: infer B } ? B : never };
      case 'APPRAISE_EMOTION':
        return { op, charId: raw['charId'] as string, emotion: raw['emotion'] as StoryOp & { op: 'APPRAISE_EMOTION' } extends { emotion: infer E } ? E : never };
      case 'SHIFT_RELATIONSHIP':
        return { op, pair: raw['pair'] as [string, string], delta: raw['delta'] as StoryOp & { op: 'SHIFT_RELATIONSHIP' } extends { delta: infer D } ? D : never };
      case 'SEED_CLUE':
        return { op, clueId: raw['clueId'] as string, carrier: (raw['carrier'] ?? 'object') as StoryOp & { op: 'SEED_CLUE' } extends { carrier: infer C } ? C : never };
      case 'PAYOFF_SETUP':
        return { op, setupId: raw['setupId'] as string, payoffEventId: raw['payoffEventId'] as string };
      case 'RAISE_CLOCK':
        return { op, clockId: raw['clockId'] as string, amount: Number(raw['amount'] ?? 1) };
      case 'ADVANCE_THEME_ARGUMENT':
        return { op, claimId: raw['claimId'] as string, move: (raw['move'] ?? 'support') as StoryOp & { op: 'ADVANCE_THEME_ARGUMENT' } extends { move: infer M } ? M : never };
      case 'UPDATE_READER_STATE':
        return { op, delta: raw['delta'] as StoryOp & { op: 'UPDATE_READER_STATE' } extends { delta: infer D } ? D : never };
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
    let getModel: (tier: 'fast' | 'pro') => string;
    try {
      const ai = await import('../../engine/ai.ts');
      provider = ai.geminiProvider;
      getModel = ai.getModel;
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
      'StoryOp kinds: ADD_FACT, UPDATE_BELIEF, APPRAISE_EMOTION, SHIFT_RELATIONSHIP,',
      'SEED_CLUE, PAYOFF_SETUP, RAISE_CLOCK, ADVANCE_THEME_ARGUMENT, UPDATE_READER_STATE.',
      'Use 3–6 ops per candidate. Include at least one tension-raising op.',
    ].join('\n');

    try {
      const response = await provider.generate({
        model: getModel('fast'),
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
