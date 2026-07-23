// Theory 1: Campbell's Hero's Journey
//
// Implementation of Joseph Campbell's monomyth structure.
// The Hero's Journey is a narrative pattern found in myths and stories worldwide,
// consisting of three major acts with specific stages.
//
// SOURCE: "The Hero with a Thousand Faces" (1949)
//
// STAGES (17-stage version):
// Act I - Departure:
//   1. Ordinary World
//   2. Call to Adventure
//   3. Refusal of the Call
//   4. Meeting the Mentor
//   5. Crossing the First Threshold
//
// Act II - Initiation:
//   6. Tests, Allies, and Enemies
//   7. Approach to the Inmost Cave
//   8. Ordeal
//   9. Reward (Seizing the Sword)
//
// Act III - Return:
//   10. The Road Back
//   11. Resurrection
//   12. Return with the Elixir

import type {
  NarrativeTheory,
  TheoryAnalysisResult,
  TheoryValidationResult,
  TheoryStage,
} from '../types.ts';
import type { FountainAnalysis } from '../../analyze/types.ts';

export const campbellHeroJourney: NarrativeTheory = {
  id: 'campbell-hero-journey',
  name: "Campbell's Hero's Journey",
  description: 'The monomyth: a universal narrative pattern of departure, initiation, and return',
  source: 'Joseph Campbell, "The Hero with a Thousand Faces" (1949)',

  async analyze(screenplay: FountainAnalysis): Promise<TheoryAnalysisResult> {
    const records = screenplay.records;
    const stages: TheoryStage[] = [];
    
    // Calculate stage boundaries based on scene count
    const totalScenes = records.length;
    
    // Act I: Departure (0-25%)
    const act1End = Math.floor(totalScenes * 0.25);
    
    // Act II: Initiation (25-75%)
    const act2End = Math.floor(totalScenes * 0.75);
    
    // Act III: Return (75-100%)
    
    // Stage 1: Ordinary World (0-10%)
    const ordinaryWorldEnd = Math.floor(totalScenes * 0.10);
    stages.push({
      name: 'Ordinary World',
      startSceneIdx: 0,
      endSceneIdx: ordinaryWorldEnd,
      confidence: detectOrdinaryWorld(records.slice(0, ordinaryWorldEnd)),
      description: 'Hero in their normal life before the adventure',
    });
    
    // Stage 2: Call to Adventure (10-15%)
    const callStart = ordinaryWorldEnd;
    const callEnd = Math.floor(totalScenes * 0.15);
    stages.push({
      name: 'Call to Adventure',
      startSceneIdx: callStart,
      endSceneIdx: callEnd,
      confidence: detectCallToAdventure(records.slice(callStart, callEnd)),
      description: 'Inciting incident that disrupts the ordinary world',
    });
    
    // Stage 3: Refusal of the Call (15-20%)
    const refusalStart = callEnd;
    const refusalEnd = Math.floor(totalScenes * 0.20);
    stages.push({
      name: 'Refusal of the Call',
      startSceneIdx: refusalStart,
      endSceneIdx: refusalEnd,
      confidence: detectRefusal(records.slice(refusalStart, refusalEnd)),
      description: 'Hero hesitates or declines the adventure',
    });
    
    // Stage 4: Meeting the Mentor (20-25%)
    const mentorStart = refusalEnd;
    const mentorEnd = act1End;
    stages.push({
      name: 'Meeting the Mentor',
      startSceneIdx: mentorStart,
      endSceneIdx: mentorEnd,
      confidence: detectMentor(records.slice(mentorStart, mentorEnd)),
      description: 'Hero gains guidance, training, or magical aid',
    });
    
    // Stage 5: Crossing the Threshold (25-30%)
    const thresholdStart = act1End;
    const thresholdEnd = Math.floor(totalScenes * 0.30);
    stages.push({
      name: 'Crossing the First Threshold',
      startSceneIdx: thresholdStart,
      endSceneIdx: thresholdEnd,
      confidence: detectThresholdCrossing(records.slice(thresholdStart, thresholdEnd)),
      description: 'Hero commits to the adventure and enters the special world',
    });
    
    // Stage 6: Tests, Allies, Enemies (30-50%)
    const testsStart = thresholdEnd;
    const testsEnd = Math.floor(totalScenes * 0.50);
    stages.push({
      name: 'Tests, Allies, and Enemies',
      startSceneIdx: testsStart,
      endSceneIdx: testsEnd,
      confidence: detectTests(records.slice(testsStart, testsEnd)),
      description: 'Hero faces challenges and forms relationships',
    });
    
    // Stage 7: Approach to Inmost Cave (50-60%)
    const approachStart = testsEnd;
    const approachEnd = Math.floor(totalScenes * 0.60);
    stages.push({
      name: 'Approach to the Inmost Cave',
      startSceneIdx: approachStart,
      endSceneIdx: approachEnd,
      confidence: detectApproach(records.slice(approachStart, approachEnd)),
      description: 'Hero prepares for the central ordeal',
    });
    
    // Stage 8: Ordeal (60-65%)
    const ordealStart = approachEnd;
    const ordealEnd = Math.floor(totalScenes * 0.65);
    stages.push({
      name: 'Ordeal',
      startSceneIdx: ordealStart,
      endSceneIdx: ordealEnd,
      confidence: detectOrdeal(records.slice(ordealStart, ordealEnd)),
      description: 'Hero faces death or greatest fear (midpoint crisis)',
    });
    
    // Stage 9: Reward (65-75%)
    const rewardStart = ordealEnd;
    const rewardEnd = act2End;
    stages.push({
      name: 'Reward (Seizing the Sword)',
      startSceneIdx: rewardStart,
      endSceneIdx: rewardEnd,
      confidence: detectReward(records.slice(rewardStart, rewardEnd)),
      description: 'Hero gains treasure, knowledge, or reconciliation',
    });
    
    // Stage 10: The Road Back (75-85%)
    const roadBackStart = act2End;
    const roadBackEnd = Math.floor(totalScenes * 0.85);
    stages.push({
      name: 'The Road Back',
      startSceneIdx: roadBackStart,
      endSceneIdx: roadBackEnd,
      confidence: detectRoadBack(records.slice(roadBackStart, roadBackEnd)),
      description: 'Hero commits to returning home, often pursued',
    });
    
    // Stage 11: Resurrection (85-95%)
    const resurrectionStart = roadBackEnd;
    const resurrectionEnd = Math.floor(totalScenes * 0.95);
    stages.push({
      name: 'Resurrection',
      startSceneIdx: resurrectionStart,
      endSceneIdx: resurrectionEnd,
      confidence: detectResurrection(records.slice(resurrectionStart, resurrectionEnd)),
      description: 'Final test where hero is purified and transformed',
    });
    
    // Stage 12: Return with Elixir (95-100%)
    const returnStart = resurrectionEnd;
    stages.push({
      name: 'Return with the Elixir',
      startSceneIdx: returnStart,
      endSceneIdx: totalScenes - 1,
      confidence: detectReturn(records.slice(returnStart)),
      description: 'Hero returns to ordinary world with wisdom or treasure',
    });
    
    // Calculate overall adherence score
    const avgConfidence = stages.reduce((sum, s) => sum + s.confidence, 0) / stages.length;
    const adherenceScore = avgConfidence * 100;
    
    // Determine narrative shape
    const shape = adherenceScore > 75 
      ? 'Classic Hero\'s Journey' 
      : adherenceScore > 50 
      ? 'Modified Hero\'s Journey' 
      : 'Non-traditional structure';
    
    // Generate observations
    const observations: string[] = [];
    const strongStages = stages.filter(s => s.confidence > 0.7);
    const weakStages = stages.filter(s => s.confidence < 0.4);
    
    observations.push(`Detected ${strongStages.length} of 12 stages with high confidence`);
    
    if (strongStages.length > 0) {
      observations.push(`Strong stages: ${strongStages.map(s => s.name).join(', ')}`);
    }
    
    if (weakStages.length > 0) {
      observations.push(`Weak/missing stages: ${weakStages.map(s => s.name).join(', ')}`);
    }
    
    // Check for complete journey
    const hasAllActs = 
      stages.slice(0, 4).some(s => s.confidence > 0.6) &&  // Act I
      stages.slice(4, 9).some(s => s.confidence > 0.6) &&  // Act II
      stages.slice(9).some(s => s.confidence > 0.6);       // Act III
    
    if (hasAllActs) {
      observations.push('Complete three-act journey structure present');
    } else {
      observations.push('Journey structure incomplete or non-traditional');
    }
    
    return {
      theoryId: 'campbell-hero-journey',
      theoryName: "Campbell's Hero's Journey",
      adherenceScore,
      stages,
      shape,
      observations,
      metrics: {
        departureStrength: stages.slice(0, 5).reduce((sum, s) => sum + s.confidence, 0) / 5,
        initiationStrength: stages.slice(5, 9).reduce((sum, s) => sum + s.confidence, 0) / 4,
        returnStrength: stages.slice(9).reduce((sum, s) => sum + s.confidence, 0) / 3,
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
    
    if (missingElements.includes('Call to Adventure')) {
      suggestions.push('Strengthen the inciting incident that disrupts the hero\'s ordinary world');
    }
    
    if (missingElements.includes('Ordeal')) {
      suggestions.push('Add a midpoint crisis where the hero faces their greatest fear');
    }
    
    if (missingElements.includes('Resurrection')) {
      suggestions.push('Include a final test that demonstrates the hero\'s transformation');
    }
    
    if (analysis.metrics.departureStrength < 0.5) {
      suggestions.push('Develop Act I to establish the ordinary world and the call to adventure more clearly');
    }
    
    if (analysis.metrics.initiationStrength < 0.5) {
      suggestions.push('Strengthen Act II with more tests, challenges, and character development');
    }
    
    if (analysis.metrics.returnStrength < 0.5) {
      suggestions.push('Clarify the hero\'s return and what they bring back to the ordinary world');
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

function detectOrdinaryWorld(scenes: any[]): number {
  // Low tension, establishing character and world
  const avgTension = scenes.reduce((sum, s) => sum + (s.tension || 0), 0) / (scenes.length || 1);
  return avgTension < 0.3 ? 0.8 : 0.4;
}

function detectCallToAdventure(scenes: any[]): number {
  // Sudden tension increase, revelation, or disruption
  const hasReveal = scenes.some(s => s.purpose === 'reveal');
  const tensionIncrease = scenes.length > 1 
    ? (scenes[scenes.length - 1].tension || 0) - (scenes[0].tension || 0)
    : 0;
  return hasReveal || tensionIncrease > 0.2 ? 0.7 : 0.3;
}

function detectRefusal(scenes: any[]): number {
  // Conflict or hesitation before commitment
  const hasConflict = scenes.some(s => s.conflictType === 'internal');
  return hasConflict ? 0.6 : 0.3;
}

function detectMentor(scenes: any[]): number {
  // New character introduction with knowledge transfer
  const hasNewCharacter = scenes.some(s => s.characterIntroductions?.length > 0);
  return hasNewCharacter ? 0.6 : 0.4;
}

function detectThresholdCrossing(scenes: any[]): number {
  // Commitment decision, location change, point of no return
  const hasCommitment = scenes.some(s => s.purpose === 'commitment');
  return hasCommitment ? 0.8 : 0.5;
}

function detectTests(scenes: any[]): number {
  // Multiple challenges, relationship development
  const avgTension = scenes.reduce((sum, s) => sum + (s.tension || 0), 0) / (scenes.length || 1);
  const hasRelationships = scenes.some(s => s.relationshipShifts?.length > 0);
  return (avgTension > 0.4 && hasRelationships) ? 0.7 : 0.5;
}

function detectApproach(scenes: any[]): number {
  // Building tension, preparation
  const tensionTrend = scenes.length > 1
    ? (scenes[scenes.length - 1].tension || 0) - (scenes[0].tension || 0)
    : 0;
  return tensionTrend > 0.1 ? 0.7 : 0.4;
}

function detectOrdeal(scenes: any[]): number {
  // Highest tension, life/death stakes, midpoint
  const maxTension = Math.max(...scenes.map(s => s.tension || 0));
  const hasClimax = scenes.some(s => s.purpose === 'climax');
  return maxTension > 0.7 || hasClimax ? 0.8 : 0.4;
}

function detectReward(scenes: any[]): number {
  // Tension decrease, revelation, achievement
  const hasReveal = scenes.some(s => s.purpose === 'reveal');
  const tensionDrop = scenes.length > 1
    ? (scenes[0].tension || 0) - (scenes[scenes.length - 1].tension || 0)
    : 0;
  return hasReveal || tensionDrop > 0.2 ? 0.7 : 0.4;
}

function detectRoadBack(scenes: any[]): number {
  // New urgency, pursuit, tension rising again
  const avgTension = scenes.reduce((sum, s) => sum + (s.tension || 0), 0) / (scenes.length || 1);
  return avgTension > 0.5 ? 0.6 : 0.4;
}

function detectResurrection(scenes: any[]): number {
  // Final battle, transformation, highest stakes
  const maxTension = Math.max(...scenes.map(s => s.tension || 0));
  const hasClimax = scenes.some(s => s.purpose === 'climax');
  return maxTension > 0.8 || hasClimax ? 0.8 : 0.5;
}

function detectReturn(scenes: any[]): number {
  // Resolution, return to normalcy, demonstration of change
  const hasResolution = scenes.some(s => s.purpose === 'resolution');
  const lowTension = scenes.every(s => (s.tension || 0) < 0.3);
  return hasResolution || lowTension ? 0.7 : 0.4;
}
