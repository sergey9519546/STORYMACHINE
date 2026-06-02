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
// Wave 147 additions: climax timing (major shifts late), earned reversals
// (reversals with prior tension), and power dynamic tracking.

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

  // ── Wave 147: Relationship climax & earned reversals ────────────────────────

  // RELATIONSHIP_CLIMAX_TIMING: The most important relationship shift (highest
  // magnitude) doesn't occur near the story's climax where emotional payoff lands
  // hardest. A major relationship beat in Act 1 or early Act 2 means the climax
  // becomes emotionally anticlimactic.
  let maxShiftMagnitude = 0;
  let maxShiftScene = -1;
  for (const r of records) {
    for (const shift of r.relationshipShifts ?? []) {
      if (Math.abs(shift.amount) > maxShiftMagnitude) {
        maxShiftMagnitude = Math.abs(shift.amount);
        maxShiftScene = r.sceneIdx;
      }
    }
  }

  if (maxShiftScene >= 0 && records.length >= 8) {
    const climaxStart = Math.floor(records.length * 0.75);
    if (maxShiftScene < climaxStart && maxShiftMagnitude >= 1.5) {
      // Major shift happened before climax third
      issues.push({
        location: `Scene ${maxShiftScene}`,
        rule: 'RELATIONSHIP_CLIMAX_TIMING',
        description: `The story's most significant relationship shift (magnitude ${maxShiftMagnitude.toFixed(1)}, ${Math.abs(maxShiftMagnitude) > 0 ? (maxShiftMagnitude > 0 ? 'warming' : 'souring') : 'shifting'}) occurs at Scene ${maxShiftScene}, before the climax begins (Scene ${climaxStart}+) — the emotional high point lands early, not with maximum impact`,
        severity: 'major',
        suggestedFix: 'Delay or recontextualize the major relationship beat to occur during the climactic act so its emotional weight lands at the story\'s crescendo',
      });
    }
  }

  // RELATIONSHIP_UNEARNED_REVERSAL: A relationship reverses (sign change from
  // positive to negative or vice versa) but there's no prior tension or conflict
  // in the scenes leading up to the reversal. The flip feels arbitrary.
  for (const [pairKey, stats] of pairStats) {
    // Check for reversals: consecutive shifts with opposite signs
    let reversal: { sceneIdx: number; before: number; after: number } | null = null;
    for (let i = 1; i < stats.shifts.length; i++) {
      const prev = stats.shifts[i - 1];
      const curr = stats.shifts[i];
      if (Math.sign(prev.amount) !== Math.sign(curr.amount) && prev.amount !== 0 && curr.amount !== 0) {
        reversal = { sceneIdx: curr.sceneIdx, before: prev.amount, after: curr.amount };
        break; // report first reversal
      }
    }

    if (reversal) {
      // Check if there's tension/conflict before the reversal (planted clues, high suspense, or relationship shifts in prior scene)
      const prevScene = records[reversal.sceneIdx - 1];
      const currScene = records[reversal.sceneIdx];

      const hasSetup = prevScene && (
        (prevScene.seededClueIds?.length ?? 0) > 0 ||
        prevScene.suspenseDelta > 1.5 ||
        (prevScene.relationshipShifts?.length ?? 0) > 0
      );

      if (!hasSetup && reversal.sceneIdx >= 2) {
        const [a, b] = pairKey.split('|');
        const direction = reversal.before > 0 ? 'warming to souring' : 'souring to warming';
        issues.push({
          location: `${a} ↔ ${b} at Scene ${reversal.sceneIdx}`,
          rule: 'RELATIONSHIP_UNEARNED_REVERSAL',
          description: `The relationship between ${a} and ${b} reverses from ${direction} at Scene ${reversal.sceneIdx}, but no prior scene plants tension or conflict to justify the flip — the reversal feels arbitrary`,
          severity: 'major',
          suggestedFix: 'Add a setup scene 1-2 beats before the reversal that plants the seed for this relationship shift (a betrayal hint, a moment of doubt, or a hidden motive revealed)',
        });
      }
    }
  }

  // POWER_DYNAMIC_UNCHANGED: A relationship has affinity shifts (trust/warmth)
  // but never has shifts on the "power" dimension, meaning one character stays
  // subordinate throughout. The emotional arc happens but the power imbalance
  // never resolves.
  for (const [pairKey, stats] of pairStats) {
    if (stats.shifts.length >= 2) {
      const dimensions = new Set(stats.shifts.map(s => {
        // Find the actual dimension from the shift records
        const matchingShift = records
          .flatMap(r => r.relationshipShifts ?? [])
          .find(rs => rs.pairKey === pairKey);
        return matchingShift?.dimension ?? 'affinity';
      }));

      const hasAffinityShifts = dimensions.has('affinity');
      const hasPowerShifts = dimensions.has('power') || dimensions.has('dominance');

      if (hasAffinityShifts && !hasPowerShifts && stats.shifts.length >= 3) {
        const [a, b] = pairKey.split('|');
        issues.push({
          location: `${a} ↔ ${b}`,
          rule: 'POWER_DYNAMIC_UNCHANGED',
          description: `The bond between ${a} and ${b} shifts ${stats.shifts.length} times on affinity (trust/warmth) but never on power dynamics — one character remains subordinate throughout, limiting the relationship's freedom to evolve`,
          severity: 'minor',
          suggestedFix: `Add a scene where the power balance shifts: a moment where the subordinate character seizes agency, or the dominant character yields control. The relationship becomes fuller when both dimensions move.`,
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
