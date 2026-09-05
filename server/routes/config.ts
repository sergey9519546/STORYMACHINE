import express from 'express';
import { generateContent, getModel } from '../engine/ai.ts';
import { validate, AiConfigSchema, StoryToneSchema } from '../lib/validation.ts';
import { logger } from '../lib/logger.ts';
import { applyConfig, getPublicConfig, llmReady } from '../lib/ai-config.ts';
import { checkAdminAuth, isLoopbackAddress, timingSafeStringEqual } from '../lib/admin-auth.ts';
import { instantiatePreset } from '../lib/structure-presets.ts';
import { sanitizeForPrompt } from '../lib/prompt-utils.ts';
import { version as buildVersion, commit as buildCommit } from '../lib/build-info.ts';
import { getDoctorPoolWarmState } from '../nvm/analyze/doctor-pool.ts';
import { isDraining } from '../lib/readiness.ts';
import {
  validate as validateOutline, OutlineBodySchema, ImportBodySchema,
  PacingTargetBodySchema, EmotionalArcBodySchema, DirectorStyleBodySchema,
  StoryGenreBodySchema, CharacterArcModeBodySchema, StoryThemeBodySchema,
  ApplyPresetBodySchema, RotateSessionBodySchema, DeleteSessionBodySchema,
} from '../lib/validation.ts';
import { z } from 'zod';
import type { ToneName } from '../lib/genre-router.ts';
import {
  asyncHandler, gameLimiter, aiLimiter, sessions, sessionId, getOrCreateSession,
  withSessionCommand, metrics, rotateSession, destroySession,
} from '../lib/session-store.ts';
import type { StageSnapshot, DirectorStyle, StoryStructure, OutlineBeat } from '../engine/types.ts';
import { withAiBudget, isAiBudgetExceededError, aiBudgetEnvNumber, type AiBudgetLimits } from '../lib/ai-budget.ts';
import { sanitizeExternalError } from '../lib/safe-error.ts';

// TASK 1 (ai-budget, 2026-08-03 audit): maxAttempts=1/timeoutMs=10_000 — a
// single connectivity probe, matching this call's own existing per-attempt
// timeoutMs exactly. withAiBudget (abandon-on-timeout) is safe here: this
// route holds no SessionCommandCoordinator command and mutates no session
// state.
const AI_CONFIG_TEST_BUDGET: AiBudgetLimits = {
  label: 'ai-config-test',
  maxAttempts: aiBudgetEnvNumber('AI_BUDGET_AI_CONFIG_TEST_MAX_ATTEMPTS', 1),
  timeoutMs: aiBudgetEnvNumber('AI_BUDGET_AI_CONFIG_TEST_TIMEOUT_MS', 10_000),
};

// /api/ai-config/test takes no body fields — the route fires a fixed probe
// prompt and ignores req.body entirely. AGENTS.md requires every POST to
// zod-validate its body, so this strict empty-object schema (tolerating the
// undefined body Express leaves on a bodyless POST) rejects any payload a
// caller might attach, keeping the route's "no body" contract enforced
// rather than implicit. Mirrors the validate() gate every other POST uses.
const AiConfigTestBodySchema = z.object({}).strict().or(z.undefined());

const router = express.Router();
export default router;

const SIMULATION_OBSERVATION_FIELDS = [
  'action_log',
  'agents',
  'beat_traces',
  'belief_edges',
  'dramatic_pressures',
  'event_propositions',
  'goal_mutations',
  'illusion_state',
  'locations',
  'persuasion_log',
  'stakes',
] as const satisfies readonly (keyof StageSnapshot)[];

const SIMULATION_OBSERVATION_NOTABLE_EXCLUSIONS = [
  'browser_local_state',
  'canonical_story_ops_and_commits',
  'database_wal_backups_and_recovery_metadata',
  'drama_positions',
  'event_cards',
  'ghost_commits',
  'illusion_state_total_turns_and_director_tension_state',
  'llm_cache',
  'provider_configuration_and_secrets',
  'reveal_plans',
  'self_play_corpus',
  'session_identity_and_capability',
  'v5_shadow_event_store',
  'writer_draft_and_scriptide_state',
] as const;

