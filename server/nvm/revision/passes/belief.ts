// Wave 39 — Pass 4: Belief/Deception
// Checks belief tracking and deception layers: lies that aren't set up,
// belief reversals without evidence, deception without consequence.
// Wave 145 additions: deception consequence tracking (lies that are never
// discovered or create conflict), belief reversals with evidence checking,
// and belief isolation (crucial beliefs never expressed).
// Wave 159 additions: revelation isolated (discovery happens with no character
// reaction in dialogue), told-belief domination (>70% tell vs show), and
// belief asymmetry (one character dominates the deception layer 3:1 or more).

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

  // ── Wave 159: Revelation isolated, told domination, belief asymmetry ─────────

  // REVELATION_ISOLATED: A scene contains a revelation but neither the scene
  // itself nor its immediate neighbors have any character dialogue. The discovery
  // happens in silence — no character processes, reacts to, or articulates what
  // they've just witnessed. Revelations need a human voice to resonate.
  if (records.length >= 5) {
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      if (r.revelation === null) continue;

      const prevHasDialogue = i > 0 && records[i - 1].dialogueHighlights.length > 0;
      const currHasDialogue = r.dialogueHighlights.length > 0;
      const nextHasDialogue = i < records.length - 1 && records[i + 1].dialogueHighlights.length > 0;

      if (!prevHasDialogue && !currHasDialogue && !nextHasDialogue) {
        issues.push({
          location: `Scene ${i} (${r.slug})`,
          rule: 'REVELATION_ISOLATED',
          description: `Scene ${i} contains a revelation ("${String(r.revelation).slice(0, 60)}") but no character dialogue appears in this or adjacent scenes — the discovery happens in silence with no human reaction`,
          severity: 'major',
          suggestedFix: 'Add dialogue in the revelation scene or the scene immediately after where a character processes, denies, or responds to what they\'ve just witnessed',
        });
      }
    }
  }

  // TOLD_BELIEF_DOMINATION: More than 70% of belief-content scenes (scenes with
  // dialogueHighlights or a revelation) are told-only — the story relies on
  // characters asserting facts in dialogue rather than letting the audience
  // witness them directly. Requires 6+ records and 4+ belief scenes.
  if (records.length >= 6) {
    const beliefScenes = records.filter(r => r.dialogueHighlights.length > 0 || r.revelation !== null);
    if (beliefScenes.length >= 4) {
      const toldOnlyCount = beliefScenes.filter(r => r.dialogueHighlights.length > 0 && r.revelation === null).length;
      const toldRatio = toldOnlyCount / beliefScenes.length;
      if (toldRatio > 0.7) {
        issues.push({
          location: 'Belief/revelation layer',
          rule: 'TOLD_BELIEF_DOMINATION',
          description: `${toldOnlyCount} of ${beliefScenes.length} belief scenes (${Math.round(toldRatio * 100)}%) are told-only with no witnessed revelation — the story tells far more than it shows`,
          severity: 'major',
          suggestedFix: 'Convert at least one told-belief scene to a witnessed event — let the audience discover the truth through action or direct observation rather than a character asserting it',
        });
      }
    }
  }

  // BELIEF_ASYMMETRY: One character accounts for 3× or more belief appearances
  // than any other character. The belief/deception layer is dominated by a single
  // voice while others remain belief-opaque — creating thin psychological texture.
  // Requires 6+ records and 4+ total dialogueHighlights.
  if (records.length >= 6) {
    const charBeliefCounts = new Map<string, number>();
    for (const r of records) {
      for (const h of r.dialogueHighlights) {
        const m = h.match(/^(\w+):/);
        if (m) charBeliefCounts.set(m[1], (charBeliefCounts.get(m[1]) ?? 0) + 1);
      }
    }
    const totalBeliefs = Array.from(charBeliefCounts.values()).reduce((s, v) => s + v, 0);
    if (totalBeliefs >= 4 && charBeliefCounts.size >= 2) {
      const sorted = [...charBeliefCounts.values()].sort((a, b) => b - a);
      const maxCount = sorted[0];
      const secondCount = sorted[1] ?? 0;
      if (secondCount > 0 && maxCount >= secondCount * 3) {
        const dominantChar = [...charBeliefCounts.entries()].find(([, v]) => v === maxCount)?.[0] ?? '';
        issues.push({
          location: 'Belief distribution',
          rule: 'BELIEF_ASYMMETRY',
          description: `"${dominantChar}" accounts for ${maxCount} of ${totalBeliefs} belief appearances (${Math.round(maxCount / totalBeliefs * 100)}%) — the deception layer is dominated by a single voice; other characters remain psychologically opaque`,
          severity: 'minor',
          suggestedFix: 'Give secondary characters more belief-revealing moments — let other characters express, discover, or challenge beliefs to create a multi-perspective deception layer',
        });
      }
    }
  }

  // ── Wave 175: Revelation clustering, belief stagnation, scene overload ───────

  // REVELATION_CLUSTERING: Three or more revelations crammed into a single
  // 3-scene window. The audience needs room between reversals to absorb each
  // one; a flood of discoveries in quick succession blunts every individual
  // surprise. Distinct from causality's front-loading (first-half bias) — this
  // is a local density spike anywhere in the story.
  if (records.length >= 8) {
    for (let i = 0; i + 3 <= records.length; i++) {
      const window = records.slice(i, i + 3);
      const revCount = window.filter(r => r.revelation !== null).length;
      if (revCount >= 3) {
        issues.push({
          location: `Scenes ${i}–${i + 2}`,
          rule: 'REVELATION_CLUSTERING',
          description: `Scenes ${i}–${i + 2} contain ${revCount} revelations in a row — a flood of reversals in a three-scene window. The audience has no room to absorb one discovery before the next arrives, and every surprise lands softer for it.`,
          severity: 'major',
          suggestedFix: 'Space the revelations out. Let a reversal breathe — give the characters (and the audience) a scene to react and recalibrate before the next truth lands. Bank some of these discoveries for later acts.',
        });
        break;
      }
    }
  }

  // BELIEF_STAGNATION: The story carries substantial belief content (4+ told
  // beliefs and at least one witnessed revelation) yet no told belief is ever
  // contradicted by a later witnessed fact — nobody ever turns out to be wrong.
  // The belief/deception layer is static: assertions accumulate but none reverse.
  if (records.length >= 6 && toldBeliefs.length >= 4 && witnessedBeliefs.length >= 1) {
    const hasAnyContradiction = toldBeliefs.some(told =>
      witnessedBeliefs.some(w => w.sceneIdx > told.sceneIdx && sharedWords(w.proposition, told.proposition) >= 2),
    );
    if (!hasAnyContradiction) {
      issues.push({
        location: 'Belief/deception layer',
        rule: 'BELIEF_STAGNATION',
        description: `Across ${toldBeliefs.length} told beliefs and ${witnessedBeliefs.length} revelation(s), no asserted belief is ever overturned by a later discovery — nobody is ever proven wrong. The belief layer accumulates assertions but never reverses one.`,
        severity: 'major',
        suggestedFix: 'Plant a belief in dialogue that a later scene contradicts. The engine of drama is a character acting on a false belief and paying for it — at least one thing a character is sure of should turn out to be wrong.',
      });
    }
  }

  // SINGLE_SCENE_BELIEF_OVERLOAD: One scene crams five or more separate belief
  // assertions into its dialogue with no witnessed revelation — an information
  // cram where the audience is asked to track too many propositions at once.
  // Distinct from EXPOSITION_DUMP (consecutive told-only scenes); this is a
  // single overloaded scene.
  if (records.length >= 4) {
    for (const r of records) {
      if (r.revelation === null && r.dialogueHighlights.length >= 5) {
        issues.push({
          location: `Scene ${r.sceneIdx} (${r.slug})`,
          rule: 'SINGLE_SCENE_BELIEF_OVERLOAD',
          description: `Scene ${r.sceneIdx} packs ${r.dialogueHighlights.length} separate belief assertions into one scene with no witnessed payoff — the audience is asked to track too many propositions at once, and none of them register.`,
          severity: 'minor',
          suggestedFix: 'Distribute these assertions across multiple scenes, or cut to the two or three that actually matter. A scene that establishes one belief clearly beats a scene that establishes five forgettably.',
        });
        break;
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
