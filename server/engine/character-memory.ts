// Wave 63 — Character Memory Export / Import (P6)
// A character developed in one story carries a full psychological history:
// beliefs, goal stack, theory-of-mind, emotional state, Big-Five / Dark-Triad
// profile, attachment + defense style. This module serialises that history into
// a portable CharacterMemoryBundle and re-hydrates it into another session — so
// a character can be reused across projects without losing who they've become.

import type { Stage } from './Stage.ts';
import type { CharacterSheet } from './types.ts';
import { sanitizeForPrompt } from '../lib/prompt-utils.ts';

export const CHARACTER_BUNDLE_SCHEMA_VERSION = 1;

export interface CharacterMemoryBundle {
  schemaVersion: number;
  exportedAt: number;
  sourceSessionId?: string;
  /** The full psychological sheet — beliefs, goals, ToM, emotion, psychology. */
  sheet: CharacterSheet;
  /** Human-readable one-line summary of the character's arc at export time. */
  arcSummary: string;
}

/** Build a one-line arc summary from the character's current state. */
function summarizeArc(sheet: CharacterSheet): string {
  const beliefCount = sheet.beliefs?.length ?? 0;
  const emotion = sheet.emotionState && sheet.emotionState.dominant !== 'neutral'
    ? `${sheet.emotionState.dominant} (${sheet.emotionState.intensity})`
    : 'composed';
  const terminal = sheet.goalStack?.terminal.description ?? sheet.hidden_motive;
  const achieved = sheet.goalStack
    ? sheet.goalStack.instrumental.filter(g => g.achieved).length
    : 0;
  return `${sheet.name}: ${beliefCount} beliefs, ${achieved} subgoals achieved, currently ${emotion}. Drive: ${terminal}`;
}

/**
 * Export a character's full psychological history as a portable bundle.
 * Returns null if the character is not found in the session.
 */
export function exportCharacter(
  stage: Stage,
  charId: string,
  sourceSessionId?: string,
): CharacterMemoryBundle | null {
  const sheet = stage.getAgent(charId);
  if (!sheet) return null;

  // current_location_id is session-specific — clear it so the importer places
  // the character into a location that exists in the target session.
  const portableSheet: CharacterSheet = { ...sheet, current_location_id: '' };

  return {
    schemaVersion: CHARACTER_BUNDLE_SCHEMA_VERSION,
    exportedAt: Date.now(),
    sourceSessionId,
    sheet: portableSheet,
    arcSummary: summarizeArc(sheet),
  };
}

export interface ImportResult {
  charId: string;
  remapped: boolean;
}

/**
 * Validate that an unknown value is a well-formed CharacterMemoryBundle.
 * Defensive: bundles may be user-uploaded JSON.
 */
export function isCharacterMemoryBundle(v: unknown): v is CharacterMemoryBundle {
  if (!v || typeof v !== 'object') return false;
  const b = v as Record<string, unknown>;
  if (typeof b.schemaVersion !== 'number') return false;
  const s = b.sheet as Record<string, unknown> | undefined;
  if (!s || typeof s !== 'object') return false;
  return typeof s.char_id === 'string'
    && typeof s.name === 'string'
    && typeof s.public_mask === 'string'
    && typeof s.hidden_motive === 'string';
}

/**
 * Import a character bundle into the target session. If the bundle's char_id
 * already exists in the session, a unique suffix is appended (remapped=true) so
 * the existing character is never clobbered.
 *
 * @param targetLocationId  where to place the imported character. Falls back to
 *                          the first location in the session if omitted/invalid.
 */
export function importCharacter(
  stage: Stage,
  bundle: CharacterMemoryBundle,
  targetLocationId?: string,
): ImportResult {
  if (bundle.schemaVersion > CHARACTER_BUNDLE_SCHEMA_VERSION) {
    throw new Error(`Unsupported bundle schemaVersion ${bundle.schemaVersion} (max ${CHARACTER_BUNDLE_SCHEMA_VERSION})`);
  }

  const src = bundle.sheet;

  // Resolve a valid target location.
  const locations = stage.getAllLocations();
  let locationId = targetLocationId && locations.some(l => l.location_id === targetLocationId)
    ? targetLocationId
    : (locations[0]?.location_id ?? '');

  // Resolve char_id collisions so an existing character is never overwritten.
  let charId = src.char_id;
  let remapped = false;
  if (stage.getAgent(charId)) {
    let suffix = 2;
    while (stage.getAgent(`${src.char_id}_${suffix}`)) suffix++;
    charId = `${src.char_id}_${suffix}`;
    remapped = true;
  }

  // Defensive sanitisation: name / mask / motive are injected into LLM prompts.
  const sheet: CharacterSheet = {
    ...src,
    char_id: charId,
    name: sanitizeForPrompt(src.name, 256),
    public_mask: sanitizeForPrompt(src.public_mask, 2000),
    hidden_motive: sanitizeForPrompt(src.hidden_motive, 2000),
    current_location_id: locationId,
    // theory_of_mind references foreign char_ids that don't exist here; clear it
    // so the character re-forms models of whoever is actually in the new story.
    theoryOfMind: {},
  };

  stage.addAgent(sheet);

  // addAgent persists beliefs / goals / psychology but not emotion — restore it
  // separately so the character arrives in the emotional state they left in.
  if (src.emotionState) {
    stage.updateEmotionState(charId, src.emotionState);
  }

  return { charId, remapped };
}
