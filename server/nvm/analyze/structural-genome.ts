// server/nvm/analyze/structural-genome.ts — Extract transferable structural
// patterns ("genomes") from Story Vectors. A genome describes the high-level
// architecture of a screenplay — act breaks, escalation patterns, emotional
// curvature — independent of specific plot/character details.
//
// ARCHITECTURE: Story Vectors capture WHAT rules fired (the structural
// fingerprint). Genomes extract WHY they fired that way (the underlying
// design pattern). This enables:
//   1. Template discovery — "Your thriller should follow Arrival's structure"
//   2. Pattern transfer — Apply a proven genome to a new premise
//   3. Comparative diagnosis — "You're linear, but Prestige is exponential"
//
// The genome is NOT a rewrite prescription. It's a high-level compass showing
// what structural choices a reference film made, so a writer can decide
// whether to emulate or diverge.

import type { StoryVector } from './story-vector.ts';
import type { ScreenplaySceneRecord } from '../screenplay/memory.ts';

// ── Genome Types ───────────────────────────────────────────────────────────

export interface StructuralGenome {
  /** Source screenplay this genome was extracted from */
  sourceTitle: string;
  
  /** Act break positions as percentages of total screenplay [0-100].
   *  Example: [25, 50, 75] for traditional 3-act at quarter marks.
   *  Empty array if no clear act structure detected. */
  actBreakPositions: number[];
  
  /** How many major story reversals detected (positive surprise / negative
   *  reversal moments where expectations flip). Higher = more plot complexity. */
  reversalCount: number;
  
  /** How conflict/tension escalates across the screenplay:
   *    'linear' — steady upward trend
   *    'exponential' — slow burn → explosive third act
   *    'stair-step' — plateaus with sharp jumps (episodic structure)
   *    'flat' — no clear escalation pattern */
  conflictEscalationPattern: 'linear' | 'exponential' | 'stair-step' | 'flat';
  
  /** Shape of the protagonist's emotional/capability arc:
   *    'flat' — unchanging character (action hero archetype)
   *    'linear' — steady growth from weakness to strength
   *    'u-shape' — fall then rise (redemption arc)
   *    'inverted-u' — rise then fall (tragedy arc) */
  characterArcShape: 'flat' | 'linear' | 'u-shape' | 'inverted-u';
  
  /** Variance in emotional trajectory (0-1 normalized). Higher = more
   *  emotional range, lower = steadier tone. Computed from scene-to-scene
   *  emotional shifts. */
  emotionalCurvature: number;
  
  /** Optional: density of dramatic turns (surprise/reversal per scene).
   *  Higher = more plot-driven, lower = more character/atmosphere driven. */
  dramaticTurnDensity?: number;
  
  /** Optional: pacing profile (how scene lengths vary across the screenplay).
   *  'accelerating' — shorter scenes as story progresses
   *  'decelerating' — longer scenes in later acts (contemplative)
   *  'even' — consistent scene length throughout */
  pacingProfile?: 'accelerating' | 'decelerating' | 'even';
}

// ── Genome Extraction ──────────────────────────────────────────────────────

/** Extract a structural genome from a story vector + original screenplay.
 *  The vector alone captures what rules fired, but we need the actual scene
 *  records to compute timing/position-based patterns (act breaks, escalation).
 * 
 *  @param vector - Story vector for this screenplay
 *  @param records - Scene-by-scene records from buildScreenplayMemory
 *  @returns Structural genome describing this screenplay's architecture */
export function extractGenome(
  vector: StoryVector,
  records: ScreenplaySceneRecord[]
): StructuralGenome {
  const sceneCount = records.length;
  
  return {
    sourceTitle: vector.metadata.title,
    actBreakPositions: detectActBreaks(records),
    reversalCount: countReversals(records),
    conflictEscalationPattern: detectEscalationPattern(records),
    characterArcShape: detectCharacterArcShape(records),
    emotionalCurvature: computeEmotionalCurvature(records),
    dramaticTurnDensity: computeDramaticTurnDensity(records),
    pacingProfile: detectPacingProfile(records),
  };
}

/** Detect act break positions by looking for major structural shifts:
 *  - Suspense/tension discontinuities (sharp drops or spikes)
 *  - Relationship ruptures/repairs
 *  - Major location changes
 *  - Dramatic turns (reversals/surprises)
 * 
 *  Returns percentages [0-100] where acts break. Empty if no clear structure. */
