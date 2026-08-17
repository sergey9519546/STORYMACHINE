import express from 'express';
import { Type } from '@google/genai';
import { generateContent, modelForTask, getImageProvider, getTTSProvider } from '../engine/ai.ts';
import { llmReady } from '../lib/ai-config.ts';
import { isWholeDraftAnalysisComplete } from '../lib/analysis-completeness.ts';
import { logger } from '../lib/logger.ts';
import { sanitizeForPrompt } from '../lib/prompt-utils.ts';
import { instantiatePreset, STRUCTURE_NAMES, ARC_TENSION_CURVES, STYLE_MODIFIERS } from '../lib/structure-presets.ts';
import { composePromptModifiers } from '../lib/genre-router.ts';
import { buildCraftPromptSection, looksLikeAnimationGenre } from '../nvm/generate/craft-spec.ts';
import {
  asyncHandler, requireString, safeJsonParse, sessionId, getOrCreateSession,
  withSessionCommand, gameLimiter, aiLimiter, heavyBodyLimiter, sessions,
} from '../lib/session-store.ts';
import { buildStoryBibleSummary } from '../nvm/bible/index.ts';
import { getPrompt } from '../lib/prompts.ts';
import {
  validate, DoctorBodySchema, DeepDoctorBodySchema, DiagnoseBodySchema, FixBodySchema,
  ScriptideSaveBodySchema, WorldBuildBodySchema, RefineDialogueBodySchema,
  AnalyzeTensionBodySchema, CleanActionBodySchema, CharacterProfileBodySchema, AnalyzeScriptBodySchema,
  CharactersExportBodySchema, CharactersImportBodySchema,
} from '../lib/validation.ts';
import { fdxToFountain } from '../lib/fdx-import.ts';
import { locateIssues } from '../nvm/analyze/locate.ts';
import { clusterIssues } from '../nvm/analyze/cluster.ts';
import type { DirectorStyle, StoryStructure } from '../engine/types.ts';
import type { DoctorSource, LiveDiagnosis, ScriptDoctorReport } from '../nvm/analyze/types.ts';
import { withAiBudget, consumeAiAttempt, isAiBudgetExceededError, aiBudgetEnvNumber, type AiBudgetLimits } from '../lib/ai-budget.ts';
import { sanitizeExternalError } from '../lib/safe-error.ts';

/**
 * An AbortSignal that fires when the CLIENT gives up on this request — used
 * to cancel off-thread Script Doctor work that nobody is waiting for any more
 * (lane W1; see server/nvm/analyze/doctor-pool.ts).
 *
 * Listens on the RESPONSE, not the request. Since Node 16, `req` emits
 * 'close' as soon as the request stream completes — which, for a POST whose
 * body express already parsed, is immediately — so a req-based signal would
 * abort every analysis the instant it started. `res` emits 'close' exactly
 * once, either after a completed response (writableEnded true, nothing to
 * cancel) or on a genuine disconnect (writableEnded false, cancel), which is
 * the distinction that actually matters.
 */
function requestAbortSignal(res: express.Response): AbortSignal {
  const controller = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) controller.abort();
  });
  return controller.signal;
}

// ── AI provider fan-out budgets (2026-08-03 audit, Task 1) ─────────────────
// See server/lib/ai-budget.ts's header for the full design. Every route
// below calling withAiBudget holds no SessionCommandCoordinator command
// (all are asyncHandler, not withSessionCommand — verified against this
// file), so the abandon-on-timeout withAiBudget() primitive is safe to use
// directly everywhere in this file (unlike game.ts's coordinator-tracked
// /api/turn/run-room/run-scene, which need the withDeadline() pattern
// instead — see that file's comments).
//
// world-build/refine-dialogue/analyze-tension/clean-action/character-profile:
// one direct generateContent call each, already at 30s per-attempt timeout.
const SIMPLE_GENERATION_BUDGET: AiBudgetLimits = {
  label: 'scriptide-simple-generation',
  maxAttempts: aiBudgetEnvNumber('AI_BUDGET_SCRIPTIDE_SIMPLE_MAX_ATTEMPTS', 1),
  timeoutMs: aiBudgetEnvNumber('AI_BUDGET_SCRIPTIDE_SIMPLE_TIMEOUT_MS', 45_000),
};

// /api/analyze-script: one analysis call (45s) then image+audio generation
// in parallel (25s/20s) — 3 logical AI operations.
const ANALYZE_SCRIPT_BUDGET: AiBudgetLimits = {
  label: 'analyze-script',
  maxAttempts: aiBudgetEnvNumber('AI_BUDGET_ANALYZE_SCRIPT_MAX_ATTEMPTS', 3),
  timeoutMs: aiBudgetEnvNumber('AI_BUDGET_ANALYZE_SCRIPT_TIMEOUT_MS', 90_000),
};

