import express from 'express';
import crypto from 'crypto';
import { generateContent, getModel } from '../engine/ai.ts';
import { validate, AiConfigSchema, StoryToneSchema } from '../lib/validation.ts';
import { logger } from '../lib/logger.ts';
import { applyConfig, getPublicConfig } from '../lib/ai-config.ts';
import { instantiatePreset } from '../lib/structure-presets.ts';
import { sanitizeForPrompt } from '../lib/prompt-utils.ts';
import { version as buildVersion, commit as buildCommit } from '../lib/build-info.ts';
import {
  validate as validateOutline, OutlineBodySchema, ImportBodySchema,
  PacingTargetBodySchema, EmotionalArcBodySchema, DirectorStyleBodySchema,
  StoryGenreBodySchema, CharacterArcModeBodySchema, StoryThemeBodySchema,
  ApplyPresetBodySchema,
} from '../lib/validation.ts';
import type { ToneName } from '../lib/genre-router.ts';
import {
  asyncHandler, gameLimiter, aiLimiter, sessions, sessionId, getOrCreateSession, destroySession,
  metrics,
} from '../lib/session-store.ts';
import type { StageSnapshot, DirectorStyle, StoryStructure, OutlineBeat } from '../engine/types.ts';

const router = express.Router();
export default router;

// Health check — no rate limit, no auth, responds even when Gemini is down.
// version/commit identify what's actually running in a deployed instance so
// ops can tell what's live and pick a known-good image to roll back to (see
// README.md "Releases"). Both are additive/byte-compatible with the prior
// shape: version comes from package.json (falls back to "unknown"), commit
// comes from a build-time GIT_SHA baked in by the Dockerfile (falls back to
// "dev") — see server/lib/build-info.ts. Neither can throw, so this endpoint
// keeps responding even when Gemini/keys/everything else is down.
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    sessions: sessions.size,
    version: buildVersion,
    commit: buildCommit,
  });
});

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
function isLoopbackAddress(addr: string | undefined): boolean {
  if (!addr) return false;
  const a = addr.replace(/^::ffff:/, '');
  return a === '127.0.0.1' || a === '::1' || a.startsWith('127.');
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'utf8');
  const bBuf = Buffer.from(b, 'utf8');
  if (aBuf.length !== bBuf.length) {
    // Compare against itself so a length mismatch doesn't short-circuit
    // instantly — reduces (does not eliminate) a length-based timing signal,
    // same pattern as collab-auth.ts's verifyCollabToken.
    crypto.timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

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
// "holders of this token, OR loopback").
//
// Uses req.ip rather than /metrics' req.socket.remoteAddress: a config WRITE
// is a more sensitive operation than a metrics read, and req.socket always
// reports the immediate peer — behind a reverse proxy (this repo already
// supports TRUST_PROXY) that peer is the proxy itself, not the real client,
// which would misidentify a remote attacker as loopback. req.ip resolves the
// real client through X-Forwarded-For once trust proxy is configured, and
// falls back to the same raw peer address when it isn't.
function checkAdminAuth(req: express.Request, res: express.Response): boolean {
  const adminToken = process.env.ADMIN_TOKEN;
  if (adminToken) {
    const auth = req.headers.authorization ?? '';
    const provided = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!provided || !timingSafeStringEqual(provided, adminToken)) {
      res.status(401).json({ error: 'Unauthorized' });
      return false;
    }
  } else if (!isLoopbackAddress(req.ip)) {
    res.status(401).json({ error: 'Unauthorized: set ADMIN_TOKEN to configure AI providers remotely' });
    return false;
  }
  return true;
}

