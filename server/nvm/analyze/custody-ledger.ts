// Object-custody ledger (ULTRAPLAN Phase 3, minimal deterministic layer).
//
// Tracks named object possession across scenes: introduced → possessed-by →
// transferred/taken → used. This deterministic layer lexically detects object
// mentions and custody verbs (takes, hands, drops, hides, picks up) to build
// a per-object chain of scene-by-scene custody. Semantic "ownership vs. temporary
// access" is deferred; this substrate reports who had access to an object by scene.
// Open-world: ENTAILED via direct custody transaction; else UNKNOWN. CONTRADICTED
// reserved for the semantic layer.

import type { SupportState } from '../proof/surfacing.ts';

const SLUG = /^\s*(?:INT|EXT|INT\.?\/EXT|I\/E|EST)[.\s]/i;
const TRANS = /^\s*(?:CUT TO:|FADE (?:IN|OUT)|DISSOLVE TO:|SMASH CUT|MATCH CUT|BACK TO)/i;
const CUE = /^\s{0,}([A-Z][A-Z0-9 .'\-]{0,30})\s*(?:\(.*\))?\s*$/;

// Custody verbs indicating transfer, holding, or action on a tracked object.
// Whitelist: only direct possession actions count for entry into the ledger.
const CUSTODY_VERBS_PATTERN = /\b(takes?|picks?\s+up|hands?|drops?|hides?|grabs?|holds?|carries?)\b/i;

export interface CustodyEntry {
  scene: number;
  holder: string | null;
  action: string;
}

export interface CustodyLedger {
  /** object name → [{ scene, holder, action }] per scene where action detected */
  byObject: Record<string, Array<CustodyEntry>>;
  scored: boolean;
}

/** Build the custody ledger from ordered Fountain scene texts and tracked objects.
 *  Deterministic, lexical: detects custody verbs in action/dialogue lines and
 *  associates them with the most recent character cue context.
 */
export function buildCustodyLedger(
  sceneTexts: readonly string[],
  objects: readonly string[],
): CustodyLedger {
  const byObject: Record<string, Array<CustodyEntry>> = {};

  // Initialize ledger entries for tracked objects
  for (const obj of objects) {
    byObject[obj] = [];
  }

  // If no objects to track, abstain
  if (objects.length === 0) {
    return { byObject, scored: false };
  }

  // Process scenes in order
  for (let sceneIdx = 0; sceneIdx < sceneTexts.length; sceneIdx++) {
    const scene = sceneTexts[sceneIdx];
    const lines = scene.split('\n');

    // Track most recent character in this scene (for action context)
    let lastCharacter: string | null = null;

    for (const raw of lines) {
      const line = raw.trim();
      if (!line || SLUG.test(line) || TRANS.test(line)) continue;

      // Update character context if this is a cue
      const cueMatcher = CUE.exec(line);
      if (cueMatcher && cueMatcher[1].split(/\s+/).length <= 4) {
        lastCharacter = cueMatcher[1].trim().toUpperCase();
        continue;
      }

      // Check this line for custody verbs + object mentions
      for (const obj of objects) {
        // Case-insensitive search: object name in line + custody verb nearby
        const objRegex = new RegExp(`(the\\s+)?\\b${obj}\\b`, 'i');
        if (!objRegex.test(line)) continue;

        // Found object; check for custody verb on same line
        if (CUSTODY_VERBS_PATTERN.test(line) && lastCharacter) {
          const verbMatch = CUSTODY_VERBS_PATTERN.exec(line);
          const action = verbMatch ? verbMatch[1].toLowerCase() : 'handles';
          byObject[obj].push({
            scene: sceneIdx,
            holder: lastCharacter,
            action,
          });
        }
      }
    }
  }

  // Scoring: require at least 2 scenes and some custody events detected
  const anyActivity = Object.values(byObject).some(entries => entries.length > 0);
  const scored = sceneTexts.length >= 2 && anyActivity;

  return { byObject, scored };
}

/** Could `character` plausibly possess/use `object` by `atScene`?
 *  Open-world: ENTAILED if the character is recorded in the custody chain
 *  by that scene; UNKNOWN if no custody transaction is found. Absence is
 *  not a negative fact (open-world).
 */
export function canUse(
  ledger: CustodyLedger,
  object: string,
  character: string,
  atScene: number,
): SupportState {
  if (!ledger.scored) return 'UNKNOWN';
  if (atScene < 0) return 'UNKNOWN';

  const chain = ledger.byObject[object];
  if (!chain || chain.length === 0) return 'UNKNOWN';

  // Any custody entry at or before atScene where character holds the object
  for (const entry of chain) {
    if (entry.scene <= atScene && entry.holder === character) {
      return 'ENTAILED';
    }
  }

  return 'UNKNOWN';
}
