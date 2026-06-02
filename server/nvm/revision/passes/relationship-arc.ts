// Wave 134 — Pass 14: Relationship Arc
// Checks whether character relationships actually evolve over the story. Two
// characters who share many scenes but whose dynamic never shifts are static —
// the relationship is decoration, not drama. Conversely, a relationship that
// only ever moves in ONE direction (always warming, always souring) lacks the
// reversal that makes a bond feel earned.
//
// Failure modes:
//   1. STATIC_RELATIONSHIP — a pair co-appears in ≥3 scenes but never shifts
//   2. MONOTONE_RELATIONSHIP — a pair shifts ≥3 times but always same sign
//   3. NO_RELATIONSHIP_MOVEMENT — multi-character story with zero shifts at all

import type { PassInput, PassResult, RevisionIssue } from './types.ts';
import { rewritePass } from '../rewrite.ts';

// Minimum co-appearances before a never-shifting pair is considered static.
const STATIC_COAPPEAR_THRESHOLD = 3;
// Minimum shifts before we judge a relationship's directional variety.
const MONOTONE_SHIFT_THRESHOLD = 3;

interface PairStats {
  shifts: Array<{ sceneIdx: number; amount: number }>;
  netByDimension: Map<string, number>;
}

export async function relationshipArcPass(input: PassInput): Promise<PassResult> {
  const { fountain, records, approvedSpans } = input;
  const issues: RevisionIssue[] = [];

  // ── Aggregate per-pair shift history ──────────────────────────────────────
  const pairStats = new Map<string, PairStats>();
  for (const r of records) {
    for (const shift of r.relationshipShifts ?? []) {
      let stats = pairStats.get(shift.pairKey);
      if (!stats) {
        stats = { shifts: [], netByDimension: new Map() };
        pairStats.set(shift.pairKey, stats);
      }
      stats.shifts.push({ sceneIdx: r.sceneIdx, amount: shift.amount });
      stats.netByDimension.set(
        shift.dimension,
        (stats.netByDimension.get(shift.dimension) ?? 0) + shift.amount,
      );
    }
  }

  const totalShifts = [...pairStats.values()].reduce((s, p) => s + p.shifts.length, 0);

  // ── NO_RELATIONSHIP_MOVEMENT — multi-scene story with zero shifts ─────────
  // Only meaningful once the story is substantial; a short opening has no arc yet.
  if (totalShifts === 0 && records.length >= 5) {
    issues.push({
      location: 'Entire screenplay',
      rule: 'NO_RELATIONSHIP_MOVEMENT',
      description:
        'No relationship between any two characters shifts across the entire story. Relationships are static — the emotional engine is idle.',
      severity: 'major',
      suggestedFix:
        'Identify the two characters whose bond matters most and give it at least one turn: a betrayal, a reconciliation, a shift in trust or power.',
    });
  }

  // ── Per-pair analysis ─────────────────────────────────────────────────────
  // Count co-appearances: scenes where both members of a pair are referenced via
  // dialogue/relationship activity. We approximate co-appearance by scenes whose
  // relationshipShifts mention the pair OR scenes where both names appear in the
  // dialogue highlights. Since we only have pair keys reliably, we use a simpler
  // proxy: a pair is "present" in scenes where its shift appears; a static pair is
  // one with shifts in the data only as a single zero-amount entry. To detect the
  // truly static case we look for pairs that appear in relationship ops but whose
  // net movement across every dimension is ~0.
  for (const [pairKey, stats] of pairStats) {
    const [a, b] = pairKey.split('|');

    // ── MONOTONE_RELATIONSHIP — many shifts, all the same sign ──────────────
    if (stats.shifts.length >= MONOTONE_SHIFT_THRESHOLD) {
      const signs = stats.shifts
        .map(s => Math.sign(s.amount))
        .filter(sgn => sgn !== 0);
      const allPositive = signs.length > 0 && signs.every(sgn => sgn > 0);
      const allNegative = signs.length > 0 && signs.every(sgn => sgn < 0);
      if (allPositive || allNegative) {
        const direction = allPositive ? 'warming' : 'souring';
        issues.push({
          location: `${a} ↔ ${b}`,
          rule: 'MONOTONE_RELATIONSHIP',
          description:
            `The relationship between ${a} and ${b} only ever moves one direction (${direction}) across ${stats.shifts.length} shifts. A bond with no reversal feels inevitable rather than earned.`,
          severity: 'minor',
          suggestedFix:
            `Introduce at least one counter-movement — a moment of doubt in a warming bond, or a flicker of connection in a souring one — before the final state.`,
        });
      }
    }

    // ── STATIC_RELATIONSHIP — recurring pair whose net movement is ~0 ───────
    if (stats.shifts.length >= STATIC_COAPPEAR_THRESHOLD) {
      const maxNet = Math.max(
        0,
        ...[...stats.netByDimension.values()].map(v => Math.abs(v)),
      );
      if (maxNet < 0.05) {
        issues.push({
          location: `${a} ↔ ${b}`,
          rule: 'STATIC_RELATIONSHIP',
          description:
            `${a} and ${b} interact across ${stats.shifts.length} relationship beats but their net dynamic returns to zero — every shift is cancelled out. The relationship runs in place.`,
          severity: 'minor',
          suggestedFix:
            `Let one shift stick: end the story with their bond measurably different from where it began.`,
        });
      }
    }
  }

  const { revised, usedLLM } = await rewritePass({
    fountain, issues, passName: 'relationship-arc', approvedSpans,
    storyContext: input.storyContext, priorPassResults: input.priorPassResults,
  });
  const changed = revised !== fountain;

  return {
    pass: 'relationship-arc',
    issues,
    revisedFountain: revised,
    changed,
    summary: issues.length === 0
      ? 'Relationship arc pass: character bonds evolve credibly'
      : `Relationship arc pass: ${issues.length} issue(s) — ${usedLLM ? 'rewritten' : 'flagged (stub mode)'}`,
  };
}