// Health check — no rate limit, no auth, responds even when Gemini is down.
// version/commit identify what's actually running in a deployed instance so
// ops can tell what's live and pick a known-good image to roll back to (see
// README.md "Releases"). Both are additive/byte-compatible with the prior
// shape: version comes from package.json (falls back to "unknown"), commit
// comes from a build-time GIT_SHA baked in by the Dockerfile (falls back to
// "dev") — see server/lib/build-info.ts. Neither can throw, so this endpoint
// keeps responding even when Gemini/keys/everything else is down.
router.get('/health', (_req, res) => {
  const warm = getDoctorPoolWarmState();
  res.json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    sessions: sessions.size,
    version: buildVersion,
    commit: buildCommit,
    // 2026-09-04 ops audit finding A: additive field — every prior key above
    // is unchanged — surfacing the Script Doctor worker pool's boot-time
    // pre-warm state (server/nvm/analyze/doctor-pool.ts's warmDoctorPool())
    // so a caller watching /health can see the same transition GET /ready
    // gates traffic on, without switching endpoints. `warmedAt` is an ISO
    // timestamp of the moment the pre-warm settled; null before that, in
    // step with `warm: false`.
    doctorPool: {
      warm: warm.finished,
      warmedAt: warm.finishedAt !== null ? new Date(warm.finishedAt).toISOString() : null,
      ms: warm.ms,
      // Follow-up review finding (2026-09-04): true only if the warm-up hit
      // its deadline before every job settled — see doctor-pool.ts's
      // prewarmDeadlineMs(). `warm` is still true in that case (a wedged
      // worker must not leave /ready 503 forever), this just says how it
      // got there.
      timedOut: warm.timedOut,
    },
  });
});

// Readiness — distinct from /health's unconditional liveness. NOT rate
// limited: an earlier revision carried gameLimiter here, which the 2026-09-04
// follow-up review reproduced as a defect — 130 ordinary /api requests from
// one IP (gameLimiter's own module-level, IP-keyed bucket, shared with the
// rest of /api — server/lib/session-store.ts) made THIS route answer 429 on
// a warm, healthy server, which is precisely the failure a readiness
// endpoint must never have: it made a busy container read as unhealthy to
// the Dockerfile HEALTHCHECK / docker-compose healthcheck / any orchestrator
// probe pointed here, draining a healthy instance under load. /ready is now
// exempt from rate limiting for the same reason /health always has been
// (tests/routes/route-capabilities.test.ts's exemptRoutes carries the
// written justification for both): it is an O(1) in-memory read with no
// rate-limitable cost, and an availability primitive must not itself be able
// to fail for availability reasons.
//
// Two independent 503 sources, checked in order:
//   1. DRAINING (server/lib/readiness.ts) — set the instant
//      createShutdownHandler() (server.ts) begins a graceful shutdown, BEFORE
//      server.close() ever runs (owner follow-up, 2026-09-04). Checked first
//      and unconditionally: a draining process must answer 503 even if the
//      doctor pool is warm — the point is "stop sending me new work," not
//      "am I ready." WHO ACTUALLY SEES THIS (second follow-up review, same
//      day, measured directly): with the default SHUTDOWN_DRAIN_MS=0,
//      setDraining() and server.close() run in the same synchronous tick, so
//      only a caller already holding an open, keep-alive connection can land
//      a request on this branch before the socket stops accepting new ones —
//      a fresh connection opened moments after the signal was observed to
//      get ECONNREFUSED instead, never seeing this response at all.
//      SHUTDOWN_DRAIN_MS (server.ts's shutdownDrainMs()) widens that window
//      so a fresh-connection-per-poll prober (most load balancer/orchestrator
//      healthchecks, including this repo's own Dockerfile/docker-compose
//      wget) gets a real chance to observe it too — see server.ts's and
//      README's docs on that variable for the measured timeline.
//   2. NOT YET WARM — the Script Doctor worker pool's boot-time pre-warm
//      (server/nvm/analyze/doctor-pool.ts's warmDoctorPool() and
//      getDoctorPoolWarmState()) has not settled. The pre-warm runs for
//      "~2.1–2.7 s on an idle box, up to ~3.9 s under load (measured
//      2026-09-04/05)" (warmDoctorPool()'s own doc comment, the one place
//      this figure is defined) AFTER the port already accepts connections
//      (server.ts dispatches it fire-and-forget from the app.listen
//      callback), so a request landing in that window would otherwise
//      silently pay the cold-start cost with no way for an orchestrator to
//      know to hold traffic back. Once warm, this route answers 200 until
//      draining begins (see (1)) — immediately 200 when pre-warm is
//      disabled or a no-op (NODE_ENV=test, DOCTOR_POOL_PREWARM=0):
//      getDoctorPoolWarmState()
//      .finished is set true by warmDoctorPool() itself on those branches so
//      this route never blocks traffic on a warm-up that will never happen,
//      and never blocks forever on one that hangs (doctor-pool.ts's deadline).
//
// Point a load balancer's / orchestrator's readiness probe here — not
// /health, which must keep answering even when nothing is warm and even
// while draining — with a start period covering the warm-up; see the
// Dockerfile HEALTHCHECK and docker-compose.yml healthcheck, both pointed
// at /ready, and README's deployment section.
router.get('/ready', (_req, res) => {
  if (isDraining()) {
    res.status(503).json({ ready: false, reason: 'draining' });
    return;
  }
  const warm = getDoctorPoolWarmState();
  if (warm.finished) {
    res.json({ ready: true });
    return;
  }
  res.status(503).json({ ready: false, reason: 'doctor_pool_warming' });
});

