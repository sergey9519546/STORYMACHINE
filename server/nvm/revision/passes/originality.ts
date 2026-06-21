// Wave 137 — Pass 10: Originality
// Checks for clichés, generic scene descriptions, and predictable outcomes.
// Wave 137 additions: emotion-naming in action lines (show-don't-tell violation).
// Wave 149 additions: arc predictability (resolution telegraphed too early),
// character introduction clichés, and sensory monotone (scenes lacking
// concrete sensory grounding).
// Wave 163 additions: scene purpose monotone in Act 3 (no functional variety in
// the final act), reaction shot overuse (>30% of action lines are terse reactions),
// and emotional arc plateau (all scenes neutral — no emotional peaks or valleys).
// Wave 259 additions: copula action dominance (linking-verb staging), filtering-
// verb overuse (perception framing), and directorial intrusion (camera/shot calls).
// Wave 273 additions: exclamation in action (editorial excitement in stage directions),
// parenthetical flood (>30% of dialogue lines are acting wrench directions),
// location repetition (>70% of sluglines use the same location).
// Wave 287 additions: opening wake-up cliché (first scene shows a character waking up),
// dialogue exclamation flood (>25% of dialogue lines end with !),
// slug interior dominance (>85% of sluglines are INT. — no exterior world).
// Wave 301 additions: mirror self-gaze cliché (mirror introspection in 2+ scenes),
// weather opener crutch (3+ scenes open on weather as mood shorthand),
// just-a-dream reveal (events dismissed as "only a dream").
// Wave 315 additions: body language cliché overuse (>20% of action lines use stock
// gestures like nods/shrugs/sighs/grins), slug generic location (>60% of sluglines
// use placeholder names like ROOM/OFFICE/STREET), flashback crutch (≥4 explicit
// flashback transition markers).
// Wave 326 additions: montage crutch (≥2 montage markers — dramatized struggle skipped),
// title card crutch (≥3 SUPER:/TITLE:/CHYRON: on-screen text cards), time card crutch
// (≥3 standalone time-jump captions like "THREE WEEKS LATER"/"MEANWHILE").
// Wave 340 additions: voiceover crutch (≥4 (V.O.) cues — story narrated rather than
// dramatized), beat direction overuse (≥4 standalone "(beat)" parentheticals — the
// single most overused stage direction), smash cut overuse (≥3 dramatic cut transitions
// like "SMASH CUT TO:"/"HARD CUT TO:" — directorial punctuation leaned on for impact).
// Wave 354 additions: fade transition overuse (≥4 FADE/DISSOLVE soft transitions),
// dream sequence crutch (≥2 labeled dream/fantasy sequences), intercut overuse (≥3
// "INTERCUT" markers — cross-cutting to manufacture momentum scenes lack).
// Wave 368 additions: off-screen cue overuse (≥4 (O.S.)/(O.C.) cues — voices from
// off-frame leaned on instead of staging the speaker), continuous slug overuse (≥3
// sluglines ending in CONTINUOUS/MOMENTS LATER/SAME/LATER — one scene chopped into
// fragments), back-to-scene crutch (≥2 "BACK TO SCENE"/"RESUME SCENE" return markers —
// the script keeps stepping out of its own timeline).
// Wave 382 additions: chapter label crutch (≥3 "CHAPTER ONE"/"PART TWO" segment headings —
// novelistic structure imposed on film), split-screen crutch (≥2 "SPLIT SCREEN" markers —
// a gimmick leaned on for parallelism), match-cut overuse (≥3 "MATCH CUT TO" transitions —
// directorial editing punctuation the writer should not be calling).
// Wave 396 additions: revelation purpose monotone (≥3 revelation scenes all sharing the same
// dramatic purpose — formulaic deployment of disclosure), dialogue short-line dominance
// (≥75% of dialogue lines are ≤4 words — uniformly telegraphic register with no length
// variation), dialogue question drought (<5% of dialogue lines are interrogative — characters
// never ask each other anything, flattening dramatic pressure).
// Wave 410 additions: slow-motion crutch (≥2 "SLOW MOTION"/"SLO-MO" markers — gravity
// outsourced to a speed effect the staging should earn), freeze-frame crutch (≥2 "FREEZE
// FRAME"/"FREEZE ON" markers — a held image leaned on for emphasis), sound-cue crutch (≥3
// hard-coded "SFX:"/"SOUND:" labels — the writer scoring the sound design instead of letting
// the prose imply it). Each is a distinct device crutch not covered by SMASH_CUT_OVERUSE
// (hard/jump/match cuts), DIRECTORIAL_INTRUSION (camera/lens calls, "WE HEAR"), or the card
// crutches (on-screen text/time captions).
// Wave 424 additions: insert shot crutch (≥3 "INSERT:" label lines — directorial close-up
// call left in the action prose rather than folded into the narrative; distinct from
// DIRECTORIAL_INTRUSION which targets camera/lens calls inside action blocks), ellipsis
// action overuse (>20% of action lines contain "..." — stage directions that trail off
// instead of completing the image; underweight/bloat mode), action adverb flood (>25% of
// action lines carry a manner adverb like "slowly"/"quietly"/"suddenly" — substituting
// description for specific concrete action; distinct from body language clichés and reaction
// shot overuse which target specific gesture patterns).
// Wave 452 additions: dialogue ellipsis flood (>20% of dialogue lines end with "..." —
// characters trail off instead of completing thoughts; underweight/bloat × dialogue ×
// trailing-off punctuation, distinct from ELLIPSIS_ACTION_OVERUSE which audits action),
// slug time monotone (>80% of time-tagged sluglines use the same time-of-day label —
// story plays out in one lighting condition; underweight/bloat × slugline × time-of-day),
// dialogue filler opener (≥4 speeches begin with "Well,", "Look,", "Listen,", "Actually,"
// etc. — verbal hedges that delay the first direct word; count threshold × dialogue ×
// opening word, first check targeting the opening word of each character speech).
// Wave 438 additions: passive verb dominance (>25% of action lines use passive construction
// like "is seen"/"are found"/"can be heard" — passive voice removes agency from the visual
// description and distances the reader; underweight/bloat × action prose × verb form, distinct
// from COPULA_ACTION_DOMINANCE which targets linking-verb state predicates, not passive voice),
// dialogue monologue drought (<5% of dialogue lines are >15 words while ≥12 dialogue lines
// exist — no extended speeches or full arguments, the register is uniformly telegraphic;
// underweight/bloat × dialogue × length distribution, distinct from DIALOGUE_SHORT_LINE_
// DOMINANCE which measures what percent are ≤4 words, not whether any are long), action
// question intrusion (≥3 action lines contain a question mark — the writer inserts authorial
// questions into stage directions instead of presenting images; count threshold × action layer
// × discourse mode, distinct from DIALOGUE_QUESTION_DROUGHT which audits the dialogue layer).
// Wave 466 additions: action pronoun opener flood (>50% of ≥8 action paragraphs open with "He"
// or "She" — monotone visual grammar where every block begins with the character agent rather
// than image, object, or environment; distribution/timing × action prose × paragraph opener,
// first check on block-opening distribution), dialogue question flood (>35% of ≥10 dialogue
// lines end with "?" — characters never assert, only ask; underweight/bloat × dialogue ×
// interrogative register, opposite pole of DIALOGUE_QUESTION_DROUGHT), ellipsis run action
// (≥3 consecutive action lines ending with "..." — a run of trailing-off stage directions;
// run-based × action prose × ellipsis, distinct from ELLIPSIS_ACTION_OVERUSE which measures
// proportion not consecutive run length).
// Wave 480 additions: dialogue filler run (≥3 consecutive dialogue speeches each opening with
// a verbal hedge like "Well," or "Look," — filler bunched into an unbroken sequence rather
// than scattered; run-based × dialogue × filler opener, consecutive-run variant of
// DIALOGUE_FILLER_OPENER which counts total not runs), action average line brevity (≥8 action
// lines averaging ≤4 words each — the prose layer is collectively telegraphic shorthand with
// no image construction; average/aggregate × action prose × word length, first average/aggregate
// check in originality.ts), action peak paragraph (≥4 action paragraphs, peak ≥5× average and
// ≥40 words — one sprawling over-written set piece surrounded by sparse prose; single-peak
// isolation × action prose × paragraph length, first single-peak isolation check in
// originality.ts).

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

  // ── Wave 259: Copula action dominance, filtering-verb overuse, directorial intrusion ──

  // COPULA_ACTION_DOMINANCE (minor, ≥10 action lines): More than 45% of action
  // lines lean on a copula ("is/are/was/were") as their spine instead of an active
  // verb. Screenplay action is present-tense and kinetic — "She slams the door",
  // not "The door is slammed" or "There is a door". Copula-driven description
  // stages a static tableau; active verbs make the page move. Distinct from
  // GERUND_OPENER_DOMINANCE (participial openers) and COGNITION_IN_ACTION (mental
  // verbs); this targets the inert linking-verb habit.
  {
    let actionLines259 = 0;
    let copulaLines259 = 0;
    let inDlg259 = false;
    const copulaRe259 = /\b(is|are|was|were|isn'?t|aren'?t|wasn'?t|weren'?t)\b/i;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg259 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg259 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg259 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg259) continue;
      actionLines259++;
      if (copulaRe259.test(t)) copulaLines259++;
    }
    if (actionLines259 >= 10 && copulaLines259 / actionLines259 > 0.45) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'COPULA_ACTION_DOMINANCE',
        severity: 'minor',
        description: `${copulaLines259} of ${actionLines259} action lines (${Math.round(copulaLines259 / actionLines259 * 100)}%) lean on a linking verb ("is/are/was/were") rather than an active verb — the action prose stages a static tableau. "There is a man at the window" describes a photograph; "A man watches from the window" describes a scene in motion.`,
        suggestedFix: 'Recast copula sentences around active verbs. Cut expletive openers ("There is", "It was") and let the subject act: not "The room is dark and cold" but "Cold seeps through the dark room." Active verbs give the page forward momentum.',
      });
    }
  }

  // FILTERING_VERB_OVERUSE (minor, ≥10 action lines): More than 25% of action
  // lines filter the image through a character's perception ("she sees", "he
  // hears", "she watches", "he feels") instead of presenting it directly. Filtering
  // puts a pane of glass between the audience and the event — "She sees the car
  // explode" is weaker than "The car explodes." Distinct from COGNITION_IN_ACTION
  // (interior thought verbs); this targets sensory-perception framing.
  {
    let actionLinesFilt259 = 0;
    let filterLines259 = 0;
    let inDlgFilt259 = false;
    const filterRe259 = /\b(sees?|saw|hears?|heard|watches?|watched|feels?|felt|looks? at|listens?|listened|observes?|observed)\b/i;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlgFilt259 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlgFilt259 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlgFilt259 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlgFilt259) continue;
      actionLinesFilt259++;
      if (filterRe259.test(t)) filterLines259++;
    }
    if (actionLinesFilt259 >= 10 && filterLines259 / actionLinesFilt259 > 0.25) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'FILTERING_VERB_OVERUSE',
        severity: 'minor',
        description: `${filterLines259} of ${actionLinesFilt259} action lines (${Math.round(filterLines259 / actionLinesFilt259 * 100)}%) filter the image through a character's perception ("she sees", "he hears", "she watches") rather than presenting it directly. Filtering verbs put a pane of glass between the audience and the event — the camera already shows what the character sees; saying so twice weakens the image.`,
        suggestedFix: 'Cut the perception verb and show the thing itself: not "She sees the door creak open" but "The door creaks open." Reserve "she sees" for the rare beat where the act of watching — not the thing watched — is the point.',
      });
    }
  }

  // DIRECTORIAL_INTRUSION (minor, ≥3 occurrences): Action lines embed explicit
  // camera and editing directions ("ANGLE ON", "CLOSE ON", "WE SEE", "PAN",
  // "ZOOM", "DOLLY", "TRACKING", "CAMERA"). A spec script directs the reader's
  // eye through prose, not through shot calls — naming the lens is the director's
  // job, and overt camera direction dates the page and breaks immersion. Counts
  // occurrences across action lines (sluglines and transitions excluded).
  {
    let directorialCount259 = 0;
    let firstDirLine259 = -1;
    let inDlgDir259 = false;
    const directorialRe259 = /\b(ANGLE ON|CLOSE ON|CLOSE-?UP|WIDE ON|WE SEE|WE HEAR|PAN (TO|ACROSS|UP|DOWN|LEFT|RIGHT)|ZOOM (IN|OUT)|DOLLY|TRACKING SHOT|CRANE SHOT|THE CAMERA|PUSH IN|RACK FOCUS)\b/;
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim();
      if (!t) { inDlgDir259 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlgDir259 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlgDir259 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlgDir259) continue;
      if (directorialRe259.test(t)) {
        directorialCount259++;
        if (firstDirLine259 < 0) firstDirLine259 = i + 1;
      }
    }
    if (directorialCount259 >= 3) {
      issues.push({
        location: `Action lines (first at line ${firstDirLine259})`,
        rule: 'DIRECTORIAL_INTRUSION',
        severity: 'minor',
        description: `${directorialCount259} action lines embed explicit camera or editing directions ("ANGLE ON", "WE SEE", "PAN", "ZOOM", "CLOSE ON"). A spec script directs the reader's eye through prose, not shot calls — naming the lens is the director's job. Overt camera direction dates the page and pulls the reader out of the story.`,
        suggestedFix: 'Translate camera direction into prose emphasis. Instead of "CLOSE ON the trembling hand", write a line that isolates it: "Her hand trembles. Just her hand." White space and sentence focus do the camera\'s work without claiming the director\'s chair.',
      });
    }
  }

  // ── Wave 273: EXCLAMATION_IN_ACTION ───────────────────────────────────────
  // Two or more action lines end with an exclamation mark. Exclamation marks in
  // stage directions are editorial intrusion — the writer is performing excitement
  // rather than writing it into the scene. Action prose should present events and
  // let them speak; an '!' in description tells the reader how to feel rather than
  // giving them something to feel. A single '!' might be a deliberate stylistic
  // accent; two or more signals a habit. Requires 8+ action lines.
  if (actionLines217.length >= 8) {
    const exclamActionCount273 = actionLines217.filter(t => t.endsWith('!')).length;
    if (exclamActionCount273 >= 2) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'EXCLAMATION_IN_ACTION',
        severity: 'minor',
        description: `${exclamActionCount273} action lines end with "!" — the writer is using exclamation marks in stage directions, editorializing rather than writing. Stage direction should present events; an exclamation mark tells the reader how to feel instead of giving them a scene to react to. When description shouts, it stops trusting the event.`,
        suggestedFix: 'Remove exclamation marks from action lines. If the scene needs to feel urgent or explosive, write the urgency into the verbs and imagery, not the punctuation. "The car explodes." is stronger than "The car explodes!". The event carries its own charge.',
      });
    }
  }

  // ── Wave 273: PARENTHETICAL_FLOOD ─────────────────────────────────────────
  // More than 30% of dialogue lines are parenthetical acting wrench directions
  // ("(beat)", "(laughs)", "(angrily)"). Parentheticals should be rare, used only
  // when the delivery is genuinely non-obvious from context; overusing them means
  // the writer does not trust the dialogue or the actor. A page heavy with wrench
  // directions reads as novice — experienced writers say it once in the words
  // and let the reading do the rest. Requires 10+ dialogue lines.
  {
    let parentheticalCount273 = 0;
    let dlgLineCount273 = 0;
    let inDlg273 = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg273 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg273 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg273 = true; continue; }
      if (!inDlg273) continue;
      if (/^\(/.test(t)) parentheticalCount273++;
      else dlgLineCount273++;
    }
    if (dlgLineCount273 >= 10 && parentheticalCount273 / dlgLineCount273 > 0.30) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'PARENTHETICAL_FLOOD',
        severity: 'minor',
        description: `${parentheticalCount273} parenthetical acting directions appear alongside ${dlgLineCount273} dialogue lines (${Math.round(parentheticalCount273 / dlgLineCount273 * 100)}%) — the writer is over-directing the actors. Parentheticals should be reserved for genuinely non-obvious delivery beats; this density signals a distrust of the dialogue and the cast.`,
        suggestedFix: 'Strip most parentheticals and let the words carry the delivery. If a line only lands with a specific tone, rewrite the line until it does the work itself. Reserve parentheticals for the rare beats where the written context could genuinely mislead a reader about how the line should land.',
      });
    }
  }

  // ── Wave 273: LOCATION_REPETITION ─────────────────────────────────────────
  // More than 70% of scene sluglines use the same location name. A story that
  // returns to one location for most of its scenes has no visual or spatial
  // variety — the screenplay becomes a stage play in disguise. Distinct from
  // SCENE_SLUG_TIME_MONOTONE (which tracks time-of-day); this tracks the
  // spatial world. Location repetition also often signals that the writer is
  // avoiding the work of staging new environments. Requires 6+ sluglines.
  {
    const locationCounts273 = new Map<string, number>();
    let totalSlugs273 = 0;
    for (const line of lines) {
      const t = line.trim();
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) {
        totalSlugs273++;
        const locStr273 = t
          .replace(/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)\s*/i, '')
          .replace(/\s*[-–]\s*(DAY|NIGHT|DAWN|DUSK|MORNING|EVENING|AFTERNOON|CONTINUOUS|LATER|MOMENTS LATER).*$/i, '')
          .trim()
          .toLowerCase();
        if (locStr273) locationCounts273.set(locStr273, (locationCounts273.get(locStr273) ?? 0) + 1);
      }
    }
    if (totalSlugs273 >= 6 && locationCounts273.size > 0) {
      const sorted273 = [...locationCounts273.entries()].sort((a, b) => b[1] - a[1]);
      const topLoc273 = sorted273[0];
      if (topLoc273[1] / totalSlugs273 > 0.70) {
        issues.push({
          location: 'Scene slugline variety',
          rule: 'LOCATION_REPETITION',
          severity: 'minor',
          description: `${topLoc273[1]} of ${totalSlugs273} scenes (${Math.round(topLoc273[1] / totalSlugs273 * 100)}%) use the same location ("${topLoc273[0]}") — the story barely leaves one space. Without spatial variety the screenplay becomes a stage play: the same visual world, the same physical context, the same geography of tension. Distinct locations create distinct emotional registers.`,
          suggestedFix: 'Move at least a third of the scenes to different locations. Each new space carries its own lighting, sound, scale, and emotional charge — a kitchen confession feels different from a parking-lot confrontation, even with the same dialogue. Let the physical world diversify the story\'s emotional register.',
        });
      }
    }
  }

  // ── Wave 287: OPENING_WAKE_UP_CLICHE ─────────────────────────────────────
  // The first scene shows a character waking up — alarm clock, eyes opening,
  // bolting upright in bed. This is the most notorious opening cliché in
  // screenwriting: it starts the story at the character's lowest-information,
  // lowest-stakes moment and signals to readers that the writer began at the
  // literal beginning of a day rather than the dramatic beginning of a story.
  // Distinct from the cliché-phrase density check (which counts stock phrases
  // across the whole script): this is a structural check that fires on a
  // single occurrence confined to the opening scene. Requires 2+ scenes so a
  // deliberate single-scene vignette is not penalized.
  {
    const slugIdxs287: number[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(lines[i].trim())) slugIdxs287.push(i);
    }
    if (slugIdxs287.length >= 2) {
      const firstSceneText287 = lines.slice(slugIdxs287[0], slugIdxs287[1]).join('\n');
      const wakeUpRe287 = /\b(wakes? up|wakes with|waking up|alarm (clock|blares|buzzes|rings|goes off)|eyes (open|flutter open|snap open|blink open)|bolts upright|stirs awake|jolts awake)\b/i;
      if (wakeUpRe287.test(firstSceneText287)) {
        issues.push({
          location: 'Opening scene',
          rule: 'OPENING_WAKE_UP_CLICHE',
          severity: 'minor',
          description: 'The story opens with a character waking up — the most common opening cliché in screenwriting. A wake-up opening starts at the character\'s lowest-stakes, lowest-information moment and tells the reader the writer began at the literal start of a day rather than the dramatic start of a story.',
          suggestedFix: 'Open the story at the latest possible moment before the inciting incident: mid-action, mid-conversation, or mid-problem. If the waking moment is genuinely essential (a nightmare that matters, an unfamiliar room), make the disorientation the point — otherwise cut to the first scene where something is already at stake.',
        });
      }
    }
  }

  // ── Wave 287: DIALOGUE_EXCLAMATION_FLOOD ─────────────────────────────────
  // More than 25% of dialogue lines end with an exclamation mark. When
  // every emotion is shouted at the reader, nothing is shouted — the
  // exclamation mark loses all meaning and the script reads as uniformly
  // heightened. Real dramatic intensity is built through restraint; a single
  // exclamation mark in a quiet script lands harder than ten in a loud one.
  // Requires 10+ dialogue lines.
  {
    const dlgLines287: string[] = [];
    let inDialogue287 = false;
    for (const line of lines) {
      const t = line.trim();
      if (/^[A-Z][A-Z\s]{1,30}$/.test(t) && !/^(INT\.|EXT\.|FADE|CUT|DISSOLVE)/.test(t)) {
        inDialogue287 = true;
      } else if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) {
        inDialogue287 = false;
      } else if (inDialogue287 && t.length > 0 && !/^\(/.test(t)) {
        dlgLines287.push(t);
      }
    }
    if (dlgLines287.length >= 10) {
      const exclCount287 = dlgLines287.filter(l => l.endsWith('!')).length;
      if (exclCount287 / dlgLines287.length > 0.25) {
        issues.push({
          location: 'Dialogue exclamation marks',
          rule: 'DIALOGUE_EXCLAMATION_FLOOD',
          severity: 'minor',
          description: `${exclCount287} of ${dlgLines287.length} dialogue lines (${Math.round(exclCount287 / dlgLines287.length * 100)}%) end with an exclamation mark. When every line shouts, no line stands out — the reader becomes numb to the heightened register. Dramatic intensity is achieved through contrast, not volume.`,
          suggestedFix: 'Reserve exclamation marks for genuine outbursts — a sudden revelation, a direct threat, a moment of pure joy or terror. Remove the mark from lines that are merely emphatic; let the word choice and context carry the weight. Fewer exclamations mean each one lands.',
        });
      }
    }
  }

  // ── Wave 287: SLUG_INTERIOR_DOMINANCE ────────────────────────────────────
  // More than 85% of scene sluglines are INT. (interior) — no exterior world.
  // A screenplay that never ventures outside risks visual monotony: the same
  // walls, the same lighting conditions, the same sense of confinement. Even
  // stories that are thematically interior benefit from at least occasional
  // exterior breaks to signal the world beyond the characters' immediate
  // environment. Requires 6+ sluglines.
  {
    let totalSlugs287 = 0;
    let intSlugs287 = 0;
    for (const line of lines) {
      const t = line.trim();
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) {
        totalSlugs287++;
        if (/^INT\./i.test(t)) intSlugs287++;
      }
    }
    if (totalSlugs287 >= 6 && intSlugs287 / totalSlugs287 > 0.85) {
      issues.push({
        location: 'Scene slugline INT/EXT balance',
        rule: 'SLUG_INTERIOR_DOMINANCE',
        severity: 'minor',
        description: `${intSlugs287} of ${totalSlugs287} scenes (${Math.round(intSlugs287 / totalSlugs287 * 100)}%) are interior (INT.) — the story never escapes its walls. Without exterior scenes, the visual world is homogeneous: same lighting conditions, same spatial scale, same sensory palette. Even a single exterior scene resets the audience's spatial awareness.`,
        suggestedFix: 'Move at least one or two scenes outdoors: a confrontation in a parking lot, a phone call on a fire escape, a revelation at dawn. Exterior locations carry different light, sound, and scale — they signal that the story inhabits a world rather than a stage set.',
      });
    }
  }

  // ── Wave 301: MIRROR_SELF_GAZE_CLICHE ────────────────────────────────────
  // A character studies themselves in a mirror in two or more scenes. The
  // mirror gaze is screenwriting's stock shorthand for introspection and
  // identity crisis — used once it can work; recurring, it signals the writer
  // has no other tool for externalizing a character's inner state. Counts
  // scenes (not lines) containing a mirror-gaze beat.
  {
    const mirrorRe301 = /\b(in|into|at) the mirror\b|\bmirror reflects\b|\bstudies (his|her|their) reflection\b|\bstares at (his|her|their) reflection\b/i;
    let mirrorScenes301 = 0;
    let inScene301 = false;
    let sceneHasMirror301 = false;
    for (const line of lines) {
      const t = line.trim();
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) {
        if (inScene301 && sceneHasMirror301) mirrorScenes301++;
        inScene301 = true;
        sceneHasMirror301 = false;
      } else if (inScene301 && mirrorRe301.test(t)) {
        sceneHasMirror301 = true;
      }
    }
    if (inScene301 && sceneHasMirror301) mirrorScenes301++;
    if (mirrorScenes301 >= 2) {
      issues.push({
        location: 'Mirror beats across scenes',
        rule: 'MIRROR_SELF_GAZE_CLICHE',
        severity: 'minor',
        description: `${mirrorScenes301} scenes contain a character gazing at themselves in a mirror — screenwriting's stock shorthand for introspection. One mirror beat can land; recurring mirror-gazes signal that the script has a single tool for externalizing inner conflict, and the audience registers the device instead of the emotion.`,
        suggestedFix: 'Keep at most one mirror beat (or cut them all) and externalize self-confrontation through behavior instead: a character rehearsing what they\'ll say, avoiding a photograph, putting on or stripping off a uniform. Identity crisis shows best in what a character does to be seen — or not seen — by others.',
      });
    }
  }

  // ── Wave 301: WEATHER_OPENER_CRUTCH ──────────────────────────────────────
  // Three or more scenes open with a weather or atmosphere line ("Rain
  // hammers the windows.", "Thunder rolls in the distance."). Weather as a
  // recurring scene-opener is pathetic-fallacy shorthand — mood assigned by
  // forecast rather than dramatized through character and action. Checks the
  // first non-empty line after each slugline.
  {
    const weatherRe301 = /\b(rain|rains|raining|thunder|lightning|snow|snows|snowing|fog|mist|wind|winds|storm|drizzle|downpour|clouds?|overcast|sleet|hail)\b/i;
    let weatherOpeners301 = 0;
    for (let i = 0; i < lines.length; i++) {
      if (!/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(lines[i].trim())) continue;
      for (let j = i + 1; j < lines.length; j++) {
        const t = lines[j].trim();
        if (!t) continue;
        if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) break;
        if (weatherRe301.test(t)) weatherOpeners301++;
        break;
      }
    }
    if (weatherOpeners301 >= 3) {
      issues.push({
        location: 'Scene openings',
        rule: 'WEATHER_OPENER_CRUTCH',
        severity: 'minor',
        description: `${weatherOpeners301} scenes open with a weather or atmosphere line — mood is being assigned by forecast. Recurring weather openers are pathetic-fallacy shorthand: rain for sadness, thunder for dread. The audience reads the device, and the scenes' actual emotional content gets outsourced to the sky.`,
        suggestedFix: 'Open scenes on character and action; let weather appear only when it materially affects the scene (a storm that strands someone, heat that frays tempers). If atmosphere matters, embed it in behavior — a character shaking out an umbrella says rain and tells us something about them in the same beat.',
      });
    }
  }

  // ── Wave 301: JUST_A_DREAM_REVEAL ────────────────────────────────────────
  // The script dismisses dramatized events as "just a dream" — the oldest
  // fake-out in the book. Retroactively cancelling scenes the audience
  // invested in teaches them not to trust anything they see; the device
  // spends narrative credibility for one jolt. Fires on a single occurrence
  // because one is already one too many in most scripts.
  {
    const dreamRe301 = /\b(it was (all )?(just |only )?a dream|only a dream|just a dream|wakes? (up )?(gasping|screaming|with a start)[^.]*\.? ?(it was|just) a (dream|nightmare))\b/i;
    const dreamLine301 = lines.findIndex(l => dreamRe301.test(l));
    if (dreamLine301 !== -1) {
      issues.push({
        location: `Line ${dreamLine301 + 1}`,
        rule: 'JUST_A_DREAM_REVEAL',
        severity: 'minor',
        description: 'The script dismisses dramatized events as "just a dream" — a fake-out that retroactively cancels scenes the audience invested in. Once a story plays this card, viewers learn to withhold belief from everything that follows; the single jolt costs the script its standing credibility.',
        suggestedFix: 'If the dream content matters, present it honestly as a dream or vision from the start and let its meaning — not its reveal — carry the scene. If it exists only to fake out the audience, cut it and dramatize the fear it represented in the waking story, where consequences are real.',
      });
    }
  }

  // ── Wave 315: BODY_LANGUAGE_CLICHE_OVERUSE, SLUG_GENERIC_LOCATION, FLASHBACK_CRUTCH ──

  // BODY_LANGUAGE_CLICHE_OVERUSE (minor, ≥10 action lines): More than 20% of
  // action lines use stock body language (nods, shrugs, sighs, smiles, grins,
  // chuckles, snorts, blinks, rolls eyes, raises eyebrows). These default
  // gestures are the physical equivalent of emotion-naming — any character in
  // any story could nod or shrug; the gesture carries no individual texture.
  // Distinct from REACTION_SHOT_OVERUSE (terse full-line reactions),
  // EMOTION_NAMING_IN_ACTION (naming emotional states), COGNITION_IN_ACTION
  // (mental verbs).
  {
    let actionLines315b = 0;
    let bodyClicheCount315 = 0;
    let inDlg315b = false;
    const bodyClicheRe315 = /\b(?:nods?|shrugs?|sighs?|smiles?|grins?|chuckles?|snorts?|blinks?|rolls? (?:his|her|their) eyes?|raises? (?:his|her|their|an?) eyebrows?)\b/i;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg315b = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg315b = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg315b = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg315b) continue;
      actionLines315b++;
      if (bodyClicheRe315.test(t)) bodyClicheCount315++;
    }
    if (actionLines315b >= 10 && bodyClicheCount315 / actionLines315b > 0.2) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'BODY_LANGUAGE_CLICHE_OVERUSE',
        severity: 'minor',
        description: `${bodyClicheCount315} of ${actionLines315b} action lines (${Math.round(bodyClicheCount315 / actionLines315b * 100)}%) use stock body language (nods, shrugs, sighs, smiles, rolls eyes, etc.) — the physical vocabulary of a generic screenplay. These default gestures carry no individual texture: any character in any situation could nod or shrug. Physical specificity is character.`,
        suggestedFix: "Replace stock gestures with specific physical behaviour: instead of \"He nods\", write \"He runs his thumb along the edge of the table, once.\" The idiosyncratic gesture reveals character; the stock gesture merely confirms that an emotion occurred.",
      });
    }
  }

  // SLUG_GENERIC_LOCATION (minor, ≥6 sluglines, >60% generic): More than 60%
  // of scene sluglines use entirely generic location labels (ROOM, OFFICE,
  // CAR, HOUSE, BUILDING, STREET, ALLEY, CORRIDOR, HALLWAY, LOBBY, APARTMENT,
  // BEDROOM, KITCHEN, WAREHOUSE, BASEMENT, ATTIC, ROOFTOP, GARAGE). Generic
  // labels are placeholders, not places — they give the reader nothing to
  // inhabit. Distinct from LOCATION_REPETITION and REPEATED_LOCATION_EXCESS
  // (those fire when the same specific place recurs); this fires when locations
  // are unnamed and interchangeable as a class.
  {
    const slugs315g: string[] = [];
    const genericLocRe315 = /^(?:INT\.|EXT\.|INT\/EXT\.|I\/E\.)\s+(?:A |THE |AN )?(?:SMALL |LARGE |DARK |EMPTY |OLD |NEW |ABANDONED )?(ROOM|OFFICE|CAR|HOUSE|BUILDING|STREET|ALLEY|CORRIDOR|HALLWAY|LOBBY|APARTMENT|BEDROOM|KITCHEN|WAREHOUSE|BASEMENT|ATTIC|ROOFTOP|GARAGE)\s*[-–]/i;
    for (const line of lines) {
      const t = line.trim();
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) slugs315g.push(t);
    }
    if (slugs315g.length >= 6) {
      const genericCount315 = slugs315g.filter(s => genericLocRe315.test(s)).length;
      if (genericCount315 / slugs315g.length > 0.6) {
        issues.push({
          location: 'Scene sluglines',
          rule: 'SLUG_GENERIC_LOCATION',
          severity: 'minor',
          description: `${genericCount315} of ${slugs315g.length} scene sluglines (${Math.round(genericCount315 / slugs315g.length * 100)}%) use generic location labels (ROOM, OFFICE, BUILDING, STREET, etc.) — placeholders rather than places. A screenplay grounds the audience in specific geography: "INT. MARA\'S CLUTTERED REPAIR SHOP - NIGHT" anchors the scene; "INT. ROOM - NIGHT" gives them a void.`,
          suggestedFix: "Give every location a specific name that carries information: the name of an establishment, a character, or a defining feature. Even a modest space earns texture when named — \"INT. THE BROKEN COMPASS BAR - NIGHT\" is a setting; \"INT. BAR - NIGHT\" is an empty stage.",
        });
      }
    }
  }

  // FLASHBACK_CRUTCH (minor, ≥4 markers): Four or more explicit flashback
  // transition markers (FLASHBACK:, BEGIN FLASHBACK:, END FLASHBACK:, BACK TO:,
  // RETURN TO:) signal a script structured around fragmented memory rather than
  // present-tense causality. Flashbacks in bulk replace forward-moving story
  // with accumulated explanation; the audience inhabits the past instead of the
  // present and forward momentum evaporates. Distinct from JUST_A_DREAM_REVEAL
  // (fake-out reveals) and OPENING_WAKE_UP_CLICHE (first-scene awakening).
  {
    const flashbackRe315 = /^(FLASHBACK[:\.]?|BEGIN FLASHBACK[:\.]?|START FLASHBACK[:\.]?|END FLASHBACK[:\.]?|BACK TO[:\.]?|RETURN TO[:\.]?|FLASH BACK[:\.]?|FLASHBACK TO[:\.]?)/i;
    const fbCount315 = lines.filter(l => flashbackRe315.test(l.trim())).length;
    if (fbCount315 >= 4) {
      issues.push({
        location: `${fbCount315} flashback markers throughout`,
        rule: 'FLASHBACK_CRUTCH',
        severity: 'minor',
        description: `${fbCount315} explicit flashback transitions (FLASHBACK:, END FLASHBACK, BACK TO:, etc.) signal a script structured around fragmented memory. Flashbacks in bulk replace forward-moving causality with accumulated explanation — the audience experiences events after the fact rather than in the present tense. Sustained use trains the audience that the current scene is provisional.`,
        suggestedFix: 'Flatten the temporal structure: dramatize as much as possible in present-tense sequence, where actions have immediate consequences. When the past matters, let characters carry it in behaviour rather than revisiting it directly — the scar is more powerful than the wound.',
      });
    }
  }

  // ── Wave 326: MONTAGE_CRUTCH ─────────────────────────────────────────────
  // Two or more montage markers ("MONTAGE:", "BEGIN MONTAGE", "montage of …").
  // A montage compresses effort, training, or the passage of time into a
  // sequence of glimpses — useful once, but leaned on repeatedly it skips
  // exactly the dramatized struggle that earns a story's turns. Distinct from
  // FLASHBACK_CRUTCH (temporal flashback markers) and TIME_CARD_CRUTCH (caption
  // jumps): this fires on montage devices specifically.
  {
    const montageRe326 = /^(MONTAGE\b|BEGIN MONTAGE\b|END MONTAGE\b|MONTAGE:|A MONTAGE\b)|\bmontage of\b/i;
    const montageCount326 = lines.filter(l => montageRe326.test(l.trim())).length;
    if (montageCount326 >= 2) {
      issues.push({
        location: `${montageCount326} montage markers`,
        rule: 'MONTAGE_CRUTCH',
        severity: 'minor',
        description: `${montageCount326} montage sequences appear in the script. A montage compresses effort, training, or elapsed time into a string of glimpses — it works once as a deliberate device, but leaned on repeatedly it skips the dramatized struggle that earns a story's turns. Each montage is a stretch the audience watches summarized rather than experienced.`,
        suggestedFix: 'Keep at most one montage and dramatize the rest: pick the single most important beat inside each montage and play it as a full scene with stakes and consequence. The work a character does is more compelling shown in one hard scene than glimpsed across a dozen quick cuts.',
      });
    }
  }

  // ── Wave 326: TITLE_CARD_CRUTCH ──────────────────────────────────────────
  // Three or more on-screen text cards ("SUPER:", "TITLE:", "CHYRON:",
  // "SUBTITLE:", "TEXT ON SCREEN"). Printed text that delivers information the
  // story should dramatize is a crutch — it tells the audience facts (dates,
  // places, stakes) the scenes ought to convey. Distinct from FLASHBACK_CRUTCH
  // and MONTAGE_CRUTCH: this fires on superimposed-text devices.
  {
    const titleCardRe326 = /^(SUPER:|SUPERIMPOSE:|TITLE:|TITLE CARD:|CHYRON:|SUBTITLE:|CAPTION:|TEXT ON SCREEN|ON SCREEN TEXT|INTERTITLE:)/i;
    const titleCardCount326 = lines.filter(l => titleCardRe326.test(l.trim())).length;
    if (titleCardCount326 >= 3) {
      issues.push({
        location: `${titleCardCount326} on-screen text cards`,
        rule: 'TITLE_CARD_CRUTCH',
        severity: 'minor',
        description: `${titleCardCount326} on-screen text cards (SUPER:, TITLE:, CHYRON:, etc.) appear in the script. Printed text delivering dates, places, or stakes is a crutch: it hands the audience facts the scenes themselves should convey. A story that repeatedly superimposes its information has stopped trusting its own images to carry meaning.`,
        suggestedFix: 'Convert most text cards into dramatized information: establish a location through a recognizable detail in the frame, a time jump through changed circumstances, a stakes update through a character\'s reaction. Reserve on-screen text for the rare fact no scene can naturally show.',
      });
    }
  }

  // ── Wave 326: TIME_CARD_CRUTCH ───────────────────────────────────────────
  // Three or more standalone temporal-jump captions ("THREE WEEKS LATER",
  // "MEANWHILE", "TWO YEARS EARLIER", "DAYS LATER", "ELSEWHERE", "LATER THAT
  // NIGHT"). Frequent jump captions manage time and space by announcement
  // rather than by storytelling — the script narrates its own structure
  // instead of letting transitions read from the scenes. Distinct from
  // TITLE_CARD_CRUTCH (superimposed exposition text) and MONTAGE_CRUTCH.
  {
    const timeCardRe326 = /^((MOMENTS|HOURS|DAYS|WEEKS|MONTHS|YEARS|SECONDS|MINUTES) LATER|(THREE|TWO|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN|A FEW|SEVERAL|MANY) (DAYS|WEEKS|MONTHS|YEARS|HOURS|MINUTES) (LATER|EARLIER|AGO)|MEANWHILE|ELSEWHERE|LATER THAT (NIGHT|DAY|EVENING|MORNING|AFTERNOON)|EARLIER THAT (NIGHT|DAY|EVENING|MORNING)|THE NEXT (DAY|MORNING|NIGHT|WEEK|YEAR)|SOME TIME LATER|YEARS EARLIER|YEARS LATER)\.?$/i;
    const timeCardCount326 = lines.filter(l => timeCardRe326.test(l.trim())).length;
    if (timeCardCount326 >= 3) {
      issues.push({
        location: `${timeCardCount326} time-jump captions`,
        rule: 'TIME_CARD_CRUTCH',
        severity: 'minor',
        description: `${timeCardCount326} standalone time-jump captions ("THREE WEEKS LATER", "MEANWHILE", "LATER THAT NIGHT") appear in the script. Frequent jump captions manage time and space by announcement rather than by storytelling — the script narrates its own structure instead of letting the transitions read from the scenes themselves. Each caption is a seam the audience is told about rather than carried across.`,
        suggestedFix: 'Let most transitions read from the scenes: a change of season in the frame, a healed wound, a different set of clothes, a line of dialogue that anchors the new moment. Reserve explicit time captions for jumps so large or specific that no visual cue could convey them.',
      });
    }
  }

  // ── Wave 340: VOICEOVER_CRUTCH ───────────────────────────────────────────
  // Four or more (V.O.) voiceover cues. A character speaking in voiceover narrates
  // what the scene should dramatize — leaned on, it becomes the writer telling the
  // story aloud instead of staging it. One framing voiceover can work; four or more
  // signals a script that explains itself rather than trusting its images and action.
  // Distinct from INTERIOR_MONOLOGUE_LEAK (interior thought described in action lines,
  // not a spoken-narration cue) and DIRECTORIAL_INTRUSION (camera/shot calls).
  {
    const voRe340 = /\(\s*V\.?\s*O\.?\s*\)/i;
    const voCount340 = lines.filter(l => voRe340.test(l.trim())).length;
    if (voCount340 >= 4) {
      issues.push({
        location: `${voCount340} voiceover cues`,
        rule: 'VOICEOVER_CRUTCH',
        severity: 'minor',
        description: `${voCount340} (V.O.) voiceover cues appear in the script. Voiceover narration delivers in words what the scene should deliver in image and action — used heavily, it becomes the writer telling the story aloud rather than staging it, so the audience is informed of events instead of experiencing them. A single framing voiceover can serve a story; a script that returns to narration repeatedly has stopped trusting its own scenes to carry meaning.`,
        suggestedFix: 'Dramatize what the voiceover narrates: convert the spoken summary into an action the audience watches, a line of in-scene dialogue, or a visual detail that makes the point without comment. Reserve voiceover for the rare interior truth no scene could externalize, and let the images carry the rest.',
      });
    }
  }

  // ── Wave 340: BEAT_DIRECTION_OVERUSE ─────────────────────────────────────
  // Four or more standalone "(beat)" parentheticals. "(beat)" is the single most
  // overused stage direction — a generic pause inserted to manufacture rhythm the
  // dialogue should create on its own. Even when overall parenthetical density is
  // within range (so PARENTHETICAL_FLOOD does not fire), a script that reaches for
  // "(beat)" again and again is papering over flat exchanges with typographic pauses.
  // Distinct from PARENTHETICAL_FLOOD (a ratio of ALL parentheticals to dialogue
  // lines): this fires on the specific "(beat)" tic regardless of overall density.
  {
    const beatRe340 = /^\(\s*(a\s+|another\s+|long\s+|short\s+|brief\s+|small\s+)?beat\s*\.?\s*\)$/i;
    const beatCount340 = lines.filter(l => beatRe340.test(l.trim())).length;
    if (beatCount340 >= 4) {
      issues.push({
        location: `${beatCount340} "(beat)" directions`,
        rule: 'BEAT_DIRECTION_OVERUSE',
        severity: 'minor',
        description: `${beatCount340} standalone "(beat)" parentheticals appear in the script. "(beat)" is screenwriting's most overused stage direction — a generic pause dropped in to manufacture rhythm the dialogue should create on its own. Reaching for it repeatedly papers over flat exchanges with typographic silence: the pause is asserted on the page rather than earned by what the characters say and withhold.`,
        suggestedFix: 'Cut most "(beat)" directions and build the pause into the writing instead: a short reply against a long one, a question left unanswered, a physical action that interrupts the rhythm. When a silence genuinely matters, dramatize what fills it — a look, a turn away — rather than labeling the gap.',
      });
    }
  }

  // ── Wave 340: SMASH_CUT_OVERUSE ──────────────────────────────────────────
  // Three or more dramatic cut transitions ("SMASH CUT TO:", "HARD CUT TO:",
  // "QUICK CUT TO:", "MATCH CUT TO:", "JUMP CUT TO:", "SHOCK CUT TO:"). A plain
  // "CUT TO:" is invisible standard formatting; the emphatic variants are editorial
  // punctuation meant to jolt. Sprinkled throughout, they stop jolting and start
  // reading as the writer shouting for impact the scenes should generate themselves.
  // Distinct from DIRECTORIAL_INTRUSION (camera/shot calls inside action lines) and
  // from TITLE_CARD_CRUTCH / TIME_CARD_CRUTCH (on-screen text and time captions).
  {
    const smashRe340 = /^(SMASH|HARD|QUICK|MATCH|JUMP|SHOCK)\s+CUT\s+(TO|IN|BACK)\s*:?\.?$/i;
    const smashCount340 = lines.filter(l => smashRe340.test(l.trim())).length;
    if (smashCount340 >= 3) {
      issues.push({
        location: `${smashCount340} dramatic cut transitions`,
        rule: 'SMASH_CUT_OVERUSE',
        severity: 'minor',
        description: `${smashCount340} emphatic cut transitions ("SMASH CUT TO:", "HARD CUT TO:", "MATCH CUT TO:") appear in the script. A plain "CUT TO:" is invisible standard formatting; the emphatic variants are editorial punctuation meant to jolt the reader. Sprinkled throughout, they stop jolting and start reading as the writer shouting for an impact the scenes should generate on their own — the transition is asked to carry a charge the cut-from and cut-to images have not built.`,
        suggestedFix: 'Reserve a SMASH CUT for the one or two transitions whose collision genuinely lands a shock, and let the rest be ordinary cuts. Impact comes from the contrast between what precedes and follows the cut, not from the capitalized label; build the jolt into the juxtaposition of images and the transition will feel hard without being announced.',
      });
    }
  }

  // ── Wave 354: FADE_TRANSITION_OVERUSE ────────────────────────────────────
  // Four or more soft-transition markers ("FADE IN", "FADE OUT", "FADE TO BLACK",
  // "DISSOLVE TO", "CROSS DISSOLVE"). A FADE IN to open and a FADE OUT to close are
  // standard; beyond that, fades and dissolves are the writer punctuating their own
  // structure — each soft transition tells the reader "time passes / mood shifts" rather
  // than letting the scenes imply it. A script full of fades reads as a string of vignettes
  // smeared together. Distinct from SMASH_CUT_OVERUSE (hard cuts), TIME_CARD_CRUTCH
  // (caption text), and MONTAGE_CRUTCH.
  {
    const fadeRe354 = /^(FADE IN|FADE OUT|FADE TO( BLACK| WHITE)?|FADE UP|DISSOLVE TO|CROSS ?DISSOLVE( TO)?)\s*:?\.?$/i;
    const fadeCount354 = lines.filter(l => fadeRe354.test(l.trim())).length;
    if (fadeCount354 >= 4) {
      issues.push({
        location: `${fadeCount354} fade/dissolve transitions`,
        rule: 'FADE_TRANSITION_OVERUSE',
        severity: 'minor',
        description: `${fadeCount354} soft-transition markers ("FADE IN", "FADE OUT", "DISSOLVE TO") appear in the script. A FADE IN to open and a FADE OUT to close are standard; beyond that, fades and dissolves are the writer punctuating their own structure, each one telling the reader "time passes" or "mood shifts" rather than letting the scenes imply it. A script full of fades reads as a string of vignettes smeared together instead of a continuous drama.`,
        suggestedFix: 'Keep the opening FADE IN and closing FADE OUT and cut the rest. Let scenes hard-cut into one another and trust the change of location, time-of-day, or circumstance to signal the transition; reserve a dissolve for the rare moment the soft blur itself carries meaning.',
      });
    }
  }

  // ── Wave 354: DREAM_SEQUENCE_CRUTCH ──────────────────────────────────────
  // Two or more explicit dream/fantasy/nightmare sequence markers. A labeled unreality
  // sequence is a device for externalizing interior states; used more than once it becomes
  // a crutch for delivering symbolism or backstory the waking story should dramatize, and
  // it repeatedly suspends the stakes (nothing in a dream is real). Distinct from JUST_A_
  // DREAM_REVEAL (events retroactively dismissed as a dream) and FLASHBACK_CRUTCH (past-
  // event inserts): this fires on explicitly labeled dream/fantasy sequences.
  {
    const dreamRe354 = /\b(dream sequence|fantasy sequence|nightmare sequence|begin dream|end dream)\b/i;
    const dreamCount354 = lines.filter(l => dreamRe354.test(l.trim())).length;
    if (dreamCount354 >= 2) {
      issues.push({
        location: `${dreamCount354} dream/fantasy sequence markers`,
        rule: 'DREAM_SEQUENCE_CRUTCH',
        severity: 'minor',
        description: `${dreamCount354} explicit dream, fantasy, or nightmare sequence markers appear in the script. A labeled unreality sequence externalizes interior states, but leaned on repeatedly it becomes a crutch for delivering symbolism or backstory the waking story should dramatize — and each one suspends the stakes, since nothing inside a dream is real. The audience learns to discount whatever happens once the label appears.`,
        suggestedFix: 'Keep at most one dream/fantasy sequence and externalize the rest through waking behavior: the fear a nightmare would show can surface as a waking flinch, an avoided room, a compulsive habit. Interior life reads strongest when it leaks into real action with real consequences, not when it is quarantined in a sequence the audience knows does not count.',
      });
    }
  }

  // ── Wave 354: INTERCUT_OVERUSE ───────────────────────────────────────────
  // Three or more "INTERCUT" markers. Intercutting is a powerful tool for parallel
  // action (a phone call, a race against a clock), but heavy reliance on it is a tell that
  // scenes cannot stand on their own — the writer keeps cross-cutting to manufacture
  // momentum that individual scenes lack, and the audience is shuttled between locations
  // rather than allowed to settle into any of them. Distinct from MONTAGE_CRUTCH (compressed
  // time) and SMASH_CUT_OVERUSE (single hard transitions).
  {
    const intercutRe354 = /\bintercut\b/i;
    const intercutCount354 = lines.filter(l => intercutRe354.test(l.trim())).length;
    if (intercutCount354 >= 3) {
      issues.push({
        location: `${intercutCount354} intercut markers`,
        rule: 'INTERCUT_OVERUSE',
        severity: 'minor',
        description: `${intercutCount354} "INTERCUT" markers appear in the script. Intercutting is powerful for genuine parallel action, but heavy reliance on it signals that scenes cannot stand on their own — the writer keeps cross-cutting to manufacture momentum the individual scenes lack, shuttling the audience between locations rather than letting them settle into any one. Pervasive intercutting fragments attention instead of building tension.`,
        suggestedFix: 'Reserve intercutting for the one or two sequences where the parallel timelines genuinely collide or race each other. Elsewhere, let each scene play to its own end and trust ordinary sequencing; if a scene needs an intercut to stay alive, the scene itself likely needs strengthening.',
      });
    }
  }

  // ── Wave 368: OFF_SCREEN_CUE_OVERUSE ─────────────────────────────────────
  // Four or more (O.S.) or (O.C.) off-screen / off-camera dialogue cues. A voice
  // from off-frame is a legitimate tool — a call from the next room, an unseen
  // speaker — but leaned on repeatedly it signals the writer keeps placing speakers
  // outside the frame rather than staging them in it, so the scene's geography goes
  // soft and characters become disembodied voices. Distinct from VOICEOVER_CRUTCH
  // ((V.O.) narration laid over the image — this is in-scene off-frame speech).
  {
    const offScreenRe368 = /\((O\.?S\.?|O\.?C\.?)\)/i;
    const offScreenCount368 = lines.filter(l => offScreenRe368.test(l.trim())).length;
    if (offScreenCount368 >= 4) {
      issues.push({
        location: `${offScreenCount368} off-screen (O.S./O.C.) cues`,
        rule: 'OFF_SCREEN_CUE_OVERUSE',
        severity: 'minor',
        description: `${offScreenCount368} dialogue cues are marked off-screen or off-camera ((O.S.)/(O.C.)). A voice from off-frame is a fine occasional tool, but leaned on this heavily it signals the writer keeps placing speakers outside the frame rather than staging them within it — the scene's geography softens and characters dissolve into disembodied voices the audience can't locate.`,
        suggestedFix: 'Bring most speakers into the frame: stage the confrontation in one room where both characters are visible, so the scene plays as embodied action rather than a voice answering from elsewhere. Reserve (O.S.) for the moments where the speaker\'s unseen position is itself dramatic — the threat in the dark, the voice behind the door.',
      });
    }
  }

  // ── Wave 368: CONTINUOUS_SLUG_OVERUSE ────────────────────────────────────
  // Three or more sluglines whose time-of-day field is a continuity tag
  // ("CONTINUOUS", "MOMENTS LATER", "SAME", "LATER", "CONT'D"). These tags mark a
  // scene that is really a continuation of the previous one — used heavily, they
  // reveal a sequence that has been chopped into fragments by location changes
  // rather than genuinely distinct scenes, so the scene count inflates without the
  // story actually moving. Distinct from SCENE_SLUG_TIME_MONOTONE (DAY/NIGHT
  // monotony) and LOCATION_REPETITION (repeated location names).
  {
    const continuousSlugRe368 = /^(INT\.|EXT\.|INT\/EXT\.|I\/E\.).*[-—]\s*(CONTINUOUS|MOMENTS LATER|SAME(?: TIME)?|LATER|CONT'?D)\s*$/i;
    const continuousCount368 = lines.filter(l => continuousSlugRe368.test(l.trim())).length;
    if (continuousCount368 >= 3) {
      issues.push({
        location: `${continuousCount368} continuity-tagged sluglines`,
        rule: 'CONTINUOUS_SLUG_OVERUSE',
        severity: 'minor',
        description: `${continuousCount368} sluglines use a continuity tag ("CONTINUOUS", "MOMENTS LATER", "SAME", "LATER") as their time field. Each tag marks a scene that is really a continuation of the one before it; used this often, they reveal a single sequence chopped into fragments by location changes rather than a series of genuinely distinct scenes. The scene count inflates while the story stays in place.`,
        suggestedFix: 'Consolidate continuity-tagged fragments into their parent scenes, or give each a real time jump and dramatic purpose. If three scenes are all "CONTINUOUS", they are one scene playing across rooms — write them as one continuous beat, and reserve a new slugline for a genuine shift in time, place, or intent.',
      });
    }
  }

  // ── Wave 368: BACK_TO_SCENE_CRUTCH ───────────────────────────────────────
  // Two or more "BACK TO SCENE" / "RESUME SCENE" / "BACK TO PRESENT" return
  // markers. These mark the return from a flashback, dream, or intercut — and their
  // proliferation reveals a script that keeps stepping out of its own present-tense
  // timeline and having to climb back in. Each departure-and-return interrupts the
  // forward drive of the main scene. Distinct from FLASHBACK_CRUTCH (the transition
  // INTO the past) and INTERCUT_OVERUSE (the cross-cut markers): this counts the
  // return-to-the-main-line markers specifically.
  {
    const backToRe368 = /^(BACK TO SCENE|BACK TO PRESENT|BACK TO REALITY|RESUME SCENE|RESUME ON|RETURN TO SCENE|PRESENT DAY)\s*:?\.?$/i;
    const backToCount368 = lines.filter(l => backToRe368.test(l.trim())).length;
    if (backToCount368 >= 2) {
      issues.push({
        location: `${backToCount368} back-to-scene return markers`,
        rule: 'BACK_TO_SCENE_CRUTCH',
        severity: 'minor',
        description: `${backToCount368} "BACK TO SCENE" / "RESUME SCENE" return markers appear in the script. Each one marks a return from a flashback, dream, or aside back into the present-tense timeline — their proliferation reveals a story that keeps stepping out of its own main line and having to climb back in. Every departure-and-return interrupts the forward drive of the scene the audience is actually invested in.`,
        suggestedFix: 'Reduce the number of departures from the present timeline: fold the information delivered in the inserts into present-tense action and dialogue. A story that has to keep announcing "BACK TO SCENE" is spending too much time away from the scene; the fewer round-trips out of the now, the stronger the through-line.',
      });
    }
  }

  // ── Wave 382: CHAPTER_LABEL_CRUTCH ───────────────────────────────────────
  // Three or more standalone chapter/part/book segment headings ("CHAPTER ONE",
  // "PART TWO", "BOOK III"). Segmenting a film into titled chapters is a novelistic
  // device — a handful of directors wield it as style, but as a default it imposes
  // literary structure on a medium that flows continuously, and it lets the writer
  // announce act breaks the drama should make the audience feel. Distinct from TITLE_
  // CARD_CRUTCH (SUPER:/TITLE:/CHYRON: on-screen text) and TIME_CARD_CRUTCH (time-jump
  // captions): this targets enumerated segment headings.
  {
    const chapterRe382 = /^(chapter|part|book)\s+([0-9]+|[ivxlcdm]+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/i;
    const chapterCount382 = lines.filter(l => chapterRe382.test(l.trim())).length;
    if (chapterCount382 >= 3) {
      issues.push({
        location: `${chapterCount382} chapter/part segment headings`,
        rule: 'CHAPTER_LABEL_CRUTCH',
        severity: 'minor',
        description: `${chapterCount382} standalone chapter/part headings ("CHAPTER ONE", "PART TWO") segment the script. Titling a film into chapters is a novelistic device — a few directors wield it as deliberate style, but as a default it imposes literary structure on a continuously flowing medium and lets the writer announce act breaks the drama should make the audience feel rather than read.`,
        suggestedFix: 'Cut the chapter headings and let the act structure emerge from the story\'s turns: a strong inciting incident, midpoint, and climax mark the movements without labels. Reserve titled chapters for the rare case where the segmentation is itself a thematic statement, not a substitute for dramatic shaping.',
      });
    }
  }

  // ── Wave 382: SPLIT_SCREEN_CRUTCH ────────────────────────────────────────
  // Two or more "SPLIT SCREEN" markers. Split screen is a striking device for
  // genuine simultaneity (two ends of a phone call, a race converging), but reached
  // for repeatedly it becomes a gimmick that manufactures parallelism the writing
  // could achieve through cutting, and it signals scenes that cannot generate their
  // own momentum. Distinct from INTERCUT_OVERUSE (cross-cutting between full scenes)
  // and MONTAGE_CRUTCH (compressed time).
  {
    const splitScreenRe382 = /\bsplit[\s-]?screen\b/i;
    const splitCount382 = lines.filter(l => splitScreenRe382.test(l.trim())).length;
    if (splitCount382 >= 2) {
      issues.push({
        location: `${splitCount382} split-screen markers`,
        rule: 'SPLIT_SCREEN_CRUTCH',
        severity: 'minor',
        description: `${splitCount382} "SPLIT SCREEN" markers appear in the script. Split screen is striking for genuine simultaneity — two ends of a call, converging races — but reached for repeatedly it becomes a gimmick that manufactures parallelism ordinary cutting would achieve, and it signals scenes leaning on a visual trick rather than their own momentum. Pervasive split-screen also pre-empts the director's staging choices.`,
        suggestedFix: 'Reserve split screen for the one or two moments where seeing both frames at once is the dramatic point. Elsewhere, trust intercutting or sequencing to carry the parallel action; if a beat needs split screen to work, the underlying scenes likely need strengthening.',
      });
    }
  }

  // ── Wave 382: MATCH_CUT_OVERUSE ──────────────────────────────────────────
  // Three or more "MATCH CUT TO" transitions. A match cut is a precise editing
  // figure — a graphic or thematic rhyme across a cut — and a spec script directs
  // the reader through prose, not editing calls. Used heavily it both claims the
  // editor's chair and dilutes the device, since a match cut lands only when it is
  // rare. Distinct from SMASH_CUT_OVERUSE (a hard, jarring cut for impact) and FADE_
  // TRANSITION_OVERUSE (soft fades/dissolves).
  {
    const matchCutRe382 = /\bmatch cut\b/i;
    const matchCutCount382 = lines.filter(l => matchCutRe382.test(l.trim())).length;
    if (matchCutCount382 >= 3) {
      issues.push({
        location: `${matchCutCount382} match-cut transitions`,
        rule: 'MATCH_CUT_OVERUSE',
        severity: 'minor',
        description: `${matchCutCount382} "MATCH CUT TO" transitions appear in the script. A match cut is a precise editing figure — a graphic or thematic rhyme bridging a cut — and a spec script directs the reader through prose, not editing calls. Used heavily it both claims the editor's chair and dilutes the device itself, since a match cut lands only when it is rare and surprising.`,
        suggestedFix: 'Keep at most one match cut, for the moment the visual rhyme genuinely carries meaning, and let the rest of the transitions be ordinary cuts the prose implies. Calling for repeated match cuts on the page reads as a writer art-directing the edit rather than telling the story.',
      });
    }
  }

  // ── Wave 396: REVELATION_PURPOSE_MONOTONE, DIALOGUE_SHORT_LINE_DOMINANCE, DIALOGUE_QUESTION_DROUGHT ──

  // REVELATION_PURPOSE_MONOTONE (minor, n≥8, ≥3 revelation scenes all same purpose):
  // All revelation scenes serve an identical structural function — the story deploys
  // disclosure formulaically, as if reveals belong only in one type of moment.
  // Co-occurrence mode × revelation channel × purpose channel. Distinct from
  // UNIFORM_SCENE_PURPOSES (all scenes unfiltered, no revelation filter applied),
  // PURPOSE_BOOKEND_REPEAT (bookend comparison Act 1 vs Act 3 dominant purpose),
  // and SCENE_PURPOSE_MONOTONE_ACT3 (Act 3 zone × action-scene functional label).
  if (records.length >= 8) {
    const revelRecs396a = (records as any[]).filter(r => r.revelation === true);
    if (revelRecs396a.length >= 3) {
      const firstPurp396a = revelRecs396a[0].purpose as string;
      const allSamePurp396a = revelRecs396a.every(r => r.purpose === firstPurp396a);
      if (allSamePurp396a) {
        issues.push({
          location: 'Revelation scenes — purpose monotone',
          rule: 'REVELATION_PURPOSE_MONOTONE',
          severity: 'minor',
          description: `All ${revelRecs396a.length} revelation scenes share the same dramatic purpose ("${firstPurp396a}"). When every disclosure serves the same structural function, reveals feel formulaic — each one lands in the same type of moment, carrying the same dramatic weight, with no register shift between them. Variety in how revelations are deployed is what makes each feel inevitable in retrospect yet surprising in the moment.`,
          suggestedFix: 'Let revelations land in scenes with different dramatic purposes — some during conflict, some in quieter development moments, some at turning points. A disclosure during a casual exchange hits differently than one mid-confrontation; varying the structural context multiplies the impact of each reveal.',
        });
      }
    }
  }

  // DIALOGUE_SHORT_LINE_DOMINANCE (minor, ≥15 dialogue lines, ≥75% are ≤4 words):
  // Nearly all spoken lines are ultra-short — the dialogue register is uniformly
  // telegraphic with no variation between clipped reaction and developed speech.
  // Distribution mode × dialogue length channel. Distinct from DIALOGUE_I_DOMINANCE
  // (first-word opener pattern, not line length), DIALOGUE_EXCLAMATION_FLOOD
  // (punctuation density, not length distribution), and DIALOGUE_DOMINANCE
  // (action-vs-dialogue ratio, not within-dialogue length variety).
  {
    let totalDlg396b = 0;
    let shortCount396b = 0;
    let inDlg396b = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg396b = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg396b = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg396b = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg396b) {
        totalDlg396b++;
        if (t.split(/\s+/).filter(Boolean).length <= 4) shortCount396b++;
      }
    }
    if (totalDlg396b >= 15 && shortCount396b / totalDlg396b >= 0.75) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'DIALOGUE_SHORT_LINE_DOMINANCE',
        severity: 'minor',
        description: `${shortCount396b} of ${totalDlg396b} dialogue lines (${Math.round(shortCount396b / totalDlg396b * 100)}%) are four words or fewer — the dialogue is uniformly telegraphic. When nearly every line is a clipped fragment, the script loses the textural contrast that distinguishes characters and the rhythmic variation between short reactions and developed speech. Sustained brevity reads as staccato monotone.`,
        suggestedFix: 'Vary dialogue length: let characters finish a thought, build an argument, or tell a brief story. Short lines carry weight when they follow longer ones — a one-word reply lands harder after a paragraph of explanation. Uniform brevity flattens what should be a dynamic rhythm of exchange.',
      });
    }
  }

  // DIALOGUE_QUESTION_DROUGHT (minor, ≥15 dialogue lines, <5% end with "?"):
  // Characters almost never ask each other anything — all dialogue is assertion
  // or declaration. Interrogative lines are a fundamental dramatic tool: they create
  // pressure, expose what a character needs to know, and force the other person to
  // respond rather than merely react. Distribution mode × dialogue register channel.
  // Distinct from DIALOGUE_EXCLAMATION_FLOOD (exclamation excess — opposite register
  // and surplus direction), DIALOGUE_I_DOMINANCE (first-word opener pattern, not
  // sentence-form type), and ADVERB_OVERSATURATION (word-class density, not
  // sentence-form distribution).
  {
    let totalDlg396c = 0;
    let qCount396c = 0;
    let inDlg396c = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg396c = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg396c = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg396c = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg396c) {
        totalDlg396c++;
        if (t.endsWith('?')) qCount396c++;
      }
    }
    const qShare396c = totalDlg396c > 0 ? qCount396c / totalDlg396c : 0;
    if (totalDlg396c >= 15 && qShare396c < 0.05) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'DIALOGUE_QUESTION_DROUGHT',
        severity: 'minor',
        description: `Only ${qCount396c} of ${totalDlg396c} dialogue lines (${Math.round(qShare396c * 100)}%) are interrogative. Characters almost never ask each other anything — all spoken lines are declarations, assertions, or commands. Questions create dramatic pressure, reveal what a character needs to know and fears to hear, and force other characters to respond rather than react. A script where no one ever asks anything collapses into a series of parallel monologues.`,
        suggestedFix: 'Introduce interrogative dialogue at key pressure points: a question reveals vulnerability and shifts power between speakers. "Do you trust me?" or "What did you see?" carries more dramatic weight than three lines of statement. Characters should want information from each other — let that need show in the language.',
      });
    }
  }

  // ── Wave 410: SLOW_MOTION_CRUTCH, FREEZE_FRAME_CRUTCH, SOUND_CUE_CRUTCH ──

  // SLOW_MOTION_CRUTCH (minor, ≥2 markers): Two or more lines call for slow motion
  // ("SLOW MOTION", "SLO-MO", "IN SLOW MOTION"). Slow motion is a director's tool for
  // stretching a single charged beat; when a script reaches for it repeatedly, it is
  // outsourcing gravity to a speed effect that the staging, stakes, and imagery should
  // earn on their own. Every slowed moment announces "this matters" rather than building
  // the moment so the audience feels it matters. Distinct from SMASH_CUT_OVERUSE (hard/jump
  // cut transitions), DIRECTORIAL_INTRUSION (camera/lens calls), and FADE_TRANSITION_OVERUSE
  // (soft transitions): this targets the slow-motion speed effect specifically.
  {
    const slowMoRe410 = /\b(SLOW\s+MOTION|SLO-?\s?MO|SLOMO)\b/i;
    const slowMoCount410 = lines.filter(l => slowMoRe410.test(l.trim())).length;
    if (slowMoCount410 >= 2) {
      issues.push({
        location: `${slowMoCount410} slow-motion call(s)`,
        rule: 'SLOW_MOTION_CRUTCH',
        severity: 'minor',
        description: `${slowMoCount410} lines call for slow motion ("SLOW MOTION", "SLO-MO"). Slow motion is a director's tool for stretching a single charged beat; reached for repeatedly, it outsources gravity to a speed effect the staging and stakes should earn. Each slowed moment announces "this matters" instead of building the beat so the audience feels it matters — and when many moments are slowed, none of them reads as special.`,
        suggestedFix: 'Reserve slow motion for at most one beat whose weight is already fully earned by the scene around it, and let the rest play at speed. If a moment needs slow motion to register, the fix is usually in the setup — raise the stakes, isolate the image, or hold on the consequence — not in dictating the frame rate.',
      });
    }
  }

  // FREEZE_FRAME_CRUTCH (minor, ≥2 markers): Two or more lines call for a freeze frame
  // ("FREEZE FRAME", "FREEZE ON", "FREEZE-FRAME"). A freeze frame stops time to underline
  // an image; leaned on more than once, it becomes a tic that punctuates the script with
  // manufactured significance rather than letting the moment land in motion. The held image
  // is asked to carry an emphasis the writing has not built. Distinct from SLOW_MOTION_CRUTCH
  // (a speed effect, not a stop), TITLE_CARD_CRUTCH (on-screen text), and DIRECTORIAL_INTRUSION
  // (camera framing): this targets the freeze-frame device specifically.
  {
    const freezeRe410 = /\bFREEZE[\s\-]?(FRAME|ON)\b|\bFREEZE-FRAME\b|\bFREEZEFRAME\b/i;
    const freezeCount410 = lines.filter(l => freezeRe410.test(l.trim())).length;
    if (freezeCount410 >= 2) {
      issues.push({
        location: `${freezeCount410} freeze-frame call(s)`,
        rule: 'FREEZE_FRAME_CRUTCH',
        severity: 'minor',
        description: `${freezeCount410} lines call for a freeze frame ("FREEZE FRAME", "FREEZE ON"). A freeze frame stops time to underline an image; used more than once it becomes a tic that punctuates the script with manufactured significance instead of letting the moment land in motion. The held image is asked to carry an emphasis the surrounding writing has not built, and repetition drains it of the very surprise that makes a freeze land.`,
        suggestedFix: 'Keep at most one freeze frame, for a single image whose meaning the story has fully loaded, and stage the other emphatic beats in motion. Emphasis in film comes from what the audience has been led to feel about an image, not from literally stopping on it — build the charge into the scene and the moment will hold without being frozen.',
      });
    }
  }

  // SOUND_CUE_CRUTCH (minor, ≥3 markers): Three or more lines hard-code a sound effect with
  // an explicit label ("SFX:", "SOUND:", "SOUND CUE:", "SOUND FX:"). Spelling out the sound
  // design in labelled cues is the sound editor's job, not the writer's; on the page it reads
  // as a spreadsheet of effects rather than prose that makes the reader hear the world. A
  // script that lists its sounds is telling the reader what to hear instead of writing the
  // action so the sound is implied. Distinct from DIRECTORIAL_INTRUSION ("WE HEAR" and
  // camera/lens calls inside action) and from VOICEOVER_CRUTCH / OFF_SCREEN_CUE_OVERUSE
  // (spoken-voice cues): this targets the labelled sound-effect cue specifically.
  {
    const soundCueRe410 = /^\(?\s*(SFX|SOUND|SOUND\s+CUE|SOUND\s+FX|SOUND\s+EFFECT|SOUND\s+EFFECTS)\s*:/i;
    const soundCueCount410 = lines.filter(l => soundCueRe410.test(l.trim())).length;
    if (soundCueCount410 >= 3) {
      issues.push({
        location: `${soundCueCount410} hard-coded sound cue(s)`,
        rule: 'SOUND_CUE_CRUTCH',
        severity: 'minor',
        description: `${soundCueCount410} lines hard-code a sound effect with an explicit label ("SFX:", "SOUND:"). Spelling out the sound design in labelled cues is the sound editor's job; on the page it reads as a spreadsheet of effects rather than prose that makes the reader hear the world. A script that lists its sounds tells the reader what to hear instead of writing the action so the sound is felt — the cue substitutes for the craft of evocation.`,
        suggestedFix: 'Fold essential sounds into the action prose so the reader hears them through the writing: instead of "SFX: GLASS SHATTERS", write "The glass shatters against the wall." Reserve a labelled cue only for a sound that is genuinely off-screen and plot-critical and cannot be implied by what is on the page.',
      });
    }
  }

  // ── Wave 424: INSERT_SHOT_CRUTCH, ELLIPSIS_ACTION_OVERUSE, ACTION_ADVERB_FLOOD ──

  // INSERT_SHOT_CRUTCH (minor, ≥3 "INSERT:" lines): Three or more lines hard-code an
  // insert shot with an explicit "INSERT:" or "INSERT -" label. Insert shots are a
  // director's decision — the choice to isolate an object in a close-up belongs to
  // the edit, not the script. When a writer labels three or more inserts, they are
  // building the shot list rather than writing the scene: the detail that warrants an
  // insert should be integrated into the action prose through a character's attention
  // rather than called by a slug-like directive. Distinct from DIRECTORIAL_INTRUSION
  // (Wave 259: camera/lens calls like "CLOSE ON"/"TIGHT ON"/"WE SEE" inside action prose —
  // this targets the "INSERT:" heading format specifically, which is a slug-level directive
  // rather than an action-line instruction) and from TITLE_CARD_CRUTCH / TIME_CARD_CRUTCH
  // (on-screen text / time captions — content cards, not image-composition directives).
  {
    const insertRe424a = /^INSERT[\s:\-]/i;
    const insertCount424a = lines.filter(l => insertRe424a.test(l.trim())).length;
    if (insertCount424a >= 3) {
      issues.push({
        location: `${insertCount424a} INSERT shot label(s)`,
        rule: 'INSERT_SHOT_CRUTCH',
        severity: 'minor',
        description: `${insertCount424a} lines hard-code an INSERT shot with an explicit label ("INSERT:", "INSERT -"). Calling inserts by name is a directorial choice that belongs to the edit; on the page it lifts the reader out of the prose world and into a production checklist. The insert-worthy detail should appear as a natural beat in the action prose — seen through a character's attention or through the scene's natural visual logic — rather than as a labeled shot directive.`,
        suggestedFix: 'Fold the inserted image into the action prose: instead of "INSERT: THE CLOCK — 3:47 AM", write "She glances at the clock. 3:47 AM." The detail lands harder when the audience receives it through a character\'s attention rather than through a director\'s annotated frame. Remove the INSERT labels and let the prose\'s own focus imply the close-up.',
      });
    }
  }

  // ELLIPSIS_ACTION_OVERUSE (minor, ≥10 action lines, >20%): More than 20% of action lines
  // contain an ellipsis ("..."). In stage directions, an ellipsis signals either prose that
  // avoids completing its own thought — the description trails off rather than landing on a
  // specific image — or an artsy stylistic affectation. Both are problems: the first indicates
  // incomplete writing, the second a self-conscious manner that makes every third action line
  // feel like it knows it is being read rather than serving the scene. When more than a fifth
  // of all action lines use "...", the screenplay's prose voice has a tic that reads as
  // unfinished regardless of authorial intent. Distinct from dialogue ELLIPSIS_OVERUSE
  // (Wave 255: the "..." register in dialogue — the trailing-off speech pattern; this targets
  // "..." specifically in the action/description layer), REACTION_SHOT_OVERUSE (terse lines,
  // not incomplete-thought lines), and FILTERING_VERB_OVERUSE (perceptual framing, not
  // trailing-off incompleteness). Underweight/bloat mode.
  {
    let actionTotal424b = 0;
    let ellipsisCount424b = 0;
    let inDlg424b = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg424b = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg424b = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg424b = true; continue; }
      if (t.startsWith('(')) continue;
      if (inDlg424b) continue;
      actionTotal424b++;
      if (/\.{3}/.test(t)) ellipsisCount424b++;
    }
    if (actionTotal424b >= 10 && ellipsisCount424b / actionTotal424b > 0.20) {
      issues.push({
        location: `${ellipsisCount424b} of ${actionTotal424b} action lines contain "..."`,
        rule: 'ELLIPSIS_ACTION_OVERUSE',
        severity: 'minor',
        description: `${ellipsisCount424b} of ${actionTotal424b} action lines (${Math.round(ellipsisCount424b / actionTotal424b * 100)}%) trail off with an ellipsis. In stage directions, "..." signals either prose that avoids completing its own image — the description trails off rather than landing on a specific visual — or a self-conscious stylistic affectation. When more than a fifth of all action lines use the device, the screenplay's prose has a tic that reads as unfinished: the writer keeps declining to say the thing, and the reader keeps stopping where the image should land.`,
        suggestedFix: 'Complete each action line — say what is on screen, fully and specifically, rather than trailing it into suggestion. Ellipsis in action belongs in rare beats where incompleteness IS the effect: the thing can\'t quite be named, the image is deliberately withheld. For everything else, write the image. The reader experiences what is described, not what is gestured at.',
      });
    }
  }

  // ACTION_ADVERB_FLOOD (minor, ≥10 action lines, >25%): More than 25% of action lines
  // carry a common manner adverb — "slowly", "carefully", "quietly", "quickly", "gently",
  // "suddenly", "softly", "nervously", "anxiously", "angrily", "urgently", "deliberately",
  // "cautiously", "silently", "frantically". Adverbs in action lines substitute for specific
  // physical description: "she closes the door quietly" tells the reader the manner without
  // showing a concrete image that implies it. When more than a quarter of all action lines
  // lean on adverb qualification, the prose is consistently describing HOW actions feel
  // rather than WHAT actions look like — trading the visual specificity film needs for
  // abstract instruction that neither the reader nor the director can picture. Distinct from
  // BODY_LANGUAGE_CLICHÉ_OVERUSE (Wave 315: specific stock gesture nouns — nods/shrugs/sighs;
  // this targets the adverb + any-verb construction, not named gestures), REACTION_SHOT_
  // OVERUSE (terse single-beat lines, not qualified lines), and FILTERING_VERB_OVERUSE
  // (perception verbs like "sees"/"notices" — the source of the filtering, not the manner).
  {
    const adverbRe424c = /\b(slowly|carefully|quietly|quickly|gently|suddenly|softly|nervously|anxiously|angrily|urgently|deliberately|cautiously|silently|frantically|hastily|weakly|firmly|coldly|calmly|tensely)\b/i;
    let actionTotal424c = 0;
    let adverbCount424c = 0;
    let inDlg424c = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg424c = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg424c = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg424c = true; continue; }
      if (t.startsWith('(')) continue;
      if (inDlg424c) continue;
      actionTotal424c++;
      if (adverbRe424c.test(t)) adverbCount424c++;
    }
    if (actionTotal424c >= 10 && adverbCount424c / actionTotal424c > 0.25) {
      issues.push({
        location: `${adverbCount424c} of ${actionTotal424c} action lines carry a manner adverb`,
        rule: 'ACTION_ADVERB_FLOOD',
        severity: 'minor',
        description: `${adverbCount424c} of ${actionTotal424c} action lines (${Math.round(adverbCount424c / actionTotal424c * 100)}%) carry a manner adverb ("slowly", "carefully", "quietly", "suddenly", "gently"). Adverbs in action lines substitute for specific physical description: they tell the manner rather than showing the concrete image that would imply it. When more than a quarter of all action uses adverb qualification, the prose consistently describes HOW actions feel rather than WHAT they look like — trading visual specificity for abstract instruction.`,
        suggestedFix: 'Replace manner adverbs with the specific action that implies the manner: "She closes the door quietly" → "She eases the door shut, her fingertips pressing the latch back until it clicks." The concrete image makes the reader feel the quality; the adverb only names it. Reserve a manner adverb for the rare line where the manner genuinely cannot be inferred from the physical action being described.',
      });
    }
  }

  // ── Wave 438: PASSIVE_VERB_DOMINANCE, DIALOGUE_MONOLOGUE_DROUGHT, ACTION_QUESTION_INTRUSION ──

  // PASSIVE_VERB_DOMINANCE (minor, ≥10 action lines, >25%): More than 25% of action lines
  // use passive construction ("is seen", "are found", "can be heard", "was revealed",
  // "has been taken"). Passive voice in action lines removes agency from the visual
  // description: the world is observed being acted upon rather than shown acting. "A gun
  // is found on the table" gives less visual authority than "A gun sits on the table" —
  // the passive construction puts the reader at a remove from the image, processing what was
  // done to things rather than watching things exist and move. When more than a quarter of
  // all action lines are passive, the screenplay's prose has a systemic distancing quality
  // that accumulates across reading. Underweight/bloat mode × action prose × verb form.
  // Distinct from COPULA_ACTION_DOMINANCE (Wave 259: linking-verb state predicates — "the room
  // is dark", "he is afraid" — being-verb as main predicate, not passive voice), FILTERING_VERB_
  // OVERUSE (Wave 259: "she sees"/"he notices" — POV attribution verbs, not passive constructions),
  // and ACTION_ADVERB_FLOOD (Wave 424: manner adverbs qualifying verbs, not verb form itself).
  {
    // Covers regular past participles (-ed, -en) plus common irregular past participles
    // used in passive constructions in screenplay action lines.
    const passiveRe438a = /\b(is|are|was|were|can be|could be|will be|has been|have been)\s+(?:[a-z]+(?:ed|en)|found|heard|left|shown|known|built|held|kept|sent|told|made|done|brought|caught|hit|set|put|lost|shut|cut|let|won|worn|drawn|thrown|grown|shot|sold|paid|felt|met|thought|bought|laid|spread|split|spent|bent|swept|wept|crept)\b/i;
    let actionTotal438a = 0;
    let passiveCount438a = 0;
    let inDlg438a = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg438a = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg438a = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg438a = true; continue; }
      if (t.startsWith('(')) continue;
      if (inDlg438a) continue;
      actionTotal438a++;
      if (passiveRe438a.test(t)) passiveCount438a++;
    }
    if (actionTotal438a >= 10 && passiveCount438a / actionTotal438a > 0.25) {
      issues.push({
        location: `${passiveCount438a} of ${actionTotal438a} action lines use passive construction`,
        rule: 'PASSIVE_VERB_DOMINANCE',
        severity: 'minor',
        description: `${passiveCount438a} of ${actionTotal438a} action lines (${Math.round(passiveCount438a / actionTotal438a * 100)}%) use passive voice — "is seen", "are found", "can be heard", "was revealed". Passive construction removes agency from the visual surface: the world is observed being acted upon rather than shown acting. The reader processes what was done to things rather than watching things exist and move, which creates a subtle but cumulative distance from the visual world. More than a quarter of action lines in this passive register gives the screenplay's prose a distancing quality that makes the imagery feel reported rather than witnessed.`,
        suggestedFix: 'Convert passive constructions to active ones by giving the subject visual agency: "A gun is found on the table" → "A gun rests on the table" or "Detective Chen finds a gun on the table." Let objects exist actively or give a character the verb. Reserve passive construction for the rare case where grammatical agency genuinely belongs to the acted-upon thing.',
      });
    }
  }

  // DIALOGUE_MONOLOGUE_DROUGHT (minor, ≥12 dialogue lines, <5% long): Fewer than 5% of
  // dialogue lines are extended (>15 words) while the screenplay has ≥12 dialogue lines.
  // Extended dialogue lines — speeches, monologues, extended arguments — are how characters
  // develop position, reveal interiority, and sustain rhetorical pressure on each other.
  // When almost no dialogue line crosses 15 words, the screenplay operates entirely in
  // shorthand: every exchange is either rapid-fire repartee or terse surface reading with
  // nothing sustained. The register is uniformly telegraphic — characters never hold the
  // floor long enough to say something complex. A screenplay with no monologues, no
  // extended speeches, no arguments that develop across multiple sentences, denies characters
  // the tools to articulate their inner worlds beyond reaction. Underweight/bloat mode ×
  // dialogue × length distribution. Distinct from DIALOGUE_SHORT_LINE_DOMINANCE (Wave 396:
  // measures whether ≥75% of lines are ≤4 words — a different threshold at a different end
  // of the distribution; DIALOGUE_SHORT_LINE_DOMINANCE can fire without DIALOGUE_MONOLOGUE_
  // DROUGHT when dialogue averages 5-14 words per line with no long speeches), PARENTHETICAL_
  // FLOOD (Wave 273: acting wrench directions — direction-layer density, not speech length),
  // and DIALOGUE_QUESTION_DROUGHT (Wave 396: dialogue interrogativeness — a register quality,
  // not a length distribution). This is the first check auditing the upper tail of dialogue
  // line length.
  {
    let dlgTotal438b = 0;
    let longDlgCount438b = 0;
    let inDlg438b = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg438b = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg438b = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg438b = true; continue; }
      if (t.startsWith('(')) continue;
      if (!inDlg438b) continue;
      dlgTotal438b++;
      if (t.split(/\s+/).filter(Boolean).length > 15) longDlgCount438b++;
    }
    if (dlgTotal438b >= 12 && longDlgCount438b / dlgTotal438b < 0.05) {
      issues.push({
        location: `${longDlgCount438b} of ${dlgTotal438b} dialogue lines exceed 15 words`,
        rule: 'DIALOGUE_MONOLOGUE_DROUGHT',
        severity: 'minor',
        description: `Only ${longDlgCount438b} of ${dlgTotal438b} dialogue lines (${Math.round(longDlgCount438b / dlgTotal438b * 100)}%) exceed 15 words — the screenplay has almost no extended speeches. Every exchange is rapid-fire shorthand; characters never sustain a position, develop an argument, or reveal interiority over more than a single clipped line. Extended dialogue is how characters occupy rhetorical space: a monologue reveals how someone thinks, a sustained argument shows how relationships process pressure, a speech places the audience inside a character's world view. When no character ever holds the floor across more than 15 words, the dialogue register is uniformly telegraphic — characters react but never truly speak.`,
        suggestedFix: 'Give at least one character at least one extended speech or sustained argument somewhere in the screenplay. An extended exchange doesn\'t mean a lecture — it means a character develops a thought across three or four sentences, with subclause, contradiction, and arrival. The goal is at least one beat where a character is allowed to be complex in speech rather than punchy in reaction.',
      });
    }
  }

  // ACTION_QUESTION_INTRUSION (minor, ≥3 action lines with "?"): Three or more action lines
  // (non-dialogue stage directions) contain a question mark — the writer inserts rhetorical
  // or authorial questions into the visual prose. Action lines exist to present what the camera
  // records: the images, movements, and objects that make up the scene. A question mark in
  // action prose is a discourse-mode switch from showing to editorializing: "What does he know?
  // Can she trust him? Where is this headed?" — these are the writer's commentary about the
  // scene, not the scene itself. The audience cannot see a question; they can only see its
  // answer. Three or more such intrusions signal a screenplay that repeatedly breaks the visual
  // contract to address the reader directly, a habit that distances the prose from the images
  // it is meant to conjure. Count threshold × action layer × discourse mode. Distinct from
  // DIALOGUE_QUESTION_DROUGHT (Wave 396: questions in the dialogue layer — a character asking
  // another character something — a dramatic tool), DIRECTORIAL_INTRUSION (Wave 259: camera/
  // lens calls and "WE HEAR" — structural labels, not rhetorical questions), and EXCLAMATION_
  // IN_ACTION (Wave 273: exclamatory punctuation in action — the analogous over-excitement
  // mode, not questioning). This is the first check to audit the question-mark in action prose.
  {
    let questionCount438c = 0;
    let inDlg438c = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg438c = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg438c = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg438c = true; continue; }
      if (t.startsWith('(')) continue;
      if (inDlg438c) continue;
      if (/\?/.test(t)) questionCount438c++;
    }
    if (questionCount438c >= 3) {
      issues.push({
        location: `${questionCount438c} action line(s) contain a question mark`,
        rule: 'ACTION_QUESTION_INTRUSION',
        severity: 'minor',
        description: `${questionCount438c} action lines contain a question mark — the writer is inserting authorial questions into the stage directions. Action prose exists to present what the camera records: images, movements, objects. A question mark in an action line is a discourse-mode switch from showing to editorializing — "What does he know? Can she trust him?" — the writer's commentary about the scene rather than the scene itself. The audience cannot see a question; they can only see what follows from its answer being visible on screen. Repeated question-mark intrusions break the screenplay's visual contract, stepping outside the scene to address the reader directly.`,
        suggestedFix: 'Remove the question marks from action lines and replace with the visual image that answers the question: instead of "What is she thinking?" write what she does — the gesture, the look, the action that externalises the thought. If the question is genuinely unanswerable (the scene is meant to be ambiguous), write the unresolved image directly. The authorial question belongs in a note to yourself or a director\'s treatment, not in the script\'s action prose.',
      });
    }
  }

  // ── Wave 452: DIALOGUE_ELLIPSIS_FLOOD, SLUG_TIME_MONOTONE, DIALOGUE_FILLER_OPENER ──

  // DIALOGUE_ELLIPSIS_FLOOD (minor, ≥10 dialogue lines, >20%): More than 20% of dialogue
  // lines end with an ellipsis ("...") — characters trail off instead of completing thoughts.
  // Ellipsis dialogue used occasionally communicates hesitation, suppressed knowledge, or
  // interrupted intent. Used as the default register for more than a fifth of all spoken lines,
  // it signals a screenplay where nobody ever finishes a sentence — a world of perpetual
  // half-speech where characters gesture at meaning rather than landing it. The audience stops
  // reading trailing dialogue as dramatic reticence and starts reading it as the writer avoiding
  // the decisive word. Underweight/bloat mode × dialogue layer × trailing-off punctuation.
  // Distinct from ELLIPSIS_ACTION_OVERUSE (Wave 424: the same pattern in the action layer —
  // this audits the dialogue layer), DIALOGUE_MONOLOGUE_DROUGHT (Wave 438: no extended speeches
  // — too short, not too incomplete), and ACTION_QUESTION_INTRUSION (Wave 438: action layer):
  // this is the first check to audit ellipsis use in the dialogue layer specifically.
  {
    let dlgTotal452a = 0;
    let ellipsisCount452a = 0;
    let inDlg452a = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg452a = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg452a = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg452a = true; continue; }
      if (t.startsWith('(')) continue;
      if (!inDlg452a) continue;
      dlgTotal452a++;
      if (t.endsWith('...')) ellipsisCount452a++;
    }
    if (dlgTotal452a >= 10 && ellipsisCount452a / dlgTotal452a > 0.2) {
      issues.push({
        location: `${ellipsisCount452a} of ${dlgTotal452a} dialogue lines end with "..."`,
        rule: 'DIALOGUE_ELLIPSIS_FLOOD',
        severity: 'minor',
        description: `${ellipsisCount452a} of ${dlgTotal452a} dialogue lines (${Math.round(ellipsisCount452a / dlgTotal452a * 100)}%) end with an ellipsis — more than a fifth of all spoken lines trail off without completing their thought. Ellipsis dialogue used occasionally communicates hesitation, suppressed knowledge, or interrupted intent; used as the default register, it signals a screenplay where nobody ever finishes a sentence. The audience stops reading trailing dialogue as dramatic reticence and starts reading it as the writer avoiding the decisive word the character should say.`,
        suggestedFix: "Let characters finish their sentences. Reserve ellipsis dialogue for the specific moments when hesitation or incompletion is dramatically meaningful: a confession that can't be made, a threat half-spoken. The rest of the time, make characters say what they mean — complete statements land harder than dangling implications. More than one in five trailing-off lines is a register, not a choice; replace the ellipsis with the word the character is too afraid to say, or cut the trailing hesitation entirely.",
      });
    }
  }

  // SLUG_TIME_MONOTONE (minor, ≥6 time-tagged sluglines, >80% same time): More than 80%
  // of sluglines that specify a time of day all use the same time label — the story plays
  // out almost entirely in one lighting condition. Whether all DAY or all NIGHT, a story that
  // never shifts its visual hour forfeits one of screenplay's native expressive tools: morning
  // has urgency and possibility, afternoon has heat and diminishing returns, night has intimacy
  // and concealment — these distinctions carry tone for free when the hour changes. A story
  // that never changes the light is tonally uniform in a way the audience senses without naming.
  // Underweight/bloat mode × slugline layer × time-of-day distribution. Distinct from SLUG_
  // INTERIOR_DOMINANCE (Wave 287: INT./EXT. ratio — location type, not time), LOCATION_
  // REPETITION (Wave 273: same place — not hour), SLUG_GENERIC_LOCATION (Wave 315: placeholder
  // names): this is the first check to audit time-of-day distribution across sluglines.
  {
    const timeCounts452b = new Map<string, number>();
    let timeTaggedSlugs452b = 0;
    for (const line of lines) {
      const t = line.trim();
      if (!/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) continue;
      const m = t.toUpperCase().match(/\b(DAY|NIGHT|DAWN|DUSK|MORNING|AFTERNOON|EVENING|SUNSET|SUNRISE|NOON)\b/);
      if (!m) continue;
      timeTaggedSlugs452b++;
      timeCounts452b.set(m[1], (timeCounts452b.get(m[1]) ?? 0) + 1);
    }
    if (timeTaggedSlugs452b >= 6) {
      const dominantEntry452b = [...timeCounts452b.entries()].sort((a, b) => b[1] - a[1])[0];
      if (dominantEntry452b && dominantEntry452b[1] / timeTaggedSlugs452b > 0.8) {
        issues.push({
          location: `${dominantEntry452b[1]} of ${timeTaggedSlugs452b} time-tagged sluglines specify "${dominantEntry452b[0]}"`,
          rule: 'SLUG_TIME_MONOTONE',
          severity: 'minor',
          description: `${dominantEntry452b[1]} of ${timeTaggedSlugs452b} sluglines (${Math.round(dominantEntry452b[1] / timeTaggedSlugs452b * 100)}%) that specify a time of day all use "${dominantEntry452b[0]}" — the story plays out almost entirely in one lighting condition. A screenplay that never changes its hour forfeits the expressive range of light: morning urgency, afternoon heat, nighttime concealment are tonally distinct. A story lived entirely in one hour is visually monotone in a way the audience senses without naming — every scene in the same light creates a world without temporal rhythm or contrast.`,
          suggestedFix: `Introduce at least one or two scenes in a different time of day. The hour of a scene is part of its character: early morning has a quality that night lacks; twilight implies transition; full noon has a different pressure from midnight. Even if the story's actual timeline is tight, giving scenes a varied time label signals visual awareness that the hour matters. Move at least one "${dominantEntry452b[0]}" scene to a different time to restore the palette.`,
        });
      }
    }
  }

  // DIALOGUE_FILLER_OPENER (minor, ≥4 speeches begin with filler): Four or more dialogue
  // speeches begin with a verbal filler opener — "Well,", "Look,", "Listen,", "Actually,",
  // "Honestly,", "Basically,", "I mean,", "You know," — a hedge or redirect that delays the
  // character's first direct word. These openers are the spoken equivalent of a throat-clear:
  // they are how writers get a character speaking when the inciting impulse for the speech is
  // unclear. A first word that commits immediately to the character's desire, position, or
  // action is four or five times stronger than a hedge. Four or more such openings signal a
  // dialogue register that structurally avoids the direct word. Count threshold × dialogue ×
  // first-word pattern. Distinct from CLICHÉ_DIALOGUE (Wave 137: specific clichéd phrases —
  // whole-line content, not opening word), DIALOGUE_SHORT_LINE_DOMINANCE (Wave 396: word
  // count — length distribution), DIALOGUE_QUESTION_DROUGHT (Wave 396: interrogativeness —
  // register quality, not first word), PARENTHETICAL_FLOOD (Wave 273: acting directions —
  // direction layer): this is the first check targeting the opening word of each speech.
  {
    const fillerRe452c = /^(well[,\s]|look[,\s!]|listen[,\s]|actually[,\s]|honestly[,\s]|basically[,\s]|i mean[,\s]|you know[,\s]|anyway[,\s]|whatever[,\s]|seriously[,\s])/i;
    let fillerOpenerCount452c = 0;
    let inDlg452c = false;
    let isFirstDlgLine452c = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg452c = false; isFirstDlgLine452c = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg452c = false; isFirstDlgLine452c = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg452c = true; isFirstDlgLine452c = true; continue; }
      if (t.startsWith('(')) continue;
      if (!inDlg452c) continue;
      if (isFirstDlgLine452c) {
        if (fillerRe452c.test(t)) fillerOpenerCount452c++;
        isFirstDlgLine452c = false;
      }
    }
    if (fillerOpenerCount452c >= 4) {
      issues.push({
        location: `${fillerOpenerCount452c} dialogue speech(es) begin with a verbal filler opener`,
        rule: 'DIALOGUE_FILLER_OPENER',
        severity: 'minor',
        description: `${fillerOpenerCount452c} dialogue speeches open with a verbal filler — "Well,", "Look,", "Listen,", "Actually,", "Honestly,", "Basically,", "I mean,", or similar — a hedge that delays the character's first direct word. These openers are the spoken equivalent of a writer clearing their throat before they know what to say: they are how speeches begin when the impulse for the speech is unclear. A first word that commits immediately to the character's desire, position, or action is far stronger. Four or more such openings across the screenplay signals a dialogue register that structurally avoids the direct first word.`,
        suggestedFix: "Trim the opening filler: \"Well, I don't think that's right\" becomes \"That's wrong.\" \"Look, we need to talk about this\" becomes \"We need to talk.\" Start each speech on the word that carries the character's first real meaning — not the word that marks time before meaning arrives. If a character genuinely can't bring themselves to start directly, that hesitation belongs in a parenthetical note or a stage direction, not in the speech opener itself.",
      });
    }
  }

  // ── Wave 466: ACTION_PRONOUN_OPENER_FLOOD, DIALOGUE_QUESTION_FLOOD, ELLIPSIS_RUN_ACTION ──

  // ACTION_PRONOUN_OPENER_FLOOD (minor, ≥8 action paragraphs, >50% open with "He " or "She "):
  // More than half of all action paragraphs begin with a character pronoun opener — the writer's
  // default visual grammar is to name the agent before the act, every time. Varied action openers
  // — an object noticed, a sound heard, a location detail foregrounded — orient the reader to the
  // world before the character, creating a cinematic perspective and varying the prose rhythm. A
  // script where every action block opens with "He " or "She " reads like prose fiction with
  // sluglines added rather than a visually constructed screenplay. Distribution/timing mode ×
  // action prose layer × paragraph-level opener. Distinct from COPULA_ACTION_DOMINANCE (linking
  // verbs — predicate form, not opener distribution), FILTERING_VERB_OVERUSE (perception verbs),
  // PASSIVE_VERB_DOMINANCE (passive construction), and ACTION_ADVERB_FLOOD (adverbs): this is the
  // first check to audit the distribution of how action paragraphs begin.
  {
    let actionBlockCount466a = 0;
    let pronounOpenerCount466a = 0;
    let prevWasBlank466a = true;
    let inDlg466a = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { prevWasBlank466a = true; inDlg466a = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { prevWasBlank466a = false; inDlg466a = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg466a = true; prevWasBlank466a = false; continue; }
      if (t.startsWith('(')) { prevWasBlank466a = false; continue; }
      if (inDlg466a) { prevWasBlank466a = false; continue; }
      // Action line
      if (prevWasBlank466a) {
        actionBlockCount466a++;
        if (/^(He|She)\s/.test(t)) pronounOpenerCount466a++;
      }
      prevWasBlank466a = false;
    }
    if (actionBlockCount466a >= 8 && pronounOpenerCount466a / actionBlockCount466a > 0.5) {
      issues.push({
        location: `${pronounOpenerCount466a} of ${actionBlockCount466a} action block(s) open with "He" or "She"`,
        rule: 'ACTION_PRONOUN_OPENER_FLOOD',
        severity: 'minor',
        description: `${pronounOpenerCount466a} of ${actionBlockCount466a} action paragraphs (${Math.round(pronounOpenerCount466a / actionBlockCount466a * 100)}%) open with "He" or "She" — more than half begin by naming the character's pronoun rather than the image they produce, the object they encounter, or the world around them. A screenplay's visual grammar is shaped by where each block of description starts: varied openers — an object, a location detail, a sound, an effect — give the prose cinematic range. A writer who habitually opens every action with the agent before the act creates prose that reads like a novel with stage directions rather than a script constructed from images.`,
        suggestedFix: 'Vary action block openers: instead of "He crosses to the window", try "The window frames the city below." Instead of "She opens the drawer", try "The drawer slides open." Lead at least half of action paragraphs with something other than a character pronoun — an object the camera would land on first, a detail of the environment, the result of an action before its cause. This is one of the simplest ways to shift action prose from literary to cinematic.',
      });
    }
  }

  // DIALOGUE_QUESTION_FLOOD (minor, ≥10 dialogue lines, >35% end with "?"): More than a third
  // of all dialogue lines are questions — characters perpetually interrogate rather than declare,
  // act, or assert. When more than a third of all spoken lines are questions, the screenplay has
  // a dialogue register problem at the opposite pole from DIALOGUE_QUESTION_DROUGHT (<5%): instead
  // of nobody asking anything, everyone is always asking something. A world where every character
  // is perpetually interrogating produces dialogue that feels like an interview rather than a scene
  // — characters never commit to a position, never accuse, never declare. Drama requires assertion:
  // characters must claim things, do things, refuse things. Questions without assertions are a
  // holding pattern. Underweight/bloat mode × dialogue layer × interrogative register. Distinct
  // from DIALOGUE_QUESTION_DROUGHT (Wave 396: <5% interrogative — the opposite failure),
  // DIALOGUE_EXCLAMATION_FLOOD (Wave 287: >25% exclamation — different punctuation signal), and
  // DIALOGUE_ELLIPSIS_FLOOD (Wave 452: >20% trailing off — different punctuation signal): this
  // is the first check targeting overuse of the interrogative register in dialogue.
  {
    let dlgTotal466b = 0;
    let questionCount466b = 0;
    let inDlg466b = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg466b = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg466b = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg466b = true; continue; }
      if (t.startsWith('(')) continue;
      if (!inDlg466b) continue;
      dlgTotal466b++;
      if (t.endsWith('?')) questionCount466b++;
    }
    if (dlgTotal466b >= 10 && questionCount466b / dlgTotal466b > 0.35) {
      issues.push({
        location: `${questionCount466b} of ${dlgTotal466b} dialogue lines end with "?"`,
        rule: 'DIALOGUE_QUESTION_FLOOD',
        severity: 'minor',
        description: `${questionCount466b} of ${dlgTotal466b} dialogue lines (${Math.round(questionCount466b / dlgTotal466b * 100)}%) end with a question mark — more than a third of all spoken dialogue is interrogative. When characters are perpetually asking rather than asserting, the dialogue register lacks declarative commitment: nobody claims anything, nobody accuses, nobody refuses. Drama requires assertion — a character who commits to a position, makes an accusation, or flatly states what they want is more dramatically alive than one who only asks. A dialogue layer dominated by questions reads as a world of perpetual holding patterns where the next answer is always deferred to the next question.`,
        suggestedFix: 'Convert at least half of the unnecessary questions into assertions: instead of "Don\'t you think this is wrong?" try "This is wrong." Instead of "Aren\'t you listening?" try "You\'re not listening." Questions have maximum impact when they are rare and pointed; when more than a third of dialogue asks rather than declares, the asking loses its edge. Reserve questions for genuinely unanswerable moments or for characters weaponizing uncertainty — everywhere else, commit to the declarative.',
      });
    }
  }

  // ELLIPSIS_RUN_ACTION (minor, ≥5 action lines, maxConsecutiveRun≥3): Three or more consecutive
  // action lines each ending with "..." — a run of stage directions that trail off without
  // completing the image. One ellipsis in action signals deliberate incompletion: a detail
  // withheld, a mystery gestured at. Three or more consecutive action lines all trailing off is
  // a different signal: the writer cannot commit to the image, and the action prose fragments into
  // a series of incomplete gestures. The audience/reader is left with impressions rather than
  // scenes — the camera cannot cut to an ellipsis. Run-based mode × action prose layer ×
  // trailing-off punctuation. Distinct from ELLIPSIS_ACTION_OVERUSE (Wave 424: >20% of all
  // action lines contain "..." — a proportional threshold check across the whole script; this
  // checks for consecutive runs of ≥3, which fires even when the total percentage is low if the
  // ellipses are concentrated in a burst): the consecutive-run check catches bursty incompletion
  // that the proportion check misses.
  {
    let actionTotal466c = 0;
    let maxEllipsisRun466c = 0;
    let curEllipsisRun466c = 0;
    let inDlg466c = false;
    for (const line of lines) {
      const t = line.trim();
      // Blank lines don't break the ellipsis run — they separate paragraphs but the run
      // continues across inter-paragraph gaps (each action line is one potential run member).
      if (!t) { inDlg466c = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg466c = false; curEllipsisRun466c = 0; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg466c = true; curEllipsisRun466c = 0; continue; }
      if (t.startsWith('(')) { curEllipsisRun466c = 0; continue; }
      if (inDlg466c) { curEllipsisRun466c = 0; continue; }
      // Action line
      actionTotal466c++;
      if (t.endsWith('...')) {
        if (++curEllipsisRun466c > maxEllipsisRun466c) maxEllipsisRun466c = curEllipsisRun466c;
      } else {
        curEllipsisRun466c = 0;
      }
    }
    if (actionTotal466c >= 4 && maxEllipsisRun466c >= 3) {
      issues.push({
        location: `${maxEllipsisRun466c} consecutive action line(s) end with "..."`,
        rule: 'ELLIPSIS_RUN_ACTION',
        severity: 'minor',
        description: `A run of ${maxEllipsisRun466c} consecutive action lines each end with "..." — stage directions that trail off without completing the image, in an unbroken sequence. A single ellipsis in action prose can signal a withheld detail or a deliberate mystery; a run of three or more consecutive incomplete lines signals the writer cannot commit to the image, and the action prose fragments into a series of impressions. The screenplay camera cannot cut to a trailing off — it records specific things in specific arrangements. Consecutive incomplete action lines produce a reading experience of mood without substance: the scene gestures but never arrives.`,
        suggestedFix: 'Complete the trailing action lines: decide what the camera actually shows — the specific object, the precise expression, the exact movement — and write that instead of the ellipsis. If the incompletion is intentional (a deliberately withheld image), use one ellipsis where the mystery is greatest and complete the rest. Three or more consecutive trailing-off action lines in a row indicates that the scene has not yet been written — only its outline, written in gestures.',
      });
    }
  }

  // ── Wave 480: DIALOGUE_FILLER_RUN, ACTION_AVERAGE_LINE_BREVITY, ACTION_PEAK_PARAGRAPH ──

  // DIALOGUE_FILLER_RUN (run-based × dialogue × filler opener, ≥5 dialogue speeches,
  // maxConsecutiveRun ≥ 3): Three or more consecutive dialogue speeches each open with a verbal
  // hedge — "Well,", "Look,", "Listen,", "Actually,", etc. — creating an unbroken chain of
  // throat-clearing before meaning arrives. Where DIALOGUE_FILLER_OPENER (Wave 452) detects
  // four or more filler-openers anywhere across the script, this run check fires even when
  // the total count is low if the fillers are bunched: three hedges in a row have a much
  // stronger rhythmic numbing effect than three spread across eighty pages. A run of filler
  // openers in consecutive speeches signals a scene or exchange where characters are
  // perpetually stalling — each speech begins by signaling uncertainty rather than charging
  // in. Run-based mode × dialogue layer × filler-opener pattern. Distinct from DIALOGUE_
  // FILLER_OPENER (Wave 452: total count ≥ 4, not consecutive), DIALOGUE_ELLIPSIS_FLOOD
  // (Wave 452: trailing-off punctuation, not opening word), ELLIPSIS_RUN_ACTION (Wave 466:
  // run of action ellipses, not dialogue openers).
  {
    const fillerRe480a = /^(well[,\s]|look[,\s!]|listen[,\s]|actually[,\s]|honestly[,\s]|basically[,\s]|i mean[,\s]|you know[,\s]|anyway[,\s]|whatever[,\s]|seriously[,\s])/i;
    let inDlg480a = false;
    let isFirstDlgLine480a = false;
    let totalSpeeches480a = 0;
    let curFillerRun480a = 0;
    let maxFillerRun480a = 0;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg480a = false; isFirstDlgLine480a = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg480a = false; isFirstDlgLine480a = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) {
        inDlg480a = true; isFirstDlgLine480a = true; totalSpeeches480a++;
        continue;
      }
      if (t.startsWith('(')) continue;
      if (!inDlg480a) continue;
      if (isFirstDlgLine480a) {
        if (fillerRe480a.test(t)) {
          curFillerRun480a++;
          if (curFillerRun480a > maxFillerRun480a) maxFillerRun480a = curFillerRun480a;
        } else {
          curFillerRun480a = 0;
        }
        isFirstDlgLine480a = false;
      }
    }
    if (totalSpeeches480a >= 5 && maxFillerRun480a >= 3) {
      issues.push({
        location: `${maxFillerRun480a} consecutive speech(es) open with a verbal filler`,
        rule: 'DIALOGUE_FILLER_RUN',
        severity: 'minor',
        description: `${maxFillerRun480a} consecutive dialogue speeches each open with a verbal hedge — "Well,", "Look,", "Listen,", "Actually,", or similar — stacking hesitation into an unbroken chain. Where one or two scattered filler openers read as character voice, a run of three or more in succession creates a rhythm of perpetual stalling: each speech signals uncertainty before it delivers meaning, and the cumulative effect is an exchange where no character begins with conviction. Readers feel the momentum drain from the scene with each new hedge, before a single word of actual content has been spoken.`,
        suggestedFix: 'Break the run by having at least one speaker in the sequence lead with their actual first meaningful word: "Well, I think we should leave" becomes "We should leave." A character who charges in without a hedge contrasts sharply with one who hedges, so breaking even one link in the chain varies the rhythm and restores dramatic momentum to the exchange.',
      });
    }
  }

  // ACTION_AVERAGE_LINE_BREVITY (average/aggregate × action prose × word count, ≥8 action
  // lines, avg ≤ 4 words per line): The action prose layer is collectively telegraphic — the
  // average action line is four words or fewer. A screenplay's action prose is the visual
  // fabric of the film: specific objects in specific arrangements, movements through describable
  // space, physical details that make a director's and actor's imagination land on the same
  // concrete image. When action lines average four words or fewer across the whole script, the
  // prose has reduced to shorthand notation rather than image construction — the direction is
  // present but the scene is not. An average of ≤4 words signals that the visual layer has not
  // been written, only gestured at. Average/aggregate mode × action prose layer × word-count
  // dimension. Distinct from REACTION_SHOT_OVERUSE (Wave 163: proportion of ≤5-word terse
  // reaction shots — a subset of short lines, not the global average), ELLIPSIS_ACTION_OVERUSE
  // (Wave 424: proportion of trailing-off lines — punctuation mark, not length), ACTION_PRONOUN_
  // OPENER_FLOOD (Wave 466: how paragraphs begin, not their length): this is the first check
  // on the aggregate word-count density of the action prose layer.
  {
    let actionLineCount480b = 0;
    let actionWordTotal480b = 0;
    let inDlg480b = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg480b = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg480b = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg480b = true; continue; }
      if (t.startsWith('(')) continue;
      if (inDlg480b) continue;
      actionLineCount480b++;
      actionWordTotal480b += t.split(/\s+/).filter(Boolean).length;
    }
    if (actionLineCount480b >= 8) {
      const avgActionWords480b = actionWordTotal480b / actionLineCount480b;
      if (avgActionWords480b <= 4) {
        issues.push({
          location: `Action prose — avg ${avgActionWords480b.toFixed(1)} words/line across ${actionLineCount480b} lines`,
          rule: 'ACTION_AVERAGE_LINE_BREVITY',
          severity: 'minor',
          description: `The ${actionLineCount480b} action lines average ${avgActionWords480b.toFixed(1)} words each — the visual prose layer has been reduced to telegraphic shorthand. A screenplay's action description is the only place where the visual world is actually constructed: specific objects in specific arrangements, physical details that make a director's imagination land on the same concrete image as the writer's. At four words per line or fewer, the action layer is present only as notation — "She sits.", "He runs.", "Door closes." — not as scene. An audience's imagination cannot populate blank space; the director cannot construct what has not been written.`,
          suggestedFix: 'Expand at least a third of the action lines to full sentences that complete the image: instead of "She sits." try "She drops into the chair as if her legs gave out." The additional words should not be adverbs — they should be specific physical or environmental details that tell the camera where to look and the actor what their body is doing. A line that averages five or more words signals that the writer has chosen to write scenes, not just outline them.',
        });
      }
    }
  }

  // ACTION_PEAK_PARAGRAPH (single-peak isolation × action prose × paragraph length, ≥4 action
  // paragraphs, peak word count ≥ 5× average and ≥ 40 words): One action paragraph is
  // dramatically longer than all the others — a single sprawling over-written set piece
  // surrounded by otherwise sparse prose. When one paragraph dwarfs the rest by a factor of
  // five or more, the script's visual register is wildly inconsistent: the reader speeds
  // through quick cuts and notation, then encounters a wall of prose — a tonal jolt that reads
  // as either a showpiece the writer loved and couldn't cut, or a passage written at a different
  // time in a different style. The single long paragraph also suffers from being read at a
  // different pace than the story warrants, since the script's default reading rhythm is the
  // short block. Single-peak isolation mode × action prose layer × paragraph word-count
  // magnitude. Distinct from ACTION_AVERAGE_LINE_BREVITY (Wave 480a: overall brevity — this
  // checks for an isolated outlier peak, not global average), ELLIPSIS_ACTION_OVERUSE (Wave 424:
  // trailing punctuation, not length), REACTION_SHOT_OVERUSE (Wave 163: terse-shot proportion):
  // this is the first single-peak isolation check in originality.ts.
  {
    const paragraphWords480c: number[] = [];
    let curParaWords480c = 0;
    let prevWasBlank480c = true;
    let inDlg480c = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) {
        if (curParaWords480c > 0) { paragraphWords480c.push(curParaWords480c); curParaWords480c = 0; }
        prevWasBlank480c = true; inDlg480c = false; continue;
      }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) {
        if (curParaWords480c > 0) { paragraphWords480c.push(curParaWords480c); curParaWords480c = 0; }
        prevWasBlank480c = false; inDlg480c = false; continue;
      }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) {
        if (curParaWords480c > 0) { paragraphWords480c.push(curParaWords480c); curParaWords480c = 0; }
        inDlg480c = true; prevWasBlank480c = false; continue;
      }
      if (t.startsWith('(')) { prevWasBlank480c = false; continue; }
      if (inDlg480c) { prevWasBlank480c = false; continue; }
      curParaWords480c += t.split(/\s+/).filter(Boolean).length;
      prevWasBlank480c = false;
    }
    if (curParaWords480c > 0) paragraphWords480c.push(curParaWords480c);
    if (paragraphWords480c.length >= 4) {
      const peakWords480c = Math.max(...paragraphWords480c);
      // Compare peak against the average of all OTHER paragraphs (excluding the peak itself)
      // so the outlier doesn't inflate the baseline it is measured against.
      const othersSum480c = paragraphWords480c.reduce((s, n) => s + n, 0) - peakWords480c;
      const othersAvg480c = othersSum480c / (paragraphWords480c.length - 1);
      if (peakWords480c >= 40 && othersAvg480c > 0 && peakWords480c / othersAvg480c >= 5) {
        issues.push({
          location: `Action paragraphs — peak ${peakWords480c} words vs rest avg ${othersAvg480c.toFixed(1)} words (${(peakWords480c / othersAvg480c).toFixed(1)}× outlier)`,
          rule: 'ACTION_PEAK_PARAGRAPH',
          severity: 'minor',
          description: `One action paragraph runs to ${peakWords480c} words — ${(peakWords480c / othersAvg480c).toFixed(1)}× the average of ${othersAvg480c.toFixed(1)} words for all other action paragraphs. The prose layer's visual register is wildly inconsistent: the reader speeds through notation and brief cuts, then encounters a single sprawling description that reads at a different tempo and in a different register from the surrounding pages. A single outlier this large signals either a showpiece the writer couldn't trim or a passage written at a different time in a different mode — neither serves the unified reading experience a produced script requires.`,
          suggestedFix: 'Break the long paragraph into smaller beats with visual cuts between them, or trim back to the three or four essential images and trust the director to fill the rest. A paragraph should rarely exceed 50 words in a produced screenplay; six to twelve words per line, with a blank line between beats, matches the reading rhythm the rest of the script has established. If the passage is a showpiece chase or action set piece, apply the same economy — specific images in short blocks — rather than novelistic prose.',
        });
      }
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
