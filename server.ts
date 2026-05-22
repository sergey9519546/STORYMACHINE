import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { Type } from '@google/genai';
import { generateContent, getImageProvider, getTTSProvider, getModel } from './server/engine/ai.ts';
import { rateLimit } from 'express-rate-limit';
import { Stage } from './server/engine/Stage.ts';
import { Orchestrator, type RoomProgressEvent } from './server/engine/Orchestrator.ts';
import type { CharacterSheet, Location, StageSnapshot, StoryStructure, DirectorStyle } from './server/engine/types.ts';
import { transcriptToFountain, extractCharactersFromLog, syuzhetSort, wrapSyuzhetFountain } from './server/lib/fountain.ts';
import { instantiatePreset, STRUCTURE_NAMES, ARC_TENSION_CURVES, STYLE_MODIFIERS } from './server/lib/structure-presets.ts';
import { logger, requestLogger } from './server/lib/logger.ts';
import { metrics } from './server/lib/metrics.ts';
import { validate, InitBodySchema, TurnBodySchema, RunRoomBodySchema, ImportBodySchema, AiConfigSchema } from './server/lib/validation.ts';
import { initFromEnv, applyConfig, getPublicConfig } from './server/lib/ai-config.ts';

// ── Startup validation ────────────────────────────────────────────────────────
const AI_PROVIDER = process.env.AI_PROVIDER ?? 'gemini';
if (AI_PROVIDER === 'gemini' && !process.env.GEMINI_API_KEY) {
  console.error('FATAL: GEMINI_API_KEY environment variable is not set. Exiting.');
  process.exit(1);
}
if (AI_PROVIDER === 'openai-compat' && (!process.env.AI_BASE_URL || !process.env.AI_API_KEY)) {
  console.error('FATAL: AI_PROVIDER=openai-compat requires AI_BASE_URL and AI_API_KEY. Exiting.');
  process.exit(1);
}

// Initialise multi-provider config from environment variables
initFromEnv();

// ── Constants ─────────────────────────────────────────────────────────────────

// Directory for per-session SQLite files. Sessions survive a server restart.
// Set SESSION_DB_DIR=':memory:' to opt out of disk persistence (ephemeral runs).
const SESSION_DB_DIR = process.env.SESSION_DB_DIR ?? path.join(process.cwd(), 'data', 'sessions');
const PERSIST_SESSIONS = SESSION_DB_DIR !== ':memory:';

// ── Helpers ───────────────────────────────────────────────────────────────────
const asyncHandler = (fn: express.RequestHandler): express.RequestHandler =>
  (req, res, next) => {
    try {
      Promise.resolve(fn(req, res, next)).catch(next);
    } catch (e) {
      next(e);
    }
  };

class ValidationError extends Error {
  status = 400;
  constructor(message: string) { super(message); this.name = 'ValidationError'; }
}

const requireString = (val: unknown, name: string, maxLen = 20_000): string => {
  if (typeof val !== 'string' || val.trim() === '') throw new Error(`${name} is required`);
  if (val.length > maxLen) throw new Error(`${name} exceeds maximum length`);
  return val.trim();
};

function safeJsonParse<T>(text: string, fallback: T): T {
  try { return JSON.parse(text); } catch { return fallback; }
}

// ── Rate limiters ─────────────────────────────────────────────────────────────
const gameLimiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});

const aiLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests, please slow down.' },
});

// ── Schema for analyzeScriptBlock ─────────────────────────────────────────────
const AnalyzeScriptSchema = {
  type: Type.OBJECT,
  properties: {
    sceneAnalysis: {
      type: Type.OBJECT,
      properties: {
        composition: {
          type: Type.OBJECT,
          properties: {
            cameraAngle: { type: Type.STRING },
            shotType:    { type: Type.STRING },
            lighting:    { type: Type.STRING },
            colorPalette:{ type: Type.STRING },
          },
          required: ['cameraAngle', 'shotType', 'lighting', 'colorPalette'],
        },
        metrics: {
          type: Type.OBJECT,
          properties: {
            pivotStrength:       { type: Type.NUMBER },
            cliffhangerStrength: { type: Type.NUMBER },
            twistImpact:         { type: Type.NUMBER },
            surprise:            { type: Type.NUMBER },
            suspense:            { type: Type.NUMBER },
          },
          required: ['pivotStrength', 'cliffhangerStrength', 'twistImpact', 'surprise', 'suspense'],
        },
        commentary: {
          type: Type.OBJECT,
          properties: {
            tensionRationale:             { type: Type.STRING },
            informationPositionRationale: { type: Type.STRING },
            defenseMechanismRationale:    { type: Type.STRING },
            comicReliefRationale:         { type: Type.STRING },
            throughlineRationale:         { type: Type.STRING },
            cognitiveIllusionRationale:   { type: Type.STRING },
            cognitiveIllusionPhase:       { type: Type.STRING },
            evaluatorScores: {
              type: Type.OBJECT,
              properties: {
                ego:       { type: Type.NUMBER },
                superego:  { type: Type.NUMBER },
                narrator:  { type: Type.NUMBER },
                audience:  { type: Type.NUMBER },
                storymind: { type: Type.NUMBER },
              },
              required: ['ego', 'superego', 'narrator', 'audience', 'storymind'],
            },
          },
          required: ['tensionRationale', 'informationPositionRationale', 'defenseMechanismRationale',
                     'comicReliefRationale', 'throughlineRationale', 'cognitiveIllusionRationale',
                     'cognitiveIllusionPhase', 'evaluatorScores'],
        },
        qualityValidation: {
          type: Type.OBJECT,
          properties: {
            passed:         { type: Type.BOOLEAN },
            sinCheck:       { type: Type.STRING },
            horizonCheck:   { type: Type.STRING },
            subtextGap:     { type: Type.BOOLEAN },
          },
          required: ['passed', 'sinCheck', 'horizonCheck', 'subtextGap'],
        },
        informationPosition:  { type: Type.STRING },
        comedyMisdirection:   { type: Type.STRING, enum: ['clue_delivery', 'false_safety', 'desensitization', 'none'], nullable: true },
        audioDialogue:        { type: Type.STRING },
        imagePrompt:          { type: Type.STRING },
        extractedDialogue: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              speaker:     { type: Type.STRING },
              surfaceText: { type: Type.STRING },
            },
            required: ['speaker', 'surfaceText'],
          },
        },
        dialogueInconsistencies: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              character:    { type: Type.STRING },
              dialogueText: { type: Type.STRING },
              issue:        { type: Type.STRING },
              suggestion:   { type: Type.STRING },
            },
            required: ['character', 'dialogueText', 'issue', 'suggestion'],
          },
        },
      },
      required: ['composition', 'metrics', 'commentary', 'qualityValidation',
                 'informationPosition', 'audioDialogue', 'imagePrompt', 'comedyMisdirection'],
    },
    updatedDirectorState: {
      type: Type.OBJECT,
      properties: {
        arcMeter: {
          type: Type.OBJECT,
          properties: {
            lieBelief:        { type: Type.NUMBER },
            needAwareness:    { type: Type.NUMBER },
            internalConflict: { type: Type.NUMBER },
          },
          required: ['lieBelief', 'needAwareness', 'internalConflict'],
        },
        tensionLevel:            { type: Type.NUMBER },
        menaceGauge:             { type: Type.NUMBER },
        tensionSpace:            { type: Type.NUMBER },
        structuralNode:          { type: Type.STRING },
        unreliableNarratorScore: { type: Type.NUMBER },
        activeCodexEntries: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title:    { type: Type.STRING },
              category: { type: Type.STRING },
              content:  { type: Type.STRING },
            },
            required: ['title', 'category', 'content'],
          },
        },
        activeSecrets: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              content:  { type: Type.STRING },
              owner:    { type: Type.STRING },
              revealed: { type: Type.BOOLEAN },
            },
            required: ['content', 'owner', 'revealed'],
          },
        },
        npcs: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name:            { type: Type.STRING },
              role:            { type: Type.STRING },
              agenda:          { type: Type.STRING },
              visualAnchor:    { type: Type.STRING },
              trustworthiness: { type: Type.NUMBER },
            },
            required: ['name', 'role', 'agenda', 'visualAnchor', 'trustworthiness'],
          },
        },
        throughlines: {
          type: Type.OBJECT,
          properties: {
            objectiveStory:      { type: Type.STRING },
            mainCharacter:       { type: Type.STRING },
            influenceCharacter:  { type: Type.STRING },
            relationshipStory:   { type: Type.STRING },
            activeThroughlines:  { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['objectiveStory', 'mainCharacter', 'influenceCharacter',
                     'relationshipStory', 'activeThroughlines'],
        },
      },
      required: ['arcMeter', 'tensionLevel', 'menaceGauge', 'tensionSpace', 'structuralNode',
                 'unreliableNarratorScore', 'activeSecrets', 'npcs', 'throughlines', 'activeCodexEntries'],
    },
  },
  required: ['sceneAnalysis', 'updatedDirectorState'],
};

// ── Session management ────────────────────────────────────────────────────────
interface Session {
  stage: Stage;
  orchestrator: Orchestrator;
  lastAccess: number;
  _turnQueue: Promise<void>;  // serializes concurrent /api/turn calls per session
}
const sessions = new Map<string, Session>();
const SESSION_TTL_MS = 30 * 60 * 1000;
const MAX_SESSIONS   = Number(process.env.MAX_SESSIONS ?? 100);

function dbPathFor(sessionId: string): string {
  return PERSIST_SESSIONS ? path.join(SESSION_DB_DIR, `${sessionId}.db`) : ':memory:';
}

function getOrCreateSession(sessionId: string): Session {
  let session = sessions.get(sessionId);
  if (!session) {
    if (sessions.size >= MAX_SESSIONS) {
      // Evict the least-recently-accessed session to stay within the cap.
      let oldestId = '';
      let oldestAccess = Infinity;
      for (const [id, s] of sessions) {
        if (s.lastAccess < oldestAccess) { oldestAccess = s.lastAccess; oldestId = id; }
      }
      if (oldestId) {
        sessions.get(oldestId)?.stage.close();
        sessions.delete(oldestId);
        logger.warn('session_evicted', { evicted: oldestId, cap: MAX_SESSIONS });
      }
    }
    // For a persisted session this opens the existing file; the Orchestrator
    // constructor re-hydrates agents + locations, so the session resumes intact.
    const s = new Stage(dbPathFor(sessionId));
    session = { stage: s, orchestrator: new Orchestrator(s), lastAccess: Date.now(), _turnQueue: Promise.resolve() };
    sessions.set(sessionId, session);
  }
  session.lastAccess = Date.now();
  return session;
}

// Evict a session from memory AND delete its persisted DB file — a true wipe.
function destroySession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) { session.stage.close(); sessions.delete(sessionId); }
  if (PERSIST_SESSIONS) {
    const base = path.join(SESSION_DB_DIR, `${sessionId}.db`);
    for (const suffix of ['', '-wal', '-shm', '-journal']) {
      try { fs.unlinkSync(base + suffix); } catch { /* file absent — fine */ }
    }
  }
}

// TTL cleanup: evict idle sessions from memory and release the file handle.
// The DB file remains on disk so the session resumes on next access.
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.lastAccess > SESSION_TTL_MS) {
      s.stage.close();
      sessions.delete(id);
    }
  }
}, 60_000).unref();

// Disk cleanup: remove orphaned session DB files that are older than SESSION_FILE_TTL_MS
// and are not currently loaded in memory. Runs every 6 hours.
const SESSION_FILE_TTL_MS = Number(process.env.SESSION_FILE_TTL_HOURS ?? 168) * 60 * 60 * 1000; // default 7 days
if (PERSIST_SESSIONS) {
  setInterval(() => {
    const now = Date.now();
    let files: string[];
    try { files = fs.readdirSync(SESSION_DB_DIR); } catch { return; }
    for (const file of files) {
      if (!file.endsWith('.db')) continue;
      const sid = file.slice(0, -3);
      if (sessions.has(sid)) continue; // actively loaded — skip
      const filePath = path.join(SESSION_DB_DIR, file);
      try {
        const stat = fs.statSync(filePath);
        if (now - stat.mtimeMs > SESSION_FILE_TTL_MS) {
          for (const suffix of ['-wal', '-shm', '-journal']) {
            try { fs.unlinkSync(filePath + suffix); } catch { /* absent */ }
          }
          fs.unlinkSync(filePath);
          logger.info('session_disk_cleanup', { sid, ageDays: Math.round((now - stat.mtimeMs) / 86_400_000) });
        }
      } catch { /* file already gone */ }
    }
  }, 6 * 60 * 60 * 1000).unref();
}

function sessionId(req: express.Request): string {
  const raw = req.method === 'GET'
    ? req.query.sessionId
    : req.body?.sessionId;
  // No sessionId provided — fall back to 'default' (acceptable for single-user use)
  if (raw === undefined || raw === null || raw === '') return 'default';
  if (typeof raw !== 'string' || !raw.trim()) return 'default';
  const cleaned = raw.trim().substring(0, 64);
  // A sessionId was explicitly supplied but is malformed — reject with 400 rather
  // than silently falling back to 'default', which could leak another user's session.
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(cleaned)) {
    throw new ValidationError('sessionId must match [a-zA-Z0-9_-]{1,64}');
  }
  return cleaned;
}

// Prevents two concurrent runRoomSimulation() calls for the same session+room from
// interleaving writes to Action_Log and Character_State.
const runningRooms = new Set<string>();

