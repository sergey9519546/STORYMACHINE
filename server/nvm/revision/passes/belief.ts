// Wave 39 — Pass 4: Belief/Deception
// Checks belief tracking and deception layers: lies that aren't set up,
// belief reversals without evidence, deception without consequence.
// Wave 145 additions: deception consequence tracking (lies that are never
// discovered or create conflict), belief reversals with evidence checking,
// and belief isolation (crucial beliefs never expressed).

import type { PassInput, PassResult, RevisionIssue } from './types.ts';
import { rewritePass } from '../rewrite.ts';

export async function beliefPass(input: PassInput): Promise<PassResult> {
  const { fountain, records, annotations, approvedSpans } = input;
  const issues: RevisionIssue[] = [];

  // ── Track belief propositions and their sources ────────────────────────────
  const toldBeliefs: Array<{ sceneIdx: number; proposition: string; slug: string }> = [];
  const witnessedBeliefs: Array<{ sceneIdx: number; proposition: string }> = [];

  for (const r of records) {
    for (const highlight of r.dialogueHighlights) {
      // Highlights are formatted as "charId: proposition"
      const colonIdx = highlight.indexOf(':');
      if (colonIdx > -1) {
        const prop = highlight.slice(colonIdx + 1).trim();
        toldBeliefs.push({ sceneIdx: r.sceneIdx, proposition: prop, slug: r.slug });
      }
    }
    if (r.revelation !== null) {
      witnessedBeliefs.push({ sceneIdx: r.sceneIdx, proposition: r.revelation });
    }
  }

  // ── Told belief without prior setup ────────────────────────────────────────
  // A told belief that contradicts a witnessed belief without any intermediate
  // scene is a deception that wasn't set up
  for (const told of toldBeliefs) {
    const relatedWitnessed = witnessedBeliefs.filter(w =>
      w.sceneIdx < told.sceneIdx &&
      // Very rough overlap check: shared significant words
      sharedWords(w.proposition, told.proposition) >= 2
    );
    // If there IS a witnessed fact that contradicts what's being told, that's a deception
    // that's fine — but if there's no prior context at all, it's a belief orphan
    if (relatedWitnessed.length === 0 && told.sceneIdx > 0) {
      // Only flag if the proposition seems significant (not trivial facts)
      if (told.proposition.split(' ').length >= 4) {
        issues.push({
          location: `Scene ${told.sceneIdx} (${told.slug})`,
          rule: 'BELIEF_WITHOUT_CONTEXT',
          description: `A character asserts "${told.proposition.slice(0, 60)}..." with no prior contextual setup`,
          severity: 'minor',
          suggestedFix: 'Add an earlier moment where the audience has reason to believe or disbelieve this claim',
        });
      }
    }
  }

  // ── Revelation without any prior told-belief contradiction ─────────────────
  // A revelation that reveals nothing we were previously told is a weak surprise
  for (const witnessed of witnessedBeliefs) {
    const priorToldBeliefs = toldBeliefs.filter(t => t.sceneIdx < witnessed.sceneIdx);
    if (priorToldBeliefs.length === 0 && witnessed.sceneIdx > 1) {
      issues.push({
        location: `Scene ${witnessed.sceneIdx}`,
        rule: 'REVELATION_UNEARNED',
        description: 'A revelation scene delivers new information but no prior misinformation/deception makes it land as a reversal',
        severity: 'major',
        suggestedFix: 'Plant a false belief in an earlier scene that this revelation will overturn',
      });
    }
  }

  // ── Consecutive told-beliefs with no witness ───────────────────────────────
  // More than 3 told beliefs in a row without any witnessed belief = exposition dump
  let consecutiveTold = 0;
  let expositionStartScene = -1;
  for (const r of records) {
    if (r.dialogueHighlights.length > 0 && r.revelation === null) {
      if (consecutiveTold === 0) expositionStartScene = r.sceneIdx;
      consecutiveTold++;
    } else {
      consecutiveTold = 0;
    }
    if (consecutiveTold >= 3) {
      issues.push({
        location: `Scenes ${expositionStartScene}–${r.sceneIdx}`,
        rule: 'EXPOSITION_DUMP',
        description: `Scenes ${expositionStartScene}–${r.sceneIdx}: 3+ consecutive scenes deliver told beliefs with no witnessed confirmation — exposition feels inert`,
        severity: 'major',
        suggestedFix: 'Break the exposition streak with a scene that shows rather than tells the key information',
      });
      consecutiveTold = 0; // reset to avoid duplicate flags
    }
  }

  // ── Wave 145: Deception consequence & belief reversals ──────────────────────

  // DECEPTION_WITHOUT_CONSEQUENCE: A character is told something false (lies or
  // deliberately misleads) but the deception is never discovered by another
  // character or creates conflict. The lie exists but has zero narrative impact.
  for (const told of toldBeliefs) {
    // Find witnessed facts that contradict the told belief (indicating a lie)
    const contradiction = witnessedBeliefs.find(w =>
      w.sceneIdx > told.sceneIdx &&
      sharedWords(w.proposition, told.proposition) >= 2
    );

    if (contradiction) {
      // There IS a contradiction, so this is a lie. Now check if the lie has consequence.
      // Consequence = another character reacts (relationship shift) after learning the truth,
      // or high suspense after the truth is revealed.
      let hasConsequence = false;
      for (let i = contradiction.sceneIdx + 1; i < Math.min(contradiction.sceneIdx + 3, records.length); i++) {
        const followup = records[i];
        if ((followup.relationshipShifts?.length ?? 0) > 0 || followup.suspenseDelta > 1.5) {
          hasConsequence = true;
          break;
        }
      }

      if (!hasConsequence && contradiction.sceneIdx < records.length - 2) {
        issues.push({
          location: `Scene ${told.sceneIdx} (${told.slug}) → Scene ${contradiction.sceneIdx}`,
          rule: 'DECEPTION_WITHOUT_CONSEQUENCE',
          description: `Character is told "${told.proposition.slice(0, 60)}..." at Scene ${told.sceneIdx}, but the truth (revealed Scene ${contradiction.sceneIdx}) creates no relationship rupture or escalation — the lie is discovered but ignored`,
          severity: 'major',
          suggestedFix: 'Add a confrontation or consequence scene where the character discovering the lie reacts emotionally or shifts their relationship with the liar',
        });
      }
    }
  }

  // BELIEF_REVERSAL_UNSUPPORTED: A character shifts their emotional state sharply
  // (high suspense delta or negative emotional shift) but there's no prior scene
  // planting a clue or raising a question that would justify the reversal.
  // This indicates the character changed their mind/emotional stance without evidence.
  for (let i = 1; i < records.length; i++) {
    const curr = records[i];
    const prev = records[i - 1];

    // Detect reversal: significant swing in suspense delta or emotional tone flip
    const isBigReversal = (curr.suspenseDelta > 2 && prev.suspenseDelta < 0.5) ||
      (curr.emotionalShift !== prev.emotionalShift && curr.emotionalShift !== 'neutral');

    if (isBigReversal && i >= 2) {
      // Check if there was a clue or question planted in the 2 prior scenes
      let hasSetup = false;
      for (let j = Math.max(0, i - 2); j < i; j++) {
        const setup = records[j];
        if ((setup.seededClueIds?.length ?? 0) > 0 || setup.revelation !== null) {
          hasSetup = true;
          break;
        }
      }

      if (!hasSetup) {
        issues.push({
          location: `Scene ${i} (${curr.slug})`,
          rule: 'BELIEF_REVERSAL_UNSUPPORTED',
          description: `Scene ${i} shows a major emotional or belief shift (suspense from ${prev.suspenseDelta} to ${curr.suspenseDelta}, mood ${prev.emotionalShift}→${curr.emotionalShift}) but no prior clue or revelation justifies the change — the reversal feels unmotivated`,
          severity: 'major',
          suggestedFix: 'Plant a revelatory moment 1-2 scenes before that explains why the character changed their belief or emotional stance',
        });
      }
    }
  }

  // BELIEF_ISOLATION: A character has planted clues (indicating they're learning or
  // hiding knowledge) but never expresses this belief in dialogue highlights. The
  // belief is interior but never made legible to the audience, making the character's
  // motivation opaque.
  const scenesWithClues = records.filter(r => (r.seededClueIds?.length ?? 0) > 0);
  for (const scene of scenesWithClues) {
    const hasDialogue = scene.dialogueHighlights.length > 0;
    if (!hasDialogue && records.length >= 5) {
      // Only flag if this is a middle scene (not setup or epilogue) and there's enough story length
      const isMiddle = scene.sceneIdx > 0 && scene.sceneIdx < records.length - 1;
      if (isMiddle) {
        issues.push({
          location: `Scene ${scene.sceneIdx} (${scene.slug})`,
          rule: 'BELIEF_ISOLATION',
          description: `Scene ${scene.sceneIdx} plants clues (seeding knowledge) but has no dialogue highlights — the character's belief or discovery is kept entirely internal, making their motivation invisible to the audience`,
          severity: 'major',
          suggestedFix: 'Add a line of dialogue or internal monologue where the character expresses or reacts to the clue they\'ve discovered',
        });
      }
    }
  }

  const { revised, usedLLM } = await rewritePass({ fountain, issues, passName: 'belief', approvedSpans, storyContext: input.storyContext, priorPassResults: input.priorPassResults });
  const changed = revised !== fountain;

  return {
    pass: 'belief',
    issues,
    revisedFountain: revised,
    changed,
    summary: issues.length === 0
      ? 'Belief/deception pass: belief tracking is sound'
      : `Belief/deception pass: ${issues.length} issue(s) — ${usedLLM ? 'rewritten' : 'flagged (stub mode)'}`,
  };
}

function sharedWords(a: string, b: string): number {
  const stopwords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'has', 'have', 'had', 'that', 'this', 'it', 'he', 'she', 'they', 'we', 'in', 'on', 'at', 'to', 'of', 'and', 'or', 'but', 'not']);
  const wordsA = new Set(a.toLowerCase().split(/\W+/).filter(w => w.length > 3 && !stopwords.has(w)));
  const wordsB = b.toLowerCase().split(/\W+/).filter(w => w.length > 3 && !stopwords.has(w));
  return wordsB.filter(w => wordsA.has(w)).length;
}
