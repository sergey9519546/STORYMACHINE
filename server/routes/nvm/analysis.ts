// server/routes/nvm/analysis.ts — read-only valuation/quality/health analytics
// over the current session's canon: tension, two-reader, topology, quality
// engine, momentum, health dashboard, epistemic state, arc timeline/completion,
// character-arc, voice-dna, regression, conflicts, and sidecar export. Split
// out of the former server/routes/nvm.ts — see server/routes/nvm/index.ts for
// the full module map.
import express from 'express';
import { buildEnrichedState } from '../../nvm/state/enrichedState.ts';
import {
  asyncHandler, sessionId, getOrCreateSession,
  gameLimiter,
} from '../../lib/session-store.ts';
import {
  validate, validateParams, QualityBodySchema, CommitIdParamSchema,
  StoryVectorCompareBodySchema,
} from '../../lib/validation.ts';
import { logger } from '../../lib/logger.ts';

const router = express.Router();
export default router;

// ── NVM valuation routes (Wave 4) ─────────────────────────────────────────

// GET /api/nvm/tension — derive tension ledger from current session state
router.get('/api/nvm/tension', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { deriveTensionLedger } = await import('../../nvm/valuation/futures.ts');
  const state = buildEnrichedState(stage);
  const commits = stage.getCommits().filter(c => !c.reverted);
  const sceneIdx = commits.length > 0 ? commits[commits.length - 1].sceneIdx : 0;
  res.json(deriveTensionLedger(state, sceneIdx));
}));

// GET /api/nvm/metrics — deterministic narrative metrics (blueprint §27):
// per-scene pivotStrength/cliffhangerStrength/twistImpact/surpriseProxy/
// informationAsymmetryStrength/pacingFit, plus whole-script suspenseEntropy/
// momentumConsistency/finalCliffhangerStrength/pacingFit/narrativeCohesion/
// emotionalImpactRange/tensionMeasures — see server/nvm/analyze/metrics.ts's
// header for every formula's inputs/range/craft meaning, and its
// "Deliberately SKIPPED" section for the metrics this module can't honestly
// support from ScreenplaySceneRecord alone. Builds records the same way
// GET /api/nvm/screenplay/memory does (buildScreenplayMemory over the
// session's active commits) so a caller can diff the two responses directly.
// pacingFit additionally reads the session's configured emotional_arc (if
// any) via stage.getIllusionState() — passed in as a plain argument so
// metrics.ts itself stays a pure function of its inputs, never touching
// session state directly.
router.get('/api/nvm/metrics', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { buildScreenplayMemory } = await import('../../nvm/screenplay/memory.ts');
  const { computeNarrativeMetrics } = await import('../../nvm/analyze/metrics.ts');

  type StoryCommitT = import('../../nvm/state/StoryCommit.ts').StoryCommit;
  const allCommits = (stage.getCommits() as StoryCommitT[]).filter(c => !c.reverted);
  const records = buildScreenplayMemory(allCommits);
  const emotionalArc = stage.getIllusionState().emotional_arc;

  const { perScene, script } = computeNarrativeMetrics(records, emotionalArc);
  res.json({ perScene, script });
}));

// GET /api/nvm/two-reader — first-watch vs rewatch scores
router.get('/api/nvm/two-reader', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { deriveTensionLedger } = await import('../../nvm/valuation/futures.ts');
  const { twoReaderReport } = await import('../../nvm/valuation/two-reader.ts');
  const state = buildEnrichedState(stage);
  const commits = stage.getCommits().filter(c => !c.reverted);
  const sceneIdx = commits.length > 0 ? commits[commits.length - 1].sceneIdx : 0;
  const ledger = deriveTensionLedger(state, sceneIdx);
  res.json(twoReaderReport(state, ledger));
}));

// GET /api/nvm/topology — emotional arc topology vs 6 archetypes
router.get('/api/nvm/topology', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { deriveTensionLedger } = await import('../../nvm/valuation/futures.ts');
  const { computeTopology } = await import('../../nvm/valuation/topology.ts');
  const state = buildEnrichedState(stage);
  const commits = stage.getCommits().filter(c => !c.reverted);
  const ledgers = commits.map((c, i) => deriveTensionLedger(state, c.sceneIdx ?? i));
  res.json(computeTopology(ledgers));
}));

