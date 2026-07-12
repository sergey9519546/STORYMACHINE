// Silence / Subtext excellence signal — ROADMAP §5 "silence detector".
// Deterministic, no LLM. Credits a script for crafted ACTION-ONLY (wordless)
// beats at structurally meaningful positions — a hallmark of visual
// storytelling and subtext ("show, don't tell").
//
// NEVER-PADDED: an excellence rule that fires on mediocre/random input is a
// FAILING rule. A scene is only credited as a "crafted silent beat" when it
// is (a) genuinely action-only — no character dialogue at all — (b)
// SUBSTANTIAL (a real described beat, not a one-line fragment), and (c)
// sitting at a position where wordless staging actually carries narrative
// weight (open / mid / close). A scene that is short merely because it is
// underwritten is NOT a crafted silence, so the minimum word bar exists to
// keep noise out. The module also abstains entirely on documents too small
// to judge, or on documents with zero dialogue anywhere (not screenplays in
// the intended sense — "using silence for subtext" presumes a baseline of
// speech to fall silent against).

const MIN_SCENES_TO_SCORE = 6;
const MIN_SUBSTANTIAL_ACTION_WORDS = 25;
const OPEN_CLOSE_BAND = 0.15; // opening/closing 15% of the script
const MID_BAND = 0.08;        // band around the midpoint counted as "mid"

export type SilencePosition = 'open' | 'mid' | 'close' | 'body';

export interface SilentBeat {
  sceneIndex: number;
  actionWords: number;
  position: SilencePosition;
}

export interface SilenceReport {
  silentBeats: SilentBeat[];
  craftedSilentBeatCount: number;
  ratio: number;
  strength: number;
  scored: boolean;
}

const tokenize = (s: string): string[] => s.toLowerCase().match(/[a-z][a-z']+/g) ?? [];

/** Split raw Fountain into ordered scene texts (INT./EXT. boundaries). Local re-derivation. */
function scenesFromFountain(fountain: string): string[] {
  const parts = fountain.split(/^(?=(?:INT|EXT)\.)/mi);
  return parts.filter(p => /^(?:INT|EXT)\./i.test(p));
}

/**
 * Determine whether a trimmed non-empty line is a dialogue character cue,
 * using the same convention as dialogue-info-ratio.ts: ALL-CAPS word/phrase
 * at line start, under 80 chars, excluding sluglines/transitions.
 */
function isCharacterCueLine(trimmed: string): boolean {
  if (!trimmed) return false;
  if (trimmed.startsWith('(')) return false;
  if (/^(?:INT|EXT|FADE|CUT|TRANSITION|V\.O\.|O\.S\.|CONT'D)/i.test(trimmed)) return false;
  return /^[A-Z][A-Z\s.'-]*$/.test(trimmed) && trimmed.length < 80;
}

/**
 * Classify a scene as dialogue-bearing or action-only, and count action words
 * (words in non-cue, non-parenthetical lines, excluding the slugline itself).
 */
function classifyScene(sceneText: string): { hasDialogue: boolean; actionWords: number } {
  const lines = sceneText.split(/\r?\n/);
  let hasDialogue = false;
  let actionWordCount = 0;
  let firstNonEmptySeen = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Skip the slugline (first non-empty line of the scene, e.g. INT. ROOM - DAY).
    if (!firstNonEmptySeen) {
      firstNonEmptySeen = true;
      if (/^(?:INT|EXT)\./i.test(trimmed)) continue;
    }

    if (trimmed.startsWith('(')) continue; // parenthetical — not counted either way

    if (isCharacterCueLine(trimmed)) {
      hasDialogue = true;
      continue;
    }

    // Action/description line.
    actionWordCount += tokenize(trimmed).length;
  }

  return { hasDialogue, actionWords: actionWordCount };
}

function positionFor(sceneIndex: number, total: number): SilencePosition {
  if (total <= 1) return 'open';
  const frac = sceneIndex / (total - 1);
  if (frac <= OPEN_CLOSE_BAND) return 'open';
  if (frac >= 1 - OPEN_CLOSE_BAND) return 'close';
  if (Math.abs(frac - 0.5) <= MID_BAND) return 'mid';
  return 'body';
}

const POSITION_WEIGHT: Record<SilencePosition, number> = {
  open: 1.0,
  mid: 0.9,
  close: 1.0,
  body: 0.35,
};

/**
 * Detect crafted silent / wordless beats used for subtext.
 * Pure + deterministic. Abstains (scored=false, silentBeats=[]) when there
 * are too few scenes to judge structural position, or when the document has
 * no dialogue anywhere (not a screenplay in the intended sense for this
 * signal — nothing to "fall silent" against).
 */
export function detectSilence(fountain: string): SilenceReport {
  if (!fountain || !fountain.trim()) {
    return { silentBeats: [], craftedSilentBeatCount: 0, ratio: 0, strength: 0, scored: false };
  }

  const scenes = scenesFromFountain(fountain);

  if (scenes.length < MIN_SCENES_TO_SCORE) {
    return { silentBeats: [], craftedSilentBeatCount: 0, ratio: 0, strength: 0, scored: false };
  }

  const classified = scenes.map(classifyScene);
  const anyDialogue = classified.some(c => c.hasDialogue);

  // Abstain on all-action documents — no dialogue baseline for silence to
  // contrast against, so "using silence for subtext" cannot be credited.
  if (!anyDialogue) {
    return { silentBeats: [], craftedSilentBeatCount: 0, ratio: 0, strength: 0, scored: false };
  }

  const total = scenes.length;
  const actionOnlyScenes = classified.filter(c => !c.hasDialogue).length;
  const ratio = actionOnlyScenes / total;

  const silentBeats: SilentBeat[] = [];
  for (let i = 0; i < total; i++) {
    const { hasDialogue, actionWords } = classified[i];
    if (hasDialogue) continue;
    if (actionWords < MIN_SUBSTANTIAL_ACTION_WORDS) continue; // too thin — not crafted

    const position = positionFor(i, total);
    if (position === 'body') continue; // must sit at a meaningful position

    silentBeats.push({ sceneIndex: i, actionWords, position });
  }

  const craftedSilentBeatCount = silentBeats.length;

  // Bounded [0,1] composite: each crafted beat contributes, weighted by
  // position importance and a saturating function of its action-word depth,
  // normalized against total scene count so a long script isn't unfairly
  // penalized for needing more beats to reach the same strength.
  let raw = 0;
  for (const beat of silentBeats) {
    const depthFactor = Math.min(1, beat.actionWords / (MIN_SUBSTANTIAL_ACTION_WORDS * 3));
    raw += POSITION_WEIGHT[beat.position] * (0.5 + 0.5 * depthFactor);
  }
  const normalizer = Math.max(3, Math.min(total, 6)); // cap credit growth, avoid over-rewarding huge scripts
  const strength = craftedSilentBeatCount === 0 ? 0 : Math.min(1, raw / normalizer);

  return {
    silentBeats,
    craftedSilentBeatCount,
    ratio,
    strength,
    scored: true,
  };
}
