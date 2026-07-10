// server/routes/nvm/selfplay.ts — corpus mining (Director Policy), headless
// self-play simulation runs, and StoryGenome extraction/diff/breed. Split out
// of the former server/routes/nvm.ts — see server/routes/nvm/index.ts for the
// full module map.
import express from 'express';
import { buildEnrichedState } from '../../nvm/state/enrichedState.ts';
import {
  asyncHandler, safeJsonParse, sessionId, getOrCreateSession,
  gameLimiter, aiLimiter,
} from '../../lib/session-store.ts';
import {
  validate, SelfplayBodySchema, GenomeDiffBodySchema, GenomeBreedBodySchema,
} from '../../lib/validation.ts';

const router = express.Router();
export default router;

// GET /api/nvm/corpus — top corpus runs + Director policy
router.get('/api/nvm/corpus', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { mineCorpus } = await import('../../nvm/selfplay/mine.ts');
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
      topOperators: [] as import('../../nvm/converge/operators.ts').MutationOperator[],
      scenes: [],
      effectiveOperators: [],
      totalIterations: 0,
    })),
    meanScore: runs.reduce((s, r) => s + r.score, 0) / runs.length,
    bestRun: runs[0] ? { scenarioId: runs[0].scenario_id, seed: 0, proofPassRate: runs[0].proof_pass_rate, meanValuation: runs[0].mean_valuation, score: runs[0].score, topOperators: [], scenes: [], effectiveOperators: [], totalIterations: 0 } : { scenarioId: '', seed: 0, proofPassRate: 0, meanValuation: 0, score: 0, topOperators: [], scenes: [], effectiveOperators: [], totalIterations: 0 },
    worstRun: runs[runs.length - 1] ? { scenarioId: runs[runs.length - 1].scenario_id, seed: 0, proofPassRate: runs[runs.length - 1].proof_pass_rate, meanValuation: runs[runs.length - 1].mean_valuation, score: runs[runs.length - 1].score, topOperators: [], scenes: [], effectiveOperators: [], totalIterations: 0 } : { scenarioId: '', seed: 0, proofPassRate: 0, meanValuation: 0, score: 0, topOperators: [], scenes: [], effectiveOperators: [], totalIterations: 0 },
    operatorFrequency: {} as Record<import('../../nvm/converge/operators.ts').MutationOperator, number>,
  };
  const playbook = mineCorpus(fakeReport);
  res.json({ playbook, runs, runCount: runs.length });
}));

// POST /api/nvm/selfplay — run N headless sims and persist corpus results.
// aiLimiter: self-play runs up to 50 simulations × LLM candidate generations per request.
router.post('/api/nvm/selfplay', aiLimiter, validate(SelfplayBodySchema), asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { runSelfPlay } = await import('../../nvm/selfplay/corpus.ts');
  const { makeLLMCandidateGenerator } = await import('../../nvm/generate/llm-generator.ts');
  const { extractGenome } = await import('../../nvm/selfplay/genome.ts');
  type SimScenarioT = import('../../nvm/selfplay/corpus.ts').SimScenario;
  const { scenarios } = req.body as { scenarios: SimScenarioT[] };
  const rawMax = req.body?.maxSimulations;
  const maxSimulations = typeof rawMax === 'number' && rawMax > 0 ? Math.min(rawMax, 50) : undefined;
  const rawMaxScenes = req.body?.maxScenesPerScenario;
  const maxScenesPerScenario = typeof rawMaxScenes === 'number' && rawMaxScenes > 0 ? Math.min(rawMaxScenes, 100) : undefined;

  // H6: parse per-simulation convergence budget from request body.
  const rawBudget = req.body?.budget;
  const selfPlayBudget = rawBudget && typeof rawBudget === 'object' ? {
    maxIterations:         Math.min(10, Math.max(1, parseInt(String(rawBudget.maxIterations         ?? 4), 10) || 4)),
    candidatesPerIteration: Math.min(5,  Math.max(1, parseInt(String(rawBudget.candidatesPerIteration ?? 2), 10) || 2)),
    ...(rawBudget.maxLLMCalls != null
      ? { maxLLMCalls: Math.min(100, Math.max(1, parseInt(String(rawBudget.maxLLMCalls), 10) || 24)) }
      : {}),
  } : undefined;

  const generate = makeLLMCandidateGenerator();
  const report = await runSelfPlay(scenarios, generate, maxSimulations, maxScenesPerScenario, selfPlayBudget);

  // Persist each run to Stage corpus
  const state = buildEnrichedState(stage);
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
router.get('/api/nvm/genome/current', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { extractGenome } = await import('../../nvm/selfplay/genome.ts');
  const commits = stage.getCommits();
  const state = buildEnrichedState(stage);
  const ghosts = stage.ghostLedgerGet();
  const genome = extractGenome({ commits, state, ghosts }, 'current');
  res.json(genome);
}));

// POST /api/nvm/genome/diff — diff two corpus run genomes.
router.post('/api/nvm/genome/diff', gameLimiter, validate(GenomeDiffBodySchema), asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { diffGenomes } = await import('../../nvm/selfplay/genome.ts');
  const { runIdA, runIdB } = req.body as { runIdA: string; runIdB: string };
  const runs = stage.getCorpusRuns(200);
  const runA = runs.find((r: { run_id: string }) => r.run_id === runIdA);
  const runB = runs.find((r: { run_id: string }) => r.run_id === runIdB);
  if (!runA || !runB) {
    res.status(404).json({ error: `Run(s) not found: ${!runA ? runIdA : ''} ${!runB ? runIdB : ''}`.trim() }); return;
  }
  const genomeA = safeJsonParse(runA.genome_json, null);
  const genomeB = safeJsonParse(runB.genome_json, null);
  if (!genomeA || !genomeB) {
    res.status(422).json({ error: 'One or both genome records contain invalid JSON' }); return;
  }
  const diff = diffGenomes(genomeA, genomeB);
  res.json({ diff, genomeA, genomeB });
}));

// POST /api/nvm/genome/breed — breed two corpus run genomes into a seed genome.
router.post('/api/nvm/genome/breed', gameLimiter, validate(GenomeBreedBodySchema), asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { breedGenomes } = await import('../../nvm/selfplay/genome.ts');
  const { runIdA, runIdB, newId } = req.body as { runIdA: string; runIdB: string; newId?: string };
  const runs = stage.getCorpusRuns(200);
  const runA = runs.find((r: { run_id: string }) => r.run_id === runIdA);
  const runB = runs.find((r: { run_id: string }) => r.run_id === runIdB);
  if (!runA || !runB) {
    res.status(404).json({ error: 'Run(s) not found' }); return;
  }
  const genomeA = safeJsonParse(runA.genome_json, null);
  const genomeB = safeJsonParse(runB.genome_json, null);
  if (!genomeA || !genomeB) {
    res.status(422).json({ error: 'One or both genome records contain invalid JSON' }); return;
  }
  const bred = breedGenomes(genomeA, genomeB, typeof newId === 'string' ? newId : `bred-${Date.now()}`);
  res.json(bred);
}));
