import type { ScriptIDEDraftEnvelope } from './scriptide-draft-store.ts';

export interface ScriptIDESaveAcknowledgement {
  envelope: ScriptIDEDraftEnvelope;
  acknowledgedCurrentDraft: boolean;
  needsTrailingSave: boolean;
}

export function acknowledgeScriptIDESave(
  current: ScriptIDEDraftEnvelope,
  savedGeneration: number,
  currentGeneration: number,
  updatedAt: number,
): ScriptIDESaveAcknowledgement {
  const acknowledgedCurrentDraft = savedGeneration === currentGeneration;
  return {
    envelope: {
      ...current,
      serverRevision: updatedAt,
      dirty: !acknowledgedCurrentDraft,
    },
    acknowledgedCurrentDraft,
    needsTrailingSave: !acknowledgedCurrentDraft,
  };
}

export function shouldStartScriptIDESave(
  draft: ScriptIDEDraftEnvelope,
  hasConflict: boolean,
  inFlight: boolean,
): boolean {
  return draft.dirty && !hasConflict && !inFlight;
}
