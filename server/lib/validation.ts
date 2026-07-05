// Zod schemas for the main API request bodies.
// Each schema only covers the fields the route handler actually reads;
// extra fields are stripped by default (z.object = strict by default in v3,
// but we use .passthrough() on the outer agent/location items so callers
// can include supplemental data without triggering a validation error).

import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { STORY_OP_KINDS } from '../nvm/ops/StoryOp.ts';

// ── Re-usable leaf schemas ───────────────────────────────────────────────────

const sessionIdField = z
  .string()
  .regex(/^[a-zA-Z0-9_-]{1,64}$/)
  .optional();

// Same shape as sessionIdField and server/collab/yjs-server.ts's ROOM_RE —
// collab room ids are a safe, bounded token used to build a WebSocket URL path.
const roomIdField = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/);

const LocationItemSchema = z
  .object({
    location_id: z.string().min(1).max(64),
    name: z.string().min(1).max(256),
    description: z.string().max(2000).default(''),
    adjacent_locations: z.array(z.string().max(64)).max(10).default([]),
  })
  .passthrough();

const AgentItemSchema = z
  .object({
    char_id: z.string().min(1).max(64),
    name: z.string().min(1).max(256),
    public_mask: z.string().max(2000).default(''),
    hidden_motive: z.string().max(2000).default(''),
    knowledge_vector: z.array(z.string()).max(50).default([]),
    suspicion_score: z.number().min(0).max(100).default(0),
    current_location_id: z.string().max(64).default(''),
  })
  .passthrough();

// ── Exported route schemas ───────────────────────────────────────────────────

export const InitBodySchema = z.object({
  sessionId: sessionIdField,
  nodes: z.array(LocationItemSchema).max(50).optional(),
  agents: z.array(AgentItemSchema).max(50).optional(),
});

export const TurnBodySchema = z.object({
  sessionId: sessionIdField,
  agentId: z.string().min(1).max(128),
});

export const RunRoomBodySchema = z.object({
  sessionId: sessionIdField,
  nodeId: z.string().min(1).max(128),
  maxTurns: z.number().int().min(1).max(50).optional(),
});

export const ImportBodySchema = z
  .object({
    sessionId: sessionIdField,
    schema_version: z.number().int().min(0).optional(),
    agents: z.array(z.unknown()),
    locations: z.array(z.unknown()),
    action_log: z.array(z.unknown()).default([]),
  })
  .passthrough();

export const AiConfigSchema = z.object({
  provider:    z.enum(['gemini', 'openai-compat']).optional(),
  baseUrl:     z.string().url().max(512).optional(),
  apiKey:      z.string().max(512).optional(),
  model:       z.string().max(256).optional(),
  fastModel:   z.string().max(256).optional(),
  imgProvider: z.enum(['gemini', 'openai-compat', 'none']).optional(),
  imgBaseUrl:  z.string().url().max(512).optional(),
  imgApiKey:   z.string().max(512).optional(),
  imgModel:    z.string().max(256).optional(),
  ttsProvider: z.enum(['gemini', 'openai-compat', 'none']).optional(),
  ttsBaseUrl:  z.string().url().max(512).optional(),
  ttsApiKey:   z.string().max(512).optional(),
  ttsModel:    z.string().max(256).optional(),
  ttsVoice:    z.string().max(64).optional(),
  embProvider: z.enum(['gemini', 'openai-compat', 'none']).optional(),
  embBaseUrl:  z.string().url().max(512).optional(),
  embApiKey:   z.string().max(512).optional(),
  embModel:    z.string().max(256).optional(),
});

// M8: Beat outline validation — each beat's text fields are capped and
// checked for control characters before they're stored and later injected
// into agent prompts.  Combined with C1 sanitizeForPrompt() at write-time.
const CONTROL_CHARS_RE = /[\x00-\x08\x0b\x0c\x0d\x0e-\x1f\x7f]/;
const noControlChars = z.string().refine(s => !CONTROL_CHARS_RE.test(s), {
  message: 'must not contain control characters',
});

export const OutlineBeatSchema = z.object({
  phase: z.enum(['Setup', 'Turn', 'Prestige']),
  turn_start: z.number().int().min(0),
  turn_end: z.number().int().min(0),
  goal:        noControlChars.max(500).default(''),
  constraint:  noControlChars.max(500).default(''),
  avoid:       noControlChars.max(500).default(''),
  title:       noControlChars.max(256).default('').optional(),
  description: noControlChars.max(1000).default('').optional(),
}).passthrough().refine(
  b => b.turn_end >= b.turn_start,
  { message: 'turn_end must be >= turn_start', path: ['turn_end'] },
);

export const OutlineBodySchema = z.object({
  beats: z.array(OutlineBeatSchema).max(50),
});

