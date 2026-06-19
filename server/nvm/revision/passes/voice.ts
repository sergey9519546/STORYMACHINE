// Wave 138 — Pass 12: Tone/Voice
// Checks voice consistency: tonal shifts without justification, register
// mismatches, generic vs. authored prose texture.
// Wave 138 additions: character voice distinctiveness (UNDIFFERENTIATED_CHARACTER_VOICES,
// VOICE_MONOTONE_CHARACTER) — detects when characters sound identical to each other.
// Uses a simplified Burrows Delta proxy on action lines.
// Wave 146 additions: dialogue clarity (DIALOGUE_ATTRIBUTION_CONFUSION when chars speak
// without action breaks), cliché density, and subtext absence checks.
// Wave 160 additions: passive action voice (action lines use passive constructions),
// interior monologue leak (action lines describe character thoughts instead of behavior),
// qualifier overload (excessive hedging words drain cinematic declarative authority).
// Wave 266 additions: stative verb overload (>35% action lines open with state verb),
// dialogue hedging opener (>25% of dialogue lines begin with a hedging phrase),
// abstract subject opening (>30% of action lines begin with an abstract noun subject).
// Wave 280 additions: intensifier adverb flood in dialogue (>30% of lines contain an
// intensifier), monochrome verb vocabulary in action lines (single common verb in >25%
// of lines, ≥12 lines), scene heading repetition (>60% of scenes share the same
// location, ≥8 records).
// Wave 294 additions: dialogue interrogative saturation (>30% of dialogue lines end with ?),
// action line adverb flood (>25% of action lines contain an adverb before the verb),
// character name monotony in action (single character name in >50% of action lines).
// Wave 308 additions: dialogue length uniformity (>70% of dialogue lines within a tight
// word-count band — every speech the same size), em-dash dialogue flood (>30% of dialogue
// lines contain an interruption dash), ALL-CAPS shout in dialogue (≥3 dialogue lines with
// a shouted ALL-CAPS word).
// Wave 322 additions: trailing ellipsis flood (>25% of dialogue lines trail off with "..."),
// repeated opener word (a single word begins >40% of dialogue lines), conjunction opener
// (>30% of dialogue lines begin with And/But/So/Because — speech reads as one run-on).
// Wave 333 additions: name opener flood (>30% of dialogue lines begin with direct
// character address like "John, I..."), retrospective narrator opener (≥4 lines opening
// with "I remember"/"Back when" etc.), word stutter (≥3 lines with immediate word repeat).
// Wave 347 additions: discourse-marker opener (>25% of lines begin with "Okay,"/"Alright,"/
// "Anyway,"), vocative address flood (>25% of lines carry a comma-set-off vocative like
// "honey"/"buddy"/"sir"), greeting filler flood (≥3 lines are hellos/goodbyes/pleasantries).
// Wave 361 additions: dialogue conditional flood (>30% of dialogue lines begin with a
// conditional opener — "If", "Unless", "What if" — characters default to hypotheticals),
// dialogue apology overuse (≥3 lines are apologies — no dramatic agency), dialogue
// hesitation flood (>25% of lines contain hesitation sounds — "um", "uh", "er", "hmm").
// Wave 375 additions: dialogue ellipsis-opener flood (>20% of lines begin with "..." —
// every line trails in from an unspoken thought), dialogue triadic flood (≥3 lines use a
// "X, Y, and Z" rule-of-three — rhetorical cadence as a tic), dialogue emphatic-punctuation
// flood (>20% of lines carry doubled marks like "!!"/"?!" — manufactured intensity).
// Wave 389 additions: action expletive opener (>25% of action lines begin with a dummy-
// subject "There is"/"It was" construction — agency drained from the action), dialogue
// interrogative-opener flood (>30% of dialogue lines begin with a wh-question word — every
// exchange reads as interrogation), dialogue comparative flood (>25% of dialogue lines carry
// a "more/-er than" or "as...as" comparison — speech locked in relative ranking).
// Wave 403 additions: dialogue passive flood (>25% of dialogue lines use passive constructions
// — agent erased from speech, evasive bureaucratic register), dialogue imperative flood (>30%
// of dialogue lines are commands — characters default to directing behavior rather than
// expressing feeling), action motion verb monotone (>50% of action lines use generic
// displacement verbs — script describes choreography rather than dramatic action).
// Wave 417 additions: action line length uniformity (action-line word counts cluster so
// tightly — coefficient of variation < 0.30 — that the prose has a flat, metronomic cadence
// with no rhythmic texture; distribution/variance mode), dialogue monosyllabic flood (>35% of
// dialogue lines are ≤2 words — speech never develops past terse fragments; underweight/brevity
// mode), dialogue negation flood (>40% of dialogue lines carry a negation — characters defined
// by refusal and denial rather than desire and assertion; valence mode).
// Wave 431 additions: dialogue I-opener run (≥4 consecutive dialogue lines each begin with the
// first-person "I" — a stretch where conversation collapses into back-to-back self-reference;
// run-based mode, the first run-based check in this pass), dialogue length outlier (one dialogue
// line towers over the rest — ≥30 words and ≥4× the mean line length — an unmotivated monologue
// dump amid otherwise terse speech; single-peak isolation mode), dialogue hedged-question flood
// (>20% of dialogue lines simultaneously hedge AND end in a question mark — doubly-tentative
// speech that neither the hedging-opener nor the interrogative-saturation rate check would catch
// alone; co-occurrence mode on the conjunction of two tics).
// Wave 445 additions: dialogue question run (run-based — ≥4 consecutive dialogue lines all end
// with "?", a sustained interrogation chain where no one answers; the first run-based check on
// the question-mark channel, distinct from DIALOGUE_INTERROGATIVE_SATURATION's global proportion
// and from DIALOGUE_I_OPENER_RUN's opener channel), action scene intro heavy (average/aggregate
// × positional — the first action line per scene averages ≥2× the word count of all subsequent
// action lines in those scenes; the first positional-average check in this pass, comparing line
// position within scenes rather than the global corpus), dialogue declarative aftermath question
// (sequence/aftermath — every declarative dialogue line that is not the last is immediately
// followed by a question, so every statement triggers an interrogation; distinct from
// DIALOGUE_QUESTION_RUN which catches local consecutive question clusters).
// Wave 459 additions: dialogue assertion run (run-based — 5+ consecutive dialogue lines all end
// declaratively without "?" or "!"; a sustained assertion avalanche where nobody asks or exclaims;
// the declarative-polarity mirror of DIALOGUE_QUESTION_RUN, completing the end-punctuation run
// family), dialogue single char domination (underweight/bloat — one character delivers >70% of all
// dialogue lines while ≥3 characters speak; the voice engine silences supporting characters
// systematically; distinct from UNDIFFERENTIATED_CHARACTER_VOICES which audits similarity not
// quantity), dialogue monologue unprompted (backward-cause — no long speech ≥10 words is preceded
// within 2 dialogue lines by a question; every extended statement arrives causeless, without the
// inquiry that would naturally provoke expansion; first backward-cause check in this pass).

import type { PassInput, PassResult, RevisionIssue } from './types.ts';
import { rewritePass } from '../rewrite.ts';

/** Extract action line word frequency per scene */
function sceneWordFrequencies(fountain: string): Map<number, Map<string, number>> {
  const lines = fountain.split('\n');
  const sceneFreqs = new Map<number, Map<string, number>>();
  let sceneIdx = -1;
  let isDialogue = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(trimmed)) {
      sceneIdx++;
      sceneFreqs.set(sceneIdx, new Map());
      isDialogue = false;
      continue;
    }
    if (/^[A-Z][A-Z0-9\s\-'\.]{2,}$/.test(trimmed)) { isDialogue = true; continue; }
    if (!trimmed) { isDialogue = false; continue; }
    if (isDialogue) continue; // skip dialogue
    if (sceneIdx < 0) continue;

    // Count words in action line (skip functional stopwords — preserve content words
    // like 'room', 'door', 'hand' which carry voice in screenplay action)
    const freqs = sceneFreqs.get(sceneIdx)!;
    const voiceStopwords = new Set(['that', 'this', 'with', 'from', 'have', 'into', 'they', 'them', 'then', 'were', 'been', 'than', 'when', 'also', 'just', 'here', 'there', 'over', 'back', 'down', 'away', 'through', 'very', 'would', 'could', 'should', 'might', 'their', 'about', 'what', 'which', 'some', 'each', 'will']);
    const words = trimmed.toLowerCase().split(/\W+/).filter(w => w.length > 3 && !voiceStopwords.has(w));
    for (const w of words) freqs.set(w, (freqs.get(w) ?? 0) + 1);
  }
  return sceneFreqs;
}

// ── Character voice distinctiveness ──────────────────────────────────────────
// These characters/cues are narrator/annotation tokens, not speaking characters.
const NON_SPEAKING_CUES = new Set(['NARRATOR', 'V.O.', 'O.S.', 'VOICE', 'INTERCOM', 'ANNOUNCER', 'TITLE']);

const DIALOGUE_STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'that', 'this', 'it',
  'in', 'on', 'at', 'to', 'of', 'and', 'or', 'but', 'not', 'with', 'by',
  'for', 'from', 'as', 'into', 'all', 'any', 'very', 'just', 'then', 'when',
  'who', 'what', 'where', 'how', 'if', 'so', 'its', 'their', 'them', 'they',
  'we', 'you', 'he', 'she', 'his', 'her', 'our', 'your', 'me', 'my', 'him',
  'us', 'no', 'yes', 'yeah', 'okay', 'sure', 'well',
]);

interface CharacterVoiceProfile {
  vocab: Set<string>;
  lineCount: number;
  wordCountsPerLine: number[];
}

/** Build per-character dialogue vocabulary profiles from fountain text. */
function buildCharacterVoiceProfiles(fountain: string): Map<string, CharacterVoiceProfile> {
  const lines = fountain.split('\n');
  const profiles = new Map<string, CharacterVoiceProfile>();
  let currentChar: string | null = null;
  let inDialogue = false;

  for (const line of lines) {
    const t = line.trim();

    if (!t) { currentChar = null; inDialogue = false; continue; }

    if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) {
      currentChar = null; inDialogue = false; continue;
    }

    // Parenthetical — skip but don't reset character context
    if (t.startsWith('(') && t.endsWith(')')) continue;

    // Character cue: ALL-CAPS, 3+ chars (strips extensions like "(V.O.)")
    if (/^[A-Z][A-Z0-9\s\-'\.]{2,}$/.test(t)) {
      const charName = t.replace(/\s*\(.*?\)\s*$/, '').trim();
      if (NON_SPEAKING_CUES.has(charName)) {
        currentChar = null; inDialogue = false;
      } else {
        currentChar = charName;
        inDialogue = true;
      }
      continue;
    }

    // Dialogue line (follows character cue or prior dialogue)
    if (inDialogue && currentChar) {
      let profile = profiles.get(currentChar);
      if (!profile) {
        profile = { vocab: new Set(), lineCount: 0, wordCountsPerLine: [] };
        profiles.set(currentChar, profile);
      }
      const words = t.toLowerCase().split(/\W+/).filter(w => w.length > 2 && !DIALOGUE_STOPWORDS.has(w));
      for (const w of words) profile.vocab.add(w);
      profile.lineCount++;
      profile.wordCountsPerLine.push(t.split(/\s+/).filter(w => w.length > 0).length);
    } else {
      // Action line: reset dialogue context
      currentChar = null;
      inDialogue = false;
    }
  }

  return profiles;
}

