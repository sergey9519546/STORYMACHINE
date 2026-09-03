/**
 * G0-01 — writer-safety guard: a sample script may NEVER overwrite draft text.
 *
 * Single source of truth for "is it safe to install the sample into the
 * editor?", shared by both real code paths in ScriptIDE:
 *   1. the sample auto-fire mount effect (StartScreen's "Try sample coverage"
 *      handoff via sessionStorage `sm_sample_pending`), and
 *   2. the onLoadSampleIntoEditor write-back callback (defense in depth).
 *
 * A refusal means the caller does NOT touch scriptText, so the draft survives
 * byte-identical. Installing is only ever allowed into an empty draft, or when
 * the draft already equals the incoming sample (idempotent re-install).
 *
 * Retrospective #2 (second data-loss path): an empty draft is not always a
 * SAFE-to-fill draft. If the sample was already installed once and the
 * writer then selected-all and deleted it, the draft is empty again — but
 * that emptiness is the writer's deliberate act, not "never had content."
 * `sampleAlreadyInstalled` lets a caller say "this specific empty draft used
 * to hold the sample" so the guard can refuse the silent auto-reinstall
 * (e.g. a stale auto-load flag refiring after a remount) while still
 * allowing an explicit, fresh "Try sample" click — callers reset that signal
 * themselves at the moment of an explicit user request, before calling in
 * here again.
 */

export type SampleInstallReason =
  | "empty-draft"
  | "identical"
  | "draft-present"
  | "cleared-by-writer";

export interface SampleInstallDecision {
  allow: boolean;
  reason: SampleInstallReason;
}

export interface SampleInstallInput {
  /** The editor's current draft text. */
  currentDraft: string;
  /** The sample Fountain that would be written into the editor. */
  incomingSample: string;
  /**
   * True when the sample has already been installed into this draft during
   * its current lifecycle (possibly since cleared). Defaults to false so
   * existing callers that don't track this keep their prior behavior.
   */
  sampleAlreadyInstalled?: boolean;
}

/**
 * Decide whether the sample may be installed into the editor.
 * - Draft byte-identical to the incoming sample → allowed (no-op install).
 * - Empty (or whitespace-only) draft that never held the sample → allowed.
 * - Empty draft that the writer cleared AFTER it held the sample → refused;
 *   the emptiness must not be read as "safe to fill."
 * - Any other non-empty, non-identical draft → refused; the draft must be
 *   preserved.
 */
export function decideSampleInstall(input: SampleInstallInput): SampleInstallDecision {
  if (input.currentDraft === input.incomingSample) {
    return { allow: true, reason: "identical" };
  }
  if (input.currentDraft.trim().length === 0) {
    if (input.sampleAlreadyInstalled) {
      return { allow: false, reason: "cleared-by-writer" };
    }
    return { allow: true, reason: "empty-draft" };
  }
  return { allow: false, reason: "draft-present" };
}
