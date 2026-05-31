import express from 'express';
import { Type } from '@google/genai';
import { generateContent, modelForTask, getImageProvider, getTTSProvider } from '../engine/ai.ts';
import { logger } from '../lib/logger.ts';
import { sanitizeForPrompt } from '../lib/prompt-utils.ts';
import { instantiatePreset, STRUCTURE_NAMES, ARC_TENSION_CURVES, STYLE_MODIFIERS } from '../lib/structure-presets.ts';
import {
  asyncHandler, requireString, safeJsonParse, sessionId, getOrCreateSession,
  gameLimiter, aiLimiter, sessions,
} from '../lib/session-store.ts';
import { buildStoryBibleSummary } from '../nvm/bible/index.ts';
import { listPersonas, getPersona, registerUserPersona, personaPromptBlock } from '../personas/registry.ts';
import type { DirectorStyle, StoryStructure } from '../engine/types.ts';

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

const router = express.Router();
export default router;

// ── ScriptIDE persistence routes (H2) ────────────────────────────────────────
router.post('/api/scriptide/save', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const body = req.body as {
    scriptText?: unknown;
    snapshots?: unknown;
    characters?: unknown;
    researchNotes?: unknown;
    isDarkMode?: unknown;
  };
  const scriptText     = typeof body.scriptText     === 'string' ? body.scriptText.substring(0, 500_000) : '';
  const snapshots      = Array.isArray(body.snapshots)     ? body.snapshots.slice(0, 20)  : [];
  const characters     = Array.isArray(body.characters)    ? body.characters.slice(0, 100) : [];
  const researchNotes  = Array.isArray(body.researchNotes) ? body.researchNotes.slice(0, 200) : [];
  const isDarkMode     = body.isDarkMode === true;
  stage.saveScriptIDEState(sessionId(req), { scriptText, snapshots, characters, researchNotes, isDarkMode });
  res.json({ status: 'saved', updatedAt: Date.now() });
}));

router.get('/api/scriptide/load', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const saved = stage.loadScriptIDEState(sessionId(req));
  if (!saved) {
    res.json({ status: 'empty', scriptText: '', snapshots: [], characters: [], researchNotes: [], isDarkMode: false, updatedAt: null });
    return;
  }
  res.json({ status: 'ok', ...saved });
}));