/** Jaccard distance between two vocabulary sets (presence/absence). */
function vocabJaccardDist(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 1.0;
  const intersection = [...a].filter(w => b.has(w)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : 1 - intersection / union;
}

/** Population standard deviation of an array of numbers. */
function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/** Jaccard distance between two frequency maps (as presence/absence) */
function jaccardDistance(a: Map<string, number>, b: Map<string, number>): number {
  // Dialogue-only scenes have no action vocabulary — return neutral 0.5 rather than 0
  // to avoid biasing the comparison toward "identical voice" when we have no data.
  if (a.size === 0 || b.size === 0) return 0.5;
  const setA = new Set(a.keys());
  const setB = new Set(b.keys());
  const intersection = [...setA].filter(w => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : 1 - intersection / union;
}

export async function voicePass(input: PassInput): Promise<PassResult> {
  const { fountain, records, approvedSpans } = input;
  const issues: RevisionIssue[] = [];

  const sceneFreqs = sceneWordFrequencies(fountain);
  const freqList = Array.from(sceneFreqs.entries());

  // ── Scene-level analysis (requires ≥3 scenes for meaningful comparison) ───
  if (freqList.length >= 3) {
    // Compute pairwise Jaccard distances for adjacent scenes
    const distances: number[] = [];
    for (let i = 1; i < freqList.length; i++) {
      const d = jaccardDistance(freqList[i - 1][1], freqList[i][1]);
      distances.push(d);
    }

    const avgDist = distances.reduce((s, v) => s + v, 0) / distances.length;

    // Large tonal jump between adjacent scenes
    for (let i = 0; i < distances.length; i++) {
      if (distances[i] > avgDist + 0.3 && distances[i] > 0.7) {
        const sceneNum = freqList[i + 1][0];
        const record = records[sceneNum];
        issues.push({
          location: `Scene ${sceneNum}${record ? ` (${record.slug})` : ''}`,
          rule: 'TONAL_WHIPLASH',
          description: `Scene ${sceneNum} has a very high lexical distance from Scene ${sceneNum - 1} (${Math.round(distances[i] * 100)}% divergence) — abrupt tonal shift`,
          severity: 'minor',
          suggestedFix: 'Add transitional language or bridging action to ease the shift between tones',
        });
      }
    }

    // All scenes have very similar vocabulary (no range)
    if (avgDist < 0.15 && freqList.length >= 5) {
      issues.push({
        location: 'Voice throughout',
        rule: 'VOICE_TOO_UNIFORM',
        description: `Lexical distance between all scenes is very low (avg ${Math.round(avgDist * 100)}%) — the voice is monotonous across all contexts`,
        severity: 'minor',
        suggestedFix: 'Vary the register between intimate scenes (simple vocabulary) and high-drama scenes (heightened language)',
      });
    }

    // Tonal consistency: prose register vs emotional valence (bidirectional)
    const elevatedWords = new Set(['beautiful', 'gorgeous', 'stunning', 'elegant', 'sublime', 'majestic', 'radiant', 'glorious', 'magnificent', 'serene', 'perfect', 'wonderful']);
    const grimWords = new Set(['dark', 'dead', 'death', 'blood', 'bleed', 'pain', 'suffer', 'wound', 'broken', 'shattered', 'destroyed', 'horrible', 'awful', 'dreadful', 'grim', 'bleak', 'gloomy', 'sinister', 'brutal', 'savage', 'violent', 'murder', 'corpse', 'dying', 'agony']);
    for (let i = 0; i < records.length && i < freqList.length; i++) {
      const record = records[i];
      const sceneFreq = freqList[i][1];
      const elevatedCount = [...elevatedWords].reduce((s, w) => s + (sceneFreq.get(w) ?? 0), 0);
      const grimCount = [...grimWords].reduce((s, w) => s + (sceneFreq.get(w) ?? 0), 0);
      if (record.emotionalShift === 'negative' && elevatedCount > 2) {
        issues.push({
          location: `Scene ${i} (${record.slug})`,
          rule: 'TONE_REGISTER_MISMATCH',
          description: `Scene ${i} has a negative emotional shift but the prose uses elevated/positive language (${elevatedCount} elevated words) — tone and affect are misaligned`,
          severity: 'minor',
          suggestedFix: 'Align the prose register with the scene\'s emotional valence',
        });
      } else if (record.emotionalShift === 'positive' && grimCount > 2) {
        issues.push({
          location: `Scene ${i} (${record.slug})`,
          rule: 'TONE_REGISTER_MISMATCH',
          description: `Scene ${i} has a positive emotional shift but the prose uses grim/dark language (${grimCount} grim words) — tone and affect are misaligned`,
          severity: 'minor',
          suggestedFix: 'Align the prose register with the scene\'s emotional valence',
        });
      }
    }
  }

  // ── Character voice distinctiveness ────────────────────────────────────────
  // UNDIFFERENTIATED_CHARACTER_VOICES: two major characters share too much vocabulary,
  // meaning they sound interchangeable. VOICE_MONOTONE_CHARACTER: a character's line
  // lengths never vary — robotic, template-like dialogue generation.
  const charProfiles = buildCharacterVoiceProfiles(fountain);
  // Only consider "major" characters with enough dialogue to compute a meaningful profile
  const majorChars = [...charProfiles.entries()].filter(
    ([, p]) => p.lineCount >= 5 && p.vocab.size >= 10,
  );

  if (majorChars.length >= 2 && issues.length < 6) {
    // Find the most similar pair of major characters
    let worstDist = 1.0;
    let worstPair: [string, string] | null = null;
    for (let i = 0; i < majorChars.length; i++) {
      for (let j = i + 1; j < majorChars.length; j++) {
        const [nameA, profA] = majorChars[i];
        const [nameB, profB] = majorChars[j];
        const dist = vocabJaccardDist(profA.vocab, profB.vocab);
        if (dist < worstDist) { worstDist = dist; worstPair = [nameA, nameB]; }
      }
    }
    if (worstPair && worstDist < 0.25) {
      const [nameA, nameB] = worstPair;
      issues.push({
        location: `${nameA} ↔ ${nameB}`,
        rule: 'UNDIFFERENTIATED_CHARACTER_VOICES',
        description:
          `${nameA} and ${nameB} share ${Math.round((1 - worstDist) * 100)}% vocabulary overlap ` +
          `(Jaccard distance ${worstDist.toFixed(2)}) — their voices are indistinguishable on the page`,
        severity: 'major',
        suggestedFix:
          `Give ${nameA} and ${nameB} distinct linguistic fingerprints: ` +
          `vary sentence length, cadence, and vocabulary register. ` +
          `One speaks in short declaratives; the other in longer, more conditional phrasing.`,
      });
    }
  }

  for (const [charName, profile] of majorChars) {
    if (profile.lineCount >= 10 && profile.wordCountsPerLine.length >= 10 && issues.length < 6) {
      const mean = profile.wordCountsPerLine.reduce((s, v) => s + v, 0) / profile.wordCountsPerLine.length;
      if (mean >= 5) {
        const cv = stdDev(profile.wordCountsPerLine) / mean;
        if (cv < 0.25) {
          issues.push({
            location: `Character: ${charName}`,
            rule: 'VOICE_MONOTONE_CHARACTER',
            description:
              `${charName} speaks in uniformly-sized lines (coefficient of variation ${cv.toFixed(2)}, ` +
              `avg ${mean.toFixed(1)} words) across ${profile.lineCount} lines — dialogue lacks rhythmic variety`,
            severity: 'minor',
            suggestedFix:
              `Give ${charName} more rhythmic range: very short reactions alongside longer speeches. ` +
              `Sentence length IS characterization — uniform length makes a character feel manufactured.`,
          });
          break; // one character per pass
        }
      }
    }
  }

  // ── Wave 146: Cliché density & subtext absence ──────────────────────────────

  // CLICHE_DENSITY: Overuse of generic/clichéd phrasing that dilutes authored voice.
  // Check for common screenplay clichés across the entire fountain text.
  const clichePhrases = new Map<string, number>([
    ['the room falls silent', 1], ['awkward silence', 1], ['they stare at each other', 1],
    ['long pause', 1], ['a beat', 1], ['moment passes', 1], ['tense moment', 1],
    ['no one moves', 1], ['suddenly', 0.5], ['all of a sudden', 0.5], ['just then', 0.5],
    ['she smiles', 0.5], ['he nods', 0.5], ['looks around', 0.5], ['glances around', 0.5],
    ['fade to black', 0.5], ['cut to', 0.5], ['dissolve to', 0.5],
  ]);

  const fountainLower = fountain.toLowerCase();
  let clicheCount = 0;
  for (const [phrase, weight] of clichePhrases) {
    const matches = (fountainLower.match(new RegExp(phrase, 'g')) || []).length;
    clicheCount += matches * weight;
  }

  const totalWords = fountain.split(/\s+/).length;
  const clicheRatio = clicheCount / Math.max(totalWords / 100, 1); // normalize by 100 words

  if (clicheRatio >= 3 && records.length >= 5) {
    issues.push({
      location: 'Screenplay voice',
      rule: 'CLICHE_DENSITY',
      description: `The screenplay contains ${Math.round(clicheCount)} clichéd phrases (${Math.round(clicheRatio * 10) / 10} per 100 words) — overuse of stock phrases dilutes authored voice`,
      severity: 'minor',
      suggestedFix: 'Replace generic descriptions with specific, original action that reveals character and world. Show silence through character reaction, not the phrase "awkward silence".',
    });
  }

  // SUBTEXT_ABSENCE: Characters state their intentions or emotions directly in
  // dialogue with no indirection or subtext. "I'm angry" instead of showing anger
  // through what they DON'T say.
  const directEmotionPhrases = new Set([
    'i\'m angry', 'i\'m sad', 'i\'m happy', 'i\'m afraid', 'i\'m scared',
    'i\'m in love', 'i hate', 'i love', 'i want', 'i need', 'i remember',
    'i think', 'i believe', 'i know', 'i feel', 'i\'m feeling', 'i\'m thinking',
    'you\'re right', 'you\'re wrong', 'we have a problem', 'this is important',
  ]);

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const dialogueLines = record.dialogueHighlights;
    if (dialogueLines.length < 3) continue; // skip if not enough dialogue

    let directCount = 0;
    for (const dialogue of dialogueLines) {
      const lower = dialogue.toLowerCase();
      for (const phrase of directEmotionPhrases) {
        if (lower.includes(phrase)) directCount++;
      }
    }

    if (directCount >= 3 && records.length >= 8) {
      issues.push({
        location: `Scene ${i} (${record.slug})`,
        rule: 'SUBTEXT_ABSENCE',
        description: `Scene ${i} has ${directCount} instances of direct emotional exposition (characters literally stating feelings/intentions) in ${dialogueLines.length} dialogue lines — lacks subtext and implication`,
        severity: 'major',
        suggestedFix: 'Rewrite dialogue to show emotions through indirection, humor, denial, or what\'s unsaid rather than explicit emotional statements',
      });
    }
  }

  // ── Wave 160: Passive voice, interior leak, qualifier overload ──────────────

  // Scan action lines from the fountain (separate from dialogue).
  const allLines = fountain.split('\n');
  const actionOnlyLines: string[] = [];
  let inDialogueBlock = false;
  for (const line of allLines) {
    const t = line.trim();
    if (!t) { inDialogueBlock = false; continue; }
    if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDialogueBlock = false; continue; }
    if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDialogueBlock = true; continue; }
    if (/^\(/.test(t)) continue; // parenthetical — stay in dialogue
    if (inDialogueBlock) continue; // dialogue line
    actionOnlyLines.push(t);
  }

  // PASSIVE_ACTION_VOICE: Action lines use passive voice constructions ("is heard",
  // "can be seen", "appears to be found") — passive voice drains the visual, declarative
  // energy that makes screenplay action come alive. Requires 10+ action lines and >15% rate.
  if (actionOnlyLines.length >= 10) {
    const passivePatterns = [
      /\bis heard\b/i, /\bcan be seen\b/i, /\bcan be heard\b/i, /\bwas seen\b/i,
      /\bwas heard\b/i, /\bare seen\b/i, /\bare heard\b/i, /\bis seen\b/i,
      /\bis found\b/i, /\bwas found\b/i, /\bwere found\b/i, /\bis felt\b/i,
      /\bcan be felt\b/i, /\bseems to be\b/i, /\bappears to be\b/i,
    ];
    const passiveLineCount = actionOnlyLines.filter(line =>
      passivePatterns.some(p => p.test(line)),
    ).length;
    const passiveRate = passiveLineCount / actionOnlyLines.length;
    if (passiveRate > 0.15) {
      issues.push({
        location: 'Action line prose',
        rule: 'PASSIVE_ACTION_VOICE',
        description: `${passiveLineCount} of ${actionOnlyLines.length} action lines (${Math.round(passiveRate * 100)}%) use passive constructions ("is heard", "can be seen", "appears to be") — passive voice drains cinematic energy and weakens directorial authority`,
        severity: 'major',
        suggestedFix: 'Rewrite passive constructions into active visual verbs: "A sound drifts in from the hallway" instead of "A sound is heard". Each action line should declare what the camera records.',
      });
    }
  }

  // INTERIOR_MONOLOGUE_LEAK: Action lines describe character psychology ("she wonders",
  // "he thinks about", "she realizes", "he remembers") — inner thought that the camera
  // cannot record. Screenplays must externalize psychology through action and behavior.
  // Requires 3+ thought-description action lines.
  if (actionOnlyLines.length >= 5) {
    const thoughtPatterns = [
      /\b(she|he|they)\s+wonders?\b/i, /\b(she|he|they)\s+thinks?\s+about\b/i,
      /\b(she|he|they)\s+realizes?\b/i, /\b(she|he|they)\s+remembers?\b/i,
      /\b(she|he|they)\s+feels?\s+(that|like|as if)\b/i,
      /\b(she|he|they)\s+knows?\s+(that|this|it|the)\b/i,
      /\b(she|he|they)\s+imagines?\b/i, /\b(she|he|they)\s+hopes?\s+(that|for|to)\b/i,
      /\b(she|he|they)\s+wishes?\b/i, /\b(she|he|they)\s+senses?\s+that\b/i,
    ];
    const leakLines = actionOnlyLines.filter(line =>
      thoughtPatterns.some(p => p.test(line)),
    );
    if (leakLines.length >= 3) {
      issues.push({
        location: 'Action line interiority',
        rule: 'INTERIOR_MONOLOGUE_LEAK',
        description: `${leakLines.length} action lines describe character psychology ("wonders", "realizes", "remembers") — the camera cannot record thought. These lines tell the reader about inner states instead of showing externalized behavior.`,
        severity: 'major',
        suggestedFix: 'Convert interior description to visible action: instead of "she realizes she\'s alone", write "She looks left, right. Nothing. She\'s alone." Let behavior carry the psychology.',
      });
    }
  }

  // QUALIFIER_OVERLOAD: Action lines overuse hedging qualifiers ("seems", "perhaps",
  // "maybe", "slightly", "somewhat", "sort of", "kind of") that drain declarative
  // cinematic authority. Screenplay action should assert, not hedge. If > 25% of
  // action lines contain qualifiers, the voice sounds uncertain. Requires 8+ action lines.
  if (actionOnlyLines.length >= 8) {
    const qualifierPattern = /\b(seems?|appears?|perhaps|maybe|possibly|slightly|somewhat|rather|quite|sort of|kind of|a bit|almost|nearly|barely|roughly|apparently|presumably)\b/i;
    const qualifierLineCount = actionOnlyLines.filter(l => qualifierPattern.test(l)).length;
    const qualifierRate = qualifierLineCount / actionOnlyLines.length;
    if (qualifierRate > 0.25) {
      issues.push({
        location: 'Action line authority',
        rule: 'QUALIFIER_OVERLOAD',
        description: `${qualifierLineCount} of ${actionOnlyLines.length} action lines (${Math.round(qualifierRate * 100)}%) use hedging qualifiers ("seems", "perhaps", "maybe", "sort of") — the prose sounds uncertain rather than visually declarative`,
        severity: 'minor',
        suggestedFix: 'Remove qualifiers from action lines: "He seems nervous" → "He tugs at his collar". Commit to what the camera sees — qualifiers are for uncertain narrators, not screenwriters.',
      });
    }
  }

  // ── Wave 173: Adverb crutch, filter words, exclamation overuse ──────────────

  // ADVERB_CRUTCH: Action lines lean on -ly manner adverbs ("walks slowly",
  // "turns quickly", "speaks softly") instead of strong, specific verbs. Adverbs
  // patch a weak verb rather than choosing a precise one. Distinct from
  // QUALIFIER_OVERLOAD (hedging words). Requires 8+ action lines and >30% rate.
  if (actionOnlyLines.length >= 8) {
    // -ly words that are not manner adverbs (nouns/adjectives ending in "ly")
    const adverbExclude = new Set([
      'only', 'family', 'early', 'ugly', 'holy', 'reply', 'supply', 'apply',
      'imply', 'rely', 'ally', 'rally', 'jelly', 'belly', 'silly', 'lonely',
      'lovely', 'likely', 'daily', 'weekly', 'monthly', 'yearly', 'friendly',
      'lively', 'elderly', 'orderly', 'homely', 'costly', 'curly', 'burly',
      'surly', 'july', 'assembly', 'anomaly', 'italy', 'comply', 'multiply',
    ]);
    const adverbLineCount = actionOnlyLines.filter(line => {
      const matches = line.toLowerCase().match(/\b[a-z]{3,}ly\b/g) || [];
      return matches.some(w => !adverbExclude.has(w));
    }).length;
    const adverbRate = adverbLineCount / actionOnlyLines.length;
    if (adverbRate > 0.3) {
      issues.push({
        location: 'Action line verbs',
        rule: 'ADVERB_CRUTCH',
        description: `${adverbLineCount} of ${actionOnlyLines.length} action lines (${Math.round(adverbRate * 100)}%) lean on -ly adverbs ("walks slowly", "speaks softly") — adverbs patch a weak verb instead of choosing a precise one`,
        severity: 'minor',
        suggestedFix: 'Replace verb+adverb pairs with one strong verb: "walks slowly" → "shuffles"; "speaks softly" → "murmurs". A specific verb does the work the adverb is apologizing for.',
      });
    }
  }

  // FILTER_WORD_OVERLOAD: Action lines route the image through a perceiving
  // character ("she sees the door open", "he watches her leave", "they notice
  // the smoke") instead of presenting the image directly. Filter words add a
  // layer of distance between the audience and the action. Distinct from
  // PASSIVE_ACTION_VOICE (passive constructions) and INTERIOR_MONOLOGUE_LEAK
  // (psychology). Requires 10+ action lines and >25% rate.
  if (actionOnlyLines.length >= 10) {
    const filterPattern = /\b(she|he|they|we|i)\s+(sees?|saw|watch(es|ed)?|look(s|ed)?\s+at|hears?|heard|notices?|noticed|observ(es|ed)|spots?|spotted|glimps(es|ed)|gazes?|stares?\s+at)\b/i;
    const filterLineCount = actionOnlyLines.filter(l => filterPattern.test(l)).length;
    const filterRate = filterLineCount / actionOnlyLines.length;
    if (filterRate > 0.25) {
      issues.push({
        location: 'Action line perspective',
        rule: 'FILTER_WORD_OVERLOAD',
        description: `${filterLineCount} of ${actionOnlyLines.length} action lines (${Math.round(filterRate * 100)}%) route the image through a character's perception ("she sees", "he watches", "they notice") — filter words distance the audience from the action`,
        severity: 'minor',
        suggestedFix: 'Cut the filter and show the image directly: "She sees the door swing open" → "The door swings open." The camera already implies whose POV it is; let the action land unmediated.',
      });
    }
  }

  // EXCLAMATION_OVERUSE: Dialogue leans on exclamation marks to manufacture
  // intensity. When too many lines shout, nothing reads as loud — the emotional
  // dynamic range flattens. Requires 10+ dialogue lines and >35% with "!".
  {
    const dialogueLines: string[] = [];
    let inDlg = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg = true; continue; }
      if (/^\(/.test(t)) continue; // parenthetical
      if (inDlg) dialogueLines.push(t);
    }
    if (dialogueLines.length >= 10) {
      const exclaimCount = dialogueLines.filter(l => l.includes('!')).length;
      const exclaimRate = exclaimCount / dialogueLines.length;
      if (exclaimRate > 0.35) {
        issues.push({
          location: 'Dialogue intensity',
          rule: 'EXCLAMATION_OVERUSE',
          description: `${exclaimCount} of ${dialogueLines.length} dialogue lines (${Math.round(exclaimRate * 100)}%) end on an exclamation — when most lines shout, none of them land. The emotional dynamic range collapses.`,
          severity: 'minor',
          suggestedFix: 'Reserve exclamation marks for genuine peaks. Let intensity come from word choice and context, not punctuation: a flat "Get out." can read louder than "Get out!"',
        });
      }
    }
  }

  // ── Wave 193: Pronoun opener excess, Act 2 tonal collapse, parenthetical excess ─

  // PRONOUN_OPENER_EXCESS: More than 40% of action lines begin with a third-person
  // pronoun (He, She, They, It). Pronoun-led sentences create referential ambiguity
  // (who is "he"?) and a mechanically uniform rhythm — the prose drums the same
  // subject-verb beat without relief. Requires 10+ action lines.
  if (actionOnlyLines.length >= 10) {
    const pronounStartRe = /^(he|she|they|it)\b/i;
    const pronounCount = actionOnlyLines.filter(l => pronounStartRe.test(l)).length;
    if (pronounCount / actionOnlyLines.length > 0.4) {
      issues.push({
        location: 'Action line openings',
        rule: 'PRONOUN_OPENER_EXCESS',
        severity: 'minor',
        description: `${pronounCount} of ${actionOnlyLines.length} action lines (${Math.round(pronounCount / actionOnlyLines.length * 100)}%) begin with a third-person pronoun ("He", "She", "They", "It") — referential ambiguity and rhythmic monotony result from pronoun-heavy openers.`,
        suggestedFix: 'Vary sentence openings: start some lines with the character name, some with the object or environment, some with a verb phrase. Let the camera choose the subject by varying what the line opens with.',
      });
    }
  }

  // TONAL_REGISTER_COLLAPSE_ACT2: All Act 2 scenes (25–75% of story) share the
  // same emotional register. The mid-story has no tonal variation between Act 2a
  // and Act 2b — characters exist in the same affective state for the entire
  // second act with no modulation. Distinct from VOICE_TOO_UNIFORM (whole story);
  // this catches a sag specifically in the middle. Requires 8+ records and 4+
  // Act 2 scenes.
  if (records.length >= 8) {
    const act2ToneStart = Math.floor(records.length * 0.25);
    const act2ToneEnd = Math.floor(records.length * 0.75);
    const act2Recs = records.slice(act2ToneStart, act2ToneEnd);
    if (act2Recs.length >= 4) {
      const act2Tones = new Set(act2Recs.map(r => r.emotionalShift));
      if (act2Tones.size === 1) {
        const [tone] = act2Tones;
        issues.push({
          location: `Act 2 (Scenes ${act2ToneStart}–${act2ToneEnd - 1})`,
          rule: 'TONAL_REGISTER_COLLAPSE_ACT2',
          severity: 'minor',
          description: `All ${act2Recs.length} Act 2 scenes carry the same emotional register ("${tone}") — the middle of the story has no tonal modulation. Act 2a and Act 2b blur into a single undifferentiated stretch.`,
          suggestedFix: 'Give Act 2 tonal shape: a moment of false hope or dark comedy in Act 2a, a turn toward crisis in Act 2b. The midpoint should feel like a register shift, not just a midpoint.',
        });
      }
    }
  }

  // PARENTHETICAL_EXCESS: More than 30% of dialogue character cues are immediately
  // followed by a parenthetical direction. Parentheticals over-direct actors —
  // they signal that the screenwriter doesn't trust their own dialogue to carry
  // tone. Requires 8+ character cues.
  {
    let charCueCount = 0;
    let parentheticalCount = 0;
    let awaitParenthetical = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { awaitParenthetical = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { awaitParenthetical = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) {
        charCueCount++;
        awaitParenthetical = true;
        continue;
      }
      if (awaitParenthetical && /^\(/.test(t)) {
        parentheticalCount++;
        awaitParenthetical = false;
        continue;
      }
      awaitParenthetical = false;
    }
    if (charCueCount >= 8 && parentheticalCount / charCueCount > 0.3) {
      issues.push({
        location: 'Dialogue parentheticals',
        rule: 'PARENTHETICAL_EXCESS',
        severity: 'minor',
        description: `${parentheticalCount} of ${charCueCount} dialogue cues (${Math.round(parentheticalCount / charCueCount * 100)}%) are followed by a parenthetical — over-directing actors signals the dialogue alone cannot carry its intended tone.`,
        suggestedFix: 'Remove parentheticals and rewrite the dialogue so the tone is evident from the words. Reserve parentheticals for genuine tonal ambiguity that the text alone cannot resolve.',
      });
    }
  }

  // ── Wave 202: Question overload, speech tag inflation, mono-speaker dominance ─

  // QUESTION_MARK_OVERLOAD: More than 35% of dialogue lines end with a question
  // mark. Characters that ask more than they declare stall the story in
  // interrogative mode — dramatic tension comes from assertion and commitment,
  // not circles of inquiry. Requires 10+ dialogue lines.
  {
    const qmDlgLines: string[] = [];
    let qmInDlg = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { qmInDlg = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { qmInDlg = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { qmInDlg = true; continue; }
      if (/^\(/.test(t)) continue;
      if (qmInDlg) { qmDlgLines.push(t); } else { qmInDlg = false; }
    }
    if (qmDlgLines.length >= 10) {
      const qCount = qmDlgLines.filter(l => l.endsWith('?')).length;
      if (qCount / qmDlgLines.length > 0.35) {
        issues.push({
          location: 'Dialogue',
          rule: 'QUESTION_MARK_OVERLOAD',
          severity: 'minor',
          description: `${qCount} of ${qmDlgLines.length} dialogue lines (${Math.round(qCount / qmDlgLines.length * 100)}%) end with a question — the script stalls in interrogative mode. Dramatic tension comes from assertion and commitment, not from circles of inquiry.`,
          suggestedFix: 'Convert most questions into declarative statements or provocative assertions. Characters who commit to positions create dramatic forward motion; characters who only ask stall it.',
        });
      }
    }
  }

  // SPEECH_TAG_INFLATION: More than 20% of action lines contain a speech-quality
  // verb ("whispered", "growled", "hissed", "shouted"). In screenplay, the
  // character cue + dialogue carries delivery — tagging the speech in action
  // smuggles a stage direction and wastes a line on an acting note rather than
  // a filmable image. Requires 8+ action lines.
  if (actionOnlyLines.length >= 8) {
    const speechTagRe = /\b(whispered?|growled?|hissed?|shouted?|barked?|snapped?|muttered?|bellowed?|scoffed?|sneered?|snarled?|yelped?|shrieked?|screeched?|drawled?|croaked?|stammered?)\b/i;
    const speechTagCount = actionOnlyLines.filter(l => speechTagRe.test(l)).length;
    if (speechTagCount / actionOnlyLines.length > 0.2) {
      issues.push({
        location: 'Action line speech tags',
        rule: 'SPEECH_TAG_INFLATION',
        severity: 'minor',
        description: `${speechTagCount} of ${actionOnlyLines.length} action lines (${Math.round(speechTagCount / actionOnlyLines.length * 100)}%) contain a speech-quality verb ("whispered", "growled", "hissed") — novel-habit direction that acts as an acting note instead of showing a filmable image.`,
        suggestedFix: 'Remove speech-quality tags from action lines. Let the dialogue do its work, or add a parenthetical if tone is genuinely ambiguous. Use the saved line for something the camera can record.',
      });
    }
  }

  // MONO_SPEAKER_DOMINANCE: A single character delivers more than 50% of all
  // dialogue lines when 3+ speaking characters are present. When one voice
  // monopolizes the script, all others become reactive instruments rather than
  // agents — the story collapses into a monologue with commentary.
  // Requires 15+ dialogue lines and 3+ characters.
  {
    const speakerCounts = new Map<string, number>();
    let msdInDlg = false;
    let msdChar = '';
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { msdInDlg = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { msdInDlg = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) {
        msdChar = t.replace(/\s*\(.*?\)\s*$/, '').trim();
        msdInDlg = true;
        continue;
      }
      if (/^\(/.test(t)) continue;
      if (msdInDlg && msdChar) {
        speakerCounts.set(msdChar, (speakerCounts.get(msdChar) ?? 0) + 1);
      } else { msdInDlg = false; }
    }
    const msdTotal = [...speakerCounts.values()].reduce((s, v) => s + v, 0);
    if (msdTotal >= 15 && speakerCounts.size >= 3) {
      for (const [char, count] of speakerCounts) {
        if (count / msdTotal > 0.5) {
          issues.push({
            location: `Character: ${char}`,
            rule: 'MONO_SPEAKER_DOMINANCE',
            severity: 'minor',
            description: `${char} delivers ${count} of ${msdTotal} dialogue lines (${Math.round(count / msdTotal * 100)}%) — one voice monopolizes the script with ${speakerCounts.size - 1} other character(s) reduced to reactive instruments.`,
            suggestedFix: `Redistribute dialogue so each major character has agency and a distinct function. ${char}'s dominance suggests others exist only to prompt ${char}'s speeches.`,
          });
          break;
        }
      }
    }
  }

  // ── Wave 224: SENTENCE_FRAGMENT_STARVATION ────────────────────────────────
  // Great screenplay action uses fragments — "The door. Open." — for rhythm and
  // urgency. If fewer than 4% of action lines are short declarative fragments
  // (≤ 4 words), the prose is verbose and non-cinematic: every sentence is a
  // complete clause, denying the reader the staccato rhythm that drives visual
  // energy. Requires 10+ action lines.
  if (actionOnlyLines.length >= 10) {
    const fragmentLines224 = actionOnlyLines.filter(l => {
      const words = l.trim().split(/\s+/).filter(w => w.length > 0);
      return words.length >= 1 && words.length <= 4 && !l.trim().endsWith('?');
    });
    const fragmentRate224 = fragmentLines224.length / actionOnlyLines.length;
    if (fragmentRate224 < 0.04) {
      issues.push({
        location: 'Action line rhythm',
        rule: 'SENTENCE_FRAGMENT_STARVATION',
        severity: 'minor',
        description: `Only ${fragmentLines224.length} of ${actionOnlyLines.length} action lines (${Math.round(fragmentRate224 * 100)}%) are short declarative fragments (≤ 4 words) — the prose has no staccato rhythm. Every sentence is a full clause; the urgency of fragment shots ("The door. Open. Silence.") is entirely absent.`,
        suggestedFix: `Introduce short declarative fragments at moments of tension, revelation, or visual punctuation. A two-word action line can carry more weight than a sentence: "Nothing moves." reads louder than "Nobody in the room is moving at all."`,
      });
    }
  }

  // ── Wave 224: SCENE_OPENER_CADENCE_LOCK ───────────────────────────────────
  // Every scene should announce itself differently. When more than 60% of scenes
  // open their first action line with the same syntactic type — all articles
  // ("The...", "A...") or all pronouns ("He...", "She...") — the script enters
  // each scene identically. This robs individual scenes of their own momentum
  // and makes the read feel mechanically assembled. Requires 8+ scenes.
  if (records.length >= 8) {
    const openerLines224: string[] = [];
    const fountainLines224 = fountain.split('\n');
    let inSceneOpener224 = false;
    for (const line of fountainLines224) {
      const t224 = line.trim();
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t224)) { inSceneOpener224 = true; continue; }
      if (!t224) continue;
      if (inSceneOpener224) {
        if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t224)) { inSceneOpener224 = false; continue; }
        openerLines224.push(t224);
        inSceneOpener224 = false;
      }
    }
    if (openerLines224.length >= 6) {
      const articleRe224 = /^(the|a|an)\b/i;
      const pronounRe224 = /^(he|she|they|it)\b/i;
      const articleCount224 = openerLines224.filter(l => articleRe224.test(l)).length;
      const pronounCount224 = openerLines224.filter(l => pronounRe224.test(l)).length;
      const articleRate224 = articleCount224 / openerLines224.length;
      const pronounRate224 = pronounCount224 / openerLines224.length;
      if (articleRate224 > 0.6 || pronounRate224 > 0.6) {
        const dominantType224 = articleRate224 >= pronounRate224
          ? 'article ("The...", "A...")'
          : 'pronoun ("He...", "She...", "They...")';
        const dominantCount224 = articleRate224 >= pronounRate224 ? articleCount224 : pronounCount224;
        issues.push({
          location: 'Scene openings',
          rule: 'SCENE_OPENER_CADENCE_LOCK',
          severity: 'minor',
          description: `${dominantCount224} of ${openerLines224.length} scene-opening action lines begin with an ${dominantType224} — every scene enters with the same syntactic cadence. The camera arrives identically each time, stripping each scene of its own momentum and urgency.`,
          suggestedFix: `Vary how scenes announce themselves: start some with an action verb ("Rain hammers the window."), some with an environment detail, some with a character name. The opening line of an action block is the scene's handshake with the reader — make each one distinct.`,
        });
      }
    }
  }

  // ── Wave 224: DIALOGUE_CADENCE_MONOCULTURE ────────────────────────────────
  // Voice is not just vocabulary — it is cadence. A character who speaks in
  // 3-word sentences sounds completely different from one who speaks in 15-word
  // ones. When all major characters converge on the same mean line-length, they
  // become indistinguishable by rhythm alone, even if their vocabulary differs.
  // Requires 3+ major characters (≥5 lines, ≥10 vocab words); fires when all
  // character means fall within a ±2.5-word band centered between 5–14 words.
  if (majorChars.length >= 3) {
    const means224 = majorChars.map(([name, p]) => {
      const mean = p.wordCountsPerLine.reduce((s, v) => s + v, 0) / Math.max(p.wordCountsPerLine.length, 1);
      return { name, mean };
    });
    const minMean224 = Math.min(...means224.map(m => m.mean));
    const maxMean224 = Math.max(...means224.map(m => m.mean));
    const bandCenter224 = (minMean224 + maxMean224) / 2;
    if (maxMean224 - minMean224 <= 2.5 && bandCenter224 >= 5 && bandCenter224 <= 14) {
      const summary224 = means224.map(m => `${m.name} (${m.mean.toFixed(1)} wpl)`).join(', ');
      issues.push({
        location: 'Character dialogue cadences',
        rule: 'DIALOGUE_CADENCE_MONOCULTURE',
        severity: 'minor',
        description: `All ${majorChars.length} major characters speak in nearly identical line-length cadences (${summary224}; spread: ${(maxMean224 - minMean224).toFixed(1)} words). No character is rhythmically short and punchy; none is long and ruminative — every voice occupies the same comfortable middle register.`,
        suggestedFix: `Give characters distinct speech rhythms: let one speak in short staccato bursts (3–5 words), another in longer sweeping sentences (10–15 words). Cadence is characterization — the tempo of how a person speaks is as distinctive as what they say.`,
      });
    }
  }

  // ── Wave 238: Negation saturation, conditional overload, dialogue flat punctuation ──

  // NEGATION_SATURATION (minor, ≥10 dialogue lines): More than 40% of dialogue
  // lines contain a negation word (no, not, never, can't, won't, don't, isn't,
  // aren't, etc.). Dialogue dominated by negation is dialogue dominated by refusal
  // — characters say no more than they say yes, orbiting around what they will
  // not do rather than what they want. Drama requires forward-reaching desire;
  // negation saturation creates a texture of blocked energy rather than driven
  // intent. Distinct from QUESTION_MARK_OVERLOAD (inquiry without commitment).
  {
    const negDlgLines238: string[] = [];
    let negInDlg238 = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { negInDlg238 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { negInDlg238 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { negInDlg238 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (negInDlg238) negDlgLines238.push(t);
      else negInDlg238 = false;
    }
    if (negDlgLines238.length >= 10) {
      const negRe238 = /\b(no\b|not\b|never\b|can't|won't|don't|isn't|aren't|wasn't|weren't|couldn't|wouldn't|shouldn't|shan't|mustn't|nothing|nobody|nowhere|neither|nor)\b/i;
      const negCount238 = negDlgLines238.filter(l => negRe238.test(l)).length;
      if (negCount238 / negDlgLines238.length > 0.4) {
        issues.push({
          location: 'Dialogue negation density',
          rule: 'NEGATION_SATURATION',
          severity: 'minor',
          description: `${negCount238} of ${negDlgLines238.length} dialogue lines (${Math.round(negCount238 / negDlgLines238.length * 100)}%) contain a negation word ("no", "not", "never", "can't", "won't", etc.) — the dialogue is dominated by refusal. Characters spend more time denying than reaching toward desire. Drama requires forward-directed want, not denial orbits.`,
          suggestedFix: "Rebalance by converting negation lines to active desire: 'I won't go back' → 'I'm moving forward no matter what.' Refusal is dramatic only when it costs something; negation as default register is avoidance, not conflict.",
        });
      }
    }
  }

  // CONDITIONAL_OVERLOAD (minor, ≥8 action lines): More than 30% of action lines
  // contain a conditional construction ("if ", "unless ", "in case", "as long as",
  // "assuming"). Conditional action prose speculates instead of asserting — the
  // camera cannot film a hypothetical. Every "if" in an action line introduces a
  // subjunctive that undermines the declarative, present-tense certainty of
  // cinematic prose. Distinct from QUALIFIER_OVERLOAD (hedging adverbs) and
  // DECLARATIVE_PILE (absence of subordinating clauses in rhythm pass): this fires
  // when action lines are conditional hypotheticals rather than visual assertions.
  if (actionOnlyLines.length >= 8) {
    const conditionalRe238 = /\bif\s|\bunless\s|\bin case\b|\bas long as\b|\bassuming\b/i;
    const condCount238 = actionOnlyLines.filter(l => conditionalRe238.test(l)).length;
    if (condCount238 / actionOnlyLines.length > 0.3) {
      issues.push({
        location: 'Action line conditionality',
        rule: 'CONDITIONAL_OVERLOAD',
        severity: 'minor',
        description: `${condCount238} of ${actionOnlyLines.length} action lines (${Math.round(condCount238 / actionOnlyLines.length * 100)}%) contain a conditional construction ("if", "unless", "in case") — the camera cannot film hypotheticals. Conditional action lines introduce speculation where the prose should assert the visual present tense.`,
        suggestedFix: "Rewrite conditional action lines into declarations: 'If she moves, he'll know' → 'She freezes. He watches.' Commit to what is happening in the scene, not what might happen under conditions. Conditionals belong in dialogue, not action prose.",
      });
    }
  }

  // DIALOGUE_FLAT_PUNCTUATION (minor, ≥10 dialogue lines): More than 85% of
  // dialogue lines end with a period, while fewer than 5% end with ? and fewer
  // than 5% end with !. Uniformly period-terminated dialogue has no punctuation-
  // based tonal texture — all exchanges are flat declaratives with no questions
  // or exclamatory beats to vary the emotional pitch. Real conversation has
  // punctuation variety; bloodless prose uses periods by default.
  {
    const flatDlg238: string[] = [];
    let fpInDlg238 = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { fpInDlg238 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { fpInDlg238 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { fpInDlg238 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (fpInDlg238) flatDlg238.push(t);
      else fpInDlg238 = false;
    }
    if (flatDlg238.length >= 10) {
      const periodCount238 = flatDlg238.filter(l => l.endsWith('.')).length;
      const questionCount238 = flatDlg238.filter(l => l.endsWith('?')).length;
      const exclaimCount238 = flatDlg238.filter(l => l.endsWith('!')).length;
      const periodRate238 = periodCount238 / flatDlg238.length;
      if (periodRate238 > 0.85 && questionCount238 / flatDlg238.length < 0.05 && exclaimCount238 / flatDlg238.length < 0.05) {
        issues.push({
          location: 'Dialogue punctuation texture',
          rule: 'DIALOGUE_FLAT_PUNCTUATION',
          severity: 'minor',
          description: `${periodCount238} of ${flatDlg238.length} dialogue lines (${Math.round(periodRate238 * 100)}%) end with a period, with only ${questionCount238} questions and ${exclaimCount238} exclamations — the dialogue is punctuationally flat. Uniformly period-terminated dialogue reads as scripted and bloodless; real conversation has tonal pitch variation.`,
          suggestedFix: `Introduce punctuation variety: convert some declarative responses to genuine questions, add exclamatory beats at moments of shock or urgency. Punctuation is the cadence of breath — uniform periods strip dialogue of its pulse. Even two or three questions per page change the register dramatically.`,
        });
      }
    }
  }

  // ── Wave 252: Present progressive overuse, action pronoun flood, monosyllable dominance ──

  // PRESENT_PROGRESSIVE_OVERUSE (minor, ≥8 action lines): More than 40% of action
  // lines use a present progressive construction ("is/are/was/were + -ing" verb).
  // "She is walking to the door." "He is looking out the window." The progressive
  // implies ongoing duration rather than decisive action — screenwriting prefers
  // "She walks to the door" for its directness and authority. Present progressive
  // in action is a prose-novel habit; it makes the screenplay feel like a long
  // description of a dream rather than a present-tense event unfolding.
  if (actionOnlyLines.length >= 8) {
    const progressiveRe252 = /\b(is|are|was|were|am)\s+\w+ing\b/i;
    const progCount252 = actionOnlyLines.filter(l => progressiveRe252.test(l)).length;
    if (progCount252 / actionOnlyLines.length > 0.4) {
      issues.push({
        location: 'Action line verb tense',
        rule: 'PRESENT_PROGRESSIVE_OVERUSE',
        severity: 'minor',
        description: `${progCount252} of ${actionOnlyLines.length} action lines (${Math.round(progCount252 / actionOnlyLines.length * 100)}%) use a present progressive construction ("is/are/was + -ing") — "She is walking" instead of "She walks." Progressive constructions imply ongoing duration; direct present tense asserts cinematic now.`,
        suggestedFix: 'Convert progressive to simple present: "He is running" → "He runs." "She is watching" → "She watches." The simple present is the natural verb form of screenplay action; it places the reader inside the scene happening, not observing it from a distance.',
      });
    }
  }

  // ACTION_PRONOUN_FLOOD (minor, ≥8 action lines): More than 55% of action lines
  // begin with a pronoun (he/she/they/it/we/you). OPENING_WORD_REPETITION in
  // rhythm.ts fires when >40% start with the SAME word — this fires when
  // a MIX of pronouns (he/she alternating) collectively dominates, still creating
  // a "pronoun parade" where characters are never named or described, just tracked
  // by gender marker. Names and physical descriptors carry more cinematic presence
  // than pronoun referents; pronoun-flooding makes the action feel anonymous.
  {
    const pronounStartRe252 = /^(he|she|they|it|we|you|him|her|them|his|their)\b/i;
    const pronounStartCount252 = actionOnlyLines.filter(l => pronounStartRe252.test(l)).length;
    if (actionOnlyLines.length >= 8 && pronounStartCount252 / actionOnlyLines.length > 0.55) {
      issues.push({
        location: 'Action line openings',
        rule: 'ACTION_PRONOUN_FLOOD',
        severity: 'minor',
        description: `${pronounStartCount252} of ${actionOnlyLines.length} action lines (${Math.round(pronounStartCount252 / actionOnlyLines.length * 100)}%) begin with a pronoun — the action is a pronoun parade ("he..., she..., they...") where characters are tracked by reference marker rather than presence. Pronoun-dominant action makes characters feel anonymous and interchangeable.`,
        suggestedFix: "Vary action openers: use character names, physical descriptors, or object-first sentences. \"He closes the door\" → \"MARTINEZ closes the door.\" or \"The door closes behind him.\" Names command attention; pronouns are invisible.",
      });
    }
  }

  // DIALOGUE_MONOSYLLABLE_DOMINANCE (minor, ≥10 dialogue lines): More than 65%
  // of all words across all dialogue lines are monosyllabic (1-3 letters). When
  // nearly every word has only one syllable, the dialogue register is tonally flat —
  // no polysyllabic words means no variety in verbal weight or register. Characters
  // all speak in short, punchy monosyllables; the dialogue loses the verbal texture
  // of varied word weight. Distinct from DIALOGUE_STACCATO_OVERUSE (which checks
  // line LENGTH) — this checks WORD-LEVEL syllable distribution.
  {
    const monoAllWords252: string[] = [];
    let monoInDlg252 = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { monoInDlg252 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { monoInDlg252 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { monoInDlg252 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (monoInDlg252) {
        monoAllWords252.push(...t.split(/\s+/).filter(w => w.length > 0));
      } else {
        monoInDlg252 = false;
      }
    }
    const dlgLineCount252 = (() => {
      let count = 0; let inD = false;
      for (const line of allLines) {
        const t = line.trim();
        if (!t) { inD = false; continue; }
        if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inD = false; continue; }
        if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inD = true; continue; }
        if (/^\(/.test(t)) continue;
        if (inD) count++;
        else inD = false;
      }
      return count;
    })();
    if (dlgLineCount252 >= 10 && monoAllWords252.length >= 20) {
      const monoCount252 = monoAllWords252.filter(w => w.replace(/[^a-zA-Z]/g, '').length <= 3).length;
      if (monoCount252 / monoAllWords252.length > 0.65) {
        issues.push({
          location: 'Dialogue word-level texture',
          rule: 'DIALOGUE_MONOSYLLABLE_DOMINANCE',
          severity: 'minor',
          description: `${monoCount252} of ${monoAllWords252.length} dialogue words (${Math.round(monoCount252 / monoAllWords252.length * 100)}%) are monosyllabic — the dialogue's verbal texture is tonally flat. When almost every word has one syllable, conversation loses the weight variation that distinguishes heightened speech from casual talk.`,
          suggestedFix: "Introduce some polysyllabic vocabulary at key moments: a character who speaks with unexpected precision, a term that shows education or context. Even one or two longer words per exchange changes the verbal texture: 'That's bad' vs 'That's catastrophic.' Weight matters.",
        });
      }
    }
  }

  // ── Wave 266: Stative verb overload, dialogue hedging opener, abstract subject opening ──

  // STATIVE_VERB_OVERLOAD (minor, ≥8 action lines): More than 35% of action lines
  // begin with a stative verb ("is", "are", "was", "were", "stands", "sits", "lies",
  // "remains", "appears"). Stative-opening lines describe states rather than events —
  // "Stands at the window." vs "Crosses to the window." A stative-heavy pattern turns
  // action prose into tableau descriptions rather than present-tense unfolding. Distinct
  // from PASSIVE_ACTION_VOICE (passive constructions anywhere in the line) and
  // DECLARATIVE_PILE (grammatical structure).
  if (actionOnlyLines.length >= 8) {
    const stativeStartRe266 = /^(is|are|was|were|stands?|sits?|lies?|lays?|remains?|appears?|exists?|contains?|holds?|rests?|hangs?|leans?)\s/i;
    const stativeCount266 = actionOnlyLines.filter(l => stativeStartRe266.test(l.trim())).length;
    if (stativeCount266 / actionOnlyLines.length > 0.35) {
      issues.push({
        location: 'Action line openings',
        rule: 'STATIVE_VERB_OVERLOAD',
        severity: 'minor',
        description: `${stativeCount266} of ${actionOnlyLines.length} action lines (${Math.round(stativeCount266 / actionOnlyLines.length * 100)}%) open with a stative verb ("is", "was", "stands", "remains", etc.) — the action prose describes a series of states rather than events. Stative-opening lines produce tableau prose; screenplay action should show present-tense events unfolding.`,
        suggestedFix: "Convert stative openers to active events: 'Stands at the window' → 'Crosses to the window.' 'Was found in the alley' → 'The body lies in the alley, arms spread.' Replace state-descriptions with the action or image that carries the same information.",
      });
    }
  }

  // DIALOGUE_HEDGING_OPENER (minor, ≥10 dialogue lines): More than 25% of dialogue
  // lines begin with a hedging opener ("Well,", "I mean,", "Look,", "Listen,",
  // "Actually,", "Honestly,", "Basically,", "I guess,", "I suppose,"). Dialogue
  // that consistently opens with hedges pre-apologizes for its content before
  // delivering it — every utterance softens before it lands. Distinct from
  // NEGATION_SATURATION (refusal) and QUALIFIER_OVERLOAD (in action lines).
  {
    const hedgeDlgLines266: string[] = [];
    let hedgeDlgIn266 = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { hedgeDlgIn266 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { hedgeDlgIn266 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { hedgeDlgIn266 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (hedgeDlgIn266) hedgeDlgLines266.push(t);
      else hedgeDlgIn266 = false;
    }
    if (hedgeDlgLines266.length >= 10) {
      const hedgeRe266 = /^(well[,\s]|i mean[,\s]|look[,\s]|listen[,\s]|actually[,\s]|honestly[,\s]|basically[,\s]|you know[,\s]|the thing is[,\s]|i just[,\s]|i guess[,\s]|i suppose[,\s])/i;
      const hedgeCount266 = hedgeDlgLines266.filter(l => hedgeRe266.test(l)).length;
      if (hedgeCount266 / hedgeDlgLines266.length > 0.25) {
        issues.push({
          location: 'Dialogue openers',
          rule: 'DIALOGUE_HEDGING_OPENER',
          severity: 'minor',
          description: `${hedgeCount266} of ${hedgeDlgLines266.length} dialogue lines (${Math.round(hedgeCount266 / hedgeDlgLines266.length * 100)}%) begin with a hedging opener ("Well,", "Actually,", "I mean,", "Look,", "I guess,") — every utterance is pre-apologized before it lands. Characters who habitually hedge lack the declarative force of committed speech; their words slide past the audience rather than landing.`,
          suggestedFix: "Cut the hedges and begin dialogue at its point: 'Well, I think maybe you should go' → 'Leave.' Hedging openers are filler — they signal a character apologizing for their content before delivering it. Committed characters begin with their position, not their hesitation.",
        });
      }
    }
  }

  // ABSTRACT_SUBJECT_OPENING (minor, ≥8 action lines): More than 30% of action
  // lines open with an abstract noun as subject ("Silence fills the room.",
  // "Fear grips them.", "Tension builds.", "Time passes."). Abstract subjects
  // weaken cinematic prose — the camera captures objects and actions, not named
  // states or emotions. Distinct from INTERIOR_MONOLOGUE_LEAK (character
  // psychology) and the rhythm pass's ABSTRACT_NOUN_OVERLOAD (anywhere in line).
  if (actionOnlyLines.length >= 8) {
    const abstractSubjectRe266 = /^(silence|tension|fear|time|anxiety|grief|sadness|darkness|chaos|love|hate|anger|despair|hope|joy|doubt|confusion|emotion|mood|sorrow|longing|memory|guilt|shame|dread|bitterness|wonder|regret|peace|calm)\b/i;
    const abstractSubjectCount266 = actionOnlyLines.filter(l => abstractSubjectRe266.test(l.trim())).length;
    if (abstractSubjectCount266 / actionOnlyLines.length > 0.3) {
      issues.push({
        location: 'Action line subjects',
        rule: 'ABSTRACT_SUBJECT_OPENING',
        severity: 'minor',
        description: `${abstractSubjectCount266} of ${actionOnlyLines.length} action lines (${Math.round(abstractSubjectCount266 / actionOnlyLines.length * 100)}%) open with an abstract noun subject ("Silence fills...", "Fear grips...", "Tension builds...") — the screenplay names emotional and temporal states instead of showing what creates them. The camera cannot record silence or tension directly; it can only record what silence and tension look like.`,
        suggestedFix: "Replace abstract subjects with concrete ones: 'Silence fills the room' → 'Nobody speaks. Nobody moves.' 'Tension builds' → 'ALICE grips the table edge.' Give the camera a person, an object, or an action — not a named state.",
      });
    }
  }

  // ── Wave 280: Intensifier flood, monochrome verbs, scene heading repetition ──

  // INTENSIFIER_FLOOD (minor, ≥8 dialogue lines): More than 30% of dialogue lines
  // contain an intensifier adverb ("really", "very", "totally", "absolutely",
  // "literally", "extremely", "incredibly", etc.). Dialogue loaded with intensifiers
  // performs emotion through amplification rather than precise word choice — the adverb
  // signals that the noun or adjective it modifies is not the right word. Characters who
  // say "really angry" instead of "furious" are telling the audience how to feel rather
  // than choosing language precise enough to generate that feeling independently.
  {
    const intensDlgLines280: string[] = [];
    let intensInDlg280 = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { intensInDlg280 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { intensInDlg280 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { intensInDlg280 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (intensInDlg280) intensDlgLines280.push(t);
      else intensInDlg280 = false;
    }
    if (intensDlgLines280.length >= 8) {
      const intensRe280 = /\b(really|very|totally|absolutely|literally|extremely|incredibly|terribly|awfully|insanely|ridiculously)\b/i;
      const intensCount280 = intensDlgLines280.filter(l => intensRe280.test(l)).length;
      if (intensCount280 / intensDlgLines280.length > 0.3) {
        issues.push({
          location: 'Dialogue',
          rule: 'INTENSIFIER_FLOOD',
          severity: 'minor',
          description: `${intensCount280} of ${intensDlgLines280.length} dialogue lines (${Math.round(intensCount280 / intensDlgLines280.length * 100)}%) contain an intensifier adverb ("really", "very", "absolutely", "literally", "extremely") — the dialogue performs emotion through amplification rather than specific, charged language. An intensifier always signals that the word it modifies is not precise enough.`,
          suggestedFix: `Remove intensifiers and find the precise word: "really angry" → "furious"; "very scared" → "terrified"; "absolutely certain" → "certain." The right noun or adjective never needs reinforcement; when you reach for an intensifier, reach for a better word instead.`,
        });
      }
    }
  }

  // MONOCHROME_VERBS (minor, ≥12 action lines): A single common action verb appears
  // in more than 25% of all action lines. When one verb dominates the action prose
  // ("walks", "moves", "looks", "turns"), every action reads identically — the screenplay
  // loses the specificity that makes individual movements cinematic and characterizing.
  // Distinct from ADVERB_CRUTCH (adverbs patching weak verbs) and VOICE_TOO_UNIFORM
  // (scene-level lexical similarity): this fires on verb-level repetition across the
  // whole script.
  if (actionOnlyLines.length >= 12) {
    const commonVerbList280 = ['walk', 'move', 'look', 'turn', 'run', 'cross', 'open', 'close', 'reach', 'pull', 'grab', 'take', 'get', 'go', 'come', 'sit', 'stand', 'enter', 'leave', 'pick'];
    const verbLineCounts280 = new Map<string, number>();
    for (const verb280 of commonVerbList280) {
      const verbRe280 = new RegExp(`\\b${verb280}s?\\b`, 'i');
      const cnt280 = actionOnlyLines.filter(l => verbRe280.test(l)).length;
      if (cnt280 > 0) verbLineCounts280.set(verb280, cnt280);
    }
    if (verbLineCounts280.size > 0) {
      const maxVerbCount280 = Math.max(...verbLineCounts280.values());
      if (maxVerbCount280 / actionOnlyLines.length > 0.25) {
        const topVerb280 = [...verbLineCounts280.entries()].sort((a, b) => b[1] - a[1])[0][0];
        issues.push({
          location: 'Action line verbs',
          rule: 'MONOCHROME_VERBS',
          severity: 'minor',
          description: `The verb "${topVerb280}" (and its inflected forms) appears in ${maxVerbCount280} of ${actionOnlyLines.length} action lines (${Math.round(maxVerbCount280 / actionOnlyLines.length * 100)}%) — the screenplay's action vocabulary is impoverished. When a single verb dominates, every movement reads identically; the prose loses the specificity that makes individual actions cinematic and characterizing.`,
          suggestedFix: `Replace repetitions of "${topVerb280}" with precise, varied verbs suited to each character and moment: "walks" could be "saunters", "marches", "shuffles", "strides", or "trudges" depending on emotional state. Each action verb is a miniature characterization; when all actions share the same word, all characters move as one.`,
        });
      }
    }
  }

  // SCENE_HEADING_REPETITION (minor, ≥8 records): More than 60% of scene headings
  // reference the same location. When a single location dominates the scene headings,
  // the screenplay's visual universe is restricted — the story never leaves the same
  // room. Cinema uses spatial variety to modulate pace, atmosphere, and power dynamics;
  // a screenplay confined to one location signals a limited visual imagination or a
  // stage play adapted without cinematographic thinking. Distinct from TONAL_WHIPLASH
  // (too much variety) and VOICE_TOO_UNIFORM (lexical sameness): this tracks physical
  // location variety as a dimension of cinematic voice.
  if (records.length >= 8) {
    const locationCounts280 = new Map<string, number>();
    for (const r of records) {
      const locMatch280 = r.slug.match(/^(?:INT\.|EXT\.|INT\/EXT\.|I\/E\.)\s+([^-]+)/i);
      if (locMatch280) {
        const loc280 = locMatch280[1].trim().toUpperCase();
        locationCounts280.set(loc280, (locationCounts280.get(loc280) ?? 0) + 1);
      }
    }
    if (locationCounts280.size > 0) {
      const maxLocCount280 = Math.max(...locationCounts280.values());
      if (maxLocCount280 / records.length > 0.6) {
        const topLoc280 = [...locationCounts280.entries()].sort((a, b) => b[1] - a[1])[0][0];
        issues.push({
          location: 'Scene headings',
          rule: 'SCENE_HEADING_REPETITION',
          severity: 'minor',
          description: `${maxLocCount280} of ${records.length} scenes (${Math.round(maxLocCount280 / records.length * 100)}%) are set in "${topLoc280}" — the screenplay's visual universe is restricted to a single dominant location. Cinema uses spatial variety to modulate pace, atmosphere, and the physical expression of power; a story that never leaves one room forfeits these tools.`,
          suggestedFix: `Introduce more physical locations or significantly differentiate revisits to "${topLoc280}" through time-of-day, staging, or set condition. Even minor spatial changes (INT. OFFICE vs INT. HALLWAY OUTSIDE OFFICE) expand the visual vocabulary. If the single-location constraint is intentional (bottle episode), ensure the staging varies enough to create spatial rhythm.`,
        });
      }
    }
  }

  // ── Wave 294: DIALOGUE_INTERROGATIVE_SATURATION ──────────────────────────
  // More than 30% of dialogue lines end with a question mark. When characters
  // ask questions constantly, the story's dialogue becomes a cross-examination
  // rather than a confrontation or declaration. Questions are dramatically
  // passive — they defer to the other character. A dialogue dominated by
  // questions has no one taking a stand. Requires 10+ dialogue lines.
  {
    const intDlgLines294: string[] = [];
    let intInDlg294 = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { intInDlg294 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { intInDlg294 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { intInDlg294 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (intInDlg294) intDlgLines294.push(t);
      else intInDlg294 = false;
    }
    if (intDlgLines294.length >= 10) {
      const qCount294 = intDlgLines294.filter(l => l.trim().endsWith('?')).length;
      if (qCount294 / intDlgLines294.length > 0.30) {
        issues.push({
          location: 'Dialogue interrogatives',
          rule: 'DIALOGUE_INTERROGATIVE_SATURATION',
          severity: 'minor',
          description: `${qCount294} of ${intDlgLines294.length} dialogue lines (${Math.round(qCount294 / intDlgLines294.length * 100)}%) end with a question mark — the dialogue is dominated by interrogation. Characters who only ask questions never take positions; dialogue without declarations, demands, or confrontations reads as evasive and passive.`,
          suggestedFix: 'Replace questions with declarations, demands, or challenges: "What are you doing here?" → "You shouldn\'t be here." Questions are postponements; statements are stakes. Reserve questions for moments of genuine vulnerability — a character who only questions never reveals what they want.',
        });
      }
    }
  }

  // ── Wave 294: ACTION_ADVERB_FLOOD ────────────────────────────────────────
  // More than 25% of action lines contain an adverb immediately before or
  // after the main verb ("slowly walks", "quickly turns", "silently crosses").
  // Action adverbs patch weak verbs: "slowly walks" is "shuffles";
  // "quickly turns" is "spins". A flood of action adverbs indicates a verb
  // vocabulary problem — the writer is modifying common verbs rather than
  // selecting precise ones. Requires 8+ action lines.
  if (actionOnlyLines.length >= 8) {
    const actionAdverbRe294 = /\b(slowly|quickly|quietly|silently|suddenly|carefully|gently|roughly|softly|harshly|briefly|sharply|firmly|nervously|anxiously|angrily|calmly|rapidly|heavily|lightly)\b/i;
    const actionAdverbCount294 = actionOnlyLines.filter(l => actionAdverbRe294.test(l)).length;
    if (actionAdverbCount294 / actionOnlyLines.length > 0.25) {
      issues.push({
        location: 'Action line adverbs',
        rule: 'ACTION_ADVERB_FLOOD',
        severity: 'minor',
        description: `${actionAdverbCount294} of ${actionOnlyLines.length} action lines (${Math.round(actionAdverbCount294 / actionOnlyLines.length * 100)}%) contain manner adverbs ("slowly", "quietly", "suddenly", "carefully"). Adverbs patch imprecise verbs — "walks slowly" should be "shuffles"; "turns quickly" should be "spins". An adverb flood signals weak verb vocabulary.`,
        suggestedFix: 'For each adverb-modified verb pair, find the single precise verb: "silently crosses" → "slips", "roughly grabs" → "seizes", "carefully opens" → "eases open". The right verb never needs an adverb. When you reach for a manner adverb, you have not yet found the right verb.',
      });
    }
  }

  // ── Wave 294: CHARACTER_NAME_MONOTONY ────────────────────────────────────
  // A single character name appears in more than 50% of all action lines.
  // The screenplay is written from the perspective of one character who
  // physically dominates every action beat — other characters become props
  // in their own scenes. Even in a single-protagonist story, not every action
  // line needs to name the protagonist. Action without a named subject creates
  // cinematic space and lets the environment become a character. Requires 12+
  // action lines.
  if (actionOnlyLines.length >= 12) {
    const nameLineMap294 = new Map<string, number>();
    for (const l of actionOnlyLines) {
      const words294 = l.trim().split(/\s+/);
      const firstWord294 = words294[0]?.replace(/[^a-zA-Z]/g, '');
      if (firstWord294 && firstWord294.length > 1 && /^[A-Z]/.test(firstWord294)) {
        nameLineMap294.set(firstWord294, (nameLineMap294.get(firstWord294) ?? 0) + 1);
      }
    }
    if (nameLineMap294.size > 0) {
      const maxNameCount294 = Math.max(...nameLineMap294.values());
      if (maxNameCount294 / actionOnlyLines.length > 0.50) {
        const topName294 = [...nameLineMap294.entries()].sort((a, b) => b[1] - a[1])[0][0];
        issues.push({
          location: 'Action line subjects',
          rule: 'CHARACTER_NAME_MONOTONY',
          severity: 'minor',
          description: `"${topName294}" opens ${maxNameCount294} of ${actionOnlyLines.length} action lines (${Math.round(maxNameCount294 / actionOnlyLines.length * 100)}%) — one character name dominates the action prose. When every action begins with the same name, supporting characters become props and the physical world disappears. A screenplay is a camera, not a POV diary.`,
          suggestedFix: `Vary action subjects: use the environment, objects, and other characters as the grammatical subjects of action lines. "The door opens" instead of "${topName294} opens the door"; "Silence fills the room" instead of "${topName294} stands in silence". Distributing action subjects creates spatial depth and cinematic rhythm.`,
        });
      }
    }
  }

  // ── Wave 308: dialogue length uniformity, dash interruption flood, shout caps ──
  {
    const dlg308: string[] = [];
    let inDlg308 = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg308 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg308 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg308 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg308) dlg308.push(t);
      else inDlg308 = false;
    }

    // DIALOGUE_LENGTH_UNIFORMITY (minor, ≥12 dialogue lines): More than 70% of
    // dialogue lines fall within a 3-word band (±1 word of a common length) —
    // every speech is essentially the same size. Distinct from DIALOGUE_CADENCE_
    // MONOCULTURE (per-character mean convergence): this audits the line-level
    // length distribution across the whole script, and fires even in a
    // single-character piece. Speech-length variation is a primary tool of
    // rhythm and characterization; its absence flattens every exchange.
    if (dlg308.length >= 12) {
      const wc308 = dlg308.map(l => l.split(/\s+/).filter(Boolean).length);
      let bestBand308 = 0;
      for (const c of new Set(wc308)) {
        const inBand = wc308.filter(w => Math.abs(w - c) <= 1).length;
        if (inBand > bestBand308) bestBand308 = inBand;
      }
      if (bestBand308 / dlg308.length > 0.7) {
        issues.push({
          location: 'Dialogue line lengths',
          rule: 'DIALOGUE_LENGTH_UNIFORMITY',
          severity: 'minor',
          description: `${bestBand308} of ${dlg308.length} dialogue lines (${Math.round(bestBand308 / dlg308.length * 100)}%) fall within a 3-word length band — nearly every speech is the same size. Speech-length variation is a primary tool of rhythm and characterization; when every line runs the same length, the dialogue acquires a metronomic sameness and no character's verbal tempo stands out.`,
          suggestedFix: 'Vary speech lengths deliberately: let a clipped one-word retort sit against a character\'s rambling justification, or break a long speech with a terse interruption. The contrast between a long line and a short one is where rhythm — and character — lives.',
        });
      }
    }

    // DIALOGUE_DASH_INTERRUPTION_FLOOD (minor, ≥10 dialogue lines): More than 30%
    // of dialogue lines contain an em-dash (or double hyphen) — the characters
    // constantly interrupt themselves or each other. One dash sharpens a beat;
    // a flood of them turns every exchange into a pile-up of broken sentences and
    // signals the writer reaching for the same interruption device repeatedly.
    // Distinct from rhythm's DASH_CHAIN (action lines ending on a dash).
    if (dlg308.length >= 10) {
      const dashCount308 = dlg308.filter(l => /(—|--)/.test(l)).length;
      if (dashCount308 / dlg308.length > 0.3) {
        issues.push({
          location: 'Dialogue interruption dashes',
          rule: 'DIALOGUE_DASH_INTERRUPTION_FLOOD',
          severity: 'minor',
          description: `${dashCount308} of ${dlg308.length} dialogue lines (${Math.round(dashCount308 / dlg308.length * 100)}%) contain an interruption dash. One dash sharpens a moment of cut-off or self-correction; a flood of them turns every exchange into a pile-up of broken sentences, and the device stops signaling anything because it never stops happening.`,
          suggestedFix: 'Reserve the interruption dash for genuine overlaps and cut-offs that the drama requires, and let most lines complete. If characters are meant to talk over each other constantly, find other ways to show it — overlapping content, non-answers — so the dash regains its force when it does appear.',
        });
      }
    }

    // DIALOGUE_SHOUT_CAPS (minor, ≥3 shout lines): Three or more dialogue lines
    // contain a shouted ALL-CAPS word ("Get OUT of here"). Caps-shouting is a
    // blunt substitute for dialogue that conveys intensity through word choice and
    // context; recurring caps in speech reads as the script yelling at the reader.
    // Distinct from originality's CAPS_EMPHASIS_OVERUSE (caps in action lines).
    {
      const shoutLines308 = dlg308.filter(l => /\b[A-Z]{3,}\b/.test(l));
      if (shoutLines308.length >= 3) {
        issues.push({
          location: 'Dialogue ALL-CAPS shouting',
          rule: 'DIALOGUE_SHOUT_CAPS',
          severity: 'minor',
          description: `${shoutLines308.length} dialogue lines contain a shouted ALL-CAPS word. Caps-shouting is a blunt substitute for intensity that the words and context should carry on their own; recurring caps in speech reads as the script yelling at the reader rather than trusting the scene to land its own force.`,
          suggestedFix: 'Strip the caps and build intensity through the line itself — sharper word choice, a harder beat, an action line that shows the volume ("Her voice cracks the room"). If emphasis is essential, italics on a single word do the job once; caps used repeatedly just flatten into noise.',
        });
      }
    }
  }

  // ── Wave 322: trailing ellipsis flood, repeated opener word, conjunction opener ──
  {
    const dlg322: string[] = [];
    let inDlg322 = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg322 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg322 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg322 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg322) dlg322.push(t);
      else inDlg322 = false;
    }

    // DIALOGUE_TRAILING_ELLIPSIS_FLOOD (minor, ≥10 dialogue lines): More than 25%
    // of dialogue lines trail off with an ellipsis ("I don't know...", "Maybe
    // we should..."). One trailing ellipsis lands a moment of hesitation or a
    // thought left hanging; a flood of them makes every character perpetually
    // unable to finish a sentence, draining dialogue of declarative force.
    // Distinct from DIALOGUE_DASH_INTERRUPTION_FLOOD (em-dash cut-offs — an
    // external interruption) and the rhythm/originality ellipsis checks (action
    // lines): this audits dialogue lines that trail off into silence.
    if (dlg322.length >= 10) {
      const ellipsisCount322 = dlg322.filter(l => /(\.\.\.|…)\s*$/.test(l.trim())).length;
      if (ellipsisCount322 / dlg322.length > 0.25) {
        issues.push({
          location: 'Dialogue trailing ellipses',
          rule: 'DIALOGUE_TRAILING_ELLIPSIS_FLOOD',
          severity: 'minor',
          description: `${ellipsisCount322} of ${dlg322.length} dialogue lines (${Math.round(ellipsisCount322 / dlg322.length * 100)}%) trail off with an ellipsis. One trailing ellipsis lands a hesitation or a thought left hanging; a flood of them makes every character perpetually unable to finish a sentence. The device stops signaling uncertainty because it never stops appearing, and the dialogue loses all declarative force.`,
          suggestedFix: 'Let most lines land their full stop. Reserve the trailing ellipsis for the rare moment a character genuinely cannot or will not finish — and convey hesitation elsewhere through content (a non-answer, a deflection, a subject change) so the silence carries weight when it does come.',
        });
      }
    }

    // DIALOGUE_REPEATED_OPENER_WORD (minor, ≥12 dialogue lines): A single word
    // begins more than 40% of all dialogue lines — every other line opens the
    // same way. Distinct from DIALOGUE_HEDGING_OPENER (a category of hedging
    // phrases) and the action-line opener checks: this is the dialogue analogue
    // of repeated sentence openings, catching a verbal tic ("You... You...
    // You...") that flattens the rhythm of every exchange regardless of which
    // word it is.
    if (dlg322.length >= 12) {
      const firstWords322 = new Map<string, number>();
      for (const l of dlg322) {
        const w = (l.trim().split(/\s+/)[0] ?? '').toLowerCase().replace(/[^a-z']/g, '');
        if (w) firstWords322.set(w, (firstWords322.get(w) ?? 0) + 1);
      }
      const [topWord322, topCount322] = [...firstWords322.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['', 0];
      if (topCount322 / dlg322.length > 0.4) {
        issues.push({
          location: 'Dialogue line openers',
          rule: 'DIALOGUE_REPEATED_OPENER_WORD',
          severity: 'minor',
          description: `${topCount322} of ${dlg322.length} dialogue lines (${Math.round(topCount322 / dlg322.length * 100)}%) begin with "${topWord322}" — nearly every other line opens the same way. A single dominant opener word gives the dialogue a metronomic sameness; the audience starts hearing the pattern instead of the meaning, and no character's verbal entry point stands out from another's.`,
          suggestedFix: `Vary how lines begin: a question, a name, an objection, a concrete noun. When most lines start with "${topWord322}", characters all share one verbal reflex — break it so each speaker can enter a line from their own angle.`,
        });
      }
    }

    // DIALOGUE_CONJUNCTION_OPENER (minor, ≥10 dialogue lines): More than 30% of
    // dialogue lines begin with a coordinating conjunction ("And...", "But...",
    // "So...", "Or...", "Because..."). Conjunction openers chain speech to what
    // came before; in excess they make every line a continuation, so dialogue
    // reads as one unbroken run-on rather than distinct, weighed statements.
    // Distinct from DIALOGUE_HEDGING_OPENER (hedging phrases) and the action-line
    // conjunction checks in rhythm/originality: this audits dialogue specifically.
    if (dlg322.length >= 10) {
      const conjRe322 = /^(and|but|so|or|because|yet|nor)\b/i;
      const conjCount322 = dlg322.filter(l => conjRe322.test(l.trim())).length;
      if (conjCount322 / dlg322.length > 0.3) {
        issues.push({
          location: 'Dialogue conjunction openers',
          rule: 'DIALOGUE_CONJUNCTION_OPENER',
          severity: 'minor',
          description: `${conjCount322} of ${dlg322.length} dialogue lines (${Math.round(conjCount322 / dlg322.length * 100)}%) begin with a coordinating conjunction ("And", "But", "So", "Because"). Conjunction openers chain each line to the last; in excess they make every utterance a continuation rather than a distinct statement, and the dialogue reads as one unbroken run-on instead of weighed, separable beats.`,
          suggestedFix: 'Let most lines stand on their own. A conjunction opener can carry momentum at a key moment, but when most lines begin with one, the speech never lands a clean declarative beat. Start more lines with their actual subject so each statement carries its own weight.',
        });
      }
    }
  }

  // ── Wave 333: DIALOGUE_NAME_OPENER_FLOOD, DIALOGUE_RETROSPECTIVE_OPENER, DIALOGUE_WORD_STUTTER ──
  {
    const dlg333: string[] = [];
    let inDlg333 = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg333 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg333 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg333 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg333) dlg333.push(t);
      else inDlg333 = false;
    }

    // DIALOGUE_NAME_OPENER_FLOOD (minor, ≥10 dialogue lines): More than 30% of
    // dialogue lines begin with direct address — a capitalized word followed by a
    // comma that is not a common conjunction, adverb, or article (e.g., "John, I",
    // "Mary, please", "Frank, you need to"). TV-habit overuse of direct address in
    // dialogue reads as expository; when most lines open by naming the person being
    // addressed, the script is manufacturing artificial intimacy. Distinct from
    // DIALOGUE_REPEATED_OPENER_WORD (one specific word >40%) and DIALOGUE_HEDGING_OPENER
    // (hedging phrases, not proper-name address).
    if (dlg333.length >= 10) {
      const NON_NAME_WORDS333 = new Set([
        'i','he','she','we','they','it','you','and','but','or','so','yet','nor',
        'the','a','an','in','on','at','to','for','with','by','from','of','about',
        'well','actually','honestly','basically','never','always','sometimes','maybe',
        'look','listen','wait','yes','no','please','sure','right','okay','fine','now',
        'what','where','when','who','why','how','which','if','that','this','these',
        'yesterday','today','tomorrow','then','before','after','anyway','still','just',
        'here','there','until','while','once','then','meanwhile','sorry','thanks',
      ]);
      const nameRe333 = /^([A-Z][a-z]{0,14}),\s/;
      const nameCount333 = dlg333.filter(l => {
        const m = nameRe333.exec(l.trim());
        return m !== null && !NON_NAME_WORDS333.has(m[1].toLowerCase());
      }).length;
      if (nameCount333 / dlg333.length > 0.30) {
        issues.push({
          location: 'Dialogue direct-address openers',
          rule: 'DIALOGUE_NAME_OPENER_FLOOD',
          severity: 'minor',
          description: `${nameCount333} of ${dlg333.length} dialogue lines (${Math.round(nameCount333 / dlg333.length * 100)}%) begin with direct character address ("John, I...", "Mary, you..."). Overuse of name-first address makes dialogue feel artificially intimate and expository — real conversational speech rarely prefaces statements with the listener's name. When most lines open this way, the dialogue loses natural rhythm and reads as theatrical narration.`,
          suggestedFix: 'Remove the direct address from most lines and let the character speak directly to their point. Reserve name-first address for moments of genuine urgency, confrontation, or intimacy — where naming someone is a deliberate dramatic act, not a speech habit.',
        });
      }
    }

    // DIALOGUE_RETROSPECTIVE_OPENER (minor, ≥10 dialogue lines, ≥4 matches):
    // At least 4 dialogue lines open with explicit retrospective indicators
    // ("I remember", "Back when", "Do you remember", "I used to", "Years ago",
    // "Before you", "That was when", "In those days"). When many dialogue lines
    // open in retrospective mode, characters are narrating the past rather than
    // confronting each other in the present. Backstory delivered in retrospective
    // openers pauses dramatic time. Distinct from DIALOGUE_HEDGING_OPENER (hedging
    // phrases not temporal retrospection) and DIALOGUE_CONJUNCTION_OPENER (additive
    // chain openers not retrospective openers).
    if (dlg333.length >= 10) {
      const retroRe333 = /^(I remember|Do you remember|Back when|Years ago|Before you|Before I|When I was|That was when|I used to|You used to|We used to|In those days|Back then|Once I|Once you|Once we|Last time I)/i;
      const retroCount333 = dlg333.filter(l => retroRe333.test(l.trim())).length;
      if (retroCount333 >= 4 && retroCount333 / dlg333.length > 0.25) {
        issues.push({
          location: 'Dialogue retrospective openers',
          rule: 'DIALOGUE_RETROSPECTIVE_OPENER',
          severity: 'minor',
          description: `${retroCount333} of ${dlg333.length} dialogue lines (${Math.round(retroCount333 / dlg333.length * 100)}%) open with retrospective narration ("I remember", "Back when", "Years ago", "I used to"). When characters consistently open in the past tense, they are narrating backstory rather than confronting each other in the present — dramatic time is paused while characters deliver exposition in the guise of conversation.`,
          suggestedFix: 'Move backstory from retrospective dialogue to present-tense consequence: instead of "I remember when you left me," let the action show what that departure cost. When characters must reference the past, root it in a present emotion — "You left. I never recovered." rather than "I remember when you left."',
        });
      }
    }

    // DIALOGUE_WORD_STUTTER (minor, ≥10 dialogue lines, ≥3 matches): At least 3
    // dialogue lines contain an immediate word repetition — the same word appearing
    // twice in succession ("no no", "please please", "I I can't", "why why"). A
    // single stutter marks genuine emotional overwhelm; a pattern of stutters across
    // multiple lines becomes a verbal tic that the audience discounts. Distinct from
    // NEAR_WORD_REPEAT in rhythm.ts (which checks for the same word in a 5-line
    // window of action prose; this checks for same-word adjacency within a single
    // dialogue line across multiple lines).
    if (dlg333.length >= 10) {
      const stutterRe333 = /\b(\w{2,})\s+\1\b/i;
      const stutterCount333 = dlg333.filter(l => stutterRe333.test(l)).length;
      if (stutterCount333 >= 3) {
        issues.push({
          location: 'Dialogue word repetition',
          rule: 'DIALOGUE_WORD_STUTTER',
          severity: 'minor',
          description: `${stutterCount333} dialogue lines contain immediate word repetition ("no no", "please please", "I I") — a stutter pattern that appears across multiple exchanges. A single stutter marks genuine emotional overwhelm; when the device recurs across ${stutterCount333} lines, it becomes a verbal tic the audience stops registering. The emergency of the stutter is normalised by repetition.`,
          suggestedFix: 'Reserve the stutter for one moment of genuine breakdown. If a character repeats a word once in the script ("no no"), it lands hard; if they do it repeatedly, it becomes their voice pattern and loses impact. Find other ways to signal overwhelm: silence, a subject change, a line that contradicts the previous one.',
        });
      }
    }
  }

  // ── Wave 347: DIALOGUE_DISCOURSE_MARKER_OPENER, DIALOGUE_VOCATIVE_ADDRESS_FLOOD, DIALOGUE_GREETING_FILLER_FLOOD ──
  {
    const dlg347: string[] = [];
    let inDlg347 = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg347 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg347 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg347 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg347) dlg347.push(t);
      else inDlg347 = false;
    }

    // DIALOGUE_DISCOURSE_MARKER_OPENER (minor, ≥10 dialogue lines, >25%): More than
    // 25% of dialogue lines begin with a discourse/attention marker ("Okay,",
    // "Alright,", "Right,", "Anyway,", "Anyhow,"). These are conversational throat-
    // clearings that delay the actual line; sprinkled occasionally they sound natural,
    // but when a quarter of all lines open this way the dialogue acquires a verbal tic
    // and never lands a clean opening beat. Distinct from DIALOGUE_HEDGING_OPENER
    // (epistemic softeners — "Well,", "Look,", "I mean,") and DIALOGUE_CONJUNCTION_
    // OPENER (coordinators — "And", "But", "So"): these are managerial discourse markers.
    if (dlg347.length >= 10) {
      const markerRe347 = /^(okay[,\s]|ok[,\s]|alright[,\s]|all right[,\s]|anyway[,\s]|anyhow[,\s]|right[,\s])/i;
      const markerCount347 = dlg347.filter(l => markerRe347.test(l.trim())).length;
      if (markerCount347 / dlg347.length > 0.25) {
        issues.push({
          location: 'Dialogue discourse-marker openers',
          rule: 'DIALOGUE_DISCOURSE_MARKER_OPENER',
          severity: 'minor',
          description: `${markerCount347} of ${dlg347.length} dialogue lines (${Math.round(markerCount347 / dlg347.length * 100)}%) begin with a discourse marker ("Okay,", "Alright,", "Right,", "Anyway,"). These conversational throat-clearings delay the actual line; an occasional one sounds natural, but when a quarter of all dialogue opens this way the speech acquires a verbal tic and never lands a clean opening beat — every line warms up before it says anything.`,
          suggestedFix: 'Cut most discourse-marker openers and let each line begin on its point. Reserve "Okay," or "Anyway," for the rare moment a character genuinely shifts gears or regroups; as a default opener it adds nothing but throat-clearing.',
        });
      }
    }

    // DIALOGUE_VOCATIVE_ADDRESS_FLOOD (minor, ≥10 dialogue lines, >25%): More than
    // 25% of dialogue lines contain a comma-set-off vocative address term ("honey",
    // "buddy", "sir", "man", "kid"). A vocative now and then grounds a relationship,
    // but pervasive use is a writer's crutch for signalling familiarity or attitude
    // the dialogue should convey on its own — and it bloats lines with words actors
    // rarely need. Distinct from DIALOGUE_NAME_OPENER_FLOOD (proper names at the very
    // start of a line): this catches common-noun address terms anywhere in the line.
    if (dlg347.length >= 10) {
      const vocativeRe347 = /,\s*(honey|babe|baby|sweetheart|sweetie|darling|dear|sir|ma'?am|madam|buddy|pal|dude|bro|man|kid|son|boss|chief|champ|mister|miss)\b[.!?,\s]/i;
      const vocativeEndRe347 = /,\s*(honey|babe|baby|sweetheart|sweetie|darling|dear|sir|ma'?am|madam|buddy|pal|dude|bro|man|kid|son|boss|chief|champ|mister|miss)\s*[.!?]?$/i;
      const vocativeCount347 = dlg347.filter(l => {
        const t = l.trim();
        return vocativeRe347.test(t) || vocativeEndRe347.test(t);
      }).length;
      if (vocativeCount347 / dlg347.length > 0.25) {
        issues.push({
          location: 'Dialogue vocative address',
          rule: 'DIALOGUE_VOCATIVE_ADDRESS_FLOOD',
          severity: 'minor',
          description: `${vocativeCount347} of ${dlg347.length} dialogue lines (${Math.round(vocativeCount347 / dlg347.length * 100)}%) contain a comma-set-off vocative address term ("honey", "buddy", "sir", "man"). An occasional vocative grounds a relationship, but pervasive use is a crutch for signalling familiarity or attitude the dialogue should carry on its own, and it pads lines with words actors rarely need.`,
          suggestedFix: 'Strip most vocatives and let the relationship register through what is said and how. Reserve a "honey" or a "sir" for the moment the term itself carries weight — a sudden tenderness, a pointed formality — rather than sprinkling it as conversational texture.',
        });
      }
    }

    // DIALOGUE_GREETING_FILLER_FLOOD (minor, ≥8 dialogue lines, ≥3 matches): Three or
    // more dialogue lines are greetings or farewells ("Hello", "Hi", "Goodbye", "Good
    // morning", "See you", "Take care"). Social pleasantries are almost always cuttable:
    // scenes should start as late as possible and end as early as possible, skipping the
    // hellos and goodbyes that real life requires but drama does not. A script that keeps
    // staging the small talk wastes its openings and closings. Distinct from DIALOGUE_
    // DISCOURSE_MARKER_OPENER (mid-conversation throat-clearing) and the opener checks.
    if (dlg347.length >= 8) {
      const greetingRe347 = /^(hello\b|hi\b|good morning\b|good evening\b|good afternoon\b|good night\b|goodbye\b|good-bye\b|bye\b|farewell\b|see you\b|see ya\b|take care\b|so long\b|how do you do\b|nice to meet you\b)/i;
      const greetingCount347 = dlg347.filter(l => greetingRe347.test(l.trim())).length;
      if (greetingCount347 >= 3) {
        issues.push({
          location: 'Dialogue greetings and farewells',
          rule: 'DIALOGUE_GREETING_FILLER_FLOOD',
          severity: 'minor',
          description: `${greetingCount347} dialogue lines are greetings or farewells ("Hello", "Goodbye", "Good morning", "See you"). Social pleasantries are almost always cuttable — a scene should begin as late as possible and end as early as possible, skipping the hellos and goodbyes that real life requires but drama does not. Repeatedly staging the small talk wastes the script's openings and closings on words that carry no story.`,
          suggestedFix: 'Cut the greetings and farewells and enter each scene mid-moment, already in motion. If a hello or goodbye must stay, make it do double duty — a greeting that lands as a threat, a farewell that reveals a secret — so the pleasantry carries dramatic freight rather than just marking arrival and departure.',
        });
      }
    }
  }

  // ── Wave 361: DIALOGUE_CONDITIONAL_FLOOD, DIALOGUE_APOLOGY_OVERUSE, DIALOGUE_HESITATION_FLOOD ──
  {
    const dlg361: string[] = [];
    let inDlg361 = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg361 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg361 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg361 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg361) dlg361.push(t);
    }

    // DIALOGUE_CONDITIONAL_FLOOD (minor, ≥10 lines, >30%): More than 30% of
    // dialogue lines begin with a conditional opener ("If ", "Unless ", "Whether ",
    // "Suppose ", "What if ", "Assuming "). Characters who default to hypothetical
    // speech rather than declarative action lack dramatic agency — they negotiate
    // possibility instead of confronting reality. Conditional-heavy dialogue is also
    // hard to play: actors can't commit to a line that hasn't committed to its premise.
    // Distinct from DIALOGUE_HEDGING_OPENER (hedging qualifiers like "I think",
    // "maybe" — not conditional clause openers) and DIALOGUE_INTERROGATIVE_SATURATION
    // (questions, not conditionals).
    if (dlg361.length >= 10) {
      const conditionalRe361 = /^(if\s+|unless\s+|whether\s+|suppose\s+|what\s+if\s+|assuming\s+|provided\s+that\s+|in\s+case\s+)/i;
      const conditionalCount361 = dlg361.filter(l => conditionalRe361.test(l.trim())).length;
      if (conditionalCount361 / dlg361.length > 0.30) {
        issues.push({
          location: 'Dialogue throughout',
          rule: 'DIALOGUE_CONDITIONAL_FLOOD',
          severity: 'minor',
          description: `${conditionalCount361} of ${dlg361.length} dialogue lines (${Math.round(conditionalCount361 / dlg361.length * 100)}%) begin with a conditional opener ("If", "Unless", "What if", "Suppose"). Characters who default to hypothetical speech lack dramatic agency — they negotiate possibility instead of confronting reality. Conditional-heavy dialogue is also hard to play: an actor can't fully commit to a line that hasn't committed to its own premise.`,
          suggestedFix: 'Convert conditional speech into declarative speech: "If you leave, I\'ll be alone" → "Don\'t leave me." Characters should confront rather than speculate. Conditionals can be tools for evasion, threat, or bargaining — use them purposefully rather than as a default register.',
        });
      }
    }

    // DIALOGUE_APOLOGY_OVERUSE (minor, ≥8 lines, ≥3 apology lines): Three or
    // more dialogue lines are apologies ("I'm sorry", "I apologize", "forgive me",
    // "excuse me", "I didn't mean to", "my mistake", "pardon"). Characters who
    // constantly apologize have no dramatic agency — they respond to tension by
    // retreating rather than by asserting, choosing, or confronting. A single
    // apology can carry enormous dramatic weight; three or more signals that the
    // writer is using apology as a default reaction to conflict. Distinct from
    // DIALOGUE_HEDGING_OPENER (qualifying phrases, not full apologies) and
    // DIALOGUE_GREETING_FILLER_FLOOD (greetings/farewells, not apologies).
    if (dlg361.length >= 8) {
      const apologyRe361 = /\b(i'?m\s+sorry\b|i\s+apologize\b|forgive\s+me\b|excuse\s+me\b|pardon\s+(me\b)?|my\s+mistake\b|my\s+apolog(y|ies)\b|i\s+didn'?t\s+mean\s+to\b|i\s+shouldn'?t\s+have\b)/i;
      const apologyCount361 = dlg361.filter(l => apologyRe361.test(l)).length;
      if (apologyCount361 >= 3) {
        issues.push({
          location: 'Dialogue apologies',
          rule: 'DIALOGUE_APOLOGY_OVERUSE',
          severity: 'minor',
          description: `${apologyCount361} dialogue lines are apologies ("I'm sorry", "I apologize", "forgive me", "excuse me"). Characters who constantly apologize have no dramatic agency — they respond to tension by retreating rather than asserting, choosing, or confronting. A single apology can be a devastating dramatic beat; ${apologyCount361} apologies signals a story where characters default to contrition instead of conflict.`,
          suggestedFix: "Reserve apology for its maximum impact: one well-placed 'I'm sorry' that costs a character something. Replace the others with more active responses to conflict — a counter-attack, a deflection, a revelation, or a choice. Apology forecloses drama; active response generates it.",
        });
      }
    }

    // DIALOGUE_HESITATION_FLOOD (minor, ≥10 lines, >25%): More than 25% of
    // dialogue lines contain a hesitation sound or filler word ("um", "uh", "er",
    // "hmm", "ahh"). Written hesitation is a device for characterizing uncertainty
    // or nervousness, but in density it makes every character sound uncertain and
    // the script feel unconfident. Unlike real speech, written dialogue carries only
    // the hesitations the writer deliberately included; when a quarter of all lines
    // stutter, the script hasn't chosen nervousness as a character choice — it has
    // adopted it as a default voice. Distinct from DIALOGUE_DISCOURSE_MARKER_OPENER
    // ("Okay,", "Alright,") and DIALOGUE_HEDGING_OPENER (hedging qualifiers).
    if (dlg361.length >= 10) {
      const hesitationRe361 = /\b(um+|uh+|er+|hmm+|ahh?)\b/i;
      const hesitationCount361 = dlg361.filter(l => hesitationRe361.test(l)).length;
      if (hesitationCount361 / dlg361.length > 0.25) {
        issues.push({
          location: 'Dialogue throughout',
          rule: 'DIALOGUE_HESITATION_FLOOD',
          severity: 'minor',
          description: `${hesitationCount361} of ${dlg361.length} dialogue lines (${Math.round(hesitationCount361 / dlg361.length * 100)}%) contain a hesitation sound ("um", "uh", "er", "hmm"). Written hesitation signals a specific character choice — nervousness, uncertainty, evasion. In density it ceases to be characterization and becomes the script's default voice, making every character sound equivocal and the writing itself tentative.`,
          suggestedFix: "Reserve hesitation sounds for specific characterization: one character who stutters under pressure, one scene where uncertainty is the dramatic point. Remove the others and trust the character's position to speak for itself — a line that says what it means, without hedging, almost always lands harder.",
        });
      }
    }
  }

  // ── Wave 375: DIALOGUE_ELLIPSIS_OPENER_FLOOD, DIALOGUE_TRIADIC_FLOOD, DIALOGUE_EMPHATIC_PUNCTUATION_FLOOD ──
  {
    const dlg375: string[] = [];
    let inDlg375 = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg375 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg375 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg375 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg375) dlg375.push(t);
    }

    // DIALOGUE_ELLIPSIS_OPENER_FLOOD (minor, ≥10 lines, >20%): More than 20% of
    // dialogue lines begin with an ellipsis ("...you knew?"). A line that opens mid-
    // trail signals the speaker is picking up an interrupted or unspoken thought; used
    // occasionally it suggests hesitation or continuation, but when a fifth of all lines
    // open this way every character sounds tentative and adrift, as if no one can begin a
    // thought cleanly. Distinct from DIALOGUE_TRAILING_ELLIPSIS_FLOOD (lines that END with
    // "..." — trailing off) and DIALOGUE_HESITATION_FLOOD (vocalized "um"/"uh" sounds).
    if (dlg375.length >= 10) {
      const ellipsisOpenerRe375 = /^(\.\.\.|…)/;
      const ellipsisCount375 = dlg375.filter(l => ellipsisOpenerRe375.test(l.trim())).length;
      if (ellipsisCount375 / dlg375.length > 0.20) {
        issues.push({
          location: 'Dialogue throughout',
          rule: 'DIALOGUE_ELLIPSIS_OPENER_FLOOD',
          severity: 'minor',
          description: `${ellipsisCount375} of ${dlg375.length} dialogue lines (${Math.round(ellipsisCount375 / dlg375.length * 100)}%) begin with an ellipsis ("...you knew?"). A line that opens mid-trail signals a speaker picking up an interrupted or unspoken thought; an occasional one reads as hesitation, but when a fifth of all lines open this way every character sounds tentative and adrift, as if no one can begin a thought cleanly.`,
          suggestedFix: 'Let most lines begin on a clean first word and reserve the opening ellipsis for the rare beat where a character is genuinely picking up a dropped thread. A character who can start a sentence reads as present and decisive; one who always trails in reads as perpetually unsure.',
        });
      }
    }

    // DIALOGUE_TRIADIC_FLOOD (minor, ≥10 lines, ≥3 lines): Three or more dialogue lines
    // use a "X, Y, and Z" rule-of-three enumeration ("I'm tired, I'm broke, and I'm done."").
    // The triad is a potent rhetorical figure, but recurring across dialogue it becomes a
    // verbal tic that makes every character orate in the same balanced cadence — speech
    // acquires a written, speechy quality rather than the irregularity of how people talk.
    // Distinct from rhythm.ts TRIADIC_LIST_OVERLOAD (which audits ACTION lines): this
    // targets the dialogue channel.
    if (dlg375.length >= 10) {
      const triadRe375 = /[^,]+,\s+[^,]+,?\s+(and|or)\s+\w+/i;
      const triadCount375 = dlg375.filter(l => triadRe375.test(l)).length;
      if (triadCount375 >= 3) {
        issues.push({
          location: 'Dialogue throughout',
          rule: 'DIALOGUE_TRIADIC_FLOOD',
          severity: 'minor',
          description: `${triadCount375} dialogue lines use a "X, Y, and Z" rule-of-three enumeration. The triad is a potent rhetorical figure, but recurring across dialogue it becomes a verbal tic — every character orates in the same balanced three-part cadence, and the speech acquires a written, speechy quality rather than the irregularity of how people actually talk under pressure.`,
          suggestedFix: 'Break up the triads: let characters trail off after one item, pile up four without the tidy "and", or interrupt themselves. Reserve the rule-of-three for the one speech where its rhetorical polish is the point — a toast, a manipulation, a closing argument.',
        });
      }
    }

    // DIALOGUE_EMPHATIC_PUNCTUATION_FLOOD (minor, ≥10 lines, >20%): More than 20% of
    // dialogue lines carry a doubled or mixed emphatic punctuation mark ("!!", "?!", "!?",
    // "?!?"). Stacked marks try to manufacture intensity on the page that the words and
    // performance should carry; when a fifth of lines shout in punctuation, the dialogue
    // reads as hysterical and the marks lose all force through repetition. Distinct from
    // EXCLAMATION_OVERUSE (single "!") and QUESTION_MARK_OVERLOAD (single "?"): this targets
    // stacked/mixed terminal marks specifically.
    if (dlg375.length >= 10) {
      const emphaticRe375 = /[!?][!?]+/;
      const emphaticCount375 = dlg375.filter(l => emphaticRe375.test(l)).length;
      if (emphaticCount375 / dlg375.length > 0.20) {
        issues.push({
          location: 'Dialogue throughout',
          rule: 'DIALOGUE_EMPHATIC_PUNCTUATION_FLOOD',
          severity: 'minor',
          description: `${emphaticCount375} of ${dlg375.length} dialogue lines (${Math.round(emphaticCount375 / dlg375.length * 100)}%) carry a doubled or mixed emphatic mark ("!!", "?!", "!?"). Stacked punctuation tries to manufacture on the page the intensity that the words and the performance should carry; when this many lines shout in punctuation, the dialogue reads as hysterical and the marks lose all force through repetition.`,
          suggestedFix: 'Strip the stacked marks back to single terminal punctuation and let the word choice and context supply the heat. If a line only feels intense with "?!", the line itself is doing too little — sharpen what is said so the emphasis is in the meaning, not the typography.',
        });
      }
    }
  }

  // ── Wave 389: ACTION_EXPLETIVE_OPENER, DIALOGUE_INTERROGATIVE_OPENER_FLOOD, DIALOGUE_COMPARATIVE_FLOOD ──

  // ACTION_EXPLETIVE_OPENER (minor, ≥10 action lines, >25%): More than 25% of action
  // lines begin with an expletive dummy-subject construction ("There is", "There are",
  // "It is", "It was"). These constructions bury the real subject behind a placeholder and
  // a copula, draining the kinetic, agent-first energy screen action depends on — "There is
  // a man at the door" instead of "A man waits at the door." Distinct from ABSTRACT_SUBJECT_
  // OPENING (an abstract NOUN subject), STATIVE_VERB_OVERLOAD (state verbs anywhere), and
  // PASSIVE_ACTION_VOICE (agentless passives): this targets the expletive-opener pattern.
  if (actionOnlyLines.length >= 10) {
    const expletiveRe389 = /^(there\s+(is|are|was|were)\b|there's\b|there're\b|it\s+(is|was)\b|it's\b)/i;
    const expletiveCount389 = actionOnlyLines.filter(l => expletiveRe389.test(l.trim())).length;
    if (expletiveCount389 / actionOnlyLines.length > 0.25) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'ACTION_EXPLETIVE_OPENER',
        severity: 'minor',
        description: `${expletiveCount389} of ${actionOnlyLines.length} action lines (${Math.round(expletiveCount389 / actionOnlyLines.length * 100)}%) begin with an expletive dummy-subject construction ("There is", "It was"). These bury the real subject behind a placeholder and a copula, draining the kinetic, agent-first energy screen action depends on — "There is a man at the door" sits flat where "A man waits at the door" moves.`,
        suggestedFix: 'Recast expletive openers around the real subject and an active verb: "There is a shadow on the wall" → "A shadow stretches across the wall." Leading with the agent and what it does restores the forward, visual drive that "There is / It was" constructions sap.',
      });
    }
  }

  // ── Wave 389: dialogue-side checks ──
  {
    const dlg389: string[] = [];
    let inDlg389 = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg389 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg389 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg389 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg389) dlg389.push(t);
    }

    // DIALOGUE_INTERROGATIVE_OPENER_FLOOD (minor, ≥10 lines, >30%): More than 30% of
    // dialogue lines begin with a wh-question word ("What", "Why", "How", "Where", "When",
    // "Who", "Which"). When most lines open by interrogating, every exchange reads as a
    // cross-examination and the characters pump each other for information rather than
    // asserting, deflecting, or revealing. Distinct from DIALOGUE_INTERROGATIVE_SATURATION
    // (lines that END with "?" — this is opener-based and catches the interrogating cadence
    // even in lines not punctuated as questions) and QUESTION_MARK_OVERLOAD.
    if (dlg389.length >= 10) {
      const whOpenerRe389 = /^(what|why|how|where|when|who|whose|whom|which)\b/i;
      const whCount389 = dlg389.filter(l => whOpenerRe389.test(l.trim())).length;
      if (whCount389 / dlg389.length > 0.30) {
        issues.push({
          location: 'Dialogue throughout',
          rule: 'DIALOGUE_INTERROGATIVE_OPENER_FLOOD',
          severity: 'minor',
          description: `${whCount389} of ${dlg389.length} dialogue lines (${Math.round(whCount389 / dlg389.length * 100)}%) begin with a wh-question word ("What", "Why", "How", "Where"). When most lines open by interrogating, every exchange reads as a cross-examination — characters pump each other for information rather than asserting, deflecting, or revealing, and the scene acquires the rhythm of a deposition.`,
          suggestedFix: 'Convert many questions into statements, accusations, or evasions and let the other character supply what the question was fishing for: "Why did you do it?" can become "You did it on purpose." A scene of relentless questions has no one taking a position — give the characters claims to defend, not just queries to fire.',
        });
      }
    }

    // DIALOGUE_COMPARATIVE_FLOOD (minor, ≥10 lines, >25%): More than 25% of dialogue
    // lines carry a comparative construction ("more X than", "better than", "as X as").
    // Constant comparison locks characters into relative ranking — nothing is simply itself,
    // it is always more or less than something else — which makes the dialogue feel
    // argumentative and evaluative rather than felt. Distinct from DIALOGUE_SUPERLATIVE_FLOOD
    // (best/worst/most absolutes): comparatives rank two things against each other rather
    // than pushing one to an extreme.
    if (dlg389.length >= 10) {
      const comparativeRe389 = /\b(more|less|better|worse|bigger|smaller|stronger|weaker|harder|easier|faster|slower|older|younger|richer|poorer|closer|further|farther|greater|higher|lower|smarter|safer)\s+than\b|\bas\s+\w+\s+as\b/i;
      const comparativeCount389 = dlg389.filter(l => comparativeRe389.test(l)).length;
      if (comparativeCount389 / dlg389.length > 0.25) {
        issues.push({
          location: 'Dialogue throughout',
          rule: 'DIALOGUE_COMPARATIVE_FLOOD',
          severity: 'minor',
          description: `${comparativeCount389} of ${dlg389.length} dialogue lines (${Math.round(comparativeCount389 / dlg389.length * 100)}%) carry a comparative construction ("more X than", "better than", "as X as"). Constant comparison locks characters into relative ranking — nothing is simply itself, it is always measured against something else — which makes the dialogue feel evaluative and argumentative rather than emotionally direct.`,
          suggestedFix: 'Let characters speak in direct, absolute terms where the feeling is the point: "I trust you more than I trusted him" can become "I trust you." Reserve comparison for the beat where weighing two things against each other is the dramatic move; as a default register it keeps the dialogue at arm\'s length.',
        });
      }
    }
  }

  // ── Wave 403: DIALOGUE_PASSIVE_FLOOD, DIALOGUE_IMPERATIVE_FLOOD, ACTION_MOTION_VERB_MONOTONE ──

  // DIALOGUE_PASSIVE_FLOOD (minor, ≥15 dialogue lines, >25%): More than 25% of dialogue
  // lines contain a passive-voice construction ("was told", "were found", "has been done",
  // "got fired"). Passive voice in dialogue removes the agent — characters describe what
  // happened without naming who performed the action, creating an evasive, bureaucratic, or
  // distanced register. A character who says "He was fired" instead of "They fired him" is
  // either hiding who did it or deflecting accountability. Distinct from PASSIVE_ACTION_VOICE
  // (action lines only) and ACTION_EXPLETIVE_OPENER (dummy-subject openers in action):
  // this fires on the passive register of speech itself, not of narration.
  {
    const dlg403a: string[] = [];
    let inDlg403a = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg403a = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg403a = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg403a = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg403a) dlg403a.push(t);
    }
    if (dlg403a.length >= 15) {
      const passiveRe403a = /\b(was|were)\s+\w+ed\b|\bhas\s+been\b|\bhave\s+been\b|\bhad\s+been\b|\bgot\s+\w+ed\b|\bget\s+\w+ed\b/i;
      const passiveCount403a = dlg403a.filter(l => passiveRe403a.test(l)).length;
      if (passiveCount403a / dlg403a.length > 0.25) {
        issues.push({
          location: 'Dialogue throughout',
          rule: 'DIALOGUE_PASSIVE_FLOOD',
          severity: 'minor',
          description: `${passiveCount403a} of ${dlg403a.length} dialogue lines (${Math.round(passiveCount403a / dlg403a.length * 100)}%) use passive constructions ("was told", "were found", "has been done"). Passive voice in dialogue removes the agent — characters describe what happened without naming who did it, producing an evasive or bureaucratic register. "He was fired" conceals who fired him; "It was decided" hides who decided. A script dense with passive dialogue has characters who systematically avoid assigning responsibility.`,
          suggestedFix: 'Convert passive dialogue into active speech that names the agent: "He was told to leave" → "She told him to leave." When a character deliberately omits the agent — to protect someone, to deflect blame — make that evasion itself a dramatic choice, not the default register. Active speech has characters owning, attributing, and confronting action directly.',
        });
      }
    }
  }

  // DIALOGUE_IMPERATIVE_FLOOD (minor, ≥15 dialogue lines, >30%): More than 30% of dialogue
  // lines are imperative commands beginning with a base-form verb directing another character's
  // behavior ("Go.", "Tell me.", "Stop.", "Get out."). Characters who default to commands
  // have no emotional interior that surfaces in dialogue — they only manage others. When
  // imperatives dominate, the script reads as a sequence of orders rather than a collision of
  // needs and desires; characters are behavioral managers, not people. Distinct from
  // DIALOGUE_INTERROGATIVE_SATURATION (question-mark lines), DIALOGUE_CONDITIONAL_FLOOD
  // (if/unless openers), DIALOGUE_CONJUNCTION_OPENER (And/But/So starters), and
  // EXCLAMATION_OVERUSE (punctuation): this targets grammatical mood — the imperative verb form.
  {
    const dlg403b: string[] = [];
    let inDlg403b = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg403b = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg403b = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg403b = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg403b) dlg403b.push(t);
    }
    if (dlg403b.length >= 15) {
      const IMPERATIVE_VERBS403b = new Set([
        'go', 'get', 'come', 'stop', 'tell', 'show', 'give', 'take', 'make', 'let',
        'stay', 'look', 'listen', 'wait', 'run', 'leave', 'help', 'move', 'find', 'keep',
        'hold', 'put', 'sit', 'stand', 'turn', 'watch', 'follow', 'call', 'say', 'speak',
        'walk', 'open', 'close', 'bring', 'forget', 'remember', 'think', 'check', 'read',
        'drink', 'eat', 'sleep', 'wake', 'send', 'write', 'be', 'die', 'live', 'pull',
        'push', 'pick', 'drop', 'grab', 'touch', 'hit', 'kill', 'save', 'ask', 'answer',
        'play', 'use', 'try', 'choose', 'pass', 'drive', 'hide', 'pray', 'trust', 'believe',
        'promise', 'swear', 'calm', 'breathe', 'do', 'start', 'finish', 'end', 'fly', 'jump',
        'climb', 'fight',
      ]);
      const imperativeCount403b = dlg403b.filter(l => {
        const first = l.trim().split(/[\s,!.?]+/)[0]?.toLowerCase();
        return first !== undefined && IMPERATIVE_VERBS403b.has(first);
      }).length;
      if (imperativeCount403b / dlg403b.length > 0.30) {
        issues.push({
          location: 'Dialogue throughout',
          rule: 'DIALOGUE_IMPERATIVE_FLOOD',
          severity: 'minor',
          description: `${imperativeCount403b} of ${dlg403b.length} dialogue lines (${Math.round(imperativeCount403b / dlg403b.length * 100)}%) begin with an imperative command ("Go", "Tell me", "Stop", "Get out"). When commands dominate dialogue, characters default to directing each other's behavior rather than expressing, feeling, or connecting — they manage one another instead of engaging. A script dense with imperative dialogue has characters who are behavioral managers, not people in emotional relation.`,
          suggestedFix: 'Convert some commands into the need that motivates them: "Go now" can become "I can\'t do this with you here." The command tells the other character what to do; the need tells the audience what it costs. Characters who express the desire behind their demands are more revealing than characters who only issue orders.',
        });
      }
    }
  }

  // ACTION_MOTION_VERB_MONOTONE (minor, ≥10 action lines, >50%): More than 50% of action
  // lines use a generic motion or displacement verb as their primary verb ("walks", "moves",
  // "enters", "exits", "turns", "crosses", "heads", "approaches", "reaches", "comes", "goes",
  // "runs", "steps", "leaves", "arrives", "stands", "sits", "rises", "falls"). When motion
  // verbs dominate the action, the script describes choreography — who moved where — rather
  // than what characters are doing in any dramatically meaningful sense. The physical world
  // is reduced to traffic management. Distinct from MONOCHROME_VERBS (a single specific verb
  // repeated, threshold 25%) and ACTION_ADVERB_FLOOD (adverbs modifying weak verbs): this
  // fires when the whole category of generic displacement verbs dominates, revealing
  // verb-level under-description of attitude, intention, and behavior.
  if (actionOnlyLines.length >= 10) {
    const motionVerbRe403c = /\b(walks?|walked|moves?|moved|enters?|entered|exits?|exited|turns?|turned|crosses?|crossed|heads?|headed|approaches?|approached|arrives?|arrived|comes|came|goes|went|runs?|ran|steps?|stepped|leaves|left|reaches?|reached|stands?|stood|sits?|sat|rises?|rose|falls?|fell|climbs?|climbed)\b/i;
    const motionCount403c = actionOnlyLines.filter(l => motionVerbRe403c.test(l)).length;
    if (motionCount403c / actionOnlyLines.length > 0.50) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'ACTION_MOTION_VERB_MONOTONE',
        severity: 'minor',
        description: `${motionCount403c} of ${actionOnlyLines.length} action lines (${Math.round(motionCount403c / actionOnlyLines.length * 100)}%) use a generic motion or displacement verb ("walks", "enters", "moves", "crosses", "turns", "heads"). When displacement verbs dominate the action, the script describes choreography — who moved where — rather than what characters are doing in any dramatically meaningful sense. Action prose reduced to traffic management under-describes the physical world and the psychological stakes behind movement.`,
        suggestedFix: 'Replace generic motion verbs with specific verbs that carry attitude and intent: "walks toward" → "advances", "strides", "creeps"; "enters" → "bursts in", "slips in", "crashes through." Movement is always motivated — the verb should carry that motivation. When a character walks, how and why they walk is the character.',
      });
    }
  }

  // ── Wave 417: ACTION_LINE_LENGTH_UNIFORMITY, DIALOGUE_MONOSYLLABIC_FLOOD, DIALOGUE_NEGATION_FLOOD ──

  // ACTION_LINE_LENGTH_UNIFORMITY (minor, ≥12 action lines, mean ≥6 words, CV < 0.30):
  // The word counts of the action lines cluster so tightly around their mean — coefficient
  // of variation (stddev / mean) below 0.30 — that the prose has a flat, metronomic cadence.
  // Screen action lives on rhythmic contrast: a long descriptive build resolved by a curt
  // two-word punch ("She runs. Glass everywhere. The room empties. Silence."). When every
  // action line is the same length, the prose loses its visual music and reads like a list of
  // equally weighted facts; the eye and ear find no emphasis. The mean ≥6 guard restricts this
  // to substantive prose (a script of pure fragments is a different defect). This is a pure
  // distribution/variance measure over the whole action corpus. Distinct from
  // FRAGMENT_RHYTHM_ABSENCE (Wave 224 — fires on the *absence* of short ≤4-word fragments,
  // i.e. an absolute floor) and DIALOGUE_LENGTH_UNIFORMITY (Wave 308 — dialogue, tight band):
  // this fires on low *relative spread* of action-line lengths regardless of their absolute size,
  // catching prose where every line is, say, a uniform 12 words.
  if (actionOnlyLines.length >= 12) {
    const wordCounts417a = actionOnlyLines.map(l => l.split(/\s+/).filter(Boolean).length);
    const mean417a = wordCounts417a.reduce((s, v) => s + v, 0) / wordCounts417a.length;
    if (mean417a >= 6) {
      const variance417a = wordCounts417a.reduce((s, v) => s + (v - mean417a) ** 2, 0) / wordCounts417a.length;
      const cv417a = Math.sqrt(variance417a) / mean417a;
      if (cv417a < 0.30) {
        issues.push({
          location: 'Action line prose',
          rule: 'ACTION_LINE_LENGTH_UNIFORMITY',
          severity: 'minor',
          description: `Across ${actionOnlyLines.length} action lines, the word counts cluster tightly around a mean of ${mean417a.toFixed(1)} words (coefficient of variation ${cv417a.toFixed(2)}, below the 0.30 rhythm threshold) — every action line is nearly the same length. Screen action lives on rhythmic contrast: a long descriptive build resolved by a curt punch. When all lines are equal length, the prose reads as a flat list of equally weighted facts and the eye finds no emphasis or pace.`,
          suggestedFix: 'Vary action-line length deliberately. Let a long, detailed line set up a moment and a two- or three-word fragment land the beat: "She crosses the dark hall, one hand trailing the wall, breath held against the silence. Then — a sound." Contrast in length creates the staccato-and-legato rhythm that makes action prose cinematic rather than uniform.',
        });
      }
    }
  }

  // DIALOGUE_MONOSYLLABIC_FLOOD (minor, ≥12 dialogue lines, >35% are ≤2 words): More than
  // 35% of dialogue lines are two words or fewer ("Yes." / "No way." / "Why?" / "Stop it.").
  // Dialogue that never develops past terse fragments gives characters no room to reveal
  // interiority, rhetoric, or relation — every exchange is a clipped transaction. A scene of
  // pure monosyllables can be a powerful choice for tension, but as a pervasive default it
  // signals dialogue that withholds the texture of how a character actually thinks and speaks.
  // Underweight/brevity mode on the dialogue channel. Distinct from DIALOGUE_LENGTH_UNIFORMITY
  // (Wave 308 — fires when lines cluster in a tight band at *any* size, including uniformly
  // long): this fires specifically on a brevity floor — a large share of lines being barely
  // verbal — and is the brevity counterpart to the action-side length checks.
  {
    const dlg417b: string[] = [];
    let inDlg417b = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg417b = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg417b = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg417b = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg417b) dlg417b.push(t);
    }
    if (dlg417b.length >= 12) {
      const monoCount417b = dlg417b.filter(l => l.split(/\s+/).filter(Boolean).length <= 2).length;
      if (monoCount417b / dlg417b.length > 0.35) {
        issues.push({
          location: 'Dialogue throughout',
          rule: 'DIALOGUE_MONOSYLLABIC_FLOOD',
          severity: 'minor',
          description: `${monoCount417b} of ${dlg417b.length} dialogue lines (${Math.round(monoCount417b / dlg417b.length * 100)}%) are two words or fewer ("Yes." / "No way." / "Why?"). Dialogue that never develops past terse fragments gives characters no room to reveal interiority, rhetoric, or relation — every exchange becomes a clipped transaction. Sustained monosyllabic speech withholds the texture of how a character actually thinks, deflects, persuades, or breaks down.`,
          suggestedFix: 'Let at least some exchanges breathe past the one-word reflex. A clipped line lands hardest when it interrupts developed speech — reserve "No." for the moment it means something, and elsewhere let characters argue, evade, or confess in full sentences. The contrast between terse and expansive is where dialogue rhythm and character voice emerge.',
        });
      }
    }
  }

  // DIALOGUE_NEGATION_FLOOD (minor, ≥12 dialogue lines, >40% carry a negation): More than
  // 40% of dialogue lines contain a negation construction ("not", "no", "never", "nothing",
  // "nobody", a contracted "-n't", etc.). Characters whose speech is dominated by negation are
  // defined by what they refuse, deny, or lack rather than by what they want, assert, or
  // pursue. A script saturated with denial reads as relentlessly defensive — every line pushes
  // away rather than reaches toward, and the cumulative effect is airless and reactive.
  // Valence mode on the dialogue channel — the only rule that audits the semantic polarity of
  // speech rather than its punctuation (EXCLAMATION_OVERUSE / DIALOGUE_INTERROGATIVE_*),
  // grammatical mood (DIALOGUE_IMPERATIVE_FLOOD), opener token (conjunction / conditional /
  // wh-question openers), or register (DIALOGUE_PASSIVE_FLOOD). A character can negate in any
  // mood — a question, a command, a declaration — so this cuts orthogonally across them all.
  {
    const dlg417c: string[] = [];
    let inDlg417c = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg417c = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg417c = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg417c = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg417c) dlg417c.push(t);
    }
    if (dlg417c.length >= 12) {
      const negationRe417c = /\b(no|not|never|nothing|none|nobody|nowhere|neither|nor)\b|n['']t\b/i;
      const negCount417c = dlg417c.filter(l => negationRe417c.test(l)).length;
      if (negCount417c / dlg417c.length > 0.40) {
        issues.push({
          location: 'Dialogue throughout',
          rule: 'DIALOGUE_NEGATION_FLOOD',
          severity: 'minor',
          description: `${negCount417c} of ${dlg417c.length} dialogue lines (${Math.round(negCount417c / dlg417c.length * 100)}%) are built on negation ("not", "no", "never", "nothing", "can't", "won't"). Characters whose speech is dominated by negation are defined by what they refuse, deny, or lack rather than by what they want or pursue. Relentless denial reads as defensive and reactive — every line pushes away rather than reaches toward, and the scene loses the forward pull of active desire.`,
          suggestedFix: 'Recast some negations as the positive want underneath them: "I don\'t want to be here" carries less than "I want to be anywhere but here," and "It\'s not your fault" lands harder as "You did everything you could." Negation has power as a sharp exception, not as the default grammar of every line. Let characters assert and pursue, so the refusals stand out when they come.',
        });
      }
    }
  }

  // ── Wave 431: DIALOGUE_I_OPENER_RUN, DIALOGUE_LENGTH_OUTLIER, DIALOGUE_HEDGED_QUESTION_FLOOD ──
  // All three share a single ordered collection of dialogue lines (speech lines in
  // script order, parentheticals and cues excluded), built once here.
  {
    const dlg431: string[] = [];
    let inDlg431 = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg431 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg431 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg431 = true; continue; }
      if (/^\(/.test(t)) continue; // parenthetical
      if (inDlg431) dlg431.push(t);
    }

    // DIALOGUE_I_OPENER_RUN (minor, ≥8 dialogue lines, run ≥4): Four or more
    // consecutive dialogue lines each begin with the first-person pronoun "I"
    // ("I want…", "I'm not…", "I'll go…", "I never…"). A sustained run of
    // self-referential openers is the texture of characters talking AT each other
    // rather than WITH each other — each line launches from the speaker's own ego
    // instead of responding to what was just said, so the exchange reads as parallel
    // monologues. The "I" opener is detected with a lookahead so genuine pronoun
    // openers ("I'm") match while words that merely start with the letter i ("It",
    // "Is", "If") do not. Run-based mode — the FIRST run-based check in this pass:
    // distinct from DIALOGUE_REPEATED_OPENER_WORD (Wave 322 — a single word begins
    // >40% of ALL lines, a global rate regardless of adjacency) and
    // DIALOGUE_CONJUNCTION_OPENER (Wave 322 — And/But/So rate). This fires on local
    // CONSECUTIVENESS of "I", which a whole-corpus rate can entirely miss.
    if (dlg431.length >= 8) {
      const iOpenerRe431 = /^i(?=$|[\s,.!?;:'’])/i;
      let curRun431 = 0;
      let maxRun431 = 0;
      let maxRunEnd431 = -1;
      for (let i = 0; i < dlg431.length; i++) {
        if (iOpenerRe431.test(dlg431[i])) {
          curRun431++;
          if (curRun431 > maxRun431) { maxRun431 = curRun431; maxRunEnd431 = i; }
        } else {
          curRun431 = 0;
        }
      }
      if (maxRun431 >= 4) {
        const runStart431 = maxRunEnd431 - maxRun431 + 1;
        issues.push({
          location: 'Dialogue exchange',
          rule: 'DIALOGUE_I_OPENER_RUN',
          severity: 'minor',
          description: `${maxRun431} consecutive dialogue lines each begin with "I" (lines ${runStart431 + 1}–${maxRunEnd431 + 1} of the spoken corpus) — a sustained run of first-person openers. When every line in a stretch launches from the speaker's own ego ("I want…", "I'm not…", "I never…"), characters are talking AT each other rather than responding to one another; the exchange reads as parallel monologues of self-assertion rather than a live conversation.`,
          suggestedFix: 'Break the run by having a line begin with a response to what was just said — the other character\'s name, a "You…", a reaction to their words, or a question that engages their point. Dialogue is a volley: let some lines open by reaching toward the other person instead of restating the self.',
        });
      }
    }

    // DIALOGUE_LENGTH_OUTLIER (minor, ≥12 dialogue lines, max ≥30 words AND ≥4× mean):
    // A single dialogue line towers over every other — at least 30 words long and at
    // least four times the mean line length. One unmotivated monologue dump amid
    // otherwise terse speech reads as the writer breaking character to deliver
    // exposition or a thesis: the rhythm of exchange stops dead while one speaker
    // holds the floor for a paragraph. A long speech can be a deliberate aria, but a
    // lone extreme outlier against an otherwise clipped corpus signals an undigested
    // info-dump rather than an earned set-piece. Single-peak ISOLATION mode — the
    // first such check in this pass. Distinct from DIALOGUE_LENGTH_UNIFORMITY (Wave
    // 308 — fires when lengths cluster in a TIGHT band, the opposite condition) and
    // DIALOGUE_MONOSYLLABIC_FLOOD (Wave 417 — a brevity FLOOR measured as a rate):
    // this isolates the single longest line as an outlier against the distribution.
    if (dlg431.length >= 12) {
      const wc431 = dlg431.map(l => l.split(/\s+/).filter(Boolean).length);
      const mean431 = wc431.reduce((s, v) => s + v, 0) / wc431.length;
      const max431 = Math.max(...wc431);
      if (max431 >= 30 && mean431 > 0 && max431 >= mean431 * 4) {
        issues.push({
          location: 'Dialogue length distribution',
          rule: 'DIALOGUE_LENGTH_OUTLIER',
          severity: 'minor',
          description: `A single dialogue line runs ${max431} words — ${(max431 / mean431).toFixed(1)}× the ${mean431.toFixed(1)}-word mean of the other ${dlg431.length - 1} lines. One monologue towering over otherwise terse speech stops the rhythm of exchange dead: while one speaker holds the floor for a full paragraph, the scene's volley collapses. A lone extreme outlier against a clipped corpus usually signals an undigested exposition or thesis dump rather than an earned aria.`,
          suggestedFix: 'Break the giant speech into a real exchange: let the other character interrupt, react, or push back so the information surfaces through conflict rather than a monologue. If the long speech is a deliberate set-piece, earn it — build the rhythm up toward it and give the surrounding scene room to register its weight, rather than dropping a paragraph into a corpus of one-liners.',
        });
      }
    }

    // DIALOGUE_HEDGED_QUESTION_FLOOD (minor, ≥12 dialogue lines, >20% hedge AND
    // question simultaneously): More than a fifth of dialogue lines are BOTH hedged
    // ("maybe", "perhaps", "I think", "kind of", "sort of", "probably", "I guess")
    // AND end in a question mark — the doubly-tentative line ("Maybe we should… go?",
    // "I think it's the right one?"). Characters who default to the hedged question
    // can neither assert nor commit to asking; every line is qualified twice over,
    // draining the scene of conviction and forward pressure. Co-occurrence mode —
    // it fires on the CONJUNCTION of two tics, each of which has its own single-
    // feature rule (DIALOGUE_HEDGING_OPENER, Wave 266, opener-position hedges;
    // DIALOGUE_INTERROGATIVE_SATURATION, Wave 294, lines ending in "?"). Neither of
    // those rate checks need cross its own threshold for the joint pattern to
    // dominate a scene, so the conjunction is genuinely orthogonal: a line can hedge
    // mid-sentence (missed by the opener check) and a question can be confident
    // (counted, but harmless, by the saturation check) — only their overlap is the
    // specific weakness this rule isolates.
    if (dlg431.length >= 12) {
      const hedgeRe431 = /\b(maybe|perhaps|probably|possibly|i think|i guess|i suppose|kind of|sort of|i mean|or something|i dunno|i don['’]t know)\b/i;
      const hedgedQ431 = dlg431.filter(l => l.trimEnd().endsWith('?') && hedgeRe431.test(l)).length;
      if (hedgedQ431 / dlg431.length > 0.20) {
        issues.push({
          location: 'Dialogue throughout',
          rule: 'DIALOGUE_HEDGED_QUESTION_FLOOD',
          severity: 'minor',
          description: `${hedgedQ431} of ${dlg431.length} dialogue lines (${Math.round(hedgedQ431 / dlg431.length * 100)}%) are both hedged AND phrased as questions ("Maybe we should… go?", "I think it's the right one?"). The doubly-tentative line qualifies itself twice over — it neither asserts nor commits to asking — so characters who default to it can never apply pressure. The cumulative effect is a scene that perpetually defers: no one states, no one demands, every beat dissolves into a softened query.`,
          suggestedFix: 'Pick one register per line and commit to it. Turn a hedged question into a clean assertion ("Maybe we should go?" → "We\'re going.") or a direct question ("Is this the right one?"), reserving the tentative-query form for the rare moment a character is genuinely both unsure and probing. Conviction — even wrong conviction — gives a scene the forward pressure that perpetual hedging drains.',
        });
      }
    }
  }

  // ── Wave 445: DIALOGUE_QUESTION_RUN, ACTION_SCENE_INTRO_HEAVY, DIALOGUE_DECLARATIVE_AFTERMATH_QUESTION ──
  {
    const dlg445: string[] = [];
    let inDlg445 = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg445 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg445 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg445 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg445) dlg445.push(t);
    }

    // DIALOGUE_QUESTION_RUN (run-based, ≥10 dialogue lines, maxRun≥4): Four or more consecutive
    // dialogue lines each end with "?" — nobody in the exchange answers anything across the run.
    // Questions beget questions without resolution, assertion, or commitment, draining the scene
    // of forward direction. A run of 4+ consecutive question-ending lines is a local accumulation
    // pattern that a global proportion check can entirely miss.
    // Distinctness: DIALOGUE_INTERROGATIVE_SATURATION (Wave 294) fires when >30% of ALL lines
    // end with "?" — a global rate. DIALOGUE_HEDGED_QUESTION_FLOOD (Wave 431) is a co-occurrence
    // mode (hedge + question simultaneously). DIALOGUE_I_OPENER_RUN (Wave 431) is run-based but
    // on "I" openers, not "?"-closers. This is the FIRST run-based check on the question-mark
    // channel: a global rate of 29% would miss 4 consecutive questions at the start of a scene.
    if (dlg445.length >= 10) {
      let curQ445a = 0, maxQ445a = 0;
      for (const line of dlg445) {
        if (line.trimEnd().endsWith('?')) {
          if (++curQ445a > maxQ445a) maxQ445a = curQ445a;
        } else {
          curQ445a = 0;
        }
      }
      if (maxQ445a >= 4) {
        issues.push({
          location: 'Dialogue exchange',
          rule: 'DIALOGUE_QUESTION_RUN',
          severity: 'minor',
          description: `${maxQ445a} consecutive dialogue lines each end with a question mark — nobody answers anything across the run. When questions beget questions in an unbroken chain, the scene never moves forward: each line defers dramatic pressure back to the other speaker, creating a conversational loop with no resolution, assertion, or commitment. The exchange reads as mutual interrogation rather than dramatic encounter.`,
          suggestedFix: `Break the question chain by having at least one line assert, state, or commit rather than ask. The strongest dramatic move after a question is often a statement — not necessarily an answer, but an unexpected declaration that reframes the inquiry. Even "I don't care" or "That's not what matters" advances the scene more than another question.`,
        });
      }
    }

    // ACTION_SCENE_INTRO_HEAVY (average/aggregate × positional, ≥6 qualifying scenes, avgIntro >10w,
    // avgIntro > avgBody × 2.0): The first action line in each scene (when it precedes any dialogue)
    // averages ≥2× the word count of all subsequent action lines in those same scenes. Scene
    // introductions are systematically over-verbose: the establishing description is bloated relative
    // to the scene's ongoing prose. A well-paced screenplay enters scenes already in motion and trusts
    // the drama to fill the space. When scene openings are consistently heavier than the rest, the
    // writer front-loads each scene with an exhaustive establishing shot rather than a lean entry.
    // Distinctness: No existing check compares word count of the FIRST action line per scene to
    // the REST of that scene's action lines. All existing length checks audit the GLOBAL action-line
    // corpus without distinguishing line position within the scene. This is the first positional/
    // average check in voice.ts: comparing the establishing vs. body action lines.
    {
      const siIntros445: number[] = [];
      const siBodys445: number[] = [];
      let siInScene445 = false;
      let siFirstActSeen445 = false;
      let siDlgBeforeAct445 = false;
      let siInDlg445 = false;
      for (const line of allLines) {
        const t = line.trim();
        if (!t) { siInDlg445 = false; continue; }
        if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) {
          siInScene445 = true;
          siFirstActSeen445 = false;
          siDlgBeforeAct445 = false;
          siInDlg445 = false;
          continue;
        }
        if (!siInScene445) continue;
        if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) {
          siInDlg445 = true;
          if (!siFirstActSeen445) siDlgBeforeAct445 = true;
          continue;
        }
        if (/^\(/.test(t)) continue;
        if (siInDlg445) continue;
        // Action line
        const wc445 = t.split(/\s+/).filter(Boolean).length;
        if (!siFirstActSeen445 && !siDlgBeforeAct445) {
          siIntros445.push(wc445);
          siFirstActSeen445 = true;
        } else {
          siBodys445.push(wc445);
          if (!siFirstActSeen445) siFirstActSeen445 = true;
        }
      }
      const qualCount445 = Math.min(siIntros445.length, siIntros445.length); // = siIntros445.length
      if (qualCount445 >= 6 && siBodys445.length >= 6) {
        const avgIntro445 = siIntros445.reduce((s, v) => s + v, 0) / siIntros445.length;
        const avgBody445 = siBodys445.reduce((s, v) => s + v, 0) / siBodys445.length;
        if (avgIntro445 > 10 && avgBody445 > 0 && avgIntro445 > avgBody445 * 2.0) {
          issues.push({
            location: `Scene-opening action lines (${qualCount445} scenes checked)`,
            rule: 'ACTION_SCENE_INTRO_HEAVY',
            severity: 'minor',
            description: `Across ${qualCount445} scenes, the first action line averages ${avgIntro445.toFixed(1)} words — ${(avgIntro445 / avgBody445).toFixed(1)}× the ${avgBody445.toFixed(1)}-word average of subsequent action lines in those scenes. Scene introductions are systematically heavier than the rest of the prose. A well-paced screenplay enters scenes in motion: the establishing description should be lean, trusting the drama to fill the space. When every scene-opening line is a verbose inventory, the script habitually front-loads with an exhaustive interior shot rather than an efficient point-of-entry.`,
            suggestedFix: 'Trim the opening action line of each scene to its single most important visual detail. Cut to the establishing fact and let the scene begin — the audience infers the rest of the room from what is dramatic rather than what is listed. Reserve long establishing description for the story\'s opening scene; for subsequent scenes, enter mid-motion.',
          });
        }
      }
    }

    // DIALOGUE_DECLARATIVE_AFTERMATH_QUESTION (sequence/aftermath, ≥10 dialogue lines, ≥3 qualifying
    // declarative lines): Every declarative dialogue line (not ending in "?" or "!") that is not the
    // last dialogue line is immediately followed by a question-ending line. When every statement
    // automatically triggers an interrogation, dialogue collapses into an interrogation loop: nothing
    // a character asserts is allowed to land — it is always met with another question rather than a
    // response that advances the scene or accepts the assertion.
    // Distinctness: DIALOGUE_QUESTION_RUN (this wave) fires when ≥4 CONSECUTIVE question-ending lines
    // cluster locally. DIALOGUE_DECLARATIVE_AFTERMATH_QUESTION is orthogonal: it can fire with only
    // alternating declarative/question pairs (maxRun=1, never triggering QUESTION_RUN), as long as
    // EVERY declarative is followed by a question. No existing check tracks what follows a statement;
    // this is the first aftermath check that pivots on the declarative line rather than the question.
    if (dlg445.length >= 10) {
      const qualDecl445c: number[] = [];
      for (let i = 0; i < dlg445.length - 1; i++) {
        const t = dlg445[i].trimEnd();
        if (!t.endsWith('?') && !t.endsWith('!')) qualDecl445c.push(i);
      }
      if (qualDecl445c.length >= 3 && qualDecl445c.every(qi => dlg445[qi + 1].trimEnd().endsWith('?'))) {
        issues.push({
          location: `Dialogue — declarative aftermath (${qualDecl445c.length} statements, each immediately followed by a question)`,
          rule: 'DIALOGUE_DECLARATIVE_AFTERMATH_QUESTION',
          severity: 'minor',
          description: `Every declarative dialogue line (${qualDecl445c.length} lines not ending in "?" or "!") is immediately followed by a question — no statement is ever allowed to land without triggering an interrogation. When every assertion is met with a question rather than a response that engages, accepts, or redirects it, dialogue becomes a loop: the script converts every moment of commitment into another round of inquiry, draining the cumulative forward pressure that declarations build.`,
          suggestedFix: `Let some declarations be met with responses that engage rather than interrogate: an agreement, a counter-statement, a silence-then-action. Not every assertion needs to provoke a question; some of the most dramatically charged moments occur when a character's statement is simply received — acknowledged, deflected, or ignored — rather than immediately questioned. Reserve the declarative-triggers-question pattern for interrogation scenes where the power dynamic demands it.`,
        });
      }
    }
  }

  // ── Wave 459: DIALOGUE_ASSERTION_RUN, DIALOGUE_SINGLE_CHAR_DOMINATION, DIALOGUE_MONOLOGUE_UNPROMPTED ──
  {
    const dlg459: string[] = [];
    let inDlg459 = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg459 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg459 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg459 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg459) dlg459.push(t);
    }

    // DIALOGUE_ASSERTION_RUN — Run-based × declarative dialogue (≥10 total dialogue lines,
    // max run of ≥5 consecutive lines each ending without "?" or "!"). A sustained stretch where
    // nobody questions, exclaims, or challenges anything — the conversation becomes a monotone
    // assertion avalanche with no interrogation and no intensity. While individual declarative
    // lines are the backbone of dialogue, five or more in unbroken succession signal that the
    // exchange has collapsed into a single-register flow: all statement, no probe.
    // Distinct from DIALOGUE_QUESTION_RUN (Wave 445: run of ≥4 consecutive questions — the
    // interrogative-polarity mirror; this checks declarative-polarity runs), DIALOGUE_INTERROGATIVE_
    // SATURATION (Wave 294: global proportion >30% ending in '?' — this measures a local run of
    // declarations, not global question density), and DIALOGUE_DECLARATIVE_AFTERMATH_QUESTION
    // (Wave 445: aftermath pattern — every declaration followed by a question; this fires when
    // declarations run WITHOUT questions following them).
    if (dlg459.length >= 10) {
      let maxAssertRun459a = 0, curAssertRun459a = 0;
      let maxAssertStart459a = -1, curAssertStart459a = -1;
      for (let i = 0; i < dlg459.length; i++) {
        const t = dlg459[i].trimEnd();
        if (!t.endsWith('?') && !t.endsWith('!')) {
          if (curAssertRun459a === 0) curAssertStart459a = i;
          if (++curAssertRun459a > maxAssertRun459a) {
            maxAssertRun459a = curAssertRun459a;
            maxAssertStart459a = curAssertStart459a;
          }
        } else { curAssertRun459a = 0; }
      }
      if (maxAssertRun459a >= 5) {
        issues.push({
          location: `Dialogue lines ${maxAssertStart459a + 1}–${maxAssertStart459a + maxAssertRun459a} — assertion run (${maxAssertRun459a} consecutive declarative lines)`,
          rule: 'DIALOGUE_ASSERTION_RUN',
          severity: 'minor',
          description: `${maxAssertRun459a} consecutive dialogue lines each end declaratively — no question, no exclamation — creating a sustained assertion avalanche where nobody probes, nobody challenges, and nobody expresses intensity. While declarative dialogue is the backbone of conversation, a run of ${maxAssertRun459a} statements without any interrogation or charged speech signals that the exchange has collapsed into a single emotional register: all assertion, no inquiry. Real conversation — even in conflict — involves the occasional question (however rhetorical) that breaks the monotony of uninterrupted statement and invites the audience to shift their reading from "listening to claims" to "wondering what comes next."`,
          suggestedFix: `Break the declaration run near dialogue line ${maxAssertStart459a + 1} by inserting at least one line that ends in "?" or "!" within the stretch of ${maxAssertRun459a} statements. Even a rhetorical question ("And you think that matters?") or a charged exclamation changes the register enough to prevent the exchange from feeling like a debate transcript. The variation of end-punctuation creates rhythmic micro-contrast in how the audience reads each line.`,
        });
      }
    }

    // DIALOGUE_SINGLE_CHAR_DOMINATION — Underweight/bloat × dialogue character distribution (≥3
    // speaking characters, ≥10 total dialogue lines, dominant speaker has >70% of all lines). One
    // character monopolizes the conversation while the others serve as mere audience — essentially
    // delivering a solo performance in multi-character scenes. A story that uses 3+ speaking
    // characters but routes 70%+ of all dialogue through one of them suggests that the other
    // characters exist primarily as reactive props rather than as independent voices with their
    // own dramatic weight.
    // Distinct from UNDIFFERENTIATED_CHARACTER_VOICES (Wave 138: characters sound alike stylistically
    // — similarity of vocabulary; this checks quantity of lines, not voice distinctiveness), and from
    // CHARACTER_NAME_MONOTONY_IN_ACTION (Wave 294: one name in >50% of action lines — action staging,
    // not dialogue quantity).
    {
      const charLineCounts459b = new Map<string, number>();
      let curChar459b: string | null = null;
      for (const line of allLines) {
        const t = line.trim();
        if (!t) { curChar459b = null; continue; }
        if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { curChar459b = null; continue; }
        if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) {
          curChar459b = t.replace(/\s*\(.*\)$/, '').trim();
          continue;
        }
        if (/^\(/.test(t)) continue;
        if (curChar459b) {
          charLineCounts459b.set(curChar459b, (charLineCounts459b.get(curChar459b) ?? 0) + 1);
        }
      }
      const totalDlgLines459b = [...charLineCounts459b.values()].reduce((s, v) => s + v, 0);
      if (charLineCounts459b.size >= 3 && totalDlgLines459b >= 10) {
        const dominantEntry459b = [...charLineCounts459b.entries()].sort((a, b) => b[1] - a[1])[0];
        if (dominantEntry459b && dominantEntry459b[1] / totalDlgLines459b > 0.70) {
          const pct459b = (dominantEntry459b[1] / totalDlgLines459b * 100).toFixed(0);
          issues.push({
            location: `${dominantEntry459b[0]} — ${pct459b}% of all dialogue (${dominantEntry459b[1]}/${totalDlgLines459b} lines across ${charLineCounts459b.size} speakers)`,
            rule: 'DIALOGUE_SINGLE_CHAR_DOMINATION',
            severity: 'minor',
            description: `${dominantEntry459b[0]} delivers ${dominantEntry459b[1]} of ${totalDlgLines459b} total dialogue lines (${pct459b}%) — more than 70% of all speech across ${charLineCounts459b.size} speaking characters. The other characters function primarily as reactive props rather than as independent voices. A story with ${charLineCounts459b.size} speaking characters but with 70%+ of dialogue concentrated in one suggests a fundamentally solo performance: the other characters exist to give ${dominantEntry459b[0]} reasons to speak rather than having their own dramatic weight, goals, or verbal personality.`,
            suggestedFix: `Redistribute dialogue across the ${charLineCounts459b.size} speaking characters: give each supporting character at least one scene where they drive the exchange rather than responding. A character who only reacts never develops an independent voice — and the audience never learns to read them as a distinct personality. Even two or three additional lines per character, placed at key moments, can shift a reactive role into a participant.`,
          });
        }
      }
    }

    // DIALOGUE_MONOLOGUE_UNPROMPTED — Backward-cause × long speech (≥8 total dialogue lines,
    // ≥3 long speeches ≥10 words, none preceded within 2 dialogue lines by a question). Every
    // extended declaration arrives without any prior inquiry to provoke it — the characters expand
    // spontaneously without being asked. A long speech is dramatically stronger when it is prompted:
    // a question that forces the answer, a challenge that demands a response, an accusation that
    // must be refuted. When every long speech arrives causeless (no prior question), the characters
    // appear to be delivering pre-planned arguments rather than responding to each other in the
    // moment. Backward-cause mode × long speech length. First backward-cause check in this pass.
    // Distinct from DIALOGUE_LENGTH_OUTLIER (Wave 431: single-peak × word count — one towering
    // monologue; this checks ALL long speeches for their upstream cause, not just the peak),
    // DIALOGUE_QUESTION_RUN (run-based × question channel — a different trigger), and DIALOGUE_
    // DECLARATIVE_AFTERMATH_QUESTION (Wave 445: sequence/aftermath — what follows declarations;
    // this is backward-cause checking what PRECEDES long speeches).
    if (dlg459.length >= 8) {
      const longSpeeches459c = dlg459
        .map((t, i) => ({ t, i, wc: t.split(/\s+/).filter(Boolean).length }))
        .filter(x => x.wc >= 10);
      if (longSpeeches459c.length >= 3) {
        const anyPrecededByQuestion459c = longSpeeches459c.some(({ i }) => {
          for (let off = 1; off <= 2; off++) {
            const prevIdx = i - off;
            if (prevIdx >= 0 && dlg459[prevIdx].trimEnd().endsWith('?')) return true;
          }
          return false;
        });
        if (!anyPrecededByQuestion459c) {
          issues.push({
            location: `${longSpeeches459c.length} long speech(es) ≥10 words — no prior question found within 2 lines`,
            rule: 'DIALOGUE_MONOLOGUE_UNPROMPTED',
            severity: 'minor',
            description: `None of the script's ${longSpeeches459c.length} long dialogue speeches (≥10 words) is preceded within the prior 2 dialogue lines by a question — every extended declaration arrives spontaneously, without inquiry to provoke it. Long speeches are dramatically strongest when they are caused: a question that demands an answer, a challenge that forces a response, an accusation that requires refutation. When every extended statement arrives without prior prompting, the characters appear to be delivering pre-planned arguments rather than responding to each other in the moment — the dialogue becomes a series of parallel monologues rather than an exchange. Even a rhetorical question ("So what was I supposed to do?") functions as a cause that makes the following expansion feel earned.`,
            suggestedFix: `Before at least one long speech, add a question that provokes it: the preceding character's line can be a challenge, an open question, or even a demand for justification. The question-then-long-response pattern is the most natural dialogue unit for exposition, argument, and revelation — the question gives the audience permission to receive a longer speech because it signals that the speaker was asked, not that they chose to lecture. Even a one-word prompt ("Why?") preceding a multi-sentence response changes the register from monologue to dialogue.`,
          });
        }
      }
    }
  }

  const { revised, usedLLM } = await rewritePass({ fountain, issues, passName: 'voice', approvedSpans, storyContext: input.storyContext, priorPassResults: input.priorPassResults });
  const changed = revised !== fountain;

  return {
    pass: 'voice',
    issues,
    revisedFountain: revised,
    changed,
    summary: issues.length === 0
      ? 'Voice/tone pass: consistent voice throughout'
      : `Voice/tone pass: ${issues.length} issue(s) — ${usedLLM ? 'rewritten' : 'flagged (stub mode)'}`,
  };
}
