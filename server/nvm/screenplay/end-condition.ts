// Wave 38 — End-Condition Detector
// Detects when the lived commit path is "screenplay-complete":
//   - Central contradiction resolved/transformed
//   - Arc hits target shape (act3 reached)
//   - Key setups paid off (no orphan clues)
//   - Minimum viable length reached
//
// Returns an EndConditionResult with confidence (0-100) and reasons.

import type { StoryCommit } from '../state/StoryCommit.ts';
import type { ScreenplaySceneRecord } from './memory.ts';
import type { StructureState } from './structure.ts';

export interface EndConditionResult {
  /** 0-100: how complete is the story? */
  confidence: number;
  /** Is the story considered screenplay-complete? */
  complete: boolean;
  /** Reasons supporting completion */
  reasons: string[];
  /** Issues that remain unresolved */
  gaps: string[];
}

/** Minimum scenes before the story can be considered complete */
const MIN_SCENES = 5;

/**
 * Detect whether the lived commit path is screenplay-complete.
 *
 * @param records    Screenplay memory records (one per non-reverted commit)
 * @param structure  Current structural state
 * @param commits    Raw commits (for clock analysis)
 */
export function detectEndCondition(
  records: ScreenplaySceneRecord[],
  structure: StructureState,
  commits: StoryCommit[],
): EndConditionResult {
  const reasons: string[] = [];
  const gaps: string[] = [];
  let score = 0;

  // ── Minimum length ────────────────────────────────────────────────────────
  if (records.length >= MIN_SCENES) {
    score += 20;
    reasons.push(`Minimum scene count reached (${records.length} scenes)`);
  } else {
    gaps.push(`Too few scenes (${records.length}/${MIN_SCENES} minimum)`);
  }

  // ── Act 3 reached ─────────────────────────────────────────────────────────
  if (structure.actPosition === 'act3' || structure.actPosition === 'epilogue') {
    score += 25;
    reasons.push('Story has reached Act 3');
  } else {
    gaps.push(`Story is in ${structure.actPosition}, not yet Act 3`);
  }

  // ── Revelation present ────────────────────────────────────────────────────
  if (structure.revelationCount > 0) {
    score += 15;
    reasons.push(`${structure.revelationCount} revelation(s) committed`);
  } else {
    gaps.push('No revelation scenes (no witnessed beliefs)');
  }

  // ── Escalation curve is healthy ───────────────────────────────────────────
  if (structure.escalating) {
    score += 10;
    reasons.push('Escalation curve is healthy (rising suspense)');
  } else {
    gaps.push('Suspense arc is flat or declining');
  }

  // ── Open clues are manageable ─────────────────────────────────────────────
  const orphanClues = structure.openClues;
  if (orphanClues === 0) {
    score += 15;
    reasons.push('All clues are resolved (no orphan clues)');
  } else if (orphanClues <= 2) {
    score += 8;
    reasons.push(`${orphanClues} open clue(s) — acceptable`);
  } else {
    gaps.push(`${orphanClues} unresolved clue(s) — too many loose ends`);
  }

  // ── Climax was approached ─────────────────────────────────────────────────
  if (structure.approachingClimax) {
    score += 10;
    reasons.push('Climax approach detected');
  }

  // ── Central contradiction: at least one reversal ──────────────────────────
  if (structure.reversalCount > 0) {
    score += 5;
    reasons.push(`${structure.reversalCount} reversal(s) — central contradiction engaged`);
  } else {
    gaps.push('No reversals — central contradiction may be unresolved');
  }

  const complete = score >= 75 && records.length >= MIN_SCENES;

  return { confidence: Math.min(100, score), complete, reasons, gaps };
}
