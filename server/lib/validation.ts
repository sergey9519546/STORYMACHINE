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

// ── Psychology substrate schemas (Fix B — audit: /api/init silently dropped
// darkTriad/bigFive/attachmentStyle/defenseMechanisms/goalStack) ─────────────
// Shapes mirror server/engine/types.ts exactly (DarkTriad, BigFive,
// AttachmentStyle, DefenseMechanism, GoalStack) so a payload that passes this
// schema is guaranteed to be assignable straight onto a CharacterSheet with no
// further coercion needed at the handler.

export const DarkTriadFieldSchema = z.object({
  machiavellianism: z.number().min(0).max(100),
  narcissism: z.number().min(0).max(100),
  psychopathy: z.number().min(0).max(100),
}).passthrough();

export const BigFiveFieldSchema = z.object({
  openness: z.number().min(0).max(100),
  conscientiousness: z.number().min(0).max(100),
  extraversion: z.number().min(0).max(100),
  agreeableness: z.number().min(0).max(100),
  neuroticism: z.number().min(0).max(100),
}).passthrough();

// Matches server/engine/types.ts's AttachmentStyle union exactly.
export const AttachmentStyleFieldSchema = z.enum(['secure', 'anxious', 'avoidant', 'anxious_avoidant']);

// Matches server/engine/types.ts's DefenseMechanism union exactly.
export const DefenseMechanismFieldSchema = z.enum([
  'rationalization', 'intellectualization', 'projection', 'displacement',
  'denial', 'dissociation', 'repression',
]);

export const GoalFieldSchema = z.object({
  id: z.string().min(1).max(128),
  description: z.string().min(1).max(500),
  value: z.number().min(0).max(100),
  achieved: z.boolean(),
  depends_on: z.array(z.string().max(128)).max(20).optional(),
  priority: z.number().optional(),
}).passthrough();

export const GoalStackFieldSchema = z.object({
  terminal: GoalFieldSchema,
  instrumental: z.array(GoalFieldSchema).max(20).default([]),
  last_planned_at: z.number().default(0),
}).passthrough();

