// LLM-backed CandidateGenerator (Wave 15).
// Formats a GenerationSpec into a structured Gemini prompt and parses the
// JSON response into NarrativeTransitionIR candidates.
// Falls back to a structural stub if the LLM is unavailable or fails.

import { createHash } from 'node:crypto';
import type { CausalLink, NarrativeTransitionIR, SceneFunction } from '../ir/NarrativeTransitionIR.ts';
import type { StoryOp } from '../ops/StoryOp.ts';
import type { CandidateGenerator, GenerationSpec } from './proof-spec.ts';
import { logger } from '../../lib/logger.ts';

// ── Stub identifiability (2026-09-19, generator-honesty) ─────────────────────
// `provenance.origin` stays 'model_generated' for BOTH a real LLM candidate and
// a structural stub — ProvenanceProof (server/nvm/proof/tier1/provenance.ts)
// and every route that stamps `origin: 'model_generated'` treat that value as
// "not user-authored", which a stub also is, so widening the ProvenanceOrigin
// union to add a 'stub' value would require re-auditing every one of those
// call sites for a distinction they don't currently need. `provenance.model`
// is already the field that tells the two apart (stubIR sets it to the literal
// 'stub'; a parsed candidate now carries the model that actually answered —
// see the `model` param on parseIR below), so this helper makes that the ONE
// place the distinction is made, instead of every caller re-deriving its own
// `=== 'stub'` check. scripts/story-bench.mjs and
// tests/core/openai-compat-generation-guards.test.ts route through it.
export function isStubIR(ir: NarrativeTransitionIR): boolean {
  return ir.provenance.model === 'stub';
}

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
        if (!isObj(belief) || typeof charId !== 'string') return null;
        if (typeof belief['proposition'] !== 'string' || belief['proposition'].trim() === '') return null;
        const proposition = belief['proposition'];
        // `id` used to be cast through unchecked, so two id-less UPDATE_BELIEFs
        // for the same character were indistinguishable to the dispatcher's
        // `b.id === op.belief.id` upsert (server/nvm/ops/dispatcher.ts:34-39)
        // and the second silently REPLACED the first — verified by probe: two
        // distinct UPDATE_BELIEFs in, one belief out. Synthesising a
        // deterministic id from (charId, proposition) fixes that without
        // rejecting the op: rejecting would re-stub the whole candidate when
        // `ops` empties out (parseIR falls back to stubIR at ops.length===0),
        // which is a worse failure than accepting a model that simply forgot
        // to name its own belief. The hash is deterministic so the SAME
        // proposition repeated for the same character upserts onto its own
        // prior belief rather than duplicating, matching the one thing an
        // id-less model payload can still promise: identity by content.
        const rawId = belief['id'];
        const id = typeof rawId === 'string' && rawId.trim() !== ''
          ? rawId
          : `belief_${createHash('sha256').update(`${charId}|${proposition}`).digest('hex').slice(0, 8)}`;
        const rawConfidence = belief['confidence'];
        const confidenceValid = typeof rawConfidence === 'number' && Number.isFinite(rawConfidence)
          && rawConfidence >= 0 && rawConfidence <= 1;
        if (!confidenceValid) {
          logger.debug('llm_belief_confidence_defaulted', { charId, id, raw: rawConfidence });
        }
        const confidence: number = confidenceValid ? (rawConfidence as number) : 0.5;
        const rawSource = belief['source'];
        const source: 'witnessed' | 'told' | 'inferred' =
          rawSource === 'witnessed' || rawSource === 'told' || rawSource === 'inferred' ? rawSource : 'inferred';
        // Defaults mirror scripts/story-bench.mjs's castGroundingOps: a turn
        // index of 0 and a synthetic event id derived from the belief's own id
        // rather than an empty string, so a downstream reader that keys on
        // source_event_id (e.g. character-advocate.ts's "witnessed with no
        // source_event_id" objection) sees a non-empty, traceable value.
        const rawSourceEventId = belief['source_event_id'];
        const source_event_id = typeof rawSourceEventId === 'string' && rawSourceEventId !== ''
          ? rawSourceEventId
          : `llm_${id}`;
        const rawAcquiredAt = belief['acquired_at'];
        const acquired_at = typeof rawAcquiredAt === 'number' && Number.isFinite(rawAcquiredAt)
          ? rawAcquiredAt
          : 0;
        return {
          op: 'UPDATE_BELIEF', charId,
          belief: { id, proposition, confidence, source, source_event_id, acquired_at },
        };
      }
      case 'APPRAISE_EMOTION': {
        const emotion = raw['emotion'];
        const charId  = raw['charId'];
        if (!isObj(emotion) || typeof charId !== 'string') return null;
        // A PARTIAL EmotionState IS NOT AN EmotionState. `isObj` alone used to
        // be the whole check, so `{dominant:'fear', intensity:70}` — which the
        // schema branch also admitted — was cast through and stored wholesale
        // by the dispatcher (server/nvm/ops/dispatcher.ts:45). The six
        // dimensions then read `undefined`, and
        // server/nvm/quality/index.ts:495 evaluates `(emo.fear + emo.distress)
        // > 100` — `NaN > 100` is false, so the peak-distress debt SILENTLY
        // never fires rather than throwing. Every non-optional field of
        // EmotionState (server/engine/types.ts:398-409) is required here, and
        // the schema branch below requires exactly the same set, so the
        // invariant holds whether a payload arrives through the schema or not.
        for (const dim of ['joy', 'distress', 'anger', 'fear', 'pride', 'shame', 'intensity', 'last_updated_at']) {
          if (typeof emotion[dim] !== 'number' || !Number.isFinite(emotion[dim] as number)) return null;
        }
        if (typeof emotion['dominant'] !== 'string') return null;
        return { op: 'APPRAISE_EMOTION', charId, emotion: emotion as unknown as StoryOp & { op: 'APPRAISE_EMOTION' } extends { emotion: infer E } ? E : never };
      }
      case 'SHIFT_RELATIONSHIP': {
        const pair = raw['pair'];
        if (!Array.isArray(pair) || pair.length < 2 || typeof pair[0] !== 'string' || typeof pair[1] !== 'string') return null;
        const delta = raw['delta'];
        // RelationshipDelta was cast through on an `isObj` check alone, the
        // exact class of defect APPRAISE_EMOTION was fixed for above: `{}` or
        // a string satisfied `isObj`'s absence-of-check (a string fails isObj
        // too, but the missing per-field validation meant a malformed-but-
        // object-shaped delta reached the dispatcher and NarrativeState with
        // `dimension`/`amount`/`reason` undefined). `amount` is bounded to
        // -1..1 per StoryOp.ts's own comment ("signed, -1..1"). A bad delta
        // rejects only THIS op — the candidate's other ops are unaffected.
        if (!isObj(delta)) return null;
        const dimension = delta['dimension'];
        const amount = delta['amount'];
        const reason = delta['reason'];
        if (typeof dimension !== 'string' || dimension === '') return null;
        // Out-of-range-but-finite is recoverable the same way UPDATE_BELIEF's
        // confidence is above: clamp into the declared bound (-1..1, per
        // RelationshipDelta's own comment) rather than dropping the whole op.
        // Dropping an op is not local — parseIR falls back to stubIR when
        // `ops` empties out, so a one-op candidate with amount:2 used to
        // degrade to a stub over a value that was still a usable direction and
        // magnitude. A non-numeric or NaN amount carries no usable magnitude
        // to clamp, so those are still rejected.
        if (typeof amount !== 'number' || !Number.isFinite(amount)) return null;
        const clampedAmount = Math.max(-1, Math.min(1, amount));
        if (clampedAmount !== amount) {
          logger.debug('llm_relationship_amount_clamped', { dimension, raw: amount, clamped: clampedAmount });
        }
        // `reason` is a required `string` on RelationshipDelta (StoryOp.ts),
        // not a required NON-EMPTY string, so `null` — the usual JSON spelling
        // of "the model left this absent" — is treated as absent and mapped to
        // '', matching the confidence policy's "recover what's recoverable"
        // stance. A genuinely missing (undefined) or non-string, non-null
        // `reason` is still rejected: unlike a numeric delta, there is no
        // sensible default to reconstruct from nothing typed at all.
        if (reason !== null && typeof reason !== 'string') return null;
        const resolvedReason = reason === null ? '' : reason;
        return {
          op: 'SHIFT_RELATIONSHIP', pair: pair as [string, string],
          delta: { dimension, amount: clampedAmount, reason: resolvedReason } as unknown as StoryOp & { op: 'SHIFT_RELATIONSHIP' } extends { delta: infer D } ? D : never,
        };
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
        const delta = raw['delta'];
        if (!isObj(delta)) return null;
        // Every ReaderStateDelta field is OPTIONAL (server/nvm/ops/StoryOp.ts),
        // so `{}` is a legitimate delta (IR_SCHEMA's READER_STATE_DELTA
        // declares no `required` list, and llm-generator-schema.test.ts's
        // "accepts the SMALLEST payload" check synthesises exactly `{}` for
        // this branch) — unlike SHIFT_RELATIONSHIP above, an empty object must
        // still parse. What must not happen is a PRESENT field of the wrong
        // type reaching the dispatcher unchecked, so each key is validated
        // only when the model actually sent it. `null` is treated the same as
        // "not sent" for every field here: it is the usual JSON spelling of
        // "absent", and every field on this delta is already optional, so
        // there is no information lost by dropping a null one rather than
        // rejecting the whole op over it — the same "recover what's
        // recoverable" stance as `confidence` and (now) SHIFT_RELATIONSHIP's
        // `amount` above.
        const cleanedDelta: Record<string, unknown> = {};
        for (const key of ['suspense', 'curiosity', 'investment'] as const) {
          const v = delta[key];
          if (v === undefined || v === null) continue;
          if (typeof v !== 'number' || !Number.isFinite(v)) return null;
          cleanedDelta[key] = v;
        }
        const knownFact = delta['knownFact'];
        if (knownFact !== undefined && knownFact !== null) {
          if (typeof knownFact !== 'string') return null;
          cleanedDelta['knownFact'] = knownFact;
        }
        return { op, delta: cleanedDelta as unknown as StoryOp & { op: 'UPDATE_READER_STATE' } extends { delta: infer D } ? D : never };
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

function parseIR(raw: unknown, spec: GenerationSpec, idx: number, model: string): NarrativeTransitionIR {
  const obj = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {};
  const rawOps = Array.isArray(obj['ops']) ? obj['ops'] as unknown[] : [];
  const ops: StoryOp[] = rawOps
    .map(o => parseOp(o as Record<string, unknown>))
    .filter((o): o is StoryOp => o !== null);

  if (ops.length === 0) return stubIR(spec, idx);

  // `causalLinks` used to do `typeof link.opIdx` with no object check first —
  // one `null` element in the array (a model emitting a link it couldn't
  // resolve, or a lossy JSON round-trip) threw `Cannot read properties of
  // null` OUT OF parseIR into makeLLMCandidateGenerator's outer catch, which
  // stubs ALL n candidates requested for the scene, not just the one with the
  // bad link. Guarding object-ness per element means a malformed link is
  // DROPPED, matching every other per-element validation in this file, rather
  // than degrading the whole scene's candidates to stubs.
  // Finding 2 (2026-09-19 adversarial review of 3312b2d9): the guard above
  // checked `opIdx` alone and let a link with a missing/malformed `causedBy`
  // through untyped. CausalLink.causedBy is `string[]` (NarrativeTransitionIR.ts),
  // and every consumer assumes it — server/nvm/quality/index.ts:702 does
  // `for (const causedBy of link.causedBy)`, server/nvm/proof/tier4/attribution.ts
  // reads `cl.causedBy.length`, server/nvm/room/critics/skeptic.ts:51 the same —
  // so a link surviving as `{opIdx: 0}` (no causedBy at all) or with `causedBy`
  // not an array threw a TypeError out of `buildCausalGraph`, which
  // `runQualityEngine` calls with no try/catch around it and `convergeScene`
  // calls per candidate (loop.ts:370) with none either, escaping all the way
  // to the route as an HTTP 500 for the whole request — not just a dropped
  // link. Matching the field-by-field discipline every other branch in this
  // file uses: require `causedBy` to be an array, and every element a string,
  // before accepting the link at all. A malformed link is dropped here, same
  // as a malformed op is dropped by parseOp — never fatal.
  const rawCausalLinks = Array.isArray(obj['causalLinks']) ? obj['causalLinks'] as unknown[] : [];
  const causalLinks = rawCausalLinks.filter(
    (link): link is CausalLink =>
      link !== null && typeof link === 'object' && Number.isInteger((link as { opIdx?: unknown }).opIdx)
      && (link as { opIdx: number }).opIdx >= 0 && (link as { opIdx: number }).opIdx < ops.length
      && Array.isArray((link as { causedBy?: unknown }).causedBy)
      && (link as { causedBy: unknown[] }).causedBy.every((c): c is string => typeof c === 'string'),
  );

  return {
    transitionId: String(obj['transitionId'] ?? `llm-${spec.target.sceneIdx}-${idx}-${Date.now()}`),
    sceneIdx: spec.target.sceneIdx,
    sceneFunction: (obj['sceneFunction'] as SceneFunction | undefined) ?? spec.target.sceneFunction,
    activeMechanisms: spec.target.activeMechanisms,
    beforeStateHash: 'llm-generated',
    ops,
    preconditions: Array.isArray(obj['preconditions']) ? obj['preconditions'] as string[] : [],
    postconditions: Array.isArray(obj['postconditions']) ? obj['postconditions'] as string[] : [],
    // `model` used to be hard-coded 'gemini' for every parsed IR, regardless of
    // the configured provider — an openai-compat deployment's model-authored
    // candidates were mislabeled with a provider that never ran. The caller
    // passes the actual `candidateModel` it resolved via `ai.modelForTask()`
    // (server/engine/ai.ts), which already reads AI_MODEL/GEMINI_MODEL/the
    // per-task tier — the same string the call was made with.
    provenance: { origin: 'model_generated', createdAt: Date.now(), model },
    causalLinks: causalLinks.length > 0 ? causalLinks : undefined,
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
// equals STORY_OP_KINDS.
//
// AND THAT CLAIM IS NOW CHECKED MECHANICALLY, NOT BY HAND-WRITTEN EXAMPLES.
// Until 2026-09-18 the guard round-tripped fourteen payloads a human wrote,
// which proves those fourteen parse and nothing about what the branches
// PROMISE: SHIFT_RELATIONSHIP declared `pair` as an unbounded string array
// while parseOp required two elements, so `pair:['ILKA']` satisfied the branch
// and parsed to null, and no hand-written instance could have shown it. The
// guard now synthesises the SMALLEST payload each branch permits, from that
// branch's own `required` list, property types, enums and array bounds, and
// requires parseOp to accept it — so a branch that is looser than the parser
// anywhere fails in CI instead of over a bench run's worth of live calls.
//
// `server/lib/ai-providers/schema.ts` had to learn anyOf in the same change —
// it was dropping the key, so a union declared here would have been deleted on
// the way to the wire — and `minItems`/`maxItems` in the round after it, for
// the same reason: a bound this file declares and the translator deletes is a
// bound the decoder never hears.

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
    // BeliefSource (server/engine/types.ts:132) has exactly three values, and
    // an enum is the one place a decoder can be stopped from inventing a
    // fourth — the same reasoning as RELATIONSHIP_DELTA.dimension below.
    source: { type: 'string', enum: ['witnessed', 'told', 'inferred'] },
    source_event_id: S, acquired_at: N,
  },
  required: ['id', 'proposition', 'confidence', 'source', 'source_event_id', 'acquired_at'],
};

// EVERY non-optional field of EmotionState is required. Requiring only
// `dominant` and `intensity` (the shape until 2026-09-18) declared a payload
// that parseOp accepted and the dispatcher stored, leaving the six dimensions
// `undefined` and silencing the peak-distress debt in
// server/nvm/quality/index.ts:495 through `NaN > 100 === false`. The only
// optional member of the interface — `anger_target_id` — is declared but not
// required, so the model can express it without being forced to invent one.
const EMOTION = {
  type: 'object',
  properties: {
    joy: N, distress: N, anger: N, fear: N, pride: N, shame: N,
    // EmotionType (server/engine/types.ts:396), enumerated for the same reason
    // as BeliefSource above.
    dominant: { type: 'string', enum: ['neutral', 'joy', 'distress', 'anger', 'fear', 'pride', 'shame'] },
    intensity: N, last_updated_at: N,
    anger_target_id: S,
  },
  required: ['joy', 'distress', 'anger', 'fear', 'pride', 'shame', 'dominant', 'intensity', 'last_updated_at'],
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
    // `pair` is a TWO-element tuple in the union (StoryOp.ts) and parseOp
    // rejects anything shorter, so the array is bounded at both ends. Declared
    // without the bound, `pair: ['ILKA']` satisfied this branch and then parsed
    // to null — the exact schema-vs-parser drift this block exists to prevent,
    // one op later. `minItems`/`maxItems` reach the wire only because
    // geminiSchemaToJsonSchema was taught to carry them in the same change.
    props: { pair: { type: 'array', items: S, minItems: 2, maxItems: 2 }, delta: RELATIONSHIP_DELTA },
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

      const irs = rawCandidates.slice(0, n).map((c, i) => parseIR(c, spec, i, candidateModel));
      // Track how many candidates degraded to stubs (empty/invalid ops) so quality
      // erosion is visible. parseIR returns a stub when ops parse to empty.
      const stubbedFromLLM = irs.filter(isStubIR).length;
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