// Session Rotation — rotates a bearer session ID safely (Docs/AUTH.md recommendation)
router.post('/api/session/rotate', gameLimiter, validate(RotateSessionBodySchema), asyncHandler(async (req, res) => {
  const oldId = sessionId(req);
  const body = req.body as z.infer<typeof RotateSessionBodySchema>;
  const result = await rotateSession(oldId, body?.newSessionId);
  res.json({ status: 'ok', ...result });
}));

// E4 "delete everything" — the server half of the local-first safety net's
// destructive control (src/components/SettingsPanel.tsx's Session tab). Uses
// the SAME destroySession() every other lifecycle primitive in this codebase
// calls (server/lib/session-store.ts): closes the in-memory Stage and, in
// PERSIST_SESSIONS mode, unlinks the session's .db/-wal/-shm/-journal files
// from disk — a true wipe, not a soft reset. Always operates on the
// CALLER's own session (sessionId(req) — explicit body/query, then
// X-Session-Id header, then 'default'), exactly like every read/write route
// in this file; there is no sessionId body field to target another session
// with. A SessionBusyError (an in-flight command on this session) surfaces
// as its own 409 via app.ts's global error handler rather than deleting out
// from under an active mutation — the caller can retry once idle.
//
// THREE STORES, NOT ONE (2026-09-04 privacy re-verification). destroySession()
// covers the durable ones: the in-memory Stage, the session's SQLite artifacts,
// and — added by the same pass — its automatic reset-backup directory. Two
// process-memory stores learned about the writer's draft after E4 was verified
// and are cleared here, in the route, because neither belongs to
// session-store.ts's dependency surface:
//
//   1. COLLABORATION. A room minted by this session outlives its SQLite file
//      by up to COLLAB_ROOM_TTL_MS (24h default) and its Y.Doc holds the draft
//      text in RAM for as long as the room lives. Measured before the fix:
//      POST /api/collab/token still answered 200 for a room the writer had
//      just deleted everything for. Docs are destroyed FIRST, while the
//      registry can still answer "who created this room?".
//
//   2. THE DOCTOR'S REPORT CACHE. A cached ScriptDoctorReport is derived, not
//      raw, but its findings carry `location` strings built from the writer's
//      own sluglines ("Scene 3 (INT. THE BAR)"), so a report for a deleted
//      draft is writer-identifiable content sitting in process memory. The
//      cache is a PURE memoization keyed by content hash and is shared across
//      sessions, so clearing it is always safe for correctness and costs only
//      a recompute — and clearing it globally is the honest reading of
//      "delete everything" on a local-first, single-writer deployment, which
//      is the shape this product actually ships in (NORTH_STAR: multi-tenant
//      SaaS is a non-goal). gameLimiter bounds how often an anonymous caller
//      can force that recompute.
//
// Each purge is independently best-effort and runs AFTER the durable delete
// has already succeeded: a failure to drop an in-memory copy must not turn a
// completed wipe into a 500 the writer reads as "nothing was deleted".
router.post('/api/session/delete', gameLimiter, validate(DeleteSessionBodySchema), asyncHandler(async (req, res) => {
  const id = sessionId(req);
  destroySession(id);

  let collabRoomsPurged = 0;
  try {
    const { collabRoomCreator, forgetCollabRoomsForSession } = await import('../lib/collab-rooms.ts');
    const { destroyCollabRoomsWhere } = await import('../collab/yjs-server.ts');
    destroyCollabRoomsWhere(roomId => collabRoomCreator(roomId) === id);
    collabRoomsPurged = forgetCollabRoomsForSession(id);
  } catch (error) {
    logger.warn('session_delete_collab_purge_failed', { error: (error as Error).message });
  }

  let doctorCacheCleared = false;
  try {
    const { clearDoctorCache } = await import('../nvm/analyze/doctor.ts');
    clearDoctorCache();
    const { purgeDoctorWorkers } = await import('../nvm/analyze/doctor-pool.ts');
    purgeDoctorWorkers();
    doctorCacheCleared = true;
  } catch (error) {
    logger.warn('session_delete_doctor_cache_purge_failed', { error: (error as Error).message });
  }

  res.json({ status: 'deleted', sessionId: id, collabRoomsPurged, doctorCacheCleared });
}));

