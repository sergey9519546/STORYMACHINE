/**
 * G0-02 — coverage / fix-result staleness guard.
 *
 * Single source of truth for "did the draft change since this analysis or fix
 * was computed against it?". ScriptIDE maintains a monotonic draft generation
 * counter that bumps on every edit. A generation is captured when a request
 * starts (or when a displayed report is produced) and compared against the
 * live generation when the result is about to be applied:
 *
 *   - CoverageSummary uses {@link isDraftStale} before invoking onFreshReport /
 *     onLoadSampleIntoEditor on a late response — a stale response must not
 *     clear the "coverage outdated" flag or install anything over live edits.
 *   - ScriptDoctorPanel uses {@link decideWriteBack} before acceptFix and the
 *     "Load converted Fountain into editor" button — a fix built from a report
 *     that predates the writer's current edits must be refused, prompting a
 *     re-run instead of clobbering their draft.
 */

/**
 * True when the draft advanced between `capturedGeneration` (request start /
 * report production) and `currentGeneration` (now). Any difference — forward
 * or backward — counts as stale.
 */
export function isDraftStale(capturedGeneration: number, currentGeneration: number): boolean {
  return capturedGeneration !== currentGeneration;
}

export type WriteBackReason = "current" | "draft-changed";

export interface WriteBackDecision {
  allow: boolean;
  reason: WriteBackReason;
}

/**
 * Decide whether a report-derived result may be written back into the editor.
 * Refused when the live draft no longer matches the generation the report was
 * produced against.
 */
export function decideWriteBack(
  reportGeneration: number,
  currentGeneration: number,
): WriteBackDecision {
  if (isDraftStale(reportGeneration, currentGeneration)) {
    return { allow: false, reason: "draft-changed" };
  }
  return { allow: true, reason: "current" };
}