// ── Godmode API routes ─────────────────────────────────────────────────────

// POST /api/nvm/quality — run quality engine on a candidate IR
router.post('/api/nvm/quality', gameLimiter, validate(QualityBodySchema), asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { runQualityEngine } = await import('../../nvm/quality/index.ts');
  const { ir } = req.body as { ir: import('../../nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR };
  const state = buildEnrichedState(stage);
  res.json(runQualityEngine(ir, state));
}));

// GET /api/nvm/momentum — narrative momentum score (5th tension signal)
router.get('/api/nvm/momentum', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { momentumScore } = await import('../../nvm/valuation/futures.ts');
  const commits = stage.getCommits().filter(c => !c.reverted);
  res.json({ momentumScore: momentumScore(commits), commitCount: commits.length });
}));

// GET /api/nvm/sidecar — export current session as NVM sidecar JSON
router.get('/api/nvm/sidecar', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { buildSidecar } = await import('../../nvm/project/sidecar.ts');
  const commits = stage.getCommits();
  const state = buildEnrichedState(stage);
  const ghosts = stage.ghostLedgerGet();
  const sidecar = buildSidecar({ commits, state, ghosts });
  res.setHeader('Content-Disposition', 'attachment; filename="story.nvm.json"');
  res.json(sidecar);
}));