// /api/scriptide/fix and /api/scriptide/doctor/deep reach the LLM through
// fixAndVerify()/runScriptDoctor() (server/nvm/analyze/**), which has no
// injectable seam from this file — same limitation as game.ts's engine-fan-out
// routes (see server/lib/ai-budget.ts's header). maxAttempts is therefore
// DOCUMENTED/informational; only the deadline is actually enforced.
const FIX_BUDGET: AiBudgetLimits = {
  label: 'scriptide-fix',
  maxAttempts: aiBudgetEnvNumber('AI_BUDGET_SCRIPTIDE_FIX_MAX_ATTEMPTS', 1),
  timeoutMs: aiBudgetEnvNumber('AI_BUDGET_SCRIPTIDE_FIX_TIMEOUT_MS', 45_000),
};

const DOCTOR_DEEP_BUDGET: AiBudgetLimits = {
  label: 'scriptide-doctor-deep',
  // Up to ~10 LLM calls, one per scene (route/module comment above).
  maxAttempts: aiBudgetEnvNumber('AI_BUDGET_SCRIPTIDE_DOCTOR_DEEP_MAX_ATTEMPTS', 10),
  timeoutMs: aiBudgetEnvNumber('AI_BUDGET_SCRIPTIDE_DOCTOR_DEEP_TIMEOUT_MS', 120_000),
};

/** The core keeps health/grade sentinel fields for internal compatibility, but
 * a browser response must never serialize those values as if they were an
 * assessment when the whole draft was not analyzed. Partial issue evidence is
 * still returned and explicitly marked through analysisComplete. */
