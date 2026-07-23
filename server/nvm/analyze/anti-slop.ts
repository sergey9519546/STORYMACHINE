// Anti-slop detection — deterministic markers of AI-generated hollowness.
//
// Detects FOUR independent slop signals:
// (1) Generic emotion purple prose ("weight settled", "something shifted", etc.,
//     validated ~0.04/film on real screenplays, high on AI output)
// (2) Negated-cliché construction ("it's not X, it's Y") with guards against false positives
// (3) Vocabulary freshness via normalized unique-bigram ratio
// (4) Screenplay AI markers — 64 Tier 1 patterns from avoid-ai-writing skill adapted
//     for screenplay context, organized into 8 categories:
//     - Copula avoidance (serves as, features, boasts)
//     - Inflated staging (nestled, vibrant, bustling)
//     - Vague complexity (intricacies, nuanced, multifaceted)
//     - Unnecessary formality (commence, ascertain, utilize)
//     - Metaphorical inflation (tapestry, symphony, delve)
//     - Generic intensifiers (robust, comprehensive, seamless)
//     - Buzzwords & jargon (paradigm, synergy, leverage)
//     - Filler & clichés (in order to, at its core, game-changer)
//
// VALIDATION STATUS: Patterns (1-3) validated on real screenplays. Pattern (4) has
// a MEASURED false-positive floor but is NOT yet a validated discriminator:
//   - Negative control (2026-07-22, 261 produced screenplays via
//     scripts/measure-slop-discrimination.ts): mean 3.84 marker-lines/film,
//     p90 density 1.26/1k, only 16/261 films clean. Human screenwriters
//     legitimately use "robust", "commence", "in order to", "serves as", so the
//     real false-positive rate is bounded-but-nonzero, NOT the <0.1/film once
//     claimed here. That claim was fabricated; this is the corrected, measured one.
//   - This false-positive baseline is now a CI-visible regression gate:
//     tests/core/anti-slop-real-corpus.test.ts (env-gated on REAL_SLOP_CORPUS_DIR).
//   - STILL OPEN: full discrimination (AUC vs an AI-generated positive class).
//     Until that separation is measured, keep the weight conservative and
//     validated:false. See docs/p1-benchmark for the positive-class work.
//
// Per docs/research-audit/2026-07-11B-needed/ai-slop-storytelling-research.md,
// these are the highest-signal content-level failure modes. Deterministic, no LLM.

export interface EvidentDetection {
  count: number;
  lines: number[];  // 0-indexed line numbers where pattern matched
}

export interface SlopReport {
  genericEmotion: EvidentDetection;
  negatedClicheRaw: EvidentDetection;
  negatedClicheGuarded: EvidentDetection;
  screenplayAIMarkers: {
    detection: EvidentDetection;
    byCategory: Record<string, number>;
    validated: false;  // Honest status - needs P1 corpus validation
  };
  freshness: number | null;  // null = abstained (too short)
  slopScore: number;
  scored: boolean;
}

// Generic emotion phrases: purple prose, AI-slop markers.
const GENERIC_EMOTION_PATTERNS = [
  /\b(?:something|weight)\s+(?:shifted|changed|broke)\b/gi,
  /\bweight\s+(?:settled|lifted)\b/gi,
  /\bchill\s+ran\b/gi,
  /\bheart\s+(?:raced|pounded|hammered)\b/gi,
  /\bbreath\s+(?:caught|hitched)\b/gi,
  /\beyes?\s+widened?\b/gi,
  /\bstomach\s+(?:dropped|churned)\b/gi,
  /\ba\s+knot\s+formed?\b/gi,
  /\btime\s+(?:slowed|stopped)\b/gi,
];

// Screenplay AI markers: 64 Tier 1 patterns from avoid-ai-writing, organized by category.
// Measured false-positive floor on 261 produced screenplays: mean 3.84 marker-lines/film
// (NOT the <0.1 once claimed). Gated by tests/core/anti-slop-real-corpus.test.ts.
// Still needs an AI-generated positive class for full AUC discrimination.
interface AIMarker {
  pattern: RegExp;
  category: string;
  replacement: string;
}

