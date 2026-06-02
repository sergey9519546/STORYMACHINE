// Wave 39 — Pass 2: Causality
// Checks for causal logic breaks: consequences without causes, orphaned facts,
// belief reversals without explanation.
// Wave 141 additions: motivation coherence (unmotivated decisions, abandoned goals)
// and action consequence (character actions that fail to affect plot or relationships).
// Wave 155 additions: deus ex machina (late revelation closing the plot with no
// setup), suspense spike without cause (sudden danger with no escalation), and
// goal-conflict absence (protagonist goal never opposed by another force).

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
