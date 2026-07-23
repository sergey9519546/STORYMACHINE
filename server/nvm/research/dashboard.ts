// Research Dashboard — Simple CLI Interface
//
// Command-line interface for running experiments, comparing theories,
// and viewing research results. Simple and scriptable.

import { researchAPI } from './api.ts';
import { setupPayoffDistanceExperiment } from './experiments/setup-payoff-distance.ts';
import { quantumBranchingExperiment } from './experiments/quantum-branching.ts';
import { trinityGatePrecisionExperiment } from './experiments/trinity-gate-precision.ts';
import { campbellHeroJourney } from './theories/campbell-hero-journey.ts';
import { freytagPyramid } from './theories/freytag-pyramid.ts';
import type { FountainAnalysis } from '../analyze/types.ts';

// ── Initialize Research Platform ──────────────────────────────────────────────

export function initializeResearchPlatform() {
  // Register experiments
  researchAPI.registerExperiment(setupPayoffDistanceExperiment);
  researchAPI.registerExperiment(quantumBranchingExperiment);
  researchAPI.registerExperiment(trinityGatePrecisionExperiment);
  
  // Register theories
  researchAPI.registerTheory(campbellHeroJourney);
  researchAPI.registerTheory(freytagPyramid);
  
  console.log('✓ Research platform initialized');
  console.log(`  - ${researchAPI.getExperiments().length} experiments registered`);
  console.log(`  - ${researchAPI.getTheories().length} theories registered`);
}

// ── Dashboard Commands ────────────────────────────────────────────────────────

export async function runExperimentCommand(
  experimentId: string,
  screenplay: FountainAnalysis
): Promise<void> {
  console.log(`\n=== Running Experiment: ${experimentId} ===\n`);
  
  const result = await researchAPI.runExperiment(experimentId, screenplay);
  
  console.log(`Experiment: ${result.experimentName}`);
  console.log(`Hypothesis: ${result.hypothesisSupported ? 'SUPPORTED' : 'NOT SUPPORTED'}`);
  console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
  console.log(`\nMeasurements:`);
  
  for (const [key, value] of Object.entries(result.measurements)) {
    console.log(`  ${key}: ${typeof value === 'number' ? value.toFixed(2) : value}`);
  }
  
  console.log(`\nFindings:`);
  for (const finding of result.findings) {
    console.log(`  • ${finding}`);
  }
  
  console.log(`\nExecuted: ${new Date(result.executedAt).toISOString()}`);
}

export async function compareTheoriesCommand(
  theoryIds: string[],
  screenplay: FountainAnalysis
): Promise<void> {
  console.log(`\n=== Comparing ${theoryIds.length} Theories ===\n`);
  
  const comparison = await researchAPI.compareTheories(theoryIds, screenplay);
  
  console.log(`Screenplay: ${comparison.screenplay.sceneCount} scenes, ${comparison.screenplay.wordCount} words\n`);
  
  console.log('Theory Results:');
  for (const result of comparison.theoryResults) {
    console.log(`\n  ${result.theoryName}:`);
    console.log(`    Adherence: ${result.adherenceScore.toFixed(1)}%`);
    console.log(`    Shape: ${result.shape}`);
    console.log(`    Stages detected: ${result.stages.length}`);
    
    if (result.observations.length > 0) {
      console.log(`    Observations:`);
      for (const obs of result.observations.slice(0, 3)) {
        console.log(`      • ${obs}`);
      }
    }
  }
  
  console.log(`\n✓ Best Fit: ${comparison.bestFit.theoryName} (${comparison.bestFit.adherenceScore.toFixed(1)}%)`);
  console.log(`  ${comparison.bestFit.reason}`);
  
  if (comparison.agreements.length > 0) {
    console.log(`\nAgreements:`);
    for (const agreement of comparison.agreements) {
      console.log(`  • ${agreement}`);
    }
  }
  
  if (comparison.disagreements.length > 0) {
    console.log(`\nDisagreements:`);
    for (const disagreement of comparison.disagreements) {
      console.log(`  • ${disagreement}`);
    }
  }
}