const SCREENPLAY_AI_MARKERS: AIMarker[] = [
  // Category A: Copula Avoidance (7 patterns)
  // AI substitutes fancy verbs for "is" / "has" — "serves as" instead of "is"
  { pattern: /\bserves as\b/gi, category: 'copula-avoidance', replacement: 'is' },
  { pattern: /\bfeatures\s+(?!film|movie|actor|star)/gi, category: 'copula-avoidance', replacement: 'has/includes' },
  { pattern: /\bboasts\b/gi, category: 'copula-avoidance', replacement: 'has' },
  { pattern: /\bpresents\s+(?:a|an|the)\s+(?!gift|award|problem)/gi, category: 'copula-avoidance', replacement: 'shows/is' },
  { pattern: /\bcomprises\b/gi, category: 'copula-avoidance', replacement: 'consists of/includes' },
  { pattern: /\bconstitutes\b/gi, category: 'copula-avoidance', replacement: 'is/forms' },
  { pattern: /\brepresents\s+(?:a|an|the)\s+\w+\s+(?:in|for|to)\b/gi, category: 'copula-avoidance', replacement: 'is' },

  // Category B: Inflated Staging (12 patterns)
  // Purple prose in action lines — "nestled within" instead of "in"
  { pattern: /\bnestled\s+(?:in|within|among|between)\b/gi, category: 'inflated-staging', replacement: 'in/at/near' },
  { pattern: /\bvibrant\s+(?:city|town|street|neighborhood|district|community|scene|lobby|office|room|space)\b/gi, category: 'inflated-staging', replacement: 'busy/lively' },
  { pattern: /\bbustling\s+(?:city|town|street|market|cafe|restaurant)\b/gi, category: 'inflated-staging', replacement: 'busy/crowded' },
  { pattern: /\bthriving\s+(?:business|community|city|town|scene)\b/gi, category: 'inflated-staging', replacement: 'successful/busy' },
  { pattern: /\bshowcasing\b/gi, category: 'inflated-staging', replacement: 'showing/displaying' },
  { pattern: /\benduring\s+(?!pain|suffering)\w+/gi, category: 'inflated-staging', replacement: 'lasting/long-standing' },
  { pattern: /\bquintessential\b/gi, category: 'inflated-staging', replacement: 'typical/classic' },
  { pattern: /\biconic\s+(?!brand|logo)\w+/gi, category: 'inflated-staging', replacement: 'famous/well-known' },
  { pattern: /\bpicturesque\b/gi, category: 'inflated-staging', replacement: 'scenic/attractive' },
  { pattern: /\bcharming\s+(?:little|small)?\s*(?:town|cafe|shop|house)\b/gi, category: 'inflated-staging', replacement: '(describe specifically)' },
  { pattern: /\bquaint\b/gi, category: 'inflated-staging', replacement: 'small/old-fashioned' },
  { pattern: /\bidyllic\b/gi, category: 'inflated-staging', replacement: 'peaceful/perfect' },

  // Category C: Vague Complexity (8 patterns)
  // Gestures at complexity without specifics — "intricacies of" instead of naming them
  { pattern: /\b(?:intricacies|complexities)\s+of\b/gi, category: 'vague-complexity', replacement: '(be specific)' },
  { pattern: /\bintricate\s+(?!dance|pattern|design|carving|detail)\w+/gi, category: 'vague-complexity', replacement: 'complex/detailed' },
  { pattern: /\bnuanced\b/gi, category: 'vague-complexity', replacement: 'subtle/complex' },
  { pattern: /\bmultifaceted\b/gi, category: 'vague-complexity', replacement: 'complex/varied' },
  { pattern: /\blabyrinthine\b/gi, category: 'vague-complexity', replacement: 'maze-like/complex' },
  { pattern: /\bbyzantine\b/gi, category: 'vague-complexity', replacement: 'complicated/complex' },
  { pattern: /\bmyriad\s+(?:of\s+)?\w+/gi, category: 'vague-complexity', replacement: 'many/numerous' },
  { pattern: /\bplethora\s+of\b/gi, category: 'vague-complexity', replacement: 'many/lots of' },

  // Category D: Unnecessary Formality (9 patterns)
  // Formal verbs where simple verbs work — "commence" instead of "start"
  { pattern: /\bcommence(?:s|d|ing)?\b/gi, category: 'unnecessary-formality', replacement: 'start/begin' },
  { pattern: /\bascertain(?:s|ed|ing)?\b/gi, category: 'unnecessary-formality', replacement: 'find out/learn' },
  { pattern: /\bendeavor(?:s|ed|ing)?\b/gi, category: 'unnecessary-formality', replacement: 'try/attempt' },
  { pattern: /\butilize(?:s|d|ing)?\b/gi, category: 'unnecessary-formality', replacement: 'use' },
  { pattern: /\bobtain(?:s|ed|ing)?\s+(?:a|an|the|some)\b/gi, category: 'unnecessary-formality', replacement: 'get/receive' },
  { pattern: /\bpurchase(?:s|d|ing)?\s+(?:a|an|the|some)\b/gi, category: 'unnecessary-formality', replacement: 'buy/get' },
  { pattern: /\bindicate(?:s|d|ing)?\s+(?:that|a|an|the)\b/gi, category: 'unnecessary-formality', replacement: 'show/suggest' },
  { pattern: /\bdemonstrate(?:s|d|ing)?\s+(?:that|a|an|the|his|her|their)\b/gi, category: 'unnecessary-formality', replacement: 'show/prove' },
  { pattern: /\bfacilitate(?:s|d|ing)?\b/gi, category: 'unnecessary-formality', replacement: 'help/enable' },

  // Category E: Metaphorical Inflation (11 patterns)
  // Overblown metaphors — "tapestry of" instead of describing directly
  { pattern: /\btapestry\s+of\b/gi, category: 'metaphorical-inflation', replacement: '(describe specifically)' },
  { pattern: /\bsymphony\s+of\b/gi, category: 'metaphorical-inflation', replacement: '(describe directly)' },
  { pattern: /\blandscape\s+of\s+(?!the|this|his|her)\w+/gi, category: 'metaphorical-inflation', replacement: 'world/field/area' },
  { pattern: /\brealm\s+of\b/gi, category: 'metaphorical-inflation', replacement: 'world/area/field' },
  { pattern: /\bbeacon\s+(?:of|for)\b/gi, category: 'metaphorical-inflation', replacement: 'symbol/example' },
  { pattern: /\btestament\s+to\b/gi, category: 'metaphorical-inflation', replacement: 'shows/proves' },
  { pattern: /\bembrace(?:s|d|ing)?\s+(?:the|a|an|his|her|their)\s+(?!hug|kiss)\w+/gi, category: 'metaphorical-inflation', replacement: 'accept/adopt' },
  { pattern: /\bembark(?:s|ed|ing)?\s+(?:on|upon)\b/gi, category: 'metaphorical-inflation', replacement: 'start/begin' },
  { pattern: /\bdelve(?:s|d|ing)?\s+(?:into|in)\b/gi, category: 'metaphorical-inflation', replacement: 'explore/examine' },
  { pattern: /\bunpack(?:s|ed|ing)?\s+(?:the|his|her|their|its)\b/gi, category: 'metaphorical-inflation', replacement: 'explain/examine' },
  { pattern: /\b(?:dive(?:s|d|ing)?|deep\s+dive)\s+into\b/gi, category: 'metaphorical-inflation', replacement: 'examine/explore' },

  // Category F: Generic Intensifiers (10 patterns)
  // Vague intensifiers that don't add meaning — "robust" without specifics
  { pattern: /\brobust\b/gi, category: 'generic-intensifiers', replacement: 'strong/solid' },
  { pattern: /\bcomprehensive\b/gi, category: 'generic-intensifiers', replacement: 'thorough/complete' },
  { pattern: /\bmeticulous(?:ly)?\b/gi, category: 'generic-intensifiers', replacement: 'careful/detailed' },
  { pattern: /\bseamless(?:ly)?\b/gi, category: 'generic-intensifiers', replacement: 'smooth/easy' },
  { pattern: /\bholistic(?:ally)?\b/gi, category: 'generic-intensifiers', replacement: 'complete/whole' },
  { pattern: /\bpivotal\b/gi, category: 'generic-intensifiers', replacement: 'important/crucial' },
  { pattern: /\bdaunting\b/gi, category: 'generic-intensifiers', replacement: 'difficult/challenging' },
  { pattern: /\bformidable\b/gi, category: 'generic-intensifiers', replacement: 'impressive/powerful' },
  { pattern: /\bstaggering\b/gi, category: 'generic-intensifiers', replacement: 'huge/massive' },
  { pattern: /\bprofound(?:ly)?\b/gi, category: 'generic-intensifiers', replacement: 'deep/significant' },

  // Category G: Buzzwords & Jargon (7 patterns)
  // Corporate/tech speak in action lines — "paradigm" instead of "model"
  { pattern: /\bparadigm\b/gi, category: 'buzzwords-jargon', replacement: 'model/approach' },
  { pattern: /\bsynerg(?:y|ies)\b/gi, category: 'buzzwords-jargon', replacement: 'cooperation/combined effect' },
  { pattern: /\bleverage(?:s|d|ing)?\s+(?!his|her|their|the\s+(?:gun|weapon|knife))\w+/gi, category: 'buzzwords-jargon', replacement: 'use' },
  { pattern: /\bactionable\b/gi, category: 'buzzwords-jargon', replacement: 'practical/useful' },
  { pattern: /\bimpactful\b/gi, category: 'buzzwords-jargon', replacement: 'effective/powerful' },
  { pattern: /\blearnings\b/gi, category: 'buzzwords-jargon', replacement: 'lessons/insights' },
  { pattern: /\bbest\s+practices\b/gi, category: 'buzzwords-jargon', replacement: 'proven methods' },

  // Category H: Filler & Clichés (10 patterns)
  // Wordy constructions and empty phrases — "in order to" instead of "to"
  { pattern: /\bin\s+order\s+to\b/gi, category: 'filler-cliches', replacement: 'to' },
  { pattern: /\bdue\s+to\s+the\s+fact\s+that\b/gi, category: 'filler-cliches', replacement: 'because' },
  { pattern: /\bat\s+(?:its|his|her|their)\s+core\b/gi, category: 'filler-cliches', replacement: 'essentially' },
  { pattern: /\bthe\s+fact\s+that\b/gi, category: 'filler-cliches', replacement: 'that' },
  { pattern: /\bit\s+is\s+important\s+to\s+note\s+that\b/gi, category: 'filler-cliches', replacement: '(delete)' },
  { pattern: /\bserves\s+to\b/gi, category: 'filler-cliches', replacement: '(use direct verb)' },
  { pattern: /\bcutting[-\s]edge\b/gi, category: 'filler-cliches', replacement: 'advanced/latest' },
  { pattern: /\bgame[-\s]chang(?:er|ing)\b/gi, category: 'filler-cliches', replacement: 'transformative' },
  { pattern: /\bwatershed\s+moment\b/gi, category: 'filler-cliches', replacement: 'turning point' },
  { pattern: /\bonly\s+time\s+will\s+tell\b/gi, category: 'filler-cliches', replacement: '(delete)' },
];

