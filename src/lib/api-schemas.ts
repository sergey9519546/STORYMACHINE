/**
 * API Response Schemas
 * 
 * Runtime validation for API responses to prevent silent data corruption
 * when server schema changes break client expectations.
 */

import { z } from 'zod';

// ── Director Panel Schemas ────────────────────────────────────────────────────

// Mirrors server/engine/types.ts's OutlineBeat (phase/turn_start/turn_end/
// goal/constraint/avoid) — the actual shape GET /api/outline returns
// (server/routes/config.ts: `res.json({ beats: illusion.outline ?? [] })`).
// This previously declared a stale ordinal/label/description/timestamp shape
// that never matched the route, so schema validation of a real response
// would have thrown or silently produced beats DirectorPanel's own
// OutlineBeat-typed state couldn't accept.
export const OutlineBeatSchema = z.object({
  phase: z.enum(['Setup', 'Turn', 'Prestige']),
  turn_start: z.number(),
  turn_end: z.number(),
  goal: z.string(),
  constraint: z.string(),
  avoid: z.string(),
});

export const StoryConfigSchema = z.object({
  structure: z.string().nullable(),
  emotional_arc: z.string().nullable(),
  director_style: z.string().nullable(),
  expected_turns: z.number(),
  pacing_target: z.string().nullable(),
  story_genre: z.string().nullable(),
});

export const OutlineResponseSchema = z.object({
  beats: z.array(OutlineBeatSchema),
});

// ── Story Machine Schemas ─────────────────────────────────────────────────────

export const AIConfigSchema = z.object({
  llmReady: z.boolean(),
});

export const PersuasionRecordSchema = z.object({
  turn: z.number(),
  targetId: z.string(),
  mode: z.string(),
  success: z.boolean().optional(),
  resistance: z.number().optional(),
});

export const CharacterSheetSchema = z.object({
  char_id: z.string(),
  name: z.string(),
  public_mask: z.string().optional(),
  hidden_motive: z.string().optional(),
  knowledge_vector: z.array(z.string()).optional(),
});

export const LocationSchema = z.object({
  node_id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  adjacent: z.array(z.string()).optional(),
});

export const StateResponseSchema = z.object({
  agents: z.array(CharacterSheetSchema),
  nodes: z.array(LocationSchema),
});

// ── Character Arc Panel Schemas ───────────────────────────────────────────────

export const SceneSnapshotSchema = z.object({
  sceneIdx: z.number(),
  beliefCount: z.number(),
  avgConfidence: z.number(),
  dominantEmotion: z.string(),
  emotionIntensity: z.number(),
  netRelationshipScore: z.number(),
  agencyCount: z.number(),
});

export const CharacterArcSchema = z.object({
  charId: z.string(),
  scenes: z.array(SceneSnapshotSchema),
  totalScenes: z.number(),
  peakBeliefs: z.number(),
  peakIntensity: z.number(),
  dominantEmotions: z.array(z.string()),
  totalAgency: z.number(),
});

export const ArcDataResponseSchema = z.object({
  characters: z.array(CharacterArcSchema),
  totalScenes: z.number(),
});

// ── Causal Twin Panel Schemas ─────────────────────────────────────────────────

// StoryOp payloads vary by op kind — require the discriminant, allow extra keys.
const StoryOpShapeSchema = z.object({ op: z.string() }).passthrough();

export const SCMNodeSummarySchema = z.object({
  opId: z.string(),
  commitId: z.string(),
  opIdx: z.number(),
  op: StoryOpShapeSchema,
  parents: z.array(z.string()),
  children: z.array(z.string()),
});

export const SCMDataSchema = z.object({
  nodes: z.array(SCMNodeSummarySchema),
  order: z.array(z.string()),
  nodeCount: z.number(),
});

export const AffectedOpSchema = z.object({
  opId: z.string(),
  commitId: z.string(),
  opIdx: z.number(),
  originalOp: StoryOpShapeSchema,
  reason: z.string(),
  distance: z.number(),
});

export const CounterfactualReportSchema = z.object({
  intervention: z.object({
    opId: z.string(),
    replacement: z.unknown(),
  }),
  affectedOps: z.array(AffectedOpSchema),
  directlyAffected: z.array(AffectedOpSchema),
  transitivelyAffected: z.array(AffectedOpSchema),
  summary: z.string(),
});

// ── AI Panel Schemas ──────────────────────────────────────────────────────────

export const AIResponseSchema = z.object({
  result: z.string().optional(),
  error: z.string().optional(),
});

// ── Type Exports ──────────────────────────────────────────────────────────────

export type OutlineBeat = z.infer<typeof OutlineBeatSchema>;
export type StoryConfig = z.infer<typeof StoryConfigSchema>;
export type AIConfig = z.infer<typeof AIConfigSchema>;
export type PersuasionRecord = z.infer<typeof PersuasionRecordSchema>;
export type CharacterSheet = z.infer<typeof CharacterSheetSchema>;
export type Location = z.infer<typeof LocationSchema>;
export type StateResponse = z.infer<typeof StateResponseSchema>;
export type SceneSnapshot = z.infer<typeof SceneSnapshotSchema>;
export type CharacterArc = z.infer<typeof CharacterArcSchema>;
export type ArcDataResponse = z.infer<typeof ArcDataResponseSchema>;
export type SCMNodeSummary = z.infer<typeof SCMNodeSummarySchema>;
export type SCMData = z.infer<typeof SCMDataSchema>;
export type AffectedOp = z.infer<typeof AffectedOpSchema>;
export type CounterfactualReport = z.infer<typeof CounterfactualReportSchema>;
export type AIResponse = z.infer<typeof AIResponseSchema>;
