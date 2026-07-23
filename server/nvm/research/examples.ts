// Example: Using the Research Platform
//
// This script demonstrates how to use V5.0 as a research platform
// to test narrative hypotheses and compare theories.

import {
  initializeResearchPlatform,
  researchAPI,
  listAvailableCommand,
  runExperimentCommand,
  compareTheoriesCommand,
  analyzeWithTheoryCommand,
  createSessionCommand,
  exportSessionCommand,
} from './index.ts';
import { analyzeFountainText } from '../analyze/fountain-analyzer.ts';
import type { FountainAnalysis, ScreenplayCorpus } from './types.ts';

// ── Example 1: Single Screenplay Analysis ────────────────────────────────────

async function example1_singleScreenplay() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  EXAMPLE 1: Single Screenplay Analysis                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  // Initialize platform
  initializeResearchPlatform();
  
  // Load a screenplay (you'd read from a .fountain file)
  const fountainText = `
Title: Example Thriller
Credit: Written by
Author: Research Team

INT. SAFE HOUSE - NIGHT

AGENT Carter (30s, hardened) watches the street through blinds.

CARTER
They're coming.

She pulls her weapon.

EXT. STREET - CONTINUOUS

BLACK SUVS approach.

  `.trim();
  
  const screenplay = await analyzeFountainText(fountainText);
  
  // Create a research session
  const sessionId = createSessionCommand(
    'Thriller Structure Analysis',
    'Testing setup/payoff patterns in thriller screenplay'
  );
  
  // Run experiment
  console.log('\n--- Running Setup/Payoff Distance Experiment ---');
  await runExperimentCommand('setup-payoff-distance', screenplay);
  
  // Compare theories
  console.log('\n--- Comparing Narrative Theories ---');
  await compareTheoriesCommand(
    ['campbell-hero-journey', 'freytag-pyramid'],
    screenplay
  );
  
  // Detailed theory analysis
  console.log('\n--- Detailed Hero\'s Journey Analysis ---');
  await analyzeWithTheoryCommand('campbell-hero-journey', screenplay);
  
  // Export results
  console.log('\n--- Exporting Session ---');
  exportSessionCommand(sessionId);
}

// ── Example 2: Corpus-Level Research ─────────────────────────────────────────

async function example2_corpusResearch() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  EXAMPLE 2: Corpus-Level Research                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  initializeResearchPlatform();
  
  // Create sample corpus (in production, load from files)
  const screenplays: FountainAnalysis[] = [];
  
  for (let i = 0; i < 5; i++) {
    const fountainText = `Title: Sample Screenplay ${i + 1}\n\nINT. SCENE - DAY\n\nSample content.`;
    const analysis = await analyzeFountainText(fountainText);
    screenplays.push(analysis);
  }
  
  const corpus: ScreenplayCorpus = {
    id: 'sample-corpus',
    name: 'Sample Screenplay Corpus',
    description: '5 sample screenplays for demonstration',
    screenplays: screenplays.map((analysis, i) => ({
      id: `screenplay-${i}`,
      title: `Sample ${i + 1}`,
      genre: 'thriller',
      fountainPath: `./datasets/sample-${i}.fountain`,
      analysis,
    })),
    count: 5,
    statistics: {
      totalScenes: screenplays.reduce((sum, s) => sum + s.sceneCount, 0),
      totalWords: screenplays.reduce((sum, s) => sum + s.wordCount, 0),
      avgScenesPerScreenplay: screenplays.reduce((sum, s) => sum + s.sceneCount, 0) / 5,
      avgWordsPerScreenplay: screenplays.reduce((sum, s) => sum + s.wordCount, 0) / 5,
    },
    createdAt: Date.now(),
  };
  
  researchAPI.registerCorpus(corpus);
  
  console.log(`Registered corpus: ${corpus.name} (${corpus.count} screenplays)`);
  
  // Run experiment on corpus
  console.log('\n--- Running Corpus-Level Experiment ---\n');
  
  const experiment = researchAPI.getExperiment('setup-payoff-distance');
  if (experiment) {
    const result = await experiment.runOnCorpus(screenplays);
    
    console.log(`Experiment: ${result.experimentName}`);
    console.log(`Sample Size: ${result.sampleSize}`);
    console.log(`Support Rate: ${(result.supportRate * 100).toFixed(1)}%`);
    console.log(`\nStatistics:`);
    console.log(`  Mean: ${result.statistics.mean.toFixed(2)}`);
    console.log(`  Median: ${result.statistics.median.toFixed(2)}`);
    console.log(`  Std Dev: ${result.statistics.stdDev.toFixed(2)}`);
    console.log(`  Range: ${result.statistics.min.toFixed(2)} - ${result.statistics.max.toFixed(2)}`);
    console.log(`\nSummary:\n${result.summary}`);
  }
}

// ── Example 3: Theory Validation ─────────────────────────────────────────────

