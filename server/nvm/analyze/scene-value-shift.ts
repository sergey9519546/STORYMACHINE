// Scene-value-shift signal — OASIS §30 scene-contract detectors (task #71).
// Deterministic, no LLM.
//
// A scene "works" when it carries a VALUE from one charge to another (McKee's
// scene-value-shift contract): the emotional charge at the top of the scene
// differs from the charge at the bottom. This module re-derives a LOCAL scene
// splitter (mirrors emotional-arc.ts's INT./EXT. boundary approach) and a
// compact valence lexicon (mirrors emotional-arc.ts's per-scene VAD approach,
// scoped small and local rather than importing the shared 12k-word lexicon,
// since we only need first-third vs last-third valence, not full arc shape).
//
// Three checks:
//  - valueShift: does opening valence -> closing valence flip sign or move by
//    a material amount within the scene?
//  - boring-but-correct: no value shift AND low pressure/subtext markers AND
//    the scene is short/thin — technically fine, but inert.
//  - cool-but-wrong: high action-density/spectacle markers but no value shift
//    and no causal connective ("because/so/therefore") while a paratactic
//    "and then" chain is present — stylish, but incoherent/inert.
//
// NEVER-PADDED: conservative thresholds, abstain on tiny input (<6 scenes,
// matching EMOTIONAL_ARC_MIN_SCENES's precedent for position-aware signals).

export interface SceneValueShiftEntry {
  sceneIndex: number;
  openingValence: number;
  closingValence: number;
  shifted: boolean;
}

export interface SceneValueShiftResult {
  scenes: SceneValueShiftEntry[];
  shiftRatio: number;
  boringButCorrect: number[];
  coolButWrong: number[];
  strength: number;
  scored: boolean;
}

export const SCENE_VALUE_SHIFT_MIN_SCENES = 6;

// Compact local valence lexicon — deliberately small and self-contained
// (this module does not need full arc-shape fidelity, only a first-third vs
// last-third comparison per scene).
const POSITIVE_WORDS = new Set([
  'happy', 'joy', 'joyful', 'love', 'loves', 'loved', 'hope', 'hopeful',
  'relief', 'relieved', 'safe', 'safety', 'win', 'wins', 'won', 'victory',
  'smile', 'smiles', 'smiling', 'laugh', 'laughs', 'laughing', 'good',
  'great', 'wonderful', 'triumph', 'triumphant', 'peace', 'calm', 'gentle',
  'warm', 'warmth', 'trust', 'trusts', 'trusted', 'proud', 'pride',
  'grateful', 'thankful', 'beautiful', 'free', 'freedom', 'success',
  'reunite', 'reunited', 'embrace', 'embraces', 'kind', 'kindness',
]);
const NEGATIVE_WORDS = new Set([
  'sad', 'sadness', 'fear', 'fears', 'feared', 'afraid', 'scared',
  'terrified', 'terror', 'angry', 'anger', 'rage', 'furious', 'hate',
  'hates', 'hated', 'grief', 'despair', 'hopeless', 'lost', 'lose',
  'loses', 'died', 'dead', 'death', 'dying', 'betray', 'betrayed',
  'betrayal', 'alone', 'lonely', 'pain', 'painful', 'hurt', 'hurts',
  'panic', 'dread', 'threat', 'threatens', 'threatened', 'danger',
  'dangerous', 'trapped', 'stuck', 'broken', 'cry', 'cries', 'crying',
  'scream', 'screams', 'screaming', 'sorry', 'guilt', 'guilty', 'shame',
  'ashamed', 'kill', 'kills', 'killed', 'blood', 'bleeding', 'wound',
  'wounded', 'fail', 'fails', 'failed', 'failure', 'crushed', 'shattered',
]);

