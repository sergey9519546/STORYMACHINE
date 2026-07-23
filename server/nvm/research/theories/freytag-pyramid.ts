// Theory 2: Freytag's Pyramid
//
// Implementation of Gustav Freytag's five-act dramatic structure.
// Originally developed to analyze ancient Greek and Shakespearean drama,
// this structure maps the rise and fall of dramatic action.
//
// SOURCE: "Die Technik des Dramas" (1863)
//
// FIVE PARTS:
//   1. Exposition - Introduction of characters, setting, and conflict
//   2. Rising Action - Complications and escalating tension
//   3. Climax - Turning point, highest tension (at or near middle)
//   4. Falling Action - Consequences unfold, tension decreases
//   5. Dénouement/Resolution - Final outcome and restoration of order

import type {
  NarrativeTheory,
  TheoryAnalysisResult,
  TheoryValidationResult,
  TheoryStage,
} from '../types.ts';
import type { FountainAnalysis } from '../../analyze/types.ts';

export const freytagPyramid: NarrativeTheory = {
  id: 'freytag-pyramid',
  name: "Freytag's Pyramid",
  description: 'Five-act structure with rising and falling action around a central climax',
  source: 'Gustav Freytag, "Die Technik des Dramas" (1863)',

  async analyze(screenplay: FountainAnalysis): Promise<TheoryAnalysisResult> {
    const records = screenplay.records;
    const stages: TheoryStage[] = [];
    
    // Use Story Graph escalation metrics to detect climax
    const tensions = records.map(s => s.tension || 0);
    
    // Find the climax (highest tension point)
    let climaxIdx = 0;
    let maxTension = 0;
    
    for (let i = 0; i < tensions.length; i++) {
      if (tensions[i] > maxTension) {
        maxTension = tensions[i];
        climaxIdx = i;
      }
    }
    
    // Freytag's climax should be near the middle (40-60% range)
    const climaxPosition = climaxIdx / records.length;
    const isFreytagClimax = climaxPosition >= 0.40 && climaxPosition <= 0.60;
    
    // Define stage boundaries based on climax position
    const totalScenes = records.length;
    
    // 1. Exposition (0-20%)
    const expositionEnd = Math.floor(totalScenes * 0.20);
    stages.push({
      name: 'Exposition',
      startSceneIdx: 0,
      endSceneIdx: expositionEnd,
      confidence: detectExposition(records.slice(0, expositionEnd)),
      description: 'Introduction of characters, setting, and initial conflict',
    });
    
    // 2. Rising Action (20% to climax)
    const risingActionStart = expositionEnd;
    const risingActionEnd = climaxIdx;
    stages.push({
      name: 'Rising Action',
      startSceneIdx: risingActionStart,
      endSceneIdx: risingActionEnd,
      confidence: detectRisingAction(records.slice(risingActionStart, risingActionEnd)),
      description: 'Complications develop and tension escalates',
    });
    
    // 3. Climax (at highest tension point)
    const climaxStart = Math.max(0, climaxIdx - 2);
    const climaxEnd = Math.min(totalScenes - 1, climaxIdx + 2);
    stages.push({
      name: 'Climax',
      startSceneIdx: climaxStart,
      endSceneIdx: climaxEnd,
      confidence: isFreytagClimax ? 0.9 : 0.5,
      description: 'Turning point and highest dramatic tension',
    });
    
    // 4. Falling Action (climax to 85%)
    const fallingActionStart = climaxEnd;
    const fallingActionEnd = Math.floor(totalScenes * 0.85);
    stages.push({
      name: 'Falling Action',
      startSceneIdx: fallingActionStart,
      endSceneIdx: fallingActionEnd,
      confidence: detectFallingAction(records.slice(fallingActionStart, fallingActionEnd), tensions.slice(fallingActionStart, fallingActionEnd)),
      description: 'Consequences of climax unfold, tension decreases',
    });
    
    // 5. Dénouement/Resolution (85-100%)
    const resolutionStart = fallingActionEnd;
    stages.push({
      name: 'Dénouement (Resolution)',
      startSceneIdx: resolutionStart,
      endSceneIdx: totalScenes - 1,
      confidence: detectResolution(records.slice(resolutionStart)),
      description: 'Final outcome and restoration of equilibrium',
    });
    
    // Calculate adherence score
    const avgConfidence = stages.reduce((sum, s) => sum + s.confidence, 0) / stages.length;
    
    // Bonus for proper pyramid shape
    const pyramidBonus = calculatePyramidShape(tensions, climaxIdx);
    
    const adherenceScore = Math.min(100, (avgConfidence * 0.7 + pyramidBonus * 0.3) * 100);
    
    // Determine narrative shape
    let shape: string;
    if (adherenceScore > 75 && isFreytagClimax) {
      shape = 'Classic Freytag Pyramid';
    } else if (adherenceScore > 60) {
      shape = 'Modified Pyramid Structure';
    } else if (climaxPosition > 0.7) {
      shape = 'Modern Three-Act (Late Climax)';
    } else {
      shape = 'Non-Pyramidal Structure';
    }
    
    // Generate observations
    const observations: string[] = [];
    
    observations.push(`Climax detected at scene ${climaxIdx + 1} (${(climaxPosition * 100).toFixed(1)}% position)`);
    
    if (isFreytagClimax) {
      observations.push('✓ Climax positioned classically at midpoint (Freytag structure)');
    } else if (climaxPosition > 0.7) {
      observations.push('Climax positioned late (modern three-act structure)');
    } else {
      observations.push('Climax positioned early (non-traditional structure)');
    }
    
    // Check for symmetric rise and fall
    const preClimaxSlope = calculateSlope(tensions.slice(0, climaxIdx));
    const postClimaxSlope = calculateSlope(tensions.slice(climaxIdx));
    
    if (preClimaxSlope > 0 && postClimaxSlope < 0) {
      observations.push('✓ Tension rises to climax and falls after (pyramid shape)');
    } else if (preClimaxSlope > 0 && postClimaxSlope >= 0) {
      observations.push('Tension continues rising after peak (multiple climaxes)');
    } else {
      observations.push('Irregular tension pattern (non-pyramidal)');
    }
    
    // Stage strength analysis
    const strongStages = stages.filter(s => s.confidence > 0.7);
    const weakStages = stages.filter(s => s.confidence < 0.4);
    
    if (strongStages.length >= 4) {
      observations.push(`Strong ${strongStages.length}/5 stages detected`);
    }
    
    if (weakStages.length > 0) {
      observations.push(`Weak stages: ${weakStages.map(s => s.name).join(', ')}`);
    }
    
    return {
      theoryId: 'freytag-pyramid',
      theoryName: "Freytag's Pyramid",
      adherenceScore,
      stages,
      shape,
      observations,
      metrics: {
        climaxPosition,
        climaxTension: maxTension,
        preClimaxSlope,
        postClimaxSlope,
        pyramidSymmetry: Math.abs(preClimaxSlope + postClimaxSlope),
      },
      analyzedAt: Date.now(),
    };
  },

  async validate(screenplay: FountainAnalysis): Promise<TheoryValidationResult> {
    const analysis = await this.analyze(screenplay);
    
    const isValid = analysis.adherenceScore >= 60;
    
    const presentElements = analysis.stages
      .filter(s => s.confidence > 0.5)
      .map(s => s.name);
    
    const missingElements = analysis.stages
      .filter(s => s.confidence <= 0.5)
      .map(s => s.name);
    
    const suggestions: string[] = [];
    
    if (missingElements.includes('Exposition')) {
      suggestions.push('Strengthen opening scenes to clearly establish characters, setting, and conflict');
    }
    
    if (missingElements.includes('Rising Action')) {
      suggestions.push('Build more complications and escalating tension toward the climax');
    }
    
    if (missingElements.includes('Climax')) {
      suggestions.push('Create a stronger climactic moment near the screenplay\'s midpoint');
    }
    
    if (missingElements.includes('Falling Action')) {
      suggestions.push('Show consequences of the climax unfolding with decreasing tension');
    }
    
    if (missingElements.includes('Dénouement (Resolution)')) {
      suggestions.push('Provide clear resolution that restores equilibrium');
    }
    
    // Position-specific suggestions
    const climaxPosition = analysis.metrics.climaxPosition as number;
    if (climaxPosition < 0.40) {
      suggestions.push('Consider moving the major climax later (Freytag places it near the middle)');
    } else if (climaxPosition > 0.60) {
      suggestions.push('Climax is positioned late (more modern structure than classic Freytag)');
    }
    
    // Tension pattern suggestions
    const preSlope = analysis.metrics.preClimaxSlope as number;
    const postSlope = analysis.metrics.postClimaxSlope as number;
    
    if (preSlope <= 0) {
      suggestions.push('Increase tension steadily toward the climax (rising action should escalate)');
    }
    
    if (postSlope >= 0) {
      suggestions.push('Allow tension to decrease after climax (falling action should wind down)');
    }
    
    return {
      isValid,
      adherenceScore: analysis.adherenceScore,
      missingElements,
      presentElements,
      suggestions,
    };
  },
};