function detectGenericEmotion(text: string): EvidentDetection {
  const lines = text.split('\n');
  const matches = new Set<number>();
  for (let i = 0; i < lines.length; i++) {
    for (const pat of GENERIC_EMOTION_PATTERNS) {
      if (pat.test(lines[i])) {
        matches.add(i);
        pat.lastIndex = 0;  // reset regex state
      }
    }
  }
  return { count: matches.size, lines: Array.from(matches).sort((a, b) => a - b) };
}

// Screenplay AI markers: detects all 64 Tier 1 patterns from avoid-ai-writing.
// Returns line numbers for evidence and category breakdown for diagnosis.
// Measured to fire on legitimate screenplay language (mean 3.84 lines/film on 261
// produced scripts — "robust", "commence", "serves as" are normal prose), so treat
// the count as a weak, bounded signal, not a verdict. Gate: anti-slop-real-corpus.test.ts.
function detectScreenplayAIMarkers(text: string): {
  detection: EvidentDetection;
  byCategory: Record<string, number>;
} {
  const lines = text.split('\n');
  const matches = new Set<number>();
  const categoryCount: Record<string, number> = {
    'copula-avoidance': 0,
    'inflated-staging': 0,
    'vague-complexity': 0,
    'unnecessary-formality': 0,
    'metaphorical-inflation': 0,
    'generic-intensifiers': 0,
    'buzzwords-jargon': 0,
    'filler-cliches': 0,
  };

  for (let i = 0; i < lines.length; i++) {
    for (const marker of SCREENPLAY_AI_MARKERS) {
      if (marker.pattern.test(lines[i])) {
        matches.add(i);
        categoryCount[marker.category]++;
        marker.pattern.lastIndex = 0;  // reset regex state
      }
    }
  }

  return {
    detection: { 
      count: matches.size, 
      lines: Array.from(matches).sort((a, b) => a - b) 
    },
    byCategory: categoryCount,
  };
}