// ── AI provider config routes ─────────────────────────────────────────────
router.get('/api/ai-config', (_req, res) => {
  const pub = getPublicConfig();
  // Journey-audit finding A: SettingsPanel's keySet only mirrors the
  // multi-provider AI_API_KEY path (server/lib/ai-config.ts's private _keys,
  // wired through applyConfig/wireProviders). But the *default* code path —
  // server/engine/ai.ts's getAI() — reads process.env.GEMINI_API_KEY
  // directly and never touches ai-config.ts at all. A deployment that only
  // sets GEMINI_API_KEY (the documented default) is fully "ready" yet would
  // show keySet:false and mislead a first-time user into thinking no key is
  // configured. llmReady ORs both independent sources so the client gets one
  // honest readiness signal without ever learning either key's value.
  //
  // Third source: a keyless local model server (Ollama, LM Studio). When the
  // provider is openai-compat with a baseUrl set, the LLM seam is wired and
  // ready even with no stored key (those servers ignore Authorization), so
  // keySet stays false yet the provider genuinely works. OR that in too.
  const localProviderReady = pub.provider === 'openai-compat' && Boolean(pub.baseUrl);
  const llmReady = Boolean(process.env.GEMINI_API_KEY) || pub.keySet || localProviderReady;
  res.json({ ...pub, llmReady });
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
router.post('/api/ai-config/test', aiLimiter, asyncHandler(async (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const result = await generateContent({
      model: getModel('fast'),
      contents: 'Reply with the single word: OK',
      config: { maxOutputTokens: 8, temperature: 0 },
    }, { label: 'connection-test', timeoutMs: 10_000 });
    const text = typeof result.text === 'string' ? result.text.trim() : '';
    res.json({ ok: true, response: text.substring(0, 64) });
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    const safe = raw.length > 200 ? raw.substring(0, 200) + '…' : raw;
    const sanitized = safe.replace(/Bearer\s+\S+/gi, 'Bearer [redacted]').replace(/sk-[A-Za-z0-9_-]+/g, 'sk-[redacted]');
    logger.warn('ai_config_test_failed', { error: raw });
    res.status(502).json({ ok: false, error: sanitized });
  }
}));

// ── Writer pacing target ──────────────────────────────────────────────────
router.get('/api/pacing-target', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const target = stage.getIllusionState().pacing_target ?? null;
  res.json({ target });
}));

router.post('/api/pacing-target', gameLimiter, validate(PacingTargetBodySchema), asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
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

router.post('/api/emotional-arc', gameLimiter, validate(EmotionalArcBodySchema), asyncHandler(async (req, res) => {
  const { arc } = req.body as { arc: string };
  const { stage } = getOrCreateSession(sessionId(req));
  stage.updateIllusionState({ emotional_arc: arc as NonNullable<import('../engine/types.ts').IllusionState['emotional_arc']> });
  res.json({ arc });
}));

router.post('/api/director-style', gameLimiter, validate(DirectorStyleBodySchema), asyncHandler(async (req, res) => {
  const { style } = req.body as { style: string };
  const { stage } = getOrCreateSession(sessionId(req));
  stage.updateIllusionState({ director_style: style as NonNullable<import('../engine/types.ts').IllusionState['director_style']> });
  res.json({ style });
}));

router.post('/api/story-genre', gameLimiter, validate(StoryGenreBodySchema), asyncHandler(async (req, res) => {
  const { genre } = req.body as { genre: string };
  const { stage } = getOrCreateSession(sessionId(req));
  stage.updateIllusionState({ story_genre: genre as NonNullable<import('../engine/types.ts').IllusionState['story_genre']> });
  res.json({ genre });
}));

// POST /api/story-tone (B1-a, persistence upgraded I1-a) — mirrors
// story-genre's contract (validate, persist against sessionId, echo the value
// back) but through a proper zod schema (StoryToneSchema, validated against
// TONE_NAME_LIST). Tone now persists in IllusionState's config_json exactly
// like story_genre, so it survives restarts and rides /api/session/export.
router.post('/api/story-tone', gameLimiter, validate(StoryToneSchema), asyncHandler(async (req, res) => {
  const { tone } = req.body as { tone: ToneName };
  const { stage } = getOrCreateSession(sessionId(req));
  stage.updateIllusionState({ story_tone: tone });
  res.json({ tone });
}));

// POST /api/character-arc-mode (I1-a) — mirrors /api/emotional-arc exactly:
// validate the mode against CHARACTER_ARC_MODES' keys, persist into
// IllusionState so the prompt-assembly path (server/engine/agent/decision.ts)
// can inject the mode's promptInstruction the same way STYLE_MODIFIERS'
// agentInstruction reaches prompts via director_style.
router.post('/api/character-arc-mode', gameLimiter, validate(CharacterArcModeBodySchema), asyncHandler(async (req, res) => {
  const { mode } = req.body as { mode: string };
  const { stage } = getOrCreateSession(sessionId(req));
  stage.updateIllusionState({ character_arc_mode: mode as NonNullable<import('../engine/types.ts').IllusionState['character_arc_mode']> });
  res.json({ mode });
}));

router.post('/api/story-theme', gameLimiter, validate(StoryThemeBodySchema), asyncHandler(async (req, res) => {
  const { sanitizeForPrompt } = await import('../lib/prompt-utils.ts');
  const raw = (req.body as { theme: string }).theme;
  const theme = sanitizeForPrompt(raw.trim(), 500);
  const { stage } = getOrCreateSession(sessionId(req));
  stage.updateIllusionState({ story_theme: theme });
  res.json({ theme });
}));

// ── Outline routes ────────────────────────────────────────────────────────
router.get('/api/outline', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const illusion = stage.getIllusionState();
  res.json({ beats: illusion.outline ?? [] });
}));

