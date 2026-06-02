// Wave 138 — Pass 6: Character Arc
// Checks arc completion: characters who start and end in the same emotional
// state, arcs without turning point, transformation without cause.
// Wave 138 additions: per-character relational arc tracking using relationship
// shift data — detects characters present throughout the story who have zero
// relational movement (CHARACTER_ARC_RELATIONAL_STASIS) and identifies when
// the protagonist has no relationship arc despite being present everywhere
// (CHARACTER_ARC_PROTAGONIST_PASSIVE).

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
