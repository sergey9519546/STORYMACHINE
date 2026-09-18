// llm-generator-schema.test.ts — IR_SCHEMA is a DECLARATION of what parseOp
// accepts, and nothing used to hold the two together.
//
// WHY THIS FILE EXISTS. Until 2026-09-13 `IR_SCHEMA.ops.items` declared one
// property, `op`. A structured decoder honours that literally, so an endpoint
// enforcing `response_format: json_schema` returned
// `[{"op":"ADD_FACT"},{"op":"RAISE_CLOCK"},…]` — measured live — and parseOp
// returned null for every one of them, parseIR fell back to stubIR, and the
// whole convergence loop converged over structural stubs. Over one 83-call
// bench run: 74 of 74 returned candidates stubbed, zero model-authored ops
// committed. The model was fine; the schema never asked for a payload.
//
// So the invariant is not "the schema is valid JSON Schema". It is: **every op
// kind the union defines is declared, each declared branch produces an object
// parseOp ACCEPTS, and the translator that carries it to the wire does not drop
// the union.** All three are asserted here, offline, in CI, with no key.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { IR_SCHEMA, SCHEMA_OP_KINDS, parseOp } from '../../server/nvm/generate/llm-generator.ts';
import { STORY_OP_KINDS } from '../../server/nvm/ops/StoryOp.ts';
import { geminiSchemaToJsonSchema } from '../../server/lib/ai-providers/schema.ts';
import { applyStoryOp } from '../../server/nvm/ops/dispatcher.ts';
import { emptyState } from '../../server/nvm/state/NarrativeState.ts';
import { computeArcDebt } from '../../server/nvm/quality/index.ts';
import type { Schema } from '@google/genai';

/** The `anyOf` branch list the schema declares for one op. */
function opBranches(): Array<Record<string, unknown>> {
  const items = (((IR_SCHEMA.properties.candidates as Record<string, unknown>)
    .items as Record<string, unknown>).properties as Record<string, unknown>);
  const ops = items.ops as Record<string, unknown>;
  const branches = (ops.items as Record<string, unknown>).anyOf;
  assert.ok(Array.isArray(branches), 'ops.items must be an anyOf union — a discriminated union cannot be declared any other way');
  return branches as Array<Record<string, unknown>>;
}

/** The declared branch for one op kind. */
function branchFor(kind: string): Record<string, unknown> {
  const found = opBranches().find((b) => (((b.properties as Record<string, Record<string, unknown>>)
    .op.enum) as string[])?.[0] === kind);
  assert.ok(found, `no declared branch for ${kind}`);
  return found!;
}

/**
 * The SMALLEST payload a schema node permits — every `required` property and
 * nothing else, each property at the minimum its own declaration allows.
 *
 * This is the difference between "these fourteen payloads I wrote parse" and
 * "everything this schema promises, parseOp accepts". A hand-written instance
 * can only ever confirm the first, which is why SHIFT_RELATIONSHIP could
 * declare `pair` as an unbounded array while parseOp required two elements and
 * every test stayed green: nobody wrote the one-element payload the branch
 * promised. Synthesised from the branch's own declaration, the minimum IS that
 * payload, so the gap fails here instead of on the wire.
 */
function minimalInstance(node: Record<string, unknown>): unknown {
  const enumVals = node.enum as unknown[] | undefined;
  if (Array.isArray(enumVals) && enumVals.length > 0) return enumVals[0];

  const anyOf = (node.anyOf ?? node.oneOf) as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(anyOf) && anyOf.length > 0) return minimalInstance(anyOf[0]);

  const rawType = node.type;
  const t = Array.isArray(rawType) ? String(rawType[0]) : String(rawType ?? 'string');

  if (t === 'object') {
    const props = (node.properties ?? {}) as Record<string, Record<string, unknown>>;
    const required = (node.required ?? []) as string[];
    const out: Record<string, unknown> = {};
    // Only the required keys: an optional property is, by declaration, a
    // property the decoder may omit, so the minimum omits it.
    for (const key of required) {
      assert.ok(props[key], `required property ${key} is not declared`);
      out[key] = minimalInstance(props[key]);
    }
    return out;
  }
  if (t === 'array') {
    const items = (node.items ?? { type: 'string' }) as Record<string, unknown>;
    const min = typeof node.minItems === 'number' ? node.minItems : 0;
    return Array.from({ length: min }, () => minimalInstance(items));
  }
  if (t === 'number' || t === 'integer') return 0;
  if (t === 'boolean') return false;
  if (t === 'null') return null;
  return 'x';
}

