// Pattern-establishment (rule-of-three / running motif) excellence detector —
// STORY GOD SG4. Deterministic, no LLM. Credits a script for deliberately
// ESTABLISHING a repeated pattern: a distinctive recurring phrase, object, or
// action beat that appears 3+ times across the script (classic rule-of-three
// / running motif), because controlled repetition-with-variation is a craft
// signal absent from unrevised drafts.
//
// NEVER-PADDED: an excellence rule that fires on incidental repetition
// (common stop-words, a character's own name recurring because they're in
// every scene) is a FAILING rule. This module requires:
//   1. A DISTINCTIVE content token/phrase — not a stop-word, not a detected
//      character-cue name.
//   2. >= 3 occurrences.
//   3. Spread across >= 3 DISTINCT scenes — a token repeated only within one
//      scene (a rapid back-and-forth, a single riff) is not a running motif,
//      it's local emphasis, and is explicitly excluded (spread guard).
// Conservative by design, matching mirror-scene.ts's discipline.

export interface Motif {
  token: string;
  occurrences: number;
  sceneSpread: number;
}

export interface PatternReport {
  motifs: Motif[];
  motifCount: number;
  strength: number; // 0..1 composite. 0 when scored is false.
  scored: boolean;
}

const MIN_SCENES = 6;

