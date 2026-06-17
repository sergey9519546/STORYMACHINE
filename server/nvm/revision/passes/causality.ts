// Wave 39 — Pass 2: Causality
// Checks for causal logic breaks: consequences without causes, orphaned facts,
// belief reversals without explanation.
// Wave 141 additions: motivation coherence (unmotivated decisions, abandoned goals)
// and action consequence (character actions that fail to affect plot or relationships).
// Wave 155 additions: deus ex machina (late revelation closing the plot with no
// setup), suspense spike without cause (sudden danger with no escalation), and
// goal-conflict absence (protagonist goal never opposed by another force).
// Wave 254 additions: clue-seed cluster (3+ clues planted in one scene), payoff
// without setup (callback to an unseeded thread), and suspense plateau flatline
// (4+ consecutive scenes of flat tension).
// Wave 268 additions: curiosity front loaded (all mystery spikes in first half),
// payoff back loaded (all callbacks deferred to second half),
// clock single scene (only one deadline raised in a long story).
// Wave 282 additions: clock clustering (all clocks in first 40%), revelation
// cascade (>35% of scenes contain a revelation), emotional positive desert
// (Act 2 has negative/neutral but never positive while positive exists elsewhere).
// Wave 296 additions: clock delta without raise (time-pressure effects before any
// clock is established), suspense sawtooth (tension strictly alternates sign for
// 6+ scenes without accumulating), dramatic turn aftermath void (a reversal scene
// followed by two scenes with zero emotional, suspense, or relational ripple).
// Wave 310 additions: emotion without driver run (3+ consecutive non-neutral scenes
// with no suspense/relational/revelation/clock driver), clock relief unexplained (a
// clockDelta<0 release with no revelation or payoff to cause it), dramatic turn
// cluster (3+ dramatic turns within a three-scene window).
// Wave 324 additions: suspense unreleased run (6+ consecutive scenes all raise tension
// with no release valley), clock raised no delta (≥2 clock raises with clockDelta 0 —
// cosmetic deadlines), emotional neutral run (6+ consecutive emotionally neutral scenes).
// Wave 335 additions: payoff curiosity decoupled (payoff scenes avg curiosityDelta ≤ 0 —
// resolutions that generate no new questions), dramatic turn curiosity void (reversal/twist
// scenes avg curiosityDelta ≤ 0 — turns that don't ignite audience wonder), clue seed
// suspense void (clue-planting scenes avg suspenseDelta ≤ 0 — cosmetic foreshadowing).
// Wave 349 additions: clock raised no emotion (every clock-raise scene is emotionally
// neutral — deadlines with no felt pressure), dramatic turn no suspense (turn scenes avg
// suspenseDelta ≤ 0 — pivots that generate no tension), suspense spike no fallout (high-
// suspense scenes produce no downstream consequence within two scenes).
// Wave 363 additions: payoff no emotion (every payoff scene is emotionally neutral —
// threads resolve without anyone feeling the resolution), seed scene curiosity void (clue-
// planting scenes avg curiosityDelta ≤ 0 — foreshadowing that never sparks wonder), clock
// raise curiosity void (clock-raise scenes avg curiosityDelta ≤ 0 — deadlines create dread
// but not the wondering urgency about how the protagonist escapes).
// Wave 377 additions: dramatic turn no emotion (every dramatic-turn scene is emotionally
// neutral — pivots that move no one, completing the turn-channel set), clock raise no suspense
// (clock-raise scenes avg suspenseDelta ≤ 0 — deadlines that generate no tension), suspense
// spike no curiosity (high-suspense scenes avg curiosityDelta ≤ 0 — danger that raises no
// questions about what happens next).
// Wave 391 additions: suspense spike no emotion (every high-suspense scene is emotionally
// neutral — completes the suspense-spike correlation set), clock raise no fallout (a clock
// raise produces no consequence within two scenes — the clock/clue siblings of suspense
// spike no fallout), curiosity spike no fallout (a curiosity spike produces no consequence
// within two scenes — intrigue raised then dropped).
// Wave 405 additions: positive reaction without cause (a positive emotional shift with no
// on-page cause in itself or the prior two scenes — the positive sibling of REACTION_WITHOUT_
// CAUSE, which handles only negative emotion), curiosity spike without cause (a curiosity
// spike with no upstream driver — the curiosity sibling of SUSPENSE_SPIKE_NO_CAUSE), dramatic
// turn without cause (≥2 dramatic turns and none has a cause in itself or the prior scene —
// the story's pivots are systematically unmotivated).

import type { PassInput, PassResult, RevisionIssue } from './types.ts';
import { rewritePass } from '../rewrite.ts';