// Metrics — Gemini call volume, latency, retries and failures per category
// (audit finding S1-a-2, BLOCKER). token usage / est_cost_usd / session
// counts are operationally sensitive — this used to be wide open to anyone
// who could reach the port.
//
// Default (METRICS_TOKEN unset): loopback-only. This keeps the endpoint
// working exactly as before for local dev / same-host monitoring / this
// repo's own tests (all of which hit the server via 127.0.0.1), while
// closing the "any anonymous internet visitor can read it" exposure without
// requiring any new configuration — the least-surprising secure default for
// a deployment that hasn't opted into anything yet. A reverse-proxied
// deployment that puts a scraper on a DIFFERENT host must set METRICS_TOKEN.
//
// With METRICS_TOKEN set: require `Authorization: Bearer <token>` (constant-
// time compared) from ANY caller, loopback or not — 404, not 401, on a
// miss/mismatch, so an unauthenticated probe can't even learn the endpoint
// exists. /health stays fully open (see comment above) — it leaks only a
// liveness count, not usage/cost data.
//
// NOTE for deployment docs (.env.example, not owned by this pass): document
// METRICS_TOKEN here loudly — set it in any deployment where a monitoring
// scraper needs to reach /metrics from off-host.
//
// isLoopbackAddress/timingSafeStringEqual/checkAdminAuth now live in
// server/lib/admin-auth.ts (imported above) so every route that mutates
// process-global AI-provider config — this file's POST /api/ai-config and
// POST /api/ai-config/test, plus server/routes/ai-providers.ts's POST
// /api/ai-providers/switch — shares one gate instead of each route file
// carrying its own copy that could silently drift out of sync.
router.get('/metrics', (req, res) => {
  const metricsToken = process.env.METRICS_TOKEN;
  if (metricsToken) {
    const auth = req.headers.authorization ?? '';
    const provided = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!provided || !timingSafeStringEqual(provided, metricsToken)) {
      res.status(404).end();
      return;
    }
  } else if (!isLoopbackAddress(req.ip)) {
    res.status(404).end();
    return;
  }
  res.json({ sessions: sessions.size, ...metrics.snapshot() });
});