function detectActBreaks(records: ScreenplaySceneRecord[]): number[] {
  if (records.length < 10) return []; // Too short for act structure
  
  // Simple heuristic: look for suspense discontinuities
  // (A real implementation would use multiple signals and clustering)
  const suspenseDeltas: number[] = [];
  for (let i = 1; i < records.length; i++) {
    const prev = records[i - 1].suspenseDelta ?? 0;
    const curr = records[i].suspenseDelta ?? 0;
    suspenseDeltas.push(Math.abs(curr - prev));
  }
  
  // Find top 2-3 discontinuity points (act breaks)
  const indexed = suspenseDeltas.map((delta, i) => ({ delta, i }));
  indexed.sort((a, b) => b.delta - a.delta);
  
  // Take top 2 (classic 3-act structure)
  const breaks = indexed
    .slice(0, 2)
    .map(x => x.i)
    .sort((a, b) => a - b)
    .map(i => Math.round((i / records.length) * 100));
  
  return breaks;
}

/** Count major reversals (positive/negative emotional or plot flips).
 *  Uses emotionalShift channel: count transitions from negative → positive
 *  or positive → negative with at least 2 scenes between. */
function countReversals(records: ScreenplaySceneRecord[]): number {
  let reversals = 0;
  let lastShift: 'positive' | 'negative' | 'neutral' | null = null;
  let lastShiftIdx = -1;
  
  for (let i = 0; i < records.length; i++) {
    const shift = records[i].emotionalShift;
    if (!shift || shift === 'neutral') continue;
    
    // Check for reversal (opposite of last shift, with gap)
    if (lastShift && lastShift !== shift && i - lastShiftIdx >= 2) {
      reversals++;
    }
    
    lastShift = shift;
    lastShiftIdx = i;
  }
  
  return reversals;
}

/** Detect how conflict/tension escalates. Fits suspenseDelta trajectory to
 *  linear/exponential/stair-step/flat models and returns best fit. */
function detectEscalationPattern(
  records: ScreenplaySceneRecord[]
): 'linear' | 'exponential' | 'stair-step' | 'flat' {
  if (records.length < 5) return 'flat';
  
  const suspense = records.map(r => r.suspenseDelta ?? 0);
  
  // Compute linear regression (y = mx + b)
  const n = suspense.length;
  const xMean = (n - 1) / 2;
  const yMean = suspense.reduce((sum, y) => sum + y, 0) / n;
  
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (suspense[i] - yMean);
    denominator += (i - xMean) ** 2;
  }
  const slope = denominator > 0 ? numerator / denominator : 0;
  
  // Compute variance (for flat detection)
  const variance = suspense.reduce((sum, y) => sum + (y - yMean) ** 2, 0) / n;
  
  // Flat: very low variance or near-zero slope
  if (variance < 0.1 || Math.abs(slope) < 0.05) return 'flat';
  
  // Exponential: check if log-transform improves fit
  // (A real implementation would fit exponential model properly)
  // For now, detect by checking if second half variance >> first half variance
  const firstHalf = suspense.slice(0, Math.floor(n / 2));
  const secondHalf = suspense.slice(Math.floor(n / 2));
  const firstVar = firstHalf.reduce((sum, y) => sum + (y - yMean) ** 2, 0) / firstHalf.length;
  const secondVar = secondHalf.reduce((sum, y) => sum + (y - yMean) ** 2, 0) / secondHalf.length;
  
  if (secondVar > firstVar * 2) return 'exponential';
  
  // Stair-step: detect plateaus with sharp jumps
  // (A real implementation would use change-point detection)
  // For now, count scenes with large jumps vs. stable scenes
  let stableCount = 0;
  let jumpCount = 0;
  for (let i = 1; i < n; i++) {
    const delta = Math.abs(suspense[i] - suspense[i - 1]);
    if (delta < 0.3) stableCount++;
    else if (delta > 1.0) jumpCount++;
  }
  
  if (jumpCount >= 3 && stableCount > jumpCount * 2) return 'stair-step';
  
  // Default: linear
  return 'linear';
}

/** Detect character arc shape by looking at relationship trust trends and
 *  emotional trajectory. A real implementation would track protagonist-specific
 *  signals; this is a simplified heuristic using aggregate scene data. */
