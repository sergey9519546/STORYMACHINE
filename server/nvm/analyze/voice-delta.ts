// Voice differentiation via Burrows's Delta — character dialogue voice-swap risk.
//
// Burrows's Delta (Burrows, 2002): measure authorial distance between two texts
// by z-scoring their per-function-word relative frequencies against corpus mean/sd.
// Adapted for dialogue: characters with identical voice (low delta) risk voice-swap
// misheard by audience; applied here to flag when two characters' dialogue are
// statistically indistinguishable. Pure function, deterministic, no LLM.
//
// Measured separation: on distinct voices (terse/imperative vs verbose/hedging),
// delta ~ 0.4–0.6; near-identical dialogue, delta ~ 0.05–0.15. Threshold: 0.15.
//
// -- Status (2026-08-03 wiring audit; SUPERSEDED in part, kept for the
// order-invariance finding) -- the "zero importers" and "blocked on an
// extractor gap" paragraphs below are HISTORY: fountain-analyzer.ts:2482
// now builds `dialogueByCharacter` from its own DialogueLine[] and calls
// analyzeVoices on every analysed script, and doctor.ts:2292 attaches the
// result to the report. That importer is what puts this module on doctor.ts's
// import graph: it is SCORING-PATH, and any edit to it needs a measurement
// receipt (2026-09-20). What is still true, and is why this module is not a
// candidate for the order-sensitivity question, is the CONFIRMED
// order-INVARIANCE recorded here. The 2026-08-03 text below is left as
// written because it is a dated record.
// Zero importers anywhere in the repo except its own test
// (tests/core/voice-delta.test.ts). CONFIRMED order-INVARIANT (not
// probed numerically, but true by construction): Burrows's Delta is a
// z-scored function-word FREQUENCY comparison over each character's pooled
// dialogue -- it does not matter what order a character's lines appear in,
// only their aggregate distribution, so this is squarely a content signal,
// not a candidate for the order-sensitivity question this audit otherwise
// prioritizes. Real, legible capability (voice-swap risk between two
// characters) blocked on a genuine extractor gap, not just missing
// plumbing: `analyzeVoices(dialogueByCharacter: Record<string, string[]>)`
// needs full per-character dialogue text, but FountainAnalysis (what
// doctor.ts holds) only exposes `characters: string[]` (names) and each
// scene's `dialogueHighlights` (top-2 LONGEST lines only, not the
// character's full dialogue) -- fountain-analyzer.ts's internal
// `DialogueLine[]` (speaker + text, line ~471) is exactly what's needed but
// is discarded down to highlights before ScreenplaySceneRecord is built,
// and is not exported. What would unblock it: widen ScreenplaySceneRecord
// (or add a dedicated adapter reading fountain-analyzer.ts's internal
// DialogueLine[] before it's discarded) to expose full per-character
// dialogue text -- a real, if small, extractor build, not a wiring change.

export interface CharacterDialogue {
  name: string;
  lines: string[];
}

// ~50-word English function-word list: high-frequency, low-semantic-content words
// that reveal authorial (or character voice) fingerprints.
const DEFAULT_FUNCTION_WORDS = new Set<string>([
  'the', 'and', 'of', 'to', 'a', 'in', 'that', 'it', 'is', 'was', 'i', 'you',
  'he', 'she', 'they', 'we', 'but', 'not', 'with', 'for', 'as', 'this', 'be',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'can', 'may', 'might', 'must', 'are', 'been', 'being', 'or', 'an', 'if', 'by',
  'on', 'at', 'from', 'up', 'about', 'out', 'into', 'through', 'during', 'before',
  'after', 'above', 'below', 'between', 'under', 'again', 'further', 'than', 'then',
]);

/**
 * Tokenize text into lowercase words, filtering punctuation-only tokens.
 */