function publicDoctorReport(report: ScriptDoctorReport): Omit<ScriptDoctorReport, 'health' | 'grade'> | ScriptDoctorReport {
  if (isWholeDraftAnalysisComplete(report)) return report;
  const { health: _health, grade: _grade, ...withoutHeadlineScores } = report;
  return withoutHeadlineScores;
}

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
router.post('/api/scriptide/save', gameLimiter, validate(ScriptideSaveBodySchema), withSessionCommand(async (req, res, session) => {
  const { stage } = session;
  const body = req.body as {
    scriptText?: unknown;
    snapshots?: unknown;
    characters?: unknown;
    researchNotes?: unknown;
    isDarkMode?: unknown;
    expectedUpdatedAt?: number | null;
  };
  const scriptText     = typeof body.scriptText     === 'string' ? body.scriptText.substring(0, 500_000) : '';
  const snapshots      = Array.isArray(body.snapshots)     ? body.snapshots.slice(0, 20)  : [];
  const characters     = Array.isArray(body.characters)    ? body.characters.slice(0, 100) : [];
  const researchNotes  = Array.isArray(body.researchNotes) ? body.researchNotes.slice(0, 200) : [];
  const isDarkMode     = body.isDarkMode === true;
  const result = stage.saveScriptIDEState(
    sessionId(req),
    { scriptText, snapshots, characters, researchNotes, isDarkMode },
    body.expectedUpdatedAt,
  );
  if (result.status === 'conflict') {
    res.status(409).json(result);
    return;
  }
  res.json(result);
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

// ── Script Doctor (bridge half 3) ────────────────────────────────────────────
// POST /api/scriptide/doctor — run the deterministic 14-pass revision-engine
// checkup and return the aggregated ScriptDoctorReport. Two-format contract,
// enforced by DoctorBodySchema (exactly one of the two fields is present):
//   - { fountain }   — raw Fountain text, run through the doctor as-is.
//   - { fdx }        — a Final Draft (.fdx) export. Converted to Fountain via
//                       fdxToFountain() (server/lib/fdx-import.ts) first; a
//                       conversion failure (not valid FDX) or an empty
//                       converted script both short-circuit with a 400 before
//                       the doctor ever runs. fdxToFountain is a small, pure,
//                       dependency-free module, so — unlike doctor.ts below —
//                       it's imported statically rather than dynamically.
// Either way the response is the ScriptDoctorReport plus `source`, set here
// (never by runScriptDoctor itself — see DoctorSource's doc comment) so the
// client knows which format was submitted and, for fdx, can load the
// converted Fountain text and see any non-fatal conversion warnings.
// gameLimiter, NOT aiLimiter: every other analysis route in this file calls an
// LLM and sits behind aiLimiter, but the doctor never does — runScriptDoctor()
// runs the revision pipeline inside runDiagnoseOnly() (server/nvm/revision/
// rewrite.ts), an AsyncLocalStorage-scoped flag that gates every pass's rewrite
// step so no pass can reach the model even if a future pass regresses that
// guard. It's pure CPU work over the request body, so it belongs on the
// higher-throughput gameLimiter like the other stateless/non-AI routes above.
// Stateless by design: no sessionId, no getOrCreateSession/Stage — the doctor
// only needs the script text itself, so nothing here touches `sessions`.
router.post('/api/scriptide/doctor', gameLimiter, validate(DoctorBodySchema), asyncHandler(async (req, res) => {
  const { fountain: fountainBody, fdx } = req.body as { fountain?: string; fdx?: string; title?: string };

  let fountain: string;
  let source: DoctorSource;

  if (fdx !== undefined) {
    let converted: { fountain: string; warnings: string[] };
    try {
      converted = fdxToFountain(fdx);
    } catch (err) {
      // TASK 2 (safe-error): fdxToFountain's parse-error message describes
      // caller-supplied malformed XML — sanitized anyway as defense-in-depth
      // per this module's blanket "every response/logger sink" mandate.
      res.status(400).json({ error: sanitizeExternalError(err).message });
      return;
    }
    if (converted.fountain.trim() === '') {
      res.status(400).json({ error: 'The Final Draft file converted to an empty script — nothing to analyze.' });
      return;
    }
    fountain = converted.fountain;
    source = {
      format: 'fdx',
      convertedFountain: converted.fountain,
      ...(converted.warnings.length > 0 ? { warnings: converted.warnings } : {}),
    };
  } else {
    fountain = fountainBody as string;
    source = { format: 'fountain' };
  }

  // Dynamic import: doctor.ts pulls in the full analyzer + all 14 revision
  // passes, matching this file's convention of lazily loading heavy modules
  // (see the engine/ai.ts and engine/character-memory.ts imports below) so
  // routes that never call the doctor don't pay for it at startup.
  //
  // Lane W1 (2026-08-21): this goes through the worker-thread pool rather
  // than calling runScriptDoctor on the main thread. The doctor is pure CPU
  // with no await points, so an in-process call held the event loop — and
  // therefore every other user's request — for the whole analysis; the
  // 2026-08-14 audit measured 22+ minutes of total server unavailability on
  // one ~350-scene submission. runScriptDoctorOffThread is contract-identical
  // (same report, same LRU cache, same errors) and falls back to in-process
  // execution if workers can't run in this environment — see doctor-pool.ts.
  // The request's own abort signal is threaded through so a client that
  // navigates away actually stops the work instead of merely stopping the
  // wait for it.
  const { runScriptDoctorOffThread } = await import('../nvm/analyze/doctor-pool.ts');
  const report = await runScriptDoctorOffThread(fountain, undefined, {
    signal: requestAbortSignal(res),
  });

  // Root-cause clustering is attached HERE, at the route, rather than inside
  // runScriptDoctor/aggregateReport (doctor.ts) for two reasons: (1) doctor.ts
  // is a fixed contract owned by a parallel agent and out of scope to modify,
  // and (2) locateIssues/clusterIssues need only the report's own `passes`
  // array plus the same raw `fountain` string this route already has in
  // scope — there's no reason to thread them through the aggregation step
  // when a plain object spread does the job afterward. The spread preserves
  // every existing field untouched (including any percentile fields a
  // parallel agent adds to `dimensions`), so this can never regress an
  // existing consumer of the report shape.
  const issuesWithPass = report.passes.flatMap(p => p.issues.map(issue => ({ ...issue, pass: p.pass })));
  const rootCauses = clusterIssues(locateIssues(issuesWithPass, fountain));
  res.json({ ...publicDoctorReport(report), rootCauses, source });
}));

// POST /api/scriptide/doctor/deep — opt-in "deep read" sibling of /doctor
// above. Same two-format body contract (DeepDoctorBodySchema is presently a
// plain alias of DoctorBodySchema — see validation.ts) and the same fdx→
// Fountain conversion path, reused exactly as /doctor does it. The ONE thing
// that changes is what runScriptDoctor is told to do with each scene's
// signals: deep read is generative SENSING, not generative JUDGING — an LLM
// reads each scene's meaning (subtext, stakes, motivation, irony) into the
// same record-signal schema the 1,300 deterministic rules already judge, but
// every verdict the response carries (health, passes, dimensions, verdict…)
// still comes from those same rules running over whatever signals it read.
// See the deepRead field's doc comment on ScriptDoctorReport
// (server/nvm/analyze/types.ts) for the full lineage contract this route's
// response must honor: a quick report never carries `deepRead`, a deep
// report always does (even when keyless — see below), and two reports with
// the same contentHash but different modes are NOT comparable draft-over-
// draft, because the signals underneath came from a different process.
//
// aiLimiter, NOT gameLimiter — the opposite tier from /doctor, and
// deliberately so: /doctor's whole reason for sitting on gameLimiter is that
// runDiagnoseOnly() makes the revision pipeline provably unable to reach an
// LLM. Deep read is the one deliberate exception to that guarantee — it
// fans out up to ~10 LLM calls (one per scene, up to the core's per-request
// scene cap) before the deterministic passes ever run, so it belongs on the
// same stricter, LLM-aware budget every other generative route in this file
// uses, not the higher-throughput CPU-only budget /doctor and /diagnose share.
//
// Keyless behavior is a 200, never a 500: with no AI key configured,
// runScriptDoctor's deep-read path falls back to the lexicon signals for
// every scene (report.deepRead.usedLLM === false, fallbackScenes covers the
// whole script) and still returns a complete report — the same
// "boots without a key, degrades honestly" posture server.ts holds for the
// rest of the product (see CLAUDE.md's gotcha on this). Deep read never
// throws for lack of a key; it just quietly becomes a quick read that was
// asked to be deep.
//
// Stateless, like /doctor: no sessionId, no getOrCreateSession/Stage.
router.post('/api/scriptide/doctor/deep', aiLimiter, validate(DeepDoctorBodySchema), asyncHandler(async (req, res) => {
  const { fountain: fountainBody, fdx } = req.body as { fountain?: string; fdx?: string; title?: string };

  let fountain: string;
  let source: DoctorSource;

  if (fdx !== undefined) {
    let converted: { fountain: string; warnings: string[] };
    try {
      converted = fdxToFountain(fdx);
    } catch (err) {
      res.status(400).json({ error: sanitizeExternalError(err).message });
      return;
    }
    if (converted.fountain.trim() === '') {
      res.status(400).json({ error: 'The Final Draft file converted to an empty script — nothing to analyze.' });
      return;
    }
    fountain = converted.fountain;
    source = {
      format: 'fdx',
      convertedFountain: converted.fountain,
      ...(converted.warnings.length > 0 ? { warnings: converted.warnings } : {}),
    };
  } else {
    fountain = fountainBody as string;
    source = { format: 'fountain' };
  }

  // Dynamic import — same lazy-load convention as /doctor above.
  const { runScriptDoctor } = await import('../nvm/analyze/doctor.ts');
  // TASK 1 (ai-budget): deep read fans out up to ~10 LLM calls inside
  // runScriptDoctor (server/nvm/analyze/**, no injectable seam from this
  // file — see DOCTOR_DEEP_BUDGET's comment above), so only the wall-clock
  // deadline below is actually enforced; withAiBudget's attempts dimension
  // is documentation for a future instrumentation point, not a live ceiling
  // here. Safe to use the abandon-on-timeout form: this route is
  // asyncHandler, not withSessionCommand — no coordinator tracks it.
  let report: ScriptDoctorReport;
  try {
    report = await withAiBudget(DOCTOR_DEEP_BUDGET, () => runScriptDoctor(fountain, undefined, { deepRead: true }));
  } catch (err) {
    if (isAiBudgetExceededError(err)) {
      res.status(503).json({
        error: 'Deep read took longer than expected and was stopped to protect the server. Try a quick read, or try again.',
        code: err.code,
      });
      return;
    }
    throw err;
  }

  // Root-cause clustering, attached here for the exact same reason /doctor
  // attaches it at the route rather than inside doctor.ts — see that route's
  // comment above. Deep read changes how SIGNALS were sensed, not the shape
  // of the resulting issues, so this step is identical either way.
  const issuesWithPass = report.passes.flatMap(p => p.issues.map(issue => ({ ...issue, pass: p.pass })));
  const rootCauses = clusterIssues(locateIssues(issuesWithPass, fountain));
  res.json({ ...publicDoctorReport(report), rootCauses, source });
}));

// POST /api/scriptide/doctor/pdf — Script Doctor entry point for a screenplay
// submitted as a PDF (the single most common real-world screenplay format —
// Final Draft/WriterDuet/Arc Studio/etc. all export to it). Converts to
// Fountain via pdfToFountain() (server/lib/pdf-import.ts) and then runs the
// exact same doctor pipeline as the /doctor route above, so this is the
// three-format sibling to that route's { fountain } / { fdx } contract:
//   - PDF has no JSON-serializable text of its own (it's a binary format), so
//     it can't share DoctorBodySchema/{ fountain, fdx } — it gets its own
//     route with its own body-parsing middleware instead of a third field on
//     the JSON schema.
// Middleware chain:
//   heavyBodyLimiter    — NOT gameLimiter, deliberately. This route accepts up
//                         to 15mb of raw body per request (see express.raw()
//                         below) where every other gameLimiter-tier route in
//                         this file caps its JSON body at 1mb (server/app.ts's
//                         global express.json({limit:'1mb'})). At gameLimiter's
//                         120/min, a single client could force ~1.8GB/min of
//                         PDF-parsing work (pdfjs-dist buffering + parsing) —
//                         a materially different DoS profile from the rest of
//                         this file's gameLimiter routes, so it gets its own,
//                         much lower budget (10/min — see the DoS-math comment
//                         at heavyBodyLimiter's definition in session-store.ts)
//                         instead of sharing gameLimiter's. It REPLACES
//                         gameLimiter here rather than stacking alongside it:
//                         a PDF upload is a single logical action, and making
//                         it also consume the general 120/min budget would
//                         double-penalize this route's callers against a
//                         ceiling that exists for unrelated lightweight
//                         JSON routes, without adding any further protection
//                         (heavyBodyLimiter's 10/min is already the binding
//                         constraint for this route in every case).
//   express.raw(...)    — the request body is opaque PDF bytes, not JSON.
//                         server/app.ts's global express.json({limit:'1mb'})
//                         is content-type-gated to application/json and
//                         leaves any other content type's body untouched, so
//                         a route-local express.raw() scoped to
//                         application/pdf (plus application/octet-stream,
//                         since some HTTP clients/proxies mislabel binary
//                         uploads generically) doesn't conflict with it.
//                         limit:'15mb', well above the JSON routes' 1mb cap:
//                         real screenplay PDFs — dozens of pages, often with
//                         embedded font subsets — routinely land in the low
//                         single-digit megabytes, so 1mb would reject
//                         ordinary scripts, not just abuse.
// Stateless, like /doctor: no sessionId, no getOrCreateSession/Stage.
router.post(
  '/api/scriptide/doctor/pdf',
  heavyBodyLimiter,
  express.raw({ type: ['application/pdf', 'application/octet-stream'], limit: '15mb' }),
  asyncHandler(async (req, res) => {
    const body = req.body as unknown;

    // Empty body (no bytes at all, or Content-Type didn't match the raw
    // parser above so req.body was never populated as a Buffer) — reject
    // before ever touching pdfToFountain.
    if (!Buffer.isBuffer(body) || body.length === 0) {
      res.status(400).json({ error: 'Request body is empty — expected raw PDF bytes.' });
      return;
    }

    // Fast, exact magic-byte guard ahead of the real parse: pdfToFountain()
    // itself re-checks more leniently (a bounded scan for "%PDF-" that can
    // appear a little later in the stream, matching how real PDF readers
    // locate it) — this route-level check only needs to catch the common
    // case (wrong content, not a PDF at all) cheaply, without spending a full
    // pdfjs parse on obviously-non-PDF input.
    if (body.subarray(0, 5).toString('latin1') !== '%PDF-') {
      res.status(400).json({ error: 'This does not look like a PDF file (missing %PDF header).' });
      return;
    }

    // Dynamic import: pdf-import.ts's own pdfjs-dist dependency is a large
    // parser this route is the only caller of — matching this file's
    // lazy-load convention for heavy modules (see fdx-import's static-import
    // note on the /doctor route above, and doctor.ts's dynamic import below,
    // for the same reasoning applied to the other two shapes of "heavy but
    // situational" dependency).
    const { pdfToFountain } = await import('../lib/pdf-import.ts');
    let converted: { fountain: string; warnings: string[] };
    try {
      converted = await pdfToFountain(new Uint8Array(body));
    } catch (err) {
      res.status(400).json({ error: sanitizeExternalError(err).message });
      return;
    }
    if (converted.fountain.trim() === '') {
      res.status(400).json({ error: 'The PDF converted to an empty script — nothing to analyze.' });
      return;
    }

    const { runScriptDoctor } = await import('../nvm/analyze/doctor.ts');
    const report = await runScriptDoctor(converted.fountain);
    const source: DoctorSource = {
      format: 'pdf',
      convertedFountain: converted.fountain,
      ...(converted.warnings.length > 0 ? { warnings: converted.warnings } : {}),
    };

    // Route-level enrichment, same reasoning as the /doctor route above: kept
    // out of doctor.ts (fixed contract, parallel agent's), and only needs the
    // report's own `passes` plus the converted Fountain text already in scope.
    const issuesWithPass = report.passes.flatMap(p => p.issues.map(issue => ({ ...issue, pass: p.pass })));
    const rootCauses = clusterIssues(locateIssues(issuesWithPass, converted.fountain));
    res.json({ ...publicDoctorReport(report), rootCauses, source });
  }),
);

// ── Live diagnostics (bridge half 3, lightweight sibling of /doctor) ────────
// POST /api/scriptide/diagnose — the debounce-friendly "diagnostics as you
// type" endpoint that powers editor squiggles (LiveDiagnosis, ./analyze/types.ts).
// Deliberately NOT the full /doctor report: this returns only located issues +
// root-cause clusters + the headline numbers, so it stays cheap enough to call
// on every keystroke-pause tick without the client waiting on (or discarding
// most of) a multi-KB payload.
//
// This endpoint is deterministic and LLM-free — diagnose-only, exactly like
// /doctor — and that's deliberate, not incidental: it's what lets "live notes
// while you type" work with NO API key configured at all. Every AI-backed
// route in this file degrades to an error without a key; /doctor and this one
// are the two the product can always offer, key or no key.
//
// gameLimiter, not aiLimiter — identical reasoning to /doctor above: pure CPU
// work, no LLM ever reachable from runDiagnoseOnly(). Stateless: no
// sessionId, no getOrCreateSession/Stage, matching /doctor's contract.
router.post('/api/scriptide/diagnose', gameLimiter, validate(DiagnoseBodySchema), asyncHandler(async (req, res) => {
  const { fountain } = req.body as { fountain: string };

  // Dynamic import — same lazy-load convention as the /doctor route above.
  const { runScriptDoctor } = await import('../nvm/analyze/doctor.ts');
  const report = await runScriptDoctor(fountain);

  const issuesWithPass = report.passes.flatMap(p => p.issues.map(issue => ({ ...issue, pass: p.pass })));
  const locatedIssues = locateIssues(issuesWithPass, fountain);
  const rootCauses = clusterIssues(locatedIssues);
  const analysisComplete = isWholeDraftAnalysisComplete(report);

  const diagnosis: LiveDiagnosis = {
    analysisComplete,
    ...(analysisComplete
      ? { health: report.health, grade: report.grade, verdict: report.verdict }
      : {}),
    ...(report.truncatedForAnalysis
      ? { truncatedForAnalysis: true, totalSceneCount: report.totalSceneCount }
      : {}),
    sceneCount: report.sceneCount,
    locatedIssues,
    rootCauses,
    // runScriptDoctor always populates contentHash — both on the normal
    // aggregateReport path and on the zero-scene degenerate-report path
    // (server/nvm/analyze/doctor.ts) — so this is a safe non-null read, not
    // an optimistic guess.
    contentHash: report.contentHash!,
    analyzedAt: Date.now(),
  };
  res.json(diagnosis);
}));

// ── Fix & Verify (Run 11, bridge half 5) ────────────────────────────────────
// POST /api/scriptide/fix — the feature no competitor can claim: a targeted
// rewrite whose improvement is PROVEN by the deterministic doctor re-running
// on the whole candidate document, not merely promised by the model that
// wrote it. Generation (the LLM rewrite of the caller's span) is opt-in and
// clearly labeled via `usedLLM`; VERIFICATION — the health/verdict delta and
// the cleared/introduced issue lists — is entirely deterministic, computed by
// re-running runScriptDoctor exactly as /doctor does. Both `before` and
// `after` carry their own contentHash (server/nvm/analyze/doctor.ts's
// computeContentHash), so the receipt is reproducible: anyone can re-POST
// either the original or candidate text to /doctor and get byte-identical
// numbers back.
//
// aiLimiter, not gameLimiter — unlike /doctor and /diagnose, this route DOES
// reach the LLM (fix.ts's one generation call), so it belongs on the same
// stricter, LLM-aware budget every other generative route in this file uses.
//
// Stateless, like /doctor: no sessionId, no getOrCreateSession/Stage — the
// route only needs the fountain text, the target span, and the issues to fix,
// exactly what FixBodySchema (validation.ts) validates.
//
// Keyless / model-failure behavior is a 200, never a 500 — fixAndVerify
// (server/nvm/analyze/fix.ts) degrades to { usedLLM: false, note } for a
// missing key, a network failure, or any of its four validation-guard
// rejections (empty output, out-of-range length ratio, a slugline-count
// mismatch, or an unchanged rewrite), matching the keyless-honesty posture
// every other AI-backed route in this file already holds.
router.post('/api/scriptide/fix', aiLimiter, validate(FixBodySchema), asyncHandler(async (req, res) => {
  const { fountain, span, issues } = req.body as {
    fountain: string;
    span: { startLine: number; endLine: number };
    issues: Array<{ rule: string; description: string; suggestedFix?: string }>;
  };

  // Dynamic import — same lazy-load convention as the doctor routes above:
  // fix.ts pulls in the full analyzer + all 14 revision passes via
  // runScriptDoctor, so routes that never call it don't pay the cost at
  // startup.
  const { fixAndVerify } = await import('../nvm/analyze/fix.ts');
  // TASK 1 (ai-budget): fixAndVerify's one generation call has no injectable
  // seam from this file (server/nvm/analyze/fix.ts) — same documented-only
  // attempts caveat as DOCTOR_DEEP_BUDGET above; the deadline is what's real.
  try {
    const result = await withAiBudget(FIX_BUDGET, () => fixAndVerify(fountain, span, issues));
    res.json(result);
  } catch (err) {
    if (isAiBudgetExceededError(err)) {
      res.status(503).json({
        error: 'This fix took longer than expected and was stopped to protect the server. Try again.',
        code: err.code,
      });
      return;
    }
    throw err;
  }
}));

// ── Keyless guard for the remaining generation-only ScriptIDE routes ───────
// The server's front door is analysis-only (no AI key). These routes call the
// LLM directly, so with no key configured generateContent throws and the route
// 500s — a NORTH_STAR "honest degradation" violation. Degrade to a labeled
// response instead (mirrors game.ts interview). Readiness comes from the shared
// server/lib/ai-config.ts::llmReady() (imported at the top of this file).
// Keeping the provider-aware check in one place prevents the UI and route guard
// from disagreeing about whether the selected provider can serve this workflow.
const KEYLESS_AI_NOTE =
  'This AI feature needs a model key — add one in Settings to enable it.';

// The legacy keystroke-triggered inline completion surface is retired. Keep a
// game-limited compatibility tombstone so old clients fail explicitly without
// reading draft/session query data, checking provider readiness, or doing work.
router.get('/api/scriptide/complete', gameLimiter, (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(410).json({ error: 'inline_completion_retired' });
});

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

// P8: Extract the composed genre+director style modifier block from the active session.
// Returns a non-empty string when the session has a genre or director style configured.
// Wraps with newlines so callers can safely include it in template variables.
const sessionStyleGenreBlock = (req: import('express').Request): string => {
  const s = sessions.get(sessionId(req));
  if (!s) return '';
  const ill = s.stage.getIllusionState();
  const { block } = composePromptModifiers(ill.story_genre, ill.director_style);
  return block ? `\n${block}\n` : '';
};

router.post('/api/scriptide/world-build', aiLimiter, validate(WorldBuildBodySchema), asyncHandler(async (req, res) => {
  if (!llmReady()) { res.json({ result: '', usedLLM: false, note: KEYLESS_AI_NOTE }); return; }
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
  try {
    const response = await withAiBudget(SIMPLE_GENERATION_BUDGET, () => generateContent({
      model: modelForTask('WORLDBUILD'),
      contents: getPrompt('scriptide-worldbuild', {
        contextBlock,
        bibleBlock,
        profilesBlock: wbProfiles,
        beat: sanitizeForPrompt(beat, 8000),
        styleGenreBlock: sessionStyleGenreBlock(req),
      }),
    }, { label: 'world-build', timeoutMs: 30_000 }));
    res.json({ result: response.text ?? '' });
  } catch (err) {
    if (isAiBudgetExceededError(err)) {
      res.json({ result: '', usedLLM: false, note: 'This took longer than expected and was stopped to protect the server. Try again.' });
      return;
    }
    throw err;
  }
}));

router.post('/api/scriptide/refine-dialogue', aiLimiter, validate(RefineDialogueBodySchema), asyncHandler(async (req, res) => {
  if (!llmReady()) { res.json({ result: '', usedLLM: false, note: KEYLESS_AI_NOTE }); return; }
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
  try {
    const response = await withAiBudget(SIMPLE_GENERATION_BUDGET, () => generateContent({
      model: modelForTask('DIALOGUE'),
      contents: getPrompt('scriptide-dialogue', {
        contextBlock: dlgContextBlock,
        bibleBlock: dlgBibleBlock,
        dialogue: sanitizeForPrompt(dialogue, 8000),
        profiles: JSON.stringify(profiles),
        styleGenreBlock: sessionStyleGenreBlock(req),
      }),
    }, { label: 'refine-dialogue', timeoutMs: 30_000 }));
    res.json({ result: response.text ?? '' });
  } catch (err) {
    if (isAiBudgetExceededError(err)) {
      res.json({ result: '', usedLLM: false, note: 'This took longer than expected and was stopped to protect the server. Try again.' });
      return;
    }
    throw err;
  }
}));

router.post('/api/scriptide/analyze-tension', aiLimiter, validate(AnalyzeTensionBodySchema), asyncHandler(async (req, res) => {
  if (!llmReady()) { res.json({ result: '', usedLLM: false, note: KEYLESS_AI_NOTE }); return; }
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
  try {
    const response = await withAiBudget(SIMPLE_GENERATION_BUDGET, () => generateContent({
      model: modelForTask('ANALYSIS'),
      contents: getPrompt('scriptide-tension', {
        contextBlock: tnContextBlock,
        bibleBlock: tnBibleBlock,
        profilesBlock: tnProfiles,
        scene: sanitizeForPrompt(scene, 8000),
        styleGenreBlock: sessionStyleGenreBlock(req),
      }),
    }, { label: 'analyze-tension', timeoutMs: 30_000 }));
    res.json({ result: response.text ?? '' });
  } catch (err) {
    if (isAiBudgetExceededError(err)) {
      res.json({ result: '', usedLLM: false, note: 'This took longer than expected and was stopped to protect the server. Try again.' });
      return;
    }
    throw err;
  }
}));

router.post('/api/scriptide/clean-action', aiLimiter, validate(CleanActionBodySchema), asyncHandler(async (req, res) => {
  if (!llmReady()) { res.json({ result: '', usedLLM: false, note: KEYLESS_AI_NOTE }); return; }
  const text = requireString(req.body?.text, 'text');
  // P8: use full composed modifier (synergy override when available) instead of a simple genre hint string.
  const genreHint = sessionStyleGenreBlock(req);
  try {
    const response = await withAiBudget(SIMPLE_GENERATION_BUDGET, () => generateContent({
      model: modelForTask('ACTION'),
      contents: getPrompt('scriptide-clean-action', {
        genreHint,
        text: sanitizeForPrompt(text, 8000),
      }),
    }, { label: 'clean-action', timeoutMs: 30_000 }));
    res.json({ result: response.text ?? '' });
  } catch (err) {
    if (isAiBudgetExceededError(err)) {
      res.json({ result: '', usedLLM: false, note: 'This took longer than expected and was stopped to protect the server. Try again.' });
      return;
    }
    throw err;
  }
}));

router.post('/api/scriptide/character-profile', aiLimiter, validate(CharacterProfileBodySchema), asyncHandler(async (req, res) => {
  if (!llmReady()) { res.json({ result: '', usedLLM: false, note: KEYLESS_AI_NOTE }); return; }
  const profile = req.body.profile;
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

  try {
    const response = await withAiBudget(SIMPLE_GENERATION_BUDGET, () => generateContent({
      model: modelForTask('CHARACTER'),
      contents: getPrompt('scriptide-character', {
        bibleBlock: cpBibleBlock,
        name,
        ghost,
        lie,
        want,
        need,
      }),
    }, { label: 'character-profile', timeoutMs: 30_000 }));
    res.json({ result: response.text ?? '' });
  } catch (err) {
    if (isAiBudgetExceededError(err)) {
      res.json({ result: '', usedLLM: false, note: 'This took longer than expected and was stopped to protect the server. Try again.' });
      return;
    }
    throw err;
  }
}));

// ── Comprehensive script analysis (replaces frontend director.ts AI calls) ──
router.post('/api/analyze-script', aiLimiter, validate(AnalyzeScriptBodySchema), asyncHandler(async (req, res) => {
  if (!llmReady()) { res.status(503).json({ error: KEYLESS_AI_NOTE }); return; }
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

  // Craft-spec injection (user-directed P0 exception — see
  // server/nvm/generate/craft-spec.ts header): compact form since this route
  // already carries director-state, throughline, and codex context blocks —
  // it informs director commentary / structural node judgment, never the
  // deterministic doctor score.
  const configGenre = typeof storyConfig.genre === 'string' ? storyConfig.genre : null;
  const craftBlock = buildCraftPromptSection({
    compact: true,
    animation: looksLikeAnimationGenre(configGenre),
  });

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

  // TASK 1 (ai-budget): 3 logical AI operations under one request-level
  // budget — the analysis call, then image+audio generation in parallel.
  // consumeAiAttempt() is called directly at each call site below (no
  // wrapping seam needed: this route makes exactly these 3 calls, no loop),
  // so the attempts dimension is fully real here, not documentation-only.
  // withAiBudget's abandon-on-timeout deadline is safe: asyncHandler, no
  // SessionCommandCoordinator.
  try {
    const result = await withAiBudget(ANALYZE_SCRIPT_BUDGET, async () => {
      consumeAiAttempt();
      const analysisResponse = await generateContent({
        model: modelForTask('ANALYSIS'),
        contents: prompt,
        config: {
          systemInstruction: `You are the AI Director, a strict narrative dungeon master enforcing psychological and structural rules of screenwriting.\n\n${craftBlock}`,
          responseMimeType: 'application/json',
          responseSchema: AnalyzeScriptSchema,
        },
      }, { label: 'analyze-script', timeoutMs: 45_000 });

      const rawText = analysisResponse.text ?? '{}';
      const analysisData = safeJsonParse<{ sceneAnalysis: Record<string, unknown>; updatedDirectorState: Record<string, unknown> } | null>(rawText, null);
      if (!analysisData?.sceneAnalysis) {
        return { parseFailed: true as const };
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

      consumeAiAttempt();
      consumeAiAttempt();
      const [imageUrl, audioResult] = await Promise.all([
        getImageProvider().generate(imagePromptText).catch((e: Error) => {
          logger.warn('image_generation_failed', { ...sanitizeExternalError(e) });
          return undefined;
        }),
        getTTSProvider().speak(audioText).catch((e: Error) => {
          logger.warn('tts_generation_failed', { ...sanitizeExternalError(e) });
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

      return {
        parseFailed: false as const,
        sceneAnalysis: { ...analysisData.sceneAnalysis, imageUrl, audioUrl },
        updatedDirectorState: analysisData.updatedDirectorState,
        evaluatorWarnings,
      };
    });

    if (result.parseFailed) {
      res.status(500).json({ error: 'Failed to parse AI analysis response.' });
      return;
    }
    res.json({
      sceneAnalysis: result.sceneAnalysis,
      updatedDirectorState: result.updatedDirectorState,
      evaluatorWarnings: result.evaluatorWarnings,
    });
  } catch (err) {
    if (isAiBudgetExceededError(err)) {
      res.status(503).json({
        error: 'This analysis took longer than expected and was stopped to protect the server. Try again.',
        code: err.code,
      });
      return;
    }
    throw err;
  }
}));

// ── Character memory export / import (P6) ─────────────────────────────────────
router.post('/api/characters/export', gameLimiter, validate(CharactersExportBodySchema), asyncHandler(async (req, res) => {
  const { exportCharacter } = await import('../engine/character-memory.ts');
  const charId = (req.body as { charId: string }).charId;
  const sid = sessionId(req);
  const { stage } = getOrCreateSession(sid);
  const bundle = exportCharacter(stage, charId, sid);
  if (!bundle) {
    res.status(404).json({ error: `character "${charId}" not found in this session` });
    return;
  }
  res.json(bundle);
}));

router.post('/api/characters/import', gameLimiter, validate(CharactersImportBodySchema), withSessionCommand(async (req, res, session) => {
  const { importCharacter, isCharacterMemoryBundle } = await import('../engine/character-memory.ts');
  const bundle = req.body?.bundle;
  if (!isCharacterMemoryBundle(bundle)) {
    res.status(400).json({ error: 'body.bundle is not a valid CharacterMemoryBundle' });
    return;
  }
  const targetLocationId = typeof req.body?.targetLocationId === 'string'
    ? req.body.targetLocationId : undefined;
  const { stage } = session;
  try {
    const result = importCharacter(stage, bundle, targetLocationId);
    res.json({ status: 'imported', ...result });
  } catch (err) {
    res.status(400).json({ error: sanitizeExternalError(err).message });
  }
}));