const tokenize = (s: string): string[] => s.toLowerCase().match(/[a-z][a-z']+/g) ?? [];

function valenceOf(words: string[]): number {
  if (words.length === 0) return 0;
  let score = 0, matched = 0;
  for (const w of words) {
    if (POSITIVE_WORDS.has(w)) { score += 1; matched++; }
    else if (NEGATIVE_WORDS.has(w)) { score -= 1; matched++; }
  }
  return matched ? score / matched : 0;
}

/** Split raw Fountain into ordered scene texts on INT./EXT. boundaries. */
function scenesFromFountainLocal(fountain: string): string[] {
  const parts = fountain.split(/^(?=(?:INT|EXT)\.)/mi);
  return parts.filter(p => /^(?:INT|EXT)\./i.test(p));
}

const SHIFT_THRESHOLD = 0.15;

// Pressure/subtext markers — presence of implication, restraint, unspoken
// tension (used by boring-but-correct to distinguish "quiet but charged"
// from "quiet and inert").
const PRESSURE_PATTERNS = [
  /\bbut\b/gi,
  /\bthough\b/gi,
  /\bsilence\b/gi,
  /\bpause[sd]?\b/gi,
  /\bhesitat\w*/gi,
  /\bunspoken\b/gi,
  /\bwon't\b/gi,
  /\bcan't\b/gi,
  /\bshould\b/gi,
];

// Action-density/spectacle markers — a scene reads as kinetic/showy.
const SPECTACLE_PATTERNS = [
  /\bexplo\w*/gi,
  /\bcrash\w*/gi,
  /\bgunfire\b/gi,
  /\bchase\b/gi,
  /\bfight\w*/gi,
  /\bshatter\w*/gi,
  /\bslam\w*/gi,
  /\bblast\w*/gi,
  /\bfire\b/gi,
  /\bspeed\w*/gi,
];

// Causal connectives — the scene reasons about why events follow one another.
const CAUSAL_PATTERN = /\b(?:because|therefore|so that|so,|so\s|thus|hence)\b/i;
// Paratactic "and then" chaining — event after event, no causation stated.
const AND_THEN_PATTERN = /\band\s+then\b/i;

function countMatches(text: string, patterns: RegExp[]): number {
  let total = 0;
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m) total += m.length;
    pat.lastIndex = 0;
  }
  return total;
}

/**
 * Detects per-scene emotional VALUE shift (opening -> closing valence),
 * plus two derived scene-contract flags: boring-but-correct (inert, no
 * shift, low pressure, thin) and cool-but-wrong (spectacle without shift
 * or causal coherence).
 *
 * Guards: empty input, no INT./EXT. headings, and single-scene scripts all
 * return scored:false with empty arrays rather than throwing or dividing by
 * zero. Scoring (scored:true) requires at least SCENE_VALUE_SHIFT_MIN_SCENES
 * comprehended scenes, mirroring emotional-arc.ts's position-aware precedent.
 */
export function detectSceneValueShift(fountain: string): SceneValueShiftResult {
  const empty: SceneValueShiftResult = {
    scenes: [], shiftRatio: 0, boringButCorrect: [], coolButWrong: [], strength: 0, scored: false,
  };
  if (typeof fountain !== 'string' || fountain.trim().length === 0) return empty;

  const sceneTexts = scenesFromFountainLocal(fountain);
  if (sceneTexts.length < SCENE_VALUE_SHIFT_MIN_SCENES) return empty;

  const scenes: SceneValueShiftEntry[] = [];
  const boringButCorrect: number[] = [];
  const coolButWrong: number[] = [];

  sceneTexts.forEach((sceneText, i) => {
    const words = tokenize(sceneText);
    const n = words.length;

    let openingValence = 0;
    let closingValence = 0;
    if (n > 0) {
      const third = Math.max(1, Math.floor(n / 3));
      const openingWords = words.slice(0, third);
      const closingWords = words.slice(Math.max(0, n - third));
      openingValence = valenceOf(openingWords);
      closingValence = valenceOf(closingWords);
    }

    const signFlip = (openingValence > 0 && closingValence < 0) || (openingValence < 0 && closingValence > 0);
    const materialDelta = Math.abs(closingValence - openingValence) >= SHIFT_THRESHOLD;
    const shifted = signFlip || materialDelta;

    scenes.push({ sceneIndex: i, openingValence, closingValence, shifted });

    const pressureCount = countMatches(sceneText, PRESSURE_PATTERNS);
    const isThin = n > 0 && n < 60; // short/low-information scene
    const spectacleCount = countMatches(sceneText, SPECTACLE_PATTERNS);
    const hasCausal = CAUSAL_PATTERN.test(sceneText);
    const hasAndThen = AND_THEN_PATTERN.test(sceneText);
    const isCoolButWrong = !shifted && spectacleCount >= 2 && !hasCausal && hasAndThen;

    if (isCoolButWrong) {
      // Spectacle-without-shift is a distinct failure mode from inert
      // quietness — classify mutually exclusively so a scene isn't double-
      // counted under both flags.
      coolButWrong.push(i);
    } else if (!shifted && pressureCount === 0 && isThin) {
      boringButCorrect.push(i);
    }
  });

  const shiftRatio = scenes.length ? scenes.filter(s => s.shifted).length / scenes.length : 0;
  const strength = Math.max(0, Math.min(1, shiftRatio));

  return { scenes, shiftRatio, boringButCorrect, coolButWrong, strength, scored: true };
}
