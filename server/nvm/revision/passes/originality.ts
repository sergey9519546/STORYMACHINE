// Wave 137 — Pass 10: Originality
// Checks for clichés, generic scene descriptions, and predictable outcomes.
// Wave 137 additions: emotion-naming in action lines (show-don't-tell violation).
// Wave 149 additions: arc predictability (resolution telegraphed too early),
// character introduction clichés, and sensory monotone (scenes lacking
// concrete sensory grounding).
// Wave 163 additions: scene purpose monotone in Act 3 (no functional variety in
// the final act), reaction shot overuse (>30% of action lines are terse reactions),
// and emotional arc plateau (all scenes neutral — no emotional peaks or valleys).

import type { PassInput, PassResult, RevisionIssue } from './types.ts';
import { rewritePass } from '../rewrite.ts';
import { GENRE_MODIFIERS } from '../../../lib/genre-router.ts';
import type { StoryGenre } from '../../../engine/types.ts';

// ── Cliché phrase library ─────────────────────────────────────────────────────
const CLICHE_PHRASES = [
  // Dialogue clichés
  'we need to talk', 'it\'s not what it looks like', 'i can explain',
  'you don\'t understand', 'we\'re not so different', 'i had no choice',
  'you were always the strong one', 'i never meant to hurt you',
  'this changes everything', 'over my dead body',
  'we can get through this', 'it was never meant to be',
  'i was just doing my job', 'you have no idea what i\'ve been through',
  'trust me on this', 'i\'m not who you think i am',
  'you lied to me', 'just let it go', 'this isn\'t over',
  'things will never be the same', 'you complete me',
  // Action clichés
  'looks around nervously', 'takes a deep breath', 'fights back tears',
  'runs a hand through', 'stares into the distance', 'jaw drops',
  'eyes go wide', 'heart sinks', 'blood runs cold',
  'a single tear', 'laughs to himself', 'swallows hard',
  'shifts uncomfortably', 'bites his lip', 'bites her lip',
  'forces a smile', 'lets out a long breath',
  // Scene clichés
  'begins to rain', 'phone rings', 'alarm goes off',
  'the screen goes black', 'camera pulls back',
  'nothing but silence', 'time seems to stop', 'the world falls away',
];

// ── Generic scene descriptor patterns ────────────────────────────────────────
const GENERIC_PATTERNS = [
  /\b(beautiful|gorgeous|stunning|amazing|incredible)\s+(sunset|sunrise|view|landscape)\b/i,
  /\b(dark and stormy|cold and dark|bright and sunny)\b/i,
  /\bmeanwhile\b/i,
  /\blater that (day|night|evening)\b/i,
  /\bthe next (day|morning|night)\b/i,
  /\bsuddenly\b/i,
  /\bfor what seems like (an eternity|forever|hours)\b/i,
  /\bthe air (is|was) thick\b/i,
  /\b(time|world) (seems|seemed) to (stop|freeze|stand still)\b/i,
  /\bnothing would ever be the same\b/i,
  /\bwithout another word\b/i,
];

// ── Emotion-naming in action lines (show-don't-tell violation) ────────────────
// Matches: "John was angry", "She looked scared", "He seemed relieved"
// Action lines must SHOW behavior — not NAME internal states.
const ACTION_EMOTION_NAMING_RE = /\b(is|are|was|were|feel|feels|looks?|seems?|appears?)\s+(?:so\s+|very\s+|clearly\s+|obviously\s+)?(angry|furious|sad|depressed|scared|terrified|happy|elated|nervous|anxious|afraid|relieved|devastated|upset|worried|tense|confused|shocked|excited|frustrated|embarrassed|ashamed|guilty|jealous|hopeless|miserable|disgusted|irritated|annoyed|delighted|horrified|alarmed|bitter|resentful)\b/i;