// ── Server ────────────────────────────────────────────────────────────────────
async function startServer() {
  if (PERSIST_SESSIONS) {
    fs.mkdirSync(SESSION_DB_DIR, { recursive: true });
    logger.info('session_persistence', { dir: SESSION_DB_DIR });
  }

  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use(requestLogger());
  // Assign a trace ID to every request for correlation across logs.
  app.use((_req, res, next) => { res.locals.traceId = crypto.randomUUID(); next(); });

  // Health check — no rate limit, no auth, responds even when Gemini is down.
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: Math.round(process.uptime()), sessions: sessions.size });
  });

  // Metrics — Gemini call volume, latency, retries and failures per category.
  app.get('/metrics', (_req, res) => {
    res.json({ sessions: sessions.size, ...metrics.snapshot() });
  });

  // ── AI provider config routes ─────────────────────────────────────────────
  app.get('/api/ai-config', (_req, res) => {
    res.json(getPublicConfig());
  });

  app.post('/api/ai-config', gameLimiter, validate(AiConfigSchema), asyncHandler(async (req, res) => {
    const { apiKey, imgApiKey, ttsApiKey, embApiKey, ...cfg } = req.body as Record<string, string>;
    applyConfig(cfg, { apiKey, imgApiKey, ttsApiKey, embApiKey });
    res.json({ ok: true, config: getPublicConfig() });
  }));

  // Connection test — fires a minimal generate call so the Settings UI can verify credentials.
  // Uses the active LLM provider (whichever was just configured via POST /api/ai-config).
  app.post('/api/ai-config/test', gameLimiter, asyncHandler(async (_req, res) => {
    try {
      const result = await generateContent({
        model: getModel('fast'),
        contents: 'Reply with the single word: OK',
        config: { maxOutputTokens: 8, temperature: 0 },
      }, { label: 'connection-test', timeoutMs: 10_000 });
      const text = typeof result.text === 'string' ? result.text.trim() : '';
      res.json({ ok: true, response: text.substring(0, 64) });
    } catch (err) {
      // Sanitize upstream error — don't leak raw API error bodies to the client
      const raw = err instanceof Error ? err.message : String(err);
      const safe = raw.length > 200 ? raw.substring(0, 200) + '…' : raw;
      // Strip any bearer tokens or keys that leaked into the error message
      const sanitized = safe.replace(/Bearer\s+\S+/gi, 'Bearer [redacted]').replace(/sk-[A-Za-z0-9_-]+/g, 'sk-[redacted]');
      logger.warn('ai_config_test_failed', { error: raw });
      res.status(502).json({ ok: false, error: sanitized });
    }
  }));

  // ── Story Machine routes (game simulation) ─────────────────────────────────
  app.use('/api/init',     gameLimiter);
  app.use('/api/turn',     gameLimiter);
  app.use('/api/run-room', gameLimiter);
  app.use('/api/ledger',   gameLimiter);
  app.use('/api/state',    gameLimiter);

  app.post('/api/init', validate(InitBodySchema), asyncHandler(async (req, res) => {
    const sid = sessionId(req);
    const { nodes, agents } = req.body;
    const { orchestrator } = getOrCreateSession(sid);

    const truncatedNodes  = Array.isArray(nodes)  && nodes.length  > 50;
    const truncatedAgents = Array.isArray(agents) && agents.length > 50;
    if (truncatedNodes)  logger.warn('init_truncated', { field: 'nodes',  sent: nodes.length,  limit: 50 });
    if (truncatedAgents) logger.warn('init_truncated', { field: 'agents', sent: agents.length, limit: 50 });

    if (nodes && Array.isArray(nodes)) {
      (nodes as unknown[]).slice(0, 50).forEach((raw) => {
        if (typeof raw !== 'object' || raw === null) return;
        const n = raw as Record<string, unknown>;
        try {
          orchestrator.registerNode({
            location_id: requireString(n.location_id, 'location_id', 64),
            name: requireString(n.name, 'name', 256),
            description: requireString(n.description, 'description', 2000),
            adjacent_locations: Array.isArray(n.adjacent_locations)
              ? (n.adjacent_locations as unknown[]).filter((a): a is string => typeof a === 'string').slice(0, 20)
              : [],
          });
        } catch { /* skip malformed node */ }
      });
    }

    if (agents && Array.isArray(agents)) {
      (agents as unknown[]).slice(0, 50).forEach((raw) => {
        if (typeof raw !== 'object' || raw === null) return;
        const a = raw as Record<string, unknown>;
        try {
          orchestrator.registerAgent({
            char_id: requireString(a.char_id, 'char_id', 64),
            name: requireString(a.name, 'name', 256),
            public_mask: requireString(a.public_mask, 'public_mask', 2000),
            hidden_motive: requireString(a.hidden_motive, 'hidden_motive', 2000),
            knowledge_vector: Array.isArray(a.knowledge_vector)
              ? (a.knowledge_vector as unknown[]).filter((k): k is string => typeof k === 'string').slice(0, 100).map(k => k.substring(0, 500))
              : [],
            suspicion_score: typeof a.suspicion_score === 'number' ? Math.max(0, Math.min(100, a.suspicion_score)) : 0,
            current_location_id: typeof a.current_location_id === 'string' ? a.current_location_id.substring(0, 64) : '',
            is_alive: a.is_alive !== false,
            stakes: Array.isArray(a.stakes)
              ? (a.stakes as unknown[]).filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null)
                .slice(0, 10)
                .map(s => ({
                  id: typeof s.id === 'string' ? s.id : crypto.randomUUID(),
                  char_id: requireString(a.char_id, 'char_id', 64),
                  category: typeof s.category === 'string' ? s.category : 'reputation',
                  description: typeof s.description === 'string' ? s.description.substring(0, 500) : '',
                  magnitude: typeof s.magnitude === 'number' ? Math.max(0, Math.min(100, s.magnitude)) : 50,
                  is_active: s.is_active !== false,
                }))
              : [],
          } as CharacterSheet);
        } catch { /* skip malformed agent */ }
      });
    }

    res.json({
      status: 'initialized',
      sessionId: sid,
      ...(truncatedNodes  ? { warning_nodes:  `Only first 50 of ${nodes.length} nodes registered`  } : {}),
      ...(truncatedAgents ? { warning_agents: `Only first 50 of ${agents.length} agents registered` } : {}),
    });
  }));

  app.post('/api/turn', validate(TurnBodySchema), asyncHandler(async (req, res) => {
    const session = getOrCreateSession(sessionId(req));
    const agentId = requireString(req.body?.agentId, 'agentId', 128);

    if (!session.stage.getAgent(agentId)) {
      res.status(404).json({ error: `Agent '${agentId}' does not exist in this session` });
      return;
    }

    // Per-session serialization: each turn is chained behind the previous so
    // concurrent requests for the same session run sequentially, not in parallel,
    // preventing state corruption in the SQLite-backed engine.
    let resolveSlot!: () => void;
    const slot = new Promise<void>(r => { resolveSlot = r; });
    const prev = session._turnQueue;
    session._turnQueue = slot;

    try {
      await prev;
      const action = await session.orchestrator.runTurn(agentId);
      res.json({ action });
    } finally {
      resolveSlot();
    }
  }));

  app.post('/api/run-room', validate(RunRoomBodySchema), asyncHandler(async (req, res) => {
    const sid = sessionId(req);
    const nodeId = requireString(req.body?.nodeId, 'nodeId', 128);
    const lockKey = `${sid}:${nodeId}`;

    if (runningRooms.has(lockKey)) {
      res.status(409).json({ error: 'Simulation already running for this room. Please wait.' });
      return;
    }

    // Optional maxTurns — clamped to a safe range to bound LLM fan-out per request.
    const rawMaxTurns = req.body?.maxTurns;
    const maxTurns = typeof rawMaxTurns === 'number' && Number.isFinite(rawMaxTurns)
      ? Math.max(2, Math.min(12, Math.round(rawMaxTurns)))
      : 5;

    const { stage, orchestrator } = getOrCreateSession(sid);
    if (!stage.getLocation(nodeId)) {
      res.status(404).json({ error: `Location '${nodeId}' does not exist in this session` });
      return;
    }
    runningRooms.add(lockKey);
    try {
      await orchestrator.runRoomSimulation(nodeId, maxTurns);
      res.json({ status: 'completed', maxTurns });
    } finally {
      runningRooms.delete(lockKey);
    }
  }));

  // ── SSE streaming endpoint for run-room ─────────────────────────────────────
  // Sends newline-delimited Server-Sent Events as each agent acts, so the client
  // can display real-time progress instead of waiting for the full simulation.
  // Uses the same runningRooms lock as the batch endpoint to prevent overlap.
  app.get('/api/run-room-stream', gameLimiter, async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // disable nginx proxy buffering
    res.flushHeaders();

    let disconnected = false;
    req.on('close', () => { disconnected = true; });

    const emit = (event: RoomProgressEvent) => {
      if (!disconnected) res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    // Hard wall-clock limit: if the simulation hasn't completed in 5 minutes, close
    // the SSE stream and release the runningRooms lock so the session isn't stranded.
    const SSE_MAX_MS = 5 * 60 * 1000;
    const wallTimer = setTimeout(() => {
      if (!disconnected) {
        emit({ type: 'simulation_complete', totalTurns: 0, stoppedBy: 'error: stream timeout (5 min)' });
        res.end();
      }
      disconnected = true;
    }, SSE_MAX_MS);

    let lockKey = '';
    try {
      const sid = sessionId(req);
      const nodeId = requireString(req.query?.nodeId as string | undefined, 'nodeId', 128);
      lockKey = `${sid}:${nodeId}`;

      if (runningRooms.has(lockKey)) {
        emit({ type: 'simulation_complete', totalTurns: 0, stoppedBy: 'already_running' });
        res.end();
        return;
      }

      const rawMaxTurns = req.query?.maxTurns;
      const maxTurns = typeof rawMaxTurns === 'string' && rawMaxTurns
        ? Math.max(2, Math.min(12, parseInt(rawMaxTurns, 10) || 5))
        : 5;

      const { stage, orchestrator } = getOrCreateSession(sid);
      if (!stage.getLocation(nodeId)) {
        emit({ type: 'simulation_complete', totalTurns: 0, stoppedBy: `error: location '${nodeId}' not found` });
        res.end();
        return;
      }
      runningRooms.add(lockKey);
      try {
        await orchestrator.runRoomSimulation(nodeId, maxTurns, emit);
      } finally {
        runningRooms.delete(lockKey);
      }
    } catch (err) {
      emit({ type: 'simulation_complete', totalTurns: 0, stoppedBy: `error: ${(err as Error).message}` });
    } finally {
      clearTimeout(wallTimer);
    }

    if (!disconnected) res.end();
  });

  // ── Scene grouping endpoint ──────────────────────────────────────────────────
  // Groups the action log into scenes: contiguous blocks of actions sharing the
  // same location_id. Useful for screenplay structure analysis and export.
  app.get('/api/scenes', asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const log = stage.getFullLedger();

    type Scene = {
      scene_index: number;
      location_id: string;
      location_name: string;
      start_turn: number;
      end_turn: number;
      action_count: number;
      cast: string[];        // unique char_ids who acted
      cast_names: string[];
    };

    const scenes: Scene[] = [];
    let current: Scene | null = null;

    for (const entry of log) {
      if (!current || current.location_id !== entry.location_id) {
        current = {
          scene_index: scenes.length + 1,
          location_id: entry.location_id,
          location_name: stage.getLocation(entry.location_id)?.name ?? entry.location_id,
          start_turn: entry.timestamp,
          end_turn: entry.timestamp,
          action_count: 0,
          cast: [],
          cast_names: [],
        };
        scenes.push(current);
      }
      current.end_turn = entry.timestamp;
      current.action_count++;
      if (!current.cast.includes(entry.char_id)) {
        current.cast.push(entry.char_id);
        const name = stage.getAgent(entry.char_id)?.name ?? entry.char_id;
        current.cast_names.push(name);
      }
    }

    res.json({ scene_count: scenes.length, scenes });
  }));

  app.get('/api/ledger', asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const rawLimit  = Number(req.query.limit);
    const rawOffset = Number(req.query.offset);
    if (req.query.limit !== undefined || req.query.offset !== undefined) {
      const limit  = isNaN(rawLimit)  || rawLimit  < 1 ? 50  : Math.min(rawLimit,  500);
      const offset = isNaN(rawOffset) || rawOffset < 0 ? 0   : rawOffset;
      const total  = stage.getLedgerCount();
      res.json({ data: stage.getLedgerPage(limit, offset), total, limit, offset });
      return;
    }
    res.json(stage.getFullLedger());
  }));

  app.get('/api/state', asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    res.json({ agents: stage.getAllAgents(), nodes: stage.getAllLocations() });
  }));

  // Reset a session (clears all simulation state for this sessionId).
  // When running with disk persistence a timestamped backup is written first.
  app.post('/api/reset', gameLimiter, asyncHandler(async (req, res) => {
    const sid = sessionId(req);
    if (PERSIST_SESSIONS) {
      const src = path.join(SESSION_DB_DIR, `${sid}.db`);
      if (fs.existsSync(src)) {
        const dest = path.join(SESSION_DB_DIR, `${sid}.${Date.now()}.bak.db`);
        try { fs.copyFileSync(src, dest); } catch { /* non-fatal */ }
      }
    }
    destroySession(sid);
    res.json({ status: 'reset', sessionId: sid });
  }));

  // Export current simulation as a Fountain screenplay draft (with beat traces)
  // ?syuzhet=true  → Syuzhet reconstruction: reorder by information-reveal order
  app.get('/api/ledger/fountain', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const rawLog = stage.getFullLedger();
    const agents = stage.getAllAgents();
    const locations = stage.getAllLocations();
    const beatTraces = stage.getAllBeatTraces();
    const useSyuzhet = req.query.syuzhet === 'true';
    const log = useSyuzhet ? syuzhetSort(rawLog, beatTraces) : rawLog;
    const fountain = transcriptToFountain(log, agents, locations, undefined, beatTraces);
    const characters = extractCharactersFromLog(agents);
    res.json({
      fountain: wrapSyuzhetFountain(fountain, useSyuzhet),
      characters,
      turnCount: rawLog.length,
      beatTraceCount: beatTraces.length,
      syuzhetMode: useSyuzhet,
    });
  }));

  // Run a self-contained simulation and return Fountain output without polluting main stage
  app.post('/api/simulate-to-fountain', gameLimiter, asyncHandler(async (req, res) => {
    const { nodes: nodesPayload, agents: agentPayload, location_id, maxTurns, title, author } = req.body ?? {};

    if (!nodesPayload || !Array.isArray(nodesPayload) || !agentPayload || !Array.isArray(agentPayload)) {
      res.status(400).json({ error: 'nodes and agents arrays are required' });
      return;
    }

    const simStage = new Stage(':memory:');
    const simOrchestrator = new Orchestrator(simStage);
    try {

    (nodesPayload as unknown[]).slice(0, 10).forEach((raw) => {
      if (typeof raw !== 'object' || raw === null) return;
      const n = raw as Record<string, unknown>;
      try {
        simOrchestrator.registerNode({
          location_id: requireString(n.location_id, 'location_id', 64),
          name: requireString(n.name, 'name', 256),
          description: requireString(n.description, 'description', 2000),
          adjacent_locations: Array.isArray(n.adjacent_locations)
            ? (n.adjacent_locations as unknown[]).filter((a): a is string => typeof a === 'string').slice(0, 10)
            : [],
        });
      } catch { /* skip malformed */ }
    });

    (agentPayload as unknown[]).slice(0, 10).forEach((raw) => {
      if (typeof raw !== 'object' || raw === null) return;
      const a = raw as Record<string, unknown>;
      try {
        simOrchestrator.registerAgent({
          char_id: requireString(a.char_id, 'char_id', 64),
          name: requireString(a.name, 'name', 256),
          public_mask: requireString(a.public_mask, 'public_mask', 2000),
          hidden_motive: requireString(a.hidden_motive, 'hidden_motive', 2000),
          knowledge_vector: Array.isArray(a.knowledge_vector)
            ? (a.knowledge_vector as unknown[]).filter((k): k is string => typeof k === 'string').slice(0, 50)
            : [],
          suspicion_score: typeof a.suspicion_score === 'number' ? Math.max(0, Math.min(100, a.suspicion_score)) : 0,
          current_location_id: typeof a.current_location_id === 'string' ? a.current_location_id.substring(0, 64) : '',
          is_alive: a.is_alive !== false,
        } as CharacterSheet);
      } catch { /* skip malformed */ }
    });

    const runLocationId = typeof location_id === 'string' ? location_id
      : (nodesPayload[0] as Record<string, unknown>)?.location_id ?? '';
    const turns = typeof maxTurns === 'number' ? Math.min(maxTurns, 10) : 5;

    if (runLocationId) {
      await simOrchestrator.runRoomSimulation(String(runLocationId), turns);
    }

    const log = simStage.getFullLedger();
    const simAgents = simStage.getAllAgents();
    const simLocations = simStage.getAllLocations();
    const simBeatTraces = simStage.getAllBeatTraces();
    const fountain = transcriptToFountain(log, simAgents, simLocations, {
      title:  typeof title  === 'string' ? title.substring(0, 256)  : 'Story Machine Draft',
      author: typeof author === 'string' ? author.substring(0, 256) : 'STORYMACHINE',
    }, simBeatTraces);
    const characters = extractCharactersFromLog(simAgents);

    res.json({ fountain, characters, turnCount: log.length, agents: simAgents, beatTraceCount: simBeatTraces.length });
    } finally {
      simStage.close();
    }
  }));

  // Current Setup/Turn/Prestige illusion phase
  app.get('/api/simulation/illusion-state', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    res.json(stage.getIllusionState());
  }));

  // ── Causal-Epistemic Spine endpoints ──────────────────────────────────────

  // All beat traces (narrative beats with causal chains)
  app.get('/api/beat-traces', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const rawLimit  = Number(req.query.limit);
    const rawOffset = Number(req.query.offset);
    if (req.query.limit !== undefined || req.query.offset !== undefined) {
      const limit  = isNaN(rawLimit)  || rawLimit  < 1 ? 50  : Math.min(rawLimit,  500);
      const offset = isNaN(rawOffset) || rawOffset < 0 ? 0   : rawOffset;
      const total  = stage.getBeatTracesCount();
      res.json({ data: stage.getBeatTracesPage(limit, offset), total, limit, offset });
      return;
    }
    res.json(stage.getAllBeatTraces());
  }));

  // Active dramatic pressure on a specific agent (bias signals not yet applied)
  app.get('/api/dramatic-pressure/:charId', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const charId = req.params.charId?.substring(0, 128);
    if (!charId) { res.status(400).json({ error: 'charId is required' }); return; }
    res.json(stage.getActivePressures(charId));
  }));

  // All belief edges (contradiction graph)
  app.get('/api/belief-edges', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const rawLimit  = Number(req.query.limit);
    const rawOffset = Number(req.query.offset);
    if (req.query.limit !== undefined || req.query.offset !== undefined) {
      const limit  = isNaN(rawLimit)  || rawLimit  < 1 ? 50  : Math.min(rawLimit,  500);
      const offset = isNaN(rawOffset) || rawOffset < 0 ? 0   : rawOffset;
      const total  = stage.getBeliefEdgesCount();
      res.json({ data: stage.getBeliefEdgesPage(limit, offset), total, limit, offset });
      return;
    }
    res.json(stage.getAllBeliefEdges());
  }));

  // Goal mutations for a specific agent
  app.get('/api/goal-mutations/:charId', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const charId = req.params.charId?.substring(0, 128);
    if (!charId) { res.status(400).json({ error: 'charId is required' }); return; }
    res.json(stage.getGoalMutations(charId));
  }));

  // All goal mutations across all agents
  app.get('/api/goal-mutations', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const rawLimit  = Number(req.query.limit);
    const rawOffset = Number(req.query.offset);
    if (req.query.limit !== undefined || req.query.offset !== undefined) {
      const limit  = isNaN(rawLimit)  || rawLimit  < 1 ? 50  : Math.min(rawLimit,  500);
      const offset = isNaN(rawOffset) || rawOffset < 0 ? 0   : rawOffset;
      const total  = stage.getGoalMutationsCount();
      res.json({ data: stage.getGoalMutationsPage(limit, offset), total, limit, offset });
      return;
    }
    res.json(stage.getAllGoalMutations());
  }));

  // All active (unapplied, unexpired) dramatic pressures across all agents
  app.get('/api/dramatic-pressure-all', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    res.json(stage.getAllActivePressures());
  }));

  // Persuasion log for one agent
  app.get('/api/persuasion/:charId', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const charId = req.params.charId?.substring(0, 128);
    if (!charId) { res.status(400).json({ error: 'charId is required' }); return; }
    res.json(stage.getPersuasionLog(charId, 20));
  }));

  // Writer reads, sets, or clears the structured beat-sheet outline
  app.get('/api/outline', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const illusion = stage.getIllusionState();
    res.json({ beats: illusion.outline ?? [] });
  }));

  app.post('/api/outline', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const beats = req.body?.beats;
    if (!Array.isArray(beats)) { res.status(400).json({ error: 'beats array required' }); return; }
    stage.setOutline(beats);
    res.json({ status: 'ok', beatCount: beats.length });
  }));

  app.delete('/api/outline', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    stage.setOutline([]);
    res.json({ status: 'cleared' });
  }));

  // ── Story architecture config ─────────────────────────────────────────────
  // GET returns all persisted story config (structure, emotional_arc, director_style, expected_turns).
  // Individual POST endpoints set each field separately so the UI can update one at a time.

  app.get('/api/story-config', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const s = stage.getIllusionState();
    res.json({
      structure: s.structure ?? null,
      emotional_arc: s.emotional_arc ?? null,
      director_style: s.director_style ?? null,
      expected_turns: s.expected_turns ?? 20,
      pacing_target: s.pacing_target ?? null,
    });
  }));

  // Apply a structure preset — instantiates beat templates into OutlineBeat[] and persists.
  app.post('/api/outline/apply-preset', gameLimiter, asyncHandler(async (req, res) => {
    const { structure, expectedTurns } = req.body as { structure?: string; expectedTurns?: number };
    const VALID_STRUCTURES = Object.keys(STRUCTURE_NAMES);
    if (!structure || !VALID_STRUCTURES.includes(structure)) {
      res.status(400).json({ error: `structure must be one of: ${VALID_STRUCTURES.join(', ')}` });
      return;
    }
    const n = Math.max(4, Math.min(200, Number(expectedTurns) || 20));
    const { stage } = getOrCreateSession(sessionId(req));
    const beats = instantiatePreset(structure, n);
    stage.setOutline(beats);
    stage.updateIllusionState({ structure: structure as import('./server/engine/types.ts').IllusionState['structure'], expected_turns: n });
    res.json({ beats, structure, expected_turns: n, beat_count: beats.length });
  }));

  // Set emotional arc — persists to IllusionState for engine arc-deviation checks.
  app.post('/api/emotional-arc', gameLimiter, asyncHandler(async (req, res) => {
    const { arc } = req.body as { arc?: string };
    const VALID = Object.keys(ARC_TENSION_CURVES);
    if (!arc || !VALID.includes(arc)) {
      res.status(400).json({ error: `arc must be one of: ${VALID.join(', ')}` });
      return;
    }
    const { stage } = getOrCreateSession(sessionId(req));
    stage.updateIllusionState({ emotional_arc: arc as NonNullable<import('./server/engine/types.ts').IllusionState['emotional_arc']> });
    res.json({ arc });
  }));

  // Set director style — persists to IllusionState for agent prompt + pressure modulation.
  app.post('/api/director-style', gameLimiter, asyncHandler(async (req, res) => {
    const { style } = req.body as { style?: string };
    const VALID = Object.keys(STYLE_MODIFIERS);
    if (!style || !VALID.includes(style)) {
      res.status(400).json({ error: `style must be one of: ${VALID.join(', ')}` });
      return;
    }
    const { stage } = getOrCreateSession(sessionId(req));
    stage.updateIllusionState({ director_style: style as NonNullable<import('./server/engine/types.ts').IllusionState['director_style']> });
    res.json({ style });
  }));

  // ── Writer pacing target ──────────────────────────────────────────────────
  // GET returns the current target ('slow' | 'medium' | 'fast' | null).
  // POST sets a new target; body: { target: 'slow' | 'medium' | 'fast' }
  app.get('/api/pacing-target', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const target = stage.getIllusionState().pacing_target ?? null;
    res.json({ target });
  }));

  app.post('/api/pacing-target', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const { target } = req.body as { target?: string };
    if (!target || !['slow', 'medium', 'fast'].includes(target)) {
      res.status(400).json({ error: 'target must be "slow", "medium", or "fast"' });
      return;
    }
    stage.updateIllusionState({ pacing_target: target as 'slow' | 'medium' | 'fast' });
    res.json({ target });
  }));

  // ── Session snapshot export / import ──────────────────────────────────────
  // Export: download a JSON snapshot of the full simulation state.
  app.get('/api/session/export', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const snapshot = stage.exportSnapshot();
    res.setHeader('Content-Disposition', 'attachment; filename="storymachine-session.json"');
    res.json(snapshot);
  }));

  // Import: restore a previously exported snapshot into a fresh session.
  app.post('/api/session/import', gameLimiter, validate(ImportBodySchema), asyncHandler(async (req, res) => {
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

  // QBN choice filtering — filter by accumulated qualities AND consequenceScope ceiling
  app.post('/api/qbn/filter-choices', gameLimiter, asyncHandler(async (req, res) => {
    const { choices, qualities, maxScope } = req.body ?? {};
    if (!Array.isArray(choices)) {
      res.status(400).json({ error: 'choices must be an array' });
      return;
    }
    const q = typeof qualities === 'object' && qualities !== null
      ? (qualities as Record<string, number>) : {};
    const scopeOrder: Record<string, number> = { micro: 0, macro: 1, crisis: 2 };
    const maxScopeLevel = typeof maxScope === 'string' && maxScope in scopeOrder
      ? scopeOrder[maxScope] : 2;

    const available = (choices as unknown[]).filter((raw) => {
      if (typeof raw !== 'object' || raw === null) return false;
      const c = raw as Record<string, unknown>;

      // QBN quality gate
      const reqs = c.qbnRequirements;
      if (reqs && typeof reqs === 'object') {
        const passes = Object.entries(reqs as Record<string, number>).every(
          ([quality, required]) => (q[quality] ?? 0) >= required,
        );
        if (!passes) return false;
      }

      // Consequence scope ceiling
      const scope = c.consequenceScope as string | undefined;
      if (scope && scope in scopeOrder && scopeOrder[scope] > maxScopeLevel) return false;

      return true;
    });

    res.json({ available, filtered: choices.length - available.length });
  }));

  // NCP Storyform — synthesize Dramatica-style storyform from live session data
  app.post('/api/ncp-storyform', gameLimiter, asyncHandler(async (req, res) => {
    const { throughlines, characters } = req.body ?? {};
    const tl = typeof throughlines === 'object' && throughlines !== null ? throughlines as Record<string, unknown> : {};
    const inputChars = Array.isArray(characters) ? (characters as unknown[]).slice(0, 10) : [];

    // Augment with live session data when available
    const { stage: sessionStage } = getOrCreateSession(sessionId(req));
    const liveAgents = sessionStage.getAllAgents();
    const illusion = sessionStage.getIllusionState();

    // Derive protagonist: agent with highest-value terminal goal or first agent
    const sorted = [...liveAgents].sort((a, b) => {
      const aVal = a.goalStack?.terminal.value ?? 0;
      const bVal = b.goalStack?.terminal.value ?? 0;
      return bVal - aVal;
    });
    const protagonist = sorted[0] ?? null;
    const influenceChar = sorted[1] ?? null;

    // Objective Story throughline: the over-arching conflict visible to everyone
    // Infer from the dominant dramatic pressure type across all active agents
    const objectiveStory = (tl.objectiveStory as string | undefined) ?? (() => {
      if (!protagonist) return null;
      const goal = protagonist.goalStack?.terminal.description;
      if (goal) return `The central conflict concerns who controls ${goal.toLowerCase().replace(/^to /, '')} — every character has a stake.`;
      return null;
    })();

    // Main Character throughline: subjective journey (how the protagonist changes internally)
    const mainCharThroughline = (tl.mainCharacter as string | undefined) ?? (() => {
      if (!protagonist) return null;
      const lie = protagonist.public_mask;
      const want = protagonist.hidden_motive;
      return `${protagonist.name}'s internal journey: the gap between the mask they wear (${lie}) and what they truly pursue (${want}).`;
    })();

    // Influence Character: provides the contrasting worldview
    const influenceThroughline = (tl.influenceCharacter as string | undefined) ?? (() => {
      if (!influenceChar) return null;
      return `${influenceChar.name} embodies an alternative approach — their choices force ${protagonist?.name ?? 'the protagonist'} to question their own path.`;
    })();

    // Relationship Story: how the two leads change each other
    const relationshipStory = (tl.relationshipStory as string | undefined) ?? (() => {
      if (!protagonist || !influenceChar) return null;
      const trustVal = protagonist.theoryOfMind?.[influenceChar.char_id]?.trust_level;
      const trustDesc = trustVal == null ? 'uncertain'
        : trustVal > 0.7 ? 'uneasy alliance'
        : trustVal > 0.4 ? 'wary co-dependence'
        : 'mutual antagonism';
      return `${protagonist.name} and ${influenceChar.name}: a ${trustDesc} that neither can walk away from.`;
    })();

    // Active throughlines: those flagged in the session + inferred from illusion phase
    const activeThroughlines: string[] = Array.isArray(tl.activeThroughlines) && tl.activeThroughlines.length > 0
      ? tl.activeThroughlines as string[]
      : (() => {
          const tls: string[] = [];
          if (objectiveStory) tls.push('objectiveStory');
          if (mainCharThroughline) tls.push('mainCharacter');
          if (influenceThroughline) tls.push('influenceCharacter');
          if (relationshipStory) tls.push('relationshipStory');
          return tls;
        })();

    // Structural metadata from live session
    const phase = illusion.phase ?? 'Setup';
    const tensionState = sessionStage.getDirectorTensionState();
    const tension = tensionState.accumulator ?? 0;

    const storyform: Record<string, unknown> = {
      objectiveStory,
      mainCharacter: {
        throughline: mainCharThroughline,
        protagonist: inputChars[0] ?? (protagonist ? { name: protagonist.name, want: protagonist.hidden_motive, lie: protagonist.public_mask } : null),
      },
      influenceCharacter: {
        throughline: influenceThroughline,
        character: inputChars[1] ?? (influenceChar ? { name: influenceChar.name, want: influenceChar.hidden_motive, lie: influenceChar.public_mask } : null),
      },
      relationshipStory,
      activeThroughlines,
      session: {
        phase,
        tension,
        agentCount: liveAgents.length,
        turnCount: sessionStage.getTurnCount(),
      },
      computed_at: Date.now(),
    };

    res.json(storyform);
  }));

  // ── ScriptIDE AI routes ────────────────────────────────────────────────────
  // Optional script context — the current editor contents, capped, so AI
  // suggestions stay consistent with established tone, characters, and facts.
  const scriptContextOf = (body: unknown): string => {
    const ctx = (body as Record<string, unknown> | undefined)?.scriptContext;
    return typeof ctx === 'string' ? ctx.substring(0, 8000) : '';
  };

  // Lenient character-profile sanitizer for endpoints where profiles are
  // optional context (not the primary input).
  const sanitizeProfiles = (raw: unknown): Array<Record<string, string>> => {
    if (!Array.isArray(raw)) return [];
    return (raw as unknown[]).slice(0, 20).map((p) => {
      if (typeof p !== 'object' || p === null) return { name: '', ghost: '', lie: '', want: '', need: '' };
      const prof = p as Record<string, unknown>;
      const s = (v: unknown, max = 1000) => (typeof v === 'string' ? v.substring(0, max) : '');
      return { name: s(prof.name, 256), ghost: s(prof.ghost), lie: s(prof.lie), want: s(prof.want), need: s(prof.need) };
    }).filter((p) => p.name);
  };

  // Renders profiles as a compact prompt block for continuity-aware generation.
  const profilesBlock = (profiles: Array<Record<string, string>>): string =>
    profiles.length > 0
      ? `\nCHARACTERS (keep every depiction consistent with these profiles — never contradict a want, lie, or wound):\n${profiles.map(p => `- ${p.name}: wants "${p.want || '?'}"; clings to the false belief "${p.lie || '?'}"; wounded by "${p.ghost || '?'}"`).join('\n')}\n`
      : '';

  app.post('/api/scriptide/world-build', aiLimiter, asyncHandler(async (req, res) => {
    const beat = requireString(req.body?.beat, 'beat');
    const scriptContext = scriptContextOf(req.body);
    const contextBlock = scriptContext
      ? `\nEXISTING SCRIPT (for continuity — match the established tone, characters, locations, and facts; do not contradict them):\n${scriptContext}\n`
      : '';
    const wbProfiles = profilesBlock(sanitizeProfiles(req.body?.profiles));
    const response = await generateContent({
      model: getModel(),
      contents: `SYSTEM ROLE: You are a master screenwriter and world-builder. Your task is to generate or expand a scene based on the user's beat outline.

OBJECTIVE: Write visceral, evocative action lines and scene descriptions that establish mood, time, and place.

STRICT CONSTRAINTS:
1. FORMAT: Output strictly in Fountain syntax.
2. NO CAMERA DIRECTIONS: You are strictly forbidden from using camera terminology (e.g., "We see", "Pan to", "Close up", "Wide shot", "Angle on"). Describe the environment and the action as it happens in the world, not through a lens.
3. SENSORY WRITING: Focus on lighting, sound, texture, and kinetic movement. Use active verbs. Avoid "is/are" where possible.
4. ECONOMY: Keep action blocks to 4 lines maximum. Break up text to control the reader's pacing.
${contextBlock}${wbProfiles}
INPUT: ${beat}
OUTPUT: Generate the Scene Heading and Action lines.`,
    }, { label: 'world-build', timeoutMs: 30_000 });
    res.json({ result: response.text ?? '' });
  }));

  app.post('/api/scriptide/refine-dialogue', aiLimiter, asyncHandler(async (req, res) => {
    const dialogue = requireString(req.body?.dialogue, 'dialogue');

    // Validate profiles array — each element sanitized and capped
    const rawProfiles = req.body?.profiles;
    let profiles: Array<Record<string, string>> = [];
    if (rawProfiles != null) {
      if (!Array.isArray(rawProfiles)) {
        res.status(400).json({ error: 'profiles must be an array' });
        return;
      }
      profiles = (rawProfiles as unknown[]).slice(0, 20).map((p) => {
        if (typeof p !== 'object' || p === null) return { name: '', ghost: '', lie: '', want: '', need: '' };
        const prof = p as Record<string, unknown>;
        const sanitize = (v: unknown, max = 1000) =>
          typeof v === 'string' ? v.substring(0, max) : '';
        return {
          name:  sanitize(prof.name, 256),
          ghost: sanitize(prof.ghost),
          lie:   sanitize(prof.lie),
          want:  sanitize(prof.want),
          need:  sanitize(prof.need),
        };
      });
    }

    const dlgContext = scriptContextOf(req.body);
    const dlgContextBlock = dlgContext
      ? `\nSURROUNDING SCRIPT (preserve each character's established voice and the scene's continuity):\n${dlgContext}\n`
      : '';
    const response = await generateContent({
      model: getModel(),
      contents: `SYSTEM ROLE: You are an expert dialogue doctor, specializing in subtext, character voice, and dramatic irony.

OBJECTIVE: Analyze the provided dialogue and rewrite it to remove "on-the-nose" exposition.

INSTRUCTIONS:
1. Identify the 'Want' and the 'Obstacle' in the scene.
2. Rewrite the dialogue so the characters are fighting for their 'Want' indirectly.
3. Differentiate voices based on provided psychological profiles.
4. Add brief, behavior-revealing parentheticals only if absolutely necessary.
${dlgContextBlock}
INPUT DIALOGUE: ${dialogue}
CHARACTER PROFILES: ${JSON.stringify(profiles)}
OUTPUT: Provide 2 alternative versions of the dialogue exchange, explaining the subtextual strategy used in each.`,
    }, { label: 'refine-dialogue', timeoutMs: 30_000 });
    res.json({ result: response.text ?? '' });
  }));

  app.post('/api/scriptide/analyze-tension', aiLimiter, asyncHandler(async (req, res) => {
    const scene = requireString(req.body?.scene, 'scene');
    const tnContext = scriptContextOf(req.body);
    const tnContextBlock = tnContext
      ? `\nSURROUNDING SCRIPT (consider how tension carries over from adjacent scenes):\n${tnContext}\n`
      : '';
    const tnProfiles = profilesBlock(sanitizeProfiles(req.body?.profiles));
    const response = await generateContent({
      model: getModel(),
      contents: `SYSTEM ROLE: You are a structural script consultant influenced by Hitchcock's theory of suspense.

OBJECTIVE: Analyze the provided scene and identify opportunities to heighten psychological stakes.

ANALYSIS CRITERIA:
1. Information Asymmetry: Who knows more? Suggest a way to give the audience a piece of information the characters lack.
2. The Ticking Clock: Is there a time constraint? If not, suggest a micro-deadline.
3. The Dilemma: Are the choices too easy? Propose a "best bad choice" scenario.
4. Pacing: Suggest where to slow down to build dread, or speed up to simulate panic.
${tnContextBlock}${tnProfiles}
INPUT SCENE: ${scene}
OUTPUT: A bulleted diagnostic report with 3 actionable suggestions. Where a character's want, lie, or wound is relevant, ground the suggestion in it.`,
    }, { label: 'analyze-tension', timeoutMs: 30_000 });
    res.json({ result: response.text ?? '' });
  }));

  app.post('/api/scriptide/clean-action', aiLimiter, asyncHandler(async (req, res) => {
    const text = requireString(req.body?.text, 'text');
    const response = await generateContent({
      model: getModel(),
      contents: `SYSTEM ROLE: You are a strict script editor enforcing a "Semantic Firewall".
OBJECTIVE: Rewrite the following action block — remove all camera directions and technical jargon. Describe what happens in the world, not what the camera does.

INPUT: ${text}
OUTPUT: Just the rewritten action text, nothing else.`,
    }, { label: 'clean-action', timeoutMs: 30_000 });
    res.json({ result: response.text ?? '' });
  }));

  app.post('/api/scriptide/character-profile', aiLimiter, asyncHandler(async (req, res) => {
    const profile = req.body?.profile;
    if (!profile || typeof profile !== 'object') {
      res.status(400).json({ error: 'profile is required' });
      return;
    }
    const name  = requireString(profile.name,  'profile.name', 256);
    const ghost = requireString(profile.ghost, 'profile.ghost');
    const lie   = requireString(profile.lie,   'profile.lie');
    const want  = requireString(profile.want,  'profile.want');
    const need  = requireString(profile.need,  'profile.need');

    const response = await generateContent({
      model: getModel(),
      contents: `SYSTEM ROLE: You are a character designer specializing in psychological realism and "Show, Don't Tell".

OBJECTIVE: Generate a visceral physical description of a character based on their psychological profile. Reflect internal state through external details.

INSTRUCTIONS:
1. DO NOT mention the Ghost, Lie, Want, or Need directly.
2. Focus on: Posture, micro-expressions, clothing wear-and-tear, grooming habits, and how they occupy space.
3. Use sensory details.
4. Keep it to 2-3 evocative paragraphs.

CHARACTER PROFILE:
Name: ${name}
Ghost (Trauma): ${ghost}
Lie (False Belief): ${lie}
Want (External Goal): ${want}
Need (Internal Truth): ${need}

OUTPUT: A visceral character description.`,
    }, { label: 'character-profile', timeoutMs: 30_000 });
    res.json({ result: response.text ?? '' });
  }));

  // ── Comprehensive script analysis (replaces frontend director.ts AI calls) ──
  app.post('/api/analyze-script', aiLimiter, asyncHandler(async (req, res) => {
    const scriptText = requireString(req.body?.scriptText, 'scriptText');
    const engineState = req.body?.engineState ?? {};
    const storyConfig = engineState?.config as Record<string, unknown> ?? {};
    const characters = Array.isArray(req.body?.characters) ? (req.body.characters as unknown[]).slice(0, 20) : [];
    const visualAnchor = typeof engineState?.protagonist?.visualAnchor === 'string'
      ? engineState.protagonist.visualAnchor.substring(0, 500) : '';

    // ── Active Codex RAG: inject known facts for consistency ──
    const activeCodexEntries = Array.isArray(engineState?.directorState?.activeCodexEntries)
      ? (engineState.directorState.activeCodexEntries as Array<Record<string, string>>).slice(0, 5) : [];
    const codexBlock = activeCodexEntries.length > 0
      ? `\n\nRAG MEMORY (active codex — ensure scene is consistent with these facts):\n${activeCodexEntries.map(e => `- [${e.title ?? ''}]: ${e.content ?? ''}`).join('\n')}`
      : '';

    // ── Information Position bias from previous scene ──
    const prevInfoPos = typeof engineState?.currentAnalysis?.informationPosition === 'string'
      ? engineState.currentAnalysis.informationPosition : null;
    const infoPosBias = prevInfoPos
      ? `\nPrevious scene information position was "${prevInfoPos}". Consider how this asymmetry should evolve.`
      : '';

    // ── Throughline context ──
    const tl = engineState?.directorState?.throughlines as Record<string, unknown> | undefined;
    const activeTl = Array.isArray(tl?.activeThroughlines) && tl.activeThroughlines.length > 0
      ? `\nACTIVE THROUGHLINES: ${(tl.activeThroughlines as string[]).join(', ')}. Objective: "${tl.objectiveStory ?? ''}". Relationship: "${tl.relationshipStory ?? ''}".`
      : '';

    // ── Story architecture config — injected so AI analysis is structure-aware ──
    const structure = typeof storyConfig.structure === 'string' ? storyConfig.structure : null;
    const emotionalArc = typeof storyConfig.emotionalArc === 'string' ? storyConfig.emotionalArc : null;
    const dirStyle = typeof storyConfig.directorStyle === 'string' ? storyConfig.directorStyle : null;
    const structureBlock = (structure || emotionalArc || dirStyle) ? `
STORY ARCHITECTURE:
${structure ? `- Narrative Structure: ${STRUCTURE_NAMES[structure as StoryStructure] ?? structure} — ensure the structuralNode field names a beat from this specific structure.` : ''}
${emotionalArc ? `- Emotional Arc: ${emotionalArc.replace(/_/g, ' ')} — evaluate whether the current tension level matches this arc's expected trajectory at the scene's story position. ArcMeter and tension scores should reflect alignment with this shape.` : ''}
${dirStyle ? `- Cinematic Style: ${dirStyle} — ${STYLE_MODIFIERS[dirStyle as DirectorStyle]?.agentInstruction?.split('.')[0] ?? dirStyle}. Let this style govern composition choices, information position bias, and commentary tone.` : ''}
` : '';

    const prompt = `Analyze the following screenplay script.
Current Director State: ${JSON.stringify(engineState?.directorState ?? {}).substring(0, 5000)}
Characters Profile: ${JSON.stringify(characters).substring(0, 2000)}${infoPosBias}${activeTl}${codexBlock}
${structureBlock}
Script Text:
${scriptText.substring(0, 8000)}

Provide a detailed SceneAnalysis and updated DirectorState.
Include cinematic composition, narrative metrics, director commentary, and quality validation.
Extract the most impactful line of dialogue for TTS (audioDialogue) and a highly detailed imagePrompt for storyboard generation.
Validate dialogue against character profiles and flag inconsistencies in dialogueInconsistencies.
Identify whether any comedy misdirection technique is active (clue_delivery, false_safety, desensitization, or none).
Ensure throughline commentary addresses all active throughlines listed above.
${structure ? `structuralNode must name a specific beat from the ${structure} structure (e.g. "Catalyst", "Midpoint", "Ten — Twist").` : ''}
${dirStyle ? `Cinematic composition and commentary must be filtered through the ${dirStyle} style.` : ''}`;

    const analysisResponse = await generateContent({
      model: getModel(),
      contents: prompt,
      config: {
        systemInstruction: 'You are the AI Director, a strict narrative dungeon master enforcing psychological and structural rules of screenwriting.',
        responseMimeType: 'application/json',
        responseSchema: AnalyzeScriptSchema,
      },
    }, { label: 'analyze-script', timeoutMs: 45_000 });

    const rawText = analysisResponse.text ?? '{}';
    const analysisData = safeJsonParse<{ sceneAnalysis: Record<string, unknown>; updatedDirectorState: Record<string, unknown> } | null>(rawText, null);
    if (!analysisData?.sceneAnalysis) {
      res.status(500).json({ error: 'Failed to parse AI analysis response.' });
      return;
    }

    // Generate image and audio in parallel, server-side (API key never leaves server)
    const composition = analysisData.sceneAnalysis.composition as Record<string, string> ?? {};
    const imagePromptText = [
      'Graphic novel style.',
      composition.lighting ? `${composition.lighting} lighting,` : '',
      composition.colorPalette ? `${composition.colorPalette} color palette.` : '',
      composition.cameraAngle ?? '',
      composition.shotType ?? '',
      visualAnchor,
      typeof analysisData.sceneAnalysis.imagePrompt === 'string' ? analysisData.sceneAnalysis.imagePrompt : '',
    ].filter(Boolean).join(' ');

    const audioText = typeof analysisData.sceneAnalysis.audioDialogue === 'string'
      ? analysisData.sceneAnalysis.audioDialogue : '';

    const [imageUrl, audioResult] = await Promise.all([
      getImageProvider().generate(imagePromptText),
      getTTSProvider().speak(audioText),
    ]);
    const audioUrl = audioResult?.dataUrl;

    // ── 5-Evaluator scoring flags ──
    const scores = (analysisData.sceneAnalysis.commentary as Record<string, unknown> | undefined)?.evaluatorScores as Record<string, number> | undefined;
    const evaluatorWarnings: string[] = [];
    if (scores) {
      if ((scores.audience ?? 1) < 0.4) evaluatorWarnings.push('LOW_AUDIENCE_SCORE: Scene lacks emotional engagement for the audience.');
      if ((scores.ego ?? 0) > 0.8)      evaluatorWarnings.push('EGO_SPIKE: Character behaviour is inconsistent with their established psychological profile.');
      if ((scores.storymind ?? 1) < 0.3) evaluatorWarnings.push('STORYMIND_ALERT: Scene is drifting from the core dramatic argument.');
    }

    res.json({
      sceneAnalysis: { ...analysisData.sceneAnalysis, imageUrl, audioUrl },
      updatedDirectorState: analysisData.updatedDirectorState,
      evaluatorWarnings,
    });
  }));

  // ── NVM routes (Wave 2) ────────────────────────────────────────────────────

  // GET /api/nvm/commits — list all StoryCommits for this session
  app.get('/api/nvm/commits', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    res.json({ commits: stage.getCommits() });
  }));

  // GET /api/nvm/commits/:commitId — single commit
  app.get('/api/nvm/commits/:commitId', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const commit = stage.getCommit(req.params.commitId);
    if (!commit) { res.status(404).json({ error: 'commit not found' }); return; }
    res.json(commit);
  }));

  // GET /api/nvm/ghost-commits — list ghost (rejected) commits, optional ?sceneIdx=
  app.get('/api/nvm/ghost-commits', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const sceneIdx = req.query.sceneIdx !== undefined ? Number(req.query.sceneIdx) : undefined;
    res.json({ ghosts: stage.ghostLedgerGet(sceneIdx) });
  }));

  // POST /api/nvm/ghost-commits/branch — promote a ghost to a What-If candidate
  app.post('/api/nvm/ghost-commits/branch', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const ghostId = requireString(req.body?.ghostId, 'ghostId', 128);
    const ghost = stage.ghostLedgerFind(ghostId);
    if (!ghost) { res.status(404).json({ error: 'ghost not found' }); return; }
    res.json({ ghostId, branchedOps: ghost.ir.ops, sceneIdx: ghost.sceneIdx });
  }));

  // GET /api/nvm/manifest — build a StoryManifest from the current session
  app.get('/api/nvm/manifest', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const { manifestFromStage } = await import('./server/nvm/repro/manifest.ts');
    const { seedFromString } = await import('./server/nvm/repro/seed.ts');
    const sid = sessionId(req);
    const manifest = manifestFromStage(stage, `manifest_${sid}`, seedFromString(sid), sid);
    res.json(manifest);
  }));

  // GET /api/debug/explain/:eventId — explain an action as a causal call stack
  app.get('/api/debug/explain/:eventId', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const { explainAction } = await import('./server/nvm/debug/inspector.ts');
    const panel = explainAction(stage, req.params.eventId);
    if (!panel) { res.status(404).json({ error: 'event not found' }); return; }
    res.json(panel);
  }));

  // GET /api/debug/explain-scene/:locationId — explain all events in a scene
  app.get('/api/debug/explain-scene/:locationId', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const { explainScene } = await import('./server/nvm/debug/inspector.ts');
    res.json({ panels: explainScene(stage, req.params.locationId) });
  }));

  // ── NVM valuation routes (Wave 4) ─────────────────────────────────────────

  // GET /api/nvm/tension — derive tension ledger from current session state
  app.get('/api/nvm/tension', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const { deriveTensionLedger } = await import('./server/nvm/valuation/futures.ts');
    const { buildNarrativeState } = await import('./server/nvm/state/NarrativeState.ts');
    const state = buildNarrativeState(stage);
    const commits = stage.getCommits().filter(c => !c.reverted);
    const sceneIdx = commits.length > 0 ? commits[commits.length - 1].sceneIdx : 0;
    res.json(deriveTensionLedger(state, sceneIdx));
  }));

  // GET /api/nvm/two-reader — first-watch vs rewatch scores
  app.get('/api/nvm/two-reader', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const { deriveTensionLedger } = await import('./server/nvm/valuation/futures.ts');
    const { twoReaderReport } = await import('./server/nvm/valuation/two-reader.ts');
    const { buildNarrativeState } = await import('./server/nvm/state/NarrativeState.ts');
    const state = buildNarrativeState(stage);
    const commits = stage.getCommits().filter(c => !c.reverted);
    const sceneIdx = commits.length > 0 ? commits[commits.length - 1].sceneIdx : 0;
    const ledger = deriveTensionLedger(state, sceneIdx);
    res.json(twoReaderReport(state, ledger));
  }));

  // GET /api/nvm/topology — emotional arc topology vs 6 archetypes
  app.get('/api/nvm/topology', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const { deriveTensionLedger } = await import('./server/nvm/valuation/futures.ts');
    const { computeTopology } = await import('./server/nvm/valuation/topology.ts');
    const { buildNarrativeState } = await import('./server/nvm/state/NarrativeState.ts');
    const state = buildNarrativeState(stage);
    const commits = stage.getCommits().filter(c => !c.reverted);
    const ledgers = commits.map((c, i) => deriveTensionLedger(state, c.sceneIdx ?? i));
    res.json(computeTopology(ledgers));
  }));

  // POST /api/nvm/redteam — red-team a RevealPlan against current audience state
  app.post('/api/nvm/redteam', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const { redTeamVerdict } = await import('./server/nvm/valuation/audience-redteam.ts');
    const { buildNarrativeState } = await import('./server/nvm/state/NarrativeState.ts');
    const plan = req.body?.plan;
    if (!plan || typeof plan.revealId !== 'string') {
      res.status(400).json({ error: 'body.plan must be a RevealPlan' }); return;
    }
    const state = buildNarrativeState(stage);
    res.json(redTeamVerdict(plan, state));
  }));

  // ── Godmode API routes ─────────────────────────────────────────────────────

  // GET /api/nvm/quality — run quality engine on a candidate IR
  // Body: { ir: NarrativeTransitionIR }
  app.post('/api/nvm/quality', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const { runQualityEngine } = await import('./server/nvm/quality/index.ts');
    const { buildNarrativeState } = await import('./server/nvm/state/NarrativeState.ts');
    const ir = req.body?.ir;
    if (!ir || typeof ir !== 'object' || !Array.isArray(ir.ops)) {
      res.status(400).json({ error: 'body.ir must be a NarrativeTransitionIR' }); return;
    }
    const state = buildNarrativeState(stage);
    res.json(runQualityEngine(ir, state));
  }));

  // GET /api/nvm/project/:target — project current canon to a format
  // :target = fountain | novel | stage | comic | interactive | pitch | bible | rewatch | cutting_room
  app.get('/api/nvm/project/:target', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const { project } = await import('./server/nvm/project/index.ts');
    const target = req.params.target as Parameters<typeof project>[1];
    const VALID = ['fountain','novel','stage','comic','interactive','pitch','bible','rewatch','cutting_room'];
    if (!VALID.includes(target)) {
      res.status(400).json({ error: `Unknown projection target "${target}". Valid: ${VALID.join(', ')}` }); return;
    }
    const { buildNarrativeState } = await import('./server/nvm/state/NarrativeState.ts');
    const commits = stage.getCommits().filter(c => !c.reverted);
    const state = buildNarrativeState(stage);
    const ghosts = stage.ghostLedgerGet();
    const canon = { commits, state, ghosts };
    res.json(project(canon, target));
  }));

  // GET /api/nvm/twin/scm — return the current structural causal model as a
  // serialisable node list (Map → array) so the UI can render the op DAG.
  app.get('/api/nvm/twin/scm', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const { buildSCM } = await import('./server/nvm/twin/scm.ts');
    const scm = buildSCM(stage);
    const nodes = [...scm.nodes.values()].map(n => ({
      opId: n.opId,
      commitId: n.commitId,
      opIdx: n.opIdx,
      op: n.op,
      parents: n.parents,
      children: n.children,
    }));
    res.json({ nodes, order: scm.order, nodeCount: nodes.length });
  }));

  // POST /api/nvm/twin/do — Pearl's do() causal intervention
  // Body: { opId: string, replacement: StoryOp | null }
  app.post('/api/nvm/twin/do', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const { buildSCM } = await import('./server/nvm/twin/scm.ts');
    const { doIntervention } = await import('./server/nvm/twin/counterfactual.ts');
    const opId = req.body?.opId;
    if (typeof opId !== 'string' || !opId) {
      res.status(400).json({ error: 'body.opId (string) is required' }); return;
    }
    const scm = buildSCM(stage);
    const intervention = { opId, replacement: req.body?.replacement ?? null };
    res.json(doIntervention(scm, intervention));
  }));

  // POST /api/nvm/author/fixed-points — backward-chain toward a narrative attractor
  // Body: { fixedPoints: FixedPoint[], currentScene?: number }
  app.post('/api/nvm/author/fixed-points', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const { planToward } = await import('./server/nvm/author/fixed-points.ts');
    const { buildNarrativeState } = await import('./server/nvm/state/NarrativeState.ts');
    const fps = req.body?.fixedPoints;
    if (!Array.isArray(fps) || fps.length === 0) {
      res.status(400).json({ error: 'body.fixedPoints must be a non-empty array' }); return;
    }
    const state = buildNarrativeState(stage);
    const currentScene = typeof req.body?.currentScene === 'number' ? req.body.currentScene : state.turn;
    const planResult = planToward(state, fps, currentScene);

    // Convert each GoalBias to DramaticPressure and inject into the Stage.
    // Character extraction: UPDATE_BELIEF / APPRAISE_EMOTION carry charId;
    // SHIFT_RELATIONSHIP carries pair[0]; everything else gets 'narrator'.
    let pressuresInjected = 0;
    for (let bi = 0; bi < planResult.biases.length; bi++) {
      const bias = planResult.biases[bi];
      const charIds = new Set<string>();
      for (const op of bias.ops) {
        if (op.op === 'UPDATE_BELIEF' || op.op === 'APPRAISE_EMOTION') charIds.add(op.charId);
        else if (op.op === 'SHIFT_RELATIONSHIP') charIds.add(op.pair[0]);
      }
      if (charIds.size === 0) charIds.add('narrator');

      // Map dominant op kind to a pressure type.
      const firstOp = bias.ops[0];
      type PressureType = import('./server/engine/types.ts').DramaticPressureType;
      let pressureType: PressureType = 'ESCALATE';
      if (firstOp) {
        if (firstOp.op === 'PAYOFF_SETUP' || firstOp.op === 'ADVANCE_THEME_ARGUMENT') pressureType = 'revelation_due';
        else if (firstOp.op === 'SEED_CLUE') pressureType = 'ESCALATE';
        else if (firstOp.op === 'RAISE_CLOCK') pressureType = 'confrontation_imminent';
      }

      for (const charId of charIds) {
        stage.addDramaticPressure({
          pressure_id: `fp-${bi}-${charId}-${Date.now()}`,
          target_char_id: charId,
          trigger_event_id: `goal-bias-${bi}`,
          pressure_type: pressureType,
          intensity: 70,
          bias_hint: `${bias.rationale} [Fixed point: ${bias.fixedPointDescription}]`,
          expires_at_turn: bias.atScene + 2,
          applied: false,
        });
        pressuresInjected++;
      }
    }

    res.json({ ...planResult, pressuresInjected });
  }));

  // POST /api/nvm/author/backchain — backward-chain a single FixedPoint to a schedule.
  // Body: { fixedPoint: FixedPoint, currentScene?: number }
  app.post('/api/nvm/author/backchain', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const { backchain, scheduleToGoalBiases } = await import('./server/nvm/author/backchain.ts');
    const { buildNarrativeState } = await import('./server/nvm/state/NarrativeState.ts');
    const fp = req.body?.fixedPoint;
    if (!fp || typeof fp.atScene !== 'number') {
      res.status(400).json({ error: 'body.fixedPoint with atScene (number) is required' }); return;
    }
    const state = buildNarrativeState(stage);
    const currentScene = typeof req.body?.currentScene === 'number' ? req.body.currentScene : state.turn;
    const result = backchain(fp, state, currentScene);
    const biases = scheduleToGoalBiases(result, fp.description ?? `fixed point @ scene ${fp.atScene}`);
    res.json({ ...result, biases });
  }));

  // GET /api/nvm/momentum — narrative momentum score (5th tension signal)
  app.get('/api/nvm/momentum', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const { momentumScore } = await import('./server/nvm/valuation/futures.ts');
    const commits = stage.getCommits().filter(c => !c.reverted);
    res.json({ momentumScore: momentumScore(commits), commitCount: commits.length });
  }));

  // POST /api/nvm/inject-ops — Director's Cut: inject custom StoryOps into the canon.
  // The writer can pause the sim and author ops directly; they become a user_authored commit.
  // Body: { ops: StoryOp[], sceneIdx?: number, label?: string }
  app.post('/api/nvm/inject-ops', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const { applyStoryOps } = await import('./server/nvm/ops/dispatcher.ts');
    const { buildNarrativeState, stateHash } = await import('./server/nvm/state/NarrativeState.ts');
    const { summarizeOps } = await import('./server/nvm/state/StoryCommit.ts');
    const { randomUUID } = await import('node:crypto');
    const { STORY_OP_KINDS } = await import('./server/nvm/ops/StoryOp.ts');

    const ops = req.body?.ops;
    if (!Array.isArray(ops) || ops.length === 0) {
      res.status(400).json({ error: 'body.ops must be a non-empty StoryOp array' }); return;
    }
    // Validate each op has a known op kind
    for (const op of ops) {
      if (typeof op?.op !== 'string' || !(op.op in STORY_OP_KINDS)) {
        res.status(400).json({ error: `Unknown op kind: "${op?.op ?? '?'}"` }); return;
      }
    }

    const state = buildNarrativeState(stage);
    const commits = stage.getCommits().filter(c => !c.reverted);
    const parentId = commits[commits.length - 1]?.commitId ?? null;
    const sceneIdx = typeof req.body?.sceneIdx === 'number' ? req.body.sceneIdx : state.turn;

    const newState = applyStoryOps(state, ops);
    const commitId = randomUUID();
    stage.appendCommit({
      commitId,
      parentId,
      sceneIdx,
      ops,
      deltaSummary: summarizeOps(ops),
      reverted: false,
      createdAt: Date.now(),
    });

    res.json({
      commitId,
      sceneIdx,
      ops: ops.length,
      newStateHash: stateHash(newState),
      label: req.body?.label ?? 'director_cut',
    });
  }));

  // POST /api/nvm/converge — run the G1 convergence loop on a scene target.
  // Body: { target: SceneTarget, budget?: { maxIterations, candidatesPerIteration }, seed?: number }
  // Returns: ConvergeResult (history, converged, finalValuation, finalQuality, ghosts[])
  app.post('/api/nvm/converge', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const { convergeScene } = await import('./server/nvm/converge/loop.ts');
    const { buildNarrativeState } = await import('./server/nvm/state/NarrativeState.ts');
    const { makeLLMCandidateGenerator } = await import('./server/nvm/generate/llm-generator.ts');
    const target = req.body?.target;
    if (!target || typeof target !== 'object' || typeof target.sceneIdx !== 'number') {
      res.status(400).json({ error: 'body.target must be a SceneTarget with sceneIdx' }); return;
    }
    const state = buildNarrativeState(stage);
    const seed = typeof req.body?.seed === 'number' ? req.body.seed : Date.now();
    const generate = makeLLMCandidateGenerator();

    // G13→G1: if corpus has runs, mine the Director Policy and pass it to the budget.
    let directorPolicy: import('./server/nvm/selfplay/mine.ts').DirectorPolicy | undefined;
    const corpusRuns = stage.getCorpusRuns(30);
    if (corpusRuns.length > 0) {
      const { mineCorpus } = await import('./server/nvm/selfplay/mine.ts');
      const fakeReport = {
        runs: corpusRuns.map(r => ({
          scenarioId: r.scenario_id, seed: 0, proofPassRate: r.proof_pass_rate,
          meanValuation: r.mean_valuation, score: r.score,
          topOperators: [] as import('./server/nvm/converge/operators.ts').MutationOperator[],
          scenes: [], effectiveOperators: [], totalIterations: 0,
        })),
        meanScore: corpusRuns.reduce((s, r) => s + r.score, 0) / corpusRuns.length,
        bestRun: { scenarioId: '', seed: 0, proofPassRate: 0, meanValuation: 0, score: 0, topOperators: [], scenes: [], effectiveOperators: [], totalIterations: 0 },
        worstRun: { scenarioId: '', seed: 0, proofPassRate: 0, meanValuation: 0, score: 0, topOperators: [], scenes: [], effectiveOperators: [], totalIterations: 0 },
        operatorFrequency: {} as Record<import('./server/nvm/converge/operators.ts').MutationOperator, number>,
      };
      directorPolicy = mineCorpus(fakeReport).policy;
    }

    const budget = { ...(req.body?.budget ?? { maxIterations: 4, candidatesPerIteration: 2 }), directorPolicy };
    const result = await convergeScene(state, target, generate, budget, seed);

    // Persist any new ghost commits from convergence into Stage ghost ledger
    const { appendGhost } = await import('./server/nvm/repro/ghost-ledger.ts');
    for (const ghost of result.ghosts) {
      appendGhost(stage, {
        ghostId: ghost.ir.transitionId,
        parentCommitId: null,
        sceneIdx: ghost.ir.sceneIdx,
        ir: ghost.ir,
        reason: ghost.reason,
        rejectedAt: Date.now(),
      });
    }

    res.json({
      converged: result.converged,
      iterations: result.iterations,
      finalValuation: result.finalValuation,
      finalQuality: result.finalQuality,
      finalComposite: result.finalComposite,
      history: result.history,
      ghostCount: result.ghosts.length,
      ir: result.ir,
    });
  }));

  // GET /api/nvm/corpus — top corpus runs + Director policy
  app.get('/api/nvm/corpus', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const { mineCorpus } = await import('./server/nvm/selfplay/mine.ts');
    const limit = typeof req.query['limit'] === 'string' ? parseInt(req.query['limit'], 10) : 20;
    const runs = stage.getCorpusRuns(isNaN(limit) ? 20 : Math.min(limit, 100));
    if (runs.length === 0) {
      res.json({ playbook: null, runs: [], message: 'No corpus runs yet. POST /api/nvm/selfplay to generate.' });
      return;
    }
    // Build a minimal CorpusReport shape for mineCorpus
    const fakeReport = {
      runs: runs.map(r => ({
        scenarioId: r.scenario_id,
        seed: 0,
        proofPassRate: r.proof_pass_rate,
        meanValuation: r.mean_valuation,
        score: r.score,
        topOperators: [] as import('./server/nvm/converge/operators.ts').MutationOperator[],
        scenes: [],
        effectiveOperators: [],
        totalIterations: 0,
      })),
      meanScore: runs.reduce((s, r) => s + r.score, 0) / runs.length,
      bestRun: runs[0] ? { scenarioId: runs[0].scenario_id, seed: 0, proofPassRate: runs[0].proof_pass_rate, meanValuation: runs[0].mean_valuation, score: runs[0].score, topOperators: [], scenes: [], effectiveOperators: [], totalIterations: 0 } : { scenarioId: '', seed: 0, proofPassRate: 0, meanValuation: 0, score: 0, topOperators: [], scenes: [], effectiveOperators: [], totalIterations: 0 },
      worstRun: runs[runs.length - 1] ? { scenarioId: runs[runs.length - 1].scenario_id, seed: 0, proofPassRate: runs[runs.length - 1].proof_pass_rate, meanValuation: runs[runs.length - 1].mean_valuation, score: runs[runs.length - 1].score, topOperators: [], scenes: [], effectiveOperators: [], totalIterations: 0 } : { scenarioId: '', seed: 0, proofPassRate: 0, meanValuation: 0, score: 0, topOperators: [], scenes: [], effectiveOperators: [], totalIterations: 0 },
      operatorFrequency: {} as Record<import('./server/nvm/converge/operators.ts').MutationOperator, number>,
    };
    const playbook = mineCorpus(fakeReport);
    res.json({ playbook, runs, runCount: runs.length });
  }));

  // POST /api/nvm/selfplay — run N headless sims and persist corpus results.
  // Body: { scenarios: SimScenario[] }  (max 5 for HTTP budget)
  app.post('/api/nvm/selfplay', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const { runSelfPlay } = await import('./server/nvm/selfplay/corpus.ts');
    const { makeLLMCandidateGenerator } = await import('./server/nvm/generate/llm-generator.ts');
    const { extractGenome } = await import('./server/nvm/selfplay/genome.ts');
    const { buildNarrativeState } = await import('./server/nvm/state/NarrativeState.ts');
    const scenarios = req.body?.scenarios;
    if (!Array.isArray(scenarios) || scenarios.length === 0) {
      res.status(400).json({ error: 'body.scenarios must be a non-empty array' }); return;
    }
    if (scenarios.length > 5) {
      res.status(400).json({ error: 'Maximum 5 scenarios per HTTP self-play request' }); return;
    }
    const generate = makeLLMCandidateGenerator();
    const report = await runSelfPlay(scenarios, generate);

    // Persist each run to Stage corpus
    const state = buildNarrativeState(stage);
    const commits = stage.getCommits();
    const ghosts = stage.ghostLedgerGet();
    for (const run of report.runs) {
      const genome = extractGenome({ commits, state, ghosts }, run.scenarioId);
      stage.appendCorpusRun({
        run_id: `${run.scenarioId}-${run.seed}-${Date.now()}`,
        scenario_id: run.scenarioId,
        score: run.score,
        proof_pass_rate: run.proofPassRate,
        mean_valuation: run.meanValuation,
        ops_count: run.scenes.reduce((s, ir) => s + ir.ops.length, 0),
        genome_json: JSON.stringify(genome),
      });
    }

    res.json({
      runs: report.runs.length,
      meanScore: report.meanScore,
      bestScenario: report.bestRun.scenarioId,
      operatorFrequency: report.operatorFrequency,
    });
  }));

  // GET /api/nvm/genome/current — extract StoryGenome from the active canon.
  app.get('/api/nvm/genome/current', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const { extractGenome } = await import('./server/nvm/selfplay/genome.ts');
    const { buildNarrativeState } = await import('./server/nvm/state/NarrativeState.ts');
    const commits = stage.getCommits();
    const state = buildNarrativeState(stage);
    const ghosts = stage.ghostLedgerGet();
    const genome = extractGenome({ commits, state, ghosts }, 'current');
    res.json(genome);
  }));

  // POST /api/nvm/genome/diff — diff two corpus run genomes.
  // Body: { runIdA: string, runIdB: string }
  app.post('/api/nvm/genome/diff', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const { diffGenomes } = await import('./server/nvm/selfplay/genome.ts');
    const { runIdA, runIdB } = req.body ?? {};
    if (typeof runIdA !== 'string' || typeof runIdB !== 'string') {
      res.status(400).json({ error: 'body.runIdA and body.runIdB (strings) are required' }); return;
    }
    const runs = stage.getCorpusRuns(200);
    const runA = runs.find((r: { run_id: string }) => r.run_id === runIdA);
    const runB = runs.find((r: { run_id: string }) => r.run_id === runIdB);
    if (!runA || !runB) {
      res.status(404).json({ error: `Run(s) not found: ${!runA ? runIdA : ''} ${!runB ? runIdB : ''}`.trim() }); return;
    }
    const genomeA = JSON.parse(runA.genome_json);
    const genomeB = JSON.parse(runB.genome_json);
    const diff = diffGenomes(genomeA, genomeB);
    res.json({ diff, genomeA, genomeB });
  }));

  // POST /api/nvm/genome/breed — breed two corpus run genomes into a seed genome.
  // Body: { runIdA: string, runIdB: string, newId?: string }
  app.post('/api/nvm/genome/breed', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const { breedGenomes } = await import('./server/nvm/selfplay/genome.ts');
    const { runIdA, runIdB, newId } = req.body ?? {};
    if (typeof runIdA !== 'string' || typeof runIdB !== 'string') {
      res.status(400).json({ error: 'body.runIdA and body.runIdB (strings) are required' }); return;
    }
    const runs = stage.getCorpusRuns(200);
    const runA = runs.find((r: { run_id: string }) => r.run_id === runIdA);
    const runB = runs.find((r: { run_id: string }) => r.run_id === runIdB);
    if (!runA || !runB) {
      res.status(404).json({ error: 'Run(s) not found' }); return;
    }
    const genomeA = JSON.parse(runA.genome_json);
    const genomeB = JSON.parse(runB.genome_json);
    const bred = breedGenomes(genomeA, genomeB, typeof newId === 'string' ? newId : `bred-${Date.now()}`);
    res.json(bred);
  }));

  // GET /api/nvm/proof/:commitId — run all 4 proof tiers on a single commit.
  // Replays state up to (but not including) that commit, then runs the full
  // proof kernel + lint + repair on its IR. No body required.
  app.get('/api/nvm/proof/:commitId', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const { runTier1, runTier2, tier2Score, runTier3, tier3Rank, runTier4 } = await import('./server/nvm/proof/kernel.ts');
    const { repair } = await import('./server/nvm/proof/repair.ts');
    const { lint } = await import('./server/nvm/proof/lint.ts');
    const { emptyState } = await import('./server/nvm/state/NarrativeState.ts');
    const { applyStoryOps } = await import('./server/nvm/ops/dispatcher.ts');

    const targetId = req.params.commitId;
    const allCommits = stage.getCommits().filter((c: import('./server/nvm/state/StoryCommit.ts').StoryCommit) => !c.reverted);
    const targetIdx = allCommits.findIndex((c: import('./server/nvm/state/StoryCommit.ts').StoryCommit) => c.commitId === targetId);
    if (targetIdx === -1) {
      res.status(404).json({ error: `Commit "${targetId}" not found` }); return;
    }
    const commit = allCommits[targetIdx];

    // Replay state up to (not including) this commit
    let rollingState = emptyState();
    for (let i = 0; i < targetIdx; i++) {
      rollingState = applyStoryOps(rollingState, allCommits[i].ops);
    }

    // Build minimal IR shell from commit
    const ir: import('./server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR = {
      transitionId: commit.commitId,
      sceneIdx: commit.sceneIdx,
      sceneFunction: 'advance_plot',
      activeMechanisms: [],
      beforeStateHash: 'inspector',
      ops: commit.ops,
      preconditions: [],
      postconditions: [],
      provenance: { origin: 'model_generated', createdAt: commit.createdAt },
    };

    const t1 = runTier1(ir, rollingState);
    const t2 = runTier2(ir, rollingState);
    const t3 = runTier3(ir, rollingState);
    const t4 = runTier4(ir, rollingState);
    const allFailures = [...t1, ...t2].filter(r => !r.pass);
    const patches = repair(allFailures, rollingState);
    const lintWarnings = lint(ir, rollingState);

    res.json({
      commitId: commit.commitId,
      sceneIdx: commit.sceneIdx,
      opCount: commit.ops.length,
      tier1: t1.map(r => ({ proof: r.proof, pass: r.pass, reason: r.reason, findings: r.findings })),
      tier1Pass: t1.every(r => r.pass),
      tier2: t2.map(r => ({ proof: r.proof, pass: r.pass, reason: r.reason, findings: r.findings })),
      tier2Score: tier2Score(t2),
      tier3: t3.map(r => ({ proof: r.proof, pass: r.pass, reason: r.reason })),
      tier3Rank: tier3Rank(t3),
      tier4: t4.map(r => ({ proof: r.proof, pass: r.pass, reason: r.reason, findings: r.findings })),
      patches,
      lintWarnings,
      patchCount: patches.length,
    });
  }));

  // POST /api/nvm/repair — run all proof tiers on an IR, return repair patches.
  // Body: { ir: NarrativeTransitionIR }
  app.post('/api/nvm/repair', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const { runTier1, runTier2, runTier4 } = await import('./server/nvm/proof/kernel.ts');
    const { repair } = await import('./server/nvm/proof/repair.ts');
    const { lint } = await import('./server/nvm/proof/lint.ts');
    const { buildNarrativeState } = await import('./server/nvm/state/NarrativeState.ts');
    const ir = req.body?.ir;
    if (!ir || typeof ir !== 'object' || !Array.isArray(ir.ops)) {
      res.status(400).json({ error: 'body.ir must be a NarrativeTransitionIR with ops[]' }); return;
    }
    const state = buildNarrativeState(stage);
    const t1 = runTier1(ir, state);
    const t2 = runTier2(ir, state);
    const t4 = runTier4(ir, state);
    const allFailures = [...t1, ...t2].filter(r => !r.pass);
    const patches = repair(allFailures, state);
    const lintWarnings = lint(ir, state);
    res.json({
      tier1Pass: t1.every(r => r.pass),
      tier1Failures: t1.filter(r => !r.pass).map(r => ({ proof: r.proof, reason: r.reason })),
      tier2Failures: t2.filter(r => !r.pass).map(r => ({ proof: r.proof, reason: r.reason })),
      tier4Advisories: t4.filter(r => !r.pass).map(r => ({ proof: r.proof, reason: r.reason })),
      patches,
      lintWarnings,
      patchCount: patches.length,
    });
  }));

  // GET /api/nvm/arc-timeline — per-scene stats for all active commits.
  // Returns proof summary, quality score, tension, and top ops per scene.
  app.get('/api/nvm/arc-timeline', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const { runTier1, runTier2, tier2Score } = await import('./server/nvm/proof/kernel.ts');
    const { buildNarrativeState } = await import('./server/nvm/state/NarrativeState.ts');
    const { applyStoryOps } = await import('./server/nvm/ops/dispatcher.ts');
    const { deriveTensionLedger } = await import('./server/nvm/valuation/futures.ts');
    const { runQualityEngine } = await import('./server/nvm/quality/index.ts');
    const commits = stage.getCommits().filter((c: import('./server/nvm/state/StoryCommit.ts').StoryCommit) => !c.reverted);
    let rollingState = buildNarrativeState(stage);
    // Reset to empty and replay for accurate per-scene state
    const { emptyState } = await import('./server/nvm/state/NarrativeState.ts');
    rollingState = emptyState();

    const scenes = [];
    for (const commit of commits) {
      // Build a minimal IR shell from the StoryCommit (commits store ops, not full IR)
      const ir: import('./server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR = {
        transitionId: commit.commitId,
        sceneIdx: commit.sceneIdx,
        sceneFunction: 'advance_plot',
        activeMechanisms: [],
        beforeStateHash: 'timeline',
        ops: commit.ops,
        preconditions: [],
        postconditions: [],
        provenance: { origin: 'model_generated', createdAt: commit.createdAt },
      };
      const t1 = runTier1(ir, rollingState);
      const t2 = runTier2(ir, rollingState);
      const ledger = deriveTensionLedger(rollingState, commit.sceneIdx);
      const qualityReport = runQualityEngine(ir, rollingState);
      scenes.push({
        sceneIdx: commit.sceneIdx,
        commitId: commit.commitId,
        sceneFunction: ir.sceneFunction,
        t1Pass: t1.every(r => r.pass),
        t1FailCount: t1.filter(r => !r.pass).length,
        t2Score: tier2Score(t2),
        t2FailCount: t2.filter(r => !r.pass).length,
        qualityScore: qualityReport.score,
        tension: ledger.totalTension,
        opCount: commit.ops.length,
        topOps: commit.ops.slice(0, 3).map((o: import('./server/nvm/ops/StoryOp.ts').StoryOp) => o.op),
        mechanisms: ir.activeMechanisms,
      });
      rollingState = applyStoryOps(rollingState, commit.ops);
    }

    res.json({ scenes, sceneCount: scenes.length });
  }));

  // POST /api/nvm/converge-arc — multi-scene arc compiler.
  // Runs convergeScene for each scene target in sequence, accumulating state.
  // Body: { scenes: SceneTarget[], budget?: ConvergeBudget, seed?: number }
  // Returns: per-scene results + arc-level score.
  app.post('/api/nvm/converge-arc', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const { convergeScene } = await import('./server/nvm/converge/loop.ts');
    const { buildNarrativeState } = await import('./server/nvm/state/NarrativeState.ts');
    const { applyStoryOps } = await import('./server/nvm/ops/dispatcher.ts');
    const { makeLLMCandidateGenerator } = await import('./server/nvm/generate/llm-generator.ts');
    const { mineCorpus } = await import('./server/nvm/selfplay/mine.ts');
    const { appendGhost } = await import('./server/nvm/repro/ghost-ledger.ts');

    const sceneTargets = req.body?.scenes;
    if (!Array.isArray(sceneTargets) || sceneTargets.length === 0) {
      res.status(400).json({ error: 'body.scenes must be a non-empty array of SceneTarget' }); return;
    }
    if (sceneTargets.length > 8) {
      res.status(400).json({ error: 'Maximum 8 scenes per arc compilation' }); return;
    }

    // Mine Director Policy from corpus if available
    let directorPolicy: import('./server/nvm/selfplay/mine.ts').DirectorPolicy | undefined;
    const corpusRuns = stage.getCorpusRuns(30);
    if (corpusRuns.length > 0) {
      const fakeReport = {
        runs: corpusRuns.map(r => ({
          scenarioId: r.scenario_id, seed: 0, proofPassRate: r.proof_pass_rate,
          meanValuation: r.mean_valuation, score: r.score,
          topOperators: [] as import('./server/nvm/converge/operators.ts').MutationOperator[],
          scenes: [], effectiveOperators: [], totalIterations: 0,
        })),
        meanScore: corpusRuns.reduce((s, r) => s + r.score, 0) / corpusRuns.length,
        bestRun: { scenarioId: '', seed: 0, proofPassRate: 0, meanValuation: 0, score: 0, topOperators: [], scenes: [], effectiveOperators: [], totalIterations: 0 },
        worstRun: { scenarioId: '', seed: 0, proofPassRate: 0, meanValuation: 0, score: 0, topOperators: [], scenes: [], effectiveOperators: [], totalIterations: 0 },
        operatorFrequency: {} as Record<import('./server/nvm/converge/operators.ts').MutationOperator, number>,
      };
      directorPolicy = mineCorpus(fakeReport).policy;
    }

    const baseBudget = req.body?.budget ?? { maxIterations: 3, candidatesPerIteration: 2 };
    const budget = { ...baseBudget, directorPolicy };
    const baseSeed = typeof req.body?.seed === 'number' ? req.body.seed : Date.now();
    const generate = makeLLMCandidateGenerator();

    let rollingState = buildNarrativeState(stage);
    const sceneResults = [];
    let totalComposite = 0;
    let convergedCount = 0;

    for (let i = 0; i < sceneTargets.length; i++) {
      const target = sceneTargets[i];
      const result = await convergeScene(rollingState, target, generate, budget, baseSeed + i * 1000);

      // Persist ghosts
      for (const ghost of result.ghosts) {
        appendGhost(stage, {
          ghostId: ghost.ir.transitionId,
          parentCommitId: null,
          sceneIdx: ghost.ir.sceneIdx,
          ir: ghost.ir,
          reason: ghost.reason,
          rejectedAt: Date.now(),
        });
      }

      sceneResults.push({
        sceneIdx: target.sceneIdx,
        converged: result.converged,
        iterations: result.iterations,
        finalValuation: result.finalValuation,
        finalQuality: result.finalQuality,
        finalComposite: result.finalComposite,
        tier3Rank: result.history.length > 0
          ? result.history[result.history.length - 1].tier3Rank
          : 0,
        ghostCount: result.ghosts.length,
        opCount: result.ir.ops.length,
        sceneFunction: result.ir.sceneFunction,
      });

      totalComposite += result.finalComposite;
      if (result.converged) convergedCount++;

      // Advance rolling state with the winning IR
      rollingState = applyStoryOps(rollingState, result.ir.ops);
    }

    const meanComposite = sceneTargets.length > 0 ? totalComposite / sceneTargets.length : 0;
    const arcScore = 0.5 * (convergedCount / sceneTargets.length) + 0.5 * (meanComposite / 100);

    res.json({
      scenes: sceneResults,
      totalScenes: sceneTargets.length,
      convergedCount,
      meanComposite: Math.round(meanComposite * 10) / 10,
      arcScore: Math.round(arcScore * 1000) / 1000,
      usedDirectorPolicy: !!directorPolicy,
    });
  }));

  // GET /api/nvm/sidecar — export current session as NVM sidecar JSON
  app.get('/api/nvm/sidecar', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const { buildSidecar } = await import('./server/nvm/project/sidecar.ts');
    const { buildNarrativeState } = await import('./server/nvm/state/NarrativeState.ts');
    const commits = stage.getCommits();
    const state = buildNarrativeState(stage);
    const ghosts = stage.ghostLedgerGet();
    const sidecar = buildSidecar({ commits, state, ghosts });
    res.setHeader('Content-Disposition', 'attachment; filename="story.nvm.json"');
    res.json(sidecar);
  }));

  // GET /api/nvm/quality/scene/:commitId — run quality engine on a committed scene.
  // Replays state up to (not including) that commit, builds a minimal IR shell,
  // runs runQualityEngine, and returns the full QualityReport.
  app.get('/api/nvm/quality/scene/:commitId', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const { runQualityEngine } = await import('./server/nvm/quality/index.ts');
    const { emptyState } = await import('./server/nvm/state/NarrativeState.ts');
    const { applyStoryOps } = await import('./server/nvm/ops/dispatcher.ts');

    const targetId = req.params.commitId;
    const allCommits = stage.getCommits().filter(
      (c: import('./server/nvm/state/StoryCommit.ts').StoryCommit) => !c.reverted,
    );
    const targetIdx = allCommits.findIndex(
      (c: import('./server/nvm/state/StoryCommit.ts').StoryCommit) => c.commitId === targetId,
    );
    if (targetIdx === -1) {
      res.status(404).json({ error: `Commit "${targetId}" not found` }); return;
    }
    const commit = allCommits[targetIdx];

    let rollingState = emptyState();
    for (let i = 0; i < targetIdx; i++) {
      rollingState = applyStoryOps(rollingState, allCommits[i].ops);
    }

    const ir: import('./server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR = {
      transitionId: commit.commitId,
      sceneIdx: commit.sceneIdx,
      sceneFunction: 'advance_plot',
      activeMechanisms: [],
      beforeStateHash: 'quality-inspector',
      ops: commit.ops,
      preconditions: [],
      postconditions: [],
      provenance: { origin: 'model_generated', createdAt: commit.createdAt },
    };

    const report = runQualityEngine(ir, rollingState);
    res.json({ commitId: commit.commitId, sceneIdx: commit.sceneIdx, opCount: commit.ops.length, ...report });
  }));

  // GET /api/nvm/epistemic — current epistemic state: per-character beliefs,
  // inferred meta-layers (who believes what about whom based on 'told' sources),
  // and dramatic irony pairs where characters hold divergent beliefs about the
  // same proposition.
  app.get('/api/nvm/epistemic', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const { buildNarrativeState } = await import('./server/nvm/state/NarrativeState.ts');
    const state = buildNarrativeState(stage);

    // Flatten all character beliefs into a unified belief map
    const beliefs: Array<{ charId: string; beliefId: string; proposition: string; confidence: number; source: string }> = [];
    for (const [charId, blist] of Object.entries(state.characterBeliefs)) {
      for (const b of blist) {
        beliefs.push({ charId, beliefId: b.id, proposition: b.proposition, confidence: b.confidence, source: b.source });
      }
    }

    // Infer meta-layers: beliefs with source='told' imply holderId has a meta-belief
    // that some other party also holds the same proposition (they were told it).
    // Cross-reference: for each 'told' belief of charA, find any charB who also holds
    // the same proposition — this constitutes a shared-knowledge irony opportunity.
    const metaLayers: Array<{ holderId: string; targetId: string; proposition: string; confidence: number; depth: number; basis: string }> = [];
    for (const { charId, proposition, confidence } of beliefs.filter(b => b.source === 'told')) {
      const sharers = beliefs.filter(b => b.charId !== charId && b.proposition === proposition);
      for (const sharer of sharers) {
        metaLayers.push({
          holderId: charId,
          targetId: sharer.charId,
          proposition,
          confidence: Math.round(confidence * 0.8 * 100) / 100,
          depth: 2,
          basis: 'told-cross-reference',
        });
      }
    }

    // Dramatic irony: propositions where chars hold divergent beliefs (confidence diff > 0.4)
    const ironyPairs: Array<{ charA: string; charB: string; proposition: string; confA: number; confB: number }> = [];
    const propMap = new Map<string, Array<{ charId: string; confidence: number }>>();
    for (const { charId, proposition, confidence } of beliefs) {
      const list = propMap.get(proposition) ?? [];
      list.push({ charId, confidence });
      propMap.set(proposition, list);
    }
    for (const [proposition, holders] of propMap) {
      for (let i = 0; i < holders.length; i++) {
        for (let j = i + 1; j < holders.length; j++) {
          const diff = Math.abs(holders[i].confidence - holders[j].confidence);
          if (diff >= 0.4) {
            ironyPairs.push({
              charA: holders[i].charId,
              charB: holders[j].charId,
              proposition,
              confA: holders[i].confidence,
              confB: holders[j].confidence,
            });
          }
        }
      }
    }

    res.json({
      characters: Object.keys(state.characterBeliefs),
      totalBeliefs: beliefs.length,
      beliefs,
      metaLayers,
      ironyPairs,
      clueCount: state.clues.length,
      payoffCount: state.payoffs.length,
      suspense: state.audienceState.suspense,
    });
  }));

  // GET /api/nvm/health — unified story health dashboard.
  // Aggregates tension, topology, arc-completion, epistemic state, quality,
  // proof pass-rate, and momentum into a single health report. One round-trip
  // for the health panel — no client-side fan-out needed.
  app.get('/api/nvm/health', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const { buildNarrativeState, emptyState } = await import('./server/nvm/state/NarrativeState.ts');
    const { deriveTensionLedger, momentumScore } = await import('./server/nvm/valuation/futures.ts');
    const { computeTopology } = await import('./server/nvm/valuation/topology.ts');
    const { analyzeArcCompletion } = await import('./server/nvm/quality/arc-tracker.ts');
    const { runTier1, runTier2, tier2Score } = await import('./server/nvm/proof/kernel.ts');
    const { applyStoryOps } = await import('./server/nvm/ops/dispatcher.ts');

    const state = buildNarrativeState(stage);
    const allCommits = stage.getCommits().filter((c: import('./server/nvm/state/StoryCommit.ts').StoryCommit) => !c.reverted);
    const commitCount = allCommits.length;
    const sceneIdx = commitCount > 0 ? allCommits[commitCount - 1].sceneIdx : 0;

    // Tension
    const currentLedger = deriveTensionLedger(state, sceneIdx);
    const ledgers = allCommits.map((c: import('./server/nvm/state/StoryCommit.ts').StoryCommit, i: number) => deriveTensionLedger(state, c.sceneIdx ?? i));
    const tensionHistory = ledgers.map(l => l.totalTension);

    // Topology
    const topology = computeTopology(ledgers);

    // Arc completion
    const arcReport = analyzeArcCompletion(allCommits.map((c: import('./server/nvm/state/StoryCommit.ts').StoryCommit) => ({ sceneIdx: c.sceneIdx, ops: c.ops })));

    // Epistemic summary
    const totalBeliefs = Object.values(state.characterBeliefs).flat().length;
    const characterCount = Object.keys(state.characterBeliefs).length;

    // Proof pass rate over all committed scenes (using rolling state)
    let t1PassCount = 0;
    let totalQuality = 0;
    let rollingState = emptyState();
    for (const commit of allCommits) {
      const ir: import('./server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR = {
        transitionId: commit.commitId, sceneIdx: commit.sceneIdx, sceneFunction: 'advance_plot',
        activeMechanisms: [], beforeStateHash: 'health', ops: commit.ops,
        preconditions: [], postconditions: [],
        provenance: { origin: 'model_generated', createdAt: commit.createdAt },
      };
      const t1 = runTier1(ir, rollingState);
      const t2 = runTier2(ir, rollingState);
      if (t1.every(r => r.pass)) t1PassCount++;
      totalQuality += tier2Score(t2);
      rollingState = applyStoryOps(rollingState, commit.ops);
    }
    const proofPassRate = commitCount > 0 ? Math.round((t1PassCount / commitCount) * 100) : 100;
    const avgQuality = commitCount > 0 ? Math.round(totalQuality / commitCount) : 0;

    // Momentum (momentumScore expects StoryCommit[], not TensionLedger[])
    const momentum = momentumScore(allCommits);

    res.json({
      commitCount,
      sceneCount: sceneIdx + (commitCount > 0 ? 1 : 0),
      currentTension: currentLedger.totalTension,
      tensionHistory,
      momentum,
      topology: {
        dominantArc: topology.dominantArc,
        coherence: topology.coherence,
        scores: topology.scores.slice(0, 3),
      },
      arcCompletion: {
        openCount: arcReport.openPromises.length,
        overdueCount: arcReport.overdueCount,
        resolvedCount: arcReport.resolvedCount,
        debtScore: arcReport.debtScore,
        mostUrgent: arcReport.openPromises.slice(0, 3).map(p => ({ kind: p.kind, description: p.description, urgency: p.urgency })),
      },
      epistemic: {
        characterCount,
        totalBeliefs,
        suspense: state.audienceState.suspense,
        clueCount: state.clues.length,
        payoffCount: state.payoffs.length,
      },
      proof: {
        passRate: proofPassRate,
        avgQualityScore: avgQuality,
      },
    });
  }));

  // GET /api/nvm/character-arc — per-character per-scene breakdown.
  // Replays all committed scenes and tracks, for each character that appears in
  // any op: belief count, avg confidence, dominant emotion+intensity, net
  // relationship scores (summed across all pairs), and scene-level agency (op count).
  // Returns an arc object keyed by charId → per-scene snapshots.
  app.get('/api/nvm/character-arc', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const { emptyState, relationshipKey } = await import('./server/nvm/state/NarrativeState.ts');
    const { applyStoryOps } = await import('./server/nvm/ops/dispatcher.ts');

    const allCommits = stage.getCommits().filter(
      (c: import('./server/nvm/state/StoryCommit.ts').StoryCommit) => !c.reverted,
    );

    // Per-character timeline
    const arcs: Record<string, Array<{
      sceneIdx: number;
      beliefCount: number;
      avgConfidence: number;
      dominantEmotion: string;
      emotionIntensity: number;
      netRelationshipScore: number;
      agencyCount: number;    // ops in this scene that reference this char
    }>> = {};

    let rollingState = emptyState();

    for (const commit of allCommits) {
      // Apply this commit's ops to get post-scene state
      const afterState = applyStoryOps(rollingState, commit.ops);

      // Find all chars referenced in this commit's ops
      const charsInScene = new Set<string>();
      for (const op of commit.ops) {
        if ('charId' in op) charsInScene.add((op as { charId: string }).charId);
        if ('pair' in op) {
          const pair = (op as { pair: [string, string] }).pair;
          charsInScene.add(pair[0]);
          charsInScene.add(pair[1]);
        }
      }

      // Also include any char already tracked in prior arcs
      for (const charId of Object.keys(arcs)) charsInScene.add(charId);

      for (const charId of charsInScene) {
        const beliefs = afterState.characterBeliefs[charId] ?? [];
        const emotion = afterState.characterEmotions[charId];
        const avgConf = beliefs.length > 0
          ? Math.round(beliefs.reduce((s, b) => s + b.confidence, 0) / beliefs.length * 100) / 100
          : 0;

        // Net relationship score: sum of all relationship deltas for this char
        let netRel = 0;
        for (const [key, deltas] of Object.entries(afterState.relationships)) {
          if (key.includes(charId)) {
            netRel += deltas.reduce((s, d) => s + d.amount, 0);
          }
        }

        // Agency: ops in this commit that reference this char
        const agencyCount = commit.ops.filter(op => {
          if ('charId' in op && (op as { charId: string }).charId === charId) return true;
          if ('pair' in op) {
            const pair = (op as { pair: [string, string] }).pair;
            return pair[0] === charId || pair[1] === charId;
          }
          return false;
        }).length;

        if (!arcs[charId]) arcs[charId] = [];
        arcs[charId].push({
          sceneIdx: commit.sceneIdx,
          beliefCount: beliefs.length,
          avgConfidence: avgConf,
          dominantEmotion: emotion?.dominant ?? 'none',
          emotionIntensity: emotion?.intensity ?? 0,
          netRelationshipScore: Math.round(netRel * 100) / 100,
          agencyCount,
        });
      }

      rollingState = afterState;
    }

    // Summarize across all scenes: belief trajectory, emotional range, peak agency
    const characters = Object.entries(arcs).map(([charId, scenes]) => ({
      charId,
      scenes,
      totalScenes: scenes.length,
      peakBeliefs: Math.max(...scenes.map(s => s.beliefCount), 0),
      peakIntensity: Math.max(...scenes.map(s => s.emotionIntensity), 0),
      dominantEmotions: [...new Set(scenes.map(s => s.dominantEmotion).filter(e => e !== 'none'))],
      totalAgency: scenes.reduce((s, sc) => s + sc.agencyCount, 0),
    }));

    // Sort by total agency descending (most active characters first)
    characters.sort((a, b) => b.totalAgency - a.totalAgency);
    res.json({ characters, totalScenes: allCommits.length });
  }));

  // GET /api/nvm/arc-completion — open narrative promise tracker.
  // Replays all committed scenes and returns every unresolved story beat
  // (clues, clocks, negative relationships, theme claims, object arcs)
  // with pacing scores and completion window recommendations.
  app.get('/api/nvm/arc-completion', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const { analyzeArcCompletion } = await import('./server/nvm/quality/arc-tracker.ts');
    const allCommits = stage.getCommits().filter(
      (c: import('./server/nvm/state/StoryCommit.ts').StoryCommit) => !c.reverted,
    );
    const scenes = allCommits.map(
      (c: import('./server/nvm/state/StoryCommit.ts').StoryCommit) => ({ sceneIdx: c.sceneIdx, ops: c.ops }),
    );
    res.json(analyzeArcCompletion(scenes));
  }));

  // GET /api/nvm/regression — narrative regression suite (Wave 29).
  // Runs 14 named structural invariants over the full StoryCommit ledger and
  // returns a graded report: pass/fail/warning/na per invariant + overall score.
  app.get('/api/nvm/regression', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const { runNarrativeRegression } = await import('./server/nvm/regression/runner.ts');
    const allCommits = stage.getCommits();
    res.json(runNarrativeRegression(allCommits));
  }));

  // GET /api/nvm/momentum — narrative momentum dashboard (Wave 30).
  // Replays the full commit history scene by scene, computing quality score,
  // regression score, tension total, and proof pass rate at each step.
  // Returns a time-series array for the writer's CI dashboard.
  app.get('/api/nvm/momentum', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const { runQualityEngine } = await import('./server/nvm/quality/index.ts');
    const { runNarrativeRegression } = await import('./server/nvm/regression/runner.ts');
    const { emptyState, applyStoryOps } = await import('./server/nvm/ops/dispatcher.ts').then(async d => ({
      ...(await import('./server/nvm/state/NarrativeState.ts')),
      applyStoryOps: d.applyStoryOps,
    }));
    const { runTier1, tier1Passes } = await import('./server/nvm/proof/kernel.ts');
    const { deriveTensionLedger } = await import('./server/nvm/valuation/futures.ts');
    type StoryCommit = import('./server/nvm/state/StoryCommit.ts').StoryCommit;
    type NarrativeTransitionIR = import('./server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR;

    const allCommits = (stage.getCommits() as StoryCommit[]).filter(c => !c.reverted);
    const points: Array<{
      sceneIdx: number; commitId: string; opCount: number;
      qualityScore: number; qualityWarnings: number;
      regressionScore: number; regressionGrade: string;
      tensionTotal: number; proofPassRate: number;
    }> = [];

    let rollingState = emptyState();
    for (let i = 0; i < allCommits.length; i++) {
      const commit = allCommits[i];
      const ir: NarrativeTransitionIR = {
        transitionId: commit.commitId, sceneIdx: commit.sceneIdx,
        sceneFunction: 'advance_plot', activeMechanisms: [],
        beforeStateHash: 'momentum', ops: commit.ops,
        preconditions: [], postconditions: [],
        provenance: { origin: 'model_generated', createdAt: commit.createdAt },
      };

      const qReport = runQualityEngine(ir, rollingState);
      const tier1Results = runTier1(ir, rollingState);
      const passCount = tier1Results.filter((r: import('./server/nvm/proof/contract.ts').ProofResult) => r.pass).length;
      const proofPassRate = tier1Results.length === 0 ? 1 : passCount / tier1Results.length;

      // Advance state then measure tension (tension depends on full context)
      rollingState = applyStoryOps(rollingState, commit.ops);
      const ledger = deriveTensionLedger(rollingState, commit.sceneIdx);

      // Regression runs on all commits up to and including this one
      const rReport = runNarrativeRegression(allCommits.slice(0, i + 1));

      points.push({
        sceneIdx: commit.sceneIdx,
        commitId: commit.commitId,
        opCount: commit.ops.length,
        qualityScore: qReport.score,
        qualityWarnings: qReport.warnings.length,
        regressionScore: rReport.score,
        regressionGrade: rReport.grade,
        tensionTotal: Math.round(ledger.totalTension * 100) / 100,
        proofPassRate: Math.round(proofPassRate * 100),
      });
    }

    res.json({ points, totalScenes: allCommits.length });
  }));

  // GET /api/nvm/voice-dna — Voice DNA Analyzer (Wave 31).
  // Aggregates UPDATE_BELIEF propositions across all commits, builds per-character
  // vocabulary fingerprints, computes pairwise Jaccard similarity, identifies
  // signature words (unique to each character), and returns an "acoustic twins"
  // alert for pairs whose voices overlap too much.
  app.get('/api/nvm/voice-dna', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    type StoryCommit = import('./server/nvm/state/StoryCommit.ts').StoryCommit;
    const allCommits = (stage.getCommits() as StoryCommit[]).filter(c => !c.reverted);

    // Build per-character word frequency maps from proposition vocabulary
    const charWords = new Map<string, Map<string, number>>(); // charId → word → count
    const charEmotions = new Map<string, Map<string, number>>(); // charId → emotion → count
    let beliefOpCount = 0;

    for (const commit of allCommits) {
      for (const op of commit.ops) {
        if (op.op === 'UPDATE_BELIEF') {
          beliefOpCount++;
          const words = op.belief.proposition.toLowerCase().split(/\W+/).filter((w: string) => w.length > 3);
          const existing = charWords.get(op.charId) ?? new Map<string, number>();
          for (const w of words) existing.set(w, (existing.get(w) ?? 0) + 1);
          charWords.set(op.charId, existing);
        }
        if (op.op === 'APPRAISE_EMOTION') {
          const existing = charEmotions.get(op.charId) ?? new Map<string, number>();
          const dom = op.emotion.dominant ?? 'none';
          existing.set(dom, (existing.get(dom) ?? 0) + 1);
          charEmotions.set(op.charId, existing);
        }
      }
    }

    const characters = [...charWords.keys()];

    // Pairwise Jaccard similarity
    type SimPair = { a: string; b: string; similarity: number; sharedWords: string[] };
    const pairs: SimPair[] = [];
    for (let i = 0; i < characters.length; i++) {
      for (let j = i + 1; j < characters.length; j++) {
        const a = characters[i], b = characters[j];
        const setA = new Set(charWords.get(a)!.keys());
        const setB = new Set(charWords.get(b)!.keys());
        const shared = [...setA].filter(w => setB.has(w));
        const union = new Set([...setA, ...setB]).size;
        const sim = union > 0 ? shared.length / union : 0;
        pairs.push({ a, b, similarity: Math.round(sim * 100) / 100, sharedWords: shared.slice(0, 8) });
      }
    }
    pairs.sort((a, b) => b.similarity - a.similarity);

    // Signature words: words unique to this character (not in any other char's vocab)
    const allOtherWords = (charId: string): Set<string> => {
      const s = new Set<string>();
      for (const [id, words] of charWords) {
        if (id !== charId) for (const w of words.keys()) s.add(w);
      }
      return s;
    };

    type CharFingerprint = {
      charId: string;
      vocabSize: number;
      signatureWords: string[];
      dominantEmotion: string;
      emotionRange: number;
      beliefCount: number;
    };
    const fingerprints: CharFingerprint[] = characters.map(charId => {
      const words = charWords.get(charId)!;
      const others = allOtherWords(charId);
      const sigs = [...words.entries()]
        .filter(([w]) => !others.has(w))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([w]) => w);
      const emos = charEmotions.get(charId);
      let domEmo = 'none', maxCount = 0;
      if (emos) for (const [e, c] of emos) { if (c > maxCount) { maxCount = c; domEmo = e; } }
      const emoRange = emos ? emos.size : 0;
      const beliefCount = [...words.values()].reduce((s, c) => s + c, 0);
      return { charId, vocabSize: words.size, signatureWords: sigs, dominantEmotion: domEmo, emotionRange: emoRange, beliefCount };
    });
    fingerprints.sort((a, b) => b.vocabSize - a.vocabSize);

    // Global diversity score (avg pairwise Jaccard distance, 0=all same, 100=all distinct)
    const avgSim = pairs.length > 0 ? pairs.reduce((s, p) => s + p.similarity, 0) / pairs.length : 0;
    const diversityScore = Math.round((1 - avgSim) * 100);

    // "Acoustic twins" = pairs with similarity >= 0.35
    const acousticTwins = pairs.filter(p => p.similarity >= 0.35);

    res.json({
      characters,
      fingerprints,
      pairs,
      acousticTwins,
      diversityScore,
      totalBeliefOps: beliefOpCount,
      totalScenes: allCommits.length,
    });
  }));

  // POST /api/nvm/live/move — Author-Presence Move Bus (Wave 33).
  // Body: { text: string, sceneIdx?: number }
  // Parses freeform author text → StoryOp[] → Tier-1 proof gate → StoryCommit.
  // Returns: { verb, summary, ops, commitId?, tier1Pass, ambiguous }
  app.post('/api/nvm/live/move', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const { text, sceneIdx: bodySceneIdx } = req.body as { text?: string; sceneIdx?: number };
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      res.status(400).json({ error: 'text is required' });
      return;
    }

    const { parseAuthorMove, buildAuthorCommit } = await import('./server/nvm/live/move-bus.ts');
    const { buildNarrativeState, emptyState } = await import('./server/nvm/state/NarrativeState.ts');
    const { applyStoryOps } = await import('./server/nvm/ops/dispatcher.ts');

    type StoryCommitT = import('./server/nvm/state/StoryCommit.ts').StoryCommit;
    const allCommits = (stage.getCommits() as StoryCommitT[]).filter(c => !c.reverted);

    // Fold committed ops into state for accurate proof-gate evaluation
    const baseState = buildNarrativeState(stage);
    let foldedState = emptyState();
    for (const c of allCommits) foldedState = applyStoryOps(foldedState, c.ops);
    const beforeState = { ...baseState, ...foldedState, turn: stage.getTurnCount() };

    const sceneIdx = typeof bodySceneIdx === 'number'
      ? bodySceneIdx
      : (allCommits[allCommits.length - 1]?.sceneIdx ?? 0) + 1;

    const move = parseAuthorMove(text.trim(), beforeState, { sceneIdx });

    // OVERRULE: revert last commit and return early
    if (move.intent.verb === 'OVERRULE') {
      const last = allCommits[allCommits.length - 1];
      if (last) {
        stage.revertCommit(last.commitId);
        res.json({ verb: 'OVERRULE', summary: move.summary, commitId: null, reverted: last.commitId, tier1Pass: true, ambiguous: false });
      } else {
        res.json({ verb: 'OVERRULE', summary: 'No commit to revert', commitId: null, reverted: null, tier1Pass: true, ambiguous: true });
      }
      return;
    }

    const parentId = allCommits.length > 0 ? allCommits[allCommits.length - 1].commitId : null;
    const commit = buildAuthorCommit({ move, beforeState, sceneIdx, parentId });

    if (commit) {
      stage.appendCommit(commit);
      res.json({
        verb: move.intent.verb,
        summary: move.summary,
        ops: commit.ops,
        commitId: commit.commitId,
        tier1Pass: true,
        ambiguous: move.ambiguous,
      });
    } else {
      res.json({
        verb: move.intent.verb,
        summary: move.summary,
        ops: move.ops,
        commitId: null,
        tier1Pass: false,
        ambiguous: move.ambiguous,
      });
    }
  }));

  // GET /api/nvm/live/feed — Committed-scene stream for the LivePlayPanel.
  // Returns: { commits: { commitId, sceneIdx, ops, deltaSummary, opSummary, createdAt }[] }
  app.get('/api/nvm/live/feed', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    type StoryCommitT = import('./server/nvm/state/StoryCommit.ts').StoryCommit;
    const allCommits = (stage.getCommits() as StoryCommitT[]).filter(c => !c.reverted);

    const feed = allCommits.map(c => {
      const beliefCount = c.ops.filter(o => o.op === 'UPDATE_BELIEF').length;
      const factCount   = c.ops.filter(o => o.op === 'ADD_FACT').length;
      const suspenseOps = c.ops.filter(o => o.op === 'UPDATE_READER_STATE');
      const suspenseDelta  = suspenseOps.reduce((s, o) =>
        s + ((o as { op: string; delta: { suspense?: number } }).delta.suspense ?? 0), 0);
      const curiosityDelta = suspenseOps.reduce((s, o) =>
        s + ((o as { op: string; delta: { curiosity?: number } }).delta.curiosity ?? 0), 0);
      const parts: string[] = [];
      if (factCount > 0)   parts.push(`${factCount} fact${factCount !== 1 ? 's' : ''}`);
      if (beliefCount > 0) parts.push(`${beliefCount} belief${beliefCount !== 1 ? 's' : ''}`);
      if (suspenseDelta > 0)  parts.push(`suspense +${suspenseDelta}`);
      if (curiosityDelta > 0) parts.push(`curiosity +${curiosityDelta}`);
      const opSummary = parts.length > 0 ? parts.join(', ') : `${c.ops.length} ops`;

      return {
        commitId:     c.commitId,
        parentId:     c.parentId,
        sceneIdx:     c.sceneIdx,
        createdAt:    c.createdAt,
        ops:          c.ops,
        deltaSummary: c.deltaSummary,
        opSummary,
      };
    });

    res.json({ commits: feed, totalCommits: feed.length });
  }));

  // POST /api/nvm/live/advance — Reactive Turn Cycle (Wave 34).
  // Body: { beats?: number, locationId?: string }
  // Runs N beats of NPC reaction from the current state; each produces a StoryCommit.
  // Returns: { commits: FeedEntry[], turnsRun, stoppedBecause }
  app.post('/api/nvm/live/advance', gameLimiter, asyncHandler(async (req, res) => {
    const { stage, orchestrator } = getOrCreateSession(sessionId(req));
    const { beats = 1, locationId } = req.body as { beats?: number; locationId?: string };
    const safeBeats = Math.max(1, Math.min(5, typeof beats === 'number' ? beats : 1));

    const { advanceWorld } = await import('./server/nvm/live/loop.ts');
    const result = await advanceWorld(stage, orchestrator, safeBeats, locationId);

    // Build feed entries for the new commits so the client can display them
    const feedEntries = result.commits.map(c => {
      const beliefCount = c.ops.filter(o => o.op === 'UPDATE_BELIEF').length;
      const factCount   = c.ops.filter(o => o.op === 'ADD_FACT').length;
      const parts: string[] = [];
      if (factCount > 0)   parts.push(`${factCount} fact${factCount !== 1 ? 's' : ''}`);
      if (beliefCount > 0) parts.push(`${beliefCount} belief${beliefCount !== 1 ? 's' : ''}`);
      return {
        commitId:     c.commitId,
        parentId:     c.parentId,
        sceneIdx:     c.sceneIdx,
        createdAt:    c.createdAt,
        deltaSummary: c.deltaSummary,
        opSummary:    parts.join(', ') || `${c.ops.length} ops`,
      };
    });

    res.json({
      commits: feedEntries,
      turnsRun: result.turnsRun,
      stoppedBecause: result.stoppedBecause,
    });
  }));

  // GET /api/nvm/branch/field — Forward Latent Branch Field (Wave 35).
  // Returns: { branches: BranchPacket[], currentSceneIdx, generatedAt }
  // Query: ?seed=<number> (optional; defaults to Date.now())
  app.get('/api/nvm/branch/field', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const seed = typeof req.query.seed === 'string' ? parseInt(req.query.seed, 10) : undefined;

    const { generateBranchField } = await import('./server/nvm/branch/field.ts');
    const { buildNarrativeState, emptyState } = await import('./server/nvm/state/NarrativeState.ts');
    const { applyStoryOps } = await import('./server/nvm/ops/dispatcher.ts');

    type StoryCommitT = import('./server/nvm/state/StoryCommit.ts').StoryCommit;
    const allCommits = (stage.getCommits() as StoryCommitT[]).filter(c => !c.reverted);

    // Fold commits into state for accurate scoring
    const base = buildNarrativeState(stage);
    let folded = emptyState();
    for (const c of allCommits) folded = applyStoryOps(folded, c.ops);
    const state = { ...base, ...folded, turn: stage.getTurnCount() };

    const field = generateBranchField(state, allCommits, seed);
    res.json(field);
  }));

  // GET /api/nvm/conflicts — Conflict Orchestrator + Intention Registry (Wave 36).
  // Returns: { registry: IntentionRegistry, conflicts: ConflictReport }
  app.get('/api/nvm/conflicts', gameLimiter, asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    const { buildIntentionRegistry } = await import('./server/nvm/drama/intention-registry.ts');
    const { computeConflicts } = await import('./server/nvm/drama/conflict-orchestrator.ts');
    const { buildNarrativeState, emptyState } = await import('./server/nvm/state/NarrativeState.ts');
    const { applyStoryOps } = await import('./server/nvm/ops/dispatcher.ts');

    type StoryCommitT = import('./server/nvm/state/StoryCommit.ts').StoryCommit;
    const allCommits = (stage.getCommits() as StoryCommitT[]).filter(c => !c.reverted);

    const base = buildNarrativeState(stage);
    let folded = emptyState();
    for (const c of allCommits) folded = applyStoryOps(folded, c.ops);
    const state = { ...base, ...folded, turn: stage.getTurnCount() };

    const registry = buildIntentionRegistry(stage);
    const conflicts = computeConflicts(registry, state);

    res.json({ registry, conflicts });
  }));

  // ── Global error handler ───────────────────────────────────────────────────
  // Always log full error + stack server-side; never expose internals to client.
  app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    // Malformed JSON body — Express throws a SyntaxError with a 'body' property.
    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({ error: 'Invalid JSON in request body' });
      return;
    }
    // Application-level validation errors (e.g. bad sessionId format).
    if (err instanceof ValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    logger.error('unhandled_error', {
      message: err.message,
      stack: err.stack,
      method: req.method,
      path: req.path,
    });
    res.status(500).json({ error: 'Internal Server Error' });
  });

  // ── Static serving ─────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  const PORT = Number(process.env.PORT ?? 3000);
  if (isNaN(PORT) || PORT < 1 || PORT > 65535) {
    console.error(`FATAL: Invalid PORT value "${process.env.PORT}". Must be 1–65535.`);
    process.exit(1);
  }
  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info('server_started', { port: PORT });
  });

  // ── Graceful shutdown ────────────────────────────────────────────────────────
  const shutdown = (signal: string) => {
    logger.info('server_shutdown', { signal });
    server.close(() => {
      // Close all SQLite handles before exiting so WAL files are flushed cleanly.
      for (const { stage } of sessions.values()) {
        try { stage.close(); } catch { /* already closed */ }
      }
      process.exit(0);
    });
    // Hard-kill after 10s if in-flight requests haven't drained.
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

startServer();
