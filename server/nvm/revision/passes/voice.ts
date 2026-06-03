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