export async function causalityPass(input: PassInput): Promise<PassResult> {
  const { fountain, records, annotations, approvedSpans } = input;
  const issues: RevisionIssue[] = [];

  for (let i = 1; i < records.length; i++) {
    const prev = records[i - 1];
    const curr = records[i];
    const ann = annotations[i];

    // ── Revelation without any prior planted clue ─────────────────────────
    // A revelation that delivers new information but has no seeded clues in ANY
    // prior scene is an unearned surprise. We check all records before this one,
    // not just the immediately preceding one, so an unrelated clue elsewhere
    // does not mask a missing setup for THIS revelation.
    if (ann && ann.revelation) {
      const anyCluesBefore = records
        .slice(0, i)
        .some(r => (r.seededClueIds?.length ?? 0) > 0 || r.unresolvedClues.length > 0);
      if (!anyCluesBefore) {
        issues.push({
          location: `Scene ${i} (${curr.slug})`,
          rule: 'REVELATION_WITHOUT_SETUP',
          description: `Scene ${i} delivers a revelation but no clues were planted in any prior scene`,
          severity: 'critical',
          suggestedFix: 'Add a clue-seeding moment in an earlier scene that anticipates this revelation',
        });
      }
    }

    // ── Suspense drop without a reversal scene ────────────────────────────
    // `dramaticTurn` is a freeform string (deriveDramaticTurn never returns 'none'),
    // so the old `=== 'none'` check was always false and this rule never fired.
    // A sharp suspense drop is *explained* when the scene's purpose releases tension
    // (a resolution, climax, turning point, or revelation). If the drop happens in a
    // non-resolving scene, the deflation has no on-page cause.
    const tensionReleasingPurposes = new Set<string>(['resolution', 'climax', 'turning_point', 'revelation']);
    if (curr.suspenseDelta < -3 && !tensionReleasingPurposes.has(curr.purpose)) {
      issues.push({
        location: `Scene ${i} (${curr.slug})`,
        rule: 'UNEXPLAINED_SUSPENSE_DROP',
        description: `Suspense drops sharply in Scene ${i} but the scene's purpose (${curr.purpose}) does not release tension — the cause of the deflation is unclear`,
        severity: 'minor',
        suggestedFix: 'Add a brief scene of consequence showing why tensions deflated, or recast this scene as a resolution/turning point',
      });
    }

    // ── Consecutive scenes with identical emotional shift ─────────────────
    if (i >= 2 && curr.emotionalShift === prev.emotionalShift && curr.emotionalShift !== 'neutral') {
      const prevPrev = records[i - 2];
      if (!prevPrev) continue;
      if (prevPrev.emotionalShift === curr.emotionalShift) {
        issues.push({
          location: `Scenes ${i - 2}–${i}`,
          rule: 'EMOTIONAL_MONOTONY',
          description: `Three consecutive scenes share the same emotional tone (${curr.emotionalShift}) — no causal variation`,
          severity: 'minor',
          suggestedFix: 'Introduce a brief scene with a contrasting emotional register to create texture',
        });
      }
    }
  }

  // ── Wave 141: Motivation coherence & action consequence ────────────────────

  // UNMOTIVATED_DECISION: Character makes a major decision (high suspense delta,
  // relationship shift, or revelation) with no clear prior setup scene (no clues,
  // clock raises, or emotional state building toward that decision).
  for (let i = 1; i < records.length; i++) {
    const curr = records[i];
    // Major decision indicators: high suspense, relationship shift, or revelation
    const isMajorDecision = curr.suspenseDelta > 2 || (curr.relationshipShifts?.length ?? 0) > 0 || curr.revelation !== null;

    if (isMajorDecision) {
      // Check if any of the 2 prior scenes set up this decision
      let hasSetup = false;
      for (let j = Math.max(0, i - 2); j < i; j++) {
        const prev = records[j];
        const isSetupScene =
          (prev.seededClueIds?.length ?? 0) > 0 || // planted clue relevant to decision
          prev.clockRaised || // external pressure building
          (prev.relationshipShifts?.length ?? 0) > 0 || // relationship tension building
          prev.revelation !== null; // prior revelation that informs decision
        if (isSetupScene) {
          hasSetup = true;
          break;
        }
      }

      if (!hasSetup && i >= 2) {
        issues.push({
          location: `Scene ${i} (${curr.slug})`,
          rule: 'UNMOTIVATED_DECISION',
          description: `Scene ${i} shows a major decision (high suspense, relationship shift, or revelation) with no setup in the 2 preceding scenes — the decision feels arbitrary`,
          severity: 'major',
          suggestedFix: 'Add a setup scene 1-2 scenes before where a character learns information, faces pressure, or confronts tension that motivates this decision',
        });
      }
    }
  }

  // ACTION_WITHOUT_CONSEQUENCE: Character takes action (high suspense delta or
  // clues planted) but it produces zero effect on other characters (no relationship
  // shifts in following scenes) or plot (no subsequent scenes with high suspense).
  for (let i = 0; i < records.length - 2; i++) {
    const curr = records[i];
    const isActionScene = (curr.seededClueIds?.length ?? 0) > 0 || curr.clockRaised || curr.suspenseDelta > 2;

    if (isActionScene) {
      // Check if the next 1-2 scenes show consequence
      let hasConsequence = false;
      for (let j = i + 1; j <= Math.min(i + 2, records.length - 1); j++) {
        const next = records[j];
        const showsConsequence =
          (next.relationshipShifts?.length ?? 0) > 0 || // other character reacts
          next.suspenseDelta > 1.5 || // escalation
          next.emotionalShift !== 'neutral'; // emotional response
        if (showsConsequence) {
          hasConsequence = true;
          break;
        }
      }

      if (!hasConsequence && (curr.seededClueIds?.length ?? 0) > 0) {
        // Only flag for planted clues, not every suspense scene
        issues.push({
          location: `Scene ${i} (${curr.slug})`,
          rule: 'ACTION_WITHOUT_CONSEQUENCE',
          description: `Scene ${i} plants clues or raises stakes but the next 2 scenes show no consequence — other characters are unaffected`,
          severity: 'major',
          suggestedFix: 'Add a reaction scene where a character responds to or is affected by the action in this scene',
        });
      }
    }
  }

  // ABANDONED_GOAL: Character goal or motivation mentioned in a clue or dialogue
  // appears in 2+ scenes but then never appears again without resolution. Goals
  // are abandoned when they vanish from the narrative without being achieved or
  // explicitly abandoned on-page.
  const goalMentions: Map<string, number[]> = new Map();
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    // Extract implied goals from clues and dialogue (very crude heuristic)
    for (const clue of r.seededClueIds ?? []) {
      if (!goalMentions.has(clue)) goalMentions.set(clue, []);
      goalMentions.get(clue)!.push(i);
    }
  }

  for (const [goalId, appearances] of goalMentions) {
    if (appearances.length >= 2) {
      // Check if goal ever resolves (payoff in following scenes)
      const lastAppearance = appearances[appearances.length - 1];
      let isResolved = false;

      // Goal is resolved if there's a payoff later
      for (let j = lastAppearance + 1; j < records.length; j++) {
        const r = records[j];
        if ((r.payoffSetupIds ?? []).includes(goalId) || r.revelation !== null) {
          isResolved = true;
          break;
        }
      }

      if (!isResolved && lastAppearance < records.length - 1) {
        // Goal is abandoned: appeared multiple times, then vanished
        issues.push({
          location: `Goal "${goalId}" last mentioned at Scene ${lastAppearance}`,
          rule: 'ABANDONED_GOAL',
          description: `Goal/motivation "${goalId}" appears in Scenes ${appearances.slice(0, 3).join(', ')}${appearances.length > 3 ? ',...' : ''} but is never resolved or abandoned on-page — it just disappears`,
          severity: 'major',
          suggestedFix: `Either resolve "${goalId}" via payoff in the final act, or add an explicit scene where the character abandons or reframes the goal`,
        });
      }
    }
  }

  // ── Wave 155: Deus ex machina, suspense spike, goal-conflict absence ─────────

  // DEUS_EX_MACHINA: A revelation in the final 20% of the story that resolves the
  // plot but was never seeded. The audience feels cheated when the solution
  // arrives from nowhere at the last moment.
  if (records.length >= 8) {
    const climaxZoneStart = Math.floor(records.length * 0.8);
    for (let i = climaxZoneStart; i < records.length; i++) {
      const r = records[i];
      const ann = annotations[i];
      const isResolvingRevelation = (r.revelation !== null || (ann && ann.revelation)) &&
        (r.purpose === 'climax' || r.purpose === 'resolution' || r.suspenseDelta < -2);

      if (isResolvingRevelation) {
        // Was there ANY clue seeded in the first 60% that could anticipate this?
        const setupZoneEnd = Math.floor(records.length * 0.6);
        const hadEarlySetup = records.slice(0, setupZoneEnd).some(prev =>
          (prev.seededClueIds?.length ?? 0) > 0,
        );
        if (!hadEarlySetup) {
          issues.push({
            location: `Scene ${i} (${r.slug})`,
            rule: 'DEUS_EX_MACHINA',
            description: `Scene ${i} resolves the plot via a late revelation, but no clue was planted in the first 60% of the story — the resolution arrives from nowhere`,
            severity: 'critical',
            suggestedFix: 'Plant the seed of this resolution in Act 1 or early Act 2. The solution must be available to the attentive audience before it arrives',
          });
          break; // one flag per pass
        }
      }
    }
  }

  // SUSPENSE_SPIKE_NO_CAUSE: A sudden high suspense delta (>3) with no escalation
  // in the preceding scenes (prior 2 scenes both had low suspense <1). Danger that
  // materializes without buildup feels arbitrary rather than earned.
  for (let i = 2; i < records.length; i++) {
    const curr = records[i];
    if (curr.suspenseDelta > 3) {
      const prev1 = records[i - 1];
      const prev2 = records[i - 2];
      const noBuildup = prev1.suspenseDelta < 1 && prev2.suspenseDelta < 1;
      // Only flag if no clock pressure or clue seeded recently to justify the spike
      const noSetup = !prev1.clockRaised && !prev2.clockRaised &&
        (prev1.seededClueIds?.length ?? 0) === 0 && (prev2.seededClueIds?.length ?? 0) === 0;
      if (noBuildup && noSetup) {
        issues.push({
          location: `Scene ${i} (${curr.slug})`,
          rule: 'SUSPENSE_SPIKE_NO_CAUSE',
          description: `Scene ${i} spikes to suspense ${curr.suspenseDelta.toFixed(1)} after two flat scenes (${prev2.suspenseDelta.toFixed(1)}, ${prev1.suspenseDelta.toFixed(1)}) with no clock pressure or clue — the danger appears without buildup`,
          severity: 'major',
          suggestedFix: 'Escalate tension across the preceding scenes. Plant the threat or raise a clock so the spike feels like a culmination, not a jump-scare',
        });
        break; // one flag per pass
      }
    }
  }

  // GOAL_WITHOUT_OPPOSITION: The story plants a goal (recurring clue) but no scene
  // ever shows a negative relationship shift or reversal opposing it. A goal with
  // no opposing force has no dramatic tension — drama is desire meeting resistance.
  if (records.length >= 6) {
    const hasGoal = records.some(r => (r.seededClueIds?.length ?? 0) > 0);
    if (hasGoal) {
      const hasOpposition = records.some(r => {
        const hasNegShift = (r.relationshipShifts ?? []).some(s => s.amount < -0.5);
        const hasReversal = r.suspenseDelta < -1;
        return hasNegShift || hasReversal;
      });
      if (!hasOpposition) {
        issues.push({
          location: 'Overall causal arc',
          rule: 'GOAL_WITHOUT_OPPOSITION',
          description: 'The story plants goals/clues but no scene shows opposition — no negative relationship shift, no reversal. A goal that meets no resistance generates no drama',
          severity: 'major',
          suggestedFix: 'Introduce an antagonistic force: a character who opposes the goal, a reversal that sets it back, or a relationship that sours as the protagonist pursues it',
        });
      }
    }
  }

  // ── Wave 166: Chekhov's gun, consequence delay, revelation front-loading ──────

  // CHEKHOV_GUN_UNFIRED: 2+ clues seeded in the first half of the story have no
  // corresponding payoff (no payoffSetupId matching the clue ID) anywhere in the
  // story. The gun was displayed but never fired.
  if (records.length >= 6) {
    const midpoint = Math.floor(records.length * 0.5);
    const earlyClues = new Set<string>();
    for (let i = 0; i < midpoint; i++) {
      for (const clue of records[i].seededClueIds ?? []) {
        earlyClues.add(clue);
      }
    }
    if (earlyClues.size > 0) {
      const allPayoffs = new Set<string>();
      for (const r of records) {
        for (const pid of r.payoffSetupIds ?? []) allPayoffs.add(pid);
      }
      const unfiredClues = [...earlyClues].filter(c => !allPayoffs.has(c));
      if (unfiredClues.length >= 2) {
        issues.push({
          location: `Scenes 0–${midpoint - 1} (setup zone)`,
          rule: 'CHEKHOV_GUN_UNFIRED',
          description: `${unfiredClues.length} clue(s) seeded in the first half (${unfiredClues.slice(0, 3).join(', ')}) have no matching payoff anywhere in the story — Chekhov's gun shown but never fired`,
          severity: 'major',
          suggestedFix: 'Either fire the gun: add a payoff scene that calls back each planted clue. Or remove the clue from Act 1 if you don\'t intend to resolve it.',
        });
      }
    }
  }

  // CONSEQUENCE_DELAY_EXCESSIVE: A high-action scene (clock raised or clue planted)
  // has its first narrative consequence 5+ scenes later. Cause and effect separated
  // by that many scenes lose their causal connection for the audience.
  if (records.length >= 10) {
    for (let i = 0; i < records.length - 5; i++) {
      const r = records[i];
      const isActionScene = r.clockRaised || (r.seededClueIds?.length ?? 0) > 0;
      if (!isActionScene) continue;

      let firstConsequenceAt = -1;
      for (let j = i + 1; j < records.length; j++) {
        const next = records[j];
        const hasConsequence =
          (next.relationshipShifts?.length ?? 0) > 0 ||
          next.suspenseDelta > 1.5 ||
          next.emotionalShift !== 'neutral';
        if (hasConsequence) { firstConsequenceAt = j; break; }
      }

      if (firstConsequenceAt >= i + 5) {
        issues.push({
          location: `Scenes ${i}–${firstConsequenceAt}`,
          rule: 'CONSEQUENCE_DELAY_EXCESSIVE',
          description: `Scene ${i} raises the stakes (clock/clue) but the first narrative consequence doesn't arrive until Scene ${firstConsequenceAt} — ${firstConsequenceAt - i} scenes of delay. Cause and effect are too far apart to feel connected.`,
          severity: 'minor',
          suggestedFix: 'Add a ripple effect in Scene ${i + 1} or ${i + 2}: an emotional reaction, a relationship shift, or an escalation that shows the action landing immediately',
        });
        break; // one flag per pass
      }
    }
  }

  // REVELATION_FRONT_LOADING: More than 60% of all revelations (scenes where the
  // narrative delivers a major story truth) land in the first half. The second half
  // is informationally starved — it can only react to what was already revealed.
  {
    const revelationScenes = records.filter(r => r.revelation !== null);
    if (revelationScenes.length >= 3 && records.length >= 6) {
      const midpoint = Math.floor(records.length * 0.5);
      const firstHalfRevCount = revelationScenes.filter(r => r.sceneIdx < midpoint).length;
      const ratio = firstHalfRevCount / revelationScenes.length;
      if (ratio > 0.6) {
        issues.push({
          location: `Scenes 0–${midpoint - 1} (first half)`,
          rule: 'REVELATION_FRONT_LOADING',
          description: `${firstHalfRevCount} of ${revelationScenes.length} revelations (${Math.round(ratio * 100)}%) land in the first half — the second act is informationally starved and can only react to what was already revealed`,
          severity: 'major',
          suggestedFix: 'Redistribute revelations: reserve at least one major revelation for the climax zone, one for the Act 2 midpoint, and one for late Act 2 to keep the audience receiving new information throughout',
        });
      }
    }
  }

  // ── Wave 180: Revelation without reaction, reaction without cause, clock without payoff ──

  // REVELATION_WITHOUT_REACTION: A revelation lands but the very next scene shows
  // no causal ripple — neutral emotion, no relationship shift, no change in
  // suspense. The truth is delivered and the story moves on as if nothing
  // happened. Distinct from belief's REVELATION_ISOLATED (dialogue presence);
  // this checks the downstream causal response.
  if (records.length >= 4) {
    for (let i = 0; i < records.length - 1; i++) {
      const curr = records[i];
      if (curr.revelation === null) continue;
      const next = records[i + 1];
      const noReaction =
        next.emotionalShift === 'neutral' &&
        (next.relationshipShifts?.length ?? 0) === 0 &&
        next.suspenseDelta <= 1;
      if (noReaction) {
        issues.push({
          location: `Scene ${i} → Scene ${i + 1}`,
          rule: 'REVELATION_WITHOUT_REACTION',
          description: `Scene ${i} delivers a revelation but the next scene shows no causal ripple — neutral emotion, no relationship shift, no change in suspense. The truth lands and the story carries on as if nothing was learned.`,
          severity: 'minor',
          suggestedFix: 'Let the revelation change something immediately: a character recalibrates, a relationship shifts, or the stakes rise. Information that alters nothing wasn\'t worth revealing.',
        });
        break;
      }
    }
  }

  // REACTION_WITHOUT_CAUSE: A scene carries a negative emotional shift but
  // neither it nor the two scenes before it contain any on-page trigger (no
  // negative relationship shift, no suspense rise, no revelation, no clock). The
  // character's collapse has no visible cause. Distinct from UNMOTIVATED_DECISION
  // (which keys on decisions, not raw emotion).
  for (let i = 2; i < records.length; i++) {
    const curr = records[i];
    if (curr.emotionalShift !== 'negative') continue;
    const selfCause =
      curr.revelation !== null ||
      curr.suspenseDelta > 1.5 ||
      curr.clockRaised ||
      (curr.relationshipShifts ?? []).some(s => s.amount < 0);
    if (selfCause) continue;
    let priorCause = false;
    for (let j = Math.max(0, i - 2); j < i; j++) {
      const p = records[j];
      if (
        p.emotionalShift === 'negative' ||
        p.suspenseDelta > 1.5 ||
        p.revelation !== null ||
        p.clockRaised ||
        (p.relationshipShifts ?? []).some(s => s.amount < 0)
      ) { priorCause = true; break; }
    }
    if (!priorCause) {
      issues.push({
        location: `Scene ${i} (${curr.slug})`,
        rule: 'REACTION_WITHOUT_CAUSE',
        description: `Scene ${i} turns emotionally negative but neither it nor the two preceding scenes contain any trigger — no setback, no bad news, no souring relationship, no rising threat. The downturn has no on-page cause.`,
        severity: 'minor',
        suggestedFix: 'Give the negative turn a visible cause in this scene or just before it: a piece of bad news, a betrayal, a failure, or a threat that justifies the shift in mood.',
      });
      break;
    }
  }

  // CLOCK_RAISED_WITHOUT_PAYOFF: A ticking clock is raised somewhere in the story
  // but no scene ever discharges it — there is no high-suspense beat, climax, or
  // resolution anywhere. The deadline is established and then quietly forgotten,
  // so the pressure it promised never pays off.
  if (records.length >= 6) {
    const anyClock = records.some(r => r.clockRaised);
    if (anyClock) {
      const hasPayoff = records.some(r =>
        r.suspenseDelta > 2 || r.purpose === 'climax' || r.purpose === 'resolution',
      );
      if (!hasPayoff) {
        issues.push({
          location: 'Clock / deadline arc',
          rule: 'CLOCK_RAISED_WITHOUT_PAYOFF',
          description: 'A ticking clock is raised but the story never discharges it — no scene reaches a suspense peak, climax, or resolution. The deadline is established and then forgotten, so its pressure never pays off.',
          severity: 'major',
          suggestedFix: 'Fire the clock: build to a scene where the deadline forces a confrontation or a decisive choice, then show the outcome. A clock that never runs out is a promise the story breaks.',
        });
      }
    }
  }

  // ── Wave 187: Consequence chain break, clock ghost, positive shift orphan ───

  // CONSEQUENCE_CHAIN_BREAK: A high-action peak (suspenseDelta ≥ 2) is followed
  // by two consecutive flat scenes — no emotion, no clock, no relational movement,
  // low suspense. The action surge dissipates without a causal ripple: the peak
  // happened, and then the story acts as if it didn't. Distinct from CONSEQUENCE_
  // DELAY_EXCESSIVE (clock/clue delay) and REVELATION_WITHOUT_REACTION (revelation
  // specific). This fires on any high-suspense scene followed by a void.
  if (records.length >= 6) {
    const isFlat = (r: typeof records[0]) =>
      r.emotionalShift === 'neutral' &&
      !r.clockRaised &&
      (r.relationshipShifts?.length ?? 0) === 0 &&
      r.suspenseDelta <= 1;
    for (let i = 0; i < records.length - 2; i++) {
      if (records[i].suspenseDelta < 2) continue;
      if (isFlat(records[i + 1]) && isFlat(records[i + 2])) {
        issues.push({
          location: `Scene ${records[i].sceneIdx} (action peak)`,
          rule: 'CONSEQUENCE_CHAIN_BREAK',
          description: `Scene ${records[i].sceneIdx} spikes to suspense ${records[i].suspenseDelta.toFixed(1)} but the next two scenes are completely flat — no emotional aftershock, no clock, no relationship movement. The action peak dissolves without causal consequence.`,
          severity: 'minor',
          suggestedFix: 'Let high-action peaks echo forward: show the emotional aftershock, the strained relationship, or the accelerated deadline in the scenes that immediately follow. Action without consequence is noise, not drama.',
        });
        break;
      }
    }
  }

  // CLOCK_GHOST: A clock is raised but the three scenes immediately following
  // show no urgency — no suspense rise, no secondary clock, no antagonistic
  // pressure. The deadline appears once and immediately fades into background
  // noise. Distinct from CLOCK_RAISED_WITHOUT_PAYOFF (no payoff anywhere):
  // this fires when the immediate aftermath of a clock-raise is suspense-dead.
  if (records.length >= 6) {
    for (let i = 0; i < records.length - 3; i++) {
      if (!records[i].clockRaised) continue;
      const following = records.slice(i + 1, i + 4);
      const urgencyAbsent = following.length === 3 && following.every(r =>
        r.suspenseDelta <= 1.5 &&
        !r.clockRaised &&
        (r.relationshipShifts ?? []).every(s => s.amount >= 0),
      );
      if (urgencyAbsent) {
        issues.push({
          location: `Scene ${records[i].sceneIdx} (clock raised)`,
          rule: 'CLOCK_GHOST',
          description: `A clock is raised at Scene ${records[i].sceneIdx} but the next three scenes show no urgency — no suspense build, no secondary clock, no antagonistic pressure. The deadline appears once and immediately fades.`,
          severity: 'major',
          suggestedFix: 'Build on the clock in each scene that follows its introduction: show the protagonist becoming more desperate, the antagonist pressing harder, or the deadline looming as a concrete presence — not a forgotten premise.',
        });
        break;
      }
    }
  }

  // POSITIVE_SHIFT_ORPHAN: Two or more positive relationship shifts (amount ≥ 0.4)
  // occur with no causal consequence in the three scenes that follow each one.
  // Alliances built and trust earned that produce nothing — no revelation, no
  // escalation, no new conflict, no subsequent shift — are narratively inert. The
  // relationship improves to no story purpose.
  if (records.length >= 6) {
    const posShiftIdxs: number[] = [];
    for (let i = 0; i < records.length; i++) {
      if ((records[i].relationshipShifts ?? []).some((s: { amount: number }) => s.amount >= 0.4)) {
        posShiftIdxs.push(i);
      }
    }
    if (posShiftIdxs.length >= 2) {
      let orphanCount = 0;
      for (const idx of posShiftIdxs) {
        const following = records.slice(idx + 1, idx + 4);
        const hasConsequence = following.some(r =>
          r.revelation !== null ||
          r.suspenseDelta > 1.5 ||
          r.clockRaised ||
          (r.relationshipShifts?.length ?? 0) > 0,
        );
        if (!hasConsequence) orphanCount++;
      }
      if (orphanCount >= 2) {
        issues.push({
          location: 'Positive relationship shifts',
          rule: 'POSITIVE_SHIFT_ORPHAN',
          description: `${orphanCount} positive relationship shifts (alliances, trust, reconciliation) have no causal consequence in the following scenes — the relationships improve but nothing in the story changes because of it.`,
          severity: 'minor',
          suggestedFix: 'Give positive shifts narrative weight: a new alliance enables a plan, reconciliation opens a door that was closed, trust creates a vulnerability that the antagonist can exploit. If the relationship improves but nothing changes, the scene earned nothing.',
        });
      }
    }
  }

  // ── Wave 197: Causal Act1 void, Act3 discharge absent, motivation reversal ──

  // CAUSAL_ACT1_VOID: The entire Act 1 (first 25%) contains no causal signal —
  // no seeded clue, no clock raised, no significant relationship shift (≥0.3).
  // The opening establishes no threads to develop. Act 2 begins with nothing
  // to complicate and Act 3 has nothing to resolve.
  if (records.length >= 8) {
    const causalAct1End = Math.floor(records.length * 0.25);
    const act1CausalRecs = records.slice(0, causalAct1End);
    if (act1CausalRecs.length >= 2) {
      const hasAct1Signal = act1CausalRecs.some(r =>
        (r.seededClueIds?.length ?? 0) > 0 ||
        r.clockRaised ||
        (r.relationshipShifts ?? []).some((s: any) => Math.abs(s.amount) >= 0.3),
      );
      if (!hasAct1Signal) {
        issues.push({
          location: `Act 1 (Scenes 0–${causalAct1End - 1})`,
          rule: 'CAUSAL_ACT1_VOID',
          description: `Act 1 (${act1CausalRecs.length} scenes) plants no clues, raises no clock, and creates no significant relationship shift — the story opens without establishing any causal threads for Acts 2 and 3 to develop`,
          severity: 'major',
          suggestedFix: 'Act 1 must launch at least one causal thread: plant a clue that foreshadows the climax, raise a clock that creates urgency, or create a relationship shift that the protagonist must resolve. Without a thread to pull, the rest of the story has no tension to escalate.',
        });
      }
    }
  }

  // ACT3_DISCHARGE_ABSENT: Clues are seeded somewhere in the story but Act 3
  // (last 25%) contains no payoffs and no revelations — the seeded material is
  // never discharged in the final act. The climax fires no guns.
  if (records.length >= 8) {
    const hasAnySeeds = records.some(r => (r.seededClueIds?.length ?? 0) > 0);
    if (hasAnySeeds) {
      const act3DischargeStart = Math.floor(records.length * 0.75);
      const act3Discharge = records.slice(act3DischargeStart);
      const hasAct3Discharge = act3Discharge.some(r =>
        r.revelation !== null || (r.payoffSetupIds?.length ?? 0) > 0,
      );
      if (!hasAct3Discharge) {
        issues.push({
          location: `Act 3 (Scenes ${act3DischargeStart}–${records.length - 1})`,
          rule: 'ACT3_DISCHARGE_ABSENT',
          description: `Clues are seeded in the story but Act 3 contains no payoffs and no revelations — the planted material is never discharged in the final act. The climax fires no guns.`,
          severity: 'major',
          suggestedFix: 'Move at least one payoff (payoffSetupId) or revelation into Act 3. The final act must fire the guns that Act 1 displayed — the seeded material exists to create a moment of recognition and resolution at the climax.',
        });
      }
    }
  }

  // MOTIVATION_REVERSAL_UNCAUSED: A positive relationship shift (≥0.4) for a pair
  // is followed within 2 scenes by a negative shift (≤-0.4) for the same pair with
  // no triggering event in between — no revelation, clock raise, or crisis explains
  // the sudden reversal. Trust evaporating without cause undermines relational logic.
  if (records.length >= 6) {
    let motivRevFired = false;
    for (let i = 0; i < records.length - 1 && !motivRevFired; i++) {
      const shiftsA = records[i].relationshipShifts ?? [];
      for (const shiftA of shiftsA) {
        if (motivRevFired || shiftA.amount < 0.4) continue;
        for (let j = i + 1; j <= Math.min(i + 2, records.length - 1) && !motivRevFired; j++) {
          const shiftsB = records[j].relationshipShifts ?? [];
          for (const shiftB of shiftsB) {
            if (shiftB.pairKey !== shiftA.pairKey || shiftB.amount > -0.4) continue;
            let hasCause = false;
            for (let k = i; k <= j; k++) {
              if (records[k].revelation !== null ||
                  records[k].clockRaised ||
                  records[k].suspenseDelta > 2) { hasCause = true; break; }
            }
            if (!hasCause) {
              issues.push({
                location: `Scenes ${i}–${j} (pair: ${shiftA.pairKey})`,
                rule: 'MOTIVATION_REVERSAL_UNCAUSED',
                description: `The relationship for pair "${shiftA.pairKey}" shifts from +${shiftA.amount.toFixed(2)} (positive) to ${shiftB.amount.toFixed(2)} (negative) across Scenes ${i}–${j} with no triggering event — no revelation, clock raise, or crisis explains the sudden reversal`,
                severity: 'minor',
                suggestedFix: 'Add a visible cause for the relational flip: a discovery, a betrayal detail, or a confrontation that makes the reversal inevitable rather than arbitrary. Sudden reversals need earned catalysts.',
              });
              motivRevFired = true;
              break;
            }
          }
        }
      }
    }
  }

  // ── Wave 212: Setup-payoff imbalance, act2 causal desert, causal midpoint void ──

  // SETUP_PAYOFF_IMBALANCE: The story seeds five or more distinct causal threads
  // but closes only one or none via payoffs. Every seeded clue is a promissory
  // note; when seeds outnumber payoffs 5-to-1 or worse, the audience carries a
  // compounding load of unfulfilled promises and the ending feels structurally
  // incomplete regardless of how satisfying the drama is.
  if (records.length >= 8) {
    const totalSeedCount212 = records.reduce((s: number, r: any) => s + (r.seededClueIds?.length ?? 0), 0);
    const totalPayoffCount212 = records.reduce((s: number, r: any) => s + (r.payoffSetupIds?.length ?? 0), 0);
    if (totalSeedCount212 >= 5 && totalPayoffCount212 <= 1) {
      issues.push({
        location: 'Setup/payoff distribution',
        rule: 'SETUP_PAYOFF_IMBALANCE',
        severity: 'minor',
        description: `${totalSeedCount212} causal threads are seeded across the story but only ${totalPayoffCount212} payoff(s) close them — the story plants ${totalSeedCount212} guns and fires almost none. The audience accumulates a growing load of unfulfilled promises.`,
        suggestedFix: 'Audit the seeded clues and add payoff scenes that close each major thread. Alternatively, cut threads you don\'t intend to resolve — every seeded clue is a promise, and every unfired gun is a broken one.',
      });
    }
  }

  if (records.length >= 10) {
    const isCausal212 = (r: any): boolean =>
      r.revelation !== null ||
      (r.payoffSetupIds?.length ?? 0) > 0 ||
      r.clockRaised ||
      (r.seededClueIds?.length ?? 0) > 0 ||
      (r.relationshipShifts ?? []).some((s: any) => Math.abs(s.amount) >= 0.3);

    // ACT2_CAUSAL_DESERT: The entire Act 2 (25%–75%) contains no causal event —
    // no revelation, payoff, seed, clock raise, or significant relationship shift
    // (≥0.3). A causally dead Act 2 means the protagonist simply waits for Act 3
    // to arrive — no discovery, no escalation, no reversal — and the audience
    // feels the story treading water through its longest section.
    const act2DesertStart212 = Math.floor(records.length * 0.25);
    const act2DesertEnd212 = Math.floor(records.length * 0.75);
    const act2DesertRecs212 = records.slice(act2DesertStart212, act2DesertEnd212);
    if (!act2DesertRecs212.some(isCausal212)) {
      issues.push({
        location: `Act 2 (Scenes ${act2DesertStart212}–${act2DesertEnd212 - 1})`,
        rule: 'ACT2_CAUSAL_DESERT',
        severity: 'major',
        description: `Act 2 (Scenes ${act2DesertStart212}–${act2DesertEnd212 - 1}, ${act2DesertRecs212.length} scenes) contains no revelation, payoff, planted clue, raised clock, or significant relationship shift — the story's longest structural section is causally inert. Nothing is planted, escalated, or discovered across the entire middle act.`,
        suggestedFix: 'Act 2 must be the engine of complication. Plant clues, raise clocks, shift relationships, or deliver a mid-story revelation in each act-2 sequence. The protagonist should be discovering, failing, and adapting across the middle — not waiting for Act 3.',
      });
    }

    // CAUSAL_MIDPOINT_VOID: The structural midpoint zone (40%–60%) has no causal
    // event while Act 2 as a whole does have causal content — the pivot point is
    // specifically dead. The midpoint is the gear-change of a well-crafted story:
    // the protagonist's goal transforms, the dominant threat shifts, or a major
    // alliance forms. Without a causal signal at the 40%–60% zone, Act 2 drifts
    // from one half to the other with no felt turning point. Only fires when act2
    // has content elsewhere (otherwise ACT2_CAUSAL_DESERT already covers it).
    const midVoidStart212 = Math.floor(records.length * 0.4);
    const midVoidEnd212 = Math.floor(records.length * 0.6);
    const midVoidRecs212 = records.slice(midVoidStart212, midVoidEnd212);
    if (midVoidRecs212.length >= 2 && act2DesertRecs212.some(isCausal212) && !midVoidRecs212.some(isCausal212)) {
      issues.push({
        location: `Midpoint zone (Scenes ${midVoidStart212}–${midVoidEnd212 - 1})`,
        rule: 'CAUSAL_MIDPOINT_VOID',
        severity: 'major',
        description: `The structural midpoint (Scenes ${midVoidStart212}–${midVoidEnd212 - 1}) contains no revelation, payoff, planted clue, raised clock, or significant relationship shift — the story's pivot has no felt gear-change. Act 2 has causal activity around the midpoint but not at it.`,
        suggestedFix: 'Plant a causal event at the 40%–60% zone: a revelation that reframes the goal, a clock that raises urgency, or a relationship shift that transforms the alliance map. The midpoint event makes the second half of Act 2 feel like a higher-stakes story than the first.',
      });
    }
  }

  // ── Wave 226: CAUSAL_DENSITY_INVERSION ────────────────────────────────────
  // The first half contains ≥3× more causal events than the second half —
  // the story front-loads its engine and loses momentum. All causal types are
  // counted: planted clues, clock raises, revelations, and significant
  // relationship shifts (≥|0.3|). Distinct from REVELATION_FRONT_LOADING
  // (revelations only) and ACT3_DISCHARGE_ABSENT (Act 3 only). Requires 10+ scenes
  // and ≥4 first-half events so the imbalance is meaningful.
  if (records.length >= 10) {
    const isCausalEvent226 = (r: typeof records[0]): boolean =>
      r.revelation !== null ||
      r.clockRaised ||
      (r.seededClueIds?.length ?? 0) > 0 ||
      (r.relationshipShifts ?? []).some((s: any) => Math.abs(s.amount) >= 0.3);
    const midpoint226 = Math.floor(records.length * 0.5);
    const firstHalfCount226 = records.slice(0, midpoint226).filter(isCausalEvent226).length;
    const secondHalfCount226 = records.slice(midpoint226).filter(isCausalEvent226).length;
    if (firstHalfCount226 >= 4 && secondHalfCount226 > 0 && firstHalfCount226 >= secondHalfCount226 * 3) {
      issues.push({
        location: 'Causal event distribution',
        rule: 'CAUSAL_DENSITY_INVERSION',
        severity: 'major',
        description: `The first half contains ${firstHalfCount226} causal events (seeds, clocks, revelations, relationship shifts) vs. ${secondHalfCount226} in the second half (${firstHalfCount226}:${secondHalfCount226} ratio). The story fires its causal engine early and loses momentum — the second half has no new threads to pull, no clocks left to expire, no revelation left to land.`,
        suggestedFix: `Move at least two causal events into the second half: a new clock that activates at the midpoint, a late-breaking revelation, or a relationship shift that reorders the alliance map near the climax.`,
      });
    }
  }

  // ── Wave 226: ESCALATION_PLATEAU ──────────────────────────────────────────
  // The story has 3+ suspense peaks (suspenseDelta ≥ 2) but their values don't
  // escalate over the arc — the final peak is no higher than the first. Effective
  // dramatic structure requires each successive high-pressure scene to be more
  // intense than the last. When peaks plateau, the audience stops expecting things
  // to get worse, and the climax can't deliver a felt sense of maximum stakes.
  // Requires 8+ records and 3+ peaks.
  if (records.length >= 8) {
    const peaks226 = records.filter((r: any) => r.suspenseDelta >= 2);
    if (peaks226.length >= 3) {
      const firstPeak226 = peaks226[0].suspenseDelta;
      const lastPeak226 = peaks226[peaks226.length - 1].suspenseDelta;
      if (lastPeak226 <= firstPeak226) {
        issues.push({
          location: 'Suspense escalation arc',
          rule: 'ESCALATION_PLATEAU',
          severity: 'major',
          description: `The story has ${peaks226.length} suspense peaks (≥2.0) but the final peak (${lastPeak226.toFixed(1)}) is no higher than the first (${firstPeak226.toFixed(1)}) — danger plateaus rather than escalating. The climax cannot feel like the most intense moment when earlier peaks were equally or more intense.`,
          suggestedFix: `Calibrate peak heights to escalate across the arc: reserve the story's highest suspense value for the climax. Each successive tension scene should spike slightly higher than its predecessor, so the audience experiences a felt crescendo.`,
        });
      }
    }
  }

  // ── Wave 226: ANTAGONIST_SECOND_HALF_SILENT ───────────────────────────────
  // An antagonistic force creates significant negative pressure in the first 40%
  // (negative relationship shift ≤-0.4) but then disappears — no such shift
  // appears in the remaining 60%. The opposition that defined Act 1 goes quiet
  // exactly when the protagonist needs to be pushed hardest. Distinct from
  // GOAL_WITHOUT_OPPOSITION (which fires when there is NO opposition anywhere
  // in the story); this catches a second-half retreat of an established threat.
  // Requires 10+ records.
  if (records.length >= 10) {
    const act1End226 = Math.floor(records.length * 0.4);
    const hasAct1Antagonism226 = records.slice(0, act1End226).some((r: any) =>
      (r.relationshipShifts ?? []).some((s: any) => s.amount <= -0.4),
    );
    if (hasAct1Antagonism226) {
      const hasLaterAntagonism226 = records.slice(act1End226).some((r: any) =>
        (r.relationshipShifts ?? []).some((s: any) => s.amount <= -0.4),
      );
      if (!hasLaterAntagonism226) {
        issues.push({
          location: 'Antagonist causal presence',
          rule: 'ANTAGONIST_SECOND_HALF_SILENT',
          severity: 'minor',
          description: `An antagonistic force creates significant negative relationship tension in the first 40% of the story but then disappears — no scene in the remaining 60% carries a strong negative shift (≤-0.4). The opposition goes quiet exactly when the protagonist needs to be pushed hardest.`,
          suggestedFix: `Re-engage the antagonist in Act 2-3: a confrontation that escalates, a new threat vector, or a relationship betrayal that makes the final act feel like a climax rather than an unchallenged march to resolution.`,
        });
      }
    }
  }

  // ── Wave 240: CURIOSITY_OPEN_LOOP ─────────────────────────────────────────
  // Two or more scenes raise curiosity sharply (curiosityDelta ≥ 2) but no
  // witnessed revelation ever follows the first such spike. The story poses
  // strong questions — hooks that promise an answer — and then never delivers a
  // witnessed truth that closes the loop. Curiosity is a forward-promise: a
  // spike with no downstream revelation is an open loop the audience carries to
  // the credits unresolved. Distinct from CLOCK_RAISED_WITHOUT_PAYOFF (deadline
  // pressure) and from belief's CURIOSITY checks. Requires 8+ records.
  if (records.length >= 8) {
    const curiositySpikes240 = records.filter((r: any) => (r.curiosityDelta ?? 0) >= 2);
    if (curiositySpikes240.length >= 2) {
      const firstSpikeIdx240 = curiositySpikes240[0].sceneIdx;
      const anyRevAfterSpike240 = records.some(
        (r: any) => r.sceneIdx > firstSpikeIdx240 && r.revelation !== null,
      );
      if (!anyRevAfterSpike240) {
        issues.push({
          location: `Curiosity loop (first spike at Scene ${firstSpikeIdx240})`,
          rule: 'CURIOSITY_OPEN_LOOP',
          severity: 'major',
          description: `${curiositySpikes240.length} scenes raise curiosity sharply (the story poses strong questions) but no witnessed revelation ever follows the first spike at Scene ${firstSpikeIdx240}. Every question the story plants is left open — the audience is hooked and then abandoned.`,
          suggestedFix: 'Pay off at least one curiosity spike with a witnessed revelation later in the story. A question raised is a contract: the audience leans in expecting the answer, and a story that never delivers one feels like a tease, not a mystery.',
        });
      }
    }
  }

  // ── Wave 240: REVELATION_WITHOUT_CURIOSITY ────────────────────────────────
  // The story delivers 2+ witnessed revelations and its reader-state layer is
  // demonstrably active (at least one scene moves suspense), yet no scene ever
  // raises curiosity (every curiosityDelta ≤ 0). The audience is handed answers
  // to questions it was never invited to ask. A revelation only lands when the
  // audience has been made to want it; revelations with no prior curiosity
  // build feel like information delivery, not discovery. The suspense-active
  // guard ensures the absence of curiosity is a real authorial gap, not just an
  // empty ledger. Requires 8+ records and 2+ revelations.
  if (records.length >= 8) {
    const revCount240 = records.filter((r: any) => r.revelation !== null).length;
    const suspenseActive240 = records.some((r: any) => (r.suspenseDelta ?? 0) !== 0);
    const anyCuriosityRaised240 = records.some((r: any) => (r.curiosityDelta ?? 0) > 0);
    if (revCount240 >= 2 && suspenseActive240 && !anyCuriosityRaised240) {
      issues.push({
        location: 'Curiosity / revelation coupling',
        rule: 'REVELATION_WITHOUT_CURIOSITY',
        severity: 'minor',
        description: `The story delivers ${revCount240} witnessed revelations and actively moves suspense, but no scene ever raises curiosity — the audience is handed answers to questions it was never invited to ask. Revelations land as information delivery rather than earned discovery.`,
        suggestedFix: 'Before each major revelation, plant a curiosity hook: a question, an anomaly, a withheld detail that makes the audience want to know. A revelation is only satisfying if the audience was made to crave the answer first.',
      });
    }
  }

  // ── Wave 240: EMOTIONAL_WHIPLASH ──────────────────────────────────────────
  // Three consecutive scenes oscillate in emotional polarity (positive →
  // negative → positive, or the reverse) where neither flip is motivated by an
  // on-page causal event — no revelation, no planted clue, no clock raise, no
  // significant relationship shift in the two pivot scenes. The mood swings back
  // and forth with no cause, which reads as tonal randomness rather than a
  // dramatic arc. Distinct from EMOTIONAL_MONOTONY (three identical tones): this
  // catches uncaused oscillation, the opposite failure. Requires 5+ records.
  if (records.length >= 5) {
    const isCausalPivot240 = (r: any): boolean =>
      r.revelation !== null ||
      r.clockRaised === true ||
      (r.seededClueIds?.length ?? 0) > 0 ||
      (r.relationshipShifts ?? []).some((s: any) => Math.abs(s.amount) >= 0.3);
    for (let i = 2; i < records.length; i++) {
      const a240 = records[i - 2];
      const b240 = records[i - 1];
      const c240 = records[i];
      const oscillates240 =
        a240.emotionalShift !== 'neutral' &&
        b240.emotionalShift !== 'neutral' &&
        c240.emotionalShift !== 'neutral' &&
        a240.emotionalShift === c240.emotionalShift &&
        a240.emotionalShift !== b240.emotionalShift;
      if (oscillates240 && !isCausalPivot240(b240) && !isCausalPivot240(c240)) {
        issues.push({
          location: `Scenes ${i - 2}–${i}`,
          rule: 'EMOTIONAL_WHIPLASH',
          severity: 'minor',
          description: `Scenes ${i - 2}–${i} swing emotional polarity (${a240.emotionalShift}→${b240.emotionalShift}→${c240.emotionalShift}) but neither reversal is motivated by an on-page causal event — no revelation, clue, clock, or relationship shift drives the mood flips. The tone whiplashes without cause.`,
          suggestedFix: 'Anchor each emotional reversal to a concrete cause: a discovery that darkens the mood, a relationship repair that lifts it. Uncaused tonal swings read as inconsistency; motivated ones read as drama.',
        });
        break;
      }
    }
  }

  // ── Wave 254: CLUE_SEED_CLUSTER ───────────────────────────────────────────
  // A single scene plants three or more distinct clues at once. Each seeded clue
  // is a thread the audience is asked to hold; launching three or more in one
  // scene overloads working memory and dilutes every individual setup — none of
  // them registers as the one that matters. Distinct from SETUP_PAYOFF_IMBALANCE
  // (global seed/payoff ratio) and CHEKHOV_GUN_UNFIRED (unpaid seeds); this is a
  // local density spike — too many guns mounted on the wall in a single beat.
  // Requires 4+ records.
  if (records.length >= 4) {
    for (const r of records) {
      if ((r.seededClueIds?.length ?? 0) >= 3) {
        issues.push({
          location: `Scene ${r.sceneIdx} (${r.slug})`,
          rule: 'CLUE_SEED_CLUSTER',
          severity: 'minor',
          description: `Scene ${r.sceneIdx} plants ${r.seededClueIds!.length} distinct clues at once (${r.seededClueIds!.slice(0, 3).join(', ')}${r.seededClueIds!.length > 3 ? ', …' : ''}) — too many threads launched in a single beat. The audience can't tell which setup matters, and each one registers more faintly for being crowded.`,
          suggestedFix: 'Distribute the setups across several scenes so each clue lands with its own moment of attention. A clue planted alone is remembered; three planted together blur into background detail.',
        });
        break;
      }
    }
  }

  // ── Wave 254: PAYOFF_WITHOUT_SETUP ────────────────────────────────────────
  // A scene fires a payoff (payoffSetupId) whose referenced setup id was never
  // seeded in any earlier scene. The callback lands on nothing — the audience is
  // asked to recognise a thread that was never planted, so the "payoff" produces
  // no flash of recognition. Distinct from REVELATION_WITHOUT_SETUP (revelation-
  // keyed); this checks the explicit payoff→seed id linkage. Requires 4+ records.
  if (records.length >= 4) {
    let payoffOrphanFired254 = false;
    for (let i = 0; i < records.length && !payoffOrphanFired254; i++) {
      for (const pid of records[i].payoffSetupIds ?? []) {
        const seededBefore254 = records
          .slice(0, i)
          .some(prev => (prev.seededClueIds ?? []).includes(pid));
        if (!seededBefore254) {
          issues.push({
            location: `Scene ${i} (${records[i].slug})`,
            rule: 'PAYOFF_WITHOUT_SETUP',
            severity: 'major',
            description: `Scene ${i} fires a payoff for "${pid}" but that thread was never seeded in any earlier scene — the callback lands on nothing. A payoff only delivers its flash of recognition when the audience was first shown the seed.`,
            suggestedFix: `Plant "${pid}" earlier: add a setup scene in Act 1 or Act 2 that seeds the clue this payoff calls back to. A payoff without a prior setup is a punchline with no joke.`,
          });
          payoffOrphanFired254 = true;
          break;
        }
      }
    }
  }

  // ── Wave 254: SUSPENSE_PLATEAU_FLATLINE ───────────────────────────────────
  // Four or more consecutive scenes hold suspense essentially flat (|suspenseDelta|
  // ≤ 0.5). Tension neither rises nor falls for an extended stretch — the story
  // flatlines. Distinct from ACT2_CAUSAL_DESERT (no causal events of any kind) and
  // CONSEQUENCE_CHAIN_BREAK (two flat scenes after a peak); this fires on a
  // sustained run of tensionless scenes regardless of other causal activity.
  // Requires 8+ records.
  if (records.length >= 8) {
    let runStart254 = 0;
    let runLen254 = 0;
    for (let i = 0; i < records.length; i++) {
      if (Math.abs(records[i].suspenseDelta ?? 0) <= 0.5) {
        if (runLen254 === 0) runStart254 = i;
        runLen254++;
      } else {
        runLen254 = 0;
      }
      if (runLen254 >= 4) {
        issues.push({
          location: `Scenes ${runStart254}–${i}`,
          rule: 'SUSPENSE_PLATEAU_FLATLINE',
          severity: 'minor',
          description: `Scenes ${runStart254}–${i} hold suspense essentially flat (|delta| ≤ 0.5 for ${runLen254} consecutive scenes) — tension neither rises nor falls across the stretch. The story flatlines; the audience's sense of forward pressure goes slack.`,
          suggestedFix: 'Break the plateau with a deliberate move on the suspense curve: raise a clock, deliver a setback, or release built tension at a turning point. A flat tension line over four-plus scenes reads as the story idling.',
        });
        break;
      }
    }
  }

  // ── Wave 268: CURIOSITY_FRONT_LOADED ──────────────────────────────────────
  // Three or more strong curiosity spikes (curiosityDelta > 1) all appear in
  // the first half of the story; the second half raises no new questions.
  // The story exhausts its mystery-raising impulse early and coasts on answers
  // — but answers only satisfy if there are still open questions creating forward
  // pull. A second half with no curiosity spikes feels like a lecture on a topic
  // the audience already asked about.
  // Requires 8+ records and 3+ curiosity spikes.
  if (records.length >= 8) {
    const midpoint268 = Math.floor(records.length / 2);
    const curiousSpikes268 = records.filter((r: any) => (r.curiosityDelta ?? 0) > 1);
    if (curiousSpikes268.length >= 3) {
      const secondHalfSpikes268 = curiousSpikes268.filter((r: any) => r.sceneIdx >= midpoint268);
      if (secondHalfSpikes268.length === 0) {
        issues.push({
          location: `First half only (scenes 0–${midpoint268 - 1})`,
          rule: 'CURIOSITY_FRONT_LOADED',
          severity: 'minor',
          description: `All ${curiousSpikes268.length} curiosity spikes occur in the first half (scenes 0–${midpoint268 - 1}); the second half raises no new questions. The story front-loads its mystery and then pivots to pure resolution — but sustained reader curiosity requires open questions throughout, not just in the opening act.`,
          suggestedFix: 'Plant at least one new question or revelation-hook in the second half — a complication that raises a mystery just as earlier ones resolve. Curiosity sustains forward pull; exhausting it at the midpoint leaves the climax carrying only momentum, not genuine suspense.',
        });
      }
    }
  }

  // ── Wave 268: PAYOFF_BACK_LOADED ──────────────────────────────────────────
  // All scenes that fire a callback (payoffSetupIds not empty) appear in the
  // second half of the story; the first half plants setups but delivers no
  // earlier payoffs. Effective structure staggers payoffs — some minor callbacks
  // appear mid-story to reward patience and signal that setups matter. A story
  // that defers every payoff to the final act trains the audience to disengage
  // during setup because nothing they see pays off until the very end.
  // Requires 8+ records and 2+ payoff scenes.
  if (records.length >= 8) {
    const midpoint268b = Math.floor(records.length / 2);
    const payoffScenes268 = records.filter((r: any) => (r.payoffSetupIds?.length ?? 0) > 0);
    if (payoffScenes268.length >= 2) {
      const firstHalfPayoffs268 = payoffScenes268.filter((r: any) => r.sceneIdx < midpoint268b);
      if (firstHalfPayoffs268.length === 0) {
        const payoffIdxList268 = payoffScenes268.map((r: any) => r.sceneIdx).join(', ');
        issues.push({
          location: `Second half only (payoffs at scenes ${payoffIdxList268})`,
          rule: 'PAYOFF_BACK_LOADED',
          severity: 'minor',
          description: `All ${payoffScenes268.length} payoff scenes are in the second half (scenes ${payoffIdxList268}); the first half delivers no callbacks despite its setups. The audience is asked to hold every thread until the end — a story that never pays off anything before the final act trains readers to disengage during setup.`,
          suggestedFix: 'Allow at least one early payoff — a minor callback that confirms the setups are live. Staggered payoffs signal that no planted detail will be forgotten, keeping the audience alert through the middle acts.',
        });
      }
    }
  }

  // ── Wave 268: CLOCK_SINGLE_SCENE ──────────────────────────────────────────
  // In a story long enough to support layered pressure (8+ scenes), only one
  // scene raises a clock. A single deadline is a blunt instrument — it creates
  // one source of urgency that characters can simply wait out. Effective
  // thrillers and dramas layer multiple clocks so that every act generates its
  // own forward pressure. A story this long with a single clock either feels
  // underpressured or leans its entire urgency on one over-weighted moment.
  // Requires 8+ records.
  if (records.length >= 8) {
    const clockScenes268 = records.filter((r: any) => r.clockRaised === true);
    if (clockScenes268.length === 1) {
      issues.push({
        location: `Scene ${clockScenes268[0].sceneIdx} (${clockScenes268[0].slug}) — sole clock`,
        rule: 'CLOCK_SINGLE_SCENE',
        severity: 'minor',
        description: `Only one scene (Scene ${clockScenes268[0].sceneIdx}) raises a clock across a ${records.length}-scene story. A single deadline creates a single source of urgency that characters can wait out; once that scene passes, all clock pressure evaporates. A story this long benefits from layered deadlines — separate ticking clocks in different acts.`,
        suggestedFix: 'Add at least one more clock: a secondary deadline that begins where the first ends, or a nested ticking clock within a single act. Layered urgency keeps the story in forward motion even after the most immediate threat is resolved or defused.',
      });
    }
  }

  // ── Wave 282: Clock clustering, revelation cascade, emotional positive desert ──

  // CLOCK_CLUSTERING (minor, n≥8, ≥3 clocks): All raised clocks appear in the
  // first 40% of the story. The story front-loads all its urgency architecture;
  // the final 60% operates under no deadline pressure. Front-loaded clocks create
  // urgency that dissipates long before the climax — the audience forgets the
  // deadline by the time the resolution arrives. Distinct from CLOCK_SINGLE_SCENE
  // (only one clock total) and CLOCK_RAISED_WITHOUT_PAYOFF (no payoff at all).
  if (records.length >= 8) {
    const clockScenes282 = records.filter((r: any) => r.clockRaised === true);
    if (clockScenes282.length >= 3) {
      const cutoff282 = Math.floor(records.length * 0.4);
      const allEarly282 = clockScenes282.every((r: any) => r.sceneIdx < cutoff282);
      if (allEarly282) {
        issues.push({
          location: `Clock raises (all in first 40%, scenes 0–${cutoff282 - 1})`,
          rule: 'CLOCK_CLUSTERING',
          severity: 'minor',
          description: `All ${clockScenes282.length} clocks are raised in the first 40% of the story (scenes 0–${cutoff282 - 1}) — the deadline architecture is entirely front-loaded. The final 60% of the story carries no clock pressure; whatever urgency the deadlines created has dissipated long before the climax arrives.`,
          suggestedFix: 'Distribute clock raises across the full story: let one deadline resolve mid-story and a new, higher-stakes clock replace it. The climax should arrive under a ticking clock that was raised in Act 2, not one that was set and mostly forgotten in Act 1.',
        });
      }
    }
  }

  // REVELATION_CASCADE (minor, n≥8, ≥4 revelations, >35% of scenes): More than
  // a third of all scenes contain a witnessed revelation. When the story reveals
  // a new truth in more than every third scene, revelations lose their individual
  // impact — the audience becomes habituated to "another reveal" and stops feeling
  // the surprise each one was designed to deliver. Revelations need surrounding
  // space of non-revelation scenes for their shock to settle and consequences to
  // unfold. Distinct from REVELATION_CLUSTERING (three reveals in a 3-scene window):
  // this fires on global density regardless of distribution.
  if (records.length >= 8) {
    const revScenes282 = records.filter((r: any) => r.revelation !== null);
    if (revScenes282.length >= 4 && revScenes282.length / records.length > 0.35) {
      issues.push({
        location: 'Revelation density (global)',
        rule: 'REVELATION_CASCADE',
        severity: 'minor',
        description: `${revScenes282.length} of ${records.length} scenes (${Math.round(revScenes282.length / records.length * 100)}%) contain a witnessed revelation — the story delivers a new truth more than every third scene. Revelation saturation is as damaging as revelation starvation: when surprise is the default mode, the audience stops registering it as surprise.`,
        suggestedFix: 'Space revelations so each one has room to breathe: allow 3–4 non-revelation scenes between each major discovery. The intervening scenes should show characters absorbing and acting on what they learned, before the next truth arrives and resets the board.',
      });
    }
  }

  // EMOTIONAL_POSITIVE_DESERT (minor, n≥10, ≥4 Act 2 scenes): Act 2 (25%–75%)
  // contains no positive emotional shift while at least one positive shift exists
  // elsewhere in the story AND at least one negative shift exists in Act 2.
  // Drama requires contrast: an unbroken expanse of negative and neutral scenes
  // through the middle act denies the audience the light against which darkness
  // registers. A moment of hope, relief, or partial victory in Act 2 makes the
  // subsequent darkness more devastating — not less. Distinct from the voice pass's
  // TONAL_REGISTER_COLLAPSE_ACT2 (all Act 2 scenes share one tone): this fires
  // when Act 2 has tonal variety (negative + neutral) but positivity is absent.
  if (records.length >= 10) {
    const posDesertAct2Start282 = Math.floor(records.length * 0.25);
    const posDesertAct2End282 = Math.floor(records.length * 0.75);
    const act2PosRecs282 = records.slice(posDesertAct2Start282, posDesertAct2End282);
    if (act2PosRecs282.length >= 4) {
      const act2HasPositive282 = act2PosRecs282.some((r: any) => r.emotionalShift === 'positive');
      const act2HasNegative282 = act2PosRecs282.some((r: any) => r.emotionalShift === 'negative');
      const storyHasPositive282 = records.some((r: any) => r.emotionalShift === 'positive');
      if (!act2HasPositive282 && act2HasNegative282 && storyHasPositive282) {
        issues.push({
          location: `Act 2 (Scenes ${posDesertAct2Start282}–${posDesertAct2End282 - 1})`,
          rule: 'EMOTIONAL_POSITIVE_DESERT',
          severity: 'minor',
          description: `Act 2 (${act2PosRecs282.length} scenes) carries negative and neutral emotional shifts but no positive ones, while at least one scene elsewhere in the story offers a positive shift — the entire middle act has no moment of hope, relief, or partial triumph. An unbroken negative arc through Act 2 makes darkness the default state rather than a dramatic choice.`,
          suggestedFix: 'Plant a brief positive beat in Act 2: a false hope, a moment of connection, a small victory the story then subverts. Contrast is the mechanism by which darkness registers; even one positive scene among many negative ones transforms what follows from grimness into genuine tragedy.',
        });
      }
    }
  }

  // ── Wave 296: CLOCK_DELTA_WITHOUT_RAISE ──────────────────────────────────
  // A scene registers significant time pressure (clockDelta > 1) before any
  // clock has been raised anywhere in the story. The audience feels deadline
  // consequences for a deadline that was never established — a causal
  // inversion in the urgency layer. Distinct from CLOCK_GHOST (raise followed
  // by silence) and PAYOFF_WITHOUT_SETUP (clue-level inversion): this fires
  // on pressure effects preceding their cause. Requires 6+ records.
  if (records.length >= 6) {
    for (const r of records as any[]) {
      if (r.clockRaised) break; // a clock is established — later deltas are caused
      if ((r.clockDelta ?? 0) > 1) {
        issues.push({
          location: `Scene ${r.sceneIdx} (${r.slug})`,
          rule: 'CLOCK_DELTA_WITHOUT_RAISE',
          severity: 'minor',
          description: `Scene ${r.sceneIdx} registers significant time pressure (clockDelta ${r.clockDelta}) but no clock has been raised anywhere before it. The audience is asked to feel a deadline tightening before any deadline exists — urgency consequences arrive before their cause, and the pressure reads as unmotivated haste rather than a closing window.`,
          suggestedFix: 'Establish the clock before its pressure mounts: a scene where the deadline is set, the threat is announced, or the window is defined. Once the audience knows what time is running out on, every subsequent tightening lands as escalation rather than noise.',
        });
        break;
      }
    }
  }

  // ── Wave 296: SUSPENSE_SAWTOOTH ──────────────────────────────────────────
  // SuspenseDelta strictly alternates sign (positive/negative) for 6+
  // consecutive scenes. Tension rises and immediately discharges every
  // single scene — it oscillates without ever accumulating, so the story
  // never builds toward anything. Distinct from EMOTIONAL_WHIPLASH (which
  // tracks emotionalShift alternation) and UNEXPLAINED_SUSPENSE_DROP (a
  // single uncaused discharge): this fires on a sustained oscillation
  // pattern in the suspense curve itself. Requires 8+ records.
  if (records.length >= 8) {
    let sawRun296 = 1;
    let sawStart296 = 0;
    for (let i296 = 1; i296 < records.length; i296++) {
      const prev296 = (records as any[])[i296 - 1].suspenseDelta ?? 0;
      const cur296 = (records as any[])[i296].suspenseDelta ?? 0;
      if ((prev296 > 0 && cur296 < 0) || (prev296 < 0 && cur296 > 0)) {
        if (sawRun296 === 1) sawStart296 = i296 - 1;
        sawRun296++;
        if (sawRun296 >= 6) {
          issues.push({
            location: `Scenes ${(records as any[])[sawStart296].sceneIdx}–${(records as any[])[i296].sceneIdx} — suspense sawtooth`,
            rule: 'SUSPENSE_SAWTOOTH',
            severity: 'minor',
            description: `Suspense strictly alternates between rising and falling for ${sawRun296} consecutive scenes (${(records as any[])[sawStart296].sceneIdx}–${(records as any[])[i296].sceneIdx}). Tension discharges the moment it builds — every rise is immediately cancelled, so the story oscillates without accumulating toward anything. The audience learns that no tension will ever be sustained, and stops investing in the rises.`,
            suggestedFix: 'Let tension compound: after a suspense rise, hold or escalate it for at least one more scene before any release. Tension is a debt the story owes the audience — releasing it every scene means the debt never grows large enough for the payoff to matter.',
          });
          break;
        }
      } else {
        sawRun296 = 1;
      }
    }
  }

  // ── Wave 296: DRAMATIC_TURN_AFTERMATH_VOID ───────────────────────────────
  // A scene with a dramatic turn (dramaticTurn !== 'nothing') is followed by
  // two scenes with neutral emotional shift, no suspense rise, and no
  // relationship movement — the turn produces zero causal ripple. Distinct
  // from REVELATION_WITHOUT_REACTION (revelation-specific dialogue reaction)
  // and ACTION_WITHOUT_CONSEQUENCE (plot-level consequence): this audits the
  // immediate two-scene wake of any declared dramatic turn across emotional,
  // suspense, AND relational channels simultaneously. Requires 6+ records.
  if (records.length >= 6) {
    for (let i296b = 0; i296b < records.length - 2; i296b++) {
      const r296 = (records as any[])[i296b];
      if ((r296.dramaticTurn ?? 'nothing') === 'nothing') continue;
      const wake296 = (records as any[]).slice(i296b + 1, i296b + 3);
      const wakeInert296 = wake296.length === 2 && wake296.every((w: any) =>
        w.emotionalShift === 'neutral' &&
        (w.suspenseDelta ?? 0) <= 0 &&
        ((w.relationshipShifts ?? []) as any[]).length === 0,
      );
      if (wakeInert296) {
        issues.push({
          location: `Scene ${r296.sceneIdx} (dramatic turn: ${r296.dramaticTurn})`,
          rule: 'DRAMATIC_TURN_AFTERMATH_VOID',
          severity: 'minor',
          description: `Scene ${r296.sceneIdx} delivers a dramatic turn ("${r296.dramaticTurn}") but the next two scenes are causally inert — neutral emotion, no suspense rise, no relationship movement. A turn that changes nothing downstream is a turn in name only; the story declares a pivot and then proceeds as if it never happened.`,
          suggestedFix: 'Let the turn ripple: the scenes immediately after a reversal or revelation should show characters adjusting — an emotional shift, a relationship strained or realigned, suspense climbing as the new situation sinks in. The size of a turn is measured by its wake, not its announcement.',
        });
        break;
      }
    }
  }

  // ── Wave 310: EMOTION_WITHOUT_DRIVER_RUN ─────────────────────────────────
  // Three or more consecutive scenes carry a non-neutral emotional shift, yet
  // none of them contains any mechanical driver — no suspense rise, no
  // relationship movement, no revelation, no clock raised. The emotional curve
  // swings with nothing on the page to cause it. Distinct from REACTION_WITHOUT_
  // CAUSE (per-scene, audits the prior scene for a cause) and EMOTIONAL_WHIPLASH
  // (sign alternation): this flags a sustained run of driverless feeling.
  // Requires 8+ records.
  if (records.length >= 8) {
    const hasDriver310 = (r: any) =>
      (r.suspenseDelta ?? 0) > 0 ||
      ((r.relationshipShifts ?? []) as any[]).length > 0 ||
      r.revelation !== null ||
      r.clockRaised === true;
    let run310 = 0;
    let start310 = 0;
    for (let i310 = 0; i310 < records.length; i310++) {
      const r310: any = records[i310];
      if (r310.emotionalShift !== 'neutral' && !hasDriver310(r310)) {
        if (run310 === 0) start310 = i310;
        run310++;
        if (run310 >= 3) {
          issues.push({
            location: `Scenes ${(records as any[])[start310].sceneIdx}–${r310.sceneIdx} — driverless emotion`,
            rule: 'EMOTION_WITHOUT_DRIVER_RUN',
            severity: 'minor',
            description: `${run310} consecutive scenes (${(records as any[])[start310].sceneIdx}–${r310.sceneIdx}) carry a non-neutral emotional shift but none contains any driver — no suspense rise, no relationship movement, no revelation, no clock raised. The emotional curve swings with nothing on the page to cause it; the feelings are asserted rather than earned.`,
            suggestedFix: 'Give each emotional beat a visible cause: a piece of news, a confrontation, a deadline tightening, a relationship turning. Emotion is the audience\'s reading of consequence — when the consequence is missing, the feeling reads as the script telling them how to feel.',
          });
          break;
        }
      } else {
        run310 = 0;
      }
    }
  }

  // ── Wave 310: CLOCK_RELIEF_UNEXPLAINED ───────────────────────────────────
  // A scene's clock pressure drops (clockDelta < 0) with no revelation and no
  // payoff in that scene or the next — a deadline relaxes for no visible reason.
  // The ticking clock is the audience's tension contract; releasing it without
  // a cause (the bomb defused, the truth found, the deadline met) breaks that
  // contract silently. Distinct from CLOCK_GHOST (a raise that fades) and
  // CLOCK_DELTA_WITHOUT_RAISE (pressure before a clock exists): this flags an
  // uncaused release of established pressure. Requires 6+ records.
  if (records.length >= 6) {
    for (let i310b = 0; i310b < records.length; i310b++) {
      const r310b: any = records[i310b];
      if ((r310b.clockDelta ?? 0) < 0) {
        const window310 = [r310b, (records as any[])[i310b + 1]].filter(Boolean);
        const caused310 = window310.some(w =>
          w.revelation !== null || ((w.payoffSetupIds ?? []) as any[]).length > 0,
        );
        if (!caused310) {
          issues.push({
            location: `Scene ${r310b.sceneIdx} (clock relief)`,
            rule: 'CLOCK_RELIEF_UNEXPLAINED',
            severity: 'minor',
            description: `Scene ${r310b.sceneIdx} releases clock pressure (clockDelta ${r310b.clockDelta}) with no revelation or payoff in that scene or the next — the deadline relaxes for no visible reason. A ticking clock is a tension contract with the audience; relieving it without a cause (the bomb defused, the deadline met, the truth found) breaks the contract silently and lets the air out of the scene.`,
            suggestedFix: 'Tie every drop in time pressure to a concrete cause: the protagonist resolves the threat, buys time through a choice, or discovers the deadline was false. If the clock should stay live, do not relax it — sustained pressure is the point of raising it in the first place.',
          });
          break;
        }
      }
    }
  }

  // ── Wave 310: DRAMATIC_TURN_CLUSTER ──────────────────────────────────────
  // Three or more dramatic turns fall within a three-scene window. Reversals
  // and revelations piled this tightly give the audience no time to register
  // one pivot before the next overwrites it — the turns cannibalize each
  // other's impact. The dramatic-turn analogue of REVELATION_CASCADE (which
  // counts revelation density) and distinct from DRAMATIC_TURN_AFTERMATH_VOID
  // (a single turn with an inert wake). Requires 6+ records.
  if (records.length >= 6) {
    for (let i310c = 0; i310c + 2 < records.length; i310c++) {
      const window310c = (records as any[]).slice(i310c, i310c + 3);
      const turnCount310 = window310c.filter(r => (r.dramaticTurn ?? 'nothing') !== 'nothing').length;
      if (turnCount310 >= 3) {
        issues.push({
          location: `Scenes ${window310c[0].sceneIdx}–${window310c[2].sceneIdx} — turn cluster`,
          rule: 'DRAMATIC_TURN_CLUSTER',
          severity: 'minor',
          description: `Scenes ${window310c[0].sceneIdx}–${window310c[2].sceneIdx} contain ${turnCount310} dramatic turns in a row — reversals and revelations piled into a three-scene window. The audience gets no time to register one pivot before the next overwrites it, and the turns cannibalize each other's impact instead of compounding it.`,
          suggestedFix: 'Space the turns out. Let each reversal land and ripple — give the characters (and the audience) a scene to absorb and react before the next pivot. Bank some of the clustered turns for later acts where the story needs a fresh jolt.',
        });
        break;
      }
    }
  }

  // ── Wave 324: SUSPENSE_UNRELEASED_RUN, CLOCK_RAISED_NO_DELTA, EMOTIONAL_NEUTRAL_RUN ──

  // SUSPENSE_UNRELEASED_RUN (minor, n≥8): Six or more consecutive scenes each
  // carry a positive suspenseDelta — tension only ever builds and is never
  // discharged across a long stretch. A story needs release valleys: sustained
  // un-relieved rising tension exhausts the audience and leaves no room to
  // escalate further when the climax arrives. Distinct from ESCALATION_PLATEAU
  // (peak-height comparison), SUSPENSE_SAWTOOTH (strict sign alternation), and
  // SUSPENSE_PLATEAU_FLATLINE (a flat, near-zero run).
  if (records.length >= 8) {
    let srun324 = 0;
    let sstart324 = 0;
    for (let i324 = 0; i324 < records.length; i324++) {
      if (((records as any[])[i324].suspenseDelta ?? 0) > 0) {
        if (srun324 === 0) sstart324 = i324;
        srun324++;
        if (srun324 >= 6) {
          issues.push({
            location: `Scenes ${(records as any[])[sstart324].sceneIdx}–${(records as any[])[i324].sceneIdx} — unreleased tension`,
            rule: 'SUSPENSE_UNRELEASED_RUN',
            severity: 'minor',
            description: `${srun324} consecutive scenes (${(records as any[])[sstart324].sceneIdx}–${(records as any[])[i324].sceneIdx}) each raise suspense with no release in between — tension only ever builds across the whole stretch. Sustained un-relieved rising tension exhausts the audience: without valleys, there is no contrast to make the peaks feel high, and the climax has no headroom left to escalate into.`,
            suggestedFix: 'Carve a release valley into the run: a scene where the immediate threat eases, a small win, a quiet beat that lets the audience exhale. Tension reads as high only against relief; a relief beat now lets the climax spike higher later.',
          });
          break;
        }
      } else {
        srun324 = 0;
      }
    }
  }

  // CLOCK_RAISED_NO_DELTA (minor, n≥6, ≥2 scenes): Two or more scenes set
  // clockRaised === true but carry clockDelta === 0 — a deadline is announced
  // without any measurable change in time pressure. The clock is raised
  // cosmetically: the story says "time is running out" but the pressure gauge
  // never moves. Distinct from CLOCK_DELTA_WITHOUT_RAISE (the inverse — pressure
  // effects with no clock established) and CLOCK_GHOST (a raise that later fades).
  if (records.length >= 6) {
    const noDeltaClocks324 = (records as any[]).filter(r => r.clockRaised === true && (r.clockDelta ?? 0) === 0);
    if (noDeltaClocks324.length >= 2) {
      issues.push({
        location: `${noDeltaClocks324.length} clock-raise scene(s) with no delta`,
        rule: 'CLOCK_RAISED_NO_DELTA',
        severity: 'minor',
        description: `${noDeltaClocks324.length} scenes raise a clock (clockRaised) but carry clockDelta 0 — a deadline is announced with no measurable change in time pressure. The clock is raised cosmetically: the script says "time is running out" while the pressure gauge never moves, so the announced urgency has no mechanical force behind it.`,
        suggestedFix: 'Give every clock raise a real delta: when a deadline is introduced or tightened, the time pressure should measurably increase. If a scene only references an existing clock without changing it, do not flag it as a raise — reserve clockRaised for moments that genuinely move the deadline.',
      });
    }
  }

  // EMOTIONAL_NEUTRAL_RUN (minor, n≥10): Six or more consecutive scenes are all
  // emotionally neutral — the emotional curve flatlines for a long stretch. The
  // audience reads emotion as their stake in the story; a long neutral run is
  // dead air where they have nothing to feel. Distinct from EMOTIONAL_MONOTONY
  // (three consecutive IDENTICAL non-neutral shifts) and EMOTION_WITHOUT_DRIVER_
  // RUN (non-neutral shifts lacking a cause): this flags sustained absence of
  // any emotional movement at all.
  if (records.length >= 10) {
    let erun324 = 0;
    let estart324 = 0;
    for (let i324e = 0; i324e < records.length; i324e++) {
      if ((records as any[])[i324e].emotionalShift === 'neutral') {
        if (erun324 === 0) estart324 = i324e;
        erun324++;
        if (erun324 >= 6) {
          issues.push({
            location: `Scenes ${(records as any[])[estart324].sceneIdx}–${(records as any[])[i324e].sceneIdx} — emotional flatline`,
            rule: 'EMOTIONAL_NEUTRAL_RUN',
            severity: 'minor',
            description: `${erun324} consecutive scenes (${(records as any[])[estart324].sceneIdx}–${(records as any[])[i324e].sceneIdx}) are all emotionally neutral — the emotional curve flatlines for a long stretch. The audience reads emotional movement as their stake in the story; a sustained neutral run is dead air where they are given nothing to feel, and disengagement sets in regardless of how active the plot is.`,
            suggestedFix: 'Inject emotional movement into the flat stretch: a small loss, an unexpected kindness, a flare of fear or hope. Plot events should leave emotional residue on the characters; if a run of scenes moves the plot but stirs no feeling, the audience is watching machinery, not people.',
          });
          break;
        }
      } else {
        erun324 = 0;
      }
    }
  }

  // ── Wave 335: PAYOFF_CURIOSITY_DECOUPLED, DRAMATIC_TURN_CURIOSITY_VOID, CLUE_SEED_SUSPENSE_VOID ──

  // PAYOFF_CURIOSITY_DECOUPLED (minor, n≥8, ≥3 payoff scenes): Scenes that pay off a
  // planted thread (payoffSetupIds non-empty) have an average curiosityDelta of zero or
  // less — resolutions close one question without opening another. Good payoffs are
  // bittersweet: they resolve the setup but spawn new uncertainties that keep the
  // audience hooked. If every payoff lands flat or even suppresses curiosity, the story
  // feels like a ledger being cleared rather than a living system. Distinct from
  // PAYOFF_BACK_LOADED (timing of payoffs), PAYOFF_WITHOUT_SETUP (missing prior seed),
  // CURIOSITY_OPEN_LOOP (unresolved mystery loops), and CURIOSITY_FRONT_LOADED (timing).
  if (records.length >= 8) {
    const payoffScenes335 = (records as any[]).filter(r => Array.isArray(r.payoffSetupIds) && r.payoffSetupIds.length > 0);
    if (payoffScenes335.length >= 3) {
      const avgCuriosity335p = payoffScenes335.reduce((s: number, r: any) => s + (r.curiosityDelta ?? 0), 0) / payoffScenes335.length;
      if (avgCuriosity335p <= 0) {
        issues.push({
          location: `${payoffScenes335.length} payoff scene(s) — avg curiosityDelta ${avgCuriosity335p.toFixed(2)}`,
          rule: 'PAYOFF_CURIOSITY_DECOUPLED',
          severity: 'minor',
          description: `${payoffScenes335.length} payoff scenes (scenes that resolve planted threads) have an average curiosityDelta of ${avgCuriosity335p.toFixed(2)} — resolutions consistently close questions without opening new ones. Effective payoffs are generative: answering the setup question should reveal a new layer of uncertainty that propels the audience forward. When every resolution leaves curiosity flat or negative, the story's momentum stalls each time a thread closes.`,
          suggestedFix: "Design payoffs to be revelatory rather than merely conclusive: the answer to one question should expose a deeper question, a new complication, or an unexpected implication. Each resolved thread can become the root of a new one — let the payoff scene's curiosityDelta reflect that the audience's hunger has been redirected, not satisfied.",
        });
      }
    }
  }

  // DRAMATIC_TURN_CURIOSITY_VOID (minor, n≥10, ≥3 dramatic turn scenes): Scenes with a
  // genuine dramaticTurn (reversal, recognition, or twist — not 'nothing') have an
  // average curiosityDelta of zero or less — pivots and reversals that don't ignite
  // audience wonder. A twist should make the audience ask "what does this mean now?" and
  // "what happens next?"; if the story changes direction but the audience's curiosity
  // doesn't rise, the turn has mechanical form but no narrative electricity. Distinct from
  // DRAMATIC_TURN_AFTERMATH_VOID (checks emptiness of the 2 scenes after a reversal),
  // DRAMATIC_TURN_CLUSTER (too many turns in a tight window), and CAUSAL_MIDPOINT_VOID
  // (causal absence at the midpoint specifically).
  if (records.length >= 10) {
    const turnScenes335 = (records as any[]).filter(r => r.dramaticTurn && r.dramaticTurn !== 'nothing');
    if (turnScenes335.length >= 3) {
      const avgCuriosity335t = turnScenes335.reduce((s: number, r: any) => s + (r.curiosityDelta ?? 0), 0) / turnScenes335.length;
      if (avgCuriosity335t <= 0) {
        issues.push({
          location: `${turnScenes335.length} dramatic turn scene(s) — avg curiosityDelta ${avgCuriosity335t.toFixed(2)}`,
          rule: 'DRAMATIC_TURN_CURIOSITY_VOID',
          severity: 'minor',
          description: `${turnScenes335.length} scenes contain a genuine dramatic turn (reversal, recognition, or twist) but have an average curiosityDelta of ${avgCuriosity335t.toFixed(2)} — the story's pivots fail to ignite audience curiosity. A twist should leave the audience hungry: "what does this mean now?", "what will they do?", "where does this go?" If reversals consistently fail to raise curiosity, the turns are mechanical shape-changes with no narrative electricity — the audience can see the gears, but they feel nothing.`,
          suggestedFix: 'Make each dramatic turn productive: the reversal should open questions it cannot immediately answer. A recognition scene exposes a new unknown; a twist reframes everything in a way that generates fresh uncertainty. Let the curiosityDelta on turn scenes reflect that the audience has been sent leaning forward, not just informed that the situation has changed.',
        });
      }
    }
  }

  // CLUE_SEED_SUSPENSE_VOID (minor, n≥8, ≥3 clue-seeding scenes): Scenes that plant
  // story clues (seededClueIds non-empty) have an average suspenseDelta of zero or less —
  // foreshadowing that carries no foreboding. When a clue is seeded, the audience should
  // sense that something is being set in motion — a quiet dread, a ticking implication.
  // If clue-planting scenes are suspense-neutral or negative, the planted clues feel
  // cosmetic: the writer is leaving breadcrumbs, but the audience has no reason to feel
  // the weight of them. Distinct from CLUE_SEED_CLUSTER (all seeds concentrated in one
  // scene), CHEKHOV_GUN_UNFIRED (seeds that are never paid off), and
  // REVELATION_WITHOUT_SETUP (revelations that lack prior seeds).
  if (records.length >= 8) {
    const seedScenes335 = (records as any[]).filter(r => Array.isArray(r.seededClueIds) && r.seededClueIds.length > 0);
    if (seedScenes335.length >= 3) {
      const avgSuspense335s = seedScenes335.reduce((s: number, r: any) => s + (r.suspenseDelta ?? 0), 0) / seedScenes335.length;
      if (avgSuspense335s <= 0) {
        issues.push({
          location: `${seedScenes335.length} clue-seeding scene(s) — avg suspenseDelta ${avgSuspense335s.toFixed(2)}`,
          rule: 'CLUE_SEED_SUSPENSE_VOID',
          severity: 'minor',
          description: `${seedScenes335.length} scenes plant story clues but have an average suspenseDelta of ${avgSuspense335s.toFixed(2)} — foreshadowing without foreboding. A seeded clue should carry weight: the audience should sense that something is being set in motion, even if they cannot name it yet. When clue-planting scenes are suspense-flat or suspense-negative, the foreshadowing is cosmetic — breadcrumbs with no dread attached, so the eventual payoff lands without the accumulated pressure that should make it resonate.`,
          suggestedFix: 'Let each clue carry its own shadow: the scene that plants the seed should also tighten something — a glance held too long, an object that feels wrong, a line that could mean two things. Suspense need not be overt; a mild positive suspenseDelta on each seed scene signals that the audience has felt the implications, even subliminally, before the payoff arrives.',
        });
      }
    }
  }

  // ── Wave 349: CLOCK_RAISED_NO_EMOTION, DRAMATIC_TURN_NO_SUSPENSE, SUSPENSE_SPIKE_NO_FALLOUT ──

  // CLOCK_RAISED_NO_EMOTION (minor, n≥6, ≥2 clock-raise scenes): Every scene that
  // raises a clock (clockRaised === true) is emotionally neutral — deadlines are
  // announced but generate no felt pressure. A ticking clock is an emotional device:
  // it should produce dread, urgency, or desperate resolve. When every clock-raise lands
  // in an affectless scene, the deadline is a plot mechanic the characters note rather
  // than feel, and the audience registers the countdown without anxiety. Distinct from
  // CLOCK_RAISED_NO_DELTA (no measurable change in time pressure), CLOCK_RAISED_WITHOUT_
  // PAYOFF (no downstream payoff), and CLOCK_RELIEF_UNEXPLAINED (uncaused release).
  if (records.length >= 6) {
    const clockScenes349 = (records as any[]).filter(r => r.clockRaised === true);
    if (clockScenes349.length >= 2 && clockScenes349.every(r => r.emotionalShift === 'neutral')) {
      issues.push({
        location: `${clockScenes349.length} clock-raise scene(s) — emotional register`,
        rule: 'CLOCK_RAISED_NO_EMOTION',
        severity: 'minor',
        description: `All ${clockScenes349.length} scenes that raise a clock are emotionally neutral — deadlines are announced but generate no felt pressure. A ticking clock is an emotional device: it should produce dread, urgency, or desperate resolve in the people racing it. When every clock-raise lands in an affectless scene, the countdown is a plot mechanic the characters note rather than feel, and the audience watches the timer without anxiety.`,
        suggestedFix: 'Let each deadline land emotionally: the moment the clock tightens, show what it costs the characters to feel it — the spike of fear, the grim acceptance, the panic that forces a bad choice. A clock the characters dread is a clock the audience dreads; a clock nobody feels is just a number.',
      });
    }
  }

  // DRAMATIC_TURN_NO_SUSPENSE (minor, n≥10, ≥3 turn scenes): Scenes carrying a genuine
  // dramatic turn (dramaticTurn !== 'nothing') have an average suspenseDelta of zero or
  // less — the story's pivots generate no tension. A reversal or recognition should
  // tighten the screw: the moment the situation flips is the moment the audience should
  // feel the most uncertain about what happens next. When turns are consistently
  // tension-flat, they read as administrative plot changes rather than dangerous pivots.
  // The suspense analogue of DRAMATIC_TURN_CURIOSITY_VOID (Wave 335, curiosity channel);
  // distinct from DRAMATIC_TURN_AFTERMATH_VOID (downstream ripple) and DRAMATIC_TURN_
  // CLUSTER (timing).
  if (records.length >= 10) {
    const turnScenes349 = (records as any[]).filter(r => (r.dramaticTurn ?? 'nothing') !== 'nothing');
    if (turnScenes349.length >= 3) {
      const avgSusp349 = turnScenes349.reduce((s: number, r: any) => s + (r.suspenseDelta ?? 0), 0) / turnScenes349.length;
      if (avgSusp349 <= 0) {
        issues.push({
          location: `${turnScenes349.length} dramatic-turn scene(s) — avg suspenseDelta ${avgSusp349.toFixed(2)}`,
          rule: 'DRAMATIC_TURN_NO_SUSPENSE',
          severity: 'minor',
          description: `The ${turnScenes349.length} dramatic-turn scenes (reversals, recognitions, twists) have an average suspenseDelta of ${avgSusp349.toFixed(2)} — the story's pivots generate no tension. A turn is where the situation flips, and that flip should be the most uncertain moment in its stretch: the audience should not know what happens next. When turns land tension-flat, they read as administrative plot changes rather than dangerous pivots that threaten the protagonist.`,
          suggestedFix: 'Make each turn dangerous: the reversal should raise the stakes and the uncertainty at once — a new threat exposed, an advantage lost, a deadline tightened by the twist. A pivot that does not raise suspense is a change the audience is informed of rather than gripped by.',
        });
      }
    }
  }

  // SUSPENSE_SPIKE_NO_FALLOUT (minor, n≥8, ≥2 spikes): Two or more scenes spike suspense
  // (suspenseDelta > 1.5) and not one of them is followed, within the next two scenes, by
  // any consequence — no emotional shift, no relationship shift, no revelation, no dramatic
  // turn. Tension is raised and then absorbed without effect: the spike is a dead end
  // rather than the cause of something. Suspense is a promise of consequence; a spike that
  // changes nothing downstream teaches the audience that the story's alarms are false.
  // Distinct from SUSPENSE_SPIKE_NO_CAUSE (the upstream gap — a spike with no escalation
  // before it), DRAMATIC_TURN_AFTERMATH_VOID (triggered by a reversal, not a suspense
  // spike), and REVELATION_WITHOUT_REACTION (triggered by a revelation).
  if (records.length >= 8) {
    const n349 = records.length;
    const hasFallout349 = (idx: number): boolean => {
      for (let k349 = idx + 1; k349 <= Math.min(idx + 2, n349 - 1); k349++) {
        const r = (records as any[])[k349];
        if ((r.emotionalShift ?? 'neutral') !== 'neutral') return true;
        if (((r.relationshipShifts ?? []) as any[]).length > 0) return true;
        if (r.revelation !== null && r.revelation !== undefined) return true;
        if ((r.dramaticTurn ?? 'nothing') !== 'nothing') return true;
      }
      return false;
    };
    const spikes349 = (records as any[]).filter(r => (r.suspenseDelta ?? 0) > 1.5);
    if (spikes349.length >= 2 && !spikes349.some(s => hasFallout349((records as any[]).indexOf(s)))) {
      issues.push({
        location: `${spikes349.length} suspense spike(s) — no downstream fallout`,
        rule: 'SUSPENSE_SPIKE_NO_FALLOUT',
        severity: 'minor',
        description: `${spikes349.length} scenes spike suspense (suspenseDelta > 1.5) but none is followed within two scenes by any consequence — no emotional shift, no relationship move, no revelation, no dramatic turn. Tension is raised and then absorbed without effect, so each spike is a dead end rather than the cause of something. Suspense is a promise of consequence; spikes that change nothing downstream teach the audience that the story's alarms are false.`,
        suggestedFix: 'Let each suspense spike detonate: the scenes right after a tension peak should carry its fallout — a relationship fractured by the crisis, a truth forced into the open, an emotional wound, a reversal. If a spike leads to nothing, either pay it off downstream or cut it; tension that never delivers trains the audience to stop feeling it.',
      });
    }
  }

  // ── Wave 363: PAYOFF_NO_EMOTION, SEED_SCENE_CURIOSITY_VOID, CLOCK_RAISE_CURIOSITY_VOID ──

  // PAYOFF_NO_EMOTION (minor, n≥8, ≥2 payoff scenes): Every scene carrying a
  // payoff (payoffSetupIds non-empty) is emotionally neutral — planted threads
  // resolve without anyone feeling the resolution. A payoff is the completion of a
  // story promise; when every completion lands in an affectless scene, the resolution
  // is informational rather than dramatic: the audience learns the thread is closed
  // without feeling what the closure cost or gave. Distinct from PAYOFF_CURIOSITY_
  // DECOUPLED (curiosityDelta channel) and PAYOFF_BACK_LOADED (timing, not emotional
  // content).
  if (records.length >= 8) {
    const payoffScenes363 = (records as any[]).filter(r =>
      ((r.payoffSetupIds ?? []) as any[]).length > 0,
    );
    if (payoffScenes363.length >= 2 && payoffScenes363.every(r => r.emotionalShift === 'neutral')) {
      issues.push({
        location: `${payoffScenes363.length} payoff scene(s) — emotional register`,
        rule: 'PAYOFF_NO_EMOTION',
        severity: 'minor',
        description: `All ${payoffScenes363.length} scenes where a planted thread resolves are emotionally neutral — the closures are informational rather than dramatic. A payoff completes a promise to the audience; when every completion lands in an affectless scene, the audience learns the thread is closed without feeling what that closure cost or gave them. Resolution without emotion is accounting, not catharsis.`,
        suggestedFix: 'Let each payoff land emotionally: when a thread resolves, the character should feel the weight of its closing — relief, grief, triumph, regret. A payoff scene that generates no emotional charge suggests either the setup was too distant to still matter or the resolution was handled too quickly to feel. Make the completion cost or reward someone.',
      });
    }
  }

  // SEED_SCENE_CURIOSITY_VOID (minor, n≥8, ≥3 seed scenes): Scenes that plant
  // clues (seededClueIds non-empty) average a curiosityDelta of zero or less. The
  // story's foreshadowing engine is firing but never opening questions in the
  // audience. When clues are planted in curiosity-flat scenes, the seeds are
  // invisible to the audience — they receive information they might need later
  // without wondering what it means. Distinct from CLUE_SEED_SUSPENSE_VOID (the
  // suspense channel) and PAYOFF_CURIOSITY_DECOUPLED (payoff scenes, not seed scenes).
  if (records.length >= 8) {
    const seedScenes363 = (records as any[]).filter(r =>
      ((r.seededClueIds ?? []) as any[]).length > 0,
    );
    if (seedScenes363.length >= 3) {
      const avgSeedCuriosity363 = seedScenes363.reduce((s: number, r: any) => s + (r.curiosityDelta ?? 0), 0) / seedScenes363.length;
      if (avgSeedCuriosity363 <= 0) {
        issues.push({
          location: `${seedScenes363.length} seed scene(s) — curiosity register`,
          rule: 'SEED_SCENE_CURIOSITY_VOID',
          severity: 'minor',
          description: `${seedScenes363.length} scenes that plant clues (seededClueIds) average a curiosityDelta of ${avgSeedCuriosity363.toFixed(2)} — the foreshadowing engine is running but never opening questions. When clues are planted in curiosity-flat scenes, the seeds are invisible: the audience receives information without wondering what it means, so the clue sits inert until the payoff rather than building anticipation across the intervening scenes.`,
          suggestedFix: 'Make each clue plant raise a question: the detail seeded should feel strange, incomplete, or significant enough that the audience wants to know what it means. A clue that sparks curiosity when planted makes its payoff satisfying; a clue planted in a curiosity-flat scene arrives as data and pays off as more data.',
        });
      }
    }
  }

  // CLOCK_RAISE_CURIOSITY_VOID (minor, n≥8, ≥2 clock scenes): Scenes that raise
  // the clock (clockRaised === true) average a curiosityDelta of zero or less.
  // Deadlines generate dread but not the wondering urgency of "how can they possibly
  // escape?" — the clock creates pressure but closes off questions rather than opening
  // them. The most effective urgency combines fear and wonder: the audience should
  // feel time running out AND be urgently curious whether the protagonist can solve
  // the problem in time. Distinct from CLOCK_RAISED_NO_EMOTION (emotionalShift
  // channel) and CLOCK_RAISED_NO_DELTA (cosmetic deadlines with no pressure increase).
  if (records.length >= 8) {
    const clockScenes363 = (records as any[]).filter(r => r.clockRaised === true);
    if (clockScenes363.length >= 2) {
      const avgClockCuriosity363 = clockScenes363.reduce((s: number, r: any) => s + (r.curiosityDelta ?? 0), 0) / clockScenes363.length;
      if (avgClockCuriosity363 <= 0) {
        issues.push({
          location: `${clockScenes363.length} clock-raise scene(s) — curiosity register`,
          rule: 'CLOCK_RAISE_CURIOSITY_VOID',
          severity: 'minor',
          description: `${clockScenes363.length} clock-raise scenes average a curiosityDelta of ${avgClockCuriosity363.toFixed(2)} — deadlines create pressure but never make the audience wonder how the protagonist escapes. Effective urgency combines dread and curiosity: a clock should make the audience feel time running out AND urgently want to know whether there is a way out. When deadlines average negative curiosity, the clock closes off possibility rather than opening the question of survival.`,
          suggestedFix: 'Let each deadline raise a question alongside the pressure: a clock tightened should make the audience wonder "how?" not just fear "what if they fail?" Pair each deadline with an obstacle that is interesting rather than just crushing — the countdown is unbearable when the audience is urgently curious whether the protagonist can thread the needle.',
        });
      }
    }
  }

  // ── Wave 377: DRAMATIC_TURN_NO_EMOTION, CLOCK_RAISE_NO_SUSPENSE, SUSPENSE_SPIKE_NO_CURIOSITY ──

  // DRAMATIC_TURN_NO_EMOTION (minor, n≥8, ≥3 turn scenes): Every scene carrying a
  // dramatic turn (dramaticTurn !== 'nothing') is emotionally neutral — the story's pivots
  // move no one. A reversal or recognition should land as a felt event: shock, grief, hope,
  // dread. When every turn is affectless, the plot changes direction while the protagonist
  // registers nothing, so the audience processes the pivot as information rather than
  // experiencing it. Completes the dramatic-turn channel set with DRAMATIC_TURN_NO_SUSPENSE
  // and DRAMATIC_TURN_CURIOSITY_VOID; distinct from DRAMATIC_TURN_AFTERMATH_VOID (downstream
  // ripple) and EMOTIONAL_NEUTRAL_RUN (consecutive neutral scenes).
  if (records.length >= 8) {
    const turnScenes377 = (records as any[]).filter(r => (r.dramaticTurn ?? 'nothing') !== 'nothing');
    if (turnScenes377.length >= 3 && turnScenes377.every(r => r.emotionalShift === 'neutral')) {
      issues.push({
        location: `${turnScenes377.length} dramatic-turn scene(s) — emotional register`,
        rule: 'DRAMATIC_TURN_NO_EMOTION',
        severity: 'minor',
        description: `All ${turnScenes377.length} dramatic-turn scenes (reversals, recognitions, twists) are emotionally neutral — the story's pivots move no one. A turn is where the situation flips, and the flip should land as a felt event: shock, grief, hope, dread. When every pivot is affectless, the plot changes direction while the protagonist registers nothing, so the audience processes each turn as information rather than experiencing it as drama.`,
        suggestedFix: 'Let each dramatic turn land emotionally: the reversal that wounds, the recognition that devastates or elates. A pivot the protagonist feels is a pivot the audience feels; one that leaves them neutral is a plot mechanic the story reports rather than a turn it dramatizes.',
      });
    }
  }

  // CLOCK_RAISE_NO_SUSPENSE (minor, n≥8, ≥2 clock scenes): Scenes that raise a clock
  // (clockRaised === true) average a suspenseDelta of zero or less — deadlines generate no
  // tension. A ticking clock exists to tighten the screw; when raising it produces no
  // measurable suspense, the deadline is a label rather than a pressure. Completes the
  // clock-raise channel set with CLOCK_RAISED_NO_EMOTION and CLOCK_RAISE_CURIOSITY_VOID;
  // distinct from CLOCK_RAISED_NO_DELTA (no change in time pressure) and SUSPENSE checks
  // not keyed to the clockRaised field.
  if (records.length >= 8) {
    const clockScenes377 = (records as any[]).filter(r => r.clockRaised === true);
    if (clockScenes377.length >= 2) {
      const avgSusp377 = clockScenes377.reduce((s: number, r: any) => s + (r.suspenseDelta ?? 0), 0) / clockScenes377.length;
      if (avgSusp377 <= 0) {
        issues.push({
          location: `${clockScenes377.length} clock-raise scene(s) — suspense register`,
          rule: 'CLOCK_RAISE_NO_SUSPENSE',
          severity: 'minor',
          description: `The ${clockScenes377.length} clock-raise scenes average a suspenseDelta of ${avgSusp377.toFixed(2)} — deadlines generate no tension. A ticking clock exists to tighten the screw; when raising it produces no measurable suspense, the deadline is a label the story announces rather than a pressure the audience feels. The countdown is stated but never bites.`,
          suggestedFix: 'Make each deadline raise the tension: the moment the clock tightens should narrow the protagonist\'s options and sharpen the danger of failing. A clock that does not raise suspense is a number on a wall; one that does is the engine driving the audience to the edge of their seat.',
        });
      }
    }
  }

  // SUSPENSE_SPIKE_NO_CURIOSITY (minor, n≥8, ≥2 spikes): Scenes that spike suspense
  // (suspenseDelta > 1.5) average a curiosityDelta of zero or less — the story's most
  // dangerous moments raise no questions about what happens next. Suspense and curiosity
  // are distinct engines: tension makes the audience fear an outcome, curiosity makes them
  // need to know it. A spike that closes off questions is a dead-end thrill — gripping in
  // the moment but generating no forward pull. Distinct from SUSPENSE_SPIKE_NO_CAUSE
  // (upstream escalation gap), SUSPENSE_SPIKE_NO_FALLOUT (downstream consequence), and
  // DRAMATIC_TURN_CURIOSITY_VOID (turn scenes, not suspense spikes).
  if (records.length >= 8) {
    const spikes377 = (records as any[]).filter(r => (r.suspenseDelta ?? 0) > 1.5);
    if (spikes377.length >= 2) {
      const avgCur377 = spikes377.reduce((s: number, r: any) => s + (r.curiosityDelta ?? 0), 0) / spikes377.length;
      if (avgCur377 <= 0) {
        issues.push({
          location: `${spikes377.length} suspense-spike scene(s) — curiosity register`,
          rule: 'SUSPENSE_SPIKE_NO_CURIOSITY',
          severity: 'minor',
          description: `The ${spikes377.length} suspense-spike scenes (suspenseDelta > 1.5) average a curiosityDelta of ${avgCur377.toFixed(2)} — the story's most dangerous moments raise no questions about what happens next. Tension and curiosity are distinct engines: suspense makes the audience fear an outcome, curiosity makes them need to know it. A spike that closes off questions is a dead-end thrill — gripping in the moment but generating no forward pull into the next scene.`,
          suggestedFix: 'Let high-tension scenes also open questions: a danger that exposes a new unknown, a crisis that raises the stakes of a mystery. When a suspense spike both frightens and intrigues, it pulls the audience forward; when it only frightens, the tension dissipates the moment the scene ends.',
        });
      }
    }
  }

  // ── Wave 391: SUSPENSE_SPIKE_NO_EMOTION, CLOCK_RAISE_NO_FALLOUT, CURIOSITY_SPIKE_NO_FALLOUT ──

  // SUSPENSE_SPIKE_NO_EMOTION (minor, n≥8, ≥2 spikes): Every scene that spikes suspense
  // (suspenseDelta > 1.5) is emotionally neutral — the story's most tense moments never move
  // the protagonist. Tension the character does not feel is spectacle: the audience watches
  // danger without watching anyone be changed by it. Completes the suspense-spike correlation
  // set with SUSPENSE_SPIKE_NO_CAUSE (upstream), SUSPENSE_SPIKE_NO_FALLOUT (downstream), and
  // SUSPENSE_SPIKE_NO_CURIOSITY (curiosity channel); distinct from DRAMATIC_TURN_NO_EMOTION
  // (turn scenes) and EMOTIONAL_NEUTRAL_RUN (consecutive neutral scenes).
  if (records.length >= 8) {
    const spikes391 = (records as any[]).filter(r => (r.suspenseDelta ?? 0) > 1.5);
    if (spikes391.length >= 2 && spikes391.every(r => (r.emotionalShift ?? 'neutral') === 'neutral')) {
      issues.push({
        location: `${spikes391.length} suspense-spike scene(s) — emotional register`,
        rule: 'SUSPENSE_SPIKE_NO_EMOTION',
        severity: 'minor',
        description: `All ${spikes391.length} suspense-spike scenes (suspenseDelta > 1.5) are emotionally neutral — the story's most tense moments never move the protagonist. Tension the character does not feel is spectacle: the audience watches danger without watching anyone be changed by it, so the spikes grip the eye but never the heart.`,
        suggestedFix: 'Let high-tension scenes mark the protagonist emotionally: fear that curdles into a negative shift, survival that releases into relief. The most suspenseful scene in the story should also be one of its most felt — if the danger changes nothing about how anyone feels, the audience experiences it as a stunt.',
      });
    }
  }

  // CLOCK_RAISE_NO_FALLOUT (minor, n≥8, ≥2 clock raises): Two or more scenes raise a clock
  // and not one is followed, within the next two scenes, by any consequence — no emotional
  // shift, no relationship shift, no revelation, no dramatic turn. The deadline is announced
  // and then absorbed without effect, so the clock is a number that changes nothing
  // downstream. Distinct from CLOCK_RAISED_WITHOUT_PAYOFF (no PAYOFF anywhere in the story —
  // this checks the immediate two-scene window for any consequence) and CLOCK_RAISED_NO_DELTA
  // (no measurable time-pressure change). The clock sibling of SUSPENSE_SPIKE_NO_FALLOUT.
  if (records.length >= 8) {
    const n391c = records.length;
    const hasFallout391c = (idx: number): boolean => {
      for (let k = idx + 1; k <= Math.min(idx + 2, n391c - 1); k++) {
        const r = (records as any[])[k];
        if ((r.emotionalShift ?? 'neutral') !== 'neutral') return true;
        if (((r.relationshipShifts ?? []) as any[]).length > 0) return true;
        if (r.revelation !== null && r.revelation !== undefined) return true;
        if ((r.dramaticTurn ?? 'nothing') !== 'nothing') return true;
      }
      return false;
    };
    const clockScenes391 = (records as any[]).filter(r => r.clockRaised === true);
    if (clockScenes391.length >= 2 && !clockScenes391.some(s => hasFallout391c((records as any[]).indexOf(s)))) {
      issues.push({
        location: `${clockScenes391.length} clock-raise scene(s) — no downstream fallout`,
        rule: 'CLOCK_RAISE_NO_FALLOUT',
        severity: 'minor',
        description: `${clockScenes391.length} scenes raise a clock but none is followed within two scenes by any consequence — no emotional shift, no relationship move, no revelation, no dramatic turn. The deadline is announced and then absorbed without effect, so each clock is a number that changes nothing downstream and the audience learns the countdowns are empty threats.`,
        suggestedFix: 'Let each deadline detonate: the scenes right after a clock raise should carry its pressure — a panicked choice, a fractured alliance, a forced disclosure. If raising the clock leads to nothing in the next beats, either pay off the urgency or cut the clock; a deadline that changes nothing trains the audience to ignore the next one.',
      });
    }
  }

  // CURIOSITY_SPIKE_NO_FALLOUT (minor, n≥8, ≥2 spikes): Two or more scenes spike curiosity
  // (curiosityDelta > 1.5) and not one is followed, within the next two scenes, by any
  // consequence — no emotional shift, no relationship shift, no revelation, no dramatic turn.
  // A question is opened and then nothing develops from it, so the intrigue dissipates
  // unaddressed. Distinct from CURIOSITY_OPEN_LOOP (a question never resolved anywhere in the
  // story — this checks the immediate two-scene aftermath for any development) and from the
  // suspense/clock fallout checks (different trigger channel).
  if (records.length >= 8) {
    const n391q = records.length;
    const hasFallout391q = (idx: number): boolean => {
      for (let k = idx + 1; k <= Math.min(idx + 2, n391q - 1); k++) {
        const r = (records as any[])[k];
        if ((r.emotionalShift ?? 'neutral') !== 'neutral') return true;
        if (((r.relationshipShifts ?? []) as any[]).length > 0) return true;
        if (r.revelation !== null && r.revelation !== undefined) return true;
        if ((r.dramaticTurn ?? 'nothing') !== 'nothing') return true;
      }
      return false;
    };
    const curSpikes391 = (records as any[]).filter(r => (r.curiosityDelta ?? 0) > 1.5);
    if (curSpikes391.length >= 2 && !curSpikes391.some(s => hasFallout391q((records as any[]).indexOf(s)))) {
      issues.push({
        location: `${curSpikes391.length} curiosity-spike scene(s) — no downstream fallout`,
        rule: 'CURIOSITY_SPIKE_NO_FALLOUT',
        severity: 'minor',
        description: `${curSpikes391.length} scenes spike curiosity (curiosityDelta > 1.5) but none is followed within two scenes by any consequence — no emotional shift, no relationship move, no revelation, no dramatic turn. A question is opened and then nothing develops from it, so the intrigue dissipates unaddressed and the audience's leaning-forward goes unrewarded.`,
        suggestedFix: 'Let each curiosity spike lead somewhere soon: the scenes after a question opens should begin to complicate, partially answer, or raise the stakes of it. A mystery that spikes and then stalls teaches the audience that the story\'s questions don\'t pay off — develop the intrigue while it is hot.',
      });
    }
  }

  // ── Wave 405: POSITIVE_REACTION_WITHOUT_CAUSE, CURIOSITY_SPIKE_WITHOUT_CAUSE, DRAMATIC_TURN_WITHOUT_CAUSE ──

  // POSITIVE_REACTION_WITHOUT_CAUSE (minor): A scene carries a positive emotional shift but
  // neither it nor the two scenes before it contain any on-page cause for relief or joy — no
  // positive relationship shift, no revelation, no payoff, no suspense release (suspenseDelta
  // < -1), no clock relief (clockDelta < 0). The character brightens with no visible reason,
  // so the upswing reads as unearned. This is the positive sibling of REACTION_WITHOUT_CAUSE,
  // which keys exclusively on negative emotion (`emotionalShift !== 'negative'` → continue);
  // an uncaused positive turn is just as much a causal gap as an uncaused negative one, and is
  // arguably more damaging because audiences resist unearned relief most of all. Distinct from
  // EMOTION_WITHOUT_DRIVER_RUN (a 3+ consecutive non-neutral run, sign-agnostic) — this fires
  // on a single positive scene whose joy has no traceable origin.
  for (let i = 2; i < records.length; i++) {
    const curr = records[i] as any;
    if (curr.emotionalShift !== 'positive') continue;
    const selfCause405 =
      curr.revelation !== null ||
      (curr.suspenseDelta ?? 0) < -1 ||
      (curr.clockDelta ?? 0) < 0 ||
      ((curr.payoffSetupIds ?? []) as any[]).length > 0 ||
      ((curr.relationshipShifts ?? []) as any[]).some((s: any) => s.amount > 0);
    if (selfCause405) continue;
    let priorCause405 = false;
    for (let j = Math.max(0, i - 2); j < i; j++) {
      const p = records[j] as any;
      if (
        p.emotionalShift === 'positive' ||
        p.revelation !== null ||
        (p.suspenseDelta ?? 0) < -1 ||
        (p.clockDelta ?? 0) < 0 ||
        ((p.payoffSetupIds ?? []) as any[]).length > 0 ||
        ((p.relationshipShifts ?? []) as any[]).some((s: any) => s.amount > 0)
      ) { priorCause405 = true; break; }
    }
    if (!priorCause405) {
      issues.push({
        location: `Scene ${i} (${curr.slug})`,
        rule: 'POSITIVE_REACTION_WITHOUT_CAUSE',
        severity: 'minor',
        description: `Scene ${i} turns emotionally positive but neither it nor the two preceding scenes contain any cause for relief or joy — no good news, no reconciliation, no thread paying off, no danger receding. The upswing has no on-page cause, so the relief reads as unearned. Audiences forgive a character feeling bad for no reason far more readily than feeling good for no reason; uncaused joy reads as the story handing out a reward it never set up.`,
        suggestedFix: 'Give the positive turn a visible cause in this scene or just before it: a victory, a reunion, a problem solved, a threat lifted, or a kindness received. Relief lands only when the audience has felt the weight it relieves — earn the upswing by showing what changed for the better.',
      });
      break;
    }
  }

  // CURIOSITY_SPIKE_WITHOUT_CAUSE (minor, n≥4): A scene spikes curiosity (curiosityDelta > 1.5)
  // but neither it nor the two preceding scenes contain any driver that would open a question —
  // no revelation, no newly seeded clue, no dramatic turn, no clock raise. Intrigue materializes
  // from nowhere: the audience is told to lean forward without anything on the page giving them
  // a reason to wonder. This is the curiosity-channel sibling of SUSPENSE_SPIKE_NO_CAUSE (which
  // audits the suspense channel for an upstream escalation gap). Distinct from CURIOSITY_SPIKE_
  // NO_FALLOUT (the downstream-consequence gap) and REVELATION_WITHOUT_CURIOSITY (revelation
  // scenes that fail to raise curiosity) — this is the upstream cause gap for a curiosity spike.
  for (let i = 2; i < records.length; i++) {
    const curr = records[i] as any;
    if ((curr.curiosityDelta ?? 0) <= 1.5) continue;
    const hasDriver405 = (r: any): boolean =>
      r.revelation !== null ||
      ((r.seededClueIds ?? []) as any[]).length > 0 ||
      (r.dramaticTurn ?? 'nothing') !== 'nothing' ||
      r.clockRaised === true;
    if (hasDriver405(curr)) continue;
    let priorDriver405 = false;
    for (let j = Math.max(0, i - 2); j < i; j++) {
      if (hasDriver405(records[j] as any)) { priorDriver405 = true; break; }
    }
    if (!priorDriver405) {
      issues.push({
        location: `Scene ${i} (${curr.slug})`,
        rule: 'CURIOSITY_SPIKE_WITHOUT_CAUSE',
        severity: 'minor',
        description: `Scene ${i} spikes curiosity (curiosityDelta ${(curr.curiosityDelta ?? 0).toFixed(1)}) but neither it nor the two preceding scenes plant anything to wonder about — no revelation, no new clue, no dramatic turn, no clock raised. The intrigue materializes from nowhere: the story signals a question without anything on the page giving the audience a reason to ask it.`,
        suggestedFix: 'Anchor the curiosity spike to a concrete trigger in this scene or just before it: plant a clue, surface a partial truth, or let a turn raise a new unknown. Wonder is a response to a gap in the audience\'s knowledge — open the gap on the page before asking them to lean into it.',
      });
      break;
    }
  }

  // DRAMATIC_TURN_WITHOUT_CAUSE (minor, n≥8, ≥2 turns): The story contains two or more dramatic
  // turns, and not one of them has a cause in its own scene or the immediately preceding scene —
  // no revelation, no suspense rise (suspenseDelta > 1), no clock raise, no relationship shift,
  // no newly seeded clue. The plot's pivots are systematically unmotivated: each reversal arrives
  // as an authorial decree rather than the consequence of pressure the audience has watched build.
  // This is the dramatic-turn channel of the backward-cause family. Distinct from DEUS_EX_MACHINA
  // (a late plot-CLOSING revelation that arrives with no setup), SUSPENSE_SPIKE_NO_CAUSE (the
  // suspense channel), and DRAMATIC_TURN_AFTERMATH_VOID (the downstream-fallout gap for turns).
  if (records.length >= 8) {
    const turns405 = (records as any[]).filter(r => (r.dramaticTurn ?? 'nothing') !== 'nothing');
    if (turns405.length >= 2) {
      const turnHasCause405 = (rec: any): boolean => {
        const idx = (records as any[]).indexOf(rec);
        const causeIn = (r: any): boolean =>
          r.revelation !== null ||
          (r.suspenseDelta ?? 0) > 1 ||
          r.clockRaised === true ||
          ((r.relationshipShifts ?? []) as any[]).length > 0 ||
          ((r.seededClueIds ?? []) as any[]).length > 0;
        if (causeIn(rec)) return true;
        if (idx > 0 && causeIn((records as any[])[idx - 1])) return true;
        return false;
      };
      if (!turns405.some(t => turnHasCause405(t))) {
        issues.push({
          location: `${turns405.length} dramatic-turn scene(s) — no upstream cause`,
          rule: 'DRAMATIC_TURN_WITHOUT_CAUSE',
          severity: 'minor',
          description: `All ${turns405.length} of the story's dramatic turns arrive with no cause in their own scene or the scene just before — no revelation, no rising tension, no deadline, no shifting bond, no planted clue precedes any pivot. The plot's reversals are systematically unmotivated: each turn reads as an authorial decree rather than the consequence of pressure the audience watched accumulate, so the story lurches rather than builds.`,
          suggestedFix: 'Cause each turn: a reversal should be the inevitable-in-hindsight result of forces already in motion — a truth that surfaces, a deadline that bites, an alliance that fractures. Plant the pressure in the turn\'s scene or the one before it, so that when the story pivots, the audience feels it was pushed, not yanked.',
        });
      }
    }
  }

  const { revised, usedLLM } = await rewritePass({ fountain, issues, passName: 'causality', approvedSpans, storyContext: input.storyContext, priorPassResults: input.priorPassResults });
  const changed = revised !== fountain;

  return {
    pass: 'causality',
    issues,
    revisedFountain: revised,
    changed,
    summary: issues.length === 0
      ? 'Causality pass: causal logic is sound'
      : `Causality pass: ${issues.length} issue(s) — ${usedLLM ? 'rewritten' : 'flagged (stub mode)'}`,
  };
}
