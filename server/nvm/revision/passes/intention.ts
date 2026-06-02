// Wave 39 — Pass 3: Intention
// Checks character intention clarity: characters acting without readable goals,
// want/fear asymmetry, unmotivated entrances.

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
        // Purposes that stall narrative momentum when repeated 3+ times
        const lowMomentumPurposes = new Set([
          'establish_world', 'character_moment', 'dialogue_exposition',
          'reflection', 'transition', 'introduction', 'recap',
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