// ── P1: Inline AI copilot — FIM completion stream ──────────────────────────
router.get('/api/scriptide/complete', aiLimiter, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  let disconnected = false;
  let ended = false;
  req.on('close', () => { disconnected = true; });
  req.on('error', () => { disconnected = true; });
  const emitSSE = (data: unknown) => {
    if (!disconnected && !ended) res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  const ensureEnded = () => { if (!ended) { ended = true; res.end(); } };

  try {
    const q = req.query as Record<string, string>;
    const rawPrefix    = typeof q['prefix']       === 'string' ? q['prefix']       : '';
    const rawSuffix    = typeof q['suffix']       === 'string' ? q['suffix']       : '';
    const dirStyle     = typeof q['directorStyle'] === 'string' ? q['directorStyle'] : '';
    const genre        = typeof q['genre']        === 'string' ? q['genre']        : '';
    const charNames    = typeof q['characters']   === 'string'
      ? q['characters'].split(',').filter(Boolean).slice(0, 30)
      : [];
    const personaId    = typeof q['persona']      === 'string' ? q['persona']      : '';

    if (rawPrefix.length < 10) {
      emitSSE({ type: 'done' });
      ensureEnded();
      return;
    }

    // P9: resolve the active copilot persona (custom voice / genre specialist).
    // The persona's preamble replaces the generic lead-in and its sampling knobs
    // override the route defaults.
    const persona = getPersona(personaId);
    const personaLead = persona ? personaPromptBlock(persona) : 'You are an expert screenplay writer. Continue the Fountain-format screenplay from where the cursor is.';

    // Sanitize all user-controlled strings before embedding in the prompt (C1)
    const prefix  = sanitizeForPrompt(rawPrefix,  4000);
    const suffix  = sanitizeForPrompt(rawSuffix,  1000);
    const stylePreamble = dirStyle ? `DIRECTOR STYLE: ${sanitizeForPrompt(dirStyle, 150)}\n` : '';
    const genrePreamble = genre    ? `GENRE: ${sanitizeForPrompt(genre, 80)}\n`              : '';
    const charPreamble  = charNames.length > 0
      ? `CHARACTERS ESTABLISHED IN SCRIPT: ${charNames.map(n => sanitizeForPrompt(n, 64)).join(', ')}\n`
      : '';

    // Grab story bible from the session if available — provides accumulated context
    const sessionData = sessions.get(sessionId(req));
    const bibleBlock = (() => {
      const b = sessionData ? buildStoryBibleSummary(sessionData.stage) : '';
      return b ? `\nSTORY BIBLE (maintain consistency):\n${b}\n` : '';
    })();

    // FIM (Fill-In-the-Middle) prompt structure: prefix + completion marker + suffix.
    const prompt = `${personaLead} Write ONLY the continuation text that belongs between the prefix and suffix — no explanations, no markdown, no preamble.

${stylePreamble}${genrePreamble}${charPreamble}${bibleBlock}
RULES:
- Output valid Fountain syntax only (scene headings, action, character cues, dialogue, parentheticals)
- Match the voice, tone, and register of the existing text precisely
- The continuation must fit naturally between the PREFIX and SUFFIX — do not repeat or contradict either
- Maximum 3 sentences / 2 action lines / 1 dialogue exchange — keep completions short and targeted
- Never break mid-word unless the prefix already does

=== PREFIX (text before cursor) ===
${prefix}
=== CURSOR POSITION (insert your continuation here) ===
=== SUFFIX (text after cursor — your output must connect to this) ===
${suffix || '(end of document)'}
=== OUTPUT ONLY THE CONTINUATION TEXT — NO PREFIX, NO SUFFIX, NO PREAMBLE ===`;

    const { generateContentStream, modelForTask: mft } = await import('../engine/ai.ts');

    // Stream tokens via the provider abstraction (testable + metered).
    // Persona sampling knobs override the route defaults when present.
    const stream = await generateContentStream({
      model: mft('GHOST_TEXT'),
      contents: prompt,
      config: {
        maxOutputTokens: persona?.maxOutputTokens ?? 256,
        temperature: persona?.temperature ?? 0.85,
      },
    }, { label: 'scriptide-complete' });

    let hasTokens = false;
    for await (const chunk of stream) {
      if (disconnected) break;
      const token = chunk.text ?? '';
      if (token) {
        hasTokens = true;
        emitSSE({ type: 'token', token });
      }
    }

    if (!hasTokens) emitSSE({ type: 'token', token: '' });
    emitSSE({ type: 'done' });
  } catch (err) {
    emitSSE({ type: 'error', message: (err as Error).message ?? 'completion_failed' });
  } finally {
    ensureEnded();
  }
});

// ── Copilot persona routes (P9) ─────────────────────────────────────────────
// GET /api/scriptide/personas — list available copilot personas for the picker.
router.get('/api/scriptide/personas', gameLimiter, asyncHandler(async (_req, res) => {
  res.json({ personas: listPersonas() });
}));

// POST /api/scriptide/personas — register a custom (user-uploaded) persona.
// Body: a CopilotPersona JSON object. Returns the normalized persona, or 400.
router.post('/api/scriptide/personas', gameLimiter, asyncHandler(async (req, res) => {
  const persona = registerUserPersona(req.body);
  if (!persona) {
    res.status(400).json({ error: 'Invalid persona: requires id (kebab-case), name, and systemPreamble.' });
    return;
  }
  logger.info('persona_registered', { id: persona.id });
  res.json({ persona });
}));

// ── ScriptIDE AI routes ────────────────────────────────────────────────────
// Optional script context — the current editor contents, capped, so AI
// suggestions stay consistent with established tone, characters, and facts.
const scriptContextOf = (body: unknown): string => {
  const ctx = (body as Record<string, unknown> | undefined)?.scriptContext;
  return typeof ctx === 'string' ? sanitizeForPrompt(ctx, 8000) : '';
};

// Lenient character-profile sanitizer for endpoints where profiles are
// optional context (not the primary input).
const sanitizeProfiles = (raw: unknown): Array<Record<string, string>> => {
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[]).slice(0, 20).map((p) => {
    if (typeof p !== 'object' || p === null) return { name: '', ghost: '', lie: '', want: '', need: '' };
    const prof = p as Record<string, unknown>;
    const s = (v: unknown, max = 1000) => (typeof v === 'string' ? sanitizeForPrompt(v, max) : '');
    return { name: s(prof.name, 256), ghost: s(prof.ghost), lie: s(prof.lie), want: s(prof.want), need: s(prof.need) };
  }).filter((p) => p.name);
};

