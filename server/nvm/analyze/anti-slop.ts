// Anti-slop detection — deterministic markers of AI-generated hollowness.
//
// Detects three independent slop signals: (1) generic emotion purple prose
// ("weight settled", "something shifted", etc., validated ~0.04/film on real
// screenplays, high on AI output), (2) negated-cliché construction ("it's not X,
// it's Y") with guards against false positives, and (3) vocabulary freshness via
// normalized unique-bigram ratio. Per docs/research-audit/2026-07-11B-needed/
// ai-slop-storytelling-research.md, these are the highest-signal content-level
// failure modes. Deterministic, no LLM or randomness.

export interface EvidentDetection {
  count: number;
  lines: number[];  // 0-indexed line numbers where pattern matched
}

export interface SlopReport {
  genericEmotion: EvidentDetection;
  negatedClicheRaw: EvidentDetection;
  negatedClicheGuarded: EvidentDetection;
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

/** Detect AI-slop markers: generic emotion, negated clichés, vocabulary staleness. */
export function detectSlop(text: string): SlopReport {
  if (!text || text.trim().length === 0) {
    return {
      genericEmotion: { count: 0, lines: [] },
      negatedClicheRaw: { count: 0, lines: [] },
      negatedClicheGuarded: { count: 0, lines: [] },
      freshness: null,
      slopScore: 0,
      scored: false,
    };
  }

  const genericEmotion = detectGenericEmotion(text);
  const { raw: negatedClicheRaw, guarded: negatedClicheGuarded } = detectNegatedCliche(text);
  const freshness = vocabularyFreshness(text);

  // Composite score: weight generic emotion heavily, guard against negated clichés,
  // penalize low freshness. No single signal dominates; this is exploratory.
  let slopScore = 0;
  slopScore += genericEmotion.count * 0.5;  // each purple-prose match adds 0.5
  slopScore += negatedClicheGuarded.count * 0.3;  // guarded construction adds 0.3
  if (freshness !== null && freshness < 0.4) {
    slopScore += (0.4 - freshness) * 1.0;  // penalize low freshness
  }

  return {
    genericEmotion,
    negatedClicheRaw,
    negatedClicheGuarded,
    freshness,
    slopScore,
    scored: true,
  };
}