/**
 * One valid instance per op kind, written to satisfy parseOp's own checks.
 * These are the payloads the schema promises a decoder it may emit.
 */
const INSTANCES: Record<string, Record<string, unknown>> = {
  ADD_FACT: { op: 'ADD_FACT', fact: { factId: 'f1', subject: 'ILKA', predicate: 'carries', object: 'the notebook', addedAtTurn: 0, validFrom: 0, validTo: null } },
  EXPIRE_FACT: { op: 'EXPIRE_FACT', factId: 'f1', atTurn: 3 },
  UPDATE_BELIEF: { op: 'UPDATE_BELIEF', charId: 'ILKA', belief: { id: 'b1', proposition: 'the calculation was right', confidence: 0.8, source: 'witnessed', source_event_id: 'e1', acquired_at: 0 } },
  APPRAISE_EMOTION: { op: 'APPRAISE_EMOTION', charId: 'ILKA', emotion: { joy: 0, distress: 70, anger: 0, fear: 0, pride: 0, shame: 0, dominant: 'distress', intensity: 70, last_updated_at: 0 } },
  SHIFT_RELATIONSHIP: { op: 'SHIFT_RELATIONSHIP', pair: ['ILKA', 'DESMOND'], delta: { dimension: 'trust', amount: -0.3, reason: 'he read the page she withheld' } },
  ADVANCE_OBJECT_ARC: { op: 'ADVANCE_OBJECT_ARC', objectId: 'the-notebook', toState: 'opened' },
  TRIGGER_RULE: { op: 'TRIGGER_RULE', mechanismId: 'legitimacy_split', ruleId: 'r1' },
  SEED_CLUE: { op: 'SEED_CLUE', clueId: 'the-torn-page', carrier: 'document' },
  PAYOFF_SETUP: { op: 'PAYOFF_SETUP', setupId: 'the-torn-page', payoffEventId: 'e9' },
  RAISE_CLOCK: { op: 'RAISE_CLOCK', clockId: 'the-tide', amount: 2 },
  ADVANCE_THEME_ARGUMENT: { op: 'ADVANCE_THEME_ARGUMENT', claimId: 'c1', move: 'undercut' },
  UPDATE_READER_STATE: { op: 'UPDATE_READER_STATE', delta: { suspense: 15, curiosity: 10 } },
  RECORD_VISUAL_FACT: { op: 'RECORD_VISUAL_FACT', sceneId: 's0', fact: 'a wet coat over the rail' },
  RECORD_SONIC_FACT: { op: 'RECORD_SONIC_FACT', sceneId: 's0', fact: 'the tide against the piles' },
};

