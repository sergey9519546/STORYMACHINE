// Wave 39 — Pass 6: Character Arc
// Checks arc completion: characters who start and end in the same emotional
// state, arcs without turning point, transformation without cause.

import type { PassInput, PassResult, RevisionIssue } from './types.ts';
import { rewritePass } from '../rewrite.ts';

export async function characterArcPass(input: PassInput): Promise<PassResult> {
  const { fountain, records, structure, annotations, approvedSpans } = input;
  const issues: RevisionIssue[] = [];

  if (records.length < 3) {
    return {
      pass: 'character-arc',
      issues: [],
      revisedFountain: fountain,
      changed: false,
      summary: 'Character-arc pass: too few scenes to evaluate',
    };
  }

  // ── Compute emotional journey per "character zone" ────────────────────────
  // We proxy character arcs through the records' emotionalShift field
  const firstThird = records.slice(0, Math.floor(records.length / 3));
  const lastThird = records.slice(Math.floor(records.length * 2 / 3));

  const firstShift = dominantShift(firstThird);
  const lastShift = dominantShift(lastThird);

  if (firstShift !== 'neutral' && lastShift !== 'neutral' && firstShift === lastShift) {
    issues.push({
      location: 'Overall character arc',
      rule: 'FLAT_CHARACTER_ARC',
      description: `Story opens and closes with the same dominant emotional tone (${firstShift}) — no character transformation is registered`,
      severity: 'major',
      suggestedFix: 'Add a turning-point scene in Act 2b where the protagonist\'s emotional orientation shifts',
    });
  }

  // ── Transformation without a causal scene ────────────────────────────────
  if (firstShift !== lastShift && firstShift !== 'neutral' && lastShift !== 'neutral') {
    // Good — there's a shift. Check it's not abrupt (no scene with revelation/turn in between)
    const middleRecords = records.slice(Math.floor(records.length / 3), Math.floor(records.length * 2 / 3));
    const hasTransformationCause = middleRecords.some(r => r.revelation !== null || r.dramaticTurn !== 'none');
    if (!hasTransformationCause) {
      issues.push({
        location: 'Mid-story character arc',
        rule: 'UNMOTIVATED_TRANSFORMATION',
        description: 'The character\'s emotional arc shifts from beginning to end but no mid-story scene clearly causes the change',
        severity: 'major',
        suggestedFix: 'Add a pivotal scene where the character confronts something that forces an internal shift',
      });
    }
  }

  // ── No revelation scenes in a complete story ──────────────────────────────
  if (structure.revelationCount === 0 && structure.completionPercent >= 70) {
    issues.push({
      location: 'Character arc — revelations',
      rule: 'NO_REVELATIONS',
      description: 'A near-complete story with no revelation scenes: character arcs cannot be witnessed, only told',
      severity: 'critical',
      suggestedFix: 'Add at least one scene where a character directly witnesses something that changes their worldview',
    });
  }

  // ── Approaching climax without emotional peak ─────────────────────────────
  if (structure.approachingClimax && records.length >= 4) {
    const lastFour = records.slice(-4);
    const hasEmotionalPeak = lastFour.some(r => r.emotionalShift !== 'neutral');
    if (!hasEmotionalPeak) {
      issues.push({
        location: 'Pre-climax character arc',
        rule: 'CLIMAX_EMOTIONALLY_FLAT',
        description: 'The climax approach is emotionally flat — the audience is not invested in the character\'s outcome',
        severity: 'major',
        suggestedFix: 'Add a moment of personal cost or sacrifice that makes the climax emotionally resonant',
      });
    }
  }

  const { revised, usedLLM } = await rewritePass({ fountain, issues, passName: 'character-arc', approvedSpans });
  const changed = revised !== fountain;

  return {
    pass: 'character-arc',
    issues,
    revisedFountain: revised,
    changed,
    summary: issues.length === 0
      ? 'Character-arc pass: arcs are complete'
      : `Character-arc pass: ${issues.length} issue(s) — ${usedLLM ? 'rewritten' : 'flagged (stub mode)'}`,
  };
}

function dominantShift(records: PassInput['records']): string {
  if (records.length === 0) return 'neutral';
  const counts: Record<string, number> = {};
  for (const r of records) {
    counts[r.emotionalShift] = (counts[r.emotionalShift] ?? 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'neutral';
}
