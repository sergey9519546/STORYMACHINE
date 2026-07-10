// Zod schemas for the main API request bodies.
// Each schema only covers the fields the route handler actually reads;
// extra fields are stripped by default (z.object = strict by default in v3,
// but we use .passthrough() on the outer agent/location items so callers
// can include supplemental data without triggering a validation error).

import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { STORY_OP_KINDS } from '../nvm/ops/StoryOp.ts';
import { TONE_NAME_LIST, GENRE_NAMES } from './genre-router.ts';
import { ARC_TENSION_CURVES, STYLE_MODIFIERS, CHARACTER_ARC_MODES, STRUCTURE_NAMES } from './structure-presets.ts';

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

// POST /api/story-tone (B1-a — Genre Engine Expansion). Mirrors the shape of
// the existing story-genre route's validation intent (reject anything not in
// the known name list with a clean 400), but expressed as a proper zod schema
// against TONE_NAME_LIST (server/lib/genre-router.ts) — the single source of
// truth for the 16 tone registers — so a stray/misspelled tone never reaches
// server/routes/config.ts's handler.
export const StoryToneSchema = z.object({
  tone: z.enum(TONE_NAME_LIST),
});

// ── Story architecture config schemas (W4 validation-completeness audit) ────
// These six routes previously validated their single enum-ish field with an
// inline `if (!x || !VALID.includes(x))` check repeated at each route
// (server/routes/config.ts) instead of going through validate()/zod like
// their sibling /api/story-tone. Same contract, same 400 shape, now enforced
// the same way — each schema's enum is built from the SAME Object.keys(...)
// list the route itself used to construct its inline VALID array, so the
// accepted value set is unchanged.

export const PacingTargetBodySchema = z.object({
  target: z.enum(['slow', 'medium', 'fast']),
});

export const EmotionalArcBodySchema = z.object({
  arc: z.string().refine(k => k in ARC_TENSION_CURVES, {
    message: `arc must be one of: ${Object.keys(ARC_TENSION_CURVES).join(', ')}`,
  }),
});

export const DirectorStyleBodySchema = z.object({
  style: z.string().refine(k => k in STYLE_MODIFIERS, {
    message: `style must be one of: ${Object.keys(STYLE_MODIFIERS).join(', ')}`,
  }),
});

export const StoryGenreBodySchema = z.object({
  genre: z.string().refine(k => k in GENRE_NAMES, {
    message: `genre must be one of: ${Object.keys(GENRE_NAMES).join(', ')}`,
  }),
});

export const CharacterArcModeBodySchema = z.object({
  mode: z.string().refine(k => k in CHARACTER_ARC_MODES, {
    message: `mode must be one of: ${Object.keys(CHARACTER_ARC_MODES).join(', ')}`,
  }),
});

// POST /api/story-theme — free-text theme, sanitized (sanitizeForPrompt) at
// the route AFTER this schema only bounds the raw shape (must be a string;
// the route's own sanitizeForPrompt(raw.trim(), 500) call remains the single
// source of truth for the final stored/prompt-injected value, so the cap
// here is intentionally generous — large enough to never be the thing that
// truncates, matching how DoctorBodySchema's 900_000 relates to its route's
// own behavior).
export const StoryThemeBodySchema = z.object({
  theme: z.string().max(5000),
});

