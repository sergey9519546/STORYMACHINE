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
// Wave 309 additions: told belief drought (≥5 consecutive scenes with no assertion or
// revelation — belief layer silent), assertion void (≥4 revelations but ≤1 told belief),
// revelation late first (first revelation past midpoint despite early assertions).
// Wave 323 additions: revelation curiosity decoupled (revelation scenes avg curiosityDelta
// ≤ 0 — discoveries never reopen the field), told belief curiosity flat (assertion scenes
// avg curiosityDelta ≤ 0), told belief relationship decoupled (no assertion scene moves a bond).
// Wave 334 additions: told belief suspense decoupled (assertion scenes avg suspenseDelta ≤ 0 —
// claims arrive without tension), told belief emotional flatline (all assertion scenes
// neutral — claims carry no emotional charge), revelation relationship decoupled (no revelation
// scene moves a bond — discoveries never alter the relational world).
// Wave 348 additions: revelation/assertion disconnect (no revelation lands within two scenes of
// a prior assertion — the dramatic-irony engine never fires), revelation midpoint void (the
// 40%–60% pivot carries no revelation while revelations exist elsewhere), told belief dramatic
// turn decoupled (no assertion scene coincides with a story pivot).
// Wave 362 additions: revelation clock decoupled (no revelation lands in a clock-raised scene
// even though both revelations and clock scenes exist — urgency and discovery never meet),
// told belief Act 3 absent (assertions exist in Acts 1-2 but none in Act 3 — the finale
// contains no positions or claims), revelation curiosity peak absent (the scene with the
// highest curiosityDelta has no revelation while 2+ other curious scenes carry revelations).
// Wave 376 additions: revelation suspense peak absent (the highest-suspense scene has no
// revelation while 2+ other suspense-positive scenes carry revelations — peak tension without
// disclosure), told belief clock decoupled (≥3 assertion scenes and ≥2 clock scenes but no
// assertion lands under time pressure), assertion midpoint void (the 40%–60% pivot carries no
// assertion while assertions exist on both sides — claims skip the structural center).
// Wave 390 additions: revelation dramatic turn decoupled (≥2 revelations and ≥3 turns but none
// share a scene — disclosure and pivot engines never meet), told belief suspense peak absent
// (the peak-suspense scene carries no assertion while 2+ suspense-positive assertion scenes
// exist — the told-belief sibling of the revelation suspense-peak check), told belief curiosity
// peak absent (the peak-curiosity scene carries no assertion while 2+ curiosity-positive ones do).
// Wave 404 additions: revelation payoff decoupled (≥2 revelation and ≥2 payoff scenes but none
// share a scene — discovery and resolution never converge), told belief seed decoupled (≥2
// assertion and ≥2 seed scenes but none share a scene — verbal deception and physical evidence
// never compound), assertion Act 1 only (≥3 total assertions all before the 25% mark —
// belief layer closes at the point where it should begin complicating).
// Wave 418 additions: revelation consecutive flood (3+ revelation scenes appear back-to-back
// without breathing room — discoveries pile up faster than the audience can process them;
// run-based mode × revelation channel), assertion Act 2a void (no assertion lands in the
// 25%–50% conflict-entry zone while assertions exist elsewhere — the belief battle sits silent
// precisely where it should open; zone presence/absence × assertion × Act 2a), assertion
// aftermath void (every assertion scene is followed by two scenes with no revelation, no
// relationship shift, and no suspense rise — claims land without cascading consequence;
// sequence/aftermath mode × assertion channel).
// Wave 432 additions: revelation emotional monotone (all emotionally charged revelation scenes
// share the same polarity — every discovery lands as either uniformly bad or uniformly good news,
// erasing tonal surprise from the disclosure layer; valence mode × revelation channel),
// revelation unprepared climax (the story's final revelation has no told belief or assertion in
// the three prior scenes — the climactic disclosure has no planted deception to resolve;
// backward-cause mode × final revelation), assertion singleton run (no two assertion scenes ever
// appear consecutively — the belief battle spreads so thin that claims never accumulate or build
// momentum; run-based mode × assertion channel, the complement of REVELATION_CONSECUTIVE_FLOOD).
// Wave 446 additions: revelation drought (≥6 consecutive scenes with no disclosure despite
// ≥2 revelations existing — epistemic momentum breaks down in extended silent stretches;
// run-based × revelation-absence mode, the revelation-channel parallel of TOLD_BELIEF_DROUGHT),
// assertion reactive void (every revelation is followed by 2 scenes with no character assertion
// — discoveries never prompt a character to publicly update their worldview; sequence/aftermath ×
// revelation→assertion direction, the reverse of REVELATION_ASSERTION_DISCONNECT), negative scene
// revelation void (no negative-emotional scene ever coincides with a revelation — hard moments
// are quarantined from disclosure; co-occurrence × negative-valence × revelation-absence mode,
// orthogonal to REVELATION_DRAMA_VACUUM which checks revelation scenes for neutrality).
// Wave 460 additions: assertion causal vacuum (every assertion scene is unpreceded by any
// revelation, dramatic turn, or high-suspense event in the 2 prior scenes — claims drop from
// narrative vacuum with no story pressure motivating them; backward-cause × full assertion
// population, first check examining assertions as the EFFECT rather than the CAUSE), revelation
// suspense deflation (the average suspenseDelta of the scene immediately following each qualifying
// revelation is < 0 — disclosures consistently trigger falling tension rather than escalation;
// average/aggregate × aftermath × revelation × suspense direction, the first aggregate check on
// the post-revelation zone), assertion payoff decoupled (no assertion scene shares a scene with
// any payoffSetupIds — verbal declarations never coincide with narrative resolutions; co-occurrence
// × assertion × payoff, the payoff-side complement of TOLD_BELIEF_SEED_DECOUPLED which checks
// the seed side).

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

  // ── Wave 309: TOLD_BELIEF_DROUGHT ─────────────────────────────────────────
  // Five or more consecutive scenes contain neither a told belief nor a
  // revelation — the belief/deception layer goes completely silent for a long
  // stretch. Nobody asserts anything and nothing is discovered: the epistemic
  // engine idles. Distinct from EXPOSITION_DUMP (the inverse — too many
  // consecutive told-only scenes) and the zone-specific voids (MIDPOINT_VOID,
  // ACT2B_VOID, OPENING_INERT): this catches a belief-silent run anywhere.
  // Requires 10+ records.
  if (records.length >= 10) {
    let run309 = 0;
    let runStart309 = 0;
    let maxRun309 = 0;
    let maxStart309 = 0;
    for (let i309 = 0; i309 < records.length; i309++) {
      const r309: any = records[i309];
      if (r309.dialogueHighlights.length === 0 && r309.revelation === null) {
        if (run309 === 0) runStart309 = i309;
        run309++;
        if (run309 > maxRun309) { maxRun309 = run309; maxStart309 = runStart309; }
      } else {
        run309 = 0;
      }
    }
    if (maxRun309 >= 5) {
      issues.push({
        location: `Scenes ${maxStart309}–${maxStart309 + maxRun309 - 1} — belief layer silent`,
        rule: 'TOLD_BELIEF_DROUGHT',
        severity: 'minor',
        description: `${maxRun309} consecutive scenes (${maxStart309}–${maxStart309 + maxRun309 - 1}) contain no told beliefs and no revelations — the belief/deception layer goes completely silent. For this stretch no character asserts anything that could be tested and nothing is discovered; the epistemic engine that drives dramatic irony and surprise simply idles.`,
        suggestedFix: 'Seed the silent stretch with belief activity: a character voicing a conviction the story will later test, a partial discovery that narrows the audience\'s uncertainty, or a lie planted for a future unmasking. Every long scene-run should advance what someone believes or what the audience knows.',
      });
    }
  }

  // ── Wave 309: ASSERTION_VOID ──────────────────────────────────────────────
  // The story delivers four or more revelations but contains at most one told
  // belief — truths are discovered, but no character ever asserts a claim that
  // a revelation could overturn. Without assertions there is no dramatic irony
  // setup: every revelation lands as raw information rather than as a reversal
  // of something a character (and the audience) believed. The inverse of
  // TOLD_BELIEF_DOMINATION (>70% tell). Requires 8+ records.
  if (records.length >= 8 && witnessedBeliefs.length >= 4 && toldBeliefs.length <= 1) {
    issues.push({
      location: 'Belief/revelation layer',
      rule: 'ASSERTION_VOID',
      severity: 'minor',
      description: `The story delivers ${witnessedBeliefs.length} revelations but only ${toldBeliefs.length} told belief(s) — truths are discovered, but almost no character ever asserts a claim a revelation could overturn. Without assertions there is no dramatic irony to invert: each revelation arrives as raw information instead of as the reversal of something a character was sure of.`,
      suggestedFix: 'Plant assertions ahead of the discoveries: have characters state what they believe — confidently and wrongly — so that later revelations land as reversals. A revelation is only a reversal if someone first committed to the opposite; assertions are the setup that gives discoveries their charge.',
    });
  }

  // ── Wave 309: REVELATION_LATE_FIRST ───────────────────────────────────────
  // The story has 2+ revelations but the FIRST one does not arrive until past
  // the midpoint, while the first half already carries 2+ told beliefs. The
  // epistemic layer is active early (characters assert) but the story confirms
  // or overturns nothing until the back half — the audience holds claims for a
  // long time with no payoff. Distinct from REVELATION_ACT2A_DESERT (25–50%
  // zone), REVELATION_BACK_WEIGHTED (≥80% in final quarter), and REVELATION_
  // FINAL_ACT_ONLY: this audits the onset of the FIRST revelation. Requires
  // 8+ records.
  if (records.length >= 8 && witnessedBeliefs.length >= 2) {
    const midIdx309 = Math.floor(records.length * 0.5);
    const firstRevIdx309 = Math.min(...witnessedBeliefs.map(w => w.sceneIdx));
    const firstHalfTold309 = toldBeliefs.filter(t => t.sceneIdx < midIdx309).length;
    if (firstRevIdx309 >= midIdx309 && firstHalfTold309 >= 2) {
      issues.push({
        location: `First revelation at Scene ${firstRevIdx309} (past midpoint ${midIdx309})`,
        rule: 'REVELATION_LATE_FIRST',
        severity: 'minor',
        description: `The first revelation does not arrive until Scene ${firstRevIdx309} — past the midpoint — even though the first half already carries ${firstHalfTold309} told beliefs. The epistemic layer is active early (characters assert) but the story confirms or overturns nothing until the back half, so the audience holds those claims for a long time with no payoff to reward their attention.`,
        suggestedFix: 'Deliver a revelation in the first half that pays off one of the early assertions — a partial truth, a small unmasking, a confirmation that reframes what came before. An early first revelation teaches the audience that the claims they are tracking will pay off, which keeps them invested.',
      });
    }
  }

  // ── Wave 323: REVELATION_CURIOSITY_DECOUPLED, TOLD_BELIEF_CURIOSITY_FLAT, TOLD_BELIEF_RELATIONSHIP_DECOUPLED ──

  // REVELATION_CURIOSITY_DECOUPLED (minor, n≥8, ≥3 revelations): Revelation
  // scenes have an average curiosityDelta ≤ 0. A revelation should answer one
  // question while opening another — it should leave the audience MORE curious,
  // not less. When discoveries land without raising fresh curiosity, the
  // epistemic engine closes loops without ever reopening them, and the story
  // deflates toward its ending. Distinct from REVELATION_SUSPENSE_DECOUPLED
  // (suspenseDelta channel) and REVELATION_DRAMA_VACUUM (emotionalShift).
  if (records.length >= 8) {
    const revScenes323 = (records as any[]).filter(r => r.revelation !== null);
    if (revScenes323.length >= 3) {
      const avgRevCur323 = revScenes323.reduce((s, r) => s + (r.curiosityDelta ?? 0), 0) / revScenes323.length;
      if (avgRevCur323 <= 0) {
        issues.push({
          location: 'Revelation scenes — curiosity register',
          rule: 'REVELATION_CURIOSITY_DECOUPLED',
          severity: 'minor',
          description: `${revScenes323.length} revelation scenes average a curiosityDelta of ${avgRevCur323.toFixed(2)} — discoveries arrive without raising fresh curiosity. A revelation should answer one question while opening another; when every discovery only closes loops, the story's mystery engine winds down toward the ending instead of accelerating. The audience gets answers but loses the hunger that made them want the answers.`,
          suggestedFix: 'Let each revelation reopen the field: the truth that answers one question should complicate or raise another. A discovery that lands with "but then why...?" keeps the audience leaning forward; a discovery that merely confirms closes a door without opening one.',
        });
      }
    }
  }

  // TOLD_BELIEF_CURIOSITY_FLAT (minor, n≥8, ≥3 told-belief scenes): Scenes where
  // a character asserts a belief have an average curiosityDelta ≤ 0. An
  // assertion — especially a confident or contestable one — should make the
  // audience wonder whether it is true. When told beliefs never spike curiosity,
  // the claims register as flat exposition rather than as questions the story
  // will test. Distinct from TOLD_BELIEF_DOMINATION (tell/show ratio) and
  // EXPOSITION_DUMP (consecutive told-only run): this audits the curiosity
  // channel on assertion scenes.
  if (records.length >= 8) {
    const toldScenes323 = (records as any[]).filter(r => ((r.dialogueHighlights ?? []) as string[]).some(h => h.includes(':')));
    if (toldScenes323.length >= 3) {
      const avgToldCur323 = toldScenes323.reduce((s, r) => s + (r.curiosityDelta ?? 0), 0) / toldScenes323.length;
      if (avgToldCur323 <= 0) {
        issues.push({
          location: 'Told-belief scenes — curiosity register',
          rule: 'TOLD_BELIEF_CURIOSITY_FLAT',
          severity: 'minor',
          description: `${toldScenes323.length} scenes where a character asserts a belief average a curiosityDelta of ${avgToldCur323.toFixed(2)} — assertions arrive without making the audience wonder whether they are true. A claim that provokes no curiosity is flat exposition; the audience files it as fact rather than holding it as a question the story might overturn. Assertions earn their place by being doubtable.`,
          suggestedFix: 'Frame assertions so the audience can question them: give the claim a tell that hints it might be wrong (an evasive delivery, a contradicting detail in the frame, another character\'s skeptical reaction). A belief stated against a flicker of doubt becomes a question the audience wants answered.',
        });
      }
    }
  }

  // TOLD_BELIEF_RELATIONSHIP_DECOUPLED (minor, n≥8, ≥3 told-belief scenes): No
  // scene that contains a told belief also carries a relationship shift. Beliefs
  // — and especially deceptions — are relational acts: to assert, to lie, to
  // confess is to act on someone. When assertion scenes never move a
  // relationship, the belief layer floats free of the character bonds it should
  // be straining or strengthening. Distinct from BELIEF_ISOLATION (a belief
  // never expressed) and SOLE_ASSERTER (one character dominates assertions):
  // this audits whether assertions ever land relationally.
  if (records.length >= 8) {
    const toldScenes323r = (records as any[]).filter(r => ((r.dialogueHighlights ?? []) as string[]).some(h => h.includes(':')));
    if (toldScenes323r.length >= 3) {
      const anyRelShift323 = toldScenes323r.some(r => ((r.relationshipShifts ?? []) as any[]).length > 0);
      if (!anyRelShift323) {
        issues.push({
          location: 'Told-belief scenes — relational impact',
          rule: 'TOLD_BELIEF_RELATIONSHIP_DECOUPLED',
          severity: 'minor',
          description: `None of the ${toldScenes323r.length} scenes containing a told belief also carries a relationship shift — assertions never move a bond. Beliefs are relational acts: to assert, to lie, to confess is to act on another person. When the belief layer never touches the relationship layer, claims float free of the character dynamics they should be straining, deepening, or betraying.`,
          suggestedFix: 'Let assertions land on relationships: a confident claim should impress, alienate, or provoke whoever hears it; a lie should quietly damage the bond with the person deceived. Tie at least some belief beats to a measurable shift in trust or power so the epistemic layer drives the relational one.',
        });
      }
    }
  }

  // ── Wave 334: TOLD_BELIEF_SUSPENSE_DECOUPLED, TOLD_BELIEF_EMOTIONAL_FLATLINE, REVELATION_RELATIONSHIP_DECOUPLED ──

  // TOLD_BELIEF_SUSPENSE_DECOUPLED (minor, n≥8, ≥3 assertion scenes): Scenes
  // where a character asserts a belief average suspenseDelta ≤ 0. Claims that
  // arrive without generating tension register as flat exposition — the audience
  // files the assertion rather than feeling the stakes of whether it is true.
  // A contestable belief should make the audience tense: if wrong, someone will
  // pay for it. Distinct from TOLD_BELIEF_CURIOSITY_FLAT (curiosityDelta, Wave 323)
  // and REVELATION_SUSPENSE_DECOUPLED (revelation scenes, not assertion scenes).
  if (records.length >= 8) {
    const toldScenes334 = (records as any[]).filter(r =>
      ((r.dialogueHighlights ?? []) as string[]).some(h => h.includes(':')),
    );
    if (toldScenes334.length >= 3) {
      const avgSusp334 = toldScenes334.reduce((s: number, r: any) => s + (r.suspenseDelta ?? 0), 0) / toldScenes334.length;
      if (avgSusp334 <= 0) {
        issues.push({
          location: 'Told-belief scenes — tension register',
          rule: 'TOLD_BELIEF_SUSPENSE_DECOUPLED',
          severity: 'minor',
          description: `${toldScenes334.length} scenes where a character asserts a belief average a suspenseDelta of ${avgSusp334.toFixed(2)} — claims arrive without generating tension. A contestable belief should make the audience feel the stakes of whether it is true; when assertions are accompanied by zero tension, they land as fact rather than as propositions the story will test. The audience files the claim rather than leaning forward to see if it holds.`,
          suggestedFix: 'Frame assertions so the stakes of being wrong are visible: let the claim be made under pressure, over a disagreement, or in a context where the cost of error is immediately apparent. An assertion made in a tense scene is a gamble; one made in a flat scene is exposition.',
        });
      }
    }
  }

  // TOLD_BELIEF_EMOTIONAL_FLATLINE (minor, n≥8, ≥3 assertion scenes): All
  // scenes where a character asserts a belief are emotionally neutral. Claims
  // carry no emotional charge — the belief layer operates as information
  // delivery rather than as an emotional register. Characters state things
  // they feel strongly about with no feeling; the audience registers the
  // content but not the conviction behind it. Distinct from TOLD_BELIEF_CURIOSITY_FLAT
  // (curiosity channel, Wave 323), REVELATION_DRAMA_VACUUM (revelation scenes,
  // checks BOTH emotion and suspense), TOLD_BELIEF_SUSPENSE_DECOUPLED (suspense
  // channel, not emotional shift).
  if (records.length >= 8) {
    const toldScenes334e = (records as any[]).filter(r =>
      ((r.dialogueHighlights ?? []) as string[]).some(h => h.includes(':')),
    );
    if (toldScenes334e.length >= 3 && toldScenes334e.every(r => r.emotionalShift === 'neutral')) {
      issues.push({
        location: 'Told-belief scenes — emotional register',
        rule: 'TOLD_BELIEF_EMOTIONAL_FLATLINE',
        severity: 'minor',
        description: `All ${toldScenes334e.length} scenes where a character asserts a belief are emotionally neutral — claims carry no emotional charge. Characters state things they believe (or pretend to believe) with the affect of delivering a weather report. The audience registers the content but not the conviction; told beliefs that land in flat emotional scenes feel like database entries rather than live commitments.`,
        suggestedFix: 'Give assertions emotional weight: a character stating what they believe should do so from a position of feeling. Conviction, fear of being wrong, pride in being right, or dread of the consequence if the claim is false — the emotional register around an assertion signals how much it matters to the character, and therefore how much it matters to the audience.',
      });
    }
  }

  // REVELATION_RELATIONSHIP_DECOUPLED (minor, n≥8, ≥2 revelation scenes): No
  // scene containing a revelation also contains a relationship shift. When
  // discoveries never alter how characters relate to each other, the story's
  // information events operate independently of its relational world — truth
  // is revealed but bonds are unaffected. In most stories, revelations reframe
  // relationships: the truth about who someone is changes how we trust them.
  // Distinct from TOLD_BELIEF_RELATIONSHIP_DECOUPLED (Wave 323: assertion scenes,
  // not revelation scenes) and REVELATION_DRAMA_VACUUM (emotional + suspense,
  // not relationship shifts).
  if (records.length >= 8) {
    const revScenes334 = (records as any[]).filter(r => r.revelation !== null && r.revelation !== undefined && r.revelation !== '');
    if (revScenes334.length >= 2) {
      const anyRevRelShift334 = revScenes334.some(r => ((r.relationshipShifts ?? []) as any[]).length > 0);
      if (!anyRevRelShift334) {
        issues.push({
          location: 'Revelation scenes — relational impact',
          rule: 'REVELATION_RELATIONSHIP_DECOUPLED',
          severity: 'minor',
          description: `None of the ${revScenes334.length} revelation scene(s) also carries a relationship shift — discoveries never alter how characters relate to one another. In most stories, revelations reframe relationships: the truth about who someone is, or what they did, changes trust, loyalty, or affection. When all revelations are relational non-events, the story's information layer operates independently of its human bonds.`,
          suggestedFix: 'Let at least one revelation land on a relationship: the truth uncovered should shift the trust between the character who learned it and someone else. A secret revealed should either rupture a bond (if the truth was a betrayal) or strengthen one (if the truth was a shared burden) — discoveries that leave all relationships unchanged fail their dramatic function.',
        });
      }
    }
  }

  // ── Wave 348: REVELATION_ASSERTION_DISCONNECT, REVELATION_MIDPOINT_VOID, TOLD_BELIEF_DRAMATIC_TURN_DECOUPLED ──

  // REVELATION_ASSERTION_DISCONNECT (minor, n≥8, ≥2 revelations, ≥2 assertions): The
  // story contains both told beliefs (assertions) and witnessed revelations, but not one
  // revelation lands in the same scene as — or within the two scenes after — a prior
  // assertion. The dramatic-irony engine is never engaged: a character asserts X, then
  // the story reveals not-X, and the audience feels the floor drop out. When revelations
  // never follow assertions, the two systems run on separate tracks — claims are made and
  // truths are uncovered, but no truth ever overturns a claim. Distinct from BELIEF_
  // ASYMMETRY (a count imbalance — many revelations, almost no assertions) and BELIEF_
  // REVERSAL_UNSUPPORTED (a belief flip lacking cause): this audits the sequencing of
  // assertion → revelation.
  if (records.length >= 8) {
    const assertionIdxs348 = new Set<number>(toldBeliefs.map(t => t.sceneIdx));
    const revelationIdxs348 = witnessedBeliefs.map(w => w.sceneIdx);
    if (assertionIdxs348.size >= 2 && revelationIdxs348.length >= 2) {
      const anyRevFollowsAssertion348 = revelationIdxs348.some(ri =>
        assertionIdxs348.has(ri) || assertionIdxs348.has(ri - 1) || assertionIdxs348.has(ri - 2),
      );
      if (!anyRevFollowsAssertion348) {
        issues.push({
          location: 'Assertion → revelation sequencing',
          rule: 'REVELATION_ASSERTION_DISCONNECT',
          severity: 'minor',
          description: `The story has ${assertionIdxs348.size} assertion scene(s) and ${revelationIdxs348.length} revelation(s), but no revelation lands in or within two scenes of a prior assertion — the dramatic-irony engine is never engaged. Claims are made and truths are uncovered, but no truth ever directly overturns a claim, so the audience never gets the payoff of watching a character's certainty collapse. Assertions and revelations run on separate tracks.`,
          suggestedFix: 'Sequence at least one revelation to land right after an assertion it overturns: let a character commit to a belief, then have the story reveal — soon and pointedly — that they were wrong. The gap between what a character is sure of and what is true is where dramatic irony lives; close that gap by putting the revelation in striking distance of the claim.',
        });
      }
    }
  }

  // REVELATION_MIDPOINT_VOID (minor, n≥8, ≥2 revelations): The midpoint zone (40%–60%)
  // contains no revelation, even though the story delivers two or more revelations
  // elsewhere. The structural midpoint is canonically where a major revelation turns the
  // story — recasting the goal, raising the stakes, or flipping the protagonist's
  // understanding. When revelations cluster before and after but skip the center, the
  // story's pivot lands without the discovery that should power it. Distinct from BELIEF_
  // MIDPOINT_VOID (fires when the midpoint has NO belief activity of any kind — told or
  // witnessed; this fires specifically when revelations exist but avoid the midpoint, even
  // if assertions are present there) and from REVELATION_DELAYED / REVELATION_LATE_FIRST
  // (timing of the first revelation, not the midpoint specifically).
  if (records.length >= 8 && witnessedBeliefs.length >= 2) {
    const midStart348 = Math.floor(records.length * 0.4);
    const midEnd348 = Math.floor(records.length * 0.6);
    const hasMidRevelation348 = witnessedBeliefs.some(w => w.sceneIdx >= midStart348 && w.sceneIdx < midEnd348);
    if (!hasMidRevelation348) {
      issues.push({
        location: `Midpoint zone (Scenes ${midStart348}–${midEnd348 - 1}) — no revelation`,
        rule: 'REVELATION_MIDPOINT_VOID',
        severity: 'minor',
        description: `The midpoint zone (Scenes ${midStart348}–${midEnd348 - 1}) contains no revelation, though the story delivers ${witnessedBeliefs.length} revelations elsewhere. The structural midpoint is where a major discovery should turn the story — recasting the goal, raising the stakes, or flipping the protagonist's understanding. When revelations cluster around the center but skip it, the pivot lands without the discovery that should power it, and the story's middle sags.`,
        suggestedFix: 'Place a significant revelation at the midpoint: the truth that reframes what the protagonist is really up against, or the discovery that raises the cost of failure. The midpoint reversal is most powerful when it turns on something newly learned — let the center of the story be where the audience and the protagonist learn the thing that changes everything.',
      });
    }
  }

  // TOLD_BELIEF_DRAMATIC_TURN_DECOUPLED (minor, n≥8, ≥3 assertion scenes): No scene in
  // which a character asserts a belief also carries a dramatic turn. The moments a
  // character commits to a claim never coincide with a story pivot, so assertions read as
  // inert background rather than as stances taken at consequential moments. A belief
  // declared at a turning point — a vow made as everything changes, a conviction stated
  // just as it is about to be tested — carries dramatic weight that an offhand assertion
  // does not. Completes the told-belief channel set with TOLD_BELIEF_SUSPENSE_DECOUPLED,
  // TOLD_BELIEF_EMOTIONAL_FLATLINE, TOLD_BELIEF_CURIOSITY_FLAT, and TOLD_BELIEF_
  // RELATIONSHIP_DECOUPLED; distinct from PAYOFF/CONFLICT/THEME dramatic-turn checks
  // (different scene populations).
  if (records.length >= 8) {
    const toldScenes348 = (records as any[]).filter(r =>
      ((r.dialogueHighlights ?? []) as string[]).some(h => h.includes(':')),
    );
    if (toldScenes348.length >= 3 && !toldScenes348.some(r => (r.dramaticTurn ?? 'nothing') !== 'nothing')) {
      issues.push({
        location: 'Told-belief scenes — dramatic pivot',
        rule: 'TOLD_BELIEF_DRAMATIC_TURN_DECOUPLED',
        severity: 'minor',
        description: `None of the ${toldScenes348.length} scenes where a character asserts a belief carries a dramatic turn — the moments characters commit to claims never coincide with a story pivot. Assertions land as inert background rather than as stances taken at consequential moments. A belief declared at a turning point carries weight an offhand assertion lacks; here the belief layer and the turning-point layer never meet.`,
        suggestedFix: 'Tie at least one assertion to a dramatic turn: let a character state their conviction at the moment the story reverses — a vow made as the situation flips, a certainty declared just before it is tested. An assertion made at a pivot becomes a stake the turn can pay off; one made in a flat scene is just dialogue.',
      });
    }
  }

  // ── Wave 362: REVELATION_CLOCK_DECOUPLED, TOLD_BELIEF_ACT3_ABSENT, REVELATION_CURIOSITY_PEAK_ABSENT ──

  // REVELATION_CLOCK_DECOUPLED (minor, n≥8, ≥2 revelations, ≥2 clock scenes): No
  // scene that carries a revelation also has clockRaised=true, even though the story
  // has both. The urgency engine and the truth-revealing engine never meet — discoveries
  // never arrive under deadline pressure, and deadlines never force a disclosure. When
  // time pressure and revelation are permanently decoupled, neither carries the full
  // weight it could: the revelation lands without urgency, and the clock ticks without
  // informational content. Distinct from REVELATION_SUSPENSE_DECOUPLED (avg suspenseDelta
  // of revelation scenes; this checks the clockRaised field specifically) and TOLD_
  // BELIEF_SUSPENSE_DECOUPLED (assertions, not revelations).
  if (records.length >= 8) {
    const revSet362 = new Set(witnessedBeliefs.map(w => w.sceneIdx));
    const clockScenes362 = (records as any[]).filter(r => r.clockRaised === true);
    if (revSet362.size >= 2 && clockScenes362.length >= 2) {
      const anyRevClock362 = clockScenes362.some(r => revSet362.has(r.sceneIdx));
      if (!anyRevClock362) {
        issues.push({
          location: 'Revelation × clock scenes — decoupled',
          rule: 'REVELATION_CLOCK_DECOUPLED',
          severity: 'minor',
          description: `${revSet362.size} revelation scene(s) and ${clockScenes362.length} clock-raised scenes share no overlap — the urgency engine and the discovery engine never meet. Discoveries that arrive without deadline pressure feel academic; deadlines that pass without disclosure feel mechanical. The most powerful revelations in drama land when time is running out and the truth can no longer be withheld.`,
          suggestedFix: 'Let at least one revelation arrive under deadline pressure: a truth disclosed because time has run out, a discovery that makes the clock suddenly more threatening. The intersection of "what does the character now know?" and "how much time do they have left?" is one of the most potent structural combinations in storytelling.',
        });
      }
    }
  }

  // TOLD_BELIEF_ACT3_ABSENT (minor, n≥10, ≥3 assertion scenes in Acts 1-2): No
  // assertion scene falls in Act 3 (the final 25% of scenes), even though characters
  // asserted beliefs throughout Acts 1 and 2. The finale contains no moments where
  // anyone commits to a position — beliefs are stated and tested during the rising
  // action, but the climax and resolution are delivered without anyone declaring what
  // they believe. An Act 3 without assertions means the ending resolves plot without
  // resolving the story's belief conflicts. Distinct from TOLD_BELIEF_FINAL_SCENE (last
  // scene only), TOLD_BELIEF_ACT3_SURGE (too many in Act 3 — opposite direction), and
  // BELIEF_FRONT_LOADED (assertions only in first half — this is specifically Act 3).
  if (records.length >= 10) {
    const act3Start362 = Math.floor(records.length * 0.75);
    const act3SceneIdxs362 = new Set((records as any[]).slice(act3Start362).map((r: any) => r.sceneIdx));
    const act12Assertions362 = toldBeliefs.filter(t => !act3SceneIdxs362.has(t.sceneIdx));
    const act3Assertions362 = toldBeliefs.filter(t => act3SceneIdxs362.has(t.sceneIdx));
    if (act12Assertions362.length >= 3 && act3Assertions362.length === 0) {
      issues.push({
        location: `Act 3 (from Scene ${(records as any[])[act3Start362].sceneIdx}) — no assertions`,
        rule: 'TOLD_BELIEF_ACT3_ABSENT',
        severity: 'minor',
        description: `${act12Assertions362.length} assertion(s) land in Acts 1–2 but none in Act 3 — the finale contains no moments where any character commits to a position or declares what they believe. The story tests and challenges beliefs through Acts 1 and 2, then resolves without anyone stating what they now hold to be true. An Act 3 without assertions means the ending resolves the plot but leaves the story's belief conflicts unresolved.`,
        suggestedFix: "Place at least one assertion in Act 3: a character stating what they have learned, what they still believe despite everything, or what they now reject. The climax is where beliefs are confirmed or destroyed — let a character speak the outcome of what the story's belief layer has been arguing.",
      });
    }
  }

  // REVELATION_CURIOSITY_PEAK_ABSENT (minor, n≥8, ≥2 curious revelation scenes): The
  // scene with the highest curiosityDelta has no revelation, even though at least 2 other
  // curiosity-positive scenes (curiosityDelta > 0) do carry revelations. The peak curiosity
  // moment — when the audience is most urgently wondering — is not where any truth is
  // disclosed. The story's most inquisitive scene passes without answering, or even
  // deepening, the audience's need to know with a discovery. Distinct from REVELATION_
  // CURIOSITY_DECOUPLED (revelation scenes avg curiosityDelta ≤ 0 — the opposite direction:
  // revelation scenes lack curiosity; this checks whether the peak curiosity scene lacks
  // a revelation).
  if (records.length >= 8) {
    const revSet362b = new Set(witnessedBeliefs.map(w => w.sceneIdx));
    const curiousRevScenes362 = (records as any[]).filter(r =>
      revSet362b.has(r.sceneIdx) && (r.curiosityDelta ?? 0) > 0,
    );
    if (curiousRevScenes362.length >= 2) {
      const peakCur362 = (records as any[]).reduce((best: any, r: any) =>
        (r.curiosityDelta ?? 0) > (best.curiosityDelta ?? 0) ? r : best,
        (records as any[])[0],
      );
      if (!revSet362b.has(peakCur362.sceneIdx)) {
        issues.push({
          location: `Scene ${peakCur362.sceneIdx} — peak curiosity, no revelation`,
          rule: 'REVELATION_CURIOSITY_PEAK_ABSENT',
          severity: 'minor',
          description: `Scene ${peakCur362.sceneIdx} carries the story's highest curiosityDelta (${(peakCur362.curiosityDelta ?? 0).toFixed(2)}) but no revelation, even though ${curiousRevScenes362.length} other curious scenes do deliver discoveries. The moment the audience is most urgently wondering what is true is precisely where no truth arrives — the peak of audience inquisitiveness passes without disclosure, and the most potent delivery slot for a revelation is left empty.`,
          suggestedFix: 'Place a revelation at the peak-curiosity scene: when the audience is most urgently leaning forward wondering what is true, that is the moment to give them a discovery. The scene that raises the most questions should also deliver an answer — or a revelation that opens deeper ones. Curiosity at its peak is the best possible slot for a truth to land.',
        });
      }
    }
  }

  // ── Wave 376: REVELATION_SUSPENSE_PEAK_ABSENT, TOLD_BELIEF_CLOCK_DECOUPLED, ASSERTION_MIDPOINT_VOID ──

  // REVELATION_SUSPENSE_PEAK_ABSENT (minor, n≥8, ≥2 suspense-positive revelation scenes):
  // The scene with the highest suspenseDelta carries no revelation, even though at least 2
  // other suspense-positive scenes do. The peak-tension moment — when the audience is most
  // gripped — delivers no truth, so the most charged delivery slot for a disclosure goes
  // unused. Mirror of REVELATION_CURIOSITY_PEAK_ABSENT (the curiosity channel); distinct
  // from REVELATION_SUSPENSE_DECOUPLED (which averages suspenseDelta across revelation
  // scenes — this isolates the single peak-suspense scene).
  if (records.length >= 8) {
    const revSet376 = new Set(witnessedBeliefs.map(w => w.sceneIdx));
    const tenseRevScenes376 = (records as any[]).filter(r => revSet376.has(r.sceneIdx) && (r.suspenseDelta ?? 0) > 0);
    if (tenseRevScenes376.length >= 2) {
      const peakSusp376 = (records as any[]).reduce((best: any, r: any) =>
        (r.suspenseDelta ?? 0) > (best.suspenseDelta ?? 0) ? r : best, (records as any[])[0]);
      if (peakSusp376 && !revSet376.has(peakSusp376.sceneIdx)) {
        issues.push({
          location: `Scene ${peakSusp376.sceneIdx} — peak suspense, no revelation`,
          rule: 'REVELATION_SUSPENSE_PEAK_ABSENT',
          severity: 'minor',
          description: `Scene ${peakSusp376.sceneIdx} carries the story's highest suspenseDelta (${(peakSusp376.suspenseDelta ?? 0).toFixed(2)}) but no revelation, even though ${tenseRevScenes376.length} other suspense-positive scenes deliver discoveries. The moment the audience is most gripped delivers no truth — the most charged slot for a disclosure passes empty, so peak tension and the satisfaction of revelation never coincide.`,
          suggestedFix: 'Land a revelation at the peak-tension scene: when the audience is most on edge, the arrival of a truth — especially one that reframes the danger — hits with doubled force. The scene of maximum suspense is the most powerful place to disclose something, not to withhold.',
        });
      }
    }
  }

  // TOLD_BELIEF_CLOCK_DECOUPLED (minor, n≥8, ≥3 assertion scenes, ≥2 clock scenes): No
  // scene where a character asserts a belief also raises a clock, even though the story has
  // both assertions and deadlines. Convictions are never declared under time pressure — the
  // belief layer and the urgency engine never coincide, so claims always land in calm water
  // rather than at the moment when stating a position costs something. Mirror of REVELATION_
  // CLOCK_DECOUPLED (the revelation channel); distinct from TOLD_BELIEF_SUSPENSE_DECOUPLED
  // (suspenseDelta average on assertion scenes, not clockRaised co-occurrence).
  if (records.length >= 8) {
    const assertionIdxs376 = new Set<number>(toldBeliefs.map(t => t.sceneIdx));
    const clockScenes376 = (records as any[]).filter(r => r.clockRaised === true);
    if (assertionIdxs376.size >= 3 && clockScenes376.length >= 2 && !clockScenes376.some(r => assertionIdxs376.has(r.sceneIdx))) {
      issues.push({
        location: 'Assertion scenes × clock scenes — decoupled',
        rule: 'TOLD_BELIEF_CLOCK_DECOUPLED',
        severity: 'minor',
        description: `The story has ${assertionIdxs376.size} assertion scenes and ${clockScenes376.length} clock-raised scenes, but no assertion lands in a clock scene — convictions are never declared under time pressure. The belief layer and the urgency engine run on separate tracks, so claims always land in calm water rather than at the moment when committing to a position costs something.`,
        suggestedFix: 'Stage at least one assertion under a live clock: a character stating what they believe at the moment the deadline bites, when there is no time to hedge. A conviction declared against a ticking clock is a conviction tested — it carries the weight of a choice made under pressure rather than a position stated at leisure.',
      });
    }
  }

  // ASSERTION_MIDPOINT_VOID (minor, n≥8, ≥2 assertion scenes both sides): The midpoint
  // zone (40%–60%) contains no assertion, even though characters assert beliefs both before
  // and after it. The belief layer goes quiet at the structural pivot — the moment a
  // character should be committing to (or recommitting to) a position as the story turns.
  // Distinct from BELIEF_MIDPOINT_VOID (no belief activity of ANY kind — told or witnessed —
  // in the midpoint; this fires specifically when assertions skip the center even if
  // revelations are present) and REVELATION_MIDPOINT_VOID (the revelation channel).
  if (records.length >= 8) {
    const midStart376 = Math.floor(records.length * 0.4);
    const midEnd376 = Math.floor(records.length * 0.6);
    const assertionScenes376 = toldBeliefs.map(t => t.sceneIdx);
    const inMid376 = assertionScenes376.some(i => i >= midStart376 && i < midEnd376);
    const beforeMid376 = assertionScenes376.some(i => i < midStart376);
    const afterMid376 = assertionScenes376.some(i => i >= midEnd376);
    if (!inMid376 && beforeMid376 && afterMid376) {
      issues.push({
        location: `Midpoint zone (Scenes ${midStart376}–${midEnd376 - 1}) — no assertion`,
        rule: 'ASSERTION_MIDPOINT_VOID',
        severity: 'minor',
        description: `The midpoint zone (Scenes ${midStart376}–${midEnd376 - 1}) contains no assertion, though characters declare beliefs both before and after it — the belief layer goes silent at the structural pivot. The midpoint is where a character should be committing to or recommitting to a position as the story turns; an assertion void there means the pivot reorganizes the plot without anyone staking a claim on what it means.`,
        suggestedFix: 'Place an assertion at the midpoint: let a character declare what they now believe as the story turns — a vow renewed under new information, a conviction hardened or abandoned at the pivot. The center of the story is where beliefs should be most actively contested, not where they fall silent.',
      });
    }
  }

  // ── Wave 390: REVELATION_DRAMATIC_TURN_DECOUPLED, TOLD_BELIEF_SUSPENSE_PEAK_ABSENT, TOLD_BELIEF_CURIOSITY_PEAK_ABSENT ──

  // REVELATION_DRAMATIC_TURN_DECOUPLED (minor, n≥8, ≥2 revelations, ≥3 turn scenes): No
  // revelation lands in a scene that also carries a dramatic turn, even though the story has
  // both. The disclosure engine and the pivot engine run on separate tracks — a truth never
  // turns the plot, and a turn never hinges on a truth coming out. When revelation and
  // reversal never coincide, the story's discoveries feel inert (they change nothing) and its
  // pivots feel arbitrary (they rest on no new knowledge). Distinct from REVELATION_ASSERTION_
  // DISCONNECT (revelation vs prior assertion sequencing) and TOLD_BELIEF_DRAMATIC_TURN_
  // DECOUPLED (assertions × turns): this audits revelations against turns.
  if (records.length >= 8) {
    const revSet390 = new Set(witnessedBeliefs.map(w => w.sceneIdx));
    const turnScenes390 = (records as any[]).filter(r => (r.dramaticTurn ?? 'nothing') !== 'nothing');
    if (revSet390.size >= 2 && turnScenes390.length >= 3 && !turnScenes390.some(r => revSet390.has(r.sceneIdx))) {
      issues.push({
        location: 'Revelations × dramatic turns — decoupled',
        rule: 'REVELATION_DRAMATIC_TURN_DECOUPLED',
        severity: 'minor',
        description: `The story has ${revSet390.size} revelations and ${turnScenes390.length} dramatic turns, but none share a scene — the disclosure engine and the pivot engine run on separate tracks. A truth never turns the plot, and a turn never hinges on a truth coming out, so the discoveries feel inert (they change nothing) and the reversals feel arbitrary (they rest on no new knowledge).`,
        suggestedFix: 'Fuse at least one revelation with a dramatic turn: the moment a hidden truth surfaces should also be the moment the story pivots on it — the disclosure that forces the protagonist to change course. When discovery and reversal coincide, the revelation has consequence and the turn has cause.',
      });
    }
  }

  // TOLD_BELIEF_SUSPENSE_PEAK_ABSENT (minor, n≥8, ≥2 suspense-positive assertion scenes):
  // The single highest-suspenseDelta scene carries no assertion, even though ≥2 other
  // suspense-positive scenes do. The peak-tension moment passes without anyone committing to
  // a position — a conviction declared under maximum pressure (a vow made as everything hangs
  // in the balance) is among the most charged beats available, and the story leaves that slot
  // empty. The told-belief sibling of REVELATION_SUSPENSE_PEAK_ABSENT; distinct from TOLD_
  // BELIEF_SUSPENSE_DECOUPLED (which averages suspenseDelta across assertion scenes).
  if (records.length >= 8) {
    const assertionSet390 = new Set<number>(toldBeliefs.map(t => t.sceneIdx));
    const tenseAssertion390 = (records as any[]).filter(r => assertionSet390.has(r.sceneIdx) && (r.suspenseDelta ?? 0) > 0);
    if (tenseAssertion390.length >= 2) {
      const peakSusp390 = (records as any[]).reduce((best: any, r: any) =>
        (r.suspenseDelta ?? 0) > (best.suspenseDelta ?? 0) ? r : best, (records as any[])[0]);
      if (peakSusp390 && !assertionSet390.has(peakSusp390.sceneIdx)) {
        issues.push({
          location: `Scene ${peakSusp390.sceneIdx} — peak suspense, no assertion`,
          rule: 'TOLD_BELIEF_SUSPENSE_PEAK_ABSENT',
          severity: 'minor',
          description: `Scene ${peakSusp390.sceneIdx} carries the story's highest suspenseDelta (${(peakSusp390.suspenseDelta ?? 0).toFixed(2)}) but no assertion, even though ${tenseAssertion390.length} other suspense-positive scenes contain one. The peak-tension moment passes without anyone committing to a position — a conviction declared under maximum pressure is among the most charged beats available, and the story leaves that slot empty.`,
          suggestedFix: 'Place an assertion at the peak-tension scene: a vow, a refusal, a declaration of what the character believes made at the instant everything hangs in the balance. A conviction stated under fire is tested by the very pressure of the moment, which is what gives it weight.',
        });
      }
    }
  }

  // TOLD_BELIEF_CURIOSITY_PEAK_ABSENT (minor, n≥8, ≥2 curiosity-positive assertion scenes):
  // The single highest-curiosityDelta scene carries no assertion, even though ≥2 other
  // curiosity-positive scenes do. The moment the audience is most intrigued passes without a
  // character staking a claim — an assertion at the peak of curiosity (a confident claim the
  // audience suspects may be wrong) is a potent dramatic-irony engine the story leaves unused.
  // The told-belief sibling of REVELATION_CURIOSITY_PEAK_ABSENT; distinct from TOLD_BELIEF_
  // CURIOSITY_FLAT (which averages curiosityDelta across assertion scenes).
  if (records.length >= 8) {
    const assertionSet390b = new Set<number>(toldBeliefs.map(t => t.sceneIdx));
    const curiousAssertion390 = (records as any[]).filter(r => assertionSet390b.has(r.sceneIdx) && (r.curiosityDelta ?? 0) > 0);
    if (curiousAssertion390.length >= 2) {
      const peakCur390 = (records as any[]).reduce((best: any, r: any) =>
        (r.curiosityDelta ?? 0) > (best.curiosityDelta ?? 0) ? r : best, (records as any[])[0]);
      if (peakCur390 && !assertionSet390b.has(peakCur390.sceneIdx)) {
        issues.push({
          location: `Scene ${peakCur390.sceneIdx} — peak curiosity, no assertion`,
          rule: 'TOLD_BELIEF_CURIOSITY_PEAK_ABSENT',
          severity: 'minor',
          description: `Scene ${peakCur390.sceneIdx} carries the story's highest curiosityDelta (${(peakCur390.curiosityDelta ?? 0).toFixed(2)}) but no assertion, even though ${curiousAssertion390.length} other curiosity-positive scenes contain one. The moment the audience is most intrigued passes without a character staking a claim — a confident assertion at the peak of curiosity, one the audience suspects may be wrong, is a potent dramatic-irony engine the story leaves unused.`,
          suggestedFix: 'Place an assertion at the peak-curiosity scene: let a character commit to a belief precisely when the audience is most uncertain what is true. The gap between the character\'s certainty and the audience\'s doubt is where dramatic irony lives — the most intriguing moment is the best place to open it.',
        });
      }
    }
  }

  // ── Wave 404: REVELATION_PAYOFF_DECOUPLED, TOLD_BELIEF_SEED_DECOUPLED, ASSERTION_ACT1_ONLY ──

  // REVELATION_PAYOFF_DECOUPLED (minor, n≥8, ≥2 revelation, ≥2 payoff scenes): No revelation
  // lands in a scene that also has payoffSetupIds — the story's discovery moments and narrative
  // resolution moments never coincide. A revelation that also pays off a narrative thread is the
  // most satisfying structural unit: the truth that comes out IS the thing the audience was
  // waiting for. When they never share a scene, discoveries feel like digressions and payoffs
  // feel mechanical — the story resolves threads and discloses truths on separate schedules.
  // Distinct from REVELATION_DRAMATIC_TURN_DECOUPLED (turns, not payoffs), REVELATION_ASSERTION_
  // DISCONNECT (revelation vs prior assertion timing), and CLUE_SEED_REVELATION_DECOUPLED
  // (seeds × revelation): this audits revelation against the explicit payoff/setup channel.
  if (records.length >= 8) {
    const revSet404 = new Set(witnessedBeliefs.map(w => w.sceneIdx));
    const payoffRecs404 = (records as any[]).filter(r => ((r.payoffSetupIds ?? []) as any[]).length > 0);
    if (revSet404.size >= 2 && payoffRecs404.length >= 2 && !payoffRecs404.some(r => revSet404.has(r.sceneIdx))) {
      issues.push({
        location: 'Revelations × payoff scenes — decoupled',
        rule: 'REVELATION_PAYOFF_DECOUPLED',
        severity: 'minor',
        description: `The story has ${revSet404.size} revelation scenes and ${payoffRecs404.length} payoff scenes, but none share a scene — discovery and resolution never converge. The most satisfying structural unit is a revelation that also pays off a thread: the truth that comes out IS the thing the audience was waiting for. When they are always separate, disclosures feel like digressions and payoffs feel mechanical — the story resolves threads and discloses truths on separate schedules that never compound each other.`,
        suggestedFix: 'Fuse at least one revelation with a payoff: arrange for a narrative thread to resolve at the same moment a hidden truth surfaces. The revelation IS the payoff — the answer to the audience\'s long-running question arrives precisely when the structural promise comes due. This convergence produces the deepest form of narrative satisfaction.',
      });
    }
  }

  // TOLD_BELIEF_SEED_DECOUPLED (minor, n≥8, ≥2 assertion scenes, ≥2 seed scenes): No scene
  // in which a character makes an assertion also has seededClueIds — verbal deception and
  // physical evidence-planting never coincide. A scene where a character stakes a claim AND
  // plants physical evidence creates a compound deception: the audience receives both a verbal
  // misdirection and material evidence, maximizing dramatic irony and the sense that the story
  // is being architecturally constructed around the lie. When they never share a scene, the
  // deception layer operates purely verbally while the evidence layer operates purely physically,
  // and the two never reinforce each other. Distinct from TOLD_BELIEF_CLOCK_DECOUPLED (clocks),
  // REVELATION_PAYOFF_DECOUPLED (revelations × payoffs), and all other assertion × signal checks.
  if (records.length >= 8) {
    const assertionSet404b = new Set<number>(toldBeliefs.map(t => t.sceneIdx));
    const seedRecs404b = (records as any[]).filter(r => ((r.seededClueIds ?? []) as any[]).length > 0);
    if (assertionSet404b.size >= 2 && seedRecs404b.length >= 2 && !seedRecs404b.some(r => assertionSet404b.has(r.sceneIdx))) {
      issues.push({
        location: 'Assertion scenes × seed scenes — decoupled',
        rule: 'TOLD_BELIEF_SEED_DECOUPLED',
        severity: 'minor',
        description: `The story has ${assertionSet404b.size} scenes where characters make assertions and ${seedRecs404b.length} scenes that plant clues, but none share a scene — verbal deception and physical evidence never coincide. A scene where a character stakes a claim and also plants evidence creates a compound deception: the audience receives both a verbal misdirection and material proof, making the coming revelation land with double force. When the two tracks never meet, they miss the opportunity to reinforce each other.`,
        suggestedFix: 'Let at least one assertion coincide with a clue-planting beat: have a character declare what they believe (or what they want others to believe) in the same scene where physical evidence is embedded. When the lie and the clue share a scene, the revelation that resolves both is structurally the richest moment available.',
      });
    }
  }

  // ASSERTION_ACT1_ONLY (minor, n≥8, ≥3 told beliefs, all before the 25% mark): All of the
  // story's assertions are concentrated in the first quarter — the belief layer closes at the
  // point where it should begin complicating. The conflict and resolution zones contain no new
  // claims, no re-evaluations, no shifting certainties — characters state their positions in
  // the opening and never revisit them. More specific than BELIEF_FRONT_LOADED (first 50%):
  // this fires when the belief layer is entirely confined to Act 1, leaving the bulk of the
  // story without any explicit intellectual or epistemic stakes. Distinct from TOLD_BELIEF_ACT3_
  // ABSENT (Act 3 has no assertions) and TOLD_BELIEF_DROUGHT (5 consecutive scenes silent):
  // this catches the structural pattern where assertions vanish after the setup.
  if (records.length >= 8 && toldBeliefs.length >= 3) {
    const act1End404c = Math.floor(records.length * 0.25);
    const act1Beliefs404c = toldBeliefs.filter(t => t.sceneIdx < act1End404c);
    const laterBeliefs404c = toldBeliefs.filter(t => t.sceneIdx >= act1End404c);
    if (act1Beliefs404c.length >= 3 && laterBeliefs404c.length === 0) {
      issues.push({
        location: `Assertions concentrated in Scenes 0–${act1End404c - 1} (Act 1 only)`,
        rule: 'ASSERTION_ACT1_ONLY',
        severity: 'minor',
        description: `All ${toldBeliefs.length} of the story's assertions appear before Scene ${act1End404c} (the first 25%) — the belief layer closes at the point where it should begin complicating. The conflict and resolution zones contain no new claims, re-evaluations, or shifting certainties. Characters state their positions in the opening and are never heard from again on what they believe, leaving the bulk of the story without explicit intellectual or epistemic stakes.`,
        suggestedFix: 'Distribute assertions across the full arc: characters should re-evaluate, double down, or contradict themselves as the conflict escalates. A claim made in Act 1 that a character defends under pressure in Act 2 and abandons (or dies for) in Act 3 gives the belief layer structural weight. The story\'s positions should be tested, not just stated.',
      });
    }
  }

  // ── Wave 418: REVELATION_CONSECUTIVE_FLOOD, ASSERTION_ACT2A_VOID, ASSERTION_AFTERMATH_VOID ──

  // REVELATION_CONSECUTIVE_FLOOD (minor, n≥10, ≥4 revelations): Three or more revelation
  // scenes occur consecutively with no non-revelation scene between them. When discoveries
  // pile up back-to-back, none of them registers as a turn — the audience stops reacting and
  // starts cataloguing facts. Each revelation needs time around it: a scene of consequence,
  // a relationship shift, or a character using the new knowledge before the next truth arrives.
  // Run-based mode × revelation channel. Distinct from EXPOSITION_DUMP (consecutive TOLD
  // beliefs, not revelations), ADJACENT_DECEPTION_PAYOFF (specific assertion→revelation pair
  // within 1 scene — a targeted pairing, not a run), and TOLD_BELIEF_DROUGHT (runs of silence).
  if (records.length >= 10 && witnessedBeliefs.length >= 4) {
    const revIdxSet418a = new Set(witnessedBeliefs.map(w => w.sceneIdx));
    let maxRun418a = 0;
    let curRun418a = 0;
    let maxStart418a = -1;
    let curStart418a = -1;
    for (const r of records) {
      if (revIdxSet418a.has(r.sceneIdx)) {
        if (curRun418a === 0) curStart418a = r.sceneIdx;
        if (++curRun418a > maxRun418a) { maxRun418a = curRun418a; maxStart418a = curStart418a; }
      } else {
        curRun418a = 0;
      }
    }
    if (maxRun418a >= 3) {
      issues.push({
        location: `Revelation run starting at Scene ${maxStart418a} (${maxRun418a} consecutive)`,
        rule: 'REVELATION_CONSECUTIVE_FLOOD',
        severity: 'minor',
        description: `A run of ${maxRun418a} consecutive revelation scenes occurs starting at Scene ${maxStart418a} — discoveries arrive back-to-back with no breathing room. When truths pile up in sequence, none of them lands as a turn because there is no space for the audience to absorb the change in what they believe. The second revelation arrives before the first has been processed; the third before the second.`,
        suggestedFix: 'Interleave non-revelation scenes between discoveries: after each truth is revealed, give one scene over to reaction, consequence, or dramatic use of the new knowledge before the next revelation arrives. A revelation earns its impact from the silence around it — the scene where everything changes is only perceptible against scenes where nothing changes.',
      });
    }
  }

  // ASSERTION_ACT2A_VOID (minor, n≥12, ≥3 told beliefs, assertions exist outside Act 2a):
  // No told belief (character assertion) lands in Act 2a (25%–50% of scenes), while assertions
  // appear elsewhere. Act 2a is where the protagonist first engages the central conflict — the
  // zone where characters should be most actively staking, defending, and testing positions.
  // An assertion vacuum in this zone means the belief battle opens in silence, and the audience
  // enters the complication zone without knowing what the characters believe is at stake.
  // Zone presence/absence × assertion × Act 2a. Distinct from REVELATION_ACT2A_DESERT
  // (revelations in the same zone; this is for assertions), ASSERTION_MIDPOINT_VOID (40%–60%
  // zone; this is 25%–50%), TOLD_BELIEF_ACT3_ABSENT (Act 3 zone), and ASSERTION_ACT1_ONLY
  // (Wave 404: all assertions confined TO Act 1; this fires when Act 2a specifically is void
  // while other zones carry assertions).
  if (records.length >= 12 && toldBeliefs.length >= 3) {
    const act2aS418b = Math.floor(records.length * 0.25);
    const act2aE418b = Math.floor(records.length * 0.50);
    const hasAct2aAssertion418b = toldBeliefs.some(t => t.sceneIdx >= act2aS418b && t.sceneIdx < act2aE418b);
    const hasOtherAssertion418b = toldBeliefs.some(t => !(t.sceneIdx >= act2aS418b && t.sceneIdx < act2aE418b));
    if (!hasAct2aAssertion418b && hasOtherAssertion418b) {
      issues.push({
        location: `Act 2a (Scenes ${act2aS418b}–${act2aE418b - 1}) — no character assertions`,
        rule: 'ASSERTION_ACT2A_VOID',
        severity: 'minor',
        description: `No told belief (character assertion) occurs in Act 2a (Scenes ${act2aS418b}–${act2aE418b - 1}), though assertions appear elsewhere in the story. Act 2a is where the protagonist first engages the central conflict — the zone where characters should be most actively staking and testing their positions. Without assertions in this zone, the belief battle sits silent exactly where it should be opening, and the audience enters the complication without knowing what characters think is true.`,
        suggestedFix: 'Add at least one character assertion in Act 2a: a position staked, a claim defended, or a deliberate misdirection delivered as the conflict first escalates. The entry to complication is where the story\'s epistemic stakes should crystallize — what characters believe becomes the fuel the next acts will burn through.',
      });
    }
  }

  // ASSERTION_AFTERMATH_VOID (minor, n≥10, ≥3 told beliefs): Every assertion scene is
  // followed by two scenes in which nothing happens as a result — no revelation, no
  // relationship shift, and no suspense rise in either of the two scenes that follow the
  // assertion. Claims that land without downstream cascade never establish that believing
  // the wrong thing (or the right thing at the wrong time) has any narrative weight. The
  // belief layer makes declarations but those declarations leave no footprint in the scenes
  // that immediately follow. Sequence/aftermath mode × assertion channel. Distinct from
  // REVELATION_AFTERMATH_GAP (Wave 225: aftermath of REVELATIONS — this is aftermath of
  // ASSERTIONS), TOLD_BELIEF_SUSPENSE_DECOUPLED (audits the assertion scenes themselves for
  // low suspense; AFTERMATH audits the subsequent scenes), and DECEPTION_WITHOUT_CONSEQUENCE
  // (specifically about discovered lies; this fires across all assertion types when every
  // claim is followed by a flat aftermath regardless of truth value).
  if (records.length >= 10 && toldBeliefs.length >= 3) {
    const revIdxSet418c = new Set(witnessedBeliefs.map(w => w.sceneIdx));
    const allHaveQuietAftermath418c = toldBeliefs.every(t => {
      for (let offset = 1; offset <= 2; offset++) {
        const nextIdx = t.sceneIdx + offset;
        if (nextIdx >= records.length) continue;
        const nextR = records[nextIdx];
        if (revIdxSet418c.has(nextR.sceneIdx)) return false;
        if (((nextR.relationshipShifts ?? []) as any[]).length > 0) return false;
        if ((nextR.suspenseDelta ?? 0) > 0) return false;
      }
      return true;
    });
    if (allHaveQuietAftermath418c) {
      issues.push({
        location: 'All assertion aftermath scenes',
        rule: 'ASSERTION_AFTERMATH_VOID',
        severity: 'minor',
        description: `Each of the ${toldBeliefs.length} assertion scene(s) is followed by two scenes with no revelation, no relationship shift, and no suspense rise — every claim lands without cascading consequence. Assertions that never generate an immediate ripple — no disclosure, no bond moving, no tension rising — fail to establish that beliefs have weight. The story declares positions but those declarations leave no mark in the scenes that immediately follow.`,
        suggestedFix: 'Let at least one assertion create an immediate downstream ripple: after a character states a belief, the next scene or two should show that claim changing something — another character discovers it is false, a relationship cracks, or tension rises because the assertion is now in play. Beliefs that generate consequence teach the audience to care about what characters believe.',
      });
    }
  }

  // ── Wave 432: REVELATION_EMOTIONAL_MONOTONE, REVELATION_UNPREPARED_CLIMAX, ASSERTION_SINGLETON_RUN ──

  // REVELATION_EMOTIONAL_MONOTONE (valence, n≥8, ≥3 charged revelation scenes):
  // All emotionally charged revelation scenes — those where the discovery lands
  // with a non-neutral emotional shift — carry the same polarity: either every one
  // is positive or every one is negative. When disclosures are uniformly bad news
  // (always 'negative') or uniformly good news (always 'positive'), the audience
  // learns to predict the emotional register of a revelation before it arrives,
  // draining the surprise and dramatic range from the disclosure layer. Discoveries
  // should alternate: a truth that costs something and a truth that frees something
  // create a richer epistemic texture than a series of identically-valenced shocks.
  // Valence mode × revelation channel. Distinct from REVELATION_DRAMA_VACUUM (fires
  // when ALL revelations are emotionally neutral — this fires when the charged ones
  // are all one polarity, a genuinely different population) and TOLD_BELIEF_EMOTIONAL_
  // FLATLINE (assertion channel, not revelation channel).
  if (records.length >= 8 && witnessedBeliefs.length >= 3) {
    const chargedRevScenes432a = records.filter(
      r => r.revelation !== null && r.emotionalShift !== 'neutral',
    );
    if (chargedRevScenes432a.length >= 3) {
      const allPos432a = chargedRevScenes432a.every(r => r.emotionalShift === 'positive');
      const allNeg432a = chargedRevScenes432a.every(r => r.emotionalShift === 'negative');
      if (allPos432a || allNeg432a) {
        const dominant432a = allPos432a ? 'positive' : 'negative';
        issues.push({
          location: `${chargedRevScenes432a.length} emotionally charged revelation scene(s)`,
          rule: 'REVELATION_EMOTIONAL_MONOTONE',
          severity: 'minor',
          description: `All ${chargedRevScenes432a.length} emotionally charged revelation scenes carry a '${dominant432a}' emotional shift — every charged discovery lands as ${dominant432a === 'positive' ? 'good news' : 'bad news'}. When disclosures are emotionally uniform, the audience predicts the register before the truth arrives, and the surprise of revelation collapses into formula. A disclosure layer needs both kinds of truth: revelations that cost and revelations that free create tonal texture and unpredictability.`,
          suggestedFix: `Introduce at least one revelation that lands in the opposite emotional register: if every discovery has been bad news, write one that is a genuine relief — a truth that lightens rather than burdens. Tonal variation in revelations keeps the audience uncertain about what a disclosure will mean, which is the source of suspense in the disclosure layer.`,
        });
      }
    }
  }

  // REVELATION_UNPREPARED_CLIMAX (backward-cause, n≥10, ≥2 revelations, last
  // revelation at position ≥3 in records): The story's final revelation scene
  // has no told belief (character assertion) in any of the three scenes that
  // precede it. Looking backward from the climactic disclosure, there is no
  // planted deception, positioned claim, or epistemic stake that the revelation
  // resolves — the final truth arrives without a lie it is correcting or a
  // mystery it is answering. The most powerful revelations are those that
  // discharge a dramatic irony the audience has been carrying: they have known
  // or suspected a truth; a character is about to discover it. Without a backward
  // assertion to create that irony, the final revelation reads as information
  // delivery rather than dramatic culmination. Backward-cause mode × final
  // revelation. Distinct from REVELATION_ASSERTION_DISCONNECT (checks the whole
  // story for adjacent revelation/assertion pairs — this focuses specifically on
  // the FINAL revelation and looks backward 3 scenes) and REVELATION_LATE_FIRST
  // (position of the FIRST revelation — this is about the LAST).
  if (records.length >= 10 && witnessedBeliefs.length >= 2) {
    const lastRevSceneIdx432b = Math.max(...witnessedBeliefs.map(w => w.sceneIdx));
    const lastRevRecPos432b = records.findIndex(r => r.sceneIdx === lastRevSceneIdx432b);
    if (lastRevRecPos432b >= 3) {
      const priorSceneIdxs432b = records
        .slice(lastRevRecPos432b - 3, lastRevRecPos432b)
        .map(r => r.sceneIdx);
      const hasPriorAssertion432b = toldBeliefs.some(t =>
        priorSceneIdxs432b.includes(t.sceneIdx),
      );
      if (!hasPriorAssertion432b) {
        issues.push({
          location: `Scene ${lastRevSceneIdx432b} — final revelation`,
          rule: 'REVELATION_UNPREPARED_CLIMAX',
          severity: 'minor',
          description: `The story's final revelation (Scene ${lastRevSceneIdx432b}) is not preceded by any character assertion in the three scenes before it — there is no planted claim, defended position, or deliberate misdirection that the climactic disclosure is resolving. A revelation without a prior assertion has no dramatic irony behind it: the audience has not been given a false belief to correct, a mystery to solve, or a lie to unmask. The final truth arrives as information, not as the culmination of a belief arc.`,
          suggestedFix: `Plant an assertion in the run-up to the final revelation: give a character a position they defend, a lie they maintain, or a belief they act on in the three scenes before the climactic disclosure. When the audience carries a planted claim into the revelation scene, the truth arriving feels earned — it resolves an epistemic debt rather than just delivering a fact.`,
        });
      }
    }
  }

  // ASSERTION_SINGLETON_RUN (run-based, n≥10, ≥4 told beliefs): No two assertion
  // scenes appear consecutively — the longest run of scenes containing a told
  // belief is exactly one. Every claim is an island surrounded by assertion-free
  // scenes on both sides; the belief battle never accumulates, never builds to a
  // debate, and never gives consecutive characters the chance to challenge, echo,
  // or double-down on what has just been asserted. A story where beliefs are
  // spread too thin never creates the sense of an epistemic war — it delivers
  // isolated opinions into a vacuum rather than a contested arena. Run-based mode
  // × assertion channel — the complement of REVELATION_CONSECUTIVE_FLOOD (Wave
  // 418: revelation run too dense) and the assertion-channel mirror of the silence
  // version TOLD_BELIEF_DROUGHT (which fires on too-long runs of NO assertions).
  // Distinct from TOLD_BELIEF_CLUSTERING (3+ assertions in ONE scene) and
  // EXPOSITION_DUMP (3+ consecutive told-only scenes — this fires when the max
  // consecutive assertion run is 1, the opposite condition).
  if (records.length >= 10 && toldBeliefs.length >= 4) {
    const assertionIdxSet432c = new Set(toldBeliefs.map(t => t.sceneIdx));
    let maxRun432c = 0;
    let curRun432c = 0;
    for (const r of records) {
      if (assertionIdxSet432c.has(r.sceneIdx)) {
        if (++curRun432c > maxRun432c) maxRun432c = curRun432c;
      } else {
        curRun432c = 0;
      }
    }
    if (maxRun432c <= 1) {
      issues.push({
        location: 'Assertion distribution — every claim isolated',
        rule: 'ASSERTION_SINGLETON_RUN',
        severity: 'minor',
        description: `The story has ${toldBeliefs.length} character assertions but no two appear in consecutive scenes — every claim is surrounded by assertion-free scenes on both sides. When beliefs are spread so thin that they never accumulate or overlap, the epistemic layer cannot build momentum: characters state positions in isolation rather than debate, double down, or react to what was just claimed. A story needs runs of assertion to dramatize a contested belief arena, not just isolated opinions delivered into silence.`,
        suggestedFix: `Place at least two consecutive assertion scenes: let one character\'s claim in a scene be met by another character\'s counter-assertion in the next scene, or let a position be doubled-down on after it goes uncontested. Back-to-back assertions create the texture of an argument or a belief crisis — they signal that what characters think is actually at stake.`,
      });
    }
  }

  // ── Wave 446: REVELATION_DROUGHT, ASSERTION_REACTIVE_VOID, NEGATIVE_SCENE_REVELATION_VOID ──

  // REVELATION_DROUGHT (run-based × revelation absence, n≥10, ≥2 revelations, maxSilentRun≥6):
  // Despite containing at least 2 revelations, the script has a consecutive stretch of at
  // least 6 scenes with no disclosure of any kind. A screenplay that pockets its revelations
  // in tight bursts while leaving long silences between them loses epistemic momentum: the
  // audience stops wondering what is really true because the story withholds the discovery
  // layer entirely for too long.
  // Distinctness: TOLD_BELIEF_DROUGHT (Wave 309) is the assertion-channel parallel (consecutive
  // no-assertion runs ≥5). REVELATION_ACT_2A_DESERT (Wave 253) and REVELATION_MIDPOINT_VOID
  // (Wave 348) are zone-based checks at fixed structural positions. REVELATION_DENSITY_DROP
  // (Wave 295) compares first-half vs. second-half counts globally. This is the first run-based
  // revelation-ABSENCE check: it fires on the longest consecutive silence regardless of zone.
  if (records.length >= 10 && witnessedBeliefs.length >= 2) {
    const revSet446a = new Set(witnessedBeliefs.map(w => w.sceneIdx));
    let maxSilent446a = 0;
    let curSilent446a = 0;
    for (const r of records) {
      if (revSet446a.has(r.sceneIdx)) {
        curSilent446a = 0;
      } else {
        if (++curSilent446a > maxSilent446a) maxSilent446a = curSilent446a;
      }
    }
    if (maxSilent446a >= 6) {
      issues.push({
        location: `Revelation distribution — longest revelation-free run: ${maxSilent446a} scenes`,
        rule: 'REVELATION_DROUGHT',
        severity: 'minor',
        description: `The script contains ${witnessedBeliefs.length} revelation(s) but a stretch of ${maxSilent446a} consecutive scenes has no disclosure at all. Long revelation-free runs drain epistemic momentum: when the audience goes ${maxSilent446a} scenes without learning anything true, the belief layer falls silent and the question of what characters know becomes irrelevant. The most effective scripts keep revelations distributed across the whole story — even small disclosures in between prevent the audience from disengaging from the truth-seeking layer.`,
        suggestedFix: `Seed a small revelation — not necessarily a major plot twist, but any moment where a character learns something true — somewhere within the ${maxSilent446a}-scene silent stretch. An overheard fragment, a confirmed suspicion, or a background fact admitted in passing is enough to keep the audience tracking the truth; it does not need to resolve a central mystery.`,
      });
    }
  }

  // ASSERTION_REACTIVE_VOID (sequence/aftermath × revelation→assertion, n≥10, ≥2 revelations,
  // ≥2 assertions): After every revelation in the script, the next two scenes carry no character
  // assertion. Discoveries never prompt a character to publicly update their worldview, stake a
  // claim, or restate what they believe in light of new knowledge. When revelation and assertion
  // operate on independent tracks — when knowing something changes what characters DO but never
  // what they SAY they believe — the belief layer and the disclosure layer are decoupled at the
  // causal level.
  // Distinctness: REVELATION_ASSERTION_DISCONNECT (Wave 348) checks whether a revelation lands
  // within 2 scenes of a PRIOR assertion (assertion→revelation order: does a claim get discharged
  // by a truth?). This checks the REVERSE causal direction: revelation→assertion (does a truth
  // get processed into a claim?). ASSERTION_AFTERMATH_VOID (Wave 418) checks what follows an
  // ASSERTION in the next 2 scenes. This checks what follows a REVELATION. The first aftermath
  // check on the revelation→assertion axis; orthogonal to all existing aftermath/disconnect checks.
  if (records.length >= 10 && witnessedBeliefs.length >= 2 && toldBeliefs.length >= 2) {
    const assertionSceneIdxSet446b = new Set(toldBeliefs.map(t => t.sceneIdx));
    const allRevHaveQuietAftermath446b = witnessedBeliefs.every(w => {
      const revRecPos446b = records.findIndex(r => r.sceneIdx === w.sceneIdx);
      for (let offset = 1; offset <= 2; offset++) {
        const nextIdx = revRecPos446b + offset;
        if (nextIdx >= records.length) continue;
        if (assertionSceneIdxSet446b.has(records[nextIdx].sceneIdx)) return false;
      }
      return true;
    });
    if (allRevHaveQuietAftermath446b) {
      issues.push({
        location: `All ${witnessedBeliefs.length} revelation aftermath(s) — no assertion within 2 scenes`,
        rule: 'ASSERTION_REACTIVE_VOID',
        severity: 'minor',
        description: `Every revelation (${witnessedBeliefs.length} scenes) is followed by two scenes with no character assertion — discoveries never prompt a character to publicly update their worldview or state a new position. When the script processes a revelation through action and emotion but never through a speech-act belief claim, the disclosure layer and the assertion layer operate in isolation: characters learn things but never say what those things make them believe. An assertion in the aftermath of a revelation dramatises that knowledge matters — that having learned X changes what a character is willing to claim.`,
        suggestedFix: `After at least one revelation, give a character an assertion in the next scene or two — a claim that reflects, inverts, or responds to what was just disclosed. It can be a character doubling down on a now-false belief, or a character re-positioning based on new knowledge. Either way, the assertion signals that what was discovered has epistemic weight: it changes what characters say they know.`,
      });
    }
  }

  // NEGATIVE_SCENE_REVELATION_VOID (co-occurrence × negative valence × revelation absence,
  // n≥8, ≥2 revelations, ≥3 negative-emotional scenes): None of the script's emotionally-
  // negative scenes coincide with any revelation. The script reserves its disclosures for
  // neutral or positive territory: hard moments are kept revelation-free, and discoveries
  // happen only in calmer or more positive scenes. The most dramatically powerful revelations
  // are those that land at moments of hardship — a truth emerging when a character is already
  // suffering compounds the blow and validates the cost of the difficulty.
  // Distinctness: REVELATION_DRAMA_VACUUM (Wave 281) fires when all revelation SCENES are
  // emotionally neutral — it examines the emotional texture of scenes that contain revelations.
  // REVELATION_EMOTIONAL_MONOTONE (Wave 432) fires when all CHARGED revelation scenes share
  // one polarity. This fires from the NEGATIVE-SCENE side: checking whether any emotionally
  // negative scene ever carries a revelation. The first check that audits negative-emotional
  // scenes for revelation absence rather than revelation scenes for emotional quality.
  if (records.length >= 8 && witnessedBeliefs.length >= 2) {
    const negScenes446c = (records as any[]).filter(r => r.emotionalShift === 'negative');
    if (negScenes446c.length >= 3) {
      const revSceneIdxSet446c = new Set(witnessedBeliefs.map(w => w.sceneIdx));
      const hasRevInNeg446c = negScenes446c.some((r: any) => revSceneIdxSet446c.has(r.sceneIdx));
      if (!hasRevInNeg446c) {
        issues.push({
          location: `${negScenes446c.length} negative-emotional scenes — none carry a revelation`,
          rule: 'NEGATIVE_SCENE_REVELATION_VOID',
          severity: 'minor',
          description: `The script has ${negScenes446c.length} emotionally negative scenes but none coincide with a revelation — hard moments are systematically kept revelation-free. The most dramatically potent disclosures land when a character is already under pressure: a truth that emerges during suffering validates the cost of the difficulty and gives the negative scene a deeper purpose than pain alone. When negative-emotional scenes and revelations never share space, the disclosure layer is quarantined from the story's hardest moments, keeping discoveries in safer territory and reducing their weight.`,
          suggestedFix: `Move at least one revelation into a scene with a negative emotional shift — or write a revelatory moment that lands as bad news rather than a neutral or positive fact. The emotional register of a discovery shapes how it is received: a truth that costs the character something in the moment of its arrival carries more weight than one that arrives into equanimity.`,
        });
      }
    }
  }

  // ── Wave 460: ASSERTION_CAUSAL_VACUUM, REVELATION_SUSPENSE_DEFLATION, ASSERTION_PAYOFF_DECOUPLED ──

  // ASSERTION_CAUSAL_VACUUM (backward-cause × full assertion population, n≥10, ≥3 assertions,
  // ≥1 revelation): Every assertion scene (dialogueHighlights with ':') has no revelation, no
  // dramatic turn, and no high-suspense event (suspenseDelta > 1) in either of the 2 scenes
  // immediately preceding it. When no story pressure has just occurred to motivate a character
  // to stake a claim, assertions read as unmotivated exposition drops rather than live dramatic
  // stakes born of narrative urgency.
  // Distinctness: REVELATION_UNPREPARED_CLIMAX (Wave 432) applies backward-cause to the FINAL
  // revelation looking backward for a prior assertion. This applies backward-cause to EVERY
  // ASSERTION looking backward for a narrative trigger (revelation/turn/suspense-spike) — the
  // reverse direction and a different event population. TOLD_BELIEF_DRAMATIC_TURN_DECOUPLED
  // (Wave 348) is a co-occurrence check (assertion and turn sharing the SAME scene). This checks
  // two PRIOR scenes, not the assertion scene itself. First backward-cause check with the
  // assertion as the downstream effect rather than the cause.
  if (records.length >= 10 && toldBeliefs.length >= 3 && witnessedBeliefs.length >= 1) {
    const assertionSceneIdxs460a = [...new Set(toldBeliefs.map(t => t.sceneIdx))];
    const allAssertionsVacuous460a = assertionSceneIdxs460a.every(idx => {
      const pos460a = records.findIndex(r => r.sceneIdx === idx);
      if (pos460a < 1) return true;
      for (let back = 1; back <= 2 && pos460a - back >= 0; back++) {
        const prior = (records as any[])[pos460a - back];
        if (prior.revelation !== null && prior.revelation !== undefined && prior.revelation !== '') return false;
        if ((prior.dramaticTurn ?? 'nothing') !== 'nothing') return false;
        if ((prior.suspenseDelta ?? 0) > 1) return false;
      }
      return true;
    });
    if (allAssertionsVacuous460a) {
      issues.push({
        location: `${assertionSceneIdxs460a.length} assertion scene(s) — no narrative trigger in prior 2 scenes`,
        rule: 'ASSERTION_CAUSAL_VACUUM',
        severity: 'minor',
        description: `Each of the ${assertionSceneIdxs460a.length} scene(s) where a character makes an assertion is preceded by no revelation, no dramatic turn, and no high-suspense moment in the prior two scenes — assertions drop into the story from a narrative vacuum. When no story event has just occurred to motivate a character to declare their position, told beliefs read as unmotivated exposition rather than as live stakes born of narrative pressure.`,
        suggestedFix: 'Motivate assertions narratively: have a character state what they believe because something just happened — a discovery they are reacting to, a dramatic turn that forced the question, or a surge of tension where committing to a claim feels urgent. An assertion earned by prior story pressure is a dramatic stake; one that drops from nowhere is exposition.',
      });
    }
  }

  // REVELATION_SUSPENSE_DEFLATION (average/aggregate × aftermath × revelation × suspense direction,
  // n≥8, ≥3 qualifying revelations not in last record): The average suspenseDelta of the scene
  // immediately following each qualifying revelation is < 0. Disclosures consistently trigger
  // falling tension — the story treats revelations as release valves that calm the narrative
  // rather than as detonators that escalate it.
  // Distinctness: REVELATION_SUSPENSE_DECOUPLED (Wave 295) averages suspenseDelta OF revelation
  // scenes themselves (the revelation-as-context population). This averages suspenseDelta OF THE
  // SCENE AFTER each revelation (aftermath-as-context) — the first aggregate check on the
  // post-revelation zone. REVELATION_AFTERMATH_ABSENT (Wave 225) requires suspenseDelta ≠ 0 as
  // "active aftermath" and fires when completely flat (= 0). This fires when aftermath IS
  // numerically active but uniformly negative — a different population (falling vs. flat) and
  // a different failure mode (wrong direction vs. no direction).
  if (records.length >= 8 && witnessedBeliefs.length >= 3) {
    const qualRev460b = witnessedBeliefs.filter(w => {
      const pos460b = records.findIndex(r => r.sceneIdx === w.sceneIdx);
      return pos460b >= 0 && pos460b < records.length - 1;
    });
    if (qualRev460b.length >= 3) {
      let totalAftermath460b = 0;
      for (const w of qualRev460b) {
        const pos460b = records.findIndex(r => r.sceneIdx === w.sceneIdx);
        totalAftermath460b += ((records as any[])[pos460b + 1].suspenseDelta ?? 0);
      }
      const avgAftermath460b = totalAftermath460b / qualRev460b.length;
      if (avgAftermath460b < 0) {
        issues.push({
          location: `${qualRev460b.length} revelation aftermath(s) — avg next-scene suspenseDelta ${avgAftermath460b.toFixed(2)}`,
          rule: 'REVELATION_SUSPENSE_DEFLATION',
          severity: 'minor',
          description: `The scene immediately following each of the ${qualRev460b.length} qualifying revelation(s) averages a suspenseDelta of ${avgAftermath460b.toFixed(2)} — disclosures consistently trigger falling tension. When every discovery is followed by a calmer scene, revelations function as resolution beats rather than escalators: they answer questions without creating new pressure. The most effective disclosures raise the stakes for what comes next; revelations whose aftermath is uniformly a tension drop feel like endings rather than turning points.`,
          suggestedFix: 'Engineer at least one revelation whose aftermath raises tension: stage the scene after the disclosure so that what was learned makes the next action more dangerous, more urgent, or more contested. A revelation that immediately creates a new problem generates forward momentum; one that immediately calms the pressure it arrived with is a conclusion wearing the costume of a midpoint.',
        });
      }
    }
  }

  // ASSERTION_PAYOFF_DECOUPLED (co-occurrence × assertion × payoff, n≥8, ≥2 assertion scenes,
  // ≥2 payoff scenes): No scene where a character asserts a belief (dialogueHighlights with ':')
  // also carries payoffSetupIds — verbal declarations and narrative resolutions never share a
  // scene. A confession, a truth finally spoken because planted evidence forced it, or a claim
  // delivered as the payoff of a long-running setup is among the most satisfying structural
  // moments available; when assertions and payoffs are on separate tracks, the verbal belief
  // layer misses its most structurally resonant delivery slot.
  // Distinctness: TOLD_BELIEF_SEED_DECOUPLED (Wave 404) checks assertion × seededClueIds (the
  // evidence-planting/setup SIDE of the same structural axis). This checks assertion ×
  // payoffSetupIds (the evidence-resolution/payoff SIDE). REVELATION_PAYOFF_DECOUPLED (Wave 404)
  // checks revelation × payoff — a different belief-event type. All other told-belief
  // co-occurrence checks (clock, dramatic turn, relationship, suspense-peak, curiosity-peak,
  // seed) audit different co-signal populations; payoff is a genuinely empty cell.
  if (records.length >= 8) {
    const assertionSceneIdxSet460c = new Set<number>(toldBeliefs.map(t => t.sceneIdx));
    const payoffRecs460c = (records as any[]).filter(r => ((r.payoffSetupIds ?? []) as any[]).length > 0);
    if (assertionSceneIdxSet460c.size >= 2 && payoffRecs460c.length >= 2 &&
        !payoffRecs460c.some(r => assertionSceneIdxSet460c.has(r.sceneIdx))) {
      issues.push({
        location: 'Assertion scenes × payoff scenes — decoupled',
        rule: 'ASSERTION_PAYOFF_DECOUPLED',
        severity: 'minor',
        description: `The story has ${assertionSceneIdxSet460c.size} scene(s) where a character asserts a belief and ${payoffRecs460c.length} scenes that pay off planted setups, but none share a scene — verbal declarations and narrative resolutions never converge. A confession extracted by planted evidence, a truth spoken because the setup left no other option, or a claim delivered as the structural payoff of a long-running promise is among the most satisfying moments available. When assertions and payoffs are architecturally separate, the belief layer misses its most resonant delivery slot.`,
        suggestedFix: 'Stage at least one assertion as a payoff: let a character make their declaration at the moment when planted evidence, a long-running setup, or a structural promise comes due. The confession that arrives because everything points to it — the assertion made because the setup left no other option — fuses the belief layer and the narrative resolution layer into a single, doubly-satisfying beat.',
      });
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
