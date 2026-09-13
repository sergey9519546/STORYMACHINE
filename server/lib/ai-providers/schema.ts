// Translates a Gemini Schema object (using the Type enum) to a plain JSON Schema
// object suitable for OpenAI-compatible `response_format.json_schema.schema`.
//
// Gemini's Type enum values are uppercase strings: "OBJECT", "STRING", "NUMBER",
// "INTEGER", "BOOLEAN", "ARRAY". JSON Schema requires lowercase equivalents.

import type { Schema } from '@google/genai';

export function geminiSchemaToJsonSchema(gs: Schema): Record<string, unknown> {
  // `type` may legitimately be an ARRAY (an explicit primitive union such as
  // AtomicFact.validTo's `number | null`), so it is only lowercased when it is
  // a string — calling toLowerCase on the array threw here.
  const rawType = gs.type as unknown;
  const t = typeof rawType === 'string' ? rawType.toLowerCase() : ''; // "OBJECT" → "object"
  const out: Record<string, unknown> = {};

  if (gs.description) out.description = gs.description;
  if ((gs as Schema & { enum?: unknown[] }).enum) out.enum = (gs as Schema & { enum?: unknown[] }).enum;

  // UNION BRANCHES (story-bench lane round 2, 2026-09-13). A discriminated
  // union — the shape of every StoryOp — can only be declared to a structured
  // decoder as anyOf/oneOf, and this translator used to drop both on the floor,
  // returning `{type:'object'}` with no branches. A union declared here and
  // silently deleted on the way to the wire is worse than one never declared:
  // the caller believes it asked for payloads. Translated recursively, each
  // branch being an ordinary schema.
  for (const key of ['anyOf', 'oneOf'] as const) {
    const branches = (gs as Schema & Record<string, unknown>)[key];
    if (Array.isArray(branches) && branches.length > 0) {
      out[key] = branches.map(b => geminiSchemaToJsonSchema(b as Schema));
      // A union node carries no type of its own; returning early keeps the
      // object branch below from stamping `type:'object'` over it, which some
      // decoders read as "an object with no declared properties".
      return out;
    }
  }

  if (t === 'object') {
    out.type = 'object';
    if (gs.properties) {
      out.properties = Object.fromEntries(
        Object.entries(gs.properties).map(([k, v]) => [k, geminiSchemaToJsonSchema(v as Schema)]),
      );
    }
    if (gs.required) out.required = gs.required;
    // additionalProperties was dropped too. `false` is the tighter contract a
    // strict decoder wants; `true` is the escape hatch for a payload this
    // schema cannot express. Either way it is the caller's decision, not this
    // function's, so it is carried through when set.
    const extra = (gs as Schema & { additionalProperties?: unknown }).additionalProperties;
    if (extra !== undefined) out.additionalProperties = extra;
  } else if (t === 'array') {
    out.type = 'array';
    if (gs.items) out.items = geminiSchemaToJsonSchema(gs.items as Schema);
  } else if (Array.isArray(rawType)) {
    // An explicit union of primitive types, e.g. AtomicFact.validTo's
    // `number | null`. Lowercased member-wise; `nullable` below is the Gemini
    // spelling of the same idea and still works.
    out.type = (rawType as string[]).map(x => String(x).toLowerCase());
  } else {
    out.type = t || 'string';
  }

  if ((gs as Schema & { nullable?: boolean }).nullable) {
    out.type = [out.type, 'null'];
  }

  return out;
}