// Renders profiles as a compact prompt block for continuity-aware generation.
const profilesBlock = (profiles: Array<Record<string, string>>): string =>
  profiles.length > 0
    ? `\nCHARACTERS (keep every depiction consistent with these profiles — never contradict a want, lie, or wound):\n${profiles.map(p => `- ${p.name}: wants "${p.want || '?'}"; clings to the false belief "${p.lie || '?'}"; wounded by "${p.ghost || '?'}"`).join('\n')}\n`
    : '';

router.post('/api/scriptide/world-build', aiLimiter, asyncHandler(async (req, res) => {
  const beat = requireString(req.body?.beat, 'beat');
  const scriptContext = scriptContextOf(req.body);
  const contextBlock = scriptContext
    ? `\nEXISTING SCRIPT (for continuity — match the established tone, characters, locations, and facts; do not contradict them):\n${scriptContext}\n`
    : '';
  const wbProfiles = profilesBlock(sanitizeProfiles(req.body?.profiles));
  const bibleBlock = (() => {
    const s = sessions.get(sessionId(req));
    const b = s ? buildStoryBibleSummary(s.stage) : '';
    return b ? `\n${b}\n` : '';
  })();
  const response = await generateContent({
    model: modelForTask('WORLDBUILD'),
    contents: `SYSTEM ROLE: You are a master screenwriter and world-builder. Your task is to generate or expand a scene based on the user's beat outline.

OBJECTIVE: Write visceral, evocative action lines and scene descriptions that establish mood, time, and place.

STRICT CONSTRAINTS:
1. FORMAT: Output strictly in Fountain syntax.
2. NO CAMERA DIRECTIONS: You are strictly forbidden from using camera terminology (e.g., "We see", "Pan to", "Close up", "Wide shot", "Angle on"). Describe the environment and the action as it happens in the world, not through a lens.
3. SENSORY WRITING: Focus on lighting, sound, texture, and kinetic movement. Use active verbs. Avoid "is/are" where possible.
4. ECONOMY: Keep action blocks to 4 lines maximum. Break up text to control the reader's pacing.
${contextBlock}${bibleBlock}${wbProfiles}
INPUT: ${sanitizeForPrompt(beat, 8000)}
OUTPUT: Generate the Scene Heading and Action lines.`,
  }, { label: 'world-build', timeoutMs: 30_000 });
  res.json({ result: response.text ?? '' });
}));

router.post('/api/scriptide/refine-dialogue', aiLimiter, asyncHandler(async (req, res) => {
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
      return {
        name:  sanitizeForPrompt(typeof prof.name  === 'string' ? prof.name  : '', 256),
        ghost: sanitizeForPrompt(typeof prof.ghost === 'string' ? prof.ghost : '', 1000),
        lie:   sanitizeForPrompt(typeof prof.lie   === 'string' ? prof.lie   : '', 1000),
        want:  sanitizeForPrompt(typeof prof.want  === 'string' ? prof.want  : '', 1000),
        need:  sanitizeForPrompt(typeof prof.need  === 'string' ? prof.need  : '', 1000),
      };
    });
  }

  const dlgContext = scriptContextOf(req.body);
  const dlgContextBlock = dlgContext
    ? `\nSURROUNDING SCRIPT (preserve each character's established voice and the scene's continuity):\n${dlgContext}\n`
    : '';
  const dlgBibleBlock = (() => {
    const s = sessions.get(sessionId(req));
    const b = s ? buildStoryBibleSummary(s.stage) : '';
    return b ? `\n${b}\n` : '';
  })();
  const response = await generateContent({
    model: modelForTask('DIALOGUE'),
    contents: `SYSTEM ROLE: You are an expert dialogue doctor, specializing in subtext, character voice, and dramatic irony.

OBJECTIVE: Analyze the provided dialogue and rewrite it to remove "on-the-nose" exposition.

INSTRUCTIONS:
1. Identify the 'Want' and the 'Obstacle' in the scene.
2. Rewrite the dialogue so the characters are fighting for their 'Want' indirectly.
3. Differentiate voices based on provided psychological profiles.
4. Add brief, behavior-revealing parentheticals only if absolutely necessary.
${dlgContextBlock}${dlgBibleBlock}
INPUT DIALOGUE: ${sanitizeForPrompt(dialogue, 8000)}
CHARACTER PROFILES: ${JSON.stringify(profiles)}
OUTPUT: Provide 2 alternative versions of the dialogue exchange, explaining the subtextual strategy used in each.`,
  }, { label: 'refine-dialogue', timeoutMs: 30_000 });
  res.json({ result: response.text ?? '' });
}));

