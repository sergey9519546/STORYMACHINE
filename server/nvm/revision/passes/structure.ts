// Wave 139 — Pass 1: Structure
// Checks act balance: act1 too long, act2 too short, missing midpoint pressure,
// climax approach in wrong position, epilogue missing.
// Wave 139 additions: missing inciting incident (Act 1 without major shift),
// weak act boundaries (Act 1 end and Act 2 end lack turning-point suspense deltas),
// and protagonist passivity at climax (climax scene lacks decisive character action).
// Wave 152 additions: revelation drought (long sequences without any revelation
// or clue), false climax (peak suspense scene not near climax position), and
// act symmetry imbalance (Act 1 and Act 3 wildly mismatched in scene count).
// Wave 264 additions: revelation clustered (≥3 revelations in ≤4-scene window),
// Act 1 curiosity absent (no curiosity spike in Act 1 when story has 2+ elsewhere),
// Act 1 purpose single (all Act 1 scenes share one purpose).
// Wave 278 additions: Act 2a suspense void (Act 2a has no scene with suspenseDelta>1),
// climax purpose absent (no scene carries purpose='climax'), and emotional arc
// uniform (>70% of scenes share the same emotionalShift register).
// Wave 292 additions: Act 3 curiosity spike absent (final quarter never spikes
// curiosity), clock pressure finale absent (no clockRaised in final quarter despite
// earlier clock activity), opening suspense flatline (first 3 scenes all suspenseDelta ≤ 0).
// Wave 306 additions: midpoint emotional flatline (the central scene is emotionally
// neutral with no suspense), final image weak (last scene has no emotional/suspense/
// relational charge), act balance extreme (one act holds >55% of all scenes).
// Wave 320 additions: climax revelation absent (no revelation in Act 3 while 2+
// exist earlier), Act 2 curiosity valley (Act 2 avg curiosity below both bookend
// acts), emotional opening neutral (first 3 scenes all emotionally neutral).
// Wave 331 additions: Act 3 emotional flatline (all finale scenes emotionally
// neutral), Act 1 warmth absent (no positive scene in opening act),
// dramatic turn opening absent (no dramatic turn in first 30% of scenes).

import type { PassInput, PassResult, RevisionIssue } from './types.ts';
import { rewritePass } from '../rewrite.ts';

