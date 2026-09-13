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

  it('still rejects a payload-less op — the shape the old schema produced', () => {
    // The other direction. parseOp must not be loosened to paper over a thin
    // schema: an op with no payload is not a valid op and never was.
    for (const kind of ['ADD_FACT', 'UPDATE_BELIEF', 'RAISE_CLOCK', 'SEED_CLUE']) {
      assert.equal(parseOp({ op: kind }), null, `${kind} with no payload must still parse to null`);
    }
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

  it('leaves a schema with no union exactly as it was', () => {
    const out = geminiSchemaToJsonSchema({
      type: 'OBJECT', properties: { n: { type: 'NUMBER' } }, required: ['n'],
    } as unknown as Schema);
    assert.deepEqual(out, { type: 'object', properties: { n: { type: 'number' } }, required: ['n'] });
  });
});