describe('IR_SCHEMA declares the whole StoryOp union', () => {
  it('declares exactly the 14 kinds StoryOp.ts defines — no more, no fewer', () => {
    const declared = [...SCHEMA_OP_KINDS].sort();
    const defined = Object.keys(STORY_OP_KINDS).sort();
    assert.deepEqual(declared, defined,
      'a kind in the union with no schema branch can never be generated; a branch with no kind cannot be parsed');
  });

  it('gives every branch at least one property besides the discriminator', () => {
    // This is the exact defect: a branch of `{properties:{op}}` alone is what a
    // decoder returns as `{"op":"ADD_FACT"}`, and parseOp nulls it.
    const thin: string[] = [];
    for (const branch of opBranches()) {
      const props = Object.keys((branch.properties ?? {}) as Record<string, unknown>);
      const payload = props.filter((k) => k !== 'op');
      if (payload.length === 0) thin.push(String(((branch.properties as Record<string, Record<string, unknown>>).op.enum as string[])?.[0]));
    }
    assert.deepEqual(thin, [], `op branches declaring no payload field: ${thin.join(', ')}`);
  });

  it('requires the discriminator AND the payload on every branch', () => {
    for (const branch of opBranches()) {
      const required = (branch.required ?? []) as string[];
      assert.ok(required.includes('op'), 'every branch must require op');
      assert.ok(required.length > 1, `branch ${JSON.stringify(required)} requires only the discriminator`);
    }
  });

  it('round-trips one instance of every declared branch through parseOp', () => {
    // The real contract: what the schema promises, parseOp must accept. These
    // two drifted apart invisibly once; this is what makes that impossible.
    const rejected: string[] = [];
    for (const kind of SCHEMA_OP_KINDS) {
      const instance = INSTANCES[kind];
      assert.ok(instance, `no test instance for declared kind ${kind}`);
      const parsed = parseOp(instance);
      if (parsed === null || parsed.op !== kind) rejected.push(kind);
    }
    assert.deepEqual(rejected, [], `declared branches parseOp rejects: ${rejected.join(', ')}`);
  });

  it('accepts the SMALLEST payload every branch permits, not just a hand-written one', () => {
    // The invariant this file's header claims, checked mechanically. Each
    // instance is synthesised from the branch's own required list, property
    // types, enums and array bounds — so a branch looser than parseOp ANYWHERE
    // fails here. Before 2026-09-18 SHIFT_RELATIONSHIP failed it:
    // `{op:'SHIFT_RELATIONSHIP', pair:[], delta:{...}}` satisfied the branch
    // and parseOp returned null.
    const rejected: string[] = [];
    for (const kind of SCHEMA_OP_KINDS) {
      const instance = minimalInstance(branchFor(kind)) as Record<string, unknown>;
      const parsed = parseOp(instance);
      if (parsed === null || parsed.op !== kind) rejected.push(`${kind} ${JSON.stringify(instance)}`);
    }
    assert.deepEqual(rejected, [], `branches whose own minimum parseOp rejects:\n  ${rejected.join('\n  ')}`);
  });

  it('bounds SHIFT_RELATIONSHIP.pair at two, the length parseOp requires', () => {
    // The specific gap the synthesis above generalises. parseOp
    // (llm-generator.ts:85-92) needs pair[0] and pair[1]; the union types it as
    // a two-element tuple; the branch must say both.
    const pair = ((branchFor('SHIFT_RELATIONSHIP').properties as Record<string, Record<string, unknown>>)
      .pair) as Record<string, unknown>;
    assert.equal(pair.minItems, 2, 'a one-element pair parses to null — the schema must not promise one');
    assert.equal(pair.maxItems, 2, 'pair is a two-element tuple in StoryOp.ts');
    const delta = { dimension: 'trust', amount: -0.3, reason: 'x' };
    assert.equal(parseOp({ op: 'SHIFT_RELATIONSHIP', pair: ['ILKA'], delta }), null);
    assert.equal(parseOp({ op: 'SHIFT_RELATIONSHIP', pair: [], delta }), null);
    assert.ok(parseOp({ op: 'SHIFT_RELATIONSHIP', pair: ['ILKA', 'DESMOND'], delta }));
  });

  it('still rejects a payload-less op — the shape the old schema produced', () => {
    // The other direction. parseOp must not be loosened to paper over a thin
    // schema: an op with no payload is not a valid op and never was.
    for (const kind of ['ADD_FACT', 'UPDATE_BELIEF', 'RAISE_CLOCK', 'SEED_CLUE']) {
      assert.equal(parseOp({ op: kind }), null, `${kind} with no payload must still parse to null`);
    }
  });
});