export async function structurePass(input: PassInput): Promise<PassResult> {
  const { fountain, structure, records, annotations, approvedSpans } = input;
  const issues: RevisionIssue[] = [];
  const n = records.length;

  // ── Act balance checks ────────────────────────────────────────────────────
  if (structure.completionPercent < 80 && structure.actPosition === 'act3') {
    issues.push({
      location: 'Overall structure',
      rule: 'ACT3_TOO_EARLY',
      description: `Act 3 reached at only ${structure.completionPercent}% completion — the climax arrives too early`,
      severity: 'major',
      suggestedFix: 'Expand Act 2b with additional complications or reversals',
    });
  }

  if (structure.actPosition === 'act1' || structure.actPosition === 'act2a') {
    if (structure.completionPercent > 60) {
      issues.push({
        location: 'Overall structure',
        rule: 'ACT2_TOO_SHORT',
        description: `Story is ${structure.completionPercent}% complete but still in ${structure.actPosition} — Act 2 is truncated`,
        severity: 'critical',
        suggestedFix: 'Add more conflict escalation scenes before the climax',
      });
    }
  }

  // ── Midpoint pressure ─────────────────────────────────────────────────────
  if (n >= 6 && structure.midpointPressure < 1) {
    issues.push({
      location: `Scene ${Math.floor(n / 2)} (midpoint)`,
      rule: 'WEAK_MIDPOINT',
      description: 'Midpoint suspense pressure is flat — the story lacks a dramatic pivot',
      severity: 'major',
      suggestedFix: 'Insert a surprise revelation or reversal at the midpoint scene',
    });
  }

  // ── Tightest scene should be in second half ───────────────────────────────
  if (structure.tightestScene !== null && n > 6 && structure.tightestScene < Math.floor(n * 0.4)) {
    issues.push({
      location: `Scene ${structure.tightestScene}`,
      rule: 'CLIMAX_TOO_EARLY',
      description: 'The most intense scene is in the first 40% of the story — the structure peaks too soon',
      severity: 'major',
      suggestedFix: 'Move the peak intensity scene closer to the third act',
    });
  }

  // ── Missing reversal means flat structure ─────────────────────────────────
  if (structure.reversalCount === 0 && n >= 5) {
    issues.push({
      location: 'Overall structure',
      rule: 'NO_REVERSALS',
      description: 'No dramatic reversals detected — the story progresses in a single direction without opposition',
      severity: 'major',
      suggestedFix: 'Add a scene where a character\'s plan backfires or a situation inverts',
    });
  }

  // ── Missing inciting incident (Act 1 without major shift) ──────────────────
  // Wave 139: Act 1 should force the protagonist into the central conflict via
  // a major belief update, relationship shift, or clock raise. If none occur,
  // the story hasn't begun; it's just setup without incitement.
  if (n >= 3) {
    const act1End = Math.floor(n * 0.25);
    const act1Records = records.slice(0, Math.max(1, act1End));
    const hasIncitingEvent = act1Records.some(r =>
      (r.seededClueIds.length > 0 && r.payoffSetupIds.length === 0) || // clue planted
      (r.relationshipShifts && r.relationshipShifts.length > 0) || // relationship shift
      r.clockRaised, // clock pressure applied
    );
    if (!hasIncitingEvent && act1Records.length > 0) {
      issues.push({
        location: `Act 1 (Scenes 0–${Math.max(0, act1End - 1)})`,
        rule: 'MISSING_INCITING_INCIDENT',
        description: `Act 1 lacks a major inciting event — no clues planted, relationship shifts, or clock pressure. The protagonist isn't forced into the central conflict.`,
        severity: 'critical',
        suggestedFix: 'Add a scene in Act 1 where something happens that throws the protagonist into action: a revelation, a betrayal, or an external deadline.',
      });
    }
  }

  // ── Act boundary turning points ────────────────────────────────────────────
  // Wave 139: Act boundaries (25% and 75% of story) should have suspense peaks
  // that mark transitions. If the suspense delta at these boundaries is flat,
  // the acts don't feel like they have shaped, purposeful endings.
  if (n >= 6) {
    const act1End = Math.floor(n * 0.25);
    const act2End = Math.floor(n * 0.75);

    const act1EndRecord = records[Math.min(act1End, n - 1)];
    const act2EndRecord = records[Math.min(act2End, n - 1)];

    if (act1EndRecord && act1EndRecord.suspenseDelta < 1) {
      issues.push({
        location: `End of Act 1 (Scene ~${act1End})`,
        rule: 'ACT1_BOUNDARY_WEAK',
        description: `Scene ${Math.min(act1End, n - 1)} (Act 1 ending) has low suspense delta (${act1EndRecord.suspenseDelta.toFixed(1)}) — Act 1 should end with a turning point that forces entry into Act 2`,
        severity: 'major',
        suggestedFix: 'Ensure the final Act 1 scene is a clear inciting incident or reversal that propels the protagonist into the main conflict',
      });
    }

    if (act2EndRecord && act2EndRecord.suspenseDelta < 1.5) {
      issues.push({
        location: `End of Act 2 (Scene ~${act2End})`,
        rule: 'ACT2_BOUNDARY_WEAK',
        description: `Scene ${Math.min(act2End, n - 1)} (Act 2 ending) has low suspense delta (${act2EndRecord.suspenseDelta.toFixed(1)}) — Act 2 should end with a climactic turn that forces entry into Act 3`,
        severity: 'major',
        suggestedFix: 'The final Act 2 scene should be the highest-stakes moment before the climax: a major reversal, false climax, or all-is-lost moment',
      });
    }
  }

  // ── Wave 152: Revelation drought, false climax, act symmetry ─────────────────

  // REVELATION_DROUGHT: A stretch of 4+ consecutive scenes with no revelation,
  // planted clue, or relationship shift. The story goes quiet — no narrative
  // information is being delivered to the audience during this stretch.
  if (n >= 8) {
    let droughtLen = 0;
    let droughtStart = -1;
    for (let i = 0; i < n; i++) {
      const r = records[i];
      const hasNarrativeInfo = r.revelation !== null ||
        (r.seededClueIds?.length ?? 0) > 0 ||
        (r.relationshipShifts?.length ?? 0) > 0;

      if (!hasNarrativeInfo) {
        if (droughtLen === 0) droughtStart = i;
        droughtLen++;
      } else {
        droughtLen = 0;
      }

      if (droughtLen === 4) {
        issues.push({
          location: `Scenes ${droughtStart}–${i}`,
          rule: 'REVELATION_DROUGHT',
          description: `Scenes ${droughtStart}–${i}: 4 consecutive scenes with no revelation, planted clue, or relationship shift — the narrative goes dark; nothing is being learned or changed`,
          severity: 'major',
          suggestedFix: 'At least one of these scenes must deliver narrative payload: a clue, a revelation, or a shift in a key relationship. The audience should never go 4 scenes without learning something new.',
        });
        droughtLen = 0; // reset to avoid duplicate flags
      }
    }
  }

  // FALSE_CLIMAX: The highest-suspense scene occurs far from the story's
  // expected climax zone (last 30%). When peak intensity lands in the middle
  // the audience goes through the real climax feeling emotionally spent.
  if (n >= 8) {
    let peakScene = -1;
    let peakSuspense = -Infinity;
    for (let i = 0; i < n; i++) {
      if (records[i].suspenseDelta > peakSuspense) {
        peakSuspense = records[i].suspenseDelta;
        peakScene = i;
      }
    }
    const climaxZoneStart = Math.floor(n * 0.7);
    // False climax: peak is not near the end AND peak suspense is meaningful (>2)
    if (peakScene >= 0 && peakScene < climaxZoneStart && peakSuspense > 2) {
      issues.push({
        location: `Scene ${peakScene} (peak intensity)`,
        rule: 'FALSE_CLIMAX',
        description: `Peak suspense (${peakSuspense.toFixed(1)}) occurs at Scene ${peakScene} — ${Math.round(peakScene / n * 100)}% through the story — but the climax zone starts at Scene ${climaxZoneStart}. The story peaked too early; the real climax will feel anticlimactic.`,
        severity: 'major',
        suggestedFix: 'Either move high-intensity scenes into the final third, or build new complications in Act 2b that exceed the mid-story peak',
      });
    }
  }

  // SETUP_RESOLUTION_IMBALANCE: Setup scenes (establish_world, character_moment)
  // outnumber payoff scenes (climax, resolution, turning_point) by 4:1 or more.
  // This indicates a screenplay that front-loads context but rushes or collapses
  // the emotional payoff the setup promised.
  if (n >= 6) {
    const setupPurposes = new Set(['establish_world', 'character_moment']);
    const payoffPurposes = new Set(['climax', 'resolution', 'turning_point']);
    const setupCount = records.filter(r => setupPurposes.has(r.purpose)).length;
    const payoffCount = records.filter(r => payoffPurposes.has(r.purpose)).length;

    if (payoffCount > 0 && setupCount / payoffCount >= 4) {
      issues.push({
        location: `Setup vs resolution`,
        rule: 'SETUP_RESOLUTION_IMBALANCE',
        description: `${setupCount} setup/character scenes but only ${payoffCount} payoff scenes (${(setupCount / payoffCount).toFixed(1)}:1 ratio) — the screenplay front-loads context but rushes its emotional resolution`,
        severity: 'minor',
        suggestedFix: 'Either cut setup scenes that don\'t directly raise the stakes, or expand the climax and resolution to honor the promise of the setup with adequate space',
      });
    }
  }

  // ── Wave 165: Protagonist passivity at climax, dark night absent, Act 2 dead zone ──

  // PROTAGONIST_PASSIVITY_CLIMAX: The peak-suspense scene in the climax zone (last 30%)
  // shows no protagonist engagement — neutral emotion, no clock pressure, no discovery.
  // The protagonist is watching rather than choosing at the story's peak moment.
  if (n >= 8) {
    const climaxZoneStart = Math.floor(n * 0.7);
    let peakScene = -1;
    let peakSuspense = -Infinity;
    for (let i = climaxZoneStart; i < n; i++) {
      if (records[i].suspenseDelta > peakSuspense) {
        peakSuspense = records[i].suspenseDelta;
        peakScene = i;
      }
    }
    if (peakScene >= 0 && peakSuspense > 1.5) {
      const rec = records[peakScene];
      const isPassive =
        rec.emotionalShift === 'neutral' &&
        !rec.clockRaised &&
        (rec.seededClueIds?.length ?? 0) === 0;
      if (isPassive) {
        issues.push({
          location: `Scene ${peakScene} (climax peak)`,
          rule: 'PROTAGONIST_PASSIVITY_CLIMAX',
          description: `Peak-intensity climax scene (suspense ${peakSuspense.toFixed(1)}) shows no protagonist engagement — neutral emotion, no clock pressure, no discovery. The protagonist is absent from their own story's highest moment.`,
          severity: 'critical',
          suggestedFix: 'Give the protagonist a decisive choice or irreversible action at the story\'s peak: a sacrifice, a confrontation, or a revelation they must act on immediately',
        });
      }
    }
  }

  // DARK_NIGHT_ABSENT: In the 65%-85% zone, no scene has a negative emotional shift
  // combined with meaningful suspense. The "all is lost" / "dark night of the soul"
  // beat is missing — the protagonist never hits bottom before the climax, so the
  // final push feels unearned.
  if (n >= 8) {
    const darkNightStart = Math.floor(n * 0.65);
    const darkNightEnd = Math.floor(n * 0.85);
    const darkZone = records.slice(darkNightStart, darkNightEnd);
    if (darkZone.length >= 2) {
      const hasDarkNight = darkZone.some(r =>
        r.emotionalShift === 'negative' && r.suspenseDelta > 1,
      );
      if (!hasDarkNight) {
        issues.push({
          location: `Scenes ${darkNightStart}–${darkNightEnd} (pre-climax zone)`,
          rule: 'DARK_NIGHT_ABSENT',
          description: `No scene in the pre-climax zone (${Math.round(darkNightStart / n * 100)}%–${Math.round(darkNightEnd / n * 100)}%) carries a negative emotional shift with meaningful suspense — the protagonist never hits their lowest point before the final push`,
          severity: 'major',
          suggestedFix: 'Insert an "all is lost" beat in this zone: a failure, a betrayal, or a moment where all hope seems gone. The climax lands harder after the protagonist has been broken.',
        });
      }
    }
  }

  // ACT2_DEAD_ZONE: The middle portion of Act 2 (40%-60% of scenes) has an average
  // suspense delta lower than both the flanking Act 2 sections (25%-40% and 60%-75%).
  // The classic mid-Act-2 sag — energy dips before the second-half escalation.
  if (n >= 10) {
    const act2Start = Math.floor(n * 0.25);
    const midStart = Math.floor(n * 0.4);
    const midEnd = Math.floor(n * 0.6);
    const act2End = Math.floor(n * 0.75);
    const earlyAct2 = records.slice(act2Start, midStart);
    const midAct2 = records.slice(midStart, midEnd);
    const lateAct2 = records.slice(midEnd, act2End);
    if (earlyAct2.length >= 1 && midAct2.length >= 2 && lateAct2.length >= 1) {
      const avg = (arr: typeof records) => arr.reduce((s, r) => s + r.suspenseDelta, 0) / arr.length;
      const earlyAvg = avg(earlyAct2);
      const midAvg = avg(midAct2);
      const lateAvg = avg(lateAct2);
      if (midAvg < earlyAvg * 0.7 && midAvg < lateAvg * 0.7) {
        issues.push({
          location: `Scenes ${midStart}–${midEnd} (mid-Act 2)`,
          rule: 'ACT2_DEAD_ZONE',
          description: `Mid-Act-2 suspense avg (${midAvg.toFixed(1)}) is less than 70% of both early-Act-2 (${earlyAvg.toFixed(1)}) and late-Act-2 (${lateAvg.toFixed(1)}) — the classic mid-story energy sag. The story loses momentum before the second-half escalation.`,
          severity: 'major',
          suggestedFix: 'Inject a complication, reversal, or discovery into the dead zone: a new obstacle, a false ally, or a ticking-clock development that prevents the story from settling.',
        });
      }
    }
  }

  // ── Wave 179: Escalation reversed, climax plateau, unresolved ending ─────────

  // ESCALATION_REVERSED: The story de-escalates overall — the final third's
  // average suspense is well below the first third's. The narrative loses energy
  // as it goes rather than building. Distinct from FALSE_CLIMAX (a single early
  // peak): this is a whole-arc downward trend. Requires real opening energy
  // (first-third average ≥ 1.5) so a flat story doesn't trip it.
  if (n >= 6) {
    const third = Math.floor(n / 3);
    const firstThird = records.slice(0, third);
    const lastThird = records.slice(n - third);
    const avg = (arr: typeof records) => arr.reduce((s, r) => s + r.suspenseDelta, 0) / arr.length;
    const firstAvg = avg(firstThird);
    const lastAvg = avg(lastThird);
    if (firstAvg >= 1.5 && lastAvg < firstAvg * 0.7) {
      issues.push({
        location: 'Overall escalation',
        rule: 'ESCALATION_REVERSED',
        description: `Suspense de-escalates across the story: the opening third averages ${firstAvg.toFixed(1)} but the final third drops to ${lastAvg.toFixed(1)} — the narrative loses energy as it goes instead of building toward the climax.`,
        severity: 'major',
        suggestedFix: 'Invert the energy curve. Either pull the high-intensity opening material back into the body of the story, or escalate the final third so the stakes are highest at the end, not the beginning.',
      });
    }
  }

  // CLIMAX_PLATEAU: There is no single distinct peak — the highest suspense value
  // is shared across a large fraction of scenes, so the climax never stands out
  // from the surrounding intensity. Distinct from FALSE_CLIMAX (peak located too
  // early); here the problem is the peak isn't a peak at all. Requires a
  // meaningful max (>1.5) repeated across 40%+ of scenes.
  if (n >= 8) {
    let maxSuspense = -Infinity;
    for (const r of records) if (r.suspenseDelta > maxSuspense) maxSuspense = r.suspenseDelta;
    const atMax = records.filter(r => r.suspenseDelta === maxSuspense).length;
    const plateauThreshold = Math.max(3, Math.ceil(n * 0.4));
    if (maxSuspense > 1.5 && atMax >= plateauThreshold) {
      issues.push({
        location: 'Suspense profile',
        rule: 'CLIMAX_PLATEAU',
        description: `${atMax} of ${n} scenes share the story's peak suspense (${maxSuspense.toFixed(1)}) — there is no single distinct climax, just a plateau of equal-intensity scenes. The audience can't feel the high point because everything is the high point.`,
        severity: 'major',
        suggestedFix: 'Carve out one undisputed peak. Dial back the intensity of the surrounding scenes so the climax stands alone as the most intense moment — a plateau has no summit.',
      });
    }
  }

  // UNRESOLVED_ENDING: The final scene is still escalating (high suspense) and
  // isn't a resolution beat — the story stops mid-climb with no denouement. The
  // audience is dropped before the release the rising action promised.
  if (n >= 6) {
    const last = records[n - 1];
    if (last && last.suspenseDelta > 2 && last.purpose !== 'resolution') {
      issues.push({
        location: `Scene ${n - 1} (final scene)`,
        rule: 'UNRESOLVED_ENDING',
        description: `The final scene still carries high suspense (${last.suspenseDelta.toFixed(1)}) and isn't a resolution beat (purpose: "${last.purpose}") — the story stops mid-climb with no denouement, dropping the audience before the release the rising action promised.`,
        severity: 'major',
        suggestedFix: 'Add a resolution beat after the climax: a scene that lets the suspense discharge and shows the new equilibrium. Even an ambiguous ending needs a moment that registers the climax has happened.',
      });
    }
  }

  // ── Wave 186: Act 2 inversion, midpoint reversal absent, inciting incident late ──

  // SECOND_ACT_INVERSION: Act 2b (50%–75%) averages significantly lower suspense
  // than Act 2a (25%–50%). The middle of the story should build continuously;
  // when the second half of Act 2 drops, the narrative inverts exactly where it
  // should escalate toward the climax. Distinct from ESCALATION_REVERSED (whole arc)
  // and ACT2_DEAD_ZONE (global mid-zone flatness).
  if (n >= 8) {
    const act2aStart = Math.floor(n * 0.25);
    const act2bStart = Math.floor(n * 0.5);
    const act2bEnd   = Math.floor(n * 0.75);
    const act2aRecs  = records.slice(act2aStart, act2bStart);
    const act2bRecs  = records.slice(act2bStart, act2bEnd);
    if (act2aRecs.length >= 2 && act2bRecs.length >= 2) {
      const avgAct2a = act2aRecs.reduce((s, r) => s + r.suspenseDelta, 0) / act2aRecs.length;
      const avgAct2b = act2bRecs.reduce((s, r) => s + r.suspenseDelta, 0) / act2bRecs.length;
      if (avgAct2a >= 1.3 && avgAct2b < avgAct2a * 0.7) {
        issues.push({
          location: `Act 2 (Scenes ${act2aStart}–${act2bEnd - 1})`,
          rule: 'SECOND_ACT_INVERSION',
          description: `Act 2a (Scenes ${act2aStart}–${act2bStart - 1}) averages ${avgAct2a.toFixed(1)} suspense but Act 2b (Scenes ${act2bStart}–${act2bEnd - 1}) drops to ${avgAct2b.toFixed(1)} — the second half of Act 2 de-escalates when it should build toward the climax.`,
          severity: 'major',
          suggestedFix: 'Raise the stakes in Act 2b: escalate the antagonist\'s pressure, tighten the deadline, or create a new complication that makes the protagonist\'s situation worse in the second half of the conflict zone.',
        });
      }
    }
  }

  // MIDPOINT_REVERSAL_ABSENT: The midpoint zone (40%–60%) contains no reversal
  // (suspenseDelta < -1) and no revelation. Great stories pivot at the midpoint —
  // the protagonist's strategy shifts from reaction to action. A midpoint with no
  // catalysing event is a story that passes through its centre without changing
  // direction. Requires 10+ scenes for a meaningful midpoint zone.
  if (n >= 10) {
    const midStart   = Math.floor(n * 0.4);
    const midEnd     = Math.ceil(n * 0.6);
    const midRecords = records.slice(midStart, midEnd);
    const hasMidEvent = midRecords.some(r =>
      r.suspenseDelta < -1 || r.revelation !== null,
    );
    if (!hasMidEvent) {
      issues.push({
        location: `Midpoint zone (Scenes ${midStart}–${midEnd - 1})`,
        rule: 'MIDPOINT_REVERSAL_ABSENT',
        description: `The midpoint zone (Scenes ${midStart}–${midEnd - 1}) has no reversal and no revelation — the story passes through its structural centre without the pivot that shifts protagonist strategy from reaction to action.`,
        severity: 'major',
        suggestedFix: 'Place a major reversal or revelatory beat near the midpoint: a discovery that recontextualises the threat, or a setback that forces the protagonist to abandon their first strategy and commit to a new one.',
      });
    }
  }

  // INCITING_INCIDENT_TOO_LATE: The very first dramatic event (reversal or
  // revelation) occurs past the 40% mark. The story takes too long to generate
  // the event that sets the central conflict in motion — the audience sits through
  // 40%+ of the story with no catalytic moment to orient them. Distinct from
  // MISSING_INCITING_INCIDENT (which fires when Act 1 lacks clues/shifts/clock):
  // this fires on the absolute lateness of the first dramatic event.
  if (n >= 10) {
    const lateCutoff = Math.floor(n * 0.4);
    const firstEventIdx = records.findIndex(r =>
      r.suspenseDelta < -1 || r.revelation !== null,
    );
    if (firstEventIdx > lateCutoff) {
      issues.push({
        location: `First dramatic event at Scene ${firstEventIdx}`,
        rule: 'INCITING_INCIDENT_TOO_LATE',
        description: `The first reversal or revelation occurs at Scene ${firstEventIdx} — ${Math.round(firstEventIdx / n * 100)}% through the story. The central conflict doesn't launch until after 40% has elapsed; the audience has no dramatic anchor for the opening.`,
        severity: 'major',
        suggestedFix: 'Move the inciting event before the 40% mark. The audience needs a dramatic anchor — a reversal, revelation, or shock — early enough to understand what the story is about before the midpoint arrives.',
      });
    }
  }

  // ── Wave 198: Act 3 excess, tension abrupt drop, Act 1 revelation absent ──

  // ACT3_SCENE_EXCESS: Act 3 (from 75% to end) has more scenes than Act 1
  // (from 0 to 25%). The resolution is longer than the setup — narrative weight
  // is inverted. A prolonged resolution dilutes the climax's impact by dwelling
  // past its emotional conclusion rather than landing and leaving.
  if (n >= 8) {
    const act1SceneCount = Math.floor(n * 0.25);
    const act3SceneStart = Math.floor(n * 0.75);
    const act3SceneCount = n - act3SceneStart;
    if (act3SceneCount > act1SceneCount) {
      issues.push({
        location: `Act 1 (${act1SceneCount} scenes) vs Act 3 (${act3SceneCount} scenes)`,
        rule: 'ACT3_SCENE_EXCESS',
        description: `Act 3 has ${act3SceneCount} scenes while Act 1 has only ${act1SceneCount} — the resolution takes longer than the setup. Extended resolutions undercut the climax's finality by making the aftermath longer than the premise.`,
        severity: 'minor',
        suggestedFix: 'Trim Act 3 to match or be shorter than Act 1. The denouement should be crisp: show the new equilibrium, land the emotional note, and leave. Resolution scenes that outlast the setup are usually filling silence, not delivering story.',
      });
    }
  }

  // TENSION_DROP_ABRUPT: The highest-suspense scene in the climax zone (last 30%,
  // suspenseDelta > 2) is immediately followed by a scene that is neither a
  // resolution beat nor carries any suspense (< 0.5). The tension collapses too
  // sharply — the story needs at least one landing-beat between peak and silence.
  if (n >= 6) {
    const climaxZoneActual = Math.floor(n * 0.7);
    let dropPeakScene = -1;
    let dropPeakSuspense = -Infinity;
    for (let i = climaxZoneActual; i < n; i++) {
      if (records[i].suspenseDelta > dropPeakSuspense) {
        dropPeakSuspense = records[i].suspenseDelta;
        dropPeakScene = i;
      }
    }
    if (dropPeakScene >= 0 && dropPeakScene < n - 1 && dropPeakSuspense > 2) {
      const afterPeak = records[dropPeakScene + 1];
      if (afterPeak.suspenseDelta < 0.5 && afterPeak.purpose !== 'resolution') {
        issues.push({
          location: `Scene ${dropPeakScene} → Scene ${dropPeakScene + 1}`,
          rule: 'TENSION_DROP_ABRUPT',
          description: `The climax peak (Scene ${dropPeakScene}, suspense ${dropPeakSuspense.toFixed(1)}) is immediately followed by a flat, non-resolution scene (suspense ${afterPeak.suspenseDelta.toFixed(1)}) — the tension collapses without a landing beat`,
          severity: 'major',
          suggestedFix: 'Insert a transitional beat between the climax and resolution: a moment of consequence, a brief silence with emotional weight, or a reaction scene that lets the audience breathe down from the peak before the story settles.',
        });
      }
    }
  }

  // ACT1_REVELATION_ABSENT: The story contains 3+ revelations but none land in
  // Act 1 (first 25%). All revelations are held back — the audience enters Act 2
  // with no anchoring discovery. Without at least one Act 1 revelation to frame
  // the situation, the setup is all mystery and no orientation.
  if (n >= 8) {
    const totalRevs198 = records.filter(r => r.revelation !== null).length;
    if (totalRevs198 >= 3) {
      const act1RevEnd = Math.floor(n * 0.25);
      const act1HasRev = records.slice(0, act1RevEnd).some(r => r.revelation !== null);
      if (!act1HasRev) {
        issues.push({
          location: `Act 1 (Scenes 0–${act1RevEnd - 1})`,
          rule: 'ACT1_REVELATION_ABSENT',
          description: `The story has ${totalRevs198} revelations but none land in Act 1 — the audience enters the conflict without any anchoring discovery. All revelation is held back, leaving the setup informationally dark.`,
          severity: 'minor',
          suggestedFix: 'Give the audience at least one revelation in Act 1: an early truth about the situation, a character\'s past, or a fact that frames the stakes. The opening should orient the audience toward what the story is about — not just pose questions.',
        });
      }
    }
  }

  // ── Wave 209: Cold open inert, denouement overlong, pre-climax lull ──────────

  // COLD_OPEN_INERT: The screenplay's first scene delivers no narrative hook —
  // no revelation, no planted clue, no clock pressure, no relationship shift,
  // and low suspense. The audience's first impression of the story has nothing
  // to hold onto; they arrive in a scene that simply exists rather than
  // beginning the story's central question. Distinct from MISSING_INCITING_INCIDENT
  // (which audits all of Act 1): this fires specifically on the opening scene itself.
  if (n >= 8) {
    const first209 = records[0];
    const isInert209 =
      first209.revelation === null &&
      (first209.seededClueIds?.length ?? 0) === 0 &&
      !first209.clockRaised &&
      (first209.relationshipShifts?.length ?? 0) === 0 &&
      first209.suspenseDelta <= 1;
    if (isInert209) {
      issues.push({
        location: 'Scene 0 (cold open)',
        rule: 'COLD_OPEN_INERT',
        severity: 'minor',
        description: `The screenplay's first scene has no narrative hook — no revelation, clue, clock pressure, or relationship shift, and low suspense (${first209.suspenseDelta.toFixed(1)}). The audience's first impression contains nothing to orient them toward the story's central question.`,
        suggestedFix: 'Open with a scene that immediately signals what is at stake: plant a clue, reveal an inciting tension, establish a ticking clock, or begin a relationship in jeopardy. The first scene earns the audience\'s attention by beginning the story, not introducing the setting.',
      });
    }
  }

  // DENOUEMENT_OVERLONG: The story's climax peak (highest-suspense scene in the
  // final 30%) is followed by three or more additional scenes. An extended
  // denouement — more scenes than Act 1 typically offers — dissipates the
  // climax's emotional impact and allows the audience to disengage before the
  // screenplay finishes. Distinct from UNRESOLVED_ENDING (still high suspense at
  // the end) and ACT3_SCENE_EXCESS (whole-act vs whole-Act-1 count).
  if (n >= 12) {
    const climaxZoneD209 = Math.floor(n * 0.7);
    let peakD209 = -1;
    let peakSusD209 = -Infinity;
    for (let i = climaxZoneD209; i < n; i++) {
      if (records[i].suspenseDelta > peakSusD209) {
        peakSusD209 = records[i].suspenseDelta;
        peakD209 = i;
      }
    }
    if (peakD209 >= 0 && peakSusD209 > 2 && n - 1 - peakD209 >= 3) {
      issues.push({
        location: `Scenes ${peakD209 + 1}–${n - 1} (post-climax)`,
        rule: 'DENOUEMENT_OVERLONG',
        severity: 'minor',
        description: `The climax peak (Scene ${peakD209}, suspense ${peakSusD209.toFixed(1)}) is followed by ${n - 1 - peakD209} more scenes — the denouement is longer than most Act 1s. Extended aftermath dilutes the climax by giving the audience time to disengage before the screenplay ends.`,
        suggestedFix: 'Compress the post-climax into no more than 2 scenes: one scene of immediate consequence (what changed), one scene of new equilibrium (the world after). Land and leave — a long denouement signals unconfidence in the climax\'s finality.',
      });
    }
  }

  // PRE_CLIMAX_LULL: The two scenes immediately preceding the climax zone (last 30%)
  // both have low suspense — the approach to the climax is flat. A story should build
  // toward its climax, not arrive at it from a valley. When the pre-climax approach
  // is inert, the escalation into the climax feels abrupt and unmotivated rather than
  // earned through rising pressure.
  if (n >= 10) {
    const preClimaxEnd209 = Math.floor(n * 0.7);
    if (preClimaxEnd209 >= 2) {
      const sceneA209 = records[preClimaxEnd209 - 2];
      const sceneB209 = records[preClimaxEnd209 - 1];
      if (sceneA209.suspenseDelta < 1 && sceneB209.suspenseDelta < 1) {
        issues.push({
          location: `Scenes ${preClimaxEnd209 - 2}–${preClimaxEnd209 - 1} (pre-climax approach)`,
          rule: 'PRE_CLIMAX_LULL',
          severity: 'major',
          description: `The two scenes before the climax zone (Scenes ${preClimaxEnd209 - 2} and ${preClimaxEnd209 - 1}) both have low suspense (${sceneA209.suspenseDelta.toFixed(1)} and ${sceneB209.suspenseDelta.toFixed(1)}) — the story enters its final act from a valley rather than a rising wave.`,
          suggestedFix: 'Build the pre-climax approach: raise the stakes in the two scenes before the climax zone through a complication, a failed attempt, or a tightening deadline. The climax lands hardest when it arrives as the peak of already-rising pressure, not as an abrupt acceleration from flat.',
        });
      }
    }
  }

  // ── Wave 222: Structural-physics — global event gap, suspense center-of-mass,
  //    try/fail oscillation count. These read the whole dramatic-event sequence as a
  //    structured signal rather than checking individual act-zone proportions. ──
  {
    const isDramaticEvent222 = (r: any): boolean =>
      r.suspenseDelta < -1 ||
      r.revelation !== null ||
      r.clockRaised === true ||
      (r.relationshipShifts ?? []).some((s: any) => Math.abs(s.amount) >= 0.3);

    // DRAMATIC_VACUUM_STRETCH (major): the single longest consecutive run of scenes with
    // NO dramatic event (reversal, revelation, clock raise, or major relationship shift)
    // exceeds a quarter of the story. Distinct from ACT2_DEAD_ZONE (act-2-specific): a long
    // inert stretch can straddle an act boundary and slip past every zone-bounded check
    // while still leaving the audience adrift for a fifth or more of the runtime.
    if (n >= 8) {
      let curGap222 = 0, maxGap222 = 0, gapEnd222 = 0;
      for (let i = 0; i < n; i++) {
        if (isDramaticEvent222(records[i])) {
          curGap222 = 0;
        } else {
          curGap222++;
          if (curGap222 > maxGap222) { maxGap222 = curGap222; gapEnd222 = i; }
        }
      }
      const vacuumThreshold222 = Math.max(4, Math.floor(n * 0.25));
      if (maxGap222 > vacuumThreshold222) {
        const gapStart222 = gapEnd222 - maxGap222 + 1;
        issues.push({
          location: `Scenes ${gapStart222}–${gapEnd222}`,
          rule: 'DRAMATIC_VACUUM_STRETCH',
          severity: 'major',
          description: `Scenes ${gapStart222}–${gapEnd222} form a run of ${maxGap222} consecutive scenes with no dramatic event — no reversal, revelation, clock, or major relationship shift across ${Math.round(maxGap222 / n * 100)}% of the story. This vacuum straddles the act structure and leaves the audience without a catalytic beat for a sustained stretch.`,
          suggestedFix: 'Inject a dramatic event into the middle of this run: a reversal, a revelation, or a relationship rupture that re-orients the story. No quarter of the runtime should pass without at least one beat that changes the protagonist\'s situation.',
        });
      }
    }

    // TENSION_FRONTLOADED_COM (major): the centre of mass of suspense (each scene's index
    // weighted by its positive suspense) sits in the front 45% of the story. The dramatic
    // energy is structurally front-loaded — its weight peaks early and thins toward the
    // climax. A single principled scalar over the whole suspense curve, distinct from the
    // act-zone comparisons elsewhere.
    if (n >= 8) {
      let massSum222 = 0, weightedIdxSum222 = 0;
      for (let i = 0; i < n; i++) {
        const mass222 = Math.max(records[i].suspenseDelta ?? 0, 0);
        massSum222 += mass222;
        weightedIdxSum222 += i * mass222;
      }
      if (massSum222 > 0) {
        const comPos222 = (weightedIdxSum222 / massSum222) / (n - 1);
        if (comPos222 < 0.45) {
          issues.push({
            location: 'Suspense distribution',
            rule: 'TENSION_FRONTLOADED_COM',
            severity: 'major',
            description: `The centre of mass of the story's suspense sits at ${Math.round(comPos222 * 100)}% of the runtime — well into the front half. The dramatic energy is structurally front-loaded: tension peaks early and thins toward the climax, so the back half coasts downhill from a high it already spent.`,
            suggestedFix: 'Shift suspense mass later: temper the early peaks and build the largest tension beats into the final third. The weight of the story\'s pressure should accumulate toward the climax, not be discharged in the opening movement.',
          });
        }
      }
    }

    // TRY_FAIL_RHYTHM_ABSENT (major): the suspense curve has at most one prominent local
    // maximum (a scene whose suspense strictly exceeds both neighbours and reaches ≥2). Great
    // structure is built from try/fail cycles — repeated rise-and-collapse of tension — each
    // of which registers as a peak. A curve with one bump or none is a single arc with no
    // internal oscillation, the structural signature of a story that never makes the
    // protagonist try, fail, and try again. Requires 10+ scenes.
    if (n >= 10) {
      let peakCount222 = 0;
      for (let i = 1; i < n - 1; i++) {
        const s222 = records[i].suspenseDelta ?? 0;
        if (s222 >= 2 && s222 > (records[i - 1].suspenseDelta ?? 0) && s222 > (records[i + 1].suspenseDelta ?? 0)) {
          peakCount222++;
        }
      }
      if (peakCount222 <= 1) {
        issues.push({
          location: 'Suspense oscillation',
          rule: 'TRY_FAIL_RHYTHM_ABSENT',
          severity: 'major',
          description: `The suspense curve has only ${peakCount222} prominent peak${peakCount222 === 1 ? '' : 's'} across ${n} scenes — the story is a single arc with no internal oscillation. Structure is built from try/fail cycles, each a rise and collapse of tension; a curve this smooth means the protagonist never visibly tries, fails, and re-commits.`,
          suggestedFix: 'Build at least two or three distinct try/fail cycles into the structure: let the protagonist mount an effort that spikes tension, have it collapse, then mount another. Each peak-and-trough is a unit of dramatic momentum; one smooth hump is not a structure.',
        });
      }
    }
  }

  // ── Wave 236: Purpose monoculture, clock raised late, Act 2 revelation absent ──

  // PURPOSE_MONOCULTURE (minor, ≥8 scenes): More than 70% of scenes share the
  // same purpose label. A well-structured story rotates through different scene
  // purposes — setup, character development, reversal, climax, resolution — each
  // serving a different structural function. When one purpose dominates, the script
  // repeats the same structural register for scene after scene with no variation in
  // narrative intent. Distinct from SETUP_RESOLUTION_IMBALANCE (setup vs payoff
  // ratio): this fires on any single purpose that crowds out all others.
  if (n >= 8) {
    const purposeCounts236 = new Map<string, number>();
    for (const r of records) {
      purposeCounts236.set(r.purpose, (purposeCounts236.get(r.purpose) ?? 0) + 1);
    }
    if (purposeCounts236.size >= 2) {
      const [domPurpose236, domCount236] = [...purposeCounts236.entries()].sort((a, b) => b[1] - a[1])[0];
      if (domCount236 / n > 0.7) {
        issues.push({
          location: 'Scene purpose distribution',
          rule: 'PURPOSE_MONOCULTURE',
          severity: 'minor',
          description: `${domCount236} of ${n} scenes (${Math.round(domCount236 / n * 100)}%) carry the same purpose "${domPurpose236}" — the script repeats the same structural register with no variation in narrative intent. Stories need setup, escalation, reversal, character moments, and resolution woven together.`,
          suggestedFix: `Replace some "${domPurpose236}" scenes with different structural functions: a reversal, a character-moment that reframes the protagonist's motivation, or a setup scene that plants future payoffs. Varied purposes keep the audience oriented to where the story is in its arc.`,
        });
      }
    }
  }

  // CLOCK_RAISED_LATE (minor, ≥8 scenes): The first ticking-clock or deadline
  // scene (clockRaised === true) comes after the halfway point. A clock is the
  // engine of dramatic pressure; when no deadline is established until the second
  // half, the story's opening operates in a pressure vacuum — the audience doesn't
  // know what the stakes of time are. Distinct from MISSING_INCITING_INCIDENT
  // (which checks for clock in Act 1 as one of several possible inciting elements):
  // this fires whenever the first clock appears past 50% regardless of other events.
  if (n >= 8) {
    const firstClockIdx236 = records.findIndex((r: any) => r.clockRaised === true);
    if (firstClockIdx236 > Math.floor(n * 0.5)) {
      issues.push({
        location: `Scene ${firstClockIdx236} (first clock)`,
        rule: 'CLOCK_RAISED_LATE',
        severity: 'minor',
        description: `The story's first ticking clock or deadline appears at Scene ${firstClockIdx236} — ${Math.round(firstClockIdx236 / n * 100)}% through the story, after the halfway point. Without a deadline established in the first half, the opening lacks urgency; the audience doesn't feel the cost of time.`,
        suggestedFix: 'Introduce a clock or deadline before the midpoint: a looming event, an expiring window, or a countdown that the protagonist must beat. Even an implied deadline changes the tension of every scene that precedes the climax.',
      });
    }
  }

  // ACT2_REVELATION_ABSENT (minor, ≥10 scenes): Act 2 (25%–75%) contains zero
  // revelations, but the story has 2+ revelations elsewhere (Act 1 or Act 3).
  // The middle act should deliver new information that reframes the protagonist's
  // understanding — the dramatic engine of Act 2 is progressively raising the
  // informational stakes. When all revelations cluster at the ends, Act 2 becomes
  // pure action with no discovery, and the audience stops learning while watching.
  if (n >= 10) {
    const act2Start236 = Math.floor(n * 0.25);
    const act2End236   = Math.floor(n * 0.75);
    const totalRevs236 = records.filter((r: any) => r.revelation !== null).length;
    if (totalRevs236 >= 2) {
      const act2Revs236 = records.slice(act2Start236, act2End236).filter((r: any) => r.revelation !== null).length;
      if (act2Revs236 === 0) {
        issues.push({
          location: `Act 2 (Scenes ${act2Start236}–${act2End236 - 1})`,
          rule: 'ACT2_REVELATION_ABSENT',
          severity: 'minor',
          description: `Act 2 (Scenes ${act2Start236}–${act2End236 - 1}) contains no revelations despite ${totalRevs236} total revelations elsewhere. The middle act's dramatic engine is discovery — progressively raising the informational stakes. An Act 2 with no revelations is pure action; the audience stops learning while watching.`,
          suggestedFix: "Plant at least one revelation in Act 2: a truth about the antagonist, a new dimension of the protagonist's situation, or information that reframes everything the audience thought they knew about the central conflict.",
        });
      }
    }
  }

  // ── Wave 250: Curiosity void, Act 3 purpose monotone, Act 2b suspense decay ──

  // STRUCTURE_CURIOSITY_VOID (minor, n≥8): No scene raises curiosityDelta above 1
  // across the entire story. The structure poses no strong questions — no moment
  // of mystery, hook, or withheld revelation pulls the audience forward. Distinct
  // from CAUSAL: CURIOSITY_OPEN_LOOP (which fires when spikes exist but are never
  // answered); this fires when the structure NEVER CREATES a curiosity spike at all.
  // A story that never makes the audience want to know something is a story that
  // doesn't invite investment.
  if (n >= 8) {
    const hasCuriosity250 = records.some((r: any) => (r.curiosityDelta ?? 0) > 1);
    if (!hasCuriosity250) {
      issues.push({
        location: 'Structure — curiosity layer',
        rule: 'STRUCTURE_CURIOSITY_VOID',
        severity: 'minor',
        description: `No scene in the entire story raises curiosity above 1 — the structure poses no strong questions to the audience. Without moments of mystery, unanswered hooks, or deliberately withheld information, the story is a report, not a puzzle. The audience watches without wondering.`,
        suggestedFix: 'Engineer at least 2-3 curiosity spikes: a question the story opens but delays answering, an anomaly the audience notices before a character does, or an unexplained event planted early that the second half pays off. Curiosity is the structural glue that holds the audience to their seat between scenes.',
      });
    }
  }

  // ACT3_PURPOSE_MONOTONE (minor, n≥8): Act 3 (last 25%) has ≥3 scenes but
  // they all share the same purpose label. The resolution wears one structural
  // costume throughout — every scene in the finale serves the same narrative
  // function. Distinct from PURPOSE_MONOCULTURE (whole-story) and SETUP_RESOLUTION_
  // IMBALANCE (setup vs payoff ratio): this fires specifically when the ACT 3
  // scenes are functionally undifferentiated.
  if (n >= 8) {
    const act3Start250 = Math.floor(n * 0.75);
    const act3Recs250 = records.slice(act3Start250);
    if (act3Recs250.length >= 3) {
      const act3Purposes250 = new Set(act3Recs250.map((r: any) => r.purpose));
      if (act3Purposes250.size === 1) {
        const [onlyPurpose250] = act3Purposes250;
        issues.push({
          location: `Act 3 (Scenes ${act3Start250}–${n - 1}) — purpose layer`,
          rule: 'ACT3_PURPOSE_MONOTONE',
          severity: 'minor',
          description: `Act 3 (${act3Recs250.length} scenes) is entirely composed of "${onlyPurpose250}" scenes — every scene in the resolution wears the same structural label. A resolution needs variety: the confrontation, the aftermath, the final beat. When all scenes serve the same function, the finale is a single extended register rather than a structured landing.`,
          suggestedFix: `Differentiate Act 3 scenes: not every scene should be "${onlyPurpose250}". The climax needs a confrontation, a consequence, and a denouement — each serving a distinct purpose. Build in a scene of revelation, a scene of relational closure, and a scene that marks the new equilibrium.`,
        });
      }
    }
  }

  // ACT2B_SUSPENSE_DECAY (minor, n≥10): Average suspenseDelta in Act 2b (50%–75%)
  // is lower than in Act 2a (25%–50%). The engine slows before the climax instead
  // of building. Act 2b should be the pressure cooker — where the protagonist's
  // situation deteriorates and the antagonistic force reaches maximum strength.
  // When Act 2b has lower average suspense than Act 2a, the story runs out of
  // pressure just when it needs the most.
  if (n >= 10) {
    const act2aStart250 = Math.floor(n * 0.25);
    const act2bStart250 = Math.floor(n * 0.5);
    const act2bEnd250  = Math.floor(n * 0.75);
    const avgSuspense250 = (recs: typeof records) => {
      if (recs.length === 0) return 0;
      return recs.reduce((s: number, r: any) => s + (r.suspenseDelta ?? 0), 0) / recs.length;
    };
    const act2aAvg250 = avgSuspense250(records.slice(act2aStart250, act2bStart250));
    const act2bAvg250 = avgSuspense250(records.slice(act2bStart250, act2bEnd250));
    if (act2bAvg250 < act2aAvg250 - 0.5) {
      issues.push({
        location: `Act 2b (Scenes ${act2bStart250}–${act2bEnd250 - 1})`,
        rule: 'ACT2B_SUSPENSE_DECAY',
        severity: 'minor',
        description: `Act 2b (Scenes ${act2bStart250}–${act2bEnd250 - 1}) averages ${act2bAvg250.toFixed(2)} suspenseDelta vs ${act2aAvg250.toFixed(2)} in Act 2a — the story loses pressure in the run-up to the climax instead of building it. Act 2b should be the pressure cooker; a falling suspense average here signals a pre-climax stall.`,
        suggestedFix: "Build Act 2b pressure: introduce a new threat, escalate an existing one, or reveal a complication that makes the protagonist's situation measurably worse. The scene just before the climax should feel like the most impossible situation yet — not a recovery.",
      });
    }
  }
  // ── End Wave 250 ─────────────────────────────────────────────────────────────

  // ── Wave 264: Revelation clustered, Act 1 curiosity absent, Act 1 purpose single ──

  // REVELATION_CLUSTERED (minor, n≥8, ≥3 revelations): All revelations occur
  // within a 4-scene window — the story concentrates its discoveries into a
  // single burst rather than distributing them for sustained mystery. Clustered
  // revelations create an exposition dump and rob each discovery of individual
  // weight. Distinct from REVELATION_DROUGHT (long absence) and ACT2/ACT1
  // revelation checks (zone-specific absence).
  if (n >= 8) {
    const revScenes264 = records
      .map((r: any, i: number) => r.revelation !== null ? i : -1)
      .filter((i: number) => i >= 0);
    if (revScenes264.length >= 3) {
      const span264 = revScenes264[revScenes264.length - 1] - revScenes264[0];
      if (span264 <= 3) {
        issues.push({
          location: `Scenes ${revScenes264[0]}–${revScenes264[revScenes264.length - 1]} (revelation cluster)`,
          rule: 'REVELATION_CLUSTERED',
          severity: 'minor',
          description: `All ${revScenes264.length} revelations occur within a ${span264 + 1}-scene window (Scenes ${revScenes264[0]}–${revScenes264[revScenes264.length - 1]}) — the story dumps all its discoveries in a single burst. Clustered revelations rob each discovery of individual weight and create an exposition dump rather than sustained mystery.`,
          suggestedFix: 'Distribute revelations across the story: plant one in Act 1 to hook the audience, one in Act 2 to deepen the situation, and one near Act 3 to recontextualise everything. Spacing allows each revelation to breathe and reframe the scenes that follow it.',
        });
      }
    }
  }

  // ACT1_CURIOSITY_ABSENT (minor, n≥10): No Act 1 scene raises curiosityDelta
  // above 0.5 while the story has ≥2 curiosity spikes elsewhere. The opening
  // generates no audience questions despite later mystery — the premise is
  // announced without anticipation, squandering the hook opportunity of Act 1.
  if (n >= 10) {
    const act1End264 = Math.floor(n * 0.25);
    const storyCurious264 = records.filter((r: any) => (r.curiosityDelta ?? 0) > 0.5).length;
    if (storyCurious264 >= 2) {
      const act1Curious264 = records.slice(0, act1End264).filter((r: any) => (r.curiosityDelta ?? 0) > 0.5).length;
      if (act1Curious264 === 0) {
        issues.push({
          location: `Act 1 (Scenes 0–${act1End264 - 1})`,
          rule: 'ACT1_CURIOSITY_ABSENT',
          severity: 'minor',
          description: `No Act 1 scene raises curiosity above 0.5 despite ${storyCurious264} curiosity spikes later in the story. The opening generates no audience questions — the premise is announced without mystery. The hook opportunity of Act 1 is surrendered; the audience has nothing to wonder about during the setup.`,
          suggestedFix: 'Plant a curiosity spike in Act 1: an anomaly, a withheld identity, an unexplained event, or a question the story raises but deliberately delays answering. The first act should make the audience lean forward wondering what comes next.',
        });
      }
    }
  }

  // ACT1_PURPOSE_SINGLE (minor, n≥8): Act 1 (first 25%) has ≥3 scenes but all
  // share the same purpose label — the opening wears one structural costume
  // throughout. Distinct from ACT3_PURPOSE_MONOTONE (Act 3 specific) and
  // PURPOSE_MONOCULTURE (whole story dominant purpose).
  if (n >= 8) {
    const act1End264b = Math.floor(n * 0.25);
    const act1Recs264 = records.slice(0, act1End264b);
    if (act1Recs264.length >= 3) {
      const act1Purposes264 = new Set(act1Recs264.map((r: any) => r.purpose));
      if (act1Purposes264.size === 1) {
        const [singlePurpose264] = act1Purposes264;
        issues.push({
          location: `Act 1 (Scenes 0–${act1End264b - 1})`,
          rule: 'ACT1_PURPOSE_SINGLE',
          severity: 'minor',
          description: `Act 1 (${act1Recs264.length} scenes) is entirely composed of "${singlePurpose264}" scenes — the opening wears one structural label throughout. A well-crafted Act 1 moves through setup, incitement, and character introduction, each scene serving a different narrative function.`,
          suggestedFix: `Differentiate Act 1 structurally: not every opening scene should be "${singlePurpose264}". Mix a world-establishment scene, a character-moment, and an inciting event so each scene advances the setup differently. Structural variety in Act 1 ensures the audience is oriented before the conflict begins.`,
        });
      }
    }
  }

  // ── Wave 278: Act 2a suspense void, climax purpose absent, emotional arc uniform ──

  // ACT2A_SUSPENSE_VOID (minor, n≥10): No scene in Act 2a (25%–50%) reaches a
  // suspenseDelta above 1. The first half of the conflict zone is entirely flat.
  // Early Act 2 should escalate from the inciting incident — the protagonist
  // should already be in trouble. A void of meaningful tension in Act 2a signals
  // a failure to engage the conflict before the midpoint. Distinct from ACT2_DEAD_ZONE
  // (40%–60% flatness) and SECOND_ACT_INVERSION (Act 2b drops below Act 2a):
  // this fires on Act 2a's absolute absence of tension, not relative comparison.
  if (n >= 10) {
    const act2aStart278 = Math.floor(n * 0.25);
    const act2bStart278 = Math.floor(n * 0.5);
    const hasAct2aTension278 = records.slice(act2aStart278, act2bStart278).some(r => r.suspenseDelta > 1);
    if (!hasAct2aTension278) {
      issues.push({
        location: `Act 2a (Scenes ${act2aStart278}–${act2bStart278 - 1})`,
        rule: 'ACT2A_SUSPENSE_VOID',
        severity: 'minor',
        description: `No scene in Act 2a (Scenes ${act2aStart278}–${act2bStart278 - 1}) reaches a suspenseDelta above 1 — the first half of the conflict zone is entirely flat. Early Act 2 should escalate from the inciting incident; a void of tension here signals a failure to engage the conflict before the midpoint.`,
        suggestedFix: 'Raise the stakes in early Act 2: add a complication, a new obstacle, or a ticking-clock moment that pushes suspense above baseline. The conflict should be demonstrably live in Act 2a, not just implied.',
      });
    }
  }

  // PURPOSE_CLIMAX_ABSENT (major, n≥8): No scene carries purpose 'climax'. The
  // story's structure has no designated climactic moment — it generates suspense
  // without the author formally committing to which scene is the peak confrontation.
  // Distinct from PROTAGONIST_PASSIVITY_CLIMAX (which audits the highest-suspense
  // scene in the climax zone) — this fires when no scene declares itself the
  // structural climax at all. A story without a climax scene has no clear summit;
  // the audience has no moment against which all others are measured.
  if (n >= 8) {
    const hasClimax278 = records.some(r => r.purpose === 'climax');
    if (!hasClimax278) {
      issues.push({
        location: 'Story structure — climax layer',
        rule: 'PURPOSE_CLIMAX_ABSENT',
        severity: 'major',
        description: `No scene carries purpose "climax" — the structure has no designated highest moment. The story may generate suspense but never formally commits to a climax scene. Without a structural climax, the audience has no clear peak against which all other scenes are measured.`,
        suggestedFix: "Identify the story's highest-stakes confrontation and designate it as the structural climax: the scene where the central conflict is directly engaged and the protagonist's situation is irrevocably changed. The climax is not just the most intense scene — it is the one the entire story has been building toward.",
      });
    }
  }

  // EMOTIONAL_ARC_UNIFORM (minor, n≥8): More than 70% of scenes share the same
  // emotionalShift value (all neutral, all positive, or all negative). The
  // protagonist's emotional trajectory is monotone — no rise, fall, or change
  // across the story's dramatic events. A complete arc requires the audience to
  // move with the protagonist through at least two distinct emotional registers.
  // Distinct from NO_REVERSALS (suspense-based): this fires on emotional-register
  // uniformity rather than directional suspense uniformity.
  if (n >= 8) {
    const emotionCounts278 = new Map<string, number>();
    for (const r of records) {
      emotionCounts278.set(r.emotionalShift, (emotionCounts278.get(r.emotionalShift) ?? 0) + 1);
    }
    const [topEmotion278, topCount278] = [...emotionCounts278.entries()].sort((a, b) => b[1] - a[1])[0];
    if (topCount278 / n > 0.7) {
      issues.push({
        location: 'Emotional arc',
        rule: 'EMOTIONAL_ARC_UNIFORM',
        severity: 'minor',
        description: `${topCount278} of ${n} scenes (${Math.round(topCount278 / n * 100)}%) carry the same emotional register ("${topEmotion278}") — the protagonist's emotional trajectory is monotone. A full dramatic arc moves the character through distinct emotional phases: hope, fear, loss, recovery, and resolution.`,
        suggestedFix: 'Vary the emotional register: if the story is uniformly neutral, inject scenes of genuine positive momentum (a win, a connection, a moment of clarity) and scenes of genuine negative pressure (a setback, a cost, a loss). Emotional variety is the mechanism by which the audience empathises with the protagonist across the full arc.',
      });
    }
  }

  // ── Wave 292: ACT3_CURIOSITY_SPIKE_ABSENT ────────────────────────────────
  // No scene in the final quarter (75%–100%) has a curiosityDelta above 1,
  // despite the story having at least one such spike earlier. The climax zone
  // should be the story's most curious moment — audiences should desperately
  // want to know how it ends. A finale without any curiosity spike means the
  // audience already knows (or has stopped wondering) what will happen.
  // Requires 10+ records and 1+ curiosity spikes (>1) anywhere before the
  // final quarter.
  if (n >= 10) {
    const finalStart292 = Math.floor(n * 0.75);
    const preFinalSpike292 = records.slice(0, finalStart292).some(r => r.curiosityDelta > 1);
    if (preFinalSpike292) {
      const finalSpike292 = records.slice(finalStart292).some(r => r.curiosityDelta > 1);
      if (!finalSpike292) {
        issues.push({
          location: `Final quarter (Scenes ${finalStart292}+) — curiosity flatline`,
          rule: 'ACT3_CURIOSITY_SPIKE_ABSENT',
          severity: 'minor',
          description: `The story generates curiosity spikes (curiosityDelta > 1) before the final quarter but none in the finale (scenes ${finalStart292}+). The climax zone fails to intensify the audience's need to know — entering the resolution without peak curiosity means the answer arrives to an audience that has stopped asking the question.`,
          suggestedFix: "Introduce a late complication or revelation in the final quarter that reintensifies the audience's central question. The climax should feel like the most urgent answer to the most urgent question — if curiosity flatlines before the finale, the question has been implicitly resolved too early.",
        });
      }
    }
  }

  // ── Wave 292: CLOCK_PRESSURE_FINALE_ABSENT ───────────────────────────────
  // The story raises clocks (clockRaised) in earlier acts but no clock is
  // raised in the final quarter. The ticking deadline engine — which should
  // peak at the climax — goes silent before the resolution. A story that
  // establishes time pressure and then abandons it at the finale gives the
  // audience permission to relax when they should be most tense.
  // Requires 8+ records and 2+ clockRaised scenes before the final quarter.
  if (n >= 8) {
    const finalStart292b = Math.floor(n * 0.75);
    const earlyClocks292 = records.slice(0, finalStart292b).filter(r => r.clockRaised).length;
    if (earlyClocks292 >= 2) {
      const finalClocks292 = records.slice(finalStart292b).filter(r => r.clockRaised).length;
      if (finalClocks292 === 0) {
        issues.push({
          location: `Final quarter (Scenes ${finalStart292b}+) — no clock pressure`,
          rule: 'CLOCK_PRESSURE_FINALE_ABSENT',
          severity: 'minor',
          description: `${earlyClocks292} clock-raising scene(s) appear before the final quarter but the finale (scenes ${finalStart292b}+) has zero clock events. The ticking deadline engine — which should peak at the climax — goes silent before the resolution. Resolving the story without time pressure relaxes the audience when they should be most tense.`,
          suggestedFix: 'Add a clock event in the final quarter: a deadline arriving, a window closing, a countdown reaching zero. The clocks established in Act 2 should all come due at the climax — their convergence is what makes the finale feel like a reckoning rather than a conclusion.',
        });
      }
    }
  }

  // ── Wave 292: OPENING_SUSPENSE_FLATLINE ──────────────────────────────────
  // The first 3 scenes of the story all have suspenseDelta ≤ 0. The opening
  // fails to generate any tension before the Act 1 turn — the audience is
  // invited into a world of zero stakes. Even the most character-driven story
  // needs to establish at least some tension in the opening to signal that
  // things will get worse. Requires 5+ records (so the check is meaningful).
  if (n >= 5) {
    const openingSize292 = Math.min(3, n);
    const openingRecs292 = records.slice(0, openingSize292);
    const allFlatOpening292 = openingRecs292.every(r => r.suspenseDelta <= 0);
    if (allFlatOpening292) {
      issues.push({
        location: `Opening scenes (0–${openingSize292 - 1}) — no tension`,
        rule: 'OPENING_SUSPENSE_FLATLINE',
        severity: 'minor',
        description: `The first ${openingSize292} scene(s) all have suspenseDelta ≤ 0 — the story opens with zero tension. A flat opening fails to signal to the audience that stakes exist and things will escalate. Even a slow-burn story needs a tension seed in the opening that promises rising danger ahead.`,
        suggestedFix: 'Introduce a tension signal in the first scene: an unexplained threat, a simmering conflict, a hint of danger, or a question the protagonist urgently needs answered. The opening establishes the world\'s stakes — if stakes are absent, the audience has no reason to keep watching.',
      });
    }
  }

  // ── Wave 306: MIDPOINT_EMOTIONAL_FLATLINE ────────────────────────────────
  // The scene at the story's structural midpoint (50%) is emotionally neutral
  // AND carries no suspense (suspenseDelta ≤ 0). The midpoint is the spine of
  // the second act — where the protagonist's situation should pivot hardest.
  // A midpoint that is both emotionally inert and tensionless squanders the
  // story's central pivot. Distinct from WEAK_MIDPOINT (suspense-magnitude
  // proxy) and MIDPOINT_REVERSAL_ABSENT (no directional flip): this requires
  // the midpoint scene to be flat on both the emotional AND suspense channels.
  // Requires 8+ records.
  if (n >= 8) {
    const midIdx306 = Math.floor(n / 2);
    const midRec306 = records[midIdx306];
    if (midRec306 && midRec306.emotionalShift === 'neutral' && (midRec306.suspenseDelta ?? 0) <= 0) {
      issues.push({
        location: `Midpoint (Scene ${midRec306.sceneIdx})`,
        rule: 'MIDPOINT_EMOTIONAL_FLATLINE',
        severity: 'minor',
        description: `The midpoint scene (Scene ${midRec306.sceneIdx}) is emotionally neutral and carries no suspense (suspenseDelta ${midRec306.suspenseDelta ?? 0}). The midpoint is the second act's spine — the moment the protagonist's situation should pivot hardest, raising the stakes for everything after. A flat, tensionless midpoint leaves the story without a central fulcrum.`,
        suggestedFix: 'Charge the midpoint: stage a reversal, a revelation, or a point-of-no-return decision that resets the stakes and pushes the protagonist from reaction into action. The audience should feel the story change gears here — emotionally and in tension.',
      });
    }
  }

  // ── Wave 306: FINAL_IMAGE_WEAK ───────────────────────────────────────────
  // The final scene carries no charge on any channel: neutral emotional shift,
  // no suspense (≤ 0), and no relationship movement. The last image is what
  // the audience carries out of the theatre — a final scene that registers on
  // no channel sends them off with nothing. Distinct from RESOLUTION_TOO_BRIEF
  // (page length) and UNRESOLVED_ENDING (open loops): this audits the dramatic
  // charge of the closing beat. Requires 6+ records.
  if (n >= 6) {
    const lastRec306 = records[n - 1];
    const lastInert306 = lastRec306 &&
      lastRec306.emotionalShift === 'neutral' &&
      (lastRec306.suspenseDelta ?? 0) <= 0 &&
      ((lastRec306.relationshipShifts ?? []) as any[]).length === 0;
    if (lastInert306) {
      issues.push({
        location: `Final scene (Scene ${lastRec306.sceneIdx})`,
        rule: 'FINAL_IMAGE_WEAK',
        severity: 'minor',
        description: `The final scene (Scene ${lastRec306.sceneIdx}) carries no charge on any channel — neutral emotion, no suspense, no relationship movement. The last image is what the audience carries out of the theatre; a closing beat that registers on nothing sends them off empty-handed, undercutting whatever the story built.`,
        suggestedFix: 'Give the final scene a deliberate charge: a last emotional turn (acceptance, grief, hard-won peace), a final relational note (a bond sealed or severed), or a resonant image that answers the opening. The ending does not need spectacle, but it must leave a mark.',
      });
    }
  }

  // ── Wave 306: ACT_BALANCE_EXTREME ────────────────────────────────────────
  // One of the three acts (Act 1: 0–25%, Act 2: 25–75%, Act 3: 75–100%) holds
  // more than 55% of all scenes. Act 2 is expected to be the largest (~50%),
  // so this fires when ANY act is grossly oversized — an Act 1 or Act 3 over
  // 55% is a severe imbalance, and an Act 2 over 55% means the bookends are
  // starved. Distinct from the page-weight pacing checks (line counts): this
  // audits scene-count distribution. Requires 10+ records.
  if (n >= 10) {
    const act1Count306 = records.filter(r => r.sceneIdx < n * 0.25).length;
    const act2Count306 = records.filter(r => r.sceneIdx >= n * 0.25 && r.sceneIdx < n * 0.75).length;
    const act3Count306 = records.filter(r => r.sceneIdx >= n * 0.75).length;
    const acts306 = [
      { name: 'Act 1', count: act1Count306 },
      { name: 'Act 2', count: act2Count306 },
      { name: 'Act 3', count: act3Count306 },
    ];
    const biggest306 = acts306.reduce((a, b) => (b.count > a.count ? b : a));
    if (biggest306.count / n > 0.55) {
      issues.push({
        location: `${biggest306.name} (${biggest306.count} of ${n} scenes)`,
        rule: 'ACT_BALANCE_EXTREME',
        severity: 'minor',
        description: `${biggest306.name} holds ${biggest306.count} of ${n} scenes (${Math.round(biggest306.count / n * 100)}%) — a severe structural imbalance. ${biggest306.name === 'Act 2' ? 'An oversized Act 2 starves the setup and resolution, leaving the bookends too thin to establish and land the story.' : `An oversized ${biggest306.name} crowds out the complication zone where the story's real work happens.`}`,
        suggestedFix: biggest306.name === 'Act 2'
          ? 'Redistribute scenes toward Act 1 and Act 3 so the setup has room to establish stakes and the resolution has room to land. Act 2 should be the largest act but not by starving the others.'
          : `Move scenes out of ${biggest306.name} into Act 2. The complication zone (Act 2) should be the story's largest act; a bloated ${biggest306.name} signals the setup or resolution is doing work that belongs in the middle.`,
      });
    }
  }

  // ── Wave 320: CLIMAX_REVELATION_ABSENT ───────────────────────────────────
  // The story carries 2+ revelations but none of them lands in Act 3 (final
  // 25%). The climax act resolves without a single disclosure — the audience
  // arrives at the ending already knowing everything, so the climax delivers
  // confirmation rather than discovery. Distinct from REVELATION_DROUGHT
  // (long gap between any revelations) and ACT2_REVELATION_ABSENT (Act 2
  // specifically): this fires when revelations exist but are all spent before
  // the climax. Requires 8+ records.
  if (n >= 8) {
    const act3Start320 = Math.floor(n * 0.75);
    const totalRevs320 = records.filter(r => r.revelation).length;
    const act3Revs320 = records.filter(r => r.revelation && r.sceneIdx >= act3Start320).length;
    if (totalRevs320 >= 2 && act3Revs320 === 0) {
      issues.push({
        location: `Act 3 (Scenes ${act3Start320}–${n - 1}) — no revelation`,
        rule: 'CLIMAX_REVELATION_ABSENT',
        severity: 'minor',
        description: `The story carries ${totalRevs320} revelations but none lands in Act 3 (Scenes ${act3Start320}+). Every disclosure is spent before the climax, so the audience arrives at the ending already knowing everything. The climax delivers confirmation rather than discovery — the most charged structural position holds no new truth.`,
        suggestedFix: 'Reserve at least one significant revelation for Act 3: the final piece that recontextualizes the climax, the truth the protagonist has been missing, or the cost they only now understand. A climax without discovery is an outcome the audience has already calculated.',
      });
    }
  }

  // ── Wave 320: ACT2_CURIOSITY_VALLEY ──────────────────────────────────────
  // Act 2 (25%–75%) has an average curiosityDelta below BOTH Act 1 (0–25%)
  // and Act 3 (75%–100%). The complication zone — the longest stretch of the
  // story — is the least curious, sagging between a curious setup and a
  // curious finale. Distinct from ACT1_CURIOSITY_ABSENT (no spike in Act 1)
  // and ACT3_CURIOSITY_SPIKE_ABSENT (no spike in the final quarter): this
  // audits Act 2 relative to its neighbours. Requires 12+ records with ≥3
  // scenes in each act.
  if (n >= 12) {
    const a1End320 = Math.floor(n * 0.25);
    const a2End320 = Math.floor(n * 0.75);
    const a1Recs320 = records.slice(0, a1End320);
    const a2Recs320 = records.slice(a1End320, a2End320);
    const a3Recs320 = records.slice(a2End320);
    if (a1Recs320.length >= 3 && a2Recs320.length >= 3 && a3Recs320.length >= 3) {
      const avgCur320 = (rs: typeof records) => rs.reduce((s, r) => s + (r.curiosityDelta ?? 0), 0) / rs.length;
      const a1Cur320 = avgCur320(a1Recs320);
      const a2Cur320 = avgCur320(a2Recs320);
      const a3Cur320 = avgCur320(a3Recs320);
      if (a2Cur320 < a1Cur320 && a2Cur320 < a3Cur320) {
        issues.push({
          location: `Act 2 (Scenes ${a1End320}–${a2End320 - 1}) — curiosity valley`,
          rule: 'ACT2_CURIOSITY_VALLEY',
          severity: 'minor',
          description: `Act 2's average curiosityDelta (${a2Cur320.toFixed(2)}) is below both Act 1 (${a1Cur320.toFixed(2)}) and Act 3 (${a3Cur320.toFixed(2)}) — the complication zone is the least curious stretch of the story. The longest act sags between a curious setup and a curious finale, exactly where the audience spends most of their time. Curiosity that dips in the middle invites disengagement before the climax can re-grab them.`,
          suggestedFix: 'Plant fresh questions through Act 2: each complication should open a new line of inquiry, and the midpoint should raise a question that reframes everything before it. The middle act is where curiosity must be actively renewed, not coasted through on the opening hook.',
        });
      }
    }
  }

  // ── Wave 320: EMOTIONAL_OPENING_NEUTRAL ──────────────────────────────────
  // The first three scenes are all emotionally neutral. The opening establishes
  // nothing on the emotional channel — the audience meets the story through a
  // flat affect and is given no feeling to attach to before the plot machinery
  // starts. Distinct from OPENING_SUSPENSE_FLATLINE (first 3 scenes suspense ≤ 0)
  // and COLD_OPEN_INERT (scene 0 lacks all hooks): this audits the emotional
  // register specifically across the opening run. Requires 6+ records.
  if (n >= 6) {
    const opening320 = records.slice(0, 3);
    if (opening320.every(r => r.emotionalShift === 'neutral')) {
      issues.push({
        location: 'Opening (Scenes 0–2) — emotional flatline',
        rule: 'EMOTIONAL_OPENING_NEUTRAL',
        severity: 'minor',
        description: `The first three scenes are all emotionally neutral — the opening establishes nothing on the emotional channel. The audience meets the story through flat affect and is given no feeling to attach to before the plot begins. An opening that engages the mind (plot, questions) but not the heart risks the audience watching from a distance rather than investing.`,
        suggestedFix: 'Charge at least one of the first three scenes emotionally: a moment of warmth, dread, grief, or longing that gives the audience a feeling to carry into the story. Emotional investment in the opening is what makes the later stakes matter — the audience must care before they can be made anxious.',
      });
    }
  }

  // ── Wave 331: ACT3_EMOTIONAL_FLATLINE, ACT1_WARMTH_ABSENT, DRAMATIC_TURN_OPENING_ABSENT ──

  // ACT3_EMOTIONAL_FLATLINE (minor, n≥10, ≥3 Act 3 scenes): All scenes in Act 3
  // (final 25%) carry emotionalShift='neutral'. The finale generates no emotional
  // charge — neither the climax nor the denouement gives the audience a feeling to
  // land on. Stories that resolve without emotional register leave their audiences
  // intellectually closed but emotionally untouched. Distinct from
  // EMOTIONAL_OPENING_NEUTRAL (first 3 scenes, not Act 3), MIDPOINT_EMOTIONAL_FLATLINE
  // (midpoint only), EMOTIONAL_ARC_UNIFORM (>70% of ALL scenes same shift, any value).
  if (n >= 10) {
    const act3Start331 = Math.floor(n * 0.75);
    const act3Scenes331 = records.slice(act3Start331);
    if (act3Scenes331.length >= 3 && act3Scenes331.every(r => r.emotionalShift === 'neutral')) {
      issues.push({
        location: `Act 3 (Scenes ${act3Start331}–${n - 1}) — emotional flatline`,
        rule: 'ACT3_EMOTIONAL_FLATLINE',
        severity: 'minor',
        description: `All ${act3Scenes331.length} Act 3 scenes (${act3Start331}–${n - 1}) are emotionally neutral — the finale generates no emotional charge. Stories that resolve without emotional register close their audience intellectually but leave them untouched at the feeling level. A climax and denouement that carry no emotional weight miss the cathartic function of the final act.`,
        suggestedFix: 'Charge the finale emotionally: the climax should reach the highest (or lowest) emotional register in the story, and the denouement should deliver either earned warmth or productive grief. The audience needs a feeling to carry out of the theatre — give the resolution an emotional signature.',
      });
    }
  }

  // ACT1_WARMTH_ABSENT (minor, n≥8, ≥2 Act 1 scenes): No scene in the first 25%
  // carries emotionalShift='positive'. The opening act never establishes emotional
  // warmth — the story's world is introduced without a baseline of care, hope, or
  // connection. Without warmth to contrast against, the darker elements of Acts 2
  // and 3 have no emotional leverage point. Distinct from EMOTIONAL_OPENING_NEUTRAL
  // (first 3 scenes all neutral — could include negative scenes; this fires when
  // no scene is specifically positive), EMOTIONAL_ARC_UNIFORM (all scenes same shift).
  if (n >= 8) {
    const act1End331 = Math.floor(n * 0.25);
    const act1Scenes331 = records.slice(0, act1End331);
    if (act1Scenes331.length >= 2 && !act1Scenes331.some(r => r.emotionalShift === 'positive')) {
      issues.push({
        location: `Act 1 (Scenes 0–${act1End331 - 1}) — no warmth established`,
        rule: 'ACT1_WARMTH_ABSENT',
        severity: 'minor',
        description: `None of the ${act1Scenes331.length} Act 1 scene(s) carry a positive emotional shift — the opening act never establishes warmth, hope, or connection. Without a baseline of care, the later darkness has no emotional leverage; the audience has nothing to lose. A world introduced without warmth is harder to invest in.`,
        suggestedFix: 'Give at least one Act 1 scene a positive emotional register: a relationship that works, a moment of competence or joy, a world worth fighting for. This baseline is what the protagonist will spend the rest of the story trying to recover or protect — without it, the stakes are abstract.',
      });
    }
  }

  // DRAMATIC_TURN_OPENING_ABSENT (minor, n≥10): No scene in the opening 30%
  // carries a dramaticTurn. The opening act never pivots direction. A screenplay's
  // first act should contain at least one turning point that launches the
  // protagonist out of their ordinary world — without a turn, the opening is
  // pure setup with no dramatic event to orient the audience's expectations.
  // Distinct from MIDPOINT_REVERSAL_ABSENT (checks suspenseDelta<-1 OR revelation
  // in the midpoint zone, not dramaticTurn), ACT1_BOUNDARY_WEAK (Act 1 boundary
  // scene suspense, not dramaticTurn), INCITING_INCIDENT_TOO_LATE (any dramatic
  // event past 40%, not specifically dramaticTurn field).
  if (n >= 10) {
    const openingEnd331 = Math.floor(n * 0.30);
    const hasTurn331 = records.slice(0, openingEnd331).some(
      r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
    );
    if (!hasTurn331) {
      issues.push({
        location: `Opening 30% (Scenes 0–${openingEnd331 - 1}) — no dramatic turn`,
        rule: 'DRAMATIC_TURN_OPENING_ABSENT',
        severity: 'minor',
        description: `No scene in the opening 30% (scenes 0–${openingEnd331 - 1}) carries a dramatic turn — the opening act never pivots. A screenplay's first act should contain at least one turning point that disrupts the protagonist's ordinary world and launches the central conflict. Without a turn, the opening is pure setup with no event to signal that the story has actually started.`,
        suggestedFix: 'Place a dramatic turn in the opening act: the discovery of a problem, the arrival of an antagonist, a decision that changes the protagonist\'s direction. This turn is what separates the story from its backstory — it is the moment the audience knows the clock has started.',
      });
    }
  }

  // ── Rewrite ───────────────────────────────────────────────────────────────
  const { revised, usedLLM } = await rewritePass({ fountain, issues, passName: 'structure', approvedSpans, storyContext: input.storyContext, priorPassResults: input.priorPassResults });
  const changed = revised !== fountain;

  return {
    pass: 'structure',
    issues,
    revisedFountain: revised,
    changed,
    summary: issues.length === 0
      ? 'Structure pass: no issues found'
      : `Structure pass: ${issues.length} issue(s) — ${usedLLM ? 'rewritten' : 'flagged (stub mode)'}`,
  };
}