// GET /api/nvm/quality/scene/:commitId — run quality engine on a committed scene.
router.get('/api/nvm/quality/scene/:commitId', gameLimiter, validateParams(CommitIdParamSchema), asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { runQualityEngine } = await import('../../nvm/quality/index.ts');
  const { emptyState } = await import('../../nvm/state/NarrativeState.ts');
  const { applyStoryOps } = await import('../../nvm/ops/dispatcher.ts');

  const targetId = req.params.commitId;
  const allCommits = stage.getCommits().filter(
    (c: import('../../nvm/state/StoryCommit.ts').StoryCommit) => !c.reverted,
  );
  const targetIdx = allCommits.findIndex(
    (c: import('../../nvm/state/StoryCommit.ts').StoryCommit) => c.commitId === targetId,
  );
  if (targetIdx === -1) {
    res.status(404).json({ error: `Commit "${targetId}" not found` }); return;
  }
  const commit = allCommits[targetIdx];

  let rollingState = emptyState();
  for (let i = 0; i < targetIdx; i++) {
    rollingState = applyStoryOps(rollingState, allCommits[i].ops);
  }

  const ir: import('../../nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR = {
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

// ── Story Vector Comparative Analysis ─────────────────────────────────────

// POST /api/nvm/analyze/compare — Compare a screenplay against the corpus
// using Story Vector embeddings. Returns nearest neighbors, cluster assignment,
// and structural genome template.
router.post('/api/nvm/analyze/compare', gameLimiter, validate(StoryVectorCompareBodySchema), asyncHandler(async (req, res) => {
  const { scriptText } = req.body as { scriptText: string };

  // Vectorize the input script
  const { vectorizeScript, findNearestNeighbors, clusterCorpus } = await import('../../nvm/analyze/story-vector.ts');
  const { loadCorpusVectors } = await import('../../lib/corpus-loader.ts');
  const { extractGenome, findStructuralTemplate } = await import('../../nvm/analyze/structural-genome.ts');
  const { buildScreenplayMemory } = await import('../../nvm/screenplay/memory.ts');
  const { runScriptDoctor } = await import('../../nvm/analyze/doctor.ts');
  
  logger.info('story_vector_vectorizing_input', {});
  const queryVector = await vectorizeScript(scriptText, 'User Draft', 'generated');

  logger.info('story_vector_loading_corpus', {});
  const corpus = await loadCorpusVectors(undefined, (current, total, slug) => {
    logger.debug('story_vector_loading_corpus_progress', { current, total, slug });
  });

  logger.info('story_vector_finding_neighbors', {});
  const neighbors = findNearestNeighbors(queryVector, corpus, 5);

  logger.info('story_vector_clustering_corpus', {});
  // Cluster the full corpus + query vector to see which cluster it lands in
  const allVectors = [...corpus, queryVector];
  const numClusters = Math.min(5, Math.floor(corpus.length / 3)); // 5 clusters or fewer
  const clusters = clusterCorpus(allVectors, numClusters);
  
  // Find which cluster the query landed in
  const queryCluster = clusters.find(c => 
    c.members.some(m => m.metadata.contentHash === queryVector.metadata.contentHash)
  );
  
  // Build scene records for genome extraction (query + top match)
  logger.info('story_vector_extracting_genome', {});
  const queryReport = await runScriptDoctor(scriptText);
  type StoryCommitT = import('../../nvm/state/StoryCommit.ts').StoryCommit;
  
  // Convert Script Doctor report to scene records (simplified)
  // In production, this would need the full screenplay memory build
  const queryRecords: import('../../nvm/screenplay/memory.ts').ScreenplaySceneRecord[] = [];
  
  const queryGenome = extractGenome(queryVector, queryRecords);
  
  // Get the top match's genome
  let topMatchGenome = null;
  let structuralTemplate = null;
  if (neighbors.length > 0) {
    const topMatch = neighbors[0];
    logger.info('story_vector_extracting_top_match_genome', { title: topMatch.vector.metadata.title });
    
    // For now, we can't build full scene records without re-running Script Doctor
    // on the corpus screenplay. In production, these would be cached alongside vectors.
    // For this implementation, we'll return a placeholder.
    structuralTemplate = {
      title: topMatch.vector.metadata.title,
      similarity: topMatch.similarity,
      genome: {
        sourceTitle: topMatch.vector.metadata.title,
        actBreakPositions: [],
        reversalCount: 0,
        conflictEscalationPattern: 'linear' as const,
        characterArcShape: 'linear' as const,
        emotionalCurvature: 0.5,
      },
    };
  }
  
  res.json({
    vector: {
      dimensions: queryVector.dimensions.length,
      metadata: queryVector.metadata,
    },
    nearestNeighbors: neighbors.map(n => ({
      title: n.vector.metadata.title,
      similarity: Math.round(n.similarity * 100) / 100,
      sceneCount: n.vector.metadata.sceneCount,
      wordCount: n.vector.metadata.wordCount,
      source: n.vector.metadata.source,
    })),
    cluster: queryCluster ? {
      id: queryCluster.id,
      memberCount: queryCluster.members.length,
      clustermates: queryCluster.members
        .filter(m => m.metadata.contentHash !== queryVector.metadata.contentHash)
        .slice(0, 3)
        .map(m => m.metadata.title),
    } : null,
    structuralTemplate,
    healthMetrics: {
      sceneCount: queryReport.sceneCount,
      wordCount: queryReport.wordCount,
      health: queryReport.health,
      grade: queryReport.grade,
    },
  });
}));

// GET /api/nvm/analyze/corpus-stats — Get statistics about the vectorized corpus
router.get('/api/nvm/analyze/corpus-stats', gameLimiter, asyncHandler(async (req, res) => {
  const { getCacheStats, getAvailableSlugs } = await import('../../lib/corpus-loader.ts');
  
  const stats = await getCacheStats();
  const slugs = await getAvailableSlugs();
  
  res.json({
    available: stats.available,
    cached: stats.cached,
    hitRate: Math.round(stats.hitRate * 100),
    slugs: slugs.slice(0, 10), // First 10 for preview
  });
}));

// GET /api/nvm/epistemic — current epistemic state
router.get('/api/nvm/epistemic', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const state = buildEnrichedState(stage);

  // Flatten all character beliefs into a unified belief map
  const beliefs: Array<{ charId: string; beliefId: string; proposition: string; confidence: number; source: string }> = [];
  for (const [charId, blist] of Object.entries(state.characterBeliefs)) {
    for (const b of blist) {
      beliefs.push({ charId, beliefId: b.id, proposition: b.proposition, confidence: b.confidence, source: b.source });
    }
  }

  // Infer meta-layers
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
router.get('/api/nvm/health', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { emptyState } = await import('../../nvm/state/NarrativeState.ts');
  const { deriveTensionLedger, momentumScore } = await import('../../nvm/valuation/futures.ts');
  const { computeTopology } = await import('../../nvm/valuation/topology.ts');
  const { analyzeArcCompletion } = await import('../../nvm/quality/arc-tracker.ts');
  const { runTier1, runTier2, tier2Score } = await import('../../nvm/proof/kernel.ts');
  const { applyStoryOps } = await import('../../nvm/ops/dispatcher.ts');

  const state = buildEnrichedState(stage);
  const allCommits = stage.getCommits().filter((c: import('../../nvm/state/StoryCommit.ts').StoryCommit) => !c.reverted);
  const commitCount = allCommits.length;
  const sceneIdx = commitCount > 0 ? allCommits[commitCount - 1].sceneIdx : 0;

  // Tension
  const currentLedger = deriveTensionLedger(state, sceneIdx);
  const ledgers = allCommits.map((c: import('../../nvm/state/StoryCommit.ts').StoryCommit, i: number) => deriveTensionLedger(state, c.sceneIdx ?? i));
  const tensionHistory = ledgers.map(l => l.totalTension);

  // Topology
  const topology = computeTopology(ledgers);

  // Arc completion
  const arcReport = analyzeArcCompletion(allCommits.map((c: import('../../nvm/state/StoryCommit.ts').StoryCommit) => ({ sceneIdx: c.sceneIdx, ops: c.ops })));

  // Epistemic summary
  const totalBeliefs = Object.values(state.characterBeliefs).flat().length;
  const characterCount = Object.keys(state.characterBeliefs).length;

  // Proof pass rate over all committed scenes (using rolling state)
  let t1PassCount = 0;
  let totalQuality = 0;
  let rollingState = emptyState();
  const tier1FailureCounts: Record<string, number> = {};
  for (const commit of allCommits) {
    const ir: import('../../nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR = {
      transitionId: commit.commitId, sceneIdx: commit.sceneIdx, sceneFunction: 'advance_plot',
      activeMechanisms: [], beforeStateHash: 'health', ops: commit.ops,
      preconditions: [], postconditions: [],
      provenance: { origin: 'model_generated', createdAt: commit.createdAt },
    };
    const t1 = runTier1(ir, rollingState);
    const t2 = runTier2(ir, rollingState);
    if (t1.every(r => r.pass)) t1PassCount++;
    for (const r of t1) {
      if (!r.pass) {
        tier1FailureCounts[r.proof] = (tier1FailureCounts[r.proof] ?? 0) + 1;
      }
    }
    totalQuality += tier2Score(t2);
    rollingState = applyStoryOps(rollingState, commit.ops);
  }
  // G0-05: with zero commits there is nothing to score — return null rather
  // than a sentinel 100% pass rate / 0 quality that renders as a real reading.
  const proofPassRate = commitCount > 0 ? Math.round((t1PassCount / commitCount) * 100) : null;
  const avgQuality = commitCount > 0 ? Math.round(totalQuality / commitCount) : null;
  const tier1TopFailures = Object.entries(tier1FailureCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([proof, failCount]) => ({ proof, failCount }));

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
      tier1TopFailures,
    },
  });
}));