describe('a conformant APPRAISE_EMOTION cannot NaN the quality engine', () => {
  // WHY THIS IS HERE. The EMOTION branch used to require only `dominant` and
  // `intensity`, while EmotionState (server/engine/types.ts:398-409) declares
  // nine non-optional fields and parseOp cast the object through unchecked. The
  // dispatcher stores it wholesale (server/nvm/ops/dispatcher.ts:45) and
  // server/nvm/quality/index.ts:495 then evaluates `(emo.fear + emo.distress) >
  // 100` — with the dimensions undefined that is `NaN > 100`, which is FALSE,
  // so the peak-distress debt silently never fires rather than throwing. Before
  // the round-2 schema fix the model could not emit an APPRAISE_EMOTION payload
  // at all and the path was unreachable; it is reachable now.

  it('the smallest conformant payload still carries six finite dimensions', () => {
    const minimal = minimalInstance(branchFor('APPRAISE_EMOTION')) as Record<string, unknown>;
    const op = parseOp(minimal);
    assert.ok(op && op.op === 'APPRAISE_EMOTION', 'the branch minimum must parse');
    const state = applyStoryOp(emptyState(), op!);
    const emo = state.characterEmotions[(op as { charId: string }).charId];
    assert.ok(emo, 'the dispatcher must have stored it');
    for (const dim of ['joy', 'distress', 'anger', 'fear', 'pride', 'shame'] as const) {
      assert.equal(typeof emo[dim], 'number');
      assert.ok(Number.isFinite(emo[dim]), `${dim} reached committed state as ${String(emo[dim])}`);
    }
    assert.ok(Number.isFinite(emo.fear + emo.distress),
      'quality/index.ts:495 compares (fear + distress) > 100; NaN there fails open, silently');
  });

  it('the debt at quality/index.ts:495 actually fires on a conformant payload', () => {
    // The positive direction: a real appraisal must reach the comparison and
    // trip it. If this ever goes quiet, the check has gone blind again.
    const op = parseOp({
      op: 'APPRAISE_EMOTION', charId: 'ILKA',
      emotion: { joy: 0, distress: 70, anger: 0, fear: 60, pride: 0, shame: 0, dominant: 'distress', intensity: 70, last_updated_at: 0 },
    });
    assert.ok(op);
    const debts = computeArcDebt(applyStoryOp(emptyState(), op!), 3);
    assert.ok(debts.some((d) => d.includes('ILKA') && d.includes('peak distress')),
      `peak-distress debt did not fire: ${JSON.stringify(debts)}`);
  });

  it('parseOp rejects a partial EmotionState even when the schema is bypassed', () => {
    // The invariant must not depend on the declaration: a caller that hand-rolls
    // an op, or a decoder that ignores `required`, must not get a partial into
    // committed state either.
    const partials: Array<Record<string, unknown>> = [
      { op: 'APPRAISE_EMOTION', charId: 'ILKA', emotion: { dominant: 'fear', intensity: 70 } },
      { op: 'APPRAISE_EMOTION', charId: 'ILKA', emotion: {} },
      { op: 'APPRAISE_EMOTION', charId: 'ILKA', emotion: { joy: 0, distress: 0, anger: 0, fear: 0, pride: 0, shame: 0, dominant: 'neutral', intensity: 0 } },
      { op: 'APPRAISE_EMOTION', charId: 'ILKA', emotion: { joy: 0, distress: 0, anger: 0, fear: 'a lot', pride: 0, shame: 0, dominant: 'fear', intensity: 0, last_updated_at: 0 } },
    ];
    for (const raw of partials) {
      assert.equal(parseOp(raw), null, `a partial EmotionState must not parse: ${JSON.stringify(raw)}`);
    }
  });

  it('declares dominant and BELIEF.source as enums, like the other three', () => {
    const emotion = ((branchFor('APPRAISE_EMOTION').properties as Record<string, Record<string, unknown>>)
      .emotion) as Record<string, unknown>;
    const dominant = (emotion.properties as Record<string, Record<string, unknown>>).dominant;
    assert.deepEqual(dominant.enum, ['neutral', 'joy', 'distress', 'anger', 'fear', 'pride', 'shame']);
    assert.deepEqual(
      ((emotion.required ?? []) as string[]).slice().sort(),
      ['anger', 'distress', 'dominant', 'fear', 'intensity', 'joy', 'last_updated_at', 'pride', 'shame'],
      'every non-optional EmotionState field must be required; anger_target_id is the only optional one',
    );
    const belief = ((branchFor('UPDATE_BELIEF').properties as Record<string, Record<string, unknown>>)
      .belief) as Record<string, unknown>;
    const source = (belief.properties as Record<string, Record<string, unknown>>).source;
    assert.deepEqual(source.enum, ['witnessed', 'told', 'inferred']);
  });
});

