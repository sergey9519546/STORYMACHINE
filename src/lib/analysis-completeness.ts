// Shared whole-draft truth predicate. This file intentionally has no browser
// or server dependencies so the API, exports, and React surfaces use exactly
// the same definition of when headline claims are safe to present.

export interface AnalysisCompleteness {
  /** Unknown at this boundary: persisted/reconstructed JSON is not trustworthy
   *  merely because TypeScript once described its ideal shape. */
  analysisComplete?: unknown;
  truncatedForAnalysis?: unknown;
  /** Context only. Never infer truncation from this field without the
   *  explicit `truncatedForAnalysis` marker. */
  totalSceneCount?: unknown;
  failedPasses?: unknown;
}

/**
 * Returns whether a report can honestly support a whole-draft score, verdict,
 * ranking, export, or verified revision delta.
 *
 * Historical reports predate `analysisComplete`, so an absent marker remains
 * compatible when there is no positive evidence of incompleteness. A present
 * marker must have its one valid value; malformed persisted data fails closed.
 * `totalSceneCount` is deliberately not inferred as truncation on its own:
 * it is context, while `truncatedForAnalysis` is the explicit contract flag.
 */
export function isWholeDraftAnalysisComplete(report: AnalysisCompleteness): boolean {
  if (report.analysisComplete !== undefined && report.analysisComplete !== true) return false;
  if (report.truncatedForAnalysis !== undefined && report.truncatedForAnalysis !== false) return false;
  if (report.failedPasses === undefined) return true;
  return Array.isArray(report.failedPasses) && report.failedPasses.length === 0;
}
