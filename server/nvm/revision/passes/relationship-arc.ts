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
// Wave 161 additions: single pair relationship (all shifts involve only one pair),
// late relationship introduction (pair with 3+ shifts first shifts after midpoint),
// relationship velocity collapse (shifts in first half but none in second half).

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

  // ── Wave 161: Single pair, late introduction, velocity collapse ─────────────

  // SINGLE_PAIR_RELATIONSHIP: All relationship shifts (5+) involve the same pair.
  // The story has only one active relational thread while all other characters
  // remain relationally static — secondary character bonds never develop.
  if (records.length >= 6) {
    const allShiftsTotal = [...pairStats.values()].reduce((s, p) => s + p.shifts.length, 0);
    if (allShiftsTotal >= 5 && pairStats.size === 1) {
      const [onlyPair] = [...pairStats.keys()];
      const [a, b] = onlyPair.split('|');
      issues.push({
        location: `${a} ↔ ${b} (only active pair)`,
        rule: 'SINGLE_PAIR_RELATIONSHIP',
        description: `All ${allShiftsTotal} relationship shifts involve only ${a} and ${b} — no other character relationships evolve. The story has one active relational thread while all other bonds remain static.`,
        severity: 'minor',
        suggestedFix: 'Give at least one secondary character an independent relationship arc — a shift in loyalty, trust, or power with a different character — to add relational texture beyond the central pair',
      });
    }
  }

  // LATE_RELATIONSHIP_INTRODUCTION: A pair with 3+ shifts has its first shift
  // after the story's midpoint (50% mark). The relationship that matters most
  // wasn't established before the story needed it to carry emotional weight.
  if (records.length >= 8) {
    const midpoint = Math.floor(records.length * 0.5);
    for (const [pairKey, stats] of pairStats) {
      if (stats.shifts.length >= 3 && stats.shifts[0].sceneIdx >= midpoint) {
        const [a, b] = pairKey.split('|');
        issues.push({
          location: `${a} ↔ ${b} (first shift: Scene ${stats.shifts[0].sceneIdx})`,
          rule: 'LATE_RELATIONSHIP_INTRODUCTION',
          description: `The relationship between ${a} and ${b} (${stats.shifts.length} shifts) doesn't begin until Scene ${stats.shifts[0].sceneIdx} — past the story's midpoint. There isn't enough story left to earn the emotional weight of this bond.`,
          severity: 'major',
          suggestedFix: 'Introduce the first shift between these characters earlier — at least one beat before the midpoint — so the relationship has room to develop before it carries dramatic weight',
        });
      }
    }
  }

  // RELATIONSHIP_VELOCITY_COLLAPSE: The first half of the story has 3+ shifts
  // but the second half has none. Relational activity stops at the midpoint when
  // it should be intensifying toward the climax.
  if (records.length >= 8) {
    const midpoint = Math.floor(records.length * 0.5);
    let firstHalfShifts = 0;
    let secondHalfShifts = 0;
    for (const stats of pairStats.values()) {
      for (const shift of stats.shifts) {
        if (shift.sceneIdx < midpoint) firstHalfShifts++;
        else secondHalfShifts++;
      }
    }
    if (firstHalfShifts >= 3 && secondHalfShifts === 0) {
      issues.push({
        location: `Relational arc (Scenes ${midpoint}–${records.length - 1})`,
        rule: 'RELATIONSHIP_VELOCITY_COLLAPSE',
        description: `${firstHalfShifts} relationship shifts occur in the first half of the story but none in the second half — relational momentum collapses at the midpoint, when it should be building toward climax`,
        severity: 'major',
        suggestedFix: 'Add at least one relationship shift in the second half — either a major reversal approaching the climax or a quieter moment that registers the accumulated change between characters',
      });
    }
  }

  // ── Wave 177: Whiplash, uniform direction, unresolved rupture ───────────────

  // RELATIONSHIP_WHIPLASH: A pair flips direction three or more times across its
  // shifts. The opposite failure to MONOTONE_RELATIONSHIP (never reverses): here
  // the bond reverses so often it reads as erratic rather than evolving — the
  // audience can't track where the relationship actually stands. Requires 4+
  // shifts for the pair.
  for (const [pairKey, stats] of pairStats) {
    if (stats.shifts.length >= 4) {
      const signs = stats.shifts.map(s => Math.sign(s.amount)).filter(x => x !== 0);
      let changes = 0;
      for (let i = 1; i < signs.length; i++) {
        if (signs[i] !== signs[i - 1]) changes++;
      }
      if (changes >= 3) {
        const [a, b] = pairKey.split('|');
        issues.push({
          location: `${a} ↔ ${b}`,
          rule: 'RELATIONSHIP_WHIPLASH',
          description: `The relationship between ${a} and ${b} reverses direction ${changes} times across ${stats.shifts.length} shifts — the bond whiplashes between warming and souring so often it reads as erratic rather than evolving. The audience loses track of where these two actually stand.`,
          severity: 'minor',
          suggestedFix: 'Consolidate the reversals into a clearer arc. A relationship can turn twice — a betrayal, then a hard-won reconciliation — but each turn must be earned and stick long enough to register before the next.',
        });
      }
    }
  }

  // ALL_PAIRS_SAME_DIRECTION: Every significant relationship in the story drifts
  // the same way — all warming or all souring. The relational world has no
  // counterpoint: no bond strengthens while another frays. A story where every
  // relationship moves in lockstep feels tonally flat. Requires 2+ pairs, each
  // with a net movement of at least 0.3.
  if (pairStats.size >= 2) {
    const nets = [...pairStats.values()].map(p => p.shifts.reduce((s, x) => s + x.amount, 0));
    const significant = nets.filter(nt => Math.abs(nt) >= 0.3);
    if (significant.length === nets.length && significant.length >= 2) {
      const allPos = significant.every(nt => nt > 0);
      const allNeg = significant.every(nt => nt < 0);
      if (allPos || allNeg) {
        const direction = allPos ? 'warming' : 'souring';
        issues.push({
          location: 'Relational world',
          rule: 'ALL_PAIRS_SAME_DIRECTION',
          description: `All ${nets.length} relationships in the story drift the same way (${direction}) — no bond strengthens while another frays. The relational world moves in lockstep, with no counterpoint to give the ensemble tonal contrast.`,
          severity: 'minor',
          suggestedFix: `Reverse the trajectory of at least one relationship. If the central bond is ${direction}, let a secondary one move against it — contrast is what makes each individual arc legible.`,
        });
      }
    }
  }

  // UNRESOLVED_RELATIONSHIP_RUPTURE: A pair suffers a strong negative shift
  // (amount ≤ -0.5) well before the ending, and the story never returns to them
  // — no later shift for that pair. The rupture is opened and abandoned, leaving
  // an emotional thread dangling. Requires 6+ records and the rupture to fall
  // before the final 20% (so there was room to resolve it).
  if (records.length >= 6) {
    const resolveCutoff = Math.floor(records.length * 0.8);
    for (const [pairKey, stats] of pairStats) {
      const rupture = stats.shifts.find(s => s.amount <= -0.5);
      if (rupture && rupture.sceneIdx < resolveCutoff) {
        const hasLater = stats.shifts.some(s => s.sceneIdx > rupture.sceneIdx);
        if (!hasLater) {
          const [a, b] = pairKey.split('|');
          issues.push({
            location: `${a} ↔ ${b} (rupture at Scene ${rupture.sceneIdx})`,
            rule: 'UNRESOLVED_RELATIONSHIP_RUPTURE',
            description: `The bond between ${a} and ${b} ruptures hard at Scene ${rupture.sceneIdx} (shift ${rupture.amount.toFixed(1)}) but the story never returns to them — no later beat addresses the break. The emotional thread is opened and left dangling with room to spare.`,
            severity: 'major',
            suggestedFix: `Give this rupture a payoff before the end: a reconciliation, a final confrontation, or at least a beat that registers the cost of the break. A relationship the story bothered to fracture deserves a scene that closes the wound or names it as permanent.`,
          });
        }
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
