import type { ScriptIDEDraftEnvelope } from './scriptide-draft-store.ts';

// Finding 2 (audit-client-data-paths.md): server/lib/validation.ts's
// ScriptideSaveBodySchema caps `scriptText` at `z.string().max(500_000)` —
// duplicated here (not imported) because the client bundle must never pull
// in server-only code (zod, etc. — see CLAUDE.md's client/server AI-call
// boundary, which is the same reason this file never imports from
// server/**). Kept honest by
// tests/core/scriptide-autosave.test.ts, which reads the server file's
// literal `.max(500_000)` out of validation.ts and asserts it equals this
// constant, so the two can never silently drift apart.
export const SCRIPTIDE_SCRIPT_TEXT_SERVER_CAP = 500_000;

// "Within 5% of the cap" per the audit's proposed fix — a soft warning
// threshold, not a hard block; the server remains the sole enforcer of the
// real limit.
export const SCRIPTIDE_SCRIPT_TEXT_WARN_THRESHOLD = Math.floor(SCRIPTIDE_SCRIPT_TEXT_SERVER_CAP * 0.95);

export function isScriptIDEScriptNearCap(scriptTextLength: number): boolean {
  return scriptTextLength >= SCRIPTIDE_SCRIPT_TEXT_WARN_THRESHOLD;
}

export interface ScriptIDESaveAcknowledgement {
  envelope: ScriptIDEDraftEnvelope;
  acknowledgedCurrentDraft: boolean;
  needsTrailingSave: boolean;
}

export type ScriptIDESaveFailureKind = 'network' | 'validation';

export interface ScriptIDESaveFailure {
  kind: ScriptIDESaveFailureKind;
  /** User-facing message: the server's own validation text for a 4xx
   *  rejection (when the response body carried one), otherwise the generic
   *  "may be at risk" wording that already covers a network/5xx blip. */
  message: string;
}

const GENERIC_SAVE_FAILURE_MESSAGE = 'Failed to save - your work may be at risk';

/**
 * Classifies a failed /api/scriptide/save response so the caller can (a)
 * show the server's real reason instead of a one-size-fits-all message, and
 * (b) stop retrying a payload that cannot succeed by being resent unchanged.
 *
 * A 4xx status is the server's `validate()` middleware (or any other
 * client-error rejection) telling us THIS PAYLOAD is invalid — e.g. an
 * oversized scriptText or title-page field — and retrying the exact same
 * bytes every 30 seconds can never fix that; only editing the draft can. A
 * 5xx status, or no status at all (status 0 — fetch rejected outright, e.g.
 * offline), is transient and worth retrying.
 */
export function classifyScriptIDESaveFailure(
  status: number,
  serverErrorMessage: string | null | undefined,
): ScriptIDESaveFailure {
  const isValidation = status >= 400 && status < 500;
  const message = isValidation && typeof serverErrorMessage === 'string' && serverErrorMessage.length > 0
    ? serverErrorMessage
    : GENERIC_SAVE_FAILURE_MESSAGE;
  return { kind: isValidation ? 'validation' : 'network', message };
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

/**
 * @param blockedGeneration Finding 2: the draftGenerationRef value that most
 *   recently failed 4xx validation, or null/undefined when no block is in
 *   effect. Both this and `currentGeneration` default to null so every
 *   pre-existing 3-arg call site (and test) is unaffected.
 * @param currentGeneration The draft's current generation counter. A save is
 *   refused only while it still EQUALS blockedGeneration — the moment the
 *   writer edits again, draftGenerationRef advances and the block lifts on
 *   its own, no separate "retry now" signal required.
 */
export function shouldStartScriptIDESave(
  draft: ScriptIDEDraftEnvelope,
  hasConflict: boolean,
  inFlight: boolean,
  blockedGeneration: number | null = null,
  currentGeneration: number | null = null,
): boolean {
  if (!draft.dirty || hasConflict || inFlight) return false;
  if (blockedGeneration !== null && blockedGeneration === currentGeneration) return false;
  return true;
}