// GET /api/nvm/character-arc — per-character per-scene breakdown.
router.get('/api/nvm/character-arc', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { emptyState, relationshipKey } = await import('../../nvm/state/NarrativeState.ts');
  const { applyStoryOps } = await import('../../nvm/ops/dispatcher.ts');

  const allCommits = stage.getCommits().filter(
    (c: import('../../nvm/state/StoryCommit.ts').StoryCommit) => !c.reverted,
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

// GET /api/nvm/arc-timeline — per-scene stats for all active commits.
router.get('/api/nvm/arc-timeline', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { runTier1, runTier2, tier2Score } = await import('../../nvm/proof/kernel.ts');
  const { emptyState } = await import('../../nvm/state/NarrativeState.ts');
  const { applyStoryOps } = await import('../../nvm/ops/dispatcher.ts');
  const { deriveTensionLedger } = await import('../../nvm/valuation/futures.ts');
  const { runQualityEngine } = await import('../../nvm/quality/index.ts');
  const commits = stage.getCommits().filter((c: import('../../nvm/state/StoryCommit.ts').StoryCommit) => !c.reverted);
  let rollingState = emptyState();

  const scenes = [];
  for (const commit of commits) {
    // Build a minimal IR shell from the StoryCommit (commits store ops, not full IR)
    const ir: import('../../nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR = {
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
      topOps: commit.ops.slice(0, 3).map((o: import('../../nvm/ops/StoryOp.ts').StoryOp) => o.op),
      mechanisms: ir.activeMechanisms,
    });
    rollingState = applyStoryOps(rollingState, commit.ops);
  }

  res.json({ scenes, sceneCount: scenes.length });
}));

