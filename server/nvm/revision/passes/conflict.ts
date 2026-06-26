// Wave 39 — Pass 5: Conflict
// Checks conflict escalation: flat arc, missing opposition, collisions not detonated.
// Wave 144 additions: escalation plateau (peak then stalls), confrontation quality,
// and conflict fatigue (reversals too frequent causing audience whiplash).
// Wave 158 additions: threat amnesia (clock established but forgotten in second half),
// antagonist vanish (all reversals in first 60%, none after), and single-register
// conflict (all relationship shifts use the same dimension — one-axis drama).
// Wave 257 additions: conflict Act 3 absent (climax without struggle), reconciliation
// Wave 271 additions: conflict Act 2b void (dark-night zone empty), interpersonal
// conflict only (zero external reversals), conflict pair density gap (one pair 3× others).
// absent (no broken bond ever repairs), and conflict opening void (frictionless Act 1).
// Wave 285 additions: conflict suspense decoupled (conflict scenes don't drive suspense),
// negative spiral unbroken (≥4 consecutive negative shifts with no relief),
// conflict resolution premature (major conflict resolved before final quarter).
// Wave 299 additions: conflict emotion decoupled (conflict scenes all emotionally
// neutral), stakes label unbacked (raise_stakes scenes with no conflict markers),
// eleventh hour conflict (new conflict pair first appears in the final 10%).
// Wave 313 additions: conflict curiosity decoupled (conflict scenes avg curiosityDelta
// ≤ 0), conflict magnitude peak early (heaviest relational rupture in the first half,
// distributed), conflict relentless run (≥4 consecutive scenes with a negative shift).
// Wave 338 additions: conflict clock decoupled (≥2 clock scenes none with relational
// conflict — deadlines without friction), conflict dramatic turn void (≥3 turn scenes
// none with negative relationship shift — pivots that don't crack bonds), conflict
// first-half monopoly (>70% of all conflict scenes in the first half — front-loaded).
// Wave 352 additions: conflict peak suspense absent (the heaviest-rupture scene has
// suspenseDelta ≤ 0), conflict peak emotion absent (the heaviest-rupture scene is
// emotionally neutral), conflict peak curiosity absent (the heaviest-rupture scene has
// curiosityDelta ≤ 0) — the single biggest bond-break is dramatically inert.
// Wave 366 additions: conflict peak dramatic turn absent (the heaviest-rupture scene
// carries no dramatic turn — the biggest break is not a story pivot), conflict peak clock
// absent (the heaviest-rupture scene raises no clock while the story uses clocks elsewhere
// — the biggest break adds no time pressure), conflict late first rupture (the first
// conflict scene falls at or after the midpoint — the entire first half is frictionless).
// Wave 380 additions: conflict Act 2a void (no rupture in the 25%–50% zone while the story
// has conflict — fills the Act-zone set alongside Act1/2b/3/midpoint), conflict second-half
// monopoly (>70% of ruptures fall in the second half — the distribution mirror of conflict
// first-half monopoly), conflict revelation decoupled (≥2 ruptures and ≥2 revelations but
// none share a scene — the rupture and disclosure engines never meet, sibling of clock-decoupled).
// Wave 394 additions: conflict clue decoupled (rupture scenes never seed a clue — conflict
// terminates threads without opening them, co-occurrence × seededClueIds), conflict payoff
// decoupled (payoff scenes never coincide with a rupture — foreshadowing resolves without
// relational cost, co-occurrence × payoffSetupIds), conflict rupture aftermath void (a major
// rupture ≤ -0.5 is followed by 2 scenes with no per-pair shift and neutral emotion —
// sequence/aftermath × relationship-shift channel).
// Wave 408 additions: conflict peak revelation absent (the single heaviest-rupture scene
// discloses nothing while the story has revelations elsewhere — single-peak isolation ×
// revelation), conflict peak payoff absent (the heaviest-rupture scene pays off no setup while
// payoffs exist elsewhere — single-peak isolation × payoffSetupIds), conflict peak seed absent
// (the heaviest-rupture scene seeds no clue while seeds exist elsewhere — single-peak isolation
// × seededClueIds). These extend the Wave 352/366 peak-rupture audit to the three remaining
// channels and are distinct from the Wave 380/394 co-occurrence "decoupled" checks, which audit
// whether ANY rupture coincides (aggregate) rather than whether the single biggest one does.
// Wave 422 additions: conflict rupture cause void (no conflict scene has a cause in itself or
// the prior scene — every rupture is an authorial decree without visible provocation; backward-
// cause mode × rupture channel), conflict aftermath curiosity void (every rupture is followed
// by 2 scenes where curiosityDelta ≤ 0 — breaking bonds opens no new questions; sequence/
// aftermath × curiosity), conflict pair shift imbalance (one relationship pair accounts for
// >65% of total negative shift magnitude while ≥3 pairs exist — the story over-invests in
// one dyad; average/aggregate × pair distribution).
// Wave 436 additions: positive spiral (≥3 consecutive scenes each with a positive relationship
// shift while ≥2 ruptures exist elsewhere — the relational world warms unbroken, removing
// friction; run-based × positive-shift channel, complement of CONFLICT_RELENTLESS_RUN),
// rupture suspense void (every major rupture is followed by 2 scenes with suspenseDelta ≤ 0 —
// bond-breaking never escalates tension; sequence/aftermath × suspense channel, parallel to
// Wave 422's CONFLICT_AFTERMATH_CURIOSITY_VOID but suspense rather than curiosity), breathing
// room absent (≥4 ruptures exist and the maximum non-rupture gap between consecutive ruptures
// is ≤1 scene — every break is followed almost immediately by another; distribution/timing ×
// rupture spacing, distinct from CONFLICT_RELENTLESS_RUN which requires CONSECUTIVE ruptures).
// Wave 450 additions: clock aftermath void (≥2 clock scenes all followed by 2 scenes with no
// conflict signal — deadlines raised but never detonated; sequence/aftermath × clock channel,
// distinct from CONFLICT_CLOCK_DECOUPLED which audits in-scene relational content), positive
// emotion rupture (≥3 conflict scenes all with positive emotionalShift — characters feel good
// while bonds break, an emotional/relational inversion; co-occurrence × positive valence ×
// rupture, complement of CONFLICT_EMOTION_DECOUPLED which audits neutral), rupture clock
// aftermath void (every rupture followed by 2 scenes with no clock raised while story uses
// clocks elsewhere — bond-breaking never tightens the deadline; sequence/aftermath × clock ×
// rupture aftermath, completes the set with CONFLICT_AFTERMATH_CURIOSITY_VOID and
// CONFLICT_RUPTURE_SUSPENSE_VOID by adding the clock channel).
// Wave 464 additions: rupture revelation aftermath void (every rupture is followed by 2 scenes
// with no revelation while the story discloses elsewhere — bond-breaking never leads to discovery;
// sequence/aftermath × revelation channel, completing the aftermath set alongside the curiosity,
// suspense, and clock channels), rupture dramatic-turn aftermath void (every rupture is followed
// by 2 scenes with no dramatic turn while turns exist elsewhere — fractures never pivot the story;
// sequence/aftermath × dramatic-turn channel), peak rupture uncaused (the single heaviest rupture
// has no escalation, revelation, dramatic turn, or clock raise in the two scenes before it — the
// story's deepest fracture arrives unprepared; single-peak isolation × backward-cause mode,
// distinct from CONFLICT_RUPTURE_CAUSE_VOID which audits ALL ruptures aggregate against the prior
// single scene, and from the CONFLICT_PEAK_* checks which audit the peak's in-scene channels).
// Wave 478 additions: rupture temporal cluster (distribution/timing — >75% of rupture scenes fall
// in a single third; the conflict engine is architecturally ghettoized; first distribution/timing
// check using thirds on the rupture channel, distinct from CONFLICT_FIRST/SECOND_HALF_MONOPOLY
// which use a binary 70% threshold), positive emotion aftermath void (sequence/aftermath × rupture
// × positive emotion — every major rupture is followed by 2 scenes with no positive emotional beat;
// bond-breaking never precedes relief or recovery; the positive-valence complement of the existing
// aftermath channels covering curiosity, suspense, clock, revelation, and turn), repair uncaused
// (backward-cause × positive relational shift — every scene where a bond repairs or warms has no
// major rupture, revelation, or dramatic turn in its prior 2 scenes; reconciliations are
// systematically spontaneous; the positive-shift complement of CONFLICT_RUPTURE_CAUSE_VOID which
// audits all NEGATIVE shifts, and of CONFLICT_PEAK_RUPTURE_UNCAUSED which audits only the peak).
// Wave 492 additions: dramatic-turn repair decoupled (co-occurrence × dramatic-turn × positive
// relationship shift — ≥2 dramatic-turn scenes and ≥2 repair scenes share zero overlap; story
// pivots never coincide with bond-warming; distinct from CONFLICT_DRAMATIC_TURN_VOID which audits
// negative shifts in turn scenes, and CONFLICT_REPAIR_UNCAUSED which audits backward-cause),
// closing suspense void (zone presence/absence × suspense × closing third — the final third has
// no scene with positive suspenseDelta while the earlier two-thirds have ≥2 such scenes; the
// climax approach carries no new tension build; distinct from ESCALATION_PLATEAU which compares
// averages and CONFLICT_ACT3_ABSENT which audits any conflict signal), calm stretch (run-based
// × non-conflict gap — ≥5 consecutive non-conflict scenes while ≥4 overall conflict scenes exist;
// a sustained lull breaks dramatic rhythm; the complement of CONFLICT_BREATHING_ROOM_ABSENT which
// fires when ruptures are too close, not when they are too sparse).
// Wave 506 additions: rupture seed aftermath void (sequence/aftermath × seed × rupture aftermath —
// n≥8, ≥2 ruptures ≤ -0.3, ≥2 seed scenes; every rupture followed by 2 scenes with no seededClueIds;
// bond-breaking never plants a clue foreshadowing resolution of the fracture; completes the aftermath
// channel set by adding the seed channel alongside curiosity, suspense, clock, revelation, turn, and
// positive-emotion; distinct from CONFLICT_CLUE_DECOUPLED which is same-scene co-occurrence),
// revelation repair decoupled (co-occurrence × revelation × positive shift — n≥8, ≥2 revelation
// scenes, ≥2 repair scenes ≥ +0.3, zero overlap; truths never surface as bonds heal; distinct from
// CONFLICT_REVELATION_DECOUPLED which pairs revelation with negative shifts, and CONFLICT_DRAMATIC_
// TURN_REPAIR_DECOUPLED which pairs turn with positive shifts), repair closing absent (zone presence/
// absence × positive shift × closing third — n≥9, ≥2 repair scenes ≥ +0.3, none in final third;
// the resolution zone contains no bond-warming; distinct from CONFLICT_CLOSING_SUSPENSE_VOID which
// audits suspense not repair, and CONFLICT_ACT3_ABSENT which audits any conflict not specifically
// positive-shift absence).
// Wave 534 additions: clock rupture decoupled (co-occurrence/decoupling × clock × rupture — n≥8,
// ≥2 clockRaised scenes AND ≥2 rupture scenes [shift ≤ −0.3], zero overlap; deadline urgency never
// coincides with bond-breaking; the clock channel completes the co-occurrence decoupling family
// alongside revelation, seed, payoff, and dramatic-turn; distinct from CONFLICT_CLOCK_ABSENT which
// audits absence of both channels together and from all aftermath checks which use clock as trigger),
// rupture curiosity void (co-occurrence/decoupling × rupture × curiosityDelta — n≥8, ≥2 rupture
// scenes, ≥2 curiosity scenes, every rupture has curiosityDelta ≤ 0; bond-breaking never ignites
// wondering; distinct from CONFLICT_RUPTURE_AFTERMATH_CURIOSITY_VOID which is aftermath mode [what
// follows the rupture] and from CONFLICT_CLUE_DECOUPLED which is seed not curiosity; fills the
// rupture × curiosity co-occurrence cell alongside rupture × revelation/seed/payoff/turn), curiosity
// front-loaded (distribution/timing × curiosityDelta × first half — n≥8, ≥4 curiosity scenes, >70%
// in first half while back half has ≥1; wonder exhausted before climax; distinct from CONFLICT_
// CURIOSITY_CLOSING_ZONE_ABSENT which is zone-absence not distribution-ratio, from CONFLICT_REPAIR_
// FRONT_LOADED which targets positive shifts not curiosity, and from ARC_CURIOSITY_BACK_LOADED which
// targets opposite concentration direction; first distribution/timing check on curiosity in this pass).
// Wave 548 additions: peak repair uncaused (backward-cause × single-peak isolation × positive relational
// shift — n≥8, ≥2 repair scenes ≥+0.3; the single biggest positive shift has no rupture, revelation,
// dramatic-turn, or clock in its prior 2 scenes; the peak reconciliation is spontaneous; first check
// combining single-peak isolation + backward-cause on the positive-shift channel, distinct from
// CONFLICT_REPAIR_UNCAUSED [all repairs aggregate] and CONFLICT_PEAK_RUPTURE_UNCAUSED [backward-cause ×
// peak RUPTURE]), closing clock absent (zone presence/absence × clockRaised × closing third — n≥9,
// ≥2 clock scenes in the first two-thirds, none in the final third; the story's deadline urgency goes
// silent exactly as the climax approaches; first zone check on the clockRaised channel in the closing
// third, distinct from THREAT_AMNESIA [Act 1 to second half], CONFLICT_CLOCK_DECOUPLED [co-occurrence ×
// relational content], and CONFLICT_CLOCK_AFTERMATH_VOID [aftermath mode]), seed repair decoupled
// (co-occurrence × seededClueIds × positive relational shift — n≥8, ≥2 seed scenes, ≥2 repair scenes
// ≥+0.3, zero overlap; the story plants clues and warms bonds but never in the same scene; distinct from
// CONFLICT_CLUE_DECOUPLED [seed × rupture — the negative direction], CONFLICT_RUPTURE_SEED_AFTERMATH_VOID
// [aftermath mode], and CONFLICT_REVELATION_REPAIR_DECOUPLED [revelation × repair — different signal pair];
// first co-occurrence check joining seed and repair channels).
// Wave 576 additions: curiosity zone cluster (distribution/timing × curiosityDelta × structural
// thirds — n≥9, ≥3 curiosity-positive scenes, >75% in one third; wonder spikes ghettoized into
// one zone; finer-grained than binary half checks; distinct from CONFLICT_CURIOSITY_CLOSING_ZONE_
// ABSENT [zone-absence × closing third only, not concentration in any third], CONFLICT_AFTERMATH_
// CURIOSITY_VOID [aftermath mode not distribution], CONFLICT_RUPTURE_CURIOSITY_DECOUPLED [co-
// occurrence not distribution]), dramatic-turn aftermath suspense void (sequence/aftermath ×
// dramatic turn → suspense aftermath — n≥8, ≥2 qualifying turn scenes [pos<n-1], ≥2 suspense
// scenes, no turn scene followed by suspenseDelta>0 within 2 scenes; pivots never escalate
// conflict tension; the turn-trigger complement of CONFLICT_AFTERMATH_CURIOSITY_VOID [curiosity
// channel] in this pass; distinct from CONFLICT_EMOTION_DECOUPLED [same-scene], CONFLICT_CLOSING_
// SUSPENSE_VOID [zone not aftermath]), revelation drought run (run-based × revelation × absence —
// n≥10, ≥2 revelation scenes, longest consecutive non-revelation run ≥7; the information-reveal
// engine goes silent for an extended stretch; the revelation-channel sibling of CONFLICT_REPAIR_
// DROUGHT_RUN [repair channel]; distinct from CONFLICT_CURIOSITY_CLOSING_ZONE_ABSENT [zone not run]).
// Wave 562 additions: repair drought run (run-based × repair absence × valence — n≥10, ≥2 repair
// scenes, longest consecutive run of non-repair scenes ≥6; relational warmth goes dark for an
// extended stretch; first run-based ABSENCE check on the repair channel, distinct from CONFLICT_
// CALM_STRETCH [non-conflict gap, not non-repair], CONFLICT_POSITIVE_SPIRAL [presence run not
// absence], and CONFLICT_REPAIR_FRONT_LOADED [distribution not run]), repair emotion decoupled
// (co-occurrence/decoupling × repair × emotionalShift — n≥8, ≥3 repair scenes all emotionally
// neutral while ≥2 non-repair scenes carry emotion; bonds heal but the protagonist feels nothing;
// distinct from CONFLICT_EMOTION_DECOUPLED [audits rupture/conflict scenes — the negative direction]
// and CONFLICT_POSITIVE_EMOTION_RUPTURE [inverted valence on the conflict channel]), repair curiosity
// aftermath void (sequence/aftermath × repair → curiosity — n≥8, ≥2 repair scenes [pos<n-1], ≥2
// curiosity scenes globally, every repair followed by 2 scenes with curiosityDelta ≤ 0; reconciliation
// never opens new questions; the positive-shift complement of CONFLICT_AFTERMATH_CURIOSITY_VOID [rupture
// trigger], distinct from CONFLICT_RUPTURE_CURIOSITY_DECOUPLED [same-scene co-occurrence] and CONFLICT_
// CURIOSITY_CLOSING_ZONE_ABSENT [zone check]).
// Wave 520 additions: rupture payoff aftermath void (sequence/aftermath × payoff × rupture aftermath
// — n≥8, ≥2 ruptures ≤ -0.3, ≥2 payoff scenes; every rupture followed by 2 scenes with no
// payoffSetupIds; bond-breaking never immediately precedes thread resolution; final uncovered aftermath
// channel completing the set alongside curiosity, suspense, clock, revelation, turn, positive-emotion,
// and seed; distinct from CONFLICT_PAYOFF_DECOUPLED which is same-scene co-occurrence), repair front-
// loaded (distribution/timing × positive shift × first half — n≥8, ≥4 repair scenes ≥ +0.3, >70% in
// first half while back half has ≥1; bond healing concentrated in the opening of the story while the
// climax zone goes without relational warming; distinct from CONFLICT_REPAIR_CLOSING_ABSENT which
// targets only the closing third, and from ARC_RELATIONAL_FRONT_LOADED which uses a different pass),
// curiosity closing zone absent (zone presence/absence × curiosityDelta × closing third — n≥9, ≥3
// curiosity-positive scenes, none in final structural third; the wondering engine stops before the
// climax; first zone check on the curiosity channel in this pass, distinct from CONFLICT_CLOSING_
// SUSPENSE_VOID and CONFLICT_REPAIR_CLOSING_ABSENT which audit suspense and repair respectively, and
// from CONFLICT_AFTERMATH_CURIOSITY_VOID which is an aftermath not a zone check).

import type { PassInput, PassResult, RevisionIssue } from './types.ts';
import { rewritePass } from '../rewrite.ts';

