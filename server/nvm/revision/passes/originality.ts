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

  // ── Wave 191: Passive voice overload, interior monologue leak, repeated location ─

  // PASSIVE_VOICE_OVERLOAD: More than 25% of action lines use passive-voice
  // constructions ("was placed", "were told", "was sealed"). Passive prose drains
  // kinetic energy — the subject should perform the action, not receive it.
  // Requires 10+ action lines.
  {
    const passiveRe = /(was|were)\s+[a-z]{2,}ed\b/i;
    let pvActionN = 0;
    let pvPassiveN = 0;
    let pvInDlg = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { pvInDlg = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { pvInDlg = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { pvInDlg = true; continue; }
      if (/^\(/.test(t)) continue;
      if (pvInDlg) continue;
      pvActionN++;
      if (passiveRe.test(t)) pvPassiveN++;
    }
    if (pvActionN >= 10 && pvPassiveN / pvActionN > 0.25) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'PASSIVE_VOICE_OVERLOAD',
        severity: 'minor',
        description: `${pvPassiveN} of ${pvActionN} action lines (${Math.round(pvPassiveN / pvActionN * 100)}%) use passive construction ("was placed", "were told") — passive prose distances the audience from the action and drains its kinetic force.`,
        suggestedFix: 'Rewrite passive lines as active: "The door was closed by Maria" → "Maria closes the door." The subject should perform the verb, not receive it.',
      });
    }
  }

  // INTERIOR_MONOLOGUE_LEAK: More than 15% of action lines describe invisible
  // internal states — thoughts, imaginings, recollections. Screenplay action lines
  // must describe only what the camera can capture; thought-describing directions
  // give the director nothing to shoot and put the author's interiority on screen
  // rather than the character's behavior. Requires 8+ action lines.
  {
    const interiorRe = /\b(thinks?\s+(?:about|of|that|over)|wonders?\s+(?:if|whether|about)|considers?\s+(?:this|that|the|a|an|\w+ing)\b|imagines?\b|ponders?\b|recalls?\s+(?:when|that|the|a|her|his|their)|remembers?\s+(?:when|that|the|a|her|his|their))\b/i;
    let imActionN = 0;
    let imInteriorN = 0;
    let imInDlg = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { imInDlg = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { imInDlg = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { imInDlg = true; continue; }
      if (/^\(/.test(t)) continue;
      if (imInDlg) continue;
      imActionN++;
      if (interiorRe.test(t)) imInteriorN++;
    }
    if (imActionN >= 8 && imInteriorN / imActionN > 0.15) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'INTERIOR_MONOLOGUE_LEAK',
        severity: 'minor',
        description: `${imInteriorN} of ${imActionN} action lines (${Math.round(imInteriorN / imActionN * 100)}%) describe invisible internal states — thoughts, wonderings, recollections. The camera cannot render what a character thinks.`,
        suggestedFix: 'Externalize the interiority: find a physical action, gesture, or prop interaction that makes the internal state filmable. Show the thought through behavior, not narration.',
      });
    }
  }

  // REPEATED_LOCATION_EXCESS: A single normalized location appears in 3 or more
  // scenes and constitutes 40%+ of all scene headings. The story returns
  // obsessively to one space without spatial or visual variety.
  // Requires 6+ records.
  if (records.length >= 6) {
    const slugCounts = new Map<string, number>();
    const slugLinesList = lines.filter(l => /^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(l.trim()));
    for (const slug of slugLinesList) {
      const normalized = slug.trim().toLowerCase()
        .replace(/\s*-\s*(day|night|continuous|later|dawn|dusk|morning|evening|afternoon|sunset|sunrise)\s*$/i, '')
        .trim();
      slugCounts.set(normalized, (slugCounts.get(normalized) ?? 0) + 1);
    }
    const totalSlugsCount = slugLinesList.length;
    if (totalSlugsCount > 0) {
      for (const [loc, count] of slugCounts) {
        if (count >= 3 && count / totalSlugsCount >= 0.4) {
          issues.push({
            location: `Setting: ${loc}`,
            rule: 'REPEATED_LOCATION_EXCESS',
            severity: 'minor',
            description: `The location "${loc}" appears in ${count} of ${totalSlugsCount} scenes (${Math.round(count / totalSlugsCount * 100)}%) — the story returns to one space with no visual or spatial variety.`,
            suggestedFix: 'Vary the settings. Even small location shifts signal narrative movement and give the director different visual vocabulary for the same dramatic tension.',
          });
          break;
        }
      }
    }
  }

  // ── Wave 201: Simile overload, dialogue dominance, adverb oversaturation ────

  // SIMILE_OVERLOAD: More than 25% of action lines contain a simile construction
  // ("like X", "as though", "as if"). Simile-heavy prose signals a writer who
  // lacks confidence in direct statement — reaching for comparison instead of
  // finding the precise image. Requires 10+ action lines.
  {
    const simileRe = /\b(like\s+[a-z]|as\s+though\b|as\s+if\b)/i;
    let slActionN = 0;
    let slSimileN = 0;
    let slInDlg = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { slInDlg = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { slInDlg = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { slInDlg = true; continue; }
      if (/^\(/.test(t)) continue;
      if (slInDlg) continue;
      slActionN++;
      if (simileRe.test(t)) slSimileN++;
    }
    if (slActionN >= 10 && slSimileN / slActionN > 0.25) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'SIMILE_OVERLOAD',
        severity: 'minor',
        description: `${slSimileN} of ${slActionN} action lines (${Math.round(slSimileN / slActionN * 100)}%) use a simile ("like X", "as if", "as though") — florid, over-written prose that signals a lack of confidence in direct statement.`,
        suggestedFix: 'Find the precise verb or image that makes the simile unnecessary. "She moved like water" → "She flowed." Direct, specific language is stronger than comparison.',
      });
    }
  }

  // DIALOGUE_DOMINANCE: Dialogue lines constitute more than 70% of all content
  // lines (dialogue + action). A screenplay heavy with talk and light on action
  // is telling where it should show — characters explain what should be
  // dramatized through behavior and staging. Requires 15+ content lines.
  {
    let ddDialogueN = 0;
    let ddActionN = 0;
    let ddInDlg = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { ddInDlg = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { ddInDlg = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { ddInDlg = true; continue; }
      if (/^\(/.test(t)) continue;
      if (ddInDlg) { ddDialogueN++; } else { ddActionN++; }
    }
    const ddTotal = ddDialogueN + ddActionN;
    if (ddTotal >= 15 && ddDialogueN / ddTotal > 0.7) {
      issues.push({
        location: 'Script dialogue/action balance',
        rule: 'DIALOGUE_DOMINANCE',
        severity: 'major',
        description: `${ddDialogueN} of ${ddTotal} content lines (${Math.round(ddDialogueN / ddTotal * 100)}%) are dialogue — the script tells where it should show. Heavy dialogue substitutes explanation for dramatized action.`,
        suggestedFix: 'Convert at least a third of expository dialogue into physical action, environmental detail, or visual behavior. What do these characters do that makes the same point without saying it?',
      });
    }
  }

  // ADVERB_OVERSATURATION: More than 20% of action lines contain an adverb
  // ending in "-ly". Adverbs in action indicate weak verbs — the writer reaches
  // for a modifier rather than finding the precise, energetic verb.
  // Requires 10+ action lines.
  {
    const adverbRe = /\b[a-z]{4,}ly\b/i;
    let aoActionN = 0;
    let aoAdverbN = 0;
    let aoInDlg = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { aoInDlg = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { aoInDlg = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { aoInDlg = true; continue; }
      if (/^\(/.test(t)) continue;
      if (aoInDlg) continue;
      aoActionN++;
      if (adverbRe.test(t)) aoAdverbN++;
    }
    if (aoActionN >= 10 && aoAdverbN / aoActionN > 0.2) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'ADVERB_OVERSATURATION',
        severity: 'minor',
        description: `${aoAdverbN} of ${aoActionN} action lines (${Math.round(aoAdverbN / aoActionN * 100)}%) contain an "-ly" adverb — a signal of weak verbs. The writer is reaching for modifiers rather than finding the precise verb.`,
        suggestedFix: 'Find the stronger verb that makes the adverb unnecessary: "walks quickly" → "strides"; "speaks quietly" → "murmurs". Precise verbs are sharper than verb+adverb.',
      });
    }
  }

  // ── Wave 217: Freshness physics — opener entropy, local lexical echo, scene-shape
  //    templating. Three higher-order measures of prose/structural sameness that the
  //    per-feature ratio checks above cannot see. ──

  // Classify action lines once (non-slug, non-cue, non-parenthetical, outside dialogue).
  const actionLines217: string[] = [];
  {
    let inDlg217 = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg217 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg217 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg217 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg217) continue;
      actionLines217.push(t);
    }
  }

  // ACTION_OPENER_MONOTONY (minor): more than 35% of action lines begin with the same
  // word. Distinct from OPENING_CONJUNCTION_OVERUSE (conjunctions only) — this catches
  // subject-pronoun anaphora ("He… He… He…"), the most common signature of unrevised
  // prose, where every line marches out of the same grammatical gate.
  if (actionLines217.length >= 10) {
    const openerCounts217 = new Map<string, number>();
    for (const t of actionLines217) {
      const first217 = t.replace(/^[^a-zA-Z]+/, '').split(/\s+/)[0]?.toLowerCase() ?? '';
      if (first217) openerCounts217.set(first217, (openerCounts217.get(first217) ?? 0) + 1);
    }
    if (openerCounts217.size > 0) {
      const [topOpener217, topCount217] = [...openerCounts217.entries()].sort((a, b) => b[1] - a[1])[0];
      const share217 = topCount217 / actionLines217.length;
      if (share217 > 0.35) {
        issues.push({
          location: 'Action lines throughout',
          rule: 'ACTION_OPENER_MONOTONY',
          severity: 'minor',
          description: `${topCount217} of ${actionLines217.length} action lines (${Math.round(share217 * 100)}%) begin with the same word ("${topOpener217}") — the prose marches out of the same grammatical gate line after line. Repeated openers flatten rhythm and betray unrevised description.`,
          suggestedFix: 'Vary how action lines begin: lead with the object, an adverbial phrase, a sound, or a dependent clause. When every line opens on the same subject pronoun, the description reads as a list rather than a scene.',
        });
      }
    }
  }

  // DISTINCTIVE_WORD_ECHO (minor): a distinctive content word (5+ letters, not a function
  // word) appears 4+ times within a window of 6 consecutive action lines — a conspicuous
  // local echo. Unlike the global cliché list, this catches a writer's own unintentional
  // word-repetition tic ("shadows" in four straight paragraphs) that no fixed dictionary
  // could anticipate.
  if (actionLines217.length >= 5) {
    const ECHO_STOP217 = new Set([
      'there','their','about','would','could','should','these','those','where','which',
      'while','after','before','again','still','being','because','through','around',
      'every','other','another','really','almost','against','toward','behind',
    ]);
    const wordPositions217 = new Map<string, number[]>();
    for (let li = 0; li < actionLines217.length; li++) {
      const seen217 = new Set<string>();
      for (const w of actionLines217[li].toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/)) {
        if (w.length >= 5 && !ECHO_STOP217.has(w) && !seen217.has(w)) {
          // count once per line so a single line repeating a word isn't an "echo"
          seen217.add(w);
          if (!wordPositions217.has(w)) wordPositions217.set(w, []);
          wordPositions217.get(w)!.push(li);
        }
      }
    }
    let echoWord217 = '';
    let echoCount217 = 0;
    for (const [w, positions] of wordPositions217) {
      if (positions.length < 4) continue;
      // sliding window: 4 occurrences spanning ≤5 action lines (a 6-line window)
      for (let k = 0; k + 3 < positions.length; k++) {
        if (positions[k + 3] - positions[k] <= 5) {
          const localCount217 = positions.filter(p => p >= positions[k] && p <= positions[k] + 5).length;
          if (localCount217 > echoCount217) { echoCount217 = localCount217; echoWord217 = w; }
          break;
        }
      }
    }
    if (echoWord217) {
      issues.push({
        location: 'Action description',
        rule: 'DISTINCTIVE_WORD_ECHO',
        severity: 'minor',
        description: `The word "${echoWord217}" appears ${echoCount217} times within a span of six action lines — a conspicuous local echo. Repeating a distinctive word in close proximity makes the prose feel unrevised and draws the eye to the repetition rather than the image.`,
        suggestedFix: `Replace all but one instance of "${echoWord217}" with a specific synonym or a different concrete image. A distinctive word should land once; its power dissolves on the third and fourth repetition.`,
      });
    }
  }

  // SCENE_SHAPE_TEMPLATING (major): 60%+ of scenes share an identical structural shape
  // signature — same emotional register, same dialogue-presence, same reversal-presence,
  // same relationship-movement. Distinct from UNIFORM_SCENE_PURPOSES (purpose label only):
  // scenes can carry varied purpose tags yet still be built from the same beat machine.
  // This catches formulaic construction that purpose-variety alone conceals.
  if (records.length >= 8) {
    const shapeCounts217 = new Map<string, number>();
    for (const r of records) {
      const sig217 = [
        r.emotionalShift ?? 'neutral',
        (r.dialogueHighlights?.length ?? 0) > 0 ? 'D' : '-',
        r.suspenseDelta < -1 ? 'R' : '-',
        (r.relationshipShifts?.length ?? 0) > 0 ? 'S' : '-',
      ].join('|');
      shapeCounts217.set(sig217, (shapeCounts217.get(sig217) ?? 0) + 1);
    }
    const [domSig217, domCount217] = [...shapeCounts217.entries()].sort((a, b) => b[1] - a[1])[0];
    const domShare217 = domCount217 / records.length;
    if (domShare217 > 0.6 && shapeCounts217.size >= 1) {
      issues.push({
        location: 'Scene construction',
        rule: 'SCENE_SHAPE_TEMPLATING',
        severity: 'major',
        description: `${domCount217} of ${records.length} scenes (${Math.round(domShare217 * 100)}%) share an identical structural shape (${domSig217}: emotion·dialogue·reversal·relationship) — the scenes are stamped from one template. Even where purpose labels vary, the underlying beat machine repeats, and the story acquires a mechanical sameness.`,
        suggestedFix: 'Vary the architecture of scenes, not just their labels: alternate dialogue-driven beats with silent action, pair some scenes with a reversal and others with a relationship shift, and let the emotional register move. Structural variety is what keeps a story from feeling assembly-lined.',
      });
    }
  }

  // ── Wave 231: Purpose bookend repeat, I-dominance in dialogue, Act 3 action drought ──

  // PURPOSE_BOOKEND_REPEAT (minor, n≥8): The dominant purpose in Act 1 (first 25%)
  // matches the dominant purpose in Act 3 (last 25%). The story's functional register
  // at the start mirrors the end rather than contrasting — the opening setup and the
  // resolution wear the same structural label. Distinct from ARC_BOOKEND_IDENTICAL
  // (character-arc pass, emotional register) — this flags functional identity.
  if (records.length >= 8) {
    const act1EndBk231 = Math.floor(records.length * 0.25);
    const act3StartBk231 = Math.floor(records.length * 0.75);
    const countPurposes231 = (recs: typeof records) => {
      const map = new Map<string, number>();
      for (const r of recs) map.set(r.purpose, (map.get(r.purpose) ?? 0) + 1);
      return [...map.entries()].sort((a, b) => b[1] - a[1]);
    };
    const act1Purposes231 = countPurposes231(records.slice(0, act1EndBk231));
    const act3Purposes231 = countPurposes231(records.slice(act3StartBk231));
    if (act1Purposes231.length > 0 && act3Purposes231.length > 0) {
      const [act1DomPurpose231, act1DomCount231] = act1Purposes231[0];
      const [act3DomPurpose231, act3DomCount231] = act3Purposes231[0];
      if (act1DomPurpose231 === act3DomPurpose231 && act1DomCount231 >= 2 && act3DomCount231 >= 2) {
        issues.push({
          location: 'Act 1 / Act 3 structure',
          rule: 'PURPOSE_BOOKEND_REPEAT',
          severity: 'minor',
          description: `Act 1 and Act 3 share the same dominant scene purpose ("${act1DomPurpose231}") — the story's opening functional register mirrors its closing rather than contrasting with it. The resolution wears the same structural label as the setup.`,
          suggestedFix: 'Vary the dominant purpose between the first and final acts: if Act 1 establishes the world, Act 3 should resolve, transform, or transcend it — not recapitulate the same function. The ending should feel structurally distinct from the beginning.',
        });
      }
    }
  }

  // DIALOGUE_I_DOMINANCE (minor, ≥12 dialogue lines): More than 40% of all dialogue
  // lines across every character begin with "I" (as a word). When nearly half of
  // every spoken line is self-referential, the dialogue register collapses into a
  // monotone of interior report — characters constantly state their own feelings,
  // wants, and histories rather than engaging with the world or each other.
  {
    let totalDlgLines231 = 0;
    let iDomCount231 = 0;
    let inDlg231 = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg231 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg231 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg231 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg231) {
        totalDlgLines231++;
        if (/^I\b/i.test(t)) iDomCount231++;
      }
    }
    if (totalDlgLines231 >= 12 && iDomCount231 / totalDlgLines231 > 0.4) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'DIALOGUE_I_DOMINANCE',
        severity: 'minor',
        description: `${iDomCount231} of ${totalDlgLines231} dialogue lines (${Math.round(iDomCount231 / totalDlgLines231 * 100)}%) begin with "I" — the dialogue is overwhelmingly self-referential. Characters constantly report their own feelings and history rather than engaging with each other or reacting to the world.`,
        suggestedFix: 'Vary dialogue openings: begin lines with "You", "We", a question, a command, or an observation. When every line starts with "I", characters are monologuing rather than conversing — each line becomes a personal statement delivered to the air.',
      });
    }
  }

  // ACT3_ACTION_DROUGHT (minor, n≥8): Act 3 (last 25%) has significantly fewer action
  // lines per scene than Act 1 (first 25%). The resolution rushes past in dialogue
  // while the setup was visually rich — the ending under-delivers on physical specificity
  // at the moment when the visual register should be at its most concentrated.
  if (records.length >= 8) {
    const act1EndAct231 = Math.floor(records.length * 0.25);
    const act3StartAct231 = Math.floor(records.length * 0.75);
    // build a lineToScene map using slug headings
    const lineToScene231: number[] = [];
    let sceneIdx231 = -1;
    for (const line of lines) {
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(line.trim())) sceneIdx231++;
      lineToScene231.push(sceneIdx231);
    }
    const actionLinesPerScene231 = new Map<number, number>();
    let inDlg231b = false;
    for (let li = 0; li < lines.length; li++) {
      const t = lines[li].trim();
      if (!t) { inDlg231b = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg231b = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg231b = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg231b) continue;
      const si231 = lineToScene231[li] ?? -1;
      if (si231 >= 0) {
        actionLinesPerScene231.set(si231, (actionLinesPerScene231.get(si231) ?? 0) + 1);
      }
    }
    const avgAct231 = (startIdx: number, endIdx: number): number => {
      let total = 0; let count = 0;
      for (let s = startIdx; s < endIdx; s++) {
        total += actionLinesPerScene231.get(s) ?? 0;
        count++;
      }
      return count > 0 ? total / count : 0;
    };
    const act1AvgAction231 = avgAct231(0, act1EndAct231);
    const act3AvgAction231 = avgAct231(act3StartAct231, records.length);
    if (act1AvgAction231 >= 3 && act3AvgAction231 < act1AvgAction231 * 0.5) {
      issues.push({
        location: `Act 3 (Scenes ${act3StartAct231}–${records.length - 1})`,
        rule: 'ACT3_ACTION_DROUGHT',
        severity: 'minor',
        description: `Act 3 averages ${act3AvgAction231.toFixed(1)} action lines per scene while Act 1 averaged ${act1AvgAction231.toFixed(1)} — the resolution rushes past in dialogue with half the visual specificity of the setup. The ending under-delivers physically at the moment the visual register should be most concentrated.`,
        suggestedFix: 'Add physical specificity to Act 3 scenes: concrete actions, specific objects, stage pictures that show the story\'s resolution rather than telling it. The climax and denouement should be as visually specific as the world-building, not thinner.',
      });
    }
  }
  // ── End Wave 231 ─────────────────────────────────────────────────────────────

  // ── Wave 245: Gerund opener dominance, scene slug time monotone, cognition in action ──

  // GERUND_OPENER_DOMINANCE (minor, ≥10 action lines): More than 45% of action
  // lines start with a gerund (present participle: -ing form). "Running through
  // the hall...", "Checking the locks...", "Staring at the screen..." —
  // participial-dominant action prose lacks the subject-verb authority of
  // "She runs the hall" or "He checks every lock." Gerund openers float;
  // declarative subjects with active verbs drive. This is complementary to
  // CONJUNCTION_OPENER_EXCESS (rhythm.ts, which checks for "and/but/so" openers)
  // and distinct from GERUND_FRAGMENT (rhythm.ts, which checks for verb-phrase
  // fragments following a comma).
  {
    let actionLinesOrig245 = 0;
    let gerundOpeners245 = 0;
    let inDlgOrig245 = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlgOrig245 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlgOrig245 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlgOrig245 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlgOrig245) continue;
      actionLinesOrig245++;
      if (/^[A-Z]?[a-z]*ing\s/i.test(t) || /^[A-Z][a-z]+ing\s/.test(t)) gerundOpeners245++;
    }
    if (actionLinesOrig245 >= 10 && gerundOpeners245 / actionLinesOrig245 > 0.45) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'GERUND_OPENER_DOMINANCE',
        severity: 'minor',
        description: `${gerundOpeners245} of ${actionLinesOrig245} action lines (${Math.round(gerundOpeners245 / actionLinesOrig245 * 100)}%) start with a gerund (-ing form) — the action prose is participial-dominant. "Running to the door" floats; "She runs to the door" drives. Gerund-heavy action loses the subject-verb authority that makes description feel commanded rather than observed.`,
        suggestedFix: 'Replace at least half the gerund openers with subject-first, active-verb sentences. Lead with the agent: "She grabs the report" not "Grabbing the report, she..." Reserve gerund openers for background action and simultaneous events, not the primary verb of each line.',
      });
    }
  }

  // SCENE_SLUG_TIME_MONOTONE (minor, ≥6 scenes): All scene sluglines with an
  // explicit time indicator use the same one (all "DAY" or all "NIGHT" or all
  // "CONTINUOUS"). A story that never changes its visual time register has no
  // cinematographic variety — there is no chiaroscuro between golden-hour
  // warmth and 3 AM fluorescence, no circadian rhythm to the drama. Requires
  // both that time indicators are present AND that they are all the same.
  {
    const timeRe245 = /\b(DAY|NIGHT|DAWN|DUSK|MORNING|EVENING|AFTERNOON|CONTINUOUS|LATER|MOMENTS LATER)\b/;
    const timeValues245 = new Set<string>();
    let slugCount245 = 0;
    for (const line of lines) {
      const t = line.trim();
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) {
        slugCount245++;
        const match245 = t.match(timeRe245);
        if (match245) timeValues245.add(match245[1].toUpperCase());
      }
    }
    if (slugCount245 >= 6 && timeValues245.size === 1) {
      const [onlyTime245] = timeValues245;
      issues.push({
        location: 'Scene slugline register',
        rule: 'SCENE_SLUG_TIME_MONOTONE',
        severity: 'minor',
        description: `All ${slugCount245} scene sluglines use the same time indicator ("${onlyTime245}") — the story exists in one unbroken visual register. No shift from DAY to NIGHT, no circadian rhythm to the drama. Light is character; a story that never changes time of day is shot entirely under one flat lighting condition.`,
        suggestedFix: `Vary the time register: let scenes take place at different times of day, with each shift earning its new visual quality. A DAY scene and a NIGHT scene of the same location carry different emotional charge — use that charge deliberately.`,
      });
    }
  }

  // COGNITION_IN_ACTION (minor, ≥10 action lines): More than 30% of action lines
  // contain cognition verbs (realizes, remembers, wonders, decides, thinks,
  // notices, understands, imagines, considers, reflects). A camera cannot capture
  // what a character thinks; action lines must describe observable behaviour.
  // Cognition verbs are prose-novel habits imported into screenplay format —
  // they tell the reader what's happening inside a character's head in a form
  // that would require narration or internal monologue to reach the screen.
  // Distinct from ACTION_EMOTION_NAMING_RE (which checks "is/was + emotion adj"):
  // this fires on cognition verbs regardless of adjacent emotion adjectives.
  {
    let actionLinesCog245 = 0;
    let cogCount245 = 0;
    let inDlgCog245 = false;
    const cogRe245 = /\b(realizes?|remembers?|wonders?|decides?|thinks?|notices?|understands?|imagines?|considers?|reflects?|recognizes?|comprehends?|perceives?|contemplates?|deliberates?)\b/i;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlgCog245 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlgCog245 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlgCog245 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlgCog245) continue;
      actionLinesCog245++;
      if (cogRe245.test(t)) cogCount245++;
    }
    if (actionLinesCog245 >= 10 && cogCount245 / actionLinesCog245 > 0.3) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'COGNITION_IN_ACTION',
        severity: 'minor',
        description: `${cogCount245} of ${actionLinesCog245} action lines (${Math.round(cogCount245 / actionLinesCog245 * 100)}%) use cognition verbs (realizes, remembers, wonders, decides, etc.) — the screenplay describes interior thought states that a camera cannot photograph. Action lines must describe observable behaviour, not mental events.`,
        suggestedFix: "Translate cognition into behaviour: instead of \"She realizes he lied\", write \"She stops. Looks at the receipt again. Sets it down slowly.\" The physical action encodes the realisation. Let the audience do the cognitive work from what they see.",
      });
    }
  }

  // ── End Wave 245 ─────────────────────────────────────────────────────────────

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
