// Wave 39 — Pass 3: Intention
// Checks character intention clarity: characters acting without readable goals,
// want/fear asymmetry, unmotivated entrances.
// Wave 142 additions: scene entropy detection (scenes that don't advance plot,
// character development, or theme; scenes with zero narrative momentum).
// Wave 156 additions: protagonist reactive dominance (protagonist is purely reactive
// in Act 2 with no initiation), intention dropout (character introduced in Act 1
// dialogue vanishes from second half), want/fear collision absent (no scene shows
// the protagonist gaining something while losing a relationship, or vice versa).
// Wave 258 additions: proactive midpoint void (initiative dead at the pivot),
// proactive desert run (4+ passive scenes in an active story), revelation without
// proactive (discoveries unearned by the protagonist's initiative).
// Wave 272 additions: proactive Act 2a void (25-50% zone initiative-free),
// proactive late surge (passive first half, burst in second half),
// payoff without effort (callbacks not preceded by protagonist action).
// Wave 286 additions: reactive climax (climax scene has no proactive markers),
// seed graveyard (seeded clues with no payoffs in second half),
// purpose monotone (>70% of scenes share the same purpose).

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

  // ── Wave 230: Secondary intention vacuum, proactive overclustering, reactive goal adoption ──

  // SECONDARY_INTENTION_VACUUM (minor, n≥8): The story has ≥3 proactive acts
  // (clock raised or clue planted) but ALL tracked intentions collapse to a single
  // character — every dialogue highlight belongs to one speaker. The protagonist's
  // agency exists in a social vacuum where no other character is demonstrably
  // pursuing anything. Complements AGENCY_ENTROPY_COLLAPSE (which requires ≥2
  // distinct speakers to even compute entropy); this catches the extreme collapse
  // where the secondary cast has zero legible goal-bearing dialogue.
  if (n >= 8) {
    const proactiveCount230 = records.filter(
      r => r.clockRaised || (r.seededClueIds?.length ?? 0) > 0,
    ).length;
    if (proactiveCount230 >= 3) {
      const charIds230 = new Set<string>();
      let totalHL230 = 0;
      for (const r of records) {
        for (const d of (r.dialogueHighlights ?? [])) {
          const m = d.match(/^(\w+):/);
          if (m) {
            charIds230.add(m[1]);
            totalHL230++;
          }
        }
      }
      if (totalHL230 >= 4 && charIds230.size === 1) {
        const [onlyChar230] = charIds230;
        issues.push({
          location: 'Intention distribution',
          rule: 'SECONDARY_INTENTION_VACUUM',
          severity: 'minor',
          description: `All ${totalHL230} intention-bearing dialogue highlights belong to a single character (${onlyChar230.toUpperCase()}) — the rest of the cast has no tracked goals or beliefs. The protagonist's agency exists in a social vacuum where no other character is demonstrably pursuing anything.`,
          suggestedFix: 'Give at least one secondary character a legible intention: a belief they act on, a goal that competes with or complements the protagonist\'s. Drama is the collision of visible desires — a cast of props around one willing agent flattens the conflict field.',
        });
      }
    }
  }

  // PROACTIVE_OVERCLUSTERING (minor, n≥10): The protagonist's proactive acts (≥3)
  // are all clustered within a tight zone spanning ≤20% of the story, while ≥50%
  // of scenes are passive. All initiative arrives in one burst — the protagonist is
  // active for one chapter and passive for everything else before and after it.
  if (n >= 10) {
    const proactiveIdxs230: number[] = [];
    for (let i = 0; i < n; i++) {
      if (records[i].clockRaised || (records[i].seededClueIds?.length ?? 0) > 0) {
        proactiveIdxs230.push(i);
      }
    }
    if (proactiveIdxs230.length >= 3) {
      const firstPro230 = proactiveIdxs230[0];
      const lastPro230 = proactiveIdxs230[proactiveIdxs230.length - 1];
      const span230 = lastPro230 - firstPro230;
      const passiveScenes230 = n - proactiveIdxs230.length;
      if (span230 <= Math.floor(n * 0.2) && passiveScenes230 / n >= 0.5) {
        issues.push({
          location: `Proactive cluster (Scenes ${firstPro230}–${lastPro230})`,
          rule: 'PROACTIVE_OVERCLUSTERING',
          severity: 'minor',
          description: `All ${proactiveIdxs230.length} proactive scenes are clustered within a ${span230}-scene span (Scenes ${firstPro230}–${lastPro230}, ≤20% of the story). The protagonist's initiative arrives in one burst and is absent for the rest of the arc — initiative must be threaded throughout, not discharged all at once.`,
          suggestedFix: 'Redistribute proactive beats across the full arc: move some earlier to establish agency from the outset, and reserve at least one for the final act to drive the climax. The protagonist must be continuously willing, not intermittently active.',
        });
      }
    }
  }

  // REACTIVE_GOAL_ADOPTION (minor, n≥6): All proactive acts (≥2) are immediately
  // preceded by or coincident with a negative trigger — a reversal (suspenseDelta < -1)
  // in the prior scene, or a negative emotional shift in the same or prior scene.
  // The protagonist only acts when forced by adversity; they never initiate from
  // autonomous desire. True protagonism requires at least one proactive beat born
  // from internal want, not external push.
  if (n >= 6) {
    const proactiveItems230: number[] = [];
    for (let i = 0; i < n; i++) {
      if (records[i].clockRaised || (records[i].seededClueIds?.length ?? 0) > 0) {
        proactiveItems230.push(i);
      }
    }
    if (proactiveItems230.length >= 2) {
      const allReactive230 = proactiveItems230.every(idx => {
        const selfNeg230 = records[idx].emotionalShift === 'negative';
        const priorReversal230 = idx > 0 && records[idx - 1].suspenseDelta < -1;
        const priorNeg230 = idx > 0 && records[idx - 1].emotionalShift === 'negative';
        return selfNeg230 || priorReversal230 || priorNeg230;
      });
      if (allReactive230) {
        issues.push({
          location: 'Intention layer — protagonist drive',
          rule: 'REACTIVE_GOAL_ADOPTION',
          severity: 'minor',
          description: `All ${proactiveItems230.length} proactive acts follow immediately after a negative trigger (reversal or negative emotional beat) — the protagonist only acts when forced by adversity, never from autonomous desire. True protagonism requires at least one proactive move born from internal want.`,
          suggestedFix: 'Add at least one proactive scene where the protagonist initiates from their own desire rather than in response to a setback — a choice made from hope, curiosity, or ambition. Reactive protagonism reduces the character to a rubber ball: the story bounces them rather than watching them run.',
        });
      }
    }
  }
  // ── Wave 244: Proactive Act 3 void, intention discovery absent, goal pivot absent ──

  // PROACTIVE_ACT3_VOID (minor, n≥8): Act 3 (last 25%) contains zero proactive
  // acts — no clockRaised, no seededClueIds. The protagonist stops driving in the
  // final act: they react to the climax rather than engineering it. A passive Act 3
  // protagonist is a passenger in their own resolution. Distinct from
  // PROACTIVE_OVERCLUSTERING (which fires when all acts cluster in a burst): this
  // fires specifically when the final act is initiative-free.
  if (n >= 8) {
    const act3Start244 = Math.floor(n * 0.75);
    const act3Records244 = records.slice(act3Start244);
    if (act3Records244.length >= 2) {
      const hasAct3Proactive244 = act3Records244.some(r =>
        r.clockRaised || (r.seededClueIds?.length ?? 0) > 0,
      );
      if (!hasAct3Proactive244) {
        issues.push({
          location: `Act 3 (Scenes ${act3Start244}–${n - 1})`,
          rule: 'PROACTIVE_ACT3_VOID',
          severity: 'minor',
          description: `Act 3 (scenes ${act3Start244}–${n - 1}, ${act3Records244.length} scenes) contains no proactive acts — no clocks raised, no clues planted. The protagonist stops initiating in the final act, reacting to a climax rather than engineering one.`,
          suggestedFix: "Give the protagonist at least one proactive move in Act 3: a decisive action, a gambit, or a piece of evidence planted. The climax should feel like the culmination of the protagonist's agency — a choice they made, not a situation they endured.",
        });
      }
    }
  }

  // INTENTION_DISCOVERY_ABSENT (minor, n≥8, ≥3 proactive acts): The story has
  // ≥3 proactive acts (protagonist drives events) but no revelation occurs in
  // Act 3 (last 25%). The protagonist's goal-pursuit never produces a discovery
  // in the climax zone — they chase without finding. A story where all discoveries
  // land before the climax means the protagonist enters Act 3 with complete
  // information, reducing the resolution to execution rather than revelation.
  if (n >= 8) {
    const proactiveCount244 = records.filter(r =>
      r.clockRaised || (r.seededClueIds?.length ?? 0) > 0,
    ).length;
    if (proactiveCount244 >= 3) {
      const act3Start244b = Math.floor(n * 0.75);
      const hasAct3Rev244 = records.slice(act3Start244b).some(r => r.revelation !== null);
      if (!hasAct3Rev244) {
        issues.push({
          location: `Act 3 (Scenes ${act3Start244b}–${n - 1}) — discovery layer`,
          rule: 'INTENTION_DISCOVERY_ABSENT',
          severity: 'minor',
          description: `The story has ${proactiveCount244} proactive acts but no revelation lands in Act 3 (Scenes ${act3Start244b}–${n - 1}) — the protagonist's goal-pursuit produces no discovery in the climax zone. All discoveries precede the resolution; Act 3 is execution without revelation.`,
          suggestedFix: "Engineer at least one discovery in Act 3: a truth the protagonist's pursuit finally uncovers, a consequence of their initiative that transforms the climax. The resolution should be earned by discovery, not just by effort.",
        });
      }
    }
  }

  // GOAL_PIVOT_ABSENT (minor, n≥10, ≥4 proactive acts): The story has ≥4
  // proactive acts but ALL of them are the same type — either all clockRaised
  // (no clue-planting) or all seededClueIds (no clock-raising). The protagonist's
  // goal-pursuit strategy never adapts — they use only one tool throughout.
  // An agent who never changes strategy in the face of failure is inflexible rather
  // than determined. Requires both signals to be present in the records array.
  if (n >= 10) {
    const proactiveActs244 = records.filter(r =>
      r.clockRaised || (r.seededClueIds?.length ?? 0) > 0,
    );
    if (proactiveActs244.length >= 4) {
      const hasClockAct244 = proactiveActs244.some(r => r.clockRaised === true);
      const hasClueAct244 = proactiveActs244.some(r => (r.seededClueIds?.length ?? 0) > 0);
      if (!hasClockAct244 || !hasClueAct244) {
        const onlyType244 = !hasClockAct244 ? 'clue-planting' : 'clock-raising';
        issues.push({
          location: 'Intention strategy layer',
          rule: 'GOAL_PIVOT_ABSENT',
          severity: 'minor',
          description: `All ${proactiveActs244.length} proactive acts use only ${onlyType244} — the protagonist's strategy never adapts. An agent who pursues goals with only one modality is predictable; genuine goal-pursuit requires adapting method when the situation changes.`,
          suggestedFix: `Introduce at least one proactive act using the other strategy: if the protagonist only raises clocks, give them a scene where they plant a clue or gather evidence; if they only plant clues, give them a scene where they escalate a deadline. Strategy variety reveals tactical intelligence.`,
        });
      }
    }
  }
  // ── End Wave 244 ─────────────────────────────────────────────────────────────

  // ── End Wave 230 ─────────────────────────────────────────────────────────────

  // ── Wave 258: Proactive midpoint void, proactive desert run, revelation without proactive ──

  // A proactive act = the protagonist initiates: a clock raised or a clue planted.
  // Shared by the three Wave 258 checks.
  const isProactive258 = (r: any): boolean =>
    r.clockRaised === true || (r.seededClueIds?.length ?? 0) > 0;

  // PROACTIVE_MIDPOINT_VOID (minor, n≥10): The midpoint zone (40%–60%) contains
  // no proactive act, while the protagonist does initiate elsewhere. Initiative
  // collapses precisely at the structural pivot — the moment the protagonist's
  // goal should transform and their drive intensify. Distinct from PROACTIVE_
  // OPENING_ABSENT (Act 1), AGENCY_FRONTLOADED (whole second half), and PROACTIVE_
  // ACT3_VOID (Act 3); this isolates a dead spot at the fulcrum.
  if (n >= 10) {
    const midStart258 = Math.floor(n * 0.4);
    const midEnd258 = Math.floor(n * 0.6);
    const midRecs258 = records.slice(midStart258, midEnd258);
    if (midRecs258.length >= 2) {
      const midProactive258 = midRecs258.some(isProactive258);
      const outsideProactive258 =
        records.slice(0, midStart258).some(isProactive258) ||
        records.slice(midEnd258).some(isProactive258);
      if (!midProactive258 && outsideProactive258) {
        issues.push({
          location: `Midpoint zone (Scenes ${midStart258}–${midEnd258 - 1})`,
          rule: 'PROACTIVE_MIDPOINT_VOID',
          severity: 'minor',
          description: `The midpoint zone (Scenes ${midStart258}–${midEnd258 - 1}) contains no proactive act — no clock raised, no clue planted — though the protagonist initiates elsewhere. Initiative collapses at the structural pivot, exactly where the protagonist's goal should transform and their drive intensify.`,
          suggestedFix: 'Give the protagonist a decisive proactive beat at the midpoint: a plan launched, a deadline set, a piece of evidence pursued. The midpoint is the gear-change — the protagonist should seize the wheel there, not drift through it.',
        });
      }
    }
  }

  // PROACTIVE_DESERT_RUN (minor, n≥8, ≥2 proactive acts total): A run of four or
  // more consecutive scenes in which the protagonist initiates nothing, inside a
  // story that is otherwise active. An extended passive stretch reads as the
  // protagonist surrendering the wheel: events happen around them while they wait.
  // Distinct from the zone-specific voids; this fires on any sustained run.
  if (n >= 8) {
    const totalProactive258 = records.filter(isProactive258).length;
    if (totalProactive258 >= 2) {
      let runStart258 = 0;
      let runLen258 = 0;
      for (let i = 0; i < n; i++) {
        if (!isProactive258(records[i])) {
          if (runLen258 === 0) runStart258 = i;
          runLen258++;
        } else {
          runLen258 = 0;
        }
        if (runLen258 >= 4) {
          issues.push({
            location: `Scenes ${runStart258}–${i}`,
            rule: 'PROACTIVE_DESERT_RUN',
            severity: 'minor',
            description: `Scenes ${runStart258}–${i} form a run of ${runLen258} consecutive scenes in which the protagonist initiates nothing — no clock raised, no clue planted — inside an otherwise active story. An extended passive stretch reads as the protagonist surrendering the wheel: events happen around them while they wait.`,
            suggestedFix: 'Break the passive run with at least one proactive beat: a choice that commits the protagonist to a course, a deadline they impose, a lead they decide to chase. A protagonist who goes four scenes without initiating becomes a spectator in their own story.',
          });
          break;
        }
      }
    }
  }

  // REVELATION_WITHOUT_PROACTIVE (minor, n≥8, ≥2 revelations): No witnessed
  // revelation is preceded by a proactive act within the two scenes before it
  // (inclusive of the revelation scene). Every discovery falls into the
  // protagonist's lap rather than being earned by their initiative — they learn
  // truths passively. Distinct from INTENTION_DISCOVERY_ABSENT (Act 3 revelation
  // presence); this couples discovery to effort across the whole story.
  if (n >= 8) {
    const revRecs258 = records
      .map((r: any, i: number) => ({ r, i }))
      .filter(({ r }: any) => r.revelation !== null);
    if (revRecs258.length >= 2) {
      const anyEarned258 = revRecs258.some(({ i }: any) => {
        for (let k = Math.max(0, i - 2); k <= i; k++) {
          if (isProactive258(records[k])) return true;
        }
        return false;
      });
      if (!anyEarned258) {
        issues.push({
          location: 'Discovery / initiative coupling',
          rule: 'REVELATION_WITHOUT_PROACTIVE',
          severity: 'minor',
          description: `None of the story's ${revRecs258.length} revelations is preceded by a proactive act within the two scenes before it — every discovery arrives without the protagonist's initiative driving it. The truths fall into their lap; they learn passively rather than uncovering anything through their own effort.`,
          suggestedFix: "Make at least one major discovery the consequence of the protagonist's action: a clue they chose to chase, a deadline that forced a confrontation, an investigation they launched. A revelation that the protagonist earned lands harder than one the plot simply hands them.",
        });
      }
    }
  }

  // ── Wave 272: PROACTIVE_ACT2A_VOID ────────────────────────────────────────
  // Act 2a (the 25-50% zone, where the protagonist first starts testing the
  // world after the inciting event) contains no proactive act — no clock
  // raised, no clue planted — while the protagonist does initiate elsewhere.
  // Act 2a is where first moves and early investigations belong; a passive Act
  // 2a protagonist drifts through the first complication zone without steering.
  // Distinct from PROACTIVE_OPENING_ABSENT (Act 1), PROACTIVE_MIDPOINT_VOID
  // (40-60% window), and PROACTIVE_ACT3_VOID (final 25%).
  // Requires 10+ records and 3+ total proactive acts.
  if (n >= 10) {
    const act2aStart272 = Math.floor(n * 0.25);
    const act2aEnd272 = Math.floor(n * 0.5);
    const totalProactive272 = records.filter(isProactive258).length;
    if (totalProactive272 >= 3) {
      const act2aProactive272 = records.slice(act2aStart272, act2aEnd272).filter(isProactive258).length;
      if (act2aProactive272 === 0) {
        issues.push({
          location: `Act 2a (Scenes ${act2aStart272}–${act2aEnd272 - 1})`,
          rule: 'PROACTIVE_ACT2A_VOID',
          severity: 'minor',
          description: `Act 2a (Scenes ${act2aStart272}–${act2aEnd272 - 1}) contains no proactive act — no clock raised, no clue planted — though the protagonist initiates elsewhere. Act 2a is where the protagonist should start testing and investigating; leaving this entire zone initiative-free means they drift through the first complication zone as a passenger.`,
          suggestedFix: 'Give the protagonist at least one proactive move in Act 2a: a lead they decide to chase, a deadline they impose, a gambit they launch. The first complication zone should open with the protagonist in motion — their earliest tests of the world establish the audience\'s sense that they can drive events.',
        });
      }
    }
  }

  // ── Wave 272: PROACTIVE_LATE_SURGE ────────────────────────────────────────
  // The protagonist is entirely passive in the first half of the story (no
  // proactive acts in scenes 0 to n/2-1) then suddenly launches 3 or more
  // proactive acts in the second half. The agency that should be established
  // from early scenes arrives as a late explosion — the protagonist is reactive
  // for the entire first half and then overactive in the second, with no
  // gradual development of drive. The mirror of AGENCY_FRONTLOADED.
  // Requires 8+ records.
  if (n >= 8) {
    const half272 = Math.floor(n * 0.5);
    const firstHalfPro272 = records.slice(0, half272).filter(isProactive258).length;
    const secondHalfPro272 = records.slice(half272).filter(isProactive258).length;
    if (firstHalfPro272 === 0 && secondHalfPro272 >= 3) {
      issues.push({
        location: `First half entirely passive (Scenes 0–${half272 - 1})`,
        rule: 'PROACTIVE_LATE_SURGE',
        severity: 'minor',
        description: `The protagonist initiates nothing in the first half (Scenes 0–${half272 - 1}) then launches ${secondHalfPro272} proactive acts in the second half. The agency that should be established gradually arrives as a sudden burst — the protagonist transforms from passive observer to hyperactive driver without buildup. A protagonist's drive should be visible from early scenes.`,
        suggestedFix: 'Move at least one proactive beat into the first half — even a small act of initiative (a question pursued, a decision made, a deadline set) establishes that the protagonist is a driver from the start. The second-half surge will feel earned when the audience has seen the protagonist act with intention throughout.',
      });
    }
  }

  // ── Wave 272: PAYOFF_WITHOUT_EFFORT ───────────────────────────────────────
  // Two or more scenes fire payoffs (payoffSetupIds not empty) but none of them
  // is preceded within the prior 3 scenes by a proactive act. Every callback
  // the story delivers arrives without the protagonist having worked for it —
  // they fire planted payoffs without having initiated the work that makes the
  // payoff feel earned. Distinct from REVELATION_WITHOUT_PROACTIVE (which
  // couples discovered truths to effort); this couples payoffs to initiative.
  // Requires 6+ records and 2+ payoff scenes.
  if (n >= 6) {
    const payoffRecs272 = records
      .map((r: any, i: number) => ({ r, i }))
      .filter(({ r }: any) => (r.payoffSetupIds?.length ?? 0) > 0);
    if (payoffRecs272.length >= 2) {
      const anyEarned272 = (payoffRecs272 as Array<{ r: any; i: number }>).some(({ i }) => {
        for (let k = Math.max(0, i - 3); k <= i; k++) {
          if (isProactive258(records[k])) return true;
        }
        return false;
      });
      if (!anyEarned272) {
        issues.push({
          location: 'Payoff / effort coupling',
          rule: 'PAYOFF_WITHOUT_EFFORT',
          severity: 'minor',
          description: `${payoffRecs272.length} payoff scenes fire without any of them being preceded by a protagonist initiative within the prior 3 scenes — every callback arrives without the protagonist having worked for it. Payoffs feel earned when they follow visible effort; unearned callbacks read as coincidence rather than consequence.`,
          suggestedFix: 'Ensure at least one payoff scene is preceded (within 3 scenes) by a proactive act: a clue the protagonist planted, a clock they raised, a lead they pursued. A payoff earned by visible effort lands as satisfying resolution; a payoff that just happens reads as the plot solving itself.',
        });
      }
    }
  }

  // ── Wave 286: INTENTION_REACTIVE_CLIMAX ──────────────────────────────────
  // The climax zone (final 15% of scenes) contains no proactive acts, while
  // the protagonist was proactive at least twice earlier in the story. The
  // climax should be the story's most decisive moment — where the protagonist
  // acts rather than reacts. A passive climax squanders all the agency built
  // through the arc. Requires 6+ records and 2+ proactive scenes before the
  // climax zone.
  if (n >= 6) {
    const climaxStart286 = Math.max(n - Math.ceil(n * 0.15), n - 2);
    const preClimaxProactive286 = records.slice(0, climaxStart286).filter(isProactive258).length;
    if (preClimaxProactive286 >= 2) {
      const climaxProactive286 = records.slice(climaxStart286).filter(isProactive258).length;
      if (climaxProactive286 === 0) {
        issues.push({
          location: `Climax zone (scene ${climaxStart286}+) — no protagonist initiative`,
          rule: 'INTENTION_REACTIVE_CLIMAX',
          severity: 'minor',
          description: `The protagonist is proactive ${preClimaxProactive286} time(s) before the climax but takes no initiative in the final scenes (scene ${climaxStart286}+). The climax — where stakes peak — plays out as pure reaction. A passive climax undermines all the agency built through the arc: the protagonist is acted upon rather than acting.`,
          suggestedFix: 'Give the protagonist at least one decisive action in the climax: a final gambit, a clock they raise, a choice that changes everything. The climax should be the story\'s most compressed expression of what the protagonist wants and fears — it demands initiative, not passivity.',
        });
      }
    }
  }

  // ── Wave 286: INTENTION_SEED_GRAVEYARD ───────────────────────────────────
  // The story plants seeded clues in the first half but the second half
  // has no payoff scenes (payoffSetupIds empty for all scenes). Seeds are
  // promises the story makes to the audience; an unanswered promise is
  // a structural betrayal. Requires 8+ records, 3+ total seeded-clue scenes
  // in the first half, and 0 payoff scenes in the second half.
  if (n >= 8) {
    const half286 = Math.floor(n / 2);
    const firstHalfSeeds286 = records.slice(0, half286).filter((r: any) => (r.seededClueIds?.length ?? 0) > 0).length;
    if (firstHalfSeeds286 >= 3) {
      const secondHalfPayoffs286 = records.slice(half286).filter((r: any) => (r.payoffSetupIds?.length ?? 0) > 0).length;
      if (secondHalfPayoffs286 === 0) {
        issues.push({
          location: `Second half (scenes ${half286}+) — no payoffs`,
          rule: 'INTENTION_SEED_GRAVEYARD',
          severity: 'minor',
          description: `${firstHalfSeeds286} clue-seeding scene(s) appear in the first half but no payoff scene fires in the second half (scenes ${half286}+). Every seeded clue is a promise to the audience; leaving all of them unanswered by the story\'s midpoint and beyond signals the narrative has forgotten its own setup.`,
          suggestedFix: 'Return to the seeds planted in the first half and pay them off in the second half — ideally with a twist that recontextualizes what was seeded. The payoff does not need to be triumphant; even a tragic resolution of a seeded clue closes the loop. An unresolved seed is a dangling thread.',
        });
      }
    }
  }

  // ── Wave 286: INTENTION_PURPOSE_MONOTONE ─────────────────────────────────
  // More than 70% of all scenes share the same purpose value. Purpose
  // monotony means every scene serves the same structural function —
  // the story is all development, or all raising stakes, with no variation.
  // A well-structured story mixes purposes: initiating, development,
  // revelation, climax, transitional. Monotony collapses the structural
  // arc into a single repeating beat. Requires 8+ records.
  if (n >= 8) {
    const purposeCounts286 = new Map<string, number>();
    for (const r of records as any[]) {
      const p286 = r.purpose ?? 'development';
      purposeCounts286.set(p286, (purposeCounts286.get(p286) ?? 0) + 1);
    }
    const maxPurposeCount286 = Math.max(...purposeCounts286.values());
    if (maxPurposeCount286 / n > 0.70) {
      const dominantPurpose286 = [...purposeCounts286.entries()].sort((a, b) => b[1] - a[1])[0][0];
      issues.push({
        location: 'Scene purposes throughout',
        rule: 'INTENTION_PURPOSE_MONOTONE',
        severity: 'minor',
        description: `${maxPurposeCount286} of ${n} scenes (${Math.round(maxPurposeCount286 / n * 100)}%) share the same purpose ("${dominantPurpose286}"). Purpose monotony signals structural flatness — the story repeats a single function rather than mixing development, revelation, climax, and transition into a varied arc.`,
        suggestedFix: `Diversify scene purposes: ensure at least one scene each of revelation, climax, and transition alongside the development scenes. A scene tagged "${dominantPurpose286}" should be surrounded by scenes with different purposes to create structural rhythm and signal to the audience that the story is moving forward.`,
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