export async function conflictPass(input: PassInput): Promise<PassResult> {
  const { fountain, records, structure, approvedSpans } = input;
  const issues: RevisionIssue[] = [];

  // ── Flat suspense arc ─────────────────────────────────────────────────────
  if (!structure.escalating && records.length >= 5) {
    issues.push({
      location: 'Overall conflict arc',
      rule: 'FLAT_SUSPENSE_ARC',
      description: `Average suspense in the second half (${structure.avgSuspensePerScene}) does not exceed the first half — conflict fails to escalate`,
      severity: 'major',
      suggestedFix: 'Increase the stakes in the second half by having a character lose something they cannot recover easily',
    });
  }

  // ── Reversal density too low ──────────────────────────────────────────────
  if (structure.reversalDensity === 0 && records.length >= 8) {
    issues.push({
      location: 'Conflict layer',
      rule: 'NO_REVERSALS_LONG_STORY',
      description: 'An 8+ scene story with zero dramatic reversals lacks conflict texture',
      severity: 'critical',
      suggestedFix: 'Add at least one scene where a character\'s plan fails or backfires unexpectedly',
    });
  }

  // ── Open clues without tension ────────────────────────────────────────────
  if (structure.openClues > 3) {
    issues.push({
      location: 'Conflict — unresolved threads',
      rule: 'TOO_MANY_OPEN_CONFLICTS',
      description: `${structure.openClues} planted conflicts/clues remain unresolved — the story feels scattered rather than escalating`,
      severity: 'major',
      suggestedFix: 'Converge 2-3 open threads into a single confrontation scene',
    });
  }

  // ── Clock pressure without confrontation ─────────────────────────────────
  // Only count scenes with meaningful clock pressure (delta > 1) to avoid flagging minor raises.
  const clockRaisedScenes = records.filter(r => (r.clockDelta ?? (r.clockRaised ? 1.1 : 0)) > 1).length;
  const reversalScenes = records.filter(r => r.suspenseDelta < -1).length;
  if (clockRaisedScenes >= 3 && reversalScenes === 0) {
    issues.push({
      location: 'Conflict escalation',
      rule: 'CLOCK_WITHOUT_CONFRONTATION',
      description: `Clock is raised significantly ${clockRaisedScenes} times but no confrontation/reversal follows — ticking clocks need detonation`,
      severity: 'major',
      suggestedFix: 'Add a scene where the clock expires and forces a confrontation between opposing characters',
    });
  }

  // ── Approaching climax without intensification ────────────────────────────
  if (structure.approachingClimax) {
    const recentRecords = records.slice(-3);
    const recentSuspense = recentRecords.map(r => r.suspenseDelta);
    const avgRecentSuspense = recentSuspense.reduce((a, b) => a + b, 0) / Math.max(recentSuspense.length, 1);
    if (avgRecentSuspense < structure.avgSuspensePerScene) {
      issues.push({
        location: 'Pre-climax scenes (last 3)',
        rule: 'CLIMAX_APPROACH_FLAT',
        description: 'Story is approaching climax but recent scenes have below-average suspense — the approach lacks urgency',
        severity: 'major',
        suggestedFix: 'Accelerate the final act with shorter scenes and higher-stakes confrontations',
      });
    }
  }

  // ── Wave 144: Escalation plateau & confrontation quality ──────────────────

  // ESCALATION_PLATEAU: Suspense builds to a peak mid-story then plateaus or
  // drops instead of continuing to rise toward climax. The conflict peaked too
  // early and can't be recaptured.
  if (records.length >= 8) {
    const mid = Math.floor(records.length / 2);
    const firstHalf = records.slice(0, mid);
    const secondHalf = records.slice(mid);

    const firstHalfMax = Math.max(...firstHalf.map(r => r.suspenseDelta), 0);
    const secondHalfAvg = secondHalf.length > 0
      ? secondHalf.reduce((s, r) => s + r.suspenseDelta, 0) / secondHalf.length
      : 0;

    // If suspense peaks in first half but second half average is lower, it's plateaued
    if (firstHalfMax > 3 && secondHalfAvg < firstHalfMax * 0.7) {
      issues.push({
        location: 'Mid-story conflict',
        rule: 'ESCALATION_PLATEAU',
        description: `Conflict peaks at suspense ${firstHalfMax.toFixed(1)} in the first half but averages only ${secondHalfAvg.toFixed(1)} in the second half — escalation plateaus instead of building`,
        severity: 'major',
        suggestedFix: 'Either reduce the mid-story peak so the final act can surpass it, or add new complications in the second half that drive suspense even higher',
      });
    }
  }

  // CONFRONTATION_AVOIDANCE: Characters in conflict (negative relationship shifts)
  // but never meet in a scene with dialogue — they avoid direct confrontation.
  // This weakens the conflict's narrative impact.
  if (records.length >= 5) {
    const hasNegativeShifts = records.some(r => {
      const negativeShifts = (r.relationshipShifts ?? []).filter(s => s.amount < -0.5);
      return negativeShifts.length > 0;
    });

    if (hasNegativeShifts) {
      // Check if any scene with negative shift also has dialogue highlights (confrontation)
      const hasDirectConfrontation = records.some(r => {
        const negativeShifts = (r.relationshipShifts ?? []).filter(s => s.amount < -0.5);
        const hasDialogue = (r.dialogueHighlights ?? []).length > 0;
        return negativeShifts.length > 0 && hasDialogue;
      });

      if (!hasDirectConfrontation) {
        issues.push({
          location: 'Relationship conflict',
          rule: 'CONFRONTATION_AVOIDANCE',
          description: `Characters have negative relationship shifts but never appear in a scene together with dialogue — the conflict is stated but not enacted on stage`,
          severity: 'major',
          suggestedFix: 'Add a direct confrontation scene where conflicted characters face each other and their tension becomes verbal or physical action',
        });
      }
    }
  }

  // CONFLICT_FATIGUE: Too many reversals in quick succession (3+ reversals in
  // consecutive or near-consecutive scenes) causes audience whiplash — tension
  // oscillates too rapidly without settling, exhausting the viewer.
  if (records.length >= 8) {
    let reversalStreak = 0;
    let streakStart = -1;
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const isReversal = r.suspenseDelta < -1;
      if (isReversal) {
        if (reversalStreak === 0) streakStart = i;
        reversalStreak++;
      } else if (i > streakStart + 1 && reversalStreak < 3) {
        // Break the streak if too much non-reversal space
        reversalStreak = 0;
      }

      if (reversalStreak === 3) {
        issues.push({
          location: `Scenes ${streakStart}–${i}`,
          rule: 'CONFLICT_FATIGUE',
          description: `Three reversals in quick succession (Scenes ${streakStart}-${i}) — the audience experiences whiplash from rapid oscillation without settling`,
          severity: 'minor',
          suggestedFix: 'Space reversals further apart or let one reversal settle with a scene of consequence before introducing the next',
        });
        reversalStreak = 0; // reset to avoid duplicate fires
      }
    }
  }

  // ── Wave 158: Threat amnesia, antagonist vanish, single-register conflict ─────

  // THREAT_AMNESIA: A clock is raised in Act 1 (first 25%) but never raised again
  // in the second half (from 50% onward). The urgency that launched the story is
  // abandoned — the audience forgets what's at stake. Requires 8+ scenes.
  if (records.length >= 8) {
    const act1Zone = Math.floor(records.length * 0.25);
    const secondHalfStart = Math.floor(records.length * 0.5);

    const clockInAct1 = records.slice(0, act1Zone).some(r => r.clockRaised);
    const clockInSecondHalf = records.slice(secondHalfStart).some(r => r.clockRaised);

    if (clockInAct1 && !clockInSecondHalf) {
      issues.push({
        location: `Act 1–Act 2 clock gap (Scenes ${act1Zone}–${records.length - 1})`,
        rule: 'THREAT_AMNESIA',
        description: `A clock is raised in Act 1 but no clock pressure appears in the second half (Scenes ${secondHalfStart}+) — the external threat that launched the story is forgotten, and stakes evaporate`,
        severity: 'major',
        suggestedFix: 'Re-invoke the original threat in Act 2b with an escalation (a closer deadline, a new consequence, or a complication that restores urgency)',
      });
    }
  }

  // ANTAGONIST_VANISH: All reversals (suspenseDelta < -1) occur before the 60%
  // mark, with none after. The antagonistic force is active in the first half but
  // passive or absent as the story approaches the climax — the protagonist faces
  // a depleted opposition in the final act.
  if (records.length >= 8) {
    const splitPoint = Math.floor(records.length * 0.6);
    const reversalsInFirst = records.slice(0, splitPoint).filter(r => r.suspenseDelta < -1).length;
    const reversalsInLast = records.slice(splitPoint).filter(r => r.suspenseDelta < -1).length;

    if (reversalsInFirst >= 2 && reversalsInLast === 0) {
      issues.push({
        location: `Late conflict (Scenes ${splitPoint}–${records.length - 1})`,
        rule: 'ANTAGONIST_VANISH',
        description: `${reversalsInFirst} reversals occur before Scene ${splitPoint} but none after — the antagonist's active opposition evaporates before the climax. The protagonist wins the finale against a passive opponent.`,
        severity: 'major',
        suggestedFix: 'Add at least one reversal or direct antagonistic action in the final 40% — the protagonist must face active opposition in the climax, not just the aftermath of it',
      });
    }
  }

  // SINGLE_REGISTER_CONFLICT: All relationship shifts use the same dimension
  // (e.g., only 'trust', only 'power'). Real relationships operate on multiple
  // axes. Single-dimension conflict produces thin drama where every scene feels
  // like a repeat of the same relational beat. Requires 6+ scenes, 4+ shifts.
  if (records.length >= 6) {
    const allShifts = records.flatMap(r => r.relationshipShifts ?? []);
    if (allShifts.length >= 4) {
      const dimensions = new Set(allShifts.map(s => s.dimension));
      if (dimensions.size === 1) {
        const [onlyDim] = dimensions;
        issues.push({
          location: 'Relationship conflict layer',
          rule: 'SINGLE_REGISTER_CONFLICT',
          description: `All ${allShifts.length} relationship shifts use the same dimension ("${onlyDim}") — conflict operates on a single axis. Every relational scene delivers the same beat.`,
          severity: 'minor',
          suggestedFix: `Introduce a second conflict dimension (e.g., if all shifts are "${onlyDim}", add scenes that shift power, loyalty, or affection) to give the relationships texture and make each confrontation feel distinct`,
        });
      }
    }
  }

  // ── Wave 169: Deadline absence, low-stakes conflict, interpersonal peak timing ──

  // CONFLICT_WITHOUT_DEADLINE: 5+ conflict scenes (negative shifts or reversals)
  // but no clock raised anywhere. Interpersonal conflict without a deadline can be
  // deferred indefinitely — nothing forces the characters' hands.
  if (records.length >= 6) {
    const conflictSceneCount = records.filter(r => {
      const hasNegShift = (r.relationshipShifts ?? []).some(s => s.amount < -0.3);
      const isReversal = r.suspenseDelta < -1;
      return hasNegShift || isReversal;
    }).length;
    const hasAnyClockRaised = records.some(r => r.clockRaised);
    if (conflictSceneCount >= 5 && !hasAnyClockRaised) {
      issues.push({
        location: 'Conflict architecture',
        rule: 'CONFLICT_WITHOUT_DEADLINE',
        description: `${conflictSceneCount} conflict scenes with no clock pressure anywhere — all conflict is interpersonal with no external urgency forcing it to a head`,
        severity: 'minor',
        suggestedFix: 'Add at least one external clock: a deadline, a closing window, or a consequence that expires. A ticking clock transforms interpersonal friction into unavoidable confrontation.',
      });
    }
  }

  // LOW_STAKES_CONFLICT: The largest relationship shift magnitude is below 0.4 —
  // all conflict is minor. No scene creates a significant rupture in any relationship;
  // the story operates at a perpetually low emotional temperature.
  if (records.length >= 6) {
    const allShifts2 = records.flatMap(r => r.relationshipShifts ?? []);
    if (allShifts2.length >= 4) {
      const maxMagnitude = Math.max(...allShifts2.map(s => Math.abs(s.amount)));
      if (maxMagnitude < 0.4) {
        issues.push({
          location: 'Relationship conflict layer',
          rule: 'LOW_STAKES_CONFLICT',
          description: `Largest relationship shift is only ${maxMagnitude.toFixed(2)} — all ${allShifts2.length} shifts are minor. No scene delivers a high-magnitude rupture or bond.`,
          severity: 'major',
          suggestedFix: 'At least one scene must deliver a shift ≥0.5 in magnitude: a betrayal, a rescue, or an act of devotion that irreversibly changes a relationship',
        });
      }
    }
  }

  // INTERPERSONAL_PEAK_TOO_EARLY: The scene with the most intense negative
  // relationship shift (abs highest) occurs before the 60% mark. The relational
  // climax passes before the dramatic climax — characters are partially reconciled
  // when they should be at maximum opposition.
  if (records.length >= 8) {
    const negShiftScenes: Array<{ sceneIdx: number; amount: number }> = [];
    for (const r of records) {
      for (const shift of r.relationshipShifts ?? []) {
        if (shift.amount < 0) negShiftScenes.push({ sceneIdx: r.sceneIdx, amount: shift.amount });
      }
    }
    if (negShiftScenes.length >= 3) {
      const peakShift = negShiftScenes.reduce((worst, s) => s.amount < worst.amount ? s : worst);
      const climaxZone = Math.floor(records.length * 0.6);
      if (peakShift.sceneIdx < climaxZone && peakShift.amount < -0.4) {
        issues.push({
          location: `Scene ${peakShift.sceneIdx} (relational peak)`,
          rule: 'INTERPERSONAL_PEAK_TOO_EARLY',
          description: `The most damaging relationship shift (${peakShift.amount.toFixed(2)}) occurs at Scene ${peakShift.sceneIdx} — ${Math.round(peakShift.sceneIdx / records.length * 100)}% through the story, before the climax zone (Scene ${climaxZone}+). The relational conflict peaks too early.`,
          severity: 'major',
          suggestedFix: 'Reserve the most damaging relational rupture for the climax or just before it. Maximum interpersonal damage should coincide with maximum dramatic stakes.',
        });
      }
    }
  }

  // ── Wave 183: Reversal vacuum, Act 1 conflict absent, convergence absent ──

  // REVERSAL_WITHOUT_CONSEQUENCE: A reversal (suspenseDelta < -1) is followed by
  // two consecutive flat scenes — no emotional reaction, no clock, no relational
  // movement. The blow lands in a dramatic vacuum and the story absorbs it without
  // ripple, making the reversal feel inert rather than pivotal.
  if (records.length >= 6) {
    for (let i = 0; i < records.length - 2; i++) {
      if (records[i].suspenseDelta >= -1) continue;
      const afterScenes = records.slice(i + 1, i + 3);
      const isVacuum = afterScenes.length === 2 && afterScenes.every(a =>
        a.emotionalShift === 'neutral' &&
        !a.clockRaised &&
        (a.relationshipShifts ?? []).every(s => Math.abs(s.amount) < 0.3) &&
        a.suspenseDelta <= 1,
      );
      if (isVacuum) {
        issues.push({
          location: `Scene ${records[i].sceneIdx} (reversal)`,
          rule: 'REVERSAL_WITHOUT_CONSEQUENCE',
          description: `The reversal at Scene ${records[i].sceneIdx} (suspense drop: ${records[i].suspenseDelta.toFixed(1)}) lands in a dramatic vacuum — the next two scenes are emotionally flat with no clock, no relationship impact, and no causal reaction.`,
          severity: 'minor',
          suggestedFix: 'A reversal must ripple forward: the scene after a reversal should register its impact through emotional reaction, relationship strain, or an accelerating clock. Let the hit land.',
        });
        break;
      }
    }
  }

  // CONFLICT_ACT1_ABSENT: The entire Act 1 (first 25%) contains no conflict
  // signal — no clock raised, no reversal-level suspense, no negative relationship
  // shift. The story opens without any tension hook; the audience has nothing at
  // stake and no reason to fear loss.
  if (records.length >= 8) {
    const act1End = Math.floor(records.length * 0.25);
    const act1Records = records.slice(0, act1End);
    if (act1Records.length >= 2) {
      const hasConflictHook = act1Records.some(r =>
        r.clockRaised ||
        r.suspenseDelta > 2 ||
        (r.relationshipShifts ?? []).some(s => s.amount < -0.3),
      );
      if (!hasConflictHook) {
        issues.push({
          location: `Act 1 (Scenes 0–${act1End - 1})`,
          rule: 'CONFLICT_ACT1_ABSENT',
          description: `Act 1 (${act1Records.length} scenes) contains no conflict signal: no clock raised, no reversal, no negative relationship shift. The story opens without tension — the audience has nothing at stake from the start.`,
          severity: 'major',
          suggestedFix: 'Introduce a conflict signal in the first 25%: raise a clock, create a minor relational rupture, or plant a threat. The opening must establish what the protagonist stands to lose before the audience will care about saving it.',
        });
      }
    }
  }

  // CONFLICT_CONVERGENCE_ABSENT: Multiple active relational conflicts (≥2 distinct
  // negative-shift pairKeys) and a clock pressure exist throughout the story but
  // never intersect in the same scene. The threads run in parallel without the
  // explosive convergence that creates a true dramatic peak — the story fragments
  // its tension instead of detonating it.
  if (records.length >= 10) {
    const negPairKeys = new Set<string>();
    for (const r of records) {
      for (const shift of r.relationshipShifts ?? []) {
        if (shift.amount < -0.3) negPairKeys.add(shift.pairKey);
      }
    }
    const hasClockAnywhere = records.some(r => r.clockRaised);
    if (negPairKeys.size >= 2 && hasClockAnywhere) {
      const hasConvergence = records.some(r =>
        r.clockRaised && (r.relationshipShifts ?? []).some(s => s.amount < -0.3),
      );
      if (!hasConvergence) {
        issues.push({
          location: 'Conflict architecture',
          rule: 'CONFLICT_CONVERGENCE_ABSENT',
          description: `${negPairKeys.size} active relational conflicts and a clock pressure run in parallel throughout the story but never meet in a single scene. The threads fragment the tension instead of converging into one explosive confrontation.`,
          severity: 'major',
          suggestedFix: 'Design a scene where the deadline and the relational conflict collide simultaneously — a clock that forces opposing characters into the same room where they cannot avoid confrontation. Convergence is what turns multiple conflicts into a climax.',
        });
      }
    }
  }

  // ── Wave 195: Midpoint absent, Act 3 deflation, frequency drop ───────────

  // CONFLICT_MIDPOINT_ABSENT: The midpoint scene (floor(n*0.5)) and its ±1
  // neighbors carry no conflict signal — no clock, no reversal, no negative
  // relational shift. The structural pivot has no dramatic tension: the story
  // changes gear in a vacuum.
  if (records.length >= 8) {
    const midIdxConf = Math.floor(records.length * 0.5);
    const windowLow = Math.max(0, midIdxConf - 1);
    const windowHigh = Math.min(records.length - 1, midIdxConf + 1);
    const midpointWindow = records.slice(windowLow, windowHigh + 1);
    const hasMidpointConflict = midpointWindow.some(r =>
      r.clockRaised ||
      r.suspenseDelta < -1 ||
      (r.relationshipShifts ?? []).some((s: any) => s.amount < -0.3),
    );
    if (!hasMidpointConflict) {
      issues.push({
        location: `Scenes ${windowLow}–${windowHigh} (midpoint ±1)`,
        rule: 'CONFLICT_MIDPOINT_ABSENT',
        description: `The midpoint and adjacent scenes (Scenes ${windowLow}–${windowHigh}) carry no conflict signal — no clock, no reversal, no negative relationship shift. The structural pivot has no dramatic tension.`,
        severity: 'major',
        suggestedFix: 'Add a conflict beat to the midpoint zone: raise a clock, introduce a reversal, or create a relational rupture. The midpoint is where the story shifts gear — it should feel dramatic, not inert.',
      });
    }
  }

  // CONFLICT_ACT3_DEFLATION: Act 3 (last 25%) average suspense is significantly
  // lower than the second half of Act 2 (50%–75%). Conflict deflates before the
  // climax instead of crescendoing — the audience loses urgency at the finish line.
  if (records.length >= 8) {
    const act3StartConf = Math.floor(records.length * 0.75);
    const act2bStartConf = Math.floor(records.length * 0.5);
    const act2bRecs = records.slice(act2bStartConf, act3StartConf);
    const act3Recs = records.slice(act3StartConf);
    if (act2bRecs.length >= 2 && act3Recs.length >= 2) {
      const act2bAvgConf = act2bRecs.reduce((s: number, r: any) => s + r.suspenseDelta, 0) / act2bRecs.length;
      const act3AvgConf = act3Recs.reduce((s: number, r: any) => s + r.suspenseDelta, 0) / act3Recs.length;
      if (act2bAvgConf > 0 && act3AvgConf < act2bAvgConf * 0.6) {
        issues.push({
          location: `Act 3 (Scenes ${act3StartConf}–${records.length - 1})`,
          rule: 'CONFLICT_ACT3_DEFLATION',
          description: `Act 3 average suspense (${act3AvgConf.toFixed(1)}) is significantly below late Act 2 (${act2bAvgConf.toFixed(1)}) — conflict deflates before the climax instead of crescendoing`,
          severity: 'major',
          suggestedFix: 'Increase conflict intensity in the final act: escalate the antagonist\'s threat, raise a secondary clock, or force characters into their most consequential confrontation yet. The climax must be the peak.',
        });
      }
    }
  }

  // CONFLICT_FREQUENCY_DROP: The proportion of conflict-event scenes (reversals
  // or negative relationship shifts) falls from the first third to the final third.
  // The story becomes less dramatically active as it approaches its end — the
  // inverse of escalation. Requires 9+ scenes to have three meaningful thirds.
  if (records.length >= 9) {
    const confThird = Math.floor(records.length / 3);
    const isConflictEvent = (r: any) =>
      r.suspenseDelta < -1 || (r.relationshipShifts ?? []).some((s: any) => s.amount < -0.3);
    const firstThirdFreq = records.slice(0, confThird).filter(isConflictEvent).length / confThird;
    const lastThirdFreq = records.slice(records.length - confThird).filter(isConflictEvent).length / confThird;
    if (firstThirdFreq > lastThirdFreq && firstThirdFreq >= 0.4) {
      issues.push({
        location: 'Conflict frequency arc',
        rule: 'CONFLICT_FREQUENCY_DROP',
        description: `Conflict events (reversals + negative shifts) occur in ${Math.round(firstThirdFreq * 100)}% of first-third scenes but only ${Math.round(lastThirdFreq * 100)}% of final-third scenes — the story becomes less dramatic as it approaches its end`,
        severity: 'minor',
        suggestedFix: 'Spread conflict events evenly or escalate them toward the finale. The final third needs at least as many dramatic events as the opening — the climax arc must have its own conflict pulse.',
      });
    }
  }

  // ── Wave 210: Positive spiral trap, reversal symmetry break, antagonist force only ──

  // POSITIVE_SPIRAL_TRAP: Four or more consecutive scenes all carry a positive
  // emotional shift — an unbroken winning streak with no setback, reversal, or
  // doubt. A protagonist winning continuously for too long removes stakes and
  // transforms conflict into a montage. The audience stops fearing loss when
  // loss has been absent for four scenes in a row.
  if (records.length >= 8) {
    let posRun210 = 0;
    let maxPosRun210 = 0;
    let posRunStart210 = 0;
    let maxPosRunStart210 = 0;
    for (let i = 0; i < records.length; i++) {
      if (records[i].emotionalShift === 'positive') {
        if (posRun210 === 0) posRunStart210 = i;
        posRun210++;
        if (posRun210 > maxPosRun210) { maxPosRun210 = posRun210; maxPosRunStart210 = posRunStart210; }
      } else {
        posRun210 = 0;
      }
    }
    if (maxPosRun210 >= 4) {
      const runEnd210 = Math.min(maxPosRunStart210 + maxPosRun210 - 1, records.length - 1);
      issues.push({
        location: `Scenes ${records[maxPosRunStart210].sceneIdx}–${records[runEnd210].sceneIdx}`,
        rule: 'POSITIVE_SPIRAL_TRAP',
        severity: 'minor',
        description: `${maxPosRun210} consecutive scenes all end on a positive emotional shift — the protagonist wins continuously with no setback for ${maxPosRun210} scenes. Stakes evaporate when loss is absent for this long.`,
        suggestedFix: 'Break the winning streak with a reversal, a cost, or a doubt: a scene where the protagonist\'s progress is complicated or reversed. Sustained victories reduce tension — the audience must fear loss to care about the next scene.',
      });
    }
  }

  // REVERSAL_SYMMETRY_BREAK: Act 2a (25%–50%) contains two or more reversals
  // but Act 2b (50%–75%) contains none. The conflict's second half goes silent
  // exactly when it should be pressing hardest toward the climax. This is the
  // mid-story version of ANTAGONIST_VANISH: the opposition is active in the
  // first half of the conflict zone but passive in the second.
  if (records.length >= 10) {
    const act2aStart210 = Math.floor(records.length * 0.25);
    const act2Split210  = Math.floor(records.length * 0.5);
    const act2bEnd210   = Math.floor(records.length * 0.75);
    const reversalsAct2a = records.slice(act2aStart210, act2Split210).filter(r => r.suspenseDelta < -1).length;
    const reversalsAct2b = records.slice(act2Split210, act2bEnd210).filter(r => r.suspenseDelta < -1).length;
    if (reversalsAct2a >= 2 && reversalsAct2b === 0) {
      issues.push({
        location: `Act 2 (Scenes ${act2aStart210}–${act2bEnd210 - 1})`,
        rule: 'REVERSAL_SYMMETRY_BREAK',
        severity: 'minor',
        description: `Act 2a (Scenes ${act2aStart210}–${act2Split210 - 1}) delivers ${reversalsAct2a} reversals but Act 2b (Scenes ${act2Split210}–${act2bEnd210 - 1}) has none — the conflict's second half goes passive when it should be escalating. The approach to the climax has no oppositional momentum.`,
        suggestedFix: 'Add at least one reversal in Act 2b: a setback, a plan failure, or an antagonist action that raises the cost before the climax. The protagonist must enter the final act under active pressure, not from a lull.',
      });
    }
  }

  // ANTAGONIST_FORCE_ONLY: The story's conflict is entirely external — multiple
  // reversals (plot-level setbacks) but zero scenes with any negative relationship
  // shift. The antagonist creates plot obstacles but the characters never wound
  // each other. Conflict that operates only through external force, with no
  // interpersonal friction, produces thriller plotting without emotional dimension.
  if (records.length >= 8) {
    const reversalCount210 = records.filter(r => r.suspenseDelta < -1).length;
    const negRelShiftScenes210 = records.filter(r =>
      (r.relationshipShifts ?? []).some(s => s.amount < 0),
    ).length;
    if (reversalCount210 >= 2 && negRelShiftScenes210 === 0) {
      issues.push({
        location: 'Conflict architecture',
        rule: 'ANTAGONIST_FORCE_ONLY',
        severity: 'minor',
        description: `${reversalCount210} reversals occur but no scene carries a negative relationship shift — all conflict is external plot force with zero interpersonal damage. Characters never wound each other; they only absorb external obstacles.`,
        suggestedFix: 'Add at least one scene where the conflict damages a relationship: a betrayal, a broken trust, or an accusation that shifts how two characters stand in relation to each other. External opposition without interpersonal cost produces plot without drama.',
      });
    }
  }

  // ── Wave 214: Conflict-dynamics physics — pressure rhythm, mass distribution,
  //    reversal-magnitude trend. These reason over a per-scene conflict signal vector
  //    (see computeConflictDynamics) rather than single suspenseDelta thresholds. ──
  const conflictDyn214 = computeConflictDynamics(records);

  // UNRELIEVED_TENSION_ASCENT (major, n≥10): the dual of ESCALATION_PLATEAU. A long
  // run of consecutive scenes that each ADD external pressure with no release valve
  // among them. Relentless monotonic escalation with no beat of relief exhausts the
  // audience as surely as no escalation bores them — drama needs systole and diastole.
  if (records.length >= 10) {
    let run214 = 0, maxRun214 = 0, runStart214 = 0, maxRunStart214 = 0;
    for (let i = 0; i < conflictDyn214.length; i++) {
      const escalating = conflictDyn214[i].escalation > 0;
      const isRelief = conflictDyn214[i].release > 1;
      if (escalating && !isRelief) {
        if (run214 === 0) runStart214 = i;
        run214++;
        if (run214 > maxRun214) { maxRun214 = run214; maxRunStart214 = runStart214; }
      } else {
        run214 = 0;
      }
    }
    if (maxRun214 >= 6) {
      const runEnd214 = maxRunStart214 + maxRun214 - 1;
      issues.push({
        location: `Scenes ${records[maxRunStart214].sceneIdx}–${records[runEnd214].sceneIdx}`,
        rule: 'UNRELIEVED_TENSION_ASCENT',
        severity: 'major',
        description: `${maxRun214} consecutive scenes each add external pressure (rising suspense or a tightening clock) with no release valve between them — the tension climbs monotonically for ${maxRun214} scenes without a single beat of relief. Unbroken escalation flattens into noise; the audience cannot register a rise it is never allowed to fall from.`,
        suggestedFix: 'Insert a release beat inside the run: a reversal that briefly drops the pressure, a moment of false safety, or a small victory that the audience can exhale on before the next surge. Tension is felt as contrast — give the line a trough so the next peak reads as a climb.',
      });
    }
  }

  // CONFLICT_CONCENTRATION_SPIKE (major, n≥10): the story carries substantial total
  // conflict mass, but a single scene holds 60%+ of it while the rest is dead air.
  // The drama is one explosion in an empty field rather than a sustained engagement —
  // a structural signature of a story that front-loads or dumps its entire conflict
  // into one set-piece instead of threading opposition through the whole arc.
  if (records.length >= 10) {
    const masses214 = conflictDyn214.map(d => d.mass);
    const totalMass214 = masses214.reduce((a, b) => a + b, 0);
    const maxMass214 = Math.max(...masses214);
    const spikeIdx214 = masses214.indexOf(maxMass214);
    if (totalMass214 >= 6 && maxMass214 >= 0.6 * totalMass214) {
      issues.push({
        location: `Scene ${records[spikeIdx214].sceneIdx}`,
        rule: 'CONFLICT_CONCENTRATION_SPIKE',
        severity: 'major',
        description: `Scene ${records[spikeIdx214].sceneIdx} holds ${Math.round((maxMass214 / totalMass214) * 100)}% of the story's entire conflict mass — the opposition detonates in a single scene while the rest of the arc is dramatically inert. Conflict concentrated this heavily reads as an isolated set-piece, not a sustained pressure on the protagonist.`,
        suggestedFix: 'Distribute the conflict: seed smaller oppositional beats across the surrounding scenes so the spike is the crest of a wave, not a lone spike in flat water. A story sustains tension by keeping pressure present, not by discharging it all at once.',
      });
    }
  }

  // REVERSAL_MAGNITUDE_DECAY (major, n≥10): reversals exist in both the opening and
  // closing thirds, but their MAGNITUDE shrinks — the biggest setback is early and the
  // late reversals are at least half as large or smaller. Stakes that deflate toward
  // the climax invert the dramatic gradient: each blow should land harder than the last,
  // not softer. This is a magnitude-aware check that "are there reversals" cannot catch.
  if (records.length >= 10) {
    const third214 = Math.floor(records.length / 3);
    const firstThirdRev214 = conflictDyn214.slice(0, third214).filter(d => d.isReversal).map(d => d.reversalMag);
    const lastThirdRev214 = conflictDyn214.slice(records.length - third214).filter(d => d.isReversal).map(d => d.reversalMag);
    if (firstThirdRev214.length > 0 && lastThirdRev214.length > 0) {
      const firstMax214 = Math.max(...firstThirdRev214);
      const lastMax214 = Math.max(...lastThirdRev214);
      if (firstMax214 >= 2 * lastMax214) {
        issues.push({
          location: 'Reversal magnitude arc',
          rule: 'REVERSAL_MAGNITUDE_DECAY',
          severity: 'major',
          description: `The story's largest early reversal swings by ${firstMax214.toFixed(1)} but its largest late reversal swings by only ${lastMax214.toFixed(1)} — the setbacks shrink as the story approaches its climax. The dramatic gradient is inverted: the protagonist's hardest blow lands first and the stakes deflate toward the end.`,
          suggestedFix: 'Escalate reversal magnitude toward the finale: the climax-adjacent setback should be the largest, most costly reversal in the story. Reorder or deepen the late reversals so each blow lands harder than the one before — a deflating stakes curve drains the climax of consequence.',
        });
      }
    }
  }

  // ── Wave 229: Reversal tempo flatline, telegraphed antagonist, positive resolution too early ──

  // REVERSAL_TEMPO_FLATLINE (minor, n≥10): Reversal-level conflict events exist but
  // their average interval exceeds 40% of the total scene count — the conflict pulse
  // is so slow that narrative momentum stalls between beats. Unlike
  // CONFLICT_FREQUENCY_DROP (which compares thirds), this measures absolute spacing
  // rhythm and fires when events are chronically far apart regardless of distribution.
  if (records.length >= 10) {
    const conflictEventIdxs229: number[] = [];
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      if (r.suspenseDelta < -1 ||
          (r.relationshipShifts ?? []).some((s: any) => s.amount < -0.4)) {
        conflictEventIdxs229.push(i);
      }
    }
    if (conflictEventIdxs229.length >= 2) {
      const gaps229: number[] = [];
      for (let j = 1; j < conflictEventIdxs229.length; j++) {
        gaps229.push(conflictEventIdxs229[j] - conflictEventIdxs229[j - 1]);
      }
      const avgGap229 = gaps229.reduce((a, b) => a + b, 0) / gaps229.length;
      const gapThreshold229 = records.length * 0.4;
      if (avgGap229 > gapThreshold229) {
        issues.push({
          location: 'Conflict rhythm',
          rule: 'REVERSAL_TEMPO_FLATLINE',
          severity: 'minor',
          description: `Conflict events are spaced an average of ${avgGap229.toFixed(1)} scenes apart (threshold: ${gapThreshold229.toFixed(1)}) — the narrative pulse is so slow that dramatic momentum stalls. The story has ${conflictEventIdxs229.length} conflict beats across ${records.length} scenes.`,
          suggestedFix: 'Reduce the interval between conflict events: add micro-reversals, raise a clock between major beats, or introduce small relational friction to keep pressure present. A conflict rhythm of one beat every 3–4 scenes sustains tension.',
        });
      }
    }
  }

  // ANTAGONIST_TELEGRAPHED (minor, n≥10): Every deep reversal (suspenseDelta < -2)
  // is immediately preceded by a clock raise in the prior scene — the antagonist only
  // strikes after a warning. Real opposition needs unpredictable strikes: a reversal
  // with no advance warning creates genuine dread that telegraphed attacks cannot.
  if (records.length >= 10) {
    const deepReversals229 = records
      .map((r: any, i: number) => ({ r, i }))
      .filter(({ r }: any) => r.suspenseDelta < -2);
    if (deepReversals229.length >= 2) {
      const allTelegraphed229 = deepReversals229.every(({ i }: any) =>
        i > 0 && records[i - 1].clockRaised,
      );
      if (allTelegraphed229) {
        issues.push({
          location: 'Conflict — reversal pattern',
          rule: 'ANTAGONIST_TELEGRAPHED',
          severity: 'minor',
          description: `Every reversal (${deepReversals229.length} events, suspenseDelta < -2) is immediately preceded by a clock raise — the antagonist only strikes after a warning. Permanently telegraphed attacks eliminate genuine shock from the conflict.`,
          suggestedFix: 'Remove the preceding clock raise from at least one reversal, or introduce a strike where the prior scene carried no threat signal. Unpredictable antagonist action creates dread; telegraphed opposition only builds anxiety.',
        });
      }
    }
  }

  // POSITIVE_RESOLUTION_TOO_EARLY (major, n≥8): The story's most significant
  // positive relationship shift (largest-magnitude, ≥0.4) occurs before the 60%
  // mark. The central reconciliation front-loads the emotional reward — the final
  // act has nowhere left to go. The structural complement to INTERPERSONAL_PEAK_TOO_EARLY.
  if (records.length >= 8) {
    const posShiftScenes229: Array<{ sceneIdx: number; recIdx: number; amount: number }> = [];
    for (let i = 0; i < records.length; i++) {
      for (const shift of (records[i].relationshipShifts ?? []) as Array<{ amount: number }>) {
        if (shift.amount >= 0.4) {
          posShiftScenes229.push({ sceneIdx: records[i].sceneIdx, recIdx: i, amount: shift.amount });
        }
      }
    }
    if (posShiftScenes229.length >= 3) {
      const peakPos229 = posShiftScenes229.reduce((best, s) => s.amount > best.amount ? s : best);
      const earlyZone229 = Math.floor(records.length * 0.6);
      if (peakPos229.recIdx < earlyZone229) {
        issues.push({
          location: `Scene ${peakPos229.sceneIdx} (relational peak resolution)`,
          rule: 'POSITIVE_RESOLUTION_TOO_EARLY',
          severity: 'major',
          description: `The story's most significant positive relationship shift (+${peakPos229.amount.toFixed(2)}) occurs at Scene ${peakPos229.sceneIdx} — ${Math.round(peakPos229.recIdx / records.length * 100)}% through the story, before the 60% mark. The central reconciliation arrives too early; the final act has nowhere left to go emotionally.`,
          suggestedFix: 'Reserve the most significant positive relationship shift for the climax or resolution zone (60%+). Let the characters earn their reconciliation at the story\'s peak — the audience must be made to wait for the reward they sense is coming.',
        });
      }
    }
  }
  // ── Wave 243: Conflict recovery too fast, single-pair conflict, conflict purpose monotone ──

  // CONFLICT_RECOVERY_TOO_FAST (minor, n≥8): Every scene with deep negative
  // tension (suspenseDelta < -1.5) is followed within 2 scenes by a clear
  // recovery (suspenseDelta > 1.0). All damage heals before it can accumulate.
  // The story never allows a wound to linger — each crisis is resolved so quickly
  // that pressure never builds, and the audience stops believing the setbacks
  // are permanent. Requires ≥2 deep reversals.
  if (records.length >= 8) {
    const deepReversals243 = records
      .map((r: any, i: number) => ({ r, i }))
      .filter(({ r }: any) => r.suspenseDelta < -1.5);
    if (deepReversals243.length >= 2) {
      const allRecoverFast243 = deepReversals243.every(({ i }: any) => {
        for (let k = i + 1; k <= Math.min(i + 2, records.length - 1); k++) {
          if (records[k].suspenseDelta > 1.0) return true;
        }
        return false;
      });
      if (allRecoverFast243) {
        issues.push({
          location: 'Conflict recovery rhythm',
          rule: 'CONFLICT_RECOVERY_TOO_FAST',
          severity: 'minor',
          description: `Every deep negative tension spike (suspenseDelta < -1.5) recovers with a positive beat (>1.0) within 2 scenes — all ${deepReversals243.length} setbacks heal before they can accumulate. The audience stops believing the reversals are permanent because the story refuses to let damage linger.`,
          suggestedFix: 'Let at least one wound stay open for 3-4 scenes before relief arrives. When every crisis resolves immediately, pressure never builds to an unbearable level — the climax can\'t feel like the worst moment if every prior moment of danger was fixed by the next scene.',
        });
      }
    }
  }

  // SINGLE_PAIR_CONFLICT (minor, n≥8): All negative relationship shifts
  // (amount < -0.3) involve only one pair, while ≥2 total pairs are tracked.
  // The antagonistic load is carried by a single feud; every other relationship
  // in the story remains frictionless. Conflict that lives in only one pair
  // lacks the multi-front pressure that forces genuine crisis. Distinct from
  // GOAL_WITHOUT_OPPOSITION (which fires when there's NO opposition) — this
  // fires when opposition exists but is limited to one pair.
  {
    const allActivePairs243 = new Set<string>();
    for (const r of records) for (const s of (r.relationshipShifts ?? [])) allActivePairs243.add((s as any).pairKey);
    if (records.length >= 8 && allActivePairs243.size >= 2) {
      const conflictingPairs243 = new Set<string>();
      for (const r of records) {
        for (const shift of (r.relationshipShifts ?? []) as Array<{ pairKey: string; amount: number }>) {
          if (shift.amount < -0.3) conflictingPairs243.add(shift.pairKey);
        }
      }
      if (conflictingPairs243.size === 1) {
        const [onlyPair243] = conflictingPairs243;
        issues.push({
          location: `Conflict: ${onlyPair243}`,
          rule: 'SINGLE_PAIR_CONFLICT',
          severity: 'minor',
          description: `All negative relationship shifts (amount < -0.3) involve the same pair ("${onlyPair243}") — the entire antagonistic load of the story is carried by one feud. Every other relationship remains frictionless. Multi-front conflict creates genuine crisis; a single-pair conflict is a dispute, not a war.`,
          suggestedFix: 'Introduce negative pressure in at least one other relationship: a second rivalry, a loyalty strained by a third party, or an alliance under stress. Protagonists under pressure on multiple fronts simultaneously face more complex, higher-stakes choices.',
        });
      }
    }
  }

  // CONFLICT_PURPOSE_MONOTONE (minor, n≥8): All scenes carrying strong conflict
  // signals (suspenseDelta < -1 OR any relationship shift ≤ -0.3) share the same
  // purpose label — the story can only deliver antagonistic pressure in one
  // structural mode. Three or more such scenes all labelled "confrontation" (or
  // any single label) suggests the conflict register is locked: every crisis looks
  // the same. Requires ≥3 conflict events with the same purpose.
  if (records.length >= 8) {
    const conflictScenePurposes243 = records
      .filter(r =>
        r.suspenseDelta < -1 ||
        (r.relationshipShifts ?? []).some((s: any) => s.amount <= -0.3),
      )
      .map(r => r.purpose);
    if (conflictScenePurposes243.length >= 3) {
      const purposeMap243 = new Map<string, number>();
      for (const p of conflictScenePurposes243) {
        purposeMap243.set(p, (purposeMap243.get(p) ?? 0) + 1);
      }
      const [domPurpose243, domCount243] = [...purposeMap243.entries()].sort((a, b) => b[1] - a[1])[0];
      if (domCount243 === conflictScenePurposes243.length) {
        issues.push({
          location: 'Conflict scene purpose register',
          rule: 'CONFLICT_PURPOSE_MONOTONE',
          severity: 'minor',
          description: `All ${domCount243} conflict scenes (suspenseDelta < -1 or strong negative shift) share the same purpose label ("${domPurpose243}") — the story delivers antagonistic pressure in only one structural mode. Every conflict scene looks the same at the functional level.`,
          suggestedFix: `Vary the structural vessel for conflict: not every crisis needs to be a "${domPurpose243}". A revelation scene can carry as much antagonistic load as a confrontation; a character-development scene can contain the story's sharpest friction. Varied conflict modes keep the audience from predicting the next crisis shape.`,
        });
      }
    }
  }
  // ── End Wave 243 ─────────────────────────────────────────────────────────────

  // ── End Wave 229 ─────────────────────────────────────────────────────────────

  // ── Wave 257: Conflict Act 3 absent, reconciliation absent, conflict opening void ──

  // A scene carries a conflict signal when it has deep negative tension OR any
  // strong negative relationship shift. Shared by the three Wave 257 checks.
  const isConflictScene257 = (r: any): boolean =>
    (r.suspenseDelta ?? 0) < -1 ||
    (r.relationshipShifts ?? []).some((s: any) => s.amount <= -0.3);

  // CONFLICT_ACT3_ABSENT (major, n≥8): The story carries conflict in its first
  // 75% but Act 3 (final 25%) has no conflict signal at all — the climax act
  // resolves without struggle. The protagonist coasts to the ending with no
  // antagonistic pressure in the very stretch that should hold the story's
  // hardest opposition. Only fires when conflict exists earlier (otherwise
  // GOAL_WITHOUT_OPPOSITION already covers the conflictless case).
  if (records.length >= 8) {
    const act3Start257 = Math.floor(records.length * 0.75);
    const earlyConflict257 = records.slice(0, act3Start257).some(isConflictScene257);
    const act3Conflict257 = records.slice(act3Start257).some(isConflictScene257);
    if (earlyConflict257 && !act3Conflict257) {
      issues.push({
        location: `Act 3 (Scenes ${act3Start257}–${records.length - 1}) — conflict layer`,
        rule: 'CONFLICT_ACT3_ABSENT',
        severity: 'major',
        description: `The story carries conflict through its first 75% but Act 3 (Scenes ${act3Start257}–${records.length - 1}) has no conflict signal — no deep tension drop, no strong negative relationship shift. The climax act resolves without struggle; the protagonist coasts to the ending in the stretch that should hold the story's fiercest opposition.`,
        suggestedFix: 'Load the final act with its hardest opposition: the antagonist\'s last and strongest move, a betrayal that lands at the worst moment, a setback that makes victory seem impossible. The climax must be the point of maximum pressure, not its release.',
      });
    }
  }

  // RECONCILIATION_ABSENT (minor, n≥8, ≥2 broken pairs): Two or more pairs suffer
  // a strong relational rupture (a shift ≤ -0.4) but not one of them ever recovers
  // with a later positive shift (≥ +0.3). Every broken bond stays broken — the
  // story fractures relationships and never repairs a single one. While some
  // ruptures should be permanent, a cast in which nobody ever reconciles offers no
  // relational catharsis. Distinct from CONFLICT_RECOVERY_TOO_FAST (suspense, and
  // its opposite failure); this is the relational-repair arc end to end.
  if (records.length >= 8) {
    const brokenPairs257 = new Map<string, number>(); // pairKey → scene index of rupture
    for (let i = 0; i < records.length; i++) {
      for (const s of (records[i].relationshipShifts ?? []) as Array<{ pairKey: string; amount: number }>) {
        if (s.amount <= -0.4 && !brokenPairs257.has(s.pairKey)) brokenPairs257.set(s.pairKey, i);
      }
    }
    if (brokenPairs257.size >= 2) {
      const anyReconciled257 = [...brokenPairs257.entries()].some(([pairKey, ruptureIdx]) => {
        for (let j = ruptureIdx + 1; j < records.length; j++) {
          if ((records[j].relationshipShifts ?? []).some((s: any) => s.pairKey === pairKey && s.amount >= 0.3)) {
            return true;
          }
        }
        return false;
      });
      if (!anyReconciled257) {
        issues.push({
          location: 'Relational repair arc',
          rule: 'RECONCILIATION_ABSENT',
          severity: 'minor',
          description: `${brokenPairs257.size} relationships suffer a strong rupture (shift ≤ -0.4) but not one of them ever recovers with a later positive shift — every broken bond stays broken. The story fractures relationships and repairs none, leaving the cast with no relational catharsis.`,
          suggestedFix: 'Let at least one broken relationship find its way back — a reconciliation, a hard-won forgiveness, an alliance reforged in the climax. Not every rupture must heal, but a story where none do denies the audience the release that comes from a bond restored.',
        });
      }
    }
  }

  // CONFLICT_OPENING_VOID (minor, n≥8): Act 1 (first 25%) contains no conflict
  // signal while conflict exists later — the story opens frictionless and the
  // inciting tension arrives late. An opening with no friction gives the audience
  // nothing to lean into; the dramatic question should be posed, and resisted,
  // from the first act. Distinct from causality's CAUSAL_ACT1_VOID (any causal
  // thread); this fires specifically on the absence of opposition in the opening.
  if (records.length >= 8) {
    const act1End257 = Math.floor(records.length * 0.25);
    const act1Recs257 = records.slice(0, act1End257);
    if (act1Recs257.length >= 2) {
      const act1Conflict257 = act1Recs257.some(isConflictScene257);
      const laterConflict257 = records.slice(act1End257).some(isConflictScene257);
      if (!act1Conflict257 && laterConflict257) {
        issues.push({
          location: `Act 1 (Scenes 0–${act1End257 - 1}) — conflict layer`,
          rule: 'CONFLICT_OPENING_VOID',
          severity: 'minor',
          description: `Act 1 (the first ${act1End257} scenes) contains no conflict signal — no tension drop, no negative relationship shift — yet the story develops conflict later. The opening is frictionless and the inciting opposition arrives late, giving the audience nothing to lean into from the start.`,
          suggestedFix: 'Pose the dramatic question early and let something resist it in Act 1: a friction between characters, an obstacle that bites, a threat that announces itself. An opening with no opposition reads as preamble; the conflict should be felt before the first act ends.',
        });
      }
    }
  }

  // ── Wave 271: CONFLICT_ACT2B_VOID ─────────────────────────────────────────
  // Act 2b (the 50-75% zone, the "dark night" stretch before the final push)
  // has no conflict signal while overall conflict exists. The zone that should
  // hold the protagonist's lowest moment and the antagonist's strongest move
  // is empty. The story has tension in the opening half and in the climax, but
  // the bridge between them — where stakes should be at their heaviest — is
  // inert. Distinct from CONFLICT_MIDPOINT_ABSENT (midpoint ±1 window only)
  // and CONFLICT_ACT3_DEFLATION (comparing averages, not checking for void).
  // Requires 10+ records and 2+ overall conflict scenes.
  if (records.length >= 10) {
    const act2bStart271 = Math.floor(records.length * 0.5);
    const act2bEnd271 = Math.floor(records.length * 0.75);
    const overallConflict271 = records.filter(isConflictScene257).length;
    if (overallConflict271 >= 2) {
      const act2bConflict271 = records.slice(act2bStart271, act2bEnd271).filter(isConflictScene257).length;
      if (act2bConflict271 === 0) {
        issues.push({
          location: `Act 2b (scenes ${act2bStart271}–${act2bEnd271 - 1}) — conflict layer`,
          rule: 'CONFLICT_ACT2B_VOID',
          severity: 'minor',
          description: `The Act 2b zone (scenes ${act2bStart271}–${act2bEnd271 - 1}) has no conflict signal — no tension drop, no negative relationship shift — while the first half and climax both carry conflict. The stretch that should hold the protagonist's lowest moment and the antagonist's strongest move is inert; the bridge to the climax has no dramatic engine.`,
          suggestedFix: 'Put the story\'s hardest moment in Act 2b: a betrayal that isolates the protagonist, a failure that seems final, a revelation that reframes everything. The "dark night" zone needs the story\'s highest conflict density, not its lowest.',
        });
      }
    }
  }

  // ── Wave 271: INTERPERSONAL_CONFLICT_ONLY ─────────────────────────────────
  // The story carries 3+ scenes with negative relationship shifts but no scene
  // delivers an atmospheric tension reversal (suspenseDelta < -1). All conflict
  // is interpersonal — characters wound each other — but nothing external
  // threatens them: no plot reversals, no danger, no external pressure. The
  // mirror of ANTAGONIST_FORCE_ONLY (which fires when all conflict is external
  // with no interpersonal dimension). A story without any plot reversal can
  // read as a domestic chamber drama even when the subject demands external
  // stakes. Requires 6+ records.
  if (records.length >= 6) {
    const negRelShiftScenes271 = records.filter(r =>
      ((r.relationshipShifts as any[] ?? [])).some((s: any) => s.amount <= -0.3),
    );
    if (negRelShiftScenes271.length >= 3) {
      const hasSuspenseReversal271 = records.some(r => (r.suspenseDelta ?? 0) < -1);
      if (!hasSuspenseReversal271) {
        issues.push({
          location: 'Conflict architecture',
          rule: 'INTERPERSONAL_CONFLICT_ONLY',
          severity: 'minor',
          description: `${negRelShiftScenes271.length} scenes carry negative relationship shifts but no scene delivers a tension reversal (suspenseDelta < -1) — all conflict is interpersonal with zero external plot pressure. Characters wound each other but nothing external threatens them; the story has friction without danger.`,
          suggestedFix: 'Add at least one scene where external circumstances create a reversal: a plan that fails, a threat that arrives unexpectedly, a deadline that bites. External pressure transforms interpersonal friction from a slow burn into unavoidable confrontation with genuine stakes.',
        });
      }
    }
  }

  // ── Wave 271: CONFLICT_PAIR_DENSITY_GAP ───────────────────────────────────
  // Three or more pairs are involved in negative relationship shifts, but one
  // pair accumulates at least 3× as many negative conflict events as the next
  // most active pair. The conflict load is unevenly distributed — one feud
  // dominates while others exist as background friction that never escalates.
  // Distinct from SINGLE_PAIR_CONFLICT (only one pair with any conflict); this
  // fires when multiple pairs have conflict but one pair crushes all others.
  // Requires 6+ records and 3+ pairs with negative shifts.
  if (records.length >= 6) {
    const pairNegCounts271 = new Map<string, number>();
    for (const r of records) {
      for (const s of (r.relationshipShifts as any[] ?? []) as Array<{ pairKey: string; amount: number }>) {
        if (s.amount <= -0.3) {
          pairNegCounts271.set(s.pairKey, (pairNegCounts271.get(s.pairKey) ?? 0) + 1);
        }
      }
    }
    if (pairNegCounts271.size >= 3) {
      const sorted271 = [...pairNegCounts271.entries()].sort((a, b) => b[1] - a[1]);
      const dominantCount271 = sorted271[0][1];
      const secondCount271 = sorted271[1][1];
      if (dominantCount271 >= 3 * secondCount271) {
        issues.push({
          location: `Conflict distribution — "${sorted271[0][0]}" dominant`,
          rule: 'CONFLICT_PAIR_DENSITY_GAP',
          severity: 'minor',
          description: `"${sorted271[0][0]}" accumulates ${dominantCount271} negative conflict events — at least 3× more than any other pair (next: ${secondCount271}). While ${pairNegCounts271.size} pairs carry conflict, one feud so dominates the dramatic load that all others register as background noise. The antagonistic architecture collapses into a single overwhelming dispute.`,
          suggestedFix: 'Raise the conflict stakes in at least one secondary pair so it approaches the dominant pair\'s density. Layered conflict — two or three pairs with comparably high friction — creates a richer dramatic web than a single dominant feud surrounded by quiet bystanders.',
        });
      }
    }
  }

  // ── Wave 285: CONFLICT_SUSPENSE_DECOUPLED ────────────────────────────────
  // Scenes with negative relationship shifts (conflict scenes) have no
  // corresponding suspense lift — their average suspenseDelta is ≤ 0.
  // Conflict and suspense should reinforce each other; when conflict scenes
  // produce zero suspense, they feel consequence-free and the audience
  // disengages. Requires 8+ records and 3+ conflict scenes.
  if (records.length >= 8) {
    const conflictScenes285 = (records as any[]).filter(r =>
      ((r.relationshipShifts as any[] ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
    );
    if (conflictScenes285.length >= 3) {
      const avgSuspense285 = conflictScenes285.reduce((acc: number, r: any) => acc + (r.suspenseDelta ?? 0), 0) / conflictScenes285.length;
      if (avgSuspense285 <= 0) {
        issues.push({
          location: 'Conflict scenes — suspense decoupled',
          rule: 'CONFLICT_SUSPENSE_DECOUPLED',
          severity: 'minor',
          description: `${conflictScenes285.length} conflict scene(s) have an average suspenseDelta of ${avgSuspense285.toFixed(2)} — conflict is not generating suspense. When confrontations fail to raise tension, the audience reads them as consequence-free arguments rather than dramatic turning points. Conflict without suspense is noise.`,
          suggestedFix: 'Raise the stakes in each conflict scene: add a ticking deadline, an unexpected revelation, a power shift, or an irreversible action that could end the relationship. Suspense comes from uncertainty — the audience must believe the worst outcome is possible.',
        });
      }
    }
  }

  // ── Wave 285: NEGATIVE_SPIRAL_UNBROKEN ───────────────────────────────────
  // Four or more consecutive scenes have negative emotional shifts with no
  // neutral or positive break. An unbroken descent exhausts the audience —
  // they become desensitized to negative beats and stop believing each new
  // blow matters. Even the darkest stories need a single breath of relief
  // before the next descent to maintain emotional responsiveness.
  // Requires 8+ records.
  if (records.length >= 8) {
    let spiralLen285 = 0;
    let maxSpiral285 = 0;
    let spiralStart285 = -1;
    let maxSpiralStart285 = -1;
    for (let i285 = 0; i285 < records.length; i285++) {
      if ((records as any[])[i285].emotionalShift === 'negative') {
        if (spiralLen285 === 0) spiralStart285 = i285;
        spiralLen285++;
        if (spiralLen285 > maxSpiral285) {
          maxSpiral285 = spiralLen285;
          maxSpiralStart285 = spiralStart285;
        }
      } else {
        spiralLen285 = 0;
      }
    }
    if (maxSpiral285 >= 4) {
      issues.push({
        location: `Scenes ${maxSpiralStart285}–${maxSpiralStart285 + maxSpiral285 - 1} — negative spiral`,
        rule: 'NEGATIVE_SPIRAL_UNBROKEN',
        severity: 'minor',
        description: `${maxSpiral285} consecutive scenes (${maxSpiralStart285}–${maxSpiralStart285 + maxSpiral285 - 1}) have negative emotional shifts with no neutral or positive break. An unbroken descent desensitizes the audience — each new blow registers with less impact than the last. Even a brief moment of relief or dark humor between negative beats resets the audience's capacity for distress.`,
        suggestedFix: 'Insert a single neutral or positive beat within the spiral — a small victory, a moment of gallows humor, a character reconnection before the next blow. The beat does not need to resolve anything; it just gives the audience permission to breathe before the next descent.',
      });
    }
  }

  // ── Wave 285: CONFLICT_RESOLUTION_PREMATURE ──────────────────────────────
  // The dominant conflict pair (most negative shifts) has all of its
  // negative events in the first 75% of the story, and the final quarter
  // has no negative shifts from that pair. The central conflict resolves
  // before the climax — the story continues but the engine is off.
  // Requires 8+ records and 4+ negative events from the dominant pair.
  if (records.length >= 8) {
    const pairNegEvents285 = new Map<string, number[]>();
    for (const r of records as any[]) {
      for (const s of ((r.relationshipShifts as any[] ?? []) as Array<{ pairKey: string; amount: number }>)) {
        if (s.amount <= -0.3) {
          const arr = pairNegEvents285.get(s.pairKey) ?? [];
          arr.push(r.sceneIdx);
          pairNegEvents285.set(s.pairKey, arr);
        }
      }
    }
    if (pairNegEvents285.size >= 1) {
      const sorted285 = [...pairNegEvents285.entries()].sort((a, b) => b[1].length - a[1].length);
      const [dominantPair285, dominantScenes285] = sorted285[0];
      if (dominantScenes285.length >= 4) {
        const finalStart285 = Math.floor(records.length * 0.75);
        const lateEvents285 = dominantScenes285.filter(idx => idx >= finalStart285);
        if (lateEvents285.length === 0) {
          issues.push({
            location: `Dominant conflict pair "${dominantPair285}" — resolves before climax`,
            rule: 'CONFLICT_RESOLUTION_PREMATURE',
            severity: 'minor',
            description: `"${dominantPair285}" drives ${dominantScenes285.length} negative conflict events but none occur in the final quarter (scene ${finalStart285}+). The central conflict resolves before the climax — the story continues but the dramatic engine has already switched off. The final act plays out in the aftermath of a conflict that is already settled.`,
            suggestedFix: 'Extend the central conflict into the final quarter: add a late reversal, an unexpected re-escalation, or a final confrontation that must be resolved at the climax. The dominant conflict pair should be unresolved until the final act — early resolution steals the climax.',
          });
        }
      }
    }
  }

  // ── Wave 299: CONFLICT_EMOTION_DECOUPLED ─────────────────────────────────
  // Scenes carrying negative relationship shifts (conflict scenes) are all
  // emotionally neutral — the fights leave no mark on anyone's emotional
  // state. Distinct from CONFLICT_SUSPENSE_DECOUPLED (which audits the
  // suspense channel): this audits the emotional channel. A confrontation
  // that changes a relationship but moves no one emotionally reads as a
  // transaction, not a fight. Requires 8+ records and 3+ conflict scenes.
  if (records.length >= 8) {
    const conflictScenes299 = (records as any[]).filter(r =>
      ((r.relationshipShifts as any[] ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
    );
    if (conflictScenes299.length >= 3 && conflictScenes299.every(r => r.emotionalShift === 'neutral')) {
      issues.push({
        location: 'Conflict scenes — emotionally neutral',
        rule: 'CONFLICT_EMOTION_DECOUPLED',
        severity: 'minor',
        description: `All ${conflictScenes299.length} conflict scenes (negative relationship shifts) carry a neutral emotional shift — relationships fracture but nobody feels anything. A confrontation that changes a bond without moving anyone emotionally reads as a transaction: the audience sees the ledger update but never the cost. Conflict's currency is feeling.`,
        suggestedFix: 'Let at least one fight land emotionally: the scene where a bond breaks should also be the scene where someone\'s emotional state turns — anger curdling to grief, betrayal hardening to resolve. If a relationship can sour without anyone caring, the audience will conclude the relationship never mattered.',
      });
    }
  }

  // ── Wave 299: STAKES_LABEL_UNBACKED ──────────────────────────────────────
  // Two or more scenes are tagged with purpose "raise_stakes" but none of
  // them carries any conflict marker — no negative relationship shift, no
  // suspense rise, no clock raised. The structure claims stakes are rising
  // while the scene data shows nothing at risk: the label is unbacked by
  // dramatic content. Requires 8+ records.
  if (records.length >= 8) {
    const stakesScenes299 = (records as any[]).filter(r => r.purpose === 'raise_stakes');
    if (stakesScenes299.length >= 2) {
      const anyBacked299 = stakesScenes299.some(r =>
        (r.suspenseDelta ?? 0) > 0 ||
        r.clockRaised === true ||
        ((r.relationshipShifts as any[] ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
      );
      if (!anyBacked299) {
        issues.push({
          location: 'Scenes tagged raise_stakes',
          rule: 'STAKES_LABEL_UNBACKED',
          severity: 'minor',
          description: `${stakesScenes299.length} scenes are tagged "raise_stakes" but none of them shows a suspense rise, a clock raised, or a relationship souring — the structural label claims escalation while the scene data shows nothing newly at risk. Stakes that are declared rather than dramatized leave the audience told the situation is worse without ever feeling it.`,
          suggestedFix: 'Back each stake-raising scene with a concrete escalation: a deadline introduced, a threat made specific, an ally turned, a cost paid. If a scene cannot show what is newly at risk, retag it honestly as development — a mislabeled scene corrupts the story\'s structural map.',
        });
      }
    }
  }

  // ── Wave 299: ELEVENTH_HOUR_CONFLICT ─────────────────────────────────────
  // A conflict pair's first negative shift ever occurs in the final 10% of
  // the story. A feud introduced this late has no room to escalate, breathe,
  // or resolve — it exists only to inject artificial tension into the finale.
  // Distinct from the Act-3-absence checks (which flag missing late conflict):
  // this flags brand-new conflict arriving too late to mean anything.
  // Requires 10+ records.
  if (records.length >= 10) {
    const firstConflictAt299 = new Map<string, number>();
    for (const r of records as any[]) {
      for (const s of ((r.relationshipShifts as any[] ?? []) as Array<{ pairKey: string; amount: number }>)) {
        if (s.amount <= -0.3 && !firstConflictAt299.has(s.pairKey)) {
          firstConflictAt299.set(s.pairKey, r.sceneIdx);
        }
      }
    }
    const lateCutoff299 = Math.floor(records.length * 0.9);
    const elevenths299 = [...firstConflictAt299.entries()].filter(([, idx]) => idx >= lateCutoff299);
    if (elevenths299.length > 0 && firstConflictAt299.size > elevenths299.length) {
      const [latePair299, lateIdx299] = elevenths299[0];
      issues.push({
        location: `Scene ${lateIdx299} — first conflict for "${latePair299}"`,
        rule: 'ELEVENTH_HOUR_CONFLICT',
        severity: 'minor',
        description: `The conflict between "${latePair299}" first appears at scene ${lateIdx299} — inside the final 10% of the story. A feud introduced this late has no room to escalate or resolve; it reads as artificial tension injected into the finale rather than a fault line the story has been tracking. Late conflict the audience never saw coming (and never sees settled) leaves the ending cluttered.`,
        suggestedFix: `Either seed the "${latePair299}" friction earlier — a cold exchange, a competing interest, a small betrayal in Act 2 that makes the late rupture feel inevitable — or cut the late conflict entirely and spend the finale resolving the conflicts the story has already earned.`,
      });
    }
  }

  // ── Wave 313: CONFLICT_CURIOSITY_DECOUPLED ───────────────────────────────
  // Conflict scenes (negative relationship shifts) have an average curiosityDelta
  // of zero or below — confrontations resolve the audience's "what happens next?"
  // to nothing. Completes the conflict-channel trilogy alongside CONFLICT_SUSPENSE_
  // DECOUPLED (tension) and CONFLICT_EMOTION_DECOUPLED (feeling): a fight that
  // raises no question leaves the audience watching an argument with no forward
  // pull. Requires 8+ records and 3+ conflict scenes.
  if (records.length >= 8) {
    const conflictScenes313 = (records as any[]).filter(r =>
      ((r.relationshipShifts as any[] ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
    );
    if (conflictScenes313.length >= 3) {
      const avgCuriosity313 = conflictScenes313.reduce((acc: number, r: any) => acc + (r.curiosityDelta ?? 0), 0) / conflictScenes313.length;
      if (avgCuriosity313 <= 0) {
        issues.push({
          location: 'Conflict scenes — curiosity decoupled',
          rule: 'CONFLICT_CURIOSITY_DECOUPLED',
          severity: 'minor',
          description: `${conflictScenes313.length} conflict scenes have an average curiosityDelta of ${avgCuriosity313.toFixed(2)} — confrontations resolve the audience's "what happens next?" to nothing. A fight should open questions as well as wounds: who will retaliate, what was really meant, what this costs. Conflict that raises no question is an argument with no forward pull.`,
          suggestedFix: 'End conflict scenes on an open question, not a closed one: a threat half-made, a secret half-revealed, an alliance left uncertain. The audience should leave each confrontation needing the next scene — curiosity is the thread that pulls them through the fight.',
        });
      }
    }
  }

  // ── Wave 313: CONFLICT_MAGNITUDE_PEAK_EARLY ──────────────────────────────
  // The scene carrying the heaviest relational conflict (the largest summed
  // magnitude of negative shifts) falls in the first half of the story, while
  // conflict is distributed rather than concentrated (the peak holds under 60%
  // of total conflict mass, so this is not a single-set-piece spike). The
  // biggest rupture lands in the setup and nothing later surpasses it — the
  // climax inherits a conflict that already peaked. Distinct from the suspense-
  // based ESCALATION_PLATEAU/CLIMAX_APPROACH_FLAT and from CONFLICT_CONCENTRATION_
  // SPIKE (single scene ≥60% of mass). Requires 10+ records and 3+ conflict scenes.
  if (records.length >= 10) {
    const mags313 = (records as any[]).map(r =>
      ((r.relationshipShifts as any[] ?? []) as Array<{ amount: number }>)
        .filter(s => s.amount < 0)
        .reduce((acc, s) => acc + Math.abs(s.amount), 0),
    );
    const conflictSceneCount313 = mags313.filter(m => m > 0).length;
    const totalMass313 = mags313.reduce((a, b) => a + b, 0);
    const peakMass313 = Math.max(...mags313);
    const peakIdx313 = mags313.indexOf(peakMass313);
    const half313 = Math.floor(records.length * 0.5);
    if (
      conflictSceneCount313 >= 3 &&
      totalMass313 >= 1.5 &&
      peakMass313 > 0 &&
      peakIdx313 < half313 &&
      peakMass313 < 0.6 * totalMass313
    ) {
      issues.push({
        location: `Scene ${(records as any[])[peakIdx313].sceneIdx} — conflict magnitude peak`,
        rule: 'CONFLICT_MAGNITUDE_PEAK_EARLY',
        severity: 'minor',
        description: `The heaviest relational conflict (magnitude ${peakMass313.toFixed(2)}) falls at Scene ${(records as any[])[peakIdx313].sceneIdx}, in the first half of the story, and nothing later surpasses it. The biggest rupture lands in the setup, so the climax inherits a conflict that already peaked — the back half can only echo a blow the audience has already absorbed.`,
        suggestedFix: 'Reserve the heaviest rupture for the climax. Either soften the early peak so a later confrontation can exceed it, or escalate the back half — a deeper betrayal, a higher-stakes break — so the relational conflict curve rises toward the ending rather than away from it.',
      });
    }
  }

  // ── Wave 313: CONFLICT_RELENTLESS_RUN ────────────────────────────────────
  // Four or more consecutive scenes each carry a negative relationship shift,
  // with no respite scene between them. Unbroken relational conflict exhausts
  // the audience: with no breather, each new rupture lands softer than the last
  // and the pressure flattens into noise. Distinct from NEGATIVE_SPIRAL_UNBROKEN
  // (consecutive negative emotionalShift) and CONFLICT_FATIGUE (rapid reversal
  // oscillation): this tracks an unbroken run on the relationship-shift channel.
  // Requires 8+ records.
  if (records.length >= 8) {
    const isConflict313 = (r: any) =>
      ((r.relationshipShifts as any[] ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3);
    let runC313 = 0;
    let startC313 = 0;
    let maxRunC313 = 0;
    let maxStartC313 = 0;
    for (let i313 = 0; i313 < records.length; i313++) {
      if (isConflict313((records as any[])[i313])) {
        if (runC313 === 0) startC313 = i313;
        runC313++;
        if (runC313 > maxRunC313) { maxRunC313 = runC313; maxStartC313 = startC313; }
      } else {
        runC313 = 0;
      }
    }
    if (maxRunC313 >= 4) {
      const s313 = (records as any[])[maxStartC313].sceneIdx;
      const e313 = (records as any[])[maxStartC313 + maxRunC313 - 1].sceneIdx;
      issues.push({
        location: `Scenes ${s313}–${e313} — relentless conflict`,
        rule: 'CONFLICT_RELENTLESS_RUN',
        severity: 'minor',
        description: `${maxRunC313} consecutive scenes (${s313}–${e313}) each carry a negative relationship shift with no respite between them. Unbroken relational conflict exhausts the audience: with no breather, each new rupture lands softer than the last and the mounting pressure flattens into noise rather than building.`,
        suggestedFix: 'Insert a respite within the run — a scene of détente, a shared moment, a temporary alliance — before resuming the conflict. The contrast lets the next rupture register; relentless souring desensitizes the audience to the very damage the story is trying to make them feel.',
      });
    }
  }

  // ── Wave 338: CONFLICT_CLOCK_DECOUPLED, CONFLICT_DRAMATIC_TURN_VOID, CONFLICT_FIRST_HALF_MONOPOLY ──

  // CONFLICT_CLOCK_DECOUPLED (minor, n≥8, ≥2 clock-raised scenes): Two or more scenes
  // raise a deadline (clockRaised === true) and not one of them carries a negative
  // relationship shift — deadlines without relational friction. A ticking clock should
  // pressure the characters, and pressure cracks bonds: characters disagree about how to
  // respond, blame each other for the predicament, or betray one another under the
  // urgency. When every clock scene is relationally placid, the deadline is a prop that
  // creates urgency in the plot while leaving the characters untouched by each other.
  // Distinct from CONFLICT_SUSPENSE_DECOUPLED (suspenseDelta on conflict scenes) and
  // THREAT_AMNESIA (clock forgotten in second half — timing, not relational impact).
  if (records.length >= 8) {
    const clockScenes338 = (records as any[]).filter(r => r.clockRaised === true);
    const isClockConflict338 = (r: any) => ((r.relationshipShifts as any[] ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3);
    if (clockScenes338.length >= 2 && !clockScenes338.some(isClockConflict338)) {
      issues.push({
        location: `${clockScenes338.length} clock-raised scene(s) — none carry relational conflict`,
        rule: 'CONFLICT_CLOCK_DECOUPLED',
        severity: 'minor',
        description: `${clockScenes338.length} scenes raise a clock (clockRaised) but none carry a negative relationship shift — deadlines without relational friction. A ticking clock should pressure the people in the story: under time pressure, characters disagree about how to respond, blame each other, make desperate deals, or betray one another. When every clock scene is relationally placid, the deadline is a prop that drives plot urgency while leaving the characters untouched by each other.`,
        suggestedFix: "Let the deadline crack something: a clock scene is an opportunity to reveal what a character will sacrifice under pressure. At least one clock scene should carry a negative relationship shift — the moment urgency forces a choice that damages a bond, making the ticking clock cost something interpersonal as well as practical.",
      });
    }
  }

  // CONFLICT_DRAMATIC_TURN_VOID (minor, n≥10, ≥3 dramatic turn scenes): Three or more
  // scenes contain a genuine dramatic turn (reversal, recognition, or twist — not
  // 'nothing') and not one of them carries a negative relationship shift — pivots
  // that leave every bond intact. A dramatic turn should rearrange the forces in the
  // story, which means rearranging relationships: a reversal that exposes a betrayal,
  // a recognition that shatters a partnership, a twist that creates a new enemy. When
  // the story's turning points are relationally inert, they move the plot without
  // moving the people. Distinct from ARC_TURN_EMOTION_ABSENT (emotion not relationship
  // shifts) and CONFLICT_CURIOSITY_DECOUPLED (curiosity on conflict scenes, not turns).
  if (records.length >= 10) {
    const turnScenes338 = (records as any[]).filter(r => r.dramaticTurn && r.dramaticTurn !== 'nothing');
    const isTurnConflict338 = (r: any) => ((r.relationshipShifts as any[] ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3);
    if (turnScenes338.length >= 3 && !turnScenes338.some(isTurnConflict338)) {
      issues.push({
        location: 'Dramatic-turn scenes',
        rule: 'CONFLICT_DRAMATIC_TURN_VOID',
        severity: 'minor',
        description: `${turnScenes338.length} dramatic turn scenes (reversals, recognitions, twists) none of which carry a negative relationship shift — pivots that leave every bond intact. A dramatic turn should rearrange the forces in the story, which means rearranging relationships: a reversal that exposes a betrayal, a recognition that shatters a partnership, a twist that creates a new enemy. When the story's turning points are relationally inert, they move the plot while leaving the people in it unchanged.`,
        suggestedFix: "Give at least one dramatic turn a relational cost: the moment the story changes direction should also be a moment when a relationship changes direction. A turn that costs someone a bond — or reveals that a bond was never what it seemed — lands twice: once in the plot, once in the heart.",
      });
    }
  }

  // CONFLICT_FIRST_HALF_MONOPOLY (minor, n≥10, ≥4 conflict scenes): More than 70%
  // of all conflict scenes (scenes with at least one negative relationship shift of
  // magnitude ≥ 0.3) fall in the first half of the story. All the relational damage
  // is done early, leaving the second half with nothing to escalate against. The
  // climax inherits relationships that have already been battered down rather than
  // bonds still cracking under growing pressure. Distinct from CONFLICT_MAGNITUDE_
  // PEAK_EARLY (the heaviest single rupture in first half — this checks proportion
  // of all conflict scenes), ESCALATION_PLATEAU (peak then stalls — different
  // mechanism), and ANTAGONIST_VANISH (dramatic reversals timing, not relational scenes).
  if (records.length >= 10) {
    const allConflict338 = (records as any[]).filter(r =>
      ((r.relationshipShifts as any[] ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3)
    );
    if (allConflict338.length >= 4) {
      const half338 = Math.floor(records.length * 0.5);
      const firstHalfConflict338 = allConflict338.filter(r => (records as any[]).indexOf(r) < half338);
      const ratio338 = firstHalfConflict338.length / allConflict338.length;
      if (ratio338 > 0.7) {
        issues.push({
          location: `${firstHalfConflict338.length} of ${allConflict338.length} conflict scenes in first half (${Math.round(ratio338 * 100)}%)`,
          rule: 'CONFLICT_FIRST_HALF_MONOPOLY',
          severity: 'minor',
          description: `${firstHalfConflict338.length} of ${allConflict338.length} conflict scenes (${Math.round(ratio338 * 100)}%) fall in the first half of the story — all the relational damage is done early and the second half has nothing to escalate against. When the majority of conflict front-loads, the climax arrives after relationships have already been battered down rather than at the moment when bonds are at maximum strain.`,
          suggestedFix: "Redistribute conflict across the arc: hold back some of the most damaging ruptures for the second half so the climax arrives at the worst point in the relationships rather than on the far side of them. The audience should feel that bonds are at their most strained precisely when the story reaches its peak.",
        });
      }
    }
  }

  // ── Wave 352: CONFLICT_PEAK_SUSPENSE_ABSENT, CONFLICT_PEAK_EMOTION_ABSENT, CONFLICT_PEAK_CURIOSITY_ABSENT ──
  // The single heaviest bond-rupture in the story (the conflict scene with the largest
  // negative relationship-shift magnitude) should be its most charged moment. These three
  // checks audit that peak scene on each dramatic channel. Distinct from CONFLICT_SUSPENSE_
  // DECOUPLED / CONFLICT_EMOTION_DECOUPLED / CONFLICT_CURIOSITY_DECOUPLED, which average
  // over ALL conflict scenes — these isolate the single most consequential rupture.
  if (records.length >= 8) {
    const conflictRecs352 = (records as any[]).filter(r =>
      ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
    );
    if (conflictRecs352.length >= 2) {
      let peakRec352: any = null;
      let peakMag352 = 0;
      for (const r of conflictRecs352) {
        const mag = Math.max(
          ...((r.relationshipShifts ?? []) as Array<{ amount: number }>)
            .filter(s => s.amount <= -0.3)
            .map(s => Math.abs(s.amount)),
        );
        if (mag > peakMag352) { peakMag352 = mag; peakRec352 = r; }
      }
      if (peakRec352) {
        if ((peakRec352.suspenseDelta ?? 0) <= 0) {
          issues.push({
            location: `Scene ${peakRec352.sceneIdx} — peak rupture (magnitude ${peakMag352.toFixed(2)})`,
            rule: 'CONFLICT_PEAK_SUSPENSE_ABSENT',
            severity: 'minor',
            description: `The story's heaviest bond-rupture (Scene ${peakRec352.sceneIdx}, magnitude ${peakMag352.toFixed(2)}) carries a suspenseDelta of ${(peakRec352.suspenseDelta ?? 0).toFixed(2)} — the biggest break in the story generates no tension. The most consequential rupture should be the most dangerous-feeling moment, leaving the audience uncertain what the fracture will cost; when it lands tension-flat, the story's central conflict peaks without anyone feeling the stakes.`,
            suggestedFix: 'Stage the heaviest rupture so it threatens something concrete: the break should put a goal, a life, or a future in jeopardy, not just register as a relationship changing state. The single biggest fracture deserves the story\'s highest suspense, not its flattest.',
          });
        }
        if (peakRec352.emotionalShift === 'neutral') {
          issues.push({
            location: `Scene ${peakRec352.sceneIdx} — peak rupture (magnitude ${peakMag352.toFixed(2)})`,
            rule: 'CONFLICT_PEAK_EMOTION_ABSENT',
            severity: 'minor',
            description: `The story's heaviest bond-rupture (Scene ${peakRec352.sceneIdx}, magnitude ${peakMag352.toFixed(2)}) is emotionally neutral — the biggest break leaves the protagonist unmoved. The most consequential fracture in the story should be felt most acutely; when it registers no emotional shift, the rupture reads as a plot adjustment rather than a loss, and the audience is told the bond broke without being made to feel it break.`,
            suggestedFix: 'Let the heaviest rupture wound: the scene where the most important bond breaks should carry the story\'s sharpest emotional charge — grief, betrayal, rage. The magnitude of a break is measured by how much it costs the person at its center.',
          });
        }
        if ((peakRec352.curiosityDelta ?? 0) <= 0) {
          issues.push({
            location: `Scene ${peakRec352.sceneIdx} — peak rupture (magnitude ${peakMag352.toFixed(2)})`,
            rule: 'CONFLICT_PEAK_CURIOSITY_ABSENT',
            severity: 'minor',
            description: `The story's heaviest bond-rupture (Scene ${peakRec352.sceneIdx}, magnitude ${peakMag352.toFixed(2)}) carries a curiosityDelta of ${(peakRec352.curiosityDelta ?? 0).toFixed(2)} — the biggest break raises no questions about what happens next. A major rupture should leave the audience hungry to know how the characters will live with the fracture; when the peak conflict closes a door without opening one, the story's central break is an endpoint rather than a turn.`,
            suggestedFix: 'Make the heaviest rupture generative: the break should open new uncertainties — what each character does now, what the fracture exposes, who they become without the bond. The biggest conflict should propel the story forward, not just register damage.',
          });
        }
      }
    }
  }

  // ── Wave 366: CONFLICT_PEAK_DRAMATIC_TURN_ABSENT, CONFLICT_PEAK_CLOCK_ABSENT, CONFLICT_LATE_FIRST_RUPTURE ──
  // The first two extend the Wave 352 peak-rupture audit to the dramatic-turn and clock
  // channels; the third audits the timing of the story's first rupture.
  if (records.length >= 8) {
    const conflictRecs366 = (records as any[]).filter(r =>
      ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
    );
    if (conflictRecs366.length >= 2) {
      let peakRec366: any = null;
      let peakMag366 = 0;
      for (const r of conflictRecs366) {
        const mag = Math.max(
          ...((r.relationshipShifts ?? []) as Array<{ amount: number }>)
            .filter(s => s.amount <= -0.3)
            .map(s => Math.abs(s.amount)),
        );
        if (mag > peakMag366) { peakMag366 = mag; peakRec366 = r; }
      }
      if (peakRec366) {
        // CONFLICT_PEAK_DRAMATIC_TURN_ABSENT: the heaviest rupture is not a story pivot.
        // Distinct from CONFLICT_DRAMATIC_TURN_VOID (audits whether turn scenes carry a
        // negative shift; this audits whether the peak conflict carries a turn) and from
        // the Wave 352 peak checks (suspense/emotion/curiosity channels).
        if ((peakRec366.dramaticTurn ?? 'nothing') === 'nothing') {
          issues.push({
            location: `Scene ${peakRec366.sceneIdx} — peak rupture (magnitude ${peakMag366.toFixed(2)})`,
            rule: 'CONFLICT_PEAK_DRAMATIC_TURN_ABSENT',
            severity: 'minor',
            description: `The story's heaviest bond-rupture (Scene ${peakRec366.sceneIdx}, magnitude ${peakMag366.toFixed(2)}) carries no dramatic turn — the biggest break is not a story pivot. The single most consequential fracture should reverse, escalate, or recast the situation; when it leaves the plot's trajectory unchanged, the rupture is an event the story passes through rather than a turn the story turns on.`,
            suggestedFix: 'Make the heaviest rupture pivot the story: the break should change what the protagonist is pursuing, expose a new obstacle, or invert an alliance. The biggest fracture in the relational world deserves to be a hinge the plot swings on, not a beat it merely records.',
          });
        }
        // CONFLICT_PEAK_CLOCK_ABSENT: the heaviest rupture adds no time pressure even
        // though the story uses clocks. Distinct from CONFLICT_CLOCK_DECOUPLED (audits
        // whether clock scenes carry conflict; this audits whether the peak conflict
        // raises a clock) and CONFLICT_WITHOUT_DEADLINE.
        const clockScenes366 = (records as any[]).filter(r => r.clockRaised === true);
        if (clockScenes366.length >= 2 && peakRec366.clockRaised !== true) {
          issues.push({
            location: `Scene ${peakRec366.sceneIdx} — peak rupture (magnitude ${peakMag366.toFixed(2)})`,
            rule: 'CONFLICT_PEAK_CLOCK_ABSENT',
            severity: 'minor',
            description: `The story's heaviest bond-rupture (Scene ${peakRec366.sceneIdx}, magnitude ${peakMag366.toFixed(2)}) raises no clock, even though the story uses ${clockScenes366.length} clock-raising scenes elsewhere. The biggest break adds no time pressure — it fractures a bond without tightening the deadline the characters are racing. When the peak conflict and the urgency engine never coincide, the rupture lands in a moment with all the time in the world.`,
            suggestedFix: 'Couple the heaviest rupture to a deadline: let the break that hurts most also shorten the time available — a betrayal that costs a crucial ally just as the clock runs down, a severed bond that forecloses an escape. The biggest fracture is most devastating when there is no time left to repair it.',
          });
        }
      }

      // CONFLICT_LATE_FIRST_RUPTURE (n≥10): the first conflict scene occurs at or after
      // the midpoint — the entire first half is frictionless. Distinct from CONFLICT_
      // OPENING_VOID / CONFLICT_ACT1_ABSENT (the first 25% only) and ELEVENTH_HOUR_
      // CONFLICT (a NEW pair in the final 10%): this fires when no rupture of any kind
      // lands before the 50% mark despite the story containing conflict.
      if (records.length >= 10) {
        const mid366 = Math.floor(records.length * 0.5);
        const firstRuptureIdx366 = conflictRecs366
          .map(r => (records as any[]).indexOf(r))
          .reduce((min, i) => Math.min(min, i), Infinity);
        if (firstRuptureIdx366 >= mid366) {
          issues.push({
            location: `First rupture at Scene ${(records as any[])[firstRuptureIdx366].sceneIdx} (at or past the midpoint)`,
            rule: 'CONFLICT_LATE_FIRST_RUPTURE',
            severity: 'minor',
            description: `The story's first relational rupture lands at Scene ${(records as any[])[firstRuptureIdx366].sceneIdx}, at or past the midpoint — the entire first half is frictionless. With ${conflictRecs366.length} conflict scenes in the story, all of them fall in the back half, so the setup and first complication zone establish the world and the relationships without ever straining a bond. The audience reaches the midpoint with no felt conflict to invest in.`,
            suggestedFix: 'Introduce a rupture in the first half: even a small friction — a broken promise, an eroded trust, a clash of goals — gives the audience a relational stake before the story starts breaking things in earnest. A first half with no conflict trains the audience to expect calm exactly when the story should be teaching them to worry.',
          });
        }
      }
    }
  }

  // ── Wave 380: CONFLICT_ACT2A_VOID, CONFLICT_SECOND_HALF_MONOPOLY, CONFLICT_REVELATION_DECOUPLED ──
  {
    const isConflictScene380 = (r: any): boolean =>
      ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3);
    const conflictRecs380 = (records as any[]).filter(isConflictScene380);

    // CONFLICT_ACT2A_VOID (minor, n≥10, ≥2 conflict scenes): No rupture lands in Act 2a
    // (25%–50%), even though the story contains conflict elsewhere. The first half of the
    // complication zone — where the protagonist should already be under rising pressure
    // after the inciting incident — is frictionless. Fills the Act-zone set alongside
    // CONFLICT_ACT1_ABSENT (Act 1), CONFLICT_ACT2B_VOID (50%–75%), CONFLICT_MIDPOINT_ABSENT
    // (40%–60%), and CONFLICT_ACT3_ABSENT (final 25%).
    if (records.length >= 10 && conflictRecs380.length >= 2) {
      const a2aStart380 = Math.floor(records.length * 0.25);
      const a2aEnd380 = Math.floor(records.length * 0.5);
      const a2aRecs380 = (records as any[]).slice(a2aStart380, a2aEnd380);
      if (a2aRecs380.length >= 2 && !a2aRecs380.some(isConflictScene380)) {
        issues.push({
          location: `Act 2a (Scenes ${a2aStart380}–${a2aEnd380 - 1}) — no rupture`,
          rule: 'CONFLICT_ACT2A_VOID',
          severity: 'minor',
          description: `No relational rupture occurs in Act 2a (Scenes ${a2aStart380}–${a2aEnd380 - 1}), though the story contains conflict elsewhere. The first half of the complication zone — where the protagonist should already be under rising pressure after the inciting incident — is frictionless, so the story coasts from setup toward the midpoint without the early escalation that earns the audience's worry.`,
          suggestedFix: 'Plant a rupture in Act 2a: an early alliance strained, a trust tested, a first cost paid. The stretch right after the inciting incident should be where the conflict starts biting — a frictionless Act 2a lets the tension go slack precisely where it should begin to climb.',
        });
      }
    }

    // CONFLICT_SECOND_HALF_MONOPOLY (minor, n≥8, ≥3 conflict scenes): More than 70% of
    // the story's ruptures fall in the second half. Conflict arrives late and concentrates
    // toward the climax, so the front half plays without relational friction and the back
    // half carries all the strain at once. The distribution mirror of CONFLICT_FIRST_HALF_
    // MONOPOLY (>70% in the first half); distinct from CONFLICT_LATE_FIRST_RUPTURE (the
    // binary case — the FIRST rupture falls past the midpoint) and CONFLICT_ACT1_ABSENT /
    // CONFLICT_OPENING_VOID (zone checks): this fires even when the first half has some
    // conflict, as long as it is a small minority.
    if (records.length >= 8 && conflictRecs380.length >= 3) {
      const mid380 = Math.floor(records.length * 0.5);
      const secondHalf380 = conflictRecs380.filter(r => (records as any[]).indexOf(r) >= mid380).length;
      if (secondHalf380 / conflictRecs380.length > 0.7) {
        issues.push({
          location: `Conflict distribution — ${secondHalf380}/${conflictRecs380.length} ruptures in the back half`,
          rule: 'CONFLICT_SECOND_HALF_MONOPOLY',
          severity: 'minor',
          description: `${secondHalf380} of the story's ${conflictRecs380.length} ruptures (${Math.round(secondHalf380 / conflictRecs380.length * 100)}%) fall in the second half — conflict arrives late and concentrates toward the climax. The front half plays with little relational friction and the back half carries all the strain at once, so the audience is asked to invest in bonds the first half never showed under pressure.`,
          suggestedFix: 'Move some ruptures earlier: seed friction in the first half so the relationships the back half breaks have already been shown to be fragile. Conflict distributed across the arc builds continuously; conflict dumped into the second half makes the opening feel inert and the ending feel rushed.',
        });
      }
    }

    // CONFLICT_REVELATION_DECOUPLED (minor, n≥8, ≥2 ruptures, ≥2 revelations): The story's
    // ruptures and its revelations never share a scene — bonds break in scenes that disclose
    // nothing, and truths surface in scenes that fracture no bond. The two engines run on
    // separate tracks, so a rupture never IS a revelation (a betrayal exposed) and a
    // revelation never costs a relationship. Sibling of CONFLICT_CLOCK_DECOUPLED (rupture ×
    // clock); distinct from belief.ts REVELATION_RELATIONSHIP_DECOUPLED (no revelation has
    // ANY relationship shift — this targets negative ruptures specifically and fires even
    // when revelations coincide with positive shifts).
    if (records.length >= 8) {
      const revScenes380 = (records as any[]).filter(r => r.revelation !== null && r.revelation !== undefined);
      if (conflictRecs380.length >= 2 && revScenes380.length >= 2 && !conflictRecs380.some(r => r.revelation !== null && r.revelation !== undefined)) {
        issues.push({
          location: 'Ruptures × revelations — decoupled',
          rule: 'CONFLICT_REVELATION_DECOUPLED',
          severity: 'minor',
          description: `The story has ${conflictRecs380.length} ruptures and ${revScenes380.length} revelations, but none share a scene — bonds break in scenes that disclose nothing, and truths surface in scenes that fracture no bond. The rupture engine and the disclosure engine run separately, so a betrayal never lands as a revelation and a revelation never costs a relationship, forfeiting the doubled charge of a truth that breaks a bond in the same beat.`,
          suggestedFix: 'Fuse at least one rupture with a revelation: the moment a hidden truth surfaces should also be the moment a bond fractures — the lie exposed that ends the friendship, the secret revealed that severs the alliance. When disclosure and rupture coincide, each makes the other land harder.',
        });
      }
    }
  }

  // ── Wave 394: CONFLICT_CLUE_DECOUPLED, CONFLICT_PAYOFF_DECOUPLED, CONFLICT_RUPTURE_AFTERMATH_VOID ──

  // CONFLICT_CLUE_DECOUPLED (minor, n≥8, ≥3 conflict scenes, ≥2 clue-seeding scenes):
  // Every scene that seeds a clue (seededClueIds non-empty) is relationally inert — none
  // of the story's rupture scenes plant anything for the audience to carry forward.
  // Confrontations are closed events: they wound without opening a new thread, leaving the
  // audience with damage but no forward pull from the highest-stakes scenes.
  // Distinct from CONFLICT_REVELATION_DECOUPLED (revelation signal — disclosure of existing
  // secrets, not planting new seeds; seededClueIds vs. the revelation property), from
  // CONFLICT_CURIOSITY_DECOUPLED (average curiosityDelta ≤ 0 on conflict scenes — a
  // quantitative channel measure, not a co-occurrence check on the seeding signal), and
  // from CONFLICT_DRAMATIC_TURN_VOID (turn scenes × rupture — different signal pair).
  if (records.length >= 8) {
    const clueScenes394a = (records as any[]).filter(r => ((r.seededClueIds ?? []) as string[]).length > 0);
    const conflictRecs394a = (records as any[]).filter(r =>
      ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
    );
    if (clueScenes394a.length >= 2 && conflictRecs394a.length >= 3) {
      const anyConflictSeeds394a = conflictRecs394a.some(r => ((r.seededClueIds ?? []) as string[]).length > 0);
      if (!anyConflictSeeds394a) {
        issues.push({
          location: 'Conflict scenes — clue-seeding decoupled',
          rule: 'CONFLICT_CLUE_DECOUPLED',
          severity: 'minor',
          description: `The story seeds ${clueScenes394a.length} clue(s), but none of the ${conflictRecs394a.length} conflict scenes (negative relationship shifts) plant anything — confrontations are closed events that wound without opening new threads. The highest-stakes scenes carry no forward narrative momentum: they terminate rather than seed, leaving the audience with damage but nothing to carry into the next scene.`,
          suggestedFix: 'Let at least one rupture plant a clue the audience will carry forward: the fight that exposes half a secret, the betrayal that names one conspirator but not the other, the severed bond that seeds an unanswered question. A conflict that seeds a clue turns damage into momentum — the wound becomes a thread.',
        });
      }
    }
  }

  // CONFLICT_PAYOFF_DECOUPLED (minor, n≥8, ≥2 conflict scenes, ≥2 payoff scenes):
  // Every payoff scene (payoffSetupIds non-empty) is relationally inert — the scenes
  // where planted setups are delivered contain no relational rupture. The story resolves
  // its foreshadowing in scenes where no bond breaks, missing the doubled impact of a
  // planted seed that blooms at the moment of maximum relational strain.
  // Distinct from CONFLICT_CLUE_DECOUPLED (seededClueIds — seeding, not delivering),
  // CONFLICT_REVELATION_DECOUPLED (revelation property vs. payoffSetupIds; revelation is a
  // specific scene annotation, payoff delivery is a separate seeding-pair signal), and the
  // Wave 352 peak-rupture audit (single-peak isolation, not co-occurrence mode).
  if (records.length >= 8) {
    const payoffScenes394b = (records as any[]).filter(r => ((r.payoffSetupIds ?? []) as string[]).length > 0);
    const conflictRecs394b = (records as any[]).filter(r =>
      ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
    );
    if (payoffScenes394b.length >= 2 && conflictRecs394b.length >= 2) {
      const payoffInConflict394b = payoffScenes394b.some(r =>
        ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
      );
      if (!payoffInConflict394b) {
        issues.push({
          location: 'Payoff scenes × conflict — decoupled',
          rule: 'CONFLICT_PAYOFF_DECOUPLED',
          severity: 'minor',
          description: `${payoffScenes394b.length} payoff scenes deliver planted setups, but none coincide with a relational rupture — the story resolves its foreshadowing in scenes where no bond breaks. Payoffs that cost nobody a relationship miss the doubled impact available when a planted seed blooms at the moment of maximum relational strain: the payoff lands, and so does the fracture.`,
          suggestedFix: 'Fuse at least one payoff with a rupture: the scene where a planted secret is finally disclosed or a foreshadowed threat is finally realized should also be the scene where a relationship reaches its breaking point. When payoff and rupture coincide, each makes the other land harder — the audience simultaneously gets what it was promised and loses what it feared losing.',
        });
      }
    }
  }

  // CONFLICT_RUPTURE_AFTERMATH_VOID (minor, n≥8, ≥1 major rupture): A major relational
  // rupture (single negative shift ≤ -0.5) is followed by 2 scenes where the same pair
  // registers no shift at all and both scenes are emotionally neutral — the wound lands
  // and the relationship goes silent. The rupture is inflicted and immediately absorbed as
  // though it registered in the ledger but in nobody's body.
  // Distinct from REVERSAL_WITHOUT_CONSEQUENCE (Wave 183: suspense reversal target, not
  // relational rupture; aftermath check is broad — any of emotion/clock/shift/suspense,
  // not per-pair silence), CONFLICT_RECOVERY_TOO_FAST (Wave 243: looks for fast positive
  // suspense recovery within 2 scenes — the opposite failure; this checks for NO follow-up
  // at all in the relationship channel), and RECONCILIATION_ABSENT (Wave 257: story-level
  // no-repair across the whole arc; this targets the immediate 2-scene aftermath per pair).
  if (records.length >= 8) {
    for (let i394c = 0; i394c < records.length - 2; i394c++) {
      const r394c = (records as any[])[i394c];
      const shifts394c = ((r394c.relationshipShifts ?? []) as Array<{ pairKey: string; amount: number }>);
      const majorRupture394c = shifts394c.find(s => s.amount <= -0.5);
      if (!majorRupture394c) continue;
      const afterScenes394c = (records as any[]).slice(i394c + 1, i394c + 3);
      const isVoid394c = afterScenes394c.length === 2 && afterScenes394c.every(a => {
        const pairShift = ((a.relationshipShifts ?? []) as Array<{ pairKey: string; amount: number }>)
          .find(s => s.pairKey === majorRupture394c.pairKey);
        return !pairShift && a.emotionalShift === 'neutral';
      });
      if (isVoid394c) {
        issues.push({
          location: `Scene ${r394c.sceneIdx} — rupture (${majorRupture394c.pairKey}, shift: ${majorRupture394c.amount.toFixed(2)})`,
          rule: 'CONFLICT_RUPTURE_AFTERMATH_VOID',
          severity: 'minor',
          description: `The major rupture between "${majorRupture394c.pairKey}" at Scene ${r394c.sceneIdx} (shift: ${majorRupture394c.amount.toFixed(2)}) is followed by 2 scenes where that pair has no further shifts and both scenes are emotionally neutral — the wound lands in a relational vacuum. The story inflicts the damage and the relationship goes silent: no echo, no recoil, no acknowledgement. When a rupture leaves the pair and the emotional register both unchanged for two consecutive scenes, the audience concludes the damage didn't really land.`,
          suggestedFix: 'Let the rupture echo in the next two scenes: a cold exchange between the pair, an emotional reaction that names what was lost, or a shift in that bond — even a tentative one — that confirms the wound registered. The scene after a major break is where the audience learns whether to believe the damage was real.',
        });
        break;
      }
    }
  }

  // ── Wave 408: CONFLICT_PEAK_REVELATION_ABSENT, CONFLICT_PEAK_PAYOFF_ABSENT, CONFLICT_PEAK_SEED_ABSENT ──
  // Extend the Wave 352/366 peak-rupture audit to the revelation, payoff, and clue-seed channels.
  // The "heaviest rupture" is the conflict scene with the largest single negative shift magnitude.
  if (records.length >= 8) {
    const conflictRecs408 = (records as any[]).filter(r =>
      ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
    );
    if (conflictRecs408.length >= 2) {
      let peakRec408: any = null;
      let peakMag408 = 0;
      for (const r of conflictRecs408) {
        const mag = Math.max(
          ...((r.relationshipShifts ?? []) as Array<{ amount: number }>)
            .filter(s => s.amount <= -0.3)
            .map(s => Math.abs(s.amount)),
        );
        if (mag > peakMag408) { peakMag408 = mag; peakRec408 = r; }
      }
      if (peakRec408) {
        // CONFLICT_PEAK_REVELATION_ABSENT: the heaviest rupture discloses nothing, even though
        // the story has revelations elsewhere — the biggest break surfaces no truth. Distinct
        // from CONFLICT_REVELATION_DECOUPLED (co-occurrence: NO rupture shares a scene with a
        // revelation; this can fire even when some lesser rupture does, as long as the PEAK
        // one does not) and the Wave 352/366 peak checks (other channels).
        const revScenes408 = (records as any[]).filter(r => r.revelation !== null && r.revelation !== undefined);
        if (revScenes408.length >= 2 && (peakRec408.revelation === null || peakRec408.revelation === undefined)) {
          issues.push({
            location: `Scene ${peakRec408.sceneIdx} — peak rupture (magnitude ${peakMag408.toFixed(2)})`,
            rule: 'CONFLICT_PEAK_REVELATION_ABSENT',
            severity: 'minor',
            description: `The story's heaviest bond-rupture (Scene ${peakRec408.sceneIdx}, magnitude ${peakMag408.toFixed(2)}) carries no revelation, even though the story discloses ${revScenes408.length} truths in other scenes. The single most consequential fracture surfaces nothing — the biggest break is not the moment a hidden truth comes out. When the peak conflict and the disclosure engine never coincide, the audience watches the deepest wound land without learning anything from it.`,
            suggestedFix: 'Let the heaviest rupture reveal something: the betrayal that exposes a long-held secret, the fight that forces a confession, the break that finally makes a buried truth speakable. A rupture that also discloses is doubly charged — the relationship breaks and the audience\'s understanding lurches forward in the same beat.',
          });
        }
        // CONFLICT_PEAK_PAYOFF_ABSENT: the heaviest rupture pays off no setup, even though the
        // story delivers payoffs elsewhere — the biggest break collects on no promise. Distinct
        // from CONFLICT_PAYOFF_DECOUPLED (co-occurrence: NO payoff scene carries a rupture; this
        // audits whether the single peak rupture is also a payoff).
        const payoffScenes408 = (records as any[]).filter(r => ((r.payoffSetupIds ?? []) as any[]).length > 0);
        if (payoffScenes408.length >= 2 && ((peakRec408.payoffSetupIds ?? []) as any[]).length === 0) {
          issues.push({
            location: `Scene ${peakRec408.sceneIdx} — peak rupture (magnitude ${peakMag408.toFixed(2)})`,
            rule: 'CONFLICT_PEAK_PAYOFF_ABSENT',
            severity: 'minor',
            description: `The story's heaviest bond-rupture (Scene ${peakRec408.sceneIdx}, magnitude ${peakMag408.toFixed(2)}) pays off no planted setup, even though ${payoffScenes408.length} other scenes deliver payoffs. The single biggest break collects on no promise the story made — the fracture that costs the most is not the one that resolves a thread the audience was tracking. The peak of relational damage and the peak of structural satisfaction never coincide.`,
            suggestedFix: 'Make the heaviest rupture pay something off: the break that hurts most should also be the moment a planted seed blooms — the foreshadowed betrayal arriving at last, the threat the audience was warned about finally severing the bond it threatened. A rupture that resolves a setup turns relational pain into structural catharsis.',
          });
        }
        // CONFLICT_PEAK_SEED_ABSENT: the heaviest rupture seeds no clue, even though the story
        // plants clues elsewhere — the biggest break opens no thread. Distinct from CONFLICT_
        // CLUE_DECOUPLED (co-occurrence: NO rupture seeds a clue; this audits whether the single
        // peak rupture seeds one).
        const seedScenes408 = (records as any[]).filter(r => ((r.seededClueIds ?? []) as any[]).length > 0);
        if (seedScenes408.length >= 2 && ((peakRec408.seededClueIds ?? []) as any[]).length === 0) {
          issues.push({
            location: `Scene ${peakRec408.sceneIdx} — peak rupture (magnitude ${peakMag408.toFixed(2)})`,
            rule: 'CONFLICT_PEAK_SEED_ABSENT',
            severity: 'minor',
            description: `The story's heaviest bond-rupture (Scene ${peakRec408.sceneIdx}, magnitude ${peakMag408.toFixed(2)}) seeds no clue, even though ${seedScenes408.length} other scenes plant threads. The single most consequential fracture opens nothing forward — the biggest break terminates a bond without leaving the audience a new question to carry. When the peak conflict plants no seed, the story's deepest wound generates no momentum.`,
            suggestedFix: 'Let the heaviest rupture plant a thread: the break that hurts most should also open a new unknown — the betrayal that hints at a wider conspiracy, the severed alliance that raises the question of who the protagonist can now trust. A rupture that seeds a clue turns an ending into a beginning, converting relational loss into forward pull.',
          });
        }
      }
    }
  }

  // ── Wave 422: CONFLICT_RUPTURE_CAUSE_VOID, CONFLICT_AFTERMATH_CURIOSITY_VOID, CONFLICT_PAIR_SHIFT_IMBALANCE ──

  // CONFLICT_RUPTURE_CAUSE_VOID (minor, n≥8, ≥2 conflict scenes): No conflict scene (negative
  // relationship shift ≤ -0.3) has an upstream cause in itself or the scene immediately before
  // it — no revelation, no dramatic turn, no clock raise, no seeded clue, and no prior positive
  // shift (which would create expectation and thus potential provocation). Every rupture in the
  // story arrives as an authorial decree: a bond breaks without any visible pressure that would
  // cause it to break. Audiences accept relational ruptures only when they can feel the force
  // that caused the break; ruptures without provocation read as arbitrary writer interventions
  // rather than as consequences of accumulating conflict. Backward-cause mode × rupture channel.
  // Distinct from DRAMATIC_TURN_WITHOUT_CAUSE (causality pass: turn scenes — not rupture scenes),
  // DEUS_EX_MACHINA (causality: late plot-closing revelation, not relationship rupture), and
  // CONFLICT_RUPTURE_AFTERMATH_VOID (Wave 394: the downstream aftermath of ruptures — this audits
  // the upstream provocation that precedes them).
  if (records.length >= 8) {
    const ruptureRecs422a = (records as any[]).filter(r =>
      ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
    );
    if (ruptureRecs422a.length >= 2) {
      const isDriver422a = (r: any): boolean =>
        r.revelation !== null ||
        (r.dramaticTurn ?? 'nothing') !== 'nothing' ||
        r.clockRaised === true ||
        ((r.seededClueIds ?? []) as any[]).length > 0 ||
        ((r.relationshipShifts ?? []) as any[]).some((s: any) => (s.amount ?? 0) > 0);
      const anyHasCause422a = ruptureRecs422a.some((r: any) => {
        const idx = (records as any[]).indexOf(r);
        return isDriver422a(r) || (idx > 0 && isDriver422a((records as any[])[idx - 1]));
      });
      if (!anyHasCause422a) {
        issues.push({
          location: `${ruptureRecs422a.length} conflict scene(s) — no upstream cause`,
          rule: 'CONFLICT_RUPTURE_CAUSE_VOID',
          severity: 'minor',
          description: `All ${ruptureRecs422a.length} of the story's conflict scenes (bond-ruptures ≤ -0.3) arrive without any upstream cause — no revelation, no dramatic turn, no deadline raised, no clue planted, no prior positive shift in themselves or the scene before. Every rupture is an authorial decree: bonds break without visible provocation. Audiences accept relational ruptures when they can feel the force that caused the break; without it, each fracture reads as an arbitrary writer intervention rather than as the consequence of accumulating pressure.`,
          suggestedFix: 'Give each rupture a cause in its own scene or the one before: a secret surfacing, a turn that changes the dynamic, a deadline that forces a choice, a planted threat that detonates. Relational fractures land as inevitable rather than arbitrary when the audience can trace the pressure that produced them — cause first, then break.',
        });
      }
    }
  }

  // CONFLICT_AFTERMATH_CURIOSITY_VOID (minor, n≥8, ≥2 conflict scenes): Every scene with a
  // major relationship rupture (≤ -0.3) is followed by two scenes where curiosityDelta ≤ 0 —
  // breaking bonds never opens new questions. When a relationship fractures, the audience should
  // immediately wonder: will it be repaired? Who caused this? What happens next between them?
  // A rupture that closes the curiosity channel in both of its subsequent scenes teaches the
  // audience that relational damage is a dead end rather than a story generator. Sequence/aftermath
  // mode × curiosity. Distinct from CONFLICT_RUPTURE_AFTERMATH_VOID (Wave 394: checks neutral
  // emotion and no relationship shift in the aftermath — the curiosity channel is NOT checked
  // there), CONFLICT_CURIOSITY_DECOUPLED (Wave 313: avg curiosityDelta of conflict scenes
  // themselves ≤ 0 — the scene of rupture, not the aftermath), and CURIOSITY_SPIKE_NO_FALLOUT
  // (causality pass: forward-looking — what FOLLOWS a curiosity spike; this is backward-looking
  // — what follows a rupture).
  if (records.length >= 8) {
    const ruptureRecs422b = (records as any[]).filter(r =>
      ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
    );
    if (ruptureRecs422b.length >= 2) {
      const allFlatAftermath422b = ruptureRecs422b.every((r: any) => {
        const idx = (records as any[]).indexOf(r);
        for (let off = 1; off <= 2; off++) {
          if (idx + off >= records.length) continue;
          if (((records as any[])[idx + off].curiosityDelta ?? 0) > 0) return false;
        }
        return true;
      });
      if (allFlatAftermath422b) {
        issues.push({
          location: 'All rupture aftermath scenes — curiosity flat',
          rule: 'CONFLICT_AFTERMATH_CURIOSITY_VOID',
          severity: 'minor',
          description: `Every bond-rupture in the story (${ruptureRecs422b.length} conflict scene(s)) is followed by two scenes with no curiosity rise — breaking bonds never opens new questions. When a relationship fractures, the audience should immediately wonder what happens next between those characters: will the bond be repaired, who is to blame, what secret now becomes speakable? Ruptures that generate no forward curiosity teach the audience that relational damage is a dead end rather than a generator of new story energy.`,
          suggestedFix: 'Let each rupture raise at least one question in the scene that follows: the character who was betrayed wonders whether to tell anyone; an alliance breaks and it is suddenly unclear who can be trusted; a wound opens and the audience is left wondering whether it will heal. Relational damage should create questions, not silence.',
        });
      }
    }
  }

  // CONFLICT_PAIR_SHIFT_IMBALANCE (minor, n≥8, ≥3 pairs with negative shifts): One relationship
  // pair accounts for more than 65% of the story's total negative-shift magnitude while at least
  // two other pairs also carry negative shifts. When the overwhelming majority of relational
  // damage concentrates in a single dyad, the story's conflict is structurally myopic: one
  // relationship bears the entire dramatic burden while other bonds are present but barely
  // stressed. The audience invests in the primary pair but has little relational concern for
  // anyone else. Average/aggregate × pair distribution. Distinct from CONFLICT_PAIR_DENSITY_GAP
  // (Wave 271: one pair's scene count is 3× any other — a scene-count ratio, not magnitude
  // proportion), RELATIONAL_SYMMETRY_ABSENT (one-sided reciprocity within a pair), and SINGLE_
  // REGISTER (all shifts in one emotional dimension regardless of pair).
  if (records.length >= 8) {
    const negShifts422c: Array<{ pairKey: string; mag: number }> = [];
    for (const r of records as any[]) {
      for (const s of (r.relationshipShifts ?? []) as any[]) {
        if ((s.amount ?? 0) < 0) negShifts422c.push({ pairKey: String(s.pairKey ?? 'unknown'), mag: Math.abs(s.amount) });
      }
    }
    const pairKeys422c = new Set(negShifts422c.map(s => s.pairKey));
    if (pairKeys422c.size >= 3) {
      const totalMag422c = negShifts422c.reduce((sum, s) => sum + s.mag, 0);
      const magByPair422c = new Map<string, number>();
      for (const s of negShifts422c) magByPair422c.set(s.pairKey, (magByPair422c.get(s.pairKey) ?? 0) + s.mag);
      let maxPairMag422c = 0;
      let maxPairKey422c = '';
      for (const [k, v] of magByPair422c) { if (v > maxPairMag422c) { maxPairMag422c = v; maxPairKey422c = k; } }
      if (maxPairMag422c / totalMag422c > 0.65) {
        issues.push({
          location: `Pair "${maxPairKey422c}" — ${Math.round(maxPairMag422c / totalMag422c * 100)}% of total conflict magnitude`,
          rule: 'CONFLICT_PAIR_SHIFT_IMBALANCE',
          severity: 'minor',
          description: `One relationship pair ("${maxPairKey422c}") accounts for ${Math.round(maxPairMag422c / totalMag422c * 100)}% of the story's total negative-shift magnitude, while ${pairKeys422c.size - 1} other pair(s) also carry conflict. When one dyad bears the overwhelming majority of relational damage, the story's conflict is structurally myopic: the audience invests in that pair but has little relational concern for anyone else, and the supporting bonds feel decorative rather than dramatically stressed.`,
          suggestedFix: `Distribute relational damage more evenly across the story's pairs: let the bonds outside "${maxPairKey422c}" carry some of the dramatic weight — a secondary trust broken, an alliance strained, a peripheral friendship that pays a cost for the story's central conflict. When multiple relationships are under pressure simultaneously, the audience's relational investment widens and the stakes feel structural rather than personal.`,
        });
      }
    }
  }

  // ── Wave 436: CONFLICT_POSITIVE_SPIRAL, CONFLICT_RUPTURE_SUSPENSE_VOID, CONFLICT_BREATHING_ROOM_ABSENT ──

  // CONFLICT_POSITIVE_SPIRAL (minor, n≥8, ≥2 ruptures, maxPositiveRun≥3): Three or more
  // consecutive scenes each carry at least one positive relationship shift, while the story
  // also has ≥2 rupture scenes (negative shift ≤ -0.3). The relational world warms for an
  // unbroken stretch of ≥3 scenes, removing dramatic friction from the relationship layer
  // for that span. Conflict lives in contrast: a bond improving matters only against a
  // background of bonds under stress. When the relational world enters a long uninterrupted
  // upswing, the audience loses its grip on tension — there is nothing relational to fear
  // breaking because everything is visibly warming. Run-based mode × positive-shift channel.
  // The complement of CONFLICT_RELENTLESS_RUN (Wave 313: ≥4 consecutive scenes with a
  // negative shift — the pressure mirror of this check) and NEGATIVE_SPIRAL_UNBROKEN (Wave
  // 285: same, negative direction). Distinct from ARC_RELATIONAL_POSITIVE_ONLY (character-arc
  // pass: ALL shifts globally are positive — this fires on a LOCAL run of warmth, not the
  // global absence of negativity) and ARC_POSITIVE_EMOTION_RUN (emotional shifts, not
  // relational shifts): this is the first positive-relational-run check in the conflict pass.
  if (records.length >= 8) {
    const ruptureCount436a = (records as any[]).filter(r =>
      ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => (s.amount ?? 0) <= -0.3),
    ).length;
    if (ruptureCount436a >= 2) {
      let maxPosRun436a = 0;
      let curPosRun436a = 0;
      let maxPosStart436a = -1;
      let curPosStart436a = -1;
      for (let i = 0; i < records.length; i++) {
        const hasPos = ((records as any[])[i].relationshipShifts ?? [] as any[]).some(
          (s: any) => (s.amount ?? 0) > 0,
        );
        if (hasPos) {
          if (curPosRun436a === 0) curPosStart436a = i;
          if (++curPosRun436a > maxPosRun436a) {
            maxPosRun436a = curPosRun436a;
            maxPosStart436a = curPosStart436a;
          }
        } else {
          curPosRun436a = 0;
        }
      }
      if (maxPosRun436a >= 3) {
        issues.push({
          location: `Scenes ${maxPosStart436a}–${maxPosStart436a + maxPosRun436a - 1} — positive relationship spiral`,
          rule: 'CONFLICT_POSITIVE_SPIRAL',
          severity: 'minor',
          description: `${maxPosRun436a} consecutive scenes (${maxPosStart436a}–${maxPosStart436a + maxPosRun436a - 1}) each carry a positive relationship shift while the story also has ${ruptureCount436a} rupture scenes. The relational world warms for ${maxPosRun436a} scenes without interruption. Conflict lives in contrast — a bond improving matters only against a background of bonds under stress. An extended upswing without friction teaches the audience that the relational world is safe, draining the tension from every scene in the spiral.`,
          suggestedFix: 'Interrupt the warmth: introduce a complication, a misunderstanding, or a small fracture within the positive spiral so the upswing feels earned against resistance rather than uncontested. A single scene of relational friction within the spiral makes the warmth around it feel more fragile and therefore more meaningful.',
        });
      }
    }
  }

  // CONFLICT_RUPTURE_SUSPENSE_VOID (minor, n≥8, ≥2 ruptures): Every scene with a major
  // relationship rupture (negative shift ≤ -0.3) is followed by two scenes where suspenseDelta
  // ≤ 0 — bond-breaking never escalates the story's tension. When a bond fractures the
  // audience expects stakes to rise: who did this, what will the protagonist do, what is now
  // at risk? When every rupture is followed by flat or declining suspense, the conflict layer
  // teaches the audience that breaking bonds has no escalatory consequence. Sequence/aftermath
  // mode × suspense channel. Parallel to CONFLICT_AFTERMATH_CURIOSITY_VOID (Wave 422: the
  // curiosity channel aftermath of ruptures), distinct from it by channel (suspenseDelta vs
  // curiosityDelta). Distinct from CONFLICT_SUSPENSE_DECOUPLED (Wave 285: average suspense
  // of conflict scenes themselves — this checks the AFTERMATH suspense, not the scene of
  // rupture itself) and CONFLICT_PEAK_SUSPENSE_ABSENT (Wave 352: the peak-rupture scene's
  // own suspenseDelta — single-peak, not aftermath): this is the first check to audit the
  // suspense channel in the two scenes following each rupture.
  if (records.length >= 8) {
    const ruptureRecs436b = (records as any[]).filter(r =>
      ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => (s.amount ?? 0) <= -0.3),
    );
    if (ruptureRecs436b.length >= 2) {
      const allFlatSusp436b = ruptureRecs436b.every((r: any) => {
        const idx = (records as any[]).indexOf(r);
        for (let off = 1; off <= 2; off++) {
          if (idx + off >= records.length) continue;
          if (((records as any[])[idx + off].suspenseDelta ?? 0) > 0) return false;
        }
        return true;
      });
      if (allFlatSusp436b) {
        issues.push({
          location: 'All rupture aftermath scenes — suspense flat',
          rule: 'CONFLICT_RUPTURE_SUSPENSE_VOID',
          severity: 'minor',
          description: `Every bond-rupture in the story (${ruptureRecs436b.length} conflict scene(s)) is followed by two scenes with no suspense rise — breaking bonds never escalates the story's tension. When a relationship fractures, the audience expects stakes to rise: who is responsible, what must the protagonist do next, what is now at risk? When every rupture is followed by flat or declining suspense, the conflict layer teaches the audience that breaking bonds has no escalatory consequence, and conflict loses its forward pull.`,
          suggestedFix: 'Let each rupture raise suspense in the scene that follows: make the cost of the broken bond immediately visible — a new vulnerability exposed, a protection lost, a counter-move the protagonist must now fear. Relational damage should make the world more dangerous, not quieter; the scene after the break should be the scene where the audience leans forward wondering what it means.',
        });
      }
    }
  }

  // CONFLICT_BREATHING_ROOM_ABSENT (minor, n≥10, ≥4 ruptures, maxGap≤1): The story has ≥4
  // rupture scenes and the maximum gap between any two consecutive ruptures is ≤1 non-rupture
  // scene — every bond-break is followed almost immediately by another. No two ruptures allow
  // the audience more than one scene of non-conflict before the next fracture. The audience
  // needs processing room between relational breaks: the scene that absorbs a rupture's
  // impact, where characters regroup and the audience registers what was lost, before the
  // next break arrives. When the gap is always ≤1 scene, the story delivers a sequence of
  // rapid-fire ruptures with no breathing space for any individual break to register as a
  // distinct emotional event — the audience numbs to conflict because it never stops.
  // Distribution/timing mode × rupture spacing. Distinct from CONFLICT_RELENTLESS_RUN (Wave
  // 313: ≥4 CONSECUTIVE rupture scenes with zero gap — this fires when the maximum gap is
  // ≤1, catching the case where ruptures are separated by exactly one calm scene rather than
  // being literally consecutive, a different population and a gentler but still problematic
  // distribution) and NEGATIVE_SPIRAL_UNBROKEN (Wave 285: ≥4 consecutive negative SHIFTS —
  // the same consecutive-run concept): BREATHING_ROOM_ABSENT fires when the maximum between-
  // rupture gap is ≤1, which CONFLICT_RELENTLESS_RUN never catches.
  if (records.length >= 10) {
    const rupturePositions436c: number[] = [];
    for (let i = 0; i < records.length; i++) {
      if (((records as any[])[i].relationshipShifts ?? [] as any[]).some((s: any) => (s.amount ?? 0) <= -0.3)) {
        rupturePositions436c.push(i);
      }
    }
    if (rupturePositions436c.length >= 4) {
      let maxGap436c = 0;
      for (let k = 1; k < rupturePositions436c.length; k++) {
        const gap = rupturePositions436c[k] - rupturePositions436c[k - 1] - 1;
        if (gap > maxGap436c) maxGap436c = gap;
      }
      if (maxGap436c <= 1) {
        issues.push({
          location: `${rupturePositions436c.length} ruptures — max gap ≤ ${maxGap436c} scene`,
          rule: 'CONFLICT_BREATHING_ROOM_ABSENT',
          severity: 'minor',
          description: `The story has ${rupturePositions436c.length} bond-ruptures and the maximum gap between any two consecutive ones is ${maxGap436c} non-conflict scene(s) — every rupture is followed almost immediately by another. The audience never gets more than one scene to absorb a break before the next fracture arrives. Without breathing room, individual ruptures lose their distinctiveness: the audience numbs to conflict because it never pauses, and what should be the sharpest relational breaks blend into an undifferentiated rhythm of damage.`,
          suggestedFix: 'Spread ruptures further apart: after a significant bond-break, allow at least two or three scenes before the next one. The scene that absorbs a rupture\'s impact — where characters regroup, where the audience registers what was lost — is not inert. It is where the audience internalizes the cost of the break, so the next fracture lands against that accumulated weight rather than in an already-numb environment.',
        });
      }
    }
  }

  // ── Wave 450: CONFLICT_CLOCK_AFTERMATH_VOID, CONFLICT_POSITIVE_EMOTION_RUPTURE, CONFLICT_RUPTURE_CLOCK_AFTERMATH_VOID ──

  // CONFLICT_CLOCK_AFTERMATH_VOID (minor, n≥8, ≥2 clock scenes): Every clock-raised scene is
  // followed by 2 scenes with no escalating conflict signal — no reversal (suspenseDelta < -1)
  // and no negative relationship shift (≤ -0.3) in either aftermath scene. The deadline is
  // raised but never detonates: after each clock tick the story returns to calm without the
  // crisis the deadline was supposed to force. When every clock raise is absorbed into silence,
  // the audience stops believing the ticking clock is real. Sequence/aftermath mode × clock
  // channel. Distinct from CONFLICT_CLOCK_DECOUPLED (Wave 338: audits whether clock scenes
  // carry relational conflict IN the same scene — this audits the 2 scenes FOLLOWING each clock
  // raise), THREAT_AMNESIA (Wave 158: clock not raised in second half — a zone/timing check, not
  // aftermath), CONFLICT_WITHOUT_DEADLINE (no clock at all — opposite failure): this is the first
  // check to audit what conflict follows each clock raise.
  if (records.length >= 8) {
    const clockRecs450a = (records as any[]).filter(r => r.clockRaised === true);
    if (clockRecs450a.length >= 2) {
      const isConflictSignal450a = (r: any): boolean =>
        (r.suspenseDelta ?? 0) < -1 ||
        ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3);
      const allSilentAftermath450a = clockRecs450a.every((r: any) => {
        const idx = (records as any[]).indexOf(r);
        for (let off = 1; off <= 2; off++) {
          if (idx + off >= records.length) continue;
          if (isConflictSignal450a((records as any[])[idx + off])) return false;
        }
        return true;
      });
      if (allSilentAftermath450a) {
        issues.push({
          location: `${clockRecs450a.length} clock scene(s) — all followed by silent aftermath`,
          rule: 'CONFLICT_CLOCK_AFTERMATH_VOID',
          severity: 'minor',
          description: `All ${clockRecs450a.length} clock-raised scene(s) are each followed by 2 scenes with no escalating conflict — no reversal, no negative relationship shift. The deadline is raised but never detonates: after each clock tick the story returns to calm without the crisis the clock was supposed to force. When every deadline is absorbed into silence, the audience stops believing the ticking clock is real and braces for nothing.`,
          suggestedFix: 'Let a clock raise trigger conflict in the immediate aftermath: a reversal that follows the deadline announcement, a relationship that fractures under the new urgency, or an antagonist action prompted by the ticking. The scene or two after a clock raise should be where the deadline bites — deadline pressure must translate into dramatic escalation, or the clock is scenery.',
        });
      }
    }
  }

  // CONFLICT_POSITIVE_EMOTION_RUPTURE (minor, n≥8, ≥3 conflict scenes): Every scene with a
  // negative relationship shift (≤ -0.3) carries a POSITIVE emotional shift — characters feel
  // good in every scene where a bond is breaking. The emotional and relational channels are
  // inverted: each confrontation that fractures a relationship is staged as a moment of elation,
  // triumph, or relief. The audience is told a bond is breaking while simultaneously seeing that
  // nobody minds — relational damage registered in the ledger but not in any character's body.
  // Co-occurrence mode × positive valence × rupture channel. Distinct from CONFLICT_EMOTION_
  // DECOUPLED (Wave 299: all-neutral emotionalShift in conflict scenes — a different valence
  // failure; neutral means nobody reacts, positive means everyone reacts in the wrong direction),
  // CONFLICT_SUSPENSE_DECOUPLED (suspense channel, not emotion), and POSITIVE_SPIRAL_TRAP (Wave
  // 210: a run of positive emotionalShift globally, not restricted to conflict scenes): this is
  // the first check to audit the positive-emotion/rupture inversion where every fight is staged
  // as a win.
  if (records.length >= 8) {
    const conflictRecs450b = (records as any[]).filter(r =>
      ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
    );
    if (conflictRecs450b.length >= 3 && conflictRecs450b.every(r => (r as any).emotionalShift === 'positive')) {
      issues.push({
        location: 'Conflict scenes — emotionally positive inversion',
        rule: 'CONFLICT_POSITIVE_EMOTION_RUPTURE',
        severity: 'minor',
        description: `All ${conflictRecs450b.length} conflict scenes (negative relationship shifts) carry a positive emotional shift — characters feel good in every scene where a bond is breaking. The emotional and relational channels are inverted: each confrontation that fractures a relationship is staged as elation, triumph, or relief. Relational damage appears in the ledger but in nobody's body; the audience is told bonds are breaking while seeing that nobody minds. When conflict is consistently wrapped in positive feeling, the ruptures lose their weight — the story cannot make the audience grieve what the characters seem to enjoy losing.`,
        suggestedFix: "Let conflict cost something emotionally: at least one scene where a bond fractures should leave the characters — and therefore the audience — feeling the loss, the anger, or the grief. A rupture staged in a positive emotional register reads as a victory or a relief, not as damage. The emotional channel and the relational channel should usually align in conflict scenes, not contradict each other.",
      });
    }
  }

  // CONFLICT_RUPTURE_CLOCK_AFTERMATH_VOID (minor, n≥8, ≥2 ruptures, ≥2 clock scenes): Every
  // scene with a negative relationship shift (≤ -0.3) is followed by 2 scenes with no clock
  // raised — bond-breaking never tightens the story's deadline. When a relationship fractures,
  // the audience expects the world to become more urgent as well as more damaged: the loss of an
  // ally should shorten the time available, a betrayal exposed should trigger a countdown.
  // When every rupture is followed by clock silence, breaking bonds has no temporal consequence —
  // the conflict engine and the urgency engine run on separate tracks. Sequence/aftermath mode ×
  // clock channel × rupture aftermath. Completes the aftermath-channel set alongside CONFLICT_
  // AFTERMATH_CURIOSITY_VOID (Wave 422: curiosity channel) and CONFLICT_RUPTURE_SUSPENSE_VOID
  // (Wave 436: suspense channel) — three aftermath checks, one per non-relational channel.
  // Distinct from CONFLICT_CLOCK_DECOUPLED (Wave 338: in-scene relational content of clock
  // raises — not aftermath) and THREAT_AMNESIA (Wave 158: timing of clock in second half,
  // not rupture-specific): requires ≥2 clock scenes to confirm the story uses urgency but
  // just not in the wake of its relational fractures.
  if (records.length >= 8) {
    const ruptureRecs450c = (records as any[]).filter(r =>
      ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
    );
    const clockScenes450c = (records as any[]).filter(r => r.clockRaised === true);
    if (ruptureRecs450c.length >= 2 && clockScenes450c.length >= 2) {
      const allDeadClockAftermath450c = ruptureRecs450c.every((r: any) => {
        const idx = (records as any[]).indexOf(r);
        for (let off = 1; off <= 2; off++) {
          if (idx + off >= records.length) continue;
          if ((records as any[])[idx + off].clockRaised === true) return false;
        }
        return true;
      });
      if (allDeadClockAftermath450c) {
        issues.push({
          location: 'All rupture aftermath scenes — clock silent',
          rule: 'CONFLICT_RUPTURE_CLOCK_AFTERMATH_VOID',
          severity: 'minor',
          description: `Every bond-rupture in the story (${ruptureRecs450c.length} conflict scene(s)) is followed by 2 scenes with no clock raised — breaking bonds never tightens the story's deadline. The loss of an ally, an exposed betrayal, or a severed bond should make the world more urgent as well as more damaged: relational fractures are supposed to close off options and shorten the time the protagonist has to act. The story uses ${clockScenes450c.length} clock-raising scenes but none fall in the wake of a rupture.`,
          suggestedFix: 'Let at least one rupture trigger a clock raise in the scene that follows: the betrayal that removes a protector and immediately shortens a deadline, the severed bond that forecloses the easiest escape and starts a countdown. Bond-breaking should make things more urgent — the scene after a rupture is where the audience should feel that the damage is also a timer.',
        });
      }
    }
  }

  // ── Wave 464: CONFLICT_RUPTURE_REVELATION_AFTERMATH_VOID, CONFLICT_RUPTURE_DRAMATIC_TURN_AFTERMATH_VOID, CONFLICT_PEAK_RUPTURE_UNCAUSED ──

  // CONFLICT_RUPTURE_REVELATION_AFTERMATH_VOID (sequence/aftermath × revelation channel, n≥8,
  // ≥2 ruptures, ≥2 revelations): Every scene with a negative relationship shift (≤ -0.3) is
  // followed by 2 scenes with no revelation, even though the story discloses truths elsewhere.
  // Bond-breaking never leads to discovery: a betrayal exposed, an alliance severed, or a trust
  // broken should crack something open — force a truth into the light in its wake. When every
  // rupture's aftermath is revelation-silent, the conflict engine and the disclosure engine run
  // on separate tracks: relationships fracture and truths surface, but a fracture never causes a
  // truth to surface.
  // Distinctness: CONFLICT_REVELATION_DECOUPLED (Wave 380) audits whether rupture scenes carry a
  // revelation IN THE SAME scene — this audits the 2 scenes FOLLOWING each rupture. Completes the
  // aftermath-channel set alongside CONFLICT_AFTERMATH_CURIOSITY_VOID (Wave 422), CONFLICT_RUPTURE_
  // SUSPENSE_VOID (Wave 436), and CONFLICT_RUPTURE_CLOCK_AFTERMATH_VOID (Wave 450) by adding the
  // revelation channel. Requires ≥2 revelations to confirm the story does disclose, just never in
  // the wake of a rupture.
  if (records.length >= 8) {
    const ruptureRecs464a = (records as any[]).filter(r =>
      ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
    );
    const revScenes464a = (records as any[]).filter(r => r.revelation !== null && r.revelation !== undefined);
    if (ruptureRecs464a.length >= 2 && revScenes464a.length >= 2) {
      const allRevSilentAftermath464a = ruptureRecs464a.every((r: any) => {
        const idx = (records as any[]).indexOf(r);
        for (let off = 1; off <= 2; off++) {
          if (idx + off >= records.length) continue;
          const next = (records as any[])[idx + off];
          if (next.revelation !== null && next.revelation !== undefined) return false;
        }
        return true;
      });
      if (allRevSilentAftermath464a) {
        issues.push({
          location: `${ruptureRecs464a.length} rupture aftermath(s) — no revelation within 2 scenes`,
          rule: 'CONFLICT_RUPTURE_REVELATION_AFTERMATH_VOID',
          severity: 'minor',
          description: `Every bond-rupture (${ruptureRecs464a.length} conflict scene(s)) is followed by 2 scenes with no revelation, even though the story discloses ${revScenes464a.length} truths elsewhere. Bond-breaking never leads to discovery: a betrayal exposed, an alliance severed, or a trust broken should crack something open and force a truth into the light in its wake. When every rupture's aftermath is revelation-silent, the conflict engine and the disclosure engine run on separate tracks — relationships fracture and truths surface, but a fracture never causes a truth to surface.`,
          suggestedFix: `Let at least one rupture detonate a revelation in its aftermath: the betrayal that, once it lands, forces a hidden truth out; the severed bond whose breaking exposes what was being concealed. A fracture that surfaces a discovery makes the conflict productive — the break is not just damage but the pressure that finally cracks something open.`,
        });
      }
    }
  }

  // CONFLICT_RUPTURE_DRAMATIC_TURN_AFTERMATH_VOID (sequence/aftermath × dramatic-turn channel,
  // n≥8, ≥2 ruptures, ≥2 turns): Every scene with a negative relationship shift (≤ -0.3) is
  // followed by 2 scenes with no dramatic turn, even though the story pivots elsewhere. A rupture
  // is a natural engine of reversal — the loss of an ally, the discovery of a betrayal, or the
  // collapse of a partnership should be able to turn the story's direction. When every fracture's
  // aftermath is turn-silent, bond-breaking is dramatically inert: relationships shatter but the
  // story's trajectory never bends because of it.
  // Distinctness: CONFLICT_DRAMATIC_TURN_VOID (Wave 367) audits whether rupture scenes carry a
  // dramatic turn IN THE SAME scene — this audits the 2 scenes FOLLOWING each rupture. Extends the
  // aftermath-channel set (curiosity/suspense/clock/revelation) with the dramatic-turn channel.
  // Distinct from CONFLICT_PEAK_DRAMATIC_TURN_ABSENT (Wave 394, single-peak in-scene check).
  // Requires ≥2 turns to confirm the story does pivot, just never in a rupture's wake.
  if (records.length >= 8) {
    const ruptureRecs464b = (records as any[]).filter(r =>
      ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
    );
    const turnScenes464b = (records as any[]).filter(r => (r.dramaticTurn ?? 'nothing') !== 'nothing');
    if (ruptureRecs464b.length >= 2 && turnScenes464b.length >= 2) {
      const allTurnSilentAftermath464b = ruptureRecs464b.every((r: any) => {
        const idx = (records as any[]).indexOf(r);
        for (let off = 1; off <= 2; off++) {
          if (idx + off >= records.length) continue;
          if (((records as any[])[idx + off].dramaticTurn ?? 'nothing') !== 'nothing') return false;
        }
        return true;
      });
      if (allTurnSilentAftermath464b) {
        issues.push({
          location: `${ruptureRecs464b.length} rupture aftermath(s) — no dramatic turn within 2 scenes`,
          rule: 'CONFLICT_RUPTURE_DRAMATIC_TURN_AFTERMATH_VOID',
          severity: 'minor',
          description: `Every bond-rupture (${ruptureRecs464b.length} conflict scene(s)) is followed by 2 scenes with no dramatic turn, even though the story pivots ${turnScenes464b.length} times elsewhere. A rupture is a natural engine of reversal — the loss of an ally, a betrayal discovered, or a partnership collapsing should be able to bend the story's direction. When every fracture's aftermath is turn-silent, bond-breaking is dramatically inert: relationships shatter but the trajectory of the story never changes because of it.`,
          suggestedFix: `Let at least one rupture trigger a dramatic turn in its aftermath: the broken alliance that forces the protagonist onto a new path, the betrayal that flips the goal, the severed bond that recasts what the story is about. A fracture that turns the story makes the relational damage consequential — the break does not just hurt, it redirects.`,
        });
      }
    }
  }

  // CONFLICT_PEAK_RUPTURE_UNCAUSED (single-peak isolation × backward-cause mode, n≥8, ≥2 ruptures,
  // peak at record position ≥1): The single heaviest rupture — the scene carrying the largest
  // negative relationship-shift magnitude — has no escalation (suspenseDelta > 0), revelation,
  // dramatic turn, or clock raise in either of the two scenes before it. The story's deepest
  // fracture arrives without preparation: the bond that breaks hardest does so with no rising
  // pressure, no precipitating discovery, and no pivot leading into it. A major rupture should be
  // the culmination of accumulating strain; when the biggest one appears from a calm run-up, it
  // reads as an authorial decree rather than the breaking point of a tension that was visibly
  // building.
  // Distinctness: CONFLICT_RUPTURE_CAUSE_VOID (Wave 422) audits ALL ruptures in aggregate against
  // their own scene or the single prior scene — this ISOLATES the single heaviest rupture and looks
  // back TWO scenes for a richer set of causal drivers. The CONFLICT_PEAK_* checks (Waves 352/366/
  // 394/408) audit the peak rupture's IN-SCENE channels (does the peak itself disclose, pivot,
  // etc.); this audits what PRECEDES the peak. First check in this pass to combine single-peak
  // isolation with backward-cause, paralleling ARC_PEAK_RELATIONAL_UNCAUSED in character-arc.ts.
  if (records.length >= 8) {
    let peakPos464c = -1;
    let peakMag464c = 0;
    for (let i = 0; i < records.length; i++) {
      const negMag = ((records as any[])[i].relationshipShifts ?? [] as Array<{ amount: number }>)
        .filter((s: { amount: number }) => s.amount < 0)
        .reduce((m: number, s: { amount: number }) => Math.max(m, Math.abs(s.amount)), 0);
      if (negMag > peakMag464c) { peakMag464c = negMag; peakPos464c = i; }
    }
    const ruptureCount464c = (records as any[]).filter(r =>
      ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
    ).length;
    if (peakPos464c >= 1 && peakMag464c >= 0.3 && ruptureCount464c >= 2) {
      let hasCause464c = false;
      for (let off = 1; off <= 2; off++) {
        const priorIdx = peakPos464c - off;
        if (priorIdx < 0) continue;
        const prior = (records as any[])[priorIdx];
        if ((prior.suspenseDelta ?? 0) > 0) hasCause464c = true;
        if (prior.revelation !== null && prior.revelation !== undefined) hasCause464c = true;
        if ((prior.dramaticTurn ?? 'nothing') !== 'nothing') hasCause464c = true;
        if (prior.clockRaised === true) hasCause464c = true;
      }
      if (!hasCause464c) {
        const peakRec464c = (records as any[])[peakPos464c];
        issues.push({
          location: `Scene ${peakRec464c.sceneIdx} — heaviest rupture (magnitude ${peakMag464c.toFixed(2)})`,
          rule: 'CONFLICT_PEAK_RUPTURE_UNCAUSED',
          severity: 'minor',
          description: `The story's heaviest rupture (Scene ${peakRec464c.sceneIdx}, negative-shift magnitude ${peakMag464c.toFixed(2)}) has no escalation, revelation, dramatic turn, or clock raise in either of the two scenes before it — the deepest fracture arrives without preparation. The bond that breaks hardest does so with no rising pressure, no precipitating discovery, and no pivot leading into it. A major rupture should be the culmination of accumulating strain; when the biggest one appears out of a calm run-up, it reads as an authorial decree rather than the breaking point of a tension the audience watched build.`,
          suggestedFix: `Build a gradient into the heaviest rupture: in the two scenes before the story's deepest fracture, plant the pressure that makes it inevitable — a rising suspense beat, a revelation that exposes the fault line, a turn that forces the confrontation, or a clock that makes the break unavoidable. The biggest break should land as the snap of a strain the audience felt tightening, not as a sudden severing from nowhere.`,
        });
      }
    }
  }

  // ── Wave 478: CONFLICT_RUPTURE_TEMPORAL_CLUSTER, CONFLICT_POSITIVE_EMOTION_AFTERMATH_VOID, CONFLICT_REPAIR_UNCAUSED ──
  const n478 = records.length;

  // CONFLICT_RUPTURE_TEMPORAL_CLUSTER — Distribution/timing × rupture channel (n≥8, ≥4 rupture
  // scenes, >75% in a single third). The story's bond-breaking events cluster in one structural
  // zone, leaving the other two-thirds without any relational friction. When ruptures concentrate
  // in one third, the conflict engine has only one gear in that zone and is absent from the others:
  // the audience experiences a zone of relentless fracture surrounded by relational peace.
  // Conflict works best when it punctuates all three structural phases — early ruptures establish
  // the stakes, mid-script ruptures escalate them, and late ruptures force the final reckoning.
  // Distinct from: CONFLICT_FIRST_HALF_MONOPOLY (Wave 338: >70% in first half — binary partition;
  // this uses thirds with a 75% threshold and fires when any third dominates, including the
  // middle or closing), CONFLICT_SECOND_HALF_MONOPOLY (Wave 380: binary second-half — same
  // limitation), CONFLICT_BREATHING_ROOM_ABSENT (Wave 436: spacing between consecutive ruptures
  // — a micro-window proximity check, not a zone-distribution check).
  if (n478 >= 8) {
    const rupturePositions478a = (records as any[])
      .map((r, pos) => ({
        pos,
        isRupture: ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount < 0),
      }))
      .filter(x => x.isRupture)
      .map(x => x.pos);
    if (rupturePositions478a.length >= 4) {
      const third478a = Math.floor(n478 / 3);
      const firstZ478a = rupturePositions478a.filter(p => p < third478a).length;
      const midZ478a = rupturePositions478a.filter(p => p >= third478a && p < 2 * third478a).length;
      const lastZ478a = rupturePositions478a.filter(p => p >= 2 * third478a).length;
      const maxZ478a = Math.max(firstZ478a, midZ478a, lastZ478a);
      if (maxZ478a / rupturePositions478a.length > 0.75) {
        const zone478a = firstZ478a === maxZ478a ? 'opening' : midZ478a === maxZ478a ? 'middle' : 'closing';
        issues.push({
          location: `${maxZ478a}/${rupturePositions478a.length} rupture scene(s) in the ${zone478a} third`,
          rule: 'CONFLICT_RUPTURE_TEMPORAL_CLUSTER',
          severity: 'minor',
          description: `${maxZ478a} of ${rupturePositions478a.length} rupture scenes (${(maxZ478a / rupturePositions478a.length * 100).toFixed(0)}%) fall within the ${zone478a} third — the conflict engine is architecturally ghettoized into one structural zone. The other two-thirds of the script pass without any relational friction: the audience experiences either relentless fracture (in the cluster zone) or relational peace (in the empty zones), but not the graduated escalation that makes conflict feel like a pressure building toward a reckoning. Ruptures distributed across all three structural phases accomplish different things: early ruptures establish the cost of the story's stakes, mid-script ruptures escalate and test the bonds that remain, and late ruptures force the final confrontation before resolution.`,
          suggestedFix: `Redistribute at least one or two ruptures into the zones currently without relational conflict. Even a smaller, earlier fracture — a moment of friction, betrayal, or withdrawal — seeds the zones currently empty of conflict and makes the whole arc feel like a sustained dramatic pressure rather than a burst surrounded by calm.`,
        });
      }
    }
  }

  // CONFLICT_POSITIVE_EMOTION_AFTERMATH_VOID — Sequence/aftermath × rupture × positive emotion
  // aftermath (n≥8, ≥3 qualifying major ruptures not in last 2 positions). Every major rupture
  // (negative shift ≤ -0.3) is followed by 2 scenes in which no positive emotional beat appears.
  // Bond-breaking never precedes any emotional recovery or relief: the aftermath of every fracture
  // is uniformly grim or neutral with no positive moment following in the near wake. Dramatic
  // ruptures are most affecting when they are part of a larger emotional arc — the break is felt,
  // reacted to, and eventually followed by some counter-movement, however brief or partial.
  // Distinct from: CONFLICT_AFTERMATH_CURIOSITY_VOID (Wave 422: rupture → no new curiosity),
  // CONFLICT_RUPTURE_SUSPENSE_VOID (Wave 436: rupture → no suspense rise), CONFLICT_RUPTURE_CLOCK_
  // AFTERMATH_VOID (Wave 450: rupture → no clock), CONFLICT_RUPTURE_REVELATION_AFTERMATH_VOID /
  // CONFLICT_RUPTURE_DRAMATIC_TURN_AFTERMATH_VOID (Wave 464: rupture → no revelation/turn) — all
  // the existing aftermath channels; this is the positive-emotion channel, completing the set by
  // checking whether ruptures are ever followed by any emotional brightening.
  if (n478 >= 8) {
    const majorRuptures478b = (records as any[]).filter(r =>
      ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
    );
    const qualRuptures478b = majorRuptures478b.filter(r => {
      const pos478b = records.findIndex(x => x.sceneIdx === r.sceneIdx);
      return pos478b >= 0 && pos478b < n478 - 2;
    });
    if (qualRuptures478b.length >= 3) {
      const allAftermathNonPositive478b = qualRuptures478b.every(r => {
        const pos478b = records.findIndex(x => x.sceneIdx === r.sceneIdx);
        for (let off = 1; off <= 2; off++) {
          const nextIdx478b = pos478b + off;
          if (nextIdx478b >= n478) break;
          if (((records as any[])[nextIdx478b].emotionalShift ?? 'neutral') === 'positive') return false;
        }
        return true;
      });
      if (allAftermathNonPositive478b) {
        issues.push({
          location: `${qualRuptures478b.length} major rupture aftermath(s) — no positive emotional beat within 2 scenes`,
          rule: 'CONFLICT_POSITIVE_EMOTION_AFTERMATH_VOID',
          severity: 'minor',
          description: `Every major rupture (${qualRuptures478b.length} qualifying bond-breaks) is followed by two scenes in which no positive emotion appears — bond-breaking is never followed by any emotional relief, recovery, or counter-movement. When every fracture's aftermath is uniformly grim or flat, the story's emotional world after a conflict is permanently depressed: there is no "exhale" after any break, no brief positive turn that shows the characters regrouping. Dramatic ruptures are most affecting when they trigger an arc in what follows — the break is felt, processed, and eventually tested against some moment of partial recovery or relief that shows whether anything survived.`,
          suggestedFix: `After at least one major rupture, introduce a positive emotional moment in the 2-scene aftermath: a character who finds brief relief, a moment of connection after the break, or a small triumph that carries the story forward despite the fracture. The positive moment doesn't neutralize the rupture — it creates the contrast that makes the break more costly by showing what was at stake.`,
        });
      }
    }
  }

  // CONFLICT_REPAIR_UNCAUSED — Backward-cause × positive relational shift (n≥8, ≥2 scenes with
  // positive relationship shifts, each at position ≥ 2). Every scene where a bond warms or repairs
  // has no major rupture, revelation, or dramatic turn in its 2 preceding scenes — reconciliations
  // and relational repairs are systematically spontaneous. A repaired bond is most dramatically
  // resonant when it is earned: preceded by a fracture that motivated the reckoning, a truth
  // revealed that changed the equation, or a pivot that forced the characters together. When every
  // repair arrives without a visible prior cause, reconciliations feel like authorial gifts rather
  // than dramatically earned resolutions of conflict.
  // Distinct from: CONFLICT_RUPTURE_CAUSE_VOID (Wave 422: backward-cause × ALL negative shifts —
  // audits ruptures as the effect; this audits POSITIVE SHIFTS as the effect), CONFLICT_PEAK_
  // RUPTURE_UNCAUSED (Wave 464: backward-cause × the single NEGATIVE peak — this checks ALL
  // positive shifts), ARC_RECONCILIATION_ABSENT (Wave 257: no broken bond ever repairs — that
  // checks absence of positive shift; here positive shifts exist but are systematically uncaused).
  if (n478 >= 8) {
    const posShiftScenes478c = (records as any[]).filter(r =>
      ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount > 0),
    );
    const qualPosShift478c = posShiftScenes478c.filter(r => {
      const pos478c = records.findIndex(x => x.sceneIdx === r.sceneIdx);
      return pos478c >= 2;
    });
    if (qualPosShift478c.length >= 2) {
      const allRepairsUncaused478c = qualPosShift478c.every(r => {
        const pos478c = records.findIndex(x => x.sceneIdx === r.sceneIdx);
        for (let off = 1; off <= 2; off++) {
          const priorIdx478c = pos478c - off;
          if (priorIdx478c < 0) continue;
          const prior478c = (records as any[])[priorIdx478c];
          if (((prior478c.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3)) return false;
          if (prior478c.revelation !== null && prior478c.revelation !== undefined) return false;
          if ((prior478c.dramaticTurn ?? 'nothing') !== 'nothing') return false;
        }
        return true;
      });
      if (allRepairsUncaused478c) {
        issues.push({
          location: `${qualPosShift478c.length} positive-shift scene(s) — no prior causal driver within 2 scenes`,
          rule: 'CONFLICT_REPAIR_UNCAUSED',
          severity: 'minor',
          description: `Every scene where a bond warms or repairs (${qualPosShift478c.length} positive relationship shifts) has no major rupture, revelation, or dramatic turn in the two preceding scenes — every reconciliation is systematically spontaneous. A repaired bond is most dramatically resonant when it is earned: preceded by a fracture that forced the reckoning, a truth revealed that changed the equation, or a pivot that brought the characters together. When every repair arrives without visible prior cause, reconciliation reads as an authorial gift rather than a hard-won dramatic resolution — the bonds warm for no reason the audience has watched unfold.`,
          suggestedFix: `Plant a causal driver before at least one positive relational shift: a fracture in the prior scene that the positive shift begins to resolve, a revelation that reframes who the characters are to each other, or a dramatic turn that forces them to cooperate. A repair earned by prior conflict or revelation makes the warming of the bond feel possible and meaningful; one that arrives from a calm run-up reads as sentiment rather than drama.`,
        });
      }
    }
  }

  // ── Wave 492: CONFLICT_DRAMATIC_TURN_REPAIR_DECOUPLED, CONFLICT_CLOSING_SUSPENSE_VOID, CONFLICT_CALM_STRETCH ──

  // CONFLICT_DRAMATIC_TURN_REPAIR_DECOUPLED (minor, n≥8, ≥2 turn scenes, ≥2 repair scenes):
  // Story pivots (scenes with a dramatic turn ≠ 'nothing') never coincide with a bond-warming
  // moment (positive relationship shift ≥ +0.3). When the plot turns, relationships stay cold;
  // when bonds warm, nothing structurally pivots. Structural pivots are most resonant when they
  // also shift the relational landscape — a turn that simultaneously warms a bond doubles its
  // impact. Distinctness: CONFLICT_DRAMATIC_TURN_VOID (Wave 338) audits turn scenes for absent
  // NEGATIVE shifts (pivots that don't crack bonds); this audits turn scenes for absent POSITIVE
  // shifts (pivots that don't heal bonds). CONFLICT_REPAIR_UNCAUSED (Wave 478) checks backward-
  // cause before repair scenes; this checks the IN-SCENE channel (turn present in same scene as
  // positive shift). First co-occurrence check joining the turn and positive-shift channels.
  {
    const n492a = records.length;
    if (n492a >= 8) {
      const turnScenes492a = (records as any[]).filter(r =>
        (r.dramaticTurn ?? 'nothing') !== 'nothing' && r.dramaticTurn !== '',
      );
      const repairScenes492a = (records as any[]).filter(r =>
        ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount >= 0.3),
      );
      if (turnScenes492a.length >= 2 && repairScenes492a.length >= 2) {
        const repairSceneIdxs492a = new Set(repairScenes492a.map((r: any) => r.sceneIdx));
        const anyTurnRepair492a = turnScenes492a.some((r: any) => repairSceneIdxs492a.has(r.sceneIdx));
        if (!anyTurnRepair492a) {
          issues.push({
            location: `${turnScenes492a.length} dramatic-turn scene(s) — no positive relationship shift`,
            rule: 'CONFLICT_DRAMATIC_TURN_REPAIR_DECOUPLED',
            severity: 'minor',
            description: `The story has ${turnScenes492a.length} dramatic-turn scene(s) and ${repairScenes492a.length} repair scene(s) (positive relationship shift ≥ +0.3) but none overlap — when the plot pivots, no bond warms, and when bonds warm, nothing pivots. Structural turns are most resonant when they also shift the relational landscape: a dramatic turn that simultaneously repairs a bond doubles its impact, making the story's pivot both a plot event and an emotional event. When the two engines run on entirely separate tracks, neither feels as consequential as it could — the turn is purely mechanical, the repair is purely sentimental.`,
            suggestedFix: `Let at least one dramatic-turn scene also carry a positive relationship shift: a pivot that reveals an ally was hiding their loyalty, a turn that forces two estranged characters to cooperate and warms their bond in the process, or a reversal that removes an external threat and allows a reconciliation. A turn and a repair happening in the same scene compound each other's dramatic weight.`,
          });
        }
      }
    }
  }

  // CONFLICT_CLOSING_SUSPENSE_VOID (minor, n≥9): The final third has no scene with a positive
  // suspenseDelta (no rising tension in the home stretch) while the first two-thirds contain
  // at least 2 such scenes. The climax approach carries no new escalating tension build —
  // suspense is generated in the opening and middle but then exhausted or absent as the story
  // moves toward resolution, leaving the finale without the visceral urgency of rising stakes.
  // Distinctness: ESCALATION_PLATEAU (Wave 144) compares first-half peak suspense vs second-half
  // average — an average-aggregate check; this is a zone check on the presence of any positive
  // suspense in the final third vs prior zones. CONFLICT_ACT3_ABSENT (Wave 257) audits the
  // final 25% for any conflict signal (suspense or relational); this is specifically escalating
  // suspense (positive suspenseDelta) in the final 33%. CLIMAX_APPROACH_FLAT audits the last
  // 3 scenes vs overall average; this audits the full final third for zero escalation instances.
  {
    const n492b = records.length;
    if (n492b >= 9) {
      const third492b = Math.floor(n492b / 3);
      const openMid492b = (records as any[]).slice(0, 2 * third492b);
      const closing492b = (records as any[]).slice(2 * third492b);
      const openMidPosSuspense492b = openMid492b.filter(r => (r.suspenseDelta ?? 0) > 0).length;
      const closingPosSuspense492b = closing492b.filter(r => (r.suspenseDelta ?? 0) > 0).length;
      if (openMidPosSuspense492b >= 2 && closingPosSuspense492b === 0) {
        issues.push({
          location: `Closing third (scenes ${2 * third492b}–${n492b - 1}) — no positive suspenseDelta`,
          rule: 'CONFLICT_CLOSING_SUSPENSE_VOID',
          severity: 'minor',
          description: `The final third of the story (scenes ${2 * third492b}–${n492b - 1}) contains no scene with rising suspense (positive suspenseDelta), even though ${openMidPosSuspense492b} suspense-escalating scene(s) exist in the opening and middle. The climax approach carries no new tension build — the home stretch generates no visceral urgency. Suspense is an audience-facing signal of mounting threat; when it vanishes in the final third while the earlier acts used it freely, the story's closing movement risks feeling like a release from tension rather than its peak. The final third should carry the story's highest sustained suspense, not its lowest.`,
          suggestedFix: `Introduce at least one scene in the final third that escalates suspense — a threat that tightens, a revelation that raises the stakes, a confrontation that forces the protagonist into a position with no easy exit. The closing act should feel like pressure accumulating toward an inevitable breaking point, not like a wind-down from the tensions the earlier acts established.`,
        });
      }
    }
  }

  // CONFLICT_CALM_STRETCH (minor, n≥10, ≥4 conflict scenes): The longest consecutive run of
  // non-conflict scenes (no rupture, no suspenseDelta < -1) reaches ≥5 scenes while the story
  // carries ≥4 overall conflict scenes. A sustained lull of 5+ scenes breaks the dramatic rhythm —
  // the audience loses the sense of accumulating pressure and the story feels like it has entered a
  // plateau. Run-based × non-conflict gap channel. Distinctness: CONFLICT_BREATHING_ROOM_ABSENT
  // (Wave 436) fires when the maximum INTER-RUPTURE gap is ≤1 (ruptures too close — no breathing
  // room); this fires when that gap is ≥5 (ruptures too far apart — too much calm). CONFLICT_
  // FIRST/SECOND_HALF_MONOPOLY (Waves 338/380) use a binary 70% threshold over halves; this
  // is a run-length check that fires regardless of where in the script the long calm falls, even
  // mid-script. CONFLICT_RUPTURE_TEMPORAL_CLUSTER (Wave 478) uses thirds distribution; this is
  // a consecutive-scene run count with a gap threshold, firing when any single stretch exceeds it.
  {
    const n492c = records.length;
    if (n492c >= 10) {
      const isConflict492c = (r: any): boolean =>
        ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3) ||
        (r.suspenseDelta ?? 0) < -1;
      const totalConflict492c = (records as any[]).filter(isConflict492c).length;
      if (totalConflict492c >= 4) {
        let maxGap492c = 0;
        let currentGap492c = 0;
        for (const r of records as any[]) {
          if (isConflict492c(r)) {
            currentGap492c = 0;
          } else {
            currentGap492c++;
            if (currentGap492c > maxGap492c) maxGap492c = currentGap492c;
          }
        }
        if (maxGap492c >= 5) {
          issues.push({
            location: `Non-conflict stretch — ${maxGap492c} consecutive calm scene(s)`,
            rule: 'CONFLICT_CALM_STRETCH',
            severity: 'minor',
            description: `The story's longest consecutive run of non-conflict scenes reaches ${maxGap492c} scenes (no bond-rupture, no reversal), while the script contains ${totalConflict492c} conflict scenes overall. A calm stretch of 5+ scenes breaks dramatic rhythm — the audience loses the sense of pressure accumulating toward a reckoning and the story feels like it has entered a plateau. While pacing requires breathing room between ruptures, a run this long signals that the conflict engine has stalled rather than paused: the protagonist is neither tested nor threatened for a substantial stretch of story, draining urgency from the surrounding arcs.`,
            suggestedFix: `Break the longest calm stretch with at least one conflict signal — a moment of friction, a negative relational beat, or a reversal that reminds the audience the story's stakes are still live. Even a minor confrontation or threat mid-stretch restores the sense that tension is still building rather than exhausted. The goal is not to eliminate breathing room, but to prevent any single stretch from growing long enough that the audience stops expecting the next rupture.`,
          });
        }
      }
    }
  }

  // ── Wave 506 checks ──────────────────────────────────────────────────────────

  // CONFLICT_RUPTURE_SEED_AFTERMATH_VOID — Sequence/aftermath × seed × rupture aftermath.
  // n≥8, ≥2 ruptures (negative shift ≤ -0.3) in the story, ≥2 seed scenes exist.
  // Every rupture is followed by 2 scenes with no seededClueIds → fire. Bond-breaking
  // never plants a clue that could foreshadow how the fracture will eventually be resolved.
  // When a bond breaks, the optimal narrative move is to seed a thread that shows the audience
  // a potential path to (or complication of) repair. When seeds never follow ruptures, the
  // conflict layer and the foreshadowing layer are causally disconnected: the story generates
  // wounds but plants no clues about their consequences.
  // Distinct from: CONFLICT_CLUE_DECOUPLED (Wave 394: co-occurrence × seededClueIds × rupture
  // IN THE SAME scene — same-scene absence, not aftermath absence), CONFLICT_RUPTURE_AFTERMATH_VOID
  // (Wave 394: aftermath × neutral emotion + no relational shift, not seed), CONFLICT_AFTERMATH_
  // CURIOSITY_VOID / CONFLICT_RUPTURE_SUSPENSE_VOID / CONFLICT_RUPTURE_CLOCK_AFTERMATH_VOID /
  // CONFLICT_RUPTURE_REVELATION_AFTERMATH_VOID / CONFLICT_RUPTURE_DRAMATIC_TURN_AFTERMATH_VOID /
  // CONFLICT_POSITIVE_EMOTION_AFTERMATH_VOID (all use different aftermath channels). This completes
  // the rupture-aftermath channel set by adding the seed foreshadowing channel.
  {
    const n506a = records.length;
    if (n506a >= 8) {
      const ruptureRecs506a = (records as any[]).filter(r =>
        ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
      );
      const totalSeeds506a = (records as any[]).filter(
        r => ((r.seededClueIds ?? []) as any[]).length > 0,
      ).length;
      if (ruptureRecs506a.length >= 2 && totalSeeds506a >= 2) {
        const allNoSeedAftermath506a = ruptureRecs506a.every((r: any) => {
          const idx = (records as any[]).indexOf(r);
          for (let off = 1; off <= 2; off++) {
            if (idx + off >= records.length) continue;
            if (((((records as any[])[idx + off] as any).seededClueIds ?? []) as any[]).length > 0) {
              return false;
            }
          }
          return true;
        });
        if (allNoSeedAftermath506a) {
          issues.push({
            location: `All ${ruptureRecs506a.length} rupture aftermath windows — no seeded clue`,
            rule: 'CONFLICT_RUPTURE_SEED_AFTERMATH_VOID',
            severity: 'minor',
            description: `Every bond-rupture in the story (${ruptureRecs506a.length} conflict scene(s)) is followed by two scenes in which no clue is planted, despite the story seeding ${totalSeeds506a} clue(s) elsewhere. Bond-breaking should generate foreshadowing — when a relationship fractures, the scenes that follow are the natural place to plant a clue about how that fracture might be resolved, complicated, or made permanent. When every rupture's aftermath is seed-free, the conflict layer and the foreshadowing layer run on completely separate tracks: wounds open but the story plants no thread about their future.`,
            suggestedFix: `After at least one rupture, seed a clue in the following scene that gestures toward the broken bond's future — an object that the estranged characters share, a piece of information that one character has that the other needs, or a hint about what repair might require. Foreshadowing in the wake of conflict is the most emotionally primed placement for a planted clue.`,
          });
        }
      }
    }
  }

  // CONFLICT_REVELATION_REPAIR_DECOUPLED — Co-occurrence × revelation × positive relationship shift.
  // n≥8, ≥2 revelation scenes (revelation not null/empty), ≥2 repair scenes (positive shift ≥ +0.3).
  // No scene has both a revelation and a positive relationship shift → fire. Truths never surface at
  // the same moment a bond heals — disclosures and reconciliations are always in separate scenes.
  // Revelations are the most natural catalyst for relational repair: learning a hidden truth can
  // resolve a misunderstanding, forgive a betrayal, or transform enmity into alliance. When the
  // two channels never co-occur, the story has revelations that don't move bonds toward warmth,
  // and repairs that don't come from understanding.
  // Distinct from: CONFLICT_REVELATION_DECOUPLED (Wave 380: revelation × RUPTURE co-occurrence —
  // checks whether ruptures and revelations share a scene, the NEGATIVE shift direction; this checks
  // the POSITIVE shift direction), CONFLICT_DRAMATIC_TURN_REPAIR_DECOUPLED (Wave 492: co-occurrence
  // × dramatic-turn × repair — different trigger channel), CONFLICT_REPAIR_UNCAUSED (Wave 478:
  // backward-cause before repair — checks what PRECEDES repair, not what co-occurs with it),
  // CONFLICT_RUPTURE_REVELATION_AFTERMATH_VOID (Wave 464: aftermath × revelation after a RUPTURE —
  // different direction and different temporal position). First co-occurrence check in this pass
  // joining the revelation channel with the positive-shift/repair channel.
  {
    const n506b = records.length;
    if (n506b >= 8) {
      const revScenes506b = (records as any[]).filter(
        r => r.revelation !== null && r.revelation !== '' && r.revelation !== undefined,
      );
      const repairScenes506b = (records as any[]).filter(r =>
        ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount >= 0.3),
      );
      if (revScenes506b.length >= 2 && repairScenes506b.length >= 2) {
        const repairSceneIdxs506b = new Set(repairScenes506b.map((r: any) => r.sceneIdx));
        const anyRevRepair506b = revScenes506b.some((r: any) => repairSceneIdxs506b.has(r.sceneIdx));
        if (!anyRevRepair506b) {
          issues.push({
            location: `${revScenes506b.length} revelation scene(s) and ${repairScenes506b.length} repair scene(s) — zero overlap`,
            rule: 'CONFLICT_REVELATION_REPAIR_DECOUPLED',
            severity: 'minor',
            description: `The story has ${revScenes506b.length} revelation scene(s) and ${repairScenes506b.length} bond-repair scene(s) (positive relationship shift ≥ +0.3) but none overlap — truths never surface at the same moment a bond heals. Revelations are the most natural catalyst for relational repair: a hidden truth that explains a betrayal, a disclosure that forgives a wound, or a secret that transforms an adversary into an ally. When disclosures and reconciliations always happen in separate scenes, neither gains the doubled dramatic impact of a scene where truth and healing arrive simultaneously.`,
            suggestedFix: `Let at least one revelation scene also carry a positive relationship shift — a scene where a character's honesty repairs a fractured bond, where a secret disclosed breaks down a wall between two people, or where the truth changes the relational temperature from cold to warm. Revelation-plus-repair scenes are among the most emotionally powerful structural beats in any screenplay.`,
          });
        }
      }
    }
  }

  // CONFLICT_REPAIR_CLOSING_ABSENT — Zone presence/absence × positive shift × closing third.
  // n≥9, ≥2 repair scenes (positive shift ≥ +0.3). None in the final structural third → fire.
  // The resolution zone contains no bond-warming. The protagonist crosses into the story's
  // climax with every fractured relationship still unrepaired. The closing act is where bonds
  // are expected to either resolve (repair or confirm rupture) or carry the story's final
  // emotional statement. When no positive relational shift appears in the final third, the
  // resolution is all wound — the audience is left without any relational counterpoint to the
  // accumulated damage, and the emotional arc ends on unrelieved conflict.
  // Distinct from: CONFLICT_CLOSING_SUSPENSE_VOID (Wave 492: zone × suspense — different channel,
  // audits escalating tension not bond-warming), CONFLICT_ACT3_ABSENT (Wave 257: any conflict
  // signal — ruptures or reversal — in final 25%; this fires on the ABSENCE of POSITIVE shift in
  // final THIRD, complementary zone coverage), CONFLICT_LATE_RELATIONAL_VOID in character-arc.ts
  // (final quarter, any shift direction; this is specifically positive-shift in final third),
  // CONFLICT_RELATIONAL_FRONT_LOADED / ARC_RELATIONAL_BACK_LOADED (different pass, distribution
  // mode across halves). First zone presence/absence check in this pass on the repair channel.
  {
    const n506c = records.length;
    if (n506c >= 9) {
      const third506c = Math.floor(n506c / 3);
      const repairPositions506c = (records as any[])
        .map((r, pos) => ({
          pos,
          isRepair: ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount >= 0.3),
        }))
        .filter(x => x.isRepair)
        .map(x => x.pos);
      if (repairPositions506c.length >= 2) {
        const anyInFinal506c = repairPositions506c.some(p => p >= 2 * third506c);
        if (!anyInFinal506c) {
          issues.push({
            location: `${repairPositions506c.length} repair scene(s) — none in the final third (scenes ${2 * third506c}–${n506c - 1})`,
            rule: 'CONFLICT_REPAIR_CLOSING_ABSENT',
            severity: 'minor',
            description: `The script has ${repairPositions506c.length} scene(s) with a positive relationship shift (bond-repair or bond-warming), but none falls in the final structural third (scenes ${2 * third506c}–${n506c - 1}). The closing act — where the story's emotional arc is meant to resolve — contains no relational healing. The protagonist crosses into the climax with every fractured relationship still unrepaired, leaving the resolution zone as pure wound. A screenplay's final third should carry at least the beginning of relational resolution: even a partial repair, a moment of acknowledged warmth, or an alliance restored can provide the emotional counterpoint that gives the climax its weight.`,
            suggestedFix: `Introduce at least one positive relationship shift in the final third — a small reconciliation, an alliance restored, or a moment of warmth between estranged characters. The repair need not be complete or permanent; even a partial thaw or a single moment of acknowledged warmth in the final act gives the audience the relational counterpoint that makes the climax emotionally complete rather than uniformly harsh.`,
          });
        }
      }
    }
  }

  // ── Wave 520 checks ───────────────────────────────────────────────────────
  {
    // CONFLICT_RUPTURE_PAYOFF_AFTERMATH_VOID — sequence/aftermath × payoff × rupture aftermath.
    // n≥8, ≥2 ruptures (negative shift ≤ -0.3), ≥2 payoff scenes (payoffSetupIds non-empty).
    // Every rupture is followed by 2 scenes with no payoff delivery → fire. Bond-breaking
    // never immediately precedes resolution of any planted promise: conflict and payoff always
    // run on separate timelines. When a bond fractures, the scenes that follow are the highest-
    // stakes moment to cash a planted promise — the wound is fresh and the audience is maximally
    // invested. When every rupture's aftermath is payoff-free, the conflict and foreshadowing
    // layers are causally disconnected.
    // Distinct from: CONFLICT_PAYOFF_DECOUPLED (Wave 394: co-occurrence × no payoff scene has
    // a rupture IN THE SAME scene — same-scene absence not aftermath absence), all other aftermath
    // checks (curiosity, suspense, clock, revelation, turn, positive-emotion, seed — different
    // aftermath channels). This completes the rupture-aftermath channel set.
    const n520a = records.length;
    if (n520a >= 8) {
      const ruptureRecs520a = (records as any[]).filter(r =>
        ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
      );
      const totalPayoffs520a = (records as any[]).filter(
        r => ((r.payoffSetupIds ?? []) as any[]).length > 0,
      ).length;
      if (ruptureRecs520a.length >= 2 && totalPayoffs520a >= 2) {
        const allNoPayoffAftermath520a = ruptureRecs520a.every((r: any) => {
          const idx = (records as any[]).indexOf(r);
          for (let off = 1; off <= 2; off++) {
            if (idx + off >= records.length) continue;
            if (((((records as any[])[idx + off] as any).payoffSetupIds ?? []) as any[]).length > 0) {
              return false;
            }
          }
          return true;
        });
        if (allNoPayoffAftermath520a) {
          issues.push({
            location: `All ${ruptureRecs520a.length} rupture aftermath windows — no payoff`,
            rule: 'CONFLICT_RUPTURE_PAYOFF_AFTERMATH_VOID',
            severity: 'minor',
            description: `Every bond-rupture in the story (${ruptureRecs520a.length} conflict scene(s)) is followed by two scenes in which no planted narrative promise is resolved, despite the story delivering ${totalPayoffs520a} payoff(s) elsewhere. When a bond fractures, the scenes that follow are the highest-stakes moment available to cash a planted promise — the audience is maximally invested and a payoff landing in that window doubles its impact. When every rupture's aftermath is payoff-free, conflict and narrative promise run on entirely separate tracks: wounds open in one part of the story and setups cash out in another, and neither amplifies the other.`,
            suggestedFix: `After at least one major rupture, introduce a payoff beat in the following scene — a planted promise that resolves at the moment of relational strain. This doesn't require a triumphant payoff; a threat that was foreshadowed now becoming real, a secret disclosed at exactly the wrong moment, or a resource running out when it was most needed all function as payoffs that land harder against the backdrop of the fresh fracture.`,
          });
        }
      }
    }
  }

  {
    // CONFLICT_REPAIR_FRONT_LOADED — distribution/timing × positive shift × first half.
    // n≥8, ≥4 repair scenes (positive shift ≥ +0.3). >70% fall in the first half while
    // the back half carries ≥1 → fire. Bond healing concentrated in the opening of the
    // story means the story spends its relational warmth early, leaving the climax zone
    // without the relational counterpoint that makes resolution resonate.
    // Distinct from: CONFLICT_REPAIR_CLOSING_ABSENT (Wave 506: zone × final third absence —
    // checks only the closing third, not the global first/second half distribution), ARC_
    // RELATIONAL_FRONT_LOADED in character-arc.ts (same distribution mode on the relational
    // channel but in a different pass; this check is specifically on positive shifts ≥ +0.3
    // in the conflict pass, anchored to the repair signal), CONFLICT_POSITIVE_EMOTION_
    // AFTERMATH_VOID (aftermath mode, not distribution). First distribution/timing check on
    // the repair channel in this pass.
    const n520b = records.length;
    const half520b = Math.floor(n520b / 2);
    const repairScenes520b = (records as any[]).map((r, i) => ({
      i,
      isRepair: ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount >= 0.3),
    })).filter(x => x.isRepair);
    if (n520b >= 8 && repairScenes520b.length >= 4) {
      const frontRepair520b = repairScenes520b.filter(x => x.i < half520b).length;
      const backRepair520b = repairScenes520b.length - frontRepair520b;
      const ratio520b = frontRepair520b / repairScenes520b.length;
      if (ratio520b > 0.70 && backRepair520b >= 1) {
        issues.push({
          location: `repair distribution: ${frontRepair520b} front / ${backRepair520b} back`,
          rule: 'CONFLICT_REPAIR_FRONT_LOADED',
          severity: 'minor',
          description: `${Math.round(ratio520b * 100)}% of the script's bond-repair scenes (${frontRepair520b} of ${repairScenes520b.length}) fall in the first half, leaving the second half with only ${backRepair520b}. A story where relational warmth is concentrated early exhausts its relational optimism before the climax — the audience enters the story's resolution zone without recent evidence that bonds can improve. The climax should be the moment when the question of relational repair is most urgent; instead, the story has already answered that question (and spent the warmth) in its opening movements.`,
          suggestedFix: `Redistribute repair scenes by moving or adding at least one positive relational shift into the second half — ideally near or in the climax zone. This need not be a complete reconciliation; a moment of acknowledged warmth, an alliance restored, or a small but genuine improvement in a key bond provides the relational counterpoint that makes the climax emotionally complete.`,
        });
      }
    }
  }

  {
    // CONFLICT_CURIOSITY_CLOSING_ZONE_ABSENT — zone presence/absence × curiosityDelta × closing third.
    // n≥9, ≥3 curiosity-positive scenes (curiosityDelta > 0), none in the final structural third → fire.
    // The story's wondering engine generates forward-pulling open questions throughout but goes
    // silent precisely in the closing act — where unresolved questions should be at their most
    // urgent and the audience's need to know should peak.
    // Distinct from: CONFLICT_CLOSING_SUSPENSE_VOID (Wave 492: zone × suspenseDelta × closing third —
    // different channel, tension vs. wonder), CONFLICT_REPAIR_CLOSING_ABSENT (Wave 506: zone ×
    // positive shift × closing third — different channel), CONFLICT_AFTERMATH_CURIOSITY_VOID (Wave
    // 422: aftermath × curiosity — different mode, this is a zone check not an aftermath check),
    // CONFLICT_RUPTURE_CURIOSITY_DECOUPLED (Wave 478: co-occurrence × curiosity × rupture — different
    // mode). First zone check on the curiosityDelta channel in this pass.
    const n520c = records.length;
    const third520c = Math.floor(n520c / 3);
    const curiosScenes520c = (records as any[]).filter(r => (r.curiosityDelta ?? 0) > 0);
    if (n520c >= 9 && curiosScenes520c.length >= 3) {
      const anyInFinal520c = (records as any[]).slice(2 * third520c).some(r => (r.curiosityDelta ?? 0) > 0);
      if (!anyInFinal520c) {
        issues.push({
          location: `final third (scenes ${2 * third520c}–${n520c - 1}): no curiosity rise`,
          rule: 'CONFLICT_CURIOSITY_CLOSING_ZONE_ABSENT',
          severity: 'minor',
          description: `The script raises curiosity in ${curiosScenes520c.length} scene(s) but none fall in the final structural third (scenes ${2 * third520c}–${n520c - 1}). The closing act is where unresolved questions should be at their most urgent — the audience's wondering should peak as the story approaches its resolution. When the curiosity channel goes silent precisely in the closing zone, the story answers its open questions (or simply stops raising new ones) before the climax, and the audience enters the resolution already knowing (or no longer wondering) rather than straining toward disclosure.`,
          suggestedFix: `Introduce at least one curiosity-raising beat in the final structural third — a partial disclosure that opens a new angle, a detail that reframes what the audience thought they understood, or an unanswered question that the climax must resolve. Wonder that peaks just before the ending is the most powerful engine for keeping the audience invested through the final scenes.`,
        });
      }
    }
  }

  // ── Wave 534: CONFLICT_CLOCK_RUPTURE_DECOUPLED, CONFLICT_RUPTURE_CURIOSITY_VOID,
  //              CONFLICT_CURIOSITY_FRONT_LOADED ──────────────────────────────────────────────────────

  // CONFLICT_CLOCK_RUPTURE_DECOUPLED — Co-occurrence/decoupling × clock × rupture.
  // n≥8, ≥2 clockRaised scenes, ≥2 rupture scenes (any relationshipShift with amount ≤ -0.3).
  // No scene is simultaneously a clock-raise and a rupture → fire. Deadline urgency and bond-
  // breaking are two of the strongest narrative pressure signals; when they never co-occur, time
  // pressure and relational fracture operate in completely separate structural zones of the story.
  // The scene where a deadline is raised is also the prime opportunity for a relationship to break
  // under pressure — clock and rupture together produce the most intense narrative compression.
  // When they are always decoupled, the story never puts a character in the position of having to
  // break a bond precisely as the clock ticks.
  // Distinct from: CONFLICT_REVELATION_DECOUPLED (co-occurrence × revelation × rupture — different
  // signal pair; this is the clock-channel completion of the co-occurrence decoupling family),
  // CONFLICT_CLOCK_ABSENT (checks whether the clock channel is used at all — not a decoupling check),
  // CONFLICT_CLOCK_AFTERMATH_VOID (Wave 450: aftermath mode × clock → rupture in next 2 scenes —
  // different mode and direction), and all other aftermath/zone checks that use clock as trigger.
  {
    const n534a = records.length;
    if (n534a >= 8) {
      const clockScenes534a = (records as any[]).filter(r => r.clockRaised === true);
      const ruptureScenes534a = (records as any[]).filter(r =>
        ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
      );
      if (clockScenes534a.length >= 2 && ruptureScenes534a.length >= 2) {
        const anyOverlap534a = clockScenes534a.some(r =>
          ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
        );
        if (!anyOverlap534a) {
          issues.push({
            location: `${clockScenes534a.length} clock-raised scene(s) and ${ruptureScenes534a.length} rupture scene(s) — no overlap`,
            rule: 'CONFLICT_CLOCK_RUPTURE_DECOUPLED',
            severity: 'minor',
            description: `The script has ${clockScenes534a.length} deadline-raising scene(s) and ${ruptureScenes534a.length} relationship-rupture scene(s), but these two channels never co-occur. Clock pressure and bond-breaking are two of the strongest narrative compression signals; when they always occupy separate scenes, the story's urgency and its relational conflict operate in completely isolated structural zones. The moment when a deadline is raised is the prime opportunity for a relationship to fracture under pressure — a character forced to break a bond precisely as the clock ticks is under the most dramatic compression a story can generate. When clock and rupture are always decoupled, the audience never experiences that double pressure.`,
            suggestedFix: `Introduce at least one scene where a deadline is raised and a bond simultaneously fractures — a confrontation about the ticking clock that destroys a trust, a choice made under time pressure that breaks a relationship, or an alliance that collapses as the clock runs out. Clock-and-rupture scenes are among the most dramatically dense moments in any story, and a single overlap between these two channels creates the kind of pressure that audiences find most gripping.`,
          });
        }
      }
    }
  }

  // CONFLICT_RUPTURE_CURIOSITY_VOID — Co-occurrence/decoupling × rupture × curiosityDelta.
  // n≥8, ≥2 rupture scenes (any relationshipShift with amount ≤ -0.3), ≥2 scenes with
  // curiosityDelta > 0. Every rupture scene has curiosityDelta ≤ 0 → fire. Bond-breaking never
  // simultaneously ignites wondering — fractures are informationally inert in the moment they
  // happen. A rupture scene is one of the most charged events in a story's emotional architecture;
  // it is also a natural source of new questions: why did this bond break, what does it mean for
  // what comes next, who is responsible? When every rupture has zero or negative curiosity, the
  // fracture is emotionally felt but epistemically closed — the audience mourns the break but is
  // not propelled into wondering about its consequences or causes.
  // Distinct from: CONFLICT_AFTERMATH_CURIOSITY_VOID (Wave 422: aftermath mode — checks the NEXT
  // 2 scenes' curiosity, not the rupture scene's OWN curiosityDelta; different analytical mode and
  // time slot), CONFLICT_CLUE_DECOUPLED (co-occurrence × rupture × seed — different correlated signal;
  // this is the curiosity-channel complement in the rupture co-occurrence family alongside revelation,
  // seed, payoff, and dramatic-turn). First co-occurrence check pairing rupture × curiosityDelta in
  // this pass.
  {
    const n534b = records.length;
    if (n534b >= 8) {
      const ruptureScenes534b = (records as any[]).filter(r =>
        ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
      );
      const curiosityScenes534b = (records as any[]).filter(r => (r.curiosityDelta ?? 0) > 0);
      if (ruptureScenes534b.length >= 2 && curiosityScenes534b.length >= 2) {
        const anyRuptureHasCuriosity534b = ruptureScenes534b.some(r => (r.curiosityDelta ?? 0) > 0);
        if (!anyRuptureHasCuriosity534b) {
          issues.push({
            location: `${ruptureScenes534b.length} rupture scene(s) — all have curiosityDelta ≤ 0 (${curiosityScenes534b.length} curiosity scene(s) exist elsewhere)`,
            rule: 'CONFLICT_RUPTURE_CURIOSITY_VOID',
            severity: 'minor',
            description: `The script has ${ruptureScenes534b.length} relationship-rupture scene(s) and ${curiosityScenes534b.length} curiosity-generating scene(s), but these two channels never co-occur. Every scene where a bond breaks or fractures has a curiosityDelta ≤ 0 — fractures are emotionally felt but informationally closed in the moment they happen. A rupture is not only an emotional event but a narrative one: why did this bond break? What does the break mean for what follows? Who is responsible, and can it be repaired? When ruptures never ignite wondering, the story misses the opportunity to make each fracture not just a wound but a question — turning damage into the engine that drives the audience forward.`,
            suggestedFix: `Introduce at least one rupture scene with a positive curiosityDelta: let the fracture open a mystery (who caused this, what was withheld that led to this break), introduce a new unanswered question that the rupture creates, or let the break reveal a layer of the situation that the audience did not understand before. The most powerful rupture scenes damage the characters AND make the audience desperate to know what happens next.`,
          });
        }
      }
    }
  }

  // CONFLICT_CURIOSITY_FRONT_LOADED — Distribution/timing × curiosityDelta × first half.
  // n≥8, ≥4 scenes with curiosityDelta > 0. >70% of those scenes fall in the first half while
  // the second half carries ≥1. The story's wondering engine exhausts itself before the climax —
  // curiosity is generated primarily in the opening movements and dwindles as stakes increase.
  // The most powerful question-opening should accelerate into and through the climax: the audience
  // needs to be asking questions when they need answers most urgently. When >70% of the curiosity
  // is front-loaded, the back half's escalating action occurs in a narrowing epistemic field.
  // Distinct from: CONFLICT_CURIOSITY_CLOSING_ZONE_ABSENT (Wave 520: zone presence/absence ×
  // closing third — fires when closing third has zero curiosity; this fires when global first-half
  // concentration exceeds 70%, regardless of which zone is empty), CONFLICT_REPAIR_FRONT_LOADED
  // (Wave 520: distribution × repair channel — positive relational shifts, not curiosity), ARC_
  // CURIOSITY_BACK_LOADED (Wave 533: distribution × curiosity × second half — opposite concentration;
  // that fires when back-half concentration exceeds 70%). First distribution/timing check on the
  // curiosity channel in this pass.
  {
    const n534c = records.length;
    const half534c = Math.floor(n534c / 2);
    const curiosityScenes534c = (records as any[]).filter(r => (r.curiosityDelta ?? 0) > 0);
    if (n534c >= 8 && curiosityScenes534c.length >= 4) {
      const frontCount534c = (records as any[]).slice(0, half534c).filter(r => (r.curiosityDelta ?? 0) > 0).length;
      const backCount534c = curiosityScenes534c.length - frontCount534c;
      const ratio534c = frontCount534c / curiosityScenes534c.length;
      if (ratio534c > 0.70 && backCount534c >= 1) {
        issues.push({
          location: `curiosity distribution: ${frontCount534c} front-half / ${backCount534c} back-half`,
          rule: 'CONFLICT_CURIOSITY_FRONT_LOADED',
          severity: 'minor',
          description: `${Math.round(ratio534c * 100)}% of the script's curiosity-generating scenes (${frontCount534c} of ${curiosityScenes534c.length}) fall in the first half, leaving the second half with only ${backCount534c}. The story's wondering engine exhausts itself before the climax — open questions accumulate in the opening movements then dwindle as the stakes should be intensifying. The most urgent need to know should arise as the story approaches resolution, not during the setup: the questions that make the audience desperate to reach the ending should be generated in or sustained into the second half. When curiosity is front-loaded, the back half's escalating conflict occurs in a narrowing epistemic field, with the audience already informed enough to stop wondering.`,
          suggestedFix: `Redistribute at least some curiosity-generating beats into the second half — a new angle on an existing mystery, a revelation that opens more questions than it answers, or a character action whose full meaning remains unclear until the very end. Sustained wonder through the climax zone is what keeps the audience invested not just in what happens next but in what it all means.`,
        });
      }
    }
  }

  // ── Wave 548: CONFLICT_PEAK_REPAIR_UNCAUSED, CONFLICT_CLOSING_CLOCK_ABSENT,
  //              CONFLICT_SEED_REPAIR_DECOUPLED ────────────────────────────────────────────────────

  // CONFLICT_PEAK_REPAIR_UNCAUSED — backward-cause × single-peak isolation × positive relational shift.
  // n≥8, ≥2 repair scenes (positive shift ≥ +0.3). The single most significant positive relationship
  // shift (the story's biggest reconciliation by magnitude) has no major rupture (shift ≤ -0.3),
  // revelation, dramatic turn, or clock raise in the two preceding scenes. The peak repair is
  // spontaneous: the most emotionally significant bond-warming in the entire story arrives without
  // visible cause. Reconciliations that come from nowhere feel unearned — the audience witnesses the
  // repair but has not been given the catalyst that makes it believable. Repairs need justification:
  // a revelation that dissolves a misunderstanding, a dramatic turn that removes an obstacle, a threat
  // that forces two estranged characters back together, or a rupture whose very extremity prompts
  // remorse and healing.
  // Distinct from: CONFLICT_REPAIR_UNCAUSED (Wave 478: backward-cause × ALL repair scenes in aggregate
  // — checks whether any of the repair scenes has a cause in prior 2 scenes; this isolates only the
  // single peak positive shift), CONFLICT_PEAK_RUPTURE_UNCAUSED (Wave 464: backward-cause × peak
  // RUPTURE — same backward-cause mode but on the negative shift direction), all CONFLICT_PEAK_*
  // checks (Wave 352/366/408: single-peak isolation but on different channels — those audit the peak
  // RUPTURE scene's in-scene channels, not the peak REPAIR scene's backward-cause). First check combining
  // single-peak isolation + backward-cause on the positive-shift / repair channel in this pass.
  {
    const n548a = records.length;
    if (n548a >= 8) {
      const repairScenes548a = (records as any[]).map((r, i) => ({
        r,
        i,
        mag: Math.max(
          0,
          ...((r.relationshipShifts ?? []) as Array<{ amount: number }>)
            .filter(s => s.amount >= 0.3)
            .map(s => s.amount),
        ),
      })).filter(x => x.mag > 0);
      if (repairScenes548a.length >= 2) {
        const peak548a = repairScenes548a.reduce((best, x) => x.mag > best.mag ? x : best);
        const peakIdx548a = peak548a.i;
        if (peakIdx548a >= 2) {
          const hasCause548a = [peakIdx548a - 2, peakIdx548a - 1].some(ci => {
            const c = (records as any[])[ci];
            return (
              ((c.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3) ||
              (c.revelation !== null && c.revelation !== '' && c.revelation !== undefined) ||
              ((c.dramaticTurn ?? 'nothing') !== 'nothing' && c.dramaticTurn !== '') ||
              c.clockRaised === true
            );
          });
          if (!hasCause548a) {
            issues.push({
              location: `Scene ${(records as any[])[peakIdx548a].sceneIdx} — peak repair (magnitude ${peak548a.mag.toFixed(2)})`,
              rule: 'CONFLICT_PEAK_REPAIR_UNCAUSED',
              severity: 'minor',
              description: `The story's most significant positive relationship shift (+${peak548a.mag.toFixed(2)}) at Scene ${(records as any[])[peakIdx548a].sceneIdx} has no rupture, revelation, dramatic turn, or clock raise in the two preceding scenes — the peak reconciliation arrives without visible cause. The most emotionally significant repair in the entire story should be the most earned: a disclosure that dissolves a misunderstanding, a turn that removes an obstacle, or a threat that forces estranged characters back together. A spontaneous peak repair reads as authorial convenience rather than character consequence.`,
              suggestedFix: 'Add a cause for the peak repair in the one or two scenes before it: a revelation that reframes what went wrong between the characters, a dramatic turn that changes the stakes so that the estrangement no longer makes sense, a shared threat that forces cooperation, or a rupture whose extremity prompts immediate remorse. The story\'s most important reconciliation should arrive as the most inevitable consequence.',
            });
          }
        } else if (peakIdx548a < 2) {
          // Peak repair is in scene 0 or 1 — inherently uncaused by script structure
          issues.push({
            location: `Scene ${(records as any[])[peakIdx548a].sceneIdx} — peak repair (magnitude ${peak548a.mag.toFixed(2)})`,
            rule: 'CONFLICT_PEAK_REPAIR_UNCAUSED',
            severity: 'minor',
            description: `The story's most significant positive relationship shift (+${peak548a.mag.toFixed(2)}) occurs at Scene ${(records as any[])[peakIdx548a].sceneIdx} — in the opening scenes, before any prior cause can exist. The peak reconciliation is the story's first event; repairs this early in a script have no buildup and no earned context.`,
            suggestedFix: 'Move the most significant repair later in the story so it can follow a visible cause — a revelation, a rupture, or a dramatic turn. The biggest reconciliation should arrive at the moment of maximum earned context, not at the opening.',
          });
        }
      }
    }
  }

  // CONFLICT_CLOSING_CLOCK_ABSENT — zone presence/absence × clockRaised × closing third.
  // n≥9, ≥2 clockRaised scenes in the first two-thirds of the story, none in the final structural
  // third (pos ≥ floor(n/3)*2). The story's deadline urgency goes silent exactly as the climax
  // approaches. The closing act needs clock pressure to feel urgent — without a ticking clock in the
  // final third, the climax must find urgency through other means while the dedicated urgency engine
  // (the deadline system) has been switched off. A clock that runs only through the setup and midpoint
  // then stops leaves the audience without the visceral time pressure that makes climax scenes feel
  // truly consequential. The escalating consequences of a deadline should peak in the closing zone,
  // not before.
  // Distinct from: THREAT_AMNESIA (Wave 158: clock raised in Act 1 [first 25%] but not in second half
  // [50%+] — different zone boundary and different trigger; this checks the closing THIRD specifically
  // and requires ≥2 clocks in the opening two-thirds, whereas THREAT_AMNESIA requires only one in Act 1
  // and fires if the second half has none at all), CONFLICT_CLOCK_DECOUPLED (Wave 338: co-occurrence ×
  // clock × relational content — checks whether clock scenes carry negative relationship shifts, not
  // whether they appear in the closing zone), CONFLICT_CLOCK_AFTERMATH_VOID (Wave 450: aftermath ×
  // clock → rupture in next 2 scenes — checks what follows a clock scene), CONFLICT_CLOCK_RUPTURE_
  // DECOUPLED (Wave 534: co-occurrence × clock × rupture — overlap check). First zone presence/absence
  // check on the clockRaised channel specifically in the closing third of this pass.
  {
    const n548b = records.length;
    if (n548b >= 9) {
      const third548b = Math.floor(n548b / 3);
      const clocksInFirstTwoThirds548b = (records as any[]).filter(
        (r, i) => i < 2 * third548b && r.clockRaised === true,
      ).length;
      if (clocksInFirstTwoThirds548b >= 2) {
        const anyClockInFinalThird548b = (records as any[]).slice(2 * third548b).some(
          (r: any) => r.clockRaised === true,
        );
        if (!anyClockInFinalThird548b) {
          issues.push({
            location: `final third (scenes ${2 * third548b}–${n548b - 1}): no clock raised`,
            rule: 'CONFLICT_CLOSING_CLOCK_ABSENT',
            severity: 'minor',
            description: `The story raises a clock (clockRaised) ${clocksInFirstTwoThirds548b} time(s) in its first two-thirds but never in the final structural third (scenes ${2 * third548b}–${n548b - 1}). The deadline urgency engine goes silent as the story approaches its climax. Without clock pressure in the closing act, the climax must find urgency through other means — and the visceral time-pressure that clock scenes create (the "or else" that makes every decision consequential) is absent at the moment the audience most needs to feel it. A clock that runs only through the setup and midpoint then stops forces the closing act to generate urgency without the story's strongest urgency tool.`,
            suggestedFix: 'Re-invoke the clock in the final third: escalate the deadline (a second, closer deadline), reveal a new consequence of failure, or show the original deadline expiring with immediate effect. The closing act is where all the ticking should culminate — the audience should feel time running out as the protagonist makes their last moves.',
          });
        }
      }
    }
  }

  // CONFLICT_SEED_REPAIR_DECOUPLED — co-occurrence × seededClueIds × positive relational shift.
  // n≥8, ≥2 seed scenes (seededClueIds non-empty), ≥2 repair scenes (any positive shift ≥ +0.3).
  // No scene has both a seeded clue AND a positive relationship shift → fire. The story plants clues
  // and warms bonds, but never in the same scene. A repair scene is a structurally powerful moment to
  // embed foreshadowing: the emotional warmth creates a false sense of security while the planted clue
  // signals future trouble, creating dramatic irony. Conversely, a seed planted at the moment of a
  // repair can hint that the reconciliation is fragile or that the restored bond will face a new test.
  // When seed and repair never co-occur, the foreshadowing layer and the relational-warmth layer run
  // on entirely separate tracks — neither is given the dramatic amplification of operating inside the
  // other.
  // Distinct from: CONFLICT_CLUE_DECOUPLED (Wave 394: co-occurrence × seed × rupture [NEGATIVE shift]
  // — same mode but the negative shift direction; this is the positive-shift complement, and the two
  // together cover both directions of the relational channel against the seed channel),
  // CONFLICT_RUPTURE_SEED_AFTERMATH_VOID (Wave 506: aftermath × seed after rupture — different temporal
  // mode, different trigger direction), CONFLICT_REVELATION_REPAIR_DECOUPLED (Wave 506: co-occurrence ×
  // revelation × repair — different signal pair; revelation vs. seed), CONFLICT_PAYOFF_DECOUPLED (Wave
  // 394: co-occurrence × payoff × rupture — payoff not seed). First co-occurrence check pairing the
  // seededClueIds channel with the positive-shift / repair channel in this pass.
  {
    const n548c = records.length;
    if (n548c >= 8) {
      const seedScenes548c = (records as any[]).filter(
        r => ((r.seededClueIds ?? []) as any[]).length > 0,
      );
      const repairScenes548c = (records as any[]).filter(r =>
        ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount >= 0.3),
      );
      if (seedScenes548c.length >= 2 && repairScenes548c.length >= 2) {
        const repairSceneIdxSet548c = new Set(repairScenes548c.map((r: any) => r.sceneIdx));
        const anySeedRepairOverlap548c = seedScenes548c.some((r: any) => repairSceneIdxSet548c.has(r.sceneIdx));
        if (!anySeedRepairOverlap548c) {
          issues.push({
            location: `${seedScenes548c.length} seed scene(s) and ${repairScenes548c.length} repair scene(s) — zero overlap`,
            rule: 'CONFLICT_SEED_REPAIR_DECOUPLED',
            severity: 'minor',
            description: `The story plants ${seedScenes548c.length} clue(s) and warms ${repairScenes548c.length} bond(s) (positive shift ≥ +0.3), but foreshadowing and relational healing never occur in the same scene. A repair scene is one of the most structurally powerful moments to embed a seed: the emotional warmth creates a false sense of security while the planted clue signals future trouble, building dramatic irony. Equally, a clue seeded at the moment of reconciliation can hint that the restored bond will face a new test — that the repair is incomplete or conditional. When seed and repair are always decoupled, the story misses the compound effect of foreshadowing planted inside a moment of relational warmth.`,
            suggestedFix: 'Introduce at least one scene where a positive relationship shift and a seeded clue co-occur: a reconciliation scene in which a detail is casually mentioned that will become important later, or a warming scene in which an object, phrase, or action foreshadows a future complication. Scenes where dramatic irony and emotional warmth combine are among the most effective structural placements for foreshadowing.',
          });
        }
      }
    }
  }

  // ── Wave 562: CONFLICT_REPAIR_DROUGHT_RUN, CONFLICT_REPAIR_EMOTION_DECOUPLED,
  //              CONFLICT_REPAIR_CURIOSITY_AFTERMATH_VOID ──────────────────────────────────────────

  // CONFLICT_REPAIR_DROUGHT_RUN — run-based × repair absence × valence (positive shift channel).
  // n≥10, ≥2 repair scenes (positive shift ≥ +0.3), longest consecutive run of non-repair scenes
  // is ≥6 → fire. The story's relational warmth goes dark for an extended consecutive stretch: six
  // or more scenes pass in a row with no bond healing, even though repairs exist elsewhere. A
  // run-based repair drought is distinct from a distribution skew — the repairs may be balanced
  // front-to-back across the script and still leave a long uninterrupted span where no bond ever
  // warms. When relational repair flatlines for a sixth of the runtime or more, the audience spends
  // a long stretch with no evidence that bonds can improve, and the relational hope the surrounding
  // repairs built dissipates before the next warming can recover it. The story's emotional texture
  // turns relentlessly cold for the duration of the drought.
  // Distinct from: CONFLICT_CALM_STRETCH (Wave 492: run-based × non-CONFLICT gap — ≥5 consecutive
  // scenes with no rupture/conflict signal; this audits absence of REPAIR specifically, the positive
  // direction, not absence of conflict), CONFLICT_POSITIVE_SPIRAL (Wave 436: run-based × ≥3
  // consecutive scenes each WITH a positive shift — the presence run, this is the absence run),
  // CONFLICT_RELENTLESS_RUN / CONFLICT_NEGATIVE_SPIRAL (Waves 313/285: run-based on the NEGATIVE
  // shift channel), CONFLICT_REPAIR_FRONT_LOADED (Wave 520: distribution/timing, not a consecutive
  // run). First run-based check auditing the ABSENCE of repair in this pass.
  {
    const n562a = records.length;
    if (n562a >= 10) {
      const repairCount562a = (records as any[]).filter(r =>
        ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount >= 0.3),
      ).length;
      if (repairCount562a >= 2) {
        let longestRun562a = 0;
        let currentRun562a = 0;
        for (const r of records as any[]) {
          const isRepair562a = ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(
            s => s.amount >= 0.3,
          );
          if (!isRepair562a) {
            currentRun562a++;
            if (currentRun562a > longestRun562a) longestRun562a = currentRun562a;
          } else {
            currentRun562a = 0;
          }
        }
        if (longestRun562a >= 6) {
          issues.push({
            location: `longest repair drought: ${longestRun562a} consecutive scenes with no bond healing`,
            rule: 'CONFLICT_REPAIR_DROUGHT_RUN',
            severity: 'minor',
            description: `The story contains a run of ${longestRun562a} consecutive scenes with no positive relationship shift (≥ +0.3) — an extended relational-warmth drought — even though ${repairCount562a} repair scene(s) exist across the script. Unlike a front-to-back distribution skew, this is a local dead zone: a sixth of the runtime or more passes in an unbroken stretch where no bond ever heals or warms. The audience spends a long uninterrupted span with no evidence that relationships can improve, and the relational hope the surrounding repairs built dissipates before the next warming can recover it. Relational warmth that is technically present in the script but absent for a long consecutive run leaves an extended cold stretch where the interpersonal world feels frozen.`,
            suggestedFix: `Break up the ${longestRun562a}-scene repair drought by seeding at least one positive relational beat into the middle of the run: a small reconciliation, an acknowledged moment of warmth, an alliance reaffirmed, or a bond that improves under pressure. The drought doesn't need a complete reconciliation — it needs enough relational warmth to keep the interpersonal world from feeling frozen across an extended stretch. A story sustains emotional texture by never letting bond-healing flatline for too long between its larger repairs.`,
          });
        }
      }
    }
  }

  // CONFLICT_REPAIR_EMOTION_DECOUPLED — co-occurrence/decoupling × repair × emotionalShift.
  // n≥8, ≥3 repair scenes (positive shift ≥ +0.3), ≥2 emotionally non-neutral scenes elsewhere
  // (proving the story CAN render feeling), every repair scene emotionally neutral → fire. Bonds
  // heal but the protagonist registers no feeling about any of them: every reconciliation, every
  // moment of relational warmth, passes without an emotional beat attached. Repair is one of the
  // most emotionally charged events available to a story — a broken bond restored should move the
  // protagonist visibly. When every repair scene is emotionally flat while emotion exists elsewhere,
  // the relational-warmth layer and the felt-emotion layer run on separate tracks: bonds mend in
  // scenes the protagonist experiences without affect, draining the reconciliations of the emotional
  // payoff that makes them land.
  // Distinct from: CONFLICT_EMOTION_DECOUPLED (Wave 299: co-occurrence × CONFLICT/rupture scenes ×
  // neutral emotion — audits the NEGATIVE shift / conflict scenes being neutral; this audits the
  // POSITIVE shift / repair scenes, the opposite relational direction), CONFLICT_POSITIVE_EMOTION_
  // RUPTURE (Wave 450: co-occurrence × rupture × POSITIVE emotion — inverted valence on the conflict
  // channel), ARC_RELATIONAL_SHIFT_EMOTION_FLAT in character-arc.ts (audits ALL relationship-shift
  // scenes regardless of direction in a different pass; this isolates repair scenes specifically in
  // the conflict pass). First co-occurrence check pairing the repair channel with emotional flatness.
  {
    const n562b = records.length;
    if (n562b >= 8) {
      const repairScenes562b = (records as any[]).filter(r =>
        ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount >= 0.3),
      );
      const repairIdxSet562b = new Set(repairScenes562b.map((r: any) => r.sceneIdx));
      const emotionalNonRepair562b = (records as any[]).filter(
        r =>
          !repairIdxSet562b.has(r.sceneIdx) &&
          r.emotionalShift !== 'neutral' &&
          r.emotionalShift !== null &&
          r.emotionalShift !== undefined &&
          r.emotionalShift !== '',
      ).length;
      if (repairScenes562b.length >= 3 && emotionalNonRepair562b >= 2) {
        const allRepairsNeutral562b = repairScenes562b.every(
          (r: any) =>
            r.emotionalShift === 'neutral' ||
            r.emotionalShift === null ||
            r.emotionalShift === undefined ||
            r.emotionalShift === '',
        );
        if (allRepairsNeutral562b) {
          issues.push({
            location: `${repairScenes562b.length} repair scene(s) — all emotionally neutral`,
            rule: 'CONFLICT_REPAIR_EMOTION_DECOUPLED',
            severity: 'minor',
            description: `All ${repairScenes562b.length} of the story's bond-repair scenes (positive shift ≥ +0.3) carry no emotional charge, even though ${emotionalNonRepair562b} other scene(s) render felt emotion. Repair is one of the most emotionally significant events available to a story — a broken bond restored, an estrangement healed, an alliance rebuilt should move the protagonist visibly. When every reconciliation is emotionally flat while emotion exists elsewhere, the relational-warmth layer and the felt-emotion layer run on separate tracks: bonds mend in scenes the protagonist experiences without affect. The audience watches the relationships improve but is given no emotional cue to feel the weight of the healing, draining the reconciliations of the payoff that makes them resonate.`,
            suggestedFix: `Attach an emotional beat to at least one repair scene: let the protagonist register relief, gratitude, joy, or even a complicated bittersweetness as a bond heals. The emotion need not be uncomplicated — a reconciliation tinged with lingering hurt is often more resonant than uncomplicated warmth — but the repair should move the protagonist visibly. A bond that mends while the protagonist feels nothing reads as a plot mechanic rather than an emotional event.`,
          });
        }
      }
    }
  }

  // CONFLICT_REPAIR_CURIOSITY_AFTERMATH_VOID — sequence/aftermath × repair → curiosity aftermath.
  // n≥8, ≥2 repair scenes (positive shift ≥ +0.3) not at the final position, ≥2 curiosity-positive
  // scenes globally (proving the wondering engine works), every repair followed by 2 scenes with
  // curiosityDelta ≤ 0 → fire. Reconciliation never opens new questions: every time a bond heals,
  // the scenes that follow raise no curiosity. A repair is a natural springboard for new wondering —
  // a restored alliance invites the question of what the reunited characters will now attempt; a
  // healed bond raises the question of whether it will hold. When repair aftermaths are uniformly
  // curiosity-flat while the story raises curiosity elsewhere, the relational-warmth engine and the
  // wondering engine never feed each other: reconciliations close emotional loops without opening
  // narrative ones, and the forward pull that a repair could generate is left untapped.
  // Distinct from: CONFLICT_AFTERMATH_CURIOSITY_VOID (Wave 422: aftermath × RUPTURE → curiosity —
  // same aftermath channel but the NEGATIVE shift trigger; this is the positive-shift / repair
  // complement, and together they cover both relational directions feeding the curiosity aftermath),
  // CONFLICT_REPAIR_FRONT_LOADED (Wave 520: distribution, not aftermath), CONFLICT_RUPTURE_CURIOSITY_
  // DECOUPLED (Wave 478: co-occurrence × curiosity IN the rupture scene — same-scene, not aftermath),
  // CONFLICT_CURIOSITY_CLOSING_ZONE_ABSENT (Wave 520: zone check, not aftermath). First aftermath
  // check using the repair signal as trigger in this pass.
  {
    const n562c = records.length;
    if (n562c >= 8) {
      const curiosityCount562c = (records as any[]).filter(r => (r.curiosityDelta ?? 0) > 0).length;
      const repairRecs562c = (records as any[])
        .map((r, i) => ({ r, i }))
        .filter(
          ({ r, i }) =>
            i < n562c - 1 &&
            ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount >= 0.3),
        );
      if (curiosityCount562c >= 2 && repairRecs562c.length >= 2) {
        const allCuriosityVoid562c = repairRecs562c.every(({ i }) => {
          for (let off = 1; off <= 2; off++) {
            const next = (records as any[])[i + off];
            if (next && (next.curiosityDelta ?? 0) > 0) return false;
          }
          return true;
        });
        if (allCuriosityVoid562c) {
          issues.push({
            location: `${repairRecs562c.length} repair scene(s) — none followed by a curiosity rise within 2 scenes`,
            rule: 'CONFLICT_REPAIR_CURIOSITY_AFTERMATH_VOID',
            severity: 'minor',
            description: `Every one of the story's ${repairRecs562c.length} bond-repair scenes (positive shift ≥ +0.3) is followed by two scenes with no curiosity rise, even though the story raises curiosity in ${curiosityCount562c} scene(s) elsewhere. A repair is a natural springboard for new wondering — a restored alliance invites the question of what the reunited characters will now attempt together; a healed bond raises the question of whether it will hold under the next pressure. When every reconciliation's aftermath is curiosity-flat, the relational-warmth engine and the wondering engine never feed each other: repairs close emotional loops without opening narrative ones, and the forward pull a reconciliation could generate is left untapped. The story heals bonds and raises questions in entirely separate moments.`,
            suggestedFix: `After at least one repair, let the next scene or two open a new question that the reconciliation makes possible: what the restored alliance will now risk together, whether the healed bond can survive a fresh test, or what the reunited characters will discover now that they are working as one. A reconciliation that opens a new question carries forward momentum; one that closes an emotional loop without opening a narrative one lets the story's energy dissipate at the moment a bond is restored.`,
          });
        }
      }
    }
  }

  // ── Wave 576: CONFLICT_CURIOSITY_ZONE_CLUSTER, CONFLICT_TURN_AFTERMATH_SUSPENSE_VOID,
  //              CONFLICT_REVELATION_DROUGHT_RUN ────────────────────────────────────────────────
  {
    // CONFLICT_CURIOSITY_ZONE_CLUSTER (distribution/timing × curiosityDelta × structural thirds,
    // n≥9, ≥3 curiosity-positive scenes [curiosityDelta>0], >75% of them fall in one structural
    // third): The story's question-opening beats are ghettoized into one structural zone while the
    // other two-thirds of the conflict arc are wonder-flat. A thirds-based cluster is finer-grained
    // than the closing-zone-absence check: a script can have curiosity present in the closing third
    // and still concentrate three-quarters of all wonder beats into, say, the opening third, leaving
    // the middle and late sections question-quiet. When curiosity is zoned into one stretch, the
    // conflict's mystery dimension reads as an early burst of wonder (or a late avalanche) rather
    // than a continuous thread of deepening questions sustaining the conflict through all three acts.
    // Distribution/timing mode × curiosity channel × structural thirds. Distinct from CONFLICT_
    // CURIOSITY_CLOSING_ZONE_ABSENT (Wave 520: zone-presence/absence × closing third — fires when
    // zero curiosity in the closing zone, regardless of concentration elsewhere), CONFLICT_AFTERMATH_
    // CURIOSITY_VOID (aftermath mode), CONFLICT_RUPTURE_CURIOSITY_DECOUPLED (co-occurrence mode).
    if (records.length >= 9) {
      const curiPos576a = (records as any[])
        .map((r, pos) => ({ r, pos }))
        .filter(({ r }) => (r.curiosityDelta ?? 0) > 0)
        .map(({ pos }) => pos);
      if (curiPos576a.length >= 3) {
        const third576a = Math.floor(records.length / 3);
        const z1Curi576a = curiPos576a.filter(p => p < third576a).length;
        const z3Curi576a = curiPos576a.filter(p => p >= 2 * third576a).length;
        const z2Curi576a = curiPos576a.length - z1Curi576a - z3Curi576a;
        const maxZ576a = Math.max(z1Curi576a, z2Curi576a, z3Curi576a);
        if (maxZ576a / curiPos576a.length > 0.75) {
          const zoneName576a = z1Curi576a === maxZ576a ? 'opening' : z3Curi576a === maxZ576a ? 'closing' : 'middle';
          issues.push({
            location: `curiosity spikes: ${z1Curi576a} opening / ${z2Curi576a} middle / ${z3Curi576a} closing third — ${Math.round(maxZ576a / curiPos576a.length * 100)}% in the ${zoneName576a} third`,
            rule: 'CONFLICT_CURIOSITY_ZONE_CLUSTER',
            severity: 'minor',
            description: `${Math.round(maxZ576a / curiPos576a.length * 100)}% of the conflict arc's ${curiPos576a.length} curiosity-spike scenes are concentrated in the ${zoneName576a} structural third, leaving the other two-thirds wonder-flat. The conflict's mystery dimension — the questions the escalating situation generates — is ghettoized into one zone rather than sustained across the full arc. When curiosity clusters in one stretch, the audience experiences a burst of wondering followed by a long question-quiet stretch rather than continuous deepening uncertainty. Effective conflict sustains wonder across all three structural zones: early questions establish what is at stake and unknown, middle questions deepen the mystery under pressure, and late questions hold the tension through the resolution.`,
            suggestedFix: `Redistribute curiosity spikes so that each structural third carries at least one moment where the conflict opens a new question. Move some of the ${zoneName576a} third's wonder beats into the underweight zones, or add new curiosity-generating moments in the question-quiet sections. The conflict is most gripping when it keeps generating new questions across its full arc — when the audience never knows whether they understand enough to predict the outcome.`,
          });
        }
      }
    }

    // CONFLICT_TURN_AFTERMATH_SUSPENSE_VOID (sequence/aftermath × dramatic turn → suspense aftermath,
    // n≥8, ≥2 qualifying dramatic-turn scenes [dramaticTurn !== 'nothing', pos < n-1], ≥2 suspense-
    // positive scenes globally, none of the qualifying turn scenes is followed by a suspenseDelta > 0
    // scene within the next 2 scenes): Every reversal or pivot in the conflict arc passes without
    // escalating the felt tension in its immediate aftermath — pivots restructure the situation but
    // never raise the stakes for the protagonist in the two scenes that follow. A dramatic turn is
    // a moment of structural reorientation: the conflict flips direction, new information changes
    // the meaning of prior events, or the protagonist's position is fundamentally altered. The
    // natural aftermath of a turn is heightened urgency — the protagonist's old position is gone
    // and the new situation demands a recalibration that should register as increased pressure.
    // When every turn's aftermath is suspense-flat, pivots function as pure plot mechanics rather
    // than as escalation events: the situation changes but the protagonist's felt danger does not
    // respond. Sequence/aftermath mode × dramatic turn trigger × suspense aftermath. Distinct from
    // CONFLICT_EMOTION_DECOUPLED (co-occurrence × dramatic turn × emotional state — same-scene
    // check on emotional channel), CONFLICT_CLOSING_SUSPENSE_VOID (zone × closing third × suspense
    // absence — zone-based not aftermath), CONFLICT_AFTERMATH_CURIOSITY_VOID (same aftermath
    // structure × curiosity channel — not suspense).
    if (records.length >= 8) {
      const qualTurns576b = (records as any[])
        .map((r, pos) => ({ r, pos }))
        .filter(({ r, pos }) =>
          (r.dramaticTurn ?? 'nothing') !== 'nothing' &&
          r.dramaticTurn !== '' &&
          pos < records.length - 1,
        );
      const suspScenes576b = (records as any[]).filter(r => (r.suspenseDelta ?? 0) > 0);
      if (qualTurns576b.length >= 2 && suspScenes576b.length >= 2) {
        const anyTurnAftermathSusp576b = qualTurns576b.some(({ pos }) => {
          const next1 = (records as any[])[pos + 1];
          const next2 = pos + 2 < records.length ? (records as any[])[pos + 2] : null;
          return (
            (next1 && (next1.suspenseDelta ?? 0) > 0) ||
            (next2 && (next2.suspenseDelta ?? 0) > 0)
          );
        });
        if (!anyTurnAftermathSusp576b) {
          issues.push({
            location: `${qualTurns576b.length} dramatic-turn scene(s) — none followed by a suspense rise within 2 scenes`,
            rule: 'CONFLICT_TURN_AFTERMATH_SUSPENSE_VOID',
            severity: 'minor',
            description: `None of the conflict's ${qualTurns576b.length} dramatic-turn scenes is followed by a positive suspenseDelta within the next two scenes, even though ${suspScenes576b.length} suspense-rise scenes exist elsewhere in the script. A dramatic turn is a moment of structural reorientation — the conflict flips direction, the protagonist's position changes, the meaning of prior events is restructured — and the natural aftermath is heightened urgency: the new situation demands a recalibration the protagonist has not yet completed, and that gap is where felt pressure should rise. When every pivot's aftermath is suspense-flat, turns function as pure plot mechanics: the situation changes but the protagonist's danger does not register in the two scenes immediately following the reversal. The conflict pivots without escalating.`,
            suggestedFix: `After at least one dramatic turn, let the next one or two scenes carry a positive suspenseDelta that the new configuration generates — the heightened danger of a restructured situation, the pressure of the protagonist's revised position, or the urgency of having to respond to a conflict that has just changed shape. A turn that raises tension in its aftermath does more than restructure: it escalates. The audience, having just seen the conflict's direction change, experiences that change as increased pressure rather than as a neutral repositioning.`,
          });
        }
      }
    }

    // CONFLICT_REVELATION_DROUGHT_RUN (run-based × revelation × absence, n≥10, ≥2 revelation scenes
    // globally, longest consecutive run of scenes with no revelation ≥ 7): The conflict arc's
    // information-disclosure engine goes silent for an extended consecutive stretch — seven or more
    // scenes pass without a revelation, even though disclosure moments exist elsewhere. Revelations
    // in a conflict arc are the mechanism by which hidden truths emerge under pressure: they reframe
    // the conflict's meaning, expose hidden causes and motivations, and generate the kind of
    // irrevocable knowledge that forces the characters into new positions. When revelations are absent
    // for an extended run, the conflict advances through event-and-reaction sequences without any new
    // hidden truth becoming known — the audience watches the conflict escalate without their
    // understanding of it deepening. A long revelation drought means the conflict's epistemic
    // dimension flatlines for a significant stretch: no hidden cause surfaces, no motivation is
    // exposed, no previously misunderstood fact becomes clear. Run-based mode × revelation absence.
    // Distinct from CONFLICT_CURIOSITY_CLOSING_ZONE_ABSENT (zone × closing third — fixed zone not
    // sliding run), CONFLICT_REPAIR_DROUGHT_RUN (Wave 562: run-based × repair absence — different
    // channel), CONFLICT_RUPTURE_CURIOSITY_DECOUPLED (co-occurrence × same-scene — not run-based).
    if (records.length >= 10) {
      const revealScenes576c = (records as any[]).filter(
        r => r.revelation !== null && r.revelation !== undefined && r.revelation !== '',
      );
      if (revealScenes576c.length >= 2) {
        let longestDrought576c = 0;
        let cur576c = 0;
        for (const r of records as any[]) {
          if (r.revelation === null || r.revelation === undefined || r.revelation === '') {
            cur576c++;
            if (cur576c > longestDrought576c) longestDrought576c = cur576c;
          } else {
            cur576c = 0;
          }
        }
        if (longestDrought576c >= 7) {
          issues.push({
            location: `longest revelation drought: ${longestDrought576c} consecutive scenes without a disclosure`,
            rule: 'CONFLICT_REVELATION_DROUGHT_RUN',
            severity: 'minor',
            description: `The conflict arc contains a run of ${longestDrought576c} consecutive scenes with no revelation — an extended disclosure drought — even though ${revealScenes576c.length} revelation scenes exist elsewhere. Revelations are the mechanism by which hidden truths emerge under pressure: they reframe the conflict, expose hidden motivations, and generate the irrevocable knowledge that forces characters into new positions. An unbroken stretch of ${longestDrought576c} revelation-free scenes means the conflict advances through action and reaction for an extended run without any new hidden truth coming to light — the audience watches the situation escalate without their understanding of it deepening. The conflict's epistemic dimension flatlines: no cause surfaces, no motivation is exposed, no misunderstood fact becomes clear during the drought.`,
            suggestedFix: `Break up the ${longestDrought576c}-scene revelation drought by surfacing at least one hidden truth within the run — a motivation exposed, a cause disclosed, a previously misunderstood fact clarified. The revelation doesn't need to be dramatic: a small disclosure that recontextualizes even one detail deepens the audience's understanding of the conflict and prevents the extended run from feeling like pure event-and-reaction without epistemic dimension. A conflict that periodically reveals something new keeps the audience's understanding evolving alongside the escalating situation.`,
          });
        }
      }
    }
  }

  const { revised, usedLLM } = await rewritePass({ fountain, issues, passName: 'conflict', approvedSpans, storyContext: input.storyContext, priorPassResults: input.priorPassResults });
  const changed = revised !== fountain;

  return {
    pass: 'conflict',
    issues,
    revisedFountain: revised,
    changed,
    summary: issues.length === 0
      ? 'Conflict pass: escalation is healthy'
      : `Conflict pass: ${issues.length} issue(s) — ${usedLLM ? 'rewritten' : 'flagged (stub mode)'}`,
  };
}

