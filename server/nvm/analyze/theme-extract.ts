// Theme-extraction signal — infers candidate theme material from screenplay text.
// Deterministic, no LLM.
//
// Per-scene analysis extracts abstract, valence-charged, recurring concepts that
// serve as candidate theme material. The engine's theme pass fires 0 on all
// produced scripts because it checks resonance against a DECLARED theme, and
// imported scripts have none — this module infers candidates so the dormant
// pass has something to check. DIAGNOSTIC ONLY — surfaced to seed theme picker,
// not fed into health scalar yet.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// word → [valence ∈ [-1,1], arousal ∈ [0,1]]
type Affect = readonly [number, number];
const LEXICON: Record<string, Affect> = JSON.parse(
  readFileSync(fileURLToPath(new URL('./data/emotional-arc-lexicon.json', import.meta.url)), 'utf8'),
);

// Compact inline stopword set — common words that clutter frequency counts
// but carry minimal thematic weight.
const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'her', 'his', 'if', 'in', 'is', 'it', 'its', 'just',
  'me', 'my', 'no', 'not', 'of', 'or', 'she', 'that', 'the', 'to',
  'was', 'we', 'what', 'when', 'where', 'which', 'who', 'why', 'will',
  'with', 'you', 'your', 'but', 'can', 'do', 'does', 'did', 'get',
  'got', 'had', 'have', 'him', 'them', 'this', 'those', 'very', 'all',
  'each', 'every', 'both', 'some', 'any', 'most', 'more', 'other',
  'such', 'no', 'nor', 'only', 'same', 'so', 'than', 'too', 'up',
  'down', 'out', 'there', 'here', 'now', 'then', 'back', 'off', 'away',
  'also', 'well', 'good', 'bad', 'ok', 'yes', 'right', 'left', 'being',
]);

export interface ThemeExtract {
  themeKeywords: string[];           // ranked, top ~8 salient theme concepts
  motifWords: string[];              // recurring words across multiple scenes
  confidence: number;                // 0..1 extraction strength
  scored: boolean;                   // false if input too small to analyze
}

const tokenize = (s: string): string[] => s.toLowerCase().match(/[a-z][a-z']+/g) ?? [];

/**
 * Compute per-word frequency × spread (cross-scene presence).
 * Recurring motifs are stronger theme candidates than one-off words.
 * Returns { word, frequency, spread, valence, intensity }.
 */
function analyzeWordMetrics(wordToScenes: Map<string, Set<number>>): Array<{
  word: string;
  frequency: number;
  spread: number;
  valence: number;
  intensity: number;
}> {
  const metrics = [];
  for (const [word, sceneSet] of wordToScenes.entries()) {
    const frequency = sceneSet.size;
    const affect = LEXICON[word];
    const valence = affect ? affect[0] : 0;
    const intensity = Math.abs(valence);
    // spread: how concentrated vs dispersed across scenes (0..1)
    const spread = Math.min(1, frequency / 3);
    metrics.push({ word, frequency, spread, valence, intensity });
  }
  return metrics;
}

/**
 * Rank words by a composite score:
 * recurrence (frequency × spread) dominates; intensity (|valence|) is a tiebreaker.
 * Recurring motifs across multiple scenes rank highest.
 */
function scoreThemeSalience(metrics: Array<{
  word: string;
  frequency: number;
  spread: number;
  valence: number;
  intensity: number;
}>): Array<{ word: string; score: number }> {
  return metrics.map(m => ({
    word: m.word,
    // Recurrence (frequency × spread) dominates, intensity breaks ties
    score: m.frequency * m.spread * 10 + m.intensity,
  })).sort((a, b) => b.score - a.score);
}

export const THEME_EXTRACT_MIN_SCENES = 2;

/**
 * Extract candidate theme material from a Fountain screenplay.
 * Pure + deterministic.
 */
export function extractTheme(fountain: string): ThemeExtract {
  const scenes = scenesFromFountain(fountain);
  const n = scenes.length;

  // Abstain on tiny input
  if (n < THEME_EXTRACT_MIN_SCENES) {
    return {
      themeKeywords: [],
      motifWords: [],
      confidence: 0,
      scored: false,
    };
  }

  // Collect word → scene set mapping across all scenes
  const wordToScenes = new Map<string, Set<number>>();
  for (let i = 0; i < scenes.length; i++) {
    const tokens = tokenize(scenes[i]);
    const seenInThisScene = new Set<string>();
    for (const token of tokens) {
      if (!STOPWORDS.has(token)) {
        seenInThisScene.add(token);
      }
    }
    for (const word of seenInThisScene) {
      if (!wordToScenes.has(word)) {
        wordToScenes.set(word, new Set());
      }
      wordToScenes.get(word)!.add(i);
    }
  }

  // Compute metrics: frequency, spread, valence intensity
  const metrics = analyzeWordMetrics(wordToScenes);

  // Filter: only words with meaningful lexicon presence (theme words are charged)
  // and multi-scene recurrence
  const charged = metrics.filter(m => {
    // Theme words are recurring abstract concepts — they need NOT be affect
    // words (family/sacrifice/freedom carry no strong VADER valence). Drive on
    // recurrence; affect intensity is only a ranking bonus below.
    return m.spread > 0.2 || m.frequency >= 2;
  });

  if (charged.length === 0) {
    return {
      themeKeywords: [],
      motifWords: [],
      confidence: 0,
      scored: true, // we did analyze, just found nothing charged
    };
  }

  // Score and rank by theme salience
  const ranked = scoreThemeSalience(charged);

  // Top 8 as themeKeywords (or all if fewer)
  const themeKeywords = ranked.slice(0, 8).map(r => r.word);

  // Motif words: recurring across at least 2 scenes
  const motifWords = metrics
    .filter(m => m.spread > 0.2 && !STOPWORDS.has(m.word))
    .map(m => m.word);

  // Confidence: ratio of charged words to total unique non-stopwords
  const totalUnique = wordToScenes.size;
  const confidence = totalUnique > 0 ? Math.min(1, charged.length / totalUnique) : 0;

  return {
    themeKeywords,
    motifWords,
    confidence,
    scored: true,
  };
}

/** Split raw Fountain into ordered scene texts (INT./EXT. boundaries). */
export function scenesFromFountain(fountain: string): string[] {
  const parts = fountain.split(/^(?=(?:INT|EXT)\.)/mi);
  return parts.filter(p => /^(?:INT|EXT)\./i.test(p));
}
