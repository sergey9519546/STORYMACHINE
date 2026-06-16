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
// Wave 270 additions: positive-only arc (no negative beats, no stakes),
// shift concentration (all relational movement in 3-scene burst),
// late relational void (no shifts in final quarter).
// emotional flatline (≥80% neutral scenes), negative-only arc (no positive beat).
// Wave 284 additions: emotional resolution absent (no positive shift in final quarter
// despite positive beats existing), revelation late cluster (>60% of revelations
// in final 25%), curiosity plateau (Act 2b avg curiosityDelta ≤ 0).
// Wave 298 additions: dramatic turn monotone (3+ turns all the same type), suspense/
// emotion decoupled (3+ high-suspense scenes all emotionally neutral), grief skipped
// (every negative shift is cancelled by a positive one in the very next scene).
// Wave 312 additions: first half emotionally flat (entire first half neutral while the
// second half carries emotion — late-starting arc), turn emotion absent (≥2 dramatic-turn
// scenes all emotionally neutral), curiosity/emotion decoupled (≥3 high-curiosity scenes
// all emotionally neutral — intrigue without investment).
// Wave 337 additions: suspense/curiosity decoupled (≥3 high-suspense scenes all curiosity-
// flat — tension without wonder), revelation emotion absent (≥2 revelation scenes all
// emotionally neutral — reveals that never move the protagonist), revelation curiosity
// decoupled (≥3 revelation scenes avg curiosityDelta ≤ 0 — answers that close no new doors).
// Wave 351 additions: second half emotionally flat (entire back half neutral while the front
// half carried emotion — arc runs out of fuel), emotional recovery absent (≥2 falls and joy
// exists but none after the first fall — relentless downslope), relational first-half flat
// (no bond shift in the front half while the back half moves bonds — late relational start).
// Wave 365 additions: peak suspense emotion absent (the single highest-suspense scene is
// emotionally neutral while the protagonist shows emotion elsewhere — the tension peak leaves
// them unmoved), peak curiosity emotion absent (the single highest-curiosity scene is neutral
// while emotion exists elsewhere — the intrigue peak doesn't move them), relational shift
// emotion flat (every relationship-shift scene is emotionally neutral — bonds move but the
// protagonist registers no feeling about any of them).
// Wave 379 additions: emotion concentration (all the protagonist's emotional beats burst in a
// span ≤20% of the story while the rest is flat — the emotion analogue of relational shift
// concentration), emotional front-loaded (>70% of emotional beats fall in the first half —
// feeling dwindles toward the climax instead of intensifying), negative emotion run (≥4
// consecutive negative-emotion scenes with no relief — an unbroken stretch of despair).

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

  // ── Wave 270: ARC_POSITIVE_ONLY ───────────────────────────────────────────
  // Every non-neutral emotional beat in the story is positive — there is not
  // a single negative scene anywhere. The mirror of ARC_NEGATIVE_ONLY: a story
  // told entirely in the major key has no stakes. When nothing goes wrong, the
  // audience has nothing to fear for; when every beat is a victory, there is no
  // cost to the protagonist and the final triumph carries no weight.
  // Requires 8+ records and 3+ non-neutral scenes.
  if (records.length >= 8) {
    const nonNeutral270 = records.filter(r => r.emotionalShift !== 'neutral');
    if (nonNeutral270.length >= 3 && nonNeutral270.every(r => r.emotionalShift === 'positive')) {
      issues.push({
        location: 'Emotional arc polarity',
        rule: 'ARC_POSITIVE_ONLY',
        severity: 'minor',
        description: `All ${nonNeutral270.length} emotionally charged scenes in the story are positive — there is not a single negative beat. A story told entirely in the major key has no stakes: without setbacks, the protagonist's successes are inevitable, and the final triumph carries no emotional weight because nothing was ever lost or risked.`,
        suggestedFix: 'Plant at least one or two negative emotional beats — a setback, a loss, a moment of genuine failure or despair — even in a comedy. Positive beats land harder when they follow darkness; unbroken positivity reads as conflict-free fantasy rather than earned resolution.',
      });
    }
  }

  // ── Wave 270: ARC_SHIFT_CONCENTRATION ─────────────────────────────────────
  // Three or more scenes with relationship shifts all cluster within a 3-scene
  // window (max scene index − min scene index ≤ 2). All relational movement
  // is packed into one concentrated burst rather than distributed across the
  // arc. Relationships develop gradually — trust erodes over time, power
  // accumulates scene by scene; cramming all relational change into a single
  // stretch compresses what should be a gradual arc into a sudden event.
  // Requires 8+ records and 3+ distinct scenes with shifts.
  if (records.length >= 8) {
    const shiftScenes270 = new Set<number>();
    for (const r of records) {
      if ((r.relationshipShifts as any[] ?? []).length > 0) shiftScenes270.add(r.sceneIdx as number);
    }
    if (shiftScenes270.size >= 3) {
      const shiftIdxList270 = [...shiftScenes270].sort((a, b) => a - b);
      const span270 = shiftIdxList270[shiftIdxList270.length - 1] - shiftIdxList270[0];
      if (span270 <= 2) {
        issues.push({
          location: `Scenes ${shiftIdxList270.join(', ')} — relational concentration`,
          rule: 'ARC_SHIFT_CONCENTRATION',
          severity: 'minor',
          description: `All ${shiftScenes270.size} scenes with relationship shifts are packed within a ${span270 + 1}-scene window (scenes ${shiftIdxList270.join(', ')}). Every relational change the story makes happens in a single concentrated burst — trust, power, and intimacy that should shift gradually across the arc are compressed into one stretch, reading as sudden event rather than organic development.`,
          suggestedFix: 'Distribute relationship shifts across the full arc. Let early scenes establish the baseline, mid-story scenes strain the relationship, and late scenes either repair or break it permanently. Relational change that accumulates over time reads as earned; concentrated change reads as contrived.',
        });
      }
    }
  }

  // ── Wave 270: ARC_LATE_RELATIONAL_VOID ────────────────────────────────────
  // The story has 3+ total relationship shifts but none occur in the final
  // quarter of the arc. The climax — where relational stakes should peak —
  // has no relational movement at all. Characters enter the final act with
  // fully settled relationships and the resolution has no relational cost.
  // Distinct from ARC_MIDPOINT_RELATIONAL_VOID (midpoint-specific); this
  // flags the final act specifically.
  // Requires 8+ records and 3+ total relationship shifts.
  if (records.length >= 8) {
    const totalShifts270 = (records as any[]).reduce((acc, r) => acc + ((r.relationshipShifts as any[] ?? []).length), 0);
    if (totalShifts270 >= 3) {
      const finalActStart270 = Math.floor(records.length * 0.75);
      const lateShiftScenes270 = (records as any[]).filter(r => r.sceneIdx >= finalActStart270 && (r.relationshipShifts as any[] ?? []).length > 0);
      if (lateShiftScenes270.length === 0) {
        issues.push({
          location: `Final quarter (scene ${finalActStart270}+) — relational void`,
          rule: 'ARC_LATE_RELATIONAL_VOID',
          severity: 'minor',
          description: `${totalShifts270} relationship shifts occur across the story but none appear in the final quarter (scene ${finalActStart270}+). The climax has no relational movement — characters enter the resolution with fully settled bonds and the outcome costs nothing relationally. The final act confirms rather than completes the character arc.`,
          suggestedFix: 'Add at least one relationship shift in the final act: a reconciliation, a definitive break, an unexpected alliance. The climax should change at least one relationship permanently — the audience needs to see the relational cost or reward of everything that came before it.',
        });
      }
    }
  }

  // ── Wave 284: ARC_EMOTIONAL_RESOLUTION_ABSENT ────────────────────────────
  // The story has positive emotional shift scenes but none appear in the
  // final quarter. The arc escalates through the story but never resolves
  // upward — the climax and resolution have no emotional lift. Even a
  // tragedy benefits from a moment of positive emotional shift at the
  // climax (recognition, acceptance, brief triumph) before the ending.
  // Requires 8+ records and 2+ positive-shift scenes anywhere in the story.
  if (records.length >= 8) {
    const posShiftScenes284 = (records as any[]).filter(r => r.emotionalShift === 'positive');
    if (posShiftScenes284.length >= 2) {
      const finalStart284 = Math.floor(records.length * 0.75);
      const finalPosScenes284 = posShiftScenes284.filter(r => r.sceneIdx >= finalStart284);
      if (finalPosScenes284.length === 0) {
        issues.push({
          location: `Final quarter (scene ${finalStart284}+) — no positive emotional shift`,
          rule: 'ARC_EMOTIONAL_RESOLUTION_ABSENT',
          severity: 'minor',
          description: `${posShiftScenes284.length} positive emotional shift scene(s) exist across the story but none occur in the final quarter (scene ${finalStart284}+). The arc never resolves upward — characters enter the climax with established positive capacity but the resolution denies any positive beat. Even in a tragedy, one moment of recognition, relief, or acceptance gives the ending its emotional weight.`,
          suggestedFix: 'Add at least one positive emotional shift in the final quarter — a brief triumph before the fall, a moment of clarity, a reconciliation, or a character accepting their fate with grace. Emotional resolution does not mean a happy ending; it means the arc completes rather than trailing off.',
        });
      }
    }
  }

  // ── Wave 284: ARC_REVELATION_LATE_CLUSTER ────────────────────────────────
  // More than 60% of all revelations occur in the final 25% of the story.
  // Information is withheld until the climax and then dumped in an
  // exposition avalanche. This is the opposite of seeding — rather than
  // planting clues and paying them off, the story hoards all revelations
  // for a single information flood at the end. Requires 8+ records and
  // 3+ total revelations.
  if (records.length >= 8) {
    const revScenes284 = (records as any[]).filter(r => r.revelation !== null);
    if (revScenes284.length >= 3) {
      const finalStart284b = Math.floor(records.length * 0.75);
      const lateRevScenes284 = revScenes284.filter(r => r.sceneIdx >= finalStart284b);
      if (lateRevScenes284.length / revScenes284.length > 0.60) {
        issues.push({
          location: `Final quarter (scene ${finalStart284b}+) — revelation cluster`,
          rule: 'ARC_REVELATION_LATE_CLUSTER',
          severity: 'minor',
          description: `${lateRevScenes284.length} of ${revScenes284.length} revelation(s) (${Math.round(lateRevScenes284.length / revScenes284.length * 100)}%) occur in the final quarter. Revelations should be seeded throughout the arc to build accumulating understanding; clustering them at the end creates an information avalanche and flattens the earlier acts' dramatic stakes.`,
          suggestedFix: 'Redistribute revelations across the story: plant the first revelation in Act 1 to hook the audience, escalate with a major revelation at the midpoint, and reserve only the final revelation for the climax. Each revelation should raise new questions, not just answer old ones.',
        });
      }
    }
  }

  // ── Wave 284: ARC_CURIOSITY_PLATEAU ──────────────────────────────────────
  // Average curiosityDelta in Act 2b (50–75%) is ≤ 0, meaning audience
  // curiosity stagnates or actively drops during the second half of Act 2.
  // Act 2b should be the arc's escalation engine — curiosity should peak
  // here as the protagonist approaches the climax. A plateau or descent
  // means the story loses dramatic momentum exactly when it needs to gain
  // it. Requires 10+ records and 3+ scenes in the Act 2b window.
  if (records.length >= 10) {
    const act2bStart284 = Math.floor(records.length * 0.50);
    const act2bEnd284 = Math.floor(records.length * 0.75);
    const act2bRecs284 = (records as any[]).slice(act2bStart284, act2bEnd284);
    if (act2bRecs284.length >= 3) {
      const avgCuriosity284 = act2bRecs284.reduce((acc: number, r: any) => acc + (r.curiosityDelta ?? 0), 0) / act2bRecs284.length;
      if (avgCuriosity284 <= 0) {
        issues.push({
          location: `Act 2b (scenes ${act2bStart284}–${act2bEnd284}) — curiosity plateau`,
          rule: 'ARC_CURIOSITY_PLATEAU',
          severity: 'minor',
          description: `Average curiosityDelta across Act 2b (scenes ${act2bStart284}–${act2bEnd284}) is ${avgCuriosity284.toFixed(2)} — audience curiosity stagnates or falls during the arc's escalation window. Act 2b should be the engine that drives the audience toward the climax; a plateau or descent here causes dramatic momentum to collapse before the finale.`,
          suggestedFix: 'Escalate mystery and stakes in Act 2b: introduce new complications, deepen unanswered questions, and raise the cost of failure. Each scene in this window should leave the audience more uncertain about the outcome than the scene before it.',
        });
      }
    }
  }

  // ── Wave 298: ARC_DRAMATIC_TURN_MONOTONE ─────────────────────────────────
  // The story contains 3+ dramatic turns and every one of them is the same
  // type (all reversals, all revelations, etc.). A character arc built from
  // a single kind of turn has one move it keeps repeating — the audience
  // learns the pattern and pre-empts every pivot. Requires 8+ records and
  // 3+ scenes with a dramatic turn.
  if (records.length >= 8) {
    const turnScenes298 = (records as any[]).filter(r => (r.dramaticTurn ?? 'nothing') !== 'nothing');
    if (turnScenes298.length >= 3) {
      const turnTypes298 = new Set(turnScenes298.map(r => r.dramaticTurn));
      if (turnTypes298.size === 1) {
        const [onlyTurn298] = turnTypes298;
        issues.push({
          location: 'Dramatic turns throughout',
          rule: 'ARC_DRAMATIC_TURN_MONOTONE',
          severity: 'minor',
          description: `All ${turnScenes298.length} dramatic turns in the story are the same type ("${onlyTurn298}"). An arc that pivots the same way every time has one move it keeps repeating — by the second occurrence the audience recognizes the pattern, and by the third they pre-empt it. Turn variety is what keeps an arc unpredictable.`,
          suggestedFix: `Vary the turn types: if every turn is a "${onlyTurn298}", convert at least one into a different kind of pivot — a revelation instead of a reversal, a choice instead of a discovery, an escalation instead of a collapse. Each type of turn exercises a different audience muscle; using only one exhausts it.`,
        });
      }
    }
  }

  // ── Wave 298: ARC_SUSPENSE_EMOTION_DECOUPLED ─────────────────────────────
  // Three or more high-suspense scenes (suspenseDelta > 1.5) all carry a
  // neutral emotional shift — tension peaks but the protagonist is never
  // emotionally touched by it. Suspense the character doesn't feel is
  // spectacle, not drama. Distinct from CLIMAX_EMOTIONALLY_FLAT (single
  // climax-scene audit): this checks the correlation across the whole story's
  // high-tension scenes. Requires 8+ records.
  if (records.length >= 8) {
    const highSusp298 = (records as any[]).filter(r => (r.suspenseDelta ?? 0) > 1.5);
    if (highSusp298.length >= 3 && highSusp298.every(r => r.emotionalShift === 'neutral')) {
      issues.push({
        location: 'High-suspense scenes',
        rule: 'ARC_SUSPENSE_EMOTION_DECOUPLED',
        severity: 'minor',
        description: `All ${highSusp298.length} high-suspense scenes (suspenseDelta > 1.5) carry a neutral emotional shift — tension spikes but never registers on the protagonist. Suspense the character does not feel is spectacle: the audience watches danger without watching anyone be changed by it. Tension becomes drama only when it costs or moves someone.`,
        suggestedFix: 'Let high-tension scenes mark the protagonist emotionally: fear that curdles into a negative shift, survival that releases into a positive one. At minimum, the most suspenseful scene in the story should also move the character — if the bomb under the table changes nothing about how anyone feels, it might as well not be there.',
      });
    }
  }

  // ── Wave 298: ARC_GRIEF_SKIPPED ──────────────────────────────────────────
  // Every negative emotional shift (3+ of them) is immediately followed by a
  // positive shift in the very next scene — losses never get a scene to land
  // before being cancelled. Distinct from EMOTIONAL_WHIPLASH (which requires
  // a contiguous run of alternations): this fires even when the instant
  // recoveries are scattered across the story with neutral scenes between
  // the pairs. Requires 8+ records.
  if (records.length >= 8) {
    const negIdxs298: number[] = [];
    for (let i298 = 0; i298 < records.length - 1; i298++) {
      if ((records as any[])[i298].emotionalShift === 'negative') negIdxs298.push(i298);
    }
    if (negIdxs298.length >= 3) {
      const allInstantlyRecovered298 = negIdxs298.every(
        i298 => (records as any[])[i298 + 1].emotionalShift === 'positive',
      );
      if (allInstantlyRecovered298) {
        issues.push({
          location: 'Negative emotional shifts throughout',
          rule: 'ARC_GRIEF_SKIPPED',
          severity: 'minor',
          description: `All ${negIdxs298.length} negative emotional shifts are cancelled by a positive shift in the very next scene — no loss is ever given a scene to land. When every wound heals immediately, the audience learns that setbacks are weightless: nothing bad will be allowed to matter for more than one scene. Grief skipped is stakes erased.`,
          suggestedFix: 'After at least one significant loss, hold the negative register for a scene or two before any recovery: show the character living inside the consequence — withdrawn, lashing out, going through the motions. The depth of a low is what gives the eventual rise its height; instant recovery flattens both.',
        });
      }
    }
  }

  // ── Wave 312: ARC_FIRST_HALF_EMOTIONALLY_FLAT ────────────────────────────
  // Every scene in the first half (0–50%) is emotionally neutral, while the
  // second half carries at least two non-neutral beats. The character's
  // emotional arc does not begin until the back half — the entire setup and
  // first complication zone play out at a single flat pitch. Distinct from
  // ARC_STALL_IN_ACT2 (the 25–75% band specifically), ARC_OPENING_VOID (first
  // two scenes), and ARC_EMOTIONAL_FLATLINE/MONOTONE (whole-story neutrality):
  // this targets a flat front half that an active back half then contradicts.
  // Requires 10+ records with a 5+ scene first half.
  if (records.length >= 10) {
    const halfIdx312 = Math.floor(records.length * 0.5);
    const firstHalf312 = (records as any[]).slice(0, halfIdx312);
    const secondHalf312 = (records as any[]).slice(halfIdx312);
    if (firstHalf312.length >= 5) {
      const firstHalfFlat312 = firstHalf312.every(r => r.emotionalShift === 'neutral');
      const secondHalfCharged312 = secondHalf312.filter(r => r.emotionalShift !== 'neutral').length;
      if (firstHalfFlat312 && secondHalfCharged312 >= 2) {
        issues.push({
          location: `First half (Scenes 0–${halfIdx312 - 1}) — emotionally flat`,
          rule: 'ARC_FIRST_HALF_EMOTIONALLY_FLAT',
          severity: 'minor',
          description: `Every scene in the first half (0–${halfIdx312 - 1}) is emotionally neutral, while the second half carries ${secondHalfCharged312} charged beats — the character's emotional arc does not begin until the back half. The entire setup and early complication zone play out at one flat pitch, so the audience spends half the story with no emotional read on the protagonist.`,
          suggestedFix: 'Seed emotional movement in the first half: a loss, a hope, a fear, a small win that establishes the protagonist\'s emotional baseline and starts the arc early. A character the audience cannot feel for in the first half is one they have no reason to follow into the second.',
        });
      }
    }
  }

  // ── Wave 312: ARC_TURN_EMOTION_ABSENT ────────────────────────────────────
  // Two or more dramatic-turn scenes occur and every one of them is emotionally
  // neutral — the protagonist pivots without feeling the pivot. A dramatic turn
  // is a hinge in the character's journey; if it registers no emotional shift,
  // the turn is plot machinery the character merely processes. Distinct from
  // ARC_SUSPENSE_EMOTION_DECOUPLED (high-suspense scenes), ARC_DRAMATIC_TURN_
  // MONOTONE (turn-type sameness), and causality's DRAMATIC_TURN_AFTERMATH_VOID
  // (downstream ripple): this audits the turn scenes themselves for charge.
  // Requires 8+ records.
  if (records.length >= 8) {
    const turnScenes312 = (records as any[]).filter(r => (r.dramaticTurn ?? 'nothing') !== 'nothing');
    if (turnScenes312.length >= 2 && turnScenes312.every(r => r.emotionalShift === 'neutral')) {
      issues.push({
        location: 'Dramatic-turn scenes',
        rule: 'ARC_TURN_EMOTION_ABSENT',
        severity: 'minor',
        description: `All ${turnScenes312.length} dramatic-turn scenes are emotionally neutral — the protagonist pivots without feeling the pivot. A dramatic turn is a hinge in the character's journey; when it registers no emotional shift, the turn reads as plot machinery the character processes rather than a moment that changes them.`,
        suggestedFix: 'Let each turn land emotionally on the protagonist: a reversal that wounds, a revelation that frightens or frees, a choice that costs. The size of a turn is measured by how much it moves the person at its center — a turn nobody feels is a turn that did not happen.',
      });
    }
  }

  // ── Wave 312: ARC_CURIOSITY_EMOTION_DECOUPLED ────────────────────────────
  // Three or more high-curiosity scenes (curiosityDelta > 1) are all emotionally
  // neutral — the story's most intriguing moments never move the protagonist.
  // Curiosity engages the audience's head; emotion engages their heart. When the
  // story's mysteries land only as puzzles and never as feelings, the audience
  // is interested but not invested. The curiosity analogue of ARC_SUSPENSE_
  // EMOTION_DECOUPLED (which crosses suspense with emotion). Requires 8+ records.
  if (records.length >= 8) {
    const highCuriosity312 = (records as any[]).filter(r => (r.curiosityDelta ?? 0) > 1);
    if (highCuriosity312.length >= 3 && highCuriosity312.every(r => r.emotionalShift === 'neutral')) {
      issues.push({
        location: 'High-curiosity scenes',
        rule: 'ARC_CURIOSITY_EMOTION_DECOUPLED',
        severity: 'minor',
        description: `All ${highCuriosity312.length} high-curiosity scenes (curiosityDelta > 1) are emotionally neutral — the story's most intriguing moments never move the protagonist. Curiosity engages the audience's head and emotion their heart; when the mysteries land only as puzzles and never as feelings, the audience stays interested but never becomes invested.`,
        suggestedFix: 'Fuse intrigue with feeling: the scene that raises the biggest question should also stir the protagonist — dread at what the answer might be, hope that it changes everything, grief at what it implies. A mystery the character cares about is one the audience cares about.',
      });
    }
  }

  // ── Wave 337: ARC_SUSPENSE_CURIOSITY_DECOUPLED, ARC_REVELATION_EMOTION_ABSENT, ARC_REVELATION_CURIOSITY_DECOUPLED ──

  // ARC_SUSPENSE_CURIOSITY_DECOUPLED (minor, n≥8, ≥3 high-suspense scenes):
  // Three or more scenes with suspenseDelta > 1 (genuine tension peaks) all have
  // curiosityDelta ≤ 0 — the story's most dangerous moments never raise a new
  // question in the audience's mind. Tension and wonder are twin engines of
  // engagement; when tension spikes consistently without igniting curiosity,
  // the story feels like a thriller without mystery — all danger, no intrigue,
  // no "but what does this mean?" hanging in the air after each spike.
  // Distinct from ARC_SUSPENSE_EMOTION_DECOUPLED (crosses suspense with emotion,
  // not curiosity) and ARC_CURIOSITY_EMOTION_DECOUPLED (crosses curiosity with
  // emotion, not suspense).
  if (records.length >= 8) {
    const highSuspense337 = (records as any[]).filter(r => (r.suspenseDelta ?? 0) > 1);
    if (highSuspense337.length >= 3 && highSuspense337.every(r => (r.curiosityDelta ?? 0) <= 0)) {
      issues.push({
        location: 'High-suspense scenes',
        rule: 'ARC_SUSPENSE_CURIOSITY_DECOUPLED',
        severity: 'minor',
        description: `All ${highSuspense337.length} high-suspense scenes (suspenseDelta > 1) carry a curiosityDelta of zero or less — the story's tension peaks never ignite audience wonder. Danger should raise questions: "Will they survive?", "Who is behind this?", "What will they do now?" When the most alarming moments consistently fail to spawn new questions, the story delivers adrenaline without intrigue — the audience is scared, but they are not curious.`,
        suggestedFix: 'Let danger generate questions: when the stakes spike, layer in a new unknown — an unexpected face, a missing piece, a revelation that recasts everything just as the threat lands. The best suspense scenes are those where the audience is simultaneously frightened and newly desperate to know something.',
      });
    }
  }

  // ARC_REVELATION_EMOTION_ABSENT (minor, n≥8, ≥2 revelation scenes): Two or more
  // scenes carry a genuine revelation (revelation field set) and every one of them
  // is emotionally neutral — the protagonist receives information without feeling
  // it. A revelation is a character event, not just a plot event; the moment a
  // character learns something that changes the shape of their world, they should
  // be visibly changed by it. If the story's "aha moments" are emotionally flat,
  // the revelations function as data transfers rather than turning points.
  // Distinct from ARC_REVELATION_LATE_CLUSTER (timing), ARC_TURN_EMOTION_ABSENT
  // (dramaticTurn field not revelation), and belief.ts's REVELATION_DRAMA_VACUUM
  // (which additionally requires low suspense — this fires on emotion alone).
  if (records.length >= 8) {
    const revScenes337 = (records as any[]).filter(r => r.revelation !== null && r.revelation !== undefined);
    if (revScenes337.length >= 2 && revScenes337.every(r => r.emotionalShift === 'neutral')) {
      issues.push({
        location: 'Revelation scenes',
        rule: 'ARC_REVELATION_EMOTION_ABSENT',
        severity: 'minor',
        description: `All ${revScenes337.length} revelation scenes are emotionally neutral — the protagonist receives information without being visibly changed by it. A revelation is a character event: the moment a character learns something that reshapes their world, their emotional response is the story's signal to the audience that this matters. When the story's aha moments are all flat, revelations function as data transfers rather than turning points.`,
        suggestedFix: "Give the protagonist a reaction that is felt, not just processed: the revelation might bring relief, dread, grief, rage, or a terrible clarity. The size of a reveal is measured by how much it moves the person who receives it — an aha moment nobody feels is a plot mechanic, not a story beat.",
      });
    }
  }

  // ARC_REVELATION_CURIOSITY_DECOUPLED (minor, n≥8, ≥3 revelation scenes): Three
  // or more revelation scenes have an average curiosityDelta of zero or less — the
  // story's answers close questions without opening new ones. Effective revelations
  // are generative: they resolve one layer of mystery while exposing a deeper one.
  // When revelations consistently fail to raise curiosity, the story's aha moments
  // feel like a ledger being cleared rather than a live system that keeps spinning.
  // Distinct from ARC_REVELATION_EMOTION_ABSENT (emotion on revelation scenes),
  // REVELATION_WITHOUT_CURIOSITY in causality.ts (revelation with no preceding
  // high-curiosity setup — checks setup order, not the revelation's own delta),
  // and ARC_REVELATION_LATE_CLUSTER (timing of revelations).
  if (records.length >= 8) {
    const revScenes337b = (records as any[]).filter(r => r.revelation !== null && r.revelation !== undefined);
    if (revScenes337b.length >= 3) {
      const avgCuriosity337r = revScenes337b.reduce((s: number, r: any) => s + (r.curiosityDelta ?? 0), 0) / revScenes337b.length;
      if (avgCuriosity337r <= 0) {
        issues.push({
          location: `${revScenes337b.length} revelation scene(s) — avg curiosityDelta ${avgCuriosity337r.toFixed(2)}`,
          rule: 'ARC_REVELATION_CURIOSITY_DECOUPLED',
          severity: 'minor',
          description: `${revScenes337b.length} revelation scenes have an average curiosityDelta of ${avgCuriosity337r.toFixed(2)} — the story's answers consistently close questions without opening new ones. A revelation should be generative: resolving one mystery while exposing a deeper layer, so the audience leans forward even as one thread closes. When revelations drain rather than feed curiosity, the story feels like a ledger being cleared — complete, perhaps, but not alive.`,
          suggestedFix: "Design revelations as doors, not walls: each answer should expose a new unknown, reframe what the audience thought they knew, or raise the stakes of a question still open. Let the curiosityDelta on revelation scenes reflect that the audience has been sent hunting, not satisfied.",
        });
      }
    }
  }

  // ── Wave 351: ARC_SECOND_HALF_EMOTIONALLY_FLAT, ARC_EMOTIONAL_RECOVERY_ABSENT, ARC_RELATIONAL_FIRST_HALF_FLAT ──

  // ARC_SECOND_HALF_EMOTIONALLY_FLAT (minor, n≥10, second half ≥5 scenes): Every scene
  // in the second half (50%–100%) is emotionally neutral, while the first half carried at
  // least two non-neutral beats. The protagonist's emotional arc runs out of fuel exactly
  // when the stakes should be peaking — the back half plays at a single flat pitch through
  // the complication, climax, and resolution. The mirror of ARC_FIRST_HALF_EMOTIONALLY_
  // FLAT (a flat front half); distinct from ARC_FINAL_ACT_CHARACTER_STATIC (the final 25%
  // only) — this flags the entire back half going emotionally silent.
  if (records.length >= 10) {
    const halfIdx351 = Math.floor(records.length * 0.5);
    const firstHalf351 = (records as any[]).slice(0, halfIdx351);
    const secondHalf351 = (records as any[]).slice(halfIdx351);
    if (secondHalf351.length >= 5) {
      const secondHalfFlat351 = secondHalf351.every(r => r.emotionalShift === 'neutral');
      const firstHalfCharged351 = firstHalf351.filter(r => r.emotionalShift !== 'neutral').length;
      if (secondHalfFlat351 && firstHalfCharged351 >= 2) {
        issues.push({
          location: `Second half (Scenes ${halfIdx351}–${records.length - 1}) — emotionally flat`,
          rule: 'ARC_SECOND_HALF_EMOTIONALLY_FLAT',
          severity: 'minor',
          description: `Every scene in the second half (${halfIdx351}–${records.length - 1}) is emotionally neutral, while the first half carried ${firstHalfCharged351} charged beats — the protagonist's emotional arc runs out of fuel exactly when the stakes should be peaking. The complication zone, climax, and resolution all play at one flat pitch, so the audience's emotional investment built in the first half is never paid off.`,
          suggestedFix: 'Carry emotion through the back half and intensify it toward the climax: the second half is where the costs come due, so the protagonist should feel them most sharply there. A character who stops reacting at the midpoint reads as a spectator to their own ending.',
        });
      }
    }
  }

  // ARC_EMOTIONAL_RECOVERY_ABSENT (minor, n≥8, ≥2 negative shifts, positives exist): The
  // protagonist suffers two or more negative emotional beats, the story shows positive
  // emotion somewhere — but no positive beat occurs at or after the first negative one.
  // All the protagonist's joy is front-loaded before the fall, and once the descent
  // begins they never rise again. A relentless downslope with no flicker of recovery
  // exhausts the audience and removes the contrast that makes a low point land. Distinct
  // from ARC_NEGATIVE_ONLY (no positives anywhere — here positives exist, only mis-timed),
  // ARC_CATHARSIS_ABSENT (no positive+revelation combination), ARC_EMOTIONAL_RESOLUTION_
  // ABSENT (final-quarter zone), and ARC_GRIEF_SKIPPED (negatives instantly cancelled).
  if (records.length >= 8) {
    const negPositions351 = (records as any[])
      .map((r, i) => ({ r, i }))
      .filter(x => x.r.emotionalShift === 'negative');
    const positiveExists351 = (records as any[]).some(r => r.emotionalShift === 'positive');
    if (negPositions351.length >= 2 && positiveExists351) {
      const firstNegIdx351 = negPositions351[0].i;
      const positiveAfterFall351 = (records as any[]).some((r, i) => i >= firstNegIdx351 && r.emotionalShift === 'positive');
      if (!positiveAfterFall351) {
        issues.push({
          location: `Emotional recovery (first fall at Scene ${(records as any[])[firstNegIdx351].sceneIdx})`,
          rule: 'ARC_EMOTIONAL_RECOVERY_ABSENT',
          severity: 'minor',
          description: `The protagonist suffers ${negPositions351.length} negative emotional beats and the story shows positive emotion elsewhere, but no positive beat lands at or after the first fall (Scene ${(records as any[])[firstNegIdx351].sceneIdx}) — all the joy is front-loaded, and once the descent begins the character never rises again. A relentless downslope with no flicker of recovery exhausts the audience and removes the contrast that makes the lowest point land.`,
          suggestedFix: 'Give the protagonist at least one moment of recovery after the descent begins — a small win, a kindness, a flash of hope — even if it is later snatched away. The rhythm of fall-and-partial-recovery is what keeps a downward arc dramatic rather than merely grim; an unbroken slide numbs.',
        });
      }
    }
  }

  // ARC_RELATIONAL_FIRST_HALF_FLAT (minor, n≥10, first half ≥5 scenes): No scene in the
  // first half (0%–50%) carries a relationship shift, while the second half carries two or
  // more. The protagonist's relational arc does not begin until the back half — the entire
  // setup and first complication zone establish the world without ever moving a bond, so
  // the audience reaches the midpoint with no felt relationships to invest in. The first-
  // half mirror of ARC_MIDPOINT_RELATIONAL_VOID (the 40%–60% zone) and ARC_LATE_RELATIONAL_
  // VOID (the final quarter); distinct from both by targeting the front half.
  if (records.length >= 10) {
    const halfIdx351b = Math.floor(records.length * 0.5);
    const firstHalf351b = (records as any[]).slice(0, halfIdx351b);
    const secondHalf351b = (records as any[]).slice(halfIdx351b);
    if (firstHalf351b.length >= 5) {
      const firstHalfHasShift351 = firstHalf351b.some(r => ((r.relationshipShifts ?? []) as any[]).length > 0);
      const secondHalfShiftScenes351 = secondHalf351b.filter(r => ((r.relationshipShifts ?? []) as any[]).length > 0).length;
      if (!firstHalfHasShift351 && secondHalfShiftScenes351 >= 2) {
        issues.push({
          location: `First half (Scenes 0–${halfIdx351b - 1}) — relationally flat`,
          rule: 'ARC_RELATIONAL_FIRST_HALF_FLAT',
          severity: 'minor',
          description: `No scene in the first half (0–${halfIdx351b - 1}) carries a relationship shift, while the second half carries ${secondHalfShiftScenes351} — the protagonist's relational arc does not begin until the back half. The setup and first complication zone establish the world without ever moving a bond, so the audience reaches the midpoint with no felt relationships to invest in before the story starts changing them.`,
          suggestedFix: 'Move a relationship early: let a bond warm, fray, or shift in the first half so the audience has a relational stake before the midpoint. The connections the back half puts under pressure land harder when the first half has already made the audience care about them.',
        });
      }
    }
  }

  // ── Wave 365: ARC_PEAK_SUSPENSE_EMOTION_ABSENT, ARC_PEAK_CURIOSITY_EMOTION_ABSENT, ARC_RELATIONAL_SHIFT_EMOTION_FLAT ──

  // ARC_PEAK_SUSPENSE_EMOTION_ABSENT (minor, n≥8, maxSuspense>1, emotion exists
  // elsewhere): The single scene with the highest suspenseDelta carries a neutral
  // emotional shift, even though the protagonist shows emotion in at least one other
  // scene. The story's most tense moment leaves the protagonist unmoved — at the
  // peak of danger, the character feels nothing. Distinct from ARC_SUSPENSE_EMOTION_
  // DECOUPLED (which requires ALL ≥3 high-suspense scenes to be neutral; this fires
  // on the single peak even when other high-suspense scenes carry emotion).
  if (records.length >= 8) {
    const maxSuspense365 = Math.max(...(records as any[]).map(r => r.suspenseDelta ?? 0));
    const emotionExists365 = (records as any[]).some(r => r.emotionalShift !== 'neutral');
    if (maxSuspense365 > 1 && emotionExists365) {
      const peakSusp365 = (records as any[]).find(r => (r.suspenseDelta ?? 0) === maxSuspense365);
      if (peakSusp365 && peakSusp365.emotionalShift === 'neutral') {
        issues.push({
          location: `Scene ${peakSusp365.sceneIdx} — peak suspense (${maxSuspense365.toFixed(2)})`,
          rule: 'ARC_PEAK_SUSPENSE_EMOTION_ABSENT',
          severity: 'minor',
          description: `The story's highest-suspense scene (Scene ${peakSusp365.sceneIdx}, suspenseDelta ${maxSuspense365.toFixed(2)}) carries a neutral emotional shift, even though the protagonist shows emotion in other scenes. At the single most tense moment of the story, the character feels nothing — the danger spikes but never touches them, so the audience experiences the peak as plot mechanics rather than as a crisis for someone they care about.`,
          suggestedFix: "Charge the peak-suspense scene emotionally: the moment of maximum danger should be the moment the protagonist feels the most — terror, desperate resolve, the cost of what's at risk. The story's tensest scene is the worst possible place for the character to be a neutral observer.",
        });
      }
    }
  }

  // ARC_PEAK_CURIOSITY_EMOTION_ABSENT (minor, n≥8, maxCuriosity>1, emotion exists
  // elsewhere): The single scene with the highest curiosityDelta carries a neutral
  // emotional shift, even though the protagonist shows emotion in at least one other
  // scene. The story's most intriguing moment — where the audience most wants to know
  // what happens — leaves the protagonist emotionally flat. Intrigue that doesn't move
  // the character reads as a puzzle rather than a stake. Distinct from ARC_CURIOSITY_
  // EMOTION_DECOUPLED (which requires ALL ≥3 high-curiosity scenes neutral; this fires
  // on the single peak) and ARC_PEAK_SUSPENSE_EMOTION_ABSENT (suspense channel).
  if (records.length >= 8) {
    const maxCuriosity365 = Math.max(...(records as any[]).map(r => r.curiosityDelta ?? 0));
    const emotionExists365b = (records as any[]).some(r => r.emotionalShift !== 'neutral');
    if (maxCuriosity365 > 1 && emotionExists365b) {
      const peakCur365 = (records as any[]).find(r => (r.curiosityDelta ?? 0) === maxCuriosity365);
      if (peakCur365 && peakCur365.emotionalShift === 'neutral') {
        issues.push({
          location: `Scene ${peakCur365.sceneIdx} — peak curiosity (${maxCuriosity365.toFixed(2)})`,
          rule: 'ARC_PEAK_CURIOSITY_EMOTION_ABSENT',
          severity: 'minor',
          description: `The story's highest-curiosity scene (Scene ${peakCur365.sceneIdx}, curiosityDelta ${maxCuriosity365.toFixed(2)}) carries a neutral emotional shift, even though the protagonist shows emotion elsewhere. At the moment the audience is most urgently wondering what happens next, the character feels nothing — the intrigue spikes but never lands as a personal stake, so the peak plays as a puzzle to solve rather than a crisis to dread or hope through.`,
          suggestedFix: "Tie the peak-curiosity moment to the protagonist's emotional life: the question the audience is most desperate to answer should also be the one the character most fears or most hopes for. Intrigue becomes drama when the unknown threatens or promises something the protagonist feels.",
        });
      }
    }
  }

  // ARC_RELATIONAL_SHIFT_EMOTION_FLAT (minor, n≥8, ≥3 relationship-shift scenes):
  // Every scene that carries a relationship shift is emotionally neutral — the
  // protagonist's bonds move (warm, cool, fracture, repair) but they register no
  // feeling about any of it. The relational arc proceeds as a ledger of status
  // changes rather than as lived experience. Distinct from relationship-arc.ts's
  // RELATIONSHIP_RUPTURE_EMOTION_FLAT (negative shifts only) and WARMTH_UNFELT
  // (strong positive shifts only): this audits the protagonist's emotional response
  // to ALL relationship movement regardless of direction, from the character-arc side.
  if (records.length >= 8) {
    const shiftScenes365 = (records as any[]).filter(r => ((r.relationshipShifts ?? []) as any[]).length > 0);
    if (shiftScenes365.length >= 3 && shiftScenes365.every(r => r.emotionalShift === 'neutral')) {
      issues.push({
        location: `${shiftScenes365.length} relationship-shift scene(s) — emotional register`,
        rule: 'ARC_RELATIONAL_SHIFT_EMOTION_FLAT',
        severity: 'minor',
        description: `All ${shiftScenes365.length} scenes where a relationship shifts are emotionally neutral — the protagonist's bonds warm, cool, or fracture, but they register no feeling about any of it. The relational arc proceeds as a ledger of status changes rather than as lived experience, so the audience tracks who-relates-to-whom without ever feeling the weight of those connections changing on the person at the center.`,
        suggestedFix: 'Let relationship changes move the protagonist emotionally: a warming bond should bring relief or hope, a cooling one unease or grief. When every relational shift lands in a neutral scene, the bonds read as plot bookkeeping; pair them with the protagonist\'s felt reaction so the relationships matter to the audience because they matter to the character.',
      });
    }
  }

  // ── Wave 379: ARC_EMOTION_CONCENTRATION, ARC_EMOTIONAL_FRONT_LOADED, ARC_NEGATIVE_EMOTION_RUN ──

  // ARC_EMOTION_CONCENTRATION (minor, n≥10, ≥3 charged scenes): All of the protagonist's
  // non-neutral emotional beats fall within a span of ≤20% of the story, while at least
  // half of all scenes are emotionally neutral. The character's emotional life bursts in one
  // chapter and goes flat everywhere else — feeling is a localized event rather than a
  // through-line. The emotional analogue of ARC_SHIFT_CONCENTRATION (which audits relational
  // movement bunched in one burst); distinct from ARC_EMOTIONAL_FLATLINE (≥80% neutral
  // overall, no span requirement) and ARC_EMOTIONAL_FRONT_LOADED (a first-half majority, not
  // a tight span anywhere).
  if (records.length >= 10) {
    const chargedIdxs379: number[] = [];
    for (let i379 = 0; i379 < records.length; i379++) {
      if ((records as any[])[i379].emotionalShift !== 'neutral') chargedIdxs379.push(i379);
    }
    const neutralCount379 = records.length - chargedIdxs379.length;
    if (chargedIdxs379.length >= 3) {
      const span379 = chargedIdxs379[chargedIdxs379.length - 1] - chargedIdxs379[0];
      if (span379 <= Math.floor(records.length * 0.2) && neutralCount379 / records.length >= 0.5) {
        issues.push({
          location: `Emotional beats clustered in Scenes ${(records as any[])[chargedIdxs379[0]].sceneIdx}–${(records as any[])[chargedIdxs379[chargedIdxs379.length - 1]].sceneIdx}`,
          rule: 'ARC_EMOTION_CONCENTRATION',
          severity: 'minor',
          description: `All ${chargedIdxs379.length} of the protagonist's emotional beats fall within a ${span379}-scene span (≤20% of the story), while ${neutralCount379} of ${records.length} scenes are emotionally neutral. The character's emotional life bursts in a single chapter and stays flat before and after it — feeling is a localized event rather than a through-line, so the audience's investment spikes once and then has nothing to ride.`,
          suggestedFix: 'Distribute the protagonist\'s emotional beats across the whole arc: thread reactions, hopes, and wounds through the setup, the middle, and the climax so feeling builds continuously. An arc whose emotion is concentrated in one stretch leaves the rest of the story affectively inert.',
        });
      }
    }
  }

  // ARC_EMOTIONAL_FRONT_LOADED (minor, n≥10, ≥4 charged scenes): More than 70% of the
  // protagonist's non-neutral emotional beats fall in the first half of the story. The
  // character's emotional intensity peaks early and dwindles toward the climax, so the back
  // half — where the stakes should be highest — coasts on the least feeling. Distinct from
  // ARC_SECOND_HALF_EMOTIONALLY_FLAT (the binary case: the entire back half is neutral — this
  // fires even when the back half carries some emotion, as long as it is a small minority) and
  // from ARC_EMOTION_CONCENTRATION (a tight span anywhere, not a first-half majority).
  if (records.length >= 10) {
    const chargedIdxs379b: number[] = [];
    for (let i379b = 0; i379b < records.length; i379b++) {
      if ((records as any[])[i379b].emotionalShift !== 'neutral') chargedIdxs379b.push(i379b);
    }
    if (chargedIdxs379b.length >= 4) {
      const mid379 = Math.floor(records.length * 0.5);
      const firstHalf379 = chargedIdxs379b.filter(i => i < mid379).length;
      if (firstHalf379 / chargedIdxs379b.length > 0.7) {
        issues.push({
          location: `Emotional distribution — ${firstHalf379}/${chargedIdxs379b.length} beats in the first half`,
          rule: 'ARC_EMOTIONAL_FRONT_LOADED',
          severity: 'minor',
          description: `${firstHalf379} of the protagonist's ${chargedIdxs379b.length} emotional beats (${Math.round(firstHalf379 / chargedIdxs379b.length * 100)}%) fall in the first half — emotional intensity peaks early and dwindles toward the climax. The back half, where the stakes should be highest and the cost of the conflict most acute, coasts on the least feeling, so the ending inherits an emotionally spent protagonist.`,
          suggestedFix: 'Reserve the protagonist\'s most charged emotional beats for the back half: the deepest loss, the hardest-won hope, the most acute fear should escalate toward the climax. Emotion, like tension, should build across the arc — not be spent in the opening movement.',
        });
      }
    }
  }

  // ARC_NEGATIVE_EMOTION_RUN (minor, n≥8, run≥4): Four or more consecutive scenes carry
  // emotionalShift='negative' with no positive or neutral beat to break the descent. An
  // unbroken stretch of despair exhausts the audience and erases the contrast that makes any
  // single low point land — relentless gloom reads as monotone, not tragedy. Distinct from
  // ARC_EMOTIONAL_RECOVERY_ABSENT (a whole-story check: no positive at or after the first
  // fall), conflict.ts NEGATIVE_SPIRAL_UNBROKEN (consecutive negative relationship SHIFTS,
  // not emotionalShift), and causality.ts EMOTIONAL_NEUTRAL_RUN (consecutive NEUTRAL scenes).
  if (records.length >= 8) {
    let negRun379 = 0;
    let maxNegRun379 = 0;
    let maxNegStart379 = 0;
    let curStart379 = 0;
    for (let i379n = 0; i379n < records.length; i379n++) {
      if ((records as any[])[i379n].emotionalShift === 'negative') {
        if (negRun379 === 0) curStart379 = i379n;
        negRun379++;
        if (negRun379 > maxNegRun379) { maxNegRun379 = negRun379; maxNegStart379 = curStart379; }
      } else {
        negRun379 = 0;
      }
    }
    if (maxNegRun379 >= 4) {
      const s379 = (records as any[])[maxNegStart379].sceneIdx;
      const e379 = (records as any[])[maxNegStart379 + maxNegRun379 - 1].sceneIdx;
      issues.push({
        location: `Scenes ${s379}–${e379} — unbroken negative run (${maxNegRun379} scenes)`,
        rule: 'ARC_NEGATIVE_EMOTION_RUN',
        severity: 'minor',
        description: `${maxNegRun379} consecutive scenes (${s379}–${e379}) carry a negative emotional shift with no positive or neutral beat to break the descent. An unbroken stretch of despair exhausts the audience and erases the contrast that makes any single low point land — relentless gloom reads as monotone rather than tragedy, and the audience numbs to suffering that never lets up.`,
        suggestedFix: 'Break the descent with at least one beat of relief, hope, or even grim humor inside the run — a small win later snatched away, a moment of connection before the next blow. The rhythm of fall-and-respite is what keeps a downward arc dramatic; an unbroken slide flattens into noise.',
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