/** Per-scene conflict signal vector used by the Wave 214 conflict-dynamics checks.
 *  Conflict is modelled as a pressure system: each scene either ADDS external pressure
 *  (rising suspense, a tightening clock), RELEASES it (a reversal that drops suspense),
 *  or inflicts INTERPERSONAL damage (a relationship deteriorating). Decomposing the
 *  signals this way lets the checks reason about the rhythm of escalation and release,
 *  the spatial distribution of conflict mass, and the trend of reversal magnitude —
 *  none of which are visible from a single suspenseDelta threshold. */
interface SceneConflictSignal {
  /** External pressure added this scene: rising suspense + tightening clock */
  escalation: number;
  /** Tension released this scene: a drop in suspense (a reversal/relief valve) */
  release: number;
  /** Interpersonal damage magnitude: summed |amount| of negative relationship shifts */
  interpersonal: number;
  /** Total conflict magnitude concentrated in this scene */
  mass: number;
  /** Whether this scene is a genuine reversal (suspense drops by more than 1) */
  isReversal: boolean;
  /** Magnitude of the reversal (|suspenseDelta|) when this scene is a reversal, else 0 */
  reversalMag: number;
}

function computeConflictDynamics(records: PassInput['records']): SceneConflictSignal[] {
  return records.map((r: any) => {
    const sd = r.suspenseDelta ?? 0;
    const cd = r.clockDelta ?? 0;
    const negRel = ((r.relationshipShifts ?? []) as Array<{ amount: number }>)
      .filter(s => s.amount < 0)
      .reduce((a, s) => a + Math.abs(s.amount), 0);
    const escalation = Math.max(sd, 0) + Math.max(cd, 0);
    const release = Math.max(-sd, 0);
    const interpersonal = negRel;
    const mass = escalation + 2 * interpersonal;
    const isReversal = sd < -1;
    const reversalMag = isReversal ? Math.abs(sd) : 0;
    return { escalation, release, interpersonal, mass, isReversal, reversalMag };
  });
}
