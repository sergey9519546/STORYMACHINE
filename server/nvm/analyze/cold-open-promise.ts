// Cold-open promise tracker — excellence detector (STORY GOD SG3).
//
// A strong opening plants a concrete dramatic question / promise (a threat, a
// mystery, a goal, a ticking clock) — usually carried by a handful of salient
// nouns/proper-noun-like tokens plus promise-cue language (question marks in
// dialogue, threat/goal/mystery words). A strong script later PAYS OFF that
// promise: the same tokens recur meaningfully past the midpoint.
//
// SHUFFLE-SENSITIVITY IS THE POINT: this signal measures whether the promise
// sits at the FRONT of the document, not merely whether the tokens exist
// somewhere near the start. If the same scenes are reordered so the
// front-loaded promise scene no longer occupies scene 1-2, plantedAtFront
// flips false and strength drops materially — that is what makes this an
// ordering-dependent (shuffle-sensitive) structural signal rather than a
// bag-of-words one. Deterministic, no LLM.

export const COLD_OPEN_PROMISE_MIN_SCENES = 6;

// Modest, documented promise-cue lexicon (mirrors the anti-slop style of a
// small curated list rather than a sprawling one). These are words that,
// appearing in the opening, signal a planted dramatic question.
const PROMISE_CUE_WORDS = [
  'threat', 'threatens', 'threatened', 'danger', 'dangerous', 'kill', 'kills',
  'killed', 'murder', 'murdered', 'die', 'dies', 'dying', 'dead', 'death',
  'mystery', 'mysterious', 'secret', 'secrets', 'missing', 'disappeared',
  'vanished', 'hidden', 'hunt', 'hunting', 'chase', 'chasing', 'escape',
  'find', 'find him', 'find her', 'search', 'searching', 'clock', 'deadline',
  'hours', 'minutes', 'before', 'unless', 'must', 'promise', 'promised',
  'swear', 'vow', 'revenge', 'warning', 'warn', 'save', 'rescue', 'stop him',
  'stop her', 'stop them', 'bomb', 'weapon', 'gun', 'stolen', 'steal',
];

export interface ColdOpenReport {
  promiseTokens: string[];
  keptTokens: string[];
  plantedAtFront: boolean;
  strength: number;
  scored: boolean;
}

const tokenize = (s: string): string[] => s.toLowerCase().match(/[a-z][a-z']+/g) ?? [];

/** Split raw Fountain into ordered scene texts (INT./EXT. boundaries). Local re-derivation. */
function scenesFromFountain(fountain: string): string[] {
  const parts = fountain.split(/^(?=(?:INT|EXT)\.)/mi);
  return parts.filter(p => /^(?:INT|EXT)\./i.test(p));
}

// Words too common/structural to count as concrete "promise" nouns.
const STOPWORDS = new Set([
  'the', 'and', 'that', 'this', 'with', 'from', 'into', 'onto', 'they',
  'them', 'their', 'there', 'here', 'what', 'when', 'where', 'who', 'why',
  'how', 'she', 'her', 'his', 'him', 'you', 'your', 'our', 'we', 'i', 'a',
  'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'has', 'have',
  'had', 'not', 'but', 'for', 'on', 'in', 'at', 'to', 'of', 'as', 'it', 'its',
  'int', 'ext', 'day', 'night', 'continuous', 'later', 'cut',
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

/** Extract promise-cue lexicon hits present in the given scene text. */
function promiseCueTokens(sceneText: string): string[] {
  const lower = sceneText.toLowerCase();
  const hits: string[] = [];
  for (const cue of PROMISE_CUE_WORDS) {
    if (lower.includes(cue)) hits.push(cue);
  }
  return hits;
}

function abstain(): ColdOpenReport {
  return { promiseTokens: [], keptTokens: [], plantedAtFront: false, strength: 0, scored: false };
}

/**
 * Detect whether a script's opening (first 1-2 scenes) plants a concrete,
 * trackable dramatic promise, and whether that promise is paid off (its
 * tokens recur meaningfully) past the document's midpoint.
 *
 * Guards: empty/whitespace input, no scene headings, and scripts with fewer
 * than COLD_OPEN_PROMISE_MIN_SCENES scenes all abstain (scored=false), as
 * does an opening that yields no candidate tokens.
 */
export function detectColdOpenPromise(fountain: string): ColdOpenReport {
  if (typeof fountain !== 'string' || fountain.trim().length === 0) return abstain();

  const scenes = scenesFromFountain(fountain);
  if (scenes.length < COLD_OPEN_PROMISE_MIN_SCENES) return abstain();

  const openingScenes = scenes.slice(0, 2);
  const opening = openingScenes.join('\n');

  const properTokens = properNounTokens(opening);
  const cueTokens = promiseCueTokens(opening);

  // Frequency-rank proper nouns within the opening; keep the top salient ones
  // (repeated names/objects are more likely to be the planted promise than a
  // one-off word).
  const freq = new Map<string, number>();
  for (const t of properTokens) freq.set(t, (freq.get(t) ?? 0) + 1);
  const salientProper = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tok]) => tok);

  const promiseTokens = [...new Set([...salientProper, ...cueTokens])];
  if (promiseTokens.length === 0) return abstain();

  // Later portion: strictly past the midpoint of the scene list.
  const midpoint = Math.floor(scenes.length / 2);
  const laterScenes = scenes.slice(midpoint + 1);
  const laterText = laterScenes.join('\n').toLowerCase();

  // A token is "kept" if it recurs at least twice in the later text (once
  // would just be incidental overlap, not a meaningful payoff).
  const keptTokens: string[] = [];
  for (const tok of promiseTokens) {
    const re = new RegExp(`\\b${tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
    const count = (laterText.match(re) ?? []).length;
    if (count >= 2) keptTokens.push(tok);
  }

  const payoffFraction = keptTokens.length / promiseTokens.length;

  // Shuffle-sensitivity: plantedAtFront asks whether the promise tokens are
  // actually CONCENTRATED in the opening relative to their density across the
  // whole document, i.e. whether the opening is where the reader would first
  // encounter them. If the same tokens are diffusely spread (or the "opening"
  // scenes we sampled don't actually carry a disproportionate share of the
  // token mentions — as happens once the planted scene is shuffled away from
  // the front), plantedAtFront is false and strength is penalized.
  const wholeText = fountain.toLowerCase();
  let openingHits = 0;
  let wholeHits = 0;
  for (const tok of promiseTokens) {
    const re = new RegExp(`\\b${tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
    openingHits += (opening.toLowerCase().match(re) ?? []).length;
    wholeHits += (wholeText.match(re) ?? []).length;
  }
  // Front-loaded if at least half of every mention of the candidate promise
  // tokens across the WHOLE document lands inside the opening itself — i.e.
  // the opening carries a disproportionate share of the tokens' total
  // occurrences, rather than the tokens being evenly spread through (or
  // concentrated later in) the document.
  const plantedAtFront = wholeHits > 0 ? openingHits / wholeHits >= 0.5 : false;

  const concentrationFactor = plantedAtFront ? 1 : 0.35;
  const strength = Math.max(0, Math.min(1, payoffFraction * concentrationFactor));

  return { promiseTokens, keptTokens, plantedAtFront, strength, scored: true };
}