function detectCharacterArcShape(
  records: ScreenplaySceneRecord[]
): 'flat' | 'linear' | 'u-shape' | 'inverted-u' {
  if (records.length < 5) return 'flat';
  
  // Use emotionalShift as a proxy for character state
  // Widen to number[] (not the inferred 1|0|-1 literal union) — reduce()
  // below accumulates via `sum + e`, which TS always types as `number`, so a
  // narrower element type makes the accumulator/return type mismatch.
  const emotions: number[] = records.map(r => {
    if (r.emotionalShift === 'positive') return 1;
    if (r.emotionalShift === 'negative') return -1;
    return 0;
  });
  
  // Compute cumulative sum (arc trajectory)
  const cumulative: number[] = [];
  let sum = 0;
  for (const e of emotions) {
    sum += e;
    cumulative.push(sum);
  }
  
  // Check for arc patterns
  const firstThird = cumulative.slice(0, Math.floor(cumulative.length / 3));
  const lastThird = cumulative.slice(Math.floor(2 * cumulative.length / 3));
  
  const firstAvg = firstThird.reduce((a, b) => a + b, 0) / firstThird.length;
  const lastAvg = lastThird.reduce((a, b) => a + b, 0) / lastThird.length;
  const minVal = Math.min(...cumulative);
  const maxVal = Math.max(...cumulative);
  const range = maxVal - minVal;
  
  // Flat: very little movement
  if (range < 2) return 'flat';
  
  // U-shape: starts low, ends high, with a dip in middle
  const middleIdx = Math.floor(cumulative.length / 2);
  const middleVal = cumulative[middleIdx];
  if (firstAvg < 0 && lastAvg > 0 && middleVal < firstAvg) return 'u-shape';
  
  // Inverted-U: starts high, ends low, with peak in middle
  if (firstAvg > 0 && lastAvg < 0 && middleVal > lastAvg) return 'inverted-u';
  
  // Linear: steady trend
  return 'linear';
}

/** Compute emotional curvature (variance in emotional trajectory).
 *  Higher = more emotional range, lower = steadier tone. */
function computeEmotionalCurvature(records: ScreenplaySceneRecord[]): number {
  // Widen to number[] (not the inferred 1|0|-1 literal union) — reduce()
  // below accumulates via `sum + e`, which TS always types as `number`, so a
  // narrower element type makes the accumulator/return type mismatch.
  const emotions: number[] = records.map(r => {
    if (r.emotionalShift === 'positive') return 1;
    if (r.emotionalShift === 'negative') return -1;
    return 0;
  });
  
  const mean = emotions.reduce((sum, e) => sum + e, 0) / emotions.length;
  const variance = emotions.reduce((sum, e) => sum + (e - mean) ** 2, 0) / emotions.length;
  
  // Normalize to [0, 1] range (max variance for ±1 values is 1.0)
  return Math.min(1, variance);
}

/** Compute dramatic turn density (reversals + surprises per scene). */
function computeDramaticTurnDensity(records: ScreenplaySceneRecord[]): number {
  let turnCount = 0;
  
  for (const record of records) {
    if (record.dramaticTurn) turnCount++;
  }
  
  return records.length > 0 ? turnCount / records.length : 0;
}

/** Detect pacing profile by analyzing scene length variance across acts. */
function detectPacingProfile(records: ScreenplaySceneRecord[]): 'accelerating' | 'decelerating' | 'even' {
  if (records.length < 10) return 'even';
  
  // Split into thirds and compare average "complexity" (word count would be
  // better, but we don't have it per-scene in ScreenplaySceneRecord).
  // Use number of questions raised + resolved as a proxy for scene complexity.
  const firstThird = records.slice(0, Math.floor(records.length / 3));
  const lastThird = records.slice(Math.floor(2 * records.length / 3));
  
  const firstComplexity = firstThird.reduce((sum, r) => 
    sum + (r.questionsRaised ?? 0) + (r.questionsResolved ?? 0), 0
  ) / firstThird.length;
  
  const lastComplexity = lastThird.reduce((sum, r) => 
    sum + (r.questionsRaised ?? 0) + (r.questionsResolved ?? 0), 0
  ) / lastThird.length;
  
  // Accelerating: later scenes are denser (shorter, more action)
  // Decelerating: later scenes are sparser (longer, more contemplative)
  const ratio = lastComplexity / (firstComplexity || 1);
  
  if (ratio > 1.3) return 'accelerating';
  if (ratio < 0.7) return 'decelerating';
  return 'even';
}

