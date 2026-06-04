// Wave 39 — Pass 3: Intention
// Checks character intention clarity: characters acting without readable goals,
// want/fear asymmetry, unmotivated entrances.
// Wave 142 additions: scene entropy detection (scenes that don't advance plot,
// character development, or theme; scenes with zero narrative momentum).
// Wave 156 additions: protagonist reactive dominance (protagonist is purely reactive
// in Act 2 with no initiation), intention dropout (character introduced in Act 1
// dialogue vanishes from second half), want/fear collision absent (no scene shows
// the protagonist gaining something while losing a relationship, or vice versa).

import type { PassInput, PassResult, RevisionIssue } from './types.ts';
import { rewritePass } from '../rewrite.ts';

/** Extract unique character IDs from dialogue highlights across all records */
function extractCharacterIds(records: PassInput['records']): Set<string> {
  const chars = new Set<string>();
  for (const r of records) {
    for (const d of r.dialogueHighlights) {
      // Highlights are propositions like "alice: believes X"
      const match = d.match(/^(\w+):/);
      if (match) chars.add(match[1]);
    }
    // Also extract from slug (primitive heuristic)
  }
  return chars;
}

export async function intentionPass(input: PassInput): Promise<PassResult> {
  const { fountain, records, structure, approvedSpans } = input;
  const issues: RevisionIssue[] = [];
  const n = records.length;

  // ── Characters with no dialogue/belief traces may be props ────────────────
  const activeChars = extractCharacterIds(records);
  const linesInFountain = fountain.split('\n');
  // Fountain character cues are ALL-CAPS lines that aren't sluglines/transitions
  const fountainChars = new Set<string>();
  for (const line of linesInFountain) {
    if (/^[A-Z][A-Z0-9\s\-'\.]{2,}$/.test(line.trim()) && !/^(INT\.|EXT\.|CUT TO|FADE|SMASH|THE END|ACT|MIDPOINT|SCENE)/i.test(line.trim())) {
      fountainChars.add(line.trim().split('(')[0].trim());
    }
  }

  // Characters in fountain with no belief traces are intention-invisible
  for (const char of fountainChars) {
    const slug = char.toLowerCase().replace(/\s+/g, '_');
    if (!activeChars.has(slug) && !activeChars.has(char.toLowerCase())) {
      if (char !== 'NARRATOR' && char !== 'V.O.' && char !== 'O.S.') {
        issues.push({
          location: `Character: ${char}`,
          rule: 'INTENTION_INVISIBLE',
          description: `${char} appears in the screenplay but has no tracked beliefs or goals — their intention is opaque`,
          severity: 'minor',
          suggestedFix: `Give ${char} a clear want in their first scene (verbal or physical action)`,
        });
      }
    }
  }

  // ── Escalation without character agency ───────────────────────────────────
  if (structure.escalating && structure.reversalCount === 0) {
    issues.push({
      location: 'Overall intention layer',
      rule: 'PASSIVE_ESCALATION',
      description: 'Story escalates but no character causes a reversal — escalation feels external/accidental',
      severity: 'major',
      suggestedFix: 'Make a character\'s deliberate choice the engine of the next escalation',
    });
  }

  // ── Repeated scene purpose (3+ consecutive same-purpose scenes) ──────────
  // Three consecutive scenes tagged with the same purpose signal stalled momentum.
  if (records.length >= 3) {
    let streakPurpose = records[0].purpose;
    let streakStart = 0;
    let streakLen = 1;
    for (let i = 1; i < records.length; i++) {
      if (records[i].purpose === streakPurpose) {
        streakLen++;
      } else {
        streakPurpose = records[i].purpose;
        streakStart = i;
        streakLen = 1;
      }
      if (streakLen === 3) {
        // Low-momentum ScenePurpose values that stall the story when repeated 3+
        // times. These are the non-escalating purposes from the ScenePurpose enum;
        // the dramatic purposes (raise_stakes, revelation, turning_point, climax,
        // complicate, introduce_conflict) are expected to recur and aren't flagged.
        const lowMomentumPurposes = new Set<string>([
          'establish_world', 'character_moment', 'resolution',
        ]);
        if (lowMomentumPurposes.has(streakPurpose)) {
          issues.push({
            location: `Scenes ${streakStart}–${i} (${records[streakStart].slug})`,
            rule: 'REPEATED_PURPOSE',
            description: `Three consecutive scenes share the same purpose (${streakPurpose}) — the story stalls without a shift in function`,
            severity: 'major',
            suggestedFix: `Break the run of "${streakPurpose}" scenes with a scene that raises stakes, complicates the situation, or delivers a revelation`,
          });
          // Reset streak so a longer run doesn't re-fire at exactly 3 again
          streakLen = 0;
          streakStart = i + 1;
        }
      }
    }
  }

  // ── Act 3 without a character making the climactic choice ─────────────────
  if (structure.actPosition === 'act3' || structure.actPosition === 'epilogue') {
    const act3Records = records.slice(Math.floor(records.length * 0.75));
    // Check purpose rather than dramaticTurn string: deriveDramaticTurn never returns 'none',
    // so the dramaticTurn field is always truthy. Purpose reflects actual op content.
    const dramaticPurposes = new Set(['climax', 'turning_point', 'revelation', 'raise_stakes']);
    const hasClearTurn = act3Records.some(r => dramaticPurposes.has(r.purpose));
    if (!hasClearTurn && act3Records.length > 0) {
      issues.push({
        location: 'Act 3',
        rule: 'CLIMAX_WITHOUT_CHOICE',
        description: 'The third act contains no climax, turning point, or revelation — the climax lacks a character-driven resolution',
        severity: 'critical',
        suggestedFix: 'Add a moment where the protagonist makes an irreversible choice that resolves the central tension',
      });
    }
  }

  // ── Wave 142: Scene Entropy — scenes that don't advance story ──────────────
  // ZERO_ENTROPY_SCENE: A scene with no emotional shift, no relationship change,
  // no clues planted, and no clock raised — the scene changes nothing. These are
  // narrative dead zones that kill momentum.
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const hasEmotionalShift = r.emotionalShift !== 'neutral';
    const hasRelationshipShift = (r.relationshipShifts?.length ?? 0) > 0;
    const hasPlantedClues = (r.seededClueIds?.length ?? 0) > 0;
    const hasClockPressure = r.clockRaised || r.clockDelta > 1;
    const isHighDrama = r.suspenseDelta > 2;

    const hasAnyMomentum = hasEmotionalShift || hasRelationshipShift || hasPlantedClues || hasClockPressure || isHighDrama;

    if (!hasAnyMomentum && records.length >= 6) {
      // Only flag if this is a middle scene (not opening setup, not closing epilogue)
      const isMiddle = i > 0 && i < records.length - 1;
      if (isMiddle) {
        issues.push({
          location: `Scene ${i} (${r.slug})`,
          rule: 'ZERO_ENTROPY_SCENE',
          description: `Scene ${i} has no emotional shift, relationship change, planted clues, or clock pressure — the scene advances neither plot nor character`,
          severity: 'major',
          suggestedFix: 'Either add a moment where someone learns something, feels something, or commits to something; or cut the scene entirely',
        });
      }
    }
  }

  // ENTROPY_CLUSTER: Three consecutive scenes with low momentum (suspense delta < 1).
  // This indicates a pacing dead zone where the story stalls.
  let lowMomentumCount = 0;
  let clusterStart = -1;
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const isLowMomentum = r.suspenseDelta < 1 && (r.relationshipShifts?.length ?? 0) === 0 && (r.seededClueIds?.length ?? 0) === 0;

    if (isLowMomentum) {
      if (lowMomentumCount === 0) clusterStart = i;
      lowMomentumCount++;
    } else {
      lowMomentumCount = 0;
    }

    if (lowMomentumCount === 3) {
      issues.push({
        location: `Scenes ${clusterStart}–${i}`,
        rule: 'ENTROPY_CLUSTER',
        description: `Three consecutive scenes (${clusterStart}–${i}) have low suspense and no relationship/clue advancement — the story stalls in a dead zone`,
        severity: 'major',
        suggestedFix: 'Add a turning point, revelation, or relationship shift to one of these scenes; or consolidate them into a single tighter scene',
      });
      lowMomentumCount = 0; // reset to avoid duplicate flags
    }
  }

  // ── Wave 156: Protagonist reactive dominance ──────────────────────────────
  // PROTAGONIST_REACTIVE_DOMINANCE: In Act 2 (scenes 25%-75%), the protagonist
  // faces sustained high-stakes pressure but never once initiates action — no
  // clock raised, no clue planted. A protagonist who only reacts to external
  // forces is a passenger in their own story. Requires 8+ scenes, 3+ high-
  // stakes reactive scenes in Act 2, and zero proactive scenes in Act 2.
  if (n >= 8) {
    const act2Start = Math.floor(n * 0.25);
    const act2End = Math.floor(n * 0.75);
    const act2Records = records.slice(act2Start, act2End);

    const proactiveScenes = act2Records.filter(
      r => r.clockRaised || (r.seededClueIds?.length ?? 0) > 0,
    ).length;
    const reactiveHighStakeScenes = act2Records.filter(
      r => r.suspenseDelta > 1.5 && !r.clockRaised && (r.seededClueIds?.length ?? 0) === 0,
    ).length;

    if (reactiveHighStakeScenes >= 3 && proactiveScenes === 0) {
      issues.push({
        location: `Act 2 (Scenes ${act2Start}–${act2End - 1})`,
        rule: 'PROTAGONIST_REACTIVE_DOMINANCE',
        description: `Act 2 has ${reactiveHighStakeScenes} high-stakes scenes but the protagonist never initiates action (no clock raised, no clue planted) — the protagonist is entirely reactive, a passenger in their own story`,
        severity: 'major',
        suggestedFix: 'Add at least one Act 2 scene where the protagonist drives the plot forward: they raise a clock, plant a trap, reveal a secret, or confront the antagonist on their own terms',
      });
    }
  }

  // ── INTENTION_DROPOUT ────────────────────────────────────────────────────
  // A character who appears prominently in Act 1 dialogue (2+ belief traces
  // in the first 30% of scenes) but never appears again in the second half
  // (from the midpoint onward). Their intention is opened but never resolved —
  // the audience's investment in them has nowhere to land.
  if (n >= 8) {
    const act1TraceEnd = Math.floor(n * 0.3);
    const secondHalfStart = Math.floor(n * 0.5);

    const charEarlyCount = new Map<string, number>();
    for (const r of records.slice(0, act1TraceEnd)) {
      for (const d of r.dialogueHighlights) {
        const m = d.match(/^(\w+):/);
        if (m) charEarlyCount.set(m[1], (charEarlyCount.get(m[1]) ?? 0) + 1);
      }
    }

    const charsInSecondHalf = new Set<string>();
    for (const r of records.slice(secondHalfStart)) {
      for (const d of r.dialogueHighlights) {
        const m = d.match(/^(\w+):/);
        if (m) charsInSecondHalf.add(m[1]);
      }
    }

    for (const [char, count] of charEarlyCount) {
      if (count >= 2 && !charsInSecondHalf.has(char)) {
        issues.push({
          location: `Character: ${char} (last seen before Scene ${act1TraceEnd})`,
          rule: 'INTENTION_DROPOUT',
          description: `Character "${char}" has ${count} dialogue appearances in Act 1 but vanishes from the second half of the story — their intention is opened but never resolved`,
          severity: 'major',
          suggestedFix: `Give "${char}" a scene in the second half where their Act 1 intention is fulfilled, frustrated, or transformed; or cut their early appearances if they serve no ongoing story function`,
        });
      }
    }
  }

  // ── WANT_FEAR_COLLISION_ABSENT ────────────────────────────────────────────
  // The classic want/fear collision: a scene where the protagonist gains what
  // they want emotionally but damages a key relationship (or sacrifices
  // relationally to gain emotionally). When this collision never occurs, the
  // protagonist's wants and fears never intersect — there is no true dramatic
  // cost. Requires 6+ scenes and at least one scene with a relationship shift.
  if (n >= 6) {
    const hasRelationshipShifts = records.some(r => (r.relationshipShifts?.length ?? 0) > 0);
    if (hasRelationshipShifts) {
      const hasCollision = records.some(r => {
        const posEmotion = r.emotionalShift === 'positive';
        const negEmotion = r.emotionalShift === 'negative';
        const hasNegRelShift = (r.relationshipShifts ?? []).some(s => s.amount < -0.3);
        const hasPosRelShift = (r.relationshipShifts ?? []).some(s => s.amount > 0.3);
        // Win emotionally while damaging a relationship — OR sacrifice to strengthen one
        return (posEmotion && hasNegRelShift) || (negEmotion && hasPosRelShift);
      });
      if (!hasCollision) {
        issues.push({
          location: 'Character intention layer',
          rule: 'WANT_FEAR_COLLISION_ABSENT',
          description: 'No scene shows a want/fear collision: the protagonist never gains something while losing a relationship, nor sacrifices something to protect one. Their wants and fears never intersect.',
          severity: 'major',
          suggestedFix: 'Add a scene where achieving what the protagonist wants damages a key relationship (or where they sacrifice their goal to protect one) — this collision is what creates emotional stakes and forces a character-defining choice',
        });
      }
    }
  }

  // ── Wave 171: GOAL_INVERSION_ABSENT ───────────────────────────────────────
  // Dramatic irony of pursuit: at no point does the protagonist's active
  // pursuit (a proactive scene — clock raised or clue planted) directly
  // produce the opposite of its intended effect (a negative emotional shift
  // or a relationship loss in that same scene). When every proactive scene
  // pays off cleanly, the protagonist's drive never backfires — there is no
  // dramatic irony baked into the pursuit itself, and the story feels too
  // frictionless. Requires 6+ scenes and at least 2 proactive scenes.
  if (n >= 6) {
    const proactiveScenes = records.filter(
      r => r.clockRaised || (r.seededClueIds?.length ?? 0) > 0,
    );
    if (proactiveScenes.length >= 2) {
      const hasInversion = proactiveScenes.some(r => {
        const negEmotion = r.emotionalShift === 'negative';
        const hasNegRelShift = (r.relationshipShifts ?? []).some(s => s.amount < -0.3);
        return negEmotion || hasNegRelShift;
      });
      if (!hasInversion) {
        issues.push({
          location: 'Character intention layer',
          rule: 'GOAL_INVERSION_ABSENT',
          description: `The protagonist has ${proactiveScenes.length} proactive scenes but none of them backfire — pursuing the goal never produces a negative emotional shift or a relationship loss. The pursuit is frictionless, with no dramatic irony built into the wanting itself`,
          severity: 'major',
          suggestedFix: 'Add a scene where the protagonist actively pursues their goal and the pursuit itself makes things worse — they win the battle but lose an ally, or get what they asked for and regret it. The goal should bite back',
        });
      }
    }
  }

  // ── Wave 171: PASSIVE_ACT3_INTENTION ──────────────────────────────────────
  // In Act 3 (the final 25% of scenes), the protagonist initiates nothing:
  // no clock raised, no clue planted across the entire act. They are carried
  // to the climax rather than choosing it. This is distinct from
  // CLIMAX_WITHOUT_CHOICE (which checks scene purpose/dramatic turn) — this
  // checks raw agency signals. Requires 8+ scenes and a non-empty Act 3.
  if (n >= 8) {
    const act3Start = Math.floor(n * 0.75);
    const act3Records = records.slice(act3Start);
    if (act3Records.length >= 2) {
      const act3Proactive = act3Records.filter(
        r => r.clockRaised || (r.seededClueIds?.length ?? 0) > 0,
      ).length;
      if (act3Proactive === 0) {
        issues.push({
          location: `Act 3 (Scenes ${act3Start}–${n - 1})`,
          rule: 'PASSIVE_ACT3_INTENTION',
          description: `Across all ${act3Records.length} Act 3 scenes the protagonist initiates no action — no clock raised, no clue planted. They are carried to the ending rather than choosing it; the climax happens to them instead of being driven by them`,
          severity: 'critical',
          suggestedFix: 'Give the protagonist at least one decisive proactive beat in Act 3: they set the final trap, force the confrontation, or make the irreversible move that triggers the climax. The ending must be something they cause, not something they merely survive',
        });
      }
    }
  }

  // ── Wave 171: ENTROPY_SPIKE_MISPLACED ─────────────────────────────────────
  // The story's single highest-entropy scene — the moment of maximum narrative
  // momentum (suspense + relationship turbulence + clue density) — lands in
  // Act 1 (the first 25%) rather than near the climax. When the most
  // informationally dense moment is in the setup, the story front-loads its
  // peak and has nowhere to build toward. Requires 8+ scenes.
  if (n >= 8) {
    const entropyOf = (r: PassInput['records'][number]): number => {
      const suspense = Math.max(0, r.suspenseDelta);
      const relTurbulence = (r.relationshipShifts ?? []).reduce(
        (sum, s) => sum + Math.abs(s.amount), 0,
      );
      const clueDensity = (r.seededClueIds?.length ?? 0) + (r.payoffSetupIds?.length ?? 0);
      const emotionWeight = r.emotionalShift !== 'neutral' ? 1 : 0;
      return suspense + relTurbulence * 2 + clueDensity + emotionWeight;
    };

    let peakIdx = 0;
    let peakEntropy = -Infinity;
    for (let i = 0; i < records.length; i++) {
      const e = entropyOf(records[i]);
      if (e > peakEntropy) {
        peakEntropy = e;
        peakIdx = i;
      }
    }

    const act1End = Math.floor(n * 0.25);
    // Only meaningful if the peak actually carries momentum (entropy > 2) and
    // there is a genuine spread (peak isn't trivially flat across the story).
    if (peakIdx < act1End && peakEntropy > 2) {
      issues.push({
        location: `Scene ${peakIdx} (${records[peakIdx].slug})`,
        rule: 'ENTROPY_SPIKE_MISPLACED',
        description: `The story's highest-momentum scene (Scene ${peakIdx}, entropy ${peakEntropy.toFixed(1)}) lands in Act 1 rather than near the climax — the most informationally dense moment is in the setup, so the story front-loads its peak and has nowhere left to build`,
        severity: 'major',
        suggestedFix: 'Redistribute momentum so the entropy peak lands in the back half: dial down the Act 1 spike, or escalate the climax so the densest concentration of suspense, relationship turns, and revelations arrives when the stakes are highest',
      });
    }
  }

  // ── Wave 188: Entropy arc flat, intention convergence absent, entropy cliff ──

  // Shared entropy helper (same formula as ENTROPY_SPIKE_MISPLACED, scoped here)
  const w188Entropy = (r: typeof records[0]): number => {
    const s = Math.max(0, r.suspenseDelta);
    const t = (r.relationshipShifts ?? []).reduce(
      (sum: number, x: { amount: number }) => sum + Math.abs(x.amount), 0,
    );
    const c = (r.seededClueIds?.length ?? 0) + (r.payoffSetupIds?.length ?? 0);
    const em = r.emotionalShift !== 'neutral' ? 1 : 0;
    return s + t * 2 + c + em;
  };

  // ESCALATION_ENTROPY_FLAT: The composite narrative entropy (suspense + relational
  // turbulence×2 + clue density + emotion weight) of Act 2b (50%–75%) is no higher
  // than Act 2a (25%–50%). The story's complexity and momentum stall in the second
  // half of the conflict zone instead of building toward the climax. Distinct from
  // ESCALATION_REVERSED (structure pass, raw suspense) and SECOND_ACT_INVERSION
  // (structure pass, raw suspense); this tracks composite narrative heat.
  if (n >= 10) {
    const act2aStart = Math.floor(n * 0.25);
    const act2bStart = Math.floor(n * 0.5);
    const act2bEnd   = Math.floor(n * 0.75);
    const act2aRecs  = records.slice(act2aStart, act2bStart);
    const act2bRecs  = records.slice(act2bStart, act2bEnd);
    if (act2aRecs.length >= 2 && act2bRecs.length >= 2) {
      const avgE = (recs: typeof records) =>
        recs.reduce((s, r) => s + w188Entropy(r), 0) / recs.length;
      const avgAct2a = avgE(act2aRecs);
      const avgAct2b = avgE(act2bRecs);
      if (avgAct2a > 1.5 && avgAct2b <= avgAct2a) {
        issues.push({
          location: `Act 2 (Scenes ${act2aStart}–${act2bEnd - 1})`,
          rule: 'ESCALATION_ENTROPY_FLAT',
          description: `Act 2a (Scenes ${act2aStart}–${act2bStart - 1}) has average narrative entropy ${avgAct2a.toFixed(1)} but Act 2b (Scenes ${act2bStart}–${act2bEnd - 1}) drops to ${avgAct2b.toFixed(1)} — the composite momentum (suspense + relational turbulence + clue density) fails to build across the conflict zone.`,
          severity: 'major',
          suggestedFix: 'Escalate Act 2b: add a revelation, deepen a relationship rupture, or raise a new clock. The second half of the conflict zone must be denser with narrative event than the first — the audience should feel the story accelerating, not plateauing.',
        });
      }
    }
  }

  // INTENTION_CONVERGENCE_ABSENT: The story has both seeded clues (the protagonist
  // plants things for future resolution) and a raised clock (external deadline) but
  // no scene combines both — proactive intention and urgent pressure run on separate
  // tracks and never converge. Real climaxes occur when a character's plan meets an
  // unavoidable deadline in the same scene. Requires 8+ scenes.
  if (n >= 8) {
    const hasSeededClues = records.some(r => (r.seededClueIds?.length ?? 0) > 0);
    const hasClockRaised = records.some(r => r.clockRaised);
    if (hasSeededClues && hasClockRaised) {
      const hasConvergence = records.some(r =>
        (r.seededClueIds?.length ?? 0) > 0 && r.clockRaised,
      );
      if (!hasConvergence) {
        issues.push({
          location: 'Plot intention layer',
          rule: 'INTENTION_CONVERGENCE_ABSENT',
          description: 'The story seeds clues and raises a deadline but no scene combines both — proactive intention and external urgency never meet in the same beat. The story lacks the convergence moment where a character\'s plan collides with an unavoidable deadline.',
          severity: 'major',
          suggestedFix: 'Design a scene where the protagonist plants a trap, seeds a clue, or commits to a plan while simultaneously under active deadline pressure. This convergence creates the "point of no return" that defines dramatic peaks.',
        });
      }
    }
  }

  // ENTROPY_CLIFF: Three or more consecutive high-entropy scenes (entropy > 2.0)
  // are immediately followed by two consecutive zero-entropy scenes (entropy < 0.5).
  // The story hits a cliff — maximum intensity with no transitional de-escalation.
  // A proper denouement should descend gradually through a reckoning or aftershock;
  // a cliff drops the audience without the emotional processing that makes the peak
  // feel earned. Distinct from ENTROPY_SPIKE_MISPLACED (peak placement) — this
  // catches a sudden collapse anywhere in the story.
  if (n >= 8) {
    let highRun = 0;
    let highStart = -1;
    for (let i = 0; i < records.length; i++) {
      const e = w188Entropy(records[i]);
      if (e > 2.0) {
        if (highRun === 0) highStart = i;
        highRun++;
      } else {
        if (highRun >= 3 && e < 0.5 && i + 1 < records.length) {
          const nextE = w188Entropy(records[i + 1]);
          if (nextE < 0.5) {
            issues.push({
              location: `Scenes ${highStart}–${i + 1}`,
              rule: 'ENTROPY_CLIFF',
              description: `${highRun} high-momentum scenes (Scenes ${highStart}–${i - 1}, entropy > 2.0) are followed by an immediate dead drop (Scenes ${i}–${i + 1}, entropy < 0.5) — the story loses all narrative momentum in two steps instead of de-escalating through a measured denouement.`,
              severity: 'minor',
              suggestedFix: 'Add 1-2 transitional scenes between the peak and the quiet ending: show the aftershock, the reckoning, or the changed world before the narrative fully relaxes. The audience needs to process the climax before the story goes quiet.',
            });
            break;
          }
        }
        highRun = 0;
      }
    }
  }

  // ── Wave 205: Proactive opening absent, agency frontloaded, stakes never personal ──

  // PROACTIVE_OPENING_ABSENT: Across the entire first quarter (Act 1) the
  // protagonist initiates nothing — no clock raised, no clue planted. The story
  // opens with a passive protagonist; the inciting situation is something that
  // happens to them rather than something they set in motion. Distinct from
  // PASSIVE_ACT3_INTENTION (final act) and PROTAGONIST_REACTIVE_DOMINANCE (Act 2,
  // requires sustained high-stakes pressure). Requires 8+ scenes.
  if (n >= 8) {
    const act1End205 = Math.floor(n * 0.25);
    const act1Recs205 = records.slice(0, act1End205);
    if (act1Recs205.length >= 2) {
      const act1Proactive205 = act1Recs205.filter(
        r => r.clockRaised || (r.seededClueIds?.length ?? 0) > 0,
      ).length;
      if (act1Proactive205 === 0) {
        issues.push({
          location: `Act 1 (Scenes 0–${act1End205 - 1})`,
          rule: 'PROACTIVE_OPENING_ABSENT',
          severity: 'major',
          description: `Across all ${act1Recs205.length} Act 1 scenes the protagonist initiates no action — no clock raised, no clue planted. The story opens with a passive protagonist; the inciting situation happens to them rather than being set in motion by their own choice.`,
          suggestedFix: 'Give the protagonist at least one proactive beat in Act 1: a decision, a plan begun, a question they choose to chase. The audience must see the protagonist want something and move toward it before the world complicates that want.',
        });
      }
    }
  }

  // AGENCY_FRONTLOADED: The protagonist takes proactive action in the first half
  // (2+ proactive scenes) but goes entirely passive across the whole second half
  // — no clock raised, no clue planted from the midpoint onward. Their initiative
  // burns out exactly when the story should be accelerating toward the climax.
  // Distinct from PASSIVE_ACT3_INTENTION (final 25% only). Requires 8+ scenes.
  if (n >= 8) {
    const half205 = Math.floor(n * 0.5);
    let firstHalfProactive205 = 0;
    let secondHalfProactive205 = 0;
    for (let i = 0; i < n; i++) {
      const isPro205 = records[i].clockRaised || (records[i].seededClueIds?.length ?? 0) > 0;
      if (isPro205) {
        if (i < half205) firstHalfProactive205++;
        else secondHalfProactive205++;
      }
    }
    if (firstHalfProactive205 >= 2 && secondHalfProactive205 === 0) {
      issues.push({
        location: `Second half (Scenes ${half205}–${n - 1})`,
        rule: 'AGENCY_FRONTLOADED',
        severity: 'minor',
        description: `The protagonist initiates ${firstHalfProactive205} proactive beats in the first half but none in the second half — their agency burns out at the midpoint, exactly when the story should be accelerating toward the climax.`,
        suggestedFix: 'Redistribute the protagonist\'s initiative: hold back at least one proactive beat for the back half. The drive toward the goal should intensify after the midpoint, not evaporate.',
      });
    }
  }

  // STAKES_NEVER_PERSONAL: The story raises an external clock (a deadline,
  // ticking pressure) but no scene ever pairs that pressure with an emotional or
  // relationship shift — the stakes stay purely mechanical and never become
  // personal. A deadline only matters dramatically when it threatens something
  // the protagonist feels or someone they care about. Distinct from
  // INTENTION_CONVERGENCE_ABSENT (clock + planted clue). Requires 6+ scenes.
  if (n >= 6) {
    const hasClock205 = records.some(r => r.clockRaised);
    if (hasClock205) {
      const hasPersonalStakes205 = records.some(
        r => r.clockRaised && (r.emotionalShift !== 'neutral' || (r.relationshipShifts?.length ?? 0) > 0),
      );
      if (!hasPersonalStakes205) {
        issues.push({
          location: 'Stakes layer',
          rule: 'STAKES_NEVER_PERSONAL',
          severity: 'minor',
          description: 'The story raises an external clock but no scene ever pairs that deadline with an emotional or relationship shift — the stakes stay purely mechanical. A ticking clock only matters dramatically when it threatens something the protagonist feels or someone they love.',
          suggestedFix: 'Tie the deadline to a personal cost: in at least one clock-raising scene, show what the protagonist stands to lose emotionally or relationally if the clock runs out. External pressure becomes dramatic only when it endangers something internal.',
        });
      }
    }
  }

  // ── Wave 216: Agency physics — distribution entropy, effort↔consequence coupling,
  //    commitment density ramp. These treat intention as a measurable quantity with a
  //    distribution, a causal yield, and a trajectory rather than a per-scene flag. ──

  // AGENCY_ENTROPY_COLLAPSE (major): the normalised Shannon entropy of intention-bearing
  // dialogue (who is given tracked beliefs/goals, drawn from dialogueHighlights) falls
  // below 0.5. A single character carries almost all of the story's legible intention
  // while everyone else is a prop with no inner agenda. Distinct from the dialogue pass's
  // SPEAKER_MONOPOLY (raw fountain line count) — this measures concentration of AGENCY,
  // not of word count.
  {
    const intentCounts216 = new Map<string, number>();
    let totalHL216 = 0;
    for (const r of records) {
      for (const d of (r.dialogueHighlights ?? [])) {
        const m216 = d.match(/^(\w+):/);
        if (m216) {
          const c216 = m216[1].toLowerCase();
          intentCounts216.set(c216, (intentCounts216.get(c216) ?? 0) + 1);
          totalHL216++;
        }
      }
    }
    if (intentCounts216.size >= 2 && totalHL216 >= 8) {
      let entropy216 = 0;
      for (const cnt of intentCounts216.values()) {
        const p216 = cnt / totalHL216;
        entropy216 -= p216 * Math.log2(p216);
      }
      const normEntropy216 = entropy216 / Math.log2(intentCounts216.size);
      if (normEntropy216 < 0.5) {
        const dominant216 = [...intentCounts216.entries()].sort((a, b) => b[1] - a[1])[0];
        issues.push({
          location: 'Intention distribution',
          rule: 'AGENCY_ENTROPY_COLLAPSE',
          severity: 'major',
          description: `Intention is concentrated in one character: ${dominant216[0].toUpperCase()} carries ${dominant216[1]} of ${totalHL216} intention-bearing lines (normalised agency entropy ${normEntropy216.toFixed(2)}). The rest of the cast has no legible agenda — they are reactive furniture around a single willing agent.`,
          suggestedFix: 'Give at least one other character a tracked want that competes with the protagonist\'s: a belief they act on, a goal they pursue on-screen. Drama is the collision of intentions; with only one agent there is nothing to collide.',
        });
      }
    }
  }

  // AGENCY_WITHOUT_CONSEQUENCE (major): the protagonist is proactive in 3+ scenes
  // (raises a clock or plants a clue) but 75%+ of those efforts are inert — the seeded
  // clue is never paid off AND the next two scenes register no suspense rise, no
  // relationship shift, and no revelation. Proactivity that the story never answers is
  // busy-work; agency only reads as agency when the world visibly responds to it.
  if (n >= 6) {
    const proactiveIdx216: number[] = [];
    for (let i = 0; i < n; i++) {
      if (records[i].clockRaised || (records[i].seededClueIds?.length ?? 0) > 0) proactiveIdx216.push(i);
    }
    if (proactiveIdx216.length >= 3) {
      const allPayoffs216 = new Set<string>();
      for (const r of records) for (const p of (r.payoffSetupIds ?? [])) allPayoffs216.add(p);
      let inert216 = 0;
      for (const i of proactiveIdx216) {
        const seedPaidOff216 = (records[i].seededClueIds ?? []).some(s => allPayoffs216.has(s));
        const window216 = records.slice(i + 1, i + 3);
        const downstream216 = window216.some(r =>
          r.suspenseDelta > 1 || (r.relationshipShifts?.length ?? 0) > 0 || r.revelation !== null,
        );
        if (!seedPaidOff216 && !downstream216) inert216++;
      }
      const inertRatio216 = inert216 / proactiveIdx216.length;
      if (inertRatio216 >= 0.75) {
        issues.push({
          location: 'Agency layer',
          rule: 'AGENCY_WITHOUT_CONSEQUENCE',
          severity: 'major',
          description: `${inert216} of ${proactiveIdx216.length} proactive beats produce no consequence — the protagonist raises clocks and plants clues, but those efforts are never paid off and the scenes that follow register no suspense, no relationship change, and no revelation. The protagonist acts into a vacuum.`,
          suggestedFix: 'Make each proactive beat land: pay off the planted clue later, or let the very next scenes show the world reacting — a rise in pressure, a relationship altered, a truth surfaced. Agency without consequence is indistinguishable from inertia.',
        });
      }
    }
  }

  // COMMITMENT_RAMP_INVERSION (major): proactive density in the final third is positive
  // but less than half the proactive density of the opening third — the protagonist's
  // initiative is measurably decaying as the climax approaches. Distinct from
  // AGENCY_FRONTLOADED (which requires the back half to be exactly zero); this catches a
  // declining commitment ramp even while the protagonist is still nominally active.
  if (n >= 9) {
    const third216 = Math.floor(n / 3);
    const proDensity216 = (recs: PassInput['records']) =>
      recs.filter(r => r.clockRaised || (r.seededClueIds?.length ?? 0) > 0).length / recs.length;
    const firstDensity216 = proDensity216(records.slice(0, third216));
    const lastDensity216 = proDensity216(records.slice(n - third216));
    if (firstDensity216 > 0 && lastDensity216 > 0 && lastDensity216 < 0.5 * firstDensity216) {
      issues.push({
        location: `Commitment ramp (opening third vs final third)`,
        rule: 'COMMITMENT_RAMP_INVERSION',
        severity: 'major',
        description: `Proactive density falls from ${(firstDensity216 * 100).toFixed(0)}% of opening-third scenes to ${(lastDensity216 * 100).toFixed(0)}% of final-third scenes — the protagonist's initiative is decaying toward the climax instead of intensifying. The commitment ramp runs backwards.`,
        suggestedFix: 'The drive toward the goal should escalate, not fade: load more proactive beats into the final third than the opening. As the stakes peak, the protagonist must be pushing hardest, not coasting on early momentum.',
      });
    }
  }

  const { revised, usedLLM } = await rewritePass({ fountain, issues, passName: 'intention', approvedSpans, storyContext: input.storyContext, priorPassResults: input.priorPassResults });
  const changed = revised !== fountain;

  return {
    pass: 'intention',
    issues,
    revisedFountain: revised,
    changed,
    summary: issues.length === 0
      ? 'Intention pass: character intentions are legible'
      : `Intention pass: ${issues.length} issue(s) — ${usedLLM ? 'rewritten' : 'flagged (stub mode)'}`,
  };
}