export async function originalityPass(input: PassInput): Promise<PassResult> {
  const { fountain, records, approvedSpans } = input;
  const issues: RevisionIssue[] = [];

  const lines = fountain.split('\n');

  // ── Cliché phrases ────────────────────────────────────────────────────────
  const foundCliches = new Set<string>();
  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase();
    for (const cliche of CLICHE_PHRASES) {
      if (lower.includes(cliche) && !foundCliches.has(cliche)) {
        foundCliches.add(cliche);
        issues.push({
          location: `Line ${i + 1}`,
          rule: 'CLICHE_PHRASE',
          description: `Cliché phrase detected: "${cliche}"`,
          severity: 'minor',
          suggestedFix: 'Replace with a specific, unexpected formulation unique to this character and moment',
        });
      }
    }
  }

  // ── Generic patterns ──────────────────────────────────────────────────────
  for (let i = 0; i < lines.length; i++) {
    for (const pattern of GENERIC_PATTERNS) {
      if (pattern.test(lines[i])) {
        const match = lines[i].match(pattern)?.[0] ?? '';
        issues.push({
          location: `Line ${i + 1}`,
          rule: 'GENERIC_DESCRIPTOR',
          description: `Generic scene descriptor: "${match}" — adds no specific sensory information`,
          severity: 'minor',
          suggestedFix: 'Replace with a concrete, specific detail that only THIS story could have',
        });
        break; // one issue per line max
      }
    }
  }

  // ── Genre-specific forbidden clichés ─────────────────────────────────────
  // When the story has a genre set, check each line against the genre's
  // specific forbidden cliché list (from GENRE_MODIFIERS.forbiddenCliches).
  if (input.storyContext?.genre) {
    const genreMod = GENRE_MODIFIERS[input.storyContext.genre as StoryGenre];
    if (genreMod) {
      for (let i = 0; i < lines.length; i++) {
        const lower = lines[i].toLowerCase();
        for (const cliche of genreMod.forbiddenCliches) {
          // Strip surrounding quotes from the cliché definition before matching
          const clicheNorm = cliche.replace(/^["']|["']$/g, '').toLowerCase();
          if (clicheNorm.length > 3 && lower.includes(clicheNorm)) {
            issues.push({
              location: `Line ${i + 1}`,
              rule: 'GENRE_CLICHE',
              description: `${input.storyContext.genre.toUpperCase()} cliché: "${cliche}" — a genre trope this story should subvert or avoid`,
              severity: 'minor',
              suggestedFix: `This is a known ${input.storyContext.genre} genre trap. Find a specific expression unique to this story's characters and world`,
            });
            break; // at most one genre cliché flagged per line
          }
        }
      }
    }
  }

  // ── Scene purpose variety: fully uniform or critically low variety ────────
  const purposes = records.map(r => r.purpose);
  const purposeSet = new Set(purposes);
  if (purposeSet.size === 1 && records.length >= 4) {
    issues.push({
      location: 'Overall scene variety',
      rule: 'UNIFORM_SCENE_PURPOSES',
      description: `All ${records.length} scenes share the same purpose (${purposes[0]}) — the screenplay lacks tonal/functional variety`,
      severity: 'major',
      suggestedFix: 'Vary scene functions: mix setup, conflict, revelation, character moment, and comedic relief',
    });
  } else if (purposeSet.size <= 2 && records.length >= 8) {
    // Low variety: only 2 distinct purposes across 8+ scenes means structural monotony
    const topTwo = [...purposeSet].join(' and ');
    issues.push({
      location: 'Overall scene variety',
      rule: 'LOW_SCENE_VARIETY',
      description: `${records.length} scenes use only ${purposeSet.size} distinct purpose(s) (${topTwo}) — insufficient structural variety for a story this long`,
      severity: 'minor',
      suggestedFix: 'Introduce revelation, raising-stakes, and relief scenes to create a fuller dramatic arc',
    });
  }

  // ── Emotion-naming in action lines (show-don't-tell) ─────────────────────
  // Flag up to 2 instances per pass to keep output focused. Only fires on
  // non-dialogue, non-slug lines so stage direction isn't treated as action.
  let emotionNamingCount = 0;
  {
    let inDialogue = false;
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim();
      if (!t) { inDialogue = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDialogue = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}$/.test(t)) { inDialogue = true; continue; }
      if (inDialogue) continue; // skip dialogue lines
      if (t.startsWith('(') && t.endsWith(')')) continue; // parenthetical

      const match = t.match(ACTION_EMOTION_NAMING_RE);
      if (match && emotionNamingCount < 2) {
        emotionNamingCount++;
        issues.push({
          location: `Line ${i + 1}`,
          rule: 'EMOTION_NAMING_IN_ACTION',
          description: `Action line names an emotion directly: "${t.slice(0, 70)}${t.length > 70 ? '...' : ''}"`,
          severity: 'major',
          suggestedFix: `Show the emotional state through a specific physical behavior or concrete action instead of naming it (e.g., replace "${match[0]}" with what the character does)`,
        });
      }
    }
  }

  // ── Wave 149: Arc predictability, intro clichés, sensory monotone ───────────

  // ARC_TELEGRAPHED: The resolution of the central conflict is telegraphed in
  // the opening third through dialogue that names the ending explicitly.
  // We detect phrases that describe the protagonist's final state too early.
  const telegraphPhrases = [
    'everything will work out', 'it\'ll all be okay', 'i know we\'ll make it',
    'we\'re going to be fine', 'this will all be worth it', 'you\'ll see',
    'i promise it gets better', 'we always figure it out', 'love conquers all',
    'good always wins', 'justice will prevail', 'the truth always comes out',
    'you can\'t fight fate', 'destiny will find a way',
  ];
  if (records.length >= 5) {
    const openingThirdEnd = Math.floor(records.length / 3);
    // Only scan fountain lines corresponding to the opening act
    // Approximate by taking the first 40% of fountain lines
    const fountainLines40pct = Math.floor(lines.length * 0.40);
    let telegraphCount = 0;
    for (let i = 0; i < fountainLines40pct; i++) {
      const lower = lines[i].toLowerCase();
      for (const phrase of telegraphPhrases) {
        if (lower.includes(phrase)) {
          telegraphCount++;
          if (telegraphCount === 1) {
            issues.push({
              location: `Line ${i + 1} (opening act)`,
              rule: 'ARC_TELEGRAPHED',
              description: `Opening act contains a phrase that telegraphs the resolution: "${phrase}" — the audience knows where this ends before the conflict begins`,
              severity: 'major',
              suggestedFix: 'Remove or complicate early declarations of how things will end. Let the resolution remain genuinely uncertain until the climax earns it',
            });
          }
          break;
        }
      }
      if (telegraphCount >= 2) break;
    }
    void openingThirdEnd; // used for guard
  }

  // CHARACTER_INTRO_CLICHE: A character's first appearance uses stock shorthand
  // instead of a specific, world-revealing detail. These introductions describe
  // people via their social role or appearance stereotype rather than a singular action.
  const introCliches = [
    /\b(in his|in her|in their)\s+(mid|late|early)[\s-]*(twenties|thirties|forties|fifties)\b/i,
    /\bstrikingly (beautiful|handsome|attractive)\b/i,
    /\b(no-nonsense|take-charge|straight-laced)\b/i,
    /\bhard-boiled\b/i,
    /\bworld-weary\b/i,
    /\bby-the-book\b/i,
    /\bunassuming (young|old)?\s*(man|woman|person)\b/i,
    /\ba man who has seen (it all|too much|better days)\b/i,
    /\bwho doesn't take (no|any) (shit|nonsense|guff)\b/i,
  ];
  let introClicheCount = 0;
  for (let i = 0; i < lines.length && introClicheCount < 2; i++) {
    for (const re of introCliches) {
      if (re.test(lines[i])) {
        introClicheCount++;
        issues.push({
          location: `Line ${i + 1}`,
          rule: 'CHARACTER_INTRO_CLICHE',
          description: `Character introduced with stock description: "${lines[i].trim().slice(0, 70)}" — a generic label instead of a specific, character-revealing moment`,
          severity: 'minor',
          suggestedFix: 'Introduce characters through a specific action, object, or sensory detail that only they could have. What is the single image that defines them?',
        });
        break;
      }
    }
  }

  // SENSORY_MONOTONE: The screenplay relies almost entirely on visual description
  // with no sound, smell, texture, or temperature. Scenes that omit non-visual
  // sensory cues feel flat and disembodied.
  // We detect this by checking action lines: if the script has many action lines
  // but none reference sound/smell/touch/temperature words, it's visually-only.
  if (records.length >= 5) {
    const soundWords = /\b(sound|noise|silence|quiet|loud|ring|crack|thud|rumble|whisper|echo|hum|scrape|clatter|hiss|creak|bang|snap|roar|murmur|buzz|drip|splash|footstep|heartbeat)\b/i;
    const tactileWords = /\b(cold|warm|hot|rough|smooth|wet|dry|sharp|soft|hard|heavy|light|sticky|slippery|tight|loose|texture|grip|pressure|pain|sting|itch|numb)\b/i;

    let actionLineCount = 0;
    let sensoryCueCount = 0;
    let inDialogue2 = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDialogue2 = false; continue; }
      if (/^(INT\.|EXT\.)/i.test(t)) { inDialogue2 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}$/.test(t)) { inDialogue2 = true; continue; }
      if (inDialogue2) continue;
      if (t.startsWith('(') && t.endsWith(')')) continue;
      actionLineCount++;
      if (soundWords.test(t) || tactileWords.test(t)) sensoryCueCount++;
    }

    const sensoryRatio = actionLineCount > 0 ? sensoryCueCount / actionLineCount : 1;
    if (actionLineCount >= 20 && sensoryRatio < 0.05) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'SENSORY_MONOTONE',
        description: `Only ${Math.round(sensoryRatio * 100)}% of action lines (${sensoryCueCount}/${actionLineCount}) contain sound or tactile cues — the screenplay is purely visual, missing the texture that makes scenes physically felt`,
        severity: 'minor',
        suggestedFix: 'Add at least one non-visual sensory detail per scene: a sound, a temperature, a texture. What does this world feel like, not just look like?',
      });
    }
  }

  // ── Wave 163: Act 3 purpose monotone, reaction shot overuse, emotional plateau ──

  // SCENE_PURPOSE_MONOTONE_ACT3: All Act 3 scenes (last 25%) share the same purpose.
  // The final act lacks the functional variety of climax, crisis, resolution, and
  // falling action — it's structurally monotone at the moment that should feel most
  // dynamic. Requires 8+ records and Act 3 must have at least 2 scenes.
  if (records.length >= 8) {
    const act3StartIdx = Math.floor(records.length * 0.75);
    const act3Records = records.slice(act3StartIdx);
    if (act3Records.length >= 2) {
      const act3PurposeSet = new Set(act3Records.map(r => r.purpose));
      if (act3PurposeSet.size === 1) {
        const [onlyPurpose] = act3PurposeSet;
        issues.push({
          location: `Act 3 (Scenes ${act3StartIdx}–${records.length - 1})`,
          rule: 'SCENE_PURPOSE_MONOTONE_ACT3',
          description: `All ${act3Records.length} Act 3 scenes use the same purpose ("${onlyPurpose}") — the final act lacks the functional variety of climax, crisis, resolution, and falling action`,
          severity: 'major',
          suggestedFix: `Vary Act 3 scene functions: include at least one climax scene, one turning point, and one resolution scene so the ending has a shape rather than just repeating the same narrative beat`,
        });
      }
    }
  }

  // REACTION_SHOT_OVERUSE: More than 30% of action lines are single-beat reaction
  // shots — a character plus one reaction verb and nothing else. These terse lines
  // ("She nods.", "He turns.", "She looks.") are stock filler that substitutes for
  // real physical specificity. Requires 8+ action lines.
  const reactionShotPattern = /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+(looks?|turns?|nods?|sighs?|pauses?|smiles?|laughs?|frowns?|grimaces?|glances?|stares?|stiffens?|freezes?|shrugs?)\s*\.?$/;
  {
    let totalActionLines2 = 0;
    let reactionShotCount = 0;
    let inDialogue3 = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDialogue3 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDialogue3 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDialogue3 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDialogue3) continue;
      totalActionLines2++;
      if (reactionShotPattern.test(t)) reactionShotCount++;
    }
    if (totalActionLines2 >= 8 && reactionShotCount / totalActionLines2 > 0.30) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'REACTION_SHOT_OVERUSE',
        description: `${reactionShotCount} of ${totalActionLines2} action lines (${Math.round(reactionShotCount / totalActionLines2 * 100)}%) are single-beat reaction shots ("She nods.", "He turns.") — stock filler that replaces specific physical action`,
        severity: 'minor',
        suggestedFix: 'Replace terse reaction shots with specific, concrete actions that reveal character: what does she do that no other character would do in this moment?',
      });
    }
  }

  // EMOTIONAL_ARC_PLATEAU: All scenes have neutral emotional shifts — the story
  // has no emotional peaks or valleys at all. Every scene leaves characters and
  // audience in exactly the same affective state. Requires 6+ records.
  if (records.length >= 6) {
    const allNeutral = records.every(r => r.emotionalShift === 'neutral');
    if (allNeutral) {
      issues.push({
        location: 'Emotional arc throughout',
        rule: 'EMOTIONAL_ARC_PLATEAU',
        description: `All ${records.length} scenes have neutral emotional shifts — the story has no emotional peaks or valleys. Every scene leaves characters and audience in exactly the same affective state.`,
        severity: 'major',
        suggestedFix: 'Give the story emotional shape: at least one scene should end on a positive note (relief, hope, connection) and one on a negative (loss, betrayal, setback). An emotionally flat story is not drama.',
      });
    }
  }

  // ── Wave 176: Conjunction openings, ellipsis overuse, caps emphasis ─────────

  // OPENING_CONJUNCTION_OVERUSE: More than 25% of action lines open with a
  // coordinating conjunction ("And", "But", "So", "Then", "Yet"). An occasional
  // conjunction-led line is a deliberate rhythmic choice; a quarter of all lines
  // doing it is a verbal tic that makes the prose feel breathless and run-on.
  // Requires 8+ action lines.
  {
    const conjRe = /^(and|but|so|then|yet|or)\b/i;
    let actionN = 0;
    let conjN = 0;
    let inDlg = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg) continue;
      actionN++;
      if (conjRe.test(t)) conjN++;
    }
    if (actionN >= 8 && conjN / actionN > 0.25) {
      issues.push({
        location: 'Action line openings',
        rule: 'OPENING_CONJUNCTION_OVERUSE',
        description: `${conjN} of ${actionN} action lines (${Math.round(conjN / actionN * 100)}%) open with a conjunction ("And", "But", "Then") — a tic that strings the prose into a breathless run-on instead of standing each image on its own.`,
        severity: 'minor',
        suggestedFix: 'Cut the leading conjunctions. Let action lines begin with the subject performing the action; reserve a sentence-opening "But" for the rare beat where the reversal genuinely needs the hinge.',
      });
    }
  }

  // ELLIPSIS_OVERUSE: More than 30% of content lines (dialogue and action) trail
  // off into an ellipsis. Ellipses signal hesitation or incompletion; when nearly
  // every line uses one, the whole script reads as tentative and unresolved, and
  // genuine trailing-off loses its weight. Requires 10+ content lines.
  {
    let contentN = 0;
    let ellipsisN = 0;
    let inDlg = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg = true; continue; }
      if (/^\(/.test(t)) continue;
      contentN++;
      if (t.includes('...') || t.includes('…')) ellipsisN++;
    }
    if (contentN >= 10 && ellipsisN / contentN > 0.3) {
      issues.push({
        location: 'Dialogue and action lines',
        rule: 'ELLIPSIS_OVERUSE',
        description: `${ellipsisN} of ${contentN} content lines (${Math.round(ellipsisN / contentN * 100)}%) trail off into an ellipsis — when nearly every line hesitates, the whole script reads as tentative and the genuine trailing-off beats lose their weight.`,
        severity: 'minor',
        suggestedFix: 'Reserve ellipses for true hesitation or interruption. Let most lines land on a hard period; a definite stop reads as confidence, and makes the rare ellipsis actually mean something.',
      });
    }
  }

  // CAPS_EMPHASIS_OVERUSE: Action lines overuse ALL-CAPS words mid-sentence for
  // emphasis ("He SLAMS the door", "She SCREAMS"). Screenplays reserve caps for
  // character cues, sounds, and the first appearance of a character or key prop;
  // sprinkling them through action for emphasis is amateur shouting on the page.
  // Requires 8+ action lines and >20% with a mid-line caps word.
  {
    let actionN = 0;
    let capsN = 0;
    let inDlg = false;
    const capsWordRe = /\b[A-Z]{3,}\b/;
    const hasLowerRe = /[a-z]/;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg) continue;
      actionN++;
      // Only count lines that are prose (contain lowercase) yet shout a caps word
      if (hasLowerRe.test(t) && capsWordRe.test(t)) capsN++;
    }
    if (actionN >= 8 && capsN / actionN > 0.2) {
      issues.push({
        location: 'Action line emphasis',
        rule: 'CAPS_EMPHASIS_OVERUSE',
        description: `${capsN} of ${actionN} action lines (${Math.round(capsN / actionN * 100)}%) shout an ALL-CAPS word mid-sentence for emphasis ("He SLAMS the door") — caps belong to cues, sounds, and first appearances, not to punching up ordinary action.`,
        severity: 'minor',
        suggestedFix: 'Strip the emphasis caps and let a stronger verb carry the force: "He SLAMS the door" → "He slams the door" reads no weaker, and "He kicks it shut" reads stronger. Save caps for the page\'s rare true accents.',
      });
    }
  }

  // ── Limit total issues to avoid overwhelming output ───────────────────────
  // Clichés (minor) are pushed first and would crowd out the higher-severity
  // structural findings (UNIFORM_SCENE_PURPOSES is major) under a naive slice.
  // Sort by severity so the most important issues always survive truncation.
  const severityRank: Record<string, number> = { critical: 0, major: 1, minor: 2 };
  const prioritized = [...issues].sort(
    (a, b) => (severityRank[a.severity] ?? 3) - (severityRank[b.severity] ?? 3),
  );
  const dedupedIssues = prioritized.slice(0, 8);

  const { revised, usedLLM } = await rewritePass({ fountain, issues: dedupedIssues, passName: 'originality', approvedSpans, storyContext: input.storyContext, priorPassResults: input.priorPassResults });
  const changed = revised !== fountain;

  return {
    pass: 'originality',
    issues: dedupedIssues,
    revisedFountain: revised,
    changed,
    summary: dedupedIssues.length === 0
      ? 'Originality pass: no clichés detected'
      : `Originality pass: ${dedupedIssues.length} issue(s) — ${usedLLM ? 'rewritten' : 'flagged (stub mode)'}`,
  };
}