// POST /api/outline/apply-preset — `structure` mirrors the other five routes
// above; `expectedTurns` keeps the route's own clamp
// (Math.max(4, Math.min(200, Number(expectedTurns) || 20))) as the sole
// source of truth for out-of-range values, so this only rejects the
// non-numeric shapes that clamp was never designed to rescue silently.
export const ApplyPresetBodySchema = z.object({
  structure: z.string().refine(k => k in STRUCTURE_NAMES, {
    message: `structure must be one of: ${Object.keys(STRUCTURE_NAMES).join(', ')}`,
  }),
  expectedTurns: z.number().optional(),
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

// POST /api/export/slate — Run 14 producer-tier slate triage (append-only;
// this run does not touch any schema above). Each script's `fountain` shares
// DoctorBodySchema's own 900_000-char single-document ceiling, but that alone
// is not the binding constraint here: server/app.ts's global
// `express.json({limit:'1mb'})` body-size cap runs BEFORE this schema ever
// sees the request, so a 20-script slate at 900_000 chars apiece (~18MB)
// would be rejected by the body parser's generic 413 long before reaching
// this schema's clean, specific 400. The `.refine` below caps the SUM of
// every script's fountain length at 900_000 — the same ceiling
// DoctorBodySchema uses for a single document — which keeps even a maximal
// 20-script slate comfortably under the 1mb JSON cap after per-title/key/
// comma JSON-structure overhead, so THIS validator's message is the one that
// actually fires for an oversized slate instead of a less-specific 413.
const SlateScriptItemSchema = z.object({
  title: z.string().min(1).max(200),
  fountain: z.string().min(1).max(900_000),
}).passthrough();

export const SlateBodySchema = z.object({
  scripts: z.array(SlateScriptItemSchema).min(2).max(20),
  format: z.enum(['json', 'html']).optional(),
}).refine(
  (body) => body.scripts.reduce((sum, s) => sum + s.fountain.length, 0) <= 900_000,
  {
    message: 'combined fountain length across all scripts must not exceed 900,000 characters — split into a smaller slate',
    path: ['scripts'],
  },
);

// POST /api/export/verify — Run 15 (ROADMAP §11) determinism-badge verify
// endpoint. Same two-format contract as DoctorBodySchema (exactly one of
// fountain/fdx), plus an `expected` object naming which fields of a
// previously-exported report the caller wants re-attested against a fresh
// run. `contentHash` is REQUIRED inside `expected` — it's the anchor fact
// ("is this even the same text?") the route checks before it ever bothers
// re-running the doctor; see server/routes/export.ts's route comment. Every
// other field is optional so a caller can check only the subset of numbers
// their exported copy actually shows (e.g. a plain-text summary that quotes
// health but not healthPercentile).
const CONTENT_HASH_RE = /^[0-9a-f]{64}$/;

const VerifyExpectedSchema = z.object({
  contentHash: z.string().regex(CONTENT_HASH_RE, 'contentHash must be a 64-character lowercase hex sha256 digest'),
  health: z.number().min(0).max(100).optional(),
  verdict: z.enum(['RECOMMEND', 'CONSIDER', 'PASS']).optional(),
  totalIssues: z.number().int().min(0).optional(),
  healthPercentile: z.number().min(0).max(100).optional(),
});

export const VerifyBodySchema = z.object({
  fountain: z.string().min(1).max(900_000).optional(),
  fdx: z.string().min(1).max(900_000).optional(),
  expected: VerifyExpectedSchema,
}).refine(
  (body) => (body.fountain !== undefined) !== (body.fdx !== undefined),
  'provide exactly one of fountain or fdx',
);

// ── server/routes/game.ts schemas (W4 validation-completeness audit) ────────

// POST /api/simulate-to-fountain — a self-contained, ephemeral-Stage sibling
// of /api/init (same nodes/agents shape as InitBodySchema, capped at 10 each
// rather than 50 — the route itself already `.slice(0, 10)`s both arrays, so
// this schema's max(10) just turns that silent truncation into an honest
// 400 for a caller who sent more than the route will ever use) plus the
// run-shape fields (location_id, maxTurns, title, author) the route reads
// directly off the body.
export const SimulateToFountainBodySchema = z.object({
  nodes: z.array(LocationItemSchema).max(10),
  agents: z.array(AgentItemSchema).max(10),
  location_id: z.string().max(64).optional(),
  maxTurns: z.number().optional(),
  title: z.string().max(256).optional(),
  author: z.string().max(256).optional(),
});

// POST /api/qbn/filter-choices — `choices` is a caller-supplied list of QBN
// choice objects; the route's own filter logic already tolerates arbitrary
// shapes on each item (reading `qbnRequirements`/`consequenceScope` when
// present, ignoring everything else), so `z.unknown()` per item mirrors that
// looseness rather than re-deriving a full Choice type here. `qualities` and
// `maxScope` keep the route's own defensive fallbacks (`{}` / `'crisis'`
// ceiling) as the source of truth for out-of-range values — this schema only
// rejects the shapes those fallbacks were never meant to rescue (e.g.
// `choices` not being an array at all, which used to just be a 400 with a
// different message).
export const QbnFilterChoicesBodySchema = z.object({
  choices: z.array(z.unknown()).max(500),
  qualities: z.record(z.string(), z.number()).optional(),
  maxScope: z.enum(['micro', 'macro', 'crisis']).optional(),
});

// POST /api/ncp-storyform — every field is optional caller-supplied override
// context; the route derives the rest from the live session when omitted.
// `throughlines` and `characters` are deliberately loose (`.passthrough()` /
// `z.unknown()`) — the route only reads a handful of known string/array
// fields off each and tolerates anything else, same rationale as the NVM
// schemas above (M2.3) for domain objects the handler itself only
// shallow-validates.
export const NcpStoryformBodySchema = z.object({
  throughlines: z.object({
    objectiveStory: z.string().max(2000).optional(),
    mainCharacter: z.string().max(2000).optional(),
    influenceCharacter: z.string().max(2000).optional(),
    relationshipStory: z.string().max(2000).optional(),
    activeThroughlines: z.array(z.string().max(128)).max(20).optional(),
  }).passthrough().optional(),
  characters: z.array(z.unknown()).max(10).optional(),
});

// Path-param schema shared by GET /api/dramatic-pressure/:charId,
// /api/goal-mutations/:charId, /api/persuasion/:charId — these previously
// only did `req.params.charId?.substring(0, 128)` plus an empty-string
// check (no charset guard at all, unlike sessionId's
// `HEADER_SESSION_ID_RE`/query-body regex in session-store.ts). char_id is
// never used to build a filesystem path the way sessionId is — every use
// here is a plain in-memory Map/array lookup — so this deliberately doesn't
// reuse sessionId's stricter `[a-zA-Z0-9_-]` charset (a caller's char_id can
// legitimately contain spaces/punctuation, per AgentItemSchema's own
// `z.string().min(1).max(64)` char_id field above). It matches AgentItemSchema's
// char_id bound exactly (min 1, max 64) so a charId that could never have
// been registered by /api/init in the first place 400s before reaching the
// lookup, instead of silently falling through to a 200-with-empty-result.
export const CharIdParamSchema = z.object({
  charId: z.string().min(1).max(64),
});

// Path-param schemas for the NVM router's opaque-id lookups (server/routes/
// nvm/{debug,commits,analysis}.ts): GET /api/debug/explain/:eventId,
// /api/debug/explain-scene/:locationId, /api/nvm/commits/:commitId,
// /api/nvm/proof/:commitId, /api/nvm/quality/scene/:commitId. Every one of
// these previously took `req.params.<id>` completely unvalidated (no
// length cap, unlike sessionId's regex/CharIdParamSchema above) straight
// into an in-memory Map/array lookup (stage.getCommit, explainAction,
// Array#findIndex by commitId, …) — never a filesystem path or query
// string, so (like CharIdParamSchema) there's no charset to restrict, only
// a sane length ceiling so a pathological megabyte-long path segment can't
// be used to force a full linear scan/string-compare pass over every commit
// for no benefit to a legitimate caller. 128 matches
// GoalFieldSchema/StoryOpItemSchema's own id-field bound above — the same
// ballpark every other opaque-id field in this file already uses.
export const CommitIdParamSchema = z.object({
  commitId: z.string().min(1).max(128),
});

export const EventIdParamSchema = z.object({
  eventId: z.string().min(1).max(128),
});

export const LocationIdParamSchema = z.object({
  locationId: z.string().min(1).max(128),
});

// GET /api/nvm/project/:target — the route already 400s cleanly on an
// unknown target via its own inline `VALID.includes(target)` check; this
// schema is the SAME list expressed as a zod enum (kept as the single
// source of truth here rather than duplicated at the route) so the route
// can go through the same validateParams() 400 shape every other route in
// this audit now uses, instead of a route-local message string.
export const ProjectTargetParamSchema = z.object({
  target: z.enum([
    'fountain', 'novel', 'stage', 'comic', 'interactive', 'pitch', 'bible', 'rewatch', 'cutting_room',
    'treatment', 'outline', 'dialogue_only', 'epistolary', 'simulation_log', 'director_commentary',
  ]),
});

// ── server/routes/scriptide.ts schemas (W4 validation-completeness audit) ───

// POST /api/scriptide/save — persists the ScriptIDE editor's full working
// state. Every cap below matches the route's own pre-existing inline
// truncation exactly (`.substring(0, 500_000)`, `.slice(0, 20/100/200)`) —
// this schema turns those silent truncations into an honest 400 for
// malformed shapes (wrong type entirely), while leaving in-bounds-but-large
// values to the route's own slice/substring as before, so valid payloads at
// or under the existing caps are byte-for-byte unaffected.
export const ScriptideSaveBodySchema = z.object({
  scriptText: z.string().max(500_000).optional(),
  snapshots: z.array(z.unknown()).max(20).optional(),
  characters: z.array(z.unknown()).max(100).optional(),
  researchNotes: z.array(z.unknown()).max(200).optional(),
  isDarkMode: z.boolean().optional(),
}).passthrough();

// POST /api/scriptide/personas — registerUserPersona (server/personas/
// registry.ts) already performs its own normalization/validation and
// returns null on anything malformed (the route 400s on that null already);
// this schema only guards the outer shape (an object) so a non-object body
// 400s with the standard shape before ever reaching registerUserPersona.
export const PersonaBodySchema = z.object({
  id: z.unknown().optional(),
  name: z.unknown().optional(),
  systemPreamble: z.unknown().optional(),
}).passthrough();

// Shared by /api/scriptide/{world-build,refine-dialogue,analyze-tension,
// clean-action}: each route reads one primary text field via requireString
// (session-store.ts) — which throws a plain Error that previously fell
// through asyncHandler to the global handler's generic 500, not a 400 (see
// app.ts's error handler: only ValidationError/SyntaxError get 400) — plus
// optional scriptContext/profiles the route itself already sanitizes and
// caps via sanitizeForPrompt/sanitizeProfiles. This schema only bounds the
// outer shape; the route's own sanitize helpers remain the source of truth
// for the final prompt-injected text.
const ProfileItemSchema = z.unknown();

// Matches requireString's own contract exactly (session-store.ts): a
// non-empty-after-trim string, capped at requireString's default maxLen
// (20_000) since none of these four call sites pass an explicit maxLen.
const requireStringField = z
  .string()
  .max(20_000)
  .refine(s => s.trim() !== '', { message: 'must not be empty' });

export const WorldBuildBodySchema = z.object({
  beat: requireStringField,
  scriptContext: z.string().optional(),
  profiles: z.array(ProfileItemSchema).max(20).nullish(),
});

export const RefineDialogueBodySchema = z.object({
  dialogue: requireStringField,
  scriptContext: z.string().optional(),
  // nullish (not optional): the route's own guard is `if (rawProfiles !=
  // null)` — an explicit `null` is silently treated as "no profiles" rather
  // than rejected, and this schema preserves that.
  profiles: z.array(ProfileItemSchema).max(20).nullish(),
});

export const AnalyzeTensionBodySchema = z.object({
  scene: requireStringField,
  scriptContext: z.string().optional(),
  profiles: z.array(ProfileItemSchema).max(20).nullish(),
});

export const CleanActionBodySchema = z.object({
  text: requireStringField,
});

// POST /api/scriptide/character-profile — `profile` mirrors the route's own
// requireString reads (name/ghost/lie/want/need), each object-shaped and
// required per the existing inline `if (!profile || typeof profile !==
// 'object')` guard this schema replaces.
export const CharacterProfileBodySchema = z.object({
  profile: z.object({
    name: requireStringField,
    ghost: requireStringField,
    lie: requireStringField,
    want: requireStringField,
    need: requireStringField,
  }).passthrough(),
});

// POST /api/analyze-script — `scriptText` is the one field the route
// requires via requireString; everything else (engineState, characters) is
// caller-supplied context the route already reads defensively field-by-field
// with its own type guards and caps, so this schema leaves those loose
// (`z.unknown()`) rather than re-deriving the full EngineState shape.
export const AnalyzeScriptBodySchema = z.object({
  scriptText: requireStringField,
  engineState: z.unknown().optional(),
  characters: z.array(z.unknown()).max(50).optional(),
}).passthrough();

// POST /api/characters/export — the route's own inline check
// (`typeof charId !== 'string' || !charId.trim()`) becomes this schema;
// max(64) matches AgentItemSchema's char_id bound above.
export const CharactersExportBodySchema = z.object({
  charId: z.string().min(1).max(64).refine(s => s.trim() !== '', { message: 'must not be empty' }),
});

// POST /api/characters/import — `bundle`'s real validation is
// isCharacterMemoryBundle (engine/character-memory.ts), which the route
// still calls after this schema — this only guards the outer shape (an
// object) so a non-object/missing bundle 400s with the standard shape
// before that deeper check runs. `targetLocationId` is nullish (not just
// optional): the route's own guard (`typeof req.body?.targetLocationId ===
// 'string' ? ... : undefined`) silently treats `null`/omitted as "no
// target" without rejecting it, so `.nullish()` preserves that; any OTHER
// wrong-typed value (a number, an object) now 400s here instead of being
// silently coerced to undefined — a genuine hardening, called out in the
// audit report.
export const CharactersImportBodySchema = z.object({
  bundle: z.unknown(),
  targetLocationId: z.string().max(128).nullish(),
}).refine(b => typeof b.bundle === 'object' && b.bundle !== null, {
  message: 'bundle is required',
  path: ['bundle'],
});

// ── server/routes/export.ts schemas (W4 validation-completeness audit) ──────
// Shared by POST /api/export/{fdx,docx,print-html} — each route previously
// hand-rolled the same check via its local extractFountain() helper (still
// used for the actual 200_000-char truncation — this schema's ceiling is
// set higher, at DoctorBodySchema's own 900_000, purely as an outer sanity
// bound so a wildly oversized body 400s with a clear message instead of
// silently truncating) plus a free-text optional title, sanitized by the
// route's own sanitizeForPrompt call exactly as before.
export const FountainTitleBodySchema = z.object({
  fountain: z.string().min(1).max(900_000),
  title: z.string().max(2000).optional(),
}).passthrough();

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

// Usage:  app.get('/api/foo/:id', validateParams(FooParamSchema), handler)
// Same 400 shape as validate() above, applied to req.params instead of
// req.body — for GET/route-param routes (e.g. CharIdParamSchema) that have
// no JSON body to validate at all.
export function validateParams(schema: z.ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const msg = result.error.issues[0]?.message ?? 'Invalid request parameters';
      const path = result.error.issues[0]?.path.join('.') ?? '';
      res.status(400).json({ error: path ? `${path}: ${msg}` : msg });
      return;
    }
    next();
  };
}