async function example3_theoryValidation() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  EXAMPLE 3: Theory Validation                             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  initializeResearchPlatform();
  
  // Load screenplay
  const fountainText = `Title: Test Screenplay\n\nINT. ROOM - DAY\n\nA character enters.`;
  const screenplay = await analyzeFountainText(fountainText);
  
  // Test Hero's Journey
  console.log('--- Validating Hero\'s Journey Structure ---\n');
  
  const heroJourney = researchAPI.getTheory('campbell-hero-journey');
  if (heroJourney) {
    const validation = await heroJourney.validate(screenplay);
    
    console.log(`Valid Structure: ${validation.isValid ? 'YES' : 'NO'}`);
    console.log(`Adherence Score: ${validation.adherenceScore.toFixed(1)}%`);
    
    if (validation.presentElements.length > 0) {
      console.log(`\nPresent Elements (${validation.presentElements.length}):`);
      for (const element of validation.presentElements) {
        console.log(`  ✓ ${element}`);
      }
    }
    
    if (validation.missingElements.length > 0) {
      console.log(`\nMissing Elements (${validation.missingElements.length}):`);
      for (const element of validation.missingElements) {
        console.log(`  ✗ ${element}`);
      }
    }
    
    if (validation.suggestions.length > 0) {
      console.log(`\nSuggestions:`);
      for (const suggestion of validation.suggestions) {
        console.log(`  → ${suggestion}`);
      }
    }
  }
  
  // Test Freytag's Pyramid
  console.log('\n--- Validating Freytag\'s Pyramid Structure ---\n');
  
  const freytag = researchAPI.getTheory('freytag-pyramid');
  if (freytag) {
    const validation = await freytag.validate(screenplay);
    
    console.log(`Valid Structure: ${validation.isValid ? 'YES' : 'NO'}`);
    console.log(`Adherence Score: ${validation.adherenceScore.toFixed(1)}%`);
    
    if (validation.suggestions.length > 0) {
      console.log(`\nSuggestions:`);
      for (const suggestion of validation.suggestions) {
        console.log(`  → ${suggestion}`);
      }
    }
  }
}

// ── Example 4: Custom Experiment ─────────────────────────────────────────────

async function example4_customExperiment() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  EXAMPLE 4: Creating a Custom Experiment                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  initializeResearchPlatform();
  
  // Define custom experiment
  const customExperiment = {
    id: 'scene-length-variance',
    name: 'Scene Length Variance Analysis',
    hypothesis: 'Consistent scene length correlates with pacing quality',
    methodology: 'Measure variance in scene lengths and correlate with health score',
    expectedOutcome: 'Lower variance → higher health (more controlled pacing)',
    
    async run(screenplay: FountainAnalysis) {
      const sceneLengths = screenplay.records.map(r => r.wordCount || 0);
      const mean = sceneLengths.reduce((a, b) => a + b, 0) / sceneLengths.length;
      const variance = sceneLengths.reduce((sum, len) => sum + Math.pow(len - mean, 2), 0) / sceneLengths.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = mean > 0 ? stdDev / mean : 0;
      
      // Hypothesis: CV < 0.5 is good pacing
      const hypothesisSupported = coefficientOfVariation < 0.5;
      
      return {
        experimentId: 'scene-length-variance',
        experimentName: 'Scene Length Variance Analysis',
        hypothesisSupported,
        confidence: Math.min(screenplay.sceneCount / 20, 1.0),
        measurements: {
          sceneCount: screenplay.sceneCount,
          meanLength: mean,
          stdDev,
          coefficientOfVariation,
        },
        findings: [
          `${screenplay.sceneCount} scenes analyzed`,
          `Mean scene length: ${mean.toFixed(1)} words`,
          `Coefficient of variation: ${coefficientOfVariation.toFixed(3)}`,
          hypothesisSupported 
            ? '✓ Scene length variance within acceptable range' 
            : '⚠ High scene length variance (inconsistent pacing)',
        ],
        rawData: { sceneLengths },
        executedAt: Date.now(),
      };
    },
    
    async runOnCorpus(corpus: FountainAnalysis[]) {
      const individualResults = [];
      for (const screenplay of corpus) {
        individualResults.push(await this.run(screenplay));
      }
      
      const cvs = individualResults.map(r => r.measurements.coefficientOfVariation);
      const mean = cvs.reduce((a, b) => a + b, 0) / cvs.length;
      const supportRate = individualResults.filter(r => r.hypothesisSupported).length / corpus.length;
      
      return {
        experimentId: 'scene-length-variance',
        experimentName: 'Scene Length Variance Analysis',
        sampleSize: corpus.length,
        supportRate,
        statistics: {
          mean,
          median: cvs.sort((a, b) => a - b)[Math.floor(cvs.length / 2)],
          stdDev: Math.sqrt(cvs.reduce((sum, cv) => sum + Math.pow(cv - mean, 2), 0) / cvs.length),
          min: Math.min(...cvs),
          max: Math.max(...cvs),
        },
        individualResults,
        summary: `Analyzed ${corpus.length} screenplays. Mean CV: ${mean.toFixed(3)}. Hypothesis supported in ${(supportRate * 100).toFixed(1)}% of cases.`,
        executedAt: Date.now(),
      };
    },
  };
  
  // Register and run
  researchAPI.registerExperiment(customExperiment);
  
  console.log('Custom experiment registered!');
  console.log(`ID: ${customExperiment.id}`);
  console.log(`Hypothesis: ${customExperiment.hypothesis}\n`);
  
  // Test it
  const fountainText = `Title: Test\n\nINT. ROOM - DAY\n\nShort scene.\n\nINT. ANOTHER ROOM - DAY\n\nThis is a much longer scene with more dialogue and action.\n\nINT. THIRD ROOM - DAY\n\nMedium length.`;
  const screenplay = await analyzeFountainText(fountainText);
  
  const result = await customExperiment.run(screenplay);
  
  console.log('--- Experiment Results ---');
  console.log(`Hypothesis: ${result.hypothesisSupported ? 'SUPPORTED' : 'NOT SUPPORTED'}`);
  console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
  console.log('\nFindings:');
  for (const finding of result.findings) {
    console.log(`  ${finding}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║      V5.0 NARRATIVE RESEARCH PLATFORM - EXAMPLES           ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  // Run all examples
  await example1_singleScreenplay();
  await example2_corpusResearch();
  await example3_theoryValidation();
  await example4_customExperiment();
  
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  All examples complete!                                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  // Show available resources
  listAvailableCommand();
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main };
