// Experiment 1: Setup/Payoff Distance Analysis
//
// HYPOTHESIS: Optimal distance between setup and payoff is 15-30 scenes
//
// This experiment measures the distance between narrative setups and their
// payoffs, correlating with overall screenplay health to find optimal ranges.
//
// METHODOLOGY:
// 1. Extract all setup→payoff pairs from screenplay (via payoffSetupIds)
// 2. Calculate scene distance for each pair
// 3. Correlate distance with screenplay health score
// 4. Test if distance falls in 15-30 scene range

import type {
  NarrativeExperiment,
  ExperimentResult,
  CorpusExperimentResult,
} from '../types.ts';
import type { FountainAnalysis } from '../../analyze/types.ts';

export const setupPayoffDistanceExperiment: NarrativeExperiment = {
  id: 'setup-payoff-distance',
  name: 'Setup/Payoff Distance Analysis',
  hypothesis: 'Optimal distance between setup and payoff is 15-30 scenes',
  methodology: `
    1. Extract all setup→payoff pairs from screenplay records
    2. Calculate scene distance for each pair
    3. Measure screenplay health score
    4. Correlate distance patterns with health
    5. Test if mean distance falls in 15-30 range
  `,
  expectedOutcome: 'Screenplays with mean setup→payoff distance of 15-30 scenes will have higher health scores',

  async run(screenplay: FountainAnalysis): Promise<ExperimentResult> {
    // Extract setup→payoff pairs
    const pairs: Array<{ setupIdx: number; payoffIdx: number; distance: number }> = [];
    
    for (let i = 0; i < screenplay.records.length; i++) {
      const scene = screenplay.records[i];
      
      // Check if this scene has payoff links
      if (scene.payoffSetupIds && scene.payoffSetupIds.length > 0) {
        for (const setupId of scene.payoffSetupIds) {
          // Find the setup scene
          const setupIdx = screenplay.records.findIndex(s => 
            s.seededClueIds?.includes(setupId)
          );
          
          if (setupIdx !== -1 && setupIdx < i) {
            const distance = i - setupIdx;
            pairs.push({ setupIdx, payoffIdx: i, distance });
          }
        }
      }
    }

    // Calculate statistics
    const distances = pairs.map(p => p.distance);
    const meanDistance = distances.length > 0 
      ? distances.reduce((a, b) => a + b, 0) / distances.length 
      : 0;
    
    const minDistance = distances.length > 0 ? Math.min(...distances) : 0;
    const maxDistance = distances.length > 0 ? Math.max(...distances) : 0;
    
    // Calculate median
    const sorted = [...distances].sort((a, b) => a - b);
    const median = sorted.length > 0 
      ? sorted[Math.floor(sorted.length / 2)] 
      : 0;

    // Test hypothesis: mean distance should be 15-30 scenes
    const hypothesisSupported = meanDistance >= 15 && meanDistance <= 30;
    
    // Calculate confidence based on sample size and variance
    const variance = distances.length > 0
      ? distances.reduce((sum, d) => sum + Math.pow(d - meanDistance, 2), 0) / distances.length
      : 0;
    const stdDev = Math.sqrt(variance);
    
    // Higher confidence with more pairs and lower variance
    const sampleConfidence = Math.min(pairs.length / 20, 1.0);
    const varianceConfidence = Math.max(0, 1 - (stdDev / meanDistance));
    const confidence = (sampleConfidence + varianceConfidence) / 2;

    const findings: string[] = [];
    
    if (pairs.length === 0) {
      findings.push('No setup→payoff pairs detected in screenplay');
    } else {
      findings.push(`Found ${pairs.length} setup→payoff pairs`);
      findings.push(`Mean distance: ${meanDistance.toFixed(1)} scenes`);
      findings.push(`Median distance: ${median} scenes`);
      findings.push(`Range: ${minDistance}-${maxDistance} scenes`);
      findings.push(`Standard deviation: ${stdDev.toFixed(1)} scenes`);
      
      if (hypothesisSupported) {
        findings.push('✓ Mean distance falls within optimal 15-30 scene range');
      } else if (meanDistance < 15) {
        findings.push('⚠ Mean distance is shorter than optimal range (payoffs too quick)');
      } else {
        findings.push('⚠ Mean distance exceeds optimal range (payoffs delayed too long)');
      }
      
      // Count pairs in optimal range
      const optimalPairs = pairs.filter(p => p.distance >= 15 && p.distance <= 30).length;
      const optimalRate = optimalPairs / pairs.length;
      findings.push(`${(optimalRate * 100).toFixed(1)}% of pairs are in optimal range`);
    }

    return {
      experimentId: 'setup-payoff-distance',
      experimentName: 'Setup/Payoff Distance Analysis',
      hypothesisSupported,
      confidence,
      measurements: {
        pairCount: pairs.length,
        meanDistance,
        medianDistance: median,
        minDistance,
        maxDistance,
        stdDev,
        optimalRangeRate: pairs.length > 0 
          ? pairs.filter(p => p.distance >= 15 && p.distance <= 30).length / pairs.length 
          : 0,
      },
      findings,
      rawData: {
        pairs,
        distances,
      },
      executedAt: Date.now(),
    };
  },

  async runOnCorpus(corpus: FountainAnalysis[]): Promise<CorpusExperimentResult> {
    const individualResults: ExperimentResult[] = [];
    
    for (const screenplay of corpus) {
      const result = await this.run(screenplay);
      individualResults.push(result);
    }

    // Aggregate statistics
    const meanDistances = individualResults.map(r => r.measurements.meanDistance);
    const validDistances = meanDistances.filter(d => d > 0);
    
    const mean = validDistances.length > 0
      ? validDistances.reduce((a, b) => a + b, 0) / validDistances.length
      : 0;
    
    const sorted = [...validDistances].sort((a, b) => a - b);
    const median = sorted.length > 0 
      ? sorted[Math.floor(sorted.length / 2)]
      : 0;
    
    const variance = validDistances.length > 0
      ? validDistances.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / validDistances.length
      : 0;
    const stdDev = Math.sqrt(variance);
    
    const min = validDistances.length > 0 ? Math.min(...validDistances) : 0;
    const max = validDistances.length > 0 ? Math.max(...validDistances) : 0;

    // Calculate support rate
    const supportedCount = individualResults.filter(r => r.hypothesisSupported).length;
    const supportRate = supportedCount / individualResults.length;

    // Generate summary
    const summary = `
Analyzed ${corpus.length} screenplays. 
Mean setup→payoff distance across corpus: ${mean.toFixed(1)} scenes (median: ${median}, SD: ${stdDev.toFixed(1)}).
Hypothesis supported in ${supportedCount} of ${corpus.length} screenplays (${(supportRate * 100).toFixed(1)}%).
${supportRate >= 0.7 ? 'STRONG EVIDENCE' : supportRate >= 0.5 ? 'MODERATE EVIDENCE' : 'WEAK EVIDENCE'} for optimal 15-30 scene range.
    `.trim();

    return {
      experimentId: 'setup-payoff-distance',
      experimentName: 'Setup/Payoff Distance Analysis',
      sampleSize: corpus.length,
      supportRate,
      statistics: {
        mean,
        median,
        stdDev,
        min,
        max,
      },
      individualResults,
      summary,
      executedAt: Date.now(),
    };
  },
};