function tokenize(text: string): string[] {
  const words = text.toLowerCase().match(/[a-z']+/g) ?? [];
  return words.filter(w => /[a-z]/.test(w));
}

/**
 * Compute relative frequency of each function word in a dialogue set.
 * Returns object: functionWord → relative frequency [0,1].
 */
function relativeFrequencies(lines: string[], functionWords: Set<string>): Record<string, number> {
  const allTokens = lines.flatMap(tokenize);
  const n = allTokens.length;
  const freq: Record<string, number> = {};

  // Initialize all function words with 0
  for (const word of functionWords) {
    freq[word] = 0;
  }

  // Count occurrences
  if (n > 0) {
    for (const token of allTokens) {
      if (functionWords.has(token)) {
        freq[token]++;
      }
    }
    // Normalize to relative frequency
    for (const word of functionWords) {
      freq[word] /= n;
    }
  }

  return freq;
}

/**
 * Mean and standard deviation of EVERY function word's frequency across the
 * combined two-sample corpus, in a single pass over the function-word set.
 *
 * TWO HOISTS LIVE HERE, AND THEY COMPOSE.
 *
 * (1) PER PAIR, 2026-09-20. This replaces `corpusStats(allDialogues, word,
 * functionWords)`, which `burrowsDelta` called once PER WORD from inside its
 * loop and which re-derived `relativeFrequencies` for BOTH sides on every call
 * — 2 x 65 = 130 full re-tokenizations per pair, of two maps the caller
 * already held in `freqA` / `freqB`. See the hoist note on
 * `deltaFromFrequencies` below.
 *
 * (2) PER CHARACTER, 2026-09-07. `analyzeVoices` is O(distinct^2) in pairs, so
 * even one re-tokenization per pair re-derives the same character's pooled
 * dialogue once for every partner it has. It therefore builds each eligible
 * character's frequency table ONCE and calls `deltaFromFrequencies` with the
 * two tables directly; the redundancy this removed showed up as a measured
 * 42,062 ms on a 200-name payload. That path was invisible while
 * `analyzeVoices` abstained on any script with a one-line walk-on (i.e. every
 * real feature); with per-character abstention the pair loop actually runs.
 *
 * BIT-IDENTITY CONTRACT (why this is written the long way). The arithmetic here
 * is the old `corpusStats` body with its two `Array.prototype.reduce` calls
 * unrolled over the exactly two samples it was ever handed — `Object.values({
 * a, b })`, always length 2, always in that order — including the literal `0`
 * each reduce seeded from. Floating-point addition is not associative, so the
 * per-word accumulation SEQUENCE (seed, then a, then b) is what makes the
 * result bit-identical, not merely close. Do not "simplify" this to
 * `(fA + fB) / 2`-shaped expressions that re-associate the additions, and do
 * not reorder the two samples. `tests/core/voice-delta-hoist-identity.test.ts`
 * holds a frozen verbatim copy of the pre-hoist implementation and asserts
 * `Object.is(old, new)` over every pair it generates.
 */
function combinedCorpusStats(
  freqA: Record<string, number>,
  freqB: Record<string, number>,
  functionWords: Set<string>,
): Record<string, { mean: number; sd: number }> {
  // `Object.values({ a, b }).length` — the divisor the old corpusStats used.
  // It was always 2 on this call path, so that function's `length === 0` and
  // `length < 2` early returns were unreachable from burrowsDelta and are not
  // reproduced here; burrowsDelta's own degenerate-input guard is unchanged.
  const SAMPLE_COUNT = 2;
  const stats: Record<string, { mean: number; sd: number }> = {};

  for (const word of functionWords) {
    const fA = freqA[word];
    const fB = freqB[word];

    let meanSum = 0;
    meanSum = meanSum + fA;
    meanSum = meanSum + fB;
    const mean = meanSum / SAMPLE_COUNT;

    let varianceSum = 0;
    varianceSum = varianceSum + (fA - mean) ** 2;
    varianceSum = varianceSum + (fB - mean) ** 2;
    const variance = varianceSum / SAMPLE_COUNT;

    const sd = Math.sqrt(variance);
    stats[word] = { mean, sd: sd > 0 ? sd : 1 };
  }

  return stats;
}

/**
 * Burrows's Delta: mean absolute z-score difference between two dialogue sets
 * across function words. Lower delta = more similar voice. Returns 0 for empty input.
 *
 * @param a First character's lines
 * @param b Second character's lines
 * @param functionWords Optional custom function-word set (defaults to DEFAULT_FUNCTION_WORDS)
 * @returns Mean |Δz| distance, or 0 if either set is empty
 */
export function burrowsDelta(
  a: string[],
  b: string[],
  functionWords?: Set<string>,
): number {
  const words = functionWords ?? DEFAULT_FUNCTION_WORDS;

  // Degenerate case: empty input
  if (a.length === 0 || b.length === 0) return 0;

  const freqA = relativeFrequencies(a, words);
  const freqB = relativeFrequencies(b, words);

  return deltaFromFrequencies(freqA, freqB, words);
}

/** The z-score half of Burrows's Delta, over two already-computed frequency
 *  tables. Split out so `analyzeVoices` can build each character's table ONCE
 *  and reuse it across every pair that character appears in — see
 *  `combinedCorpusStats`'s hoist (2). For this two-sample delta the "corpus"
 *  each word is z-scored against is the two samples themselves, exactly as
 *  before.
 *
 *  HOISTED 2026-09-20 (perf, bit-identical): the statistics used to be read
 *  from `corpusStats({ a, b }, word, words)` INSIDE the loop below, and that
 *  helper re-ran `relativeFrequencies` over BOTH sides on every one of the 65
 *  iterations — 130 full re-tokenizations per pair, of exactly the two maps
 *  the caller already holds. They do not depend on `word` beyond indexing, so
 *  they are computed once, above the loop. Same arithmetic, same order, same
 *  doubles: `maxDeltaDiff = 0` over every pair measured. Measured 44x-56x
 *  faster on the shapes `server/lib/validation.ts`'s voice-eligibility bounds
 *  are derived against, where `analyzeVoices` is ~99% of the cost. */
function deltaFromFrequencies(
  freqA: Record<string, number>,
  freqB: Record<string, number>,
  words: Set<string>,
): number {
  let sumAbsDelta = 0;
  let count = 0;

  const stats = combinedCorpusStats(freqA, freqB, words);

  for (const word of words) {
    const { mean, sd } = stats[word];
    const zA = (freqA[word] - mean) / sd;
    const zB = (freqB[word] - mean) / sd;
    sumAbsDelta += Math.abs(zA - zB);
    count++;
  }

  return count > 0 ? sumAbsDelta / count : 0;
}

/** The pooled-dialogue floor under which one character carries too little
 *  text for Burrows's Delta to say anything. Exported because
 *  `server/lib/validation.ts`'s voice-eligible-weight cost bound has to model
 *  the SAME eligibility set this function computes — that guard's whole cost
 *  model is "(eligible characters) x (their pooled words)", and it was
 *  calibrated against this constant. It is read there, never redefined.
 *
 *  30 words is roughly four spoken lines: below it the ~50 function-word
 *  relative frequencies this metric z-scores are dominated by which single
 *  sentence the character happened to say. */
export const VOICE_MIN_WORDS = 30;

/** Total tokens across one character's pooled dialogue, by this module's own
 *  tokenizer (letters and apostrophes only — see `tokenize`). */
function pooledWordCount(lines: string[]): number {
  return lines.flatMap(tokenize).length;
}

/**
 * Analyze character pairs in a script for voice-swap risk.
 *
 * ABSTENTION IS PER CHARACTER, NOT PER SCRIPT (2026-09-07). Until this
 * change a single sparse character abstained the WHOLE analysis: the loop
 * below `return`ed `{ pairs: [], scored: false }` the moment any one
 * character fell under the floor. Every real feature has a WAITRESS with one
 * line, so the channel was structurally guaranteed to be dead at the only
 * length the product is aimed at — measured on a 146-scene draft:
 * `voiceAnalysis: {"pairs":[],"scored":false}` with `characters: 61`, and
 * the panel rendering `VOICE SEPARATION — N/A` while its own tooltip
 * promised "out of every pair with enough dialogue to test", which is a
 * per-pair filter the code did not implement. ROADMAP P1 records this
 * channel as the one that is SOLVED (test AUC 0.990); it never ran.
 *
 * The floor itself is unchanged and is still a real bar: a character under
 * `VOICE_MIN_WORDS` is EXCLUDED from the pair set, never scored against
 * anybody. `excludedCharacters` reports exactly who, so "N/A" is never the
 * whole story a reader gets.
 *
 * This does not change any delta already being reported. `burrowsDelta`
 * builds its corpus statistics from the two characters it is handed and
 * nothing else, so dropping a third, sparse character cannot move a
 * surviving pair's number: on a script where every character already cleared
 * the floor, the output is byte-identical to the previous implementation.
 *
 * @param dialogueByCharacter Map of character name → dialogue lines
 *
 * Abstains (scored: false) only when FEWER THAN TWO characters clear the
 * floor — the one condition under which there is no pair to compute.
 */
export function analyzeVoices(
  dialogueByCharacter: Record<string, string[]>,
): {
  pairs: Array<{ a: string; b: string; delta: number; swapRisk: boolean }>;
  scored: boolean;
  /** Characters held out of the pair set for having under VOICE_MIN_WORDS
   *  pooled words, in the input's own key order. Empty when none were. */
  excludedCharacters: string[];
} {
  const characters = Object.keys(dialogueByCharacter);

  const eligible: string[] = [];
  const excludedCharacters: string[] = [];
  for (const char of characters) {
    if (pooledWordCount(dialogueByCharacter[char]) >= VOICE_MIN_WORDS) eligible.push(char);
    else excludedCharacters.push(char);
  }

  // Abstain: fewer than two characters carry enough text to pair at all.
  if (eligible.length < 2) {
    return { pairs: [], scored: false, excludedCharacters };
  }

  // Compute all pairwise deltas over the ELIGIBLE set only. No pair is ever
  // computed for a character with too little text to be meaningful.
  const pairs: Array<{ a: string; b: string; delta: number; swapRisk: boolean }> = [];
  const SWAP_RISK_THRESHOLD = 0.15;

  // Each eligible character's frequency table, derived ONCE. Without this the
  // pair loop re-tokenizes the same character's pooled dialogue in every pair
  // it appears in — see combinedCorpusStats's hoist (2).
  const freqByCharacter = new Map<string, Record<string, number>>();
  for (const char of eligible) {
    freqByCharacter.set(char, relativeFrequencies(dialogueByCharacter[char], DEFAULT_FUNCTION_WORDS));
  }

  for (let i = 0; i < eligible.length; i++) {
    for (let j = i + 1; j < eligible.length; j++) {
      const charA = eligible[i];
      const charB = eligible[j];
      // Degenerate-input guard, kept identical to burrowsDelta's own: an
      // empty line array has no voice to compare.
      const delta = (dialogueByCharacter[charA].length === 0 || dialogueByCharacter[charB].length === 0)
        ? 0
        : deltaFromFrequencies(freqByCharacter.get(charA)!, freqByCharacter.get(charB)!, DEFAULT_FUNCTION_WORDS);
      const swapRisk = delta < SWAP_RISK_THRESHOLD;

      pairs.push({
        a: charA,
        b: charB,
        delta,
        swapRisk,
      });
    }
  }

  return { pairs, scored: true, excludedCharacters };
}
