// Dialogue info-ratio signal — ROADMAP RECOVER-03. Deterministic anti-exposition
// heuristic. For each dialogue turn, computes the fraction of content words
// (non-stopwords) that are NEW relative to prior dialogue in the scene/script.
// A turn whose new-info ratio is very HIGH (> ~0.6) reads as raw exposition/
// info-dump; a turn that is ALL old words is filler.
//
// Research heuristic: flag a turn as exposition-risk when newInfoWordRatio > ~0.6
// in a dialogue-heavy context (tunable threshold). DIAGNOSTIC ONLY — findings are
// heuristic tier 'pattern_to_watch' (not actionable yet, marked for future
// refinement). Measured separation between exposition-heavy and natural dialogue
// is the gate for promotion to a real check.

// Compact inline stopword set — common words that don't count as content/info.
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
]);

// Genre-tuned exposition thresholds. Higher threshold = stricter (fewer false positives).
const GENRE_THRESHOLDS: Record<string, number> = {
  'action': 0.65,
  'adventure': 0.63,
  'animation': 0.60,
  'biography': 0.55,
  'comedy': 0.62,
  'crime': 0.60,
  'documentary': 0.50,   // docs are exposition-heavy by design
  'drama': 0.58,
  'fantasy': 0.62,
  'horror': 0.60,
  'musical': 0.65,
  'mystery': 0.58,
  'romance': 0.60,
  'sci-fi': 0.62,
  'thriller': 0.60,
  'western': 0.62,
};

export interface DialogueTurn {
  sceneIdx: number;
  ratio: number;        // fraction of content words that are new
  expositionRisk: boolean;
}

export interface DialogueInfoRatioResult {
  turns: DialogueTurn[];
  meanRatio: number;
  expositionHeavyScenes: number[];
  scored: boolean;      // false if input too small to analyze
}

export const DIALOGUE_INFO_RATIO_MIN_TURNS = 2;

const tokenize = (s: string): string[] => s.toLowerCase().match(/[a-z][a-z']+/g) ?? [];

/**
 * Parse a scene into (character cue, dialogue line) pairs.
 * A cue is an all-caps word(s) at line start; dialogue follows until next cue.
 */
function parseDialogueLines(scene: string): Array<{ cue: string; dialogue: string }> {
  const lines = scene.split(/\r?\n/);
  const turns: Array<{ cue: string; dialogue: string }> = [];
  let currentCue = '';
  let currentDialogue: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty and parenthetical action
    if (!trimmed || trimmed.startsWith('(')) continue;

    // Check if line is an all-caps character cue (word or short phrase)
    if (/^[A-Z][A-Z\s]*$/.test(trimmed) && trimmed.length < 80) {
      // Save previous turn if we have accumulated dialogue
      if (currentCue && currentDialogue.length > 0) {
        turns.push({
          cue: currentCue,
          dialogue: currentDialogue.join(' '),
        });
      }
      currentCue = trimmed;
      currentDialogue = [];
    } else if (currentCue) {
      // Accumulate dialogue under current cue
      currentDialogue.push(trimmed);
    }
  }

  // Save final turn
  if (currentCue && currentDialogue.length > 0) {
    turns.push({
      cue: currentCue,
      dialogue: currentDialogue.join(' '),
    });
  }

  return turns;
}

/**
 * Compute new-info word ratio for a turn.
 * Returns fraction of content words (non-stopwords) that are NEW relative to seen set.
 */
function computeInfoRatio(
  dialogue: string,
  seenWords: Set<string>
): { ratio: number; newCount: number; contentCount: number } {
  const tokens = tokenize(dialogue);
  const contentTokens = tokens.filter(t => !STOPWORDS.has(t));
  const contentCount = contentTokens.length;

  if (contentCount === 0) return { ratio: 0, newCount: 0, contentCount: 0 };

  let newCount = 0;
  for (const token of contentTokens) {
    if (!seenWords.has(token)) {
      newCount++;
      seenWords.add(token);
    }
  }

  const ratio = newCount / contentCount;
  return { ratio, newCount, contentCount };
}

/**
 * Analyze dialogue info-ratio across ordered scene texts.
 * Pure + deterministic. Genre param tunes exposition threshold (default 0.6).
 */
export function analyzeDialogueInfoRatio(
  sceneTexts: readonly string[],
  genre?: string | null,
  customThreshold?: number
): DialogueInfoRatioResult {
  const threshold = customThreshold ?? (genre ? GENRE_THRESHOLDS[genre] : 0.60);
  const turns: DialogueTurn[] = [];
  const seenWords = new Set<string>();
  const expositionScenes = new Map<number, number>(); // sceneIdx -> exposition-risk count

  // Parse all dialogue turns across all scenes
  for (let sceneIdx = 0; sceneIdx < sceneTexts.length; sceneIdx++) {
    const scene = sceneTexts[sceneIdx];
    const dialogueLines = parseDialogueLines(scene);

    for (const line of dialogueLines) {
      const { ratio } = computeInfoRatio(line.dialogue, seenWords);
      const expositionRisk = ratio > threshold;

      turns.push({
        sceneIdx,
        ratio,
        expositionRisk,
      });

      if (expositionRisk) {
        expositionScenes.set(sceneIdx, (expositionScenes.get(sceneIdx) ?? 0) + 1);
      }
    }
  }

  // Abstain if too few dialogue turns
  if (turns.length < DIALOGUE_INFO_RATIO_MIN_TURNS) {
    return {
      turns,
      meanRatio: 0,
      expositionHeavyScenes: [],
      scored: false,
    };
  }

  const meanRatio = turns.length > 0
    ? turns.reduce((sum, t) => sum + t.ratio, 0) / turns.length
    : 0;

  // Exposition-heavy scenes: at least half of turns in scene are exposition-risk
  const expositionHeavyScenes = Array.from(expositionScenes.entries())
    .filter(([sceneIdx, riskCount]) => {
      const sceneTurns = turns.filter(t => t.sceneIdx === sceneIdx);
      return sceneTurns.length > 0 && riskCount >= sceneTurns.length / 2;
    })
    .map(([sceneIdx]) => sceneIdx);

  return {
    turns,
    meanRatio,
    expositionHeavyScenes,
    scored: true,
  };
}