// ── Template Discovery ─────────────────────────────────────────────────────

/** Find the best structural template from a corpus for a given premise/query.
 *  Returns the genome of the most similar screenplay, which can then be used
 *  as a structural compass for the writer's own draft.
 * 
 *  @param queryVector - Story vector of the draft seeking a template
 *  @param corpus - Library of reference vectors with known genomes
 *  @param records - Scene records for each corpus vector (for genome extraction)
 *  @returns Best matching template genome and its source vector */
export async function findStructuralTemplate(
  queryVector: StoryVector,
  corpus: StoryVector[],
  recordsMap: Map<string, ScreenplaySceneRecord[]>
): Promise<{ template: StoryVector; genome: StructuralGenome; similarity: number }> {
  const { findNearestNeighbors } = await import('./story-vector.ts');
  
  // Find most similar screenplay
  const neighbors = findNearestNeighbors(queryVector, corpus, 1);
  if (neighbors.length === 0) {
    throw new Error('Empty corpus: no templates available');
  }
  
  const best = neighbors[0];
  const records = recordsMap.get(best.vector.metadata.contentHash);
  if (!records) {
    throw new Error(`No scene records found for ${best.vector.metadata.title}`);
  }
  
  // Extract genome from best match
  const genome = extractGenome(best.vector, records);
  
  return {
    template: best.vector,
    genome,
    similarity: best.similarity,
  };
}

/** Compare a draft's genome against a reference genome and generate a
 *  human-readable comparison report.
 * 
 *  @param draftGenome - Genome extracted from user's draft
 *  @param referenceGenome - Genome from a corpus screenplay
 *  @returns Comparison report highlighting similarities and differences */
export function compareGenomes(
  draftGenome: StructuralGenome,
  referenceGenome: StructuralGenome
): string {
  const lines: string[] = [];
  
  lines.push(`Structural Comparison: "${draftGenome.sourceTitle}" vs. "${referenceGenome.sourceTitle}"`);
  lines.push('');
  
  // Act structure
  if (draftGenome.actBreakPositions.length === referenceGenome.actBreakPositions.length) {
    lines.push(`✓ Similar act structure (${draftGenome.actBreakPositions.length + 1} acts)`);
  } else {
    lines.push(`⚠ Different act structure: ${draftGenome.actBreakPositions.length + 1} acts vs. ${referenceGenome.actBreakPositions.length + 1} acts`);
  }
  
  // Reversals
  const reversalDiff = Math.abs(draftGenome.reversalCount - referenceGenome.reversalCount);
  if (reversalDiff <= 1) {
    lines.push(`✓ Similar plot complexity (${draftGenome.reversalCount} reversals vs. ${referenceGenome.reversalCount})`);
  } else {
    lines.push(`⚠ ${draftGenome.reversalCount < referenceGenome.reversalCount ? 'Fewer' : 'More'} plot reversals: ${draftGenome.reversalCount} vs. ${referenceGenome.reversalCount}`);
  }
  
  // Escalation
  if (draftGenome.conflictEscalationPattern === referenceGenome.conflictEscalationPattern) {
    lines.push(`✓ Matching escalation pattern: ${draftGenome.conflictEscalationPattern}`);
  } else {
    lines.push(`⚠ Different escalation: ${draftGenome.conflictEscalationPattern} vs. ${referenceGenome.conflictEscalationPattern}`);
  }
  
  // Character arc
  if (draftGenome.characterArcShape === referenceGenome.characterArcShape) {
    lines.push(`✓ Matching character arc: ${draftGenome.characterArcShape}`);
  } else {
    lines.push(`⚠ Different character arc: ${draftGenome.characterArcShape} vs. ${referenceGenome.characterArcShape}`);
  }
  
  // Emotional range
  const curvatureDiff = Math.abs(draftGenome.emotionalCurvature - referenceGenome.emotionalCurvature);
  if (curvatureDiff < 0.2) {
    lines.push(`✓ Similar emotional range (${(draftGenome.emotionalCurvature * 100).toFixed(0)}%)`);
  } else {
    lines.push(`⚠ Different emotional range: ${(draftGenome.emotionalCurvature * 100).toFixed(0)}% vs. ${(referenceGenome.emotionalCurvature * 100).toFixed(0)}%`);
  }
  
  return lines.join('\n');
}
