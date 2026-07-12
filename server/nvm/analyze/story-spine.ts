// Story-Spine detector — Pixar Axiom 3 (task #116).
//
// Pixar's third storytelling axiom holds that a strong story has a single
// controlling throughline — a protagonist and a pursuit/goal — that most
// scenes serve, directly or indirectly. This module measures that
// deterministically over the comprehended scenes of a Fountain script:
//
//   1. protagonist proxy = the most-referenced proper-noun-like token across
//      ALL scenes (a crude but effective stand-in for "who the story is
//      about" — the character named most often is very likely the lead).
//   2. spine tokens = a recurring goal/pursuit token set mined from the
//      OPENING 25% of scenes (salient nouns/verbs beyond the protagonist
//      name) — the setup section is where a goal is normally planted.
//   3. a scene "serves the spine" if it references the protagonist proxy OR
//      any spine token.
//
// This is intentionally a bag-of-references measure (not shuffle-sensitive
// like cold-open-promise) because Axiom 3 is about SCOPE (how much of the
// document serves one throughline), not about ordering.
//
// Deterministic, no LLM.

export const STORY_SPINE_MIN_SCENES = 8;

// Coverage fraction (scenes serving the spine / total scenes) at or above
// which a script is judged to have a coherent single throughline.
export const STORY_SPINE_COHERENCE_THRESHOLD = 0.6;

export interface StorySpineReport {
  protagonist: string | null;
  spineTokens: string[];
  scenesServingSpine: number;
  sceneCount: number;
  spineCoverage: number;
  hasCoherentSpine: boolean;
  strength: number;
  scored: boolean;
}

const tokenize = (s: string): string[] => s.toLowerCase().match(/[a-z][a-z']+/g) ?? [];

/** Split raw Fountain into ordered scene texts (INT./EXT. boundaries). Local re-derivation. */
function scenesFromFountain(fountain: string): string[] {
  const parts = fountain.split(/^(?=(?:INT|EXT)\.)/mi);
  return parts.filter(p => /^(?:INT|EXT)\./i.test(p));
}

// Words too common/structural to count as protagonist names or goal tokens.
const STOPWORDS = new Set([
  'the', 'and', 'that', 'this', 'with', 'from', 'into', 'onto', 'they',
  'them', 'their', 'there', 'here', 'what', 'when', 'where', 'who', 'why',
  'how', 'she', 'her', 'his', 'him', 'you', 'your', 'our', 'we', 'i', 'a',
  'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'has', 'have',
  'had', 'not', 'but', 'for', 'on', 'in', 'at', 'to', 'of', 'as', 'it', 'its',
  'int', 'ext', 'day', 'night', 'continuous', 'later', 'cut', 'fade', 'out',
  'in', 'if', 'so', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'can', 'just', 'now', 'then', 'still', 'also', 'very', 'more', 'most',
]);

/** Extract capitalized proper-noun-like tokens (min length 3) from raw scene text. */
function properNounTokens(sceneText: string): string[] {
  const matches = sceneText.match(/\b[A-Z][a-z]{2,}\b/g) ?? [];
  const out: string[] = [];
  for (const m of matches) {
    const lower = m.toLowerCase();
    if (STOPWORDS.has(lower)) continue;
    out.push(lower);
  }
  return out;
}

/** Extract lowercase word tokens (min length 4, non-stopword) from raw scene text. */
function contentTokens(sceneText: string): string[] {
  return tokenize(sceneText).filter(t => t.length >= 4 && !STOPWORDS.has(t));
}

function abstain(): StorySpineReport {
  return {
    protagonist: null,
    spineTokens: [],
    scenesServingSpine: 0,
    sceneCount: 0,
    spineCoverage: 0,
    hasCoherentSpine: false,
    strength: 0,
    scored: false,
  };
}

function makeTokenRegex(tok: string): RegExp {
  return new RegExp(`\\b${tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
}

/**
 * Detect whether a script has a single controlling throughline (Pixar
 * Axiom 3) that most scenes serve.
 *
 * Guards: empty/whitespace input, no scene headings, and scripts with fewer
 * than STORY_SPINE_MIN_SCENES scenes abstain (scored=false). Scripts where
 * no protagonist proxy can be found (no proper-noun-like tokens anywhere)
 * also abstain.
 */
export function detectStorySpine(fountain: string): StorySpineReport {
  if (typeof fountain !== 'string' || fountain.trim().length === 0) return abstain();

  const scenes = scenesFromFountain(fountain);
  if (scenes.length < STORY_SPINE_MIN_SCENES) return abstain();

  // 1. Protagonist proxy: most-referenced proper-noun-like token across ALL
  // scenes.
  const properFreq = new Map<string, number>();
  for (const scene of scenes) {
    for (const tok of properNounTokens(scene)) {
      properFreq.set(tok, (properFreq.get(tok) ?? 0) + 1);
    }
  }
  if (properFreq.size === 0) return abstain();

  const rankedProper = [...properFreq.entries()].sort((a, b) => b[1] - a[1]);
  const protagonist = rankedProper[0][0];

  // 2. Goal/pursuit token set mined from the opening 25% of scenes: salient
  // content tokens (nouns/verbs), excluding the protagonist name itself.
  const openingCount = Math.max(1, Math.ceil(scenes.length * 0.25));
  const openingScenes = scenes.slice(0, openingCount);
  const openingText = openingScenes.join('\n');

  const goalFreq = new Map<string, number>();
  for (const tok of contentTokens(openingText)) {
    if (tok === protagonist) continue;
    goalFreq.set(tok, (goalFreq.get(tok) ?? 0) + 1);
  }
  // Salient = appears at least twice in the opening (recurring, not a
  // one-off word) — keep the top few by frequency.
  const spineTokens = [...goalFreq.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([tok]) => tok);

  // 3. A scene serves the spine if it references the protagonist OR any
  // spine token.
  const protagonistRe = makeTokenRegex(protagonist);
  const spineRes = spineTokens.map(tok => makeTokenRegex(tok));

  let scenesServingSpine = 0;
  for (const scene of scenes) {
    const lower = scene.toLowerCase();
    const hasProtagonist = protagonistRe.test(lower);
    protagonistRe.lastIndex = 0;
    let hasSpineToken = false;
    for (const re of spineRes) {
      if (re.test(lower)) { hasSpineToken = true; re.lastIndex = 0; break; }
      re.lastIndex = 0;
    }
    if (hasProtagonist || hasSpineToken) scenesServingSpine++;
  }

  const sceneCount = scenes.length;
  const spineCoverage = scenesServingSpine / sceneCount;
  const hasCoherentSpine = spineCoverage >= STORY_SPINE_COHERENCE_THRESHOLD && protagonist !== null;

  const strength = Math.max(0, Math.min(1, spineCoverage));

  return {
    protagonist,
    spineTokens,
    scenesServingSpine,
    sceneCount,
    spineCoverage,
    hasCoherentSpine,
    strength,
    scored: true,
  };
}
