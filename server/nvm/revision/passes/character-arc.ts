// Wave 138 — Pass 6: Character Arc
// Checks arc completion: characters who start and end in the same emotional
// state, arcs without turning point, transformation without cause.
// Wave 138 additions: per-character relational arc tracking using relationship
// shift data — detects characters present throughout the story who have zero
// relational movement (CHARACTER_ARC_RELATIONAL_STASIS) and identifies when
// the protagonist has no relationship arc despite being present everywhere
// (CHARACTER_ARC_PROTAGONIST_PASSIVE).
// Wave 153 additions: arc monotone (emotional state never varies mid-story),
// late introduction (major character first appears past the midpoint), and
// emotional whiplash (rapid alternating emotional shifts without grounding).
// Wave 256 additions: relational dimension monotony (all shifts on one axis),
// emotional flatline (≥80% neutral scenes), negative-only arc (no positive beat).

import type { PassInput, PassResult, RevisionIssue } from './types.ts';
import { rewritePass } from '../rewrite.ts';

export async function characterArcPass(input: PassInput): Promise<PassResult> {
  const { fountain, records, structure, annotations, approvedSpans } = input;
  const issues: RevisionIssue[] = [];

  if (records.length < 3) {
    return {
      pass: 'character-arc',
      issues: [],
      revisedFountain: fountain,
      changed: false,
      summary: 'Character-arc pass: too few scenes to evaluate',
    };
  }

  // ── Compute emotional journey per "character zone" ────────────────────────
  // We proxy character arcs through the records' emotionalShift field
  const firstThird = records.slice(0, Math.floor(records.length / 3));
  const lastThird = records.slice(Math.floor(records.length * 2 / 3));

  const firstShift = dominantShift(firstThird);
  const lastShift = dominantShift(lastThird);

  if (firstShift !== 'neutral' && lastShift !== 'neutral' && firstShift === lastShift) {
    issues.push({
      location: 'Overall character arc',
      rule: 'FLAT_CHARACTER_ARC',
      description: `Story opens and closes with the same dominant emotional tone (${firstShift}) — no character transformation is registered`,
      severity: 'major',
      suggestedFix: 'Add a turning-point scene in Act 2b where the protagonist\'s emotional orientation shifts',
    });
  }

  // ── Transformation without a causal scene ────────────────────────────────
  if (firstShift !== lastShift && firstShift !== 'neutral' && lastShift !== 'neutral') {
    // Good — there's a shift. Check it's not abrupt (no scene with revelation/turn in between).
    // NOTE: `dramaticTurn` is a freeform string that never equals 'none' — check `purpose` instead.
    const dramaticPurposes = new Set(['revelation', 'turning_point', 'climax', 'raise_stakes', 'complicate']);
    const middleRecords = records.slice(Math.floor(records.length / 3), Math.floor(records.length * 2 / 3));
    const hasTransformationCause = middleRecords.some(r => r.revelation !== null || dramaticPurposes.has(r.purpose));
    if (!hasTransformationCause && middleRecords.length >= 1) {
      issues.push({
        location: 'Mid-story character arc',
        rule: 'UNMOTIVATED_TRANSFORMATION',
        description: 'The character\'s emotional arc shifts from beginning to end but no mid-story scene clearly causes the change',
        severity: 'major',
        suggestedFix: 'Add a pivotal scene where the character confronts something that forces an internal shift',
      });
    }
  }

  // ── No revelation scenes in a complete story ──────────────────────────────
  if (structure.revelationCount === 0 && structure.completionPercent >= 70) {
    issues.push({
      location: 'Character arc — revelations',
      rule: 'NO_REVELATIONS',
      description: 'A near-complete story with no revelation scenes: character arcs cannot be witnessed, only told',
      severity: 'critical',
      suggestedFix: 'Add at least one scene where a character directly witnesses something that changes their worldview',
    });
  }

  // ── Approaching climax without emotional peak ─────────────────────────────
  if (structure.approachingClimax && records.length >= 4) {
    const lastFour = records.slice(-4);
    const hasEmotionalPeak = lastFour.some(r => r.emotionalShift !== 'neutral');
    if (!hasEmotionalPeak) {
      issues.push({
        location: 'Pre-climax character arc',
        rule: 'CLIMAX_EMOTIONALLY_FLAT',
        description: 'The climax approach is emotionally flat — the audience is not invested in the character\'s outcome',
        severity: 'major',
        suggestedFix: 'Add a moment of personal cost or sacrifice that makes the climax emotionally resonant',
      });
    }
  }

  // ── Per-character relational arc (Wave 138) ────────────────────────────────
  // Characters who appear prominently in the story but whose relationships never
  // shift have no arc — they are narrative furniture, not dramatic agents.
  // We count fountain character-cue appearances as a proxy for character prominence,
  // then check whether each character appears in any relationshipShifts pairKey.
  if (records.length >= 5) {
    // Build character appearance count from fountain (ALL-CAPS character cues)
    const fountainCueCounts = new Map<string, number>();
    for (const line of fountain.split('\n')) {
      const t = line.trim();
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}$/.test(t) &&
          !/^(INT\.|EXT\.|CUT TO|FADE|SMASH|THE END|ACT|MIDPOINT|SCENE)/i.test(t)) {
        const charName = t.replace(/\s*\(.*?\)\s*$/, '').toLowerCase().trim();
        if (charName !== 'narrator' && charName !== 'v.o.' && charName !== 'o.s.') {
          fountainCueCounts.set(charName, (fountainCueCounts.get(charName) ?? 0) + 1);
        }
      }
    }

    // Build set of characters who have at least one relationship shift in the records
    const charsWithRelArc = new Set<string>();
    for (const r of records) {
      for (const shift of r.relationshipShifts ?? []) {
        for (const charId of shift.pairKey.split('|')) {
          charsWithRelArc.add(charId.toLowerCase());
        }
      }
    }

    // Major characters: appear in ≥4 fountain cues (substantial scene presence)
    const majorFountainChars = [...fountainCueCounts.entries()]
      .filter(([, count]) => count >= 4)
      .sort((a, b) => b[1] - a[1]);

    if (majorFountainChars.length >= 2 && charsWithRelArc.size > 0) {
      // CHARACTER_ARC_PROTAGONIST_PASSIVE: the character with the most cues (protagonist
      // proxy) has no relationship arc at all — they drive scenes but nothing changes
      // between them and anyone else
      const [protagonistId, protagonistCues] = majorFountainChars[0];
      if (!charsWithRelArc.has(protagonistId) && protagonistCues >= 6) {
        const displayName = protagonistId.replace(/_/g, ' ').toUpperCase();
        issues.push({
          location: `Character: ${displayName}`,
          rule: 'CHARACTER_ARC_PROTAGONIST_PASSIVE',
          description:
            `${displayName} appears in ${protagonistCues} scenes (most of any character) ` +
            `but is never part of a relationship shift — the protagonist has no relational arc`,
          severity: 'major',
          suggestedFix:
            `The protagonist must have at least one relationship that fundamentally changes. ` +
            `Add a SHIFT_RELATIONSHIP op involving ${displayName} in a pivotal scene.`,
        });
      }

      // CHARACTER_ARC_RELATIONAL_STASIS: a secondary major character who appears
      // throughout but whose dynamic with everyone else never moves at all
      const inertChars = majorFountainChars.filter(
        ([id, count]) => count >= 4 && !charsWithRelArc.has(id),
      );
      if (inertChars.length > 0 && !issues.some(i => i.rule === 'CHARACTER_ARC_PROTAGONIST_PASSIVE')) {
        // Report only the most prominent inert character to avoid noise
        const [inertId, inertCues] = inertChars[0];
        const displayName = inertId.replace(/_/g, ' ').toUpperCase();
        issues.push({
          location: `Character: ${displayName}`,
          rule: 'CHARACTER_ARC_RELATIONAL_STASIS',
          description:
            `${displayName} appears in ${inertCues} scenes but their relationships never shift — ` +
            `they are a narrative fixture, not an agent in the story`,
          severity: 'minor',
          suggestedFix:
            `Give ${displayName} at least one relationship that moves: trust gained or lost, ` +
            `power reversed, alliance shifted. Static characters flatten the dramatic landscape.`,
        });
      }
    }
  }

  // ── Wave 153: Arc monotone, late introduction, emotional whiplash ───────────

  // ARC_EMOTIONAL_MONOTONE: Across the whole story, every scene carries the same
  // emotional shift (or all neutral). A character whose emotional register never
  // varies has no inner life — the arc is a flat line, not a journey.
  if (records.length >= 6) {
    const shiftCounts = new Map<string, number>();
    for (const r of records) {
      const s = r.emotionalShift ?? 'neutral';
      shiftCounts.set(s, (shiftCounts.get(s) ?? 0) + 1);
    }
    // Dominant shift covers ≥90% of scenes → monotone emotional landscape
    const dominantCount = Math.max(...shiftCounts.values());
    const dominantRatio = dominantCount / records.length;
    if (dominantRatio >= 0.9) {
      const dominant = [...shiftCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
      issues.push({
        location: 'Emotional landscape',
        rule: 'ARC_EMOTIONAL_MONOTONE',
        description: `${Math.round(dominantRatio * 100)}% of scenes carry the same emotional register (${dominant}) — the story has no emotional dynamics; every beat lands at the same pitch`,
        severity: 'major',
        suggestedFix: 'Vary the emotional register scene to scene: a moment of levity before tragedy, a flash of hope before despair. Contrast is what makes any single emotion land.',
      });
    }
  }

  // CHARACTER_LATE_INTRODUCTION: A major character (≥4 cues) whose first
  // appearance is past the story's midpoint. Introducing a significant player
  // late deprives the audience of the investment needed for them to matter.
  if (records.length >= 6) {
    // Track first scene index where each character cue appears
    const lines = fountain.split('\n');
    const lineToScene: number[] = [];
    let sceneIdx = -1;
    for (const line of lines) {
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(line.trim())) sceneIdx++;
      lineToScene.push(Math.max(0, sceneIdx));
    }

    const firstAppearance = new Map<string, number>();
    const cueCounts = new Map<string, number>();
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim();
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}$/.test(t) &&
          !/^(INT\.|EXT\.|CUT TO|FADE|SMASH|THE END|ACT|MIDPOINT|SCENE)/i.test(t)) {
        const charName = t.replace(/\s*\(.*?\)\s*$/, '').toLowerCase().trim();
        if (charName === 'narrator' || charName === 'v.o.' || charName === 'o.s.') continue;
        cueCounts.set(charName, (cueCounts.get(charName) ?? 0) + 1);
        if (!firstAppearance.has(charName)) {
          firstAppearance.set(charName, lineToScene[i]);
        }
      }
    }

    const midpoint = Math.floor(records.length / 2);
    for (const [charName, count] of cueCounts) {
      if (count >= 4) {
        const firstScene = firstAppearance.get(charName) ?? 0;
        if (firstScene > midpoint) {
          const displayName = charName.replace(/_/g, ' ').toUpperCase();
          issues.push({
            location: `Character: ${displayName}`,
            rule: 'CHARACTER_LATE_INTRODUCTION',
            description: `${displayName} is a major character (${count} scenes) but first appears at Scene ${firstScene}, past the midpoint (Scene ${midpoint}) — the audience has no time to invest in them before they matter`,
            severity: 'major',
            suggestedFix: `Introduce ${displayName} (or plant their existence) in the first half of the story so their later prominence feels earned, not arbitrary`,
          });
          break; // one flag per pass
        }
      }
    }
  }

  // EMOTIONAL_WHIPLASH: 4+ consecutive scenes that alternate emotional polarity
  // (positive→negative→positive→negative) with no neutral grounding between.
  // Rapid oscillation without settling feels manipulative rather than earned.
  if (records.length >= 4) {
    let alternations = 0;
    let whiplashStart = -1;
    for (let i = 1; i < records.length; i++) {
      const prev = records[i - 1].emotionalShift;
      const curr = records[i].emotionalShift;
      const isOpposite =
        (prev === 'positive' && curr === 'negative') ||
        (prev === 'negative' && curr === 'positive');
      if (isOpposite) {
        if (alternations === 0) whiplashStart = i - 1;
        alternations++;
        if (alternations === 3) {
          issues.push({
            location: `Scenes ${whiplashStart}–${i}`,
            rule: 'EMOTIONAL_WHIPLASH',
            description: `Scenes ${whiplashStart}–${i} alternate emotional polarity 3+ times with no neutral grounding (positive↔negative) — rapid oscillation feels manipulative rather than earned`,
            severity: 'minor',
            suggestedFix: 'Let one emotional state breathe across two scenes before flipping. Give the audience a moment to absorb a feeling before reversing it.',
          });
          alternations = 0; // reset to avoid duplicate flags
        }
      } else {
        alternations = 0;
      }
    }
  }

  // ── Wave 168: Relational symmetry, arc resolution, secondary character void ──

  // RELATIONAL_SYMMETRY_ABSENT: Every relationship shift in the story moves in the
  // same direction — all improving or all deteriorating. Real dramatic relationships
  // require both rise and fall to feel dynamic and three-dimensional.
  if (records.length >= 6) {
    const allAmounts: number[] = [];
    for (const r of records) {
      for (const shift of r.relationshipShifts ?? []) {
        allAmounts.push(shift.amount);
      }
    }
    if (allAmounts.length >= 4) {
      const allPositive = allAmounts.every(a => a > 0);
      const allNegative = allAmounts.every(a => a < 0);
      if (allPositive || allNegative) {
        const direction = allPositive ? 'positive (improving only)' : 'negative (deteriorating only)';
        issues.push({
          location: 'All relationship arcs',
          rule: 'RELATIONAL_SYMMETRY_ABSENT',
          description: `All ${allAmounts.length} relationship shifts in the story are ${direction} — no arc has both rise and fall. Unidirectional relationships are predictable rather than dramatic.`,
          severity: 'major',
          suggestedFix: 'Add at least one shift in the opposing direction: a trust built then broken, or a wound that slowly heals. Real relationships are tested by both growth and setback.',
        });
      }
    }
  }

  // ARC_RESOLUTION_ABSENT: Act 2 has 2+ negative emotional shifts (protagonist
  // struggles) but Act 3 (last 25%) has no positive shifts — the arc ends without
  // catharsis or transformation. The internal journey was never resolved.
  if (records.length >= 8) {
    const act2Start = Math.floor(records.length * 0.25);
    const act3Start = Math.floor(records.length * 0.75);
    const act2NegCount = records.slice(act2Start, act3Start)
      .filter(r => r.emotionalShift === 'negative').length;
    const act3PosCount = records.slice(act3Start)
      .filter(r => r.emotionalShift === 'positive').length;
    if (act2NegCount >= 2 && act3PosCount === 0) {
      issues.push({
        location: `Act 3 (Scenes ${act3Start}–${records.length - 1})`,
        rule: 'ARC_RESOLUTION_ABSENT',
        description: `Act 2 has ${act2NegCount} negative emotional shifts (struggle) but Act 3 has no positive shifts — the protagonist's internal arc ends without catharsis or transformation`,
        severity: 'major',
        suggestedFix: 'Add at least one positive emotional beat in Act 3: a reconciliation, a hard-won clarity, or a moment of grace. The struggle must earn some form of resolution.',
      });
    }
  }

  // SECONDARY_CHARACTER_VOID: 2+ secondary characters (3+ fountain cues, not the
  // protagonist) have zero relationship shifts across the story. The protagonist
  // moves through a socially static environment — no one around them grows or changes.
  if (records.length >= 6) {
    const cueCounts2 = new Map<string, number>();
    for (const line of fountain.split('\n')) {
      const t = line.trim();
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}$/.test(t) &&
          !/^(INT\.|EXT\.|CUT TO|FADE|SMASH|THE END|ACT|MIDPOINT|SCENE)/i.test(t)) {
        const charName = t.replace(/\s*\(.*?\)\s*$/, '').toLowerCase().trim();
        if (charName !== 'narrator' && charName !== 'v.o.' && charName !== 'o.s.') {
          cueCounts2.set(charName, (cueCounts2.get(charName) ?? 0) + 1);
        }
      }
    }
    const charsInArcs = new Set<string>();
    for (const r of records) {
      for (const shift of r.relationshipShifts ?? []) {
        for (const id of shift.pairKey.split('|')) charsInArcs.add(id.toLowerCase());
      }
    }
    const sortedChars = [...cueCounts2.entries()].sort((a, b) => b[1] - a[1]);
    const secondaries = sortedChars.slice(1).filter(([, c]) => c >= 3);
    const inertSecondaries = secondaries.filter(([id]) => !charsInArcs.has(id));
    if (inertSecondaries.length >= 2) {
      const names = inertSecondaries.slice(0, 3).map(([id]) => id.toUpperCase()).join(', ');
      issues.push({
        location: 'Secondary characters',
        rule: 'SECONDARY_CHARACTER_VOID',
        description: `${inertSecondaries.length} secondary characters (${names}) appear in 3+ scenes each but have no relationship shifts — the protagonist moves through a socially static landscape`,
        severity: 'minor',
        suggestedFix: 'Give at least one secondary character a relationship shift that intersects with the protagonist\'s journey. Even a single betrayal or alliance adds dramatic texture.',
      });
    }
  }

  // ── Wave 182: Arc stall in Act 2, secondary arc mirror, climax void ──────

  // ARC_STALL_IN_ACT2: The entire Act 2 conflict zone (25%–75%) has a neutral
  // emotional register — no growth, no suffering, no arc movement. The protagonist
  // neither wins nor loses ground across the story's central dramatic terrain.
  if (records.length >= 8) {
    const act2Start = Math.floor(records.length * 0.25);
    const act2End   = Math.floor(records.length * 0.75);
    const act2Records = records.slice(act2Start, act2End);
    if (act2Records.length >= 3 && act2Records.every(r => r.emotionalShift === 'neutral')) {
      issues.push({
        location: `Act 2 (Scenes ${act2Start}–${act2End - 1})`,
        rule: 'ARC_STALL_IN_ACT2',
        description: `All ${act2Records.length} Act 2 scenes are emotionally neutral — the conflict zone registers no emotional charge. The protagonist neither grows nor suffers across the story's entire middle.`,
        severity: 'major',
        suggestedFix: 'Introduce at least two emotionally charged scenes in Act 2: a positive beat (hope, connection, small victory) and a negative beat (loss, betrayal, cost). The arc needs both poles to feel earned.',
      });
    }
  }

  // SECONDARY_ARC_MIRROR: Two or more secondary characters share the same net
  // relationship arc direction (both improving or both deteriorating), making them
  // functionally interchangeable as dramatic agents. The story lacks contrasting
  // secondary arc perspectives — characters are echoes, not individuals.
  if (records.length >= 6) {
    const charNetArc = new Map<string, number>();
    for (const r of records) {
      for (const shift of r.relationshipShifts ?? []) {
        for (const charId of shift.pairKey.split('|')) {
          const id = charId.toLowerCase();
          charNetArc.set(id, (charNetArc.get(id) ?? 0) + shift.amount);
        }
      }
    }
    if (charNetArc.size >= 3) {
      const cueMap = new Map<string, number>();
      for (const line of fountain.split('\n')) {
        const t = line.trim();
        if (/^[A-Z][A-Z0-9\s\-'\.]{2,}$/.test(t) &&
            !/^(INT\.|EXT\.|CUT TO|FADE|SMASH|THE END|ACT|MIDPOINT|SCENE)/i.test(t)) {
          const charName = t.replace(/\s*\(.*?\)\s*$/, '').toLowerCase().trim();
          if (charName !== 'narrator' && charName !== 'v.o.' && charName !== 'o.s.') {
            cueMap.set(charName, (cueMap.get(charName) ?? 0) + 1);
          }
        }
      }
      const protagonistId = [...cueMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
      const significantSecondaries = [...charNetArc.entries()]
        .filter(([id, net]) => id !== protagonistId && Math.abs(net) >= 0.3);
      const positiveSecondaries = significantSecondaries.filter(([, net]) => net > 0);
      const negativeSecondaries = significantSecondaries.filter(([, net]) => net < 0);
      if (positiveSecondaries.length >= 2 || negativeSecondaries.length >= 2) {
        const mirrored = positiveSecondaries.length >= 2 ? positiveSecondaries : negativeSecondaries;
        const dir = positiveSecondaries.length >= 2 ? 'improving' : 'deteriorating';
        const names = mirrored.slice(0, 3).map(([id]) => id.toUpperCase()).join(', ');
        issues.push({
          location: 'Secondary character arcs',
          rule: 'SECONDARY_ARC_MIRROR',
          description: `Secondary characters ${names} all have ${dir} net relationship arcs — they duplicate each other's arc trajectory and are functionally interchangeable as dramatic agents.`,
          severity: 'minor',
          suggestedFix: 'Give at least one secondary character an arc in the opposing direction. Contrasting arcs (one ally rising while another falls) create dramatic irony and prevent the story from feeling like everyone is on the same emotional journey.',
        });
      }
    }
  }

  // ARC_CLIMAX_VOID: The scene explicitly marked as the climax is emotionally
  // neutral, has no relationship shifts, and contains no revelation — the story's
  // structural peak is dramatically hollow. The label exists without the substance.
  if (records.length >= 6) {
    const climaxRecord = records.find(r => r.purpose === 'climax');
    if (climaxRecord !== undefined) {
      const isHollow =
        climaxRecord.emotionalShift === 'neutral' &&
        (climaxRecord.relationshipShifts ?? []).length === 0 &&
        climaxRecord.revelation === null;
      if (isHollow) {
        issues.push({
          location: `Scene ${climaxRecord.sceneIdx} (climax)`,
          rule: 'ARC_CLIMAX_VOID',
          description: `The climax scene (Scene ${climaxRecord.sceneIdx}) is emotionally neutral, has no relationship shift, and contains no revelation — the story's designated peak moment carries no dramatic weight.`,
          severity: 'major',
          suggestedFix: 'The climax must carry the maximum emotional charge of the story: a revelation that recontextualizes everything, a relationship that breaks or transforms, or a moment of profound personal cost. The peak cannot be empty.',
        });
      }
    }
  }

  // ── Wave 196: Opening void, catharsis absent, bookend identical ───────────

  // ARC_OPENING_VOID: The opening two scenes are both emotionally neutral and
  // contain no revelations. Without an emotional baseline in the opening, the arc
  // has no departure point — the audience cannot track a journey that never establishes
  // where it starts.
  if (records.length >= 6) {
    const openA = records[0];
    const openB = records[1];
    if (openA.emotionalShift === 'neutral' && openB.emotionalShift === 'neutral' &&
        openA.revelation === null && openB.revelation === null) {
      issues.push({
        location: 'Scenes 0–1 (opening)',
        rule: 'ARC_OPENING_VOID',
        description: 'The opening two scenes are emotionally neutral with no revelation — the story begins without establishing the protagonist\'s emotional baseline. The arc has no departure point to measure transformation against.',
        severity: 'minor',
        suggestedFix: 'Give the protagonist a distinct emotional state in the opening scene — joy, fear, contentment, or dread — so the arc has a clearly felt starting point. The audience must know where the character is before they can feel where they end up.',
      });
    }
  }

  // ARC_CATHARSIS_ABSENT: The story contains 2+ negative emotional scenes
  // (struggle, loss) but no scene combines positive emotional shift with a
  // revelation — the arc accumulates suffering without a cathartic insight moment.
  // Transformation requires both the positive turn and the insight that causes it.
  if (records.length >= 8) {
    const negativeCount = records.filter(r => r.emotionalShift === 'negative').length;
    if (negativeCount >= 2) {
      const hasCatharticMoment = records.some(r =>
        r.emotionalShift === 'positive' && r.revelation !== null,
      );
      if (!hasCatharticMoment) {
        issues.push({
          location: 'Character arc — catharsis',
          rule: 'ARC_CATHARSIS_ABSENT',
          description: `The story has ${negativeCount} negative emotional scenes (struggle) but no scene delivers both a positive emotional shift AND a revelation — the arc accumulates cost without a cathartic insight that transforms it`,
          severity: 'major',
          suggestedFix: 'Add a scene where the protagonist achieves clarity at the moment of emotional uplift: a revelation that arrives during or just before a positive turn. Catharsis requires insight, not just resolution.',
        });
      }
    }
  }

  // ARC_BOOKEND_IDENTICAL: The first scene and the final scene share the same
  // non-neutral emotional shift. The story returns to its emotional starting point —
  // no net transformation is registered between the opening and the closing frame.
  if (records.length >= 6) {
    const firstShiftB = records[0].emotionalShift ?? 'neutral';
    const lastShiftB = records[records.length - 1].emotionalShift ?? 'neutral';
    if (firstShiftB !== 'neutral' && lastShiftB !== 'neutral' && firstShiftB === lastShiftB) {
      issues.push({
        location: `Scene 0 → Scene ${records.length - 1}`,
        rule: 'ARC_BOOKEND_IDENTICAL',
        description: `The story opens and closes with the same emotional register (${firstShiftB}) — the first and final scenes are emotionally identical. The character returns to where they started rather than arriving somewhere new.`,
        severity: 'minor',
        suggestedFix: 'The final scene should register a different emotional state from the opening — even if the protagonist returns to the same place physically, they must feel differently about it. The closing frame is the evidence of transformation.',
      });
    }
  }

  // ── Wave 213: Arc dynamics — multi-signal narrative physics ─────────────────────
  // Rather than counting the emotionalShift enum in isolation, these three checks
  // reason over a per-scene signal vector that fuses the emotional, relational, and
  // causal axes (see computeArcDynamics). A bare "sad" scene with no relational cost
  // and no rising threat no longer counts as genuine adversity; a relationship that
  // silently breaks DOES. This makes the checks resistant to token gaming and lets
  // them distinguish emotional conflict from relational conflict from causal motivation.
  const arcDyn213 = computeArcDynamics(records);

  // ARC_UNCONTESTED_ASCENT (minor, n≥8): the protagonist accumulates real positive
  // movement (emotional uplift and/or relational gain) while the cumulative adversity
  // index across BOTH the emotional and relational axes stays near zero. The journey
  // is an unbroken rise that is never meaningfully contested on any dramatic axis.
  if (records.length >= 8) {
    const totalTriumph213 = arcDyn213.reduce((acc, d) => acc + d.triumph, 0);
    const totalAdversity213 = arcDyn213.reduce((acc, d) => acc + d.adversity, 0);
    const triumphScenes213 = arcDyn213.filter(d => d.triumph > 0).length;
    if (triumphScenes213 >= 3 && totalTriumph213 >= 3 && totalAdversity213 < 0.5) {
      issues.push({
        location: 'Full story',
        rule: 'ARC_UNCONTESTED_ASCENT',
        severity: 'minor',
        description: `The protagonist's arc registers ${totalTriumph213.toFixed(1)} units of positive movement (across ${triumphScenes213} scenes) but only ${totalAdversity213.toFixed(1)} units of adversity across the emotional AND relational axes combined — no setback, no relational loss, no genuine cost. The journey is an unbroken ascent that is never dramatically contested.`,
        suggestedFix: 'Introduce real opposition along at least one axis: a scene of emotional defeat, OR a relationship that deteriorates (a negative SHIFT_RELATIONSHIP), OR a mounting clock that threatens the gains. Contrast is what gives the eventual triumph its weight — an uncontested rise reads as wish-fulfilment, not transformation.',
      });
    }
  }

  // ARC_LATE_TURN_UNSUPPORTED (major, n≥8): a final-act positive turn whose emotional
  // SWING (the climb from the local trough in the preceding window) is significant, yet
  // no proportionate CATALYST appears in the support window. A catalyst is any genuine
  // causal force — a revelation, a payoff firing, a major relationship shift (|amount|≥0.3),
  // or a suspense resolution (suspenseDelta<0). A big turn with a trivial cause is the defect,
  // not merely an absent revelation. Guard: prior adversity must exist so the turn is a real
  // reversal rather than the story's only emotional note.
  if (records.length >= 8) {
    const finalStart213 = Math.floor(records.length * 0.75);
    const hasPriorAdversity213 = arcDyn213.slice(0, finalStart213).some(d => d.adversity > 0);
    if (hasPriorAdversity213) {
      for (let i213 = finalStart213; i213 < records.length; i213++) {
        if (arcDyn213[i213].state <= 0) continue; // only positive emotional turns
        const troughStart213 = Math.max(0, i213 - 3);
        const priorTrough213 = Math.min(...arcDyn213.slice(troughStart213, i213).map(d => d.state));
        const swing213 = arcDyn213[i213].state - priorTrough213;
        const support213 = Math.max(...arcDyn213.slice(Math.max(0, i213 - 2), i213 + 1).map(d => d.catalyst));
        if (swing213 >= 1 && support213 === 0) {
          issues.push({
            location: `Scene ${i213}`,
            rule: 'ARC_LATE_TURN_UNSUPPORTED',
            severity: 'major',
            description: `Scene ${i213} delivers a positive emotional turn with a swing of ${swing213} (climbing from a trough of ${priorTrough213}), but the support window carries zero causal catalyst — no revelation, no payoff, no major relationship shift, and no suspense resolution motivates the change. The protagonist transforms without cause.`,
            suggestedFix: 'Motivate the turn with a real catalyst in the two scenes before it: a discovered truth (revelation), a planted setup paying off, a relationship decisively shifting (|amount| ≥ 0.3), or a clock/threat resolving. The magnitude of the emotional swing must be matched by the magnitude of its cause.',
          });
          break;
        }
      }
    }
  }

  // ARC_MIDPOINT_INERT (minor, n≥10): the structural midpoint (40%–60%) is classically
  // the point of maximum emotional VELOCITY — the great reversal or the great commitment.
  // This fires when emotional velocity (the absolute scene-to-scene change in emotional
  // state) flatlines through the midpoint while act 2 carries velocity on either side.
  // Unlike a naive "all neutral" check, a midpoint that holds a CONSTANT non-neutral tone
  // (e.g. uniformly positive — no turn) still reads as inert, and this catches it.
  if (records.length >= 10) {
    const midStart213 = Math.floor(records.length * 0.4);
    const midEnd213 = Math.floor(records.length * 0.6);
    const act2Start213 = Math.floor(records.length * 0.25);
    const act2End213 = Math.floor(records.length * 0.75);
    const velocity213 = arcDyn213.map((d, i) => i === 0 ? 0 : Math.abs(d.state - arcDyn213[i - 1].state));
    const midVelocity213 = velocity213.slice(midStart213, midEnd213).reduce((a, v) => a + v, 0);
    const act2OutsideVelocity213 =
      velocity213.slice(act2Start213, midStart213).reduce((a, v) => a + v, 0) +
      velocity213.slice(midEnd213, act2End213).reduce((a, v) => a + v, 0);
    const midZoneLen213 = midEnd213 - midStart213;
    if (midZoneLen213 >= 2 && act2OutsideVelocity213 > 0 && midVelocity213 === 0) {
      issues.push({
        location: `Scenes ${midStart213}–${midEnd213 - 1}`,
        rule: 'ARC_MIDPOINT_INERT',
        severity: 'minor',
        description: `The midpoint zone (scenes ${midStart213}–${midEnd213 - 1}) registers zero emotional velocity — the emotional state never turns — while act 2 on either side carries ${act2OutsideVelocity213} units of movement. The structural centre of the story, where the great reversal belongs, is dramatically static.`,
        suggestedFix: 'Engineer a true turn at the midpoint: drive the emotional state in one direction and then reverse it, or commit the protagonist irrevocably so the register flips. The midpoint must be the pivot of the arc, not a plateau — a held tone, even a positive one, is still a flat line through the story\'s spine.',
      });
    }
  }
  // ── End Wave 213 ──────────────────────────────────────────────────────────────

  // ── Wave 228: Protagonist social invulnerability, midpoint relational void, final-act stasis ──

  // ARC_PROTAGONIST_UNTESTED_SOCIALLY (minor, n≥8): The protagonist (highest
  // fountain cue count) participates in ≥2 relationship shifts but every single
  // one is positive — they gain socially without ever paying a relational cost.
  // No betrayal, no estrangement, no alliance lost across the whole story.
  if (records.length >= 8) {
    const cueCounts228 = new Map<string, number>();
    for (const line228 of fountain.split('\n')) {
      const t228 = line228.trim();
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}$/.test(t228) &&
          !/^(INT\.|EXT\.|CUT TO|FADE|SMASH|THE END|ACT|MIDPOINT|SCENE)/i.test(t228)) {
        const charName228 = t228.replace(/\s*\(.*?\)\s*$/, '').toLowerCase().trim();
        if (charName228 !== 'narrator' && charName228 !== 'v.o.' && charName228 !== 'o.s.') {
          cueCounts228.set(charName228, (cueCounts228.get(charName228) ?? 0) + 1);
        }
      }
    }
    const protagonist228 = [...cueCounts228.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (protagonist228 !== undefined) {
      const protRelShifts228 = records.flatMap(r =>
        (r.relationshipShifts ?? []).filter((s: any) =>
          s.pairKey.toLowerCase().split('|').includes(protagonist228),
        ),
      );
      if (protRelShifts228.length >= 2 && protRelShifts228.every((s: any) => s.amount > 0)) {
        issues.push({
          location: `Character: ${protagonist228.toUpperCase()}`,
          rule: 'ARC_PROTAGONIST_UNTESTED_SOCIALLY',
          severity: 'minor',
          description: `The protagonist (${protagonist228.toUpperCase()}) participates in ${protRelShifts228.length} relationship shifts but every one is positive — they gain socially without ever paying a relational cost. No betrayal, no estrangement, no alliance lost. The character's social arc is an unbroken rise.`,
          suggestedFix: 'Give the protagonist at least one negative relationship shift: a trusted ally who withdraws support, a bond that fractures under pressure, or a connection that costs them something real. Relational loss is what makes the eventual gains meaningful.',
        });
      }
    }
  }

  // ARC_MIDPOINT_RELATIONAL_VOID (major, n≥10): The structural midpoint zone
  // (40%–60%) contains no relationship shifts and no revelations. The fulcrum
  // where arcs must reverse is empty of character dynamics. Distinct from
  // ARC_MIDPOINT_INERT (which checks emotional velocity) — this fires when the
  // relational and revelation axes are both flat, so the midpoint has no
  // interpersonal event to pivot on.
  if (records.length >= 10) {
    const midStart228 = Math.floor(records.length * 0.4);
    const midEnd228 = Math.floor(records.length * 0.6);
    const midRecords228 = records.slice(midStart228, midEnd228);
    if (midRecords228.length >= 2) {
      const hasMidRelOrRev228 = midRecords228.some((r: any) =>
        (r.relationshipShifts ?? []).length > 0 || r.revelation !== null,
      );
      if (!hasMidRelOrRev228) {
        issues.push({
          location: `Midpoint zone (Scenes ${midStart228}–${midEnd228 - 1})`,
          rule: 'ARC_MIDPOINT_RELATIONAL_VOID',
          severity: 'major',
          description: `Scenes ${midStart228}–${midEnd228 - 1} (the structural midpoint, 40%–60%) contain no relationship shifts and no revelations. The story's fulcrum — where arcs must reverse — is empty of interpersonal events. Nothing changes between characters at the moment the story needs its central pivot.`,
          suggestedFix: 'Plant a relationship-altering event or revelation in the midpoint zone: a disclosure that shifts an alliance, a secret exposed, or a relationship that decisively changes direction. The midpoint must carry the weight of the story\'s central dramatic reversal.',
        });
      }
    }
  }

  // ARC_FINAL_ACT_CHARACTER_STATIC (major, n≥8): Act 3 (final 25%) has ≥3
  // scenes but contains zero relationship shifts. The resolution phase ends
  // without any relational conclusion — characters leave the story in the same
  // relational positions they entered Act 3. The arc does not close; it stops.
  if (records.length >= 8) {
    const act3Start228 = Math.floor(records.length * 0.75);
    const act3Records228 = records.slice(act3Start228);
    if (act3Records228.length >= 3) {
      const hasAct3RelShift228 = act3Records228.some((r: any) =>
        (r.relationshipShifts ?? []).length > 0,
      );
      if (!hasAct3RelShift228) {
        issues.push({
          location: `Act 3 (Scenes ${act3Start228}–${records.length - 1})`,
          rule: 'ARC_FINAL_ACT_CHARACTER_STATIC',
          severity: 'major',
          description: `Act 3 (scenes ${act3Start228}–${records.length - 1}, ${act3Records228.length} scenes) contains no relationship shifts — the resolution phase ends without any relational conclusion. Characters leave the story in the same relational positions they held at the start of Act 3.`,
          suggestedFix: 'The final act must contain at least one relationship shift that closes the story\'s central relational arc: a reconciliation, a final estrangement, an alliance confirmed or broken. A resolution without a relational event is hollow.',
        });
      }
    }
  }
  // ── Wave 242: Act 1 relational desert, midpoint positive absent, revelation unincorporated ──

  // ARC_ACT1_RELATIONAL_DESERT (major, n≥10, ≥2 pairs): No pair has any
  // relationship shift in Act 1 (first 25%) of the story. The setup act establishes
  // characters but not their relational world — the audience enters Act 2 with no
  // sense of who trusts, opposes, or relies on whom. The interpersonal landscape
  // is defined by what characters DO to each other; an Act 1 with no relational
  // events is a collection of individuals, not a cast.
  {
    const allPairs242 = new Set<string>();
    for (const r of records) for (const s of (r.relationshipShifts ?? [])) allPairs242.add((s as any).pairKey);
    if (records.length >= 10 && allPairs242.size >= 2) {
    const act1End242 = Math.floor(records.length * 0.25);
    const hasAct1Shift242 = records.slice(0, act1End242).some(r =>
      (r.relationshipShifts ?? []).length > 0,
    );
    if (!hasAct1Shift242) {
      issues.push({
        location: `Act 1 (Scenes 0–${act1End242 - 1}) — relational layer`,
        rule: 'ARC_ACT1_RELATIONAL_DESERT',
        severity: 'major',
        description: `Act 1 (the first ${act1End242} scenes) contains no relationship shifts — the setup establishes characters but leaves the relational world blank. The audience enters Act 2 with no established bonds, rivalries, or trust patterns to invest in.`,
        suggestedFix: 'Plant at least one relationship shift in Act 1: a gesture of trust, a moment of friction, or an alliance formed under pressure. The audience invests in relationships they have seen move; characters who meet without reacting to each other are strangers throughout.',
      });
    }
  }
  }

  // ARC_POSITIVE_MIDPOINT_ABSENT (minor, n≥10): The midpoint zone (40%–60%)
  // contains no positive relationship shift. All midpoint relational movement is
  // negative or absent — the structural pivot carries only downward pressure.
  // The midpoint is the story's fulcrum; a fulcrum with no positive energy means
  // no "false dawn" — no moment of hope before the Act 2b collapse. The tonal arc
  // becomes simply "bad, then worse, then resolution" with no emotional contrast
  // at the structural centre.
  if (records.length >= 10) {
    const midStart242 = Math.floor(records.length * 0.4);
    const midEnd242 = Math.floor(records.length * 0.6);
    const midRecords242 = records.slice(midStart242, midEnd242);
    if (midRecords242.length >= 2) {
      const hasMidPosShift242 = midRecords242.some(r =>
        (r.relationshipShifts ?? []).some((s: any) => s.amount > 0),
      );
      if (!hasMidPosShift242) {
        issues.push({
          location: `Midpoint zone (Scenes ${midStart242}–${midEnd242 - 1})`,
          rule: 'ARC_POSITIVE_MIDPOINT_ABSENT',
          severity: 'minor',
          description: `The midpoint zone (Scenes ${midStart242}–${midEnd242 - 1}) contains no positive relationship shift — the structural pivot carries only negative or absent relational movement. Without a "false dawn" at the midpoint, the story has no emotional contrast at its centre: just a continuous descent from Act 1 into Act 3.`,
          suggestedFix: "Add a positive relational beat at the midpoint: a trust restored, a new alliance forming, an unexpected warmth between adversaries. Even a small positive shift at the fulcrum creates the 'peak before the collapse' that gives Act 2b its emotional weight.",
        });
      }
    }
  }

  // ARC_REVELATION_UNINCORPORATED (minor, n≥8, ≥2 revelations): Two or more
  // witnessed revelations occur but none of them is followed by a relationship
  // shift in the same scene or within 2 scenes. Characters discover truths that
  // don't change their relationships — personal revelations leave no interpersonal
  // trace. Discovery without consequence is characterologically inert: if what the
  // protagonist learns doesn't affect who they trust or fear or love, why does it
  // matter to the story's relational arc?
  if (records.length >= 8) {
    const revRecs242 = records.filter(r => r.revelation !== null);
    if (revRecs242.length >= 2) {
      const allRevsUnincorporated242 = revRecs242.every(revR => {
        const revIdx242 = records.indexOf(revR);
        for (let k = revIdx242; k <= Math.min(revIdx242 + 2, records.length - 1); k++) {
          if ((records[k].relationshipShifts ?? []).length > 0) return false;
        }
        return true;
      });
      if (allRevsUnincorporated242) {
        issues.push({
          location: 'Revelation → relational consequence',
          rule: 'ARC_REVELATION_UNINCORPORATED',
          severity: 'minor',
          description: `${revRecs242.length} witnessed revelations occur but none is followed by a relationship shift within 2 scenes — personal discoveries leave no interpersonal trace. What characters learn doesn't change who they trust, fear, or love.`,
          suggestedFix: "After each revelation, show its relational consequence: the trust that breaks, the alliance that shifts, the estrangement that crystallises. A discovery that doesn't alter any relationship is characterologically inert — it's information the protagonist carries but never acts on.",
        });
      }
    }
  }
  // ── End Wave 242 ─────────────────────────────────────────────────────────────

  // ── End Wave 228 ─────────────────────────────────────────────────────────────

  // ── Wave 256: Relational dimension monotony, emotional flatline, negative-only arc ──

  // ARC_SINGLE_DIMENSION (minor, n≥6, ≥4 shifts): Every relationship shift across
  // the story moves on the same single dimension (e.g. only 'trust', never 'power'
  // or 'intimacy'). Relationships are multi-dimensional — people gain power as they
  // lose intimacy, earn trust while ceding control. A cast whose bonds only ever
  // move on one axis is relationally thin: the same note struck again and again
  // instead of a chord. Requires 4+ total shifts carrying a dimension field.
  if (records.length >= 6) {
    const dimensions256 = new Set<string>();
    let shiftCount256 = 0;
    for (const r of records) {
      for (const s of (r.relationshipShifts ?? []) as Array<{ dimension?: string }>) {
        shiftCount256++;
        if (s.dimension) dimensions256.add(s.dimension);
      }
    }
    if (shiftCount256 >= 4 && dimensions256.size === 1) {
      const [onlyDim256] = dimensions256;
      issues.push({
        location: 'Relational dimension coverage',
        rule: 'ARC_SINGLE_DIMENSION',
        severity: 'minor',
        description: `All ${shiftCount256} relationship shifts in the story move on a single dimension ("${onlyDim256}") — the relational world only ever changes along one axis. Relationships are multi-dimensional: trust, power, and intimacy move independently and often in opposition. A cast that only shifts on one note reads as relationally flat.`,
        suggestedFix: `Vary the relational dimensions: let one pair gain power while losing intimacy, another earn trust while ceding control. A relationship that moves on multiple axes at once — closer but more wary, allied but resentful — is what makes a cast feel three-dimensional.`,
      });
    }
  }

  // ARC_EMOTIONAL_FLATLINE (major, n≥8): 80% or more of all scenes carry a neutral
  // emotionalShift — the story has almost no emotional texture. Characters move
  // through events without registering feeling, so the audience has nothing to feel
  // alongside them. Distinct from FLAT_CHARACTER_ARC (same opening/closing tone) and
  // arc monotone (a non-neutral state that never varies); this catches the absence
  // of emotional signal altogether — a story told in affectless reportage.
  if (records.length >= 8) {
    const neutralCount256 = records.filter(r => r.emotionalShift === 'neutral').length;
    const neutralRatio256 = neutralCount256 / records.length;
    if (neutralRatio256 >= 0.8) {
      issues.push({
        location: 'Emotional texture',
        rule: 'ARC_EMOTIONAL_FLATLINE',
        severity: 'major',
        description: `${neutralCount256} of ${records.length} scenes (${Math.round(neutralRatio256 * 100)}%) carry a neutral emotional tone — the story has almost no emotional texture. Characters pass through events without registering feeling, so the audience is given nothing to feel with them. The narrative reads as affectless reportage rather than lived experience.`,
        suggestedFix: 'Inject emotional shifts across the arc: let scenes land as victories, losses, fears, or relief. Every significant beat should leave a character (and the audience) feeling something — a story with no emotional signal is a sequence of events, not a drama.',
      });
    }
  }

  // ARC_NEGATIVE_ONLY (minor, n≥8, ≥3 non-neutral scenes): Every non-neutral
  // emotional beat in the story is negative — there is not a single positive scene
  // anywhere. Unrelieved downward emotion gives the audience no contrast and nothing
  // to lose: despair only lands against the memory of hope. A story pitched entirely
  // in the minor key flattens into monotone bleakness. Distinct from ARC_POSITIVE_
  // MIDPOINT_ABSENT (relational, midpoint-only); this is the emotional arc end-to-end.
  if (records.length >= 8) {
    const nonNeutral256 = records.filter(r => r.emotionalShift !== 'neutral');
    if (nonNeutral256.length >= 3 && nonNeutral256.every(r => r.emotionalShift === 'negative')) {
      issues.push({
        location: 'Emotional arc polarity',
        rule: 'ARC_NEGATIVE_ONLY',
        severity: 'minor',
        description: `All ${nonNeutral256.length} emotionally charged scenes in the story are negative — there is not a single positive beat anywhere. Unrelieved downward emotion gives the audience no contrast: despair only registers against the memory of hope, and a story told entirely in the minor key flattens into monotone bleakness.`,
        suggestedFix: 'Plant at least one or two positive emotional beats — a small victory, a moment of connection, a flash of hope — even (especially) in a tragedy. The darkness deepens when it follows light; without contrast, relentless bleakness numbs rather than moves.',
      });
    }
  }

  const { revised, usedLLM } = await rewritePass({ fountain, issues, passName: 'character-arc', approvedSpans, storyContext: input.storyContext, priorPassResults: input.priorPassResults });
  const changed = revised !== fountain;

  return {
    pass: 'character-arc',
    issues,
    revisedFountain: revised,
    changed,
    summary: issues.length === 0
      ? 'Character-arc pass: arcs are complete'
      : `Character-arc pass: ${issues.length} issue(s) — ${usedLLM ? 'rewritten' : 'flagged (stub mode)'}`,
  };
}