// Write-gate for the AI provider config routes below (GET stays open — it
// only ever returns booleans, never key material, so there's nothing to
// protect there; see getPublicConfig()'s own contract). Without this, ANY
// remote caller could POST new provider config — including a baseUrl — and
// silently redirect the server's AI traffic (and any key it's given) to an
// attacker-controlled endpoint. Same default posture as /metrics above:
// loopback-only until an operator opts into remote config by setting
// ADMIN_TOKEN, at which point the token is required from every caller,
// loopback included (a set token means "only holders of this token", not
// "holders of this token, OR loopback"). checkAdminAuth itself now lives in
// server/lib/admin-auth.ts (imported above) — see that module's comment.
//
// ── AI provider config routes ─────────────────────────────────────────────
// gameLimiter added 2026-08-03: this was the one route in the file with no
// limiter at all, against CLAUDE.md's "every route takes gameLimiter" rule.
// Low direct risk — the body is booleans only, never key material — but the
// same invariant had already silently drifted on two LLM routes, so close it.
router.get('/api/ai-config', gameLimiter, (_req, res) => {
  const pub = getPublicConfig();
  // Single source of truth: server/lib/ai-config.ts::llmReady() evaluates the
  // active configured provider so this route and every generative route agree.
  // Duplicating partial credential checks here is the historical trap: it can
  // make the UI advertise a provider that the active generation seam cannot
  // actually serve.
  res.json({ ...pub, llmReady: llmReady() });
});

router.post('/api/ai-config', gameLimiter, validate(AiConfigSchema), asyncHandler(async (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  const { apiKey, imgApiKey, ttsApiKey, embApiKey, ...cfg } = req.body as Record<string, string>;
  applyConfig(cfg, { apiKey, imgApiKey, ttsApiKey, embApiKey });
  res.json({ ok: true, config: getPublicConfig() });
}));

// Connection test — fires a minimal generate call so the Settings UI can verify credentials.
// aiLimiter (not gameLimiter): this route calls generateContent (an actual LLM
// call), same as every other LLM-triggering route in this codebase.
router.post('/api/ai-config/test', aiLimiter, validate(AiConfigTestBodySchema), asyncHandler(async (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const result = await withAiBudget(AI_CONFIG_TEST_BUDGET, () => generateContent({
      model: getModel('fast'),
      contents: 'Reply with the single word: OK',
      config: { maxOutputTokens: 8, temperature: 0 },
    }, { label: 'connection-test', timeoutMs: 10_000 }));
    const text = typeof result.text === 'string' ? result.text.trim() : '';
    res.json({ ok: true, response: text.substring(0, 64) });
  } catch (err) {
    // TASK 2 (safe-error, 2026-08-03 audit): sanitizeExternalError() is now
    // THE single source of the redacted text, computed once and reused for
    // both sinks. Previously this call site computed its own inline
    // redaction for the HTTP response only and logged the RAW error two
    // lines below — see server/lib/safe-error.ts's header for the incident
    // this centralizes the fix for. isAiBudgetExceededError() gets its own
    // distinct status (503, not 502): a budget stop is this server
    // deliberately giving up, not the upstream provider failing.
    const sanitized = sanitizeExternalError(err);
    logger.warn('ai_config_test_failed', { ...sanitized });
    const budgetExceeded = isAiBudgetExceededError(err);
    res.status(budgetExceeded ? 503 : 502).json({
      ok: false,
      error: sanitized.message,
      ...(budgetExceeded ? { code: err.code } : {}),
    });
  }
}));

// ── Writer pacing target ──────────────────────────────────────────────────
router.get('/api/pacing-target', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const target = stage.getIllusionState().pacing_target ?? null;
  res.json({ target });
}));

