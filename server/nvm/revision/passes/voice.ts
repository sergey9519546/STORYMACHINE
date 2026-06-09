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
