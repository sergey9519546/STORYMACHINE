// LLM-backed CandidateGenerator (Wave 15).
// Formats a GenerationSpec into a structured Gemini prompt and parses the
// JSON response into NarrativeTransitionIR candidates.
// Falls back to a structural stub if the LLM is unavailable or fails.

import type { NarrativeTransitionIR, SceneFunction } from '../ir/NarrativeTransitionIR.ts';
import type { StoryOp } from '../ops/StoryOp.ts';
import type { CandidateGenerator, GenerationSpec } from './proof-spec.ts';
import { logger } from '../../lib/logger.ts';

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

/**
 * Exported for tests only (2026-09-13). IR_SCHEMA above is a declaration of
 * exactly what this function accepts, and the two drifted apart invisibly once
 * already — the schema asked for a bare `op` and this returned null for every
 * one. tests/core/llm-generator-schema.test.ts round-trips one instance of each
 * declared branch through here, so a future edit to either side that breaks the
 * other fails in CI instead of over 83 live calls.
 */
export function parseOp(raw: Record<string, unknown>): StoryOp | null {
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
        // Unknown op kind from the model — drop it. Logged by the caller's
        // partial-parse counter rather than here (per-op logging would be noisy).
        return null;
    }
  } catch (err) {
    logger.debug('llm_op_parse_error', { message: (err as Error).message });
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

// ── The op schema ───────────────────────────────────────────────
// WHY EVERY OP KIND IS DECLARED HERE, AND WHAT IT COST NOT TO BE.
//
// Until 2026-09-13 `ops.items` was `{type:'object', properties:{op:{type:
// 'string'}}, required:['op']}` — one property, no payload. A structured
// decoder honours that literally, so an endpoint enforcing `response_format:
// json_schema` returned, measured live:
//
//   "ops": [ {"op":"ADD_FACT"}, {"op":"UPDATE_BELIEF"},
//            {"op":"SEED_CLUE"}, {"op":"RAISE_CLOCK"} ]
//
// — 4 of 4 ops carrying nothing but the discriminator. parseOp() below returns
// null for every one of them, parseIR falls back to stubIR, and the
// `llm_generator_partial_parse` warn fires. Over one 83-call bench run that was
// 74 of 74 returned candidates stubbed and ZERO model-authored ops committed
// (docs/story-generation/STORY_BENCH_2026-09-13.md). The loop looked like a
// model that could not write a scene; it was a schema that never asked for one.
//
// StoryOp is a DISCRIMINATED UNION (server/nvm/ops/StoryOp.ts), and the only
// way to say that to a decoder is `anyOf` with one branch per kind. Two fields
// make a flat merge impossible rather than merely ugly: `fact` is an
// AtomicFact object under ADD_FACT and a plain string under
// RECORD_VISUAL_FACT/RECORD_SONIC_FACT, and `delta` is a RelationshipDelta
// under SHIFT_RELATIONSHIP and a ReaderStateDelta under UPDATE_READER_STATE.
//
// EVERY BRANCH MIRRORS parseOp BELOW, WHICH IS THE REAL CONTRACT. parseOp
// rejects an op whose required fields are missing or mistyped, so a branch that
// drifts from it produces valid JSON that still parses to null. All 14 kinds
// are declared; tests/core/llm-generator-schema.test.ts asserts the set here
// equals STORY_OP_KINDS and round-trips one instance of each through parseOp.
//
// `server/lib/ai-providers/schema.ts` had to learn anyOf in the same change —
// it was dropping the key, so a union declared here would have been deleted on
// the way to the wire.

const S = { type: 'string' } as const;
const N = { type: 'number' } as const;

const ATOMIC_FACT = {
  type: 'object',
  properties: {
    factId: S, subject: S, predicate: S, object: S,
    addedAtTurn: N, validFrom: N,
    validTo: { type: ['number', 'null'] },   // null = still valid
  },
  required: ['factId', 'subject', 'predicate', 'object', 'addedAtTurn', 'validFrom', 'validTo'],
};

const BELIEF = {
  type: 'object',
  properties: {
    id: S, proposition: S, confidence: N,
    source: S, source_event_id: S, acquired_at: N,
  },
  required: ['id', 'proposition', 'confidence', 'source', 'source_event_id', 'acquired_at'],
};

const EMOTION = {
  type: 'object',
  properties: {
    joy: N, distress: N, anger: N, fear: N, pride: N, shame: N,
    dominant: S, intensity: N, last_updated_at: N,
  },
  required: ['dominant', 'intensity'],
};

// The 14 RelationshipDelta dimensions and 11 ThemeMove / 18 ClueCarrier values
// are enumerated rather than left as free strings: parseOp does not check them,
// but the dispatcher and the projector do read them, and an enum is the one
// place a decoder can be stopped from inventing a fifteenth dimension.
const RELATIONSHIP_DELTA = {
  type: 'object',
  properties: {
    dimension: { type: 'string', enum: [
      'love', 'trust', 'intimacy', 'admiration', 'resentment', 'fear', 'contempt',
      'guilt', 'obligation', 'dependency', 'jealousy', 'respect', 'rivalry', 'protectiveness',
    ] },
    amount: N,
    reason: S,
  },
  required: ['dimension', 'amount', 'reason'],
};

const READER_STATE_DELTA = {
  type: 'object',
  properties: { suspense: N, curiosity: N, investment: N, knownFact: S },
};

/** One anyOf branch per StoryOp kind, each mirroring parseOp's requirements. */
const OP_BRANCHES = [
  { kind: 'ADD_FACT', props: { fact: ATOMIC_FACT }, required: ['fact'] },
  { kind: 'EXPIRE_FACT', props: { factId: S, atTurn: N }, required: ['factId', 'atTurn'] },
  { kind: 'UPDATE_BELIEF', props: { charId: S, belief: BELIEF }, required: ['charId', 'belief'] },
  { kind: 'APPRAISE_EMOTION', props: { charId: S, emotion: EMOTION }, required: ['charId', 'emotion'] },
  {
    kind: 'SHIFT_RELATIONSHIP',
    props: { pair: { type: 'array', items: S }, delta: RELATIONSHIP_DELTA },
    required: ['pair', 'delta'],
  },
  { kind: 'ADVANCE_OBJECT_ARC', props: { objectId: S, toState: S }, required: ['objectId', 'toState'] },
  { kind: 'TRIGGER_RULE', props: { mechanismId: S, ruleId: S }, required: ['mechanismId', 'ruleId'] },
  {
    kind: 'SEED_CLUE',
    props: { clueId: S, carrier: { type: 'string', enum: [
      'object', 'line', 'gesture', 'location', 'absence', 'behavior', 'camera', 'sound',
      'costume', 'lighting', 'timing', 'silence', 'transformation', 'wound', 'document',
      'symbol', 'animal', 'price',
    ] } },
    required: ['clueId', 'carrier'],
  },
  { kind: 'PAYOFF_SETUP', props: { setupId: S, payoffEventId: S }, required: ['setupId', 'payoffEventId'] },
  { kind: 'RAISE_CLOCK', props: { clockId: S, amount: N }, required: ['clockId', 'amount'] },
  {
    kind: 'ADVANCE_THEME_ARGUMENT',
    props: { claimId: S, move: { type: 'string', enum: [
      'support', 'attack', 'undercut', 'complicate', 'resolve', 'invert', 'parallel',
      'echo', 'interrogate', 'demonstrate_through_failure', 'humanize',
    ] } },
    required: ['claimId', 'move'],
  },
  { kind: 'UPDATE_READER_STATE', props: { delta: READER_STATE_DELTA }, required: ['delta'] },
  { kind: 'RECORD_VISUAL_FACT', props: { sceneId: S, fact: S }, required: ['sceneId', 'fact'] },
  { kind: 'RECORD_SONIC_FACT', props: { sceneId: S, fact: S }, required: ['sceneId', 'fact'] },
] as const;

/** Exported for tests: the op kinds this schema declares, in declaration order. */
export const SCHEMA_OP_KINDS: readonly string[] = OP_BRANCHES.map(b => b.kind);

const STORY_OP_SCHEMA = {
  anyOf: OP_BRANCHES.map(b => ({
    type: 'object',
    properties: { op: { type: 'string', enum: [b.kind] }, ...b.props },
    required: ['op', ...b.required],
  })),
};

export const IR_SCHEMA = {
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
            items: STORY_OP_SCHEMA,
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
    let temperature: number;
    try {
      const ai = await import('../../engine/ai.ts');
      // The GENERATIVE seam (2026-09-13). This was `ai.geminiProvider`, so on
      // an OpenAI-compatible deployment every candidate generation threw
      // 'Gemini provider not available' into the catch below and the loop
      // converged over structural stubs — visible only as an
      // `llm_generator_failed` warn line. Keyless behaviour is unchanged: with
      // no provider configured the seam still holds geminiProvider. It is
      // getGenerativeProvider() rather than getLLMProvider() because an
      // AUTO-SELECTED FreeRide bridge must not serve this surface — see that
      // function's comment and ai-config.ts's llmReady().
      provider = ai.getGenerativeProvider();
      candidateModel = ai.modelForTask('CANDIDATE');
      // Candidate generation wants high diversity; bias the configured base
      // temperature upward but never below 0.9 so the proof loop has variety
      // to select from. Falls back to 0.9 if config is unavailable.
      temperature = Math.max(0.9, ai.getTemperature());
    } catch (err) {
      // No key or provider unavailable — use stubs. Log so silent stub
      // fallback is observable in metrics rather than invisible.
      logger.warn('llm_generator_unavailable', {
        sceneIdx: spec.target.sceneIdx,
        message: (err as Error).message,
      });
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
          temperature,
        },
      });

      const text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const parsed = JSON.parse(text) as { candidates?: unknown[] };
      const rawCandidates = parsed.candidates ?? [];

      const irs = rawCandidates.slice(0, n).map((c, i) => parseIR(c, spec, i));
      // Track how many candidates degraded to stubs (empty/invalid ops) so quality
      // erosion is visible. parseIR returns a stub when ops parse to empty.
      const stubbedFromLLM = irs.filter(ir => ir.provenance.model === 'stub').length;
      if (stubbedFromLLM > 0) {
        logger.warn('llm_generator_partial_parse', {
          sceneIdx: spec.target.sceneIdx,
          requested: n,
          returned: rawCandidates.length,
          stubbed: stubbedFromLLM,
        });
      }
      // Pad with stubs if LLM returned fewer than requested
      while (irs.length < n) irs.push(stubIR(spec, irs.length));
      return irs;
    } catch (err) {
      // Generation or JSON parse failed — log before falling back to stubs so the
      // failure is observable rather than a silent quality regression.
      logger.warn('llm_generator_failed', {
        sceneIdx: spec.target.sceneIdx,
        message: (err as Error).message,
      });
      return Array.from({ length: n }, (_, i) => stubIR(spec, i));
    }
  };
}