// ── Stage Detection Functions ─────────────────────────────────────────────────

function detectExposition(scenes: any[]): number {
  // Low to moderate tension, character introductions
  const avgTension = scenes.reduce((sum, s) => sum + (s.tension || 0), 0) / (scenes.length || 1);
  const hasIntroductions = scenes.some(s => s.characterIntroductions?.length > 0);
  
  // Exposition should have lower tension
  const tensionFit = avgTension < 0.4 ? 1.0 : 0.5;
  const introBonus = hasIntroductions ? 0.3 : 0;
  
  return Math.min(1.0, tensionFit + introBonus);
}

function detectRisingAction(scenes: any[]): number {
  if (scenes.length < 2) return 0.3;
  
  // Tension should generally increase
  const tensions = scenes.map(s => s.tension || 0);
  const slope = calculateSlope(tensions);
  
  // Positive slope = rising tension
  if (slope > 0.01) return 0.8;
  if (slope > 0) return 0.6;
  return 0.3;
}

function detectFallingAction(scenes: any[], tensions: number[]): number {
  if (scenes.length < 2) return 0.3;
  
  // Tension should generally decrease
  const slope = calculateSlope(tensions);
  
  // Negative slope = falling tension
  if (slope < -0.01) return 0.8;
  if (slope < 0) return 0.6;
  return 0.3;
}