// GET /api/nvm/arc-completion — open narrative promise tracker.
router.get('/api/nvm/arc-completion', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { analyzeArcCompletion } = await import('../../nvm/quality/arc-tracker.ts');
  const allCommits = stage.getCommits().filter(
    (c: import('../../nvm/state/StoryCommit.ts').StoryCommit) => !c.reverted,
  );
  const scenes = allCommits.map(
    (c: import('../../nvm/state/StoryCommit.ts').StoryCommit) => ({ sceneIdx: c.sceneIdx, ops: c.ops }),
  );
  res.json(analyzeArcCompletion(scenes));
}));

// GET /api/nvm/regression — narrative regression suite.
router.get('/api/nvm/regression', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { runNarrativeRegression } = await import('../../nvm/regression/runner.ts');
  const allCommits = stage.getCommits();
  res.json(runNarrativeRegression(allCommits));
}));

// GET /api/nvm/momentum-dashboard — full narrative momentum dashboard.
router.get('/api/nvm/momentum-dashboard', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { runQualityEngine } = await import('../../nvm/quality/index.ts');
  const { runNarrativeRegression } = await import('../../nvm/regression/runner.ts');
  const { emptyState, applyStoryOps } = await import('../../nvm/ops/dispatcher.ts').then(async d => ({
    ...(await import('../../nvm/state/NarrativeState.ts')),
    applyStoryOps: d.applyStoryOps,
  }));
  const { runTier1, tier1Passes } = await import('../../nvm/proof/kernel.ts');
  const { deriveTensionLedger } = await import('../../nvm/valuation/futures.ts');
  type StoryCommit = import('../../nvm/state/StoryCommit.ts').StoryCommit;
  type NarrativeTransitionIR = import('../../nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR;

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
    const passCount = tier1Results.filter((r: import('../../nvm/proof/contract.ts').ProofResult) => r.pass).length;
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

// GET /api/nvm/voice-dna — Voice DNA Analyzer.
router.get('/api/nvm/voice-dna', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  type StoryCommit = import('../../nvm/state/StoryCommit.ts').StoryCommit;
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

// GET /api/nvm/conflicts — Conflict Orchestrator + Intention Registry.
router.get('/api/nvm/conflicts', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { buildIntentionRegistry } = await import('../../nvm/drama/intention-registry.ts');
  const { computeConflicts } = await import('../../nvm/drama/conflict-orchestrator.ts');
  const { buildNarrativeState, emptyState } = await import('../../nvm/state/NarrativeState.ts');
  const { applyStoryOps } = await import('../../nvm/ops/dispatcher.ts');

  type StoryCommitT = import('../../nvm/state/StoryCommit.ts').StoryCommit;
  const allCommits = (stage.getCommits() as StoryCommitT[]).filter(c => !c.reverted);

  const base = buildNarrativeState(stage);
  let folded = emptyState();
  for (const c of allCommits) folded = applyStoryOps(folded, c.ops);
  const state = { ...base, ...folded, turn: stage.getTurnCount() };

  const registry = buildIntentionRegistry(stage);
  const conflicts = computeConflicts(registry, state);

  res.json({ registry, conflicts });
}));
