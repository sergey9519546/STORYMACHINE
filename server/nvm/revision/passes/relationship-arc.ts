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

  // ── Wave 192: Protagonist freeze, Act 1 void, cluster spike ─────────────────

  // PROTAGONIST_RELATIONSHIP_FREEZE: The protagonist (character appearing in the
  // most pairKeys) has a near-zero net relational arc (|net| < 0.2) while at
  // least one secondary pair has substantial movement (|net| ≥ 0.4). The central
  // character's relationships neither grow nor decay — surrounding relational
  // activity has no impact on the protagonist's bonds.
  if (records.length >= 8 && pairStats.size >= 2 && totalShifts >= 4) {
    const charPairCount = new Map<string, number>();
    for (const key of pairStats.keys()) {
      const [a, b] = key.split('|');
      charPairCount.set(a, (charPairCount.get(a) ?? 0) + 1);
      charPairCount.set(b, (charPairCount.get(b) ?? 0) + 1);
    }
    let protagonistChar = '';
    let maxPairAppear = 0;
    for (const [char, cnt] of charPairCount) {
      if (cnt > maxPairAppear) { maxPairAppear = cnt; protagonistChar = char; }
    }
    if (protagonistChar) {
      const protagonistNet = [...pairStats.entries()]
        .filter(([key]) => key.split('|').includes(protagonistChar))
        .reduce((sum, [, st]) => sum + st.shifts.reduce((s, x) => s + x.amount, 0), 0);
      const otherPairHasMovement = [...pairStats.entries()]
        .filter(([key]) => !key.split('|').includes(protagonistChar))
        .some(([, st]) => Math.abs(st.shifts.reduce((s, x) => s + x.amount, 0)) >= 0.4);
      if (Math.abs(protagonistNet) < 0.2 && otherPairHasMovement) {
        issues.push({
          location: `${protagonistChar} (protagonist relationships)`,
          rule: 'PROTAGONIST_RELATIONSHIP_FREEZE',
          severity: 'major',
          description: `${protagonistChar}'s relationships have a near-zero net arc (${protagonistNet.toFixed(2)}) while secondary pairs show substantial movement — the protagonist's bonds neither grow nor decay despite surrounding relational activity.`,
          suggestedFix: "Give the protagonist a clear relational trajectory: at least one bond that meaningfully warms or sours across the story. The protagonist's relational stasis makes the surrounding relational drama feel disconnected from the central character.",
        });
      }
    }
  }

  // RELATIONSHIP_ACT1_VOID: No relationship shifts occur in the first quarter of
  // the story. The story establishes no relational baseline — the audience doesn't
  // know where characters stand before complications arrive. All relational drama
  // begins cold, in medias res, without earned context. Requires 8+ records.
  if (records.length >= 8) {
    const act1RelEnd = Math.floor(records.length * 0.25);
    const act1HasShift = records.slice(0, act1RelEnd).some(r => (r.relationshipShifts ?? []).length > 0);
    if (!act1HasShift) {
      issues.push({
        location: 'Act 1 relationships',
        rule: 'RELATIONSHIP_ACT1_VOID',
        severity: 'minor',
        description: `No relationship shifts occur in the first ${act1RelEnd} scenes — Act 1 establishes no relational baseline. The audience doesn't know where characters stand before the complications arrive.`,
        suggestedFix: 'Plant at least one relationship shift in Act 1 — even a small warmth or tension. The audience needs to see where characters begin so they can measure how far they have traveled by the end.',
      });
    }
  }

  // CLUSTER_SHIFT_SCENE: A single scene contains simultaneous shifts for 3 or
  // more distinct character pairs. A "relationship explosion" scene where every
  // bond simultaneously moves strains dramatic plausibility — relationship changes
  // should build organically, not erupt in a single moment. Requires 6+ records.
  if (records.length >= 6) {
    for (const r of records) {
      const pairsShifted = new Set((r.relationshipShifts ?? []).map(s => s.pairKey));
      if (pairsShifted.size >= 3) {
        issues.push({
          location: `Scene ${r.sceneIdx} (${r.slug})`,
          rule: 'CLUSTER_SHIFT_SCENE',
          severity: 'minor',
          description: `Scene ${r.sceneIdx} simultaneously shifts ${pairsShifted.size} different character pairs — a "relationship explosion" where every bond moves at once. This strains plausibility and dilutes the impact of each individual shift.`,
          suggestedFix: 'Distribute the relationship shifts across multiple scenes. Let each shift land separately so the audience can absorb and register it before the next one arrives.',
        });
        break;
      }
    }
  }

  // ── Wave 203: Third-act void, rapid reconciliation, payoff abandoned ────────

  // RELATIONSHIP_THIRD_ACT_ESCALATION_ABSENT: The story accumulates relational
  // activity (≥3 total shifts) but none of it occurs in Act 3 (final 25%).
  // The climax has no relational dimension — character bonds go silent at the
  // story's highest-stakes moment, leaving the emotional resolution hollow.
  if (records.length >= 8 && totalShifts >= 3) {
    const act3Start203 = Math.floor(records.length * 0.75);
    const hasAct3Shift = records
      .slice(act3Start203)
      .some(r => (r.relationshipShifts ?? []).length > 0);
    if (!hasAct3Shift) {
      issues.push({
        location: `Act 3 (Scenes ${act3Start203}–${records.length - 1})`,
        rule: 'RELATIONSHIP_THIRD_ACT_ESCALATION_ABSENT',
        severity: 'major',
        description: `The story accumulates ${totalShifts} relationship shifts but none occur in Act 3 (Scene ${act3Start203} onward). The climax has no relational dimension — character bonds go silent at the story's highest-stakes moment.`,
        suggestedFix:
          'Add at least one relationship shift during the climax: a trust break under pressure, a reconciliation, or a power inversion. The audience needs to feel how the bonds resolve, not just how the plot resolves.',
      });
    }
  }

  // RAPID_RECONCILIATION: A pair suffers a large negative shift (≤ −0.5) and
  // then receives a large positive shift (≥ +0.5) within 2 scenes, with no
  // tension build-up (suspenseDelta < 1) in the intermediate scene(s). The
  // wound heals before the audience has time to feel it. Rupture and
  // reconciliation this compressed read as implausible emotional whiplash.
  if (records.length >= 6) {
    for (const [pairKey, stats] of pairStats) {
      let fired203rr = false;
      for (let i = 0; i + 1 < stats.shifts.length && !fired203rr; i++) {
        const rupture203 = stats.shifts[i];
        const recovery203 = stats.shifts[i + 1];
        const dist203 = recovery203.sceneIdx - rupture203.sceneIdx;
        if (rupture203.amount <= -0.5 && recovery203.amount >= 0.5 && dist203 <= 2) {
          let maxSuspense203 = 0;
          for (let s = rupture203.sceneIdx + 1; s < recovery203.sceneIdx; s++) {
            const ir = records[s];
            if (ir && ir.suspenseDelta > maxSuspense203) maxSuspense203 = ir.suspenseDelta;
          }
          if (maxSuspense203 < 1) {
            const [a, b] = pairKey.split('|');
            issues.push({
              location: `${a} ↔ ${b} (Scenes ${rupture203.sceneIdx}–${recovery203.sceneIdx})`,
              rule: 'RAPID_RECONCILIATION',
              severity: 'minor',
              description: `The bond between ${a} and ${b} ruptures (${rupture203.amount.toFixed(1)}) at Scene ${rupture203.sceneIdx} and reconciles (${recovery203.amount.toFixed(1)}) just ${dist203} scene(s) later with no tension in between — the wound heals before the audience can feel it.`,
              suggestedFix:
                'Let the rupture breathe: insert 2–3 scenes of genuine consequence before the reconciliation. The characters should earn their way back to each other through difficulty — not simply reset.',
            });
            fired203rr = true;
          }
        }
      }
    }
  }

  // RELATIONSHIP_PAYOFF_ABANDONED: A pair builds strong relational momentum
  // (|net| ≥ 0.8 across ≥2 early shifts in the first 60% of the story) but
  // has zero shifts in the final 40%. The arc promises a resolution it never
  // delivers — the relational engine cuts out before the ending it earned.
  if (records.length >= 8) {
    const earlyZone203 = Math.floor(records.length * 0.6);
    for (const [pairKey, stats] of pairStats) {
      const earlyShifts203 = stats.shifts.filter(s => s.sceneIdx < earlyZone203);
      const lateShifts203 = stats.shifts.filter(s => s.sceneIdx >= earlyZone203);
      if (earlyShifts203.length >= 2 && lateShifts203.length === 0) {
        const earlyNet203 = earlyShifts203.reduce((s, x) => s + x.amount, 0);
        if (Math.abs(earlyNet203) >= 0.8) {
          const [a, b] = pairKey.split('|');
          issues.push({
            location: `${a} ↔ ${b} (last shift: Scene ${earlyShifts203[earlyShifts203.length - 1].sceneIdx})`,
            rule: 'RELATIONSHIP_PAYOFF_ABANDONED',
            severity: 'major',
            description: `The relationship between ${a} and ${b} builds a net arc of ${earlyNet203.toFixed(2)} in the first 60% of the story, then vanishes — no shifts occur in the final 40%. The relational engine cuts out before the ending it promised.`,
            suggestedFix:
              'Return to this relationship in the final act. Even one beat that acknowledges the accumulated weight — a confrontation, a quiet resolution, or a moment of acknowledgment — prevents the arc from reading as abandoned.',
          });
        }
      }
    }
  }

  // ── Wave 220: Relational network & trajectory physics — graph topology, within-pair
  //    amplitude trend, temporal co-occurrence. These read the relationship set as a
  //    graph and as a set of trajectories rather than pair-by-pair in isolation. ──

  // RELATIONSHIP_STAR_TOPOLOGY (minor): every shifting pair shares one common node — the
  // relational graph is a star centred on a single character. The supporting cast has no
  // lateral bonds with EACH OTHER; everyone only relates to the hub. Ensembles feel alive
  // when secondary characters have relationships that move independently of the lead.
  if (pairStats.size >= 3) {
    const nodeInPairs220 = new Map<string, number>();
    for (const pk of pairStats.keys()) {
      for (const node of new Set(pk.split('|'))) {
        nodeInPairs220.set(node, (nodeInPairs220.get(node) ?? 0) + 1);
      }
    }
    const [hubNode220, hubCount220] = [...nodeInPairs220.entries()].sort((a, b) => b[1] - a[1])[0];
    if (hubCount220 === pairStats.size) {
      issues.push({
        location: `Relational graph (hub: ${hubNode220})`,
        rule: 'RELATIONSHIP_STAR_TOPOLOGY',
        severity: 'minor',
        description: `All ${pairStats.size} shifting relationships route through a single character (${hubNode220}) — the relational graph is a star with no lateral bonds. The supporting cast moves only in relation to the lead and never with each other, which makes the ensemble feel like satellites rather than a world.`,
        suggestedFix: `Give at least two secondary characters a relationship that shifts independently of ${hubNode220}: an alliance, a rivalry, a betrayal that the protagonist isn't part of. Lateral bonds turn a hub-and-spoke cast into a living ensemble.`,
      });
    }
  }

  // RELATIONSHIP_AMPLITUDE_DECAY (minor): a single pair's shift magnitudes shrink over
  // time — big early swings, negligible late ones. The bond's volatility dissipates before
  // the climax, so its most consequential beats are spent early and the relationship coasts
  // into the finale. Distinct from RELATIONSHIP_VELOCITY_COLLAPSE (shift COUNT drops to
  // zero) — here the shifts keep coming but their magnitude fades.
  for (const [pairKey, stats] of pairStats) {
    if (stats.shifts.length >= 4) {
      const mags220 = stats.shifts.map(s => Math.abs(s.amount));
      const half220 = Math.floor(mags220.length / 2);
      const earlyAvg220 = mags220.slice(0, half220).reduce((s, m) => s + m, 0) / half220;
      const lateAvg220 = mags220.slice(mags220.length - half220).reduce((s, m) => s + m, 0) / half220;
      if (earlyAvg220 > 0 && lateAvg220 < 0.5 * earlyAvg220) {
        const [a, b] = pairKey.split('|');
        issues.push({
          location: `${a} ↔ ${b}`,
          rule: 'RELATIONSHIP_AMPLITUDE_DECAY',
          severity: 'minor',
          description: `The bond between ${a} and ${b} swings hard early (avg magnitude ${earlyAvg220.toFixed(2)}) but barely moves later (avg ${lateAvg220.toFixed(2)}) — its volatility dissipates before the climax. The relationship spends its biggest beats early and coasts into the finale on fumes.`,
          suggestedFix: `Reserve a high-magnitude beat for this pair late in the story — a final reckoning that outweighs the early turbulence. A relationship's most consequential shift should land near the climax, not be exhausted in the opening movement.`,
        });
        break; // one flag per pass to avoid noise
      }
    }
  }

  // RELATIONSHIP_THREADS_SILOED (minor): two or more relationships move across the story,
  // but no single scene ever advances two different pairs at once. The relational threads
  // run in separate lanes and never intersect — the story misses the dramatic irony of one
  // bond strengthening as another frays in the same room. Requires 2+ pairs and 4+ shifts.
  if (pairStats.size >= 2 && totalShifts >= 4) {
    let anyCoOccurrence220 = false;
    for (const r of records) {
      const pairsInScene220 = new Set((r.relationshipShifts ?? []).map(s => s.pairKey));
      if (pairsInScene220.size >= 2) { anyCoOccurrence220 = true; break; }
    }
    if (!anyCoOccurrence220) {
      issues.push({
        location: 'Relational threading',
        rule: 'RELATIONSHIP_THREADS_SILOED',
        severity: 'minor',
        description: `The story tracks ${pairStats.size} relationships but never moves two of them in the same scene — each bond advances in its own isolated lane. The relational threads never intersect, so the story forgoes the dramatic irony of one relationship deepening exactly as another fractures in the same moment.`,
        suggestedFix: 'Stage at least one scene where two relationships shift together: a confrontation that draws one pair closer while pushing another apart. Relationships gain dimension when they collide in the same dramatic space rather than taking turns.',
      });
    }
  }

  // ── Wave 234: Pair dimension monotone, first-impression contradiction, resolution void ──

  // PAIR_DIMENSION_MONOTONE (minor): A pair with ≥3 shifts uses the same dimension
  // in every single shift — the relationship operates on only one axis. Real bonds
  // move on multiple dimensions (trust, power, loyalty, affection). When one pair's
  // entire arc plays out as "trust only" or "power only," the relationship feels
  // one-dimensional. Distinct from SINGLE_REGISTER_CONFLICT (conflict pass, global
  // all-pairs) — this fires per-pair for any single relationship that is dimensionally locked.
  for (const [pairKey, stats] of pairStats) {
    if (stats.shifts.length >= 4 && stats.netByDimension.size === 1) {
      const [a234, b234] = pairKey.split('|');
      const [onlyDim234] = stats.netByDimension.keys();
      issues.push({
        location: `${a234} ↔ ${b234}`,
        rule: 'PAIR_DIMENSION_MONOTONE',
        severity: 'minor',
        description: `The relationship between ${a234} and ${b234} has ${stats.shifts.length} shifts but all operate on the same dimension ("${onlyDim234}") — the bond is dimensionally locked. Real relationships move on multiple axes: trust, power, loyalty, affection. A single-axis arc feels thin and predictable.`,
        suggestedFix: `Introduce at least one shift on a second dimension between ${a234} and ${b234}: if all shifts have been about trust, add a scene that moves their power balance or tests their loyalty. Multi-axis bonds feel lived-in rather than schematic.`,
      });
      break; // one flag per pass
    }
  }

  // RELATIONSHIP_FIRST_IMPRESSION_CONTRADICTION (minor): A pair whose first shift
  // is highly positive (≥0.4) but whose total net trajectory ends negative (≤-0.2).
  // The story promises warmth and then systematically destroys the relationship —
  // a structural pattern that can be powerful if earned, but often signals an
  // underwritten deterioration. Requires ≥4 shifts in the pair.
  for (const [pairKey, stats] of pairStats) {
    if (stats.shifts.length >= 4) {
      const firstAmount234 = stats.shifts[0].amount;
      const net234 = stats.shifts.reduce((s: number, x: any) => s + x.amount, 0);
      if (firstAmount234 >= 0.4 && net234 <= -0.2) {
        const [a234, b234] = pairKey.split('|');
        issues.push({
          location: `${a234} ↔ ${b234}`,
          rule: 'RELATIONSHIP_FIRST_IMPRESSION_CONTRADICTION',
          severity: 'minor',
          description: `The relationship between ${a234} and ${b234} opens with a strong positive shift (+${firstAmount234.toFixed(2)}) but ends with a net negative trajectory (${net234.toFixed(2)}) — the story hooks the audience with warmth and then systematically deteriorates the bond. This arc requires explicit earned turning points to feel justified rather than arbitrary.`,
          suggestedFix: `Make the deterioration feel inevitable by adding a clear cause: a scene of betrayal, a moment of fundamental incompatibility, or a choice that makes the collapse legible. A positive opening raises the audience's investment — its betrayal must be earned.`,
        });
        break;
      }
    }
  }

  // RELATIONSHIP_RESOLUTION_VOID (major, ≥2 pairs, n≥8): No pair has a positive
  // shift anywhere in Act 3 (final 25%). The story enters its resolution phase
  // with all relational movement either absent or negative — no bond is brought
  // to a positive conclusion in the finale. Distinct from THIRD_ACT_VOID (no shifts
  // at all) — this fires when shifts exist in Act 3 but none resolve positively.
  if (pairStats.size >= 2 && records.length >= 8) {
    const act3Start234 = Math.floor(records.length * 0.75);
    const hasAnyShiftInAct3 = records.slice(act3Start234).some(r =>
      (r.relationshipShifts ?? []).length > 0,
    );
    if (hasAnyShiftInAct3) {
      const hasPosResolution234 = records.slice(act3Start234).some(r =>
        (r.relationshipShifts ?? []).some((s: any) => s.amount > 0),
      );
      if (!hasPosResolution234) {
        issues.push({
          location: `Act 3 (Scenes ${act3Start234}–${records.length - 1})`,
          rule: 'RELATIONSHIP_RESOLUTION_VOID',
          severity: 'major',
          description: `Act 3 contains relationship shifts but none are positive — the story's resolution phase ends without any relational closure. All Act 3 relational movement is negative or zero; no bond is brought to a positive conclusion in the finale.`,
          suggestedFix: 'Give at least one pair a positive shift in Act 3: a reconciliation, a trust restored, or an alliance confirmed. The resolution must deliver at least one relational landing that feels earned after the preceding conflict.',
        });
      }
    }
  }
  // ── Wave 248: Pair velocity spike, Act 1 relational desert, multi-pair climax convergence ──

  // PAIR_VELOCITY_SPIKE (minor, n≥8): A pair accumulates ≥3 shifts within any
  // 3-scene window — the relationship changes violently in a short burst. Rapid-fire
  // multi-shift windows suggest relationship changes were written in a hurry rather
  // than earned through sustained dramatic pressure. Even when each individual shift
  // is plausible, three shifts in three consecutive scenes compress what should be
  // an arc into a sprint. Distinct from RELATIONSHIP_VELOCITY_COLLAPSE (second-half
  // slowdown) — this catches a sudden burst of change, the opposite failure.
  if (records.length >= 8) {
    for (const [pairKey248, stats248] of pairStats) {
      if (stats248.shifts.length < 3) continue;
      for (let i = 0; i + 2 < stats248.shifts.length; i++) {
        const windowEnd248 = stats248.shifts[i + 2].sceneIdx;
        const windowStart248 = stats248.shifts[i].sceneIdx;
        if (windowEnd248 - windowStart248 <= 2) {
          const [a248, b248] = pairKey248.split('|');
          issues.push({
            location: `${a248} ↔ ${b248} (Scenes ${windowStart248}–${windowEnd248})`,
            rule: 'PAIR_VELOCITY_SPIKE',
            severity: 'minor',
            description: `The relationship between ${a248} and ${b248} accumulates ${3} shifts in a ${windowEnd248 - windowStart248 + 1}-scene window (Scenes ${windowStart248}–${windowEnd248}) — the bond changes more in a 3-scene burst than most relationships change in an entire arc. Rapid-fire relationship shifts feel imposed rather than earned.`,
            suggestedFix: `Space the shifts for ${a248} and ${b248}: let each change settle and generate a consequence before the next arrives. A relationship that moves on three fronts simultaneously has no time to dramatise the cost of each shift.`,
          });
          break;
        }
      }
    }
  }

  // RELATIONSHIP_ACT1_DESERT (major, n≥10, ≥2 pairs): No pair has any
  // relationship shift in Act 1 (first 25%). The setup establishes characters
  // without establishing their relational world — the audience enters Act 2
  // with no sense of who trusts, fears, or opposes whom. The interpersonal
  // landscape is defined by what characters DO to each other; an Act 1 without
  // any relational events is an ensemble of strangers, not a cast.
  // Distinct from NO_RELATIONSHIP_MOVEMENT (no shifts at all in the whole story)
  // and STATIC_COAPPEAR (pair with co-appearances but never a shift).
  if (records.length >= 10 && pairStats.size >= 2) {
    const act1End248 = Math.floor(records.length * 0.25);
    const hasAct1Shift248 = records.slice(0, act1End248).some(r =>
      (r.relationshipShifts ?? []).length > 0,
    );
    if (!hasAct1Shift248) {
      issues.push({
        location: `Act 1 (Scenes 0–${act1End248 - 1}) — relationship layer`,
        rule: 'RELATIONSHIP_ACT1_DESERT',
        severity: 'major',
        description: `Act 1 (the first ${act1End248} scenes) contains no relationship shifts — the setup introduces characters but leaves the relational world blank. The audience enters Act 2 with no established bonds, rivalries, or alliances to invest in or see tested.`,
        suggestedFix: 'Plant at least one relationship shift in Act 1: a gesture of trust that will later be betrayed, a rivalry established, or an alliance formed. Characters who share no relational event in the setup are strangers to each other and to the audience.',
      });
    }
  }

  // MULTI_PAIR_CLIMAX_CONVERGENCE (minor, n≥8, ≥3 pairs): More than 2 pairs each
  // have their chronologically final shift in the same 3-scene window in Act 3
  // (last 25%). All relationships resolve simultaneously — a relational pileup
  // that dilutes every individual arc's landing. Each pair's resolution needs its
  // own dramatic space; when every bond concludes in the same handful of scenes,
  // no single arc can receive the weight it deserves.
  if (records.length >= 8 && pairStats.size >= 3) {
    const act3Start248 = Math.floor(records.length * 0.75);
    const finalShiftScenes248: number[] = [];
    for (const stats248 of pairStats.values()) {
      if (stats248.shifts.length === 0) continue;
      const lastShiftIdx248 = stats248.shifts[stats248.shifts.length - 1].sceneIdx;
      if (lastShiftIdx248 >= act3Start248) {
        finalShiftScenes248.push(lastShiftIdx248);
      }
    }
    if (finalShiftScenes248.length >= 3) {
      const minFinal248 = Math.min(...finalShiftScenes248);
      const maxFinal248 = Math.max(...finalShiftScenes248);
      if (maxFinal248 - minFinal248 <= 2) {
        issues.push({
          location: `Act 3 relational convergence (Scenes ${minFinal248}–${maxFinal248})`,
          rule: 'MULTI_PAIR_CLIMAX_CONVERGENCE',
          severity: 'minor',
          description: `${finalShiftScenes248.length} relationship pairs each complete their final shift within a ${maxFinal248 - minFinal248 + 1}-scene window in Act 3 (Scenes ${minFinal248}–${maxFinal248}) — every arc resolves simultaneously. A relational pileup in the climax dilutes every individual bond's landing; none can receive the dramatic weight it deserves.`,
          suggestedFix: 'Stagger the relational resolutions: let each significant pair have its own closing moment, spaced across Act 3. The final scene between two characters should stand out in the audience\'s memory; when all pairs close simultaneously, none of them does.',
        });
      }
    }
  }
  // ── End Wave 248 ─────────────────────────────────────────────────────────────

  // ── End Wave 234 ─────────────────────────────────────────────────────────────

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