// Character cue detection — ALL-CAPS line at start, not a slugline/transition,
// mirrors excellence-signals.ts's isDialogueCue discipline so a recurring
// NAME doesn't get credited as a motif.
const CHARACTER_CUE = /^([A-Z][A-Z0-9\s'-]*[A-Z0-9])(?:\s*\(|$)/;

function isDialogueCueLine(line: string): boolean {
  if (!/^[A-Z]/.test(line)) return false;
  if (/^(?:INT|EXT|FADE|CUT|TRANSITION|V\.O\.|O\.S\.|CONT'D)/.test(line)) return false;
  return CHARACTER_CUE.test(line);
}

function extractCueName(line: string): string | null {
  const m = line.match(CHARACTER_CUE);
  return m ? m[1].trim().toLowerCase() : null;
}

/** Split raw Fountain into ordered scene texts (INT./EXT. boundaries) — matches mirror-scene.ts / emotional-arc.ts. */
function scenesFromFountain(fountain: string): string[] {
  const parts = fountain.split(/^(?=(?:INT|EXT)\.)/mi);
  return parts.filter(p => /^(?:INT|EXT)\./i.test(p));
}

// Broad, documented stop-word list: function words + generic screenplay
// scaffolding vocabulary that recurs in nearly every script regardless of
// craft (sluglines, time-of-day, camera-neutral connective tissue).
const STOP_WORDS = new Set<string>([
  'the', 'a', 'an', 'and', 'but', 'or', 'nor', 'so', 'yet', 'for',
  'to', 'of', 'in', 'on', 'at', 'by', 'with', 'from', 'as', 'into',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'him', 'her', 'them',
  'his', 'hers', 'its', 'our', 'their', 'my', 'your',
  'this', 'that', 'these', 'those', 'there', 'here',
  'not', 'no', 'yes', 'do', 'does', 'did', 'done',
  'have', 'has', 'had', 'will', 'would', 'shall', 'should', 'can', 'could',
  'may', 'might', 'must', 'just', 'now', 'then', 'than', 'too', 'also',
  'up', 'down', 'out', 'off', 'over', 'under', 'again', 'still',
  'int', 'ext', 'day', 'night', 'continuous', 'later', 'morning',
  'evening', 'cut', 'fade', 'about', 'what', 'who', 'when', 'where', 'why',
  'how', 'all', 'any', 'each', 'if', 'because', 'get', 'got', 'go', 'goes',
  'going', 'went', 'look', 'looks', 'looking', 'looked', 'one', 'like',
]);

/** Tokenize scene body text (heading excluded) into lowercase content words. */
function contentTokens(sceneText: string): string[] {
  const lines = sceneText.split('\n');
  const bodyLines = lines.slice(1); // drop scene heading
  const words: string[] = [];
  for (const raw of bodyLines) {
    const line = raw.trim();
    if (!line) continue;
    if (isDialogueCueLine(line)) continue; // skip the cue line itself
    const matches = line.toLowerCase().match(/[a-z][a-z']*/g);
    if (matches) words.push(...matches);
  }
  return words;
}

function collectCueNames(fountain: string): Set<string> {
  const names = new Set<string>();
  for (const raw of fountain.split('\n')) {
    const line = raw.trim();
    if (isDialogueCueLine(line)) {
      const name = extractCueName(line);
      if (name) names.add(name);
      // Also register individual words of multi-word names (e.g. "JOHN SMITH").
      if (name) for (const w of name.split(/\s+/)) if (w) names.add(w);
    }
  }
  return names;
}

/** Build 1..3-gram distinctive phrase candidates from a token list. */
function phrasesFromTokens(tokens: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    out.push(tokens[i]);
    if (i + 1 < tokens.length) out.push(`${tokens[i]} ${tokens[i + 1]}`);
    if (i + 2 < tokens.length) out.push(`${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`);
  }
  return out;
}

function isDistinctive(phrase: string, cueNames: Set<string>): boolean {
  const words = phrase.split(' ');
  if (words.length === 0) return false;
  // Every word in a qualifying phrase must be non-stop-word and non-name.
  for (const w of words) {
    if (w.length < 3) return false; // too short to be meaningful (also kills stray letters)
    if (STOP_WORDS.has(w)) return false;
    if (cueNames.has(w)) return false;
  }
  return true;
}

/**
 * Detect pattern-establishment (rule-of-three / running motif) excellence
 * signal. Guards: empty input, no scene headings, < MIN_SCENES scenes, or no
 * qualifying motif all abstain (scored:false, motifs:[]).
 */
export function detectPatternEstablishment(fountain: string): PatternReport {
  if (typeof fountain !== 'string' || fountain.trim().length === 0) {
    return { motifs: [], motifCount: 0, strength: 0, scored: false };
  }

  const scenes = scenesFromFountain(fountain);
  const n = scenes.length;
  if (n < MIN_SCENES) {
    return { motifs: [], motifCount: 0, strength: 0, scored: false };
  }

  const cueNames = collectCueNames(fountain);

  // phrase -> scene indices it appears in (dedup within a scene handled via Set per scene)
  const phraseScenes = new Map<string, Set<number>>();
  const phraseOccurrences = new Map<string, number>();

  for (let sceneIdx = 0; sceneIdx < n; sceneIdx++) {
    const tokens = contentTokens(scenes[sceneIdx]);
    if (tokens.length === 0) continue;
    const phrases = phrasesFromTokens(tokens);
    // Count per-scene occurrences (a phrase repeated within a scene still
    // only counts once toward sceneSpread but adds to raw occurrences).
    const seenThisScene = new Map<string, number>();
    for (const p of phrases) {
      if (!isDistinctive(p, cueNames)) continue;
      seenThisScene.set(p, (seenThisScene.get(p) ?? 0) + 1);
    }
    for (const [p, count] of seenThisScene) {
      phraseOccurrences.set(p, (phraseOccurrences.get(p) ?? 0) + count);
      const set = phraseScenes.get(p) ?? new Set<number>();
      set.add(sceneIdx);
      phraseScenes.set(p, set);
    }
  }

  const candidates: Motif[] = [];
  for (const [token, occurrences] of phraseOccurrences) {
    if (occurrences < 3) continue;
    const sceneSpread = phraseScenes.get(token)?.size ?? 0;
    if (sceneSpread < 3) continue; // spread guard: not all clustered in one/two scenes
    candidates.push({ token, occurrences, sceneSpread });
  }

  if (candidates.length === 0) {
    return { motifs: [], motifCount: 0, strength: 0, scored: true };
  }

  // Prefer longer (more specific) phrases over their single-word substrings
  // when they co-occur identically, to avoid double-crediting "the same"
  // motif as e.g. both "silver key" and "key". Simple heuristic: drop a
  // single-word candidate if a strictly-longer candidate has an identical
  // scene-index footprint AND contains it as a substring token.
  const filtered = candidates.filter(c => {
    if (c.token.includes(' ')) return true;
    const isSubsumed = candidates.some(other =>
      other.token !== c.token &&
      other.token.split(' ').includes(c.token) &&
      other.sceneSpread === c.sceneSpread &&
      other.occurrences >= c.occurrences,
    );
    return !isSubsumed;
  });

  filtered.sort((a, b) => (b.occurrences * b.sceneSpread) - (a.occurrences * a.sceneSpread));

  // Cap how many distinct motifs we report/credit to keep this a genuine
  // "running motif" signal rather than a bag-of-ngrams dump.
  const motifs = filtered.slice(0, 8);

  // Strength: saturating composite over the motifs found. Each motif
  // contributes based on its scene spread (repetition breadth matters more
  // than raw occurrence count — a single token repeated 50x in one scene
  // cannot farm this), with diminishing returns as more motifs are found.
  let acc = 0;
  for (const m of motifs) {
    const spreadTerm = Math.min(1, m.sceneSpread / n);       // fraction of script touched
    const occTerm = Math.min(1, (m.occurrences - 3) / 7);     // saturates by ~10 occurrences
    acc += 0.5 * spreadTerm + 0.5 * occTerm;
  }
  // Diminishing-returns saturation across multiple motifs (sqrt shape).
  const strength = motifs.length > 0 ? Math.min(1, Math.sqrt(acc / motifs.length) * Math.min(1, 0.4 + 0.2 * motifs.length)) : 0;

  return { motifs, motifCount: motifs.length, strength, scored: true };
}
