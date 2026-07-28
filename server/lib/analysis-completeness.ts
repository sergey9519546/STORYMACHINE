// Server re-export for existing server-side callers and tests. The definition
// lives in src/lib because the client must use the exact same fail-closed
// predicate when deciding whether to render a score or enable an action.
export {
  isWholeDraftAnalysisComplete,
  type AnalysisCompleteness,
} from '../../src/lib/analysis-completeness.ts';
