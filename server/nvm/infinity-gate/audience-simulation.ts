// AUDIENCE SIMULATION ENGINE — Layer 4 of Infinity Gate
//
// Predicts how different audiences will react to a screenplay
// Simulates 100-1000 virtual viewers with demographics and psychographics
// Returns engagement scores, dropoff points, completion rate, viral potential

import type { Script, Scene } from '../types.ts';
import type { StoryGraphMetrics } from '../analyze/story-graph.ts';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AudienceProfile {
  // Demographics
  age: number;                    // 18-80
  gender: 'male' | 'female' | 'non-binary';
  culture: 'western' | 'asian' | 'latin' | 'african' | 'middle-eastern';
  education: 'high-school' | 'college' | 'graduate' | 'phd';
  
  // Psychographics (Big Five personality traits)
  personality: {
    openness: number;             // 0-1
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  
  // Genre preferences
  genrePreferences: Map<string, number>;  // genre -> preference (0-1)
  
  // Behavioral
  attentionSpan: number;          // Minutes before boredom
  thrillerTolerance: number;      // 0-1
  romanceAppeal: number;          // 0-1
}

export interface AudienceReport {
  // Overall metrics
  overallEngagement: number;      // 0-100
  completionRate: number;         // 0-1 (% who finish)
  recommendationScore: number;    // -100 to +100 (NPS style)
  viralPotential: number;         // 0-100 (social sharing likelihood)
  
  // Per-scene analysis
  sceneEngagement: number[];      // Engagement per scene
  dropoffPoints: number[];        // Scene indices with high dropoff
  peakMoments: number[];          // Scenes with highest engagement
  lulls: number[];                // Boring scenes
  
  // Emotional journey
  emotionalArc: EmotionalTrajectory[];
  
  // Segmented results
  byAge: Map<string, number>;          // "18-24" -> engagement
  byGender: Map<string, number>;       // "male" -> engagement
  byCulture: Map<string, number>;      // "western" -> engagement
  byGenreFan: Map<string, number>;     // "thriller_fan" -> engagement
  
  // Predictions
  predictedAudienceSize: number;       // Expected viewers (if released)
  targetDemographic: string;           // Best audience segment
  warnings: string[];                  // "Will lose 40% of viewers at Scene 23"
}

export interface EmotionalTrajectory {
  sceneIdx: number;
  valence: number;      // -1 to 1 (negative to positive)
  arousal: number;      // 0 to 1 (calm to excited)
  attention: number;    // 0 to 1 (bored to riveted)
}

// ── Audience Simulation Engine ────────────────────────────────────────────────

export class AudienceSimulationEngine {
  private audienceSize: number = 100;  // Default simulation size
  
  /**
   * Simulate audience reactions to a screenplay
   */
  async simulate(script: Script): Promise<AudienceReport> {
    // Generate diverse audience
    const audience = this.generateAudience(this.audienceSize);
    
    // Predict engagement for each audience member
    const individualResults = await Promise.all(
      audience.map(profile => this.predictIndividualEngagement(script, profile))
    );
    
    // Aggregate results
    return this.aggregateResults(individualResults, audience);
  }
  
  /**
   * Generate realistic audience with demographic diversity
   */
  private generateAudience(size: number): AudienceProfile[] {
    const profiles: AudienceProfile[] = [];
    
    for (let i = 0; i < size; i++) {
      profiles.push({
        age: this.sampleAge(),
        gender: this.sampleGender(),
        culture: this.sampleCulture(),
        education: this.sampleEducation(),
        personality: this.sampleBigFive(),
        genrePreferences: this.sampleGenrePreferences(),
        attentionSpan: this.sampleAttentionSpan(),
        thrillerTolerance: Math.random(),
        romanceAppeal: Math.random(),
      });
    }
    
    return profiles;
  }
  
  /**
   * Predict how one audience member will react
   */
  private async predictIndividualEngagement(
    script: Script,
    profile: AudienceProfile
  ): Promise<IndividualEngagement> {
    const sceneEngagement: number[] = [];
    let dropoffScene: number | null = null;
    let currentAttention = 1.0;
    
    for (let i = 0; i < script.scenes.length; i++) {
      const scene = script.scenes[i];
      
      // Calculate scene engagement
      const engagement = this.calculateSceneEngagement(scene, profile, currentAttention);
      sceneEngagement.push(engagement);
      
      // Update attention (degrades over time, boosted by high engagement)
      currentAttention = Math.max(0, currentAttention - 0.02 + engagement * 0.03);
      
      // Check dropoff (attention too low)
      if (currentAttention < 0.3 && dropoffScene === null) {
        dropoffScene = i;
        break;  // This viewer stopped watching
      }
    }
    
    const completed = dropoffScene === null;
    const recommendScore = completed ? (sceneEngagement.reduce((a, b) => a + b, 0) / sceneEngagement.length - 0.5) * 200 : -50;
    
    return {
      profile,
      sceneEngagement,
      dropoffScene,
      completed,
      overallEngagement: sceneEngagement.reduce((a, b) => a + b, 0) / sceneEngagement.length,
      recommendScore,
    };
  }
  
  /**
   * Calculate engagement for one scene
   */
  private calculateSceneEngagement(
    scene: Scene,
    profile: AudienceProfile,
    currentAttention: number
  ): number {
    // Base engagement from scene qualities
    const tension = scene.tension || 0.5;
    const pacing = scene.pacing || 0.5;
    const emotional = scene.emotionalIntensity || 0.5;
    
    // Genre match
    const genreMatch = profile.genrePreferences.get(scene.genre || 'drama') || 0.5;
    
    // Age appropriateness
    const ageMatch = this.calculateAgeMatch(scene, profile.age);
    
    // Cultural relevance
    const culturalMatch = this.calculateCulturalMatch(scene, profile.culture);
    
    // Weighted formula
    const baseEngagement = 
      tension * 0.25 +
      pacing * 0.20 +
      emotional * 0.15 +
      genreMatch * 0.20 +
      ageMatch * 0.10 +
      culturalMatch * 0.10;
    
    // Modulated by current attention
    return baseEngagement * currentAttention;
  }
  
  /**
   * Aggregate individual results into audience report
   */
  private aggregateResults(
    individual: IndividualEngagement[],
    audience: AudienceProfile[]
  ): AudienceReport {
    const completedCount = individual.filter(i => i.completed).length;
    const completionRate = completedCount / individual.length;
    
    // Find common dropoff points
    const dropoffCounts = new Map<number, number>();
    for (const result of individual) {
      if (result.dropoffScene !== null) {
        dropoffCounts.set(result.dropoffScene, (dropoffCounts.get(result.dropoffScene) || 0) + 1);
      }
    }
    const dropoffPoints = Array.from(dropoffCounts.entries())
      .filter(([_, count]) => count > individual.length * 0.1)  // >10% dropped
      .map(([scene, _]) => scene);
    
    // Calculate per-scene engagement (average across all viewers)
    const sceneEngagement: number[] = [];
    const maxScenes = Math.max(...individual.map(i => i.sceneEngagement.length));
    for (let i = 0; i < maxScenes; i++) {
      const validScores = individual
        .map(r => r.sceneEngagement[i])
        .filter(s => s !== undefined);
      sceneEngagement.push(validScores.reduce((a, b) => a + b, 0) / validScores.length);
    }
    
    // Find peaks and lulls
    const peaks = this.findPeaks(sceneEngagement);
    const lulls = this.findLulls(sceneEngagement);
    
    // Segment by demographics
    const byAge = this.segmentByAge(individual, audience);
    const byGender = this.segmentByGender(individual, audience);
    const byCulture = this.segmentByCulture(individual, audience);
    const byGenreFan = this.segmentByGenreFan(individual, audience);
    
    // Overall metrics
    const overallEngagement = sceneEngagement.reduce((a, b) => a + b, 0) / sceneEngagement.length * 100;
    const avgRecommendScore = individual.reduce((sum, i) => sum + i.recommendScore, 0) / individual.length;
    const viralPotential = this.calculateViralPotential(overallEngagement, avgRecommendScore, peaks.length);
    
    return {
      overallEngagement,
      completionRate,
      recommendationScore: avgRecommendScore,
      viralPotential,
      sceneEngagement,
      dropoffPoints,
      peakMoments: peaks,
      lulls,
      emotionalArc: [],  // TODO: Implement emotional trajectory
      byAge,
      byGender,
      byCulture,
      byGenreFan,
      predictedAudienceSize: this.estimateAudienceSize(overallEngagement, completionRate),
      targetDemographic: this.identifyTargetDemo(byAge, byGender, byCulture),
      warnings: this.generateWarnings(dropoffPoints, lulls, completionRate),
    };
  }
  
  // ── Helper Methods ────────────────────────────────────────────────────────────
  
  private sampleAge(): number {
    // Weighted towards movie-going ages
    const rand = Math.random();
    if (rand < 0.30) return 18 + Math.floor(Math.random() * 7);   // 18-24 (30%)
    if (rand < 0.55) return 25 + Math.floor(Math.random() * 10);  // 25-34 (25%)
    if (rand < 0.75) return 35 + Math.floor(Math.random() * 10);  // 35-44 (20%)
    if (rand < 0.90) return 45 + Math.floor(Math.random() * 10);  // 45-54 (15%)
    return 55 + Math.floor(Math.random() * 26);                    // 55-80 (10%)
  }
  
  private sampleGender(): 'male' | 'female' | 'non-binary' {
    const rand = Math.random();
    if (rand < 0.48) return 'male';
    if (rand < 0.96) return 'female';
    return 'non-binary';
  }
  
  private sampleCulture(): string {
    const cultures = ['western', 'asian', 'latin', 'african', 'middle-eastern'];
    const weights = [0.60, 0.20, 0.10, 0.05, 0.05];  // Weighted distribution
    const rand = Math.random();
    let cumulative = 0;
    for (let i = 0; i < cultures.length; i++) {
      cumulative += weights[i];
      if (rand < cumulative) return cultures[i];
    }
    return 'western';
  }
  
  private sampleEducation(): string {
    const rand = Math.random();
    if (rand < 0.30) return 'high-school';
    if (rand < 0.70) return 'college';
    if (rand < 0.95) return 'graduate';
    return 'phd';
  }
  
  private sampleBigFive() {
    // Sample from normal distributions (mean 0.5, stddev 0.15)
    const normal = () => Math.max(0, Math.min(1, 0.5 + (Math.random() - 0.5) * 0.3));
    return {
      openness: normal(),
      conscientiousness: normal(),
      extraversion: normal(),
      agreeableness: normal(),
      neuroticism: normal(),
    };
  }
  
  private sampleGenrePreferences(): Map<string, number> {
    const genres = ['thriller', 'noir', 'romance', 'comedy', 'horror', 'scifi', 'drama', 'action'];
    const prefs = new Map<string, number>();
    for (const genre of genres) {
      prefs.set(genre, Math.random());
    }
    return prefs;
  }
  
  private sampleAttentionSpan(): number {
    return 60 + Math.random() * 60;  // 60-120 minutes
  }
  
  private calculateAgeMatch(scene: Scene, age: number): number {
    // Simplified: younger audiences prefer action, older prefer drama
    const actionIntensity = scene.actionDensity || 0.5;
    if (age < 35) return 0.5 + actionIntensity * 0.5;
    return 0.5 + (1 - actionIntensity) * 0.5;
  }
  
  private calculateCulturalMatch(scene: Scene, culture: string): number {
    // Simplified: assume 0.7 baseline, TODO: detect cultural references
    return 0.7;
  }
  
  private findPeaks(engagement: number[]): number[] {
    const peaks: number[] = [];
    for (let i = 1; i < engagement.length - 1; i++) {
      if (engagement[i] > engagement[i - 1] && engagement[i] > engagement[i + 1] && engagement[i] > 0.75) {
        peaks.push(i);
      }
    }
    return peaks;
  }
  
  private findLulls(engagement: number[]): number[] {
    return engagement
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => e < 0.4)
      .map(({ i }) => i);
  }
  
  private segmentByAge(individual: IndividualEngagement[], audience: AudienceProfile[]): Map<string, number> {
    const segments = new Map<string, number[]>();
    for (let i = 0; i < individual.length; i++) {
      const age = audience[i].age;
      const segment = age < 25 ? '18-24' : age < 35 ? '25-34' : age < 45 ? '35-44' : age < 55 ? '45-54' : '55+';
      if (!segments.has(segment)) segments.set(segment, []);
      segments.get(segment)!.push(individual[i].overallEngagement);
    }
    const result = new Map<string, number>();
    for (const [segment, engagements] of segments.entries()) {
      result.set(segment, engagements.reduce((a, b) => a + b, 0) / engagements.length * 100);
    }
    return result;
  }
  
  private segmentByGender(individual: IndividualEngagement[], audience: AudienceProfile[]): Map<string, number> {
    const segments = new Map<string, number[]>();
    for (let i = 0; i < individual.length; i++) {
      const gender = audience[i].gender;
      if (!segments.has(gender)) segments.set(gender, []);
      segments.get(gender)!.push(individual[i].overallEngagement);
    }
    const result = new Map<string, number>();
    for (const [gender, engagements] of segments.entries()) {
      result.set(gender, engagements.reduce((a, b) => a + b, 0) / engagements.length * 100);
    }
    return result;
  }
  
  private segmentByCulture(individual: IndividualEngagement[], audience: AudienceProfile[]): Map<string, number> {
    const segments = new Map<string, number[]>();
    for (let i = 0; i < individual.length; i++) {
      const culture = audience[i].culture;
      if (!segments.has(culture)) segments.set(culture, []);
      segments.get(culture)!.push(individual[i].overallEngagement);
    }
    const result = new Map<string, number>();
    for (const [culture, engagements] of segments.entries()) {
      result.set(culture, engagements.reduce((a, b) => a + b, 0) / engagements.length * 100);
    }
    return result;
  }
  
  private segmentByGenreFan(individual: IndividualEngagement[], audience: AudienceProfile[]): Map<string, number> {
    // Identify top genre preference per person
    const segments = new Map<string, number[]>();
    for (let i = 0; i < individual.length; i++) {
      const prefs = audience[i].genrePreferences;
      const topGenre = Array.from(prefs.entries()).reduce((a, b) => a[1] > b[1] ? a : b)[0];
      const segment = `${topGenre}_fan`;
      if (!segments.has(segment)) segments.set(segment, []);
      segments.get(segment)!.push(individual[i].overallEngagement);
    }
    const result = new Map<string, number>();
    for (const [segment, engagements] of segments.entries()) {
      result.set(segment, engagements.reduce((a, b) => a + b, 0) / engagements.length * 100);
    }
    return result;
  }
  
  private calculateViralPotential(engagement: number, recommendScore: number, peaks: number): number {
    // High engagement + high recommendation + multiple peaks = viral
    return Math.min(100, (engagement * 0.5 + (recommendScore + 100) / 2 * 0.3 + peaks * 5 * 0.2));
  }
  
  private estimateAudienceSize(engagement: number, completionRate: number): number {
    // Simplified formula: higher engagement = larger audience
    const baseAudience = 1_000_000;  // 1M baseline
    const multiplier = (engagement / 100) * completionRate;
    return Math.floor(baseAudience * multiplier);
  }
  
  private identifyTargetDemo(
    byAge: Map<string, number>,
    byGender: Map<string, number>,
    byCulture: Map<string, number>
  ): string {
    const topAge = Array.from(byAge.entries()).reduce((a, b) => a[1] > b[1] ? a : b)[0];
    const topGender = Array.from(byGender.entries()).reduce((a, b) => a[1] > b[1] ? a : b)[0];
    return `${topAge} ${topGender}`;
  }
  
  private generateWarnings(dropoffPoints: number[], lulls: number[], completionRate: number): string[] {
    const warnings: string[] = [];
    if (completionRate < 0.5) {
      warnings.push(`LOW COMPLETION: Only ${(completionRate * 100).toFixed(0)}% of viewers finish`);
    }
    for (const scene of dropoffPoints) {
      warnings.push(`HIGH DROPOFF: ${((1 - completionRate) * 100).toFixed(0)}% stop watching at Scene ${scene}`);
    }
    if (lulls.length > 5) {
      warnings.push(`ENGAGEMENT LULLS: ${lulls.length} scenes with low engagement`);
    }
    return warnings;
  }
}

// ── Helper Types ──────────────────────────────────────────────────────────────

interface IndividualEngagement {
  profile: AudienceProfile;
  sceneEngagement: number[];
  dropoffScene: number | null;
  completed: boolean;
  overallEngagement: number;
  recommendScore: number;
}

// ── Export ────────────────────────────────────────────────────────────────────

export function createAudienceSimulator(audienceSize: number = 100): AudienceSimulationEngine {
  const engine = new AudienceSimulationEngine();
  (engine as any).audienceSize = audienceSize;
  return engine;
}