export const CollabTokenBodySchema = z.object({
  room: roomIdField,
});

// ── NVM route schemas (audit M2.3) ───────────────────────────────────────────
// These routes previously relied on ad-hoc inline `typeof`/`Array.isArray`
// checks scattered through server/routes/nvm.ts. Schemas here match what each
// handler already assumed — deliberately loose (`.passthrough()` / `z.unknown()`)
// on complex domain objects (NarrativeTransitionIR, RevealPlan, FixedPoint,
// SceneTarget, StoryOp) that the handlers themselves only shallow-validate;
// modeling those fully in zod would duplicate TypeScript's own type system for
// no additional safety the handler doesn't already provide.

export const GhostBranchBodySchema = z.object({
  sessionId: sessionIdField,
  ghostId: z.string().min(1).max(128),
});

export const RedteamBodySchema = z.object({
  sessionId: sessionIdField,
  plan: z.object({ revealId: z.string().min(1) }).passthrough(),
});

export const QualityBodySchema = z.object({
  sessionId: sessionIdField,
  ir: z.object({ ops: z.array(z.unknown()) }).passthrough(),
});

export const TwinDoBodySchema = z.object({
  sessionId: sessionIdField,
  opId: z.string().min(1),
  replacement: z.unknown().optional(),
});

export const FixedPointsBodySchema = z.object({
  sessionId: sessionIdField,
  fixedPoints: z.array(z.unknown()).min(1),
  currentScene: z.number().optional(),
});

export const BackchainBodySchema = z.object({
  sessionId: sessionIdField,
  fixedPoint: z.object({ atScene: z.number() }).passthrough(),
  currentScene: z.number().optional(),
});

const StoryOpItemSchema = z
  .object({ op: z.string().refine(k => k in STORY_OP_KINDS, { message: 'unknown StoryOp kind' }) })
  .passthrough();

export const InjectOpsBodySchema = z.object({
  sessionId: sessionIdField,
  ops: z.array(StoryOpItemSchema).min(1),
  sceneIdx: z.number().optional(),
  label: z.string().max(256).optional(),
});

export const ConvergeBodySchema = z.object({
  sessionId: sessionIdField,
  target: z.object({ sceneIdx: z.number() }).passthrough(),
  seed: z.number().optional(),
  budget: z.object({
    maxIterations: z.number().optional(),
    candidatesPerIteration: z.number().optional(),
  }).passthrough().optional(),
});

export const ConvergeArcBodySchema = z.object({
  sessionId: sessionIdField,
  scenes: z.array(z.unknown()).min(1).max(8),
});

export const SelfplayBodySchema = z.object({
  sessionId: sessionIdField,
  scenarios: z.array(z.unknown()).min(1).max(5),
  maxSimulations: z.number().positive().optional(),
  maxScenesPerScenario: z.number().positive().optional(),
  budget: z.object({
    maxIterations: z.number().optional(),
    candidatesPerIteration: z.number().optional(),
    maxLLMCalls: z.number().optional(),
  }).passthrough().optional(),
});

export const GenomeDiffBodySchema = z.object({
  sessionId: sessionIdField,
  runIdA: z.string().min(1),
  runIdB: z.string().min(1),
});

export const GenomeBreedBodySchema = z.object({
  sessionId: sessionIdField,
  runIdA: z.string().min(1),
  runIdB: z.string().min(1),
  newId: z.string().min(1).optional(),
});

export const RepairBodySchema = z.object({
  sessionId: sessionIdField,
  ir: z.object({ ops: z.array(z.unknown()) }).passthrough(),
});

export const LiveMoveBodySchema = z.object({
  sessionId: sessionIdField,
  text: z.string().min(1).max(2000),
  sceneIdx: z.number().optional(),
});

export const LiveAdvanceBodySchema = z.object({
  sessionId: sessionIdField,
  beats: z.number().optional(),
  locationId: z.string().max(128).optional(),
});

export const CompileBodySchema = z.object({
  sessionId: sessionIdField,
  title: z.string().max(256).optional(),
});

export const ReviseBodySchema = z.object({
  sessionId: sessionIdField,
  approvedSpans: z.array(z.unknown()).optional(),
  title: z.string().max(256).optional(),
});

// ── Middleware factory ───────────────────────────────────────────────────────
// Usage:  app.post('/api/foo', validate(FooSchema), handler)
// On failure returns HTTP 400 with { error: '<first issue message>' }.

export function validate(schema: z.ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const msg = result.error.issues[0]?.message ?? 'Invalid request body';
      const path = result.error.issues[0]?.path.join('.') ?? '';
      res.status(400).json({ error: path ? `${path}: ${msg}` : msg });
      return;
    }
    next();
  };
}
