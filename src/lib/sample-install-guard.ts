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
 */

export type SampleInstallReason = "empty-draft" | "identical" | "draft-present";

export interface SampleInstallDecision {
  allow: boolean;
  reason: SampleInstallReason;
}

export interface SampleInstallInput {
  /** The editor's current draft text. */
  currentDraft: string;
  /** The sample Fountain that would be written into the editor. */
  incomingSample: string;
}

/**
 * Decide whether the sample may be installed into the editor.
 * - Empty (or whitespace-only) draft → allowed.
 * - Draft byte-identical to the incoming sample → allowed (no-op install).
 * - Any other non-empty draft → refused; the draft must be preserved.
 */
export function decideSampleInstall(input: SampleInstallInput): SampleInstallDecision {
  if (input.currentDraft.trim().length === 0) {
    return { allow: true, reason: "empty-draft" };
  }
  if (input.currentDraft === input.incomingSample) {
    return { allow: true, reason: "identical" };
  }
  return { allow: false, reason: "draft-present" };
}
