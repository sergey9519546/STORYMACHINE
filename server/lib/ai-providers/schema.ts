// Translates a Gemini Schema object (using the Type enum) to a plain JSON Schema
// object suitable for OpenAI-compatible `response_format.json_schema.schema`.
//
// Gemini's Type enum values are uppercase strings: "OBJECT", "STRING", "NUMBER",
// "INTEGER", "BOOLEAN", "ARRAY". JSON Schema requires lowercase equivalents.

import type { Schema } from '@google/genai';

export function geminiSchemaToJsonSchema(gs: Schema): Record<string, unknown> {
  const t = ((gs.type as string) ?? '').toLowerCase(); // "OBJECT" → "object"
  const out: Record<string, unknown> = {};

  if (gs.description) out.description = gs.description;
  if ((gs as Schema & { enum?: unknown[] }).enum) out.enum = (gs as Schema & { enum?: unknown[] }).enum;

  if (t === 'object') {
    out.type = 'object';
    if (gs.properties) {
      out.properties = Object.fromEntries(
        Object.entries(gs.properties).map(([k, v]) => [k, geminiSchemaToJsonSchema(v as Schema)]),
      );
    }
    if (gs.required) out.required = gs.required;
  } else if (t === 'array') {
    out.type = 'array';
    if (gs.items) out.items = geminiSchemaToJsonSchema(gs.items as Schema);
  } else {
    out.type = t || 'string';
  }

  if ((gs as Schema & { nullable?: boolean }).nullable) {
    out.type = [out.type, 'null'];
  }

  return out;
}
