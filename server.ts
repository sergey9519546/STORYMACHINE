import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { type GoogleGenAI, Type, Modality } from '@google/genai';
import { getAI, withTimeout } from './server/engine/ai.ts';
import { rateLimit } from 'express-rate-limit';
import { Stage } from './server/engine/Stage.ts';
import { Orchestrator, type RoomProgressEvent } from './server/engine/Orchestrator.ts';
import type { CharacterSheet, Location, StageSnapshot } from './server/engine/types.ts';
import { transcriptToFountain, extractCharactersFromLog, syuzhetSort, wrapSyuzhetFountain } from './server/lib/fountain.ts';
import { instantiatePreset, STRUCTURE_NAMES, ARC_TENSION_CURVES, STYLE_MODIFIERS } from './server/lib/structure-presets.ts';
import { logger, requestLogger } from './server/lib/logger.ts';

// ── Startup validation ────────────────────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('FATAL: GEMINI_API_KEY environment variable is not set. Exiting.');
  process.exit(1);
}

// ── Constants ─────────────────────────────────────────────────────────────────
const GEMINI_MODEL     = process.env.GEMINI_MODEL      ?? 'gemini-2.5-pro';
const GEMINI_IMG_MODEL = process.env.GEMINI_IMG_MODEL  ?? 'gemini-2.5-flash-preview-image-generation';
const GEMINI_TTS_MODEL = process.env.GEMINI_TTS_MODEL  ?? 'gemini-2.5-flash-preview-tts';

// Directory for per-session SQLite files. Sessions survive a server restart.
// Set SESSION_DB_DIR=':memory:' to opt out of disk persistence (ephemeral runs).
const SESSION_DB_DIR = process.env.SESSION_DB_DIR ?? path.join(process.cwd(), 'data', 'sessions');
const PERSIST_SESSIONS = SESSION_DB_DIR !== ':memory:';

// ── Helpers ───────────────────────────────────────────────────────────────────
const asyncHandler = (fn: express.RequestHandler): express.RequestHandler =>
  (req, res, next) => { Promise.resolve(fn(req, res, next)).catch(next); };

class ValidationError extends Error {
  status = 400;
  constructor(message: string) { super(message); this.name = 'ValidationError'; }
}

const requireString = (val: unknown, name: string, maxLen = 20_000): string => {
  if (typeof val !== 'string' || val.trim() === '') throw new Error(`${name} is required`);
  if (val.length > maxLen) throw new Error(`${name} exceeds maximum length`);
  return val;
};

function safeJsonParse<T>(text: string, fallback: T): T {
  try { return JSON.parse(text); } catch { return fallback; }
}

// WAV header helpers (used server-side for PCM→WAV conversion)
function pcmToWav(pcmData: Buffer, sampleRate: number, numChannels: number): Buffer {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcmData.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * numChannels * 2, 28);
  header.writeUInt16LE(numChannels * 2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcmData.length, 40);
  return Buffer.concat([header, pcmData]);
}

async function generateImageServer(ai: GoogleGenAI, prompt: string): Promise<string | undefined> {
  try {
    const response = await withTimeout(ai.models.generateContent({
      model: GEMINI_IMG_MODEL,
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: '16:9' } },
    }), 25_000, 'generateImage');
    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  } catch (e) {
    console.error('Image generation failed:', (e as Error).message);
  }
  return undefined;
}

async function generateAudioServer(ai: GoogleGenAI, text: string): Promise<string | undefined> {
  if (!text) return undefined;
  try {
    const response = await withTimeout(ai.models.generateContent({
      model: GEMINI_TTS_MODEL,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
      },
    }), 20_000, 'generateAudio');
    const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!inlineData?.data || inlineData.data.length === 0) return undefined;

    let base64Data = inlineData.data;
    let mimeType = inlineData.mimeType ?? 'audio/wav';

    const isWav = base64Data.startsWith('UklGR'); // "RIFF" in base64
    if (!isWav && (mimeType.includes('audio/pcm') || mimeType === 'audio/wav')) {
      let pcmBuf = Buffer.from(base64Data, 'base64');
      if (pcmBuf.length === 0) return undefined;
      if (pcmBuf.length % 2 !== 0) pcmBuf = pcmBuf.subarray(0, pcmBuf.length - 1);
      const wavBuf = pcmToWav(pcmBuf, 24000, 1);
      base64Data = wavBuf.toString('base64');
      mimeType = 'audio/wav';
    } else if (isWav) {
      mimeType = 'audio/wav';
    }
    return `data:${mimeType};base64,${base64Data}`;
  } catch (e) {
    console.error('Audio generation failed:', (e as Error).message);
  }
  return undefined;
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

function dbPathFor(sessionId: string): string {
  return PERSIST_SESSIONS ? path.join(SESSION_DB_DIR, `${sessionId}.db`) : ':memory:';
}