// Negated-clichè construction: "it's not X, it's Y" or "not X but Y".
// Guard: only count as confident if construction repeats ≥2× in a 1000-char window,
// or flag separately as guarded vs raw.
function detectNegatedCliche(text: string): { raw: EvidentDetection; guarded: EvidentDetection } {
  const negatedPattern = /\b(?:it's?\s+)?not\s+\w+(?:\s+\w+){0,3}\s*(?:,|\s+(?:but|it's))\b/gi;
  const lines = text.split('\n');
  const rawMatches = new Set<number>();
  const guardedMatches = new Set<number>();

  // First pass: find all raw matches
  for (let i = 0; i < lines.length; i++) {
    let match;
    while ((match = negatedPattern.exec(lines[i])) !== null) {
      rawMatches.add(i);
    }
  }

  // Guard: only flag lines if same construction repeats ≥2× within ~1000 chars
  const textByWindow = [];
  let charCount = 0;
  let windowStart = 0;
  for (const line of lines) {
    charCount += line.length + 1;  // +1 for newline
    if (charCount - windowStart > 1000) {
      textByWindow.push(text.substring(windowStart, windowStart + charCount - windowStart));
      windowStart = charCount - 500;  // 50% overlap for continuity
    }
  }
  if (windowStart < charCount) {
    textByWindow.push(text.substring(windowStart));
  }

  for (const window of textByWindow) {
    const matches = window.match(negatedPattern) ?? [];
    if (matches.length >= 2) {
      // Mark all raw lines in this window as guarded
      const windowLines = window.split('\n');
      for (let i = 0; i < windowLines.length; i++) {
        if (negatedPattern.test(windowLines[i])) {
          guardedMatches.add(i);
          negatedPattern.lastIndex = 0;
        }
      }
    }
  }

  return {
    raw: { count: rawMatches.size, lines: Array.from(rawMatches).sort((a, b) => a - b) },
    guarded: { count: guardedMatches.size, lines: Array.from(guardedMatches).sort((a, b) => a - b) },
  };
}

