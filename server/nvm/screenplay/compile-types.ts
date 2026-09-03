// compile-types.ts — the compiled-screenplay data shapes, split out of
// ./compile.ts (retrospective #5, 2026-09-03).
//
// WHY THE SPLIT. compile.ts's compileScreenplay() needs the holographic
// projector (../project/index.ts), which needs NarrativeState, the quality
// engine, the valuation ledger and the sidecar builder. Nobody on the
// deterministic analysis path calls compileScreenplay — doctor.ts,
// fountain-analyzer.ts, revision/pipeline.ts, revision/passes/types.ts and
// calibration/reference.ts all imported compile.ts for these two INTERFACES
// only. But scripts/lib/import-graph.mjs deliberately follows type-only edges
// (a file pulled in for its types is still part of the compiled surface, and
// the no-console exemption check needs the conservative answer), so `import
// type` did not stop that whole subgraph from counting as scoring-path for
// scripts/check-scoring-receipt.mjs.
//
// Types that the core and the compiler genuinely share therefore have to live
// in a leaf module both can import. That is this file: no imports, no runtime
// code. compile.ts re-exports both names so existing importers of the compiler
// itself keep working unchanged.

/** A compiled Fountain draft plus the structural annotations that were derived
 *  alongside it. */
export interface CompiledScreenplay {
  /** Raw Fountain text */
  fountain: string;
  /** Per-scene structural annotations */
  annotations: SceneAnnotation[];
  /** Structure summary for the title page */
  structureSummary: string;
  /** Total word count (approximate) */
  wordCount: number;
  /** Compiled at timestamp */
  compiledAt: number;
}

/** One scene's structural annotation as carried on a CompiledScreenplay. */
export interface SceneAnnotation {
  sceneIdx: number;
  purpose: string;
  dramaticTurn: string;
  revelation: string | null;
  emotionalShift: string;
  clockRaised: boolean;
  openClues: number;
}