router.post('/api/pacing-target', gameLimiter, validate(PacingTargetBodySchema), withSessionCommand(async (req, res, session) => {
  const { stage } = session;
  const { target } = req.body as { target: 'slow' | 'medium' | 'fast' };
  stage.updateIllusionState({ pacing_target: target });
  res.json({ target });
}));

// ── Story architecture config ─────────────────────────────────────────────
router.get('/api/story-config', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const s = stage.getIllusionState();
  res.json({
    structure: s.structure ?? null,
    emotional_arc: s.emotional_arc ?? null,
    director_style: s.director_style ?? null,
    expected_turns: s.expected_turns ?? 20,
    pacing_target: s.pacing_target ?? null,
    story_theme: s.story_theme ?? null,
    story_genre: s.story_genre ?? null,
    story_tone: s.story_tone ?? null,
    character_arc_mode: s.character_arc_mode ?? null,
  });
}));

router.post('/api/emotional-arc', gameLimiter, validate(EmotionalArcBodySchema), withSessionCommand(async (req, res, session) => {
  const { arc } = req.body as { arc: string };
  const { stage } = session;
  stage.updateIllusionState({ emotional_arc: arc as NonNullable<import('../engine/types.ts').IllusionState['emotional_arc']> });
  res.json({ arc });
}));

router.post('/api/director-style', gameLimiter, validate(DirectorStyleBodySchema), withSessionCommand(async (req, res, session) => {
  const { style } = req.body as { style: string };
  const { stage } = session;
  stage.updateIllusionState({ director_style: style as NonNullable<import('../engine/types.ts').IllusionState['director_style']> });
  res.json({ style });
}));

router.post('/api/story-genre', gameLimiter, validate(StoryGenreBodySchema), withSessionCommand(async (req, res, session) => {
  const { genre } = req.body as { genre: string };
  const { stage } = session;
  stage.updateIllusionState({ story_genre: genre as NonNullable<import('../engine/types.ts').IllusionState['story_genre']> });
  res.json({ genre });
}));

// POST /api/story-tone (B1-a, persistence upgraded I1-a) — mirrors
// story-genre's contract (validate, persist against sessionId, echo the value
// back) but through a proper zod schema (StoryToneSchema, validated against
// TONE_NAME_LIST). Tone now persists in IllusionState's config_json exactly
// like story_genre, so it survives restarts and rides /api/session/export.
router.post('/api/story-tone', gameLimiter, validate(StoryToneSchema), withSessionCommand(async (req, res, session) => {
  const { tone } = req.body as { tone: ToneName };
  const { stage } = session;
  stage.updateIllusionState({ story_tone: tone });
  res.json({ tone });
}));

// POST /api/character-arc-mode (I1-a) — mirrors /api/emotional-arc exactly:
// validate the mode against CHARACTER_ARC_MODES' keys, persist into
// IllusionState so the prompt-assembly path (server/engine/agent/decision.ts)
// can inject the mode's promptInstruction the same way STYLE_MODIFIERS'
// agentInstruction reaches prompts via director_style.
router.post('/api/character-arc-mode', gameLimiter, validate(CharacterArcModeBodySchema), withSessionCommand(async (req, res, session) => {
  const { mode } = req.body as { mode: string };
  const { stage } = session;
  stage.updateIllusionState({ character_arc_mode: mode as NonNullable<import('../engine/types.ts').IllusionState['character_arc_mode']> });
  res.json({ mode });
}));

router.post('/api/story-theme', gameLimiter, validate(StoryThemeBodySchema), withSessionCommand(async (req, res, session) => {
  const { sanitizeForPrompt } = await import('../lib/prompt-utils.ts');
  const raw = (req.body as { theme: string }).theme;
  const theme = sanitizeForPrompt(raw.trim(), 500);
  const { stage } = session;
  stage.updateIllusionState({ story_theme: theme });
  res.json({ theme });
}));

// ── Outline routes ────────────────────────────────────────────────────────
router.get('/api/outline', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const illusion = stage.getIllusionState();
  res.json({ beats: illusion.outline ?? [] });
}));

