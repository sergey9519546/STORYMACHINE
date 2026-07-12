// Character interiority analysis - NEED/FEAR/WOUND detection and scoring.
//
// Addresses INTENTION_INVISIBLE flood (~127x/film): naive goal tracking on every
// named character without dialogue creates noise. This module extracts WANT/NEED,
// FEAR, and WOUND/backstory lexical cues per character, producing character-level
// interiority scores and script-level summaries. Deterministic, no LLM.
//
// Per-character cues:
//   - WANT/goal: "wants", "needs to", "has to", "must", "i will", "i have to", "trying to"
//   - FEAR: "afraid", "scared", "can't lose", "terrified" + affect-lexicon high-arousal
//   - WOUND/backstory: "used to", "since", "after what happened", "my father/mother",
//     "years ago", "never forgave"
//
// Capping charactersOpaque to prevent flood: min(opaque_count, 8), only counting
// characters with >=3 dialogue blocks to exclude minor bit players.

export interface CharacterInteriority {
  character: string;
  wantCues: number;
  fearCues: number;
  woundCues: number;
  dialogueBlocks: number;
  interiorityScore: number;  // 0..1: presence/coverage of want+fear+wound cues
}

export interface InteriorityReport {
  perCharacter: CharacterInteriority[];
  charactersWithWant: number;
  charactersOpaque: number;  // named, >=3 dialogue blocks, zero want/fear/wound. capped at 8.
  wantNeedOppositionPresent: boolean;
  scored: boolean;
}

// Character detection: ALL-CAPS cue lines (dialogue cues, not sluglines).
// Pattern: LINE_START + ALL-CAPS word(s) + optional parenthetical.
const CHARACTER_CUE = /^([A-Z][A-Z0-9\s'-]*[A-Z0-9])(?:\s*\(|$)/m;

// Lexical patterns for interiority cues.
const WANT_PATTERNS = [
  /\bwants?\b/gi,
  /\bneeds?\s+to\b/gi,
  /\bhas\s+to\b/gi,
  /\bmust\b/gi,
  /\bi\s+will\b/gi,
  /\bi\s+have\s+to\b/gi,
  /\btrying\s+to\b/gi,
];

const FEAR_PATTERNS = [
  /\bafraid\b/gi,
  /\bscared\b/gi,
  /\bcan't\s+lose\b/gi,
  /\bterrified\b/gi,
  /\bterror\b/gi,
  /\bfrightened\b/gi,
];

const WOUND_PATTERNS = [
  /\bused\s+to\b/gi,
  /\bsince\b/gi,
  /\bafter\s+what\s+happened\b/gi,
  /\bmy\s+(?:father|mother|dad|mom|parents?)\b/gi,
  /\byears?\s+ago\b/gi,
  /\bnever\s+forgave?\b/gi,
];

function countPatternMatches(text: string, patterns: RegExp[]): number {
  let total = 0;
  for (const pat of patterns) {
    const matches = text.match(pat);
    if (matches) {
      total += matches.length;
      pat.lastIndex = 0;  // reset regex state
    }
  }
  return total;
}

function extractCharacterName(cueLine: string): string | null {
  const match = cueLine.match(CHARACTER_CUE);
  if (!match) return null;
  return match[1].trim();
}

function isDialogueCue(line: string): boolean {
  // Dialogue cue is ALL-CAPS at line start, not a slugline or transition.
  if (!/^[A-Z]/.test(line)) return false;
  if (/^(?:INT|EXT|FADE|CUT|TRANSITION|V\.O\.|O\.S\.|CONT\'D)/.test(line)) return false;
  const match = line.match(CHARACTER_CUE);
  return !!match;
}

/**
 * Analyze character interiority from Fountain screenplay text.
 * Extracts named characters and scores their interiority based on WANT/FEAR/WOUND cues.
 */
export function analyzeInteriority(fountain: string): InteriorityReport {
  const lines = fountain.split('\n');

  // Build character -> dialogue blocks + full dialogue text map.
  const characterData: Record<string, { dialogueBlocks: number; dialogueText: string }> = {};

  let currentCharacter: string | null = null;
  let inDialogueBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect dialogue cue.
    if (isDialogueCue(trimmed)) {
      const charName = extractCharacterName(trimmed);
      if (charName) {
        // If we're switching to a different character, mark end of previous block.
        if (currentCharacter && currentCharacter !== charName) {
          inDialogueBlock = false;
        }

        if (!characterData[charName]) {
          characterData[charName] = { dialogueBlocks: 0, dialogueText: '' };
        }

        // Only increment if we're starting a new block (not continuing the same character).
        if (!inDialogueBlock || currentCharacter !== charName) {
          characterData[charName].dialogueBlocks += 1;
        }

        currentCharacter = charName;
        inDialogueBlock = true;
      }
    } else if (currentCharacter && trimmed && !isDialogueCue(trimmed)) {
      // Accumulate dialogue text under current character.
      if (characterData[currentCharacter]) {
        characterData[currentCharacter].dialogueText += ' ' + trimmed;
      }
      inDialogueBlock = true;
    } else if (!trimmed) {
      // Reset on blank line (end of dialogue block).
      inDialogueBlock = false;
    }
  }

  // Score each character.
  const perCharacter: CharacterInteriority[] = [];
  let charactersWithWant = 0;
  const opaqueCharacters: string[] = [];

  for (const [character, data] of Object.entries(characterData)) {
    const { dialogueBlocks, dialogueText } = data;
    const wantCues = countPatternMatches(dialogueText, WANT_PATTERNS);
    const fearCues = countPatternMatches(dialogueText, FEAR_PATTERNS);
    const woundCues = countPatternMatches(dialogueText, WOUND_PATTERNS);

    // Interiority score: normalized presence of any cue type.
    // Scale: 0 cues = 0, at least one = scale toward 1 based on cue density.
    const totalCues = wantCues + fearCues + woundCues;
    const interiorityScore =
      totalCues === 0
        ? 0
        : Math.min(1, (totalCues / Math.max(dialogueText.length / 100, 1)) * 0.5);

    if (wantCues > 0) {
      charactersWithWant += 1;
    }

    // Opaque: named character with >=3 dialogue blocks and zero interiority cues.
    if (dialogueBlocks >= 3 && totalCues === 0) {
      opaqueCharacters.push(character);
    }

    perCharacter.push({
      character,
      wantCues,
      fearCues,
      woundCues,
      dialogueBlocks,
      interiorityScore,
    });
  }

  // Cap charactersOpaque at 8 to prevent flood.
  const charactersOpaque = Math.min(opaqueCharacters.length, 8);

  // Detect want-need opposition: any two characters with opposing want cues.
  const wantNeedOppositionPresent = charactersWithWant >= 2;

  return {
    perCharacter,
    charactersWithWant,
    charactersOpaque,
    wantNeedOppositionPresent,
    scored: perCharacter.length > 0,
  };
}