/** Per-scene narrative signal vector used by the Wave 213 arc-dynamics checks.
 *  Each scene is decomposed onto orthogonal dramatic axes so the checks can reason
 *  about emotional movement, relational movement, and causal motivation independently
 *  rather than collapsing everything onto a single emotionalShift enum. */
interface SceneArcSignal {
  /** Emotional state of the scene: +1 positive, 0 neutral, -1 negative */
  state: number;
  /** Positive movement: emotional uplift + cumulative positive relationship gain */
  triumph: number;
  /** Adversity: emotional defeat + cumulative relational loss (absolute magnitude) */
  adversity: number;
  /** Causal force capable of motivating an emotional turn: revelation, payoff firing,
   *  a major relationship shift (|amount| ≥ 0.3), or a suspense resolution. */
  catalyst: number;
}

function computeArcDynamics(records: PassInput['records']): SceneArcSignal[] {
  return records.map((r: any) => {
    const rel = (r.relationshipShifts ?? []) as Array<{ amount: number }>;
    const relGain = rel.filter(s => s.amount > 0).reduce((a, s) => a + s.amount, 0);
    const relLoss = rel.filter(s => s.amount < 0).reduce((a, s) => a + Math.abs(s.amount), 0);
    const state = r.emotionalShift === 'positive' ? 1 : r.emotionalShift === 'negative' ? -1 : 0;

    const triumph = (state > 0 ? 1 : 0) + relGain;
    const adversity = (state < 0 ? 1 : 0) + relLoss;

    const bigRelShift = rel.some(s => Math.abs(s.amount) >= 0.3);
    const suspenseResolved = (r.suspenseDelta ?? 0) < 0;
    const catalyst =
      (r.revelation !== null && r.revelation !== undefined ? 1 : 0) +
      ((r.payoffSetupIds?.length ?? 0) > 0 ? 1 : 0) +
      (bigRelShift ? 1 : 0) +
      (suspenseResolved ? 1 : 0);

    return { state, triumph, adversity, catalyst };
  });
}

function dominantShift(records: PassInput['records']): string {
  if (records.length === 0) return 'neutral';
  const counts: Record<string, number> = {};
  for (const r of records) {
    const shift = r.emotionalShift ?? 'neutral';
    counts[shift] = (counts[shift] ?? 0) + 1;
  }
  const entries = Object.entries(counts);
  if (entries.length === 0) return 'neutral';
  return entries.sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'neutral';
}