export async function analyzeWithTheoryCommand(
  theoryId: string,
  screenplay: FountainAnalysis
): Promise<void> {
  console.log(`\n=== Analyzing with Theory: ${theoryId} ===\n`);
  
  const theory = researchAPI.getTheory(theoryId);
  if (!theory) {
    console.error(`Error: Theory '${theoryId}' not found`);
    return;
  }
  
  const result = await theory.analyze(screenplay);
  
  console.log(`Theory: ${result.theoryName}`);
  console.log(`Adherence Score: ${result.adherenceScore.toFixed(1)}%`);
  console.log(`Narrative Shape: ${result.shape}\n`);
  
  console.log('Detected Stages:');
  for (const stage of result.stages) {
    const confidence = (stage.confidence * 100).toFixed(0);
    const bar = '█'.repeat(Math.floor(stage.confidence * 20));
    console.log(`  ${stage.name.padEnd(30)} ${bar} ${confidence}%`);
    console.log(`    Scenes ${stage.startSceneIdx + 1}-${stage.endSceneIdx + 1}: ${stage.description}`);
  }
  
  console.log(`\nObservations:`);
  for (const obs of result.observations) {
    console.log(`  • ${obs}`);
  }
  
  if (Object.keys(result.metrics).length > 0) {
    console.log(`\nMetrics:`);
    for (const [key, value] of Object.entries(result.metrics)) {
      console.log(`  ${key}: ${typeof value === 'number' ? value.toFixed(3) : value}`);
    }
  }
}

export function listAvailableCommand(): void {
  console.log('\n=== Research Platform Resources ===\n');
  
  console.log('Experiments:');
  for (const exp of researchAPI.getExperiments()) {
    console.log(`  - ${exp.id}: ${exp.name}`);
    console.log(`    Hypothesis: ${exp.hypothesis}`);
  }
  
  console.log('\nTheories:');
  for (const theory of researchAPI.getTheories()) {
    console.log(`  - ${theory.id}: ${theory.name}`);
    console.log(`    ${theory.description}`);
    if (theory.source) {
      console.log(`    Source: ${theory.source}`);
    }
  }
  
  console.log('\nCorpora:');
  const corpora = researchAPI.getCorpora();
  if (corpora.length === 0) {
    console.log('  (no corpora registered)');
  } else {
    for (const corpus of corpora) {
      console.log(`  - ${corpus.id}: ${corpus.name} (${corpus.count} screenplays)`);
    }
  }
  
  const stats = researchAPI.getStats();
  console.log(`\nStats: ${stats.experiments} experiments, ${stats.theories} theories, ${stats.corpora} corpora, ${stats.sessions} sessions`);
}

export function createSessionCommand(name: string, description: string): string {
  const session = researchAPI.createSession(name, description);
  console.log(`\n✓ Created research session: ${session.name}`);
  console.log(`  ID: ${session.id}`);
  console.log(`  ${session.description}`);
  return session.id;
}

export function exportSessionCommand(sessionId: string): void {
  const exportData = researchAPI.exportSession(sessionId);
  
  console.log(`\n=== Research Session Export ===\n`);
  console.log(`Session: ${exportData.session.name}`);
  console.log(`Description: ${exportData.session.description}`);
  console.log(`Created: ${new Date(exportData.session.createdAt).toISOString()}`);
  console.log(`Updated: ${new Date(exportData.session.updatedAt).toISOString()}\n`);
  
  console.log(`Results:`);
  console.log(`  - ${exportData.session.experiments.length} experiment results`);
  console.log(`  - ${exportData.session.theories.length} theory analyses`);
  console.log(`  - ${exportData.session.comparisons.length} theory comparisons`);
  console.log(`  - ${exportData.session.validations.length} hypothesis validations`);
  console.log(`  - ${exportData.session.notes.length} notes`);
  
  if (exportData.session.notes.length > 0) {
    console.log(`\nNotes:`);
    for (const note of exportData.session.notes) {
      console.log(`  • ${note}`);
    }
  }
  
  console.log(`\nExported: ${new Date(exportData.exportedAt).toISOString()}`);
}

// ── Example Usage ─────────────────────────────────────────────────────────────

export async function runExample(screenplay: FountainAnalysis) {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║        V5.0 NARRATIVE RESEARCH PLATFORM - DEMO             ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  initializeResearchPlatform();
  
  // Create a research session
  const sessionId = createSessionCommand(
    'Narrative Structure Analysis Demo',
    'Demonstrating research platform capabilities'
  );
  
  // List available resources
  listAvailableCommand();
  
  // Run an experiment
  await runExperimentCommand('setup-payoff-distance', screenplay);
  
  // Compare theories
  await compareTheoriesCommand(
    ['campbell-hero-journey', 'freytag-pyramid'],
    screenplay
  );
  
  // Analyze with specific theory
  await analyzeWithTheoryCommand('campbell-hero-journey', screenplay);
  
  // Export session
  exportSessionCommand(sessionId);
  
  console.log('\n✓ Demo complete');
}
