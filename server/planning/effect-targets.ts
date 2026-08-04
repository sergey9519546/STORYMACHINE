// ── Effect Target Resolution ─────────────────────────────────────────────────
// Single source of truth for the actor/target/both/all convention used to map a
// symbolic emotional/audience effect target onto concrete character ids.
//
// Convention (see examples.ts / emotional-effects-library.ts):
//   action.parameters[0] is the actor, action.parameters[1] is the target.
//
//   'all'    → every character with tracked emotional state
//   'actor'  → parameters[0] (empty if absent)
//   'target' → parameters[1] (empty if absent)
//   'both'   → [actor, target], dropping any that are absent
//   <id>     → that literal character id
//
// This replaces three byte-identical hand-rolled resolvers previously inlined in
// apdl-planner.ts (resolveCharacterTargets), oasis-integration.ts
// (resolveCharacters) and apdl-validator.ts (applyActionEmotionalEffects). All
// three now delegate here so the convention lives in exactly one place.

import type { APDLAction, CharacterId } from './apdl';

/**
 * Resolve a symbolic effect target ('all' | 'actor' | 'target' | 'both') or a
 * literal character id into the concrete list of character ids it applies to.
 *
 * @param target - The effect's `character` field: a symbolic keyword or literal id.
 * @param action - The action supplying the actor/target positional parameters.
 * @param allIds - Thunk yielding every tracked character id (for 'all'); callers
 *                 typically pass `() => state.emotional_state.keys()`.
 */
export function resolveEffectTargets(
  target: string,
  action: APDLAction,
  allIds: () => Iterable<CharacterId>
): CharacterId[] {
  if (target === 'all') {
    return Array.from(allIds());
  }

  if (target === 'both' || target === 'actor' || target === 'target') {
    // Convention: action.parameters[0] is the actor, [1] is the target.
    const actorId = action.parameters[0];
    const targetId = action.parameters[1];

    if (target === 'actor') return actorId ? [actorId] : [];
    if (target === 'target') return targetId ? [targetId] : [];
    return [actorId, targetId].filter((id): id is CharacterId => !!id);
  }

  return [target];
}