router.post('/api/scriptide/analyze-tension', aiLimiter, asyncHandler(async (req, res) => {
  const scene = requireString(req.body?.scene, 'scene');
  const tnContext = scriptContextOf(req.body);
  const tnContextBlock = tnContext
    ? `\nSURROUNDING SCRIPT (consider how tension carries over from adjacent scenes):\n${tnContext}\n`
    : '';
  const tnProfiles = profilesBlock(sanitizeProfiles(req.body?.profiles));
  const tnBibleBlock = (() => {
    const s = sessions.get(sessionId(req));
    const b = s ? buildStoryBibleSummary(s.stage) : '';
    return b ? `\n${b}\n` : '';
  })();
  const response = await generateContent({
    model: modelForTask('ANALYSIS'),
    contents: `SYSTEM ROLE: You are a structural script consultant influenced by Hitchcock's theory of suspense.

OBJECTIVE: Analyze the provided scene and identify opportunities to heighten psychological stakes.

ANALYSIS CRITERIA:
1. Information Asymmetry: Who knows more? Suggest a way to give the audience a piece of information the characters lack.
2. The Ticking Clock: Is there a time constraint? If not, suggest a micro-deadline.
3. The Dilemma: Are the choices too easy? Propose a "best bad choice" scenario.
4. Pacing: Suggest where to slow down to build dread, or speed up to simulate panic.
${tnContextBlock}${tnBibleBlock}${tnProfiles}
INPUT SCENE: ${sanitizeForPrompt(scene, 8000)}
OUTPUT: A bulleted diagnostic report with 3 actionable suggestions. Where a character's want, lie, or wound is relevant, ground the suggestion in it.`,
  }, { label: 'analyze-tension', timeoutMs: 30_000 });
  res.json({ result: response.text ?? '' });
}));

router.post('/api/scriptide/clean-action', aiLimiter, asyncHandler(async (req, res) => {
  const text = requireString(req.body?.text, 'text');
  const caSession = sessions.get(sessionId(req));
  const caGenre = caSession?.stage.getIllusionState().story_genre;
  const caGenreHint = caGenre ? `\nGENRE: ${sanitizeForPrompt(caGenre, 80)} — match the established tone when choosing action verbs.\n` : '';
  const response = await generateContent({
    model: modelForTask('ACTION'),
    contents: `SYSTEM ROLE: You are a strict script editor enforcing a "Semantic Firewall".
OBJECTIVE: Rewrite the following action block — remove all camera directions and technical jargon. Describe what happens in the world, not what the camera does.
${caGenreHint}
INPUT: ${sanitizeForPrompt(text, 8000)}
OUTPUT: Just the rewritten action text, nothing else.`,
  }, { label: 'clean-action', timeoutMs: 30_000 });
  res.json({ result: response.text ?? '' });
}));