describe('the translator carries the union to the wire', () => {
  it('keeps anyOf instead of flattening it to a propertyless object', () => {
    // schema.ts used to drop anyOf entirely, so a union declared in IR_SCHEMA
    // would have been deleted on the way out and the endpoint would have seen
    // `{"type":"object"}` — the same payload-less result by a second route.
    const translated = geminiSchemaToJsonSchema(IR_SCHEMA as unknown as Schema);
    const ops = ((((translated.properties as Record<string, Record<string, unknown>>)
      .candidates.items as Record<string, Record<string, unknown>>)
      .properties as Record<string, Record<string, unknown>>).ops) as Record<string, unknown>;
    const branches = (ops.items as Record<string, unknown>).anyOf;
    assert.ok(Array.isArray(branches), 'the translated schema must still carry anyOf');
    assert.equal((branches as unknown[]).length, SCHEMA_OP_KINDS.length);

    const addFact = (branches as Array<Record<string, Record<string, unknown>>>)
      .find((b) => ((b.properties.op as Record<string, unknown>).enum as string[])?.[0] === 'ADD_FACT');
    assert.ok(addFact, 'the ADD_FACT branch must survive translation');
    const fact = addFact!.properties.fact as Record<string, unknown>;
    assert.equal(fact.type, 'object');
    assert.deepEqual(
      Object.keys(fact.properties as Record<string, unknown>).sort(),
      ['addedAtTurn', 'factId', 'object', 'predicate', 'subject', 'validFrom', 'validTo'],
      'the AtomicFact payload must reach the wire field for field',
    );
  });

  it('translates a union node without stamping a type over it', () => {
    const out = geminiSchemaToJsonSchema({ anyOf: [{ type: 'STRING' }, { type: 'NUMBER' }] } as unknown as Schema);
    assert.deepEqual(out, { anyOf: [{ type: 'string' }, { type: 'number' }] });
    assert.ok(!('type' in out), 'a union node has no type of its own');
  });

  it('carries oneOf, additionalProperties and an explicit type array', () => {
    const out = geminiSchemaToJsonSchema({ oneOf: [{ type: 'STRING' }] } as unknown as Schema);
    assert.deepEqual(out, { oneOf: [{ type: 'string' }] });

    const open = geminiSchemaToJsonSchema({
      type: 'OBJECT', properties: { a: { type: 'STRING' } }, additionalProperties: true,
    } as unknown as Schema);
    assert.equal(open.additionalProperties, true);

    const closed = geminiSchemaToJsonSchema({
      type: 'OBJECT', properties: {}, additionalProperties: false,
    } as unknown as Schema);
    assert.equal(closed.additionalProperties, false, 'false must survive too, not be treated as absent');

    // AtomicFact.validTo is `number | null`.
    const nullable = geminiSchemaToJsonSchema({ type: ['NUMBER', 'NULL'] } as unknown as Schema);
    assert.deepEqual(nullable.type, ['number', 'null']);
  });

  it('carries minItems and maxItems, so a declared bound reaches the decoder', () => {
    // The bound is useless if the translator eats it: the endpoint would still
    // be told `pair` is an unbounded string array, and a one-element pair would
    // still be spent and thrown away by parseOp.
    const translated = geminiSchemaToJsonSchema(IR_SCHEMA as unknown as Schema);
    const ops = ((((translated.properties as Record<string, Record<string, unknown>>)
      .candidates.items as Record<string, Record<string, unknown>>)
      .properties as Record<string, Record<string, unknown>>).ops) as Record<string, unknown>;
    const branches = (ops.items as Record<string, unknown>).anyOf as Array<Record<string, Record<string, unknown>>>;
    const shift = branches.find((b) => ((b.properties.op as Record<string, unknown>).enum as string[])?.[0] === 'SHIFT_RELATIONSHIP');
    assert.ok(shift, 'the SHIFT_RELATIONSHIP branch must survive translation');
    const pair = shift!.properties.pair as Record<string, unknown>;
    assert.equal(pair.minItems, 2, 'minItems must reach the wire');
    assert.equal(pair.maxItems, 2, 'maxItems must reach the wire');
    assert.deepEqual(pair.items, { type: 'string' });
  });

  it('carries the other validation keywords, and deliberately not format/default', () => {
    const bounded = geminiSchemaToJsonSchema({
      type: 'OBJECT',
      properties: {
        n: { type: 'NUMBER', minimum: 1, maximum: 5 },
        s: { type: 'STRING', minLength: 2, maxLength: 8, pattern: '^[A-Z]+$' },
      },
      required: ['n', 's'],
    } as unknown as Schema);
    const props = bounded.properties as Record<string, Record<string, unknown>>;
    assert.equal(props.n.minimum, 1);
    assert.equal(props.n.maximum, 5);
    assert.equal(props.s.minLength, 2);
    assert.equal(props.s.maxLength, 8);
    assert.equal(props.s.pattern, '^[A-Z]+$');

    // Not carried, on purpose — see the comment in schema.ts. `propertyOrdering`
    // is not a JSON Schema keyword, and the other two change how a strict
    // decoder treats an otherwise-valid payload.
    const dropped = geminiSchemaToJsonSchema({
      type: 'STRING', format: 'date-time', default: 'x', propertyOrdering: ['a'],
    } as unknown as Schema);
    assert.deepEqual(dropped, { type: 'string' });
  });

  it('leaves a schema with no union exactly as it was', () => {
    const out = geminiSchemaToJsonSchema({
      type: 'OBJECT', properties: { n: { type: 'NUMBER' } }, required: ['n'],
    } as unknown as Schema);
    assert.deepEqual(out, { type: 'object', properties: { n: { type: 'number' } }, required: ['n'] });
  });
});