const AgentItemSchema = z
  .object({
    char_id: z.string().min(1).max(64),
    name: z.string().min(1).max(256),
    public_mask: z.string().max(2000).default(''),
    hidden_motive: z.string().max(2000).default(''),
    knowledge_vector: z.array(z.string()).max(50).default([]),
    suspicion_score: z.number().min(0).max(100).default(0),
    current_location_id: z.string().max(64).default(''),
    // Fix B: previously accepted by ScenarioBuilder's UI (Dark-Triad sliders,
    // attachment dropdown) but silently discarded by /api/init's handler —
    // now validated here (400 on malformed values, e.g. an unknown
    // attachmentStyle) and threaded through to the registered CharacterSheet
    // in server/routes/game.ts.
    darkTriad: DarkTriadFieldSchema.optional(),
    bigFive: BigFiveFieldSchema.optional(),
    attachmentStyle: AttachmentStyleFieldSchema.optional(),
    defenseMechanisms: z.array(DefenseMechanismFieldSchema).max(7).optional(),
    goalStack: GoalStackFieldSchema.optional(),
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

// POST /api/run-scene — Fix D: exposes the previously-dormant
// Orchestrator.runFullScene (multi-room orchestration). locationIds is capped
// at 8 (vs. RunRoomBodySchema's single nodeId) because each room fans out to
// several LLM calls per round, and runFullScene runs every listed room every
// round — an unbounded list would let one request multiply that fan-out
// arbitrarily. roundsPerRoom maps onto runFullScene's `turnsPerRoom` argument
// (how many turns each room gets per full-scene round); capped tighter than
// RunRoomBodySchema.maxTurns (50) for the same fan-out-budget reason.
export const RunSceneBodySchema = z.object({
  sessionId: sessionIdField,
  locationIds: z.array(z.string().min(1).max(128)).min(1).max(8),
  roundsPerRoom: z.number().int().min(1).max(12).optional(),
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

// POST /api/nvm/converge/commit — the missing back-half of generate→audit→select
// (server/nvm/converge/loop.ts now returns per-candidate scores + a `winner`
// instead of discarding them; this is where one of those candidates — winner,
// runner-up, or a restored ghost's `branchedOps` — actually becomes a
// StoryCommit). `ops` shape mirrors InjectOpsBodySchema/StoryOpItemSchema exactly:
// same op-kind discriminator check, since the handler builds the same kind of
// minimal IR shell inject-ops's proof-inspection routes already use.
// `activeMechanisms`/`preconditions` are optional but matter more than they look:
// the handler re-runs Tier 1 before committing, and MechanismProof/CausalProof
// (server/nvm/proof/tier1/{mechanism,causal}.ts) block on the IR's OWN declared
// metadata regardless of session state — MechanismProof unconditionally fails an
// empty activeMechanisms list, and CausalProof requires ≥1 precondition for any
// non-initial (sceneIdx > 0) scene with ops. A caller committing a candidate or
// ghost already has both fields on that candidate's own `ir` (server/routes/nvm.ts
// now returns `candidates[].ir` / ghost `.ir` in full) — passing them through here
// lets that declarative half of Tier 1 re-verify meaningfully instead of always
// failing on an empty default.
export const ConvergeCommitBodySchema = z.object({
  sessionId: sessionIdField,
  ops: z.array(StoryOpItemSchema).min(1),
  sceneIdx: z.number().optional(),
  activeMechanisms: z.array(z.string().min(1).max(128)).max(10).optional(),
  preconditions: z.array(z.string().max(256)).max(20).optional(),
  summary: z.string().max(500).optional(),
});

export const ConvergeArcBodySchema = z.object({
  sessionId: sessionIdField,
  scenes: z.array(z.unknown()).min(1).max(8),
});

// POST /api/nvm/whatif/explore — What-If Lab compose endpoint (Run 6).
// Deliberately the SAME intervention vocabulary as TwinDoBodySchema (opId +
// optional replacement StoryOp) — server/nvm/whatif/explore.ts calls the
// exact same doIntervention() the twin/do route does, just as one step inside
// a larger composition, so there is no reason for the two request shapes to
// diverge. branchLimit is new: how many ranked forward branches to return.
// server/nvm/whatif/explore.ts also clamps this defensively, but validating
// it here means a malformed value 400s with a clear message instead of being
// silently clamped deep inside the composition module.
export const WhatIfExploreBodySchema = z.object({
  sessionId: sessionIdField,
  opId: z.string().min(1),
  replacement: z.unknown().optional(),
  branchLimit: z.number().int().min(1).max(5).optional(),
});

// POST /api/nvm/room/critique — on-demand Writers' Room (Run 6). The 6
// critics (server/nvm/room/critics/*.ts) take a whole (ir, state) pair with
// no per-scene or per-critic targeting parameter — room.ts has no concept of
// "critique just this op" or "just this critic" — so there is nothing else
// for this schema to validate beyond the shared sessionId field.
export const RoomCritiqueBodySchema = z.object({
  sessionId: sessionIdField,
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

// POST /api/scriptide/doctor — stateless (no sessionId): raw Fountain text OR
// a Final Draft (.fdx) export in, ScriptDoctorReport out. Callers submit
// EXACTLY ONE of `fountain` / `fdx` — never both, never neither — enforced by
// the refinement below so server/routes/scriptide.ts never has to re-derive
// which format arrived; it can just check which key is defined. 900_000 chars
// is deliberately below the express `express.json({ limit: '1mb' })` body cap
// (server/app.ts) so this schema's max-length check is the one that actually
// fires and returns a clean 400 — in the worst case (1 byte/char) 1mb ≈
// 1_048_576 chars, so a fountain/fdx string right at that ceiling would
// otherwise be rejected by the body parser with a less specific 413 instead
// of this schema's message.
export const DoctorBodySchema = z.object({
  fountain: z.string().min(1).max(900_000).optional(),
  fdx: z.string().min(1).max(900_000).optional(),
  title: z.string().max(300).optional(),
}).refine(
  (body) => (body.fountain !== undefined) !== (body.fdx !== undefined),
  'provide exactly one of fountain or fdx',
);

// POST /api/scriptide/doctor/deep — the opt-in "deep read" sibling of /doctor
// above. Same two-format contract (exactly one of fountain/fdx, optional
// title) — deep read only changes HOW the doctor senses each scene's
// signals (LLM reading vs. lexicon heuristics), never what the request body
// looks like, so this is a plain alias rather than a re-declared schema:
// keeping it a distinct exported name (instead of importing DoctorBodySchema
// directly at the route) leaves room for the two bodies to diverge later
// (e.g. a future per-scene budget field) without disturbing /doctor's schema.
export const DeepDoctorBodySchema = DoctorBodySchema;

// POST /api/scriptide/diagnose — stateless (no sessionId), fountain-only. This
// is the debounce-friendly "diagnostics as you type" sibling of /doctor: it
// has no fdx/pdf variant because it runs on every keystroke-pause tick against
// whatever Fountain text is already live in the editor, not an uploaded file
// that needs conversion first (the client already has fdx/pdf covered via the
// existing /doctor and /doctor/pdf routes). Same 900_000-char ceiling and the
// same rationale as DoctorBodySchema above: deliberately below the express
// `express.json({ limit: '1mb' })` body cap (server/app.ts) so THIS schema's
// max-length check is the one that actually fires and returns a clean,
// specific 400 instead of the body parser's generic 413.
export const DiagnoseBodySchema = z.object({
  fountain: z.string().min(1).max(900_000),
});

// POST /api/game/interview — character-interview feature. History entries are
// capped at 2000 chars each (matches `question`'s cap so a caller can't smuggle
// an oversized turn into context via history instead of the question field) and
// the whole transcript is capped at 20 turns to bound prompt size per request.
const InterviewHistoryItemSchema = z.object({
  role: z.enum(['user', 'character']),
  text: z.string().max(2000),
});

export const InterviewBodySchema = z.object({
  sessionId: sessionIdField,
  agentName: z.string().min(1).max(80),
  question: z.string().min(1).max(2000),
  history: z.array(InterviewHistoryItemSchema).max(20).optional(),
});

// POST /api/scriptide/fix — Run 11's fix-and-verify. Stateless (no
// sessionId), same 900_000-char fountain ceiling and rationale as
// DoctorBodySchema (deliberately below express's 1mb JSON body cap so THIS
// schema's max-length check is the one that fires with a specific message).
// `span` mirrors ApprovedSpan/LocatedIssue's 1-based inclusive line-number
// convention used throughout this bridge (revision/passes/types.ts,
// analyze/locate.ts) — endLine >= startLine is enforced by the refinement
// below; fix.ts's own clampSpan defensively re-clamps against the document's
// actual bounds regardless (a span naming lines past EOF is a normal,
// non-error case handled there, not rejected here). `issues` is capped at 10
// (a single fix call is meant to address a handful of co-located findings,
// not restate the whole report) and each field is capped to match
// fix.ts's/rewrite.ts's sanitizeForPrompt truncation lengths for the
// corresponding field, so nothing here can be silently truncated by the
// prompt builder that wasn't already validated to roughly that size.
const FixSpanSchema = z
  .object({
    startLine: z.number().int().min(1),
    endLine: z.number().int().min(1),
  })
  .refine((s) => s.endLine >= s.startLine, {
    message: 'endLine must be >= startLine',
    path: ['endLine'],
  });

const FixIssueItemSchema = z.object({
  rule: z.string().min(1).max(80),
  description: z.string().min(1).max(500),
  suggestedFix: z.string().max(500).optional(),
});

export const FixBodySchema = z.object({
  fountain: z.string().min(1).max(900_000),
  span: FixSpanSchema,
  issues: z.array(FixIssueItemSchema).min(1).max(10),
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