// Vocabulary freshness: length-normalized unique bigram ratio.
// Bigrams are consecutive word pairs. Returns 1.0 (perfect) down to ~0.0 (highly repetitive).
// Abstains (returns null) for input < ~50 words.
function vocabularyFreshness(text: string): number | null {
  const tokenize = (s: string): string[] => s.toLowerCase().match(/\b[a-z][a-z']*\b/g) ?? [];
  const words = tokenize(text);
  if (words.length < 50) return null;  // abstain for short passages

  const bigrams = new Set<string>();
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.add(`${words[i]} ${words[i + 1]}`);
  }
  const bigramCount = words.length - 1;
  const ratio = bigrams.size / bigramCount;
  return Math.min(1.0, ratio);  // cap at 1.0
}

/** Detect AI-slop markers: generic emotion, negated clichés, vocabulary staleness, screenplay AI patterns. */
export function detectSlop(text: string): SlopReport {
  if (!text || text.trim().length === 0) {
    return {
      genericEmotion: { count: 0, lines: [] },
      negatedClicheRaw: { count: 0, lines: [] },
      negatedClicheGuarded: { count: 0, lines: [] },
      screenplayAIMarkers: {
        detection: { count: 0, lines: [] },
        byCategory: {
          'copula-avoidance': 0,
          'inflated-staging': 0,
          'vague-complexity': 0,
          'unnecessary-formality': 0,
          'metaphorical-inflation': 0,
          'generic-intensifiers': 0,
          'buzzwords-jargon': 0,
          'filler-cliches': 0,
        },
        validated: false,
      },
      freshness: null,
      slopScore: 0,
      scored: false,
    };
  }

  const genericEmotion = detectGenericEmotion(text);
  const { raw: negatedClicheRaw, guarded: negatedClicheGuarded } = detectNegatedCliche(text);
  const screenplayAIMarkers = detectScreenplayAIMarkers(text);
  const freshness = vocabularyFreshness(text);

  // Composite score: weight generic emotion heavily (validated), screenplay AI markers
  // moderately (unvalidated - needs P1 corpus check), negated clichés conservatively,
  // and penalize low freshness. Post-P1: tune weights based on discrimination data.
  let slopScore = 0;
  slopScore += genericEmotion.count * 0.5;  // validated: each purple-prose match adds 0.5
  // Conservative weight: real human screenplays fire ~3.84 marker-lines/film, so this
  // adds ~1.3 slop from legitimate prose alone. Kept low until AUC separation vs an AI
  // positive class justifies raising it. Measured baseline: anti-slop-real-corpus.test.ts.
  slopScore += screenplayAIMarkers.detection.count * 0.35;
  slopScore += negatedClicheGuarded.count * 0.3;  // guarded construction adds 0.3
  if (freshness !== null && freshness < 0.4) {
    slopScore += (0.4 - freshness) * 1.0;  // penalize low freshness
  }

  return {
    genericEmotion,
    negatedClicheRaw,
    negatedClicheGuarded,
    screenplayAIMarkers: {
      ...screenplayAIMarkers,
      validated: false,  // Honest status: needs P1 real-screenplay corpus validation
    },
    freshness,
    slopScore,
    scored: true,
  };
}