function getOrCreateSession(sessionId: string): Session {
  let session = sessions.get(sessionId);
  if (!session) {
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

  // Health check — no rate limit, no auth, responds even when Gemini is down.
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: Math.round(process.uptime()), sessions: sessions.size });
  });

  const ai = getAI();

  // ── Story Machine routes (game simulation) ─────────────────────────────────
  app.use('/api/init',     gameLimiter);
  app.use('/api/turn',     gameLimiter);
  app.use('/api/run-room', gameLimiter);
  app.use('/api/ledger',   gameLimiter);
  app.use('/api/state',    gameLimiter);

  app.post('/api/init', asyncHandler(async (req, res) => {
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

  app.post('/api/turn', asyncHandler(async (req, res) => {
    const session = getOrCreateSession(sessionId(req));
    const agentId = requireString(req.body?.agentId, 'agentId', 128);

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

  app.post('/api/run-room', asyncHandler(async (req, res) => {
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

    const { orchestrator } = getOrCreateSession(sid);
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
  app.get('/api/run-room-stream', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // disable nginx proxy buffering
    res.flushHeaders();

    const emit = (event: RoomProgressEvent) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

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

      const { orchestrator } = getOrCreateSession(sid);
      runningRooms.add(lockKey);
      try {
        await orchestrator.runRoomSimulation(nodeId, maxTurns, emit);
      } finally {
        runningRooms.delete(lockKey);
      }
    } catch (err) {
      emit({ type: 'simulation_complete', totalTurns: 0, stoppedBy: `error: ${(err as Error).message}` });
    }

    res.end();
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
    res.json(stage.getFullLedger());
  }));

  app.get('/api/state', asyncHandler(async (req, res) => {
    const { stage } = getOrCreateSession(sessionId(req));
    res.json({ agents: stage.getAllAgents(), nodes: stage.getAllLocations() });
  }));

  // Reset a session (clears all simulation state for this sessionId)
  app.post('/api/reset', gameLimiter, asyncHandler(async (req, res) => {
    const sid = sessionId(req);
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
  app.post('/api/session/import', gameLimiter, asyncHandler(async (req, res) => {
    const snap = req.body as StageSnapshot;
    if (!snap || typeof snap !== 'object' || !Array.isArray(snap.agents) || !Array.isArray(snap.locations)) {
      res.status(400).json({ error: 'Invalid snapshot: must include agents and locations arrays' });
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

  // NCP Storyform — derive narrative context protocol schema from goals and throughlines
  app.post('/api/ncp-storyform', gameLimiter, asyncHandler(async (req, res) => {
    const { throughlines, characters } = req.body ?? {};
    const tl = typeof throughlines === 'object' && throughlines !== null ? throughlines as Record<string, unknown> : {};
    const chars = Array.isArray(characters) ? (characters as unknown[]).slice(0, 10) : [];

    const storyform: Record<string, unknown> = {
      objectiveStory: tl.objectiveStory ?? null,
      mainCharacter: {
        throughline: tl.mainCharacter ?? null,
        protagonist: chars[0] ?? null,
      },
      influenceCharacter: {
        throughline: tl.influenceCharacter ?? null,
        character: chars[1] ?? null,
      },
      relationshipStory: tl.relationshipStory ?? null,
      activeThroughlines: Array.isArray(tl.activeThroughlines) ? tl.activeThroughlines : [],
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
    const response = await withTimeout(ai.models.generateContent({
      model: GEMINI_MODEL,
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
    }), 30_000, 'world-build');
    res.json({ result: response.text });
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
    const response = await withTimeout(ai.models.generateContent({
      model: GEMINI_MODEL,
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
    }), 30_000, 'refine-dialogue');
    res.json({ result: response.text });
  }));

  app.post('/api/scriptide/analyze-tension', aiLimiter, asyncHandler(async (req, res) => {
    const scene = requireString(req.body?.scene, 'scene');
    const tnContext = scriptContextOf(req.body);
    const tnContextBlock = tnContext
      ? `\nSURROUNDING SCRIPT (consider how tension carries over from adjacent scenes):\n${tnContext}\n`
      : '';
    const tnProfiles = profilesBlock(sanitizeProfiles(req.body?.profiles));
    const response = await withTimeout(ai.models.generateContent({
      model: GEMINI_MODEL,
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
    }), 30_000, 'analyze-tension');
    res.json({ result: response.text });
  }));

  app.post('/api/scriptide/clean-action', aiLimiter, asyncHandler(async (req, res) => {
    const text = requireString(req.body?.text, 'text');
    const response = await withTimeout(ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `SYSTEM ROLE: You are a strict script editor enforcing a "Semantic Firewall".
OBJECTIVE: Rewrite the following action block — remove all camera directions and technical jargon. Describe what happens in the world, not what the camera does.

INPUT: ${text}
OUTPUT: Just the rewritten action text, nothing else.`,
    }), 30_000, 'clean-action');
    res.json({ result: response.text });
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

    const response = await withTimeout(ai.models.generateContent({
      model: GEMINI_MODEL,
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
    }), 30_000, 'character-profile');
    res.json({ result: response.text });
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
${structure ? `- Narrative Structure: ${STRUCTURE_NAMES[structure] ?? structure} — ensure the structuralNode field names a beat from this specific structure.` : ''}
${emotionalArc ? `- Emotional Arc: ${emotionalArc.replace(/_/g, ' ')} — evaluate whether the current tension level matches this arc's expected trajectory at the scene's story position. ArcMeter and tension scores should reflect alignment with this shape.` : ''}
${dirStyle ? `- Cinematic Style: ${dirStyle} — ${STYLE_MODIFIERS[dirStyle]?.agentInstruction?.split('.')[0] ?? dirStyle}. Let this style govern composition choices, information position bias, and commentary tone.` : ''}
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

    const analysisResponse = await withTimeout(ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: 'You are the AI Director, a strict narrative dungeon master enforcing psychological and structural rules of screenwriting.',
        responseMimeType: 'application/json',
        responseSchema: AnalyzeScriptSchema,
      },
    }), 45_000, 'analyze-script');

    const rawText = (analysisResponse.text ?? '{}')
      .replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
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

    const [imageUrl, audioUrl] = await Promise.all([
      generateImageServer(ai, imagePromptText),
      generateAudioServer(ai, audioText),
    ]);

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
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
