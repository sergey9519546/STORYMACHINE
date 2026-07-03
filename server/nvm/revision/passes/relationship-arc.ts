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
// Wave 262 additions: pair oscillation (signs flip 3+ times), single-scene arc (all
// of a pair's shifts in one scene), weak-shift dominance (frequent but tiny shifts).
// Wave 276 additions: midpoint freeze (middle 50% relationally silent), net-zero
// majority (>60% of pairs cancel out their own shifts), depth gap (one pair gets
// 3× more shifts than the second most active pair).
// Wave 290 additions: relationship opening burst (all shifts in first 25% — resolved too
// early), negative-only majority (>60% of pairs have exclusively negative shifts),
// shift dimension concentration (all shifts across all pairs share a single dimension).
// Wave 304 additions: shift magnitude uniformity (5+ shifts all with the identical
// magnitude — generation artifact), warmth unfelt (3+ strong positive shifts all in
// emotionally neutral scenes), dimension one-way (a dimension with 4+ shifts that
// Wave 318 additions: relationship curiosity decoupled (shift scenes avg curiosityDelta
// ≤ 0), positive-only pair majority (>60% of pairs have exclusively positive shifts —
// all-warmth world), relationship Act 2b desert (no shifts in 50%-75% zone).
// only ever moves in one direction story-wide).
// Wave 329 additions: relationship revelation silent (no revelation scene contains a
// bond shift), pair early-peak majority (>60% of pairs peak in the first 30%),
// relationship suspense decoupled (shift scenes avg suspenseDelta ≤ 0).
// Wave 343 additions: relationship rupture emotion flat (every negative-shift scene is
// emotionally neutral — the negative counterpart to warmth unfelt), relationship global
// amplitude frontload (story-wide first-half shift magnitude > 1.5× second-half — ensemble
// intensity front-loads), relationship shift drought (the longest contiguous no-shift run
// spans ≥40% of the story — relational silence anywhere, not just a named act zone).
// Wave 357 additions: relationship curiosity peak absent (the scene with the highest
// curiosityDelta carries no relationship shift, even though other curiosity-positive scenes
// do), pair second-half void (a pair with ≥3 first-half shifts has zero in the second half
// — per-pair front-loading), relationship dramatic turn decoupled (no dramatic-turn scene
// carries any relationship shift — pivots never crack or strengthen bonds).
// Wave 371 additions: relationship suspense peak absent (the highest-suspense scene carries
// no relationship shift while other suspense-positive scenes do), relationship clock decoupled
// (no shift lands in any clock-raised scene though both exist — bonds never move under deadline
// pressure), pair first-half void (a pair with ≥3 second-half shifts has zero in the first half
// — per-pair late start, the mirror of pair second-half void).
// Wave 385 additions: relationship peak emotion flat (the single largest-magnitude shift lands
// in a neutral scene while other shift scenes carry emotion — the single-peak emotion cell),
// pair midpoint void (a pair shifts before and after the 40%–60% window but not within it — the
// per-pair midpoint cell), pair emotion flat (a pair with ≥3 shifts all in neutral scenes — the
// per-pair emotion cell, distinct from the whole-story and polarity-set emotion checks).
// Wave 399 additions: pair suspense flat (a pair with ≥3 shifts whose every shift scene has
// suspenseDelta ≤ 0 — bond moves entirely without dramatic tension; per-pair suspense cell,
// complement of relationship suspense decoupled which aggregates globally), pair curiosity flat
// (same analytical mode × curiosity channel — the per-pair curiosity cell, complement of
// relationship curiosity decoupled), relationship revelation emotion decoupled (revelation
// scenes that also carry a bond shift are all emotionally neutral — disclosures crack bonds
// without the scene feeling anything; distinct from revelation silent which fires when no
// revelation+shift overlap exists at all).
// Wave 413 additions: pair clock flat (a pair with ≥3 shifts, none of which land in a clock-
// raised scene though clocks exist — the per-pair clock cell, complement of relationship clock
// decoupled), pair dramatic-turn flat (a pair with ≥3 shifts, none coinciding with a dramatic
// turn though turns exist — the per-pair turn cell, complement of relationship dramatic turn
// decoupled), pair revelation flat (a pair with ≥3 shifts, none coinciding with a revelation
// though revelations exist — the per-pair revelation cell, complement of relationship revelation
// silent). These complete the per-pair channel set alongside pair suspense/curiosity/emotion flat.
// Wave 427 additions: relationship shift aftermath void (sequence/aftermath — every shift scene
// that has room after it is followed by two relationally silent scenes; bonds move in isolation
// without sparking any chain reaction), pair amplitude growth (run-based — a pair with ≥4 shifts
// whose late-half average magnitude exceeds 1.5× the early-half average; the complement of
// relationship amplitude decay), pair repair unmotivated (backward-cause — a pair with ≥3 shifts
// has positive shifts preceded by neither a prior pair conflict within 3 scenes nor any dramatic
// catalyst in that scene or the prior; warmings arrive without cause).
// Wave 441 additions: pair ensemble solo (≥3 pairs each with ≥2 shifts yet no single scene has
// shifts from 2+ different pairs simultaneously — the relational world moves one bond at a time,
// missing compound beats where multiple dynamics shift together; co-occurrence/decoupling ×
// multi-pair coincidence, first check auditing simultaneous multi-pair movement), pair rupture run
// (3+ consecutive scenes each carry at least one major rupture ≤ -0.3 — back-to-back breaks
// with no breath between them; run-based × negative-shift channel, distinct from PAIR_AMPLITUDE_
// GROWTH's magnitude-growth run), relationship climax void (no shift of magnitude ≥ 0.3 in the
// final 15% of scenes while ≥3 shifts from ≥2 pairs exist in the first 85% — the story's most
// emotionally charged moment is relationally silent; zone presence/absence × final-zone, fills
// the zone set alongside midpoint freeze and Act 2b desert).
// Wave 455 additions: pair rupture unmotivated (backward-cause × negative shift × per-pair —
// a pair's negative shifts are all preceded by no prior warmth for that pair, no revelation, and
// no dramatic turn in the prior 3 scenes; ruptures arrive causeless, the mirror of PAIR_REPAIR_
// UNMOTIVATED on the negative side), relationship shift curiosity void (sequence/aftermath ×
// curiosity channel — no relationship-shift scene is followed by curiosityDelta > 0 in the next
// 2 scenes; bonds move without generating new questions downstream, the curiosity-channel sibling
// of RELATIONSHIP_SHIFT_AFTERMATH_VOID), relationship warmth run (run-based × positive-shift —
// 3+ consecutive scenes each carry a major positive shift ≥ 0.3 from any pair; warmings avalanche
// without breathing room, the positive mirror of PAIR_RUPTURE_RUN).
// Wave 469 additions: relationship shift suspense aftermath void (sequence/aftermath × suspense
// channel — no shift scene followed by suspenseDelta>0 in next 2 scenes; completing the shift-
// aftermath family's suspense channel alongside RELATIONSHIP_SHIFT_CURIOSITY_VOID), relationship
// shift emotional aftermath void (sequence/aftermath × emotional channel — no shift scene followed
// by emotionalShift≠neutral in next 2 scenes; adding the emotional channel to the shift-aftermath
// family), relationship Act 1 void (zone presence/absence × first-quarter — no shift in the first
// 25% while ≥3 shifts exist in the rest; fills the zone set alongside midpoint freeze, Act 2b
// desert, and relationship climax void).
// Wave 483 additions: relationship shift revelation aftermath void (sequence/aftermath × revelation
// channel — no shift scene followed by a revelation in next 2 scenes; adds the disclosure channel
// to the shift-aftermath family alongside curiosity/suspense/emotional), relationship shift thirds
// cluster (distribution/timing × thirds — ≥4 shifts with >75% in one structural third; first
// thirds-distribution check for bond activity, distinct from existing half-based distribution
// checks), relationship Act 2a void (zone presence/absence × Act 2a — no shift in the 25%–50%
// zone while ≥3 shifts exist in the rest; completes the zone set alongside Act 1 void, midpoint
// freeze, Act 2b desert, and relationship climax void).
// Wave 511 additions: relationship shift dramatic turn aftermath void (sequence/aftermath ×
// dramatic-turn channel — no shift scene followed by a dramatic turn in next 2 scenes while
// ≥2 turns exist; adds turn as seventh channel in the shift-aftermath family alongside clock,
// curiosity, suspense, emotional, and revelation, distinct from RELATIONSHIP_DRAMATIC_TURN_
// DECOUPLED which audits same-scene co-occurrence), rupture thirds cluster (distribution/timing
// × negative shift × thirds — >75% of rupture scenes — any shift ≤ -0.3 — fall within one
// structural third while ≥4 ruptures exist; negative-shift sibling of RELATIONSHIP_WARMTH_
// CLUSTER, distinct from RELATIONSHIP_SHIFT_THIRDS_CLUSTER which aggregates all valences and
// PAIR_RUPTURE_RUN which tracks consecutive local presence), relationship payoff decoupled
// (co-occurrence/decoupling × payoff × shift — ≥3 shift scenes and ≥3 payoff scenes never
// in same scene; first check in relationship-arc.ts to use the payoff signal, distinct from
// all existing co-occurrence checks that pair shift with turn/clock/curiosity/revelation/suspense).
// Wave 497 additions: relationship shift clock aftermath void (sequence/aftermath × clock channel
// — no shift scene followed by a clock raise in next 2 scenes while ≥2 clock scenes exist; adds
// clock to the shift-aftermath family alongside curiosity, suspense, emotional, and revelation),
// relationship warmth cluster (distribution/timing × positive shift × thirds — >75% of positive
// shifts in one third while ≥4 positive shifts exist; the positive-shift sibling of RELATIONSHIP_
// SHIFT_THIRDS_CLUSTER which aggregates all shifts regardless of valence), relationship dimension
// run (run-based × shift dimension — ≥4 consecutive shift scenes all using only one relationship
// dimension while ≥2 distinct dimensions exist globally; a local single-axis burst distinct from
// SHIFT_DIMENSION_CONCENTRATION which audits the whole-story proportion).
// Wave 553 additions: relationship emotion decoupled (average/aggregate × emotion × global
// shift — >70% of shift scenes have neutral emotionalShift while ≥4 exist; parallel to
// RELATIONSHIP_CURIOSITY_DECOUPLED and RELATIONSHIP_SUSPENSE_DECOUPLED, fills the emotion
// channel in the average/aggregate × global-shift family; distinct from WARMTH_UNFELT which
// only audits positive shifts and RELATIONSHIP_RUPTURE_EMOTION_FLAT which only audits negative),
// pair dimension monopoly (underweight/bloat × dimension × per-pair — a pair with ≥4 shifts
// whose every shift uses only one relationship dimension while ≥2 distinct dimensions exist
// globally; the per-pair complement of SHIFT_DIMENSION_CONCENTRATION which fires when ALL
// shifts globally share one dimension, and distinct from DIMENSION_ONE_WAY which fires on
// directional uniformity not dimensional breadth), pair thirds concentrated (distribution/timing
// × thirds × per-pair — a pair with ≥4 shifts where >75% fall in one structural third; the
// per-pair complement of RELATIONSHIP_SHIFT_THIRDS_CLUSTER which aggregates all pairs globally,
// distinct from PAIR_SECOND_HALF_VOID/PAIR_FIRST_HALF_VOID which use half-based zones).
// Wave 539 additions: pair seed flat (co-occurrence × seed × per-pair — a pair with ≥3 shifts
// has none of its shift scenes coinciding with any seededClueId, while ≥3 seed scenes exist
// globally; per-pair complement of RELATIONSHIP_SEED_DECOUPLED, adds the seed channel to the
// per-pair co-occurrence family alongside clock/turn/revelation/suspense/curiosity/emotion),
// pair payoff flat (co-occurrence × payoff × per-pair — a pair with ≥3 shifts has none of its
// shift scenes coinciding with any payoffSetupId, while ≥3 payoff scenes exist globally; per-pair
// complement of RELATIONSHIP_PAYOFF_DECOUPLED, adds the payoff channel to the per-pair family),
// pair shift run (run-based × single-pair monopoly — ≥4 consecutive shift scenes all involve
// only a single pair while ≥2 pairs with ≥2 shifts exist; one pair monopolizes a sustained
// relational stretch; distinct from RELATIONSHIP_DIMENSION_RUN which tracks dimension monopoly,
// PAIR_RUPTURE_RUN which tracks consecutive negative shifts from any pair, and DEPTH_GAP which
// measures total amplitude concentration across the whole story).
// Wave 581 additions: relationship peak uncaused (backward-cause × peak shift — n≥8, the story's
// largest-magnitude bond change has no revelation/turn/suspense>0 in itself or prior 2 scenes;
// completes the backward-cause family alongside pair repair/rupture unmotivated; distinct from
// those per-pair checks by isolating the global peak regardless of valence), pair amplitude decay
// (distribution/timing × per-pair × amplitude decay — a pair with ≥4 shifts where late-half mean
// magnitude < 0.5× early-half mean; the relationship's engine winds down dramatically; decay mirror
// of PAIR_AMPLITUDE_GROWTH [Wave 427]), relationship clock valence uniform (valence × relationship ×
// clock trigger — n≥8, ≥3 clock+shift scenes, all have shifts exclusively positive OR exclusively
// negative; deadline-driven bonds always move in one direction; clock-trigger complement of payoff
// and seed valence checks; distinct from RELATIONSHIP_CLOCK_DECOUPLED [no overlap at all]).
// Wave 567 additions: relationship peak revelation absent (single-peak isolation × revelation ×
// relationship — n≥8, the story's largest-magnitude shift carries no revelation while ≥2 other shift
// scenes coincide with a disclosure; the biggest bond change is not a moment of truth), relationship
// peak dramatic-turn absent (single-peak × dramatic-turn × relationship — the largest shift carries no
// turn while ≥2 other shift scenes ride a pivot; the biggest swing is structurally inert), relationship
// peak clock absent (single-peak × clock × relationship — the largest shift raises no clock while ≥2
// other shift scenes move under deadline pressure; the biggest swing plays in calm water). These fill
// the revelation, dramatic-turn, and clock channels of the peak family alongside RELATIONSHIP_PEAK_
// EMOTION_FLAT, RELATIONSHIP_CURIOSITY_PEAK_ABSENT, and RELATIONSHIP_SUSPENSE_PEAK_ABSENT; each is
// distinct from its aggregate co-occurrence sibling (RELATIONSHIP_REVELATION_SILENT / RELATIONSHIP_
// DRAMATIC_TURN_DECOUPLED / RELATIONSHIP_CLOCK_DECOUPLED, which fire only when NO shift carries the
// channel) by isolating the single peak shift even when most shifts DO carry the channel.
// Wave 525 additions: relationship shift seed aftermath void (sequence/aftermath × seed × shift
// trigger — ≥3 shift scenes not in last 2 positions, ≥2 seed scenes, every shift followed by 2
// scenes with no seededClueIds; bond-moving never activates foreshadowing in its aftermath; adds
// seed to the shift-aftermath family, completing the family alongside suspense/emotional/revelation/
// clock/dramatic-turn; distinct from RELATIONSHIP_SHIFT_AFTERMATH_VOID which checks all channels
// simultaneously and from co-occurrence checks), relationship shift payoff aftermath void (sequence/
// aftermath × payoff × shift trigger — ≥3 shift scenes not in last 2 positions, ≥2 payoff scenes,
// every shift followed by 2 scenes with no payoffSetupIds; bond-moving never triggers thread
// resolution in its aftermath; adds payoff to the shift-aftermath family; distinct from
// RELATIONSHIP_PAYOFF_DECOUPLED which is same-scene co-occurrence), relationship seed decoupled
// (co-occurrence × seed × shift — ≥3 shift scenes, ≥3 seed scenes, zero overlap; bond-moving
// and foreshadowing planting never coincide; first check in this pass pairing the seed channel
// with relationship shift in co-occurrence mode; distinct from all existing co-occurrence checks
// that pair shift with curiosity/suspense/turn/clock/payoff/revelation and from aftermath checks).
// Wave 595 additions: relationship shift purpose monotone (average/aggregate × relationship-shift
// × scene-purpose — n≥8, ≥4 shift scenes [|amount|≥0.3], >70% share the identical `purpose` value;
// relational movement is confined to one narrative function rather than distributed across the
// story's structural range; the `purpose` field — a fixed ScenePurpose enum — was completely
// unused anywhere else in this 99-rule file, despite 9 existing checks already keying on the
// DIMENSION field of a shift; first check on the purpose signal here), relationship shift zone
// imbalance (underweight/bloat × relationship-shift × four structural zones, built on
// checkZoneImbalance from the shared checks library — audit M2.2 — n≥10, ≥4 shift scenes; fires
// only when one zone has zero shifts while another holds ≥50% of the total; distinct from
// RELATIONSHIP_SHIFT_THIRDS_CLUSTER [thirds, no zero-zone requirement] and from the various
// single-zone-absence checks [PAIR_MIDPOINT_VOID, PAIR_FIRST/SECOND_HALF_VOID, RELATIONSHIP_
// CLIMAX_VOID] which each audit one fixed zone rather than requiring a void+bloat co-presence
// across all four), relationship shift stakes decoupled (co-occurrence/decoupling × relationship-
// shift × stakes-raise purpose, built on checkCoOccurrenceDecoupled — n≥8, ≥3 shift scenes, ≥2
// raise_stakes-purpose scenes, zero overlap; bond-moving never coincides with the scene explicitly
// raising what's at risk; first co-occurrence check in this pass pairing shift with the purpose
// signal rather than with a numeric delta channel).
// Wave 609 additions (built on the shared checks library, audit M2.2): OPEN_THREAD_RELATIONSHIP_
// SHIFT_DECOUPLED (co-occurrence/decoupling × unresolvedClues × relationshipShifts — first use of
// unresolvedClues anywhere in this 102-rule pass), PHYSICAL_PRESENCE_ZONE_IMBALANCE
// (underweight/bloat × visualBeats × four structural zones — first use of visualBeats anywhere in
// this pass), RELATIONSHIP_SHIFT_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID (sequence/aftermath ×
// relationship-shift trigger → dialogueHighlights absence — first use of dialogueHighlights
// anywhere in this pass).
// Wave 623 additions (built on the shared checks library, audit M2.2): RELATIONAL_PAYOFF_
// STAGING_DECOUPLED (co-occurrence/decoupling × payoffSetupIds × visualBeats — first pairing of
// these two fields in this 105-rule pass), RELATIONAL_SEED_STAGING_AFTERMATH_VOID
// (sequence/aftermath × seededClueIds trigger → visualBeats absence — first pairing of these two
// fields), RELATIONAL_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE (underweight/bloat × dialogueHighlights ×
// four structural zones — Waves 595/609 applied this template to relationshipShifts and
// visualBeats; dialogueHighlights itself has never been zone-audited here).