function detectResolution(scenes: any[]): number {
  // Low tension, resolution purpose, tying up loose ends
  const avgTension = scenes.reduce((sum, s) => sum + (s.tension || 0), 0) / (scenes.length || 1);
  const hasResolution = scenes.some(s => s.purpose === 'resolution');
  
  const tensionFit = avgTension < 0.3 ? 1.0 : 0.5;
  const resolutionBonus = hasResolution ? 0.3 : 0;
  
  return Math.min(1.0, tensionFit + resolutionBonus);
}

function calculateSlope(values: number[]): number {
  if (values.length < 2) return 0;
  
  // Simple linear regression slope
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((sum, v) => sum + v, 0) / n;
  
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += Math.pow(i - xMean, 2);
  }
  
  return denominator !== 0 ? numerator / denominator : 0;
}

function calculatePyramidShape(tensions: number[], climaxIdx: number): number {
  if (tensions.length < 3) return 0;
  
  // Measure how well the tension follows a pyramid shape
  const preClimax = tensions.slice(0, climaxIdx);
  const postClimax = tensions.slice(climaxIdx);
  
  const preSlope = calculateSlope(preClimax);
  const postSlope = calculateSlope(postClimax);
  
  // Ideal: positive pre-slope, negative post-slope
  let score = 0;
  
  if (preSlope > 0) score += 0.5;
  if (postSlope < 0) score += 0.5;
  
  // Bonus for symmetry
  const symmetry = 1 - Math.abs(Math.abs(preSlope) - Math.abs(postSlope));
  score += symmetry * 0.2;
  
  return Math.min(1.0, score);
}
