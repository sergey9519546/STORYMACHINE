// Excellence signals — ROADMAP Tier-1 excellence detectors for earned strengths.
// Deterministic, no LLM. Returns presence + evidence for positive signals.
//
// NEVER-PADDED: an excellence rule that fires on mediocre input is a FAILING rule.
// Conservative default: flag a signal as present only on clear, high-confidence evidence.
// Abstain on tiny input.

export interface Signal {
  id: string;
  present: boolean;
  confidence: number;  // 0..1: strength of evidence
  evidence: string;    // human-readable justification
}

export interface ExcellenceSignals {
  signals: Signal[];
  scored: boolean;     // false if input too small to evaluate
}

// Character detection: ALL-CAPS cue lines (dialogue cues, not sluglines).
const CHARACTER_CUE = /^([A-Z][A-Z0-9\s'-]*[A-Z0-9])(?:\s*\(|$)/m;

// External want/goal patterns: explicit goal statements.
const WANT_PATTERNS = [
  /\bwants?\s+to\b/gi,
  /\bneeds?\s+to\b/gi,
  /\bhas\s+to\b/gi,
  /\bmust\b/gi,
  /\bi\s+(?:will|have\s+to|need\s+to)\b/gi,
  /\btrying\s+to\b/gi,
];

// Internal need/conflict patterns: fears, contradictions, blocked desires.
const NEED_PATTERNS = [
  /\bafraid\b/gi,
  /\bscared\b/gi,
  /\bterrified\b/gi,
  /\bcan't\b/gi,
  /\bcouldn't\b/gi,
  /\bwon't\b/gi,
  /\bwouldn't\b/gi,
  /\bimpossible\b/gi,
  /\bstuck\b/gi,
  /\btrapped\b/gi,
];

// Opposition reasoning patterns: coherent position, justification, thematic claim.
const REASONING_PATTERNS = [
  /\bbecause\b/gi,
  /\breason\b/gi,
  /\bnecessary\b/gi,
  /\bjustified?\b/gi,
  /\bneed\s+to\b/gi,
  /\bhave\s+to\b/gi,
  /\bmust\b/gi,
  /\b(?:believe|think|understand)\b/gi,
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
 * Detects when protagonist's external WANT (goal) is in tension with
 * internal NEED (conflict/fear). Hallmark of strong character writing (want ≠ need).
 *
 * Presence: both want and need cues detected in lead character's dialogue.
 * Evidence: specific cue counts and character name.
 */
function wantNeedOpposition(fountain: string): Signal {
  const lines = fountain.split('\n');

  // Map characters to their dialogue blocks and full dialogue text.
  const characterData: Record<string, { dialogueBlocks: number; dialogueText: string }> = {};
  let currentCharacter: string | null = null;
  let inDialogueBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (isDialogueCue(trimmed)) {
      const charName = extractCharacterName(trimmed);
      if (charName) {
        if (currentCharacter && currentCharacter !== charName) {
          inDialogueBlock = false;
        }

        if (!characterData[charName]) {
          characterData[charName] = { dialogueBlocks: 0, dialogueText: '' };
        }

        if (!inDialogueBlock || currentCharacter !== charName) {
          characterData[charName].dialogueBlocks += 1;
        }

        currentCharacter = charName;
        inDialogueBlock = true;
      }
    } else if (currentCharacter && trimmed && !isDialogueCue(trimmed)) {
      if (characterData[currentCharacter]) {
        characterData[currentCharacter].dialogueText += ' ' + trimmed;
      }
      inDialogueBlock = true;
    } else if (!trimmed) {
      inDialogueBlock = false;
    }
  }

  // Find protagonist: most-speaking character with >=3 dialogue blocks.
  const mainCharacters = Object.entries(characterData)
    .filter(([_, data]) => data.dialogueBlocks >= 3)
    .sort((a, b) => b[1].dialogueBlocks - a[1].dialogueBlocks);

  if (mainCharacters.length === 0) {
    return {
      id: 'wantNeedOpposition',
      present: false,
      confidence: 0,
      evidence: 'No character with sufficient dialogue to analyze.',
    };
  }

  const protagonistName = mainCharacters[0][0];
  const protagonistText = mainCharacters[0][1].dialogueText;

  const wantCount = countPatternMatches(protagonistText, WANT_PATTERNS);
  const needCount = countPatternMatches(protagonistText, NEED_PATTERNS);

  // Conservative: require BOTH want and need cues present, with reasonable frequency.
  // Confidence scales with cue strength: (want=0.6, need=0.4 weighting).
  if (wantCount >= 1 && needCount >= 1) {
    const confidence = Math.min(0.95, (wantCount * 0.6 + needCount * 0.4) / 4);
    return {
      id: 'wantNeedOpposition',
      present: true,
      confidence,
      evidence: `"${protagonistName}" expresses ${wantCount} external goal(s) and ${needCount} internal conflict cue(s), suggesting want-need tension.`,
    };
  }

  return {
    id: 'wantNeedOpposition',
    present: false,
    confidence: 0,
    evidence: 'No tension between protagonist want and internal need detected.',
  };
}

/**
 * Detects whether antagonist/opposition is given defensible thematic claim
 * (reasoning, justification) rather than pure-evil villainy.
 *
 * Presence: opposition character makes reasoned arguments and has clear motivations.
 * Evidence: specific reasoning cue counts and character name.
 */
function antagonistDefensibility(fountain: string): Signal {
  const lines = fountain.split('\n');

  // Map characters to dialogue data.
  const characterData: Record<string, { dialogueBlocks: number; dialogueText: string }> = {};
  let currentCharacter: string | null = null;
  let inDialogueBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (isDialogueCue(trimmed)) {
      const charName = extractCharacterName(trimmed);
      if (charName) {
        if (currentCharacter && currentCharacter !== charName) {
          inDialogueBlock = false;
        }

        if (!characterData[charName]) {
          characterData[charName] = { dialogueBlocks: 0, dialogueText: '' };
        }

        if (!inDialogueBlock || currentCharacter !== charName) {
          characterData[charName].dialogueBlocks += 1;
        }

        currentCharacter = charName;
        inDialogueBlock = true;
      }
    } else if (currentCharacter && trimmed && !isDialogueCue(trimmed)) {
      if (characterData[currentCharacter]) {
        characterData[currentCharacter].dialogueText += ' ' + trimmed;
      }
      inDialogueBlock = true;
    } else if (!trimmed) {
      inDialogueBlock = false;
    }
  }

  // Find major characters: those with >=2 dialogue blocks.
  const majorChars = Object.entries(characterData)
    .filter(([_, data]) => data.dialogueBlocks >= 2)
    .sort((a, b) => b[1].dialogueBlocks - a[1].dialogueBlocks);

  if (majorChars.length < 1) {
    return {
      id: 'antagonistDefensibility',
      present: false,
      confidence: 0,
      evidence: 'No character with sufficient dialogue to evaluate.',
    };
  }

  // Find the strongest-reasoned character among major characters.
  // Score each by reasoning cue density.
  let bestChar = majorChars[0];
  let bestReasoningCount = countPatternMatches(majorChars[0][1].dialogueText, REASONING_PATTERNS);

  for (let i = 1; i < majorChars.length; i++) {
    const reasoningCount = countPatternMatches(majorChars[i][1].dialogueText, REASONING_PATTERNS);
    if (reasoningCount > bestReasoningCount) {
      bestReasoningCount = reasoningCount;
      bestChar = majorChars[i];
    }
  }

  const antagonistName = bestChar[0];
  const antagonistText = bestChar[1].dialogueText;

  const reasoningCount = countPatternMatches(antagonistText, REASONING_PATTERNS);

  // Conservative: require strong reasoning presence (3+) to indicate defensible thematic claim.
  // Never-padded: only fire on clear evidence of coherent thematic position, not mediocre dialogue.
  // A character making multiple arguments has a coherent position; pure evil or shallow dialogue gives none.
  if (reasoningCount >= 3) {
    const confidence = Math.min(0.95, reasoningCount / 6);
    return {
      id: 'antagonistDefensibility',
      present: true,
      confidence,
      evidence: `Opposition character "${antagonistName}" articulates ${reasoningCount} reasoning/justification cue(s), indicating defensible thematic claim.`,
    };
  }

  return {
    id: 'antagonistDefensibility',
    present: false,
    confidence: 0,
    evidence: 'No character with strong reasoning cues (defensible position) detected.',
  };
}

/**
 * Detect excellence signals in a screenplay.
 * Conservative, never-padded: defaults to NOT present unless clear evidence.
 * Abstains (scored=false) on input < 500 chars.
 *
 * Returns structured signal detections with presence, confidence, and evidence.
 */
export function detectExcellence(fountain: string): ExcellenceSignals {
  // Abstain on tiny input.
  if (!fountain || fountain.trim().length < 500) {
    return {
      signals: [],
      scored: false,
    };
  }

  const signals: Signal[] = [
    wantNeedOpposition(fountain),
    antagonistDefensibility(fountain),
  ];

  return {
    signals,
    scored: true,
  };
}