router.post('/api/outline', gameLimiter, validate(OutlineBodySchema), withSessionCommand(async (req, res, session) => {
  const { stage } = session;
  const beats = req.body?.beats;
  if (!Array.isArray(beats)) { res.status(400).json({ error: 'beats array required' }); return; }
  // Sanitize each beat's text fields before persisting — they are later embedded in agent prompts.
  const sanitizedBeats = (beats as unknown[]).map(b => {
    if (typeof b !== 'object' || b === null) return b;
    const beat = b as Record<string, unknown>;
    const sanitizeField = (v: unknown, max = 500) =>
      typeof v === 'string' ? sanitizeForPrompt(v, max) : v;
    return {
      ...beat,
      goal:       sanitizeField(beat.goal),
      constraint: sanitizeField(beat.constraint),
      avoid:      sanitizeField(beat.avoid),
      description: sanitizeField(beat.description, 1000),
      title:      sanitizeField(beat.title, 256),
    };
  });
  stage.setOutline(sanitizedBeats as OutlineBeat[]);
  res.json({ status: 'ok', beatCount: sanitizedBeats.length });
}));

router.delete('/api/outline', gameLimiter, withSessionCommand(async (_req, res, session) => {
  const { stage } = session;
  stage.setOutline([]);
  res.json({ status: 'cleared' });
}));

// Apply a structure preset — instantiates beat templates into OutlineBeat[] and persists.
router.post('/api/outline/apply-preset', gameLimiter, validate(ApplyPresetBodySchema), withSessionCommand(async (req, res, session) => {
  const { structure, expectedTurns } = req.body as { structure: string; expectedTurns?: number };
  const n = Math.max(4, Math.min(200, Number(expectedTurns) || 20));
  const { stage } = session;
  const beats = instantiatePreset(structure, n);
  stage.setOutline(beats);
  stage.updateIllusionState({ structure: structure as import('../engine/types.ts').IllusionState['structure'], expected_turns: n });
  res.json({ beats, structure, expected_turns: n, beat_count: beats.length });
}));

// ── Partial simulation observation export / retired JSON import ───────────
router.get('/api/session/export', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const snapshot = stage.exportSnapshot();
  const observation = {
    action_log: snapshot.action_log,
    agents: snapshot.agents,
    beat_traces: snapshot.beat_traces,
    belief_edges: snapshot.belief_edges,
    dramatic_pressures: snapshot.dramatic_pressures,
    event_propositions: snapshot.event_propositions,
    goal_mutations: snapshot.goal_mutations,
    illusion_state: snapshot.illusion_state,
    locations: snapshot.locations,
    persuasion_log: snapshot.persuasion_log,
    stakes: snapshot.stakes ?? [],
  } satisfies Pick<StageSnapshot, (typeof SIMULATION_OBSERVATION_FIELDS)[number]>;

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Disposition', 'attachment; filename="storymachine-partial-simulation-observation.json"');
  res.json({
    kind: 'storymachine.simulation-observation',
    format_version: 1,
    project_recoverable: false,
    exported_at: snapshot.exported_at,
    source_database_schema_version: snapshot.schema_version,
    project_restore: {
      supported: false,
      reason: 'This artifact is a partial simulation observation; writer draft and the canonical StoryOp/commit ledger are excluded.',
      use_instead: 'documented-sqlite-backup-and-restore',
    },
    manifest: {
      complete_project_state: false,
      exclusion_policy: 'all_unlisted_session_and_project_state_is_excluded',
      included: [...SIMULATION_OBSERVATION_FIELDS],
      notable_exclusions: [...SIMULATION_OBSERVATION_NOTABLE_EXCLUSIONS],
    },
    observation,
  });
}));

router.post('/api/session/import', gameLimiter, validate(ImportBodySchema), (_req, res) => {
  res.status(410).json({
    code: 'SESSION_JSON_IMPORT_RETIRED',
    error: 'JSON session import is retired because the legacy projection is not a recoverable project.',
    recovery: 'JSON restore is unavailable. Use the documented SQLite backup and restore procedure.',
  });
});