router.post('/api/outline', gameLimiter, validate(OutlineBodySchema), asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
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

router.delete('/api/outline', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  stage.setOutline([]);
  res.json({ status: 'cleared' });
}));

// Apply a structure preset — instantiates beat templates into OutlineBeat[] and persists.
router.post('/api/outline/apply-preset', gameLimiter, validate(ApplyPresetBodySchema), asyncHandler(async (req, res) => {
  const { structure, expectedTurns } = req.body as { structure: string; expectedTurns?: number };
  const n = Math.max(4, Math.min(200, Number(expectedTurns) || 20));
  const { stage } = getOrCreateSession(sessionId(req));
  const beats = instantiatePreset(structure, n);
  stage.setOutline(beats);
  stage.updateIllusionState({ structure: structure as import('../engine/types.ts').IllusionState['structure'], expected_turns: n });
  res.json({ beats, structure, expected_turns: n, beat_count: beats.length });
}));

// ── Session snapshot export / import ──────────────────────────────────────
router.get('/api/session/export', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const snapshot = stage.exportSnapshot();
  res.setHeader('Content-Disposition', 'attachment; filename="storymachine-session.json"');
  res.json(snapshot);
}));

router.post('/api/session/import', gameLimiter, validate(ImportBodySchema), asyncHandler(async (req, res) => {
  const snap = req.body as StageSnapshot;
  if (!snap || typeof snap !== 'object' || !Array.isArray(snap.agents) || !Array.isArray(snap.locations)) {
    res.status(400).json({ error: 'Invalid snapshot: must include agents and locations arrays' });
    return;
  }
  if (snap.agents.length === 0 || snap.locations.length === 0) {
    res.status(400).json({ error: 'Invalid snapshot: agents and locations arrays must be non-empty' });
    return;
  }
  // Reject snapshots that are newer than the current schema version to prevent
  // silent data loss when an older server tries to import a newer snapshot.
  const CURRENT_SCHEMA = 6;
  if (typeof snap.schema_version === 'number' && snap.schema_version > CURRENT_SCHEMA) {
    res.status(422).json({
      error: `Snapshot schema v${snap.schema_version} is newer than server schema v${CURRENT_SCHEMA}. Upgrade the server first.`,
    });
    return;
  }
  const sid = sessionId(req);
  // Replace existing session with a fresh one (wipes any persisted DB), then import.
  destroySession(sid);
  const { stage, orchestrator } = getOrCreateSession(sid);
  stage.importSnapshot(snap);
  // Re-register agents and nodes into the orchestrator for future turns.
  for (const agent of stage.getAllAgents())     orchestrator.registerAgent(agent);
  for (const loc   of stage.getAllLocations())  orchestrator.registerNode(loc);
  logger.info('session_imported', { sid, agents: snap.agents.length, actions: snap.action_log.length });
  res.json({ status: 'imported', sessionId: sid, agents: snap.agents.length, turns: snap.action_log.length });
}));
