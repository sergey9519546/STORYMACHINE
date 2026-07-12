// Scene-economy signal — ROADMAP R-wave task #101. Deterministic, no LLM.
//
// Scores how much each scene EARNS its length: how much new information it
// delivers per unit of length. A scene that burns many words while
// introducing few new proper nouns / content words is "bloated" — length
// without payoff. A scene that introduces a lot of new material relative to
// its word count is "efficient".
//
// New-information proxy (per scene, in reading order):
//   - proper nouns: capitalized word tokens (not at the very start of a
//     sentence, to avoid counting ordinary sentence-initial capitals) seen
//     for the FIRST time anywhere in the script.
//   - distinct content words (non-stopword, lowercased) seen for the FIRST
//     time anywhere in the script.
// Both proxies share one running "seen" set per category across the whole
// script (order = scene order), so only a token's FIRST occurrence in the
// document counts as "new" — repeating an established name/word later earns
// nothing, by design (that's the bloat the rule is meant to catch).
//
// economy = newInfo / max(words, 1), i.e. new terms delivered per word of
// scene length. Reported economy is normalized against ECONOMY_NORMALIZER so
// a "typical good" scene lands near 1.0; the raw ratio is small (most words
// in any scene are not first-occurrence content).
//
// bloatedScenes = scenes at/above BLOAT_MIN_WORDS whose normalized economy
// is at/below BLOAT_ECONOMY_THRESHOLD — i.e. long AND low-yield. Short
// scenes never qualify as bloated (a two-line scene has nowhere to hide low
// economy; length is the offending variable, not the ratio alone).
//
// strength ∈ [0,1] rewards a high median economy across scored scenes.

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'her', 'his', 'if', 'in', 'is', 'it', 'its', 'just',
  'me', 'my', 'no', 'not', 'of', 'or', 'she', 'that', 'the', 'to',
  'was', 'we', 'what', 'when', 'where', 'which', 'who', 'why', 'will',
  'with', 'you', 'your', 'but', 'can', 'do', 'does', 'did', 'get',
  'got', 'had', 'have', 'him', 'them', 'this', 'those', 'very', 'all',
  'each', 'every', 'both', 'some', 'any', 'most', 'more', 'other',
  'such', 'nor', 'only', 'same', 'so', 'than', 'too', 'up', 'down',
  'out', 'there', 'here', 'now', 'then', 'back', 'off', 'away', 'also',
  'well', 'good', 'bad', 'ok', 'yes', 'right', 'left', 'being', 'i',
  'say', 'says', 'said', 'like', 'know', 'think', 'see', 'come', 'go',
  'int', 'ext', 'day', 'night', 'cut', 'fade', 'continuous',
]);

export interface SceneEconomy {
  sceneIndex: number;
  words: number;
  newInfo: number;
  economy: number; // normalized, unbounded above but typically in [0, ~2]
}

export interface SceneEconomyResult {
  scenes: SceneEconomy[];
  medianEconomy: number;
  bloatedScenes: number[];
  strength: number;
  scored: boolean;
}

export const SCENE_ECONOMY_MIN_SCENES = 6;

// Long enough that low economy is a real cost, not sampling noise on a
// two-line beat.
export const BLOAT_MIN_WORDS = 80;

// Normalized-economy floor below which a long scene counts as bloated.
export const BLOAT_ECONOMY_THRESHOLD = 0.35;

// Raw newInfo/words ratio that maps to normalized economy = 1.0. Chosen so a
// scene introducing roughly 1 new term per ~7 words (a healthy, information-
// dense scene) lands at the "1.0 = solid" mark; very info-dense scenes score
// above 1.
const ECONOMY_NORMALIZER = 1 / 7;

// Target median economy for strength = 1 (a script whose typical scene is
// solidly information-dense).
const STRENGTH_TARGET_MEDIAN = 0.6;

const tokenize = (s: string): string[] => s.toLowerCase().match(/[a-z][a-z']+/g) ?? [];

/** Raw (case-preserved) word tokens, for proper-noun detection. */
const rawTokenize = (s: string): string[] => s.match(/[A-Za-z][A-Za-z']*/g) ?? [];

/**
 * Proper-noun proxy: capitalized tokens that are NOT the first word of their
 * line (sentence-initial capitals are ambiguous — could be any word) and are
 * not all-caps character cues/sluglines (those are markup, not names being
 * introduced as content).
 */
function properNounsInScene(scene: string): string[] {
  const out: string[] = [];
  const lines = scene.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Skip slugline / transition markup lines entirely.
    if (/^(?:INT|EXT|FADE|CUT TO|TRANSITION)/i.test(trimmed)) continue;
    const words = rawTokenize(trimmed);
    for (let i = 1; i < words.length; i++) {
      const w = words[i];
      if (w.length < 2) continue;
      if (/^[A-Z][a-z']+$/.test(w)) out.push(w.toLowerCase());
    }
  }
  return out;
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** Split raw Fountain into ordered scene texts (INT./EXT. boundaries). */
export function scenesFromFountain(fountain: string): string[] {
  const parts = fountain.split(/^(?=(?:INT|EXT)\.)/mi);
  return parts.filter(p => /^(?:INT|EXT)\./i.test(p));
}

/**
 * Compute scene-economy from ordered scene texts. Pure + deterministic.
 * Guards: empty/no-heading input yields no scenes (delegated to caller via
 * scenesFromFountain); this function itself guards on scene count < min.
 */
export function computeSceneEconomy(sceneTexts: readonly string[]): SceneEconomyResult {
  const n = sceneTexts.length;
  if (n < SCENE_ECONOMY_MIN_SCENES) {
    return { scenes: [], medianEconomy: 0, bloatedScenes: [], strength: 0, scored: false };
  }

  const seenWords = new Set<string>();
  const seenProperNouns = new Set<string>();
  const scenes: SceneEconomy[] = [];

  for (let i = 0; i < n; i++) {
    const scene = sceneTexts[i] ?? '';
    const words = tokenize(scene);
    const wordCount = words.length;

    let newInfo = 0;
    for (const w of words) {
      if (STOPWORDS.has(w)) continue;
      if (!seenWords.has(w)) {
        seenWords.add(w);
        newInfo++;
      }
    }
    for (const pn of properNounsInScene(scene)) {
      if (!seenProperNouns.has(pn)) {
        seenProperNouns.add(pn);
        newInfo++;
      }
    }

    const rawEconomy = newInfo / Math.max(wordCount, 1);
    const economy = rawEconomy / ECONOMY_NORMALIZER;

    scenes.push({ sceneIndex: i, words: wordCount, newInfo, economy });
  }

  const medianEconomy = median(scenes.map(s => s.economy));

  const bloatedScenes = scenes
    .filter(s => s.words >= BLOAT_MIN_WORDS && s.economy <= BLOAT_ECONOMY_THRESHOLD)
    .map(s => s.sceneIndex);

  const strength = Math.max(0, Math.min(1, medianEconomy / STRENGTH_TARGET_MEDIAN));

  return { scenes, medianEconomy, bloatedScenes, strength, scored: true };
}

/** Convenience: parse raw Fountain text and compute scene-economy in one call. */
export function detectSceneEconomy(fountain: string): SceneEconomyResult {
  if (!fountain || !fountain.trim()) {
    return { scenes: [], medianEconomy: 0, bloatedScenes: [], strength: 0, scored: false };
  }
  const sceneTexts = scenesFromFountain(fountain);
  return computeSceneEconomy(sceneTexts);
}
