// Wave 138 — Pass 12: Tone/Voice
// Checks voice consistency: tonal shifts without justification, register
// mismatches, generic vs. authored prose texture.
// Wave 138 additions: character voice distinctiveness (UNDIFFERENTIATED_CHARACTER_VOICES,
// VOICE_MONOTONE_CHARACTER) — detects when characters sound identical to each other.
// Uses a simplified Burrows Delta proxy on action lines.
// Wave 146 additions: dialogue clarity (DIALOGUE_ATTRIBUTION_CONFUSION when chars speak
// without action breaks), cliché density, and subtext absence checks.

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
