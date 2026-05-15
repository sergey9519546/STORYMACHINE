import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { GoogleGenAI, Type, Modality } from '@google/genai';
import { rateLimit } from 'express-rate-limit';
import { Stage } from './server/engine/Stage.ts';
import { Orchestrator } from './server/engine/Orchestrator.ts';
import type { CharacterSheet, Location } from './server/engine/types.ts';
import { transcriptToFountain, extractCharactersFromLog } from './server/lib/fountain.ts';

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

// ── Helpers ───────────────────────────────────────────────────────────────────
const asyncHandler = (fn: express.RequestHandler): express.RequestHandler =>
  (req, res, next) => { Promise.resolve(fn(req, res, next)).catch(next); };

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
    const response = await ai.models.generateContent({
      model: GEMINI_IMG_MODEL,
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: '16:9' } },
    });
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
    const response = await ai.models.generateContent({
      model: GEMINI_TTS_MODEL,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
      },
    });
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
        informationPosition: { type: Type.STRING },
        audioDialogue:       { type: Type.STRING },
        imagePrompt:         { type: Type.STRING },
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
                 'informationPosition', 'audioDialogue', 'imagePrompt'],
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

// ── Server ────────────────────────────────────────────────────────────────────
async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  const stage = new Stage(':memory:');
  const orchestrator = new Orchestrator(stage);
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  // ── Story Machine routes (game simulation) ─────────────────────────────────
  app.use('/api/init',     gameLimiter);
  app.use('/api/turn',     gameLimiter);
  app.use('/api/run-room', gameLimiter);
  app.use('/api/ledger',   gameLimiter);
  app.use('/api/state',    gameLimiter);

  app.post('/api/init', asyncHandler(async (req, res) => {
    const { nodes, agents } = req.body;

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
              ? (a.knowledge_vector as unknown[]).filter((k): k is string => typeof k === 'string').slice(0, 100)
              : [],
            suspicion_score: typeof a.suspicion_score === 'number' ? Math.max(0, Math.min(100, a.suspicion_score)) : 0,
            current_location_id: typeof a.current_location_id === 'string' ? a.current_location_id.substring(0, 64) : '',
            is_alive: a.is_alive !== false,
          } as CharacterSheet);
        } catch { /* skip malformed agent */ }
      });
    }

    res.json({ status: 'initialized' });
  }));

  app.post('/api/turn', asyncHandler(async (req, res) => {
    const agentId = requireString(req.body?.agentId, 'agentId', 128);
    const action = await orchestrator.runTurn(agentId);
    res.json({ action });
  }));

  app.post('/api/run-room', asyncHandler(async (req, res) => {
    const nodeId = requireString(req.body?.nodeId, 'nodeId', 128);
    await orchestrator.runRoomSimulation(nodeId);
    res.json({ status: 'completed' });
  }));

  app.get('/api/ledger', asyncHandler(async (req, res) => {
    res.json(stage.getFullLedger());
  }));

  app.get('/api/state', asyncHandler(async (req, res) => {
    res.json({ agents: stage.getAllAgents(), nodes: stage.getAllLocations() });
  }));

  // Export current simulation as a Fountain screenplay draft (with beat traces)
  app.get('/api/ledger/fountain', gameLimiter, asyncHandler(async (req, res) => {
    const log = stage.getFullLedger();
    const agents = stage.getAllAgents();
    const locations = stage.getAllLocations();
    const beatTraces = stage.getAllBeatTraces();
    const fountain = transcriptToFountain(log, agents, locations, undefined, beatTraces);
    const characters = extractCharactersFromLog(agents);
    res.json({ fountain, characters, turnCount: log.length, beatTraceCount: beatTraces.length });
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
    const fountain = transcriptToFountain(log, simAgents, simLocations, {
      title: typeof title === 'string' ? title : 'Story Machine Draft',
      author: typeof author === 'string' ? author : 'STORYMACHINE',
    });
    const characters = extractCharactersFromLog(simAgents);

    res.json({ fountain, characters, turnCount: log.length, agents: simAgents });
  }));

  // Current Setup/Turn/Prestige illusion phase
  app.get('/api/simulation/illusion-state', gameLimiter, asyncHandler(async (req, res) => {
    res.json(stage.getIllusionState());
  }));

  // ── Causal-Epistemic Spine endpoints ──────────────────────────────────────

  // All beat traces (narrative beats with causal chains)
  app.get('/api/beat-traces', gameLimiter, asyncHandler(async (req, res) => {
    res.json(stage.getAllBeatTraces());
  }));

  // Active dramatic pressure on a specific agent (bias signals not yet applied)
  app.get('/api/dramatic-pressure/:charId', gameLimiter, asyncHandler(async (req, res) => {
    const charId = req.params.charId?.substring(0, 128);
    if (!charId) { res.status(400).json({ error: 'charId is required' }); return; }
    res.json(stage.getActivePressures(charId));
  }));

  // All belief edges (contradiction graph)
  app.get('/api/belief-edges', gameLimiter, asyncHandler(async (req, res) => {
    res.json(stage.getAllBeliefEdges());
  }));

  // Goal mutations for a specific agent
  app.get('/api/goal-mutations/:charId', gameLimiter, asyncHandler(async (req, res) => {
    const charId = req.params.charId?.substring(0, 128);
    if (!charId) { res.status(400).json({ error: 'charId is required' }); return; }
    res.json(stage.getGoalMutations(charId));
  }));

  // QBN choice filtering — filter available choices by accumulated qualities
  app.post('/api/qbn/filter-choices', gameLimiter, asyncHandler(async (req, res) => {
    const { choices, qualities } = req.body ?? {};
    if (!Array.isArray(choices)) {
      res.status(400).json({ error: 'choices must be an array' });
      return;
    }
    const q = typeof qualities === 'object' && qualities !== null
      ? (qualities as Record<string, number>) : {};

    const available = (choices as unknown[]).filter((raw) => {
      if (typeof raw !== 'object' || raw === null) return false;
      const c = raw as Record<string, unknown>;
      const reqs = c.qbnRequirements;
      if (!reqs || typeof reqs !== 'object') return true;
      return Object.entries(reqs as Record<string, number>).every(
        ([quality, required]) => (q[quality] ?? 0) >= required,
      );
    });

    res.json({ available, filtered: choices.length - available.length });
  }));

  // ── ScriptIDE AI routes ────────────────────────────────────────────────────
  app.post('/api/scriptide/world-build', aiLimiter, asyncHandler(async (req, res) => {
    const beat = requireString(req.body?.beat, 'beat');
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `SYSTEM ROLE: You are a master screenwriter and world-builder. Your task is to generate or expand a scene based on the user's beat outline.

OBJECTIVE: Write visceral, evocative action lines and scene descriptions that establish mood, time, and place.

STRICT CONSTRAINTS:
1. FORMAT: Output strictly in Fountain syntax.
2. NO CAMERA DIRECTIONS: You are strictly forbidden from using camera terminology (e.g., "We see", "Pan to", "Close up", "Wide shot", "Angle on"). Describe the environment and the action as it happens in the world, not through a lens.
3. SENSORY WRITING: Focus on lighting, sound, texture, and kinetic movement. Use active verbs. Avoid "is/are" where possible.
4. ECONOMY: Keep action blocks to 4 lines maximum. Break up text to control the reader's pacing.

INPUT: ${beat}
OUTPUT: Generate the Scene Heading and Action lines.`,
    });
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

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `SYSTEM ROLE: You are an expert dialogue doctor, specializing in subtext, character voice, and dramatic irony.

OBJECTIVE: Analyze the provided dialogue and rewrite it to remove "on-the-nose" exposition.

INSTRUCTIONS:
1. Identify the 'Want' and the 'Obstacle' in the scene.
2. Rewrite the dialogue so the characters are fighting for their 'Want' indirectly.
3. Differentiate voices based on provided psychological profiles.
4. Add brief, behavior-revealing parentheticals only if absolutely necessary.

INPUT DIALOGUE: ${dialogue}
CHARACTER PROFILES: ${JSON.stringify(profiles)}
OUTPUT: Provide 2 alternative versions of the dialogue exchange, explaining the subtextual strategy used in each.`,
    });
    res.json({ result: response.text });
  }));

  app.post('/api/scriptide/analyze-tension', aiLimiter, asyncHandler(async (req, res) => {
    const scene = requireString(req.body?.scene, 'scene');
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `SYSTEM ROLE: You are a structural script consultant influenced by Hitchcock's theory of suspense.

OBJECTIVE: Analyze the provided scene and identify opportunities to heighten psychological stakes.

ANALYSIS CRITERIA:
1. Information Asymmetry: Who knows more? Suggest a way to give the audience a piece of information the characters lack.
2. The Ticking Clock: Is there a time constraint? If not, suggest a micro-deadline.
3. The Dilemma: Are the choices too easy? Propose a "best bad choice" scenario.
4. Pacing: Suggest where to slow down to build dread, or speed up to simulate panic.

INPUT SCENE: ${scene}
OUTPUT: A bulleted diagnostic report with 3 actionable suggestions.`,
    });
    res.json({ result: response.text });
  }));

  app.post('/api/scriptide/clean-action', aiLimiter, asyncHandler(async (req, res) => {
    const text = requireString(req.body?.text, 'text');
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `SYSTEM ROLE: You are a strict script editor enforcing a "Semantic Firewall".
OBJECTIVE: Rewrite the following action block — remove all camera directions and technical jargon. Describe what happens in the world, not what the camera does.

INPUT: ${text}
OUTPUT: Just the rewritten action text, nothing else.`,
    });
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

    const response = await ai.models.generateContent({
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
    });
    res.json({ result: response.text });
  }));

  // ── Comprehensive script analysis (replaces frontend director.ts AI calls) ──
  app.post('/api/analyze-script', aiLimiter, asyncHandler(async (req, res) => {
    const scriptText = requireString(req.body?.scriptText, 'scriptText');
    const engineState = req.body?.engineState ?? {};
    const characters = Array.isArray(req.body?.characters) ? (req.body.characters as unknown[]).slice(0, 20) : [];
    const visualAnchor = typeof engineState?.protagonist?.visualAnchor === 'string'
      ? engineState.protagonist.visualAnchor.substring(0, 500) : '';

    const prompt = `Analyze the following screenplay script.
Current Director State: ${JSON.stringify(engineState?.directorState ?? {}).substring(0, 5000)}
Characters Profile: ${JSON.stringify(characters).substring(0, 2000)}

Script Text:
${scriptText.substring(0, 8000)}

Provide a detailed SceneAnalysis and updated DirectorState.
Include cinematic composition, narrative metrics, director commentary, and quality validation.
Extract the most impactful line of dialogue for TTS (audioDialogue) and a highly detailed imagePrompt for storyboard generation.
Validate dialogue against character profiles and flag inconsistencies in dialogueInconsistencies.`;

    const analysisResponse = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: 'You are the AI Director, a strict narrative dungeon master enforcing psychological and structural rules of screenwriting.',
        responseMimeType: 'application/json',
        responseSchema: AnalyzeScriptSchema,
      },
    });

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

    res.json({
      sceneAnalysis: { ...analysisData.sceneAnalysis, imageUrl, audioUrl },
      updatedDirectorState: analysisData.updatedDirectorState,
    });
  }));

  // ── Global error handler ───────────────────────────────────────────────────
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Server Error:', err.message);
    const message = process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message;
    res.status(500).json({ error: message });
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
