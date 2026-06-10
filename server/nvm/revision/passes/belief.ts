// Wave 39 — Pass 4: Belief/Deception
// Checks belief tracking and deception layers: lies that aren't set up,
// belief reversals without evidence, deception without consequence.
// Wave 145 additions: deception consequence tracking (lies that are never
// discovered or create conflict), belief reversals with evidence checking,
// and belief isolation (crucial beliefs never expressed).
// Wave 159 additions: revelation isolated (discovery happens with no character
// reaction in dialogue), told-belief domination (>70% tell vs show), and
// belief asymmetry (one character dominates the deception layer 3:1 or more).
// Wave 253 additions: revelation Act 2a desert (no discovery in the first
// complication zone), belief echo chamber (same unverified claim repeated 3+
// scenes), adjacent deception payoff (lie and unmasking in neighbouring scenes).
// Wave 267 additions: belief front loaded (all told beliefs in first half only),
// revelation final act only (all discoveries confined to the final quarter),
// told belief clustering (3+ assertions in a single scene).
// Wave 281 additions: revelation drama vacuum (all revelations in emotionally flat scenes),
// Act 2b belief void (no beliefs or revelations in 50%–75% escalation zone),
// told belief final scene (final scene ends on an unresolved assertion).
// Wave 295 additions: revelation suspense decoupled (revelation scenes avg suspenseDelta ≤ 0),
// belief orphan (told belief in first half has no revelation in second half for same subject),
// revelation density drop (second half has fewer revelations than first half despite 3+ total).

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

  // ── Wave 190: Cold open void, unresolved excess, back-weighted revelations ───

  // COLD_OPEN_BELIEF_VOID: The first quarter of the story carries no told beliefs
  // and no revelations — the deception layer has no Act 1 foundation. Without
  // early propositions to hold, the audience has nothing to believe or disbelieve
  // when the complications arrive.
  if (records.length >= 8) {
    const act1BelEnd = Math.floor(records.length * 0.25);
    const act1BelRecords = records.slice(0, act1BelEnd);
    if (act1BelRecords.length >= 2) {
      const hasBelief = act1BelRecords.some(r => r.dialogueHighlights.length > 0 || r.revelation !== null);
      if (!hasBelief) {
        issues.push({
          location: 'Act 1 belief layer',
          rule: 'COLD_OPEN_BELIEF_VOID',
          severity: 'minor',
          description: `The first ${act1BelEnd} scenes contain no belief assertions or witnessed revelations — the story's deception layer has no Act 1 foundation. The audience enters with nothing to believe or question.`,
          suggestedFix: 'Plant at least one told belief or witnessed fact in Act 1. Give the audience a proposition to carry before the story complicates it.',
        });
      }
    }
  }

  // UNRESOLVED_BELIEF_EXCESS: Four or more told beliefs accumulate across the
  // story with no corresponding revelation (before or after) that shares significant
  // vocabulary — every assertion is left permanently unaddressed. Too many orphaned
  // beliefs signal a belief layer that asserts without ever resolving.
  if (records.length >= 8 && toldBeliefs.length >= 4) {
    const orphanedBeliefs = toldBeliefs.filter(told =>
      !witnessedBeliefs.some(w => sharedWords(w.proposition, told.proposition) >= 2),
    );
    if (orphanedBeliefs.length >= 4) {
      issues.push({
        location: 'Belief/deception layer',
        rule: 'UNRESOLVED_BELIEF_EXCESS',
        severity: 'major',
        description: `${orphanedBeliefs.length} told beliefs accumulate across the story with no corresponding revelation to confirm or contradict them — too many assertions are left permanently unaddressed.`,
        suggestedFix: 'Resolve the key beliefs through witnessed scenes. A belief that is never confirmed or contradicted is narrative dead weight — give the audience the payoff they were promised.',
      });
    }
  }

  // REVELATION_BACK_WEIGHTED: When there are two or more revelations, 80%+ occur
  // in the final quarter — the story withholds all discovery until the end. While
  // a final reveal can be powerful, piling every revelation into the last act denies
  // the audience mid-story discovery arcs and makes the ending feel like a trick.
  if (records.length >= 8 && witnessedBeliefs.length >= 2) {
    const finalQStart = Math.floor(records.length * 0.75);
    const inFinalQ = witnessedBeliefs.filter(w => w.sceneIdx >= finalQStart).length;
    if (inFinalQ / witnessedBeliefs.length >= 0.8) {
      issues.push({
        location: 'Revelation distribution',
        rule: 'REVELATION_BACK_WEIGHTED',
        severity: 'minor',
        description: `${inFinalQ} of ${witnessedBeliefs.length} revelations (${Math.round((inFinalQ / witnessedBeliefs.length) * 100)}%) occur in the final quarter — the story withholds all discovery until the end, denying the audience mid-story revelation arcs.`,
        suggestedFix: 'Move at least one revelation earlier. A mid-story discovery raises stakes for the second half; withholding everything until the end feels like a trick rather than a journey.',
      });
    }
  }

  // ── Wave 199: Midpoint void, single revelation, revelation delayed ────────

  // BELIEF_MIDPOINT_VOID: The midpoint zone (40%–60%) carries no told beliefs
  // and no witnessed revelations. The structural pivot has no belief/deception
  // activity — the story shifts gear without any information exchange to motivate
  // the transition.
  if (records.length >= 8) {
    const beliefMidStart = Math.floor(records.length * 0.4);
    const beliefMidEnd = Math.floor(records.length * 0.6);
    const midBelRecs = records.slice(beliefMidStart, beliefMidEnd);
    if (midBelRecs.length >= 2) {
      const hasMidBelief = midBelRecs.some(r =>
        r.dialogueHighlights.length > 0 || r.revelation !== null,
      );
      if (!hasMidBelief) {
        issues.push({
          location: `Midpoint zone (Scenes ${beliefMidStart}–${beliefMidEnd - 1})`,
          rule: 'BELIEF_MIDPOINT_VOID',
          description: `The midpoint zone (Scenes ${beliefMidStart}–${beliefMidEnd - 1}) contains no told beliefs and no revelations — the story's structural pivot has no information exchange to motivate it`,
          severity: 'minor',
          suggestedFix: 'Add at least one belief beat to the midpoint zone: a character asserting something important, or a scene that witnesses a key truth. The midpoint is where the story\'s question becomes most urgent — it should carry a belief beat.',
        });
      }
    }
  }

  // SINGLE_REVELATION_STORY: Across 8+ scenes, there is exactly one witnessed
  // revelation. A single fact witnessed in the whole story is insufficient —
  // the audience has only one anchor point in the deception layer. Characters
  // assert freely and the story confirms almost nothing.
  if (records.length >= 8 && witnessedBeliefs.length === 1) {
    issues.push({
      location: 'Revelation layer',
      rule: 'SINGLE_REVELATION_STORY',
      description: `The entire story contains exactly one witnessed revelation across ${records.length} scenes — almost everything is asserted and almost nothing is confirmed. The belief layer has a single anchor point and no arc.`,
      severity: 'minor',
      suggestedFix: 'Add at least one more revelation: a scene where the audience directly witnesses a truth rather than hearing a character assert it. Multiple revelations create a discovery arc — the audience\'s understanding of the world updates and deepens across the story.',
    });
  }

  // REVELATION_DELAYED: Two or more told beliefs exist (characters assert things
  // in dialogue) but the first witnessed revelation occurs past the story's
  // midpoint. The audience spends the first half taking characters at their word
  // with no confirmation or contradiction — building unearned trust (or suspicion)
  // that should be interrogated much earlier.
  if (records.length >= 6 && toldBeliefs.length >= 2 && witnessedBeliefs.length >= 1) {
    const firstRevIdx = witnessedBeliefs[0].sceneIdx;
    const midpointThreshold = records.length * 0.5;
    if (firstRevIdx > midpointThreshold) {
      issues.push({
        location: `First revelation at Scene ${firstRevIdx}`,
        rule: 'REVELATION_DELAYED',
        description: `Characters make assertions from the start but the first witnessed fact doesn't arrive until Scene ${firstRevIdx} — ${Math.round(firstRevIdx / records.length * 100)}% through the story. The audience spends the first half with no witnessed verification of what they're being told.`,
        severity: 'major',
        suggestedFix: 'Move the first revelation before the midpoint. An early witnessed fact grounds the audience in what is objectively true, giving them a reference point to measure the characters\' assertions against.',
      });
    }
  }

  // ── Wave 211: Revelation Act 3 void, late deception plant, belief resolution absent ──

  // REVELATION_ACT3_VOID: Act 3 (last 25%) carries no witnessed revelations at all,
  // despite 3+ revelations landing in the first 75%. The story's climax zone delivers
  // no new truth — every discovery has already happened and the audience enters the
  // final act with complete information. A climax without revelation can feel like
  // execution rather than discovery: the protagonist acts on knowledge they already have,
  // without the galvanising moment of finding out something new.
  if (records.length >= 8 && witnessedBeliefs.length >= 3) {
    const act3RevStart211 = Math.floor(records.length * 0.75);
    const inAct3Rev211 = witnessedBeliefs.filter(w => w.sceneIdx >= act3RevStart211).length;
    if (inAct3Rev211 === 0 && witnessedBeliefs.length - inAct3Rev211 >= 2) {
      issues.push({
        location: `Act 3 (Scenes ${act3RevStart211}–${records.length - 1}) — revelation zone`,
        rule: 'REVELATION_ACT3_VOID',
        severity: 'minor',
        description: `${witnessedBeliefs.length} revelations land in the first 75% of the story but none reach Act 3 — the climax delivers no new discovery. The audience enters the final act with complete information and watches execution rather than revelation.`,
        suggestedFix: 'Move at least one revelation into Act 3, or engineer a new one: a truth that the protagonist learns in the climax that recontextualises everything — the revelation that makes the final choice inevitable rather than obvious.',
      });
    }
  }

  // LATE_DECEPTION_PLANT: A deception is set up (told belief contradicted by a later
  // witnessed revelation) but the false belief is planted in the final 40% of the
  // story — too close to its own revelation to have had time to mislead the audience.
  // A deception needs distance between the lie and its unmasking; a lie introduced in
  // the final act and immediately exposed is a twist, not a slow burn.
  if (records.length >= 8) {
    const lateCutoff211 = Math.floor(records.length * 0.6);
    const lateToldBeliefs = toldBeliefs.filter(told => told.sceneIdx >= lateCutoff211);
    for (const told211 of lateToldBeliefs) {
      const contradiction211 = witnessedBeliefs.find(w =>
        w.sceneIdx > told211.sceneIdx && sharedWords(w.proposition, told211.proposition) >= 2,
      );
      if (contradiction211) {
        issues.push({
          location: `Scene ${told211.sceneIdx} (${told211.slug})`,
          rule: 'LATE_DECEPTION_PLANT',
          severity: 'minor',
          description: `A deception is introduced at Scene ${told211.sceneIdx} (${Math.round(told211.sceneIdx / records.length * 100)}% through the story) and contradicted by a revelation at Scene ${contradiction211.sceneIdx} — the lie is planted and exposed in the same act. The audience has no time to be genuinely misled.`,
          suggestedFix: 'Move the false belief into Act 1 or early Act 2 so it has time to settle before the revelation overturns it. Effective deception requires the audience to carry the lie long enough to believe it — at least half the story.',
        });
        break;
      }
    }
  }

  // BELIEF_RESOLUTION_ABSENT: The story has a developed belief/revelation arc (2+
  // witnessed revelations) but none occur in the final 20% — the closing section
  // delivers no truth. The belief layer's arc closes before the climax, leaving
  // the story's ending informationally static. The audience's final impression is
  // of action without discovery — the last thing they see is characters executing
  // on knowledge they already had, not characters finding out something that matters.
  if (records.length >= 8 && witnessedBeliefs.length >= 2) {
    const finalZoneStart211 = Math.floor(records.length * 0.8);
    const inFinalZone211 = witnessedBeliefs.filter(w => w.sceneIdx >= finalZoneStart211).length;
    if (inFinalZone211 === 0) {
      issues.push({
        location: `Final zone (Scenes ${finalZoneStart211}–${records.length - 1}) — revelation`,
        rule: 'BELIEF_RESOLUTION_ABSENT',
        severity: 'major',
        description: `${witnessedBeliefs.length} revelations land across the story but none reach the final 20% — the closing scenes deliver no new discovery. The belief arc resolves before the climax; the ending is informationally static.`,
        suggestedFix: 'Ensure the story\'s climax or denouement delivers at least one witnessed revelation — a truth that changes the audience\'s understanding of everything that happened. The final revelation is the story\'s last word on what was real.',
      });
    }
  }

  // ── Wave 225: DECEPTION_SETUP_VOID ───────────────────────────────────────
  // Two or more told beliefs planted in the first 40% of the story are
  // "orphaned" — no witnessed revelation at any point shares enough vocabulary
  // to confirm or contradict them. Early-planted propositions are promises: the
  // audience internalises them and waits for the story to address them. When
  // those promises are never redeemed — neither confirmed nor overturned — the
  // Act 1 belief layer is hollow. Requires 8+ records and 2+ told beliefs.
  if (records.length >= 8 && toldBeliefs.length >= 2) {
    const earlyBelCutoff225 = Math.floor(records.length * 0.4);
    const earlyToldBeliefs225 = toldBeliefs.filter(t => t.sceneIdx <= earlyBelCutoff225);
    if (earlyToldBeliefs225.length >= 2) {
      const earlyOrphans225 = earlyToldBeliefs225.filter(told =>
        !witnessedBeliefs.some(w => sharedWords(w.proposition, told.proposition) >= 2),
      );
      if (earlyOrphans225.length >= 2) {
        const sample225 = earlyOrphans225.slice(0, 2)
          .map(t => `"${t.proposition.slice(0, 45)}${t.proposition.length > 45 ? '…' : ''}"`)
          .join('; ');
        issues.push({
          location: `Act 1 belief layer (Scenes 0–${earlyBelCutoff225})`,
          rule: 'DECEPTION_SETUP_VOID',
          severity: 'major',
          description: `${earlyOrphans225.length} told beliefs planted in the first 40% of the story are never confirmed or contradicted by any witnessed revelation — early-planted propositions (${sample225}) are promises to the audience that the story never redeems.`,
          suggestedFix: `Every early-planted assertion should be paid off: a scene that confirms it (validating the audience) or one that overturns it (delivering the twist they were waiting for). An unresolved early belief is a broken contract with the audience.`,
        });
      }
    }
  }

  // ── Wave 225: BELIEF_FRONT_LOADED_REVELATIONS ────────────────────────────
  // More than 70% of witnessed revelations land in the first half of the story.
  // The audience exhausts its major discoveries before the midpoint — Act 2b
  // and Act 3 are informationally dry. The climax plays out against complete
  // audience knowledge, draining the final act of the discovery energy that
  // galvanises dramatic resolution. Distinct from REVELATION_BACK_WEIGHTED
  // (its inverse). Requires 8+ records and 3+ revelations.
  if (records.length >= 8 && witnessedBeliefs.length >= 3) {
    const midpoint225 = Math.floor(records.length * 0.5);
    const firstHalfRevs225 = witnessedBeliefs.filter(w => w.sceneIdx < midpoint225).length;
    const frontRatio225 = firstHalfRevs225 / witnessedBeliefs.length;
    if (frontRatio225 > 0.7) {
      issues.push({
        location: 'Revelation distribution',
        rule: 'BELIEF_FRONT_LOADED_REVELATIONS',
        severity: 'major',
        description: `${firstHalfRevs225} of ${witnessedBeliefs.length} revelations (${Math.round(frontRatio225 * 100)}%) occur in the first half — the story exhausts its discoveries before the midpoint. Act 2b and Act 3 have nothing left to reveal, leaving the climax informationally static.`,
        suggestedFix: `Reserve at least one major revelation for the second half — preferably the Act 2b turning point or the climax. The revelation that recontextualises everything lands hardest when placed close to the end.`,
      });
    }
  }

  // ── Wave 225: REVELATION_AFTERMATH_ABSENT ────────────────────────────────
  // 60%+ of witnessed revelations have no downstream reaction in the two scenes
  // that follow — no relationship shift, no change in suspense, no new clue
  // planted. The story discovers things without dramatising their impact.
  // A revelation without an aftermath is a fact delivered in a vacuum, not a
  // dramatic event. Requires 8+ records and 2+ revelations.
  if (records.length >= 8 && witnessedBeliefs.length >= 2) {
    const unreactedRevs225 = witnessedBeliefs.filter(w => {
      if (w.sceneIdx >= records.length - 2) return false; // too close to end, exempt
      let hasReaction = false;
      for (let k = w.sceneIdx + 1; k <= Math.min(w.sceneIdx + 2, records.length - 1); k++) {
        const followup = records[k];
        if (followup &&
            ((followup.relationshipShifts?.length ?? 0) > 0 ||
             followup.suspenseDelta !== 0 ||
             (followup.seededClueIds?.length ?? 0) > 0)) {
          hasReaction = true;
          break;
        }
      }
      return !hasReaction;
    });
    const aftermathGapRatio225 = unreactedRevs225.length / witnessedBeliefs.length;
    if (aftermathGapRatio225 >= 0.6) {
      issues.push({
        location: 'Revelation aftermath',
        rule: 'REVELATION_AFTERMATH_ABSENT',
        severity: 'minor',
        description: `${unreactedRevs225.length} of ${witnessedBeliefs.length} revelations (${Math.round(aftermathGapRatio225 * 100)}%) have no downstream reaction in the following two scenes — no relationship shift, no suspense change, no new clue planted. The story discovers things without dramatising their impact.`,
        suggestedFix: `Every revelation should create a ripple. In the scene after the discovery: a relationship cracks, stakes rise, or a new question is planted. A revelation with no aftermath is a fact in a vacuum — give it consequence.`,
      });
    }
  }

  // ── Wave 239: TOLD_BELIEF_ACT3_SURGE ─────────────────────────────────────
  // 3+ told beliefs land in Act 3 (final 25%) and account for 40%+ of all told
  // beliefs — new assertions flood the climax act. Characters should execute on
  // prior beliefs in Act 3, not introduce new ones. An Act 3 surge signals that
  // the story is cramming exposition into the climax rather than earlier acts.
  // Requires 10+ records and 5+ total told beliefs.
  if (records.length >= 10 && toldBeliefs.length >= 5) {
    const act3Start239 = Math.floor(records.length * 0.75);
    const act3ToldBeliefs239 = toldBeliefs.filter(t => t.sceneIdx >= act3Start239);
    if (act3ToldBeliefs239.length >= 3 && act3ToldBeliefs239.length / toldBeliefs.length > 0.4) {
      issues.push({
        location: `Act 3 told beliefs (Scenes ${act3Start239}–${records.length - 1})`,
        rule: 'TOLD_BELIEF_ACT3_SURGE',
        severity: 'minor',
        description: `${act3ToldBeliefs239.length} of ${toldBeliefs.length} told beliefs (${Math.round(act3ToldBeliefs239.length / toldBeliefs.length * 100)}%) land in Act 3 — the story is introducing new assertions in the climax rather than paying off established ones. Act 3 should execute on prior beliefs, not plant new ones.`,
        suggestedFix: 'Move Act 3 belief assertions into Act 1 or Act 2 so the audience carries them through the build. Reserve Act 3 for witnessed revelations and consequence — not new propositions.',
      });
    }
  }

  // ── Wave 239: REVELATION_BELIEF_PROPAGATION_ABSENT ───────────────────────
  // Witnessed revelations exist but none of them triggers any subsequent told
  // belief that shares vocabulary — the discovery layer is disconnected from
  // the assertion layer. Characters witness truths but never change what they
  // say or claim afterward. A revelation that doesn't propagate into subsequent
  // dialogue is informationally inert: the story discovered something but no
  // character adjusted their worldview. Requires 8+ records and 2+ revelations.
  if (records.length >= 8 && witnessedBeliefs.length >= 2) {
    const anyRevPropagates239 = witnessedBeliefs.some(w =>
      toldBeliefs.some(t => t.sceneIdx > w.sceneIdx && sharedWords(t.proposition, w.proposition) >= 2),
    );
    if (!anyRevPropagates239) {
      issues.push({
        location: 'Revelation/belief propagation layer',
        rule: 'REVELATION_BELIEF_PROPAGATION_ABSENT',
        severity: 'minor',
        description: `${witnessedBeliefs.length} witnessed revelations occur across the story but none of them trigger any subsequent told belief with shared vocabulary — characters discover truths but never adjust what they assert. The revelation layer is disconnected from the dialogue belief layer.`,
        suggestedFix: 'After each key revelation, have a character articulate what they now believe — a line of dialogue that shows the discovery changed their understanding. A revelation that isn\'t reflected in subsequent assertions has no epistemic impact.',
      });
    }
  }

  // ── Wave 239: SOLE_ASSERTER ───────────────────────────────────────────────
  // Only one unique character ever makes told-belief assertions across the story.
  // BELIEF_ASYMMETRY flags the case where one character dominates 3:1 over
  // another — this catches the starker case where only ONE character appears in
  // the belief layer at all. The deception/belief layer becomes a monologue;
  // all other characters receive or react without ever asserting their own beliefs.
  // Requires 6+ records and 4+ total told beliefs.
  if (records.length >= 6 && toldBeliefs.length >= 4) {
    const assertingChars239 = new Set<string>();
    for (const r of records) {
      for (const h of r.dialogueHighlights) {
        const colonIdx = h.indexOf(':');
        if (colonIdx > -1) assertingChars239.add(h.slice(0, colonIdx).trim());
      }
    }
    if (assertingChars239.size === 1) {
      const soloChar239 = [...assertingChars239][0];
      issues.push({
        location: 'Belief assertion distribution',
        rule: 'SOLE_ASSERTER',
        severity: 'minor',
        description: `Only one character ("${soloChar239}") makes told-belief assertions across all ${records.length} scenes — the belief/deception layer is a monologue. All other characters remain belief-silent, never articulating their own propositions or claims.`,
        suggestedFix: 'Give at least one other character a belief assertion — a claim, a misreading of events, or a lie of their own. A multi-voice belief layer creates conflict and reveals character; a single asserter creates lecture.',
      });
    }
  }

  // ── Wave 253: REVELATION_ACT2A_DESERT ────────────────────────────────────
  // Act 2a (25%–50%) carries no witnessed revelations, despite the story having
  // 3+ revelations overall. The first complication zone — where the protagonist
  // begins testing the world and the audience expects their understanding to
  // start updating — delivers no discovery. Revelations cluster in Act 1 and
  // Act 2b/3 but skip the early-middle, leaving a discovery valley right where
  // the story should be building momentum. Requires 8+ records and 3+ revelations.
  if (records.length >= 8 && witnessedBeliefs.length >= 3) {
    const act2aStart253 = Math.floor(records.length * 0.25);
    const act2aEnd253 = Math.floor(records.length * 0.5);
    const inAct2a253 = witnessedBeliefs.filter(w => w.sceneIdx >= act2aStart253 && w.sceneIdx < act2aEnd253).length;
    if (inAct2a253 === 0) {
      issues.push({
        location: `Act 2a (Scenes ${act2aStart253}–${act2aEnd253 - 1}) — revelation zone`,
        rule: 'REVELATION_ACT2A_DESERT',
        severity: 'minor',
        description: `${witnessedBeliefs.length} revelations land across the story but none occur in Act 2a (Scenes ${act2aStart253}–${act2aEnd253 - 1}) — the first complication zone delivers no discovery. The audience's understanding stops updating just as the protagonist starts testing the world.`,
        suggestedFix: 'Plant a revelation in Act 2a: an early consequence of the protagonist\'s first moves that reveals something they (and the audience) did not know. The first complication should teach the protagonist that the world is more complicated than they assumed.',
      });
    }
  }

  // ── Wave 253: BELIEF_ECHO_CHAMBER ────────────────────────────────────────
  // The same proposition is asserted in dialogue across 3+ separate scenes —
  // sharing significant vocabulary — but is never confirmed or contradicted by
  // any witnessed revelation. The story repeats an unverified claim instead of
  // developing it: the audience hears the same assertion again and again with no
  // resolution, mistaking repetition for emphasis. Distinct from EXPOSITION_DUMP
  // (consecutive told-only scenes) and SINGLE_SCENE_BELIEF_OVERLOAD (one packed
  // scene); this is one claim echoing across the whole story unanswered.
  // Requires 6+ records and 3+ told beliefs.
  if (records.length >= 6 && toldBeliefs.length >= 3) {
    for (const anchor253 of toldBeliefs) {
      const echoes253 = toldBeliefs.filter(t => sharedWords(t.proposition, anchor253.proposition) >= 2);
      // echoes253 includes the anchor itself when it shares words with itself;
      // require 3+ distinct scenes asserting the same proposition cluster.
      const echoScenes253 = new Set(echoes253.map(e => e.sceneIdx));
      if (echoScenes253.size >= 3) {
        const witnessedResolves253 = witnessedBeliefs.some(w => sharedWords(w.proposition, anchor253.proposition) >= 2);
        if (!witnessedResolves253) {
          const scenesList253 = [...echoScenes253].sort((a, b) => a - b);
          issues.push({
            location: `Scenes ${scenesList253.join(', ')} — repeated assertion`,
            rule: 'BELIEF_ECHO_CHAMBER',
            severity: 'minor',
            description: `The proposition "${anchor253.proposition.slice(0, 50)}${anchor253.proposition.length > 50 ? '…' : ''}" is asserted across ${echoScenes253.size} separate scenes (${scenesList253.join(', ')}) but no witnessed revelation ever confirms or contradicts it — the story repeats an unverified claim instead of resolving it. Repetition is being mistaken for emphasis.`,
            suggestedFix: 'Either pay the claim off with a witnessed scene that proves or disproves it, or cut the repetitions down to a single clear assertion. A belief that is restated three times without resolution reads as the story circling rather than advancing.',
          });
          break;
        }
      }
    }
  }

  // ── Wave 253: ADJACENT_DECEPTION_PAYOFF ──────────────────────────────────
  // A told belief is contradicted by a witnessed revelation in the very next
  // scene (gap of exactly one). The deception and its unmasking sit shoulder to
  // shoulder — the audience is handed a lie and shown the truth before they have
  // any chance to act on the false belief. A deception needs breathing room to
  // mislead; planting and exposing it in adjacent scenes makes it a non-event.
  // Distinct from LATE_DECEPTION_PLANT (about position in the story); this is
  // about the gap between setup and payoff anywhere. Requires 6+ records.
  if (records.length >= 6) {
    for (const told253 of toldBeliefs) {
      const adjacentReveal253 = witnessedBeliefs.find(w =>
        w.sceneIdx === told253.sceneIdx + 1 && sharedWords(w.proposition, told253.proposition) >= 2,
      );
      if (adjacentReveal253) {
        issues.push({
          location: `Scene ${told253.sceneIdx} (${told253.slug}) → Scene ${adjacentReveal253.sceneIdx}`,
          rule: 'ADJACENT_DECEPTION_PAYOFF',
          severity: 'minor',
          description: `A belief asserted at Scene ${told253.sceneIdx} is contradicted by a witnessed revelation in the very next scene (Scene ${adjacentReveal253.sceneIdx}) — the lie and its unmasking are adjacent. The audience never has time to act on the false belief, so the deception has no dramatic payoff.`,
          suggestedFix: 'Put distance between the deception and its revelation. Let the false belief drive at least two or three scenes of action before the truth surfaces — the cost of the lie is paid in everything the characters do while they still believe it.',
        });
        break;
      }
    }
  }

  // ── Wave 267: BELIEF_FRONT_LOADED ─────────────────────────────────────────
  // All told beliefs cluster in the first half of the story — none appear
  // in the second half. The story front-loads its deception layer and then
  // abandons it: the second half has no competing assertions, no misdirection,
  // no characters holding beliefs the audience can see as false. This strips
  // dramatic irony from the climax, where the audience most needs to be ahead
  // of (or misled by) the characters.
  // Requires 6+ records and 4+ told beliefs.
  if (records.length >= 6 && toldBeliefs.length >= 4) {
    const midpoint267 = Math.floor(records.length / 2);
    const secondHalfTold267 = toldBeliefs.filter(t => t.sceneIdx >= midpoint267);
    if (secondHalfTold267.length === 0) {
      issues.push({
        location: `First half only (scenes 0–${midpoint267 - 1})`,
        rule: 'BELIEF_FRONT_LOADED',
        severity: 'minor',
        description: `All ${toldBeliefs.length} told beliefs appear in the first half of the story (scenes 0–${midpoint267 - 1}); the second half has none. The deception layer is exhausted before the climax — the audience knows what every character believes long before the resolution, removing dramatic irony from the story's most consequential moments.`,
        suggestedFix: 'Plant at least one new told belief in the second half — a misleading claim voiced near the climax, a false assumption a character holds into the final act. Late misdirection sustains dramatic irony and makes the resolution feel earned rather than mechanical.',
      });
    }
  }

  // ── Wave 267: REVELATION_FINAL_ACT_ONLY ───────────────────────────────────
  // All witnessed revelations are confined to the final quarter of the story.
  // Earlier acts have zero revelations: no moment where a character discovers
  // something true, no scene where the audience is shown the reality beneath
  // surface claims. Every revealed truth is deferred to the end, making the
  // intermediate acts feel provisional and dramatically inert.
  // Distinct from REVELATION_ACT2A_DESERT (Act 2a specifically); this flags
  // the entire three-act desert before the final quarter.
  // Requires 8+ records and 2+ witnessed beliefs.
  if (records.length >= 8 && witnessedBeliefs.length >= 2) {
    const finalActStart267 = Math.floor(records.length * 0.75);
    const earlyRevelations267 = witnessedBeliefs.filter(w => w.sceneIdx < finalActStart267);
    if (earlyRevelations267.length === 0) {
      issues.push({
        location: `Final quarter only (scene ${finalActStart267}+)`,
        rule: 'REVELATION_FINAL_ACT_ONLY',
        severity: 'minor',
        description: `All ${witnessedBeliefs.length} witnessed revelations are confined to the final quarter (scene ${finalActStart267}+). No earlier scene reveals a truth — every moment of discovery is deferred to the end. Acts 1 through 3a feel like setup without payoff, and the climax becomes overloaded with back-to-back discoveries the audience has no time to process.`,
        suggestedFix: 'Distribute at least one discovery earlier — a partial truth revealed mid-story raises the stakes for everything that follows and gives the climax room to breathe. A revelation in Act 2 creates a new problem; a revelation saved for Act 4 only closes an existing one.',
      });
    }
  }

  // ── Wave 267: TOLD_BELIEF_CLUSTERING ──────────────────────────────────────
  // A single scene contains 3 or more distinct told beliefs — multiple
  // characters asserting multiple propositions in the same scene. The scene
  // becomes a belief-dump: the audience is handed several competing or
  // reinforcing assertions at once, with no room to process any of them.
  // Each told belief needs space to register; packing three into one scene
  // dilutes each. Distinct from EXPOSITION_DUMP (consecutive told-only scenes)
  // and SINGLE_SCENE_BELIEF_OVERLOAD (5+ assertions); this catches the
  // 3–4 assertion range before the more severe threshold.
  // Requires 6+ records and 3+ told beliefs.
  if (records.length >= 6 && toldBeliefs.length >= 3) {
    const byScene267 = new Map<number, number>();
    for (const t of toldBeliefs) {
      byScene267.set(t.sceneIdx, (byScene267.get(t.sceneIdx) ?? 0) + 1);
    }
    for (const [sceneIdx267, count267] of byScene267) {
      if (count267 >= 3 && count267 < 5) {
        const slug267 = toldBeliefs.find(t => t.sceneIdx === sceneIdx267)?.slug ?? `scene ${sceneIdx267}`;
        issues.push({
          location: `Scene ${sceneIdx267} (${slug267})`,
          rule: 'TOLD_BELIEF_CLUSTERING',
          severity: 'minor',
          description: `Scene ${sceneIdx267} (${slug267}) contains ${count267} separate told beliefs — ${count267} distinct propositions asserted in the same scene. The scene becomes a belief-dump: the audience cannot process each claim before the next arrives, and none of the assertions carry the dramatic weight they need.`,
          suggestedFix: 'Distribute the beliefs across separate scenes. One scene, one central assertion — let each claim land and drive character behaviour before the next is introduced. Reserve multi-belief scenes for deliberate moments of information overload.',
        });
        break;
      }
    }
  }

  // ── Wave 281: Revelation drama vacuum, Act 2b void, told belief final scene ───

  // REVELATION_DRAMA_VACUUM (minor, n≥8, ≥2 revelations): None of the witnessed
  // revelations occurs in a scene with high suspense (suspenseDelta > 1) or a
  // non-neutral emotional shift. Every truth is revealed in a flat, inert scene —
  // the discovery carries no dramatic heat. Revelations land with maximum impact
  // when the audience is already emotionally activated; a truth dropped into a
  // calm, neutral scene fails to reverberate. Distinct from REVELATION_ISOLATED
  // (no dialogue) and REVELATION_AFTERMATH_ABSENT (no consequence downstream).
  if (records.length >= 8 && witnessedBeliefs.length >= 2) {
    const anyDramaticReveal281 = witnessedBeliefs.some(w => {
      const r = records.find(rec => rec.sceneIdx === w.sceneIdx);
      return r && (r.suspenseDelta > 1 || r.emotionalShift !== 'neutral');
    });
    if (!anyDramaticReveal281) {
      issues.push({
        location: 'Revelation scenes',
        rule: 'REVELATION_DRAMA_VACUUM',
        severity: 'minor',
        description: `${witnessedBeliefs.length} witnessed revelation(s) occur across the story but none land in a scene with rising suspense (suspenseDelta > 1) or non-neutral emotional charge — every truth is revealed in a flat, inert scene. Revelations deliver maximum impact when they arrive at moments of dramatic heat; a truth discovered in an emotionally inert scene fails to reverberate.`,
        suggestedFix: 'Move at least one revelation into a scene of dramatic heat — a moment of rising suspense, emotional crisis, or direct confrontation. The audience registers a truth more deeply when they are already emotionally activated at the moment of discovery.',
      });
    }
  }

  // BELIEF_ACT2B_VOID (minor, n≥8, ≥2 Act 2b scenes): Act 2b (50%–75% of the
  // story) contains no told beliefs and no witnessed revelations. The escalation
  // zone is informationally inert. Act 2b is where the protagonist should be
  // learning and asserting their way toward the climax, with the story's tension
  // tightening through competing claims and newly discovered truths. A void of
  // belief content in Act 2b signals a structural information vacuum at precisely
  // the moment where dramatic momentum should be building. Distinct from
  // BELIEF_MIDPOINT_VOID (40%–60%): this covers the later escalation phase.
  if (records.length >= 8) {
    const act2bStart281 = Math.floor(records.length * 0.5);
    const act2bEnd281 = Math.floor(records.length * 0.75);
    const act2bRecs281 = records.slice(act2bStart281, act2bEnd281);
    if (act2bRecs281.length >= 2) {
      const hasAct2bBelief281 = act2bRecs281.some(r =>
        r.dialogueHighlights.length > 0 || r.revelation !== null,
      );
      if (!hasAct2bBelief281) {
        issues.push({
          location: `Act 2b (Scenes ${act2bStart281}–${act2bEnd281 - 1})`,
          rule: 'BELIEF_ACT2B_VOID',
          severity: 'minor',
          description: `Act 2b (Scenes ${act2bStart281}–${act2bEnd281 - 1}) contains no told beliefs and no witnessed revelations — the story's escalation zone is informationally inert. Characters should be learning and asserting toward the climax; a belief void in Act 2b means the story coasts through its own build phase with no information exchange.`,
          suggestedFix: 'Plant at least one belief beat in Act 2b: a character asserts a key proposition that will be tested in the climax, or a partial revelation narrows the audience\'s uncertainty. Act 2b is where the story\'s informational tension should be at its tightest before the final break.',
        });
      }
    }
  }

  // TOLD_BELIEF_FINAL_SCENE (minor, n≥5): The final scene contains a character
  // assertion (told belief with 4+ words) but no witnessed revelation. A story
  // whose last word is an unresolved assertion leaves the audience holding an open
  // proposition — the closing scene ends on a claim that is never witnessed as true.
  // Final scenes should close on demonstrated truth (witnessed) rather than asserted
  // truth (claimed). Distinct from BELIEF_RESOLUTION_ABSENT (no revelations in
  // final 20%): this fires even when there is exactly one told belief in the finale.
  if (records.length >= 5) {
    const finalRec281 = records[records.length - 1];
    const finalHasToldBelief281 = finalRec281.dialogueHighlights.some((h: string) => {
      const colonIdx = h.indexOf(':');
      return colonIdx > -1 && h.slice(colonIdx + 1).trim().split(/\s+/).length >= 4;
    });
    if (finalHasToldBelief281 && finalRec281.revelation === null) {
      issues.push({
        location: `Scene ${finalRec281.sceneIdx} (${finalRec281.slug}) — final scene`,
        rule: 'TOLD_BELIEF_FINAL_SCENE',
        severity: 'minor',
        description: `The final scene contains a character assertion (told belief) with no accompanying revelation — the story ends with an unverified claim. The last word the story speaks to the audience is a character asserting something that is never shown to be true; the story closes on a proposition rather than a truth.`,
        suggestedFix: 'Either add a witnessed revelation to the final scene that confirms or contradicts the assertion, or move the told belief earlier and let the closing scene demonstrate truth through action or direct discovery. A story ends most satisfyingly when its final truth is shown, not claimed.',
      });
    }
  }

  // ── Wave 295: REVELATION_SUSPENSE_DECOUPLED ───────────────────────────────
  // Revelation scenes (witnessedBeliefs) have an average suspenseDelta ≤ 0.
  // Discoveries should generate tension — the moment of unmasking should raise
  // stakes rather than lowering them. A revelation that arrives without suspense
  // is a plot point, not a dramatic event: it informs without transforming.
  // Requires 8+ records and 3+ revelations with suspenseDelta data.
  if (records.length >= 8 && witnessedBeliefs.length >= 3) {
    const revSuspScenes295 = witnessedBeliefs
      .map(w => records.find((r: any) => r.sceneIdx === w.sceneIdx))
      .filter(Boolean);
    if (revSuspScenes295.length >= 3) {
      const avgRevSusp295 = revSuspScenes295.reduce((acc: number, r: any) => acc + (r.suspenseDelta ?? 0), 0) / revSuspScenes295.length;
      if (avgRevSusp295 <= 0) {
        issues.push({
          location: 'Revelation scenes — suspense decoupled',
          rule: 'REVELATION_SUSPENSE_DECOUPLED',
          severity: 'minor',
          description: `${revSuspScenes295.length} revelation scene(s) have an average suspenseDelta of ${avgRevSusp295.toFixed(2)} — discoveries arrive without generating tension. A revelation that doesn't raise stakes is a fact delivered by the plot, not a dramatic event experienced by the audience. Discoveries should reframe everything and make the next action more urgent, not less.`,
          suggestedFix: 'Stage each revelation so that what it reveals raises the cost of the next action: the truth uncovered should make an upcoming decision harder, not easier. If discovering the killer makes the protagonist safer, the revelation has no dramatic tension; if it puts someone they love at risk, it does.',
        });
      }
    }
  }

  // ── Wave 295: REVELATION_DENSITY_DROP ────────────────────────────────────
  // The second half of the story has fewer revelations than the first half,
  // despite 3+ total revelations. The story front-loads its information drama
  // and coasts to the finish. Discoveries should escalate toward the climax —
  // the revelation density should increase or remain consistent as the story
  // approaches its resolution, not drop off. Requires 8+ records and 3+
  // revelations total.
  if (records.length >= 8 && witnessedBeliefs.length >= 3) {
    const half295 = Math.floor(records.length / 2);
    const firstHalfRevs295 = witnessedBeliefs.filter(w => w.sceneIdx < half295).length;
    const secondHalfRevs295 = witnessedBeliefs.filter(w => w.sceneIdx >= half295).length;
    if (firstHalfRevs295 > secondHalfRevs295 && secondHalfRevs295 < firstHalfRevs295 * 0.5) {
      issues.push({
        location: 'Revelation distribution',
        rule: 'REVELATION_DENSITY_DROP',
        severity: 'minor',
        description: `${firstHalfRevs295} revelation(s) occur in the first half vs. only ${secondHalfRevs295} in the second half — discovery density drops more than 50% after the midpoint. The story front-loads its information drama and coasts toward the climax with a depleted discovery engine.`,
        suggestedFix: 'Redistribute revelations to escalate in density toward the climax: the second half of the story should deliver more discoveries than the first, not fewer. Reserve the two or three most significant revelations for Act 2b and Act 3 — the story\'s information crescendo should peak at or just before the climax.',
      });
    }
  }

  // ── Wave 295: BELIEF_OPENING_INERT ────────────────────────────────────────
  // The first 25% of the story has neither told beliefs (dialogueHighlights)
  // nor witnessed revelations. The opening act is informationally inert —
  // no character claims anything and no truth is discovered. An opening
  // without belief content fails to establish the epistemic stakes: the
  // audience has no proposition to hold or doubt entering Act 2. Requires
  // 8+ records and at least 1 told belief or revelation anywhere else in
  // the story.
  if (records.length >= 8) {
    const opening295End = Math.floor(records.length * 0.25);
    const openingHasBeliefs295 = records.slice(0, opening295End).some((r: any) =>
      r.dialogueHighlights.length > 0 || r.revelation !== null,
    );
    if (!openingHasBeliefs295) {
      const restHasBeliefs295 = records.slice(opening295End).some((r: any) =>
        r.dialogueHighlights.length > 0 || r.revelation !== null,
      );
      if (restHasBeliefs295) {
        issues.push({
          location: `Opening 25% (Scenes 0–${opening295End - 1}) — no belief content`,
          rule: 'BELIEF_OPENING_INERT',
          severity: 'minor',
          description: `The opening (Scenes 0–${opening295End - 1}) contains no told beliefs and no revelations — the first act is informationally inert. The audience enters Act 2 with no proposition to hold or doubt, no claim to be suspicious of, and no discovery to process. An opening that establishes no epistemic stakes leaves the belief layer empty when the complications begin.`,
          suggestedFix: 'Plant at least one belief beat in the opening: a character makes a claim that will later be tested, a secret is hinted at, or a small discovery seeds a question the story will answer. The opening should leave the audience holding at least one unverified proposition — something to believe or disbelieve entering Act 2.',
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
