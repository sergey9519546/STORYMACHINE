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