router.post('/api/scriptide/character-profile', aiLimiter, asyncHandler(async (req, res) => {
  const profile = req.body?.profile;
  if (!profile || typeof profile !== 'object') {
    res.status(400).json({ error: 'profile is required' });
    return;
  }
  const name  = sanitizeForPrompt(requireString(profile.name,  'profile.name', 256), 256);
  const ghost = sanitizeForPrompt(requireString(profile.ghost, 'profile.ghost'), 1000);
  const lie   = sanitizeForPrompt(requireString(profile.lie,   'profile.lie'), 1000);
  const want  = sanitizeForPrompt(requireString(profile.want,  'profile.want'), 1000);
  const need  = sanitizeForPrompt(requireString(profile.need,  'profile.need'), 1000);

  const cpBibleBlock = (() => {
    const s = sessions.get(sessionId(req));
    const b = s ? buildStoryBibleSummary(s.stage) : '';
    return b ? `\nSTORY CONTEXT (arc and world the character lives in — let it inflect the description):\n${b}\n` : '';
  })();

  const response = await generateContent({
    model: modelForTask('CHARACTER'),
    contents: `SYSTEM ROLE: You are a character designer specializing in psychological realism and "Show, Don't Tell".

OBJECTIVE: Generate a visceral physical description of a character based on their psychological profile. Reflect internal state through external details.

INSTRUCTIONS:
1. DO NOT mention the Ghost, Lie, Want, or Need directly.
2. Focus on: Posture, micro-expressions, clothing wear-and-tear, grooming habits, and how they occupy space.
3. Use sensory details.
4. Keep it to 2-3 evocative paragraphs.
${cpBibleBlock}
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
router.post('/api/analyze-script', aiLimiter, asyncHandler(async (req, res) => {
  const scriptText = requireString(req.body?.scriptText, 'scriptText');
  const engineState = req.body?.engineState ?? {};
  const storyConfig = engineState?.config as Record<string, unknown> ?? {};
  const characters = Array.isArray(req.body?.characters) ? (req.body.characters as unknown[]).slice(0, 20) : [];
  const visualAnchor = typeof engineState?.protagonist?.visualAnchor === 'string'
    ? sanitizeForPrompt(engineState.protagonist.visualAnchor, 500) : '';

  // ── Active Codex RAG: inject known facts for consistency ──
  const activeCodexEntries = Array.isArray(engineState?.directorState?.activeCodexEntries)
    ? (engineState.directorState.activeCodexEntries as Array<Record<string, string>>).slice(0, 5) : [];
  const codexBlock = activeCodexEntries.length > 0
    ? `\n\nRAG MEMORY (active codex — ensure scene is consistent with these facts):\n${activeCodexEntries.map(e => `- [${sanitizeForPrompt(e.title ?? '', 256)}]: ${sanitizeForPrompt(e.content ?? '', 500)}`).join('\n')}`
    : '';

  // ── Information Position bias from previous scene ──
  const prevInfoPos = typeof engineState?.currentAnalysis?.informationPosition === 'string'
    ? sanitizeForPrompt(engineState.currentAnalysis.informationPosition, 128) : null;
  const infoPosBias = prevInfoPos
    ? `\nPrevious scene information position was "${prevInfoPos}". Consider how this asymmetry should evolve.`
    : '';

  // ── Throughline context ──
  const tl = engineState?.directorState?.throughlines as Record<string, unknown> | undefined;
  const activeTl = Array.isArray(tl?.activeThroughlines) && tl.activeThroughlines.length > 0
    ? `\nACTIVE THROUGHLINES: ${(tl.activeThroughlines as string[]).map(t => sanitizeForPrompt(t, 128)).join(', ')}. Objective: "${sanitizeForPrompt(String(tl.objectiveStory ?? ''), 512)}". Relationship: "${sanitizeForPrompt(String(tl.relationshipStory ?? ''), 512)}".`
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
${sanitizeForPrompt(scriptText, 8000)}

Provide a detailed SceneAnalysis and updated DirectorState.
Include cinematic composition, narrative metrics, director commentary, and quality validation.
Extract the most impactful line of dialogue for TTS (audioDialogue) and a highly detailed imagePrompt for storyboard generation.
Validate dialogue against character profiles and flag inconsistencies in dialogueInconsistencies.
Identify whether any comedy misdirection technique is active (clue_delivery, false_safety, desensitization, or none).
Ensure throughline commentary addresses all active throughlines listed above.
${structure ? `structuralNode must name a specific beat from the ${structure} structure (e.g. "Catalyst", "Midpoint", "Ten — Twist").` : ''}
${dirStyle ? `Cinematic composition and commentary must be filtered through the ${dirStyle} style.` : ''}`;

  const analysisResponse = await generateContent({
    model: modelForTask('ANALYSIS'),
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
    getImageProvider().generate(imagePromptText).catch((e: Error) => {
      logger.warn('image_generation_failed', { error: e.message });
      return undefined;
    }),
    getTTSProvider().speak(audioText).catch((e: Error) => {
      logger.warn('tts_generation_failed', { error: e.message });
      return undefined;
    }),
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

// ── Character memory export / import (P6) ─────────────────────────────────────
router.post('/api/characters/export', gameLimiter, asyncHandler(async (req, res) => {
  const { exportCharacter } = await import('../engine/character-memory.ts');
  const charId = req.body?.charId;
  if (typeof charId !== 'string' || !charId.trim()) {
    res.status(400).json({ error: 'body.charId (string) is required' });
    return;
  }
  const sid = sessionId(req);
  const { stage } = getOrCreateSession(sid);
  const bundle = exportCharacter(stage, charId, sid);
  if (!bundle) {
    res.status(404).json({ error: `character "${charId}" not found in this session` });
    return;
  }
  res.json(bundle);
}));

router.post('/api/characters/import', gameLimiter, asyncHandler(async (req, res) => {
  const { importCharacter, isCharacterMemoryBundle } = await import('../engine/character-memory.ts');
  const bundle = req.body?.bundle;
  if (!isCharacterMemoryBundle(bundle)) {
    res.status(400).json({ error: 'body.bundle is not a valid CharacterMemoryBundle' });
    return;
  }
  const targetLocationId = typeof req.body?.targetLocationId === 'string'
    ? req.body.targetLocationId : undefined;
  const { stage } = getOrCreateSession(sessionId(req));
  try {
    const result = importCharacter(stage, bundle, targetLocationId);
    res.json({ status: 'imported', ...result });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}));