import type { PassInput, PassResult, RevisionIssue } from './types.ts';
import { rewritePass } from '../rewrite.ts';
import { checkZoneImbalance, checkCoOccurrenceDecoupled, checkAftermathVoid, FOUR_ZONE_NAMES } from './lib/checks.ts';

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

  // ── Wave 262: Pair oscillation, single-scene arc, late introduction ──

  // PAIR_OSCILLATION (minor, ≥4 shifts): A pair's shift signs alternate three or
  // more times (+,-,+,- …) — the relationship yo-yos between warming and souring
  // with no settled direction. Distinct from MONOTONE_RELATIONSHIP (all one sign):
  // this is the opposite failure, a bond that flips so often it never establishes a
  // trajectory. Constant reversals without escalation read as indecision rather
  // than dynamism — the audience stops trusting any given state will hold.
  if (records.length >= 6) {
    for (const [pairKey262, stats262] of pairStats) {
      if (stats262.shifts.length < 4) continue;
      const signs262 = stats262.shifts.map(s => Math.sign(s.amount)).filter(sg => sg !== 0);
      let flips262 = 0;
      for (let i = 1; i < signs262.length; i++) {
        if (signs262[i] !== signs262[i - 1]) flips262++;
      }
      if (flips262 >= 3) {
        const [a262, b262] = pairKey262.split('|');
        issues.push({
          location: `${a262} ↔ ${b262}`,
          rule: 'PAIR_OSCILLATION',
          severity: 'minor',
          description: `The relationship between ${a262} and ${b262} reverses direction ${flips262} times across ${stats262.shifts.length} shifts (warming, then souring, then warming again) — the bond yo-yos with no settled trajectory. Constant reversals without escalation read as indecision; the audience stops believing any state will hold.`,
          suggestedFix: `Give ${a262} and ${b262} a through-line: even a turbulent relationship should trend somewhere. Let each reversal cut deeper or build higher than the last so the oscillation becomes an escalating spiral, not a flat back-and-forth that resets each scene.`,
        });
        break;
      }
    }
  }

  // PAIR_SINGLE_SCENE_ARC (minor, ≥3 shifts): A pair's entire shift history (three
  // or more shifts) occurs within a single scene — the whole relationship arc is
  // compressed into one beat. Distinct from PAIR_VELOCITY_SPIKE (a 3-scene burst):
  // this is the extreme case where the bond's every movement lands in the same
  // scene, then never moves again. An arc that happens all at once isn't an arc;
  // it's an event the rest of the story doesn't develop.
  if (records.length >= 6) {
    for (const [pairKey262b, stats262b] of pairStats) {
      if (stats262b.shifts.length < 3) continue;
      const firstScene262b = stats262b.shifts[0].sceneIdx;
      if (stats262b.shifts.every(s => s.sceneIdx === firstScene262b)) {
        const [a262b, b262b] = pairKey262b.split('|');
        issues.push({
          location: `${a262b} ↔ ${b262b} (Scene ${firstScene262b})`,
          rule: 'PAIR_SINGLE_SCENE_ARC',
          severity: 'minor',
          description: `The entire relationship arc between ${a262b} and ${b262b} (${stats262b.shifts.length} shifts) happens inside a single scene (Scene ${firstScene262b}) — the bond changes completely in one beat and then never moves again. An arc compressed into one scene isn't an arc; it's an event the rest of the story leaves undeveloped.`,
          suggestedFix: `Distribute the ${a262b}–${b262b} shifts across the story: plant the relationship early, complicate it in the middle, resolve it near the end. A relationship that does all its changing in one scene denies the audience the slow build that makes the change matter.`,
        });
        break;
      }
    }
  }

  // PAIR_WEAK_SHIFT_DOMINANCE (minor, ≥4 shifts): A pair shifts frequently (four or
  // more times) but every shift is tiny (|amount| < 0.2) — the relationship registers
  // constant micro-adjustments that never accumulate into a felt change. Lots of
  // motion, no distance covered. Distinct from STATIC_RELATIONSHIP (net cancels to
  // ~0): here the net can be non-zero, but no single beat is ever strong enough for
  // the audience to feel the bond move. The relationship fidgets instead of changing.
  if (records.length >= 6) {
    for (const [pairKey262c, stats262c] of pairStats) {
      if (stats262c.shifts.length < 4) continue;
      const maxMag262c = Math.max(...stats262c.shifts.map(s => Math.abs(s.amount)));
      if (maxMag262c < 0.2) {
        const [a262c, b262c] = pairKey262c.split('|');
        issues.push({
          location: `${a262c} ↔ ${b262c}`,
          rule: 'PAIR_WEAK_SHIFT_DOMINANCE',
          severity: 'minor',
          description: `The relationship between ${a262c} and ${b262c} shifts ${stats262c.shifts.length} times but no single shift exceeds 0.2 in magnitude — the bond registers constant micro-adjustments that never accumulate into a felt change. There is lots of motion but no distance covered; the relationship fidgets rather than transforming.`,
          suggestedFix: `Let at least one ${a262c}–${b262c} beat carry real weight: a decisive betrayal, a profound reconciliation, a moment that visibly resets the relationship. A bond made of nothing but tiny tremors never gives the audience a change to register.`,
        });
        break;
      }
    }
  }

  // ── Wave 276: Midpoint freeze, net-zero majority, depth gap ─────────────────

  // RELATIONSHIP_MIDPOINT_FREEZE (minor, n≥10, totalShifts≥4): No relationship
  // shifts occur in the middle 50% of the story (25%–75%). All relational activity
  // is confined to the bookend acts. The long conflict zone, where interpersonal
  // pressure should peak, is relationally silent — the middle act neither deepens
  // nor disrupts any bond, making its dramatic events feel consequence-free for
  // the characters who should be most affected.
  if (records.length >= 10 && totalShifts >= 4) {
    const midStart276 = Math.floor(records.length * 0.25);
    const midEnd276 = Math.floor(records.length * 0.75);
    const hasMiddleShift276 = records.slice(midStart276, midEnd276).some(r =>
      (r.relationshipShifts ?? []).length > 0,
    );
    if (!hasMiddleShift276) {
      issues.push({
        location: `Middle act (Scenes ${midStart276}–${midEnd276 - 1})`,
        rule: 'RELATIONSHIP_MIDPOINT_FREEZE',
        severity: 'minor',
        description: `No relationship shifts occur in the middle 50% of the story (Scenes ${midStart276}–${midEnd276 - 1}) — all relational activity is confined to the bookend acts. The long conflict zone, where pressure on bonds should peak, is relationally silent.`,
        suggestedFix: 'Plant at least one relationship shift in the middle act: a betrayal under pressure, an alliance tested by competing loyalties, or a trust shift driven by Act 2 reversals. The story\'s central conflict should leave marks on its central relationships.',
      });
    }
  }

  // PAIR_NET_ZERO_MAJORITY (minor, n≥8, pairs≥3): More than 60% of all pairs
  // have a near-zero net trajectory (|net| < 0.15) — the majority of the story's
  // bonds spin their wheels. Each individual pair may have multiple shifts, but they
  // cancel out, covering no relational distance. Distinct from STATIC_RELATIONSHIP
  // (per-pair) and NO_RELATIONSHIP_MOVEMENT (zero shifts globally) — this fires
  // when a systemic proportion of relationships neutralise themselves.
  if (records.length >= 8 && pairStats.size >= 3) {
    const netZeroCount276 = [...pairStats.values()].filter(
      stats => Math.abs(stats.shifts.reduce((s, x) => s + x.amount, 0)) < 0.15,
    ).length;
    if (netZeroCount276 / pairStats.size > 0.6) {
      issues.push({
        location: 'Relational world',
        rule: 'PAIR_NET_ZERO_MAJORITY',
        severity: 'minor',
        description: `${netZeroCount276} of ${pairStats.size} relationships (${Math.round(netZeroCount276 / pairStats.size * 100)}%) have a near-zero net trajectory — the majority of bonds spin their wheels. When most pairs cancel out their own shifts, the ensemble generates relational noise without covering any relational distance.`,
        suggestedFix: 'Give at least two pairs a clear directional arc that sticks: a net warming or net souring the audience can track from beginning to end. Net-zero relationships are the ones audiences forget — ensure each major bond lands somewhere different from where it started.',
      });
    }
  }

  // RELATIONSHIP_DEPTH_GAP (minor, n≥8, pairs≥2): The most-shifted pair has 4+
  // shifts and ≥3× the shift count of the second most active pair. One bond
  // dominates all relational scene-energy while supporting relationships are
  // barely sketched — the relational world lacks balance. Distinct from
  // SINGLE_PAIR_RELATIONSHIP (all shifts in one pair, others zero) — this fires
  // when a second pair exists but is dramatically outpaced.
  if (records.length >= 8 && pairStats.size >= 2) {
    const sortedByShifts276 = [...pairStats.entries()].sort((a, b) => b[1].shifts.length - a[1].shifts.length);
    const topShifts276 = sortedByShifts276[0][1].shifts.length;
    const secondShifts276 = sortedByShifts276[1][1].shifts.length;
    if (topShifts276 >= 4 && secondShifts276 > 0 && topShifts276 >= 3 * secondShifts276) {
      const [topKey276] = sortedByShifts276[0];
      const [a276, b276] = topKey276.split('|');
      issues.push({
        location: `${a276} ↔ ${b276} (${topShifts276} shifts vs ${secondShifts276} for next pair)`,
        rule: 'RELATIONSHIP_DEPTH_GAP',
        severity: 'minor',
        description: `The relationship between ${a276} and ${b276} receives ${topShifts276} shifts while the next most active pair receives only ${secondShifts276} — a ${Math.round(topShifts276 / secondShifts276)}× gap. One bond dominates all the relational scene-energy, leaving supporting relationships sketched rather than dramatised.`,
        suggestedFix: 'Redistribute relationship development: give secondary pairs two or three more active beats so their arcs feel substantive alongside the central bond. The ensemble\'s relational world gains depth when secondary bonds receive enough movement to feel like characters, not props.',
      });
    }
  }

  // ── Wave 290: RELATIONSHIP_OPENING_BURST ─────────────────────────────────
  // All relationship shifts occur in the first 25% of the story. The
  // relational world is fully established before the audience has had time
  // to care about any bond, and then freezes for the remaining 75%. This is
  // the inverse of RELATIONSHIP_VELOCITY_COLLAPSE (which detects second-half
  // silence); this fires when all relational activity is confined to Act 1.
  // Requires 10+ records and 4+ total shifts.
  if (records.length >= 10 && totalShifts >= 4) {
    const cutoff290 = Math.floor(records.length * 0.25);
    const burstShifts290 = [...pairStats.values()].reduce(
      (acc, stats) => acc + stats.shifts.filter(s => s.sceneIdx < cutoff290).length,
      0,
    );
    if (burstShifts290 === totalShifts) {
      issues.push({
        location: `Opening 25% (scenes 0–${cutoff290 - 1}) — all relational activity`,
        rule: 'RELATIONSHIP_OPENING_BURST',
        severity: 'minor',
        description: `All ${totalShifts} relationship shift(s) occur in the first 25% of the story (scenes 0–${cutoff290 - 1}) — the relational world is fully established before Act 2 begins and then freezes. Bonds established this early with no further movement read as fixed character traits rather than living relationships.`,
        suggestedFix: 'Distribute relationship activity across all four acts: use Act 1 to establish bonds, Act 2 to stress-test them, and Act 3 to resolve them. A relationship that only moves at the start has no arc — just a starting position.',
      });
    }
  }

  // ── Wave 290: NEGATIVE_ONLY_PAIR_MAJORITY ────────────────────────────────
  // More than 60% of all pairs have exclusively negative shifts (every shift
  // amount < 0). A story where most bonds only deteriorate is tonally
  // monotone — there is no relational aspiration, no warmth to contrast the
  // darkness. Even in a tragedy, some bonds improve before they break.
  // Requires 8+ records and 3+ pairs.
  if (records.length >= 8 && pairStats.size >= 3) {
    const negOnlyCount290 = [...pairStats.values()].filter(stats =>
      stats.shifts.length > 0 && stats.shifts.every(s => s.amount < 0),
    ).length;
    if (negOnlyCount290 / pairStats.size > 0.60) {
      issues.push({
        location: 'Relational tone',
        rule: 'NEGATIVE_ONLY_PAIR_MAJORITY',
        severity: 'minor',
        description: `${negOnlyCount290} of ${pairStats.size} relationship pairs (${Math.round(negOnlyCount290 / pairStats.size * 100)}%) have exclusively negative shifts — no bond improves at any point. When the entire relational world only deteriorates, there is no warmth to contrast the darkness, and the audience loses the emotional reference points that make tragedy meaningful.`,
        suggestedFix: 'Give at least one or two pairs a positive shift — a reconciliation scene, a moment of unexpected solidarity, a bond that strengthens under pressure before being tested again. Relational warmth makes the darkness around it feel darker, not lighter.',
      });
    }
  }

  // ── Wave 290: SHIFT_DIMENSION_CONCENTRATION ──────────────────────────────
  // All relationship shifts across all pairs use the same dimension. The
  // relational world is one-dimensional: every bond changes only on the
  // "affinity" axis (or only on "trust", "power", etc.) with no variety.
  // Real relationships shift on multiple axes — trust moves independently
  // of affinity, power shifts independently of care. Requires 8+ records
  // and 5+ total shifts across 2+ pairs.
  if (records.length >= 8 && totalShifts >= 5 && pairStats.size >= 2) {
    const allDimensions290 = new Set<string>();
    for (const r of records) {
      for (const shift of (r.relationshipShifts ?? []) as Array<{ dimension?: string }>) {
        if (shift.dimension) allDimensions290.add(shift.dimension);
      }
    }
    if (allDimensions290.size === 1) {
      const [onlyDim290] = allDimensions290;
      issues.push({
        location: 'Relationship shift dimensions',
        rule: 'SHIFT_DIMENSION_CONCENTRATION',
        severity: 'minor',
        description: `All ${totalShifts} relationship shift(s) across ${pairStats.size} pair(s) occur on a single dimension ("${onlyDim290}"). The relational world is one-dimensional — bonds never shift on trust, power, respect, or other axes independently. Real relationships are multi-axial; a monodimensional relational world reads as schematic.`,
        suggestedFix: 'Introduce at least one shift on a different dimension: a scene where affinity stays warm but trust collapses, or where two characters gain mutual respect without warming to each other. The tension between relational axes is where psychological complexity lives.',
      });
    }
  }

  // ── Wave 304: SHIFT_MAGNITUDE_UNIFORMITY ─────────────────────────────────
  // Five or more relationship shifts all have the identical magnitude
  // (|amount| equal within a small epsilon). Real relational beats vary in
  // weight — a cold glance is not a betrayal — so uniform magnitudes read
  // as a mechanical generation artifact: the system stamping the same-sized
  // shift onto every beat regardless of dramatic weight. Requires 8+ records.
  if (records.length >= 8 && totalShifts >= 5) {
    const magnitudes304: number[] = [];
    for (const stats of pairStats.values()) {
      for (const s of stats.shifts) magnitudes304.push(Math.abs(s.amount));
    }
    const first304 = magnitudes304[0];
    if (magnitudes304.every(m => Math.abs(m - first304) < 0.001)) {
      issues.push({
        location: 'Relationship shift magnitudes',
        rule: 'SHIFT_MAGNITUDE_UNIFORMITY',
        severity: 'minor',
        description: `All ${magnitudes304.length} relationship shifts have the identical magnitude (${first304}). Relational beats carry different dramatic weights — a cold glance, a broken promise, and a betrayal should not move a bond by the same amount. Uniform magnitudes read as a mechanical artifact: every beat stamped with the same-sized shift regardless of what actually happened.`,
        suggestedFix: 'Scale each shift to its dramatic weight: small frictions and courtesies in the ±0.1–0.2 range, meaningful breaches and gestures around ±0.4, and reserve ±0.7+ for the betrayals and reconciliations the story pivots on. Magnitude variety is what lets the audience feel which moments matter most.',
      });
    }
  }

  // ── Wave 304: WARMTH_UNFELT ──────────────────────────────────────────────
  // Three or more strong positive shifts (amount ≥ 0.4) all occur in scenes
  // with a neutral emotional shift — bonds warm but nobody registers it
  // emotionally. The warm mirror of conflict's CONFLICT_EMOTION_DECOUPLED:
  // reconciliations and alliances that move the ledger without moving anyone
  // read as transactions. Requires 8+ records.
  if (records.length >= 8) {
    const warmScenes304 = records.filter(r =>
      ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount >= 0.4),
    );
    if (warmScenes304.length >= 3 && warmScenes304.every((r: any) => r.emotionalShift === 'neutral')) {
      issues.push({
        location: 'Strong positive shift scenes',
        rule: 'WARMTH_UNFELT',
        severity: 'minor',
        description: `All ${warmScenes304.length} scenes with a strong positive relationship shift (≥ 0.4) carry a neutral emotional shift — bonds warm but nobody feels it. A reconciliation or alliance that updates the relational ledger without registering on anyone emotionally reads as a transaction: the audience is told the relationship improved but never shown the relief, joy, or disarmed surprise that proves it.`,
        suggestedFix: 'Let at least one warming beat land emotionally: the scene where trust is rebuilt should also be the scene where someone\'s guard visibly drops — a positive emotional shift accompanying the relational one. Warmth the characters don\'t feel is warmth the audience won\'t either.',
      });
    }
  }

  // ── Wave 304: DIMENSION_ONE_WAY ──────────────────────────────────────────
  // A relationship dimension with 4+ shifts story-wide only ever moves in
  // one direction — trust only falls, power only concentrates. A dimension
  // that never reverses is a ratchet, not an arc: the audience learns its
  // trajectory after two beats and stops attending. Distinct from
  // MONOTONE_RELATIONSHIP (per-pair direction) and ALL_PAIRS_SAME_DIRECTION
  // (per-pair nets): this aggregates a single dimension across all pairs.
  // Requires 8+ records and 2+ distinct dimensions in play.
  if (records.length >= 8) {
    const dimShifts304 = new Map<string, number[]>();
    for (const r of records) {
      for (const s of ((r.relationshipShifts ?? []) as Array<{ dimension?: string; amount: number }>)) {
        if (!s.dimension) continue;
        const arr = dimShifts304.get(s.dimension) ?? [];
        arr.push(s.amount);
        dimShifts304.set(s.dimension, arr);
      }
    }
    if (dimShifts304.size >= 2) {
      for (const [dim304, amounts304] of dimShifts304) {
        if (amounts304.length >= 4 && (amounts304.every(a => a < 0) || amounts304.every(a => a > 0))) {
          const dir304 = amounts304[0] < 0 ? 'falls' : 'rises';
          issues.push({
            location: `Dimension "${dim304}" (${amounts304.length} shifts)`,
            rule: 'DIMENSION_ONE_WAY',
            severity: 'minor',
            description: `The "${dim304}" dimension shifts ${amounts304.length} times across the story and only ever ${dir304} — no pair, anywhere, ever moves it the other way. A dimension that never reverses is a ratchet, not an arc: after two beats the audience knows its trajectory and stops attending to it.`,
            suggestedFix: `Give "${dim304}" at least one counter-movement somewhere in the ensemble: a moment where the eroding quality is partially rebuilt (or the growing one dented) before the trend resumes. One reversal is enough to keep the dimension a live question rather than a foregone conclusion.`,
          });
          break;
        }
      }
    }
  }

  // ── Wave 318: RELATIONSHIP_CURIOSITY_DECOUPLED, POSITIVE_ONLY_PAIR_MAJORITY, RELATIONSHIP_ACT2B_DESERT ──

  // RELATIONSHIP_CURIOSITY_DECOUPLED (minor, n≥8, ≥3 shift scenes): Scenes
  // that contain at least one relationship shift have avg curiosityDelta ≤ 0.
  // When relational dynamics change without raising audience curiosity — about
  // what the shift means, where the bond is going, what the change reveals —
  // the shift is processed as a plot update rather than a psychological event.
  // Distinct from WARMTH_UNFELT (checks emotionalShift, not curiosityDelta)
  // and SHIFT_MAGNITUDE_UNIFORMITY (magnitude pattern, not curiosity).
  if (records.length >= 8) {
    const shiftScenes318 = (records as any[]).filter(r => ((r.relationshipShifts ?? []) as any[]).length > 0);
    if (shiftScenes318.length >= 3) {
      const avgShiftCuriosity318 = shiftScenes318.reduce((acc: number, r: any) => acc + (r.curiosityDelta ?? 0), 0) / shiftScenes318.length;
      if (avgShiftCuriosity318 <= 0) {
        issues.push({
          location: 'Relational shift scenes — curiosity register',
          rule: 'RELATIONSHIP_CURIOSITY_DECOUPLED',
          severity: 'minor',
          description: `${shiftScenes318.length} scenes with relationship shifts average a curiosityDelta of ${avgShiftCuriosity318.toFixed(2)} — relational changes arrive without raising curiosity. When a bond shifts but leaves the audience no more curious about where it leads, the change is informational rather than psychological. The audience notes it but doesn't feel propelled by it.`,
          suggestedFix: 'Let relationship shifts open questions: a trust rupture should make the audience wonder whether it can be repaired; a warming should make them anxious about what threatens it. Each shift should leave the audience leaning forward, not just nodding.',
        });
      }
    }
  }

  // POSITIVE_ONLY_PAIR_MAJORITY (minor, n≥8, pairs≥3): More than 60% of all
  // pairs have exclusively positive shifts (every shift.amount > 0). The
  // relational world is all-warmth, no friction — bonds only ever strengthen.
  // An ensemble that never experiences relational damage is too harmonious
  // to sustain dramatic tension. This is the inverse of NEGATIVE_ONLY_PAIR_MAJORITY
  // (which fires when most pairs are exclusively negative).
  if (records.length >= 8 && pairStats.size >= 3) {
    const positiveOnlyCount318 = [...pairStats.values()].filter(
      stats => stats.shifts.length > 0 && stats.shifts.every(s => s.amount > 0),
    ).length;
    if (positiveOnlyCount318 / pairStats.size > 0.6) {
      issues.push({
        location: 'Relational world',
        rule: 'POSITIVE_ONLY_PAIR_MAJORITY',
        severity: 'minor',
        description: `${positiveOnlyCount318} of ${pairStats.size} relationships (${Math.round(positiveOnlyCount318 / pairStats.size * 100)}%) have exclusively positive shifts — the relational world is all-warmth, no friction. An ensemble that never experiences bond damage is too harmonious to generate dramatic tension; if all relationships only improve, there is no relational stakes.`,
        suggestedFix: 'Introduce relational cost: at least one bond should be strained, betrayed, or damaged during the story — even if it ultimately recovers. Warmth earns its meaning through contrast with friction; a story where all bonds only strengthen has no relational stakes.',
      });
    }
  }

  // RELATIONSHIP_ACT2B_DESERT (minor, n≥10, pairs≥2): No relationship shift
  // occurs in the Act 2b zone (50%–75% of scenes). The story's complication
  // zone is relationally silent in its second half — the run-up to the climax
  // generates no bond movement. Distinct from RELATIONSHIP_MIDPOINT_FREEZE
  // (which fires when the ENTIRE middle 50%, i.e., 25%-75%, is silent; this
  // fires when only 50%-75% is silent, which can happen when Act 2a has shifts).
  if (records.length >= 10 && pairStats.size >= 2) {
    const act2bStart318 = Math.floor(records.length * 0.5);
    const act2bEnd318 = Math.floor(records.length * 0.75);
    const hasAct2bShift318 = [...pairStats.values()].some(
      stats => stats.shifts.some(s => s.sceneIdx >= act2bStart318 && s.sceneIdx < act2bEnd318),
    );
    if (!hasAct2bShift318) {
      issues.push({
        location: `Act 2b (Scenes ${act2bStart318}–${act2bEnd318 - 1}) — relational silence`,
        rule: 'RELATIONSHIP_ACT2B_DESERT',
        severity: 'minor',
        description: `No relationship shifts occur in Act 2b (Scenes ${act2bStart318}–${act2bEnd318 - 1}) — the complication zone's second half is relationally silent. The run-up to the climax generates no bond movement. Character relationships should be under their maximum pressure in the lead-up to the Act 3 turn; silence here means the climax arrives without relational stakes.`,
        suggestedFix: 'Plant at least one relationship shift in Act 2b: a trust test under pressure, an alliance strained by competing goals, or a revelation that reframes a bond. The approach to climax should be the most relationally charged zone, not the quietest.',
      });
    }
  }

  // ── Wave 329: RELATIONSHIP_REVELATION_SILENT, PAIR_EARLY_PEAK_MAJORITY, RELATIONSHIP_SUSPENSE_DECOUPLED ──

  // RELATIONSHIP_REVELATION_SILENT (minor, n≥8, ≥2 revelation scenes): No
  // scene that contains a revelation also contains a relationship shift. When
  // the story's key disclosures never alter how characters relate to one
  // another, revelations have no interpersonal consequence — they inform the
  // audience but don't restructure any bond. Distinct from WARMTH_UNFELT
  // (emotional quality of positive shifts) and RELATIONSHIP_CLIMAX_TIMING
  // (climax timing, not revelation-specific).
  if (records.length >= 8) {
    const revelationScenes329 = (records as any[]).filter(r =>
      r.revelation !== null && r.revelation !== undefined && r.revelation !== '',
    );
    if (revelationScenes329.length >= 2) {
      const revelationWithShift329 = revelationScenes329.some(
        r => ((r.relationshipShifts ?? []) as any[]).length > 0,
      );
      if (!revelationWithShift329) {
        issues.push({
          location: 'Revelation scenes — relational consequence',
          rule: 'RELATIONSHIP_REVELATION_SILENT',
          severity: 'minor',
          description: `${revelationScenes329.length} revelation scene(s) occur with no accompanying relationship shift in any of them. When the story's key disclosures never alter how characters relate to one another, revelations have no interpersonal consequence — they inform the audience but don't restructure any bond. A revelation that doesn't change a relationship misses its dramatic potential.`,
          suggestedFix: 'Tie at least one major revelation to a bond rupture or breakthrough: a secret uncovered should change how two characters trust each other; a truth revealed should force a reassessment of loyalty, affection, or power. Let revelations restructure relationships.',
        });
      }
    }
  }

  // PAIR_EARLY_PEAK_MAJORITY (minor, n≥10, pairs≥3): More than 60% of active
  // pairs reach their maximum single-shift magnitude in the first 30% of
  // scenes. When most bonds peak in intensity before the complication zone,
  // there is no relational escalation — the story peaked early and can only
  // plateau or diminish. Distinct from RELATIONSHIP_OPENING_BURST (fires when
  // 100% of ALL shifts are in the first 25%; this fires when most pairs' peak
  // magnitude is in the first 30%, regardless of where other shifts fall).
  if (records.length >= 10 && pairStats.size >= 3) {
    const earlyEnd329 = Math.floor(records.length * 0.3);
    let earlyPeakCount329 = 0;
    const activePairs329 = [...pairStats.values()].filter(s => s.shifts.length > 0);
    for (const stats of activePairs329) {
      const maxMag329 = Math.max(...stats.shifts.map(s => Math.abs(s.amount)));
      const peakShift329 = stats.shifts.find(s => Math.abs(s.amount) === maxMag329);
      if (peakShift329 && peakShift329.sceneIdx < earlyEnd329) earlyPeakCount329++;
    }
    if (activePairs329.length >= 3 && earlyPeakCount329 / activePairs329.length > 0.6) {
      issues.push({
        location: `Opening 30% (scenes 0–${earlyEnd329 - 1}) — peak shift concentration`,
        rule: 'PAIR_EARLY_PEAK_MAJORITY',
        severity: 'minor',
        description: `${earlyPeakCount329} of ${activePairs329.length} pairs (${Math.round(earlyPeakCount329 / activePairs329.length * 100)}%) reach their maximum relational intensity in the first 30% of scenes (scenes 0–${earlyEnd329 - 1}). When most bonds peak before the complication zone, there is no relational escalation — the story has nowhere to go after Act 1 in terms of bond intensity.`,
        suggestedFix: "Reserve each pair's most intense shift for its structural role: Act 2 peaks should surpass Act 1, and the climax should surpass both. Front-loaded intensity leaves no room for escalation and makes the later story feel like a cool-down rather than a build-up.",
      });
    }
  }

  // RELATIONSHIP_SUSPENSE_DECOUPLED (minor, n≥8, ≥3 shift scenes): Scenes
  // containing relationship shifts average suspenseDelta ≤ 0. When bond
  // changes generate no tension, they feel like plot updates — the audience
  // registers the shift intellectually but feels no urgency about where the
  // bond is heading. Distinct from RELATIONSHIP_CURIOSITY_DECOUPLED
  // (suspenseDelta not curiosityDelta) and WARMTH_UNFELT (emotional tone not
  // tension level).
  if (records.length >= 8) {
    const shiftScenes329 = (records as any[]).filter(r =>
      ((r.relationshipShifts ?? []) as any[]).length > 0,
    );
    if (shiftScenes329.length >= 3) {
      const avgSuspense329 = shiftScenes329.reduce((acc: number, r: any) => acc + (r.suspenseDelta ?? 0), 0) / shiftScenes329.length;
      if (avgSuspense329 <= 0) {
        issues.push({
          location: 'Relational shift scenes — tension register',
          rule: 'RELATIONSHIP_SUSPENSE_DECOUPLED',
          severity: 'minor',
          description: `${shiftScenes329.length} scenes with relationship shifts average a suspenseDelta of ${avgSuspense329.toFixed(2)} — bond changes arrive without generating tension. When relationships shift but the audience feels no urgency or dread about where they are heading, the shifts are processed as plot updates rather than charged dramatic events.`,
          suggestedFix: "Let relationship shifts raise stakes: a trust rupture should make the audience fear what comes next; a sudden warmth should feel precarious rather than safe. Bond changes should tighten the audience's grip on the story, not relax it.",
        });
      }
    }
  }

  // ── Wave 343: RELATIONSHIP_RUPTURE_EMOTION_FLAT, RELATIONSHIP_GLOBAL_AMPLITUDE_FRONTLOAD, RELATIONSHIP_SHIFT_DROUGHT ──

  // RELATIONSHIP_RUPTURE_EMOTION_FLAT (minor, n≥8, ≥3 rupture scenes): Every scene
  // that carries a negative relationship shift (amount ≤ -0.3) is emotionally neutral.
  // Bonds break, but the protagonist registers no feeling — the rupture is logged as a
  // plot fact rather than experienced as a loss. The negative-shift counterpart to
  // WARMTH_UNFELT (which audits strong positive shifts in neutral scenes); distinct also
  // from RELATIONSHIP_SUSPENSE_DECOUPLED and RELATIONSHIP_CURIOSITY_DECOUPLED (those audit
  // all shift scenes on the suspense/curiosity channels, not negative shifts on emotion).
  if (records.length >= 8) {
    const ruptureScenes343 = (records as any[]).filter(r =>
      ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
    );
    if (ruptureScenes343.length >= 3 && ruptureScenes343.every(r => r.emotionalShift === 'neutral')) {
      issues.push({
        location: 'Relational rupture scenes — emotional register',
        rule: 'RELATIONSHIP_RUPTURE_EMOTION_FLAT',
        severity: 'minor',
        description: `All ${ruptureScenes343.length} scenes that fracture a bond (negative relationship shift) are emotionally neutral — the ruptures are logged as plot facts rather than experienced as losses. When a relationship breaks and the protagonist feels nothing, the audience feels nothing: the cost of the broken bond never lands, so the rupture is information rather than drama.`,
        suggestedFix: 'Let bond ruptures wound: a betrayal should bring anger or grief, a severed alliance should cost the protagonist visibly. Pair at least the major negative shifts with an emotional beat so the audience feels the relationship breaking, not just learns that it broke.',
      });
    }
  }

  // RELATIONSHIP_GLOBAL_AMPLITUDE_FRONTLOAD (minor, n≥10, ≥2 shifts each half): Across
  // the whole ensemble, the average magnitude of relationship shifts in the first half
  // exceeds 1.5× the average magnitude in the second half. The story's biggest relational
  // swings all land early, and the back half coasts on smaller movements into the climax.
  // Distinct from RELATIONSHIP_AMPLITUDE_DECAY (per-pair, requires one pair with ≥4 shifts)
  // — this aggregates every pair, so it fires on ensembles where no single pair has enough
  // shifts to trip the per-pair check — and from PAIR_EARLY_PEAK_MAJORITY (per-pair peak
  // location, not story-wide magnitude averages).
  if (records.length >= 10) {
    const allShifts343: number[] = [];
    const firstHalfMags343: number[] = [];
    const secondHalfMags343: number[] = [];
    const mid343 = Math.floor(records.length * 0.5);
    for (const stats of pairStats.values()) {
      for (const sh of stats.shifts) {
        allShifts343.push(Math.abs(sh.amount));
        if (sh.sceneIdx < mid343) firstHalfMags343.push(Math.abs(sh.amount));
        else secondHalfMags343.push(Math.abs(sh.amount));
      }
    }
    if (firstHalfMags343.length >= 2 && secondHalfMags343.length >= 2) {
      const firstAvg343 = firstHalfMags343.reduce((s, m) => s + m, 0) / firstHalfMags343.length;
      const secondAvg343 = secondHalfMags343.reduce((s, m) => s + m, 0) / secondHalfMags343.length;
      if (secondAvg343 > 0 && firstAvg343 > 1.5 * secondAvg343) {
        issues.push({
          location: `Relational intensity — first half avg ${firstAvg343.toFixed(2)} vs second half avg ${secondAvg343.toFixed(2)}`,
          rule: 'RELATIONSHIP_GLOBAL_AMPLITUDE_FRONTLOAD',
          severity: 'minor',
          description: `Across the whole ensemble, relationship shifts in the first half average ${firstAvg343.toFixed(2)} in magnitude versus ${secondAvg343.toFixed(2)} in the second half — the biggest relational swings all land early. The back half coasts on smaller movements into the climax, so the story's relational intensity peaks before its dramatic stakes do and the ending inherits bonds that have already done their loudest moving.`,
          suggestedFix: "Reserve some of the largest relational swings for the back half: a climactic betrayal, a hard-won reconciliation, a power inversion at the worst possible moment. The ensemble's most consequential bond movements should escalate toward the climax, not be spent in the opening movement.",
        });
      }
    }
  }

  // RELATIONSHIP_SHIFT_DROUGHT (minor, n≥10, ≥4 total shifts): The longest contiguous
  // run of scenes carrying no relationship shift spans at least 40% of the story. For a
  // long stretch — wherever it falls — the relational engine goes completely silent, so
  // the audience loses track of the bonds while the plot continues. Distinct from
  // RELATIONSHIP_MIDPOINT_FREEZE (a fixed middle-50% window), RELATIONSHIP_VELOCITY_
  // COLLAPSE (no shifts in the entire second half), and RELATIONSHIP_THIRD_ACT_
  // ESCALATION_ABSENT (final-25% zone): this is a sliding max-gap measure that catches a
  // drought straddling any act boundary, which the fixed-zone checks miss.
  if (records.length >= 10 && totalShifts >= 4) {
    let run343 = 0;
    let runStart343 = 0;
    let maxRun343 = 0;
    let maxStart343 = 0;
    for (let i343 = 0; i343 < records.length; i343++) {
      if (((records as any[])[i343].relationshipShifts ?? []).length === 0) {
        if (run343 === 0) runStart343 = i343;
        run343++;
        if (run343 > maxRun343) { maxRun343 = run343; maxStart343 = runStart343; }
      } else {
        run343 = 0;
      }
    }
    if (maxRun343 >= Math.ceil(records.length * 0.4)) {
      const s343 = (records as any[])[maxStart343].sceneIdx;
      const e343 = (records as any[])[maxStart343 + maxRun343 - 1].sceneIdx;
      issues.push({
        location: `Scenes ${s343}–${e343} — relational silence`,
        rule: 'RELATIONSHIP_SHIFT_DROUGHT',
        severity: 'minor',
        description: `The longest stretch with no relationship movement runs ${maxRun343} consecutive scenes (${s343}–${e343}), spanning ${Math.round(maxRun343 / records.length * 100)}% of the story. For this whole span the relational engine goes silent — bonds neither warm nor cool while the plot continues — so the audience loses the thread of the characters' connections at exactly the length where it should be deepening.`,
        suggestedFix: 'Thread relational movement through the drought: even a small beat — a flicker of trust, a quiet friction, a shift in who relies on whom — keeps the bonds alive across the stretch. A long run with no relational change makes the middle of the story feel like plot happening to strangers.',
      });
    }
  }

  // ── Wave 357: RELATIONSHIP_CURIOSITY_PEAK_ABSENT, PAIR_SECOND_HALF_VOID, RELATIONSHIP_DRAMATIC_TURN_DECOUPLED ──

  // RELATIONSHIP_CURIOSITY_PEAK_ABSENT (minor, n≥8, ≥2 curiosity-positive shift
  // scenes): The scene with the highest curiosityDelta carries no relationship
  // shift, even though at least 2 other curiosity-positive scenes do. The peak
  // curiosity moment — the instant the audience most urgently wants to know what
  // happens next — never touches the relational world. Distinct from
  // RELATIONSHIP_CURIOSITY_DECOUPLED (which checks that all shift scenes average
  // low curiosity); this checks specifically whether the curiosity peak itself is
  // relationally blank.
  if (records.length >= 8) {
    const curiosityPositive357 = (records as any[]).filter(r => (r.curiosityDelta ?? 0) > 0);
    const curiosityShift357 = curiosityPositive357.filter(r =>
      ((r.relationshipShifts ?? []) as any[]).length > 0,
    );
    if (curiosityShift357.length >= 2) {
      const peak357 = (records as any[]).reduce((best: any, r: any) =>
        (r.curiosityDelta ?? 0) > (best.curiosityDelta ?? 0) ? r : best,
        (records as any[])[0],
      );
      if (((peak357.relationshipShifts ?? []) as any[]).length === 0) {
        issues.push({
          location: `Scene ${peak357.sceneIdx} — peak curiosity`,
          rule: 'RELATIONSHIP_CURIOSITY_PEAK_ABSENT',
          severity: 'minor',
          description: `Scene ${peak357.sceneIdx} carries the story's highest curiosityDelta (${(peak357.curiosityDelta ?? 0).toFixed(2)}) but no relationship shift, even though ${curiosityShift357.length} other curiosity-positive scenes move a bond. The moment the audience is most urgently wondering what happens next never touches any character relationship — peak curiosity and relational stakes are completely disconnected.`,
          suggestedFix: 'Let the peak curiosity moment also crack or shift a bond: a revelation that makes the audience wonder AND restructures a relationship, a question that lands in the same scene as a trust rupture or unexpected warmth. Curiosity peaks are the best place to deepen relational stakes.',
        });
      }
    }
  }

  // PAIR_SECOND_HALF_VOID (minor, n≥10, pairs≥2): At least one pair accumulates
  // ≥3 shifts in the first half of the story but registers zero shifts in the
  // second half. That pair exhausts its entire arc before the climax and then
  // goes relationally silent for the back half. Distinct from RELATIONSHIP_
  // VELOCITY_COLLAPSE (whole-ensemble: first half has shifts, second half has
  // none at all) and PAIR_EARLY_PEAK_MAJORITY (>50% of pairs have their single
  // largest shift in the first half — peak location, not binary presence).
  if (records.length >= 10 && pairStats.size >= 2) {
    const mid357 = Math.floor(records.length * 0.5);
    const voidPairs357: string[] = [];
    for (const [pairKey357, stats357] of pairStats) {
      const first357 = stats357.shifts.filter(s => s.sceneIdx < mid357);
      const second357 = stats357.shifts.filter(s => s.sceneIdx >= mid357);
      if (first357.length >= 3 && second357.length === 0) {
        voidPairs357.push(pairKey357);
      }
    }
    if (voidPairs357.length > 0) {
      issues.push({
        location: `Pair(s) ${voidPairs357.join(', ')} — second-half void`,
        rule: 'PAIR_SECOND_HALF_VOID',
        severity: 'minor',
        description: `${voidPairs357.length === 1 ? 'One pair' : `${voidPairs357.length} pairs`} (${voidPairs357.join('; ')}) accumulate${voidPairs357.length === 1 ? 's' : ''} 3 or more shifts in the first half but register zero shifts in the second half. The bond's entire arc is spent before the climax; the audience enters the back half with a relationship that has already done all its moving, robbing the climax of relational stakes for that pair.`,
        suggestedFix: 'Reserve at least one significant shift for the second half: a rupture under climactic pressure, a reconciliation earned through Act 3, or a reversal that reframes everything before it. A relationship that goes silent in the back half feels resolved — or abandoned — before the story ends.',
      });
    }
  }

  // RELATIONSHIP_DRAMATIC_TURN_DECOUPLED (minor, n≥8, ≥3 dramatic-turn scenes,
  // ≥3 shift scenes): No scene that carries a dramatic turn (dramaticTurn ≠
  // 'nothing') also carries a relationship shift. Story pivots never crack or
  // strengthen any bond. Distinct from CONFLICT_DRAMATIC_TURN_VOID (in
  // conflict.ts, checks conflict-scene coverage; this is in relationship-arc
  // and checks relational shifts) and RELATIONSHIP_REVELATION_SILENT (revelation
  // field, not dramaticTurn field).
  if (records.length >= 8) {
    const turnScenes357 = (records as any[]).filter(r =>
      r.dramaticTurn != null && r.dramaticTurn !== 'nothing',
    );
    const shiftScenes357b = (records as any[]).filter(r =>
      ((r.relationshipShifts ?? []) as any[]).length > 0,
    );
    if (turnScenes357.length >= 3 && shiftScenes357b.length >= 3) {
      const turnIdx357 = new Set(turnScenes357.map((r: any) => r.sceneIdx));
      const overlap357 = shiftScenes357b.some((r: any) => turnIdx357.has(r.sceneIdx));
      if (!overlap357) {
        issues.push({
          location: 'Dramatic turns — relational register',
          rule: 'RELATIONSHIP_DRAMATIC_TURN_DECOUPLED',
          severity: 'minor',
          description: `${turnScenes357.length} dramatic-turn scenes carry zero relationship shifts, even though ${shiftScenes357b.length} other scenes move bonds. Every story pivot happens in relational silence — the moments when the plot reverses or accelerates never crack or strengthen any character bond. Dramatic turns disconnected from the relational world feel plotted rather than felt.`,
          suggestedFix: 'Let at least one story pivot also shift a bond: a reversal that fractures a trusted alliance, an unexpected turn that forces a character to rely on someone they distrusted. When the plot turns and a relationship shifts in the same moment, the dramatic pivot lands with double weight.',
        });
      }
    }
  }

  // ── Wave 371: RELATIONSHIP_SUSPENSE_PEAK_ABSENT, RELATIONSHIP_CLOCK_DECOUPLED, PAIR_FIRST_HALF_VOID ──

  // RELATIONSHIP_SUSPENSE_PEAK_ABSENT (minor, n≥8, ≥2 suspense-positive shift scenes):
  // The scene with the highest suspenseDelta carries no relationship shift, even though
  // at least 2 other suspense-positive scenes do. The peak-tension moment — when the
  // audience is most gripped — never touches the relational world. Distinct from
  // RELATIONSHIP_SUSPENSE_DECOUPLED (which averages suspenseDelta across all shift scenes);
  // this isolates the single peak-suspense scene and checks whether a bond moves there.
  if (records.length >= 8) {
    const suspPositive371 = (records as any[]).filter(r => (r.suspenseDelta ?? 0) > 0);
    const suspShift371 = suspPositive371.filter(r => ((r.relationshipShifts ?? []) as any[]).length > 0);
    if (suspShift371.length >= 2) {
      const peak371 = (records as any[]).reduce((best: any, r: any) =>
        (r.suspenseDelta ?? 0) > (best.suspenseDelta ?? 0) ? r : best,
        (records as any[])[0],
      );
      if (((peak371.relationshipShifts ?? []) as any[]).length === 0) {
        issues.push({
          location: `Scene ${peak371.sceneIdx} — peak suspense`,
          rule: 'RELATIONSHIP_SUSPENSE_PEAK_ABSENT',
          severity: 'minor',
          description: `Scene ${peak371.sceneIdx} carries the story's highest suspenseDelta (${(peak371.suspenseDelta ?? 0).toFixed(2)}) but no relationship shift, even though ${suspShift371.length} other suspense-positive scenes move a bond. The moment the audience is most gripped never touches any character relationship — peak tension and relational stakes are completely disconnected, so the tensest beat plays as pure plot danger rather than danger to a bond the audience cares about.`,
          suggestedFix: 'Let the peak-tension scene also move a bond: a betrayal exposed at the moment of maximum danger, an alliance forged under fire. When the suspense crests and a relationship shifts in the same beat, the tension carries relational weight rather than mere physical jeopardy.',
        });
      }
    }
  }

  // RELATIONSHIP_CLOCK_DECOUPLED (minor, n≥8, ≥3 shift scenes, ≥2 clock scenes): No
  // relationship shift lands in a clock-raised scene, even though the story has both
  // relational movement and deadlines. Bonds never warm, cool, or fracture under time
  // pressure — the relational world and the urgency engine run on separate tracks. A
  // relationship shift forced by a ticking clock carries doubled weight: the bond moves
  // and the audience feels the deadline at once. Distinct from RELATIONSHIP_SUSPENSE_
  // DECOUPLED (suspenseDelta channel) and the conflict-pass clock checks (negative shifts
  // / conflict scenes specifically): this audits all shifts against the clockRaised field.
  if (records.length >= 8) {
    const shiftScenes371 = (records as any[]).filter(r => ((r.relationshipShifts ?? []) as any[]).length > 0);
    const clockScenes371 = (records as any[]).filter(r => r.clockRaised === true);
    if (shiftScenes371.length >= 3 && clockScenes371.length >= 2 && !clockScenes371.some(r => ((r.relationshipShifts ?? []) as any[]).length > 0)) {
      issues.push({
        location: 'Relationship shifts × clock scenes — decoupled',
        rule: 'RELATIONSHIP_CLOCK_DECOUPLED',
        severity: 'minor',
        description: `The story moves bonds in ${shiftScenes371.length} scenes and raises clocks in ${clockScenes371.length}, but no relationship shift ever lands in a clock-raised scene — bonds never move under deadline pressure. The relational world and the urgency engine run on separate tracks, so the story forfeits the doubled charge of a bond fracturing or forging precisely as time runs out.`,
        suggestedFix: 'Stage at least one relationship shift under a live clock: a trust broken in the scramble before the deadline, an alliance forced by the shrinking window. The convergence of "the bond just changed" and "time is almost up" makes both land harder than either would alone.',
      });
    }
  }

  // PAIR_FIRST_HALF_VOID (minor, n≥10, pairs≥2): At least one pair accumulates ≥3
  // shifts in the second half of the story but registers zero shifts in the first half.
  // That pair's entire arc is deferred to the back half — the audience spends the first
  // half with no sense that the bond is in motion, then it suddenly becomes active. The
  // mirror of PAIR_SECOND_HALF_VOID (≥3 first-half shifts, none in the second); distinct
  // from LATE_RELATIONSHIP_INTRODUCTION (a pair whose FIRST shift falls after the
  // midpoint — a single-shift timing check) by requiring a dense back-half cluster with a
  // wholly silent front half.
  if (records.length >= 10 && pairStats.size >= 2) {
    const mid371 = Math.floor(records.length * 0.5);
    const voidPairs371: string[] = [];
    for (const [pairKey371, stats371] of pairStats) {
      const first371 = stats371.shifts.filter(s => s.sceneIdx < mid371);
      const second371 = stats371.shifts.filter(s => s.sceneIdx >= mid371);
      if (second371.length >= 3 && first371.length === 0) {
        voidPairs371.push(pairKey371);
      }
    }
    if (voidPairs371.length > 0) {
      issues.push({
        location: `Pair(s) ${voidPairs371.join(', ')} — first-half void`,
        rule: 'PAIR_FIRST_HALF_VOID',
        severity: 'minor',
        description: `${voidPairs371.length === 1 ? 'One pair' : `${voidPairs371.length} pairs`} (${voidPairs371.join('; ')}) accumulate${voidPairs371.length === 1 ? 's' : ''} 3 or more shifts in the second half but register zero shifts in the first half. The bond's entire arc is deferred to the back half, so the audience spends the opening with no sense that the relationship is in motion, then it abruptly becomes active without the early grounding that would make its movement land.`,
        suggestedFix: 'Seed the bond early: give the pair at least one shift in the first half — a first friction, a flicker of warmth — so the audience is invested in the relationship before the back half starts moving it in earnest. A bond that only activates after the midpoint asks the audience to care about a connection they were never shown forming.',
      });
    }
  }

  // ── Wave 385: RELATIONSHIP_PEAK_EMOTION_FLAT, PAIR_MIDPOINT_VOID, PAIR_EMOTION_FLAT ──

  // RELATIONSHIP_PEAK_EMOTION_FLAT (minor, n≥8, ≥2 emotionally charged shift scenes): The
  // single largest-magnitude relationship shift in the story lands in an emotionally neutral
  // scene, even though at least 2 other shift scenes carry emotion. The biggest bond change —
  // the moment a relationship moves most — is registered as a status update, not felt as a
  // turning point. The single-peak emotion cell: distinct from RELATIONSHIP_RUPTURE_EMOTION_
  // FLAT (all NEGATIVE-shift scenes neutral — a polarity set check), WARMTH_UNFELT (strong
  // POSITIVE shifts in neutral scenes), and character-arc's ARC_RELATIONAL_SHIFT_EMOTION_FLAT
  // (ALL shift scenes neutral): this fires even when most shift scenes carry emotion but the
  // single biggest one does not.
  if (records.length >= 8) {
    const emotionByScene385 = new Map<number, string>();
    for (const r of records as any[]) emotionByScene385.set(r.sceneIdx, r.emotionalShift ?? 'neutral');
    let peakMag385 = 0;
    let peakScene385 = -1;
    const shiftScenes385: any[] = [];
    for (const r of records as any[]) {
      const shifts = (r.relationshipShifts ?? []) as Array<{ amount: number }>;
      if (shifts.length > 0) shiftScenes385.push(r);
      for (const sh of shifts) {
        if (Math.abs(sh.amount) > peakMag385) { peakMag385 = Math.abs(sh.amount); peakScene385 = r.sceneIdx; }
      }
    }
    const chargedShift385 = shiftScenes385.filter(r => (r.emotionalShift ?? 'neutral') !== 'neutral' && r.sceneIdx !== peakScene385);
    if (peakScene385 >= 0 && chargedShift385.length >= 2 && (emotionByScene385.get(peakScene385) ?? 'neutral') === 'neutral') {
      issues.push({
        location: `Scene ${peakScene385} — largest relationship shift (|${peakMag385.toFixed(2)}|)`,
        rule: 'RELATIONSHIP_PEAK_EMOTION_FLAT',
        severity: 'minor',
        description: `The story's largest relationship shift (Scene ${peakScene385}, magnitude ${peakMag385.toFixed(2)}) lands in an emotionally neutral scene, even though ${chargedShift385.length} other shift scenes carry emotion. The biggest bond change — the moment a relationship moves most — is registered as a status update rather than felt as a turning point, so the audience notes the shift without experiencing its weight on the people it changes.`,
        suggestedFix: 'Charge the peak shift emotionally: when the most consequential bond change in the story occurs, the protagonist should feel it most acutely — grief at the rupture, relief or fear at the reconciliation. The biggest relational swing deserves the sharpest emotional beat, not the flattest.',
      });
    }
  }

  // PAIR_MIDPOINT_VOID (minor, n≥10, pairs≥1): A pair shifts both before the midpoint zone
  // (40%–60%) and after it, but registers no shift within it — that bond goes silent at the
  // exact structural pivot while staying active on either side. The per-pair midpoint cell:
  // distinct from RELATIONSHIP_MIDPOINT_FREEZE (ensemble-wide, the middle 50% i.e. 25%–75%,
  // ANY pair) and from the per-pair PAIR_FIRST_HALF_VOID / PAIR_SECOND_HALF_VOID checks: this
  // isolates the narrow center window for an individual pair that is otherwise active.
  if (records.length >= 10 && pairStats.size >= 1) {
    const midStart385 = Math.floor(records.length * 0.4);
    const midEnd385 = Math.floor(records.length * 0.6);
    const voidPairs385: string[] = [];
    for (const [pairKey385, stats385] of pairStats) {
      const before385 = stats385.shifts.some(s => s.sceneIdx < midStart385);
      const after385 = stats385.shifts.some(s => s.sceneIdx >= midEnd385);
      const inMid385 = stats385.shifts.some(s => s.sceneIdx >= midStart385 && s.sceneIdx < midEnd385);
      if (before385 && after385 && !inMid385) voidPairs385.push(pairKey385);
    }
    if (voidPairs385.length > 0) {
      issues.push({
        location: `Pair(s) ${voidPairs385.join(', ')} — midpoint void (Scenes ${midStart385}–${midEnd385 - 1})`,
        rule: 'PAIR_MIDPOINT_VOID',
        severity: 'minor',
        description: `${voidPairs385.length === 1 ? 'One pair' : `${voidPairs385.length} pairs`} (${voidPairs385.join('; ')}) shift${voidPairs385.length === 1 ? 's' : ''} both before and after the midpoint zone (Scenes ${midStart385}–${midEnd385 - 1}) but register${voidPairs385.length === 1 ? 's' : ''} no movement within it. The bond goes silent at the exact structural pivot while staying active on either side, so the midpoint reorganizes the plot without registering on a relationship the story otherwise keeps moving.`,
        suggestedFix: 'Move the pair at the midpoint: let the central pivot also turn this bond — a trust tested by the midpoint revelation, an alliance reshaped by the reversal. A relationship active on both sides of the center but frozen at it implies the story\'s biggest turn left this bond untouched, which rarely rings true.',
      });
    }
  }

  // PAIR_EMOTION_FLAT (minor, n≥8, pair with ≥3 shifts): A single pair accumulates 3 or
  // more shifts, every one of which lands in an emotionally neutral scene — this specific
  // bond moves repeatedly but the protagonist never feels any of its movements. The per-pair
  // emotion cell: distinct from character-arc's ARC_RELATIONAL_SHIFT_EMOTION_FLAT (ALL shift
  // scenes across the whole story are neutral — this fires when one bond's shifts are all
  // neutral even though OTHER bonds' shifts carry emotion) and from RELATIONSHIP_PEAK_EMOTION_
  // FLAT (the single largest shift, regardless of pair).
  if (records.length >= 8) {
    const emotionByScene385b = new Map<number, string>();
    for (const r of records as any[]) emotionByScene385b.set(r.sceneIdx, r.emotionalShift ?? 'neutral');
    const flatPairs385: string[] = [];
    for (const [pairKey385b, stats385b] of pairStats) {
      if (stats385b.shifts.length >= 3 && stats385b.shifts.every(s => (emotionByScene385b.get(s.sceneIdx) ?? 'neutral') === 'neutral')) {
        flatPairs385.push(pairKey385b);
      }
    }
    if (flatPairs385.length > 0) {
      issues.push({
        location: `Pair(s) ${flatPairs385.join(', ')} — emotionally flat shifts`,
        rule: 'PAIR_EMOTION_FLAT',
        severity: 'minor',
        description: `${flatPairs385.length === 1 ? 'One pair' : `${flatPairs385.length} pairs`} (${flatPairs385.join('; ')}) move${flatPairs385.length === 1 ? 's' : ''} 3 or more times, yet every one of those shifts lands in an emotionally neutral scene. The bond changes repeatedly but the protagonist never feels any of its movements, so this relationship's whole arc is logged as a sequence of status changes the audience tracks intellectually without ever being moved by.`,
        suggestedFix: 'Let this bond\'s shifts cost or reward the protagonist emotionally: a warming that brings relief, a cooling that brings unease, a rupture that wounds. A relationship that moves three or more times without a single felt beat is mechanics, not drama — pair its changes with the protagonist\'s reaction so the audience invests in it.',
      });
    }
  }

  // ── Wave 399: PAIR_SUSPENSE_FLAT, PAIR_CURIOSITY_FLAT, RELATIONSHIP_REVELATION_EMOTION_DECOUPLED ──

  // PAIR_SUSPENSE_FLAT (minor, n≥8, pair with ≥3 shifts, overall suspense present):
  // A single pair accumulates 3+ shifts, but every shift scene has suspenseDelta ≤ 0 —
  // this bond moves entirely without dramatic tension. When the relationship engine and
  // the suspense engine never share a scene for this pair, the bond's movement feels
  // consequence-free: the audience tracks status changes but never feels the pressure
  // behind them. Per-pair × suspense channel. Distinct from RELATIONSHIP_SUSPENSE_
  // DECOUPLED (global avg across all pairs — this fires when ONE pair's shifts are all
  // suspense-flat even though other pairs' shifts may carry suspense) and PAIR_EMOTION_
  // FLAT (emotion channel rather than suspense channel).
  if (records.length >= 8) {
    const suspByScene399a = new Map<number, number>();
    for (const r of records as any[]) suspByScene399a.set(r.sceneIdx, r.suspenseDelta ?? 0);
    const anyOverallSusp399a = [...suspByScene399a.values()].some(v => v > 0);
    if (anyOverallSusp399a) {
      const flatSuspPairs399a: string[] = [];
      for (const [pairKey399a, stats399a] of pairStats) {
        if (stats399a.shifts.length >= 3 &&
            stats399a.shifts.every(s => (suspByScene399a.get(s.sceneIdx) ?? 0) <= 0)) {
          flatSuspPairs399a.push(pairKey399a);
        }
      }
      if (flatSuspPairs399a.length > 0) {
        issues.push({
          location: `Pair(s) ${flatSuspPairs399a.join(', ')} — suspense-flat shifts`,
          rule: 'PAIR_SUSPENSE_FLAT',
          severity: 'minor',
          description: `${flatSuspPairs399a.length === 1 ? 'One pair' : `${flatSuspPairs399a.length} pairs`} (${flatSuspPairs399a.join('; ')}) move${flatSuspPairs399a.length === 1 ? 's' : ''} 3 or more times, yet every one of those shifts lands in a scene with zero dramatic tension. The bond changes but the audience is never under pressure when it does, so this relationship's arc plays out entirely in low-stakes moments — the movements feel like administrative updates rather than dramatic events.`,
          suggestedFix: 'Let this bond shift when the story\'s tension is already elevated: a relationship that cracks during a chase, warms under threat, or reverses mid-crisis lands with far more force than one whose movements all happen in peaceful scenes. The pressure of the situation should amplify the cost or reward of the bond\'s change.',
        });
      }
    }
  }

  // PAIR_CURIOSITY_FLAT (minor, n≥8, pair with ≥3 shifts, overall curiosity present):
  // A single pair accumulates 3+ shifts, but every shift scene has curiosityDelta ≤ 0 —
  // this bond moves without ever raising a question. When the audience is never made to
  // wonder about this relationship's outcome — because its changes happen only in scenes
  // with no curiosity charge — the arc feels closed and predictable rather than something
  // to track and anticipate. Per-pair × curiosity channel. Distinct from RELATIONSHIP_
  // CURIOSITY_DECOUPLED (global avg across all pairs), PAIR_SUSPENSE_FLAT (suspense
  // channel rather than curiosity), and PAIR_EMOTION_FLAT (emotion channel).
  if (records.length >= 8) {
    const curioByScene399b = new Map<number, number>();
    for (const r of records as any[]) curioByScene399b.set(r.sceneIdx, r.curiosityDelta ?? 0);
    const anyOverallCurio399b = [...curioByScene399b.values()].some(v => v > 0);
    if (anyOverallCurio399b) {
      const flatCurioPairs399b: string[] = [];
      for (const [pairKey399b, stats399b] of pairStats) {
        if (stats399b.shifts.length >= 3 &&
            stats399b.shifts.every(s => (curioByScene399b.get(s.sceneIdx) ?? 0) <= 0)) {
          flatCurioPairs399b.push(pairKey399b);
        }
      }
      if (flatCurioPairs399b.length > 0) {
        issues.push({
          location: `Pair(s) ${flatCurioPairs399b.join(', ')} — curiosity-flat shifts`,
          rule: 'PAIR_CURIOSITY_FLAT',
          severity: 'minor',
          description: `${flatCurioPairs399b.length === 1 ? 'One pair' : `${flatCurioPairs399b.length} pairs`} (${flatCurioPairs399b.join('; ')}) move${flatCurioPairs399b.length === 1 ? 's' : ''} 3 or more times, yet every one of those shifts lands in a scene that raises no curiosity. The bond changes but never makes the audience wonder what will happen next between them, so its arc feels closed and fully anticipated — the audience tracks the relationship like a dial they can already read.`,
          suggestedFix: 'Let this bond shift in scenes that simultaneously raise a question: a warming that creates uncertainty about what the other character really wants, a cooling that makes the audience wonder whether it\'s permanent. A relationship the audience actively wonders about is one they will invest in to the end.',
        });
      }
    }
  }

  // RELATIONSHIP_REVELATION_EMOTION_DECOUPLED (minor, n≥8, ≥2 revelation scenes,
  // ≥1 revelation+shift scene, all revelation+shift scenes emotionally neutral):
  // The story has revelation scenes that do coincide with bond shifts (so it is NOT
  // revelation-silent), but every such scene is emotionally neutral — disclosures crack
  // or strengthen bonds without the scene itself feeling anything. A revelation that also
  // moves a bond should be one of the story's most charged moments: the disclosure lands
  // and the relationship moves simultaneously. When this compound moment is emotionally
  // flat, both signals are diluted. Distinct from RELATIONSHIP_REVELATION_SILENT (no
  // revelation+shift overlap at all — this fires when overlap exists but is flat),
  // RELATIONSHIP_RUPTURE_EMOTION_FLAT (negative shifts in neutral scenes, no revelation
  // filter), and WARMTH_UNFELT (positive shifts in neutral scenes, no revelation filter).
  if (records.length >= 8) {
    const revelCount399c = (records as any[]).filter(r => r.revelation === true).length;
    if (revelCount399c >= 2) {
      const revelShiftScenes399c = (records as any[]).filter(r =>
        r.revelation === true &&
        ((r.relationshipShifts ?? []) as any[]).length > 0,
      );
      if (revelShiftScenes399c.length >= 1) {
        const allFlat399c = revelShiftScenes399c.every(r => (r.emotionalShift ?? 'neutral') === 'neutral');
        if (allFlat399c) {
          issues.push({
            location: 'Revelation + bond-shift scenes — emotionally neutral',
            rule: 'RELATIONSHIP_REVELATION_EMOTION_DECOUPLED',
            severity: 'minor',
            description: `The story has ${revelShiftScenes399c.length} scene(s) where a revelation and a relationship shift coincide, but every one of them is emotionally neutral. A revelation that also moves a bond should be one of the story's most charged moments — the disclosure lands, the relationship shifts, and the protagonist feels both. When that compound moment carries no emotional register, two powerful signals cancel each other out rather than amplifying.`,
            suggestedFix: 'Let revelation+bond-shift scenes carry emotional weight: a disclosure that warms a bond should also bring relief, joy, or cautious hope; one that ruptures should bring shock, grief, or fury. The emotional register is the scene telling the audience how much this moment costs.',
          });
        }
      }
    }
  }

  // PAIR_CLOCK_FLAT (minor, n≥8, pair with ≥3 shifts, ≥1 clock scene): A single pair
  // accumulates 3+ shifts, but not one of them lands in a clock-raised scene, even though the
  // story raises clocks elsewhere. This bond never moves under deadline pressure — its changes
  // all happen in untimed moments, so the urgency engine and this relationship's arc never
  // intersect. The per-pair complement of RELATIONSHIP_CLOCK_DECOUPLED (which fires when NO
  // shift of ANY pair lands in a clock scene — this fires when ONE pair's shifts are all
  // clock-free even though another pair's shift may coincide with a clock). Distinct from
  // PAIR_SUSPENSE_FLAT (suspenseDelta channel) and PAIR_EMOTION_FLAT (emotion channel).
  if (records.length >= 8) {
    const clockScenes413a = new Set<number>((records as any[]).filter(r => r.clockRaised === true).map(r => r.sceneIdx));
    if (clockScenes413a.size >= 1) {
      const flatClockPairs413a: string[] = [];
      for (const [pairKey413a, stats413a] of pairStats) {
        if (stats413a.shifts.length >= 3 &&
            stats413a.shifts.every(s => !clockScenes413a.has(s.sceneIdx))) {
          flatClockPairs413a.push(pairKey413a);
        }
      }
      if (flatClockPairs413a.length > 0) {
        issues.push({
          location: `Pair(s) ${flatClockPairs413a.join(', ')} — clock-decoupled shifts`,
          rule: 'PAIR_CLOCK_FLAT',
          severity: 'minor',
          description: `${flatClockPairs413a.length === 1 ? 'One pair' : `${flatClockPairs413a.length} pairs`} (${flatClockPairs413a.join('; ')}) move${flatClockPairs413a.length === 1 ? 's' : ''} 3 or more times, yet not one of those shifts lands in a clock-raised scene, even though the story raises deadlines elsewhere. This bond never changes under time pressure — its movements all happen in untimed moments, so the urgency engine and this relationship's arc never intersect and the bond's changes feel disconnected from the story's ticking stakes.`,
          suggestedFix: 'Let this bond shift while a clock is running: a relationship that cracks or strengthens as a deadline bears down acquires the pressure of the moment — the audience feels the change matters more because there is no time to undo it. Move at least one of this pair\'s shifts into a scene where the clock is already ticking.',
        });
      }
    }
  }

  // PAIR_DRAMATIC_TURN_FLAT (minor, n≥8, pair with ≥3 shifts, ≥1 dramatic-turn scene): A single
  // pair accumulates 3+ shifts, but not one of them coincides with a dramatic turn, even though
  // the story has turns elsewhere. This bond's movements never pivot the plot — the relationship
  // changes, but those changes are never the hinge the story turns on. The per-pair complement of
  // RELATIONSHIP_DRAMATIC_TURN_DECOUPLED (which fires when NO shift of ANY pair coincides with a
  // turn — this fires when ONE pair's shifts are all turn-free even though another pair's shift
  // may coincide with a turn). Distinct from PAIR_CLOCK_FLAT (clock channel) and PAIR_SUSPENSE_
  // FLAT (suspense channel).
  if (records.length >= 8) {
    const turnScenes413b = new Set<number>((records as any[]).filter(r => (r.dramaticTurn ?? 'nothing') !== 'nothing').map(r => r.sceneIdx));
    if (turnScenes413b.size >= 1) {
      const flatTurnPairs413b: string[] = [];
      for (const [pairKey413b, stats413b] of pairStats) {
        if (stats413b.shifts.length >= 3 &&
            stats413b.shifts.every(s => !turnScenes413b.has(s.sceneIdx))) {
          flatTurnPairs413b.push(pairKey413b);
        }
      }
      if (flatTurnPairs413b.length > 0) {
        issues.push({
          location: `Pair(s) ${flatTurnPairs413b.join(', ')} — dramatic-turn-decoupled shifts`,
          rule: 'PAIR_DRAMATIC_TURN_FLAT',
          severity: 'minor',
          description: `${flatTurnPairs413b.length === 1 ? 'One pair' : `${flatTurnPairs413b.length} pairs`} (${flatTurnPairs413b.join('; ')}) move${flatTurnPairs413b.length === 1 ? 's' : ''} 3 or more times, yet not one of those shifts coincides with a dramatic turn, even though the story pivots elsewhere. This bond's changes never turn the plot — the relationship moves, but its movement is never the hinge the story swings on, so the audience reads these shifts as side-developments rather than as the engine of the narrative.`,
          suggestedFix: 'Make at least one of this pair\'s shifts a story pivot: the betrayal that redirects the plot, the alliance that opens a new front, the reconciliation that changes what is possible. When a relationship\'s change IS the turn, the bond stops being decoration and becomes the mechanism by which the story advances.',
        });
      }
    }
  }

  // PAIR_REVELATION_FLAT (minor, n≥8, pair with ≥3 shifts, ≥1 revelation scene): A single pair
  // accumulates 3+ shifts, but not one of them coincides with a revelation, even though the story
  // discloses truths elsewhere. This bond never moves on the back of a disclosure — its changes
  // are never driven by something coming to light, so the relationship and the story's truths
  // evolve on separate tracks. The per-pair complement of RELATIONSHIP_REVELATION_SILENT (which
  // fires when NO shift of ANY pair coincides with a revelation — this fires when ONE pair's
  // shifts are all revelation-free even though another pair's shift may coincide with one).
  // Distinct from RELATIONSHIP_REVELATION_EMOTION_DECOUPLED (revelation+shift scenes that exist
  // but are emotionally flat) and the other per-pair channel-flat checks.
  if (records.length >= 8) {
    const revScenes413c = new Set<number>((records as any[]).filter(r => r.revelation === true).map(r => r.sceneIdx));
    if (revScenes413c.size >= 1) {
      const flatRevPairs413c: string[] = [];
      for (const [pairKey413c, stats413c] of pairStats) {
        if (stats413c.shifts.length >= 3 &&
            stats413c.shifts.every(s => !revScenes413c.has(s.sceneIdx))) {
          flatRevPairs413c.push(pairKey413c);
        }
      }
      if (flatRevPairs413c.length > 0) {
        issues.push({
          location: `Pair(s) ${flatRevPairs413c.join(', ')} — revelation-decoupled shifts`,
          rule: 'PAIR_REVELATION_FLAT',
          severity: 'minor',
          description: `${flatRevPairs413c.length === 1 ? 'One pair' : `${flatRevPairs413c.length} pairs`} (${flatRevPairs413c.join('; ')}) move${flatRevPairs413c.length === 1 ? 's' : ''} 3 or more times, yet not one of those shifts coincides with a revelation, even though the story discloses truths elsewhere. This bond never changes on the back of something coming to light — the relationship and the story's truths evolve on separate tracks, so the audience never experiences the charged moment where a disclosure and a bond shift land together.`,
          suggestedFix: 'Tie at least one of this pair\'s shifts to a revelation: a secret that surfaces and reshapes how the two regard each other, a truth that breaks or cements their bond in the moment it lands. When a disclosure drives a relationship change, the revelation has interpersonal consequence and the shift has a cause the audience can feel.',
        });
      }
    }
  }

  // ── Wave 427: RELATIONSHIP_SHIFT_AFTERMATH_VOID, PAIR_AMPLITUDE_GROWTH, PAIR_REPAIR_UNMOTIVATED ──

  // RELATIONSHIP_SHIFT_AFTERMATH_VOID (sequence/aftermath, n≥10, ≥2 qualifying shift scenes):
  // Every scene that carries a relationship shift AND has at least two scenes following it is
  // succeeded by two scenes that contain no relationship shift in any pair. Bonds move in complete
  // isolation — each change fires without sparking any relational chain reaction in the scenes
  // immediately after it. A shift that matters to the story should send ripples: the changed
  // dynamic surfaces in new behaviour, further relational movement, or at least the tension of
  // people navigating the altered ground in subsequent scenes. When every shift is followed by
  // relational dead air, the story treats each bond change as a self-contained event with no
  // ongoing consequence.
  // Distinctness: RELATIONSHIP_SHIFT_DROUGHT fires when the LONGEST no-shift run spans ≥40% of
  // the story; this fires when the two-scene AFTERMATH of EVERY individual shift is silent —
  // a drought can exist without every shift being dead-ended, and this can fire even when the
  // global drought is short. PAIR_OSCILLATION counts sign reversals. STATIC_RELATIONSHIP fires
  // when a pair never shifts at all. This is the only aftermath/sequence check in this pass.
  if (records.length >= 10) {
    const shiftScenes427a = (records as any[]).filter(
      r => ((r.relationshipShifts ?? []) as any[]).length > 0 && r.sceneIdx + 2 < records.length,
    );
    if (shiftScenes427a.length >= 2) {
      const allDeadEnded427a = shiftScenes427a.every(r => {
        const next1 = (records as any[])[r.sceneIdx + 1];
        const next2 = (records as any[])[r.sceneIdx + 2];
        const silent = (s: any) => s && ((s.relationshipShifts ?? []) as any[]).length === 0;
        return silent(next1) && silent(next2);
      });
      if (allDeadEnded427a) {
        issues.push({
          location: `${shiftScenes427a.length} shift scene(s) — aftermath relational silence`,
          rule: 'RELATIONSHIP_SHIFT_AFTERMATH_VOID',
          severity: 'minor',
          description: `Every relationship-shift scene that has room after it (${shiftScenes427a.length} in total) is followed by two scenes with no relational movement in any pair. Each bond change fires in isolation — no chain reaction, no altered behaviour, no further shifts sparked by the change — so the story treats each relationship event as self-contained rather than as a cause that reverberates through subsequent scenes.`,
          suggestedFix: 'Let relationship shifts ripple: in the scene or two after a bond moves, show the characters navigating the changed dynamic — a follow-up confrontation, a shift in how a third party reads the pair, or at least a further micro-move on the same axis. A bond change that has no aftermath registers as a plot note; one that sends ripples registers as a turning point.',
        });
      }
    }
  }

  // PAIR_AMPLITUDE_GROWTH (run-based, n≥8, pair with ≥4 shifts): A single pair's shifts grow
  // in absolute magnitude over the story — the late-half average magnitude exceeds 1.5× the
  // early-half average. Each successive wave of relational movement is larger than the last,
  // creating an unchecked escalation where every confrontation or reconciliation must outdo the
  // previous one. While RELATIONSHIP_AMPLITUDE_DECAY catches a bond that dissipates (early swings
  // large, late swings tiny), this catches the opposite: a bond in sustained, unrelenting
  // escalation with no stabilisation or plateau. Pure escalation without levelling reads as
  // melodrama — the audience loses the ability to gauge severity when every move is "the biggest
  // yet."
  // Distinctness: RELATIONSHIP_AMPLITUDE_DECAY (early avg > 2× late avg — bond winds down). This
  // fires on the reversed ratio: late avg > 1.5× early avg. PAIR_OSCILLATION counts sign changes,
  // not magnitude trend. WEAK_SHIFT_DOMINANCE fires when shifts are consistently tiny across the
  // whole story — this fires when they are consistently GROWING. These are orthogonal measures.
  if (records.length >= 8) {
    for (const [pairKey427b, stats427b] of pairStats) {
      if (stats427b.shifts.length >= 4) {
        const mags427b = stats427b.shifts.map(s => Math.abs(s.amount));
        const half427b = Math.floor(mags427b.length / 2);
        const earlyAvg427b = mags427b.slice(0, half427b).reduce((s, m) => s + m, 0) / half427b;
        const lateAvg427b = mags427b.slice(mags427b.length - half427b).reduce((s, m) => s + m, 0) / half427b;
        if (earlyAvg427b > 0 && lateAvg427b > earlyAvg427b * 1.5) {
          const [charA427b, charB427b] = pairKey427b.split('|');
          issues.push({
            location: `${charA427b} ↔ ${charB427b}`,
            rule: 'PAIR_AMPLITUDE_GROWTH',
            severity: 'minor',
            description: `The bond between ${charA427b} and ${charB427b} escalates in magnitude across the story: early shifts average ${earlyAvg427b.toFixed(2)} but late shifts average ${lateAvg427b.toFixed(2)} — each successive wave is larger than the last. Unchecked relational escalation reads as melodrama: every confrontation or repair must top the previous one, the audience loses their sense of scale, and the bond's eventual peak feels hyperinflated rather than earned.`,
            suggestedFix: `Give this pair's arc a plateau or a step back after the early escalation: let a mid-story shift settle rather than immediately amplifying, so the late-story peak feels like a true maximum rather than the latest in a series of ever-larger moves. Amplitude should earn its heights by contrast, not by unbroken escalation.`,
          });
          break; // one report per pass
        }
      }
    }
  }

  // PAIR_REPAIR_UNMOTIVATED (backward-cause, n≥10, pair with ≥3 shifts including ≥1 positive):
  // A pair that shifts three or more times has one or more positive shifts (warmings/repairs), but
  // looking backward from each such warming: there is no prior conflict for that pair within the
  // three preceding scenes AND neither the warming scene nor the scene immediately before it carries
  // a revelation, dramatic turn, clock raise, or suspense spike (> 1). The bond warms without
  // either a preceding rupture to resolve or a narrative event to motivate it — the audience has
  // been given no dramatic reason to believe the relationship should be moving toward warmth at
  // that moment.
  // Distinctness: RELATIONSHIP_UNEARNED_REVERSAL fires when a sign-CHANGE (positive→negative or
  // vice versa) has no prior setup in the prior scene specifically. This fires for any positive
  // shift — not requiring a sign change — and looks back three scenes for a prior pair conflict,
  // broadening the backward window and covering pairs that warm from neutral. MONOTONE_RELATIONSHIP
  // and POSITIVE_ONLY_PAIR_MAJORITY cover always-same-sign patterns; this targets individual
  // warmings inside mixed arcs that lack backward causation.
  if (records.length >= 10) {
    const hasCatalyst427c = (r: any) =>
      r && (
        r.revelation === true ||
        (r.dramaticTurn ?? 'nothing') !== 'nothing' ||
        r.clockRaised === true ||
        (r.suspenseDelta ?? 0) > 1
      );

    for (const [pairKey427c, stats427c] of pairStats) {
      if (stats427c.shifts.length < 3) continue;
      const positiveShifts427c = stats427c.shifts.filter(s => s.amount >= 0.3);
      if (positiveShifts427c.length === 0) continue;

      const anyMotivated427c = positiveShifts427c.some(shift => {
        const si = shift.sceneIdx;
        // (a) prior negative shift for this pair within 3 scenes
        const priorConflict = stats427c.shifts.some(
          s => s.amount <= -0.3 && s.sceneIdx >= si - 3 && s.sceneIdx < si,
        );
        if (priorConflict) return true;
        // (b) dramatic catalyst in the warming scene or the prior scene
        const scene = (records as any[])[si];
        const prior = si > 0 ? (records as any[])[si - 1] : null;
        return hasCatalyst427c(scene) || hasCatalyst427c(prior);
      });

      if (!anyMotivated427c) {
        const [charA427c, charB427c] = pairKey427c.split('|');
        issues.push({
          location: `${charA427c} ↔ ${charB427c} — unmotivated warming`,
          rule: 'PAIR_REPAIR_UNMOTIVATED',
          severity: 'minor',
          description: `The bond between ${charA427c} and ${charB427c} warms (positive shift ≥ 0.3) in at least one scene, but looking backward, none of those warmings are preceded by a recent pair conflict (within 3 scenes) or a dramatic catalyst in the scene or prior scene. The relationship moves toward warmth without the story providing a reason: no rupture is being resolved, no revelation motivates the change, and no deadline or pivot occurs nearby. Unmotivated warmings feel like mood shifts rather than story events.`,
          suggestedFix: `Give each warming a backward cause: either let it follow a recent rupture for this pair (so it reads as resolution), or place a revelation, dramatic turn, or clock in the scene that triggers the shift. A bond that warms for no dramatic reason is a relationship that rewrites itself rather than earning its changes through story logic.`,
        });
        break; // one report per pass
      }
    }
  }

  // ── Wave 441: PAIR_ENSEMBLE_SOLO, PAIR_RUPTURE_RUN, RELATIONSHIP_CLIMAX_VOID ──

  // PAIR_ENSEMBLE_SOLO (minor, n≥10, ≥3 active pairs with ≥2 shifts each): No single scene
  // contains shifts from two or more different pairs — every relational event happens to one bond
  // at a time, with no scene where multiple dynamics simultaneously shift in response to the same
  // event. Ensemble drama generates its richest moments from compound beats: a revelation that
  // simultaneously strains one bond and repairs another, a confrontation that shifts two pairs
  // at once, a climax that cracks one friendship as it cements another. When every scene is a
  // solo for a single pair, the relational world's dynamics never interact — each bond lives in
  // its own bubble, processed by the audience in sequence rather than simultaneously. Co-occurrence/
  // decoupling mode × multi-pair coincidence. Distinct from DEPTH_GAP (Wave 276: one pair gets 3×
  // more shifts than the second — a count-imbalance, not a co-occurrence check), SINGLE_PAIR_
  // RELATIONSHIP (Wave 161: ALL shifts involve only one pair — this fires even when 3+ pairs exist,
  // as long as they never coincide in the same scene), and RELATIONSHIP_SHIFT_AFTERMATH_VOID (Wave
  // 427: shift aftermath is relationally silent — a sequential check, not a within-scene check).
  // This is the first check to audit whether the ensemble's bonds ever move simultaneously.
  if (records.length >= 10) {
    const activePairs441a = [...pairStats.entries()]
      .filter(([, stats]) => stats.shifts.length >= 2)
      .map(([key]) => key);
    if (activePairs441a.length >= 3) {
      const anyCompound441a = (records as any[]).some(r => {
        const pairsInScene = new Set<string>();
        for (const s of ((r.relationshipShifts ?? []) as Array<{ pairKey: string; amount: number }>)) {
          if (Math.abs(s.amount) >= 0.3) pairsInScene.add(s.pairKey);
        }
        return pairsInScene.size >= 2;
      });
      if (!anyCompound441a) {
        issues.push({
          location: `${activePairs441a.length} active pairs — never coincide in same scene`,
          rule: 'PAIR_ENSEMBLE_SOLO',
          severity: 'minor',
          description: `The story has ${activePairs441a.length} active relationship pairs (each with ≥2 shifts), but no single scene shifts two or more of them simultaneously — every relational event is a solo act. Ensemble drama's richest moments come from compound beats: a scene where one bond fractures while another tentatively repairs, a confrontation that simultaneously damages one pair and clarifies another, a climax that cracks one friendship while cementing an alliance. When bonds never move together, the audience processes them in sequence rather than in tension with one another, and the relational world loses the complexity that arises from dynamics interacting.`,
          suggestedFix: 'Design at least one scene where two different pairs each experience a significant shift: a dinner-table confrontation that simultaneously strains the couple and repairs the friendship, a revelation that damages the protagonist\'s alliance with the mentor while deepening their bond with the rival, a climax that costs one relationship while earning another. A compound relational beat is one of the most efficient pages in drama — it moves two dynamics for the price of one scene.',
        });
      }
    }
  }

  // PAIR_RUPTURE_RUN (minor, n≥8): Three or more consecutive scenes each carry at least one
  // major relationship rupture (a negative shift with amount ≤ -0.3) — an unbroken sequence of
  // back-to-back bond breaks with no relational breath between them. When ruptures stack in
  // consecutive scenes, the audience is subjected to a relational grinding that loses its
  // individual impact through accumulation: each break arrives before the previous one has
  // registered. Ruptures land hardest when they are spaced — when the audience has a non-rupture
  // scene to absorb the cost of the prior break before the next one arrives. A consecutive run
  // of ≥3 ruptures also makes recovery feel impossible, since no scene in the run is available
  // for even the smallest tentative repair. Run-based mode × negative-shift channel. Distinct
  // from PAIR_AMPLITUDE_GROWTH (Wave 427: increasing magnitudes per pair — a growth-trend run,
  // not a consecutive-scenes check), RELATIONSHIP_SHIFT_DROUGHT (Wave 343: the longest no-shift
  // run ≥40% — the complement, not rupture density), and CONFLICT_BREATHING_ROOM_ABSENT (Wave
  // 436 in the conflict pass: 4+ ruptures with ≤1 gap — a distribution check with a different
  // threshold and a different pass perspective). This is the first check in this pass for a local
  // consecutive run of negative-shift scenes.
  if (records.length >= 8) {
    let maxRupRun441b = 0;
    let curRupRun441b = 0;
    let maxRupStart441b = -1;
    let curRupStart441b = -1;
    for (let i = 0; i < records.length; i++) {
      const hasRup = ((records as any[])[i].relationshipShifts ?? []).some(
        (s: any) => (s.amount ?? 0) <= -0.3,
      );
      if (hasRup) {
        if (curRupRun441b === 0) curRupStart441b = i;
        if (++curRupRun441b > maxRupRun441b) {
          maxRupRun441b = curRupRun441b;
          maxRupStart441b = curRupStart441b;
        }
      } else {
        curRupRun441b = 0;
      }
    }
    if (maxRupRun441b >= 3) {
      issues.push({
        location: `Scenes ${maxRupStart441b}–${maxRupStart441b + maxRupRun441b - 1} — consecutive rupture run`,
        rule: 'PAIR_RUPTURE_RUN',
        severity: 'minor',
        description: `Scenes ${maxRupStart441b}–${maxRupStart441b + maxRupRun441b - 1} each carry at least one major relationship rupture — ${maxRupRun441b} consecutive scenes of back-to-back bond breaks with no non-rupture scene between them. When breaks stack consecutively, each one arrives before the previous has registered: the audience is ground through relational damage rather than being given time to feel any individual break's cost. A run of ruptures without pause also makes recovery feel narratively impossible, since the machine never slows enough for even a tentative repair.`,
        suggestedFix: `Interrupt the rupture run at Scenes ${maxRupStart441b}–${maxRupStart441b + maxRupRun441b - 1}: insert at least one non-rupture scene between consecutive breaks. It need not be a repair — it can be a neutral scene, a scene with a different relational focus, or a moment of forced civility — but the break between breaks gives each rupture room to hurt before the next one arrives.`,
      });
    }
  }

  // RELATIONSHIP_CLIMAX_VOID (minor, n≥10, ≥3 shifts of |amount|≥0.3 from ≥2 pairs in first 85%):
  // The story's climax zone (final 15% of scenes) contains no relationship shift of magnitude ≥ 0.3
  // while the first 85% has significant bond movement from at least two pairs. The story's most
  // emotionally charged structural zone is relationally silent: bonds do not move at the moment
  // when the audience is most invested in them, and the climax resolves narratively without
  // registering relational consequence. The climax zone is the moment when the central tensions
  // come to a head — and for stories with meaningful relational arcs, the climax should be where
  // bonds either complete their movement or reach their most acute state. Zone presence/absence
  // mode × final-zone × relationship. Distinct from MIDPOINT_FREEZE (Wave 276: middle 50% silent),
  // RELATIONSHIP_ACT2B_DESERT (Wave 318: 50%–75% zone silent), PAIR_SECOND_HALF_VOID (Wave 357:
  // a specific pair has zero second-half shifts — per-pair, not global), and RELATIONSHIP_OPENING_
  // BURST (Wave 290: ALL shifts in the first 25% — a distribution check, not a zone void). This
  // fills the final zone of the relational zone set.
  if (records.length >= 10) {
    const climaxStart441c = Math.floor(records.length * 0.85);
    let earlyShiftCount441c = 0;
    const earlyPairs441c = new Set<string>();
    for (let i = 0; i < climaxStart441c; i++) {
      for (const s of ((records as any[])[i].relationshipShifts ?? []) as Array<{ pairKey: string; amount: number }>) {
        if (Math.abs(s.amount) >= 0.3) {
          earlyPairs441c.add(s.pairKey);
          earlyShiftCount441c++;
        }
      }
    }
    if (earlyShiftCount441c >= 3 && earlyPairs441c.size >= 2) {
      const hasClimaxShift441c = (records as any[]).slice(climaxStart441c).some(r =>
        ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => Math.abs(s.amount) >= 0.3),
      );
      if (!hasClimaxShift441c) {
        issues.push({
          location: `Climax zone (Scenes ${climaxStart441c}–${records.length - 1}) — relationally silent`,
          rule: 'RELATIONSHIP_CLIMAX_VOID',
          severity: 'minor',
          description: `The climax zone (final 15% of scenes: Scenes ${climaxStart441c}–${records.length - 1}) contains no relationship shift of magnitude ≥ 0.3, while ${earlyShiftCount441c} meaningful shifts from ${earlyPairs441c.size} pairs occur in the preceding ${climaxStart441c} scenes. The story's most emotionally charged structural zone is relationally silent: bonds do not move at the moment when the audience is most invested in them. For any story with meaningful relational arcs, the climax should register in the relationship layer — as a bond that finally breaks, finally mends, or reaches its most acute state.`,
          suggestedFix: `Give at least one pair a meaningful shift in the climax zone (Scenes ${climaxStart441c}–${records.length - 1}): the bond that the story has been tracing should reach its highest or lowest point at the climax rather than going quiet at the moment of maximum intensity. The relationship shift doesn't need to be the climax's primary focus — it can be a consequence, a cost, or a revelation — but the relational engine should not stall at the story's most emotionally loaded moment.`,
        });
      }
    }
  }

  // ── Wave 455: PAIR_RUPTURE_UNMOTIVATED, RELATIONSHIP_SHIFT_CURIOSITY_VOID, RELATIONSHIP_WARMTH_RUN ──

  // PAIR_RUPTURE_UNMOTIVATED — Backward-cause × negative shift × per-pair (n≥10, pair with ≥3
  // shifts including ≥2 negative). A pair whose negative shifts (amount ≤ -0.3) are ALL preceded
  // in the prior 3 scenes by neither: (a) a prior positive shift for this pair (warmth to destroy),
  // (b) a revelation, nor (c) a dramatic turn. Ruptures arrive without any dramatic logic building
  // toward them — bonds break because the plot requires it, not because any prior warmth is being
  // damaged or any revelation/turn has recontextualised the relationship.
  // Distinct from PAIR_REPAIR_UNMOTIVATED (Wave 427: same backward-cause mode × POSITIVE shifts —
  // warmings arrive causeless; this is the negative-polarity mirror), RELATIONSHIP_UNEARNED_REVERSAL
  // (Wave 147: a sign CHANGE with no prior setup in the immediately preceding scene — narrower
  // backward window, requires sign flip, not just any negative shift), and MONOTONE_RELATIONSHIP
  // (Wave 134: all shifts share the same sign globally, not backward-cause).
  if (records.length >= 10) {
    for (const [pairKey455a, stats455a] of pairStats) {
      if (stats455a.shifts.length < 3) continue;
      const negShifts455a = stats455a.shifts.filter(s => s.amount <= -0.3);
      if (negShifts455a.length < 2) continue;

      const anyNegMotivated455a = negShifts455a.some(shift => {
        const si = shift.sceneIdx;
        // (a) prior positive shift for THIS pair within 3 scenes
        const priorWarmth = stats455a.shifts.some(
          s => s.amount >= 0.3 && s.sceneIdx >= si - 3 && s.sceneIdx < si,
        );
        if (priorWarmth) return true;
        // (b) revelation or dramatic turn in prior 3 scenes
        for (let off = 1; off <= 3; off++) {
          const prevIdx = si - off;
          if (prevIdx < 0) continue;
          const prev = (records as any[])[prevIdx];
          if ((prev?.revelation ?? null) === true) return true;
          if ((prev?.dramaticTurn ?? 'nothing') !== 'nothing') return true;
        }
        return false;
      });

      if (!anyNegMotivated455a) {
        const [charA455a, charB455a] = pairKey455a.split('|');
        issues.push({
          location: `${charA455a} ↔ ${charB455a} — unmotivated rupture(s)`,
          rule: 'PAIR_RUPTURE_UNMOTIVATED',
          severity: 'minor',
          description: `The bond between ${charA455a} and ${charB455a} has ${negShifts455a.length} negative shifts (amount ≤ -0.3), but none is preceded in the prior three scenes by a warming for this pair, a revelation, or a dramatic turn — ruptures arrive without narrative logic building toward them. Ruptures land best when they destroy something: a prior warmth being shattered, a truth coming to light that reframes the bond, or a story pivot that makes the break inevitable. Without one of these backward causes, each break feels arbitrary — the bond damages itself without dramatic justification, which teaches the audience that this relationship's state is not a consequence of anything.`,
          suggestedFix: `Before at least one negative shift for ${charA455a} and ${charB455a}, build upstream cause: let a prior scene warm the bond (so the rupture destroys something), surface a revelation that recontextualises the relationship (so the break is a consequence of truth), or place a dramatic turn in the prior scene (so the plot's movement cracks the bond). A rupture that follows from something the audience witnessed feels inevitable rather than arbitrary.`,
        });
        break; // one report per pass
      }
    }
  }

  // RELATIONSHIP_SHIFT_CURIOSITY_VOID — Sequence/aftermath × curiosity channel × shift (n≥8,
  // ≥2 qualifying shift scenes with 2+ scenes remaining). No relationship-shift scene is followed
  // by a curiosityDelta > 0 in the next two scenes — bonds move without generating new questions
  // downstream. When a relationship changes, the audience naturally wonders: what does this mean
  // for the story? What happens next between these people? A curiosity rise in the aftermath
  // converts a relational event into a forward-driving question. When every shift's aftermath is
  // curiosity-flat, bonds change but the audience is given nothing new to wonder about — the
  // relational movement has no intellectual forward momentum.
  // Distinct from RELATIONSHIP_SHIFT_AFTERMATH_VOID (Wave 427: aftermath is relationally silent —
  // checks whether further SHIFTS follow; this checks whether CURIOSITY rises follow — a different
  // channel in the aftermath window), RELATIONSHIP_CURIOSITY_DECOUPLED (Wave 318: shift scenes
  // average curiosityDelta ≤ 0 — same-scene co-occurrence, not aftermath), and PAIR_CURIOSITY_FLAT
  // (Wave 399: per-pair average, not aftermath sequence).
  if (records.length >= 8) {
    const shiftScenes455b = (records as any[]).filter(
      r => ((r.relationshipShifts ?? []) as any[]).length > 0 && r.sceneIdx + 2 < records.length,
    );
    if (shiftScenes455b.length >= 2) {
      const anyAftermathCurio455b = shiftScenes455b.some(r => {
        const next1 = (records as any[])[r.sceneIdx + 1];
        const next2 = (records as any[])[r.sceneIdx + 2];
        return ((next1?.curiosityDelta ?? 0) > 0) || ((next2?.curiosityDelta ?? 0) > 0);
      });
      if (!anyAftermathCurio455b) {
        issues.push({
          location: `All ${shiftScenes455b.length} qualifying shift scene(s) — curiosity void in aftermath`,
          rule: 'RELATIONSHIP_SHIFT_CURIOSITY_VOID',
          severity: 'minor',
          description: `None of the story's ${shiftScenes455b.length} relationship-shift scenes (with room after them) is followed by a curiosity rise (curiosityDelta > 0) within the next two scenes — bonds move without generating any new questions downstream. When a relationship changes, the event should trigger the audience's forward-looking attention: what does the shift mean for the story, what do the characters do with the altered dynamic, what new complication does the changed bond introduce? Curiosity in the aftermath of a shift converts the relational event into forward narrative momentum. When every shift's aftermath is curiosity-flat, the audience is told a bond has changed but given nothing new to wonder about, and the relational engine produces movement without drive.`,
          suggestedFix: `After at least one relationship shift, use the next scene or the one after to open a new question: surface an implication of the changed bond that the audience did not see coming, let the altered dynamic complicate a situation already in motion, or let a character wonder (and the audience share the wondering) what the changed relationship means. The moment after a bond moves is fertile ground for a new question — the audience is already emotionally engaged and primed to wonder what comes next.`,
        });
      }
    }
  }

  // RELATIONSHIP_WARMTH_RUN — Run-based × positive-shift channel (n≥8, ≥2 active pairs, max
  // consecutive warmth-scene run ≥ 3). Three or more consecutive scenes each carry at least one
  // major positive shift (amount ≥ 0.3) from any pair — a warmth avalanche that delivers back-to-
  // back reconciliations, repairs, or deepening bonds without any cooling or neutral space between
  // them. Warmings land hardest when they are spaced: each positive move needs room to register
  // before the next one arrives. A consecutive warmth run also makes the story's relational world
  // feel frictionless — all the bonds are warming simultaneously without tension, setback, or the
  // dramatic complications that make repair feel earned. Run-based mode × positive-shift channel.
  // Distinct from PAIR_RUPTURE_RUN (Wave 441: same run-based mode × negative-shift — the polarity
  // complement; this is the positive run), MONOTONE_RELATIONSHIP (Wave 134: per-pair uniform sign
  // across the whole arc, not a consecutive-scene run), WARMTH_UNFELT (Wave 304: positive shifts in
  // emotionally neutral scenes — a co-occurrence check on the scenes themselves), and POSITIVE_ONLY_
  // PAIR_MAJORITY (Wave 318: >60% of pairs always warm — distribution, not run-based).
  if (records.length >= 8) {
    const activePairs455c = [...pairStats.entries()].filter(([, s]) => s.shifts.length >= 2);
    if (activePairs455c.length >= 2) {
      let maxWarmRun455c = 0, curWarmRun455c = 0;
      let maxWarmStart455c = -1, curWarmStart455c = -1;
      for (let i = 0; i < records.length; i++) {
        const isWarm = ((records as any[])[i].relationshipShifts ?? []).some(
          (s: any) => (s.amount ?? 0) >= 0.3,
        );
        if (isWarm) {
          if (curWarmRun455c === 0) curWarmStart455c = i;
          if (++curWarmRun455c > maxWarmRun455c) {
            maxWarmRun455c = curWarmRun455c;
            maxWarmStart455c = curWarmStart455c;
          }
        } else { curWarmRun455c = 0; }
      }
      if (maxWarmRun455c >= 3) {
        issues.push({
          location: `Scenes ${maxWarmStart455c}–${maxWarmStart455c + maxWarmRun455c - 1} — consecutive warmth run`,
          rule: 'RELATIONSHIP_WARMTH_RUN',
          severity: 'minor',
          description: `Scenes ${maxWarmStart455c}–${maxWarmStart455c + maxWarmRun455c - 1} each carry at least one major positive relationship shift (amount ≥ 0.3) — ${maxWarmRun455c} consecutive scenes of back-to-back bond warmings with no neutral or rupture scene between them. Warmings land best when spaced: a positive move needs room to register before the next one arrives. A consecutive warmth run also signals a frictionless relational world — all bonds are improving simultaneously without any setback, complication, or tension to make the repairs feel earned. When warmth avalanches, each individual moment of connection is diluted by the one that immediately follows it.`,
          suggestedFix: `Interrupt the warmth run at Scenes ${maxWarmStart455c}–${maxWarmStart455c + maxWarmRun455c - 1}: insert at least one non-warmth scene between consecutive positive moves. It need not be a rupture — it can be a neutral relational scene, a moment of uncertainty, or a beat where a character hesitates before fully committing to the repair. The non-warmth scene between warmings gives each positive moment space to breathe and makes the next warming feel earned rather than automatic.`,
        });
      }
    }
  }

  // ── Wave 469: RELATIONSHIP_SHIFT_SUSPENSE_AFTERMATH_VOID, RELATIONSHIP_SHIFT_EMOTIONAL_AFTERMATH_VOID, RELATIONSHIP_ACT1_VOID ──

  // RELATIONSHIP_SHIFT_SUSPENSE_AFTERMATH_VOID — Sequence/aftermath × suspense channel ×
  // shift trigger (n≥8, ≥2 qualifying shift scenes). No relationship-shift scene is followed
  // by a suspense rise (suspenseDelta > 0) in the next two scenes — bonds move without raising
  // the story's danger level in the aftermath. When a bond changes — rupture or repair — the
  // altered relationship should shift the stakes: the new dynamic is more dangerous, or the
  // resolution removes a threat. When every shift's aftermath is suspense-flat, the relational
  // engine and the danger engine are fully decoupled: bonds change but the temperature of the
  // story is unmoved by them. Sequence/aftermath mode × suspense channel × shift trigger.
  // Completing the shift-aftermath family alongside RELATIONSHIP_SHIFT_AFTERMATH_VOID (Wave 427:
  // further relational shifts in aftermath — same trigger, relational channel) and RELATIONSHIP_
  // SHIFT_CURIOSITY_VOID (Wave 455: curiosity channel in aftermath): this adds the suspense
  // channel. Distinct from RELATIONSHIP_SUSPENSE_DECOUPLED (Wave 329: shift scenes average
  // suspenseDelta ≤ 0 — same-scene co-occurrence, not aftermath), PAIR_SUSPENSE_FLAT (Wave 399:
  // per-pair average, not aftermath sequence), and SUSPENSE_EMOTIONAL_AFTERMATH_FLAT (pacing.ts
  // Wave 453: emotional aftermath of suspense peaks — different trigger).
  if (records.length >= 8) {
    const shiftScenes469a = (records as any[]).filter(
      r => ((r.relationshipShifts ?? []) as any[]).length > 0 && (r.sceneIdx + 2) < records.length,
    );
    if (shiftScenes469a.length >= 2) {
      const anyAftermathSusp469a = shiftScenes469a.some((r: any) => {
        const next1 = (records as any[])[r.sceneIdx + 1];
        const next2 = (records as any[])[r.sceneIdx + 2];
        return ((next1?.suspenseDelta ?? 0) > 0) || ((next2?.suspenseDelta ?? 0) > 0);
      });
      if (!anyAftermathSusp469a) {
        issues.push({
          location: `All ${shiftScenes469a.length} qualifying shift scene(s) — suspense void in aftermath`,
          rule: 'RELATIONSHIP_SHIFT_SUSPENSE_AFTERMATH_VOID',
          severity: 'minor',
          description: `None of the story's ${shiftScenes469a.length} relationship-shift scenes (with room after them) is followed by a suspense rise (suspenseDelta > 0) in the next two scenes — bonds move without escalating the danger level in the aftermath. When a relationship changes, the altered dynamic should shift the stakes: a new rupture makes the situation more dangerous, a repair removes a threat or creates a new one. When every shift's aftermath is suspense-flat, the relational engine and the danger engine run on separate tracks — bonds change but the story's temperature is unmoved by them, so the relationship shifts feel emotionally contained rather than dramatically consequential.`,
          suggestedFix: 'After at least one relationship shift, let the next scene escalate tension: the broken bond exposes a vulnerability, the repaired alliance raises the antagonist\'s alarm, or the altered dynamic creates a new threat the characters must respond to. When relational changes raise the stakes, the audience understands that the bonds in this story are not decorative — they are load-bearing elements that affect how dangerous the situation is.',
        });
      }
    }
  }

  // RELATIONSHIP_SHIFT_EMOTIONAL_AFTERMATH_VOID — Sequence/aftermath × emotional channel ×
  // shift trigger (n≥8, ≥2 qualifying shift scenes). No relationship-shift scene is followed
  // by an emotional shift (emotionalShift ≠ 'neutral') in the next two scenes — bonds change
  // without any character showing the felt cost or relief in the scenes that follow. A bond shift
  // that produces no emotional reaction in its aftermath is informationally processed but not
  // emotionally lived: the audience knows the dynamic has changed but never watches any character
  // absorb what that change means for them. Sequence/aftermath mode × emotional channel × shift
  // trigger. Adding the emotional channel to the shift-aftermath family alongside RELATIONSHIP_
  // SHIFT_AFTERMATH_VOID (relational) and RELATIONSHIP_SHIFT_CURIOSITY_VOID (curiosity): this
  // is the third member. Distinct from WARMTH_UNFELT (Wave 304: positive shifts in emotionally
  // neutral scenes — same-scene co-occurrence, not aftermath), RELATIONSHIP_RUPTURE_EMOTION_FLAT
  // (Wave 343: negative shifts in neutral scenes — same-scene, not aftermath), and SUSPENSE_
  // EMOTIONAL_AFTERMATH_FLAT (pacing.ts Wave 453: emotional aftermath of suspense peaks — different
  // trigger: suspense peaks, not relational shifts).
  if (records.length >= 8) {
    const shiftScenes469b = (records as any[]).filter(
      r => ((r.relationshipShifts ?? []) as any[]).length > 0 && (r.sceneIdx + 2) < records.length,
    );
    if (shiftScenes469b.length >= 2) {
      const anyAftermathEmo469b = shiftScenes469b.some((r: any) => {
        const next1 = (records as any[])[r.sceneIdx + 1];
        const next2 = (records as any[])[r.sceneIdx + 2];
        return (next1?.emotionalShift !== 'neutral' && next1?.emotionalShift !== undefined) ||
               (next2?.emotionalShift !== 'neutral' && next2?.emotionalShift !== undefined);
      });
      if (!anyAftermathEmo469b) {
        issues.push({
          location: `All ${shiftScenes469b.length} qualifying shift scene(s) — emotional void in aftermath`,
          rule: 'RELATIONSHIP_SHIFT_EMOTIONAL_AFTERMATH_VOID',
          severity: 'minor',
          description: `None of the story's ${shiftScenes469b.length} relationship-shift scenes (with room after them) is followed by an emotional shift (emotionalShift ≠ 'neutral') in the next two scenes — bond changes produce no felt reaction in the characters who experience them. A bond shift that generates no emotional aftermath is transactionally processed: the dynamic changed, the record was updated, but no character shows what that change costs or means for them. When every relational move is followed by neutral scenes, the bonds in the story feel like chess pieces repositioned on the board rather than connections felt between people.`,
          suggestedFix: "After at least one relationship shift, let a character react emotionally in the next scene or two: the rupture leaves someone shaken, relieved, or grimly resolved; the repair produces warmth, discomfort, or grief at what it cost. The emotional aftermath of a bond change is how the audience learns what the relationship meant — and what losing or gaining it feels like to the people in it.",
        });
      }
    }
  }

  // RELATIONSHIP_ACT1_VOID — Zone presence/absence × first-quarter zone × shift signal (n≥10,
  // ≥3 shifts outside the first 25%). No relationship shift of any magnitude occurs in the first
  // 25% of scenes while at least three shifts exist in the remaining 75%. The story opens without
  // any relational movement: the audience enters the complication zone with no sense of any bond
  // being established, tested, or defined. A story that defers all relational activity to Act 2
  // gives the audience nothing to invest in relationally during the setup — no pair to root for,
  // no rift to watch develop, no dynamic to carry into the conflict. Zone presence/absence mode ×
  // first-quarter zone. Fills the zone set alongside MIDPOINT_FREEZE (Wave 276: middle 50%),
  // RELATIONSHIP_ACT2B_DESERT (Wave 318: 50%–75% zone), and RELATIONSHIP_CLIMAX_VOID (Wave 441:
  // final 15%) — this adds the opening zone. Distinct from RELATIONSHIP_OPENING_BURST (Wave 290:
  // all shifts concentrated in the first 25% — the opposite problem: all relational movement
  // front-loaded rather than absent), LATE_RELATIONSHIP_INTRODUCTION (Wave 161: a PAIR first
  // shifts after the midpoint — per-pair timing; this audits the global zone, not a per-pair
  // pattern), and PAIR_REPAIR_UNMOTIVATED (Wave 427: backward-cause on warmings, not zone absence).
  if (records.length >= 10) {
    const act1End469c = Math.floor(records.length * 0.25);
    const act1ShiftCount469c = (records as any[])
      .slice(0, act1End469c)
      .filter(r => ((r.relationshipShifts ?? []) as any[]).length > 0)
      .length;
    const laterShiftCount469c = (records as any[])
      .slice(act1End469c)
      .filter(r => ((r.relationshipShifts ?? []) as any[]).length > 0)
      .length;
    if (act1ShiftCount469c === 0 && laterShiftCount469c >= 3) {
      issues.push({
        location: `Act 1 (Scenes 0–${act1End469c - 1}) — relationally silent`,
        rule: 'RELATIONSHIP_ACT1_VOID',
        severity: 'minor',
        description: `No relationship shift occurs in the first ${act1End469c} scenes (Act 1, the first 25%) while ${laterShiftCount469c} shifts appear in the remaining scenes — the story opens with no relational movement. The audience enters the complication zone without any sense of which bonds are at stake, without a dynamic to root for or a rift to track. Act 1 is where the relationships that will later be tested should be established, defined, or at least gestured at through the first cracks or warmings. A completely relationally silent opening means the audience has nothing invested in the people before the story begins pushing them.`,
        suggestedFix: `Introduce at least one relational moment in Act 1 (Scenes 0–${act1End469c - 1}): a small warming between two characters that the audience will carry, a first hint of friction that will later become a rupture, or a demonstration of an established bond that later gets tested. The shift does not need to be large — even a minor positive or negative nudge gives the audience a relational anchor before the story's complications begin.`,
      });
    }
  }

  // ── Wave 483: RELATIONSHIP_SHIFT_REVELATION_AFTERMATH_VOID, RELATIONSHIP_SHIFT_THIRDS_CLUSTER, RELATIONSHIP_ACT2A_VOID ──

  // RELATIONSHIP_SHIFT_REVELATION_AFTERMATH_VOID (sequence/aftermath × revelation channel ×
  // shift trigger, n≥8, ≥2 qualifying shift scenes): No relationship-shift scene is followed
  // by a revelation (revelation field non-null) in either of the next two scenes — bonds move
  // without uncovering truths downstream. A relational shift is a moment of altered knowing as
  // much as altered feeling: when a pair's dynamic changes, the new alignment should reveal
  // something — about who they are to each other, about what one of them has been hiding, about
  // what the changed bond makes possible or necessary. When every bond shift is followed by two
  // scenes with no disclosure, the relational world and the informational world are kept entirely
  // separate. Sequence/aftermath mode × revelation channel × shift trigger. Distinct from
  // RELATIONSHIP_REVELATION_SILENT (Wave 329: no revelation-tagged scene carries a shift —
  // co-occurrence, not aftermath), SHIFT_CURIOSITY_VOID (Wave 455: curiosity not revelation),
  // SHIFT_SUSPENSE_AFTERMATH_VOID (Wave 469: suspense not revelation), SHIFT_EMOTIONAL_AFTERMATH_
  // VOID (Wave 469: emotional not revelation): this adds the disclosure channel to the shift-
  // aftermath family alongside curiosity, suspense, and emotional.
  if (records.length >= 8) {
    const shiftScenes483a = (records as any[]).filter(
      r => ((r.relationshipShifts ?? []) as any[]).length > 0 && (r.sceneIdx + 2) < records.length,
    );
    if (shiftScenes483a.length >= 2) {
      const anyRevAftermath483a = shiftScenes483a.some((r: any) => {
        const next1483a = (records as any[])[r.sceneIdx + 1];
        const next2483a = (records as any[])[r.sceneIdx + 2];
        const hasRev = (x: any) => x && x.revelation !== null && x.revelation !== undefined && x.revelation !== '';
        return hasRev(next1483a) || hasRev(next2483a);
      });
      if (!anyRevAftermath483a) {
        issues.push({
          location: `All ${shiftScenes483a.length} qualifying shift scene(s) — no revelation in aftermath`,
          rule: 'RELATIONSHIP_SHIFT_REVELATION_AFTERMATH_VOID',
          severity: 'minor',
          description: `None of the story's ${shiftScenes483a.length} relationship-shift scenes (with room after them) is followed by a revelation in the next two scenes — bond changes never uncover truths downstream. When a pair's dynamic shifts, the new alignment should make something discoverable: a secret the changed dynamic now allows to surface, a truth one character can finally admit when the relationship reconfigures around them, a disclosure that the shifted trust — or distrust — makes newly possible or necessary. When every relational shift is followed by two scenes without any disclosure, the bonds and the informational world run on completely separate tracks.`,
          suggestedFix: "After at least one relationship shift, let the changed dynamic precipitate a revelation in the next scene or two: a character who now trusts (or mistrusts) differently finally says or discovers what they couldn't before. The disclosure doesn't need to be the story's biggest secret — even a small truth that emerges from the shifted bond teaches the audience that relational change has informational consequences.",
        });
      }
    }
  }

  // RELATIONSHIP_SHIFT_THIRDS_CLUSTER (distribution/timing × thirds × shift signal, n≥8,
  // ≥4 shift scenes, >75% in one third): More than three-quarters of all shift scenes fall
  // within a single structural third of the story — bond activity is packed into one zone
  // while the other two are relationally sparse. Relationships need room to develop across
  // the whole story: early shifts establish dynamics, mid-story shifts complicate them, late
  // shifts close them. When the relational machine fires in a single concentrated burst, the
  // audience receives one intense sequence of bond activity and then waits — or arrives to a
  // burst after waiting. Distribution/timing mode × thirds × shift signal. Distinct from
  // MIDPOINT_FREEZE (Wave 276: middle 50% void — zone absence, not thirds concentration),
  // RELATIONSHIP_GLOBAL_AMPLITUDE_FRONTLOAD (Wave 343: first half vs second half intensity —
  // half-based, not thirds), RELATIONSHIP_OPENING_BURST (Wave 290: all shifts in first 25% —
  // subset case; the thirds cluster fires at >75% in any third), RELATIONSHIP_ACT2B_DESERT
  // (Wave 318: 50–75% zone void — absence, not concentration).
  {
    const n483b = records.length;
    if (n483b >= 8) {
      const shiftPositions483b = (records as any[])
        .map((r, pos) => (((r.relationshipShifts ?? []) as any[]).length > 0 ? pos : -1))
        .filter(pos => pos >= 0);
      if (shiftPositions483b.length >= 4) {
        const third483b = Math.floor(n483b / 3);
        const zone1483b = shiftPositions483b.filter(pos => pos < third483b).length;
        const zone2483b = shiftPositions483b.filter(pos => pos >= third483b && pos < 2 * third483b).length;
        const zone3483b = shiftPositions483b.filter(pos => pos >= 2 * third483b).length;
        const maxZone483b = Math.max(zone1483b, zone2483b, zone3483b);
        const totalShifts483b = shiftPositions483b.length;
        if (maxZone483b / totalShifts483b > 0.75) {
          const zoneLabel483b = maxZone483b === zone1483b ? `Scenes 0–${third483b - 1}` :
            maxZone483b === zone2483b ? `Scenes ${third483b}–${2 * third483b - 1}` :
            `Scenes ${2 * third483b}–${n483b - 1}`;
          issues.push({
            location: `Relationship shifts — ${maxZone483b}/${totalShifts483b} clustered in ${zoneLabel483b}`,
            rule: 'RELATIONSHIP_SHIFT_THIRDS_CLUSTER',
            severity: 'minor',
            description: `${maxZone483b} of the story's ${totalShifts483b} relationship shifts (${Math.round(maxZone483b / totalShifts483b * 100)}%) fall in a single structural third (${zoneLabel483b}) — bond activity is packed into one zone while the other two-thirds are relationally sparse. Relationships need room to develop across the whole story: early shifts establish dynamics, mid-story shifts complicate them, late shifts close or transform them. A single burst of bond activity followed by (or preceded by) relational silence teaches the audience that the story's relational engine only runs intermittently — not that it is building toward anything.`,
            suggestedFix: 'Spread relationship shifts more evenly across the story: if they are currently clustered in the first third, seed a mid-story complication or quiet warming for a secondary pair; if they are in the final third, plant an earlier shift to give the audience a bond to invest in before the late-act drama. Each structural third should have at least one meaningful shift — establishing, complicating, and resolving — to give the relational arc a shape.',
          });
        }
      }
    }
  }

  // RELATIONSHIP_ACT2A_VOID (zone presence/absence × Act 2a zone (25%–50%) × shift signal,
  // n≥10, ≥3 shifts outside this zone): No relationship shift occurs in the 25%–50% range
  // while at least three shifts exist elsewhere — the early-conflict zone is relationally
  // silent. Act 2a is where initial complications should strain and test the bonds established
  // in Act 1: the audience has been introduced to the relationships and is now watching to see
  // how the story's central pressure affects them. When the Act 2a zone is relationally silent,
  // bonds that were established in Act 1 are suspended until Act 2b or Act 3 — the complication
  // begins but the relationships don't move. Zone presence/absence mode × Act 2a zone. Completes
  // the zone set alongside RELATIONSHIP_ACT1_VOID (Wave 469: 0–25%), MIDPOINT_FREEZE (Wave 276:
  // middle 50%), RELATIONSHIP_ACT2B_DESERT (Wave 318: 50–75%), and RELATIONSHIP_CLIMAX_VOID
  // (Wave 441: final 15%). Distinct from RELATIONSHIP_SHIFT_DROUGHT (Wave 343: longest run ≥40%
  // of the story — run length, not zone identity) and LATE_RELATIONSHIP_INTRODUCTION (Wave 161:
  // a per-pair first-shift timing check, not a global zone check).
  if (records.length >= 10) {
    const n483c = records.length;
    const act2aStart483c = Math.floor(n483c * 0.25);
    const act2aEnd483c = Math.floor(n483c * 0.50);
    const act2aShifts483c = (records as any[])
      .slice(act2aStart483c, act2aEnd483c)
      .filter(r => ((r.relationshipShifts ?? []) as any[]).length > 0)
      .length;
    const outsideShifts483c = (records as any[])
      .filter((r, pos) =>
        (pos < act2aStart483c || pos >= act2aEnd483c) &&
        ((r.relationshipShifts ?? []) as any[]).length > 0,
      )
      .length;
    if (act2aShifts483c === 0 && outsideShifts483c >= 3) {
      issues.push({
        location: `Act 2a (Scenes ${act2aStart483c}–${act2aEnd483c - 1}) — relationally silent`,
        rule: 'RELATIONSHIP_ACT2A_VOID',
        severity: 'minor',
        description: `No relationship shift occurs in the Act 2a zone (Scenes ${act2aStart483c}–${act2aEnd483c - 1}, 25%–50%) while ${outsideShifts483c} shifts appear in the rest of the story. The early-conflict zone is where established bonds should be tested: Act 1 introduced the relationships, and the complication that opens Act 2 should start cracking them. When Act 2a is relationally silent, the story's central complications begin but none of the human bonds move in response — the characters are under pressure but the pressure doesn't affect how they relate to each other.`,
        suggestedFix: `Add at least one relationship shift in Scenes ${act2aStart483c}–${act2aEnd483c - 1}: an early complication that puts two characters at odds, a moment of unexpected alliance under pressure, or a subtle warming or cooling that foreshadows a larger Act 2b rupture or repair. The shift doesn't need to be large — even a minor bond move in the early-conflict zone tells the audience that the story's pressure is affecting the relationships, not just the plot.`,
      });
    }
  }

  // ── Wave 497: RELATIONSHIP_SHIFT_CLOCK_AFTERMATH_VOID, RELATIONSHIP_WARMTH_CLUSTER, RELATIONSHIP_DIMENSION_RUN ──

  // RELATIONSHIP_SHIFT_CLOCK_AFTERMATH_VOID (sequence/aftermath × clock channel × shift trigger,
  // n≥8, ≥2 qualifying shift scenes, ≥2 clock scenes overall): No relationship-shift scene is
  // followed by a clock raise (clockRaised or clockDelta > 0) in either of the next two scenes,
  // even though the story uses clocks elsewhere. Bond changes never tighten a deadline in their
  // wake — when a pair's dynamic shifts, the story's urgency system is unaffected. A relational
  // fracture or repair should have temporal consequences: the lost ally shortens time, the betrayal
  // forces a crisis response, the new bond creates an obligation that must be met before a deadline.
  // When every shift is followed by clock silence, the relational and urgency engines run in
  // entirely separate tracks. Sequence/aftermath mode × clock channel × shift trigger. Distinct from
  // RELATIONSHIP_CLOCK_DECOUPLED (Wave 371: no shift scene coincides with a clock IN the same scene
  // — co-occurrence, not aftermath), RELATIONSHIP_SHIFT_CURIOSITY_VOID (Wave 455: curiosity channel),
  // RELATIONSHIP_SHIFT_SUSPENSE_AFTERMATH_VOID (Wave 469: suspense channel), RELATIONSHIP_SHIFT_
  // EMOTIONAL_AFTERMATH_VOID (Wave 469: emotional channel), RELATIONSHIP_SHIFT_REVELATION_AFTERMATH_
  // VOID (Wave 483: revelation channel): this adds clock as the sixth channel in the shift-aftermath
  // family.
  {
    const n497a = records.length;
    if (n497a >= 8) {
      const clockScenes497a = (records as any[]).filter(r =>
        r.clockRaised === true || (r.clockDelta ?? 0) > 0,
      );
      const qualShiftScenes497a = (records as any[]).filter((r, pos) =>
        ((r.relationshipShifts ?? []) as any[]).length > 0 && pos < n497a - 2,
      );
      if (qualShiftScenes497a.length >= 2 && clockScenes497a.length >= 2) {
        const anyClockAfterShift497a = qualShiftScenes497a.some((r: any) => {
          const pos497a = (records as any[]).indexOf(r);
          for (let off = 1; off <= 2; off++) {
            const nxt = (records as any[])[pos497a + off];
            if (nxt && (nxt.clockRaised === true || (nxt.clockDelta ?? 0) > 0)) return true;
          }
          return false;
        });
        if (!anyClockAfterShift497a) {
          issues.push({
            location: `All ${qualShiftScenes497a.length} qualifying shift scene(s) — no clock raise within 2 scenes`,
            rule: 'RELATIONSHIP_SHIFT_CLOCK_AFTERMATH_VOID',
            severity: 'minor',
            description: `None of the story's ${qualShiftScenes497a.length} relationship-shift scenes is followed by a clock raise in the next two scenes, even though ${clockScenes497a.length} clock events exist elsewhere. Bond changes — ruptures and repairs alike — have no temporal consequence: when a pair's dynamic shifts, the urgency of the story's situation is unaffected. A relational fracture or warming should press on the protagonist's time: the lost ally shortens a runway, a new bond creates an obligation with a deadline, a betrayal triggers a crisis that forces immediate action. When every shift is followed by clock silence, the emotional and urgency engines run entirely apart.`,
            suggestedFix: `After at least one relationship shift, let the next scene or two raise the clock — the bond change reveals that the timeline has changed: the fractured alliance removes a buffer, the new partnership creates an expectation that must be met before time runs out, the revealed betrayal starts a countdown. A shift followed by a clock raise tells the audience that relationships have stakes beyond feelings — they have operational consequences.`,
          });
        }
      }
    }
  }

  // RELATIONSHIP_WARMTH_CLUSTER (distribution/timing × positive shift × thirds, n≥9,
  // ≥4 positive-shift scenes, >75% in one third): More than three-quarters of all positive
  // relationship shifts fall within a single structural third — warmth and repair are
  // architecturally zone-ghettoized. A story's relational warmings should ideally be distributed
  // to provide emotional contrast, investment hooks, and earned climax repairs. When almost all
  // warmth concentrates in one structural zone, the audience experiences either an opening in
  // which every relationship warms quickly (deflating later tension), a middle burst of warmth
  // surrounded by cold zones (the warm patch feels disconnected), or a finale-concentrated warmth
  // that arrives without enough prior relational investment. Distribution/timing mode × positive
  // relationship shift × thirds. Distinct from RELATIONSHIP_SHIFT_THIRDS_CLUSTER (Wave 483: audits
  // ALL shifts regardless of valence — this focuses specifically on the positive channel, which
  // can cluster differently from the combined channel), RELATIONSHIP_WARMTH_RUN (Wave 455: run-based
  // consecutive positive scenes, not zone distribution), POSITIVE_ONLY_PAIR_MAJORITY (Wave 290:
  // whether pairs ever go negative, not where warmth concentrates in time).
  {
    const n497b = records.length;
    if (n497b >= 9) {
      const posShiftPositions497b = (records as any[])
        .map((r, pos) => ({
          pos,
          hasWarmth: ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount > 0),
        }))
        .filter(x => x.hasWarmth)
        .map(x => x.pos);
      if (posShiftPositions497b.length >= 4) {
        const third497b = Math.floor(n497b / 3);
        const zone1497b = posShiftPositions497b.filter(p => p < third497b).length;
        const zone2497b = posShiftPositions497b.filter(p => p >= third497b && p < 2 * third497b).length;
        const zone3497b = posShiftPositions497b.filter(p => p >= 2 * third497b).length;
        const maxZ497b = Math.max(zone1497b, zone2497b, zone3497b);
        if (maxZ497b / posShiftPositions497b.length > 0.75) {
          const zLabel497b = zone1497b === maxZ497b ? 'opening' : zone2497b === maxZ497b ? 'middle' : 'closing';
          issues.push({
            location: `${maxZ497b}/${posShiftPositions497b.length} positive shift scene(s) clustered in the ${zLabel497b} third`,
            rule: 'RELATIONSHIP_WARMTH_CLUSTER',
            severity: 'minor',
            description: `${maxZ497b} of ${posShiftPositions497b.length} positive relationship shifts (${(maxZ497b / posShiftPositions497b.length * 100).toFixed(0)}%) fall within the ${zLabel497b} third — all the story's warmth and repair concentrates in one structural zone. Relational warmings work best when distributed across the story: early warmings give the audience bonds to invest in before the complications arrive, mid-story warmings provide contrast and breathing room among the ruptures, and late warmings make the finale feel earned rather than manufactured. When warmth concentrates in one zone, either the story warms too early (before tension has a chance to build on the relationships), warms in a disconnected middle burst, or saves all relational positivity for the end — where it arrives without the prior warmth that makes it meaningful.`,
            suggestedFix: `Redistribute at least one or two positive shifts into the zones currently lacking warmth. A small warming in the opening third gives the audience a pair to root for; a mid-story warming provides relief in the darkest zone; a closing warming is only resonant if the audience has seen the pair earn their way back from earlier tension. Warmth that arrives without prior investment reads as sentimental; warmth that arrives after relationship history reads as cathartic.`,
          });
        }
      }
    }
  }

  // RELATIONSHIP_DIMENSION_RUN (run-based × shift dimension, n≥8, ≥4 consecutive shift scenes
  // all using only one relationship dimension, ≥2 distinct dimensions exist globally): Four or
  // more consecutive scenes that carry relationship shifts each operate on only a single shared
  // dimension (e.g., all "trust," all "respect") — the story's relational texture goes one-axis
  // for a sustained stretch. While a pair that exclusively tests trust is dramatically coherent,
  // a global burst where every shift scene operates on the same dimension suggests the story's
  // relational complexity has narrowed to a single register: the audience experiences only one
  // kind of bond change for a sustained sequence, losing the multi-axis texture that makes
  // relationships feel fully inhabited. Run-based mode × shift dimension × consecutive scenes.
  // Distinct from SHIFT_DIMENSION_CONCENTRATION (Wave 290: ALL shifts across the whole story
  // share one dimension — a global proportion check, not a local consecutive run; that fires
  // when the story never diversifies, this fires when diversification exists globally but
  // collapses locally). The pair-based PAIR_CLOCK_FLAT, PAIR_DRAMA_FLAT etc. are per-pair; this
  // is a global consecutive-run check on the dimension channel.
  {
    const n497c = records.length;
    if (n497c >= 8) {
      const globalDims497c = new Set<string>();
      for (const r of records as any[]) {
        for (const s of (r.relationshipShifts ?? []) as Array<{ dimension: string }>) {
          if (s.dimension) globalDims497c.add(s.dimension);
        }
      }
      if (globalDims497c.size >= 2) {
        let curDimRun497c = 0;
        let curDim497c: string | null = null;
        let maxDimRun497c = 0;
        let maxDimRunDim497c = '';
        for (const r of records as any[]) {
          const shifts = (r.relationshipShifts ?? []) as Array<{ dimension: string }>;
          if (shifts.length === 0) continue;
          const dims497c = new Set(shifts.map(s => s.dimension).filter(Boolean));
          if (dims497c.size === 1) {
            const dim = [...dims497c][0];
            if (dim === curDim497c) {
              curDimRun497c++;
            } else {
              curDimRun497c = 1;
              curDim497c = dim;
            }
            if (curDimRun497c > maxDimRun497c) {
              maxDimRun497c = curDimRun497c;
              maxDimRunDim497c = dim;
            }
          } else {
            curDimRun497c = 0;
            curDim497c = null;
          }
        }
        if (maxDimRun497c >= 4) {
          issues.push({
            location: `${maxDimRun497c} consecutive shift scene(s) all operating on the "${maxDimRunDim497c}" dimension`,
            rule: 'RELATIONSHIP_DIMENSION_RUN',
            severity: 'minor',
            description: `${maxDimRun497c} consecutive scenes that carry relationship shifts each operate exclusively on the "${maxDimRunDim497c}" dimension — the relational texture narrows to a single axis for a sustained stretch. Even though the story uses multiple relationship dimensions overall, this local burst collapses them all to one register: the audience experiences the same kind of bond change four or more times in a row, losing the multi-axis texture that makes relationships feel fully inhabited. The "${maxDimRunDim497c}" dimension is a legitimate site of dramatic conflict, but a run of this length signals that the story is testing one register at the expense of the others — trust vs. respect vs. intimacy vs. loyalty — and the relational world becomes temporarily one-dimensional.`,
            suggestedFix: `Break the dimension run by letting at least one of the consecutive shift scenes also carry a shift in a different dimension — a moment where the "${maxDimRunDim497c}" shift also has an implication for respect, intimacy, or loyalty. Two-dimension scenes add texture and signal that real relationships are never just one thing. Even a small secondary-dimension shift in the middle of the run restores the sense that the bonds are complex.`,
          });
        }
      }
    }
  }

  // ── Wave 511: RELATIONSHIP_SHIFT_DRAMATIC_TURN_AFTERMATH_VOID, RUPTURE_THIRDS_CLUSTER, RELATIONSHIP_PAYOFF_DECOUPLED ──

  // RELATIONSHIP_SHIFT_DRAMATIC_TURN_AFTERMATH_VOID (sequence/aftermath × dramatic-turn channel
  // × shift trigger, n≥8, ≥2 qualifying shift scenes not in last 2 positions, ≥2 turn scenes):
  // No relationship-shift scene is followed by a dramatic turn in the next two scenes while turns
  // exist elsewhere. Bond changes should have pivotal consequences: a fracture that redirects the
  // protagonist's path, a repair that closes off one direction and opens another. When every shift
  // is followed by turn silence, relationships move but never pivot the story — they register
  // emotionally but not structurally. Sequence/aftermath mode × dramatic-turn channel × shift
  // trigger. Distinct from RELATIONSHIP_DRAMATIC_TURN_DECOUPLED (Wave 357: no shift coincides
  // WITH a turn IN the same scene — co-occurrence, not aftermath), RELATIONSHIP_SHIFT_CLOCK_
  // AFTERMATH_VOID (Wave 497: clock channel), RELATIONSHIP_SHIFT_CURIOSITY_VOID (Wave 455:
  // curiosity channel), RELATIONSHIP_SHIFT_SUSPENSE_AFTERMATH_VOID (Wave 469: suspense channel),
  // RELATIONSHIP_SHIFT_EMOTIONAL_AFTERMATH_VOID (Wave 469: emotional channel), RELATIONSHIP_
  // SHIFT_REVELATION_AFTERMATH_VOID (Wave 483: revelation channel): seventh channel in the
  // shift-aftermath family.
  {
    const n511a = records.length;
    if (n511a >= 8) {
      const turnScenes511a = (records as any[]).filter(r =>
        (r.dramaticTurn ?? 'nothing') !== 'nothing' && r.dramaticTurn !== '',
      );
      const qualShiftScenes511a = (records as any[]).filter((r, pos) =>
        ((r.relationshipShifts ?? []) as any[]).length > 0 && pos < n511a - 2,
      );
      if (qualShiftScenes511a.length >= 2 && turnScenes511a.length >= 2) {
        const anyTurnAfterShift511a = qualShiftScenes511a.some((r: any) => {
          const pos511a = (records as any[]).indexOf(r);
          for (let off = 1; off <= 2; off++) {
            const nxt = (records as any[])[pos511a + off];
            if (nxt && (nxt.dramaticTurn ?? 'nothing') !== 'nothing' && nxt.dramaticTurn !== '') return true;
          }
          return false;
        });
        if (!anyTurnAfterShift511a) {
          issues.push({
            location: `All ${qualShiftScenes511a.length} qualifying shift scene(s) — no dramatic turn within 2 scenes`,
            rule: 'RELATIONSHIP_SHIFT_DRAMATIC_TURN_AFTERMATH_VOID',
            severity: 'minor',
            description: `None of the story's ${qualShiftScenes511a.length} relationship-shift scenes is followed by a dramatic turn in the next two scenes, even though ${turnScenes511a.length} dramatic turns exist elsewhere. Bond changes should have pivotal structural consequences: a fracture that redirects the protagonist's path, a repair that closes off one direction and opens another. When every relational shift is followed by turn silence, relationships move but never pivot the story — they register emotionally without causing the narrative direction to change. The link between relational change and story structure remains unwritten.`,
            suggestedFix: `Let at least one relationship shift be followed within two scenes by a dramatic turn — the bond change (fracture or repair) precipitates the decision or revelation that turns the story's direction. The turn doesn't need to be caused exclusively by the shift; it can be the moment when the protagonist, now relationally altered, makes the choice that changes everything. A shift that feeds a turn converts emotional consequence into structural consequence.`,
          });
        }
      }
    }
  }

  // RUPTURE_THIRDS_CLUSTER (distribution/timing × negative shift × thirds, n≥9, ≥4 rupture
  // scenes — any shift with amount ≤ -0.3 — >75% in one structural third): The story's major
  // ruptures concentrate in one structural third. Fractures work best when distributed: early
  // ruptures give the audience bonds to fear are permanent, mid-story ruptures escalate while
  // prior warmth is still in memory, and late ruptures make the climax feel genuinely dangerous.
  // When most ruptures cluster in one zone, the other two-thirds are relationally inert in the
  // negative register. Distribution/timing mode × negative-shift channel × thirds. Distinct from
  // RELATIONSHIP_WARMTH_CLUSTER (Wave 497: positive-shift sibling — this is the negative mirror),
  // RELATIONSHIP_SHIFT_THIRDS_CLUSTER (Wave 483: aggregates ALL shifts regardless of valence),
  // PAIR_RUPTURE_RUN (Wave 441: consecutive local run, not thirds zone-distribution).
  {
    const n511b = records.length;
    if (n511b >= 9) {
      const rupturePositions511b = (records as any[])
        .map((r, pos) => ({
          pos,
          isRupture: ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
        }))
        .filter(x => x.isRupture)
        .map(x => x.pos);
      if (rupturePositions511b.length >= 4) {
        const third511b = Math.floor(n511b / 3);
        const zone1511b = rupturePositions511b.filter(p => p < third511b).length;
        const zone2511b = rupturePositions511b.filter(p => p >= third511b && p < 2 * third511b).length;
        const zone3511b = rupturePositions511b.filter(p => p >= 2 * third511b).length;
        const maxZ511b = Math.max(zone1511b, zone2511b, zone3511b);
        if (maxZ511b / rupturePositions511b.length > 0.75) {
          const zLabel511b = zone1511b === maxZ511b ? 'opening' : zone2511b === maxZ511b ? 'middle' : 'closing';
          issues.push({
            location: `${maxZ511b}/${rupturePositions511b.length} rupture scene(s) clustered in the ${zLabel511b} third`,
            rule: 'RUPTURE_THIRDS_CLUSTER',
            severity: 'minor',
            description: `${maxZ511b} of ${rupturePositions511b.length} major rupture scenes (${(maxZ511b / rupturePositions511b.length * 100).toFixed(0)}%) fall within the ${zLabel511b} third — the story's fractures are architecturally zone-ghettoized. Ruptures work best when distributed across the story: early fractures give the audience bonds to fear are permanent, mid-story breaks escalate while prior warmth is still in memory, and late ruptures make the climax feel genuinely dangerous rather than inevitable. When most fractures cluster in one zone, the other zones are relationally inert in the negative register — either the story breaks bonds before it has established them (opening cluster), or it breaks them all at once in the middle losing cumulative force, or it saves all its damage for the end where it arrives without prior fracture history.`,
            suggestedFix: `Redistribute at least one or two ruptures into the zones currently without fractures. An early rupture gives the audience something to mourn and track; a mid-story rupture escalates amid the residue of earlier warmth; a late rupture lands inside a relationship the audience has watched both fracture and repair — making the final break (or final repair) dramatically meaningful rather than just the sum of one zone's damage.`,
          });
        }
      }
    }
  }

  // RELATIONSHIP_PAYOFF_DECOUPLED (co-occurrence/decoupling × payoff × relationship shift, n≥8,
  // ≥3 shift scenes and ≥3 payoff scenes): Relationship-shift scenes and payoff scenes never
  // coincide — bonds never move at the moment a setup is resolved. The most resonant payoffs
  // happen inside relational motion: a resolution that also cracks or repairs a bond earns
  // double force — both the informational closure of the thread and the interpersonal cost or
  // gain of the bond shift land simultaneously. When every payoff lands in a relationally static
  // scene and every shift scene carries no payoff, both channels lose their fullest potential.
  // Co-occurrence/decoupling mode × payoff × relationship shift. First check in relationship-arc.ts
  // to use the payoff signal. Distinct from all existing co-occurrence checks which pair shift with
  // turn/clock/curiosity/revelation/suspense — this adds the payoff channel.
  {
    const n511c = records.length;
    if (n511c >= 8) {
      const shiftScenes511c = (records as any[]).filter(r =>
        ((r.relationshipShifts ?? []) as any[]).length > 0,
      );
      const payoffScenes511c = (records as any[]).filter(r =>
        ((r.payoffSetupIds ?? []) as string[]).length > 0,
      );
      if (shiftScenes511c.length >= 3 && payoffScenes511c.length >= 3) {
        const shiftIdxSet511c = new Set(shiftScenes511c.map((r: any) => (records as any[]).indexOf(r)));
        const payoffIdxSet511c = new Set(payoffScenes511c.map((r: any) => (records as any[]).indexOf(r)));
        const hasOverlap511c = [...shiftIdxSet511c].some(idx => payoffIdxSet511c.has(idx));
        if (!hasOverlap511c) {
          issues.push({
            location: `${shiftScenes511c.length} shift scene(s) and ${payoffScenes511c.length} payoff scene(s) — no overlap`,
            rule: 'RELATIONSHIP_PAYOFF_DECOUPLED',
            severity: 'minor',
            description: `The script's ${shiftScenes511c.length} relationship-shift scenes and ${payoffScenes511c.length} payoff scenes never coincide — bonds never move at the moment a setup is resolved. A payoff that also shifts a relationship earns double force: the closure of the thread and the interpersonal cost or reward of the bond change land simultaneously, each amplifying the other. When every payoff lands in a relationally static scene and every shift scene carries no payoff, both channels are weaker than they could be — resolutions feel informationally complete but emotionally unmoored, and bond shifts feel emotionally present but causally thin.`,
            suggestedFix: `Arrange at least one payoff to coincide with a relationship shift — the resolved setup should also crack or repair a bond at the same moment. The payoff need not be about the relationship directly; a thread resolution that the two characters witness together can move their dynamic at the same time as it closes the informational loop. A payoff that also shifts a relationship is the story telling two things at once, and the audience receives both with compounded resonance.`,
          });
        }
      }
    }
  }

  // ── Wave 525 checks ──────────────────────────────────────────────────────
  {
    // RELATIONSHIP_SHIFT_SEED_AFTERMATH_VOID — sequence/aftermath × seed × shift trigger.
    // n≥8, ≥3 qualifying shift scenes (any shift, not in last 2 positions), ≥2 seed scenes.
    // Every shift scene is followed by 2 scenes with no seededClueIds → fire. Bond-moving
    // never activates foreshadowing in its aftermath: the moment a relationship moves, the
    // scenes that follow contain no planted threads. Relational events should generate
    // narrative consequence across multiple channels; when they only ever shift and never
    // seed, the relational layer and the foreshadowing layer are causally disconnected.
    // Distinct from: RELATIONSHIP_SHIFT_AFTERMATH_VOID (Wave 427: no shift in aftermath —
    // a different channel entirely), RELATIONSHIP_SHIFT_CLOCK_AFTERMATH_VOID / SUSPENSE /
    // EMOTIONAL / REVELATION / DRAMATIC_TURN (different aftermath channels). Adds seed to
    // shift-aftermath family. Distinct from RELATIONSHIP_PAYOFF_DECOUPLED (same-scene co-occur).
    const n525a = records.length;
    if (n525a >= 8) {
      const qualShifts525a = (records as any[]).filter((r, pos) =>
        ((r.relationshipShifts ?? []) as any[]).length > 0 && pos < n525a - 2,
      );
      const seedScenes525a = (records as any[]).filter(r =>
        ((r.seededClueIds ?? []) as string[]).length > 0,
      );
      if (qualShifts525a.length >= 3 && seedScenes525a.length >= 2) {
        const allShiftNoSeedAftermath525a = qualShifts525a.every((r: any) => {
          const pos = (records as any[]).indexOf(r);
          for (let off = 1; off <= 2; off++) {
            const nxt = (records as any[])[pos + off];
            if (nxt && ((nxt.seededClueIds ?? []) as string[]).length > 0) return false;
          }
          return true;
        });
        if (allShiftNoSeedAftermath525a) {
          issues.push({
            location: `${qualShifts525a.length} shift scene(s) — no seed in any aftermath window`,
            rule: 'RELATIONSHIP_SHIFT_SEED_AFTERMATH_VOID',
            severity: 'minor',
            description: `Every relationship-shift scene (${qualShifts525a.length} scene(s)) is followed by two scenes in which no clue is planted, despite ${seedScenes525a.length} seed scene(s) existing elsewhere. When a bond moves — warming, fracturing, or oscillating — the scenes that follow are the natural place to plant a thread about what the change means: a hint about the pair's future, a detail that becomes significant in light of the new dynamic, or a foreshadowing of what will happen if the bond continues on its current trajectory. When every shift's aftermath is seed-free, the relational layer and the foreshadowing layer operate on separate tracks — bonds change but those changes generate no forward threads for the audience to carry.`,
            suggestedFix: `After at least one relationship-shift scene, plant a seed in the following scene: a detail, contradiction, or planted object that the fresh bond movement makes narratively relevant. The seed doesn't need to be about the specific pair; a shift can plant a clue about a third character whose relationship with both parties is now in question, or about a circumstance that the changed dynamic makes newly possible.`,
          });
        }
      }
    }
  }

  {
    // RELATIONSHIP_SHIFT_PAYOFF_AFTERMATH_VOID — sequence/aftermath × payoff × shift trigger.
    // n≥8, ≥3 qualifying shift scenes (not in last 2 positions), ≥2 payoff scenes.
    // Every shift scene is followed by 2 scenes with no payoffSetupIds → fire. Bond-moving
    // never triggers thread resolution in its aftermath: the moment a relationship moves, no
    // planted promise is delivered in the following two scenes. A bond change and a payoff
    // coinciding in the aftermath creates maximum resonance — the delivery lands inside a fresh
    // relational context that makes it more significant.
    // Distinct from: RELATIONSHIP_PAYOFF_DECOUPLED (Wave 511: same-scene co-occurrence — shift
    // and payoff never in the SAME scene; this checks the aftermath of the shift scene).
    // RELATIONSHIP_SHIFT_SEED_AFTERMATH_VOID (above: seed channel not payoff). Adds payoff to
    // the shift-aftermath family alongside seed/suspense/emotional/revelation/clock/dramatic-turn.
    const n525b = records.length;
    if (n525b >= 8) {
      const qualShifts525b = (records as any[]).filter((r, pos) =>
        ((r.relationshipShifts ?? []) as any[]).length > 0 && pos < n525b - 2,
      );
      const payoffScenes525b = (records as any[]).filter(r =>
        ((r.payoffSetupIds ?? []) as string[]).length > 0,
      );
      if (qualShifts525b.length >= 3 && payoffScenes525b.length >= 2) {
        const allShiftNoPayoffAftermath525b = qualShifts525b.every((r: any) => {
          const pos = (records as any[]).indexOf(r);
          for (let off = 1; off <= 2; off++) {
            const nxt = (records as any[])[pos + off];
            if (nxt && ((nxt.payoffSetupIds ?? []) as string[]).length > 0) return false;
          }
          return true;
        });
        if (allShiftNoPayoffAftermath525b) {
          issues.push({
            location: `${qualShifts525b.length} shift scene(s) — no payoff in any aftermath window`,
            rule: 'RELATIONSHIP_SHIFT_PAYOFF_AFTERMATH_VOID',
            severity: 'minor',
            description: `Every relationship-shift scene (${qualShifts525b.length} scene(s)) is followed by two scenes in which no planted promise is resolved, despite ${payoffScenes525b.length} payoff scene(s) existing elsewhere. A payoff that lands in the aftermath of a relationship shift earns compounded resonance: the delivery arrives inside a fresh interpersonal context where it means something different than it would in a relationally static scene. When every shift's aftermath contains no payoff delivery, the two most structurally valuable beat types operate on completely separate tracks — bonds change and promises are kept, but never together.`,
            suggestedFix: `After at least one relationship-shift scene, deliver a payoff in the following scene — a planted promise whose resolution makes new sense in light of the bond change that just happened. The payoff need not be about the specific pair; an earlier threat materializing, a contingency paying off, or a foreshadowed consequence arriving in the wake of the relational shift gives the delivery a second layer of meaning tied to the new dynamic.`,
          });
        }
      }
    }
  }

  {
    // RELATIONSHIP_SEED_DECOUPLED — co-occurrence × seed × shift.
    // n≥8, ≥3 shift scenes, ≥3 seed scenes. No scene has both a relationship shift and a
    // seededClueId → fire. Bond-moving and foreshadowing never coincide: the most dramatically
    // charged scenes (those where a relationship moves) are always foreshadowing-free. The
    // highest-impact planting happens in emotionally charged contexts, and bond movement is
    // exactly that — but when the two channels are always separate, each operates at a fraction
    // of its potential force.
    // Distinct from: RELATIONSHIP_PAYOFF_DECOUPLED (Wave 511: payoff × shift), RELATIONSHIP_
    // CURIOSITY_DECOUPLED (curiosity × shift), RELATIONSHIP_CLOCK_DECOUPLED (clock × shift),
    // RELATIONSHIP_DRAMATIC_TURN_DECOUPLED (turn × shift), and all aftermath checks. First
    // check in this pass pairing seed channel with relationship shift in co-occurrence mode.
    const n525c = records.length;
    if (n525c >= 8) {
      const shiftScenes525c = (records as any[]).filter(r =>
        ((r.relationshipShifts ?? []) as any[]).length > 0,
      );
      const seedScenes525c = (records as any[]).filter(r =>
        ((r.seededClueIds ?? []) as string[]).length > 0,
      );
      if (shiftScenes525c.length >= 3 && seedScenes525c.length >= 3) {
        const seedIdxSet525c = new Set(seedScenes525c.map((r: any) => (records as any[]).indexOf(r)));
        const hasOverlap525c = shiftScenes525c.some((r: any) =>
          seedIdxSet525c.has((records as any[]).indexOf(r)),
        );
        if (!hasOverlap525c) {
          issues.push({
            location: `${shiftScenes525c.length} shift scene(s) and ${seedScenes525c.length} seed scene(s) — no overlap`,
            rule: 'RELATIONSHIP_SEED_DECOUPLED',
            severity: 'minor',
            description: `The script's ${shiftScenes525c.length} relationship-shift scenes and ${seedScenes525c.length} clue-planting scenes never coincide — bond-moving and foreshadowing are fully decoupled. The highest-impact planting locations are scenes with emotional charge, and a relationship shift is exactly that: the moment a bond moves, the audience is maximally invested in what is happening between these characters and what it might mean. Planting a clue in that context is a double investment — the audience receives both the interpersonal event and the foreshadowing of what it implies. When the two channels are always in separate scenes, each operates at half its potential.`,
            suggestedFix: `Let at least one relationship-shift scene also contain a seeded clue: a detail planted in the scene where a bond moves, a contingency prepared at the moment of fracture or repair, or a foreshadowing element that becomes significant in light of the changed dynamic. The seed in the shift scene tells the audience to carry something forward from the moment when they are already most emotionally primed.`,
          });
        }
      }
    }
  }

  // ── Wave 539: PAIR_SEED_FLAT, PAIR_PAYOFF_FLAT, PAIR_SHIFT_RUN ──

  // PAIR_SEED_FLAT (co-occurrence × seed × per-pair, n≥8, ≥1 pair with ≥3 shifts, ≥3 seed scenes):
  // At least one pair accumulates 3+ shifts but not one of them lands in a clue-planting scene,
  // even though the story plants seeds elsewhere. This bond's movements never coincide with
  // foreshadowing — the most emotionally charged planting contexts (those where a bond moves) are
  // always seed-free for this pair, so the audience never receives both a relational event and a
  // planted clue in the same beat. Per-pair complement of RELATIONSHIP_SEED_DECOUPLED (Wave 525),
  // which fires when NO shift from ANY pair overlaps a seed — this fires when ONE pair's shifts
  // are all seed-decoupled even though another pair's shift may coincide with a seed. Distinct from
  // PAIR_CLOCK_FLAT (clock), PAIR_REVELATION_FLAT (revelation), PAIR_DRAMATIC_TURN_FLAT (turn).
  if (records.length >= 8) {
    const seedIdxSet539a = new Set<number>(
      (records as any[]).filter(r => ((r.seededClueIds ?? []) as string[]).length > 0).map(r => r.sceneIdx),
    );
    if (seedIdxSet539a.size >= 3) {
      const flatSeedPairs539a: string[] = [];
      for (const [pairKey539a, stats539a] of pairStats) {
        if (stats539a.shifts.length >= 3 &&
            stats539a.shifts.every(s => !seedIdxSet539a.has(s.sceneIdx))) {
          flatSeedPairs539a.push(pairKey539a);
        }
      }
      if (flatSeedPairs539a.length > 0) {
        issues.push({
          location: `Pair(s) ${flatSeedPairs539a.join(', ')} — seed-decoupled shifts`,
          rule: 'PAIR_SEED_FLAT',
          severity: 'minor',
          description: `${flatSeedPairs539a.length === 1 ? 'One pair' : `${flatSeedPairs539a.length} pairs`} (${flatSeedPairs539a.join('; ')}) move${flatSeedPairs539a.length === 1 ? 's' : ''} 3 or more times, yet not one of those shifts lands in a clue-planting scene, even though the story plants seeds elsewhere. This bond's movements never coincide with foreshadowing — the scenes where this relationship changes are always seed-free, so the audience never receives both a relational event and a planted clue in the same beat. The most emotionally charged planting contexts are precisely those where bonds move; when foreshadowing and bond change are always decoupled for a specific pair, each operates at a fraction of its potential compound impact.`,
          suggestedFix: `Let at least one of this pair's shift scenes also plant a clue — a detail seeded at the moment of fracture or repair that will become significant later. The planted seed in the context of a bond change is doubly loaded: the audience carries the foreshadowed element forward from the moment they are already most invested in this relationship.`,
        });
      }
    }
  }

  // PAIR_PAYOFF_FLAT (co-occurrence × payoff × per-pair, n≥8, ≥1 pair with ≥3 shifts, ≥3 payoff
  // scenes): At least one pair accumulates 3+ shifts but not one of them lands in a scene that
  // resolves a planted promise, even though payoffs exist elsewhere. This bond never moves at the
  // moment of delivery — thread resolutions and this pair's relational changes are always in
  // separate scenes, so the audience never experiences the compound beat where a delivered promise
  // also reshapes a specific bond. Per-pair complement of RELATIONSHIP_PAYOFF_DECOUPLED (Wave 511),
  // which fires when NO shift from ANY pair overlaps a payoff — this fires when ONE pair is
  // payoff-decoupled even though another pair's shift may coincide with a payoff. Distinct from
  // PAIR_SEED_FLAT (seed channel) and all other per-pair channel-flat checks.
  if (records.length >= 8) {
    const payoffIdxSet539b = new Set<number>(
      (records as any[]).filter(r => ((r.payoffSetupIds ?? []) as string[]).length > 0).map(r => r.sceneIdx),
    );
    if (payoffIdxSet539b.size >= 3) {
      const flatPayoffPairs539b: string[] = [];
      for (const [pairKey539b, stats539b] of pairStats) {
        if (stats539b.shifts.length >= 3 &&
            stats539b.shifts.every(s => !payoffIdxSet539b.has(s.sceneIdx))) {
          flatPayoffPairs539b.push(pairKey539b);
        }
      }
      if (flatPayoffPairs539b.length > 0) {
        issues.push({
          location: `Pair(s) ${flatPayoffPairs539b.join(', ')} — payoff-decoupled shifts`,
          rule: 'PAIR_PAYOFF_FLAT',
          severity: 'minor',
          description: `${flatPayoffPairs539b.length === 1 ? 'One pair' : `${flatPayoffPairs539b.length} pairs`} (${flatPayoffPairs539b.join('; ')}) move${flatPayoffPairs539b.length === 1 ? 's' : ''} 3 or more times, yet not one of those shifts coincides with a payoff scene, even though the story delivers planted promises elsewhere. This bond never moves at the moment a thread is resolved — the pair's relational changes and the story's deliveries are always in separate scenes, missing the compound beat where a resolution both closes a narrative thread and reshapes an interpersonal dynamic simultaneously. A payoff that lands alongside a relationship shift earns double resonance: the thread closes inside a freshly changed interpersonal context, giving the delivery emotional weight that pure informational closure cannot provide.`,
          suggestedFix: `Let at least one of this pair's shift scenes also deliver a payoff — let a planted promise resolve in the moment the bond between these two characters moves. The coincidence of delivery and relational change is one of the most powerful compound beats available: the audience receives closure and interpersonal consequence in the same instant.`,
        });
      }
    }
  }

  // PAIR_SHIFT_RUN (run-based × single-pair monopoly, n≥8, ≥2 pairs with ≥2 shifts each): A run
  // of ≥4 consecutive shift scenes all involve shifts from only one pair while ≥2 pairs with ≥2
  // shifts exist globally. One pair monopolizes a sustained stretch of relational activity —
  // every bond change in that run belongs to the same relationship, leaving all other pairs
  // relationally frozen for the duration. Even a story with a clear "main pair" benefits from
  // secondary bonds providing texture within the primary pair's most active stretches; when
  // other pairs are completely absent from a 4+-scene relational run, the world feels like it
  // contracts to a single relationship rather than a populated ensemble.
  // Distinct from: RELATIONSHIP_DIMENSION_RUN (Wave 497 — dimension monopoly, not pair monopoly),
  // PAIR_RUPTURE_RUN (Wave 441 — consecutive negative shifts, any pair), RELATIONSHIP_WARMTH_RUN
  // (Wave 455 — consecutive positive shifts, any pair), DEPTH_GAP (amplitude concentration across
  // the whole story, not a local consecutive-scene run).
  {
    const n539c = records.length;
    if (n539c >= 8) {
      const multiPairs539c = [...pairStats.entries()].filter(([, s]) => s.shifts.length >= 2);
      if (multiPairs539c.length >= 2) {
        let curPairRun539c = 0;
        let curPairKey539c: string | null = null;
        let maxPairRun539c = 0;
        let maxPairRunKey539c = '';
        for (const r of records as any[]) {
          const shifts = (r.relationshipShifts ?? []) as Array<{ pairKey: string }>;
          if (shifts.length === 0) continue;
          const pairs539c = new Set(shifts.map(s => s.pairKey).filter(Boolean));
          if (pairs539c.size === 1) {
            const pk = [...pairs539c][0];
            if (pk === curPairKey539c) {
              curPairRun539c++;
            } else {
              curPairRun539c = 1;
              curPairKey539c = pk;
            }
            if (curPairRun539c > maxPairRun539c) {
              maxPairRun539c = curPairRun539c;
              maxPairRunKey539c = pk;
            }
          } else {
            curPairRun539c = 0;
            curPairKey539c = null;
          }
        }
        if (maxPairRun539c >= 4) {
          issues.push({
            location: `${maxPairRun539c} consecutive shift scene(s) all from pair ${maxPairRunKey539c}`,
            rule: 'PAIR_SHIFT_RUN',
            severity: 'minor',
            description: `${maxPairRun539c} consecutive scenes that carry relationship shifts all involve only the ${maxPairRunKey539c} pair, even though other pairs are active elsewhere in the story. One relationship monopolizes a sustained relational stretch — every bond change in that run belongs to this single pair, leaving all other relationships frozen for the duration. Even in a story with a dominant primary pair, secondary bonds providing texture within the main pair's most active stretches signal that the world is populated rather than contracted. A 4+-scene single-pair run makes the story feel temporarily like a two-hander with the rest of the cast as backdrop.`,
            suggestedFix: `Insert at least one shift from a different pair within the ${maxPairRun539c}-scene run — a secondary bond reacting to the same events that are moving the primary pair, or an independent relational development happening in parallel. The secondary shift need not be large; even a single small shift from another pair breaks the monopoly and restores the sense that the story's relational world is an ensemble rather than a spotlight.`,
          });
        }
      }
    }
  }

  {
    // RELATIONSHIP_EMOTION_DECOUPLED — average/aggregate × emotion × global-shift trigger.
    // n≥8, ≥4 shift scenes total. >70% of shift scenes have neutral emotionalShift → fire.
    // Bond changes should register as felt events; when the majority of shift scenes carry no
    // emotional charge, the relational engine operates in an affective vacuum — the story
    // charts relationship dynamics on paper but does not convey them in the body of the scene.
    // Distinct from: WARMTH_UNFELT (Wave 304: positive-shift × neutral emotion only — a subset),
    // RELATIONSHIP_RUPTURE_EMOTION_FLAT (Wave 343: negative-shift × neutral emotion only — a
    // subset), PAIR_EMOTION_FLAT (Wave 385: per-pair level — fires when ONE pair's shifts are
    // all in neutral scenes), RELATIONSHIP_CURIOSITY_DECOUPLED / RELATIONSHIP_SUSPENSE_DECOUPLED
    // (Wave 318/329: different channels; this fills the emotion channel in the same family).
    const n553a = records.length;
    if (n553a >= 8) {
      const shiftScenes553a = (records as any[]).filter(r =>
        ((r.relationshipShifts ?? []) as any[]).length > 0,
      );
      if (shiftScenes553a.length >= 4) {
        const neutral553a = shiftScenes553a.filter(
          (r: any) => r.emotionalShift === 'neutral' || r.emotionalShift == null,
        ).length;
        if (neutral553a / shiftScenes553a.length > 0.7) {
          issues.push({
            location: `${neutral553a} of ${shiftScenes553a.length} relationship-shift scene(s) — emotionally neutral`,
            rule: 'RELATIONSHIP_EMOTION_DECOUPLED',
            severity: 'minor',
            description: `More than 70% of scenes in which a relationship shifts (${neutral553a} of ${shiftScenes553a.length}) carry a neutral emotional tone. Bond changes should register as felt events — moments where the audience experiences the warmth of a deepening connection or the sting of a rupture alongside the characters who are living it. When the majority of shift scenes are emotionally inert, the relational engine operates in an affective vacuum: the story correctly tracks who grew closer to whom and who pulled apart, but the audience never feels those changes in the room. Bonds move on paper but not in the body, and the cumulative effect is a relationship architecture that feels more like logistics than drama.`,
            suggestedFix: `Introduce a non-neutral emotional charge into at least 30% of shift scenes — when a bond deepens, texture the scene with warmth, relief, or joy; when a bond fractures, let grief, shame, or anger color the scene alongside the relational fact. Even a minor emotional tone shift within a shift scene confirms that the bond change mattered to the people involved, preventing the relational arc from feeling like stage-management rather than lived experience.`,
          });
        }
      }
    }
  }

  {
    // PAIR_DIMENSION_MONOPOLY — underweight/bloat × dimension × per-pair.
    // n≥8, ≥2 distinct dimensions exist globally (in netByDimension across all pairs),
    // ≥1 pair with ≥4 shifts whose netByDimension has exactly 1 entry → fire. A relationship
    // that evolves exclusively along one axis lacks the depth needed to feel complex; real bonds
    // shift in multiple registers simultaneously — trust and closeness compound, loyalty and
    // power redistribute together.
    // Distinct from: SHIFT_DIMENSION_CONCENTRATION (Wave 290: ALL shifts globally share one
    // dimension — fires even when no single pair has 4+ shifts; this fires per-pair), DIMENSION_
    // ONE_WAY (Wave 304: a dimension always shifts in one direction globally — directional
    // uniformity vs. breadth of dimensions used per pair), SHIFT_DIMENSION_RUN (Wave 497:
    // ≥4 consecutive shift scenes all same dimension — a local temporal run vs. per-pair total).
    const n553b = records.length;
    if (n553b >= 8) {
      const globalDims553b = new Set<string>();
      for (const s of pairStats.values()) {
        for (const d of s.netByDimension.keys()) globalDims553b.add(d);
      }
      if (globalDims553b.size >= 2) {
        const monopolyPairs553b: string[] = [];
        for (const [pk553b, stats553b] of pairStats) {
          if (stats553b.shifts.length >= 4 && stats553b.netByDimension.size === 1) {
            monopolyPairs553b.push(pk553b);
          }
        }
        if (monopolyPairs553b.length > 0) {
          issues.push({
            location: `Pair(s) ${monopolyPairs553b.join(', ')} — single-dimension evolution`,
            rule: 'PAIR_DIMENSION_MONOPOLY',
            severity: 'minor',
            description: `${monopolyPairs553b.length === 1 ? 'One pair' : `${monopolyPairs553b.length} pairs`} (${monopolyPairs553b.join('; ')}) accumulate${monopolyPairs553b.length === 1 ? 's' : ''} 4 or more relationship shifts, yet every shift uses the same relationship dimension — the bond between these characters evolves exclusively along one axis. Real relationships shift in multiple registers simultaneously: a deepening of trust may also redistribute power; a rupture of closeness may raise simultaneous questions of loyalty. When one bond moves in a single dimension over 4+ scenes, that relationship's complexity is structurally constrained, and the audience experiences it as a single-track arc rather than a fully inhabited bond — they come to expect the next shift to be about the same thing the previous ones were about.`,
            suggestedFix: `Introduce at least one shift for this pair using a different relationship dimension — let a bond change surface across a second axis. If trust has been the sole dimension, show a shift in closeness, power, or loyalty that compounds the trust movement; if closeness has dominated, register a trust or loyalty change that adds a second register to the relationship's evolution. The multi-dimensional beat gives the bond texture and confirms that these characters are complex enough that their connection ramifies across more than one aspect of how they relate.`,
          });
        }
      }
    }
  }

  {
    // PAIR_THIRDS_CONCENTRATED — distribution/timing × thirds × per-pair.
    // n≥9, ≥1 pair with ≥4 shifts where >75% of those shifts fall in one structural third → fire.
    // When a specific pair does all its relational work in one narrow act-segment, that bond is
    // architecturally compressed: it drives the story intensely within one zone and then goes
    // relationally dormant in the other two-thirds, producing an imbalanced arc for that
    // relationship specifically (not the aggregate of all pairs).
    // Distinct from: RELATIONSHIP_SHIFT_THIRDS_CLUSTER (Wave 483: aggregate of ALL shifts across
    // all pairs in one third — fires on global concentration even if no single pair is concentrated),
    // RELATIONSHIP_WARMTH_CLUSTER / RUPTURE_THIRDS_CLUSTER (Wave 497/511: positive/negative-valence
    // global thirds), PAIR_SECOND_HALF_VOID / PAIR_FIRST_HALF_VOID (Wave 371/357: half-based zones,
    // not thirds), PAIR_MIDPOINT_VOID (Wave 385: per-pair × 40–60% midpoint void, not thirds-cluster).
    const n553c = records.length;
    if (n553c >= 9) {
      const posMap553c = new Map<number, number>();
      (records as any[]).forEach((r, pos) => posMap553c.set(r.sceneIdx, pos));
      const third553c = Math.floor(n553c / 3);
      const conPairs553c: Array<{ pk: string; zone: string; pct: number }> = [];
      for (const [pk553c, stats553c] of pairStats) {
        if (stats553c.shifts.length >= 4) {
          const positions553c = stats553c.shifts.map(s => posMap553c.get(s.sceneIdx) ?? s.sceneIdx);
          const z1 = positions553c.filter(p => p < third553c).length;
          const z2 = positions553c.filter(p => p >= third553c && p < 2 * third553c).length;
          const z3 = positions553c.filter(p => p >= 2 * third553c).length;
          const maxZ = Math.max(z1, z2, z3);
          if (maxZ / stats553c.shifts.length > 0.75) {
            const zone553c = z1 === maxZ ? 'opening' : z2 === maxZ ? 'middle' : 'closing';
            conPairs553c.push({ pk: pk553c, zone: zone553c, pct: Math.round(maxZ / stats553c.shifts.length * 100) });
          }
        }
      }
      if (conPairs553c.length > 0) {
        const desc553c = conPairs553c.map(x => `${x.pk} (${x.pct}% in ${x.zone} third)`).join('; ');
        issues.push({
          location: `Pair(s) ${desc553c}`,
          rule: 'PAIR_THIRDS_CONCENTRATED',
          severity: 'minor',
          description: `${conPairs553c.length === 1 ? 'One pair has' : `${conPairs553c.length} pairs have`} more than 75% of ${conPairs553c.length === 1 ? 'its' : 'their'} relationship shifts concentrated in a single structural third (${desc553c}). A bond that does all its relational work in one narrow act-segment is architecturally compressed: it drives the story intensely within one zone and then goes relationally dormant in the remaining two-thirds. The audience invests in this specific relationship during its active period, then watches it freeze — a structural imbalance that weakens the arc of that bond independently of whether the overall shift landscape is distributed. A credible relationship arc needs establishing moments, complicating moments, and transformative moments spread across the story's structure.`,
          suggestedFix: `Spread at least one shift for this pair into each of the currently underrepresented thirds — even a minor shift (a cooler exchange, a quiet warming) in the dormant zones confirms that the relationship is still alive and evolving outside its dominant period. If the pair is compressed into the opening third, add a complication mid-story and a resolution or transformation in the final third; if it is compressed into the closing third, seed an earlier establishing shift and a mid-story complication that gives the late-story movement something to build on.`,
        });
      }
    }
  }

  // ── Wave 567: RELATIONSHIP_PEAK_REVELATION_ABSENT, RELATIONSHIP_PEAK_DRAMATIC_TURN_ABSENT,
  //              RELATIONSHIP_PEAK_CLOCK_ABSENT ──────────────────────────────────────────────────
  // The single-peak family (anchored on the story's largest-magnitude relationship shift) covers
  // the emotion (Wave 385), curiosity (Wave 357), and suspense (Wave 371) channels but never the
  // revelation, dramatic-turn, or clock channels. This wave fills those three cells: it asks whether
  // the story's BIGGEST bond change coincides with a disclosure, a pivot, and time pressure — the
  // three channels that would give the peak relational moment maximum narrative force.
  {
    const n567 = records.length;
    if (n567 >= 8) {
      // Identify the single largest-magnitude relationship shift (the peak relational moment).
      // Strict ">" means the first scene achieving the max is the peak, mirroring Wave 385.
      let peakMag567 = 0;
      let peakScene567 = -1;
      const shiftScenes567: any[] = [];
      for (const r of records as any[]) {
        const shifts = (r.relationshipShifts ?? []) as Array<{ amount: number }>;
        if (shifts.length > 0) shiftScenes567.push(r);
        for (const sh of shifts) {
          if (Math.abs(sh.amount) > peakMag567) { peakMag567 = Math.abs(sh.amount); peakScene567 = r.sceneIdx; }
        }
      }
      const peakRec567 = peakScene567 >= 0
        ? (records as any[]).find(r => r.sceneIdx === peakScene567)
        : null;

      // Channel predicates.
      const hasRevelation567 = (r: any): boolean =>
        r.revelation !== null && r.revelation !== undefined && r.revelation !== '';
      const hasTurn567 = (r: any): boolean =>
        (r.dramaticTurn ?? 'nothing') !== 'nothing' && r.dramaticTurn !== '';
      const hasClock567 = (r: any): boolean => r.clockRaised === true;

      // RELATIONSHIP_PEAK_REVELATION_ABSENT — single-peak isolation × revelation × relationship.
      // The story's largest bond change carries no revelation, even though ≥2 OTHER shift scenes do
      // coincide with a disclosure. The biggest relational turning point is not a moment of truth —
      // the bond moves most at a beat where nothing is learned, so the peak relational swing and the
      // peak epistemic event never fuse. When bonds elsewhere shift alongside revelations but the
      // single most consequential shift does not, the story's most important relational moment lands
      // as a change without a discovered reason behind it.
      // Distinct from: RELATIONSHIP_REVELATION_SILENT (aggregate co-occurrence — fires when NO shift
      // scene carries a revelation; this fires even when MOST shifts coincide with revelations but
      // the single peak does not), RELATIONSHIP_REVELATION_EMOTION_DECOUPLED (audits the emotion of
      // revelation+shift scenes, not the peak), RELATIONSHIP_PEAK_EMOTION_FLAT (peak shift × emotion
      // channel — same anchor, different channel). First revelation entry in the peak family.
      if (peakRec567 && !hasRevelation567(peakRec567)) {
        const revShiftOther567 = shiftScenes567.filter(
          r => r.sceneIdx !== peakScene567 && hasRevelation567(r),
        );
        if (revShiftOther567.length >= 2) {
          issues.push({
            location: `Scene ${peakScene567} — largest relationship shift (|${peakMag567.toFixed(2)}|), no revelation`,
            rule: 'RELATIONSHIP_PEAK_REVELATION_ABSENT',
            severity: 'minor',
            description: `The story's largest relationship shift (Scene ${peakScene567}, magnitude ${peakMag567.toFixed(2)}) carries no revelation, even though ${revShiftOther567.length} other shift scenes move a bond alongside a disclosure. The single most consequential relational turning point is not a moment of truth: the bond moves most at a beat where nothing is learned, so the peak relational swing and the peak epistemic event never coincide. When other bond changes are powered by discoveries but the biggest one is not, the story's most important relational moment reads as a change without a discovered cause — a swing the audience registers but is given no new knowledge to anchor.`,
            suggestedFix: 'Tie the peak relationship shift to a revelation: let the moment the bond moves most also be the moment a crucial truth surfaces — a betrayal exposed, an identity confirmed, a hidden motive revealed. The biggest relational swing earns its weight when it is driven by a discovery, so the audience both feels the bond change and understands the truth that forced it.',
          });
        }
      }

      // RELATIONSHIP_PEAK_DRAMATIC_TURN_ABSENT — single-peak isolation × dramatic turn × relationship.
      // The story's largest bond change carries no dramatic turn, even though ≥2 OTHER shift scenes
      // coincide with a pivot. The biggest relational swing is not a story turning point — the bond
      // moves most at a beat the story does not register as a reversal or recognition, so the peak
      // relational moment and the peak structural pivot never align. When bonds elsewhere shift on
      // story turns but the single most consequential shift does not, the relationship's defining
      // moment is structurally inert: it changes the bond without redirecting the narrative.
      // Distinct from: RELATIONSHIP_DRAMATIC_TURN_DECOUPLED (Wave 357: aggregate co-occurrence —
      // fires when NO shift scene carries a turn; this fires when MOST do but the peak does not),
      // RELATIONSHIP_SHIFT_DRAMATIC_TURN_AFTERMATH_VOID (Wave 511: aftermath mode — what follows a
      // shift), RELATIONSHIP_PEAK_REVELATION_ABSENT (Wave 567 sibling: revelation channel). First
      // dramatic-turn entry in the peak family.
      if (peakRec567 && !hasTurn567(peakRec567)) {
        const turnShiftOther567 = shiftScenes567.filter(
          r => r.sceneIdx !== peakScene567 && hasTurn567(r),
        );
        if (turnShiftOther567.length >= 2) {
          issues.push({
            location: `Scene ${peakScene567} — largest relationship shift (|${peakMag567.toFixed(2)}|), no dramatic turn`,
            rule: 'RELATIONSHIP_PEAK_DRAMATIC_TURN_ABSENT',
            severity: 'minor',
            description: `The story's largest relationship shift (Scene ${peakScene567}, magnitude ${peakMag567.toFixed(2)}) carries no dramatic turn, even though ${turnShiftOther567.length} other shift scenes move a bond inside a story pivot. The single most consequential relational swing is not a turning point in the narrative: the bond moves most at a beat the story does not register as a reversal or recognition, so the peak relational moment and the peak structural pivot never align. When other bond changes ride story turns but the biggest one does not, the relationship's defining moment is structurally inert — it transforms the bond without redirecting the story, leaving the largest relational swing disconnected from the plot's momentum.`,
            suggestedFix: 'Stage the peak relationship shift as a dramatic turn: let the moment the bond moves most also reverse the story\'s direction or reframe what the characters understand. The biggest relational swing should be a hinge for the whole narrative, not a change that happens off the story\'s main track — when the bond and the plot turn together, the moment carries both relational and structural weight.',
          });
        }
      }

      // RELATIONSHIP_PEAK_CLOCK_ABSENT — single-peak isolation × clock × relationship.
      // The story's largest bond change raises no clock, even though ≥2 OTHER shift scenes coincide
      // with deadline pressure. The biggest relational swing happens free of time pressure — the bond
      // moves most in a beat with no ticking clock, so the peak relational moment and the urgency
      // engine never meet. When bonds elsewhere shift under deadlines but the single most consequential
      // shift does not, the story's most important relational turn plays in calm water rather than
      // carrying the doubled charge of a bond moving precisely as time runs out.
      // Distinct from: RELATIONSHIP_CLOCK_DECOUPLED (Wave 371: aggregate co-occurrence — fires when NO
      // shift scene raises a clock; this fires when MOST do but the peak does not), RELATIONSHIP_SHIFT_
      // CLOCK_AFTERMATH_VOID (Wave 497: aftermath mode — what follows a shift), RELATIONSHIP_SUSPENSE_
      // PEAK_ABSENT (Wave 371: anchors on the peak-SUSPENSE scene and checks for a shift — inverse
      // framing; this anchors on the peak SHIFT and checks for a clock). First clock entry in the peak
      // family, completing it across the revelation, dramatic-turn, and clock channels this wave.
      if (peakRec567 && !hasClock567(peakRec567)) {
        const clockShiftOther567 = shiftScenes567.filter(
          r => r.sceneIdx !== peakScene567 && hasClock567(r),
        );
        if (clockShiftOther567.length >= 2) {
          issues.push({
            location: `Scene ${peakScene567} — largest relationship shift (|${peakMag567.toFixed(2)}|), no clock raised`,
            rule: 'RELATIONSHIP_PEAK_CLOCK_ABSENT',
            severity: 'minor',
            description: `The story's largest relationship shift (Scene ${peakScene567}, magnitude ${peakMag567.toFixed(2)}) raises no clock, even though ${clockShiftOther567.length} other shift scenes move a bond under deadline pressure. The single most consequential relational swing happens free of time pressure: the bond moves most in a beat with no ticking clock, so the peak relational moment and the urgency engine never meet. When other bond changes land under deadlines but the biggest one does not, the story's most important relational turn plays in calm water — it forfeits the doubled charge of a bond fracturing or forging precisely as time runs out, the convergence that makes a relational climax feel both urgent and inevitable.`,
            suggestedFix: 'Place the peak relationship shift under a live clock: let the moment the bond moves most also be a moment when time is running out — a reconciliation forced by a closing window, a betrayal exposed in the scramble before a deadline. The biggest relational swing carries maximum force when urgency and relational change crest together, so the audience feels both the weight of the bond moving and the pressure of time at the same instant.',
          });
        }
      }
    }
  }

  // ── Wave 581: ─────────────────────────────────────────────────────────────

  // RELATIONSHIP_PEAK_UNCAUSED — backward-cause × peak shift × any cause.
  // n≥8 scenes with at least one shift; the single largest-magnitude bond change occurs in a
  // scene with no revelation, dramatic turn, or suspense rise (suspenseDelta>0) in itself or
  // either of the two preceding scenes → fire. The story's most consequential bond moment
  // arrives without any narrative catalyst powering it. The largest relational swings should
  // feel caused: driven by a truth surfacing, a pivot, or escalating tension that makes the
  // bond change inevitable. When the peak shift occurs in a dramatic vacuum, the biggest
  // relational moment reads as unmotivated.
  // Distinct from: PAIR_REPAIR_UNMOTIVATED (Wave 427: backward-cause × per-pair × positive
  // shifts — requires prior conflict absence; this is a global peak-isolation check that fires
  // on any cause absence for the single peak regardless of valence), PAIR_RUPTURE_UNMOTIVATED
  // (Wave 455: backward-cause × per-pair × negative only; same per-pair limitation), RELATIONSHIP_
  // PEAK_REVELATION_ABSENT (Wave 567: requires other shifts to carry revelation; fires even if the
  // peak has other causes; this fires whenever the peak has NO cause of any kind). First backward-
  // cause × peak check in relationship-arc.ts.
  {
    const n581a = records.length;
    if (n581a >= 8) {
      let peakMag581a = 0;
      let peakPos581a = -1;
      (records as any[]).forEach((r: any, pos: number) => {
        for (const sh of (r.relationshipShifts ?? []) as Array<{amount: number}>) {
          if (Math.abs(sh.amount) > peakMag581a) { peakMag581a = Math.abs(sh.amount); peakPos581a = pos; }
        }
      });
      if (peakPos581a >= 0 && peakMag581a > 0) {
        const hasCause581a = [0, 1, 2].some(off => {
          const r = (records as any[])[peakPos581a - off];
          if (!r) return false;
          return (r.revelation !== null && r.revelation !== undefined && r.revelation !== '') ||
            ((r.dramaticTurn ?? 'nothing') !== 'nothing' && r.dramaticTurn !== '') ||
            (r.suspenseDelta ?? 0) > 0;
        });
        if (!hasCause581a) {
          issues.push({
            location: `Scene index ${peakPos581a + 1} — largest shift magnitude (|${peakMag581a.toFixed(2)}|), no causal event in prior 2 scenes`,
            rule: 'RELATIONSHIP_PEAK_UNCAUSED',
            severity: 'minor',
            description: `The story's largest relationship shift (magnitude ${peakMag581a.toFixed(2)}) occurs without any revelation, dramatic turn, or suspense rise in itself or either of the two preceding scenes. The most consequential bond change in the story arrives in a dramatic vacuum: the relationship moves most at a beat nothing has built toward, so the peak relational swing reads as unmotivated rather than inevitable. The largest relational moments earn their weight when they are driven by a discovery, a pivot, or escalating pressure — something that makes the bond change feel necessary rather than incidental. A peak shift that arrives without any convergent cause loses the doubling effect of relational change happening at a moment of narrative force.`,
            suggestedFix: `Give the peak relationship shift a motivating cause in the two scenes before it — a revelation that exposes a truth the bond cannot survive or requires, a dramatic turn that forces the relationship into a new state, or a suspense escalation that puts the bond under pressure and breaks or cements it. The most powerful relational climaxes fuse the bond's biggest movement with the story's biggest pressure — when both happen at once, the moment carries both relational and structural weight.`,
          });
        }
      }
    }
  }

  // PAIR_AMPLITUDE_DECAY — distribution/timing × per-pair × amplitude decay.
  // For any pair with ≥4 shifts: split their shifts at the midpoint of appearance order
  // (first half vs second half); if the mean magnitude of the second-half shifts is less than
  // 0.5× the mean of the first-half → fire. The pair's relational engine winds down dramatically
  // — early bond movements carry significantly more force than later ones. The relationship loses
  // amplitude as it approaches its resolution; the dramatic stakes of the bond fade rather than
  // intensify or hold steady.
  // Distinct from: PAIR_AMPLITUDE_GROWTH (Wave 427: fires when late-half avg > 1.5× early-half
  // — amplitude INCREASE; this fires on amplitude DECREASE at the < 0.5× threshold; the decay
  // mirror on the same analytical axis), RELATIONSHIP_GLOBAL_AMPLITUDE_FRONTLOAD (Wave 343: story-
  // wide across ALL pairs, ≥1.5× ratio; this is per-pair and more severe at < 0.5× ratio), PAIR_
  // SECOND_HALF_VOID (Wave 357: ZERO second-half shifts; this fires when they still exist but are
  // much smaller than the early ones). First per-pair amplitude decay check in this pass.
  {
    const n581b = records.length;
    if (n581b >= 8) {
      const pairShifts581b = new Map<string, Array<{pos: number; mag: number}>>();
      (records as any[]).forEach((r: any, pos: number) => {
        for (const sh of (r.relationshipShifts ?? []) as Array<{pairKey: string; amount: number}>) {
          if (!pairShifts581b.has(sh.pairKey)) pairShifts581b.set(sh.pairKey, []);
          pairShifts581b.get(sh.pairKey)!.push({ pos, mag: Math.abs(sh.amount) });
        }
      });
      for (const [pair, shiftList] of pairShifts581b) {
        if (shiftList.length < 4) continue;
        shiftList.sort((a, b) => a.pos - b.pos);
        const half581b = Math.floor(shiftList.length / 2);
        const earlyMean581b = shiftList.slice(0, half581b).reduce((s, x) => s + x.mag, 0) / half581b;
        const lateMean581b = shiftList.slice(half581b).reduce((s, x) => s + x.mag, 0) / (shiftList.length - half581b);
        if (earlyMean581b > 0 && lateMean581b < 0.5 * earlyMean581b) {
          issues.push({
            location: `Pair ${pair} — ${shiftList.length} shifts, early-half avg |${earlyMean581b.toFixed(2)}, late-half avg |${lateMean581b.toFixed(2)}|`,
            rule: 'PAIR_AMPLITUDE_DECAY',
            severity: 'minor',
            description: `The relationship between ${pair} has a severe amplitude decay: the first half of their ${shiftList.length} bond shifts averages a magnitude of ${earlyMean581b.toFixed(2)}, but the second half averages only ${lateMean581b.toFixed(2)} — less than half the early-half force. The pair's relational engine winds down dramatically. Their most consequential bond-changing moments are all concentrated in the early part of their arc, leaving the later scenes to offer only small, low-stakes movements. A relationship that loses amplitude over time signals that the writers are giving up on the pair — the bond still technically moves, but with none of the force that made its early stages feel consequential. Audiences track a relationship through its ongoing drama; a pair that dwindles to minor shifts by the end of the story feels abandoned rather than resolved.`,
            suggestedFix: `Redistribute the pair's most consequential bond movements more evenly across their arc, or deliberately escalate toward a major shift in their later scenes. If the pair's early arc was correctly high-stakes, their later scenes need shifts of comparable magnitude — a later confrontation, a defining moment of rupture or reconciliation — to honor the weight the early arc established. The pair's biggest shift should ideally arrive late, not early, so the relationship builds toward its defining moment rather than fading from it.`,
          });
          break;
        }
      }
    }
  }

  // RELATIONSHIP_CLOCK_VALENCE_UNIFORM — valence × relationship × clock trigger.
  // n≥8, ≥3 scenes carry both clockRaised===true and at least one relationship shift;
  // every such scene's net shift direction is the same (all shifts sum positive, or all sum
  // negative) → fire. Bonds never move in both directions under deadline pressure — all
  // urgency-driven relational moments either exclusively warm or exclusively rupture. The clock
  // is one of cinema's most potent relational catalysts because it forces choices that reveal
  // character; but if all deadline-driven bond changes run in one direction, urgency becomes
  // monotone as a relational force. The clock should sometimes force rapprochement and sometimes
  // tear bonds apart; when it only does one, the instrument is playing one note.
  // Distinct from: RELATIONSHIP_CLOCK_DECOUPLED (Wave 371: no shift in ANY clock scene — fires
  // when there is NO overlap at all; this fires when the overlap exists but is valence-uniform),
  // PAIR_CLOCK_FLAT (Wave 413: per-pair, a pair's shifts never coincide with clock scenes; co-
  // occurrence mode not valence), PAYOFF_RELATIONSHIP_VALENCE_UNIFORM (Wave 426: payoff trigger,
  // not clock), SEED_RELATIONSHIP_VALENCE_UNIFORM (Wave 552: seed trigger, not clock). First clock-
  // trigger entry in the relationship valence family.
  {
    const n581c = records.length;
    if (n581c >= 8) {
      const clockShiftScenes581c = (records as any[]).filter((r: any) => {
        if (!r.clockRaised) return false;
        return ((r.relationshipShifts ?? []) as any[]).length > 0;
      });
      if (clockShiftScenes581c.length >= 3) {
        const signs581c = clockShiftScenes581c.map((r: any) => {
          const total = ((r.relationshipShifts ?? []) as Array<{amount: number}>)
            .reduce((s: number, sh: {amount: number}) => s + sh.amount, 0);
          return total > 0 ? 'pos' : total < 0 ? 'neg' : 'zero';
        });
        const allPos581c = signs581c.every((s: string) => s === 'pos');
        const allNeg581c = signs581c.every((s: string) => s === 'neg');
        if (allPos581c || allNeg581c) {
          const dir581c = allPos581c ? 'warming' : 'rupturing';
          issues.push({
            location: `${clockShiftScenes581c.length} clock-raised shift scenes all ${dir581c}`,
            rule: 'RELATIONSHIP_CLOCK_VALENCE_UNIFORM',
            severity: 'minor',
            description: `Every scene that combines deadline pressure with a relationship shift moves all bonds in the same direction — all ${clockShiftScenes581c.length} clock-raised shift scenes are ${dir581c}. The clock is one of cinema's most potent relational catalysts because it forces choices that reveal character and accelerate relationship trajectories; it should sometimes force rapprochement (walls come down under pressure, rivals ally) and sometimes tear bonds apart (the urgency exposes fault lines, survival instincts override loyalty). When every urgency-driven bond change goes in one direction, the clock becomes monotone as a relational instrument — a machine that only ${dir581c === 'warming' ? 'warms bonds in crisis' : 'breaks bonds in crisis'} without ever doing the opposite. The audience learns to predict the relational effect of every deadline, which drains both the urgency and the relationship change of their impact.`,
            suggestedFix: `Introduce at least one clock-raised scene where the bond moves in the opposite direction — if all deadline scenes currently warm bonds (characters bond under pressure), find one where urgency instead reveals a betrayal or forces a rupture; if all deadline scenes currently rupture bonds (pressure tears relationships apart), find one where characters are forced to trust each other. The surprise of a deadline producing the opposite relational effect from what the story has established is itself a powerful beat, and it restores the sense that bonds move unpredictably under pressure.`,
          });
        }
      }
    }
  }

  // ── Wave 595: RELATIONSHIP_SHIFT_PURPOSE_MONOTONE, RELATIONSHIP_SHIFT_ZONE_IMBALANCE,
  //              RELATIONSHIP_SHIFT_STAKES_DECOUPLED ────────────────────────────────────────

  // RELATIONSHIP_SHIFT_PURPOSE_MONOTONE — Average/aggregate × relationship-shift × scene-purpose.
  // n≥8, ≥4 meaningful shift scenes (any relationshipShifts entry with |amount|≥0.3). More than
  // 70% of those scenes share the identical `purpose` value → fire. Relational movement is
  // confined to one narrative function — e.g. every bond-shift happens during a 'complicate' beat
  // and never during a quieter character moment or a raised-stakes confrontation — rather than
  // being woven across the story's varied structural functions.
  // Distinct from: every other check in this pass, none of which key on the scene's own declared
  // `purpose` (9 existing checks key on the shift's DIMENSION field instead — a different signal
  // entirely). First — and, together with its two siblings below, only — purpose-distribution
  // check in this 99-rule file.
  if (records.length >= 8) {
    const shiftRecs595a = (records as any[]).filter(r =>
      ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => Math.abs(s.amount) >= 0.3),
    );
    if (shiftRecs595a.length >= 4) {
      const purposeCounts595a = new Map<string, number>();
      for (const r of shiftRecs595a) purposeCounts595a.set(r.purpose, (purposeCounts595a.get(r.purpose) ?? 0) + 1);
      const [domPurpose595a, domCount595a] = [...purposeCounts595a.entries()].sort((a, b) => b[1] - a[1])[0];
      if (domCount595a / shiftRecs595a.length > 0.70) {
        issues.push({
          location: `${domCount595a} of ${shiftRecs595a.length} relationship-shift scene(s) share purpose "${domPurpose595a}"`,
          rule: 'RELATIONSHIP_SHIFT_PURPOSE_MONOTONE',
          severity: 'minor',
          description: `${Math.round((domCount595a / shiftRecs595a.length) * 100)}% of the story's ${shiftRecs595a.length} meaningful relationship-shift scenes (${domCount595a} of them) share the single scene purpose "${domPurpose595a}". Bonds only move during one kind of narrative beat rather than across the story's varied structural functions — the audience learns, even subconsciously, which type of scene tends to carry relational movement, and bond changes elsewhere start to feel less likely. The most alive relational arcs move through many different kinds of scenes: a quiet aside, a raised-stakes confrontation, an unplanned collision.`,
          suggestedFix: `Let at least one relationship shift land in a scene serving a different structural purpose than "${domPurpose595a}" — a bond moving during a raise_stakes confrontation reads very differently than one moving during quiet exposition. Spreading relational movement across purposes keeps bonds feeling alive throughout the story's structure rather than tied to one recurring beat-type.`,
        });
      }
    }
  }

  // RELATIONSHIP_SHIFT_ZONE_IMBALANCE — Underweight/bloat × relationship-shift × four zones.
  // Built on checkZoneImbalance from the shared check-template library (audit M2.2). n≥10, ≥4
  // meaningful shift scenes (|amount|≥0.3) total, divided across four equal structural zones
  // (Act 1/2a/2b/3). Fires only when at least one zone has ZERO shifts while another holds ≥50%
  // of the total — the co-presence of a void AND a bloat, not concentration alone.
  // Distinct from: RELATIONSHIP_SHIFT_THIRDS_CLUSTER (thirds, not quarters, and no requirement
  // that any zone be literally empty — a story with shifts spread [1,1,1,7] would trip that check
  // without ever having a void zone), PAIR_MIDPOINT_VOID / PAIR_FIRST_HALF_VOID / PAIR_SECOND_
  // HALF_VOID / RELATIONSHIP_CLIMAX_VOID (each audits exactly one fixed zone in isolation, with
  // no bloat requirement elsewhere, and each is scoped to a single pair or a single fixed zone
  // rather than the global shift channel across all four zones at once).
  {
    const r595b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => Math.abs(s.amount) >= 0.3),
    });
    if (r595b.fires) {
      const emptyNames595b = r595b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName595b = FOUR_ZONE_NAMES[r595b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames595b} empty; ${bloatName595b} has ${r595b.counts[r595b.bloatZoneIdx]}/${r595b.totalCount} relationship shifts`,
        rule: 'RELATIONSHIP_SHIFT_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r595b.totalCount} meaningful relationship shifts are unevenly distributed across its four structural zones: ${bloatName595b} contains ${r595b.counts[r595b.bloatZoneIdx]} of them (${Math.round((r595b.counts[r595b.bloatZoneIdx] / r595b.totalCount) * 100)}%) while ${emptyNames595b} contains none. Relational movement simultaneously bloats in one zone and vanishes from another: the audience experiences a burst of bond-changes in one structural quarter while another quarter passes with every relationship frozen.`,
        suggestedFix: `Redistribute relational movement: move at least one meaningful shift from ${bloatName595b} into the empty zone(s) — ${emptyNames595b} — so every structural quarter carries some evidence of bonds changing. The goal is not perfect uniformity, but that no zone is completely shift-free while another carries more than half the total load.`,
      });
    }
  }

  // RELATIONSHIP_SHIFT_STAKES_DECOUPLED — Co-occurrence/decoupling × relationship-shift ×
  // stakes-raise purpose. Built on checkCoOccurrenceDecoupled from the shared checks library.
  // n≥8, ≥3 meaningful shift scenes (|amount|≥0.3), ≥2 raise_stakes-purpose scenes. Zero overlap
  // between the two → fire. The scene that explicitly raises what's at risk never coincides with
  // a bond actually moving — stakes escalate in the abstract while the relationships that would
  // make that escalation felt stay frozen in the same beat.
  // Distinct from: all existing co-occurrence checks in this pass, which pair relationship shift
  // with a numeric delta channel (curiosity/suspense/clock/dramatic-turn) or another event-presence
  // channel (seed/payoff/revelation) — none pairs shift with the scene's own declared purpose.
  // First check in this pass to use the purpose signal in co-occurrence mode.
  {
    const r595c = checkCoOccurrenceDecoupled({
      records, minRecords: 8, minACount: 3, minBCount: 2,
      isA: r => ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => Math.abs(s.amount) >= 0.3),
      isB: r => r.purpose === 'raise_stakes',
    });
    if (r595c.fires) {
      issues.push({
        location: `${r595c.aCount} relationship-shift scene(s) and ${r595c.bCount} stakes-raise scene(s) — zero overlap`,
        rule: 'RELATIONSHIP_SHIFT_STAKES_DECOUPLED',
        severity: 'minor',
        description: `The story has ${r595c.aCount} meaningful relationship-shift scene(s) and ${r595c.bCount} scene(s) whose purpose is to raise the stakes, but the two never coincide. The moment a story tells the audience more is now at risk is a natural moment for a bond to move — the newly-raised cost could test a relationship, force an alliance, or expose a rift. When stakes-raising and relational movement are fully decoupled, escalation stays abstract: the audience is told more is at risk without feeling it through any relationship actually shifting in response.`,
        suggestedFix: `Let at least one stakes-raising scene also carry a relationship shift — the higher cost forces two characters to choose sides, tests a fragile alliance, or exposes a fault line neither had acknowledged. A stakes-raise that also moves a bond does double dramatic work: the audience feels the escalation through a relationship, not just through exposition.`,
      });
    }
  }

  // ── Wave 609: OPEN_THREAD_RELATIONSHIP_SHIFT_DECOUPLED, PHYSICAL_PRESENCE_ZONE_IMBALANCE,
  //              RELATIONSHIP_SHIFT_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID ────────────────────────

  // OPEN_THREAD_RELATIONSHIP_SHIFT_DECOUPLED — Co-occurrence/decoupling × unresolvedClues ×
  // relationshipShifts. Built on checkCoOccurrenceDecoupled from the shared checks library. n≥8,
  // ≥2 scenes carrying outstanding clue-debt, ≥2 scenes with a relationship shift. Zero overlap →
  // fire. Unresolved narrative tension and relational movement never occupy the same scene — a
  // bond changes only while every mystery is quiet, and a mystery hangs open only while every
  // relationship holds steady. First use of the unresolvedClues field anywhere in this 102-rule
  // pass. Distinct from RELATIONSHIP_SHIFT_STAKES_DECOUPLED (Wave 595: pairs shift with the
  // stakes-raise purpose, not unresolvedClues) and every other co-occurrence check in this file.
  {
    const r609a = checkCoOccurrenceDecoupled({
      records, minRecords: 8, minACount: 2, minBCount: 2,
      isA: r => (r.unresolvedClues ?? []).length > 0,
      isB: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r609a.fires) {
      issues.push({
        location: `${r609a.aCount} open-thread scene(s), ${r609a.bCount} relationship-shift scene(s) — zero overlap`,
        rule: 'OPEN_THREAD_RELATIONSHIP_SHIFT_DECOUPLED',
        severity: 'minor',
        description: `The ${r609a.aCount} scenes carrying outstanding, unpaid clue-debt never coincide with the ${r609a.bCount} scenes where a relationship shifts — unresolved narrative tension and relational movement run on entirely separate tracks. A bond is most likely to move under pressure, and an open mystery is one of the story's natural sources of pressure; when the two never combine, each channel's weight is felt in isolation rather than compounding into a relationship visibly straining under what's still unknown.`,
        suggestedFix: `Let at least one relationship shift happen in a scene that also carries open clue-debt — a bond moving because a character's uncertainty about what's unresolved changes how they treat someone else. Tying the mystery's pressure to the relational channel gives both greater weight than either carries alone.`,
      });
    }
  }

  // PHYSICAL_PRESENCE_ZONE_IMBALANCE — Underweight/bloat × visualBeats × four structural zones.
  // Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 scenes with substantial
  // physical staging (visualBeats.length≥2), divided into four equal structural zones. Fires only
  // when one zone has zero visually dense scenes while another holds ≥50% of the total. First use
  // of the visualBeats field anywhere in this pass — every existing check here audits relational
  // movement through the relationshipShifts/purpose/emotion/revelation channels; this is the
  // first to audit how physical presence — as opposed to relational or verbal signal — is spread
  // across the four structural quarters. A story whose physical staging clusters in one act and
  // vanishes from another shifts abruptly between staged and unstaged storytelling rather than
  // sustaining physical presence alongside its relational arcs throughout.
  {
    const r609b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r609b.fires) {
      const emptyNames609b = r609b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName609b = FOUR_ZONE_NAMES[r609b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames609b} empty; ${bloatName609b} has ${r609b.counts[r609b.bloatZoneIdx]}/${r609b.totalCount} visually dense scenes`,
        rule: 'PHYSICAL_PRESENCE_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r609b.totalCount} physically staged scenes are unevenly distributed across its four structural zones: ${bloatName609b} contains ${r609b.counts[r609b.bloatZoneIdx]} of them (${Math.round((r609b.counts[r609b.bloatZoneIdx] / r609b.totalCount) * 100)}%) while ${emptyNames609b} contains none. Physical staging bloats in one structural quarter and vanishes from another, giving the story's balance between staged and unstaged scenes an uneven rhythm relative to its relational arcs.`,
        suggestedFix: `Redistribute physical staging: bring at least one heavily staged scene into ${emptyNames609b}, or thin out ${bloatName609b}'s concentration by letting one of its visually dense scenes lean more on dialogue or relational tension instead. A more even spread keeps physical presence active alongside the story's relational movement throughout.`,
      });
    }
  }

  // RELATIONSHIP_SHIFT_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID — Sequence/aftermath ×
  // relationship-shift trigger → dialogueHighlights absence. Built on checkAftermathVoid from
  // the shared checks library. n≥8, ≥2 qualifying shift scenes (|amount|≥0.3, pos<n-2), ≥3
  // scenes anywhere with a dialogue highlight, a 2-scene lookahead window. Fires when every
  // shift's two-scene aftermath contains no highlighted dialogue, while highlighted dialogue does
  // occur elsewhere in the story. First use of the dialogueHighlights field anywhere in this
  // pass. Every bond change passes into an aftermath with no memorable verbal moment giving the
  // new dynamic a voice. Distinct from RELATIONSHIP_SHIFT_DRAMATIC_TURN_AFTERMATH_VOID
  // (Wave 511) and RELATIONSHIP_SHIFT_CLOCK_AFTERMATH_VOID (Wave 497), which use different
  // aftermath channels, and from OPEN_THREAD_RELATIONSHIP_SHIFT_DECOUPLED above (relationship
  // shift is the same-scene co-occurrence subject there, not the windowed trigger here).
  {
    const r609c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 3, window: 2,
      isTrigger: r => (r.relationshipShifts ?? []).some(s => Math.abs(s.amount) >= 0.3),
      isAftermath: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r609c.fires) {
      issues.push({
        location: `${r609c.triggerCount} relationship-shift scene(s) — no highlighted dialogue within 2 scenes of any`,
        rule: 'RELATIONSHIP_SHIFT_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r609c.triggerCount} relationship-shift scenes is followed by two scenes with no highlighted dialogue, even though ${r609c.aftermathCount} such scenes exist elsewhere in the script. A bond that has just shifted carries into the next beat; when that aftermath never carries a memorable line, the new dynamic goes unvoiced — no character's speech confirms what changed or what it costs.`,
        suggestedFix: `After at least one relationship shift, let one of the following two scenes carry a line worth remembering — a character naming what changed between them, or a piece of dialogue whose weight comes precisely from the bond having moved. Give the new dynamic a voice, not just a structural record.`,
      });
    }
  }

  // ── Wave 623: RELATIONAL_PAYOFF_STAGING_DECOUPLED, RELATIONAL_SEED_STAGING_AFTERMATH_VOID,
  //              RELATIONAL_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE ──────────────────────────────

  // RELATIONAL_PAYOFF_STAGING_DECOUPLED — Co-occurrence/decoupling × payoffSetupIds ×
  // visualBeats. Built on checkCoOccurrenceDecoupled from the shared checks library. n≥6, ≥2
  // payoff scenes, ≥2 visually-staged scenes (visualBeats.length≥2). Zero overlap → fire. First
  // pairing of these two fields in this 105-rule pass. A resolved setup and a scene rich in
  // physical staging never happen together — every payoff lands through dialogue or relational
  // beats alone, with no physical action carrying the resolution's weight.
  {
    const r623a = checkCoOccurrenceDecoupled({
      records, minRecords: 6, minACount: 2, minBCount: 2,
      isA: r => (r.payoffSetupIds ?? []).length > 0,
      isB: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r623a.fires) {
      issues.push({
        location: `${r623a.aCount} payoff scene(s), ${r623a.bCount} visually-staged scene(s) — zero overlap`,
        rule: 'RELATIONAL_PAYOFF_STAGING_DECOUPLED',
        severity: 'minor',
        description: `The ${r623a.aCount} scenes where a planted thread resolves never coincide with the ${r623a.bCount} scenes leaning heavily on physical staging — resolution and physical presence run on separate tracks. A payoff often lands with more weight when a character's physical action embodies what the resolution means for a relationship, rather than the moment being carried entirely through dialogue.`,
        suggestedFix: `Let at least one payoff scene also lean on physical staging — an action or gesture between characters that embodies what just resolved, giving the payoff a physical anchor alongside whatever is said.`,
      });
    }
  }

  // RELATIONAL_SEED_STAGING_AFTERMATH_VOID — Sequence/aftermath × seededClueIds trigger →
  // visualBeats absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying seed scenes (pos<n-2), ≥3 scenes anywhere with substantial physical staging, a
  // 2-scene lookahead window. Fires when every seed's two-scene aftermath contains no visually
  // dense scene, while such scenes do occur elsewhere. First pairing of seededClueIds with
  // visualBeats in this pass — every planted clue passes into an aftermath with no physical
  // presence giving the planted material texture in the world.
  {
    const r623b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 3, window: 2,
      isTrigger: r => (r.seededClueIds ?? []).length > 0,
      isAftermath: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r623b.fires) {
      issues.push({
        location: `${r623b.triggerCount} seed scene(s) — no visually dense scene within 2 scenes of any`,
        rule: 'RELATIONAL_SEED_STAGING_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r623b.triggerCount} clue-planting scenes is followed by two scenes with no substantial physical staging, even though ${r623b.aftermathCount} such scenes exist elsewhere in the script. Seeds gain texture when the world around them briefly holds physical attention, but that opportunity consistently passes unstaged in the scenes immediately following every seed.`,
        suggestedFix: `After at least one seed, let one of the following two scenes carry substantial physical staging — the planted material or its surroundings given some visible presence before the relationship arc moves on.`,
      });
    }
  }

  // RELATIONAL_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE — Underweight/bloat × dialogueHighlights × four
  // structural zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 scenes
  // carrying a curated dialogue highlight, divided across four equal structural zones. Fires only
  // when one zone has zero such scenes while another holds ≥50% of the total. Waves 595 and 609
  // applied this template to relationshipShifts and visualBeats respectively; dialogueHighlights
  // itself — a signal already used for the Wave 609 aftermath check — has never been audited for
  // its own structural distribution here.
  {
    const r623c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r623c.fires) {
      const emptyNames623c = r623c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName623c = FOUR_ZONE_NAMES[r623c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames623c} empty; ${bloatName623c} has ${r623c.counts[r623c.bloatZoneIdx]}/${r623c.totalCount} dialogue-highlight scenes`,
        rule: 'RELATIONAL_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r623c.totalCount} dialogue-highlight scenes are unevenly distributed across its four structural zones: ${bloatName623c} contains ${r623c.counts[r623c.bloatZoneIdx]} of them (${Math.round((r623c.counts[r623c.bloatZoneIdx] / r623c.totalCount) * 100)}%) while ${emptyNames623c} contains none. Memorable dialogue bloats in one structural quarter and vanishes from another, giving the arc's verbal high points an uneven structural rhythm.`,
        suggestedFix: `Redistribute standout dialogue: bring at least one memorable line into ${emptyNames623c}, so every structural quarter carries some verbal high point for the relational arc, not only the quarter currently carrying most of them.`,
      });
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
