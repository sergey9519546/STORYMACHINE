import express from 'express';
import path from 'path';
import fs from 'fs';
import { Stage } from '../engine/Stage.ts';
import { Orchestrator } from '../engine/Orchestrator.ts';
import type { CharacterSheet, StageSnapshot } from '../engine/types.ts';
import { transcriptToFountain, extractCharactersFromLog, syuzhetSort, wrapSyuzhetFountain } from '../lib/fountain.ts';
import { instantiatePreset, STRUCTURE_NAMES, ARC_TENSION_CURVES } from '../lib/structure-presets.ts';
import { logger } from '../lib/logger.ts';
import { validate, InitBodySchema, TurnBodySchema, RunRoomBodySchema, OutlineBodySchema } from '../lib/validation.ts';
import { sanitizeForPrompt } from '../lib/prompt-utils.ts';
import {
  asyncHandler, requireString, sessionId, getOrCreateSession, destroySession,
  gameLimiter, sessions, runningRooms, PERSIST_SESSIONS, SESSION_DB_DIR,
} from '../lib/session-store.ts';
import type { RoomProgressEvent } from '../engine/Orchestrator.ts';
import { buildStoryBibleSummary } from '../nvm/bible/index.ts';
import type { OutlineBeat } from '../engine/types.ts';

const router = express.Router();
export default router;

router.post('/api/init', gameLimiter, validate(InitBodySchema), asyncHandler(async (req, res) => {
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

router.post('/api/turn', gameLimiter, validate(TurnBodySchema), asyncHandler(async (req, res) => {
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

router.post('/api/run-room', gameLimiter, validate(RunRoomBodySchema), asyncHandler(async (req, res) => {
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
router.get('/api/run-room-stream', gameLimiter, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx proxy buffering
  res.flushHeaders();

  let disconnected = false;
  req.on('close', () => { disconnected = true; });
  req.on('error', () => { disconnected = true; });

  const emit = (event: RoomProgressEvent) => {
    if (!disconnected) res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  // Hard wall-clock limit: if the simulation hasn't completed in 5 minutes, close
  // the SSE stream and release the runningRooms lock so the session isn't stranded.
  const SSE_MAX_MS = 5 * 60 * 1000;
  const wallTimer = setTimeout(() => {
    if (!disconnected) {
      emit({ type: 'simulation_complete', totalTurns: 0, stoppedBy: 'error: stream timeout (5 min)' });
    }
    disconnected = true; // triggers ensureEnded() to skip the write, but it still calls res.end()
  }, SSE_MAX_MS);

  // C3: Single-flag guard ensures res.end() is called exactly once even when
  // the early-return paths or the error handler both want to close the stream.
  let ended = false;
  const ensureEnded = () => {
    if (!ended) { ended = true; res.end(); }
  };

  let lockKey = '';
  try {
    const sid = sessionId(req);
    const nodeId = requireString(req.query?.nodeId as string | undefined, 'nodeId', 128);
    lockKey = `${sid}:${nodeId}`;

    if (runningRooms.has(lockKey)) {
      emit({ type: 'simulation_complete', totalTurns: 0, stoppedBy: 'already_running' });
      ensureEnded();
      return;
    }

    const rawMaxTurns = req.query?.maxTurns;
    const maxTurns = typeof rawMaxTurns === 'string' && rawMaxTurns
      ? Math.max(2, Math.min(12, parseInt(rawMaxTurns, 10) || 5))
      : 5;

    const { stage, orchestrator } = getOrCreateSession(sid);
    if (!stage.getLocation(nodeId)) {
      emit({ type: 'simulation_complete', totalTurns: 0, stoppedBy: `error: location '${nodeId}' not found` });
      ensureEnded();
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
    ensureEnded();
  }
});

// ── Scene grouping endpoint ──────────────────────────────────────────────────
router.get('/api/scenes', gameLimiter, asyncHandler(async (req, res) => {
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

router.get('/api/ledger', gameLimiter, asyncHandler(async (req, res) => {
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

router.get('/api/state', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  res.json({ agents: stage.getAllAgents(), nodes: stage.getAllLocations() });
}));

// Reset a session (clears all simulation state for this sessionId).
// When running with disk persistence a timestamped backup is written first.
router.post('/api/reset', gameLimiter, asyncHandler(async (req, res) => {
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
router.get('/api/ledger/fountain', gameLimiter, asyncHandler(async (req, res) => {
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
router.post('/api/simulate-to-fountain', gameLimiter, asyncHandler(async (req, res) => {
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
router.get('/api/simulation/illusion-state', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  res.json(stage.getIllusionState());
}));

// ── Causal-Epistemic Spine endpoints ──────────────────────────────────────

// All beat traces (narrative beats with causal chains)
router.get('/api/beat-traces', gameLimiter, asyncHandler(async (req, res) => {
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
router.get('/api/dramatic-pressure/:charId', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const charId = req.params.charId?.substring(0, 128);
  if (!charId) { res.status(400).json({ error: 'charId is required' }); return; }
  res.json(stage.getActivePressures(charId));
}));

// All belief edges (contradiction graph)
router.get('/api/belief-edges', gameLimiter, asyncHandler(async (req, res) => {
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
router.get('/api/goal-mutations/:charId', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const charId = req.params.charId?.substring(0, 128);
  if (!charId) { res.status(400).json({ error: 'charId is required' }); return; }
  res.json(stage.getGoalMutations(charId));
}));

// All goal mutations across all agents
router.get('/api/goal-mutations', gameLimiter, asyncHandler(async (req, res) => {
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
router.get('/api/dramatic-pressure-all', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  res.json(stage.getAllActivePressures());
}));

// Persuasion log for one agent
router.get('/api/persuasion/:charId', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const charId = req.params.charId?.substring(0, 128);
  if (!charId) { res.status(400).json({ error: 'charId is required' }); return; }
  res.json(stage.getPersuasionLog(charId, 20));
}));

// QBN choice filtering — filter by accumulated qualities AND consequenceScope ceiling
router.post('/api/qbn/filter-choices', gameLimiter, asyncHandler(async (req, res) => {
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
router.post('/api/ncp-storyform', gameLimiter, asyncHandler(async (req, res) => {
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
