// Bonding / affiliation ("oxytocin") excellence signal — ROADMAP §5 detector.
// Deterministic, no LLM. Credits a script for staging genuine interpersonal
// bonding beats between two present characters: cooperation, shared
// vulnerability/trust, physical closeness, and sacrifice/gift-for-another —
// the beats that make an audience attach to a relationship.
//
// NEVER-PADDED: an excellence rule that fires on mediocre/random input is a
// FAILING rule. Guard against single-word false positives by requiring
// CONVERGING evidence — cues from at least two distinct affiliation channels
// in the same scene — AND requiring at least two speaking characters present
// in that scene (a bond needs two parties). Abstain on tiny or single-voice
// scripts where there is no relationship to bond.

export interface BondingBeat {
  sceneIndex: number;
  channels: string[];
  characters: string[];
}

export interface BondingReport {
  bondingBeats: BondingBeat[];
  bondingBeatCount: number;
  ratio: number;      // bonding beats / total scenes
  strength: number;   // 0..1, rises with count + channel diversity, saturating
  scored: boolean;
}

export const BONDING_MIN_SCENES = 6;
export const BONDING_MIN_CHARACTERS = 2;

// Curated affiliation lexicon grouped by channel. Each group is small and
// hand-picked (not copied from any external corpus) so the detector stays a
// defensible lexical signal, not a vibe:
//   - cooperation: joint action / shared effort language.
//   - vulnerability: trust, confession, promise — opening up to another.
//   - closeness: physical proximity/touch that signals affiliation.
//   - sacrifice: giving up something, or staying, for another's sake.
const CHANNELS: Record<string, RegExp[]> = {
  cooperation: [
    /\btogether\b/gi,
    /\bwe'?ll\b/gi,
    /\bour\b/gi,
    /\bside by side\b/gi,
    /\bhelp(?:s|ed|ing)?\s+(?:me|you|him|her|them|us)\b/gi,
    /\bteam\b/gi,
  ],
  vulnerability: [
    /\btrust\b/gi,
    /\bconfide[sd]?\b/gi,
    /\badmit(?:s|ted|ting)?\b/gi,
    /\bpromise[sd]?\b/gi,
    /\bprotect(?:s|ed|ing)?\b/gi,
    /\bafraid to tell\b/gi,
  ],
  closeness: [
    /\bembrace[sd]?\b/gi,
    /\bhold(?:s|ing)?\s+(?:her|him|them|you|me)\b/gi,
    /\bhand\s+in\s+hand\b/gi,
    /\btakes?\s+(?:her|his|their)\s+hand\b/gi,
    /\bclose\s+to\s+(?:her|him|them)\b/gi,
    /\bleans?\s+(?:on|into)\b/gi,
  ],
  sacrifice: [
    /\bsaves?\s+(?:her|him|them|you|me)\b/gi,
    /\bgives?\s+up\b/gi,
    /\bfor\s+you\b/gi,
    /\bstays?\s+with\b/gi,
    /\btakes?\s+(?:the|his|her)\s+(?:blame|fall|hit)\b/gi,
  ],
};

const CHANNEL_NAMES = Object.keys(CHANNELS);

// Dialogue-cue convention shared with anti-slop / excellence-signals: ALL-CAPS
// cue line at start, not a slugline or transition.
const CHARACTER_CUE = /^([A-Z][A-Z0-9\s'-]*[A-Z0-9])(?:\s*\(|$)/;
const NON_CUE_PREFIX = /^(?:INT|EXT|FADE|CUT|TRANSITION|V\.O\.|O\.S\.|CONT'D)/;

function isDialogueCue(line: string): boolean {
  const trimmed = line.trim();
  if (!/^[A-Z]/.test(trimmed)) return false;
  if (NON_CUE_PREFIX.test(trimmed)) return false;
  return CHARACTER_CUE.test(trimmed);
}

function extractCharacterName(line: string): string | null {
  const match = line.trim().match(CHARACTER_CUE);
  if (!match) return null;
  return match[1].trim();
}

/** Split raw Fountain into ordered scene texts (INT./EXT. boundaries). Local,
 * modest re-derivation matching emotional-arc.ts's convention — no import of
 * a private helper. */
function scenesFromFountain(fountain: string): string[] {
  const parts = fountain.split(/^(?=(?:INT|EXT)\.)/mi);
  return parts.filter(p => /^(?:INT|EXT)\./i.test(p));
}

function speakingCharactersInScene(scene: string): Set<string> {
  const chars = new Set<string>();
  for (const line of scene.split('\n')) {
    if (isDialogueCue(line)) {
      const name = extractCharacterName(line);
      if (name) chars.add(name);
    }
  }
  return chars;
}

function channelsPresent(scene: string): string[] {
  const hit: string[] = [];
  for (const name of CHANNEL_NAMES) {
    const patterns = CHANNELS[name];
    const found = patterns.some(pat => {
      pat.lastIndex = 0;
      return pat.test(scene);
    });
    if (found) hit.push(name);
  }
  return hit;
}

/** Detect deterministic bonding/affiliation beats across a Fountain script. */
export function detectBonding(fountain: string): BondingReport {
  const empty: BondingReport = { bondingBeats: [], bondingBeatCount: 0, ratio: 0, strength: 0, scored: false };
  if (!fountain || !fountain.trim()) return empty;

  const scenes = scenesFromFountain(fountain);
  if (scenes.length < BONDING_MIN_SCENES) return empty;

  // Count distinct speaking characters across the whole script — no
  // relationship to bond if fewer than two people ever speak.
  const allCharacters = new Set<string>();
  for (const scene of scenes) {
    for (const c of speakingCharactersInScene(scene)) allCharacters.add(c);
  }
  if (allCharacters.size < BONDING_MIN_CHARACTERS) return empty;

  const bondingBeats: BondingBeat[] = [];
  scenes.forEach((scene, sceneIndex) => {
    const characters = Array.from(speakingCharactersInScene(scene));
    if (characters.length < BONDING_MIN_CHARACTERS) return; // one voice: no bond possible

    const channels = channelsPresent(scene);
    if (channels.length < 2) return; // converging-evidence guard: single channel is noise

    bondingBeats.push({ sceneIndex, channels, characters });
  });

  const bondingBeatCount = bondingBeats.length;
  const ratio = bondingBeatCount / scenes.length;

  // Strength rises with beat count and channel diversity but saturates so a
  // script can't farm the signal by repeating one channel many times.
  const diversitySeen = new Set<string>();
  for (const b of bondingBeats) for (const c of b.channels) diversitySeen.add(c);
  const diversityFactor = diversitySeen.size / CHANNEL_NAMES.length; // 0..1
  const countFactor = 1 - Math.exp(-bondingBeatCount / 4); // saturating in count
  const strength = Math.max(0, Math.min(1, 0.7 * countFactor + 0.3 * diversityFactor));

  return { bondingBeats, bondingBeatCount, ratio, strength, scored: true };
}
