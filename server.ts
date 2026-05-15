import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { rateLimit } from 'express-rate-limit';
import { Stage } from './server/engine/Stage.ts';
import { Orchestrator } from './server/engine/Orchestrator.ts';
import type { CharacterSheet, Location } from './server/engine/types.ts';

const asyncHandler = (fn: express.RequestHandler): express.RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

const requireString = (val: unknown, name: string, maxLen = 20_000): string => {
  if (typeof val !== 'string' || val.trim() === '') throw new Error(`${name} is required`);
  if (val.length > maxLen) throw new Error(`${name} exceeds maximum length`);
  return val;
};

const aiLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '1mb' }));

  const stage = new Stage(':memory:');
  const orchestrator = new Orchestrator(stage);

  // Story Machine routes
  app.post('/api/init', asyncHandler(async (req, res) => {
    const { nodes, agents } = req.body;
    if (nodes && Array.isArray(nodes)) nodes.forEach((n: Location) => orchestrator.registerNode(n));
    if (agents && Array.isArray(agents)) agents.forEach((a: CharacterSheet) => orchestrator.registerAgent(a));
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
    res.json({
      agents: stage.getAllAgents(),
      nodes: stage.getAllLocations()
    });
  }));

  // ScriptIDE AI routes — rate-limited
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  app.post('/api/scriptide/world-build', aiLimiter, asyncHandler(async (req, res) => {
    const beat = requireString(req.body?.beat, 'beat');
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
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
    const profiles = req.body?.profiles;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: `SYSTEM ROLE: You are an expert dialogue doctor, specializing in subtext, character voice, and dramatic irony.

OBJECTIVE: Analyze the provided dialogue and rewrite it to remove "on-the-nose" exposition. Characters rarely say exactly what they mean; they speak around their desires, use deflection, or weaponize their words.

INSTRUCTIONS:
1. Identify the 'Want' and the 'Obstacle' in the scene.
2. Rewrite the dialogue so the characters are fighting for their 'Want' indirectly.
3. Differentiate voices: Ensure Character A sounds distinct from Character B based on their provided psychological profiles (e.g., one uses short, clipped sentences; the other uses passive-aggressive questions).
4. Add brief, behavior-revealing parentheticals only if absolutely necessary to contradict the spoken text.

INPUT DIALOGUE: ${dialogue}
CHARACTER PROFILES: ${JSON.stringify(profiles ?? [])}
OUTPUT: Provide 2 alternative versions of the dialogue exchange, explaining the subtextual strategy used in each.`,
    });
    res.json({ result: response.text });
  }));

  app.post('/api/scriptide/analyze-tension', aiLimiter, asyncHandler(async (req, res) => {
    const scene = requireString(req.body?.scene, 'scene');
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: `SYSTEM ROLE: You are a structural script consultant heavily influenced by Alfred Hitchcock's theory of suspense and modern thriller pacing.

OBJECTIVE: Analyze the provided scene or sequence and identify opportunities to heighten psychological stakes, dread, or anticipation.

ANALYSIS CRITERIA:
1. Information Asymmetry: Who knows more? The audience, Character A, or Character B? Suggest a way to give the audience a piece of information the characters lack (the "bomb under the table").
2. The Ticking Clock: Is there a time constraint? If not, suggest a micro-deadline for the scene.
3. The Dilemma: Are the choices too easy? Propose a "best bad choice" scenario for the protagonist.
4. Pacing: Look at the ratio of action to dialogue. Suggest where to slow down to build dread, or speed up to simulate panic.

INPUT SCENE: ${scene}
OUTPUT: A bulleted diagnostic report with 3 actionable, specific suggestions to rewrite the scene for maximum tension.`,
    });
    res.json({ result: response.text });
  }));

  app.post('/api/scriptide/clean-action', aiLimiter, asyncHandler(async (req, res) => {
    const text = requireString(req.body?.text, 'text');
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: `SYSTEM ROLE: You are a strict script editor enforcing a "Semantic Firewall".
OBJECTIVE: The following action block contains forbidden camera directions or technical jargon (e.g., "We see", "Pan to", "Close up").
Rewrite it into pure, visceral environmental action. Describe what is happening in the world, not what the camera is doing. Remove any mention of the audience or the lens.

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
    const name = requireString(profile.name, 'profile.name', 256);
    const ghost = requireString(profile.ghost, 'profile.ghost');
    const lie = requireString(profile.lie, 'profile.lie');
    const want = requireString(profile.want, 'profile.want');
    const need = requireString(profile.need, 'profile.need');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: `SYSTEM ROLE: You are a character designer and novelist specializing in psychological realism and "Show, Don't Tell" characterization.

OBJECTIVE: Generate a visceral, detailed physical description of a character based on their psychological profile (Ghost, Lie, Want, Need). The description should reflect their internal state through external details.

INSTRUCTIONS:
1. DO NOT mention the Ghost, Lie, Want, or Need directly.
2. Focus on: Posture, micro-expressions, clothing wear-and-tear, grooming habits, and how they occupy space.
3. Use sensory details: The smell of their tobacco, the sound of their heavy tread, the way they avoid eye contact.
4. The description should feel like a "Visual Anchor" for a director or actor.
5. Keep it to 2-3 evocative paragraphs.

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

  // Proxy route for frontend AI analysis (keeps API key server-side)
  app.post('/api/analyze-script', aiLimiter, asyncHandler(async (req, res) => {
    const { engineState, scriptText, characters } = req.body;
    if (!scriptText || typeof scriptText !== 'string') {
      res.status(400).json({ error: 'scriptText is required' });
      return;
    }
    // Forward to the analyzeScriptBlock logic via Gemini
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: `Analyze this screenplay script and return a JSON object with fields: structuralNode, tensionLevel, menaceGauge.
Script:
${scriptText.substring(0, 8000)}`,
      config: { responseMimeType: 'application/json' }
    });
    res.json({ result: response.text });
  }));

  // Global error handler
  app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Server Error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
